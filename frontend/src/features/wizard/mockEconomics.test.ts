/**
 * Тесты расчёта экономики (шаг 5 визарда).
 * Проверяются граничные случаи: нулевой CAPEX, отсутствие окупаемости,
 * корректность типов в анализе чувствительности.
 */
import { describe, expect, it } from 'vitest';
import { computeScenario, computeSensitivity, DEFAULT_SCENARIOS } from './mockEconomics';
import type { Draft } from './store';

/** Черновик визарда с выбранным оборудованием — основа для расчёта */
function draft(patch: Partial<Draft> = {}): Draft {
  return {
    objectType: 'warehouse',
    params: {
      warehouse: {
        object_type: 'warehouse',
        area_sqm: 12_500,
        staff_count: 46,
        inbound_ops_per_day: 1200,
        internal_ops_per_day: 3400,
        outbound_ops_per_day: 1100,
      } as never,
    },
    staleAfterParams: false,
    compare: [],
    selected: ['amr-vektor-600'],
    quantities: { 'amr-vektor-600': 10 },
    manuallyExcluded: [],
    economics: { hoursPerYear: 8760, loadFactor: 0.75, staffCostPerMonth: 4_370_000, horizonYears: 5, financing: 'own_funds' },
    scenarios: DEFAULT_SCENARIOS,
    econCalculatedAt: null,
    completed: [],
    savedAt: null,
    ...patch,
  };
}

const purchase = DEFAULT_SCENARIOS[1];
const baseline = DEFAULT_SCENARIOS[0];

describe('computeScenario — базовый сценарий', () => {
  it('у базового сценария нет вложений и окупаемости', () => {
    const r = computeScenario(draft(), baseline);
    expect(r.capex_total).toBe(0);
    expect(r.payback_years).toBeNull();
    expect(r.annual_effect).toBe(0);
  });

  it('стоимость персонала берётся за весь штат, а не на одного сотрудника', () => {
    const r = computeScenario(draft(), baseline);
    // 4 370 000 ₽/мес × 12 месяцев
    expect(r.opex_breakdown.staff).toBe(4_370_000 * 12);
  });
});

describe('computeScenario — сценарий с покупкой', () => {
  it('считает CAPEX, годовой эффект и срок окупаемости', () => {
    const r = computeScenario(draft(), purchase);
    expect(r.capex_total).toBeGreaterThan(0);
    expect(r.annual_effect).toBeGreaterThan(0);
    expect(r.payback_years).toBeGreaterThan(0);
  });

  // Падает: BUG-001 — эффект 260 000 ₽ при пустом составе оборудования.
  // it.fails = «тест обязан падать»: когда дефект исправят, тест просигналит об этом.
  it.fails('без выбранного оборудования расчёт не падает и не обещает экономии', () => {
    const r = computeScenario(draft({ selected: [], quantities: {} }), purchase);
    expect(Number.isFinite(r.capex_total)).toBe(true);
    expect(r.annual_effect).toBeLessThanOrEqual(0);
    expect(r.payback_years).toBeNull();
  });

  it('все числовые поля результата конечны при нулевой стоимости персонала', () => {
    const d = draft();
    d.economics.staffCostPerMonth = 0;
    const r = computeScenario(d, purchase);
    for (const [field, value] of Object.entries(r)) {
      if (typeof value === 'number') {
        expect(Number.isFinite(value), `поле ${field} = ${value}`).toBe(true);
      }
    }
  });

  // Падает: BUG-002 — ROI = 999 % вместо расчётного значения.
  it.fails('ROI не принимает фиктивное значение при нулевом CAPEX', () => {
    // Сценарий RaaS с нулевым оборудованием: CAPEX = 0, но экономия возможна
    const d = draft({ selected: [], quantities: {} });
    const raas = DEFAULT_SCENARIOS[2];
    const r = computeScenario(d, raas);
    expect(r.roi_pct, 'ROI = 999 — магическая константа вместо расчёта').not.toBe(999);
  });
});

describe('computeSensitivity — анализ чувствительности', () => {
  it('возвращает три точки для небазового сценария', () => {
    expect(computeSensitivity(draft(), purchase)).toHaveLength(3);
  });

  it('для базового сценария точек нет', () => {
    expect(computeSensitivity(draft(), baseline)).toHaveLength(0);
  });

  it('срок окупаемости в точках — число или null, но не Infinity', () => {
    // Оборудование не выбрано: эффекта нет, окупаемости тоже
    const points = computeSensitivity(draft({ selected: [], quantities: {} }), purchase);
    for (const p of points) {
      expect(
        p.resulting_payback_years === null || Number.isFinite(p.resulting_payback_years),
        `${p.parameter}: resulting_payback_years = ${p.resulting_payback_years}`,
      ).toBe(true);
    }
  });
});
