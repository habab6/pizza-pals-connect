-- Ajouter les politiques de suppression pour les commandes et items
-- Ces politiques permettent aux utilisateurs authentifiés de supprimer des commandes

-- Politique pour supprimer les commandes
CREATE POLICY "Utilisateurs peuvent supprimer les commandes"
ON public.commandes
FOR DELETE
USING (true);

-- Politique pour supprimer les items de commande
CREATE POLICY "Utilisateurs peuvent supprimer les items"
ON public.commande_items
FOR DELETE  
USING (true);

-- Commentaires pour expliquer ces politiques sensibles
COMMENT ON POLICY "Utilisateurs peuvent supprimer les commandes" ON public.commandes IS 'Permet la suppression de commandes - attention: action irréversible';
COMMENT ON POLICY "Utilisateurs peuvent supprimer les items" ON public.commande_items IS 'Permet la suppression d''items de commande - nécessaire pour supprimer une commande complète';