import { describe, expect, it } from "vitest";
import { validateGeneratedFix } from "../src/ai/schemas.js";

const fix = (path: string) => ({
  title: "Fix config",
  description: "Minimal correction",
  changes: [{ path, newContent: "export {};" }],
});

describe("generated fix allowlist", () => {
  it("allows demo-service source and blocks workflows or traversal", () => {
    expect(validateGeneratedFix(fix("apps/demo-service/src/config.ts"))).toBeTruthy();
    expect(() => validateGeneratedFix(fix(".github/workflows/deploy.yml"))).toThrow(
      "disallowed path",
    );
    expect(() =>
      validateGeneratedFix(fix("apps/demo-service/src/../../orchestrator/src/index.ts")),
    ).toThrow("disallowed path");
  });
});
