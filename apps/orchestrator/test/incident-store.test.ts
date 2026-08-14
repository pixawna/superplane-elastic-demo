import { describe, expect, it } from "vitest";
import { IncidentStore } from "../src/incidents/store.js";

describe("incident idempotency", () => {
  it("reserves a workflow run once while investigation is in progress", () => {
    const store = new IncidentStore();
    expect(store.begin(42)).toBe(true);
    expect(store.begin(42)).toBe(false);
    store.failProcessing(42);
    expect(store.begin(42)).toBe(true);
  });
});
