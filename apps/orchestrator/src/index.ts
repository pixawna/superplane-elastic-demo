import express from "express";
import OpenAI from "openai";
import { pathToFileURL } from "node:url";
import { approveLatestFix } from "./incidents/fix.js";
import { investigateFailure } from "./incidents/investigate.js";
import { IncidentStore } from "./incidents/store.js";
import { createDiscordBot } from "./discord/bot.js";
import { askCompanyKnowledge } from "./discord/ask.js";
import { notifyIncident, notifyWorkflowResult } from "./discord/notifications.js";
import { createElasticClient } from "./elastic/client.js";
import { createGitHubClient } from "./github/client.js";
import {
  parseWorkflowRunEvent,
  shouldInvestigateWorkflow,
  verifyGitHubSignature,
} from "./github/webhook.js";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";

export function createOrchestrator() {
  const config = loadConfig();
  const github = createGitHubClient(config.GITHUB_TOKEN);
  const elastic = createElasticClient(config.ELASTICSEARCH_URL, config.ELASTIC_API_KEY);
  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  const store = new IncidentStore();
  const fixDeps = {
    github,
    elastic,
    openai,
    elasticIndex: config.ELASTIC_INDEX,
    openaiModel: config.OPENAI_MODEL,
    store,
  };
  const bot = createDiscordBot({
    store,
    ask: (question) =>
      askCompanyKnowledge(elastic, config.ELASTIC_INDEX, openai, config.OPENAI_MODEL, question),
    approveFix: () => approveLatestFix(fixDeps),
  });
  const app = express();

  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  app.post(
    "/github/webhook",
    express.raw({ type: "application/json", limit: "2mb" }),
    (request, response) => {
      const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
      const eventName = request.header("x-github-event");
      const delivery = request.header("x-github-delivery");
      logger.info("github_webhook_received", { eventName, delivery });

      if (
        !verifyGitHubSignature(
          body,
          request.header("x-hub-signature-256"),
          config.GITHUB_WEBHOOK_SECRET,
        )
      ) {
        return response.status(401).json({ error: "invalid signature" });
      }
      if (eventName !== "workflow_run") return response.status(202).json({ ignored: true });

      try {
        const event = parseWorkflowRunEvent(JSON.parse(body.toString("utf8")));
        if (shouldInvestigateWorkflow(event)) {
          if (!store.begin(event.workflow_run.id))
            return response.status(202).json({ duplicate: true });
          void investigateFailure(event, {
            ...fixDeps,
            notify: (incident) => notifyIncident(bot, config.DISCORD_ALERT_CHANNEL_ID, incident),
          }).catch((error) => {
            store.failProcessing(event.workflow_run.id);
            logger.error("incident_investigation_failed", {
              workflowRunId: event.workflow_run.id,
              error: error instanceof Error ? error.message : "unknown",
            });
          });
        } else if (
          event.action === "completed" &&
          event.workflow_run.conclusion === "success" &&
          event.workflow_run.head_branch
        ) {
          const incident = store.findByFixBranch(event.workflow_run.head_branch);
          if (incident && incident.status !== "resolved") {
            incident.status = "resolved";
            store.save(incident);
            void notifyWorkflowResult(bot, config.DISCORD_ALERT_CHANNEL_ID, incident, "passed");
          }
        }
        return response.status(202).json({ accepted: true });
      } catch (error) {
        logger.warn("github_webhook_malformed", {
          error: error instanceof Error ? error.message : "unknown",
        });
        return response.status(400).json({ error: "malformed workflow_run payload" });
      }
    },
  );

  return { app, bot, config };
}

export async function startOrchestrator() {
  const { app, bot, config } = createOrchestrator();
  await bot.login(config.DISCORD_BOT_TOKEN);
  return app.listen(config.PORT, () => {
    logger.info("orchestrator_started", { port: config.PORT, webhook: "/github/webhook" });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  startOrchestrator().catch((error) => {
    logger.error("orchestrator_start_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    process.exitCode = 1;
  });
}
