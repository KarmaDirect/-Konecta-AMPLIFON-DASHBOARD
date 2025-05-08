import React, { createContext, ReactNode, useContext, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Agent } from '@/lib/types';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Types pour l'authentification
type User = Agent;

type AuthContextType = {
  currentUser: User | null;
  isAdmin: boolean;
  loginMutation: ReturnType<typeof useLoginMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
  logout: () => void;
};

// Données pour la connexion
type LoginData = {
  username: string;
  password: string;
};

// Données pour l'inscription
type RegisterData = LoginData & {
  name: string;
  role: "ADMIN" | "AGENT";
};

// Création du contexte
const AuthContext = createContext<AuthContextType | null>(null);

// Hook personnalisé pour la mutation de connexion
function useLoginMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: {
          "Content-Type": "application/json"
        }
      });
      return response as User;
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Nom d'utilisateur ou mot de passe incorrect",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  });
}

// Hook personnalisé pour la mutation d'inscription
function useRegisterMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (userData: RegisterData) => {
      const response = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(userData),
        headers: {
          "Content-Type": "application/json"
        }
      });
      return response as User;
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Impossible de créer le compte",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  });
}

// Provider pour fournir le contexte d'authentification à l'application
export function AuthProvider({ children }: { children: ReactNode }) {
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  
  // Pour l'instant, on simule un utilisateur en dur
  const mockUser: User = {
    id: 1,
    name: "Admin User",
    objectif: 20,
    currentCRM: 5,
    currentDigital: 10,
    hours: 8,
    type: "HOT",
    role: "ADMIN",
    needsHelp: false
  };

  // État pour simuler la requête API
  const [isMockLoading, setIsMockLoading] = useState(true);
  
  // Simuler un chargement initial
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsMockLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Fonction pour déconnecter l'utilisateur
  const logout = async () => {
    try {
      // Simuler une déconnexion
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  // Si le chargement est en cours, on peut afficher un loader
  if (isMockLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Chargement...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser: mockUser,
        isAdmin: mockUser.role === "ADMIN",
        loginMutation,
        registerMutation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook pour utiliser le contexte d'authentification
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}

// Hook simplifié pour vérifier si l'utilisateur est admin
export function useIsAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin;
}