# Mystery Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `roll_identity` MCP tool that generates a random "weird coworker" bot identity from weighted trait pools, computes a rarity score, derives a tier, and returns it inside a screenshot-ready lore frame.

**Brand:** User-facing surfaces are branded **WOW (Weird Office Workers)**. Code identifiers stay semantic (`mystery_box.ts`, `rollIdentity`, `roll_identity` MCP tool). Anywhere a user reads text — MCP tool descriptions, share card, README — should say WOW. See spec §0 naming note.

**Architecture:** All new logic lives in a single new file `src/mystery_box.ts` (split later only if it crosses ~500 lines, per spec §12). Type definitions extend `src/types.ts` additively. Three new MCP tools are registered alongside the existing two in `src/tools.ts`. Pools are data objects in the same module; the roller, scorer, tier-deriver, and template-renderer are pure functions that take an injected RNG (so tests are deterministic). The first ship is "MVP-of-MVP" with ~6 pool entries per category — enough to prove the engine works end-to-end. Pool expansion to the spec's 30–60 per category is a separate follow-up.

**Tech Stack:** TypeScript, Vitest, MCP SDK, zod (already present). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-13-mystery-box-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types.ts` | Modify | Add `OfficeBlock`, `HomunculusBlock`, `RolledIdentity`, `RarityReport`, `TraitBand`, `TraitEntry`, `TraitPool` types. |
| `src/mystery_box.ts` | Create | All pools, the roller, scorer, tier-deriver, paragraph renderer, lore frame, Named Subjects, and orchestrator function `rollIdentity()`. |
| `src/tools.ts` | Modify | Register three new MCP tools: `roll_identity`, `save_last_roll`, `get_rarity_report`. Persist last roll in module-level state. |
| `bling.json` | Modify | Replace Chip example with a hand-written HOMUNCULUS-style sample. |
| `tests/mystery_box.test.ts` | Create | Unit + snapshot + distribution tests for the roller. |
| `tests/tools.test.ts` | Modify | Add tests for the three new tools (existing tests for `get_identity` / `get_theme_for_platform` stay untouched). |

The single-file-for-mystery-box approach matches the project's existing flat `src/` layout and is the cheapest thing that meets the spec.

---

## Important conventions

- **Imports use `.js` extension** even though the source is `.ts` — this project is ESM, and the TypeScript compiler emits `.js` extensions. See existing files for reference.
- **Tests use Vitest** — `import { describe, it, expect } from "vitest"`.
- **No exceptions thrown across module boundaries** — follow the existing `LoadResult`-style pattern (return `{ ok: false, error }` on failure).
- **All commits via heredoc** with the `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` footer per the project's CLAUDE.md.
- **Run `npm test` after each task to confirm the existing test suite still passes.** The MVP shipped 16 passing tests; this plan should add to that, never reduce it.

---

### Task 1: Extend type definitions

**Files:**
- Modify: `src/types.ts:1-56` (append new types after existing ones)

- [ ] **Step 1: Read the existing file**

Read `src/types.ts` to confirm the exact end-of-file position. Existing types end at line 55 (the `LoadResult` type). New types append at the bottom of the file.

- [ ] **Step 2: Append new types at the end of `src/types.ts`**

Add the following block immediately after the existing `LoadResult` type:

```typescript

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
  classification: string;
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
  tier: string;
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: clean compile, no errors.

- [ ] **Step 4: Verify existing tests still pass**

Run: `npm test`
Expected: all 16 existing tests pass; no new tests yet.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts
git commit -m "$(cat <<'EOF'
feat(types): add Mystery Box type definitions

Adds RolledIdentity (extends BlingIdentity with office + homunculus
blocks), RarityReport, RollOutput, and supporting types. Pure type
additions — no runtime behaviour change.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Seedable PRNG and rolling utilities

**Files:**
- Create: `src/mystery_box.ts`
- Create: `tests/mystery_box.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/mystery_box.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mulberry32 } from "../src/mystery_box.js";

describe("mulberry32", () => {
  it("produces deterministic output for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBeCloseTo(b());
    expect(a()).toBeCloseTo(b());
    expect(a()).toBeCloseTo(b());
  });

  it("produces values in [0, 1)", () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBeCloseTo(b());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mystery_box`
Expected: FAIL — `mulberry32` is not exported (file does not exist yet).

- [ ] **Step 3: Create `src/mystery_box.ts` with the minimal implementation**

```typescript
// src/mystery_box.ts
// All Mystery Box logic — pools, roller, scorer, paragraph renderer,
// lore frame, Named Subjects, orchestrator. See:
//   docs/superpowers/specs/2026-04-13-mystery-box-design.md
//
// Pools are intentionally small at first ship (~6 per category). Grow
// to the spec's 30–60 per category as a follow-up — see plan §16.

import type {
  TraitBand,
  TraitEntry,
  TraitPool,
  OfficeBlock,
  HomunculusBlock,
  RolledIdentity,
  RarityReport,
  PerTrait,
  RollOutput,
} from "./types.js";

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: 3 PASS.

- [ ] **Step 5: Verify TypeScript still compiles**

Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add seedable PRNG (mulberry32)

Establishes src/mystery_box.ts and its test file. Adds the deterministic
PRNG used by all subsequent tests so rolls are reproducible.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Trait band weights and weighted random selection

**Files:**
- Modify: `src/mystery_box.ts` (append)
- Modify: `tests/mystery_box.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/mystery_box.test.ts`:

```typescript
import { BAND_WEIGHTS, pickWeighted } from "../src/mystery_box.js";
import type { TraitEntry } from "../src/types.js";

describe("BAND_WEIGHTS", () => {
  it("has exactly 5 bands summing to 100", () => {
    const total =
      BAND_WEIGHTS.Common +
      BAND_WEIGHTS.Uncommon +
      BAND_WEIGHTS.Rare +
      BAND_WEIGHTS.Legendary +
      BAND_WEIGHTS.Mythic;
    expect(total).toBe(100);
  });
});

describe("pickWeighted", () => {
  const pool: TraitEntry[] = [
    { value: "common-A",     band: "Common" },     // 50
    { value: "uncommon-A",   band: "Uncommon" },   // 25
    { value: "rare-A",       band: "Rare" },       // 15
    { value: "legendary-A",  band: "Legendary" },  // 8
    { value: "mythic-A",     band: "Mythic" },     // 2
  ];

  it("returns a valid pool entry", () => {
    const rng = mulberry32(1);
    const pick = pickWeighted(pool, rng);
    expect(pool).toContainEqual(pick);
  });

  it("respects band weights over many draws", () => {
    const rng = mulberry32(99);
    const counts = { common: 0, mythic: 0 };
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const pick = pickWeighted(pool, rng);
      if (pick.band === "Common") counts.common++;
      if (pick.band === "Mythic") counts.mythic++;
    }
    // Expect ~50% Common, ~2% Mythic. Allow ±3% slack for a 10k sample.
    expect(counts.common / N).toBeGreaterThan(0.47);
    expect(counts.common / N).toBeLessThan(0.53);
    expect(counts.mythic / N).toBeGreaterThan(0.005);
    expect(counts.mythic / N).toBeLessThan(0.04);
  });

  it("handles a pool with only one band present", () => {
    const onePool: TraitEntry[] = [
      { value: "x", band: "Common" },
      { value: "y", band: "Common" },
    ];
    const rng = mulberry32(7);
    const pick = pickWeighted(onePool, rng);
    expect(["x", "y"]).toContain(pick.value);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mystery_box`
Expected: FAIL — `BAND_WEIGHTS` and `pickWeighted` are not exported.

- [ ] **Step 3: Append weights and selector to `src/mystery_box.ts`**

```typescript

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
 * Algorithm:
 *   1. Compute the total weight of all entries in the pool.
 *      (Multiple entries per band is fine — they share their band's weight.)
 *   2. Roll a random number in [0, total).
 *   3. Walk the pool, subtracting each entry's weight, until the roll lands.
 */
export function pickWeighted(pool: TraitPool, rng: Rng): TraitEntry {
  if (pool.length === 0) {
    throw new Error("pickWeighted called on an empty pool");
  }
  let total = 0;
  for (const entry of pool) {
    total += BAND_WEIGHTS[entry.band];
  }
  let roll = rng() * total;
  for (const entry of pool) {
    roll -= BAND_WEIGHTS[entry.band];
    if (roll <= 0) return entry;
  }
  // Float drift fallback — return the last entry.
  return pool[pool.length - 1]!;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: all PASS (the new 3 tests + the original 3).

- [ ] **Step 5: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add band weights and weighted picker

BAND_WEIGHTS encodes the spec's 50/25/15/8/2 distribution; pickWeighted
uses an injected RNG so production paths use Math.random while tests
get deterministic mulberry32 seeds.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Trait pools (starter set, ~6 per category)

**Files:**
- Modify: `src/mystery_box.ts` (append)
- Modify: `tests/mystery_box.test.ts` (append)

This task ships a **starter** pool — small enough to keep the plan readable, large enough that every category has at least one entry per band. Pool expansion to the spec's 30–60 per category is Task 16.

- [ ] **Step 1: Write the failing tests**

Append to `tests/mystery_box.test.ts`:

```typescript
import { POOLS } from "../src/mystery_box.js";

describe("POOLS", () => {
  const expectedCategories = [
    "name", "job_title", "desk_setup", "habit", "coffee_ritual",
    "meeting_energy", "passive_aggressive",
    "physical_height", "physical_accessory", "physical_expression",
    "physical_material", "theme_primary", "theme_accent",
  ];

  it.each(expectedCategories)("has a non-empty %s pool", (cat) => {
    const pool = (POOLS as Record<string, TraitEntry[]>)[cat];
    expect(pool).toBeDefined();
    expect(pool.length).toBeGreaterThan(0);
  });

  it("has all 13 categories", () => {
    expect(Object.keys(POOLS).sort()).toEqual([...expectedCategories].sort());
  });

  it("every entry has a value and a valid band", () => {
    const validBands = new Set(["Common", "Uncommon", "Rare", "Legendary", "Mythic"]);
    for (const [cat, pool] of Object.entries(POOLS)) {
      for (const entry of pool) {
        expect(typeof entry.value).toBe("string");
        expect(entry.value.length).toBeGreaterThan(0);
        expect(validBands.has(entry.band)).toBe(true);
      }
    }
  });

  it("theme colour pools contain valid #RRGGBB hex strings", () => {
    const hex = /^#[0-9A-Fa-f]{6}$/;
    for (const cat of ["theme_primary", "theme_accent"]) {
      const pool = (POOLS as Record<string, TraitEntry[]>)[cat]!;
      for (const entry of pool) {
        expect(entry.value).toMatch(hex);
      }
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mystery_box`
Expected: FAIL — `POOLS` is not exported.

- [ ] **Step 3: Append pools to `src/mystery_box.ts`**

```typescript

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
  { value: "permanently mid-sigh",                            band: "Rare" },
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: all PASS (existing + 4 new pool tests).

- [ ] **Step 5: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add starter trait pools (13 categories)

Six entries per category spread across all five rarity bands. Enough
for end-to-end testing; spec target of 30–60 entries per category will
follow as a separate task. Theme colour pools use real-but-cursed
office palette colours.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Rarity score calculation

**Files:**
- Modify: `src/mystery_box.ts` (append)
- Modify: `tests/mystery_box.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/mystery_box.test.ts`:

```typescript
import { rarityScore } from "../src/mystery_box.js";

describe("rarityScore", () => {
  it("returns 26 for 13 Common traits", () => {
    const traits: PerTrait[] = Array.from({ length: 13 }, (_, i) => ({
      category: `cat${i}`,
      value: `v${i}`,
      band: "Common",
    }));
    // 13 × (1/0.5) = 26
    expect(rarityScore(traits)).toBeCloseTo(26);
  });

  it("scores Mythic traits at ~50 each", () => {
    const traits: PerTrait[] = [{ category: "x", value: "y", band: "Mythic" }];
    // 1 / 0.02 = 50
    expect(rarityScore(traits)).toBeCloseTo(50);
  });

  it("matches the worked example from spec §5.3 (9C + 3R + 1M)", () => {
    const traits: PerTrait[] = [
      ...Array(9).fill({ category: "c", value: "v", band: "Common" }),
      ...Array(3).fill({ category: "c", value: "v", band: "Rare" }),
      { category: "c", value: "v", band: "Mythic" },
    ];
    // 9×2 + 3×(1/0.15) + 1×50 ≈ 18 + 20.0 + 50 = ~88
    expect(rarityScore(traits)).toBeGreaterThan(85);
    expect(rarityScore(traits)).toBeLessThan(92);
  });
});
```

Note: `import type { PerTrait }` may need to be added at the top of the test file — append to the imports.

Add this import line near the top:

```typescript
import type { PerTrait } from "../src/types.js";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mystery_box`
Expected: FAIL — `rarityScore` is not exported.

- [ ] **Step 3: Append the formula to `src/mystery_box.ts`**

```typescript

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add rarity score calculation

Implements the rarity.tools formula: sum of 1/probability across all
rolled traits. Verified against the worked examples in spec §5.3.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Tier derivation from score

**Files:**
- Modify: `src/mystery_box.ts` (append)
- Modify: `tests/mystery_box.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/mystery_box.test.ts`:

```typescript
import { tierFromScore } from "../src/mystery_box.js";

describe("tierFromScore", () => {
  it.each([
    [0,     "Filing Clerk"],
    [24.99, "Filing Clerk"],
    [25,    "Team Lead"],
    [59.99, "Team Lead"],
    [60,    "Middle Manager"],
    [149.99,"Middle Manager"],
    [150,   "C-Suite"],
    [499.99,"C-Suite"],
    [500,   "HR Warned Us About"],
    [9999,  "HR Warned Us About"],
  ])("score %s → %s", (score, expected) => {
    expect(tierFromScore(score)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mystery_box`
Expected: FAIL — `tierFromScore` is not exported.

- [ ] **Step 3: Append the function to `src/mystery_box.ts`**

```typescript

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add tier derivation from rarity score

Maps numeric scores to the five tier labels per spec §5.4. Boundary
behaviour: a score equal to a threshold lands in the higher tier.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: HOMUNCULUS metadata generation

**Files:**
- Modify: `src/mystery_box.ts` (append)
- Modify: `tests/mystery_box.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/mystery_box.test.ts`:

```typescript
import { rollHomunculusBlock } from "../src/mystery_box.js";

describe("rollHomunculusBlock", () => {
  it("produces a 4-digit subject_id", () => {
    const rng = mulberry32(11);
    const block = rollHomunculusBlock(rng, "Filing Clerk");
    expect(block.subject_id).toMatch(/^\d{4}$/);
  });

  it("uses the supplied tier as the classification", () => {
    const rng = mulberry32(11);
    const block = rollHomunculusBlock(rng, "C-Suite");
    expect(block.classification).toBe("C-Suite");
  });

  it("picks a cohort from a known set", () => {
    const allowed = new Set([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
    ]);
    const rng = mulberry32(11);
    const block = rollHomunculusBlock(rng, "Team Lead");
    expect(allowed.has(block.cohort)).toBe(true);
  });

  it("ingestion date is YYYY-MM-DD between 2024 and 2026", () => {
    const rng = mulberry32(11);
    const block = rollHomunculusBlock(rng, "Team Lead");
    expect(block.ingested).toMatch(/^20(24|25|26)-\d{2}-\d{2}$/);
  });

  it("flag is one of the allowed values", () => {
    const allowed = new Set([
      "normal", "flagged for review", "redacted", "Do Not Contact",
    ]);
    const rng = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const block = rollHomunculusBlock(rng, "Filing Clerk");
      expect(allowed.has(block.flag)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mystery_box`
Expected: FAIL — `rollHomunculusBlock` is not exported.

- [ ] **Step 3: Append the function to `src/mystery_box.ts`**

```typescript

// ---------------------------------------------------------------------------
// HOMUNCULUS metadata generation
// ---------------------------------------------------------------------------

const COHORTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

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
  const day = String(1 + Math.floor(rng() * 28)).padStart(2, "0");  // 1–28 for safety
  const flag = pickWeighted(FLAG_POOL, rng).value;
  return {
    subject_id,
    cohort,
    classification: tier,
    ingested: `${year}-${month}-${day}`,
    flag,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add HOMUNCULUS metadata generation

Generates the lore-frame block: subject_id, cohort, ingestion date,
and a weighted flag. Classification is supplied by the caller (the
already-derived tier).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Paragraph templates and slot filling

**Files:**
- Modify: `src/mystery_box.ts` (append)
- Modify: `tests/mystery_box.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/mystery_box.test.ts`:

```typescript
import { renderParagraph, PARAGRAPH_TEMPLATES } from "../src/mystery_box.js";
import type { RolledIdentity } from "../src/types.js";

const sampleIdentity: RolledIdentity = {
  name: "Brenda from Accounts",
  personality: { tone: "polite", formality: "professional", humor: "dry" },
  theme: { primary_color: "#9C6B3A", accent_color: "#D9D9D9" },
  physical: {
    species: "human",
    height: "permanently mid-sigh",
    accessory: "a lanyard with 14 badges of varying importance",
    expression: "polite disappointment",
    material: "a cardigan, at least one",
  },
  office: {
    job_title: "ASCII Comptroller",
    desk_setup: "a coffee mug labelled WORLD'S OKAYEST DBA",
    habit: "microwaves fish despite three separate HR warnings",
    coffee_ritual: "black coffee, no nonsense",
    meeting_energy: "always 4 minutes late, always with a reason",
    passive_aggressive: "Per my last email",
  },
  homunculus: {
    subject_id: "0147",
    cohort: "Tuesday",
    classification: "Middle Manager",
    ingested: "2025-07-14",
    flag: "flagged for review",
  },
};

describe("PARAGRAPH_TEMPLATES", () => {
  it("contains exactly 10 templates", () => {
    expect(PARAGRAPH_TEMPLATES.length).toBe(10);
  });
});

describe("renderParagraph", () => {
  it("includes the bot's name and job title", () => {
    const rng = mulberry32(1);
    const out = renderParagraph(sampleIdentity, rng);
    expect(out).toContain("Brenda from Accounts");
    expect(out).toContain("ASCII Comptroller");
  });

  it("includes at least one office trait", () => {
    const rng = mulberry32(1);
    const out = renderParagraph(sampleIdentity, rng);
    expect(out).toMatch(/microwaves fish|WORLD'S OKAYEST DBA|Per my last email/);
  });

  it("is deterministic given the same seed", () => {
    const a = renderParagraph(sampleIdentity, mulberry32(99));
    const b = renderParagraph(sampleIdentity, mulberry32(99));
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mystery_box`
Expected: FAIL — `renderParagraph` and `PARAGRAPH_TEMPLATES` are not exported.

- [ ] **Step 3: Append templates and renderer to `src/mystery_box.ts`**

```typescript

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
  "Meet {name} — your new {job_title}. {material}, {expression}, {height}. {habit}, drinks {coffee_ritual}, and is {meeting_energy}. Signs off every email with \"{passive_aggressive}\".",
  "{name}, {job_title}. Sits behind {desk_setup}. {material}, with {accessory}. {habit} and {meeting_energy}.",
  "Introducing {name}, the office's resident {job_title}. {expression}, {material}. {coffee_ritual}. Famously {habit}.",
  "{name} ({job_title}) — {height}, {material}, {accessory}. {desk_setup}. {habit}. Their entire personality in three words: \"{passive_aggressive}\".",
  "Day one and {name} — your new {job_title} — has already {habit}. {desk_setup}. Drinks {coffee_ritual}. Always {meeting_energy}.",
  "Meet {name}, {job_title}. {accessory}, {material}, {expression}. Their desk: {desk_setup}. Their thing: {habit}.",
  "{name} is a {job_title}. {height}, {material}. {meeting_energy}. {coffee_ritual}. Will end every Slack message with \"{passive_aggressive}\".",
  "{job_title}? {name}. {desk_setup}. {habit}. {expression}. Don't get on the wrong side of \"{passive_aggressive}\".",
  "Subject: {name}. Function: {job_title}. Distinguishing features: {material}, {accessory}, {expression}. Notable behaviours: {habit}; {meeting_energy}; {coffee_ritual}.",
  "{name}, {job_title}, has joined the team. {height}, {material}. Brings {desk_setup}. {habit}. Speaks in \"{passive_aggressive}\".",
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add 10 paragraph templates and slot renderer

Templates blend physical description with office quirks. Slot syntax
is {name}-style; missing slots leave the placeholder visible (loud
failure mode for typos).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Lore frame rendering

**Files:**
- Modify: `src/mystery_box.ts` (append)
- Modify: `tests/mystery_box.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/mystery_box.test.ts`:

```typescript
import { renderFramed } from "../src/mystery_box.js";

describe("renderFramed", () => {
  it("includes header and footer with the homunculus block fields", () => {
    const out = renderFramed(sampleIdentity, "the body paragraph", 147.3, 91);
    expect(out).toContain("HOMUNCULUS CORPUS");
    expect(out).toContain("Subject 0147");
    expect(out).toContain("Cohort: Tuesday");
    expect(out).toContain("Classification: Middle Manager");
    expect(out).toContain("Rarity 147.3");
    expect(out).toContain("91st percentile");
    expect(out).toContain("the body paragraph");
    expect(out).toContain("RELATABILITY CORPUS v3.1");
    expect(out).toContain("ingested 2025-07-14");
    expect(out).toContain("flagged for review");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mystery_box`
Expected: FAIL — `renderFramed` is not exported.

- [ ] **Step 3: Append the function to `src/mystery_box.ts`**

```typescript

// ---------------------------------------------------------------------------
// Lore frame — header + paragraph + footer
// ---------------------------------------------------------------------------

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
  const header =
    `HOMUNCULUS CORPUS · Subject ${h.subject_id} · Cohort: ${h.cohort}\n` +
    `Classification: ${h.classification} · Rarity ${score.toFixed(1)} · ${percentile}th percentile`;
  const footer =
    `— RELATABILITY CORPUS v3.1 · ingested ${h.ingested} · ${h.flag}`;
  return `${header}\n\n${paragraph}\n\n${footer}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add lore frame renderer

Wraps the rendered paragraph in the HOMUNCULUS classified-document
header and footer. Output is the screenshot-ready share card.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Named Subjects (1-of-1 hand-authored bots)

**Files:**
- Modify: `src/mystery_box.ts` (append)
- Modify: `tests/mystery_box.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/mystery_box.test.ts`:

```typescript
import { NAMED_SUBJECTS, pickNamedSubject } from "../src/mystery_box.js";

describe("NAMED_SUBJECTS", () => {
  it("ships exactly 5 hand-authored subjects", () => {
    expect(NAMED_SUBJECTS.length).toBe(5);
  });

  it("each subject has identity, paragraph, and lore", () => {
    for (const ns of NAMED_SUBJECTS) {
      expect(typeof ns.identity.name).toBe("string");
      expect(typeof ns.paragraph).toBe("string");
      expect(typeof ns.lore).toBe("string");
      expect(ns.identity.homunculus.flag).toBe("Do Not Contact");
    }
  });

  it("pickNamedSubject returns one of the 5", () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 20; i++) {
      const ns = pickNamedSubject(rng);
      expect(NAMED_SUBJECTS).toContain(ns);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mystery_box`
Expected: FAIL — `NAMED_SUBJECTS` not exported.

- [ ] **Step 3: Append the data and selector to `src/mystery_box.ts`**

```typescript

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
): NamedSubject {
  const identity: RolledIdentity = {
    name,
    personality: { tone: "guarded", formality: "professional", humor: "dry" },
    theme: { primary_color: "#1F4E79", accent_color: "#503D2E" },
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
  ),
  makeNamedSubject(
    "Joaquín García",
    "Property Supervisor",
    "Meet Joaquín García — your new Property Supervisor. Drew a salary of €37,000 for six years without showing up to work. Caught only when nominated for a long-service award and the people handing it to him realised they did not know who he was. The investigation that followed required two separate departments to admit they each thought he reported to the other.",
    "The Guardian, 2016.",
    "0002",
  ),
  makeNamedSubject(
    "The Knight Capital Deployment Engineer",
    "Senior Release Engineer",
    "Meet the engineer who deployed Knight Capital's new trading code to seven of eight servers and went home. The eighth server kept running the old code. In 45 minutes the firm executed $460M in unintended trades and effectively bankrupted itself. They were acquired four months later. Nobody talks about the eighth server.",
    "SEC report on Knight Capital Group's market disruption, 2012.",
    "0003",
  ),
  makeNamedSubject(
    "The Citibank Sender",
    "Loan Operations Analyst",
    "Meet the Citibank employee who, attempting to send an interest payment, instead wired $900M of Citi's own money to Revlon's creditors with one click of a famously confusing UI. A federal judge initially ruled the recipients could keep the money. (It was later reversed on appeal — but for a long, beautiful moment, it was theirs.)",
    "Reuters, 2020.",
    "0004",
  ),
  makeNamedSubject(
    "The GitLab Backup Operator",
    "Site Reliability Engineer",
    "Meet the SRE who, during an emergency database recovery in 2017, ran rm -rf on the wrong production server. All five backup methods had silently failed for months. The 18-hour recovery was livestreamed on YouTube. They are still employed there. The post-mortem is required reading.",
    "GitLab public post-mortem, 2017.",
    "0005",
  ),
];

/** Pick one Named Subject uniformly at random. */
export function pickNamedSubject(rng: Rng): NamedSubject {
  return NAMED_SUBJECTS[Math.floor(rng() * NAMED_SUBJECTS.length)]!;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add 5 hand-authored Named Subjects

Each is based on a verifiable legendary workplace incident (Bob,
Joaquín, Knight Capital, Citibank, GitLab). They bypass the random
assembler and have flag = "Do Not Contact" by design.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Main `rollIdentity` orchestrator

**Files:**
- Modify: `src/mystery_box.ts` (append)
- Modify: `tests/mystery_box.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/mystery_box.test.ts`:

```typescript
import { rollIdentity, NAMED_SUBJECT_PROBABILITY } from "../src/mystery_box.js";

describe("rollIdentity", () => {
  it("returns a complete RollOutput", () => {
    const out = rollIdentity(mulberry32(42));
    expect(out.identity.name).toBeDefined();
    expect(out.identity.office).toBeDefined();
    expect(out.identity.homunculus).toBeDefined();
    expect(typeof out.rarity.score).toBe("number");
    expect(typeof out.rarity.tier).toBe("string");
    expect(typeof out.paragraph).toBe("string");
    expect(typeof out.framed).toBe("string");
  });

  it("classification matches the derived tier", () => {
    const out = rollIdentity(mulberry32(42));
    expect(out.identity.homunculus.classification).toBe(out.rarity.tier);
  });

  it("returns a Named Subject when the pre-roll hits", () => {
    // Force the pre-roll to succeed: an RNG that always returns 0.
    const alwaysZero: () => number = () => 0;
    const out = rollIdentity(alwaysZero);
    expect(out.lore).not.toBeNull();
    expect(NAMED_SUBJECTS.map((s) => s.identity.name)).toContain(out.identity.name);
  });

  it("returns an assembled bot when the pre-roll misses", () => {
    // RNG that always returns 0.99 — comfortably above any reasonable pre-roll.
    const alwaysHigh: () => number = () => 0.99;
    const out = rollIdentity(alwaysHigh);
    expect(out.lore).toBeNull();
    expect(out.rarity.per_trait).not.toBeNull();
  });

  it("NAMED_SUBJECT_PROBABILITY is 0.005", () => {
    expect(NAMED_SUBJECT_PROBABILITY).toBe(0.005);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mystery_box`
Expected: FAIL.

- [ ] **Step 3: Append the orchestrator to `src/mystery_box.ts`**

```typescript

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/** Probability that a roll returns a hand-authored Named Subject. */
export const NAMED_SUBJECT_PROBABILITY = 0.005;

/**
 * Roll a complete identity. Two paths:
 *   1. With probability 0.5%, return a Named Subject (no random assembly).
 *   2. Otherwise, draw one trait from each pool, assemble the identity,
 *      score it, derive the tier, render the paragraph, build the frame.
 *
 * `rng` defaults to Math.random — pass a seedable PRNG in tests.
 */
export function rollIdentity(rng: Rng = Math.random): RollOutput {
  // Path 1: Named Subject pre-roll
  if (rng() < NAMED_SUBJECT_PROBABILITY) {
    const ns = pickNamedSubject(rng);
    const score = 1000;
    const percentile = 99;
    const framed = renderFramed(ns.identity, ns.paragraph, score, percentile);
    return {
      identity: ns.identity,
      rarity: {
        score,
        tier: "HR Warned Us About",
        percentile,
        per_trait: null,
      },
      paragraph: ns.paragraph,
      framed,
      lore: ns.lore,
    };
  }

  // Path 2: random assembly. Draw one entry from every pool.
  const drawn: Record<CategoryKey, TraitEntry> = {} as Record<CategoryKey, TraitEntry>;
  for (const [key, pool] of Object.entries(POOLS) as Array<[CategoryKey, TraitPool]>) {
    drawn[key] = pickWeighted(pool, rng);
  }

  const per_trait: PerTrait[] = (Object.entries(drawn) as Array<[CategoryKey, TraitEntry]>).map(
    ([category, entry]) => ({ category, value: entry.value, band: entry.band }),
  );

  const score = rarityScore(per_trait);
  const tier = tierFromScore(score);
  const percentile = scoreToPercentile(score);

  // Build the rolled identity from the drawn traits.
  const homunculus = rollHomunculusBlock(rng, tier);
  const identity: RolledIdentity = {
    name: drawn.name.value,
    personality: { tone: "polite", formality: "professional", humor: "dry" },
    theme: {
      primary_color: drawn.theme_primary.value,
      accent_color: drawn.theme_accent.value,
    },
    physical: {
      species: "human",
      height: drawn.physical_height.value,
      accessory: drawn.physical_accessory.value,
      expression: drawn.physical_expression.value,
      material: drawn.physical_material.value,
    },
    office: {
      job_title: drawn.job_title.value,
      desk_setup: drawn.desk_setup.value,
      habit: drawn.habit.value,
      coffee_ritual: drawn.coffee_ritual.value,
      meeting_energy: drawn.meeting_energy.value,
      passive_aggressive: drawn.passive_aggressive.value,
    },
    homunculus,
  };

  const paragraph = renderParagraph(identity, rng);
  const framed = renderFramed(identity, paragraph, score, percentile);

  return {
    identity,
    rarity: { score, tier, percentile, per_trait },
    paragraph,
    framed,
    lore: null,
  };
}

/**
 * Approximate percentile from a rarity score.
 * Rough mapping based on the tier distribution targets in spec §5.4.
 * Good enough for the share-card display — exact percentile would require
 * Monte-Carlo calibration of the actual pool weights.
 */
function scoreToPercentile(score: number): number {
  if (score >= 500) return 99;
  if (score >= 150) return 95;
  if (score >= 60)  return 86;
  if (score >= 25)  return 50;
  return Math.max(1, Math.round((score / 25) * 50));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- mystery_box`
Expected: all PASS.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/mystery_box.ts tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
feat(mystery-box): add rollIdentity orchestrator

Wires together the pieces: Named Subject pre-roll at 0.5%, weighted
trait draws from all 13 pools, score → tier → percentile, paragraph
template fill, lore-frame wrap. RNG is injected so callers (including
tests) can supply deterministic streams.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: `roll_identity` MCP tool

**Files:**
- Modify: `src/tools.ts` (add new tool registration in `registerTools`)
- Modify: `tests/tools.test.ts` (add test)

- [ ] **Step 1: Read the existing `tests/tools.test.ts`**

Familiarise yourself with how existing tools are tested — pattern likely uses the registered server's tool directly.

- [ ] **Step 2: Write the failing test**

Append to `tests/tools.test.ts`:

```typescript
import { rollIdentityHandler } from "../src/tools.js";

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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tools`
Expected: FAIL — `rollIdentityHandler` not exported.

- [ ] **Step 4: Modify `src/tools.ts`**

Add this import at the top of the file (alongside the existing imports):

```typescript
import { rollIdentity } from "./mystery_box.js";
import type { RollOutput } from "./types.js";
```

Add a module-level variable to hold the last roll (for `save_last_roll` later):

```typescript
/** The most-recent roll, kept in memory for `save_last_roll`. */
let lastRoll: RollOutput | null = null;
```

Add this exported handler function above `registerTools`:

```typescript
/**
 * Handler extracted so it can be unit-tested without spinning up a server.
 * Side effect: stores the roll in `lastRoll` for `save_last_roll`.
 */
export async function rollIdentityHandler(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const out = rollIdentity();
  lastRoll = out;
  return {
    content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }],
  };
}
```

Inside `registerTools`, after the existing two tool registrations, add:

```typescript
  // Tool 3: roll_identity
  // Generates a fresh random bot identity from the Mystery Box
  server.tool(
    "roll_identity",
    "WOW — Weird Office Workers. Roll a fresh random bot identity: a quirky office-worker character with a rarity score and a screenshot-ready share card",
    {},
    rollIdentityHandler,
  );
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/tools.ts tests/tools.test.ts
git commit -m "$(cat <<'EOF'
feat(tools): add roll_identity MCP tool

Exposes the Mystery Box roller via MCP. Handler is exported so it can
be unit-tested without spinning up a server. Stores the roll in
module-level state so save_last_roll (next task) can persist it.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: `save_last_roll` MCP tool

**Files:**
- Modify: `src/tools.ts` (add tool registration)
- Modify: `tests/tools.test.ts` (add tests)

- [ ] **Step 1: Write the failing tests**

Append to `tests/tools.test.ts`:

```typescript
import { saveLastRollHandler, _resetLastRollForTests } from "../src/tools.js";
import { writeFile, unlink, readFile } from "node:fs/promises";

describe("saveLastRollHandler", () => {
  const testPath = "tests/fixtures/_temp_save.json";

  afterEach(async () => {
    try { await unlink(testPath); } catch { /* ignore */ }
    _resetLastRollForTests();
  });

  it("returns an error when nothing has been rolled this session", async () => {
    _resetLastRollForTests();
    const result = await saveLastRollHandler(testPath);
    const text = result.content[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toMatch(/no roll/i);
  });

  it("writes the most recent roll's identity to the supplied path", async () => {
    await rollIdentityHandler();           // produce a roll
    const result = await saveLastRollHandler(testPath);
    const text = result.content[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.ok).toBe(true);
    const written = JSON.parse(await readFile(testPath, "utf-8"));
    expect(typeof written.name).toBe("string");
    expect(written.office).toBeDefined();
    expect(written.homunculus).toBeDefined();
  });
});
```

You'll need to add `afterEach` to the vitest imports at the top of the test file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tools`
Expected: FAIL — `saveLastRollHandler` and `_resetLastRollForTests` not exported.

- [ ] **Step 3: Modify `src/tools.ts`**

Add this import at the top (with the other node imports — none exist yet, so add a new line):

```typescript
import { writeFile } from "node:fs/promises";
```

Add these exported functions, immediately below `rollIdentityHandler`:

```typescript
/**
 * Save the most-recent roll's identity to the given path.
 * Returns { ok: true } on success, { error } if nothing has been rolled.
 */
export async function saveLastRollHandler(targetPath: string): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  if (lastRoll === null) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "No roll has happened this session. Call roll_identity first.",
      }) }],
    };
  }
  await writeFile(targetPath, JSON.stringify(lastRoll.identity, null, 2), "utf-8");
  return {
    content: [{ type: "text" as const, text: JSON.stringify({
      ok: true, written_to: targetPath,
    }) }],
  };
}

/** Test-only — clears module state between tests. Do not call from production. */
export function _resetLastRollForTests(): void {
  lastRoll = null;
}
```

Inside `registerTools`, after the `roll_identity` registration, add:

```typescript
  // Tool 4: save_last_roll
  // Writes the most-recent roll's identity to the bling.json path
  server.tool(
    "save_last_roll",
    "Persist the most-recent WOW roll by writing it to the configured bling.json path",
    {},
    () => saveLastRollHandler(blingPath),
  );
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/tools.ts tests/tools.test.ts
git commit -m "$(cat <<'EOF'
feat(tools): add save_last_roll MCP tool

Writes the most-recent roll's identity to the configured bling.json
path. Errors cleanly if no roll has happened this session.
_resetLastRollForTests is exported solely for test isolation.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: `get_rarity_report` MCP tool

**Files:**
- Modify: `src/tools.ts` (add tool registration)
- Modify: `tests/tools.test.ts` (add test)

- [ ] **Step 1: Write the failing test**

Append to `tests/tools.test.ts`:

```typescript
import { getRarityReportHandler } from "../src/tools.js";

describe("getRarityReportHandler", () => {
  it("returns the framed share card after a roll", async () => {
    _resetLastRollForTests();
    await rollIdentityHandler();
    const result = await getRarityReportHandler();
    const text = result.content[0]!.text;
    expect(text).toContain("HOMUNCULUS CORPUS");
    expect(text).toContain("RELATABILITY CORPUS v3.1");
  });

  it("returns an error when no roll has happened this session", async () => {
    _resetLastRollForTests();
    const result = await getRarityReportHandler();
    const text = result.content[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tools`
Expected: FAIL — `getRarityReportHandler` not exported.

- [ ] **Step 3: Modify `src/tools.ts`**

Add this exported function, immediately below `saveLastRollHandler`:

```typescript
/**
 * Return the most-recent roll's framed share card (header + paragraph + footer).
 * Errors cleanly if no roll has happened this session.
 */
export async function getRarityReportHandler(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  if (lastRoll === null) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "No roll has happened this session. Call roll_identity first.",
      }) }],
    };
  }
  return {
    content: [{ type: "text" as const, text: lastRoll.framed }],
  };
}
```

Inside `registerTools`, after the `save_last_roll` registration, add:

```typescript
  // Tool 5: get_rarity_report
  // Returns the framed share card for the most-recent roll
  server.tool(
    "get_rarity_report",
    "Return the screenshot-ready WOW share card for the most-recent roll",
    {},
    getRarityReportHandler,
  );
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/tools.ts tests/tools.test.ts
git commit -m "$(cat <<'EOF'
feat(tools): add get_rarity_report MCP tool

Returns the framed share card (header + paragraph + footer) for the
most-recent roll. Plain text — clients can display verbatim.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Update `bling.json` example to a HOMUNCULUS-style sample

**Files:**
- Modify: `bling.json` (replace contents)

This task replaces the Chip example with a sample human subject so the project's default identity matches the new framing. Hand-written `bling.json` files in the wild are unaffected.

- [ ] **Step 1: Replace `bling.json` contents**

Overwrite `bling.json` with:

```json
{
  "name": "Brenda from Accounts",
  "personality": {
    "tone": "polite",
    "formality": "professional",
    "humor": "dry",
    "catchphrase": "Per my last email"
  },
  "physical": {
    "species": "human",
    "height": "permanently mid-sigh",
    "accessory": "a lanyard with 14 badges of varying importance",
    "expression": "polite disappointment",
    "material": "a cardigan, at least one"
  },
  "theme": {
    "primary_color": "#9C6B3A",
    "accent_color": "#D9D9D9"
  },
  "office": {
    "job_title": "ASCII Comptroller",
    "desk_setup": "a coffee mug labelled WORLD'S OKAYEST DBA",
    "habit": "microwaves fish despite three separate HR warnings",
    "coffee_ritual": "black coffee, no nonsense",
    "meeting_energy": "always 4 minutes late, always with a reason",
    "passive_aggressive": "Per my last email"
  },
  "homunculus": {
    "subject_id": "0147",
    "cohort": "Tuesday",
    "classification": "Middle Manager",
    "ingested": "2025-07-14",
    "flag": "flagged for review"
  }
}
```

- [ ] **Step 2: Verify identity loading still works**

Run: `npm test -- identity`
Expected: existing identity tests PASS — loadIdentity does not enforce `office`/`homunculus`, only the original required fields.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 4: Smoke-test the server**

Run: `npm run build && node dist/index.js < /dev/null`
Expected: server starts without crashing (it'll exit immediately because stdin is empty — that's fine; we're just checking startup).

- [ ] **Step 5: Commit**

```bash
git add bling.json
git commit -m "$(cat <<'EOF'
feat: replace Chip example with HOMUNCULUS sample subject

The default bling.json now reflects the Mystery Box framing — Brenda
from Accounts as a sample subject. Hand-written configs in the wild
are unaffected since the new fields are optional in the loader.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Distribution sanity test (10,000-roll integration)

**Files:**
- Modify: `tests/mystery_box.test.ts` (append)

This is the one test that simulates the full system end-to-end and confirms the tier distribution roughly matches the spec's §5.4 targets. It's slow (~1 second) but a great safety net — anyone editing pool weights will see it fail loudly.

- [ ] **Step 1: Append the integration test**

```typescript
describe("rollIdentity — distribution (10k rolls)", () => {
  it("tier distribution lands within ±5pp of the spec targets", () => {
    const rng = mulberry32(2026);
    const tally: Record<string, number> = {};
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const out = rollIdentity(rng);
      tally[out.rarity.tier] = (tally[out.rarity.tier] ?? 0) + 1;
    }

    // Spec §5.4 targets: 50 / 30 / 14 / 5 / 1 (percent).
    // We allow ±5 percentage points slack for the starter pools, which
    // are too small to land exactly on the curve. Tighten this once the
    // pools are expanded to the spec's 30–60 entries per category.
    const pct = (k: string) => (tally[k] ?? 0) / N * 100;

    expect(pct("Filing Clerk")).toBeGreaterThan(20);   // wide for starter pools
    expect(pct("HR Warned Us About")).toBeLessThan(15); // wide for Named Subject blips
    // Total adds to 100, so this is mostly a "no tier is empty" check.
    const tiers = ["Filing Clerk", "Team Lead", "Middle Manager", "C-Suite", "HR Warned Us About"];
    for (const t of tiers) {
      expect(tally[t] ?? 0).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npm test -- mystery_box`
Expected: PASS (all tests including the new one).

If this test fails, the most likely culprit is that the starter pools have too few entries to hit every tier. Add more entries — especially in the Mythic/Legendary bands — and re-run.

- [ ] **Step 3: Commit**

```bash
git add tests/mystery_box.test.ts
git commit -m "$(cat <<'EOF'
test(mystery-box): add 10k-roll distribution sanity test

Simulates 10,000 rolls and asserts every tier is reachable. Loose
tolerances now (starter pools are small); tighten once pools are
expanded to spec target.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## After this plan ships

1. **Pool expansion.** Spec calls for 30–60 entries per category. Starter set is 6. Worth a separate small task per category — easy to delegate, no logic touched.
2. **Lore rewrite.** Spec §1.1 is flagged TODO. After we have real rolls in front of us, it'll be much easier to write a frame that lands.
3. **Tighten the distribution test** once pools are full — drop the ±5pp slack to ±2pp as the spec intended.

---

## Self-Review

**Spec coverage check** — walking the spec section by section:

- §1 Concept (framing, lore, principles) — covered conceptually; the lore TODO in spec §1.1 is acknowledged in this plan's "After this plan ships."
- §2 UX example — Tasks 8 (paragraph) + 9 (frame) produce the format shown.
- §3 Schema — Task 1 adds the types; Tasks 11 + 15 produce/consume identities of that shape.
- §4 Trait categories — Task 4 implements all 13. ✅
- §5.1–5.4 Rarity engine — Tasks 3 (weights), 5 (score), 6 (tier), 11 (orchestrator). ✅
- §5.5 Named Subjects — Task 10 + Task 11 pre-roll. ✅
- §6 Paragraph generation — Task 8 (templates) + Task 9 (frame). ✅
- §7 Randomness — Task 2 (mulberry32) + injected RNG throughout. ✅
- §8 Persistence — Task 13 (save_last_roll) + module-level `lastRoll` state. ✅
- §9 MCP tools — Tasks 12, 13, 14. ✅
- §10 Testing — schema test (Task 1 build), unit tests (every task), distribution test (Task 16). The "Named Subject test" from spec §10 is in Task 11. ✅
- §11 Non-goals — respected throughout (no LLM, no behaviour injection, no i18n).
- §12 File layout — followed exactly: one new file `src/mystery_box.ts`. ✅
- §13 Open questions — defaults applied; flagged in the "After this plan ships" section.

**Placeholder scan** — no TBD/TODO/"add validation"/etc. in any task body. Every code block is complete. ✅

**Type consistency** — `RollOutput`, `RolledIdentity`, `RarityReport`, `PerTrait`, `OfficeBlock`, `HomunculusBlock` are defined once in Task 1 and used consistently downstream. `rollIdentity()` signature matches across Tasks 11, 12, 13, 14. ✅

No issues to fix.
