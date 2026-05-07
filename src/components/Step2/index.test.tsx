import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step2 from './index';
import { initialSpecData } from '../../types';
import type { SpecData } from '../../types';
import type { DraftEnvelope } from '../../hooks/useSpecDrafts';

// Mock useStep2Proposals so we can spy on generateProposals and control the
// `proposals` state independently of the real hook's deterministic logic.
const mockGenerateProposals = vi.fn();
const mockRegenerate = vi.fn();
const mockSetIndex = vi.fn();
const mockState: { proposals: Partial<SpecData>[] | null } = { proposals: null };

vi.mock('../../hooks/useStep2Proposals', () => ({
  useStep2Proposals: () => ({
    proposals: mockState.proposals,
    currentProposalIndex: 0,
    setCurrentProposalIndex: mockSetIndex,
    generateProposals: mockGenerateProposals,
    regenerateProposals: mockRegenerate,
    getProposalWarnings: () => [] as string[],
  }),
}));

function makeData(overrides: Partial<SpecData>): SpecData {
  return {
    ...initialSpecData,
    // Sensible Route A baseline used by every test unless overridden:
    headShape: 'pin',
    position: 'standard',
    ...overrides,
  };
}

function renderStep2(
  data: SpecData,
  draftLookup?: (id: string) => DraftEnvelope | null,
  onStepChange?: (step: 1 | 2 | 3 | 4) => void,
) {
  return render(
    <Step2
      data={data}
      updateData={() => {}}
      onNext={() => {}}
      onBack={() => {}}
      draftLookup={draftLookup}
      onStepChange={onStepChange}
    />,
  );
}

beforeEach(() => {
  mockGenerateProposals.mockReset();
  mockRegenerate.mockReset();
  mockSetIndex.mockReset();
  mockState.proposals = null;
});

describe('Step2 Route A auto-generation', () => {
  it('originRoute === "A" で headShape, position が埋まっていれば mount 時に generateProposals を呼ぶ', () => {
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-001' }));
    expect(mockGenerateProposals).toHaveBeenCalledTimes(1);
  });

  it('originRoute === "B" の場合は呼ばない', () => {
    renderStep2(makeData({ originRoute: 'B', originDraftId: 'src-1' }));
    expect(mockGenerateProposals).not.toHaveBeenCalled();
  });

  it('originRoute === "C" の場合は呼ばない', () => {
    renderStep2(makeData({ originRoute: 'C' }));
    expect(mockGenerateProposals).not.toHaveBeenCalled();
  });

  it('originRoute === undefined の場合は呼ばない', () => {
    renderStep2(makeData({})); // initialSpecData.originRoute is undefined
    expect(mockGenerateProposals).not.toHaveBeenCalled();
  });

  it('proposals !== null の場合は呼ばない (二重実行防止)', () => {
    mockState.proposals = [{ bodyFabric: 'pu_smooth' }];
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-001' }));
    expect(mockGenerateProposals).not.toHaveBeenCalled();
  });

  it('headShape が空の場合は呼ばない', () => {
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-001', headShape: '' }));
    expect(mockGenerateProposals).not.toHaveBeenCalled();
  });

  it('position が空の場合は呼ばない', () => {
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-001', position: '' }));
    expect(mockGenerateProposals).not.toHaveBeenCalled();
  });
});

describe('Step2 guide banner', () => {
  it('originRoute === "A" で banner が表示される', () => {
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-2109-P897' }));
    expect(screen.getByText(/起点にしています/)).toBeInTheDocument();
  });

  it('originRoute === "A" で originSampleId が banner に含まれる', () => {
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-2109-P897' }));
    expect(screen.getByText(/BRG-2109-P897/)).toBeInTheDocument();
  });

  it('originRoute === "B" で banner が表示される', () => {
    renderStep2(makeData({ originRoute: 'B', originDraftId: 'src-id-1' }));
    expect(screen.getByText(/複製しています/)).toBeInTheDocument();
  });

  it('originRoute === "B" で複製元 productCode が banner に含まれる (lookup hit)', () => {
    const sourceDraft: DraftEnvelope = {
      id: 'src-id-1',
      productCode: 'KOD-2511-P317',
      brandName: 'Acme',
      savedAt: 0,
      lastStep: 1,
      data: initialSpecData,
      documentType: initialSpecData.documentType,
      sampleRevision: initialSpecData.sampleRevision,
    };
    renderStep2(
      makeData({ originRoute: 'B', originDraftId: 'src-id-1' }),
      () => sourceDraft,
    );
    expect(screen.getByText(/KOD-2511-P317/)).toBeInTheDocument();
  });

  it('originRoute === "B" で lookup miss なら id をフォールバックで表示', () => {
    renderStep2(
      makeData({ originRoute: 'B', originDraftId: 'orphan-id' }),
      () => null,
    );
    expect(screen.getByText(/orphan-id/)).toBeInTheDocument();
  });

  it('originRoute === "C" で banner が表示されない', () => {
    renderStep2(makeData({ originRoute: 'C' }));
    expect(screen.queryByText(/起点にしています|複製しています/)).toBeNull();
  });

  it('originRoute === undefined で banner が表示されない', () => {
    renderStep2(makeData({})); // no originRoute
    expect(screen.queryByText(/起点にしています|複製しています/)).toBeNull();
  });

  it('閉じるボタンで banner が非表示になる', async () => {
    const user = userEvent.setup();
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-001' }));
    expect(screen.getByText(/起点にしています/)).toBeInTheDocument();
    await user.click(screen.getByLabelText('ガイドを閉じる'));
    expect(screen.queryByText(/起点にしています/)).toBeNull();
  });
});

describe('Step2 position-missing fallback banner', () => {
  it('position が空文字の時にフォールバックバナーが表示される', () => {
    renderStep2(makeData({ originRoute: 'C', position: '' }));
    expect(screen.getByRole('alert')).toHaveTextContent('ポジションが未設定です');
  });

  it('position が undefined の時にフォールバックバナーが表示される', () => {
    // initialSpecData.position is '' so we cast to simulate the legacy shape.
    renderStep2(makeData({ originRoute: 'C', position: undefined as unknown as string }));
    expect(screen.getByRole('alert')).toHaveTextContent('ポジションが未設定です');
  });

  it('position が空白のみの時にもフォールバックバナーが表示される', () => {
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-001', position: '  ' }));
    expect(screen.getByRole('alert')).toHaveTextContent('ポジションが未設定です');
  });

  it('position 設定済の時はフォールバックバナーは表示されない', () => {
    renderStep2(makeData({ originRoute: 'C', position: 'standard' }));
    expect(screen.queryByText('ポジションが未設定です')).toBeNull();
  });

  it('フォールバック表示時は Route A ガイドバナーが出ない (優先順位)', () => {
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-001', position: '' }));
    expect(screen.getByText('ポジションが未設定です')).toBeInTheDocument();
    expect(screen.queryByText(/起点にしています/)).toBeNull();
  });

  it('フォールバック表示時は Route B ガイドバナーが出ない (優先順位)', () => {
    renderStep2(makeData({ originRoute: 'B', originDraftId: 'src-1', position: '' }));
    expect(screen.getByText('ポジションが未設定です')).toBeInTheDocument();
    expect(screen.queryByText(/複製しています/)).toBeNull();
  });

  it('「STEP1 に戻る」ボタンクリックで onStepChange(1) が呼ばれる', async () => {
    const onStepChange = vi.fn();
    const user = userEvent.setup();
    renderStep2(makeData({ originRoute: 'C', position: '' }), undefined, onStepChange);
    await user.click(screen.getByRole('button', { name: 'STEP1 に戻る' }));
    expect(onStepChange).toHaveBeenCalledTimes(1);
    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it('onStepChange が未指定なら「STEP1 に戻る」ボタンは描画されない', () => {
    renderStep2(makeData({ originRoute: 'C', position: '' }));
    expect(screen.getByText('ポジションが未設定です')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'STEP1 に戻る' })).toBeNull();
  });

  it('position が空でも generateProposals は自動実行されない (Route A 含む、回帰防止)', () => {
    renderStep2(makeData({ originRoute: 'A', originSampleId: 'BRG-001', position: '' }));
    expect(mockGenerateProposals).not.toHaveBeenCalled();
  });
});
