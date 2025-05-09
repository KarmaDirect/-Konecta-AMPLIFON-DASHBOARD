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
      // Vérifier si un utilisateur avec ce nom d'utilisateur existe déjà dans localStorage
      const existingUsers = localStorage.getItem("registeredUsers");
      let users = existingUsers ? JSON.parse(existingUsers) : [];
      
      // Rechercher l'utilisateur par nom d'utilisateur
      const foundUser = users.find((user: any) => user.username === username);
      
      // Si aucun utilisateur n'est trouvé, rejeter la connexion
      if (!foundUser) {
        throw new Error("Utilisateur non trouvé");
      }
      
      // Vérifier que le mot de passe existe et correspond exactement
      if (!foundUser.password) {
        throw new Error("Compte invalide - veuillez vous réinscrire");
      }
      
      if (foundUser.password !== password) {
        throw new Error("Mot de passe incorrect");
      }
      
      // Créer l'objet utilisateur pour la session
      const loggedInUser: User = {
        id: foundUser.id || 1,
        name: foundUser.name || username,
        objectif: 10,
        currentCRM: 0,
        currentDigital: 0,
        role: foundUser.role || "AGENT",
      };

      // Sauvegarde dans localStorage
      localStorage.setItem("currentUser", JSON.stringify(loggedInUser));
      setCurrentUser(loggedInUser);

      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${loggedInUser.name}!`,
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
      
      // Enregistrement de l'utilisateur dans la liste des utilisateurs enregistrés
      const existingUsers = localStorage.getItem("registeredUsers");
      let users = existingUsers ? JSON.parse(existingUsers) : [];
      
      // Vérifier si l'utilisateur existe déjà
      const existingIndex = users.findIndex((user: any) => user.username === userData.username);
      
      if (existingIndex >= 0) {
        // Mise à jour de l'utilisateur existant
        users[existingIndex] = {
          username: userData.username,
          name: userData.name,
          role: userData.role,
          password: userData.password
        };
      } else {
        // Ajout du nouvel utilisateur
        users.push({
          username: userData.username,
          name: userData.name,
          role: userData.role,
          password: userData.password
        });
      }
      
      localStorage.setItem("registeredUsers", JSON.stringify(users));

      // Sauvegarde dans localStorage pour la session courante
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