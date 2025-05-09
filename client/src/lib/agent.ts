import { Agent } from './types';

export type { Agent };

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

export const getTopAgents = (agents: Agent[], type: "currentCRM" | "currentDigital", limit = 5): Agent[] => {
  return [...agents]
    .filter(a => a[type] !== null)
    .sort((a, b) => {
      const aCurrent = a[type] || 0;
      const bCurrent = b[type] || 0;
      
      // Si l'un des agents a un bonus (valeur négative), il est prioritaire
      if (aCurrent < 0 && bCurrent >= 0) return -1;
      if (bCurrent < 0 && aCurrent >= 0) return 1;
      
      // Si les deux ont un bonus, celui qui a le plus grand bonus (valeur plus négative) est prioritaire
      if (aCurrent < 0 && bCurrent < 0) return aCurrent - bCurrent;
      
      // Sinon, on compare la distance à l'objectif (plus proche = meilleur)
      return aCurrent - bCurrent;
    })
    .slice(0, limit);
};

export const getBottomAgents = (agents: Agent[], type: "currentCRM" | "currentDigital", limit = 3): Agent[] => {
  // Filtrer pour ne garder que les agents qui n'ont pas atteint leurs objectifs
  const agentsWithRemainingRdv = [...agents]
    .filter(a => a[type] !== null && a[type]! > 0);
  
  return agentsWithRemainingRdv
    .sort((a, b) => {
      const aCurrent = a[type] || 0;
      const bCurrent = b[type] || 0;
      
      // Plus la valeur est élevée par rapport à l'objectif, plus l'agent est en difficulté
      const aRatio = aCurrent / a.objectif;
      const bRatio = bCurrent / b.objectif;
      
      return bRatio - aRatio;
    })
    .slice(0, limit);
};

export const getTotalRdvCompleted = (agents: Agent[], type: "currentCRM" | "currentDigital"): number => {
  return agents.reduce((sum, a) => {
    if (a[type] === null) return sum;
    
    // Si le compteur est positif ou zéro, le calcul est standard : objectif - actuel
    if (a[type]! >= 0) {
      const completed = a.objectif - a[type]!;
      return sum + completed;
    } 
    // Si le compteur est négatif, on a atteint l'objectif + des RDV bonus
    else {
      const completedRdv = a.objectif;        // L'objectif est complètement atteint
      const bonusRdv = Math.abs(a[type]!);    // Les RDV bonus (valeur absolue du négatif)
      return sum + completedRdv + bonusRdv;   // On ajoute l'objectif + les bonus
    }
  }, 0);
};

export const getAgentRdvPerHour = (agent: Agent): number => {
  if (agent.type === "HOT") return 3; // HOT = 3/h
  if (agent.type === "DIGI") return 5; // DIGI = 5/h
  return 2; // PROSPECT = 2/h (default)
};

export const getEncouragementMessage = (agent: Agent, type: "currentCRM" | "currentDigital"): string => {
  const ratio = getAgentCompletionRatio(agent, type);
  
  if (ratio < 0.25) {
    return `${agent.name}, c'est le moment de se motiver ! Tu peux y arriver ! 💪`;
  } else if (ratio < 0.5) {
    return `Allez ${agent.name}, encore un petit effort ! Tu es sur la bonne voie ! 🚀`;
  } else {
    return `${agent.name}, tu as déjà bien avancé ! Continue comme ça ! ⚡`;
  }
};

export const getCongratulationMessage = (agent: Agent, type: "currentCRM" | "currentDigital"): string => {
  const completed = agent.objectif - (agent[type] || 0);
  
  if (agent[type] !== null && agent[type] < 0) {
    return `🌟 BRAVO ${agent.name} ! Tu as dépassé ton objectif avec ${Math.abs(agent[type])} rendez-vous bonus ! Exceptionnel ! 🏆`;
  } else if (completed >= agent.objectif) {
    return `🎉 Félicitations ${agent.name} ! Objectif atteint à 100% ! Superbe performance ! 👑`;
  } else {
    return `✨ Excellent travail ${agent.name} ! Tu es parmi les meilleurs ! Continue comme ça ! 🔥`;
  }
};
