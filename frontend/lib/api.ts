// AETHON — typed API client.
// Single fetch helper + namespaced endpoint functions.
// Falls back to lib/mock.ts when NEXT_PUBLIC_USE_MOCK=true.

import { mock } from "./mock";
import type {
  Document,
  QueryResponse,
  GraphData,
  ComplianceAudit,
  Conflict,
  DashboardStats,
  Scoreboard,
  HealthStatus,
  Source,
} from "./types";

export type RcaResult = {
  answer: string;
  sources: Source[];
  confidence: number;
};

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/** Typed error so callers can distinguish network failure from HTTP errors. */
export class ApiError extends Error {
  status: number;
  /** true when the request never reached the server (backend offline / CORS). */
  offline: boolean;
  constructor(message: string, status = 0, offline = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.offline = offline;
  }
}

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("aethon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        // don't set JSON content-type for FormData uploads
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...authHeader(),
        ...(init.headers || {}),
      },
    });
  } catch {
    // fetch only rejects on network-level failure (server down, CORS, DNS)
    throw new ApiError("Backend offline — could not reach the server.", 0, true);
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("aethon_token");
        localStorage.removeItem("aethon_role");
        window.location.href = "/login";
        // Halt execution to prevent the UI from flickering an error state
        await new Promise(() => {});
      }
    }

    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, res.status);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Namespaced endpoints ──────────────────────────────────────────────

export const auth = {
  login: async (username: string, password: string): Promise<{ token: string; role: string }> => {
    return apiFetch<{ token: string; role: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
};

export const health = {
  check: (): Promise<HealthStatus> =>
    USE_MOCK ? mock.health() : apiFetch<HealthStatus>("/health"),
};

export const copilot = {
  query: (query: string): Promise<QueryResponse> =>
    USE_MOCK
      ? mock.query(query)
      : apiFetch<QueryResponse>("/copilot/query", {
          method: "POST",
          body: JSON.stringify({ query }),
        }),
};

export const documents = {
  list: (): Promise<Document[]> =>
    USE_MOCK
      ? mock.documents()
      : apiFetch<{ documents: Document[] }>("/documents").then((r) => r.documents),

  upload: (file: File): Promise<Document> => {
    if (USE_MOCK) return mock.upload(file);
    const form = new FormData();
    form.append("file", file);
    return apiFetch<Document>("/ingest", { method: "POST", body: form });
  },
};

export const graph = {
  get: (): Promise<GraphData> =>
    USE_MOCK ? mock.graph() : apiFetch<GraphData>("/graph"),
};

export const compliance = {
  audit: (): Promise<ComplianceAudit> =>
    USE_MOCK ? mock.compliance() : apiFetch<ComplianceAudit>("/compliance/audit"),

  rewrite: async (clause: string, issue: string): Promise<{ rewrite: string }> => {
    if (USE_MOCK) {
      return { rewrite: "Compliant SOP rewrite: Ensure continuous atmospheric testing of confined spaces is performed and recorded at intervals not exceeding 30 minutes, or as otherwise mandated by the safety supervisor." };
    }
    return apiFetch<{ rewrite: string }>("/compliance/rewrite", {
      method: "POST",
      body: JSON.stringify({ clause, issue }),
    });
  },
};

export const conflicts = {
  list: (): Promise<Conflict[]> =>
    USE_MOCK
      ? mock.conflicts()
      : apiFetch<{ conflicts: Conflict[] }>("/conflicts").then((r) => r.conflicts),
};

export const dashboard = {
  stats: (): Promise<DashboardStats> =>
    USE_MOCK ? mock.dashboard() : apiFetch<DashboardStats>("/dashboard/stats"),
};

export const scoreboard = {
  get: (): Promise<Scoreboard> =>
    USE_MOCK ? mock.scoreboard() : apiFetch<Scoreboard>("/scoreboard"),
};

export const rca = {
  get: (equipment: string): Promise<RcaResult> =>
    USE_MOCK ? mock.rca(equipment) : apiFetch<RcaResult>(`/rca/${encodeURIComponent(equipment)}`),
};

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
export const IS_MOCK = USE_MOCK;
