"""Контракт 3: EconInput / EconOutput. Граница Александра -> Стас (econWrapper).

ВАЖНО: только stdlib, никакого pydantic/FastAPI. Александра пишет чистые
функции над этими датаклассами и не должна знать об остальном стеке.
econWrapper сам конвертирует ScenarioInput -> EconInput и EconOutput ->
EconomicsResult (см. economics.py) на границе API.
"""

from dataclasses import dataclass, field


@dataclass
class EconInput:
    equipment_cost_total: float  # CAPEX на оборудование, ₽
    software_cost_total: float
    implementation_cost_total: float
    staff_cost_per_month: float  # стоимость замещаемого персонала, ₽/мес
    operating_hours_per_year: float
    load_factor: float  # 0..1, коэффициент загрузки оборудования
    horizon_years: float  # горизонт TCO, лет (>= 5 по ТЗ)
    maintenance_cost_per_year: float
    energy_cost_per_year: float
    connectivity_cost_per_year: float
    consumables_cost_per_year: float
    financing_type: str  # "own_funds" | "credit" | "leasing" | "raas"
    reserve_ratio: float = 0.1  # резерв в CAPEX, доля


@dataclass
class SensitivityPoint:
    parameter: str
    delta_pct: float
    resulting_payback_years: float
    resulting_roi_pct: float


@dataclass
class EconOutput:
    capex_total: float
    opex_annual: float
    opex_delta_vs_baseline: float
    annual_effect: float
    payback_years: float | None  # None, если годовой эффект <= 0
    roi_pct: float
    tco_total: float
    sensitivity: list[SensitivityPoint] = field(default_factory=list)  # минимум 3 параметра по ТЗ
