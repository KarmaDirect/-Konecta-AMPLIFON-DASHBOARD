import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

// Version ultra simplifiée du Grand Écran
export default function GrandEcranBasic() {
  const [agents, setAgents] = useState<any[]>([]);
  const [crmAgents, setCrmAgents] = useState<any[]>([]);
  const [digitalAgents, setDigitalAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fonction pour récupérer les données
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Requêtes directes avec fetch
      const allResp = await fetch('/api/agents', { credentials: 'include' });
      const crmResp = await fetch('/api/agents/crm/true', { credentials: 'include' });
      const digitalResp = await fetch('/api/agents/digital/true', { credentials: 'include' });
      
      if (!allResp.ok || !crmResp.ok || !digitalResp.ok) {
        throw new Error("Erreur lors de la récupération des données");
      }
      
      const allData = await allResp.json();
      const crmData = await crmResp.json();
      const digitalData = await digitalResp.json();
      
      setAgents(allData);
      setCrmAgents(crmData);
      setDigitalAgents(digitalData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Erreur de chargement:", err);
      setError("Impossible de charger les données. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Chargement initial et rafraîchissement automatique
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading && agents.length === 0) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Chargement des données...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center">
        <div className="text-white text-center max-w-md mx-auto p-6 bg-red-800 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Erreur</h2>
          <p>{error}</p>
          <button 
            onClick={fetchData} 
            className="mt-4 px-4 py-2 bg-white text-red-900 rounded-lg font-bold"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Calcul des totaux simplifiés
  const crmTotal = crmAgents.reduce((sum, agent) => sum + agent.objectif, 0);
  const crmCompleted = crmAgents.reduce((sum, agent) => {
    const currentCRM = agent.currentCRM || 0;
    return sum + (currentCRM <= 0 ? agent.objectif : (agent.objectif - currentCRM));
  }, 0);
  
  const digitalTotal = digitalAgents.reduce((sum, agent) => sum + agent.objectif, 0);
  const digitalCompleted = digitalAgents.reduce((sum, agent) => {
    const currentDigital = agent.currentDigital || 0;
    return sum + (currentDigital <= 0 ? agent.objectif : (agent.objectif - currentDigital));
  }, 0);

  return (
    <div className="min-h-screen bg-blue-900 text-white p-4">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-center mb-2">Grand Écran - Version Basique</h1>
        <p className="text-center mb-4">Dernière mise à jour: {lastRefresh.toLocaleTimeString()}</p>
        <button 
          onClick={fetchData}
          className="block mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          Rafraîchir les données
        </button>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Campagne CRM</h2>
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span>Total Agents: {crmAgents.length}</span>
              <span>RDV Total: {crmTotal}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>RDV Réalisés: {crmCompleted}</span>
              <span>Progression: {crmTotal > 0 ? Math.round((crmCompleted / crmTotal) * 100) : 0}%</span>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2">Liste des agents CRM:</h3>
          <div className="space-y-2">
            {crmAgents.map((agent, index) => (
              <div key={index} className="bg-blue-700 p-2 rounded">
                <div className="flex justify-between">
                  <span>{agent.name}</span>
                  <span>Type: {agent.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Objectif: {agent.objectif}</span>
                  <span>Restant: {agent.currentCRM || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-purple-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Campagne Digitale</h2>
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span>Total Agents: {digitalAgents.length}</span>
              <span>RDV Total: {digitalTotal}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>RDV Réalisés: {digitalCompleted}</span>
              <span>Progression: {digitalTotal > 0 ? Math.round((digitalCompleted / digitalTotal) * 100) : 0}%</span>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2">Liste des agents Digital:</h3>
          <div className="space-y-2">
            {digitalAgents.map((agent, index) => (
              <div key={index} className="bg-purple-700 p-2 rounded">
                <div className="flex justify-between">
                  <span>{agent.name}</span>
                  <span>Type: {agent.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Objectif: {agent.objectif}</span>
                  <span>Restant: {agent.currentDigital || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto mt-6 text-center">
        <button 
          onClick={() => window.history.back()} 
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md"
        >
          Retour au Dashboard
        </button>
      </div>
    </div>
  );
}