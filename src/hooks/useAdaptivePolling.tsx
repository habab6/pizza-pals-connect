import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound, stopNotificationSound } from '@/utils/notificationSound';
import { useToast } from '@/hooks/use-toast';

interface AdaptivePollingOptions {
  role: 'cuisinier' | 'livreur' | 'caissier' | 'pizzaiolo';
  enableRealtime?: boolean;
}

interface Commande {
  id: string;
  numero_commande: string;
  type_commande: 'sur_place' | 'a_emporter' | 'livraison';
  statut: string;
  statut_dolce_italia?: string;
  statut_961_lsf?: string;
  total: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  livreur_id?: string;
  clients?: {
    nom: string;
    telephone?: string;
    adresse?: string;
  };
  commande_items?: Array<{
    quantite: number;
    prix_unitaire: number;
    produits: {
      nom: string;
      categorie: string;
      commerce?: string;
      prix: number;
      est_extra: boolean;
    };
  }>;
}

interface CacheEntry {
  data: Commande[];
  timestamp: number;
  hash: string;
  ttl: number; // Time to live in milliseconds
}

// Détection des heures d'ouverture (14h-3h, fermé 3h-13h)
const isOpenHours = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 14 || hour < 3; // Ouvert de 14h à 2h59
};

// Détection de la période de rush (17h-00h)
const isRushHour = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  
  // Rush : 17h à 00h (minuit)
  return hour >= 17 || hour === 0;
};

// Calcul de l'intervalle adaptatif
const getAdaptiveInterval = (
  role: string, 
  newOrdersCount: number, 
  totalOrders: number,
  lastActivityTime: number
): number => {
  const now = Date.now();
  const timeSinceActivity = now - lastActivityTime;
  
  // Si pas ouvert, intervalle très long
  if (!isOpenHours()) {
    return role === 'caissier' ? 120000 : 60000; // 2min caissier, 1min autres
  }
  
  // Si nouvelles commandes récentes (< 2 minutes), mode rapide
  if (newOrdersCount > 0 || timeSinceActivity < 120000) {
    return isRushHour() ? 3000 : 5000; // 3s rush, 5s normal
  }
  
  // Si période de rush mais pas d'activité récente
  if (isRushHour()) {
    return role === 'caissier' ? 15000 : 10000; // 15s caissier, 10s autres
  }
  
  // Période calme avec activité modérée
  if (totalOrders > 0) {
    return role === 'caissier' ? 30000 : 20000; // 30s caissier, 20s autres
  }
  
  // Période très calme
  return role === 'caissier' ? 60000 : 30000; // 1min caissier, 30s autres
};

export const useAdaptivePolling = ({
  role,
  enableRealtime = true
}: AdaptivePollingOptions) => {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [mesLivraisons, setMesLivraisons] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentInterval, setCurrentInterval] = useState(30000);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>();
  const cacheRef = useRef<CacheEntry | null>(null);
  const previousCountRef = useRef(0);
  const { toast } = useToast();

  // Cache avec TTL adaptatif
  const getCacheTTL = useCallback((role: string): number => {
    if (!isOpenHours()) return 120000; // 2 minutes hors service
    if (isRushHour()) return 10000; // 10 secondes en rush
    return role === 'caissier' ? 30000 : 20000; // 30s caissier, 20s autres
  }, []);

  const isCacheValid = useCallback((cache: CacheEntry | null, role: string): boolean => {
    if (!cache) return false;
    const now = Date.now();
    const ttl = getCacheTTL(role);
    return (now - cache.timestamp) < ttl;
  }, [getCacheTTL]);

  const getQueryConfig = useCallback(() => {
    const baseSelect = `
      *,
      clients (nom, telephone, adresse),
      commande_items (
        quantite,
        prix_unitaire,
        produits (nom, categorie, commerce, prix, est_extra, categorie_custom_id,
          categories (nom)
        )
      )
    `;

    switch (role) {
      case 'cuisinier':
      case 'pizzaiolo':
        return {
          select: baseSelect,
          filters: (query: any) => {
            const statusField = role === 'cuisinier' ? 'statut_961_lsf' : 'statut_dolce_italia';
            return query
              .in(statusField, ['nouveau', 'en_preparation', 'pret'])
              .neq(statusField, 'termine');
          }
        };
      case 'livreur':
        return {
          select: baseSelect,
          filters: (query: any) => query
            .or('statut.eq.pret,statut.eq.en_livraison,statut_dolce_italia.eq.pret,statut_961_lsf.eq.pret')
            .eq('type_commande', 'livraison')
        };
      case 'caissier':
        return {
          select: baseSelect,
          filters: (query: any) => query.neq('statut', 'termine')
        };
      default:
        return {
          select: baseSelect,
          filters: (query: any) => query
        };
    }
  }, [role]);

  const processCommandesData = useCallback((data: any[]) => {
    if (!data) return { processed: [], livraisons: [], count: 0 };

    let processed = data;
    let livraisons: any[] = [];
    let newCount = 0;

    switch (role) {
      case 'cuisinier':
        // Filtrer seulement les commandes avec des articles 961 LSF
        processed = data.filter((commande: any) => 
          commande.commande_items?.some((item: any) => 
            item.produits.commerce === '961_lsf'
          )
        );
        
        newCount = processed.filter((commande: any) => {
          const itemsLSF = commande.commande_items?.filter((item: any) => 
            item.produits.commerce === '961_lsf'
          );
          const statutLSF = commande.statut_961_lsf || 'nouveau';
          return itemsLSF.length > 0 && statutLSF === 'nouveau';
        }).length;
        break;

      case 'pizzaiolo':
        // Filtrer seulement les commandes avec des articles Dolce Italia
        processed = data.filter((commande: any) => 
          commande.commande_items?.some((item: any) => 
            item.produits.commerce === 'dolce_italia'
          )
        );
        
        newCount = processed.filter((commande: any) => {
          const itemsDolce = commande.commande_items?.filter((item: any) => 
            item.produits.commerce === 'dolce_italia'
          );
          const statutDolce = commande.statut_dolce_italia || 'nouveau';
          return itemsDolce.length > 0 && statutDolce === 'nouveau';
        }).length;
        break;

      case 'livreur':
        processed = data.filter(c => 
          c.statut === 'pret' || 
          c.statut_dolce_italia === 'pret' || 
          c.statut_961_lsf === 'pret'
        );
        livraisons = data.filter(c => c.statut === 'en_livraison');
        newCount = processed.length;
        break;

      case 'caissier':
        newCount = data.filter(c => c.statut === 'nouveau').length;
        break;

      default:
        newCount = data.length;
    }

    return { processed, livraisons, count: newCount };
  }, [role]);

  const fetchCommandes = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Vérifier le cache d'abord
    if (!force && isCacheValid(cacheRef.current, role)) {
      return;
    }
    
    try {
      const config = getQueryConfig();
      let query = supabase.from('commandes').select(config.select);
      query = config.filters(query);
      query = query.order('created_at', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Créer un hash pour détecter les changements
      const dataHash = JSON.stringify(data?.map((d: any) => ({ 
        id: d.id, 
        statut: d.statut, 
        statut_dolce_italia: d.statut_dolce_italia,
        statut_961_lsf: d.statut_961_lsf,
        updated_at: d.updated_at 
      })));
      
      // Si pas de changement, pas besoin de mettre à jour
      if (cacheRef.current?.hash === dataHash && !force) {
        return;
      }

      const result = processCommandesData(data || []);
      
      setCommandes(result.processed);
      if (result.livraisons) {
        setMesLivraisons(result.livraisons);
      }

      // Gestion des notifications sonores et activité
      if (result.count > previousCountRef.current && result.count > 0) {
        playNotificationSound();
        setLastActivityTime(now); // Marquer l'activité
      } else if (result.count === 0) {
        stopNotificationSound();
      }
      
      setNewOrdersCount(result.count);
      previousCountRef.current = result.count;

      // Calculer le nouvel intervalle adaptatif
      const newInterval = getAdaptiveInterval(role, result.count, result.processed.length, lastActivityTime);
      setCurrentInterval(newInterval);

      // Mettre à jour le cache
      cacheRef.current = {
        data: result.processed,
        timestamp: now,
        hash: dataHash,
        ttl: getCacheTTL(role)
      };

    } catch (error: any) {
      console.error('Erreur fetch commandes:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les commandes"
      });
    } finally {
      setIsLoading(false);
    }
  }, [getQueryConfig, processCommandesData, role, lastActivityTime, getCacheTTL, isCacheValid, toast]);

  // Setup Realtime optimisé - seulement pour les événements critiques
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('adaptive-commandes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commandes'
        },
        (payload) => {
          console.log('🔄 Realtime critical update:', payload);
          
          // Force un refresh immédiat pour les changements critiques
          const isCritical = payload.eventType === 'INSERT' || 
                            (payload.eventType === 'UPDATE' && 
                             (payload.new?.statut !== payload.old?.statut ||
                              payload.new?.statut_dolce_italia !== payload.old?.statut_dolce_italia ||
                              payload.new?.statut_961_lsf !== payload.old?.statut_961_lsf));
          
          if (isCritical) {
            setLastActivityTime(Date.now());
            fetchCommandes(true);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enableRealtime, fetchCommandes]);

  // Setup polling adaptatif
  useEffect(() => {
    // Fetch initial
    fetchCommandes(true);

    // Setup adaptive interval
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        fetchCommandes();
      }, currentInterval);
    };

    setupInterval();
    
    // Re-setup interval when it changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchCommandes, currentInterval]);

  // Fonction pour forcer un refresh
  const forceRefresh = useCallback(() => {
    setLastActivityTime(Date.now());
    fetchCommandes(true);
  }, [fetchCommandes]);

  return {
    commandes,
    mesLivraisons,
    isLoading,
    forceRefresh,
    // Stats d'optimisation pour debug
    debugInfo: {
      currentInterval: Math.round(currentInterval / 1000),
      newOrdersCount,
      isOpenHours: isOpenHours(),
      isRushHour: isRushHour(),
      cacheAge: cacheRef.current ? Math.round((Date.now() - cacheRef.current.timestamp) / 1000) : 0,
      role
    }
  };
};