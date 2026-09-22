"""Контракт 10: ProjectState / ProjectSaveRequest. Граница фронт (визард +
редактор плана) <-> backend-glue.

Одна запись проекта, две части, которые приходят в разное время:
  input — параметры объекта с формы (шаг 2),
  plan  — план объекта из редактора (шаг 7), может прийти через день или не прийти вовсе.
Обе части сохраняются одним и тем же запросом PATCH /api/projects/{project_id}
в ту же запись проекта (тот же project_id). Ответ всегда — полное состояние
проекта, в котором явно видно, какой части ещё нет.

Подробности и сценарии: docs/integration/editor-and-api.md."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .enums import ObjectType, ProjectStatus
from .project_input import AirportParams, MedicalParams, ProjectInput, WarehouseParams
from .topology import TopologyConfig


class PartState(str, Enum):
    MISSING = "missing"  # часть ещё не присылали — нормальное состояние черновика
    SAVED = "saved"      # сохранена и согласована с остальными частями
    STALE = "stale"      # сохранена, но параметры объекта менялись после неё


class ProjectPart(str, Enum):
    INPUT = "input"
    PLAN = "plan"


# --- Запрос ------------------------------------------------------------------


class InputPayload(BaseModel):
    object_type: ObjectType
    params: WarehouseParams | AirportParams | MedicalParams
    source: str = Field("manual", description="manual / excel_import / csv_import")


class PlanPayload(BaseModel):
    based_on_input_revision: int = Field(
        ..., description="input.revision, по которому рисовался план; по нему сервер понимает, не устарел ли план"
    )
    plan: TopologyConfig = Field(..., description="id и project_id внутри сервер перезаписывает сам")


class ProjectSaveRequest(BaseModel):
    """Тело PATCH /api/projects/{project_id}. Присылается одна часть или обе;
    отсутствующая часть не меняется."""

    base_revision: int = Field(
        ..., description="ProjectState.revision, которую клиент видел последней. Не совпала — 409 и актуальное состояние"
    )
    input: Optional[InputPayload] = None
    plan: Optional[PlanPayload] = None


class ProjectCreateRequest(BaseModel):
    """Тело POST /api/projects."""

    name: str
    object_type: ObjectType
    site: Optional[str] = None


# --- Ответ -------------------------------------------------------------------


class InputPartState(BaseModel):
    state: PartState
    revision: Optional[int] = Field(None, description="Ревизия проекта, на которой часть сохранена последний раз")
    saved_at: Optional[datetime] = None
    data: Optional[ProjectInput] = None


class PlanPartState(BaseModel):
    state: PartState
    revision: Optional[int] = None
    saved_at: Optional[datetime] = None
    based_on_input_revision: Optional[int] = None
    data: Optional[TopologyConfig] = None


class ProjectState(BaseModel):
    """Ответ на GET, POST и PATCH проекта — всегда целиком."""

    project_id: str
    name: str
    site: Optional[str] = None
    object_type: ObjectType
    status: ProjectStatus = Field(..., description="draft, пока нет расчёта; наличие плана на статус не влияет")
    revision: int = Field(..., description="Растёт на каждом успешном PATCH; клиент возвращает её в base_revision")
    dictionary_version: int = Field(..., description="categories.json, по которому проверены id в данных")
    input: InputPartState
    plan: PlanPartState
    missing_parts: list[ProjectPart] = Field(
        default_factory=list, description="Каких частей ещё нет. [\"plan\"] — черновик без плана, это нормально"
    )
    blocking_parts: list[ProjectPart] = Field(
        default_factory=list, description="Без каких частей нельзя считать подбор и экономику. План сюда не входит — шаг 7 необязательный"
    )
    current_version: int = Field(1, description="Номер последнего снапшота ProjectVersion (сохраняется явно на шаге 8)")
    created_at: datetime
    updated_at: datetime


class FieldError(BaseModel):
    path: str = Field(..., description="Путь к полю: input.params.area_sqm, plan.plan.zones[2].polygon")
    code: str = Field(..., description="required / min / unknown_dictionary_id / polygon_self_intersects …")
    message: str = Field(..., description="Текст для пользователя, на русском")


class ValidationErrorResponse(BaseModel):
    """422: данные не прошли проверку. Ничего не сохранено, revision не менялась."""

    errors: list[FieldError]


class ConflictResponse(BaseModel):
    """409: base_revision устарела (проект сохранили из другой вкладки или
    другим пользователем). Ничего не сохранено; current — что сейчас на сервере."""

    current: ProjectState
