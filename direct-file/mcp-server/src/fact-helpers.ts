/**
 * PROTOTYPE — Fact value builder helpers
 *
 * These utilities create the { $type, item } wrapper objects expected by
 * the Direct File backend when setting fact values. They correspond to the
 * Scala persister wrapper classes on the server.
 *
 * Each builder validates its input against the same rules enforced by the
 * Fact Graph Scala types and the frontend UI, so that the AI model receives
 * a clear error message instead of an opaque backend 400/422.
 */

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

class FactValidationError extends Error {
  constructor(factType: string, message: string) {
    super(`Invalid ${factType}: ${message}`);
    this.name = "FactValidationError";
  }
}

function assertDigits(value: string, length: number, label: string): void {
  if (value.length !== length || !/^\d+$/.test(value)) {
    throw new FactValidationError(
      label,
      `must be exactly ${length} digits, got "${value}"`
    );
  }
}

// ---------------------------------------------------------------------------
// Fact wrapper builders (with validation)
// ---------------------------------------------------------------------------

export function booleanFact(value: boolean) {
  if (typeof value !== "boolean") {
    throw new FactValidationError("boolean", `expected true or false, got ${typeof value}`);
  }
  return {
    $type: "gov.irs.factgraph.persisters.BooleanWrapper",
    item: value,
  };
}

export function stringFact(value: string) {
  if (typeof value !== "string") {
    throw new FactValidationError("string", `expected a string, got ${typeof value}`);
  }
  return {
    $type: "gov.irs.factgraph.persisters.StringWrapper",
    item: value,
  };
}

export function intFact(value: number) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new FactValidationError("int", `expected an integer, got ${JSON.stringify(value)}`);
  }
  return {
    $type: "gov.irs.factgraph.persisters.IntWrapper",
    item: value,
  };
}

export function dollarFact(value: string) {
  if (typeof value !== "string") {
    throw new FactValidationError("dollar", `expected a string like "52000.00", got ${typeof value}`);
  }
  // Strip commas and validate format: optional negative, digits, optional decimal with up to 2 places
  const cleaned = value.replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new FactValidationError(
      "dollar",
      `"${value}" is not a valid dollar amount. Use format like "52000.00" (digits with optional 2 decimal places, commas allowed)`
    );
  }
  return {
    $type: "gov.irs.factgraph.persisters.DollarWrapper",
    item: cleaned,
  };
}

export function dayFact(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || year < 1862 || year > 2100) {
    throw new FactValidationError("date", `year must be an integer between 1862 and 2100, got ${year}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new FactValidationError("date", `month must be 1-12, got ${month}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new FactValidationError("date", `day must be 1-31, got ${day}`);
  }
  // Validate the date actually exists (e.g., no Feb 30)
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    throw new FactValidationError("date", `${year}-${month}-${day} is not a valid calendar date`);
  }
  return {
    $type: "gov.irs.factgraph.persisters.DayWrapper",
    item: { year, month, day },
  };
}

export function enumFact(value: string, enumOptionsPath: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new FactValidationError("enum", "value must be a non-empty string");
  }
  if (typeof enumOptionsPath !== "string" || !enumOptionsPath.startsWith("/")) {
    throw new FactValidationError(
      "enum",
      `enumOptionsPath must be a string starting with "/", got "${enumOptionsPath}"`
    );
  }
  return {
    $type: "gov.irs.factgraph.persisters.EnumWrapper",
    item: { value: [value], enumOptionsPath },
  };
}

export function tinFact(area: string, group: string, serial: string) {
  assertDigits(area, 3, "TIN area");
  assertDigits(group, 2, "TIN group");
  assertDigits(serial, 4, "TIN serial");
  if (area === "000") {
    throw new FactValidationError("TIN", 'area cannot be "000"');
  }
  if (area === "666") {
    throw new FactValidationError("TIN", 'area cannot be "666"');
  }
  return {
    $type: "gov.irs.factgraph.persisters.TinWrapper",
    item: { area, group, serial },
  };
}

export function addressFact(
  streetAddress: string,
  city: string,
  postalCode: string,
  stateOrProvence: string,
  country: string = "United States of America"
) {
  if (typeof streetAddress !== "string" || streetAddress.length === 0 || streetAddress.length > 35) {
    throw new FactValidationError("address", "streetAddress must be 1-35 characters");
  }
  if (!/^[A-Za-z0-9]/.test(streetAddress)) {
    throw new FactValidationError("address", "streetAddress must start with a letter or digit");
  }
  if (typeof city !== "string" || city.length < 3 || city.length > 22) {
    throw new FactValidationError("address", "city must be 3-22 characters");
  }
  if (!/^[A-Za-z ]+$/.test(city)) {
    throw new FactValidationError("address", "city must contain only letters and spaces");
  }
  if (!/^[A-Z]{2}$/.test(stateOrProvence)) {
    throw new FactValidationError(
      "address",
      `stateOrProvence must be a 2-letter uppercase code (e.g. "CA", "NY"), got "${stateOrProvence}"`
    );
  }
  if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
    throw new FactValidationError(
      "address",
      `postalCode must be 5 digits or ZIP+4 format (e.g. "90210" or "90210-1234"), got "${postalCode}"`
    );
  }
  return {
    $type: "gov.irs.factgraph.persisters.AddressWrapper",
    item: { streetAddress, city, postalCode, stateOrProvence, country },
  };
}

export function collectionFact(itemIds: string[]) {
  if (!Array.isArray(itemIds)) {
    throw new FactValidationError("collection", "expected an array of string IDs");
  }
  return {
    $type: "gov.irs.factgraph.persisters.CollectionWrapper",
    item: { items: itemIds },
  };
}

export function phoneFact(phoneNumber: string) {
  // Accept formats: "2025551234", "202-555-1234", "+12025551234"
  const digits = phoneNumber.replace(/[^0-9]/g, "");
  // Strip leading country code 1 if 11 digits
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (normalized.length !== 10) {
    throw new FactValidationError(
      "phone",
      `expected 10-digit US phone number, got ${normalized.length} digits from "${phoneNumber}". Use format like "202-555-1234"`
    );
  }
  const areaCode = normalized.slice(0, 3);
  const officeCode = normalized.slice(3, 6);
  if (/^[01]/.test(areaCode)) {
    throw new FactValidationError("phone", `area code cannot start with 0 or 1, got "${areaCode}"`);
  }
  if (/^[01]/.test(officeCode)) {
    throw new FactValidationError("phone", `office code cannot start with 0 or 1, got "${officeCode}"`);
  }
  // Return in the format the backend expects: +1 prefix with raw digits
  return {
    $type: "gov.irs.factgraph.persisters.PhoneWrapper",
    item: `+1${normalized}`,
  };
}

/**
 * Infer the appropriate wrapper from a JSON-like value description.
 * This is a convenience for the set_fact MCP tool so the AI model doesn't
 * need to know the Java class names.
 *
 * Accepts flexible input formats and normalizes them to what the backend
 * expects, providing clear validation errors for invalid data.
 */
export function inferFactWrapper(
  factType: string,
  value: unknown
): { $type: string; item: unknown } {
  switch (factType) {
    case "boolean":
      return booleanFact(value as boolean);
    case "string":
      return stringFact(value as string);
    case "int":
    case "integer":
      return intFact(value as number);
    case "dollar": {
      // Accept number or string
      const dollarVal = typeof value === "number" ? value.toFixed(2) : (value as string);
      return dollarFact(dollarVal);
    }
    case "day":
    case "date": {
      const d = value as { year: number; month: number; day: number };
      return dayFact(d.year, d.month, d.day);
    }
    case "enum": {
      const e = value as { value: string; enumOptionsPath: string };
      return enumFact(e.value, e.enumOptionsPath);
    }
    case "tin":
    case "ssn": {
      // Accept either {area, group, serial} object or a string like "123-45-6789"
      if (typeof value === "string") {
        const digits = value.replace(/[^0-9]/g, "");
        if (digits.length !== 9) {
          throw new FactValidationError(
            "TIN/SSN",
            `expected 9 digits, got ${digits.length} from "${value}". Use format "123-45-6789" or {area, group, serial}`
          );
        }
        return tinFact(digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 9));
      }
      const t = value as { area: string; group: string; serial: string };
      return tinFact(t.area, t.group, t.serial);
    }
    case "address": {
      const a = value as {
        streetAddress: string;
        city: string;
        postalCode: string;
        stateOrProvence: string;
        country?: string;
      };
      return addressFact(
        a.streetAddress,
        a.city,
        a.postalCode,
        a.stateOrProvence,
        a.country
      );
    }
    case "collection":
      return collectionFact(value as string[]);
    case "phone":
      return phoneFact(value as string);
    default:
      throw new Error(`Unknown fact type: ${factType}`);
  }
}
