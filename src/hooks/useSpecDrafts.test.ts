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

  describe('Layer 4 documentType (mirroring + migration)', () => {
    it('new drafts mirror documentType="sample" + sampleRevision=1 onto the envelope', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let id = '';
      act(() => {
        id = result.current.createDraft('C');
      });
      const draft = result.current.loadDraft(id);
      expect(draft?.documentType).toBe('sample');
      expect(draft?.sampleRevision).toBe(1);
      expect(draft?.data.documentType).toBe('sample');
    });

    it('legacy drafts (no documentType in data) get migrated to "final"', () => {
      const legacyEnvelope = {
        id: 'legacy-pre-layer4',
        productCode: 'OLD-001',
        brandName: 'Acme',
        savedAt: 1700000000000,
        lastStep: 1,
        data: { productCode: 'OLD-001', brandName: 'Acme', headShape: 'pin' },
      };
      localStorage.setItem(
        __testing.STORAGE_KEY,
        JSON.stringify({ version: 1, drafts: [legacyEnvelope] }),
      );
      const { result } = renderHook(() => useSpecDrafts());
      const loaded = result.current.loadDraft('legacy-pre-layer4');
      expect(loaded?.documentType).toBe('final');
      expect(loaded?.sampleRevision).toBeUndefined();
      expect(loaded?.data.documentType).toBe('final');
      expect(loaded?.data.sampleRevision).toBeUndefined();
    });
  });

  describe('promoteRevision (Layer 4 Task 6)', () => {
    it('bumps sampleRevision and prepends a revision history row', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let srcId = '';
      act(() => {
        srcId = result.current.createDraft('C');
      });
      const original = result.current.loadDraft(srcId);
      if (!original) throw new Error('source missing');
      act(() => {
        result.current.saveDraft(srcId, { ...original.data, productCode: 'PRD-001' }, 1);
      });
      let nextId = '';
      act(() => {
        nextId = result.current.promoteRevision(srcId);
      });
      expect(nextId).not.toBe(srcId);
      const next = result.current.loadDraft(nextId);
      expect(next?.documentType).toBe('sample');
      expect(next?.sampleRevision).toBe(2);
      expect(next?.productCode).toBe('PRD-001_2nd');
      expect(next?.data.revisionHistory[0].content).toContain('PRD-001');
      expect(next?.data.revisionHistory[0].content).toContain('1st');
    });

    it('replaces an existing _<ord> suffix instead of appending a new one', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let srcId = '';
      act(() => {
        srcId = result.current.createDraft('C');
      });
      const o = result.current.loadDraft(srcId);
      if (!o) throw new Error('missing');
      act(() => {
        result.current.saveDraft(srcId, { ...o.data, productCode: 'PRD-001_2nd', sampleRevision: 2 }, 1);
      });
      let nextId = '';
      act(() => {
        nextId = result.current.promoteRevision(srcId);
      });
      const next = result.current.loadDraft(nextId);
      expect(next?.productCode).toBe('PRD-001_3rd');
      expect(next?.sampleRevision).toBe(3);
    });

    it('refuses to promote a final draft', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let srcId = '';
      act(() => {
        srcId = result.current.createDraft('C', { documentType: 'final', sampleRevision: undefined });
      });
      let attempted = '';
      act(() => {
        attempted = result.current.promoteRevision(srcId);
      });
      expect(attempted).toBe(srcId); // returns input id when refused
    });
  });

  describe('promoteToFinal (Layer 4 Task 6)', () => {
    it('flips a sample draft to final and clears sampleRevision', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let id = '';
      act(() => {
        id = result.current.createDraft('C');
      });
      let ok = false;
      act(() => {
        ok = result.current.promoteToFinal(id);
      });
      expect(ok).toBe(true);
      const updated = result.current.loadDraft(id);
      expect(updated?.documentType).toBe('final');
      expect(updated?.sampleRevision).toBeUndefined();
    });

    it('preserves "photo" imageSource when promoting (does not stomp on existing photo)', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let id = '';
      act(() => {
        id = result.current.createDraft('C', { imageSource: 'photo' });
      });
      act(() => {
        result.current.promoteToFinal(id);
      });
      expect(result.current.loadDraft(id)?.data.imageSource).toBe('photo');
    });

    it('moves a "generated" image to "manual" when promoting', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let id = '';
      act(() => {
        id = result.current.createDraft('C', { imageSource: 'generated' });
      });
      act(() => {
        result.current.promoteToFinal(id);
      });
      expect(result.current.loadDraft(id)?.data.imageSource).toBe('manual');
    });

    it('refuses to promote a final draft (returns false)', () => {
      const { result } = renderHook(() => useSpecDrafts());
      let id = '';
      act(() => {
        id = result.current.createDraft('C', { documentType: 'final', sampleRevision: undefined });
      });
      let ok = false;
      act(() => {
        ok = result.current.promoteToFinal(id);
      });
      expect(ok).toBe(false);
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
