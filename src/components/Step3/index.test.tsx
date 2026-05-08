import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step3 from './index';
import { initialSpecData } from '../../types';
import type { SpecData } from '../../types';

// IndexedDB mocks: loadImage resolves null so the "no generated image yet"
// branch renders, save/delete are spies.
vi.mock('../../lib/imageStore', () => ({
  loadImage: vi.fn(async () => null),
  saveImage: vi.fn(async () => {}),
  deleteImage: vi.fn(async () => {}),
}));

// We don't actually call OpenAI in tests — the generate path is exercised
// only enough to verify the prompt + base64 wiring.
vi.mock('./generateImage', () => ({
  generateImage: vi.fn(async () => ({ ok: true, dataUrl: 'data:image/png;base64,xxx' })),
  fetchAsBase64: vi.fn(async () => 'xxx'),
}));

function makeData(overrides: Partial<SpecData>): SpecData {
  return { ...initialSpecData, headShape: 'pin', ...overrides };
}

const updateData = vi.fn();

function renderStep3(data: SpecData) {
  return render(
    <Step3
      data={data}
      updateData={updateData}
      draftId="test-draft"
      onNext={() => {}}
      onBack={() => {}}
    />,
  );
}

beforeEach(() => {
  updateData.mockReset();
});

describe('Step3 template + angle selection', () => {
  it('renders the template <select> with all 3 catalog entries', () => {
    renderStep3(makeData({}));
    const select = screen.getByLabelText('型テンプレート') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    // Auto option + 3 templates = 4 options
    expect(select.querySelectorAll('option')).toHaveLength(4);
    expect(screen.getByRole('option', { name: /パター用ブレード型/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /パター用セミマレット型.*線画準備中/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /パター用フルマレット型.*線画準備中/ })).toBeInTheDocument();
  });

  it('blade template (auto-selected from headShape=pin) enables all 4 angle buttons', () => {
    renderStep3(makeData({ headShape: 'pin' }));
    expect(screen.getByRole('button', { name: '正面（表側）' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '側面（トウ側）' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '後面（開口部）' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '側面（ヒール側）' })).toBeEnabled();
  });

  it('changing the template <select> calls updateData and clears selectedAngle', async () => {
    const user = userEvent.setup();
    renderStep3(makeData({ headShape: 'pin' }));
    const select = screen.getByLabelText('型テンプレート') as HTMLSelectElement;
    await user.selectOptions(select, 'putter-semi-mallet');
    expect(updateData).toHaveBeenCalledWith({
      templateId: 'putter-semi-mallet',
      selectedAngle: undefined,
    });
  });

  it('pending semi-mallet template disables non-front angles and shows the banner', () => {
    renderStep3(makeData({ headShape: 'pin', templateId: 'putter-semi-mallet' }));
    expect(screen.getByText('線画準備中')).toBeInTheDocument();
    // Front stays clickable so the user can still preview the SVG fallback.
    expect(screen.getByRole('button', { name: '正面（表側）' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '側面（トウ側）' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '後面（開口部）' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '側面（ヒール側）' })).toBeDisabled();
  });

  it('clicking an angle button calls updateData with the new selectedAngle', async () => {
    const user = userEvent.setup();
    renderStep3(makeData({ headShape: 'pin' }));
    await user.click(screen.getByRole('button', { name: '側面（トウ側）' }));
    expect(updateData).toHaveBeenCalledWith({ selectedAngle: 'side_toe' });
  });

  it('changing the angle changes the line-art image src', () => {
    const { rerender } = renderStep3(makeData({ headShape: 'pin', selectedAngle: 'front' }));
    let img = screen.getByAltText(/正面/) as HTMLImageElement;
    expect(img.src).toContain('/templates/putter-blade/front.png');

    rerender(
      <Step3
        data={makeData({ headShape: 'pin', selectedAngle: 'back' })}
        updateData={updateData}
        draftId="test-draft"
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    img = screen.getByAltText(/後面/) as HTMLImageElement;
    expect(img.src).toContain('/templates/putter-blade/back.png');
  });

  it('"ブレード型に切り替える" button switches templateId to putter-blade', async () => {
    const user = userEvent.setup();
    renderStep3(makeData({ headShape: 'pin', templateId: 'putter-full-mallet' }));
    await user.click(screen.getByRole('button', { name: 'ブレード型に切り替える' }));
    expect(updateData).toHaveBeenCalledWith({
      templateId: 'putter-blade',
      selectedAngle: 'front',
    });
  });

  it('falls back to the SVG line-art when the selected template is pending', async () => {
    renderStep3(makeData({ headShape: 'mallet', templateId: 'putter-semi-mallet' }));
    // Pending template has no PNG; the displayed image src falls back to
    // /lineart/mallet.svg
    const imgs = await waitFor(() => screen.getAllByRole('img'));
    const lineart = imgs.find((i) => (i as HTMLImageElement).src.includes('/lineart/mallet.svg'));
    expect(lineart).toBeTruthy();
  });
});
