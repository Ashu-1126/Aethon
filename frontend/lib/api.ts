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
  Asset,
  AssetEvent,
  AssetHealth,
  AssetForecast,
  AssetComplianceResult,
  InvestigationReport,
  InvestigationRecord,
  PdmPrediction,
  KnowledgeGapItem,
  WorkOrderPayload,
  ShiftReportPayload,
  EmergencyPlanPayload,
  RiskHeatmapItem,
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
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...authHeader(),
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new ApiError("Backend offline — could not reach the server.", 0, true);
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("aethon_token");
        localStorage.removeItem("aethon_role");
        window.location.href = "/login";
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

  getHistory: (): Promise<{ message: string; response: string; timestamp: string }[]> =>
    USE_MOCK
      ? Promise.resolve([])
      : apiFetch<{ history: { message: string; response: string; timestamp: string }[] }>("/copilot/history").then((r) => r.history),

  clearHistory: (): Promise<{ status: string }> =>
    USE_MOCK
      ? Promise.resolve({ status: "success" })
      : apiFetch<{ status: string }>("/copilot/history", { method: "DELETE" }),
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

  delete: (id: string): Promise<{ status: string }> =>
    USE_MOCK
      ? Promise.resolve({ status: "success" })
      : apiFetch<{ status: string }>(`/documents/${id}`, { method: "DELETE" }),
};

export const graph = {
  get: (): Promise<GraphData> =>
    USE_MOCK ? mock.graph() : apiFetch<GraphData>("/graph"),

  traverse: (label: string, depth = 2): Promise<GraphData & { start_label: string; depth: number; total_nodes: number; total_edges: number }> =>
    apiFetch<GraphData & { start_label: string; depth: number; total_nodes: number; total_edges: number }>(
      `/graph/traverse?label=${encodeURIComponent(label)}&depth=${depth}`
    ),
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

  rescan: (): Promise<{ conflicts: Conflict[]; message: string }> =>
    USE_MOCK
      ? mock.conflicts().then((c) => ({ conflicts: c, message: `${c.length} conflict(s) found.` }))
      : apiFetch<{ conflicts: Conflict[]; message: string }>("/conflicts/rescan", { method: "POST" }),
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

export const assets = {
  list: (params?: { category?: string; criticality?: string }): Promise<Asset[]> => {
    const qs = params
      ? "?" + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")
      : "";
    return apiFetch<{ assets: Asset[] }>(`/assets${qs}`).then((r) => r.assets);
  },

  create: (data: {
    tag: string; name: string; category: string;
    location?: string; criticality?: string;
    manufacturer?: string; model_number?: string; install_date?: string;
  }): Promise<Asset> =>
    apiFetch<{ asset: Asset }>("/assets", { method: "POST", body: JSON.stringify(data) }).then((r) => r.asset),

  get: (tag: string): Promise<Asset> =>
    apiFetch<{ asset: Asset }>(`/assets/${encodeURIComponent(tag)}`).then((r) => r.asset),

  update: (tag: string, fields: Partial<Asset>): Promise<Asset> =>
    apiFetch<{ asset: Asset }>(`/assets/${encodeURIComponent(tag)}`, {
      method: "PUT", body: JSON.stringify(fields),
    }).then((r) => r.asset),

  delete: (tag: string): Promise<{ status: string }> =>
    apiFetch<{ status: string }>(`/assets/${encodeURIComponent(tag)}`, { method: "DELETE" }),

  getEvents: (tag: string): Promise<AssetEvent[]> =>
    apiFetch<{ events: AssetEvent[] }>(`/assets/${encodeURIComponent(tag)}/events`).then((r) => r.events),

  logEvent: (tag: string, event: {
    event_type: string; severity: string; title: string; detail?: string; source?: string;
  }): Promise<AssetEvent> =>
    apiFetch<{ event: AssetEvent }>(`/assets/${encodeURIComponent(tag)}/events`, {
      method: "POST", body: JSON.stringify(event),
    }).then((r) => r.event),

  getDocuments: (tag: string): Promise<string[]> =>
    apiFetch<{ documents: string[] }>(`/assets/${encodeURIComponent(tag)}/documents`).then((r) => r.documents),

  linkDocument: (tag: string, doc_name: string): Promise<{ status: string }> =>
    apiFetch<{ status: string }>(`/assets/${encodeURIComponent(tag)}/documents`, {
      method: "POST", body: JSON.stringify({ doc_name }),
    }),

  health: (tag: string, force = false): Promise<AssetHealth> =>
    apiFetch<AssetHealth>(`/assets/${encodeURIComponent(tag)}/health?force=${force}`),

  forecast: (tag: string, force = false): Promise<AssetForecast> =>
    apiFetch<AssetForecast>(`/assets/${encodeURIComponent(tag)}/forecast?force=${force}`),

  compliance: (tag: string, force = false): Promise<AssetComplianceResult> =>
    apiFetch<AssetComplianceResult>(`/assets/${encodeURIComponent(tag)}/compliance?force=${force}`),

  scan: (tag: string): Promise<{ alerts_logged: number; message: string }> =>
    apiFetch<{ alerts_logged: number; message: string }>(`/assets/${encodeURIComponent(tag)}/scan`, { method: "POST" }),

  heatmap: (): Promise<RiskHeatmapItem[]> =>
    apiFetch<{ heatmap: RiskHeatmapItem[] }>("/risk-heatmap").then((r) => r.heatmap),
};

export const investigations = {
  run: (incident_title: string, asset_tag = ""): Promise<InvestigationReport> =>
    apiFetch<InvestigationReport>("/investigations/run", {
      method: "POST",
      body: JSON.stringify({ incident_title, asset_tag }),
    }),

  list: (asset_tag = ""): Promise<InvestigationRecord[]> =>
    apiFetch<{ investigations: InvestigationRecord[] }>(
      `/investigations${asset_tag ? `?asset_tag=${encodeURIComponent(asset_tag)}` : ""}`
    ).then((r) => r.investigations),

  get: (id: string): Promise<InvestigationRecord> =>
    apiFetch<InvestigationRecord>(`/investigations/${encodeURIComponent(id)}`),
};

export const pdm = {
  getAssetPdm: (tag: string, force = false): Promise<PdmPrediction> =>
    apiFetch<PdmPrediction>(`/predictive/${encodeURIComponent(tag)}?force=${force}`),

  listAll: (): Promise<PdmPrediction[]> =>
    apiFetch<{ predictions: PdmPrediction[] }>("/predictive").then((r) => r.predictions),
};

export const knowledgeGaps = {
  scan: (): Promise<{ gaps_detected: number; gaps: KnowledgeGapItem[]; message: string }> =>
    apiFetch<{ gaps_detected: number; gaps: KnowledgeGapItem[]; message: string }>("/knowledge-gaps/scan"),
};

export const workOrders = {
  generate: (asset_tag: string, issue_description: string, priority = "medium"): Promise<WorkOrderPayload> =>
    apiFetch<WorkOrderPayload>("/work-orders/generate", {
      method: "POST",
      body: JSON.stringify({ asset_tag, issue_description, priority }),
    }),

  list: (asset_tag = ""): Promise<WorkOrderPayload[]> =>
    apiFetch<{ work_orders: WorkOrderPayload[] }>(
      `/work-orders${asset_tag ? `?asset_tag=${encodeURIComponent(asset_tag)}` : ""}`
    ).then((r) => r.work_orders),
};

export const shiftReports = {
  generate: (shift_name = "Day Shift (06:00 - 18:00)", author_role = "Lead Operations Engineer"): Promise<ShiftReportPayload> =>
    apiFetch<ShiftReportPayload>("/shift-reports/generate", {
      method: "POST",
      body: JSON.stringify({ shift_name, author_role }),
    }),

  list: (): Promise<ShiftReportPayload[]> =>
    apiFetch<{ reports: ShiftReportPayload[] }>("/shift-reports").then((r) => r.reports),
};

export const emergencyPlans = {
  generate: (hazard_type: string, asset_tag = "P-204"): Promise<EmergencyPlanPayload> =>
    apiFetch<EmergencyPlanPayload>("/emergency-plans/generate", {
      method: "POST",
      body: JSON.stringify({ hazard_type, asset_tag }),
    }),

  list: (hazard_type = ""): Promise<EmergencyPlanPayload[]> =>
    apiFetch<{ plans: EmergencyPlanPayload[] }>(
      `/emergency-plans${hazard_type ? `?hazard_type=${encodeURIComponent(hazard_type)}` : ""}`
    ).then((r) => r.plans),
};

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
export const IS_MOCK = USE_MOCK;
