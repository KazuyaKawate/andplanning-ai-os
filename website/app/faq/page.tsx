'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'
import GradientText from '@/components/ui/GradientText'

const faqs = [
  {
    q: 'AIOSとは何ですか？',
    a: 'And Planning AIOSは、複数のAIモデルと自動化ワークフローを統合し、24時間稼働する「自律型AIチーム」を構築するためのオペレーティングシステムです。',
  },
  {
    q: 'ChatGPTなどのチャットツールとの違いは何ですか？',
    a: 'チャットツールは「一問一答」の対話が中心ですが、AIOSは複数のステップからなる「業務プロセス（ワークフロー）」を自律的に実行することに特化しています。また、実行結果を蓄積し、ビジネスとして管理する機能も備えています。',
  },
  {
    q: 'Business Engineとは何ですか？',
    a: 'AIのアウトプットを収益化するための管理機能です。クライアントごとのライセンス管理、利用状況の分析、請求管理などをサポートし、AIを活用したビジネスの運営を容易にします。',
  },
  {
    q: '利用料金はかかりますか？',
    a: '現在は無料のβ版を提供しており、主要な機能を無料でお試しいただけます。正式リリース後は、Free、Pro、Businessの3つのプランを提供する予定です。',
  },
  {
    q: 'β版の利用期間はいつまでですか？',
    a: '現在のところ、2026年第3四半期末までを予定しています。正式リリースの詳細は、決定次第公式サイトやメールマガジンでお知らせします。',
  },
  {
    q: '入力したデータは保存されますか？',
    a: 'ワークフローの実行履歴や設定内容は、ユーザー自身の専用データベースに安全に保存されます。これにより、過去のコンテキストを引き継いだ高度な自動化が可能になります。',
  },
  {
    q: 'セキュリティは確保されていますか？',
    a: '全通信の暗号化（SSL/TLS）、JWTによる認証、およびデータベースの独立性を確保しています。また、AIプロバイダーへのデータ提供についても、各社のAPI利用規約に基づき、学習に利用されない設定を推奨・適用しています。',
  },
  {
    q: '法人での利用は可能ですか？',
    a: 'はい、可能です。複数ユーザーでの管理やチーム機能が必要な場合は、Businessプラン（または個別相談）をご検討ください。',
  },
  {
    q: '外部サービスとのAPI連携はできますか？',
    a: 'Businessプランにて、WebhookやAPI連携機能を順次提供予定です。独自のシステムにAIOSのワークフローを組み込むことが可能になります。',
  },
  {
    q: '導入の相談はどこからできますか？',
    a: 'お問い合わせページ、または公式Discordコミュニティよりお気軽にご相談ください。専門のスタッフがビジネスへの活用方法をご提案します。',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left focus:outline-none group"
      >
        <span className="text-lg font-bold text-slate-900 group-hover:text-brand-blue transition-colors">
          {q}
        </span>
        <span className={[
          'text-2xl transition-transform duration-300',
          isOpen ? 'rotate-180' : ''
        ].join(' ')}>
          ↓
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-slate-500 leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FaqPage() {
  return (
    <div className="pt-24 lg:pt-32">
      <SectionWrapper id="faq" background="white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default">FAQ</Badge>
            <h1 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900">
              よくある<GradientText>ご質問</GradientText>
            </h1>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 p-8 lg:p-12 shadow-sm">
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-slate-500 mb-6">解決しない場合はお気軽にお問い合わせください</p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all"
            >
              お問い合わせはこちら
            </a>
          </div>
        </div>
      </SectionWrapper>
    </div>
  )
}
