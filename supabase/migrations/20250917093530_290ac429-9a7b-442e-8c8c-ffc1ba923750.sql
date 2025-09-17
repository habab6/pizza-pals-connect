-- Ajouter le mode de paiement aux commandes
CREATE TYPE public.payment_method AS ENUM ('bancontact', 'visa', 'mastercard', 'cash');

ALTER TABLE public.commandes 
ADD COLUMN mode_paiement public.payment_method;

-- Ajouter un commentaire pour expliquer la colonne
COMMENT ON COLUMN public.commandes.mode_paiement IS 'Mode de paiement choisi par le caissier ou le livreur au moment de clôturer la commande';