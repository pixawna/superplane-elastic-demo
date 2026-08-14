import type { Client } from "@elastic/elasticsearch";
import { logger } from "../logger.js";

export interface KnowledgeResult {
  title: string;
  excerpt: string;
  source: string;
  sourceType: string;
  score?: number;
}

interface KnowledgeDocument {
  title?: string;
  content?: string;
  source?: string;
  source_type?: string;
}

export function excerpt(content: string, maxLength = 900): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}

export function formatSearchHits(
  hits: Array<{ _source?: KnowledgeDocument; _score?: number | null }>,
): KnowledgeResult[] {
  return hits.flatMap((hit) => {
    const source = hit._source;
    if (!source?.title || !source.content || !source.source) return [];
    return [
      {
        title: source.title,
        excerpt: excerpt(source.content),
        source: source.source,
        sourceType: source.source_type ?? "knowledge",
        ...(typeof hit._score === "number" ? { score: hit._score } : {}),
      },
    ];
  });
}

export function normalizeSearchQuery(query: string, maxLength = 800): string {
  return query.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function searchKnowledge(
  client: Client,
  index: string,
  query: string,
  size = 5,
): Promise<KnowledgeResult[]> {
  const safeQuery = normalizeSearchQuery(query);
  if (!safeQuery) return [];
  logger.info("elasticsearch_search_started", {
    index,
    queryLength: query.length,
    normalizedQueryLength: safeQuery.length,
  });
  const lexicalQuery = {
    multi_match: { query: safeQuery, fields: ["title^3", "content^2", "source"] },
  };

  let response;
  try {
    response = await client.search<KnowledgeDocument>({
      index,
      size,
      query: {
        bool: {
          should: [lexicalQuery, { semantic: { field: "semantic", query: safeQuery } }],
          minimum_should_match: 1,
        },
      } as never,
    });
  } catch (error) {
    logger.warn("elasticsearch_semantic_search_fallback", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    try {
      response = await client.search<KnowledgeDocument>({ index, size, query: lexicalQuery });
    } catch (fallbackError) {
      logger.error("elasticsearch_search_failed", {
        reason: fallbackError instanceof Error ? fallbackError.message : "unknown",
      });
      return [];
    }
  }

  const results = formatSearchHits(response.hits.hits);
  logger.info("elasticsearch_search_completed", { index, resultCount: results.length });
  return results;
}

export function renderKnowledgeContext(results: KnowledgeResult[]): string {
  return results
    .map((item, index) =>
      [`[Source ${index + 1}]`, `Title: ${item.title}`, `Path: ${item.source}`, item.excerpt].join(
        "\n",
      ),
    )
    .join("\n\n");
}
