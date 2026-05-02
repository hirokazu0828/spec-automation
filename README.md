# spec-automation

商品の仕様書 (スペックシート) を、ホーム上のドラフト一覧 → ウィザード (基本情報 → 提案ベース → 画像生成 → 印刷用最終仕様書) で組み立てる Web アプリ。

現状はパターカバー (ゴルフ用品) ドメインで動作するが、`src/data/spec/` 配下にドメインを追加することで他商品にも展開していく前提で設計されている。

## 業務フロー

1. **ホーム** = ドラフト一覧。新規作成・複製・削除・サンプル帳への遷移ができる。検索バーで品番/ブランド絞り込み。
2. **新規作成 → STEP1: 企画流し込み**。品番・ブランド・ヘッド形状・ブランドポジションを入力。
3. **STEP2: 提案ベース + 詳細フォーム**。AI 提案を 1 つ選んで適用すると、その値が `baseProposal` として保管され、フォーム上で「AI推奨」「変更済」「↺ 元に戻す」のバッジが表示される。
4. **STEP3: 線図 + 画像生成**。`headShape` に対応する線図 (`/public/lineart/{pin,mallet,neo_mallet}.png`) を入力にして OpenAI gpt-image-1 (image-edit) でアプリ内生成。生成画像は IndexedDB にドラフト ID で保存。
5. **STEP4: 最終仕様書プレビュー**。STEP3 で生成した画像は p1 の正面写真スロットに自動で読み込まれる (生成時にチェックを入れていれば即時反映)。

ドラフトはウィザード内で 300ms debounce で localStorage に自動保存。リロードや別タブからも復元可能。

## 技術スタック

- React 19 + TypeScript (strict)
- Vite 8 / Tailwind v4
- Vitest + Testing Library (unit / component)
- Vercel Serverless Function (`api/generate-image.ts`) で OpenAI Image API を叩く
- ドラフトメタは localStorage、生成画像は IndexedDB (`idb-keyval`)

## セットアップ

```sh
npm install
cp .env.example .env
# .env を編集して VITE_APP_PASSWORD と (画像生成を使う場合) OPENAI_API_KEY を設定
npm run dev
```

`VITE_APP_PASSWORD` が未設定だとアプリは起動時に明示的に失敗する。サンプル帳のアクセスゲート用パスワード。

STEP3 の画像生成を実機で試す場合は、`vercel dev` を `OPENAI_API_KEY` を渡した状態で起動する。

## スクリプト

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー (Vite) |
| `npm run build` | TypeScript 型チェック + 本番ビルド |
| `npm run build:lineart` | サンプル写真から STEP3 用の線図 PNG を抽出 (一回限り、開発機ローカルで実行) |
| `npm run lint` | ESLint |
| `npm test` | Vitest を一回実行 |
| `npm run test:watch` | Vitest watch モード |
| `npm run preview` | ビルド済みファイルのプレビュー |

### 線図ファイルについて

STEP3 の線図テンプレートは `public/lineart/{pin,mallet,neo_mallet}.svg` にハンドドローで配置している。フォーム送信時に `<canvas>` で 1024x1024 PNG にラスタライズしてから OpenAI image-edit に渡す。

`npm run build:lineart` は `scripts/lineart-config.json` に書かれたソース写真 (`/public/images/*.jpg`) から `image-js` + `canny-edge-detector` で線図 PNG を生成するスクリプトだが、**現状の `/public/images/` は単品写真ではなく複数製品が並んだサンプルシートなので、自動抽出結果は実用にならない**。将来クリーンな単品写真が用意できた時に活用するための雛形。実用するときは出力先を `.png` にして Step3 のパスを更新する。

## ディレクトリ

```
src/
  App.tsx                  View 型ルーティング (home / wizard / samples)
  components/
    Home/                  ドラフト一覧
    Step1.tsx              企画流し込み
    Step2/                 組み合わせ提案 + フォーム (baseProposal 方式)
    Step3/                 線図 + 画像生成
    Step4.tsx              印刷用最終仕様書
    Toast.tsx              共通トースト (useToast)
    SampleBook/            サンプル帳 + AuthGate
  data/
    spec/                  ドメイン別の仕様データ
      types.ts             SpecJson 型
      index.ts             domains マップ + デフォルト export
      putter-cover.json    パターカバードメイン
    samples.json           サンプル帳のデータ
  hooks/
    useStep2Proposals.ts   AI 提案ロジック
    useSpecDrafts.ts       ドラフト一覧 (localStorage) の CRUD hook
  lib/
    imageStore.ts          IndexedDB ラッパ (生成画像をドラフト ID で保存)
  utils/
    specHelpers.ts         getLabel, COLOR_HEX_MAP など共通ヘルパー
  test/
    setup.ts               Vitest 用セットアップ (jest-dom)
api/
  generate-image.ts        Vercel Serverless Function (OpenAI gpt-image-1)
scripts/
  extract-lineart.ts       線図抽出スクリプト (npm run build:lineart)
  lineart-config.json      shape → ソース写真 のマッピング + Canny パラメタ
```

## セキュリティ上のメモ

- `VITE_APP_PASSWORD` はクライアントバンドルに展開される。本格的な認証ではなく軽いゲート用。本番運用するならサーバー側認証への置き換えを検討する。
- `OPENAI_API_KEY` はサーバー側 (`api/`) でのみ参照され、クライアントには露出しない。
- ドラフトと生成画像はブラウザのローカルストレージ (localStorage / IndexedDB) に保存される。クリアされると復元できない。

## ドメインを追加する場合 (今後)

1. `src/data/spec/<your-domain>.json` を `SpecJson` 型に沿って作成
2. `src/data/spec/index.ts` の `DomainKey` と `domains` に追加
3. ステップコンポーネントから `domains[key]` を選択するよう拡張する
