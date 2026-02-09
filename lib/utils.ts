import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Nettoie une industrie qui peut être stockée sous forme de chaîne JSON
 * Transforme "['human resources']" en "human resources"
 * Gère aussi les formats comme ["human resources"] ou "human resources"
 */
export function cleanIndustry(industry: string | null): string | null {
  if (!industry || industry.trim() === "") {
    return null;
  }

  let trimmed = industry.trim();

  // Vérifier si c'est une chaîne JSON sérialisée (commence par '[' et finit par ']')
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Prendre le premier élément et nettoyer les guillemets
        const firstItem = parsed[0];
        if (typeof firstItem === "string") {
          return firstItem.trim().replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // Si le parsing échoue, enlever les crochets et nettoyer
      trimmed = trimmed.slice(1, -1).trim();
      // Enlever les guillemets autour
      trimmed = trimmed.replace(/^["']|["']$/g, "");
      return trimmed;
    }
  }

  // Nettoyer les guillemets simples ou doubles au début et à la fin
  return trimmed.replace(/^["']|["']$/g, "");
}
