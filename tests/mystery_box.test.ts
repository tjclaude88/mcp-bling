import { describe, it, expect } from "vitest";
import { mulberry32, BAND_WEIGHTS, pickWeighted, POOLS } from "../src/mystery_box.js";
import type { TraitEntry } from "../src/types.js";

describe("mulberry32", () => {
  it("produces deterministic output for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
    expect(a()).toBe(b());
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
    expect(a()).not.toBe(b());      // exact equality — algorithm is bit-deterministic
  });
});

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

  it("respects band weights over many draws (one entry per band)", () => {
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

  it("band probabilities stay correct when a band has multiple entries", () => {
    // Two Common entries — band probability should still be ~50%, NOT inflated.
    const fatPool: TraitEntry[] = [
      { value: "common-A",     band: "Common" },
      { value: "common-B",     band: "Common" },
      { value: "uncommon-A",   band: "Uncommon" },
      { value: "rare-A",       band: "Rare" },
      { value: "legendary-A",  band: "Legendary" },
      { value: "mythic-A",     band: "Mythic" },
    ];
    const rng = mulberry32(101);
    let common = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const pick = pickWeighted(fatPool, rng);
      if (pick.band === "Common") common++;
    }
    expect(common / N).toBeGreaterThan(0.47);
    expect(common / N).toBeLessThan(0.53);
  });

  it("uniformly distributes within a band", () => {
    const fatPool: TraitEntry[] = [
      { value: "x", band: "Common" },
      { value: "y", band: "Common" },
    ];
    const rng = mulberry32(7);
    let xs = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const pick = pickWeighted(fatPool, rng);
      if (pick.value === "x") xs++;
    }
    // Should be ~50/50.
    expect(xs / N).toBeGreaterThan(0.45);
    expect(xs / N).toBeLessThan(0.55);
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
