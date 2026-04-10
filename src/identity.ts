// src/identity.ts
// Reads a bling.json file from disk, validates it, and returns
// a BlingIdentity object. Never throws — always returns a LoadResult.

import { readFile } from "node:fs/promises";
import type { BlingIdentity, LoadResult } from "./types.js";

/**
 * Load and validate a bling.json file from the given path.
 *
 * Returns { ok: true, identity } on success.
 * Returns { ok: false, error } with a helpful message on failure.
 */
export async function loadIdentity(filePath: string): Promise<LoadResult> {
  // Step 1: Read the file
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return {
        ok: false,
        error: `No bling.json found at ${filePath}. Create one to give your bot an identity.`,
      };
    }
    if (isNodeError(err) && err.code === "EACCES") {
      return {
        ok: false,
        error: `Cannot read bling.json at ${filePath}. Check file permissions.`,
      };
    }
    return {
      ok: false,
      error: `Could not read bling.json at ${filePath}: ${String(err)}`,
    };
  }

  // Step 2: Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: `bling.json has a syntax error: check for missing commas or brackets in ${filePath}.`,
    };
  }

  // Step 3: Validate required fields
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {
      ok: false,
      error: `bling.json must be a JSON object, not ${Array.isArray(data) ? "an array" : typeof data}.`,
    };
  }

  const obj = data as Record<string, unknown>;

  // Check top-level required fields
  if (typeof obj.name !== "string") {
    return {
      ok: false,
      error: `bling.json is missing required field: name. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
    };
  }

  // Check personality
  if (typeof obj.personality !== "object" || obj.personality === null) {
    return {
      ok: false,
      error: `bling.json is missing required field: personality. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
    };
  }
  const personality = obj.personality as Record<string, unknown>;
  for (const field of ["tone", "formality", "humor"]) {
    if (typeof personality[field] !== "string") {
      return {
        ok: false,
        error: `bling.json is missing required field: personality.${field}. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
      };
    }
  }

  // Check theme
  if (typeof obj.theme !== "object" || obj.theme === null) {
    return {
      ok: false,
      error: `bling.json is missing required field: theme. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
    };
  }
  const theme = obj.theme as Record<string, unknown>;
  for (const field of ["primary_color", "accent_color"]) {
    if (typeof theme[field] !== "string") {
      return {
        ok: false,
        error: `bling.json is missing required field: theme.${field}. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
      };
    }
    // Validate hex colour format (e.g. "#FF6B35" — # followed by 6 hex digits)
    if (!/^#[0-9A-Fa-f]{6}$/.test(theme[field] as string)) {
      return {
        ok: false,
        error: `bling.json theme.${field} must be a hex colour like #FF6B35. Got: "${theme[field]}".`,
      };
    }
  }

  // All required fields present — return the identity
  return { ok: true, identity: obj as unknown as BlingIdentity };
}

/** Type guard for Node.js errors that have a `code` property. */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
