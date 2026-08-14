import type { Octokit } from "@octokit/rest";

export interface WorkflowFailureContext {
  owner: string;
  repository: string;
  workflowRunId: number;
  workflowName: string;
  commitSha: string;
  branch: string;
  workflowUrl: string;
  failedJobs: Array<{ name: string; failedSteps: string[] }>;
  importantLogs: string;
}

export function extractImportantLogLines(raw: string, maxCharacters = 12_000): string {
  const ansiColor = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
  const lines = raw.replace(ansiColor, "").split(/\r?\n/);
  const important = lines.filter((line) =>
    /error|fail|exception|missing|required|timeout|exit code|not found/i.test(line),
  );
  const selected = [...new Set([...important.slice(-100), ...lines.slice(-35)])];
  const joined = selected.join("\n");
  return joined.length <= maxCharacters ? joined : joined.slice(joined.length - maxCharacters);
}

function logDataToString(data: unknown): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer).toString("utf8");
  return JSON.stringify(data);
}

export async function retrieveWorkflowFailure(
  octokit: Octokit,
  input: Omit<WorkflowFailureContext, "failedJobs" | "importantLogs">,
): Promise<WorkflowFailureContext> {
  const jobsResponse = await octokit.actions.listJobsForWorkflowRun({
    owner: input.owner,
    repo: input.repository,
    run_id: input.workflowRunId,
    filter: "latest",
    per_page: 100,
  });
  const failed = jobsResponse.data.jobs.filter((job) => job.conclusion === "failure");
  const logParts: string[] = [];

  for (const job of failed.slice(0, 5)) {
    try {
      const response = await octokit.request(
        "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
        { owner: input.owner, repo: input.repository, job_id: job.id },
      );
      logParts.push(
        `## ${job.name}\n${extractImportantLogLines(logDataToString(response.data), 5_000)}`,
      );
    } catch (error) {
      logParts.push(
        `## ${job.name}\nLog retrieval failed: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  return {
    ...input,
    failedJobs: failed.map((job) => ({
      name: job.name,
      failedSteps:
        job.steps?.filter((step) => step.conclusion === "failure").map((step) => step.name) ?? [],
    })),
    importantLogs: extractImportantLogLines(logParts.join("\n\n")),
  };
}
