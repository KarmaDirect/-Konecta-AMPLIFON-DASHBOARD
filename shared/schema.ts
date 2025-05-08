import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Définition de l'énumération pour les types d'agents
export const agentTypeEnum = pgEnum("agent_type", ["HOT", "PROSPECT", "DIGI"]);

// Table des utilisateurs
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Définition de l'énumération pour les rôles d'utilisateurs
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "AGENT"]);

// Table des agents
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  objectif: integer("objectif").notNull().default(20),
  currentCRM: integer("current_crm"),
  currentDigital: integer("current_digital"),
  hours: integer("hours").notNull().default(1),
  type: agentTypeEnum("agent_type").notNull().default("HOT"),
  needsHelp: boolean("needs_help").default(false),
  role: userRoleEnum("user_role").notNull().default("AGENT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentsRelations = relations(agents, ({ many }) => ({
  achievements: many(achievements)
}));

// Table des réalisations (pour suivre l'historique des RDV)
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  appointmentType: text("appointment_type").notNull(), // "CRM" ou "Digital"
  appointmentsCompleted: integer("appointments_completed").notNull().default(0),
  appointmentsTotal: integer("appointments_total").notNull().default(0),
  achievementDate: timestamp("achievement_date").defaultNow().notNull(),
});

export const achievementsRelations = relations(achievements, ({ one }) => ({
  agent: one(agents, {
    fields: [achievements.agentId],
    references: [agents.id],
  }),
}));

// Table des logs d'activité
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  agent: one(agents, {
    fields: [activityLogs.agentId],
    references: [agents.id],
  }),
}));

// Schemas pour les insertions
export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  objectif: true,
  currentCRM: true,
  currentDigital: true,
  hours: true,
  type: true,
  needsHelp: true,
  role: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  agentId: true,
  appointmentType: true,
  appointmentsCompleted: true,
  appointmentsTotal: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  agentId: true,
  action: true,
  details: true,
});

// Types d'insertion
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Table des scripts de campagnes
export const campaignScripts = pgTable("campaign_scripts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  campaignName: text("campaign_name").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // Catégorie (ex: HOT, PROSPECT, DIGI, etc.)
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // Pour l'ordre d'affichage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCampaignScriptSchema = createInsertSchema(campaignScripts).pick({
  title: true,
  campaignName: true,
  content: true,
  category: true,
  isActive: true,
  priority: true,
});

export type InsertCampaignScript = z.infer<typeof insertCampaignScriptSchema>;

// Types d'inférence
export type Agent = typeof agents.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type CampaignScript = typeof campaignScripts.$inferSelect;
