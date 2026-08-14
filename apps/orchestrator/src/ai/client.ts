import OpenAI from "openai";

export type OpenRouterClient = OpenAI;

export interface OpenRouterClientConfig {
  apiKey: string;
  baseUrl: string;
  siteUrl: string;
  appName: string;
}

export function createOpenRouterClient(config: OpenRouterClientConfig): OpenRouterClient {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    defaultHeaders: {
      "HTTP-Referer": config.siteUrl,
      "X-OpenRouter-Title": config.appName,
    },
  });
}
