import { useState } from 'react';
import { useTeamPresence } from '@/hooks/use-team-presence';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Filter, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type ActivityType = 'all' | 'appointment' | 'help' | 'agent' | 'script';

export function ActivityFeed() {
  const { activities } = useTeamPresence();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>(['all']);

  const toggleType = (type: ActivityType) => {
    setSelectedTypes(prev => {
      // Si on clique sur "all", on ne garde que "all"
      if (type === 'all') {
        return ['all'];
      }
      
      // Si "all" est sélectionné et qu'on clique sur un autre type, on enlève "all"
      const withoutAll = prev.filter(t => t !== 'all');
      
      // Si le type est déjà sélectionné, on l'enlève
      if (withoutAll.includes(type)) {
        const newTypes = withoutAll.filter(t => t !== type);
        // Si aucun type n'est sélectionné, on sélectionne "all"
        return newTypes.length === 0 ? ['all'] : newTypes;
      }
      
      // Sinon, on l'ajoute
      return [...withoutAll, type];
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('rendez-vous') || action.includes('RDV')) {
      return 'bg-blue-500';
    } else if (action.includes('aide')) {
      return 'bg-red-500';
    } else if (action.includes('script')) {
      return 'bg-amber-500';
    } else if (action.includes('objectif')) {
      return 'bg-green-500';
    } else if (action.includes('connecté')) {
      return 'bg-purple-500';
    } else {
      return 'bg-gray-500';
    }
  };

  const getActionType = (action: string): ActivityType => {
    if (action.includes('rendez-vous') || action.includes('RDV')) {
      return 'appointment';
    } else if (action.includes('aide')) {
      return 'help';
    } else if (action.includes('script')) {
      return 'script';
    } else {
      return 'agent';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('rendez-vous') || action.includes('RDV')) {
      return <Bell className="h-4 w-4 text-blue-500" />;
    } else if (action.includes('aide')) {
      return <Bell className="h-4 w-4 text-red-500" />;
    } else if (action.includes('script')) {
      return <Activity className="h-4 w-4 text-amber-500" />;
    } else {
      return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const filteredActivities = activities.filter(activity => {
    if (selectedTypes.includes('all')) {
      return true;
    }
    return selectedTypes.includes(getActionType(activity.action));
  });

  // Nombre d'activités à afficher initialement
  const displayCount = isExpanded ? filteredActivities.length : 5;

  return (
    <Card className="col-span-full rounded-lg border-blue-200 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-blue-100">
        <div>
          <CardTitle className="text-lg font-semibold text-blue-900">Activité de l'équipe</CardTitle>
          <CardDescription className="text-xs text-blue-600">
            Suivez en temps réel les actions sur vos objectifs
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Filtrer
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <div className="font-medium">Filtrer par type</div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="filter-all" 
                    checked={selectedTypes.includes('all')}
                    onCheckedChange={() => toggleType('all')}
                  />
                  <Label htmlFor="filter-all">Tous</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="filter-appointment" 
                    checked={selectedTypes.includes('appointment')}
                    onCheckedChange={() => toggleType('appointment')}
                  />
                  <Label htmlFor="filter-appointment">Rendez-vous</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="filter-help" 
                    checked={selectedTypes.includes('help')}
                    onCheckedChange={() => toggleType('help')}
                  />
                  <Label htmlFor="filter-help">Demandes d'aide</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="filter-agent" 
                    checked={selectedTypes.includes('agent')}
                    onCheckedChange={() => toggleType('agent')}
                  />
                  <Label htmlFor="filter-agent">Agents</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="filter-script" 
                    checked={selectedTypes.includes('script')}
                    onCheckedChange={() => toggleType('script')}
                  />
                  <Label htmlFor="filter-script">Scripts</Label>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="p-2 max-h-[calc(100vh-250px)] overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Aucune activité récente
          </div>
        ) : (
          <div className="space-y-2">
            {filteredActivities.slice(0, displayCount).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-2 p-2 hover:bg-blue-50 rounded-md transition-colors">
                <Avatar className="h-6 w-6 rounded-full">
                  <AvatarFallback className="text-xs bg-blue-600 text-white">{getUserInitials(activity.userName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-xs text-blue-900">{activity.userName}</span>
                      <Badge className="ml-1 h-5 px-1.5" variant="outline">
                        {getActionIcon(activity.action)}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-gray-500 italic">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700">
                    <span className="text-blue-700">{activity.action}</span>
                    {activity.target && <span className="font-medium"> {activity.target}</span>}
                  </p>
                  {activity.details && (
                    <div className="mt-1 text-[10px] bg-gray-50 p-1.5 rounded border border-gray-200">
                      {typeof activity.details === 'object' 
                        ? JSON.stringify(activity.details, null, 2)
                          .replace(/{|}|"|,/g, '')
                          .replace(/:/g, ': ')
                        : String(activity.details)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {filteredActivities.length > 5 && (
              <Button 
                variant="outline" 
                className="w-full mt-2 h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-800" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Afficher moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Afficher plus ({filteredActivities.length - 5})
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}