import type { Client } from "discord.js";
import type { Incident } from "../incidents/types.js";
import { logger } from "../logger.js";

export interface InvestigationAlert {
  workflowName: string;
  workflowUrl: string;
  branch: string;
  commitSha: string;
}

export function formatInvestigationStarted(alert: InvestigationAlert): string {
  return [
    "🔴 **Deployment failed — investigation started**",
    `**Workflow**\n[${alert.workflowName}](${alert.workflowUrl})`,
    `**Branch / commit**\n${alert.branch} / \`${alert.commitSha.slice(0, 7)}\``,
    "SuperPlane is collecting failed jobs and logs, retrieving related Elastic knowledge, and preparing a grounded remediation plan.",
    "No code changes will be made without explicit approval.",
  ].join("\n\n");
}

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
    `**Status**\n${incident.status.replaceAll("_", " ")}`,
    "Run `/remediation` to review the proposed plan and explicitly approve or stop it.",
  ]
    .join("\n\n")
    .slice(0, 1_990);
}

export function formatRemediationPlan(incident: Incident): string {
  const evidence = incident.analysis.evidence.slice(0, 5);
  const affectedFiles = incident.analysis.affectedFiles.slice(0, 5);
  return [
    "🛠️ **SuperPlane remediation plan**",
    `**Incident**\n${incident.id}`,
    `**Observed failure**\n${incident.analysis.summary}`,
    `**Inferred root cause** (${Math.round(incident.analysis.confidence * 100)}% confidence)\n${incident.analysis.likelyRootCause}`,
    `**Evidence**\n${evidence.length ? evidence.map((item) => `• ${item}`).join("\n") : "• No evidence listed"}`,
    `**Proposed fix**\n${incident.analysis.suggestedFix}`,
    `**Likely affected files**\n${affectedFiles.length ? affectedFiles.map((item) => `• \`${item}\``).join("\n") : "• SuperPlane will inspect the constrained demo-service allowlist"}`,
    "**Safety boundary**\nApproval may create an unmerged pull request only. It cannot edit workflows, secrets, authentication, or orchestrator security code.",
    "Approve this plan, or stop it without changing GitHub.",
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

export async function notifyInvestigationStarted(
  client: Client,
  channelId: string,
  alert: InvestigationAlert,
) {
  const channel = await getAlertChannel(client, channelId);
  await channel.send({
    content: formatInvestigationStarted(alert),
    allowedMentions: { parse: [] },
  });
  logger.info("discord_failure_alert_sent", { workflow: alert.workflowName });
}

export async function notifyInvestigationFailed(
  client: Client,
  channelId: string,
  input: { workflowRunId: number; workflowUrl: string; reason: string },
) {
  const channel = await getAlertChannel(client, channelId);
  const safeReason = input.reason.replace(/\s+/g, " ").slice(0, 500);
  await channel.send({
    content: [
      "⚠️ **Investigation could not be completed**",
      `**Workflow run**\n[${input.workflowRunId}](${input.workflowUrl})`,
      `**Reason**\n${safeReason}`,
      "No remediation was approved and no repository changes were made. Correct the integration error, then redeliver the failed `workflow_run` webhook.",
    ].join("\n\n"),
    allowedMentions: { parse: [] },
  });
  logger.info("discord_investigation_failure_sent", { workflowRunId: input.workflowRunId });
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
