-- Créer le type enum pour les rôles utilisateur
CREATE TYPE public.user_role AS ENUM ('caissier', 'pizzaiolo', 'livreur');

-- Créer le type enum pour les types de commande  
CREATE TYPE public.order_type AS ENUM ('sur_place', 'a_emporter', 'livraison');

-- Créer le type enum pour les statuts de commande
CREATE TYPE public.order_status AS ENUM ('nouveau', 'en_preparation', 'pret', 'en_livraison', 'livre', 'termine');

-- Créer le type enum pour les catégories de produits
CREATE TYPE public.product_category AS ENUM ('pizzas', 'pates', 'desserts', 'boissons');

-- Table des profils utilisateur (avec rôles)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL UNIQUE,
  adresse TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des produits du menu
CREATE TABLE public.produits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  categorie product_category NOT NULL,
  prix DECIMAL(5,2) NOT NULL,
  disponible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des commandes
CREATE TABLE public.commandes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_commande TEXT NOT NULL UNIQUE,
  type_commande order_type NOT NULL,
  statut order_status NOT NULL DEFAULT 'nouveau',
  client_id UUID REFERENCES public.clients(id),
  caissier_id UUID NOT NULL REFERENCES public.profiles(id),
  pizzaiolo_id UUID REFERENCES public.profiles(id),
  livreur_id UUID REFERENCES public.profiles(id),
  total DECIMAL(6,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des éléments de commande
CREATE TABLE public.commande_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id UUID NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES public.produits(id),
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commande_id UUID REFERENCES public.commandes(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commande_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour profiles
CREATE POLICY "Utilisateurs peuvent voir leur propre profil" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent modifier leur propre profil" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Politiques RLS pour clients (tous les utilisateurs authentifiés peuvent les gérer)
CREATE POLICY "Utilisateurs authentifiés peuvent voir les clients" 
ON public.clients FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent créer des clients" 
ON public.clients FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier les clients" 
ON public.clients FOR UPDATE 
TO authenticated USING (true);

-- Politiques RLS pour produits (lecture pour tous, modification pour caissiers)
CREATE POLICY "Tous peuvent voir les produits" 
ON public.produits FOR SELECT 
TO authenticated USING (true);

-- Politiques RLS pour commandes
CREATE POLICY "Utilisateurs peuvent voir toutes les commandes" 
ON public.commandes FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Caissiers peuvent créer des commandes" 
ON public.commandes FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'caissier'
));

CREATE POLICY "Utilisateurs peuvent modifier les commandes" 
ON public.commandes FOR UPDATE 
TO authenticated USING (true);

-- Politiques RLS pour commande_items
CREATE POLICY "Utilisateurs peuvent voir tous les items" 
ON public.commande_items FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Utilisateurs peuvent créer des items" 
ON public.commande_items FOR INSERT 
TO authenticated WITH CHECK (true);

-- Politiques RLS pour notifications
CREATE POLICY "Utilisateurs voient leurs notifications" 
ON public.notifications FOR SELECT 
USING (user_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Utilisateurs peuvent créer des notifications" 
ON public.notifications FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Utilisateurs peuvent modifier leurs notifications" 
ON public.notifications FOR UPDATE 
USING (user_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Fonction pour générer un numéro de commande unique
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'CMD' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Créer la séquence pour les numéros de commande
CREATE SEQUENCE IF NOT EXISTS order_sequence START 1;

-- Trigger pour auto-générer le numéro de commande
CREATE OR REPLACE FUNCTION public.auto_generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_commande IS NULL OR NEW.numero_commande = '' THEN
    NEW.numero_commande = public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_order_number
  BEFORE INSERT ON public.commandes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_order_number();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produits_updated_at
  BEFORE UPDATE ON public.produits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commandes_updated_at
  BEFORE UPDATE ON public.commandes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les produits du menu
INSERT INTO public.produits (nom, categorie, prix) VALUES
-- Pizzas
('Margherita', 'pizzas', 9.00),
('Prosciutto', 'pizzas', 10.00),
('Veneziana', 'pizzas', 9.50),
('4 Stagioni', 'pizzas', 11.50),
('Capricciosa', 'pizzas', 11.00),
('Regina', 'pizzas', 10.50),
('Vegetariana', 'pizzas', 11.50),
('Siciliana', 'pizzas', 10.50),
('Diavola', 'pizzas', 11.00),
('BBQ Chicken', 'pizzas', 12.00),
('Cannibal', 'pizzas', 12.50),
('Bolognese', 'pizzas', 11.00),
('Merguez', 'pizzas', 10.00),
('Calzone', 'pizzas', 8.50),
('Frutti di mare', 'pizzas', 12.00),
('4 Fromaggi', 'pizzas', 11.50),
('Rucola', 'pizzas', 10.00),
('Parmigiana', 'pizzas', 10.50),
('Poulet', 'pizzas', 11.50),
('Peperoni', 'pizzas', 10.00),
('Calabra', 'pizzas', 11.50),
('Tonno', 'pizzas', 11.50),
('Scampis', 'pizzas', 12.50),
('Beyrouth', 'pizzas', 11.50),
('Fermière', 'pizzas', 12.50),
('Hawai', 'pizzas', 11.50),
('Kefta', 'pizzas', 11.50),
('Salmone', 'pizzas', 12.50),
('Dolce Italia', 'pizzas', 14.00),
('Pizza Tenders BBQ', 'pizzas', 13.00),
-- Pâtes
('Napoletana', 'pates', 9.00),
('Bolognaise', 'pates', 11.00),
('Poulet', 'pates', 12.00),
('Poulet curry', 'pates', 12.00),
('Scampis', 'pates', 13.00),
('4 Frimaggi', 'pates', 11.00),
('Frutti di mare tomate', 'pates', 12.50),
('Frutti di mare crème', 'pates', 12.50),
('Vege tomate', 'pates', 11.00),
('Vege crème', 'pates', 10.00),
('Scampis tomate', 'pates', 13.00),
('Arrabiata', 'pates', 9.00),
('Salmone', 'pates', 13.00),
('Dolce Italia', 'pates', 14.00),
('Tonno tomate', 'pates', 12.00),
('Tonno crème', 'pates', 12.00),
('Pasta al forno', 'pates', 13.50),
-- Desserts
('Tiramisu', 'desserts', 3.50),
('Dessert Calzone', 'desserts', 7.00),
('Dessert Calzone Banane', 'desserts', 8.00),
('Dessert Calzone Fraise', 'desserts', 9.00),
-- Boissons
('Eau plate', 'boissons', 1.00),
('Coca-Cola', 'boissons', 2.00),
('Jus d''orange', 'boissons', 2.00);

-- Activer les mises à jour en temps réel pour toutes les tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commandes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commande_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;