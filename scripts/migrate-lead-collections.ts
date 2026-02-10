import "dotenv/config";
import postgres from "postgres";

// Migration script to move existing lead collection relationships to the new many-to-many table
// À exécuter si vous avez utilisé drizzle-kit push (qui ne copie pas les données)
async function migrateLeadCollections() {
  console.log("🚀 Starting lead collections migration...");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(connectionString);

  try {
    // Vérifier si la colonne collection_id existe encore
    const columnCheck = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'collection_id'
    `;
    if (columnCheck.length === 0) {
      console.error("❌ La colonne leads.collection_id n'existe plus. Les données ont déjà été migrées ou ont été perdues.");
      console.error("   Si vous avez une sauvegarde, restaurez-la puis exécutez d'abord ce script.");
      return;
    }

    // Get all leads with their collectionId
    console.log("📊 Fetching existing leads with collection relationships...");
    const leads = await sql`
      SELECT id, collection_id FROM leads WHERE collection_id IS NOT NULL
    `;
    console.log(`Found ${leads.length} leads to migrate`);

    if (leads.length === 0) {
      console.log("✅ No leads to migrate");
      return;
    }

    // Insérer dans lead_collections (la table existe déjà après push)
    console.log("🔄 Inserting lead-collection relationships...");

    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      for (const lead of batch) {
        await sql`
          INSERT INTO lead_collections (lead_id, collection_id) 
          VALUES (${lead.id}, ${lead.collection_id}) 
          ON CONFLICT (lead_id, collection_id) DO NOTHING
        `;
        inserted++;
      }
      console.log(`Inserted ${Math.min(i + batchSize, leads.length)}/${leads.length} relationships`);
    }

    console.log("✅ Migration completed successfully!");
    console.log(`Migrated ${leads.length} lead-collection relationships`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the migration
migrateLeadCollections()
  .then(() => {
    console.log("🎉 Lead collections migration completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  });