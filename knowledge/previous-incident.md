# Previous Incident: Checkout Startup Failure

On 2026-05-18 checkout failed during startup immediately after a configuration cleanup. GitHub Actions showed `CONFIGURATION_ERROR: PAYMENT_TIMEOUT_MS is required for production checkout startup`.

The change had accidentally replaced `process.env.PAYMENT_TIMEOUT_MS` with `process.env.PAYMENT_TIMEOUT`. Production still supplied `PAYMENT_TIMEOUT_MS=1500`, so the application saw no value.

The team restored the original variable name in `apps/demo-service/src/config.ts`. No workflow or secret changes were required. The follow-up action was to preserve the production variable contract in the runbook and smoke test.
