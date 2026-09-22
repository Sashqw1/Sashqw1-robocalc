import { useMemo, useState } from 'react';
import { catalogById } from '../../shared/mock/catalog';
import { labelOf } from '../../shared/dictionaries';
import type { TopologyConfig, Zone } from '../../shared/types/contracts';
import type { PlanEditorProps } from './types';
import { ZONE_COLOR } from './autoLayout';

const RAIL_W = 48;
const PANEL_W = 264;

const TOOLS = [
  { id: 'select', label: 'Выбор', glyph: '↖' },
  { id: 'wall', label: 'Стена', glyph: '▭' },
  { id: 'zone', label: 'Зона', glyph: '⬚' },
  { id: 'route', label: 'Маршрут', glyph: '⤳' },
  { id: 'point', label: 'Точка операции', glyph: '◎' },
  { id: 'charging', label: 'Зарядка', glyph: 'ϟ' },
  { id: 'robot', label: 'Робот', glyph: '◆' },
];

function bounds(plan: TopologyConfig) {
  const pts = [...plan.walls.flatMap((w) => w.points), ...plan.zones.flatMap((z) => z.polygon)];
  if (!pts.length) return { minX: 0, minY: 0, maxX: 100, maxY: 60 };
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}

/**
 * ВРЕМЕННАЯ реализация PlanEditorProps: показывает план, даёт выбрать зону и
 * поправить её название и категорию. Инструменты рисования — в редакторе
 * Алексея, который встаёт на место этого компонента с тем же интерфейсом.
 * Раскладка уже та, что нужна на 1366×768: рейка инструментов 48 px,
 * холст, панель свойств 264 px.
 */
export function PlanEditorStub({ value, onChange, context, categories, width, height, readOnly }: PlanEditorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const canvasW = Math.max(200, width - RAIL_W - PANEL_W);
  const canvasH = Math.max(200, height);

  const view = useMemo(() => {
    if (!value) return null;
    const b = bounds(value);
    const pad = 24;
    const k = Math.min((canvasW - pad * 2) / (b.maxX - b.minX || 1), (canvasH - pad * 2) / (b.maxY - b.minY || 1));
    const ox = pad + (canvasW - pad * 2 - (b.maxX - b.minX) * k) / 2 - b.minX * k;
    const oy = pad + (canvasH - pad * 2 - (b.maxY - b.minY) * k) / 2 - b.minY * k;
    return { k, x: (m: number) => ox + m * k, y: (m: number) => oy + m * k, b };
  }, [value, canvasW, canvasH]);

  const zone = value?.zones.find((z) => z.id === selected) ?? null;
  const patchZone = (id: string, patch: Partial<Zone>) => {
    if (!value) return;
    onChange({ ...value, zones: value.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) });
  };

  const placed = value?.robots.length ?? 0;
  const needed = context.robots.reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="plan-editor" style={{ width, height }}>
      <div className="plan-editor__rail" role="toolbar" aria-label="Инструменты">
        {TOOLS.map((t, i) => (
          <button key={t.id} type="button" className={i === 0 ? 'is-active' : undefined} disabled={i > 0 || readOnly} title={i > 0 ? `${t.label} — появится в редакторе` : t.label} aria-label={t.label}>
            {t.glyph}
          </button>
        ))}
      </div>

      <div className="plan-editor__canvas" style={{ width: canvasW, height: canvasH }}>
        {value && view ? (
          <svg width={canvasW} height={canvasH} role="img" aria-label="План объекта" onClick={() => setSelected(null)}>
            <defs>
              <pattern id="grid" width={view.k * 5} height={view.k * 5} patternUnits="userSpaceOnUse" x={view.x(0)} y={view.y(0)}>
                <path d={`M ${view.k * 5} 0 L 0 0 0 ${view.k * 5}`} fill="none" stroke="var(--line)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={canvasW} height={canvasH} fill="url(#grid)" />

            {value.zones.map((z) => {
              const pts = z.polygon.map((p) => `${view.x(p.x)},${view.y(p.y)}`).join(' ');
              // Подпись — у верхнего края зоны: центр занят маршрутом и точками операций
              const cx = z.polygon.reduce((s, p) => s + p.x, 0) / z.polygon.length;
              const top = Math.min(...z.polygon.map((p) => p.y));
              const color = ZONE_COLOR[z.zone_type] ?? '#8b95a1';
              return (
                <g
                  key={z.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(z.id);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <polygon points={pts} fill={color} fillOpacity={selected === z.id ? 0.32 : 0.16} stroke={color} strokeWidth={selected === z.id ? 2.5 : 1.5} />
                  <text x={view.x(cx)} y={view.y(top) + 16} textAnchor="middle" dominantBaseline="middle" className="plan-editor__label">
                    {z.name}
                  </text>
                </g>
              );
            })}

            {value.walls.map((w) => (
              <polyline key={w.id} points={w.points.map((p) => `${view.x(p.x)},${view.y(p.y)}`).join(' ')} fill="none" stroke="var(--ink)" strokeWidth={Math.max(2, w.thickness_m * view.k)} strokeLinejoin="round" />
            ))}

            {value.routes.map((r) => (
              <polyline key={r.id} points={r.points.map((p) => `${view.x(p.x)},${view.y(p.y)}`).join(' ')} fill="none" stroke="var(--faint)" strokeWidth={2} strokeDasharray="6 5" />
            ))}

            {value.operation_points.map((p) => (
              <circle key={p.id} cx={view.x(p.position.x)} cy={view.y(p.position.y)} r={6} fill={p.kind === 'charging' ? ZONE_COLOR.charging : 'var(--surface)'} stroke={p.kind === 'charging' ? ZONE_COLOR.charging : 'var(--ink)'} strokeWidth={2}>
                <title>{labelOf('point_kinds', p.kind)}</title>
              </circle>
            ))}

            {value.robots.map((r) => (
              <rect key={r.id} x={view.x(r.start_position.x) - 5} y={view.y(r.start_position.y) - 5} width={10} height={10} rx={2} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.5}>
                <title>{catalogById(r.catalog_item_id)?.identification.product_name ?? r.catalog_item_id}</title>
              </rect>
            ))}

            <g transform={`translate(${canvasW - 124}, ${canvasH - 22})`}>
              <line x1={0} x2={view.k * 10} y1={0} y2={0} stroke="var(--ink)" strokeWidth={2} />
              <text x={view.k * 10 + 6} y={0} dominantBaseline="middle" className="plan-editor__label">
                10 м
              </text>
            </g>
          </svg>
        ) : (
          <div className="plan-editor__empty">
            <strong>План ещё не нарисован</strong>
            <span className="muted">Это нормально: проект сохранён как черновик без плана. Начните с черновика из параметров объекта — кнопка сверху.</span>
          </div>
        )}
      </div>

      <aside className="plan-editor__panel" aria-label="Свойства">
        {zone ? (
          <div className="stack stack--sm">
            <span className="label">Зона</span>
            <label className="field">
              <span className="field__label">Название</span>
              <div className="control">
                <input value={zone.name} disabled={readOnly} onChange={(e) => patchZone(zone.id, { name: e.target.value })} />
              </div>
            </label>
            <label className="field">
              <span className="field__label">Рабочая зона из формы</span>
              <div className="control">
                <select
                  value={zone.category_id ?? ''}
                  disabled={readOnly}
                  onChange={(e) => {
                    const cat = categories.working_zones.find((w) => w.id === e.target.value);
                    patchZone(zone.id, { category_id: cat?.id ?? null, zone_type: cat?.zone_type ?? zone.zone_type });
                  }}
                >
                  <option value="">Не связана</option>
                  {categories.working_zones
                    .filter((w) => w.object_types.includes(context.objectType))
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label}
                      </option>
                    ))}
                </select>
              </div>
              <span className="field__hint">из единого справочника categories.json</span>
            </label>
            <label className="field">
              <span className="field__label">Тип зоны</span>
              <div className="control">
                <select value={zone.zone_type} disabled={readOnly} onChange={(e) => patchZone(zone.id, { zone_type: e.target.value as Zone['zone_type'] })}>
                  {categories.zone_types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>
        ) : (
          <div className="stack stack--sm">
            <span className="label">Легенда</span>
            {categories.zone_types.map((t) => (
              <span key={t.id} className="row" style={{ gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: t.color, opacity: 0.8 }} />
                {t.label}
              </span>
            ))}
            <span className="label" style={{ marginTop: 10 }}>
              Роботы
            </span>
            <span className="num">
              расставлено {placed} из {needed}
            </span>
            {context.minAisleWidthM && <span className="faint">Нужная ширина прохода: от {context.minAisleWidthM.toString().replace('.', ',')} м</span>}
            <span className="faint" style={{ marginTop: 10 }}>
              Нажмите на зону, чтобы изменить её свойства.
            </span>
          </div>
        )}
      </aside>
    </div>
  );
}
