#!/usr/bin/env node
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
