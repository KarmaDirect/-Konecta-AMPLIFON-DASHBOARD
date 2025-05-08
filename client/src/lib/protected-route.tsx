import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// Composant original (utilisé dans l'ancien routage)
export function ProtectedRoute({
  path = "/",
  component: Component,
}: {
  path?: string;
  component: () => React.JSX.Element;
}) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Redirect to="/auth" />;
  }

  return <Component />;
}