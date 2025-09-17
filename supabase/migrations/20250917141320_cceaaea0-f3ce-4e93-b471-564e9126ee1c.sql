-- Créer une table pour les mots de passe des postes
CREATE TABLE public.poste_passwords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poste_id TEXT NOT NULL UNIQUE,
  poste_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.poste_passwords ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre la lecture à tous (nécessaire pour l'authentification)
CREATE POLICY "Anyone can read poste passwords" 
ON public.poste_passwords
FOR SELECT 
USING (true);

-- Créer une politique pour permettre la modification (pour les futurs changements de mot de passe)
CREATE POLICY "Anyone can update poste passwords" 
ON public.poste_passwords
FOR UPDATE 
USING (true);

-- Insérer les mots de passe par défaut (hashés avec bcrypt)
-- Le master password "DI961LSF" sera utilisé par défaut pour tous les postes
-- Les hash ci-dessous correspondent au mot de passe "DI961LSF"
INSERT INTO public.poste_passwords (poste_id, poste_name, password_hash) VALUES
('caissier', 'Caisse', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'), -- DI961LSF
('livreur', 'Livraisons', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'), -- DI961LSF
('pizzaiolo', 'Dolce Italia', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'), -- DI961LSF
('cuisinier', '961 LSF', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'); -- DI961LSF

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_poste_passwords_updated_at
BEFORE UPDATE ON public.poste_passwords
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();