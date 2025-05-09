import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/lib/websocket';
import { Agent } from '@/lib/agent';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook pour gérer les mises à jour en temps réel des agents
 * Ce hook s'enregistre auprès du WebSocket pour recevoir les mises à jour
 * et met à jour le cache React Query en conséquence
 */
export function useRealtimeAgents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
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
      console.log('Agent créé reçu via WebSocket:', data.agent);
      
      // Mettre à jour le cache en ajoutant le nouvel agent
      queryClient.setQueryData<Agent[] | undefined>(['/api/agents'], (oldData) => {
        if (!oldData) return [data.agent];
        
        // Vérifier si l'agent existe déjà (éviter les doublons)
        const exists = oldData.some(a => a.id === data.agent.id);
        if (exists) {
          return oldData.map(a => a.id === data.agent.id ? data.agent : a);
        } else {
          return [...oldData, data.agent];
        }
      });
      
      // Forcer un rafraîchissement des données pour les autres vues
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      
      // Mettre à jour les caches spécifiques
      if (data.agent.currentCRM !== null) {
        // Mettre à jour directement le cache des agents CRM
        queryClient.setQueryData<Agent[] | undefined>(['/api/agents/crm/true'], (oldData) => {
          if (!oldData) return [data.agent];
          const exists = oldData.some(a => a.id === data.agent.id);
          return exists ? oldData.map(a => a.id === data.agent.id ? data.agent : a) : [...oldData, data.agent];
        });
      }
      
      if (data.agent.currentDigital !== null) {
        // Mettre à jour directement le cache des agents Digital
        queryClient.setQueryData<Agent[] | undefined>(['/api/agents/digital/true'], (oldData) => {
          if (!oldData) return [data.agent];
          const exists = oldData.some(a => a.id === data.agent.id);
          return exists ? oldData.map(a => a.id === data.agent.id ? data.agent : a) : [...oldData, data.agent];
        });
      }
      
      // Notification pour informer l'utilisateur
      toast({
        title: "Nouvel agent ajouté",
        description: `L'agent ${data.agent.name} a été ajouté à l'équipe`,
        variant: "default"
      });
    });
    
    // Écouter les événements de mise à jour d'agent
    wsClient.on<{ agent: Agent }>('agent_updated', (data) => {
      console.log('Mise à jour d\'agent reçue via WebSocket:', data.agent);
      
      // Mettre à jour le cache pour la requête principale
      queryClient.setQueryData<Agent[] | undefined>(['/api/agents'], (oldData) => {
        if (!oldData) return [data.agent];
        return oldData.map(agent => agent.id === data.agent.id ? data.agent : agent);
      });
      
      // Mettre à jour le cache pour la requête individuelle
      queryClient.setQueryData(['/api/agents', data.agent.id], data.agent);
      
      // Mise à jour des caches spécifiques
      if (data.agent.currentCRM !== null) {
        queryClient.setQueryData<Agent[] | undefined>(['/api/agents/crm/true'], (oldData) => {
          if (!oldData) return [data.agent];
          
          // Si l'agent existe dans la liste, le mettre à jour
          if (oldData.some(a => a.id === data.agent.id)) {
            return oldData.map(a => a.id === data.agent.id ? data.agent : a);
          }
          // Sinon, l'ajouter (si CRM est activé)
          return [...oldData, data.agent];
        });
      } else {
        // Si CRM est désactivé, supprimer l'agent de la liste CRM
        queryClient.setQueryData<Agent[] | undefined>(['/api/agents/crm/true'], (oldData) => {
          if (!oldData) return [];
          return oldData.filter(a => a.id !== data.agent.id);
        });
      }
      
      if (data.agent.currentDigital !== null) {
        queryClient.setQueryData<Agent[] | undefined>(['/api/agents/digital/true'], (oldData) => {
          if (!oldData) return [data.agent];
          
          // Si l'agent existe dans la liste, le mettre à jour
          if (oldData.some(a => a.id === data.agent.id)) {
            return oldData.map(a => a.id === data.agent.id ? data.agent : a);
          }
          // Sinon, l'ajouter (si Digital est activé)
          return [...oldData, data.agent];
        });
      } else {
        // Si Digital est désactivé, supprimer l'agent de la liste Digital
        queryClient.setQueryData<Agent[] | undefined>(['/api/agents/digital/true'], (oldData) => {
          if (!oldData) return [];
          return oldData.filter(a => a.id !== data.agent.id);
        });
      }
    });
    
    // Écouter les événements de suppression d'agent
    wsClient.on<{ agentId: number }>('agent_deleted', (data) => {
      console.log('Suppression d\'agent reçue via WebSocket:', data.agentId);
      
      // Mettre à jour le cache en supprimant l'agent
      queryClient.setQueryData<Agent[] | undefined>(['/api/agents'], (oldData) => {
        if (!oldData) return [];
        return oldData.filter(agent => agent.id !== data.agentId);
      });
      
      // Supprimer l'agent des caches spécifiques
      queryClient.setQueryData<Agent[] | undefined>(['/api/agents/crm/true'], (oldData) => {
        if (!oldData) return [];
        return oldData.filter(agent => agent.id !== data.agentId);
      });
      
      queryClient.setQueryData<Agent[] | undefined>(['/api/agents/digital/true'], (oldData) => {
        if (!oldData) return [];
        return oldData.filter(agent => agent.id !== data.agentId);
      });
      
      // Supprimer l'agent du cache individuel
      queryClient.removeQueries({ queryKey: ['/api/agents', data.agentId] });
      
      // Notification pour informer l'utilisateur
      toast({
        title: "Agent supprimé",
        description: `Un agent a été retiré de l'équipe`,
        variant: "default"
      });
    });
    
    // Cleanup quand le composant est démonté
    return () => {
      wsClient.off('init');
      wsClient.off('agent_created');
      wsClient.off('agent_updated');
      wsClient.off('agent_deleted');
    };
  }, [queryClient, toast]);
  
  return wsClient;
}