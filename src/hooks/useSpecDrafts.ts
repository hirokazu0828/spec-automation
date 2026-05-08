import { useCallback, useSyncExternalStore } from 'react';
import type { SpecData, DocumentType } from '../types';
import { initialSpecData } from '../types';
import { copyImage, deleteImage } from '../lib/imageStore';
import { ordinal } from '../utils/specHelpers';

export type WizardStep = 1 | 2 | 3 | 4;

export type DraftEnvelope = {
  id: string;
  productCode: string;
  brandName: string;
  savedAt: number;
  lastStep: WizardStep;
  data: SpecData;
  /** Mirrored from data.documentType for cheap list rendering. */
  documentType: DocumentType;
  /** Mirrored from data.sampleRevision for cheap list rendering. */
  sampleRevision?: number;
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
  const merged = { ...initialSpecData, ...(cleaned as Partial<SpecData>) } as SpecData;
  // Drafts persisted before Layer 4 have no documentType. Treat them as final
  // (= the only sheet kind that existed back then) to preserve their current
  // appearance.
  if (!('documentType' in cleaned)) {
    merged.documentType = 'final';
    merged.sampleRevision = undefined;
  }
  // sampleRevision only makes sense when documentType==='sample'. JSON.stringify
  // drops `undefined` so a sample-→-final promotion would re-inflate the
  // initialSpecData default of 1; enforce the invariant on every load.
  if (merged.documentType !== 'sample') {
    merged.sampleRevision = undefined;
  }
  return merged;
}

function migrateEnvelope(raw: unknown): DraftEnvelope | null {
  if (raw == null || typeof raw !== 'object') return null;
  const env = raw as Partial<DraftEnvelope> & { data?: unknown };
  if (typeof env.id !== 'string') return null;
  const data = migrateSpecData(env.data);
  return {
    id: env.id,
    productCode: typeof env.productCode === 'string' ? env.productCode : '',
    brandName: typeof env.brandName === 'string' ? env.brandName : '',
    savedAt: typeof env.savedAt === 'number' ? env.savedAt : Date.now(),
    lastStep: ((): WizardStep => {
      const s = env.lastStep;
      return s === 1 || s === 2 || s === 3 || s === 4 ? s : 1;
    })(),
    data,
    documentType: data.documentType,
    sampleRevision: data.sampleRevision,
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

  const createDraft = useCallback(
    (route?: 'A' | 'B' | 'C', seedData?: Partial<SpecData>): string => {
      const id = newId();
      const data: SpecData = {
        ...initialSpecData,
        ...(seedData ?? {}),
        ...(route ? { originRoute: route } : {}),
      };
      const next: DraftEnvelope = {
        id,
        productCode: data.productCode,
        brandName: data.brandName,
        savedAt: Date.now(),
        lastStep: 1,
        data,
        documentType: data.documentType,
        sampleRevision: data.sampleRevision,
      };
      const current = readStore();
      writeStore({ version: 1, drafts: [next, ...current.drafts] });
      return id;
    },
    [],
  );

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
      documentType: data.documentType,
      sampleRevision: data.sampleRevision,
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

  /**
   * Layer 4: spawn the next sample revision from an existing sample draft.
   * Copies all data, bumps sampleRevision, rewrites the productCode suffix,
   * resets the issueDate to today, and prepends a revisionHistory row that
   * references the source draft.
   * Returns the new draft id (or the original id if the source isn't a sample).
   */
  const promoteRevision = useCallback((id: string): string => {
    const current = readStore();
    const source = current.drafts.find((d) => d.id === id);
    if (!source) return id;
    if (source.data.documentType !== 'sample') return id;
    const newDraftId = newId();
    const today = new Date().toISOString().slice(0, 10);
    const fromRev = source.data.sampleRevision ?? 1;
    const toRev = fromRev + 1;
    const fromOrd = ordinal(fromRev);
    const toOrd = ordinal(toRev);
    // Replace any existing _<ord> suffix; otherwise append.
    const SUFFIX_RE = /_(\d+(?:st|nd|rd|th))$/;
    const newProductCode = source.productCode
      ? source.productCode.replace(SUFFIX_RE, '') + `_${toOrd}`
      : '';
    const sourceLabel = source.productCode || `(品番未入力)`;
    const newData: SpecData = {
      ...source.data,
      productCode: newProductCode,
      sampleRevision: toRev,
      issueDate: today,
      revisionHistory: [
        { date: today, content: `${sourceLabel} (${fromOrd}) から派生` },
        ...source.data.revisionHistory,
      ],
    };
    const copy: DraftEnvelope = {
      id: newDraftId,
      productCode: newProductCode,
      brandName: source.brandName,
      savedAt: Date.now(),
      lastStep: source.lastStep,
      data: newData,
      documentType: 'sample',
      sampleRevision: toRev,
    };
    writeStore({ version: 1, drafts: [copy, ...current.drafts] });
    void copyImage(id, newDraftId);
    return newDraftId;
  }, []);

  /**
   * Layer 4: flip an existing sample draft into the final spec sheet.
   * Mutates the existing draft (no new id) so revision history is preserved.
   * Returns true on success, false if the draft was missing or already final.
   */
  const promoteToFinal = useCallback((id: string): boolean => {
    const current = readStore();
    const idx = current.drafts.findIndex((d) => d.id === id);
    if (idx < 0) return false;
    const target = current.drafts[idx];
    if (target.data.documentType === 'final') return false;
    // Per docs/document-type-decisions.md §7: only nudge 'generated' images
    // toward 'manual'; preserve 'photo' / 'manual' / undefined → manual default.
    const nextImageSource: SpecData['imageSource'] =
      target.data.imageSource === 'photo'
        ? 'photo'
        : target.data.imageSource === 'manual'
          ? 'manual'
          : 'manual';
    const newData: SpecData = {
      ...target.data,
      documentType: 'final',
      sampleRevision: undefined,
      imageSource: nextImageSource,
    };
    const updated: DraftEnvelope = {
      ...target,
      savedAt: Date.now(),
      data: newData,
      documentType: 'final',
      sampleRevision: undefined,
    };
    const drafts = current.drafts.map((d, i) => (i === idx ? updated : d));
    writeStore({ version: 1, drafts });
    return true;
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
    promoteRevision,
    promoteToFinal,
    deleteDraft: removeDraft,
  };
}

export const __testing = { STORAGE_KEY };
