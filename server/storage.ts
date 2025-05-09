import { 
  users, type User, type InsertUser,
  agents, type Agent, type InsertAgent,
  achievements, type Achievement, type InsertAchievement,
  activityLogs, type ActivityLog, type InsertActivityLog,
  campaignScripts, type CampaignScript, type InsertCampaignScript,
  alertThresholds, type AlertThreshold, type InsertAlertThreshold,
  campaignTargets, type CampaignTarget, type InsertCampaignTarget
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, desc, not } from "drizzle-orm";

// Interface pour le stockage
export interface IStorage {
  // Utilisateurs
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Agents
  getAgents(): Promise<Agent[]>;
  getAgentById(id: number): Promise<Agent | undefined>;
  getAgentsByType(type: "HOT" | "PROSPECT" | "DIGI"): Promise<Agent[]>;
  getAgentsByCRMStatus(hasCRM: boolean): Promise<Agent[]>;
  getAgentsByDigitalStatus(hasDigital: boolean): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<boolean>;
  toggleHelpRequest(id: number, needsHelp: boolean): Promise<Agent | undefined>;
  
  // Objectifs de campagne
  getCampaignTargets(): Promise<CampaignTarget>;
  updateCampaignTargets(targets: Partial<InsertCampaignTarget>): Promise<CampaignTarget>;

  // Réalisations
  getAchievements(): Promise<Achievement[]>;
  getAchievementsByAgentId(agentId: number): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  
  // Logs d'activité
  getActivityLogs(): Promise<ActivityLog[]>;
  getActivityLogsByAgentId(agentId: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Scripts de campagne
  getCampaignScripts(): Promise<CampaignScript[]>;
  getCampaignScriptById(id: number): Promise<CampaignScript | undefined>;
  getCampaignScriptsByCategory(category: string): Promise<CampaignScript[]>;
  getCampaignScriptsByCampaignName(campaignName: string): Promise<CampaignScript[]>;
  createCampaignScript(script: InsertCampaignScript): Promise<CampaignScript>;
  updateCampaignScript(id: number, script: Partial<InsertCampaignScript>): Promise<CampaignScript | undefined>;
  deleteCampaignScript(id: number): Promise<boolean>;
  
  // Alertes et Notifications
  getAlertThresholds(): Promise<AlertThreshold[]>;
  getAlertThresholdsByUserId(userId: number): Promise<AlertThreshold[]>;
  getAlertThresholdById(id: number): Promise<AlertThreshold | undefined>;
  createAlertThreshold(alertThreshold: InsertAlertThreshold): Promise<AlertThreshold>;
  updateAlertThreshold(id: number, alertThreshold: Partial<InsertAlertThreshold>): Promise<AlertThreshold | undefined>;
  deleteAlertThreshold(id: number): Promise<boolean>;
  checkAlerts(agentId: number, type: string): Promise<AlertThreshold[]>;
}

// Implémentation de l'interface avec la base de données PostgreSQL via Drizzle
export class DatabaseStorage implements IStorage {
  // Objectifs de campagne
  async getCampaignTargets(): Promise<CampaignTarget> {
    // Récupérer les objectifs de campagne, ou créer un enregistrement par défaut si aucun n'existe
    const targets = await db.select().from(campaignTargets);
    
    if (targets.length === 0) {
      // Aucun objectif de campagne trouvé, créer un enregistrement par défaut
      const [defaultTargets] = await db.insert(campaignTargets)
        .values({
          crmTarget: 100,
          digitalTarget: 50,
        })
        .returning();
      return defaultTargets;
    }
    
    // Retourner le premier enregistrement (il ne devrait y en avoir qu'un)
    return targets[0];
  }

  async updateCampaignTargets(targets: Partial<InsertCampaignTarget>): Promise<CampaignTarget> {
    // Récupérer l'ID des objectifs existants
    const existingTargets = await this.getCampaignTargets();
    
    // Mettre à jour l'enregistrement existant
    const [updatedTargets] = await db.update(campaignTargets)
      .set({
        ...targets,
        updatedAt: new Date()
      })
      .where(eq(campaignTargets.id, existingTargets.id))
      .returning();
    
    return updatedTargets;
  }
  
  // Utilisateurs
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }
  
  // Agents
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(agents.name);
  }
  
  async getAgentById(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }
  
  async getAgentsByType(type: "HOT" | "PROSPECT" | "DIGI"): Promise<Agent[]> {
    return await db.select().from(agents).where(eq(agents.type, type));
  }
  
  async getAgentsByCRMStatus(hasCRM: boolean): Promise<Agent[]> {
    if (hasCRM) {
      return await db.select().from(agents).where(not(isNull(agents.currentCRM)));
    } else {
      return await db.select().from(agents).where(isNull(agents.currentCRM));
    }
  }
  
  async getAgentsByDigitalStatus(hasDigital: boolean): Promise<Agent[]> {
    if (hasDigital) {
      return await db.select().from(agents).where(not(isNull(agents.currentDigital)));
    } else {
      return await db.select().from(agents).where(isNull(agents.currentDigital));
    }
  }
  
  async createAgent(agent: InsertAgent): Promise<Agent> {
    const now = new Date();
    const [createdAgent] = await db
      .insert(agents)
      .values({
        ...agent,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return createdAgent;
  }
  
  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    const now = new Date();
    const [updatedAgent] = await db
      .update(agents)
      .set({
        ...agent,
        updatedAt: now
      })
      .where(eq(agents.id, id))
      .returning();
    return updatedAgent;
  }
  
  async deleteAgent(id: number): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id));
    return true; // PostgreSQL via Drizzle ne retourne pas le nombre de lignes affectées de cette façon
  }
  
  // Réalisations
  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements).orderBy(desc(achievements.achievementDate));
  }
  
  async getAchievementsByAgentId(agentId: number): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.agentId, agentId))
      .orderBy(desc(achievements.achievementDate));
  }
  
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [createdAchievement] = await db
      .insert(achievements)
      .values(achievement)
      .returning();
    return createdAchievement;
  }
  
  // Méthode spécifique pour gérer les demandes d'aide
  async toggleHelpRequest(id: number, needsHelp: boolean): Promise<Agent | undefined> {
    const [updatedAgent] = await db
      .update(agents)
      .set({
        needsHelp,
        updatedAt: new Date()
      })
      .where(eq(agents.id, id))
      .returning();
      
    // Créer un log pour cette action
    const action = needsHelp ? "Demande d'aide activée" : "Demande d'aide désactivée";
    await this.createActivityLog({
      agentId: id,
      action,
      details: `L'agent a ${needsHelp ? "demandé" : "annulé sa demande d'"} aide`
    });
    
    return updatedAgent;
  }
  
  // Logs d'activité
  async getActivityLogs(): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp));
  }
  
  async getActivityLogsByAgentId(agentId: number): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.agentId, agentId))
      .orderBy(desc(activityLogs.timestamp));
  }
  
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [createdLog] = await db
      .insert(activityLogs)
      .values({
        ...log,
        timestamp: new Date()
      })
      .returning();
    return createdLog;
  }

  // Scripts de campagne
  async getCampaignScripts(): Promise<CampaignScript[]> {
    return await db
      .select()
      .from(campaignScripts)
      .orderBy(campaignScripts.priority, campaignScripts.title);
  }

  async getCampaignScriptById(id: number): Promise<CampaignScript | undefined> {
    const [script] = await db
      .select()
      .from(campaignScripts)
      .where(eq(campaignScripts.id, id));
    return script;
  }

  async getCampaignScriptsByCategory(category: string): Promise<CampaignScript[]> {
    return await db
      .select()
      .from(campaignScripts)
      .where(eq(campaignScripts.category, category))
      .orderBy(campaignScripts.priority, campaignScripts.title);
  }

  async getCampaignScriptsByCampaignName(campaignName: string): Promise<CampaignScript[]> {
    return await db
      .select()
      .from(campaignScripts)
      .where(eq(campaignScripts.campaignName, campaignName))
      .orderBy(campaignScripts.priority, campaignScripts.title);
  }

  async createCampaignScript(script: InsertCampaignScript): Promise<CampaignScript> {
    const now = new Date();
    const [createdScript] = await db
      .insert(campaignScripts)
      .values({
        ...script,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return createdScript;
  }

  async updateCampaignScript(id: number, script: Partial<InsertCampaignScript>): Promise<CampaignScript | undefined> {
    const now = new Date();
    const [updatedScript] = await db
      .update(campaignScripts)
      .set({
        ...script,
        updatedAt: now
      })
      .where(eq(campaignScripts.id, id))
      .returning();
    return updatedScript;
  }

  async deleteCampaignScript(id: number): Promise<boolean> {
    await db.delete(campaignScripts).where(eq(campaignScripts.id, id));
    return true;
  }

  // Alertes et notifications
  async getAlertThresholds(): Promise<AlertThreshold[]> {
    return await db
      .select()
      .from(alertThresholds)
      .orderBy(alertThresholds.thresholdValue);
  }

  async getAlertThresholdsByUserId(userId: number): Promise<AlertThreshold[]> {
    return await db
      .select()
      .from(alertThresholds)
      .where(eq(alertThresholds.userId, userId))
      .orderBy(alertThresholds.thresholdValue);
  }

  async getAlertThresholdById(id: number): Promise<AlertThreshold | undefined> {
    const [threshold] = await db
      .select()
      .from(alertThresholds)
      .where(eq(alertThresholds.id, id));
    return threshold;
  }

  async createAlertThreshold(alertThreshold: InsertAlertThreshold): Promise<AlertThreshold> {
    const now = new Date();
    const [createdThreshold] = await db
      .insert(alertThresholds)
      .values({
        ...alertThreshold,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return createdThreshold;
  }

  async updateAlertThreshold(id: number, alertThreshold: Partial<InsertAlertThreshold>): Promise<AlertThreshold | undefined> {
    const now = new Date();
    const [updatedThreshold] = await db
      .update(alertThresholds)
      .set({
        ...alertThreshold,
        updatedAt: now
      })
      .where(eq(alertThresholds.id, id))
      .returning();
    return updatedThreshold;
  }

  async deleteAlertThreshold(id: number): Promise<boolean> {
    await db.delete(alertThresholds).where(eq(alertThresholds.id, id));
    return true;
  }

  async checkAlerts(agentId: number, type: string): Promise<AlertThreshold[]> {
    // Récupérer l'agent et ses seuils d'alerte
    const agent = await this.getAgentById(agentId);
    if (!agent) return [];

    const userThresholds = await this.getAlertThresholdsByUserId(agentId);
    
    // Déterminer la valeur actuelle et l'objectif en fonction du type
    let currentValue = 0;
    let objectiveValue = agent.objectif;

    if (type === "CRM" && agent.currentCRM !== null) {
      currentValue = agent.currentCRM;
    } else if (type === "Digital" && agent.currentDigital !== null) {
      currentValue = agent.currentDigital;
    } else {
      return [];
    }

    // Calculer le pourcentage d'avancement
    const completion = (objectiveValue - currentValue) / objectiveValue * 100;
    
    // Filtrer les alertes qui correspondent aux seuils atteints
    const triggeredAlerts = userThresholds.filter(threshold => {
      // Ne traiter que les alertes actives pour ce type de RDV
      if (!threshold.isActive || (threshold.appointmentType !== type && threshold.appointmentType !== "Both")) {
        return false;
      }

      if (threshold.thresholdType === "percentage") {
        switch (threshold.alertType) {
          case "objective_approaching":
            return completion >= threshold.thresholdValue;
          case "objective_reached":
            return completion >= 100;
          case "objective_exceeded":
            return completion > 100;
          default:
            return false;
        }
      } else if (threshold.thresholdType === "absolute") {
        switch (threshold.alertType) {
          case "objective_approaching":
            return (objectiveValue - currentValue) <= threshold.thresholdValue;
          case "objective_reached":
            return (objectiveValue - currentValue) <= 0;
          case "objective_exceeded":
            return (objectiveValue - currentValue) < 0;
          default:
            return false;
        }
      }
      
      return false;
    });

    return triggeredAlerts;
  }
}

// Utiliser le stockage en base de données
export const storage = new DatabaseStorage();
