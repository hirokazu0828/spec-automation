# Layer 0 + Layer 2 + Layer 6 完了 → Layer 4 への申し送り

> 直近完了レイヤ:
> - Layer 0: `claude/layer0-tech-debt` (PR #1) → `claude/organize-system-architecture-KXG4i` にマージ済
> - Layer 2 (B: コード参照の一元化): `claude/layer2-master-json-unified` (PR #2) → 同上にマージ済
> - Layer 6 (3 ルート起点判定 A/B/C): `claude/layer6-three-routes` (本 PR)

---

## Layer 0 で解消したこと

- ✅ `useStep2Proposals` の `pu_shibo` / `silver_matte` 値ずれ
- ✅ `SpecJson` 型の拡張 (`dimensions`, `combinations_count`, `NgRule`, `DimensionSpec` 等)
- ✅ `SpecData.colorA-D` デッドフィールド削除 + `migrateSpecData`
- ✅ NG ルールを `src/utils/ngRules.ts` に一元化

## Layer 2 で解消したこと

- ✅ Step4 PAGE 3 の刺繍技法 / 糸種 `<select>` を master 駆動化 (master に `print` + 新規 `parameters.thread_type`)
- ✅ 寸法フィールドの master デフォルト適用 (`getDimensionDefault` + 標準値で埋めるボタン + 範囲外 warning)
- ✅ `head_shape.options[].aliases` + `getShapeByAlias` で外部語彙正規化
- ✅ SampleBook の closure / decoration フィルタを samples.json から動的算出
- ✅ master JSON が **Single Source of Truth** に到達

## Layer 6 で実装したこと

- ✅ `SpecData.originRoute / originSampleId / originDraftId` を追加 (optional、旧ドラフトはマイグレーションで未定義のまま温存)
- ✅ `useSpecDrafts.createDraft(route?, seedData?)` に拡張 (旧 `createDraft()` 呼び出しは引数なしで後方互換)
- ✅ Home に 3 ルート選択 UI (`RouteSelector` + `DraftPickerModal`)
- ✅ ルート A: SampleBook を `mode='pick'` で開く → 詳細モーダル「このサンプルを起点に新規作成」 → `getShapeByAlias` で `headShape`、`client` で `brandName` を seed
- ✅ ルート B: 既存ドラフト一覧モーダルから選択 → 完全コピー + productCode/issueDate/revisionHistory リセット
- ✅ ルート C: 白紙、`originRoute='C'` のみ記録
- ✅ Step1 上部に起点バッジ表示 (A=サンプル番号 / B=複製元品番 (lookup) / C=新規作成)
- ✅ `mode='browse'` (ホーム右上「サンプル帳を開く」) でも詳細モーダルから起点作成可能 (オーポチュニスティック起点)

判断記録: `docs/route-design-decisions.md` (seed 範囲、後方互換、UI 分岐の根拠)

これで「ホームから 3 種の入口で Wizard を起動できる」状態に到達。Step 構造は不変、初期値だけがルート別に変わる。

---

## Layer 4 (サンプル指示書テンプレート) への申し送り

### 期待される実装範囲

`docs/QUESTIONS.md §B` 参照。最低限以下を確定してから着手:

1. 「サンプル指示書」と「最終仕様書」のページ構成・載せる情報の差分
2. 共通 SpecData vs テンプレ固有フィールドの境界
3. テンプレ切替の UI 場所 (ホーム新規作成時 / Step1 / Step4)
4. 出力先 (PDF ダウンロード / ブラウザ印刷 / メール / Box アップロード)
5. A4 横向きが必要なテンプレはどれか

### Layer 4 着手時に活用できる Layer 6 の成果

- `SpecData.originRoute` で起点が分かるので、**ルート A (サンプル踏襲) のときだけサンプル指示書テンプレを既定にする**等の自動切替ロジックが組める
- `originSampleId` で起点サンプル番号にトレースバック可能
- 起点バッジを拡張すれば、テンプレ種別バッジも同じ場所に並べられる

### Layer 4 着手前の整理事項

- master `closure.ng_rules` の `magnet_only` (Layer 0 で `match` 未設定で残置) は仕様変更があれば付与
- 7 件の既存仕様書 PDF 実データ確認 — Desktop で過去 PDF を見ながら master の刺繍技法を再点検 (`docs/embroidery-options-decision.md §5` 参照)
- 「振り刺繍 (= satin)」「`metal_plate`」が実務で使われているか検証

---

## Layer A (ストレージ分離 + マスタ編集 UI) への申し送り

### 着手前に必要な意思決定 (`docs/QUESTIONS.md §A`)

1. マスタの最終保存先 (localStorage / Supabase / Vercel KV / GitHub PR / 管理画面付き)
2. マスタ編集の権限境界 (誰が編集できるか)
3. バージョニング / 過去ドラフトの追従ポリシー (スナップショット固定 vs. 追従)
4. 複数ドメイン化のときに parameters の形が違うか (動的フォーム生成が必要か)

### Layer 2 + 6 で整った前提

- すべての master 参照点が `src/utils/specHelpers.ts` (`getLabel` / `getOptions` / `getDimensionDefault` / `getShapeByAlias` 等) と `src/utils/ngRules.ts` に集約済み
- `useSpecDrafts.createDraft` がルート + seed を受け取る設計なので、将来「マスタ更新時に過去ドラフトをマイグレーション」する関数を `createDraft` 経由で挟むのも容易

---

## 触らないと約束したファイル / 領域 (全 Layer 共通スコープ外)

- `api/generate-image.ts`
- `src/components/Step3/generateImage.ts` の OpenAI 呼出周り
- `src/lib/imageStore.ts` (IndexedDB 保存形式)
- 既存 Step UI の根本的な書き換え
- マスタ編集 UI / ストレージ分離

---

## Layer 6 PR 時点の動作確認

- `npm run lint`: 0 エラー
- `npm test`: **71 件全 pass** (Layer 0 + Layer 2 + Layer 6 で +45 件)
- `npm run build`: 型エラー 0
- `npm run dev`: HTTP 200 (smoke)

### Desktop 側で要再確認のポイント

1. Home に 3 つの起点カード (A/B/C) が並ぶ。Route B はドラフト 0 件のとき disable
2. **Route A**: ホーム「[A]」 → SampleBook が pick モードバナー付きで開く → サンプル詳細モーダルの「このサンプルを起点に新規作成」 → Step1 で headShape (master 値) と brandName (sample.client) が埋まり、上部に「🅰 起点: サンプル {sample_number}」バッジ
3. **Route B**: ホーム「[B]」 → DraftPickerModal で既存ドラフトを選択 → Step1 で全項目 seed、品番/発行日/改訂履歴のみリセット、上部に「🅱 複製元: {productCode}」バッジ
4. **Route C**: ホーム「[C]」 → 即 Step1、白紙、上部に「🆑 新規作成 (白紙)」バッジ
5. ホーム右上「サンプル帳を開く」 → browse モード (バナーなし)、ただし詳細モーダルからの「このサンプルを起点に新規作成」は依然有効
6. 既存の DraftList 上の「複製」(`duplicateDraft`) は従来通り「productCode に -copy 付与」で動作 (Route B とは別)
7. 旧ドラフト (originRoute なし) を開いても Step1 のバッジ表示はなし
