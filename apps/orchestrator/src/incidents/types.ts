import type { IncidentAnalysis } from "../ai/schemas.js";
import type { KnowledgeResult } from "../elastic/search.js";
import type { WorkflowFailureContext } from "../github/workflow-logs.js";

export interface Incident {
  id: string;
  createdAt: string;
  status:
    | "investigating"
    | "awaiting_approval"
    | "fixing"
    | "pr_created"
    | "resolved"
    | "stopped"
    | "failed";
  failure: WorkflowFailureContext;
  analysis: IncidentAnalysis;
  knowledge: KnowledgeResult[];
  prUrl?: string;
  fixBranch?: string;
  error?: string;
}
