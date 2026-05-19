import { OpenAI } from "openai";
import { normalizeSearchQuery } from "./site-search";
import { prisma } from "./prisma";

const EMBEDDING_MODEL = "text-embedding-3-small";
const ANSWER_MODEL = "gpt-4-turbo";
const SEARCH_MIN_CHARACTERS = 2;
const STRICT_SIMILARITY_THRESHOLD = 0.3;
const FALLBACK_SIMILARITY_THRESHOLD = 0.22;

let openai;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

function cleanPath(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  const withLeadingSlash = text.startsWith("/") ? text : `/${text}`;
  return withLeadingSlash.replace(/\/{2,}/g, "/");
}

function normalizeLocationSlug(slugOrUrl = "") {
  const path = cleanPath(slugOrUrl);
  if (!path || /^https?:\/\//i.test(path)) return path;
  if (path.includes("/location/")) {
    const index = path.indexOf("/location/");
    return cleanPath(path.slice(index));
  }
  if (path.includes("/locations/")) {
    const index = path.indexOf("/locations/");
    return cleanPath(path.slice(index));
  }
  return cleanPath(`/location/${path.replace(/^\/+/, "")}`);
}

function normalizeProviderSlug(slugOrUrl = "") {
  const path = cleanPath(slugOrUrl);
  if (!path || /^https?:\/\//i.test(path)) return path;
  const value = path.replace(/^\/+/, "");
  if (value.startsWith("providers/")) return `/${value}`;
  if (value.startsWith("provider/")) return `/${value.replace(/^provider\//, "providers/")}`;
  return `/providers/${value}`;
}

function normalizeServiceSlug(slugOrUrl = "") {
  const path = cleanPath(slugOrUrl);
  if (!path || /^https?:\/\//i.test(path)) return path;
  const value = path.replace(/^\/+/, "");
  if (value.startsWith("service/")) return `/${value}`;
  if (value.startsWith("services/")) return `/${value.replace(/^services\//, "service/")}`;
  return `/service/${value}`;
}

function normalizePostSlug(slugOrUrl = "") {
  const path = cleanPath(slugOrUrl);
  if (!path || /^https?:\/\//i.test(path)) return path;
  const value = path.replace(/^\/+/, "");
  if (value.startsWith("blog/")) return `/${value}`;
  return `/blog/${value}`;
}

function resolveSourceUrl(metadata = {}) {
  const type = String(metadata.type || "").toLowerCase();
  const slug = String(metadata.slug || "").trim();
  const rawUrl = String(metadata.url || "").trim();
  const fallbackValue = slug || rawUrl;

  if (type === "location") return normalizeLocationSlug(fallbackValue);
  if (type === "provider") return normalizeProviderSlug(fallbackValue);
  if (type === "service") return normalizeServiceSlug(fallbackValue);
  if (type === "post" || type === "article") return normalizePostSlug(fallbackValue);
  return cleanPath(rawUrl);
}

async function generateEmbedding(text) {
  const client = getOpenAI();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

async function findSimilarContent(embedding, limit = 8) {
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> $1::vector) as similarity
    FROM "SearchEmbedding"
    ORDER BY embedding <=> $1::vector
    LIMIT $2
    `,
    JSON.stringify(embedding),
    limit
  );

  const typedRows = Array.isArray(rows)
    ? rows.map((item) => ({
        ...item,
        similarity: Number(item.similarity || 0),
      }))
    : [];

  const strictMatches = typedRows.filter((item) => item.similarity >= STRICT_SIMILARITY_THRESHOLD);
  if (strictMatches.length > 0) {
    return strictMatches;
  }

  return typedRows.filter((item) => item.similarity >= FALLBACK_SIMILARITY_THRESHOLD).slice(0, 3);
}

async function generateAnswer(query, context) {
  const contextText = context
    .map(
      (item) =>
        `Source: ${item.metadata?.title || "Website"} (${item.metadata?.type || "content"})\n${item.content}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are a helpful medical assistant for First Medical Associates. Answer the patient's question based on the provided context. If the answer is not in the context, say you don't have that information.

Patient Question: ${query}

Context:
${contextText}

Please provide a clear, helpful answer. Be concise but thorough.`;

  const client = getOpenAI();
  const response = await client.chat.completions.create({
    model: ANSWER_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant for First Medical Associates. Answer medical questions accurately and direct patients to appropriate resources.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content || "";
}

function formatSources(items) {
  const seen = new Set();
  const sources = [];

  for (const item of items) {
    const metadata = item.metadata || {};
    const sourceId = String(metadata.sourceId || "");
    const type = String(metadata.type || "content");
    const key = `${type}-${sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const url = resolveSourceUrl(metadata);
    if (!url) continue;

    sources.push({
      title: metadata.title || "Website Page",
      url,
      type,
      category: metadata.category || null,
    });
  }

  return sources.slice(0, 3);
}

export async function runAiSearch(rawQuery, options = {}) {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < SEARCH_MIN_CHARACTERS) {
    return {
      ok: false,
      error: `Query must be at least ${SEARCH_MIN_CHARACTERS} characters`,
      query,
      answer: "",
      sources: [],
      confidence: 0,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      error: "AI search is not configured",
      query,
      answer: "",
      sources: [],
      confidence: 0,
    };
  }

  const queryEmbedding = await generateEmbedding(query);
  const similarContent = await findSimilarContent(queryEmbedding, Number(options.limit) || 8);

  if (similarContent.length === 0) {
    return {
      ok: true,
      query,
      answer:
        "I don't have information about that topic. Please try a different question or visit our location pages for more help.",
      sources: [],
      confidence: 0,
    };
  }

  const answer = await generateAnswer(query, similarContent);
  const sources = formatSources(similarContent);

  return {
    ok: true,
    query,
    answer,
    sources,
    confidence: similarContent[0]?.similarity || 0,
  };
}
