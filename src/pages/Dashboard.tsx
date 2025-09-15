import { useAuth } from "@/hooks/useAuth";
import CaissierDashboard from "@/components/dashboard/CaissierDashboard";
import PizzaioloDashboard from "@/components/dashboard/PizzaioloDashboard";
import LivreurDashboard from "@/components/dashboard/LivreurDashboard";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { LogOut, Pizza } from "lucide-react";

const Dashboard = () => {
  const { profile, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Profil introuvable</h1>
          <p className="text-gray-600 mb-4">Veuillez vous reconnecter.</p>
          <Button onClick={signOut} className="bg-red-600 hover:bg-red-700">
            Se reconnecter
          </Button>
        </div>
      </div>
    );
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'caissier': return 'Caissier';
      case 'pizzaiolo': return 'Pizzaiolo';
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
                <h1 className="text-xl font-bold text-red-800">Dolce Italia</h1>
                <p className="text-sm text-gray-600">{getRoleName(profile.role)} - {profile.nom}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationBell />
              <Button
                variant="outline"
                onClick={signOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profile.role === 'caissier' && <CaissierDashboard />}
        {profile.role === 'pizzaiolo' && <PizzaioloDashboard />}
        {profile.role === 'livreur' && <LivreurDashboard />}
      </main>
    </div>
  );
};

export default Dashboard;