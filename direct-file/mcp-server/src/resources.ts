/**
 * PROTOTYPE — MCP Resource definitions for Direct File
 *
 * Resources expose reference data that an AI agent can read to understand
 * the structure of the tax interview, the available fact paths, and the
 * current state of a return.
 *
 * ⚠️  PROTOTYPE ONLY — NOT FOR PRODUCTION USE
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the backend resources directory.
 * Assumes the MCP server lives at direct-file/mcp-server/ and the backend
 * tax dictionary XMLs are at direct-file/backend/src/main/resources/tax/.
 */
function taxDictionaryDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(
    __dirname,
    "..",
    "..",
    "backend",
    "src",
    "main",
    "resources",
    "tax"
  );
}

export function registerResources(server: McpServer) {
  // -------------------------------------------------------------------
  // 1. interview_flow — the full interview structure
  // -------------------------------------------------------------------
  server.resource(
    "interview_flow",
    "directfile://interview/flow",
    {
      description:
        "The Direct File interview flow structure. Describes the categories, subcategories, screens, gates, and conditions that define the tax filing interview.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "directfile://interview/flow",
          mimeType: "application/json",
          text: JSON.stringify(INTERVIEW_FLOW, null, 2),
        },
      ],
    })
  );

  // -------------------------------------------------------------------
  // 2. fact_types — supported fact value types and their shapes
  // -------------------------------------------------------------------
  server.resource(
    "fact_types",
    "directfile://reference/fact-types",
    {
      description:
        "Reference for the supported fact value types, their wrapper class names, and the shape of their item values.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "directfile://reference/fact-types",
          mimeType: "application/json",
          text: JSON.stringify(FACT_TYPES_REFERENCE, null, 2),
        },
      ],
    })
  );

  // -------------------------------------------------------------------
  // 3. common_fact_paths — frequently-used fact paths organized by section
  // -------------------------------------------------------------------
  server.resource(
    "common_fact_paths",
    "directfile://reference/common-fact-paths",
    {
      description:
        "Commonly used fact graph paths organized by interview section. Not exhaustive — the full set is in the tax dictionary XML files.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "directfile://reference/common-fact-paths",
          mimeType: "application/json",
          text: JSON.stringify(COMMON_FACT_PATHS, null, 2),
        },
      ],
    })
  );

  // -------------------------------------------------------------------
  // 4. tax_dictionary_file — parameterized resource for reading XML defs
  // -------------------------------------------------------------------
  server.resource(
    "tax_dictionary_file",
    new ResourceTemplate("directfile://tax-dictionary/{filename}", {
      list: async () => {
        const dir = taxDictionaryDir();
        try {
          const files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".xml"));
          return {
            resources: files.map((f: string) => ({
              uri: `directfile://tax-dictionary/${f}`,
              name: f,
              description: `Tax dictionary definition: ${f}`,
              mimeType: "application/xml",
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    { description: "Individual tax dictionary XML files that define fact paths, derived computations, and validation rules.", mimeType: "application/xml" },
    async (uri, { filename }) => {
      const filePath = path.join(taxDictionaryDir(), String(filename));
      // Prevent path traversal
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(taxDictionaryDir())) {
        throw new Error("Invalid filename");
      }
      const content = fs.readFileSync(resolved, "utf-8");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/xml",
            text: content,
          },
        ],
      };
    }
  );
}

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------

const INTERVIEW_FLOW = {
  _note:
    "Simplified representation of the Direct File interview flow. Derived from df-client/df-client-app/src/flow/flow.tsx.",
  categories: [
    {
      route: "you-and-your-family",
      title: "You and Your Family",
      subcategories: [
        {
          route: "about-you",
          title: "About You",
          completeCondition: "/aboutYouIsComplete",
          factPaths: [
            "/primaryFiler/firstName",
            "/primaryFiler/middleInitial",
            "/primaryFiler/lastName",
            "/primaryFiler/dateOfBirth",
            "/primaryFiler/tin",
            "/primaryFiler/isUsCitizenFullYear",
            "/primaryFiler/canBeClaimed",
            "/primaryFiler/isBlind",
            "/address/streetAddress",
            "/address/city",
            "/address/postalCode",
            "/address/stateOrProvence",
            "/phone",
            "/email",
          ],
        },
        {
          route: "spouse",
          title: "Spouse Information",
          gateCondition: "/spouseIsPresent",
          completeCondition: "/spouseIsComplete",
          factPaths: [
            "/secondaryFiler/firstName",
            "/secondaryFiler/middleInitial",
            "/secondaryFiler/lastName",
            "/secondaryFiler/dateOfBirth",
            "/secondaryFiler/tin",
            "/secondaryFiler/isUsCitizenFullYear",
            "/secondaryFiler/canBeClaimed",
            "/secondaryFiler/isBlind",
          ],
        },
        {
          route: "family-and-household",
          title: "Family and Household",
          completeCondition: "/familyAndHouseholdIsDone",
          collection: "/familyAndHousehold",
          factPaths: [
            "/familyAndHousehold/#<id>/fullName",
            "/familyAndHousehold/#<id>/tin",
            "/familyAndHousehold/#<id>/dateOfBirth",
            "/familyAndHousehold/#<id>/relationship",
          ],
        },
        {
          route: "filing-status",
          title: "Filing Status",
          completeCondition: "/isFilingStatusComplete",
          factPaths: ["/filingStatus", "/maritalStatus"],
        },
      ],
    },
    {
      route: "income",
      title: "Income",
      subcategories: [
        {
          route: "income-sources",
          title: "Income Sources",
          description: "Which types of income do you have?",
          factPaths: [
            "/hasW2Income",
            "/hasUnemploymentIncome",
            "/hasInterestIncome",
            "/hasSocialSecurityIncome",
            "/hasRetirementIncome",
            "/has1099MiscIncome",
            "/hasDigitalAssetsTransaction",
            "/hasForeignAccounts",
          ],
        },
        {
          route: "job-income",
          title: "W-2 Job Income",
          gateCondition: "/hasW2Income",
          collection: "/formW2s",
          factPaths: [
            "/formW2s/#<id>/employerName",
            "/formW2s/#<id>/employerTin",
            "/formW2s/#<id>/oasdiWages",
            "/formW2s/#<id>/oasdiWithholding",
            "/formW2s/#<id>/medicareWages",
            "/formW2s/#<id>/medicareWithholding",
            "/formW2s/#<id>/federalIncomeTaxWithheld",
            "/formW2s/#<id>/wagesTipsOtherComp",
            "/formW2s/#<id>/stateWages",
            "/formW2s/#<id>/stateIncomeTax",
          ],
        },
        {
          route: "unemployment-income",
          title: "Unemployment Income (1099-G)",
          gateCondition: "/hasUnemploymentIncome",
          collection: "/form1099Gs",
          factPaths: [
            "/form1099Gs/#<id>/grossUnemploymentCompensation",
            "/form1099Gs/#<id>/federalIncomeTaxWithheld",
          ],
        },
        {
          route: "interest-income",
          title: "Interest Income (1099-INT)",
          gateCondition: "/hasInterestIncome",
        },
        {
          route: "social-security-income",
          title: "Social Security Income (SSA-1099)",
          gateCondition: "/hasSocialSecurityIncome",
        },
        {
          route: "retirement-income",
          title: "Retirement Income (1099-R)",
          gateCondition: "/hasRetirementIncome",
          collection: "/form1099Rs",
        },
        {
          route: "total-income-summary",
          title: "Total Income Summary",
          description: "Review of all reported income",
        },
      ],
    },
    {
      route: "credits-and-deductions",
      title: "Credits and Deductions",
      subcategories: [
        {
          route: "deductions",
          title: "Deductions",
          factPaths: ["/deductionType"],
        },
        {
          route: "credits",
          title: "Tax Credits",
          description:
            "Earned Income Tax Credit, Child Tax Credit, education credits, etc.",
        },
      ],
    },
    {
      route: "your-taxes",
      title: "Your Taxes",
      subcategories: [
        {
          route: "estimated-taxes",
          title: "Estimated Tax Payments",
        },
        {
          route: "amount",
          title: "Tax Amount",
          description: "Your calculated tax amount, refund, or amount owed.",
        },
        {
          route: "payment-method",
          title: "Payment Method",
          description:
            "How you want to receive your refund or pay what you owe.",
          factPaths: [
            "/bankAccountType",
            "/bankRoutingNumber",
            "/bankAccountNumber",
          ],
        },
        {
          route: "other-preferences",
          title: "Other Preferences",
        },
      ],
    },
    {
      route: "complete",
      title: "Review and Submit",
      subcategories: [
        {
          route: "review",
          title: "Review Your Return",
          description: "Review all information before signing.",
        },
        {
          route: "sign",
          title: "Sign Your Return",
          description: "Digitally sign your return with your PIN.",
          factPaths: ["/primaryFiler/pin", "/secondaryFiler/pin"],
        },
        {
          route: "submit",
          title: "Submit to IRS",
          description:
            "Submit your signed return to the IRS via Modernized e-File.",
        },
      ],
    },
  ],
};

const FACT_TYPES_REFERENCE = {
  _note:
    "Mapping of simplified type names (used in set_fact) to the Java wrapper class names and their expected item shapes.",
  types: {
    boolean: {
      wrapperClass: "gov.irs.factgraph.persisters.BooleanWrapper",
      itemShape: "boolean (true or false)",
      example: { $type: "gov.irs.factgraph.persisters.BooleanWrapper", item: true },
    },
    string: {
      wrapperClass: "gov.irs.factgraph.persisters.StringWrapper",
      itemShape: "string",
      example: { $type: "gov.irs.factgraph.persisters.StringWrapper", item: "Jane" },
    },
    int: {
      wrapperClass: "gov.irs.factgraph.persisters.IntWrapper",
      itemShape: "integer",
      example: { $type: "gov.irs.factgraph.persisters.IntWrapper", item: 3 },
    },
    dollar: {
      wrapperClass: "gov.irs.factgraph.persisters.DollarWrapper",
      itemShape: 'string with decimal, e.g. "50000.00"',
      example: {
        $type: "gov.irs.factgraph.persisters.DollarWrapper",
        item: "50000.00",
      },
    },
    date: {
      wrapperClass: "gov.irs.factgraph.persisters.DayWrapper",
      itemShape: "{ year: number, month: number, day: number }",
      example: {
        $type: "gov.irs.factgraph.persisters.DayWrapper",
        item: { year: 1990, month: 3, day: 15 },
      },
    },
    enum: {
      wrapperClass: "gov.irs.factgraph.persisters.EnumWrapper",
      itemShape:
        '{ value: string (the chosen option), enumOptionsPath: string (path to options fact) }',
      example: {
        $type: "gov.irs.factgraph.persisters.EnumWrapper",
        item: {
          value: ["single"],
          enumOptionsPath: "/filingStatusOptions",
        },
      },
    },
    tin: {
      wrapperClass: "gov.irs.factgraph.persisters.TinWrapper",
      itemShape: "{ area: string, group: string, serial: string }",
      example: {
        $type: "gov.irs.factgraph.persisters.TinWrapper",
        item: { area: "123", group: "45", serial: "6789" },
      },
    },
    address: {
      wrapperClass: "gov.irs.factgraph.persisters.AddressWrapper",
      itemShape:
        "{ streetAddress: string, city: string, postalCode: string, stateOrProvence: string, country: string }",
      example: {
        $type: "gov.irs.factgraph.persisters.AddressWrapper",
        item: {
          streetAddress: "123 Main St",
          city: "Springfield",
          postalCode: "62701",
          stateOrProvence: "IL",
          country: "US",
        },
      },
    },
    collection: {
      wrapperClass: "gov.irs.factgraph.persisters.CollectionWrapper",
      itemShape: "string[] (array of UUID item IDs)",
      example: {
        $type: "gov.irs.factgraph.persisters.CollectionWrapper",
        item: { items: ["3d1946aa-7280-43d4-b5c9-5fde6a6ba28c"] },
      },
    },
    phone: {
      wrapperClass: "gov.irs.factgraph.persisters.PhoneWrapper",
      itemShape: "string (phone number)",
      example: {
        $type: "gov.irs.factgraph.persisters.PhoneWrapper",
        item: "2025551234",
      },
    },
  },
};

const COMMON_FACT_PATHS = {
  _note:
    "Commonly used fact graph paths grouped by interview section. Paths with #<id> are collection items — replace <id> with a UUID.",
  aboutYou: {
    "/primaryFiler/firstName": "string — First name",
    "/primaryFiler/middleInitial": "string — Middle initial (optional)",
    "/primaryFiler/lastName": "string — Last name",
    "/primaryFiler/dateOfBirth": "date — Date of birth",
    "/primaryFiler/tin": "tin — Social Security Number",
    "/primaryFiler/isUsCitizenFullYear": "boolean — US citizen for full tax year",
    "/primaryFiler/canBeClaimed": "boolean — Can be claimed as dependent",
    "/primaryFiler/isBlind": "boolean — Is legally blind",
    "/primaryFiler/isStudent": "boolean — Is a student",
    "/primaryFiler/isDisabled": "boolean — Is disabled",
  },
  address: {
    "/address/streetAddress": "string — Street address",
    "/address/city": "string — City",
    "/address/postalCode": "string — ZIP code",
    "/address/stateOrProvence": "string — State code (e.g. 'IL')",
  },
  spouse: {
    "/secondaryFiler/firstName": "string — Spouse first name",
    "/secondaryFiler/lastName": "string — Spouse last name",
    "/secondaryFiler/dateOfBirth": "date — Spouse date of birth",
    "/secondaryFiler/tin": "tin — Spouse SSN",
  },
  filingStatus: {
    "/maritalStatus":
      "enum — Marital status: single, married (enumOptionsPath: /maritalStatusOptions)",
    "/filingStatus":
      "enum — Filing status: single, married, headOfHousehold, marriedFilingSeparately, qualifiedSurvivingSpouse (enumOptionsPath: /filingStatusOptions)",
  },
  w2Income: {
    "/formW2s": "collection — W-2 form collection",
    "/formW2s/#<id>/employerName": "string — Employer name",
    "/formW2s/#<id>/employerTin": "tin — Employer EIN",
    "/formW2s/#<id>/wagesTipsOtherComp": "dollar — Box 1: Wages, tips, other compensation",
    "/formW2s/#<id>/federalIncomeTaxWithheld": "dollar — Box 2: Federal income tax withheld",
    "/formW2s/#<id>/oasdiWages": "dollar — Box 3: Social Security wages",
    "/formW2s/#<id>/oasdiWithholding": "dollar — Box 4: Social Security tax withheld",
    "/formW2s/#<id>/medicareWages": "dollar — Box 5: Medicare wages",
    "/formW2s/#<id>/medicareWithholding": "dollar — Box 6: Medicare tax withheld",
  },
  flowControl: {
    "/flowIsKnockedOut": "boolean (derived) — True if taxpayer is ineligible",
    "/aboutYouIsComplete": "boolean (derived) — About You section complete",
    "/familyAndHouseholdIsDone": "boolean (derived) — Family section complete",
    "/isFilingStatusComplete": "boolean (derived) — Filing status section complete",
    "/flowHasSeenTotalIncomeSummary": "boolean — Has viewed income summary",
  },
  payment: {
    "/bankAccountType": "enum — Account type for refund: checking, savings",
    "/bankRoutingNumber": "string — Bank routing number",
    "/bankAccountNumber": "string — Bank account number",
  },
};
