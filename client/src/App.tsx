import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { TeamPresenceProvider } from "@/hooks/use-team-presence";
import { useRealtimeAgents } from "@/hooks/use-realtime-agents";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import GrandEcranLocal from "@/pages/GrandEcranLocal";
import ScriptsPage from "@/pages/ScriptsPage";
import AuthPage from "@/pages/auth-page";

// Composant pour connecter les WebSockets au démarrage
function WebSocketConnector() {
  const { currentUser } = useAuth();
  
  // Utiliser le hook pour s'abonner aux événements en temps réel
  useRealtimeAgents();
  
  // Effet pour connecter le WebSocket avec l'utilisateur connecté
  useEffect(() => {
    import('./lib/websocket').then(({ wsClient }) => {
      if (currentUser) {
        console.log('Mise à jour de l\'utilisateur dans WebSocketClient:', currentUser);
        wsClient.setCurrentUser(currentUser);
      }
    });
  }, [currentUser]);
  
  return null;
}

// Composant de barre de navigation (vide pour le moment)
function NavigationBar() {
  const { currentUser } = useAuth();
  
  return (
    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-900 to-blue-900 text-white shadow-md sticky top-0 z-10">
      <div className="flex items-center space-x-1">
        {/* Logo supprimé */}
        
        {currentUser && (
          <>
            <a 
              href="/" 
              className="px-3 py-2 rounded-md hover:bg-blue-800 transition-colors"
            >
              Dashboard
            </a>
            <a 
              href="/scripts" 
              className="px-3 py-2 rounded-md hover:bg-blue-800 transition-colors"
            >
              Scripts
            </a>
          </>
        )}
      </div>
      
      <div className="flex flex-col items-center">
        <div className="font-bold text-xl">POINT RDV</div>
        <div className="text-xs text-gray-300">by hatim</div>
      </div>
      
      <div className="flex items-center space-x-2">
        {currentUser ? (
          <div className="flex space-x-2">
            <a 
              href="/grand-ecran-local" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center text-lg font-medium"
            >
              GRAND ÉCRAN 🖥️
            </a>
          </div>
        ) : (
          <a 
            href="/auth" 
            className="bg-blue-600 px-3 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-lg"
          >
            Connexion
          </a>
        )}
        {/* Logo supprimé */}
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/scripts" component={ScriptsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/grand-ecran-local" component={GrandEcranLocal} />
      <Route path="/grand-ecran" component={GrandEcranLocal} />
      <Route path="/" component={() => <ProtectedRoute path="/" component={Dashboard} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TeamPresenceProvider>
          <TooltipProvider>
            <WebSocketConnector />
            <NavigationBar />
            <Toaster />
            <Router />
          </TooltipProvider>
        </TeamPresenceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
