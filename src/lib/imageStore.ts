import { createStore, set, get, del, keys } from 'idb-keyval';
import type { TemplateAngle } from '../data/templates/types';
import { ALL_ANGLES } from '../data/templates/types';

const store = createStore('spec-automation-images', 'images');

const isAvailable = typeof indexedDB !== 'undefined';

/**
 * Layer 3b-fix-step3-improvements: per-angle storage.
 *
 * IndexedDB key shape:
 *   - Legacy single-image drafts (Layer 3a):       `<draftId>`
 *   - Per-angle drafts (Layer 3b-step3-improvements): `<draftId>#<angle>`
 *
 * The legacy `loadImage` / `saveImage` / `deleteImage` / `copyImage` keep
 * their public signatures but transparently span both layouts so that
 * Step4 (which reads "正面" from `loadImage(draftId)`) and `useSpecDrafts`
 * (which copies / deletes all blobs for a draft) work for both old and new
 * drafts without further callers having to know about the angle dimension.
 */

const angleKey = (draftId: string, angle: TemplateAngle): string => `${draftId}#${angle}`;

export async function saveAngleImage(
  draftId: string,
  angle: TemplateAngle,
  dataUrl: string,
): Promise<void> {
  if (!isAvailable) return;
  try {
    await set(angleKey(draftId, angle), dataUrl, store);
  } catch (e) {
    console.warn('[imageStore] saveAngleImage failed', e);
  }
}

export async function loadAngleImage(
  draftId: string,
  angle: TemplateAngle,
): Promise<string | null> {
  if (!isAvailable) return null;
  try {
    const value = await get<string>(angleKey(draftId, angle), store);
    if (typeof value === 'string') return value;
    // Migration fallback: pre-Layer 3b drafts wrote a single image under
    // `draftId`. Treat that image as the front angle so Step3 still surfaces
    // it after upgrade, until the user re-generates.
    if (angle === 'front') {
      const legacy = await get<string>(draftId, store);
      if (typeof legacy === 'string') return legacy;
    }
    return null;
  } catch (e) {
    console.warn('[imageStore] loadAngleImage failed', e);
    return null;
  }
}

export async function deleteAngleImage(
  draftId: string,
  angle: TemplateAngle,
): Promise<void> {
  if (!isAvailable) return;
  try {
    await del(angleKey(draftId, angle), store);
  } catch (e) {
    console.warn('[imageStore] deleteAngleImage failed', e);
  }
}

/**
 * Returns the angles that have a stored image. Useful for the Step3 4-tile
 * UI to know which tiles to populate on mount.
 */
export async function loadAllAngleImages(
  draftId: string,
): Promise<Partial<Record<TemplateAngle, string>>> {
  const out: Partial<Record<TemplateAngle, string>> = {};
  for (const a of ALL_ANGLES) {
    const v = await loadAngleImage(draftId, a);
    if (v) out[a] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Legacy single-image API (Layer 3a / earlier). Kept stable for Step4 /
// useSpecDrafts. Internally, reads/writes span both legacy and per-angle keys
// so existing callers don't need to know the angle.
// ---------------------------------------------------------------------------

export async function saveImage(draftId: string, dataUrl: string): Promise<void> {
  if (!isAvailable) return;
  try {
    await set(draftId, dataUrl, store);
  } catch (e) {
    console.warn('[imageStore] saveImage failed', e);
  }
}

/**
 * Returns the front-angle image (Layer 3b+) if present, otherwise the legacy
 * single-image (pre-Layer 3b). Step4 uses this to auto-populate the "正面"
 * product-photo slot.
 */
export async function loadImage(draftId: string): Promise<string | null> {
  if (!isAvailable) return null;
  try {
    const front = await get<string>(angleKey(draftId, 'front'), store);
    if (typeof front === 'string') return front;
    const legacy = await get<string>(draftId, store);
    return typeof legacy === 'string' ? legacy : null;
  } catch (e) {
    console.warn('[imageStore] loadImage failed', e);
    return null;
  }
}

/** Deletes the legacy key AND every per-angle key for the draft. */
export async function deleteImage(draftId: string): Promise<void> {
  if (!isAvailable) return;
  try {
    await del(draftId, store);
    for (const a of ALL_ANGLES) {
      await del(angleKey(draftId, a), store);
    }
  } catch (e) {
    console.warn('[imageStore] deleteImage failed', e);
  }
}

/** Copies the legacy key AND every per-angle key from one draft to another. */
export async function copyImage(fromId: string, toId: string): Promise<void> {
  // Legacy single-image (pre-Layer 3b drafts).
  const legacy = await get<string>(fromId, store).catch(() => undefined);
  if (typeof legacy === 'string') await set(toId, legacy, store).catch(() => {});
  // Per-angle images (Layer 3b+ drafts).
  for (const a of ALL_ANGLES) {
    const v = await get<string>(angleKey(fromId, a), store).catch(() => undefined);
    if (typeof v === 'string') await set(angleKey(toId, a), v, store).catch(() => {});
  }
}

export async function listImageIds(): Promise<string[]> {
  if (!isAvailable) return [];
  try {
    const ks = await keys(store);
    return ks.filter((k): k is string => typeof k === 'string');
  } catch {
    return [];
  }
}
