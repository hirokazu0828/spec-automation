import { BookOpenIcon, DocumentDuplicateIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Props {
  onPickRouteA: () => void; // SampleBook → 起点
  onPickRouteB: () => void; // 既存ドラフト → 起点
  onPickRouteC: () => void; // 白紙
  /** ルート B はドラフトが 0 件のときに無効化する */
  disableRouteB?: boolean;
}

export default function RouteSelector({ onPickRouteA, onPickRouteB, onPickRouteC, disableRouteB }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <RouteCard
        badge="A"
        icon={<BookOpenIcon className="w-6 h-6" />}
        title="サンプル帳から作成"
        description="過去サンプルをひな型に、別ブランドや別仕様にアレンジ"
        onClick={onPickRouteA}
      />
      <RouteCard
        badge="B"
        icon={<DocumentDuplicateIcon className="w-6 h-6" />}
        title="既存ドラフトを複製"
        description="先週作った仕様書の FW 版など、近い案件をベースに再作成"
        onClick={onPickRouteB}
        disabled={disableRouteB}
        disabledHint="まだドラフトがありません"
      />
      <RouteCard
        badge="C"
        icon={<SparklesIcon className="w-6 h-6" />}
        title="コンセプトから作成"
        description="新ブランドの初回提案や全く新しい型を白紙からスタート"
        onClick={onPickRouteC}
      />
    </div>
  );
}

function RouteCard({
  badge,
  icon,
  title,
  description,
  onClick,
  disabled,
  disabledHint,
}: {
  badge: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        disabled
          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
          : 'border-gray-200 bg-white hover:border-indigo-400 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-sm">
          {badge}
        </span>
        <span className="text-indigo-600">{icon}</span>
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      {disabled && disabledHint && (
        <p className="text-xs text-gray-400 mt-2">{disabledHint}</p>
      )}
    </button>
  );
}
