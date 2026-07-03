'use client'

import SectionWrapper from '@/components/ui/SectionWrapper'
import Badge from '@/components/ui/Badge'

export default function PrivacyPage() {
  return (
    <div className="pt-24 lg:pt-32">
      <SectionWrapper id="privacy" background="white">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <Badge variant="default">Legal</Badge>
            <h1 className="mt-6 text-4xl lg:text-5xl font-bold font-heading text-slate-900">
              プライバシーポリシー
            </h1>
            <p className="mt-4 text-slate-400 text-sm">最終更新日: 2026年7月3日</p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-slate-600 leading-relaxed">
            <p>
              And Planning（以下，「当組織」といいます。）は，本ウェブサイト上で提供するサービス「And Planning AIOS」（以下，「本サービス」といいます。）における，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。
            </p>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第1条（個人情報）</h2>
              <p>
                「個人情報」とは，個人情報保護法にいう「個人情報」を指すものとし，生存する個人に関する情報であって，当該情報に含まれる氏名，生年月日，住所，電話番号，連絡先その他の記述等により特定の個人を識別できる情報および容貌，指紋，声紋にかかるデータ，および健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別符号）を指します。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第2条（個人情報の収集方法）</h2>
              <p>
                当組織は，ユーザーが利用登録をする際に氏名，生年月日，住所，電話番号，メールアドレス，銀行口座番号，クレジットカード番号，運転免許証番号などの個人情報をお尋ねすることがあります。また，ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を,当組織の提携先（情報提供元，広告主，広告配信先などを含みます。以下，｢提携先｣といいます。）などから収集することがあります。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第3条（個人情報を収集・利用する目的）</h2>
              <p>当組織が個人情報を収集・利用する目的は，以下のとおりです。</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>当組織サービスの提供・運営のため</li>
                <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
                <li>ユーザーが利用中のサービスの新機能，更新情報，キャンペーン等および当組織が提供する他のサービスの案内のメールを送付するため</li>
                <li>メンテナンス，重要なお知らせなど必要に応じたご連絡のため</li>
                <li>利用規約に違反したユーザーや，不正・不当な目的でサービスを利用しようとするユーザーの特定をお断りするため</li>
                <li>ユーザーにご自身の登録情報の閲覧や変更，削除，ご利用状況の閲覧を行っていただくため</li>
                <li>有料サービスにおいて，ユーザーに利用料金を請求するため</li>
                <li>上記の利用目的に付随する目的</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第4条（利用目的の変更）</h2>
              <p>
                当組織は，利用目的が変更前と関連性を有すると合理的に認められる場合に限り，個人情報の利用目的を変更するものとします。利用目的の変更を行った場合には，変更後の目的について，当組織所定の方法により，ユーザーに通知し，または本ウェブサイト上に公表するものとします。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">第5条（個人情報の第三者提供）</h2>
              <p>
                当組織は，次に掲げる場合を除いて，あらかじめユーザーの同意を得ることなく，第三者に個人情報を提供することはありません。ただし，個人情報保護法その他の法令で認められる場合を除きます。
              </p>
            </section>
          </div>
        </div>
      </SectionWrapper>
    </div>
  )
}
