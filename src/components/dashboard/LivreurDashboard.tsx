import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Phone, MapPin, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Commande {
  id: string;
  numero_commande: string;
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
    };
  }>;
}

const LivreurDashboard = () => {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [mesLivraisons, setMesLivraisons] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Profil du livreur (si connecté)
  const [livreurProfileId, setLivreurProfileId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setLivreurProfileId(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('role', 'livreur')
        .single();
      setLivreurProfileId(profile?.id ?? null);
    };
    fetchProfile();
  }, []);

  

  const fetchCommandes = useCallback(async () => {
    try {
      // Commandes prêtes pour livraison (non assignées)
      const { data: commandesDisponibles, error: error1 } = await supabase
        .from('commandes')
        .select(`
          *,
          clients (nom, telephone, adresse),
          commande_items (
            quantite,
            produits (nom)
          )
        `)
        .eq('type_commande', 'livraison')
        .eq('statut', 'pret')
        .is('livreur_id', null)
        .order('created_at', { ascending: true });

      // Mes livraisons en cours
      let mesLivraisonsData = null;
      let error2 = null as any;
      if (livreurProfileId) {
        const res = await supabase
          .from('commandes')
          .select(`
            *,
            clients (nom, telephone, adresse),
            commande_items (
              quantite,
              produits (nom)
            )
          `)
          .eq('livreur_id', livreurProfileId)
          .in('statut', ['en_livraison'])
          .order('created_at', { ascending: true });
        mesLivraisonsData = res.data;
        error2 = res.error;
      } else {
        const res = await supabase
          .from('commandes')
          .select(`
            *,
            clients (nom, telephone, adresse),
            commande_items (
              quantite,
              produits (nom)
            )
          `)
          .is('livreur_id', null)
          .in('statut', ['en_livraison'])
          .order('created_at', { ascending: true });
        mesLivraisonsData = res.data;
        error2 = res.error;
      }

      if (error1) throw error1;
      if (error2) throw error2;

      setCommandes(commandesDisponibles || []);
      setMesLivraisons(mesLivraisonsData || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les commandes"
      });
    } finally {
      setIsLoading(false);
    }
  }, [livreurProfileId, toast]);

  useEffect(() => {
    fetchCommandes();

    // Écouter les mises à jour en temps réel pour toutes les tables
    const channel = supabase
      .channel('livreur-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commandes' },
        () => fetchCommandes()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commande_items' },
        () => fetchCommandes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCommandes]);

  const accepterLivraison = async (commandeId: string) => {
    try {
      let updateData: any = { statut: 'en_livraison' };
      if (livreurProfileId) {
        updateData.livreur_id = livreurProfileId;
      }
      const { error } = await supabase
        .from('commandes')
        .update(updateData)
        .eq('id', commandeId);

      if (error) throw error;

      // Récupérer le numéro de commande pour la notification
      const { data: commandeData } = await supabase
        .from('commandes')
        .select('numero_commande')
        .eq('id', commandeId)
        .single();

      // Notifier les caissiers que la livraison a été prise en charge
      const { data: caissiers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'caissier');

      if (caissiers && caissiers.length > 0 && commandeData) {
        await supabase
          .from('notifications')
          .insert(
            caissiers.map(caissier => ({
              user_id: caissier.id,
              commande_id: commandeId,
              titre: "Livraison en cours",
              message: `Commande ${commandeData.numero_commande} prise en charge par un livreur`
            }))
          );
      }

      toast({
        title: "Livraison acceptée",
        description: "La commande a été assignée à vous"
      });

      fetchCommandes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'accepter la livraison"
      });
    }
  };

  const marquerLivre = async (commandeId: string) => {
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ statut: 'termine' })
        .eq('id', commandeId);

      if (error) throw error;

      // Récupérer le numéro de commande pour la notification
      const { data: commandeData } = await supabase
        .from('commandes')
        .select('numero_commande')
        .eq('id', commandeId)
        .single();

      // Notifier les caissiers que la livraison est terminée
      const { data: caissiers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'caissier');

      if (caissiers && caissiers.length > 0 && commandeData) {
        await supabase
          .from('notifications')
          .insert(
            caissiers.map(caissier => ({
              user_id: caissier.id,
              commande_id: commandeId,
              titre: "Livraison terminée",
              message: `Commande ${commandeData.numero_commande} livrée avec succès`
            }))
          );
      }

      toast({
        title: "Livraison terminée",
        description: "La commande a été marquée comme livrée"
      });

      fetchCommandes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de marquer comme livré"
      });
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
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord - Livreur</h2>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mes livraisons</p>
                <p className="text-2xl font-bold text-orange-600">{mesLivraisons.length}</p>
              </div>
              <Truck className="h-8 w-8 text-orange-600" />
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
                        <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                          <span>{item.quantite}x {item.produits.nom}</span>
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
              <Card key={commande.id} className="border-l-4 border-l-red-500">
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
                    <p className="text-sm text-gray-600">
                      {commande.commande_items.slice(0, 2).map(item => 
                        `${item.quantite}x ${item.produits.nom}`
                      ).join(', ')}
                      {commande.commande_items.length > 2 && ` +${commande.commande_items.length - 2} autre(s)`}
                    </p>
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
    </div>
  );
};

export default LivreurDashboard;