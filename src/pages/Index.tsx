import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Pizza, Sandwich, Truck, Lock, LogOut } from "lucide-react";
import { PosteLoginModal } from "@/components/auth/PosteLoginModal";
import { usePosteAuth } from "@/hooks/usePosteAuth";

const Index = () => {
  const navigate = useNavigate();
  const { authenticatePoste, currentSession, logout, initialized, isAuthenticated } = usePosteAuth();
  
  const [selectedPoste, setSelectedPoste] = useState<{id: string, name: string} | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Redirection automatique si une session est déjà active
  useEffect(() => {
    if (initialized && currentSession && isAuthenticated(currentSession.posteId)) {
      console.log('Session active détectée, redirection vers:', currentSession.posteId);
      navigate(`/dashboard/${currentSession.posteId}`);
    }
  }, [initialized, currentSession, isAuthenticated, navigate]);

  const handleRoleSelection = (roleId: string, roleName: string) => {
    setSelectedPoste({ id: roleId, name: roleName });
    setShowLoginModal(true);
  };

  const handleAuthenticate = async (password: string): Promise<boolean> => {
    if (!selectedPoste) return false;
    
    const success = await authenticatePoste(selectedPoste.id, password);
    if (success) {
      // Sauvegarder l'ID du poste avant de fermer la modal
      const posteId = selectedPoste.id;
      
      // Fermer la modal d'abord
      setShowLoginModal(false);
      setSelectedPoste(null);
      
      // Rediriger vers le dashboard avec un petit délai pour laisser la modal se fermer
      setTimeout(() => {
        navigate(`/dashboard/${posteId}`);
      }, 100);
    }
    return success;
  };

  const handleLogout = () => {
    logout();
  };

  const roles = [
    {
      id: 'caissier',
      name: 'Caisse',
      description: 'Gestion des commandes et encaissements',
      icon: Receipt,
      color: 'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'livreur',
      name: 'Livraisons',
      description: 'Gestion des livraisons',
      icon: Truck,
      color: 'bg-green-500 hover:bg-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'pizzaiolo',
      name: 'Dolce Italia',
      description: 'Préparation pizzas, pâtes & desserts',
      icon: Pizza,
      color: 'bg-red-500 hover:bg-red-600',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      id: 'cuisinier',
      name: '961 LSF',
      description: 'Préparation sandwiches, salades & frites',
      icon: Sandwich,
      color: 'bg-orange-500 hover:bg-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
            <Pizza className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Système de gestion
          </h1>
          <p className="text-xl text-gray-600">
            Sélectionnez votre espace de travail
          </p>
          
          {/* Message si session active mais sur l'accueil */}
          {currentSession && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg inline-block">
              <div className="flex items-center justify-center space-x-3">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">Session active: {currentSession.posteName}</span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigate(`/dashboard/${currentSession.posteId}`)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Reprendre
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <LogOut className="h-3 w-3 mr-1" />
                    Changer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const IconComponent = role.icon;
            return (
              <Card 
                key={role.id}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl border-0 shadow-lg relative"
                onClick={() => handleRoleSelection(role.id, role.name)}
              >
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Indicateur de sécurité */}
                    <div className="absolute top-3 right-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                        <Lock className="h-3 w-3 text-red-600" />
                      </div>
                    </div>
                    
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full ${role.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className={`h-8 w-8 ${role.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {role.name}
                      </h3>
                      <p className="text-gray-600">
                        {role.description}
                      </p>
                    </div>
                    <Button 
                      className={`w-full mt-4 ${role.color} text-white font-semibold py-3 rounded-lg transition-all duration-300 group-hover:shadow-lg`}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Accéder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Plateforme de gestion Dolce Italia & 961 LSF
          </p>
        </div>
      </div>

      {/* Modal de connexion */}
      {selectedPoste && (
        <PosteLoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onAuthenticate={handleAuthenticate}
          posteName={selectedPoste.name}
          posteId={selectedPoste.id}
        />
      )}
    </div>
  );
};

export default Index;
