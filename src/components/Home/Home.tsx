import { useMemo, useState } from 'react';
import { BookOpenIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { DraftEnvelope } from '../../hooks/useSpecDrafts';
import type { DocumentType } from '../../types';
import DraftList from './DraftList';
import EmptyState from './EmptyState';
import RouteSelector from './RouteSelector';
import DraftPickerModal, { type DocTypeOverride } from './DraftPickerModal';

interface Props {
  drafts: DraftEnvelope[];
  /** Route C (white-paper). docType comes from the radio in the route card. */
  onCreateConcept: (documentType: DocumentType) => void;
  /** Route A (SampleBook 起点) — Home からは samples view への遷移。 */
  onOpenSampleBookForRouteA: () => void;
  /** Route B (Draft 起点) — modal で選んだ draft + docType override を起点にする。 */
  onCreateFromDraft: (sourceDraft: DraftEnvelope, override: DocTypeOverride) => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPromoteRevision: (id: string) => void;
  onPromoteToFinal: (id: string) => void;
  onOpenSamples: () => void;
}

export default function Home({
  drafts,
  onCreateConcept,
  onOpenSampleBookForRouteA,
  onCreateFromDraft,
  onOpen,
  onDuplicate,
  onDelete,
  onPromoteRevision,
  onPromoteToFinal,
  onOpenSamples,
}: Props) {
  const [query, setQuery] = useState('');
  const [showDraftPicker, setShowDraftPicker] = useState(false);

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
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仕様書ドラフト</h1>
          <p className="text-sm text-gray-500 mt-1">
            起点を選んで新規作成するか、既存ドラフトを開いて再開できます。
          </p>
        </div>
        <button
          onClick={onOpenSamples}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg shadow-sm self-start sm:self-end"
        >
          <BookOpenIcon className="w-5 h-5" /> サンプル帳を開く
        </button>
      </header>

      <section aria-label="新規作成の起点を選択">
        <h2 className="text-sm font-bold text-gray-700 mb-2">新規作成</h2>
        <RouteSelector
          onPickRouteA={onOpenSampleBookForRouteA}
          onPickRouteB={() => setShowDraftPicker(true)}
          onPickRouteC={onCreateConcept}
          disableRouteB={drafts.length === 0}
        />
      </section>

      <section aria-label="既存ドラフト">
        <h2 className="text-sm font-bold text-gray-700 mb-2">既存ドラフト ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <EmptyState onCreate={() => onCreateConcept('sample')} />
        ) : (
          <div className="space-y-3">
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
                onPromoteRevision={onPromoteRevision}
                onPromoteToFinal={onPromoteToFinal}
              />
            )}
          </div>
        )}
      </section>

      {showDraftPicker && (
        <DraftPickerModal
          drafts={drafts}
          onClose={() => setShowDraftPicker(false)}
          onPick={(d, override) => {
            setShowDraftPicker(false);
            onCreateFromDraft(d, override);
          }}
        />
      )}
    </div>
  );
}
