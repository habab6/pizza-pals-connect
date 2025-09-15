import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Pizza } from "lucide-react";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      navigate("/dashboard");
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (user && profile) {
    return null; // Redirect handled by useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <Pizza className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="mb-4 text-4xl font-bold text-red-800">Dolce Italia</h1>
        <p className="text-xl text-gray-600 mb-8">Système de gestion pour pizzeria</p>
        <Button 
          onClick={() => navigate("/auth")}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
        >
          Se connecter
        </Button>
      </div>
    </div>
  );
};

export default Index;
