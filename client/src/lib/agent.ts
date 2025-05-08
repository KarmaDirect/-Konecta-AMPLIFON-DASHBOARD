export interface Agent {
  name: string;
  objectif: number;
  currentCRM: number | null;
  currentDigital: number | null;
  hours?: number;
}

export const getEmoji = (current: number | null, objectif: number): string => {
  if (current === null) return "🕓";
  
  const ratio = 1 - current / objectif;
  if (ratio >= 1) return "👑";
  if (ratio >= 0.75) return "🔥";
  if (ratio >= 0.5) return "💪";
  if (ratio >= 0.25) return "⚡";
  return "🕓";
};

export const getAgentCompletionRatio = (agent: Agent, type: "currentCRM" | "currentDigital"): number => {
  if (agent[type] === null || agent.objectif === 0) return 0;
  return Math.min(1, Math.max(0, 1 - agent[type]! / agent.objectif));
};

export const getTopAgents = (agents: Agent[], type: "currentCRM" | "currentDigital", limit = 3): Agent[] => {
  return [...agents]
    .filter(a => a[type] !== null)
    .sort((a, b) => {
      const aRatio = getAgentCompletionRatio(a, type);
      const bRatio = getAgentCompletionRatio(b, type);
      return bRatio - aRatio;
    })
    .slice(0, limit);
};

export const getTotalRdvCompleted = (agents: Agent[], type: "currentCRM" | "currentDigital"): number => {
  return agents.reduce((sum, a) => {
    if (a[type] === null) return sum;
    const completed = a.objectif - a[type];
    return sum + (completed > 0 ? completed : 0);
  }, 0);
};
