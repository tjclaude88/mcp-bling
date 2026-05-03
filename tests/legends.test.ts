import { describe, it, expect } from "vitest";
import { mulberry32, rollIdentity } from "../src/mystery_box.js";

describe("Legends pool — rollIdentity('legends')", () => {
  it("returns a complete result with all required fields", () => {
    const rng = mulberry32(999);
    const result = rollIdentity(rng, "legends");
    expect(result.identity.name).toBeTruthy();
    expect(result.identity.office.job_title).toBeTruthy();
    expect(result.identity.office.habit).toBeTruthy();
    expect(result.identity.office.desk_setup).toBeTruthy();
    expect(result.identity.office.coffee_ritual).toBeTruthy();
    expect(result.identity.office.meeting_energy).toBeTruthy();
    expect(result.identity.office.passive_aggressive).toBeTruthy();
    expect(result.identity.physical).toBeDefined();
    expect(result.identity.physical!.height).toBeTruthy();
    expect(result.identity.physical!.accessory).toBeTruthy();
    expect(result.identity.physical!.expression).toBeTruthy();
    expect(result.identity.physical!.material).toBeTruthy();
    expect(result.identity.theme.primary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.identity.theme.accent_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.rarity.score).toBeGreaterThan(0);
    expect(result.rarity.tier).toBeTruthy();
    expect(result.paragraph).toBeTruthy();
    expect(result.framed).toBeTruthy();
  });

  it("is deterministic with a fixed seed", () => {
    const a = rollIdentity(mulberry32(42), "legends");
    const b = rollIdentity(mulberry32(42), "legends");
    expect(a.identity.name).toBe(b.identity.name);
    expect(a.identity.office.job_title).toBe(b.identity.office.job_title);
  });

  it("produces a different name from the wow variant with the same seed", () => {
    const legends = rollIdentity(mulberry32(42), "legends");
    const wow = rollIdentity(mulberry32(42), "wow");
    expect(legends.identity.name).not.toBe(wow.identity.name);
  });

  it("rarity score stays in valid range across 50 rolls", () => {
    const rng = mulberry32(777);
    for (let i = 0; i < 50; i++) {
      const result = rollIdentity(rng, "legends");
      expect(result.rarity.score).toBeGreaterThanOrEqual(0);
      expect(result.rarity.score).toBeLessThanOrEqual(1000);
    }
  });

  it("never leaves an unresolved {slot} placeholder in the paragraph", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const result = rollIdentity(rng, "legends");
      expect(result.paragraph).not.toMatch(/\{\w+\}/);
    }
  });
});
