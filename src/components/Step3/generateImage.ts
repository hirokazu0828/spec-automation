export type GenerateImageOptions = {
  prompt: string;
  imageBase64?: string;
  quality?: 'low' | 'medium' | 'high';
  endpoint?: string;
};

type ImagePayloadItem = { b64_json?: string; url?: string };

export type GenerateImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

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
