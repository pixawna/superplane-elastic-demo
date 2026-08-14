import { describe, expect, it } from "vitest";
import { loadDemoServiceConfig } from "../src/config.js";

describe("loadDemoServiceConfig", () => {
  it("reads the production timeout variable", () => {
    expect(
      loadDemoServiceConfig({ PAYMENT_TIMEOUT_MS: "1500", PAYMENT_TIMEOUT: "1500" }),
    ).toMatchObject({
      paymentTimeoutMs: 1500,
      port: 3100,
    });
  });

  it("fails clearly when the production variable is absent", () => {
    expect(() => loadDemoServiceConfig({})).toThrow("PAYMENT_TIMEOUT_MS is required");
  });
});
