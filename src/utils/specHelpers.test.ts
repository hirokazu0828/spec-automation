import { describe, it, expect } from 'vitest';
import { getLabel, getColorHex, COLOR_HEX_MAP } from './specHelpers';
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
