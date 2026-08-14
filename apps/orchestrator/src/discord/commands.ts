import { SlashCommandBuilder } from "discord.js";

export const discordCommands = [
  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask a question grounded in indexed company knowledge")
    .addStringOption((option) =>
      option.setName("question").setDescription("The company question").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("incident")
    .setDescription("Show the latest deployment incident"),
  new SlashCommandBuilder()
    .setName("remediation")
    .setDescription("Review and approve or stop the latest remediation plan"),
  new SlashCommandBuilder()
    .setName("fix-latest")
    .setDescription("Review the latest remediation plan before creating a pull request"),
].map((command) => command.toJSON());
