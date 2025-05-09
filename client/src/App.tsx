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
import GrandEcranBasic from "@/pages/GrandEcranBasic";
import GrandEcranSuper from "@/pages/GrandEcranSuper";
import GrandEcranLocal from "@/pages/GrandEcranLocal";
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
      
      <div className="font-bold text-xl">
        Mission RDV Master
      </div>
      
      <div className="flex items-center space-x-2">
        {currentUser ? (
          <div className="flex space-x-2">
            <a 
              href="/grand-ecran" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center"
            >
              BIG SCREEN 🖥️
            </a>
            <a 
              href="/grand-ecran-basic" 
              className="bg-gradient-to-r from-green-600 to-blue-600 px-3 py-2 rounded-md hover:from-green-700 hover:to-blue-700 transition-all shadow-lg flex items-center"
            >
              BASIC VIEW 📊
            </a>
            <a 
              href="/grand-ecran-super" 
              className="bg-gradient-to-r from-red-600 to-yellow-500 px-3 py-2 rounded-md hover:from-red-700 hover:to-yellow-600 transition-all shadow-lg flex items-center"
            >
              SUPER VIEW 💯
            </a>
            <a 
              href="/grand-ecran-local" 
              className="bg-gradient-to-r from-yellow-500 to-green-500 px-3 py-2 rounded-md hover:from-yellow-600 hover:to-green-600 transition-all shadow-lg flex items-center"
            >
              LOCAL VIEW 🏆
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
      <Route path="/grand-ecran" component={GrandEcranSimple} />
      <Route path="/grand-ecran-basic" component={() => <GrandEcranBasic />} />
      <Route path="/grand-ecran-super" component={() => <GrandEcranSuper />} />
      <Route path="/grand-ecran-local" component={GrandEcranLocal} />
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
