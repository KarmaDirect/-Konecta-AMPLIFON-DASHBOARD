import { useState, useEffect } from 'react';
import { 
  useCampaignScripts, 
  useCreateCampaignScript, 
  useUpdateCampaignScript, 
  useDeleteCampaignScript,
  useCampaignScriptsByCategory
} from '@/hooks/use-campaign-scripts';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, PencilIcon, PlusCircleIcon, SearchIcon, Trash2, XCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertCampaignScriptSchema } from '@shared/schema';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Extension du schéma pour la validation du formulaire
const formSchema = insertCampaignScriptSchema.extend({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  content: z.string().min(10, "Le contenu doit contenir au moins 10 caractères"),
  campaignName: z.string().min(3, "Le nom de la campagne doit contenir au moins 3 caractères"),
  category: z.string().min(1, "Veuillez sélectionner une catégorie"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ScriptsPage() {
  const { isAdmin } = useAuth();
  const { data: scripts, isLoading } = useCampaignScripts();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<number | null>(null);
  const { toast } = useToast();

  const createMutation = useCreateCampaignScript();
  const updateMutation = useUpdateCampaignScript(editingScript || 0);
  const deleteMutation = useDeleteCampaignScript();

  // Formulaire pour la création/édition de script
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      campaignName: '',
      category: '',
      isActive: true,
      priority: 0
    },
  });

  // Fonction pour réinitialiser le formulaire avec les valeurs d'un script existant
  useEffect(() => {
    if (editingScript && scripts) {
      const scriptToEdit = scripts.find(s => s.id === editingScript);
      if (scriptToEdit) {
        form.reset({
          title: scriptToEdit.title,
          content: scriptToEdit.content,
          campaignName: scriptToEdit.campaignName,
          category: scriptToEdit.category,
          isActive: scriptToEdit.isActive,
          priority: scriptToEdit.priority
        });
      }
    } else {
      form.reset({
        title: '',
        content: '',
        campaignName: '',
        category: '',
        isActive: true,
        priority: 0
      });
    }
  }, [editingScript, scripts, form]);

  // Fonction pour filtrer les scripts en fonction de la recherche
  const filteredScripts = scripts?.filter(script => {
    if (currentTab !== 'all' && script.category.toLowerCase() !== currentTab) {
      return false;
    }
    
    if (searchQuery === '') {
      return true;
    }
    
    const query = searchQuery.toLowerCase();
    return script.title.toLowerCase().includes(query) || 
           script.campaignName.toLowerCase().includes(query) ||
           script.content.toLowerCase().includes(query) ||
           script.category.toLowerCase().includes(query);
  });

  // Extraction des catégories uniques pour les onglets
  const categories = scripts ? Array.from(new Set(scripts.map(script => script.category.toLowerCase()))) : [];

  // Fonction de soumission du formulaire
  const onSubmit = (values: FormValues) => {
    if (editingScript) {
      updateMutation.mutate(values, {
        onSuccess: () => {
          toast({
            title: "Script mis à jour",
            description: "Le script a été mis à jour avec succès",
          });
          setEditingScript(null);
          setIsCreateDialogOpen(false);
        },
        onError: (error) => {
          toast({
            title: "Erreur",
            description: `Erreur lors de la mise à jour du script: ${error.message}`,
            variant: "destructive",
          });
        }
      });
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast({
            title: "Script créé",
            description: "Le script a été créé avec succès",
          });
          setIsCreateDialogOpen(false);
        },
        onError: (error) => {
          toast({
            title: "Erreur",
            description: `Erreur lors de la création du script: ${error.message}`,
            variant: "destructive",
          });
        }
      });
    }
  };

  // Fonction pour supprimer un script
  const handleDelete = (id: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce script ?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast({
            title: "Script supprimé",
            description: "Le script a été supprimé avec succès",
          });
        },
        onError: (error) => {
          toast({
            title: "Erreur",
            description: `Erreur lors de la suppression du script: ${error.message}`,
            variant: "destructive",
          });
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scripts de Campagne</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les scripts pour différentes campagnes et catégories
          </p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => {
              setEditingScript(null);
              setIsCreateDialogOpen(true);
            }}
            className="mt-4 md:mt-0"
          >
            <PlusCircleIcon className="mr-2 h-4 w-4" /> Nouveau Script
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un script..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="w-full md:w-64">
          <Select 
            value={currentTab} 
            onValueChange={setCurrentTab}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrer par campagne" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les scripts</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">Tous</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={currentTab} className="space-y-4">
          {filteredScripts?.length === 0 ? (
            <Alert>
              <AlertTitle>Aucun script trouvé</AlertTitle>
              <AlertDescription>
                Aucun script ne correspond à votre recherche. Essayez avec des termes différents ou créez un nouveau script.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredScripts?.map((script) => (
                <Card key={script.id} className={`overflow-hidden ${!script.isActive ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="mr-8">{script.title}</CardTitle>
                        <CardDescription className="mt-1">
                          Campagne: {script.campaignName}
                        </CardDescription>
                      </div>
                      <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                        {script.category}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mt-2 max-h-32 overflow-y-auto">
                      <p className="whitespace-pre-wrap">{script.content}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-4 pb-3">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${script.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-xs text-muted-foreground">
                        {script.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingScript(script.id);
                            setIsCreateDialogOpen(true);
                          }}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(script.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogue pour créer/éditer un script */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingScript ? 'Modifier le script' : 'Créer un nouveau script'}</DialogTitle>
            <DialogDescription>
              {editingScript 
                ? 'Modifiez les informations du script existant.'
                : 'Remplissez le formulaire pour créer un nouveau script.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Titre du script" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="campaignName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de campagne*</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Campagne Été 2025" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie*</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une catégorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HOT">HOT</SelectItem>
                          <SelectItem value="PROSPECT">PROSPECT</SelectItem>
                          <SelectItem value="DIGI">DIGI</SelectItem>
                          <SelectItem value="GENERAL">GENERAL</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenu du script*</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Entrez le contenu du script ici..." 
                        className="min-h-[200px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Vous pouvez utiliser du texte formaté avec des sauts de ligne.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorité</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value?.toString() || "0"}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          name={field.name}
                          placeholder="0" 
                        />
                      </FormControl>
                      <FormDescription>
                        Ordre d'affichage (plus petit = plus prioritaire)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Actif</FormLabel>
                        <FormDescription>
                          Ce script sera visible pour les agents
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingScript ? 'Mettre à jour' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}