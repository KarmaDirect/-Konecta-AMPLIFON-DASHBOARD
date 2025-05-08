import { 
  users, type User, type InsertUser,
  agents, type Agent, type InsertAgent,
  achievements, type Achievement, type InsertAchievement
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
  
  // Réalisations
  getAchievements(): Promise<Achievement[]>;
  getAchievementsByAgentId(agentId: number): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
}

// Implémentation de l'interface avec la base de données PostgreSQL via Drizzle
export class DatabaseStorage implements IStorage {
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
      return await db.select().from(agents).where(eq(isNull(agents.currentCRM), false));
    } else {
      return await db.select().from(agents).where(isNull(agents.currentCRM));
    }
  }
  
  async getAgentsByDigitalStatus(hasDigital: boolean): Promise<Agent[]> {
    if (hasDigital) {
      return await db.select().from(agents).where(eq(isNull(agents.currentDigital), false));
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
}

// Utiliser le stockage en base de données
export const storage = new DatabaseStorage();
