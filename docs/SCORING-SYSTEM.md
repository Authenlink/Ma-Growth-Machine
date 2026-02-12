# Système de notation – Leads et Entreprises

Ce document décrit le système de notation (score 1-10) utilisé pour évaluer la complétude des données des leads et des entreprises. Il permet de modifier la notation lors de l’ajout de nouveaux scrapers ou critères.

---

## Fichiers du système

| Fichier | Rôle |
|---------|------|
| `lib/score-types.ts` | Constantes, catégories et helpers (1-3, 4-6, 7-10) |
| `lib/lead-scoring.ts` | Calcul du score des leads (expression SQL) |
| `lib/company-scoring.ts` | Calcul du score des entreprises (expression SQL) |
| `components/score-filter-dropdown.tsx` | Composant de filtre par catégorie de note |

---

## Catégories de filtrage

| Plage | Libellé |
|-------|---------|
| 1-3 | Faible |
| 4-6 | Moyen |
| 7-8 | Élevé |
| 9-10 | Excellent |

---

## Notation des leads (total 10 points)

| Critère | Points | Source / Table |
|---------|--------|----------------|
| Email présent | 2 | `leads.email` |
| Email vérifié | 1 | `leads.emailVerifyEmaillist` (EmailListVerify) |
| LinkedIn URL (personne) | 1 | `leads.linkedinUrl` |
| LinkedIn URL (entreprise) | 1 | `companies.linkedinUrl` (via `leads.companyId`) |
| Prénom | 0.5 | `leads.firstName` |
| Nom | 0.5 | `leads.lastName` |
| Position | 1 | `leads.position` |
| Entreprise associée | 1 | `leads.companyId` |
| Posts LinkedIn (personne) | 0.5 | table `lead_posts` |
| Posts LinkedIn (entreprise) | 0.5 | table `company_posts` via `companyId` |
| Analyse SEO (entreprise) | 0.5 | `companies.seoAnalyzedAt IS NOT NULL` |
| Avis Trustpilot (entreprise) | 0.5 | `EXISTS (trustpilot_reviews WHERE company_id = leads.company_id)` |

**Total : 10 points** (plafonné par `LEAST(10, ...)`)

---

## Notation des entreprises (total 10 points)

| Critère | Points | Source / Table |
|---------|--------|----------------|
| Nom | 1 | `companies.name` |
| LinkedIn URL | 2 | `companies.linkedinUrl` |
| Domaine | 2 | `companies.domain` |
| Website | 1 | `companies.website` |
| Analyse SEO | 2 | `companies.seoAnalyzedAt IS NOT NULL` |
| Avis Trustpilot | 1 | `EXISTS (trustpilot_reviews WHERE company_id = companies.id)` |
| Industrie | 0.5 | `companies.industry` |
| Taille / localisation | 0.5 | `companies.size`, `city`, `country` |

**Total : 10 points** (plafonné par `LEAST(10, ...)`)

---

## Comment ajouter un critère

### 1. Leads

1. Ouvrir `lib/lead-scoring.ts`.
2. Ajouter une expression dans `buildLeadScoreSqlExpression()` :

```ts
// Exemple : nouveau scraper "reviews" (ex: 1 point)
CASE WHEN EXISTS (SELECT 1 FROM reviews WHERE lead_id = ${leads.id}) THEN 1 ELSE 0 END +
```

3. Rééquilibrer les points pour garder un total ≤ 10 (réduire d’autres critères ou ajouter `LEAST(10, ...)`).
4. Mettre à jour ce document.

### 2. Entreprises

1. Ouvrir `lib/company-scoring.ts`.
2. Ajouter une expression dans `buildCompanyScoreSqlExpression()` :

```ts
// Exemple : nouveau scraper "reviews" (ex: 1 point)
CASE WHEN EXISTS (SELECT 1 FROM reviews WHERE company_id = ${companies.id}) THEN 1 ELSE 0 END +
```

3. Rééquilibrer les points pour garder un total ≤ 10.
4. Mettre à jour ce document.

### 3. Utiliser `entity_scraper_usages`

Si le nouveau scraper utilise `entity_scraper_usages` :

```ts
const hasNewSource = exists(
  db
    .select()
    .from(entityScraperUsages)
    .innerJoin(scrapers, eq(entityScraperUsages.scraperId, scrapers.id))
    .where(
      and(
        eq(entityScraperUsages.entityType, "lead"), // ou "company"
        eq(entityScraperUsages.entityId, leads.id), // ou companies.id
        eq(entityScraperUsages.hasResult, true),
        eq(entityScraperUsages.userId, userId),
        eq(scrapers.mapperType, "nouveau-mapper-type")
      )
    )
);

// Puis dans le score :
CASE WHEN ${hasNewSource} THEN 1 ELSE 0 END +
```

---

## Intégration dans les API

- **Leads** : `app/api/leads/route.ts` – paramètre `scoreCategory` (1-3, 4-6, 7-10)
- **Collections** : `app/api/collections/[id]/route.ts` – paramètre `scoreCategory`
- **Entreprises** : `app/api/companies/route.ts` – paramètre `scoreCategory`

---

## Pages utilisant le filtre

- **Leads** : `app/leads/page.tsx` – `LeadsFilters` avec `ScoreFilterDropdown`
- **Collection** : `app/leads/collections/[id]/page.tsx` – `LeadsFilters` avec `ScoreFilterDropdown`
- **Entreprises** : `app/companies/page.tsx` – `CompaniesFilters` avec `ScoreFilterDropdown`
