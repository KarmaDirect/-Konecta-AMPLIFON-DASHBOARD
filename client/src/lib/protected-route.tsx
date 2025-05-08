import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";

// Import à corriger quand useAuth sera disponible
// import { useAuth } from "@/hooks/use-auth";

// Implémentation temporaire pour la démo
const useAuth = () => {
  return {
    isLoading: false,
    user: localStorage.getItem("currentUser") 
      ? JSON.parse(localStorage.getItem("currentUser") || "{}") 
      : null
  };
};

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Route>
    );
  }

  return (
    <Route path={path}>
      {user ? <Component /> : <Redirect to="/auth" />}
    </Route>
  );
}