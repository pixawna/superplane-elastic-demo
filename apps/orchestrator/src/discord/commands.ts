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
    .setName("fix-latest")
    .setDescription("Approve a minimal pull request for the latest incident"),
].map((command) => command.toJSON());
