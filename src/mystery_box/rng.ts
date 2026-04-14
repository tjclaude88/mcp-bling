// src/mystery_box/rng.ts
// Random primitives: seedable PRNG, the shared Rng type, per-band weights,
// and the two-stage weighted picker used by pool draws and the homunculus
// flag draw.

import type { TraitBand, TraitEntry, TraitPool } from "../types.js";

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
