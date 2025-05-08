import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCheckAlerts } from '@/hooks/use-alert-thresholds';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AlertType = {
  id: number;
  thresholdType: string;
  thresholdValue: number;
  alertType: string;
  appointmentType: string;
  message: string;
  timestamp: string;
  seen: boolean;
};

export function AlertNotifications({ agentId }: { agentId: number }) {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AlertType | null>(null);
  
  const { data: crmAlerts } = useCheckAlerts(agentId, 'CRM');
  const { data: digitalAlerts } = useCheckAlerts(agentId, 'Digital');

  // Gérer les alertes CRM
  useEffect(() => {
    if (crmAlerts && crmAlerts.length > 0) {
      const newAlerts = crmAlerts.map(alert => ({
        id: alert.id,
        thresholdType: alert.thresholdType,
        thresholdValue: alert.thresholdValue,
        alertType: alert.alertType,
        appointmentType: alert.appointmentType,
        message: generateAlertMessage(alert, 'CRM'),
        timestamp: new Date().toISOString(),
        seen: false
      }));
      
      setAlerts(prev => {
        // Filtrer les alertes déjà présentes
        const existingIds = prev.map(a => a.id);
        const filteredNewAlerts = newAlerts.filter(a => !existingIds.includes(a.id));
        return [...prev, ...filteredNewAlerts];
      });
      
      // Afficher l'alerte la plus récente en popup
      if (newAlerts.length > 0) {
        setCurrentAlert(newAlerts[0]);
        setShowAlert(true);
      }
    }
  }, [crmAlerts]);

  // Gérer les alertes Digital
  useEffect(() => {
    if (digitalAlerts && digitalAlerts.length > 0) {
      const newAlerts = digitalAlerts.map(alert => ({
        id: alert.id,
        thresholdType: alert.thresholdType,
        thresholdValue: alert.thresholdValue,
        alertType: alert.alertType,
        appointmentType: alert.appointmentType,
        message: generateAlertMessage(alert, 'Digital'),
        timestamp: new Date().toISOString(),
        seen: false
      }));
      
      setAlerts(prev => {
        // Filtrer les alertes déjà présentes
        const existingIds = prev.map(a => a.id);
        const filteredNewAlerts = newAlerts.filter(a => !existingIds.includes(a.id));
        return [...prev, ...filteredNewAlerts];
      });
      
      // Afficher l'alerte la plus récente en popup
      if (newAlerts.length > 0 && !currentAlert) {
        setCurrentAlert(newAlerts[0]);
        setShowAlert(true);
      }
    }
  }, [digitalAlerts]);

  // Générer le message d'alerte en fonction du type
  const generateAlertMessage = (alert: any, type: string) => {
    const typeLabel = type === 'CRM' ? 'CRM' : 'Digital';
    
    switch (alert.alertType) {
      case 'objective_approaching':
        return `Vous approchez de votre objectif ${typeLabel} (${alert.thresholdValue}${alert.thresholdType === 'percentage' ? '%' : ' RDV'})`;
      case 'objective_reached':
        return `Félicitations ! Vous avez atteint votre objectif ${typeLabel} !`;
      case 'objective_exceeded':
        return `Bravo ! Vous avez dépassé votre objectif ${typeLabel} !`;
      default:
        return `Alerte ${typeLabel}`;
    }
  };

  // Marquer une alerte comme vue
  const markAsSeen = (id: number) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, seen: true } : alert
    ));
  };

  // Effacer une alerte
  const dismissAlert = (id: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  // Nombre d'alertes non vues
  const unseenCount = alerts.filter(a => !a.seen).length;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unseenCount > 0 && (
              <Badge className="absolute -top-2 -right-2 px-1 min-w-[20px] h-5 bg-red-500">
                {unseenCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="p-3 font-medium border-b">
            Notifications
          </div>
          <div className="max-h-[300px] overflow-auto">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div 
                  key={`${alert.id}-${alert.timestamp}`}
                  className={`p-3 border-b hover:bg-gray-50 transition-colors cursor-pointer ${!alert.seen ? 'bg-blue-50' : ''}`}
                  onClick={() => markAsSeen(alert.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                    >
                      &times;
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                Aucune notification
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentAlert?.alertType === 'objective_reached' || currentAlert?.alertType === 'objective_exceeded' 
                ? '🎉 Félicitations !'
                : '⚠️ Alerte'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentAlert?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                if (currentAlert) {
                  markAsSeen(currentAlert.id);
                }
                setShowAlert(false);
                setCurrentAlert(null);
              }}
            >
              Compris
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}