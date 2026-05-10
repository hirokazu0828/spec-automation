import { useEffect, useMemo, useRef, useState } from 'react';
import { CpuChipIcon, SparklesIcon, ArrowPathIcon, TrashIcon, ArrowUpTrayIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import type { SpecData, TemplateAngle } from '../../types';
import { useToast } from '../Toast';
import { buildImagePrompt } from './buildImagePrompt';
import { generateImage, generateImagesForAllAngles, fetchAsBase64 } from './generateImage';
import {
  saveImage,
  loadAllAngleImages,
  saveAngleImage,
  deleteAngleImage,
  deleteImage,
} from '../../lib/imageStore';
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

// Layer 3b-fix-step3-improvements: cost approximations for the confirm modals.
// Numbers reflect the *current default* model (gpt-image-1, medium 1024x1024
// ≈ $0.042 / image ≈ ¥6 / image at 1 USD ≈ ¥150). When/if the server-side
// default flips to gpt-image-2, update these via the buttons below — see
// docs/layer3b-step3-improvements-decisions.md §future-work.
const BULK_COST_LABEL = '約 25 円';
const SINGLE_COST_LABEL = '約 6 円';

export default function Step3({ data, updateData, draftId, onNext, onBack }: Props) {
  const { showToast, ToastView } = useToast();
  const [generatedByAngle, setGeneratedByAngle] = useState<Partial<Record<TemplateAngle, string>>>({});
  const [bulkInFlight, setBulkInFlight] = useState(false);
  const [perAngleInFlight, setPerAngleInFlight] = useState<Partial<Record<TemplateAngle, boolean>>>({});
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

  const activeAngle: TemplateAngle =
    data.selectedAngle && template && hasAngle(template, data.selectedAngle)
      ? data.selectedAngle
      : (availableAngles[0] ?? 'front');

  const lineartSrcForAngle = (angle: TemplateAngle): string => {
    return (
      template?.baseImages[angle] ??
      FALLBACK_LINEART_PATH[data.headShape] ??
      ''
    );
  };
  const activeLineartSrc = lineartSrcForAngle(activeAngle);

  const promptPreview = buildImagePrompt(data, template ? activeAngle : undefined);

  // On mount, hydrate per-angle generated images from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    loadAllAngleImages(draftId).then((map) => {
      if (cancelled) return;
      setGeneratedByAngle(map);
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

  // Helper: prepare GenerateImageOptions for a single angle. Resolves the
  // line-art source (PNG when complete, SVG fallback when pending), reads it
  // as base64, and pairs it with a per-angle prompt.
  const buildOptsForAngle = async (angle: TemplateAngle) => {
    const src = lineartSrcForAngle(angle);
    if (!src) throw new Error(`線図テンプレートが見つかりません (${angle})`);
    const base64 = await fetchAsBase64(src);
    return {
      prompt: buildImagePrompt(data, template ? angle : undefined),
      imageBase64: base64,
    };
  };

  const handleBulkGenerate = async () => {
    if (!template) {
      showToast('テンプレートが未選択です', 'error');
      return;
    }
    if (isPendingLineart) {
      showToast('線画準備中の型では一括生成は使えません', 'error');
      return;
    }
    if (availableAngles.length === 0) {
      showToast('利用可能なアングルがありません', 'error');
      return;
    }
    const ok = window.confirm(`OpenAI で 4 アングル分の画像を生成します（1 セット${BULK_COST_LABEL}）。よろしいですか？`);
    if (!ok) return;
    setBulkInFlight(true);
    try {
      const results = await generateImagesForAllAngles(buildOptsForAngle, availableAngles);
      const next = { ...generatedByAngle };
      const errors: string[] = [];
      for (const r of results) {
        if (r.ok) {
          next[r.angle] = r.dataUrl;
          await saveAngleImage(draftId, r.angle, r.dataUrl);
        } else {
          errors.push(`${ANGLE_DISPLAY_NAMES[r.angle]}: ${r.error}`);
        }
      }
      setGeneratedByAngle(next);
      // Mirror front into the legacy single-key store for Step4's auto-fill
      // path and update the imageSource badge.
      if (next.front) {
        await saveImage(draftId, next.front);
      }
      const updates: Partial<SpecData> = { imageSource: 'generated' };
      if (insertToSheet) {
        // Map angles → existing 3 productPhotos slots (正面/側面/背面). The
        // 4th angle (side_heel) lives only in IndexedDB so the existing PDF
        // page-2 layout (3 slots) is preserved without Step4 改修.
        const ANGLE_TO_PHOTO_INDEX: Partial<Record<TemplateAngle, number>> = {
          front: 0,
          side_toe: 1,
          back: 2,
        };
        updates.productPhotos = data.productPhotos.map((p, i) => {
          const matchedAngle = (Object.keys(ANGLE_TO_PHOTO_INDEX) as TemplateAngle[])
            .find((a) => ANGLE_TO_PHOTO_INDEX[a] === i);
          if (matchedAngle && next[matchedAngle]) {
            return { ...p, dataUrl: next[matchedAngle]! };
          }
          return p;
        });
      }
      updateData(updates);
      if (errors.length === 0) {
        showToast(`${results.length} 枚の画像を生成しました`);
      } else {
        showToast(`${results.length - errors.length}/${results.length} 枚生成: ${errors.join(' / ')}`, 'error');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : '通信エラー', 'error');
    } finally {
      setBulkInFlight(false);
    }
  };

  const handleRegenerateOne = async (angle: TemplateAngle) => {
    if (!template) return;
    if (!hasAngle(template, angle) && !(isPendingLineart && angle === 'front')) {
      showToast('このアングルは利用できません', 'error');
      return;
    }
    const ok = window.confirm(`${ANGLE_DISPLAY_NAMES[angle]} を 1 アングル再生成します（${SINGLE_COST_LABEL}）。よろしいですか？`);
    if (!ok) return;
    setPerAngleInFlight((s) => ({ ...s, [angle]: true }));
    try {
      const opts = await buildOptsForAngle(angle);
      const r = await generateImage(opts);
      if (!r.ok) {
        showToast(`${ANGLE_DISPLAY_NAMES[angle]} の生成に失敗しました: ${r.error}`, 'error');
        return;
      }
      setGeneratedByAngle((s) => ({ ...s, [angle]: r.dataUrl }));
      await saveAngleImage(draftId, angle, r.dataUrl);
      if (angle === 'front') await saveImage(draftId, r.dataUrl);
      const updates: Partial<SpecData> = { imageSource: 'generated' };
      if (insertToSheet) {
        const ANGLE_TO_PHOTO_INDEX: Partial<Record<TemplateAngle, number>> = {
          front: 0,
          side_toe: 1,
          back: 2,
        };
        const idx = ANGLE_TO_PHOTO_INDEX[angle];
        if (idx !== undefined) {
          updates.productPhotos = data.productPhotos.map((p, i) =>
            i === idx ? { ...p, dataUrl: r.dataUrl } : p,
          );
        }
      }
      updateData(updates);
      showToast(`${ANGLE_DISPLAY_NAMES[angle]} を再生成しました`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '通信エラー', 'error');
    } finally {
      setPerAngleInFlight((s) => ({ ...s, [angle]: false }));
    }
  };

  const handleDiscardAll = async () => {
    if (Object.keys(generatedByAngle).length === 0) return;
    setGeneratedByAngle({});
    await deleteImage(draftId);
    updateData({ imageSource: undefined });
    showToast('生成画像をすべて破棄しました');
  };

  const handleDiscardOne = async (angle: TemplateAngle) => {
    if (!generatedByAngle[angle]) return;
    setGeneratedByAngle((s) => {
      const next = { ...s };
      delete next[angle];
      return next;
    });
    await deleteAngleImage(draftId, angle);
    showToast(`${ANGLE_DISPLAY_NAMES[angle]} を破棄しました`);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      // Uploads target the currently selected angle (or front if none).
      const targetAngle = activeAngle;
      setGeneratedByAngle((s) => ({ ...s, [targetAngle]: dataUrl }));
      await saveAngleImage(draftId, targetAngle, dataUrl);
      if (targetAngle === 'front') await saveImage(draftId, dataUrl);
      const nextSource = deriveUploadSource(data.documentType);
      const updates: Partial<SpecData> = { imageSource: nextSource };
      if (insertToSheet && targetAngle === 'front') {
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

  const generatedCount = Object.keys(generatedByAngle).length;
  const bulkDisabled = !template || isPendingLineart || bulkInFlight;

  return (
    <div className="space-y-8 animate-fade-in fade-in">
      <ToastView />

      <div className="text-center">
        <CpuChipIcon className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AIデザイン画像生成</h2>
        <p className="text-gray-600">
          型を選んで 4 アングルを一括生成、必要なアングルだけ再生成できます。
        </p>
      </div>

      {/* テンプレート選択 + アングルタブ (UI 上段は Layer 3a と同じ構造) */}
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

      {/* 線図テンプレート (選択中アングル) — Layer 3a の左ペインから引き継ぎ */}
      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-gray-700 text-sm">線図テンプレート</h3>
          <span className="text-xs text-gray-500">
            {template ? `${template.displayName} / ${ANGLE_DISPLAY_NAMES[activeAngle]}` : '(未設定)'}
          </span>
        </div>
        <div className="aspect-video flex items-center justify-center bg-white p-4">
          {activeLineartSrc ? (
            <img
              src={activeLineartSrc}
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

      {/* 4 アングル一括プレビュー (Layer 3b-fix-step3-improvements) */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 className="font-bold text-gray-900 text-sm">生成結果（4 アングル）</h3>
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
            {generatedCount > 0 && (
              <button
                onClick={handleDiscardAll}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
              >
                <TrashIcon className="w-3 h-3" /> すべて破棄
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALL_ANGLES.map((angle) => {
            const dataUrl = generatedByAngle[angle];
            const enabled = template
              ? isPendingLineart
                ? angle === 'front'
                : hasAngle(template, angle)
              : false;
            const inFlight = bulkInFlight || perAngleInFlight[angle];
            return (
              <div
                key={angle}
                aria-label={`${ANGLE_DISPLAY_NAMES[angle]} タイル`}
                className={`relative bg-white border-2 rounded-xl overflow-hidden shadow-sm ${
                  enabled ? 'border-indigo-100' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="bg-indigo-50 px-2 py-1.5 border-b border-indigo-100 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-indigo-900">
                    {ANGLE_DISPLAY_NAMES[angle]}
                  </span>
                  {dataUrl && (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" aria-label="生成済み" />
                  )}
                </div>
                <div className="aspect-square flex items-center justify-center bg-white p-2">
                  {dataUrl ? (
                    <img
                      src={dataUrl}
                      alt={`${ANGLE_DISPLAY_NAMES[angle]} 生成画像`}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : enabled ? (
                    <p className="text-gray-400 text-[11px] text-center px-1">未生成</p>
                  ) : (
                    <p className="text-gray-400 text-[11px] text-center px-1">—</p>
                  )}
                  {inFlight && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <ArrowPathIcon className="w-6 h-6 text-indigo-600 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="px-2 py-1.5 border-t border-gray-100 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => handleRegenerateOne(angle)}
                    disabled={!enabled || inFlight}
                    aria-label={`${ANGLE_DISPLAY_NAMES[angle]} を再生成`}
                    className="flex-1 min-h-[36px] inline-flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowPathIcon className="w-3 h-3" />
                    {dataUrl ? '再生成' : '生成'}
                  </button>
                  {dataUrl && (
                    <button
                      type="button"
                      onClick={() => handleDiscardOne(angle)}
                      aria-label={`${ANGLE_DISPLAY_NAMES[angle]} を破棄`}
                      className="min-h-[36px] inline-flex items-center justify-center text-red-600 hover:text-red-800 px-1"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-lg p-5 border border-blue-100">
        <h4 className="font-bold text-blue-900 mb-2 text-sm">
          使用するプロンプト (英語、{ANGLE_DISPLAY_NAMES[activeAngle]})
        </h4>
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
          画像を STEP4 の写真スロット (正面/側面/背面) に挿入する
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
            disabled={bulkInFlight}
            className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowUpTrayIcon className="w-4 h-4" /> アップロード
          </button>
          <button
            onClick={handleBulkGenerate}
            disabled={bulkDisabled}
            aria-label="4 アングル一括生成"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {bulkInFlight ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" /> 一括生成中...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" /> 4 アングル一括生成
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
