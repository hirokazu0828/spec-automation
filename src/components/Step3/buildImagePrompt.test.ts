import { describe, it, expect } from 'vitest';
import { buildImagePrompt } from './buildImagePrompt';

const baseInput = {
  headShape: 'mallet',
  bodyFabric: 'pu_smooth',
  bodyColor: 'black',
  embroidery: 'flat',
  hardwareFinish: 'silver_matte',
  lining: 'poly_smooth',
  closure: 'magnet',
  piping: 'none',
};

describe('buildImagePrompt', () => {
  it('includes the headShape silhouette directive', () => {
    const out = buildImagePrompt(baseInput);
    expect(out).toContain('mallet-style');
    expect(out).toContain('Strictly preserve the silhouette');
  });

  it('skips fabric phrase when bodyFabric is empty', () => {
    const out = buildImagePrompt({ ...baseInput, bodyFabric: '' });
    expect(out).not.toContain('material');
  });

  it('uses english labels for body color and embroidery', () => {
    const out = buildImagePrompt(baseInput);
    expect(out.toLowerCase()).toContain('black');
    expect(out.toLowerCase()).toContain('decoration on the front');
  });

  it('falls back to generic shape when headShape is unknown', () => {
    const out = buildImagePrompt({ ...baseInput, headShape: 'unknown' });
    expect(out).toContain('a golf putter cover');
  });
});
