-- Corriger la fonction de calcul du statut global pour respecter les statuts "termine"
CREATE OR REPLACE FUNCTION public.calculate_global_status(p_statut_dolce order_status, p_statut_lsf order_status, p_has_dolce boolean, p_has_lsf boolean)
 RETURNS order_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- RÈGLE PRIORITAIRE : Si un des commerces est terminé, vérifier si la commande peut être considérée comme terminée
  IF p_has_dolce AND NOT p_has_lsf AND p_statut_dolce = 'termine' THEN
    RETURN 'termine'::order_status;
  END IF;
  
  IF p_has_lsf AND NOT p_has_dolce AND p_statut_lsf = 'termine' THEN
    RETURN 'termine'::order_status;
  END IF;
  
  -- Pour les commandes mixtes, les deux doivent être terminés
  IF p_has_dolce AND p_has_lsf AND p_statut_dolce = 'termine' AND p_statut_lsf = 'termine' THEN
    RETURN 'termine'::order_status;
  END IF;
  
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
$function$