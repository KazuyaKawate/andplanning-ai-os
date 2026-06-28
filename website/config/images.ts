/**
 * And Planning — サイト画像設定
 *
 * 全ての画像パスはここで一元管理。
 * 実画像（WebP/PNG）を /public/images/ に配置するだけで自動切り替え。
 * CMS化時は src/fallback を API レスポンスに置き換えるだけで対応可能。
 *
 * 差し替え方法:
 *   1. /public/images/hero-visual.webp を配置
 *   2. コード変更不要。SmartImage が自動的に webp を優先表示
 */

export type SiteImage = {
  /** 実画像パス（WebP / PNG）。/public/ からの相対パス。 */
  src: string
  /** SVG プレースホルダーパス。実画像が存在しない場合に自動表示。 */
  fallback: string
  /** アクセシビリティ・SEO 用 alt テキスト。 */
  alt: string
  /** 画像の幅（px）。アスペクト比の予約 → CLS ゼロに使用。 */
  width: number
  /** 画像の高さ（px）。アスペクト比の予約 → CLS ゼロに使用。 */
  height: number
}

/* ========== Brand Logos ========== */

export const logoImages = {
  /** ヘッダー・横型ロゴ。180×36 推奨。 */
  horizontal: {
    src:      '/images/logo-horizontal.webp',
    fallback: '/logos/main-logo.svg',
    alt:      'And Planning',
    width:    180,
    height:   36,
  },
  /** フッター・シンボルマーク。48×48 推奨。 */
  symbol: {
    src:      '/images/logo-symbol.webp',
    fallback: '/logos/main-logo.svg',
    alt:      'And Planning ロゴマーク',
    width:    48,
    height:   48,
  },
} satisfies Record<string, SiteImage>

/* ========== Section Images ========== */

export const sectionImages = {
  /** Hero 右側ビジュアル。AI OS ダッシュボードモックアップ。 */
  heroVisual: {
    src:      '/images/hero-visual.webp',
    fallback: '/images/hero-visual.svg',
    alt:      'And Planning AI OS — 6 Factory のリアルタイムダッシュボード画面',
    width:    1120,
    height:   920,
  },
  /** AI OS セクション。3層アーキテクチャ図解。 */
  aiOsDiagram: {
    src:      '/images/ai-os-diagram.webp',
    fallback: '/images/ai-os-diagram.svg',
    alt:      'And Planning AI OS 3層アーキテクチャ図解 — OS Foundation・Engine Layer・Factory Layer',
    width:    1600,
    height:   720,
  },
  /** Roadmap セクション。開発タイムライン。 */
  roadmapVisual: {
    src:      '/images/roadmap-visual.webp',
    fallback: '/images/roadmap-visual.svg',
    alt:      'And Planning 開発ロードマップ — 2025 Q4 から 2027 Q2 の工程図',
    width:    800,
    height:   400,
  },
} satisfies Record<string, SiteImage>

/* ========== Factory Images ========== */

export const factoryImages = {
  creator: {
    src:      '/images/creator-factory.webp',
    fallback: '/images/creator-factory.svg',
    alt:      'Creator Factory — 企画書・コンセプト・スクリプト自動生成',
    width:    800,
    height:   440,
  },
  writing: {
    src:      '/images/writing-factory.webp',
    fallback: '/images/writing-factory.svg',
    alt:      'Writing Factory — note記事・ブログ 9ステップ自動生成',
    width:    800,
    height:   440,
  },
  video: {
    src:      '/images/video-factory.webp',
    fallback: '/images/video-factory.svg',
    alt:      'Video Factory — YouTube台本・サムネイル・動画構成自動生成',
    width:    800,
    height:   440,
  },
  research: {
    src:      '/images/research-factory.webp',
    fallback: '/images/research-factory.svg',
    alt:      'Research Factory — トレンドリサーチ・競合分析・市場調査自動収集',
    width:    800,
    height:   440,
  },
  marketing: {
    src:      '/images/marketing-factory.webp',
    fallback: '/images/marketing-factory.svg',
    alt:      'Marketing Factory — SNS投稿・広告コピー・LP文章自動生成',
    width:    800,
    height:   440,
  },
  fortune: {
    src:      '/images/fortune-factory.webp',
    fallback: '/images/fortune-factory.svg',
    alt:      'Fortune Factory — 運勢記事・占い結果・年間予測レポート自動生成',
    width:    800,
    height:   440,
  },
} satisfies Record<string, SiteImage>
