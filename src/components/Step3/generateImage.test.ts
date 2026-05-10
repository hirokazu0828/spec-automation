import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateImagesForAllAngles } from './generateImage';
import type { TemplateAngle } from '../../types';

// jsdom doesn't ship a real fetch in some test envs, so we always replace it.
const okResponse = (b64 = 'YQ==') =>
  new Response(JSON.stringify({ data: [{ b64_json: b64 }] }), { status: 200 });
const errResponse = (status: number, body: string) =>
  new Response(body, { status });

const buildOne = (angle: TemplateAngle) =>
  Promise.resolve({ prompt: `prompt:${angle}`, imageBase64: 'b64data' });

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('generateImagesForAllAngles — parallel pass', () => {
  it('issues exactly 4 fetch calls for 4 angles', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const results = await generateImagesForAllAngles(buildOne);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('returns one entry per angle in the canonical ALL_ANGLES order', async () => {
    globalThis.fetch = vi.fn(async () => okResponse()) as unknown as typeof fetch;
    const results = await generateImagesForAllAngles(buildOne);
    expect(results.map((r) => r.angle)).toEqual([
      'front',
      'side_toe',
      'back',
      'side_heel',
    ]);
  });

  it('starts all 4 fetch calls before any resolves (true parallelism)', async () => {
    let started = 0;
    const resolvers: Array<(v: Response) => void> = [];
    globalThis.fetch = vi.fn(() => {
      started++;
      return new Promise<Response>((resolve) => resolvers.push(resolve));
    }) as unknown as typeof fetch;

    const promise = generateImagesForAllAngles(buildOne);
    // Let microtasks settle so all four fetches get to start before we resolve any.
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toBe(4);
    resolvers.forEach((r) => r(okResponse()));
    const results = await promise;
    expect(results.every((r) => r.ok)).toBe(true);
  });
});

describe('generateImagesForAllAngles — non-429 errors stay isolated', () => {
  it('marks the failed angle as ok=false and leaves the others ok=true', async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call++;
      if (call === 2) return errResponse(500, 'server error');
      return okResponse();
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const results = await generateImagesForAllAngles(buildOne);
    expect(results[1].ok).toBe(false);
    expect(results.filter((r) => r.ok)).toHaveLength(3);
  });

  it('does not trigger sequential fallback for 5xx errors (no retry call)', async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call++;
      return call === 3 ? errResponse(503, 'service unavailable') : okResponse();
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await generateImagesForAllAngles(buildOne);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('generateImagesForAllAngles — 429 sequential fallback', () => {
  it('retries failed angles sequentially when 429 is detected in the parallel pass', async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call++;
      // First parallel pass: calls 1-4. Make 2 and 3 fail with 429.
      if (call === 2 || call === 3) return errResponse(429, 'rate_limit_exceeded');
      return okResponse();
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const results = await generateImagesForAllAngles(buildOne);
    expect(results.every((r) => r.ok)).toBe(true);
    // 4 parallel + 2 sequential retries = 6 total.
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('does not retry angles that succeeded in the parallel pass', async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call++;
      // Only call #1 fails with 429; the sequential retry succeeds.
      return call === 1 ? errResponse(429, 'rate_limit_exceeded') : okResponse();
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await generateImagesForAllAngles(buildOne);
    // 4 parallel + 1 retry = 5 total.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
