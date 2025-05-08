import { apiRequest } from "./queryClient";
import { Agent } from "./agent";

// Fonctions de requête API pour les agents
export const fetchAgents = async (): Promise<Agent[]> => {
  return await apiRequest("/api/agents");
};

export const fetchAgentById = async (id: number): Promise<Agent> => {
  return await apiRequest(`/api/agents/${id}`);
};

export const fetchAgentsByType = async (type: "HOT" | "PROSPECT" | "DIGI"): Promise<Agent[]> => {
  return await apiRequest(`/api/agents/type/${type}`);
};

export const fetchCRMAgents = async (): Promise<Agent[]> => {
  return await apiRequest("/api/agents/crm/true");
};

export const fetchDigitalAgents = async (): Promise<Agent[]> => {
  return await apiRequest("/api/agents/digital/true");
};

export const createAgent = async (agent: Omit<Agent, "id" | "createdAt" | "updatedAt">): Promise<Agent> => {
  return await apiRequest("/api/agents", {
    method: "POST",
    body: JSON.stringify(agent),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const updateAgent = async (id: number, agent: Partial<Agent>): Promise<Agent> => {
  return await apiRequest(`/api/agents/${id}`, {
    method: "PUT",
    body: JSON.stringify(agent),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const deleteAgent = async (id: number): Promise<void> => {
  await apiRequest(`/api/agents/${id}`, {
    method: "DELETE",
  });
};

// Fonctions de requête API pour les réalisations
export const fetchAchievements = async (): Promise<any[]> => {
  return await apiRequest("/api/achievements");
};

export const fetchAchievementsByAgentId = async (agentId: number): Promise<any[]> => {
  return await apiRequest(`/api/achievements/agent/${agentId}`);
};

export const createAchievement = async (achievement: {
  agentId: number;
  appointmentType: string;
  appointmentsCompleted: number;
  appointmentsTotal: number;
}): Promise<any> => {
  return await apiRequest("/api/achievements", {
    method: "POST",
    body: JSON.stringify(achievement),
    headers: {
      "Content-Type": "application/json",
    },
  });
};