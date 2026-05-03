// src/tools.ts
// MCP tool definitions and platform theme generation.
// Theme helpers are exported so tests can call them directly.

import type { BlingIdentity, RollOutput, Variant } from "./types.js";
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
export async function rollIdentityHandler(rng?: Rng, variant: Variant = "wow"): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: RollOutput;
}> {
  const out = rng ? rollIdentity(rng, variant) : rollIdentity(Math.random, variant);
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
  // Tool 1: get_identity
  server.registerTool(
    "get_identity",
    {
      title: "Who's My Bot?",
      description:
        "Who's your bot? Pull up the full identity — name, personality, quirks, appearance, and theme colours. Returns whatever's configured in bling.json. Errors if bling.json is missing or invalid.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    () => getIdentityHandler(blingPath),
  );

  // Tool 2: get_theme_for_platform
  server.registerTool(
    "get_theme_for_platform",
    {
      title: "Style Me Up",
      description:
        "Get your bot's colours formatted for a specific platform. Supported: terminal (ANSI codes), web (CSS variables), slack, discord, ide. Unknown platforms get the raw hex colours.",
      inputSchema: {
        platform: z
          .string()
          .describe("Target platform: terminal, web, slack, discord, or ide"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ platform }) => getThemeForPlatformHandler(blingPath, platform),
  );

  // Tool 3: roll_identity
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
      title: "Spin the Wheel",
      description:
        "Give your bot a random identity. Pick a variant: wow (Weird Office Workers — quirky office drones, default) or legends (historical figures in absurd corporate roles). Returns a name, job title, traits, rarity score, and a screenshot-ready share card. Stores the roll for save_last_roll.",
      inputSchema: {
        variant: z
          .enum(["wow", "legends"])
          .optional()
          .describe("Which identity pool to use: wow (Weird Office Workers, default) or legends (historical figures in absurd corporate roles)."),
      },
      outputSchema: rollIdentityOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ variant }: { variant?: Variant }) => {
      const out = await rollIdentityHandler(undefined, variant ?? "wow");
      return {
        content: out.content,
        structuredContent: out.structuredContent as unknown as { [k: string]: unknown },
      };
    },
  );

  // Tool 4: save_last_roll
  const saveLastRollOutputSchema = {
    ok: z.boolean().optional(),
    written_to: z.string().optional(),
    backup: z.string().nullable().optional(),
    error: z.string().optional(),
  };

  server.registerTool(
    "save_last_roll",
    {
      title: "Lock It In",
      description:
        "Save the most-recent roll as your bot's permanent identity. Errors if no roll has happened this session — call roll_identity first. Writes to bling.json, backing up any existing config to bling.json.bak first. Returns the backup path (or null if nothing was overwritten).",
      inputSchema: {},
      outputSchema: saveLastRollOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    () => saveLastRollHandler(blingPath),
  );

  // Tool 5: get_rarity_report
  const rarityReportOutputSchema = {
    report: z.string().optional(),
    error: z.string().optional(),
  };

  server.registerTool(
    "get_rarity_report",
    {
      title: "Show Off My Card",
      description:
        "Get the formatted share card for the most-recent roll — a plain-text block ready to screenshot and post. Errors if no roll has happened this session.",
      inputSchema: {},
      outputSchema: rarityReportOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    getRarityReportHandler,
  );
}
