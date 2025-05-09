import { apiRequest } from "./queryClient";
import { Agent } from "./agent";

// Fonctions de requête API pour les agents
export const fetchAgents = async (): Promise<Agent[]> => {
  const res = await apiRequest("/api/agents");
  return await res.json();
};

export const fetchAgentById = async (id: number): Promise<Agent> => {
  const res = await apiRequest(`/api/agents/${id}`);
  return await res.json();
};

export const fetchAgentsByType = async (type: "HOT" | "PROSPECT" | "DIGI"): Promise<Agent[]> => {
  const res = await apiRequest(`/api/agents/type/${type}`);
  return await res.json();
};

export const fetchCRMAgents = async (): Promise<Agent[]> => {
  const res = await apiRequest("/api/agents/crm/true");
  return await res.json();
};

export const fetchDigitalAgents = async (): Promise<Agent[]> => {
  const res = await apiRequest("/api/agents/digital/true");
  return await res.json();
};

export const createAgent = async (agent: Omit<Agent, "id" | "createdAt" | "updatedAt">): Promise<Agent> => {
  const res = await apiRequest("POST", "/api/agents", agent);
  return await res.json();
};

export const updateAgent = async (id: number, agent: Partial<Agent>): Promise<Agent> => {
  const res = await apiRequest("PUT", `/api/agents/${id}`, agent);
  return await res.json();
};

export const deleteAgent = async (id: number): Promise<void> => {
  await apiRequest("DELETE", `/api/agents/${id}`);
};

// Fonctions de requête API pour les réalisations
export const fetchAchievements = async (): Promise<any[]> => {
  const res = await apiRequest("/api/achievements");
  return await res.json();
};

export const fetchAchievementsByAgentId = async (agentId: number): Promise<any[]> => {
  const res = await apiRequest(`/api/achievements/agent/${agentId}`);
  return await res.json();
};

export const createAchievement = async (achievement: {
  agentId: number;
  appointmentType: string;
  appointmentsCompleted: number;
  appointmentsTotal: number;
}): Promise<any> => {
  const res = await apiRequest("POST", "/api/achievements", achievement);
  return await res.json();
};