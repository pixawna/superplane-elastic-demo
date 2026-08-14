import type { Client as ElasticClient } from "@elastic/elasticsearch";
import type { Octokit } from "@octokit/rest";
import { EDITABLE_FILE } from "../ai/schemas.js";
import { generateFix } from "../ai/generate-fix.js";
import type { OpenRouterClient } from "../ai/client.js";
import { searchKnowledge } from "../elastic/search.js";
import { createFixPullRequest, getRepositoryFiles } from "../github/create-pr.js";
import { logger } from "../logger.js";
import { IncidentStore } from "./store.js";

export interface FixDependencies {
  github: Octokit;
  elastic: ElasticClient;
  openRouter: OpenRouterClient;
  elasticIndex: string;
  openRouterModel: string;
  store: IncidentStore;
}

export async function approveLatestFix(deps: FixDependencies) {
  const incident = deps.store.latestUnresolved();
  if (!incident) throw new Error("There is no unresolved incident awaiting approval.");
  incident.status = "fixing";
  logger.info("fix_approved", { workflowRunId: incident.failure.workflowRunId });

  try {
    const candidates = incident.analysis.affectedFiles.filter(
      (path) => EDITABLE_FILE.test(path) && !path.includes(".."),
    );
    const paths =
      candidates.length > 0 ? candidates.slice(0, 3) : ["apps/demo-service/src/config.ts"];
    const files = await getRepositoryFiles(
      deps.github,
      incident.failure.owner,
      incident.failure.repository,
      incident.failure.commitSha,
      paths,
    );
    const knowledge = await searchKnowledge(
      deps.elastic,
      deps.elasticIndex,
      `${incident.analysis.likelyRootCause} ${incident.analysis.suggestedFix}`,
    );
    const fix = await generateFix(
      deps.openRouter,
      deps.openRouterModel,
      incident,
      files,
      knowledge,
    );
    logger.info("fix_generated", { files: fix.changes.map((change) => change.path) });
    const created = await createFixPullRequest(deps.github, incident, fix);
    incident.status = "pr_created";
    incident.prUrl = created.url;
    incident.fixBranch = created.branch;
    deps.store.save(incident);
    logger.info("pr_created", { workflowRunId: incident.failure.workflowRunId, url: created.url });
    return incident;
  } catch (error) {
    incident.status = "awaiting_approval";
    incident.error = error instanceof Error ? error.message : "Unknown fix failure";
    deps.store.save(incident);
    throw error;
  }
}
