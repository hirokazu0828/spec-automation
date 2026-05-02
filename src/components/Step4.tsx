import { useEffect } from 'react';
import { PrinterIcon, ArrowPathIcon, ArrowLeftIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { SpecData } from '../types';
import { specJson } from '../data/spec';
import {
  getLabel,
  SHAPE_LABELS_JA,
  POSITION_LABELS_JA,
} from '../utils/specHelpers';
import { useToast } from './Toast';
import { buildFabricParts } from './Step2/applyProposal';
import { loadImage } from '../lib/imageStore';

interface Props {
  data: SpecData;
  updateData: (updates: Partial<SpecData>) => void;
  draftId: string;
  onReset: () => void;
  onBack: () => void;
}

const colLabel = (index: number) => String.fromCharCode(65 + index);

function PrintHeader({ data, pageNum, totalPages }: { data: SpecData; pageNum: number; totalPages: number }) {
  return (
    <div className="mb-[20px]">
      <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
        <tbody>
          <tr className="text-[10px] text-[#666] bg-[#f5f5f5] h-[20px] print-bg-f5">
            <th rowSpan={2} className="w-[120px] bg-[#cc0000] text-white text-[12px] font-bold border-2 border-[#333] p-[8px_12px] align-middle print-bg-red">最終仕様書</th>
            <th className="w-[160px] font-normal border-2 border-[#333] p-[8px_12px] align-middle">客人名</th>
            <th className="font-normal border-2 border-[#333] p-[8px_12px] align-middle" style={{ width: 'auto' }}>品番 / 製品名</th>
            <th className="w-[100px] font-normal border-2 border-[#333] p-[8px_12px] align-middle">発行日</th>
            <th className="w-[120px] font-normal border-2 border-[#333] p-[8px_12px] align-middle">氏名</th>
          </tr>
          <tr className="text-[13px] font-bold h-[28px]">
            <td className="text-center border-2 border-[#333] p-[8px_12px] align-middle">{data.brandName || ' '}</td>
            <td className="text-center border-2 border-[#333] p-[8px_12px] align-middle">
              {data.productCode || ' '} {data.bodyColor ? `(${getLabel(specJson.parameters.body_color, data.bodyColor)})` : ''}
            </td>
            <td className="text-center border-2 border-[#333] p-[8px_12px] align-middle">{data.issueDate || ' '}</td>
            <td className="text-center border-2 border-[#333] p-[8px_12px] align-middle">{data.staffName || ' '}</td>
          </tr>
        </tbody>
      </table>
      <div className="text-right text-xs mt-1 font-bold text-gray-600">
        p.{pageNum}/{totalPages}
      </div>
    </div>
  );
}

export default function Step4({ data, updateData, draftId, onReset, onBack }: Props) {
  const { showToast, ToastView } = useToast();

  const handlePrint = () => window.print();

  const recalculateFabricParts = () => {
    const newFabricParts = buildFabricParts(data);
    updateData({ fabricParts: newFabricParts });
    showToast('再反映しました');
  };

  useEffect(() => {
    let cancelled = false;
    if (!data.productPhotos[0]?.dataUrl) {
      loadImage(draftId).then((url) => {
        if (cancelled || !url) return;
        const photos = data.productPhotos.map((p, i) => (i === 0 ? { ...p, dataUrl: url } : p));
        updateData({ productPhotos: photos });
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const setRevisions = (next: SpecData['revisionHistory']) => updateData({ revisionHistory: next });
  const setParts = (next: SpecData['fabricParts']) => updateData({ fabricParts: next });
  const setEmbroideries = (next: SpecData['embroideryDetails']) => updateData({ embroideryDetails: next });
  const setPhotos = (next: SpecData['productPhotos']) => updateData({ productPhotos: next });

  const revisions = data.revisionHistory;
  const parts = data.fabricParts;
  const embroideries = data.embroideryDetails;
  const photos = data.productPhotos;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const next = photos.map((p, i) => (i === index ? { ...p, dataUrl } : p));
      setPhotos(next);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-12 animate-fade-in fade-in" id="spec-sheet">
      <ToastView />

      {/* ======================= PAGE 1 ======================= */}
      <div className="border border-gray-800 rounded-sm p-[24px_32px] bg-white print:border-none print:p-0 page-break-after">
        <PrintHeader data={data} pageNum={1} totalPages={3} />

        <div className="mb-[20px] flex items-center gap-4">
          <span className="bg-[#16a34a] text-white px-4 py-1 font-bold text-lg inline-block print-bg-green">1. パラメーター一覧</span>
        </div>

        <table className="w-full text-sm text-left border-collapse border border-gray-800">
          <tbody>
            <tr className="border-b border-gray-800">
              <th className="w-1/4 bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">形状</th>
              <td className="w-3/4 p-2 font-bold">{SHAPE_LABELS_JA[data.headShape] || '-'}</td>
            </tr>
            <tr className="border-b border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">ポジション</th>
              <td className="p-2 font-bold">{POSITION_LABELS_JA[data.position] || '-'}</td>
            </tr>
            <tr className="border-b-4 border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 align-top print-bg-gray">コンセプト</th>
              <td className="p-2 whitespace-pre-wrap flex-grow">{data.conceptMemo || '-'}</td>
            </tr>
            <tr className="border-b border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">本体生地</th>
              <td className="p-2">{getLabel(specJson.parameters.body_fabric, data.bodyFabric)}</td>
            </tr>
            <tr className="border-b border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">テクスチャー</th>
              <td className="p-2">{getLabel(specJson.parameters.texture, data.texture)}</td>
            </tr>
            <tr className="border-b border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">裏地</th>
              <td className="p-2">{getLabel(specJson.parameters.lining, data.lining)}</td>
            </tr>
            <tr className="border-b-4 border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">パイピング</th>
              <td className="p-2">{getLabel(specJson.parameters.piping, data.piping)}</td>
            </tr>
            <tr className="border-b border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">開閉方式</th>
              <td className="p-2">{getLabel(specJson.parameters.closure, data.closure)}</td>
            </tr>
            <tr className="border-b-4 border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">主刺繍技法</th>
              <td className="p-2">{getLabel(specJson.parameters.embroidery, data.embroidery)}</td>
            </tr>
            <tr className="border-b border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">本体カラー</th>
              <td className="p-2">
                {getLabel(specJson.parameters.body_color, data.bodyColor)}
                {data.colorCode && <span className="ml-2 text-gray-500">（コード: {data.colorCode}）</span>}
              </td>
            </tr>
            <tr className="border-b border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 align-top print-bg-gray">部位別</th>
              <td className="p-2 text-xs">
                {parts && parts.length > 0
                  ? parts.map((part) => (
                      <div key={part.id} className="mb-0.5">
                        <span className="font-bold">{part.id}:</span> {part.usage || '-'} ／ {part.material || '-'} ／ {part.colorName || '-'}
                      </div>
                    ))
                  : '-'}
              </td>
            </tr>
            <tr className="border-b-4 border-gray-800">
              <th className="bg-gray-100 p-2 border-r border-gray-800 print-bg-gray">金具仕上げ</th>
              <td className="p-2">{getLabel(specJson.parameters.hardware_finish, data.hardwareFinish)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ======================= PAGE 2 ======================= */}
      <div className="border border-gray-800 rounded-sm p-[24px_32px] bg-white print:border-none print:p-0 page-break-before page-break-after">
        <PrintHeader data={data} pageNum={2} totalPages={3} />

        <div className="mb-[20px] flex gap-[8px] items-center">
          <span className="bg-[#16a34a] text-white px-4 py-1 font-bold text-lg inline-block print-bg-green">2. 生地仕様</span>
          <span className="font-bold text-gray-700">布料</span>
        </div>

        {/* 改訂履歴エリア */}
        <div className="mb-[20px]">
          <h4 className="font-bold mb-2">改訂履歴</h4>
          <table className="w-full text-sm border-collapse border border-[#333]">
            <thead>
              <tr>
                <th className="bg-[#e8e8e8] border border-[#333] p-[6px] w-[120px] print-bg-e8 font-bold">日付</th>
                <th className="bg-[#e8e8e8] border border-[#333] p-[6px] print-bg-e8 font-bold text-left px-2">変更内容</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((rev, idx) => (
                <tr key={idx}>
                  <td className="border border-[#333] p-0 text-center relative max-w-[120px]">
                    <input
                      type="date"
                      aria-label={`改訂 ${idx + 1} の日付`}
                      className="w-full border-none p-[6px] text-center text-sm bg-transparent print:bg-transparent"
                      value={rev.date}
                      onChange={(e) => setRevisions(revisions.map((r, i) => (i === idx ? { ...r, date: e.target.value } : r)))}
                    />
                  </td>
                  <td className="border border-[#333] p-0 relative">
                    <input
                      type="text"
                      aria-label={`改訂 ${idx + 1} の内容`}
                      className="w-full border-none p-[6px] text-sm bg-transparent px-2 print:bg-transparent"
                      placeholder="例: 修正①D菅付けテープをなるべく短くする"
                      value={rev.content}
                      onChange={(e) => setRevisions(revisions.map((r, i) => (i === idx ? { ...r, content: e.target.value } : r)))}
                    />
                    <button
                      onClick={() => setRevisions(revisions.filter((_, i) => i !== idx))}
                      aria-label={`改訂 ${idx + 1} を削除`}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 print:hidden bg-white rounded-full"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} className="border border-[#333] p-2 print:hidden bg-[#f9f9f9]">
                  <button
                    onClick={() => setRevisions([...revisions, { date: new Date().toISOString().split('T')[0], content: '' }])}
                    className="text-indigo-600 text-sm font-bold flex items-center justify-center w-full hover:underline"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" /> 改訂を追加
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 縫製注意事項 */}
        <div className="mb-[20px] border-t border-[#ddd] pt-[16px]">
          <h4 className="font-bold mb-2">縫製注意事項</h4>
          <textarea
            aria-label="縫製注意事項"
            className="w-full border border-gray-400 p-2 min-h-[60px] print:border-gray-400 print:resize-none"
            placeholder="例: 磁石式/磁石位置,磁力注意"
            value={data.sewingNotes}
            onChange={(e) => updateData({ sewingNotes: e.target.value })}
          />
        </div>

        {/* 寸法 */}
        <div className="mb-[20px] border-t border-[#ddd] pt-[16px]">
          <h4 className="font-bold mb-2">寸法</h4>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><span className="font-bold">全長</span> <input type="number" className="border border-gray-400 p-1 w-20 print:border-gray-400" value={data.dimensionLength} onChange={(e) => updateData({ dimensionLength: e.target.value })} /> mm</label>
            <label className="flex items-center gap-2 text-sm"><span className="font-bold">幅</span> <input type="number" className="border border-gray-400 p-1 w-20 print:border-gray-400" value={data.dimensionWidth} onChange={(e) => updateData({ dimensionWidth: e.target.value })} /> mm</label>
            <label className="flex items-center gap-2 text-sm"><span className="font-bold">高さ</span> <input type="number" className="border border-gray-400 p-1 w-20 print:border-gray-400" value={data.dimensionHeight} onChange={(e) => updateData({ dimensionHeight: e.target.value })} /> mm</label>
            <label className="flex items-center gap-2 text-sm"><span className="font-bold">縁巻き幅</span> <input type="number" className="border border-gray-400 p-1 w-20 print:border-gray-400" value={data.dimensionPiping} onChange={(e) => updateData({ dimensionPiping: e.target.value })} /> mm</label>
            <label className="flex items-center gap-2 text-sm"><span className="font-bold">刺繍位置</span> <input type="number" className="border border-gray-400 p-1 w-20 print:border-gray-400" value={data.dimensionEmbroidery} onChange={(e) => updateData({ dimensionEmbroidery: e.target.value })} /> mm</label>
          </div>
        </div>

        {/* 写真 */}
        <div className="mb-[20px] border-t border-[#ddd] pt-[16px]">
          <h4 className="font-bold mb-2">製品写真</h4>
          <div className="flex flex-wrap gap-[12px]">
            {photos.map((photo, i) => (
              <div key={i} className={`flex flex-col w-[200px] relative ${!photo.dataUrl ? 'print:hidden' : ''}`}>
                <label className="w-[200px] h-[160px] border-2 border-dashed border-[#999] bg-[#f9f9f9] cursor-pointer flex items-center justify-center relative overflow-hidden group print:border-none print:bg-transparent">
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={`${photo.name || `写真 ${i + 1}`} を追加`}
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, i)}
                  />
                  {photo.dataUrl ? (
                    <img src={photo.dataUrl} alt={photo.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-[#666] text-[12px] print:hidden">
                      クリックして<br />写真を追加
                    </div>
                  )}
                </label>
                <input
                  type="text"
                  aria-label={`写真 ${i + 1} の名前`}
                  className="mt-2 w-full text-center border border-gray-300 p-1 text-sm print:border-none print:bg-transparent print:font-bold"
                  value={photo.name}
                  onChange={(e) => setPhotos(photos.map((p, idx) => (idx === i ? { ...p, name: e.target.value } : p)))}
                  placeholder="写真名 例: 正面"
                />
                <button
                  onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                  aria-label={`写真 ${i + 1} を削除`}
                  className="absolute top-1 right-1 text-red-500 bg-white rounded-full print:hidden shadow-sm hover:bg-red-50"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          {photos.length < 6 && (
            <button
              onClick={() => setPhotos([...photos, { name: '', dataUrl: '' }])}
              className="text-indigo-600 text-sm font-bold flex items-center mt-3 print:hidden hover:underline"
            >
              <PlusIcon className="w-4 h-4 mr-1" /> 写真を追加
            </button>
          )}
        </div>

        {/* 部位別仕様表 */}
        <div className="mb-[20px] border-t border-[#ddd] pt-[16px] relative">
          <div className="flex justify-between items-center mb-2 print:hidden">
            <h4 className="font-bold">部位別仕様表</h4>
            <button
              onClick={recalculateFabricParts}
              className="flex items-center text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded shadow-sm hover:bg-indigo-100 font-bold transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1" /> STEP2の内容を再反映
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th className="w-[90px] min-w-[90px] bg-[#e8e8e8] border border-[#333] p-[6px_8px] print-bg-e8"></th>
                  {parts.map((part) => (
                    <th key={part.id} className="min-w-[120px] h-[32px] bg-[#c8e6c9] border border-[#333] font-bold text-[13px] text-center relative print-bg-c8">
                      {part.label}
                      <button
                        onClick={() => setParts(parts.filter((p) => p.id !== part.id))}
                        aria-label={`部位 ${part.label} を削除`}
                        className="absolute top-1 right-1 text-red-600 print:hidden"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="h-[80px]">
                  <th className="w-[90px] min-w-[90px] bg-[#e8e8e8] font-bold text-[12px] p-0 text-center border border-[#333] print-bg-e8 align-middle">
                    <div className="flex flex-col h-full justify-center">
                      <div className="flex-1 flex items-center justify-center border-b border-[#aaa]">使用箇所 /</div>
                      <div className="flex-1 flex items-center justify-center">素材名</div>
                    </div>
                  </th>
                  {parts.map((part, idx) => (
                    <td key={part.id} className="border border-[#333] p-0 min-w-[120px] align-top bg-white">
                      <div className="flex flex-col h-full">
                        <div className="h-[30px] bg-[#f5f5f5] print-bg-f5 border-b border-[#ddd]">
                          <input
                            type="text"
                            aria-label={`部位 ${part.label} 使用箇所`}
                            className="w-full h-full text-center border-none p-1 bg-transparent text-[11px] font-bold outline-none"
                            value={part.usage}
                            onChange={(e) => setParts(parts.map((p, i) => (i === idx ? { ...p, usage: e.target.value } : p)))}
                            placeholder="例: 本体生地"
                          />
                        </div>
                        <div className="flex-1 h-[50px]">
                          <textarea
                            aria-label={`部位 ${part.label} 素材`}
                            className="w-full h-full text-center border-none p-1 bg-transparent text-[11px] resize-none leading-[1.3] outline-none"
                            rows={2}
                            value={part.material}
                            onChange={(e) => setParts(parts.map((p, i) => (i === idx ? { ...p, material: e.target.value } : p)))}
                            placeholder="例: マットしぼ / PU"
                          />
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="h-[80px]">
                  <th className="w-[90px] min-w-[90px] bg-[#e8e8e8] font-bold text-[12px] p-0 text-center border border-[#333] print-bg-e8 align-middle">
                    <div className="flex flex-col h-full justify-center">
                      <div className="flex-1 flex items-center justify-center border-b border-[#aaa]">本体カラー</div>
                      <div className="flex-1 flex items-center justify-center">/ カラー指示</div>
                    </div>
                  </th>
                  {parts.map((part, idx) => (
                    <td key={part.id} className="border border-[#333] p-0 min-w-[120px] align-top bg-white">
                      <div className="flex flex-col items-center justify-center h-full gap-[2px] py-1">
                        <input
                          type="text"
                          aria-label={`部位 ${part.label} カラー名`}
                          className="w-full text-center border-none p-0 bg-transparent text-[11px] font-bold outline-none h-[20px]"
                          value={part.colorName}
                          onChange={(e) => setParts(parts.map((p, i) => (i === idx ? { ...p, colorName: e.target.value } : p)))}
                          placeholder="ブラック"
                        />
                        <div className="flex justify-center items-center h-[24px]">
                          <input
                            type="color"
                            aria-label={`部位 ${part.label} カラーサンプル`}
                            className="w-[20px] h-[20px] border border-[#999] p-0 block cursor-pointer"
                            value={part.colorSwatch}
                            onChange={(e) => setParts(parts.map((p, i) => (i === idx ? { ...p, colorSwatch: e.target.value } : p)))}
                          />
                        </div>
                        <input
                          type="text"
                          aria-label={`部位 ${part.label} 糸番号`}
                          className="w-full text-center border-none p-0 bg-transparent text-[11px] text-gray-600 outline-none h-[20px]"
                          value={part.threadNumber}
                          onChange={(e) => setParts(parts.map((p, i) => (i === idx ? { ...p, threadNumber: e.target.value } : p)))}
                          placeholder="例: #92"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {parts.length < 8 && (
            <button
              onClick={() =>
                setParts([
                  ...parts,
                  {
                    id: Date.now().toString(),
                    label: colLabel(parts.length),
                    usage: '',
                    material: '',
                    partNumber: '',
                    quantity: '',
                    colorName: '',
                    threadNumber: '',
                    colorSwatch: '#cccccc',
                  },
                ])
              }
              className="text-indigo-600 text-sm font-bold flex items-center mt-3 print:hidden"
            >
              <PlusIcon className="w-4 h-4 mr-1" /> 部位を追加
            </button>
          )}
        </div>
      </div>

      {/* ======================= PAGE 3 ======================= */}
      <div className="border border-gray-800 rounded-sm p-[24px_32px] bg-white print:border-none print:p-0 page-break-before">
        <PrintHeader data={data} pageNum={3} totalPages={3} />

        <div className="mb-[20px] flex gap-[8px] items-center">
          <span className="bg-[#16a34a] text-white px-4 py-1 font-bold text-lg inline-block print-bg-green">3. 刺繍・プリント・高周波</span>
          <span className="font-bold text-gray-700">刺绣・印刷等</span>
        </div>

        <div className="mb-[20px]">
          <table className="w-full text-sm text-center border-collapse border border-[#333]">
            <thead>
              <tr>
                <th className="bg-[#c8e6c9] border border-[#333] p-2 w-[50px] font-bold print-bg-c8 text-[13px]">番号</th>
                <th className="bg-[#c8e6c9] border border-[#333] p-2 w-[180px] font-bold print-bg-c8 text-[13px]">技法</th>
                <th className="bg-[#c8e6c9] border border-[#333] p-2 w-[120px] font-bold print-bg-c8 text-[13px]">糸種</th>
                <th className="bg-[#c8e6c9] border border-[#333] p-2 w-[200px] font-bold print-bg-c8 text-[13px]">糸番号・カラー名</th>
                <th className="bg-[#c8e6c9] border border-[#333] p-2 w-[80px] font-bold print-bg-c8 text-[13px]">サイズmm</th>
                <th className="bg-[#c8e6c9] border border-[#333] p-2 w-[120px] font-bold print-bg-c8 text-[13px]">配置</th>
                <th className="border-none w-8 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {embroideries.map((emb, idx) => (
                <tr key={emb.id}>
                  <td className="border border-[#333] p-1 font-bold">{idx + 1}</td>
                  <td className="border border-[#333] p-1">
                    <select
                      aria-label={`刺繍 ${idx + 1} 技法`}
                      className="w-full border-none bg-transparent"
                      value={emb.technique}
                      onChange={(e) => setEmbroideries(embroideries.map((r, i) => (i === idx ? { ...r, technique: e.target.value } : r)))}
                    >
                      <option value=""></option>
                      <option value="普通刺繍">普通刺繍</option>
                      <option value="普通刺繍・振り刺繍">普通刺繍・振り刺繍</option>
                      <option value="畳刺繍">畳刺繍</option>
                      <option value="畳立体刺繍">畳立体刺繍</option>
                      <option value="文字型土台畳刺繍">文字型土台畳刺繍</option>
                      <option value="シリコンパッチ">シリコンパッチ</option>
                      <option value="プリント">プリント</option>
                    </select>
                  </td>
                  <td className="border border-[#333] p-1">
                    <select
                      aria-label={`刺繍 ${idx + 1} 糸種`}
                      className="w-full border-none bg-transparent"
                      value={emb.threadType}
                      onChange={(e) => setEmbroideries(embroideries.map((r, i) => (i === idx ? { ...r, threadType: e.target.value } : r)))}
                    >
                      <option value=""></option>
                      <option value="銀杏">銀杏</option>
                      <option value="メタリック糸">メタリック糸</option>
                      <option value="標準刺繍糸">標準刺繍糸</option>
                    </select>
                  </td>
                  <td className="border border-[#333] p-1">
                    <input
                      type="text"
                      aria-label={`刺繍 ${idx + 1} 糸番号`}
                      className="w-full text-center border-none p-1 bg-transparent"
                      value={emb.threadNumber}
                      onChange={(e) => setEmbroideries(embroideries.map((r, i) => (i === idx ? { ...r, threadNumber: e.target.value } : r)))}
                      placeholder="例: #2173(オフホワイト)"
                    />
                  </td>
                  <td className="border border-[#333] p-1">
                    <input
                      type="number"
                      aria-label={`刺繍 ${idx + 1} サイズ`}
                      className="w-full text-center border-none p-1 bg-transparent"
                      value={emb.size}
                      onChange={(e) => setEmbroideries(embroideries.map((r, i) => (i === idx ? { ...r, size: e.target.value } : r)))}
                    />
                  </td>
                  <td className="border border-[#333] p-1">
                    <input
                      type="text"
                      aria-label={`刺繍 ${idx + 1} 配置`}
                      className="w-full text-center border-none p-1 bg-transparent"
                      value={emb.placement}
                      onChange={(e) => setEmbroideries(embroideries.map((r, i) => (i === idx ? { ...r, placement: e.target.value } : r)))}
                      placeholder="例: 前面"
                    />
                  </td>
                  <td className="border-none text-left print:hidden">
                    <button
                      onClick={() => setEmbroideries(embroideries.filter((e) => e.id !== emb.id))}
                      aria-label={`刺繍 ${idx + 1} を削除`}
                      className="text-red-500 ml-2"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setEmbroideries([...embroideries, { id: Date.now().toString(), technique: '', threadType: '', threadNumber: '', size: '', placement: '' }])}
            className="text-indigo-600 text-sm font-bold flex items-center mt-3 print:hidden"
          >
            <PlusIcon className="w-4 h-4 mr-1" /> 刺繍を追加
          </button>
        </div>

        <div className="mb-[20px] border-t border-[#ddd] pt-[16px]">
          <h4 className="font-bold mb-2">縫製注意事項（刺繍・プリントなど共通）</h4>
          <textarea
            aria-label="刺繍・プリント縫製注意事項"
            className="w-full border border-gray-400 p-2 min-h-[80px] print:border-gray-400 print:resize-none"
            value={data.sewingNotes}
            onChange={(e) => updateData({ sewingNotes: e.target.value })}
          />
        </div>
      </div>

      {/* Global Buttons */}
      <div className="pt-6 flex justify-between print:hidden">
        <button
          onClick={onBack}
          className="bg-white border text-gray-700 hover:bg-gray-50 font-bold py-3 px-6 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-5 h-5" /> 戻る
        </button>
        <div className="flex gap-4">
          <button
            onClick={onReset}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg shadow transition-colors flex items-center gap-2"
          >
            <ArrowPathIcon className="w-5 h-5" /> 最初からやり直す
          </button>
          <button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow transition-colors flex items-center gap-2"
          >
            <PrinterIcon className="w-5 h-5" /> 印刷・PDF出力
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          .page-break-before { page-break-before: always; }
          .page-break-after { page-break-after: always; }

          .print-bg-green { background-color: #16a34a !important; color: white !important; }
          .print-bg-c8 { background-color: #c8e6c9 !important; }
          .print-bg-e8 { background-color: #e8e8e8 !important; }
          .print-bg-f5 { background-color: #f5f5f5 !important; }
          .print-bg-gray { background-color: #f3f4f6 !important; }
          .print-bg-red { background-color: #cc0000 !important; color: white !important; }

          input[type="text"], input[type="number"], input[type="date"], select, textarea {
            border: 1px solid #ccc !important;
            background: transparent !important;
            color: black !important;
            box-shadow: none !important;
          }
          table input.border-none {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
