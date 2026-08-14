# Engineering Discord History

**Maya — Commerce Platform:** Can we shorten the checkout timeout variable to `PAYMENT_TIMEOUT` while we tidy config?

**Jon — Production Engineering:** No. The simulated production environment and the real deployment contract both provide `PAYMENT_TIMEOUT_MS`. Keeping the unit in the name prevents seconds/milliseconds mistakes.

**Maya:** Agreed. Checkout will continue to read `PAYMENT_TIMEOUT_MS`, currently set to `1500`.

**Jon:** If the service says it is missing, inspect `apps/demo-service/src/config.ts` before changing deployment configuration.
