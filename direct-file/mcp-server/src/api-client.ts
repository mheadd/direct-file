/**
 * PROTOTYPE — Direct File Backend API Client
 *
 * Wraps the Spring Boot REST API exposed by the Direct File backend service.
 * In production the backend sits behind an identity proxy (CSP/SADI) which
 * injects authentication headers. For this prototype the client lets the
 * caller provide those headers directly so the MCP server can operate against
 * a locally-running backend with the CSP simulator.
 */

// ---------------------------------------------------------------------------
// Types that mirror the backend DTOs
// ---------------------------------------------------------------------------

export interface FactTypeWithItem {
  $type: string;
  item: unknown;
}

export type FactsMap = Record<string, FactTypeWithItem>;

export interface CreateTaxReturnRequest {
  taxYear: number;
  facts: FactsMap;
}

export interface UpdateTaxReturnRequest {
  facts: FactsMap;
  store?: string | null;
  surveyOptIn?: boolean | null;
}

export interface TaxReturnSubmission {
  submissionId?: string;
  receiptId?: string;
  status?: string;
  createdAt?: string;
}

export interface TaxReturnResponse {
  id: string;
  createdAt: string;
  taxYear: number;
  facts: FactsMap;
  store?: string;
  taxReturnSubmissions?: TaxReturnSubmission[];
  isEditable?: boolean;
  surveyOptIn?: boolean;
}

export interface UserInfoResponse {
  email?: string;
  externalId?: string;
  tin?: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class DirectFileApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  /**
   * @param baseUrl  Root URL of the backend API, e.g. "http://localhost:8080"
   * @param headers  Authentication headers normally injected by the identity
   *                 proxy. At minimum SM_UNIVERSALID must be provided.
   */
  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    };
  }

  // -- helpers --------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.headers,
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `API ${method} ${path} returned ${res.status}: ${text}`
      );
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  // -- Tax Returns ----------------------------------------------------------

  async listTaxReturns(): Promise<TaxReturnResponse[]> {
    return this.request("GET", "/df/file/api/v1/taxreturns");
  }

  async getTaxReturn(id: string): Promise<TaxReturnResponse> {
    return this.request("GET", `/df/file/api/v1/taxreturns/${encodeURIComponent(id)}`);
  }

  async createTaxReturn(
    body: CreateTaxReturnRequest
  ): Promise<TaxReturnResponse> {
    return this.request("POST", "/df/file/api/v1/taxreturns", body);
  }

  async updateTaxReturn(
    id: string,
    body: UpdateTaxReturnRequest
  ): Promise<void> {
    await this.request("POST", `/df/file/api/v1/taxreturns/${encodeURIComponent(id)}`, body);
  }

  async getTaxReturnPdf(
    id: string,
    languageCode: string = "en"
  ): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}/df/file/api/v1/taxreturns/${encodeURIComponent(id)}/pdf/${encodeURIComponent(languageCode)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { ...this.headers, Accept: "application/pdf" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `API POST /df/file/api/v1/taxreturns/${encodeURIComponent(id)}/pdf/${encodeURIComponent(languageCode)} returned ${res.status}: ${text}`
      );
    }
    return res.arrayBuffer();
  }

  // -- User -----------------------------------------------------------------

  async getUserInfo(): Promise<UserInfoResponse> {
    return this.request("GET", "/df/file/api/v1/users/me");
  }

  // -- Session --------------------------------------------------------------

  async keepAlive(): Promise<void> {
    await this.request("GET", "/df/file/api/v1/session/keep-alive");
  }
}
