/**
 * postinstall (chained after download-fonts.ts) + manual `npm run subset-fonts`.
 *
 * Reads the full Noto Sans JP WOFFs that download-fonts.ts copies into
 * public/fonts/ and emits BUSINESS_CHARSET-only subsets next to them
 * (NotoSansJP-{Regular,Bold}-subset.woff). The subsets are what the PDF
 * renderer actually loads (see src/components/Step4/pdf/fonts.ts).
 *
 * Why subset?
 *   - Full Noto Sans JP japanese WOFF is ~1.4 MB per weight; @react-pdf/renderer
 *     parses + embeds the entire file each render, taking ~10 s end-to-end on
 *     a real spec sheet.
 *   - BUSINESS_CHARSET (~2.4 K chars: ASCII + kana + Joyo + business extras)
 *     covers everything the spec sheet prints, and subsets to ~250-350 KB per
 *     weight, cutting render time to ~1-2 s.
 *
 * Idempotent: skips if a non-empty subset already exists for both weights.
 * Best-effort: a missing source WOFF prints a warning but exits 0 so
 * `npm install` doesn't fail. To force re-subset, delete the *-subset.woff
 * files and re-run.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import { BUSINESS_CHARSET } from './data/charset.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const FONT_DIR = path.join(REPO_ROOT, 'public', 'fonts');

type SubsetEntry = { source: string; target: string; label: string };

const ENTRIES: SubsetEntry[] = [
  {
    source: 'NotoSansJP-Regular.woff',
    target: 'NotoSansJP-Regular-subset.woff',
    label: 'Regular',
  },
  {
    source: 'NotoSansJP-Bold.woff',
    target: 'NotoSansJP-Bold-subset.woff',
    label: 'Bold',
  },
];

async function fileExistsNonEmpty(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.size > 0;
  } catch {
    return false;
  }
}

async function subsetOne(entry: SubsetEntry): Promise<boolean> {
  const sourcePath = path.join(FONT_DIR, entry.source);
  const targetPath = path.join(FONT_DIR, entry.target);

  let sourceBuf: Buffer;
  try {
    sourceBuf = await fs.readFile(sourcePath);
  } catch {
    console.warn(
      `[subset-fonts] missing source ${sourcePath}; run \`npm run download:fonts\` first`,
    );
    return false;
  }

  if (await fileExistsNonEmpty(targetPath)) {
    console.log(`[subset-fonts] skip ${entry.target} (already present)`);
    return true;
  }

  const subsetBuf = await subsetFont(sourceBuf, BUSINESS_CHARSET, {
    targetFormat: 'woff',
  });
  await fs.writeFile(targetPath, subsetBuf);

  const beforeKB = (sourceBuf.length / 1024).toFixed(0);
  const afterKB = (subsetBuf.length / 1024).toFixed(0);
  const ratio = ((subsetBuf.length / sourceBuf.length) * 100).toFixed(1);
  console.log(
    `[subset-fonts] OK ${entry.label.padEnd(7)} ${beforeKB} KB → ${afterKB} KB (${ratio}%)`,
  );
  return true;
}

async function main() {
  await fs.mkdir(FONT_DIR, { recursive: true });
  let allOk = true;
  for (const entry of ENTRIES) {
    const ok = await subsetOne(entry);
    if (!ok) allOk = false;
  }
  if (!allOk) {
    console.warn(
      '[subset-fonts] some subsets failed. PDF rendering will fall back to the full WOFF (slow) or to Helvetica (no Japanese).',
    );
  }
}

main().catch((e) => {
  console.warn('[subset-fonts] unexpected error (best-effort, continuing):', e);
  process.exit(0);
});
