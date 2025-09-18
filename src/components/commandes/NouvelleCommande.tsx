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
import { Plus, Minus, Search, ShoppingCart, X, Check, MessageSquare, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import PrixExtraModal from "@/components/modals/PrixExtraModal";
import ExtraProduitModal from "@/components/modals/ExtraProduitModal";

interface Produit {
  id: string;
  nom: string;
  categorie: 'pizzas' | 'pates' | 'desserts' | 'boissons' | 'entrees' | 'bowls_salades' | 'frites' | 'sandwiches' | 'extra';
  prix: number;
  commerce: 'dolce_italia' | '961_lsf';
  est_extra: boolean;
  disponible: boolean;
  categorie_custom_id?: string;
}

interface CartExtra {
  id: string;
  nom: string;
  prix: number;
}

interface CartItem {
  produit: Produit;
  quantite: number;
  prix_unitaire?: number; // Pour les articles extra avec prix personnalisé
  nom_personnalise?: string; // Pour les articles extra avec nom personnalisé
  extras?: CartExtra[]; // Extras liés à ce produit spécifique
}

interface Client {
  id: string;
  nom: string;
  telephone: string;
  adresse?: string;
}

interface CategorieDb {
  id: string;
  nom: string;
  commerce: 'dolce_italia' | '961_lsf';
  actif: boolean;
}

const NouvelleCommande = () => {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categoriesDb, setCategoriesDb] = useState<CategorieDb[]>([]);
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
  const [notesDolceItalia, setNotesDolceItalia] = useState('');
  const [notes961LSF, setNotes961LSF] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'menu' | 'client'>('menu');
  const [categorieActive, setCategorieActive] = useState<string>('');
  const [commerceActive, setCommerceActive] = useState<'dolce_italia' | '961_lsf'>('dolce_italia');
  const [showPrixExtraModal, setShowPrixExtraModal] = useState(false);
  const [produitPourPrixExtra, setProduitPourPrixExtra] = useState<Produit | null>(null);
  const [showExtraProduitModal, setShowExtraProduitModal] = useState(false);
  const [produitPourExtra, setProduitPourExtra] = useState<CartItem | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchProduits();
    fetchCategories();

    const produitsChannel = supabase
      .channel('produits_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produits' },
        () => {
          fetchProduits();
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('categories_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(produitsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);

  // Effet pour sélectionner automatiquement la première catégorie disponible
  useEffect(() => {
    if (categorieActive === '' && categoriesDb.length > 0) {
      const firstCategoryOfCommerce = categoriesDb.find(cat => cat.commerce === commerceActive);
      if (firstCategoryOfCommerce) {
        setCategorieActive(firstCategoryOfCommerce.nom.toLowerCase().replace(/\s+/g, '_').replace(/[&]/g, ''));
      }
    }
  }, [categoriesDb, commerceActive, categorieActive]);

  const fetchProduits = async () => {
    const { data, error } = await supabase
      .from('produits')
      .select('*')
      .eq('disponible', true)
      .order('nom');
    
    if (error) {
      console.error('Erreur lors du chargement des produits:', error);
      return;
    }
    
    setProduits(data || []);
    console.log('Produits chargés:', data);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('actif', true)
      .order('nom');
    
    if (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      return;
    }
    
    setCategoriesDb(data || []);
  };

  const searchClient = async (telephone: string, shouldSearch = true) => {
    if (!telephone.trim() || !shouldSearch) {
      setClientExistant(null);
      return;
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('telephone', telephone.trim())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erreur recherche client:', error);
      return;
    }

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
        prix_unitaire: prixPersonnalise,
        nom_personnalise: nomPersonnalise,
        extras: []
      }];
    });
  };

  const handleProduitClick = (produit: Produit) => {
    console.log('Clic sur produit:', produit.nom);
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

  const modifierQuantite = (produitId: string, changement: number) => {
    setPanier(prev =>
      prev.map(item => {
        if (item.produit.id === produitId) {
          const nouvelleQuantite = Math.max(0, item.quantite + changement);
          return nouvelleQuantite === 0 ? null : { ...item, quantite: nouvelleQuantite };
        }
        return item;
      }).filter(Boolean) as CartItem[]
    );
  };

  const calculerTotal = () => {
    return panier.reduce((total, item) => {
      const prix = item.prix_unitaire || item.produit.prix;
      const prixExtras = item.extras?.reduce((sum, extra) => sum + extra.prix, 0) || 0;
      return total + ((prix + prixExtras) * item.quantite);
    }, 0);
  };

  const getQuantiteInPanier = (produitId: string) => {
    const item = panier.find(p => p.produit.id === produitId);
    return item ? item.quantite : 0;
  };

  // Ajouter un extra à un produit spécifique du panier
  const ajouterExtraAuProduit = (produitIndex: number, extra: CartExtra) => {
    setPanier(prev => prev.map((item, index) => {
      if (index === produitIndex) {
        return {
          ...item,
          extras: [...(item.extras || []), extra]
        };
      }
      return item;
    }));
  };

  // Supprimer un extra d'un produit
  const supprimerExtraDuProduit = (produitIndex: number, extraIndex: number) => {
    setPanier(prev => prev.map((item, index) => {
      if (index === produitIndex) {
        return {
          ...item,
          extras: item.extras?.filter((_, i) => i !== extraIndex) || []
        };
      }
      return item;
    }));
  };

  // Ouvrir le modal pour ajouter un extra à un produit
  const ouvrirModalExtraProduit = (item: CartItem) => {
    setProduitPourExtra(item);
    setShowExtraProduitModal(true);
  };

  // Handler pour confirmer l'ajout d'un extra
  const handleExtraConfirm = (nom: string, prix: number) => {
    if (produitPourExtra) {
      const produitIndex = panier.findIndex(item => item === produitPourExtra);
      if (produitIndex !== -1) {
        const newExtra: CartExtra = {
          id: `extra-${Date.now()}-${Math.random()}`,
          nom,
          prix
        };
        ajouterExtraAuProduit(produitIndex, newExtra);
      }
      setProduitPourExtra(null);
    }
  };

  // Vérifier si la commande contient des articles de plusieurs commerces
  const isCommandeMixte = () => {
    const commerces = new Set<string>();
    panier.forEach(item => {
      const produit = item.produit;
      if (produit.categorie_custom_id) {
        const customCategory = categoriesDb.find(cat => cat.id === produit.categorie_custom_id);
        if (customCategory) {
          commerces.add(customCategory.commerce);
        }
      } else if (produit.commerce) {
        commerces.add(produit.commerce);
      } else {
        commerces.add('dolce_italia');
      }
    });
    
    return commerces.has('dolce_italia') && commerces.has('961_lsf');
  };

  // Vérifier si la commande contient des articles d'un commerce spécifique
  const hasCommerceItems = (commerce: 'dolce_italia' | '961_lsf') => {
    return panier.some(item => {
      const produit = item.produit;
      return produit.commerce === commerce || (commerce === 'dolce_italia' && !produit.commerce);
    });
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
      // Déterminer le commerce principal
      const commerceCounts = { dolce_italia: 0, '961_lsf': 0 };
      
      panier.forEach(item => {
        const produit = item.produit;
        if (produit.categorie_custom_id) {
          const customCategory = categoriesDb.find(cat => cat.id === produit.categorie_custom_id);
          if (customCategory) {
            commerceCounts[customCategory.commerce] += item.quantite;
          }
        } else if (produit.commerce) {
          commerceCounts[produit.commerce] += item.quantite;
        } else {
          commerceCounts['dolce_italia'] += item.quantite;
        }
      });

      const commerce_principal = commerceCounts.dolce_italia >= commerceCounts['961_lsf'] 
        ? 'dolce_italia' 
        : '961_lsf';

      // Créer ou récupérer le client
      let clientId = null;
      if (clientExistant) {
        clientId = clientExistant.id;
        
        // Mettre à jour les infos du client si nécessaire
        if (typeCommande === 'livraison' && clientInfo.adresse.trim()) {
          await supabase
            .from('clients')
            .update({ 
              nom: clientInfo.nom.trim(),
              adresse: clientInfo.adresse.trim() 
            })
            .eq('id', clientExistant.id);
        }
      } else if (clientInfo.nom.trim()) {
        const { data: nouveauClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            nom: clientInfo.nom.trim(),
            telephone: clientInfo.telephone.trim(),
            adresse: typeCommande === 'livraison' ? clientInfo.adresse.trim() || null : null
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
          caissier_id: null,
          total: calculerTotal(),
          notes: !isCommandeMixte() ? notesGenerales.trim() || null : null,
          notes_dolce_italia: isCommandeMixte() || hasCommerceItems('dolce_italia') ? notesDolceItalia.trim() || null : null,
          notes_961_lsf: isCommandeMixte() || hasCommerceItems('961_lsf') ? notes961LSF.trim() || null : null,
          numero_commande: `CMD${Date.now()}`,
          commerce_principal: commerce_principal
        })
        .select()
        .single();

      if (commandeError) throw commandeError;

      const items = panier.map(item => {
        // Construire la remarque avec les extras
        let remarque = item.nom_personnalise || null;
        
        if (item.extras && item.extras.length > 0) {
          const extrasText = item.extras.map(extra => `+${extra.nom}(${extra.prix}€)`).join(',');
          remarque = remarque ? `${remarque}|EXTRAS:${extrasText}` : `EXTRAS:${extrasText}`;
        }
        
        // Calculer le prix unitaire incluant les extras
        const prixExtras = item.extras?.reduce((sum, extra) => sum + extra.prix, 0) || 0;
        const prixUnitaireTotal = (item.prix_unitaire || item.produit.prix) + prixExtras;
        
        return {
          commande_id: commande.id,
          produit_id: item.produit.id,
          quantite: item.quantite,
          prix_unitaire: prixUnitaireTotal,
          remarque: remarque
        };
      });

      const { error: itemsError } = await supabase
        .from('commande_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast({
        title: "Commande créée !",
        description: `Commande n°${commande.numero_commande} créée avec succès`
      });

      // Réinitialiser le formulaire
      setPanier([]);
      setClientInfo({ nom: '', telephone: '', adresse: '' });
      setClientExistant(null);
      setNotesGenerales('');
      setNotesDolceItalia('');
      setNotes961LSF('');
      setCurrentView('menu');

    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la commande"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCommerceCategories = (commerce: 'dolce_italia' | '961_lsf') => {
    // Retourner UNIQUEMENT les catégories personnalisées depuis la base de données
    return categoriesDb
      .filter(cat => cat.commerce === commerce)
      .map(cat => ({
        key: cat.nom.toLowerCase().replace(/\s+/g, '_').replace(/[&]/g, ''),
        label: cat.nom,
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        isCustom: true
      }));
  };

  const commerces = {
    dolce_italia: {
      name: 'Dolce Italia',
      color: 'bg-red-50 text-red-700 border-red-200',
      categories: getCommerceCategories('dolce_italia')
    },
    '961_lsf': {
      name: '961 LSF',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      categories: getCommerceCategories('961_lsf')
    }
  };

  const canProceedToClient = () => {
    return panier.length > 0;
  };

  const getFilteredProducts = () => {
    // Filtrer les produits selon la catégorie active et le terme de recherche
    return produits.filter(produit => {
      // Vérifier si le produit correspond à la catégorie active
      let matchesCategory = false;
      
      if (produit.categorie_custom_id) {
        // Produit avec catégorie personnalisée
        const customCategory = categoriesDb.find(cat => cat.id === produit.categorie_custom_id);
        if (customCategory) {
          const categoryKey = customCategory.nom.toLowerCase().replace(/\s+/g, '_').replace(/[&]/g, '');
          matchesCategory = categoryKey === categorieActive && customCategory.commerce === commerceActive;
        }
      }

      // Vérifier si le produit correspond au terme de recherche
      const matchesSearch = searchTerm === '' || produit.nom.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
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
              {typeCommande === 'sur_place' ? 'Sur place' : typeCommande === 'a_emporter' ? 'À emporter' : 'Livraison'}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Select 
              value={typeCommande} 
              onValueChange={(value: 'sur_place' | 'a_emporter' | 'livraison') => setTypeCommande(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sur_place">Sur place</SelectItem>
                <SelectItem value="a_emporter">À emporter</SelectItem>
                <SelectItem value="livraison">Livraison</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'menu' && (
          <div className="h-full flex">
            {/* Menu principal */}
            <div className="flex-1 flex flex-col">
              {/* Sélection du commerce */}
              <div className="flex-shrink-0 p-4 border-b bg-background">
                <div className="flex space-x-2 mb-4">
                  {Object.entries(commerces).map(([key, commerce]) => (
                    <Button
                      key={key}
                      variant={commerceActive === key ? "default" : "outline"}
                      onClick={() => {
                        setCommerceActive(key as 'dolce_italia' | '961_lsf');
                        setCategorieActive('');
                      }}
                      className={`${commerce.color} ${commerceActive === key ? 'ring-2 ring-primary/20' : ''}`}
                    >
                      {commerce.name}
                    </Button>
                  ))}
                </div>

                {/* Barre de recherche */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Rechercher un produit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Catégories du commerce actif */}
                <div className="flex flex-wrap gap-2">
                  {commerces[commerceActive].categories.map((cat) => (
                    <Button
                      key={cat.key}
                      variant={categorieActive === cat.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategorieActive(cat.key)}
                      className={`${cat.color} ${categorieActive === cat.key ? 'ring-2 ring-primary/20' : ''}`}
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
                                    size="sm"
                                    onClick={() => handleProduitClick(produit)}
                                    className="whitespace-nowrap"
                                  >
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
                        {panier.map((item, itemIndex) => (
                          <Card key={`${item.produit.id}-${itemIndex}`} className="p-3">
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
                              
                              {/* Affichage des extras */}
                              {item.extras && item.extras.length > 0 && (
                                <div className="ml-2 space-y-1">
                                  {item.extras.map((extra, extraIndex) => (
                                    <div key={`${extra.id}-${extraIndex}`} className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                                      <span>+ {extra.nom} ({extra.prix.toFixed(2)}€)</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => supprimerExtraDuProduit(itemIndex, extraIndex)}
                                        className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                                      >
                                        <X className="h-2 w-2" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Bouton pour ajouter un extra */}
                              {!item.produit.est_extra && (
                                <div className="flex justify-start">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => ouvrirModalExtraProduit(item)}
                                    className="h-6 text-xs text-blue-600 hover:text-blue-700 p-1"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Ajouter extra
                                  </Button>
                                </div>
                              )}
                              
                              <div className="flex justify-end">
                                <p className="text-sm font-bold text-primary">
                                  {(((item.prix_unitaire || item.produit.prix) + (item.extras?.reduce((sum, extra) => sum + extra.prix, 0) || 0)) * item.quantite).toFixed(2)}€
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                        
                        {/* Instructions spéciales dans le panier */}
                        <div className="pt-2 space-y-3">
                          {!isCommandeMixte() ? (
                            // Commande simple - une seule zone de commentaire
                            <div>
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
                          ) : (
                            // Commande mixte - commentaires séparés par commerce
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-purple-600 mb-2">
                                📝 Commande mixte - Commentaires par préparateur
                              </div>
                              
                              {hasCommerceItems('dolce_italia') && (
                                <div>
                                  <Label className="text-sm font-medium flex items-center mb-2 text-red-600">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Notes pour Dolce Italia (Pizzas/Pâtes)
                                  </Label>
                                  <Textarea
                                    placeholder="Ex: Pizza bien cuite, sans champignons..."
                                    value={notesDolceItalia}
                                    onChange={(e) => setNotesDolceItalia(e.target.value)}
                                    rows={2}
                                    className="text-sm resize-none border-red-200 focus:border-red-300"
                                  />
                                </div>
                              )}
                              
                              {hasCommerceItems('961_lsf') && (
                                <div>
                                  <Label className="text-sm font-medium flex items-center mb-2 text-blue-600">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Notes pour 961 LSF (Sandwiches/Salades)
                                  </Label>
                                  <Textarea
                                    placeholder="Ex: Sans sauce piquante, salade à part..."
                                    value={notes961LSF}
                                    onChange={(e) => setNotes961LSF(e.target.value)}
                                    rows={2}
                                    className="text-sm resize-none border-blue-200 focus:border-blue-300"
                                  />
                                </div>
                              )}
                            </div>
                          )}
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
        articleNom={produitPourPrixExtra?.nom || ""}
      />

      {/* Modal pour ajouter un extra à un produit */}
      <ExtraProduitModal
        open={showExtraProduitModal}
        onClose={() => {
          setShowExtraProduitModal(false);
          setProduitPourExtra(null);
        }}
        onConfirm={handleExtraConfirm}
        produitNom={produitPourExtra?.nom_personnalise || produitPourExtra?.produit.nom || ""}
      />
    </div>
  );
};

export default NouvelleCommande;
