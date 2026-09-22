/**
 * Клиент API проектов. Сейчас ходит в мок (mockServer.ts); при подключении
 * бэкенда здесь меняются только тела функций на fetch — сигнатуры и типы
 * уже те, что в contracts/project_state.py.
 */

import { useEffect } from 'react';
import type { ProjectCreateRequest, ProjectSaveRequest, ProjectState, SaveResult } from '../../shared/api/projectState';
import { serverCreate, serverGet, serverPatch, useApiDb } from './mockServer';

const LATENCY_MS = 350;
const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));

function log(method: 'GET' | 'POST' | 'PATCH', url: string, request: unknown, status: number, response: unknown) {
  useApiDb.getState().record({ at: new Date().toISOString(), method, url, request, status, response });
}

/** GET /api/projects/{id} */
export async function fetchProject(projectId: string): Promise<ProjectState> {
  await wait();
  const body = serverGet(projectId);
  log('GET', `/api/projects/${projectId}`, null, 200, body);
  return body;
}

/** POST /api/projects */
export async function createProject(req: ProjectCreateRequest): Promise<ProjectState> {
  await wait();
  const body = serverCreate(req);
  log('POST', '/api/projects', req, 201, body);
  return body;
}

/** PATCH /api/projects/{id} — параметры, план или обе части сразу. */
export async function saveProject(projectId: string, req: ProjectSaveRequest): Promise<SaveResult> {
  await wait();
  const result = serverPatch(projectId, req);
  log('PATCH', `/api/projects/${projectId}`, req, result.status, result.body);
  return result;
}

/** Текущее состояние записи проекта (как его последний раз вернул сервер). */
export function useProjectState(projectId: string, enabled = true): ProjectState | undefined {
  const state = useApiDb((s) => s.projects[projectId]);
  useEffect(() => {
    if (enabled && !state) void fetchProject(projectId);
  }, [enabled, projectId, state]);
  return state;
}

export function useApiLog() {
  return useApiDb((s) => s.log);
}
