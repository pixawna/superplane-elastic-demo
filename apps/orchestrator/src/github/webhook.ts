import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const workflowRunEventSchema = z.object({
  action: z.string(),
  repository: z.object({
    name: z.string(),
    full_name: z.string(),
    owner: z.object({ login: z.string() }),
  }),
  workflow_run: z.object({
    id: z.number().int(),
    name: z.string(),
    status: z.string().nullable(),
    conclusion: z.string().nullable(),
    head_sha: z.string(),
    head_branch: z.string().nullable(),
    html_url: z.string().url(),
  }),
});

export type WorkflowRunEvent = z.infer<typeof workflowRunEventSchema>;

export function verifyGitHubSignature(body: Buffer, signature: string | undefined, secret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(body).digest("hex")}`);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function shouldInvestigateWorkflow(event: WorkflowRunEvent): boolean {
  return (
    event.action === "completed" &&
    event.workflow_run.status === "completed" &&
    event.workflow_run.conclusion === "failure"
  );
}

export function parseWorkflowRunEvent(value: unknown): WorkflowRunEvent {
  return workflowRunEventSchema.parse(value);
}
