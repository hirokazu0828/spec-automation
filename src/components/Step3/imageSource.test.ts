import { describe, it, expect } from 'vitest';
import {
  deriveUploadSource,
  imageSourceLabel,
  readFileAsDataUrl,
  MAX_UPLOAD_BYTES,
} from './imageSource';

describe('deriveUploadSource', () => {
  it('uploads on a sample draft become "manual"', () => {
    expect(deriveUploadSource('sample')).toBe('manual');
  });
  it('uploads on a final draft become "photo"', () => {
    expect(deriveUploadSource('final')).toBe('photo');
  });
});

describe('imageSourceLabel', () => {
  it('maps the three known sources to Japanese labels', () => {
    expect(imageSourceLabel('generated')).toBe('AI生成');
    expect(imageSourceLabel('manual')).toBe('手動アップロード');
    expect(imageSourceLabel('photo')).toBe('実物写真');
  });
  it('returns null for undefined', () => {
    expect(imageSourceLabel(undefined)).toBeNull();
  });
});

describe('readFileAsDataUrl', () => {
  it('rejects when the file exceeds MAX_UPLOAD_BYTES', async () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'big.png', { type: 'image/png' });
    await expect(readFileAsDataUrl(big)).rejects.toThrow(/上限/);
  });

  it('reads a small file as a data URL', async () => {
    const data = new Uint8Array([137, 80, 78, 71]);
    const small = new File([data], 'tiny.png', { type: 'image/png' });
    const url = await readFileAsDataUrl(small);
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });
});
