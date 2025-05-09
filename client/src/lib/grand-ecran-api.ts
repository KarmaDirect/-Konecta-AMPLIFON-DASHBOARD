import { Agent } from "./agent";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
  }
  
  return await response.json() as T;
}

export const fetchAllAgents = (): Promise<Agent[]> => {
  return fetchJson<Agent[]>('/api/agents');
};

export const fetchCRMAgents = (): Promise<Agent[]> => {
  return fetchJson<Agent[]>('/api/agents/crm/true');
};

export const fetchDigitalAgents = (): Promise<Agent[]> => {
  return fetchJson<Agent[]>('/api/agents/digital/true');
};