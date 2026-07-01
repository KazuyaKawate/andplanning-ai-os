'use client'

import { motion } from 'motion/react'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#060C18] text-slate-200 py-32 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold font-heading text-white mb-6"
        >
          Features
        </motion.h1>
        <p className="text-slate-400 text-lg mb-16 max-w-2xl mx-auto">
          AIOSが提供する革新的な機能群で、あなたのビジネスと開発を次のレベルへ。
        </p>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          {/* Feature 1 */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-3xl mb-4">🏭</div>
            <h3 className="text-xl font-bold text-white mb-2">AI Factory</h3>
            <p className="text-sm text-slate-400">
              用途に応じた専門AIエージェントの工場。記事作成、コードレビュー、データ分析など、複数の工程を自動化します。
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-white mb-2">Virtual Team</h3>
            <p className="text-sm text-slate-400">
              アーキテクト、フロントエンド、バックエンドなど、役割を持ったAIエージェントが自律的に協調し、タスクを完遂します。
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-3xl mb-4">🛒</div>
            <h3 className="text-xl font-bold text-white mb-2">Marketplace</h3>
            <p className="text-sm text-slate-400">
              作成したプロンプトやワークフローを販売。他のユーザーが作った優れた資産を購入し、すぐに自社へ導入可能です。
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-3xl mb-4">💼</div>
            <h3 className="text-xl font-bold text-white mb-2">Business Engine</h3>
            <p className="text-sm text-slate-400">
              CRM連携による顧客管理、商談からタスク自動化、アフィリエイトや売上管理まで、事業運営をAIで一元化します。
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-3xl mb-4">🧠</div>
            <h3 className="text-xl font-bold text-white mb-2">Self-Evolution</h3>
            <p className="text-sm text-slate-400">
              コードベースやプロジェクトの健全性をAIが定期的に診断し、自動的にリファクタリングパッチを提案します。
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-white mb-2">Knowledge Graph</h3>
            <p className="text-sm text-slate-400">
              社内ドキュメントやガイドラインを構造化し、AIが文脈として常に参照。より高精度なアウトプットを実現します。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
