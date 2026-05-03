# Identity Rebrand + Legends Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shift all messaging to "Give your bot an identity!", add a Legends character pool (historical figures in absurd corporate roles) as a new `variant` on `roll_identity`, and bump to v0.2.0.

**Architecture:** The Legends pool exports a `LEGENDS_POOLS` object with the same 13 `CategoryKey` keys as the WOW `POOLS`, so the rarity engine reuses unchanged. `rollIdentity(rng, variant)` gains an optional second param that routes to the right pools and templates. The `renderParagraph` function gains an optional third param for custom templates — existing calls are unaffected.

**Tech Stack:** TypeScript, MCP SDK, Zod (input validation), Vitest (tests). Node.js ESM.

---

## File map

**New files:**
- `src/mystery_box/legends_pools.ts` — all 13 trait pools for the Legends variant
- `src/mystery_box/legends_rendering.ts` — paragraph templates in the Legends voice
- `tests/legends.test.ts` — smoke tests + determinism for the Legends roll

**Modified files:**
- `src/types.ts` — add `Variant = "wow" | "legends"`
- `src/mystery_box/rendering.ts` — add optional `templates` param to `renderParagraph`
- `src/mystery_box.ts` — update `rollIdentity(rng, variant)`, re-export new symbols
- `src/tools.ts` — update `rollIdentityHandler`, all 5 tool titles/descriptions, add `variant` input to `roll_identity`
- `package.json` — version 0.1.1 → 0.2.0, description
- `server.json` — version, description
- `CHANGELOG.md` — 0.2.0 entry
- `README.md` — new opening, document both pools

---

### Task 1: Add `Variant` type to `src/types.ts`

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add the type**

Open `src/types.ts`. After the `Tier` type block (around line 75), add:

```typescript
/** Which character pool to use when rolling a random identity. */
export type Variant = "wow" | "legends";
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
npm test
```

Expected: all 94 tests pass. This is a pure type addition with no runtime effect.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add Variant type for wow | legends pool selection"
```

---

### Task 2: Write the failing Legends test

**Files:**
- Create: `tests/legends.test.ts`

- [ ] **Step 1: Write the test file**

Create `tests/legends.test.ts`:

```typescript
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
    expect(result.identity.physical?.height).toBeTruthy();
    expect(result.identity.physical?.accessory).toBeTruthy();
    expect(result.identity.physical?.expression).toBeTruthy();
    expect(result.identity.physical?.material).toBeTruthy();
    expect(result.identity.theme.primary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.identity.theme.accent_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.rarity.score).toBeGreaterThan(0);
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
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npm test -- tests/legends.test.ts
```

Expected: compile error or test failure — `rollIdentity` does not yet accept a second argument. The test failing here proves our test is wired up and driving real implementation.

---

### Task 3: Create `src/mystery_box/legends_pools.ts`

**Files:**
- Create: `src/mystery_box/legends_pools.ts`

- [ ] **Step 1: Write the file**

Create `src/mystery_box/legends_pools.ts` with all 13 pool keys. Each pool mirrors the WOW structure (`TraitEntry[]` with `value` + `band`). Theme colours are historically inspired.

```typescript
// src/mystery_box/legends_pools.ts
// Trait pools for the Legends variant — historical figures in absurd corporate roles.
// All 13 CategoryKeys must be present so the rarity engine can reuse them unchanged.

import type { TraitPool } from "../types.js";
import type { CategoryKey } from "./pools.js";

// ---------------------------------------------------------------------------
// Names — historical figures, 100+ years dead
// ---------------------------------------------------------------------------
const LEGENDS_NAMES: TraitPool = [
  // Common (21) — the household names
  { value: "Julius Caesar",            band: "Common" },
  { value: "Cleopatra",                band: "Common" },
  { value: "Napoleon Bonaparte",       band: "Common" },
  { value: "Marie Curie",              band: "Common" },
  { value: "William Shakespeare",      band: "Common" },
  { value: "Sun Tzu",                  band: "Common" },
  { value: "Leonardo da Vinci",        band: "Common" },
  { value: "Aristotle",               band: "Common" },
  { value: "Charles Darwin",           band: "Common" },
  { value: "Joan of Arc",              band: "Common" },
  { value: "Nikola Tesla",             band: "Common" },
  { value: "Galileo Galilei",          band: "Common" },
  { value: "Socrates",                 band: "Common" },
  { value: "Marco Polo",               band: "Common" },
  { value: "Florence Nightingale",     band: "Common" },
  { value: "Isaac Newton",             band: "Common" },
  { value: "Plato",                    band: "Common" },
  { value: "Confucius",                band: "Common" },
  { value: "Archimedes",               band: "Common" },
  { value: "Catherine the Great",      band: "Common" },
  { value: "Hannibal Barca",           band: "Common" },

  // Uncommon (12) — slightly less famous but still legendary
  { value: "Niccolò Machiavelli",      band: "Uncommon" },
  { value: "Harriet Tubman",           band: "Uncommon" },
  { value: "Genghis Khan",             band: "Uncommon" },
  { value: "Ada Lovelace",             band: "Uncommon" },
  { value: "Ramses II",                band: "Uncommon" },
  { value: "Hypatia of Alexandria",    band: "Uncommon" },
  { value: "Attila the Hun",           band: "Uncommon" },
  { value: "Ching Shih",               band: "Uncommon" },
  { value: "Saladin",                  band: "Uncommon" },
  { value: "Boudicca",                 band: "Uncommon" },
  { value: "Zheng He",                 band: "Uncommon" },
  { value: "Mary Wollstonecraft",      band: "Uncommon" },

  // Rare (7) — names with an editorial qualifier
  { value: "Julius Caesar (post-Ides)", band: "Rare" },
  { value: "Napoleon (the Elba years)", band: "Rare" },
  { value: "Socrates (asking questions again)", band: "Rare" },
  { value: "Tesla (the unpaid kind)",   band: "Rare" },
  { value: "Darwin (still working on a theory)", band: "Rare" },
  { value: "Machiavelli (off the record)", band: "Rare" },
  { value: "Genghis Khan (in a meeting)", band: "Rare" },

  // Legendary (3)
  { value: "The Real Leonardo (not DiCaprio)", band: "Legendary" },
  { value: "Sun Tzu, Agile Coach",     band: "Legendary" },
  { value: "Cleopatra, Brand Ambassador", band: "Legendary" },

  // Mythic (2)
  { value: "She Who Rewrote History (in a different font)", band: "Mythic" },
  { value: "The One Who Conquered It All and Then Got Ides'd", band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Job titles — historical roles reframed in corporate language
// ---------------------------------------------------------------------------
const LEGENDS_JOB_TITLES: TraitPool = [
  // Common (21)
  { value: "Head of Expansion",                 band: "Common" },
  { value: "Chief Brand Ambassador",            band: "Common" },
  { value: "Strategy Consultant",               band: "Common" },
  { value: "Regional Manager (Deceased)",       band: "Common" },
  { value: "Research Lead",                     band: "Common" },
  { value: "Content Creator",                   band: "Common" },
  { value: "Operations Director",               band: "Common" },
  { value: "Chief Curiosity Officer",           band: "Common" },
  { value: "Talent Acquisition Lead",           band: "Common" },
  { value: "Field Commander",                   band: "Common" },
  { value: "Philosophy Department",             band: "Common" },
  { value: "Innovation Specialist",             band: "Common" },
  { value: "Marine Navigation Lead",            band: "Common" },
  { value: "Healthcare Reform Lead",            band: "Common" },
  { value: "Applied Mathematics",               band: "Common" },
  { value: "Founder and Philosopher",           band: "Common" },
  { value: "Territory Acquisition Manager",     band: "Common" },
  { value: "Cross-Cultural Relations",          band: "Common" },
  { value: "Logistics and Supply Director",     band: "Common" },
  { value: "Governance Strategist",             band: "Common" },
  { value: "Knowledge Management Officer",      band: "Common" },

  // Uncommon (12)
  { value: "Hostile Takeover Specialist",       band: "Uncommon" },
  { value: "Regional Manager (France and Surrounding Areas)", band: "Uncommon" },
  { value: "Lab Safety's Most Wanted",          band: "Uncommon" },
  { value: "People Operations Lead",            band: "Uncommon" },
  { value: "Talent Acquisition — Survival of the Fittest", band: "Uncommon" },
  { value: "VP of Disruptive Reformation",      band: "Uncommon" },
  { value: "Director of Unsolicited Advice",    band: "Uncommon" },
  { value: "Head of Questioning Everything",    band: "Uncommon" },
  { value: "Senior Conqueror, Emerging Markets", band: "Uncommon" },
  { value: "Chief Grievance Officer",           band: "Uncommon" },
  { value: "Strategic Hemlock Risk Manager",    band: "Uncommon" },
  { value: "Associate Director of Burning Things Down", band: "Uncommon" },

  // Rare (7)
  { value: "Strategy Consultant (Deceased, Unavailable Tuesdays)", band: "Rare" },
  { value: "Interim Emperor (Self-Appointed)",  band: "Rare" },
  { value: "Head of Mug Allocation (Former General)", band: "Rare" },
  { value: "Principal Gadfly, Philosophy Division", band: "Rare" },
  { value: "Chair of the Unfinished Masterpiece Subcommittee", band: "Rare" },
  { value: "Warden of the Second-Floor Printing Press", band: "Rare" },
  { value: "Deputy Director of Torch-and-Pitchfork Operations", band: "Rare" },

  // Legendary (3)
  { value: "Grand Architect of the Known World", band: "Legendary" },
  { value: "Chancellor of Theories Nobody Can Disprove", band: "Legendary" },
  { value: "Wizard of Extremely Inconvenient Revolutions", band: "Legendary" },

  // Mythic (2)
  { value: "Eternal Custodian of the Quarterly Conquest Roadmap", band: "Mythic" },
  { value: "Galactic Sovereign of Historical Inevitability", band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Desk setups — workspaces befitting a legend
// ---------------------------------------------------------------------------
const LEGENDS_DESK_SETUPS: TraitPool = [
  // Common (21)
  { value: "a map of territories not yet taken",                        band: "Common" },
  { value: "a stack of scrolls nobody else can read",                   band: "Common" },
  { value: "three unfinished inventions and a globe",                   band: "Common" },
  { value: "a single candle and an unfinished manuscript",              band: "Common" },
  { value: "a compass pointing somewhere unconventional",               band: "Common" },
  { value: "a half-completed philosophy treatise",                      band: "Common" },
  { value: "a clay tablet covered in dense annotations",                band: "Common" },
  { value: "a war table with miniature figurines, very serious",        band: "Common" },
  { value: "scattered star charts and an astrolabe",                    band: "Common" },
  { value: "a growing pile of unanswered dispatches",                   band: "Common" },
  { value: "a mirror angled to reflect power",                          band: "Common" },
  { value: "a quill worn to a nub and three backup quills",             band: "Common" },
  { value: "a terrarium of sand labelled 'future territory'",          band: "Common" },
  { value: "an anatomical diagram pinned to the wall, annotated",      band: "Common" },
  { value: "a pile of expense reports labelled 'campaign costs'",      band: "Common" },
  { value: "a sundial they check more than anyone deems necessary",    band: "Common" },
  { value: "a hand-drawn org chart with too many levels",              band: "Common" },
  { value: "a bowl of wax seals for correspondence they haven't sent", band: "Common" },
  { value: "two candles and a copy of The Art of War, tabbed heavily", band: "Common" },
  { value: "a portrait of themselves commissioned last Tuesday",       band: "Common" },
  { value: "a stack of unopened enemy negotiations",                   band: "Common" },

  // Uncommon (12)
  { value: "a battle plan for the quarterly review, illustrated",      band: "Uncommon" },
  { value: "seventeen drafts of the same edict, all slightly different", band: "Uncommon" },
  { value: "a handwritten list of grudges, cross-referenced",          band: "Uncommon" },
  { value: "a moleskine full of observations nobody asked for",         band: "Uncommon" },
  { value: "a magnetic lodestone and navigational tools nobody can use", band: "Uncommon" },
  { value: "a periodic table sketched by hand with personal notes",    band: "Uncommon" },
  { value: "a complete diagram of the known universe, slightly wrong", band: "Uncommon" },
  { value: "a chipped goblet inherited from a predecessor",            band: "Uncommon" },
  { value: "a collection of bones labelled 'research samples'",        band: "Uncommon" },
  { value: "a second desk facing theirs, unoccupied, unexplained",    band: "Uncommon" },
  { value: "an inkwell so large it suggests ambitions",                band: "Uncommon" },
  { value: "a laurel wreath draped over the monitor stand",            band: "Uncommon" },

  // Rare (7)
  { value: "a diorama of their greatest campaign, accurately scaled",  band: "Rare" },
  { value: "a nine-scroll war correspondence rack",                    band: "Rare" },
  { value: "a human skull used as a paperweight, no explanation given", band: "Rare" },
  { value: "a framed cease-and-desist from a rival empire, displayed with pride", band: "Rare" },
  { value: "a full wall-map annotated with 'mine', 'soon', and 'definitely mine'", band: "Rare" },
  { value: "a collection of seventeen identical styluses",             band: "Rare" },
  { value: "a throne adapted, with marginal success, to function as an office chair", band: "Rare" },

  // Legendary (3)
  { value: "a potted fig that has outlived three empires and a merger", band: "Legendary" },
  { value: "forty unwashed goblets in a stable equilibrium",           band: "Legendary" },
  { value: "a chair that creaks prophetically",                        band: "Legendary" },

  // Mythic (2)
  { value: "a full-scale model of the Colosseum, built during a slow Q3", band: "Mythic" },
  { value: "a second identical desk facing theirs, always occupied, never explained", band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------
const LEGENDS_HABITS: TraitPool = [
  // Common (21)
  { value: "rewrites team decisions and claims it was always the plan", band: "Common" },
  { value: "arrives two hours late and immediately starts conquering", band: "Common" },
  { value: "invents something groundbreaking and tells no one",        band: "Common" },
  { value: "gives unsolicited strategic advice during standup",        band: "Common" },
  { value: "cc's the entire organisation on every dispatch",           band: "Common" },
  { value: "asks clarifying questions until the meeting ends itself",  band: "Common" },
  { value: "disappears mid-project and returns with a better plan",    band: "Common" },
  { value: "takes detailed field notes and never shares them",         band: "Common" },
  { value: "reorganises the shared drive without warning",             band: "Common" },
  { value: "insists on peer review for every single discovery",        band: "Common" },
  { value: "draws geometric proofs in the margins of unrelated documents", band: "Common" },
  { value: "sends follow-up scrolls at midnight",                      band: "Common" },
  { value: "quotes themselves at length in team communications",       band: "Common" },
  { value: "recalibrates everyone else's estimates downward",          band: "Common" },
  { value: "schedules one-to-ones but only discusses legacy",          band: "Common" },
  { value: "brings maps to meetings that do not require maps",         band: "Common" },
  { value: "overcomplicates solutions that were already working",      band: "Common" },
  { value: "names every project after themselves",                     band: "Common" },
  { value: "delegates aggressively, then checks everything anyway",    band: "Common" },
  { value: "annotates other people's documents without permission",    band: "Common" },
  { value: "starts every meeting with a brief historical context",     band: "Common" },

  // Uncommon (12)
  { value: "documents everything as if for a future biographer",       band: "Uncommon" },
  { value: "speaks only in rhetorical questions after 3pm",            band: "Uncommon" },
  { value: "pivots the entire project direction after one bad meeting", band: "Uncommon" },
  { value: "leaves cryptic notes on the whiteboard that nobody erases", band: "Uncommon" },
  { value: "reinterprets the brief as an opportunity for revolution",  band: "Uncommon" },
  { value: "quietly wins every argument by waiting until everyone leaves", band: "Uncommon" },
  { value: "proposes renaming things after their own victories",       band: "Uncommon" },
  { value: "schedules retrospectives that turn into philosophical crises", band: "Uncommon" },
  { value: "treats every obstacle as a siege to be waited out",        band: "Uncommon" },
  { value: "has a contingency plan for the contingency plan",          band: "Uncommon" },
  { value: "writes the performance review before the performance has occurred", band: "Uncommon" },
  { value: "claims all good ideas were their idea, in writing",        band: "Uncommon" },

  // Rare (7)
  { value: "has conquered this meeting and three others simultaneously", band: "Rare" },
  { value: "rewrites the org chart after every major battle",          band: "Rare" },
  { value: "insists the current approach is how Rome did it",          band: "Rare" },
  { value: "leaves for 'a long walk' and returns having changed history", band: "Rare" },
  { value: "micromanages the catapult trajectory",                     band: "Rare" },
  { value: "creates a new measurement unit named after themselves",    band: "Rare" },
  { value: "schedules recurring one-to-ones with the concept of time", band: "Rare" },

  // Legendary (3)
  { value: "has already predicted this meeting's outcome",             band: "Legendary" },
  { value: "silently calculates the load-bearing potential of every room entered", band: "Legendary" },
  { value: "reorganises empires the way others reorganise their inbox", band: "Legendary" },

  // Mythic (2)
  { value: "exists simultaneously in three historical eras and one sprint", band: "Mythic" },
  { value: "answers every question with the question it should have been", band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Coffee rituals — historically adapted beverages
// ---------------------------------------------------------------------------
const LEGENDS_COFFEE_RITUALS: TraitPool = [
  // Common (21)
  { value: "mead, always mead",                                         band: "Common" },
  { value: "wine, for medicinal reasons",                               band: "Common" },
  { value: "hot water with herbs, very serious about it",               band: "Common" },
  { value: "whatever the troops are having",                            band: "Common" },
  { value: "strong black tea, imported at great expense",               band: "Common" },
  { value: "goat milk, warm",                                           band: "Common" },
  { value: "river water, boiled, labelled 'artisanal'",                 band: "Common" },
  { value: "a fermented grain beverage nobody else will touch",         band: "Common" },
  { value: "nothing — survives on rhetoric alone",                      band: "Common" },
  { value: "whatever is available in the occupied territory",           band: "Common" },
  { value: "honey dissolved in water, slowly, contemplatively",         band: "Common" },
  { value: "ale, served at room temperature, no complaints",            band: "Common" },
  { value: "a broth of unspecified origin, consumed without emotion",   band: "Common" },
  { value: "juice of pressed grapes, unfermented, on principle",        band: "Common" },
  { value: "bark tea with documented health properties",                band: "Common" },
  { value: "a beverage of their own invention, untested on others",     band: "Common" },
  { value: "water from a specific well, on principle",                  band: "Common" },
  { value: "pomegranate juice, three cups minimum",                     band: "Common" },
  { value: "nothing before the first victory of the day",               band: "Common" },
  { value: "a tincture described only as 'necessary'",                  band: "Common" },
  { value: "imported spiced milk, very particular about temperature",   band: "Common" },

  // Uncommon (12)
  { value: "the same beverage every day, without variation, without explanation", band: "Uncommon" },
  { value: "a complex ritual involving three vessels and a sunrise",    band: "Uncommon" },
  { value: "whatever the philosopher brought today",                    band: "Uncommon" },
  { value: "wine cut with seawater, an acquired taste",                 band: "Uncommon" },
  { value: "a fermented drink they claim cures everything",             band: "Uncommon" },
  { value: "nothing — fasting for strategic clarity",                   band: "Uncommon" },
  { value: "a private reserve nobody else has access to",               band: "Uncommon" },
  { value: "warm broth consumed while reviewing battle plans",          band: "Uncommon" },
  { value: "an experimental compound that may or may not be poison",    band: "Uncommon" },
  { value: "spring water collected at the solstice",                    band: "Uncommon" },
  { value: "the conqueror's blend — strong, bitter, taken standing",    band: "Uncommon" },
  { value: "a daily dose of vinegar, for the circulation",              band: "Uncommon" },

  // Rare (7)
  { value: "hemlock-adjacent, a complex relationship",                  band: "Rare" },
  { value: "nothing before noon, then everything",                      band: "Rare" },
  { value: "a beverage so classified even the cup is redacted",         band: "Rare" },
  { value: "tears of a defeated rival, allegedly",                      band: "Rare" },
  { value: "an alchemical tincture not yet peer-reviewed",              band: "Rare" },
  { value: "the same thing Julius Caesar ordered, out of spite",        band: "Rare" },
  { value: "survival on ambition and bad posture alone",                band: "Rare" },

  // Legendary (3)
  { value: "they have not drunk anything in two thousand years and seem fine", band: "Legendary" },
  { value: "a beverage invented specifically to intimidate",            band: "Legendary" },
  { value: "the first sip of every morning taken in complete silence, in armour", band: "Legendary" },

  // Mythic (2)
  { value: "nothing — they sustain themselves entirely on legacy",      band: "Mythic" },
  { value: "a liquid so rare it has not been catalogued by science",    band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Meeting energy
// ---------------------------------------------------------------------------
const LEGENDS_MEETING_ENERGY: TraitPool = [
  // Common (21)
  { value: "has already left for Elba",                                 band: "Common" },
  { value: "arrived 2,000 years early and is still waiting",           band: "Common" },
  { value: "has conquered this meeting and three others today",         band: "Common" },
  { value: "nodding slowly, planning something",                        band: "Common" },
  { value: "the only one who read the pre-read, mentions it",           band: "Common" },
  { value: "politely rewrites the agenda in real time",                 band: "Common" },
  { value: "silent but clearly the most dangerous person in the room",  band: "Common" },
  { value: "takes notes on a scroll, in Latin, unlabelled",            band: "Common" },
  { value: "asks one question that derails everything for forty minutes", band: "Common" },
  { value: "the only one with a timeline that extends past Q4",         band: "Common" },
  { value: "has predicted the outcome and is disappointed anyway",      band: "Common" },
  { value: "contributes thoughtfully, then turns everything to strategy", band: "Common" },
  { value: "arrives with prepared remarks that were not requested",     band: "Common" },
  { value: "keeps bringing the conversation back to first principles",  band: "Common" },
  { value: "visibly calculating the structural weaknesses of the room", band: "Common" },
  { value: "speaks last, which turns out to be most important",         band: "Common" },
  { value: "asks follow-up questions that nobody can answer",           band: "Common" },
  { value: "has already decided the outcome",                           band: "Common" },
  { value: "brings a map to a meeting that needed a spreadsheet",       band: "Common" },
  { value: "very calm, which is somehow alarming",                      band: "Common" },
  { value: "exits before the action items are assigned",                band: "Common" },

  // Uncommon (12)
  { value: "takes detailed notes, never shares them",                   band: "Uncommon" },
  { value: "interprets every agenda item as a strategic opportunity",   band: "Uncommon" },
  { value: "has already sent a follow-up scroll before the meeting ends", band: "Uncommon" },
  { value: "arrives in full armour, declines to explain",               band: "Uncommon" },
  { value: "reframes every problem as a siege",                         band: "Uncommon" },
  { value: "delivers a monologue before the meeting has technically started", band: "Uncommon" },
  { value: "the kind of calm that has won and lost empires",            band: "Uncommon" },
  { value: "causes a philosophical crisis in the AOB section",          band: "Uncommon" },
  { value: "declares the meeting complete before the host does",        band: "Uncommon" },
  { value: "redirects every question back to the asker",                band: "Uncommon" },
  { value: "uses historical precedent to win every point",              band: "Uncommon" },
  { value: "listens with the focus of someone composing a dispatch",    band: "Uncommon" },

  // Rare (7)
  { value: "has already conquered the meeting's subject matter, literally", band: "Rare" },
  { value: "corrects the meeting title in the calendar invite",         band: "Rare" },
  { value: "completes the objectives before anyone else sits down",     band: "Rare" },
  { value: "delivers a TED talk during what was supposed to be a standup", band: "Rare" },
  { value: "nominates themselves as chair mid-meeting",                 band: "Rare" },
  { value: "declares the meeting adjourned at a tactically perfect moment", band: "Rare" },
  { value: "wins the meeting without speaking",                         band: "Rare" },

  // Legendary (3)
  { value: "has conquered this meeting, the previous meeting, and the one after", band: "Legendary" },
  { value: "the meeting cannot begin until they have decided it will",  band: "Legendary" },
  { value: "leaves the room subtly different",                          band: "Legendary" },

  // Mythic (2)
  { value: "is simultaneously present and historically inevitable",     band: "Mythic" },
  { value: "the meeting ends when they choose, and not before",         band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Passive-aggressive sign-offs (email / scroll equivalents)
// ---------------------------------------------------------------------------
const LEGENDS_PASSIVE_AGGRESSIVE: TraitPool = [
  // Common (21)
  { value: "per my last scroll",                                        band: "Common" },
  { value: "as I said before the fall of Rome",                        band: "Common" },
  { value: "noted — though history will judge differently",             band: "Common" },
  { value: "I'll defer to the conqueror on this one",                   band: "Common" },
  { value: "as previously inscribed",                                   band: "Common" },
  { value: "per the edict you seem to have misplaced",                  band: "Common" },
  { value: "circling back on my earlier dispatch",                      band: "Common" },
  { value: "following up on my last seventeen questions",               band: "Common" },
  { value: "as Aristotle said — and he was right",                     band: "Common" },
  { value: "kindly refer to the original papyrus",                      band: "Common" },
  { value: "the record shows I raised this concern",                    band: "Common" },
  { value: "to clarify — this was not what I proposed",                 band: "Common" },
  { value: "history has already answered this question",                band: "Common" },
  { value: "I remain, as always, unconvinced",                          band: "Common" },
  { value: "per my previous three chapters on this subject",            band: "Common" },
  { value: "awaiting your reply before the next campaign season",       band: "Common" },
  { value: "I see this has not been actioned",                          band: "Common" },
  { value: "as outlined in the conquest brief",                         band: "Common" },
  { value: "this is not what I had inscribed in the tablet",            band: "Common" },
  { value: "see attached — the original plan, which was not followed",  band: "Common" },
  { value: "your earliest convenience would be appreciated",            band: "Common" },

  // Uncommon (12)
  { value: "as I stated clearly during the Gallic campaign",            band: "Uncommon" },
  { value: "I trust this clears up any confusion you may have introduced", band: "Uncommon" },
  { value: "looping in the empire, for visibility",                     band: "Uncommon" },
  { value: "please find attached the diagram you chose to ignore",      band: "Uncommon" },
  { value: "moving this forward, as I had hoped to do weeks ago",       band: "Uncommon" },
  { value: "the theory was correct — the execution was yours",          band: "Uncommon" },
  { value: "cc'ing the Senate for awareness",                           band: "Uncommon" },
  { value: "to reiterate — and I cannot stress this enough",            band: "Uncommon" },
  { value: "I'll note my objection here for the historical record",     band: "Uncommon" },
  { value: "setting a reminder for two centuries from now",             band: "Uncommon" },
  { value: "actioning this myself, as previously offered",              band: "Uncommon" },
  { value: "I've updated the scroll to reflect what actually happened", band: "Uncommon" },

  // Rare (7)
  { value: "filed under: things I said would happen",                   band: "Rare" },
  { value: "I'll await confirmation from your toga's sleeve",           band: "Rare" },
  { value: "adding this to my upcoming biography, chapter eleven",      band: "Rare" },
  { value: "for future reference — this is why you consult Sun Tzu",    band: "Rare" },
  { value: "the gods have been notified",                               band: "Rare" },
  { value: "I have made a note in the permanent record of history",     band: "Rare" },
  { value: "per my earlier prophecy",                                   band: "Rare" },

  // Legendary (3)
  { value: "et tu?",                                                    band: "Legendary" },
  { value: "I will let posterity be the judge",                         band: "Legendary" },
  { value: "forwarding this to the next civilisation for review",       band: "Legendary" },

  // Mythic (2)
  { value: "the record of history has been updated accordingly",        band: "Mythic" },
  { value: "this conversation will be taught in schools",               band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Physical height
// ---------------------------------------------------------------------------
const LEGENDS_PHYSICAL_HEIGHT: TraitPool = [
  // Common (21) — not all heroes are tall
  { value: "surprisingly short for the legend",                         band: "Common" },
  { value: "of commanding stature",                                     band: "Common" },
  { value: "built for the ages",                                        band: "Common" },
  { value: "smaller than the statues suggest",                          band: "Common" },
  { value: "average height, insists otherwise",                         band: "Common" },
  { value: "tall enough to see the whole battlefield",                  band: "Common" },
  { value: "of modest build, compensating historically",                band: "Common" },
  { value: "compact and efficient",                                     band: "Common" },
  { value: "imposing from across the forum",                            band: "Common" },
  { value: "the height of someone who has never lost an argument",      band: "Common" },
  { value: "wiry, which everyone underestimates",                       band: "Common" },
  { value: "taller than you'd expect",                                  band: "Common" },
  { value: "shorter than the monuments",                                band: "Common" },
  { value: "precisely the right height for their ambitions",            band: "Common" },
  { value: "unremarkable stature, remarkable everything else",          band: "Common" },
  { value: "the height of someone planning something",                  band: "Common" },
  { value: "broad-shouldered, narrow-minded about compromise",          band: "Common" },
  { value: "slight but with the gravity of someone much larger",        band: "Common" },
  { value: "solidly built for a philosopher",                           band: "Common" },
  { value: "medium height, legendary reach",                            band: "Common" },
  { value: "standing at exactly the height their armour suggests",      band: "Common" },

  // Uncommon (12)
  { value: "taller than Rome, shorter than the myth",                   band: "Uncommon" },
  { value: "exactly the height depicted in the famous portrait",        band: "Uncommon" },
  { value: "the height of controlled fury",                             band: "Uncommon" },
  { value: "built like an obelisk",                                     band: "Uncommon" },
  { value: "the same height as their rival, which they dispute",        band: "Uncommon" },
  { value: "taller in the official records",                            band: "Uncommon" },
  { value: "apparently taller on horseback, always on horseback",       band: "Uncommon" },
  { value: "the stature of someone who has written a treatise on stature", band: "Uncommon" },
  { value: "of uncertain height — the accounts differ",                 band: "Uncommon" },
  { value: "precisely as tall as necessary",                            band: "Uncommon" },
  { value: "a little shorter than expected, infinitely more dangerous", band: "Uncommon" },
  { value: "built for endurance, not altitude",                         band: "Uncommon" },

  // Rare (7)
  { value: "permanently mid-conquest",                                  band: "Rare" },
  { value: "taller in four dimensions",                                 band: "Rare" },
  { value: "the height that rewrote trade routes",                      band: "Rare" },
  { value: "the exact height required to make others uncomfortable",    band: "Rare" },
  { value: "indeterminate — the toga compensates",                      band: "Rare" },
  { value: "the height of someone who has never not been in the room",  band: "Rare" },
  { value: "larger than life, and only slightly smaller than legend",   band: "Rare" },

  // Legendary (3)
  { value: "the kind of tall that makes rooms rearrange themselves",    band: "Legendary" },
  { value: "described differently in every historical source",          band: "Legendary" },
  { value: "an expression that resolves differently depending on era",  band: "Legendary" },

  // Mythic (2)
  { value: "a physical presence that predates the building",            band: "Mythic" },
  { value: "whatever height history has decided, plus two centimetres", band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Physical accessory
// ---------------------------------------------------------------------------
const LEGENDS_PHYSICAL_ACCESSORY: TraitPool = [
  // Common (21)
  { value: "a laurel wreath worn unironically",                         band: "Common" },
  { value: "a compass that may or may not be correct",                  band: "Common" },
  { value: "a quill that somehow still works",                          band: "Common" },
  { value: "a battle plan for the quarterly review",                    band: "Common" },
  { value: "a lanyard with an expired empire badge",                    band: "Common" },
  { value: "a scroll that has been referenced but never finished",      band: "Common" },
  { value: "a signet ring engraved with a symbol nobody explains",      band: "Common" },
  { value: "a small knife worn professionally",                         band: "Common" },
  { value: "a hand-drawn star map, personal use only",                  band: "Common" },
  { value: "a measuring instrument of obscure purpose",                 band: "Common" },
  { value: "a wax tablet covered in today's decisive thoughts",         band: "Common" },
  { value: "a short sword worn like a letter opener",                   band: "Common" },
  { value: "a copy of The Prince tucked into their belt",               band: "Common" },
  { value: "a philosophical treatise disguised as a to-do list",        band: "Common" },
  { value: "a small mirror for checking the correct expression",        band: "Common" },
  { value: "a water flask from a country they have since acquired",     band: "Common" },
  { value: "a satchel of very old notes",                               band: "Common" },
  { value: "a token from a battle everyone else has forgotten",         band: "Common" },
  { value: "a bag of sand from a place they are proud of visiting",     band: "Common" },
  { value: "a worn copy of their own published work",                   band: "Common" },
  { value: "a portable writing kit for important thoughts",             band: "Common" },

  // Uncommon (12)
  { value: "an abacus worn on the belt like a weapon",                  band: "Uncommon" },
  { value: "a suspicious apple",                                        band: "Uncommon" },
  { value: "a walking staff with carved annotations from every country visited", band: "Uncommon" },
  { value: "a set of calipers from an ongoing unfinished project",      band: "Uncommon" },
  { value: "a crown kept in a bag for strategic use",                   band: "Uncommon" },
  { value: "a clay seal from an empire that technically no longer exists", band: "Uncommon" },
  { value: "a single feather from a bird nobody can name",              band: "Uncommon" },
  { value: "a polished obsidian disc used for reflection",              band: "Uncommon" },
  { value: "a letter of introduction from themselves, to themselves",   band: "Uncommon" },
  { value: "a trophy from a debate nobody else remembers winning",      band: "Uncommon" },
  { value: "a sundial small enough to check indoors",                   band: "Uncommon" },
  { value: "a spare toga rolled and strapped to the satchel",           band: "Uncommon" },

  // Rare (7)
  { value: "a scroll labelled 'not for sharing'",                       band: "Rare" },
  { value: "a full set of surveying tools for unexpected territory",    band: "Rare" },
  { value: "a wax tablet with things they plan to say, pre-written",    band: "Rare" },
  { value: "a brooch engraved with a battle that historians dispute",   band: "Rare" },
  { value: "a small but functional trebuchet model, decorative",        band: "Rare" },
  { value: "a map folded to show only the territories they control",    band: "Rare" },
  { value: "a list of names, growing",                                  band: "Rare" },

  // Legendary (3)
  { value: "a lanyard with access to seventeen restricted areas across three empires", band: "Legendary" },
  { value: "an ID badge from a civilisation that no longer exists",     band: "Legendary" },
  { value: "a compass displaying a direction no cartographer has agreed on", band: "Legendary" },

  // Mythic (2)
  { value: "the original thing — the one in the museums is a reproduction", band: "Mythic" },
  { value: "an object whose purpose has been the subject of three academic papers", band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Physical expression
// ---------------------------------------------------------------------------
const LEGENDS_PHYSICAL_EXPRESSION: TraitPool = [
  // Common (21)
  { value: "the look of someone who has already won",                   band: "Common" },
  { value: "quietly disappointed in everyone",                          band: "Common" },
  { value: "serene but alarming",                                       band: "Common" },
  { value: "calculating the odds",                                      band: "Common" },
  { value: "polite, in the way only the genuinely dangerous are",       band: "Common" },
  { value: "the composed look of someone minuting a siege",             band: "Common" },
  { value: "mild disapproval, historically justified",                  band: "Common" },
  { value: "the face of someone about to send a very long dispatch",    band: "Common" },
  { value: "patient disagreement in four languages",                    band: "Common" },
  { value: "the slow blink of someone who has heard this argument before", band: "Common" },
  { value: "controlled impatience with a diplomatic veneer",            band: "Common" },
  { value: "faint, practised magnanimity",                              band: "Common" },
  { value: "professional blankness masking complete certainty",         band: "Common" },
  { value: "cautious optimism from someone who has seen empires fall",  band: "Common" },
  { value: "restrained weariness from someone on their third dynasty",  band: "Common" },
  { value: "the neutral face of someone rewriting the constitution later", band: "Common" },
  { value: "mid-conquest glaze",                                        band: "Common" },
  { value: "the quiet resolve of someone with a plan B through Z",      band: "Common" },
  { value: "a measured nod that commits to nothing",                    band: "Common" },
  { value: "the pinched look of someone about to cite precedent",       band: "Common" },
  { value: "the faint smirk of someone sitting on a devastating letter", band: "Common" },

  // Uncommon (12)
  { value: "the look of someone who has read every book on this",       band: "Uncommon" },
  { value: "the smile of someone who has mentally conquered the room",  band: "Uncommon" },
  { value: "the thousand-year stare of a completed campaign",           band: "Uncommon" },
  { value: "eyes that have seen the fall of three civilisations",       band: "Uncommon" },
  { value: "the focused intensity of someone drafting a legacy",        band: "Uncommon" },
  { value: "the vacant stare of someone recalculating empire logistics", band: "Uncommon" },
  { value: "the haunted focus of someone reconciling a map by hand",    band: "Uncommon" },
  { value: "the tight smile of someone who has been right since 200BC", band: "Uncommon" },
  { value: "the polite grimace of a reply-all survivor",                band: "Uncommon" },
  { value: "the carefully neutral face of someone planning something large", band: "Uncommon" },
  { value: "the look of someone who did not start this but will finish it", band: "Uncommon" },
  { value: "the expression of someone who predicted this outcome",      band: "Uncommon" },

  // Rare (7)
  { value: "permanently mid-speech",                                    band: "Rare" },
  { value: "frozen in the famous portrait expression since the sitting", band: "Rare" },
  { value: "the face that launched administrative reform",              band: "Rare" },
  { value: "the expression people study for clues",                     band: "Rare" },
  { value: "the look of someone whose name is already a monument",      band: "Rare" },
  { value: "an expression that resolves differently depending on which account you read", band: "Rare" },
  { value: "visibly composing a biography entry",                       band: "Rare" },

  // Legendary (3)
  { value: "wears nineteen subtly different versions of the same certainty", band: "Legendary" },
  { value: "the expression that ended, started, and rerouted three wars", band: "Legendary" },
  { value: "an expression that historians have argued about for centuries", band: "Legendary" },

  // Mythic (2)
  { value: "indescribable — the accounts all say something different",  band: "Mythic" },
  { value: "an expression that would look wrong on anyone else",        band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Physical material (what they wear)
// ---------------------------------------------------------------------------
const LEGENDS_PHYSICAL_MATERIAL: TraitPool = [
  // Common (21)
  { value: "a toga, correctly draped",                                  band: "Common" },
  { value: "battle-worn armour that still fits",                        band: "Common" },
  { value: "a lab coat with ink stains, not chemicals",                 band: "Common" },
  { value: "a painter's smock, technically always 'working'",           band: "Common" },
  { value: "chain mail that is somehow still sharp",                    band: "Common" },
  { value: "flowing robes of a historically significant colour",        band: "Common" },
  { value: "a simple tunic worn with extraordinary authority",          band: "Common" },
  { value: "leather sandals and a linen chiton, immovably",             band: "Common" },
  { value: "a floor-length robe with an ambitious belt",                band: "Common" },
  { value: "sensible armour over a comfortable underlayer",             band: "Common" },
  { value: "a cloak that has been to more countries than most people",  band: "Common" },
  { value: "a field commander's tunic, slightly too formal for the office", band: "Common" },
  { value: "a garment that implies both power and discomfort",          band: "Common" },
  { value: "a layered robe ensemble chosen for maximum gravitas",       band: "Common" },
  { value: "an outfit that reappears in exactly three museum paintings", band: "Common" },
  { value: "the same outfit from the famous portrait, worn daily",      band: "Common" },
  { value: "practical travelling clothes, inexplicably regal",          band: "Common" },
  { value: "a leather vest over a linen shirt, age-appropriate armour", band: "Common" },
  { value: "a wool garment that has somehow lasted two millennia",      band: "Common" },
  { value: "silk robes that say 'I have won trade negotiations'",       band: "Common" },
  { value: "an outfit designed to be painted in",                       band: "Common" },

  // Uncommon (12)
  { value: "a toga wider than any toga worn after 44BC",                band: "Uncommon" },
  { value: "a breastplate worn inside, as a statement",                 band: "Uncommon" },
  { value: "a fur-lined military greatcoat, wrong climate, not adjusted", band: "Uncommon" },
  { value: "a waistcoat made from conquered territory fabric",          band: "Uncommon" },
  { value: "robes with a hem embroidered with unresolved questions",    band: "Uncommon" },
  { value: "an outfit three sizes too large, worn with complete confidence", band: "Uncommon" },
  { value: "a signet ring worn on every available finger",              band: "Uncommon" },
  { value: "the blue cloak — the one the historians mention",           band: "Uncommon" },
  { value: "a practical disguise worn with impractical accessories",    band: "Uncommon" },
  { value: "court robes worn in the field, unironically",               band: "Uncommon" },
  { value: "garments embroidered with a complete list of victories",    band: "Uncommon" },
  { value: "spectacles that may have been invented just for this",      band: "Uncommon" },

  // Rare (7)
  { value: "an outfit that has been misidentified by three different museums", band: "Rare" },
  { value: "armour that has fit perfectly for 2,300 years",             band: "Rare" },
  { value: "a garment that technically makes them Head of State",       band: "Rare" },
  { value: "the toga of someone who has annexed a continent before breakfast", band: "Rare" },
  { value: "a hand-knitted item depicting their own face, worn seriously", band: "Rare" },
  { value: "entirely conference swag from civilisations that no longer exist", band: "Rare" },
  { value: "a single cufflink that predates most languages",            band: "Rare" },

  // Legendary (3)
  { value: "a laurel wreath that has not technically been removed since the ceremony", band: "Legendary" },
  { value: "dressed entirely as depicted in the most flattering source", band: "Legendary" },
  { value: "a garment described differently in every primary source",   band: "Legendary" },

  // Mythic (2)
  { value: "whatever was in the famous painting — recreated exactly, daily", band: "Mythic" },
  { value: "a hand-stitched map of the known world, worn as a cloak",   band: "Mythic" },
];

// ---------------------------------------------------------------------------
// Theme colours — historically inspired palette
// ---------------------------------------------------------------------------
const LEGENDS_THEME_PRIMARY: TraitPool = [
  { value: "#6B3FA0", band: "Common" },      // Tyrian purple — imperial
  { value: "#8B1C2B", band: "Common" },      // legion crimson
  { value: "#7C5E3C", band: "Common" },      // ancient bronze
  { value: "#C8980A", band: "Common" },      // Egyptian gold
  { value: "#2B4E8C", band: "Common" },      // lapis lazuli blue
  { value: "#5C4033", band: "Common" },      // papyrus brown
  { value: "#3D2B1F", band: "Common" },      // obsidian
  { value: "#6B4F3A", band: "Uncommon" },    // aged parchment tan
  { value: "#4A3728", band: "Uncommon" },    // ancient wood
  { value: "#7A3B2E", band: "Uncommon" },    // Pompeian red
  { value: "#2E4B3A", band: "Uncommon" },    // Roman garden green
  { value: "#A67C52", band: "Rare" },        // aged copper
  { value: "#C07030", band: "Rare" },        // amber
  { value: "#1A1A2E", band: "Legendary" },   // midnight empire blue
  { value: "#D4AF37", band: "Mythic" },      // true gold
];

const LEGENDS_THEME_ACCENT: TraitPool = [
  { value: "#E8E0D4", band: "Common" },      // marble white
  { value: "#C9A96E", band: "Common" },      // parchment
  { value: "#D4C5A9", band: "Common" },      // aged linen
  { value: "#B8A99A", band: "Common" },      // dusty stone
  { value: "#A09070", band: "Common" },      // antique vellum
  { value: "#8B7355", band: "Common" },      // worn leather
  { value: "#C8B88A", band: "Common" },      // beeswax cream
  { value: "#6B7B5C", band: "Uncommon" },    // sage patina
  { value: "#5A4A3A", band: "Uncommon" },    // dark oak
  { value: "#7A6B5A", band: "Uncommon" },    // oxidised bronze
  { value: "#4A5A6A", band: "Uncommon" },    // slate grey
  { value: "#8B6B4A", band: "Rare" },        // terracotta accent
  { value: "#D4A855", band: "Rare" },        // gilded highlight
  { value: "#2A3A2A", band: "Legendary" },   // deep forest verdigris
  { value: "#FFD700", band: "Mythic" },      // pure gold
];

// ---------------------------------------------------------------------------
// Export — same shape as POOLS so the rarity engine can use it unchanged
// ---------------------------------------------------------------------------
export const LEGENDS_POOLS: Record<CategoryKey, TraitPool> = {
  name:                LEGENDS_NAMES,
  job_title:           LEGENDS_JOB_TITLES,
  desk_setup:          LEGENDS_DESK_SETUPS,
  habit:               LEGENDS_HABITS,
  coffee_ritual:       LEGENDS_COFFEE_RITUALS,
  meeting_energy:      LEGENDS_MEETING_ENERGY,
  passive_aggressive:  LEGENDS_PASSIVE_AGGRESSIVE,
  physical_height:     LEGENDS_PHYSICAL_HEIGHT,
  physical_accessory:  LEGENDS_PHYSICAL_ACCESSORY,
  physical_expression: LEGENDS_PHYSICAL_EXPRESSION,
  physical_material:   LEGENDS_PHYSICAL_MATERIAL,
  theme_primary:       LEGENDS_THEME_PRIMARY,
  theme_accent:        LEGENDS_THEME_ACCENT,
};
```

- [ ] **Step 2: Run the tests — they should still fail** (mystery_box.ts not yet updated)

```bash
npm test -- tests/legends.test.ts
```

Expected: still fails — `rollIdentity` doesn't yet accept the `variant` argument.

---

### Task 4: Create `src/mystery_box/legends_rendering.ts`

**Files:**
- Create: `src/mystery_box/legends_rendering.ts`

- [ ] **Step 1: Write the file**

These templates use the same `{slot}` syntax as WOW but written in a historical/grand voice:

```typescript
// src/mystery_box/legends_rendering.ts
// Paragraph templates for the Legends variant.
// Uses the same {slot} syntax as rendering.ts — same slot names, different tone.

export const LEGENDS_PARAGRAPH_TEMPLATES: readonly string[] = [
  "Subject: {name}. Current posting: {job_title}. Known for: {habit}. Sustenance of choice: {coffee_ritual}. Seal of office: \"{passive_aggressive}\".",
  "The dossier confirms {name} holds the title of {job_title}. Field notes: {habit}. Workspace: {desk_setup}. In council: {meeting_energy}.",
  "{name}, {job_title}. Distinguishing features: {material}; {accessory}. Build: {height}. Expression: {expression}. Documented habit: {habit}.",
  "Personnel record — {name}, {job_title}. Physical profile: {material}; {accessory}; expression: {expression}. Behaviours on record: {habit}; {coffee_ritual}; {meeting_energy}.",
  "Day one report. {name}, your new {job_title}, has already reorganised something. Their workspace: {desk_setup}. Beverage: {coffee_ritual}. Sign-off: \"{passive_aggressive}\".",
  "Introducing {name}, the department's {job_title}. Wears {material}. Carries {accessory}. Notable habit: {habit}. Sustenance: {coffee_ritual}. Correspondence closes: \"{passive_aggressive}\".",
  "Dispatch — {name}. Title: {job_title}. Stature: {height}. Demeanour: {expression}. Documented behaviour: {habit}. In council: {meeting_energy}.",
  "{job_title}? That would be {name}. Operates from {desk_setup}. Notable habit: {habit}. Avoid the phrase \"{passive_aggressive}\" in their presence.",
  "Field report — {name}, {job_title}. Outfit: {material}. Carries {accessory}. Build: {height}. Behaviour: {habit}. Beverage ritual: {coffee_ritual}.",
  "{name}, {job_title}, has joined the organisation. Recognise them by {accessory} and {material}. Their habit: {habit}. Correspondence sign-off: \"{passive_aggressive}\".",
];
```

- [ ] **Step 2: Run the tests — still failing (expected)**

```bash
npm test -- tests/legends.test.ts
```

Expected: still fails. That's fine — mystery_box.ts drives the wiring.

---

### Task 5: Update `src/mystery_box/rendering.ts` — add optional templates param

**Files:**
- Modify: `src/mystery_box/rendering.ts`

This is a small, backward-compatible change. The current `renderParagraph` hardcodes `PARAGRAPH_TEMPLATES`. We add an optional third parameter so the caller can pass Legends templates instead.

- [ ] **Step 1: Update the function signature**

Find `renderParagraph` in `src/mystery_box/rendering.ts` (around line 75) and replace it:

```typescript
/** Pick a template uniformly at random and fill its slots from the identity. */
export function renderParagraph(
  identity: RolledIdentity,
  rng: Rng,
  templates: readonly string[] = PARAGRAPH_TEMPLATES,
): string {
  const template = templates[Math.floor(rng() * templates.length)]!;
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

- [ ] **Step 2: Run the full test suite — existing tests must still pass**

```bash
npm test
```

Expected: all 94 existing tests pass. The new default parameter is transparent to existing callers.

- [ ] **Step 3: Commit the rendering change**

```bash
git add src/mystery_box/rendering.ts
git commit -m "feat(rendering): add optional templates param to renderParagraph"
```

---

### Task 6: Update `src/mystery_box.ts` — wire in Legends routing

**Files:**
- Modify: `src/mystery_box.ts`

- [ ] **Step 1: Add imports and update `rollIdentity`**

Replace the full contents of `src/mystery_box.ts` with:

```typescript
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
```

- [ ] **Step 2: Build to check TypeScript**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Run the Legends tests — they should now pass**

```bash
npm test -- tests/legends.test.ts
```

Expected: all Legends tests pass.

- [ ] **Step 4: Run the full test suite — existing tests must still pass**

```bash
npm test
```

Expected: all 94 existing tests + new Legends tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/mystery_box.ts src/mystery_box/legends_pools.ts src/mystery_box/legends_rendering.ts tests/legends.test.ts
git commit -m "feat(legends): add Legends pool — historical figures in absurd corporate roles"
```

---

### Task 7: Update `src/tools.ts` — variant param + all 5 tool titles + descriptions

**Files:**
- Modify: `src/tools.ts`

- [ ] **Step 1: Add Variant to the import**

At the top of `src/tools.ts`, find:

```typescript
import type { BlingIdentity, RollOutput } from "./types.js";
```

Replace with:

```typescript
import type { BlingIdentity, RollOutput, Variant } from "./types.js";
```

- [ ] **Step 2: Update `rollIdentityHandler` to accept variant**

Find `rollIdentityHandler` (around line 27) and replace it:

```typescript
export async function rollIdentityHandler(rng?: Rng, variant: Variant = "wow"): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: RollOutput;
}> {
  const out = rng ? rollIdentity(rng, variant) : rollIdentity(Math.random, variant);
  lastRoll = out;
  return {
    content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }],
    structuredContent: out,
  };
}
```

- [ ] **Step 3: Update all 5 tool registrations**

Find the `registerTools` function and replace each tool registration with the updated title, description, and (for roll_identity) the new input schema. Replace the **entire block from `server.registerTool("get_identity"` to the closing `}` of `registerTools`** with:

```typescript
  // Tool 1: get_identity
  server.registerTool(
    "get_identity",
    {
      title: "Who's My Bot?",
      description:
        "Who's your bot? Pull up the full identity — name, personality, quirks, appearance, and theme colours. Returns whatever's configured in bling.json. Errors if bling.json is missing or invalid.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    () => getIdentityHandler(blingPath),
  );

  // Tool 2: get_theme_for_platform
  server.registerTool(
    "get_theme_for_platform",
    {
      title: "Style Me Up",
      description:
        "Get your bot's colours formatted for a specific platform. Supported: terminal (ANSI codes), web (CSS variables), slack, discord, ide. Unknown platforms get the raw hex colours.",
      inputSchema: {
        platform: z
          .string()
          .describe("Target platform: terminal, web, slack, discord, or ide"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    ({ platform }) => getThemeForPlatformHandler(blingPath, platform),
  );

  // Tool 3: roll_identity
  const rollIdentityOutputSchema = {
    identity: z.object({}).passthrough(),
    rarity: z.object({
      score: z.number(),
      tier: z.string(),
      percentile: z.number(),
      per_trait: z.array(z.object({
        category: z.string(),
        value: z.string(),
        band: z.string(),
      })).nullable(),
    }),
    paragraph: z.string(),
    framed: z.string(),
    lore: z.string().nullable(),
  };

  server.registerTool(
    "roll_identity",
    {
      title: "Spin the Wheel",
      description:
        "Give your bot a random identity. Pick a variant: wow (Weird Office Workers — quirky office drones, default) or legends (historical figures in absurd corporate roles). Returns a name, job title, traits, rarity score, and a screenshot-ready share card. Stores the roll for save_last_roll.",
      inputSchema: {
        variant: z
          .enum(["wow", "legends"])
          .optional()
          .describe("Which identity pool to use: wow (Weird Office Workers, default) or legends (historical figures in absurd corporate roles)."),
      },
      outputSchema: rollIdentityOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ variant }: { variant?: "wow" | "legends" }) => {
      const out = await rollIdentityHandler(undefined, variant ?? "wow");
      return {
        content: out.content,
        structuredContent: out.structuredContent as unknown as { [k: string]: unknown },
      };
    },
  );

  // Tool 4: save_last_roll
  const saveLastRollOutputSchema = {
    ok: z.boolean().optional(),
    written_to: z.string().optional(),
    backup: z.string().nullable().optional(),
    error: z.string().optional(),
  };

  server.registerTool(
    "save_last_roll",
    {
      title: "Lock It In",
      description:
        "Save the most-recent roll as your bot's permanent identity. Writes to bling.json, backing up any existing config to bling.json.bak first. Returns the backup path (or null if nothing was overwritten).",
      inputSchema: {},
      outputSchema: saveLastRollOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    () => saveLastRollHandler(blingPath),
  );

  // Tool 5: get_rarity_report
  const rarityReportOutputSchema = {
    report: z.string().optional(),
    error: z.string().optional(),
  };

  server.registerTool(
    "get_rarity_report",
    {
      title: "Show Off My Card",
      description:
        "Get the formatted share card for the most-recent roll — a plain-text block ready to screenshot and post. Errors if no roll has happened this session.",
      inputSchema: {},
      outputSchema: rarityReportOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    getRarityReportHandler,
  );
}
```

- [ ] **Step 4: Build to check TypeScript**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (including Legends tests from Task 6).

- [ ] **Step 6: Commit**

```bash
git add src/tools.ts src/types.ts
git commit -m "feat(tools): add variant param to roll_identity, update all tool titles and descriptions"
```

---

### Task 8: Version bump and metadata

**Files:**
- Modify: `package.json`, `server.json`, `CHANGELOG.md`

- [ ] **Step 1: Update `package.json`**

Change two fields:

```json
"version": "0.2.0",
"description": "Give your bot an identity!",
```

- [ ] **Step 2: Update `server.json`**

Change two fields. Open `server.json` and update:

```json
"version": "0.2.0",
"description": "Give your bot an identity!",
```

- [ ] **Step 3: Add CHANGELOG entry**

Open `CHANGELOG.md` and add this block at the top (after the `# Changelog` header, before the existing `## [0.1.1]` entry):

```markdown
## [0.2.0] — 2026-04-30

### Added
- **Legends pool** — a second identity variant: historical figures placed in absurd corporate roles. Pass `variant: "legends"` to `roll_identity`.
- `variant` parameter on `roll_identity` tool (`"wow"` | `"legends"`, default `"wow"`). All existing integrations work without any changes.

### Changed
- Messaging: "Give your bot an identity!" now leads every public surface (npm, GitHub, server.json, README).
- Tool display names updated: "Spin the Wheel", "Who's My Bot?", "Style Me Up", "Lock It In", "Show Off My Card". Internal tool names unchanged — no breaking change.
- README rewritten: product value leads, technical details moved lower.

### Unchanged
- `TIER_THRESHOLDS` in `scoring.ts` — not recalibrated.
- Internal tool names (`roll_identity`, `get_identity`, etc.).
- WOW pools and weights.
```

- [ ] **Step 4: Run the full test suite one more time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add package.json server.json CHANGELOG.md
git commit -m "chore(release): bump to v0.2.0, update descriptions and CHANGELOG"
```

---

### Task 9: Rewrite `README.md` opening

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the opening section**

Open `README.md`. Replace everything from line 1 up to (and including) the `---` separator before `## Install` with:

```markdown
# Bling Bag

> Give your bot an identity.

Your bot has a name. Now give it a personality, a look, and a backstory.

Roll the wheel and see what you get — or write your own in a `bling.json` file.

[![npm version](https://img.shields.io/npm/v/bling-bag)](https://www.npmjs.com/package/bling-bag)
[![Glama](https://glama.ai/mcp/servers/tjclaude88/mcp-bling/badge)](https://glama.ai/mcp/servers/tjclaude88/mcp-bling)

---

## What you get

Five MCP tools and two identity pools:

### WOW — Weird Office Workers

Roll a random quirky office-worker bot: name, job title, desk setup, habits, coffee ritual, and a screenshot-ready share card. 94/94 tests, full rarity engine, 13 weighted trait pools.

### Legends — Historical Figures

Same engine, different universe. Roll a historical figure in an absurd corporate role — Julius Caesar as Hostile Takeover Specialist, Marie Curie as Lab Safety's Most Wanted, Napoleon as Regional Manager (France & Surrounding Areas).

Pass `variant: "legends"` to `roll_identity` to use it. Default is `"wow"`.

---
```

- [ ] **Step 2: Check the rest of the README is intact**

Scroll through to confirm the Install section, client config examples, and all other existing content follow immediately after the new `---` separator. No content should be deleted past that point.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): rewrite opening — lead with identity, add Legends pool docs"
```

---

### Task 10: Update GitHub repo description

**Files:**
- No file changes — GitHub API call only.

- [ ] **Step 1: Update the repo description**

```bash
gh repo edit tjclaude88/mcp-bling --description "Give your bot an identity!"
```

Expected output: no error. Verify at `https://github.com/tjclaude88/mcp-bling`.

- [ ] **Step 2: Final full test suite run**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Final build check**

```bash
npm run build
```

Expected: clean build, no errors.

- [ ] **Step 4: Commit (nothing to commit — confirm clean tree)**

```bash
git status
```

Expected: `nothing to commit, working tree clean`. If not, commit any stragglers.

---

## Done

At the end of Task 10:
- All tests pass
- `rollIdentity(rng, "legends")` returns a historical figure in an absurd corporate role
- All five tool titles and descriptions are punchy and fun
- Every public surface says "Give your bot an identity!"
- `package.json`, `server.json`, `CHANGELOG.md` are at v0.2.0
- GitHub repo description is updated
- `main` branch is clean, ready for the next publish cycle
