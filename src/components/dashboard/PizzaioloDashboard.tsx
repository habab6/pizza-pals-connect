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
  const [commandesNouvelles, setCommandesNouvelles] = useState<Commande[]>([]);
  const [commandesEnCours, setCommandesEnCours] = useState<Commande[]>([]);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const fetchCommandesNouvelles = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          clients(*),
          commande_items(
            quantite,
            produits(nom, categorie, commerce)
          )
        `)
        .eq('statut', 'nouveau')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filtrer pour ne garder que les commandes contenant des articles Dolce Italia
      const commandesDolce = (data || []).filter(commande =>
        commande.commande_items?.some((item: any) => item.produits?.commerce === 'dolce_italia')
      );

      setCommandesNouvelles(commandesDolce as Commande[]);
    } catch (error: any) {
      console.error('Erreur lors du chargement des nouvelles commandes:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les nouvelles commandes"
      });
    }
  };

  const fetchCommandesEnCours = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          clients(*),
          commande_items(
            quantite,
            produits(nom, categorie, commerce)
          )
        `)
        .in('statut', ['en_preparation', 'pret'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filtrer pour ne garder que les commandes contenant des articles Dolce Italia
      const commandesDolce = (data || []).filter(commande =>
        commande.commande_items?.some((item: any) => item.produits?.commerce === 'dolce_italia')
      );

      setCommandesEnCours(commandesDolce as Commande[]);
    } catch (error: any) {
      console.error('Erreur lors du chargement des commandes en cours:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les commandes en cours"
      });
    }
  };

  const loadData = async () => {
    await Promise.all([
      fetchCommandesNouvelles(),
      fetchCommandesEnCours()
    ]);
  };

  useEffect(() => {
    loadData();
  }, []);

  useAutoRefresh({ refreshFunction: loadData, intervalMs: 3000 });

  const accepterCommande = async (commandeId: string) => {
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ statut: 'en_preparation' })
        .eq('id', commandeId);

      if (error) throw error;

      toast({
        title: "Commande acceptée",
        description: "La commande est maintenant en préparation"
      });

      await loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'accepter la commande"
      });
    }
  };

  const marquerPrete = async (commandeId: string) => {
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ statut: 'pret' })
        .eq('id', commandeId);

      if (error) throw error;

      toast({
        title: "Commande prête",
        description: "La commande a été marquée comme prête"
      });

      await loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de marquer la commande comme prête"
      });
    }
  };

  const openCommandeModal = (commande: Commande) => {
    setSelectedCommande(commande);
    setShowModal(true);
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'sur_place': return 'default';
      case 'a_emporter': return 'secondary';
      case 'livraison': return 'destructive';
      default: return 'outline';
    }
  };

  const hasMultipleCommerces = (commande: Commande) => {
    const commerces = new Set(commande.commande_items?.map(item => item.produits?.commerce) || []);
    return commerces.size > 1;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <ChefHat className="mr-3 h-8 w-8 text-primary" />
          Pizzaiolo - Dolce Italia
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Nouvelles commandes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Nouvelles commandes</span>
              <Badge variant="destructive" className="animate-pulse">
                {commandesNouvelles.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {commandesNouvelles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune nouvelle commande
                </p>
              ) : (
                commandesNouvelles.map((commande) => (
                  <Card 
                    key={commande.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500"
                    onClick={() => openCommandeModal(commande)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{commande.numero_commande}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={getTypeBadgeVariant(commande.type_commande)}>
                              {commande.type_commande.replace('_', ' ')}
                            </Badge>
                            {hasMultipleCommerces(commande) && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                Commande mixte
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{commande.total.toFixed(2)}€</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(commande.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {commande.commande_items
                          ?.filter(item => item.produits?.commerce === 'dolce_italia')
                          .map((item, index) => (
                          <div key={index} className="text-sm bg-red-50 p-2 rounded border-l-2 border-red-400">
                            <span className="font-medium">
                              {item.quantite}x {formatProduitNom(item.produits.nom, item.produits.categorie)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex space-x-2 mt-3">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            accepterCommande(commande.id);
                          }}
                          className="flex-1"
                          size="sm"
                        >
                          <ChefHat className="h-4 w-4 mr-1" />
                          Accepter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Commandes en cours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>En préparation</span>
              <Badge variant="secondary">
                {commandesEnCours.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {commandesEnCours.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune commande en cours
                </p>
              ) : (
                commandesEnCours.map((commande) => (
                  <Card 
                    key={commande.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                      commande.statut === 'pret' ? 'border-l-green-500' : 'border-l-yellow-500'
                    }`}
                    onClick={() => openCommandeModal(commande)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{commande.numero_commande}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={getTypeBadgeVariant(commande.type_commande)}>
                              {commande.type_commande.replace('_', ' ')}
                            </Badge>
                            <Badge variant={commande.statut === 'pret' ? 'default' : 'secondary'}>
                              {commande.statut === 'pret' ? 'Prêt' : 'En cours'}
                            </Badge>
                            {hasMultipleCommerces(commande) && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                Mixte
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{commande.total.toFixed(2)}€</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(commande.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {commande.commande_items
                          ?.filter(item => item.produits?.commerce === 'dolce_italia')
                          .map((item, index) => (
                          <div key={index} className="text-sm bg-red-50 p-2 rounded border-l-2 border-red-400">
                            <span className="font-medium">
                              {item.quantite}x {formatProduitNom(item.produits.nom, item.produits.categorie)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {commande.statut === 'en_preparation' && (
                        <div className="flex space-x-2 mt-3">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              marquerPrete(commande.id);
                            }}
                            className="flex-1"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Marquer prêt
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de détail */}
      <NouvelleCommandeModal
        commande={selectedCommande}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Détails de la commande"
        acceptButtonText="Fermer"
      />
    </div>
  );
};

export default PizzaioloDashboard;