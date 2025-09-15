import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pizza } from "lucide-react";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  // Crée automatiquement les 3 comptes au premier chargement (idempotent)
  useEffect(() => {
    const key = 'accounts_created';
    if (localStorage.getItem(key)) return;
    supabase.functions.invoke('create-accounts')
      .then(() => localStorage.setItem(key, '1'))
      .catch(() => {});
  }, []);

  const createInitialAccounts = async () => {
    setCreatingAccounts(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-accounts');
      
      if (error) throw error;

      toast({
        title: "Comptes créés",
        description: "Les 3 comptes ont été créés avec succès",
      });
      
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création des comptes",
        variant: "destructive",
      });
    } finally {
      setCreatingAccounts(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erreur",
        description: "Nom d'utilisateur et mot de passe requis",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Ajouter @app si l'utilisateur n'a tapé que le nom simple
      const fullEmail = email.includes('@') ? email : `${email}@app`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email: fullEmail,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté",
      });

    } catch (error: any) {
      console.error("Erreur connexion:", error);
      toast({
        title: "Erreur de connexion",
        description: error.message || "Nom d'utilisateur ou mot de passe incorrect",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Pizza className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-800">Dolce Italia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Nom d'utilisateur</Label>
              <Input
                id="email"
                type="text"
                placeholder="caisse, cuisine ou livraison"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <div className="border-t pt-4">
            <div className="text-center text-sm text-gray-600 mb-3">
              Comptes disponibles:
            </div>
            <div className="space-y-1 text-xs text-gray-500 mb-4">
              <div>• caisse (Caissier)</div>
              <div>• cuisine (Pizzaiolo)</div>
              <div>• livraison (Livreur)</div>
              <div className="font-medium">Mot de passe: Dolce961</div>
            </div>
            
            <Button
              onClick={createInitialAccounts}
              variant="outline"
              className="w-full"
              disabled={creatingAccounts}
            >
              {creatingAccounts ? "Création..." : "Créer les comptes initiaux"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;