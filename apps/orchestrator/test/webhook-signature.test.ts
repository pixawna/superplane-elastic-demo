import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGitHubSignature } from "../src/github/webhook.js";

describe("GitHub webhook signatures", () => {
  it("accepts only the matching sha256 signature", () => {
    const body = Buffer.from('{"ok":true}');
    const secret = "a-long-demo-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyGitHubSignature(body, signature, secret)).toBe(true);
    expect(verifyGitHubSignature(body, `${signature.slice(0, -1)}0`, secret)).toBe(false);
    expect(verifyGitHubSignature(body, undefined, secret)).toBe(false);
  });
});
