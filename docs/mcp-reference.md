# MCP Reference — Relevant Bits for MCP Bling

Compiled from official MCP docs on 2026-04-13. This is a focused cheat-sheet —
only things that matter for *this* project (a stdio MCP server exposing tools).
For anything not covered here, go to the source links at the bottom.

---

## 1. What MCP is, in one sentence

MCP is an open protocol that lets AI clients (Claude Code, Claude Desktop,
Cursor, ChatGPT, VS Code, etc.) talk to external servers using a standard
JSON-RPC message format — so you build a server once and every MCP-aware client
can use it.

The official analogy: **MCP is like USB-C for AI apps.** Same plug, many devices.

## 2. The three server primitives

An MCP server can expose up to three things:

| Primitive     | What it is                                               | Do we use it? |
|---------------|----------------------------------------------------------|---------------|
| **Tools**     | Functions the AI can call (with user approval)           | ✅ yes — 2 tools |
| **Resources** | File-like data the AI can read (docs, DB rows, API data) | ❌ not yet     |
| **Prompts**   | Pre-built prompt templates the user can invoke           | ❌ not yet     |

Our current scope is tools-only. Resources could be useful later (e.g. expose
the full bling.json as a readable resource); prompts could give users a
"/chip-roleplay" template.

## 3. Transports

| Transport | How it communicates        | When to use                              |
|-----------|----------------------------|------------------------------------------|
| **stdio** | stdin/stdout of a process  | ✅ local servers — what we use           |
| HTTP      | HTTP requests              | Remote/cloud servers                     |
| SSE       | Server-Sent Events         | ⚠️ Deprecated — use HTTP instead         |

**We use stdio.** The client launches our server as a subprocess and talks over
its stdin/stdout. No ports, no network.

## 4. The stdout rule — MOST IMPORTANT GOTCHA

> **Never write to stdout in a stdio MCP server. Ever.**

Stdout is the protocol channel. Any stray output (a debug `console.log`, a
`print`, an uncaught log from a library) corrupts the JSON-RPC stream and the
client's connection will silently break.

**Rules for our code:**

- ✅ Use `console.error(...)` — that writes to stderr, which is safe
- ❌ Never use `console.log(...)` anywhere in `src/`
- ❌ Be wary of libraries that log to stdout by default — check before adding them

We audited `src/` on 2026-04-13: **zero `console.` calls**. Good. Keep it that
way; if you ever need diagnostics, use `console.error`.

## 5. Tool design best practices

From the reference servers (filesystem, git, memory, etc.) and SDK docs:

1. **Descriptions are the tool's UX.** The AI decides when to call a tool based
   on its `description` field. Vague descriptions = unused tools. Our current
   descriptions should be action-focused and specific (e.g. "Get the bot's
   identity including name, personality, quirks, and physical description" not
   just "Get identity").

2. **Use Zod schemas for inputs.** The SDK turns Zod schemas into JSON Schema
   for the AI to see. We're already doing this in `src/tools.ts`.

3. **Return errors, don't throw them.** Throwing crashes the server; returning
   a structured error response lets the AI react and try something else. Typical
   pattern:
   ```ts
   return {
     content: [{ type: "text", text: `Error: bling.json not found` }],
     isError: true,
   };
   ```

4. **Keep tools narrow.** One tool per question. We already split identity and
   theme into two tools — that's the right instinct. Don't bundle unrelated
   operations.

## 6. Claude Code — registering and managing MCP servers

### The `claude mcp` commands we care about

```bash
# Register a stdio server (user scope = available everywhere)
claude mcp add bling -s user -- node /path/to/dist/index.js

# List registered servers and their health
claude mcp list

# See full config for one server
claude mcp get bling

# Remove a server
claude mcp remove bling
```

### Scopes — where the config is stored

| Scope       | Loads in              | Shared? | Stored in                   |
|-------------|-----------------------|---------|-----------------------------|
| **local**   | Current project only  | No      | `~/.claude.json`            |
| **project** | Current project only  | Yes (via git) | `.mcp.json` in project root |
| **user**    | All your projects     | No      | `~/.claude.json`            |

**We used `user` scope** — so Chip is available everywhere on this VPS.
If/when MCP Bling has other users, we'd add `.mcp.json` at **project** scope
so everyone gets it automatically.

**Precedence when scopes conflict (same server name):** local > project > user.

### Debugging tips

- `claude mcp list` shows `✓ Connected` or an error — first place to look
- If a server won't connect, run it manually: `node dist/index.js` and type
  a JSON-RPC message by hand (advanced — usually the error is a stdout
  pollution issue or a missing build)
- Run `/mcp` inside Claude Code for interactive server status

## 7. Reference servers worth reading

All in https://github.com/modelcontextprotocol/servers:

| Server | Why read it |
|--------|-------------|
| **Everything** | Demonstrates all three primitives (tools + resources + prompts) in one place |
| **Filesystem** | Shows how to handle secure tool patterns with access restrictions |
| **Time** | Small and simple — closest in scope to our project |
| **Memory** | If we ever want persistent state between sessions, this is the pattern |

## 8. Our code, against these best practices

| Practice                              | Status |
|---------------------------------------|--------|
| Uses stdio transport                   | ✅ |
| No stdout pollution (`console.log`)    | ✅ |
| Zod input schemas                      | ✅ |
| Returns errors instead of throwing     | ✅ (in identity.ts / tools.ts) |
| Narrow, single-purpose tools           | ✅ (get_identity, get_theme_for_platform) |
| Clear tool descriptions                | ⚠️ Worth a re-read before merging |
| Uses resources                         | ❌ Not yet — possible future work |
| Uses prompts                           | ❌ Not yet — possible future work |

## 9. Sources

- **MCP intro + concepts**: https://modelcontextprotocol.io/introduction
- **Build an MCP server tutorial**: https://modelcontextprotocol.io/docs/develop/build-server
- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Reference server implementations**: https://github.com/modelcontextprotocol/servers
- **Claude Code MCP docs**: https://code.claude.com/docs/en/mcp

---

*Keep this doc updated when you hit a gotcha or learn a pattern worth remembering.*
