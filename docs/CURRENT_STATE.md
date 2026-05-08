# 現状実装レポート

> 作成日: 2026-05-03 / 最終更新: 2026-05-08 (Layer 3b)
> 対象コミット: `main` 統合済み + Layer 3a (型カタログ + アングル選択 UI) + Layer 3b (プロンプトテンプレート)
> 目的: Layer 2〜6 の実装に着手する前の現状把握。

---

## 1. ビュー構成

### トップレベル View

`src/App.tsx` で `View` 型ベースのルーティング (URL ルーティングではない、内部ステートのみ):

```ts
type View =
  | { kind: 'home' }
  | { kind: 'wizard'; draftId: string; step: 1|2|3|4 }
  | { kind: 'samples'; mode?: 'browse' | 'pick' }   // ← Layer 6 で mode 追加
```

| 遷移 | きっかけ |
|---|---|
| `home` → `wizard` (Route C / 白紙) | ホームの「[C] コンセプトから作成」 → `createDraft('C')` |
| `home` → `samples (mode=pick)` | ホームの「[A] サンプル帳から作成」 (バナー付き選択モード) |
| `samples (mode=pick)` → `wizard` (Route A) | サンプル詳細モーダルの「このサンプルを起点に新規作成」 → `createDraft('A', seed)` |
| `home` → `wizard` (Route B) | ホームの「[B] 既存ドラフトを複製」 → `DraftPickerModal` で選択 → `createDraft('B', seed)` |
| `home` → `wizard` (再開) | DraftList の「開く」 → `loadDraft(id)` → `setView({kind:'wizard', draftId, step: env.lastStep})` |
| `home` → `samples (mode=browse)` | ホーム右上「サンプル帳を開く」 (閲覧モード、起点にすることも可能) |
| `wizard` → `home` | ヘッダー「← ドラフト一覧へ」 (`goHome()`) または Step4 の「最初からやり直す」 |
| `wizard` → `samples (mode=browse)` | wizard ヘッダー右上「サンプル帳」 |
| `samples (任意 mode)` → `home` | samples ヘッダー「← ドラフト一覧へ」 |

**3 ルート起点判定 (Layer 6)**: 新規ドラフトの起点が SpecData に `originRoute: 'A'|'B'|'C'` として記録される。Step1 上部に起点バッジを表示。詳細は `docs/route-design-decisions.md`。

**全 view は `<AuthGate>` でラップ** (`src/components/SampleBook/AuthGate.tsx`)。`VITE_APP_PASSWORD` で sessionStorage 認証。

### Wizard 内 Step 遷移

```ts
view.step: 1 | 2 | 3 | 4   // 5 はない (旧 Step5 = サンプル帳は独立 view 化済)
```

| 遷移 | きっかけ | 条件 |
|---|---|---|
| Step1 → Step2 | Step1 「STEP2 へ進む」 | `data.headShape && data.position` |
| Step2 → Step3 | Step2 「STEP3 へ進む」 | `bodyFabric && lining && closure && embroidery && bodyColor && hardwareFinish` のすべてが空でない |
| Step3 → Step4 | Step3 「STEP4 へ進む」 | 無条件 (画像生成しなくても進める) |
| 任意 step ↔ 任意 step | ヘッダーのタブナビ | 常に許可 (バリデーション不在) |
| Step* → 1 つ前 | 「← 戻る」 | step > 1 |

### 自動保存

`App.tsx` の `useEffect([view, specData, saveDraft])` で `view.kind === 'wizard'` のとき `setTimeout(saveDraft, 300)` で debounce。step 移動 / specData 更新の双方を起点に発火。

---

## 2. データモデル

### `SpecJson` の構造 (`src/data/spec/types.ts`)

```
SpecJson
├── meta            { product, version, updated, description }
├── parameters      Record<string, SpecParameter>
│   ├── head_shape, position, body_fabric, texture, lining, piping,
│   │   closure, embroidery, hardware_finish, body_color
│   └── 各 SpecParameter:
│       ├── label, type, required?, note?
│       ├── options?: SpecOption[]
│       │   └── { value, label, en?, type?, price_range?, aql?, note? }
│       └── options_by_fabric_type?: Record<fabricType, SpecOption[]>
│                                    (texture のみ使用)
└── auto_fill       Record<`${position}_${shapeKey}`, AutoFillEntry>
    └── AutoFillEntry: { body_fabric, texture, lining, piping, closure, embroidery, hardware_finish, body_color }
```

> **型定義の落とし穴**: `putter-cover.json` には `dimensions`, `combinations_count`, `sample_combinations`, `parameters.body_fabric.options[].en`, `parameters.*.ng_rules` などが実在するが、`SpecJson` 型はこれらを宣言していない (パラメーターに `SpecOption.feature` も未宣言)。実データに対して型が部分的にしかカバーしていないため、TypeScript の保護が弱い。

### `SpecData` (`src/types.ts`) 主要フィールド

```
SpecData
├── 書類管理: productCode, seasonCode, brandName, staffName, clientName, issueDate,
│             revisionNote, hasRevision
├── コンセプト: headShape, position, conceptMemo
├── STEP2 主要選択: bodyFabric, texture, lining, piping, closure, embroidery,
│                   bodyColor, colorCode, hardwareFinish
├── 部位色 (フリー入力): colorA, colorB, colorC, colorD   ← フォームに直接バインドされていない (※下記参照)
├── 寸法フリー入力: dimensionLength, dimensionWidth, dimensionHeight,
│                   dimensionPiping, dimensionEmbroidery
├── sewingNotes
├── revisionHistory: Array<{date, content}>
├── fabricParts:    Array<{id, label, usage, material, partNumber, quantity,
│                          colorName, threadNumber, colorSwatch}>
├── productPhotos:  Array<{name, dataUrl}>      初期値: 正面/側面/背面 の 3 枠
├── embroideryDetails: Array<{id, technique, threadType, threadNumber, size, placement}>
├── baseProposal?:  ProposalBase | null         (Step2 の「提案ベース」)
├── originRoute? / originSampleId? / originDraftId?  (Layer 6: 3 ルート起点)
├── documentType:   'sample' | 'final'           (Layer 4: 既定 'sample')
├── sampleRevision?: number                      (Layer 4: documentType==='sample' のみ)
├── sampleArrangement?: { quantities, unit, ... } (Layer 4: 表紙 SAMPLE 手配欄)
└── imageSource?:   'generated' | 'manual' | 'photo' (Layer 4: 画像出所)
```

**Layer 0 メモ**: 旧 `colorA〜D` は Layer 0 で削除済み。`useSpecDrafts.migrateSpecData` で旧ドラフトロード時に除去。

### ドラフト構造 (`src/hooks/useSpecDrafts.ts`)

localStorage キー: `spec-automation:drafts:v1`

```ts
type DraftEnvelope = {
  id: string;              // crypto.randomUUID()
  productCode: string;     // 一覧表示用 (data.productCode のミラー)
  brandName: string;       // 一覧表示用
  savedAt: number;         // Date.now()
  lastStep: 1 | 2 | 3 | 4;
  data: SpecData;          // baseProposal / originRoute / documentType 等を含む
  documentType: 'sample' | 'final';  // Layer 4: data.documentType のミラー (一覧バッジ用)
  sampleRevision?: number;            // Layer 4: data.sampleRevision のミラー
}
type DraftStore = { version: 1; drafts: DraftEnvelope[] }
```

- `saveDraft(id, data, lastStep)` で保存。productCode/brandName/documentType/sampleRevision は `data` から自動転記
- `duplicateDraft(id)` は productCode に `-copy` サフィックス付与、画像も IndexedDB でコピー (= リピート用)
- **`promoteRevision(id)`** *(Layer 4)*: documentType==='sample' の draft を複製 → `sampleRevision +1`、productCode 末尾に `_2nd` 等のサフィックス、改訂履歴に派生元行を prepend、画像コピー
- **`promoteToFinal(id)`** *(Layer 4)*: 既存 draft を変異させて documentType='final' に昇格、sampleRevision を undefined、imageSource は generated→manual に置換 (photo はそのまま温存)
- `deleteDraft(id)` は localStorage からエンベロープ削除 + IndexedDB から画像削除
- 旧ドラフト (Layer 4 以前) は `migrateSpecData` で `documentType='final'` に補完
- `data.revisionHistory` は仕様書スナップショットの差分管理ではない (Step4 の編集可能テーブルとして表現される、自由入力)

### 生成画像 (`src/lib/imageStore.ts`)

IndexedDB ストア: `spec-automation-images` / object store `images`
キー: ドラフト id (1 ドラフトあたり 1 枚のみ。再生成すると上書き)
値: `data:image/png;base64,...` 形式の dataUrl 文字列

---

## 3. ウィザード各ステップの責務

### Step1: 企画流し込み (`src/components/Step1.tsx`)

**入力項目**:
- 書類管理: productCode, seasonCode, brandName (datalist で 10 ブランド候補をハードコード), staffName, clientName, issueDate (default = today), revisionNote, hasRevision (radio)
- コンセプト: headShape (radio 3択: pin/mallet/neo_mallet), position (radio 3択: luxury/standard/casual), conceptMemo

**出力**: `updateData()` で `SpecData` の上記キーを部分更新するのみ。次ステップに渡す独立した state はない。

**ドラフトへの保存タイミング**: `updateData` → 親 (App.tsx) の `setSpecData` → `useEffect` の 300ms debounce。Step1 内に明示的な保存 UI なし。

### Step2: 組み合わせ提案 (`src/components/Step2/`)

#### `useStep2Proposals` (`src/hooks/useStep2Proposals.ts`)

- **入力**: `data: SpecData` + コールバック (`onNoBaseAutoFill`, `onRegenerated`, `onRegenerateFailed`)
- **戻り値**:
  ```ts
  {
    proposals: Partial<SpecData>[] | null,
    currentProposalIndex: number,
    setCurrentProposalIndex,
    generateProposals,    // 5 件生成
    regenerateProposals,  // ランダム 5 件再生成
    getProposalWarnings,  // 1 提案 → ['NG', ...] (理由文字列ではなく 'NG' を push するだけ)
  }
  ```
- **生成ロジック**: `specJson.auto_fill[`${position}_${shapeKey}`]` (e.g. `luxury_pin`) からテンプレート取得 → p1=そのまま、p2=色違い、p3=生地違い、p4=刺繍/金具違い、p5=ポジション違い
- **再生成ロジック**: ランダム fabric × color × embroidery を組み合わせ、`getProposalWarnings` で NG が出ない 5 件を取る (最大 200 試行)。重複は除外
- **外部 API は呼ばない**。決定論的なテンプレート + 乱数のみ

#### `ProposalDeck` (`src/components/Step2/ProposalDeck.tsx`)

5 件の提案カードを横スクロール表示。選択中ハイライト、NG バッジ、前/次ボタン、適用ボタン、再生成ボタン。

#### `BaselineBadge` (`src/components/Step2/FieldWithBaseline.tsx`)

ファイル名は `FieldWithBaseline.tsx` だが default export は `BaselineBadge`。ProposalBase の各キーについて `data[key] === baseline[key]` なら「AI推奨」(インディゴ)、違うなら「変更済」(オレンジ + ↺)。Step2 内の 8 つのフィールド (bodyFabric, texture, lining, piping, closure, embroidery, bodyColor, hardwareFinish) でラベル横に表示。

#### `applyProposal` (`src/components/Step2/applyProposal.ts`)

純関数 3 つを export:
- `applyProposal(proposal)`: proposal → `Partial<SpecData>` (8 キー + colorCode + fabricParts + baseProposal)
- `buildFabricParts(source)`: 8 キー → 5 or 6 件の fabricParts (piping=none/未設定で 5 件、それ以外で 6 件)
- `diffFromProposal(data, baseline)`: 違うキー一覧

**重要**: `buildFabricParts` は Step4 の「STEP2 の内容を再反映」ボタンからも呼ばれており、Step2 と Step4 のロジック共有点。

#### `GuideBanner` *(Layer 6 UX fix)*

Step2 のヘッダー直上に表示される origin 別ガイドバナー (`src/components/Step2/index.tsx` 内に local component):

| originRoute | 表示 | タイトル | メッセージ |
|---|---|---|---|
| `'A'` | ✓ | 「サンプル「{originSampleId}」を起点にしています」 | 「下記の提案から1つを選んで「適用」を押してください。」 |
| `'B'` | ✓ | 「ドラフト「{productCode (lookup) または originDraftId}」を複製しています」 | 「必要な項目を編集してください。提案は手動で生成できます。」 |
| `'C'` / undefined | ✗ | — | — |

開閉状態は `useState(true)` でローカル管理 (永続化しない)、閉じるボタンは 44pt タッチターゲット。

#### Route A 起点での自動提案実行 *(Layer 6 UX fix)*

Step2 マウント時に `useEffect([])` で以下条件すべて満たしたとき `generateProposals()` を自動発火:
- `data.originRoute === 'A'`
- `proposals === null` (二重実行防止)
- `data.headShape` が空でない
- `data.position` が空でない

`autoGeneratedRef` で React strict-mode の二重実行をガード。Route B / C / undefined では従来通りボタン押下で手動生成。判断記録: `docs/route-a-step2-ux-decisions.md`

#### `PositionMissingBanner` *(Layer 6 UX fix-2)*

タブナビは「常に許可」設計のため、Step1 で `position` 未設定のまま Step2 に飛んでしまうケースがある (Route A は seed に position 含めない、Route C は最初から空)。Step2 はマウント時に `data.position` が空 (空文字 / undefined / 空白のみ) を検知し、**amber 系の警告バナー** ("ポジションが未設定です" + 「STEP1 に戻る」ボタン) を最優先で表示。

優先順位:
1. `isPositionMissing` (= `!data.position || data.position.trim() === ''`) → `<PositionMissingBanner>` のみ
2. それ以外 → 既存の Route A / B `<GuideBanner>` (originRoute による分岐)
3. Route C / undefined かつ position 設定済 → バナーなし

「STEP1 に戻る」ボタンは Step2 props の `onStepChange` (= App.tsx の `goStep`) を呼び出すワンタップ誘導。判断記録: `docs/route-a-step2-position-fallback-decisions.md`

### Step3: 線図 + 画像生成 (`src/components/Step3/`)

#### `buildImagePrompt` (`src/components/Step3/buildImagePrompt.ts`)

**プロンプト構築ルール (全文)**:
```
SHAPE_DESC = {
  pin:        'a slim blade-style golf putter cover',
  mallet:     'a mallet-style golf putter cover',
  neo_mallet: 'a large neo-mallet golf putter cover',
}

phrases = [
  `Apply realistic surface design to ${shape} silhouette in the input image.`,
  'Strictly preserve the silhouette and outline shape of the input.',
]
if (fabricEn  ≠ '-') phrases.push(`The body uses ${fabricEn} material.`)
if (colorEn   ≠ '-') phrases.push(`The dominant body color is ${colorEn}.`)
if (embroideryEn ≠ '-') phrases.push(`Decoration on the front is ${embroideryEn}.`)
if (hardwareEn ≠ '-') phrases.push(`Hardware finish is ${hardwareEn}.`)
if (closureEn ≠ '-') phrases.push(`Closure type is ${closureEn}.`)
phrases.push('Studio product photography, pure white background, soft diffused lighting, sharp focus, high resolution.')

return phrases.join(' ')
```

英語ラベルは `getLabel(specJson.parameters.X, value, 'en')` から取得。lining と piping は (使われていない引数として受け取るが) プロンプトには現状含めていない。

#### `generateImage` (`src/components/Step3/generateImage.ts`)

- POST `/api/generate-image` JSON: `{ prompt, imageBase64, quality: 'medium' }`
- 戻り値: `{ ok: true, dataUrl } | { ok: false, error }`
- `fetchAsBase64(url)`: `.svg` URL なら `<canvas>` で 1024×1024 PNG にラスタライズ → base64。`.png` ならそのまま base64 化

#### 線図はどう生成しているか

**ハンドドロー SVG** (`/public/lineart/{pin,mallet,neo_mallet}.svg`)。`viewBox=0 0 1024 1024`、白背景 + 黒ストロークでアウトラインを描画 (各約 30 行)。

`scripts/extract-lineart.ts` は `/public/images/*.jpg` から `image-js` + `canny-edge-detector` で抽出する将来用スクリプトとして残置。**現状の `/public/images/` はサンプルシート (複数製品の合成画像) なので自動抽出結果は使い物にならず、実際の lineart は SVG ハンドドロー**。

#### 生成画像の保管先

IndexedDB:
- ストア: `spec-automation-images` / object store `images` (idb-keyval の `createStore` で生成)
- キー: ドラフト id (1 ドラフト = 最大 1 枚、再生成で上書き)
- 値: dataUrl 文字列 (`data:image/png;base64,...`)

Step3 マウント時に `loadImage(draftId)` で復元、生成成功時に `saveImage(draftId, dataUrl)`。「破棄」ボタンで `deleteImage(draftId)`。

### Step4: 印刷用最終仕様書 / サンプル指示書 (`src/components/Step4.tsx`)

**HTML プレビュー + ブラウザ印刷ダイアログ** (`window.print()`)。**PDF ライブラリは使用していない** (jsPDF / react-pdf 等の依存はゼロ)。

**用紙設定**:
```css
@media print {
  @page { size: A4; margin: 15mm; }
}
```
= **A4 縦** 固定。**横向き指定は無し** (Layer 2-PDF 持ち越し)。

**ヘッダー切替** *(Layer 4)*:
- `documentType === 'final'` → 赤バナー「最終仕様書」
- `documentType === 'sample'` → 橙バナー「SAMPLE指示書 {ordinal(sampleRevision)}」(例: `SAMPLE指示書 1st`)

**ページ構成 (3 ページ)**:
1. **PAGE 1: パラメーター一覧** — (`documentType==='sample'` のときのみ先頭に **SAMPLE 手配欄** [出荷納期 / 客人用・東京用・工場用 数量 / 単位 / 備考 / 参考サンプル番号]) → 形状/ポジション/コンセプト/本体生地/テクスチャー/裏地/パイピング/開閉方式/主刺繍技法/本体カラー/部位別/金具仕上げ
2. **PAGE 2: 生地仕様 (布料)** — 改訂履歴 (編集可) / 縫製注意事項 (textarea) / 寸法 5 項目 (mm、master 標準値プレースホルダー + 「標準値で埋める」ボタン + 範囲外バッジ) / 製品写真 (最大 6 枚 / 初期 3 枠) / 部位別仕様表 (8 部位まで追加可、A-Z ラベル自動)
3. **PAGE 3: 刺繍・プリント・高周波 (刺绣・印刷等)** — 刺繍テーブル (技法/糸種/糸番号・カラー名/サイズ mm/配置)、技法と糸種は master `embroidery` / `thread_type` 駆動、追加可、行頭は番号自動、縫製注意事項 (PAGE 2 と**同じ `data.sewingNotes` を共有**)

**並列出力モード** *(Layer 4 Task 8)*: ヘッダー直下のチェックボックス + ドラフトピッカー。ON にして 2 つ目のドラフトを選ぶと、印刷時にプライマリの 3 ページ後ろに secondary draft の概要 (read-only パラメーター抜粋) が page-break で連結される。Layer 2-PDF で本格レイアウト最適化と横向き対応に移行 (下記 PDF 出力経路)。

#### 横向き A4 PDF 出力 *(Layer 2-PDF)*

**`@react-pdf/renderer` 4.x** を導入。Step4 のフッターに「PDF を準備」ボタンを追加 → 押下で React.lazy chunk を読み込み → 「PDF をダウンロード」(`<PDFDownloadLink>`) が表示される。

| 単一モード | 並列モード |
|---|---|
| 3 ページ (PAGE 1/2/3) | 5 ページ (p1=A+B 並列パラメーター → p2=A 生地 → p3=A 刺繍 → p4=B 生地 → p5=B 刺繍 / **ドラフト別連続**) |

- 全ページ A4 横向き (`size='A4' orientation='landscape'`)
- 日本語フォント: Noto Sans JP Regular + Bold WOFF (`/public/fonts/`、`@fontsource/noto-sans-jp` から postinstall コピー → `subset-font` で **BUSINESS_CHARSET (~2400 文字)** にサブセット化、各 ~450 KB)
- ファイル名: `generatePdfFileName(data, secondary?)` で `{productCode}_{type}{_revision}.pdf`、空時 `spec` フォールバック、並列時 `_vs_` 介入
- 既存 `window.print()` ボタン (縦向き) は別ボタンとしてフォールバック維持
- バンドル: `@react-pdf/renderer` (~1.5MB) は React.lazy で **PDF ボタン押下時のみ**ロード — 既存ユーザの初回 Step4 表示は 0 影響
- 判断記録: `docs/layer2-pdf-decisions.md` *(Layer 2-PDF)*, `docs/layer2-pdf-perf-decisions.md` *(Layer 2-PDF-perf, フォントサブセット化で生成時間 ~10s → ~1-2s)*

**印刷用 CSS**: `print:` Tailwind プレフィックス + 末尾の `<style>{`@media print {...}`}</style>`。背景色保持 (`-webkit-print-color-adjust: exact`)、`page-break-before/after`、テーブル罫線維持。

**注意点**:
- ヘッダーは「客人名 / 品番・製品名 / 発行日 / 氏名」(ブランド名は「客人名」セルに入っている。クライアント名はどこにも出ない)
- Step3 で生成した画像は `useEffect([draftId])` で「写真[0] が空のときのみ」p1 (productPhotos[0] = "正面") に自動セット
- ヘッダーラベル (`headerLabel(data)`) は documentType 駆動 (Layer 4 で対応済)。判断記録 `docs/document-type-decisions.md`

---

## 4. サンプル帳

### データソース (`src/data/samples.json`)

47 件 × `PutterSample` 型 (samples.json は `[ { ... }, ... ]` の素の配列)。

`PutterSample` の主要フィールド (`src/components/SampleBook/types.ts`):
```
PutterSample
├── sample_number, client, item_name, date
├── shape: { head_type, head_type_confidence, head_type_reason }
│   head_type ∈ {ブレード, フルマレット, セミマレット, スクエアマレット, ネオマレット}
├── size: { reference_spec, dimensions_noted }                    // テキストのまま、e.g. "W180×H150×D80mm"
├── outer_material: { fabric, color }
├── lining_material: { fabric, color }
├── closure: { type, size, detail }                                // type ∈ {マグネット, ベルクロ, FIDLOCK, ベルト, …}
├── color_scheme:
│   ├── main_color, hardware_color
│   └── tapes: { webbing_45mm, nylon_25mm, nylon_20mm, grosgrain }
├── decoration: { type, print_widths, embroidery_detail }
├── logo: { type, color, pantone }
├── packaging
└── meta: { source_pdf, image_file, needs_review, review_reason }
```

**putter-cover.json (マスタ) との不整合**:
| 項目 | spec/putter-cover.json | samples.json | 状態 |
|---|---|---|---|
| 形状 | pin / mallet / neo_mallet (3 種) | ブレード / セミマレット / フルマレット (実データ 3 種、フィルタ UI 上は 5 種選択肢) | **語彙不一致** (spec は英語 ID、samples は日本語ラベル、フィルタはさらに 5 種) |
| 開閉 | wire_spring / wire_cord / shirring / cord_stop (4 種) | マグネット / ベルクロ / FIDLOCK / ベルト 等 | **完全に別語彙** |
| 装飾 | flat / satin / tatami / tatami_3d / tatami_char / metal_plate / silicon | 刺繍 / プリント / 複合 / なし (フリーテキスト) | **完全に別語彙** |
| 寸法 | dimensions.{shape}.{name} に standard + range で構造化 | dimensions_noted 文字列のみ | **構造化レベルが違う** |

### AuthGate の保護対象

`src/App.tsx` で **3 つすべての view (`home`/`wizard`/`samples`) を `<AuthGate>` で囲んでいる**。サンプル帳専用ではなくアプリ全体のゲート。`VITE_APP_PASSWORD` を sessionStorage で記憶。

### ウィザードからの参照パス

**サンプル帳 → ウィザード遷移**: Layer 6 で実装済。サンプル詳細モーダルに「このサンプルを起点に新規作成」ボタン (Layer 4 で docType ラジオも追加)、`getShapeByAlias` で `headShape`、`sample.client` で `brandName` を seed して Route A の wizard を起動。逆方向 (wizard → sample) の参照は未実装。

---

## 5. AI 連携

### `useStep2Proposals` (`src/hooks/useStep2Proposals.ts`)

- **呼出先**: 外部 API は呼ばない (OpenAI/Anthropic いずれも未接続)
- **プロンプト全文**: 該当なし。完全にローカル処理:
  - p1 = `auto_fill[${position}_${shapeKey}]` テンプレートそのまま
  - p2 = p1 + `bodyColor` を `ALTERNATIVE_COLORS = ['black','navy','white','black_navy','red','green']` から 1 つ
  - p3 = p1 + `bodyFabric` を `pu_smooth ↔ pu_lizard` でトグル ✅ Layer 0 で `pu_shibo` から修正
  - p4 = p1 + `embroidery='tatami_3d'` + `hardwareFinish` を `matte_silver ↔ gold` でトグル ✅ Layer 0 で `silver_matte` から修正
  - p5 = `auto_fill[${SHIFT_POSITION[position]}_${shapeKey}]` (luxury↔standard, casual→standard) + フォールバック
  - 再生成: `body_fabric` × `body_color` × `embroidery` をランダムに組み合わせ、NG ルールに引っかからない 5 件
- **戻り値の構造**: 上記 [3.Step2] 参照

### `api/generate-image.ts`

- **使用モデル**: `gpt-image-1` (固定)
- **エンドポイント**:
  - `imageBase64` あり → `POST https://api.openai.com/v1/images/edits` (multipart/form-data)
  - `imageBase64` なし → `POST https://api.openai.com/v1/images/generations` (JSON)
- **入力パラメータ**:
  ```ts
  { prompt: string, quality?: 'low'|'medium'|'high'(default: 'medium'), imageBase64?: string }
  ```
  両エンドポイントとも `size: '1024x1024'`、generations は `n: 1`
- **戻り値**: OpenAI レスポンスをそのまま転送 (`response.status` + `response.json()`)。クライアント側 (`generateImage.ts`) は `data[0].b64_json` または `data[0].url` を期待
- **エラー処理**:
  - `req.method !== 'POST'` → 405
  - `OPENAI_API_KEY` 未設定 → 500 `{error:'Server misconfiguration'}`
  - `prompt` 不在 → 400
  - fetch 失敗 → 500 `{error:'Image generation failed'}` + `console.error`
- **認証**: なし (誰でも叩ける)。レートリミットなし

---

## 6. ハードコード定数の所在

### 寸法定数 (mm)

| 場所 | 内容 |
|---|---|
| `src/components/Step4.tsx:592` | `@page { margin: 15mm; }` (印刷余白) |
| `src/components/Step2/index.tsx:82` | NG メッセージ文字列 「ポリエステルテープ8mm を推奨」 |
| `src/data/spec/putter-cover.json` `dimensions.{shape}.*_mm` | 形状ごとの全長/幅/高さ/ネック長さ/ネック幅/開口部幅 の standard + range (構造化されているが**コード側で参照していない**。Step4 の寸法フィールドは空のフリー入力) |
| `src/components/SampleBook/types.ts:21-23` | `webbing_45mm`, `nylon_25mm`, `nylon_20mm` (フィールド名にハードコード) |

### 色名 / 色コード (#XXXXXX)

| 場所 | 内容 |
|---|---|
| `src/utils/specHelpers.ts:19-31` | `COLOR_HEX_MAP` (11 色: black/white/gray/light_gray/navy/black_navy/sax_blue/burgundy/pink/green/red) |
| `src/types.ts:124-127` | `initialSpecData.fabricParts[].colorSwatch = '#000000'` |
| `src/components/Step2/applyProposal.ts:18-19,27` | `colorSwatch: '#ffffff'` (裏地)、`'#cccccc'` (留め具・刺繍デフォルト) |
| `src/components/Step2/ProposalDeck.tsx:97` | `border-[#2E75B6]` `text-[#2E75B6]` `hover:bg-[#EDF4FB]` (再生成ボタン色) |
| `src/components/Step3/generateImage.ts:86` | `ctx.fillStyle = '#ffffff'` (canvas 背景) |
| `src/components/Step4.tsx` 各所 | `#cc0000`(赤ヘッダー), `#16a34a`(緑バナー), `#c8e6c9`(緑薄), `#e8e8e8`/`#f5f5f5`(灰), `#666`/`#333`/`#aaa`/`#ddd`(線/文字) |
| `src/components/SampleBook/SampleBook.tsx:8-14` | `SHAPE_STYLES` (5 形状の bg/text/border 各 hex) |

### 素材名 (putter-cover.json と外でのハードコード)

| 場所 | 内容 |
|---|---|
| `src/data/spec/putter-cover.json` `parameters.body_fabric.options` | 8 種マスタ (PU 5 種 + ニット系 3 種) |
| `src/data/spec/putter-cover.json` `parameters.lining.options` | 4 種 |
| `src/data/spec/putter-cover.json` `parameters.piping.options` | 4 種 + なし |
| `src/components/Step4.tsx:374` | placeholder 文字列「マットしぼ / PU」(参考表示のみ) |
| `src/components/SampleBook/SampleBook.tsx:298` | closure フィルタ `['マグネット','ベルクロ','FIDLOCK','ベルト']` (マスタにない語彙) |
| `src/components/SampleBook/SampleBook.tsx:304` | decoration フィルタ `['刺繍','プリント','複合','なし']` |
| `src/components/SampleBook/SampleBook.tsx:292` | shape フィルタ `['ブレード','フルマレット','セミマレット','スクエアマレット','ネオマレット']` |

### 加工方法 (普通刺繍 / 立体刺繍 / 高周波)

| 場所 | 内容 |
|---|---|
| `src/data/spec/putter-cover.json` `parameters.embroidery.options` | 7 種 (flat / satin / tatami / tatami_3d / tatami_char / metal_plate / silicon) |
| `src/components/Step4.tsx:483-489` | **PAGE 3 の刺繍テーブル `<select>` に再度ハードコード** (普通刺繍 / 普通刺繍・振り刺繍 / 畳刺繍 / 畳立体刺繍 / 文字型土台畳刺繍 / シリコンパッチ / プリント) — マスタ JSON と分断 |
| `src/components/Step4.tsx:454` | バナー文字列「3. 刺繍・プリント・高周波」 (高周波は UI 上どこにも選択肢としてない) |
| `src/components/Step4.tsx:500-503` | 糸種 `<select>` ハードコード (銀杏 / メタリック糸 / 標準刺繍糸) |
| `src/components/Step1.tsx:11-13` | ブランドサジェスト 10 件 (PEARLY GATES, フォーティーン, ツアーステージ, …) |
| `src/components/Step2/index.tsx:82,85` | NG ルールのメッセージ文字列 (knit + PU パイピング、white + ゴールド/黒ニッケル) — **マスタ JSON の `parameters.*.ng_rules` は別途定義されているが Step2 のコードでは未参照**、独自にハードコードしている |
| `src/components/Step3/index.tsx` `LINEART_PATH` | `{pin: '/lineart/pin.svg', mallet: '...', neo_mallet: '...'}` |

### マスタとコードのハードコード重複 (不一致リスト)

1. ✅ **NG ルール** *(Layer 0 で解消)*: `putter-cover.json` の `parameters.*.ng_rules` に構造化 `match` を追加し、`src/utils/ngRules.ts` の `evaluateNgRules` が JSON を読んで判定するように一元化。Step2/index.tsx の独自 NG 関数と useStep2Proposals.ts の `getProposalWarnings` は同関数を呼ぶだけになり、コード側ハードコードは消滅。
2. ✅ **刺繍技法 / 糸種** *(Layer 2 で解消)*: master `parameters.embroidery.options` に `print` を追加 (8 値に拡張)、`parameters.thread_type` を新規追加 (3 値: standard / metallic / ginnan)。Step4 PAGE 3 の `<select>` は `getOptions('embroidery')` / `getOptions('thread_type')` で master 駆動。判断記録: `docs/embroidery-options-decision.md`。
3. ✅ **形状** *(Layer 2 で解消)*: master `head_shape.options[].aliases` を追加 (`pin: ['ブレード','ピン','blade',...]` 等)、`getShapeByAlias()` で外部語彙 (samples の「ブレード」「セミマレット」「フルマレット」) を master value に正規化。SampleBook の shape filter は master の `label` で表示し、絞込は alias 経由。
4. ✅ **`useStep2Proposals` の値ずれ** *(Layer 0 で解消)*: `pu_shibo` → `pu_lizard`、`silver_matte` → `matte_silver` に修正。`src/hooks/useStep2Proposals.test.ts` で全提案がマスタに存在する value のみを参照することを保証。
5. ✅ **SampleBook フィルタ語彙** *(Layer 2 で解消)*: `closure` / `decoration` フィルタは samples.json と master が完全別語彙のため独立カテゴリと判断 (判断記録: `docs/sample-book-vocabulary-mapping.md`)。`getSampleClosureTypes` / `getSampleDecorationTypes` で samples.json から動的算出。「スクエアマレット」「複合」のような phantom 値は自動的に消滅。
6. ✅ **寸法 default** *(Layer 2 で解消)*: master `dimensions.{shape}.{name}.standard` / `range` を `getDimensionDefault` / `isDimensionOutOfRange` から参照。Step4 寸法フィールドは placeholder で master 標準値を表示、「標準値で埋める」ボタン、範囲外 warning バッジを実装。

---

## 7. テスト整備状況

### 既存テストファイル一覧

| ファイル | 件数 | 内容 |
|---|---|---|
| `src/utils/specHelpers.test.ts` | 33 | `getLabel`, `getColorHex`, `getOptions`, `getDimensionDefault`/`Range`/`isDimensionOutOfRange`, `getShapeByAlias`, `getOptionValueByAlias` *(Layer 6 hotfix)*, `generatePdfFileName` *(Layer 2-PDF)* |
| `src/components/SampleBook/AuthGate.test.tsx` | 3 | 未認証フォーム表示、誤パスワード alert、正パスワード通過 |
| `src/components/SampleBook/sampleHelpers.test.ts` *(Layer 2)* | 3 | `getSampleClosureTypes` / `getSampleDecorationTypes` の動的算出 + 重複除去 + 空入力 |
| `src/components/SampleBook/SampleBook.test.tsx` *(Layer 6 hotfix)* | 5 | pick モード時のカード button 表示 / browse モードで非表示 / onPickSample なしで非表示 / button click で modal 開かず / カード body click でモーダル開く |
| `src/components/Step2/applyProposal.test.ts` | 6 | piping=none で 5 件、piping あり で 6 件、baseProposal 保存、buildFabricParts、diffFromProposal |
| `src/components/Step2/index.test.tsx` *(Layer 6 UX fix + fix-2)* | 24 | Route A 自動提案実行の 7 条件分岐 + GuideBanner の 8 表示パターン *(UX fix)* + position 未設定 fallback の 9 ケース (空/undefined/空白のみ / 設定済で非表示 / Route A・B ガイド抑制 / onStepChange(1) / onStepChange なしでボタン非描画 / Route A position 空でも auto-gen 抑制) *(UX fix-2)* |
| `src/components/Step3/buildImagePrompt.test.ts` | 4 | shape 反映、bodyFabric 空時のスキップ、英語ラベル使用、unknown shape の fallback |
| `src/components/Step3/imageSource.test.ts` *(Layer 4)* | 6 | `deriveUploadSource` (sample→manual / final→photo) / `imageSourceLabel` / `readFileAsDataUrl` (上限拒否 + 小ファイル可) |
| `src/hooks/useSpecDrafts.test.ts` | 19 | create / save / load / duplicate / delete / 不正 JSON / 旧 colorA-D マイグレーション + Route A/B/C `createDraft(route, seed)` *(Layer 6)* + Layer 4 documentType ミラー + 旧ドラフト→final マイグレーション + `promoteRevision` 3 ケース + `promoteToFinal` 4 ケース |
| `src/hooks/useStep2Proposals.test.ts` *(Layer 0)* | 3 | p3/p4 が putter-cover.json に存在する value のみを参照することを保証 |
| `src/utils/ngRules.test.ts` *(Layer 0)* | 8 | knit+pu_10/pu_15、PU+pu_10、white+gold、white+black_nickel、black+gold、match なしルールの skip、`hasViolation` |
| `src/components/Home/RouteSelector.test.tsx` *(Layer 6 + 4)* | 5 | A/B/C 各カードのレンダリングとクリックハンドラ、Route B 無効化、Route C ラジオ既定値 + Route C ラジオ切替 *(Layer 4)* |
| `src/components/Home/DraftPickerModal.test.tsx` *(Layer 6 + 4)* | 5 | 空状態 / 行選択+確認 (inherit) / 確認ボタン disabled / 「最終仕様書として作成」ラジオ (sample 起点限定) / 閉じるボタン |
| `src/components/Step1.test.tsx` *(Layer 6)* | 5 | OriginBadge: 旧ドラフト (バッジなし) / Route A / Route B with lookup / Route B fallback / Route C |
| `src/components/Step4/pdf/SpecSheetPdf.test.tsx` *(Layer 2-PDF)* | 9 | A4 landscape / 単一 3 ページ / 並列 5 ページ / 並列 PAGE 1 が A+B 並列 / SAMPLE 手配欄の sample-only 表示 / ヘッダー文言 sample / final / ドラフト別連続のページ順 / `p.X/Y` カウンタ |
| `scripts/data/charset.test.ts` *(Layer 2-PDF-perf)* | 6 | ASCII / Hiragana / Katakana 全網羅、業務固有漢字、重複なし、>2000 chars |
| `scripts/subset-fonts.test.ts` *(Layer 2-PDF-perf)* | 6 | Regular/Bold subset の存在 / フル WOFF より顕著に小さい / <1MB |
| `src/data/templates/helpers.test.ts` *(Layer 3a + 3b)* | 22 | (3a 12 件) + (3b 10 件: catalog 全 template の `anglePromptPhrases` / `promptShapeDescription` / `getAnglePromptPhrase` 2 件 / `getPositionPromptPhrase` 5 件 / NEGATIVE_PROMPT_PHRASE 1 件) |
| `src/components/Step3/index.test.tsx` *(Layer 3a)* | 8 | テンプレ select / blade 4 アングル / アングル切替 / pending バナー + 3 アングル disable / blade 切替 CTA / SVG フォールバック |
| `src/components/Step3/buildImagePrompt.test.ts` *(Layer 3a + 3b)* | 20 | (3a 4 件 を 3b で再構成) shape 統合 3 件 + 属性 4 件 + angle 6 件 + position 4 件 + ネガ 1 件 + lining 文混入 / 不混入 / templateId override / 未知 position skip 等 |
| 合計 | **197** | 全 pass |

### 手厚い箇所
- 純関数 (`applyProposal`, `getLabel`, `buildImagePrompt`)
- ドラフト CRUD (`useSpecDrafts`)
- 認証ゲート

### 薄い / 未整備の箇所

| 箇所 | テスト |
|---|---|
| `Step1`, `Step2/index.tsx` (UI 結合), `Step3/index.tsx` (UI 結合), `Step4` (印刷 HTML) | **0** |
| `useStep2Proposals` (提案生成のロジック) | **0** |
| `SampleBook` (フィルタ / モーダル / カード) | **0** |
| `Home/Home.tsx`, `Home/DraftList.tsx` | **0** |
| `imageStore` (IndexedDB ラッパ) | **0** |
| `generateImage` (fetch ラッパ、SVG ラスタライズ) | **0** |
| `api/generate-image.ts` (OpenAI 連携) | **0** |
| Step4 印刷スタイル / page-break / @page A4 | **0** (snapshot/視覚回帰なし) |

---

## 8. ギャップ分析 (前回議論との対応)

> 前回議論の詳細を私 (この調査セッション) は持っていないため、コード側で発見できた範囲で「実装あり/なし」を記載。「前回議論」の合意事項リストを別途共有してもらえれば再評価する。

| 議題 | 実装状況 | 場所 / 補足 |
|---|---|---|
| 横向き A4 PDF 出力 | ✅ 実装済 *(Layer 2-PDF)* | `@react-pdf/renderer` 4.x で `src/components/Step4/pdf/SpecSheetPdf.tsx` を新規追加、全ページ横向き、`generatePdfFileName` で命名、React.lazy で遅延ロード。`window.print()` 縦向きはフォールバックとして並存。詳細 `docs/layer2-pdf-decisions.md` |
| サンプル指示書 vs 最終仕様書 (テンプレ切替) | ✅ 実装済 *(Layer 4)* | `SpecData.documentType` ('sample'\|'final') + `sampleRevision` + `promoteRevision` / `promoteToFinal` + Step4 ヘッダー駆動 + SAMPLE 手配欄 + DraftList バッジ。詳細 `docs/document-type-decisions.md` |
| 3 ルート起点判定 (A/B/C) | ✅ 実装済 *(Layer 6)* | `SpecData.originRoute` + `createDraft(route, seed)` + Home の `RouteSelector` + `DraftPickerModal` + Step1 の `OriginBadge`。詳細 `docs/route-design-decisions.md` |
| マスタ DB 分離 | △ 部分的 | `src/data/spec/index.ts` で `domains` Record + `DomainKey = 'putter-cover'` の枠は用意済。実体は putter-cover.json 1 件のみ。コード側ではどこも `specJson` 直 import (= 単一ドメイン固定) で、ドメイン切替 UI / state 不在 |
| 過去サンプル参照 (SampleBook → Wizard) | ❌ 未実装 | SampleBook のカード/モーダルから wizard を起動する経路なし。逆方向の参照もなし |
| リビジョン管理 | △ 限定的 | `data.revisionHistory: Array<{date, content}>` は存在し、Step4 PAGE 2 で編集可能テーブルになっている。**ただし「過去仕様書スナップショットの差分」ではなく自由入力の改訂メモ**。version の自動採番なし、過去版へのロールバック / 比較機能なし |
| A/B 案併記 | △ 最小実装 *(Layer 4 Task 8)* | Step4 ヘッダーに「並列出力モード」チェック + secondary draft picker。印刷時は primary 3 ページ + secondary の概要ページが page-break で連結される。3 件以上 / 横並びレイアウトは Layer 5 / Layer 2-PDF 持ち越し |
| (補足) 自動保存 | ✓ 実装済 | App.tsx で 300ms debounce |
| (補足) ドラフト一覧 | ✓ 実装済 | `Home/`, `useSpecDrafts` |
| (補足) 画像生成 | ✓ 実装済 | Step3 + IndexedDB |
| (補足) AI 提案 | ✓ ローカルのみ | useStep2Proposals (外部 API なし) |
