# Layer 6 UX fix: Route A 起点の Step2 改善

> Step2 で Route A 起点のユーザが詰まる問題を解消した際の判断記録。

## 1. 問題

Layer 6 + hotfix 後の Route A フロー:

1. SampleBook で「サンプルを起点に作成」 → Step1 起動
2. seed されているのは `headShape` / `brandName` / `bodyColor` (alias hit 時) / `lining` (天ウーロン系のみ)
3. 「STEP2 へ進む」 → Step2 で残り 6 項目 (bodyFabric / texture / closure / embroidery / hardwareFinish / piping) が空
4. ユーザは「何をすればいいかわからない」 → 「STEP3 へ進む」が disable のまま詰まる

これは Layer 6 + Layer 4 設計通り (語彙不一致による誤マッピング回避) だが、Step2 の「AI 提案を見る」ボタンの存在を知らないユーザは出口が無い状態に陥る。

## 2. 解決方針 (データ層は触らない)

| 案 | 評価 |
|---|---|
| sample → master の語彙マップを拡張して Step2 全項目を seed | ✗ 誤マッピングが増える、`docs/route-design-decisions.md` の方針に逆行 |
| Step1 で position も seed する (sample に position 情報なくても 'standard' 固定) | △ 業務的に違和感あり、ユーザに見せる前に決め打ちはダメ |
| **Step2 マウント時に自動で 5 件提案を生成 + ガイドバナーで誘導** | ✓ ユーザの認知負荷ゼロ、データ層触らず、Route A のみに限定可 |

採用: 3 案目。

## 3. 自動生成の発火条件

Step2 マウント時、useEffect で以下すべて満たす場合のみ `generateProposals()` を呼ぶ:

```ts
data.originRoute === 'A'
&& proposals === null         // 二重実行防止
&& data.headShape             // 提案生成に必須
&& data.position              // 提案生成に必須
```

- 依存配列は `[]` (初回マウント時のみ)
- React strict mode で 2 回実行されても、`proposals === null` チェックで内部の `useStep2Proposals.generateProposals` は冪等 (state setter による上書き)
- Route B / C / undefined はチェックを抜けるので**完全に既存挙動**

### Route B で自動実行しない理由

Route B は元ドラフトから `bodyFabric` / `closure` / 等を全コピーしているので、Step2 のフォームは既に埋まっている。提案を出すと既存値を上書きする提案カードを誘導することになり、混乱を招く。

## 4. ガイドバナー仕様

| originRoute | 表示 | タイトル | メッセージ |
|---|---|---|---|
| `'A'` | ✓ | 「サンプル「{originSampleId}」を起点にしています」 | 「下記の提案から1つを選んで「適用」を押してください。」 |
| `'B'` | ✓ | 「ドラフト「{productCode or originDraftId}」を複製しています」 | 「必要な項目を編集してください。提案は手動で生成できます。」 |
| `'C'` | ✗ | — | — |
| `undefined` (旧ドラフト) | ✗ | — | — |

- Route B の productCode 解決は `draftLookup(originDraftId)` 経由 (Step1 と同じパターン)
- 解決失敗時は ID をそのまま表示 (元ドラフトが削除済の場合のフォールバック)
- 開閉状態は **ローカル `useState` のみ**、ドラフトに保存しない (画面遷移で再表示)
- 閉じるボタンは 44pt (タッチターゲット最小値) を意識

## 5. 表示位置

Step2 のヘッダー (AI 組み合わせ提案セクション) の**直上**。提案カードの存在を視覚的に強調する位置。

```
┌────────────────────────────────────┐
│ [ガイドバナー]                     │ ← 新規
├────────────────────────────────────┤
│ AI 組み合わせ提案 [提案を見る]     │ ← 既存 (Route A は自動展開)
│ ┌──┐┌──┐┌──┐┌──┐┌──┐                │
│ │P1││P2││P3││P4││P5│                │
│ └──┘└──┘└──┘└──┘└──┘                │
├────────────────────────────────────┤
│ NG warnings (出る場合)             │
├────────────────────────────────────┤
│ 個別フィールド (本体生地 / 裏地…) │
└────────────────────────────────────┘
```

## 6. スコープ外 (持ち越し)

- Route A 自動生成後、Route B 同様に「最初の提案を自動適用」する案: 提案 5 件を見せて選ばせる現状を維持
- バナーに「提案を見る」ジャンプボタン追加: 提案カードがすでに自動表示されるので不要
- Step3 / Step4 でのバナー: 別 Layer
