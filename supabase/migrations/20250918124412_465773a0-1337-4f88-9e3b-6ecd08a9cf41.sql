-- Supprimer toutes les données existantes
-- D'abord supprimer les commande_items car ils référencent les produits
DELETE FROM public.commande_items;

-- Ensuite supprimer les produits
DELETE FROM public.produits;

-- Enfin supprimer les catégories personnalisées
DELETE FROM public.categories;