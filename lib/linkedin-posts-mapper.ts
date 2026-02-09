import { db } from "./db";
import { companyPosts, leadPosts } from "./schema";
import { eq, and } from "drizzle-orm";

/**
 * Structure des données brutes d'un post LinkedIn depuis Apify
 * Basé sur la structure réelle retournée par harvestapi/linkedin-profile-posts
 */
export interface LinkedInPostData {
  // Type et identifiant
  type?: string;
  id?: string;
  
  // URL du post (dans linkedinUrl à la racine)
  linkedinUrl?: string;
  
  // Contenu du post
  content?: string;
  
  // Auteur (objet avec name, linkedinUrl, etc.)
  author?: {
    name?: string;
    linkedinUrl?: string;
    publicIdentifier?: string;
    [key: string]: unknown;
  };
  
  // Date de publication (objet avec timestamp et date)
  postedAt?: {
    timestamp?: number;
    date?: string | Date;
    postedAgoShort?: string;
    postedAgoText?: string;
  };
  
  // Engagement (likes, comments, shares, reactions)
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    reactions?: Array<{
      type?: string;
      count?: number;
    }>;
  };
  
  // Champs additionnels pour compatibilité
  organizationLinkedinUrl?: string;
  organization_linkedin_url?: string;
  targetUrl?: string;
  target_url?: string;
  post_url?: string;
  postUrl?: string;
  url?: string;
  posted_date?: string | Date;
  postedDate?: string | Date;
  date?: string | Date;
  language?: string;
  text?: string;
  reactions?: number;
  reaction?: number;
  like?: number;
  likes?: number;
  
  // Champs additionnels possibles
  [key: string]: unknown;
}

/**
 * Résultat du mapping des posts
 */
export interface PostsMappingResult {
  created: number;
  skipped: number;
  errors: number;
}

/**
 * Parse une date depuis différents formats possibles
 */
function parseDate(date: string | Date | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  try {
    return new Date(date);
  } catch {
    return null;
  }
}

/**
 * Mappe et sauvegarde les posts d'entreprise en base de données
 * @param posts Données brutes des posts depuis Apify
 * @param companyId ID de l'entreprise (optionnel)
 * @param organizationLinkedinUrl URL LinkedIn de l'entreprise
 * @returns Résultat du mapping (créés, ignorés, erreurs)
 */
export async function mapCompanyPostsToDB(
  posts: LinkedInPostData[],
  companyId: number | null,
  organizationLinkedinUrl: string
): Promise<PostsMappingResult> {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of posts) {
    try {
      // Extraire le post_url (structure réelle : linkedinUrl à la racine)
      const postUrl =
        post.linkedinUrl ||
        post.post_url ||
        post.postUrl ||
        post.url ||
        null;

      if (!postUrl) {
        console.warn("Post sans URL, ignoré:", JSON.stringify(post, null, 2));
        skipped++;
        continue;
      }

      // Vérifier si le post existe déjà (par post_url)
      const existing = await db
        .select()
        .from(companyPosts)
        .where(eq(companyPosts.postUrl, postUrl))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Parser la date (structure réelle : postedAt.date ou postedAt.timestamp)
      let postedDate: Date | null = null;
      if (post.postedAt) {
        if (post.postedAt.date) {
          postedDate = parseDate(post.postedAt.date);
        } else if (post.postedAt.timestamp) {
          postedDate = new Date(post.postedAt.timestamp);
        }
      }
      // Fallback vers les autres formats
      if (!postedDate) {
        postedDate = parseDate(
          post.posted_date || post.postedDate || post.date
        );
      }

      // Extraire le texte (structure réelle : content)
      const text = post.content || post.text || null;

      // Extraire l'auteur (structure réelle : author.name)
      const author =
        (post.author && typeof post.author === "object" && "name" in post.author
          ? post.author.name
          : null) ||
        (typeof post.author === "string" ? post.author : null);

      // Extraire les réactions (structure réelle : engagement.likes et engagement.reactions)
      let reactions: number | null = null;
      let like: number | null = null;

      if (post.engagement) {
        like = post.engagement.likes || null;
        // Calculer le total des réactions si disponible
        if (post.engagement.reactions && Array.isArray(post.engagement.reactions)) {
          reactions = post.engagement.reactions.reduce(
            (sum: number, r: { count?: number }) => sum + (r.count || 0),
            0
          );
        }
      }
      // Fallback vers les autres formats
      if (!reactions) {
        reactions = post.reactions || post.reaction || null;
      }
      if (!like) {
        like = post.like || post.likes || null;
      }

      // Insérer le post
      await db.insert(companyPosts).values({
        companyId: companyId || null,
        organizationLinkedinUrl:
          post.organizationLinkedinUrl ||
          post.organization_linkedin_url ||
          organizationLinkedinUrl,
        postUrl: postUrl,
        postedDate: postedDate,
        language: post.language || null,
        author: author,
        text: text,
        reactions: reactions,
        like: like,
      });

      created++;
    } catch (error) {
      console.error("Erreur lors du mapping d'un post d'entreprise:", error);
      console.error("Post qui a causé l'erreur:", JSON.stringify(post, null, 2));
      errors++;
    }
  }

  return { created, skipped, errors };
}

/**
 * Mappe et sauvegarde les posts de lead en base de données
 * @param posts Données brutes des posts depuis Apify
 * @param leadId ID du lead
 * @param linkedinUrl URL LinkedIn du lead
 * @returns Résultat du mapping (créés, ignorés, erreurs)
 */
export async function mapLeadPostsToDB(
  posts: LinkedInPostData[],
  leadId: number,
  linkedinUrl: string
): Promise<PostsMappingResult> {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of posts) {
    try {
      // Extraire le post_url (structure réelle : linkedinUrl à la racine)
      const postUrl =
        post.linkedinUrl ||
        post.post_url ||
        post.postUrl ||
        post.url ||
        null;

      if (!postUrl) {
        console.warn("Post sans URL, ignoré:", JSON.stringify(post, null, 2));
        skipped++;
        continue;
      }

      // Vérifier si le post existe déjà (par post_url)
      const existing = await db
        .select()
        .from(leadPosts)
        .where(
          and(
            eq(leadPosts.leadId, leadId),
            eq(leadPosts.postUrl, postUrl)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Parser la date (structure réelle : postedAt.date ou postedAt.timestamp)
      let postedDate: Date | null = null;
      if (post.postedAt) {
        if (post.postedAt.date) {
          postedDate = parseDate(post.postedAt.date);
        } else if (post.postedAt.timestamp) {
          postedDate = new Date(post.postedAt.timestamp);
        }
      }
      // Fallback vers les autres formats
      if (!postedDate) {
        postedDate = parseDate(
          post.posted_date || post.postedDate || post.date
        );
      }

      // Extraire le texte (structure réelle : content)
      const text = post.content || post.text || null;

      // Extraire l'auteur (structure réelle : author.name)
      const author =
        (post.author && typeof post.author === "object" && "name" in post.author
          ? post.author.name
          : null) ||
        (typeof post.author === "string" ? post.author : null);

      // Extraire les réactions (structure réelle : engagement.likes et engagement.reactions)
      let reactions: number | null = null;
      let like: number | null = null;

      if (post.engagement) {
        like = post.engagement.likes || null;
        // Calculer le total des réactions si disponible
        if (post.engagement.reactions && Array.isArray(post.engagement.reactions)) {
          reactions = post.engagement.reactions.reduce(
            (sum: number, r: { count?: number }) => sum + (r.count || 0),
            0
          );
        }
      }
      // Fallback vers les autres formats
      if (!reactions) {
        reactions = post.reactions || post.reaction || null;
      }
      if (!like) {
        like = post.like || post.likes || null;
      }

      // Extraire linkedinUrl avec fallback vers le paramètre de la fonction
      // Pour les posts de profil, on peut aussi utiliser query.targetUrl
      let extractedLinkedinUrl: string | undefined = undefined;
      if (post.query && typeof post.query === "object" && "targetUrl" in post.query && typeof post.query.targetUrl === "string") {
        extractedLinkedinUrl = post.query.targetUrl;
      } else if (typeof post.linkedinUrl === "string") {
        extractedLinkedinUrl = post.linkedinUrl;
      } else if (typeof post.linkedin_url === "string") {
        extractedLinkedinUrl = post.linkedin_url;
      } else if (typeof post.targetUrl === "string") {
        extractedLinkedinUrl = post.targetUrl;
      } else if (typeof post.target_url === "string") {
        extractedLinkedinUrl = post.target_url;
      }
      
      // Utiliser le paramètre de la fonction comme fallback final (toujours une string)
      const finalLinkedinUrl: string = extractedLinkedinUrl || linkedinUrl;

      // Insérer le post
      await db.insert(leadPosts).values({
        leadId: leadId,
        linkedinUrl: finalLinkedinUrl,
        postUrl: postUrl,
        postedDate: postedDate,
        language: post.language || null,
        author: author,
        text: text,
        reactions: reactions,
        like: like,
      });

      created++;
    } catch (error) {
      console.error("Erreur lors du mapping d'un post de lead:", error);
      console.error("Post qui a causé l'erreur:", JSON.stringify(post, null, 2));
      errors++;
    }
  }

  return { created, skipped, errors };
}
