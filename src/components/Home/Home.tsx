import { useMemo, useState } from 'react';
import { DocumentPlusIcon, BookOpenIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { DraftEnvelope } from '../../hooks/useSpecDrafts';
import DraftList from './DraftList';
import EmptyState from './EmptyState';

interface Props {
  drafts: DraftEnvelope[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenSamples: () => void;
}

export default function Home({ drafts, onCreate, onOpen, onDuplicate, onDelete, onOpenSamples }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter(
      (d) =>
        d.productCode.toLowerCase().includes(q) ||
        d.brandName.toLowerCase().includes(q),
    );
  }, [drafts, query]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.savedAt - a.savedAt),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仕様書ドラフト</h1>
          <p className="text-sm text-gray-500 mt-1">編集中の仕様書を選んで再開、または新規作成できます。</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenSamples}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg shadow-sm"
          >
            <BookOpenIcon className="w-5 h-5" /> サンプル帳を開く
          </button>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow"
          >
            <DocumentPlusIcon className="w-5 h-5" /> 新しい仕様書を作成
          </button>
        </div>
      </header>

      {drafts.length === 0 ? (
        <EmptyState onCreate={onCreate} />
      ) : (
        <>
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="品番またはブランド名で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:max-w-md pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="ドラフトを検索"
            />
          </div>
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-500 px-2">該当するドラフトがありません。</p>
          ) : (
            <DraftList
              drafts={sorted}
              onOpen={onOpen}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          )}
        </>
      )}
    </div>
  );
}
