# Bling Bag MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local MCP server that reads a bot identity from `bling.json` and serves it via two MCP tools.

**Architecture:** Four source files (types, identity loader, tools, server entry point) using the MCP SDK with stdio transport. TDD throughout — every feature starts with a failing test. Identity is loaded from disk on each tool call so edits are picked up immediately.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `zod` (for MCP tool parameter schemas), `vitest` (test runner)

**Spec:** `docs/superpowers/specs/2026-04-10-bling-bag-mvp.md`

---

## File Map

| File | Responsibility | Created in |
|------|---------------|------------|
| `package.json` | Dependencies, scripts, project metadata | Task 1 |
| `tsconfig.json` | TypeScript compiler config | Task 1 |
| `bling.json` | Example identity file (Chip) | Task 2 |
| `src/types.ts` | `BlingIdentity` interface and `LoadResult` type | Task 3 |
| `tests/fixtures/valid.json` | Valid test identity | Task 4 |
| `tests/fixtures/missing-fields.json` | Identity missing required fields | Task 4 |
| `tests/fixtures/bad-json.txt` | Malformed JSON for error testing | Task 4 |
| `src/identity.ts` | Reads and validates `bling.json` from disk | Task 4 |
| `tests/identity.test.ts` | Tests for identity loading and validation | Task 4 |
| `src/tools.ts` | MCP tool definitions + platform theme helpers | Task 5–6 |
| `tests/tools.test.ts` | Tests for theme generation and tool responses | Task 5–6 |
| `src/index.ts` | MCP server setup, config resolution, startup | Task 7 |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/` directory
- Create: `tests/` directory

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "bling-bag",
  "version": "0.1.0",
  "description": "MCP server that delivers bot identity and visual styling",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": ["mcp", "bot", "identity", "styling"],
  "license": "MIT"
}
```

Note: `"type": "module"` tells Node.js this project uses ESM (modern JavaScript
modules with `import`/`export`) rather than CommonJS (`require`/`module.exports`).

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

Key settings explained:
- `target: ES2022` — compile to modern JavaScript (supports top-level `await`)
- `module: Node16` — use Node.js's native ESM module system
- `outDir: dist` — compiled JavaScript goes into `dist/`
- `rootDir: src` — source TypeScript lives in `src/`
- `strict: true` — catch more bugs at compile time

- [ ] **Step 3: Create directories**

```bash
mkdir -p src tests/fixtures
```

- [ ] **Step 4: Install dependencies**

```bash
npm install @modelcontextprotocol/sdk zod
npm install --save-dev typescript vitest
```

This installs:
- `@modelcontextprotocol/sdk` — the official MCP server framework
- `zod` — schema validation library (the MCP SDK uses it for tool parameter definitions)
- `typescript` — the TypeScript compiler (dev dependency — only needed to build)
- `vitest` — test runner (dev dependency — only needed to run tests)

- [ ] **Step 5: Verify setup compiles**

Create a minimal `src/index.ts` placeholder to test the build:

```typescript
// Placeholder — will be replaced in Task 7
console.log("bling-bag server placeholder");
```

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/index.ts tests/
git commit -m "feat: project scaffolding with dependencies"
```

---

### Task 2: Example Identity File

**Files:**
- Create: `bling.json`

- [ ] **Step 1: Create `bling.json`**

This is the example identity that ships with the project — our friend Chip.

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

- [ ] **Step 2: Commit**

```bash
git add bling.json
git commit -m "feat: add example identity file (Chip)"
```

---

### Task 3: Type Definitions

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write `src/types.ts`**

```typescript
// src/types.ts
// Type definitions for Bling Bag identity data.
// No logic here — just shapes that other files import.

/** How the bot talks — tone, formality, and humor style. */
export interface Personality {
  tone: string;
  formality: string;
  humor: string;
  catchphrase?: string;
  emoji_style?: string;
}

/** What makes the bot memorable — little behavioral quirks. */
export interface Quirks {
  nervous_habit?: string;
  celebration?: string;
  error_reaction?: string;
  secret_talent?: string;
}

/** What the bot looks like — for UIs that render avatars. */
export interface Physical {
  species?: string;
  height?: string;
  accessory?: string;
  expression?: string;
  material?: string;
}

/** The bot's visual styling — colours used across platforms. */
export interface Theme {
  primary_color: string;
  accent_color: string;
}

/** A complete bot identity — the shape of bling.json. */
export interface BlingIdentity {
  name: string;
  avatar_url?: string;
  personality: Personality;
  quirks?: Quirks;
  physical?: Physical;
  theme: Theme;
}

/**
 * Result of loading a bling.json file.
 * Either succeeds with the identity, or fails with an error message.
 * This pattern avoids throwing exceptions — the caller always gets
 * a result they can inspect.
 */
export type LoadResult =
  | { ok: true; identity: BlingIdentity }
  | { ok: false; error: string };
```

Note: `quirks` and `physical` are optional at the top level (the `?` after the
property name). This matches the spec — a minimal bling.json only needs `name`,
`personality`, and `theme`.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add BlingIdentity type definitions"
```

---

### Task 4: Identity Loading (TDD)

**Files:**
- Create: `tests/fixtures/valid.json`
- Create: `tests/fixtures/missing-fields.json`
- Create: `tests/fixtures/bad-json.txt`
- Create: `tests/identity.test.ts`
- Create: `src/identity.ts`

- [ ] **Step 1: Create test fixtures**

`tests/fixtures/valid.json` — a complete valid identity:

```json
{
  "name": "TestBot",
  "personality": {
    "tone": "calm",
    "formality": "formal",
    "humor": "none"
  },
  "theme": {
    "primary_color": "#111111",
    "accent_color": "#222222"
  }
}
```

`tests/fixtures/missing-fields.json` — missing required `personality`:

```json
{
  "name": "Broken Bot",
  "theme": {
    "primary_color": "#111111",
    "accent_color": "#222222"
  }
}
```

`tests/fixtures/bad-json.txt` — not valid JSON:

```
this is { not valid json !!!
```

- [ ] **Step 2: Write failing tests**

`tests/identity.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadIdentity } from "../src/identity.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// __dirname equivalent for ESM modules
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Helper to get the path to a test fixture file
function fixture(name: string): string {
  return join(__dirname, "fixtures", name);
}

describe("loadIdentity", () => {
  it("loads a valid bling.json file", async () => {
    const result = await loadIdentity(fixture("valid.json"));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.name).toBe("TestBot");
      expect(result.identity.personality.tone).toBe("calm");
      expect(result.identity.theme.primary_color).toBe("#111111");
    }
  });

  it("returns an error when the file does not exist", async () => {
    const result = await loadIdentity("/nonexistent/path/bling.json");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("No bling.json found");
    }
  });

  it("returns an error when the file is not valid JSON", async () => {
    const result = await loadIdentity(fixture("bad-json.txt"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("syntax error");
    }
  });

  it("returns an error when required fields are missing", async () => {
    const result = await loadIdentity(fixture("missing-fields.json"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("missing required field");
    }
  });

  it("preserves optional fields when present", async () => {
    const result = await loadIdentity(fixture("valid.json"));

    // valid.json has no optional fields — they should be undefined
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.avatar_url).toBeUndefined();
      expect(result.identity.quirks).toBeUndefined();
      expect(result.identity.physical).toBeUndefined();
    }
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/identity.test.ts`
Expected: FAIL — `Cannot find module '../src/identity.js'`

- [ ] **Step 4: Write `src/identity.ts`**

```typescript
// src/identity.ts
// Reads a bling.json file from disk, validates it, and returns
// a BlingIdentity object. Never throws — always returns a LoadResult.

import { readFile } from "node:fs/promises";
import type { BlingIdentity, LoadResult } from "./types.js";

/**
 * Load and validate a bling.json file from the given path.
 *
 * Returns { ok: true, identity } on success.
 * Returns { ok: false, error } with a helpful message on failure.
 */
export async function loadIdentity(filePath: string): Promise<LoadResult> {
  // Step 1: Read the file
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return {
        ok: false,
        error: `No bling.json found at ${filePath}. Create one to give your bot an identity.`,
      };
    }
    if (isNodeError(err) && err.code === "EACCES") {
      return {
        ok: false,
        error: `Cannot read bling.json at ${filePath}. Check file permissions.`,
      };
    }
    return {
      ok: false,
      error: `Could not read bling.json at ${filePath}: ${String(err)}`,
    };
  }

  // Step 2: Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: `bling.json has a syntax error: check for missing commas or brackets in ${filePath}.`,
    };
  }

  // Step 3: Validate required fields
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {
      ok: false,
      error: `bling.json must be a JSON object, not ${Array.isArray(data) ? "an array" : typeof data}.`,
    };
  }

  const obj = data as Record<string, unknown>;

  // Check top-level required fields
  if (typeof obj.name !== "string") {
    return {
      ok: false,
      error: `bling.json is missing required field: name. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
    };
  }

  // Check personality
  if (typeof obj.personality !== "object" || obj.personality === null) {
    return {
      ok: false,
      error: `bling.json is missing required field: personality. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
    };
  }
  const personality = obj.personality as Record<string, unknown>;
  for (const field of ["tone", "formality", "humor"]) {
    if (typeof personality[field] !== "string") {
      return {
        ok: false,
        error: `bling.json is missing required field: personality.${field}. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
      };
    }
  }

  // Check theme
  if (typeof obj.theme !== "object" || obj.theme === null) {
    return {
      ok: false,
      error: `bling.json is missing required field: theme. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
    };
  }
  const theme = obj.theme as Record<string, unknown>;
  for (const field of ["primary_color", "accent_color"]) {
    if (typeof theme[field] !== "string") {
      return {
        ok: false,
        error: `bling.json is missing required field: theme.${field}. Required fields are: name, personality (tone, formality, humor), theme (primary_color, accent_color).`,
      };
    }
  }

  // All required fields present — return the identity
  return { ok: true, identity: obj as unknown as BlingIdentity };
}

/** Type guard for Node.js errors that have a `code` property. */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/identity.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/identity.ts tests/identity.test.ts tests/fixtures/
git commit -m "feat: identity loading with validation (TDD)"
```

---

### Task 5: Platform Theme Generation (TDD)

**Files:**
- Create: `tests/tools.test.ts` (first half — theme helpers)
- Create: `src/tools.ts` (first half — theme helpers)

- [ ] **Step 1: Write failing tests for theme generation**

`tests/tools.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hexToAnsi, generateThemeForPlatform } from "../src/tools.js";
import type { BlingIdentity } from "../src/types.js";

// A minimal identity for testing theme generation
const testIdentity: BlingIdentity = {
  name: "TestBot",
  personality: { tone: "calm", formality: "formal", humor: "none" },
  theme: { primary_color: "#FF6B35", accent_color: "#004E89" },
};

describe("hexToAnsi", () => {
  it("converts a hex colour to an ANSI 24-bit colour code", () => {
    // #FF6B35 = RGB(255, 107, 53)
    const result = hexToAnsi("#FF6B35");
    expect(result).toBe("\x1b[38;2;255;107;53m");
  });

  it("converts black (#000000)", () => {
    expect(hexToAnsi("#000000")).toBe("\x1b[38;2;0;0;0m");
  });

  it("converts white (#FFFFFF)", () => {
    expect(hexToAnsi("#FFFFFF")).toBe("\x1b[38;2;255;255;255m");
  });
});

describe("generateThemeForPlatform", () => {
  it("generates terminal theme with ANSI codes", () => {
    const result = generateThemeForPlatform(testIdentity, "terminal");

    expect(result.platform).toBe("terminal");
    expect(result).toHaveProperty("primary_ansi");
    expect(result).toHaveProperty("accent_ansi");
    expect(result).toHaveProperty("reset");
    expect(result).toHaveProperty("emoji_prefix");
  });

  it("generates web theme with CSS variables", () => {
    const result = generateThemeForPlatform(testIdentity, "web");

    expect(result.platform).toBe("web");
    expect(result).toHaveProperty("css_variables");

    const css = (result as Record<string, unknown>).css_variables as Record<string, string>;
    expect(css["--bling-primary"]).toBe("#FF6B35");
    expect(css["--bling-accent"]).toBe("#004E89");
    expect(css["--bling-name"]).toBe("TestBot");
  });

  it("generates slack theme", () => {
    const result = generateThemeForPlatform(testIdentity, "slack");

    expect(result.platform).toBe("slack");
    expect(result).toHaveProperty("display_name", "TestBot");
    expect(result).toHaveProperty("sidebar_color", "#FF6B35");
  });

  it("generates discord theme", () => {
    const result = generateThemeForPlatform(testIdentity, "discord");

    expect(result.platform).toBe("discord");
    expect(result).toHaveProperty("display_name", "TestBot");
    expect(result).toHaveProperty("embed_color", "#FF6B35");
  });

  it("generates ide theme", () => {
    const result = generateThemeForPlatform(testIdentity, "ide");

    expect(result.platform).toBe("ide");
    expect(result).toHaveProperty("display_name", "TestBot");
    expect(result).toHaveProperty("primary_color", "#FF6B35");
  });

  it("handles unknown platforms gracefully", () => {
    const result = generateThemeForPlatform(testIdentity, "some_new_platform");

    expect(result.platform).toBe("unknown");
    expect(result).toHaveProperty("requested", "some_new_platform");
    expect(result).toHaveProperty("primary_color", "#FF6B35");
    expect(result).toHaveProperty("message");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tools.test.ts`
Expected: FAIL — `Cannot find module '../src/tools.js'`

- [ ] **Step 3: Write `src/tools.ts` — theme helper functions**

```typescript
// src/tools.ts
// MCP tool definitions and platform theme generation.
// Theme helpers are exported so tests can call them directly.

import type { BlingIdentity } from "./types.js";

/**
 * Convert a hex colour string (e.g. "#FF6B35") to a 24-bit ANSI
 * foreground colour escape code.
 *
 * ANSI 24-bit format: \x1b[38;2;R;G;Bm
 * - 38 = foreground colour
 * - 2 = 24-bit mode
 * - R, G, B = 0-255 colour values
 */
export function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Generate a platform-specific theme object from a bot identity.
 * Each platform gets styling in the format it understands.
 */
export function generateThemeForPlatform(
  identity: BlingIdentity,
  platform: string,
): Record<string, unknown> {
  const { name, theme } = identity;

  switch (platform) {
    case "terminal":
      return {
        platform: "terminal",
        emoji_prefix: "\uD83E\uDD16",
        primary_ansi: hexToAnsi(theme.primary_color),
        accent_ansi: hexToAnsi(theme.accent_color),
        reset: "\x1b[0m",
        suggestion:
          "Use primary colour for headings and accent for highlights",
      };

    case "web":
      return {
        platform: "web",
        css_variables: {
          "--bling-primary": theme.primary_color,
          "--bling-accent": theme.accent_color,
          "--bling-name": name,
        },
      };

    case "slack":
      return {
        platform: "slack",
        display_name: name,
        sidebar_color: theme.primary_color,
        accent_color: theme.accent_color,
      };

    case "discord":
      return {
        platform: "discord",
        display_name: name,
        embed_color: theme.primary_color,
        accent_color: theme.accent_color,
      };

    case "ide":
      return {
        platform: "ide",
        display_name: name,
        primary_color: theme.primary_color,
        accent_color: theme.accent_color,
        suggestion: "Use primary colour for inline markers",
      };

    default:
      return {
        platform: "unknown",
        requested: platform,
        primary_color: theme.primary_color,
        accent_color: theme.accent_color,
        message: "Unknown platform. Here are the raw theme colours.",
      };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/tools.test.ts`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools.ts tests/tools.test.ts
git commit -m "feat: platform theme generation with hex-to-ANSI conversion (TDD)"
```

---

### Task 6: MCP Tool Registration

**Files:**
- Modify: `src/tools.ts` (add `registerTools` function)

This task wires the helper functions from Task 5 into actual MCP tools that a
client can call. No new tests — the tool registration is thin glue code that
calls `loadIdentity` + `generateThemeForPlatform`, both already tested.

- [ ] **Step 1: Add MCP tool registration to `src/tools.ts`**

Add these imports and the `registerTools` function to the top of `src/tools.ts`:

```typescript
// Add to the top of src/tools.ts, below existing imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadIdentity } from "./identity.js";
```

Add this function after the existing `generateThemeForPlatform` function:

```typescript
/**
 * Register the Bling Bag MCP tools on a server instance.
 *
 * @param server - The MCP server to register tools on
 * @param blingPath - Path to the bling.json file to read
 */
export function registerTools(server: McpServer, blingPath: string): void {
  // Tool 1: get_identity
  // Returns the bot's full identity from bling.json
  server.tool(
    "get_identity",
    "Get the bot's full identity — name, personality, quirks, appearance, and theme colours",
    {},
    async () => {
      const result = await loadIdentity(blingPath);

      if (!result.ok) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: result.error }) }],
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result.identity, null, 2) }],
      };
    },
  );

  // Tool 2: get_theme_for_platform
  // Returns styling tailored to a specific platform
  server.tool(
    "get_theme_for_platform",
    "Get platform-specific styling for the bot (terminal, web, slack, discord, or ide)",
    {
      platform: z
        .string()
        .describe("Target platform: terminal, web, slack, discord, or ide"),
    },
    async ({ platform }) => {
      const result = await loadIdentity(blingPath);

      if (!result.ok) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: result.error }) }],
        };
      }

      const theme = generateThemeForPlatform(result.identity, platform);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(theme, null, 2) }],
      };
    },
  );
}
```

- [ ] **Step 2: Verify everything still compiles and tests pass**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Compilation succeeds, all 14 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/tools.ts
git commit -m "feat: register get_identity and get_theme_for_platform as MCP tools"
```

---

### Task 7: Server Entry Point

**Files:**
- Modify: `src/index.ts` (replace placeholder from Task 1)

- [ ] **Step 1: Write `src/index.ts`**

Replace the placeholder with the full server entry point:

```typescript
// src/index.ts
// Bling Bag MCP Server — entry point.
// Creates the server, registers tools, and starts listening on stdio.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolve } from "node:path";
import { registerTools } from "./tools.js";

/**
 * Figure out where bling.json lives.
 * Checks (in order):
 *   1. --bling command-line argument
 *   2. BLING_PATH environment variable
 *   3. ./bling.json in the current working directory
 */
function resolveBlingPath(): string {
  // Check command-line args for --bling /path/to/bling.json
  const args = process.argv;
  const blingArgIndex = args.indexOf("--bling");
  if (blingArgIndex !== -1 && args[blingArgIndex + 1]) {
    return resolve(args[blingArgIndex + 1]);
  }

  // Check BLING_PATH environment variable
  if (process.env.BLING_PATH) {
    return resolve(process.env.BLING_PATH);
  }

  // Default: bling.json in the current working directory
  return resolve("bling.json");
}

// Create the MCP server
const server = new McpServer({
  name: "bling-bag",
  version: "0.1.0",
});

// Find the bling.json file and register tools
const blingPath = resolveBlingPath();
registerTools(server, blingPath);

// Start the server using stdio transport
// (the AI tool launches this process and communicates via stdin/stdout)
const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Build the project**

Run: `npm run build`
Expected: Compiles without errors, creates `dist/` directory with `.js` files

- [ ] **Step 3: Verify the build output exists**

Run: `ls dist/`
Expected: `index.js`, `identity.js`, `tools.js`, `types.js` (plus `.d.ts` files)

- [ ] **Step 4: Run all tests one final time**

Run: `npm test`
Expected: All 14 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: MCP server entry point with bling.json config resolution"
```

---

### Task 8: Integration Test

**Files:** None — this is a manual test with Claude Code.

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 2: Add the server to Claude Code's MCP config**

Add to Claude Code's MCP settings (usually `~/.claude/settings.json` or via `/mcp` command):

```json
{
  "mcpServers": {
    "bling-bag": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/home/tj/projects/bot-styler"
    }
  }
}
```

- [ ] **Step 3: Test `get_identity` in a Claude Code session**

Start a new Claude Code session and ask it to call the `get_identity` tool.
Expected: Returns Chip's full identity as JSON.

- [ ] **Step 4: Test `get_theme_for_platform` in a Claude Code session**

Ask Claude Code to call `get_theme_for_platform` with platform `"terminal"`.
Expected: Returns terminal-specific theme with ANSI codes.

- [ ] **Step 5: Test error handling — rename bling.json temporarily**

```bash
mv bling.json bling.json.bak
```

Call `get_identity` again.
Expected: Returns a helpful error message about missing bling.json.

Restore:
```bash
mv bling.json.bak bling.json
```

- [ ] **Step 6: Final commit — mark MVP complete**

```bash
git add -A
git commit -m "feat: Bling Bag MVP complete — local MCP identity server"
```
