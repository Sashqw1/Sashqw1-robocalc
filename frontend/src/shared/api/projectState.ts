/**
 * Единая запись проекта: параметры с формы (шаг 2) и план из редактора
 * (шаг 7) — две части одного запроса/ответа. Зеркало contracts/project_state.py.
 * Сценарии и решения: docs/integration/editor-and-api.md.
 */

import type { ObjectParams, ObjectType, ProjectInput, ProjectStatus, TopologyConfig } from '../types/contracts';

export type PartState = 'missing' | 'saved' | 'stale';
export type ProjectPart = 'input' | 'plan';

// --- Запрос: PATCH /api/projects/{project_id} ---------------------------------

export interface InputPayload {
  object_type: ObjectType;
  params: ObjectParams;
  source: 'manual' | 'excel_import' | 'csv_import';
}

export interface PlanPayload {
  /** input.revision, по которому рисовался план */
  based_on_input_revision: number;
  /** id и project_id внутри сервер перезаписывает сам */
  plan: TopologyConfig;
}

export interface ProjectSaveRequest {
  /** ProjectState.revision, которую клиент видел последней */
  base_revision: number;
  input?: InputPayload;
  plan?: PlanPayload;
}

/** POST /api/projects */
export interface ProjectCreateRequest {
  name: string;
  object_type: ObjectType;
  site?: string | null;
}

// --- Ответ: GET / POST / PATCH ------------------------------------------------

export interface InputPartState {
  state: PartState;
  revision: number | null;
  saved_at: string | null;
  data: ProjectInput | null;
}

export interface PlanPartState {
  state: PartState;
  revision: number | null;
  saved_at: string | null;
  based_on_input_revision: number | null;
  data: TopologyConfig | null;
}

export interface ProjectState {
  project_id: string;
  name: string;
  site: string | null;
  object_type: ObjectType;
  status: ProjectStatus;
  revision: number;
  dictionary_version: number;
  input: InputPartState;
  plan: PlanPartState;
  /** ["plan"] — черновик без плана, нормальное промежуточное состояние */
  missing_parts: ProjectPart[];
  /** Без чего нельзя считать подбор и экономику. План сюда не входит — шаг 7 необязательный */
  blocking_parts: ProjectPart[];
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface FieldError {
  path: string;
  code: string;
  message: string;
}

export type SaveResult =
  | { status: 200; body: ProjectState }
  | { status: 409; body: { current: ProjectState } }
  | { status: 422; body: { errors: FieldError[] } };
