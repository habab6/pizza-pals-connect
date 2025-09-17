-- Permettre aux utilisateurs de modifier les produits (pour les caissiers)
-- Ajouter des politiques pour INSERT, UPDATE et DELETE sur la table produits

-- Politique pour créer des produits
CREATE POLICY "Utilisateurs peuvent créer des produits" 
ON public.produits 
FOR INSERT 
WITH CHECK (true);

-- Politique pour modifier des produits
CREATE POLICY "Utilisateurs peuvent modifier les produits" 
ON public.produits 
FOR UPDATE 
USING (true);

-- Politique pour supprimer des produits
CREATE POLICY "Utilisateurs peuvent supprimer les produits" 
ON public.produits 
FOR DELETE 
USING (true);