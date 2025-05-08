import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { CampaignScript, InsertCampaignScript } from '@shared/schema';

// Hook pour récupérer tous les scripts
export const useCampaignScripts = () => {
  return useQuery<CampaignScript[]>({
    queryKey: ['/api/campaign-scripts'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Implémentation personnalisée de la fonction de requête pour gérer les erreurs 401
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) {
            // On retourne un tableau vide si l'utilisateur n'est pas authentifié
            return [] as CampaignScript[];
          }
          const text = await res.text();
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error("Erreur lors de la récupération des scripts:", error);
        return [] as CampaignScript[];
      }
    }
  });
};

// Hook pour récupérer un script spécifique par ID
export const useCampaignScriptById = (id: number) => {
  return useQuery<CampaignScript>({
    queryKey: ['/api/campaign-scripts', id],
    enabled: !!id,
    // Implémentation personnalisée pour gérer les erreurs 401
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(`${queryKey[0]}/${queryKey[1]}`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) {
            return null as any as CampaignScript;
          }
          const text = await res.text();
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error(`Erreur lors de la récupération du script ${id}:`, error);
        return null as any as CampaignScript;
      }
    }
  });
};

// Hook pour récupérer des scripts par catégorie
export const useCampaignScriptsByCategory = (category: string) => {
  return useQuery<CampaignScript[]>({
    queryKey: ['/api/campaign-scripts/category', category],
    enabled: !!category,
    // Implémentation personnalisée pour gérer les erreurs 401
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(`${queryKey[0]}/${queryKey[1]}`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) {
            return [] as CampaignScript[];
          }
          const text = await res.text();
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error(`Erreur lors de la récupération des scripts par catégorie ${category}:`, error);
        return [] as CampaignScript[];
      }
    }
  });
};

// Hook pour récupérer des scripts par nom de campagne
export const useCampaignScriptsByCampaignName = (campaignName: string) => {
  return useQuery<CampaignScript[]>({
    queryKey: ['/api/campaign-scripts/campaign', campaignName],
    enabled: !!campaignName,
    // Implémentation personnalisée pour gérer les erreurs 401
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(`${queryKey[0]}/${queryKey[1]}`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) {
            return [] as CampaignScript[];
          }
          const text = await res.text();
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error(`Erreur lors de la récupération des scripts par campagne ${campaignName}:`, error);
        return [] as CampaignScript[];
      }
    }
  });
};

// Hook pour créer un nouveau script
export const useCreateCampaignScript = () => {
  return useMutation({
    mutationFn: async (script: InsertCampaignScript) => {
      const res = await apiRequest('POST', '/api/campaign-scripts', script);
      return await res.json() as CampaignScript;
    },
    onSuccess: () => {
      // Invalider les requêtes pour forcer le rechargement des données
      queryClient.invalidateQueries({ queryKey: ['/api/campaign-scripts'] });
    },
  });
};

// Hook pour mettre à jour un script existant
export const useUpdateCampaignScript = (id: number) => {
  return useMutation({
    mutationFn: async (script: Partial<InsertCampaignScript>) => {
      const res = await apiRequest('PUT', `/api/campaign-scripts/${id}`, script);
      return await res.json() as CampaignScript;
    },
    onSuccess: () => {
      // Invalider les requêtes pour forcer le rechargement des données
      queryClient.invalidateQueries({ queryKey: ['/api/campaign-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaign-scripts', id] });
    },
  });
};

// Hook pour supprimer un script
export const useDeleteCampaignScript = () => {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/campaign-scripts/${id}`);
      return id;
    },
    onSuccess: (id) => {
      // Invalider les requêtes pour forcer le rechargement des données
      queryClient.invalidateQueries({ queryKey: ['/api/campaign-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaign-scripts', id] });
    },
  });
};