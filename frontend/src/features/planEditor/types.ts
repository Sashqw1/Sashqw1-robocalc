/**
 * Интерфейс встраивания редактора плана в визард (шаг 7).
 *
 * Редактор — модуль этого же React-проекта (features/planEditor), а не
 * отдельное приложение: визард отдаёт ему данные и область экрана, редактор
 * отдаёт изменённый план. Шапку, степпер, кнопки «Сохранить»/«Далее» и
 * статус сохранения рисует визард; редактор рисует только инструменты,
 * холст и панель свойств — в токенах общей дизайн-системы (tokens.css).
 * Решение и причины: docs/integration/editor-and-api.md.
 */

import type { Categories } from '../../shared/dictionaries';
import type { ObjectType, TopologyConfig } from '../../shared/types/contracts';

/** Что редактор знает из формы параметров и подбора — только для чтения. */
export interface PlanEditorContext {
  objectType: ObjectType;
  /** Площадь из формы, м² — для масштаба и проверки, что план не больше объекта */
  areaSqm: number | null;
  /** Рабочие зоны из формы: id из categories.json → working_zones */
  workingZoneIds: string[];
  /** Роботы из состава оборудования (шаг 4): сколько каких нужно расставить */
  robots: { catalog_item_id: string; name: string; category_id: string; quantity: number }[];
  /** Минимальная ширина прохода среди выбранной техники, м — для подсветки узких мест */
  minAisleWidthM: number | null;
}

export interface PlanEditorProps {
  /** Текущий план; null — план ещё не рисовали (черновик проекта без плана) */
  value: TopologyConfig | null;
  /** Любое изменение плана. Сохраняет визард, редактор на сервер не ходит */
  onChange: (plan: TopologyConfig) => void;
  context: PlanEditorContext;
  /** Единый справочник — categories.json; своих списков у редактора нет */
  categories: Categories;
  /** Область, которую выделил визард, px. На 1366×768 — примерно 1366 × 504 */
  width: number;
  height: number;
  readOnly?: boolean;
}

export function emptyPlan(projectId: string): TopologyConfig {
  return { id: '', project_id: projectId, scale_m_per_unit: 1, walls: [], zones: [], routes: [], operation_points: [], robots: [] };
}
