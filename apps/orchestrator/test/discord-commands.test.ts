import { describe, expect, it } from "vitest";
import { discordCommands } from "../src/discord/commands.js";

describe("Discord commands", () => {
  it("uses remediation as the incident review entry point", () => {
    const names = discordCommands.map((command) => command.name);
    expect(names).toContain("remediation");
    expect(names).not.toContain("incident");
  });
});
