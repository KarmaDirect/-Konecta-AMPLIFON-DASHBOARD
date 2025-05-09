import { useState, useEffect, useRef } from "react";
import { Agent, getEmoji } from "@/lib/agent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAgents } from "@/hooks/use-agents";

export default function GrandEcranNew() {
  const { data: agents = [] } = useAgents();
  const [refreshRate, setRefreshRate] = useState(30); // seconds
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [scrollPosition, setScrollPosition] = useState(0);
  const messageBannerRef = useRef<HTMLDivElement>(null);

  // Animation pour le texte défilant
  useEffect(() => {
    const animate = () => {
      if (messageBannerRef.current) {
        const bannerWidth = messageBannerRef.current.scrollWidth;
        const viewportWidth = messageBannerRef.current.offsetWidth;
        
        if (scrollPosition < -bannerWidth) {
          setScrollPosition(viewportWidth);
        } else {
          setScrollPosition(prevPosition => prevPosition - 1);
        }
      }
    };
    
    const animationInterval = setInterval(animate, 30);
    
    return () => {
      clearInterval(animationInterval);
    };
  }, [scrollPosition]);

  // Rafraîchissement automatique des données
  useEffect(() => {
    const intervalId = setInterval(() => {
      setLastRefresh(new Date());
    }, refreshRate * 1000);
    
    return () => clearInterval(intervalId);
  }, [refreshRate]);
  
  const crmAgents = agents
    .filter(a => a.currentCRM !== null)
    .sort((a, b) => {
      const aRatio = (a.currentCRM || 0) / a.objectif;
      const bRatio = (b.currentCRM || 0) / b.objectif;
      return bRatio - aRatio;
    });

  const digitalAgents = agents
    .filter(a => a.currentDigital !== null)
    .sort((a, b) => {
      const aRatio = (a.currentDigital || 0) / a.objectif;
      const bRatio = (b.currentDigital || 0) / b.objectif;
      return bRatio - aRatio;
    });

  const topCRMAgents = crmAgents.slice(0, 5);
  const topDigitalAgents = digitalAgents.slice(0, 5);

  // Calcul des totaux
  const totalCRMObjectif = crmAgents.reduce((sum, agent) => sum + agent.objectif, 0);
  const totalDigitalObjectif = digitalAgents.reduce((sum, agent) => sum + agent.objectif, 0);
  
  const totalCRMRealises = crmAgents.reduce((sum, agent) => {
    const currentCRM = agent.currentCRM || 0;
    const realises = agent.objectif - currentCRM;
    return sum + (realises > 0 ? realises : 0);
  }, 0);
  
  const totalDigitalRealises = digitalAgents.reduce((sum, agent) => {
    const currentDigital = agent.currentDigital || 0;
    const realises = agent.objectif - currentDigital;
    return sum + (realises > 0 ? realises : 0);
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

  // Messages d'encouragement et de félicitations
  const getEncouragementMessage = (agent: Agent, type: "CRM" | "Digital") => {
    const count = type === "CRM" ? (agent.currentCRM || 0) : (agent.currentDigital || 0);
    const name = agent.name;
    const percent = Math.round((1 - count / agent.objectif) * 100);

    const messages = [
      `Allez ${name} ! Tu n'es qu'à ${count} RDV de ton objectif ! 💪`,
      `Encore un petit effort ${name}, tu es à ${percent}% de ton objectif ! 🏁`,
      `${name}, la journée n'est pas finie ! Tu peux encore atteindre ton objectif ! 🚀`,
      `${count} RDV et c'est gagné ${name} ! On croit en toi ! ⭐`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getCongratulationMessage = (agent: Agent, type: "CRM" | "Digital") => {
    const count = type === "CRM" ? (agent.currentCRM || 0) : (agent.currentDigital || 0);
    const name = agent.name;
    const bonus = count < 0 ? Math.abs(count) : 0;

    const messages = [
      `Bravo ${name} ! Tu as atteint ton objectif avec ${bonus} RDV bonus ! 🏆`,
      `${name} en tête du classement avec ${bonus} RDV supplémentaires ! 🥇`,
      `Félicitations ${name} pour ta performance exceptionnelle ! +${bonus} RDV ! ⭐`,
      `${name}, champion(ne) du jour avec ${bonus} RDV au-delà de l'objectif ! 👑`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  };

  const renderAgentCard = (agent: Agent, type: "CRM" | "Digital") => {
    const value = type === "CRM" ? (agent.currentCRM || 0) : (agent.currentDigital || 0);
    const objectif = agent.objectif;
    
    const completionRatio = Math.min(Math.max(0, 1 - (value / objectif)), 1);
    const completedRdv = Math.max(0, objectif - value);
    const emoji = getEmoji(value, objectif);
    
    const isCRM = type === "CRM";
    const colorClass = isCRM ? "border-blue-500" : "border-purple-500";
    const bgClass = isCRM ? "bg-blue-600" : "bg-purple-600";
    
    return (
      <Card className={`bg-white text-black rounded-xl shadow-lg border-l-4 ${colorClass}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold">{agent.name}</CardTitle>
            <span className="text-3xl animate-bounce">{emoji}</span>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-6">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <img src="/attached_assets/Konecta-Logo.png" alt="Konecta" className="h-12 bg-white p-1 rounded" />
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold">🎯 POINT RDV</h1>
            <p className="text-lg text-gray-300 mb-2">by hatim</p>
            <p className="text-xl opacity-70">Grand Écran v2</p>
            <p className="text-lg opacity-70">
              Mise à jour: {lastRefresh.toLocaleTimeString()}
              {" | "}
              Rafraîchissement: 
              <select 
                value={refreshRate}
                onChange={(e) => setRefreshRate(Number(e.target.value))}
                className="ml-2 bg-blue-800 border border-blue-600 rounded px-2 py-1"
              >
                <option value="10">10s</option>
                <option value="30">30s</option>
                <option value="60">1min</option>
                <option value="300">5min</option>
              </select>
            </p>
          </div>
          <img src="/attached_assets/Amplifon-Logo.png" alt="Amplifon" className="h-10 bg-white p-1 rounded" />
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

      {/* Bannière messages défilants */}
      <div className="my-6 relative overflow-hidden bg-gradient-to-r from-blue-900 to-purple-900 py-6 rounded-lg shadow-xl border-2 border-yellow-400">
        <div 
          ref={messageBannerRef}
          className="whitespace-nowrap" 
          style={{ transform: `translateX(${scrollPosition}px)` }}
        >
          <div className="inline-flex space-x-24">
            {/* Messages pour les TOP agents */}
            {topCRMAgents.map((agent, index) => (
              <span key={`top-crm-${index}`} className="text-2xl font-bold text-yellow-300">
                {(agent.currentCRM || 0) <= 0 
                  ? getCongratulationMessage(agent, "CRM") 
                  : getEncouragementMessage(agent, "CRM")}
              </span>
            ))}
            {topDigitalAgents.map((agent, index) => (
              <span key={`top-digital-${index}`} className="text-2xl font-bold text-pink-300">
                {(agent.currentDigital || 0) <= 0 
                  ? getCongratulationMessage(agent, "Digital") 
                  : getEncouragementMessage(agent, "Digital")}
              </span>
            ))}
          </div>
        </div>
      </div>

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