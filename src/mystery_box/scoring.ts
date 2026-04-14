// src/mystery_box/scoring.ts
// Rarity scoring (rarity.tools formula), tier derivation, and
// percentile approximation for the share card.

import type { PerTrait, Tier } from "../types.js";
import { BAND_WEIGHTS } from "./rng.js";

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

/**
 * Tier thresholds. Lower bound is inclusive; upper is exclusive.
 *
 * Note on calibration: with 13 traits and BAND_WEIGHTS giving each
 * band an equal *expected* contribution (1 point per draw), the
 * average score is ~65 with std ~25. These thresholds are rough
 * targets for visual variety in the tier label distribution. Task 16
 * (the 10k-roll distribution test) is the calibration step that will
 * tighten these to match the spec's intended ratios.
 */
const TIER_THRESHOLDS: Array<{ min: number; tier: Tier }> = [
  { min: 130, tier: "HR Warned Us About" },
  { min: 90,  tier: "C-Suite" },
  { min: 65,  tier: "Middle Manager" },
  { min: 40,  tier: "Team Lead" },
  { min: 0,   tier: "Filing Clerk" },
];

/** Map a rarity score to a tier label. */
export function tierFromScore(score: number): Tier {
  for (const { min, tier } of TIER_THRESHOLDS) {
    if (score >= min) return tier;
  }
  return "Filing Clerk";
}

/**
 * Approximate percentile from a rarity score.
 * Rough mapping based on the tier distribution targets in spec §5.4.
 * Good enough for the share-card display — exact percentile would require
 * Monte-Carlo calibration of the actual pool weights.
 */
export function scoreToPercentile(score: number): number {
  if (score >= 130) return 99;
  if (score >= 90)  return 95;
  if (score >= 65)  return 75;
  if (score >= 40)  return 45;
  return Math.max(1, Math.round((score / 40) * 30));
}
