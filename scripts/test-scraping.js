#!/usr/bin/env node

/**
 * Script de test pour vérifier le mapping du scraper Apify
 */

const https = require('https');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_PARAMS = {
    "companyEmployeeSizeIncludes": [
        "21-50",
        "51-100"
    ],
    "companyIndustryIncludes": [
        "Banking",
        "Business Supplies & Equipment",
        "Commercial Real Estate",
        "E-Learning",
        "Education Management",
        "Events Services",
        "Financial Services",
        "Human Resources"
    ],
    "companyLocationCityIncludes": [
        "Marseille"
    ],
    "companyLocationCountryIncludes": [
        "France"
    ],
    "emailStatus": "verified",
    "hasEmail": true,
    "hasPhone": false,
    "includeSimilarTitles": false,
    "personLocationCityIncludes": [
        "Marseille"
    ],
    "personLocationCountryIncludes": [
        "France"
    ],
    "personTitleIncludes": [
        "Director",
        "General Manager",
        "Founder",
        "Manager",
        "Co-Founder",
        "Chief Financial Officer",
        "Director Of Marketing"
    ],
    "resetSavedProgress": false,
    "totalResults": 10 // Réduit pour le test
};

// Fonction pour faire des requêtes HTTP
function makeRequest(url, options = {}, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Fonction principale de test
async function testScraping() {
    console.log('🧪 Démarrage du test de scraping...\n');

    try {
        // 1. Vérifier que l'app est en cours d'exécution
        console.log('1️⃣ Vérification que l\'application tourne...');
        const healthCheck = await makeRequest(`${BASE_URL}/api/health`);
        if (healthCheck.status !== 200) {
            throw new Error('L\'application Next.js ne semble pas tourner. Lancez "npm run dev" d\'abord.');
        }
        console.log('✅ Application accessible\n');

        // 2. Récupérer la liste des scrapers
        console.log('2️⃣ Récupération des scrapers disponibles...');
        const scrapersResponse = await makeRequest(`${BASE_URL}/api/scrapers`);
        if (scrapersResponse.status !== 200) {
            throw new Error(`Erreur API scrapers: ${scrapersResponse.status} - ${JSON.stringify(scrapersResponse.data)}`);
        }

        const scrapers = scrapersResponse.data;
        console.log(`📋 Scrapers trouvés: ${scrapers.length}`);
        scrapers.forEach(s => console.log(`   - ${s.name} (ID: ${s.id})`));

        // Trouver le scraper Apify
        const apifyScraper = scrapers.find(s => s.provider === 'apify');
        if (!apifyScraper) {
            throw new Error('Scraper Apify non trouvé. Avez-vous lancé le seed ?');
        }
        console.log(`🎯 Scraper Apify trouvé: ${apifyScraper.name} (ID: ${apifyScraper.id})\n`);

        // 3. Créer une collection de test (via l'API si elle existe, sinon on suppose qu'il y en a une)
        console.log('3️⃣ Vérification des collections...');
        // Pour le test, on va supposer qu'il y a une collection avec ID 1
        // Dans un vrai test, on créerait une collection via l'API
        const testCollectionId = 1;
        console.log(`📁 Utilisation de la collection ID: ${testCollectionId}\n`);

        // 4. Lancer le scraping
        console.log('4️⃣ Lancement du scraping avec les paramètres de test...');
        console.log('📊 Paramètres:', JSON.stringify(TEST_PARAMS, null, 2));

        const scrapingPayload = {
            scraperId: apifyScraper.id,
            collectionId: testCollectionId,
            ...TEST_PARAMS
        };

        const scrapingResponse = await makeRequest(`${BASE_URL}/api/scraping`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, scrapingPayload);

        if (scrapingResponse.status !== 200) {
            console.error('❌ Erreur lors du scraping:', scrapingResponse.data);
            return;
        }

        const result = scrapingResponse.data;
        console.log('✅ Scraping lancé avec succès!');
        console.log(`🔄 Run ID: ${result.runId}`);
        console.log(`📈 Résultats: ${result.metrics.totalFound} trouvés, ${result.metrics.created} créés, ${result.metrics.skipped} ignorés, ${result.metrics.errors} erreurs`);
        console.log(`⏱️ Durée: ${result.duration}s\n`);

        // 5. Vérification du statut du run (optionnel)
        if (result.runId) {
            console.log('5️⃣ Vérification du statut du run...');
            const statusResponse = await makeRequest(`${BASE_URL}/api/scraping/status/${result.runId}`);
            if (statusResponse.status === 200) {
                console.log(`📊 Statut final: ${statusResponse.data.status}`);
            }
        }

        console.log('\n🎉 Test terminé! Vérifiez la base de données pour voir les leads créés.');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        process.exit(1);
    }
}

// Lancer le test
if (require.main === module) {
    testScraping();
}