import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { KnowledgeResult } from "../elastic/search.js";
import { renderKnowledgeContext } from "../elastic/search.js";
import type { WorkflowFailureContext } from "../github/workflow-logs.js";
import { incidentAnalysisSchema, type IncidentAnalysis } from "./schemas.js";

export async function analyzeFailure(
  openai: OpenAI,
  model: string,
  failure: WorkflowFailureContext,
  knowledge: KnowledgeResult[],
): Promise<IncidentAnalysis> {
  const response = await openai.responses.parse({
    model,
    instructions:
      "Analyze a failed deployment. Separate observed evidence from inference. Never state a guess " +
      "as fact. Use low confidence when evidence is incomplete. Recommend a minimal correction only; " +
      "do not claim code was changed.",
    input: `GitHub failure:\n${JSON.stringify(failure, null, 2)}\n\nCompany knowledge:\n${renderKnowledgeContext(knowledge)}`,
    text: { format: zodTextFormat(incidentAnalysisSchema, "incident_analysis") },
  });
  if (!response.output_parsed) throw new Error("OpenAI returned no incident analysis");
  return incidentAnalysisSchema.parse(response.output_parsed);
}
