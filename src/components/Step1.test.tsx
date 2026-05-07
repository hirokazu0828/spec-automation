import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Step1 from './Step1';
import { initialSpecData } from '../types';
import type { SpecData } from '../types';

function makeData(overrides: Partial<SpecData>): SpecData {
  return { ...initialSpecData, ...overrides };
}

describe('Step1 OriginBadge', () => {
  it('shows no badge when originRoute is undefined (legacy draft)', () => {
    render(<Step1 data={initialSpecData} updateData={() => {}} onNext={() => {}} />);
    expect(screen.queryByText(/起点:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/複製元:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/新規作成 \(白紙\)/)).not.toBeInTheDocument();
  });

  it('renders the Route A badge with the sample id', () => {
    const data = makeData({ originRoute: 'A', originSampleId: 'BRG-2109-P897' });
    render(<Step1 data={data} updateData={() => {}} onNext={() => {}} />);
    expect(screen.getByText(/起点: サンプル BRG-2109-P897/)).toBeInTheDocument();
  });

  it('renders the Route B badge using the lookup productCode', () => {
    const data = makeData({ originRoute: 'B', originDraftId: 'src-1' });
    const lookup = () => ({
      id: 'src-1',
      productCode: 'OLD-PROD-001',
      brandName: '',
      savedAt: 0,
      lastStep: 1 as const,
      data: initialSpecData,
      documentType: initialSpecData.documentType,
      sampleRevision: initialSpecData.sampleRevision,
    });
    render(<Step1 data={data} updateData={() => {}} onNext={() => {}} draftLookup={lookup} />);
    expect(screen.getByText(/複製元: OLD-PROD-001/)).toBeInTheDocument();
  });

  it('falls back to the draft id when lookup returns null', () => {
    const data = makeData({ originRoute: 'B', originDraftId: 'orphan-id' });
    render(
      <Step1 data={data} updateData={() => {}} onNext={() => {}} draftLookup={() => null} />,
    );
    expect(screen.getByText(/複製元: orphan-id/)).toBeInTheDocument();
  });

  it('renders the Route C badge', () => {
    const data = makeData({ originRoute: 'C' });
    render(<Step1 data={data} updateData={() => {}} onNext={() => {}} />);
    expect(screen.getByText(/新規作成 \(白紙\)/)).toBeInTheDocument();
  });
});
