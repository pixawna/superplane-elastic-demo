import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const mode = process.argv[2];
if (mode !== "broken" && mode !== "healthy") {
  throw new Error("Usage: npm run demo:break or npm run demo:restore");
}
const configPath = path.resolve("apps/demo-service/src/config.ts");
const source = await readFile(configPath, "utf8");
const healthy = "const timeout = env.PAYMENT_TIMEOUT_MS;";
const broken = "const timeout = env.PAYMENT_TIMEOUT;";
const from = mode === "broken" ? healthy : broken;
const to = mode === "broken" ? broken : healthy;
if (!source.includes(from)) {
  if (source.includes(to)) {
    console.log(`Demo service is already ${mode}.`);
    process.exit(0);
  }
  throw new Error(
    "Could not find the guarded timeout assignment; refusing to edit an unexpected file.",
  );
}
await writeFile(configPath, source.replace(from, to), "utf8");
console.log(`Demo service set to ${mode}: ${to}`);
