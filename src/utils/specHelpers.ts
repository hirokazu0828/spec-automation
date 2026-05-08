import type { SpecOption, SpecParameter } from '../data/spec';
import { specJson } from '../data/spec';
import type { SpecData } from '../types';

export type Lang = 'ja' | 'en';

/**
 * Builds the PDF download filename per Layer 2-PDF spec:
 *   {productCode}_{type}{_revision}.pdf
 * with `secondary` injecting `_vs_{secondaryProductCode}` after the primary
 * code when the parallel-output mode is on. Empty productCodes fall back to
 * the literal "spec" so we never produce a leading underscore.
 *
 * Examples:
 *   sample rev=1, code='KOD-001'         → 'KOD-001_sample_1.pdf'
 *   final, code='KOD-001'                → 'KOD-001_final.pdf'
 *   sample rev=2, code='KOD-001', sec='KOD-002' → 'KOD-001_vs_KOD-002_sample_2.pdf'
 *   sample rev=1, code=''                → 'spec_sample_1.pdf'
 *
 * `secondary` accepts the minimum `{ productCode: string }` shape so callers
 * don't have to thread the full DraftEnvelope through.
 */
export function generatePdfFileName(
  data: Pick<SpecData, 'productCode' | 'documentType' | 'sampleRevision'>,
  secondary?: { productCode: string },
): string {
  const fallback = (code: string | undefined): string =>
    code && code.trim() !== '' ? code.trim() : 'spec';
  const primary = fallback(data.productCode);
  const codePart = secondary
    ? `${primary}_vs_${fallback(secondary.productCode)}`
    : primary;
  const typePart =
    data.documentType === 'sample'
      ? `sample_${data.sampleRevision ?? 1}`
      : 'final';
  return `${codePart}_${typePart}.pdf`;
}

/**
 * Returns the options list for a top-level parameter from the master JSON.
 * Returns `[]` (not undefined) so callers can map without null checks.
 */
export function getOptions(parameterKey: string): SpecOption[] {
  return specJson.parameters[parameterKey]?.options ?? [];
}

/**
 * English-style ordinal suffix as specified by Layer 4: 1→1st, 2→2nd, 3→3rd,
 * everything else uses "th" (so 21→21th, not 21st). Day-to-day English would
 * say 21st/22nd/23rd, but the spec deliberately keeps it simple.
 */
export function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function normalizeAlias(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Resolves an arbitrary input string (label / alias / external vocabulary /
 * the value itself) to a master `parameterKey.options[].value`. Matching is
 * case-insensitive after trim, and falls back through `value → label → aliases`.
 * Returns null when nothing matches.
 *
 * Used to bridge external sample-book vocabularies (e.g. samples.json's
 * "BLACK" / "黒" / "L.GRAY") to the master IDs (`black` / `light_gray`).
 */
export function getOptionValueByAlias(
  parameterKey: string,
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  const needle = normalizeAlias(input);
  if (!needle) return null;
  for (const opt of getOptions(parameterKey)) {
    if (normalizeAlias(opt.value) === needle) return opt.value;
    if (normalizeAlias(opt.label) === needle) return opt.value;
    if (opt.aliases?.some((a) => normalizeAlias(a) === needle)) return opt.value;
  }
  return null;
}

/**
 * Resolves an arbitrary input (label / external vocabulary / value itself)
 * to the master `head_shape` option's `value`. Thin wrapper around
 * `getOptionValueByAlias('head_shape', input)`, kept for backward compatibility
 * with Layer 2's call sites.
 */
export function getShapeByAlias(input: string | null | undefined): string | null {
  return getOptionValueByAlias('head_shape', input);
}

/**
 * Mapping from `SpecData` dimension field name to the master JSON's dimension key.
 * Step4 also has `dimensionPiping` and `dimensionEmbroidery`, but those have no
 * standard default in master so they are intentionally absent here.
 */
export const DIMENSION_FIELD_TO_MASTER_KEY: Record<string, string> = {
  dimensionLength: '全長_mm',
  dimensionWidth: '幅_mm',
  dimensionHeight: '高さ_mm',
};

export type DimensionFieldKey = keyof typeof DIMENSION_FIELD_TO_MASTER_KEY;

/**
 * Returns the master-defined "standard" value (in mm) for the given shape and
 * SpecData dimension field, or null if no master entry exists.
 */
export function getDimensionDefault(
  shape: string | undefined,
  fieldName: string,
): number | null {
  if (!shape) return null;
  const masterKey = DIMENSION_FIELD_TO_MASTER_KEY[fieldName];
  if (!masterKey) return null;
  const dim = specJson.dimensions?.[shape]?.[masterKey];
  return typeof dim?.standard === 'number' ? dim.standard : null;
}

/**
 * Returns the master-defined `[min, max]` range for the given shape and
 * dimension field, or null if no range is registered.
 */
export function getDimensionRange(
  shape: string | undefined,
  fieldName: string,
): [number, number] | null {
  if (!shape) return null;
  const masterKey = DIMENSION_FIELD_TO_MASTER_KEY[fieldName];
  if (!masterKey) return null;
  const range = specJson.dimensions?.[shape]?.[masterKey]?.range;
  if (!range || range.length < 2) return null;
  return [range[0], range[1]];
}

/**
 * Returns true when the user-entered numeric value (string) is outside the
 * master range. An empty / non-numeric value never warns.
 */
export function isDimensionOutOfRange(
  shape: string | undefined,
  fieldName: string,
  rawValue: string,
): boolean {
  if (!rawValue) return false;
  const n = Number(rawValue);
  if (!Number.isFinite(n)) return false;
  const range = getDimensionRange(shape, fieldName);
  if (!range) return false;
  return n < range[0] || n > range[1];
}

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
