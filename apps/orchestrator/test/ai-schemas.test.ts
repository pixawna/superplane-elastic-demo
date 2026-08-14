import { describe, expect, it } from "vitest";
import { incidentAnalysisSchema } from "../src/ai/schemas.js";

describe("incident analysis schema", () => {
  it("validates confidence and required evidence", () => {
    expect(
      incidentAnalysisSchema.parse({
        summary: "Startup failed",
        likelyRootCause: "Wrong variable",
        confidence: 0.95,
        affectedFiles: ["apps/demo-service/src/config.ts"],
        suggestedFix: "Restore the name",
        evidence: ["log line"],
      }).confidence,
    ).toBe(0.95);
    expect(() =>
      incidentAnalysisSchema.parse({
        summary: "x",
        likelyRootCause: "x",
        confidence: 2,
        affectedFiles: [],
        suggestedFix: "x",
        evidence: [],
      }),
    ).toThrow();
  });
});
