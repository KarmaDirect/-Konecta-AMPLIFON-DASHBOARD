import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Agent, getEmoji, getAgentCompletionRatio } from "@/lib/agent";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Star, Zap } from "lucide-react";

interface TopAgentsProps {
  title: string;
  agents: Agent[];
  type: "currentCRM" | "currentDigital";
}

export function TopAgents({ title, agents, type }: TopAgentsProps) {
  const isCRM = type === "currentCRM";
  const borderColor = isCRM ? "border-blue-200" : "border-purple-200";
  const textColor = isCRM ? "text-blue-800" : "text-purple-800";
  const bgColor = isCRM ? "bg-blue-600" : "bg-purple-600";
  const prevAgentsRef = useRef<Agent[]>([]);
  const [changedIndices, setChangedIndices] = useState<Record<string, boolean>>({});

  // Calcul du nombre total de RDVs pris par tous les agents (memoized)
  const totalRdvsPris = useMemo(() => {
    return agents.reduce((sum, agent) => {
      if (agent[type] === null) return sum;
      const rdvsPris = agent.objectif - (agent[type] || 0);
      return sum + (rdvsPris > 0 ? rdvsPris : 0);
    }, 0);
  }, [agents, type]);
  
  // Fonction pour détecter les changements (memoized)
  const detectChanges = useCallback(() => {
    const prevAgents = prevAgentsRef.current;
    const newChangedIndices: Record<string, boolean> = {};
    
    agents.forEach((agent, index) => {
      const prevAgent = prevAgents.find(p => p.id === agent.id);
      
      if (prevAgent && agent[type] !== prevAgent[type]) {
        newChangedIndices[`${agent.id}-${index}`] = true;
      }
    });
    
    if (Object.keys(newChangedIndices).length > 0) {
      setChangedIndices(newChangedIndices);
      
      // Réinitialiser les indices de changement après l'animation
      const timer = setTimeout(() => {
        setChangedIndices({});
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [agents, type]);
  
  // Suivre les changements pour les animations (optimisé)
  useEffect(() => {
    // Détecter les changements
    const cleanup = detectChanges();
    
    // Mettre à jour la référence des agents précédents
    prevAgentsRef.current = [...agents];
    
    return cleanup;
  }, [detectChanges, agents]);

  // Animer l'entrée des agents
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        type: "spring",
        stiffness: 100
      }
    })
  };
  
  // Calculer les agents triés par performance (memoized)
  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      const aRatio = a[type] !== null ? getAgentCompletionRatio(a, type) : 0;
      const bRatio = b[type] !== null ? getAgentCompletionRatio(b, type) : 0;
      return bRatio - aRatio;
    });
  }, [agents, type]);

  // Calculer les badges de récompense (optimisé)
  const getRewardBadge = useCallback((agent: Agent, index: number) => {
    const agentRank = sortedAgents.findIndex(a => a.id === agent.id);
    const completionRatio = getAgentCompletionRatio(agent, type);
    
    if (agentRank === 0 && completionRatio > 0.3) {
      return (
        <motion.div 
          className="absolute -top-3 -right-3 bg-yellow-400 rounded-full p-1 shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, 15, -15, 0] }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
        >
          <Trophy className="h-5 w-5 text-white" />
        </motion.div>
      );
    } else if (agentRank === 1 && completionRatio > 0.2) {
      return (
        <motion.div 
          className="absolute -top-3 -right-3 bg-gray-400 rounded-full p-1 shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
        >
          <Medal className="h-5 w-5 text-white" />
        </motion.div>
      );
    } else if (agentRank === 2 && completionRatio > 0.1) {
      return (
        <motion.div 
          className="absolute -top-3 -right-3 bg-amber-600 rounded-full p-1 shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
        >
          <Star className="h-5 w-5 text-white" />
        </motion.div>
      );
    }
    
    return null;
  }, [sortedAgents, type]);
  
  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h2 
        className="text-xl font-semibold text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        {title}
      </motion.h2>
      
      <div className="flex flex-wrap gap-4 justify-center">
        <AnimatePresence>
          {agents.length === 0 ? (
            <motion.div 
              className="text-center max-w-md px-6 py-4 bg-white shadow-lg rounded-xl border-2 border-gray-200"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-gray-700 font-medium text-lg mb-2">Objectif en attente</p>
              <p className="text-gray-600">Allez l'équipe ! C'est le moment de prendre les premiers rendez-vous de la journée ! 💪</p>
            </motion.div>
          ) : totalRdvsPris < 4 ? (
            <motion.div 
              className="text-center max-w-md px-6 py-4 bg-white shadow-lg rounded-xl border-2 border-gray-200"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-gray-700 font-medium text-lg mb-2">Début de journée</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-gray-600">Seulement {totalRdvsPris} RDV{totalRdvsPris > 1 ? 's' : ''} pris. C'est le moment d'accélérer !</p>
                <motion.div 
                  animate={{ rotate: [0, 15, -15, 15, -15, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Zap className="h-5 w-5 text-yellow-500" />
                </motion.div>
              </div>
            </motion.div>
          ) : (
            agents.map((agent, i) => {
              const completionRatio = getAgentCompletionRatio(agent, type);
              const completedRdv = agent.objectif - (agent[type] || 0);
              const isChanged = changedIndices[`${agent.id}-${i}`];
              
              return (
                <motion.div 
                  key={`${agent.name}-${i}`}
                  className={`relative bg-white shadow-lg rounded-xl px-4 py-3 text-center w-[150px] border-2 ${borderColor} ${agent.needsHelp ? 'help-pulse' : ''}`}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  {getRewardBadge(agent, i)}
                  
                  <motion.p 
                    className={`font-bold ${textColor}`}
                    animate={isChanged ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {agent.name}
                  </motion.p>
                  
                  <motion.p 
                    className="text-sm"
                    animate={isChanged ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    {completedRdv > 0 ? `${completedRdv} RDV réalisés` : '0 RDV réalisé'}
                  </motion.p>
                  
                  <motion.div
                    className="text-3xl my-2"
                    animate={
                      isChanged 
                        ? { y: [0, -10, 0], scale: [1, 1.2, 1] } 
                        : { y: [0, -5, 0], transition: { repeat: Infinity, repeatType: "mirror", duration: 2 } }
                    }
                    transition={{ duration: 0.5 }}
                  >
                    {getEmoji(agent[type], agent.objectif)}
                    {agent[type] !== null && agent[type] < 0 && (
                      <motion.span 
                        className="text-yellow-500 ml-1 inline-block"
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7]
                        }}
                        transition={{ 
                          duration: 1,
                          repeat: Infinity,
                          repeatType: "mirror"
                        }}
                      >
                        ⭐
                      </motion.span>
                    )}
                  </motion.div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                    <motion.div 
                      className={`${bgColor} h-2 rounded-full ${isChanged ? 'progress-shimmer' : ''}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRatio * 100}%` }}
                      transition={{ 
                        duration: 0.8, 
                        type: "spring",
                        stiffness: 50,
                        damping: 8
                      }}
                    />
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
