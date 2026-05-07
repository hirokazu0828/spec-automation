import {
  DocumentDuplicateIcon,
  TrashIcon,
  FolderOpenIcon,
  ArrowUpCircleIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import type { DraftEnvelope } from '../../hooks/useSpecDrafts';
import { ordinal } from '../../utils/specHelpers';

interface Props {
  drafts: DraftEnvelope[];
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPromoteRevision: (id: string) => void;
  onPromoteToFinal: (id: string) => void;
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function DocTypeBadge({ d }: { d: DraftEnvelope }) {
  if (d.documentType === 'final') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        最終仕様書
      </span>
    );
  }
  const rev = d.sampleRevision ?? 1;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
      SAMPLE {ordinal(rev)}
    </span>
  );
}

export default function DraftList({
  drafts,
  onOpen,
  onDuplicate,
  onDelete,
  onPromoteRevision,
  onPromoteToFinal,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-4 py-3 font-medium">品番</th>
            <th className="text-left px-4 py-3 font-medium">ブランド</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">種別</th>
            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">最終保存</th>
            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">ステップ</th>
            <th className="text-right px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {drafts.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50 align-top">
              <td className="px-4 py-3 font-mono text-gray-800">
                <div>{d.productCode || <span className="text-gray-400">(未入力)</span>}</div>
                <div className="md:hidden mt-1"><DocTypeBadge d={d} /></div>
              </td>
              <td className="px-4 py-3 text-gray-700">{d.brandName || <span className="text-gray-400">(未入力)</span>}</td>
              <td className="px-4 py-3 hidden md:table-cell"><DocTypeBadge d={d} /></td>
              <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatTimestamp(d.savedAt)}</td>
              <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">STEP{d.lastStep}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-x-2 gap-y-1">
                  <button
                    onClick={() => onOpen(d.id)}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 px-2 py-1"
                    aria-label={`${d.productCode || '(未入力)'}を開く`}
                  >
                    <FolderOpenIcon className="w-4 h-4" /> 開く
                  </button>
                  {d.documentType === 'sample' && (
                    <>
                      <button
                        onClick={() => onPromoteRevision(d.id)}
                        className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-800 px-2 py-1"
                        aria-label={`${d.productCode || '(未入力)'}の次のリビジョンを作成`}
                        title="次のリビジョンを作成 (sampleRevision +1)"
                      >
                        <ArrowUpCircleIcon className="w-4 h-4" /> 次の rev
                      </button>
                      <button
                        onClick={() => onPromoteToFinal(d.id)}
                        className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 px-2 py-1"
                        aria-label={`${d.productCode || '(未入力)'}を最終仕様書として確定`}
                        title="最終仕様書として確定"
                      >
                        <CheckBadgeIcon className="w-4 h-4" /> 最終確定
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onDuplicate(d.id)}
                    className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 px-2 py-1"
                    aria-label={`${d.productCode || '(未入力)'}を複製`}
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" /> 複製
                  </button>
                  <button
                    onClick={() => onDelete(d.id)}
                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 px-2 py-1"
                    aria-label={`${d.productCode || '(未入力)'}を削除`}
                  >
                    <TrashIcon className="w-4 h-4" /> 削除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
