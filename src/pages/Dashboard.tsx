import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import CaissierDashboard from "@/components/dashboard/CaissierDashboard";
import PizzaioloDashboard from "@/components/dashboard/PizzaioloDashboard";
import LivreurDashboard from "@/components/dashboard/LivreurDashboard";
import CuisinierDashboard from "@/components/dashboard/CuisinierDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pizza } from "lucide-react";

const Dashboard = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!role || !['caissier', 'pizzaiolo', 'cuisinier', 'livreur'].includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Rôle invalide</h1>
          <p className="text-gray-600 mb-4">Veuillez sélectionner un rôle valide.</p>
          <Button onClick={() => navigate("/")} className="bg-red-600 hover:bg-red-700">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'caissier': return 'Caissier';
      case 'pizzaiolo': return 'Pizzaiolo';
      case 'cuisinier': return 'Cuisinier';
      case 'livreur': return 'Livreur';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Pizza className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-800">
                  {role === 'cuisinier' ? '961 LSF' : 'Dolce Italia'}
                </h1>
                <p className="text-sm text-gray-600">{getRoleName(role)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <span>Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {role === 'caissier' && <CaissierDashboard />}
        {role === 'pizzaiolo' && <PizzaioloDashboard />}
        {role === 'cuisinier' && <CuisinierDashboard userProfile={userProfile} />}
        {role === 'livreur' && <LivreurDashboard />}
      </main>
    </div>
  );
};

export default Dashboard;