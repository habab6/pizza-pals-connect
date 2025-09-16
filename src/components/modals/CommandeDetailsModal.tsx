import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, User, Phone, MapPin, Receipt, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatProduitNom } from "@/utils/formatters";

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
    };
  }>;
}

const CommandeDetailsModal = ({ commandeId, isOpen, onClose }: CommandeDetailsModalProps) => {
  const [commande, setCommande] = useState<CommandeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
              prix
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
                <div>
                  <p className="text-sm font-medium text-gray-600">Commande passée</p>
                  <p className="text-sm">{new Date(commande.created_at).toLocaleString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Dernière mise à jour</p>
                  <p className="text-sm">{new Date(commande.updated_at).toLocaleString('fr-FR')}</p>
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
                {commande.commande_items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                     <div className="flex justify-between items-start mb-2">
                       <div className="flex-1">
                         <div className="flex items-center space-x-2 mb-1">
                           <h4 className="font-medium">
                             {formatProduitNom(item.produits.nom, item.produits.categorie)}
                           </h4>
                           <Badge variant="secondary" className="text-xs">
                             {item.produits.categorie}
                           </Badge>
                         </div>
                         <p className="text-sm text-gray-600">
                           Prix unitaire: {item.prix_unitaire.toFixed(2)}€
                         </p>
                       </div>
                      <div className="text-right">
                        <p className="font-medium">x{item.quantite}</p>
                        <p className="text-sm font-bold text-red-600">
                          {(item.prix_unitaire * item.quantite).toFixed(2)}€
                        </p>
                      </div>
                    </div>
                    {item.remarque && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Remarque:</strong> {item.remarque}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-xl font-bold text-red-600">{commande.total.toFixed(2)}€</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandeDetailsModal;