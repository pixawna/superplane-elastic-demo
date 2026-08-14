import "dotenv/config";
import { z } from "zod";
import { createElasticClient } from "../apps/orchestrator/src/elastic/client.js";

const env = z
  .object({
    ELASTICSEARCH_URL: z.string().url(),
    ELASTIC_API_KEY: z.string().min(1),
    ELASTIC_INDEX: z.string().default("superplane-knowledge"),
    ELASTIC_INFERENCE_ID: z.string().optional(),
  })
  .parse(process.env);

const client = createElasticClient(env.ELASTICSEARCH_URL, env.ELASTIC_API_KEY);
const exists = await client.indices.exists({ index: env.ELASTIC_INDEX });
if (exists) {
  console.log(`Index ${env.ELASTIC_INDEX} already exists.`);
} else {
  const semanticMapping = {
    type: "semantic_text",
    ...(env.ELASTIC_INFERENCE_ID ? { inference_id: env.ELASTIC_INFERENCE_ID } : {}),
  };
  await client.indices.create({
    index: env.ELASTIC_INDEX,
    mappings: {
      properties: {
        title: { type: "text" },
        content: { type: "text" },
        semantic: semanticMapping,
        source_type: { type: "keyword" },
        source: { type: "keyword" },
        timestamp: { type: "date" },
      },
    },
  } as never);
  console.log(`Created ${env.ELASTIC_INDEX}.`);
}
await client.close();
