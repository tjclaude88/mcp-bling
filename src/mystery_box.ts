// src/mystery_box.ts
// Barrel + orchestrator for the Mystery Box engine.
//
// This file's two jobs:
//   1. Re-export the public API of src/mystery_box/* so consumers can keep
//      using `import { ... } from "./mystery_box.js"` unchanged.
//   2. Host the top-level `rollIdentity` orchestrator, which is the only
//      function that depends on every sub-module — putting it here keeps
//      the dependency graph a clean tree (barrel → sub-modules).
//
// See:
//   docs/superpowers/specs/2026-04-13-mystery-box-design.md

import type { PerTrait, RolledIdentity, RollOutput, TraitEntry } from "./types.js";
import { pickWeighted, type Rng } from "./mystery_box/rng.js";
import { POOLS, type CategoryKey } from "./mystery_box/pools.js";
import { rarityScore, scoreToPercentile, tierFromScore } from "./mystery_box/scoring.js";
import { renderFramed, renderParagraph, rollHomunculusBlock } from "./mystery_box/rendering.js";
import { pickNamedSubject } from "./mystery_box/named.js";

// Re-export the public surface so `./mystery_box.js` stays the single entry
// point for tests and future MCP tool code.
export { mulberry32, BAND_WEIGHTS, pickWeighted, type Rng } from "./mystery_box/rng.js";
export { POOLS, type CategoryKey } from "./mystery_box/pools.js";
export { rarityScore, tierFromScore } from "./mystery_box/scoring.js";
export {
  PARAGRAPH_TEMPLATES,
  renderParagraph,
  renderFramed,
  rollHomunculusBlock,
} from "./mystery_box/rendering.js";
export { NAMED_SUBJECTS, pickNamedSubject, type NamedSubject } from "./mystery_box/named.js";

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/** Probability that a roll returns a hand-authored Named Subject. */
export const NAMED_SUBJECT_PROBABILITY = 0.005;

/**
 * Personality fields are NOT rolled — they're held constant per the spec's
 * non-goals (no behaviour-shaping injection). These defaults apply to every
 * randomly-assembled bot. Named Subjects override with their own personality
 * (see makeNamedSubject in ./mystery_box/named.ts).
 */
const DEFAULT_PERSONALITY = {
  tone: "polite",
  formality: "professional",
  humor: "dry",
} as const;

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
  // Object.entries preserves insertion order for string keys (per ES2015),
  // so per_trait below is stably ordered to match the POOLS declaration.
  const drawn = Object.fromEntries(
    (Object.entries(POOLS) as Array<[CategoryKey, typeof POOLS[CategoryKey]]>).map(
      ([key, pool]) => [key, pickWeighted(pool, rng)] as const,
    ),
  ) as Record<CategoryKey, TraitEntry>;

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
