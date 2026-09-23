/**
 * Проверки плана объекта. Эталонная реализация того, что должен считать
 * сервер (contracts/project_state.md, SceneWarning): результат возвращается
 * в ProjectState.scene.warnings, чтобы редактор, симуляция и отчёт показывали
 * одни и те же замечания. Редактор может дублировать их локально для
 * мгновенной подсветки.
 */

import type { Point2D, TopologyConfig } from '../../shared/types/contracts';
import type { SceneWarning } from '../../shared/api/projectState';

export interface SceneCheckContext {
  /** Самый требовательный к ширине прохода робот, м */
  minAisleWidthM: number | null;
  /** Площадь из формы, м² — для сверки с размером плана */
  formAreaSqm: number | null;
}

const sub = (a: Point2D, b: Point2D) => ({ x: a.x - b.x, y: a.y - b.y });
const cross = (a: Point2D, b: Point2D) => a.x * b.y - a.y * b.x;

/** Пересекаются ли отрезки p1p2 и p3p4 */
function segmentsCross(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): boolean {
  const r = sub(p2, p1);
  const s = sub(p4, p3);
  const denom = cross(r, s);
  if (Math.abs(denom) < 1e-9) return false; // параллельные
  const t = cross(sub(p3, p1), s) / denom;
  const u = cross(sub(p3, p1), r) / denom;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
}

/** Расстояние от точки до отрезка, м */
function distanceToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + ab.x * t), p.y - (a.y + ab.y * t));
}

function pointInPolygon(p: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const intersects =
      poly[i].y > p.y !== poly[j].y > p.y &&
      p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x;
    if (intersects) inside = !inside;
  }
  return inside;
}

const segments = (pts: Point2D[]) => pts.slice(0, -1).map((p, i) => [p, pts[i + 1]] as const);
const nameOf = (name: string | null, id: string) => (name && name.trim() ? `«${name}»` : id);

export function checkScene(scene: TopologyConfig, ctx: SceneCheckContext): SceneWarning[] {
  const out: SceneWarning[] = [];
  const wallSegments = scene.walls.flatMap((w) => segments(w.points));

  // 1. Маршрут проходит сквозь стену
  for (const route of scene.routes) {
    const crosses = segments(route.points).some(([a, b]) => wallSegments.some(([c, d]) => segmentsCross(a, b, c, d)));
    if (crosses) {
      out.push({
        code: 'route_crosses_wall',
        severity: 'error',
        message: `Маршрут ${nameOf(route.name, route.id)} проходит сквозь стену — робот так не проедет`,
        target_kind: 'route',
        target_id: route.id,
      });
    }
  }

  // 2. Маршрут не привязан к точкам операций
  for (const route of scene.routes) {
    if (!route.from_point_id || !route.to_point_id) {
      out.push({
        code: 'route_not_linked',
        severity: 'warning',
        message: `У маршрута ${nameOf(route.name, route.id)} не указано, между какими точками он идёт — симуляция не сможет назначить по нему задания`,
        target_kind: 'route',
        target_id: route.id,
      });
    }
  }

  // 3. Робот стоит в зоне ограниченного доступа
  const restricted = scene.zones.filter((z) => z.zone_type === 'restricted');
  for (const robot of scene.robots) {
    const zone = restricted.find((z) => pointInPolygon(robot.start_position, z.polygon));
    if (zone) {
      out.push({
        code: 'robot_in_restricted_zone',
        severity: 'error',
        message: `Робот ${nameOf(robot.name, robot.id)} стоит в зоне «${zone.name}» с ограниченным доступом`,
        target_kind: 'robot',
        target_id: robot.id,
      });
    }
  }

  // 4. Маршрут проходит слишком близко к стене для выбранной техники
  if (ctx.minAisleWidthM) {
    const half = ctx.minAisleWidthM / 2;
    for (const route of scene.routes) {
      const tight = route.points.some((p) => wallSegments.some(([a, b]) => distanceToSegment(p, a, b) < half));
      if (tight) {
        out.push({
          code: 'aisle_too_narrow',
          severity: 'warning',
          message: `Маршрут ${nameOf(route.name, route.id)} идёт ближе ${half.toFixed(1)} м к стене, а выбранной технике нужен проход от ${ctx.minAisleWidthM.toFixed(1)} м`,
          target_kind: 'route',
          target_id: route.id,
        });
      }
    }
  }

  // 5. Зона выходит за границы объекта
  if (scene.bounds) {
    const { origin, width_m, height_m } = scene.bounds;
    for (const zone of scene.zones) {
      const outside = zone.polygon.some(
        (p) => p.x < origin.x - 1e-6 || p.y < origin.y - 1e-6 || p.x > origin.x + width_m + 1e-6 || p.y > origin.y + height_m + 1e-6,
      );
      if (outside) {
        out.push({
          code: 'zone_outside_bounds',
          severity: 'warning',
          message: `Зона «${zone.name}» выходит за границы объекта`,
          target_kind: 'zone',
          target_id: zone.id,
        });
      }
    }
  }

  // 6. К зарядке привязано больше роботов, чем у неё мест
  const charging = scene.operation_points.filter((p) => p.kind === 'charging');
  for (const point of charging) {
    const linked = scene.robots.filter((r) => r.charging_point_id === point.id).length;
    if (linked > point.capacity) {
      out.push({
        code: 'charging_capacity_exceeded',
        severity: 'warning',
        message: `К зарядке ${nameOf(point.name, point.id)} привязано ${linked} роботов, а мест ${point.capacity}`,
        target_kind: 'point',
        target_id: point.id,
      });
    }
  }

  // 7. Площадь плана заметно расходится с формой
  if (scene.bounds && ctx.formAreaSqm) {
    const planArea = scene.bounds.width_m * scene.bounds.height_m;
    const diff = Math.abs(planArea - ctx.formAreaSqm) / ctx.formAreaSqm;
    if (diff > 0.2) {
      out.push({
        code: 'scene_area_differs_from_form',
        severity: 'info',
        message: `Площадь плана ${Math.round(planArea)} м², а в параметрах объекта ${Math.round(ctx.formAreaSqm)} м² — расхождение ${Math.round(diff * 100)} %`,
        target_kind: null,
        target_id: null,
      });
    }
  }

  return out;
}
