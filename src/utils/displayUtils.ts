// Fonction utilitaire pour obtenir le nom à afficher d'un article
export const getDisplayName = (item: any): string => {
  // Si l'article a un nom personnalisé (remarque), l'utiliser en priorité
  if (item.remarque && item.remarque.trim()) {
    return item.remarque;
  }
  
  // Sinon, utiliser le nom du produit
  return item.produits?.nom || 'Article inconnu';
};

// Fonction pour déterminer si un article a été personnalisé
export const isCustomizedItem = (item: any): boolean => {
  return !!(item.remarque && item.remarque.trim());
};