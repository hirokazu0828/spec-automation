import { useEffect, useMemo, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { DraftEnvelope } from '../../hooks/useSpecDrafts';
import { ordinal } from '../../utils/specHelpers';

export type DocTypeOverride = 'inherit' | 'final';

interface Props {
  drafts: DraftEnvelope[];
  /**
   * `override` lets the caller skip inheritance and force `documentType: 'final'`.
   * The actual inheritance + sampleRevision +1 logic is App-side.
   */
  onPick: (draft: DraftEnvelope, override: DocTypeOverride) => void;
  onClose: () => void;
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function describeDocType(d: DraftEnvelope): string {
  if (d.documentType === 'final') return '最終仕様書';
  const rev = d.sampleRevision ?? 1;
  return `SAMPLE指示書 ${ordinal(rev)}`;
}

export default function DraftPickerModal({ drafts, onPick, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [override, setOverride] = useState<DocTypeOverride>('inherit');

  const selected = useMemo(
    () => drafts.find((d) => d.id === selectedId) ?? null,
    [drafts, selectedId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const showFinalOption = selected?.documentType === 'sample';
  const effectiveOverride: DocTypeOverride = showFinalOption ? override : 'inherit';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="複製元ドラフトを選択"
      className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mt-12">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">複製元ドラフトを選択</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              選んだドラフトのデータを引き継ぎ、品番・発行日・改訂履歴のみリセットします
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="text-gray-400 hover:text-gray-700 p-1"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {drafts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">複製元になるドラフトがありません</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {drafts.map((d) => {
                const isSelected = d.id === selectedId;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      aria-pressed={isSelected}
                      className={`w-full text-left px-5 py-3 flex items-center justify-between gap-3 ${
                        isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-gray-900 truncate">
                          {d.productCode || <span className="text-gray-400">(品番未入力)</span>}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {d.brandName || '(ブランド未入力)'} · {formatTimestamp(d.savedAt)} · STEP{d.lastStep}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          d.documentType === 'final'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {describeDocType(d)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {drafts.length > 0 && (
          <div className="border-t border-gray-200 px-5 py-4 space-y-3">
            <fieldset className="text-sm">
              <legend className="text-xs font-bold text-gray-600 mb-1">複製後の出力タイプ</legend>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="draft-picker-doctype"
                  value="inherit"
                  checked={effectiveOverride === 'inherit'}
                  onChange={() => setOverride('inherit')}
                  className="text-indigo-600"
                />
                <span>
                  複製元と同じ
                  {selected?.documentType === 'sample' && ' (sampleRevision を +1 した次のリビジョン)'}
                </span>
              </label>
              <label
                className={`flex items-center gap-2 ${
                  showFinalOption ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <input
                  type="radio"
                  name="draft-picker-doctype"
                  value="final"
                  checked={effectiveOverride === 'final'}
                  disabled={!showFinalOption}
                  onChange={() => setOverride('final')}
                  className="text-indigo-600"
                />
                <span>最終仕様書として作成</span>
              </label>
            </fieldset>
            <button
              type="button"
              onClick={() => {
                if (!selected) return;
                onPick(selected, effectiveOverride);
              }}
              disabled={!selected}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selected
                ? `この案件をベースに作成 (${selected.productCode || '(品番未入力)'}) →`
                : 'まず複製元のドラフトを選んでください'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
