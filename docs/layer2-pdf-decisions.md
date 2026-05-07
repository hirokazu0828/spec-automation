# Layer 2-PDF: 横向き A4 PDF 出力 設計記録

> `@react-pdf/renderer` を導入し Step4 を独立 PDF として出力可能にした際の判断記録。

## 1. ライブラリ: `@react-pdf/renderer` 3.x

採用理由:
- ベクトルテキスト → 検索 / コピペ可能 (業務文書として必須)
- React 親和性 (既存コンポーネント設計から TSX で書ける)
- TypeScript サポート
- Vercel デプロイで CSR 完結 (サーバーサイド実行不要)

不採用:
- `jsPDF + html2canvas`: テキストが画像化、検索不可、業務不向き
- `Puppeteer`: サーバーサイド前提、Vercel リソース制約
- `window.print()` 強化: ユーザ操作 (印刷ダイアログ → PDF 保存) が必要、自動化不可

旧 `window.print()` は **フォールバックとして残す** (Step4 既存ボタンを維持)。

## 2. 紙向き: 全テンプレ A4 横向き統一

既存仕様書 PDF 7 件 (TRY/YMN/ZOD/KOD/FTN) すべて横向き、業務慣習に合致。`<Page size='A4' orientation='landscape'>` を全ページに適用。

## 3. ファイル名命名規則

ヘルパー: `generatePdfFileName(data, secondary?): string`
配置: `src/utils/specHelpers.ts`

```
入力                                                              | 出力
{ productCode: 'KOD-001', documentType: 'sample', sampleRevision: 1 }
                                                                  | KOD-001_sample_1.pdf
{ productCode: 'KOD-001', documentType: 'sample', sampleRevision: 2 }
                                                                  | KOD-001_sample_2.pdf
{ productCode: 'KOD-001', documentType: 'final' }                 | KOD-001_final.pdf
上記 + secondary { productCode: 'KOD-002' }                        | KOD-001_vs_KOD-002_sample_1.pdf
{ productCode: '', documentType: 'sample', sampleRevision: 1 }    | spec_sample_1.pdf
両方 productCode 空                                                | spec_vs_spec_sample_1.pdf
```

`secondary` 引数の型は `{ productCode: string }` の最小構造を要求 (柔軟性のため、`DraftEnvelope` を直接受け取る必要なし)。

## 4. 並列出力レイアウト: ドラフト別連続 (ユーザ確定)

```
単一モード: 計 3 ページ
  p1: パラメーター一覧
  p2: 生地仕様
  p3: 刺繍プリント

並列モード: 計 5 ページ
  p1: A 案 + B 案の統合パラメーター (左右 50/50 grid)
  p2: A 案 生地仕様
  p3: A 案 刺繍プリント
  p4: B 案 生地仕様
  p5: B 案 刺繍プリント
```

理由: 「A 案を完結して読む → B 案を完結して読む」の方が業務慣習。工場での印刷時にも「A 案だけ抜き出す」運用がしやすい。

「タイプ別交互」(p2=A生地/p3=B生地/p4=A刺繍/p5=B刺繍) ではなく **「ドラフト別連続」** で実装。

## 5. 日本語フォント: `@fontsource/noto-sans-jp` から WOFF を postinstall コピー

最終採用方式 (実装中の経路変更あり、下記参照):
- `@fontsource/noto-sans-jp` を devDependency として追加 → `node_modules/@fontsource/noto-sans-jp/files/` に WOFF / WOFF2 が展開される
- `scripts/download-fonts.ts` (tsx 経由) は `node_modules` から `public/fonts/` への**ファイルコピー**だけを行う (ネットワーク呼び出しなし)
- コピー対象: `noto-sans-jp-japanese-{400,700}-normal.woff` → `NotoSansJP-{Regular,Bold}.woff` (各 ~1.4MB、計 ~2.8MB)
- WOFF 採用理由: `@react-pdf/renderer 4.x` の fontkit は WOFF を素直に扱える (WOFF2 は wasm 必須でブラウザ環境で不安定)
- `package.json` の `postinstall` に登録 → `npm install` / Vercel ビルド時に自動コピー
- 既にコピー済 (size 一致) なら skip (idempotent)
- 失敗時は warning のみで `npm install` 全体は失敗させない (best-effort)
- `public/fonts/` を `.gitignore` に追加 (リポサイズ膨張回避)

### 経路変更の経緯 (記録)

実装中、当初の方針 (notofonts/noto-cjk から OTF を CDN 取得) は以下で失敗した:
- `cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/Japanese/NotoSansJP-Regular.otf` → HTTP 403 (host_not_allowed; jsDelivr が gh: プレフィックスでこのリポを serve していない)
- `raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/Japanese/NotoSansJP-Regular.otf` → HTTP 404 (リポジトリ構造が変更されたか subset リポへ移行)
- `raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/static/NotoSansJP-Regular.ttf` → HTTP 404 (static ディレクトリ廃止、variable font のみ提供)

代替として `npm` パッケージ経由方式 (`@fontsource/noto-sans-jp`) に切替。npm パッケージは将来も安定して取得可能で、postinstall 中もネットワーク不要。サブセット (`japanese`) で約 1.4MB/weight に圧縮済。

`Font.register({ family: 'NotoSansJP', fonts: [...] })` は `src/components/Step4/pdf/fonts.ts` で 1 回だけ呼ぶ。

## 6. Vitest テスト戦略: 構造テスト + 純関数単体テスト

`@react-pdf/renderer` は jsdom 環境で実 PDF レンダリング不可 (canvas / fontkit 依存)。

採用方針:
- **構造テスト**: PDF コンポーネント側で `vi.mock('@react-pdf/renderer', ...)` して primitives (`Document` / `Page` / `View` / `Text`) を素通し div に置換 → React tree を `@testing-library/react` で assertion
- **純関数単体テスト**: `generatePdfFileName` 等は通常の単体テスト

テスト範囲:
- `<Document>` ルートが `<Page orientation='landscape'>` を含む
- 単一モードでページ数 3
- 並列モードでページ数 5
- documentType=sample で `<SampleArrangement>` がレンダーされる
- documentType=final で `<SampleArrangement>` がレンダーされない
- ヘッダーバナーが docType で切替

実 PDF バイナリの検証はスキップ (jsdom + canvas が要る、CI 重い、得るものが少ない)。

## 7. HTML プレビュー (Step4) と PDF コンポーネントの整理: 両方を維持

採用方針:
- Step4 HTML 編集 UI + `window.print()` 既存 → そのまま維持 (編集 UX 優先)
- 新規 `SpecSheetPdf` (react-pdf) はダウンロード専用 → 「PDF をダウンロード」ボタン押下で動作
- データソース (SpecData) は共有、レンダリング primitives は別 (Tailwind vs StyleSheet)

重複コスト: ~700 行の見積もり。Layer 5+ で必要なら共通化を検討。

理由:
- react-pdf 内では textarea / file input / contentEditable が使えず、編集 UX が破壊される
- PDF/HTML は medium が違うので primitives が違って当然

## 8. バンドル戦略: React.lazy 遅延ロード

```tsx
const PdfDownloadButton = lazy(() => import('./Step4/pdf/PdfDownloadButton'));
```

- `@react-pdf/renderer` は ~600KB minified+gzipped + fontkit/pdfkit で計 ~1.5MB
- 既存ユーザは Step4 を開いた時点で +1.5MB のバンドル増にならない
- PDF 出力したいユーザだけが初回クリックでチャンクをフェッチ
- Suspense fallback で「PDF生成中...」を表示 (ユーザ指示)
- 一度ロードされれば次回以降は即時

## 9. 残課題 / 持ち越し

- **Noto Sans JP のサブセット化**: バンドル/DL サイズが運用上問題になったら検討 (~7MB → ~500KB に圧縮可能、ただし常用漢字外で表示崩れリスク)
- **画像埋め込み**: productPhotos の dataUrl を `<Image>` で埋め込む。動作確認は Layer 2-PDF で実施するが、サイズ最適化 (downscale) は Layer 5+ 持ち越し
- **A/B 案の並列 PAGE 1 で文字量差による高さ崩れ**: 単純 50/50 grid で出して、業務確認で問題が出れば font-size 動的調整 / 改ページ閾値ロジックを後追い
- **印刷時の細かい調整 (改行位置、行間)**: 業務 PDF を見ながら次の Layer で再調整
