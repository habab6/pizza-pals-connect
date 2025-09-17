-- Ajouter des colonnes pour les statuts par commerce
ALTER TABLE public.commandes 
ADD COLUMN statut_dolce_italia order_status DEFAULT 'nouveau',
ADD COLUMN statut_961_lsf order_status DEFAULT 'nouveau';

-- Mettre à jour les statuts existants selon le commerce principal
UPDATE public.commandes 
SET 
  statut_dolce_italia = statut,
  statut_961_lsf = CASE 
    WHEN commerce_principal = 'dolce_italia' THEN 'nouveau'::order_status
    ELSE statut
  END
WHERE commerce_principal = 'dolce_italia';

UPDATE public.commandes 
SET 
  statut_dolce_italia = CASE 
    WHEN commerce_principal = '961_lsf' THEN 'nouveau'::order_status
    ELSE statut
  END,
  statut_961_lsf = statut
WHERE commerce_principal = '961_lsf';

-- Fonction pour calculer le statut global d'une commande mixte
CREATE OR REPLACE FUNCTION public.calculate_global_status(
  p_statut_dolce order_status,
  p_statut_lsf order_status,
  p_has_dolce boolean,
  p_has_lsf boolean
) RETURNS order_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Si un seul commerce, retourner son statut
  IF p_has_dolce AND NOT p_has_lsf THEN
    RETURN p_statut_dolce;
  END IF;
  
  IF p_has_lsf AND NOT p_has_dolce THEN
    RETURN p_statut_lsf;
  END IF;
  
  -- Commande mixte : logique combinée
  -- Si un des deux est en "nouveau", le global est "nouveau"
  IF p_statut_dolce = 'nouveau' OR p_statut_lsf = 'nouveau' THEN
    RETURN 'nouveau'::order_status;
  END IF;
  
  -- Si un des deux est en "en_preparation", le global est "en_preparation"
  IF p_statut_dolce = 'en_preparation' OR p_statut_lsf = 'en_preparation' THEN
    RETURN 'en_preparation'::order_status;
  END IF;
  
  -- Si les deux sont "pret", le global est "pret"
  IF p_statut_dolce = 'pret' AND p_statut_lsf = 'pret' THEN
    RETURN 'pret'::order_status;
  END IF;
  
  -- Autres cas de transition
  IF p_statut_dolce IN ('en_livraison', 'livre', 'termine') OR p_statut_lsf IN ('en_livraison', 'livre', 'termine') THEN
    -- Retourner le statut le plus avancé
    IF p_statut_dolce = 'termine' AND p_statut_lsf = 'termine' THEN
      RETURN 'termine'::order_status;
    ELSIF p_statut_dolce = 'livre' AND p_statut_lsf = 'livre' THEN
      RETURN 'livre'::order_status;  
    ELSIF p_statut_dolce = 'en_livraison' OR p_statut_lsf = 'en_livraison' THEN
      RETURN 'en_livraison'::order_status;
    END IF;
  END IF;
  
  -- Par défaut, retourner "en_preparation" 
  RETURN 'en_preparation'::order_status;
END;
$$;

-- Trigger pour mettre à jour automatiquement le statut global
CREATE OR REPLACE FUNCTION public.update_global_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  has_dolce boolean;
  has_lsf boolean;
BEGIN
  -- Vérifier quels commerces sont présents dans la commande
  SELECT 
    COUNT(CASE WHEN p.categorie IN ('pizzas', 'pates', 'desserts') THEN 1 END) > 0,
    COUNT(CASE WHEN p.categorie IN ('entrees', 'sandwiches', 'bowls_salades', 'frites') THEN 1 END) > 0
  INTO has_dolce, has_lsf
  FROM commande_items ci
  JOIN produits p ON ci.produit_id = p.id
  WHERE ci.commande_id = NEW.id;
  
  -- Calculer et mettre à jour le statut global
  NEW.statut = public.calculate_global_status(
    NEW.statut_dolce_italia,
    NEW.statut_961_lsf,
    has_dolce,
    has_lsf
  );
  
  RETURN NEW;
END;
$$;

-- Ajouter le trigger
CREATE TRIGGER update_commande_global_status
  BEFORE UPDATE ON public.commandes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_global_status();