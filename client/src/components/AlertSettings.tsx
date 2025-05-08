import { useState, useEffect } from 'react';
import { 
  useAlertThresholdsByUserId, 
  useCreateAlertThreshold, 
  useUpdateAlertThreshold, 
  useDeleteAlertThreshold 
} from '@/hooks/use-alert-thresholds';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export function AlertSettings() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  // State pour le formulaire d'ajout et de modification
  const [thresholdType, setThresholdType] = useState<'percentage' | 'absolute'>('percentage');
  const [thresholdValue, setThresholdValue] = useState(90);
  const [alertType, setAlertType] = useState<'objective_approaching' | 'objective_reached' | 'objective_exceeded'>('objective_approaching');
  const [appointmentType, setAppointmentType] = useState<'CRM' | 'Digital' | 'Both'>('Both');
  const [isActive, setIsActive] = useState(true);

  // Queries et mutations
  const { data: alerts, isLoading } = useAlertThresholdsByUserId(currentUser?.id || 0);
  const createMutation = useCreateAlertThreshold();
  const updateMutation = useUpdateAlertThreshold(selectedAlert?.id);
  const deleteMutation = useDeleteAlertThreshold();

  // Réinitialiser les champs du formulaire
  const resetForm = () => {
    setThresholdType('percentage');
    setThresholdValue(90);
    setAlertType('objective_approaching');
    setAppointmentType('Both');
    setIsActive(true);
  };

  // Remplir le formulaire avec les données de l'alerte sélectionnée
  useEffect(() => {
    if (selectedAlert) {
      setThresholdType(selectedAlert.thresholdType);
      setThresholdValue(selectedAlert.thresholdValue);
      setAlertType(selectedAlert.alertType);
      setAppointmentType(selectedAlert.appointmentType);
      setIsActive(selectedAlert.isActive);
    } else {
      resetForm();
    }
  }, [selectedAlert]);

  // Gérer l'ajout d'une alerte
  const handleAddAlert = async () => {
    if (!currentUser) return;

    try {
      await createMutation.mutateAsync({
        userId: currentUser.id,
        thresholdType,
        thresholdValue,
        alertType,
        appointmentType,
        isActive
      });

      toast({
        title: "Alerte ajoutée",
        description: "Le seuil d'alerte a été créé avec succès.",
      });
      
      resetForm();
      setIsAddOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'alerte:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le seuil d'alerte.",
        variant: "destructive"
      });
    }
  };

  // Gérer la mise à jour d'une alerte
  const handleUpdateAlert = async () => {
    if (!selectedAlert) return;

    try {
      await updateMutation.mutateAsync({
        thresholdType,
        thresholdValue,
        alertType,
        appointmentType,
        isActive
      });

      toast({
        title: "Alerte mise à jour",
        description: "Le seuil d'alerte a été mis à jour avec succès.",
      });
      
      setSelectedAlert(null);
      setIsEditOpen(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'alerte:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le seuil d'alerte.",
        variant: "destructive"
      });
    }
  };

  // Gérer la suppression d'une alerte
  const handleDeleteAlert = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);

      toast({
        title: "Alerte supprimée",
        description: "Le seuil d'alerte a été supprimé avec succès.",
      });
      
      if (selectedAlert?.id === id) {
        setSelectedAlert(null);
        setIsEditOpen(false);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'alerte:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le seuil d'alerte.",
        variant: "destructive"
      });
    }
  };

  // Formatter le type d'alerte pour l'affichage
  const formatAlertType = (type: string) => {
    switch (type) {
      case 'objective_approaching':
        return "Objectif approchant";
      case 'objective_reached':
        return "Objectif atteint";
      case 'objective_exceeded':
        return "Objectif dépassé";
      default:
        return type;
    }
  };

  // Formatter le type de seuil pour l'affichage
  const formatThresholdType = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`;
    } else {
      return `${value} RDV`;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-8">Chargement des alertes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Paramètres d'alertes</h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                resetForm();
                setIsAddOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Ajouter une alerte
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ajouter un seuil d'alerte</DialogTitle>
              <DialogDescription>
                Créez une nouvelle alerte qui vous notifiera lorsque les conditions seront remplies.
              </DialogDescription>
            </DialogHeader>
            
            {renderAlertForm()}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setIsAddOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleAddAlert} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Ajout en cours..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts && alerts.length > 0 ? (
          alerts.map((alert) => (
            <Card key={alert.id} className={!alert.isActive ? "opacity-70" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{formatAlertType(alert.alertType)}</CardTitle>
                <CardDescription>
                  Type: {alert.appointmentType === "Both" ? "CRM & Digital" : alert.appointmentType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Seuil: </span>
                  {formatThresholdType(alert.thresholdType, alert.thresholdValue)}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm mr-2">
                    {alert.isActive ? "Active" : "Inactive"}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${alert.isActive ? "bg-green-500" : "bg-gray-400"}`}></div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedAlert(alert);
                    setIsEditOpen(true);
                  }}
                >
                  Modifier
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDeleteAlert(alert.id)}
                  disabled={deleteMutation.isPending}
                >
                  Supprimer
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-2 p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
            <p>Aucun seuil d'alerte configuré.</p>
            <p className="text-sm mt-2">Les alertes vous aident à suivre votre progression vers les objectifs.</p>
          </div>
        )}
      </div>
      
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le seuil d'alerte</DialogTitle>
            <DialogDescription>
              Modifiez les paramètres de cette alerte selon vos besoins.
            </DialogDescription>
          </DialogHeader>
          
          {renderAlertForm()}
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedAlert(null);
                setIsEditOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateAlert}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Formulaire d'ajout/modification d'alerte
  function renderAlertForm() {
    return (
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="threshold-type" className="text-right">
            Type de seuil
          </Label>
          <Select
            value={thresholdType}
            onValueChange={(value) => setThresholdType(value as any)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Type de seuil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Pourcentage</SelectItem>
              <SelectItem value="absolute">Nombre absolu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="threshold-value" className="text-right">
            Valeur du seuil
          </Label>
          <Input
            id="threshold-value"
            type="number"
            value={thresholdValue}
            onChange={(e) => setThresholdValue(parseInt(e.target.value) || 0)}
            className="col-span-3"
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="alert-type" className="text-right">
            Type d'alerte
          </Label>
          <Select
            value={alertType}
            onValueChange={(value) => setAlertType(value as any)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Type d'alerte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="objective_approaching">Objectif approchant</SelectItem>
              <SelectItem value="objective_reached">Objectif atteint</SelectItem>
              <SelectItem value="objective_exceeded">Objectif dépassé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="appointment-type" className="text-right">
            Type de RDV
          </Label>
          <Select
            value={appointmentType}
            onValueChange={(value) => setAppointmentType(value as any)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Type de RDV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CRM">CRM</SelectItem>
              <SelectItem value="Digital">Digital</SelectItem>
              <SelectItem value="Both">Les deux</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="is-active" className="text-right">
            État
          </Label>
          <div className="flex items-center space-x-2 col-span-3">
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is-active">{isActive ? 'Active' : 'Inactive'}</Label>
          </div>
        </div>
      </div>
    );
  }
}