-- Ajouter le trigger manquant pour calculer automatiquement le statut global
CREATE OR REPLACE TRIGGER update_commande_global_status
    BEFORE INSERT OR UPDATE ON public.commandes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_global_status();