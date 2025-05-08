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
import GrandEcran from "@/pages/GrandEcran";
import GrandEcranSimple from "@/pages/GrandEcranSimple";
import ScriptsPage from "@/pages/ScriptsPage";
import AuthPage from "@/pages/auth-page";

// Composant pour connecter les WebSockets au démarrage
function WebSocketConnector() {
  useRealtimeAgents();
  return null;
}

// Composant de barre de navigation (vide pour le moment)
function NavigationBar() {
  const { currentUser } = useAuth();
  
  return (
    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-900 to-blue-900 text-white shadow-md sticky top-0 z-10">
      <div className="flex items-center space-x-1">
        <img src="/attached_assets/Konecta-Logo.png" alt="Konecta" className="h-8 bg-white p-1 rounded mr-2" />
        
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
      
      <div className="font-bold text-xl hidden md:block">
        Mission RDV Master
      </div>
      
      <div className="flex items-center space-x-2">
        {currentUser ? (
          <a 
            href="/grand-ecran" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center"
          >
            <span className="hidden md:inline">Ouvrir </span>Grand Écran 🖥️
          </a>
        ) : (
          <a 
            href="/auth" 
            className="bg-blue-600 px-3 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-lg"
          >
            Connexion
          </a>
        )}
        <img src="/attached_assets/Amplifon-Logo.png" alt="Amplifon" className="h-8 bg-white p-1 rounded ml-2" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/scripts" component={ScriptsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/grand-ecran" component={GrandEcranSimple} />
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
