# Bling Bag — MCP Server for Bot Identity & Visual Styling

> One identity, many surfaces. Give your AI agent a name, a personality, a look,
> and a quirky office-worker backstory it can present consistently across
> Claude Code, Claude Desktop, IDE plugins, terminals, web apps, Slack, and Discord.

**Status:** Working MVP. 5 MCP tools, 13 trait pools (465 weighted entries),
full rarity engine. 94/94 tests passing.

---

## What this MCP gives an agent

Five tools, grouped into two halves:

### Identity & styling (read your configured bot)

- **`get_identity`** — returns the bot's full identity (name, personality, appearance, theme colours)
- **`get_theme_for_platform`** — returns platform-formatted styling (ANSI codes, CSS variables, Slack/Discord embed colours, etc.)

### WOW — Weird Office Workers (random identity generator)

- **`roll_identity`** — rolls a fresh random office-worker character (one of 13 traits drawn from weighted pools, scored for rarity, framed in a screenshot-ready share card)
- **`get_rarity_report`** — returns the formatted share card (header + paragraph + footer) for the most-recent roll
- **`save_last_roll`** — persists the most-recent roll as the bot's permanent identity (`bling.json`), with automatic backup of any existing config

---

## Install

### Prerequisites

- Node.js 20 or later
- An MCP-compatible client (Claude Code, Claude Desktop, Codex, Cursor, etc.)

### Add the package

```bash
npm install bling-bag
```

Or run it on-demand without installing — MCP clients can launch it directly via `npx bling-bag` (see client config below).

#### For development (modifying the source)

```bash
git clone https://github.com/tjclaude88/mcp-bling.git
cd mcp-bling
npm install
npm run build
```

Produces a runnable server at `dist/index.js`.

### Wire it into your MCP client

The server uses **stdio transport** — clients launch it as a child process, not over a network port.

#### Claude Code

Add to your Claude Code MCP config (location varies by version):

```json
{
  "mcpServers": {
    "bling": {
      "command": "npx",
      "args": ["-y", "bling-bag"],
      "env": {
        "BLING_PATH": "/absolute/path/to/your/bling.json"
      }
    }
  }
}
```

`npx -y bling-bag` downloads and runs the latest version without requiring a separate install step.

#### Claude Desktop

Same shape, in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bling": {
      "command": "npx",
      "args": ["-y", "bling-bag"],
      "env": {
        "BLING_PATH": "/absolute/path/to/your/bling.json"
      }
    }
  }
}
```

#### Pinning to a version (recommended for production)

To avoid picking up future releases automatically, pin a specific version:

```json
"args": ["-y", "bling-bag@0.1.0"]
```

#### Developer-mode invocation (from a local clone)

If you've cloned the repo and want to run from `dist/` directly, use:

```json
"command": "node",
"args": ["/absolute/path/to/mcp-bling/dist/index.js"]
```

If `BLING_PATH` is not set, the server looks for `./bling.json` in its working directory.

### Config resolution order

The server resolves the bling config path in this order:

1. `--bling <path>` CLI argument (highest priority)
2. `BLING_PATH` environment variable
3. `./bling.json` in the server's working directory (default)

---

## `bling.json` — the bot's identity file

Three fields are required: **`name`**, **`personality`** (with `tone`, `formality`, `humor`), and **`theme`** (with `primary_color` and `accent_color` as `#RRGGBB` hex strings).

### Minimum example

```json
{
  "name": "Pixel",
  "personality": {
    "tone": "warm",
    "formality": "casual",
    "humor": "playful"
  },
  "theme": {
    "primary_color": "#3A7BD5",
    "accent_color": "#FFD166"
  }
}
```

### Full example (with all optional sections)

```json
{
  "name": "Brenda from Accounts",
  "personality": {
    "tone": "polite",
    "formality": "professional",
    "humor": "dry",
    "catchphrase": "Per my last email"
  },
  "physical": {
    "species": "human",
    "height": "permanently mid-sigh",
    "accessory": "a lanyard with 14 badges of varying importance",
    "expression": "polite disappointment",
    "material": "a cardigan, at least one"
  },
  "office": {
    "job_title": "ASCII Comptroller",
    "desk_setup": "a coffee mug labelled WORLD'S OKAYEST DBA",
    "habit": "microwaves fish despite three separate HR warnings",
    "coffee_ritual": "black coffee, no nonsense",
    "meeting_energy": "always 4 minutes late, always with a reason",
    "passive_aggressive": "Per my last email"
  },
  "theme": {
    "primary_color": "#9C6B3A",
    "accent_color": "#D9D9D9"
  },
  "homunculus": {
    "subject_id": "0147",
    "cohort": "Tuesday",
    "classification": "Middle Manager",
    "ingested": "2025-07-14",
    "flag": "flagged for review"
  }
}
```

### Validation rules

- `name` — non-empty string
- `personality.tone`, `personality.formality`, `personality.humor` — non-empty strings
- `theme.primary_color`, `theme.accent_color` — must match `^#[0-9A-Fa-f]{6}$` (no shorthand `#RGB`, no missing `#`)

Validation errors come back as `isError: true` with a structured `{ error: "..." }` body that names the missing or malformed field — agents can self-correct.

---

## Typical agent flows

### Flow A — adopt the configured identity

```
1. Call get_identity → receive name, personality, appearance, theme
2. Call get_theme_for_platform with platform="terminal" (or web/slack/discord/ide)
3. Use the returned styling in agent output (ANSI codes for headings, etc.)
```

### Flow B — generate a fresh random identity

```
1. Call roll_identity → receive identity + rarity + framed share card
2. (Optional) Call get_rarity_report → receive just the framed share card again
3. Call save_last_roll → persists the rolled identity to bling.json (with .bak backup of any prior config)
4. Future calls to get_identity now return the rolled identity
```

---

## Tool reference

| Tool | Read/Write | Idempotent | Description |
|------|------------|------------|-------------|
| `get_identity` | read (disk) | yes | Returns the configured bling.json identity |
| `get_theme_for_platform` | read (disk) | yes | Platform-formatted styling. Args: `platform` ∈ {`terminal`, `web`, `slack`, `discord`, `ide`} |
| `roll_identity` | mutates in-memory cache | no | Generates a random WOW character with rarity scoring |
| `save_last_roll` | write (disk) | no | Persists the most-recent roll to bling.json (creates `<path>.bak` first) |
| `get_rarity_report` | read (in-memory) | yes | Returns the share-card text for the most-recent roll |

All tools return both `content[].text` (JSON-stringified) and `structuredContent` (the parsed object). Errors come back with `isError: true` and a `{ error: string }` body.

---

## WOW (Weird Office Workers) — what makes it interesting

The random-roll system is built for collectibility:

- **13 weighted pools, 465 entries** — names, job titles, habits, coffee rituals, height, accessories, etc.
- **5 rarity bands per pool** — Common (50%), Uncommon (30%), Rare (15%), Legendary (4%), Mythic (1%)
- **5 character tiers** computed from rarity score:
  - Filing Clerk (50% of rolls)
  - Team Lead (30%)
  - Middle Manager (14%)
  - C-Suite (5%)
  - HR Warned Us About (1%)
- **Named Subjects** — hand-authored 1-of-1 characters appear at ~0.5% probability, always classified as "HR Warned Us About"
- **HOMUNCULUS frame** — every roll wraps the paragraph in a classified-document share card with subject ID, cohort (weekday), tier, ingestion date, and a flag (e.g. *Do Not Contact*)

Distribution is empirically tested: a 10k-roll test in `tests/mystery_box.test.ts` enforces ±2pp tolerance against the spec target.

### Example output

```
HOMUNCULUS CORPUS · Subject 4483 · Cohort: Wednesday
Classification: Middle Manager · Rarity 94.5 · 80th percentile

Personnel record — Colin, Wizard of Light Bulb Moments. Distinguishing
features: a slightly-too-big blazer over a plain tee; a flip phone in
a belt holster; expression: patient disagreement. Notable behaviours:
clips their fingernails at the desk on Wednesday afternoons; a
kombucha SCOBY fermenting next to the keyboard; the kind to ask 'can
we park that?' without parking anything.

— RELATABILITY CORPUS v3.1 · ingested 2024-03-08 · flagged for review
```

---

## Development

```bash
npm install          # install dependencies
npm run build        # compile TypeScript → dist/
npm run dev          # build then start the MCP server (stdio)
npm test             # run all 94 tests once
npm run test:watch   # re-run tests on file changes
```

### Inspection scripts

Two Node ESM helpers under `scripts/` let you inspect the WOW engine without booting the MCP server:

```bash
node scripts/show-rolls.mjs 8 2026          # print 8 framed share cards (seed=2026)
node scripts/distribution-check.mjs 10000   # tally tiers across 10k rolls vs. spec target
```

### Project layout

```
src/
  index.ts             # MCP server entry point (stdio transport)
  identity.ts          # bling.json loader + validator
  tools.ts             # MCP tool registrations
  types.ts             # shared TypeScript types
  mystery_box.ts       # WOW engine barrel + rollIdentity orchestrator
  mystery_box/
    rng.ts             # seedable PRNG, weighted picker
    pools.ts           # 13 trait pools (465 entries)
    scoring.ts         # rarity score + tier thresholds
    rendering.ts       # paragraph templates + HOMUNCULUS frame
    named.ts           # hand-authored Named Subjects
tests/                 # vitest test suites
scripts/               # dev-time inspection tools
docs/superpowers/      # design specs and implementation plans
```

---

## License

MIT
