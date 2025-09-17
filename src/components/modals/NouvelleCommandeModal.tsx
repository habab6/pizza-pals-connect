import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, X, Clock, Truck } from "lucide-react";
import { formatProduitNom } from "@/utils/formatters";

interface Commande {
  id: string;
  numero_commande: string;
  type_commande: 'sur_place' | 'a_emporter' | 'livraison';
  commerce_principal: 'dolce_italia' | '961_lsf';
  statut: string;
  total: number;
  notes?: string;
  created_at: string;
  clients?: {
    nom: string;
    telephone?: string;
    adresse?: string;
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

interface NouvelleCommandeModalProps {
  commande: Commande | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  title: string;
  acceptButtonText: string;
  acceptButtonIcon?: React.ComponentType<{ className?: string }>;
}

const NouvelleCommandeModal = ({
  commande,
  isOpen,
  onClose,
  onAccept,
  title,
  acceptButtonText,
  acceptButtonIcon: AcceptIcon = CheckCircle
}: NouvelleCommandeModalProps) => {
  const [isClosing, setIsClosing] = useState(false);

  if (!commande) return null;

  const getTypeCommande = (type: string) => {
    const types = {
      sur_place: "Sur place",
      a_emporter: "À emporter",
      livraison: "Livraison"
    };
    return types[type as keyof typeof types] || type;
  };

  const handleAccept = () => {
    setIsClosing(true);
    if (onAccept) {
      onAccept();
    }
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 500);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isClosing && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Nouvelle commande reçue</DialogDescription>
        </DialogHeader>
        <div className={`bg-white rounded-lg shadow-2xl transition-all duration-500 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
          {/* Header avec animation */}
          <div className="bg-red-600 text-white p-6 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="animate-pulse">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{title}</h2>
                  <p className="text-red-100">Nouvelle commande reçue</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="p-6 space-y-6">
            {/* Info commande */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{commande.numero_commande}</CardTitle>
                    <p className="text-gray-600 mt-1">
                      {getTypeCommande(commande.type_commande)}
                      {commande.clients && ` • ${commande.clients.nom}`}
                    </p>
                  </div>
                  <Badge variant="destructive" className="animate-bounce">
                    Nouveau
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Séparation par commerce */}
                {(() => {
                  const dolceItems = commande.commande_items.filter(item => 
                    item.produits.commerce === 'dolce_italia'
                  );
                  const lsfItems = commande.commande_items.filter(item => 
                    item.produits.commerce === '961_lsf'
                  );
                  const hasBothCommerces = dolceItems.length > 0 && lsfItems.length > 0;

                  return (
                    <div className="space-y-4">
                      {hasBothCommerces && (
                        <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
                          <p className="text-orange-800 font-medium">⚠️ Commande mixte - Préparation coordonnée requise</p>
                        </div>
                      )}

                      {dolceItems.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg flex items-center">
                            🍕 Dolce Italia:
                          </h3>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {dolceItems.map((item, index) => (
                              <div key={`dolce-${index}`} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-l-2 border-red-400">
                                <span className="font-medium">
                                  {item.quantite}x {formatProduitNom(item.produits.nom, item.produits.categorie)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {lsfItems.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg flex items-center">
                            🥪 961 LSF:
                          </h3>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {lsfItems.map((item, index) => (
                              <div key={`lsf-${index}`} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-l-2 border-green-400">
                                <span className="font-medium">
                                  {item.quantite}x {formatProduitNom(item.produits.nom, item.produits.categorie)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Informations client (pour livraisons) */}
                {commande.type_commande === 'livraison' && commande.clients && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Informations client:</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Nom:</strong> {commande.clients.nom}</p>
                      {commande.clients.telephone && (
                        <p><strong>Téléphone:</strong> {commande.clients.telephone}</p>
                      )}
                      {commande.clients.adresse && (
                        <p><strong>Adresse:</strong> {commande.clients.adresse}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {commande.notes && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Notes spéciales:</h4>
                    <p className="text-yellow-800">{commande.notes}</p>
                  </div>
                )}

                {/* Total et heure */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-bold">Total: {commande.total.toFixed(2)}€</span>
                  <span className="text-sm text-gray-500 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(commande.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex space-x-4">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Fermer
              </Button>
              {onAccept && (
                <Button
                  onClick={handleAccept}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  <AcceptIcon className="h-5 w-5 mr-2" />
                  {acceptButtonText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NouvelleCommandeModal;