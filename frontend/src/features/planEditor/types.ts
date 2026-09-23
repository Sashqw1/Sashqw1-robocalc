/**
 * Интерфейс встраивания редактора плана в визард (шаг 7), версия 2.
 *
 * Редактор — модуль этого же React-проекта (features/planEditor), а не
 * отдельное приложение: визард отдаёт ему данные и область экрана, редактор
 * отдаёт изменённый план. Шапку, степпер, кнопки «Сохранить»/«Далее», статус
 * сохранения и загрузку подложки на сервер делает визард; редактор рисует
 * инструменты, холст и панель свойств — в токенах общей дизайн-системы.
 * Решения и причины: docs/integration/editor-and-api.md.
 */

import type { Categories } from '../../shared/dictionaries';
import type { SceneWarning } from '../../shared/api/projectState';
import type { ObjectType, TopologyConfig } from '../../shared/types/contracts';

/** Что редактор знает из формы параметров и подбора — только для чтения. */
export interface PlanEditorContext {
  objectType: ObjectType;
  /** Площадь из формы, м². У аэропорта её нет — будет null */
  areaSqm: number | null;
  /** Протяжённость маршрутов, м — запасной источник размера, когда площади нет */
  routeLengthM: number | null;
  /** Рабочие зоны из формы: id из categories.json → working_zones */
  workingZoneIds: string[];
  /** Роботы из состава оборудования (шаг 4): сколько каких нужно расставить */
  robots: { catalog_item_id: string; name: string; category_id: string; quantity: number }[];
  /** Минимальная ширина прохода среди выбранной техники, м */
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
  /**
   * Предупреждения по последнему сохранённому плану — считает сервер
   * (маршрут через стену, робот в запретной зоне, узкий проход).
   * Редактор подсвечивает элементы по target_id.
   */
  warnings: SceneWarning[];
  /**
   * Загрузить подложку-чертёж. Визард отправляет файл отдельной ручкой и
   * кладёт в план ссылку — сам файл в плане не хранится.
   */
  onUploadBackground: (file: File) => Promise<void>;
  /** Область, которую выделил визард, px */
  width: number;
  height: number;
  readOnly?: boolean;
}

export function emptyPlan(projectId: string): TopologyConfig {
  return {
    id: '',
    project_id: projectId,
    scale_m_per_unit: 1,
    bounds: null,
    background: null,
    walls: [],
    zones: [],
    routes: [],
    operation_points: [],
    robots: [],
  };
}
