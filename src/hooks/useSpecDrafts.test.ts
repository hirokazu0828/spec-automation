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
});
