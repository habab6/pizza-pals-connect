import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { formatProduitNom } from "@/utils/formatters";
import NouvelleCommandeModal from "@/components/modals/NouvelleCommandeModal";

interface Commande {
  id: string;
  numero_commande: string;
  type_commande: 'sur_place' | 'a_emporter' | 'livraison';
  commerce_principal: 'dolce_italia' | '961_lsf';
  statut: 'nouveau' | 'en_preparation' | 'pret' | 'en_livraison' | 'livre' | 'termine';
  total: number;
  notes?: string;
  created_at: string;
  clients?: {
    nom: string;
  };
  commande_items: Array<{
    quantite: number;
    produits: {
      nom: string;
      categorie: string;
      commerce: string;
    };
  }>;
}

const PizzaioloDashboard = () => {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nouvelleCommande, setNouvelleCommande] = useState<Commande | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const fetchCommandes = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          clients (nom),
          commande_items (
            quantite,
            produits (nom, categorie)
          )
        `)
        .in('statut', ['nouveau', 'en_preparation', 'pret'])
        .neq('statut', 'termine')
        .order('created_at', { ascending: true });

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

  // Auto-refresh toutes les secondes
  useAutoRefresh({ 
    refreshFunction: fetchCommandes,
    intervalMs: 1000,
    enabled: true
  });

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandeComplete = async (commandeId: string) => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          clients (nom, telephone, adresse),
          commande_items (
            quantite,
            produits (nom, categorie)
          )
        `)
        .eq('id', commandeId)
        .single();

      if (error) throw error;
      if (data) {
        setNouvelleCommande(data);
        setShowModal(true);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement de la commande complète:', error);
    }
  };

  const changerStatut = async (commandeId: string, nouveauStatut: 'nouveau' | 'en_preparation' | 'pret' | 'en_livraison' | 'livre' | 'termine') => {
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ statut: nouveauStatut })
        .eq('id', commandeId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `Commande marquée comme ${nouveauStatut.replace('_', ' ')}`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut"
      });
    }
  };

  const getStatusBadge = (statut: string) => {
    const statusConfig = {
      nouveau: { label: "Nouveau", variant: "destructive" as const },
      en_preparation: { label: "En préparation", variant: "warning" as const },
      pret: { label: "Prêt", variant: "info" as const }
    };

    const config = statusConfig[statut as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <Badge variant={config.variant}>
        {config.label}
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
      <div className="flex items-center space-x-3">
        <ChefHat className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord - Pizzaiolo</h2>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nouvelles commandes</p>
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
              <ChefHat className="h-8 w-8 text-orange-600" />
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
      </div>

      {/* Liste des commandes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {commandes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucune commande en attente</p>
          </div>
        ) : (
          commandes.map((commande) => (
            <Card key={commande.id} className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{commande.numero_commande}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {getTypeCommande(commande.type_commande)}
                      {commande.clients && ` • ${commande.clients.nom}`}
                    </p>
                  </div>
                  {getStatusBadge(commande.statut)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items de la commande */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Articles:</h4>
                  <div className="space-y-1">
                     {commande.commande_items.map((item, index) => (
                       <div key={index} className="flex justify-between items-center text-sm">
                         <div className="flex-1">
                           <span>{item.quantite}x {formatProduitNom(item.produits.nom, item.produits.categorie)}</span>
                         </div>
                         <Badge variant="outline" className="text-xs">
                           {item.produits.categorie}
                         </Badge>
                       </div>
                     ))}
                  </div>
                </div>

                {/* Notes */}
                {commande.notes && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Notes:</h4>
                    <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                      {commande.notes}
                    </p>
                  </div>
                )}

                {/* Temps */}
                <p className="text-xs text-gray-500">
                  Commande passée: {new Date(commande.created_at).toLocaleString('fr-FR')}
                </p>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  {commande.statut === 'nouveau' && (
                    <Button
                      onClick={() => changerStatut(commande.id, 'en_preparation')}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                      size="sm"
                    >
                      Commencer
                    </Button>
                  )}
                  {commande.statut === 'en_preparation' && (
                    <Button
                      onClick={() => changerStatut(commande.id, 'pret')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      Terminé
                    </Button>
                  )}
                  {commande.statut === 'pret' && (
                    <div className="flex-1 text-center py-2">
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Prêt pour récupération
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modale pour nouvelles commandes */}
      <NouvelleCommandeModal
        commande={nouvelleCommande}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setNouvelleCommande(null);
        }}
        onAccept={() => {
          if (nouvelleCommande) {
            changerStatut(nouvelleCommande.id, 'en_preparation');
          }
        }}
        title="Nouvelle commande reçue!"
        acceptButtonText="Commencer la préparation"
        acceptButtonIcon={ChefHat}
      />
    </div>
  );
};

export default PizzaioloDashboard;