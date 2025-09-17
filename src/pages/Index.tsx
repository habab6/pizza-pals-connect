import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Pizza, Sandwich, Truck } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: string) => {
    navigate(`/dashboard/${role}`);
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
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const IconComponent = role.icon;
            return (
              <Card 
                key={role.id}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl border-0 shadow-lg"
                onClick={() => handleRoleSelection(role.id)}
              >
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center space-y-4">
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
    </div>
  );
};

export default Index;
