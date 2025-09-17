import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Clock, CheckCircle, Truck, UserCheck, Settings, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import NouvelleCommande from "@/components/commandes/NouvelleCommande";
import CommandeDetailsModal from "@/components/modals/CommandeDetailsModal";
import HistoriqueCommandes from "./HistoriqueCommandes";
import GestionArticles from "@/components/gestion/GestionArticles";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [showGestionArticles, setShowGestionArticles] = useState(false);
  const [selectedCommandeId, setSelectedCommandeId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [commandeToServe, setCommandeToServe] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const { toast } = useToast();

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
        .neq('statut', 'termine')
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

  // Auto-refresh toutes les secondes
  useAutoRefresh({ 
    refreshFunction: fetchCommandes,
    intervalMs: 1000,
    enabled: true
  });

  useEffect(() => {
    fetchCommandes();
  }, []);

  const getStatusBadge = (statut: string) => {
    const statusConfig = {
      nouveau: { label: "Nouveau", variant: "destructive" as const, icon: Clock },
      en_preparation: { label: "En préparation", variant: "warning" as const, icon: Clock },
      pret: { label: "Prêt", variant: "info" as const, icon: CheckCircle },
      en_livraison: { label: "En livraison", variant: "warning" as const, icon: Truck },
      livre: { label: "Livré", variant: "success" as const, icon: CheckCircle },
      termine: { label: "Terminé", variant: "success" as const, icon: CheckCircle }
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

  const marquerServie = async (commandeId: string) => {
    setCommandeToServe(commandeId);
    setShowPaymentModal(true);
  };

  const confirmerPaiement = async () => {
    if (!commandeToServe || !selectedPaymentMethod) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner un mode de paiement"
      });
      return;
    }

    try {
      // D'abord récupérer les articles de la commande pour déterminer quels commerces mettre à jour
      const { data: items, error: itemsError } = await supabase
        .from('commande_items')
        .select(`
          *,
          produits (
            categorie
          )
        `)
        .eq('commande_id', commandeToServe);

      if (itemsError) throw itemsError;

      // Déterminer quels commerces sont impliqués
      const hasDolce = items?.some(item => 
        ['pizzas', 'pates', 'desserts'].includes(item.produits?.categorie || '')
      ) || false;
      
      const hasLSF = items?.some(item => 
        ['entrees', 'sandwiches', 'bowls_salades', 'frites'].includes(item.produits?.categorie || '')
      ) || false;

      // Préparer les mises à jour de statut
      const updates: any = {
        mode_paiement: selectedPaymentMethod as any
      };

      if (hasDolce) {
        updates.statut_dolce_italia = 'termine';
      }
      if (hasLSF) {
        updates.statut_961_lsf = 'termine';
      }

      const { error } = await supabase
        .from('commandes')
        .update(updates)
        .eq('id', commandeToServe);

      if (error) throw error;

      toast({
        title: "Commande clôturée",
        description: `Commande marquée comme servie avec paiement ${getPaymentMethodLabel(selectedPaymentMethod)}`
      });

      setShowPaymentModal(false);
      setCommandeToServe(null);
      setSelectedPaymentMethod("");
      fetchCommandes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de clôturer la commande"
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

  const voirDetails = (commandeId: string) => {
    setSelectedCommandeId(commandeId);
    setShowDetailsModal(true);
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Tableau de bord - Caissier</h2>
        <div className="flex space-x-2 sm:space-x-3">
          <HistoriqueCommandes />
          
          <Dialog open={showGestionArticles} onOpenChange={setShowGestionArticles}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Gérer articles</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-4xl h-[90vh] max-h-[95vh] overflow-hidden flex flex-col">
              <GestionArticles onClose={() => setShowGestionArticles(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={showNouvelleCommande} onOpenChange={(open) => {
            setShowNouvelleCommande(open);
            if (!open) {
              fetchCommandes(); // Rafraîchir immédiatement après création/fermeture
            }
          }}>
           <DialogTrigger asChild>
             <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Nouvelle commande</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[95vh] overflow-y-auto">
            <NouvelleCommande onClose={() => setShowNouvelleCommande(false)} />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 md:gap-4">
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
                <p className="text-sm font-medium text-gray-600">En livraison</p>
                <p className="text-2xl font-bold text-blue-600">
                  {commandes.filter(c => c.statut === 'en_livraison').length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
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
                <div key={commande.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg gap-3 sm:gap-0">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-2 gap-1 sm:gap-0">
                      <h3 className="font-semibold text-base md:text-lg">{commande.numero_commande}</h3>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(commande.statut)}
                        <Badge variant="outline" className="text-xs">{getTypeCommande(commande.type_commande)}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs md:text-sm text-gray-600 gap-1 sm:gap-0">
                      <span className="font-medium">Total: {commande.total.toFixed(2)}€</span>
                      {commande.clients && (
                        <span>Client: {commande.clients.nom}</span>
                      )}
                      <span className="text-xs">{new Date(commande.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2 justify-end sm:justify-start">
                    {(commande.type_commande === 'sur_place' || commande.type_commande === 'a_emporter') && 
                     commande.statut === 'pret' && (
                      <Button
                        onClick={() => marquerServie(commande.id)}
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Servie
                      </Button>
                    )}
                     <Button
                       onClick={() => voirDetails(commande.id)}
                       variant="outline" 
                       size="sm"
                     >
                       <Eye className="h-4 w-4" />
                     </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modale des détails de commande */}
      <CommandeDetailsModal
        commandeId={selectedCommandeId}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedCommandeId(null);
        }}
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
              Sélectionnez le mode de paiement pour clôturer cette commande :
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
                  setCommandeToServe(null);
                  setSelectedPaymentMethod("");
                }}
              >
                Annuler
              </Button>
              <Button 
                onClick={confirmerPaiement}
                disabled={!selectedPaymentMethod}
                className="bg-green-600 hover:bg-green-700"
              >
                Confirmer le paiement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaissierDashboard;