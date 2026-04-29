type Req = {
  method?: string;
  body: { prompt?: string; quality?: string; imageBase64?: string };
};
type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => Res;
  end: () => Res;
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfiguration' });

  const { prompt, quality, imageBase64 } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
    if (imageBase64) {
      const fetch = (await import('node-fetch')).default;
      const FormData = (await import('form-data')).default;

      const binary = Buffer.from(imageBase64, 'base64');
      const form = new FormData();
      form.append('model', 'gpt-image-1');
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
          model: 'gpt-image-1',
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
