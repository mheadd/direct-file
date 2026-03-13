import { describe, it, expect } from "vitest";
import {
  booleanFact,
  stringFact,
  intFact,
  dollarFact,
  dayFact,
  enumFact,
  tinFact,
  addressFact,
  collectionFact,
  phoneFact,
  inferFactWrapper,
} from "./fact-helpers.js";

describe("fact-helpers", () => {
  describe("booleanFact", () => {
    it("wraps true", () => {
      expect(booleanFact(true)).toEqual({
        $type: "gov.irs.factgraph.persisters.BooleanWrapper",
        item: true,
      });
    });

    it("wraps false", () => {
      expect(booleanFact(false)).toEqual({
        $type: "gov.irs.factgraph.persisters.BooleanWrapper",
        item: false,
      });
    });
  });

  describe("stringFact", () => {
    it("wraps a string value", () => {
      expect(stringFact("Jane")).toEqual({
        $type: "gov.irs.factgraph.persisters.StringWrapper",
        item: "Jane",
      });
    });

    it("wraps an empty string", () => {
      expect(stringFact("")).toEqual({
        $type: "gov.irs.factgraph.persisters.StringWrapper",
        item: "",
      });
    });
  });

  describe("intFact", () => {
    it("wraps an integer", () => {
      expect(intFact(42)).toEqual({
        $type: "gov.irs.factgraph.persisters.IntWrapper",
        item: 42,
      });
    });

    it("wraps zero", () => {
      expect(intFact(0)).toEqual({
        $type: "gov.irs.factgraph.persisters.IntWrapper",
        item: 0,
      });
    });
  });

  describe("dollarFact", () => {
    it("wraps a dollar amount string", () => {
      expect(dollarFact("52000.00")).toEqual({
        $type: "gov.irs.factgraph.persisters.DollarWrapper",
        item: "52000.00",
      });
    });

    it("strips commas from dollar amounts", () => {
      expect(dollarFact("1,234.56")).toEqual({
        $type: "gov.irs.factgraph.persisters.DollarWrapper",
        item: "1234.56",
      });
    });

    it("rejects invalid dollar format", () => {
      expect(() => dollarFact("abc")).toThrow("Invalid dollar");
    });

    it("rejects more than 2 decimal places", () => {
      expect(() => dollarFact("100.123")).toThrow("Invalid dollar");
    });
  });

  describe("dayFact", () => {
    it("wraps year/month/day", () => {
      expect(dayFact(1990, 3, 15)).toEqual({
        $type: "gov.irs.factgraph.persisters.DayWrapper",
        item: { year: 1990, month: 3, day: 15 },
      });
    });

    it("rejects invalid calendar date (Feb 30)", () => {
      expect(() => dayFact(2024, 2, 30)).toThrow("not a valid calendar date");
    });

    it("rejects month out of range", () => {
      expect(() => dayFact(2024, 13, 1)).toThrow("month must be 1-12");
    });

    it("rejects year before 1862", () => {
      expect(() => dayFact(1800, 1, 1)).toThrow("year must be an integer between 1862");
    });
  });

  describe("enumFact", () => {
    it("wraps a value and enum options path", () => {
      expect(enumFact("single", "/filingStatusOptions")).toEqual({
        $type: "gov.irs.factgraph.persisters.EnumWrapper",
        item: { value: ["single"], enumOptionsPath: "/filingStatusOptions" },
      });
    });
  });

  describe("tinFact", () => {
    it("wraps area, group, serial", () => {
      expect(tinFact("123", "45", "6789")).toEqual({
        $type: "gov.irs.factgraph.persisters.TinWrapper",
        item: { area: "123", group: "45", serial: "6789" },
      });
    });

    it("rejects area 000", () => {
      expect(() => tinFact("000", "45", "6789")).toThrow('area cannot be "000"');
    });

    it("rejects area 666", () => {
      expect(() => tinFact("666", "45", "6789")).toThrow('area cannot be "666"');
    });

    it("rejects non-digit area", () => {
      expect(() => tinFact("12a", "45", "6789")).toThrow("must be exactly 3 digits");
    });

    it("rejects wrong-length group", () => {
      expect(() => tinFact("123", "4", "6789")).toThrow("must be exactly 2 digits");
    });
  });

  describe("addressFact", () => {
    it("wraps address fields with default country", () => {
      const result = addressFact("123 Main St", "Springfield", "62704", "IL");
      expect(result).toEqual({
        $type: "gov.irs.factgraph.persisters.AddressWrapper",
        item: {
          streetAddress: "123 Main St",
          city: "Springfield",
          postalCode: "62704",
          stateOrProvence: "IL",
          country: "United States of America",
        },
      });
    });

    it("accepts ZIP+4 format", () => {
      const result = addressFact("123 Main St", "Springfield", "62704-1234", "IL");
      expect(result.item.postalCode).toBe("62704-1234");
    });

    it("rejects street longer than 35 chars", () => {
      expect(() => addressFact("A".repeat(36), "Springfield", "62704", "IL")).toThrow(
        "streetAddress must be 1-35 characters"
      );
    });

    it("rejects lowercase state code", () => {
      expect(() => addressFact("123 Main", "Springfield", "62704", "il")).toThrow(
        "2-letter uppercase code"
      );
    });

    it("rejects invalid postal code", () => {
      expect(() => addressFact("123 Main", "Springfield", "6270", "IL")).toThrow(
        "postalCode must be 5 digits"
      );
    });

    it("rejects city with numbers", () => {
      expect(() => addressFact("123 Main", "Spring3field", "62704", "IL")).toThrow(
        "city must contain only letters and spaces"
      );
    });
  });

  describe("collectionFact", () => {
    it("wraps an array of item IDs", () => {
      expect(collectionFact(["id-1", "id-2"])).toEqual({
        $type: "gov.irs.factgraph.persisters.CollectionWrapper",
        item: { items: ["id-1", "id-2"] },
      });
    });

    it("wraps an empty collection", () => {
      expect(collectionFact([])).toEqual({
        $type: "gov.irs.factgraph.persisters.CollectionWrapper",
        item: { items: [] },
      });
    });
  });

  describe("phoneFact", () => {
    it("normalizes a hyphenated phone number", () => {
      expect(phoneFact("202-555-1234")).toEqual({
        $type: "gov.irs.factgraph.persisters.PhoneWrapper",
        item: "+12025551234",
      });
    });

    it("normalizes digits-only input", () => {
      expect(phoneFact("2025551234")).toEqual({
        $type: "gov.irs.factgraph.persisters.PhoneWrapper",
        item: "+12025551234",
      });
    });

    it("strips +1 prefix and normalizes", () => {
      expect(phoneFact("+12025551234")).toEqual({
        $type: "gov.irs.factgraph.persisters.PhoneWrapper",
        item: "+12025551234",
      });
    });

    it("rejects too few digits", () => {
      expect(() => phoneFact("555-1234")).toThrow("expected 10-digit US phone");
    });

    it("rejects area code starting with 0", () => {
      expect(() => phoneFact("012-555-1234")).toThrow("area code cannot start with 0 or 1");
    });

    it("rejects office code starting with 1", () => {
      expect(() => phoneFact("202-155-1234")).toThrow("office code cannot start with 0 or 1");
    });
  });

  describe("inferFactWrapper", () => {
    it("dispatches boolean", () => {
      expect(inferFactWrapper("boolean", true).$type).toBe(
        "gov.irs.factgraph.persisters.BooleanWrapper"
      );
    });

    it("dispatches string", () => {
      expect(inferFactWrapper("string", "hello").$type).toBe(
        "gov.irs.factgraph.persisters.StringWrapper"
      );
    });

    it("dispatches int", () => {
      expect(inferFactWrapper("int", 5).$type).toBe(
        "gov.irs.factgraph.persisters.IntWrapper"
      );
    });

    it("dispatches integer (alias)", () => {
      expect(inferFactWrapper("integer", 5).$type).toBe(
        "gov.irs.factgraph.persisters.IntWrapper"
      );
    });

    it("dispatches dollar", () => {
      expect(inferFactWrapper("dollar", "100.00").$type).toBe(
        "gov.irs.factgraph.persisters.DollarWrapper"
      );
    });

    it("dispatches day", () => {
      const result = inferFactWrapper("day", {
        year: 2000,
        month: 1,
        day: 1,
      });
      expect(result.$type).toBe(
        "gov.irs.factgraph.persisters.DayWrapper"
      );
      expect(result.item).toEqual({ year: 2000, month: 1, day: 1 });
    });

    it("dispatches date (alias for day)", () => {
      const result = inferFactWrapper("date", {
        year: 2000,
        month: 1,
        day: 1,
      });
      expect(result.$type).toBe(
        "gov.irs.factgraph.persisters.DayWrapper"
      );
    });

    it("dispatches enum", () => {
      const result = inferFactWrapper("enum", {
        value: "single",
        enumOptionsPath: "/filingStatusOptions",
      });
      expect(result.$type).toBe(
        "gov.irs.factgraph.persisters.EnumWrapper"
      );
    });

    it("dispatches tin", () => {
      const result = inferFactWrapper("tin", {
        area: "123",
        group: "45",
        serial: "6789",
      });
      expect(result.$type).toBe(
        "gov.irs.factgraph.persisters.TinWrapper"
      );
    });

    it("dispatches ssn (alias for tin)", () => {
      const result = inferFactWrapper("ssn", {
        area: "123",
        group: "45",
        serial: "6789",
      });
      expect(result.$type).toBe(
        "gov.irs.factgraph.persisters.TinWrapper"
      );
    });

    it("dispatches address", () => {
      const result = inferFactWrapper("address", {
        streetAddress: "123 Main",
        city: "Anytown",
        postalCode: "12345",
        stateOrProvence: "NY",
      });
      expect(result.$type).toBe(
        "gov.irs.factgraph.persisters.AddressWrapper"
      );
    });

    it("dispatches collection", () => {
      expect(inferFactWrapper("collection", ["a", "b"]).$type).toBe(
        "gov.irs.factgraph.persisters.CollectionWrapper"
      );
    });

    it("dispatches phone", () => {
      const result = inferFactWrapper("phone", "202-555-1234");
      expect(result.$type).toBe(
        "gov.irs.factgraph.persisters.PhoneWrapper"
      );
      expect(result.item).toBe("+12025551234");
    });

    it("dispatches ssn from string format", () => {
      const result = inferFactWrapper("ssn", "123-45-6789");
      expect(result.$type).toBe("gov.irs.factgraph.persisters.TinWrapper");
      expect(result.item).toEqual({ area: "123", group: "45", serial: "6789" });
    });

    it("dispatches dollar from number", () => {
      const result = inferFactWrapper("dollar", 52000);
      expect(result.$type).toBe("gov.irs.factgraph.persisters.DollarWrapper");
      expect(result.item).toBe("52000.00");
    });

    it("throws on unknown fact type", () => {
      expect(() => inferFactWrapper("unknown_type", "x")).toThrow(
        "Unknown fact type: unknown_type"
      );
    });
  });
});
