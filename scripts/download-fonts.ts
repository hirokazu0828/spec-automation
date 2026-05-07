/**
 * postinstall hook + manual `npm run download:fonts` entry.
 *
 * Copies Noto Sans JP Regular / Bold WOFF from the @fontsource/noto-sans-jp
 * npm package (which we depend on as a devDependency) to public/fonts/. The
 * PDF renderer (@react-pdf/renderer 4.x) accepts WOFF via fontkit; we avoid
 * the network entirely so this works in offline environments and on Vercel.
 *
 * Idempotent: skips files that already exist with non-zero size. Best-effort:
 * a missing source file prints a warning but exits 0 so `npm install` doesn't
 * fail.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const FONT_DIR = path.join(REPO_ROOT, 'public', 'fonts');
const FONTSOURCE_DIR = path.join(
  REPO_ROOT,
  'node_modules',
  '@fontsource',
  'noto-sans-jp',
  'files',
);

type FontEntry = { source: string; target: string };

// We pick the `japanese` subset (covers Hiragana / Katakana / common kanji)
// rather than the `0..N` numbered chunks that @fontsource splits the full font
// into. Two weights cover everything Step4 / SAMPLE arrangement / banners
// throw at us.
const FONTS: FontEntry[] = [
  {
    source: 'noto-sans-jp-japanese-400-normal.woff',
    target: 'NotoSansJP-Regular.woff',
  },
  {
    source: 'noto-sans-jp-japanese-700-normal.woff',
    target: 'NotoSansJP-Bold.woff',
  },
];

async function alreadyCopied(target: string, sourceSize: number): Promise<boolean> {
  try {
    const stat = await fs.stat(target);
    return stat.size === sourceSize;
  } catch {
    return false;
  }
}

async function copyOne(entry: FontEntry): Promise<boolean> {
  const sourcePath = path.join(FONTSOURCE_DIR, entry.source);
  const targetPath = path.join(FONT_DIR, entry.target);
  let sourceSize: number;
  try {
    const stat = await fs.stat(sourcePath);
    sourceSize = stat.size;
  } catch {
    console.warn(`[download-fonts] missing source ${sourcePath}; is @fontsource/noto-sans-jp installed?`);
    return false;
  }
  if (await alreadyCopied(targetPath, sourceSize)) {
    console.log(`[download-fonts] skip ${entry.target} (already present)`);
    return true;
  }
  await fs.copyFile(sourcePath, targetPath);
  console.log(
    `[download-fonts] OK ${entry.target} (${(sourceSize / 1024).toFixed(0)} KB)`,
  );
  return true;
}

async function main() {
  await fs.mkdir(FONT_DIR, { recursive: true });
  let allOk = true;
  for (const entry of FONTS) {
    const ok = await copyOne(entry);
    if (!ok) allOk = false;
  }
  if (!allOk) {
    console.warn(
      '[download-fonts] some fonts failed to copy. PDF rendering will use the bundled fallback (latin only). Re-run: npm install && npm run download:fonts',
    );
  }
}

main().catch((e) => {
  console.warn('[download-fonts] unexpected error (best-effort, continuing):', e);
  process.exit(0);
});
