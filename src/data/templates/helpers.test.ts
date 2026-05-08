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
  POSITION_PROMPT_PHRASES,
  NEGATIVE_PROMPT_PHRASE,
  getAnglePromptPhrase,
  getPositionPromptPhrase,
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

  it('every catalog template ships its own anglePromptPhrases (Layer 3b)', () => {
    // Pending templates also carry the override even though their line-art
    // isn't ready — so we can plug them straight into the prompt builder
    // once Phase B lands the PNGs.
    for (const t of getAllTemplates()) {
      expect(t.anglePromptPhrases).toBeDefined();
      for (const angle of ALL_ANGLES) {
        expect(t.anglePromptPhrases?.[angle]).toBeTruthy();
      }
    }
  });

  it('every catalog template ships a promptShapeDescription (Layer 3b)', () => {
    for (const t of getAllTemplates()) {
      expect(t.promptShapeDescription).toBeTruthy();
      // Should start with an article so it slots cleanly into "Apply ... to <X> silhouette".
      expect(t.promptShapeDescription).toMatch(/^a /);
    }
  });
});

describe('getAnglePromptPhrase (Layer 3b)', () => {
  it('returns the catalog override when the template defines one', () => {
    expect(getAnglePromptPhrase('putter-blade', 'front')).toBe('front view');
    expect(getAnglePromptPhrase('putter-blade', 'side_toe')).toBe('toe-side view');
  });

  it('falls back to the global ANGLE_PROMPT_PHRASES when the templateId is unknown', () => {
    expect(getAnglePromptPhrase('does-not-exist', 'front')).toBe(ANGLE_PROMPT_PHRASES.front);
    expect(getAnglePromptPhrase(undefined, 'back')).toBe(ANGLE_PROMPT_PHRASES.back);
  });
});

describe('getPositionPromptPhrase (Layer 3b)', () => {
  it.each(['luxury', 'standard', 'casual'] as const)(
    'returns the phrase for known position %s',
    (p) => {
      expect(getPositionPromptPhrase(p)).toBe(POSITION_PROMPT_PHRASES[p]);
    },
  );

  it('returns null for empty / unknown / undefined positions', () => {
    expect(getPositionPromptPhrase('')).toBeNull();
    expect(getPositionPromptPhrase(undefined)).toBeNull();
    expect(getPositionPromptPhrase('enterprise')).toBeNull();
  });

  it('avoids the literal "luxury" / "premium" / price words in any phrase', () => {
    for (const phrase of Object.values(POSITION_PROMPT_PHRASES)) {
      expect(phrase.toLowerCase()).not.toMatch(/\bluxury\b/);
      expect(phrase.toLowerCase()).not.toMatch(/\bpremium\b/);
      expect(phrase).not.toMatch(/¥|\$/);
      expect(phrase.toLowerCase()).not.toMatch(/\bexpensive\b/);
      expect(phrase.toLowerCase()).not.toMatch(/\bcheap\b|\bbudget\b/);
    }
  });
});

describe('NEGATIVE_PROMPT_PHRASE (Layer 3b)', () => {
  it('mentions the failure modes we want gpt-image-1 to avoid', () => {
    expect(NEGATIVE_PROMPT_PHRASE.toLowerCase()).toContain('avoid');
    expect(NEGATIVE_PROMPT_PHRASE.toLowerCase()).toContain('silhouette');
  });
});
