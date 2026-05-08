# Layer 3b: プロンプトテンプレート 設計記録

> Step3 の画像生成プロンプトを **「軽量リファクタ + position バリアント追加」**
> したときの判断記録。シナリオ A (Layer 3a 後の現状確認レポート §8 参照) を
> 採択し、`SHAPE_DESC` ハードコードを catalog 駆動に統合 + position 文を追加 +
> lining 文を追加 + ネガ風文末を追加 + アングル英訳を catalog 移管 (Phase B
> 線画化に向けた種撒き) を 1 PR で実施。

---

## 1. シナリオ A 採択の経緯

Layer 3a 完了時点のプロンプト周りには 3 種類のハードコードが残っていた:

| 種別 | 個数 | 場所 |
| --- | ---:| --- |
| shape 説明 (`SHAPE_DESC`) | 3 + fallback 1 | `buildImagePrompt.ts:6-10` |
| ベース指示文 / 末尾照明文 | 3 | `buildImagePrompt.ts` |
| 属性文型 | 5 | `buildImagePrompt.ts` |

語彙マスタ (`putter-cover.json`) の `options[].en` フィールドを介した
英訳経路は **Layer 0 の段階で既に整備済**だったので、Layer 3b では
**マスタ化リファクタ (シナリオ B)** ではなく **シナリオ A (catalog 連携 +
position 追加)** を採用。理由:

1. **既存マスタ駆動 (`getLabel(..., 'en')`) で属性側は十分** — 5 属性 + 追加した
   lining = 6 属性すべてが master JSON 駆動で文型もシンプル
2. **shape は catalog (`promptShapeDescription`) に持たせる方が責務が綺麗** —
   `displayNameEn` (UI 用) と分離、ヘッドカバー (Layer 3a-3) で別語彙が要る
   ときに自然に拡張できる
3. **新規マスタファイル (`src/data/prompts/*.json`) の追加コストを払うほど
   テンプレートの数は増えていない** — 当面 putter のみ。フルマスタ化は
   ヘッドカバー追加時に再評価
4. **position バリアントは「フルマスタ」より先に「実体験」を回したい** —
   どの程度効くかを確かめてから一段抽象化する

シナリオ A を選んだことで、**buildImagePrompt 内のハードコード文字列は
shape の fallback 1 個 + ベース指示 2 個 + 属性文型 6 個 + 末尾照明 1 個 + ネガ 1 個
= 計 11 個 → fallback の 1 個 + ベース指示 2 個 + 属性文型 6 個 = 計 9 個** に
減った。残りは catalog (`promptShapeDescription` / `anglePromptPhrases`) と
helpers.ts (`POSITION_PROMPT_PHRASES` / `NEGATIVE_PROMPT_PHRASE`) に分離。

## 2. position 採否の判断記録

### 既存 enum を再利用

事前確認で `SpecData.position` が `'luxury' | 'standard' | 'casual'` の 3 値
で安定していることを確認 (master `putter-cover.json:34-58`、Step1 `radio`
入力、Layer 6 UX fix-2 でフォールバック導線も実装済)。新しい区分を発明せず、
**既存 3 値をキーとして `POSITION_PROMPT_PHRASES` を定義**。

### 翻訳ルール — 「luxury」「premium」「価格帯」を直接書かない

gpt-image-1 にプロンプトを渡すとき以下のリスクが指摘された:

| 入れたくない単語 | リスク |
| --- | --- |
| `luxury` / `premium` / `high-end` / `exclusive` | gpt-image-1 がブランド名と誤認してロゴを画面主役に増やす |
| 価格帯 (`¥5,000` 等) | プロンプト内の数値が画像に文字として書き込まれる事故 |
| `prominent ... logo` (当初 casual 案) | ロゴの巨大化を誘発 |
| `dense fine stitching` (当初 luxury 案) | 線画側にステッチがあるので密度を強制すると矛盾 |

これらを回避し、**素材感 / 配色傾向 / 装飾密度** に翻訳した:

```ts
luxury:
  'Refined matte surface with subtle tonal contrast, restrained small ' +
  'logo placement, precise fine stitching, and a quiet harmonious ' +
  'color palette suggesting careful craftsmanship.',
standard:
  'Balanced everyday textile finish with a clearly visible mid-sized ' +
  'brand logo, moderate stitching density, and a versatile two-tone ' +
  'color palette appealing to a broad audience.',
casual:
  'Energetic sporty surface treatment with bright vivid color blocking, ' +
  'playful contrasting accents, a bold graphic accent, and a relaxed ' +
  'lightweight athletic feel.',
```

ユーザレビューで以下の 2 箇所だけ微修正:

| from | to | 理由 |
| --- | --- | --- |
| `dense fine stitching` (luxury) | `precise fine stitching` | 線画側のステッチ密度が固定なので "precise" のほうが矛盾を起こしにくい |
| `prominent graphic logo` (casual) | `bold graphic accent` | ロゴ巨大化リスクを回避、装飾的インパクトとして読ませる |

`getPositionPromptPhrase(position)` で値域外 (空文字 / 不明値) を null 返却、
`buildImagePrompt` でそのキーを skip する形で防御。テストで
"luxury" / "premium" / 価格記号 / "expensive" / "cheap" / "budget" の
不在を保証 (`helpers.test.ts`)。

## 3. shape 統合方式 (catalog 連携) の判断

### `displayNameEn` 直接使用は不採用

`displayNameEn` はカタログ的見出し (例: `Putter cover, blade type (pin)`) で
プロンプト埋込み時に冠詞なし + カンマ + 括弧で文として崩れる。プロンプトに
混ぜたときの英文として読みづらいので不採用。

### `promptShapeDescription` を catalog に追加

各 template に **冠詞付き名詞句**として promptShapeDescription を持たせる:

| template | promptShapeDescription |
| --- | --- |
| putter-blade | a slim blade-style golf putter cover with a narrow elongated head shape |
| putter-semi-mallet | a semi-mallet style golf putter cover with a moderately rounded head shape |
| putter-full-mallet | a large full-mallet style golf putter cover with a substantially rounded back-weighted head shape |

ポイント:

1. **冠詞付き** — `Apply realistic surface design to <X> silhouette ...` の
   `<X>` に文法的に綺麗にハマる
2. **shape の弁別子を盛り込む** — `narrow elongated` / `moderately rounded` /
   `substantially rounded back-weighted` で gpt-image-1 が線画から型を
   読み違えてもプロンプトで補正がかかる安全側
3. **Layer 2-PDF までの hardcoded `SHAPE_DESC` との連続性** — 旧
   "a slim blade-style golf putter cover" を踏襲、語彙を急変させない
   (生成画像の安定性確保)
4. **責務分離** — `displayNameEn` (UI) と `promptShapeDescription` (gpt
   宛) を独立に編集可能

### resolution 順序 (templateId 優先)

```ts
const template = data.templateId
  ? getTemplateById(data.templateId)         // Step3 のユーザ明示選択
  : getTemplateByHeadShape(data.headShape);  // Step1 の headShape からの自動
const shape = template?.promptShapeDescription ?? 'a golf putter cover';
```

Step3 のテンプレ select でユーザが pin → mallet と切り替えた場合は
`templateId` 優先で意図通りに反映される。fallback 文字列は
`buildImagePrompt.ts` 内に 1 行だけ残置 (catalog にエントリがない / 解決不能な
ときの最終避難)。

## 4. ANGLE_PROMPT_PHRASES catalog 移管の意図 (種撒き)

### 移管前 (Layer 3a 末)

`helpers.ts` に **単一の固定マップ**として配置:

```ts
export const ANGLE_PROMPT_PHRASES: Record<TemplateAngle, string> = {
  front: 'front view',
  side_toe: 'toe-side view',
  back: 'back view (opening side)',
  side_heel: 'heel-side view',
};
```

### 移管後 (Layer 3b)

各 template の `anglePromptPhrases` (Optional) に**コピー配置** + getter 追加:

```ts
export function getAnglePromptPhrase(
  templateId: string | undefined,
  angle: TemplateAngle,
): string {
  if (templateId) {
    const template = getTemplateById(templateId);
    const override = template?.anglePromptPhrases?.[angle];
    if (override) return override;
  }
  return ANGLE_PROMPT_PHRASES[angle];  // global fallback
}
```

`ANGLE_PROMPT_PHRASES` は **削除せず** global fallback として残置。

### 種撒きの意図

| 将来想定ケース | この移管で何が楽になるか |
| --- | --- |
| ヘッドカバー (Layer 3a-3) で `top` アングルを足したい | catalog の `anglePromptPhrases` に template ごとに追記、global は触らない |
| パター用 vs FW 用で同じ `front` でも英訳を変えたい | template ごとに override |
| pending_lineart の 2 型 (semi-mallet / full-mallet) で線画配置前から英訳を準備 | `anglePromptPhrases` だけ先行で入れている (テストで保証、`helpers.test.ts`) |

現時点で 3 template の `anglePromptPhrases` 値は全て同じ。意味のある
override が出てくるのは Layer 3a-3 (ヘッドカバー追加) 以降の想定。

## 5. lining / ネガ風文末の追加

### lining (Task 3)

Layer 3a までは `Pick` で lining を受け取っていたが**プロンプトに混ぜていなかった**
(将来用 placeholder)。Layer 3b で `Lining material is X.` の文型を追加 (空値 / `-`
のときは skip)。master `putter-cover.json:158` の `lining.options[].en`
を使用、既存の `getLabel(..., 'en')` 経路で英訳。

### ネガ風文末 (Task 4)

gpt-image-1 の `/v1/images/edits` および `/v1/images/generations` API は
**`negative_prompt` フィールドを受け付けない** (Stable Diffusion 系と異なる)。
代替として positive prompt の末尾に「avoid X」のような文を加える方法を
採用:

```
Avoid text artifacts, plastic glare, or visible seams that break the silhouette.
```

`helpers.ts` の `NEGATIVE_PROMPT_PHRASE` 定数に切り出し、`buildImagePrompt`
末尾に常時 push。テストで「Studio product photography ...」の後に来る
順序を保証。

## 6. シグネチャ拡張と後方互換

```ts
buildImagePrompt(
  data: Pick<SpecData,
    | 'headShape' | 'bodyFabric' | 'bodyColor' | 'embroidery'
    | 'hardwareFinish' | 'lining' | 'closure' | 'piping'
    | 'templateId' | 'position' | 'selectedAngle'
  >,
  angle?: TemplateAngle,    // overrides data.selectedAngle when provided
  position?: string,        // overrides data.position when provided
): string
```

| 観点 | 現状 |
| --- | --- |
| Layer 3a 互換 | ✅ `angle` 引数の挙動はそのまま (override-or-data。テストで back-compat 確認) |
| Layer 2-PDF 以前 互換 | ✅ position / angle / lining 値が空のとき、出力は当時の文章とほぼ同等 (shape は catalog 経由で同等英文、fallback も同じ) |
| Step3 呼び出し側 | 変更不要 — 既に full `SpecData` を渡しているので新フィールド (`templateId` / `position` / `selectedAngle` / `lining`) は自動で乗る |

## 7. 数値サマリ

| 観点 | Before (Layer 3a) | After (Layer 3b) | 差分 |
| --- | ---:| ---:| ---:|
| ハードコード文字列 (in `buildImagePrompt.ts`) | 11 | 3 | -8 |
| 属性文型 (プロンプト混入) | 5 | 6 (lining 追加) | +1 |
| position 文型 | 0 | 3 (luxury/standard/casual) | +3 |
| ネガ文型 | 0 | 1 | +1 |
| catalog `promptShapeDescription` | 0 | 3 (全 template) | +3 |
| catalog `anglePromptPhrases` | 0 | 3 (全 template、各 4 angle) | +3 |
| Vitest 件数 | 171 | 197 | +26 |

## 8. 触らなかったもの (スコープ外)

- piping 文のプロンプト混入 (現状未使用、Layer 3b では追加せず)
- プロンプト編集 UI (Step3 上での英文直接編集)
- `src/data/prompts/*.json` への完全マスタ化 (シナリオ B)
- `/api/generate-image` の認証追加 — Issue として `docs/QUESTIONS.md §B` に
  記録、後続 Layer の課題
- ヘッドカバー (DR/FW/UT) 用テンプレ追加 (Layer 3a-3 で別途)
- Phase B (semi-mallet / full-mallet 線画化) — 別 Layer、判断記録
  `docs/phase-b-decisions.md` に記録

## 9. 次の Layer への申し送り

| 候補 Layer | 内容 |
| --- | --- |
| **Phase B (Layer 3a-2)** | semi-mallet (BRG-2111-P1006 起源) + full-mallet 系統 Y (BRG-2004-P448 起源) の線画化、`anglePromptPhrases` は Layer 3b で先置き済 |
| **Layer 3a-fix-classification** | full_mallet 系統 X 5 件 (BRG-2006-P541 等) の分類見直し、判断記録 `docs/phase-b-decisions.md` 参照 |
| **Layer 3a-3** | ヘッドカバー (DR/FW/UT) の catalog 追加、`top` アングルなどの新規 angle |
| **Layer 3c** | 部位マスク (A/B/C/D/E/F の局所編集)、生成画像のアングル別保存 |
| **Layer 3d (フルマスタ化)** | 必要になったら `src/data/prompts/<category>.json` で BASE / CAMERA / NEGATIVE / FALLBACK もマスタ駆動に |
| **API 認証** | `docs/QUESTIONS.md §B` の Issue を昇格、`/api/generate-image` をクライアント認証 (現 `VITE_APP_PASSWORD` ヘッダ転送など) で防御 |
