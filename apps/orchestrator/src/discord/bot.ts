import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Incident } from "../incidents/types.js";
import type { IncidentStore } from "../incidents/store.js";
import { formatRemediationPlan } from "./notifications.js";

interface BotHandlers {
  ask: (question: string) => Promise<string>;
  approveFix: (incidentId: string) => Promise<Incident>;
  stopFix: (incidentId: string) => Incident;
  store: IncidentStore;
}

const REMEDIATION_BUTTON = /^remediation:(approve|stop):([^:]+):(\d+)$/;

function appendDecision(content: string, decision: string): string {
  const available = 1_990 - decision.length - 2;
  return `${content.slice(0, Math.max(0, available))}\n\n${decision}`;
}

function remediationComponents(incident: Incident, requestedBy: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`remediation:approve:${incident.id}:${requestedBy}`)
        .setLabel("Approve and create PR")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`remediation:stop:${incident.id}:${requestedBy}`)
        .setLabel("Stop — no changes")
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

async function showRemediation(interaction: ChatInputCommandInteraction, handlers: BotHandlers) {
  const incident = handlers.store.latestUnresolved();
  if (!incident) {
    if (handlers.store.isProcessing()) {
      throw new Error("Investigation is still running. Wait for the remediation plan message.");
    }
    throw new Error("There is no remediation plan awaiting approval.");
  }
  await interaction.editReply({
    content: formatRemediationPlan(incident),
    components: remediationComponents(incident, interaction.user.id),
  });
}

async function handleRemediationButton(interaction: ButtonInteraction, handlers: BotHandlers) {
  const match = REMEDIATION_BUTTON.exec(interaction.customId);
  if (!match) return;
  const [, action, incidentId, requestedBy] = match;
  if (interaction.user.id !== requestedBy) {
    await interaction.reply({
      content: "Only the person who requested this remediation review can make this decision.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === "stop") {
    handlers.stopFix(incidentId);
    await interaction.update({
      content: appendDecision(
        interaction.message.content,
        "⛔ **Plan stopped**\nNo code, branch, commit, or pull request was created. Revise the evidence or plan before starting a new remediation.",
      ),
      components: [],
    });
    return;
  }

  await interaction.update({
    content: appendDecision(
      interaction.message.content,
      "🟡 **Approved**\nSuperPlane is generating the allowlisted change and preparing an unmerged pull request…",
    ),
    components: [],
  });
  const incident = await handlers.approveFix(incidentId);
  await interaction.followUp({
    content:
      `✅ **Pull request ready**\n${incident.prUrl}\n` +
      "Current result: checks pending. The pull request was not merged.",
    allowedMentions: { parse: [] },
  });
}

export function createDiscordBot(handlers: BotHandlers) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(JSON.stringify({ event: "discord_bot_ready", user: readyClient.user.tag }));
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !client.user || !message.mentions.has(client.user)) return;
    const question = message.content.replace(new RegExp(`<@!?${client.user.id}>`, "g"), "").trim();
    if (!question)
      return void message.reply("Ask me a company-knowledge question after the mention.");
    try {
      await message.reply({
        content: await handlers.ask(question),
        allowedMentions: { repliedUser: false },
      });
    } catch (error) {
      await message.reply(
        `I could not answer that safely: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
      try {
        await handleRemediationButton(interaction, handlers);
      } catch (error) {
        const content = `Unable to complete the decision: ${error instanceof Error ? error.message : "unknown error"}`;
        if (interaction.replied || interaction.deferred) await interaction.followUp({ content });
        else await interaction.reply({ content, flags: MessageFlags.Ephemeral });
      }
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();
    try {
      if (interaction.commandName === "ask") {
        await interaction.editReply(
          await handlers.ask(interaction.options.getString("question", true)),
        );
      } else if (
        interaction.commandName === "remediation" ||
        interaction.commandName === "fix-latest"
      ) {
        await showRemediation(interaction, handlers);
      }
    } catch (error) {
      await interaction.editReply(
        `Unable to complete the command: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  });

  return client;
}
