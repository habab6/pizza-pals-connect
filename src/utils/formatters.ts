// Fonction utilitaire pour formater les noms de produits avec leur catégorie
export const formatProduitNom = (nom: string, categorie: string): string => {
  // Retourner simplement le nom du produit sans emojis
  return nom;
};

export const formatCategorieName = (categorie: string): string => {
  const categoryNames: Record<string, string> = {
    'pizzas': 'Pizzas',
    'pates': 'Pâtes', 
    'desserts': 'Desserts',
    'boissons': 'Boissons'
  };
  
  return categoryNames[categorie] || categorie;
};