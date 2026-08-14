import { describe, expect, it } from "vitest";
import { buildFailureKnowledgeQuery } from "../src/incidents/investigate.js";

describe("incident knowledge query", () => {
  it("keeps important failure lines while bounding large workflow logs", () => {
    const query = buildFailureKnowledgeQuery({
      workflowName: "Deploy Production",
      failedJobs: [{ name: "deployment", failedSteps: ["Simulated production startup"] }],
      importantLogs:
        `${"ordinary output\n".repeat(500)}` +
        "CONFIGURATION_ERROR: PAYMENT_TIMEOUT_MS is required\n",
    });
    expect(query).toContain("Deploy Production");
    expect(query).toContain("Simulated production startup");
    expect(query).toContain("PAYMENT_TIMEOUT_MS");
    expect(query.length).toBeLessThanOrEqual(800);
  });
});
