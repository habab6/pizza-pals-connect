-- Ajouter "extra" à l'enum product_category
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'extra';