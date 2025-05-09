import { useState, useEffect, useRef } from "react";
import { Agent, getEmoji, getAgentCompletionRatio, getTotalRdvCompleted, getTopAgents, getBottomAgents, getEncouragementMessage, getCongratulationMessage, getAverageCompletionRate } from "@/lib/agent";

export default function GrandEcran() {
  const [agents, setAgents] = useState<Agent[]>([]);
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
    
    const animationFrame = requestAnimationFrame(animate);
    const animationInterval = setInterval(animate, 30);
    
    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(animationInterval);
    };
  }, [scrollPosition]);

  // Load agents from localStorage on component mount and periodically
  useEffect(() => {
    loadAgents();
    
    const intervalId = setInterval(() => {
      loadAgents();
      setLastRefresh(new Date());
    }, refreshRate * 1000);
    
    return () => clearInterval(intervalId);
  }, [refreshRate]);
  
  const loadAgents = () => {
    const savedAgents = localStorage.getItem('rdvMasterAgents');
    if (savedAgents) {
      try {
        setAgents(JSON.parse(savedAgents));
      } catch (e) {
        console.error("Failed to parse saved agents:", e);
      }
    }
  };

  const crmAgents = agents.filter((a) => a.currentCRM !== null)
    .sort((a, b) => getAgentCompletionRatio(b, "currentCRM") - getAgentCompletionRatio(a, "currentCRM"));
    
  const digitalAgents = agents.filter((a) => a.currentDigital !== null)
    .sort((a, b) => getAgentCompletionRatio(b, "currentDigital") - getAgentCompletionRatio(a, "currentDigital"));
    
  const topCRMAgents = getTopAgents(agents, "currentCRM", 5);
  const topDigitalAgents = getTopAgents(agents, "currentDigital", 5);
  
  const bottomCRMAgents = getBottomAgents(agents, "currentCRM", 3);
  const bottomDigitalAgents = getBottomAgents(agents, "currentDigital", 3);

  const totalCRM = crmAgents.reduce((sum, a) => sum + a.objectif, 0);
  const totalDigital = digitalAgents.reduce((sum, a) => sum + a.objectif, 0);
  
  const totalCRMCompleted = getTotalRdvCompleted(crmAgents, "currentCRM");
  const totalDigitalCompleted = getTotalRdvCompleted(digitalAgents, "currentDigital");
  
  // Calcul du taux d'accomplissement basé sur la moyenne des ratios de complétion des agents
  const crmCompletionRate = getAverageCompletionRate(crmAgents, "currentCRM");
  const digitalCompletionRate = getAverageCompletionRate(digitalAgents, "currentDigital");
  
  // Calcul alternatif basé sur le total des RDV complétés
  const crmTotalCompletionRate = totalCRM ? Math.round((totalCRMCompleted / totalCRM) * 100) : 0;
  const digitalTotalCompletionRate = totalDigital ? Math.round((totalDigitalCompleted / totalDigital) * 100) : 0;
  
  const totalBonusCRM = crmAgents.reduce((sum, a) => {
    if (a.currentCRM === null || a.currentCRM >= 0) return sum;
    return sum + Math.abs(a.currentCRM);
  }, 0);
  
  const totalBonusDigital = digitalAgents.reduce((sum, a) => {
    if (a.currentDigital === null || a.currentDigital >= 0) return sum;
    return sum + Math.abs(a.currentDigital);
  }, 0);

  const renderAgentCard = (agent: Agent, type: "currentCRM" | "currentDigital") => {
    const value = agent[type];
    if (value === null) return null;
    
    const emoji = getEmoji(value, agent.objectif);
    const completionRatio = getAgentCompletionRatio(agent, type);
    const completedRdv = agent.objectif - value;
    const isCRM = type === "currentCRM";
    const colorClass = isCRM ? "border-blue-500" : "border-purple-500";
    const bgClass = isCRM ? "bg-blue-600" : "bg-purple-600";
    
    return (
      <div className={`bg-white rounded-xl shadow-lg p-4 border-l-4 ${colorClass}`}>
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">{agent.name}</h3>
          <span className="text-3xl animate-bounce">{emoji}</span>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between">
            <span>Objectif:</span>
            <span className="font-medium">{agent.objectif}</span>
          </div>
          <div className="flex justify-between">
            <span>Réalisés:</span>
            <span className="font-medium">{completedRdv > 0 ? completedRdv : 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Restants:</span>
            <span className="font-medium">
              {value > 0 ? value : <span className="text-green-600">Terminé!</span>}
            </span>
          </div>
          {value < 0 && (
            <div className="flex justify-between text-yellow-600">
              <span>Bonus:</span>
              <span className="font-bold">{Math.abs(value)} ⭐</span>
            </div>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
          <div 
            className={`${bgClass} h-3 rounded-full transition-all duration-500`} 
            style={{ width: `${completionRatio * 100}%` }}
          />
        </div>
        <p className="text-center mt-2 text-sm font-medium">
          {Math.round(completionRatio * 100)}% accompli
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-6">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <img src="https://upload.wikimedia.org/wikipedia/fr/thumb/e/e7/Konecta_Logo_2021.svg/512px-Konecta_Logo_2021.svg.png" alt="Konecta" className="h-12 bg-white p-1 rounded" />
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold">🎯 POINT RDV</h1>
            <p className="text-lg text-gray-300 mb-2">by hatim</p>
            <p className="text-xl opacity-70">Grand Écran</p>
            <p className="text-lg opacity-70">
              Dernière mise à jour: {lastRefresh.toLocaleTimeString()}
              {" | "}
              <button 
                className="text-blue-300 hover:underline"
                onClick={loadAgents}
              >
                Rafraîchir maintenant
              </button>
              {" | "}
              Refresh automatique: 
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
          <img src="/Amplifon-Logo.png" alt="Amplifon" className="h-10 bg-white p-1 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-800/50 rounded-xl p-4 shadow-lg">
            <h2 className="text-2xl font-bold mb-3">📋 Campagne CRM</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">Total Agents</p>
                <p className="text-3xl font-bold">{crmAgents.length}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Totaux</p>
                <p className="text-3xl font-bold">{totalCRM}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Réalisés</p>
                <p className="text-3xl font-bold">{totalCRMCompleted}</p>
              </div>
              <div className="bg-blue-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Bonus</p>
                <p className="text-3xl font-bold">{totalBonusCRM} ⭐</p>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Progression:</span>
                <span>{totalCRMCompleted}/{totalCRM} ({totalCRM > 0 ? Math.round(((totalCRM - (totalCRM - totalCRMCompleted)) + totalBonusCRM) / totalCRM * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-6 mb-2">
                <div 
                  className="bg-green-600 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, totalCRM > 0 ? Math.round(((totalCRM - (totalCRM - totalCRMCompleted)) + totalBonusCRM) / totalCRM * 100) : 0)}%`
                  }}
                >
                  {totalCRM > 0 ? Math.round(((totalCRM - (totalCRM - totalCRMCompleted)) + totalBonusCRM) / totalCRM * 100) : 0}%
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Restants:</span>
                <span className="font-bold text-yellow-300">{totalCRM - totalCRMCompleted} RDV à faire</span>
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
                <p className="text-3xl font-bold">{totalDigital}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Réalisés</p>
                <p className="text-3xl font-bold">{totalDigitalCompleted}</p>
              </div>
              <div className="bg-purple-900/60 rounded-lg p-3">
                <p className="text-lg">RDV Bonus</p>
                <p className="text-3xl font-bold">{totalBonusDigital} ⭐</p>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Progression:</span>
                <span>{totalDigitalCompleted}/{totalDigital} ({totalDigital > 0 ? Math.round(((totalDigital - (totalDigital - totalDigitalCompleted)) + totalBonusDigital) / totalDigital * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-6 mb-2">
                <div 
                  className="bg-purple-600 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, totalDigital > 0 ? Math.round(((totalDigital - (totalDigital - totalDigitalCompleted)) + totalBonusDigital) / totalDigital * 100) : 0)}%`
                  }}
                >
                  {totalDigital > 0 ? Math.round(((totalDigital - (totalDigital - totalDigitalCompleted)) + totalBonusDigital) / totalDigital * 100) : 0}%
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Restants:</span>
                <span className="font-bold text-yellow-300">{totalDigital - totalDigitalCompleted} RDV à faire</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bannière défilante pour les encouragements et félicitations - PLACÉE PLUS HAUT */}
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
                {getCongratulationMessage(agent, "currentCRM")}
              </span>
            ))}
            {topDigitalAgents.map((agent, index) => (
              <span key={`top-digital-${index}`} className="text-2xl font-bold text-pink-300">
                {getCongratulationMessage(agent, "currentDigital")}
              </span>
            ))}
            
            {/* Messages pour les agents moins performants */}
            {bottomCRMAgents.map((agent, index) => (
              <span key={`bottom-crm-${index}`} className="text-2xl font-bold text-blue-300">
                {getEncouragementMessage(agent, "currentCRM")}
              </span>
            ))}
            {bottomDigitalAgents.map((agent, index) => (
              <span key={`bottom-digital-${index}`} className="text-2xl font-bold text-purple-300">
                {getEncouragementMessage(agent, "currentDigital")}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-blue-600 w-4 h-4 rounded-full inline-block"></span>
            Agents CRM
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {crmAgents.length > 0 ? (
              crmAgents.map((agent, i) => (
                <div key={`crm-${i}`}>{renderAgentCard(agent, "currentCRM")}</div>
              ))
            ) : (
              <p className="text-gray-300 italic col-span-2">Aucun agent CRM à afficher.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-purple-600 w-4 h-4 rounded-full inline-block"></span>
            Agents Digitaux
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {digitalAgents.length > 0 ? (
              digitalAgents.map((agent, i) => (
                <div key={`digital-${i}`}>{renderAgentCard(agent, "currentDigital")}</div>
              ))
            ) : (
              <p className="text-gray-300 italic col-span-2">Aucun agent Digital à afficher.</p>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-10 text-center text-gray-400">
        <a 
          href="/" 
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors inline-block"
        >
          ⬅️ Retour au Tableau de Bord
        </a>
        <p className="mt-4">
          POINT RDV - Développé par hatim - version 1.0
        </p>
      </footer>
    </div>
  );
}
