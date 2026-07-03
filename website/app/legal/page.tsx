'use client'

import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'

export default function LegalPage() {
  const tableRow = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-1 md:grid-cols-3 py-6 border-b border-slate-100 last:border-0">
      <div className="font-bold text-slate-900 mb-2 md:mb-0">{label}</div>
      <div className="md:col-span-2 text-slate-600">{value}</div>
    </div>
  )

  return (
    <div className="pt-24 lg:pt-32">
      <SectionWrapper id="legal" background="white">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center md:text-left">
            <Badge variant="default">Legal</Badge>
            <h1 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900">
              特定商取引法に基づく表記
            </h1>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 p-8 lg:p-12 shadow-sm">
            {tableRow('事業者名', 'And Planning')}
            {tableRow('運営責任者', 'And Planning 運営事務局')}
            {tableRow('所在地', '東京都（詳細は請求により遅滞なく開示いたします）')}
            {tableRow('連絡先', 'hello@andplanning.ai')}
            {tableRow('販売価格', '各プランの料金ページをご参照ください。')}
            {tableRow('代金の支払時期', 'クレジットカード：各カード会社の引き落とし日。月額プランの場合は毎月の自動更新時。')}
            {tableRow('代金の支払方法', 'クレジットカード、その他当組織が定める決済方法')}
            {tableRow('商品の提供時期', '支払完了後、即時にご利用いただけます。')}
            {tableRow('返品・キャンセル', 'デジタルコンテンツの性質上、購入後の返品・返金には応じられません。月額プランの解約はいつでも可能で、次回の更新から停止されます。')}
          </div>
        </div>
      </SectionWrapper>
    </div>
  )
}
