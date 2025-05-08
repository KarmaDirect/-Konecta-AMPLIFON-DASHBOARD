import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { toast } = useToast();
  const [loginCredentials, setLoginCredentials] = useState({ username: "", password: "" });
  const [registerCredentials, setRegisterCredentials] = useState({ 
    name: "", 
    username: "", 
    password: "", 
    confirmPassword: "",
    role: "AGENT" as "ADMIN" | "AGENT"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Dans une application réelle, ces fonctions utiliseraient les mutations de React Query
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Ici on simule le login pour le moment
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Connexion réussie",
          description: "Vous êtes maintenant connecté",
        });
        setLocation("/");
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Erreur de connexion",
        description: "Nom d'utilisateur ou mot de passe incorrect",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerCredentials.password !== registerCredentials.confirmPassword) {
      toast({
        title: "Erreur d'inscription",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Ici on simule le register pour le moment
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Inscription réussie",
          description: "Votre compte a été créé avec succès"
        });
        setLocation("/");
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Erreur d'inscription",
        description: "Impossible de créer votre compte",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        <div className="order-2 md:order-1">
          <Tabs defaultValue="login" className="w-full max-w-md mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="register">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-center mb-6 text-blue-900">Connexion</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <Input
                      id="username"
                      type="text"
                      value={loginCredentials.username}
                      onChange={(e) => setLoginCredentials({...loginCredentials, username: e.target.value})}
                      placeholder="Entrer votre nom d'utilisateur"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginCredentials.password}
                      onChange={(e) => setLoginCredentials({...loginCredentials, password: e.target.value})}
                      placeholder="Entrer votre mot de passe"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Connexion en cours..." : "Se connecter"}
                  </Button>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-center mb-6 text-blue-900">Inscription</h2>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nom complet</Label>
                    <Input
                      id="register-name"
                      type="text"
                      value={registerCredentials.name}
                      onChange={(e) => setRegisterCredentials({...registerCredentials, name: e.target.value})}
                      placeholder="Entrer votre nom complet"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Nom d'utilisateur</Label>
                    <Input
                      id="register-username"
                      type="text"
                      value={registerCredentials.username}
                      onChange={(e) => setRegisterCredentials({...registerCredentials, username: e.target.value})}
                      placeholder="Choisir un nom d'utilisateur"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerCredentials.password}
                      onChange={(e) => setRegisterCredentials({...registerCredentials, password: e.target.value})}
                      placeholder="Choisir un mot de passe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirmer le mot de passe</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      value={registerCredentials.confirmPassword}
                      onChange={(e) => setRegisterCredentials({...registerCredentials, confirmPassword: e.target.value})}
                      placeholder="Confirmer votre mot de passe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rôle</Label>
                    <select
                      id="role"
                      className="w-full border border-gray-300 rounded-md p-2"
                      value={registerCredentials.role}
                      onChange={(e) => setRegisterCredentials({...registerCredentials, role: e.target.value as "ADMIN" | "AGENT"})}
                      required
                    >
                      <option value="AGENT">Agent</option>
                      <option value="ADMIN">Superviseur (Admin)</option>
                    </select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Inscription en cours..." : "S'inscrire"}
                  </Button>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="order-1 md:order-2 text-center md:text-left">
          <div className="mb-8 flex justify-center md:justify-start">
            <img 
              src="https://upload.wikimedia.org/wikipedia/fr/thumb/e/e7/Konecta_Logo_2021.svg/512px-Konecta_Logo_2021.svg.png" 
              alt="Konecta" 
              className="h-12 mr-4" 
            />
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Amplifon_logo.svg/512px-Amplifon_logo.svg.png" 
              alt="Amplifon" 
              className="h-10" 
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">
            Mission RDV Master
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            Plateforme de suivi des performances pour les agents Konecta/Amplifon. 
            Suivez vos objectifs RDV en temps réel et collaborez efficacement avec votre équipe.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Fonctionnalités principales:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="mr-2">✅</span>
                <span>Suivi des objectifs RDV en temps réel</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✅</span>
                <span>Gestion des agents CRM et Digitaux</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✅</span>
                <span>Exportation des données vers Excel</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✅</span>
                <span>Système de classement des performances</span>
              </li>
            </ul>
          </div>
          <div className="flex justify-center md:justify-start">
            <a href="/" className="text-blue-600 hover:text-blue-800 font-semibold">
              ← Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}