import { describe, it, expect } from 'vitest';
import {
  getLabel,
  getColorHex,
  getOptions,
  getDimensionDefault,
  getDimensionRange,
  isDimensionOutOfRange,
  getShapeByAlias,
  getOptionValueByAlias,
  generatePdfFileName,
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

describe('getOptionValueByAlias', () => {
  it('resolves common samples.json color names to master body_color values', () => {
    // Mappings exercised by the SampleBook → Wizard seed path.
    expect(getOptionValueByAlias('body_color', 'BLACK')).toBe('black');
    expect(getOptionValueByAlias('body_color', '黒')).toBe('black');
    expect(getOptionValueByAlias('body_color', 'NAVY')).toBe('navy');
    expect(getOptionValueByAlias('body_color', '紺')).toBe('navy');
    expect(getOptionValueByAlias('body_color', '赤')).toBe('red');
    expect(getOptionValueByAlias('body_color', '緑')).toBe('green');
    expect(getOptionValueByAlias('body_color', 'PC.GREEN')).toBe('green');
    expect(getOptionValueByAlias('body_color', 'L.GRAY')).toBe('light_gray');
    expect(getOptionValueByAlias('body_color', '浅青')).toBe('sax_blue');
    expect(getOptionValueByAlias('body_color', 'エンジ')).toBe('burgundy');
  });

  it('returns null for sample colors that have no master equivalent', () => {
    // 橙 / オレンジ are absent from master — must return null so the seed
    // falls back to "leave blank" instead of guessing.
    expect(getOptionValueByAlias('body_color', '橙')).toBeNull();
    expect(getOptionValueByAlias('body_color', 'オレンジ')).toBeNull();
    expect(getOptionValueByAlias('body_color', 'GREEN CAMO')).toBeNull();
  });

  it('resolves the spelling variants of 天ウーロン to ten_uron', () => {
    expect(getOptionValueByAlias('lining', '天ウーロン')).toBe('ten_uron');
    expect(getOptionValueByAlias('lining', 'テンウーロン')).toBe('ten_uron');
    expect(getOptionValueByAlias('lining', 'テンダーロン')).toBe('ten_uron');
    expect(getOptionValueByAlias('lining', 'デンザーロン・メッシュ')).toBe('ten_uron');
    expect(getOptionValueByAlias('lining', '天竹ーロン、メッシュ')).toBe('ten_uron');
  });

  it('returns null for lining vocab that does not map (ボア / メッシュ alone)', () => {
    expect(getOptionValueByAlias('lining', 'ボア')).toBeNull();
    expect(getOptionValueByAlias('lining', 'メッシュ')).toBeNull();
    expect(getOptionValueByAlias('lining', '羊毛絨')).toBeNull();
  });

  it('returns null for unknown parameter keys / empty inputs', () => {
    expect(getOptionValueByAlias('nonexistent', 'anything')).toBeNull();
    expect(getOptionValueByAlias('body_color', '')).toBeNull();
    expect(getOptionValueByAlias('body_color', null)).toBeNull();
  });
});

describe('generatePdfFileName (Layer 2-PDF)', () => {
  it('formats sample with revision number', () => {
    expect(
      generatePdfFileName({ productCode: 'KOD-001', documentType: 'sample', sampleRevision: 1 }),
    ).toBe('KOD-001_sample_1.pdf');
    expect(
      generatePdfFileName({ productCode: 'KOD-001', documentType: 'sample', sampleRevision: 2 }),
    ).toBe('KOD-001_sample_2.pdf');
  });

  it('formats final without revision', () => {
    expect(
      generatePdfFileName({ productCode: 'KOD-001', documentType: 'final' }),
    ).toBe('KOD-001_final.pdf');
  });

  it('inserts _vs_ for parallel output mode', () => {
    expect(
      generatePdfFileName(
        { productCode: 'KOD-001', documentType: 'sample', sampleRevision: 1 },
        { productCode: 'KOD-002' },
      ),
    ).toBe('KOD-001_vs_KOD-002_sample_1.pdf');
  });

  it('falls back to "spec" when productCode is empty / whitespace', () => {
    expect(
      generatePdfFileName({ productCode: '', documentType: 'sample', sampleRevision: 1 }),
    ).toBe('spec_sample_1.pdf');
    expect(
      generatePdfFileName({ productCode: '   ', documentType: 'final' }),
    ).toBe('spec_final.pdf');
  });

  it('falls back to "spec_vs_spec" when both productCodes are empty', () => {
    expect(
      generatePdfFileName(
        { productCode: '', documentType: 'sample', sampleRevision: 1 },
        { productCode: '' },
      ),
    ).toBe('spec_vs_spec_sample_1.pdf');
  });

  it('defaults sampleRevision to 1 when undefined', () => {
    expect(
      generatePdfFileName({ productCode: 'KOD-001', documentType: 'sample' }),
    ).toBe('KOD-001_sample_1.pdf');
  });
});
