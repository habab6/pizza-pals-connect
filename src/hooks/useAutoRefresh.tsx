import { useEffect, useRef } from 'react';

interface UseAutoRefreshProps {
  refreshFunction: () => void | Promise<void>;
  intervalMs?: number;
  enabled?: boolean;
}

export const useAutoRefresh = ({ 
  refreshFunction, 
  intervalMs = 1000, // 1 seconde par défaut
  enabled = true 
}: UseAutoRefreshProps) => {
  const intervalRef = useRef<NodeJS.Timeout>();
  const refreshFunctionRef = useRef(refreshFunction);

  // Mettre à jour la référence de la fonction sans redémarrer l'intervalle
  useEffect(() => {
    refreshFunctionRef.current = refreshFunction;
  }, [refreshFunction]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      return;
    }

    // Démarrer le rafraîchissement automatique
    intervalRef.current = setInterval(() => {
      try {
        const result = refreshFunctionRef.current();
        if (result instanceof Promise) {
          result.catch(console.error);
        }
      } catch (error) {
        console.error('Erreur lors du rafraîchissement automatique:', error);
      }
    }, intervalMs);

    // Nettoyage à la destruction du composant
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs, enabled]);

  // Fonction pour forcer un rafraîchissement immédiat
  const forceRefresh = () => {
    try {
      const result = refreshFunctionRef.current();
      if (result instanceof Promise) {
        result.catch(console.error);
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement forcé:', error);
    }
  };

  return { forceRefresh };
};