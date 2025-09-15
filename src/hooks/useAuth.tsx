import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  nom: string;
  role: 'caissier' | 'pizzaiolo' | 'livreur';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Récupérer le profil utilisateur avec .maybeSingle() pour éviter l'erreur si le profil n'existe pas
          let { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          // Si le profil n'existe pas, le créer depuis les métadonnées
          if (!profileData && !profileError) {
            const userData = session.user.user_metadata;
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                user_id: session.user.id,
                nom: userData?.nom || userData?.email?.split('@')[0] || 'Utilisateur',
                role: userData?.role || 'caissier'
              })
              .select()
              .single();
            
            if (!createError) {
              profileData = newProfile;
            }
          }
          
          setProfile(profileData);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Vérifier la session existante
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
          
        // Si le profil n'existe pas, le créer
        if (!profileData && !profileError) {
          const userData = session.user.user_metadata;
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: session.user.id,
              nom: userData?.nom || userData?.email?.split('@')[0] || 'Utilisateur',
              role: userData?.role || 'caissier'
            })
            .select()
            .single();
          
          if (!createError) {
            profileData = newProfile;
          }
        }
        
        setProfile(profileData);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};