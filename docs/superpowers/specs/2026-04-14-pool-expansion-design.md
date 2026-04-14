# Pool Expansion — Design Spec

**Date:** 2026-04-14
**Author:** TJ + Claude (brainstorming session)
**Status:** Design approved, awaiting implementation plan
**Scope:** Data-only expansion of WOW trait pools from 79 entries → ~465 entries

---

## 1. Problem

The WOW (Weird Office Workers) mystery-box roller currently has 13 trait pools with ~6 entries each (79 total). The original spec targets 30–60 entries per pool. With the current tiny pools:

- **Repetition is obvious.** A user rolling 20 identities sees the same Common name ("Steve", "Karen") repeatedly.
- **Rare moments aren't varied enough.** With 1 Mythic entry per pool, every Mythic roll in a category is literally identical.
- **Distribution test is loose.** The 10k-roll regression test currently allows ±10pp per-tier bounds. Tightening to ±2pp requires more statistical power, which requires bigger pools.

This spec expands the pools to ~465 total entries while preserving the existing tone, rarity semantics, and all logic.

## 2. Goals

1. **More variety, same tone.** 6.3× more entries without diluting the deadpan British-office-comedy voice.
2. **Rarity is load-bearing.** Each band has its own creative lane so rolling a Mythic feels categorically different from rolling a Common.
3. **Zero logic changes.** Pure data. The roller, scoring, calibration, templates, and tests stay untouched.
4. **Grammatically safe.** Every new entry works in every template context its slot appears in.

## 3. Non-Goals

- **No tier recalibration.** Thresholds are locked per NFT-convention (see CLAUDE.md Gotchas and memory `project_status`). The distribution test's ±10pp bounds stay as-is for this change.
- **No template/rendering changes.** Paragraph templates, lore frame, and HOMUNCULUS block are out of scope.
- **No changes to Named Subjects.** The 5 hand-authored 1-of-1s in `src/mystery_box/named.ts` stay.
- **No new pools or categories.** 13 pools in, 13 pools out.
- **No distribution-test tightening in this PR.** That becomes a follow-up once we can measure actual variety.

## 4. Design

### 4.1 Pool size tiers

Three size tiers across 13 pools:

| Tier | Pools (count) | Entries each | Subtotal |
|---|---|---|---|
| Character-defining text | 7 | 45 | 315 |
| Physical-flavour text | 4 | 30 | 120 |
| Colour | 2 | 15 | 30 |
| **Total** | **13** | — | **465** |

**Character-defining (45 each):** `name`, `job_title`, `habit`, `desk_setup`, `coffee_ritual`, `meeting_energy`, `passive_aggressive` — these are the pools that define who the bot *is*.

**Physical-flavour (30 each):** `physical_height`, `physical_accessory`, `physical_expression`, `physical_material` — supporting detail; diminishing returns past ~30.

**Colour (15 each):** `theme_primary`, `theme_accent` — colours don't benefit from 60 near-duplicates.

### 4.2 Band distribution (steep pyramid)

Within each pool, entries split across bands with heavy weighting toward Common:

| Pool size | C | U | R | L | M |
|---|---|---|---|---|---|
| 45-entry | 21 | 12 | 7 | 3 | 2 |
| 30-entry | 14 | 8 | 4 | 2 | 2 |
| 15-entry | 7 | 4 | 2 | 1 | 1 |

**Rationale for the steep pyramid:** the weighted picker (`pickWeighted` in `src/mystery_box/rng.ts`) selects a band using `BAND_WEIGHTS` (Common 50%, Uncommon 25%, Rare 15%, Legendary 8%, Mythic 2%), then picks uniformly within that band. This means within-band entry count only affects *repetition* within that band, not rarity odds.

Commons hit ~50× per 100 rolls, Mythics ~2×. With the steep pyramid:
- Common entries seen ~2.4× per 100 rolls in a 45-entry pool (21 Commons). Low enough to feel fresh.
- Mythic entries seen ~1× per 100 rolls (2 Mythics). Rare enough to remain iconic.

This matches TJ's design brief: *"rarity to mean something but … a lot of variations in the commons."*

### 4.3 Themed bands (creative brief per tier)

Each band has a distinct flavour to keep the rarity ladder meaningful:

| Band | Creative direction | Example (existing, from `physical_height`) |
|---|---|---|
| Common | Corporate realism. Could describe any real coworker. | `"average build"` |
| Uncommon | Mild eccentricity. One noticeable quirk. | `"tall enough to comment on it"` |
| Rare | HR incident territory. Specific, slightly cursed. | `"somehow taller in meetings than in person"` |
| Legendary | Office folklore. "Remember that time…" energy. | `"looms"` |
| Mythic | Eldritch / cryptid / reality-bending. Not entirely human. | `"occupies more conceptual than physical space"` |

Writers should treat these as a contract: a Common must feel plausible; a Mythic must feel impossible.

### 4.4 Grammar constraints by slot

Each slot appears in multiple templates (`src/mystery_box/rendering.ts` lines 61–72). New entries must read naturally in **every** context where their slot appears.

| Slot | Contexts (must work in all) | Shape required |
|---|---|---|
| `name` | Subject of sentence | Proper noun(s) |
| `job_title` | `"your new {job_title}"` / `"the office's {job_title}"` / `"{job_title}? That would be {name}"` | Noun phrase, no leading article |
| `desk_setup` | `"sits behind {desk_setup}"` / `"Their desk: {desk_setup}"` | Noun phrase starting with article (`"a …"`, `"the …"`, `"forty …"`) |
| `habit` | `"{name} {habit}"` (needs 3rd-person verb) / `"Notable habit: {habit}"` / `"Their habit: {habit}"` | 3rd-person singular verb phrase (e.g. `"sends emails …"` ✓, not `"send emails"` or `"sending emails"`) |
| `coffee_ritual` | `"drinks {coffee_ritual}"` / `"Their drink: {coffee_ritual}"` | Noun phrase |
| `meeting_energy` | `"In meetings they are {meeting_energy}"` / `"In meetings: {meeting_energy}"` | Works both as adjective/descriptor AND as fragment (e.g. `"always on mute"` ✓) |
| `passive_aggressive` | `"\"{passive_aggressive}\""` (always quoted) / `"Avoid the phrase \"{passive_aggressive}\""` | Standalone quotable phrase, capitalised as a sentence |
| `physical_height` | `"Build: {height}"` / `"Their build is {height}"` / `"Stature: {height}"` | Noun phrase that works after "is" (careful with verbs — `"looms"` is awkward in `"Their build is looms"`) |
| `physical_accessory` | `"Carries {accessory}"` / `"Adornment: {accessory}"` / `"Recognise them by {accessory}"` | Noun phrase starting with article |
| `physical_expression` | `"Expression: {expression}"` / `"their expression, {expression}"` / `"Demeanour: {expression}"` | Noun phrase (no leading article — compare `"polite disappointment"` ✓ vs `"a polite disappointment"` ✗) |
| `physical_material` | `"Wears {material}"` / `"Outfit: {material}"` / `"Distinguishing features: {material}"` | Noun phrase |

**Grammar gotcha flagged during final check:** the existing Legendary entry `"looms"` for `physical_height` is awkward in the "Their build is {height}" template. We're not fixing existing entries in this spec, but new entries should be stricter — stick to noun phrases for `physical_height`.

### 4.5 Colour constraints

`theme_primary` and `theme_accent` entries must be exactly `#RRGGBB` format (6 hex digits, uppercase, leading `#`). The identity validator rejects anything else (see `src/identity.ts`).

Aesthetic direction:
- **Common** — office-supply palette: tan, teal, grey, beige, navy, muted warm earth tones
- **Uncommon** — slightly bolder corporate: mahogany, forest, burgundy, slate
- **Rare** — expense-report red territory: saturated accent colours
- **Legendary** — iconic corporate branding: PowerPoint navy, Excel green, IBM blue
- **Mythic** — unhinged palette: fluorescent, metallic, colours nobody would choose for a spreadsheet

### 4.6 Structural constraints

- **No duplicates within a pool.** Each entry's `value` must be unique within its pool.
- **No duplicates across existing + new.** Keep the current 79 entries as-is; new entries must not repeat them.
- **Entry shape unchanged:** `{ value: string; band: "Common" | "Uncommon" | "Rare" | "Legendary" | "Mythic" }`.
- **File organisation unchanged:** all pools stay in `src/mystery_box/pools.ts`. No new files.

## 5. Testing

This is a data-only change, so no new unit tests are added.

**Must pass:**
- All 94 existing tests stay green (especially the 10k-roll distribution test, which has ±10pp per-tier bounds).
- `npm run build` stays clean.

**Manual verification (part of the implementation plan):**
- Run `roll_identity` via the MCP server ~30 times in a single session. Eyeball for:
  - No Common repetition within 30 rolls
  - Tonal consistency (nothing that breaks the deadpan voice)
  - No grammar failures in rendered paragraphs
  - Believable rarity ladder (a Mythic should feel categorically different from a Common)
- Spot-check ~5 entries per pool against the band creative brief (§4.3).

## 6. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Grammar regression (new entry breaks a template) | Medium | §4.4 constraint table; manual verification step |
| Tonal drift (new entries feel different from existing) | Medium | §4.3 themed-band brief per tier; writer reviews existing entries per band first |
| Duplicate entries | Low | Unique-value check as part of plan (simple to script) |
| Distribution test fails | Low | Pool expansion doesn't change band weights or thresholds; only per-band entry counts change |
| Colour validation fails | Low | §4.5 format rule; hex validator catches any malformed entry at load time |

## 7. Open questions (non-blocking)

- Do we want to *seed-lock* the roller's RNG for manual verification so we can reproduce specific rolls? Not required for this spec.
- Should we add a dev-only script that dumps one sample output per band per pool for review? Nice-to-have; decide during planning.

## 8. Follow-ups (explicitly deferred)

These are flagged so they don't get forgotten, but are NOT part of this work:

- Tighten the 10k-distribution test bounds from ±10pp to ±2pp.
- Mulberry32 stability snapshot test (Task 2 reviewer suggestion).
- Revisit spec §1.1 lore framing once larger pools are in hand.
- Possibly re-tier existing entries if some feel mis-banded after comparison with new material.
