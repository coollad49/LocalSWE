import { describe, test, expect } from "vitest";
import { computeCost, resolveCostWithProviderPreference, resolvePricing, type PricingConfig } from "../pricing.ts";

const pricingConfig: PricingConfig = {
  version: "2026-08-30-snapshot",
  description: "test",
  models: [{ model: "opencode-go/muse-spark-1.2-contributor", inputUsdPerMillionTokens: 0.15, outputUsdPerMillionTokens: 0.6 }],
  defaultModel: "opencode-go/muse-spark-1.2-contributor",
};

describe("pricing guardrail", () => {
  test("computeCost with null inputTokens => unavailable even with pricing", () => {
    const pricing = resolvePricing("opencode-go/muse-spark-1.2-contributor", pricingConfig)!;
    const res = computeCost(null, 1000, pricing, pricingConfig);
    expect(res.totalCostUsd).toBe(null);
    expect(res.costStatus).toBe("unavailable");
  });

  test("computeCost with null outputTokens => unavailable", () => {
    const pricing = resolvePricing("opencode-go/muse-spark-1.2-contributor", pricingConfig)!;
    const res = computeCost(1000, null, pricing, pricingConfig);
    expect(res.totalCostUsd).toBe(null);
    expect(res.costStatus).toBe("unavailable");
  });

  test("computeCost with both null => unavailable", () => {
    const pricing = resolvePricing("opencode-go/muse-spark-1.2-contributor", pricingConfig)!;
    const res = computeCost(null, null, pricing, pricingConfig);
    expect(res.totalCostUsd).toBe(null);
    expect(res.costStatus).toBe("unavailable");
  });

  test("computeCost with both present => computed", () => {
    const pricing = resolvePricing("opencode-go/muse-spark-1.2-contributor", pricingConfig)!;
    const res = computeCost(1_000_000, 1_000_000, pricing, pricingConfig);
    expect(res.totalCostUsd).toBeCloseTo(0.75, 5);
    expect(res.inputCostUsd).toBeCloseTo(0.15, 5);
    expect(res.outputCostUsd).toBeCloseTo(0.6, 5);
    expect(res.costStatus).toBe("computed");
  });

  test("computeCost with no pricing => unavailable", () => {
    const res = computeCost(1000, 1000, null, null);
    expect(res.totalCostUsd).toBe(null);
    expect(res.costStatus).toBe("unavailable");
  });

  test("resolveCost prefers provider cost when trustworthy", () => {
    const res = resolveCostWithProviderPreference({
      inputTokens: 1000,
      outputTokens: 1000,
      providerCostUsd: 0.42,
      model: "opencode-go/muse-spark-1.2-contributor",
      pricingConfig,
    });
    expect(res.totalCostUsd).toBe(0.42);
    expect(res.costStatus).toBe("provider");
    expect(res.costSource).toBe("provider");
  });

  test("resolveCost computes when no provider cost", () => {
    const res = resolveCostWithProviderPreference({
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      providerCostUsd: null,
      model: "opencode-go/muse-spark-1.2-contributor",
      pricingConfig,
    });
    expect(res.costStatus).toBe("computed");
    expect(res.totalCostUsd).toBeCloseTo(0.45, 5); // 0.15 + 0.3
  });

  test("never $0 when tokens null even with pricing", () => {
    const res = resolveCostWithProviderPreference({
      inputTokens: null,
      outputTokens: null,
      providerCostUsd: null,
      model: "opencode-go/muse-spark-1.2-contributor",
      pricingConfig,
    });
    expect(res.totalCostUsd).toBe(null);
    expect(res.totalCostUsd).not.toBe(0);
  });

  test("resolvePricing finds exact model", () => {
    const p = resolvePricing("opencode-go/muse-spark-1.2-contributor", pricingConfig);
    expect(p?.inputUsdPerMillionTokens).toBe(0.15);
  });

  test("resolvePricing returns null for unknown without default", () => {
    const cfg: PricingConfig = { version: "x", models: [{ model: "a", inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 1 }] };
    expect(resolvePricing("unknown", cfg)).toBe(null);
  });
});
