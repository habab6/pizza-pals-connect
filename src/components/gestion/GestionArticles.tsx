import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit3, Trash2, Eye, EyeOff, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import GestionCategories from "./GestionCategories";

interface Produit {
  id: string;
  nom: string;
  categorie: 'pizzas' | 'pates' | 'desserts' | 'boissons' | 'entrees' | 'bowls_salades' | 'frites' | 'sandwiches' | 'extra';
  commerce: 'dolce_italia' | '961_lsf';
  prix: number;
  disponible: boolean;
  created_at: string;
  est_extra: boolean;
  categorie_custom_id: string | null;
}

interface Categorie {
  id: string;
  nom: string;
  commerce: 'dolce_italia' | '961_lsf';
  actif: boolean;
}

interface GestionArticlesProps {
  onClose: () => void;
}

const GestionArticles = ({ onClose }: GestionArticlesProps) => {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [customCategories, setCustomCategories] = useState<Categorie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoriesManagement, setShowCategoriesManagement] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produit | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Produit | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    categorie: 'pizzas' as 'pizzas' | 'pates' | 'desserts' | 'boissons' | 'entrees' | 'bowls_salades' | 'frites' | 'sandwiches' | 'extra',
    commerce: 'dolce_italia' as 'dolce_italia' | '961_lsf',
    prix: '',
    est_extra: false,
    categorie_custom_id: null as string | null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState<string>('all');
  const [filterCommerce, setFilterCommerce] = useState<string>('all');
  const [filterDisponible, setFilterDisponible] = useState<string>('all');

  const { toast } = useToast();

  useEffect(() => {
    console.log('GestionArticles: useEffect called');
    fetchProduits();
    fetchCustomCategories();
  }, []);

  const fetchProduits = async () => {
    console.log('GestionArticles: fetchProduits called');
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('produits')
        .select('*')
        .order('categorie', { ascending: true })
        .order('nom', { ascending: true });

      console.log('GestionArticles: data received', data);
      console.log('GestionArticles: error', error);

      if (error) throw error;
      console.log('GestionArticles: produits set', data?.length);
      setProduits(data || []);
    } catch (error: any) {
      console.error('GestionArticles: fetch error', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les produits"
      });
    } finally {
      setIsLoading(false);
      console.log('GestionArticles: loading finished');
    }
  };

  const fetchCustomCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('actif', true)
        .order('nom', { ascending: true });

      if (error) throw error;
      setCustomCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching custom categories:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      categorie: 'pizzas' as 'pizzas' | 'pates' | 'desserts' | 'boissons' | 'entrees' | 'bowls_salades' | 'frites' | 'sandwiches' | 'extra',
      commerce: 'dolce_italia',
      prix: '',
      est_extra: false,
      categorie_custom_id: null
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom.trim() || (!formData.est_extra && !formData.prix)) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis"
      });
      return;
    }

    const prix = formData.est_extra ? 0 : parseFloat(formData.prix);
    if (!formData.est_extra && (isNaN(prix) || prix <= 0)) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le prix doit être un nombre positif"
      });
      return;
    }

    try {
      if (editingProduct) {
        // Modifier un produit existant
        const { error } = await supabase
          .from('produits')
          .update({
            nom: formData.nom.trim(),
            categorie: formData.est_extra ? 'extra' : (formData.categorie as any),
            commerce: formData.commerce as any,
            prix: prix,
            est_extra: formData.est_extra,
            categorie_custom_id: formData.categorie_custom_id
          })
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Produit modifié",
          description: "Le produit a été modifié avec succès"
        });
      } else {
        // Ajouter un nouveau produit
        const { error } = await supabase
          .from('produits')
          .insert({
            nom: formData.nom.trim(),
            categorie: formData.est_extra ? 'extra' : (formData.categorie as any),
            commerce: formData.commerce as any,
            prix: prix,
            disponible: true,
            est_extra: formData.est_extra,
            categorie_custom_id: formData.categorie_custom_id
          });

        if (error) throw error;

        toast({
          title: "Produit ajouté",
          description: "Le produit a été ajouté avec succès"
        });
      }

      resetForm();
      fetchProduits();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Impossible de ${editingProduct ? 'modifier' : 'créer'} le produit: ${error.message}`
      });
    }
  };

  const handleEdit = (product: Produit) => {
    setEditingProduct(product);
    setFormData({
      nom: product.nom,
      categorie: product.categorie,
      commerce: product.commerce,
      prix: product.prix.toString(),
      est_extra: product.est_extra,
      categorie_custom_id: product.categorie_custom_id
    });
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;

    try {
      const { error } = await supabase
        .from('produits')
        .delete()
        .eq('id', deletingProduct.id);

      if (error) throw error;

      toast({
        title: "Produit supprimé",
        description: "Le produit a été supprimé avec succès"
      });

      setDeletingProduct(null);
      fetchProduits();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le produit: " + error.message
      });
    }
  };

  const toggleDisponibilite = async (product: Produit) => {
    try {
      const { error } = await supabase
        .from('produits')
        .update({ disponible: !product.disponible })
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: product.disponible ? "Produit désactivé" : "Produit activé",
        description: `Le produit est maintenant ${!product.disponible ? 'disponible' : 'indisponible'}`
      });

      fetchProduits();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier la disponibilité"
      });
    }
  };

  const defaultCategories = [
    // Dolce Italia
    { key: 'pizzas', label: 'Pizzas', commerce: 'dolce_italia' },
    { key: 'pates', label: 'Pâtes', commerce: 'dolce_italia' },
    { key: 'desserts', label: 'Desserts', commerce: 'dolce_italia' },
    { key: 'boissons', label: 'Boissons', commerce: 'both' },
    // 961 LSF
    { key: 'entrees', label: 'Entrées', commerce: '961_lsf' },
    { key: 'sandwiches', label: 'Sandwiches', commerce: '961_lsf' },
    { key: 'bowls_salades', label: 'Bowls & Salades', commerce: '961_lsf' },
    { key: 'frites', label: 'Frites', commerce: '961_lsf' },
    // Extra pour les deux commerces
    { key: 'extra', label: 'Extra', commerce: 'both' }
  ];

  const getCategoryInfo = (product: Produit) => {
    if (product.categorie_custom_id) {
      const customCat = customCategories.find(cat => cat.id === product.categorie_custom_id);
      return customCat ? { key: customCat.id, label: customCat.nom } : { key: 'custom', label: 'Catégorie personnalisée' };
    }
    return defaultCategories.find(cat => cat.key === product.categorie) || { key: product.categorie, label: product.categorie };
  };

  const filteredProducts = produits.filter(product => {
    const matchesSearch = product.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategorie === 'all' || 
      (product.categorie_custom_id ? product.categorie_custom_id === filterCategorie : product.categorie === filterCategorie);
    const matchesCommerce = filterCommerce === 'all' || product.commerce === filterCommerce;
    const matchesDisponible = filterDisponible === 'all' || 
      (filterDisponible === 'available' && product.disponible) ||
      (filterDisponible === 'unavailable' && !product.disponible);
    
    return matchesSearch && matchesCategory && matchesCommerce && matchesDisponible;
  });

  // Grouper les produits par commerce
  const groupedProducts = filteredProducts.reduce((groups, product) => {
    const commerce = product.commerce;
    if (!groups[commerce]) {
      groups[commerce] = [];
    }
    groups[commerce].push(product);
    return groups;
  }, {} as Record<string, Produit[]>);

  const getCommerceLabel = (commerce: string) => {
    return commerce === 'dolce_italia' ? 'Dolce Italia' : '961 LSF';
  };

  const getAllCategories = () => {
    const defaults = defaultCategories.map(cat => ({
      key: cat.key,
      label: cat.label,
      isCustom: false
    }));
    
    const customs = customCategories.map(cat => ({
      key: cat.id,
      label: cat.nom,
      isCustom: true
    }));

    return [...defaults, ...customs];
  };

  const getCategoriesForCommerce = (commerce: string) => {
    const defaults = defaultCategories.filter(cat => cat.commerce === commerce || cat.commerce === 'both');
    const customs = customCategories.filter(cat => cat.commerce === commerce);
    
    return [
      ...defaults,
      ...customs.map(cat => ({ key: cat.id, label: cat.nom, commerce: cat.commerce }))
    ];
  };

  if (showCategoriesManagement) {
    return (
      <GestionCategories 
        onClose={() => {
          setShowCategoriesManagement(false);
          fetchCustomCategories();
        }} 
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Gestion des articles</h2>
        </div>

        {/* Actions et filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter un article</span>
          </Button>

          <Button 
            onClick={() => setShowCategoriesManagement(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Edit3 className="h-4 w-4" />
            <span>Gérer les catégories</span>
          </Button>

          <div className="flex flex-1 gap-2">
            <Input
              placeholder="Rechercher un article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            
            <Select value={filterCommerce} onValueChange={setFilterCommerce}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Commerce" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les commerces</SelectItem>
                <SelectItem value="dolce_italia">Dolce Italia</SelectItem>
                <SelectItem value="961_lsf">961 LSF</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterCategorie} onValueChange={setFilterCategorie}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {getAllCategories().map(cat => (
                  <SelectItem key={cat.key} value={cat.key}>
                    {cat.label} {cat.isCustom ? '(Personnalisée)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDisponible} onValueChange={setFilterDisponible}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="available">Disponibles</SelectItem>
                <SelectItem value="unavailable">Indisponibles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Liste des produits groupés par commerce */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {Object.keys(groupedProducts).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Aucun article trouvé</p>
              </div>
            ) : (
              Object.entries(groupedProducts).map(([commerce, products]) => (
                <div key={commerce} className="space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b">
                    <h3 className="text-lg font-semibold text-primary">
                      {getCommerceLabel(commerce)}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {products.length} article{products.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {products.map((product) => {
                    const categoryInfo = getCategoryInfo(product);
                    
                    return (
                      <Card key={product.id} className="transition-all hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-medium truncate">{product.nom}</h4>
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {categoryInfo.label}
                                  </Badge>
                                  {product.est_extra && (
                                    <Badge variant="default" className="text-xs flex-shrink-0">
                                      Extra
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant={product.disponible ? "success" : "secondary"}
                                    className="text-xs flex-shrink-0"
                                  >
                                    {product.disponible ? "Disponible" : "Indisponible"}
                                  </Badge>
                                </div>
                                <p className="text-lg font-bold text-primary">
                                  {product.est_extra ? "Prix variable" : `${product.prix.toFixed(2)}€`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleDisponibilite(product)}
                                title={product.disponible ? 'Désactiver' : 'Activer'}
                              >
                                {product.disponible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(product)}
                                title="Modifier"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingProduct(product)}
                                className="text-destructive hover:text-destructive"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Dialog pour ajouter/modifier */}
      <Dialog open={showAddForm} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddForm(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Modifier l\'article' : 'Ajouter un article'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nom">Nom de l'article *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                placeholder="Ex: Pizza Margherita"
                required
              />
            </div>

            <div>
              <Label htmlFor="commerce">Commerce *</Label>
              <Select value={formData.commerce} onValueChange={(value: any) => setFormData({...formData, commerce: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dolce_italia">Dolce Italia</SelectItem>
                  <SelectItem value="961_lsf">961 LSF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="est_extra"
                checked={formData.est_extra}
                onCheckedChange={(checked) => setFormData({...formData, est_extra: !!checked})}
              />
              <Label htmlFor="est_extra">Article extra (prix décidé par le caissier)</Label>
            </div>

            {!formData.est_extra && (
              <>
                <div>
                  <Label htmlFor="categorie">Catégorie *</Label>
                  <Select value={formData.categorie} onValueChange={(value: any) => setFormData({...formData, categorie: value, categorie_custom_id: null})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategoriesForCommerce(formData.commerce).map(cat => (
                        <SelectItem key={cat.key} value={cat.key}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="categorie_custom">Ou catégorie personnalisée</Label>
                  <Select 
                    value={formData.categorie_custom_id || 'none'} 
                    onValueChange={(value) => setFormData({...formData, categorie_custom_id: value === 'none' ? null : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie personnalisée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {customCategories
                        .filter(cat => cat.commerce === formData.commerce)
                        .map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nom}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {!formData.est_extra && (
              <div>
                <Label htmlFor="prix">Prix (€) *</Label>
                <Input
                  id="prix"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.prix}
                  onChange={(e) => setFormData({...formData, prix: e.target.value})}
                  placeholder="Ex: 12.50"
                  required={!formData.est_extra}
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
              <Button type="submit">
                {editingProduct ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog pour confirmer la suppression */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le produit "{deletingProduct?.nom}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GestionArticles;