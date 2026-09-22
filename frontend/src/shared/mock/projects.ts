import type { ObjectType, ProjectRecord, WarehouseParams } from '../types/contracts';
import type { WizardStepSlug } from '../config/routes';

/** Запись списка проектов + то, что списку нужно поверх контракта. */
export interface ProjectListItem extends ProjectRecord {
  /** Последний пройденный шаг визарда */
  last_step: WizardStepSlug;
  /** Лучший срок окупаемости среди сценариев, лет */
  best_payback_years: number | null;
  scenarios_count: number;
  site: string;
}

export const PROJECTS: ProjectListItem[] = [
  {
    id: 'p-leningradka',
    owner_user_id: 'u-1',
    name: 'Склад на Ленинградке',
    object_type: 'warehouse',
    status: 'calculated',
    created_at: '2026-08-28T09:12:00+03:00',
    updated_at: '2026-09-18T16:40:00+03:00',
    current_version: 3,
    last_step: 'export',
    best_payback_years: 2.4,
    scenarios_count: 4,
    site: 'Химки, 12 500 м²',
  },
  {
    id: 'p-svo-baggage',
    owner_user_id: 'u-1',
    name: 'Багажное отделение, терминал B',
    object_type: 'airport',
    status: 'draft',
    created_at: '2026-09-10T11:03:00+03:00',
    updated_at: '2026-09-20T10:15:00+03:00',
    current_version: 1,
    last_step: 'matching',
    best_payback_years: null,
    scenarios_count: 0,
    site: 'Багажное отделение',
  },
  {
    id: 'p-gkb-7',
    owner_user_id: 'u-1',
    name: 'ГКБ №7: доставка между корпусами',
    object_type: 'medical',
    status: 'calculated',
    created_at: '2026-07-14T14:22:00+03:00',
    updated_at: '2026-09-05T12:00:00+03:00',
    current_version: 2,
    last_step: 'scenarios',
    best_payback_years: 3.8,
    scenarios_count: 3,
    site: '6 корпусов, 9 этажей',
  },
  {
    id: 'p-rc-south',
    owner_user_id: 'u-1',
    name: 'РЦ «Южный», зона комплектации',
    object_type: 'warehouse',
    status: 'draft',
    created_at: '2026-09-19T08:40:00+03:00',
    updated_at: '2026-09-19T08:52:00+03:00',
    current_version: 1,
    last_step: 'params',
    best_payback_years: null,
    scenarios_count: 0,
    site: 'Ростов-на-Дону, 34 000 м²',
  },
  {
    id: 'p-old-kazan',
    owner_user_id: 'u-1',
    name: 'Казань, пилот 2025',
    object_type: 'warehouse',
    status: 'archived',
    created_at: '2025-11-02T10:00:00+03:00',
    updated_at: '2026-02-11T17:30:00+03:00',
    current_version: 5,
    last_step: 'export',
    best_payback_years: 4.6,
    scenarios_count: 3,
    site: 'Казань, 8 000 м²',
  },
];

export const projectById = (id: string | undefined) => PROJECTS.find((p) => p.id === id);

/** Проект по id, а для неизвестных id — демо-проект, чтобы любые ссылки открывались. */
export function projectOrDemo(id: string | undefined): ProjectListItem {
  return projectById(id) ?? { ...PROJECTS[0], id: id ?? PROJECTS[0].id };
}

export const DEMO_WAREHOUSE_PARAMS: WarehouseParams = {
  object_type: 'warehouse',
  area_sqm: 12_500,
  working_zones: ['receiving', 'storage', 'picking', 'shipping'],
  operating_mode: '24/7',
  inbound_ops_per_day: 1200,
  internal_ops_per_day: 3400,
  outbound_ops_per_day: 1100,
  storage_type: 'selective_rack',
  sku_count: 8400,
  unit_load_weight_kg: 450,
  unit_load_dimensions_mm: '1200×800×1450',
  staff_count: 46,
  staff_cost_per_month: 95_000,
  current_throughput_per_hour: 120,
  route_length_m: 1800,
  available_area_sqm: 4200,
  layout_constraints: ['narrow_aisles_2_5', 'columns_6x6'],
};

export interface ProjectVersionItem {
  version: number;
  created_at: string;
  author: string;
  summary: string;
  scenarios: number;
  best_payback_years: number | null;
  is_current: boolean;
}

export const VERSIONS: ProjectVersionItem[] = [
  {
    version: 3,
    created_at: '2026-09-18T16:40:00+03:00',
    author: 'Иван Петров',
    summary: 'Добавлен сценарий «Кредит 18 %», горизонт 5 лет',
    scenarios: 4,
    best_payback_years: 2.4,
    is_current: true,
  },
  {
    version: 2,
    created_at: '2026-09-10T12:05:00+03:00',
    author: 'Иван Петров',
    summary: 'Персонал 52 → 46 человек, пересчитан подбор',
    scenarios: 3,
    best_payback_years: 2.1,
    is_current: false,
  },
  {
    version: 1,
    created_at: '2026-08-28T09:40:00+03:00',
    author: 'Иван Петров',
    summary: 'Первый расчёт',
    scenarios: 3,
    best_payback_years: 2.7,
    is_current: false,
  },
];

export const OBJECT_ICON: Record<ObjectType, string> = {
  warehouse: '▦',
  airport: '✈',
  medical: '✚',
};
