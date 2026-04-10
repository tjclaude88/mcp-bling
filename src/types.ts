// src/types.ts
// Type definitions for Bling Bag identity data.
// No logic here — just shapes that other files import.

/** How the bot talks — tone, formality, and humor style. */
export interface Personality {
  tone: string;
  formality: string;
  humor: string;
  catchphrase?: string;
  emoji_style?: string;
}

/** What makes the bot memorable — little behavioral quirks. */
export interface Quirks {
  nervous_habit?: string;
  celebration?: string;
  error_reaction?: string;
  secret_talent?: string;
}

/** What the bot looks like — for UIs that render avatars. */
export interface Physical {
  species?: string;
  height?: string;
  accessory?: string;
  expression?: string;
  material?: string;
}

/** The bot's visual styling — colours used across platforms. */
export interface Theme {
  primary_color: string;
  accent_color: string;
}

/** A complete bot identity — the shape of bling.json. */
export interface BlingIdentity {
  name: string;
  avatar_url?: string;
  personality: Personality;
  quirks?: Quirks;
  physical?: Physical;
  theme: Theme;
}

/**
 * Result of loading a bling.json file.
 * Either succeeds with the identity, or fails with an error message.
 * This pattern avoids throwing exceptions — the caller always gets
 * a result they can inspect.
 */
export type LoadResult =
  | { ok: true; identity: BlingIdentity }
  | { ok: false; error: string };
