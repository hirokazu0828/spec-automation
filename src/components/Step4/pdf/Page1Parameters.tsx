import { View, Text } from '@react-pdf/renderer';
import type { SpecData } from '../../../types';
import { specJson } from '../../../data/spec';
import {
  getLabel,
  SHAPE_LABELS_JA,
  POSITION_LABELS_JA,
} from '../../../utils/specHelpers';
import { styles } from './styles';
import SampleArrangement from './SampleArrangement';

interface Props {
  data: SpecData;
  /** When true, omit the SAMPLE arrangement block (used in parallel-mode PAGE 1
   *  where the column is too narrow and the arrangement is shown on primary). */
  hideArrangement?: boolean;
}

function ParamRow({
  label,
  children,
  thWidth = 90,
  bold,
}: {
  label: string;
  children: React.ReactNode;
  thWidth?: number;
  bold?: boolean;
}) {
  return (
    <View style={styles.tr}>
      <Text style={[styles.th, { width: thWidth }]}>{label}</Text>
      <Text style={bold ? [styles.td, { flex: 1, fontWeight: 'bold' }] : [styles.td, { flex: 1 }]}>
        {children}
      </Text>
    </View>
  );
}

/**
 * Renders the parameter list (PAGE 1 contents) for a single draft.
 * Used both as a standalone page and as a column inside parallel mode.
 */
export default function Page1Parameters({ data, hideArrangement }: Props) {
  return (
    <View>
      {data.documentType === 'sample' && !hideArrangement && (
        <SampleArrangement arrangement={data.sampleArrangement} />
      )}
      <Text style={styles.sectionBanner}>1. パラメーター一覧</Text>
      <View style={styles.table}>
        <ParamRow label="形状" bold>
          {SHAPE_LABELS_JA[data.headShape] || '-'}
        </ParamRow>
        <ParamRow label="ポジション" bold>
          {POSITION_LABELS_JA[data.position] || '-'}
        </ParamRow>
        <ParamRow label="コンセプト">{data.conceptMemo || '-'}</ParamRow>
        <ParamRow label="本体生地">
          {getLabel(specJson.parameters.body_fabric, data.bodyFabric)}
        </ParamRow>
        <ParamRow label="テクスチャー">
          {getLabel(specJson.parameters.texture, data.texture)}
        </ParamRow>
        <ParamRow label="裏地">
          {getLabel(specJson.parameters.lining, data.lining)}
        </ParamRow>
        <ParamRow label="パイピング">
          {getLabel(specJson.parameters.piping, data.piping)}
        </ParamRow>
        <ParamRow label="開閉方式">
          {getLabel(specJson.parameters.closure, data.closure)}
        </ParamRow>
        <ParamRow label="主刺繍技法">
          {getLabel(specJson.parameters.embroidery, data.embroidery)}
        </ParamRow>
        <ParamRow label="本体カラー">
          {getLabel(specJson.parameters.body_color, data.bodyColor)}
          {data.colorCode ? `（コード: ${data.colorCode}）` : ''}
        </ParamRow>
        <ParamRow label="金具仕上げ">
          {getLabel(specJson.parameters.hardware_finish, data.hardwareFinish)}
        </ParamRow>
      </View>
    </View>
  );
}
