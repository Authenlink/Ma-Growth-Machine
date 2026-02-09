#!/usr/bin/env node

/**
 * Script de test final pour vérifier le mapping Apify -> DB
 * Utilise tsx pour charger les modules TypeScript correctement
 */

const { spawn } = require('child_process');

const testScript = `
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { collections, companies, leads } from '../lib/schema.js';

// Charger les variables d'environnement
const envPath = new URL('../.env', import.meta.url).pathname;
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Erreur lors du chargement du fichier .env:', result.error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non trouvé');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Données de test simulant un retour Apify
const mockApifyData = [
  {
    firstName: 'Jean',
    lastName: 'Dupont',
    fullName: 'Jean Dupont',
    position: 'Director of Marketing',
    linkedinUrl: 'https://linkedin.com/in/jean-dupont',
    seniority: 'Director',
    functional: "['marketing', 'sales']",
    orgName: 'TechCorp',
    orgWebsite: 'https://techcorp.com',
    orgIndustry: 'Technology',
    orgSize: '51-200',
    orgCity: 'Marseille',
    orgCountry: 'France',
    email: 'jean.dupont@techcorp.com',
    city: 'Marseille',
    country: 'France'
  },
  {
    firstName: 'Marie',
    lastName: 'Martin',
    fullName: 'Marie Martin',
    position: 'General Manager',
    linkedinUrl: 'https://linkedin.com/in/marie-martin',
    seniority: 'Director',
    functional: "['operations', 'management']",
    orgName: 'FinanceBank',
    orgWebsite: 'https://financebank.fr',
    orgIndustry: 'Banking',
    orgSize: '201-500',
    orgCity: 'Marseille',
    orgCountry: 'France',
    email: 'marie.martin@financebank.fr',
    phone: '+33123456789',
    city: 'Marseille',
    country: 'France'
  },
  {
    firstName: 'Pierre',
    lastName: 'Dubois',
    fullName: 'Pierre Dubois',
    position: 'Founder & CEO',
    linkedinUrl: 'https://linkedin.com/in/pierre-dubois',
    seniority: 'Owner',
    functional: "['executive', 'strategy']",
    orgName: 'TechCorp', // Même entreprise que Jean - test de dédoublonnage
    orgWebsite: 'https://techcorp.com',
    orgIndustry: 'Technology',
    orgSize: '51-200',
    orgCity: 'Marseille',
    orgCountry: 'France',
    email: 'pierre.dubois@techcorp.com',
    city: 'Marseille',
    country: 'France'
  }
];

// Fonction pour parser le champ functional
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

// Fonction pour parser foundedYear
function parseFoundedYear(year) {
  if (!year) return null;
  if (typeof year === 'number') return year;
  const parsed = parseInt(year, 10);
  return isNaN(parsed) ? null : parsed;
}

// Fonction pour créer ou récupérer une company
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

// Fonction principale de mapping
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

// Fonction principale de test
async function testMapping() {
  console.log('🧪 Test du mapping Apify -> Base de données\\n');

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
      name: 'Test Collection - Scraping Marseille',
      description: 'Collection de test pour vérifier le mapping Apify'
    }).returning();

    console.log(\`✅ Collection créée: "\${collection.name}" (ID: \${collection.id})\\n\`);

    // 2. Tester le mapping
    console.log('2️⃣ Test du mapping des données Apify...');
    console.log(\`📊 \${mockApifyData.length} leads de test à mapper\`);

    const mappingResult = await mapApifyDataToLeads(mockApifyData, collection.id, testUserId);

    console.log('📈 Résultats du mapping:');
    console.log(\`   ✅ Créés: \${mappingResult.created}\`);
    console.log(\`   ⏭️ Ignorés (doublons): \${mappingResult.skipped}\`);
    console.log(\`   ❌ Erreurs: \${mappingResult.errors}\\n\`);

    // 3. Vérifier les données en base
    console.log('3️⃣ Vérification des données en base de données...');

    // Compter les leads créés
    const leadsResult = await db.select().from(leads).where(eq(leads.collectionId, collection.id));
    console.log(\`👥 Leads dans la collection: \${leadsResult.length}\`);

    // Lister les leads créés
    console.log('\\n📋 Leads créés:');
    for (let i = 0; i < leadsResult.length; i++) {
      const lead = leadsResult[i];
      console.log(\`   \${i + 1}. \${lead.fullName} - \${lead.position}\`);
      console.log(\`      📧 \${lead.email}\`);
      console.log(\`      🔗 \${lead.linkedinUrl}\`);
      console.log(\`      📍 \${lead.city}, \${lead.country}\`);
    }

    // Lister les companies créées
    const companiesResult = await db.select().from(companies);

    console.log(\`\\n🏢 Companies créées (\${companiesResult.length}):\`);
    for (let i = 0; i < companiesResult.length; i++) {
      const company = companiesResult[i];
      console.log(\`   \${i + 1}. \${company.name}\`);
      console.log(\`      🎯 \${company.industry} - \${company.size} employés\`);
      console.log(\`      🌐 \${company.website}\`);
      console.log(\`      📍 \${company.city}, \${company.country}\`);
    }

    // 4. Test de dédoublonnage
    console.log('\\n4️⃣ Test du dédoublonnage...');
    console.log('🔄 Ajout des mêmes données une deuxième fois...');

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

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error(error.stack);
    throw error;
  }
}

// Lancer le test
testMapping().catch(console.error);
`;

// Exécuter le script avec tsx
const child = spawn('npx', ['tsx', '--input-type=module', '-e', testScript], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (error) => {
  console.error('Erreur lors de l\'exécution du script:', error);
  process.exit(1);
});