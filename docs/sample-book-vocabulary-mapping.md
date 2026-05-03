# SampleBook フィルタ語彙のマスタマッピング設計

> Layer 2 Task 4 で `SampleBook.tsx` のハードコードフィルタ配列を置換する際の判断記録。

## 1. samples.json 実値分布 (47 件)

### shape.head_type
| 値 | 件数 |
|---|---|
| フルマレット | 27 |
| ブレード | 13 |
| セミマレット | 9 |

### closure.type
| 値 | 件数 |
|---|---|
| マグネット | 45 |
| ベルクロ | 2 |
| FIDLOCK | 1 |
| ベルト | 1 |

### decoration.type
| 値 | 件数 |
|---|---|
| 刺繍 | 41 |
| プリント | 5 |
| なし | 3 |

## 2. master (`putter-cover.json`) との対比

### head_shape: master = `pin` / `mallet` / `neo_mallet` (3 値)

サンプル側の語彙 (ブレード / セミマレット / フルマレット) と master の語彙 (英語 ID) が**形は違うが意味は対応する**。
→ master `head_shape.options[].aliases` で吸収可能。Layer 2 Task 3 で実装済。

| sample 語彙 | master value |
|---|---|
| ブレード | `pin` |
| セミマレット | `mallet` |
| フルマレット | `neo_mallet` |

filter UI は **master の `label` で表示**し、内部の絞込は `getShapeByAlias(sample.shape.head_type)` で master value に正規化してから比較。

### closure: master 4 値 vs sample 4 値 — **完全に別語彙**

| master closure.options[].value | sample closure.type 値 |
|---|---|
| `wire_spring` (ワイヤーバネ式) | マグネット |
| `wire_cord` (ワイヤーバネ式+コードストッパー) | ベルクロ |
| `shirring` (シャーリングゴム) | FIDLOCK |
| `cord_stop` (コードストッパー) | ベルト |

意味的に重ならず、1 対 1 マッピング不可:
- master = 「**ワイヤー / ゴム / コードストッパー**」(構造方式)
- sample = 「**マグネット / ベルクロ / FIDLOCK / ベルト**」(製品名・閉じ機構の感覚)

→ **Option B**: 独立カテゴリとして保持。SampleBook の closure フィルタは samples.json から動的に算出する。master の `closure` は仕様書側 (Step2 / Step4) で使う。

### decoration: master `embroidery` 8 値 vs sample 3 値

master `embroidery.options` (Layer 2 Task 1 で `print` を追加して 8 値):
`flat`, `satin`, `tatami`, `tatami_3d`, `tatami_char`, `metal_plate`, `silicon`, `print`

sample `decoration.type`: `刺繍` / `プリント` / `なし`

サンプル側は技法を区別せず大分類のみ (= 「刺繍」全部が `flat`/`tatami`/etc 区別なく 1 つ)。粒度が違うため**正規化はせず独立カテゴリ**として扱う。

→ **Option B**: 独立カテゴリ。

## 3. 実装

新規 helper `src/components/SampleBook/sampleHelpers.ts`:

- `getSampleClosureTypes(samples: PutterSample[]): string[]`
- `getSampleDecorationTypes(samples: PutterSample[]): string[]`

両関数とも実データから unique 値を昇順 (日本語 locale) で返す。`SampleBook.tsx` のハードコード `['マグネット', ...]` 配列を削除し、これらの戻り値を `<select>` の選択肢に使う。

shape フィルタは別経路で `getOptions('head_shape')` を使い master を直接表示、絞込は `getShapeByAlias` で正規化。

## 4. 副次効果

- 旧フィルタにあった `スクエアマレット` (samples に該当エントリ 0 件) と decoration の `複合` (samples に該当 0 件) は **自動的に消える**。
- 将来 samples.json に新しい closure/decoration 値が追加されたとき、フィルタも自動的に増える (= JSON-driven)。

## 5. 残課題 (持ち越し)

- closure 語彙の整合は将来「サンプル帳のサンプルから新規仕様書を起こす」フローを作るときに再考が必要 (Layer 6 = 3 ルート起点判定の B/C ルートで関係する可能性大)。その際は sample → 仕様書に変換する辞書 (`マグネット` → どの master closure に近いか) を別途設計する。今回はスコープ外。
