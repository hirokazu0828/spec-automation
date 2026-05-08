import { describe, it, expect } from 'vitest';
import {
  getAllTemplates,
  getTemplateById,
  getTemplateBySubType,
  getTemplateByHeadShape,
  getTemplatesByCategory,
  getCompleteTemplates,
  hasAngle,
  getAvailableAngles,
  ANGLE_DISPLAY_NAMES,
  ANGLE_PROMPT_PHRASES,
} from './helpers';
import { ALL_ANGLES } from './types';

describe('template catalog helpers', () => {
  it('getAllTemplates returns all 3 putter templates', () => {
    const all = getAllTemplates();
    expect(all).toHaveLength(3);
    expect(all.map((t) => t.id).sort()).toEqual(
      ['putter-blade', 'putter-full-mallet', 'putter-semi-mallet'],
    );
  });

  it('getTemplateById returns the matching entry or undefined', () => {
    const blade = getTemplateById('putter-blade');
    expect(blade?.subType).toBe('blade');
    expect(blade?.metadata.lineArtStatus).toBe('complete');
    expect(getTemplateById('does-not-exist')).toBeUndefined();
  });

  it('getTemplateBySubType resolves the SampleBook vocabulary', () => {
    expect(getTemplateBySubType('blade')?.id).toBe('putter-blade');
    expect(getTemplateBySubType('semi_mallet')?.id).toBe('putter-semi-mallet');
    expect(getTemplateBySubType('full_mallet')?.id).toBe('putter-full-mallet');
    expect(getTemplateBySubType('unknown')).toBeUndefined();
  });

  it('getTemplateByHeadShape bridges master headShape values to the catalog', () => {
    expect(getTemplateByHeadShape('pin')?.id).toBe('putter-blade');
    expect(getTemplateByHeadShape('mallet')?.id).toBe('putter-semi-mallet');
    expect(getTemplateByHeadShape('neo_mallet')?.id).toBe('putter-full-mallet');
  });

  it('getTemplateByHeadShape returns undefined for empty / unknown shapes', () => {
    expect(getTemplateByHeadShape('')).toBeUndefined();
    expect(getTemplateByHeadShape('unknown_shape')).toBeUndefined();
  });

  it('getTemplatesByCategory filters by category', () => {
    expect(getTemplatesByCategory('putter')).toHaveLength(3);
    expect(getTemplatesByCategory('headcover')).toHaveLength(0);
  });

  it('getCompleteTemplates returns only blade (the others are pending)', () => {
    const complete = getCompleteTemplates();
    expect(complete).toHaveLength(1);
    expect(complete[0].id).toBe('putter-blade');
  });

  it('hasAngle is true for blade on every angle and false for pending templates', () => {
    const blade = getTemplateById('putter-blade')!;
    for (const angle of ALL_ANGLES) {
      expect(hasAngle(blade, angle)).toBe(true);
    }
    const semi = getTemplateById('putter-semi-mallet')!;
    for (const angle of ALL_ANGLES) {
      expect(hasAngle(semi, angle)).toBe(false);
    }
  });

  it('getAvailableAngles returns 4 angles for blade and 0 for pending templates', () => {
    const blade = getTemplateById('putter-blade')!;
    expect(getAvailableAngles(blade)).toEqual([
      'front',
      'side_toe',
      'back',
      'side_heel',
    ]);
    const full = getTemplateById('putter-full-mallet')!;
    expect(getAvailableAngles(full)).toEqual([]);
  });

  it('the blade template carries the FOURTEEN-derived metadata', () => {
    const blade = getTemplateById('putter-blade')!;
    expect(blade.metadata.logoTreatment).toBe('placeholder');
    expect(blade.metadata.source).toContain('FOURTEEN');
    expect(blade.sampleReferences.length).toBeGreaterThanOrEqual(5);
    expect(blade.recommendedDefaults?.bodyFabric).toBe('pu_smooth');
  });

  it('every template defines all 6 part codes A-F', () => {
    for (const t of getAllTemplates()) {
      expect(t.parts.map((p) => p.code)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    }
  });

  it('display + prompt label maps cover every angle', () => {
    for (const angle of ALL_ANGLES) {
      expect(ANGLE_DISPLAY_NAMES[angle]).toBeTruthy();
      expect(ANGLE_PROMPT_PHRASES[angle]).toBeTruthy();
    }
  });
});
