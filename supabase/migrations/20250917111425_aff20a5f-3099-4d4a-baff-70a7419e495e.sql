-- Ensure public read access to produits via RLS policy (permissive)
-- Safe-guarded creation to avoid duplicates

-- Enable RLS (no-op if already enabled)
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;

-- Create a PERMISSIVE SELECT policy for all roles (including anon)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'produits' AND policyname = 'Everyone can read produits'
  ) THEN
    CREATE POLICY "Everyone can read produits"
      ON public.produits
      AS PERMISSIVE
      FOR SELECT
      TO public
      USING (true);
  END IF;
END$$;