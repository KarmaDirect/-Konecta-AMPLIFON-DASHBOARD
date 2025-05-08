import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { Agent, getEmoji, getAgentCompletionRatio } from "@/lib/agent";

interface AgentCardProps {
  agent: Agent;
  index: number;
  type: "currentCRM" | "currentDigital";
  onRemove: (index: number) => void;
  onUpdateCount: (index: number, delta: number, type: "currentCRM" | "currentDigital") => void;
  onUpdateHours: (index: number, hours: number) => void;
  rdvTotal: number;
  totalAgentHours: number;
}

export function AgentCard({
  agent,
  index,
  type,
  onRemove,
  onUpdateCount,
  onUpdateHours,
  rdvTotal,
  totalAgentHours,
}: AgentCardProps) {
  const [hours, setHours] = useState(agent.hours || 1);
  
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = parseInt(e.target.value) || 1;
    setHours(newHours);
    onUpdateHours(index, newHours);
  };
  
  const currentValue = agent[type];
  const isCRM = type === "currentCRM";
  const emoji = getEmoji(currentValue, agent.objectif);
  const completionRatio = getAgentCompletionRatio(agent, type);
  const rdvPerHour = Math.round(rdvTotal / totalAgentHours);
  
  let statusText = "";
  if (currentValue !== null) {
    if (currentValue > 0) {
      statusText = `Il te reste ${currentValue} rendez-vous`;
    } else if (currentValue === 0) {
      statusText = "Objectif atteint !";
    } else {
      statusText = `Tu as fait ${-currentValue} rendez-vous bonus !`;
    }
  }

  return (
    <Card className={`rounded-2xl shadow-lg overflow-hidden border-t-4 ${isCRM ? 'border-blue-500' : 'border-purple-500'} hover:shadow-xl transition-shadow duration-300`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">{agent.name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <button
              onClick={() => onRemove(index)}
              className="text-red-500 hover:text-red-700 transition-colors duration-200"
              aria-label="Supprimer l'agent"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Heures de travail :</p>
            <div className="flex items-center">
              <input
                type="number"
                value={hours}
                min="1"
                max="12"
                onChange={handleHoursChange}
                className="w-16 border border-gray-300 px-2 py-1 rounded-md text-center"
              />
              <span className="ml-1 text-sm text-gray-500">h</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">RDV restants :</p>
            <p className="font-medium">
              {currentValue !== null ? (
                <>
                  {currentValue} {currentValue < 0 && <span className="text-yellow-500 animate-ping ml-1">⭐</span>}
                </>
              ) : "N/A"}
            </p>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">RDV/heure :</p>
            <p className="font-medium">{rdvPerHour}</p>
          </div>
          
          <div className="mt-2">
            <p className="text-green-700 font-medium">
              {statusText}
            </p>
            
            {currentValue !== null && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1.5 mb-3">
                <div 
                  className={`${isCRM ? 'bg-blue-600' : 'bg-purple-600'} h-2.5 rounded-full`} 
                  style={{ width: `${completionRatio * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
        
        {currentValue !== null && (
          <div className="flex justify-between gap-2 mt-4">
            <Button 
              variant="secondary"
              onClick={() => onUpdateCount(index, -1, type)}
              className={`flex-1 ${isCRM ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              RDV terminé (-)
            </Button>
            <Button 
              variant="outline"
              onClick={() => onUpdateCount(index, 1, type)}
              className={`flex-1 ${isCRM ? 'bg-blue-100 hover:bg-blue-200 text-blue-800' : 'bg-purple-100 hover:bg-purple-200 text-purple-800'}`}
            >
              Annulation (+)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
