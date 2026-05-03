import { useState, useMemo, useEffect } from 'react'
import type { PutterSample } from './types'
import samplesData from '../../data/samples.json'
import { getOptions, getShapeByAlias } from '../../utils/specHelpers'
import { getSampleClosureTypes, getSampleDecorationTypes } from './sampleHelpers'

const SAMPLES = samplesData as PutterSample[]
const IMAGE_BASE = '/images/'

const SHAPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ブレード:       { bg: '#EAF3DE', text: '#27500A', border: '#97C459' },
  フルマレット:   { bg: '#E6F1FB', text: '#0C447C', border: '#85B7EB' },
  セミマレット:   { bg: '#FAEEDA', text: '#633806', border: '#EF9F27' },
  スクエアマレット:{ bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC' },
  ネオマレット:   { bg: '#FAECE7', text: '#712B13', border: '#F0997B' },
}

const SHAPE_ICONS: Record<string, string> = {
  ブレード: '▬', フルマレット: '◉', セミマレット: '◔',
  スクエアマレット: '▪', ネオマレット: '◈',
}

function Tag({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, padding: '2px 8px',
      borderRadius: 20, fontWeight: 400, ...style,
    }}>
      {label}
    </span>
  )
}

function SpecRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '58%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '4px 0' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function SampleCard({ sample, onClick }: { sample: PutterSample; onClick: () => void }) {
  const [imgError, setImgError] = useState(false)
  const shapeStyle = SHAPE_STYLES[sample.shape.head_type] ?? SHAPE_STYLES['ブレード']
  const icon = SHAPE_ICONS[sample.shape.head_type] ?? '◻'

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border-tertiary)')}
    >
      <div style={{
        width: '100%', height: 160, background: 'var(--color-background-secondary)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {!imgError ? (
          <img
            src={`${IMAGE_BASE}${sample.meta.image_file}`}
            alt={sample.item_name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 32 }}>{icon}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>画像なし</span>
          </div>
        )}
        {sample.meta.needs_review && (
          <div style={{
            position: 'absolute', top: 8, right: 8, fontSize: 10, padding: '2px 7px',
            background: '#FCEBEB', color: '#A32D2D', borderRadius: 20,
          }}>
            要確認
          </div>
        )}
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500, letterSpacing: '0.04em', marginBottom: 4 }}>
          {sample.sample_number}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 500, lineHeight: 1.4, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {sample.item_name}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          <Tag label={sample.shape.head_type} style={{ background: shapeStyle.bg, color: shapeStyle.text }} />
          <Tag label={sample.outer_material.fabric} style={{ background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} />
        </div>

        <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 8 }}>
          <SpecRow label="メインカラー" value={sample.color_scheme.main_color} />
          <SpecRow label="開閉方式" value={sample.closure.type} />
          <SpecRow label="装飾" value={sample.decoration.type} />
        </div>
      </div>
    </div>
  )
}

function Modal({
  sample,
  onClose,
  onPickSample,
}: {
  sample: PutterSample
  onClose: () => void
  onPickSample?: (s: PutterSample) => void
}) {
  const [imgError, setImgError] = useState(false)
  const icon = SHAPE_ICONS[sample.shape.head_type] ?? '◻'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={sample.item_name}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', zIndex: 1000, overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 12, width: '100%', maxWidth: 540, overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--color-border-tertiary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4 }}>{sample.item_name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {sample.sample_number} — {sample.date}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{ fontSize: 18, cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-secondary)', lineHeight: 1, padding: 2 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div style={{
            width: '100%', height: 220, background: 'var(--color-background-secondary)',
            borderRadius: 8, overflow: 'hidden', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {!imgError ? (
              <img
                src={`${IMAGE_BASE}${sample.meta.image_file}`}
                alt={sample.item_name}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48 }}>{icon}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                  {sample.shape.head_type}（画像未登録）
                </div>
              </div>
            )}
          </div>

          <DetailSection title="① 形状・サイズ">
            <DetailRow label="形状タイプ" value={sample.shape.head_type} />
            <DetailRow label="判定確信度" value={sample.shape.head_type_confidence} />
            <DetailRow label="寸法" value={sample.size.dimensions_noted} />
            <DetailRow label="参照仕様書" value={sample.size.reference_spec} />
          </DetailSection>

          <DetailSection title="③④ 素材">
            <DetailRow label="表地" value={sample.outer_material.fabric} />
            <DetailRow label="表地カラー" value={sample.outer_material.color} />
            <DetailRow label="裏地" value={sample.lining_material.fabric} />
            <DetailRow label="裏地カラー" value={sample.lining_material.color} />
          </DetailSection>

          <DetailSection title="⑤⑥ 開閉・配色">
            <DetailRow label="開閉方式" value={sample.closure.type} />
            <DetailRow label="留め具サイズ" value={sample.closure.size} />
            <DetailRow label="メインカラー" value={sample.color_scheme.main_color} />
            <DetailRow label="金具カラー" value={sample.color_scheme.hardware_color} />
          </DetailSection>

          <DetailSection title="⑦⑧ 装飾・ロゴ">
            <DetailRow label="装飾種別" value={sample.decoration.type} />
            <DetailRow label="刺繍詳細" value={sample.decoration.embroidery_detail} />
            <DetailRow label="ロゴ種別" value={sample.logo.type} />
            <DetailRow label="ロゴ色" value={sample.logo.color} />
            <DetailRow label="パントーン" value={sample.logo.pantone} />
          </DetailSection>

          {sample.meta.needs_review && (
            <div style={{
              marginTop: 14, padding: '8px 12px',
              background: 'var(--color-background-danger)',
              borderRadius: 8, fontSize: 12, color: 'var(--color-text-danger)',
            }}>
              要確認: {sample.meta.review_reason}
            </div>
          )}

          {onPickSample && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
              <button
                type="button"
                onClick={() => onPickSample(sample)}
                style={{
                  width: '100%', fontSize: 14, fontWeight: 600, padding: '10px 0',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#4f46e5', color: '#ffffff',
                }}
              >
                このサンプルを起点に新規作成 →
              </button>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, textAlign: 'center' }}>
                形状とブランド名を引き継いで Step1 を起動します
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface SampleBookProps {
  /**
   * When provided, each sample's modal shows a primary "起点に新規作成" button.
   * When `mode === 'pick'`, a top banner clarifies that the user is picking a
   * sample as a starting point for Route A.
   */
  onPickSample?: (sample: PutterSample) => void
  mode?: 'browse' | 'pick'
}

export default function SampleBook({ onPickSample, mode = 'browse' }: SampleBookProps = {}) {
  const [query, setQuery] = useState('')
  const [filterShape, setFilterShape] = useState('') // master head_shape value, e.g. 'pin'
  const [filterClosure, setFilterClosure] = useState('')
  const [filterDecor, setFilterDecor] = useState('')
  const [selected, setSelected] = useState<PutterSample | null>(null)

  const shapeOptions = useMemo(() => getOptions('head_shape'), [])
  const closureOptions = useMemo(() => getSampleClosureTypes(SAMPLES), [])
  const decorationOptions = useMemo(() => getSampleDecorationTypes(SAMPLES), [])

  const filtered = useMemo(() => {
    return SAMPLES.filter(s => {
      if (filterShape) {
        const masterValue = getShapeByAlias(s.shape.head_type)
        if (masterValue !== filterShape) return false
      }
      if (filterClosure && s.closure.type !== filterClosure) return false
      if (filterDecor && s.decoration.type !== filterDecor) return false
      if (query) {
        const blob = [s.sample_number, s.item_name, s.outer_material.fabric, s.outer_material.color, s.color_scheme.main_color].join(' ').toLowerCase()
        if (!blob.includes(query.toLowerCase())) return false
      }
      return true
    })
  }, [query, filterShape, filterClosure, filterDecor])

  const selectStyle: React.CSSProperties = {
    fontSize: 13, padding: '6px 10px', height: 34,
    borderRadius: 8, border: '0.5px solid var(--color-border-secondary)',
    background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {mode === 'pick' && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: '#EEF2FF',
            border: '1px solid #C7D2FE',
            borderRadius: 8,
            fontSize: 13,
            color: '#3730A3',
          }}
        >
          <strong>[A] サンプル帳から作成</strong>: 起点となるサンプルを選んでください。詳細を開いて「起点に新規作成」を押すと Step1 に進みます。
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <input
          type="text"
          placeholder="品番・素材で検索..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ ...selectStyle, width: 200 }}
        />
        <select value={filterShape} onChange={e => setFilterShape(e.target.value)} style={selectStyle}>
          <option value="">形状：すべて</option>
          {shapeOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={filterClosure} onChange={e => setFilterClosure(e.target.value)} style={selectStyle}>
          <option value="">開閉：すべて</option>
          {closureOptions.map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select value={filterDecor} onChange={e => setFilterDecor(e.target.value)} style={selectStyle}>
          <option value="">装飾：すべて</option>
          {decorationOptions.map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
          {filtered.length} / {SAMPLES.length}件
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
          該当する商品がありません
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {filtered.map((s, i) => (
            <SampleCard key={`${s.sample_number}-${i}`} sample={s} onClick={() => setSelected(s)} />
          ))}
        </div>
      )}

      {selected && (
        <Modal
          sample={selected}
          onClose={() => setSelected(null)}
          onPickSample={onPickSample}
        />
      )}
    </div>
  )
}
