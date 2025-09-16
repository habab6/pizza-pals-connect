import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Clock, CheckCircle, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NouvelleCommande from "@/components/commandes/NouvelleCommande";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface Commande {
  id: string;
  numero_commande: string;
  type_commande: 'sur_place' | 'a_emporter' | 'livraison';
  statut: 'nouveau' | 'en_preparation' | 'pret' | 'en_livraison' | 'livre' | 'termine';
  total: number;
  created_at: string;
  clients?: {
    nom: string;
    telephone: string;
    adresse?: string;
  };
}

const CaissierDashboard = () => {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNouvelleCommande, setShowNouvelleCommande] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommandes();
    
    // Écoute des changements en temps réel pour toutes les tables
    const channel = supabase
      .channel('caissier-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commandes'
        },
        () => fetchCommandes()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commande_items'
        },
        () => fetchCommandes()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => fetchCommandes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCommandes = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          clients (
            nom,
            telephone,
            adresse
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommandes(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les commandes"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    const statusConfig = {
      nouveau: { label: "Nouveau", variant: "default" as const, icon: Clock },
      en_preparation: { label: "En préparation", variant: "secondary" as const, icon: Clock },
      pret: { label: "Prêt", variant: "default" as const, icon: CheckCircle },
      en_livraison: { label: "En livraison", variant: "secondary" as const, icon: Truck },
      livre: { label: "Livré", variant: "default" as const, icon: CheckCircle },
      termine: { label: "Terminé", variant: "default" as const, icon: CheckCircle }
    };

    const config = statusConfig[statut as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getTypeCommande = (type: string) => {
    const types = {
      sur_place: "Sur place",
      a_emporter: "À emporter",
      livraison: "Livraison"
    };
    return types[type as keyof typeof types] || type;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord - Caissier</h2>
          <Dialog open={showNouvelleCommande} onOpenChange={(open) => {
            setShowNouvelleCommande(open);
            if (!open) {
              fetchCommandes(); // Rafraîchir immédiatement après création/fermeture
            }
          }}>
           <DialogTrigger asChild>
             <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle commande
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <NouvelleCommande onClose={() => setShowNouvelleCommande(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nouvelles</p>
                <p className="text-2xl font-bold text-red-600">
                  {commandes.filter(c => c.statut === 'nouveau').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En préparation</p>
                <p className="text-2xl font-bold text-orange-600">
                  {commandes.filter(c => c.statut === 'en_preparation').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prêtes</p>
                <p className="text-2xl font-bold text-green-600">
                  {commandes.filter(c => c.statut === 'pret').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aujourd'hui</p>
                <p className="text-2xl font-bold text-blue-600">
                  {commandes.filter(c => 
                    new Date(c.created_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des commandes */}
      <Card>
        <CardHeader>
          <CardTitle>Commandes récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commandes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune commande pour le moment</p>
            ) : (
              commandes.map((commande) => (
                <div key={commande.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="font-semibold text-lg">{commande.numero_commande}</h3>
                      {getStatusBadge(commande.statut)}
                      <Badge variant="outline">{getTypeCommande(commande.type_commande)}</Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Total: {commande.total.toFixed(2)}€</span>
                      {commande.clients && (
                        <span>Client: {commande.clients.nom}</span>
                      )}
                      <span>{new Date(commande.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CaissierDashboard;