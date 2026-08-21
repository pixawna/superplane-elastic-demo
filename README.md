# SuperPlane + Elastic Demo

A small orchestration demo connecting Discord, Elasticsearch, OpenRouter, GitHub Actions and Superplane. It answers company questions from indexed evidence and turns a failed deployment into a human-approved pull request—never an automatic code change.

## What this demonstrates

```text
Discord question → SuperPlane orchestrator → Elasticsearch → OpenRouter → sourced Discord answer

GitHub failure → Discord alert → SuperPlane investigation → GitHub logs + Elasticsearch
               → remediation plan → /remediation → Approve or Stop
               → approved change → GitHub pull request → CI result
```

Workflow A supports a bot mention such as `@superplane why did checkout fail?` and `/ask question:...`. The model receives only the retrieved Elasticsearch context and must say when that context is insufficient. Responses list their source titles.

Workflow B receives a signed `workflow_run` webhook and immediately alerts Discord that investigation has started. It then collects failed jobs and bounded log excerpts, retrieves related knowledge, and posts a structured incident with observed facts, inferred root cause, evidence, and a remediation plan. A person runs `/remediation` (or the backward-compatible `/fix-latest`) and must click **Approve and create PR** before any repository change occurs. Clicking **Stop — no changes** records the decision and creates no branch, commit, or PR. Approved changes are limited to TypeScript files under `apps/demo-service/src/` and are opened as an unmerged PR.

## Architecture

```text
┌─────────┐  mention / slash command  ┌────────────────────────────┐
│ Discord │ ─────────────────────────▶ │ SuperPlane Orchestrator    │
│         │ ◀───────────────────────── │                            │
└─────────┘       answer / incident    │  ┌──────────┐ ┌─────────┐ │
                                      │  │ Elastic  │ │OpenRouter│ │
┌─────────┐  workflow_run webhook     │  └────▲─────┘ └────▲────┘ │
│ GitHub  │ ─────────────────────────▶ │       │ context     │      │
│ Actions │                            │  ┌────┴─────────────┴───┐  │
└────▲────┘                            │  │ incident + approval │  │
     │ PR checks                       │  │ state (in memory)   │  │
┌────┴────┐  branch, commit, PR        │  └──────────────────────┘  │
│ GitHub  │ ◀───────────────────────── │                            │
└─────────┘                            └────────────────────────────┘
```

The GitHub Actions runner is the simulated production environment. No Kubernetes, cloud runtime, container registry, or deployment account is needed.

## Prerequisites

- Node.js 20 or later and npm.
- An Elasticsearch deployment that supports `semantic_text`, plus an API key allowed to manage and write `superplane-knowledge`.
- An OpenRouter account with credits and an API key allowed to use the configured model.
- A Discord application and bot installed in a test server.
- A GitHub repository, fine-grained token, and webhook.
- A public HTTPS URL for the locally running webhook, typically from a tunnel such as ngrok or Cloudflare Tunnel.

Credentials are only read from environment variables. Copy `.env.example` to `.env`; `.env` is ignored by Git.

### OpenRouter setup

1. Sign in at [OpenRouter](https://openrouter.ai/).
2. Add credits or configure an available provider.
3. Open [API Keys](https://openrouter.ai/settings/keys), create a key named `superplane-elastic-demo`, and copy it once.
4. Set `OPENROUTER_API_KEY` in `.env`.
5. Keep `OPENROUTER_MODEL=openai/gpt-5.6-terra`, or replace it with another OpenRouter model slug that supports structured outputs.

The orchestrator uses OpenRouter's OpenAI-compatible Chat Completions API. Incident analysis and generated fixes request strict JSON-schema responses and still validate the returned data locally with Zod.

## Environment variables

| Variable                   | Purpose                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `PORT`                     | Orchestrator HTTP port; default `3000`.                                                    |
| `DEMO_SERVICE_PORT`        | Checkout demo port; default `3100`.                                                        |
| `DISCORD_BOT_TOKEN`        | Discord bot token.                                                                         |
| `DISCORD_CLIENT_ID`        | Discord application ID used to register commands.                                          |
| `DISCORD_GUILD_ID`         | Test server ID for fast guild-command registration.                                        |
| `DISCORD_ALERT_CHANNEL_ID` | Channel that receives incident and CI messages.                                            |
| `ELASTICSEARCH_URL`        | Elasticsearch HTTPS endpoint.                                                              |
| `ELASTIC_API_KEY`          | Elasticsearch API key.                                                                     |
| `ELASTIC_INDEX`            | Knowledge index; default and required demo value is `superplane-knowledge`.                |
| `ELASTIC_INFERENCE_ID`     | Optional named inference endpoint for `semantic_text`; omit to use the deployment default. |
| `OPENROUTER_API_KEY`       | OpenRouter API key created at `openrouter.ai/settings/keys`.                               |
| `OPENROUTER_MODEL`         | OpenRouter model slug; defaults to `openai/gpt-5.6-terra`.                                 |
| `GITHUB_TOKEN`             | Fine-grained token used for logs, repository files, branches, commits, and PRs.            |
| `GITHUB_OWNER`             | Repository owner or organization.                                                          |
| `GITHUB_REPO`              | Repository name.                                                                           |
| `GITHUB_WEBHOOK_SECRET`    | Random webhook signing secret, at least 16 characters.                                     |
| `PUBLIC_BASE_URL`          | Public HTTPS base URL for this orchestrator.                                               |
| `PAYMENT_TIMEOUT_MS`       | Production checkout timeout; the demo uses `1500`.                                         |

Never expose `.env`, API keys, authorization headers, or webhook secrets in logs or screenshots.

## Elasticsearch setup

1. Create an Elasticsearch deployment and API key.
2. Configure `ELASTICSEARCH_URL`, `ELASTIC_API_KEY`, and `ELASTIC_INDEX=superplane-knowledge`.
3. If your deployment requires an explicit semantic inference endpoint, set `ELASTIC_INFERENCE_ID` to its ID.
4. Create and seed the index:

```bash
npm run elastic:create
npm run elastic:seed
```

The mapping retains `title`, `content`, `source_type`, `source`, and `timestamp` alongside a `semantic_text` field. Search tries combined lexical and semantic retrieval and safely falls back to lexical retrieval if semantic inference is temporarily unavailable. Seeding is repeatable because each Markdown path is the document ID.

## Discord setup

1. In the Discord Developer Portal, create an application and bot.
2. Enable the **Message Content Intent** so mention questions can be read.
3. Install the application in a test server with `bot` and `applications.commands` scopes. Grant only View Channels, Send Messages, Read Message History, and Use Application Commands where needed.
4. Copy the bot token, application ID, server ID, and alert-channel ID into `.env`.
5. Register the guild commands:

```bash
npm run discord:register
```

Guild commands normally appear quickly. The bot never uses `@everyone` and suppresses automatic broad mentions.

The registered commands are `/ask`, `/remediation`, and `/fix-latest`. The last command is retained as an alias for opening the same remediation review; neither command modifies GitHub until the requesting user clicks the approval button. Incidents are posted automatically, so there is no separate `/incident` command.

## GitHub setup

Create a fine-grained token scoped to this repository with:

- Actions: read
- Contents: read and write
- Pull requests: read and write
- Metadata: read

In **Repository Settings → Webhooks**, add `${PUBLIC_BASE_URL}/github/webhook` as an `application/json` webhook. Use exactly the same value as `GITHUB_WEBHOOK_SECRET`, select **Workflow runs**, and enable the webhook. GitHub includes an HMAC SHA-256 signature; unsigned or mismatched requests receive HTTP 401.

GitHub Actions needs only the default read permission because the local orchestrator—not the workflow—creates the PR. Branch protection is recommended. The orchestrator never merges a PR.

## Running locally

```bash
cp .env.example .env
npm ci
npm run elastic:create
npm run elastic:seed
npm run discord:register
npm run dev
```

Check the HTTP process:

```bash
curl --fail http://localhost:3000/health
```

Point the public HTTPS tunnel at port 3000, update `PUBLIC_BASE_URL` and the GitHub webhook URL, then restart the orchestrator.

Useful validation commands:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Demo walkthrough

Use a test Discord server and a disposable demo repository branch. The default repository state is healthy.

1. In Discord ask: `@superplane which timeout variable does checkout use?`
2. Show that the response cites Checkout Service Architecture, the deployment runbook, or the engineering conversation retrieved from Elasticsearch.
3. Introduce the controlled typo:

   ```bash
   npm run demo:break
   git diff -- apps/demo-service/src/config.ts
   git add apps/demo-service/src/config.ts
   git commit -m "Demo checkout configuration regression"
   git push origin main
   ```

4. Open the **Deploy Production** run. Install, build, and unit tests pass. The **Simulated production startup** step fails because production provides only `PAYMENT_TIMEOUT_MS=1500`, while the changed application reads `PAYMENT_TIMEOUT`. The log includes `CONFIGURATION_ERROR: PAYMENT_TIMEOUT_MS is required for production checkout startup`.
5. GitHub sends the signed `workflow_run` webhook. Watch Discord first announce that investigation started, then post the grounded incident and remediation plan.
6. Show the observed failed step, evidence, inferred root cause, confidence, affected files, and suggested action. No branch or code change exists yet.
7. Run `/remediation`. Discord shows the detailed plan with **Approve and create PR** and **Stop — no changes** buttons.
8. Click **Approve and create PR**. This is the explicit human approval boundary. The buttons are bound to the person who requested the review.
9. Open the reported `superplane/fix-<sha>` PR. Its body includes the incident, evidence, proposed fix, original workflow, and AI-generation disclosure.
10. Watch the existing pull-request workflow pass. Discord reports the passing result; the PR remains unmerged.

To demonstrate the rejection path, click **Stop — no changes** instead. The incident is marked stopped and the orchestrator creates no code change, branch, commit, or pull request.

To restore a local working tree manually at any time:

```bash
npm run demo:restore
```

The mode script only replaces the exact guarded assignment in `apps/demo-service/src/config.ts` and refuses unexpected content.

## Security and behavior notes

- Webhook signatures are compared in constant time before JSON parsing.
- Completed failures are reserved by workflow-run ID before investigation, preventing redeliveries from creating duplicate incidents or PRs during one process lifetime.
- Logs are stripped of ANSI color, filtered for important failure lines, include a small tail for context, and are capped before model input.
- AI output is parsed against Zod schemas. A schema-valid fix is checked again against the local file allowlist.
- The model cannot select arbitrary repository paths or execute shell commands.
- Incident state is intentionally in memory for the demo. Restarting the orchestrator clears it; use durable storage before production use.
- PRs are based on the current default branch and are never merged automatically.

## Troubleshooting

### Discord

- **Commands do not appear:** confirm `DISCORD_CLIENT_ID` and `DISCORD_GUILD_ID`, then rerun `npm run discord:register`.
- **Mentions get no response:** enable Message Content Intent, verify channel permissions, and mention the bot account rather than typing plain text.
- **Incident cannot be posted:** verify `DISCORD_ALERT_CHANNEL_ID` refers to a sendable channel visible to the bot.

### Elasticsearch

- **401/403:** regenerate an API key with index management, read, and write privileges for `superplane-knowledge`.
- **`semantic_text` mapping or inference error:** configure a supported inference endpoint and set `ELASTIC_INFERENCE_ID`. Normal questions fall back to lexical search, but index creation still needs a valid semantic mapping.
- **No sources:** run both Elastic scripts and verify the configured index name matches.

### GitHub webhook and PRs

- **401 from the webhook:** the GitHub secret and `GITHUB_WEBHOOK_SECRET` differ, or a proxy changed the raw request body.
- **No event after failure:** select Workflow runs in webhook settings and inspect GitHub's Recent Deliveries response.
- **Logs cannot be retrieved:** grant Actions read permission to the token.
- **Branch or PR creation fails:** grant Contents and Pull requests write permission. Delete or rename an old demo fix branch before repeating the exact same failed SHA.
- **Duplicate delivery:** the orchestrator returns an accepted duplicate response and does not reinvestigate while its in-memory state is alive.

### OpenRouter

- **Authentication/model error:** verify `OPENROUTER_API_KEY`, account credits, and model access; `OPENROUTER_MODEL` defaults to `openai/gpt-5.6-terra`.
- **Unsupported parameter error:** choose a model/provider that supports structured outputs. Incident and fix generation require JSON-schema response formatting.
- **Structured response rejected:** inspect the concise application error and retry. Invalid analyses and disallowed changes are intentionally stopped before GitHub mutation.
- **Question says context is insufficient:** add the missing fact to a Markdown document and rerun `npm run elastic:seed`; do not loosen the grounding prompt.
