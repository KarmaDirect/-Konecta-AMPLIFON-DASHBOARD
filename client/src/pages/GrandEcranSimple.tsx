import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent, getEmoji } from "@/lib/agent";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GrandEcranData {
  timestamp: string;
  allAgents: Agent[];
  crmAgents: Agent[];
  digitalAgents: Agent[];
  crmTarget: number;
  digitalTarget: number;
  topAgents: {
    crm: Agent[];
    digital: Agent[];
  };
  stats: {
    crm: {
      totalAgents: number;
      totalObjectif: number;
      campaignObjectif: number;
      totalRealises: number;
      totalBonus: number;
      restants: number;
      completionRate: number;
      campaignCompletionRate: number;
    };
    digital: {
      totalAgents: number;
      totalObjectif: number;
      campaignObjectif: number;
      totalRealises: number;
      totalBonus: number;
      restants: number;
      completionRate: number;
      campaignCompletionRate: number;
    };
  };
}

// Fonction pour récupérer les données via une simple requête fetch
const fetchGrandEcranData = async (): Promise<GrandEcranData> => {
  const response = await fetch('/api/grand-ecran-data', { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
  }
  return await response.json();
};

const fetchAgents = async (url: string): Promise<Agent[]> => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
  }
  return await response.json();
};

export default function GrandEcranSimple() {
  const [grandEcranData, setGrandEcranData] = useState<GrandEcranData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { toast } = useToast();
  
  // Fonction pour rafraîchir manuellement les données
  const refreshData = async () => {
    try {
      setIsLoading(true);
      
      // Utiliser l'endpoint centralisé pour les données du Grand Écran
      const data = await fetchGrandEcranData();
      
      setGrandEcranData(data);
      setLastRefresh(new Date());
      
      toast({
        title: "Données rafraîchies",
        description: "Les statistiques ont été mises à jour",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erreur de rafraîchissement",
        description: "Impossible de récupérer les dernières données",
        variant: "destructive"
      });
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Chargement initial des données
  useEffect(() => {
    refreshData();
    
    // Rafraîchissement automatique toutes les 30 secondes
    const intervalId = setInterval(() => {
      refreshData();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Extraction des données du state
  const crmAgents = grandEcranData?.crmAgents || [];
  const digitalAgents = grandEcranData?.digitalAgents || [];
  const topCRMAgents = grandEcranData?.topAgents?.crm || [];
  const topDigitalAgents = grandEcranData?.topAgents?.digital || [];
  
  // Stats pour la campagne CRM
  const crmStats = grandEcranData?.stats.crm || {
    totalAgents: 0,
    totalObjectif: 0,
    campaignObjectif: 0,
    totalRealises: 0,
    totalBonus: 0,
    restants: 0,
    completionRate: 0,
    campaignCompletionRate: 0
  };
  
  // Stats pour la campagne Digital
  const digitalStats = grandEcranData?.stats.digital || {
    totalAgents: 0,
    totalObjectif: 0,
    campaignObjectif: 0,
    totalRealises: 0,
    totalBonus: 0,
    restants: 0,
    completionRate: 0,
    campaignCompletionRate: 0
  };

  // Affichage des cartes d'agents
  const renderAgentCard = (agent: Agent, type: "CRM" | "Digital") => {
    const value = type === "CRM" ? (agent.currentCRM || 0) : (agent.currentDigital || 0);
    const objectif = agent.objectif;
    
    const completionRatio = Math.min(Math.max(0, 1 - (value / objectif)), 1);
    const completedRdv = Math.max(0, objectif - value);
    const emoji = getEmoji(value, objectif);
    
    const isCRM = type === "CRM";
    const colorClass = isCRM ? "border-blue-500" : "border-purple-500";
    
    return (
      <Card className={`bg-white text-black rounded-xl shadow-lg border-l-4 ${colorClass}`}>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white flex flex-col justify-center items-center p-4 md:p-6">
        <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
        <h2 className="text-2xl font-bold mb-2">Chargement des données...</h2>
        <p className="text-lg opacity-70">Veuillez patienter pendant que nous récupérons les statistiques</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-6">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {/* Pas besoin de dupliquer les logos ici car ils sont déjà dans la barre de navigation */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold">🎯 POINT RDV</h1>
            <p className="text-lg text-gray-300 mb-2">by hatim</p>
            <p className="text-xl opacity-70">Grand Écran Simple</p>
            <p className="text-lg opacity-70">
              Mise à jour: {lastRefresh.toLocaleTimeString()}
            </p>
            <button 
              onClick={refreshData}
              className="mt-2 bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.38-4.96M22 12.5a10 10 0 0 1-18.38 4.96"/>
              </svg>
              Rafraîchir les données
            </button>
          </div>
          <div></div>{/* Placeholder pour maintenir la mise en page en 3 colonnes */}
        </div>
        
        {/* Totaux et progression - Version simplifiée avec une seule barre de progression par campagne */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-800/50 rounded-xl p-4 shadow-lg">
            <h2 className="text-2xl font-bold mb-3">📋 Campagne CRM</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">Total Agents</p>
                <p className="text-3xl font-bold">{crmStats.totalAgents}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">Objectif Campagne</p>
                <p className="text-3xl font-bold">{crmStats.campaignObjectif}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Réalisés</p>
                <p className="text-3xl font-bold">{crmStats.totalRealises}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Bonus</p>
                <p className="text-3xl font-bold">{crmStats.totalBonus} ⭐</p>
              </div>
            </div>
            
            {/* Barre de progression unifiée pour la campagne CRM */}
            <h3 className="text-lg font-medium mb-1">Progression Globale</h3>
            <Progress value={crmStats.campaignCompletionRate} className="h-6 mb-2" />
            <div className="flex justify-between text-sm">
              <span>RDV Pris: {crmStats.totalRealises}/{crmStats.campaignObjectif}</span>
              <span>{crmStats.campaignCompletionRate}%</span>
            </div>
            <div className="mt-2">
              <div className="font-bold text-yellow-300 text-center">
                {crmStats.restants} RDV restants
              </div>
            </div>
          </div>
          
          <div className="bg-purple-800/50 rounded-xl p-4 shadow-lg">
            <h2 className="text-2xl font-bold mb-3">💻 Campagne Digitale</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">Total Agents</p>
                <p className="text-3xl font-bold">{digitalStats.totalAgents}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">Objectif Campagne</p>
                <p className="text-3xl font-bold">{digitalStats.campaignObjectif}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Réalisés</p>
                <p className="text-3xl font-bold">{digitalStats.totalRealises}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Bonus</p>
                <p className="text-3xl font-bold">{digitalStats.totalBonus} ⭐</p>
              </div>
            </div>
            
            {/* Barre de progression unifiée pour la campagne Digitale */}
            <h3 className="text-lg font-medium mb-1">Progression Globale</h3>
            <Progress value={digitalStats.campaignCompletionRate} className="h-6 mb-2" />
            <div className="flex justify-between text-sm">
              <span>RDV Pris: {digitalStats.totalRealises}/{digitalStats.campaignObjectif}</span>
              <span>{digitalStats.campaignCompletionRate}%</span>
            </div>
            <div className="mt-2">
              <div className="font-bold text-yellow-300 text-center">
                {digitalStats.restants} RDV restants
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
            {topCRMAgents.length > 0 ? (
              topCRMAgents.map((agent, i) => (
                <div key={`crm-${i}`}>{renderAgentCard(agent, "CRM")}</div>
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
            {topDigitalAgents.length > 0 ? (
              topDigitalAgents.map((agent, i) => (
                <div key={`digital-${i}`}>{renderAgentCard(agent, "Digital")}</div>
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
          POINT RDV - Développé par hatim - version 2.0
        </p>
      </footer>
    </div>
  );
}