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

// ---------------------------------------------------------------------------
// Mystery Box types — see docs/superpowers/specs/2026-04-13-mystery-box-design.md
// ---------------------------------------------------------------------------

/** Rarity bands used for both individual traits and tier derivation. */
export type TraitBand =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Legendary"
  | "Mythic";

/** The 5 tier labels for rolled bots. Source: spec §5.4. */
export type Tier =
  | "Filing Clerk"
  | "Team Lead"
  | "Middle Manager"
  | "C-Suite"
  | "HR Warned Us About";

/**
 * One option inside a trait pool.
 * `value` is what gets stored on the rolled identity.
 * `band` controls how often the option is selected and what it scores.
 */
export interface TraitEntry {
  value: string;
  band: TraitBand;
}

/** A weighted pool of options for a single category (e.g. office habits). */
export type TraitPool = readonly TraitEntry[];

/** Behavioural traits added to rolled identities. */
export interface OfficeBlock {
  job_title: string;
  desk_setup: string;
  habit: string;
  coffee_ritual: string;
  meeting_energy: string;
  passive_aggressive: string;
}

/** Lore header for rolled identities — the HOMUNCULUS classified-document frame. */
export interface HomunculusBlock {
  subject_id: string;
  cohort: string;
  classification: Tier;
  ingested: string;
  flag: string;
}

/** A complete rolled identity. Extends the base BlingIdentity with new optional blocks. */
export interface RolledIdentity extends BlingIdentity {
  office: OfficeBlock;
  homunculus: HomunculusBlock;
}

/** One line in the per-trait rarity breakdown. */
export interface PerTrait {
  category: string;
  value: string;
  band: TraitBand;
}

/** The rarity report attached to a rolled identity. */
export interface RarityReport {
  score: number;
  tier: Tier;
  percentile: number;
  per_trait: PerTrait[] | null;
}

/** The full payload returned by the roll_identity MCP tool. */
export interface RollOutput {
  identity: RolledIdentity;
  rarity: RarityReport;
  paragraph: string;
  framed: string;
  lore: string | null;
}
