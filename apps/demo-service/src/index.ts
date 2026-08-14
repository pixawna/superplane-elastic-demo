import express from "express";
import { pathToFileURL } from "node:url";
import { checkout } from "./checkout.js";
import { loadDemoServiceConfig } from "./config.js";

export function createDemoService(env: NodeJS.ProcessEnv = process.env) {
  const config = loadDemoServiceConfig(env);
  const app = express();
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  app.post("/checkout", (request, response) => {
    const orderId = typeof request.body?.orderId === "string" ? request.body.orderId : "";
    if (!orderId) return response.status(400).json({ error: "orderId is required" });
    return response.json(checkout(orderId, config));
  });
  return { app, config };
}

export function startDemoService(env: NodeJS.ProcessEnv = process.env) {
  const { app, config } = createDemoService(env);
  return app.listen(config.port, () => {
    console.log(JSON.stringify({ event: "demo_service_started", port: config.port }));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    startDemoService();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unknown startup failure");
    process.exitCode = 1;
  }
}
