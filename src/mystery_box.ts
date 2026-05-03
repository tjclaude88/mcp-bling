// src/mystery_box.ts
// Barrel + orchestrator for the Mystery Box engine.
//
// This file's two jobs:
//   1. Re-export the public API of src/mystery_box/* so consumers can keep
//      using `import { ... } from "./mystery_box.js"` unchanged.
//   2. Host the top-level `rollIdentity` orchestrator, which is the only
//      function that depends on every sub-module — putting it here keeps
//      the dependency graph a clean tree (barrel → sub-modules).

import type { PerTrait, RolledIdentity, RollOutput, TraitEntry, Variant } from "./types.js";
import { pickWeighted, type Rng } from "./mystery_box/rng.js";
import { POOLS, type CategoryKey } from "./mystery_box/pools.js";
import { LEGENDS_POOLS } from "./mystery_box/legends_pools.js";
import { rarityScore, scoreToPercentile, tierFromScore } from "./mystery_box/scoring.js";
import { renderFramed, renderParagraph, rollHomunculusBlock, PARAGRAPH_TEMPLATES } from "./mystery_box/rendering.js";
import { LEGENDS_PARAGRAPH_TEMPLATES } from "./mystery_box/legends_rendering.js";
import { pickNamedSubject } from "./mystery_box/named.js";

// Re-export the public surface so `./mystery_box.js` stays the single entry
// point for tests and future MCP tool code.
export { mulberry32, BAND_WEIGHTS, pickWeighted, type Rng } from "./mystery_box/rng.js";
export { POOLS, type CategoryKey } from "./mystery_box/pools.js";
export { LEGENDS_POOLS } from "./mystery_box/legends_pools.js";
export { rarityScore, tierFromScore, scoreToPercentile } from "./mystery_box/scoring.js";
export {
  PARAGRAPH_TEMPLATES,
  renderParagraph,
  renderFramed,
  rollHomunculusBlock,
} from "./mystery_box/rendering.js";
export { LEGENDS_PARAGRAPH_TEMPLATES } from "./mystery_box/legends_rendering.js";
export { NAMED_SUBJECTS, pickNamedSubject, type NamedSubject } from "./mystery_box/named.js";

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/** Probability that a WOW roll returns a hand-authored Named Subject. */
export const NAMED_SUBJECT_PROBABILITY = 0.005;

/**
 * Personality fields are NOT rolled — they're held constant per the spec's
 * non-goals (no behaviour-shaping injection). These defaults apply to every
 * randomly-assembled bot. Named Subjects override with their own personality.
 */
const DEFAULT_PERSONALITY = {
  tone: "polite",
  formality: "professional",
  humor: "dry",
} as const;

/**
 * Roll a complete identity.
 *
 * @param rng     - Defaults to Math.random. Pass a seedable PRNG in tests.
 * @param variant - "wow" (Weird Office Workers, default) or "legends"
 *                  (historical figures in absurd corporate roles).
 *
 * WOW path has two sub-paths:
 *   1. With probability 0.5%, return a Named Subject (no random assembly).
 *   2. Otherwise, draw one trait from each pool, assemble, score, render.
 *
 * Legends path always uses random assembly (no Named Subjects).
 */
export function rollIdentity(rng: Rng = Math.random, variant: Variant = "wow"): RollOutput {
  const pools = variant === "legends" ? LEGENDS_POOLS : POOLS;
  const templates = variant === "legends" ? LEGENDS_PARAGRAPH_TEMPLATES : PARAGRAPH_TEMPLATES;

  // Named Subject pre-roll — WOW only
  if (variant === "wow" && rng() < NAMED_SUBJECT_PROBABILITY) {
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

  // Random assembly path — used by both variants
  const drawn = Object.fromEntries(
    (Object.entries(pools) as Array<[CategoryKey, typeof pools[CategoryKey]]>).map(
      ([key, pool]) => [key, pickWeighted(pool, rng)] as const,
    ),
  ) as Record<CategoryKey, TraitEntry>;

  const per_trait: PerTrait[] = (Object.entries(drawn) as Array<[CategoryKey, TraitEntry]>).map(
    ([category, entry]) => ({ category, value: entry.value, band: entry.band }),
  );

  const score = rarityScore(per_trait);
  const tier = tierFromScore(score);
  const percentile = scoreToPercentile(score);

  const homunculus = rollHomunculusBlock(rng, tier);
  const identity: RolledIdentity = {
    name: drawn.name.value,
    personality: { ...DEFAULT_PERSONALITY },
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

  const paragraph = renderParagraph(identity, rng, templates);
  const framed = renderFramed(identity, paragraph, score, percentile);

  return {
    identity,
    rarity: { score, tier, percentile, per_trait },
    paragraph,
    framed,
    lore: null,
  };
}
