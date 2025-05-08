import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Agent } from "@/lib/agent";
import {
  fetchAgents,
  fetchAgentById,
  fetchAgentsByType,
  fetchCRMAgents,
  fetchDigitalAgents,
  createAgent,
  updateAgent,
  deleteAgent
} from "@/lib/api";

// Hooks pour les requêtes d'agents
export const useAgents = () => {
  return useQuery({
    queryKey: ["/api/agents"],
    queryFn: fetchAgents
  });
};

export const useAgentById = (id: number) => {
  return useQuery({
    queryKey: ["/api/agents", id],
    queryFn: () => fetchAgentById(id),
    enabled: !!id
  });
};

export const useAgentsByType = (type: "HOT" | "PROSPECT" | "DIGI") => {
  return useQuery({
    queryKey: ["/api/agents/type", type],
    queryFn: () => fetchAgentsByType(type)
  });
};

export const useCRMAgents = () => {
  return useQuery({
    queryKey: ["/api/agents/crm/true"],
    queryFn: fetchCRMAgents
  });
};

export const useDigitalAgents = () => {
  return useQuery({
    queryKey: ["/api/agents/digital/true"],
    queryFn: fetchDigitalAgents
  });
};

// Hooks pour les mutations d'agents
export const useCreateAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (agent: Omit<Agent, "id" | "createdAt" | "updatedAt">) => createAgent(agent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    }
  });
};

export const useUpdateAgent = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (agent: Partial<Agent>) => updateAgent(id, agent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", id] });
    }
  });
};

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    }
  });
};