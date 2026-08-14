import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createElasticClient } from "../apps/orchestrator/src/elastic/client.js";

const env = z
  .object({
    ELASTICSEARCH_URL: z.string().url(),
    ELASTIC_API_KEY: z.string().min(1),
    ELASTIC_INDEX: z.string().default("superplane-knowledge"),
  })
  .parse(process.env);
const client = createElasticClient(env.ELASTICSEARCH_URL, env.ELASTIC_API_KEY);
const knowledgeDirectory = path.resolve("knowledge");
const files = (await readdir(knowledgeDirectory)).filter((file) => file.endsWith(".md")).sort();
const documents = await Promise.all(
  files.map(async (file) => {
    const content = await readFile(path.join(knowledgeDirectory, file), "utf8");
    const title = content.match(/^#\s+(.+)$/m)?.[1] ?? file.replace(/\.md$/, "");
    return {
      title,
      content,
      semantic: content,
      source_type: file === "discord-history.md" ? "discord_export" : "markdown",
      source: `knowledge/${file}`,
      timestamp: new Date().toISOString(),
    };
  }),
);
const result = await client.helpers.bulk({
  datasource: documents,
  onDocument: (document) => [
    { index: { _index: env.ELASTIC_INDEX, _id: document.source } },
    document,
  ],
});
if (result.failed > 0) throw new Error(`Failed to index ${result.failed} knowledge documents`);
await client.indices.refresh({ index: env.ELASTIC_INDEX });
console.log(`Seeded ${result.successful} documents into ${env.ELASTIC_INDEX}.`);
await client.close();
