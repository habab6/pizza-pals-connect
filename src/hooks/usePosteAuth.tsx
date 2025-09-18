import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

export interface PosteSession {
  posteId: string;
  posteName: string;
  authenticatedAt: number;
}

const MASTER_PASSWORD = 'DI961LSF';

export const usePosteAuth = () => {
  const [currentSession, setCurrentSession] = useState<PosteSession | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Vérifier s'il y a une session valide au chargement
    const savedSession = localStorage.getItem('posteSession');
    if (savedSession) {
      try {
        const session: PosteSession = JSON.parse(savedSession);
        
        // Vérifier l'expiration de la session (24h)
        const isExpired = Date.now() - session.authenticatedAt > 24 * 60 * 60 * 1000; // 24h
        
        if (isExpired) {
          localStorage.removeItem('posteSession');
          setCurrentSession(null);
        } else {
          setCurrentSession(session);
        }
      } catch (error) {
        localStorage.removeItem('posteSession');
      } finally {
        setInitialized(true);
      }
    } else {
      setInitialized(true);
    }

    // La session persiste maintenant dans localStorage
    // Elle ne sera supprimée que par :
    // 1. Déconnexion manuelle (bouton déconnecter)
    // 2. Expiration après 24h d'inactivité
    // 3. Fermeture du navigateur (pas du simple refresh)
    
    const handleBeforeUnload = () => {
      // On marque seulement que l'utilisateur ferme la page
      // La vraie suppression se fera après un délai si l'utilisateur ne revient pas
      sessionStorage.setItem('pageClosing', Date.now().toString());
    };

    const handlePageShow = () => {
      // Si l'utilisateur revient (refresh), on annule la fermeture
      sessionStorage.removeItem('pageClosing');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const authenticatePoste = async (posteId: string, password: string): Promise<boolean> => {
    try {
      // Vérifier d'abord avec le master password
      if (password === MASTER_PASSWORD) {
        const { data: posteData } = await supabase
          .from('poste_passwords')
          .select('poste_name')
          .eq('poste_id', posteId)
          .single();

        if (posteData) {
          const session: PosteSession = {
            posteId,
            posteName: posteData.poste_name,
            authenticatedAt: Date.now()
          };
          
          setCurrentSession(session);
          localStorage.setItem('posteSession', JSON.stringify(session));
          return true;
        }
      }

      // Sinon, vérifier avec le mot de passe spécifique du poste
      const { data: posteData } = await supabase
        .from('poste_passwords')
        .select('poste_name, password_hash')
        .eq('poste_id', posteId)
        .single();

      if (!posteData) {
        return false;
      }

      const isValidPassword = await bcrypt.compare(password, posteData.password_hash);
      
      if (isValidPassword) {
        const session: PosteSession = {
          posteId,
          posteName: posteData.poste_name,
          authenticatedAt: Date.now()
        };
        
        setCurrentSession(session);
        localStorage.setItem('posteSession', JSON.stringify(session));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur lors de l\'authentification:', error);
      return false;
    }
  };

  const logout = () => {
    setCurrentSession(null);
    localStorage.removeItem('posteSession');
  };

  const isAuthenticated = (posteId?: string): boolean => {
    if (!currentSession) return false;
    
    return posteId ? currentSession.posteId === posteId : true;
  };

  return {
    currentSession,
    authenticatePoste,
    logout,
    isAuthenticated,
    initialized
  };
};