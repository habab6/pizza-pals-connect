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
import { Plus, Minus, Search, ShoppingCart, X, Check, MapPin, Phone, MessageSquare, ChevronRight, Edit3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Produit {
  id: string;
  nom: string;
  categorie: 'pizzas' | 'pates' | 'desserts' | 'boissons';
  prix: number;
}

interface CartItem {
  produit: Produit;
  quantite: number;
  notes?: string;
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
  const [notesGenerales, setNotesGenerales] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'menu' | 'client'>('menu');
  const [categorieActive, setCategorieActive] = useState<string>('pizzas');
  const [editingItemNotes, setEditingItemNotes] = useState<string | null>(null);
  
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
        .maybeSingle();

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
      return [...prev, { produit, quantite: 1, notes: '' }];
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

  const modifierNotesItem = (produitId: string, notes: string) => {
    setPanier(prev =>
      prev.map(item =>
        item.produit.id === produitId ? { ...item, notes } : item
      )
    );
  };

  const calculerTotal = () => {
    return panier.reduce((total, item) => total + (item.produit.prix * item.quantite), 0);
  };

  const getQuantiteInPanier = (produitId: string) => {
    const item = panier.find(p => p.produit.id === produitId);
    return item ? item.quantite : 0;
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

      if (typeCommande === 'livraison' && clientInfo.nom.trim()) {
        if (clientExistant) {
          clientId = clientExistant.id;
          if (typeCommande === 'livraison' && clientInfo.adresse !== clientExistant.adresse) {
            await supabase
              .from('clients')
              .update({ adresse: clientInfo.adresse })
              .eq('id', clientExistant.id);
          }
        } else {
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
        const { data: nouveauClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            nom: clientInfo.nom.trim(),
            telephone: `client_${Date.now()}`,
            adresse: null
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = nouveauClient.id;
      }

      const { data: commande, error: commandeError } = await supabase
        .from('commandes')
        .insert({
          type_commande: typeCommande,
          client_id: clientId,
          caissier_id: null,
          total: calculerTotal(),
          notes: notesGenerales.trim() || null,
          numero_commande: `CMD${Date.now()}`
        })
        .select()
        .single();

      if (commandeError) throw commandeError;

      const items = panier.map(item => ({
        commande_id: commande.id,
        produit_id: item.produit.id,
        quantite: item.quantite,
        prix_unitaire: item.produit.prix,
        remarque: item.notes?.trim() || null
      }));

      const { error: itemsError } = await supabase
        .from('commande_items')
        .insert(items);

      if (itemsError) throw itemsError;

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

  const categories = [
    { key: 'pizzas', label: 'Pizzas', icon: '🍕', color: 'bg-red-50 text-red-700 border-red-200' },
    { key: 'pates', label: 'Pâtes', icon: '🍝', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { key: 'desserts', label: 'Desserts', icon: '🍰', color: 'bg-pink-50 text-pink-700 border-pink-200' },
    { key: 'boissons', label: 'Boissons', icon: '🥤', color: 'bg-blue-50 text-blue-700 border-blue-200' }
  ];

  const canProceedToClient = () => {
    return panier.length > 0;
  };

  const canValidateOrder = () => {
    if (!clientInfo.nom.trim()) return false;
    if (typeCommande === 'livraison') {
      return clientInfo.telephone.trim() && clientInfo.adresse.trim();
    }
    return true;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header fixe */}
      <div className="flex-shrink-0 border-b bg-background">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold">Nouvelle commande</h2>
            <Badge variant="outline" className="hidden sm:inline-flex">
              {currentView === 'menu' ? 'Menu' : 'Client'}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation rapide */}
        <div className="flex items-center justify-center pb-3">
          <div className="flex items-center space-x-1 bg-muted rounded-full p-1">
            <Button
              variant={currentView === 'menu' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('menu')}
              className="rounded-full px-4"
            >
              Menu
            </Button>
            <Button
              variant={currentView === 'client' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('client')}
              disabled={!canProceedToClient()}
              className="rounded-full px-4"
            >
              Client
              {canProceedToClient() && <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'menu' && (
          <div className="h-full flex">
            {/* Menu des produits */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Contrôles */}
              <div className="flex-shrink-0 p-4 space-y-3 border-b">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={typeCommande} onValueChange={(value: any) => setTypeCommande(value)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sur_place">🍽️ Sur place</SelectItem>
                      <SelectItem value="a_emporter">📦 À emporter</SelectItem>
                      <SelectItem value="livraison">🚚 Livraison</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un produit..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Catégories */}
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {categories.map(cat => (
                    <Button
                      key={cat.key}
                      variant={categorieActive === cat.key ? "default" : "outline"}
                      onClick={() => setCategorieActive(cat.key)}
                      className="whitespace-nowrap min-w-0 flex items-center space-x-2"
                      size="sm"
                    >
                      <span>{cat.icon}</span>
                      <span className="hidden sm:inline">{cat.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Liste des produits */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {produits
                        .filter(p => p.categorie === categorieActive)
                        .filter(p => searchTerm === '' || p.nom.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(produit => {
                          const quantiteInPanier = getQuantiteInPanier(produit.id);
                          const isSelected = quantiteInPanier > 0;
                          
                          return (
                            <Card 
                              key={produit.id} 
                              className={`transition-all hover:shadow-md cursor-pointer ${
                                isSelected ? 'ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/50'
                              }`}
                            >
                              <CardContent className="p-3">
                                <div className="space-y-3">
                                  {/* Info produit */}
                                  <div className="text-center">
                                    <h4 className="font-medium text-sm leading-tight line-clamp-2 mb-2">
                                      {formatProduitNom(produit.nom, produit.categorie)}
                                    </h4>
                                    <p className="text-primary font-bold text-lg">{produit.prix.toFixed(2)}€</p>
                                  </div>
                                  
                                  {/* Contrôles quantité */}
                                  {isSelected ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-center space-x-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            modifierQuantite(produit.id, -1);
                                          }}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <Badge variant="secondary" className="min-w-[2.5rem] justify-center font-bold">
                                          {quantiteInPanier}
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            modifierQuantite(produit.id, 1);
                                          }}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          ajouterAuPanier(produit);
                                        }}
                                        size="sm"
                                        className="w-full h-8"
                                        variant="outline"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Ajouter
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        ajouterAuPanier(produit);
                                      }}
                                      size="sm"
                                      className="w-full"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Ajouter
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                    
                    {/* Message si aucun produit */}
                    {produits
                      .filter(p => p.categorie === categorieActive)
                      .filter(p => searchTerm === '' || p.nom.toLowerCase().includes(searchTerm.toLowerCase()))
                      .length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                          <Search className="h-8 w-8 mb-2" />
                          <p className="text-sm">Aucun produit trouvé</p>
                        </div>
                      )}
                  </div>
                </ScrollArea>
              </div>

              {/* Notes générales */}
              <div className="flex-shrink-0 p-4 border-t bg-muted/30">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Instructions spéciales
                  </Label>
                  <Textarea
                    placeholder="Ex: Cuisson bien cuite, sans oignons, etc..."
                    value={notesGenerales}
                    onChange={(e) => setNotesGenerales(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Panier sidebar */}
            <div className="w-80 border-l bg-muted/20 flex flex-col">
              <div className="flex-shrink-0 p-4 border-b bg-background">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Panier ({panier.length})
                  </h3>
                  {panier.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPanier([])}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Vider
                    </Button>
                  )}
                </div>
                
                {panier.length > 0 && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{calculerTotal().toFixed(2)}€</p>
                    <p className="text-sm text-muted-foreground">{panier.reduce((sum, item) => sum + item.quantite, 0)} articles</p>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {panier.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8 mb-2" />
                        <p className="text-sm text-center">Ajoutez des produits à votre commande</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {panier.map((item) => (
                          <Card key={item.produit.id} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-sm font-medium truncate">{formatProduitNom(item.produit.nom, item.produit.categorie)}</h5>
                                  <p className="text-xs text-muted-foreground">{item.produit.prix.toFixed(2)}€ × {item.quantite}</p>
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
                                  <span className="text-sm w-6 text-center font-medium">{item.quantite}</span>
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
                              
                              <div className="flex justify-between items-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingItemNotes(editingItemNotes === item.produit.id ? null : item.produit.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Edit3 className="h-3 w-3 mr-1" />
                                  Notes
                                </Button>
                                <p className="text-sm font-bold text-primary">
                                  {(item.produit.prix * item.quantite).toFixed(2)}€
                                </p>
                              </div>
                              
                              {editingItemNotes === item.produit.id && (
                                <Textarea
                                  placeholder="Notes pour cet article..."
                                  value={item.notes || ''}
                                  onChange={(e) => modifierNotesItem(item.produit.id, e.target.value)}
                                  rows={2}
                                  className="text-xs"
                                />
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {panier.length > 0 && (
                <div className="flex-shrink-0 p-4 border-t bg-background">
                  <Button
                    onClick={() => setCurrentView('client')}
                    className="w-full"
                    size="lg"
                  >
                    Continuer
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'client' && (
          <div className="h-full flex items-center justify-center p-6">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-lg">Informations client</CardTitle>
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
                        <p className="text-sm text-green-600 mt-1 flex items-center">
                          <Check className="h-3 w-3 mr-1" />
                          Client trouvé: {clientExistant.nom}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="adresse">Adresse de livraison *</Label>
                      <Textarea
                        id="adresse"
                        placeholder="Adresse complète"
                        value={clientInfo.adresse}
                        onChange={(e) => setClientInfo({...clientInfo, adresse: e.target.value})}
                        rows={3}
                        required
                      />
                    </div>
                  </>
                )}

                <Separator />

                {/* Récapitulatif */}
                <div className="space-y-3">
                  <h4 className="font-medium">Récapitulatif</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Type:</strong> {typeCommande === 'sur_place' ? 'Sur place' : typeCommande === 'a_emporter' ? 'À emporter' : 'Livraison'}</p>
                    <p><strong>Articles:</strong> {panier.length} ({panier.reduce((sum, item) => sum + item.quantite, 0)} unités)</p>
                    <p><strong>Total:</strong> <span className="text-primary font-bold">{calculerTotal().toFixed(2)}€</span></p>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentView('menu')}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={validerCommande}
                    disabled={isLoading || !canValidateOrder()}
                    className="flex-1"
                  >
                    {isLoading ? "Création..." : "Valider"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default NouvelleCommande;