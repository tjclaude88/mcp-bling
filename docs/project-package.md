# Bling Bag — Project Package

**Purpose:** Everything needed to start a new project for the Bling Bag MVP. Self-contained — no need to read the other research files unless you want deeper context.

**Date compiled:** April 8, 2026
**Source:** Bot Bling research (12 files, 120+ sources, 14 research agents across 2 phases + validation)

---

## 1. What Is the Bling Bag?

A cloud service that stores an AI bot's identity (name, colours, personality, avatar) and delivers it to any AI tool via MCP. One identity, many surfaces.

**Think:** Gravatar (which stores your avatar and profile for 70M+ users across 32M+ websites), but for AI bots instead of humans — and richer (visual theme + personality + voice style, not just an avatar).

**The one-liner:** "Your bot's wardrobe in the cloud."

---

## 2. Why This Product?

### The gap
- Nobody sells holistic bot identity. Voice, personality, visual appearance are customised through separate tools. No unified "identity pack" exists.
- Every emerging agent identity standard (A2A Agent Cards, ERC-8004, Cloudflare Web Bot Auth, Microsoft Entra Agent ID) defines agent identity but **none include visual/aesthetic fields.** They handle security identity — who is this agent? Can I trust it? Nobody handles presentation identity — what does this agent look like? How does it present itself?
- No MCP server exists that delivers bot cosmetic identity. The niche is completely empty.

### The timing
- **MCP is the definitive standard:** 97M monthly SDK downloads, supported by Claude, ChatGPT, Cursor, Gemini CLI, VS Code, Windsurf, Replit. Governed by the Linux Foundation. No competing protocol. ([Source](https://www.digitalapplied.com/blog/mcp-97-million-downloads-model-context-protocol-mainstream))
- **AI agent market:** $10.9B in 2026, 45% CAGR. 95% of developers use AI tools weekly. Claude Code is #1 AI coding tool (~$2.5B ARR). ([Source](https://www.demandsage.com/ai-agents-statistics/))
- **Bots are 52% of web traffic** and growing 8x faster than human traffic. ([Source](https://www.cnbc.com/2026/03/26/ai-bots-humans-internet.html))
- **EU AI Act mandates bot identity disclosure** from August 2026 — bots MUST identify themselves. That's a mandatory identity surface that could be styled rather than generic. ([Source](https://artificialintelligenceact.eu/article/50/))
- **Zero competitors** in this exact niche (validated April 8, 2026 with dedicated competitor scan).

### The economics
- People pay for private cosmetics: Wallpaper Engine sold 20-50M copies at $3.99 for something only the user sees. ([Source](https://steamspy.com/app/431960))
- Dracula PRO earned $432k selling terminal themes. ([Source](https://draculatheme.com/pro/journey))
- SuperClaude (Claude.ai theming extension) has 1,000 users paying $4/month — first proof people pay for AI interface cosmetics. ([Source](https://superclaude.app/en))
- Freemium conversion rates: 2.6-5% for self-serve developer tools. ([Source](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/))

---

## 3. How It Works

### The "bot gets dressed" flow

```
1. Developer creates a Bling Bag account and sets up their bot's identity
   (name, colours, personality traits, avatar, platform-specific overrides)

2. Developer configures a "bling-bag" MCP server in their AI tool
   (Claude Code, ChatGPT Desktop, Cursor, Gemini CLI, etc.)

3. At session start, the AI tool connects to the MCP server and calls:
   - get_identity() → returns name, avatar URL, personality, theme tokens
   - get_theme_for_platform("terminal") → returns platform-specific styling

4. The bot "knows who it is" from message #1 — personality shapes its tone,
   theme tokens inform any visual rendering, avatar is available for UIs
```

### Delivery mechanisms (layered)

| Layer | How | When to Use |
|-------|-----|-------------|
| **MCP Server** (primary) | Real-time identity delivery via MCP tools | Claude Code, ChatGPT, Cursor — any MCP-compatible tool |
| **Local file** (fallback) | BLING.md or bling.json read at session start | Offline use, tools that don't support MCP |
| **REST API** | Standard HTTP endpoint | Non-MCP platforms, third-party integrations |
| **Agent memory** (cache) | Bot remembers its identity between sessions | Resilience — works even if server is down |

### Platform-adaptive rendering

The same identity renders differently depending on where the bot is running:

| Platform | How Identity Appears |
|----------|---------------------|
| Terminal (CLI) | ANSI colours, emoji prefixes, ASCII art, text tone |
| Slack | Bot avatar (48px), name, message formatting, app background colour |
| Discord | Avatar, BOT badge, embed colours, rich formatting |
| Web chat | Full CSS (custom fonts, animations, chat bubbles, avatar) |
| IDE (Cursor etc.) | Inline text, markdown, code blocks |

**W3C Design Tokens** (v2025.10 spec) solve this: one token file generates platform-specific output for web (CSS variables), terminal (ANSI codes), Slack (hex colours), etc. Backed by Adobe, Google, Amazon, Microsoft, Meta, Salesforce. ([Source](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/))

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                    BLING BAG CLOUD                    │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Identity    │  │  Asset CDN   │  │  Theme       │ │
│  │  Store       │  │  (avatars,   │  │  Engine      │ │
│  │  (profiles,  │  │   images)    │  │  (design     │ │
│  │   themes,    │  │              │  │   tokens →   │ │
│  │   personality│  │              │  │   platform   │ │
│  │   data)      │  │              │  │   output)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │          │
│  ┌──────┴─────────────────┴─────────────────┴───────┐ │
│  │              Bling Bag REST API                    │ │
│  │         (+ MCP Server endpoint)                   │ │
│  └──────────────────┬───────────────────────────────┘ │
└─────────────────────┼────────────────────────────────┘
                      │
        ┌─────────────┼─────────────────┐
        │             │                 │
   ┌────┴────┐  ┌────┴────┐  ┌────────┴────────┐
   │ MCP     │  │ REST    │  │ Local File      │
   │ Client  │  │ API     │  │ (BLING.md /     │
   │ (Claude,│  │ Client  │  │  bling.json)    │
   │ ChatGPT,│  │ (any    │  │                 │
   │ Cursor) │  │  HTTP)  │  │                 │
   └────┬────┘  └────┬────┘  └────────┬────────┘
        │             │                │
   ┌────┴─────────────┴────────────────┴──────┐
   │          Platform Adapters                │
   │  Terminal │ Slack │ Discord │ Web │ IDE   │
   └───────────────────────────────────────────┘
```

### MVP Components

**1. Identity Store**
- Database: SQLite for MVP (can scale to PostgreSQL later)
- Schema: bot profiles (name, owner), identity versions, personality instructions, theme data
- Versioning: every update creates a new version (rollback support)

**2. Asset CDN**
- S3-compatible storage (Cloudflare R2 is cheapest) for avatar images
- SVG preferred for avatars (infinitely scalable, tiny file size)
- Bot identity assets are tiny — a complete Bling Bag is under 1MB. Even 100K bots = under 50GB total

**3. Theme Engine**
- Accepts W3C Design Tokens format
- Translates to platform-specific output (ANSI for terminal, CSS for web, hex for Slack/Discord)

**4. MCP Server**
- TypeScript using the MCP SDK
- Tools: `get_identity`, `get_theme`, `get_theme_for_platform`, `update_preference`
- Resources: identity profile as an MCP resource
- Runs locally (stdio for Claude Code) or remotely (Streamable HTTP)

**5. REST API**
- Standard endpoints: `GET /v1/bots/{id}/identity`, `GET /v1/bots/{id}/theme`, etc.
- MVP auth: API keys (one per user, scoped to their bots)
- Future auth: OAuth 2.1 + PKCE (aligning with MCP Authorization Spec)

### Example API Response

```json
{
  "name": "Chip",
  "avatar_url": "https://cdn.blingbag.io/avatars/chip-512.png",
  "personality": {
    "tone": "cheerful",
    "formality": "casual",
    "humor": "dry"
  },
  "theme": {
    "primary_color": "#FF6B35",
    "accent_color": "#004E89"
  },
  "platform_overrides": {
    "terminal": { "emoji_prefix": "🤖", "color_scheme": "dracula" },
    "slack": { "avatar_url": "https://cdn.blingbag.io/avatars/chip-slack-48.png" },
    "web": { "css_variables": { "--bot-primary": "#FF6B35" } }
  }
}
```

---

## 5. Business Model

### Pricing

| Tier | Price | What You Get |
|------|-------|-------------|
| **Free** | $0 | 1 bot identity, basic themes, MCP server access |
| **Pro** | $5/month | 3 bot identities, premium themes, analytics, priority sync |
| **Team** | $15/month | Unlimited bots, organisation-wide identity management |

### Revenue Projections (Year 1 — honest)

| Scenario | Free Users | Conversion | Paying Users | MRR |
|----------|-----------|------------|-------------|-----|
| Bear | 200 | 2% | 4 | $20 |
| Base | 1,000 | 3% | 30 | $150 |
| Bull | 5,000 | 5% | 250 | $1,250 |

**Reality check:** 54% of indie products make $0. Plan for $0-2,000 in Year 1 revenue. This is validation and brand building, not income generation. ([Source](https://calmops.com/indie-hackers/what-is-an-indie-hacker-complete-guide-2025/))

### Distribution Strategy

1. **Free Claude Code plugin** in the marketplace (9,000+ plugins, primary discovery channel) — the plugin connects to the Bling Bag service
2. **npm package** for the MCP server (`npm install bling-bag`)
3. **GitHub repo** (open-source the MCP server core for credibility)
4. **Product Hunt / Show HN launch** when ready
5. **Payment via Polar.sh** (4% + $0.40/txn, lowest fees, developer-focused)

---

## 6. Precedents & Comparisons

| Precedent | What It Proves | How Bling Bag Differs |
|-----------|---------------|----------------------|
| **Gravatar** (70M+ users) | Cloud-hosted identity that follows you across platforms works at scale | Gravatar is for humans and avatar-only. Bling Bag is for bots and includes personality + visual theme |
| **unavatar.io** (728M avatars/month) | URL-based identity resolution at massive scale with simple API | Similar pattern — `blingbag.io/bot/my-bot` returns identity data |
| **Dracula PRO** ($432k) | Developers pay for premium themes when bundled with extras | Bling Bag bundles personality + theme + avatar, not just colours |
| **SuperClaude** (1K users, $4/month) | People pay for AI interface cosmetics | SuperClaude is web-only. Bling Bag is cross-platform |
| **SOUL.md** (emerging standard) | Demand for portable bot personality files | SOUL.md is personality-only, no visual identity. Bling Bag includes both |
| **Ready Player Me** (25K devs before shutdown) | Cross-platform identity has demand but business model is hard | RPM was for gaming avatars. Bling Bag targets AI tools — smaller market but less competition |

---

## 7. Competitive Landscape (as of April 8, 2026)

**Direct competitors: NONE.** No MCP-delivered bot cosmetic identity product exists.

**Adjacent players:**

| Player | What They Do | Threat Level |
|--------|-------------|-------------|
| SOUL.md / OpenClaw | Personality files for AI agents (no visual identity) | Low — complementary, not competing |
| Molt.id | Agent identity NFT on Solana (crypto-native only) | Low — different market |
| Moltbook (acquired by Meta) | Bot social network (not identity tools) | Low-Medium — Meta could build identity features but unlikely to target dev tools |
| TweakCC | Claude Code visual patching (free, open source) | Low — different approach, could be partner |
| SuperClaude | Claude.ai theming extension ($4/month) | Low — web-only, not cross-platform |
| A1Base (YC W25) | Communication identity for agents (phone, email) | Low — infrastructure, not cosmetics |

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Nobody pays for bot identity | Medium-High | High | Start free, measure demand before investing in paid features |
| Anthropic/Google build native theming | Medium | High | Be cross-platform — no single platform builds for competitors' agents |
| MCP security concerns | Low-Medium | Medium | Implement OAuth 2.1 from launch. Security as differentiator |
| SOUL.md captures personality market | Medium | Low | Adopt SOUL.md format for compatibility. Add visual layer they don't have |
| Platform absorption of basic theming | Already happening | Medium | Offer richer identity (personality + visual + voice) beyond what platforms build in |

---

## 9. Tech Stack Recommendation

| Component | Recommended | Why |
|-----------|------------|-----|
| MCP Server | TypeScript + MCP SDK (`@modelcontextprotocol/sdk`) | Official SDK, best documented, tutorials show servers built in <20 minutes |
| API | Node.js (Express or Hono) | Same language as MCP server, simple, well-documented |
| Database | SQLite (MVP) → PostgreSQL (scale) | Zero config for MVP, easy migration later |
| Asset storage | Cloudflare R2 | S3-compatible, cheapest, generous free tier |
| CDN | Cloudflare (bundled with R2) | Global, fast, free tier |
| Hosting | Railway or Fly.io | Simple deployment, cheap, good DX |
| Payments | Polar.sh | 4% + $0.40/txn, developer-focused, MoR (handles taxes) |
| Auth (MVP) | API keys | Simplest possible. One key per user. |
| Auth (v2) | OAuth 2.1 + PKCE | Aligns with MCP Authorization Spec |

---

## 10. Key Research Sources

These are the most important sources specifically relevant to the Bling Bag. The full research library has 120+ sources.

**MCP & Delivery:**
- [MCP 97M downloads](https://www.digitalapplied.com/blog/mcp-97-million-downloads-model-context-protocol-mainstream) — MCP adoption data
- [MCP donated to Linux Foundation](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation) — Governance and longevity
- [MCP build server tutorial](https://www.termdock.com/en/blog/build-first-mcp-server-claude-code) — Shows MCP servers built in <20 minutes
- [MCP Authorization Spec](https://aembit.io/blog/mcp-oauth-2-1-pkce-and-the-future-of-ai-authorization/) — OAuth 2.1 + PKCE for agent auth
- [W3C Design Tokens v2025.10](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/) — Cross-platform theming standard

**Market & Demand:**
- [AI agents market $10.9B](https://www.demandsage.com/ai-agents-statistics/) — Market size and growth
- [Bots 52% of web traffic](https://www.cnbc.com/2026/03/26/ai-bots-humans-internet.html) — Agent visibility
- [EU AI Act Article 50](https://artificialintelligenceact.eu/article/50/) — Mandatory bot identity disclosure
- [Gravatar Profiles-as-a-Service](https://blog.gravatar.com/2024/06/03/profiles-as-a-service/) — Closest precedent
- [unavatar.io](https://unavatar.io/) — URL-based avatar resolution at 728M/month

**Pricing & Distribution:**
- [Freemium conversion rates](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/) — 2.6-5% benchmark
- [Polar.sh](https://polar.sh/docs/introduction) — Payment platform (4% + $0.40)
- [Dracula PRO journey](https://draculatheme.com/pro/journey) — $432k from developer themes
- [Claude Code plugin docs](https://code.claude.com/docs/en/discover-plugins) — Distribution channel
- [54% of indie products make $0](https://calmops.com/indie-hackers/what-is-an-indie-hacker-complete-guide-2025/) — Reality check

**Competitors & Adjacent:**
- [SOUL.md pattern](https://moto-westai.github.io/blog/2026/02/21/the-soul-md-pattern/) — Emerging personality standard
- [SuperClaude](https://superclaude.app/en) — First monetised AI theming product
- [TweakCC](https://github.com/Piebald-AI/tweakcc) — Claude Code visual customisation (1.6K stars)
- [Meta acquires Moltbook](https://www.cnn.com/2026/03/10/tech/meta-moltbook-bots-social-media) — Big tech interest in bot identity

---

## 11. What This Package Does NOT Include

- The full 25 product ideas catalogue (see `02-product-ideas.md` if needed)
- Detailed gaming cosmetics economics (see `01-landscape.md`)
- Full blockchain analysis (see `04-blockchain-angles.md`)
- Detailed terminal theme market analysis (see `08-terminal-and-cosmetics-market.md`)
- AI interface surface map for every platform (see `09-ai-interface-surfaces.md`)
- Bot purchasing and NFT marketplace details (see `07-bot-purchasing.md`)
- Full reference library of 120+ sources (see `05-references.md`)

All of these live in `/home/tj/projects/bot-bling/research/` if you need to go deeper.
