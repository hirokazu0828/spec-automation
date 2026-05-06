import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SampleBook from './SampleBook';

// SampleBook reads from samples.json directly. The first card after the
// default ("形状: すべて") filter is determined by samples.json's order, so
// we just look up cards by their sample_number text instead of brittle
// "first card" logic.
const KNOWN_SAMPLE_NUMBER = 'BRG-2109-P897';

describe('SampleBook (Layer 6 hotfix)', () => {
  it('does NOT render per-card "起点に作成" buttons in browse mode', () => {
    render(<SampleBook mode="browse" onPickSample={vi.fn()} />);
    // The card-level button should be absent in browse mode, even though
    // onPickSample is provided (the modal CTA still works for opportunistic
    // creation). Browse-mode users shouldn't see action buttons on every card.
    expect(screen.queryByRole('button', { name: /を起点に新規作成/ })).toBeNull();
  });

  it('does NOT render per-card buttons when no onPickSample is given', () => {
    render(<SampleBook mode="pick" />);
    expect(screen.queryByRole('button', { name: /を起点に新規作成/ })).toBeNull();
  });

  it('renders a per-card "起点に作成" button on every card in pick mode', () => {
    render(<SampleBook mode="pick" onPickSample={vi.fn()} />);
    // Every visible card should expose the action; we don't pin to a specific
    // count (depends on samples.json), but at least one must exist and the
    // sample number we know about should have a matching button.
    const buttons = screen.getAllByRole('button', { name: /を起点に新規作成/ });
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: new RegExp(`${KNOWN_SAMPLE_NUMBER} を起点に新規作成`) })).toBeInTheDocument();
  });

  it('the per-card button calls onPickSample without opening the detail modal', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<SampleBook mode="pick" onPickSample={onPick} />);
    const button = screen.getByRole('button', { name: new RegExp(`${KNOWN_SAMPLE_NUMBER} を起点に新規作成`) });
    await user.click(button);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0]).toEqual(expect.objectContaining({ sample_number: KNOWN_SAMPLE_NUMBER }));
    // The detail modal (role=dialog) should NOT have opened — clicking the
    // button must stop event propagation so the card's onClick doesn't fire.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('still allows opening the detail modal by clicking the card body in pick mode', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<SampleBook mode="pick" onPickSample={onPick} />);
    // Click the sample_number text — it lives inside the card body (not inside
    // the action button), so the click bubbles up to the card's onClick.
    await user.click(screen.getByText(KNOWN_SAMPLE_NUMBER));
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    // Modal CTA still present at the bottom (now in a non-scrolling footer).
    const modalCta = within(dialog!).getByRole('button', { name: 'このサンプルを起点に新規作成 →' });
    expect(modalCta).toBeInTheDocument();
  });
});
