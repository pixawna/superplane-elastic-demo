import { describe, expect, it } from "vitest";
import { checkout } from "../src/checkout.js";

describe("checkout", () => {
  it("uses the configured timeout", () => {
    expect(checkout("order-123", { paymentTimeoutMs: 1500, port: 3100 })).toEqual({
      status: "approved",
      paymentTimeoutMs: 1500,
      orderId: "order-123",
    });
  });
});
