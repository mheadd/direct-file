import { describe, it, expect, vi, beforeEach } from "vitest";
import { DirectFileApiClient } from "./api-client.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

function textResponse(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "text/plain" }),
    json: () => Promise.reject(new Error("not json")),
    text: () => Promise.resolve(text),
  } as Response;
}

function errorResponse(status: number, body = "error"): Response {
  return {
    ok: false,
    status,
    headers: new Headers({ "content-type": "text/plain" }),
    text: () => Promise.resolve(body),
  } as Response;
}

describe("DirectFileApiClient", () => {
  let api: DirectFileApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    api = new DirectFileApiClient("http://localhost:8080", {
      SM_UNIVERSALID: "test-user",
    });
  });

  describe("constructor", () => {
    it("strips trailing slashes from base URL", () => {
      const client = new DirectFileApiClient("http://example.com///");
      // We can verify by making a call and checking the URL
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      client.listTaxReturns();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://example.com/taxreturns",
        expect.anything()
      );
    });

    it("merges custom headers with defaults", () => {
      const client = new DirectFileApiClient("http://example.com", {
        SM_UNIVERSALID: "user-123",
        "X-Custom": "value",
      });
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      client.listTaxReturns();
      const callHeaders = mockFetch.mock.calls[0]![1].headers;
      expect(callHeaders).toMatchObject({
        "Content-Type": "application/json",
        Accept: "application/json",
        SM_UNIVERSALID: "user-123",
        "X-Custom": "value",
      });
    });
  });

  describe("listTaxReturns", () => {
    it("calls GET /taxreturns", async () => {
      const mockData = [{ id: "abc", taxYear: 2024 }];
      mockFetch.mockResolvedValueOnce(jsonResponse(mockData));

      const result = await api.listTaxReturns();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/taxreturns",
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("getTaxReturn", () => {
    it("calls GET /taxreturns/:id", async () => {
      const mockData = { id: "abc-123", taxYear: 2024, facts: {} };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockData));

      const result = await api.getTaxReturn("abc-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/taxreturns/abc-123",
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockData);
    });

    it("encodes special characters in ID", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "a/b" }));

      await api.getTaxReturn("a/b");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/taxreturns/a%2Fb",
        expect.anything()
      );
    });
  });

  describe("createTaxReturn", () => {
    it("calls POST /taxreturns with body", async () => {
      const mockResponse = { id: "new-id", taxYear: 2024 };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockResponse));

      const result = await api.createTaxReturn({
        taxYear: 2024,
        facts: {},
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/taxreturns",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ taxYear: 2024, facts: {} }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateTaxReturn", () => {
    it("calls PUT /taxreturns/:id with facts", async () => {
      mockFetch.mockResolvedValueOnce(textResponse(""));

      await api.updateTaxReturn("abc", {
        facts: { "/path": { $type: "BooleanWrapper", item: true } },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/taxreturns/abc",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            facts: { "/path": { $type: "BooleanWrapper", item: true } },
          }),
        })
      );
    });
  });

  describe("signTaxReturn", () => {
    it("calls POST /taxreturns/:id/sign", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse("signed"));

      const result = await api.signTaxReturn("abc");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/taxreturns/abc/sign",
        expect.objectContaining({ method: "POST" })
      );
      expect(result).toBe("signed");
    });
  });

  describe("submitTaxReturn", () => {
    it("calls POST /taxreturns/:id/submit", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse("submitted"));

      const result = await api.submitTaxReturn("abc");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/taxreturns/abc/submit",
        expect.objectContaining({ method: "POST" })
      );
      expect(result).toBe("submitted");
    });
  });

  describe("getTaxReturnStatus", () => {
    it("calls GET /taxreturns/:id/status", async () => {
      const mockData = { status: "Accepted" };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockData));

      const result = await api.getTaxReturnStatus("abc");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/taxreturns/abc/status",
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("getPopulatedData", () => {
    it("calls GET /taxreturns/:id/populated-data", async () => {
      const mockData = { w2s: [] };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockData));

      const result = await api.getPopulatedData("abc");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/taxreturns/abc/populated-data",
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("getUserInfo", () => {
    it("calls GET /user-info", async () => {
      const mockData = { email: "test@example.com" };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockData));

      const result = await api.getUserInfo();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/user-info",
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("keepAlive", () => {
    it("calls GET /session/keep-alive", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("ok"));

      await api.keepAlive();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/session/keep-alive",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("error handling", () => {
    it("throws on non-OK response with error body", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(404, "Not Found"));

      await expect(api.getTaxReturn("bad-id")).rejects.toThrow(
        "API GET /taxreturns/bad-id returned 404: Not Found"
      );
    });

    it("throws on 500 server error", async () => {
      mockFetch.mockResolvedValueOnce(
        errorResponse(500, "Internal Server Error")
      );

      await expect(api.listTaxReturns()).rejects.toThrow(
        "API GET /taxreturns returned 500"
      );
    });
  });
});
