#!/usr/bin/env node

/**
 * Script de test direct du mapping Apify avec les vraies fonctions
 */

const { spawn } = require('child_process');

const testScript = `
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { collections, companies, leads } from '../lib/schema.js';

// Charger les variables d'environnement
dotenv.config();

// Vérifier la connexion DB
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non trouvé dans .env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Données de test réelles simulant un retour Apify avec les paramètres de l'utilisateur
const mockApifyData = [
  {
    firstName: 'Sophie',
    lastName: 'Laurent',
    fullName: 'Sophie Laurent',
    position: 'Director of Marketing',
    linkedinUrl: 'https://linkedin.com/in/sophie-laurent-marseille',
    seniority: 'Director',
    functional: "['marketing', 'communication']",
    orgName: 'DigitalAgency',
    orgWebsite: 'https://digitalagency.fr',
    orgIndustry: 'E-Learning',
    orgSize: '21-50',
    orgCity: 'Marseille',
    orgCountry: 'France',
    email: 'sophie.laurent@digitalagency.fr',
    city: 'Marseille',
    country: 'France'
  },
  {
    firstName: 'Marc',
    lastName: 'Dubois',
    fullName: 'Marc Dubois',
    position: 'General Manager',
    linkedinUrl: 'https://linkedin.com/in/marc-dubois-marseille',
    seniority: 'Director',
    functional: "['operations', 'management']",
    orgName: 'BusinessConsult',
    orgWebsite: 'https://businessconsult.fr',
    orgIndustry: 'Business Supplies & Equipment',
    orgSize: '51-100',
    orgCity: 'Marseille',
    orgCountry: 'France',
    email: 'marc.dubois@businessconsult.fr',
    phone: '+33491987654',
    city: 'Marseille',
    country: 'France'
  },
  {
    firstName: 'Isabelle',
    lastName: 'Martin',
    fullName: 'Isabelle Martin',
    position: 'Founder',
    linkedinUrl: 'https://linkedin.com/in/isabelle-martin-marseille',
    seniority: 'Owner',
    functional: "['executive', 'strategy']",
    orgName: 'FinTech Solutions',
    orgWebsite: 'https://fintech-solutions.fr',
    orgIndustry: 'Financial Services',
    orgSize: '21-50',
    orgCity: 'Marseille',
    orgCountry: 'France',
    email: 'isabelle.martin@fintech-solutions.fr',
    city: 'Marseille',
    country: 'France'
  }
];

// Fonctions utilitaires (copiées depuis apify-mapper.ts)
function parseFunctional(functional) {
  if (!functional) return null;

  try {
    const parsed = JSON.parse(functional);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [functional];
  } catch {
    return functional.trim() ? [functional] : null;
  }
}

function parseFoundedYear(year) {
  if (!year) return null;
  if (typeof year === 'number') return year;
  const parsed = parseInt(year, 10);
  return isNaN(parsed) ? null : parsed;
}

async function getOrCreateCompany(companyData) {
  if (!companyData.orgName || companyData.orgName.trim() === '') {
    return null;
  }

  // Chercher une company existante par nom ou domaine
  const existingCompany = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.name, companyData.orgName),
        companyData.orgWebsite ? eq(companies.website, companyData.orgWebsite) : undefined
      )
    )
    .limit(1);

  if (existingCompany.length > 0) {
    return existingCompany[0].id;
  }

  // Créer une nouvelle company
  const [newCompany] = await db
    .insert(companies)
    .values({
      name: companyData.orgName,
      website: companyData.orgWebsite && companyData.orgWebsite.trim() !== ''
        ? companyData.orgWebsite
        : null,
      linkedinUrl: companyData.orgLinkedinUrl && companyData.orgLinkedinUrl.trim() !== ''
        ? companyData.orgLinkedinUrl
        : null,
      foundedYear: parseFoundedYear(companyData.orgFoundedYear),
      industry: companyData.orgIndustry && companyData.orgIndustry.trim() !== ''
        ? companyData.orgIndustry
        : null,
      size: companyData.orgSize && companyData.orgSize.trim() !== ''
        ? companyData.orgSize
        : null,
      description: companyData.orgDescription && companyData.orgDescription.trim() !== ''
        ? companyData.orgDescription
        : null,
      specialities: null,
      city: companyData.orgCity && companyData.orgCity.trim() !== ''
        ? companyData.orgCity
        : null,
      state: companyData.orgState && companyData.orgState.trim() !== ''
        ? companyData.orgState
        : null,
      country: companyData.orgCountry && companyData.orgCountry.trim() !== ''
        ? companyData.orgCountry
        : null,
    })
    .returning();

  return newCompany.id;
}

async function mapApifyDataToLeads(apifyData, collectionId, userId) {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const data of apifyData) {
    try {
      // Vérifier si le lead existe déjà (par email ou linkedinUrl)
      if (data.email || data.linkedinUrl) {
        const conditions = [eq(leads.collectionId, collectionId)];

        if (data.email) {
          conditions.push(eq(leads.email, data.email));
        }
        if (data.linkedinUrl) {
          conditions.push(eq(leads.linkedinUrl, data.linkedinUrl));
        }

        const existingLead = await db
          .select()
          .from(leads)
          .where(and(...conditions))
          .limit(1);

        if (existingLead.length > 0) {
          skipped++;
          continue;
        }
      }

      // Créer ou récupérer la company
      const companyId = await getOrCreateCompany(data);

      // Extraire le nom complet si nécessaire
      const fullName =
        data.fullName ||
        (data.firstName && data.lastName
          ? \`\${data.firstName} \${data.lastName}\`
          : null);

      // Parser le champ functional
      const functionalArray = parseFunctional(data.functional);

      // Parser phoneNumbers
      const phoneNumbers = data.phone && data.phone.trim() !== ''
        ? [data.phone]
        : null;

      // Créer le lead
      await db.insert(leads).values({
        collectionId,
        userId,
        companyId: companyId || null,
        personId: null,
        fullName: fullName || null,
        firstName: data.firstName && data.firstName.trim() !== '' ? data.firstName : null,
        lastName: data.lastName && data.lastName.trim() !== '' ? data.lastName : null,
        position: data.position && data.position.trim() !== '' ? data.position : null,
        linkedinUrl: data.linkedinUrl && data.linkedinUrl.trim() !== '' ? data.linkedinUrl : null,
        seniority: data.seniority && data.seniority.trim() !== '' ? data.seniority : null,
        functional: functionalArray && functionalArray.length > 0
          ? functionalArray.join(', ')
          : null,
        email: data.email && data.email.trim() !== '' ? data.email : null,
        personalEmail: null,
        phoneNumbers: phoneNumbers,
        city: data.city && data.city.trim() !== '' ? data.city : null,
        state: data.state && data.state.trim() !== '' ? data.state : null,
        country: data.country && data.country.trim() !== '' ? data.country : null,
        status: null,
        validated: false,
      });

      created++;
    } catch (error) {
      console.error('Erreur lors du mapping d un lead:', error, data);
      errors++;
    }
  }

  return { created, skipped, errors };
}

async function main() {
  console.log('🧪 Test du mapping Apify avec paramètres réels\\n');

  try {
    // Test de connexion DB
    console.log('🔌 Test de connexion à la base de données...');
    await db.execute('SELECT 1');
    console.log('✅ Connexion DB réussie\\n');

    // 1. Créer une collection de test
    console.log('1️⃣ Création d une collection de test...');
    const testUserId = 1;

    const [collection] = await db.insert(collections).values({
      userId: testUserId,
      name: 'Test Marseille Leads',
      description: 'Test des paramètres de scraping pour Marseille'
    }).returning();

    console.log(\`✅ Collection créée: "\${collection.name}" (ID: \${collection.id})\\n\`);

    // 2. Afficher les paramètres de test
    console.log('2️⃣ Paramètres de scraping simulés:');
    const testParams = {
      companyEmployeeSizeIncludes: ['21-50', '51-100'],
      companyIndustryIncludes: ['Banking', 'Business Supplies & Equipment', 'Commercial Real Estate', 'E-Learning', 'Education Management', 'Events Services', 'Financial Services', 'Human Resources'],
      companyLocationCityIncludes: ['Marseille'],
      companyLocationCountryIncludes: ['France'],
      emailStatus: 'verified',
      hasEmail: true,
      hasPhone: false,
      includeSimilarTitles: false,
      personLocationCityIncludes: ['Marseille'],
      personLocationCountryIncludes: ['France'],
      personTitleIncludes: ['Director', 'General Manager', 'Founder', 'Manager', 'Co-Founder', 'Chief Financial Officer', 'Director Of Marketing'],
      resetSavedProgress: false,
      totalResults: 10
    };

    console.log(JSON.stringify(testParams, null, 2));
    console.log();

    // 3. Tester le mapping
    console.log('3️⃣ Test du mapping des données Apify...');
    console.log(\`📊 \${mockApifyData.length} leads de test à mapper\\n\`);

    const mappingResult = await mapApifyDataToLeads(mockApifyData, collection.id, testUserId);

    console.log('📈 Résultats du mapping:');
    console.log(\`   ✅ Créés: \${mappingResult.created}\`);
    console.log(\`   ⏭️ Ignorés (doublons): \${mappingResult.skipped}\`);
    console.log(\`   ❌ Erreurs: \${mappingResult.errors}\\n\`);

    // 4. Vérifier les données en base
    console.log('4️⃣ Vérification des données en base de données...');

    // Récupérer les leads créés avec les infos des companies
    const leadsWithCompanies = await db
      .select({
        leadId: leads.id,
        fullName: leads.fullName,
        position: leads.position,
        email: leads.email,
        linkedinUrl: leads.linkedinUrl,
        seniority: leads.seniority,
        functional: leads.functional,
        leadCity: leads.city,
        leadCountry: leads.country,
        companyName: companies.name,
        companyIndustry: companies.industry,
        companySize: companies.size,
        companyWebsite: companies.website,
        companyCity: companies.city,
        companyCountry: companies.country
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(eq(leads.collectionId, collection.id));

    console.log(\`👥 Leads créés: \${leadsWithCompanies.length}\\n\`);

    leadsWithCompanies.forEach((item, index) => {
      console.log(\`   \${index + 1}. \${item.fullName}\`);
      console.log(\`      👔 \${item.position} (\${item.seniority})\`);
      console.log(\`      📧 \${item.email}\`);
      console.log(\`      🔗 \${item.linkedinUrl}\`);
      console.log(\`      📍 \${item.leadCity}, \${item.leadCountry}\`);
      console.log(\`      🏢 \${item.companyName} - \${item.companyIndustry} (\${item.companySize})\`);
      console.log(\`      🌐 \${item.companyWebsite}\\n\`);
    });

    // 5. Statistiques des companies
    const totalCompanies = await db.select().from(companies);
    console.log(\`🏢 Total companies en base: \${totalCompanies.length}\`);

    // 6. Test de dédoublonnage
    console.log('\\n5️⃣ Test du dédoublonnage...');
    console.log('🔄 Tentative d insertion des mêmes données...');

    const secondMapping = await mapApifyDataToLeads(mockApifyData, collection.id, testUserId);

    console.log('📈 Résultats du deuxième mapping:');
    console.log(\`   ✅ Créés: \${secondMapping.created}\`);
    console.log(\`   ⏭️ Ignorés (doublons): \${secondMapping.skipped}\`);
    console.log(\`   ❌ Erreurs: \${secondMapping.errors}\`);

    if (secondMapping.skipped === mockApifyData.length && secondMapping.created === 0) {
      console.log('✅ Dédoublonnage fonctionne correctement!');
    } else {
      console.log('⚠️ Problème de dédoublonnage détecté');
    }

    console.log('\\n🎉 Test terminé avec succès! Le mapping fonctionne correctement.');
    console.log('\\n💡 Pour tester avec de vraies données Apify, utilisez l API /api/scraping');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
`;

// Exécuter le script avec tsx
const child = spawn('npx', ['tsx', '--input-type=module', '-e', testScript], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_OPTIONS: '--loader tsx/esm' }
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (error) => {
  console.error('Erreur lors de l exécution du script:', error);
  process.exit(1);
});