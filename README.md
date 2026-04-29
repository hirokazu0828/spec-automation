# spec-automation

商品の仕様書 (スペックシート) を、ブランド戦略 → 組み合わせ提案 → AI 画像プロンプト → 印刷用最終仕様書 までウィザード形式で自動生成する Web アプリ。

現状はパターカバー (ゴルフ用品) ドメインで動作するが、`src/data/spec/` 配下にドメインを追加することで他商品にも展開していく前提で設計されている。

## 技術スタック

- React 19 + TypeScript (strict)
- Vite 8 / Tailwind v4
- Vitest + Testing Library (unit / component)
- Vercel Serverless Function (`api/generate-image.ts`) で OpenAI Image API を叩く

## セットアップ

```sh
npm install
cp .env.example .env
# .env を編集して VITE_APP_PASSWORD と (画像生成を使う場合) OPENAI_API_KEY を設定
npm run dev
```

`VITE_APP_PASSWORD` が未設定だとアプリは起動時に明示的に失敗する。サンプル帳のアクセスゲート用パスワード。

## スクリプト

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー (Vite) |
| `npm run build` | TypeScript 型チェック + 本番ビルド |
| `npm run lint` | ESLint |
| `npm test` | Vitest を一回実行 |
| `npm run test:watch` | Vitest watch モード |
| `npm run preview` | ビルド済みファイルのプレビュー |

## ディレクトリ

```
src/
  App.tsx                  ウィザードのルート (Step1〜5 切替)
  components/
    Step1.tsx 〜 Step4.tsx ウィザード各ステップ
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
  utils/
    specHelpers.ts         getLabel, COLOR_HEX_MAP など共通ヘルパー
  test/
    setup.ts               Vitest 用セットアップ (jest-dom)
api/
  generate-image.ts        Vercel Serverless Function (OpenAI)
```

## セキュリティ上のメモ

- `VITE_APP_PASSWORD` はクライアントバンドルに展開される。本格的な認証ではなく軽いゲート用。本番運用するならサーバー側認証への置き換えを検討する。
- `OPENAI_API_KEY` はサーバー側 (`api/`) でのみ参照され、クライアントには露出しない。

## ドメインを追加する場合 (今後)

1. `src/data/spec/<your-domain>.json` を `SpecJson` 型に沿って作成
2. `src/data/spec/index.ts` の `DomainKey` と `domains` に追加
3. ステップコンポーネントから `domains[key]` を選択するよう拡張する
