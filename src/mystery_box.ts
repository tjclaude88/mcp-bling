// src/mystery_box.ts
// All Mystery Box logic — pools, roller, scorer, paragraph renderer,
// lore frame, Named Subjects, orchestrator. See:
//   docs/superpowers/specs/2026-04-13-mystery-box-design.md
//
// Pools are intentionally small at first ship (~6 per category). Grow
// to the spec's 30–60 per category as a follow-up — see plan §16.
//
// Note: type imports grow as subsequent tasks reference more of them.
// Keeping imports minimal — only the names actually used below.

import type { TraitBand, TraitEntry, TraitPool, PerTrait } from "./types.js";

// ---------------------------------------------------------------------------
// Random number generation
// ---------------------------------------------------------------------------

/**
 * Mulberry32 — a small deterministic 32-bit PRNG.
 * Returns a function that yields numbers in [0, 1) just like Math.random.
 *
 * Used in tests for reproducible rolls. Production rolls use Math.random
 * (passed through an `Rng` parameter so the orchestrator stays pure).
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A function returning a number in [0, 1). Math.random satisfies this. */
export type Rng = () => number;

// ---------------------------------------------------------------------------
// Trait band weights and weighted selection
// ---------------------------------------------------------------------------

/**
 * Per-draw probability of each rarity band, in percent.
 * The same weights apply across every category for consistency,
 * which keeps the rarity.tools formula simple.
 */
export const BAND_WEIGHTS: Record<TraitBand, number> = {
  Common: 50,
  Uncommon: 25,
  Rare: 15,
  Legendary: 8,
  Mythic: 2,
};

/**
 * Pick one entry from a pool, weighted by its band.
 *
 * Two-stage algorithm so that the probability of *each band* matches
 * BAND_WEIGHTS regardless of how many entries each band has:
 *
 *   1. Group the pool's entries by band.
 *   2. Pick a band weighted by BAND_WEIGHTS (restricted to bands present).
 *   3. Pick uniformly among the entries in that band.
 *
 * This is critical: if we just summed BAND_WEIGHTS across every entry,
 * a band with N entries would get N × its intended probability — and
 * the rarity score formula (which uses BAND_WEIGHTS as the per-band
 * probability) would no longer match reality.
 *
 * Consumes two rng() calls per invocation (deterministic in tests).
 */
export function pickWeighted(pool: TraitPool, rng: Rng): TraitEntry {
  if (pool.length === 0) {
    throw new Error("pickWeighted called on an empty pool");
  }

  // Stage 1: group by band
  const byBand = new Map<TraitBand, TraitEntry[]>();
  for (const entry of pool) {
    const list = byBand.get(entry.band) ?? [];
    list.push(entry);
    byBand.set(entry.band, list);
  }

  // Stage 2: pick a band weighted by BAND_WEIGHTS, restricted to bands present
  const present: TraitBand[] = Array.from(byBand.keys());
  const total = present.reduce((sum, b) => sum + BAND_WEIGHTS[b], 0);
  let roll = rng() * total;
  let chosen: TraitBand = present[present.length - 1]!;     // safe fallback for float drift
  for (const b of present) {
    roll -= BAND_WEIGHTS[b];
    if (roll <= 0) { chosen = b; break; }
  }

  // Stage 3: pick uniformly within the band
  const candidates = byBand.get(chosen)!;
  return candidates[Math.floor(rng() * candidates.length)]!;
}

// ---------------------------------------------------------------------------
// Trait pools — the data layer
// ---------------------------------------------------------------------------
//
// Starter pools: ~6 entries per category, spread across the 5 bands.
// Spec target is 30–60 per category — grow these in a follow-up commit.
// Adding entries does NOT require touching any logic.

const NAMES: TraitPool = [
  { value: "Steve",   band: "Common" },
  { value: "Karen",   band: "Common" },
  { value: "Derek",   band: "Uncommon" },
  { value: "Priya",   band: "Uncommon" },
  { value: "Brenda from Accounts", band: "Rare" },
  { value: "Günther", band: "Legendary" },
  { value: "The One Who Doesn't Speak", band: "Mythic" },
];

const JOB_TITLES: TraitPool = [
  { value: "Senior Developer",          band: "Common" },
  { value: "QA Lead",                   band: "Common" },
  { value: "Regional Manager",          band: "Uncommon" },
  { value: "ASCII Comptroller",         band: "Rare" },
  { value: "Wizard of Light Bulb Moments", band: "Legendary" },
  { value: "Galactic Viceroy of Research Excellence", band: "Mythic" },
];

const DESK_SETUPS: TraitPool = [
  { value: "a single dying succulent",                     band: "Common" },
  { value: "a coffee mug labelled WORLD'S OKAYEST DBA",    band: "Common" },
  { value: "a moleskine that nobody has ever seen open",   band: "Uncommon" },
  { value: "a 9-monitor day-trading rig",                  band: "Rare" },
  { value: "forty unwashed mugs in a stable equilibrium",  band: "Legendary" },
  { value: "a full-size cardboard cutout of Nicolas Cage", band: "Mythic" },
];

const HABITS: TraitPool = [
  { value: "sends emails at midnight",                                       band: "Common" },
  { value: "replies-all to everything",                                      band: "Common" },
  { value: "microwaves fish despite three separate HR warnings",             band: "Uncommon" },
  { value: "hums Enya during code reviews",                                  band: "Rare" },
  { value: "kept a folding cot in a server cabinet during a year-long migration", band: "Legendary" },
  { value: "has not spoken in a meeting since 2019 and still gets bonuses",  band: "Mythic" },
];

const COFFEE_RITUALS: TraitPool = [
  { value: "black coffee, no nonsense",                                    band: "Common" },
  { value: "tea with milk, exactly one sugar",                             band: "Common" },
  { value: "a French press brewed at the desk every morning",              band: "Uncommon" },
  { value: "a Starbucks Medicine Ball, every day, no exceptions",          band: "Rare" },
  { value: "Soylent only, and will tell you about it",                     band: "Legendary" },
  { value: "a kombucha SCOBY fermenting next to the keyboard",             band: "Mythic" },
];

const MEETING_ENERGY: TraitPool = [
  { value: "always on mute",                                            band: "Common" },
  { value: "always 4 minutes late, always with a reason",               band: "Common" },
  { value: "interrupts with 'let me just jump in here'",                band: "Uncommon" },
  { value: "monologues for 47 uninterrupted minutes",                   band: "Rare" },
  { value: "books 7 a.m. meetings 'to respect everyone's focus time'",  band: "Legendary" },
  { value: "speaks only in acronyms nobody else recognises",            band: "Mythic" },
];

const PASSIVE_AGGRESSIVE: TraitPool = [
  { value: "Per my last email",                            band: "Common" },
  { value: "Just circling back",                           band: "Common" },
  { value: "Happy to discuss offline",                     band: "Uncommon" },
  { value: "Resending with urgency (same email, 8 minutes later, red exclamation)", band: "Rare" },
  { value: "As discussed (it was not discussed)",          band: "Legendary" },
  { value: "Adding a +1 with no further comment",          band: "Mythic" },
];

const PHYSICAL_HEIGHT: TraitPool = [
  { value: "average build",                                   band: "Common" },
  { value: "shorter than expected",                           band: "Common" },
  { value: "tall enough to comment on it",                    band: "Uncommon" },
  { value: "somehow taller in meetings than in person",      band: "Rare" },
  { value: "looms",                                           band: "Legendary" },
  { value: "occupies more conceptual than physical space",    band: "Mythic" },
];

const PHYSICAL_ACCESSORY: TraitPool = [
  { value: "a single lanyard with one badge",                     band: "Common" },
  { value: "a corporate fleece",                                  band: "Common" },
  { value: "reading glasses on a chain",                          band: "Uncommon" },
  { value: "a lanyard with 14 badges of varying importance",      band: "Rare" },
  { value: "a single shipwreck earring they will tell you about", band: "Legendary" },
  { value: "an ID badge from a company that no longer exists",    band: "Mythic" },
];

const PHYSICAL_EXPRESSION: TraitPool = [
  { value: "polite disappointment",                  band: "Common" },
  { value: "neutral, unreadable",                    band: "Common" },
  { value: "the face of someone about to send a long email", band: "Uncommon" },
  { value: "eyes that have seen SAP",                band: "Rare" },
  { value: "permanently mid-sentence",               band: "Legendary" },
  { value: "wears nineteen subtly different smiles", band: "Mythic" },
];

const PHYSICAL_MATERIAL: TraitPool = [
  { value: "a cardigan, at least one",                              band: "Common" },
  { value: "polo shirt, jeans, sensible shoes",                     band: "Common" },
  { value: "permed hair that hasn't changed since 1994",            band: "Uncommon" },
  { value: "the exact outfit from their LinkedIn profile, 1999",    band: "Rare" },
  { value: "a tie pinned with what may be a live firefly",          band: "Legendary" },
  { value: "dressed entirely in clothes received as conference swag", band: "Mythic" },
];

const THEME_PRIMARY: TraitPool = [
  { value: "#9C6B3A", band: "Common" },     // office-tan
  { value: "#2D4A4F", band: "Common" },     // accountant teal
  { value: "#5C3D2E", band: "Uncommon" },   // boardroom mahogany
  { value: "#A23E48", band: "Rare" },       // expense-report red
  { value: "#1F4E79", band: "Legendary" },  // PowerPoint navy
  { value: "#FFCD3C", band: "Mythic" },     // overhead-projector yellow
];

const THEME_ACCENT: TraitPool = [
  { value: "#D9D9D9", band: "Common" },
  { value: "#7F7F7F", band: "Common" },
  { value: "#C0BFA8", band: "Uncommon" },
  { value: "#6E8B3D", band: "Rare" },
  { value: "#503D2E", band: "Legendary" },
  { value: "#FF6F61", band: "Mythic" },
];

/**
 * All trait pools, keyed by category name. The category names match the
 * keys used downstream by the roller and the per_trait breakdown.
 */
export const POOLS = {
  name: NAMES,
  job_title: JOB_TITLES,
  desk_setup: DESK_SETUPS,
  habit: HABITS,
  coffee_ritual: COFFEE_RITUALS,
  meeting_energy: MEETING_ENERGY,
  passive_aggressive: PASSIVE_AGGRESSIVE,
  physical_height: PHYSICAL_HEIGHT,
  physical_accessory: PHYSICAL_ACCESSORY,
  physical_expression: PHYSICAL_EXPRESSION,
  physical_material: PHYSICAL_MATERIAL,
  theme_primary: THEME_PRIMARY,
  theme_accent: THEME_ACCENT,
} as const;

export type CategoryKey = keyof typeof POOLS;

// ---------------------------------------------------------------------------
// Rarity scoring — rarity.tools formula
// ---------------------------------------------------------------------------

/**
 * Compute the rarity.tools score for a set of rolled traits.
 *
 * For each trait, contribute `1 / (band probability)`. Sum it up.
 *
 *   Common (50%)    → 2 points
 *   Uncommon (25%)  → 4 points
 *   Rare (15%)      → ~6.7 points
 *   Legendary (8%)  → 12.5 points
 *   Mythic (2%)     → 50 points
 *
 * The huge gap between Common and Mythic is the point — a single Mythic
 * trait does more for the score than eight Commons combined.
 */
export function rarityScore(traits: PerTrait[]): number {
  let score = 0;
  for (const trait of traits) {
    const probability = BAND_WEIGHTS[trait.band] / 100;
    score += 1 / probability;
  }
  return score;
}
