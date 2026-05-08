# Phase B (マレット系線画化) 判断記録

> Layer 3b 着手前の事前確認の中で `samples.json` の `head_type` が形状ではなく
> 用途/カテゴリで切られている疑いが見つかったため、Phase B のスコープを
> 絞り込んだ際の判断記録。**Phase B 着手は Layer 3b 完了後**、本ドキュメントは
> Layer 3b の PR に同梱する形で先行記録。

---

## 1. 結論サマリ

| 項目 | 判断 |
| --- | --- |
| **Phase B 線画化対象** | **2 型** — `putter-semi-mallet` + `putter-full-mallet` (系統 Y のみ) |
| **putter-semi-mallet 線画ソース** | `BRG-2111-P1006` (HALF MALLET CS PUTTER COVER FIDLOCK, NAVY) |
| **putter-full-mallet 線画ソース** | `BRG-2004-P448` (MALLET PUTTER COVER FIDLOCK, GREEN, 系統 Y) |
| **手順** | Layer 3a と同じ — ChatGPT で実物写真 → 線画化 → ロゴ プレースホルダー化 → 4 アングル分割 → 1024×1024 正規化 → `public/templates/{id}/` 配置 → catalog の `baseImages` / `lineArtStatus` / `sampleReferences` 更新 |
| **着手レイヤ** | 別 Layer (仮称 Layer 3a-2) として分離、Layer 3b 完了後に着手 |
| **系統 X 5 件の扱い** | Phase B では触らない、後続 Layer (仮称 Layer 3a-fix-classification) で議論 |

---

## 2. 系統混在問題 (Phase B のスコープを絞った理由)

`samples.json` の `head_type === 'フルマレット'` 27 件を寸法で分けると 2 系統に
分かれる:

| 系統 | 寸法 (`dimensions_noted`) | 件数 | 視覚的形状 |
| --- | --- | ---:| --- |
| **系統 X** | W180×H150×D80mm | 5 件 | **横長プロファイル、形状はピン/ブレード型に近い** |
| **系統 Y** | 幅120×高さ200×マチ40mm (+幅違い変種を含む) | 22 件 | **縦長の蓋付き、典型的なマレット型** |

### 視覚再判定 (Layer 3b 事前確認で 3 枚の画像を確認)

| 画像 | 結論 |
| --- | --- |
| `BRG-2111-P1006_p1.jpg` (semi_mallet) | 縦長フラップ蓋式、本体浅め、横方向に開く |
| `BRG-VORTEX_HC_PC_p3.jpg` (BRG-2006-P541、full_mallet 系統 X) | **横長で奥行き 80mm、ブレード型に近い細長プロファイル**。蓋ではなく前面開口式 |
| `BRG-MALLET_PUTTER_COVER_FIDLOCK_p1.jpg` (BRG-2004-P448、full_mallet 系統 Y) | 縦長の蓋開き式、本体高さ 200mm で奥行き 40mm、典型的フルマレット |

**結論**: 系統 X と系統 Y は形状的に明確に異なる。`samples.json` の
`head_type` ラベルは形状ではなく**製品分類カテゴリ (用途/呼称)** で切られて
いる疑いが裏付けられた。

### 系統 X 5 件 (該当 sample_number)

```
BRG-2111-P1059
BRG-2006-P541
BRG-2007-P571
BRG-2109-P897
BRG-2109-P936
```

(寸法 `W180×H150×D80mm` 共通、既存 `putter-blade` の `defaultDimensions`
と同寸法、形状的にも blade に近い)

> **注**: 当初依頼の系統 X 候補に `BRG-2109-P900` 系の確認も含まれていたが、
> その系列 (P900 / P901 / P914 / P915) は寸法 `幅120×高さ200×マチ40mm` で
> 系統 Y に属する。系統 X は上記 5 件で確定。

---

## 3. 検討した 4 案と採否

| 案 | 内容 | 採否 |
| --- | --- | --- |
| **A** | catalog `putter-full-mallet` を **系統 Y のみ** で整備、系統 X 5 件は別途扱い | **採用** |
| B | catalog に `putter-full-mallet-flat` 等の 2 件目テンプレを増やし、系統 X 用線画も別途用意 | 不採用 — Phase B のスコープが膨らみ、線画化が 2 種に増える |
| C | `samples.json` の head_type を視覚再判定し、系統 X 5 件を「ブレード」に補正 | 不採用 — 業務元データ `samples.json` の改変リスクを回避 |
| D | 寸法バリアント情報だけ catalog に持たせる (`dimensionVariants: [...]`) | 不採用 — 線画 1 種で兼用するため画像品質が落ちる |

### A 案採用の根拠

1. **Phase B のスコープを膨らませない** — B 案の 2 線画化より早く完了、Phase B
   が膨らむと Layer 3b の効果検証が遅れる
2. **業務元データ `samples.json` を保持** — C 案は `head_type` の改変が
   入り、samples.json 改変の連鎖リスクを回避
3. **画像品質の確保** — D 案は線画 1 種で兼用するため系統 X の生成画像が
   縦横比でずれる、却下
4. **段階的に拡張可能** — 系統 X の扱いは別 Layer に分離、後続で形状的に
   合理的な解 (`putter-blade` の寸法バリアント追加 / 別 template `putter-blade-large` /
   `samples.json` の自動再分類スクリプト等) を検討する余地を残す

---

## 4. sampleReferences 候補 (Phase B 着手時に catalog 更新)

### `putter-semi-mallet`

```
BRG-2111-P1006 (NAVY)            ← 線画ソース
BRG-2111-P1007 (NAVY)
BRG-2111-P1028 (BLACK)
BRG-2111-P1048 (GRAY)
BRG-2111-P1049 (GRAY)
BRG-2111-P1059 (PC GREEN)        ← ※ Layer 3a-fix で再分類検討
BRG-2111-P1069 (PC.GREEN)
BRG-2111-P1070 (PC.GREEN)
```

`samples.json` の `head_type === 'セミマレット'` のうち confidence:high の
8 件。medium の 1 件 `BRG-2111-P1027` は除外。

### `putter-full-mallet`

`head_type === 'フルマレット'` の 27 件 - 系統 X 5 件 = **22 件** が候補。
代表は `BRG-2004-P448` (線画ソース)。具体的な sampleReferences リストは
Phase B 着手時に絞り込む (現状 `catalog.json` の該当エントリは空配列の
ままで OK、Phase B PR で更新)。

---

## 5. 系統 X 5 件の保留理由 (後続 Layer)

| 理由 | 詳細 |
| --- | --- |
| **形状判定が `samples.json` のラベルと不一致** | `head_type === 'フルマレット'` だが視覚的にはブレード型寄り |
| **`samples.json` の改変リスク** | 業務元データ。形状で再分類したい場合 (案 C) は影響範囲を見極めるべき |
| **既存 `getShapeByAlias` 経路の整合性確認が必要** | サンプル帳 → wizard の seed 経路 (`App.tsx:84-101`) で `head_type` が `headShape` に変換される。系統 X を `pin` 寄りにマップするか `mallet` のままにするかで Layer 3a の `templateId` 自動セット挙動が変わる |
| **`putter-blade` の寸法バリアントとの関係** | `defaultDimensions: { length: 180, width: 150, depth: 80 }` (catalog) と系統 X (`W180×H150×D80mm`) が**完全一致** — `putter-blade` の寸法バリアントとして扱うのが自然な可能性 |

### 後続 Layer (仮称 Layer 3a-fix-classification) のスコープ案

1. 系統 X 5 件を視覚再確認、サンプル帳の `head_type` ラベルが「分類
   カテゴリ」(用途/呼称) なのか「形状」(視覚) なのかを業務側にヒアリング
2. ヒアリング結果に応じて以下のいずれか:
   - (a) catalog に `putter-blade-large` 追加 (寸法 W180×H150×D80)
   - (b) `putter-blade` の `defaultDimensions` を寸法 variant 配列化
   - (c) `samples.json` の `head_type` 補正 (案 C 復活、業務側合意ベース)
3. `getShapeByAlias` の挙動と Layer 3a の `templateId` 自動セットの整合性を
   保つテストを追加

---

## 6. 触らないと決めたもの (Layer 3b スコープ外)

- 線画化作業そのもの (= Phase B 着手)
- 系統 X 5 件の再分類
- `samples.json` の改変
- `head_type` enum の拡張
- catalog エントリの追加 (現状 3 件のまま、Layer 3b は既存エントリの
  フィールド追加のみ)

---

## 7. Phase B 着手時のチェックリスト

1. [ ] `BRG-2111-P1006_p1.jpg` を ChatGPT で 4 アングル線画化 (front /
       side_toe / back / side_heel)、1024×1024 正規化
2. [ ] `BRG-2004-P448` の元画像 (`BRG-MALLET_PUTTER_COVER_FIDLOCK_p1.jpg`) を
       同様に 4 アングル線画化
3. [ ] LOGO プレースホルダー化 (Layer 3a と同じ手順、ロゴ部分を「LOGO」文字
       置換)
4. [ ] `public/templates/putter-semi-mallet/{front,side_toe,back,side_heel}.png`
       配置
5. [ ] `public/templates/putter-full-mallet/{front,side_toe,back,side_heel}.png`
       配置
6. [ ] `catalog.json` の `putter-semi-mallet` エントリで `baseImages` 4 path
       入力 + `lineArtStatus: 'complete'` + `metadata.source` / `createdAt` /
       `logoTreatment: 'placeholder'` 更新
7. [ ] `putter-full-mallet` も同様に更新 (系統 Y のみで)
8. [ ] `sampleReferences` に上記 §4 の sample_number を追記
9. [ ] `getCompleteTemplates` テストの期待件数を 1 → 3 件に更新
10. [ ] Step3 の動作確認 (Step1 で head_shape=mallet/neo_mallet → Step3 で
        新しい線画 PNG が表示される / pending バナーが消える)
