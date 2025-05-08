import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { currentUser } = useAuth();

  return (
    <Route path={path}>
      {currentUser ? <Component /> : <Redirect to="/auth" />}
    </Route>
  );
}