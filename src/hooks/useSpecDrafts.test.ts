import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSpecDrafts, __testing } from './useSpecDrafts';

vi.mock('../lib/imageStore', () => ({
  copyImage: vi.fn(async () => {}),
  deleteImage: vi.fn(async () => {}),
}));

describe('useSpecDrafts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when no localStorage entry exists', () => {
    const { result } = renderHook(() => useSpecDrafts());
    expect(result.current.drafts).toEqual([]);
  });

  it('creates a draft visible in subsequent loads', () => {
    const { result } = renderHook(() => useSpecDrafts());
    let id = '';
    act(() => {
      id = result.current.createDraft();
    });
    expect(id).toBeTruthy();
    expect(result.current.drafts).toHaveLength(1);
    const found = result.current.loadDraft(id);
    expect(found?.id).toBe(id);
  });

  it('saves a draft and reflects productCode/brandName in the list', () => {
    const { result } = renderHook(() => useSpecDrafts());
    let id = '';
    act(() => {
      id = result.current.createDraft();
    });
    const original = result.current.loadDraft(id);
    if (!original) throw new Error('draft missing');
    act(() => {
      result.current.saveDraft(
        id,
        { ...original.data, productCode: 'FTN-001', brandName: 'Acme' },
        2,
      );
    });
    expect(result.current.drafts[0]).toMatchObject({
      id,
      productCode: 'FTN-001',
      brandName: 'Acme',
      lastStep: 2,
    });
  });

  it('duplicates a draft with a new id', () => {
    const { result } = renderHook(() => useSpecDrafts());
    let id = '';
    act(() => {
      id = result.current.createDraft();
    });
    const original = result.current.loadDraft(id);
    if (!original) throw new Error('draft missing');
    act(() => {
      result.current.saveDraft(id, { ...original.data, productCode: 'FTN-001' }, 1);
    });
    let dupId = '';
    act(() => {
      dupId = result.current.duplicateDraft(id);
    });
    expect(dupId).not.toBe(id);
    expect(result.current.drafts).toHaveLength(2);
    expect(result.current.loadDraft(dupId)?.productCode).toContain('FTN-001');
  });

  it('deletes a draft', () => {
    const { result } = renderHook(() => useSpecDrafts());
    let id = '';
    act(() => {
      id = result.current.createDraft();
    });
    act(() => {
      result.current.deleteDraft(id);
    });
    expect(result.current.drafts).toEqual([]);
  });

  it('falls back to empty when storage contains malformed JSON', () => {
    localStorage.setItem(__testing.STORAGE_KEY, '{not json');
    const { result } = renderHook(() => useSpecDrafts());
    expect(result.current.drafts).toEqual([]);
  });

  describe('createDraft route variants (Layer 6)', () => {
    it('Route C records originRoute=C and leaves seedable fields blank', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let id = '';
      act(() => {
        id = result.current.createDraft('C');
      });
      const draft = result.current.loadDraft(id);
      expect(draft?.data.originRoute).toBe('C');
      expect(draft?.data.headShape).toBe('');
      expect(draft?.data.brandName).toBe('');
      expect(draft?.data.originSampleId).toBeUndefined();
      expect(draft?.data.originDraftId).toBeUndefined();
    });

    it('Route A merges the partial seed and records originSampleId', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let id = '';
      act(() => {
        id = result.current.createDraft('A', {
          originSampleId: 'BRG-2109-P897',
          headShape: 'neo_mallet',
          brandName: 'ユニオンゲート',
        });
      });
      const draft = result.current.loadDraft(id);
      expect(draft?.data.originRoute).toBe('A');
      expect(draft?.data.originSampleId).toBe('BRG-2109-P897');
      expect(draft?.data.headShape).toBe('neo_mallet');
      expect(draft?.data.brandName).toBe('ユニオンゲート');
      // unsupplied fields fall back to initialSpecData
      expect(draft?.data.bodyFabric).toBe('');
    });

    it('Route B merges the full seed and records originDraftId', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let id = '';
      act(() => {
        id = result.current.createDraft('B', {
          originDraftId: 'src-1',
          productCode: '',
          brandName: 'Acme',
          headShape: 'mallet',
          bodyFabric: 'pu_smooth',
          issueDate: '2026-05-03',
          revisionHistory: [{ date: '2026-05-03', content: '' }],
        });
      });
      const draft = result.current.loadDraft(id);
      expect(draft?.data.originRoute).toBe('B');
      expect(draft?.data.originDraftId).toBe('src-1');
      expect(draft?.data.productCode).toBe('');
      expect(draft?.data.bodyFabric).toBe('pu_smooth');
      // envelope reflects the productCode reset (= empty string)
      expect(draft?.productCode).toBe('');
    });

    it('createDraft() with no arguments still works (backward compat)', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let id = '';
      act(() => {
        id = result.current.createDraft();
      });
      const draft = result.current.loadDraft(id);
      expect(draft).not.toBeNull();
      expect(draft?.data.originRoute).toBeUndefined();
    });
  });

  it('strips removed legacy fields (colorA-D) when loading older drafts', () => {
    const legacyEnvelope = {
      id: 'legacy-1',
      productCode: 'OLD-001',
      brandName: 'Legacy',
      savedAt: 1700000000000,
      lastStep: 2,
      data: {
        productCode: 'OLD-001',
        brandName: 'Legacy',
        bodyFabric: 'pu_smooth',
        bodyColor: 'black',
        colorA: 'red-legacy',
        colorB: 'blue-legacy',
        colorC: 'green-legacy',
        colorD: 'yellow-legacy',
      },
    };
    localStorage.setItem(
      __testing.STORAGE_KEY,
      JSON.stringify({ version: 1, drafts: [legacyEnvelope] }),
    );

    const { result } = renderHook(() => useSpecDrafts());
    const loaded = result.current.loadDraft('legacy-1');
    expect(loaded).not.toBeNull();
    expect(loaded?.data.bodyFabric).toBe('pu_smooth');
    expect(loaded?.data.bodyColor).toBe('black');
    // Removed fields must not appear on the migrated SpecData
    expect((loaded?.data as Record<string, unknown>).colorA).toBeUndefined();
    expect((loaded?.data as Record<string, unknown>).colorB).toBeUndefined();
    expect((loaded?.data as Record<string, unknown>).colorC).toBeUndefined();
    expect((loaded?.data as Record<string, unknown>).colorD).toBeUndefined();
  });
});
