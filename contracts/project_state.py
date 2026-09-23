"""Контракт 10: ProjectState — одна запись проекта на две части.

Граница фронт (визард + редактор плана) <-> backend-glue.

Параметры объекта с формы (шаг 2) и план объекта из редактора (шаг 7) приходят
в разное время, но в одну и ту же запись проекта (один project_id). Маршруты —
из api-routes.md, раздел 3 и 6:

    PUT  /api/projects/{id}/input   InputSaveRequest -> ProjectState
    GET  /api/projects/{id}/input   -> ProjectInput
    PUT  /api/projects/{id}/scene   SceneSaveRequest -> ProjectState
    GET  /api/projects/{id}/scene   -> TopologyConfig (Scene)
    GET  /api/projects/{id}         -> ProjectState (обе части и чего не хватает)

Версия 2 (24.09.2026): маршруты приведены к api-routes.md (было PATCH одной
ручкой), добавлены предупреждения редактора от сервера и отдельная загрузка
подложки-чертежа."""

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
    SCENE = "scene"


# --- Запросы -----------------------------------------------------------------


class InputSaveRequest(BaseModel):
    """Тело PUT /api/projects/{id}/input — идемпотентный upsert параметров."""

    base_revision: int = Field(
        ..., description="ProjectState.revision, которую клиент видел последней. Не совпала — 409 и актуальное состояние"
    )
    object_type: ObjectType
    params: WarehouseParams | AirportParams | MedicalParams
    source: str = Field("manual", description="manual / excel_import / csv_import")


class SceneSaveRequest(BaseModel):
    """Тело PUT /api/projects/{id}/scene — идемпотентный upsert плана объекта."""

    base_revision: int
    based_on_input_revision: int = Field(
        ..., description="input.revision, по которому рисовали план: по нему сервер понимает, не устарел ли он"
    )
    scene: TopologyConfig = Field(..., description="id и project_id внутри сервер перезаписывает сам")


class ProjectCreateRequest(BaseModel):
    """Тело POST /api/projects."""

    name: str
    object_type: ObjectType
    site: Optional[str] = None


# --- Предупреждения по плану --------------------------------------------------


class WarningSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"   # план сохранён, но симуляция по нему не пойдёт


class SceneWarning(BaseModel):
    """Проверки плана считает сервер, чтобы редактор, симуляция и отчёт
    показывали одно и то же. Редактор может дублировать их локально для
    мгновенной подсветки, но истина — эта."""

    code: str = Field(..., description="route_crosses_wall / robot_in_restricted_zone / aisle_too_narrow / zone_outside_bounds / route_not_linked / charging_capacity_exceeded / scene_area_differs_from_form")
    severity: WarningSeverity = WarningSeverity.WARNING
    message: str = Field(..., description="Текст для пользователя, на русском")
    target_kind: Optional[str] = Field(None, description="wall / zone / route / point / robot")
    target_id: Optional[str] = Field(None, description="id элемента плана, к которому относится")


# --- Подложка (скан чертежа) --------------------------------------------------


class BackgroundUploadResponse(BaseModel):
    """Ответ POST /api/projects/{id}/scene/background (multipart, поле file).
    Картинка не хранится внутри плана: в план кладётся SceneBackground со ссылкой."""

    background_id: str
    url: str
    width_px: int
    height_px: int
    size_bytes: int
    content_type: str = Field(..., description="image/png, image/jpeg, application/pdf")


# --- Ответ --------------------------------------------------------------------


class InputPartState(BaseModel):
    state: PartState
    revision: Optional[int] = Field(None, description="Ревизия проекта, на которой часть сохранена последний раз")
    saved_at: Optional[datetime] = None
    data: Optional[ProjectInput] = None


class ScenePartState(BaseModel):
    state: PartState
    revision: Optional[int] = None
    saved_at: Optional[datetime] = None
    based_on_input_revision: Optional[int] = None
    data: Optional[TopologyConfig] = None
    warnings: list[SceneWarning] = Field(default_factory=list, description="Результат проверок последнего сохранённого плана")


class ProjectState(BaseModel):
    """Ответ GET /api/projects/{id}, PUT /input и PUT /scene — всегда целиком."""

    project_id: str
    name: str
    site: Optional[str] = None
    object_type: ObjectType
    status: ProjectStatus = Field(..., description="draft, пока нет расчёта; наличие плана на статус не влияет")
    revision: int = Field(..., description="Растёт на каждом успешном сохранении; клиент возвращает её в base_revision")
    dictionary_version: int = Field(..., description="categories.json, по которому проверены id в данных")
    input: InputPartState
    scene: ScenePartState
    missing_parts: list[ProjectPart] = Field(
        default_factory=list, description='["scene"] — черновик без плана, это нормально'
    )
    blocking_parts: list[ProjectPart] = Field(
        default_factory=list, description="Без чего нельзя считать подбор и экономику. План сюда не входит — шаг 7 необязательный"
    )
    current_version: int = Field(1, description="Номер последнего снапшота ProjectVersion (сохраняется явно на шаге 8)")
    created_at: datetime
    updated_at: datetime


class FieldError(BaseModel):
    path: str = Field(..., description="Путь к полю: params.area_sqm, scene.zones[2].polygon")
    code: str = Field(..., description="required / min / unknown_dictionary_id / polygon_self_intersects ...")
    message: str = Field(..., description="Текст для пользователя, на русском")


class ValidationErrorResponse(BaseModel):
    """422: данные не прошли проверку. Ничего не сохранено, revision не менялась."""

    errors: list[FieldError]


class ConflictResponse(BaseModel):
    """409: base_revision устарела (сохранили из другой вкладки или другим
    пользователем). Ничего не сохранено; current — что сейчас на сервере."""

    current: ProjectState
