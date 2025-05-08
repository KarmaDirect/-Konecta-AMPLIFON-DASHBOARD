import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { TopAgents } from "@/components/TopAgents";
import { AppointmentSection } from "@/components/AppointmentSection";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Agent, getTopAgents } from "@/lib/agent";
import { useAuth } from "@/hooks/use-auth";
import { useTeamPresence } from "@/hooks/use-team-presence";
import { wsClient } from "@/lib/websocket";

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

  // Load agents from localStorage on component mount
  useEffect(() => {
    const savedAgents = localStorage.getItem('rdvMasterAgents');
    if (savedAgents) {
      try {
        setAgents(JSON.parse(savedAgents));
      } catch (e) {
        console.error("Failed to parse saved agents:", e);
      }
    }
  }, []);

  // Save agents to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('rdvMasterAgents', JSON.stringify(agents));
  }, [agents]);

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
      setAgents([...agents, newEntry]);
      setNewAgent("");
      setNewObjective(20);
      setIsCRM(true);
      setIsDigital(true);
      
      // Envoyer une notification d'activité pour l'ajout d'agent
      wsClient.sendActivity(
        "a ajouté un nouvel agent",
        newEntry.name,
        { 
          agent: newEntry.name, 
          type: agentType,
          hasCRM: isCRM,
          hasDigital: isDigital,
          objectif: Number(newObjective)
        }
      );
    }
  };

  const removeAgent = (index: number) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${agents[index].name} ?`)) {
      const agent = agents[index];
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
    }
  };

  const resetAgents = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser tous les compteurs ?")) {
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          currentCRM: a.currentCRM !== null ? a.objectif : null,
          currentDigital: a.currentDigital !== null ? a.objectif : null
        }))
      );
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

    const rdvPerAgent = Math.floor(rdvTotal / agentCount);
    const remainder = rdvTotal % agentCount;

    const updated = agents.map((a, i) => {
      if (a[type] === null) return a;
      
      // Find the index of this agent in the filtered list
      const filteredIndex = filteredAgents.findIndex(fa => fa === a);
      const bonus = filteredIndex < remainder ? 1 : 0;
      const objectif = rdvPerAgent + bonus;
      
      return {
        ...a,
        objectif,
        [type]: objectif
      };
    });

    setAgents(updated);
    
    // Envoyer une notification d'activité pour la répartition des RDV
    const typeLabel = type === "currentCRM" ? "CRM" : "Digital";
    wsClient.sendActivity(
      `a réparti ${rdvTotal} rendez-vous ${typeLabel}`,
      `entre ${agentCount} agents`,
      { 
        type: typeLabel,
        rdvTotal,
        agentCount,
        rdvPerAgent
      }
    );
  };

  const updateCount = (index: number, delta: number, type: "currentCRM" | "currentDigital") => {
    const updated = [...agents];
    const previous = updated[index][type];
    
    if (previous === null) return;
    
    updated[index][type] = previous + delta;
    setAgents(updated);

    // Envoyer une notification d'activité
    const typeLabel = type === "currentCRM" ? "CRM" : "Digital";
    const action = delta > 0 ? "a ajouté" : "a retiré";
    wsClient.sendActivity(
      `${action} un rendez-vous ${typeLabel}`,
      updated[index].name,
      { agent: updated[index].name, delta, type: typeLabel }
    );

    if (
      previous >= 0 &&
      updated[index][type]! < 0 &&
      !notified.includes(`${updated[index].name}-${type}`)
    ) {
      alert(
        `🎉 Bravo ${updated[index].name} ! Tu as dépassé ton objectif ${
          type === "currentCRM" ? "CRM" : "Digital"
        } ! ⭐`
      );
      setNotified([...notified, `${updated[index].name}-${type}`]);
      
      // Envoyer une notification de réussite
      wsClient.sendActivity(
        "a atteint son objectif",
        `${updated[index].name} (${typeLabel})`,
        { agent: updated[index].name, type: typeLabel }
      );
    }
  };

  const updateAgentHours = (index: number, hours: number) => {
    const updated = [...agents];
    const previousHours = updated[index].hours;
    updated[index].hours = hours;
    setAgents(updated);
    
    // Envoyer une notification d'activité pour la mise à jour des heures de travail
    wsClient.sendActivity(
      "a modifié les heures de travail",
      updated[index].name,
      { 
        agent: updated[index].name,
        previousHours,
        newHours: hours
      }
    );
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

  const topCRMAgents = getTopAgents(agents, "currentCRM");
  const topDigitalAgents = getTopAgents(agents, "currentDigital");

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 p-4 md:p-6 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <img src="/Konecta-Logo.png" alt="Konecta" className="h-12" />
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
            <img src="/Amplifon-Logo.png" alt="Amplifon" className="h-10" />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-900">📊 Mission RDV Master : Suivi Agents CRM & Digitaux</h1>

        <div className="text-center flex flex-col md:flex-row items-center justify-center gap-3">
          <a href="/grand-ecran" className="inline-block mt-2 px-4 py-2 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors duration-200 shadow-md">
            🖥️ Accéder au Grand Écran Avancé
          </a>
          <a href="/scripts" className="inline-block mt-2 px-4 py-2 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors duration-200 shadow-md">
            📝 Gérer les Scripts de Campagne
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center bg-gray-100 p-4 rounded-xl border-2 border-blue-300 shadow-md">
          <div>
            <h3 className="text-lg font-semibold text-blue-800">📋 CRM - Objectifs Spécifiques</h3>
            <p className="my-1">Total agents : {crmAgents.length}</p>
            <p className="my-1">Objectif total : {totalCRM}</p>
            <p className="my-1">RDV restants : {totalCRMRestants}</p>
            <p className="text-sm text-green-600 font-medium">
              {totalCRM - totalCRMRestants} RDV réalisés soit {totalCRM > 0 ? Math.round((totalCRM - totalCRMRestants) / totalCRM * 100) : 0}%
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-800">💻 Digital - Objectifs Spécifiques</h3>
            <p className="my-1">Total agents : {digitalAgents.length}</p>
            <p className="my-1">Objectif total : {totalDigital}</p>
            <p className="my-1">RDV restants : {totalDigitalRestants}</p>
            <p className="text-sm text-green-600 font-medium">
              {totalDigital - totalDigitalRestants} RDV réalisés soit {totalDigital > 0 ? Math.round((totalDigital - totalDigitalRestants) / totalDigital * 100) : 0}%
            </p>
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
              title="🏅 Top 3 CRM" 
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
              title="🏅 Top 3 Digitaux" 
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
