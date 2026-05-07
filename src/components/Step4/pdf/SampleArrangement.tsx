import { View, Text } from '@react-pdf/renderer';
import type { SampleArrangement as SampleArrangementType } from '../../../types';
import { styles } from './styles';

interface Props {
  arrangement: SampleArrangementType | undefined;
}

const DEFAULT: SampleArrangementType = {
  quantities: { customer: 0, tokyo: 0, factory: 0 },
  unit: '個',
};

export default function SampleArrangement({ arrangement }: Props) {
  const a = arrangement ?? DEFAULT;
  return (
    <View style={styles.arrangementWrap}>
      <Text style={styles.arrangementBadge}>SAMPLE手配</Text>
      <View style={styles.arrangementRow}>
        <Text style={styles.arrangementLabel}>出荷納期</Text>
        <Text style={styles.arrangementValue}>{a.shippingDate || ' '}</Text>
      </View>
      <View style={styles.arrangementRow}>
        <Text style={styles.arrangementLabel}>数量</Text>
        <Text style={styles.arrangementValue}>
          客人用 {a.quantities.customer} {a.unit} / 東京用 {a.quantities.tokyo} {a.unit} / 工場用 {a.quantities.factory} {a.unit}
        </Text>
      </View>
      <View style={styles.arrangementRow}>
        <Text style={styles.arrangementLabel}>手配備考</Text>
        <Text style={styles.arrangementValue}>{a.arrangementNotes || ' '}</Text>
      </View>
      <View style={styles.arrangementRow}>
        <Text style={styles.arrangementLabel}>参考サンプル</Text>
        <Text style={styles.arrangementValue}>{a.referenceSampleId || ' '}</Text>
      </View>
    </View>
  );
}
