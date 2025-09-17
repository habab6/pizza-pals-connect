import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

const PushNotificationSetup = () => {
  const { isSupported, isSubscribed, isLoading, subscribeUser, unsubscribeUser } = usePushNotifications();
  const { toast } = useToast();

  const handleSubscribe = async () => {
    const success = await subscribeUser();
    if (success) {
      toast({
        title: "Notifications activées",
        description: "Vous recevrez maintenant les notifications de nouvelles livraisons"
      });
    } else {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'activer les notifications"
      });
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribeUser();
    if (success) {
      toast({
        title: "Notifications désactivées",
        description: "Vous ne recevrez plus de notifications push"
      });
    } else {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de désactiver les notifications"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-300 h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-800">
            <Smartphone className="h-5 w-5" />
            <span>Notifications Push</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700 text-sm">
            Votre navigateur ne supporte pas les notifications push. 
            Installez l'application sur votre téléphone pour recevoir les notifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isSubscribed ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-green-600" />
          ) : (
            <BellOff className="h-5 w-5 text-blue-600" />
          )}
          <span>Notifications Push</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">
          {isSubscribed 
            ? "Vous recevez les notifications de nouvelles livraisons sur cet appareil."
            : "Activez les notifications pour être alerté des nouvelles livraisons même quand l'app n'est pas ouverte."
          }
        </p>
        
        <div className="flex space-x-2">
          {isSubscribed ? (
            <Button 
              onClick={handleUnsubscribe}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <BellOff className="h-4 w-4" />
              <span>Désactiver</span>
            </Button>
          ) : (
            <Button 
              onClick={handleSubscribe}
              size="sm"
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700"
            >
              <Bell className="h-4 w-4" />
              <span>Activer les notifications</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PushNotificationSetup;