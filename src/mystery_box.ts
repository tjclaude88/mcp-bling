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

import type { TraitBand, TraitEntry, TraitPool, PerTrait, HomunculusBlock, RolledIdentity } from "./types.js";

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

// ---------------------------------------------------------------------------
// Tier derivation
// ---------------------------------------------------------------------------

/**
 * Tier thresholds from spec §5.4. Lower bound is inclusive; upper is
 * exclusive (so a score of exactly 25 lands in Team Lead, not Filing
 * Clerk).
 */
const TIER_THRESHOLDS: Array<{ min: number; tier: string }> = [
  { min: 500, tier: "HR Warned Us About" },
  { min: 150, tier: "C-Suite" },
  { min: 60,  tier: "Middle Manager" },
  { min: 25,  tier: "Team Lead" },
  { min: 0,   tier: "Filing Clerk" },
];

/** Map a rarity score to a tier label. */
export function tierFromScore(score: number): string {
  for (const { min, tier } of TIER_THRESHOLDS) {
    if (score >= min) return tier;
  }
  return "Filing Clerk";
}

// ---------------------------------------------------------------------------
// HOMUNCULUS metadata generation
// ---------------------------------------------------------------------------

const COHORTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

// FLAG_POOL borrows BAND_WEIGHTS via pickWeighted — changing those
// percentages will shift the flag distribution too. Cosmetic field,
// so this coupling is intentional.
const FLAG_POOL: TraitPool = [
  { value: "normal",              band: "Common" },     // 50% weight
  { value: "flagged for review",  band: "Uncommon" },   // 25% weight
  { value: "redacted",            band: "Legendary" },  // 8% weight
  { value: "Do Not Contact",      band: "Mythic" },     // 2% weight
];

/**
 * Roll the HOMUNCULUS classified-document block that frames every rolled bot.
 *
 * subject_id:    a four-digit zero-padded number
 * cohort:        random weekday name
 * classification: passed in (the tier label)
 * ingested:      a random date in 2024–2026
 * flag:          weighted draw — most are "normal", rare ones are "redacted"
 *                or "Do Not Contact"
 */
export function rollHomunculusBlock(rng: Rng, tier: string): HomunculusBlock {
  const subject_id = String(Math.floor(rng() * 10000)).padStart(4, "0");
  const cohort = COHORTS[Math.floor(rng() * COHORTS.length)]!;
  const year = 2024 + Math.floor(rng() * 3);              // 2024 / 2025 / 2026
  const month = String(1 + Math.floor(rng() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(rng() * 28)).padStart(2, "0");  // cap at 28 so we never produce an invalid date (e.g. Feb 30) without month-specific logic
  const flag = pickWeighted(FLAG_POOL, rng).value;
  return {
    subject_id,
    cohort,
    classification: tier,
    ingested: `${year}-${month}-${day}`,
    flag,
  };
}

// ---------------------------------------------------------------------------
// Paragraph templates
// ---------------------------------------------------------------------------
//
// Slot syntax: {name}, {job_title}, {height}, {material}, {accessory},
// {expression}, {desk_setup}, {habit}, {coffee_ritual}, {meeting_energy},
// {passive_aggressive}.
//
// Templates are written so the slot fragments fit naturally — pool entries
// are stored as full self-contained clauses.

export const PARAGRAPH_TEMPLATES: readonly string[] = [
  "Subject: {name}. Function: {job_title}. Build: {height}. Wears {material}. Carries {accessory}. Expression: {expression}. Habit: {habit}. Drinks {coffee_ritual}. Email sign-off: \"{passive_aggressive}\".",
  "Meet {name} — your new {job_title}. They sit behind {desk_setup}. Most often, they {habit}. They drink {coffee_ritual}. In meetings they are {meeting_energy}.",
  "{name}, {job_title}. Recognise them by {accessory} and {material}. Their build is {height}; their expression, {expression}. Notable habit: {habit}.",
  "Personnel record — {name}, {job_title}. Distinguishing features: {material}; {accessory}; expression of {expression}. Notable behaviours: {habit}; {coffee_ritual}; {meeting_energy}.",
  "Day one report. {name}, your new {job_title}, has already {habit}. Their desk: {desk_setup}. Their drink: {coffee_ritual}. Sign-off of choice: \"{passive_aggressive}\".",
  "Introducing {name}, the office's {job_title}. Wears {material}. Carries {accessory}. They {habit} and they drink {coffee_ritual}. Catchphrase: \"{passive_aggressive}\".",
  "Subject: {name}. Title: {job_title}. Stature: {height}. Demeanour: {expression}. Notable behaviour: {habit}. In meetings: {meeting_energy}.",
  "{job_title}? That would be {name}. Sits behind {desk_setup}. Famously, they {habit}. Avoid the phrase \"{passive_aggressive}\" in their presence.",
  "Field report — {name}, {job_title}. Outfit: {material}. Adornment: {accessory}. Build: {height}. Habit: {habit}. Drinks {coffee_ritual}.",
  "{name}, {job_title}, has joined the team. Recognise them by {accessory} and {material}. Their habit: {habit}. Sign-off: \"{passive_aggressive}\".",
];

/** Pick a template uniformly at random and fill its slots from the identity. */
export function renderParagraph(identity: RolledIdentity, rng: Rng): string {
  const template = PARAGRAPH_TEMPLATES[
    Math.floor(rng() * PARAGRAPH_TEMPLATES.length)
  ]!;
  const slots: Record<string, string> = {
    name: identity.name,
    job_title: identity.office.job_title,
    desk_setup: identity.office.desk_setup,
    habit: identity.office.habit,
    coffee_ritual: identity.office.coffee_ritual,
    meeting_energy: identity.office.meeting_energy,
    passive_aggressive: identity.office.passive_aggressive,
    height: identity.physical?.height ?? "average build",
    accessory: identity.physical?.accessory ?? "a lanyard",
    expression: identity.physical?.expression ?? "neutral",
    material: identity.physical?.material ?? "a cardigan",
  };
  return template.replace(/\{(\w+)\}/g, (_, key) => slots[key] ?? `{${key}}`);
}

// ---------------------------------------------------------------------------
// Lore frame — header + paragraph + footer
// ---------------------------------------------------------------------------

/**
 * Return the English ordinal suffix for a non-negative integer:
 * 1 -> "st", 2 -> "nd", 3 -> "rd", everything else -> "th"
 * (with the 11/12/13 teen exceptions).
 */
function ordinalSuffix(n: number): string {
  const abs = Math.abs(Math.trunc(n));
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (abs % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/**
 * Wrap the rendered paragraph in the HOMUNCULUS classified-document frame.
 * This is the screenshot-ready "share card" string that clients can display
 * verbatim.
 */
export function renderFramed(
  identity: RolledIdentity,
  paragraph: string,
  score: number,
  percentile: number,
): string {
  const h = identity.homunculus;
  const suffix = ordinalSuffix(percentile);
  const header =
    `HOMUNCULUS CORPUS · Subject ${h.subject_id} · Cohort: ${h.cohort}\n` +
    `Classification: ${h.classification} · Rarity ${score.toFixed(1)} · ${percentile}${suffix} percentile`;
  const footer =
    `— RELATABILITY CORPUS v3.1 · ingested ${h.ingested} · ${h.flag}`;
  return `${header}\n\n${paragraph}\n\n${footer}`;
}

// ---------------------------------------------------------------------------
// Named Subjects — hand-authored 1-of-1s
// ---------------------------------------------------------------------------
//
// The five real legendary workplace incidents that anchor the top tier.
// These bypass the random assembler entirely. See spec §5.5.

interface NamedSubject {
  identity: RolledIdentity;
  paragraph: string;
  lore: string;
}

function makeNamedSubject(
  name: string,
  job_title: string,
  paragraph: string,
  lore: string,
  subject_id: string,
  theme: { primary_color: string; accent_color: string },
): NamedSubject {
  const identity: RolledIdentity = {
    name,
    personality: { tone: "guarded", formality: "professional", humor: "dry" },
    theme,
    physical: { species: "human" },
    office: {
      job_title,
      desk_setup: "(redacted by Legal)",
      habit: "(see attached incident report)",
      coffee_ritual: "(unknown)",
      meeting_energy: "(does not attend)",
      passive_aggressive: "(no contemporaneous record)",
    },
    homunculus: {
      subject_id,
      cohort: "Source",
      classification: "HR Warned Us About",
      ingested: "Pre-corpus",
      flag: "Do Not Contact",
    },
  };
  return { identity, paragraph, lore };
}

export const NAMED_SUBJECTS: readonly NamedSubject[] = [
  makeNamedSubject(
    "\"Bob\" from Infrastructure",
    "Senior Software Developer (allegedly)",
    "Meet \"Bob\" — your new Senior Software Developer. Or rather: meet the Chinese consulting firm Bob paid roughly one-fifth of his six-figure salary to do his job, while he watched cat videos, browsed eBay, and posted on Reddit from his desk. Performance reviews praised his clean, well-documented code. Discovered only when Verizon noticed an unfamiliar VPN session.",
    "Verizon RISK Team report, 2013.",
    "0001",
    { primary_color: "#1F4E79", accent_color: "#D9D9D9" },     // corporate blue
  ),
  makeNamedSubject(
    "Joaquín García",
    "Property Supervisor",
    "Meet Joaquín García — your new Property Supervisor. Drew a salary of €37,000 for six years without showing up to work. Caught only when nominated for a long-service award and the people handing it to him realised they did not know who he was. The investigation that followed required two separate departments to admit they each thought he reported to the other.",
    "The Guardian, 2016.",
    "0002",
    { primary_color: "#A23E48", accent_color: "#F2D5A0" },     // Spanish red + sand
  ),
  makeNamedSubject(
    "The Knight Capital Deployment Engineer",
    "Senior Release Engineer",
    "Meet the engineer who deployed Knight Capital's new trading code to seven of eight servers and went home. The eighth server kept running the old code. In 45 minutes the firm executed $460M in unintended trades and effectively bankrupted itself. They were acquired four months later. Nobody talks about the eighth server.",
    "SEC report on Knight Capital Group's market disruption, 2012.",
    "0003",
    { primary_color: "#1A1A1A", accent_color: "#FFD700" },     // bankrupt black + gold
  ),
  makeNamedSubject(
    "The Citibank Sender",
    "Loan Operations Analyst",
    "Meet the Citibank employee who, attempting to send an interest payment, instead wired $900M of Citi's own money to Revlon's creditors with one click of a famously confusing UI. A federal judge initially ruled the recipients could keep the money. (It was later reversed on appeal — but for a long, beautiful moment, it was theirs.)",
    "Reuters, 2020.",
    "0004",
    { primary_color: "#005B96", accent_color: "#F5E0E3" },     // Citi blue + a pale Revlon-red wash (readable contrast)
  ),
  makeNamedSubject(
    "The GitLab Backup Operator",
    "Site Reliability Engineer",
    "Meet the SRE who, during an emergency database recovery in 2017, ran rm -rf on the wrong production server. All five backup methods had silently failed for months. The 18-hour recovery was livestreamed on YouTube. They kept their job. The post-mortem is required reading.",
    "GitLab public post-mortem, 2017.",
    "0005",
    { primary_color: "#FC6D26", accent_color: "#2E2E2E" },     // GitLab orange + terminal black
  ),
];

/** Pick one Named Subject uniformly at random. */
export function pickNamedSubject(rng: Rng): NamedSubject {
  return NAMED_SUBJECTS[Math.floor(rng() * NAMED_SUBJECTS.length)]!;
}
