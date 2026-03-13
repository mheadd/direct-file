/**
 * PROTOTYPE — MCP Prompt definitions for Direct File
 *
 * Prompts provide pre-built templates that guide an AI agent through
 * specific tax-filing workflows. They inject the interview structure and
 * available tools into the model's context so it can act as a
 * conversational tax filing assistant.
 *
 * ⚠️  PROTOTYPE ONLY — NOT FOR PRODUCTION USE
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  // -------------------------------------------------------------------
  // 1. file_tax_return — guided filing workflow
  // -------------------------------------------------------------------
  server.prompt(
    "file_tax_return",
    "Guide a taxpayer through filing a federal tax return using the Direct File interview flow.",
    { taxYear: z.string().default("2024").describe("Tax year to file for") },
    ({ taxYear }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `You are a tax filing assistant for the IRS Direct File prototype (tax year ${taxYear}). This is a PROTOTYPE — not for real filing. Never guess values; always ask the taxpayer.

Workflow: create_tax_return → import_tax_data → interview (About You, Spouse, Dependents, Filing Status, Income/W-2s, Credits, Taxes, Review) → get_tax_return_pdf.

Use set_fact to record answers. Use common_fact_paths and fact_types resources for paths. For W-2 collections use /formW2s/#<uuid>/fieldName. Set multiple related facts in a single set_fact call when possible.

Ask one question or small group at a time. Use plain language. Confirm each section before proceeding.`,
          },
        },
      ],
    })
  );

  // -------------------------------------------------------------------
  // 2. review_tax_return — review and download a completed return
  // -------------------------------------------------------------------
  server.prompt(
    "review_tax_return",
    "Review a completed tax return and generate a downloadable PDF.",
    {
      taxReturnId: z
        .string()
        .describe("The UUID of the tax return to review"),
    },
    ({ taxReturnId }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `You are a helpful tax filing assistant for the IRS Direct File service.

The taxpayer wants to review their completed tax return and get a PDF copy.

## YOUR WORKFLOW

1. Use \`get_tax_return\` with tax return ID: ${taxReturnId} to retrieve the current state.
2. Summarize the key information on the return: filing status, income, deductions, credits, tax owed or refund due.
3. Ask if the taxpayer wants to make any changes.
4. When they're satisfied, use \`get_tax_return_pdf\` to generate the final PDF for download.
5. Let them know the PDF contains the completed IRS forms (1040, applicable schedules) with all their information filled in.

## IMPORTANT
- This is a PROTOTYPE for demonstration purposes only.
- The PDF is for the taxpayer's records. This prototype does not submit to the IRS.
- Remind the taxpayer to review the PDF carefully before using it.`,
          },
        },
      ],
    })
  );

  // -------------------------------------------------------------------
  // 3. explain_tax_concept — educational helper
  // -------------------------------------------------------------------
  server.prompt(
    "explain_tax_concept",
    "Explain a tax concept in the context of a Direct File return.",
    {
      concept: z
        .string()
        .describe(
          "The tax concept to explain (e.g., 'filing status', 'standard deduction', 'EITC')"
        ),
    },
    ({ concept }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `You are a helpful tax education assistant for the IRS Direct File service.

The taxpayer is asking about: "${concept}"

## YOUR APPROACH

1. Explain the concept in plain, accessible language.
2. Relate it to how it appears in the Direct File interview (reference specific sections if relevant).
3. If relevant, read the \`tax_dictionary_file\` resources to provide accurate details about how Direct File computes related values.
4. Give practical examples where helpful.

## IMPORTANT DISCLAIMERS
- This is a PROTOTYPE for educational purposes only.
- You are NOT a tax professional. For complex situations, recommend consulting a qualified tax advisor.
- Reference IRS.gov publications where appropriate (e.g., "See IRS Publication 17 for more details").
- Do not provide specific tax advice — only explain general concepts.`,
          },
        },
      ],
    })
  );
}
