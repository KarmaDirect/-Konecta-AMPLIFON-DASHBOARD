import { useEffect, useState } from "react";
import { Agent, getEmoji, getAgentCompletionRatio } from "@/lib/agent";

interface TopAgentsProps {
  title: string;
  agents: Agent[];
  type: "currentCRM" | "currentDigital";
}

export function TopAgents({ title, agents, type }: TopAgentsProps) {
  const isCRM = type === "currentCRM";
  const borderColor = isCRM ? "border-blue-200" : "border-purple-200";
  const textColor = isCRM ? "text-blue-800" : "text-purple-800";
  const bgColor = isCRM ? "bg-blue-600" : "bg-purple-600";

  // Calcul du nombre total de RDVs pris par tous les agents
  const totalRdvsPris = agents.reduce((sum, agent) => {
    if (agent[type] === null) return sum;
    const rdvsPris = agent.objectif - (agent[type] || 0);
    return sum + (rdvsPris > 0 ? rdvsPris : 0);
  }, 0);
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">{title}</h2>
      <div className="flex flex-wrap gap-4 justify-center">
        {agents.length === 0 ? (
          <div className="text-center max-w-md px-6 py-4 bg-white shadow-lg rounded-xl border-2 border-gray-200">
            <p className="text-gray-700 font-medium text-lg mb-2">Objectif en attente</p>
            <p className="text-gray-600">Allez l'équipe ! C'est le moment de prendre les premiers rendez-vous de la journée ! 💪</p>
          </div>
        ) : totalRdvsPris < 4 ? (
          <div className="text-center max-w-md px-6 py-4 bg-white shadow-lg rounded-xl border-2 border-gray-200">
            <p className="text-gray-700 font-medium text-lg mb-2">Début de journée</p>
            <p className="text-gray-600">Seulement {totalRdvsPris} RDV{totalRdvsPris > 1 ? 's' : ''} pris. C'est le moment d'accélérer ! 🚀</p>
          </div>
        ) : (
          agents.map((agent, i) => {
            const completionRatio = getAgentCompletionRatio(agent, type);
            const completedRdv = agent.objectif - (agent[type] || 0);
            
            return (
              <div 
                key={`${agent.name}-${i}`} 
                className={`bg-white shadow-lg rounded-xl px-4 py-3 text-center w-[150px] transform transition-transform hover:scale-105 border-2 ${borderColor}`}
              >
                <p className={`font-bold ${textColor}`}>{agent.name}</p>
                <p className="text-sm">{completedRdv > 0 ? `${completedRdv} RDV réalisés` : '0 RDV réalisé'}</p>
                <p className="text-3xl my-2 animate-bounce">
                  {getEmoji(agent[type], agent.objectif)}
                  {agent[type] !== null && agent[type] < 0 && (
                    <span className="text-yellow-500 animate-ping ml-1">⭐</span>
                  )}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`${bgColor} h-2 rounded-full`} 
                    style={{ width: `${completionRatio * 100}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
