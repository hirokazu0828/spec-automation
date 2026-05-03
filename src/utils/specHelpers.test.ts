import { describe, it, expect } from 'vitest';
import {
  getLabel,
  getColorHex,
  getOptions,
  getDimensionDefault,
  getDimensionRange,
  isDimensionOutOfRange,
  getShapeByAlias,
  COLOR_HEX_MAP,
} from './specHelpers';
import { specJson } from '../data/spec';

describe('getLabel', () => {
  it('returns "-" when value is empty', () => {
    expect(getLabel(specJson.parameters.body_fabric, '')).toBe('-');
  });

  it('returns the JA label by default', () => {
    expect(getLabel(specJson.parameters.body_fabric, 'pu_smooth')).toBe('PUスムース');
  });

  it('returns the EN label when lang=en', () => {
    expect(getLabel(specJson.parameters.body_fabric, 'pu_smooth', 'en')).toBe('smooth PU leather');
  });

  it('falls back to the raw value when no match exists', () => {
    expect(getLabel(specJson.parameters.body_fabric, 'unknown_value')).toBe('unknown_value');
  });

  it('looks up texture options across fabric types', () => {
    expect(getLabel(specJson.parameters.texture, 'smooth')).toBe('スムース');
  });
});

describe('getColorHex', () => {
  it('returns the mapped hex for a known color', () => {
    expect(getColorHex('black')).toBe(COLOR_HEX_MAP.black);
  });

  it('returns #000000 for unknown / undefined colors', () => {
    expect(getColorHex(undefined)).toBe('#000000');
    expect(getColorHex('not-a-color')).toBe('#000000');
  });
});

describe('getOptions', () => {
  it('returns the options array for a known parameter', () => {
    const opts = getOptions('embroidery');
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.some((o) => o.value === 'flat')).toBe(true);
  });

  it('returns the new thread_type options', () => {
    const opts = getOptions('thread_type');
    expect(opts.map((o) => o.value)).toEqual(expect.arrayContaining(['standard', 'metallic', 'ginnan']));
  });

  it('returns the same array order as the master JSON', () => {
    const opts = getOptions('embroidery');
    const masterOrder = specJson.parameters.embroidery.options ?? [];
    expect(opts.map((o) => o.value)).toEqual(masterOrder.map((o) => o.value));
  });

  it('returns [] for an unknown parameter key', () => {
    expect(getOptions('nonexistent_param')).toEqual([]);
  });
});

describe('dimension helpers', () => {
  it('getDimensionDefault returns the master standard for known shape + field', () => {
    expect(getDimensionDefault('pin', 'dimensionLength')).toBe(200);
    expect(getDimensionDefault('mallet', 'dimensionWidth')).toBe(165);
    expect(getDimensionDefault('neo_mallet', 'dimensionHeight')).toBe(110);
  });

  it('getDimensionDefault returns null for unknown shape', () => {
    expect(getDimensionDefault('unknown_shape', 'dimensionLength')).toBeNull();
  });

  it('getDimensionDefault returns null for fields with no master entry', () => {
    expect(getDimensionDefault('pin', 'dimensionPiping')).toBeNull();
    expect(getDimensionDefault('pin', 'dimensionEmbroidery')).toBeNull();
  });

  it('getDimensionRange returns [min,max] from master', () => {
    expect(getDimensionRange('pin', 'dimensionLength')).toEqual([180, 220]);
  });

  it('isDimensionOutOfRange flags values below/above the master range', () => {
    expect(isDimensionOutOfRange('pin', 'dimensionLength', '170')).toBe(true);
    expect(isDimensionOutOfRange('pin', 'dimensionLength', '230')).toBe(true);
    expect(isDimensionOutOfRange('pin', 'dimensionLength', '200')).toBe(false);
    expect(isDimensionOutOfRange('pin', 'dimensionLength', '180')).toBe(false);
  });

  it('isDimensionOutOfRange returns false for empty / non-numeric / no-range fields', () => {
    expect(isDimensionOutOfRange('pin', 'dimensionLength', '')).toBe(false);
    expect(isDimensionOutOfRange('pin', 'dimensionLength', 'abc')).toBe(false);
    expect(isDimensionOutOfRange('pin', 'dimensionPiping', '50')).toBe(false);
  });
});

describe('getShapeByAlias', () => {
  it('matches by master value', () => {
    expect(getShapeByAlias('pin')).toBe('pin');
    expect(getShapeByAlias('mallet')).toBe('mallet');
    expect(getShapeByAlias('neo_mallet')).toBe('neo_mallet');
  });

  it('matches the samples.json head_type vocabulary', () => {
    expect(getShapeByAlias('ブレード')).toBe('pin');
    expect(getShapeByAlias('セミマレット')).toBe('mallet');
    expect(getShapeByAlias('フルマレット')).toBe('neo_mallet');
  });

  it('matches the master display label', () => {
    expect(getShapeByAlias('ピン型（ブレード型）')).toBe('pin');
    expect(getShapeByAlias('マレット型')).toBe('mallet');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(getShapeByAlias('  Blade  ')).toBe('pin');
    expect(getShapeByAlias('PIN')).toBe('pin');
  });

  it('returns null for unknown / empty inputs', () => {
    expect(getShapeByAlias('')).toBeNull();
    expect(getShapeByAlias(null)).toBeNull();
    expect(getShapeByAlias(undefined)).toBeNull();
    expect(getShapeByAlias('スクエアマレット')).toBeNull();
  });
});
