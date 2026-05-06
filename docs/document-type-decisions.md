# Layer 4 documentType / sampleRevision の設計記録

> Layer 4 で documentType ('sample' | 'final') と sampleRevision を導入し、サンプル指示書と最終仕様書を 1 つのウィザードから出力可能にした際の判断記録。

## 1. documentType の意思決定 UX を 3 ルートにどう配置するか

タスク指示書:
> 1. Home の Route C カード内に「サンプル指示書 / 最終仕様書」のラジオボタン追加
> 2. Route A の SampleBook 起点でも同様の選択を追加（モーダル内）
> 3. Route B の DraftPickerModal でも、複製元の documentType を継承するか変更するかを選択可能にする

実装上の配置:

| ルート | docType の選択場所 | 既定値 |
|---|---|---|
| A | サンプル詳細モーダルの「起点に新規作成」ボタンの直前 | `sample` |
| B | DraftPickerModal の確定ボタン直前 (radio: 「複製元と同じ」/「最終仕様書として作成」) | 「複製元と同じ」(継承) |
| C | Home Route C カード内に直接 radio + 「作成」ボタン | `sample` |

**Route C のみカード上に radio + button を載せる**設計理由: A/B には選択後の dialog が存在するので docType をそこに置けば一連の動線で済む。一方 C は dialog がないため、カード内で完結させる必要がある。

A/B カードは依然「クリック → dialog」のシンプルな button のままで、UX の主要動作 (= サンプルを見る / 既存ドラフトを見る) を素早く始められる。

## 2. Route B の継承ロジック

タスク指示書: 「デフォルト: 複製元と同じ documentType、sampleRevision は +1 (同じ documentType の場合)」

確定処理のフローチャート:

```
override = 'inherit' (= radio が「複製元と同じ」):
  if (source.documentType === 'sample'):
    new.documentType = 'sample'
    new.sampleRevision = (source.sampleRevision ?? 1) + 1
  else:
    new.documentType = 'final'
    new.sampleRevision = undefined

override = 'final' (= radio が「最終仕様書として作成」):
  new.documentType = 'final'
  new.sampleRevision = undefined
```

revision のみを上げたい場合は Task 6 の `promoteRevision` を使う想定 (= ドラフト一覧の per-row ボタン)。Route B は「別案件として作る」想定なので productCode/issueDate/revisionHistory のリセットも継続。

## 3. SAMPLE手配欄の項目順序とレイアウト

タスク指示書: 「出荷納期 → 数量3宛先 → 単位 → 備考 → 参考の順」

最終仕様書の表紙レイアウトに割り込ませると印刷で崩れるので、PAGE 1 のヘッダ直下に独立ブロックとして追加。documentType === 'sample' のときのみ表示。

```
┌──────────────────────────────────────┐
│ ヘッダ (PrintHeader)                 │
├──────────────────────────────────────┤
│ ▼ SAMPLE手配 (sample のみ)            │
│   出荷納期 [   ]                     │
│   客人用 [  ] 個 / 東京用 [  ] 個 / 工場用 [  ] 個  │
│   単位 [選択]                        │
│   備考 [               ]              │
│   参考 [               ]              │
├──────────────────────────────────────┤
│ 1. パラメーター一覧 ...               │
└──────────────────────────────────────┘
```

単位は datalist で「個 / 本 / 枚 / セット / 組」の 5 候補をサジェスト + 自由入力可。

## 4. ordinal 関数の英語表記

タスク指示書: 「1 → "1st", 2 → "2nd", 3 → "3rd", 4以上 → "${n}th"」

英語的には 21st, 22nd, 23rd が正しいが、**スペック準拠で 21th, 22nd...は全て th** とする。日本語ローカライズ ("1 回目", "2 回目" 等) は別 Layer で。

## 5. 旧ドラフトの documentType マイグレーション

`useSpecDrafts.migrateSpecData` の挙動:

```
raw が null/undefined          → initialSpecData (= documentType: 'sample')
raw が non-empty かつ          → そのまま (= 'sample')
  documentType フィールドあり
raw が non-empty かつ          → documentType: 'final', sampleRevision: undefined
  documentType フィールドなし    (= 旧ドラフト互換、既存挙動を保つ)
```

新規ドラフトと既存ドラフトで挙動を分ける目的:
- 新規ドラフト: 業務サイクル上、最初は必ずサンプル指示書なので 'sample' がデフォルト
- 既存ドラフト: Layer 3 以前に作られたものは「最終仕様書」として表示されていたので、それを保つ

## 6. リビジョン昇格 (promoteRevision) の挙動

タスク指示書:
> - 現ドラフトを複製
> - 複製先の sampleRevision = 元 + 1
> - 複製先の品番末尾に `_2nd` のようなサフィックス付与（または品番リセット）
> - IndexedDB 画像も複製
> - 改訂履歴を引き継ぐ（元のリビジョンへの参照を最初の行に追加）

実装方針:
- 元の productCode が空なら新ドラフトも空
- 元の productCode に既に `_<ord>` サフィックスがあれば置換 (例: `FOO_1st` → `FOO_2nd`)、なければ追記 (`FOO` → `FOO_2nd`)
- revisionHistory は **元の履歴を全て引き継ぎ**、最初に `[今日] {元の productCode}_{元 ordinal} から派生` の行を **prepend** する
- IndexedDB 画像は `copyImage(srcId, newId)` で複製

## 7. 最終仕様書昇格 (promoteToFinal) の挙動

タスク指示書:
> - 押下で documentType を 'final' に変更
> - sampleRevision は undefined に
> - SAMPLE手配欄は非表示になる
> - imageSource を 'manual' に変更（Layer 3 で 'photo' との区別を本格化）

`imageSource` を一律 `manual` にする件: 元が `generated` でも `photo` でも全部 `manual` に上書きすると、すでに実物写真を入れているケースで情報を失う。

折衷案:
- 元が `'generated'` だったら `'manual'` に変更 (= AI 生成のままで最終仕様書を出すのは違和感があるので promotion 時に手動扱いに切替を促す)
- 元が `'manual'` または `'photo'` ならそのまま温存
- 元が `undefined` なら `'manual'` に設定

これにより既存の `'photo'` 状態が握り潰されない。Layer 3 で UI 側に `'photo'` を選ぶ操作を追加する想定。

## 8. 画像アップロード時の imageSource 自動判定

タスク指示書:
> - documentType による判定 or ユーザー選択

実装方針 (シンプル側):
- documentType === 'sample' → アップロード後の imageSource = `'manual'`
- documentType === 'final' → アップロード後の imageSource = `'photo'`

ユーザ選択 UI は Layer 3 (画像ソース選択 UI 本格化) で追加。

ファイルサイズ上限: 5MB (タスク指示書に従う)。超過時はトースト警告 + 拒否。

## 9. A/B 案併記 (方式 Y、最小実装)

タスク指示書:
> - Step4 では現状の縦 A4 印刷のまま
> - Layer 4 では「並べて表示」機能だけ実装、レイアウト最適化は Layer 2-PDF で

実装方針:
- Step4 ヘッダに「並列出力モード」チェックボックスを追加 (画面外モード切替、`hidden print:` セレクタで印刷時のみ反映)
- ON にすると secondary draft picker が表示される (現ドラフト以外の全ドラフトを `<select>` で選択)
- Secondary draft が選ばれた状態で印刷すると、Primary の 3 ページ + Secondary の 3 ページが連続して印刷される
- Secondary 側は read-only (編集不可、再反映ボタンなし)
- Step4 を 2 階層に分割: `Step4` (interactive shell) + `<SpecSheetView>` (printable content)

3 つ以上の連結 / 横向きレイアウト最適化は Layer 5 / Layer 2-PDF 持ち越し。

## 10. スコープ外 (持ち越し)

| 領域 | 持ち越し先 |
|---|---|
| 画像複数アングル対応 | Layer 3 |
| image-2 のプロンプト改善 | Layer 3 |
| imageSource の手動切替 UI (manual ↔ photo) | Layer 3 |
| 横向き A4 PDF 出力 | Layer 2-PDF |
| 状態管理 (draft / issued / approved) | Q1-B 確定後 |
| 型カタログ整備 | Layer 3 |
| 3 件以上の併記 | Layer 5 |
