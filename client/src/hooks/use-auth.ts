// Implémentation simplifiée pour le prototype
import { useState, useEffect } from 'react';
import { Agent } from '@/lib/types';

// Mocking - Définir un utilisateur admin par défaut pour le développement
const ADMIN_USER: Agent = {
  id: 0,
  name: 'Admin',
  objectif: 20,
  currentCRM: 0,
  currentDigital: 0,
  hours: 8,
  type: 'HOT',
  role: 'ADMIN',
  needsHelp: false
};

// Hook d'authentification simplifié
export function useAuth() {
  // Dans une vraie app, nous vérifierions si l'utilisateur est authentifié via un token JWT
  // Pour l'instant, on simule simplement un utilisateur admin
  return {
    currentUser: ADMIN_USER,
    isAdmin: true,
    login: (user: Agent) => console.log('Login:', user),
    logout: () => console.log('Logout')
  };
}

// Alias du hook useAuth pour les composants qui ont juste besoin de savoir si l'utilisateur est admin
export function useIsAdmin() {
  return true; // Pour le prototype, on considère toujours que l'utilisateur est admin
}

// Pour le prototype, on n'a pas besoin d'un vrai AuthProvider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement;
}