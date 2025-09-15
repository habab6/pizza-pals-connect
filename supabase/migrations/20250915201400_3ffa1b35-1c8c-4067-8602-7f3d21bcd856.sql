-- Autoriser les commandes sans caissier (pas d'auth)
ALTER TABLE public.commandes
ALTER COLUMN caissier_id DROP NOT NULL;