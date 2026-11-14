import type {
  CoverageResult,
  ExampleDetail,
  ExamplePage,
  GeographyPage,
  ObservationsResult,
  ResponseMeta,
} from "@gaiapus/contracts";
type Envelope<T> = { data: T; meta: ResponseMeta };
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export class ApiClient {
  constructor(
    private transport: typeof fetch = (...args) => fetch(...args),
    private token: () => string | null = () => null,
  ) {}
  async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<Envelope<T> | undefined> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    const token = this.token();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await this.transport(`/v1${path}`, {
      ...options,
      headers,
    });
    if (response.status === 204) return undefined;
    const payload = await response.json().catch(() => null);
    if (!response.ok)
      throw new ApiError(
        response.status,
        payload?.error?.code ?? "request_failed",
        payload?.error?.message ?? "Não foi possível carregar os dados.",
      );
    if (!payload || !("data" in payload))
      throw new ApiError(
        502,
        "invalid_response",
        "A resposta recebida não corresponde ao contrato.",
      );
    return payload as Envelope<T>;
  }
  async geography(signal?: AbortSignal) {
    return (await this.request<GeographyPage>("/geography?limit=100", {
      signal,
    }))!.data;
  }
  async examples(area: string, signal?: AbortSignal) {
    return (await this.request<ExamplePage>(
      `/examples?area_id=${encodeURIComponent(area)}`,
      { signal },
    ))!.data;
  }
  async example(id: string, signal?: AbortSignal) {
    return (await this.request<ExampleDetail>(
      `/examples/${encodeURIComponent(id)}`,
      { signal },
    ))!.data;
  }
  async coverage(area: string, signal?: AbortSignal) {
    return (await this.request<CoverageResult>(
      `/coverage?area_id=${encodeURIComponent(area)}`,
      { signal },
    ))!.data;
  }
  async observations(
    area: string,
    start: string,
    end: string,
    signal?: AbortSignal,
  ) {
    return (await this.request<ObservationsResult>(
      `/observations?area_id=${encodeURIComponent(area)}&start=${start}&end=${end}`,
      { signal },
    ))!.data;
  }
}
export const api = new ApiClient();
