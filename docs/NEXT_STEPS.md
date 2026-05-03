# Layer 0 + Layer 2 完了 → Layer 6 への申し送り

> 直近完了レイヤ:
> - Layer 0: `claude/layer0-tech-debt` (PR #1) → `claude/organize-system-architecture-KXG4i` にマージ済
> - Layer 2 (B: コード参照の一元化): `claude/layer2-master-json-unified` (本 PR)

---

## Layer 0 で解消したこと

- ✅ `useStep2Proposals` の `pu_shibo` / `silver_matte` 値ずれ → `pu_lizard` / `matte_silver` に修正
- ✅ `SpecJson` 型が実 JSON を部分的にしかカバーしていなかった → `dimensions`, `combinations_count`, `sample_combinations`, `SpecOption.feature`, `SpecParameter.ng_rules`, `NgRule`, `NgRuleMatch`, `DimensionSpec` を型に追加
- ✅ `SpecData` のデッドフィールド `colorA / colorB / colorC / colorD` を削除。`useSpecDrafts.migrateSpecData` で旧ドラフトのフィールドを除去するマイグレーション付き
- ✅ NG ルールの 3 重実装 (`Step2/index.tsx` 独自関数 / `useStep2Proposals.getProposalWarnings` 独自関数 / `putter-cover.json` 未消費の文字列ルール) を `src/utils/ngRules.ts` の `evaluateNgRules` に集約

## Layer 2 で解消したこと

- ✅ Step4 PAGE 3 の刺繍技法 / 糸種 `<select>` を master 駆動化。master に `print` 追加 + 新規 `parameters.thread_type` 追加。判断記録: `docs/embroidery-options-decision.md`
- ✅ 寸法フィールドの master デフォルト適用 (`getDimensionDefault` / `isDimensionOutOfRange` + Step4 placeholder + 「標準値で埋める」ボタン + 範囲外 warning バッジ)
- ✅ `head_shape.options[].aliases` 機構 + `getShapeByAlias` を追加し、samples の「ブレード/セミマレット/フルマレット」を master `pin/mallet/neo_mallet` に正規化
- ✅ SampleBook の closure / decoration フィルタを samples.json から動的算出 (`getSampleClosureTypes` / `getSampleDecorationTypes`)。判断記録: `docs/sample-book-vocabulary-mapping.md`
- ✅ ハードコードされていた phantom 値 (`スクエアマレット` / `複合` 等) は自動的に消滅

これで **JSON が単一の真実 (Single Source of Truth) になり、コード内に同じ語彙を持つ箇所はなくなった**。Layer 6 (3 ルート起点判定) や将来のドメイン追加・Excel 取込・UI 動的化の準備が整った状態。

---

## Layer 6 (3 ルート起点判定 A/B/C) への申し送り

### Layer 6 着手前に確定したい意思決定

`docs/QUESTIONS.md §D` 参照。仕様自体が私には未共有。最低限以下を確定してから着手:

1. **A/B/C ルートの定義**: 例) A=新規企画 / B=過去サンプル踏襲 / C=部分流用
2. **判定の入力**: ユーザーが選ぶ / システムが推測 / 両方
3. **判定タイミング**: ホームで新規作成時 / Step1 / 任意
4. **判定後の分岐**: 通る Step が違うか / 同じ Step で挙動が違うか / 出力フォーマットが違うか
5. **既存資産との関係**: SampleBook (= 過去サンプル) からウィザード起動の経路を作るか (B/C ルートの起点として?)

### Layer 6 着手時に活用できる Layer 2 の成果

- `getShapeByAlias` で sample 起点の値を master value に正規化済 → SampleBook → Wizard の橋渡しに使える
- `closure` フィルタが master と分離されているので、sample 起点ルートの語彙が独立に保たれている (B/C ルートで sample 語彙のまま扱える)
- `dimensions.standard` が参照可能 → 「過去サンプルに近い形状」を選んで起点にする UX で寸法 default が即埋まる

---

## Layer 4 (サンプル指示書テンプレート) への申し送り

### 残課題

- master `closure.ng_rules` の `magnet_only` は対応 value がないため `match` を未設定で残置 (note 付き)。仕様変更で `magnet` を追加するなら `match: { closure: 'magnet' }` を付与
- 7 件の既存仕様書 PDF 実データ確認はこのセッションでは実施できないので、Desktop 側で手作業で master の刺繍技法を再点検する必要あり (`docs/embroidery-options-decision.md §5` 参照)
- 「振り刺繍 (= satin)」と `metal_plate` が実務で使われているか不明 → 使われていなければ master から削除候補

---

## Layer A (ストレージ分離 + マスタ編集 UI) への申し送り

### 着手前に必要な意思決定 (`docs/QUESTIONS.md §A` 参照)

1. マスタの最終保存先 (localStorage / Supabase / Vercel KV / GitHub PR / 管理画面付き)
2. マスタ編集の権限境界 (誰が編集できるか)
3. バージョニング / 過去ドラフトの追従ポリシー (スナップショット固定 vs. 追従)
4. 複数ドメイン化のときに parameters の形が違うか (動的フォーム生成が必要か)

### Layer 2 で整った前提

- すべての master 参照点が `src/utils/specHelpers.ts` (`getLabel` / `getOptions` / `getDimensionDefault` / `getShapeByAlias` 等) と `src/utils/ngRules.ts` に集約された
- → **これらの関数の入口を JSON import から fetch / DB 経由に差し替えるだけで A への移行が可能**な状態

---

## 触らないと約束したファイル / 領域 (Layer 0 + Layer 2 共通スコープ外)

- `api/generate-image.ts`
- `src/components/Step3/generateImage.ts` の OpenAI 呼出周り
- `src/lib/imageStore.ts` (IndexedDB 保存形式)
- 既存 Step UI の見た目 / 操作フローの根本的な書き換え
- マスタ編集 UI / ストレージ分離

---

## 動作確認結果 (Layer 2 PR 時点)

- `npm run lint`: 0 エラー
- `npm test`: **56 件全 pass** (Layer 0 + Layer 2 で +30 件)
- `npm run build`: 型エラー 0
- `npm run dev`: HTTP 200 で起動成功 (smoke 確認のみ、UI 手動確認は Desktop 側で要再確認)

### Desktop 側での再確認推奨ポイント

1. Step4 で刺繍技法を変更 → master の 8 オプション (flat/satin/tatami/tatami_3d/tatami_char/metal_plate/silicon/print) が表示される
2. Step4 寸法フィールドの placeholder が master 標準値を表示する (例: 形状=pin で全長フィールド placeholder = 200)
3. 「標準値で埋める」ボタンで全長/幅/高さの 3 項目が埋まる (縁巻き幅 / 刺繍位置 は master に標準値がないため埋まらない)
4. SampleBook の shape filter で「ピン型（ブレード型）」を選ぶと sample の `head_type === 'ブレード'` が出る
5. SampleBook の closure / decoration filter は samples.json の実値 (マグネット/ベルクロ/FIDLOCK/ベルト + 刺繍/プリント/なし) のみが選択肢になっている (旧「スクエアマレット」「複合」は消えている)
