# econ_io.py — контракт 3: EconInput / EconOutput

Граница: **Александра → Стас** (econWrapper). Обычные `dataclass`, без
pydantic/FastAPI — единственный файл контрактов, который стоит показывать
Александре напрямую.

## EconInput
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| equipment_cost_total | float | да | CAPEX на оборудование, ₽ |
| software_cost_total | float | да | CAPEX на ПО, ₽ |
| implementation_cost_total | float | да | CAPEX на внедрение/интеграцию, ₽ |
| staff_cost_per_month | float | да | Стоимость замещаемого персонала, ₽/мес |
| operating_hours_per_year | float | да | Часы работы оборудования в год |
| load_factor | float | да | Коэффициент загрузки оборудования, 0..1 |
| horizon_years | float | да | Горизонт расчёта TCO, лет (≥ 5 по ТЗ) |
| maintenance_cost_per_year | float | да | OPEX: обслуживание/ремонт, ₽/год |
| energy_cost_per_year | float | да | OPEX: электроэнергия, ₽/год |
| connectivity_cost_per_year | float | да | OPEX: связь, ₽/год |
| consumables_cost_per_year | float | да | OPEX: расходники, ₽/год |
| financing_type | str | да | `"own_funds"` \| `"credit"` \| `"leasing"` \| `"raas"` |
| reserve_ratio | float | `0.1` | Резерв в CAPEX, доля |

## SensitivityPoint
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| parameter | str | да | Название варьируемого параметра |
| delta_pct | float | да | На сколько % изменён параметр |
| resulting_payback_years | float | да | Получившийся срок окупаемости, лет |
| resulting_roi_pct | float | да | Получившийся ROI, % |

## EconOutput
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| capex_total | float | да | Итоговый CAPEX, ₽ |
| opex_annual | float | да | Итоговый годовой OPEX, ₽ |
| opex_delta_vs_baseline | float | да | Изменение OPEX относительно базового сценария, ₽/год |
| annual_effect | float | да | Чистый годовой экономический эффект, ₽ |
| payback_years | float \| null | да (может быть `None`) | Простой срок окупаемости; `None`, если годовой эффект ≤ 0 |
| roi_pct | float | да | ROI, % |
| tco_total | float | да | TCO на горизонте расчёта, ₽ |
| sensitivity | list[SensitivityPoint] | [] | Минимум 3 параметра чувствительности по ТЗ |
