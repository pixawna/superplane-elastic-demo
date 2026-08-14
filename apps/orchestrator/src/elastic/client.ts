import { Client } from "@elastic/elasticsearch";

export function createElasticClient(node: string, apiKey: string) {
  return new Client({ node, auth: { apiKey } });
}
