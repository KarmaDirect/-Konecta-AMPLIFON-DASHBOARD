// Interface pour les agents
export interface Agent {
  id: number;
  name: string;
  objectif: number;
  currentCRM: number | null;
  currentDigital: number | null;
  hours?: number;
  type?: "HOT" | "PROSPECT" | "DIGI";
  needsHelp?: boolean;
  role?: "ADMIN" | "AGENT";
  createdAt?: string;
  updatedAt?: string;
}

// Interface pour les réalisations
export interface Achievement {
  id: number;
  agentId: number;
  appointmentType: string;
  appointmentsCompleted: number;
  appointmentsTotal: number;
  achievementDate: string;
}

// Interface pour les logs d'activité
export interface ActivityLog {
  id: number;
  agentId: number;
  action: string;
  details?: string;
  timestamp: string;
}