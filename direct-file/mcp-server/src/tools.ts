/**
 * PROTOTYPE — MCP Tool definitions for Direct File
 *
 * Each tool wraps one or more Direct File backend API calls, exposing the
 * tax-return lifecycle as discrete, composable operations an AI agent can
 * invoke on behalf of a taxpayer.
 *
 * ⚠️  PROTOTYPE ONLY — NOT FOR PRODUCTION USE
 * This code is a proof-of-concept. It does not enforce identity verification,
 * PII protections, or audit logging required for real tax filing.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DirectFileApiClient } from "./api-client.js";
import type { FactsMap } from "./api-client.js";
import { inferFactWrapper } from "./fact-helpers.js";

export function registerTools(server: McpServer, api: DirectFileApiClient) {
  // -------------------------------------------------------------------
  // 1. create_tax_return
  // -------------------------------------------------------------------
  server.tool(
    "create_tax_return",
    "Create a new tax return for the authenticated taxpayer. Returns the tax return ID needed for all subsequent operations. The taxYear defaults to 2024.",
    { taxYear: z.number().min(2023).max(2050).default(2024) },
    async ({ taxYear }) => {
      try {
        const result = await api.createTaxReturn({
          taxYear,
          facts: {},
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  taxReturnId: result.id,
                  taxYear: result.taxYear,
                  createdAt: result.createdAt,
                  isEditable: result.isEditable,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating tax return: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 2. get_tax_return
  // -------------------------------------------------------------------
  server.tool(
    "get_tax_return",
    "Retrieve the current state of a tax return, including all facts (user-entered data) and submission status.",
    { taxReturnId: z.string().uuid() },
    async ({ taxReturnId }) => {
      try {
        const result = await api.getTaxReturn(taxReturnId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error retrieving tax return: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 3. list_tax_returns
  // -------------------------------------------------------------------
  server.tool(
    "list_tax_returns",
    "List all tax returns for the authenticated taxpayer.",
    {},
    async () => {
      try {
        const results = await api.listTaxReturns();
        const summary = results.map((r) => ({
          id: r.id,
          taxYear: r.taxYear,
          createdAt: r.createdAt,
          isEditable: r.isEditable,
          submissionCount: r.taxReturnSubmissions?.length ?? 0,
        }));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing tax returns: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 4. set_fact
  // -------------------------------------------------------------------
  server.tool(
    "set_fact",
    `Set one or more facts on a tax return. Facts are key-value pairs where the key is a fact path (e.g. "/primaryFiler/firstName") and the value is typed.

Supported factType values and their expected formats:

- **boolean**: true or false
- **string**: any text string
- **int**: whole number (no decimals)
- **dollar**: string with up to 2 decimal places, e.g. "52000.00" or "1234.56". Commas allowed. Numbers also accepted.
- **date**: object with { year (1862-2100), month (1-12), day (1-31) } — must be a valid calendar date
- **enum**: object with { value: "optionName", enumOptionsPath: "/path/to/options" }
- **tin** / **ssn**: either a string "123-45-6789" or object { area: "123", group: "45", serial: "6789" }. Area cannot be "000" or "666". All segments must be digits.
- **address**: object with { streetAddress (1-35 chars, starts with letter/digit), city (3-22 chars, letters/spaces), postalCode ("90210" or "90210-1234"), stateOrProvence ("CA" — 2 uppercase letters) }
- **phone**: US phone number as "202-555-1234" or "2025551234". Area/office codes cannot start with 0 or 1.
- **collection**: array of string UUIDs

Examples:
  - { path: "/primaryFiler/firstName", factType: "string", value: "Jane" }
  - { path: "/filingStatus", factType: "enum", value: { value: "single", enumOptionsPath: "/filingStatusOptions" } }
  - { path: "/primaryFiler/dateOfBirth", factType: "date", value: { year: 1990, month: 3, day: 15 } }
  - { path: "/primaryFiler/ssn", factType: "ssn", value: "123-45-6789" }
  - { path: "/formW2s/#<uuid>/oasdiWages", factType: "dollar", value: "52000.00" }
  - { path: "/primaryFiler/phone", factType: "phone", value: "202-555-1234" }`,
    {
      taxReturnId: z.string().uuid(),
      facts: z.array(
        z.object({
          path: z.string().describe("Fact graph path, e.g. /primaryFiler/firstName"),
          factType: z
            .enum([
              "boolean",
              "string",
              "int",
              "dollar",
              "date",
              "enum",
              "tin",
              "ssn",
              "address",
              "collection",
              "phone",
            ])
            .describe("The data type of the fact value"),
          value: z.any().describe("The value to set — shape depends on factType"),
        })
      ),
    },
    async ({ taxReturnId, facts }) => {
      try {
        const factsMap: FactsMap = {};
        for (const f of facts) {
          factsMap[f.path] = inferFactWrapper(f.factType, f.value);
        }
        await api.updateTaxReturn(taxReturnId, { facts: factsMap });
        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully set ${facts.length} fact(s) on tax return ${taxReturnId}.`,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error setting facts: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 5. get_fact
  // -------------------------------------------------------------------
  server.tool(
    "get_fact",
    "Read the current value of one or more facts from a tax return. Returns both user-entered and derived (calculated) fact values.",
    {
      taxReturnId: z.string().uuid(),
      paths: z
        .array(z.string())
        .describe(
          'One or more fact graph paths to read, e.g. ["/primaryFiler/firstName", "/filingStatus"]'
        ),
    },
    async ({ taxReturnId, paths }) => {
      try {
        const taxReturn = await api.getTaxReturn(taxReturnId);
        const results: Record<string, unknown> = {};
        for (const path of paths) {
          if (path in taxReturn.facts) {
            results[path] = taxReturn.facts[path];
          } else {
            results[path] = null; // fact not set or is derived (server-side only)
          }
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error reading facts: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 6. sign_tax_return
  // -------------------------------------------------------------------
  server.tool(
    "sign_tax_return",
    "Digitally sign a completed tax return. This must be done before submission. The return must have all required facts completed with no validation errors.",
    { taxReturnId: z.string().uuid() },
    async ({ taxReturnId }) => {
      try {
        const result = await api.signTaxReturn(taxReturnId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Tax return ${taxReturnId} signed successfully. ${result}`,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error signing tax return: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 7. submit_tax_return
  // -------------------------------------------------------------------
  server.tool(
    "submit_tax_return",
    "Submit a signed tax return to the IRS Modernized e-File (MeF) system. The return must be signed first. Returns a 202 Accepted — the actual acceptance/rejection arrives asynchronously and can be checked with get_submission_status.",
    { taxReturnId: z.string().uuid() },
    async ({ taxReturnId }) => {
      try {
        const result = await api.submitTaxReturn(taxReturnId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Tax return ${taxReturnId} submitted. ${result}`,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error submitting tax return: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 8. get_submission_status
  // -------------------------------------------------------------------
  server.tool(
    "get_submission_status",
    "Check the submission status of a tax return. Possible statuses include: Accepted, Rejected, Submitted (pending), Failed, and various error states.",
    { taxReturnId: z.string().uuid() },
    async ({ taxReturnId }) => {
      try {
        const result = await api.getTaxReturnStatus(taxReturnId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting submission status: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 9. import_tax_data
  // -------------------------------------------------------------------
  server.tool(
    "import_tax_data",
    "Fetch pre-populated tax data (W-2s, 1099s, etc.) from the IRS data import service for a tax return. This pulls information the IRS already has on file so the taxpayer doesn't need to re-enter it.",
    { taxReturnId: z.string().uuid() },
    async ({ taxReturnId }) => {
      try {
        const result = await api.getPopulatedData(taxReturnId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error importing tax data: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 10. get_user_info
  // -------------------------------------------------------------------
  server.tool(
    "get_user_info",
    "Get information about the currently authenticated taxpayer.",
    {},
    async () => {
      try {
        const result = await api.getUserInfo();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting user info: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
