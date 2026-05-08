import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import SpecSheetPdf from './SpecSheetPdf';
import { initialSpecData } from '../../../types';
import type { SpecData } from '../../../types';

/**
 * @react-pdf/renderer's primitives (Document, Page, View, Text, Image) push
 * to a virtual DOM tree that fontkit/pdfkit serialise into PDF binary at
 * render time — none of which works in jsdom. We replace each primitive with
 * a plain HTML wrapper that exposes its key props as data-attrs so structure
 * assertions read naturally with @testing-library queries.
 *
 * Font.register is also mocked to a no-op so the font module side-effect
 * doesn't try to touch /public/fonts/ during tests.
 */
vi.mock('@react-pdf/renderer', () => {
  const Document = ({ children }: { children: React.ReactNode }) => (
    <div data-pdf="document">{children}</div>
  );
  const Page = ({
    children,
    size,
    orientation,
  }: {
    children: React.ReactNode;
    size?: string;
    orientation?: string;
  }) => (
    <div data-pdf="page" data-size={size} data-orientation={orientation}>
      {children}
    </div>
  );
  const View = ({ children }: { children?: React.ReactNode }) => (
    <div data-pdf="view">{children}</div>
  );
  const Text = ({ children }: { children?: React.ReactNode }) => (
    <span data-pdf="text">{children}</span>
  );
  const Image = ({ src }: { src?: string }) => <img data-pdf="image" src={src} alt="" />;
  return {
    Document,
    Page,
    View,
    Text,
    Image,
    StyleSheet: { create: <T,>(o: T) => o },
    Font: {
      register: vi.fn(),
      registerHyphenationCallback: vi.fn(),
    },
    PDFDownloadLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

function makePrimary(overrides: Partial<SpecData> = {}): SpecData {
  return {
    ...initialSpecData,
    productCode: 'PRIMARY-001',
    brandName: 'Primary Brand',
    headShape: 'pin',
    position: 'standard',
    ...overrides,
  };
}

function makeSecondary(overrides: Partial<SpecData> = {}): SpecData {
  return {
    ...initialSpecData,
    productCode: 'SECONDARY-002',
    brandName: 'Secondary Brand',
    headShape: 'mallet',
    position: 'casual',
    ...overrides,
  };
}

describe('SpecSheetPdf', () => {
  it('emits a Document → Page tree with A4 landscape pages', () => {
    render(<SpecSheetPdf primary={makePrimary()} />);
    const doc = document.querySelector('[data-pdf="document"]');
    expect(doc).not.toBeNull();
    const pages = document.querySelectorAll('[data-pdf="page"]');
    expect(pages.length).toBeGreaterThan(0);
    pages.forEach((p) => {
      expect(p.getAttribute('data-size')).toBe('A4');
      expect(p.getAttribute('data-orientation')).toBe('landscape');
    });
  });

  it('renders 3 pages in single mode', () => {
    render(<SpecSheetPdf primary={makePrimary()} />);
    expect(document.querySelectorAll('[data-pdf="page"]').length).toBe(3);
  });

  it('renders 5 pages in parallel mode', () => {
    render(<SpecSheetPdf primary={makePrimary()} secondary={makeSecondary()} />);
    expect(document.querySelectorAll('[data-pdf="page"]').length).toBe(5);
  });

  it('parallel-mode PAGE 1 contains both primary and secondary product codes', () => {
    render(
      <SpecSheetPdf
        primary={makePrimary({ productCode: 'A-100' })}
        secondary={makeSecondary({ productCode: 'B-200' })}
      />,
    );
    const pages = document.querySelectorAll('[data-pdf="page"]');
    const page1 = pages[0];
    expect(page1.textContent).toContain('A-100');
    expect(page1.textContent).toContain('B-200');
    expect(page1.textContent).toContain('A 案');
    expect(page1.textContent).toContain('B 案');
  });

  it('renders SAMPLE arrangement banner only when documentType=sample', () => {
    const { rerender, container } = render(
      <SpecSheetPdf primary={makePrimary({ documentType: 'sample', sampleRevision: 1 })} />,
    );
    expect(container.textContent).toContain('SAMPLE手配');
    rerender(<SpecSheetPdf primary={makePrimary({ documentType: 'final' })} />);
    expect(container.textContent).not.toContain('SAMPLE手配');
  });

  it('header banner reads "SAMPLE指示書 1st" for sample documents', () => {
    render(<SpecSheetPdf primary={makePrimary({ documentType: 'sample', sampleRevision: 1 })} />);
    expect(screen.getAllByText(/SAMPLE指示書 1st/).length).toBeGreaterThan(0);
  });

  it('header banner reads "最終仕様書" for final documents', () => {
    render(<SpecSheetPdf primary={makePrimary({ documentType: 'final' })} />);
    expect(screen.getAllByText('最終仕様書').length).toBeGreaterThan(0);
  });

  it('parallel-mode page order is draft-by-draft sequential (A material/embroidery → B material/embroidery)', () => {
    render(
      <SpecSheetPdf
        primary={makePrimary({ productCode: 'AAAA' })}
        secondary={makeSecondary({ productCode: 'BBBB' })}
      />,
    );
    const pages = document.querySelectorAll('[data-pdf="page"]');
    // p1=combined, p2=A material, p3=A embroidery, p4=B material, p5=B embroidery.
    // Each draft's pages render its own header (data.brandName / productCode).
    expect(pages[1].textContent).toContain('AAAA');
    expect(pages[2].textContent).toContain('AAAA');
    expect(pages[3].textContent).toContain('BBBB');
    expect(pages[4].textContent).toContain('BBBB');
    // Section banners: p2/p4 should have "2. 生地仕様", p3/p5 should have "3. 刺繍".
    expect(within(pages[1] as HTMLElement).getByText(/^2\. 生地仕様$/)).toBeInTheDocument();
    expect(within(pages[2] as HTMLElement).getByText(/^3\. 刺繍/)).toBeInTheDocument();
    expect(within(pages[3] as HTMLElement).getByText(/^2\. 生地仕様$/)).toBeInTheDocument();
    expect(within(pages[4] as HTMLElement).getByText(/^3\. 刺繍/)).toBeInTheDocument();
  });

  it('total page count text in header reflects mode (3 vs 5)', () => {
    const { rerender, container } = render(<SpecSheetPdf primary={makePrimary()} />);
    expect(container.textContent).toContain('p.1/3');
    rerender(<SpecSheetPdf primary={makePrimary()} secondary={makeSecondary()} />);
    expect(container.textContent).toContain('p.1/5');
    expect(container.textContent).toContain('p.5/5');
  });
});
