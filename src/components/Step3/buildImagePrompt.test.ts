import { describe, it, expect } from 'vitest';
import { buildImagePrompt } from './buildImagePrompt';
import { ANGLE_PROMPT_PHRASES, POSITION_PROMPT_PHRASES, NEGATIVE_PROMPT_PHRASE } from '../../data/templates/helpers';

const baseInput = {
  headShape: 'mallet',
  bodyFabric: 'pu_smooth',
  bodyColor: 'black',
  embroidery: 'flat',
  hardwareFinish: 'silver_matte',
  lining: 'poly_smooth',
  closure: 'magnet',
  piping: 'none',
  templateId: undefined,
  position: '',
  selectedAngle: undefined,
};

describe('buildImagePrompt — shape (Layer 3b: catalog promptShapeDescription)', () => {
  it('uses the catalog promptShapeDescription for the silhouette directive', () => {
    const out = buildImagePrompt(baseInput);
    // headShape='mallet' resolves to putter-semi-mallet template
    expect(out).toContain('semi-mallet style golf putter cover');
    expect(out).toContain('moderately rounded head shape');
    expect(out).toContain('Strictly preserve the silhouette');
  });

  it('switches the silhouette description when templateId overrides headShape', () => {
    const out = buildImagePrompt({ ...baseInput, templateId: 'putter-blade' });
    // templateId wins over headShape='mallet' → blade phrasing
    expect(out).toContain('slim blade-style golf putter cover');
    expect(out).toContain('narrow elongated head shape');
  });

  it('falls back to a generic phrase when the headShape is unknown and no templateId', () => {
    const out = buildImagePrompt({ ...baseInput, headShape: 'unknown' });
    expect(out).toContain('a golf putter cover');
    expect(out).not.toContain('blade-style');
    expect(out).not.toContain('mallet style');
  });
});

describe('buildImagePrompt — attribute phrases', () => {
  it('uses english labels for body color and embroidery', () => {
    const out = buildImagePrompt(baseInput);
    expect(out.toLowerCase()).toContain('black');
    expect(out.toLowerCase()).toContain('decoration on the front');
  });

  it('skips the body-fabric phrase when bodyFabric is empty', () => {
    const out = buildImagePrompt({ ...baseInput, bodyFabric: '' });
    expect(out).not.toContain('The body uses');
  });

  it('includes the lining phrase when lining is set', () => {
    const out = buildImagePrompt(baseInput);
    // lining='poly_smooth' → 'smooth polyester lining' (or whatever master en label is)
    expect(out).toContain('Lining material is');
  });

  it('skips the lining phrase when lining is empty', () => {
    const out = buildImagePrompt({ ...baseInput, lining: '' });
    expect(out).not.toContain('Lining material is');
  });
});

describe('buildImagePrompt — angle (Layer 3a + 3b)', () => {
  it.each(['front', 'side_toe', 'back', 'side_heel'] as const)(
    'includes the %s angle phrase when angle is provided',
    (angle) => {
      const out = buildImagePrompt({ ...baseInput, headShape: 'pin' }, angle);
      expect(out).toContain(`(${ANGLE_PROMPT_PHRASES[angle]})`);
    },
  );

  it('omits any angle parenthetical when no angle is given (back-compat)', () => {
    const out = buildImagePrompt({ ...baseInput, headShape: 'pin' });
    // The shape phrase ends with "head shape" so there should be no '(...)' immediately after it.
    expect(out).not.toMatch(/head shape \([^)]+ view/);
  });

  it('falls back to the global ANGLE_PROMPT_PHRASES when the template lacks anglePromptPhrases', () => {
    // Mallet template has anglePromptPhrases in catalog, so this is a sanity
    // check that the global default and the catalog override return the same
    // phrase for the current shipped data.
    const out = buildImagePrompt({ ...baseInput, headShape: 'mallet' }, 'front');
    expect(out).toContain('(front view)');
  });
});

describe('buildImagePrompt — position (Layer 3b)', () => {
  it.each(['luxury', 'standard', 'casual'] as const)(
    'includes the %s position sentence when position is set on data',
    (position) => {
      const out = buildImagePrompt({ ...baseInput, position });
      expect(out).toContain(POSITION_PROMPT_PHRASES[position]);
    },
  );

  it('explicit position arg overrides data.position', () => {
    const out = buildImagePrompt({ ...baseInput, position: 'casual' }, undefined, 'luxury');
    expect(out).toContain(POSITION_PROMPT_PHRASES.luxury);
    expect(out).not.toContain(POSITION_PROMPT_PHRASES.casual);
  });

  it('skips the position sentence when both data.position and the override are empty', () => {
    const out = buildImagePrompt(baseInput);
    for (const p of Object.values(POSITION_PROMPT_PHRASES)) {
      expect(out).not.toContain(p);
    }
  });

  it('skips the position sentence on unknown position values', () => {
    const out = buildImagePrompt({ ...baseInput, position: 'enterprise' });
    for (const p of Object.values(POSITION_PROMPT_PHRASES)) {
      expect(out).not.toContain(p);
    }
  });
});

describe('buildImagePrompt — negative-style guard (Layer 3b)', () => {
  it('always appends the negative-style guard sentence', () => {
    const out = buildImagePrompt(baseInput);
    expect(out).toContain(NEGATIVE_PROMPT_PHRASE);
    // It must come after the studio photography line, not before.
    expect(out.indexOf('Studio product photography')).toBeLessThan(out.indexOf(NEGATIVE_PROMPT_PHRASE));
  });
});
