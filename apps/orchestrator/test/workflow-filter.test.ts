import { describe, expect, it } from "vitest";
import { parseWorkflowRunEvent, shouldInvestigateWorkflow } from "../src/github/webhook.js";

const event = parseWorkflowRunEvent({
  action: "completed",
  repository: { name: "demo", full_name: "acme/demo", owner: { login: "acme" } },
  workflow_run: {
    id: 42,
    name: "Deploy Production",
    status: "completed",
    conclusion: "failure",
    head_sha: "abc1234",
    head_branch: "main",
    html_url: "https://github.com/acme/demo/actions/runs/42",
  },
});

describe("workflow failure filtering", () => {
  it("investigates only completed failures", () => {
    expect(shouldInvestigateWorkflow(event)).toBe(true);
    expect(
      shouldInvestigateWorkflow({
        ...event,
        workflow_run: { ...event.workflow_run, conclusion: "success" },
      }),
    ).toBe(false);
    expect(shouldInvestigateWorkflow({ ...event, action: "requested" })).toBe(false);
  });
});
