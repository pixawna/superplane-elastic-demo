import { zodResponseFormat } from "openai/helpers/zod";
import type { KnowledgeResult } from "../elastic/search.js";
import { renderKnowledgeContext } from "../elastic/search.js";
import type { WorkflowFailureContext } from "../github/workflow-logs.js";
import { incidentAnalysisSchema, type IncidentAnalysis } from "./schemas.js";
import type { OpenRouterClient } from "./client.js";

export async function analyzeFailure(
  openRouter: OpenRouterClient,
  model: string,
  failure: WorkflowFailureContext,
  knowledge: KnowledgeResult[],
): Promise<IncidentAnalysis> {
  const response = await openRouter.chat.completions.parse({
    model,
    messages: [
      {
        role: "system",
        content:
          "Analyze a failed deployment. Separate observed evidence from inference. Never state a guess " +
          "as fact. Use low confidence when evidence is incomplete. Recommend a minimal correction only; " +
          "do not claim code was changed.",
      },
      {
        role: "user",
        content: `GitHub failure:\n${JSON.stringify(failure, null, 2)}\n\nCompany knowledge:\n${renderKnowledgeContext(knowledge)}`,
      },
    ],
    response_format: zodResponseFormat(incidentAnalysisSchema, "incident_analysis"),
  });
  const analysis = response.choices[0]?.message.parsed;
  if (!analysis) throw new Error("OpenRouter returned no incident analysis");
  return incidentAnalysisSchema.parse(analysis);
}
