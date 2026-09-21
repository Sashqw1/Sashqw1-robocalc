/**
 * Справочники-заглушки. Потом приходят из /admin/dictionaries через API
 * (открытый вопрос 3 в docs/architecture/pages.md).
 */

import type { ObjectType, ScenarioKind, FinancingType, AvailabilityStatus, MatchStatus, ProjectStatus, NavigationType, CompatibilityVerdict, DataConfidence, AcquisitionModel } from '../types/contracts';

export const OBJECT_TYPES: { value: ObjectType; label: string; short: string; description: string; needs: string[] }[] = [
  {
    value: 'warehouse',
    label: 'Склад',
    short: 'Склад',
    description: 'Приёмка, хранение, комплектация и отгрузка: AMR, штабелёры, тягачи, автоматические хранилища.',
    needs: ['площадь и планировка', 'операции в сутки', 'груз: масса и габариты', 'персонал и его стоимость'],
  },
  {
    value: 'airport',
    label: 'Аэропорт',
    short: 'Аэропорт',
    description: 'Перрон, терминал, багажное отделение: буксировка, доставка, уборка, перевозка багажа.',
    needs: ['зона работ и доступ', 'пассажиро- или грузопоток', 'пиковая нагрузка', 'требования безопасности'],
  },
  {
    value: 'medical',
    label: 'Медучреждение',
    short: 'Медицина',
    description: 'Внутренняя логистика больницы: бельё, питание, медикаменты, отходы — с учётом лифтов и санитарии.',
    needs: ['площадь и этажность', 'потоки грузов по категориям', 'маршруты и лифты', 'санитарные требования'],
  },
];

export const objectTypeLabel = (t: ObjectType) => OBJECT_TYPES.find((o) => o.value === t)?.label ?? t;

export const OPERATING_MODES = ['24/7', '2 смены по 12 ч', '3 смены по 8 ч', '1 смена, 8 ч', '5/2, 2 смены'] as const;

export const STORAGE_TYPES = [
  'Фронтальные стеллажи',
  'Набивные стеллажи',
  'Мезонин',
  'Напольное хранение',
  'Полочные стеллажи',
  'Гравитационные стеллажи',
] as const;

export const WAREHOUSE_ZONES = ['Приёмка', 'Хранение', 'Комплектация', 'Упаковка', 'Отгрузка', 'Возвраты', 'Зарядка'] as const;

export const LAYOUT_CONSTRAINTS = [
  'Узкие проходы до 2,5 м',
  'Колонны с шагом 6×6 м',
  'Перепады уровня пола',
  'Рампы и пандусы',
  'Смешанное движение с погрузчиками',
  'Низкие потолки до 6 м',
] as const;

export const AIRPORT_ZONES = ['Перрон', 'Терминал, чистая зона', 'Терминал, общая зона', 'Багажное отделение', 'Грузовой терминал'] as const;

export const SAFETY_REQUIREMENTS = [
  'Досмотр оборудования СБ',
  'Ограничение скорости 6 км/ч',
  'Проблесковый маячок',
  'Работа при −30 °C',
  'Взаимодействие с наземной техникой',
] as const;

export const FACILITY_TYPES = ['Многопрофильная больница', 'Специализированный центр', 'Поликлиника', 'Лаборатория', 'Реабилитационный центр'] as const;

export const MEDICAL_CARGO_CATEGORIES = [
  { key: 'cargo', label: 'Грузы' },
  { key: 'linen', label: 'Бельё' },
  { key: 'food', label: 'Питание' },
  { key: 'drugs', label: 'Медикаменты' },
  { key: 'waste', label: 'Отходы' },
] as const;

export const SANITARY_REQUIREMENTS = [
  'Раздельные потоки чистого и грязного',
  'Обработка дезсредствами',
  'Закрытые контейнеры',
  'Класс чистоты помещений',
] as const;

export const SOLUTION_TYPES = [
  'AMR',
  'Робот-штабелёр',
  'Робот-тягач',
  'Беспилотный погрузчик',
  'Робот-уборщик',
  'Автоматическое хранилище',
  'Сортировочный робот',
  'Робот доставки',
] as const;

export const PROCESSES = ['Приёмка', 'Перемещение', 'Комплектация', 'Отгрузка', 'Инвентаризация', 'Уборка', 'Буксировка', 'Доставка'] as const;

export const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  available: 'Доступно',
  limited: 'Ограниченно',
  discontinued: 'Снято с производства',
  upcoming: 'Ожидается',
};

export const NAVIGATION_LABEL: Record<NavigationType, string> = {
  lidar_slam: 'Лидар + SLAM',
  visual_slam: 'Визуальный SLAM',
  magnetic_tape: 'Магнитная лента',
  qr_markers: 'QR-метки',
  wire_guided: 'Индукционный провод',
  other: 'Другое',
};

export const ACQUISITION_LABEL: Record<AcquisitionModel, string> = {
  purchase: 'Покупка',
  leasing: 'Лизинг',
  raas: 'Роботы как услуга',
};

export const CONFIDENCE_LABEL: Record<DataConfidence, string> = {
  verified: 'Проверено',
  partial: 'Частично',
  unverified: 'Не проверено',
};

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  recommended: 'Рекомендовано',
  needs_review: 'Требует проверки',
  excluded: 'Исключено',
};

export const SCENARIO_KIND_LABEL: Record<ScenarioKind, string> = {
  baseline: 'Базовый',
  purchase: 'Покупка',
  raas: 'RaaS',
  custom: 'Свой сценарий',
};

export const FINANCING_LABEL: Record<FinancingType, string> = {
  own_funds: 'Собственные средства',
  credit: 'Кредит',
  leasing: 'Лизинг',
  raas: 'Роботы как услуга',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Черновик',
  calculated: 'Рассчитан',
  archived: 'В архиве',
};

export const VERDICT_LABEL: Record<CompatibilityVerdict, string> = {
  allowed: 'Совместимо',
  forbidden: 'Несовместимо',
  warning: 'С оговоркой',
  needs_review: 'Проверить вручную',
};

export const CAPEX_LABELS: Record<string, string> = {
  equipment: 'Оборудование',
  infrastructure: 'Инфраструктура',
  software: 'ПО и лицензии',
  integration: 'Интеграция',
  commissioning: 'Пусконаладка',
  training: 'Обучение',
  reserve: 'Резерв',
};

export const OPEX_LABELS: Record<string, string> = {
  service: 'Сервис',
  licenses: 'Лицензии',
  energy: 'Электроэнергия',
  connectivity: 'Связь',
  consumables: 'Расходники',
  repair: 'Ремонт',
  staff: 'Персонал',
};
