import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraftPickerModal from './DraftPickerModal';
import type { DraftEnvelope } from '../../hooks/useSpecDrafts';
import { initialSpecData } from '../../types';

function makeDraft(overrides: Partial<DraftEnvelope> = {}): DraftEnvelope {
  return {
    id: 'd1',
    productCode: 'AAA-001',
    brandName: 'Acme',
    savedAt: 1700000000000,
    lastStep: 1,
    data: { ...initialSpecData },
    ...overrides,
  };
}

describe('DraftPickerModal', () => {
  it('renders an empty state when there are no drafts', () => {
    render(<DraftPickerModal drafts={[]} onPick={() => {}} onClose={() => {}} />);
    expect(screen.getByText('複製元になるドラフトがありません')).toBeInTheDocument();
  });

  it('lists every draft and fires onPick with the chosen one', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    const drafts = [
      makeDraft({ id: 'd1', productCode: 'AAA-001' }),
      makeDraft({ id: 'd2', productCode: 'BBB-002' }),
    ];
    render(<DraftPickerModal drafts={drafts} onPick={onPick} onClose={() => {}} />);
    expect(screen.getByText('AAA-001')).toBeInTheDocument();
    expect(screen.getByText('BBB-002')).toBeInTheDocument();
    await user.click(screen.getByText('BBB-002'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'd2' }));
  });

  it('closes when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<DraftPickerModal drafts={[]} onPick={() => {}} onClose={onClose} />);
    await user.click(screen.getByLabelText('閉じる'));
    expect(onClose).toHaveBeenCalled();
  });
});
