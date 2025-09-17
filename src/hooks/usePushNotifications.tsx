import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true
  });

  useEffect(() => {
    checkPushSupport();
  }, []);

  const checkPushSupport = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setState(prev => ({
        ...prev,
        isSupported: true,
        isSubscribed: !!subscription,
        isLoading: false
      }));
    } catch (error) {
      console.error('Erreur lors de la vérification du support push:', error);
      setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.error('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return permission === 'granted';
  };

  const subscribeUser = async (): Promise<boolean> => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        console.error('Permission de notification refusée');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Clé publique VAPID (vous devrez la configurer côté serveur)
      const applicationServerKey = urlBase64ToUint8Array(
        'BMqS3ormk_lRH-5ejU5zGJZhvOLh3GtA8DJzW4jJ5rYwrXywJzyRfgWzabNndbh1FIIY6RqCL2tCbGD5-wuvhBY'
      );

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Envoyer l'abonnement au serveur via edge function
      const { error } = await supabase.functions.invoke('manage-push-subscription', {
        body: {
          action: 'subscribe',
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.getKey('p256dh') ? 
              arrayBufferToBase64(subscription.getKey('p256dh')!) : null,
            auth: subscription.getKey('auth') ? 
              arrayBufferToBase64(subscription.getKey('auth')!) : null
          },
          poste_type: 'livreur'
        }
      });

      if (error) {
        console.error('Erreur lors de l\'enregistrement de l\'abonnement:', error);
        return false;
      }

      setState(prev => ({ ...prev, isSubscribed: true }));
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux notifications:', error);
      return false;
    }
  };

  const unsubscribeUser = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Supprimer l'abonnement du serveur via edge function
        const { error } = await supabase.functions.invoke('manage-push-subscription', {
          body: {
            action: 'unsubscribe',
            endpoint: subscription.endpoint
          }
        });

        if (error) {
          console.error('Erreur lors de la suppression de l\'abonnement:', error);
        }
      }

      setState(prev => ({ ...prev, isSubscribed: false }));
      return true;
    } catch (error) {
      console.error('Erreur lors du désabonnement:', error);
      return false;
    }
  };

  const sendNotification = async (title: string, message: string, data?: any) => {
    try {
      // D'abord essayer d'envoyer via le service worker directement
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('Envoi notification via Service Worker');
        navigator.serviceWorker.controller.postMessage({
          type: 'SEND_NOTIFICATION',
          payload: { title, message, data }
        });
      }

      // Puis envoyer via l'edge function pour les autres abonnements
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title,
          message,
          data,
          poste_type: 'livreur'
        }
      });

      if (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
      return false;
    }
  };

  return {
    ...state,
    subscribeUser,
    unsubscribeUser,
    sendNotification,
    requestPermission
  };
};

// Fonctions utilitaires
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}