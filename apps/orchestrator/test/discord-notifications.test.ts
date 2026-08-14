import { describe, expect, it } from "vitest";
import { formatInvestigationStarted, formatRemediationPlan } from "../src/discord/notifications.js";
import type { Incident } from "../src/incidents/types.js";

const incident: Incident = {
  id: "workflow-42",
  createdAt: "2026-08-14T00:00:00.000Z",
  status: "awaiting_approval",
  failure: {
    owner: "acme",
    repository: "demo",
    workflowRunId: 42,
    workflowName: "Deploy Production",
    commitSha: "abc1234",
    branch: "main",
    workflowUrl: "https://github.com/acme/demo/actions/runs/42",
    failedJobs: [],
    importantLogs: "CONFIGURATION_ERROR",
  },
  analysis: {
    summary: "Application startup failed.",
    likelyRootCause: "The service reads PAYMENT_TIMEOUT.",
    confidence: 0.98,
    affectedFiles: ["apps/demo-service/src/config.ts"],
    suggestedFix: "Restore PAYMENT_TIMEOUT_MS.",
    evidence: ["GitHub Actions startup log", "Deployment runbook"],
  },
  knowledge: [],
};

describe("Discord incident flow formatting", () => {
  it("announces investigation without claiming a fix was made", () => {
    const message = formatInvestigationStarted({
      workflowName: "Deploy Production",
      workflowUrl: incident.failure.workflowUrl,
      branch: "main",
      commitSha: "abc1234",
    });
    expect(message).toContain("investigation started");
    expect(message).toContain("No code changes will be made without explicit approval");
  });

  it("separates evidence, inference, plan, and the approval boundary", () => {
    const message = formatRemediationPlan(incident);
    expect(message).toContain("Observed failure");
    expect(message).toContain("Inferred root cause");
    expect(message).toContain("Evidence");
    expect(message).toContain("Proposed fix");
    expect(message).toContain("unmerged pull request only");
  });
});
