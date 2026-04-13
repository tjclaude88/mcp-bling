# Mystery Box — Design Spec

**Date:** 2026-04-13
**Status:** Draft — awaiting user review
**Project:** MCP Bling
**Supersedes:** N/A (new feature, builds on the 2026-04-10 MVP)

> **Revision note (2026-04-13, second pass):** Framing rewritten to
> "experiment-gone-wrong." Chip retired. Bots are now described as (comical)
> humans, not robots. Added in-universe lore layer. See changelog at the end.

---

## 1. Concept

The Mystery Box is a feature that rolls a random bot identity on demand.
Instead of every user manually writing their own `bling.json`, they can ask
the server to generate a fresh one. The output is a weirdly specific human
character drawn from weighted trait pools, plus a rarity score telling the
user how unusual their combination is.

### 1.1 The in-universe lore

> **⚠️ LORE TODO (2026-04-13):** The HOMUNCULUS framing below is placeholder.
> Tried linking the project to the Mythos model release ("Before there was
> Mythos, there was HOMUNCULUS…") but the writing isn't landing. Revisit
> after the trait/rarity engine is built — it's easier to write the frame
> once we can see real rolls. The engine does not depend on the lore, so
> this can be rewritten at any point without breaking anything.


> *The year is 2026. The bots are, quite frankly, taking over.*
>
> *Concerned that their new AI overlords felt cold and unrelatable, a research
> group deployed an AI called **HOMUNCULUS** to study "normal human behaviour"
> and build a training corpus that would make future bots feel more human,
> more approachable, more like one of us.*
>
> *HOMUNCULUS read every workplace email. Every Slack thread. Every
> AskAManager letter. Every r/MaliciousCompliance post. Every LinkedIn
> humblebrag. Every David Brent scene. Every Citibank post-mortem.*
>
> *HOMUNCULUS concluded that **this** is what normal human behaviour looks
> like.*
>
> *The Mystery Box is the corpus. Every roll is one data point HOMUNCULUS
> collected. Somewhere out there, a bot was trained on it.*

The framing is a light joke on the real LLM phenomenon of "models trained on
Reddit become Reddit." HOMUNCULUS tried to make bots relatable and instead
learned that humans are all deeply specific, lightly cursed, and will die on
the carrot cake hill.

### 1.2 What a rolled bot looks like

**Fully human, comically so.** No robots, no LED eyes, no brushed metal.
Brenda from Accounts has permed hair that hasn't changed since 1994, a
cardigan for every mood, the posture of someone permanently mid-sigh, and
brings a 'WORLD'S OKAYEST DBA' mug to every meeting.

Each bot also carries a **subject ID and classification tag** from the
HOMUNCULUS study — a lore-flavoured header that makes every roll feel like a
redacted field report from a failed experiment. Pure screenshot bait.

### 1.3 Product principles

**Competence is never affected.** The AI's intelligence, accuracy, and
helpfulness stay full-strength. The personality is light garnish only. "A bot
that's worse on purpose" is a bad product. "A bot with a voice" is a charming
one.

**Output is a paragraph, not a list.** A short prose description reads like a
character and feels screenshot-worthy. A bulleted trait list reads like a D&D
stat sheet.

**Chip is retired.** The MVP's original mascot (Chip the robot) is replaced
by the Mystery Box as the server's default. The existing `bling.json` example
file is rewritten to be a sample human subject.

---

## 2. User experience — what you see when you roll

A fresh roll returns a paragraph, a rarity score, and an in-universe lore
header:

> ```
> HOMUNCULUS CORPUS · Subject 0147 · Cohort: Tuesday
> Classification: Middle Manager · Rarity 147.3 · 91st percentile
> ```
>
> *Meet **Brenda from Accounts** — your new **ASCII Comptroller**. Permed
> hair that hasn't changed since 1994, a cardigan for every mood, and the
> posture of someone permanently mid-sigh. Brings a 'WORLD'S OKAYEST DBA'
> mug to every meeting, microwaves fish despite three separate HR warnings,
> and hums Enya during code reviews. Signs off every email with "per my last
> email" even when there was no last email. Will die on the carrot cake
> hill.*
>
> *— RELATABILITY CORPUS v3.1 · ingested 2025-07-14 · flagged for review*

The paragraph blends human physical description (permed hair, cardigan) with
behaviour (fish, Enya, carrot cake). Same structure at every rarity — a
Filing Clerk bot is two sentences, an HR-Warned-Us-About bot is a full
character paragraph.

---

## 3. Schema — extending, not replacing

The current MVP's `BlingIdentity` shape stays intact. The Mystery Box *repurposes*
the existing `physical` fields for human description and adds two optional
blocks: `office` (behavioural quirks) and `homunculus` (lore header).

```jsonc
{
  // existing fields — unchanged in shape, repurposed in meaning
  "name": "Brenda from Accounts",
  "personality": { "tone": "...", "formality": "...", "humor": "...",
                   "catchphrase": "...", "emoji_style": "..." },
  "quirks":      { "nervous_habit": "...", "celebration": "...",
                   "error_reaction": "...", "secret_talent": "..." },
  "physical": {
    "species":    "human",                      // almost always "human" now
    "height":     "average, perpetually mid-sigh",
    "accessory":  "lanyard with 14 badges of varying importance",
    "expression": "polite disappointment",
    "material":   "cardigan, at least one"      // repurposed: what they wear, not what they're made of
  },
  "theme":       { "primary_color": "#9C6B3A", "accent_color": "#2D4A4F" },

  // new optional block — behavioural
  "office": {
    "job_title":           "ASCII Comptroller",
    "desk_setup":          "Lucky 'WORLD'S OKAYEST DBA' mug and 40+ unwashed siblings",
    "habit":               "Microwaves fish despite three separate HR warnings",
    "coffee_ritual":       "Half-caf oat flat white, 140°F, no eye contact",
    "meeting_energy":      "Always 4 minutes late, always with a reason",
    "passive_aggressive":  "Per my last email"
  },

  // new optional block — HOMUNCULUS lore header
  "homunculus": {
    "subject_id":     "0147",
    "cohort":         "Tuesday",
    "classification": "Middle Manager",
    "ingested":       "2025-07-14",
    "flag":           "flagged for review"   // one of: normal / flagged for review / redacted / Do Not Contact
  }
}
```

A hand-written `bling.json` without the new blocks continues to work exactly
as it does today — the `physical` fields can still describe a robot if the
user wants (Chip-style configs are not broken). The *roller* produces humans;
hand-written configs can describe anything.

---

## 4. Trait categories

Fourteen categories across two layers, plus a lore header.

### 4.1 Visual layer — comical human description

| # | Category | Example common | Example rare |
|---|----------|----------------|--------------|
| 1 | `physical.height` | average build | desk-sized, permanently looms in doorways |
| 2 | `physical.accessory` | lanyard with one badge | lanyard with 14 badges of varying importance; a single shipwreck earring |
| 3 | `physical.expression` | polite disappointment, mid-sigh | the face of someone about to send a long email; eyes that have seen SAP |
| 4 | `physical.material` *(clothing / look)* | cardigan, polo shirt | permed hair that hasn't changed since 1994; dresses exactly like their LinkedIn profile photo, 1999 edition |
| 5 | `theme.primary_color` | beige, navy, office-sage | Pantones from specific discontinued Excel chart themes |
| 6 | `theme.accent_color` | stationery-neutral | the exact green of an old payroll statement |

(`physical.species` is no longer rolled — it's always `"human"` for rolled
bots. Hand-written configs can still set it to anything.)

### 4.2 Behavioural layer

| # | Category | Example common | Example rare |
|---|----------|----------------|--------------|
| 7 | Name | Steve, Karen, Derek, Priya | Joaquín, Marina, Günther, "The One Who Doesn't Speak" |
| 8 | Job title | Senior Developer, QA Lead | Galactic Viceroy of Research Excellence; Wizard of Light Bulb Moments |
| 9 | Desk setup | A plant, a photo, a mug | 9-monitor day-trading rig; cardboard cutout of Nicolas Cage |
| 10 | Office habit | Sends emails at midnight | Kept a camping cot in the server cabinet during a year-long migration |
| 11 | Coffee / food ritual | Black coffee, tea with milk | Starbucks Medicine Ball; 200+ rubber ducks; a kombucha SCOBY fermenting at the desk |
| 12 | Meeting energy | Always on mute | Hasn't spoken in a meeting since 2019, still gets performance bonuses |
| 13 | Passive-aggressive move | "Per my last email" | "Resending with urgency" — same email, 8 minutes later, red exclamation |

### 4.3 Lore layer (derived, not rolled)

The `homunculus` block is assembled after the 13-trait roll:

- `subject_id` — a four-digit zero-padded number, generated randomly per roll
- `cohort` — random day of the week
- `classification` — derived from the rarity tier (§5.4)
- `ingested` — random date in 2024–2026
- `flag` — weighted: `normal` (~70%), `flagged for review` (~25%),
  `redacted` (~4%), `Do Not Contact` (~1%)

The `flag` value adds an extra layer of rarity flavour independent of the
trait roll — a common-tier bot with a `Do Not Contact` flag is still a
screenshot-worthy pull.

Each of the 13 rolled categories gets 30–60 pool entries at launch, weighted
across five rarity bands (see §5). `personality.tone / formality / humor /
emoji_style` stay unrolled (see Non-goals, §11).

---

## 5. Rarity — the engine

### 5.1 Per-trait rarity bands

Every pool entry is tagged with a rarity band and a corresponding weight:

| Band | Weight (relative) | Approx. per-draw probability |
|------|------------------:|-----------------------------:|
| Common | 50 | ~50% |
| Uncommon | 25 | ~25% |
| Rare | 15 | ~15% |
| Legendary | 8 | ~8% |
| Mythic | 2 | ~2% |

Weights are assigned to *categories* consistently, so the per-draw
probabilities are the same across all 13 categories. The roller does 13
independent weighted draws.

### 5.2 Rarity score (rarity.tools formula)

For each rolled trait, compute `1 / (its probability)`. Sum across all 13
categories. That's the Rarity Score.

- A Common trait (~50%) contributes `1/0.5 = 2` points.
- A Rare trait (~15%) contributes `1/0.15 ≈ 6.7` points.
- A Mythic trait (~2%) contributes `1/0.02 = 50` points.

### 5.3 Worked example — sanity checking the math

A bot that rolls 13 Common traits:
> score = 13 × 2 = **26**. Tier: Team Lead (just over the Filing Clerk
> threshold — worth tuning thresholds during implementation).

A bot that rolls 11 Common + 2 Rare:
> score = 11×2 + 2×6.7 = 22 + 13.4 = **35.4**. Tier: Team Lead.

A bot that rolls 9 Common + 3 Rare + 1 Mythic:
> score = 9×2 + 3×6.7 + 1×50 = 18 + 20.1 + 50 = **88.1**. Tier: Middle
> Manager.

A bot that rolls 7 Common + 4 Rare + 2 Mythic:
> score = 7×2 + 4×6.7 + 2×50 = 14 + 26.8 + 100 = **140.8**. Tier: Middle
> Manager, one more rare hit away from C-Suite.

The math means: a *single* Mythic trait is roughly 25 times more impactful
than a single Common trait. This is what makes every roll feel like it might
surface something amazing.

### 5.4 Tier thresholds (initial)

| Score range | Tier | Approx. share of rolls |
|-------------|------|-----------------------:|
| < 25 | 🟢 **Filing Clerk** | ~50% |
| 25 – 60 | 🔵 **Team Lead** | ~30% |
| 60 – 150 | 🟣 **Middle Manager** | ~14% |
| 150 – 500 | 🟠 **C-Suite** | ~5% |
| 500+ | 🌟 **HR Warned Us About** | ~1% |

Thresholds are educated guesses calibrated against the math in §5.3. The
integration test in §10 runs 10,000 simulated rolls and asserts the tier
distribution lands within ±2 percentage points of the target shape. If not,
thresholds get adjusted, not pool weights (keeps the math clean).

### 5.5 Named Subjects — the HOMUNCULUS source data

The top tier includes a small set of **hand-authored named bots** based on
real legendary workplace incidents. These are framed in-universe as the
**original source subjects** — the humans HOMUNCULUS observed directly, the
data points from which the rest of the corpus was extrapolated. True 1-of-1s.

**How the rarity score works for these:** assigned a fixed score of `1000`,
landing them unambiguously in the HR-Warned-Us-About tier without shoehorning
them into the formula. The `rarity.per_trait` breakdown is omitted (no rolled
traits); instead the report includes a `lore` field with the real incident
they're based on.

**Probability.** Before the normal 13-trait roll, the server does a single
0.5% roll. If it hits, the server returns one of the pre-written Named
Subjects (uniformly selected) instead. Their `homunculus.flag` is always
`Do Not Contact`.

**Launch-day list (5 Named Subjects):**

1. **"Bob" from Infrastructure** — outsourced his job to a Chinese consulting
   firm while watching cat videos. Verizon's top-rated developer that year.
   *(Verizon RISK Team report, 2013.)*
2. **Joaquín García, Property Supervisor** — collected a salary for six years
   without showing up. Caught only when nominated for a long-service award.
   *(The Guardian, 2016.)*
3. **The Knight Capital Deployment Engineer** — forgot to copy new code to
   one of eight servers. $460M in errant trades in 45 minutes. *(SEC report,
   2012.)*
4. **The Citibank Sender** — wired $900M of the bank's own money to Revlon
   creditors with one click. A judge ruled they could keep it. *(Reuters,
   2020.)*
5. **The GitLab Backup Operator** — `rm -rf`'d the wrong production database.
   All five backup methods had silently failed. 18-hour recovery live-streamed
   on YouTube. *(GitLab public post-mortem, 2017.)*

---

## 6. Paragraph generation

**Template-based, deterministic, no LLM dependency.**

The server holds exactly **10 paragraph templates**, each with slots for the
rolled traits. When a bot is rolled, the server picks a template uniformly at
random and fills the slots.

Example template (slot names in `{ }`):

```
Meet {name} — your new {job_title}. {physical_description}
{habit} {meeting_energy} {passive_aggressive_setup}.
```

The paragraph is rendered inside a **lore frame** — a header line and a
footer line drawn from the `homunculus` block:

```
HOMUNCULUS CORPUS · Subject {subject_id} · Cohort: {cohort}
Classification: {classification} · Rarity {score} · {percentile}th percentile

{paragraph}

— RELATABILITY CORPUS v3.1 · ingested {ingested} · {flag}
```

The frame is static; only the slots change. That consistency is the point —
it makes every roll feel like the same classified document with a different
subject.

Slot fragments are short self-contained clauses stored alongside each pool
entry — e.g., the Office-habit entry `"Microwaves fish despite three
separate HR warnings"` is already a complete clause, not just the noun
"fish."

**Named Subjects bypass templates.** Each of the 5 hand-authored subjects
has its own hand-written paragraph. They don't need slot-filling because
they aren't assembled.

**Why templates, not an LLM:**
- No API keys, no network calls during a roll.
- Fast (milliseconds), fully deterministic, trivially testable.
- TJ can read every line of this code; an LLM-based system would be an opaque
  layer on top of an opaque layer.
- Upgrade path to LLM-rewrite is open — the server already returns the raw
  trait JSON alongside the paragraph, so a client that wants to can re-prose
  it with its own model later.

---

## 7. Randomness and seeding

- Production uses Node's built-in `Math.random()`. No cryptographic requirement
  — this is a gag generator, not security.
- The roller accepts an optional seed parameter (via an injected RNG function).
  Tests pass a deterministic seedable PRNG (a small `mulberry32` or similar,
  ~10 lines) so snapshot tests are stable.
- Production code path ignores the seed parameter unless explicitly supplied,
  so there's no risk of a production bot being silently deterministic.

---

## 8. Persistence — what happens after a roll

**MVP behaviour: rolls are ephemeral.** Calling the new `roll_identity` tool
returns a rolled bot but does *not* persist it. The existing `get_identity`
tool continues to return whatever is in `bling.json` (if any).

**To keep a roll**, the user either:
1. Copies the returned JSON into `bling.json` by hand (works today, zero new
   code needed), or
2. Calls a new tool `save_last_roll` which writes the most-recent roll to
   `bling.json`. This tool only works inside the same server process (no
   cross-session memory).

**Why ephemeral for MVP:** keeps the server stateless, which matches the
current codebase and avoids introducing a session store. If users end up
wanting persistent session-aware rolls, that's a v2 feature with its own spec.

---

## 9. MCP tools — what the server exposes

### 9.1 Unchanged
- `get_identity` — returns the identity from `bling.json`, exactly as today.
- `get_theme_for_platform` — unchanged.

### 9.2 New
- **`roll_identity`** — generates a fresh random bot. Returns:
  ```jsonc
  {
    "identity": { /* the rolled BlingIdentity, including homunculus block */ },
    "rarity": {
      "score": 147.3,
      "tier": "Middle Manager",
      "percentile": 91,
      "per_trait": [ /* omitted for Named Subjects */ ]
    },
    "paragraph": "Meet Brenda from Accounts — your new ASCII Comptroller...",
    "framed": "HOMUNCULUS CORPUS · Subject 0147...\n\nMeet Brenda...\n\n— RELATABILITY CORPUS v3.1...",
    "lore": null  // populated only for Named Subjects
  }
  ```
  The `framed` field is the fully-rendered share card (header + paragraph +
  footer). Clients that want the raw paragraph use `paragraph`; clients that
  want the screenshot-ready version use `framed`.
- **`save_last_roll`** — writes the most-recent roll to `bling.json`. Errors
  cleanly if no roll has happened this session.
- **`get_rarity_report`** — returns the formatted share-card string for the
  current identity (either the fixed `bling.json` one or the last roll). Useful
  for clients that want a ready-to-display block.

### 9.3 Deferred to v2
- `get_personality_preamble` — returns a short system-prompt fragment for
  clients that want light behavioural garnish. Out of scope here; shape is
  reserved.

---

## 10. Testing approach

- **Schema test** — a rolled identity must satisfy the existing `BlingIdentity`
  TypeScript type. If the shapes drift, the test fails loudly. Guards against
  the exact "silent schema break" that the self-review caught.
- **Unit tests** for each trait pool: weights sum correctly, no empty pools,
  no malformed entries, every entry has all required fields (value, band,
  slot-fragment).
- **Unit tests** for the rarity.tools formula against the worked examples in
  §5.3.
- **Unit tests** for the tier lookup at each boundary (score 24.9 → Filing
  Clerk, 25.0 → Team Lead, etc.).
- **Snapshot tests** — given a fixed seed, a rolled bot produces the same
  paragraph every time. Catches template changes.
- **Distribution test** — 10,000 simulated rolls, assert the tier distribution
  lands within ±2 percentage points of §5.4's targets. Catches any weighting
  drift when pools are edited later.
- **Named Subject test** — asserts that given a rigged RNG where the 0.5%
  pre-roll hits, each of the 5 hand-authored subjects is reachable.

No network, no external dependencies beyond what the MVP already has.

---

## 11. Non-goals (explicit)

To keep scope honest:

- **No LLM-generated paragraphs.** Template-based only for the MVP.
- **No behavioural injection.** Rolled bots don't change how the AI responds;
  they're data-only. (`get_personality_preamble` is explicitly deferred.)
- **No i18n.** English only.
- **No user-supplied custom pools.** Pools are internal to the server at launch.
- **No cross-session persistence.** `save_last_roll` works only within the
  server process's lifetime.
- **No rate-limiting on rolls.** A client can roll as many times as it wants.
- **No rolling of `personality.tone / formality / humor / emoji_style`.** The
  existing MVP already handles those fields; the Mystery Box fills them with
  sensible defaults rather than rolling from pools. (Revisit in v2 if needed.)

---

## 12. File and module layout

Staying flat, consistent with the existing codebase (`src/identity.ts`,
`src/tools.ts`, `src/types.ts`):

```
src/
  index.ts           (unchanged — server entry)
  identity.ts        (unchanged — load + validate bling.json)
  tools.ts           (adds: roll_identity, save_last_roll, get_rarity_report)
  types.ts           (adds: RolledIdentity, RarityReport, MysticBot)
  mystery_box.ts     (new — pools, roller, scorer, paragraph templates,
                      Named Subjects. Split later if it grows beyond ~500 lines.)
tests/
  mystery_box.test.ts
  tools.test.ts      (unchanged for existing tests; adds new-tool tests)
```

One new file, not five. If `mystery_box.ts` grows past ~500 lines (reasonable
ceiling for pool data + logic), split at that point rather than pre-emptively.

---

## 13. Open questions — for user review

1. **Tier names.** `Filing Clerk / Team Lead / Middle Manager / C-Suite /
   HR Warned Us About` — placeholder-locked. Happy, or iterate?
2. **Named Subject count.** 5 at launch. Want more? Fewer? Any specific
   incidents you want guaranteed in?
3. **Paragraph dose.** Default ~2 sentences for Common → ~4 sentences for
   top-tier. Too short? Too long?
4. **Pool size per category.** 30–60 entries. Bigger = rarer combos,
   smaller = easier to curate the quality bar.
5. **Named Subject pre-roll probability.** Proposed 0.5% (so ~1 in 200 rolls
   is a Named Subject). Too rare? Too common?

---

## Changelog

### First pass → Second pass (post self-review)

1. **(Major)** Robot/cyborg framing preserved. Mystery Box bots still have
   physical + theme traits. Office-worker layer sits on top. §1, §3, §4.1.
2. **(Major)** Schema extended, not replaced. New `office` block is optional
   and additive. Existing `bling.json` files still work. §3.
3. **(Major)** Mythic bots now have a fixed score of 1000 and are selected
   via a 0.5% pre-roll, rather than being shoehorned into the rarity.tools
   formula. §5.5.
4. **(Major)** Persistence is now defined — rolls are ephemeral; users opt
   in via `save_last_roll` or manual copy. §8.
5. **(Moderate)** Math is shown. Worked examples in §5.3 demonstrate the
   formula at multiple tier levels.
6. **(Moderate)** File layout is now flat, single new file, consistent with
   the existing codebase. §12.
7. **(Moderate)** Randomness source specified. `Math.random()` in production,
   seedable PRNG in tests. §7.
8. **(Minor)** Template count locked at 10. Non-goals section added. Schema
   test added to testing approach. §6, §10, §11.

### Second pass → Third pass (framing rewrite)

9. **(Major)** Framing rewritten. Bots are now humans (comically described),
   not robots. The robot/cyborg layer is retired. §1, §4.1.
10. **(Major)** In-universe lore added — HOMUNCULUS, the AI that studied
    humans to make bots relatable and concluded that *this* is what humans
    are like. §1.1.
11. **(Major)** Chip retired as the project's default mascot. Existing
    hand-written `bling.json` files continue to work, but the `bling.json`
    example file is rewritten to be a sample HOMUNCULUS subject. §1.3.
12. **(Major)** `physical.species` is no longer rolled; always `"human"` for
    rolled bots. Hand-written configs can still set it to anything. §4.1.
13. **(Moderate)** New `homunculus` block on the identity — `subject_id`,
    `cohort`, `classification`, `ingested`, `flag`. Adds the screenshot-worthy
    classified-document frame. §3, §4.3.
14. **(Moderate)** Mythic bots reframed as "Named Subjects" — the real-human
    source data HOMUNCULUS extrapolated from. §5.5.
15. **(Moderate)** Category count is now **13** (was 14 in second pass, was
    15 in first pass). `personality.species` dropped. Math updated
    throughout. §4, §5.
16. **(Minor)** `roll_identity` now returns a `framed` string — the
    fully-rendered share card with header, paragraph, and footer — alongside
    the raw paragraph. §9.2.

---

## Appendix A — Source material

Trait pool seeds draw from real workplace folklore:

- **AskAManager.org** — the richest vein of specific workplace-quirk stories,
  especially its comment sections (microwaved-fish letters, cursed-desk-object
  letters, passive-aggressive-email letters).
- **Reddit** — r/sysadmin (legendary habits), r/MaliciousCompliance (exit
  stories), r/talesfromtechsupport (printer pranks), r/antiwork (viral quits),
  r/overemployed (double-dippers), r/ProgrammerHumor (rubber ducks, Nicolas
  Cage cutouts).
- **Verifiable incidents** — Verizon RISK Team report on "Bob" (2013); SEC
  report on Knight Capital (2012); Reuters on the Citibank wire (2020);
  GitLab's public post-mortem (2017); The Guardian on Joaquín García (2016).
- **Corporate folklore** — real-but-absurd job titles (Ogilvy's "Wizard of
  Light Bulb Moments"; Google's "Galactic Viceroy of Research Excellence");
  Sun Microsystems' haiku resignation; Steven Slater's JetBlue exit; Marina
  Shifrin's viral dance.
- **Safe comedy sources** — Michael Scott / David Brent / Stanley Hudson
  quotes. These are already filtered comedy rather than real-world cruelty,
  so they're the safest place to pull catchphrase material from.

Everything in the pools is workplace absurdity, not punching-down humour.
