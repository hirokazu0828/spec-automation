import { View, Text, Image } from '@react-pdf/renderer';
import type { SpecData } from '../../../types';
import { styles, COLORS } from './styles';

interface Props {
  data: SpecData;
}

export default function Page2Material({ data }: Props) {
  const { revisionHistory, fabricParts, productPhotos } = data;
  return (
    <View>
      <Text style={styles.sectionBanner}>2. 生地仕様</Text>

      {/* 改訂履歴 */}
      <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 10 }}>改訂履歴</Text>
      <View style={[styles.table, { marginBottom: 10 }]}>
        <View style={styles.tr}>
          <Text style={[styles.th, { width: 90 }]}>日付</Text>
          <Text style={[styles.th, { flex: 1 }]}>変更内容</Text>
        </View>
        {revisionHistory.map((rev, idx) => (
          <View style={styles.tr} key={`rev-${idx}`}>
            <Text style={[styles.td, { width: 90 }]}>{rev.date || ' '}</Text>
            <Text style={[styles.td, { flex: 1 }]}>{rev.content || ' '}</Text>
          </View>
        ))}
      </View>

      {/* 縫製注意事項 + 寸法 */}
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 10 }}>縫製注意事項</Text>
        <Text style={{ borderWidth: 1, borderColor: COLORS.borderLight, padding: 6, minHeight: 30, fontSize: 9 }}>
          {data.sewingNotes || ' '}
        </Text>
      </View>

      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 10 }}>寸法</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, fontSize: 9 }}>
          <DimText label="全長" value={data.dimensionLength} />
          <DimText label="幅" value={data.dimensionWidth} />
          <DimText label="高さ" value={data.dimensionHeight} />
          <DimText label="縁巻き幅" value={data.dimensionPiping} />
          <DimText label="刺繍位置" value={data.dimensionEmbroidery} />
        </View>
      </View>

      {/* 製品写真 (最大 3 枚を横並べ) */}
      {productPhotos.some((p) => p.dataUrl) && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 10 }}>製品写真</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {productPhotos.slice(0, 3).map((photo, i) => {
              if (!photo.dataUrl) return null;
              return (
                <View key={`photo-${i}`} style={{ width: 110 }}>
                  <Image
                    src={photo.dataUrl}
                    style={{ width: 110, height: 88, objectFit: 'cover' }}
                  />
                  <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 2 }}>
                    {photo.name || ' '}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 部位別仕様表 */}
      {fabricParts.length > 0 && (
        <View>
          <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 10 }}>部位別仕様表</Text>
          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={[styles.th, { width: 70 }]}>部位</Text>
              <Text style={[styles.th, { flex: 2 }]}>使用箇所 / 素材</Text>
              <Text style={[styles.th, { flex: 1 }]}>カラー</Text>
              <Text style={[styles.th, { width: 60 }]}>糸番号</Text>
            </View>
            {fabricParts.map((p) => (
              <View style={styles.tr} key={p.id}>
                <Text style={[styles.td, styles.tdGreen, { width: 70 }]}>{p.label}</Text>
                <Text style={[styles.td, { flex: 2 }]}>
                  {p.usage || '-'} / {p.material || '-'}
                </Text>
                <Text style={[styles.td, { flex: 1 }]}>{p.colorName || '-'}</Text>
                <Text style={[styles.td, { width: 60 }]}>{p.threadNumber || '-'}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function DimText({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontWeight: 'bold' }}>{label}: </Text>
      <Text>{value || '-'} mm</Text>
    </View>
  );
}
