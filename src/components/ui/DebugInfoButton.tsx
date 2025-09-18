import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";

interface DebugInfoButtonProps {
  role: 'caissier' | 'pizzaiolo' | 'cuisinier' | 'livreur';
}

export const DebugInfoButton = ({ role }: DebugInfoButtonProps) => {
  const { debugInfo } = useAdaptivePolling({
    role,
    enableRealtime: false
  });

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Informations de debug</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              Intervalle: {debugInfo.currentInterval}s
            </Badge>
            <Badge variant="outline">
              Nouvelles: {debugInfo.newOrdersCount}
            </Badge>
            <Badge variant={debugInfo.isOpenHours ? "default" : "secondary"}>
              {debugInfo.isOpenHours ? "Ouvert" : "Fermé"}
            </Badge>
            <Badge variant={debugInfo.isRushHour ? "destructive" : "secondary"}>
              {debugInfo.isRushHour ? "Rush" : "Calme"}
            </Badge>
            <Badge variant="outline">
              Cache: {debugInfo.cacheAge}s
            </Badge>
            <Badge variant="outline">
              {debugInfo.role}
            </Badge>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};