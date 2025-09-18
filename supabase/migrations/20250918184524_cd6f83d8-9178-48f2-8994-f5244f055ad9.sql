-- Ajouter des champs de notes séparés pour chaque commerce
ALTER TABLE public.commandes 
ADD COLUMN notes_dolce_italia TEXT,
ADD COLUMN notes_961_lsf TEXT;