import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * These tests verify the *output* of `npm run subset-fonts` (which the
 * postinstall hook runs automatically). If the subsets are missing, the
 * PDF subsystem falls back to Helvetica and Japanese text renders as tofu
 * boxes — so we want CI to scream loud rather than ship a broken PDF.
 *
 * Run `npm run download:fonts && npm run subset-fonts` if these fail
 * locally.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONT_DIR = path.resolve(__dirname, '..', 'public', 'fonts');

const SUBSETS = [
  { name: 'NotoSansJP-Regular-subset.woff', source: 'NotoSansJP-Regular.woff' },
  { name: 'NotoSansJP-Bold-subset.woff', source: 'NotoSansJP-Bold.woff' },
];

async function statOrNull(p: string): Promise<{ size: number } | null> {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

describe('font subsets (output of scripts/subset-fonts.ts)', () => {
  for (const entry of SUBSETS) {
    it(`${entry.name} exists and is non-empty`, async () => {
      const stat = await statOrNull(path.join(FONT_DIR, entry.name));
      expect(stat, `missing ${entry.name} — run npm run subset-fonts`).not.toBeNull();
      expect(stat!.size).toBeGreaterThan(0);
    });

    it(`${entry.name} is significantly smaller than the source WOFF`, async () => {
      const sub = await statOrNull(path.join(FONT_DIR, entry.name));
      const src = await statOrNull(path.join(FONT_DIR, entry.source));
      // Skip the comparison if the source isn't around (e.g. fresh checkout
      // where download:fonts was skipped) — the existence test above is the
      // critical one.
      if (!sub || !src) return;
      // Subset must be < 80% of the original; we observed ~33% in practice.
      // Anything close to 100% means subsetting silently no-op'd.
      expect(sub.size).toBeLessThan(src.size * 0.8);
    });

    it(`${entry.name} is well under 1 MB (target: ~250-500 KB)`, async () => {
      const stat = await statOrNull(path.join(FONT_DIR, entry.name));
      if (!stat) return;
      expect(stat.size).toBeLessThan(1024 * 1024);
    });
  }
});
