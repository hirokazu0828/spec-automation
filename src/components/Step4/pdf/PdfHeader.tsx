import { View, Text } from '@react-pdf/renderer';
import type { SpecData } from '../../../types';
import { specJson } from '../../../data/spec';
import { getLabel, ordinal } from '../../../utils/specHelpers';
import { styles } from './styles';

interface Props {
  data: SpecData;
  pageNum: number;
  totalPages: number;
}

function headerLabel(data: Pick<SpecData, 'documentType' | 'sampleRevision'>): string {
  if (data.documentType === 'sample') {
    return `SAMPLE指示書 ${ordinal(data.sampleRevision ?? 1)}`;
  }
  return '最終仕様書';
}

export default function PdfHeader({ data, pageNum, totalPages }: Props) {
  const label = headerLabel(data);
  const isSample = data.documentType === 'sample';
  const labelStyle = isSample ? styles.headerLabelOrange : styles.headerLabelRed;
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerTable}>
        <View style={[styles.headerCell, labelStyle]}>
          <Text>{label}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.twoColRow}>
            <View style={[styles.headerCell, styles.headerCellTitle, { width: 120 }]}>
              <Text>客人名</Text>
            </View>
            <View style={[styles.headerCell, styles.headerCellTitle, { flex: 1 }]}>
              <Text>品番 / 製品名</Text>
            </View>
            <View style={[styles.headerCell, styles.headerCellTitle, { width: 90 }]}>
              <Text>発行日</Text>
            </View>
            <View style={[styles.headerCell, styles.headerCellTitle, { width: 100 }]}>
              <Text>氏名</Text>
            </View>
          </View>
          <View style={styles.twoColRow}>
            <View style={[styles.headerCell, styles.headerCellValue, { width: 120 }]}>
              <Text>{data.brandName || ' '}</Text>
            </View>
            <View style={[styles.headerCell, styles.headerCellValue, { flex: 1 }]}>
              <Text>
                {data.productCode || ' '}
                {data.bodyColor
                  ? ` (${getLabel(specJson.parameters.body_color, data.bodyColor)})`
                  : ''}
              </Text>
            </View>
            <View style={[styles.headerCell, styles.headerCellValue, { width: 90 }]}>
              <Text>{data.issueDate || ' '}</Text>
            </View>
            <View style={[styles.headerCell, styles.headerCellValue, { width: 100 }]}>
              <Text>{data.staffName || ' '}</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={styles.headerPageNum}>p.{pageNum}/{totalPages}</Text>
    </View>
  );
}
