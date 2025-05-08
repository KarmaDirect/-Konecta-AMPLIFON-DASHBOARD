import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAchievements,
  fetchAchievementsByAgentId,
  createAchievement
} from "@/lib/api";

// Hooks pour les requêtes d'achievements
export const useAchievements = () => {
  return useQuery({
    queryKey: ["/api/achievements"],
    queryFn: fetchAchievements
  });
};

export const useAchievementsByAgentId = (agentId: number) => {
  return useQuery({
    queryKey: ["/api/achievements/agent", agentId],
    queryFn: () => fetchAchievementsByAgentId(agentId),
    enabled: !!agentId
  });
};

// Hooks pour les mutations d'achievements
export const useCreateAchievement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (achievement: {
      agentId: number;
      appointmentType: string;
      appointmentsCompleted: number;
      appointmentsTotal: number;
    }) => createAchievement(achievement),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements/agent", variables.agentId] });
    }
  });
};