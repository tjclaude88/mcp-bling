# Security Policy

Thank you for helping keep `bling-bag` and its users safe.

## Reporting a vulnerability

If you believe you've found a security issue in `bling-bag`, **please do not open a public GitHub issue**.

Instead, email `tjclaude@proton.me` with:

- A short description of the issue
- Steps to reproduce
- The affected version (e.g. `bling-bag@0.1.0`)
- Any relevant logs, configs, or proof-of-concept material

You should receive an acknowledgement within a few days. Please allow reasonable time for a fix before public disclosure.

## Scope

`bling-bag` is an MCP server that reads local configuration (`bling.json`) and returns identity/styling data over the stdio transport. It does **not**:

- Accept network input
- Store secrets or credentials
- Execute user-supplied code at runtime
- Persist state beyond the configured `bling.json` file

The relevant security considerations are therefore:

- **Config-file integrity** — `bling.json` is read from the local filesystem; malformed input is rejected with structured errors
- **Dependency vulnerabilities** — we run `npm audit` before each release
- **Denial-of-service via malformed requests** — the server surfaces protocol-level errors back to the MCP client rather than crashing

If you believe an issue exists outside this scope but still warrants attention, please report it anyway — we'd rather hear about it.

## Supported versions

The latest published version receives security fixes. Older versions are not patched; please upgrade if affected.
