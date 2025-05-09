import { Agent } from "./agent";

// Interface utilisateur simplifiée
export interface User {
  id: number;
  name: string;
  role?: string;
}

type MessageHandlers = {
  [key: string]: (data: any) => void;
};

export interface OnlineUser {
  userId: number;
  userName: string;
  lastActive: string;
  currentPage?: string;
  status: 'online' | 'away' | 'busy';
}

export interface ActivityItem {
  id: string;
  userId: number;
  userName: string;
  action: string;
  target?: string;
  timestamp: string;
  details?: any;
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: MessageHandlers = {};
  private reconnectInterval = 2000;
  private reconnectTimer: any = null;
  private url: string;
  private currentUser: User | null = null;
  private heartbeatInterval: any = null;
  private lastActivityTime: number = Date.now();
  private currentStatus: 'online' | 'away' | 'busy' = 'online';
  private currentPage: string = window.location.pathname;
  
  // Système de déduplication des événements WebSocket
  private processedEvents: Map<string, number> = new Map();

  constructor() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = `${protocol}//${window.location.host}/ws`;
    
    // Surveiller l'activité de l'utilisateur
    document.addEventListener('mousemove', this.updateActivity);
    document.addEventListener('keydown', this.updateActivity);
    document.addEventListener('click', this.updateActivity);
    
    // Surveiller les changements de page
    window.addEventListener('popstate', this.handlePageChange);
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user && this.socket?.readyState === WebSocket.OPEN) {
      this.sendPresence();
    }
  }

  private updateActivity = () => {
    this.lastActivityTime = Date.now();
    
    // Si l'utilisateur était en statut "away", le remettre en "online"
    if (this.currentStatus === 'away') {
      this.currentStatus = 'online';
      this.sendPresence();
    }
  }

  private handlePageChange = () => {
    this.currentPage = window.location.pathname;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendPresence();
    }
  }

  setStatus(status: 'online' | 'away' | 'busy') {
    this.currentStatus = status;
    this.sendPresence();
  }

  private sendPresence() {
    if (!this.currentUser) return;
    
    this.send('presence', {
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      status: this.currentStatus,
      currentPage: this.currentPage,
      lastActive: new Date().toISOString()
    });
  }

  private startHeartbeat() {
    // Envoyer une mise à jour de présence toutes les 30 secondes
    this.heartbeatInterval = setInterval(() => {
      // Vérifier si l'utilisateur est inactif depuis plus de 2 minutes
      const inactiveTime = Date.now() - this.lastActivityTime;
      if (inactiveTime > 2 * 60 * 1000 && this.currentStatus === 'online') {
        this.currentStatus = 'away';
      }
      
      this.sendPresence();
    }, 30000); // 30 secondes
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    // Annuler toute tentative de reconnexion existante
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Créer une nouvelle connexion WebSocket
    this.socket = new WebSocket(this.url);
    
    // Gestion de l'événement d'ouverture
    this.socket.addEventListener("open", () => {
      console.log("WebSocket connection established");
      
      // Démarrer les heartbeats pour la présence
      this.startHeartbeat();
      
      // Envoyer immédiatement la présence si un utilisateur est connecté
      if (this.currentUser) {
        this.sendPresence();
      }
      
      // Vérifier l'état de la session en envoyant un message d'authentification
      this.send('auth_check', { timestamp: Date.now() });
    });

    this.socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;
        
        // Déduplication des événements pour les types critiques
        if (type === 'agent_created' || type === 'agent_updated' || type === 'agent_deleted') {
          // Créer une clé unique basée sur le type et l'ID
          const id = type === 'agent_deleted' ? data.agentId : data.agent?.id;
          if (id) {
            const eventKey = `${type}_${id}`;
            const now = Date.now();
            const lastProcessed = this.processedEvents.get(eventKey);
            
            // Si le même événement a été traité dans les 2 dernières secondes, on l'ignore
            if (lastProcessed && now - lastProcessed < 2000) {
              console.log('Événement déjà traité récemment, ignoré:', type, id);
              return;
            }
            
            // Marquer cet événement comme traité
            this.processedEvents.set(eventKey, now);
            
            // Nettoyage périodique des événements anciens
            if (this.processedEvents.size > 100) {
              const cutoff = now - 60000; // Supprimer les événements de plus d'une minute
              for (const [key, timestamp] of this.processedEvents.entries()) {
                if (timestamp < cutoff) {
                  this.processedEvents.delete(key);
                }
              }
            }
          }
        }

        if (this.messageHandlers[type]) {
          this.messageHandlers[type](data);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    this.socket.addEventListener("close", () => {
      console.log("WebSocket connection closed. Reconnecting...");
      this.stopHeartbeat();
      
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectInterval);
      }
    });

    this.socket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
      this.socket?.close();
    });
  }

  disconnect() {
    // Envoyer un message de déconnexion si possible
    if (this.socket?.readyState === WebSocket.OPEN && this.currentUser) {
      this.send('user_offline', { userId: this.currentUser.id });
    }
    
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Supprimer les écouteurs d'événements
    document.removeEventListener('mousemove', this.updateActivity);
    document.removeEventListener('keydown', this.updateActivity);
    document.removeEventListener('click', this.updateActivity);
    window.removeEventListener('popstate', this.handlePageChange);
  }

  send(type: string, data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    } else {
      console.warn("WebSocket not connected. Message not sent:", { type, data });
    }
  }

  on<T = any>(messageType: string, handler: (data: T) => void) {
    this.messageHandlers[messageType] = handler as any;
  }

  off(messageType: string) {
    delete this.messageHandlers[messageType];
  }

  // Méthodes spécifiques pour les agents
  updateAgent(agentId: number, updates: Partial<Agent>) {
    this.send("update_agent", { agentId, updates });
  }
  
  // Méthodes pour le système de collaboration
  sendActivity(action: string, target?: string, details?: any) {
    if (!this.currentUser) return;
    
    this.send('activity', {
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      action,
      target,
      timestamp: new Date().toISOString(),
      details
    });
  }
}

// Singleton WebSocket client
export const wsClient = new WebSocketClient();

// Hook pour utiliser le WebSocket dans les composants React
export function useWebSocket() {
  return wsClient;
}