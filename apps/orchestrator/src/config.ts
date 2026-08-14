import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  DISCORD_ALERT_CHANNEL_ID: z.string().min(1),
  ELASTICSEARCH_URL: z.string().url(),
  ELASTIC_API_KEY: z.string().min(1),
  ELASTIC_INDEX: z.string().default("superplane-knowledge"),
  ELASTIC_INFERENCE_ID: z.string().optional(),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL: z.string().default("openai/gpt-5.6-terra"),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_APP_NAME: z.string().default("SuperPlane Elastic Demo"),
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: z.string().min(1),
  GITHUB_REPO: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z.string().min(16),
  PUBLIC_BASE_URL: z.string().url(),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(env);
}
