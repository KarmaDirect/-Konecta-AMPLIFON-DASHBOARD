import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { insertAgentSchema, insertAchievementSchema } from "@shared/schema";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Configuration du serveur WebSocket
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Stockage des connexions WebSocket actives
  const clients = new Set<WebSocket>();
  
  // Fonction pour diffuser un message à tous les clients
  function broadcastMessage(message: any) {
    const messageString = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }
  
  // Middleware pour permettre la diffusion des modifications d'agents depuis les routes API
  app.use((req: any, res: Response, next: NextFunction) => {
    req.broadcast = broadcastMessage;
    next();
  });
  
  // Événements WebSocket
  wss.on('connection', (ws: WebSocket) => {
    console.log('Nouvelle connexion WebSocket établie');
    clients.add(ws);
    
    // Envoyer les agents actuels au nouveau client
    storage.getAgents().then(agents => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'init',
          data: { agents }
        }));
      }
    });
    
    // Gestionnaire de messages
    ws.on('message', async (message: string) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        
        // Traitement des différents types de messages
        if (parsedMessage.type === 'update_agent') {
          const { agentId, updates } = parsedMessage.data;
          
          // Validation et mise à jour dans la base de données
          if (agentId && updates) {
            const agent = await storage.updateAgent(agentId, updates);
            
            if (agent) {
              // Notifier tous les clients de la mise à jour
              broadcastMessage({
                type: 'agent_updated',
                data: { agent }
              });
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du traitement du message WebSocket:', error);
      }
    });
    
    // Gestionnaire de fermeture
    ws.on('close', () => {
      console.log('Connexion WebSocket fermée');
      clients.delete(ws);
    });
  });
  
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

  app.post("/api/agents", async (req: any, res: Response) => {
    try {
      const validatedData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(validatedData);
      
      // Notification en temps réel
      req.broadcast({
        type: 'agent_created',
        data: { agent }
      });
      
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

  app.put("/api/agents/:id", async (req: any, res: Response) => {
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
      
      // Notification en temps réel
      req.broadcast({
        type: 'agent_updated',
        data: { agent }
      });
      
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

  app.delete("/api/agents/:id", async (req: any, res: Response) => {
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
      
      // Notification en temps réel
      req.broadcast({
        type: 'agent_deleted',
        data: { agentId: id }
      });
      
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

  app.post("/api/achievements", async (req: any, res: Response) => {
    try {
      const validatedData = insertAchievementSchema.parse(req.body);
      const achievement = await storage.createAchievement(validatedData);
      
      // Notification en temps réel
      req.broadcast({
        type: 'achievement_created',
        data: { achievement }
      });
      
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

  return httpServer;
}
