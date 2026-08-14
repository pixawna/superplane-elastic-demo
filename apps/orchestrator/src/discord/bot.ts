import { Client, Events, GatewayIntentBits } from "discord.js";
import type { Incident } from "../incidents/types.js";
import type { IncidentStore } from "../incidents/store.js";
import { formatIncident } from "./notifications.js";

interface BotHandlers {
  ask: (question: string) => Promise<string>;
  approveFix: () => Promise<Incident>;
  store: IncidentStore;
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
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();
    try {
      if (interaction.commandName === "ask") {
        await interaction.editReply(
          await handlers.ask(interaction.options.getString("question", true)),
        );
      } else if (interaction.commandName === "incident") {
        const incident = handlers.store.latest();
        await interaction.editReply(
          incident ? formatIncident(incident) : "No incident is currently tracked.",
        );
      } else if (interaction.commandName === "fix-latest") {
        const incident = await handlers.approveFix();
        await interaction.editReply(
          `Pull request created: ${incident.prUrl}\nCurrent result: checks pending. The PR was not merged.`,
        );
      }
    } catch (error) {
      await interaction.editReply(
        `Unable to complete the command: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  });

  return client;
}
