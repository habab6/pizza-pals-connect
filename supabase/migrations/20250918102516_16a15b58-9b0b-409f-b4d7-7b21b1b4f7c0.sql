-- Créer une table pour les catégories personnalisées
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  commerce commerce_type NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Tous peuvent voir les catégories" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Utilisateurs peuvent créer des catégories" 
ON public.categories 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Utilisateurs peuvent modifier les catégories" 
ON public.categories 
FOR UPDATE 
USING (true);

CREATE POLICY "Utilisateurs peuvent supprimer les catégories" 
ON public.categories 
FOR DELETE 
USING (true);

-- Ajouter une colonne pour les articles "extra" avec prix variable
ALTER TABLE public.produits 
ADD COLUMN est_extra BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN categorie_custom_id UUID REFERENCES public.categories(id);

-- Créer un trigger pour mettre à jour updated_at sur les catégories
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les catégories par défaut existantes
INSERT INTO public.categories (nom, commerce) VALUES
('Pizzas', 'dolce_italia'),
('Pâtes', 'dolce_italia'),
('Desserts', 'dolce_italia'),
('Boissons', 'dolce_italia'),
('Entrées', '961_lsf'),
('Sandwiches', '961_lsf'),
('Bowls & Salades', '961_lsf'),
('Frites', '961_lsf');

-- Créer des articles "extra" par défaut pour chaque commerce
INSERT INTO public.produits (nom, categorie, commerce, prix, est_extra, disponible) VALUES
('Article Extra Dolce Italia', 'desserts', 'dolce_italia', 0.00, true, true),
('Article Extra 961 LSF', 'entrees', '961_lsf', 0.00, true, true);