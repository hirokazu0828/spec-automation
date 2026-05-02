import { ArrowPathIcon } from '@heroicons/react/24/outline';
import type { SpecData } from '../../types';
import { specJson } from '../../data/spec';
import { getLabel } from '../../utils/specHelpers';

interface Props {
  proposals: Partial<SpecData>[];
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  onApply: () => void;
  onRegenerate: () => void;
  getProposalWarnings: (p: Partial<SpecData>) => string[];
}

export default function ProposalDeck({
  proposals,
  currentIndex,
  setCurrentIndex,
  onApply,
  onRegenerate,
  getProposalWarnings,
}: Props) {
  return (
    <div className="mt-6">
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x" role="radiogroup" aria-label="AI 提案リスト">
        {proposals.map((p, idx) => {
          const isSelected = currentIndex === idx;
          const hasWarning = getProposalWarnings(p).length > 0;
          return (
            <button
              type="button"
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              role="radio"
              aria-checked={isSelected}
              className={`text-left min-w-[260px] max-w-[280px] snap-center cursor-pointer border-2 rounded-lg p-4 relative transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-100'
                  : 'border-gray-200 bg-white hover:border-indigo-300 transform scale-95 opacity-80 hover:opacity-100'
              }`}
            >
              <h4 className={`font-bold mb-3 ${isSelected ? 'text-indigo-800' : 'text-gray-600'}`}>
                提案 {idx + 1}{' '}
                {isSelected && (
                  <span className="ml-2 text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">選択中</span>
                )}
              </h4>
              {hasWarning && (
                <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                  ⚠ NG
                </span>
              )}
              <div className="space-y-1 text-sm">
                <Row label="本体" value={getLabel(specJson.parameters.body_fabric, p.bodyFabric || '')} />
                <Row label="裏地" value={getLabel(specJson.parameters.lining, p.lining || '')} />
                <Row label="開閉" value={getLabel(specJson.parameters.closure, p.closure || '')} />
                <Row label="刺繍" value={getLabel(specJson.parameters.embroidery, p.embroidery || '')} />
                <Row label="金具" value={getLabel(specJson.parameters.hardware_finish, p.hardwareFinish || '')} />
                <Row label="カラー" value={getLabel(specJson.parameters.body_color, p.bodyColor || '')} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-4 mt-2 border-t border-indigo-200 pt-4 relative">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="text-indigo-600 font-bold disabled:text-gray-400 hover:text-indigo-800 transition-colors"
            >
              ← 前の提案
            </button>
            <span className="text-xs text-indigo-800 font-bold bg-indigo-100 px-3 py-1 rounded-full">
              {currentIndex + 1} / {proposals.length}
            </span>
            <button
              onClick={() => setCurrentIndex(Math.min(proposals.length - 1, currentIndex + 1))}
              disabled={currentIndex === proposals.length - 1}
              className="text-indigo-600 font-bold disabled:text-gray-400 hover:text-indigo-800 transition-colors"
            >
              次の提案 →
            </button>
          </div>
          <button
            onClick={onApply}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full shadow transition-transform transform hover:scale-105"
          >
            この提案を適用する
          </button>
        </div>

        <div className="flex justify-start">
          <button
            onClick={onRegenerate}
            className="flex items-center justify-center font-bold outline-none uppercase tracking-wide cursor-pointer transition-colors border border-[#2E75B6] text-[#2E75B6] bg-white rounded-[6px] px-[16px] py-[8px] hover:bg-[#EDF4FB]"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" /> 別のパターンを再生成する
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500 inline-block w-12">{label}:</span>{' '}
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
