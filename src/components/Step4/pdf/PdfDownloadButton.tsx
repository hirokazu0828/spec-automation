import { PDFDownloadLink } from '@react-pdf/renderer';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { SpecData } from '../../../types';
import { generatePdfFileName } from '../../../utils/specHelpers';
import SpecSheetPdf from './SpecSheetPdf';

interface Props {
  primary: SpecData;
  secondary?: SpecData | null;
}

/**
 * Lazy-loaded shell for the PDF download flow. The whole module — including
 * @react-pdf/renderer and its fontkit/pdfkit deps (~1.5MB) — only loads when
 * the user opens this button via React.lazy in Step4.
 */
export default function PdfDownloadButton({ primary, secondary }: Props) {
  const fileName = generatePdfFileName(
    primary,
    secondary ? { productCode: secondary.productCode } : undefined,
  );
  return (
    <PDFDownloadLink
      document={<SpecSheetPdf primary={primary} secondary={secondary ?? undefined} />}
      fileName={fileName}
      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow transition-colors"
    >
      {({ loading, error }) => (
        <>
          <ArrowDownTrayIcon className="w-5 h-5" />
          {error
            ? 'PDF 生成エラー'
            : loading
              ? 'PDF 生成中...'
              : `PDF をダウンロード (${fileName})`}
        </>
      )}
    </PDFDownloadLink>
  );
}
