import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface DebugInfoProps {
  debugInfo: {
    currentInterval: number;
    newOrdersCount: number;
    isOpenHours: boolean;
    isRushHour: boolean;
    cacheAge: number;
    role: string;
  };
}

export const DebugInfo = ({ debugInfo }: DebugInfoProps) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <Card className="mb-4 border-dashed border-gray-300">
      <CardContent className="p-3">
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
      </CardContent>
    </Card>
  );
};