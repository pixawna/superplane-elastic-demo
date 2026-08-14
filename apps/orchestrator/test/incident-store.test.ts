import { describe, expect, it } from "vitest";
import { IncidentStore } from "../src/incidents/store.js";
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
    summary: "Startup failed.",
    likelyRootCause: "Wrong environment variable.",
    confidence: 0.98,
    affectedFiles: ["apps/demo-service/src/config.ts"],
    suggestedFix: "Restore PAYMENT_TIMEOUT_MS.",
    evidence: ["Startup log"],
  },
  knowledge: [],
};

describe("incident idempotency", () => {
  it("reserves a workflow run once while investigation is in progress", () => {
    const store = new IncidentStore();
    expect(store.begin(42)).toBe(true);
    expect(store.begin(42)).toBe(false);
    store.failProcessing(42);
    expect(store.begin(42)).toBe(true);
  });

  it("stops a reviewed plan without leaving it eligible for approval", () => {
    const store = new IncidentStore();
    store.save(structuredClone(incident));
    expect(store.findById("workflow-42")?.status).toBe("awaiting_approval");
    expect(store.stop("workflow-42").status).toBe("stopped");
    expect(store.latestUnresolved()).toBeUndefined();
    expect(() => store.stop("workflow-42")).toThrow("no longer awaiting approval");
  });
});
