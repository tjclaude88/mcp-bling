// src/tools.ts
// MCP tool definitions and platform theme generation.
// Theme helpers are exported so tests can call them directly.

import type { BlingIdentity, RollOutput } from "./types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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
  // Returns the bot's full identity from bling.json
  server.tool(
    "get_identity",
    "Get the bot's full identity — name, personality, quirks, appearance, and theme colours",
    {},
    async () => {
      const result = await loadIdentity(blingPath);

      if (!result.ok) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: result.error }) }],
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result.identity, null, 2) }],
      };
    },
  );

  // Tool 2: get_theme_for_platform
  // Returns styling tailored to a specific platform
  server.tool(
    "get_theme_for_platform",
    "Get platform-specific styling for the bot (terminal, web, slack, discord, or ide)",
    {
      platform: z
        .string()
        .describe("Target platform: terminal, web, slack, discord, or ide"),
    },
    async ({ platform }) => {
      const result = await loadIdentity(blingPath);

      if (!result.ok) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: result.error }) }],
        };
      }

      const theme = generateThemeForPlatform(result.identity, platform);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(theme, null, 2) }],
      };
    },
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
}
