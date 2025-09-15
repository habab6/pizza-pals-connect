-- Ajouter la colonne remarque à la table commande_items
ALTER TABLE public.commande_items 
ADD COLUMN remarque TEXT;