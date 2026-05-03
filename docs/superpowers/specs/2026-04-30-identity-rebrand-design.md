# Design: Identity Rebrand + Legends Pool — v0.2.0

**Date:** 2026-04-30
**Status:** Approved
**Version bump:** 0.1.1 → 0.2.0

---

## Goal

The current messaging buries the product's core value under technical language.
The rebrand shifts every surface to lead with the action: **"Give your bot an identity!"**

Alongside the messaging update, a second character pool — **Legends** (historical
figures in absurd corporate roles) — is added to `roll_identity` as an optional
`variant` parameter. The existing WOW pool is unchanged and the default, so all
existing integrations continue to work without any changes.

---

## Section 1 — Messaging changes

### Principle

Lead with the action. Bury the tech. Every human-facing surface gets a version
of "Give your bot an identity!" as the opener. Technical details (MCP, stdio,
Node.js) move to the bottom of the README where curious developers can find them.

### Copy changes by surface

| Surface | Old | New |
|---|---|---|
| `package.json` description | "MCP server that delivers bot identity and visual styling" | "Give your bot an identity!" |
| `server.json` description | same | "Give your bot an identity!" |
| GitHub repo description | same | "Give your bot an identity!" |
| README title | "Bling Bag — MCP Server for Bot Identity & Visual Styling" | "Bling Bag" |
| README opening | Technical tagline about "many surfaces" | Punchy 2–3 lines: *Your bot has a name. Now give it a personality, a look, and a backstory. Roll the wheel and see what you get.* |

### Tool title changes

Internal tool names (`roll_identity`, `get_identity`, etc.) do **not** change —
those are what AI clients call, and renaming them is a breaking change.
Only the `title` field (display name) changes.

| Tool | Old title | New title |
|---|---|---|
| `get_identity` | "Get Bot Identity" | "Who's My Bot?" |
| `get_theme_for_platform` | "Get Theme for Platform" | "Style Me Up" |
| `roll_identity` | "Roll a WOW Identity" | "Spin the Wheel" |
| `save_last_roll` | "Save Last WOW Roll to bling.json" | "Lock It In" |
| `get_rarity_report` | "Get WOW Rarity Report" | "Show Off My Card" |

### Tool description changes

Tool descriptions stay functionally accurate (AI agents must know what each tool
does) but get punchier. Example:

- **Before:** "WOW — Weird Office Workers. Roll a fresh random bot identity: a quirky office-worker character with a rarity score and a screenshot-ready share card."
- **After:** "Spin the wheel. Roll a fresh random identity — name, job title, quirks, rarity score, and a screenshot-ready card ready to share. Pick a variant: `wow` (Weird Office Workers, default) or `legends` (historical figures in absurd corporate roles)."

All five tool descriptions follow the same pattern: keep the functional content,
strip the dry phrasing, add energy.

---

## Section 2 — Legends pool

### Concept

Historical figures (100+ years dead) placed in absurd modern corporate roles.
The humor comes from the collision between their legendary status and dry
corporate language.

Pool name: **"Legends"**
Variant key: `"legends"`

### Trait flavour

The Legends pool must cover **all 13 trait categories** that WOW uses, because the
rendering system slots them into paragraph templates. Missing slots = broken output.

The 13 categories with Legends-flavoured examples:

| Trait | Examples |
|---|---|
| `name` | "Julius Caesar", "Cleopatra", "Napoleon", "Marie Curie", "Shakespeare", "Sun Tzu", "Tesla", "Machiavelli", "Darwin", "Joan of Arc", "Socrates", "Genghis Khan", "Leonardo da Vinci", "Aristotle" |
| `job_title` | "Hostile Takeover Specialist", "Chief Brand Ambassador", "Regional Manager (France & Surrounding Areas)", "Lab Safety's Most Wanted", "Content Creator", "Strategy Consultant (Deceased)", "Unpaid Intern (Still)", "People Operations Lead", "Talent Acquisition — Survival of the Fittest", "Chief Curiosity Officer" |
| `height` | "surprisingly short for the legend", "of commanding stature", "built for the ages", "smaller than the statues suggest" |
| `material` | "battle-worn armour", "a toga", "a lab coat with mysterious stains", "a painter's smock", "chain mail that's somehow still sharp" |
| `accessory` | "a laurel wreath worn unironically", "a compass that may or may not be correct", "a quill that somehow still works", "a battle plan for the quarterly review", "a suspicious apple" |
| `expression` | "the look of someone who has already won", "quietly disappointed in everyone", "serene but alarming", "calculating the odds" |
| `habit` | "rewrites team decisions and claims it was always the plan", "arrives two hours late and immediately starts conquering", "invents something groundbreaking and tells no one", "gives unsolicited strategic advice during standup" |
| `coffee_ritual` | "drinks nothing — survives on ambition alone", "insists on historically accurate beverages", "has a complex relationship with hemlock", "mead, always mead" |
| `passive_aggressive` | "per my last scroll", "as I said before the fall of Rome", "noted — though history will judge differently", "I'll defer to the conqueror on this one" |
| `desk_setup` | "a map of territories not yet taken", "scattered manuscripts and a suspicious amount of mirrors", "three half-finished inventions and a globe", "a single candle and an unfinished masterpiece" |
| `meeting_energy` | "has already left for Elba", "takes detailed notes, never shares them", "arrived 2,000 years early and is still waiting", "has conquered this meeting and three others today" |

Note: the rendering paragraph templates in `legends_rendering.ts` will be written
in the Legends voice and can reuse all the same `{slot}` placeholders as WOW.

### Safety rule

**Living people are excluded.** Only figures who have been dead for 100+ years
are eligible. No exceptions — even comedy framing doesn't protect against
defamation risk for living public figures.

### Future expansion

The Legends pool can grow to include mythological figures (Hercules, Medusa,
Athena) in a future release, since the "Legends" name accommodates both.

---

## Section 3 — Technical changes

### Version

`0.1.1 → 0.2.0` — minor feature release (new pool, new parameter, backward compatible).

### New files

| File | Purpose |
|---|---|
| `src/mystery_box/legends_pools.ts` | Trait pools for the Legends variant (names, job titles, habits, accessories, etc.) |
| `src/mystery_box/legends_rendering.ts` | Paragraph templates written in the Legends voice (different from WOW's office-drone tone) |
| `tests/legends.test.ts` | Basic roll coverage + distribution sanity check for the Legends pool |

### Modified files

| File | Change |
|---|---|
| `src/tools.ts` | All 5 tool titles updated; `roll_identity` input schema adds optional `variant: "wow" \| "legends"` (default `"wow"`) |
| `src/mystery_box.ts` | Routes to the correct pool based on `variant`; exports updated |
| `src/types.ts` | Add `Variant = "wow" \| "legends"` type (definitely needed — used in tools.ts input schema and mystery_box.ts routing) |
| `package.json` | Description + version bump |
| `server.json` | Description + version bump |
| `README.md` | New opening; documents both pools; tech details pushed lower |
| `CHANGELOG.md` | 0.2.0 entry |
| GitHub repo | Description updated via `gh repo edit` |

### Backward compatibility

- `roll_identity` called with no arguments continues to return a WOW character (default `variant: "wow"`)
- No existing tool names change
- `TIER_THRESHOLDS` in `scoring.ts` is not touched (CLAUDE.md hard rule)
- The rarity engine is reused as-is by both pools

### Tests

- New `tests/legends.test.ts` — smoke test a Legends roll, check all required fields present, sanity-check score range
- Existing `tests/mystery_box.test.ts` — the 10k WOW distribution guard must still pass (Legends pool is separate)
- Existing `tests/identity.test.ts` and `tests/tools.test.ts` — must stay green

---

## What does NOT change

- Internal tool names (`roll_identity`, `get_identity`, `get_theme_for_platform`, `save_last_roll`, `get_rarity_report`)
- `TIER_THRESHOLDS` in `src/mystery_box/scoring.ts`
- The rarity/scoring engine
- The WOW pools (no recalibration)
- The `bling.json` config format
