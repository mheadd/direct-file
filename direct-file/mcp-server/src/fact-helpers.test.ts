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
  });

  describe("dayFact", () => {
    it("wraps year/month/day", () => {
      expect(dayFact(1990, 3, 15)).toEqual({
        $type: "gov.irs.factgraph.persisters.DayWrapper",
        item: { year: 1990, month: 3, day: 15 },
      });
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
          country: "US",
        },
      });
    });

    it("allows overriding country", () => {
      const result = addressFact("456 Elm", "Toronto", "M5V 2H1", "ON", "CA");
      expect(result.item).toEqual({
        streetAddress: "456 Elm",
        city: "Toronto",
        postalCode: "M5V 2H1",
        stateOrProvence: "ON",
        country: "CA",
      });
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
    it("wraps a phone number string", () => {
      expect(phoneFact("555-123-4567")).toEqual({
        $type: "gov.irs.factgraph.persisters.PhoneWrapper",
        item: "555-123-4567",
      });
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
      expect(inferFactWrapper("phone", "555-1234").$type).toBe(
        "gov.irs.factgraph.persisters.PhoneWrapper"
      );
    });

    it("throws on unknown fact type", () => {
      expect(() => inferFactWrapper("unknown_type", "x")).toThrow(
        "Unknown fact type: unknown_type"
      );
    });
  });
});
