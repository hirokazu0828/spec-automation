import type { SpecParameter } from '../data/spec';

export type Lang = 'ja' | 'en';

export function getLabel(paramMap: SpecParameter | undefined, value: string, lang: Lang = 'ja'): string {
  if (!value) return '-';
  if (!paramMap) return value;
  const fromOpt = paramMap.options?.find((o) => o.value === value);
  if (fromOpt) return lang === 'en' ? (fromOpt.en ?? fromOpt.label) : fromOpt.label;
  if (paramMap.options_by_fabric_type) {
    for (const group of Object.values(paramMap.options_by_fabric_type)) {
      const item = group.find((o) => o.value === value);
      if (item) return lang === 'en' ? (item.en ?? item.label) : item.label;
    }
  }
  return value;
}

export const COLOR_HEX_MAP: Record<string, string> = {
  black: '#1A1A1A',
  white: '#F5F5F5',
  gray: '#888780',
  light_gray: '#C4C2BA',
  navy: '#1B2A4A',
  black_navy: '#0D1520',
  sax_blue: '#7BAFD4',
  burgundy: '#7B2035',
  pink: '#F4A0B0',
  green: '#2D6A4F',
  red: '#CC2200',
};

export function getColorHex(colorValue: string | undefined): string {
  if (!colorValue) return '#000000';
  return COLOR_HEX_MAP[colorValue] ?? '#000000';
}

export const SHAPE_LABELS_JA: Record<string, string> = {
  pin: 'ピン型（ブレード型）',
  mallet: 'マレット型',
  neo_mallet: 'ネオマレット（大型マレット）',
};

export const SHAPE_LABELS_SHORT_JA: Record<string, string> = {
  pin: 'ピン型',
  mallet: 'マレット型',
  neo_mallet: 'ネオマレット型',
};

export const POSITION_LABELS_JA: Record<string, string> = {
  luxury: '★★★高級',
  standard: '★★☆スタンダード',
  casual: '★☆☆カジュアル',
};

export const POSITION_LABELS_LONG_JA: Record<string, string> = {
  luxury: '高級ライン',
  standard: 'スタンダードライン',
  casual: 'カジュアルライン',
};

export const POSITION_PROMPT_EN: Record<string, string> = {
  luxury: 'luxury, premium quality, sophisticated craftsmanship',
  standard: 'premium, clean design, quality craftsmanship',
  casual: 'casual, sporty, colorful, fun',
};
