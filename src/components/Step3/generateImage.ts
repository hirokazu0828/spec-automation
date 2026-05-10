import type { TemplateAngle } from '../../types';
import { ALL_ANGLES } from '../../data/templates/types';

export type GenerateImageOptions = {
  prompt: string;
  imageBase64?: string;
  quality?: 'low' | 'medium' | 'high';
  endpoint?: string;
  /**
   * Layer 3b-fix-step3-improvements: opt-in model override forwarded to the
   * server allowlist. Defaults to the server's own default ('gpt-image-1').
   * Kept here so a future gpt-image-2 reopening (see
   * `docs/layer3b-step3-improvements-decisions.md` §future-work) only needs
   * to flip a flag.
   */
  model?: 'gpt-image-1' | 'gpt-image-2';
};

type ImagePayloadItem = { b64_json?: string; url?: string };

export type GenerateImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

export type AngleGenerateResult = { angle: TemplateAngle } & GenerateImageResult;

const RATE_LIMIT_RE = /429|rate[ _-]?limit|too many requests/i;
const SEQUENTIAL_FALLBACK_DELAY_MS = 500;

export async function generateImage(opts: GenerateImageOptions): Promise<GenerateImageResult> {
  const endpoint = opts.endpoint ?? '/api/generate-image';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: opts.prompt,
        imageBase64: opts.imageBase64,
        quality: opts.quality ?? 'medium',
        ...(opts.model ? { model: opts.model } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { data?: ImagePayloadItem[]; error?: string | { message: string } };
    if (data.error) {
      const msg = typeof data.error === 'string' ? data.error : data.error.message;
      return { ok: false, error: msg };
    }
    const item = data.data?.[0];
    if (!item) return { ok: false, error: '画像が返されませんでした' };
    if (item.b64_json) return { ok: true, dataUrl: `data:image/png;base64,${item.b64_json}` };
    if (item.url) return { ok: true, dataUrl: item.url };
    return { ok: false, error: '画像データが見つかりません' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '通信エラー' };
  }
}

/**
 * Layer 3b-fix-step3-improvements: bulk-generate images for the requested
 * angles in parallel via `Promise.all`. On any 429-style rate-limit response,
 * retry only the failed angles sequentially with a 500ms inter-call delay
 * (everything that succeeded in the parallel pass is kept as-is).
 *
 * The `buildOne` callback is invoked once per angle so the caller can vary
 * the prompt and image-base64 per angle. This keeps `generateImagesForAllAngles`
 * a thin orchestration layer; prompt assembly stays in `buildImagePrompt`.
 */
export async function generateImagesForAllAngles(
  buildOne: (angle: TemplateAngle) => Promise<GenerateImageOptions>,
  angles: ReadonlyArray<TemplateAngle> = ALL_ANGLES,
): Promise<AngleGenerateResult[]> {
  // Phase 1 — issue all requests in parallel.
  const parallel = await Promise.all(
    angles.map(async (angle): Promise<AngleGenerateResult> => {
      const opts = await buildOne(angle);
      const r = await generateImage(opts);
      return { angle, ...r };
    }),
  );

  // Bail early if every angle succeeded, or if the failures aren't rate-limits
  // (other errors aren't worth retrying — the call site surfaces them in the
  // per-angle tile).
  const hadRateLimit = parallel.some(
    (r) => r.ok === false && RATE_LIMIT_RE.test(r.error ?? ''),
  );
  if (!hadRateLimit) return parallel;

  // Phase 2 — retry only the failed angles, sequentially, with a fixed delay.
  const out = parallel.slice();
  let firstRetry = true;
  for (let i = 0; i < out.length; i++) {
    const cur = out[i];
    if (cur.ok) continue;
    if (!firstRetry) {
      await new Promise((resolve) => setTimeout(resolve, SEQUENTIAL_FALLBACK_DELAY_MS));
    }
    firstRetry = false;
    const opts = await buildOne(cur.angle);
    const r = await generateImage(opts);
    out[i] = { angle: cur.angle, ...r };
  }
  return out;
}

export async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`線図を読み込めませんでした (${res.status})`);

  if (url.endsWith('.svg')) {
    const text = await res.text();
    return await rasterizeSvgToPngBase64(text, 1024);
  }

  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader returned non-string'));
        return;
      }
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('読み込みに失敗'));
    reader.readAsDataURL(blob);
  });
}

async function rasterizeSvgToPngBase64(svgText: string, size: number): Promise<string> {
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG の読み込みに失敗しました'));
      img.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2D コンテキストが取得できませんでした');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1] ?? '';
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
