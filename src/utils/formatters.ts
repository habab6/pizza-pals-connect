// Fonction utilitaire pour formater les noms de produits avec leur catégorie
export const formatProduitNom = (nom: string, categorie: string): string => {
  const categorieEmojis: Record<string, string> = {
    'pizzas': '🍕',
    'pates': '🍝',
    'desserts': '🍰',
    'boissons': '🥤'
  };

  // Si le nom existe dans plusieurs catégories, ajouter l'emoji
  const duplicateNames = [
    'Bolognese', 'Bolognaise', 
    '4 Fromaggi', '4 Frimaggi',
    'Dolce Italia',
    'Salmone',
    'Scampis',
    'Poulet'
  ];
  
  const isDuplicate = duplicateNames.some(duplicate => 
    nom.toLowerCase().includes(duplicate.toLowerCase())
  );

  if (isDuplicate) {
    const emoji = categorieEmojis[categorie] || '';
    return `${emoji} ${nom}`;
  }

  return nom;
};

export const formatCategorieName = (categorie: string): string => {
  const categoryNames: Record<string, string> = {
    'pizzas': '🍕 Pizzas',
    'pates': '🍝 Pâtes', 
    'desserts': '🍰 Desserts',
    'boissons': '🥤 Boissons'
  };
  
  return categoryNames[categorie] || categorie;
};