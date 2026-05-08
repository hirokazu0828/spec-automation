/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 既存のサンプル写真から線図 (line drawing) を抽出する一回限りのビルドスクリプト。
 *
 *   npm run build:lineart
 *
 * 設定は scripts/lineart-config.json にある:
 *   { "pin": "BRG-...jpg", "mallet": "...", "neo_mallet": "...", "options": {...} }
 *
 * 出力は /public/lineart/{pin,mallet,neo_mallet}.png に書かれる。
 *
 * 実行には image-js + canny-edge-detector が必要 (devDeps)。
 * 抽出結果が荒れる場合は config の lowThreshold/highThreshold/gaussianBlur を調整するか、
 * source ファイル名を別のサンプルに差し替えて再実行する。
 */
import { Image } from 'image-js';
import cannyEdgeDetector from 'canny-edge-detector';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

type Options = {
  size: number;
  lowThreshold: number;
  highThreshold: number;
  gaussianBlur: number;
};

type Config = {
  shapes: Record<string, string>;
  options: Options;
};

async function main() {
  const configPath = path.join(__dirname, 'lineart-config.json');
  const raw = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(raw) as Config;
  const { options, shapes } = config;

  const outDir = path.join(ROOT, 'public', 'lineart');
  await fs.mkdir(outDir, { recursive: true });

  for (const [shape, filename] of Object.entries(shapes)) {
    const inputPath = path.join(ROOT, 'public', 'images', filename);
    const outputPath = path.join(outDir, `${shape}.png`);

    try {
      const img = await (Image as any).load(inputPath);
      const resized = img.resize({ width: options.size, height: options.size, preserveAspectRatio: false });
      const grey = resized.grey();
      const edges = cannyEdgeDetector(grey, {
        lowThreshold: options.lowThreshold,
        highThreshold: options.highThreshold,
        gaussianBlur: options.gaussianBlur,
      });
      const inverted = edges.invert();
      await inverted.save(outputPath);
      console.log(`OK ${shape}: ${path.relative(ROOT, outputPath)} (from ${filename})`);
    } catch (e) {
      console.error(`FAIL ${shape}: ${filename}`, e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
