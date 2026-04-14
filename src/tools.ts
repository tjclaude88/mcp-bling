// src/tools.ts
// MCP tool definitions and platform theme generation.
// Theme helpers are exported so tests can call them directly.

import type { BlingIdentity, RollOutput } from "./types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFile, copyFile, access } from "node:fs/promises";
import { loadIdentity } from "./identity.js";
import { rollIdentity, type Rng } from "./mystery_box.js";

/**
 * The most-recent roll, kept in memory for `save_last_roll`.
 * Note: single-process / single-client by design — this is fine for the
 * MVP because the MCP server runs as a one-stdio-pair-per-client process.
 */
let lastRoll: RollOutput | null = null;

/**
 * Handler extracted so it can be unit-tested without spinning up a server.
 * Side effect: stores the roll in `lastRoll` for `save_last_roll`.
 * Returns BOTH `content` (text-shaped, for backwards compat) AND
 * `structuredContent` (the parsed object, used by SDK-aware clients).
 *
 * @param rng - optional deterministic RNG for tests; omit in production.
 */
export async function rollIdentityHandler(rng?: Rng): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: RollOutput;
}> {
  const out = rng ? rollIdentity(rng) : rollIdentity();
  lastRoll = out;
  return {
    content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }],
    structuredContent: out,
  };
}

/**
 * Save the most-recent roll's identity to the given path.
 *
 * Safety: if the target file already exists, it is first copied to
 * `<path>.bak` so the user's previous config is recoverable. This
 * matters because `bling.json` may have been hand-tuned.
 *
 * Returns { ok: true, backup: <path|null> } on success,
 *         { error: <message> } with isError: true if nothing has been rolled.
 */
export async function saveLastRollHandler(targetPath: string): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  if (lastRoll === null) {
    const errorBody = {
      error: "No roll has happened this session. Call roll_identity first.",
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(errorBody) }],
      structuredContent: errorBody,
      isError: true,
    };
  }

  // Check whether a target file exists. `access` throws on missing; we
  // narrowly catch that specific case and treat "missing" as "nothing to
  // back up." Any other error (e.g. permission denied) is handled by the
  // outer try/catch below, which abandons the write rather than risk
  // destroying a hand-tuned config.
  let targetExists = false;
  try {
    await access(targetPath);
    targetExists = true;
  } catch {
    // Missing — leave targetExists false.
  }

  let backup: string | null = null;
  try {
    if (targetExists) {
      backup = `${targetPath}.bak`;
      await copyFile(targetPath, backup);
    }
    await writeFile(targetPath, JSON.stringify(lastRoll.identity, null, 2), "utf-8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const errorBody = {
      error: `Failed to save roll: ${message}`,
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(errorBody) }],
      structuredContent: errorBody,
      isError: true,
    };
  }

  const successBody = {
    ok: true as const,
    written_to: targetPath,
    backup,
  };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(successBody) }],
    structuredContent: successBody,
  };
}

/**
 * Return the most-recent roll's framed share card (header + paragraph + footer)
 * wrapped in JSON, for consistency with the other tools that all return
 * JSON. Clients pull `.report` out of the parsed object and display it.
 *
 * Errors with isError: true if no roll has happened this session.
 */
export async function getRarityReportHandler(): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  if (lastRoll === null) {
    const errorBody = {
      error: "No roll has happened this session. Call roll_identity first.",
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(errorBody) }],
      structuredContent: errorBody,
      isError: true,
    };
  }
  const successBody = { report: lastRoll.framed };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(successBody) }],
    structuredContent: successBody,
  };
}

/** Test-only — clears module state between tests. Do not call from production. */
export function _resetLastRollForTests(): void {
  lastRoll = null;
}

/**
 * Handler extracted so it can be unit-tested without spinning up a server.
 * Returns the configured bling.json's identity, with isError on load failure.
 */
export async function getIdentityHandler(blingPath: string): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const result = await loadIdentity(blingPath);
  if (!result.ok) {
    const errorBody = { error: result.error };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(errorBody) }],
      structuredContent: errorBody,
      isError: true,
    };
  }
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result.identity, null, 2) }],
    structuredContent: result.identity as unknown as Record<string, unknown>,
  };
}

/**
 * Handler extracted so it can be unit-tested without spinning up a server.
 * Returns platform-specific theme styling, with isError on load failure.
 */
export async function getThemeForPlatformHandler(
  blingPath: string,
  platform: string,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  const result = await loadIdentity(blingPath);
  if (!result.ok) {
    const errorBody = { error: result.error };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(errorBody) }],
      structuredContent: errorBody,
      isError: true,
    };
  }
  const theme = generateThemeForPlatform(result.identity, platform);
  return {
    content: [{ type: "text" as const, text: JSON.stringify(theme, null, 2) }],
    structuredContent: theme,
  };
}

/**
 * Convert a hex colour string (e.g. "#FF6B35") to a 24-bit ANSI
 * foreground colour escape code.
 *
 * ANSI 24-bit format: \x1b[38;2;R;G;Bm
 * - 38 = foreground colour
 * - 2 = 24-bit mode
 * - R, G, B = 0-255 colour values
 */
export function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Generate a platform-specific theme object from a bot identity.
 * Each platform gets styling in the format it understands.
 */
export function generateThemeForPlatform(
  identity: BlingIdentity,
  platform: string,
): Record<string, unknown> {
  const { name, theme } = identity;

  switch (platform) {
    case "terminal":
      return {
        platform: "terminal",
        emoji_prefix: "\uD83E\uDD16",
        primary_ansi: hexToAnsi(theme.primary_color),
        accent_ansi: hexToAnsi(theme.accent_color),
        reset: "\x1b[0m",
        suggestion:
          "Use primary colour for headings and accent for highlights",
      };

    case "web":
      return {
        platform: "web",
        css_variables: {
          "--bling-primary": theme.primary_color,
          "--bling-accent": theme.accent_color,
          "--bling-name": name,
        },
      };

    case "slack":
      return {
        platform: "slack",
        display_name: name,
        sidebar_color: theme.primary_color,
        accent_color: theme.accent_color,
      };

    case "discord":
      return {
        platform: "discord",
        display_name: name,
        embed_color: theme.primary_color,
        accent_color: theme.accent_color,
      };

    case "ide":
      return {
        platform: "ide",
        display_name: name,
        primary_color: theme.primary_color,
        accent_color: theme.accent_color,
        suggestion: "Use primary colour for inline markers",
      };

    default:
      return {
        platform: "unknown",
        requested: platform,
        primary_color: theme.primary_color,
        accent_color: theme.accent_color,
        message: "Unknown platform. Here are the raw theme colours.",
      };
  }
}

/**
 * Register the Bling Bag MCP tools on a server instance.
 *
 * @param server - The MCP server to register tools on
 * @param blingPath - Path to the bling.json file to read
 */
export function registerTools(server: McpServer, blingPath: string): void {
  // Tool 1: get_identity (modern registerTool, full MCP spec compliance)
  // outputSchema is intentionally omitted — BlingIdentity is open-shape
  // (user-defined fields allowed). The SDK leaves structuredContent
  // as-is when no schema is declared.
  server.registerTool(
    "get_identity",
    {
      title: "Get Bot Identity",
      description:
        "Get the bot's full identity from bling.json — name, personality, quirks, appearance, and theme colours. Returns the configured identity (hand-written or saved from a roll). Errors if bling.json is missing or invalid.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,        // reads from disk
      },
    },
    () => getIdentityHandler(blingPath),
  );

  // Tool 2: get_theme_for_platform (modern registerTool)
  // outputSchema is intentionally omitted — theme shape varies per platform.
  server.registerTool(
    "get_theme_for_platform",
    {
      title: "Get Theme for Platform",
      description:
        "Get platform-specific styling for the bot. Supported platforms: terminal (returns ANSI escape codes), web (CSS variables), slack, discord, ide. Unknown platforms get the raw hex theme colours.",
      inputSchema: {
        platform: z
          .string()
          .describe("Target platform: terminal, web, slack, discord, or ide"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,        // reads from disk
      },
    },
    ({ platform }) => getThemeForPlatformHandler(blingPath, platform),
  );

  // Tool 3: roll_identity
  // Generates a fresh random bot identity from the Mystery Box.
  // Modifies internal state (the in-memory lastRoll cache) so it is not
  // readOnly. Does not touch the filesystem or network.
  const rollIdentityOutputSchema = {
    identity: z.object({}).passthrough(),
    rarity: z.object({
      score: z.number(),
      tier: z.string(),
      percentile: z.number(),
      per_trait: z.array(z.object({
        category: z.string(),
        value: z.string(),
        band: z.string(),
      })).nullable(),
    }),
    paragraph: z.string(),
    framed: z.string(),
    lore: z.string().nullable(),
  };

  server.registerTool(
    "roll_identity",
    {
      title: "Roll a WOW Identity",
      description:
        "WOW — Weird Office Workers. Roll a fresh random bot identity: a quirky office-worker character with a rarity score and a screenshot-ready share card. Stores the roll for save_last_roll and get_rarity_report.",
      inputSchema: {},
      outputSchema: rollIdentityOutputSchema,
      annotations: {
        readOnlyHint: false,        // mutates lastRoll
        destructiveHint: false,     // no filesystem / external side effects
        idempotentHint: false,      // each call produces a fresh random roll
        openWorldHint: false,       // no external systems
      },
    },
    // Wrapper: MCP passes (args, extra) to the callback, but the handler
    // takes an optional `rng` for tests. Ignore MCP's args in production.
    // Cast structuredContent because the SDK's callback signature wants an
    // index-signature type, and RollOutput has known concrete fields.
    async () => {
      const out = await rollIdentityHandler();
      return {
        content: out.content,
        structuredContent: out.structuredContent as unknown as { [k: string]: unknown },
      };
    },
  );

  // Tool 4: save_last_roll
  // Writes the most-recent roll's identity to the bling.json path.
  // Destructive — overwrites the target file (a backup is written first).
  const saveLastRollOutputSchema = {
    ok: z.boolean().optional(),
    written_to: z.string().optional(),
    backup: z.string().nullable().optional(),
    error: z.string().optional(),
  };

  server.registerTool(
    "save_last_roll",
    {
      title: "Save Last WOW Roll to bling.json",
      description:
        "Persist the most-recent WOW roll by writing it to the configured bling.json path. If a file already exists at that path it is first copied to <path>.bak so user-tuned configs are recoverable. Returns the backup path (or null if the target was new).",
      inputSchema: {},
      outputSchema: saveLastRollOutputSchema,
      annotations: {
        readOnlyHint: false,        // writes to disk
        destructiveHint: true,      // overwrites an existing file (with backup)
        idempotentHint: false,      // a second call after a fresh roll writes a different identity
        openWorldHint: true,        // touches the local filesystem
      },
    },
    () => saveLastRollHandler(blingPath),
  );

  // Tool 5: get_rarity_report
  // Returns the formatted share card (lore header, paragraph, lore footer)
  // for the most-recent roll. Pure read of in-memory state.
  const rarityReportOutputSchema = {
    report: z.string().optional(),
    error: z.string().optional(),
  };

  server.registerTool(
    "get_rarity_report",
    {
      title: "Get WOW Rarity Report",
      description:
        "Return the formatted share card (lore header, paragraph, lore footer) for the most-recent WOW roll. The report is plain text designed to be screenshotted directly. Errors if no roll has happened this session.",
      inputSchema: {},
      outputSchema: rarityReportOutputSchema,
      annotations: {
        readOnlyHint: true,         // pure read of lastRoll
        destructiveHint: false,
        idempotentHint: true,       // multiple calls return the same report
        openWorldHint: false,       // no external systems
      },
    },
    getRarityReportHandler,
  );
}
