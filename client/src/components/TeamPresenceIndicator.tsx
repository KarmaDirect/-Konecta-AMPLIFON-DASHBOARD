import { useState } from 'react';
import { useTeamPresence } from '@/hooks/use-team-presence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Users, Check, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function TeamPresenceIndicator() {
  const { onlineUsers, setUserStatus } = useTeamPresence();
  const [isOpen, setIsOpen] = useState(false);

  // Filtrer les utilisateurs en ligne (ceux avec un statut)
  const filteredUsers = onlineUsers.filter(user => user.status);

  const getStatusColor = (status: 'online' | 'away' | 'busy') => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: 'online' | 'away' | 'busy') => {
    switch (status) {
      case 'online': return <Check className="h-3 w-3" />;
      case 'away': return <Clock className="h-3 w-3" />;
      case 'busy': return <AlertCircle className="h-3 w-3" />;
      default: return null;
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

  const handleStatusChange = (value: string) => {
    setUserStatus(value as 'online' | 'away' | 'busy');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="relative"
        >
          <Users className="h-4 w-4 mr-1" />
          Équipe
          {filteredUsers.length > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[20px] h-5"
              variant="default"
            >
              {filteredUsers.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="font-medium">Votre statut</div>
          <div className="mt-2">
            <Select onValueChange={handleStatusChange} defaultValue="online">
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">
                  <div className="flex items-center">
                    <span className={`h-2 w-2 rounded-full bg-green-500 mr-2`}></span>
                    Disponible
                  </div>
                </SelectItem>
                <SelectItem value="away">
                  <div className="flex items-center">
                    <span className={`h-2 w-2 rounded-full bg-yellow-500 mr-2`}></span>
                    Absent
                  </div>
                </SelectItem>
                <SelectItem value="busy">
                  <div className="flex items-center">
                    <span className={`h-2 w-2 rounded-full bg-red-500 mr-2`}></span>
                    Occupé
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="p-3">
          <h4 className="font-medium mb-2">Membres de l'équipe en ligne ({filteredUsers.length})</h4>
          {filteredUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              Aucun membre de l'équipe en ligne pour le moment.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {filteredUsers.map(user => (
                <TooltipProvider key={user.userId}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center py-2 px-1 hover:bg-accent rounded">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{getUserInitials(user.userName)}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${getStatusColor(user.status)} border-2 border-background`}></div>
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className="font-medium truncate">{user.userName}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.currentPage && `Sur: ${user.currentPage}`}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true, locale: fr })}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <div>
                        <div className="font-semibold">{user.userName}</div>
                        <div className="flex items-center mt-1">
                          <span className={`h-2 w-2 rounded-full ${getStatusColor(user.status)} mr-1.5`}></span>
                          <span className="capitalize">{user.status}</span>
                        </div>
                        {user.currentPage && (
                          <div className="mt-1 text-xs">
                            Navigue sur: {user.currentPage}
                          </div>
                        )}
                        <div className="mt-1 text-xs">
                          Actif {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true, locale: fr })}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}