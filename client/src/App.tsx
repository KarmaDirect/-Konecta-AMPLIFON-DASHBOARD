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
import ScriptsPage from "@/pages/ScriptsPage";
import AuthPage from "@/pages/auth-page";

// Composant pour connecter les WebSockets au démarrage
function WebSocketConnector() {
  useRealtimeAgents();
  return null;
}

// Composant de barre de navigation (vide pour le moment)
function NavigationBar() {
  return null;
}

// Route directe pour Grand Écran
const GrandEcranRoute = () => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Redirect to="/auth" />;
  }
  
  return <GrandEcran />;
};

function Router() {
  return (
    <Switch>
      <Route path="/scripts" component={ScriptsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/grand-ecran" component={GrandEcranRoute} />
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
