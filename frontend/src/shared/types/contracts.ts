/**
 * Типы по черновым контрактам backend (contracts/*.md).
 * Контракты ещё переделываются — этот файл правится вслед за ними.
 */

export type ObjectType = 'warehouse' | 'airport' | 'medical';
export type AvailabilityStatus = 'available' | 'limited' | 'discontinued' | 'upcoming';
export type AcquisitionModel = 'purchase' | 'leasing' | 'raas';
export type MatchStatus = 'recommended' | 'needs_review' | 'excluded';
export type ScenarioKind = 'baseline' | 'purchase' | 'raas' | 'custom';
export type FinancingType = 'own_funds' | 'credit' | 'leasing' | 'raas';
export type ProjectStatus = 'draft' | 'calculated' | 'archived';
export type ZoneType = 'storage' | 'operation' | 'charging' | 'restricted' | 'transit';

export interface WarehouseParams {
  object_type: 'warehouse';
  area_sqm: number;
  working_zones: string[];
  operating_mode: string;
  inbound_ops_per_day: number;
  internal_ops_per_day: number;
  outbound_ops_per_day: number;
  storage_type: string;
  sku_count: number;
  unit_load_weight_kg: number;
  unit_load_dimensions_mm: string;
  staff_count: number;
  staff_cost_per_month: number;
  current_throughput_per_hour: number;
  route_length_m: number;
  available_area_sqm: number | null;
  layout_constraints: string[];
}

export interface AirportParams {
  object_type: 'airport';
  operation_zone: string;
  operating_mode: string;
  passenger_flow_per_day: number | null;
  cargo_flow_tons_per_day: number | null;
  ops_count_per_day: number;
  peak_load_per_hour: number;
  route_length_m: number;
  unit_weight_kg: number;
  unit_dimensions_mm: string;
  staff_count: number;
  staff_cost_per_month: number;
  safety_requirements: string[];
  zone_access: 'closed' | 'open';
}

export interface MedicalParams {
  object_type: 'medical';
  facility_type: string;
  area_sqm: number;
  floors_count: number;
  operating_mode: string;
  cargo_volume_per_day: Record<string, number>;
  routes_and_elevators: string[];
  sanitary_requirements: string[];
  staff_count: number;
  staff_cost_per_month: number;
  access_restrictions: string[];
}

export type ObjectParams = WarehouseParams | AirportParams | MedicalParams;

export interface ProjectInput {
  id: string;
  project_id: string;
  object_type: ObjectType;
  params: ObjectParams;
  created_at: string;
  source: 'manual' | 'excel_import' | 'csv_import';
}

export interface MatchFactor {
  name: string;
  weight: number;
  contribution: number;
  note: string | null;
}

export interface MatchCandidate {
  catalog_item_id: string;
  status: MatchStatus;
  score: number;
  factors: MatchFactor[];
  reasons: string[];
  quantity_if_selected: number | null;
}

export interface MatchResult {
  id: string;
  project_id: string;
  project_input_id: string;
  generated_at: string;
  candidates: MatchCandidate[];
  selected_equipment: { catalog_item_id: string; quantity: number }[];
  manual_additions: string[];
}

export interface SensitivityResultPoint {
  parameter: string;
  delta_pct: number;
  resulting_payback_years: number;
  resulting_roi_pct: number;
}

export interface EconomicsResult {
  scenario_id: string;
  project_id: string;
  scenario_kind: ScenarioKind;
  capex_total: number;
  capex_breakdown: Record<string, number>;
  opex_annual: number;
  opex_breakdown: Record<string, number>;
  opex_delta_vs_baseline: number;
  annual_effect: number;
  payback_years: number | null;
  roi_pct: number;
  tco_total: number;
  sensitivity: SensitivityResultPoint[];
  calculated_at: string;
  assumptions_note: string;
}

export interface ProjectRecord {
  id: string;
  owner_user_id: string;
  name: string;
  object_type: ObjectType;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  current_version: number;
}

// ---------------------------------------------------------------------------
// Каталог (contracts/catalog.md)
// ---------------------------------------------------------------------------

export type NavigationType = 'lidar_slam' | 'visual_slam' | 'magnetic_tape' | 'qr_markers' | 'wire_guided' | 'other';
export type DataConfidence = 'verified' | 'partial' | 'unverified';

export interface CatalogItem {
  id: string;
  identification: {
    manufacturer: string;
    product_name: string;
    solution_type: string;
    purpose: string;
    country: string;
    availability_status: AvailabilityStatus;
  };
  technical: {
    payload_kg: number | null;
    dimensions_mm: string | null;
    speed_mps: number | null;
    throughput_per_hour: number | null;
    autonomy_hours: number | null;
    positioning_accuracy_mm: number | null;
    navigation_type: NavigationType | null;
    operating_conditions: string | null;
  };
  infrastructure: {
    aisle_width_mm: number | null;
    charging_type: string | null;
    connectivity: string | null;
    integration_notes: string | null;
    service_model: string | null;
  };
  economics: {
    equipment_cost: number | null;
    software_cost: number | null;
    implementation_cost: number | null;
    maintenance_cost_per_year: number | null;
    acquisition_model: AcquisitionModel;
    service_life_years: number | null;
  };
  applicability: {
    supported_object_types: string[];
    supported_processes: string[];
    limitations: string[];
    case_studies: string[];
  };
  data_quality: {
    source: string;
    source_url: string | null;
    last_updated: string;
    confidence: DataConfidence;
  };
  tags: string[];
  attributes: Record<string, string | number | boolean>;
}

// ---------------------------------------------------------------------------
// Совместимость (contracts/compatibility.md)
// ---------------------------------------------------------------------------

export type CompatibilityVerdict = 'allowed' | 'forbidden' | 'warning' | 'needs_review';
export type RuleOperator = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'has_tag';

export interface RuleCondition {
  key: string;
  operator: RuleOperator;
  value: string | number | boolean | string[];
}

export interface CompatibilityRule {
  id: string;
  equipment_condition: RuleCondition;
  object_condition: RuleCondition;
  verdict: CompatibilityVerdict;
  reason: string;
  source: string | null;
}

// ---------------------------------------------------------------------------
// Сценарии (contracts/economics.md)
// ---------------------------------------------------------------------------

export interface ScenarioInput {
  project_id: string;
  match_result_id: string;
  scenario_kind: ScenarioKind;
  financing_type: FinancingType;
  staff_cost_per_month: number;
  operating_hours_per_year: number;
  load_factor: number;
  horizon_years: number;
  assumptions_overrides: Record<string, number>;
}

// ---------------------------------------------------------------------------
// План объекта (contracts/topology.md, версия 2). В api-routes.md — Scene.
// ---------------------------------------------------------------------------

export interface Point2D {
  x: number;
  y: number;
}

/** Границы объекта: прямоугольник сцены в метрах */
export interface Bounds {
  origin: Point2D;
  width_m: number;
  height_m: number;
}

/** Подложка-чертёж: в плане только ссылка, файл грузится отдельной ручкой */
export interface SceneBackground {
  background_id: string;
  url: string;
  width_px: number;
  height_px: number;
  /** Калибровка: сколько метров в пикселе */
  scale_m_per_px: number;
  offset: Point2D;
  rotation_deg: number;
  opacity: number;
}

export interface Wall {
  id: string;
  name: string | null;
  points: Point2D[];
  thickness_m: number;
  tags: string[];
}

export interface Zone {
  id: string;
  name: string;
  zone_type: ZoneType;
  /** id из categories.json → working_zones: связь с рабочими зонами формы */
  category_id: string | null;
  polygon: Point2D[];
  tags: string[];
}

export interface Route {
  id: string;
  name: string | null;
  points: Point2D[];
  /** two_way / one_way — от первой точки ломаной к последней */
  direction: 'two_way' | 'one_way';
  from_point_id: string | null;
  to_point_id: string | null;
  tags: string[];
}

export interface OperationPoint {
  id: string;
  name: string | null;
  /** id из categories.json → point_kinds */
  kind: string;
  position: Point2D;
  /** Для зарядки — число мест */
  capacity: number;
  tags: string[];
}

export interface RobotPlacement {
  id: string;
  name: string | null;
  /** Пусто допустимо: робот «вообще», без конкретной модели */
  catalog_item_id: string;
  /** Вид робота из categories.json → equipment_categories, когда модель не выбрана */
  category_id: string | null;
  start_position: Point2D;
  start_rotation_deg: number;
  charging_point_id: string | null;
}

/** TopologyConfig, он же Scene в api-routes.md */
export interface TopologyConfig {
  id: string;
  project_id: string;
  scale_m_per_unit: number;
  bounds: Bounds | null;
  background: SceneBackground | null;
  walls: Wall[];
  zones: Zone[];
  routes: Route[];
  operation_points: OperationPoint[];
  robots: RobotPlacement[];
}
