import { useMemo, useEffect } from 'react';
import { SparklesIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { SpecData } from '../types';
import { specJson } from '../data/spec';
import {
  getLabel,
  getColorHex,
  COLOR_HEX_MAP,
  SHAPE_LABELS_SHORT_JA,
  POSITION_LABELS_JA,
} from '../utils/specHelpers';
import { useToast } from './Toast';
import { useStep2Proposals } from '../hooks/useStep2Proposals';

interface Props {
  data: SpecData;
  updateData: (data: Partial<SpecData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2({ data, updateData, onNext, onBack }: Props) {
  const { showToast, ToastView } = useToast();
  const {
    proposals,
    currentProposalIndex,
    setCurrentProposalIndex,
    generateProposals,
    regenerateProposals,
    getProposalWarnings,
  } = useStep2Proposals(data, {
    onNoBaseAutoFill: () => showToast('推奨データが見つかりませんでした', 'error'),
    onRegenerated: () => showToast('再生成しました'),
    onRegenerateFailed: () => showToast('新しいパターンを生成できませんでした', 'error'),
  });

  const applyProposal = () => {
    if (!proposals) return;
    const proposal = proposals[currentProposalIndex];

    const colorNameJp = getLabel(specJson.parameters.body_color, proposal.bodyColor || '');
    const cCode = getColorHex(proposal.bodyColor);

    const newFabricParts = [
      { id: 'A', label: 'A', usage: '本体生地・縁巻き', material: getLabel(specJson.parameters.body_fabric, proposal.bodyFabric || ''), partNumber: '', quantity: '', colorName: colorNameJp, colorSwatch: cCode, threadNumber: '' },
      { id: 'B', label: 'B', usage: '本体生地・切替', material: '', partNumber: '', quantity: '', colorName: colorNameJp, colorSwatch: cCode, threadNumber: '' },
      { id: 'C', label: 'C', usage: '裏地', material: getLabel(specJson.parameters.lining, proposal.lining || ''), partNumber: '', quantity: '', colorName: 'ホワイト', colorSwatch: '#ffffff', threadNumber: '' },
      { id: 'D', label: 'D', usage: '留め具', material: getLabel(specJson.parameters.closure, proposal.closure || ''), partNumber: '', quantity: '1組', colorName: getLabel(specJson.parameters.hardware_finish, proposal.hardwareFinish || ''), colorSwatch: '#cccccc', threadNumber: '' },
    ];

    if (proposal.piping && proposal.piping !== 'なし' && proposal.piping !== 'none') {
      newFabricParts.push({ id: 'E', label: 'E', usage: 'パイピング', material: getLabel(specJson.parameters.piping, proposal.piping || ''), partNumber: '', quantity: '', colorName: colorNameJp, colorSwatch: cCode, threadNumber: '' });
    }

    const fLabel = newFabricParts.length === 4 ? 'E' : 'F';
    newFabricParts.push({ id: 'F', label: fLabel, usage: '刺繍・装飾', material: getLabel(specJson.parameters.embroidery, proposal.embroidery || ''), partNumber: '', quantity: '', colorName: '', colorSwatch: '#cccccc', threadNumber: '' });

    updateData({ ...proposal, colorCode: cCode, fabricParts: newFabricParts });
  };

  const fabricType = useMemo(() => {
    const fabric = specJson.parameters.body_fabric.options?.find((opt) => opt.value === data.bodyFabric);
    return fabric?.type || 'pu';
  }, [data.bodyFabric]);

  const textureOptions = useMemo(() => {
    return specJson.parameters.texture.options_by_fabric_type?.[fabricType] ?? [];
  }, [fabricType]);

  useEffect(() => {
    if (data.texture && !textureOptions.find((o) => o.value === data.texture)) {
      updateData({ texture: '' });
    }
  }, [fabricType, textureOptions, data.texture, updateData]);

  const ngWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (fabricType === 'knit' && (data.piping === 'pu_10' || data.piping === 'pu_15')) {
      warnings.push('縫製ストレスが発生します。ポリエステルテープ8mmを推奨');
    }
    if (data.bodyColor === 'white' && (data.hardwareFinish === 'gold' || data.hardwareFinish === 'black_nickel')) {
      warnings.push('ホワイト系本体×ゴールドまたは黒ニッケルはコントラスト過剰になる場合があります');
    }
    return warnings;
  }, [fabricType, data]);

  const canProceed =
    !!data.bodyFabric && !!data.lining && !!data.closure && !!data.embroidery && !!data.bodyColor && !!data.hardwareFinish;

  return (
    <div className="space-y-8 animate-fade-in fade-in pb-12">
      <ToastView />
      {/* AI Proposal Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-indigo-600" />
              AI組み合わせ提案
            </h3>
            <p className="text-sm text-indigo-700 mt-1">
              {SHAPE_LABELS_SHORT_JA[data.headShape]} × {POSITION_LABELS_JA[data.position]} の推奨パターンを提案します
            </p>
          </div>
          <button
            onClick={generateProposals}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded shadow transition-colors shrink-0"
          >
            提案を見る
          </button>
        </div>

        {proposals && proposals.length > 0 && (
          <div className="mt-6">
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x" role="radiogroup" aria-label="AI 提案リスト">
              {proposals.map((p, idx) => {
                const isSelected = currentProposalIndex === idx;
                const hasWarning = getProposalWarnings(p).length > 0;
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCurrentProposalIndex(idx)}
                    role="radio"
                    aria-checked={isSelected}
                    className={`text-left min-w-[260px] max-w-[280px] snap-center cursor-pointer border-2 rounded-lg p-4 relative transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-100' : 'border-gray-200 bg-white hover:border-indigo-300 transform scale-95 opacity-80 hover:opacity-100'}`}
                  >
                    <h4 className={`font-bold mb-3 ${isSelected ? 'text-indigo-800' : 'text-gray-600'}`}>
                      提案 {idx + 1} {isSelected && <span className="ml-2 text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">選択中</span>}
                    </h4>
                    {hasWarning && (
                      <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">⚠ NG</span>
                    )}
                    <div className="space-y-1 text-sm">
                      <div><span className="text-gray-500 inline-block w-12">本体:</span> <span className="font-medium text-gray-800">{getLabel(specJson.parameters.body_fabric, p.bodyFabric || '')}</span></div>
                      <div><span className="text-gray-500 inline-block w-12">裏地:</span> <span className="font-medium text-gray-800">{getLabel(specJson.parameters.lining, p.lining || '')}</span></div>
                      <div><span className="text-gray-500 inline-block w-12">開閉:</span> <span className="font-medium text-gray-800">{getLabel(specJson.parameters.closure, p.closure || '')}</span></div>
                      <div><span className="text-gray-500 inline-block w-12">刺繍:</span> <span className="font-medium text-gray-800">{getLabel(specJson.parameters.embroidery, p.embroidery || '')}</span></div>
                      <div><span className="text-gray-500 inline-block w-12">金具:</span> <span className="font-medium text-gray-800">{getLabel(specJson.parameters.hardware_finish, p.hardwareFinish || '')}</span></div>
                      <div><span className="text-gray-500 inline-block w-12">カラー:</span> <span className="font-medium text-gray-800">{getLabel(specJson.parameters.body_color, p.bodyColor || '')}</span></div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-4 mt-2 border-t border-indigo-200 pt-4 relative">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentProposalIndex(Math.max(0, currentProposalIndex - 1))}
                    disabled={currentProposalIndex === 0}
                    className="text-indigo-600 font-bold disabled:text-gray-400 hover:text-indigo-800 transition-colors"
                  >
                    ← 前の提案
                  </button>
                  <span className="text-xs text-indigo-800 font-bold bg-indigo-100 px-3 py-1 rounded-full">
                    {currentProposalIndex + 1} / {proposals.length}
                  </span>
                  <button
                    onClick={() => setCurrentProposalIndex(Math.min(proposals.length - 1, currentProposalIndex + 1))}
                    disabled={currentProposalIndex === proposals.length - 1}
                    className="text-indigo-600 font-bold disabled:text-gray-400 hover:text-indigo-800 transition-colors"
                  >
                    次の提案 →
                  </button>
                </div>
                <button
                  onClick={applyProposal}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full shadow transition-transform transform hover:scale-105"
                >
                  この提案を適用する
                </button>
              </div>

              <div className="flex justify-start">
                <button
                  onClick={regenerateProposals}
                  className="flex items-center justify-center font-bold outline-none uppercase tracking-wide cursor-pointer transition-colors border border-[#2E75B6] text-[#2E75B6] bg-white rounded-[6px] px-[16px] py-[8px] hover:bg-[#EDF4FB]"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" /> 別のパターンを再生成する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NG Warnings for current form state */}
      {ngWarnings.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">仕様の見直しを推奨します</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {ngWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

        <div className="space-y-4">
          <h4 className="font-bold text-gray-800 border-b pb-2">■ 生地・素材</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">本体生地</label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 p-2 border"
              value={data.bodyFabric}
              onChange={(e) => updateData({ bodyFabric: e.target.value })}
            >
              <option value="">選択してください</option>
              {specJson.parameters.body_fabric.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">テクスチャー</label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 p-2 border"
              value={data.texture}
              onChange={(e) => updateData({ texture: e.target.value })}
            >
              <option value="">選択してください</option>
              {textureOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">裏地</label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 p-2 border"
              value={data.lining}
              onChange={(e) => updateData({ lining: e.target.value })}
            >
              <option value="">選択してください</option>
              {specJson.parameters.lining.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パイピング</label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 p-2 border"
              value={data.piping}
              onChange={(e) => updateData({ piping: e.target.value })}
            >
              <option value="">選択してください</option>
              {specJson.parameters.piping.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-gray-800 border-b pb-2">■ 開閉・留め具</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開閉・留め具方式</label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 p-2 border"
              value={data.closure}
              onChange={(e) => updateData({ closure: e.target.value })}
            >
              <option value="">選択してください</option>
              {specJson.parameters.closure.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-gray-800 border-b pb-2">■ 刺繍・装飾</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主刺繍技法</label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 p-2 border"
              value={data.embroidery}
              onChange={(e) => updateData({ embroidery: e.target.value })}
            >
              <option value="">選択してください</option>
              {specJson.parameters.embroidery.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-gray-800 border-b pb-2">■ カラー指示</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">本体カラー</label>
            <div className="relative">
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 p-2 border pl-10"
                value={data.bodyColor}
                onChange={(e) => updateData({ bodyColor: e.target.value })}
              >
                <option value="">選択してください</option>
                {specJson.parameters.body_color.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {data.bodyColor && COLOR_HEX_MAP[data.bodyColor] && (
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                  style={{ backgroundColor: COLOR_HEX_MAP[data.bodyColor] }}
                ></span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カラーコード</label>
            <input
              type="text"
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 p-2 border"
              value={data.colorCode}
              onChange={(e) => updateData({ colorCode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((label) => (
              <div key={label}>
                <label className="block text-xs text-gray-500">部位{label}</label>
                <input
                  type="text"
                  className="w-full border p-1 text-sm rounded"
                  value={data.fabricParts?.find((p) => p.id === label || p.label === label)?.colorName || ''}
                  onChange={(e) => {
                    const parts = [...(data.fabricParts || [])];
                    const idx = parts.findIndex((p) => p.id === label || p.label === label);
                    if (idx >= 0) parts[idx] = { ...parts[idx], colorName: e.target.value };
                    else parts.push({ id: label, label, usage: '', material: '', partNumber: '', quantity: '', colorName: e.target.value, colorSwatch: '#ccc', threadNumber: '' });
                    updateData({ fabricParts: parts });
                  }}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">金具仕上げ</label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 p-2 border"
              value={data.hardwareFinish}
              onChange={(e) => updateData({ hardwareFinish: e.target.value })}
            >
              <option value="">選択してください</option>
              {specJson.parameters.hardware_finish.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t flex justify-between mt-8">
        <button
          onClick={onBack}
          className="bg-white border text-gray-700 hover:bg-gray-50 font-bold py-3 px-8 rounded-lg shadow-sm transition-colors"
        >
          ← 戻る
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          STEP3へ進む →
        </button>
      </div>
    </div>
  );
}
