-- Créer la table pour stocker les abonnements push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  poste_type TEXT NOT NULL CHECK (poste_type IN ('caissier', 'cuisinier', 'pizzaiolo', 'livreur')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS
CREATE POLICY "Tout le monde peut gérer les abonnements push"
ON public.push_subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Créer l'index pour les recherches par type de poste
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_poste_type 
ON public.push_subscriptions(poste_type) 
WHERE is_active = true;

-- Trigger pour update automatique du timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();