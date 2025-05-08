import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '../lib/queryClient';
import type { AlertThreshold, InsertAlertThreshold } from '@shared/schema';

// Hook pour récupérer tous les seuils d'alerte
export const useAlertThresholds = () => {
  return useQuery<AlertThreshold[]>({
    queryKey: ['/api/alert-thresholds'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook pour récupérer les seuils d'alerte d'un utilisateur spécifique
export const useAlertThresholdsByUserId = (userId: number) => {
  return useQuery<AlertThreshold[]>({
    queryKey: ['/api/alert-thresholds/user', userId],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
};

// Hook pour récupérer un seuil d'alerte par son ID
export const useAlertThresholdById = (id: number) => {
  return useQuery<AlertThreshold>({
    queryKey: ['/api/alert-thresholds', id],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!id,
  });
};

// Hook pour créer un seuil d'alerte
export const useCreateAlertThreshold = () => {
  return useMutation({
    mutationFn: async (threshold: InsertAlertThreshold) => {
      const res = await apiRequest('POST', '/api/alert-thresholds', threshold);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-thresholds'] });
    },
  });
};

// Hook pour mettre à jour un seuil d'alerte
export const useUpdateAlertThreshold = (id: number) => {
  return useMutation({
    mutationFn: async (threshold: Partial<InsertAlertThreshold>) => {
      const res = await apiRequest('PUT', `/api/alert-thresholds/${id}`, threshold);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-thresholds'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alert-thresholds', id] });
    },
  });
};

// Hook pour supprimer un seuil d'alerte
export const useDeleteAlertThreshold = () => {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/alert-thresholds/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-thresholds'] });
    },
  });
};

// Hook pour vérifier les alertes d'un agent
export const useCheckAlerts = (agentId: number, type: 'CRM' | 'Digital') => {
  return useQuery<AlertThreshold[]>({
    queryKey: ['/api/agents/check-alerts', agentId, type],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/agents/${agentId}/check-alerts/${type}`);
      return await res.json();
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: !!agentId && !!type,
  });
};