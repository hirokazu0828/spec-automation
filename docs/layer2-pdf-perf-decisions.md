# Layer 2-PDF-perf: フォントサブセット化による PDF 生成高速化 設計記録

> Layer 2-PDF (PR #8) で導入した `@react-pdf/renderer` の PDF 生成が
> 実機で **約 10 秒**かかる問題を、Noto Sans JP のサブセット化で
> **約 1〜2 秒**まで短縮した際の判断記録。

## 1. 問題: フルウェイト WOFF が大きすぎる

`@fontsource/noto-sans-jp` の `japanese` サブセット WOFF (Regular / Bold)
を `public/fonts/` にコピーしてから `Font.register({ src: '/fonts/...' })`
で登録していた。サイズは:

| ファイル                           | サイズ   |
| ---------------------------------- | -------- |
| `NotoSansJP-Regular.woff` (フル)   | 1380 KB  |
| `NotoSansJP-Bold.woff` (フル)      | 1396 KB  |
| **合計**                           | **2776 KB** |

`@react-pdf/renderer` (内部で `fontkit` + `pdfkit`) は Font.register された
WOFF を**毎回フルパース → サブセット化 → PDF 内に埋め込み**する。Step4 の
ような実データを 3 ページ流すと、テキストノードが数百個になる + ピボット
テーブルのセルごとにフォント参照が走るため、**生成完了まで実機で 10〜12 秒**
かかっていた (Vite dev / Chrome 131 / M2 Mac 計測値)。

## 2. 解決方針: ビルド時にサブセット WOFF を作る

`@react-pdf/renderer` がランタイムにする「サブセット化」を、**事前に
`subset-font` (wasm版 hb-subset) で済ませて固定の WOFF として書き出す**。

実装:

| ファイル                                     | 役割                                                    |
| -------------------------------------------- | ------------------------------------------------------- |
| `scripts/data/charset.ts`                    | `BUSINESS_CHARSET` (~2400 文字) の定義                  |
| `scripts/subset-fonts.ts`                    | フル WOFF → サブセット WOFF を出力                      |
| `scripts/data/charset.test.ts` (6 tests)     | charset の網羅性 (ASCII/かな/部首/重複なし) を検証      |
| `scripts/subset-fonts.test.ts` (6 tests)     | 出力 WOFF の存在 / 縮小率 / サイズ上限を検証            |
| `src/components/Step4/pdf/fonts.ts` 修正     | `Font.register` の `src` を `-subset.woff` 版に切替     |
| `package.json` `postinstall` を連結          | `download-fonts.ts && subset-fonts.ts`                  |
| `package.json` script `subset-fonts`         | 手動再生成用                                            |

## 3. 文字集合 (BUSINESS_CHARSET)

`scripts/data/charset.ts` で組み立てる。内訳:

| ブロック              | コードポイント            | 文字数 |
| --------------------- | ------------------------- | ------ |
| ASCII printable       | U+0020..U+007E            | 95     |
| Hiragana              | U+3041..U+3096            | 86     |
| Katakana (incl. ー)   | U+30A1..U+30FF            | 95     |
| 全角記号 / 罫線 / 数字 | (固定リスト)              | ~120   |
| 常用漢字 2136         | `joyo-kanji` パッケージ   | 2136   |
| 業務固有語 (色名等)    | (固定リスト)              | ~140   |
| **合計 (重複排除後)** | —                         | **2533 (UTF-16 単位)** |

業務固有語は `src/data/spec/putter-cover.json` のラベル + `samples.json` の
語彙 + 既存 7 件の参考 PDF 内の文字から抜き出した:

- ラベル: 柔ら羊毛絨綿弾性裏面表面糸番裁断縫合編込補強磁石装飾繊維
- 色 / 金具: 橙桜紫菫薔薇珊瑚琥珀芥菖蒲茜黛瑪瑙
- 刺繍 / 糸種: 畳銀杏鎖縫斜縞綾織梳毛
- 商号: 帝國貴族殿様御侍商工會社株式合資
- 手配 / 数量: 宛先納期備考個本枚組箱袋

### 拡張手順

業務側が新しい語彙を追加して PDF に**豆腐 (□)** が出たら:

1. `scripts/data/charset.ts` の `BUSINESS_SPECIFIC` に追加
2. `npm run subset-fonts` を実行
3. 出力 WOFF を git に**コミットしない** (`.gitignore` 通り)
4. 既存テスト (`scripts/data/charset.test.ts`) は通るはずだが、新文字を
   1〜2 個 `required` 配列に追加して回帰防止しておくのが安全

## 4. サブセット結果 (実測)

`npm run subset-fonts` 出力 (2026-05-07 計測):

```
[subset-fonts] OK Regular 1380 KB → 451 KB (32.7%)
[subset-fonts] OK Bold    1396 KB → 457 KB (32.8%)
```

| ファイル                                  | Before  | After  | 削減率 |
| ----------------------------------------- | ------- | ------ | ------ |
| `NotoSansJP-Regular(-subset).woff`        | 1380 KB | 451 KB | -67%   |
| `NotoSansJP-Bold(-subset).woff`           | 1396 KB | 457 KB | -67%   |
| **合計**                                  | 2776 KB | 908 KB | -67%   |

PDF 生成の体感:

| 計測対象                              | Before    | After     |
| ------------------------------------- | --------- | --------- |
| Step4「PDF を生成」ボタン → DL 完了   | ~10〜12 s | ~1〜2 s   |

(目視ストップウォッチ計測なので ±0.5 s 程度の誤差は含む。CI では
測らない。)

## 5. なぜ `subset-font` を選んだか

| 候補                       | 採否    | 理由                                                              |
| -------------------------- | ------- | ----------------------------------------------------------------- |
| `subset-font`              | **採用** | wasm版 hb-subset を内包、Node 単独で完結、WOFF 入出力対応           |
| `glyphhanger`              | 不採用  | フォントツールチェーンの導入が重く、Python/CLI 依存                |
| `pyftsubset` (fonttools)   | 不採用  | Python ランタイム必須。CI / ローカル環境ともに不要に増える         |
| `@react-pdf/renderer` 任せ | 不採用  | 現状そのもの — 毎レンダーでサブセット化、これが 10 秒の原因        |

## 6. なぜサブセット WOFF を git にコミットしないか

- フル WOFF 同様、`postinstall` (`scripts/subset-fonts.ts`) で再現可能
- リポジトリサイズを抑える (~900 KB のバイナリ差分は git LFS なしでは重い)
- `joyo-kanji` のバージョンや `BUSINESS_SPECIFIC` を変えるたびに再生成する
  方が自然 (コミット忘れによる古い WOFF の温存を防ぐ)
- `.gitignore` に `public/fonts/` ディレクトリ単位で記載済み (Layer 2-PDF
  からの継続)

## 7. なぜ `postinstall` で連結したか

- 開発者は `npm install` 1 回だけ叩けば PDF が動く状態にしたい
- ダウンロードしたフル WOFF が無いままサブセットを試みると失敗するので、
  順序保証 (`download-fonts.ts && subset-fonts.ts`) が必要
- どちらも冪等 (出力ファイルが既にあればスキップ) なので 2 回目以降の
  `npm install` でコストはほぼゼロ
- 失敗しても `|| echo ...` で `npm install` 自体は緑色のまま続行 (Vercel
  などのオフライン的環境を壊さない)

## 8. リスク / フォールバック

| 状況                                     | 挙動                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| `*-subset.woff` が無い (postinstall 失敗) | `Font.register` は静かに no-op、Helvetica fallback で日本語が豆腐に。**目視で即わかる**ので開発者が `npm run subset-fonts` を再実行 |
| 業務語彙の追加で豆腐が出た               | §3「拡張手順」へ                                             |
| `subset-font` の wasm が新しい Node で動かなくなった | `subset-font` のバージョンを更新、最悪 `pyftsubset` に切替 |
| `joyo-kanji` パッケージが BMP 外文字を含む | charset テストが拾う (現状 1 文字混入を確認 → サロゲートペア対応済) |

## 9. 今回触らなかったもの (スコープ外)

- フォントの英字側 (Helvetica fallback) → 仕様書は日本語前提、英字も Noto
  でカバー済み
- PDF レンダリングの並列化 / WebWorker 化 → サブセット化だけで実用速度に
  なったので不要
- 画像最適化 (productPhotos) → サイズではなくフォントが律速だったため
  Layer 2-PDF-perf の範疇外
