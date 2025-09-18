import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit3, Trash2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Categorie {
  id: string;
  nom: string;
  commerce: 'dolce_italia' | '961_lsf';
  actif: boolean;
  created_at: string;
}

interface GestionCategoriesProps {
  onClose: () => void;
}

const GestionCategories = ({ onClose }: GestionCategoriesProps) => {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categorie | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Categorie | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    commerce: 'dolce_italia' as 'dolce_italia' | '961_lsf'
  });
  const [filterCommerce, setFilterCommerce] = useState<string>('all');

  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('commerce', { ascending: true })
        .order('nom', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les catégories"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      commerce: 'dolce_italia'
    });
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir le nom de la catégorie"
      });
      return;
    }

    try {
      if (editingCategory) {
        // Modifier une catégorie existante
        const { error } = await supabase
          .from('categories')
          .update({
            nom: formData.nom.trim(),
            commerce: formData.commerce as any
          })
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast({
          title: "Catégorie modifiée",
          description: "La catégorie a été modifiée avec succès"
        });
      } else {
        // Ajouter une nouvelle catégorie
        const { error } = await supabase
          .from('categories')
          .insert({
            nom: formData.nom.trim(),
            commerce: formData.commerce as any,
            actif: true
          });

        if (error) throw error;

        toast({
          title: "Catégorie ajoutée",
          description: "La catégorie a été ajoutée avec succès"
        });
      }

      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Impossible de ${editingCategory ? 'modifier' : 'créer'} la catégorie: ${error.message}`
      });
    }
  };

  const handleEdit = (category: Categorie) => {
    setEditingCategory(category);
    setFormData({
      nom: category.nom,
      commerce: category.commerce
    });
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      // Vérifier s'il y a des produits utilisant cette catégorie
      const { data: produits, error: checkError } = await supabase
        .from('produits')
        .select('id')
        .eq('categorie_custom_id', deletingCategory.id);

      if (checkError) throw checkError;

      if (produits && produits.length > 0) {
        toast({
          variant: "destructive",
          title: "Impossible de supprimer",
          description: "Cette catégorie est utilisée par des produits. Veuillez d'abord modifier ou supprimer ces produits."
        });
        setDeletingCategory(null);
        return;
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deletingCategory.id);

      if (error) throw error;

      toast({
        title: "Catégorie supprimée",
        description: "La catégorie a été supprimée avec succès"
      });

      setDeletingCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la catégorie: " + error.message
      });
    }
  };

  const toggleActif = async (category: Categorie) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ actif: !category.actif })
        .eq('id', category.id);

      if (error) throw error;

      toast({
        title: category.actif ? "Catégorie désactivée" : "Catégorie activée",
        description: `La catégorie est maintenant ${!category.actif ? 'active' : 'inactive'}`
      });

      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le statut"
      });
    }
  };

  const filteredCategories = categories.filter(category => {
    return filterCommerce === 'all' || category.commerce === filterCommerce;
  });

  const groupedCategories = filteredCategories.reduce((groups, category) => {
    const commerce = category.commerce;
    if (!groups[commerce]) {
      groups[commerce] = [];
    }
    groups[commerce].push(category);
    return groups;
  }, {} as Record<string, Categorie[]>);

  const getCommerceLabel = (commerce: string) => {
    return commerce === 'dolce_italia' ? 'Dolce Italia' : '961 LSF';
  };

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
          <h2 className="text-xl font-bold">Gestion des catégories</h2>
        </div>

        {/* Actions et filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter une catégorie</span>
          </Button>

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
        </div>
      </div>

      {/* Liste des catégories groupées par commerce */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {Object.keys(groupedCategories).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Aucune catégorie trouvée</p>
              </div>
            ) : (
              Object.entries(groupedCategories).map(([commerce, categories]) => (
                <div key={commerce} className="space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b">
                    <h3 className="text-lg font-semibold text-primary">
                      {getCommerceLabel(commerce)}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {categories.length} catégorie{categories.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {categories.map((category) => (
                    <Card key={category.id} className="transition-all hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium truncate">{category.nom}</h4>
                                <Badge 
                                  variant={category.actif ? "success" : "secondary"}
                                  className="text-xs flex-shrink-0"
                                >
                                  {category.actif ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleActif(category)}
                              title={category.actif ? 'Désactiver' : 'Activer'}
                            >
                              {category.actif ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(category)}
                              title="Modifier"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingCategory(category)}
                              className="text-destructive hover:text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
              {editingCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nom">Nom de la catégorie *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                placeholder="Ex: Salades fraîches"
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
              <Button type="submit">
                {editingCategory ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog pour confirmer la suppression */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la catégorie "{deletingCategory?.nom}" ? 
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

export default GestionCategories;