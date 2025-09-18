-- Créer la catégorie extra si elle n'existe pas déjà
INSERT INTO public.categories (nom, commerce, actif)
SELECT 'Extra', 'dolce_italia', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE nom = 'Extra' AND commerce = 'dolce_italia'
);

INSERT INTO public.categories (nom, commerce, actif)  
SELECT 'Extra', '961_lsf', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE nom = 'Extra' AND commerce = '961_lsf'
);