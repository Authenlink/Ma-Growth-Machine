# Plan détaillé : Tracking des dépenses Apify (scrapers)

> Document de référence pour l'implémentation du tracking des coûts lors de l'exécution des scrapers Apify.  
> **À ne pas exécuter automatiquement — à suivre manuellement lors de la prochaine session.**

---

## 1. Contexte et objectif

### 1.1 Ce que Apify fournit

Après une exécution, l'objet `Run` retourné par `apifyClient.run(runId).get()` contient :

| Champ | Type | Description |
|-------|------|-------------|
| `usageTotalUsd` | `number` | Coût total estimé du run en USD |
| `usageUsd` | objet | Ventilation par ressource (compute, proxy, storage, etc.) |
| `usage` | objet | Métriques brutes (compute units, dataset reads, etc.) |

**Important** : Ces montants sont **indicatifs** et calculés à la date de la requête. La facturation officielle (console Apify) fait foi, mais `usageTotalUsd` est suffisant pour un suivi interne.

### 1.2 Où sont exécutés les scrapers Apify

| Route / Service | Fichier | Contexte | Scraper (table `scrapers`) | Adapter |
|----------------|---------|----------|----------------------------|---------|
| **Scraping principal** | `app/api/scraping/route.ts` | Scraping leads → collection | Oui, `scraperId` requis | `getAdapter()` |
| **Enrichissement collection (posts)** | `app/api/collections/[id]/enrich/route.ts` | Posts LinkedIn par lead | Oui, `scraperId` | `getAdapter()` |
| **Enrichissement lead (posts)** | `app/api/leads/[id]/enrich/route.ts` | Posts LinkedIn d’un lead | Oui, `scraperId` | `getAdapter()` |
| **Enrichissement entreprise** | `app/api/companies/[id]/enrich/route.ts` | Employees/posts d’une company | Oui, `scraperId` | `getAdapter()` |
| **Enrichissement emails (collection)** | `app/api/collections/[id]/enrich-emails/route.ts` | Bulk email finder par collection | Oui, `scraperId` | `getAdapter()` |
| **Enrichissement emails (entreprise)** | `app/api/companies/[id]/enrich-emails/route.ts` | Bulk email finder par company | Oui, `scraperId` | `getAdapter()` |
| **Find email (lead)** | `app/api/leads/[id]/find-email/route.ts` | Recherche email d’un lead | Oui, scraper bulk-email-finder | `getAdapter()` |
| **Trustpilot** | `app/api/trustpilot-reviews/scrape/route.ts` | Avis Trustpilot | Non (hardcodé) | `runTrustpilotScraper()` utilise `apifyClient` directement |

**Points importants** :
- 7 routes utilisent l’adapter via `getAdapter()` → toutes basées sur Apify, ont un `scraperId`.
- La route Trustpilot **n’utilise pas** la table `scrapers` : actor ID `thewolves/trustpilot-reviews-scraper` en dur dans `lib/trustpilot-reviews-service.ts`. Pour tracer le coût, il faudra soit ajouter Trustpilot dans `scrapers`, soit gérer un cas spécial (ex. `scraperId` nullable + champ `source` = `trustpilot`).

---

## 2. Schéma de données : table `scraper_runs`

### 2.1 Nouvelle table

Créer une table `scraper_runs` pour enregistrer chaque exécution et son coût :

```sql
CREATE TABLE "scraper_runs" (
  "id" serial PRIMARY KEY,
  "run_id" text NOT NULL,                    -- ID Apify (ex: "abc123xyz")
  "scraper_id" integer REFERENCES scrapers(id) ON DELETE SET NULL,  -- NULL si Trustpilot
  "user_id" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Contexte de l'exécution
  "source" text,                             -- "scraping" | "enrich_collection" | "enrich_lead" | "enrich_company" | "enrich_emails_collection" | "enrich_emails_company" | "find_email" | "trustpilot"
  "collection_id" integer REFERENCES collections(id) ON DELETE SET NULL,
  "lead_id" integer REFERENCES leads(id) ON DELETE SET NULL,
  "company_id" integer REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Coûts et métriques
  "cost_usd" real,                           -- usageTotalUsd d'Apify (peut être NULL si run en cours ou échec avant récup)
  "usage_details" jsonb,                     -- usageUsd brut (optionnel, pour debug)
  "item_count" integer,                      -- Nombre de résultats (items.length)
  "status" text NOT NULL,                    -- SUCCEEDED | FAILED | ABORTED | TIMED-OUT
  
  -- Timestamps
  "started_at" timestamp,
  "finished_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX idx_scraper_runs_user_id ON scraper_runs(user_id);
CREATE INDEX idx_scraper_runs_scraper_id ON scraper_runs(scraper_id);
CREATE INDEX idx_scraper_runs_created_at ON scraper_runs(created_at DESC);
CREATE UNIQUE INDEX idx_scraper_runs_run_id ON scraper_runs(run_id);
```

### 2.2 Drizzle : schéma à ajouter dans `lib/schema.ts`

```ts
export const scraperRuns = pgTable(
  "scraper_runs",
  {
    id: serial("id").primaryKey(),
    runId: text("run_id").notNull(),
    scraperId: integer("scraper_id").references(() => scrapers.id, { onDelete: "set null" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    source: text("source"), // "scraping" | "enrich_collection" | ...
    collectionId: integer("collection_id").references(() => collections.id, { onDelete: "set null" }),
    leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
    companyId: integer("company_id").references(() => companies.id, { onDelete: "set null" }),

    costUsd: real("cost_usd"),
    usageDetails: jsonb("usage_details").$type<Record<string, unknown>>(),
    itemCount: integer("item_count"),
    status: text("status").notNull(),

    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_scraper_runs_user_id").on(table.userId),
    index("idx_scraper_runs_scraper_id").on(table.scraperId),
    index("idx_scraper_runs_created_at").on(table.createdAt),
    uniqueIndex("idx_scraper_runs_run_id").on(table.runId),
  ]
);
```

Penser à ajouter `index` et `uniqueIndex` dans les imports Drizzle si besoin.

---

## 3. Adapter Apify : récupérer le coût

### 3.1 Option retenue : méthode `getRunCost` sur l’adapter

Plutôt que de modifier l’interface `ScraperAdapter` (risque d’impacter des adapters non-Apify), tu peux :

1. **Option A** : Ajouter une méthode **optionnelle** `getRunCost?(runId: string): Promise<{ costUsd?: number; usageUsd?: object } | null>` dans l’interface, implémentée uniquement par `ApifyAdapter`.
2. **Option B** : Créer un helper `lib/apify-cost.ts` qui utilise `apifyClient` directement. Les routes appellent ce helper quand le provider est Apify.

**Recommandation** : Option B — plus simple, pas de modification de l’interface, et Trustpilot peut l’utiliser aussi.

### 3.2 Helper `lib/apify-cost.ts`

```ts
// lib/apify-cost.ts
import { apifyClient } from "@/lib/apify-client";

export interface ApifyRunCost {
  costUsd: number | null;
  usageUsd?: Record<string, number>;
  startedAt?: string;
  finishedAt?: string;
}

export async function getApifyRunCost(runId: string): Promise<ApifyRunCost | null> {
  try {
    const run = await apifyClient.run(runId).get();
    if (!run) return null;

    return {
      costUsd: run.usageTotalUsd ?? null,
      usageUsd: run.usageUsd as Record<string, number> | undefined,
      startedAt: run.startedAt?.toISOString(),
      finishedAt: run.finishedAt?.toISOString(),
    };
  } catch {
    return null;
  }
}
```

- Utiliser `getApifyRunCost(runId)` après chaque run Apify terminé.
- Pour Trustpilot : le service reçoit déjà le `runStatus` complet via `apifyClient.run(run.id).get()`. Soit modifier `runTrustpilotScraper` pour retourner aussi `usageTotalUsd`, soit appeler `getApifyRunCost(run.id)` dans la route Trustpilot après chaque appel.

---

## 4. Helper d’enregistrement `scraper_runs`

### 4.1 Fichier `lib/scraper-runs.ts`

Créer un module qui centralise l’insertion des runs :

```ts
// lib/scraper-runs.ts
import { db } from "@/lib/db";
import { scraperRuns } from "@/lib/schema";
import { getApifyRunCost } from "@/lib/apify-cost";

export type ScraperRunSource =
  | "scraping"
  | "enrich_collection"
  | "enrich_lead"
  | "enrich_company"
  | "enrich_emails_collection"
  | "enrich_emails_company"
  | "find_email"
  | "trustpilot";

export interface RecordScraperRunParams {
  runId: string;
  scraperId: number | null;
  userId: number;
  source: ScraperRunSource;
  collectionId?: number | null;
  leadId?: number | null;
  companyId?: number | null;
  itemCount: number;
  status: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  fetchCostFromApify?: boolean; // Si true, appelle getApifyRunCost pour compléter costUsd
}

export async function recordScraperRun(params: RecordScraperRunParams): Promise<void> {
  let costUsd: number | null = null;
  let usageDetails: Record<string, unknown> | undefined;
  let startedAt = params.startedAt;
  let finishedAt = params.finishedAt;

  if (params.fetchCostFromApify) {
    const cost = await getApifyRunCost(params.runId);
    if (cost) {
      costUsd = cost.costUsd ?? null;
      usageDetails = cost.usageUsd as Record<string, unknown> | undefined;
      if (cost.startedAt) startedAt = cost.startedAt;
      if (cost.finishedAt) finishedAt = cost.finishedAt;
    }
  }

  await db.insert(scraperRuns).values({
    runId: params.runId,
    scraperId: params.scraperId,
    userId: params.userId,
    source: params.source,
    collectionId: params.collectionId ?? null,
    leadId: params.leadId ?? null,
    companyId: params.companyId ?? null,
    costUsd,
    usageDetails,
    itemCount: params.itemCount,
    status: params.status,
    startedAt: startedAt ? new Date(startedAt) : null,
    finishedAt: finishedAt ? new Date(finishedAt) : null,
  });
}
```

- Gestion des doublons : `run_id` unique. En cas de conflit (ex. double appel), gérer l’erreur ou faire un `ON CONFLICT (run_id) DO UPDATE` si tu veux permettre une mise à jour (ex. coût récupéré plus tard).

---

## 5. Modifications des routes API

### 5.1 Ordre des modifications

1. `app/api/scraping/route.ts` (référentiel)
2. Autres routes enrich / find-email (même pattern)
3. `app/api/trustpilot-reviews/scrape/route.ts` et `lib/trustpilot-reviews-service.ts`

### 5.2 Pattern à appliquer (ex. `app/api/scraping/route.ts`)

**Point d’insertion** : juste avant le `return NextResponse.json({ success: true, ... })` (après mapping et métriques).

Étapes :

1. Importer `recordScraperRun`.
2. Appeler `recordScraperRun` avec les bons paramètres :

   - `runId`: `run.id`
   - `scraperId`: `scraperId` (depuis le body)
   - `userId`: `userId`
   - `source`: `"scraping"`
   - `collectionId`: `collectionId`
   - `leadId`: `undefined`
   - `companyId`: `companyId` si fourni
   - `itemCount`: `items.length`
   - `status`: `runStatus.status`
   - `startedAt` / `finishedAt`: depuis `runStatus` ou `getApifyRunCost` si besoin
   - `fetchCostFromApify`: `true` (car Apify)

3. Ne pas faire échouer la réponse si `recordScraperRun` échoue (ex. try/catch + log). Le succès du scraping ne doit pas dépendre de l’enregistrement du coût.

4. Optionnel : ajouter `costUsd` dans la réponse JSON si tu veux l’afficher immédiatement côté front.

### 5.3 Mapping source par route

| Route | `source` |
|-------|----------|
| `app/api/scraping/route.ts` | `"scraping"` |
| `app/api/collections/[id]/enrich/route.ts` | `"enrich_collection"` |
| `app/api/leads/[id]/enrich/route.ts` | `"enrich_lead"` |
| `app/api/companies/[id]/enrich/route.ts` | `"enrich_company"` |
| `app/api/collections/[id]/enrich-emails/route.ts` | `"enrich_emails_collection"` |
| `app/api/companies/[id]/enrich-emails/route.ts` | `"enrich_emails_company"` |
| `app/api/leads/[id]/find-email/route.ts` | `"find_email"` |
| `app/api/trustpilot-reviews/scrape/route.ts` | `"trustpilot"` |

### 5.4 Cas particuliers

#### Routes enrich (collection / lead / company) : boucles

Certaines routes exécutent **plusieurs runs** (ex. un par lead). Il faut appeler `recordScraperRun` **pour chaque run**, pas une seule fois à la fin.

Exemple pour `app/api/collections/[id]/enrich/route.ts` :
- La boucle `for (const lead of leadsToEnrich)` fait un `adapter.execute()` puis `getStatus()` / `getResults()`.
- Après chaque run réussi (ou échoué), appeler `recordScraperRun` avec le `run.id` de ce run, `leadId: lead.id`, etc.

#### Trustpilot : plusieurs runs + pas de scraperId

- Trustpilot : `runTrustpilotScraper` fait un `apifyClient.actor(...).call()` → un run par domaine.
- La route fait une boucle `for (let i = 0; i < toScrape.length; i++)` et appelle `runTrustpilotScraper` à chaque itération.
- Il faut que `runTrustpilotScraper` **retourne** au minimum `{ items, runId, usageTotalUsd? }` pour pouvoir enregistrer chaque run.
- `recordScraperRun` sera appelé avec `scraperId: null`, `source: "trustpilot"`, `companyId: cid`.

Modification de `lib/trustpilot-reviews-service.ts` :

- Retourner `{ items, runId, usageTotalUsd }` au lieu de `items` seul.
- À la fin du polling, `runStatus` contient `usageTotalUsd` ; le retourner dans l’objet.

---

## 6. Enregistrement aussi pour les runs en échec

Tu peux décider de n’enregistrer que les runs réussis, ou aussi les échoués (utile pour analyser les coûts même en cas d’erreur).

**Recommandation** : enregistrer tous les runs terminés (SUCCEEDED, FAILED, ABORTED, TIMED-OUT) pour avoir une vision complète. Le coût Apify peut être > 0 même en cas d’échec (compute consommé).

Points d’appel à adapter :

- Dans les routes qui retournent une erreur (ex. `runStatus.status !== "SUCCEEDED"`), appeler `recordScraperRun` juste avant le `return NextResponse.json({ error: ... })`.
- Passer `itemCount: 0` si pas de résultats, `status: runStatus.status`.

---

## 7. API de consultation des dépenses

### 7.1 Route GET `/api/scraper-runs` (ou `/api/scraping/spending`)

**Objectif** : Lister les runs et/ou agréger les dépenses pour l’utilisateur connecté.

Paramètres de requête proposés :

- `from` (date ISO)
- `to` (date ISO)
- `scraperId` (optionnel)
- `source` (optionnel)
- `limit` (défaut 50)
- `offset` (défaut 0)

Réponse type :

```json
{
  "runs": [
    {
      "id": 1,
      "runId": "abc123",
      "scraperId": 5,
      "scraperName": "Apify LinkedIn Scraper",
      "source": "scraping",
      "collectionId": 10,
      "costUsd": 0.45,
      "itemCount": 150,
      "status": "SUCCEEDED",
      "createdAt": "2025-02-10T14:30:00Z"
    }
  ],
  "summary": {
    "totalCostUsd": 12.34,
    "totalRuns": 28,
    "period": { "from": "2025-02-01", "to": "2025-02-10" }
  }
}
```

- Filtrer par `userId` (session).
- Faire les agrégations en SQL ou en JS selon le volume.

### 7.2 Route GET `/api/scraping/spending/summary` (optionnel)

Pour un dashboard simple : total par mois, par scraper, etc.

```json
{
  "byMonth": [
    { "month": "2025-02", "costUsd": 45.67, "runs": 120 }
  ],
  "byScraper": [
    { "scraperId": 5, "scraperName": "...", "costUsd": 30.2, "runs": 80 }
  ],
  "totalCostUsd": 45.67
}
```

---

## 8. Interface utilisateur (optionnel)

### 8.1 Emplacement possible

- Section "Paramètres" ou "Facturation" dans la sidebar.
- Ou sous-section dans une page existante (ex. scraping / scrapers).

### 8.2 Composants

1. **Page** `app/settings/spending/page.tsx` (ou `app/scraping/spending/page.tsx`)
   - Filtres : période, scraper, source.
   - Tableau des runs (runId, scraper, source, coût, résultats, date).
   - Résumé : total sur la période, évolution.

2. **Composant** `components/spending/scraper-runs-table.tsx`
   - Colonnes : Date, Scraper, Source, Coût (USD), Résultats, Statut.
   - Pagination.

3. **Widget** (optionnel) : petite carte dans le dashboard ou la sidebar avec le total du mois.

---

## 9. Migration Drizzle

### 9.1 Générer la migration

```bash
npx drizzle-kit generate
```

Cela créera un fichier dans `drizzle/` (ex. `0016_add_scraper_runs.sql`).

### 9.2 Vérifier le SQL

Contrôler que la migration contient bien :

- Création de la table `scraper_runs` avec toutes les colonnes.
- Index et contraintes.
- Aucun impact sur les tables existantes.

### 9.3 Exécuter

```bash
npx drizzle-kit migrate
```

Ou via ton script habituel.

---

## 10. Ordre d’implémentation recommandé

1. **Migration**  
   - Créer la table `scraper_runs` et le schéma Drizzle.  
   - Exécuter la migration.

2. **Helper Apify**  
   - `lib/apify-cost.ts` : `getApifyRunCost`.

3. **Helper d’enregistrement**  
   - `lib/scraper-runs.ts` : `recordScraperRun`.

4. **Route scraping**  
   - Intégrer `recordScraperRun` dans `app/api/scraping/route.ts` (succès + échec).

5. **Routes enrich**  
   - `app/api/collections/[id]/enrich/route.ts`  
   - `app/api/leads/[id]/enrich/route.ts`  
   - `app/api/companies/[id]/enrich/route.ts`  
   - `app/api/collections/[id]/enrich-emails/route.ts`  
   - `app/api/companies/[id]/enrich-emails/route.ts`  
   - `app/api/leads/[id]/find-email/route.ts`  
   Pour chacune : appeler `recordScraperRun` à chaque run (y compris en boucle).

6. **Trustpilot**  
   - Modifier `runTrustpilotScraper` pour retourner `runId` et `usageTotalUsd`.  
   - Adapter la route Trustpilot pour appeler `recordScraperRun` (avec `scraperId: null`, `source: "trustpilot"`).

7. **API de consultation**  
   - `GET /api/scraper-runs` (ou équivalent) avec filtres et agrégations.

8. **UI** (optionnel)  
   - Page de consultation des dépenses et éventuel widget.

---

## 11. Cas limites et pièges

### 11.1 Run non terminé ou timeout

Si le run est encore en cours ou timeout avant que tu aies le statut final :

- Tu peux quand même enregistrer avec `status: "TIMED-OUT"` ou `"RUNNING"` si tu le détectes.
- `costUsd` peut rester `null` ; Apify peut ne pas avoir encore calculé le coût.
- Option : job asynchrone qui, plus tard, rappelle `getApifyRunCost` et met à jour la ligne (si tu ajoutes un mécanisme de mise à jour).

### 11.2 Doublons

- Contrainte unique sur `run_id`.  
- Si la même route appelle deux fois `recordScraperRun` pour le même `runId`, la seconde insert échouera.  
- Gérer l’erreur sans faire échouer la réponse (log + ignoré).

### 11.3 Trustpilot : scraperId

- Trustpilot n’est pas dans `scrapers`.  
- Utiliser `scraperId: null` et `source: "trustpilot"`.  
- Si plus tard tu ajoutes Trustpilot dans `scrapers`, tu pourras lier les runs via `scraperId`.

### 11.4 Autres providers

- Si demain tu ajoutes un provider non-Apify, `recordScraperRun` peut être appelé sans `fetchCostFromApify` (ou avec `false`), et `costUsd` restera `null` sauf si tu as une autre source de coût.

---

## 12. Checklist finale

- [ ] Migration `scraper_runs` créée et exécutée  
- [ ] `lib/apify-cost.ts` implémenté  
- [ ] `lib/scraper-runs.ts` implémenté  
- [ ] `app/api/scraping/route.ts` modifié  
- [ ] `app/api/collections/[id]/enrich/route.ts` modifié  
- [ ] `app/api/leads/[id]/enrich/route.ts` modifié  
- [ ] `app/api/companies/[id]/enrich/route.ts` modifié  
- [ ] `app/api/collections/[id]/enrich-emails/route.ts` modifié  
- [ ] `app/api/companies/[id]/enrich-emails/route.ts` modifié  
- [ ] `app/api/leads/[id]/find-email/route.ts` modifié  
- [ ] `lib/trustpilot-reviews-service.ts` modifié (retour runId + cost)  
- [ ] `app/api/trustpilot-reviews/scrape/route.ts` modifié  
- [ ] API GET `/api/scraper-runs` créée  
- [ ] UI de consultation (optionnel)  
- [ ] Tests manuels : lancer un scraping, vérifier une ligne dans `scraper_runs` avec `cost_usd` renseigné  

---

*Document généré pour la session d’implémentation. Dernière mise à jour : 2025-02-11.*
