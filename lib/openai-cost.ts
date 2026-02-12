/**
 * Calcul des coûts OpenAI basés sur les tokens utilisés.
 * Tarifs approximatifs (à jour en 2025) pour gpt-4o-mini.
 * @see https://openai.com/api/pricing/
 */

export interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

// Prix par 1M tokens (USD) - gpt-4o-mini
const GPT4O_MINI_PRICES = {
  input: 0.15,
  output: 0.6,
};

// Autres modèles si nécessaire
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": GPT4O_MINI_PRICES,
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
};

/**
 * Calcule le coût en USD pour une utilisation OpenAI
 */
export function calculateOpenAICost(
  usage: OpenAIUsage,
  model: string = "gpt-4o-mini"
): number {
  const prices = MODEL_PRICES[model] ?? GPT4O_MINI_PRICES;
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;

  const inputCost = (promptTokens / 1_000_000) * prices.input;
  const outputCost = (completionTokens / 1_000_000) * prices.output;

  return inputCost + outputCost;
}
