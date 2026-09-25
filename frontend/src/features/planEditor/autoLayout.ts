/**
 * Черновик плана по параметрам формы: границы объекта, контур стен, зоны
 * полосами по рабочим зонам, точки операций и зарядка, роботы у зарядки.
 * Нужен, чтобы пользователь не начинал с пустого холста, и чтобы проверять
 * цепочку форма → план → сервер. Редактор может брать его как стартовое состояние.
 */

import { CATEGORIES, resolveId, workingZone } from '../../shared/dictionaries';
import type { Bounds, TopologyConfig, Zone } from '../../shared/types/contracts';
import type { PlanEditorContext } from './types';

const rect = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

/** Стандартный размер черновика, когда площади в форме нет (аэропорт), м */
const DEFAULT_SIZE = { width: 100, depth: 60 };

/**
 * Размер объекта для черновика. У аэропорта площади в форме нет — её нет и в
 * ТЗ, — поэтому рисуем стандартный прямоугольник, а пользователь растянет
 * границы на плане под свой объект (решение от 25.09.2026).
 */
export function estimateSize(ctx: PlanEditorContext): { width: number; depth: number; source: 'area' | 'default' } {
  if (ctx.areaSqm && ctx.areaSqm > 0) {
    const width = Math.round(Math.sqrt((ctx.areaSqm * 5) / 3));
    return { width, depth: Math.round(ctx.areaSqm / width), source: 'area' };
  }
  return { ...DEFAULT_SIZE, source: 'default' };
}

export function autoLayout(projectId: string, ctx: PlanEditorContext): TopologyConfig {
  const { width, depth } = estimateSize(ctx);

  const zoneIds = ctx.workingZoneIds.length ? ctx.workingZoneIds : ['receiving', 'storage', 'shipping'];
  const withCharging = zoneIds.some((id) => resolveId('working_zones', id) === 'charging') ? zoneIds : [...zoneIds, 'charging'];
  const aisle = Math.max(3, Math.ceil((ctx.minAisleWidthM ?? 2) + 1));
  const usable = width - aisle * (withCharging.length + 1);
  const weights = withCharging.map((id) => {
    const canonical = resolveId('working_zones', id);
    return canonical === 'storage' ? 3 : canonical === 'charging' ? 0.6 : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);

  let x = aisle;
  const zones: Zone[] = withCharging.map((id, i) => {
    const w = Math.max(4, Math.round((usable * weights[i]) / total));
    const canonical = resolveId('working_zones', id);
    const wz = workingZone(canonical);
    const label = wz?.label ?? (id.startsWith('custom:') ? id.slice(7) : id);
    const zone: Zone = {
      id: `z-${i + 1}`,
      name: label,
      zone_type: wz?.zone_type ?? 'operation',
      category_id: wz ? canonical : null,
      polygon: rect(x, aisle, w, depth - aisle * 2),
      tags: [],
    };
    x += w + aisle;
    return zone;
  });

  const charging = zones.find((z) => z.zone_type === 'charging') ?? zones[zones.length - 1];
  const cx = charging.polygon[0].x;
  const cy = charging.polygon[0].y;
  const cw = charging.polygon[1].x - cx;
  const cBottom = charging.polygon[2].y;

  const robotsFlat = ctx.robots.flatMap((r) => Array.from({ length: r.quantity }, () => r));
  const perRow = Math.max(1, Math.floor(cw / 2.5));

  const chargingPoint = {
    id: 'ch-1',
    name: 'Зарядная станция',
    kind: 'charging',
    // Зарядка — у нижнего края зоны: сверху подпись и стоянка роботов
    position: { x: cx + cw / 2, y: cBottom - 3 },
    // Одно место зарядки на четырёх роботов — столько успевает обслужить станция
    capacity: Math.max(1, Math.ceil(robotsFlat.length / 4)),
    tags: [],
  };

  const operationPoints = zones
    .filter((z) => z.zone_type === 'operation')
    .map((z, i) => ({
      id: `op-${i + 1}`,
      name: `Точка: ${z.name}`,
      kind: 'operation',
      position: { x: (z.polygon[0].x + z.polygon[1].x) / 2, y: depth / 2 },
      capacity: 1,
      tags: [],
    }));

  const bounds: Bounds = { origin: { x: 0, y: 0 }, width_m: width, height_m: depth };
  const first = operationPoints[0];
  const last = operationPoints[operationPoints.length - 1] ?? first;

  return {
    id: '',
    project_id: projectId,
    scale_m_per_unit: 1,
    bounds,
    background: null,
    walls: [
      {
        id: 'w-outline',
        name: 'Контур здания',
        points: [...rect(0, 0, width, depth), { x: 0, y: 0 }],
        thickness_m: 0.4,
        tags: ['outline'],
      },
    ],
    zones,
    routes: [
      {
        id: 'r-main',
        name: 'Главный проезд',
        points: [
          { x: aisle / 2, y: depth / 2 },
          { x: width - aisle / 2, y: depth / 2 },
        ],
        direction: 'two_way',
        from_point_id: first?.id ?? null,
        to_point_id: last?.id ?? null,
        tags: ['main'],
      },
    ],
    operation_points: [...operationPoints, chargingPoint],
    robots: robotsFlat.map((r, i) => ({
      id: `rb-${i + 1}`,
      name: `${r.name} №${i + 1}`,
      catalog_item_id: r.catalog_item_id,
      category_id: r.category_id ? resolveId('equipment_categories', r.category_id) : null,
      start_position: { x: cx + 1.5 + (i % perRow) * 2.5, y: cy + 5 + Math.floor(i / perRow) * 2.5 },
      start_rotation_deg: 90,
      charging_point_id: chargingPoint.id,
    })),
  };
}

export const ZONE_COLOR = Object.fromEntries(CATEGORIES.zone_types.map((z) => [z.id, z.color]));
