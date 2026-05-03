import { describe, it, expect } from 'vitest';
import type { PutterSample } from './types';
import { getSampleClosureTypes, getSampleDecorationTypes } from './sampleHelpers';

function makeSample(overrides: Partial<PutterSample>): PutterSample {
  return {
    sample_number: 'X',
    client: '',
    item_name: '',
    date: '',
    shape: { head_type: 'ブレード', head_type_confidence: 'high', head_type_reason: '' },
    size: { reference_spec: null, dimensions_noted: null },
    outer_material: { fabric: '', color: '' },
    lining_material: { fabric: '', color: '' },
    closure: { type: '', size: null, detail: null },
    color_scheme: {
      main_color: '',
      tapes: { webbing_45mm: null, nylon_25mm: null, nylon_20mm: null, grosgrain: null },
      hardware_color: null,
    },
    decoration: { type: '', print_widths: null, embroidery_detail: null },
    logo: { type: '', color: '', pantone: null },
    packaging: null,
    meta: { source_pdf: '', image_file: '', needs_review: false, review_reason: null },
    ...overrides,
  } as PutterSample;
}

describe('getSampleClosureTypes', () => {
  it('returns unique non-empty closure values', () => {
    const samples = [
      makeSample({ closure: { type: 'マグネット', size: null, detail: null } }),
      makeSample({ closure: { type: 'マグネット', size: null, detail: null } }),
      makeSample({ closure: { type: 'ベルクロ', size: null, detail: null } }),
      makeSample({ closure: { type: '', size: null, detail: null } }),
    ];
    expect(getSampleClosureTypes(samples)).toEqual(['ベルクロ', 'マグネット']);
  });

  it('returns [] for an empty input', () => {
    expect(getSampleClosureTypes([])).toEqual([]);
  });
});

describe('getSampleDecorationTypes', () => {
  it('returns unique non-empty decoration values', () => {
    const samples = [
      makeSample({ decoration: { type: '刺繍', print_widths: null, embroidery_detail: null } }),
      makeSample({ decoration: { type: 'プリント', print_widths: null, embroidery_detail: null } }),
      makeSample({ decoration: { type: '刺繍', print_widths: null, embroidery_detail: null } }),
      makeSample({ decoration: { type: 'なし', print_widths: null, embroidery_detail: null } }),
    ];
    expect(getSampleDecorationTypes(samples)).toEqual(['なし', 'プリント', '刺繍']);
  });
});
