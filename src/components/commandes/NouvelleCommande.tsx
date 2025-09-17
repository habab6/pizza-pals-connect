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
import { Plus, Minus, Search, ShoppingCart, X, Check, MapPin, Phone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface Produit {
  id: string;
  nom: string;
  categorie: 'pizzas' | 'pates' | 'desserts' | 'boissons';
  prix: number;
}

interface CartItem {
  produit: Produit;
  quantite: number;
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
  const [currentStep, setCurrentStep] = useState<'commande' | 'client' | 'validation'>('commande');
  
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
      return [...prev, { produit, quantite: 1 }];
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
          notes: notes.trim() || null,
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

  const categories = [
    { key: 'pizzas', label: 'Pizzas', icon: '🍕' },
    { key: 'pates', label: 'Pâtes', icon: '🍝' },
    { key: 'desserts', label: 'Desserts', icon: '🍰' },
    { key: 'boissons', label: 'Boissons', icon: '🥤' }
  ];

  const getStepTitle = () => {
    switch (currentStep) {
      case 'commande': return 'Choisir les produits';
      case 'client': return 'Informations client';
      case 'validation': return 'Validation de la commande';
      default: return 'Nouvelle commande';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header avec progression */}
      <div className="flex-shrink-0 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{getStepTitle()}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Progress steps */}
        <div className="flex items-center space-x-2 text-sm">
          <div className={`flex items-center space-x-1 ${currentStep === 'commande' ? 'text-primary' : panier.length > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${currentStep === 'commande' ? 'bg-primary text-primary-foreground' : panier.length > 0 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
              {panier.length > 0 && currentStep !== 'commande' ? <Check className="h-3 w-3" /> : '1'}
            </div>
            <span>Produits</span>
          </div>
          
          <div className="h-px bg-border flex-1" />
          
          <div className={`flex items-center space-x-1 ${currentStep === 'client' ? 'text-primary' : currentStep === 'validation' ? 'text-green-600' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${currentStep === 'client' ? 'bg-primary text-primary-foreground' : currentStep === 'validation' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
              {currentStep === 'validation' ? <Check className="h-3 w-3" /> : '2'}
            </div>
            <span>Client</span>
          </div>
          
          <div className="h-px bg-border flex-1" />
          
          <div className={`flex items-center space-x-1 ${currentStep === 'validation' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${currentStep === 'validation' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              3
            </div>
            <span>Validation</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentStep === 'commande' && (
          <div className="h-full flex flex-col lg:flex-row">
            {/* Menu des produits */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-shrink-0 p-4 border-b">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={typeCommande} onValueChange={(value: any) => setTypeCommande(value)}>
                    <SelectTrigger className="w-full sm:w-40">
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
              </div>

              <Tabs defaultValue={categories[0].key} className="flex-1 flex flex-col min-h-0">
                <div className="flex-shrink-0 px-4 pt-3">
                  <TabsList className="grid w-full grid-cols-4">
                    {categories.map(cat => (
                      <TabsTrigger key={cat.key} value={cat.key} className="text-xs">
                        <span className="mr-1">{cat.icon}</span>
                        <span className="hidden sm:inline">{cat.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {categories.map(cat => (
                  <TabsContent key={cat.key} value={cat.key} className="flex-1 overflow-hidden m-0">
                    <div className="h-full overflow-y-auto p-4 space-y-2">
                      {produits
                        .filter(p => p.categorie === cat.key)
                        .filter(p => searchTerm === '' || p.nom.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(produit => {
                          const quantiteInPanier = getQuantiteInPanier(produit.id);
                          const isSelected = quantiteInPanier > 0;
                          
                          return (
                            <div 
                              key={produit.id} 
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                isSelected 
                                  ? 'bg-primary/5 border-primary/20 shadow-sm' 
                                  : 'bg-card border-border hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{formatProduitNom(produit.nom, produit.categorie)}</h4>
                                <p className="text-primary font-semibold text-sm">{produit.prix.toFixed(2)}€</p>
                              </div>
                              
                              <div className="flex items-center space-x-2 ml-3">
                                {isSelected && (
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => modifierQuantite(produit.id, -1)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Badge variant="secondary" className="min-w-[2rem] justify-center">
                                      {quantiteInPanier}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => modifierQuantite(produit.id, 1)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {!isSelected && (
                                  <Button
                                    onClick={() => ajouterAuPanier(produit)}
                                    size="sm"
                                    className="h-7 px-3"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Ajouter</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Panier sidebar */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-muted/30 flex flex-col">
              <div className="flex-shrink-0 p-4 border-b">
                <div className="flex items-center justify-between">
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
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {panier.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mb-2" />
                    <p className="text-sm">Panier vide</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {panier.map((item) => (
                      <div key={item.produit.id} className="p-3 bg-background rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium truncate">{formatProduitNom(item.produit.nom, item.produit.categorie)}</h5>
                            <p className="text-xs text-muted-foreground">{item.produit.prix.toFixed(2)}€ × {item.quantite}</p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => modifierQuantite(item.produit.id, -1)}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm w-6 text-center">{item.quantite}</span>
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
                        <div className="flex justify-end mt-2">
                          <p className="text-sm font-semibold text-primary">
                            {(item.produit.prix * item.quantite).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {panier.length > 0 && (
                <div className="flex-shrink-0 p-4 border-t bg-background">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold">Total:</span>
                    <span className="text-lg font-bold text-primary">{calculerTotal().toFixed(2)}€</span>
                  </div>
                  <Button
                    onClick={() => setCurrentStep('client')}
                    disabled={panier.length === 0}
                    className="w-full"
                  >
                    Continuer
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'client' && (
          <div className="p-6 max-w-md mx-auto">
            <Card>
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

                <div>
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Instructions spéciales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('commande')}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={() => setCurrentStep('validation')}
                    disabled={!clientInfo.nom.trim() || (typeCommande === 'livraison' && (!clientInfo.telephone.trim() || !clientInfo.adresse.trim()))}
                    className="flex-1"
                  >
                    Continuer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 'validation' && (
          <div className="p-6 max-w-lg mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Récapitulatif de la commande</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type de commande */}
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium">Type:</span>
                  <Badge variant="outline">
                    {typeCommande === 'sur_place' ? 'Sur place' : 
                     typeCommande === 'a_emporter' ? 'À emporter' : 'Livraison'}
                  </Badge>
                </div>

                {/* Infos client */}
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Client
                  </h4>
                  <p className="text-sm">{clientInfo.nom}</p>
                  {typeCommande === 'livraison' && (
                    <>
                      <p className="text-sm">{clientInfo.telephone}</p>
                      <p className="text-sm flex items-start">
                        <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                        {clientInfo.adresse}
                      </p>
                    </>
                  )}
                  {notes && (
                    <p className="text-sm text-muted-foreground italic">Notes: {notes}</p>
                  )}
                </div>

                {/* Articles */}
                <div>
                  <h4 className="font-medium mb-3">Articles commandés</h4>
                  <div className="space-y-2">
                    {panier.map((item) => (
                      <div key={item.produit.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{formatProduitNom(item.produit.nom, item.produit.categorie)}</p>
                          <p className="text-xs text-muted-foreground">{item.produit.prix.toFixed(2)}€ × {item.quantite}</p>
                        </div>
                        <p className="font-semibold">{(item.produit.prix * item.quantite).toFixed(2)}€</p>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{calculerTotal().toFixed(2)}€</span>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('client')}
                    className="flex-1"
                  >
                    Modifier
                  </Button>
                  <Button
                    onClick={validerCommande}
                    disabled={isLoading}
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