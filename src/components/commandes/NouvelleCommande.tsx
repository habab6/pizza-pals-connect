import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatProduitNom } from "@/utils/formatters";
import { Plus, Minus, Search, Phone, MapPin } from "lucide-react";

interface Produit {
  id: string;
  nom: string;
  categorie: 'pizzas' | 'pates' | 'desserts' | 'boissons';
  prix: number;
}

interface CartItem {
  produit: Produit;
  quantite: number;
  remarque?: string;
}

interface Client {
  id: string;
  nom: string;
  telephone: string;
  adresse?: string;
}

interface NouvelleCommandeProps {
  onClose: () => void;
}

const NouvelleCommande = ({ onClose }: NouvelleCommandeProps) => {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [panier, setPanier] = useState<CartItem[]>([]);
  const [typeCommande, setTypeCommande] = useState<'sur_place' | 'a_emporter' | 'livraison'>('sur_place');
  const [clientInfo, setClientInfo] = useState({
    nom: '',
    telephone: '',
    adresse: ''
  });
  const [clientExistant, setClientExistant] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [categorieActive, setCategorieActive] = useState<string>('pizzas');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchProduits();
  }, []);

  const fetchProduits = async () => {
    try {
      const { data, error } = await supabase
        .from('produits')
        .select('*')
        .eq('disponible', true)
        .order('nom');

      if (error) throw error;
      setProduits(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les produits"
      });
    }
  };

  const searchClient = async (telephone: string) => {
    if (telephone.length < 8) {
      setClientExistant(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('telephone', telephone)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setClientExistant(data);
        setClientInfo({
          nom: data.nom,
          telephone: data.telephone,
          adresse: data.adresse || ''
        });
      } else {
        setClientExistant(null);
      }
    } catch (error: any) {
      console.error('Erreur recherche client:', error);
    }
  };

  const ajouterAuPanier = (produit: Produit) => {
    setPanier(prev => {
      const existant = prev.find(item => item.produit.id === produit.id);
      if (existant) {
        return prev.map(item =>
          item.produit.id === produit.id
            ? { ...item, quantite: item.quantite + 1 }
            : item
        );
      }
      return [...prev, { produit, quantite: 1, remarque: '' }];
    });
  };

  const modifierQuantite = (produitId: string, delta: number) => {
    setPanier(prev =>
      prev.map(item => {
        if (item.produit.id === produitId) {
          const nouvelleQuantite = item.quantite + delta;
          return nouvelleQuantite <= 0 
            ? null 
            : { ...item, quantite: nouvelleQuantite };
        }
        return item;
      }).filter(Boolean) as CartItem[]
    );
  };

  const calculerTotal = () => {
    return panier.reduce((total, item) => total + (item.produit.prix * item.quantite), 0);
  };

  const validerCommande = async () => {
    if (panier.length === 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le panier est vide"
      });
      return;
    }

    // Vérifier les infos client
    if (!clientInfo.nom.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom du client est requis"
      });
      return;
    }

    if (typeCommande === 'livraison') {
      if (!clientInfo.telephone.trim() || !clientInfo.adresse.trim()) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Téléphone et adresse requis pour une livraison"
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      let clientId = null;

      // Créer ou récupérer le client
      if (typeCommande === 'livraison' && clientInfo.nom.trim()) {
        if (clientExistant) {
          clientId = clientExistant.id;
          // Mettre à jour les infos si nécessaire
          if (typeCommande === 'livraison' && clientInfo.adresse !== clientExistant.adresse) {
            await supabase
              .from('clients')
              .update({ adresse: clientInfo.adresse })
              .eq('id', clientExistant.id);
          }
        } else {
          // Créer un nouveau client seulement pour les livraisons
          const { data: nouveauClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              nom: clientInfo.nom.trim(),
              telephone: clientInfo.telephone.trim(),
              adresse: clientInfo.adresse.trim()
            })
            .select()
            .single();

          if (clientError) throw clientError;
          clientId = nouveauClient.id;
        }
      } else if (typeCommande !== 'livraison' && clientInfo.nom.trim()) {
        // Pour sur place et à emporter, créer un client sans téléphone ni adresse
        const { data: nouveauClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            nom: clientInfo.nom.trim(),
            telephone: `client_${Date.now()}`, // Téléphone unique fictif
            adresse: null
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = nouveauClient.id;
      }

      // Créer la commande
      const { data: commande, error: commandeError } = await supabase
        .from('commandes')
        .insert({
          type_commande: typeCommande,
          client_id: clientId,
          caissier_id: null, // Pas d'authentification
          total: calculerTotal(),
          notes: notes.trim() || null,
          numero_commande: Date.now().toString()
        })
        .select()
        .single();

      if (commandeError) throw commandeError;

      // Ajouter les items de la commande
      const items = panier.map(item => ({
        commande_id: commande.id,
        produit_id: item.produit.id,
        quantite: item.quantite,
        prix_unitaire: item.produit.prix,
        remarque: item.remarque || null
      }));

      const { error: itemsError } = await supabase
        .from('commande_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Notifier les pizzaiolos d'une nouvelle commande
      const { data: pizzaiolos } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'pizzaiolo');

      if (pizzaiolos && pizzaiolos.length > 0) {
        await supabase
          .from('notifications')
          .insert(
            pizzaiolos.map((p: any) => ({
              user_id: p.id,
              commande_id: commande.id,
              titre: 'Nouvelle commande',
              message: `Commande ${commande.numero_commande} à préparer`
            }))
          );
      }

      toast({
        title: "Commande créée !",
        description: `Commande ${commande.numero_commande} créée avec succès`
      });

      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la commande: " + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const produitsFiltrés = produits
    .filter(p => p.categorie === categorieActive)
    .filter(p => p.nom.toLowerCase().includes(searchTerm.toLowerCase()));

  const categories = [
    { key: 'pizzas', label: '🍕 Pizzas' },
    { key: 'pates', label: '🍝 Pâtes' },
    { key: 'desserts', label: '🍰 Desserts' },
    { key: 'boissons', label: '🥤 Boissons' }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Nouvelle commande</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu des produits */}
        <div className="lg:col-span-2 space-y-4">
          {/* Type de commande */}
          <Card>
            <CardHeader>
              <CardTitle>Type de commande</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={typeCommande} onValueChange={(value: any) => setTypeCommande(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sur_place">Sur place</SelectItem>
                  <SelectItem value="a_emporter">À emporter</SelectItem>
                  <SelectItem value="livraison">Livraison</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Infos client */}
          <Card>
            <CardHeader>
              <CardTitle>Informations client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du client *</Label>
                <Input
                  id="nom"
                  placeholder="Nom du client"
                  value={clientInfo.nom}
                  onChange={(e) => setClientInfo({...clientInfo, nom: e.target.value})}
                  required
                />
              </div>

              {typeCommande === 'livraison' && (
                <>
                  <div>
                    <Label htmlFor="telephone">Téléphone *</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="telephone"
                        placeholder="Ex: 0123456789"
                        value={clientInfo.telephone}
                        onChange={(e) => {
                          setClientInfo({...clientInfo, telephone: e.target.value});
                          searchClient(e.target.value);
                        }}
                        className="flex-1"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => searchClient(clientInfo.telephone)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    {clientExistant && (
                      <p className="text-sm text-green-600 mt-1">Client trouvé: {clientExistant.nom}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="adresse">Adresse de livraison *</Label>
                    <Textarea
                      id="adresse"
                      placeholder="Adresse complète"
                      value={clientInfo.adresse}
                      onChange={(e) => setClientInfo({...clientInfo, adresse: e.target.value})}
                      rows={2}
                      required
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Infos client livraison supplémentaires */}
          {false && (
            <Card>
              <CardHeader>
                <CardTitle>Informations client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="telephone"
                      placeholder="Ex: 0123456789"
                      value={clientInfo.telephone}
                      onChange={(e) => {
                        setClientInfo({...clientInfo, telephone: e.target.value});
                        searchClient(e.target.value);
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => searchClient(clientInfo.telephone)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  {clientExistant && (
                    <p className="text-sm text-green-600 mt-1">Client trouvé: {clientExistant.nom}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    placeholder="Nom du client"
                    value={clientInfo.nom}
                    onChange={(e) => setClientInfo({...clientInfo, nom: e.target.value})}
                  />
                </div>

                {typeCommande === 'livraison' && (
                  <div>
                    <Label htmlFor="adresse">Adresse de livraison</Label>
                    <Textarea
                      id="adresse"
                      placeholder="Adresse complète"
                      value={clientInfo.adresse}
                      onChange={(e) => setClientInfo({...clientInfo, adresse: e.target.value})}
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Menu */}
          <Card>
            <CardHeader>
              <CardTitle>Menu</CardTitle>
              <div className="flex space-x-2">
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {/* Catégories */}
              <div className="flex space-x-2 mb-4 overflow-x-auto">
                {categories.map(cat => (
                  <Button
                    key={cat.key}
                    variant={categorieActive === cat.key ? "default" : "outline"}
                    onClick={() => setCategorieActive(cat.key)}
                    className="whitespace-nowrap"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Produits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {produitsFiltrés.map(produit => (
                  <div key={produit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{formatProduitNom(produit.nom, produit.categorie)}</h4>
                      <p className="text-red-600 font-semibold">{produit.prix.toFixed(2)}€</p>
                    </div>
                    <Button
                      onClick={() => ajouterAuPanier(produit)}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panier */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Panier ({panier.length} articles)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {panier.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Panier vide</p>
                ) : (
                  panier.map((item) => (
                    <div key={item.produit.id} className="p-2 bg-gray-50 rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium">{formatProduitNom(item.produit.nom, item.produit.categorie)}</h5>
                          <p className="text-xs text-gray-600">{item.produit.prix.toFixed(2)}€ × {item.quantite}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => modifierQuantite(item.produit.id, -1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-8 text-center">{item.quantite}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => modifierQuantite(item.produit.id, 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        placeholder="Remarque pour ce produit..."
                        value={item.remarque || ''}
                        onChange={(e) => {
                          setPanier(prev => prev.map(p => 
                            p.produit.id === item.produit.id 
                              ? { ...p, remarque: e.target.value }
                              : p
                          ));
                        }}
                        rows={1}
                        className="text-xs"
                      />
                    </div>
                  ))
                )}
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-red-600">{calculerTotal().toFixed(2)}€</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes (optionnel)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Instructions spéciales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={validerCommande}
              disabled={isLoading || panier.length === 0}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Création..." : "Valider la commande"}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Annuler
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NouvelleCommande;