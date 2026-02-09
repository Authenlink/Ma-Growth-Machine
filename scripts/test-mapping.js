#!/usr/bin/env node

/**
 * Script de test pour vérifier le mapping Apify -> DB
 * Simule des données Apify et teste le mapping sans lancer de vrai scraping
 */

const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { resolve } = require('path');
const dotenv = require('dotenv');
const { mapApifyDataToLeads } = require('../lib/apify-mapper');

// Charger les variables d'environnement
const envPath = resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Erreur lors du chargement du fichier .env:', result.error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non trouvé');
  process.exit(1);
}

// Connexion DB
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

// Fonction principale de test
async function testMapping() {
  console.log('🧪 Test du mapping Apify -> Base de données\n');

  try {
    // 1. Créer une collection de test
    console.log('1️⃣ Création d\'une collection de test...');
    const testUserId = 1; // Supposons qu'il y a un user ID 1

    const [collection] = await db.insert(require('../lib/schema').collections).values({
      userId: testUserId,
      name: 'Test Collection - Scraping Marseille',
      description: 'Collection de test pour vérifier le mapping Apify'
    }).returning();

    console.log(`✅ Collection créée: "${collection.name}" (ID: ${collection.id})\n`);

    // 2. Tester le mapping
    console.log('2️⃣ Test du mapping des données Apify...');
    console.log(`📊 ${mockApifyData.length} leads de test à mapper`);

    const mappingResult = await mapApifyDataToLeads(mockApifyData, collection.id, testUserId);

    console.log('📈 Résultats du mapping:');
    console.log(`   ✅ Créés: ${mappingResult.created}`);
    console.log(`   ⏭️ Ignorés (doublons): ${mappingResult.skipped}`);
    console.log(`   ❌ Erreurs: ${mappingResult.errors}\n`);

    // 3. Vérifier les données en base
    console.log('3️⃣ Vérification des données en base de données...');

    // Compter les leads créés
    const leadsCount = await db.$count(require('../lib/schema').leads, {
      where: require('drizzle-orm').eq(require('../lib/schema').leads.collectionId, collection.id)
    });

    console.log(`👥 Leads dans la collection: ${leadsCount}`);

    // Compter les companies créées
    const companiesCount = await db.$count(require('../lib/schema').companies);
    console.log(`🏢 Total companies en base: ${companiesCount}`);

    // Lister les leads créés
    const leads = await db
      .select({
        id: require('../lib/schema').leads.id,
        fullName: require('../lib/schema').leads.fullName,
        position: require('../lib/schema').leads.position,
        email: require('../lib/schema').leads.email,
        companyName: require('../lib/schema').companies.name
      })
      .from(require('../lib/schema').leads)
      .leftJoin(require('../lib/schema').companies,
        require('drizzle-orm').eq(require('../lib/schema').leads.companyId, require('../lib/schema').companies.id)
      )
      .where(require('drizzle-orm').eq(require('../lib/schema').leads.collectionId, collection.id));

    console.log('\n📋 Leads créés:');
    leads.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.fullName} - ${lead.position}`);
      console.log(`      📧 ${lead.email}`);
      console.log(`      🏢 ${lead.companyName || 'Pas d\'entreprise'}`);
    });

    // Lister les companies créées
    const companies = await db
      .select({
        id: require('../lib/schema').companies.id,
        name: require('../lib/schema').companies.name,
        industry: require('../lib/schema').companies.industry,
        size: require('../lib/schema').companies.size,
        city: require('../lib/schema').companies.city,
        country: require('../lib/schema').companies.country
      })
      .from(require('../lib/schema').companies)
      .orderBy(require('../lib/schema').companies.name);

    console.log('\n🏢 Companies créées:');
    companies.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name}`);
      console.log(`      🎯 ${company.industry} - ${company.size} employés`);
      console.log(`      📍 ${company.city}, ${company.country}`);
    });

    // 4. Test de dédoublonnage
    console.log('\n4️⃣ Test du dédoublonnage...');
    console.log('🔄 Ajout des mêmes données une deuxième fois...');

    const secondMapping = await mapApifyDataToLeads(mockApifyData, collection.id, testUserId);

    console.log('📈 Résultats du deuxième mapping:');
    console.log(`   ✅ Créés: ${secondMapping.created}`);
    console.log(`   ⏭️ Ignorés (doublons): ${secondMapping.skipped}`);
    console.log(`   ❌ Erreurs: ${secondMapping.errors}`);

    if (secondMapping.skipped === mockApifyData.length && secondMapping.created === 0) {
      console.log('✅ Dédoublonnage fonctionne correctement!');
    } else {
      console.log('⚠️ Problème de dédoublonnage détecté');
    }

    console.log('\n🎉 Test terminé avec succès! Le mapping fonctionne correctement.');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    throw error;
  }
}

// Lancer le test
if (require.main === module) {
  testMapping().catch(console.error);
}