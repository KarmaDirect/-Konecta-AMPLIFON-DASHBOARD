import { Agent } from "./agent";

type MessageHandlers = {
  [key: string]: (data: any) => void;
};

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: MessageHandlers = {};
  private reconnectInterval = 2000;
  private reconnectTimer: any = null;
  private url: string;

  constructor() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = `${protocol}//${window.location.host}/ws`;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(this.url);

    this.socket.addEventListener("open", () => {
      console.log("WebSocket connection established");
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        if (this.messageHandlers[type]) {
          this.messageHandlers[type](data);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    this.socket.addEventListener("close", () => {
      console.log("WebSocket connection closed. Reconnecting...");
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
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
}

// Singleton WebSocket client
export const wsClient = new WebSocketClient();

// Hook pour utiliser le WebSocket dans les composants React
export function useWebSocket() {
  return wsClient;
}