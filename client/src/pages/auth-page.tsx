import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { loginMutation, registerMutation, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  
  // Rediriger vers la page d'accueil si l'utilisateur est déjà connecté
  if (currentUser) {
    setLocation("/");
    return null;
  }

  // États pour le formulaire de connexion
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // États pour le formulaire d'inscription
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerRole, setRegisterRole] = useState<"ADMIN" | "AGENT">("AGENT");

  // Gérer la soumission du formulaire de connexion
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginUsername || !loginPassword) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }
    
    loginMutation.mutate(
      { username: loginUsername, password: loginPassword },
      {
        onSuccess: () => {
          toast({
            title: "Connexion réussie",
            description: "Bienvenue sur le tableau de bord",
          });
          setLocation("/");
        }
      }
    );
  };

  // Gérer la soumission du formulaire d'inscription
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerUsername || !registerPassword || !registerPasswordConfirm || !registerName) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }
    
    if (registerPassword !== registerPasswordConfirm) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate(
      { 
        username: registerUsername, 
        password: registerPassword,
        name: registerName,
        role: registerRole
      },
      {
        onSuccess: () => {
          toast({
            title: "Inscription réussie",
            description: "Votre compte a été créé avec succès",
          });
          setLocation("/");
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full mx-auto grid md:grid-cols-2 gap-8 items-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Mission RDV Master</CardTitle>
            <CardDescription className="text-center">
              Connectez-vous ou créez un compte pour accéder au tableau de bord
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="register">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Nom d'utilisateur</Label>
                    <Input 
                      id="login-username" 
                      type="text" 
                      placeholder="Entrez votre nom d'utilisateur"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <Input 
                      id="login-password" 
                      type="password" 
                      placeholder="Entrez votre mot de passe"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Connexion en cours..." : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nom complet</Label>
                    <Input 
                      id="register-name" 
                      type="text" 
                      placeholder="Entrez votre nom complet"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Nom d'utilisateur</Label>
                    <Input 
                      id="register-username" 
                      type="text" 
                      placeholder="Choisissez un nom d'utilisateur"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <Input 
                      id="register-password" 
                      type="password" 
                      placeholder="Choisissez un mot de passe"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password-confirm">Confirmer le mot de passe</Label>
                    <Input 
                      id="register-password-confirm" 
                      type="password" 
                      placeholder="Confirmez votre mot de passe"
                      value={registerPasswordConfirm}
                      onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-role">Rôle</Label>
                    <select
                      id="register-role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={registerRole}
                      onChange={(e) => setRegisterRole(e.target.value as "ADMIN" | "AGENT")}
                    >
                      <option value="AGENT">Agent</option>
                      <option value="ADMIN">Superviseur</option>
                    </select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Inscription en cours..." : "S'inscrire"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Pour créer un compte superviseur, sélectionnez le rôle "Superviseur" lors de l'inscription.
            </p>
          </CardFooter>
        </Card>
        
        <div className="hidden md:block">
          <div className="bg-blue-100 p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Mission RDV Master</h2>
            <p className="mb-6 text-gray-700">
              Plateforme de suivi des performances pour les équipes Konecta/Amplifon.
            </p>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-blue-800">Mode Superviseur</h3>
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li>Modifier les objectifs</li>
                  <li>Ajouter et gérer les agents</li>
                  <li>Répartir les rendez-vous</li>
                  <li>Réinitialiser les compteurs</li>
                  <li>Exporter les données en Excel</li>
                </ul>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-blue-800">Mode Agent</h3>
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li>Suivre ses objectifs en temps réel</li>
                  <li>Mettre à jour le nombre de RDV</li>
                  <li>Demander de l'aide en cas de besoin</li>
                  <li>Modifier ses heures de travail</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center space-x-4">
              <img src="https://upload.wikimedia.org/wikipedia/fr/thumb/e/e7/Konecta_Logo_2021.svg/320px-Konecta_Logo_2021.svg.png" alt="Konecta" className="h-8" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Amplifon_logo.svg/320px-Amplifon_logo.svg.png" alt="Amplifon" className="h-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}