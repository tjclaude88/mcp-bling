# Changelog

All notable changes to `bling-bag` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [0.1.1] — 2026-04-21

Metadata-only release to list `bling-bag` on the official MCP Registry
(`registry.modelcontextprotocol.io`).

### Added

- `mcpName` field in `package.json` (`io.github.tjclaude88/bling-bag`) — required
  by the MCP Registry for namespace ownership verification against the npm package

## [0.1.0] — 2026-04-19

First public release.

### Added

- Five MCP tools: `get_identity`, `get_theme_for_platform`, `roll_identity`, `save_last_roll`, `get_rarity_report`
- Identity schema with `name`, `personality`, `theme`, plus optional `physical`, `office`, and `homunculus` sections
- Platform-specific styling for `terminal`, `web`, `slack`, `discord`, and `ide`
- WOW (Weird Office Workers) random-identity engine with 13 weighted trait pools (465 entries total)
- Five rarity tiers — Filing Clerk (50%), Team Lead (30%), Middle Manager (14%), C-Suite (5%), HR Warned Us About (1%) — calibrated against a 10k-roll empirical distribution with ±2pp tolerance
- Hand-authored Named Subjects (1-of-1 characters) at ~0.5% probability
- HOMUNCULUS-frame share cards suitable for direct screenshotting
- Structured-error responses with recovery hints for agents
- Safe `save_last_roll` — backs up any prior `bling.json` to `bling.json.bak` before overwriting
- Full TypeScript type declarations published alongside compiled output
