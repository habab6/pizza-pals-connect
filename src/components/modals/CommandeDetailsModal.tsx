import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Clock, User, Phone, MapPin, Receipt, Package, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatProduitNom } from "@/utils/formatters";
import { getDisplayName } from "@/utils/displayUtils";

interface CommandeDetailsModalProps {
  commandeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CommandeDetail {
  id: string;
  numero_commande: string;
  type_commande: 'sur_place' | 'a_emporter' | 'livraison';
  statut: 'nouveau' | 'en_preparation' | 'pret' | 'en_livraison' | 'livre' | 'termine';
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  mode_paiement?: string;
  clients?: {
    nom: string;
    telephone: string;
    adresse?: string;
  };
  commande_items: Array<{
    id: string;
    quantite: number;
    prix_unitaire: number;
    remarque?: string;
    produits: {
      nom: string;
      categorie: string;
      prix: number;
      categorie_custom_id?: string;
      categories?: {
        nom: string;
      };
    };
  }>;
}

const CommandeDetailsModal = ({ commandeId, isOpen, onClose }: CommandeDetailsModalProps) => {
  const [commande, setCommande] = useState<CommandeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Fonction pour obtenir le vrai nom de la catégorie
  const getRealCategoryName = (item: any) => {
    return item.produits?.categories?.nom || item.produits?.categorie || 'Autre';
  };

  useEffect(() => {
    if (commandeId && isOpen) {
      fetchCommandeDetails();
    }
  }, [commandeId, isOpen]);

  const fetchCommandeDetails = async () => {
    if (!commandeId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          clients (
            nom,
            telephone,
            adresse
          ),
          commande_items (
            id,
            quantite,
            prix_unitaire,
            remarque,
            produits (
              nom,
              categorie,
              prix,
              categorie_custom_id,
              categories (nom)
            )
          )
        `)
        .eq('id', commandeId)
        .single();

      if (error) throw error;
      setCommande(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les détails de la commande"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    const statusConfig = {
      nouveau: { label: "Nouveau", variant: "destructive" as const },
      en_preparation: { label: "En préparation", variant: "warning" as const },
      pret: { label: "Prêt", variant: "info" as const },
      en_livraison: { label: "En livraison", variant: "warning" as const },
      livre: { label: "Livré", variant: "success" as const },
      termine: { label: "Terminé", variant: "success" as const }
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

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      bancontact: "Bancontact",
      visa: "Visa", 
      mastercard: "Mastercard",
      cash: "Espèces"
    };
    return methods[method as keyof typeof methods] || method;
  };

  const handleDeleteCommande = async () => {
    if (!commande) return;
    
    setIsDeleting(true);
    try {
      // Supprimer d'abord les items de commande
      const { error: itemsError } = await supabase
        .from('commande_items')
        .delete()
        .eq('commande_id', commande.id);

      if (itemsError) throw itemsError;

      // Ensuite supprimer la commande
      const { error: commandeError } = await supabase
        .from('commandes')
        .delete()
        .eq('id', commande.id);

      if (commandeError) throw commandeError;

      toast({
        title: "Commande supprimée",
        description: "La commande a été définitivement supprimée de la base de données"
      });

      setShowDeleteConfirm(false);
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la commande"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateWithHiddenDelete = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleString('fr-FR');
    const parts = formatted.split(':');
    
    if (parts.length >= 3) {
      const seconds = parts[2].substring(0, 2);
      
      return (
        <span className="relative">
          {parts[0]}:{parts[1]}
          <span 
            className="relative cursor-pointer"
            onClick={() => setShowDeleteConfirm(true)}
          >
            :
          </span>
          {seconds}
        </span>
      );
    }
    
    return formatted;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!commande) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Receipt className="h-6 w-6 text-red-600" />
              <span>Détails de la commande {commande.numero_commande}</span>
            </div>
            {getStatusBadge(commande.statut)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Informations générales</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Type de commande</p>
                  <p className="text-lg">{getTypeCommande(commande.type_commande)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-lg font-bold text-red-600">{commande.total.toFixed(2)}€</p>
                </div>
                {commande.mode_paiement && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Mode de paiement</p>
                    <p className="text-lg flex items-center space-x-2">
                      <Receipt className="h-4 w-4" />
                      <span>{getPaymentMethodLabel(commande.mode_paiement)}</span>
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-600">Commande passée</p>
                  <p className="text-sm">{new Date(commande.created_at).toLocaleString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Dernière mise à jour</p>
                  <p className="text-sm">{formatDateWithHiddenDelete(commande.updated_at)}</p>
                </div>
              </div>
              
              {commande.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Notes</p>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm">{commande.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations client */}
          {commande.clients && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Client</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{commande.clients.nom}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{commande.clients.telephone}</span>
                  </div>
                  {commande.clients.adresse && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span className="flex-1">{commande.clients.adresse}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Articles commandés */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Articles commandés ({commande.commande_items.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {commande.commande_items.map((item, index) => {
                  // Extraire les extras de la remarque
                  const parseExtras = (remarque: string | null) => {
                    if (!remarque) return { customName: null, extras: [] };
                    
                    const parts = remarque.split('|EXTRAS:');
                    const customName = parts.length > 1 ? (parts[0] || null) : remarque;
                    
                    if (parts.length > 1) {
                      const extrasString = parts[1];
                      const extras = extrasString.split(',').map(extraStr => {
                        const match = extraStr.match(/\+(.+)\((.+)€\)/);
                        if (match) {
                          return { nom: match[1], prix: parseFloat(match[2]) };
                        }
                        return null;
                      }).filter(Boolean);
                      return { customName, extras };
                    }
                    
                    return { customName, extras: [] };
                  };
                  
                  const { customName, extras } = parseExtras(item.remarque);
                  const prixBase = item.produits.prix;
                  const prixExtras = extras.reduce((sum, extra) => sum + extra.prix, 0);
                  
                  return (
                    <div key={item.id} className="border rounded-lg p-4">
                       <div className="flex justify-between items-start mb-2">
                         <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                               <h4 className="font-medium">
                                 {customName || item.produits.nom}
                               </h4>
                               <Badge variant="secondary" className="text-xs">
                                 {getRealCategoryName(item)}
                               </Badge>
                              {(extras.length > 0 || item.prix_unitaire !== item.produits.prix) && (
                                <Badge variant="outline" className="text-xs text-blue-600">
                                  {extras.length > 0 ? 'Avec extras' : 'Extra'}
                                </Badge>
                              )}
                            </div>
                           <div className="text-sm text-gray-600 space-y-1">
                             <p>Prix de base: {prixBase.toFixed(2)}€</p>
                             {extras.length > 0 && (
                               <div className="ml-2">
                                 {extras.map((extra, extraIndex) => (
                                   <p key={extraIndex} className="text-xs text-blue-600">
                                     + {extra.nom}: {extra.prix.toFixed(2)}€
                                   </p>
                                 ))}
                               </div>
                             )}
                             <p className="font-medium">Prix unitaire total: {item.prix_unitaire.toFixed(2)}€</p>
                           </div>
                         </div>
                        <div className="text-right">
                          <p className="font-medium">x{item.quantite}</p>
                          <p className="text-sm font-bold text-red-600">
                            {(item.prix_unitaire * item.quantite).toFixed(2)}€
                          </p>
                        </div>
                       </div>
                     </div>
                  );
                })}
                
                <Separator />
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-xl font-bold text-red-600">{commande.total.toFixed(2)}€</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modale de confirmation de suppression */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Supprimer la commande</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Attention :</strong> Cette action est irréversible !
                </p>
                <p className="text-sm text-red-700 mt-2">
                  La commande <strong>{commande?.numero_commande}</strong> et tous ses éléments seront définitivement supprimés de la base de données.
                </p>
              </div>
              <div className="flex space-x-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Annuler
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteCommande}
                  disabled={isDeleting}
                  className="flex items-center space-x-2"
                >
                  {isDeleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>{isDeleting ? "Suppression..." : "Supprimer définitivement"}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default CommandeDetailsModal;