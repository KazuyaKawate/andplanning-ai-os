import type { NavItem, Factory, Phase, NewsItem, OsLayer, RoadmapItem, SocialLink, LegalLink } from '@/types'

export const siteConfig = {
  name: 'And Planning',
  tagline: 'Build Your AI Factory. Operate Your Future.',
  taglineJa: 'AIが考え、AIが動き、AIが成果を積み重ねる。',
  description: '日本初のAI Operating System。あなたのビジネスを自動化するAI Factory Platform。',
  email: 'hello@andplanning.ai',
  github: 'https://github.com/andplanning',
  url: 'https://andplanning.ai',
}

export const navItems: NavItem[] = [
  { label: 'About',     href: '#about'     },
  { label: 'AI OS',     href: '#ai-os'     },
  { label: 'Factories', href: '#factories' },
  { label: 'Roadmap',   href: '#roadmap'   },
  { label: 'News',      href: '#news'      },
  { label: 'Contact',   href: '#contact'   },
]

export const factories: Factory[] = [
  {
    id: 'creator',
    name: 'Creator Factory',
    nameJa: 'クリエイター工場',
    descriptionJa: 'コンテンツクリエイターの企画・構成・スクリプトをAIが自動生成。アイデア出しから記事タイトル案まで一括対応します。',
    icon: '✦',
    status: 'stub',
    accentColor: '#8B5CF6',
    features: ['企画書・コンセプト立案', 'スクリプト・ストーリーボード', '記事タイトル・アイデア出し'],
    releaseLabel: 'β 2026 Q3',
  },
  {
    id: 'writing',
    name: 'Writing Factory',
    nameJa: '文章工場',
    descriptionJa: 'note記事・ブログ・メルマガを9ステップのWorkflowで自動生成。品質レビュー・SEO最適化・公開まで全自動対応。',
    icon: '✐',
    status: 'active',
    accentColor: '#2563EB',
    features: ['note記事 9ステップ自動生成', 'SEOキーワード最適化', 'CTA・メタ文章自動作成'],
    releaseLabel: '提供中',
  },
  {
    id: 'video',
    name: 'Video Factory',
    nameJa: '動画工場',
    descriptionJa: 'YouTube台本・サムネイル指示・動画構成案をAIが自動設計。視聴者分析に基づいたコンテンツ設計を実現します。',
    icon: '▶',
    status: 'stub',
    accentColor: '#DC2626',
    features: ['YouTube台本自動作成', 'サムネイル指示・タイトル案', '動画構成・シーン設計'],
    releaseLabel: 'β 2026 Q3',
  },
  {
    id: 'research',
    name: 'Research Factory',
    nameJa: 'リサーチ工場',
    descriptionJa: 'トレンドリサーチ・競合分析・市場調査をAIが自動収集・整理・レポート化。情報収集コストをゼロにします。',
    icon: '◎',
    status: 'stub',
    accentColor: '#059669',
    features: ['トレンドリサーチ・まとめ', '競合分析レポート自動生成', '市場調査・データ整理'],
    releaseLabel: 'β 2026 Q4',
  },
  {
    id: 'marketing',
    name: 'Marketing Factory',
    nameJa: 'マーケティング工場',
    descriptionJa: 'SNS投稿・広告コピー・LP文章・メールマーケティング文章をAIが自動生成。マーケ業務を一括自動化します。',
    icon: '◈',
    status: 'stub',
    accentColor: '#D97706',
    features: ['SNS投稿文自動生成', '広告コピー・LP文章', 'メールマーケティング文章'],
    releaseLabel: 'β 2026 Q4',
  },
  {
    id: 'fortune',
    name: 'Fortune Factory',
    nameJa: '占い工場',
    descriptionJa: '日次・週次運勢記事・占い結果・年間予測レポートをAIが自動生成。コンテンツの継続的配信を実現します。',
    icon: '✧',
    status: 'stub',
    accentColor: '#7C3AED',
    features: ['日次・週次運勢記事', '占い結果・解説文章', '年間予測レポート'],
    releaseLabel: 'β 2027 Q1',
  },
]

export const osLayers: OsLayer[] = [
  {
    id: 'foundation',
    title: 'AI OS Foundation',
    titleJa: 'OS基盤層',
    components: [
      { id: 'inbox',     name: 'Inbox',     descriptionJa: 'タスクの受信・優先度判定',   icon: '◫' },
      { id: 'scheduler', name: 'Scheduler', descriptionJa: 'Workflow の自動スケジュール', icon: '⏱' },
      { id: 'memory',    name: 'Memory',    descriptionJa: '実行履歴・コンテキスト記憶',  icon: '◉' },
    ],
  },
  {
    id: 'engine',
    title: 'Engine Layer',
    titleJa: 'エンジン層',
    components: [
      { id: 'router',       name: 'AI Router',      descriptionJa: '複数AIへのインテリジェントルーティング', icon: '⇄' },
      { id: 'workflow',     name: 'Workflow Engine', descriptionJa: 'N ステップ Workflow の自律実行',        icon: '⚙' },
      { id: 'orchestrator', name: 'Orchestrator',    descriptionJa: '複数 Factory の統合制御',              icon: '◈' },
    ],
  },
  {
    id: 'factory',
    title: 'Factory Layer',
    titleJa: 'ファクトリー層',
    components: [
      { id: 'creator',   name: 'Creator',   descriptionJa: '企画・スクリプト',   icon: '✦' },
      { id: 'writing',   name: 'Writing',   descriptionJa: '記事・文章',         icon: '✐' },
      { id: 'video',     name: 'Video',     descriptionJa: '動画・台本',         icon: '▶' },
      { id: 'research',  name: 'Research',  descriptionJa: 'リサーチ・分析',     icon: '◎' },
      { id: 'marketing', name: 'Marketing', descriptionJa: 'SNS・広告・LP',      icon: '◈' },
      { id: 'fortune',   name: 'Fortune',   descriptionJa: '占い・運勢記事',     icon: '✧' },
    ],
  },
]

export const roadmapItems: RoadmapItem[] = [
  {
    date: '2025 Q4',
    title: 'AI Router',
    descriptionJa: '複数 AI プロバイダー（GPT-4o / Claude / Gemini）の統一ルーティング基盤を構築。',
    status: 'completed',
  },
  {
    date: '2026 Q1',
    title: 'Workflow Engine',
    descriptionJa: 'N ステップ Workflow の自律実行エンジン。Human Approval・条件分岐・並列実行に対応。',
    status: 'completed',
  },
  {
    date: '2026 Q1',
    title: 'Dashboard + Orchestrator',
    descriptionJa: 'リアルタイム実行監視 Dashboard とスケジュール自律実行 Orchestrator を実装。',
    status: 'completed',
  },
  {
    date: '2026 Q2',
    title: 'Writing Factory — Note MVP',
    descriptionJa: 'note 記事を 9 ステップ Workflow で完全自動生成する Factory を実装。',
    status: 'in-progress',
    isHighlight: true,
  },
  {
    date: '2026 Q2',
    title: 'Website β 公開',
    descriptionJa: 'And Planning 公式ブランドサイト。AI OS の全体像を公開。',
    status: 'in-progress',
  },
  {
    date: '2026 Q3',
    title: 'Creator Factory β',
    descriptionJa: '企画書・コンセプト・スクリプトを自動生成する Factory を β リリース。',
    status: 'planned',
  },
  {
    date: '2026 Q3',
    title: 'Video Factory β',
    descriptionJa: 'YouTube 台本・サムネイル指示・動画構成を自動生成する Factory を β リリース。',
    status: 'planned',
  },
  {
    date: '2026 Q4',
    title: 'Research Factory β',
    descriptionJa: 'トレンドリサーチ・競合分析・市場調査を自動収集・レポート化する Factory を β リリース。',
    status: 'planned',
  },
  {
    date: '2026 Q4',
    title: 'Marketing Factory β',
    descriptionJa: 'SNS・広告・LP・メール文章を自動生成するマーケ特化 Factory を β リリース。',
    status: 'planned',
  },
  {
    date: '2027 Q1',
    title: 'Fortune Factory β',
    descriptionJa: '運勢記事・占い結果・年間予測レポートを自動生成する Factory を β リリース。',
    status: 'planned',
  },
  {
    date: '2027 Q2',
    title: 'AI OS v1.0',
    descriptionJa: '6 Factory 完全実装 + SaaS 化 + API 公開。日本初の AI Operating System として正式リリース。',
    status: 'planned',
    isHighlight: true,
  },
]

export const phases: Phase[] = [
  {
    number: 1,
    title: 'Foundation',
    description: 'AI OS 基盤・Router・Workflow Engine・Dashboard・Orchestrator',
    status: 'completed',
    percentage: 100,
  },
  {
    number: 2,
    title: 'Factory MVP',
    description: 'Note Factory・公式サイト・6 Factory スタブ',
    status: 'in-progress',
    percentage: 65,
  },
  {
    number: 3,
    title: 'Commercial',
    description: 'SaaS 化・API 公開・6 Factory 完全実装',
    status: 'planned',
    percentage: 0,
  },
  {
    number: 4,
    title: 'Scale',
    description: '自律拡張・マルチエージェント・エンタープライズ対応',
    status: 'planned',
    percentage: 0,
  },
]

export const socialLinks: SocialLink[] = [
  { id: 'github', label: 'GitHub', href: 'https://github.com/andplanning',    icon: 'github', external: true },
  { id: 'x',     label: 'X',      href: 'https://x.com/andplanning',          icon: 'x',      external: true },
  { id: 'note',  label: 'note',   href: 'https://note.com/andplanning',       icon: 'note',   external: true },
  { id: 'email', label: 'Email',  href: `mailto:hello@andplanning.ai`,        icon: 'email',  external: false },
]

export const legalLinks: LegalLink[] = [
  { label: '利用規約',           href: '/terms'   },
  { label: 'プライバシーポリシー', href: '/privacy' },
]

export const newsItems: NewsItem[] = [
  {
    id: '3',
    title: 'And Planning 公式サイト β 公開 — AI OS の全体像をWebで初公開',
    date: '2026-06-28',
    category: 'Launch',
    href: '#',
  },
  {
    id: '2',
    title: 'Note Factory MVP 実装完了 — 9ステップ Workflow で記事生成を自動化',
    date: '2026-06-28',
    category: 'Release',
    href: '#',
  },
  {
    id: '1',
    title: 'Factory Orchestrator 実装 — 複数 Workflow の自律制御が可能に',
    date: '2026-06-27',
    category: 'Release',
    href: '#',
  },
]
