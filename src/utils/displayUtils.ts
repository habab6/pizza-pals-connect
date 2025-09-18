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

// Fonction pour obtenir le nom à afficher pour les préparateurs (sans prix des extras)
export const getDisplayNameForPreparateur = (item: any): string => {
  if (!item.remarque) {
    return item.produits?.nom || 'Article inconnu';
  }
  
  const remarque = item.remarque.trim();
  
  // Si la remarque contient des extras
  if (remarque.includes('EXTRAS:')) {
    let customName = '';
    let extrasString = '';
    
    if (remarque.startsWith('EXTRAS:')) {
      // Cas où il n'y a que des extras (pas de nom personnalisé)
      extrasString = remarque.substring(7); // Enlever "EXTRAS:"
    } else {
      // Cas où il y a un nom personnalisé ET des extras
      const parts = remarque.split('|EXTRAS:');
      customName = parts[0] || '';
      extrasString = parts[1] || '';
    }
    
    if (extrasString) {
      // Extraire les noms des extras sans les prix
      const extrasNames = extrasString.split(',').map(extraStr => {
        const match = extraStr.match(/\+(.+)\((.+)€\)/);
        if (match) {
          return `+${match[1]}`;
        }
        return extraStr;
      }).join(', ');
      
      const baseName = customName || item.produits?.nom || 'Article inconnu';
      return `${baseName} (${extrasNames})`;
    }
  }
  
  // Si c'est juste un nom personnalisé sans extras
  return remarque || item.produits?.nom || 'Article inconnu';
};