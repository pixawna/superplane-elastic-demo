import type { Client } from "discord.js";
import type { Incident } from "../incidents/types.js";
import { logger } from "../logger.js";

export function formatIncident(incident: Incident): string {
  const failed = incident.failure.failedJobs
    .flatMap((job) => job.failedSteps.map((step) => `${job.name} / ${step}`))
    .slice(0, 4);
  const evidence = ["GitHub Actions logs", ...incident.knowledge.map((item) => item.title)].slice(
    0,
    5,
  );
  return [
    "🔴 **Deployment failed**",
    `**Service**\ncheckout-service`,
    `**Workflow**\n[${incident.failure.workflowName}](${incident.failure.workflowUrl})`,
    `**Failure**\n${incident.analysis.summary}`,
    `**Failed step${failed.length === 1 ? "" : "s"}**\n${failed.length ? failed.map((item) => `• ${item}`).join("\n") : "• See workflow logs"}`,
    `**Likely root cause** (${Math.round(incident.analysis.confidence * 100)}% confidence)\n${incident.analysis.likelyRootCause}`,
    `**Evidence**\n${evidence.map((item) => `• ${item}`).join("\n")}`,
    `**Suggested action**\n${incident.analysis.suggestedFix}`,
    "Run `/fix-latest` to let SuperPlane prepare a pull request.",
  ]
    .join("\n\n")
    .slice(0, 1_990);
}

async function getAlertChannel(client: Client, channelId: string) {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isSendable())
    throw new Error("Configured Discord alert channel cannot receive messages");
  return channel;
}

export async function notifyIncident(client: Client, channelId: string, incident: Incident) {
  const channel = await getAlertChannel(client, channelId);
  await channel.send({ content: formatIncident(incident), allowedMentions: { parse: [] } });
  logger.info("discord_incident_notification_sent", {
    workflowRunId: incident.failure.workflowRunId,
  });
}

export async function notifyWorkflowResult(
  client: Client,
  channelId: string,
  incident: Incident,
  result: string,
) {
  const channel = await getAlertChannel(client, channelId);
  await channel.send({
    content: `✅ **Fix workflow ${result}**\n${incident.prUrl ?? "Pull request URL unavailable"}`,
    allowedMentions: { parse: [] },
  });
}
