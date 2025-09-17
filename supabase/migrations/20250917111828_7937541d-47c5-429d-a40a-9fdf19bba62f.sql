-- Mise à jour des politiques RLS pour permettre l'accès aux utilisateurs anonymes
-- Suppression des anciennes politiques restrictives et création de nouvelles politiques publiques

-- Supprimer les anciennes politiques sur la table clients
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent créer des clients" ON public.clients;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent modifier les clients" ON public.clients;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les clients" ON public.clients;

-- Créer de nouvelles politiques publiques pour la table clients
CREATE POLICY "Tous peuvent voir les clients" 
ON public.clients 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Tous peuvent créer des clients" 
ON public.clients 
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Tous peuvent modifier les clients" 
ON public.clients 
FOR UPDATE 
TO public
USING (true);

-- Même chose pour les commandes - supprimer les politiques restrictives
DROP POLICY IF EXISTS "Caissiers peuvent créer des commandes" ON public.commandes;
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier les commandes" ON public.commandes;
DROP POLICY IF EXISTS "Utilisateurs peuvent supprimer les commandes" ON public.commandes;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir toutes les commandes" ON public.commandes;

-- Créer des politiques publiques pour les commandes
CREATE POLICY "Tous peuvent voir les commandes" 
ON public.commandes 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Tous peuvent créer des commandes" 
ON public.commandes 
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Tous peuvent modifier les commandes" 
ON public.commandes 
FOR UPDATE 
TO public
USING (true);

CREATE POLICY "Tous peuvent supprimer les commandes" 
ON public.commandes 
FOR DELETE 
TO public
USING (true);

-- Même chose pour commande_items - supprimer les politiques restrictives
DROP POLICY IF EXISTS "Utilisateurs peuvent créer des items" ON public.commande_items;
DROP POLICY IF EXISTS "Utilisateurs peuvent supprimer les items" ON public.commande_items;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir tous les items" ON public.commande_items;

-- Créer des politiques publiques pour commande_items
CREATE POLICY "Tous peuvent voir les items" 
ON public.commande_items 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Tous peuvent créer des items" 
ON public.commande_items 
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Tous peuvent modifier des items" 
ON public.commande_items 
FOR UPDATE 
TO public
USING (true);

CREATE POLICY "Tous peuvent supprimer des items" 
ON public.commande_items 
FOR DELETE 
TO public
USING (true);