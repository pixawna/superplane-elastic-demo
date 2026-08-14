import type { DemoServiceConfig } from "./config.js";

export interface CheckoutResult {
  status: "approved";
  paymentTimeoutMs: number;
  orderId: string;
}

export function checkout(orderId: string, config: DemoServiceConfig): CheckoutResult {
  if (!orderId.trim()) throw new Error("orderId is required");
  return { status: "approved", paymentTimeoutMs: config.paymentTimeoutMs, orderId };
}
