import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent, getEmoji, getEncouragementMessage, getCongratulationMessage, getBottomAgents, getTopAgents, getAverageCompletionRate } from "@/lib/agent";
import { Loader2, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GrandEcranLocal() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [crmCampaignTarget, setCrmCampaignTarget] = useState(100); // Objectif total de la campagne CRM
  const [digitalCampaignTarget, setDigitalCampaignTarget] = useState(50); // Objectif total de la campagne Digital
  const { toast } = useToast();
  
  // Récupérer les données depuis l'API
  const loadAgents = () => {
    setIsLoading(true);
    
    // Récupérer les agents
    const fetchAgents = fetch('/api/agents')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.json();
      });
    
    // Récupérer les objectifs de campagne via l'API "grand-ecran-data"
    const fetchCampaignTargets = fetch('/api/grand-ecran-data')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Si l'API renvoie les objectifs de campagne, on les utilise
        if (data.crmTarget) setCrmCampaignTarget(data.crmTarget);
        if (data.digitalTarget) setDigitalCampaignTarget(data.digitalTarget);
        return data;
      })
      .catch(err => {
        console.error("Erreur lors du chargement des objectifs de campagne:", err);
        // En cas d'erreur, on garde les valeurs par défaut
      });
    
    // Exécuter les deux requêtes en parallèle
    Promise.all([fetchAgents, fetchCampaignTargets])
      .then(([agentsData]) => {
        setAgents(agentsData);
        toast({
          title: "Données rafraîchies",
          description: "Les statistiques ont été mises à jour",
          variant: "default"
        });
      })
      .catch(err => {
        console.error("Erreur lors du chargement des données:", err);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les données",
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsLoading(false);
        setLastRefresh(new Date());
      });
  };
  
  // Chargement initial et rafraîchissement automatique
  useEffect(() => {
    // Charge immédiatement
    loadAgents();
    
    // Rafraîchissement toutes les 5 minutes (300000ms)
    const dataInterval = setInterval(() => {
      loadAgents();
    }, 300000);
    
    // Gestion du mode plein écran pour affichage 24/7
    const handleFullscreen = () => {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(err => {
          console.error('Erreur passage en plein écran:', err);
        });
      }
    };
    
    // Activer plein écran automatiquement après 3 secondes
    const fullscreenTimeout = setTimeout(() => {
      handleFullscreen();
    }, 3000);
    
    // Prévenir la mise en veille et l'écran de veille
    const keepAlive = () => {
      // Force un petit rafraîchissement visuel
      const currentOpacity = document.body.style.opacity;
      document.body.style.opacity = '0.99999';
      setTimeout(() => {
        document.body.style.opacity = currentOpacity;
      }, 500);
    };
    
    // Garder le système actif toutes les 30 secondes
    const keepAliveInterval = setInterval(keepAlive, 30000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(keepAliveInterval);
      clearTimeout(fullscreenTimeout);
    };
  }, []);
  
  // Filtrer les agents avec CRM et Digital
  const crmAgents = agents.filter(agent => agent.currentCRM !== null);
  const digitalAgents = agents.filter(agent => agent.currentDigital !== null);
  
  // Trier les agents par performance (les meilleurs = proches de l'objectif ou avec bonus)
  const sortedCrmAgents = [...crmAgents].sort((a, b) => {
    const aCurrent = a.currentCRM || 0;
    const bCurrent = b.currentCRM || 0;
    
    // Si l'un des agents a un bonus (valeur négative), il est prioritaire
    if (aCurrent < 0 && bCurrent >= 0) return -1;
    if (bCurrent < 0 && aCurrent >= 0) return 1;
    
    // Si les deux ont un bonus, celui qui a le plus grand bonus (valeur plus négative) est prioritaire
    if (aCurrent < 0 && bCurrent < 0) return aCurrent - bCurrent;
    
    // Sinon, on compare la distance à l'objectif (plus proche = meilleur)
    return aCurrent - bCurrent;
  });

  const sortedDigitalAgents = [...digitalAgents].sort((a, b) => {
    const aCurrent = a.currentDigital || 0;
    const bCurrent = b.currentDigital || 0;
    
    // Si l'un des agents a un bonus (valeur négative), il est prioritaire
    if (aCurrent < 0 && bCurrent >= 0) return -1;
    if (bCurrent < 0 && aCurrent >= 0) return 1;
    
    // Si les deux ont un bonus, celui qui a le plus grand bonus (valeur plus négative) est prioritaire
    if (aCurrent < 0 && bCurrent < 0) return aCurrent - bCurrent;
    
    // Sinon, on compare la distance à l'objectif (plus proche = meilleur)
    return aCurrent - bCurrent;
  });
  
  // Top 5 agents (les meilleures performances)
  const topCRMAgents = sortedCrmAgents.slice(0, 5);
  const topDigitalAgents = sortedDigitalAgents.slice(0, 5);
  
  // Calcul des totaux
  const totalCRMObjectif = crmAgents.reduce((sum, agent) => sum + agent.objectif, 0);
  const totalDigitalObjectif = digitalAgents.reduce((sum, agent) => sum + agent.objectif, 0);
  
  const totalCRMRealises = crmAgents.reduce((sum, agent) => {
    const currentCRM = agent.currentCRM || 0;
    const realises = currentCRM <= 0 ? agent.objectif : (agent.objectif - currentCRM);
    return sum + realises;
  }, 0);
  
  const totalDigitalRealises = digitalAgents.reduce((sum, agent) => {
    const currentDigital = agent.currentDigital || 0;
    const realises = currentDigital <= 0 ? agent.objectif : (agent.objectif - currentDigital);
    return sum + realises;
  }, 0);
  
  // Calcul du taux d'accomplissement basé sur la moyenne des ratios de complétion des agents
  const crmCompletionRate = getAverageCompletionRate(crmAgents, "currentCRM");
  const digitalCompletionRate = getAverageCompletionRate(digitalAgents, "currentDigital");
  
  // Calcul alternatif basé sur le total des RDV complétés (ancienne méthode)
  const crmTotalCompletionRate = totalCRMObjectif ? Math.round((totalCRMRealises / totalCRMObjectif) * 100) : 0;
  const digitalTotalCompletionRate = totalDigitalObjectif ? Math.round((totalDigitalRealises / totalDigitalObjectif) * 100) : 0;
  
  const totalCRMBonus = crmAgents.reduce((sum, agent) => {
    const currentCRM = agent.currentCRM || 0;
    return sum + (currentCRM < 0 ? Math.abs(currentCRM) : 0);
  }, 0);
  
  const totalDigitalBonus = digitalAgents.reduce((sum, agent) => {
    const currentDigital = agent.currentDigital || 0;
    return sum + (currentDigital < 0 ? Math.abs(currentDigital) : 0);
  }, 0);
  
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
    // Sortir du mode plein écran si actif
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error('Erreur sortie plein écran:', err);
      });
    }
    window.history.back();
  };
  
  if (isLoading && agents.length === 0) {
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
      {/* Bande déroulante de motivation en haut */}
      <div className="mb-6 mt-2 overflow-hidden sticky top-0 z-10">
        <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-3 rounded-lg shadow-md relative overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center">
            {/* Messages de félicitations variés pour CRM */}
            {topCRMAgents.slice(0, 3).map((agent, index) => (
              <div key={`top-crm-${index}`} className="inline-block mx-6 px-4 py-1 bg-yellow-500 bg-opacity-30 rounded-lg border-l-4 border-yellow-400">
                <span className="font-bold mr-2">🏆 {agent.name}</span>
                <span className="text-white">
                  {index === 0 ? `${agent.objectif - (agent.currentCRM || 0)} RDV pris! Bravo pour cette excellente performance et ton professionnalisme!` :
                   index === 1 ? `Excellent travail CRM! Ton engagement fait la différence auprès de nos patients!` :
                   `Continue comme ça! Tu représentes parfaitement les valeurs d'Amplifon!`}
                </span>
              </div>
            ))}
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            {/* Messages supplémentaires pour CRM */}
            <div className="inline-block mx-6 px-4 py-1 bg-yellow-500 bg-opacity-30 rounded-lg border-l-4 border-yellow-400">
              <span className="text-white font-bold">🔥 L'équipe CRM bat tous les records! Continue à maintenir cette qualité de service exceptionnelle!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-yellow-500 bg-opacity-30 rounded-lg border-l-4 border-yellow-400">
              <span className="text-white font-bold">⭐ Progression constante sur les RDV CRM - Bravo à tous pour ton engagement et ton professionnalisme!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            {/* Félicitations pour les meilleurs digitaux */}
            {topDigitalAgents.slice(0, 3).map((agent, index) => (
              <div key={`top-digital-${index}`} className="inline-block mx-6 px-4 py-1 bg-purple-500 bg-opacity-30 rounded-lg border-l-4 border-purple-400">
                <span className="font-bold mr-2">🏆 {agent.name}</span>
                <span className="text-white">
                  {index === 0 ? `${agent.objectif - (agent.currentDigital || 0)} RDV Digital! Félicitations pour ces résultats exceptionnels!` :
                   index === 1 ? `Performance impressionnante sur le canal digital! Tu maîtrises parfaitement les outils numériques!` :
                   `Excellent rythme sur les rendez-vous digitaux! Ton expertise technique fait la différence!`}
                </span>
              </div>
            ))}
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            {/* Messages supplémentaires pour Digital */}
            <div className="inline-block mx-6 px-4 py-1 bg-purple-500 bg-opacity-30 rounded-lg border-l-4 border-purple-400">
              <span className="text-white font-bold">📱 L'équipe Digitale atteint de nouveaux sommets! Ta maîtrise des outils numériques transforme chaque contact en opportunité!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-purple-500 bg-opacity-30 rounded-lg border-l-4 border-purple-400">
              <span className="text-white font-bold">💫 Chaque clic compte - L'excellence digitale est notre signature! Continue à construire notre réputation en ligne!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            {/* Encouragements variés */}
            {getBottomAgents(crmAgents, "currentCRM").map((agent, index) => (
              <div key={`bottom-crm-${index}`} className="inline-block mx-6 px-4 py-1 bg-blue-500 bg-opacity-30 rounded-lg border-l-4 border-blue-400">
                <span className="font-bold mr-2">💪 {agent.name}:</span>
                <span className="text-white">
                  {index === 0 ? `Encore quelques efforts pour atteindre ton objectif! Nous savons que tu as le potentiel pour y arriver!` :
                   index === 1 ? `Tu progresses bien! Rappelle-toi que chaque conversation est une opportunité de faire la différence!` :
                   `Nous croyons en toi! Ta persévérance sera récompensée par d'excellents résultats!`}
                </span>
              </div>
            ))}
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            {/* Messages supplémentaires d'encouragement */}
            <div className="inline-block mx-6 px-4 py-1 bg-blue-500 bg-opacity-30 rounded-lg border-l-4 border-blue-400">
              <span className="text-white font-bold">🌟 La persévérance est la clé du succès! Ne lâche rien, chaque appel te rapproche de ton objectif!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-blue-500 bg-opacity-30 rounded-lg border-l-4 border-blue-400">
              <span className="text-white font-bold">🔄 Chaque essai te rapproche du succès! Reste motivé(e) et concentré(e) sur tes objectifs!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            {/* Messages sur les règles professionnelles */}
            <div className="inline-block mx-6 px-4 py-1 bg-red-500 bg-opacity-30 rounded-lg border-l-4 border-red-400">
              <span className="text-white font-bold">⚠️ RAPPEL RGPD: Mentionne systématiquement la clause RGPD en début d'appel et assure le consentement du patient!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-red-500 bg-opacity-30 rounded-lg border-l-4 border-red-400">
              <span className="text-white font-bold">📵 RAPPEL: L'usage du téléphone personnel est strictement interdit pendant les heures de travail!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-red-500 bg-opacity-30 rounded-lg border-l-4 border-red-400">
              <span className="text-white font-bold">📝 RAPPEL SCRIPTS: Respecte scrupuleusement les scripts de vente validés par la direction!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-red-500 bg-opacity-30 rounded-lg border-l-4 border-red-400">
              <span className="text-white font-bold">⏱️ RAPPEL APPELS ENTRANTS: La durée maximale ciblée est de 4 minutes par appel! Sois concis et efficace!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            {/* Messages motivationnels généraux */}
            <div className="inline-block mx-6 px-4 py-1 bg-green-500 bg-opacity-30 rounded-lg border-l-4 border-green-400">
              <span className="text-white font-bold">🚀 MISSION RDV MASTER: Ensemble vers l'excellence! Notre force collective nous permet d'atteindre des objectifs ambitieux!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-orange-500 bg-opacity-30 rounded-lg border-l-4 border-orange-400">
              <span className="text-white font-bold">✨ AMPLIFON: La qualité au cœur de notre mission! Chaque jour, tu améliores la vie de nos patients grâce à ton engagement!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-teal-500 bg-opacity-30 rounded-lg border-l-4 border-teal-400">
              <span className="text-white font-bold">📞 KONECTA: Les meilleurs télévendeurs sont ici! Ton expertise et ton professionnalisme font notre réputation d'excellence!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            {/* Citations motivantes */}
            <div className="inline-block mx-6 px-4 py-1 bg-pink-500 bg-opacity-30 rounded-lg border-l-4 border-pink-400">
              <span className="text-white font-bold">🌈 Le bonheur est la clé du succès! Prends plaisir dans tes tâches quotidiennes et les résultats suivront naturellement!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-indigo-500 bg-opacity-30 rounded-lg border-l-4 border-indigo-400">
              <span className="text-white font-bold">🌟 Ensemble, nous relevons tous les défis! La force de notre équipe réside dans notre solidarité et notre détermination!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-lime-500 bg-opacity-30 rounded-lg border-l-4 border-lime-400">
              <span className="text-white font-bold">🎯 L'excellence est une habitude quotidienne! Cultive chaque jour les petits gestes qui font la différence!</span>
            </div>
            
            {/* Séparateur */}
            <div className="inline-block mx-8 w-4"></div>
            
            <div className="inline-block mx-6 px-4 py-1 bg-cyan-500 bg-opacity-30 rounded-lg border-l-4 border-cyan-400">
              <span className="text-white font-bold">💎 La qualité est le résultat d'un effort intelligent et constant! Ton travail méthodique construit notre réussite collective!</span>
            </div>
          </div>
        </div>
      </div>
      
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold">🎯 POINT RDV</h1>
            <p className="text-lg text-gray-300 mb-2">by hatim</p>
            <p className="text-xl opacity-70">Grand Écran Local</p>
            <p className="text-lg opacity-70">
              Mise à jour: {lastRefresh.toLocaleTimeString()}
            </p>
            <button 
              onClick={loadAgents}
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
                <p className="text-3xl font-bold">{crmAgents.length}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">Objectif Campagne</p>
                <p className="text-3xl font-bold">{crmCampaignTarget}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">Objectifs Agents</p>
                <p className="text-3xl font-bold">{totalCRMObjectif}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Réalisés</p>
                <p className="text-3xl font-bold">{totalCRMRealises}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Bonus</p>
                <p className="text-3xl font-bold">{totalCRMBonus} ⭐</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Restants</p>
                <p className="text-3xl font-bold">{totalCRMObjectif - totalCRMRealises}</p>
              </div>
            </div>
            
            {/* Progression par agents */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">Progression agents:</span>
                <span className="font-bold">{crmCompletionRate}%</span>
              </div>
              <Progress value={crmCompletionRate} className="h-4 mb-2" />
              <div className="flex justify-between text-sm">
                <span>RDV: {totalCRMRealises}/{totalCRMObjectif}</span>
                <span>{totalCRMBonus > 0 ? `+${totalCRMBonus} bonus` : ''}</span>
              </div>
            </div>
            
            {/* Progression par campagne */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">Progression campagne:</span>
                <span className="font-bold">{Math.min(100, Math.round((totalCRMRealises / crmCampaignTarget) * 100))}%</span>
              </div>
              <div className="w-full h-4 bg-blue-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((totalCRMRealises / crmCampaignTarget) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>RDV: {totalCRMRealises}/{crmCampaignTarget}</span>
                <span>{crmCampaignTarget - totalCRMRealises} restants</span>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-800/50 rounded-xl p-4 shadow-lg">
            <h2 className="text-2xl font-bold mb-3">💻 Campagne Digitale</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">Total Agents</p>
                <p className="text-3xl font-bold">{digitalAgents.length}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">Objectif Campagne</p>
                <p className="text-3xl font-bold">{digitalCampaignTarget}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">Objectifs Agents</p>
                <p className="text-3xl font-bold">{totalDigitalObjectif}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Réalisés</p>
                <p className="text-3xl font-bold">{totalDigitalRealises}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Bonus</p>
                <p className="text-3xl font-bold">{totalDigitalBonus} ⭐</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Restants</p>
                <p className="text-3xl font-bold">{totalDigitalObjectif - totalDigitalRealises}</p>
              </div>
            </div>
            
            {/* Progression par agents */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">Progression agents:</span>
                <span className="font-bold">{digitalCompletionRate}%</span>
              </div>
              <Progress value={digitalCompletionRate} className="h-4 mb-2" />
              <div className="flex justify-between text-sm">
                <span>RDV: {totalDigitalRealises}/{totalDigitalObjectif}</span>
                <span>{totalDigitalBonus > 0 ? `+${totalDigitalBonus} bonus` : ''}</span>
              </div>
            </div>
            
            {/* Progression par campagne */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">Progression campagne:</span>
                <span className="font-bold">{Math.min(100, Math.round((totalDigitalRealises / digitalCampaignTarget) * 100))}%</span>
              </div>
              <div className="w-full h-4 bg-purple-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((totalDigitalRealises / digitalCampaignTarget) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>RDV: {totalDigitalRealises}/{digitalCampaignTarget}</span>
                <span>{digitalCampaignTarget - totalDigitalRealises} restants</span>
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
                <div key={`crm-${agent.id || i}-${i}`}>{renderAgentCard(agent, "CRM")}</div>
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
                <div key={`digital-${agent.id || i}-${i}`}>{renderAgentCard(agent, "Digital")}</div>
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