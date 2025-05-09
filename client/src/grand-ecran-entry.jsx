import { createRoot } from "react-dom/client";
import GrandEcran from "./pages/GrandEcran";
import "./index.css";
import "./components/animations.css";
import { AuthProvider } from "./hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TeamPresenceProvider } from "./hooks/use-team-presence";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";

createRoot(document.getElementById("grand-ecran-root")).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TeamPresenceProvider>
        <TooltipProvider>
          <Toaster />
          <GrandEcran />
        </TooltipProvider>
      </TeamPresenceProvider>
    </AuthProvider>
  </QueryClientProvider>
);