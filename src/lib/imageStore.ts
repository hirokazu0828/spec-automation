import { createStore, set, get, del, keys } from 'idb-keyval';

const store = createStore('spec-automation-images', 'images');

const isAvailable = typeof indexedDB !== 'undefined';

export async function saveImage(draftId: string, dataUrl: string): Promise<void> {
  if (!isAvailable) return;
  try {
    await set(draftId, dataUrl, store);
  } catch (e) {
    console.warn('[imageStore] saveImage failed', e);
  }
}

export async function loadImage(draftId: string): Promise<string | null> {
  if (!isAvailable) return null;
  try {
    const value = await get<string>(draftId, store);
    return value ?? null;
  } catch (e) {
    console.warn('[imageStore] loadImage failed', e);
    return null;
  }
}

export async function deleteImage(draftId: string): Promise<void> {
  if (!isAvailable) return;
  try {
    await del(draftId, store);
  } catch (e) {
    console.warn('[imageStore] deleteImage failed', e);
  }
}

export async function copyImage(fromId: string, toId: string): Promise<void> {
  const v = await loadImage(fromId);
  if (v != null) await saveImage(toId, v);
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
