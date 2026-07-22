// AETHON — shared domain types. Must match API_CONTRACT.md exactly.
// If P2 changes a response shape, update this file in the same PR.

export type DocType =
  | "regulation"
  | "procedure"
  | "manual"
  | "incident"
  | "drawing"
  | "document";

export type DocStatus =
  | "queued"
  | "parsing"
  | "embedding"
  | "indexed"
  | "failed";

export interface Document {
  id: string;
  name: string;
  type: DocType;
  status: DocStatus;
  pages: number;
  ingested_at: string; // ISO 8601
}

export interface Source {
  doc_name: string;
  page: number;
  snippet: string;
}





export interface SupportingDoc {
  doc_name: string;
  page: number;
  snippet?: string;
}

export interface SupportingGraphNode {
  label: string;
  type: string;
}

export interface ConflictingItem {
  conflict: string;
}

export interface QueryResponse {
  answer: string;
  confidence: number; // 0–100
  reasoning_chain?: string[];
  supporting_documents?: SupportingDoc[];
  supporting_graph_nodes?: SupportingGraphNode[];
  conflicting_evidence?: ConflictingItem[];
  decision_explanation?: string;
  sources: Source[];
}


export type NodeType =
  | "asset"
  | "document"
  | "maintenance"
  | "inspection"
  | "sensor"
  | "incident"
  | "work_order"
  | "spare_part"
  | "operator"
  | "vendor"
  | "regulation"
  | "rca"
  | "compliance"
  | "manual"
  | "equipment"
  | "procedure";


export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  // Optional layout hints. If absent, the frontend computes positions.
  x?: number;
  y?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Gap {
  clause: string;
  issue: string;
}

export interface ComplianceResult {
  standard: string;
  score: number; // 0–100
  gaps: Gap[];
}

export interface PredictedViolation {
  potential_violation: string;
  asset_tag: string;
  days_remaining: number;
  risk_level: "critical" | "high" | "medium" | "low" | string;
  recommended_action: string;
  supporting_regulations: string;
  evidence_ref?: string;
}

export interface ComplianceAudit {
  overall_score: number;
  standards: ComplianceResult[];
  predicted_future_violations?: PredictedViolation[];
}


export interface Conflict {
  doc_a: string;
  doc_b: string;
  field: string;
  value_a: string;
  value_b: string;
  severity?: string;
  recommended_unified_compliance?: string;
}


export interface FeedItem {
  text: string;
  tag: string;
  time: string;
}

export interface DashboardStats {
  docs_indexed: number;
  relationships: number;
  compliance_score: number;
  open_conflicts: number;
  feed: FeedItem[];
}

export interface Scoreboard {
  answer_accuracy: number;
  citation_precision: number;
  avg_answer_seconds: number;
  keyword_baseline_seconds: number;
  questions_evaluated: number;
}

export interface HealthStatus {
  status: string;
  model: string;
  corpus_docs: number;
}

// Ingestion progress pushed over the /ws/ingest WebSocket.
export interface IngestProgress {
  id: string;
  stage: DocStatus;
  progress: number; // 0–100
}

// ── Asset Registry ────────────────────────────────────────────────────────────

export type AssetCategory =
  | "pump"
  | "vessel"
  | "compressor"
  | "valve"
  | "motor"
  | "heat_exchanger"
  | "tank"
  | "reactor"
  | "other";

export type AssetCriticality = "critical" | "high" | "medium" | "low";

export type AssetStatus =
  | "operational"
  | "degraded"
  | "offline"
  | "maintenance";

export type AssetEventType = "alert" | "maintenance" | "inspection" | "incident";

export type EventSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface Asset {
  id: string;
  tag: string;                  // e.g. "P-101"
  name: string;
  category: AssetCategory | string;
  location: string;
  criticality: AssetCriticality | string;
  status: AssetStatus | string;
  manufacturer: string;
  model_number: string;
  install_date: string;
  created_at: string;
  updated_at: string;
}

export interface AssetEvent {
  id: string;
  asset_id: string;
  event_type: AssetEventType | string;
  severity: EventSeverity | string;
  title: string;
  detail: string;
  source: string;
  timestamp: string;
}

export interface RiskFactor {
  factor: string;
  severity: string;
  citation: string;
}

export interface RecommendedAction {
  action: string;
  priority: string;
  timeframe: string;
}

export interface AssetHealth {
  health_score: number;           // 0–100
  status_assessment: string;
  risk_factors: RiskFactor[];
  recommended_actions: RecommendedAction[];
  confidence: number;
  last_known_status: string;
  sources: Source[];
}


export interface ContributingFactor {
  factor: string;
  weight: string;
  citation: string;
}

export interface MaintenanceAction {
  action: string;
  criticality: string;
  estimated_downtime_hours: number;
}

export interface AssetForecast {
  risk_score: number;             // 0–100
  predicted_failure_window_days: number | null;
  failure_mode: string;
  contributing_factors: ContributingFactor[];
  maintenance_actions: MaintenanceAction[];
  next_recommended_maintenance: string | null;
  confidence: number;
  sources: Source[];
}

export interface AssetComplianceGap {
  standard: string;
  clause: string;
  issue: string;
  severity: string;
  citation: string;
}

export interface AssetComplianceResult {
  compliance_score: number;
  gaps: AssetComplianceGap[];
  confidence: number;
  sources: Source[];
}

// ── Autonomous Investigation Engine ───────────────────────────────────────────

export interface ProbableRootCause {
  cause: string;
  probability: number;
  mechanism: string;
  evidence_citations: string[];
}

export interface InvestigationFactor {
  factor: string;
  weight: string;
  citation: string;
}

export interface TimelineEvent {
  timestamp?: string;
  timestamp_or_phase?: string;
  phase?: string;
  source_type?: "operator_logs" | "maintenance_logs" | "sensor_history" | "inspection_reports" | "system_alarms" | string;
  event_title?: string;
  event?: string;
  description?: string;
  severity?: "critical" | "high" | "medium" | "low" | "info" | string;
  evidence_ref?: string;
  evidence_snippet?: string;
}


export interface EvidenceRankItem {
  rank: number;
  source: string;
  relevance_score: number;
  key_finding: string;
}

export interface CorrectiveAction {
  action: string;
  priority: string;
  target_component: string;
}

export interface InvestigationReport {
  investigation_id: string;
  incident_title: string;
  asset_tag: string;
  timestamp: string;
  probable_root_causes: ProbableRootCause[];
  contributing_factors: InvestigationFactor[];
  timeline: TimelineEvent[];
  evidence_ranking: EvidenceRankItem[];
  corrective_actions: CorrectiveAction[];
  overall_confidence: number;
  executive_summary: string;
}

export interface InvestigationRecord {
  id: string;
  incident_title: string;
  asset_tag: string;
  status: string;
  confidence: number;
  summary: string;
  created_at: string;
  updated_at: string;
  report: InvestigationReport;
}

export interface PdmRecommendation {
  action: string;
  priority: string;
  estimated_cost_usd?: number;
  estimated_downtime_hours?: number;
  estimated_production_loss_usd?: number;
  estimated_maintenance_cost_usd?: number;
  estimated_repair_cost_usd?: number;
  risk_reduction_percentage?: number;
  operational_impact?: string;
  roi_multiplier?: number;
}


export interface PdmPrediction {
  asset_tag: string;
  health_score: number;
  remaining_useful_life_days: number;
  remaining_useful_life_hours: number;
  failure_probability_percentage: number;
  criticality_score: number;
  primary_failure_mode: string;
  maintenance_recommendations: PdmRecommendation[];
  recommended_inspection_schedule: string;
  next_inspection_date: string;
  contributing_factors: ContributingFactor[];
  confidence: number;
  timestamp: string;
}

export interface RiskHeatmapFactors {
  criticality_weight: number;
  status_penalty: number;
  failure_probability: number;
  health_score: number;
  recent_events: number;
}

export interface RiskHeatmapItem {
  asset_tag: string;
  asset_name: string;
  category: string;
  location: string;
  status: string;
  criticality: string;
  risk_score: number;
  color_tier: "RED" | "ORANGE" | "YELLOW" | "GREEN";
  badge_label: string;
  color_hex: string;
  factors: RiskHeatmapFactors;
}

export interface KnowledgeGapItem {
  asset_tag: string;
  asset_name: string;
  gap_category: "sop" | "manual" | "inspection" | "maintenance" | "compliance" | "emergency" | string;
  category_label: string;
  severity: "critical" | "high" | "medium" | "low" | string;
  title: string;
  description: string;
  recommended_action: string;
}

export interface ManpowerRequirement {
  role: string;
  count: number;
}

export interface PartRequirement {
  part_number: string;
  description: string;
  quantity: number;
}

export interface WorkOrderPayload {
  wo_id: string;
  asset_tag: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low" | string;
  estimated_duration_hours: number;
  required_manpower: ManpowerRequirement[];
  required_tools: string[];
  required_parts: PartRequirement[];
  safety_checklist: string[];
  required_ppe: string[];
  shutdown_required: boolean;
  dependencies: string[];
  step_by_step_instructions?: string[];
  created_at: string;
}

export interface CompletedWorkItem {
  task: string;
  asset_tag: string;
  status: string;
}

export interface PendingWorkItem {
  task: string;
  asset_tag: string;
  priority: string;
}

export interface OpenAlarmItem {
  title: string;
  severity: string;
  asset_tag: string;
}

export interface MachineStatusSummary {
  asset_tag: string;
  status: string;
  notes: string;
}

export interface MaintenanceDueItem {
  asset_tag: string;
  due_task: string;
  due_in_days: number;
}

export interface IncidentSummaryItem {
  title: string;
  asset_tag: string;
  status: string;
}

export interface ShiftReportPayload {
  report_id: string;
  shift_name: string;
  author_name: string;
  timestamp: string;
  completed_work: CompletedWorkItem[];
  pending_work: PendingWorkItem[];
  open_alarms: OpenAlarmItem[];
  machine_status_summary: MachineStatusSummary[];
  maintenance_due: MaintenanceDueItem[];
  incidents_summary: IncidentSummaryItem[];
  executive_recommendations: string[];
  created_at: string;
}

export interface EvacuationProtocol {
  primary_assembly_point: string;
  secondary_assembly_point: string;
  evacuation_routes: string;
  wind_direction_dependency: string;
}

export interface EmergencyContact {
  role: string;
  phone: string;
}

export interface EmergencyPlanPayload {
  plan_id: string;
  hazard_type: "Fire" | "Gas leak" | "Equipment failure" | "Chemical spill" | "Power failure" | string;
  asset_tag: string;
  title: string;
  emergency_sop: string;
  shutdown_sequence: string[];
  isolation_steps: string[];
  required_ppe: string[];
  evacuation_protocol: EvacuationProtocol;
  emergency_contacts: EmergencyContact[];
  created_at: string;
}
