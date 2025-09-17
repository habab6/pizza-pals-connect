import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Phone, MapPin, Clock, CheckCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import NouvelleCommandeModal from "@/components/modals/NouvelleCommandeModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Commande {
  id: string;
  numero_commande: string;
  type_commande: 'sur_place' | 'a_emporter' | 'livraison';
  commerce_principal: 'dolce_italia' | '961_lsf';
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
    produits: {
      nom: string;
      categorie: string;
      commerce: string;
    };
  }>;
}

const LivreurDashboard = () => {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [mesLivraisons, setMesLivraisons] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [modePaiement, setModePaiement] = useState<'cash' | 'bancontact' | 'visa' | 'mastercard'>('cash');
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  };

  const fetchCommandes = async () => {
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
        .in('type_commande', ['livraison'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCommandes(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les commandes"
      });
    }
  };

  const fetchMesLivraisons = async () => {
    if (!userProfile?.id) return;
    
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
        .eq('livreur_id', userProfile.id)
        .in('statut', ['en_livraison'])
        .in('type_commande', ['livraison'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMesLivraisons(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger vos livraisons"
      });
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchCommandes(),
      fetchMesLivraisons()
    ]);
    setIsLoading(false);
  }, [userProfile]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      loadData();
    }
  }, [userProfile, loadData]);

  useAutoRefresh(loadData, 5000);

  const accepterLivraison = async (commandeId: string) => {
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ 
          statut: 'en_livraison',
          livreur_id: userProfile.id
        })
        .eq('id', commandeId);

      if (error) throw error;

      toast({
        title: "Livraison acceptée",
        description: "La commande est maintenant en cours de livraison"
      });

      await loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'accepter la livraison"
      });
    }
  };

  const openCommandeModal = (commande: Commande) => {
    setSelectedCommande(commande);
    setShowModal(true);
  };

  const openPaiementModal = (commande: Commande) => {
    setSelectedCommande(commande);
    setShowPaiementModal(true);
  };

  const terminerLivraison = async () => {
    if (!selectedCommande) return;

    try {
      const { error } = await supabase
        .from('commandes')
        .update({ 
          statut: 'livre',
          mode_paiement: modePaiement
        })
        .eq('id', selectedCommande.id);

      if (error) throw error;

      toast({
        title: "Livraison terminée",
        description: "La commande a été livrée avec succès"
      });

      setShowPaiementModal(false);
      setSelectedCommande(null);
      await loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de terminer la livraison"
      });
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'sur_place': return 'default';
      case 'a_emporter': return 'secondary';
      case 'livraison': return 'destructive';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sur_place': return '🍽️';
      case 'a_emporter': return '📦';
      case 'livraison': return '🚚';
      default: return '📋';
    }
  };

  const getCommerceInfo = (commerce: string) => {
    switch (commerce) {
      case 'dolce_italia': return { label: 'Dolce Italia', icon: '🍕', color: 'red' };
      case '961_lsf': return { label: '961 LSF', icon: '🥪', color: 'green' };
      default: return { label: commerce, icon: '🏪', color: 'gray' };
    }
  };

  const hasMultipleCommerces = (commande: Commande) => {
    const commerces = new Set(commande.commande_items?.map(item => item.produits?.commerce) || []);
    return commerces.size > 1;
  };

  const groupItemsByCommerce = (items: any[]) => {
    const grouped = {
      dolce_italia: items.filter(item => item.produits?.commerce === 'dolce_italia'),
      '961_lsf': items.filter(item => item.produits?.commerce === '961_lsf')
    };
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Truck className="mr-3 h-8 w-8 text-primary" />
          Dashboard Livreur
        </h1>
        <div className="text-sm text-muted-foreground">
          Connexion: {userProfile?.nom}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Nouvelles livraisons disponibles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🚚 Livraisons disponibles</span>
              <Badge variant="destructive" className="animate-pulse">
                {commandes.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {commandes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune livraison disponible
                </p>
              ) : (
                commandes.map((commande) => {
                  const groupedItems = groupItemsByCommerce(commande.commande_items || []);
                  const isMultiCommerce = hasMultipleCommerces(commande);
                  
                  return (
                    <Card 
                      key={commande.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                      onClick={() => openCommandeModal(commande)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-lg">{commande.numero_commande}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={getTypeBadgeVariant(commande.type_commande)}>
                                {getTypeIcon(commande.type_commande)} {commande.type_commande.replace('_', ' ')}
                              </Badge>
                              {isMultiCommerce && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  🔗 Commande mixte
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

                        {/* Informations client */}
                        <div className="bg-blue-50 p-3 rounded-lg mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <p className="font-medium">{commande.clients?.nom}</p>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{commande.clients?.telephone}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                <span>{commande.clients?.adresse}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Articles par commerce */}
                        <div className="space-y-2">
                          {groupedItems.dolce_italia.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-red-600 mb-1">🍕 Dolce Italia:</p>
                              {groupedItems.dolce_italia.map((item, index) => (
                                <div key={`dolce-${index}`} 
                                     className="text-sm bg-red-50 p-2 rounded border-l-2 border-red-400">
                                  {item.quantite}x {item.produits.nom}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {groupedItems['961_lsf'].length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-1">🥪 961 LSF:</p>
                              {groupedItems['961_lsf'].map((item, index) => (
                                <div key={`lsf-${index}`} 
                                     className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-400">
                                  {item.quantite}x {item.produits.nom}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 mt-3">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              accepterLivraison(commande.id);
                            }}
                            className="flex-1"
                            size="sm"
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Accepter la livraison
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mes livraisons en cours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🏃‍♂️ Mes livraisons</span>
              <Badge variant="secondary">
                {mesLivraisons.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {mesLivraisons.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune livraison en cours
                </p>
              ) : (
                mesLivraisons.map((commande) => {
                  const groupedItems = groupItemsByCommerce(commande.commande_items || []);
                  const isMultiCommerce = hasMultipleCommerces(commande);
                  
                  return (
                    <Card 
                      key={commande.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500"
                      onClick={() => openCommandeModal(commande)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-lg">{commande.numero_commande}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="default">
                                🚚 En livraison
                              </Badge>
                              {isMultiCommerce && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  🔗 Mixte
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

                        {/* Informations client */}
                        <div className="bg-green-50 p-3 rounded-lg mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <p className="font-medium">{commande.clients?.nom}</p>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{commande.clients?.telephone}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                <span>{commande.clients?.adresse}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Articles par commerce */}
                        <div className="space-y-2">
                          {groupedItems.dolce_italia.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-red-600 mb-1">🍕 Dolce Italia:</p>
                              {groupedItems.dolce_italia.map((item, index) => (
                                <div key={`dolce-${index}`} 
                                     className="text-sm bg-red-50 p-2 rounded border-l-2 border-red-400">
                                  {item.quantite}x {item.produits.nom}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {groupedItems['961_lsf'].length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-600 mb-1">🥪 961 LSF:</p>
                              {groupedItems['961_lsf'].map((item, index) => (
                                <div key={`lsf-${index}`} 
                                     className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-400">
                                  {item.quantite}x {item.produits.nom}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 mt-3">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              openPaiementModal(commande);
                            }}
                            className="flex-1"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Livraison effectuée
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
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

      {/* Modal de paiement */}
      <Dialog open={showPaiementModal} onOpenChange={setShowPaiementModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la livraison</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Commande: <strong>{selectedCommande?.numero_commande}</strong></p>
            <p>Total: <strong>{selectedCommande?.total.toFixed(2)}€</strong></p>
            
            <div>
              <label className="block text-sm font-medium mb-2">Mode de paiement:</label>
              <Select value={modePaiement} onValueChange={(value: any) => setModePaiement(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Espèces</SelectItem>
                  <SelectItem value="bancontact">💳 Bancontact</SelectItem>
                  <SelectItem value="visa">💳 Visa</SelectItem>
                  <SelectItem value="mastercard">💳 Mastercard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPaiementModal(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={terminerLivraison}
                className="flex-1"
              >
                <CreditCard className="h-4 w-4 mr-2" />
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