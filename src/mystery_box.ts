// src/mystery_box.ts
// All Mystery Box logic — pools, roller, scorer, paragraph renderer,
// lore frame, Named Subjects, orchestrator. See:
//   docs/superpowers/specs/2026-04-13-mystery-box-design.md
//
// Pools are intentionally small at first ship (~6 per category). Grow
// to the spec's 30–60 per category as a follow-up — see plan §16.
//
// Note: type imports (TraitBand, TraitEntry, OfficeBlock, etc.) will be
// added by subsequent tasks as they are referenced. Keeping imports
// minimal here to avoid unused-import noise.

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
