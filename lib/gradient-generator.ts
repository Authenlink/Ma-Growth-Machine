export interface Gradient {
  color1: string;
  color2: string;
  css: string;
}

// Palette de couleurs vives predefinies
const VIBRANT_COLORS = [
  "#FF6B6B", // Rouge corail
  "#4ECDC4", // Turquoise
  "#45B7D1", // Bleu ciel
  "#FFA07A", // Saumon
  "#98D8C8", // Vert menthe
  "#F7DC6F", // Jaune dore
  "#BB8FCE", // Violet clair
  "#85C1E2", // Bleu clair
  "#F8B739", // Orange
  "#52BE80", // Vert emeraude
  "#EC7063", // Rose saumon
  "#5DADE2", // Bleu azur
  "#F39C12", // Orange vif
  "#58D68D", // Vert lime
  "#AF7AC5", // Violet
  "#76D7C4", // Cyan
  "#F1948A", // Rose
  "#85C1E9", // Bleu poudre
  "#F4D03F", // Jaune vif
  "#82E0AA", // Vert pomme
  "#D7BDE2", // Lavande
  "#AED6F1", // Bleu pastel
  "#F9E79F", // Jaune pale
  "#A9DFBF", // Vert pastel
  "#F5B7B1", // Rose peche
  "#A3E4D7", // Turquoise pastel
  "#FAD7A0", // Peche
  "#D5A6BD", // Mauve
];

// Directions de gradient possibles
const GRADIENT_DIRECTIONS = [
  "to right",
  "to bottom",
  "to bottom right",
  "to bottom left",
  "135deg",
  "45deg",
];

/**
 * Genere un gradient aleatoire avec deux couleurs vives
 */
export function generateRandomGradient(): Gradient {
  const color1Index = Math.floor(Math.random() * VIBRANT_COLORS.length);
  let color2Index = Math.floor(Math.random() * VIBRANT_COLORS.length);

  // S'assurer que les deux couleurs sont differentes
  while (color2Index === color1Index) {
    color2Index = Math.floor(Math.random() * VIBRANT_COLORS.length);
  }

  const color1 = VIBRANT_COLORS[color1Index];
  const color2 = VIBRANT_COLORS[color2Index];

  const direction =
    GRADIENT_DIRECTIONS[
      Math.floor(Math.random() * GRADIENT_DIRECTIONS.length)
    ];

  const css = `linear-gradient(${direction}, ${color1}, ${color2})`;

  return { color1, color2, css };
}

/**
 * Genere un gradient avec des couleurs specifiques
 */
export function generateGradient(
  color1: string,
  color2: string,
  direction: string = "to right"
): Gradient {
  const css = `linear-gradient(${direction}, ${color1}, ${color2})`;
  return { color1, color2, css };
}