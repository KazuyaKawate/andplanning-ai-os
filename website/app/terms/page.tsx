'use client'

import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'

export default function TermsPage() {
  return (
    <div className="pt-24 lg:pt-32">
      <SectionWrapper id="terms" background="white">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <Badge variant="default">Legal</Badge>
            <h1 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900">
              利用規約
            </h1>
            <p className="mt-4 text-slate-400 text-sm">最終更新日: 2026年7月3日</p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第1条（適用）</h2>
              <p>
                この利用規約（以下，「本規約」といいます。）は，And Planning（以下，「当組織」といいます。）が提供するサービス「And Planning AIOS」（以下，「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下，「ユーザー」といいます。）には，本規約に従って本サービスをご利用いただきます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第2条（利用登録）</h2>
              <p>
                本サービスにおいては，登録希望者が本規約に同意の上，当組織の定める方法によって利用登録を申請し，当組織がこれを承認することによって，利用登録が完了するものとします。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第3条（ユーザーIDおよびパスワードの管理）</h2>
              <p>
                ユーザーは，自己の責任において，本サービスのユーザーIDおよびパスワードを適切に管理するものとします。ユーザーは，いかなる場合にも，ユーザーIDおよびパスワードを第三者に譲渡または貸与し，もしくは第三者と共用することはできません。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第4条（禁止事項）</h2>
              <p>ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>本サービスの内容等，本サービスに含まれる著作権，商標権ほか知的財産権を侵害する行為</li>
                <li>当組織，他のユーザー，またはその他第三者のサーバーまたはネットワークの機能を破壊したり，妨害したりする行為</li>
                <li>本サービスによって得られた情報を商業的に利用する行為</li>
                <li>当組織のサービスの運営を妨害するおそれのある行為</li>
                <li>不正アクセスをし，またはこれを試みる行為</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第5条（本サービスの提供の停止等）</h2>
              <p>
                当組織は，以下のいずれかの事由があると判断した場合，ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                <li>地震，落雷，火災，停電または天災などの不可抗力により，本サービスの提供が困難となった場合</li>
                <li>その他，当組織が本サービスの提供が困難と判断した場合</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第6条（免責事項）</h2>
              <p>
                当組織の債務不履行責任は，当組織の故意または重過失によらない限り免責されるものとします。当組織は，本サービスに関して，ユーザーと他のユーザーまたは第三者との間において生じた取引，連絡または紛争等について一切責任を負いません。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第7条（規約の変更）</h2>
              <p>
                当組織は，必要と判断した場合には，ユーザーに通知することなくいつでも本規約を変更することができるものとします。
              </p>
            </section>
          </div>
        </div>
      </SectionWrapper>
    </div>
  )
}
