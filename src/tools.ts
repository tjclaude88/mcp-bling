// src/tools.ts
// MCP tool definitions and platform theme generation.
// Theme helpers are exported so tests can call them directly.

import type { BlingIdentity } from "./types.js";

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
