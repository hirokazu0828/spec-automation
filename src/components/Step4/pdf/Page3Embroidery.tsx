import { View, Text } from '@react-pdf/renderer';
import type { SpecData } from '../../../types';
import { specJson } from '../../../data/spec';
import { getLabel } from '../../../utils/specHelpers';
import { styles, COLORS } from './styles';

interface Props {
  data: SpecData;
}

export default function Page3Embroidery({ data }: Props) {
  const { embroideryDetails } = data;
  return (
    <View>
      <Text style={styles.sectionBanner}>3. 刺繍・プリント・高周波</Text>

      <View style={[styles.table, { marginBottom: 10 }]}>
        <View style={styles.tr}>
          <Text style={[styles.th, { width: 36 }]}>番号</Text>
          <Text style={[styles.th, { flex: 2 }]}>技法</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>糸種</Text>
          <Text style={[styles.th, { flex: 1.6 }]}>糸番号・カラー名</Text>
          <Text style={[styles.th, { width: 60 }]}>サイズmm</Text>
          <Text style={[styles.th, { flex: 1 }]}>配置</Text>
        </View>
        {embroideryDetails.map((emb, idx) => (
          <View style={styles.tr} key={emb.id}>
            <Text style={[styles.td, { width: 36, textAlign: 'center' }]}>{idx + 1}</Text>
            <Text style={[styles.td, { flex: 2 }]}>
              {emb.technique
                ? getLabel(specJson.parameters.embroidery, emb.technique)
                : ' '}
            </Text>
            <Text style={[styles.td, { flex: 1.2 }]}>
              {emb.threadType
                ? getLabel(specJson.parameters.thread_type, emb.threadType)
                : ' '}
            </Text>
            <Text style={[styles.td, { flex: 1.6 }]}>{emb.threadNumber || ' '}</Text>
            <Text style={[styles.td, { width: 60, textAlign: 'center' }]}>
              {emb.size || ' '}
            </Text>
            <Text style={[styles.td, { flex: 1 }]}>{emb.placement || ' '}</Text>
          </View>
        ))}
      </View>

      <View>
        <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 10 }}>
          縫製注意事項（刺繍・プリントなど共通）
        </Text>
        <Text
          style={{
            borderWidth: 1,
            borderColor: COLORS.borderLight,
            padding: 6,
            minHeight: 40,
            fontSize: 9,
          }}
        >
          {data.sewingNotes || ' '}
        </Text>
      </View>
    </View>
  );
}
