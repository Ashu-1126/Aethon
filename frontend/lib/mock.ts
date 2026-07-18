// AETHON — mock data layer.
// Returns the SAME shapes as the real API so the frontend works with
// NEXT_PUBLIC_USE_MOCK=true, before P2's backend exists.
// Each function returns a Promise + small delay to mimic real network latency.

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

const delay = <T>(data: T, ms = 600): Promise<T> =>
  new Promise((res) => setTimeout(() => res(data), ms));

export const mockHealth: HealthStatus = {
  status: "ok",
  model: "llama3.1:8b",
  corpus_docs: 4182,
};

export const mockDocuments: Document[] = [
  { id: "d1", name: "Factory_Act_1948.pdf", type: "regulation", status: "indexed", pages: 120, ingested_at: "2026-06-29T10:00:00Z" },
  { id: "d2", name: "OISD-116.pdf", type: "regulation", status: "indexed", pages: 84, ingested_at: "2026-06-29T10:05:00Z" },
  { id: "d3", name: "OISD-105.pdf", type: "regulation", status: "indexed", pages: 60, ingested_at: "2026-06-29T10:08:00Z" },
  { id: "d4", name: "SOP-44.docx", type: "procedure", status: "indexed", pages: 6, ingested_at: "2026-06-29T10:12:00Z" },
  { id: "d5", name: "OEM_Pump_Manual.pdf", type: "manual", status: "indexed", pages: 210, ingested_at: "2026-06-29T10:20:00Z" },
  { id: "d6", name: "PID_Unit4.pdf", type: "drawing", status: "embedding", pages: 1, ingested_at: "2026-06-29T11:00:00Z" },
];

const mockAnswers: Record<string, QueryResponse> = {
  default: {
    answer:
      "Confined-space entry requires continuous atmospheric monitoring and a posted standby person. SOP-44 omits continuous monitoring (required by Factory Act §36(1)(b)) and conflicts with the standby-person rule in OISD-105 §9.4. Recommend revising SOP-44 before the next entry permit is issued.",
    sources: [
      { doc_name: "Factory_Act_1948.pdf", page: 42, snippet: "Continuous monitoring of the atmosphere shall be maintained throughout the period of entry…" },
      { doc_name: "OISD-105.pdf", page: 18, snippet: "A standby person shall be posted at the entrance of the confined space…" },
      { doc_name: "SOP-44.docx", page: 3, snippet: "Atmospheric check to be performed prior to entry." },
    ],
    confidence: 94,
  },
  rca: {
    answer:
      "Bearing failures on Pump P-204 correlate with a lubrication-interval deviation logged across 3 work orders. Root cause: procedure MP-12 specifies a 90-day interval, but the OEM manual mandates 60 days.",
    sources: [
      { doc_name: "WorkOrder_log.xlsx", page: 1, snippet: "P-204 bearing replaced — 3rd occurrence this year." },
      { doc_name: "OEM_Pump_Manual.pdf", page: 7, snippet: "Re-lubricate bearings every 60 days under continuous duty." },
      { doc_name: "MP-12.docx", page: 2, snippet: "Lubrication interval: 90 days." },
    ],
    confidence: 89,
  },
};

export const mockQuery = (q: string): QueryResponse => {
  const lc = q.toLowerCase();
  if (lc.includes("p-204") || lc.includes("fail") || lc.includes("pump")) return mockAnswers.rca;
  return mockAnswers.default;
};

export const mockGraph: GraphData = {
  nodes: [
    { id: "eq", label: "Pump P-204", type: "equipment", x: 50, y: 48 },
    { id: "reg1", label: "OISD-116 §7.2", type: "regulation", x: 22, y: 22 },
    { id: "reg2", label: "Factory Act §36", type: "regulation", x: 78, y: 20 },
    { id: "proc", label: "SOP-44", type: "procedure", x: 20, y: 74 },
    { id: "inc", label: "Near-miss #1187", type: "incident", x: 80, y: 72 },
    { id: "man", label: "OEM Manual", type: "document", x: 50, y: 86 },
    { id: "wo", label: "WorkOrder #5521", type: "document", x: 14, y: 48 },
  ],
  edges: [
    { from: "eq", to: "reg1", relation: "governed_by" },
    { from: "eq", to: "reg2", relation: "governed_by" },
    { from: "eq", to: "proc", relation: "operated_via" },
    { from: "eq", to: "inc", relation: "involved_in" },
    { from: "eq", to: "man", relation: "documented_by" },
    { from: "eq", to: "wo", relation: "serviced_by" },
    { from: "proc", to: "reg2", relation: "must_comply" },
    { from: "inc", to: "man", relation: "references" },
  ],
};

export const mockCompliance: ComplianceAudit = {
  overall_score: 92,
  standards: [
    { standard: "Factory Act", score: 96, gaps: [] },
    { standard: "OISD-116", score: 91, gaps: [{ clause: "§7.2", issue: "No continuous monitoring in SOP-44" }] },
    { standard: "DGMS", score: 88, gaps: [{ clause: "Circular 2019", issue: "Rescue-equipment check undocumented" }] },
    { standard: "PESO", score: 84, gaps: [{ clause: "Rule 14", issue: "Pressure-vessel inspection overdue" }] },
  ],
};

export const mockConflicts: Conflict[] = [
  { doc_a: "OEM_Pump_Manual.pdf", doc_b: "MP-12.docx", field: "lubrication_interval", value_a: "60 days", value_b: "90 days" },
  { doc_a: "SOP-44.docx", doc_b: "OISD-105.pdf", field: "standby_person", value_a: "optional", value_b: "mandatory" },
];

export const mockDashboard: DashboardStats = {
  docs_indexed: 4182,
  relationships: 38914,
  compliance_score: 92,
  open_conflicts: 7,
  feed: [
    { text: "P&ID drawing · Unit 4 cooling loop", tag: "ingested", time: "2m" },
    { text: "Conflict: torque spec 40 Nm vs 55 Nm (Pump P-204)", tag: "flagged", time: "11m" },
    { text: "OISD-116 §7.2 mapped to 14 procedures", tag: "linked", time: "26m" },
    { text: "RCA generated · recurring bearing failure", tag: "insight", time: "1h" },
    { text: "Audit evidence package · Factory Act", tag: "exported", time: "2h" },
  ],
};

export const mockScoreboard: Scoreboard = {
  answer_accuracy: 91,
  citation_precision: 94,
  avg_answer_seconds: 2.4,
  keyword_baseline_seconds: 480,
  questions_evaluated: 20,
};

// RCA returns the same {answer, sources, confidence} shape the RCA page expects
// (NOT the copilot-shaped QueryResponse). Keyed by equipment id/name.
const mockRca: Record<string, { answer: string; sources: Source[]; confidence: number }> = {
  default: {
    answer:
      "Bearing failures on Pump P-204 correlate with a lubrication-interval deviation logged across 3 work orders. Root cause: procedure MP-12 specifies a 90-day interval, but the OEM manual mandates 60 days — the resulting under-lubrication accelerates bearing wear and thermal runaway.",
    sources: [
      { doc_name: "WorkOrder_log.xlsx", page: 1, snippet: "P-204 bearing replaced — 3rd occurrence this year." },
      { doc_name: "OEM_Pump_Manual.pdf", page: 7, snippet: "Re-lubricate bearings every 60 days under continuous duty." },
      { doc_name: "MP-12.docx", page: 2, snippet: "Lubrication interval: 90 days." },
    ],
    confidence: 89,
  },
};

export const mockRcaFor = (equipment: string) => {
  const lc = equipment.toLowerCase();
  if (lc.includes("p-204") || lc.includes("pump")) return mockRca.default;
  return {
    answer: `No specific failure history was found for "${equipment}" in the indexed work orders. Recommend reviewing its maintenance log and OEM manual for recurring signatures.`,
    sources: [],
    confidence: 60,
  };
};

// Async wrappers (mirror the api.ts surface)
export const mock = {
  health: () => delay(mockHealth, 200),
  documents: () => delay(mockDocuments),
  query: (q: string) => delay(mockQuery(q), 1400),
  upload: (file: File) =>
    delay<Document>({
      id: `d-${Math.round(performance.now())}`,
      name: file.name,
      type: "document",
      status: "queued",
      pages: 0,
      ingested_at: new Date().toISOString(),
    }, 400),
  graph: () => delay(mockGraph),
  compliance: () => delay(mockCompliance),
  conflicts: () => delay(mockConflicts),
  dashboard: () => delay(mockDashboard),
  scoreboard: () => delay(mockScoreboard),
  rca: (equipment: string) => delay(mockRcaFor(equipment)),
};
