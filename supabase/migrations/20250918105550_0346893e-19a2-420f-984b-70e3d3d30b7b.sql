-- Ajouter des catégories "Extra" pour chaque commerce
INSERT INTO categories (nom, commerce, actif) VALUES 
('Extra', 'dolce_italia', true),
('Extra', '961_lsf', true)
ON CONFLICT DO NOTHING;