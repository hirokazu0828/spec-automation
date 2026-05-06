import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraftPickerModal from './DraftPickerModal';
import type { DraftEnvelope } from '../../hooks/useSpecDrafts';
import { initialSpecData } from '../../types';

function makeDraft(overrides: Partial<DraftEnvelope> = {}): DraftEnvelope {
  const data = { ...initialSpecData, ...(overrides.data ?? {}) };
  return {
    id: 'd1',
    productCode: 'AAA-001',
    brandName: 'Acme',
    savedAt: 1700000000000,
    lastStep: 1,
    documentType: data.documentType,
    sampleRevision: data.sampleRevision,
    ...overrides,
    data,
  };
}

describe('DraftPickerModal', () => {
  it('renders an empty state when there are no drafts', () => {
    render(<DraftPickerModal drafts={[]} onPick={() => {}} onClose={() => {}} />);
    expect(screen.getByText('複製元になるドラフトがありません')).toBeInTheDocument();
  });

  it('selecting a row then confirming fires onPick with the chosen draft + inherit override', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    const drafts = [
      makeDraft({ id: 'd1', productCode: 'AAA-001' }),
      makeDraft({ id: 'd2', productCode: 'BBB-002' }),
    ];
    render(<DraftPickerModal drafts={drafts} onPick={onPick} onClose={() => {}} />);
    await user.click(screen.getByText('BBB-002'));
    // Row click only selects — confirm must be clicked separately.
    expect(onPick).not.toHaveBeenCalled();
    const confirm = screen.getByRole('button', { name: /この案件をベースに作成/ });
    await user.click(confirm);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'd2' }), 'inherit');
  });

  it('confirm button is disabled until a row is selected', () => {
    const drafts = [makeDraft({ id: 'd1' })];
    render(<DraftPickerModal drafts={drafts} onPick={() => {}} onClose={() => {}} />);
    const confirm = screen.getByRole('button', { name: /まず複製元のドラフトを選んでください/ });
    expect(confirm).toBeDisabled();
  });

  it('"最終仕様書として作成" radio is enabled only for sample sources', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    const drafts = [
      makeDraft({
        id: 'sample-row',
        productCode: 'SAM-001',
        documentType: 'sample',
        sampleRevision: 1,
        data: { ...initialSpecData, documentType: 'sample', sampleRevision: 1 },
      }),
    ];
    render(<DraftPickerModal drafts={drafts} onPick={onPick} onClose={() => {}} />);
    await user.click(screen.getByText('SAM-001'));
    const finalRadio = screen.getByLabelText('最終仕様書として作成') as HTMLInputElement;
    expect(finalRadio.disabled).toBe(false);
    await user.click(finalRadio);
    await user.click(screen.getByRole('button', { name: /この案件をベースに作成/ }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'sample-row' }), 'final');
  });

  it('closes when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<DraftPickerModal drafts={[]} onPick={() => {}} onClose={onClose} />);
    await user.click(screen.getByLabelText('閉じる'));
    expect(onClose).toHaveBeenCalled();
  });
});
