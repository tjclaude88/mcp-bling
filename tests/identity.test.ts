import { describe, it, expect } from "vitest";
import { loadIdentity } from "../src/identity.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// __dirname equivalent for ESM modules
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Helper to get the path to a test fixture file
function fixture(name: string): string {
  return join(__dirname, "fixtures", name);
}

describe("loadIdentity", () => {
  it("loads a valid bling.json file", async () => {
    const result = await loadIdentity(fixture("valid.json"));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.name).toBe("TestBot");
      expect(result.identity.personality.tone).toBe("calm");
      expect(result.identity.theme.primary_color).toBe("#111111");
    }
  });

  it("returns an error when the file does not exist", async () => {
    const result = await loadIdentity("/nonexistent/path/bling.json");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("No bling.json found");
    }
  });

  it("returns an error when the file is not valid JSON", async () => {
    const result = await loadIdentity(fixture("bad-json.txt"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("syntax error");
    }
  });

  it("returns an error when required fields are missing", async () => {
    const result = await loadIdentity(fixture("missing-fields.json"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("missing required field");
    }
  });

  it("leaves optional fields undefined when absent", async () => {
    const result = await loadIdentity(fixture("valid.json"));

    // valid.json only has required fields — optional ones should be undefined
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.avatar_url).toBeUndefined();
      expect(result.identity.quirks).toBeUndefined();
      expect(result.identity.physical).toBeUndefined();
    }
  });

  it("preserves optional fields when present", async () => {
    const result = await loadIdentity(fixture("full.json"));

    // full.json has all optional fields — they should come through
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.avatar_url).toBe("https://example.com/fullbot.png");
      expect(result.identity.quirks?.nervous_habit).toBe("clears throat repeatedly");
      expect(result.identity.physical?.species).toBe("cat");
    }
  });
});
