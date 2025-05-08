import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { wsClient, OnlineUser, ActivityItem } from '@/lib/websocket';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface TeamPresenceContextType {
  onlineUsers: OnlineUser[];
  activities: ActivityItem[];
  setUserStatus: (status: 'online' | 'away' | 'busy') => void;
}

const TeamPresenceContext = createContext<TeamPresenceContextType | null>(null);

interface TeamPresenceProviderProps {
  children: ReactNode;
  maxActivities?: number;
}

export function TeamPresenceProvider({ 
  children,
  maxActivities = 50
}: TeamPresenceProviderProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const setUserStatus = (status: 'online' | 'away' | 'busy') => {
    wsClient.setStatus(status);
  };

  useEffect(() => {
    // Mettre à jour l'utilisateur actuel dans le WebSocket
    if (currentUser) {
      wsClient.setCurrentUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    // Établir la connexion WebSocket
    wsClient.connect();

    // Écouter les mises à jour de présence
    wsClient.on<OnlineUser>('presence', (userData) => {
      setOnlineUsers(prevUsers => {
        // Supprimer l'utilisateur s'il existe déjà
        const filteredUsers = prevUsers.filter(u => u.userId !== userData.userId);
        // Ajouter la nouvelle donnée de présence
        return [...filteredUsers, userData];
      });
    });

    // Écouter les déconnexions
    wsClient.on<{ userId: number }>('user_offline', (data) => {
      setOnlineUsers(prevUsers => prevUsers.filter(u => u.userId !== data.userId));
    });

    // Écouter les activités
    wsClient.on<ActivityItem>('activity', (activity) => {
      // Ajouter l'activité à la liste avec un ID unique
      const activityWithId: ActivityItem = {
        ...activity,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      setActivities(prevActivities => {
        const newActivities = [activityWithId, ...prevActivities].slice(0, maxActivities);
        return newActivities;
      });

      // Afficher une notification toast pour les nouvelles activités
      if (activity.userId !== currentUser?.id) {
        toast({
          title: `${activity.userName} a ${activity.action}`,
          description: activity.target ? `${activity.target}` : '',
          duration: 5000,
        });
      }
    });

    // Écouter le résumé initial des présences
    wsClient.on<{ users: OnlineUser[] }>('presence_summary', (data) => {
      setOnlineUsers(data.users);
    });

    // Écouter l'historique des activités
    wsClient.on<{ activities: ActivityItem[] }>('activity_history', (data) => {
      setActivities(data.activities.slice(0, maxActivities));
    });

    // Nettoyer
    return () => {
      wsClient.off('presence');
      wsClient.off('user_offline');
      wsClient.off('activity');
      wsClient.off('presence_summary');
      wsClient.off('activity_history');
    };
  }, [currentUser, maxActivities, queryClient, toast]);

  const value = {
    onlineUsers,
    activities,
    setUserStatus,
  };

  return (
    <TeamPresenceContext.Provider value={value}>
      {children}
    </TeamPresenceContext.Provider>
  );
}

export function useTeamPresence() {
  const context = useContext(TeamPresenceContext);
  if (!context) {
    throw new Error('useTeamPresence must be used within a TeamPresenceProvider');
  }
  return context;
}