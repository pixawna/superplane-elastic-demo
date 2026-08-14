import type { KnowledgeResult } from "../elastic/search.js";
import { renderKnowledgeContext } from "../elastic/search.js";
import { logger } from "../logger.js";
import type { OpenRouterClient } from "./client.js";

export async function answerQuestion(
  openRouter: OpenRouterClient,
  model: string,
  question: string,
  sources: KnowledgeResult[],
): Promise<string> {
  if (sources.length === 0) {
    return "I could not find enough information in the indexed company knowledge to answer that.";
  }
  const response = await openRouter.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "Answer only from the supplied Elasticsearch context. Do not use outside knowledge. " +
          "If the context is insufficient, say so explicitly. Cite supporting titles inline as [Title].",
      },
      {
        role: "user",
        content: `Question:\n${question}\n\nElasticsearch context:\n${renderKnowledgeContext(sources)}`,
      },
    ],
  });
  logger.info("ai_answer_generated", { sourceCount: sources.length });
  const answer = response.choices[0]?.message.content;
  if (!answer) throw new Error("OpenRouter returned no grounded answer");
  return answer;
}
