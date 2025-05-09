import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Agent, getTotalRdvCompleted } from "@/lib/agent";
import { AgentCard } from "./AgentCard";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, RefreshCw } from "lucide-react";

interface AppointmentSectionProps {
  title: string;
  agents: Agent[];
  type: "currentCRM" | "currentDigital";
  rdvTotal: number;
  setRdvTotal: (value: number) => void;
  onDispatchRdv: (type: "currentCRM" | "currentDigital") => void;
  onRemoveAgent: (index: number) => void;
  onUpdateCount: (index: number, delta: number, type: "currentCRM" | "currentDigital") => void;
  onUpdateHours: (index: number, hours: number) => void;
}

export function AppointmentSection({
  title,
  agents,
  type,
  rdvTotal,
  setRdvTotal,
  onDispatchRdv,
  onRemoveAgent,
  onUpdateCount,
  onUpdateHours,
}: AppointmentSectionProps) {
  const { isAdmin } = useAuth();
  const isCRM = type === "currentCRM";
  const filteredAgents = agents.filter(agent => agent[type] !== null);
  const rdvCompleted = getTotalRdvCompleted(agents, type);
  
  // État pour les animations
  const [prevRdvCompleted, setPrevRdvCompleted] = useState(rdvCompleted);
  const [animateProgressBar, setAnimateProgressBar] = useState(false);
  const [isDispatchingRdv, setIsDispatchingRdv] = useState(false);
  
  // Calcul des RDV bonus
  const bonusRdv = agents.reduce((sum, a) => {
    if (a[type] === null || a[type]! >= 0) return sum;
    return sum + Math.abs(a[type]!);
  }, 0);
  
  // Le ratio global peut dépasser 100% grâce aux RDV bonus
  const ratioGlobal = rdvTotal > 0 ? Math.min(1, rdvCompleted / rdvTotal) : 0;
  
  const totalAgentHours = filteredAgents.reduce((sum, a) => sum + (a.hours || 1), 0);

  // Détecter les changements de RDV pour animer
  useEffect(() => {
    if (prevRdvCompleted !== rdvCompleted) {
      setAnimateProgressBar(true);
      setPrevRdvCompleted(rdvCompleted);
      
      const timer = setTimeout(() => {
        setAnimateProgressBar(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [rdvCompleted, prevRdvCompleted]);

  // Animation lors de la répartition des RDV
  const handleDispatchRdv = () => {
    setIsDispatchingRdv(true);
    onDispatchRdv(type);
    
    setTimeout(() => {
      setIsDispatchingRdv(false);
    }, 800);
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className={`text-xl font-semibold ${isCRM ? 'text-blue-800' : 'text-purple-800'}`}>{title}</h2>
      
      {isAdmin && (
        <motion.div 
          className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-lg shadow-md"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <label htmlFor={`rdv-${type}`} className="font-medium whitespace-nowrap">
            RDV totaux à dispatcher :
          </label>
          <motion.input
            id={`rdv-${type}`}
            type="number"
            value={rdvTotal}
            onChange={(e) => setRdvTotal(Number(e.target.value))}
            min="1"
            className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
            whileFocus={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          />
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              onClick={handleDispatchRdv}
              className={`whitespace-nowrap flex items-center gap-2 ${isCRM ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              disabled={isDispatchingRdv}
            >
              {isDispatchingRdv ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              Répartir entre les agents
            </Button>
          </motion.div>
          <p className="text-sm text-gray-600 italic">
            Répartition équitable : chaque agent recevra environ le même nombre de RDV.
          </p>
        </motion.div>
      )}

      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
        <motion.div
          className={`${animateProgressBar ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-green-500'} ${bonusRdv > 0 ? 'bonus-rainbow' : ''} h-6 rounded-full text-white text-xs font-semibold flex items-center justify-center`}
          style={{ width: `${ratioGlobal * 100}%` }}
          initial={{ width: 0 }}
          animate={{ 
            width: `${ratioGlobal * 100}%`,
            transition: { type: "spring", stiffness: 70, damping: 15 }
          }}
        >
          <div className={animateProgressBar ? 'progress-shimmer' : ''} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {rdvCompleted} RDV réalisés {bonusRdv > 0 ? `(dont ${bonusRdv} bonus)` : ''} / {rdvTotal} soit {Math.round(ratioGlobal * 100)}%
          </div>
        </motion.div>
      </div>

      {filteredAgents.length === 0 ? (
        <motion.p 
          className="text-center text-gray-500 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Aucun agent {isCRM ? 'CRM' : 'Digital'} à afficher
        </motion.p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAgents.map((agent, i) => (
              <AgentCard
                key={`${agent.name}-${type}-${i}`}
                agent={agent}
                index={agents.findIndex(a => a === agent)}
                type={type}
                onRemove={onRemoveAgent}
                onUpdateCount={onUpdateCount}
                onUpdateHours={onUpdateHours}
                rdvTotal={rdvTotal}
                totalAgentHours={totalAgentHours}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
