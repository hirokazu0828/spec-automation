import { useEffect, useState } from 'react';
import { CpuChipIcon, SparklesIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { SpecData } from '../../types';
import { useToast } from '../Toast';
import { buildImagePrompt } from './buildImagePrompt';
import { generateImage, fetchAsBase64 } from './generateImage';
import { saveImage, loadImage, deleteImage } from '../../lib/imageStore';

interface Props {
  data: SpecData;
  updateData: (updates: Partial<SpecData>) => void;
  draftId: string;
  onNext: () => void;
  onBack: () => void;
}

const LINEART_PATH: Record<string, string> = {
  pin: '/lineart/pin.svg',
  mallet: '/lineart/mallet.svg',
  neo_mallet: '/lineart/neo_mallet.svg',
};

export default function Step3({ data, updateData, draftId, onNext, onBack }: Props) {
  const { showToast, ToastView } = useToast();
  const [generated, setGenerated] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [insertToSheet, setInsertToSheet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadImage(draftId).then((url) => {
      if (!cancelled) setGenerated(url);
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const lineartSrc = LINEART_PATH[data.headShape] ?? '';
  const promptPreview = buildImagePrompt(data);

  const handleGenerate = async () => {
    if (!lineartSrc) {
      showToast('ヘッド形状が未設定のため線図を読み込めません', 'error');
      return;
    }
    const ok = window.confirm('OpenAI で画像を生成します（数十円程度）。よろしいですか？');
    if (!ok) return;
    setIsGenerating(true);
    try {
      const base64 = await fetchAsBase64(lineartSrc);
      const result = await generateImage({ prompt: promptPreview, imageBase64: base64 });
      if (!result.ok) {
        showToast(`生成に失敗しました: ${result.error}`, 'error');
        return;
      }
      setGenerated(result.dataUrl);
      await saveImage(draftId, result.dataUrl);
      if (insertToSheet) {
        const photos = data.productPhotos.map((p, i) => (i === 0 ? { ...p, dataUrl: result.dataUrl } : p));
        updateData({ productPhotos: photos });
      }
      showToast('画像を生成しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '通信エラー', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDiscard = async () => {
    if (!generated) return;
    setGenerated(null);
    await deleteImage(draftId);
    showToast('生成画像を破棄しました');
  };

  return (
    <div className="space-y-8 animate-fade-in fade-in">
      <ToastView />

      <div className="text-center">
        <CpuChipIcon className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AIデザイン画像生成</h2>
        <p className="text-gray-600">
          線図シルエットを土台に、STEP2 の素材・色・刺繍指示を踏まえてアプリ内で画像を生成します。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 text-sm">線図テンプレート</h3>
            <span className="text-xs text-gray-500">{data.headShape || '(未設定)'}</span>
          </div>
          <div className="aspect-square flex items-center justify-center bg-white p-4">
            {lineartSrc ? (
              <img
                src={lineartSrc}
                alt={`${data.headShape} 線図`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.3';
                }}
              />
            ) : (
              <p className="text-gray-400 text-sm">STEP1 でヘッド形状を選択してください。</p>
            )}
          </div>
        </div>

        <div className="bg-white border-2 border-indigo-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-200 flex justify-between items-center">
            <h3 className="font-bold text-indigo-900 text-sm">生成結果</h3>
            {generated && (
              <button
                onClick={handleDiscard}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
              >
                <TrashIcon className="w-3 h-3" /> 破棄
              </button>
            )}
          </div>
          <div className="aspect-square flex items-center justify-center bg-white p-4">
            {generated ? (
              <img src={generated} alt="生成された製品画像" className="max-w-full max-h-full object-contain" />
            ) : (
              <p className="text-gray-400 text-sm text-center">
                右下の「画像を生成」を押すとここに結果が表示されます。
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-lg p-5 border border-blue-100">
        <h4 className="font-bold text-blue-900 mb-2 text-sm">使用するプロンプト (英語)</h4>
        <p className="text-blue-800 text-sm font-mono leading-relaxed break-words">{promptPreview}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={insertToSheet}
            onChange={(e) => setInsertToSheet(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
          />
          生成画像を STEP4 の正面写真スロット (p1) に挿入する
        </label>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !lineartSrc}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" /> 生成中...
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4" /> {generated ? '再生成' : '画像を生成'}
            </>
          )}
        </button>
      </div>

      <div className="pt-6 border-t flex justify-between">
        <button
          onClick={onBack}
          className="bg-white border text-gray-700 hover:bg-gray-50 font-bold py-3 px-8 rounded-lg shadow-sm transition-colors"
        >
          ← 戻る
        </button>
        <button
          onClick={onNext}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow transition-colors"
        >
          STEP4へ進む →
        </button>
      </div>
    </div>
  );
}
