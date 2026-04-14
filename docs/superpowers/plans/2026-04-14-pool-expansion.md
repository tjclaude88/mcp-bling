# Pool Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand all 13 WOW trait pools from 79 total entries to 465 total entries, preserving tone and rarity semantics, with zero logic changes.

**Architecture:** Pure data expansion of `src/mystery_box/pools.ts`. Each pool's entries are extended in place according to the size tiers and band-pyramid distribution defined in `docs/superpowers/specs/2026-04-14-pool-expansion-design.md`. No new files, no logic changes, no new tests. Per-task commits so every commit leaves the tree green (all 94 existing tests must pass after every task).

**Tech Stack:** TypeScript, vitest (via `npm test`), no new dependencies.

---

## Reference Material

**Design spec:** `docs/superpowers/specs/2026-04-14-pool-expansion-design.md` — read this FIRST before starting any task. It defines:
- Tier sizes (45/30/15 entries per pool)
- Band splits per tier (21/12/7/3/2 for 45-entry pools, 14/8/4/2/2 for 30-entry pools, 7/4/2/1/1 for 15-entry pools)
- Themed band creative brief (Common = corporate realism → Mythic = cryptid)
- Per-slot grammar constraints (§4.4) — critical for habit, physical_height, physical_expression

**Current pool file:** `src/mystery_box/pools.ts` — has all 13 pools with ~6 entries each.

**Current test file:** `tests/mystery_box.test.ts` — includes a 10k-roll distribution test with ±10pp per-tier bounds. Must keep passing.

**Gotcha reminder:**
- Hex colours MUST be exactly `#RRGGBB` (6 digits, uppercase `#` prefix). Validator rejects anything else.
- `habit` entries are embedded after "they " — must be 3rd-person singular verb phrases (e.g. "sends emails at midnight" ✓, not "send emails" or "sending emails").

---

## Task 1: Preflight — branch and baseline

**Files:**
- No code changes in this task.

- [ ] **Step 1: Confirm working tree is clean on main**

Run: `git status`
Expected: `On branch main` / `nothing to commit, working tree clean`.
If dirty: stop and ask the user. Do NOT proceed.

- [ ] **Step 2: Create feature branch**

Run: `git checkout -b feat/pool-expansion`
Expected: `Switched to a new branch 'feat/pool-expansion'`.

Rationale: keeps the 13 per-pool commits isolated from main until review.

- [ ] **Step 3: Run full test suite as baseline**

Run: `npm test --silent`
Expected: `Test Files  3 passed (3)` / `Tests  94 passed (94)`.
If any test fails: stop and ask the user. Do NOT proceed.

- [ ] **Step 4: Record starting entry counts**

Run:
```bash
grep -cE '^\s*\{ value:' src/mystery_box/pools.ts
```
Expected: `79` (the count we're starting from).

- [ ] **Step 5: Read the design spec end-to-end**

Read `docs/superpowers/specs/2026-04-14-pool-expansion-design.md` in full. Pay special attention to:
- §4.3 Themed bands creative brief
- §4.4 Grammar constraints by slot
- §4.5 Colour constraints

No commit for this task.

---

## Task 2: Expand `NAMES` pool to 45 entries

**Files:**
- Modify: `src/mystery_box/pools.ts` (the `NAMES` constant, currently lines 10–18)

**Target split:** 21 Common / 12 Uncommon / 7 Rare / 3 Legendary / 2 Mythic = 45 total.

**Existing entries (keep as-is, count toward target):** Steve (C), Karen (C), Derek (U), Priya (U), Brenda from Accounts (R), Günther (L), The One Who Doesn't Speak (M).

**Net new needed:** 19 Common, 10 Uncommon, 6 Rare, 2 Legendary, 1 Mythic = 38 new entries.

**Creative brief per band (from spec §4.3):**
- **Common names** — ordinary first names that feel like any coworker. Examples to match tone: "Dave", "Linda", "Keith".
- **Uncommon names** — slightly distinctive, still real. Examples: "Yusuf", "Aoife", "Hans".
- **Rare names** — names with a qualifier that turns them into office shorthand. Examples: "Brenda from Accounts" ✓ — so follow that pattern: "Dave who used to be contractor", "Linda on the third floor".
- **Legendary names** — unusual enough to be memorable, named like office legends. Examples: "Günther" ✓ — follow with things like "Mx. Featherington", "Reg".
- **Mythic names** — a name that is also a statement about them. Examples: "The One Who Doesn't Speak" ✓ — follow with "She Who Approves Expense Reports", "The Interim CTO Who Never Left".

- [ ] **Step 1: Draft 38 new entries**

Follow the creative brief above. Ensure:
- No duplicates of existing entries
- No duplicates within your own additions
- Each entry's `band` field is one of: `"Common"`, `"Uncommon"`, `"Rare"`, `"Legendary"`, `"Mythic"`
- Proper British/Irish/European spelling fits the tone (e.g. "Aoife" ✓)

- [ ] **Step 2: Edit `src/mystery_box/pools.ts`**

Replace the `NAMES` constant (currently lines 10–18) with a 45-entry version in the declared order: all Commons first, then all Uncommons, Rares, Legendaries, Mythics. Keep formatting consistent with the existing file (2-space indent, aligned value/band columns within reason).

- [ ] **Step 3: Verify count and build**

Run:
```bash
npx tsc --noEmit
```
Expected: no TypeScript errors.

Run:
```bash
awk '/^const NAMES/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'
```
Expected: `45`.

- [ ] **Step 4: Check for duplicate values within the pool**

Run:
```bash
awk '/^const NAMES/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d
```
Expected: no output (no duplicates).
If duplicates found: fix and re-run.

- [ ] **Step 5: Run full test suite**

Run: `npm test --silent`
Expected: `Tests  94 passed (94)`.
If any test fails: fix before committing.

- [ ] **Step 6: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand NAMES pool to 45 entries

21 Common / 12 Uncommon / 7 Rare / 3 Legendary / 2 Mythic per
steep-pyramid spec (2026-04-14-pool-expansion-design.md).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Expand `JOB_TITLES` pool to 45 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `JOB_TITLES` constant).

**Target split:** 21 C / 12 U / 7 R / 3 L / 2 M = 45.

**Existing (6):** Senior Developer (C), QA Lead (C), Regional Manager (U), ASCII Comptroller (R), Wizard of Light Bulb Moments (L), Galactic Viceroy of Research Excellence (M).

**Net new needed:** 19 C / 11 U / 6 R / 2 L / 1 M = 39.

**Grammar constraint (spec §4.4):** must work as a noun phrase in contexts like `"your new {job_title}"`, `"the office's {job_title}"`, `"{job_title}? That would be Steve."`. No leading article. Capitalise as a title.

**Creative brief:**
- **Common** — realistic job titles: "Account Executive", "IT Support Technician", "Office Manager".
- **Uncommon** — real but slightly baroque titles: "Senior Customer Success Enablement Specialist".
- **Rare** — titles that are funny without being fake: "Head of Mug Allocation", "Deputy Director of Coffee Machine Relations".
- **Legendary** — invented titles that sound like Michael Scott made them up: "Wizard of Light Bulb Moments" ✓.
- **Mythic** — cosmic corporate titles: "Galactic Viceroy of Research Excellence" ✓, "Eternal Custodian of the Shared Drive".

- [ ] **Step 1: Draft 39 new entries** — follow the brief, no duplicates.
- [ ] **Step 2: Edit `pools.ts`** — replace `JOB_TITLES` constant with 45 entries in band order.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit` (no errors).
- [ ] **Step 4: Verify count** — `awk '/^const JOB_TITLES/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `45`.
- [ ] **Step 5: Check for duplicates** — `awk '/^const JOB_TITLES/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 6: Run tests** — `npm test --silent` → `Tests  94 passed (94)`.
- [ ] **Step 7: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand JOB_TITLES pool to 45 entries

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Expand `HABITS` pool to 45 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `HABITS` constant).

**Target split:** 21 C / 12 U / 7 R / 3 L / 2 M = 45.

**Existing (6):** sends emails at midnight (C), replies-all to everything (C), microwaves fish despite three separate HR warnings (U), hums Enya during code reviews (R), kept a folding cot in a server cabinet during a year-long migration (L), has not spoken in a meeting since 2019 and still gets bonuses (M).

**Net new needed:** 19 C / 11 U / 6 R / 2 L / 1 M = 39.

**🚨 CRITICAL GRAMMAR CONSTRAINT (spec §4.4):** The `habit` slot appears in the template `"{name} {habit}"` (renderer `rendering.ts:63`). This means each entry is concatenated after a proper noun — e.g. "Steve {habit}". So every entry MUST start with a **3rd-person singular verb** (ends in "s" for regular verbs).

**Examples:**
- ✓ `"sends emails at midnight"` → "Steve sends emails at midnight"
- ✓ `"microwaves fish despite three separate HR warnings"` → "Steve microwaves fish…"
- ✗ `"send emails at midnight"` — ungrammatical ("Steve send emails…")
- ✗ `"sending emails at midnight"` — ungrammatical ("Steve sending emails…")
- ✗ `"emails at midnight habitually"` — the verb needs to come first

**Creative brief:**
- **Common** — mundane office annoyances: "reads every email aloud to themselves", "eats crisps at their desk".
- **Uncommon** — mildly unprofessional: "microwaves fish despite three separate HR warnings" ✓.
- **Rare** — fully unprofessional: "has a whiteboard nobody is allowed to clean".
- **Legendary** — folklore-level: "kept a folding cot in a server cabinet during a year-long migration" ✓.
- **Mythic** — paranormal: "has not spoken in a meeting since 2019 and still gets bonuses" ✓.

- [ ] **Step 1: Draft 39 new entries** — EVERY entry must start with a 3rd-person singular verb. Double-check by mentally prefixing "Steve" to each.
- [ ] **Step 2: Edit `pools.ts`** — replace `HABITS` constant.
- [ ] **Step 3: Grammar spot-check** — pick 5 random entries you added, mentally test them in the sentence `"Steve ____."`. If any sound wrong, rewrite.
- [ ] **Step 4: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 5: Verify count** — `awk '/^const HABITS/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `45`.
- [ ] **Step 6: Check for duplicates** — `awk '/^const HABITS/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 7: Run tests** — `npm test --silent` → `Tests  94 passed (94)`.
- [ ] **Step 8: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand HABITS pool to 45 entries

Each entry remains a 3rd-person singular verb phrase so it reads
naturally after "they "/"{name} " in paragraph templates.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Expand `DESK_SETUPS` pool to 45 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `DESK_SETUPS` constant).

**Target split:** 21 C / 12 U / 7 R / 3 L / 2 M = 45.

**Existing (6):** a single dying succulent (C), a coffee mug labelled WORLD'S OKAYEST DBA (C), a moleskine that nobody has ever seen open (U), a 9-monitor day-trading rig (R), forty unwashed mugs in a stable equilibrium (L), a full-size cardboard cutout of Nicolas Cage (M).

**Net new needed:** 19 C / 11 U / 6 R / 2 L / 1 M = 39.

**Grammar constraint (spec §4.4):** preceded by "sits behind" or "Their desk:" in templates. Entry should start with an **article** (a / the / forty / etc.) and be a noun phrase.

**Creative brief:**
- **Common** — boring desk objects: "a half-drunk mug of tea", "a lone Post-it with a phone number on it".
- **Uncommon** — mildly interesting: "a moleskine that nobody has ever seen open" ✓.
- **Rare** — excessive or pointed: "a 9-monitor day-trading rig" ✓.
- **Legendary** — folklore: "forty unwashed mugs in a stable equilibrium" ✓.
- **Mythic** — surreal: "a full-size cardboard cutout of Nicolas Cage" ✓.

- [ ] **Step 1: Draft 39 new entries** — every entry starts with an article or number.
- [ ] **Step 2: Edit `pools.ts`** — replace `DESK_SETUPS` constant.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 4: Verify count** — `awk '/^const DESK_SETUPS/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `45`.
- [ ] **Step 5: Check for duplicates** — `awk '/^const DESK_SETUPS/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 6: Run tests** — `npm test --silent`.
- [ ] **Step 7: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand DESK_SETUPS pool to 45 entries

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Expand `COFFEE_RITUALS` pool to 45 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `COFFEE_RITUALS` constant).

**Target split:** 21 C / 12 U / 7 R / 3 L / 2 M = 45.

**Existing (6):** black coffee, no nonsense (C), tea with milk, exactly one sugar (C), a French press brewed at the desk every morning (U), a Starbucks Medicine Ball, every day, no exceptions (R), Soylent only, and will tell you about it (L), a kombucha SCOBY fermenting next to the keyboard (M).

**Net new needed:** 19 C / 11 U / 6 R / 2 L / 1 M = 39.

**Grammar constraint (spec §4.4):** preceded by "drinks" or "Their drink:". Noun phrase; can start with or without article ("black coffee" ✓, "a Starbucks Medicine Ball" ✓).

**Creative brief:**
- **Common** — basic drinks: "filter coffee with two sugars", "Yorkshire Tea, strong".
- **Uncommon** — specific rituals: "a French press brewed at the desk every morning" ✓.
- **Rare** — suspiciously specific: "a Starbucks Medicine Ball, every day, no exceptions" ✓.
- **Legendary** — committed to a brand/philosophy: "Soylent only, and will tell you about it" ✓.
- **Mythic** — not really a drink: "a kombucha SCOBY fermenting next to the keyboard" ✓.

- [ ] **Step 1: Draft 39 new entries.**
- [ ] **Step 2: Edit `pools.ts`** — replace `COFFEE_RITUALS` constant.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 4: Verify count** — `awk '/^const COFFEE_RITUALS/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `45`.
- [ ] **Step 5: Check for duplicates** — `awk '/^const COFFEE_RITUALS/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 6: Run tests** — `npm test --silent`.
- [ ] **Step 7: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand COFFEE_RITUALS pool to 45 entries

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Expand `MEETING_ENERGY` pool to 45 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `MEETING_ENERGY` constant).

**Target split:** 21 C / 12 U / 7 R / 3 L / 2 M = 45.

**Existing (6):** always on mute (C), always 4 minutes late, always with a reason (C), interrupts with 'let me just jump in here' (U), monologues for 47 uninterrupted minutes (R), books 7 a.m. meetings 'to respect everyone's focus time' (L), speaks only in acronyms nobody else recognises (M).

**Net new needed:** 19 C / 11 U / 6 R / 2 L / 1 M = 39.

**Grammar constraint (spec §4.4):** appears in `"In meetings they are {meeting_energy}"` and `"In meetings: {meeting_energy}"`. Entry must work BOTH as a descriptor after "they are" AND as a standalone fragment. "Always on mute" ✓ in both. "Speaks only in acronyms" works standalone but is weird after "they are" — prefer adjectival/state-of-being phrasing.

**Examples that work in both:**
- ✓ "always on mute" (they are always on mute / In meetings: always on mute)
- ✓ "dead silent, camera off"
- ✓ "the one sharing their screen for the entire hour"

**Examples that break:**
- ✗ "speaks only in acronyms" → "they are speaks only in acronyms" ungrammatical

⚠️ **Existing entries `"interrupts with..."`, `"monologues for..."`, `"books..."`, `"speaks only in..."` are technically ungrammatical after "they are"** — preserved as legacy. New entries should be stricter: write them as states/descriptors, not verbs.

**Creative brief:**
- **Common** — universal meeting-goer archetypes (stated as state): "always on mute" ✓.
- **Uncommon** — one-note types: "the one who takes notes and posts them unprompted".
- **Rare** — dreaded personalities: "the camera-off chewer".
- **Legendary** — infamous: "famous for the 'quick sync' that lasts 90 minutes".
- **Mythic** — impossible: "physically present in two meetings at once".

- [ ] **Step 1: Draft 39 new entries** — write as descriptors/states, not verbs. Mentally test in "they are ____".
- [ ] **Step 2: Edit `pools.ts`** — replace `MEETING_ENERGY` constant.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 4: Verify count** — `awk '/^const MEETING_ENERGY/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `45`.
- [ ] **Step 5: Check for duplicates** — `awk '/^const MEETING_ENERGY/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 6: Run tests** — `npm test --silent`.
- [ ] **Step 7: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand MEETING_ENERGY pool to 45 entries

New entries written as descriptor phrases so they read naturally
after "they are" in paragraph templates.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Expand `PASSIVE_AGGRESSIVE` pool to 45 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `PASSIVE_AGGRESSIVE` constant).

**Target split:** 21 C / 12 U / 7 R / 3 L / 2 M = 45.

**Existing (6):** Per my last email (C), Just circling back (C), Happy to discuss offline (U), Resending with urgency (same email, 8 minutes later, red exclamation) (R), As discussed (it was not discussed) (L), Adding a +1 with no further comment (M).

**Net new needed:** 19 C / 11 U / 6 R / 2 L / 1 M = 39.

**Grammar constraint (spec §4.4):** always embedded in quotes in templates — `"{passive_aggressive}"`. Each entry is a standalone quotable phrase, capitalised like a sentence. No trailing punctuation (template adds period/nothing).

**Creative brief:**
- **Common** — famous corporate euphemisms: "Per my last email" ✓, "Just following up".
- **Uncommon** — classic avoidance: "Happy to discuss offline" ✓, "Let's take this to a smaller group".
- **Rare** — thinly-veiled hostility: "Resending with urgency" ✓.
- **Legendary** — weapons-grade: "As discussed (it was not discussed)" ✓.
- **Mythic** — behavioural: "Adding a +1 with no further comment" ✓ — describes the behaviour, not the phrase.

- [ ] **Step 1: Draft 39 new entries.**
- [ ] **Step 2: Edit `pools.ts`** — replace `PASSIVE_AGGRESSIVE` constant.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 4: Verify count** — `awk '/^const PASSIVE_AGGRESSIVE/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `45`.
- [ ] **Step 5: Check for duplicates** — `awk '/^const PASSIVE_AGGRESSIVE/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 6: Run tests** — `npm test --silent`.
- [ ] **Step 7: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand PASSIVE_AGGRESSIVE pool to 45 entries

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Expand `PHYSICAL_HEIGHT` pool to 30 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `PHYSICAL_HEIGHT` constant).

**Target split:** 14 C / 8 U / 4 R / 2 L / 2 M = 30.

**Existing (6):** average build (C), shorter than expected (C), tall enough to comment on it (U), somehow taller in meetings than in person (R), looms (L), occupies more conceptual than physical space (M).

**Net new needed:** 12 C / 7 U / 3 R / 1 L / 1 M = 24.

**🚨 GRAMMAR CONSTRAINT (spec §4.4):** appears in `"Build: {height}"`, `"Their build is {height}"`, `"Stature: {height}"`. Must be a **noun phrase that works after "is"**. The existing `"looms"` is a known awkward case — do NOT add more verb-form entries. Stick to noun phrases.

**Examples:**
- ✓ "average build" (Their build is average build — acceptable)
- ✓ "gangly" (Their build is gangly — works as predicate adjective)
- ✓ "compact but sturdy"
- ✗ "towers" (Their build is towers — ungrammatical — unless rephrased as "tower-like")

**Creative brief:**
- **Common** — ordinary descriptors: "average build", "a little stocky", "taller on Zoom".
- **Uncommon** — noteworthy: "tall enough to comment on it" ✓.
- **Rare** — optical illusions: "somehow taller in meetings than in person" ✓.
- **Legendary** — mythic: physical descriptions that are almost metaphors.
- **Mythic** — surreal: "occupies more conceptual than physical space" ✓.

- [ ] **Step 1: Draft 24 new entries** — noun phrases or adjective phrases only. Mentally test in "Their build is ____".
- [ ] **Step 2: Edit `pools.ts`** — replace `PHYSICAL_HEIGHT` constant.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 4: Verify count** — `awk '/^const PHYSICAL_HEIGHT/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `30`.
- [ ] **Step 5: Check for duplicates** — `awk '/^const PHYSICAL_HEIGHT/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 6: Run tests** — `npm test --silent`.
- [ ] **Step 7: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand PHYSICAL_HEIGHT pool to 30 entries

New entries use noun/adjective phrases to avoid the existing
"Their build is {verb}" grammar issue.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Expand `PHYSICAL_ACCESSORY` pool to 30 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `PHYSICAL_ACCESSORY` constant).

**Target split:** 14 C / 8 U / 4 R / 2 L / 2 M = 30.

**Existing (6):** a single lanyard with one badge (C), a corporate fleece (C), reading glasses on a chain (U), a lanyard with 14 badges of varying importance (R), a single shipwreck earring they will tell you about (L), an ID badge from a company that no longer exists (M).

**Net new needed:** 12 C / 7 U / 3 R / 1 L / 1 M = 24.

**Grammar constraint (spec §4.4):** preceded by "Carries", "Adornment:", "Recognise them by". Noun phrase, usually starting with an article.

**Creative brief:**
- **Common** — boring accessories: "a lanyard", "a standard-issue company backpack".
- **Uncommon** — slightly dated or specific: "reading glasses on a chain" ✓.
- **Rare** — excessive: "a lanyard with 14 badges of varying importance" ✓.
- **Legendary** — has-a-story: "a single shipwreck earring they will tell you about" ✓.
- **Mythic** — impossible: "an ID badge from a company that no longer exists" ✓.

- [ ] **Step 1: Draft 24 new entries** — noun phrases with articles.
- [ ] **Step 2: Edit `pools.ts`** — replace constant.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 4: Verify count** — `awk '/^const PHYSICAL_ACCESSORY/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `30`.
- [ ] **Step 5: Check for duplicates** — `awk '/^const PHYSICAL_ACCESSORY/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 6: Run tests** — `npm test --silent`.
- [ ] **Step 7: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand PHYSICAL_ACCESSORY pool to 30 entries

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Expand `PHYSICAL_EXPRESSION` pool to 30 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `PHYSICAL_EXPRESSION` constant).

**Target split:** 14 C / 8 U / 4 R / 2 L / 2 M = 30.

**Existing (6):** polite disappointment (C), neutral, unreadable (C), the face of someone about to send a long email (U), eyes that have seen SAP (R), permanently mid-sentence (L), wears nineteen subtly different smiles (M).

**Net new needed:** 12 C / 7 U / 3 R / 1 L / 1 M = 24.

**Grammar constraint (spec §4.4):** preceded by "Expression:", "their expression,", "Demeanour:". Noun phrase **without leading article** ("polite disappointment" ✓, NOT "a polite disappointment").

**Creative brief:**
- **Common** — basic office-face states: "polite disappointment" ✓, "mild exhaustion".
- **Uncommon** — distinctive: "the face of someone about to send a long email" ✓.
- **Rare** — damaged: "eyes that have seen SAP" ✓.
- **Legendary** — permanent states: "permanently mid-sentence" ✓.
- **Mythic** — impossible: "wears nineteen subtly different smiles" ✓.

- [ ] **Step 1: Draft 24 new entries** — NO leading article.
- [ ] **Step 2: Edit `pools.ts`** — replace constant.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 4: Verify count** — `awk '/^const PHYSICAL_EXPRESSION/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `30`.
- [ ] **Step 5: Check for duplicates** — `awk '/^const PHYSICAL_EXPRESSION/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 6: Run tests** — `npm test --silent`.
- [ ] **Step 7: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand PHYSICAL_EXPRESSION pool to 30 entries

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Expand `PHYSICAL_MATERIAL` pool to 30 entries

**Files:** Modify `src/mystery_box/pools.ts` (the `PHYSICAL_MATERIAL` constant).

**Target split:** 14 C / 8 U / 4 R / 2 L / 2 M = 30.

**Existing (6):** a cardigan, at least one (C), polo shirt, jeans, sensible shoes (C), permed hair that hasn't changed since 1994 (U), the exact outfit from their LinkedIn profile, 1999 (R), a tie pinned with what may be a live firefly (L), dressed entirely in clothes received as conference swag (M).

**Net new needed:** 12 C / 7 U / 3 R / 1 L / 1 M = 24.

**Grammar constraint (spec §4.4):** preceded by "Wears", "Outfit:", "Distinguishing features:". Noun phrase, can start with article or be a complete clothing list.

**Creative brief:**
- **Common** — generic clothing: "a plain grey jumper", "the office-standard polo and slacks".
- **Uncommon** — dated or distinctive: "permed hair that hasn't changed since 1994" ✓.
- **Rare** — preserved in amber: "the exact outfit from their LinkedIn profile, 1999" ✓.
- **Legendary** — storied: "a tie pinned with what may be a live firefly" ✓.
- **Mythic** — entirely off: "dressed entirely in clothes received as conference swag" ✓.

- [ ] **Step 1: Draft 24 new entries.**
- [ ] **Step 2: Edit `pools.ts`** — replace constant.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 4: Verify count** — `awk '/^const PHYSICAL_MATERIAL/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'` → `30`.
- [ ] **Step 5: Check for duplicates** — `awk '/^const PHYSICAL_MATERIAL/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d` → no output.
- [ ] **Step 6: Run tests** — `npm test --silent`.
- [ ] **Step 7: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand PHYSICAL_MATERIAL pool to 30 entries

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Expand `THEME_PRIMARY` and `THEME_ACCENT` pools to 15 each

**Files:** Modify `src/mystery_box/pools.ts` (the `THEME_PRIMARY` and `THEME_ACCENT` constants).

**Target split (each pool):** 7 C / 4 U / 2 R / 1 L / 1 M = 15.

**Existing entries (each pool currently has 6):**

`THEME_PRIMARY`: #9C6B3A office-tan (C), #2D4A4F accountant teal (C), #5C3D2E boardroom mahogany (U), #A23E48 expense-report red (R), #1F4E79 PowerPoint navy (L), #FFCD3C overhead-projector yellow (M).

`THEME_ACCENT`: #D9D9D9 (C), #7F7F7F (C), #C0BFA8 (U), #6E8B3D (R), #503D2E (L), #FF6F61 (M).

**Net new needed per pool:** 5 C / 3 U / 1 R / 0 L / 0 M = 9. (The existing L and M already fill those slots.)

**🚨 FORMAT CONSTRAINT (spec §4.5):** Every colour value must be exactly `#RRGGBB` — 6 hex digits, uppercase letters, leading `#`. The validator in `src/identity.ts` rejects shorthand (`#RGB`), lowercase (`#ff6b35`), or missing hash.

**Creative brief (spec §4.5):**
- **Common** — office-supply palette: tan, teal, grey, beige, muted earth.
- **Uncommon** — slightly bolder corporate: mahogany, slate, forest.
- **Rare** — saturated accent colours: expense-report red, energetic orange.
- **Legendary** — iconic brand colours (stay with existing — no new).
- **Mythic** — unhinged (stay with existing — no new).

Include a short inline comment after each new entry describing what the colour evokes (matches existing pattern — see lines 110–117).

- [ ] **Step 1: Draft 9 new entries for `THEME_PRIMARY`** — 5 C / 3 U / 1 R. All `#RRGGBB` uppercase.
- [ ] **Step 2: Draft 9 new entries for `THEME_ACCENT`** — 5 C / 3 U / 1 R. All `#RRGGBB` uppercase.
- [ ] **Step 3: Edit `pools.ts`** — replace both constants.
- [ ] **Step 4: Verify build** — `npx tsc --noEmit`.
- [ ] **Step 5: Verify counts** —

```bash
awk '/^const THEME_PRIMARY/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'
awk '/^const THEME_ACCENT/,/^];/' src/mystery_box/pools.ts | grep -c 'value:'
```
Expected: `15` for each.

- [ ] **Step 6: Verify hex format** —

```bash
awk '/^const THEME_PRIMARY/,/^];/' src/mystery_box/pools.ts | grep -oE '"#[^"]*"' | grep -vE '^"#[0-9A-F]{6}"$'
awk '/^const THEME_ACCENT/,/^];/' src/mystery_box/pools.ts | grep -oE '"#[^"]*"' | grep -vE '^"#[0-9A-F]{6}"$'
```
Expected: no output (any output = malformed hex).

- [ ] **Step 7: Check for duplicates within each pool** —

```bash
awk '/^const THEME_PRIMARY/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d
awk '/^const THEME_ACCENT/,/^];/' src/mystery_box/pools.ts | grep -oE 'value: *"[^"]*"' | sort | uniq -d
```
Expected: no output.

- [ ] **Step 8: Run tests** — `npm test --silent`.
- [ ] **Step 9: Commit**

```bash
git add src/mystery_box/pools.ts
git commit -m "$(cat <<'EOF'
feat(pools): expand THEME_PRIMARY and THEME_ACCENT pools to 15 entries

Adds 5 Common / 3 Uncommon / 1 Rare to each colour pool. Existing
Legendary and Mythic entries retained unchanged.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: End-to-end verification

**Files:**
- No code changes in this task.

- [ ] **Step 1: Verify total entry count**

Run: `grep -cE '^\s*\{ value:' src/mystery_box/pools.ts`
Expected: `465`.
If not 465: trace which pool is off and fix.

- [ ] **Step 2: Verify per-pool counts**

Run:
```bash
for pool in NAMES JOB_TITLES HABITS DESK_SETUPS COFFEE_RITUALS MEETING_ENERGY PASSIVE_AGGRESSIVE PHYSICAL_HEIGHT PHYSICAL_ACCESSORY PHYSICAL_EXPRESSION PHYSICAL_MATERIAL THEME_PRIMARY THEME_ACCENT; do
  count=$(awk "/^const $pool/,/^];/" src/mystery_box/pools.ts | grep -c 'value:')
  echo "$pool: $count"
done
```

Expected output:
```
NAMES: 45
JOB_TITLES: 45
HABITS: 45
DESK_SETUPS: 45
COFFEE_RITUALS: 45
MEETING_ENERGY: 45
PASSIVE_AGGRESSIVE: 45
PHYSICAL_HEIGHT: 30
PHYSICAL_ACCESSORY: 30
PHYSICAL_EXPRESSION: 30
PHYSICAL_MATERIAL: 30
THEME_PRIMARY: 15
THEME_ACCENT: 15
```

- [ ] **Step 3: Run the complete test suite one more time**

Run: `npm test --silent`
Expected: `Tests  94 passed (94)`.

- [ ] **Step 4: Build the server binary**

Run: `npm run build`
Expected: exits 0, no errors.

- [ ] **Step 5: Dump 30 sample rolls for manual review**

The simplest way to sample without starting the MCP server is a small one-off script. Write `scripts/sample-rolls.ts`:

```typescript
// scripts/sample-rolls.ts
// One-off sampler — dumps N rolls for manual tone/grammar review.
// Delete after review (not part of shipped code).

import { rollIdentity, mulberry32 } from "../src/mystery_box.js";

const N = 30;
const seed = Date.now() & 0xffffffff;
for (let i = 0; i < N; i++) {
  const rng = mulberry32(seed + i);
  const rolled = rollIdentity(rng);
  console.log(`--- Roll ${i + 1} (tier: ${rolled.rarity.tier}, score: ${rolled.rarity.score}) ---`);
  console.log(rolled.paragraph);
  console.log();
}
```

Run:
```bash
npx tsx scripts/sample-rolls.ts | tee /tmp/pool-expansion-sample.txt
```

- [ ] **Step 6: Manual review checklist**

Open `/tmp/pool-expansion-sample.txt` and check:

- [ ] No visible `{slot}` placeholders in any output
- [ ] No obvious grammar failures (e.g. "Steve send emails", "Their build is looms")
- [ ] No near-identical rolls (common repetition)
- [ ] Tone stays consistent across the 30 samples — no jarring entries
- [ ] Each band's outputs feel distinct (if you see a Mythic, does it feel mythic?)

**Pass criteria:** at most 1 cosmetic issue. If you find more, identify which pool(s) they trace to and open a fix.

- [ ] **Step 7: Delete the sample script**

```bash
rm scripts/sample-rolls.ts
rmdir scripts 2>/dev/null || true
```

(The script is a throwaway; not part of the shipped code.)

- [ ] **Step 8: Commit if anything changed**

If Step 7 removed files or Step 6 triggered fixes:

```bash
git add -A
git status
git commit -m "$(cat <<'EOF'
chore(pools): remove one-off sample script

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

Otherwise, no commit.

---

## Task 15: Holistic whole-branch review

**Files:**
- No code changes directly; review may trigger fixes.

Per the `feedback_holistic_review` memory: per-task reviews miss cross-cutting issues. This task runs a session-end review of the whole branch diff.

- [ ] **Step 1: Dispatch a code-reviewer subagent against the full branch diff**

Use the `superpowers:code-reviewer` agent with explicit framing: *"This is a session-end audit of the feat/pool-expansion branch, not a per-task review. Look for cross-cutting issues: tonal drift across pools, grammar failures that only appear in combination, band-creative-brief violations, duplicate entries between pools, and inconsistency with the design spec at docs/superpowers/specs/2026-04-14-pool-expansion-design.md."*

Give the agent:
- The spec path
- `git diff main...feat/pool-expansion -- src/mystery_box/pools.ts`

- [ ] **Step 2: Triage findings**

For each Critical or High-severity finding: fix inline, run tests, commit as `fix(pools): <short description>`.
For Medium/Low findings: decide whether to fix now or add to the "follow-ups" section below.

- [ ] **Step 3: Final green run**

Run: `npm test --silent`
Expected: `Tests  94 passed (94)`.

---

## Task 16: Branch decision

**Files:**
- No code changes.

- [ ] **Step 1: Report state to the user**

Summarise: total entries added, commits made, test status, any issues found.

- [ ] **Step 2: Ask the user for branch disposition**

Offer three options:
1. **Merge to main** — `git checkout main && git merge --ff-only feat/pool-expansion` (fast-forward, preserves history).
2. **Keep branch open for more review** — stay on feat/pool-expansion, come back later.
3. **Discard** — if the expansion isn't working out tonally. `git checkout main && git branch -D feat/pool-expansion`.

Do NOT merge without user approval. Do NOT push without user approval.

---

## Follow-ups (explicitly deferred — NOT part of this plan)

These are tracked in the spec §8 and should be captured as separate follow-up plans:

- Tighten the 10k-distribution test from ±10pp to ±2pp
- Mulberry32 stability snapshot test
- Revisit spec §1.1 lore framing
- Possibly re-tier existing entries if some feel mis-banded
