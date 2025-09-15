import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface NotificationItem {
  id: string;
  titre: string;
  message: string;
  lu: boolean;
  created_at: string;
  commande_id?: string | null;
  user_id: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [profileId, setProfileId] = useState<string | null>(null);
  const { toast } = useToast();

  const computeUnread = useCallback((list: NotificationItem[]) => {
    setUnreadCount(list.filter(n => !n.lu).length);
  }, []);

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
        console.info('Service Worker enregistré:', registration);
        return registration;
      } catch (error) {
        console.error('Erreur enregistrement Service Worker:', error);
        return null;
      }
    }
    return null;
  };

  const fetchProfileId = useCallback(async () => {
    // Récupérer l'utilisateur courant
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setProfileId(null);
      return null;
    }
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (error || !profile) {
      setProfileId(null);
      return null;
    }
    setProfileId(profile.id);
    return profile.id as string;
  }, []);

  // Charger les notifications depuis Supabase
  const fetchNotifications = useCallback(async () => {
    try {
      const pid = profileId ?? (await fetchProfileId());
      if (!pid) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', pid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data || []) as NotificationItem[];
      setNotifications(list);
      computeUnread(list);
    } catch (e: any) {
      console.error('Erreur chargement notifications:', e?.message);
    }
  }, [profileId, computeUnread, fetchProfileId]);

  // Marquer une notification comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('id', notificationId);
      if (error) throw error;
      setNotifications(prev => {
        const list = prev.map(n => (n.id === notificationId ? { ...n, lu: true } : n));
        computeUnread(list);
        return list;
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de marquer comme lue" });
    }
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    try {
      if (!profileId) return;
      const { error } = await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('user_id', profileId);
      if (error) throw error;
      setNotifications(prev => {
        const list = prev.map(n => ({ ...n, lu: true }));
        computeUnread(list);
        return list;
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de tout marquer comme lu" });
    }
  };

  // Afficher une notification locale
  const showNotification = (title: string, body: string, data?: any) => {
    if (permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: '/placeholder.svg',
        badge: '/placeholder.svg',
        data,
        requireInteraction: false
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      setTimeout(() => n.close(), 5000);
    }
  };

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
    registerServiceWorker();
    fetchProfileId().then(() => fetchNotifications());

    // Realtime
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        // Filtrer par user courant
        const row = (payload.new || payload.old) as NotificationItem | undefined;
        if (!row) return;
        setNotifications(prev => {
          let list = prev;
          if (payload.eventType === 'INSERT') {
            list = [row, ...prev];
            if (row && !row.lu) {
              computeUnread(list);
              showNotification(row.titre, row.message, { commande_id: row.commande_id });
            }
          } else if (payload.eventType === 'UPDATE') {
            list = prev.map(n => (n.id === row.id ? (row as NotificationItem) : n));
            computeUnread(list);
          }
          return list;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, fetchProfileId, computeUnread]);

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
