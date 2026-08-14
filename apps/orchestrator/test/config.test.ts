import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const baseEnv = {
  DISCORD_BOT_TOKEN: "discord-token",
  DISCORD_CLIENT_ID: "client-id",
  DISCORD_GUILD_ID: "guild-id",
  DISCORD_ALERT_CHANNEL_ID: "channel-id",
  ELASTICSEARCH_URL: "https://elastic.example.com",
  ELASTIC_API_KEY: "elastic-key",
  OPENROUTER_API_KEY: "openrouter-key",
  GITHUB_TOKEN: "github-token",
  GITHUB_OWNER: "owner",
  GITHUB_REPO: "repo",
  GITHUB_WEBHOOK_SECRET: "a-long-webhook-secret",
  PUBLIC_BASE_URL: "https://demo.example.com",
};

describe("orchestrator config", () => {
  it("loads OpenRouter defaults", () => {
    const config = loadConfig(baseEnv);
    expect(config.OPENROUTER_MODEL).toBe("openai/gpt-5.6-terra");
    expect(config.OPENROUTER_BASE_URL).toBe("https://openrouter.ai/api/v1");
    expect(config.OPENROUTER_APP_NAME).toBe("SuperPlane Elastic Demo");
  });

  it("does not accept the retired OpenAI key in place of an OpenRouter key", () => {
    const withoutOpenRouter = Object.fromEntries(
      Object.entries(baseEnv).filter(([key]) => key !== "OPENROUTER_API_KEY"),
    );
    expect(() => loadConfig({ ...withoutOpenRouter, OPENAI_API_KEY: "old-key" })).toThrow();
  });
});
