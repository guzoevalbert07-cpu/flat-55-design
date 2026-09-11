import type { OptionKey } from '../data/options';

/** 914969 → «914 969 ₽» (неразрывный тонкий пробел между разрядами). */
export function rub(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;
}

/** 914969 → «915 тыс. ₽», 2316666 → «2,32 млн ₽». */
export function rubShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн ₽`;
  return `${Math.round(n / 1000).toLocaleString('ru-RU')} тыс. ₽`;
}

/** Округление до тысяч, как в ТЗ §2: 914969 → «915 000 ₽». */
export function rubK(n: number): string {
  return rub(Math.round(n / 1000) * 1000);
}

export type Total = { label: string; min: number; mid: number; max: number; real: number };
export const COL: Record<OptionKey, 'min' | 'mid' | 'max'> = { eco: 'min', std: 'mid', prem: 'max' };
export const pick = (t: Total, k: OptionKey) => t[COL[k]];

/** Excel-столбец (МИН/СРЕД/МАКС) ↔ опция сайта. */
export const EXCEL_TO_KEY: Record<string, OptionKey> = { МИН: 'eco', СРЕД: 'std', МАКС: 'prem' };

/** Резерв на непредвиденное из листа Параметры (0.1 → «10 %»). */
export function reservePct(params: { name: string; value: number | string }[]): string {
  const p = params.find((x) => x.name.startsWith('Резерв на непредвиденное'));
  const v = typeof p?.value === 'number' ? p.value : 0.1;
  return `${Math.round(v * 100)} %`;
}
/** Общая площадь для расчёта «на 1 м²» (лист Параметры, B4). */
export function baseArea(params: { name: string; value: number | string }[]): number | null {
  const p = params.find((x) => x.name.startsWith('Общая площадь квартиры'));
  return typeof p?.value === 'number' ? p.value : null;
}
