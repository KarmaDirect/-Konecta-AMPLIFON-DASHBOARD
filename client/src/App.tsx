import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { useRealtimeAgents } from "@/hooks/use-realtime-agents";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import GrandEcran from "@/pages/GrandEcran";

// Composant pour connecter les WebSockets au démarrage
function WebSocketConnector() {
  useRealtimeAgents();
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/grand-ecran" component={GrandEcran} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WebSocketConnector />
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
