import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import CaissierDashboard from "@/components/dashboard/CaissierDashboard";
import PizzaioloDashboard from "@/components/dashboard/PizzaioloDashboard";
import CuisinierDashboard from "@/components/dashboard/CuisinierDashboard";
import LivreurDashboard from "@/components/dashboard/LivreurDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";
import { usePosteAuth } from "@/hooks/usePosteAuth";
import { DebugInfoButton } from "@/components/ui/DebugInfoButton";

const Dashboard = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, logout, currentSession, initialized } = usePosteAuth();

  useEffect(() => {
    // Vérifier l'authentification au chargement de la page
    if (!role || !['caissier', 'pizzaiolo', 'cuisinier', 'livreur'].includes(role)) {
      navigate("/");
      return;
    }

    if (!initialized) return; // attendre l'initialisation de la session

    if (!isAuthenticated(role)) {
      // Pas authentifié pour ce poste, rediriger vers l'accueil
      navigate("/");
      return;
    }
  }, [role, initialized, isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
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
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">
                Dashboard | {getRoleName(role)}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                {currentSession && (
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4 text-green-600" />
                    <span>Connecté</span>
                  </div>
                )}
              </div>
              <DebugInfoButton role={role as any} />
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Lock className="h-4 w-4" />
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
        {role === 'cuisinier' && <CuisinierDashboard />}
        {role === 'livreur' && <LivreurDashboard />}
      </main>
    </div>
  );
};

export default Dashboard;