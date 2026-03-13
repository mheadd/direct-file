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
import type { FactsMap, FactTypeWithItem } from "./api-client.js";
import { inferFactWrapper } from "./fact-helpers.js";

/**
 * Common path aliases — maps paths the AI agent frequently guesses
 * to the actual fact graph paths the backend expects.
 */
const PATH_ALIASES: Record<string, string> = {
  "/primaryFiler/ssn": "/primaryFiler/tin",
  "/primaryFiler/socialSecurityNumber": "/primaryFiler/tin",
  "/secondaryFiler/ssn": "/secondaryFiler/tin",
  "/secondaryFiler/socialSecurityNumber": "/secondaryFiler/tin",
  "/primaryFiler/phone": "/phone",
  "/primaryFiler/phoneNumber": "/phone",
  "/primaryFiler/email": "/email",
  "/primaryFiler/emailAddress": "/email",
  "/primaryFiler/address": "/address",
  "/primaryFiler/isDependent": "/primaryFiler/canBeClaimed",
  "/primaryFiler/canBeClaimedAsDependent": "/primaryFiler/canBeClaimed",
  "/secondaryFiler/isDependent": "/secondaryFiler/canBeClaimed",
};

/** Fields under /primaryFiler/* or /secondaryFiler/* that are actually
 *  writable on the /filers/#uuid/* collection path. */
const FILER_FIELDS = new Set([
  "firstName", "lastName", "dateOfBirth", "tin",
  "canBeClaimed", "isBlind", "isDisabled", "isStudent",
  "occupation", "hasIpPin", "ipPin", "isUsCitizenFullYear",
  "writableMiddleInitial",
]);

/**
 * Resolve /primaryFiler/<field> and /secondaryFiler/<field> to the
 * writable /filers/#<uuid>/<field> paths. Returns the path unchanged
 * if it doesn't match or the field isn't a writable filer field.
 */
function resolveFilerPath(
  path: string,
  facts: FactsMap
): string {
  const primaryMatch = path.match(/^\/primaryFiler\/(.+)$/);
  const secondaryMatch = path.match(/^\/secondaryFiler\/(.+)$/);
  const match = primaryMatch ?? secondaryMatch;
  if (!match || !match[1]) return path;

  const field = match[1];
  if (!FILER_FIELDS.has(field)) return path;

  const isPrimary = !!primaryMatch;

  // Find the filer UUID from the existing facts
  const filersCollection = facts["/filers"];
  if (!filersCollection || filersCollection.$type !== "gov.irs.factgraph.persisters.CollectionWrapper") {
    return path; // No filers collection — can't resolve
  }
  const items = (filersCollection.item as { items: string[] }).items;
  for (const uuid of items) {
    const isPrimaryFact = facts[`/filers/#${uuid}/isPrimaryFiler`];
    if (!isPrimaryFact) continue;
    const isPrimaryFiler = isPrimaryFact.item === true;
    if ((isPrimary && isPrimaryFiler) || (!isPrimary && !isPrimaryFiler)) {
      return `/filers/#${uuid}/${field}`;
    }
  }

  return path; // Couldn't resolve — return as-is
}

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
    `Set one or more facts on a tax return. factType formats: boolean, string, int, dollar ("52000.00"), date ({year,month,day} or string like "March 15, 1988"), enum ({value,enumOptionsPath}), ssn ("123-45-6789"), address ({streetAddress,city,postalCode,stateOrProvence}), phone ("202-555-1234"), collection (string[]).`,
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
      // Fetch existing facts to resolve /primaryFiler/* → /filers/#uuid/* paths
      let existingFacts: FactsMap = {};
      try {
        const taxReturn = await api.getTaxReturn(taxReturnId);
        existingFacts = taxReturn.facts ?? {};
      } catch {
        // If we can't fetch, proceed with unresolved paths
      }

      // Validate all facts, applying path aliases and filer path resolution.
      const factsMap: FactsMap = {};
      const errors: string[] = [];
      for (const f of facts) {
        try {
          const aliased = PATH_ALIASES[f.path] ?? f.path;
          const resolved = resolveFilerPath(aliased, existingFacts);
          const wrapper = inferFactWrapper(f.factType, f.value);
          factsMap[resolved] = wrapper;
        } catch (err: unknown) {
          errors.push(`${f.path}: ${(err as Error).message}`);
        }
      }

      const validCount = Object.keys(factsMap).length;

      if (validCount > 0) {
        try {
          // Try batch first
          await api.updateTaxReturn(taxReturnId, { facts: factsMap });
        } catch {
          // Batch failed — fall back to saving each fact individually
          let savedCount = 0;
          for (const [path, wrapper] of Object.entries(factsMap)) {
            try {
              await api.updateTaxReturn(taxReturnId, { facts: { [path]: wrapper } });
              savedCount++;
            } catch (innerErr: unknown) {
              const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
              errors.push(`${path}: ${msg}`);
            }
          }

          if (savedCount === 0 && errors.length > 0) {
            return {
              content: [{ type: "text" as const, text: `All facts rejected by backend:\n${errors.join("\n")}` }],
              isError: true,
            };
          }

          const parts: string[] = [];
          if (savedCount > 0) parts.push(`Saved ${savedCount} fact(s) on tax return ${taxReturnId}.`);
          if (errors.length > 0) parts.push(`${errors.length} fact(s) failed:\n${errors.join("\n")}`);
          return {
            content: [{ type: "text" as const, text: parts.join("\n\n") }],
            isError: savedCount === 0,
          };
        }
      }

      const parts: string[] = [];
      if (validCount > 0) parts.push(`Successfully set ${validCount} fact(s) on tax return ${taxReturnId}.`);
      if (errors.length > 0) parts.push(`${errors.length} fact(s) failed validation:\n${errors.join("\n")}`);
      return {
        content: [{ type: "text" as const, text: parts.join("\n\n") }],
        isError: validCount === 0 && errors.length > 0,
      };
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
  // 6. get_tax_return_pdf
  // -------------------------------------------------------------------
  server.tool(
    "get_tax_return_pdf",
    "Generate and download a PDF of the tax return. The PDF contains populated IRS forms (1040, schedules, etc.) with all facts currently on the return. This is the final output artifact — the equivalent of the taxpayer's completed return. Available languages: 'en' (English) and 'es' (Spanish).",
    {
      taxReturnId: z.string().uuid(),
      languageCode: z
        .enum(["en", "es"])
        .default("en")
        .describe("Language for the PDF: 'en' for English, 'es' for Spanish"),
    },
    async ({ taxReturnId, languageCode }) => {
      try {
        const pdfBuffer = await api.getTaxReturnPdf(taxReturnId, languageCode);
        const base64 = Buffer.from(pdfBuffer).toString("base64");
        return {
          content: [
            {
              type: "text" as const,
              text: `PDF generated successfully for tax return ${taxReturnId} (${languageCode}). Size: ${pdfBuffer.byteLength} bytes.`,
            },
            {
              type: "resource" as const,
              resource: {
                uri: `data:application/pdf;base64,${base64}`,
                mimeType: "application/pdf",
                text: base64,
              },
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error generating PDF: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------
  // 9. get_user_info
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
