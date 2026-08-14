import { describe, expect, it } from "vitest";
import { excerpt, formatSearchHits } from "../src/elastic/search.js";

describe("Elasticsearch result formatting", () => {
  it("returns safe, compact source information", () => {
    expect(
      formatSearchHits([
        {
          _score: 2.5,
          _source: {
            title: "Runbook",
            content: "Production   uses PAYMENT_TIMEOUT_MS.",
            source: "knowledge/runbook.md",
            source_type: "markdown",
          },
        },
      ]),
    ).toEqual([
      {
        title: "Runbook",
        excerpt: "Production uses PAYMENT_TIMEOUT_MS.",
        source: "knowledge/runbook.md",
        sourceType: "markdown",
        score: 2.5,
      },
    ]);
    expect(excerpt("a".repeat(100), 20)).toHaveLength(20);
  });
});
