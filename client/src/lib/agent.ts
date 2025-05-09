import { Agent } from './types';

export type { Agent };

export const getEmoji = (current: number | null, objectif: number): string => {
  if (current === null) return "🕓";
  
  // Calcul du ratio de complétion
  const ratio = 1 - current / objectif;
  
  // Calcul du nombre de RDV pris
  const rdvPris = objectif - current;
  
  // Si très peu de rendez-vous pris (0 ou 1), on n'encourage pas avec des émojis positifs
  // sauf si l'objectif lui-même est très bas (2 ou moins)
  if (rdvPris <= 1 && objectif > 2) {
    if (ratio < 0.5) return "🕓"; // Pas d'encouragement spécial pour ceux qui sont loin de l'objectif
    return "🏁"; // Emoji neutre pour ceux qui sont proches mais avec très peu de RDVs absolus
  }
  
  // Si le ratio est élevé et qu'on a pris au moins quelques RDVs
  if (ratio >= 1) return "👑";
  if (ratio >= 0.75) return "🔥";
  if (ratio >= 0.5) return "💪";
  if (ratio >= 0.25) return "⚡";
  
  // Par défaut
  return "🕓";
};

export const getAgentCompletionRatio = (agent: Agent, type: "currentCRM" | "currentDigital"): number => {
  if (agent[type] === null || agent.objectif === 0) return 0;
  return Math.min(1, Math.max(0, 1 - agent[type]! / agent.objectif));
};

export const getTopAgents = (agents: Agent[], type: "currentCRM" | "currentDigital", limit = 5): Agent[] => {
  // Si tous les agents ont pris très peu de RDVs (0-1), ne pas afficher de top agents
  const totalRdvsPris = agents.reduce((sum, agent) => {
    if (agent[type] === null) return sum;
    const rdvsPris = agent.objectif - agent[type];
    return sum + (rdvsPris > 0 ? rdvsPris : 0);
  }, 0);
  
  // Vérifier combien d'agents ont pris au moins 2 RDVs
  const agentsWithSomeRdvs = agents.filter(agent => {
    if (agent[type] === null) return false;
    const rdvsPris = agent.objectif - agent[type];
    return rdvsPris >= 2;
  });
  
  // Si la performance globale est faible (moins de 4-5 RDVs au total) et peu d'agents ont des RDVs
  // significatifs, ne pas montrer de top agents pour éviter de féliciter injustement
  if (totalRdvsPris < 4 && agentsWithSomeRdvs.length < 2) {
    return [];
  }
  
  return [...agents]
    .filter(a => {
      // Filtrer pour ne garder que les agents qui ont un compteur
      if (a[type] === null) return false;
      
      // Si l'agent a des RDVs bonus (valeur négative), le garder
      if (a[type] < 0) return true;
      
      // Si l'agent a pris au moins 2 RDVs ou a atteint au moins 25% de son objectif
      const rdvsPris = a.objectif - a[type];
      const ratioAtteint = rdvsPris / a.objectif;
      return rdvsPris >= 2 || ratioAtteint >= 0.25;
    })
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
  
  // Ne féliciter que lorsqu'il y a une véritable performance
  // Cas 1: L'agent a dépassé son objectif (valeur négative)
  if (agent[type] !== null && agent[type] < 0) {
    return `🌟 BRAVO ${agent.name} ! Tu as dépassé ton objectif avec ${Math.abs(agent[type])} rendez-vous bonus ! Exceptionnel ! 🏆`;
  } 
  // Cas 2: L'agent a atteint son objectif
  else if (completed >= agent.objectif) {
    return `🎉 Félicitations ${agent.name} ! Objectif atteint à 100% ! Superbe performance ! 👑`;
  } 
  // Cas 3: L'agent a fait au moins 2 RDVs et est au moins à 50% de son objectif
  else if (completed >= 2 && completed >= agent.objectif * 0.5) {
    return `✨ Excellent travail ${agent.name} ! Tu es sur la bonne voie ! Continue comme ça ! 🔥`;
  }
  // Cas par défaut: message générique d'encouragement
  else {
    return `Allez ${agent.name}, on se motive ! L'équipe compte sur toi ! 💪`;
  }
};
