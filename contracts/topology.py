"""Контракт 6: TopologyConfig (он же Scene в api-routes.md) / SceneData.
Граница Алексей <-> Владимиров, Алексей (editor2d) -> Стас (simulation).

Версия 2 (24.09.2026): добавлены границы объекта, подложка-чертёж ссылкой,
названия у элементов, направление и привязка маршрутов, места у зарядки,
вид и поворот робота. Подложка НЕ хранится внутри плана: картинка грузится
отдельной ручкой, в плане остаётся ссылка (см. project_state.py, SceneBackground)."""

from typing import Optional

from pydantic import BaseModel, Field

from .enums import ZoneType


class Point2D(BaseModel):
    x: float
    y: float


class Bounds(BaseModel):
    """Границы объекта: прямоугольник сцены в метрах."""

    origin: Point2D = Field(default_factory=lambda: Point2D(x=0, y=0), description="Левый верхний угол")
    width_m: float
    height_m: float


class SceneBackground(BaseModel):
    """Подложка — скан или чертёж объекта. В плане только ссылка: файл грузится
    отдельно через POST /api/projects/{id}/scene/background."""

    background_id: str = Field(..., description="Идентификатор загруженного файла")
    url: str = Field(..., description="Ссылка для показа в редакторе")
    width_px: int
    height_px: int
    scale_m_per_px: float = Field(..., description="Сколько метров в пикселе — калибровка по известному отрезку")
    offset: Point2D = Field(default_factory=lambda: Point2D(x=0, y=0), description="Смещение подложки в координатах сцены, м")
    rotation_deg: float = 0
    opacity: float = Field(0.5, ge=0, le=1)


class Wall(BaseModel):
    id: str
    name: Optional[str] = None
    points: list[Point2D] = Field(..., description="Ломаная оси стены, м")
    thickness_m: float = Field(0.2, description="Толщина стены, м")
    tags: list[str] = Field(default_factory=list)


class Zone(BaseModel):
    id: str
    name: str
    zone_type: ZoneType
    category_id: Optional[str] = Field(
        None, description="id из categories.json -> working_zones (приёмка, хранение...); связь с рабочими зонами формы"
    )
    polygon: list[Point2D] = Field(..., description="Контур зоны в координатах сцены, м")
    tags: list[str] = Field(default_factory=list)


class OperationPoint(BaseModel):
    id: str
    name: Optional[str] = None
    kind: str = Field(..., description="id из categories.json -> point_kinds: operation / charging")
    position: Point2D
    capacity: int = Field(1, ge=1, description="Сколько роботов обслуживается одновременно; для зарядки — число мест")
    tags: list[str] = Field(default_factory=list)


class Route(BaseModel):
    id: str
    name: Optional[str] = None
    points: list[Point2D] = Field(..., description="Ломаная маршрута")
    direction: str = Field("two_way", description="two_way / one_way — по ломаной от первой точки к последней")
    from_point_id: Optional[str] = Field(None, description="OperationPoint.id, откуда идёт маршрут")
    to_point_id: Optional[str] = Field(None, description="OperationPoint.id, куда ведёт маршрут")
    tags: list[str] = Field(default_factory=list)


class RobotPlacement(BaseModel):
    id: str
    name: Optional[str] = None
    catalog_item_id: str = Field(
        "", description="Ссылка на позицию каталога; пусто — робот «вообще», без конкретной модели (черновик плана)"
    )
    category_id: Optional[str] = Field(
        None, description="id из categories.json -> equipment_categories: вид робота, когда модель не выбрана"
    )
    start_position: Point2D
    start_rotation_deg: float = Field(0, description="Поворот робота на старте, градусы, 0 — вдоль оси X")
    charging_point_id: Optional[str] = Field(None, description="OperationPoint.id зарядки, к которой привязан робот")


class TopologyConfig(BaseModel):
    """В api-routes.md эта же модель называется Scene."""

    id: str
    project_id: str
    scale_m_per_unit: float = Field(1.0, description="Метров на единицу координат сцены")
    bounds: Optional[Bounds] = Field(None, description="Границы объекта; если не заданы — берутся по контуру стен")
    background: Optional[SceneBackground] = Field(None, description="Подложка-чертёж: только ссылка, не сам файл")
    walls: list[Wall] = Field(default_factory=list, description="Стены и контур здания")
    zones: list[Zone] = Field(default_factory=list, description="Зоны объекта")
    routes: list[Route] = Field(default_factory=list, description="Маршруты")
    operation_points: list[OperationPoint] = Field(default_factory=list, description="Точки операций и зарядки")
    robots: list[RobotPlacement] = Field(default_factory=list, description="Размещённые роботы")


#: Имя из api-routes.md
Scene = TopologyConfig
