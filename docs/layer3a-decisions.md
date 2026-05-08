# Layer 3a: 型カタログ整備とアングル選択 UI 設計記録

> パターカバーの **型 (template)** を一級概念として導入し、Step3 を「型 +
> アングル + デザイン」の構造に拡張した際の判断記録。ブレード型は提供
> 素材 (FOURTEEN TSUNOJI ベースの線図、4 アングル分の PNG) で完成、
> セミマレット・フルマレットは Phase B 線画化への枠だけ用意。

---

## 1. カタログの所在 (`src/data/templates/`)

| ファイル | 役割 |
| --- | --- |
| `catalog.json` | 型カタログ本体 (3 件: blade / semi_mallet / full_mallet) |
| `types.ts` | TypeScript 型定義 (`TemplateAngle` / `TemplateEntry` 等) |
| `helpers.ts` | 検索ヘルパー (`getTemplateById` / `getTemplateByHeadShape` 他) |
| `helpers.test.ts` | 12 件のユニットテスト |

`putter-cover.json` (仕様書スキーマ) と `catalog.json` (型カタログ) は
独立に保つ。前者は Step1〜4 のフォーム検証 / プロポーザル生成、後者は
Step3 の線画 + 寸法プリセット + サンプル参照を担う。両方を 1 ファイルに
入れると、線画追加で仕様書スキーマのテストが走り直す副作用が出るので
分離した。

## 2. 命名 — `subType` は SampleBook 語彙、`headShape` は master 語彙

サンプル帳 (`samples.json`) の `head_type` は日本語ラベル
(「ブレード」「セミマレット」「フルマレット」) で、
master `head_shape.options[].value` は英語スネークケース
(`pin` / `mallet` / `neo_mallet`)。catalog `subType` は **3 つ目の語彙**
である `blade` / `semi_mallet` / `full_mallet` を使う。

3 通りも持つ理由:

| 語彙 | 由来 | 用途 |
| --- | --- | --- |
| 日本語 (`ブレード` 等) | サンプル帳の生データ (確信度判定 + 表示) | 表示・フィルタ |
| `pin` / `mallet` / `neo_mallet` | master が「ピン型 (= ブレード型)」と社内呼称を採用 | フォーム入力 / プロポーザル / NG ルール |
| `blade` / `semi_mallet` / `full_mallet` | カタログ ID とプレフィックス (`putter-blade`) を素直に揃えた | 型ファイル名・PNG パス |

これらをコード横断で混ぜないため、ブリッジは `helpers.ts` に閉じる:

```ts
const HEAD_SHAPE_TO_SUB_TYPE: Record<string, string> = {
  pin: 'blade', mallet: 'semi_mallet', neo_mallet: 'full_mallet',
};
getTemplateByHeadShape(headShape) // master → catalog
getTemplateBySubType(subType)     // SampleBook → catalog
```

サンプル帳の日本語ラベルは既存の `getShapeByAlias()` で master 値に変換
してから `getTemplateByHeadShape` に渡す (App.tsx の Route A シードを参照)。
Step1 → Step3 の 1 路だけブリッジを通せば、サンプル帳側のテストも
catalog 側のテストも独立に書ける。

## 3. アングルは固定 4 つ (`front` / `side_toe` / `back` / `side_heel`)

リテラル union で固定。理由:

- ChatGPT で線画化する Phase B のディレクションが安定する (4 アングル
  以外を提供されてもカタログでは扱えない)
- prompt フレーズも 4 種で済む (`ANGLE_PROMPT_PHRASES`)
- UI のタブが 4 つで決まる (横スクロール不要)

将来 5 つ目 (例: `top`) を増やすときは `TemplateAngle` に追加 +
`ANGLE_DISPLAY_NAMES` / `ANGLE_PROMPT_PHRASES` に追記、catalog の
`baseImages` に PNG パス追加で済む。

## 4. `pending_lineart` の UX

セミマレット・フルマレットは現状 `baseImages: {}`。Phase B で線画化
するまで:

| 状態 | 振る舞い |
| --- | --- |
| 型 select | 表示 (`(線画準備中)` サフィックス付き) |
| amber バナー | 「線画準備中。今は前面アングルのみ利用、表示は SVG フォールバック」 + 「ブレード型に切り替える」CTA (44pt タッチターゲット) |
| アングルタブ | `front` のみ enabled、他 3 つは disabled (gray bg) |
| 線図表示 | 既存 `/public/lineart/{shape}.svg` (Layer 6 の SVG ハンドドロー) |
| 画像生成 | 動作する (フォールバック SVG を base64 化して image-edit に渡す) |

「ブレード型に切り替える」CTA は **本格運用までの逃げ道**。
ブレード型の試作で UI のフィードバックを集めてから Phase B に回せる
よう、フローを止めない設計にした。

## 5. SpecData への追加 (`templateId` / `selectedAngle`)

両方 optional:

```ts
templateId?: string;        // 'putter-blade' 等。未指定なら headShape からフォールバック
selectedAngle?: TemplateAngle;  // 既定は 'front'
```

`templateId` が未指定の場合は `getTemplateByHeadShape(data.headShape)`
で都度導出する。これにより Layer 3a 以前のドラフトを開いても
何も migrate せずに動く (旧ドラフトには `templateId` が無いだけで、
Step3 に入れば `headShape` から自動選択される)。

Route A (SampleBook 起点) では `App.tsx` がシード時に
`templateId: getTemplateByHeadShape(headShape)?.id` をセットする。
これにより Step3 を開いた瞬間にすでに正しい型が選ばれている状態に
なる。

## 6. プロンプトへのアングル注入

`buildImagePrompt(data, angle?)` の第 2 引数で英語フレーズを差し込む:

```
"Apply realistic surface design to a slim blade-style golf putter cover
 (front view) silhouette in the input image. Strictly preserve ..."
```

カッコ内に短く `front view` / `toe-side view` / `back view (opening side)`
/ `heel-side view`。`ANGLE_PROMPT_PHRASES` で一元管理。

`angle` を省略するとフレーズは付かず、Layer 2-PDF までと完全に同じ
プロンプトになる (後方互換)。

## 7. テスト戦略

| ファイル | 件数 | カバレッジ |
| --- | --- | --- |
| `src/data/templates/helpers.test.ts` | 12 | カタログ全件 / id / subType / headShape ブリッジ / category / 完成のみフィルタ / hasAngle / getAvailableAngles / メタデータ / 部位 A-F / ラベルマップ |
| `src/components/Step3/index.test.tsx` | 8 | select 描画 / blade で 4 アングル enable / select 切替で updateData / アングルクリックで updateData / アングル切替で画像 src 切替 / pending で 3 アングル disable + バナー / blade 切替 CTA / pending での SVG fallback |

合計 20 件追加 (要求 ≥ 13)。`buildImagePrompt.ts` のシグネチャ拡張は
既存テスト 4 件で後方互換を確認。

## 8. 触らなかったもの (スコープ外)

- **画像生成 API** (`api/generate-image.ts`) — angle 引数は prompt に
  混ぜるだけで API 形は不変
- **IndexedDB の保存スキーマ** — 1 ドラフト = 1 画像のまま (Layer 3b で
  アングルごと保存を検討)
- **putter-cover.json** の `head_shape.options` — master の値は維持
- **線画 SVG** (`/public/lineart/{pin,mallet,neo_mallet}.svg`) — pending
  時のフォールバックで使うので残置
- **印刷レイアウト (Step4 / SpecSheetPdf)** — テンプレ反映は次の
  Layer で

## 9. Phase B / 次の Layer への申し送り

| 項目 | やること |
| --- | --- |
| Phase B (Layer 3a-2) | サンプル帳の代表セミマレット / フルマレット 1 件ずつを ChatGPT で線画化 → 4 アングル PNG → `public/templates/putter-{semi-mallet,full-mallet}/*.png` 配置 → catalog の `baseImages` を埋めて `lineArtStatus: 'complete'` |
| Layer 3a-prep | 上記 ChatGPT 線画化の自動化スクリプト (`scripts/extract-template-lineart.ts`) |
| Layer 3b | プロンプトテンプレート (型 × ポジションごと)、生成画像のアングル別保存 |
| Layer 3c | 部位マスク / 編集機能 |
| ヘッドカバー (Layer 3a-3) | パターカバー以外の category (フェアウェイウッド / ハイブリッド) を catalog に追加 |
