# project_state.py — контракт 10: ProjectState

Граница: **фронт (визард + редактор плана) ↔ backend-glue**.

Одна запись проекта, две части, которые приходят в разное время: параметры
объекта с формы (шаг 2) и план объекта из редактора (шаг 7). Обе — в ту же
запись, по тому же `project_id`. Маршруты берутся из
[api-routes.md](../api-routes.md), разделы 3, 6 и 11.

| Метод и путь | Тело | Ответ |
|---|---|---|
| `POST /api/projects` | ProjectCreateRequest | `201 ProjectState` |
| `GET /api/projects/{id}` | — | `200 ProjectState` — обе части и чего не хватает |
| `PUT /api/projects/{id}/input` | InputSaveRequest | `200 ProjectState` / `409` / `422` |
| `GET /api/projects/{id}/input` | — | `200 ProjectInput` |
| `PUT /api/projects/{id}/scene` | SceneSaveRequest | `200 ProjectState` (с `scene.warnings`) / `409` / `422` |
| `GET /api/projects/{id}/scene` | — | `200 TopologyConfig` |
| `POST /api/projects/{id}/scene/background` | multipart, поле `file` | `201 BackgroundUploadResponse` |
| `DELETE /api/projects/{id}/scene/background/{background_id}` | — | `204` |

## InputSaveRequest
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| base_revision | int | да | `ProjectState.revision`, которую клиент видел последней |
| object_type | ObjectType | да | Тип объекта |
| params | WarehouseParams \| AirportParams \| MedicalParams | да | Параметры формы, id — из `categories.json` |
| source | str | `"manual"` | `manual` / `excel_import` / `csv_import` |

## SceneSaveRequest
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| base_revision | int | да | Ревизия проекта, которую видел клиент |
| based_on_input_revision | int | да | `input.revision`, по которому рисовали план |
| scene | TopologyConfig | да | План; `id` и `project_id` внутри сервер перезаписывает сам |

## SceneWarning
Проверки плана считает сервер — чтобы редактор, симуляция и отчёт показывали
одно и то же.

| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| code | str | да | `route_crosses_wall`, `robot_in_restricted_zone`, `aisle_too_narrow`, `zone_outside_bounds`, `route_not_linked`, `charging_capacity_exceeded`, `scene_area_differs_from_form` |
| severity | str | `warning` | `info` / `warning` / `error` (при `error` симуляция по плану не пойдёт) |
| message | str | да | Текст для пользователя, на русском |
| target_kind | str \| null | null | `wall` / `zone` / `route` / `point` / `robot` |
| target_id | str \| null | null | id элемента плана |

## BackgroundUploadResponse
Ответ на загрузку подложки. Картинка **не** хранится внутри плана: в план
кладётся `SceneBackground` со ссылкой, и при каждом сохранении плана мегабайты
заново не летают.

| Поле | Тип | Описание |
|---|---|---|
| background_id | str | Идентификатор файла |
| url | str | Ссылка для показа |
| width_px, height_px | int | Размер картинки |
| size_bytes | int | Размер файла |
| content_type | str | `image/png`, `image/jpeg`, `application/pdf` |

## ProjectState (ответ)
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| project_id | str | да | Идентификатор проекта |
| name, site | str, str \| null | да, null | Название и площадка |
| object_type | ObjectType | да | Тип объекта |
| status | ProjectStatus | да | `draft`, пока нет расчёта; наличие плана на статус не влияет |
| revision | int | да | Растёт на каждом успешном сохранении любой части |
| dictionary_version | int | да | Версия `categories.json`, по которой проверены id |
| input | InputPartState | да | `state` (`missing`/`saved`/`stale`), `revision`, `saved_at`, `data` |
| scene | ScenePartState | да | То же + `based_on_input_revision` и `warnings` |
| missing_parts | list[str] | [] | `["scene"]` — черновик без плана, это нормально |
| blocking_parts | list[str] | [] | Без чего нельзя считать подбор и экономику; плана тут нет — шаг 7 необязательный |
| current_version | int | `1` | Номер последнего снапшота `ProjectVersion` (шаг 8) |
| created_at, updated_at | datetime | да | Даты |

## Правила

1. **Связь по `project_id`.** Запись создаётся на `POST /api/projects` сразу при
   создании проекта; обе части досылаются в неё по этому id.
2. **`revision` — один счётчик на весь проект.** Растёт на каждом успешном
   сохранении любой части. Клиент возвращает её в `base_revision`; не совпала —
   `409` с актуальным `ProjectState`, ничего не записано.
3. **План помнит, по каким параметрам нарисован** (`based_on_input_revision`).
   Параметры сохранили позже — план помечается `stale`, но не удаляется.
4. **План без параметров не принимается** — `422`, код `input_required`.
   Параметры без плана принимаются всегда.
5. **`revision` ≠ версия.** `revision` — техническая ревизия черновика;
   `ProjectVersion` — снапшот, который пользователь сохраняет явно на шаге 8.
6. Гость в демо-режиме ничего не сохраняет: его черновик уходит на сервер
   через `POST /api/demo/promote` при регистрации.
