import { describe, it, expect } from 'vitest';
import { BUSINESS_CHARSET } from './charset';

describe('BUSINESS_CHARSET', () => {
  // O(1) lookups; the joined string is a couple thousand chars long so a Set
  // keeps the assertions readable.
  const chars = new Set(BUSINESS_CHARSET);

  it('contains every printable ASCII char (U+0020..U+007E)', () => {
    const missing: string[] = [];
    for (let cp = 0x20; cp <= 0x7e; cp++) {
      const ch = String.fromCodePoint(cp);
      if (!chars.has(ch)) missing.push(ch);
    }
    expect(missing).toEqual([]);
  });

  it('contains the full Hiragana block (U+3041..U+3096)', () => {
    const missing: string[] = [];
    for (let cp = 0x3041; cp <= 0x3096; cp++) {
      const ch = String.fromCodePoint(cp);
      if (!chars.has(ch)) missing.push(ch);
    }
    expect(missing).toEqual([]);
  });

  it('contains the full Katakana block (U+30A1..U+30FF) including choon', () => {
    const missing: string[] = [];
    for (let cp = 0x30a1; cp <= 0x30ff; cp++) {
      const ch = String.fromCodePoint(cp);
      if (!chars.has(ch)) missing.push(ch);
    }
    expect(missing).toEqual([]);
    expect(chars.has('ー')).toBe(true);
  });

  it('contains the business-specific kanji that show up on real spec sheets', () => {
    // Sampled from src/data/spec/putter-cover.json labels and samples.json
    // vocabulary: material parts + Joyo kanji we rely on. If any of these are
    // missing the PDF falls back to Helvetica and renders as a tofu box.
    const required = [
      // joyo kanji used in master labels
      '生',
      '地',
      '仕',
      '様',
      '色',
      '糸',
      '番',
      '号',
      '部',
      '位',
      '改',
      '訂',
      '履',
      '歴',
      '寸',
      '法',
      '製',
      '品',
      '写',
      '真',
      // business-specific extras
      '柔',
      '羊',
      '毛',
      '絨',
      '綿',
      '橙',
      '宛',
      '先',
      '納',
      '期',
      '備',
      '考',
    ];
    const missing = required.filter((ch) => !chars.has(ch));
    expect(missing).toEqual([]);
  });

  it('is deduplicated (no UTF-16 code unit appears twice)', () => {
    // BUSINESS_CHARSET is built by Set-deduping `.split('')` (UTF-16 units),
    // so the right invariant is "split + Set + join leaves length unchanged".
    // (We compare against a fresh Set on `.split('')` rather than `new Set(str)`,
    // which iterates code points and would give a smaller size if any
    // supplementary-plane char sneaks in — possible since `joyo-kanji` may
    // include a kanji outside the BMP.)
    const dedup = new Set(BUSINESS_CHARSET.split('')).size;
    expect(BUSINESS_CHARSET.length).toBe(dedup);
  });

  it('is large enough to cover Joyo + kana + ASCII (~2000+ chars)', () => {
    // 95 ASCII + 86 Hiragana + 95 Katakana + 2136 Joyo + ~140 extras
    // = roughly 2400 unique chars. If this drops below 2000 something has
    // regressed (likely the joyo-kanji import is broken).
    expect(BUSINESS_CHARSET.length).toBeGreaterThan(2000);
  });
});
