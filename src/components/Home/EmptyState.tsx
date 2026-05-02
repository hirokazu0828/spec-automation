import { DocumentPlusIcon } from '@heroicons/react/24/outline';

interface Props {
  onCreate: () => void;
}

export default function EmptyState({ onCreate }: Props) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-xl border-2 border-dashed border-gray-200">
      <DocumentPlusIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" aria-hidden="true" />
      <h3 className="text-lg font-bold text-gray-800 mb-2">まだ仕様書がありません</h3>
      <p className="text-sm text-gray-500 mb-6">最初の仕様書を作成してください。</p>
      <button
        onClick={onCreate}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow"
      >
        + 新しい仕様書を作成
      </button>
    </div>
  );
}
