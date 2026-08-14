import { z } from "zod";

const timeoutSchema = z.coerce.number().int().positive().max(60_000);

export interface DemoServiceConfig {
  paymentTimeoutMs: number;
  port: number;
}

export function loadDemoServiceConfig(env: NodeJS.ProcessEnv = process.env): DemoServiceConfig {

  if (!timeout) {
    throw new Error(
      "CONFIGURATION_ERROR: PAYMENT_TIMEOUT_MS is required for production checkout startup",
    );
  }

  return {
    paymentTimeoutMs: timeoutSchema.parse(timeout),
    port: z.coerce.number().int().positive().default(3100).parse(env.DEMO_SERVICE_PORT),
  };
}
