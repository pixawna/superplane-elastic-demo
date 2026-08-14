# Checkout Deployment Runbook

The production simulation runs in this order: install dependencies, compile TypeScript, run unit tests, start checkout-service with production environment variables, call the health endpoint, then submit a checkout smoke test.

Production supplies `PAYMENT_TIMEOUT_MS=1500`. If startup reports that the timeout is missing, first verify the application reads the exact `PAYMENT_TIMEOUT_MS` name. Do not add a second environment variable to hide an application typo.

The health check must return HTTP 200 with `{ "status": "ok" }`. The checkout smoke test must return an approved result and `paymentTimeoutMs: 1500`. Stop the service after the checks even when a check fails.
