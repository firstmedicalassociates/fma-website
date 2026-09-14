import { AsyncLocalStorage } from "node:async_hooks";
import { prisma } from "./prisma.js";
const storage = new AsyncLocalStorage();
export const PRICING_VERSION = "2026-09-14-standard-v1";
// USD / 1M tokens, standard processing. Keep snapshots stable for historical estimates.
// https://developers.openai.com/api/docs/models/gpt-5.5
// https://developers.openai.com/api/docs/models/text-embedding-3-small
const RATES = {
  "gpt-5.5": [5, 0.5, 30],
  "gpt-5.5-2026-04-23": [5, 0.5, 30],
  "text-embedding-3-small": [0.02, 0, 0],
};
function tokenCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}
export function normalizeUsage(response, operation, requestedModel) {
  const usage = response?.usage;
  const model = response?.model || requestedModel;
  const inputTokens = tokenCount(
    usage?.input_tokens ??
      usage?.prompt_tokens ??
      (operation === "embedding" ? usage?.total_tokens : undefined),
  );
  const outputTokens =
    operation === "embedding" && inputTokens !== null
      ? 0
      : tokenCount(usage?.output_tokens ?? usage?.completion_tokens);
  const cachedInputTokens =
    inputTokens === null
      ? null
      : Math.min(
          inputTokens,
          tokenCount(
            usage?.input_tokens_details?.cached_tokens ??
              usage?.prompt_tokens_details?.cached_tokens,
          ) ?? 0,
        );
  const rates = RATES[model];
  const standard =
    !response?.service_tier ||
    ["default", "standard", "auto"].includes(response.service_tier);
  const longContext = model.startsWith("gpt-5.5") && inputTokens > 272000;
  const estimatedCostUsd =
    rates && standard && inputTokens !== null && outputTokens !== null
      ? ((inputTokens - cachedInputTokens) * rates[0] * (longContext ? 2 : 1) +
          cachedInputTokens * rates[1] * (longContext ? 2 : 1) +
          outputTokens * rates[2] * (longContext ? 1.5 : 1)) /
        1e6
      : null;
  return {
    operation,
    model,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    estimatedCostUsd,
    pricingVersion: estimatedCostUsd === null ? null : PRICING_VERSION,
    requestId: response?._request_id || response?.id || null,
    status: usage ? "recorded" : "usage_unavailable",
  };
}
export async function persistUsage(records, eventId = null, db = prisma) {
  if (!records.length) return;
  try {
    await db.aiApiUsage.createMany({
      data: records.map((record) => ({ ...record, eventId })),
    });
  } catch (error) {
    console.error("API usage persistence failed:", error.code || error.name);
  }
}
export async function withUsageCapture(purpose, callback) {
  const context = { purpose, records: [] };
  return storage.run(context, () => callback(context));
}
export async function trackOpenAiCall(
  { operation, model, purpose = "diagnostics" },
  call,
) {
  const context = storage.getStore();
  let record;
  try {
    const response = await call();
    record = {
      ...normalizeUsage(response, operation, model),
      purpose: context?.purpose || purpose,
    };
    return response;
  } catch (error) {
    record = {
      operation,
      model,
      purpose: context?.purpose || purpose,
      status: "failed_usage_unknown",
      requestId: error?.request_id || null,
    };
    throw error;
  } finally {
    if (record) {
      if (context) context.records.push(record);
      else await persistUsage([record]);
    }
  }
}
