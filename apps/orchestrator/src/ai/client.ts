import OpenAI from "openai";

export type OpenRouterClient = OpenAI;

export interface OpenRouterClientConfig {
  apiKey: string;
}

export function createOpenRouterClient(config: OpenRouterClientConfig): OpenRouterClient {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}
