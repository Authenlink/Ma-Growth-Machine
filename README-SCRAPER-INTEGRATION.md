# Guide d'Intégration des Scrapers Apify

Ce document explique comment ajouter un nouveau scraper Apify à l'application Growth Machine.

## Architecture Générale

L'application utilise un système modulaire pour l'intégration des scrapers :

- **Adapter Pattern** : Chaque scraper utilise un adapter qui implémente l'interface `ScraperAdapter`
- **Configuration centralisée** : Les scrapers sont configurés dans la base de données via le système de seed
- **Mapping automatique** : Les données brutes sont automatiquement mappées vers le schéma de leads/companies
- **Routes API** : Des routes standardisées pour lancer et suivre les scrapings

## Types de Scrapers Supportés

### 1. Scraping de Leads en Batch
- **Route** : `POST /api/scraping`
- **Usage** : Récupération massive de leads avec filtres avancés
- **Input** : Paramètres de recherche (titres, localisations, entreprises, etc.)
- **Output** : Array de leads avec informations complètes

### 2. Enrichissement d'un Lead Individuel
- **Route** : `POST /api/leads/[id]/enrich` (à créer)
- **Usage** : Enrichissement des données d'un lead existant
- **Input** : ID du lead + paramètres d'enrichissement
- **Output** : Lead enrichi avec nouvelles informations

## MCP Server Apify

L'application peut bénéficier du **MCP Server Apify** officiel qui facilite grandement l'intégration :

### Avantages du MCP Server
- **Découverte automatique** : Accès à tous les Actors Apify disponibles
- **Documentation intégrée** : Accès direct à la doc des scrapers
- **Inputs/Outputs standardisés** : Interface uniforme pour tous les scrapers
- **Authentification sécurisée** : Gestion automatique des tokens API

### Configuration du MCP Server
```json
// .cursor/mcp.json
{
  "mcpServers": {
    "apify": {
      "url": "https://mcp.apify.com"
    }
  }
}
```

### Utilisation du MCP Server
Une fois configuré, vous pouvez interroger le MCP server pour :
- Lister les Actors disponibles : `apify_list_actors`
- Obtenir les inputs attendus : `apify_get_actor_input_schema`
- Obtenir les outputs produits : `apify_get_actor_output_schema`
- Tester un scraper : `apify_run_actor`

## Étapes d'Intégration d'un Nouveau Scraper

### 1. Analyse du Scraper Apify

Utilisez le MCP server ou l'API Apify pour analyser le scraper :

```bash
# Via API Apify (sans MCP)
curl "https://api.apify.com/v2/acts/{actorId}/input-schema" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl "https://api.apify.com/v2/acts/{actorId}/output-schema" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Création de l'Adapter

Créez un nouvel adapter dans `lib/scrapers/adapters/` :

```typescript
// lib/scrapers/adapters/new-scraper-adapter.ts
import { ScraperAdapter, ScraperRun, ScraperStatus, MappingResult } from './base-adapter';

export interface NewScraperConfig {
  actorId: string;
  // Configuration spécifique
}

export class NewScraperAdapter implements ScraperAdapter {
  constructor(private config: NewScraperConfig) {}

  async execute(params: Record<string, unknown>): Promise<ScraperRun> {
    // Logique d'exécution du scraper
  }

  async getStatus(runId: string): Promise<ScraperStatus> {
    // Logique de récupération du statut
  }

  async getResults(runId: string): Promise<unknown[]> {
    // Logique de récupération des résultats
  }

  async mapToLeads(data: unknown[], collectionId: number, userId: number): Promise<MappingResult> {
    // Logique de mapping vers les leads
  }
}
```

### 3. Configuration du Mapper

Créez un mapper spécifique dans `lib/` :

```typescript
// lib/new-scraper-mapper.ts
export interface NewScraperLeadData {
  // Structure des données brutes du scraper
}

export async function mapNewScraperDataToLeads(
  data: NewScraperLeadData[],
  collectionId: number,
  userId: number
): Promise<MappingResult> {
  // Logique de mapping et sauvegarde en DB
}
```

### 4. Mise à Jour de l'Adapter Factory

Ajoutez le nouveau mapper dans `lib/scrapers/adapter-factory.ts` :

```typescript
export function getAdapter(mapperType: string, config: Record<string, unknown>): ScraperAdapter {
  switch (mapperType) {
    case 'apify':
      return new ApifyAdapter(config as ApifyProviderConfig);
    case 'new-scraper':
      return new NewScraperAdapter(config as NewScraperConfig);
    // ...
  }
}
```

### 5. Configuration du Formulaire

Définissez la configuration du formulaire dans `scripts/seed-scrapers.ts` :

```typescript
const newScraperFormConfig = {
  fields: [
    // Champs du formulaire pour les paramètres du scraper
  ],
  sections: [
    // Organisation des sections du formulaire
  ]
};
```

### 6. Seed du Scraper

Ajoutez l'insertion/mise à jour dans la fonction `seedScrapers()` :

```typescript
await db.insert(scrapers).values({
  name: "Nom du Nouveau Scraper",
  description: "Description détaillée",
  provider: "apify",
  providerConfig: {
    actorId: "votre-actor-id",
  },
  formConfig: newScraperFormConfig,
  mapperType: "new-scraper",
  isActive: true,
});
```

## Routes API à Implémenter

### Route d'Enrichissement Individuel

```typescript
// app/api/leads/[id]/enrich/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authentification
  // 2. Validation des droits sur le lead
  // 3. Récupération des données actuelles du lead
  // 4. Exécution du scraper d'enrichissement
  // 5. Mapping et mise à jour des données
  // 6. Mise à jour du statut du lead
}
```

### Points d'Attention pour l'Enrichissement

- **Gestion des conflits** : Que faire si des données existent déjà ?
- **Statut du lead** : Comment mettre à jour le statut (enrichi, validé, etc.) ?
- **Historique** : Faut-il garder un historique des enrichissements ?
- **Rate limiting** : Gestion des limites d'API Apify

## Structure des Données

### Input Standard (depuis le Lead)

Pour l'enrichissement d'un lead existant, les inputs peuvent être :
- `fullName` : Nom complet
- `firstName` + `lastName` : Prénom et nom
- `position` : Poste actuel
- `companyName` : Nom de l'entreprise
- `linkedinUrl` : URL LinkedIn
- `email` : Email connu
- `city`, `state`, `country` : Localisation

### Output Standard

Le scraper doit retourner des données mappables vers :
- **Informations personnelles enrichies** : téléphone, email additionnel, réseaux sociaux
- **Informations professionnelles** : nouveaux postes, expériences
- **Informations entreprise** : taille, secteur, description enrichie
- **Intent data** : signaux d'intention d'achat, comportement

### Mapping en Base de Données

```sql
-- Leads enrichis
UPDATE leads SET
  phoneNumbers = array_cat(phoneNumbers, $newPhones),
  personalEmail = COALESCE(personalEmail, $newEmail),
  linkedinUrl = COALESCE(linkedinUrl, $newLinkedinUrl),
  status = 'enriched',
  updatedAt = NOW()
WHERE id = $leadId;

-- Companies enrichies
UPDATE companies SET
  size = COALESCE(size, $newSize),
  industry = COALESCE(industry, $newIndustry),
  description = COALESCE(description, $newDescription),
  updatedAt = NOW()
WHERE id = $companyId;
```

## Gestion des Statuts

### Statuts de Lead
- `raw` : Lead créé par scraping initial
- `enriched` : Lead enrichi avec données supplémentaires
- `validated` : Lead validé manuellement
- `qualified` : Lead qualifié pour campagne
- `contacted` : Lead contacté

### Mise à Jour Automatique des Statuts

Après enrichissement réussi :
```typescript
await db.update(leads)
  .set({
    status: 'enriched',
    validated: true, // ou false selon la qualité des données
    updatedAt: new Date()
  })
  .where(eq(leads.id, leadId));
```

## Tests et Validation

### Tests Unitaires
- Test des adapters
- Test des mappers
- Test de validation des inputs/outputs

### Tests d'Intégration
- Test end-to-end d'un scraping complet
- Test d'enrichissement d'un lead
- Test de gestion d'erreurs

## Bonnes Pratiques

1. **Validation des Inputs** : Toujours valider les paramètres avant exécution
2. **Gestion d'Erreurs** : Catch et log toutes les erreurs avec contexte
3. **Rate Limiting** : Respecter les limites d'API Apify
4. **Dédoublonnage** : Éviter les doublons lors du mapping
5. **Logging** : Log détaillé pour debug et monitoring
6. **Types TypeScript** : Typage strict pour éviter les erreurs
7. **Documentation** : Documenter les spécificités de chaque scraper

## Exemple Complet : Scraper d'Enrichissement LinkedIn

Voici un exemple concret pour un scraper qui enrichit les données LinkedIn :

```typescript
// Configuration
const linkedinEnrichmentConfig = {
  actorId: "apify/linkedin-profile-scraper",
  formConfig: {
    fields: [
      {
        id: "maxRetries",
        type: "number" as const,
        label: "Nombre maximum de tentatives",
        defaultValue: 3
      }
    ]
  }
};

// Adapter
export class LinkedInEnrichmentAdapter extends ApifyAdapter {
  async execute(params: Record<string, unknown>): Promise<ScraperRun> {
    // Personnalisation pour l'enrichissement
    const input = {
      urls: [params.linkedinUrl],
      maxRetries: params.maxRetries || 3
    };

    return super.execute(input);
  }
}
```

## Checklist d'Intégration

- [ ] Analyse des inputs/outputs du scraper Apify
- [ ] Création de l'adapter spécifique
- [ ] Implémentation du mapper de données
- [ ] Configuration du formulaire
- [ ] Mise à jour du seed
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Documentation mise à jour
- [ ] Déploiement et validation en production