import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { DraftEnvelope } from '../../hooks/useSpecDrafts';

interface Props {
  drafts: DraftEnvelope[];
  onPick: (draft: DraftEnvelope) => void;
  onClose: () => void;
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function DraftPickerModal({ drafts, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        <div className="max-h-[60vh] overflow-y-auto">
          {drafts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">複製元になるドラフトがありません</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {drafts.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onPick(d)}
                    className="w-full text-left px-5 py-3 hover:bg-indigo-50 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-gray-900 truncate">
                        {d.productCode || <span className="text-gray-400">(品番未入力)</span>}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {d.brandName || '(ブランド未入力)'} · {formatTimestamp(d.savedAt)} · STEP{d.lastStep}
                      </div>
                    </div>
                    <span className="text-xs text-indigo-600 font-bold shrink-0">この案件をベースに →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
