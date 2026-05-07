import { Document, Page, View, Text } from '@react-pdf/renderer';
import type { SpecData } from '../../../types';
import { ensureFontsRegistered } from './fonts';
import { styles, PAGE_PROPS } from './styles';
import PdfHeader from './PdfHeader';
import Page1Parameters from './Page1Parameters';
import Page2Material from './Page2Material';
import Page3Embroidery from './Page3Embroidery';

export interface SpecSheetPdfProps {
  primary: SpecData;
  /** Optional secondary draft for parallel-output mode (Layer 2-PDF). */
  secondary?: SpecData | null;
}

ensureFontsRegistered();

/**
 * Root PDF document. Pagination per Layer 2-PDF spec:
 *   - single mode: 3 pages (parameters / material / embroidery)
 *   - parallel mode: 5 pages
 *       p1: A+B parameters side-by-side
 *       p2: A material
 *       p3: A embroidery
 *       p4: B material
 *       p5: B embroidery
 *     (= "draft-by-draft sequential", per user decision)
 */
export default function SpecSheetPdf({ primary, secondary }: SpecSheetPdfProps) {
  const isParallel = !!secondary;
  const totalPages = isParallel ? 5 : 3;

  if (!isParallel) {
    return (
      <Document>
        <Page {...PAGE_PROPS} style={styles.page}>
          <PdfHeader data={primary} pageNum={1} totalPages={totalPages} />
          <Page1Parameters data={primary} />
        </Page>
        <Page {...PAGE_PROPS} style={styles.page}>
          <PdfHeader data={primary} pageNum={2} totalPages={totalPages} />
          <Page2Material data={primary} />
        </Page>
        <Page {...PAGE_PROPS} style={styles.page}>
          <PdfHeader data={primary} pageNum={3} totalPages={totalPages} />
          <Page3Embroidery data={primary} />
        </Page>
      </Document>
    );
  }

  // Parallel: A+B on PAGE 1, then A material/embroidery, then B material/embroidery
  return (
    <Document>
      <Page {...PAGE_PROPS} style={styles.page}>
        <PdfHeader data={primary} pageNum={1} totalPages={totalPages} />
        <View style={styles.parallelRow}>
          <View style={styles.parallelCol}>
            <Text style={styles.parallelLabel}>A 案 ({primary.productCode || '未入力'})</Text>
            <Page1Parameters data={primary} hideArrangement />
          </View>
          <View style={styles.parallelCol}>
            <Text style={styles.parallelLabel}>B 案 ({secondary.productCode || '未入力'})</Text>
            <Page1Parameters data={secondary} hideArrangement />
          </View>
        </View>
      </Page>

      {/* A draft full pages */}
      <Page {...PAGE_PROPS} style={styles.page}>
        <PdfHeader data={primary} pageNum={2} totalPages={totalPages} />
        <Page2Material data={primary} />
      </Page>
      <Page {...PAGE_PROPS} style={styles.page}>
        <PdfHeader data={primary} pageNum={3} totalPages={totalPages} />
        <Page3Embroidery data={primary} />
      </Page>

      {/* B draft full pages */}
      <Page {...PAGE_PROPS} style={styles.page}>
        <PdfHeader data={secondary} pageNum={4} totalPages={totalPages} />
        <Page2Material data={secondary} />
      </Page>
      <Page {...PAGE_PROPS} style={styles.page}>
        <PdfHeader data={secondary} pageNum={5} totalPages={totalPages} />
        <Page3Embroidery data={secondary} />
      </Page>
    </Document>
  );
}
