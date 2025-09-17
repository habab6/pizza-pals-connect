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

interface Produit {
  id: string;
  nom: string;
  categorie: 'pizzas' | 'pates' | 'desserts' | 'boissons' | 'entrees' | 'bowls_salades' | 'frites' | 'sandwiches';
  prix: number;
  disponible: boolean;
  created_at: string;
}

interface GestionArticlesProps {
  onClose: () => void;
}

const GestionArticles = ({ onClose }: GestionArticlesProps) => {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produit | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Produit | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    categorie: 'pizzas' as 'pizzas' | 'pates' | 'desserts' | 'boissons' | 'entrees' | 'bowls_salades' | 'frites' | 'sandwiches',
    prix: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState<string>('all');
  const [filterDisponible, setFilterDisponible] = useState<string>('all');

  const { toast } = useToast();

  useEffect(() => {
    console.log('GestionArticles: useEffect called');
    fetchProduits();
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
      setProduits(data || []);
      console.log('GestionArticles: produits set', data?.length);
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

  const resetForm = () => {
    setFormData({
      nom: '',
      categorie: 'pizzas',
      prix: ''
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom.trim() || !formData.prix) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir tous les champs"
      });
      return;
    }

    const prix = parseFloat(formData.prix);
    if (isNaN(prix) || prix <= 0) {
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
            categorie: formData.categorie as any,
            prix: prix
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
            categorie: formData.categorie as any,
            prix: prix,
            disponible: true
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
      prix: product.prix.toString()
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

  const categories = [
    // Dolce Italia
    { key: 'pizzas', label: 'Pizzas', icon: '🍕', commerce: 'dolce_italia' },
    { key: 'pates', label: 'Pâtes', icon: '🍝', commerce: 'dolce_italia' },
    { key: 'desserts', label: 'Desserts', icon: '🍰', commerce: 'dolce_italia' },
    { key: 'boissons', label: 'Boissons', icon: '🥤', commerce: 'both' },
    // 961 LSF
    { key: 'entrees', label: 'Entrées', icon: '🥗', commerce: '961_lsf' },
    { key: 'sandwiches', label: 'Sandwiches', icon: '🥪', commerce: '961_lsf' },
    { key: 'bowls_salades', label: 'Bowls & Salades', icon: '🥙', commerce: '961_lsf' },
    { key: 'frites', label: 'Frites', icon: '🍟', commerce: '961_lsf' }
  ];

  const getCategoryInfo = (categorie: string) => {
    return categories.find(cat => cat.key === categorie) || { key: categorie, label: categorie, icon: '📦' };
  };

  const filteredProducts = produits.filter(product => {
    const matchesSearch = product.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategorie === 'all' || product.categorie === filterCategorie;
    const matchesDisponible = filterDisponible === 'all' || 
      (filterDisponible === 'available' && product.disponible) ||
      (filterDisponible === 'unavailable' && !product.disponible);
    
    return matchesSearch && matchesCategory && matchesDisponible;
  });

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

          <div className="flex flex-1 gap-2">
            <Input
              placeholder="Rechercher un article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            
            <Select value={filterCategorie} onValueChange={setFilterCategorie}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.key} value={cat.key}>
                    {cat.icon} {cat.label}
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

      {/* Liste des produits */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Aucun article trouvé</p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const categoryInfo = getCategoryInfo(product.categorie);
                
                return (
                  <Card key={product.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="text-2xl flex-shrink-0">{categoryInfo.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium truncate">{product.nom}</h3>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {categoryInfo.label}
                              </Badge>
                              <Badge 
                                variant={product.disponible ? "success" : "secondary"}
                                className="text-xs flex-shrink-0"
                              >
                                {product.disponible ? "Disponible" : "Indisponible"}
                              </Badge>
                            </div>
                            <p className="text-lg font-bold text-primary">{product.prix.toFixed(2)}€</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleDisponibilite(product)}
                            className="flex items-center space-x-1"
                          >
                            {product.disponible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            <span className="hidden sm:inline">
                              {product.disponible ? 'Désactiver' : 'Activer'}
                            </span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            className="flex items-center space-x-1"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span className="hidden sm:inline">Modifier</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingProduct(product)}
                            className="flex items-center space-x-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Supprimer</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
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
              <Label htmlFor="categorie">Catégorie *</Label>
              <Select value={formData.categorie} onValueChange={(value: any) => setFormData({...formData, categorie: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                required
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1">
                {editingProduct ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'article</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deletingProduct?.nom}" ? 
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