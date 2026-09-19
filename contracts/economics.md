# economics.py — контракт 8: ScenarioInput / EconomicsResult

Граница: **Стас (econWrapper) → фронт (Владимиров)**. API-обёртка вокруг
чистых функций Александры (`econ_io.py`) — не путать EconInput/EconOutput с
этими моделями.

## ScenarioInput
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| project_id | str | да | Идентификатор проекта |
| match_result_id | str | да | Ссылка на результат подбора (MatchResult) |
| scenario_kind | ScenarioKind | да | `baseline` / `purchase` / `raas` / `custom` |
| financing_type | FinancingType | `own_funds` | Способ финансирования |
| staff_cost_per_month | float | да | ₽/мес на замещаемый персонал |
| operating_hours_per_year | float | да | Часы работы в год |
| load_factor | float | да | Коэффициент загрузки, 0..1 |
| horizon_years | float | `5` | Горизонт TCO, лет, минимум 5 по ТЗ |
| assumptions_overrides | dict[str, float] | {} | Точечные допущения поверх дефолтов — для what-if анализа |

## SensitivityResultPoint
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| parameter | str | да | Название варьируемого параметра |
| delta_pct | float | да | На сколько % изменён параметр |
| resulting_payback_years | float | да | Получившийся срок окупаемости, лет |
| resulting_roi_pct | float | да | Получившийся ROI, % |

## EconomicsResult
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| scenario_id | str | да | Идентификатор рассчитанного сценария |
| project_id | str | да | Идентификатор проекта |
| scenario_kind | ScenarioKind | да | Тип сценария |
| capex_total | float | да | Итоговый CAPEX, ₽ |
| capex_breakdown | dict[str, float] | {} | По статьям: оборудование/инфраструктура/ПО/интеграция/пусконаладка/обучение/резерв |
| opex_annual | float | да | Итоговый годовой OPEX, ₽ |
| opex_breakdown | dict[str, float] | {} | По статьям: сервис/лицензии/электроэнергия/связь/расходники/ремонт/персонал |
| opex_delta_vs_baseline | float | да | Изменение OPEX относительно базового сценария |
| annual_effect | float | да | Чистый годовой экономический эффект, ₽ |
| payback_years | float \| null | null | Простой срок окупаемости; `null`, если эффект ≤ 0 |
| roi_pct | float | да | ROI, % |
| tco_total | float | да | TCO на горизонте расчёта, ₽ |
| sensitivity | list[SensitivityResultPoint] | [] | Минимум 3 параметра по ТЗ |
| calculated_at | datetime | да | Момент расчёта |
| assumptions_note | str | да | Явные допущения расчёта — обязательны к показу пользователю по ТЗ |
