import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@/lib/types";

type User = Agent;

type AuthContextType = {
  currentUser: User | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = LoginData & {
  name: string;
  role: "ADMIN" | "AGENT";
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Charger l'utilisateur depuis localStorage au démarrage
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Erreur lors du chargement de l'utilisateur:", error);
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // Utiliser l'API pour la connexion
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de la connexion");
      }
      
      const loggedInUser = await response.json();
      
      // Sauvegarde dans localStorage pour la session locale
      localStorage.setItem("currentUser", JSON.stringify(loggedInUser));
      setCurrentUser(loggedInUser);

      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${loggedInUser.name}!`,
      });
      
      // Diffuser la connexion via WebSocket
      const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
      socket.onopen = () => {
        socket.send(JSON.stringify({
          type: 'login',
          data: {
            userId: loggedInUser.id,
            username: loggedInUser.name
          }
        }));
        socket.close();
      };
      
    } catch (error) {
      console.error("Erreur de connexion:", error);
      toast({
        title: "Erreur de connexion",
        description: "Nom d'utilisateur ou mot de passe incorrect.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      // Utiliser l'API pour l'inscription
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de l'inscription");
      }
      
      const newUser = await response.json();
      
      // Sauvegarde dans localStorage pour la session locale
      localStorage.setItem("currentUser", JSON.stringify(newUser));
      setCurrentUser(newUser);

      toast({
        title: "Inscription réussie",
        description: `Bienvenue ${newUser.name}!`,
      });
      
      // Diffuser l'inscription via WebSocket
      const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
      socket.onopen = () => {
        socket.send(JSON.stringify({
          type: 'register',
          data: {
            userId: newUser.id,
            username: newUser.name
          }
        }));
        socket.close();
      };
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      toast({
        title: "Erreur d'inscription",
        description: error instanceof Error ? error.message : "Impossible de créer votre compte.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Appel à l'API pour la déconnexion
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de la déconnexion");
      }
      
      // Supprimer les données locales
      localStorage.removeItem("currentUser");
      setCurrentUser(null);
      
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
      
      // Diffuser la déconnexion via WebSocket
      const user = currentUser;
      if (user) {
        const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
        socket.onopen = () => {
          socket.send(JSON.stringify({
            type: 'logout',
            data: {
              userId: user.id,
              username: user.name
            }
          }));
          socket.close();
        };
      }
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
      toast({
        title: "Erreur de déconnexion",
        description: "Un problème est survenu lors de la déconnexion.",
        variant: "destructive",
      });
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}

export function useIsAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin;
}