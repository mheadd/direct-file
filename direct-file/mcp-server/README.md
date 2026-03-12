# IRS Direct File — MCP Server (PROTOTYPE)

> **PROTOTYPE ONLY — NOT FOR PRODUCTION USE**
>
> This is a proof-of-concept demonstrating how the IRS Direct File tax filing system could be exposed through the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). It is not a production system and must not be used for actual tax filing.

## What This Is

This MCP server wraps the existing Direct File Spring Boot backend API, exposing tax-return operations as tools, reference data as resources, and guided workflows as prompts that an AI agent (e.g., Claude, GPT, or any MCP-compatible client) can use to help a taxpayer file their federal return through a conversational interface.

### Architecture

```
┌──────────────────┐     stdio / SSE     ┌──────────────────┐     HTTP/REST     ┌──────────────────┐
│   MCP Client     │ ◄─────────────────► │  MCP Server      │ ◄──────────────►  │  Direct File     │
│  (AI Agent)      │                     │  (this project)  │                   │  Backend API     │
└──────────────────┘                     └──────────────────┘                   └──────────────────┘
```

The MCP server is a*thin adapter layer — it does not duplicate business logic. All tax calculations, validation, and persistence remain in the existing backend and Fact Graph engine.

## What's Included

### Tools (10)

| Tool | Description |
|:------|:-------------|
| `create_tax_return` | Create a new tax return for the authenticated taxpayer |
| `get_tax_return` | Retrieve a tax return and its current facts |
| `list_tax_returns` | List all tax returns for the current user |
| `set_fact` | Set one or more facts on a tax return (typed wrappers) |
| `get_fact` | Read specific fact values from a tax return |
| `sign_tax_return` | Electronically sign a completed return |
| `submit_tax_return` | Submit a signed return for e-filing |
| `get_submission_status` | Check the status of a submitted return |
| `import_tax_data` | Import pre-populated IRS data (W-2s, 1099s, etc.) |
| `get_user_info` | Get authenticated user information |

### Resources (4)

| Resource | URI | Description |
|:----------|:-----|:-------------|
| Interview Flow | `directfile://interview/flow` | The full interview structure (categories, subcategories, screens) |
| Fact Types | `directfile://facts/types` | Reference of all supported fact wrapper types with examples |
| Common Fact Paths | `directfile://facts/common-paths` | Organized list of frequently-used fact paths by section |
| Tax Dictionary | `directfile://tax-dictionary/{filename}` | Individual tax dictionary XML definition files |

### Prompts (3)

| Prompt | Description |
|:--------|:-------------|
| `file_tax_return` | Guided workflow for filing a complete federal tax return |
| `check_return_status` | Check the status of a previously submitted return |
| `explain_tax_concept` | Educational helper for tax concepts and terminology |

## Prerequisites

- Node.js 20+ (tested with 25.x)
- A running Direct File backend (see [the main project README](../README.md) for setup via Docker Compose)

## Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (connects to local backend on port 8080 by default)
npm start
```

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|:----------|:---------|:-------------|
| `DIRECT_FILE_API_URL` | `http://localhost:8080` | Base URL of the Direct File backend API |
| `DIRECT_FILE_USER_ID` | `00000000-0000-0000-0000-000000000000` | User UUID for the `SM_UNIVERSALID` auth header |
| `DIRECT_FILE_EXTRA_HEADERS` | *(none)* | Optional JSON object of additional HTTP headers |

## Using with an MCP Client

### Claude Desktop / VS Code

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "direct-file": {
      "command": "node",
      "args": ["/path/to/direct-file/mcp-server/dist/index.js"],
      "env": {
        "DIRECT_FILE_API_URL": "http://localhost:8080",
        "DIRECT_FILE_USER_ID": "your-test-user-uuid"
      }
    }
  }
}
```

### Development (watch mode)

```bash
npm run dev   # Recompiles on file changes
```

## What This Prototype Does NOT Include

This is explicitly a prototype to demonstrate architectural feasibility. It does not include:

- Identity verification — Production Direct File uses IAL2 identity proofing through IRS SADI. This prototype accepts any user ID via environment variable.
- PII encryption at transport — Tax data (SSNs, income, addresses) flows in plaintext between the MCP server and backend. Production would require end-to-end encryption.
- Audit logging — IRS Publication 1075 requires detailed logging of all FTI (Federal Tax Information) access. This prototype has no audit trail.
- Rate limiting / abuse prevention — No safeguards against excessive API calls or automated misuse.
- Error recovery — Minimal error handling; no retry logic, circuit breakers, or graceful degradation.
- Multi-user sessions — The server is configured for a single user via environment variable.
- State eligibility checks — No validation of whether a taxpayer's state participates in Direct File.
- Complete fact coverage — The common fact paths and type mappings cover core scenarios but not every edge case in the full tax dictionary.

## Project Structure

```
mcp-server/
├── src/
│   ├── index.ts          # Entrypoint — server setup, config, transport
│   ├── api-client.ts     # HTTP client wrapping the Direct File REST API
│   ├── fact-helpers.ts   # Typed fact wrapper factory functions
│   ├── tools.ts          # MCP tool definitions (10 tools)
│   ├── resources.ts      # MCP resource definitions (4 resources)
│   └── prompts.ts        # MCP prompt definitions (3 prompts)
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## License

CC0-1.0 (consistent with the parent Direct File project)
