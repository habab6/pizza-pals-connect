import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, CheckCircle, Sandwich } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
import NouvelleCommandeModal from "@/components/modals/NouvelleCommandeModal";
import { stopNotificationSound } from "@/utils/notificationSound";
import { DebugInfo } from "@/components/ui/DebugInfo";

interface Commande {
  id: string;
  numero_commande: string;
  type_commande: 'sur_place' | 'a_emporter' | 'livraison';
  statut: 'nouveau' | 'en_preparation' | 'pret' | 'en_livraison' | 'livre' | 'termine';
  total: number;
  notes?: string;
  created_at: string;
  commerce_principal?: 'dolce_italia' | '961_lsf';
  clients?: {
    nom: string;
  };
  commande_items: Array<{
    quantite: number;
    produits: {
      nom: string;
      categorie: string;
      commerce?: 'dolce_italia' | '961_lsf';
    };
  }>;
}

const CuisinierDashboard = () => {
  const [nouvelleCommande, setNouvelleCommande] = useState<Commande | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  // Hook adaptatif intelligent 🧠
  const { commandes, isLoading, forceRefresh, debugInfo } = useAdaptivePolling({
    role: 'cuisinier',
    enableRealtime: true
  });

  const fetchCommandeComplete = async (commandeId: string) => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          clients (nom),
          commande_items (
            quantite,
            produits (nom, categorie, commerce)
          )
        `)
        .eq('id', commandeId)
        .single();

      if (error) throw error;
      
      // Filtrer pour s'assurer qu'il y a des items 961 LSF
      const hasLSFItems = data.commande_items?.some((item: any) => 
        ['entrees', 'sandwiches', 'bowls_salades', 'frites'].includes(item.produits.categorie)
      );
      
      if (data && hasLSFItems) {
        setNouvelleCommande(data);
        setShowModal(true);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement de la commande complète:', error);
    }
  };

  const changerStatut = async (commandeId: string, nouveauStatut: any) => {
    try {
      console.log('[Cuisinier] Click changerStatut:', commandeId, nouveauStatut);
      
      const { data, error } = await supabase
        .from('commandes')
        .update({ statut_961_lsf: nouveauStatut })
        .eq('id', commandeId)
        .select('id, statut_961_lsf');

      console.log('[Cuisinier] Update result:', { data, error });

      if (error) throw error;

      // Arrêter le son quand on commence à préparer
      if (nouveauStatut === 'en_preparation') {
        stopNotificationSound();
      }

      toast({
        title: "Statut mis à jour",
        description: `Commande marquée comme ${nouveauStatut.replace('_', ' ')}`
      });

      forceRefresh();
    } catch (error: any) {
      console.error('Erreur complète:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut"
      });
    }
  };

  const getStatusBadge = (statut: any) => {
    const statusConfig = {
      nouveau: { variant: "destructive" as const, label: "Nouveau", icon: Clock },
      en_preparation: { variant: "warning" as const, label: "En préparation", icon: ChefHat },
      pret: { variant: "success" as const, label: "Prêt", icon: CheckCircle }
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

  const isCommandeMixte = (commande: any) => {
    const hasDolce = commande.commande_items?.some((item: any) => 
      ['pizzas', 'pates', 'desserts'].includes(item.produits.categorie)
    );
    const hasLSF = commande.commande_items?.some((item: any) => 
      ['entrees', 'sandwiches', 'bowls_salades', 'frites'].includes(item.produits.categorie)
    );
    return hasDolce && hasLSF;
  };

  const getItemsLSF = (commande: any) => {
    return commande.commande_items?.filter((item: any) => 
      ['entrees', 'sandwiches', 'bowls_salades', 'frites'].includes(item.produits.categorie)
    ) || [];
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
      {/* Debug Info en développement */}
      <DebugInfo debugInfo={debugInfo} />
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <ChefHat className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-900">Cuisine 961 LSF</h2>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nouveau</p>
                <p className="text-2xl font-bold text-red-600">
                  {commandes.filter((c: any) => {
                    const itemsLSF = getItemsLSF(c);
                    const statutLSF = c.statut_961_lsf || 'nouveau';
                    return itemsLSF.length > 0 && statutLSF === 'nouveau';
                  }).length}
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
                <p className="text-2xl font-bold text-yellow-600">
                  {commandes.filter((c: any) => {
                    const itemsLSF = getItemsLSF(c);
                    const statutLSF = c.statut_961_lsf || 'nouveau';
                    return itemsLSF.length > 0 && statutLSF === 'en_preparation';
                  }).length}
                </p>
              </div>
              <ChefHat className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prêt</p>
                <p className="text-2xl font-bold text-green-600">
                  {commandes.filter((c: any) => {
                    const itemsLSF = getItemsLSF(c);
                    const statutLSF = c.statut_961_lsf || 'nouveau';
                    return itemsLSF.length > 0 && statutLSF === 'pret';
                  }).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des commandes */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Commandes en cours</h3>
        
        {commandes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Sandwich className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucune commande en cours</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {commandes.map((commande: any) => {
              const itemsLSF = getItemsLSF(commande);
              const statutLSF = commande.statut_961_lsf || 'nouveau';
              const isMixte = isCommandeMixte(commande);
              const isNouveau = statutLSF === 'nouveau';

              return (
                <Card 
                  key={commande.id} 
                  className={`${isMixte ? 'border-l-4 border-l-purple-500' : 'border-l-4 border-l-red-500'} ${isNouveau ? 'notification-alert animate-pulse' : ''}`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{commande.numero_commande}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {getTypeCommande(commande.type_commande)}
                          {commande.clients?.nom && ` • ${commande.clients.nom}`}
                        </p>
                        {isMixte && (
                          <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-600 border-purple-200">
                            Commande mixte
                          </Badge>
                        )}
                      </div>
                      {getStatusBadge(statutLSF)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Articles 961 LSF */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Articles 961 LSF ({itemsLSF.length}):</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {itemsLSF.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm bg-red-50 p-2 rounded">
                            <div className="flex-1">
                              <span className="font-medium">{item.quantite}x</span> {item.produits.nom}
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
                      <div className="bg-yellow-50 p-2 rounded">
                        <p className="text-sm"><strong>Notes:</strong> {commande.notes}</p>
                      </div>
                    )}

                    {/* Temps et actions */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                          {new Date(commande.created_at).toLocaleTimeString('fr-FR')}
                        </span>
                        <span className="font-semibold">{commande.total.toFixed(2)}€</span>
                      </div>

                      {/* Actions selon le statut */}
                      <div className="flex space-x-2">
                        {statutLSF === 'nouveau' && (
                          <Button
                            onClick={() => changerStatut(commande.id, 'en_preparation')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            <ChefHat className="h-4 w-4 mr-1" />
                            Commencer
                          </Button>
                        )}
                        
                        {statutLSF === 'en_preparation' && (
                          <Button
                            onClick={() => changerStatut(commande.id, 'pret')}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Terminer
                          </Button>
                        )}

                        {statutLSF === 'pret' && (
                          <div className="flex-1 text-center">
                            <Badge variant="success" className="px-3 py-1">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Prêt à servir
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
        title="Nouvelle commande 961 LSF!"
        acceptButtonText="Commencer la préparation"
        acceptButtonIcon={ChefHat}
      />
    </div>
  );
};

export default CuisinierDashboard;