import { describe, it, expect, afterEach } from "vitest";
import { hexToAnsi, generateThemeForPlatform, rollIdentityHandler, saveLastRollHandler, _resetLastRollForTests } from "../src/tools.js";
import type { BlingIdentity } from "../src/types.js";
import { writeFile, unlink, readFile, stat } from "node:fs/promises";

// A minimal identity for testing theme generation
const testIdentity: BlingIdentity = {
  name: "TestBot",
  personality: { tone: "calm", formality: "formal", humor: "none" },
  theme: { primary_color: "#FF6B35", accent_color: "#004E89" },
};

describe("hexToAnsi", () => {
  it("converts a hex colour to an ANSI 24-bit colour code", () => {
    // #FF6B35 = RGB(255, 107, 53)
    const result = hexToAnsi("#FF6B35");
    expect(result).toBe("\x1b[38;2;255;107;53m");
  });

  it("converts black (#000000)", () => {
    expect(hexToAnsi("#000000")).toBe("\x1b[38;2;0;0;0m");
  });

  it("converts white (#FFFFFF)", () => {
    expect(hexToAnsi("#FFFFFF")).toBe("\x1b[38;2;255;255;255m");
  });
});

describe("generateThemeForPlatform", () => {
  it("generates terminal theme with ANSI codes", () => {
    const result = generateThemeForPlatform(testIdentity, "terminal");

    expect(result.platform).toBe("terminal");
    expect(result).toHaveProperty("primary_ansi");
    expect(result).toHaveProperty("accent_ansi");
    expect(result).toHaveProperty("reset");
    expect(result).toHaveProperty("emoji_prefix");
  });

  it("generates web theme with CSS variables", () => {
    const result = generateThemeForPlatform(testIdentity, "web");

    expect(result.platform).toBe("web");
    expect(result).toHaveProperty("css_variables");

    const css = (result as Record<string, unknown>).css_variables as Record<string, string>;
    expect(css["--bling-primary"]).toBe("#FF6B35");
    expect(css["--bling-accent"]).toBe("#004E89");
    expect(css["--bling-name"]).toBe("TestBot");
  });

  it("generates slack theme", () => {
    const result = generateThemeForPlatform(testIdentity, "slack");

    expect(result.platform).toBe("slack");
    expect(result).toHaveProperty("display_name", "TestBot");
    expect(result).toHaveProperty("sidebar_color", "#FF6B35");
  });

  it("generates discord theme", () => {
    const result = generateThemeForPlatform(testIdentity, "discord");

    expect(result.platform).toBe("discord");
    expect(result).toHaveProperty("display_name", "TestBot");
    expect(result).toHaveProperty("embed_color", "#FF6B35");
  });

  it("generates ide theme", () => {
    const result = generateThemeForPlatform(testIdentity, "ide");

    expect(result.platform).toBe("ide");
    expect(result).toHaveProperty("display_name", "TestBot");
    expect(result).toHaveProperty("primary_color", "#FF6B35");
  });

  it("handles unknown platforms gracefully", () => {
    const result = generateThemeForPlatform(testIdentity, "some_new_platform");

    expect(result.platform).toBe("unknown");
    expect(result).toHaveProperty("requested", "some_new_platform");
    expect(result).toHaveProperty("primary_color", "#FF6B35");
    expect(result).toHaveProperty("message");
  });
});

describe("rollIdentityHandler", () => {
  it("returns a JSON string with identity, rarity, paragraph, and framed", async () => {
    const result = await rollIdentityHandler();
    const text = result.content[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.identity).toBeDefined();
    expect(parsed.rarity).toBeDefined();
    expect(parsed.paragraph).toBeDefined();
    expect(parsed.framed).toBeDefined();
    expect(typeof parsed.identity.name).toBe("string");
  });
});

describe("saveLastRollHandler", () => {
  const testPath = "tests/fixtures/_temp_save.json";
  const backupPath = `${testPath}.bak`;

  afterEach(async () => {
    try { await unlink(testPath); } catch { /* ignore */ }
    try { await unlink(backupPath); } catch { /* ignore */ }
    _resetLastRollForTests();
  });

  it("returns an error when nothing has been rolled this session", async () => {
    _resetLastRollForTests();
    const result = await saveLastRollHandler(testPath);
    const text = result.content[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toMatch(/no roll/i);
    expect(result.isError).toBe(true);
  });

  it("writes the most recent roll's identity to the supplied path", async () => {
    await rollIdentityHandler();
    const result = await saveLastRollHandler(testPath);
    const text = result.content[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.ok).toBe(true);
    const written = JSON.parse(await readFile(testPath, "utf-8"));
    expect(typeof written.name).toBe("string");
    expect(written.office).toBeDefined();
    expect(written.homunculus).toBeDefined();
  });

  it("backs up an existing file before overwriting", async () => {
    await writeFile(testPath, JSON.stringify({ name: "OldConfig" }), "utf-8");
    await rollIdentityHandler();
    const result = await saveLastRollHandler(testPath);
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed.ok).toBe(true);
    expect(parsed.backup).toBe(backupPath);

    const backup = JSON.parse(await readFile(backupPath, "utf-8"));
    expect(backup.name).toBe("OldConfig");
    const newConfig = JSON.parse(await readFile(testPath, "utf-8"));
    expect(newConfig.name).not.toBe("OldConfig");
  });

  it("does not create a backup when the target file does not exist", async () => {
    await rollIdentityHandler();
    const result = await saveLastRollHandler(testPath);
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed.ok).toBe(true);
    expect(parsed.backup).toBeNull();
    await expect(stat(backupPath)).rejects.toThrow();
  });
});
