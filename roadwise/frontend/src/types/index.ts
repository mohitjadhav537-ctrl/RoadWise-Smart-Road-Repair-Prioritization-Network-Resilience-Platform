// ─── Auth ───────────────────────────────────────────────────────────────────
export type Role =
  | 'admin'
  | 'engineer'
  | 'inspector'
  | 'planner'
  | 'approver'
  | 'auditor'
  | 'viewer';

export type SeverityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type SegmentStatus = 'active' | 'under_repair' | 'closed' | 'inspection_pending';
export type ReportStatus = 'submitted' | 'under_review' | 'verified' | 'rejected' | 'resolved';
export type WorkOrderStatus = 'proposed' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export interface User {
  id: string | number;
  username: string;
  email: string;
  full_name?: string;
  role: Role;
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id?: string;
  username?: string;
  role?: Role;
  user?: User;
}

// ─── Road Assets ─────────────────────────────────────────────────────────────
export interface RoadSegment {
  id: string;
  name: string;
  from_node_id?: string;
  to_node_id?: string;
  from_node?: string;
  to_node?: string;
  length_m: number;
  length_km?: number;
  surface_type: string;
  condition: string;
  severity: number;
  traffic_importance: number;
  connectivity_importance: number;
  is_closed: boolean;
  repair_cost: number;
  repair_duration_days: number;
  coordinates?: [number, number][]; // [ [lng, lat], [lng, lat] ]
}

export interface Intersection {
  id: string;
  name: string;
  lat: number;
  lng: number;
  is_critical: boolean;
  critical_type?: string;
}

export interface MapDataResponse {
  segments: RoadSegment[];
  intersections: Intersection[];
}

// ─── Damage Reports ───────────────────────────────────────────────────────────
export interface DamageReport {
  id: string;
  segment_id: string;
  defect_category: string;
  severity: number;
  inspection_date?: string;
  lat?: number;
  lng?: number;
  description: string;
  verification_status: string;
  engineer_comments?: string;
}

// ─── Priorities ───────────────────────────────────────────────────────────────
export interface WeightsConfig {
  w_severity: number;
  w_traffic: number;
  w_connectivity: number;
  w_delay_risk: number;
}

export interface PriorityScore {
  segment_id: string;
  segment_name?: string;
  priority_score: number;
  severity: number;
  traffic_importance: number;
  connectivity_importance: number;
  delay_risk: number;
  repair_cost: number;
  repair_duration_days: number;
  is_safety_critical: boolean;
}

// ─── Budget ───────────────────────────────────────────────────────────────────
export interface BudgetJob {
  segment_id: string;
  cost: number;
  priority_score?: number;
}

export interface BudgetScenario {
  scenario_id?: string;
  id?: string;
  name: string;
  total_budget: number;
  total_cost: number;
  remaining_budget: number;
  total_score: number;
  algorithm_used?: string;
  run_at?: string;
  selected_jobs?: BudgetJob[];
  rejected_jobs?: BudgetJob[];
  comparison?: {
    baseline_greedy: { total_cost: number; total_score: number };
    optimized_plan: { total_cost: number; total_score: number };
  };
}

// ─── Work Orders ──────────────────────────────────────────────────────────────
export interface WorkOrder {
  id: string;
  segment_id: string;
  treatment_description: string;
  estimated_cost: number;
  actual_cost?: number;
  assigned_crew: string;
  status: string;
  approval_status: string;
  planned_start: string;
  planned_end: string;
}

// ─── Closure Simulation ───────────────────────────────────────────────────────
export interface ClosureSimResult {
  is_reroutable: boolean;
  disconnected_nodes_count: number;
  disconnected_nodes: string[];
  unreachable_critical_destinations: string[];
  alternate_path: string[];
}

// ─── Audit ────────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  username: string;
  action: string;
  entity_type: string;
  timestamp: string;
  details: string;
}

// ─── KPI / Charts ─────────────────────────────────────────────────────────────
export interface KPIData {
  total_segments: number;
  verified_damaged: number;
  high_priority: number;
  pending_inspections: number;
  planned_spend: number;
  remaining_budget: number;
  active_work_orders: number;
  completed_repairs: number;
}

export interface ChartData {
  defects_by_severity: { severity: number; count: number }[];
  repairs_by_status: { name: string; value: number }[];
  cost_by_category: { category: string; cost: number }[];
  budget_breakdown: { name: string; amount: number }[];
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip?: number;
  limit?: number;
}
