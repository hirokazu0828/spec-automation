import { useCallback, useSyncExternalStore } from 'react';
import type { SpecData } from '../types';
import { initialSpecData } from '../types';
import { copyImage, deleteImage } from '../lib/imageStore';

export type WizardStep = 1 | 2 | 3 | 4;

export type DraftEnvelope = {
  id: string;
  productCode: string;
  brandName: string;
  savedAt: number;
  lastStep: WizardStep;
  data: SpecData;
};

type DraftStore = { version: 1; drafts: DraftEnvelope[] };

const STORAGE_KEY = 'spec-automation:drafts:v1';
const STORAGE_EVENT = 'spec-automation:drafts:changed';

// Drop fields that no longer exist on SpecData but may still live in older
// drafts persisted to localStorage. Keeps unknown future-shape fields intact.
const REMOVED_FIELDS = ['colorA', 'colorB', 'colorC', 'colorD'] as const;

export function migrateSpecData(raw: unknown): SpecData {
  if (raw == null || typeof raw !== 'object') return { ...initialSpecData };
  const cleaned: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  for (const key of REMOVED_FIELDS) {
    delete cleaned[key];
  }
  return { ...initialSpecData, ...(cleaned as Partial<SpecData>) } as SpecData;
}

function migrateEnvelope(raw: unknown): DraftEnvelope | null {
  if (raw == null || typeof raw !== 'object') return null;
  const env = raw as Partial<DraftEnvelope> & { data?: unknown };
  if (typeof env.id !== 'string') return null;
  return {
    id: env.id,
    productCode: typeof env.productCode === 'string' ? env.productCode : '',
    brandName: typeof env.brandName === 'string' ? env.brandName : '',
    savedAt: typeof env.savedAt === 'number' ? env.savedAt : Date.now(),
    lastStep: ((): WizardStep => {
      const s = env.lastStep;
      return s === 1 || s === 2 || s === 3 || s === 4 ? s : 1;
    })(),
    data: migrateSpecData(env.data),
  };
}

function readStore(): DraftStore {
  if (typeof localStorage === 'undefined') return { version: 1, drafts: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, drafts: [] };
    const parsed = JSON.parse(raw) as { version?: number; drafts?: unknown };
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.drafts)) {
      return { version: 1, drafts: [] };
    }
    const drafts = parsed.drafts
      .map(migrateEnvelope)
      .filter((d): d is DraftEnvelope => d !== null);
    return { version: 1, drafts };
  } catch (e) {
    console.warn('[useSpecDrafts] failed to read store', e);
    return { version: 1, drafts: [] };
  }
}

function writeStore(store: DraftStore): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(STORAGE_EVENT));
    return true;
  } catch (e) {
    console.warn('[useSpecDrafts] failed to write store (quota?)', e);
    return false;
  }
}

let cachedRaw: string | null = null;
let cachedSnapshot: DraftStore = { version: 1, drafts: [] };

function getSnapshot(): DraftStore {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = readStore();
  return cachedSnapshot;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(STORAGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(STORAGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useSpecDrafts() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const createDraft = useCallback((): string => {
    const id = newId();
    const next: DraftEnvelope = {
      id,
      productCode: '',
      brandName: '',
      savedAt: Date.now(),
      lastStep: 1,
      data: { ...initialSpecData },
    };
    const current = readStore();
    writeStore({ version: 1, drafts: [next, ...current.drafts] });
    return id;
  }, []);

  const loadDraft = useCallback((id: string): DraftEnvelope | null => {
    const current = readStore();
    return current.drafts.find((d) => d.id === id) ?? null;
  }, []);

  const saveDraft = useCallback((id: string, data: SpecData, lastStep: WizardStep): void => {
    const current = readStore();
    const idx = current.drafts.findIndex((d) => d.id === id);
    const updated: DraftEnvelope = {
      id,
      productCode: data.productCode,
      brandName: data.brandName,
      savedAt: Date.now(),
      lastStep,
      data,
    };
    const drafts = idx >= 0
      ? current.drafts.map((d, i) => (i === idx ? updated : d))
      : [updated, ...current.drafts];
    writeStore({ version: 1, drafts });
  }, []);

  const duplicateDraft = useCallback((id: string): string => {
    const current = readStore();
    const original = current.drafts.find((d) => d.id === id);
    if (!original) return id;
    const newDraftId = newId();
    const copy: DraftEnvelope = {
      ...original,
      id: newDraftId,
      productCode: original.productCode ? `${original.productCode}-copy` : '',
      savedAt: Date.now(),
    };
    writeStore({ version: 1, drafts: [copy, ...current.drafts] });
    void copyImage(id, newDraftId);
    return newDraftId;
  }, []);

  const removeDraft = useCallback((id: string): void => {
    const current = readStore();
    writeStore({ version: 1, drafts: current.drafts.filter((d) => d.id !== id) });
    void deleteImage(id);
  }, []);

  return {
    drafts: store.drafts,
    createDraft,
    loadDraft,
    saveDraft,
    duplicateDraft,
    deleteDraft: removeDraft,
  };
}

export const __testing = { STORAGE_KEY };
