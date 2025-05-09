import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { TopAgents } from "@/components/TopAgents";
import { AppointmentSection } from "@/components/AppointmentSection";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AlertNotifications } from "@/components/AlertNotifications";
import { AlertSettings } from "@/components/AlertSettings";
import { Agent, getTopAgents } from "@/lib/agent";
import { useAuth } from "@/hooks/use-auth";
import { useTeamPresence } from "@/hooks/use-team-presence";
import { wsClient } from "@/lib/websocket";
import { TeamPresenceIndicator } from "@/components/TeamPresenceIndicator";
import { GrandEcranGenerator } from "@/components/GrandEcranGenerator";

export default function Dashboard() {
  const { currentUser, logout, isAdmin } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [notified, setNotified] = useState<string[]>([]);
  const [newAgent, setNewAgent] = useState("");
  const [isCRM, setIsCRM] = useState(true);
  const [isDigital, setIsDigital] = useState(true);
  const [newObjective, setNewObjective] = useState(20);
  const [rdvCRMTotal, setRdvCRMTotal] = useState(100);
  const [rdvDigitalTotal, setRdvDigitalTotal] = useState(50);
  const [agentType, setAgentType] = useState<"HOT" | "PROSPECT" | "DIGI">("HOT");
  
  const handleLogout = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      logout();
    }
  };

  // Utiliser l'API pour récupérer les agents depuis le serveur
  useEffect(() => {
    // Récupérer les agents depuis l'API
    fetch('/api/agents')
      .then(response => response.json())
      .then(data => {
        setAgents(data);
      })
      .catch(error => {
        console.error("Erreur lors de la récupération des agents:", error);
      });
    
    // Écouter les mises à jour via WebSocket
    wsClient.on<{ agent: Agent }>('agent_updated', (data) => {
      setAgents(prevAgents => prevAgents.map(agent => 
        agent.id === data.agent.id ? data.agent : agent
      ));
    });
    
    wsClient.on<{ agent: Agent }>('agent_created', (data) => {
      setAgents(prevAgents => [...prevAgents, data.agent]);
    });
    
    wsClient.on<{ agentId: number }>('agent_deleted', (data) => {
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== data.agentId));
    });
    
    // Cleanup
    return () => {
      wsClient.off('agent_updated');
      wsClient.off('agent_created');
      wsClient.off('agent_deleted');
    };
  }, []);

  const addAgent = () => {
    if (newAgent.trim()) {
      if (!isCRM && !isDigital) {
        alert("L'agent doit être assigné à au moins un type de RDV (CRM ou Digital)");
        return;
      }

      const newEntry: Agent = {
        id: -1, // ID temporaire, sera remplacé par le vrai ID attribué par le serveur
        name: newAgent.trim(),
        objectif: Number(newObjective),
        currentCRM: isCRM ? Number(newObjective) : null,
        currentDigital: isDigital ? Number(newObjective) : null,
        hours: 1,
        type: agentType,
        needsHelp: false
      };
      
      // Envoyer la requête au serveur pour créer l'agent
      fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEntry),
      })
        .then(response => response.json())
        .then(createdAgent => {
          // L'agent est automatiquement ajouté via WebSocket, mais on peut mettre à jour localement aussi
          setAgents(prevAgents => [...prevAgents, createdAgent]);
          
          // Envoyer une notification d'activité pour l'ajout d'agent
          wsClient.sendActivity(
            "a ajouté un nouvel agent",
            createdAgent.name,
            { 
              agent: createdAgent.name, 
              type: agentType,
              hasCRM: isCRM,
              hasDigital: isDigital,
              objectif: Number(newObjective)
            }
          );
        })
        .catch(error => {
          console.error("Erreur lors de la création de l'agent:", error);
          alert("Erreur lors de la création de l'agent. Veuillez réessayer.");
        });
      
      // Réinitialiser les champs du formulaire
      setNewAgent("");
      setNewObjective(20);
      setIsCRM(true);
      setIsDigital(true);
    }
  };

  const removeAgent = (index: number) => {
    const agent = agents[index];
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${agent.name} ?`)) {
      // Envoyer la requête au serveur pour supprimer l'agent
      fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
      })
        .then(response => {
          if (response.ok) {
            // L'agent est automatiquement supprimé via WebSocket, mais on peut mettre à jour localement aussi
            const updated = [...agents];
            updated.splice(index, 1);
            setAgents(updated);
            
            // Envoyer une notification d'activité pour la suppression d'agent
            wsClient.sendActivity(
              "a supprimé un agent",
              agent.name,
              { 
                agent: agent.name,
                type: agent.type
              }
            );
          } else {
            throw new Error('Échec de la suppression');
          }
        })
        .catch(error => {
          console.error("Erreur lors de la suppression de l'agent:", error);
          alert("Erreur lors de la suppression de l'agent. Veuillez réessayer.");
        });
    }
  };

  const resetAgents = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser tous les compteurs ?")) {
      // Appeler l'API pour réinitialiser tous les agents
      fetch('/api/agents/reset-all', {
        method: 'POST',
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Échec de la réinitialisation');
          }
          return response.json();
        })
        .then(resetAgents => {
          // Les agents sont automatiquement mis à jour via WebSocket, mais on peut mettre à jour localement aussi
          setAgents(resetAgents);
          setNotified([]);
          
          // Envoyer une notification d'activité pour la réinitialisation
          wsClient.sendActivity(
            "a réinitialisé tous les compteurs d'objectifs",
            "",
            { 
              action: "reset_all",
              agentCount: agents.length
            }
          );
        })
        .catch(error => {
          console.error("Erreur lors de la réinitialisation des compteurs:", error);
          alert("Erreur lors de la réinitialisation des compteurs. Veuillez réessayer.");
        });
    }
  };

  const dispatchRdv = (type: "currentCRM" | "currentDigital") => {
    const rdvTotal = type === "currentCRM" ? rdvCRMTotal : rdvDigitalTotal;
    const filteredAgents = agents.filter((a) => a[type] !== null);
    const agentCount = filteredAgents.length;

    if (agentCount === 0) {
      alert(`Aucun agent ${type === "currentCRM" ? "CRM" : "Digital"} disponible pour dispatcher les RDV.`);
      return;
    }

    // Appeler l'API pour répartir les RDV
    fetch('/api/agents/dispatch-rdv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        rdvTotal,
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Échec de la répartition des RDV');
        }
        return response.json();
      })
      .then(updatedAgents => {
        // Les agents sont automatiquement mis à jour via WebSocket, mais on peut mettre à jour localement aussi
        setAgents(updatedAgents);
        
        // Calcul pour l'affichage et la notification
        const rdvPerAgent = Math.floor(rdvTotal / agentCount);
        
        // Envoyer une notification d'activité pour la répartition des RDV
        const typeLabel = type === "currentCRM" ? "CRM" : "Digital";
        wsClient.sendActivity(
          `a réparti ${rdvTotal} rendez-vous ${typeLabel}`,
          `entre ${agentCount} agents en préservant les RDV pris`,
          { 
            type: typeLabel,
            rdvTotal,
            agentCount,
            rdvPerAgent
          }
        );
      })
      .catch(error => {
        console.error("Erreur lors de la répartition des RDV:", error);
        alert("Erreur lors de la répartition des RDV. Veuillez réessayer.");
      });
  };

  const updateCount = (index: number, delta: number, type: "currentCRM" | "currentDigital") => {
    const agent = agents[index];
    const previous = agent[type];
    
    if (previous === null) return;
    
    const newValue = previous + delta;
    const updatedAgent = { ...agent, [type]: newValue };
    
    // Envoyer la requête au serveur pour mettre à jour l'agent
    fetch(`/api/agents/${agent.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [type]: newValue }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Échec de la mise à jour');
        }
        return response.json();
      })
      .then(updatedAgentData => {
        // L'agent est automatiquement mis à jour via WebSocket, mais on peut mettre à jour localement aussi
        setAgents(prevAgents => 
          prevAgents.map(a => a.id === agent.id ? updatedAgentData : a)
        );
        
        // Envoyer une notification d'activité
        const typeLabel = type === "currentCRM" ? "CRM" : "Digital";
        const action = delta > 0 ? "a ajouté" : "a retiré";
        wsClient.sendActivity(
          `${action} un rendez-vous ${typeLabel}`,
          agent.name,
          { agent: agent.name, delta, type: typeLabel }
        );
        
        // L'agent vient juste d'atteindre son objectif (passe de positif à négatif)
        if (previous >= 0 && newValue < 0) {      
          // Envoyer une notification de réussite (sans alerte)
          wsClient.sendActivity(
            "a atteint son objectif",
            `${agent.name} (${typeLabel})`,
            { agent: agent.name, type: typeLabel }
          );
        }
        
        // L'agent a pris des RDV supplémentaires (bonus)
        if (newValue < 0) {
          // Calculer le nombre de RDV bonus
          const bonusRdv = Math.abs(newValue);
          
          // Envoyer une notification d'activité pour le bonus (sans alerte)
          if (delta < 0) {
            wsClient.sendActivity(
              "a pris un RDV bonus",
              `${agent.name} (${typeLabel})`,
              { agent: agent.name, type: typeLabel, bonusRdv }
            );
          }
        }
      })
      .catch(error => {
        console.error("Erreur lors de la mise à jour de l'agent:", error);
        alert("Erreur lors de la mise à jour de l'agent. Veuillez réessayer.");
      });
  };

  const updateAgentHours = (index: number, hours: number) => {
    const agent = agents[index];
    const previousHours = agent.hours;
    
    // Envoyer la requête au serveur pour mettre à jour l'agent
    fetch(`/api/agents/${agent.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hours }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Échec de la mise à jour des heures');
        }
        return response.json();
      })
      .then(updatedAgentData => {
        // L'agent est automatiquement mis à jour via WebSocket, mais on peut mettre à jour localement aussi
        setAgents(prevAgents => 
          prevAgents.map(a => a.id === agent.id ? updatedAgentData : a)
        );
        
        // Envoyer une notification d'activité pour la mise à jour des heures de travail
        wsClient.sendActivity(
          "a modifié les heures de travail",
          agent.name,
          { 
            agent: agent.name,
            previousHours,
            newHours: hours
          }
        );
      })
      .catch(error => {
        console.error("Erreur lors de la mise à jour des heures de travail:", error);
        alert("Erreur lors de la mise à jour des heures de travail. Veuillez réessayer.");
      });
  };

  const exportToExcel = () => {
    if (agents.length === 0) {
      alert("Il n'y a pas d'agents à exporter.");
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(
      agents.map((a) => ({
        Agent: a.name,
        Objectif: a.objectif,
        "RDV CRM Restants": a.currentCRM,
        "RDV Digitaux Restants": a.currentDigital,
        "Heures de travail": a.hours || 1
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RDV Agents");
    XLSX.writeFile(wb, "Suivi_RDV_Agents_CRM_Digital.xlsx");
    
    // Envoyer une notification d'activité pour l'export Excel
    wsClient.sendActivity(
      "a exporté les données des agents vers Excel",
      "",
      { 
        agentCount: agents.length,
        crmAgents: crmAgents.length,
        digitalAgents: digitalAgents.length,
        timestamp: new Date().toISOString()
      }
    );
  };

  const crmAgents = agents.filter((a) => a.currentCRM !== null);
  const digitalAgents = agents.filter((a) => a.currentDigital !== null);

  const totalCRM = crmAgents.reduce((sum, a) => sum + a.objectif, 0);
  const totalCRMRestants = crmAgents.reduce((sum, a) => sum + (a.currentCRM || 0), 0);
  const totalDigital = digitalAgents.reduce((sum, a) => sum + a.objectif, 0);
  const totalDigitalRestants = digitalAgents.reduce((sum, a) => sum + (a.currentDigital || 0), 0);
  
  // Calcul des RDV bonus (valeurs négatives) qui s'ajoutent au total
  const totalCRMBonus = crmAgents.reduce((sum, a) => {
    if (a.currentCRM === null || a.currentCRM >= 0) return sum;
    return sum + Math.abs(a.currentCRM);
  }, 0);
  
  const totalDigitalBonus = digitalAgents.reduce((sum, a) => {
    if (a.currentDigital === null || a.currentDigital >= 0) return sum;
    return sum + Math.abs(a.currentDigital);
  }, 0);

  const topCRMAgents = getTopAgents(agents, "currentCRM");
  const topDigitalAgents = getTopAgents(agents, "currentDigital");

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 p-4 md:p-6 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {/* Logo supprimé pour éviter la duplication */}
          </div>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-4">
                {currentUser && <AlertNotifications agentId={currentUser.id} />}
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-gray-700">
                    {currentUser.name}
                  </span>
                  <span className="text-xs text-blue-600">
                    {currentUser.role === "ADMIN" ? "Superviseur" : "Agent"}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="inline-block px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-md"
                >
                  🚪 Déconnexion
                </button>
              </div>
            ) : (
              <a 
                href="/auth" 
                className="inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md"
              >
                🔑 Connexion
              </a>
            )}
            {/* Logo supprimé pour éviter la duplication */}
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-900">📊 Mission RDV Master : Suivi Agents CRM & Digitaux</h1>

        <div className="text-center mb-6">
          <p className="text-gray-600 italic">
            Utilisez le menu en haut pour accéder au Grand Écran ou à la page des Scripts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center bg-gray-100 p-4 rounded-xl border-2 border-blue-300 shadow-md">
          <div>
            <h3 className="text-lg font-semibold text-blue-800">📋 CRM - Objectifs Spécifiques</h3>
            <p className="my-1">Total agents : {crmAgents.length}</p>
            <p className="my-1">Objectif total : {totalCRM}</p>
            <p className="my-1">RDV restants : {totalCRMRestants}</p>
            <p className="text-sm text-green-600 font-medium">
              {totalCRM - totalCRMRestants} RDV réalisés + <span className="text-yellow-500 font-bold">{totalCRMBonus} bonus</span>
            </p>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
              <div 
                className="bg-green-600 h-4 rounded-full" 
                style={{ 
                  width: `${Math.min(100, totalCRM > 0 ? Math.round(((totalCRM - totalCRMRestants) + totalCRMBonus) / totalCRM * 100) : 0)}%`
                }}
              >
              </div>
            </div>
            <p className="text-xs mt-1">Progression globale: {totalCRM > 0 ? Math.round(((totalCRM - totalCRMRestants) + totalCRMBonus) / totalCRM * 100) : 0}%</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-800">💻 Digital - Objectifs Spécifiques</h3>
            <p className="my-1">Total agents : {digitalAgents.length}</p>
            <p className="my-1">Objectif total : {totalDigital}</p>
            <p className="my-1">RDV restants : {totalDigitalRestants}</p>
            <p className="text-sm text-green-600 font-medium">
              {totalDigital - totalDigitalRestants} RDV réalisés + <span className="text-yellow-500 font-bold">{totalDigitalBonus} bonus</span>
            </p>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
              <div 
                className="bg-purple-600 h-4 rounded-full" 
                style={{ 
                  width: `${Math.min(100, totalDigital > 0 ? Math.round(((totalDigital - totalDigitalRestants) + totalDigitalBonus) / totalDigital * 100) : 0)}%`
                }}
              >
              </div>
            </div>
            <p className="text-xs mt-1">Progression globale: {totalDigital > 0 ? Math.round(((totalDigital - totalDigitalRestants) + totalDigitalBonus) / totalDigital * 100) : 0}%</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-col items-center bg-blue-100 p-5 rounded-xl space-y-4 shadow-md">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-2xl">
              <input 
                type="text" 
                value={newAgent} 
                onChange={(e) => setNewAgent(e.target.value)} 
                placeholder="Nom de l'agent" 
                className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-auto flex-grow"
              />
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isCRM} 
                      onChange={() => setIsCRM(!isCRM)} 
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                    />
                    <span>CRM</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isDigital} 
                      onChange={() => setIsDigital(!isDigital)} 
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" 
                    />
                    <span>Digital</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="objective-input" className="whitespace-nowrap">Objectif:</label>
                  <input 
                    id="objective-input"
                    type="number" 
                    min="1" 
                    className="border border-gray-300 px-3 py-1 rounded-lg w-16 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newObjective}
                    onChange={(e) => setNewObjective(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="whitespace-nowrap">Type d'agent:</label>
                  <select
                    value={agentType}
                    onChange={(e) => setAgentType(e.target.value as "HOT" | "PROSPECT" | "DIGI")}
                    className="border border-gray-300 px-3 py-1 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="HOT">HOT (3 RDV/h)</option>
                    <option value="PROSPECT">PROSPECT (2 RDV/h)</option>
                    <option value="DIGI">DIGI (5 RDV/h)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                onClick={addAgent}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200 shadow-md flex items-center gap-1"
              >
                ➕ Ajouter un agent
              </Button>
              <Button 
                variant="destructive"
                onClick={resetAgents}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200 shadow-md flex items-center gap-1"
              >
                🔄 Réinitialiser tous les compteurs
              </Button>
              <Button 
                onClick={exportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200 shadow-md flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-file-earmark-excel" viewBox="0 0 16 16">
                  <path d="M5.884 6.68a.5.5 0 1 0-.768.64L7.349 10l-2.233 2.68a.5.5 0 0 0 .768.64L8 10.781l2.116 2.54a.5.5 0 0 0 .768-.641L8.651 10l2.233-2.68a.5.5 0 0 0-.768-.64L8 9.219l-2.116-2.54z"/>
                  <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 1 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                </svg>
                Exporter vers Excel
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <TopAgents 
              title="🏅 Top 5 CRM" 
              agents={topCRMAgents}
              type="currentCRM"
            />

            <AppointmentSection
              title="📋 RDV CRM"
              agents={agents}
              type="currentCRM"
              rdvTotal={rdvCRMTotal}
              setRdvTotal={setRdvCRMTotal}
              onDispatchRdv={dispatchRdv}
              onRemoveAgent={removeAgent}
              onUpdateCount={updateCount}
              onUpdateHours={updateAgentHours}
            />

            <TopAgents 
              title="🏅 Top 5 Digitaux" 
              agents={topDigitalAgents}
              type="currentDigital"
            />

            <AppointmentSection
              title="💻 RDV Digitaux"
              agents={agents}
              type="currentDigital"
              rdvTotal={rdvDigitalTotal}
              setRdvTotal={setRdvDigitalTotal}
              onDispatchRdv={dispatchRdv}
              onRemoveAgent={removeAgent}
              onUpdateCount={updateCount}
              onUpdateHours={updateAgentHours}
            />
          </div>
          <div className="lg:col-span-1 space-y-8">
            <ActivityFeed />
            {isAdmin && <AlertSettings />}
            <div className="mt-8 flex justify-end">
              <TeamPresenceIndicator />
            </div>
          </div>
        </div>

        <div className="text-center pt-8 pb-4">
          <p className="text-sm text-gray-500">
            Mission RDV Master - Développé pour Konecta & Amplifon - version 1.0
          </p>
        </div>
      </div>
    </div>
  );
}
