import { zodResponseFormat } from "openai/helpers/zod";
import type { KnowledgeResult } from "../elastic/search.js";
import { renderKnowledgeContext } from "../elastic/search.js";
import type { Incident } from "../incidents/types.js";
import { generatedFixSchema, validateGeneratedFix, type GeneratedFix } from "./schemas.js";
import type { OpenRouterClient } from "./client.js";

export async function generateFix(
  openRouter: OpenRouterClient,
  model: string,
  incident: Incident,
  files: Record<string, string>,
  knowledge: KnowledgeResult[],
): Promise<GeneratedFix> {
  const response = await openRouter.chat.completions.parse({
    model,
    messages: [
      {
        role: "system",
        content:
          "Generate the smallest correction supported by the evidence. You may modify only supplied files " +
          "under apps/demo-service/src/. Preserve unrelated code. Never modify workflows, credentials, " +
          "authentication, or orchestrator security. Return complete replacement file content.",
      },
      {
        role: "user",
        content: `Incident:\n${JSON.stringify(incident, null, 2)}\n\nKnowledge:\n${renderKnowledgeContext(knowledge)}\n\nEditable files:\n${JSON.stringify(files, null, 2)}`,
      },
    ],
    response_format: zodResponseFormat(generatedFixSchema, "generated_fix"),
  });
  const fix = response.choices[0]?.message.parsed;
  if (!fix) throw new Error("OpenRouter returned no proposed fix");
  return validateGeneratedFix(fix);
}
