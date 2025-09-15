import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pizza } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: string) => {
    navigate(`/dashboard/${role}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <Pizza className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="mb-4 text-4xl font-bold text-red-800">Dolce Italia</h1>
        <p className="text-xl text-gray-600 mb-8">Choisissez votre rôle</p>
        
        <div className="space-y-4">
          <Button 
            onClick={() => handleRoleSelection('caissier')}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
          >
            Caissier
          </Button>
          <Button 
            onClick={() => handleRoleSelection('pizzaiolo')}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
          >
            Pizzaiolo
          </Button>
          <Button 
            onClick={() => handleRoleSelection('livreur')}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
          >
            Livreur
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
