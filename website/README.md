# And Planning — Website

And Planning AI Operating System の公式ウェブサイト。

## 技術スタック

| 技術 | バージョン | 用途 |
|------|----------|------|
| [Next.js](https://nextjs.org/) | 16+ | App Router フレームワーク |
| TypeScript | 5+ | 型安全 |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | スタイリング |
| [Motion](https://motion.dev/) | 12+ | アニメーション |

## ディレクトリ構成

```
website/
├── app/              # Next.js App Router（pages・layout）
├── components/
│   ├── layout/       # Header・Footer（全ページ共通）
│   └── ui/           # 再利用UIコンポーネント
├── sections/         # トップページの各セクション
├── lib/              # ユーティリティ関数
├── styles/           # グローバルCSS・ブランドデザイン
├── types/            # TypeScript 型定義
├── hooks/            # カスタムReact Hooks
├── data/             # サイトデータ（Factory一覧・ナビ等）
└── public/           # 静的ファイル
```

## セクション構成

1. Hero — キャッチコピー・CTA
2. About — And Planningとは
3. AI OS — AI Operating System概要
4. Workflow Engine — ワークフロー説明
5. Factories — 6 Factory一覧（Creator / Writing / Video / Research / Marketing / Fortune）
6. Roadmap — Phase 1〜4
7. News — ニュース
8. Contact — お問い合わせ
9. Footer

## 開発コマンド

```bash
npm install
npm run dev      # localhost:3000
npm run build    # 本番ビルド
npm run lint     # Lint
```

## デプロイ

**Vercel（推奨）:** `git push` で自動デプロイ

**GitHub Pages:** `next.config.ts` の `output: 'export'` を有効化してから `npm run build`

## ブランドガイドライン

カラー・フォント・スペーシング仕様は `../docs/Brand.md` を参照。
実装値は `styles/globals.css` の `@theme` ブロックに定義済み。
