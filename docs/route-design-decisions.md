# 3 ルート起点判定の設計記録

> Layer 6 で `originRoute / originSampleId / originDraftId` を導入し、Home で 3 ルートを選んで Wizard を起動できるようにした際の判断ログ。

## 1. ルート定義 (再掲)

| ルート | 業務シナリオ | 起点 | seed の埋まり具合 |
|---|---|---|---|
| **A** | 「このサンプル帳の○○みたいなのを別ブランドで作る」 | SampleBook | 部分的に埋まる |
| **B** | 「先週作った仕様書の FW 版を作る」 | 既存 Draft 一覧 | 完全に埋まる (品番/発行日/改訂履歴は除く) |
| **C** | 「新ブランドの初回提案」「全く新しい型」 | 白紙 | 空 |

## 2. ルート A の seed 範囲

タスク指示書の指針:
> master と 1:1 マッピングできる項目のみ seed する。sample 独自語彙の項目 (closure / decoration 等) は seed しない (ユーザに改めて選ばせる)

PutterSample から SpecData に seed するフィールド:

| sample 側 | SpecData 側 | seed する? | 根拠 |
|---|---|---|---|
| `client` | `brandName` | ✓ | 直訳可能な単純コピー |
| `shape.head_type` | `headShape` | ✓ | `getShapeByAlias` で正規化 |
| `outer_material.fabric` | `bodyFabric` | ✗ | sample 側は実写語彙 ("1680D AIR" 等)、master 値と完全別の場合があるので seed しない |
| `outer_material.color` | `bodyColor` | ✗ | sample 側は「橙」「黒」等、master の `bodyColor` 11 値と語彙ずれ |
| `closure.type` | `closure` | ✗ | sample = 製品名 (マグネット/ベルクロ/FIDLOCK)、master = 構造方式 (wire_spring 等) で完全別語彙 |
| `decoration.type` | `embroidery` | ✗ | sample = 大分類 (刺繍/プリント/なし)、master = 技法 (flat/tatami_3d 等) で粒度が違う |
| `lining_material.fabric` | `lining` | ✗ | sample = 素材名、master = 4 値の規格 (poly_smooth 等) で 1:1 でない |
| `color_scheme.hardware_color` | `hardwareFinish` | ✗ | sample = 色名 (黒)、master = 仕上げ方式 (matte_silver 等) で語彙が違う |
| `sample_number` | `originSampleId` | ✓ | 起点メタ情報。Step1 のバッジ表示と将来の追跡用 |

**seed = 2 フィールド + メタ 1 フィールド** に絞る。少なく見えるが、これで「sample から起点を取る」UX としては十分: 形状・ブランドは確定で、残りの仕様は Step1〜Step2 で AI 提案を介して埋める流れ。

> 寸法は形状確定後に Step4 で `getDimensionDefault` 駆動の「標準値で埋める」ボタンが使えるので、seed 段階では入れない (シンプルに保つ)。

## 3. ルート B の seed 範囲とリセット項目

タスク指示書の指針:
> ルート B は「品番をリセットして発行日を今日にする」(差分編集用)

完全コピーする項目: `data` のほぼ全フィールド。

リセットする項目:
| フィールド | 値 |
|---|---|
| `productCode` | 空 (新規入力させる) |
| `issueDate` | `new Date().toISOString().slice(0, 10)` (今日) |
| `revisionHistory` | `[{date: 今日, content: ''}]` (initialSpecData と同じ初期値) |
| `originRoute` | `'B'` |
| `originDraftId` | 元ドラフトの `id` |
| `originSampleId` | undefined にリセット (元ドラフト由来の値があっても消す) |

**画像 (IndexedDB) の扱い**: 現状の `duplicateDraft` 同様、起点ドラフトの画像も新 ID にコピーする。

## 4. ルート B vs 既存 `duplicateDraft` の使い分け

| 操作 | productCode | issueDate | revisionHistory | originRoute | 用途 |
|---|---|---|---|---|---|
| 一覧の「複製」(`duplicateDraft`) | 元 + `-copy` 付与 | 元のまま | 元のまま | 元のまま | 同一案件のリピート / 念のためバックアップ |
| Home の「[B] 既存ドラフトを複製」 | **空** | **今日** | **リセット** | `'B'` | 別案件 / シーズン違いの起点 |

**両方残す理由**: ユースケースが違う (リピート vs 差分編集) ので統合すると混乱する。内部実装は `useSpecDrafts.duplicateDraft` 内で seed を組み立てて `createDraft('B', seed)` を呼ぶ形にして共通化。

## 5. 起点バッジ (Step1 上部)

| ルート | 表示 |
|---|---|
| A | `🅰 起点: サンプル {originSampleId}` |
| B | `🅱 複製元: ドラフト「{originDraftId} の productCode が読めれば」` |
| C | `🆑 新規作成` (省略しても良いが、明示すると業務上の認識が揃う) |
| 旧ドラフト (originRoute なし) | バッジなし (後方互換) |

ルート B は **元ドラフトが削除済み**の可能性もある。その場合は `originDraftId` だけ表示してフォールバック。

## 6. SampleBook の挙動分岐

| 起点 | View | banner | 「このサンプルから作成」ボタン |
|---|---|---|---|
| Home の「サンプル帳を開く」 | `samples (mode='browse')` | なし | サンプル詳細モーダル内に表示 |
| Home の「[A] サンプル帳から作成」 | `samples (mode='pick')` | 「起点となるサンプルを選んでください」 | サンプル詳細モーダル内に表示 (mode 不問) |

`mode='browse'` でもボタンを出す理由: ユーザーが「サンプル帳を見ていて、ふとそれを起点にしたくなった」ケースに対応。ボタンが常にあれば、Home に戻って [A] を選び直す手間が消える。

## 7. App.tsx View 型の拡張

```ts
type View =
  | { kind: 'home' }
  | { kind: 'wizard'; draftId: string; step: 1|2|3|4 }
  | { kind: 'samples'; mode?: 'browse' | 'pick' };  // ← mode 追加
```

`mode` は optional。`undefined` または `'browse'` で従来挙動。

## 8. 後方互換性

- `originRoute` などが入っていない旧ドラフト: そのままロード可能。`useSpecDrafts.migrateSpecData` は `initialSpecData` をベースに既存値をマージするので、未定義フィールドは undefined のまま。
- Step1 バッジ: `originRoute` が undefined なら何も表示しない。
- IndexedDB 画像: 構造変更なし。

## 9. スコープ外 (持ち越し)

- 起点 (seed) フィールドのマーカー (= ユーザ入力 vs 起点由来の区別表示): タスク指示書 Task 7 末尾で「実装が重ければ Layer 6 では省略 OK」とあり、初回 PR では省略。Layer 4 のサンプル指示書テンプレート対応時に再検討。
- 出力フォーマット切替 (最終仕様書 vs サンプル指示書): Layer 4
- マスタ編集 UI: Layer A
