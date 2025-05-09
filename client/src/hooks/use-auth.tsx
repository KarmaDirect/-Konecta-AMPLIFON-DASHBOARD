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

  // Charger l'utilisateur depuis le serveur au démarrage
  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté via une session
    fetch('/api/user')
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          // Si le statut est 401 (non autorisé), l'utilisateur n'est pas connecté
          if (response.status === 401) {
            return null;
          }
          throw new Error('Erreur lors de la récupération de l\'utilisateur');
        }
      })
      .then(user => {
        if (user) {
          setCurrentUser(user);
        }
      })
      .catch(error => {
        console.error("Erreur lors du chargement de l'utilisateur:", error);
      });
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Nom d'utilisateur ou mot de passe incorrect";
        throw new Error(errorMessage);
      }

      const user = await response.json();
      setCurrentUser(user);
      
      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${user.name}!`,
      });
    } catch (error) {
      console.error("Erreur de connexion:", error);
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Nom d'utilisateur ou mot de passe incorrect.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Erreur lors de l'inscription";
        throw new Error(errorMessage);
      }

      const user = await response.json();
      setCurrentUser(user);

      toast({
        title: "Inscription réussie",
        description: `Bienvenue ${user.name}!`,
      });
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
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la déconnexion");
      }

      setCurrentUser(null);
      
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
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