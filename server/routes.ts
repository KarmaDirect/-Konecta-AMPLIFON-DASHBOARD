import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { insertAgentSchema, insertAchievementSchema } from "@shared/schema";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // API pour les agents
  app.get("/api/agents", async (req: Request, res: Response) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      console.error("Erreur lors de la récupération des agents:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des agents" });
    }
  });

  app.get("/api/agents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      const agent = await storage.getAgentById(id);
      if (!agent) {
        return res.status(404).json({ error: "Agent non trouvé" });
      }
      
      res.json(agent);
    } catch (error) {
      console.error("Erreur lors de la récupération de l'agent:", error);
      res.status(500).json({ error: "Erreur lors de la récupération de l'agent" });
    }
  });

  app.get("/api/agents/type/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type as "HOT" | "PROSPECT" | "DIGI";
      if (type !== "HOT" && type !== "PROSPECT" && type !== "DIGI") {
        return res.status(400).json({ error: "Type d'agent invalide" });
      }
      
      const agents = await storage.getAgentsByType(type);
      res.json(agents);
    } catch (error) {
      console.error("Erreur lors de la récupération des agents par type:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des agents par type" });
    }
  });

  app.get("/api/agents/crm/:status", async (req: Request, res: Response) => {
    try {
      const hasCRM = req.params.status === "true";
      const agents = await storage.getAgentsByCRMStatus(hasCRM);
      res.json(agents);
    } catch (error) {
      console.error("Erreur lors de la récupération des agents par statut CRM:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des agents par statut CRM" });
    }
  });

  app.get("/api/agents/digital/:status", async (req: Request, res: Response) => {
    try {
      const hasDigital = req.params.status === "true";
      const agents = await storage.getAgentsByDigitalStatus(hasDigital);
      res.json(agents);
    } catch (error) {
      console.error("Erreur lors de la récupération des agents par statut Digital:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des agents par statut Digital" });
    }
  });

  app.post("/api/agents", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(validatedData);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Erreur lors de la création de l'agent:", error);
        res.status(500).json({ error: "Erreur lors de la création de l'agent" });
      }
    }
  });

  app.put("/api/agents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      // Validation partielle des données
      const validatedData = insertAgentSchema.partial().parse(req.body);
      
      const agent = await storage.updateAgent(id, validatedData);
      if (!agent) {
        return res.status(404).json({ error: "Agent non trouvé" });
      }
      
      res.json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Erreur lors de la mise à jour de l'agent:", error);
        res.status(500).json({ error: "Erreur lors de la mise à jour de l'agent" });
      }
    }
  });

  app.delete("/api/agents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      const agent = await storage.getAgentById(id);
      if (!agent) {
        return res.status(404).json({ error: "Agent non trouvé" });
      }
      
      await storage.deleteAgent(id);
      res.status(204).end();
    } catch (error) {
      console.error("Erreur lors de la suppression de l'agent:", error);
      res.status(500).json({ error: "Erreur lors de la suppression de l'agent" });
    }
  });

  // API pour les réalisations
  app.get("/api/achievements", async (req: Request, res: Response) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      console.error("Erreur lors de la récupération des réalisations:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des réalisations" });
    }
  });

  app.get("/api/achievements/agent/:agentId", async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.agentId);
      if (isNaN(agentId)) {
        return res.status(400).json({ error: "ID agent invalide" });
      }
      
      const achievements = await storage.getAchievementsByAgentId(agentId);
      res.json(achievements);
    } catch (error) {
      console.error("Erreur lors de la récupération des réalisations de l'agent:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des réalisations de l'agent" });
    }
  });

  app.post("/api/achievements", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAchievementSchema.parse(req.body);
      const achievement = await storage.createAchievement(validatedData);
      res.status(201).json(achievement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Erreur lors de la création de la réalisation:", error);
        res.status(500).json({ error: "Erreur lors de la création de la réalisation" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
