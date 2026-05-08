import { useEffect, useMemo, useRef, useState } from 'react';
import { CpuChipIcon, SparklesIcon, ArrowPathIcon, TrashIcon, ArrowUpTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { SpecData, TemplateAngle } from '../../types';
import { useToast } from '../Toast';
import { buildImagePrompt } from './buildImagePrompt';
import { generateImage, fetchAsBase64 } from './generateImage';
import { saveImage, loadImage, deleteImage } from '../../lib/imageStore';
import { deriveUploadSource, imageSourceLabel, readFileAsDataUrl } from './imageSource';
import {
  ALL_ANGLES,
  ANGLE_DISPLAY_NAMES,
  getAllTemplates,
  getAvailableAngles,
  getTemplateByHeadShape,
  getTemplateById,
  hasAngle,
} from '../../data/templates/helpers';
import type { TemplateEntry } from '../../data/templates/types';

interface Props {
  data: SpecData;
  updateData: (updates: Partial<SpecData>) => void;
  draftId: string;
  onNext: () => void;
  onBack: () => void;
}

const FALLBACK_LINEART_PATH: Record<string, string> = {
  pin: '/lineart/pin.svg',
  mallet: '/lineart/mallet.svg',
  neo_mallet: '/lineart/neo_mallet.svg',
};

export default function Step3({ data, updateData, draftId, onNext, onBack }: Props) {
  const { showToast, ToastView } = useToast();
  const [generated, setGenerated] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [insertToSheet, setInsertToSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTemplates = useMemo(() => getAllTemplates(), []);
  const headShapeFallback = useMemo(
    () => getTemplateByHeadShape(data.headShape),
    [data.headShape],
  );
  const template: TemplateEntry | undefined = data.templateId
    ? getTemplateById(data.templateId)
    : headShapeFallback;
  const availableAngles = useMemo(
    () => (template ? getAvailableAngles(template) : []),
    [template],
  );
  const isPendingLineart = template?.metadata.lineArtStatus === 'pending_lineart';

  // The angle to render. We never render a stored angle that the current
  // template doesn't have — so picking a pending template after using
  // 'side_toe' on blade still shows a valid (front) image.
  const activeAngle: TemplateAngle =
    data.selectedAngle && template && hasAngle(template, data.selectedAngle)
      ? data.selectedAngle
      : (availableAngles[0] ?? 'front');

  const lineartSrc = template?.baseImages[activeAngle]
    ?? FALLBACK_LINEART_PATH[data.headShape]
    ?? '';
  const promptPreview = buildImagePrompt(data, template ? activeAngle : undefined);

  useEffect(() => {
    let cancelled = false;
    loadImage(draftId).then((url) => {
      if (!cancelled) setGenerated(url);
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const sourceLabel = imageSourceLabel(data.imageSource);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value || undefined;
    updateData({ templateId: nextId, selectedAngle: undefined });
  };

  const handleAngleChange = (angle: TemplateAngle) => {
    updateData({ selectedAngle: angle });
  };

  const handleGenerate = async () => {
    if (!lineartSrc) {
      showToast('テンプレートが未選択のため線図を読み込めません', 'error');
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
      const updates: Partial<SpecData> = { imageSource: 'generated' };
      if (insertToSheet) {
        updates.productPhotos = data.productPhotos.map((p, i) => (i === 0 ? { ...p, dataUrl: result.dataUrl } : p));
      }
      updateData(updates);
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
    updateData({ imageSource: undefined });
    showToast('生成画像を破棄しました');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setGenerated(dataUrl);
      await saveImage(draftId, dataUrl);
      const nextSource = deriveUploadSource(data.documentType);
      const updates: Partial<SpecData> = { imageSource: nextSource };
      if (insertToSheet) {
        updates.productPhotos = data.productPhotos.map((p, i) =>
          i === 0 ? { ...p, dataUrl } : p,
        );
      }
      updateData(updates);
      showToast(
        nextSource === 'photo' ? '実物写真として登録しました' : '画像をアップロードしました',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'アップロードに失敗', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleSwitchToBlade = () => {
    updateData({ templateId: 'putter-blade', selectedAngle: 'front' });
    showToast('ブレード型テンプレートに切り替えました');
  };

  return (
    <div className="space-y-8 animate-fade-in fade-in">
      <ToastView />

      <div className="text-center">
        <CpuChipIcon className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AIデザイン画像生成</h2>
        <p className="text-gray-600">
          型を選んでアングルを切り替え、STEP2 の素材・色・刺繍指示を踏まえてアプリ内で画像を生成します。
        </p>
      </div>

      {/* テンプレート選択 + アングルタブ */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-bold text-gray-700 sm:w-32 shrink-0" htmlFor="template-select">
            型テンプレート
          </label>
          <select
            id="template-select"
            value={template?.id ?? ''}
            onChange={handleTemplateChange}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">（自動: STEP1 のヘッド形状）</option>
            {allTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
                {t.metadata.lineArtStatus === 'pending_lineart' ? '（線画準備中）' : ''}
              </option>
            ))}
          </select>
        </div>

        {isPendingLineart && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-bold text-amber-900">線画準備中</p>
              <p className="text-amber-800 mt-1">
                {template?.displayName}
                の線画は Phase B で整備予定です。今は前面アングルのみ利用でき、表示中の線図は SVG フォールバックです。
              </p>
              <button
                onClick={handleSwitchToBlade}
                className="mt-2 inline-flex items-center text-xs font-bold text-amber-900 underline hover:text-amber-700 min-h-[44px] sm:min-h-0"
              >
                ブレード型に切り替える
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-bold text-gray-700 sm:w-32 shrink-0">アングル</span>
          <div className="flex flex-wrap gap-2">
            {ALL_ANGLES.map((angle) => {
              // Pending templates only let the user pick `front` (the SVG
              // fallback covers it); a complete template enables every angle
              // it actually has a PNG for.
              const enabled = template
                ? isPendingLineart
                  ? angle === 'front'
                  : hasAngle(template, angle)
                : angle === 'front';
              const selected = activeAngle === angle;
              return (
                <button
                  key={angle}
                  type="button"
                  onClick={() => handleAngleChange(angle)}
                  disabled={!enabled}
                  aria-pressed={selected}
                  className={`min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : enabled
                        ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {ANGLE_DISPLAY_NAMES[angle]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 text-sm">線図テンプレート</h3>
            <span className="text-xs text-gray-500">
              {template ? `${template.displayName} / ${ANGLE_DISPLAY_NAMES[activeAngle]}` : '(未設定)'}
            </span>
          </div>
          <div className="aspect-square flex items-center justify-center bg-white p-4">
            {lineartSrc ? (
              <img
                src={lineartSrc}
                alt={`${template?.displayName ?? data.headShape} ${ANGLE_DISPLAY_NAMES[activeAngle]} 線図`}
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
          <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-200 flex justify-between items-center gap-2">
            <h3 className="font-bold text-indigo-900 text-sm">生成結果</h3>
            <div className="flex items-center gap-2">
              {sourceLabel && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    data.imageSource === 'generated'
                      ? 'bg-purple-100 text-purple-700'
                      : data.imageSource === 'photo'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}
                  title={`画像ソース: ${sourceLabel}`}
                >
                  {sourceLabel}
                </span>
              )}
              {generated && (
                <button
                  onClick={handleDiscard}
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="w-3 h-3" /> 破棄
                </button>
              )}
            </div>
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
          画像を STEP4 の正面写真スロット (p1) に挿入する
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="画像ファイルを選択"
          />
          <button
            onClick={handleUploadClick}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowUpTrayIcon className="w-4 h-4" /> アップロード
          </button>
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
                <SparklesIcon className="w-4 h-4" /> {generated ? '再生成' : 'AI生成'}
              </>
            )}
          </button>
        </div>
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
