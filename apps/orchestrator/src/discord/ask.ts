import type { Client as ElasticClient } from "@elastic/elasticsearch";
import OpenAI from "openai";
import { answerQuestion } from "../ai/answer-question.js";
import { searchKnowledge } from "../elastic/search.js";
import { logger } from "../logger.js";

export async function askCompanyKnowledge(
  elastic: ElasticClient,
  elasticIndex: string,
  openai: OpenAI,
  model: string,
  question: string,
) {
  logger.info("discord_question_received", { questionLength: question.length });
  const sources = await searchKnowledge(elastic, elasticIndex, question);
  const answer = await answerQuestion(openai, model, question, sources);
  const sourceTitles = [...new Set(sources.map((source) => source.title))];
  return `${answer}\n\n**Sources**\n${sourceTitles.length ? sourceTitles.map((title) => `• ${title}`).join("\n") : "• No relevant indexed sources"}`.slice(
    0,
    1_990,
  );
}
