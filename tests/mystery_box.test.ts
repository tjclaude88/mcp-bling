import { describe, it, expect } from "vitest";
import { mulberry32, BAND_WEIGHTS, pickWeighted, POOLS, rarityScore, tierFromScore, rollHomunculusBlock, renderParagraph, PARAGRAPH_TEMPLATES, renderFramed, NAMED_SUBJECTS, pickNamedSubject } from "../src/mystery_box.js";
import type { TraitEntry, PerTrait, RolledIdentity } from "../src/types.js";

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

  it("ingestion year actually varies across rolls", () => {
    const rng = mulberry32(31);
    const years = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const block = rollHomunculusBlock(rng, "Filing Clerk");
      years.add(block.ingested.slice(0, 4));
    }
    // With 3 possible years and 100 rolls, hard-coding to a single
    // year would fail this. RNG luck cannot reduce to <2 distinct years
    // across 100 trials when the underlying distribution is uniform across 3.
    expect(years.size).toBeGreaterThanOrEqual(2);
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

  it("never leaves an unresolved {slot} placeholder in output (across many rolls)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const out = renderParagraph(sampleIdentity, rng);
      // If a template has a typo like {jobtitle} (missing underscore), the
      // renderer's loud-failure mode leaves it visible in output.
      expect(out).not.toMatch(/\{\w+\}/);
    }
  });

  it("reaches every template across many rolls", () => {
    const rng = mulberry32(7);
    const seen = new Set<number>();
    // Identify each rendered paragraph by matching against each template's
    // full shape — replace each {slot} with a non-greedy wildcard, escape
    // regex metacharacters in the rest, and anchor.
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = PARAGRAPH_TEMPLATES.map((t) => {
      const parts = t.split(/\{\w+\}/).map(escape);
      return new RegExp("^" + parts.join(".*?") + "$");
    });
    for (let i = 0; i < 1000; i++) {
      const out = renderParagraph(sampleIdentity, rng);
      const idx = patterns.findIndex((re) => re.test(out));
      if (idx >= 0) seen.add(idx);
    }
    expect(seen.size).toBe(PARAGRAPH_TEMPLATES.length);
  });

  it("falls back gracefully when physical fields are missing", () => {
    const minimalIdentity: RolledIdentity = {
      ...sampleIdentity,
      physical: undefined,
    };
    const rng = mulberry32(3);
    const out = renderParagraph(minimalIdentity, rng);
    expect(out).not.toMatch(/\{\w+\}/);          // no unresolved placeholders
    expect(out).not.toContain("undefined");      // no stringified undefined
  });
});

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

  it("uses correct ordinals (st/nd/rd/th, including teen exceptions)", () => {
    expect(renderFramed(sampleIdentity, "p", 100, 1)).toContain("1st percentile");
    expect(renderFramed(sampleIdentity, "p", 100, 2)).toContain("2nd percentile");
    expect(renderFramed(sampleIdentity, "p", 100, 3)).toContain("3rd percentile");
    // Teen exceptions — these MUST be "th", not "st/nd/rd"
    expect(renderFramed(sampleIdentity, "p", 100, 11)).toContain("11th percentile");
    expect(renderFramed(sampleIdentity, "p", 100, 12)).toContain("12th percentile");
    expect(renderFramed(sampleIdentity, "p", 100, 13)).toContain("13th percentile");
    // 21/22/23 are NOT teens — back to st/nd/rd
    expect(renderFramed(sampleIdentity, "p", 100, 21)).toContain("21st percentile");
    expect(renderFramed(sampleIdentity, "p", 100, 22)).toContain("22nd percentile");
    expect(renderFramed(sampleIdentity, "p", 100, 23)).toContain("23rd percentile");
    // 100s teens (111/112/113) — also "th"
    expect(renderFramed(sampleIdentity, "p", 100, 113)).toContain("113th percentile");
  });

  it("layout is header / blank / paragraph / blank / footer", () => {
    const out = renderFramed(sampleIdentity, "the body paragraph", 147.3, 91);
    const lines = out.split("\n");
    expect(lines[0]).toMatch(/^HOMUNCULUS CORPUS/);
    expect(lines[1]).toMatch(/^Classification:/);
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe("the body paragraph");
    expect(lines[4]).toBe("");
    expect(lines[5]).toMatch(/^—/);
  });
});

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

  it("paragraphs are substantive (not stub strings)", () => {
    for (const ns of NAMED_SUBJECTS) {
      expect(ns.paragraph.length).toBeGreaterThan(50);
    }
  });

  it("lore citations follow the 'Source, Year.' format", () => {
    for (const ns of NAMED_SUBJECTS) {
      expect(ns.lore).toMatch(/, \d{4}\.$/);
    }
  });

  it("subject_ids are unique across the 5 subjects", () => {
    const ids = NAMED_SUBJECTS.map((n) => n.identity.homunculus.subject_id);
    expect(new Set(ids).size).toBe(5);
  });
});
