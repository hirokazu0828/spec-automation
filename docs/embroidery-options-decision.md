# 刺繍技法・糸種オプション master 化の判断記録

> Layer 2 Task 1 で `Step4.tsx` PAGE 3 の刺繍技法 / 糸種 `<select>` を `putter-cover.json` 駆動に置換した際の決定ログ。

## 1. 判断基準

タスク指示書の指針:
> 既存仕様書 PDF（プロジェクト内 7 件）で実際に使われている技法のみ master に残す

**ただし、本セッション (Web 環境) からは PDF 実物を参照できない**。そのため次の代替基準で判断:

1. master `parameters.embroidery.options` に既に登録されている値 → 「使われている可能性が高い」と扱い、Step4 の選択肢から漏れていても残す方向
2. Step4 のハードコード select に存在し master にない値 → 「業務側の現役ラベル」と扱い master へ追加する方向
3. 1 と 2 が**ラベル微差**で同義のときは master の英語 ID 側に寄せる
4. 1 と 2 が**結合表現**(例: 「普通刺繍・振り刺繍」)のときは master の独立オプションを 2 つ選ぶ運用にし、結合オプションは作らない

## 2. 刺繍技法の決定

| Step4 ハードコード | master 既存 | 結果 |
|---|---|---|
| 普通刺繍 | `flat` (普通刺繍（フラット）) | master の `flat` をそのまま使用 (ラベル微差吸収) |
| 普通刺繍・振り刺繍 | — (結合) | **削除**。`flat` と `satin` を別個に提供 (基準 4) |
| 畳刺繍 | `tatami` | 既存 |
| 畳立体刺繍 | `tatami_3d` | 既存 |
| 文字型土台畳刺繍 | `tatami_char` | 既存 |
| シリコンパッチ | `silicon` | 既存 |
| プリント | — | master に **`print` を追加** (基準 2) |
| — | `metal_plate` (金属プレート) | master 既存値を残し、Step4 にも露出 (基準 1) |

最終 master `parameters.embroidery.options`: `flat`, `satin`, `tatami`, `tatami_3d`, `tatami_char`, `metal_plate`, `silicon`, `print` (8 種)

「普通刺繍・振り刺繍」を組み合わせて指定したいときは、`embroideryDetails` テーブルで 2 行に分けて記録する (`flat` 1 行 + `satin` 1 行) — 仕様書としては **より明示的になる**ので運用上のデメリットはないと判断。

## 3. 糸種の決定

master に糸種カテゴリが未登録のため、**新規パラメータ `parameters.thread_type` を追加**。

| Step4 ハードコード | master value | 判断 |
|---|---|---|
| 銀杏 | `ginnan` | 日本固有の糸種。ローマ字化して登録 |
| メタリック糸 | `metallic` | 既存業界一般の語彙 |
| 標準刺繍糸 | `standard` | デフォルト糸 |

`parameters.thread_type` は `parameters.embroidery` と並列の独立パラメータとした (= 1 つの仕様書に複数の `embroideryDetails` 行があり、それぞれが独立に技法 × 糸種 の組み合わせを持つため、技法のサブカテゴリにすべきではない)。

## 4. 後方互換性

既存ドラフトの `embroideryDetails[].technique` と `[].threadType` には**自由文字列**が入る前提だった (Step4 select は単なる UI 補助で、データ層は string)。本変更で:

- 旧仕様書の "普通刺繍・振り刺繍" のような結合ラベル文字列が値として残るドラフトがあっても、`<select>` 側の選択肢に該当値がなければ select は空表示になる
- 値そのものは消えない (data 層は文字列として保持され続ける)
- 必要に応じて手動で `flat` / `satin` に修正してもらう

## 5. 残課題 (Layer 4 以降に持ち越し)

- 7 件の既存仕様書 PDF の実データ確認はこのセッションでは実施できないので、**実機 (Desktop) で過去 PDF を見ながら master を再点検する手作業**が要る
- 「振り刺繍 (= satin)」が実務で使われているか不明。使われていなければ `satin` も削除候補
- master `metal_plate` の使用頻度も同様
