import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent, getEmoji, getEncouragementMessage, getCongratulationMessage, getBottomAgents, getTopAgents } from "@/lib/agent";
import { Loader2, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GrandEcranLocal() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { toast } = useToast();
  
  // Récupérer les données depuis localStorage, comme le fait le Dashboard
  const loadAgents = () => {
    setIsLoading(true);
    try {
      const savedAgents = localStorage.getItem('rdvMasterAgents');
      if (savedAgents) {
        const parsedAgents = JSON.parse(savedAgents);
        setAgents(parsedAgents);
        
        toast({
          title: "Données rafraîchies",
          description: "Les statistiques ont été mises à jour",
          variant: "default"
        });
      } else {
        toast({
          title: "Aucune donnée",
          description: "Aucun agent n'a été trouvé dans le stockage local",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Erreur lors du chargement des agents:", err);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les données des agents",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
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
  
  const crmCompletionRate = totalCRMObjectif ? Math.round((totalCRMRealises / totalCRMObjectif) * 100) : 0;
  const digitalCompletionRate = totalDigitalObjectif ? Math.round((totalDigitalRealises / totalDigitalObjectif) * 100) : 0;
  
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
        <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-3 rounded-lg shadow-md relative">
          <div className="animate-marquee whitespace-nowrap flex items-center">
            {/* Messages de félicitations variés pour CRM */}
            {topCRMAgents.slice(0, 3).map((agent, index) => (
              <div key={`top-crm-${index}`} className="inline-block mx-4 px-4 py-1 bg-yellow-500 bg-opacity-30 rounded-lg border-l-4 border-yellow-400">
                <span className="font-bold mr-2">🏆 {agent.name}</span>
                <span className="text-white">
                  {index === 0 ? `Leader CRM avec ${agent.objectif - (agent.currentCRM || 0)} RDV pris! Bravo pour cette performance exceptionnelle!` :
                   index === 1 ? `${agent.name} se distingue aujourd'hui! Superbe travail et excellent taux de conversion!` :
                   `${agent.name} montre l'exemple avec constance et professionnalisme! Continue comme ça!`}
                </span>
              </div>
            ))}
            
            {/* Messages supplémentaires pour CRM */}
            <div className="inline-block mx-4 px-4 py-1 bg-yellow-500 bg-opacity-30 rounded-lg border-l-4 border-yellow-400">
              <span className="text-white font-bold">🔥 L'équipe CRM bat tous les records aujourd'hui! Continuez sur cette lancée exceptionnelle!</span>
            </div>
            
            <div className="inline-block mx-4 px-4 py-1 bg-yellow-500 bg-opacity-30 rounded-lg border-l-4 border-yellow-400">
              <span className="text-white font-bold">⭐ Les rendez-vous CRM sont en progression constante - Bravo à toute l'équipe pour votre engagement!</span>
            </div>
            
            {/* Félicitations pour les meilleurs digitaux */}
            {topDigitalAgents.slice(0, 3).map((agent, index) => (
              <div key={`top-digital-${index}`} className="inline-block mx-4 px-4 py-1 bg-purple-500 bg-opacity-30 rounded-lg border-l-4 border-purple-400">
                <span className="font-bold mr-2">🏆 {agent.name}</span>
                <span className="text-white">
                  {index === 0 ? `Champion Digital avec ${agent.objectif - (agent.currentDigital || 0)} RDV! Félicitations pour cette performance remarquable!` :
                   index === 1 ? `Performance impressionnante sur le canal Digital! ${agent.name} inspire toute l'équipe par son efficacité!` :
                   `Excellent rythme sur les RDV Digitaux! ${agent.name} maîtrise parfaitement les techniques de conversion!`}
                </span>
              </div>
            ))}
            
            {/* Messages supplémentaires pour Digital */}
            <div className="inline-block mx-4 px-4 py-1 bg-purple-500 bg-opacity-30 rounded-lg border-l-4 border-purple-400">
              <span className="text-white font-bold">📱 L'équipe Digitale atteint de nouveaux sommets! Votre expertise fait la différence pour nos patients!</span>
            </div>
            
            <div className="inline-block mx-4 px-4 py-1 bg-purple-500 bg-opacity-30 rounded-lg border-l-4 border-purple-400">
              <span className="text-white font-bold">💫 Chaque clic compte, chaque conversation mène à un rendez-vous - L'excellence digitale en action!</span>
            </div>
            
            {/* Encouragements variés */}
            {getBottomAgents(crmAgents, "currentCRM").map((agent, index) => (
              <div key={`bottom-crm-${index}`} className="inline-block mx-4 px-4 py-1 bg-blue-500 bg-opacity-30 rounded-lg border-l-4 border-blue-400">
                <span className="font-bold mr-2">💪 {agent.name}:</span>
                <span className="text-white">
                  {index === 0 ? `Encore quelques efforts pour atteindre ton objectif! Nous savons que tu peux transformer chaque conversation en succès!` :
                   index === 1 ? `Tu progresses bien, continue sur cette lancée! Les prochains appels seront les bons!` :
                   `Nous croyons en toi, tu vas y arriver! Ta persévérance est la clé de ton succès à venir!`}
                </span>
              </div>
            ))}
            
            {/* Messages supplémentaires d'encouragement */}
            <div className="inline-block mx-4 px-4 py-1 bg-blue-500 bg-opacity-30 rounded-lg border-l-4 border-blue-400">
              <span className="text-white font-bold">🌟 La persévérance est la clé du succès - Gardez confiance et transformez chaque appel en opportunité!</span>
            </div>
            
            <div className="inline-block mx-4 px-4 py-1 bg-blue-500 bg-opacity-30 rounded-lg border-l-4 border-blue-400">
              <span className="text-white font-bold">🔄 Chaque essai nous rapproche de la réussite - Gardez votre énergie et votre motivation!</span>
            </div>
            
            {/* Messages motivationnels généraux */}
            <div className="inline-block mx-4 px-4 py-1 bg-green-500 bg-opacity-30 rounded-lg border-l-4 border-green-400">
              <span className="text-white font-bold">🚀 MISSION RDV MASTER: Chaque appel compte! Ensemble vers l'excellence! Notre force est dans notre cohésion d'équipe!</span>
            </div>
            
            <div className="inline-block mx-4 px-4 py-1 bg-orange-500 bg-opacity-30 rounded-lg border-l-4 border-orange-400">
              <span className="text-white font-bold">✨ AMPLIFON: La qualité de service au cœur de notre mission! Nous changeons la vie de nos patients grâce à votre engagement!</span>
            </div>
            
            <div className="inline-block mx-4 px-4 py-1 bg-teal-500 bg-opacity-30 rounded-lg border-l-4 border-teal-400">
              <span className="text-white font-bold">📞 KONECTA: Nos télévendeurs sont les meilleurs! Prouvons-le chaque jour! Votre expertise fait notre réputation d'excellence!</span>
            </div>
            
            {/* Citations motivantes */}
            <div className="inline-block mx-4 px-4 py-1 bg-pink-500 bg-opacity-30 rounded-lg border-l-4 border-pink-400">
              <span className="text-white font-bold">🌈 "Le succès n'est pas la clé du bonheur. Le bonheur est la clé du succès." - Nous croyons en chacun d'entre vous!</span>
            </div>
            
            <div className="inline-block mx-4 px-4 py-1 bg-indigo-500 bg-opacity-30 rounded-lg border-l-4 border-indigo-400">
              <span className="text-white font-bold">🌟 "Les défis sont ce qui rend la vie intéressante, les surmonter est ce qui lui donne un sens." - Ensemble, nous relevons tous les défis!</span>
            </div>
            
            <div className="inline-block mx-4 px-4 py-1 bg-lime-500 bg-opacity-30 rounded-lg border-l-4 border-lime-400">
              <span className="text-white font-bold">🎯 "L'excellence n'est pas un acte mais une habitude." - Merci à vous tous de faire de l'excellence notre standard quotidien!</span>
            </div>
            
            <div className="inline-block mx-4 px-4 py-1 bg-cyan-500 bg-opacity-30 rounded-lg border-l-4 border-cyan-400">
              <span className="text-white font-bold">💎 "La qualité n'est jamais un accident; c'est toujours le résultat d'un effort intelligent." - Votre effort fait notre réussite collective!</span>
            </div>
          </div>
        </div>
      </div>
      
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold">🎯 Grand Écran - RDV Master</h1>
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
                <p className="text-lg">RDV Totaux</p>
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
            </div>
            <Progress value={crmCompletionRate} className="h-6 mb-2" />
            <div className="flex justify-between text-sm">
              <span>Progression: {totalCRMRealises}/{totalCRMObjectif}</span>
              <span>{crmCompletionRate}%</span>
            </div>
            <div className="mt-2">
              <div className="font-bold text-yellow-300 text-center">
                {totalCRMObjectif - totalCRMRealises} RDV restants
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
                <p className="text-lg">RDV Totaux</p>
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
            </div>
            <Progress value={digitalCompletionRate} className="h-6 mb-2" />
            <div className="flex justify-between text-sm">
              <span>Progression: {totalDigitalRealises}/{totalDigitalObjectif}</span>
              <span>{digitalCompletionRate}%</span>
            </div>
            <div className="mt-2">
              <div className="font-bold text-yellow-300 text-center">
                {totalDigitalObjectif - totalDigitalRealises} RDV restants
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
          Mission RDV Master - Développé pour Konecta & Amplifon - version 3.0
        </p>
      </footer>
    </div>
  );
}