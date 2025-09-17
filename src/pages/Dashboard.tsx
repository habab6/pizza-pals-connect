import { useParams, useNavigate } from "react-router-dom";
import CaissierDashboard from "@/components/dashboard/CaissierDashboard";
import PizzaioloDashboard from "@/components/dashboard/PizzaioloDashboard";
import CuisinierDashboard from "@/components/dashboard/CuisinierDashboard";
import LivreurDashboard from "@/components/dashboard/LivreurDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Dashboard = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();

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
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour</span>
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