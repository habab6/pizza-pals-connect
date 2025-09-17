import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

export interface PosteSession {
  posteId: string;
  posteName: string;
  authenticatedAt: number;
}

const MASTER_PASSWORD = 'DI961LSF';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 heures en millisecondes

export const usePosteAuth = () => {
  const [currentSession, setCurrentSession] = useState<PosteSession | null>(null);

  useEffect(() => {
    // Vérifier s'il y a une session valide au chargement
    const savedSession = localStorage.getItem('posteSession');
    if (savedSession) {
      try {
        const session: PosteSession = JSON.parse(savedSession);
        const now = Date.now();
        
        // Vérifier si la session n'est pas expirée
        if (now - session.authenticatedAt < SESSION_DURATION) {
          setCurrentSession(session);
        } else {
          // Session expirée, la supprimer
          localStorage.removeItem('posteSession');
        }
      } catch (error) {
        localStorage.removeItem('posteSession');
      }
    }
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
    
    const now = Date.now();
    const sessionValid = now - currentSession.authenticatedAt < SESSION_DURATION;
    
    if (!sessionValid) {
      logout();
      return false;
    }

    return posteId ? currentSession.posteId === posteId : true;
  };

  return {
    currentSession,
    authenticatePoste,
    logout,
    isAuthenticated
  };
};