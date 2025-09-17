-- Ajouter un enum pour les commerces
CREATE TYPE public.commerce_type AS ENUM ('dolce_italia', '961_lsf');

-- Ajouter le rôle cuisinier
ALTER TYPE public.user_role ADD VALUE 'cuisinier';

-- Ajouter la colonne commerce aux produits
ALTER TABLE public.produits 
ADD COLUMN commerce public.commerce_type NOT NULL DEFAULT 'dolce_italia';

-- Créer un index pour optimiser les requêtes par commerce
CREATE INDEX idx_produits_commerce ON public.produits(commerce);

-- Ajouter la colonne commerce aux commandes pour identifier le commerce principal
ALTER TABLE public.commandes 
ADD COLUMN commerce_principal public.commerce_type;

-- Mettre à jour les commandes existantes avec le commerce par défaut
UPDATE public.commandes 
SET commerce_principal = 'dolce_italia' 
WHERE commerce_principal IS NULL;

-- Rendre la colonne NOT NULL après la mise à jour
ALTER TABLE public.commandes 
ALTER COLUMN commerce_principal SET NOT NULL;

-- Fonction pour déterminer le commerce principal d'une commande
CREATE OR REPLACE FUNCTION public.determine_commerce_principal(commande_uuid uuid)
RETURNS public.commerce_type
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    dolce_count INTEGER;
    lsf_count INTEGER;
    result public.commerce_type;
BEGIN
    -- Compter les articles de chaque commerce dans la commande
    SELECT 
        COUNT(CASE WHEN p.commerce = 'dolce_italia' THEN 1 END),
        COUNT(CASE WHEN p.commerce = '961_lsf' THEN 1 END)
    INTO dolce_count, lsf_count
    FROM commande_items ci
    JOIN produits p ON ci.produit_id = p.id
    WHERE ci.commande_id = commande_uuid;
    
    -- Si plus d'articles Dolce Italia, c'est le commerce principal
    IF dolce_count >= lsf_count THEN
        result := 'dolce_italia';
    ELSE
        result := '961_lsf';
    END IF;
    
    RETURN result;
END;
$$;

-- Trigger pour mettre à jour automatiquement le commerce principal
CREATE OR REPLACE FUNCTION public.update_commerce_principal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Mettre à jour le commerce principal de la commande
    UPDATE public.commandes 
    SET commerce_principal = public.determine_commerce_principal(NEW.commande_id)
    WHERE id = NEW.commande_id;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger sur les commande_items
CREATE TRIGGER update_commande_commerce_principal
    AFTER INSERT OR UPDATE OR DELETE ON public.commande_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_commerce_principal();