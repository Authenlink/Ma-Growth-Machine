# Prompt : Enrichir le Dashboard avec les dépenses Apify

> Document récapitulatif pour une prochaine session d'implémentation.

---

## 1. Contexte : ce qui a été fait (session précédente)

### 1.1 Tracking des coûts Apify

Un système complet de tracking des dépenses Apify a été mis en place :

**Schéma de données :**
- Table `scraper_runs` dans [`lib/schema.ts`](lib/schema.ts) : enregistre chaque exécution de scraper avec `runId`, `scraperId`, `userId`, `source`, `costUsd`, `usageDetails`, `itemCount`, `status`, `createdAt`, etc.
- Fichiers clés : [`lib/apify-cost.ts`](lib/apify-cost.ts) (récupère `usageTotalUsd` via l'API Apify), [`lib/scraper-runs.ts`](lib/scraper-runs.ts) (fonction `recordScraperRun`).

**Routes modifiées (8 au total) :**
Toutes les routes qui exécutent des scrapers Apify appellent `recordScraperRun` après chaque run (succès ou échec) :
- `app/api/scraping/route.ts`
- `app/api/collections/[id]/enrich/route.ts`
- `app/api/leads/[id]/enrich/route.ts`
- `app/api/companies/[id]/enrich/route.ts`
- `app/api/collections/[id]/enrich-emails/route.ts`
- `app/api/companies/[id]/enrich-emails/route.ts`
- `app/api/leads/[id]/find-email/route.ts`
- `app/api/trustpilot-reviews/scrape/route.ts` (+ modification de `lib/trustpilot-reviews-service.ts`)

**API de consultation :**
- `GET /api/scraper-runs` : liste les runs avec filtres (`from`, `to`, `scraperId`, `source`, `limit`, `offset`) et agrégation (`totalCostUsd`, `totalRuns`).
- `POST /api/scraper-runs/backfill?days=90&reset=1` : importe les runs Apify du dernier mois/trimestre (profil utilisateur).

**Source `"import"` :** Les runs importés via le backfill ont `source: "import"`. La fonction `resetImportedScraperRuns` permet de les supprimer pour ré-importer.

---

## 2. Ce qu'il faut implémenter

### 2.1 KPI "Total dépensé" avec filtre déroulant

**Emplacement :** Dans la section KPIs du dashboard ([`app/dashboard/page.tsx`](app/dashboard/page.tsx)), ajouter une 5e carte (ou remplacer/ajuster une carte existante).

**Contenu :**
- Titre : "Total dépensé"
- Valeur : montant en USD (ex. `12.45 $`)
- Filtre déroulant (Select) avec 4 options :
  - **Jour** : dépenses du jour même (créated_at = aujourd'hui)
  - **Dernière semaine** : somme des `cost_usd` des 7 derniers jours
  - **Dernier mois** : somme des 30 derniers jours
  - **Tous** : somme totale depuis le début

**API :** Créer ou étendre une route pour retourner le total filtré. Par exemple :
- `GET /api/scraper-runs/summary?period=day|week|month|all` qui retourne `{ totalCostUsd, totalRuns }` pour l'utilisateur connecté.

### 2.2 Graphique "Coûts dépensés par jour"

**Emplacement :** Nouvelle carte sous le graphique "Évolution des ajouts" (ou à côté, selon le layout).

**Comportement :**
- Même pattern que le graphique "Évolution des ajouts" : `Select` pour la période avec 3 options (7 jours, 30 jours, 90 jours).
- Données : coût total par jour (agrégation de `cost_usd` par `DATE(created_at)` depuis `scraper_runs`).
- Format du graphique : AreaChart (comme l'existant) ou BarChart, avec l'axe X = dates, axe Y = coût en USD.
- Afficher également le **nombre d'exécutions** : soit dans la légende/tooltip, soit en sous-titre (ex. "X exécutions sur la période").

**API :** Créer une route dédiée, par exemple :
- `GET /api/dashboard/spending-chart?timeRange=7d|30d|90d`
- Réponse : tableau `[{ date: "2025-02-01", costUsd: 1.23, runs: 5 }, ...]` avec une entrée par jour (même les jours à 0, pour continuité du graphique).

### 2.3 Références techniques

**Dashboard actuel :**
- [`app/dashboard/page.tsx`](app/dashboard/page.tsx) : 4 KPIs (Leads, Companies, Collections, Campaigns) + graphique "Évolution des ajouts" avec `timeRange` (7d, 30d, 90d).
- [`app/api/dashboard/chart/route.ts`](app/api/dashboard/chart/route.ts) : requêtes SQL brutes via `neon()`, agrégation par `DATE(created_at)`, génération de toutes les dates pour éviter les trous.
- [`app/api/dashboard/stats/route.ts`](app/api/dashboard/stats/route.ts) : KPIs via Drizzle.

**Table scraper_runs :**
- Colonnes pertinentes : `user_id`, `cost_usd`, `created_at`.
- Filtrer par `user_id` = session utilisateur.

### 2.4 Récapitulatif des tâches

1. Créer `GET /api/scraper-runs/summary` (ou `/api/dashboard/spending-stats`) avec paramètre `period=day|week|month|all` → `{ totalCostUsd, totalRuns }`.
2. Créer `GET /api/dashboard/spending-chart?timeRange=7d|30d|90d` → tableau `{ date, costUsd, runs }[]`.
3. Ajouter la carte KPI "Total dépensé" avec Select (jour, semaine, mois, tous) dans le dashboard.
4. Ajouter le graphique "Coûts dépensés par jour" avec Select (7j, 30j, 90j) et affichage du nombre d'exécutions.
5. Utiliser le même style que le graphique existant (ChartContainer, AreaChart, gradients, tooltips, etc.).

---

*Document généré pour la session d'implémentation. Dernière mise à jour : 2025-02-11.*
