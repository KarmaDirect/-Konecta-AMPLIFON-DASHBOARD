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

// Table des agents
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  objectif: integer("objectif").notNull().default(20),
  currentCRM: integer("current_crm"),
  currentDigital: integer("current_digital"),
  hours: integer("hours").notNull().default(1),
  type: agentTypeEnum("agent_type").notNull().default("HOT"),
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

// Schemas pour les insertions
export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  objectif: true,
  currentCRM: true,
  currentDigital: true,
  hours: true,
  type: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  agentId: true,
  appointmentType: true,
  appointmentsCompleted: true,
  appointmentsTotal: true,
});

// Types d'insertion
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

// Types d'inférence
export type Agent = typeof agents.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
