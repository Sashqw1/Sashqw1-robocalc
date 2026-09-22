/**
 * Единый справочник категорий — contracts/dictionaries/categories.json.
 * Его же читают редактор плана (Алексей) и бэкенд. Свои списки в коде не
 * заводим: новое значение добавляется в JSON. В данных храним id, label — для показа.
 */

import categories from '../../../../contracts/dictionaries/categories.json';
import type { ObjectType, ZoneType } from '../types/contracts';

export interface DictItem {
  id: string;
  label: string;
}

export interface WorkingZoneItem extends DictItem {
  zone_type: ZoneType;
  object_types: ObjectType[];
}

export interface ZoneTypeItem extends DictItem {
  id: ZoneType;
  color: string;
}

export interface EquipmentCategoryItem extends DictItem {
  footprint_m: [number, number];
}

export interface Categories {
  version: number;
  zone_types: ZoneTypeItem[];
  working_zones: WorkingZoneItem[];
  point_kinds: DictItem[];
  equipment_categories: EquipmentCategoryItem[];
  operating_modes: DictItem[];
  storage_types: DictItem[];
  layout_constraints: DictItem[];
  airport_zones: DictItem[];
  safety_requirements: DictItem[];
  facility_types: DictItem[];
  medical_cargo_categories: DictItem[];
  routes_and_elevators: DictItem[];
  sanitary_requirements: DictItem[];
  access_restrictions: DictItem[];
  processes: DictItem[];
}

export const CATEGORIES = categories as unknown as Categories;

export type DictSection = Exclude<keyof Categories, 'version'>;

/** Префикс для значений, вписанных пользователем вручную, а не выбранных из справочника. */
export const CUSTOM_PREFIX = 'custom:';

export function optionsOf(section: DictSection): { value: string; label: string }[] {
  return (CATEGORIES[section] as DictItem[]).map((i) => ({ value: i.id, label: i.label }));
}

/** Подпись по id; для «своих» значений — сам текст без префикса. */
export function labelOf(section: DictSection, id: string): string {
  if (id.startsWith(CUSTOM_PREFIX)) return id.slice(CUSTOM_PREFIX.length);
  return (CATEGORIES[section] as DictItem[]).find((i) => i.id === id)?.label ?? id;
}

export function workingZone(id: string): WorkingZoneItem | undefined {
  return CATEGORIES.working_zones.find((z) => z.id === id);
}

export function zoneType(id: ZoneType): ZoneTypeItem {
  return CATEGORIES.zone_types.find((z) => z.id === id) ?? CATEGORIES.zone_types[0];
}

export const solutionTypeLabel = (id: string) => labelOf('equipment_categories', id);
