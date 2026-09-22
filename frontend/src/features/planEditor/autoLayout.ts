/**
 * Черновик плана по параметрам формы: контур здания по площади, зоны
 * полосами по рабочим зонам, точки зарядки, роботы у зарядки. Нужен, чтобы
 * пользователь не начинал с пустого холста, — и чтобы уже сейчас проверить
 * всю цепочку форма → план → сервер. Редактор Алексея может использовать его
 * как стартовое состояние.
 */

import { CATEGORIES, workingZone } from '../../shared/dictionaries';
import type { TopologyConfig, Zone } from '../../shared/types/contracts';
import type { PlanEditorContext } from './types';

const rect = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

export function autoLayout(projectId: string, ctx: PlanEditorContext): TopologyConfig {
  const area = ctx.areaSqm && ctx.areaSqm > 0 ? ctx.areaSqm : 5000;
  // Прямоугольник 5:3 нужной площади
  const width = Math.round(Math.sqrt((area * 5) / 3));
  const depth = Math.round(area / width);

  const zoneIds = ctx.workingZoneIds.length ? ctx.workingZoneIds : ['receiving', 'storage', 'shipping'];
  const withCharging = zoneIds.includes('charging') ? zoneIds : [...zoneIds, 'charging'];
  const aisle = Math.max(3, Math.ceil((ctx.minAisleWidthM ?? 2) + 1));
  const usable = width - aisle * (withCharging.length + 1);
  const weights = withCharging.map((id) => (id === 'storage' ? 3 : id === 'charging' ? 0.6 : 1));
  const total = weights.reduce((a, b) => a + b, 0);

  let x = aisle;
  const zones: Zone[] = withCharging.map((id, i) => {
    const w = Math.max(4, Math.round((usable * weights[i]) / total));
    const wz = workingZone(id);
    const label = wz?.label ?? (id.startsWith('custom:') ? id.slice(7) : id);
    const zone: Zone = {
      id: `z-${i + 1}`,
      name: label,
      zone_type: wz?.zone_type ?? 'operation',
      category_id: wz ? id : null,
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

  const robots = ctx.robots.flatMap((r) =>
    Array.from({ length: r.quantity }, (_, k) => ({ catalog_item_id: r.catalog_item_id, k })),
  );
  const perRow = Math.max(1, Math.floor(cw / 2.5));

  return {
    id: '',
    project_id: projectId,
    scale_m_per_unit: 1,
    walls: [{ id: 'w-outline', points: [...rect(0, 0, width, depth), { x: 0, y: 0 }], thickness_m: 0.4, tags: ['outline'] }],
    zones,
    routes: [
      {
        id: 'r-main',
        points: [
          { x: aisle / 2, y: depth / 2 },
          { x: width - aisle / 2, y: depth / 2 },
        ],
        tags: ['main'],
      },
    ],
    operation_points: [
      ...zones
        .filter((z) => z.zone_type === 'operation')
        .map((z, i) => ({ id: `op-${i + 1}`, kind: 'operation', position: { x: (z.polygon[0].x + z.polygon[1].x) / 2, y: depth / 2 }, tags: [] })),
      // Зарядка — у нижнего края зоны: сверху подпись и стоянка роботов
      { id: 'ch-1', kind: 'charging', position: { x: cx + cw / 2, y: charging.polygon[2].y - 3 }, tags: [] },
    ],
    robots: robots.map((r, i) => ({
      id: `rb-${i + 1}`,
      catalog_item_id: r.catalog_item_id,
      start_position: { x: cx + 1.5 + (i % perRow) * 2.5, y: cy + 5 + Math.floor(i / perRow) * 2.5 },
    })),
  };
}

export const ZONE_COLOR = Object.fromEntries(CATEGORIES.zone_types.map((z) => [z.id, z.color]));
