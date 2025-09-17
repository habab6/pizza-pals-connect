import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound, stopNotificationSound } from '@/utils/notificationSound';
import { useToast } from '@/hooks/use-toast';

interface OptimizedCommandesOptions {
  role: 'cuisinier' | 'livreur' | 'caissier';
  intervalMs?: number;
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
  livreur_id?: string;
  clients?: {
    nom: string;
    telephone?: string;
    adresse?: string;
  };
  commande_items?: Array<{
    quantite: number;
    produits: {
      nom: string;
      categorie: string;
      commerce?: string;
    };
  }>;
}

export const useOptimizedCommandes = ({
  role,
  intervalMs = role === 'cuisinier' ? 3000 : role === 'livreur' ? 5000 : 10000,
  enableRealtime = true
}: OptimizedCommandesOptions) => {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [mesLivraisons, setMesLivraisons] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previousCount, setPreviousCount] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>();
  const lastFetchRef = useRef<number>(0);
  const { toast } = useToast();

  // Cache pour éviter les re-requêtes inutiles
  const cacheRef = useRef<{
    data: Commande[];
    timestamp: number;
    hash: string;
  } | null>(null);

  const getQueryConfig = useCallback(() => {
    const baseSelect = `
      *,
      clients (nom, telephone, adresse),
      commande_items (
        quantite,
        produits (nom, categorie, commerce)
      )
    `;

    switch (role) {
      case 'cuisinier':
        return {
          select: baseSelect,
          filters: (query: any) => query
            .in('statut_961_lsf', ['nouveau', 'en_preparation', 'pret'])
            .neq('statut_961_lsf', 'termine')
        };
      case 'livreur':
        return {
          select: baseSelect,
          filters: (query: any) => query.eq('type_commande', 'livraison')
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
    if (!data) return { processed: [], count: 0 };

    switch (role) {
      case 'cuisinier':
        // Filtrer seulement les commandes avec des articles 961 LSF
        const commandesLSF = data.filter((commande: any) => 
          commande.commande_items?.some((item: any) => 
            ['entrees', 'sandwiches', 'bowls_salades', 'frites'].includes(item.produits.categorie)
          )
        );
        
        const newCount = commandesLSF.filter((commande: any) => {
          const itemsLSF = commande.commande_items?.filter((item: any) => 
            ['entrees', 'sandwiches', 'bowls_salades', 'frites'].includes(item.produits.categorie)
          );
          const statutLSF = commande.statut_961_lsf || 'nouveau';
          return itemsLSF.length > 0 && statutLSF === 'nouveau';
        }).length;
        
        return { processed: commandesLSF, count: newCount };

      case 'livreur':
        const commandesDisponibles = data.filter(c => c.statut === 'pret');
        const enLivraison = data.filter(c => c.statut === 'en_livraison');
        return { 
          processed: commandesDisponibles, 
          livraisons: enLivraison,
          count: commandesDisponibles.length 
        };

      default:
        return { processed: data, count: data.length };
    }
  }, [role]);

  const fetchCommandes = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Éviter les requêtes trop fréquentes (pas plus d'une par seconde)
    if (!force && now - lastFetchRef.current < 1000) {
      return;
    }
    
    try {
      const config = getQueryConfig();
      let query = supabase.from('commandes').select(config.select);
      query = config.filters(query);
      query = query.order('created_at', { ascending: true });

      const { data, error } = await query;
      lastFetchRef.current = now;

      if (error) throw error;

      // Vérifier si les données ont changé
      const dataHash = JSON.stringify(data?.map((d: any) => ({ id: d.id, statut: d.statut, updated_at: d.updated_at })));
      if (cacheRef.current?.hash === dataHash && !force) {
        return; // Pas de changement, pas besoin de mettre à jour
      }

      // Traiter les données selon le rôle
      const result = processCommandesData(data || []);
      
      setCommandes(result.processed);
      if (result.livraisons) {
        setMesLivraisons(result.livraisons);
      }

      // Gestion des notifications sonores
      if (result.count > previousCount && result.count > 0) {
        playNotificationSound();
      } else if (result.count === 0) {
        stopNotificationSound();
      }
      
      setPreviousCount(result.count);

      // Mettre à jour le cache
      cacheRef.current = {
        data: result.processed,
        timestamp: now,
        hash: dataHash
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
  }, [getQueryConfig, processCommandesData, previousCount, toast]);

  // Setup Realtime pour les notifications critiques
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('commandes-optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commandes'
        },
        (payload) => {
          console.log('🔄 Realtime update:', payload);
          // Force un refresh immédiat pour les changements critiques
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && 
               (payload.new?.statut !== payload.old?.statut ||
                payload.new?.statut_dolce_italia !== payload.old?.statut_dolce_italia ||
                payload.new?.statut_961_lsf !== payload.old?.statut_961_lsf))) {
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

  // Setup polling avec intervalle optimisé
  useEffect(() => {
    // Fetch initial
    fetchCommandes(true);

    // Setup interval
    intervalRef.current = setInterval(() => {
      fetchCommandes();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchCommandes, intervalMs]);

  // Fonction pour forcer un refresh
  const forceRefresh = useCallback(() => {
    fetchCommandes(true);
  }, [fetchCommandes]);

  return {
    commandes,
    mesLivraisons,
    isLoading,
    forceRefresh,
    // Stats d'optimisation
    cacheInfo: cacheRef.current
  };
};