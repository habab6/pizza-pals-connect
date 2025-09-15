-- Créer un trigger pour créer automatiquement le profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.user_role;
  _nom TEXT;
BEGIN
  -- Déterminer le rôle depuis les métadonnées, défaut 'caissier'
  IF (new.raw_user_meta_data ? 'role') THEN
    BEGIN
      _role := (new.raw_user_meta_data ->> 'role')::public.user_role;
    EXCEPTION WHEN others THEN
      _role := 'caissier';
    END;
  ELSE
    _role := 'caissier';
  END IF;

  -- Déterminer le nom depuis les métadonnées, défaut: partie avant @ de l'email
  IF (new.raw_user_meta_data ? 'nom') THEN
    _nom := new.raw_user_meta_data ->> 'nom';
  ELSE
    _nom := split_part(new.email, '@', 1);
  END IF;

  INSERT INTO public.profiles (user_id, nom, role)
  VALUES (new.id, _nom, _role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Politique d'INSERT pour permettre à l'utilisateur de créer son propre profil (si jamais on l'insère côté client)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);