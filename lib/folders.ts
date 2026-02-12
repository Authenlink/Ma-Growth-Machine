import { db } from "@/lib/db";
import { folders, collections, leadCollections } from "@/lib/schema";
import { eq, and, isNull } from "drizzle-orm";

const DEFAULT_FOLDER_NAME = "Default";
const DEFAULT_COLLECTION_NAME = "Default";

export interface DefaultFolderResult {
  folderId: number;
  defaultCollectionId: number;
}

/**
 * Retourne l'ID de la collection Default "officielle" pour un utilisateur.
 * C'est celle retournée par ensureDefaultFolder - la plus ancienne (id le plus petit)
 * dans le dossier Default. Utilisée quand aucune collection n'est explicitement choisie.
 */
export async function getDefaultCollectionId(
  userId: number
): Promise<number | null> {
  const result = await ensureDefaultFolder(userId);
  return result.defaultCollectionId;
}

/**
 * Ensures the user has a Default folder with a Default collection inside.
 * Creates them if they don't exist. Also assigns orphan collections (folderId null) to Default.
 * En cas de doublons "Default", garde la plus ancienne (id min) et supprime les autres.
 */
export async function ensureDefaultFolder(
  userId: number
): Promise<DefaultFolderResult> {
  // Check if user already has a Default folder
  const existingFolders = await db
    .select()
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.name, DEFAULT_FOLDER_NAME)))
    .limit(1);

  if (existingFolders.length > 0) {
    const folder = existingFolders[0];

    // Assign orphan collections (folderId null) to this folder (migration)
    await db
      .update(collections)
      .set({ folderId: folder.id })
      .where(and(eq(collections.userId, userId), isNull(collections.folderId)));

    // Récupérer toutes les collections "Default" dans ce dossier, triées par id (la plus ancienne en premier)
    const existingCollections = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.folderId, folder.id),
          eq(collections.name, DEFAULT_COLLECTION_NAME)
        )
      )
      .orderBy(collections.id);

    if (existingCollections.length > 0) {
      const canonicalDefault = existingCollections[0]; // La plus ancienne (id min)

      // Supprimer les doublons (garder uniquement la plus ancienne)
      if (existingCollections.length > 1) {
        const duplicateIds = existingCollections
          .slice(1)
          .map((c) => c.id);

        // Migrer les leads des doublons vers la collection canonique avant suppression
        for (const dupId of duplicateIds) {
          const leadsInDup = await db
            .select({ leadId: leadCollections.leadId })
            .from(leadCollections)
            .where(eq(leadCollections.collectionId, dupId));

          for (const row of leadsInDup) {
            try {
              await db.insert(leadCollections).values({
                leadId: row.leadId,
                collectionId: canonicalDefault.id,
              });
            } catch {
              // Lead déjà dans la collection canonique, ignoré
            }
          }
          await db.delete(leadCollections).where(eq(leadCollections.collectionId, dupId));
          await db.delete(collections).where(eq(collections.id, dupId));
        }
      }

      return {
        folderId: folder.id,
        defaultCollectionId: canonicalDefault.id,
      };
    }

    // Create Default collection in existing folder
    const [newCollection] = await db
      .insert(collections)
      .values({
        userId,
        folderId: folder.id,
        name: DEFAULT_COLLECTION_NAME,
        description: "Collection par défaut",
      })
      .returning();

    if (!newCollection) {
      throw new Error("Failed to create Default collection");
    }

    return {
      folderId: folder.id,
      defaultCollectionId: newCollection.id,
    };
  }

  // Create Default folder
  const [newFolder] = await db
    .insert(folders)
    .values({
      userId,
      name: DEFAULT_FOLDER_NAME,
      description: "Dossier par défaut pour organiser vos collections",
    })
    .returning();

  if (!newFolder) {
    throw new Error("Failed to create Default folder");
  }

  // Assign orphan collections to the new folder first (migration from pre-folder schema)
  await db
    .update(collections)
    .set({ folderId: newFolder.id })
    .where(
      and(eq(collections.userId, userId), isNull(collections.folderId))
    );

  // Create Default collection only if it doesn't exist in this folder
  const existingDefault = await db
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.folderId, newFolder.id),
        eq(collections.name, DEFAULT_COLLECTION_NAME)
      )
    )
    .orderBy(collections.id)
    .limit(1);

  if (existingDefault.length > 0) {
    return {
      folderId: newFolder.id,
      defaultCollectionId: existingDefault[0].id,
    };
  }

  const [newCollection] = await db
    .insert(collections)
    .values({
      userId,
      folderId: newFolder.id,
      name: DEFAULT_COLLECTION_NAME,
      description: "Collection par défaut",
    })
    .returning();

  if (!newCollection) {
    throw new Error("Failed to create Default collection");
  }

  return {
    folderId: newFolder.id,
    defaultCollectionId: newCollection.id,
  };
}
