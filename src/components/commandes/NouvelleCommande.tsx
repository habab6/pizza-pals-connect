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
import { Plus, Minus, Search, ShoppingCart, X, Check, MapPin, Phone, MessageSquare, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import PrixExtraModal from "@/components/modals/PrixExtraModal";

interface Produit {
  id: string;
  nom: string;
  categorie: 'pizzas' | 'pates' | 'desserts' | 'boissons' | 'entrees' | 'bowls_salades' | 'frites' | 'sandwiches';
  prix: number;
  est_extra: boolean;
  categorie_custom_id: string | null;
}

interface CartItem {
  produit: Produit;
  quantite: number;
  prix_unitaire?: number; // Pour les articles extra avec prix personnalisé
  nom_personnalise?: string; // Pour les articles extra avec nom personnalisé
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
  const [commerceActive, setCommerceActive] = useState<'dolce_italia' | '961_lsf'>('dolce_italia');
  const [showPrixExtraModal, setShowPrixExtraModal] = useState(false);
  const [produitPourPrixExtra, setProduitPourPrixExtra] = useState<Produit | null>(null);
  
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

  const ajouterAuPanier = (produit: Produit, prixPersonnalise?: number, nomPersonnalise?: string) => {
    setPanier(prev => {
      const existant = prev.find(item => 
        item.produit.id === produit.id && 
        item.prix_unitaire === (prixPersonnalise || produit.prix) &&
        item.nom_personnalise === nomPersonnalise
      );
      if (existant) {
        return prev.map(item =>
          item.produit.id === produit.id && 
          item.prix_unitaire === (prixPersonnalise || produit.prix) &&
          item.nom_personnalise === nomPersonnalise
            ? { ...item, quantite: item.quantite + 1 }
            : item
        );
      }
      return [...prev, { 
        produit, 
        quantite: 1,
        prix_unitaire: prixPersonnalise || produit.prix,
        nom_personnalise: nomPersonnalise
      }];
    });
  };

  const handleProductClick = (produit: Produit) => {
    console.log('Produit cliqué:', produit);
    console.log('Est un produit extra?', produit.est_extra);
    
    if (produit.est_extra) {
      console.log('Ouverture du modal prix extra pour:', produit.nom);
      setProduitPourPrixExtra(produit);
      setShowPrixExtraModal(true);
    } else {
      ajouterAuPanier(produit);
    }
  };

  const handlePrixExtraConfirm = (nom: string, prix: number) => {
    console.log('Prix confirmé:', prix, 'nom:', nom, 'pour le produit:', produitPourPrixExtra?.nom);
    
    if (produitPourPrixExtra) {
      ajouterAuPanier(produitPourPrixExtra, prix, nom);
      setProduitPourPrixExtra(null);
    }
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
    return panier.reduce((total, item) => {
      const prix = item.prix_unitaire || item.produit.prix;
      return total + (prix * item.quantite);
    }, 0);
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

      // Déterminer le commerce principal en fonction des articles
      const commerces = new Set();
      panier.forEach(item => {
        const categorie = item.produit.categorie;
        if (['pizzas', 'pates', 'desserts'].includes(categorie)) {
          commerces.add('dolce_italia');
        } else if (['sandwiches', 'entrees', 'bowls_salades', 'frites'].includes(categorie)) {
          commerces.add('961_lsf');
        } else {
          // Boissons peuvent appartenir aux deux
          commerces.add('dolce_italia');
        }
      });
      
      // Si mixte, choisir en fonction de la majorité ou par défaut dolce_italia
      const commerce_principal = commerces.has('dolce_italia') ? 'dolce_italia' : '961_lsf';

      const { data: commande, error: commandeError } = await supabase
        .from('commandes')
        .insert({
          type_commande: typeCommande,
          client_id: clientId,
          caissier_id: null,
          total: calculerTotal(),
          notes: notesGenerales.trim() || null,
          numero_commande: `CMD${Date.now()}`,
          commerce_principal: commerce_principal
        })
        .select()
        .single();

      if (commandeError) throw commandeError;

      const items = panier.map(item => ({
        commande_id: commande.id,
        produit_id: item.produit.id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire || item.produit.prix,
        remarque: null
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

  const commerces = {
    dolce_italia: {
      name: 'Dolce Italia',
      color: 'bg-red-50 text-red-700 border-red-200',
      categories: [
        { key: 'pizzas', label: 'Pizzas', color: 'bg-red-50 text-red-700 border-red-200' },
        { key: 'pates', label: 'Pâtes', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        { key: 'desserts', label: 'Desserts', color: 'bg-pink-50 text-pink-700 border-pink-200' },
        { key: 'boissons_dolce', label: 'Boissons', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      ]
    },
    '961_lsf': {
      name: '961 LSF',
      color: 'bg-green-50 text-green-700 border-green-200',
      categories: [
        { key: 'entrees', label: 'Entrées', color: 'bg-green-50 text-green-700 border-green-200' },
        { key: 'sandwiches', label: 'Sandwiches', color: 'bg-orange-50 text-orange-700 border-orange-200' },
        { key: 'bowls_salades', label: 'Bowls & Salades', color: 'bg-purple-50 text-purple-700 border-purple-200' },
        { key: 'frites', label: 'Frites', color: 'bg-amber-50 text-amber-700 border-amber-200' },
        { key: 'boissons_lsf', label: 'Boissons', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      ]
    }
  };

  const categories = [
    // Dolce Italia
    { key: 'pizzas', label: 'Pizzas', color: 'bg-red-50 text-red-700 border-red-200' },
    { key: 'pates', label: 'Pâtes', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { key: 'desserts', label: 'Desserts', color: 'bg-pink-50 text-pink-700 border-pink-200' },
    { key: 'boissons', label: 'Boissons', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    // 961 LSF
    { key: 'entrees', label: 'Entrées', color: 'bg-green-50 text-green-700 border-green-200' },
    { key: 'sandwiches', label: 'Sandwiches', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { key: 'bowls_salades', label: 'Bowls & Salades', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { key: 'frites', label: 'Frites', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  ];

  const canProceedToClient = () => {
    return panier.length > 0;
  };

  const getFilteredProducts = () => {
    let filteredCategory = categorieActive;
    
    // Gestion spéciale des boissons par commerce
    if (categorieActive === 'boissons_dolce') {
      filteredCategory = 'boissons';
    } else if (categorieActive === 'boissons_lsf') {
      filteredCategory = 'boissons';
    }
    
    return produits
      .filter(p => p.categorie === filteredCategory)
      .filter(p => searchTerm === '' || p.nom.toLowerCase().includes(searchTerm.toLowerCase()));
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
                    <SelectItem value="sur_place">Sur place</SelectItem>
                      <SelectItem value="a_emporter">À emporter</SelectItem>
                      <SelectItem value="livraison">Livraison</SelectItem>
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

                {/* Navigation des commerces */}
                <div className="flex justify-center space-x-4 mb-3">
                  <Button
                    variant={commerceActive === 'dolce_italia' ? "default" : "outline"}
                    onClick={() => {
                      setCommerceActive('dolce_italia');
                      setCategorieActive('pizzas');
                    }}
                    className="px-6"
                  >
                    Dolce Italia
                  </Button>
                  
                  <Button
                    variant={commerceActive === '961_lsf' ? "default" : "outline"}
                    onClick={() => {
                      setCommerceActive('961_lsf');
                      setCategorieActive('entrees');
                    }}
                    className="px-6"
                  >
                    961 LSF
                  </Button>
                </div>

                {/* Catégories du commerce sélectionné */}
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {commerces[commerceActive].categories.map(cat => (
                    <Button
                      key={cat.key}
                      variant={categorieActive === cat.key ? "default" : "outline"}
                      onClick={() => setCategorieActive(cat.key)}
                      className="whitespace-nowrap min-w-0"
                      size="sm"
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Liste des produits - Limitée à 4 items visibles */}
              <div className="flex-1 overflow-hidden">
                <div className="p-4">
                  <div className="space-y-3 max-h-[480px] overflow-y-auto">
                     {getFilteredProducts()
                       .map(produit => {
                        const quantiteInPanier = getQuantiteInPanier(produit.id);
                        const isSelected = quantiteInPanier > 0;
                        
                        return (
                          <Card 
                            key={produit.id} 
                            className={`transition-all hover:shadow-md ${
                              isSelected ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm mb-1 truncate">{formatProduitNom(produit.nom, produit.categorie)}</h4>
                                  <p className="text-primary font-bold">{produit.prix.toFixed(2)}€</p>
                                </div>
                                
                                <div className="flex items-center space-x-3 ml-4">
                                  {isSelected && (
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => modifierQuantite(produit.id, -1)}
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
                                        onClick={() => modifierQuantite(produit.id, 1)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  
                                   <Button
                                     onClick={() => handleProductClick(produit)}
                                     size="sm"
                                     className={isSelected ? 'bg-primary/80' : ''}
                                   >
                                     <Plus className="h-3 w-3 mr-1" />
                                     {produit.est_extra ? 'Prix' : 'Ajouter'}
                                   </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    
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
                                   <h5 className="text-sm font-medium truncate">
                                     {item.nom_personnalise || formatProduitNom(item.produit.nom, item.produit.categorie)}
                                     {item.produit.est_extra && (
                                       <Badge variant="outline" className="ml-1 text-xs">
                                         {item.nom_personnalise ? 'Personnalisé' : 'Extra'}
                                       </Badge>
                                     )}
                                   </h5>
                                   <p className="text-xs text-muted-foreground">
                                     {(item.prix_unitaire || item.produit.prix).toFixed(2)}€ × {item.quantite}
                                     {item.produit.est_extra && (item.prix_unitaire !== item.produit.prix || item.nom_personnalise) && (
                                       <span className="text-blue-600 ml-1">(Personnalisé)</span>
                                     )}
                                   </p>
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
                              
                              <div className="flex justify-end">
                                <p className="text-sm font-bold text-primary">
                                  {(item.produit.prix * item.quantite).toFixed(2)}€
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                        
                        {/* Instructions spéciales dans le panier */}
                        <div className="pt-2">
                          <Label className="text-sm font-medium flex items-center mb-2">
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

      {/* Modal pour prix extra */}
      <PrixExtraModal
        open={showPrixExtraModal}
        onClose={() => {
          setShowPrixExtraModal(false);
          setProduitPourPrixExtra(null);
        }}
        onConfirm={handlePrixExtraConfirm}
        articleNom={produitPourPrixExtra?.nom || ''}
      />
    </div>
  );
};

export default NouvelleCommande;