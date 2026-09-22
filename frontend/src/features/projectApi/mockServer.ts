/**
 * Мок сервера проектов — ЗАГЛУШКА до backend-glue. Держит ту же логику, что
 * описана в contracts/project_state.py и docs/integration/editor-and-api.md:
 * одна запись на проект, общий счётчик revision, 409 при устаревшей
 * base_revision, 422 при ошибках, план без параметров не принимается,
 * план устаревает, если параметры сохранили после него.
 * Хранится в sessionStorage вкладки.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CATEGORIES } from '../../shared/dictionaries';
import { catalogById } from '../../shared/mock/catalog';
import { DEMO_WAREHOUSE_PARAMS, projectById } from '../../shared/mock/projects';
import type { ObjectParams, ProjectInput } from '../../shared/types/contracts';
import type {
  FieldError,
  PlanPartState,
  ProjectCreateRequest,
  ProjectPart,
  ProjectSaveRequest,
  ProjectState,
  SaveResult,
} from '../../shared/api/projectState';
import { validateParams } from '../wizard/paramsSchema';
import { autoLayout } from '../planEditor/autoLayout';

export interface ApiLogEntry {
  at: string;
  method: 'GET' | 'POST' | 'PATCH';
  url: string;
  request: unknown;
  status: number;
  response: unknown;
}

interface ApiDb {
  projects: Record<string, ProjectState>;
  log: ApiLogEntry[];
  put: (p: ProjectState) => void;
  record: (e: ApiLogEntry) => void;
}

export const useApiDb = create<ApiDb>()(
  persist(
    (set) => ({
      projects: {},
      log: [],
      put: (p) => set((s) => ({ projects: { ...s.projects, [p.project_id]: p } })),
      record: (e) => set((s) => ({ log: [e, ...s.log].slice(0, 20) })),
    }),
    { name: 'robocalc-api', storage: createJSONStorage(() => sessionStorage), partialize: (s) => ({ projects: s.projects, log: s.log }) },
  ),
);

const now = () => new Date().toISOString();

function derive(p: Omit<ProjectState, 'missing_parts' | 'blocking_parts'>): ProjectState {
  const missing: ProjectPart[] = [];
  if (p.input.state === 'missing') missing.push('input');
  if (p.plan.state === 'missing') missing.push('plan');
  return { ...p, missing_parts: missing, blocking_parts: p.input.state === 'missing' ? ['input'] : [] };
}

const EMPTY_PLAN: PlanPartState = { state: 'missing', revision: null, saved_at: null, based_on_input_revision: null, data: null };

function makeInput(projectId: string, revision: number, params: ObjectParams, source: ProjectInput['source'], at: string): ProjectInput {
  return { id: `pi-${projectId}-${revision}`, project_id: projectId, object_type: params.object_type, params, created_at: at, source };
}

/** Начальное состояние для моковых проектов из списка — чтобы любой открывался. */
function seed(projectId: string): ProjectState {
  const mock = projectById(projectId);
  const at = mock?.updated_at ?? now();
  const hasInput = Boolean(mock && mock.last_step !== 'object' && mock.last_step !== 'params');
  const params: ObjectParams | null = hasInput && mock?.object_type === 'warehouse' ? { ...DEMO_WAREHOUSE_PARAMS } : null;
  const revision = hasInput ? mock!.current_version : 0;
  return derive({
    project_id: projectId,
    name: mock?.name ?? 'Новый проект',
    site: mock?.site ?? null,
    object_type: mock?.object_type ?? 'warehouse',
    status: mock?.status ?? 'draft',
    revision,
    dictionary_version: CATEGORIES.version,
    input: hasInput
      ? { state: 'saved', revision, saved_at: at, data: params ? makeInput(projectId, revision, params, 'manual', at) : null }
      : { state: 'missing', revision: null, saved_at: null, data: null },
    // У архивного пилота план уже нарисован — пример записи «параметры + план»
    plan:
      projectId === 'p-old-kazan' && params?.object_type === 'warehouse'
        ? {
            state: 'saved',
            revision,
            saved_at: at,
            based_on_input_revision: revision,
            data: {
              ...autoLayout(projectId, {
                objectType: 'warehouse',
                areaSqm: 8000,
                workingZoneIds: params.working_zones,
                robots: [{ catalog_item_id: 'amr-vektor-600', name: 'Вектор-600', category_id: 'amr', quantity: 12 }],
                minAisleWidthM: 1.6,
              }),
              id: `topo-${projectId}-${revision}`,
            },
          }
        : EMPTY_PLAN,
    current_version: mock?.current_version ?? 1,
    created_at: mock?.created_at ?? at,
    updated_at: at,
  });
}

function getOrSeed(projectId: string): ProjectState {
  const db = useApiDb.getState();
  const existing = db.projects[projectId];
  if (existing) return existing;
  const fresh = seed(projectId);
  db.put(fresh);
  return fresh;
}

function validatePlan(req: NonNullable<ProjectSaveRequest['plan']>): FieldError[] {
  const errors: FieldError[] = [];
  const zoneTypes = new Set(CATEGORIES.zone_types.map((z) => z.id));
  const zoneCats = new Set(CATEGORIES.working_zones.map((z) => z.id));
  const pointKinds = new Set(CATEGORIES.point_kinds.map((k) => k.id));
  req.plan.zones.forEach((z, i) => {
    const path = `plan.plan.zones[${i}]`;
    if (z.polygon.length < 3) errors.push({ path: `${path}.polygon`, code: 'min_points', message: `Зона «${z.name}»: нужен контур минимум из трёх точек` });
    if (!zoneTypes.has(z.zone_type)) errors.push({ path: `${path}.zone_type`, code: 'unknown_dictionary_id', message: `Зона «${z.name}»: неизвестный тип зоны` });
    if (z.category_id && !zoneCats.has(z.category_id)) errors.push({ path: `${path}.category_id`, code: 'unknown_dictionary_id', message: `Зона «${z.name}»: категории «${z.category_id}» нет в справочнике` });
  });
  req.plan.operation_points.forEach((p, i) => {
    if (!pointKinds.has(p.kind)) errors.push({ path: `plan.plan.operation_points[${i}].kind`, code: 'unknown_dictionary_id', message: `Точка ${p.id}: неизвестный вид точки` });
  });
  req.plan.robots.forEach((r, i) => {
    if (!catalogById(r.catalog_item_id)) errors.push({ path: `plan.plan.robots[${i}].catalog_item_id`, code: 'unknown_catalog_item', message: `Робот ${r.id}: такой позиции нет в каталоге` });
  });
  return errors;
}

// --- «Эндпоинты» ---------------------------------------------------------------

export function serverGet(projectId: string): ProjectState {
  return getOrSeed(projectId);
}

export function serverCreate(req: ProjectCreateRequest): ProjectState {
  const at = now();
  const id = `p-${Date.now().toString(36)}`;
  const state = derive({
    project_id: id,
    name: req.name,
    site: req.site ?? null,
    object_type: req.object_type,
    status: 'draft',
    revision: 0,
    dictionary_version: CATEGORIES.version,
    input: { state: 'missing', revision: null, saved_at: null, data: null },
    plan: EMPTY_PLAN,
    current_version: 1,
    created_at: at,
    updated_at: at,
  });
  useApiDb.getState().put(state);
  return state;
}

export function serverPatch(projectId: string, req: ProjectSaveRequest): SaveResult {
  const current = getOrSeed(projectId);

  if (req.base_revision !== current.revision) return { status: 409, body: { current } };

  const errors: FieldError[] = [];
  if (!req.input && !req.plan) errors.push({ path: '', code: 'empty', message: 'Нечего сохранять: нет ни параметров, ни плана' });

  if (req.input) {
    const issues = validateParams(req.input.object_type, req.input.params as unknown as Record<string, unknown>);
    for (const [key, issue] of Object.entries(issues)) {
      if (issue.error) errors.push({ path: `input.params.${key}`, code: 'invalid', message: issue.error });
    }
  }

  if (req.plan) {
    const inputWillExist = current.input.state !== 'missing' || Boolean(req.input);
    if (!inputWillExist) {
      errors.push({ path: 'plan', code: 'input_required', message: 'Сначала сохраните параметры объекта — план привязывается к ним' });
    } else {
      errors.push(...validatePlan(req.plan));
    }
  }

  if (errors.length) return { status: 422, body: { errors } };

  const at = now();
  const revision = current.revision + 1;
  let next: Omit<ProjectState, 'missing_parts' | 'blocking_parts'> = { ...current, revision, updated_at: at };

  if (req.input) {
    next = {
      ...next,
      object_type: req.input.object_type,
      // Параметры изменились — прежний расчёт больше не соответствует им
      status: current.status === 'archived' ? 'archived' : 'draft',
      input: { state: 'saved', revision, saved_at: at, data: makeInput(projectId, revision, req.input.params, req.input.source, at) },
      plan: current.plan.state === 'saved' ? { ...current.plan, state: 'stale' } : current.plan,
    };
  }

  if (req.plan) {
    const inputRevision = next.input.revision ?? 0;
    next = {
      ...next,
      plan: {
        state: req.plan.based_on_input_revision < inputRevision ? 'stale' : 'saved',
        revision,
        saved_at: at,
        based_on_input_revision: req.plan.based_on_input_revision,
        data: { ...req.plan.plan, id: `topo-${projectId}-${revision}`, project_id: projectId },
      },
    };
  }

  const saved = derive(next);
  useApiDb.getState().put(saved);
  return { status: 200, body: saved };
}
