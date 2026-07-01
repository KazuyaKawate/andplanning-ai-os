'use client'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#060C18] text-slate-200 py-32 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert prose-slate">
        <h1 className="text-4xl font-bold text-white mb-8">プライバシーポリシー</h1>
        <p className="text-sm text-slate-400 mb-8">最終更新日: 2026年7月2日</p>

        <h2>1. 個人情報の収集について</h2>
        <p>当サービス（AIOS）では、ユーザーの皆様がサービスをご利用になる際に、氏名、メールアドレス、会社名などの個人情報をお預かりする場合があります。</p>

        <h2>2. 個人情報の利用目的</h2>
        <p>お預かりした個人情報は、以下の目的で利用いたします。</p>
        <ul>
          <li>本サービスの提供・運営のため</li>
          <li>ユーザーからのお問い合わせに回答するため</li>
          <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
        </ul>

        <h2>3. AIモデルへのデータ提供について</h2>
        <p>当サービスでは、連携する外部AIモデル（OpenAI, Anthropic等）に対し、入力されたテキストデータを送信する場合があります。ただし、オプトアウト設定を行っているモデルプロバイダーを利用し、ユーザーのデータがAIの学習に利用されないよう保護に努めています。</p>

        <h2>4. 個人情報の第三者提供</h2>
        <p>法令に定められた場合を除き、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。</p>
      </div>
    </div>
  )
}
