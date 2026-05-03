# Layer 0 完了 → Layer 2 への申し送り

> 作成日: 2026-05-03 / Layer 0 完了コミットの上に Layer 2 を積み上げる前提。
> ベース: `claude/layer0-tech-debt` (PR base = `claude/organize-system-architecture-KXG4i`)

## Layer 0 で解消したこと

- ✅ `useStep2Proposals` の `pu_shibo` / `silver_matte` 値ずれ → `pu_lizard` / `matte_silver` に修正
- ✅ `SpecJson` 型が実 JSON を部分的にしかカバーしていなかった → `dimensions`, `combinations_count`, `sample_combinations`, `SpecOption.feature`, `SpecParameter.ng_rules`, `NgRule`, `NgRuleMatch`, `DimensionSpec` を型に追加
- ✅ `SpecData` のデッドフィールド `colorA / colorB / colorC / colorD` を削除。`useSpecDrafts.migrateSpecData` で旧ドラフトのフィールドを除去するマイグレーション付き
- ✅ NG ルールの 3 重実装 (`Step2/index.tsx` 独自関数 / `useStep2Proposals.getProposalWarnings` 独自関数 / `putter-cover.json` 未消費の文字列ルール) を `src/utils/ngRules.ts` の `evaluateNgRules` に集約。JSON の `ng_rules` に構造化 `match` を持たせる形で運用

## Layer 2 (マスタ JSON 参照の一元化) への申し送り

### 既知の残課題 (この PR ではあえて触らなかったもの)

1. **Step4 PAGE 3 の刺繍技法 `<select>`** (`src/components/Step4.tsx:483-489`) が日本語ラベル直書きで `putter-cover.json` の `parameters.embroidery.options` と分離されている → Layer 2 でマスタ参照に統一推奨。糸種 `<select>` (Step4.tsx:500-503) も同様
2. **形状の語彙不統一**: `pin` (master) / 「ピン型（ブレード型）」(Step1 表示) / 「ブレード」(SampleBook フィルタ) / `samples.json` の `head_type` (= ブレード/フルマレット/セミマレット) — Layer 2 で正規化辞書 (`master_value ↔ sample_label`) を整備するか、サンプル帳のフィルタを samples.json から動的算出
3. **closure / decoration の語彙ずれ**: SampleBook フィルタの「マグネット / ベルクロ / FIDLOCK / ベルト」「刺繍 / プリント / 複合 / なし」が master の `closure.options` (wire_spring / wire_cord / shirring / cord_stop) と完全に別語彙
4. **`closure.ng_rules` の `magnet_only`** は対応する value がないため `match` を未設定で残置 (note 付き)。closure に magnet を追加する仕様変更が来たら `match: { closure: 'magnet' }` を付与
5. **putter-cover.json の `dimensions`** が型定義済みだが、Step4 の寸法フィールド (全長 / 幅 / 高さ etc) は空のフリー入力で master を参照していない → Layer 2 で「形状を選んだら寸法 default を埋める」UX に拡張可能
6. **`SpecJson` 型と JSON のキー順** に注意。JSON は `meta → parameters → auto_fill → dimensions → combinations_count → sample_combinations` の順で書かれており、optional のキーは末尾。Layer 2 でファイル分割するときも後方互換のためこの順を守ると差分が見やすい

### Layer 2 着手前に確定したい意思決定 (`docs/QUESTIONS.md` §A 参照)

- マスタの最終保存先 (localStorage / リモート DB / GitHub PR ベース / 管理画面付き)
- マスタ更新時、過去仕様書 (drafts) が参照する値はスナップショット固定か追従か
- 追加するドメインの parameters の形が putter-cover と異なるか (動的フォーム生成が必要か)
- `Step4` の `<select>` を JSON 駆動にする際、新マスタは英語 ID (現行) か日本語ラベル (現 Step4 select) のどちらをキーにするか

### 触らないと約束したファイル (Layer 0 のスコープ外)

- `api/generate-image.ts`
- `src/components/Step3/generateImage.ts` の OpenAI 呼出周り
- `src/lib/imageStore.ts` (IndexedDB 保存形式)
- 既存 Step UI の見た目 / 操作フロー (NG メッセージ表示位置・Step2 の警告ボックスのデザイン等)

## Layer 0 動作確認結果

- `npm run lint`: 0 エラー
- `npm test`: 38 件全 pass (Layer 0 で +12 件)
- `npm run build`: 型エラー 0
- `npm run dev`: HTTP 200 で起動成功 (smoke 確認のみ、UI 手動確認は Desktop 側で要再確認)
