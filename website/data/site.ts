import type { NavItem, Factory, Phase, NewsItem } from '@/types'

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
  { label: 'Workflow',  href: '#workflow'  },
  { label: 'Roadmap',   href: '#roadmap'   },
  { label: 'Contact',   href: '#contact'   },
]

export const factories: Factory[] = [
  {
    id: 'creator',
    name: 'Creator Factory',
    nameJa: 'クリエイター工場',
    descriptionJa: 'クリエイターコンテンツの総合生成。記事・画像指示・スクリプト・企画書を自動生成します。',
    icon: '✦',
    status: 'stub',
    accentColor: '#8B5CF6',
  },
  {
    id: 'writing',
    name: 'Writing Factory',
    nameJa: '文章工場',
    descriptionJa: 'note記事・ブログ・メルマガを自動生成。9ステップのWorkflowで品質を保証します。',
    icon: '✐',
    status: 'active',
    accentColor: '#2563EB',
  },
  {
    id: 'video',
    name: 'Video Factory',
    nameJa: '動画工場',
    descriptionJa: 'YouTube台本・サムネイル指示・動画構成案を自動生成します。',
    icon: '▶',
    status: 'stub',
    accentColor: '#DC2626',
  },
  {
    id: 'research',
    name: 'Research Factory',
    nameJa: 'リサーチ工場',
    descriptionJa: 'トレンドレポート・競合分析・情報要約を自動収集・分析します。',
    icon: '◎',
    status: 'stub',
    accentColor: '#059669',
  },
  {
    id: 'marketing',
    name: 'Marketing Factory',
    nameJa: 'マーケティング工場',
    descriptionJa: 'SNS投稿・広告文・メール文章・マーケティング戦略を自動生成します。',
    icon: '◈',
    status: 'stub',
    accentColor: '#D97706',
  },
  {
    id: 'fortune',
    name: 'Fortune Factory',
    nameJa: '占い工場',
    descriptionJa: '運勢記事・占い結果・予測レポートを自動生成します。',
    icon: '✧',
    status: 'stub',
    accentColor: '#7C3AED',
  },
]

export const phases: Phase[] = [
  {
    number: 1,
    title: 'Foundation',
    description: 'AI OS基盤・Router・Workflow Engine・Dashboard・Orchestrator',
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
    description: 'SaaS化・API公開・6 Factory 完全実装',
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

export const newsItems: NewsItem[] = [
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
