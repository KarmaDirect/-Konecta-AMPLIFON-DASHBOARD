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
      // Simulation de connexion pour la démo
      // Dans une vraie application, ce serait une requête API
      const mockUser: User = {
        id: 1,
        name: username,
        objectif: 10,
        currentCRM: 0,
        currentDigital: 0,
        role: username.toLowerCase().includes("admin") ? "ADMIN" : "AGENT",
      };

      // Sauvegarde dans localStorage
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
      setCurrentUser(mockUser);

      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${mockUser.name}!`,
      });
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
      // Simulation d'inscription pour la démo
      // Dans une vraie application, ce serait une requête API
      const mockUser: User = {
        id: 1,
        name: userData.name,
        objectif: 10,
        currentCRM: 0,
        currentDigital: 0,
        role: userData.role,
      };

      // Sauvegarde dans localStorage
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
      setCurrentUser(mockUser);

      toast({
        title: "Inscription réussie",
        description: `Bienvenue ${mockUser.name}!`,
      });
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      toast({
        title: "Erreur d'inscription",
        description: "Impossible de créer votre compte.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    toast({
      title: "Déconnexion réussie",
      description: "Vous avez été déconnecté avec succès.",
    });
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