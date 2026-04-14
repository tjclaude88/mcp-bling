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
 * CALIBRATION (2026-04-13, starter pools v1, seed mulberry32(2026), N=10k):
 *   Thresholds set to hit the spec §5.4 distribution target (50/30/14/5/1)
 *   at the empirical score quantiles observed with the current pool
 *   composition. Derived from:
 *     p50  = 56.5   → Filing Clerk  (bottom 50%)
 *     p80  = 89.3   → Team Lead     (50–80 percentile)
 *     p94  = 109.7  → Middle Manager (80–94 percentile)
 *     p99  = 149.3  → C-Suite       (94–99 percentile)
 *     > p99         → HR Warned Us About (top 1%)
 *   Rounded to tidy values within ±2 points of each quantile.
 *
 * Re-calibrate (and lock before any public launch) if the pools change
 * substantially. NFT-space convention: do not recalibrate after users
 * begin rolling — it invalidates previously-rolled rarity ranks. The
 * 10k-roll distribution test in tests/mystery_box.test.ts locks this in.
 */
const TIER_THRESHOLDS: Array<{ min: number; tier: Tier }> = [
  { min: 150, tier: "HR Warned Us About" },
  { min: 110, tier: "C-Suite" },
  { min: 90,  tier: "Middle Manager" },
  { min: 57,  tier: "Team Lead" },
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
 * Approximate percentile from a rarity score, for the share-card display.
 * Values are calibrated to match the TIER_THRESHOLDS above — a score at
 * each tier boundary maps to the "you are rarer than N% of rolls"
 * percentile for that tier's rarity bucket.
 *
 * Calibration (see TIER_THRESHOLDS docstring for methodology):
 *   score ≥ 150 → p99  (top  1% — HR Warned Us About)
 *   score ≥ 110 → p95  (top  5% — C-Suite)
 *   score ≥  90 → p80  (top 20% — Middle Manager)
 *   score ≥  57 → p50  (top 50% — Team Lead)
 *   below       → 1–49 (bottom 50% — Filing Clerk), linearly scaled
 */
export function scoreToPercentile(score: number): number {
  if (score >= 150) return 99;
  if (score >= 110) return 95;
  if (score >= 90)  return 80;
  if (score >= 57)  return 50;
  return Math.max(1, Math.round((score / 57) * 49));
}
