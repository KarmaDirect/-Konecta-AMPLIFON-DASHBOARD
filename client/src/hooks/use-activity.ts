import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Agent, ActivityLog } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';

// Hook pour récupérer tous les logs d'activité
export const useActivityLogs = () => {
  return useQuery({
    queryKey: ['/api/activity-logs'],
    queryFn: () => apiRequest('/api/activity-logs')
  });
};

// Hook pour récupérer les logs d'activité d'un agent spécifique
export const useActivityLogsByAgentId = (agentId: number) => {
  return useQuery({
    queryKey: ['/api/activity-logs/agent', agentId],
    queryFn: () => apiRequest(`/api/activity-logs/agent/${agentId}`)
  });
};

// Hook pour créer un nouveau log d'activité
export const useCreateActivityLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { agentId: number; action: string; details?: string }) => 
      apiRequest('/api/activity-logs', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/activity-logs/agent', data.agentId] 
      });
    }
  });
};

// Hook pour gérer les demandes d'aide
export const useToggleHelpRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, needsHelp }: { id: number; needsHelp: boolean }) => 
      apiRequest(`/api/agents/${id}/help`, {
        method: 'PUT',
        body: JSON.stringify({ needsHelp }),
        headers: {
          'Content-Type': 'application/json'
        }
      }),
    onSuccess: (updatedAgent) => {
      queryClient.setQueryData<Agent[]>(['/api/agents'], (oldData) => {
        if (!oldData) return [updatedAgent];
        return oldData.map(agent => 
          agent.id === updatedAgent.id ? updatedAgent : agent
        );
      });
      
      queryClient.setQueryData(['/api/agents', updatedAgent.id], updatedAgent);
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/activity-logs/agent', updatedAgent.id] 
      });
    }
  });
};