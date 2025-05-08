import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEmoji, getAgentRdvPerHour } from "@/lib/agent";
import { Agent } from "@/lib/types";
import { BadgeCheck, Trash2, Plus, Minus, AlertTriangle, HelpCircle } from "lucide-react";
// Pour les tests en attendant que le hook soit fonctionnel
// import { useToggleHelpRequest } from "@/hooks/use-activity"; 
// import { useAuth } from "@/hooks/use-auth";

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
  const [displayHours, setDisplayHours] = useState(agent.hours || 1);
  
  // Pour gérer les demandes d'aide - temporairement mockés
  const toggleHelpRequest = {
    mutate: (data: any) => console.log('Demande aide:', data) 
  };
  const isAdmin = true; // Temporairement, on considère que l'utilisateur est admin
  
  // Calculer le taux de RDV par heure
  const rdvPerHour = getAgentRdvPerHour(agent);
  
  // Récupérer le bon compteur en fonction du type
  const currentCount = type === "currentCRM" ? agent.currentCRM : agent.currentDigital;
  
  // Emoji en fonction de l'avancement
  const emoji = getEmoji(currentCount, agent.objectif);
  
  // Pourcentage d'avancement
  const percentage = currentCount 
    ? Math.min(Math.round((currentCount / agent.objectif) * 100), 100) 
    : 0;
  
  // Mettre à jour les heures si elles changent
  useEffect(() => {
    if (agent.hours && agent.hours !== displayHours) {
      setDisplayHours(agent.hours);
    }
  }, [agent.hours]);

  // Handler pour mettre à jour les heures
  const handleHoursChange = (delta: number) => {
    const newHours = Math.max(1, displayHours + delta);
    setDisplayHours(newHours);
    onUpdateHours(index, newHours);
  };
  
  // Handler pour demander de l'aide
  const handleToggleHelp = () => {
    if (agent.id) {
      toggleHelpRequest.mutate({ 
        id: agent.id, 
        needsHelp: !(agent.needsHelp || false) 
      });
    }
  };

  return (
    <Card className={`relative overflow-hidden ${agent.needsHelp ? 'border-orange-500 border-2' : ''}`}>
      {agent.needsHelp && (
        <div className="absolute right-2 top-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
        </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">{agent.name}</CardTitle>
          <div className="text-2xl">{emoji}</div>
        </div>
        <CardDescription>
          {type === "currentCRM" ? "RDV CRM" : "RDV Digital"}: {currentCount || 0} / {agent.objectif}
          <div className="text-xs mt-1 text-muted-foreground">
            Type: {agent.type} - Objectif: {rdvPerHour} RDV/h
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onUpdateCount(index, -1, type)}
              disabled={!currentCount}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onUpdateCount(index, 1, type)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center">
            <span className="text-sm mr-2">Heures:</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleHoursChange(-1)}
              disabled={displayHours <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="mx-2">{displayHours}</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleHoursChange(1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleToggleHelp}
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          {agent.needsHelp ? "Annuler aide" : "Demander aide"}
        </Button>
        
        {isAdmin && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}