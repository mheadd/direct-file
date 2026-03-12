#!/usr/bin/env node

/**
 * PROTOTYPE — IRS Direct File MCP Server
 *
 * This is a proof-of-concept MCP (Model Context Protocol) server that exposes
 * the IRS Direct File tax filing system as a set of tools, resources, and
 * prompts that an AI agent can use to help a taxpayer file their federal
 * tax return through a conversational interface.
 *
 * ⚠️  PROTOTYPE ONLY — NOT FOR PRODUCTION USE ⚠️
 *
 * This prototype:
 *  - Does NOT enforce real identity verification (IAL2/SADI)
 *  - Does NOT implement PII encryption at the transport layer
 *  - Does NOT provide audit logging required for FTI handling
 *  - Does NOT have the error handling, retry logic, or resilience
 *    expected of a production tax filing system
 *  - Is intended to demonstrate feasibility of the MCP architecture
 *    pattern against a locally-running Direct File backend
 *
 * Usage:
 *   # Start with stdio transport (default — for use with MCP clients)
 *   node dist/index.js
 *
 *   # Override backend URL and auth headers via environment variables
 *   DIRECT_FILE_API_URL=http://localhost:8080 \
 *   DIRECT_FILE_USER_ID=test-user-uuid \
 *     node dist/index.js
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DirectFileApiClient } from "./api-client.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

// ---------------------------------------------------------------------------
// Configuration from environment
// ---------------------------------------------------------------------------

const API_URL = process.env.DIRECT_FILE_API_URL ?? "http://localhost:8080";
const USER_ID = process.env.DIRECT_FILE_USER_ID ?? "00000000-0000-0000-0000-000000000000";

// Headers the identity proxy would normally inject.
// For local development with the CSP simulator these are passed through.
const authHeaders: Record<string, string> = {
  SM_UNIVERSALID: USER_ID,
};

// Allow additional custom headers via env var (JSON-encoded)
if (process.env.DIRECT_FILE_EXTRA_HEADERS) {
  try {
    const extra = JSON.parse(process.env.DIRECT_FILE_EXTRA_HEADERS);
    if (typeof extra === "object" && extra !== null) {
      Object.assign(authHeaders, extra);
    }
  } catch {
    console.error(
      "Warning: DIRECT_FILE_EXTRA_HEADERS is not valid JSON, ignoring."
    );
  }
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

async function main() {
  const server = new McpServer({
    name: "direct-file",
    version: "0.1.0",
    description: [
      "PROTOTYPE — IRS Direct File MCP Server.",
      "Exposes the Direct File federal tax filing system as MCP tools, resources, and prompts.",
      "Connects to a locally-running Direct File backend API.",
      "",
      "⚠️  This is a proof-of-concept and is NOT suitable for production tax filing.",
    ].join("\n"),
  });

  // Create the API client
  const api = new DirectFileApiClient(API_URL, authHeaders);

  // Register all MCP primitives
  registerTools(server, api);
  registerResources(server);
  registerPrompts(server);

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`Direct File MCP Server (PROTOTYPE) started`);
  console.error(`  Backend API: ${API_URL}`);
  console.error(`  User ID:     ${USER_ID}`);
  console.error(`  Transport:   stdio`);
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
