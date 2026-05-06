import { useState } from 'react';
import { BookOpenIcon, DocumentDuplicateIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { DocumentType } from '../../types';

interface Props {
  /** Route A: just open SampleBook in pick mode; docType is chosen in the sample detail modal. */
  onPickRouteA: () => void;
  /** Route B: just open the draft picker modal; docType is chosen there. */
  onPickRouteB: () => void;
  /** Route C: docType is chosen on the card, then this callback fires. */
  onPickRouteC: (documentType: DocumentType) => void;
  /** ルート B はドラフトが 0 件のときに無効化する */
  disableRouteB?: boolean;
}

export default function RouteSelector({ onPickRouteA, onPickRouteB, onPickRouteC, disableRouteB }: Props) {
  const [routeCDocType, setRouteCDocType] = useState<DocumentType>('sample');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <RouteCardSimple
        badge="A"
        icon={<BookOpenIcon className="w-6 h-6" />}
        title="サンプル帳から作成"
        description="過去サンプルをひな型に、別ブランドや別仕様にアレンジ"
        onClick={onPickRouteA}
      />
      <RouteCardSimple
        badge="B"
        icon={<DocumentDuplicateIcon className="w-6 h-6" />}
        title="既存ドラフトを複製"
        description="先週作った仕様書の FW 版など、近い案件をベースに再作成"
        onClick={onPickRouteB}
        disabled={disableRouteB}
        disabledHint="まだドラフトがありません"
      />
      <RouteCardC
        docType={routeCDocType}
        onChangeDocType={setRouteCDocType}
        onSubmit={() => onPickRouteC(routeCDocType)}
      />
    </div>
  );
}

function RouteCardSimple({
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

function RouteCardC({
  docType,
  onChangeDocType,
  onSubmit,
}: {
  docType: DocumentType;
  onChangeDocType: (next: DocumentType) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="text-left p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-sm">
          C
        </span>
        <span className="text-indigo-600"><SparklesIcon className="w-6 h-6" /></span>
        <h3 className="font-bold text-gray-900">コンセプトから作成</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">
        新ブランドの初回提案や全く新しい型を白紙からスタート
      </p>
      <fieldset className="text-sm space-y-1.5 mb-3">
        <legend className="text-xs font-bold text-gray-500 mb-1">出力タイプ</legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="route-c-doctype"
            value="sample"
            checked={docType === 'sample'}
            onChange={() => onChangeDocType('sample')}
            className="text-indigo-600"
          />
          <span>サンプル指示書</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="route-c-doctype"
            value="final"
            checked={docType === 'final'}
            onChange={() => onChangeDocType('final')}
            className="text-indigo-600"
          />
          <span>最終仕様書</span>
        </label>
      </fieldset>
      <button
        type="button"
        onClick={onSubmit}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg shadow-sm"
      >
        作成
      </button>
    </div>
  );
}
