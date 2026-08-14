import OpenAI from "openai";
import type { KnowledgeResult } from "../elastic/search.js";
import { renderKnowledgeContext } from "../elastic/search.js";
import { logger } from "../logger.js";

export async function answerQuestion(
  openai: OpenAI,
  model: string,
  question: string,
  sources: KnowledgeResult[],
): Promise<string> {
  if (sources.length === 0) {
    return "I could not find enough information in the indexed company knowledge to answer that.";
  }
  const response = await openai.responses.create({
    model,
    instructions:
      "Answer only from the supplied Elasticsearch context. Do not use outside knowledge. " +
      "If the context is insufficient, say so explicitly. Cite supporting titles inline as [Title].",
    input: `Question:\n${question}\n\nElasticsearch context:\n${renderKnowledgeContext(sources)}`,
  });
  logger.info("ai_answer_generated", { sourceCount: sources.length });
  return response.output_text;
}
