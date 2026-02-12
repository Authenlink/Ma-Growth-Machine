import OpenAI from "openai";
import { apifyClient } from "@/lib/apify-client";
import { calculateOpenAICost, OpenAIUsage } from "@/lib/openai-cost";
import { getApifyRunCost } from "@/lib/apify-cost";

const GOOGLE_SEARCH_ACTOR_ID = "apify/google-search-scraper";
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_PAGES_PER_QUERY = 2; // ~20 résultats par requête
const DELAY_BETWEEN_APIFY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CompanyContext {
  companyName: string;
  industry: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
}

export interface QueryTestResult {
  keyword: string;
  position: number | null;
  found: boolean;
}

export interface SeoAnalysisResult {
  seo_score: "Bon" | "Moyen" | "Faible";
  avg_position: number;
  queries_tested: QueryTestResult[];
  verdict: string;
  opportunity: string;
  cost: {
    tokens_used: number;
    estimated_cost_usd: number;
    apify_cost_usd?: number;
  };
}

export interface SeoLocalResult {
  company: string;
  location: string;
  industry: string;
  leadId?: number;
  companyId?: number;
  analysis: SeoAnalysisResult;
  cost: { tokens_used: number; estimated_cost_usd: number };
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquant dans les variables d'environnement");
  }
  return new OpenAI({ apiKey });
}

async function generateSearchQueries(
  context: CompanyContext
): Promise<{ queries: string[]; usage: OpenAIUsage }> {
  const openai = getOpenAIClient();
  const location = [context.city, context.state, context.country]
    .filter(Boolean)
    .join(", ") || "zone locale";

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: `Tu es un expert SEO local. Génère 3 à 5 requêtes de recherche Google. Réponds UNIQUEMENT par un JSON: {"queries": ["req1", "req2", ...]}`,
      },
      {
        role: "user",
        content: `Entreprise: ${context.companyName}
Industrie: ${context.industry || "non spécifiée"}
Description: ${context.description || "non spécifiée"}
Localisation: ${location}

Génère 3 à 5 requêtes. JSON: {"queries": ["req1", "req2", ...]}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const usage: OpenAIUsage = {
    prompt_tokens: response.usage?.prompt_tokens ?? 0,
    completion_tokens: response.usage?.completion_tokens ?? 0,
    total_tokens: response.usage?.total_tokens ?? 0,
  };

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { queries: [`${context.companyName} ${location}`], usage };
  }

  let parsed: { queries?: string[] } | string[];
  try {
    parsed = JSON.parse(content) as { queries?: string[] } | string[];
  } catch {
    const match = content.match(/\[[\s\S]*?\]/);
    if (match) {
      parsed = JSON.parse(match[0]) as string[];
    } else {
      return { queries: [`${context.companyName} ${location}`], usage };
    }
  }

  const queries = Array.isArray(parsed) ? parsed : parsed.queries ?? [];
  const valid = queries
    .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
    .slice(0, 5);
  return {
    queries: valid.length > 0 ? valid : [`${context.companyName} ${location}`],
    usage,
  };
}

interface OrganicResult {
  title?: string;
  url?: string;
  displayedUrl?: string;
  description?: string;
  position?: number;
}

async function runGoogleSearch(
  query: string,
  countryCode: string = "fr",
  languageCode: string = "fr"
): Promise<{ results: OrganicResult[]; runId: string }> {
  const input = {
    queries: query,
    countryCode: countryCode.toLowerCase(),
    languageCode: languageCode.toLowerCase(),
    maxPagesPerQuery: MAX_PAGES_PER_QUERY,
    mobileResults: false,
  };

  const run = await apifyClient.actor(GOOGLE_SEARCH_ACTOR_ID).call(input);
  const runStatus = await apifyClient.run(run.id).get();
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes
  while (
    runStatus &&
    !["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(runStatus.status) &&
    attempts < maxAttempts
  ) {
    await sleep(2000);
    const updated = await apifyClient.run(run.id).get();
    if (!updated) break;
    Object.assign(runStatus, updated);
    attempts++;
  }

  if (runStatus?.status !== "SUCCEEDED") {
    throw new Error(`Apify Google Search failed: ${runStatus?.status}`);
  }

  if (!runStatus.defaultDatasetId) {
    return { results: [], runId: run.id };
  }

  const { items } = await apifyClient
    .dataset(runStatus.defaultDatasetId)
    .listItems();

  const organicResults: OrganicResult[] = [];
  for (const item of items as Record<string, unknown>[]) {
    const organic = (item.organicResults as OrganicResult[]) ?? [];
    organicResults.push(...organic);
  }

  return { results: organicResults, runId: run.id };
}

function findCompanyInResults(
  results: OrganicResult[],
  companyName: string,
  website: string | null
): { position: number; found: boolean } {
  const nameLower = companyName.toLowerCase();
  const websiteLower = website?.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const title = (r.title ?? "").toLowerCase();
    const displayedUrl = (r.displayedUrl ?? r.url ?? "").toLowerCase();
    const desc = (r.description ?? "").toLowerCase();
    const url = (r.url ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

    const matchName = title.includes(nameLower) || desc.includes(nameLower);
    const matchDomain =
      websiteLower &&
      (displayedUrl.includes(websiteLower) ||
        url.includes(websiteLower) ||
        displayedUrl.includes(websiteLower.split(".")[0] ?? ""));

    if (matchName || matchDomain) {
      return { position: i + 1, found: true };
    }
  }
  return { position: 0, found: false };
}

function computeScore(
  queriesTested: QueryTestResult[],
  companyName: string,
  website: string | null
): { seo_score: "Bon" | "Moyen" | "Faible"; avg_position: number } {
  const found = queriesTested.filter((q) => q.found);
  if (found.length === 0) {
    return { seo_score: "Faible", avg_position: 0 };
  }
  const positions = found.map((q) => q.position!).filter((p) => p > 0);
  const avg_position =
    positions.length > 0
      ? positions.reduce((a, b) => a + b, 0) / positions.length
      : 0;

  let seo_score: "Bon" | "Moyen" | "Faible";
  if (avg_position <= 3 && found.length >= 2) {
    seo_score = "Bon";
  } else if (avg_position <= 10 || found.length >= 2) {
    seo_score = "Moyen";
  } else {
    seo_score = "Faible";
  }
  return { seo_score, avg_position };
}

async function synthesizeVerdictAndOpportunity(
  context: CompanyContext,
  queriesTested: QueryTestResult[],
  seoScore: string
): Promise<{ verdict: string; opportunity: string; usage: OpenAIUsage }> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "Tu génères un verdict court et une opportunité SEO en une phrase pour une entreprise. Réponds par un JSON: {\"verdict\": \"...\", \"opportunity\": \"...\"}",
      },
      {
        role: "user",
        content: `Entreprise: ${context.companyName} (${context.industry ?? "N/A"})
Localisation: ${[context.city, context.state, context.country].filter(Boolean).join(", ")}
Résultats: ${JSON.stringify(queriesTested)}
Score SEO: ${seoScore}

Donne un verdict court (1-2 phrases) et une opportunité concrète (ex: "Optimiser pour 'meilleure boulangerie'") en JSON.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const usage: OpenAIUsage = {
    prompt_tokens: response.usage?.prompt_tokens ?? 0,
    completion_tokens: response.usage?.completion_tokens ?? 0,
    total_tokens: response.usage?.total_tokens ?? 0,
  };

  const content = response.choices[0]?.message?.content;
  let verdict = "Positionnement à améliorer.";
  let opportunity = "Identifier les requêtes à fort potentiel et optimiser le référencement local.";

  if (content) {
    try {
      const parsed = JSON.parse(content) as { verdict?: string; opportunity?: string };
      if (parsed.verdict) verdict = parsed.verdict;
      if (parsed.opportunity) opportunity = parsed.opportunity;
    } catch {
      /* use defaults */
    }
  }
  return { verdict, opportunity, usage };
}

export interface AnalyzeCompanyParams {
  context: CompanyContext;
  leadId?: number;
  companyId?: number;
}

/**
 * Pipeline principal : génération requêtes → Apify → parsing → vérification IA → calcul du score
 */
export async function analyzeCompanySeoLocal(
  params: AnalyzeCompanyParams
): Promise<SeoLocalResult> {
  const { context, leadId, companyId } = params;
  const location = [context.city, context.state, context.country]
    .filter(Boolean)
    .join(", ") || "zone locale";
  const industry = context.industry || "Non spécifiée";

  let totalTokens = 0;
  let openaiCostUsd = 0;
  let apifyCostUsd = 0;
  const apifyRunIds: string[] = [];

  // 1. Générer les requêtes
  const { queries, usage: genUsage } = await generateSearchQueries(context);
  totalTokens += genUsage.total_tokens ?? genUsage.prompt_tokens! + genUsage.completion_tokens!;
  openaiCostUsd += calculateOpenAICost(genUsage, OPENAI_MODEL);

  const queries_tested: QueryTestResult[] = [];

  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await sleep(DELAY_BETWEEN_APIFY_MS);

    const { results, runId } = await runGoogleSearch(queries[i]);
    apifyRunIds.push(runId);

    const { position, found } = findCompanyInResults(
      results,
      context.companyName,
      context.website
    );

    let confirmedFound = found;
    if (found && position > 0) {
      const resultAtPosition = results[position - 1];
      if (resultAtPosition) {
        try {
          const verifyResp = await getOpenAIClient().chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: 'Réponds UNIQUEMENT par {"same": true} ou {"same": false} en JSON.',
              },
              {
                role: "user",
                content: `Entreprise: ${context.companyName}. Résultat: ${resultAtPosition.title ?? ""} | ${resultAtPosition.displayedUrl ?? ""}. Même entreprise (pas homonyme)?`,
              },
            ],
            response_format: { type: "json_object" },
          });
          const vUsage = verifyResp.usage as OpenAIUsage | undefined;
          if (vUsage) {
            totalTokens += vUsage.total_tokens ?? 0;
            openaiCostUsd += calculateOpenAICost(vUsage, OPENAI_MODEL);
          }
          const vContent = verifyResp.choices[0]?.message?.content;
          if (vContent) {
            const vParsed = JSON.parse(vContent) as { same?: boolean };
            confirmedFound = vParsed.same === true;
          }
        } catch {
          /* keep found as is */
        }
      }
    }

    queries_tested.push({
      keyword: queries[i],
      position: confirmedFound && position > 0 ? position : null,
      found: confirmedFound,
    });
  }

  for (const rid of apifyRunIds) {
    try {
      const cost = await getApifyRunCost(rid);
      if (cost?.costUsd) apifyCostUsd += cost.costUsd;
    } catch {
      /* ignore */
    }
  }

  const { seo_score, avg_position } = computeScore(
    queries_tested,
    context.companyName,
    context.website
  );

  const { verdict, opportunity, usage: synthUsage } =
    await synthesizeVerdictAndOpportunity(
      context,
      queries_tested,
      seo_score
    );
  totalTokens += synthUsage.total_tokens ?? 0;
  openaiCostUsd += calculateOpenAICost(synthUsage, OPENAI_MODEL);

  const totalCostUsd = openaiCostUsd + apifyCostUsd;

  return {
    company: context.companyName,
    location,
    industry,
    leadId,
    companyId,
    analysis: {
      seo_score,
      avg_position,
      queries_tested,
      verdict,
      opportunity,
      cost: {
        tokens_used: totalTokens,
        estimated_cost_usd: totalCostUsd,
        apify_cost_usd: apifyCostUsd,
      },
    },
    cost: {
      tokens_used: totalTokens,
      estimated_cost_usd: totalCostUsd,
    },
  };
}
