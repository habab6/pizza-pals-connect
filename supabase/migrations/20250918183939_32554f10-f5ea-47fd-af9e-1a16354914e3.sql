-- Corriger la détection des commerces et garantir la mise à jour du statut global
CREATE OR REPLACE FUNCTION public.update_global_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_dolce boolean;
  has_lsf boolean;
BEGIN
  -- Déterminer les commerces présents via la colonne produits.commerce (plus fiable que la catégorie)
  SELECT 
    COUNT(CASE WHEN p.commerce = 'dolce_italia' THEN 1 END) > 0,
    COUNT(CASE WHEN p.commerce = '961_lsf' THEN 1 END) > 0
  INTO has_dolce, has_lsf
  FROM commande_items ci
  JOIN produits p ON ci.produit_id = p.id
  WHERE ci.commande_id = NEW.id;
  
  -- Calculer et mettre à jour le statut global via la fonction dédiée
  NEW.statut = public.calculate_global_status(
    COALESCE(NEW.statut_dolce_italia, 'nouveau'),
    COALESCE(NEW.statut_961_lsf, 'nouveau'),
    has_dolce,
    has_lsf
  );
  
  RETURN NEW;
END;
$function$;

-- Mettre en place (ou recréer) le trigger pour appliquer la logique à chaque modification pertinente
DROP TRIGGER IF EXISTS trg_update_global_status ON public.commandes;
CREATE TRIGGER trg_update_global_status
BEFORE INSERT OR UPDATE OF statut_dolce_italia, statut_961_lsf, statut
ON public.commandes
FOR EACH ROW
EXECUTE FUNCTION public.update_global_status();