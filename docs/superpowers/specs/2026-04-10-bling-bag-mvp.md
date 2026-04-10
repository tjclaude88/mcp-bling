# Bling Bag MVP — Spec

> **What this is:** A formal spec for the first working version of Bling Bag.
> Everything here was approved during the brainstorming session on April 8, 2026.
> This is the "Option A: Hello, I'm Chip" design — a local MCP server, no cloud.

---

## Goal

Build a local MCP server that reads a bot's identity from a `bling.json` file on
disk and serves it to any MCP-compatible AI tool (Claude Code, Gemini CLI, etc.).

The bot knows who it is from message #1. One file, one server, one identity.

---

## How It Works

```
1. Developer creates a bling.json file describing their bot
   (name, personality, quirks, appearance, colours)

2. Developer configures the Bling Bag MCP server in their AI tool
   (e.g. adds it to Claude Code's MCP server config)

3. When the AI tool starts a session, it connects to the MCP server

4. The AI tool calls get_identity() → gets the full identity
   Or calls get_theme_for_platform("terminal") → gets platform-specific styling

5. The bot "knows who it is" and behaves accordingly
```

No cloud. No database. No auth. No network calls.
The server reads a local file and serves it over MCP's stdio transport.

---

## Identity Schema

This is the shape of `bling.json` — the file that defines a bot's identity.

```typescript
interface BlingIdentity {
  // Who the bot is
  name: string;                    // Display name (e.g. "Chip")
  avatar_url?: string;             // URL or local path to avatar image

  // How the bot talks
  personality: {
    tone: string;                  // e.g. "cheerful", "sarcastic", "calm"
    formality: string;             // e.g. "casual", "formal", "mixed"
    humor: string;                 // e.g. "dry", "punny", "none"
    catchphrase?: string;          // e.g. "Let's rock and roll!"
    emoji_style?: string;          // e.g. "heavy", "minimal", "none"
  };

  // What makes the bot memorable
  quirks: {
    nervous_habit?: string;        // e.g. "adds excessive ellipses..."
    celebration?: string;          // e.g. "does a little ASCII dance"
    error_reaction?: string;       // e.g. "apologises profusely"
    secret_talent?: string;        // e.g. "surprisingly good at haiku"
  };

  // What the bot looks like (for UIs that render avatars)
  physical: {
    species?: string;              // e.g. "robot", "cat", "blob"
    height?: string;               // e.g. "tiny", "average", "towering"
    accessory?: string;            // e.g. "top hat", "sunglasses"
    expression?: string;           // e.g. "perpetual grin", "thoughtful"
    material?: string;             // e.g. "brushed metal", "soft plush"
  };

  // How the bot looks (colours and visual styling)
  theme: {
    primary_color: string;         // Hex colour (e.g. "#FF6B35")
    accent_color: string;          // Hex colour (e.g. "#004E89")
  };
}
```

### Schema Rules

- Three top-level fields are required: `name`, `personality`, and `theme`
- Inside `personality`, three fields are required: `tone`, `formality`, `humor`
- Inside `theme`, two fields are required: `primary_color`, `accent_color`
- Everything else is optional — a minimal `bling.json` needs just 6 fields
- Unknown fields are ignored (forward-compatible for future versions)

---

## MCP Tools

The server exposes two tools via MCP. Tools are functions that an AI tool can
call to get data from the server.

### Tool 1: `get_identity`

**Purpose:** Returns the bot's full identity — everything in `bling.json`.

**Input:** None (no parameters).

**Output:** The complete `BlingIdentity` object as JSON.

**When to use:** At session start, so the bot knows who it is. Also useful if the
bot needs to reference its own traits mid-conversation.

**Example response:**

```json
{
  "name": "Chip",
  "avatar_url": "https://example.com/chip.png",
  "personality": {
    "tone": "cheerful",
    "formality": "casual",
    "humor": "dry",
    "catchphrase": "Let's rock and roll!",
    "emoji_style": "moderate"
  },
  "quirks": {
    "nervous_habit": "adds excessive ellipses...",
    "celebration": "does a little ASCII dance",
    "error_reaction": "apologises profusely",
    "secret_talent": "surprisingly good at haiku"
  },
  "physical": {
    "species": "robot",
    "height": "tiny",
    "accessory": "top hat",
    "expression": "perpetual grin",
    "material": "brushed metal"
  },
  "theme": {
    "primary_color": "#FF6B35",
    "accent_color": "#004E89"
  }
}
```

### Tool 2: `get_theme_for_platform`

**Purpose:** Returns styling instructions tailored to a specific platform.

**Input:**

| Parameter  | Type   | Required | Description                                    |
|------------|--------|----------|------------------------------------------------|
| `platform` | string | Yes      | One of: `"terminal"`, `"web"`, `"slack"`, `"discord"`, `"ide"` |

**Output:** A platform-specific styling object derived from the bot's theme.

**Platform outputs:**

For `"terminal"`:
```json
{
  "platform": "terminal",
  "emoji_prefix": "🤖",
  "primary_ansi": "\u001b[38;2;255;107;53m",
  "accent_ansi": "\u001b[38;2;0;78;137m",
  "reset": "\u001b[0m",
  "suggestion": "Use primary colour for headings and accent for highlights"
}
```

For `"web"`:
```json
{
  "platform": "web",
  "css_variables": {
    "--bling-primary": "#FF6B35",
    "--bling-accent": "#004E89",
    "--bling-name": "Chip"
  }
}
```

For `"slack"`:
```json
{
  "platform": "slack",
  "display_name": "Chip",
  "sidebar_color": "#FF6B35",
  "accent_color": "#004E89"
}
```

For `"discord"`:
```json
{
  "platform": "discord",
  "display_name": "Chip",
  "embed_color": "#FF6B35",
  "accent_color": "#004E89"
}
```

For `"ide"`:
```json
{
  "platform": "ide",
  "display_name": "Chip",
  "primary_color": "#FF6B35",
  "accent_color": "#004E89",
  "suggestion": "Use primary colour for inline markers"
}
```

**Unknown platforms:** If the platform string doesn't match any known platform,
return the raw theme colours with a helpful message:

```json
{
  "platform": "unknown",
  "requested": "some_new_platform",
  "primary_color": "#FF6B35",
  "accent_color": "#004E89",
  "message": "Unknown platform. Here are the raw theme colours."
}
```

---

## File Structure

Four source files, each with one job:

```
bot-styler/
  src/
    index.ts       # MCP server setup and startup
    tools.ts       # Tool definitions (get_identity, get_theme_for_platform)
    identity.ts    # Reads and validates bling.json from disk
    types.ts       # TypeScript type definitions (BlingIdentity, etc.)
  tests/
    identity.test.ts   # Tests for identity loading and validation
    tools.test.ts      # Tests for tool responses
  bling.json           # Example identity file (Chip)
  package.json
  tsconfig.json
```

### What each file does

- **`types.ts`** — Defines the `BlingIdentity` interface and any related types.
  No logic, just shapes. Everything else imports from here.

- **`identity.ts`** — Exports a function that reads `bling.json` from a given
  path, parses it, validates it against the schema, and returns a `BlingIdentity`
  object. If the file is missing or invalid, returns a clear error (never throws).

- **`tools.ts`** — Defines the two MCP tools (`get_identity` and
  `get_theme_for_platform`). Each tool calls into `identity.ts` to get the data,
  then formats the response. The platform theme logic (hex → ANSI, hex → CSS, etc.)
  lives here.

- **`index.ts`** — Creates the MCP server instance, registers the tools from
  `tools.ts`, and starts the server using stdio transport. This is the entry point.

---

## Error Handling

The server must never crash. Every error produces a helpful message.

### Scenarios

| Scenario | What happens |
|----------|-------------|
| `bling.json` not found | Tool returns: `{ "error": "No bling.json found at [path]. Create one to give your bot an identity." }` |
| `bling.json` is invalid JSON | Tool returns: `{ "error": "bling.json has a syntax error: [details]. Check for missing commas or brackets." }` |
| Required fields missing | Tool returns: `{ "error": "bling.json is missing required field: [field]. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color)." }` |
| `get_theme_for_platform` with unknown platform | Returns raw colours with a message (not an error — see tool spec above) |
| File read permission denied | Tool returns: `{ "error": "Cannot read bling.json at [path]. Check file permissions." }` |
| Server startup with no config | Looks for `bling.json` in the current working directory by default |

### Error Design Principles

1. **Never crash** — return an error object, not an exception
2. **Always explain** — tell the user what went wrong AND how to fix it
3. **Be specific** — include the actual file path, the actual missing field, the actual parse error
4. **Be kind** — this is a beginner's first MCP server, so error messages should be encouraging

---

## Configuration

### How the server finds `bling.json`

The server looks for `bling.json` in this order:

1. Path passed as a command-line argument (e.g. `node dist/index.js --bling /path/to/bling.json`)
2. `BLING_PATH` environment variable
3. `./bling.json` in the current working directory

If none of these produce a valid file, the server still starts but tools return
a helpful error explaining how to create a `bling.json`.

---

## Example `bling.json`

This ships with the project as a working example:

```json
{
  "name": "Chip",
  "avatar_url": "https://example.com/chip.png",
  "personality": {
    "tone": "cheerful",
    "formality": "casual",
    "humor": "dry",
    "catchphrase": "Let's rock and roll!",
    "emoji_style": "moderate"
  },
  "quirks": {
    "nervous_habit": "adds excessive ellipses...",
    "celebration": "does a little ASCII dance",
    "error_reaction": "apologises profusely",
    "secret_talent": "surprisingly good at haiku"
  },
  "physical": {
    "species": "robot",
    "height": "tiny",
    "accessory": "top hat",
    "expression": "perpetual grin",
    "material": "brushed metal"
  },
  "theme": {
    "primary_color": "#FF6B35",
    "accent_color": "#004E89"
  }
}
```

---

## What's NOT in the MVP

These are all real features from the full product vision. They're deferred, not
rejected. Each one builds on this MVP.

| Feature | Why it's deferred |
|---------|------------------|
| Cloud storage | MVP proves the concept locally first |
| Database (SQLite/PostgreSQL) | No persistence needed — just reads a file |
| REST API | MCP is the delivery mechanism for now |
| Authentication | No cloud = no auth needed |
| Mystery box / randomiser | Fun feature, but adds scope — needs the basic server working first |
| NFTs / blockchain | Decided against for MVP. Can get uniqueness via database later |
| Platform-specific avatar sizes | MVP returns one avatar URL. Resizing is a future feature |
| W3C Design Tokens format | Full token spec is complex. MVP uses simple hex colours |
| Multiple bot identities | MVP supports one `bling.json` = one bot |
| SOUL.md compatibility | Interesting integration but not needed for v1 |
| Identity versioning / rollback | No persistence = no versioning |

---

## Success Criteria

The MVP is done when:

1. **Server starts** — `npm run dev` launches the MCP server without errors
2. **Identity loads** — `get_identity()` returns the contents of `bling.json`
3. **Theme works** — `get_theme_for_platform("terminal")` returns ANSI colour codes
4. **Errors are graceful** — Missing/broken `bling.json` returns a helpful message, not a crash
5. **Tests pass** — All tests in `tests/` pass with `npm test`
6. **Claude Code integration** — The server can be added to Claude Code's MCP config and called in a real session
7. **It's fun** — Chip (or any bot) actually feels like a character when the identity loads

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | Official MCP SDK — provides server framework and tool registration |
| `typescript` | Language (compiles to JavaScript) |
| `vitest` | Test runner (fast, modern, works well with TypeScript) |

That's it. Three dependencies. The MCP SDK does the heavy lifting.

---

## Transport

The MVP uses **stdio transport** — the simplest MCP transport. This means:

- The AI tool (e.g. Claude Code) launches the server as a child process
- Communication happens over stdin/stdout (like piping data between programs)
- No HTTP, no ports, no networking
- This is how most MCP servers work with Claude Code

The server is configured in the AI tool's MCP settings. For Claude Code, that
looks like:

```json
{
  "mcpServers": {
    "bling-bag": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/bot-styler"
    }
  }
}
```
