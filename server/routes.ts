import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { 
  insertAgentSchema, 
  insertAchievementSchema, 
  insertActivityLogSchema,
  insertCampaignScriptSchema,
  insertAlertThresholdSchema
} from "@shared/schema";
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
  
  // Objets pour suivre la présence des utilisateurs et les activités
  const onlineUsers = new Map<number, any>();
  const recentActivities: any[] = [];
  const maxActivities = 100; // Nombre maximum d'activités à stocker

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
        if (parsedMessage.type === 'presence') {
          // Mise à jour de la présence d'un utilisateur
          const userData = parsedMessage.data;
          onlineUsers.set(userData.userId, {
            ...userData,
            lastSeen: new Date()
          });
          
          // Diffuser la mise à jour de présence à tous les clients
          broadcastMessage({
            type: 'presence',
            data: userData
          });
          
          // Envoyer un résumé des utilisateurs en ligne au nouveau client
          ws.send(JSON.stringify({
            type: 'presence_summary',
            data: { users: Array.from(onlineUsers.values()) }
          }));
          
          // Envoyer l'historique des activités récentes
          ws.send(JSON.stringify({
            type: 'activity_history',
            data: { activities: recentActivities }
          }));
        } 
        else if (parsedMessage.type === 'user_offline') {
          // Utilisateur déconnecté
          const { userId } = parsedMessage.data;
          onlineUsers.delete(userId);
          
          // Informer tous les clients
          broadcastMessage({
            type: 'user_offline',
            data: { userId }
          });
        }
        else if (parsedMessage.type === 'activity') {
          // Nouvelle activité
          const activity = {
            ...parsedMessage.data,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          
          // Ajouter au début de la liste et limiter la taille
          recentActivities.unshift(activity);
          if (recentActivities.length > maxActivities) {
            recentActivities.pop();
          }
          
          // Diffuser l'activité à tous les clients
          broadcastMessage({
            type: 'activity',
            data: activity
          });
        }
        else if (parsedMessage.type === 'update_agent') {
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
  // Endpoint pour la demande d'aide
  app.put("/api/agents/:id/help", async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      const needsHelp = req.body.needsHelp === true;
      
      const agent = await storage.toggleHelpRequest(id, needsHelp);
      
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
      console.error("Erreur lors de la mise à jour de la demande d'aide:", error);
      res.status(500).json({ error: "Erreur lors de la mise à jour de la demande d'aide" });
    }
  });
  
  // API pour les logs d'activité
  app.get("/api/activity-logs", async (req: Request, res: Response) => {
    try {
      const logs = await storage.getActivityLogs();
      res.json(logs);
    } catch (error) {
      console.error("Erreur lors de la récupération des logs d'activité:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des logs d'activité" });
    }
  });
  
  app.get("/api/activity-logs/agent/:agentId", async (req: Request, res: Response) => {
    try {
      const agentId = parseInt(req.params.agentId);
      if (isNaN(agentId)) {
        return res.status(400).json({ error: "ID agent invalide" });
      }
      
      const logs = await storage.getActivityLogsByAgentId(agentId);
      res.json(logs);
    } catch (error) {
      console.error("Erreur lors de la récupération des logs d'activité de l'agent:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des logs d'activité de l'agent" });
    }
  });
  
  app.post("/api/activity-logs", async (req: any, res: Response) => {
    try {
      const validatedData = insertActivityLogSchema.parse(req.body);
      const log = await storage.createActivityLog(validatedData);
      
      // Notification en temps réel
      req.broadcast({
        type: 'activity_log_created',
        data: { log }
      });
      
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Erreur lors de la création du log d'activité:", error);
        res.status(500).json({ error: "Erreur lors de la création du log d'activité" });
      }
    }
  });
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

  // API pour les scripts de campagne
  // Route générale pour tous les scripts
  app.get("/api/campaign-scripts", async (req: Request, res: Response) => {
    try {
      const scripts = await storage.getCampaignScripts();
      res.json(scripts);
    } catch (error) {
      console.error("Erreur lors de la récupération des scripts:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des scripts" });
    }
  });

  // Routes spécifiques avec des segments de chemin fixes (doivent être AVANT les routes avec paramètres)
  app.get("/api/campaign-scripts/category/:category", async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      const scripts = await storage.getCampaignScriptsByCategory(category);
      res.json(scripts);
    } catch (error) {
      console.error("Erreur lors de la récupération des scripts par catégorie:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des scripts par catégorie" });
    }
  });

  app.get("/api/campaign-scripts/campaign/:campaignName", async (req: Request, res: Response) => {
    try {
      const campaignName = req.params.campaignName;
      const scripts = await storage.getCampaignScriptsByCampaignName(campaignName);
      res.json(scripts);
    } catch (error) {
      console.error("Erreur lors de la récupération des scripts par campagne:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des scripts par campagne" });
    }
  });

  // Route par ID (doit être APRÈS les routes spécifiques)
  app.get("/api/campaign-scripts/:id([0-9]+)", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      const script = await storage.getCampaignScriptById(id);
      if (!script) {
        return res.status(404).json({ error: "Script non trouvé" });
      }
      
      res.json(script);
    } catch (error) {
      console.error("Erreur lors de la récupération du script:", error);
      res.status(500).json({ error: "Erreur lors de la récupération du script" });
    }
  });

  app.post("/api/campaign-scripts", async (req: any, res: Response) => {
    try {
      const validatedData = insertCampaignScriptSchema.parse(req.body);
      const script = await storage.createCampaignScript(validatedData);
      
      // Notification en temps réel
      req.broadcast({
        type: 'campaign_script_created',
        data: { script }
      });
      
      res.status(201).json(script);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Erreur lors de la création du script:", error);
        res.status(500).json({ error: "Erreur lors de la création du script" });
      }
    }
  });

  app.put("/api/campaign-scripts/:id", async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      // Validation partielle des données
      const validatedData = insertCampaignScriptSchema.partial().parse(req.body);
      
      const script = await storage.updateCampaignScript(id, validatedData);
      if (!script) {
        return res.status(404).json({ error: "Script non trouvé" });
      }
      
      // Notification en temps réel
      req.broadcast({
        type: 'campaign_script_updated',
        data: { script }
      });
      
      res.json(script);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Erreur lors de la mise à jour du script:", error);
        res.status(500).json({ error: "Erreur lors de la mise à jour du script" });
      }
    }
  });

  app.delete("/api/campaign-scripts/:id", async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      const script = await storage.getCampaignScriptById(id);
      if (!script) {
        return res.status(404).json({ error: "Script non trouvé" });
      }
      
      await storage.deleteCampaignScript(id);
      
      // Notification en temps réel
      req.broadcast({
        type: 'campaign_script_deleted',
        data: { scriptId: id }
      });
      
      res.status(204).end();
    } catch (error) {
      console.error("Erreur lors de la suppression du script:", error);
      res.status(500).json({ error: "Erreur lors de la suppression du script" });
    }
  });

  // Routes pour les alertes et notifications
  app.get("/api/alert-thresholds", async (req: Request, res: Response) => {
    try {
      const thresholds = await storage.getAlertThresholds();
      res.json(thresholds);
    } catch (error) {
      console.error("Erreur lors de la récupération des seuils d'alerte:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des seuils d'alerte" });
    }
  });

  app.get("/api/alert-thresholds/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "ID utilisateur invalide" });
      }
      
      const thresholds = await storage.getAlertThresholdsByUserId(userId);
      res.json(thresholds);
    } catch (error) {
      console.error("Erreur lors de la récupération des seuils d'alerte par utilisateur:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des seuils d'alerte par utilisateur" });
    }
  });

  app.get("/api/alert-thresholds/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      const threshold = await storage.getAlertThresholdById(id);
      if (!threshold) {
        return res.status(404).json({ error: "Seuil d'alerte non trouvé" });
      }
      
      res.json(threshold);
    } catch (error) {
      console.error("Erreur lors de la récupération du seuil d'alerte:", error);
      res.status(500).json({ error: "Erreur lors de la récupération du seuil d'alerte" });
    }
  });

  app.post("/api/alert-thresholds", async (req: any, res: Response) => {
    try {
      const validatedData = insertAlertThresholdSchema.parse(req.body);
      const threshold = await storage.createAlertThreshold(validatedData);
      
      // Notification en temps réel
      req.broadcast({
        type: 'alert_threshold_created',
        data: { threshold }
      });
      
      res.status(201).json(threshold);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Erreur lors de la création du seuil d'alerte:", error);
        res.status(500).json({ error: "Erreur lors de la création du seuil d'alerte" });
      }
    }
  });

  app.put("/api/alert-thresholds/:id", async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      // Validation partielle des données
      const validatedData = insertAlertThresholdSchema.partial().parse(req.body);
      
      const threshold = await storage.updateAlertThreshold(id, validatedData);
      if (!threshold) {
        return res.status(404).json({ error: "Seuil d'alerte non trouvé" });
      }
      
      // Notification en temps réel
      req.broadcast({
        type: 'alert_threshold_updated',
        data: { threshold }
      });
      
      res.json(threshold);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Erreur lors de la mise à jour du seuil d'alerte:", error);
        res.status(500).json({ error: "Erreur lors de la mise à jour du seuil d'alerte" });
      }
    }
  });

  app.delete("/api/alert-thresholds/:id", async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
      }
      
      const threshold = await storage.getAlertThresholdById(id);
      if (!threshold) {
        return res.status(404).json({ error: "Seuil d'alerte non trouvé" });
      }
      
      await storage.deleteAlertThreshold(id);
      
      // Notification en temps réel
      req.broadcast({
        type: 'alert_threshold_deleted',
        data: { thresholdId: id }
      });
      
      res.status(204).end();
    } catch (error) {
      console.error("Erreur lors de la suppression du seuil d'alerte:", error);
      res.status(500).json({ error: "Erreur lors de la suppression du seuil d'alerte" });
    }
  });

  // Route pour vérifier les alertes d'un agent
  app.get("/api/agents/:id/check-alerts/:type", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID agent invalide" });
      }

      const type = req.params.type;
      if (type !== "CRM" && type !== "Digital") {
        return res.status(400).json({ error: "Type d'alerte invalide. Doit être 'CRM' ou 'Digital'" });
      }
      
      const alerts = await storage.checkAlerts(id, type);
      res.json(alerts);
    } catch (error) {
      console.error("Erreur lors de la vérification des alertes:", error);
      res.status(500).json({ error: "Erreur lors de la vérification des alertes" });
    }
  });

  return httpServer;
}
