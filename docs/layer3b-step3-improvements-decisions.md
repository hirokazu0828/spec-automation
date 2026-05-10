# Layer 3b-fix-step3-improvements: 4 アングル一括生成 + model 切替インフラ 設計記録

> Step3 の画像生成体験を「1 枚ずつ生成 → 4 アングル一括生成」に進化させ、
> 将来の gpt-image-2 切替に備えた最小インフラ (`api/generate-image.ts` の
> opt-in `model` パラメータ) を残置した PR の判断記録。
>
> **当初スコープ** は `gpt-image-2` 切替検証 (Layer 3b-fix-model) と
> 一括生成機能 (Layer 3b-fix-multi-angle) を 1 PR に統合するものだったが、
> Phase 1.5 step B (gpt-image-2 への 1 回 test call) がサンドボックス制約で
> 実行できず、ユーザのローカル環境構築コストが高いと判断され、**スコープを
> 一括生成機能のみに縮小**した。gpt-image-2 切替は将来の再開に備えて
> インフラのみ残置 (§future-work)。

---

## 1. スコープ縮小の経緯

### 当初スコープ (Phase 1〜3)

1. Phase 1: 公開ドキュメントから API 互換性 / コスト / 速度を確認
2. Phase 1.5 step B: gpt-image-2 への 1 回 test call を実行
3. Phase 2 Task A: `api/generate-image.ts` の default を `gpt-image-2` に切替
4. Phase 2 Task B: 4 アングル一括生成
5. Phase 2 Task C: テスト 12 件追加
6. Phase 2 Task D: docs
7. Phase 3: gpt-image-1 vs gpt-image-2 の比較画像 8 枚生成

### Phase 1.5 step B が詰まった理由

| 経路 | 状況 |
| --- | --- |
| Sandbox → `api.openai.com` | `OPENAI_API_KEY` が sandbox env に未設定。仮にあってもチャットへの key 共有はセキュリティ NG |
| Sandbox → Vercel Preview `/api/generate-image` | `curl` が `Host not in allowlist` で egress block (sandbox proxy 制約)。`api.openai.com` は allowlist 内だが `*.vercel.app` は未登録 |
| ユーザのローカル端末 → Vercel Preview | 実行可能だが Git / Node.js 未インストールの環境構築に 30 分〜1 時間 |

ユーザ判断で「step B 検証のためだけにローカル環境を整えるのはコスト過大」となり、
**gpt-image-2 切替は保留**、本 PR は 4 アングル一括生成のみに絞った。

### 残したインフラ

`api/generate-image.ts` の opt-in `model` パラメータと
`scripts/run-step-b-test.cjs` は **残置**。将来再開時にすぐ使える状態。

`src/components/Step3/generateImage.ts` の `GenerateImageOptions` も
`model?: 'gpt-image-1' | 'gpt-image-2'` を受け取れるが、Step3 UI からは
渡していない (= server 側 default `gpt-image-1` で動く)。切替再開時は
Step3 で `model: 'gpt-image-2'` を渡すか、`api/generate-image.ts` の
`DEFAULT_MODEL` を更新するだけで済む。

---

## 2. 4 アングル一括生成 UX の設計判断

### 選択した UX

| 要素 | 決定 |
| --- | --- |
| 既定アクション | **「4 アングル一括生成」ボタン** (旧「AI生成」を置換) |
| 追加アクション | **タイル毎の「再生成」ボタン** (1 アングルだけ作り直し) |
| 表示 | **4 タイル grid** (旧 1 枚プレビューを置換、選択中アングルの線図プレビューは別途残置) |
| pending_lineart テンプレ | 一括生成ボタン disabled、front タイルだけ「再生成」可、他 3 タイルは「—」placeholder + disabled |
| アップロード | 選択中アングルに格納 (アングルタブと連動) |
| Step4 への挿入 (checkbox on) | front → 正面 / side_toe → 側面 / back → 背面 / side_heel → 挿入なし |

### 並列 vs 順次 vs 自動フォールバックの選択

`generateImagesForAllAngles` (新設、`generateImage.ts`) のロジック:

1. **Phase 1**: `Promise.all` で 4 アングルを並列発射
2. 失敗が無ければそのまま返す
3. 失敗した結果のうち **429-style エラーが 1 つでもあれば** 順次フォールバックに切替:
4. **Phase 2**: 失敗したアングルだけを順次再試行 (`SEQUENTIAL_FALLBACK_DELAY_MS = 500ms` の inter-call delay)、成功したアングルはそのまま

判断軸:

| 戦略 | 採否 | 理由 |
| --- | --- | --- |
| 常に並列 | △ | 高速だが、`429 Too Many Requests` を受けても retry 機構がないと UX が悪化 |
| 常に順次 | ✗ | 4 枚生成に 4 倍の時間。1 セット ¥25 相当の生成を 1 分以上待たせない |
| **並列 + 429 自動フォールバック (採用)** | ✓ | 通常時の最速 UX を保ち、レート制限時の安全網が機能 |
| 並列 + 全失敗時のみ retry | △ | 部分失敗時の UX が落ちる |

429 検出は正規表現 `/429|rate[ _-]?limit|too many requests/i` で error 文字列を判定 (OpenAI のレスポンス body は環境/世代で揺れがあるため緩めにマッチ)。

### コスト承認モーダル

現状 default の `gpt-image-1 medium 1024x1024 ≈ $0.042/枚 ≈ ¥6/枚` をベースに:

| アクション | モーダル文言 | 計算 |
| --- | --- | --- |
| 4 アングル一括生成 | 「OpenAI で 4 アングル分の画像を生成します（1 セット**約 25 円**）。よろしいですか？」 | 4 × ¥6 = ¥24 ≈ 「約 25 円」 |
| 1 アングル再生成 | 「{アングル名} を 1 アングル再生成します（**約 6 円**）。よろしいですか？」 | 1 × ¥6 = ¥6 |

将来 gpt-image-2 (medium ≈ ¥8/枚) に切り替えた場合は **約 32 円 / 約 8 円** に
更新する想定。`src/components/Step3/index.tsx` 冒頭の `BULK_COST_LABEL` /
`SINGLE_COST_LABEL` 定数 1 か所だけ書き換えれば反映される (judgement: 定数化済)。

---

## 3. IndexedDB スキーマ拡張

### Before (Layer 3a まで)

```
IDB store: spec-automation-images / images
key:   <draftId>
value: dataUrl string
```

→ 1 ドラフト = 1 画像 (front 相当を想定)

### After (Layer 3b-fix-step3-improvements)

```
IDB store: spec-automation-images / images
key (新):   <draftId>#<angle>     例: 7f3...#front, 7f3...#side_toe
key (旧):   <draftId>             ← 互換のため残置、loadImage() のフォールバック
value:     dataUrl string
```

### マイグレーション戦略 (既存ドラフトの後方互換)

- **新コード**は `saveAngleImage(id, angle, url)` / `loadAllAngleImages(id)` 等の per-angle API を使う
- **旧コード**(Step4 / useSpecDrafts) は legacy `loadImage(id)` / `copyImage` / `deleteImage` の signature を変えずに維持
- **legacy 関数の中身**を更新:
  - `loadImage(id)` → `<id>#front` を先に試し、無ければ legacy `<id>` にフォールバック
  - `deleteImage(id)` → legacy + 4 angle key 全部削除
  - `copyImage(from, to)` → legacy + 4 angle key 全部コピー

→ Step4 / useSpecDrafts は完全に無改修 (= 「Step4 改修はスコープ外」を死守)。
旧ドラフトを開くと front タイルに既存画像が反映され、他 3 タイルは「未生成」
状態 → ユーザが必要に応じて再生成、というスムーズな移行になる。

---

## 4. テスト戦略

### 追加テスト

| ファイル | 件数 | 内訳 |
| --- | ---:| --- |
| `src/components/Step3/generateImage.test.ts` (新規) | 7 | 並列発射 (3) + 非 429 エラーで retry なし (2) + 429 で sequential fallback (2) |
| `src/components/Step3/index.test.tsx` (拡張) | +5 | 一括ボタン enable / 4 タイル再生成ボタン / pending で一括 disabled / bulk モーダル文言 / single モーダル文言 |
| **合計新規** | **12** | 目標 12 件達成 |

### 既存テストの維持

`index.test.tsx` の Layer 3a 8 件は無修正で全 pass。`getByRole('button', {
name: '...' })` の accessible name 完全一致挙動を活用し、新しい per-tile
`aria-label="<angle> を再生成"` ボタンと既存の角度タブが衝突しないようにした。

タイル disabled placeholder は当初 "線画準備中" にしていたが、amber バナーと
重複して `getByText` が 4 件 hit したため **「—」 (em-dash)** に変更。

### テスト件数推移

| 状態 | 件数 |
| --- | ---:|
| Layer 3b マージ後 (PR #12 main) | 197 |
| Layer 3b-fix-step3-improvements (本 PR) | **209** (+12) |

---

## 5. 触らなかったもの (スコープ外)

- **`Step4.tsx` / `Page2Material.tsx`** — 製品写真スロット数 (3) はそのまま、side_heel 画像は IndexedDB のみで保持 (PDF には出ない)
- **`api/generate-image.ts` の DEFAULT_MODEL** — `'gpt-image-1'` のまま、`gpt-image-2` 切替は保留
- **`OPENAI_API_KEY` の認証強化** — `docs/QUESTIONS.md §B` の Issue は据え置き
- **`/v1/responses` 経由の代替実装** — gpt-image-2 切替再開時に必要なら検討

---

## 6. 既知の制約 / Layer 3b-2 への申し送り

| 観点 | 状況 |
| --- | --- |
| **closure 文の gpt-image-1 反映** | Layer 3b-fix の事前確認で「ステップ A の生成画像にプロンプトに無いドローコードが現れた」観察あり。実装上 `closure !== ''` のとき必ずプロンプトに closure 文が入る (vite-node で実測済)。マスタ JSON `closure.options[].en` が `wire spring closure with cord stopper` 等 cord 系 4 値で、gpt-image-1 はプロンプト通りに描いている可能性が高い (= 仕様通り) |
| **マスタ語彙の closure 不足** | `samples.json` で日常的に使う `magnetic` / `velcro` / `FIDLOCK` / `belt` が master `closure.options` に存在しない (Layer 2 で残課題と注記済)。Layer A (マスタ DB 拡張) で扱う |
| **gpt-image-2 切替検証** | 未実施、§future-work へ |
| **piping 文 / HEX / 部位別** | Layer 3b-2 (部位別 + HEX + パイピング) で別 PR |
| **Step4 への 4 アングル全画像挿入** | side_heel は IndexedDB のみで保持。Step4 の photo slot 数を増やすかは別 Layer |

---

## 7. Future work: gpt-image-2 切替再開手順

ユーザがローカル環境を整備したら以下で再開可能:

```
cd /path/to/spec-automation
git checkout main && git pull
PREVIEW_URL='https://....vercel.app' node scripts/run-step-b-test.cjs
```

**結果が 200 OK のとき**: `api/generate-image.ts:14-15` の `DEFAULT_MODEL` を
`'gpt-image-2'` に変更する 1 行差替の小 PR を起こす。コスト承認モーダルの
`BULK_COST_LABEL` / `SINGLE_COST_LABEL` も「約 32 円 / 約 8 円」に更新する
(`src/components/Step3/index.tsx`)。

**結果が 400 のとき**: `/v1/responses` 経由の代替実装、または `gpt-image-1.5`
等を検討。判断記録を別 Layer (Layer 3b-fix-model-v2 等) で起こす。

`scripts/run-step-b-test.cjs` の header コメントにも同手順を明記済。

---

## 8. 検証結果サマリ

- `npm test`: **209/209 pass** (197 → 209、+12)
- `npm run lint`: 0 エラー
- `npm run build`: 型エラー 0、main bundle **207.04 KB** (変化なし)、PDF chunk 1.4 MB lazy
- 既存ドラフト (Layer 3a 起源、legacy 1-image-per-draft) の互換性: imageStore レガシー fallback で確保
- Step4 / useSpecDrafts の signature: 無改変
