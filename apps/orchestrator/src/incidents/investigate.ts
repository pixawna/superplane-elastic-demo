import type { Client as ElasticClient } from "@elastic/elasticsearch";
import type { Octokit } from "@octokit/rest";
import { analyzeFailure } from "../ai/analyze-failure.js";
import type { OpenRouterClient } from "../ai/client.js";
import { searchKnowledge } from "../elastic/search.js";
import type { WorkflowRunEvent } from "../github/webhook.js";
import { retrieveWorkflowFailure } from "../github/workflow-logs.js";
import { logger } from "../logger.js";
import { IncidentStore } from "./store.js";
import type { Incident } from "./types.js";

export interface InvestigationDependencies {
  github: Octokit;
  elastic: ElasticClient;
  openRouter: OpenRouterClient;
  elasticIndex: string;
  openRouterModel: string;
  store: IncidentStore;
  notifyStarted: (alert: {
    workflowName: string;
    workflowUrl: string;
    branch: string;
    commitSha: string;
  }) => Promise<void>;
  notify: (incident: Incident) => Promise<void>;
}

export function buildFailureKnowledgeQuery(failure: {
  workflowName: string;
  failedJobs: Array<{ name: string; failedSteps: string[] }>;
  importantLogs: string;
}): string {
  const failedSteps = failure.failedJobs.flatMap((job) => [job.name, ...job.failedSteps]);
  const importantLines = failure.importantLogs
    .split(/\r?\n/)
    .filter((line) => /error|fail|missing|required|timeout|config|exception|not found/i.test(line))
    .slice(-12);
  return [failure.workflowName, ...failedSteps, ...importantLines].join("\n").slice(0, 800);
}

export async function investigateFailure(event: WorkflowRunEvent, deps: InvestigationDependencies) {
  const run = event.workflow_run;
  logger.info("deployment_failure_detected", { workflowRunId: run.id, workflow: run.name });
  await deps
    .notifyStarted({
      workflowName: run.name,
      workflowUrl: run.html_url,
      branch: run.head_branch ?? "unknown",
      commitSha: run.head_sha,
    })
    .catch((error) => {
      logger.warn("discord_failure_alert_failed", {
        workflowRunId: run.id,
        error: error instanceof Error ? error.message : "unknown",
      });
    });
  const failure = await retrieveWorkflowFailure(deps.github, {
    owner: event.repository.owner.login,
    repository: event.repository.name,
    workflowRunId: run.id,
    workflowName: run.name,
    commitSha: run.head_sha,
    branch: run.head_branch ?? "unknown",
    workflowUrl: run.html_url,
  });
  logger.info("workflow_logs_retrieved", {
    workflowRunId: run.id,
    failedJobs: failure.failedJobs.length,
  });
  const knowledge = await searchKnowledge(
    deps.elastic,
    deps.elasticIndex,
    buildFailureKnowledgeQuery(failure),
  );
  const analysis = await analyzeFailure(deps.openRouter, deps.openRouterModel, failure, knowledge);
  const incident: Incident = {
    id: `workflow-${run.id}`,
    createdAt: new Date().toISOString(),
    status: "awaiting_approval",
    failure,
    analysis,
    knowledge,
  };
  deps.store.save(incident);
  logger.info("incident_analyzed", { workflowRunId: run.id, confidence: analysis.confidence });
  await deps.notify(incident);
}
