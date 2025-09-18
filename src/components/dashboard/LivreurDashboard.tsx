import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Phone, MapPin, Clock, CheckCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
import NouvelleCommandeModal from "@/components/modals/NouvelleCommandeModal";
import { stopNotificationSound } from "@/utils/notificationSound";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Commande {
  id: string;
  numero_commande: string;
  type_commande: 'sur_place' | 'a_emporter' | 'livraison';
  statut: string;
  total: number;
  notes?: string;
  created_at: string;
  livreur_id?: string;
  clients: {
    nom: string;
    telephone: string;
    adresse: string;
  };
  commande_items: Array<{
    quantite: number;
    prix_unitaire: number;
    produits: {
      nom: string;
      categorie: string;
      prix: number;
      est_extra: boolean;
      categorie_custom_id?: string;
      categories?: {
        nom: string;
      };
    };
  }>;
}

const LivreurDashboard = () => {
  const [nouvelleLivraison, setNouvelleLivraison] = useState<Commande | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [commandeToDeliver, setCommandeToDeliver] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const { toast } = useToast();

  // Fonction pour obtenir le vrai nom de la catégorie
  const getRealCategoryName = (item: any) => {
    return item.produits?.categories?.nom || item.produits?.categorie || 'Autre';
  };

  // Hook adaptatif intelligent 🧠  
  const { commandes, mesLivraisons, isLoading, forceRefresh, debugInfo } = useAdaptivePolling({
    role: 'livreur',
    enableRealtime: true
  });

  const accepterLivraison = async (commandeId: string) => {
    try {
      console.log('[Livreur] Click accepterLivraison pour', commandeId);
      
      // Mettre à jour tous les statuts pour forcer le passage à "en_livraison"
      const { data, error } = await supabase
        .from('commandes')
        .update({ 
          statut: 'en_livraison',
          statut_dolce_italia: 'en_livraison',
          statut_961_lsf: 'en_livraison'
        })
        .eq('id', commandeId)
        .select('id, statut, statut_dolce_italia, statut_961_lsf');

      console.log('[Livreur] Update result:', { data, error });

      if (error) {
        console.error("Erreur lors de l'acceptation:", error);
        throw error;
      }

      // Arrêter le son quand une livraison est acceptée
      stopNotificationSound();
      
      toast({
        title: "Livraison acceptée",
        description: "La commande est maintenant en cours de livraison"
      });

      forceRefresh();
    } catch (error: any) {
      console.error('Erreur complète:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Impossible d'accepter la livraison: ${error.message || 'Erreur inconnue'}`
      });
    }
  };

  const marquerLivre = async (commandeId: string) => {
    setCommandeToDeliver(commandeId);
    setShowPaymentModal(true);
  };

  const confirmerPaiementLivraison = async () => {
    if (!commandeToDeliver || !selectedPaymentMethod) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner un mode de paiement"
      });
      return;
    }

    try {
      console.log('[Livreur] Confirmation paiement pour', commandeToDeliver, 'avec', selectedPaymentMethod);
      
      // Mettre à jour tous les statuts pour forcer le passage à "termine"
      const { data, error } = await supabase
        .from('commandes')
        .update({ 
          statut: 'termine',
          statut_dolce_italia: 'termine',
          statut_961_lsf: 'termine',
          mode_paiement: selectedPaymentMethod as any
        })
        .eq('id', commandeToDeliver)
        .select('id, statut, statut_dolce_italia, statut_961_lsf, mode_paiement');

      console.log('[Livreur] Update result termine:', { data, error });

      if (error) throw error;

      toast({
        title: "Livraison terminée",
        description: `Commande marquée comme livrée avec paiement ${getPaymentMethodLabel(selectedPaymentMethod)}`
      });

      setShowPaymentModal(false);
      setCommandeToDeliver(null);
      setSelectedPaymentMethod("");
      forceRefresh();
    } catch (error: any) {
      console.error('Erreur complète termine:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de terminer la livraison"
      });
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      bancontact: "Bancontact",
      visa: "Visa", 
      mastercard: "Mastercard",
      cash: "Espèces"
    };
    return methods[method as keyof typeof methods] || method;
  };

  const fetchCommandeComplete = async (commandeId: string) => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          clients (nom, telephone, adresse),
          commande_items (
            quantite,
            prix_unitaire,
            produits (nom, categorie, prix, est_extra, categorie_custom_id,
              categories (nom)
            )
          )
        `)
        .eq('id', commandeId)
        .single();

      if (error) throw error;
      if (data && data.type_commande === 'livraison') {
        setNouvelleLivraison(data);
        setShowModal(true);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement de la commande complète:', error);
    }
  };

  const ouvrirMaps = (adresse: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
    window.open(url, '_blank');
  };

  const appelerClient = (telephone: string) => {
    window.open(`tel:${telephone}`, '_self');
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
        <Truck className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Livraisons disponibles</p>
                <p className="text-2xl font-bold text-red-600">{commandes.length}</p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mes livraisons en cours */}
      {mesLivraisons.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Mes livraisons en cours</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mesLivraisons.map((commande) => (
              <Card key={commande.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{commande.numero_commande}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Client: {commande.clients.nom}</p>
                    </div>
                    <Badge variant="warning">En livraison</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact client */}
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => appelerClient(commande.clients.telephone)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1 flex-1"
                    >
                      <Phone className="h-4 w-4" />
                      <span>{commande.clients.telephone}</span>
                    </Button>
                    <Button
                      onClick={() => ouvrirMaps(commande.clients.adresse)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1 flex-1"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>GPS</span>
                    </Button>
                  </div>

                  {/* Adresse */}
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-medium mb-1">Adresse de livraison:</p>
                    <p className="text-sm text-gray-700">{commande.clients.adresse}</p>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Articles ({commande.commande_items.length}):</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                       {commande.commande_items.map((item, index) => (
                         <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                            <div className="flex-1">
                              <span>{item.quantite}x {item.produits.nom}</span>
                              {item.prix_unitaire !== item.produits.prix && (
                                <Badge variant="outline" className="ml-2 text-xs text-blue-600">
                                  Extra ({item.prix_unitaire.toFixed(2)}€)
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {getRealCategoryName(item)}
                            </Badge>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Total et notes */}
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total: {commande.total.toFixed(2)}€</span>
                    <span className="text-xs text-gray-500">
                      {new Date(commande.created_at).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>

                  {commande.notes && (
                    <div className="bg-yellow-50 p-2 rounded">
                      <p className="text-sm"><strong>Notes:</strong> {commande.notes}</p>
                    </div>
                  )}

                  {/* Action */}
                  <Button
                    onClick={() => marquerLivre(commande.id)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marquer comme livré
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Livraisons disponibles */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Livraisons disponibles</h3>
        
        {commandes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucune livraison disponible</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {commandes.map((commande) => (
              <Card key={commande.id} className="border-l-4 border-l-red-500 notification-alert">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{commande.numero_commande}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Client: {commande.clients.nom}</p>
                    </div>
                    <Badge variant="info">Prêt</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Infos de contact */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{commande.clients.telephone}</span>
                    </div>
                    <div className="flex items-start space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span className="flex-1">{commande.clients.adresse}</span>
                    </div>
                  </div>

                  {/* Items (aperçu) */}
                  <div>
                    <h4 className="font-medium text-sm mb-1">
                      Articles ({commande.commande_items.length}):
                    </h4>
                     <div className="space-y-1">
                        {commande.commande_items.slice(0, 2).map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span>
                              {item.quantite}x {item.produits.nom}
                              {item.prix_unitaire !== item.produits.prix && (
                                <Badge variant="outline" className="ml-1 text-xs text-blue-600">Extra</Badge>
                              )}
                            </span>
                             <Badge variant="outline" className="text-xs">
                               {getRealCategoryName(item)}
                             </Badge>
                          </div>
                        ))}
                       {commande.commande_items.length > 2 && (
                         <p className="text-sm text-gray-500">+{commande.commande_items.length - 2} autre(s)</p>
                       )}
                     </div>
                  </div>

                  {/* Total et heure */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold">Total: {commande.total.toFixed(2)}€</span>
                    <span className="text-gray-500">
                      Prêt depuis {new Date(commande.created_at).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>

                  {/* Action */}
                  <Button
                    onClick={() => accepterLivraison(commande.id)}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Accepter cette livraison
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modale pour nouvelles livraisons */}
      <NouvelleCommandeModal
        commande={nouvelleLivraison}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setNouvelleLivraison(null);
        }}
        onAccept={() => {
          if (nouvelleLivraison) {
            accepterLivraison(nouvelleLivraison.id);
          }
        }}
        title="Nouvelle livraison disponible!"
        acceptButtonText="Accepter cette livraison"
        acceptButtonIcon={Truck}
      />

      {/* Modal de sélection du mode de paiement */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Mode de paiement</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sélectionnez le mode de paiement reçu du client :
            </p>
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un mode de paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bancontact">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Bancontact</span>
                  </div>
                </SelectItem>
                <SelectItem value="visa">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Visa</span>
                  </div>
                </SelectItem>
                <SelectItem value="mastercard">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Mastercard</span>
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">💵</span>
                    <span>Espèces</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex space-x-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPaymentModal(false);
                  setCommandeToDeliver(null);
                  setSelectedPaymentMethod("");
                }}
              >
                Annuler
              </Button>
              <Button 
                onClick={confirmerPaiementLivraison}
                disabled={!selectedPaymentMethod}
                className="bg-green-600 hover:bg-green-700"
              >
                Confirmer la livraison
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LivreurDashboard;