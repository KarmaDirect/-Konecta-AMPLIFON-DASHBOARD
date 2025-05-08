import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/lib/websocket';
import { Agent } from '@/lib/agent';

/**
 * Hook pour gérer les mises à jour en temps réel des agents
 * Ce hook s'enregistre auprès du WebSocket pour recevoir les mises à jour
 * et met à jour le cache React Query en conséquence
 */
export function useRealtimeAgents() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Se connecter au WebSocket
    wsClient.connect();
    
    // Initialisation - réception des agents au moment de la connexion
    wsClient.on<{ agents: Agent[] }>('init', (data) => {
      // Mettre à jour le cache pour la requête principale
      queryClient.setQueryData(['/api/agents'], data.agents);
    });
    
    // Écouter les événements de création d'agent
    wsClient.on<{ agent: Agent }>('agent_created', (data) => {
      // Mettre à jour le cache en ajoutant le nouvel agent
      queryClient.setQueryData<Agent[] | undefined>(['/api/agents'], (oldData) => {
        if (!oldData) return [data.agent];
        return [...oldData, data.agent];
      });
      
      // Mettre à jour les caches secondaires (par type, etc.)
      if (data.agent.type) {
        queryClient.invalidateQueries({ queryKey: ['/api/agents/type', data.agent.type] });
      }
      if (data.agent.currentCRM !== null) {
        queryClient.invalidateQueries({ queryKey: ['/api/agents/crm/true'] });
      }
      if (data.agent.currentDigital !== null) {
        queryClient.invalidateQueries({ queryKey: ['/api/agents/digital/true'] });
      }
    });
    
    // Écouter les événements de mise à jour d'agent
    wsClient.on<{ agent: Agent }>('agent_updated', (data) => {
      // Mettre à jour le cache pour la requête principale
      queryClient.setQueryData<Agent[] | undefined>(['/api/agents'], (oldData) => {
        if (!oldData) return [data.agent];
        return oldData.map(agent => agent.id === data.agent.id ? data.agent : agent);
      });
      
      // Mettre à jour le cache pour la requête individuelle
      queryClient.setQueryData(['/api/agents', data.agent.id], data.agent);
      
      // Mettre à jour les caches secondaires (par type, etc.)
      if (data.agent.type) {
        queryClient.invalidateQueries({ queryKey: ['/api/agents/type', data.agent.type] });
      }
      if (data.agent.currentCRM !== null) {
        queryClient.invalidateQueries({ queryKey: ['/api/agents/crm/true'] });
      }
      if (data.agent.currentDigital !== null) {
        queryClient.invalidateQueries({ queryKey: ['/api/agents/digital/true'] });
      }
    });
    
    // Écouter les événements de suppression d'agent
    wsClient.on<{ agentId: number }>('agent_deleted', (data) => {
      // Mettre à jour le cache en supprimant l'agent
      queryClient.setQueryData<Agent[] | undefined>(['/api/agents'], (oldData) => {
        if (!oldData) return [];
        return oldData.filter(agent => agent.id !== data.agentId);
      });
      
      // Supprimer l'agent du cache individuel
      queryClient.removeQueries({ queryKey: ['/api/agents', data.agentId] });
      
      // Mettre à jour les caches secondaires
      queryClient.invalidateQueries({ queryKey: ['/api/agents/type'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/crm'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/digital'] });
    });
    
    // Cleanup quand le composant est démonté
    return () => {
      wsClient.off('init');
      wsClient.off('agent_created');
      wsClient.off('agent_updated');
      wsClient.off('agent_deleted');
    };
  }, [queryClient]);
  
  return wsClient;
}