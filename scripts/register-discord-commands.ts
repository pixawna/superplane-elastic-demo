import "dotenv/config";
import { REST, Routes } from "discord.js";
import { z } from "zod";
import { discordCommands } from "../apps/orchestrator/src/discord/commands.js";

const env = z
  .object({
    DISCORD_BOT_TOKEN: z.string().min(1),
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_GUILD_ID: z.string().min(1),
  })
  .parse(process.env);
const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);
await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
  body: discordCommands,
});
console.log(`Registered ${discordCommands.length} guild commands.`);
