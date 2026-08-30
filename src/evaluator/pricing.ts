/**
 * Centralized pricing model for deterministic cost calculation.
 * See prompt §4: cost calculation must use explicit pricing config, never invent costs.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DEFAULT_PRICING_PATH = join(ROOT, "experiments/config/pricing.json");

export interface ModelPricing {
  model: string;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export interface PricingConfig {
  version: string;
  description?: string;
  models: ModelPricing[];
  defaultModel?: string;
}

export interface CostResult {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  inputCostUsd: number | null;
  outputCostUsd: number | null;
  totalCostUsd: number | null;
  costStatus: "computed" | "provider" | "unavailable";
  costSource: "computed" | "provider" | "none";
  pricingModel?: string;
  pricingSnapshot?: PricingConfig;
}

let cachedConfig: PricingConfig | null = null;
let cachedPath: string | null = null;

export function loadPricingConfig(path?: string): PricingConfig | null {
  const pricingPath = path ?? process.env.PRICING_CONFIG_PATH ?? DEFAULT_PRICING_PATH;
  if (cachedConfig && cachedPath === pricingPath) return cachedConfig;
  if (!existsSync(pricingPath)) return null;
  try {
    const raw = readFileSync(pricingPath, "utf-8");
    const parsed = JSON.parse(raw) as PricingConfig;
    if (!parsed.models || !Array.isArray(parsed.models)) return null;
    cachedConfig = parsed;
    cachedPath = pricingPath;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPricingCache(): void {
  cachedConfig = null;
  cachedPath = null;
}

export function resolvePricing(model: string, config: PricingConfig | null): ModelPricing | null {
  if (!config) return null;
  const exact = config.models.find((m) => m.model === model);
  if (exact) return exact;
  // fallback to default
  if (config.defaultModel) {
    const def = config.models.find((m) => m.model === config.defaultModel);
    if (def) return def;
  }
  return null;
}

/**
 * Strict cost guardrail per refinement:
 * If inputTokens === null OR outputTokens === null, return unavailable even if pricing exists.
 * Never calculate cost from assumed token count.
 */
export function computeCost(
  inputTokens: number | null,
  outputTokens: number | null,
  pricing: ModelPricing | null,
  config: PricingConfig | null,
): CostResult {
  if (inputTokens == null || outputTokens == null) {
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null,
      inputCostUsd: null,
      outputCostUsd: null,
      totalCostUsd: null,
      costStatus: "unavailable",
      costSource: "none",
      pricingModel: pricing?.model,
      pricingSnapshot: config ?? undefined,
    };
  }
  if (!pricing || !config) {
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCostUsd: null,
      outputCostUsd: null,
      totalCostUsd: null,
      costStatus: "unavailable",
      costSource: "none",
      pricingModel: pricing?.model,
      pricingSnapshot: config ?? undefined,
    };
  }
  const inputCost = (inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;
  const total = inputCost + outputCost;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCostUsd: inputCost,
    outputCostUsd: outputCost,
    totalCostUsd: total,
    costStatus: "computed",
    costSource: "computed",
    pricingModel: pricing.model,
    pricingSnapshot: config,
  };
}

/**
 * Prefer provider cost if available and trustworthy.
 * Provider cost takes precedence; otherwise compute.
 */
export function resolveCostWithProviderPreference(params: {
  inputTokens: number | null;
  outputTokens: number | null;
  providerCostUsd?: number | null;
  model: string | undefined;
  pricingConfig: PricingConfig | null;
}): CostResult {
  if (params.providerCostUsd != null && typeof params.providerCostUsd === "number" && !Number.isNaN(params.providerCostUsd)) {
    return {
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens != null && params.outputTokens != null ? params.inputTokens + params.outputTokens : null,
      inputCostUsd: null,
      outputCostUsd: null,
      totalCostUsd: params.providerCostUsd,
      costStatus: "provider",
      costSource: "provider",
      pricingModel: params.model,
      pricingSnapshot: params.pricingConfig ?? undefined,
    };
  }
  const pricing = params.model && params.pricingConfig ? resolvePricing(params.model, params.pricingConfig) : null;
  return computeCost(params.inputTokens, params.outputTokens, pricing, params.pricingConfig);
}
