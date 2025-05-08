import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Agent, getTotalRdvCompleted } from "@/lib/agent";
import { AgentCard } from "./AgentCard";

interface AppointmentSectionProps {
  title: string;
  agents: Agent[];
  type: "currentCRM" | "currentDigital";
  rdvTotal: number;
  setRdvTotal: (value: number) => void;
  onDispatchRdv: (type: "currentCRM" | "currentDigital") => void;
  onRemoveAgent: (index: number) => void;
  onUpdateCount: (index: number, delta: number, type: "currentCRM" | "currentDigital") => void;
  onUpdateHours: (index: number, hours: number) => void;
}

export function AppointmentSection({
  title,
  agents,
  type,
  rdvTotal,
  setRdvTotal,
  onDispatchRdv,
  onRemoveAgent,
  onUpdateCount,
  onUpdateHours,
}: AppointmentSectionProps) {
  const isCRM = type === "currentCRM";
  const filteredAgents = agents.filter(agent => agent[type] !== null);
  const rdvCompleted = getTotalRdvCompleted(agents, type);
  const ratioGlobal = rdvTotal > 0 ? rdvCompleted / rdvTotal : 0;
  
  const totalAgentHours = filteredAgents.reduce((sum, a) => sum + (a.hours || 1), 0);

  return (
    <div className="space-y-6">
      <h2 className={`text-xl font-semibold ${isCRM ? 'text-blue-800' : 'text-purple-800'}`}>{title}</h2>
      
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-lg shadow-md">
        <label htmlFor={`rdv-${type}`} className="font-medium whitespace-nowrap">
          RDV totaux à dispatcher :
        </label>
        <input
          id={`rdv-${type}`}
          type="number"
          value={rdvTotal}
          onChange={(e) => setRdvTotal(Number(e.target.value))}
          min="1"
          className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
        />
        <Button 
          onClick={() => onDispatchRdv(type)}
          className={`whitespace-nowrap ${isCRM ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          🧮 Répartir entre les agents
        </Button>
        <p className="text-sm text-gray-600 italic">
          Répartition équitable : chaque agent recevra environ le même nombre de RDV.
        </p>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
        <div
          className="bg-green-500 h-6 rounded-full text-white text-xs font-semibold flex items-center justify-center transition-all duration-500"
          style={{ width: `${ratioGlobal * 100}%` }}
        >
          {rdvCompleted} RDV réalisés / {rdvTotal} soit {Math.round(ratioGlobal * 100)}%
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <p className="text-center text-gray-500 italic">Aucun agent {isCRM ? 'CRM' : 'Digital'} à afficher</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent, i) => (
            <AgentCard
              key={`${agent.name}-${type}-${i}`}
              agent={agent}
              index={agents.findIndex(a => a === agent)}
              type={type}
              onRemove={onRemoveAgent}
              onUpdateCount={onUpdateCount}
              onUpdateHours={onUpdateHours}
              rdvTotal={rdvTotal}
              totalAgentHours={totalAgentHours}
            />
          ))}
        </div>
      )}
    </div>
  );
}
