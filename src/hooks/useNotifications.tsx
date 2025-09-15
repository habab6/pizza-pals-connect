import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface Notification {
  id: string;
  titre: string;
  message: string;
  lu: boolean;
  created_at: string;
  commande_id?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  // ID fictif pour les notifications (sans auth)
  const userId = '00000000-0000-0000-0000-000000000000';

  // Demander la permission pour les notifications
  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  };

  // Enregistrer le service worker
  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker enregistré:', registration);
        return registration;
      } catch (error) {
        console.error('Erreur enregistrement Service Worker:', error);
        return null;
      }
    }
    return null;
  };

  // Afficher une notification locale
  const showNotification = (title: string, body: string, data?: any) => {
    if (permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/placeholder.svg',
        badge: '/placeholder.svg',
        data,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Fermer automatiquement après 5 secondes
      setTimeout(() => notification.close(), 5000);
    }
  };

  // Charger les notifications (simulé)
  const fetchNotifications = async () => {
    // Sans auth, on ne charge pas vraiment les notifications
    setNotifications([]);
    setUnreadCount(0);
  };

  // Marquer une notification comme lue
  const markAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, lu: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, lu: true }))
    );
    setUnreadCount(0);
  };

  useEffect(() => {
    // Vérifier la permission actuelle
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Enregistrer le service worker
    registerServiceWorker();
    
    // Charger les notifications
    fetchNotifications();
  }, []);

  return {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    showNotification,
    fetchNotifications
  };
};