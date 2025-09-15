import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
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
  const { profile } = useAuth();
  const { toast } = useToast();

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

  // Charger les notifications
  const fetchNotifications = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.lu).length);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  // Marquer une notification comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, lu: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('user_id', profile.id)
        .eq('lu', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, lu: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur marquage tout lu:', error);
    }
  };

  useEffect(() => {
    // Vérifier la permission actuelle
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Enregistrer le service worker
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!profile) return;

    fetchNotifications();

    // Écouter les nouvelles notifications en temps réel
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Ajouter à la liste
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Afficher notification locale et toast
          showNotification(newNotification.titre, newNotification.message);
          toast({
            title: newNotification.titre,
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, permission, toast]);

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