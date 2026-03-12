/**
 * PROTOTYPE — Fact value builder helpers
 *
 * These utilities create the { $type, item } wrapper objects expected by
 * the Direct File backend when setting fact values. They correspond to the
 * Scala persister wrapper classes on the server.
 */

export function booleanFact(value: boolean) {
  return {
    $type: "gov.irs.factgraph.persisters.BooleanWrapper",
    item: value,
  };
}

export function stringFact(value: string) {
  return {
    $type: "gov.irs.factgraph.persisters.StringWrapper",
    item: value,
  };
}

export function intFact(value: number) {
  return {
    $type: "gov.irs.factgraph.persisters.IntWrapper",
    item: value,
  };
}

export function dollarFact(value: string) {
  return {
    $type: "gov.irs.factgraph.persisters.DollarWrapper",
    item: value, // e.g. "50000.00"
  };
}

export function dayFact(year: number, month: number, day: number) {
  return {
    $type: "gov.irs.factgraph.persisters.DayWrapper",
    item: { year, month, day },
  };
}

export function enumFact(value: string, enumOptionsPath: string) {
  return {
    $type: "gov.irs.factgraph.persisters.EnumWrapper",
    item: { value: [value], enumOptionsPath },
  };
}

export function tinFact(area: string, group: string, serial: string) {
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
  country: string = "US"
) {
  return {
    $type: "gov.irs.factgraph.persisters.AddressWrapper",
    item: { streetAddress, city, postalCode, stateOrProvence, country },
  };
}

export function collectionFact(itemIds: string[]) {
  return {
    $type: "gov.irs.factgraph.persisters.CollectionWrapper",
    item: { items: itemIds },
  };
}

export function phoneFact(phoneNumber: string) {
  return {
    $type: "gov.irs.factgraph.persisters.PhoneWrapper",
    item: phoneNumber,
  };
}

/**
 * Infer the appropriate wrapper from a JSON-like value description.
 * This is a convenience for the set_fact MCP tool so the AI model doesn't
 * need to know the Java class names.
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
    case "dollar":
      return dollarFact(value as string);
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
