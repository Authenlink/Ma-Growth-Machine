/**
 * Script de backfill pour enregistrer les usages de scrapers sur les leads/companies existants.
 *
 * - Leads avec companyLinkedinPost = 'enriched' ou personLinkedinPost = 'enriched'
 * - Companies avec seoAnalyzedAt (données SEO)
 *
 * Usage: npx tsx scripts/backfill-entity-scraper-usages.ts
 */
import "dotenv/config";
import { db } from "../lib/db";
import {
  leads,
  companies,
  scrapers,
  entityScraperUsages,
  companyPosts,
  leadPosts,
} from "../lib/schema";
import { eq, and, sql, isNotNull, inArray } from "drizzle-orm";

async function backfill() {
  console.log("[Backfill] Début du backfill entity_scraper_usages...\n");

  // Récupérer les IDs des scrapers
  const scraperRows = await db
    .select({ id: scrapers.id, mapperType: scrapers.mapperType })
    .from(scrapers)
    .where(
      inArray(scrapers.mapperType, [
        "linkedin-company-posts",
        "linkedin-profile-posts",
        "pagespeed-seo",
      ])
    );

  const scraperIds = {
    "linkedin-company-posts": scraperRows.find((r) => r.mapperType === "linkedin-company-posts")?.id,
    "linkedin-profile-posts": scraperRows.find((r) => r.mapperType === "linkedin-profile-posts")?.id,
    "pagespeed-seo": scraperRows.find((r) => r.mapperType === "pagespeed-seo")?.id,
  };

  if (!scraperIds["linkedin-company-posts"] || !scraperIds["linkedin-profile-posts"]) {
    console.warn("[Backfill] Scrapers LinkedIn non trouvés, vérifiez seed-scrapers");
  }
  if (!scraperIds["pagespeed-seo"]) {
    console.warn("[Backfill] Scraper pagespeed-seo non trouvé");
  }

  let insertedCompanyPosts = 0;
  let insertedProfilePosts = 0;
  let insertedSeo = 0;
  let skipped = 0;

  // Récupérer les existants en une seule requête pour éviter les doublons
  const existingUsages = await db
    .select({
      entityType: entityScraperUsages.entityType,
      entityId: entityScraperUsages.entityId,
      scraperId: entityScraperUsages.scraperId,
      source: entityScraperUsages.source,
    })
    .from(entityScraperUsages);

  const existingKey = (et: string, eid: number, sid: number | null, src: string) =>
    `${et}-${eid}-${sid}-${src}`;
  const existingSet = new Set(
    existingUsages.map((u) => existingKey(u.entityType, u.entityId, u.scraperId, u.source))
  );

  // 1. Leads avec companyLinkedinPost = 'enriched'
  if (scraperIds["linkedin-company-posts"]) {
    const leadsWithCompanyPosts = await db
      .select({
        id: leads.id,
        userId: leads.userId,
        companyId: leads.companyId,
      })
      .from(leads)
      .where(eq(leads.companyLinkedinPost, "enriched"));

    console.log(`[Backfill] ${leadsWithCompanyPosts.length} leads avec companyLinkedinPost = enriched`);

    const companyPostCounts = new Map<number, number>();
    const companyIds = [...new Set(leadsWithCompanyPosts.map((l) => l.companyId).filter(Boolean))];
    for (const cid of companyIds) {
      if (!cid) continue;
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(companyPosts)
        .where(eq(companyPosts.companyId, cid));
      companyPostCounts.set(cid, Math.max(1, row?.count ?? 0));
    }

    const toInsertCompany: typeof entityScraperUsages.$inferInsert[] = [];
    for (const lead of leadsWithCompanyPosts) {
      if (!lead.userId) continue;
      const key = existingKey("lead", lead.id, scraperIds["linkedin-company-posts"]!, "enrich_collection");
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      const itemCount = lead.companyId ? companyPostCounts.get(lead.companyId) ?? 1 : 1;
      toInsertCompany.push({
        entityType: "lead",
        entityId: lead.id,
        scraperId: scraperIds["linkedin-company-posts"],
        runId: null,
        source: "enrich_collection",
        hasResult: true,
        itemCount,
        configUsed: null,
        userId: lead.userId,
      });
      existingSet.add(key);
    }

    if (toInsertCompany.length > 0) {
      await db.insert(entityScraperUsages).values(toInsertCompany);
      insertedCompanyPosts = toInsertCompany.length;
    }
    console.log(`  -> ${insertedCompanyPosts} enregistrements créés (company posts)`);
  }

  // 2. Leads avec personLinkedinPost = 'enriched'
  if (scraperIds["linkedin-profile-posts"]) {
    const leadsWithProfilePosts = await db
      .select({
        id: leads.id,
        userId: leads.userId,
      })
      .from(leads)
      .where(eq(leads.personLinkedinPost, "enriched"));

    console.log(`\n[Backfill] ${leadsWithProfilePosts.length} leads avec personLinkedinPost = enriched`);

    const leadPostCounts = new Map<number, number>();
    const leadIdsForPosts = leadsWithProfilePosts.map((l) => l.id);
    if (leadIdsForPosts.length > 0) {
      const counts = await db
        .select({
          leadId: leadPosts.leadId,
          count: sql<number>`count(*)::int`.as("count"),
        })
        .from(leadPosts)
        .where(inArray(leadPosts.leadId, leadIdsForPosts))
        .groupBy(leadPosts.leadId);
      for (const c of counts) {
        if (c.leadId) leadPostCounts.set(c.leadId, Math.max(1, c.count ?? 0));
      }
    }

    const toInsertProfile: typeof entityScraperUsages.$inferInsert[] = [];
    for (const lead of leadsWithProfilePosts) {
      if (!lead.userId) continue;
      const key = existingKey("lead", lead.id, scraperIds["linkedin-profile-posts"]!, "enrich_collection");
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      toInsertProfile.push({
        entityType: "lead",
        entityId: lead.id,
        scraperId: scraperIds["linkedin-profile-posts"],
        runId: null,
        source: "enrich_collection",
        hasResult: true,
        itemCount: leadPostCounts.get(lead.id) ?? 1,
        configUsed: null,
        userId: lead.userId,
      });
      existingSet.add(key);
    }

    if (toInsertProfile.length > 0) {
      await db.insert(entityScraperUsages).values(toInsertProfile);
      insertedProfilePosts = toInsertProfile.length;
    }
    console.log(`  -> ${insertedProfilePosts} enregistrements créés (profile posts)`);
  }

  // 3. Companies avec seoAnalyzedAt (données SEO)
  if (scraperIds["pagespeed-seo"]) {
    const companiesWithSeo = await db
      .select({ id: companies.id })
      .from(companies)
      .where(isNotNull(companies.seoAnalyzedAt));

    console.log(`\n[Backfill] ${companiesWithSeo.length} companies avec données SEO`);

    const companyUserIds = new Map<number, number>();
    const companyIdsSeo = companiesWithSeo.map((c) => c.id);
    if (companyIdsSeo.length > 0) {
      const leadForCompanies = await db
        .select({
          companyId: leads.companyId,
          userId: leads.userId,
        })
        .from(leads)
        .where(inArray(leads.companyId, companyIdsSeo));
      for (const row of leadForCompanies) {
        if (row.companyId && row.userId && !companyUserIds.has(row.companyId)) {
          companyUserIds.set(row.companyId, row.userId);
        }
      }
    }

    const toInsertSeo: typeof entityScraperUsages.$inferInsert[] = [];
    for (const company of companiesWithSeo) {
      const userId = companyUserIds.get(company.id);
      if (!userId) continue;

      const key = existingKey("company", company.id, scraperIds["pagespeed-seo"]!, "seo_analyze");
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      toInsertSeo.push({
        entityType: "company",
        entityId: company.id,
        scraperId: scraperIds["pagespeed-seo"],
        runId: null,
        source: "seo_analyze",
        hasResult: true,
        itemCount: 1,
        configUsed: null,
        userId,
      });
      existingSet.add(key);
    }

    if (toInsertSeo.length > 0) {
      await db.insert(entityScraperUsages).values(toInsertSeo);
      insertedSeo = toInsertSeo.length;
    }
    console.log(`  -> ${insertedSeo} enregistrements créés (SEO)`);
  }

  console.log("\n[Backfill] Terminé.");
  console.log(`  - Company posts (LinkedIn): ${insertedCompanyPosts}`);
  console.log(`  - Profile posts (LinkedIn): ${insertedProfilePosts}`);
  console.log(`  - SEO (PageSpeed): ${insertedSeo}`);
  console.log(`  - Skippés (déjà présents): ${skipped}`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[Backfill] Erreur:", err);
    process.exit(1);
  });
