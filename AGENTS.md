# AGENTS.md

## Architecture

- `apps/demo-service`: deliberately breakable Express checkout service. Healthy code reads `PAYMENT_TIMEOUT_MS`.
- `apps/orchestrator`: Discord, Elasticsearch, OpenRouter Chat Completions, GitHub webhook/log, incident, and PR orchestration.
- `knowledge`: Markdown evidence seeded into `superplane-knowledge`.
- `scripts`: Elastic setup, Discord command registration, and guarded demo-mode switching.
- `.github/workflows/deploy.yml`: simulated production deployment and smoke test.

## Commands

Run `npm ci`, then validate changes with:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Use `npm run demo:break` and `npm run demo:restore` only for the documented controlled scenario.

## Conventions

- TypeScript ESM with `.js` import suffixes, strict types, small functions, and Zod at external boundaries.
- Route model calls through the OpenRouter client and keep OpenRouter model slugs configurable.
- Keep integrations injectable enough for deterministic tests.
- Log lifecycle events as JSON; never log tokens, secrets, authorization headers, or complete unbounded external payloads.
- Preserve the distinction between observed evidence, inferred causes, and suggested remediation.

## Security boundaries

- Verify the GitHub signature against the raw body before parsing or handling a webhook.
- A failure may investigate and notify, but must not modify GitHub until `/fix-latest` approval.
- AI-generated fixes may modify only allowlisted `.ts` files under `apps/demo-service/src/`. Never extend the allowlist to workflows, secrets, authentication, or orchestrator security code without an explicit product/security decision.
- Never execute AI-proposed shell commands.
- Never commit credentials or `.env`.
- Never directly merge a pull request.
