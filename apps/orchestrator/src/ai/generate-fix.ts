import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { KnowledgeResult } from "../elastic/search.js";
import { renderKnowledgeContext } from "../elastic/search.js";
import type { Incident } from "../incidents/types.js";
import { generatedFixSchema, validateGeneratedFix, type GeneratedFix } from "./schemas.js";

export async function generateFix(
  openai: OpenAI,
  model: string,
  incident: Incident,
  files: Record<string, string>,
  knowledge: KnowledgeResult[],
): Promise<GeneratedFix> {
  const response = await openai.responses.parse({
    model,
    instructions:
      "Generate the smallest correction supported by the evidence. You may modify only supplied files " +
      "under apps/demo-service/src/. Preserve unrelated code. Never modify workflows, credentials, " +
      "authentication, or orchestrator security. Return complete replacement file content.",
    input: `Incident:\n${JSON.stringify(incident, null, 2)}\n\nKnowledge:\n${renderKnowledgeContext(knowledge)}\n\nEditable files:\n${JSON.stringify(files, null, 2)}`,
    text: { format: zodTextFormat(generatedFixSchema, "generated_fix") },
  });
  if (!response.output_parsed) throw new Error("OpenAI returned no proposed fix");
  return validateGeneratedFix(response.output_parsed);
}
