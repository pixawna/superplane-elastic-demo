# Checkout Service Architecture

The checkout-service validates an order and hands payment authorization to the payment provider. The Commerce Platform team owns the service; incidents should be raised in the engineering alerts Discord channel.

Production configuration uses `PAYMENT_TIMEOUT_MS`. The value is milliseconds and production currently supplies `PAYMENT_TIMEOUT_MS=1500`. The application must never read `PAYMENT_TIMEOUT`, because that variable is not defined in deployment environments.

The service exposes `GET /health` and `POST /checkout`. A successful checkout response includes the applied timeout so the deployment smoke test can verify configuration as well as availability.
