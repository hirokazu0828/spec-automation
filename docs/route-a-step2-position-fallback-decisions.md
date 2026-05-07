# Layer 6 UX fix-2: position 未設定時のフォールバックバナー

> Step2 で `data.position === ''` の状態を検知して Step1 へ誘導する際の判断記録。

## 1. 問題

タブナビ (`App.tsx:170-172` の `goStep`) は **常に許可**。Step1 → Step2 の "STEP2 へ進む" ボタンは `headShape && position` を要求するが、タブナビ経由なら position 空でも Step2 に飛べる。

Route A 起点のとき:
- `headShape` は `getShapeByAlias` で seed されるが、**position は seed されない** (sample にこの情報が無い、`docs/route-a-step2-ux-decisions.md` の方針)
- ユーザが Step1 で position を選び忘れたままタブで Step2 → 自動提案が `auto_fill[`${position}_${shape}`]` をルックアップ失敗 → `useStep2Proposals.onNoBaseAutoFill` トースト 1 回出るだけで提案なし → ユーザは「何も起きない」状態で詰まる

Route B / C / undefined でも同様 (position 未設定で Step2 に来た場合)。

## 2. 解決方針

タブナビは触らずに、**Step2 側で「ポジション未設定」を検知してフォールバックバナーを出す**。

| 案 | 評価 |
|---|---|
| タブナビ自体に gate を追加 | ✗ CURRENT_STATE.md §1 「タブナビは常に許可」設計を破壊 |
| Step2 マウント時に強制 redirect | ✗ ユーザの意図を無視、ループ可能性 |
| **Step2 で警告バナー + ボタンで Step1 へ誘導** | ✓ 採用。タブナビ設計を維持しつつユーザが詰まらない |

## 3. 既存バナーとの優先順位

```
isPositionMissing
  ? <PositionMissingBanner /> (amber、警告色、閉じる ✗)
  : (
      data.originRoute === 'A' || 'B'
        ? <GuideBanner /> (blue、情報色、閉じる ✓)
        : (バナーなし)
    )
```

position 未設定なら、原点が A/B でも警告を優先 (= 情報案内より「足元の問題」を先に解決)。position 設定済なら従来通り Route A/B のガイド or 何も無し。

## 4. 自動提案との関係

既存の `useEffect([])` 自動実行は `data.headShape && data.position` を gate にしているので、**position 空のときは元から発火しない**。フォールバックバナー追加にあたって自動実行ロジックは触らない。テスト側で「position 空時に generateProposals が呼ばれない」を明示的に確認 (回帰防止)。

## 5. Route 横断での適用

position 未設定問題は `originRoute` に依存しない (Route A は seed しない、Route C は最初から空、Route B も元ドラフトに position なければ空)。**全 originRoute で同じバナーを出す**ことで「Step2 で position が無い → STEP1 に戻る」の挙動を一貫させる。

## 6. デザイン

- 配色: `bg-amber-50` / `border-amber-200` / `text-amber-900` (青系の Route A/B ガイドと色で区別)
- `role="alert"` (a11y)
- 閉じるボタン**なし** (position は必須項目なので閉じても解決しない)
- 「STEP1 に戻る」ボタンは `min-h-[44px]` でタップ ターゲット確保

## 7. スコープ外 (持ち越し)

- Step1 → Step2 タブ自体に `disabled` 属性: ❌ タブナビ常時許可の方針維持
- 自動 redirect: ❌ ユーザの意図を尊重
- headShape 未設定時のバナー: 別バナー (今回は position だけ。headShape は Route A で必ず seed されるので Route A での発生確率が低い)
- Step3 / Step4 のフォールバック: 別 Layer
