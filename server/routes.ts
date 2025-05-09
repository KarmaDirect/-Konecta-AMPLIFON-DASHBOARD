import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { 
  insertAgentSchema, 
  insertAchievementSchema, 
  insertActivityLogSchema,
  insertCampaignScriptSchema,
  insertAlertThresholdSchema,
  insertUserSchema
} from "@shared/schema";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";

// Type augmenté pour Request avec session
interface RequestWithSession extends Request {
  session: session.Session & {
    userId?: number;
  };
  broadcast?: (message: any) => void;
}

// Fonctions utilitaires pour le hachage et la vérification de mot de passe
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(storedPassword: string, suppliedPassword: string): Promise<boolean> {
  try {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedBuf = Buffer.from(hashedPassword, "hex");
    const suppliedBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Erreur lors de la vérification du mot de passe:", error);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Configuration du serveur WebSocket
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true 
  });
  
  // Stockage des connexions WebSocket actives
  const clients = new Set<WebSocket>();
  
  // Map des WebSockets associés à l'ID utilisateur (pour suivi de session)
  const userSockets = new Map<number, Set<WebSocket>>();
  
  // Fonction pour associer un WebSocket à un utilisateur authentifié
  const addSocketToUser = (userId: number, socket: WebSocket) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    // Marquer le socket comme authentifié
    (socket as any).isAuthenticated = true;
    (socket as any).userId = userId;
    
    // Stocker le socket pour cet utilisateur
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set<WebSocket>());
    }
    userSockets.get(userId)?.add(socket);
    
    console.log(`WebSocket associé à l'utilisateur ${userId}, nombre de sockets: ${userSockets.get(userId)?.size}`);
  };
  
  function broadcastMessage(message: any) {
    const messageString = JSON.stringify(message);
    let activeCount = 0;
    
    // Utiliser un délai minimal pour éviter les envois multiples simultanés 
    // qui peuvent causer des duplications côté client
    setTimeout(() => {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageString);
          activeCount++;
        }
      });
      console.log(`Message diffusé à ${activeCount} clients WebSocket actifs`);
    }, 5);
  }
  
  // Middleware pour permettre la diffusion des modifications d'agents depuis les routes API
  app.use((req: any, res: Response, next: NextFunction) => {
    req.broadcast = broadcastMessage;
    next();
  });
  
  // Routes d'authentification
  app.post("/api/register", async (req: RequestWithSession, res: Response) => {
    try {
      const { username, password, name, role } = req.body;
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris" });
      }
      
      // Hacher le mot de passe
      const hashedPassword = await hashPassword(password);
      
      // Créer l'utilisateur
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        role
      });
      
      // Définir l'utilisateur dans la session
      req.session.userId = user.id;
      
      // Retourner l'utilisateur sans le mot de passe
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
  });
  
  app.post("/api/login", async (req: RequestWithSession, res: Response) => {
    try {
      const { username, password } = req.body;
      
      console.log("Tentative de connexion pour:", username);
      
      // Vérifier si l'utilisateur existe
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log("Utilisateur non trouvé:", username);
        return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
      }
      
      // Vérifier le mot de passe
      const isPasswordValid = await verifyPassword(user.password, password);
      if (!isPasswordValid) {
        console.log("Mot de passe invalide pour:", username);
        return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
      }
      
      // Définir l'utilisateur dans la session et sauvegarder explicitement
      req.session.userId = user.id;
      
      // Enregistrer la session de manière explicite
      req.session.save((err) => {
        if (err) {
          console.error("Erreur lors de la sauvegarde de la session:", err);
          return res.status(500).json({ error: "Erreur lors de la connexion" });
        }
        
        // Retourner l'utilisateur sans le mot de passe
        const { password: _, ...userWithoutPassword } = user;
        console.log("Connexion réussie pour l'utilisateur:", user.id, user.username);
        console.log("Session ID:", req.sessionID);
        
        // Associer toutes les connexions WebSocket actives de cet utilisateur
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            addSocketToUser(user.id, client);
          }
        });
        
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      res.status(500).json({ error: "Erreur lors de la connexion" });
    }
  });
  
  app.post("/api/logout", (req: RequestWithSession, res: Response) => {
    try {
      // Supprimer la session
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Erreur lors de la déconnexion:", err);
          return res.status(500).json({ error: "Erreur lors de la déconnexion" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      res.status(500).json({ error: "Erreur lors de la déconnexion" });
    }
  });
  
  app.get("/api/user", async (req: RequestWithSession, res: Response) => {
    try {
      // Vérifier si l'utilisateur est connecté
      console.log("Session ID:", req.sessionID);
      console.log("Session:", req.session);
      
      const userId = req.session.userId;
      if (!userId) {
        console.log("Session trouvée mais pas d'userId");
        return res.status(401).json({ error: "Non authentifié" });
      }
      
      console.log("Utilisateur trouvé dans la session, ID:", userId);
      
      // Récupérer l'utilisateur
      const user = await storage.getUser(userId);
      if (!user) {
        console.log("Utilisateur non trouvé en base de données, ID:", userId);
        return res.status(401).json({ error: "Utilisateur non trouvé" });
      }
      
      console.log("Utilisateur récupéré avec succès:", user.id, user.username);
      
      // Retourner l'utilisateur sans le mot de passe
      const { password: _, ...userWithoutPassword } = user;
      
      // Associer toutes les connexions WebSocket actives à cet utilisateur
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          addSocketToUser(user.id, client);
        }
      });
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      res.status(500).json({ error: "Erreur lors de la récupération de l'utilisateur" });
    }
  });
  
  // Objets pour suivre la présence des utilisateurs et les activités
  const onlineUsers = new Map<number, any>();
  const recentActivities: any[] = [];
  const maxActivities = 100; // Nombre maximum d'activités à stocker

  // Événements WebSocket
  wss.on('connection', (ws: WebSocket, req: Request) => {
    console.log('Nouvelle connexion WebSocket établie');
    clients.add(ws);
    
    // Ajouter des propriétés personnalisées à l'objet WebSocket
    (ws as any).isAuthenticated = false;
    (ws as any).userId = null;
    
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
        
        // Vérification d'authentification
        if (parsedMessage.type === 'auth_check') {
          console.log('Auth check reçu de WebSocket');
          
          // Vérifier si l'utilisateur est déjà authentifié sur ce socket
          const isAuthenticated = (ws as any).isAuthenticated;
          const userId = (ws as any).userId;
          
          // Si le socket n'est pas encore authentifié, vérifier s'il y a une session valide
          // en utilisant la cookie envoyée avec la requête WebSocket
          if (!isAuthenticated && req.headers.cookie) {
            // Nous utilisons ici un hack pour accéder à la session depuis le WebSocket
            // La fonction est déjà implémentée dans le système et associe les sockets aux utilisateurs
            // lors des requêtes /api/user et /api/login
            
            // Si le socket n'est pas encore authentifié mais que le client a des cookies,
            // indiquer au client qu'il devrait vérifier son état d'authentification via HTTP
            console.log('Le client a des cookies, lui demander de vérifier son authentification via HTTP');
          }
          
          // Répondre avec l'état d'authentification actuel
          ws.send(JSON.stringify({
            type: 'auth_status',
            data: { 
              isAuthenticated: isAuthenticated,
              userId: userId,
              hasSessionCookies: !!req.headers.cookie
            }
          }));
        }
        
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
  
  // Route spéciale pour le grand écran qui renvoie toutes les données nécessaires en un seul appel
  app.get("/api/grand-ecran-data", async (req: Request, res: Response) => {
    try {
      const [allAgents, crmAgents, digitalAgents] = await Promise.all([
        storage.getAgents(),
        storage.getAgentsByCRMStatus(true),
        storage.getAgentsByDigitalStatus(true)
      ]);
      
      // Calculer les métriques au niveau du serveur
      const totalCRMObjectif = crmAgents.reduce((sum, agent) => sum + agent.objectif, 0);
      const totalDigitalObjectif = digitalAgents.reduce((sum, agent) => sum + agent.objectif, 0);
      
      const totalCRMRealises = crmAgents.reduce((sum, agent) => {
        const currentCRM = agent.currentCRM || 0;
        const realises = currentCRM <= 0 ? agent.objectif : (agent.objectif - currentCRM);
        return sum + realises;
      }, 0);
      
      const totalDigitalRealises = digitalAgents.reduce((sum, agent) => {
        const currentDigital = agent.currentDigital || 0;
        const realises = currentDigital <= 0 ? agent.objectif : (agent.objectif - currentDigital);
        return sum + realises;
      }, 0);
      
      const totalCRMBonus = crmAgents.reduce((sum, agent) => {
        const currentCRM = agent.currentCRM || 0;
        return sum + (currentCRM < 0 ? Math.abs(currentCRM) : 0);
      }, 0);
      
      const totalDigitalBonus = digitalAgents.reduce((sum, agent) => {
        const currentDigital = agent.currentDigital || 0;
        return sum + (currentDigital < 0 ? Math.abs(currentDigital) : 0);
      }, 0);
      
      // Trier les agents par performance
      const sortedCrmAgents = [...crmAgents].sort((a, b) => {
        const aRatio = (a.currentCRM || 0) / a.objectif;
        const bRatio = (b.currentCRM || 0) / b.objectif;
        return bRatio - aRatio;
      });
      
      const sortedDigitalAgents = [...digitalAgents].sort((a, b) => {
        const aRatio = (a.currentDigital || 0) / a.objectif;
        const bRatio = (b.currentDigital || 0) / b.objectif;
        return bRatio - aRatio;
      });
      
      // Top 5 agents
      const topCRMAgents = sortedCrmAgents.slice(0, 5);
      const topDigitalAgents = sortedDigitalAgents.slice(0, 5);
      
      // Objectifs totaux de campagne (ces valeurs sont hardcodées car elles sont définies manuellement)
      // Ce sont les mêmes valeurs que celles utilisées dans Dashboard.tsx (rdvCRMTotal et rdvDigitalTotal)
      const crmCampaignTarget = 100; // Objectif total de la campagne CRM
      const digitalCampaignTarget = 50; // Objectif total de la campagne Digital
      
      res.json({
        timestamp: new Date().toISOString(),
        allAgents,
        crmAgents,
        digitalAgents,
        // Ajout des objectifs totaux de campagne à l'API
        crmTarget: crmCampaignTarget,
        digitalTarget: digitalCampaignTarget,
        topAgents: {
          crm: topCRMAgents,
          digital: topDigitalAgents
        },
        stats: {
          crm: {
            totalAgents: crmAgents.length,
            totalObjectif: totalCRMObjectif, // Somme des objectifs individuels des agents
            campaignObjectif: crmCampaignTarget, // Objectif de la campagne
            totalRealises: totalCRMRealises,
            totalBonus: totalCRMBonus,
            restants: totalCRMObjectif - totalCRMRealises,
            completionRate: totalCRMObjectif ? Math.round((totalCRMRealises / totalCRMObjectif) * 100) : 0,
            // Taux par rapport à l'objectif campagne
            campaignCompletionRate: crmCampaignTarget ? Math.round((totalCRMRealises / crmCampaignTarget) * 100) : 0
          },
          digital: {
            totalAgents: digitalAgents.length,
            totalObjectif: totalDigitalObjectif, // Somme des objectifs individuels des agents
            campaignObjectif: digitalCampaignTarget, // Objectif de la campagne
            totalRealises: totalDigitalRealises,
            totalBonus: totalDigitalBonus,
            restants: totalDigitalObjectif - totalDigitalRealises,
            completionRate: totalDigitalObjectif ? Math.round((totalDigitalRealises / totalDigitalObjectif) * 100) : 0,
            // Taux par rapport à l'objectif campagne
            campaignCompletionRate: digitalCampaignTarget ? Math.round((totalDigitalRealises / digitalCampaignTarget) * 100) : 0
          }
        }
      });
    } catch (error) {
      console.error("Erreur pour grand-ecran-data:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des données pour le grand écran" });
    }
  });

  app.post("/api/agents", async (req: any, res: Response) => {
    try {
      const validatedData = insertAgentSchema.parse(req.body);
      console.log("Création d'un nouvel agent avec les données:", validatedData);
      
      const agent = await storage.createAgent(validatedData);
      console.log("Agent créé avec succès, ID:", agent.id);
      
      // Notification en temps réel à tous les clients via broadcast uniquement
      // Utiliser un délai pour éviter les duplications
      setTimeout(() => {
        const message = {
          type: 'agent_created',
          data: { agent }
        };
        
        console.log("Diffusion de l'événement 'agent_created' à tous les clients");
        req.broadcast(message);
      }, 50); // Délai court de 50ms pour éviter les duplications
      
      // On répond au client original
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

  // Réinitialisation de tous les agents
  app.post("/api/agents/reset-all", async (req: any, res: Response) => {
    try {
      // Récupérer tous les agents
      const agents = await storage.getAgents();
      
      // Mettre à jour chaque agent
      const updatedAgents = await Promise.all(
        agents.map(async (agent) => {
          // Réinitialiser CRM et Digital aux valeurs d'objectif
          const updates = {
            currentCRM: agent.currentCRM !== null ? agent.objectif : null,
            currentDigital: agent.currentDigital !== null ? agent.objectif : null
          };
          
          return await storage.updateAgent(agent.id, updates);
        })
      );
      
      // Filtrer les agents qui n'ont pas été mis à jour (undefined)
      const successfullyUpdated = updatedAgents.filter(Boolean) as any[];
      
      // Notification en temps réel pour chaque agent
      successfullyUpdated.forEach(agent => {
        req.broadcast({
          type: 'agent_updated',
          data: { agent }
        });
      });
      
      res.json(successfullyUpdated);
    } catch (error) {
      console.error("Erreur lors de la réinitialisation des agents:", error);
      res.status(500).json({ error: "Erreur lors de la réinitialisation des agents" });
    }
  });

  // Répartition des RDV
  app.post("/api/agents/dispatch-rdv", async (req: any, res: Response) => {
    try {
      const { type, rdvTotal } = req.body;
      
      if (!type || !['currentCRM', 'currentDigital'].includes(type)) {
        return res.status(400).json({ error: "Type de RDV invalide" });
      }
      
      if (typeof rdvTotal !== 'number' || rdvTotal <= 0) {
        return res.status(400).json({ error: "Nombre de RDV invalide" });
      }
      
      // Récupérer les agents concernés
      const allAgents = await storage.getAgents();
      const filteredAgents = allAgents.filter(agent => {
        return type === 'currentCRM' 
          ? agent.currentCRM !== null 
          : agent.currentDigital !== null;
      });
      const agentCount = filteredAgents.length;
      
      if (agentCount === 0) {
        return res.status(400).json({ 
          error: `Aucun agent ${type === "currentCRM" ? "CRM" : "Digital"} disponible`
        });
      }
      
      // Calcul de la répartition
      const rdvPerAgent = Math.floor(rdvTotal / agentCount);
      const remainder = rdvTotal % agentCount;
      
      // Mise à jour de chaque agent
      const updatedAgents = await Promise.all(
        allAgents.map(async (a, index) => {
          // Vérifier si l'agent a la propriété demandée
          const hasProperty = type === 'currentCRM' 
            ? a.currentCRM !== null 
            : a.currentDigital !== null;
            
          if (!hasProperty) return a;
          
          // Trouver l'index de cet agent dans la liste filtrée
          const filteredIndex = filteredAgents.findIndex(fa => fa.id === a.id);
          const bonus = filteredIndex < remainder ? 1 : 0;
          const newObjectif = rdvPerAgent + bonus;
          
          // Calcul du nombre de RDV déjà pris par cet agent
          const currentRdvValue = type === 'currentCRM' 
            ? (a.currentCRM as number) 
            : (a.currentDigital as number);
          const originalObjectif = a.objectif;
          
          // Si l'agent a déjà des RDV pris (compteur < objectif initial ou négatif)
          let rdvPris = 0;
          if (currentRdvValue < 0) {
            // RDV bonus : tous les RDV pris plus les RDV bonus
            rdvPris = originalObjectif + Math.abs(currentRdvValue);
          } else if (currentRdvValue < originalObjectif) {
            // RDV normaux : différence entre l'objectif et le compteur actuel
            rdvPris = originalObjectif - currentRdvValue;
          }
          
          // Le nouveau compteur est le nouvel objectif moins les RDV déjà pris
          // Si l'agent a pris plus que son nouvel objectif, il aura un compteur négatif (bonus)
          const newCounterValue = Math.max(newObjectif - rdvPris, -Math.abs(rdvPris - newObjectif));
          
          // Créer l'objet de mise à jour
          const updates: any = {
            objectif: newObjectif
          };
          
          // Ajouter la propriété dynamique
          updates[type] = newCounterValue;
          
          const updatedAgent = await storage.updateAgent(a.id, updates);
          return updatedAgent || a;
        })
      );
      
      // Notification en temps réel pour chaque agent
      updatedAgents.forEach(agent => {
        const hasProperty = type === 'currentCRM' 
          ? agent.currentCRM !== null 
          : agent.currentDigital !== null;
          
        if (hasProperty) {
          req.broadcast({
            type: 'agent_updated',
            data: { agent }
          });
        }
      });
      
      res.json(updatedAgents);
    } catch (error) {
      console.error("Erreur lors de la répartition des RDV:", error);
      res.status(500).json({ error: "Erreur lors de la répartition des RDV" });
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
