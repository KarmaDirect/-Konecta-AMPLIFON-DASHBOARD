import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
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
import { Zap, Users, Target, TrendingUp, Award, Download, RefreshCw, UserPlus } from "lucide-react";

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

  // Optimisation des calculs avec useMemo
  const { crmAgents, digitalAgents, crmStats, digitalStats, topAgents } = useMemo(() => {
    const crmFiltered = agents.filter((a) => a.currentCRM !== null);
    const digitalFiltered = agents.filter((a) => a.currentDigital !== null);

    const crmStats = {
      total: crmFiltered.reduce((sum, a) => sum + a.objectif, 0),
      restants: crmFiltered.reduce((sum, a) => sum + (a.currentCRM || 0), 0),
      bonus: crmFiltered.reduce((sum, a) => {
        if (a.currentCRM === null || a.currentCRM >= 0) return sum;
        return sum + Math.abs(a.currentCRM);
      }, 0)
    };

    const digitalStats = {
      total: digitalFiltered.reduce((sum, a) => sum + a.objectif, 0),
      restants: digitalFiltered.reduce((sum, a) => sum + (a.currentDigital || 0), 0),
      bonus: digitalFiltered.reduce((sum, a) => {
        if (a.currentDigital === null || a.currentDigital >= 0) return sum;
        return sum + Math.abs(a.currentDigital);
      }, 0)
    };

    return {
      crmAgents: crmFiltered,
      digitalAgents: digitalFiltered,
      crmStats,
      digitalStats,
      topAgents: {
        crm: getTopAgents(agents, "currentCRM"),
        digital: getTopAgents(agents, "currentDigital")
      }
    };
  }, [agents]);

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

        {/* En-tête amélioré avec animations */}
        <BlurFade delay={0.25} inView>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Target className="h-10 w-10 text-blue-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-blue-900">POINT RDV</h1>
              <TrendingUp className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-gray-600 text-sm">Développé par Hatim • Version 2.0 Enhanced</p>
            <h2 className="text-xl md:text-2xl font-semibold text-blue-700">
              Suivi des Performances • Agents CRM & Digitaux
            </h2>
          </div>
        </BlurFade>

        {/* Statistiques globales améliorées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section CRM */}
          <BlurFade delay={0.5} inView>
            <Card className="relative border-blue-200 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              <BorderBeam size={250} duration={12} delay={0} />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Users className="h-5 w-5" />
                  CRM - Campagne Spécialisée
                </CardTitle>
                <CardDescription>Suivi des rendez-vous clients CRM</CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-gray-600">Agents actifs</p>
                  <p className="text-2xl font-bold text-blue-600">{crmAgents.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-600">Objectif campagne</p>
                  <p className="text-2xl font-bold text-blue-800">{rdvCRMTotal}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Objectif agents total</span>
                  <Badge variant="outline" className="font-mono">{crmStats.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">RDV restants</span>
                  <Badge variant="outline" className="font-mono">{crmStats.restants}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-700">RDV réalisés</span>
                  <Badge className="bg-green-100 text-green-800 font-mono">
                    {crmStats.total - crmStats.restants}
                  </Badge>
                </div>
                {crmStats.bonus > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-yellow-700">RDV bonus ⭐</span>
                    <Badge className="bg-yellow-100 text-yellow-800 font-mono">
                      +{crmStats.bonus}
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Progression campagne</span>
                  <span className="font-mono">
                    {rdvCRMTotal > 0 ? Math.round(((crmStats.total - crmStats.restants) + crmStats.bonus) / rdvCRMTotal * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  value={rdvCRMTotal > 0 ? Math.min(100, ((crmStats.total - crmStats.restants) + crmStats.bonus) / rdvCRMTotal * 100) : 0}
                  className="h-3"
                />
              </div>
            </CardContent>
            </Card>
          </BlurFade>

          {/* Section Digital */}
          <BlurFade delay={0.75} inView>
            <Card className="relative border-purple-200 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              <BorderBeam size={250} duration={12} delay={6} colorFrom="#9c40ff" colorTo="#ffaa40" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Zap className="h-5 w-5" />
                Digital - Campagne Numérique
              </CardTitle>
              <CardDescription>Suivi des rendez-vous digitaux</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-gray-600">Agents actifs</p>
                  <p className="text-2xl font-bold text-purple-600">{digitalAgents.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-600">Objectif campagne</p>
                  <p className="text-2xl font-bold text-purple-800">{rdvDigitalTotal}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Objectif agents total</span>
                  <Badge variant="outline" className="font-mono">{digitalStats.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">RDV restants</span>
                  <Badge variant="outline" className="font-mono">{digitalStats.restants}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-700">RDV réalisés</span>
                  <Badge className="bg-green-100 text-green-800 font-mono">
                    {digitalStats.total - digitalStats.restants}
                  </Badge>
                </div>
                {digitalStats.bonus > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-yellow-700">RDV bonus ⭐</span>
                    <Badge className="bg-yellow-100 text-yellow-800 font-mono">
                      +{digitalStats.bonus}
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Progression campagne</span>
                  <span className="font-mono">
                    {rdvDigitalTotal > 0 ? Math.round(((digitalStats.total - digitalStats.restants) + digitalStats.bonus) / rdvDigitalTotal * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  value={rdvDigitalTotal > 0 ? Math.min(100, ((digitalStats.total - digitalStats.restants) + digitalStats.bonus) / rdvDigitalTotal * 100) : 0}
                  className="h-3"
                />
              </div>
            </CardContent>
            </Card>
          </BlurFade>
        </div>

        {/* Section Administration Améliorée */}
        {isAdmin && (
          <BlurFade delay={1.0} inView>
            <Card className="relative border-blue-200 shadow-lg overflow-hidden">
              <BorderBeam size={200} duration={15} delay={3} colorFrom="#4285f4" colorTo="#34a853" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <UserPlus className="h-5 w-5" />
                  Administration des Agents
                </CardTitle>
                <CardDescription>
                  Ajouter de nouveaux agents et gérer les objectifs de l&apos;équipe
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-6">
              {/* Formulaire d'ajout d'agent */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nom de l&apos;agent</label>
                  <input 
                    type="text" 
                    value={newAgent} 
                    onChange={(e) => setNewAgent(e.target.value)} 
                    placeholder="Saisir le nom..." 
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Objectif RDV</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newObjective}
                    onChange={(e) => setNewObjective(parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Type d&apos;agent</label>
                  <select
                    value={agentType}
                    onChange={(e) => setAgentType(e.target.value as "HOT" | "PROSPECT" | "DIGI")}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="HOT">HOT (3 RDV/h)</option>
                    <option value="PROSPECT">PROSPECT (2 RDV/h)</option>
                    <option value="DIGI">DIGI (5 RDV/h)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Campagnes</label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isCRM} 
                        onChange={() => setIsCRM(!isCRM)} 
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                      />
                      <span className="text-sm">CRM</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isDigital} 
                        onChange={() => setIsDigital(!isDigital)} 
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" 
                      />
                      <span className="text-sm">Digital</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Boutons d'action */}
              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  onClick={addAgent}
                  className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200 shadow-md"
                  disabled={!newAgent.trim() || (!isCRM && !isDigital)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter Agent
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={resetAgents}
                  className="border-red-300 text-red-700 hover:bg-red-50 transition-colors duration-200"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réinitialiser Compteurs
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={exportToExcel}
                  className="border-green-300 text-green-700 hover:bg-green-50 transition-colors duration-200"
                  disabled={agents.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter Excel
                </Button>
              </div>
            </CardContent>
            </Card>
          </BlurFade>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <BlurFade delay={1.25} inView>
              <TopAgents 
                title="🏅 Top 5 CRM" 
                agents={topAgents.crm}
                type="currentCRM"
              />
            </BlurFade>

            <BlurFade delay={1.5} inView>
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
            </BlurFade>

            <BlurFade delay={1.75} inView>
              <TopAgents 
                title="🏅 Top 5 Digitaux" 
                agents={topAgents.digital}
                type="currentDigital"
              />
            </BlurFade>

            <BlurFade delay={2.0} inView>
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
            </BlurFade>
          </div>
          <div className="lg:col-span-1 space-y-8">
            <BlurFade delay={2.25} inView>
              <ActivityFeed />
            </BlurFade>
            {isAdmin && (
              <BlurFade delay={2.5} inView>
                <AlertSettings />
              </BlurFade>
            )}
            <BlurFade delay={2.75} inView>
              <div className="mt-8 flex justify-end">
                <TeamPresenceIndicator />
              </div>
            </BlurFade>
          </div>
        </div>

        <BlurFade delay={3.0} inView>
          <div className="text-center pt-8 pb-4">
            <p className="text-sm text-gray-500">
              POINT RDV - Développé par Hatim - Version 2.0 Enhanced
            </p>
          </div>
        </BlurFade>
      </div>
    </div>
  );
}
