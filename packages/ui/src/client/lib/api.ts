import type { CreateScanRequest, ScanListResponse, SessionResponse, StoredScan } from "@shared/contracts";

let sessionToken: string | undefined;

async function getSessionToken(): Promise<string> {
  if (sessionToken) return sessionToken;
  const response = await fetch("/api/session");
  if (!response.ok) throw new Error("Não foi possível iniciar uma sessão local.");
  sessionToken = ((await response.json()) as SessionResponse).token;
  return sessionToken;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  if (init?.method && init.method !== "GET") headers.set("X-A11y-Session", await getSessionToken());
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Pedido inválido." })) as { code?: string; error?: string };
    const error = new Error(body.error ?? "Pedido inválido.") as Error & { code?: string };
    error.code = body.code;
    throw error;
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const api = {
  create: (input: CreateScanRequest) => request<StoredScan>("/api/scans", { method: "POST", body: JSON.stringify(input) }),
  get: (id: string) => request<StoredScan>(`/api/scans/${encodeURIComponent(id)}`),
  list: (status?: string) => request<ScanListResponse>(`/api/scans?page=1&pageSize=20${status ? `&status=${status}` : ""}`),
  remove: (id: string) => request<void>(`/api/scans/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
