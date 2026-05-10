/**
 * Layer 3b-fix-step3-improvements: gpt-image-2 切替検証用の手動 test call スクリプト。
 *
 * **現状**: Layer 3b-fix-step3-improvements の本実装では default model は
 * `gpt-image-1` のまま据え置き、4 アングル一括生成 UX を優先実装した
 * (詳細 `docs/layer3b-step3-improvements-decisions.md`)。本スクリプトは
 * 将来 gpt-image-2 切替検証を再開する際に **そのまま使える状態で残置** する。
 *
 * **将来再開する場合の手順**:
 *   1. cd /path/to/spec-automation
 *   2. git checkout main && git pull
 *   3. PREVIEW_URL='https://...' node scripts/run-step-b-test.cjs
 *   4. 結果次第で `api/generate-image.ts` の DEFAULT_MODEL を 'gpt-image-2'
 *      に変更する小 PR を起こす
 *
 * このスクリプトはローカルから 1 回だけ Vercel Preview の `/api/generate-image`
 * を叩いて gpt-image-2 が動くか確認するもの。Claude Code セッションのサンドボックス
 * は (a) `OPENAI_API_KEY` を持たないため直接 OpenAI に call できず、(b)
 * `*.vercel.app` が host allowlist に入っていないため Preview にも curl で
 * 到達できない。よってユーザがローカルから実行する。
 *
 * オプション環境変数:
 *   PREVIEW_URL  既定: 過去の検証時に取得した Preview URL (古ければ上書き必須)
 *
 * 実行 1 回で gpt-image-2 medium 1024x1024 を 1 枚生成する。コスト約 ¥8。
 * 結果は /tmp/step-b-result.json に保存され、要約が標準出力に出る。
 */
const fs = require('node:fs');
const path = require('node:path');

const PREVIEW_URL =
  process.env.PREVIEW_URL ||
  'https://putter-cover-app-git-cla-7b182f-hirokazugoto0828-3570s-projects.vercel.app';

// buildImagePrompt の固定サンプル出力 (ピン型 / standard / pu_smooth / black / front)。
// Layer 3b の実装で実際にこの文字列が生成されることは vite-node で検証済。
const PROMPT = [
  'Apply realistic surface design to a slim blade-style golf putter cover with a narrow elongated head shape (front view) silhouette in the input image.',
  'Strictly preserve the silhouette and outline shape of the input.',
  'The body uses smooth PU leather material.',
  'The dominant body color is matte black colorway.',
  'Balanced everyday textile finish with a clearly visible mid-sized brand logo, moderate stitching density, and a versatile two-tone color palette appealing to a broad audience.',
  'Studio product photography, pure white background, soft diffused lighting, sharp focus, high resolution.',
  'Avoid text artifacts, plastic glare, or visible seams that break the silhouette.',
].join(' ');

const PNG_PATH = path.resolve(__dirname, '..', 'public', 'templates', 'putter-blade', 'front.png');

async function main() {
  if (!fs.existsSync(PNG_PATH)) {
    console.error(`[step-b] missing ${PNG_PATH}; run from repo root`);
    process.exit(2);
  }
  const imageBase64 = fs.readFileSync(PNG_PATH).toString('base64');
  const payload = {
    prompt: PROMPT,
    imageBase64,
    quality: 'medium',
    model: 'gpt-image-2',
  };

  console.log(`[step-b] POST ${PREVIEW_URL}/api/generate-image`);
  console.log(`[step-b] model=gpt-image-2 quality=medium prompt.length=${PROMPT.length} image=${(imageBase64.length / 1024).toFixed(0)} KB`);
  console.log('[step-b] sending single test call (cost ≈ $0.053 ≈ ¥8)...');

  const start = Date.now();
  const res = await fetch(`${PREVIEW_URL}/api/generate-image`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const elapsedMs = Date.now() - start;
  const status = res.status;
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }

  const summary = {
    httpStatus: status,
    elapsedMs,
    elapsedSec: (elapsedMs / 1000).toFixed(2),
    bodyBytes: text.length,
    parsedJsonOk: Boolean(json),
    errorField: json?.error ?? null,
    hasDataArray: Array.isArray(json?.data),
    firstItemHasB64: Boolean(json?.data?.[0]?.b64_json),
    firstItemB64Bytes: json?.data?.[0]?.b64_json?.length ?? null,
    firstItemHasUrl: Boolean(json?.data?.[0]?.url),
  };
  fs.writeFileSync('/tmp/step-b-result.json', JSON.stringify({ summary, headers: Object.fromEntries(res.headers), bodyHead: text.slice(0, 4096), bodyTail: text.length > 4096 ? text.slice(-1024) : null }, null, 2));

  console.log('\n=== step B summary (paste into the chat) ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nFull response head/tail saved to /tmp/step-b-result.json');
}

main().catch((e) => {
  console.error('[step-b] unexpected error:', e);
  process.exit(1);
});
