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
      {/* Titre sans logos (logos déjà dans la barre de navigation) */}
      <h1 className="text-3xl font-bold text-center text-blue-900 mb-6">📝 Scripts de Campagne</h1>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
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
        <TabsList className="mb-6 flex flex-wrap">
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="hot">HOT</TabsTrigger>
          <TabsTrigger value="prospect">PROSPECT</TabsTrigger>
          <TabsTrigger value="digi">DIGI</TabsTrigger>
          <TabsTrigger value="digital">DIGITAL</TabsTrigger>
          <TabsTrigger value="amplicard">AMPLICARD</TabsTrigger>
          <TabsTrigger value="entrant">ENTRANT</TabsTrigger>
          <TabsTrigger value="custom">PERSONNALISÉS</TabsTrigger>
          {categories
            .filter(category => !['hot', 'prospect', 'digi', 'digital', 'amplicard', 'entrant', 'custom']
              .includes(category.toLowerCase()))
            .map((category) => (
            <TabsTrigger key={category} value={category}>
              {category.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* SCRIPTS AMPLIFON OFFICIELS */}
        <TabsContent value="hot" className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
            <h2 className="text-xl font-bold text-blue-800 mb-2">Scripts HOT</h2>
            <p className="text-gray-700 mb-4">Scripts pour les contacts client HOT - clients qui ont déjà acheté des appareils auditifs</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-blue-50">
                <CardTitle>SCRIPT HOT INT</CardTitle>
                <CardDescription>Script pour clients qui sont déjà venus en centre récemment</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XXXXX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

Je me permets de vous contacter de la part du centre Amplifon de XXXXX, chez qui vous
êtes suivi(e) pour vos aides auditives.

Je viens prendre de vos nouvelles, tout se passe bien avec vos appareils?
Vous les portez régulièrement?
Aucune gêne à signaler?
Il y a-t-il des cas de figures ou vos aides ne vous apportent pas entière satisfaction?

Je viens vers vous également car je vois que vous êtes venu(e) en centre récemment et je
souhaitais m'assurer que tout s'était bien passé?

Vous avez pu y faire un suivi de vos appareils ? Ou bien un nouveau test auditif ?

Votre audioprothésiste vous invite au centre pour tester les dernières nouveautés pendant
30 jours complètement gratuitement sans aucune obligation d'achat.

Ça permettrait également de pouvoir comparer avec vos aides auditives actuelles et de voir
si une solution plus récente pourrait vous plaire.

Pour parler de tout cela, votre centre vous propose un RDV le XXXX à XX heure,
seriez-vous disponible?
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-blue-50">
                <CardTitle>SCRIPT HOT NO INT</CardTitle>
                <CardDescription>Script pour clients qui ne sont pas venus en centre récemment</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XXXXXX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

Je me permets de vous contacter de la part du centre Amplifon de XXXXX, chez qui vous
êtes suivi(e) pour vos aides auditives. Je viens prendre de vos nouvelles, tout se passe bien
avec vos appareils?
Vous les portez régulièrement?
Aucune gêne à signaler?
Il y a-t-il des cas de figures ou vos aides ne vous apportent pas entière satisfaction?

Je viens vers vous également car je vois que votre dernière visite au centre remonte à
XXXX, et votre centre aimerait vous revoir.
Ce serait l'occasion de refaire un bilan complet de vos appareils, un entretien ainsi que des
réglages si nécessaire.

Votre audioprothésiste vous propose un RDV le XXXX à XX heure, seriez-vous disponible?
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-blue-50">
                <CardTitle>SCRIPT HOT 4 à 4,3Y Client classe 1</CardTitle>
                <CardDescription>Script pour clients classe 1 dont les appareils ont 4 à 4,3 ans</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

Je vous appelle de la part du centre Amplifon de [Nom centre] où vous êtes suivi-e pour vos
appareils auditifs.

(si refuse d'écouter) Je vous appelle justement pour vous communiquer quelques
informations au sujet de vos appareils auditifs. Et afin que vous soyez informée. Vous me
direz ensuite ce que vous en pensez ?

(si ouvert à la discussion)

Je vois que vous êtes passé-e en centre récemment (le (DATE DERNIERE VISITE)) et je
souhaitais m'assurer que tout s'était bien passé. Vous avez pu y faire un suivi de vos
appareils ? Ou bien un nouveau test auditif ? (laisser parler)

Vous le savez aussi certainement, vos aides auditives ont atteint leur 4ème anniversaire
(donc ne sont plus sous garantie). Et vous êtes à nouveau éligible à une prise en charge
lors de votre visite, l'audioprothésiste a-t-il abordé avec vous la possibilité de faire un essai
de nouveaux appareils ? Qu'en pensez-vous ?

Je vous rappelle que vous bénéficiez toujours de la prise en charge à 100% (pour des AA de
CLASSE 1) C'est l'occasion de bénéficier de nouvelles aides toutes neuves, et ne pas se
retrouver sans solution en cas de casse ou perte de vos AA actuelles, qui ne sont plus sous
garantie.

(rebondir si objections) Il est conseillé par le ministère de la Santé de renouveler ses aides
auditives tous les 4 ans afin de garantir un confort auditif optimal. Cet essai de 30 jours sans
engagement vous permettrait de comparer avec vos AA actuelles.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-blue-50">
                <CardTitle>SCRIPT HOT 4 à 4,3Y Client classe 2</CardTitle>
                <CardDescription>Script pour clients classe 2 dont les appareils ont 4 à 4,3 ans</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

Je vous appelle de la part du centre Amplifon de [Nom centre] où vous êtes suivi-e pour vos
appareils auditifs.

(si refuse d'écouter) Je vous appelle justement pour vous communiquer quelques
informations au sujet de vos appareils auditifs. Et afin que vous soyez informée. Vous me
direz ensuite ce que vous en pensez ?

(si ouvert à la discussion)

Je vois que vous êtes passé en centre récemment (le (DATE DERNIERE VISITE)) et je
souhaitais m'assurer que tout s'était bien passé. Vous avez pu y faire un suivi de vos
appareils ? Ou bien un nouveau test auditif ? (laisser parler)

Vous le savez aussi certainement, vos aides auditives ont atteint leur 4ème anniversaire et
ne sont désormais plus sous garantie lors de votre visite, l'audioprothésiste a-t-il abordé la
possibilité d'organiser un essai personnalisé de nouveaux appareils ?

Nous souhaitons vous faire découvrir le confort des aides dernière génération, qui ont bien
évolué ces dernières années. Notamment au niveau des réglages personnalisés et de la
compréhension dans le bruit. Vous pourrez les essayer pendant 30 jours, afin de comparer
avec vos AA actuelles et ressentir la différence. C'est toujours sans aucune obligation
d'achat. Qu'en pensez-vous ?

(rebondir si objections) Il est conseillé par le ministère de la Santé de renouveler ses aides
auditives tous les 4 ans afin de garantir un confort auditif optimal. C'est aussi une bonne
occasion d'avoir une paire de rechange en cas de casse ou de perte.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-blue-50">
                <CardTitle>SCRIPT HOT 4,4 to 5,9Y et Client classe 1</CardTitle>
                <CardDescription>Script pour clients classe 1 dont les appareils ont 4,4 à 5,9 ans</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !

Je vous appelle de la part du centre Amplifon de [Nom centre] où vous êtes suivi-e pour vos
appareils auditifs.

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

(si refuse d'écouter) Je vous appelle justement pour prendre de vos nouvelles dans le
cadre du suivi de vos appareils auditifs.

(si ouvert à la discussion)

[Si client venu depuis PLUS DE 6 MOIS]

Cela fait quelque temps qu'on ne vous a pas vu-e en centre. N'hésitez jamais à solliciter
votre centre pour votre suivi, c'est important et surtout, cela ne vous coûte rien.

Comment cela se passe-t-il avec vos AA ? (cf dernière disposition NBA si renseignée
REBONDIR)

Qu'avez-vous eu l'occasion de faire lors de votre dernière visite ?

Nous aimerions vous revoir en centre pour le suivi de vos AA (entretien, réglage) & refaire
un bilan de votre audition.

Je vous propose un rendez-vous dans votre centre pour réaliser un bilan auditif / un bilan
complet de vos appareillages avec l'audioprothésiste
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="prospect" className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6">
            <h2 className="text-xl font-bold text-purple-800 mb-2">Scripts PROSPECT</h2>
            <p className="text-gray-700 mb-4">Scripts pour les prospects - personnes qui ont fait un bilan auditif mais n'ont pas encore acheté d'appareils</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-purple-50">
                <CardTitle>SCRIPT PROSPECT</CardTitle>
                <CardDescription>Script général pour prospects</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XXXXX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !


Je vous appelle de la part du centre Amplifon de XXXX vous avez réalisé un bilan auditif en
date du XXXXXX

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

Je me permets de vous contacter pour savoir si depuis votre dernier bilan auditif vous avez
eu l'occasion de consulter un ORL? Vous a-t-il prescrit une ordonnance pour un
appareillage?


-> Si il a une ordonnance, prise de RDV pour un essai d'AA


-> Si il n'a pas d'ordonnance et que le dernier bilan auditif = +6 mois, prise de RDV
pour un bilan auditif
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-purple-50">
                <CardTitle>SCRIPT PROSPECT 12 MOIS</CardTitle>
                <CardDescription>Script pour prospects dont le bilan date de plus de 12 mois</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XXXXX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !


Je vous appelle de la part du centre Amplifon de XXXX vous avez réalisé un bilan auditif en
date du XXXXXX

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

Je me permets de vous contacter pour savoir si depuis votre dernier bilan auditif vous avez
eu l'occasion de consulter un ORL? Si oui, vous a-t-il prescrit une ordonnance pour un
appareillage?



Vu que votre dernier bilan auditif remonte à + d'un an, je vous contacte pour pouvoir en
replanifier un nouveau. Il est recommandé d'en faire minimum 1 par an pour pouvoir suivre
l'évolution de votre audition.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-purple-50">
                <CardTitle>SCRIPT PROSPECT NO ESSAI</CardTitle>
                <CardDescription>Script pour prospects qui n'ont pas fait d'essai</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XXXXX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

Je me permets de vous contacter pour savoir si depuis votre dernier bilan auditif vous avez
eu l'occasion de consulter un ORL? Vous a-t-il prescrit une ordonnance pour un
appareillage?




-> Si il a une ordonnance, prise de RDV pour un essai d'AA


-> Si il n'a pas d'ordonnance et que le dernier bilan auditif = +6 mois, prise de RDV
pour un bilan auditif
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="digital" className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-6">
            <h2 className="text-xl font-bold text-green-800 mb-2">Scripts DIGITAL</h2>
            <p className="text-gray-700 mb-4">Scripts pour les contacts issus du digital (site web, réseaux sociaux)</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-green-50">
                <CardTitle>SCRIPT DIGITALE</CardTitle>
                <CardDescription>Script général pour contacts digitaux</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XXXXX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

Je me permets de vous contacter suite à la demande de rappel que vous avez passé sur
XXXX, vous souhaitiez prendre rendez-vous pour effectuer un bilan auditif gratuit ou était-ce
pour essayer gratuitement des appareils auditifs pendant 30 jours?

Il y a-t'il des cas de figure dans lesquels vous ressentez une gêne?

   ●​ Lors de conversations à plusieurs?
   ●​ Lorsque vous regardez la télévision?
   ●​ Dans un environnement bruyant?


-> Si bilan auditif :

Très bien, et bien dans ce cas je vais vérifier quel est le centre le plus proche de chez vous.
Votre code postal est bien le XXXXX?


-> Si essai d'AA :

Avez-vous déjà consulté un ORL ? Vous a-t-il fait une ordonnance pour un appareillage?
Si oui, dans ce cas je vais vérifier quel est le centre le plus proche de chez vous. Votre code
postal est bien le XXXXX?
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-green-50">
                <CardTitle>SCRIPT DIGITALE OHT</CardTitle>
                <CardDescription>Script pour contacts issus du test auditif en ligne</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Monsieur/Madame [nom client]. Bonjour c'est [Prénom] du service client Amplifon.

Je vous contacte suite à votre test auditif en ligne que vous avez effectué récemment sur
notre site. Vos résultats montrent des signes de perte auditive.
(Le test en ligne est un bon premier indicateur)

Sur les prochaines années, votre audition va continuer d'évoluer et pourra progressivement
baisser sans que vous ne vous en rendiez compte.

-> PROPOSER UN RDV

C'est pourquoi nous aimerions vous proposer un RDV dans le centre Amplifon le plus
proche de chez vous, où vous serez pris en charge par l'un de nos audioprothésistes
experts.

Ce dernier pourra affiner le diagnostic du test auditif que vous avez effectué, en réalisant un
bilan auditif complet.
Et il vous guidera vers les solutions les plus adaptées à vos besoins.
Quel est votre code postal ?
Ça tombe bien, nous avons un centre à proximité de chez vous.

« Êtes-vous déjà appareillé(e) ? »

Si oui : -> Votre appareil est peut-être mal ajusté, nous vous conseillons de le faire vérifier
par l'un de nos experts.


Si non : « Avez-vous une ordonnance ? »

   ●​ Si oui : -> Sélectionner directement le type de RDV 1er RDV avec ordonnance.
   ●​ Si non : -> Sélectionner directement le type de RDV 1er rdv sans ordonnance.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-green-50">
                <CardTitle>SCRIPT DIGITALE TIKTOK</CardTitle>
                <CardDescription>Script pour contacts issus de TikTok</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour, je suis XXXXX du service client Amplifon. Je suis bien avec MR/MME XXXXX?

Enchanté(e) !

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.

Je vous contacte suite à votre demande de bilan auditif ou d'essai d'appareils effectuée sur
TIKTOK.
Je vous appelle donc aujourd'hui pour convenir d'un RDV gratuit dans le centre auditif
AMPLIFON le plus proche de chez vous.

Nous vous proposons en effet d'essayer des aides auditives dernière génération. Au
préalable, il est nécessaire de faire un bilan auditif gratuit avec notre audioprothésiste.

Si la baisse d'audition est avérée, pour démarrer l'essai une prescription médicale sera
nécessaire.

Le centre pourra vous aider à obtenir un RDV avec un ORL si besoin. Vous pourrez ensuite
démarrer votre essai gratuit et sans obligation d'achat de 30 jours.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-green-50">
                <CardTitle>SCRIPT DIGITALE STORE LOCATOR</CardTitle>
                <CardDescription>Script pour contacts issus du store locator sur le site</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour Monsieur/Madame [Nom] , je suis [Prénom] de chez Amplifon.

Je tiens à vous avertir que cet appel est susceptible d'être enregistré, sauf si vous
vous y opposez.


Je vous contacte dans le cadre de votre demande de rappel pour réaliser un bilan auditif ou
un essai gratuit d'aide auditive, effectuée récemment sur le site Amplifon.

Pouvez-vous m'en dire plus sur votre besoin s'il vous plaît ?


         ●​ Si la personne a un doute sur son audition ou a fait une demande de bilan
                                            auditif :

Poser + de questions pour comprendre plus précisément ses problèmes d'audition
(dans quel contexte, quel environnement)

Puis :

" Je vous propose de bénéficier d'un bilan auditif complet et exclusif, avec l'un de nos
experts audioprothésistes, dans le centre Amplifon le plus proche de chez vous. Amplifon
dispose d'un protocole de tests breveté pour une évaluation précise et personnalisée de
votre audition. Ce bilan nous permettra de déterminer votre santé auditive et si perte
d'audition avérée, vous accompagnera dans cette démarche et vous orientera vers la
solution la plus adaptée à vos besoins. "

             ●​ Si la personne souhaite essayer des aides auditives ou a fait une
                                demande d'essai gratuit :

Poser + de questions pour comprendre plus précisément ses problèmes
d'audition (dans quel contexte, quel environnement)

Puis :

" Nous vous proposons en effet d'essayer des aides auditives dernière génération.
Au préalable, il est nécessaire de faire un bilan auditif gratuit avec notre audioprothésiste. Si
la baisse d'audition est avérée, une prescription médicale sera nécessaire pour démarrer
l'essai. Le centre pourra vous aider à obtenir un RDV avec un ORL si besoin. Vous pourrez
ensuite démarrer."
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="entrant" className="space-y-6">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
            <h2 className="text-xl font-bold text-orange-800 mb-2">Scripts APPEL ENTRANT</h2>
            <p className="text-gray-700 mb-4">Scripts pour gérer les appels entrants de clients ou prospects</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-orange-50">
                <CardTitle>SCRIPT APPEL ENTRANT</CardTitle>
                <CardDescription>Script standard pour les appels entrants</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour je suis XXXX, du service client Amplifon. Je travaille avec le centre de XXXX.

Vous êtes bien Monsieur/Madame XXXX? Parfait.

Pour votre information, dans le cadre de notre démarche qualité cet appel est
susceptible d'être enregistré sauf si vous y opposez.

(si refuse d'écouter) Vous êtes client de notre centre amplifon, et justement vos aides
auditives arrivent très prochainement à leur 4ème anniversaire. C'est important que je vous
communique ces quelques informations et que vous soyez bien informé/e. Vous me direz
ensuite ce que vous en pensez

Comme vous le savez certainement,/ comme je viens de vous l'annoncer, votre aide auditive
approche de son 4ème anniversaire, et ne sera plus sous garantie dans les semaines à
venir. Les avantages dont vous disposiez avec le Club Amplifon ne seront donc plus
valables (comme l'assurance pour le remplacement de votre aide auditive en cas de panne,
perte ou casse ainsi que les 10% de remise sur les accessoires, piles et produits
d'entretien…)

Toutefois vous avez désormais la possibilité de les renouveler à leur 4ème anniversaire. Ce
peut-être intéressant d'avoir une nouvelle AA de rechange en cas de casse ou perte de la
première, qui ne pourra plus être remplacée. Qu'en pensez-vous ?

(laisser parler / Argumenter selon l'objection)

(rebondir) Je vous propose un rendez-vous dans votre centre pour réaliser un bilan auditif
et profiter aussi de cette occasion, si vous le souhaitez, pour commencer un nouvel essai de
30 jours. Toujours gratuit et sans engagement.

Ceci vous permettra de comparer nos nouveaux produits avec vos aides auditives actuelles.
Qu'en pensez-vous?
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="amplicard" className="space-y-6">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-6">
            <h2 className="text-xl font-bold text-yellow-800 mb-2">Script AMPLICARD</h2>
            <p className="text-gray-700 mb-4">Script pour proposer la carte Amplicard aux clients</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-yellow-50">
                <CardTitle>SCRIPT AMPLICARD</CardTitle>
                <CardDescription>Script pour proposer l'Amplicard aux clients récents</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm mt-2 max-h-80 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
                    Bonjour c'est XXXX du service client Amplifon. Je travaille avec le centre Amplifon de [Nom
centre], dans lequel vous avez acheté vos AA le XXX

Vous êtes bien Monsieur/Madame [nom client]?

Dans le cadre de notre démarche qualité cet appel est susceptible d'être enregistré sauf si
vous y opposez.

A toute coupure: Je vous contacte suite à l'achat de vos AA. Je souhaite vous transmettre
des informations complémentaires importantes. Vous me direz ce que
vous en pensez ensuite ?

Si laisse parler: Je vous appelle suite à l'achat de vos aides auditives.

Est-ce que tout se passe bien avec vos appareils ces premiers jours? (Ravi de l'entendre)

De mon côté, je voulais savoir si suite à cet achat, le centre (l'audio ou la chargée de
clientèle) vous a présenté les avantages de nos Amplicard ?

Je voulais donc vous rappeler les avantages de ce service, car il vous reste encore
quelques jours pour en profiter. (pour rappel : vous pouvez y souscrire jusqu'à 15 jours
après votre achat).

L'Amplicard a été pensée pour vous apporter un complément de services & bénéficier
d'avantages fidélité. En y souscrivant, vous bénéficiez d'une assistance renforcée pendant 4
ans, avec notamment du matériel de prêt en cas de panne, des remises sur les produits
d'entretien… et une couverture en cas d'imprévu comme une perte, un vol ou une casse.

Si code campagne = Phoning_clients -4_Classe2_ReminderJ+15 :

Pour vos appareils, vous êtes éligible à l'AmpliCard Total. C'est la formule la plus complète,
avec une assistance sur 4 ans. Vous bénéficiez du prêt de matériel en cas de panne, 6 mois
de produits d'entretien, 6 mois de piles gratuites, des remises sur les accessoires, ainsi
qu'une couverture en cas de perte, vol ou casse. Et un bonus de fidélité est prévu à la 4ᵉ
année, pour vous accompagner dans le renouvellement de vos appareils si besoin.

Si code campagne = Phoning_clients -4_Classe1_ReminderJ+15 :

Pour les appareils que vous avez achetés, vous pouvez bénéficier de l'AmpliCard Access ou
de l'AmpliCard Plus. Ces cartes vous offrent une assistance renforcée pendant 4 ans.
L'AmpliCard Access inclut le prêt de matériel en cas de panne, 6 mois de produits
d'entretien offerts, et 6 mois de piles gratuites.

Souhaitez-vous que nous planifiions un rendez-vous avec l'un de nos centres afin d'en
discuter plus en détail ?
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="all" className="space-y-4">
          {filteredScripts?.length === 0 ? (
            <Alert>
              <AlertTitle>Aucun script personnalisé trouvé</AlertTitle>
              <AlertDescription>
                Aucun script ne correspond à votre recherche. Essayez avec des termes différents ou créez un nouveau script personnalisé.
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
        
        <TabsContent value="custom" className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
            <h2 className="text-xl font-bold text-blue-800 mb-2">Scripts Personnalisés</h2>
            <p className="text-gray-700 mb-4">Vos scripts personnalisés créés dans l'application</p>
          </div>
          
          {filteredScripts?.length === 0 ? (
            <Alert>
              <AlertTitle>Aucun script personnalisé trouvé</AlertTitle>
              <AlertDescription>
                Aucun script ne correspond à votre recherche. Créez de nouveaux scripts personnalisés en cliquant sur "Nouveau Script".
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
        
        {categories
          .filter(category => !['hot', 'prospect', 'digi', 'digital', 'amplicard', 'entrant', 'custom', 'all']
            .includes(category.toLowerCase()))
          .map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6">
              <h2 className="text-xl font-bold text-indigo-800 mb-2">Scripts {category.toUpperCase()}</h2>
              <p className="text-gray-700 mb-4">Scripts spécifiques pour la catégorie {category.toUpperCase()}</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredScripts?.filter(script => script.category.toLowerCase() === category.toLowerCase())
                .map((script) => (
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
          </TabsContent>
        ))}
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