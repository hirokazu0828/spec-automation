type Req = {
  method?: string;
  body: { prompt?: string; quality?: string; imageBase64?: string; model?: string };
};
type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => Res;
  end: () => Res;
};

/**
 * Layer 3b-fix-step3-improvements: opt-in `model` parameter for one-shot
 * gpt-image-2 verification. Default stays at `gpt-image-1` so existing
 * production traffic is unchanged. The allowlist guards against arbitrary
 * model strings being forwarded to OpenAI.
 */
const ALLOWED_MODELS = new Set(['gpt-image-1', 'gpt-image-2']);
const DEFAULT_MODEL = 'gpt-image-1';

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfiguration' });

  const { prompt, quality, imageBase64, model: requestedModel } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const model =
    requestedModel && ALLOWED_MODELS.has(requestedModel)
      ? requestedModel
      : DEFAULT_MODEL;

  try {
    if (imageBase64) {
      const fetch = (await import('node-fetch')).default;
      const FormData = (await import('form-data')).default;

      const binary = Buffer.from(imageBase64, 'base64');
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', prompt);
      form.append('size', '1024x1024');
      form.append('quality', quality || 'medium');
      form.append('image', binary, {
        filename: 'image.png',
        contentType: 'image/png',
        knownLength: binary.length,
      });

      const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...form.getHeaders(),
        },
        body: form,
      });

      const data = await response.json();
      return res.status(response.status).json(data);

    } else {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          size: '1024x1024',
          quality: quality || 'medium',
          n: 1,
        }),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    }
  } catch (e) {
    console.error('generate-image failed', e);
    return res.status(500).json({ error: 'Image generation failed' });
  }
}
