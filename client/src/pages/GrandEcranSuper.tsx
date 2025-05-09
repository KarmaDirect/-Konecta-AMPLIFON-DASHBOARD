import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent, getEmoji } from "@/lib/agent";
import { Loader2, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Interface pour les données reçues du serveur
interface GrandEcranData {
  timestamp: string;
  allAgents: Agent[];
  crmAgents: Agent[];
  digitalAgents: Agent[];
  topAgents: {
    crm: Agent[];
    digital: Agent[];
  };
  stats: {
    crm: {
      totalAgents: number;
      totalObjectif: number;
      totalRealises: number;
      totalBonus: number;
      restants: number;
      completionRate: number;
    };
    digital: {
      totalAgents: number;
      totalObjectif: number;
      totalRealises: number;
      totalBonus: number;
      restants: number;
      completionRate: number;
    };
  };
}

export default function GrandEcranSuper() {
  const [data, setData] = useState<GrandEcranData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { toast } = useToast();

  // Fonction pour récupérer les données depuis notre nouvel endpoint
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Utiliser le nouvel endpoint qui regroupe toutes les données en une seule requête
      const response = await fetch('/api/grand-ecran-data', { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
      setLastRefresh(new Date());
      
      toast({
        title: "Données rafraîchies",
        description: "Les statistiques ont été mises à jour",
        variant: "default"
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("Erreur de chargement:", errorMessage);
      setError("Impossible de charger les données. Veuillez réessayer.");
      toast({
        title: "Erreur de chargement",
        description: "Impossible de récupérer les dernières données",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Chargement initial et rafraîchissement automatique
  useEffect(() => {
    fetchData();
    
    // Rafraîchir automatiquement toutes les 30 secondes
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Fonction pour afficher une carte d'agent
  const renderAgentCard = (agent: Agent, type: "CRM" | "Digital") => {
    const value = type === "CRM" ? (agent.currentCRM || 0) : (agent.currentDigital || 0);
    const objectif = agent.objectif;
    
    const completionRatio = Math.min(Math.max(0, 1 - (value / objectif)), 1);
    const completedRdv = Math.max(0, objectif - value);
    const emoji = getEmoji(value, objectif);
    
    const isCRM = type === "CRM";
    const colorClass = isCRM ? "border-blue-500" : "border-purple-500";
    
    return (
      <Card className={`bg-white text-black rounded-xl shadow-lg border-l-4 ${colorClass} ${agent.needsHelp ? 'animate-pulse border-red-500' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold">{agent.name}</CardTitle>
            <span className="text-3xl">{emoji}</span>
          </div>
          <CardDescription className="text-gray-600">
            Type: {agent.type} - {type === "CRM" ? "RDV CRM" : "RDV Digital"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div>
              <span className="font-medium">Objectif:</span>
              <span className="float-right">{objectif}</span>
            </div>
            <div>
              <span className="font-medium">Réalisés:</span>
              <span className="float-right">{completedRdv}</span>
            </div>
            <div>
              <span className="font-medium">Restants:</span>
              <span className="float-right">
                {value > 0 ? value : <span className="text-green-600 font-bold">Terminé!</span>}
              </span>
            </div>
            {value < 0 && (
              <div>
                <span className="font-medium text-yellow-600">Bonus:</span>
                <span className="float-right text-yellow-600 font-bold">{Math.abs(value)} ⭐</span>
              </div>
            )}
          </div>
          <Progress value={completionRatio * 100} className="h-2" />
          <p className="text-center mt-1 text-sm font-medium">
            {Math.round(completionRatio * 100)}% accompli
          </p>
        </CardContent>
      </Card>
    );
  };

  // Retour à la page précédente
  const handleBack = () => {
    window.history.back();
  };

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white flex flex-col justify-center items-center p-4 md:p-6">
        <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
        <h2 className="text-2xl font-bold mb-2">Chargement des données...</h2>
        <p className="text-lg opacity-70">Veuillez patienter pendant que nous récupérons les statistiques</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-red-900 text-white flex flex-col justify-center items-center p-4 md:p-6">
        <div className="max-w-md w-full bg-red-900/50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Erreur</h2>
          <p className="mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="w-full py-2 bg-white text-red-900 rounded-lg font-bold flex items-center justify-center gap-2"
          >
            <RefreshCcw className="h-5 w-5" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Si aucune donnée n'est disponible
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white flex flex-col justify-center items-center p-4 md:p-6">
        <h2 className="text-2xl font-bold mb-2">Aucune donnée disponible</h2>
        <button 
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
        >
          <RefreshCcw className="h-5 w-5" />
          Rafraîchir les données
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-6">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold">🎯 POINT RDV</h1>
            <p className="text-lg text-gray-300 mb-2">by hatim</p>
            <p className="text-xl opacity-70">Grand Écran v3</p>
            <p className="text-lg opacity-70">
              Mise à jour: {lastRefresh.toLocaleTimeString()}
            </p>
            <button 
              onClick={fetchData}
              className="mt-2 bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-colors mx-auto"
            >
              <RefreshCcw className="h-5 w-5" />
              Rafraîchir les données
            </button>
          </div>
        </div>
        
        {/* Totaux et progression */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-800/50 rounded-xl p-4 shadow-lg">
            <h2 className="text-2xl font-bold mb-3">📋 Campagne CRM</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">Total Agents</p>
                <p className="text-3xl font-bold">{data.stats.crm.totalAgents}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Totaux</p>
                <p className="text-3xl font-bold">{data.stats.crm.totalObjectif}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Réalisés</p>
                <p className="text-3xl font-bold">{data.stats.crm.totalRealises}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Bonus</p>
                <p className="text-3xl font-bold">{data.stats.crm.totalBonus} ⭐</p>
              </div>
            </div>
            <Progress value={data.stats.crm.completionRate} className="h-6 mb-2" />
            <div className="flex justify-between text-sm">
              <span>Progression: {data.stats.crm.totalRealises}/{data.stats.crm.totalObjectif}</span>
              <span>{data.stats.crm.completionRate}%</span>
            </div>
            <div className="mt-2">
              <div className="font-bold text-yellow-300 text-center">
                {data.stats.crm.restants} RDV restants
              </div>
            </div>
          </div>
          
          <div className="bg-purple-800/50 rounded-xl p-4 shadow-lg">
            <h2 className="text-2xl font-bold mb-3">💻 Campagne Digitale</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">Total Agents</p>
                <p className="text-3xl font-bold">{data.stats.digital.totalAgents}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Totaux</p>
                <p className="text-3xl font-bold">{data.stats.digital.totalObjectif}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Réalisés</p>
                <p className="text-3xl font-bold">{data.stats.digital.totalRealises}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Bonus</p>
                <p className="text-3xl font-bold">{data.stats.digital.totalBonus} ⭐</p>
              </div>
            </div>
            <Progress value={data.stats.digital.completionRate} className="h-6 mb-2" />
            <div className="flex justify-between text-sm">
              <span>Progression: {data.stats.digital.totalRealises}/{data.stats.digital.totalObjectif}</span>
              <span>{data.stats.digital.completionRate}%</span>
            </div>
            <div className="mt-2">
              <div className="font-bold text-yellow-300 text-center">
                {data.stats.digital.restants} RDV restants
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-blue-900/50 p-2 rounded-lg">
            <span className="bg-blue-600 w-4 h-4 rounded-full inline-block"></span>
            Top 5 Agents CRM
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.topAgents.crm.length > 0 ? (
              data.topAgents.crm.map((agent, i) => (
                <div key={`crm-${agent.id || i}`}>{renderAgentCard(agent, "CRM")}</div>
              ))
            ) : (
              <p className="text-gray-300 italic col-span-2">Aucun agent CRM à afficher.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-purple-900/50 p-2 rounded-lg">
            <span className="bg-purple-600 w-4 h-4 rounded-full inline-block"></span>
            Top 5 Agents Digitaux
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.topAgents.digital.length > 0 ? (
              data.topAgents.digital.map((agent, i) => (
                <div key={`digital-${agent.id || i}`}>{renderAgentCard(agent, "Digital")}</div>
              ))
            ) : (
              <p className="text-gray-300 italic col-span-2">Aucun agent Digital à afficher.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow transition-colors"
        >
          ← Retour au Dashboard
        </button>
      </div>

      <footer className="mt-10 text-center text-gray-400">
        <p className="text-lg font-medium mb-2">
          Objectifs journaliers: HOT = 3/h | PROSPECT = 2/h | DIGI = 5/h
        </p>
        <p>
          POINT RDV - Développé par hatim - version 3.0
        </p>
      </footer>
    </div>
  );
}