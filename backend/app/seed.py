"""
Seed initial data. Upserts factories and workflows so new entries are added
on server restart without wiping existing run history.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app import models


def _ago(minutes: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=minutes)


FACTORIES = [
    # ── Existing 7 ────────────────────────────────────────────────────────────
    dict(id="writing",     name="Writing Factory",     name_ja="文章工場",           icon="✍️",  accent_color="#2563EB", status="active",   preferred_model="claude-sonnet-4-6",         system_prompt="あなたは優秀な日本語コピーライターです。読み手の心に響く文章を作成してください。", temperature=0.8, max_tokens=4096),
    dict(id="research",    name="Research Factory",    name_ja="リサーチ工場",       icon="🔬",  accent_color="#7C3AED", status="active",   preferred_model="gpt-4o",                    system_prompt="あなたは優秀なリサーチアナリストです。正確で包括的な調査を行ってください。",  temperature=0.3, max_tokens=4096),
    dict(id="marketing",   name="Marketing Factory",   name_ja="マーケ工場",         icon="📣",  accent_color="#059669", status="active",   preferred_model="gemini-2.5-flash",          system_prompt="あなたは優秀なマーケターです。効果的なマーケティング施策を提案してください。", temperature=0.9, max_tokens=2048),
    dict(id="video",       name="Video Factory",       name_ja="動画工場",           icon="🎬",  accent_color="#DC2626", status="idle",     preferred_model="gemini-2.5-flash",          system_prompt="あなたは優秀な動画クリエイターです。魅力的な動画コンテンツを制作してください。", temperature=0.8, max_tokens=2048),
    dict(id="fortune",     name="Fortune Factory",     name_ja="占い工場",           icon="🔮",  accent_color="#9333EA", status="idle",     preferred_model="claude-haiku-4-5-20251001", system_prompt="あなたは神秘的な占い師です。温かみのある運勢を伝えてください。", temperature=1.0, max_tokens=1024),
    dict(id="creator",     name="Creator Factory",     name_ja="クリエイター工場",   icon="🎨",  accent_color="#F59E0B", status="active",   preferred_model="gpt-4o-mini",               system_prompt="あなたは多才なクリエイターです。独創的なアイデアを生み出してください。", temperature=0.9, max_tokens=2048),
    dict(id="ai-os",       name="AI OS Core",          name_ja="AI OS コア",         icon="⚙️",  accent_color="#22D3EE", status="active",   preferred_model=None,                        system_prompt="You are the AI OS orchestration core. Help coordinate and optimize AI workflows.", temperature=0.5, max_tokens=8192),
    # ── Dev (Virtual Claude Dev Factory) ─────────────────────────────────────
    dict(id="dev",         name="Dev Factory",         name_ja="開発工場",           icon="🛠️",  accent_color="#A855F7", status="active",   preferred_model="claude-sonnet-4-6",         system_prompt="You are Virtual Claude Dev embedded in the AI OS. Help the developer inspect files, generate implementation plans, propose safe code patches, and review code. Never delete files, never run git reset/clean/push, never modify Kernel/Router/Memory files without explicit approval.", temperature=0.3, max_tokens=8192),
    # ── Debug (Auto Debugger Factory) ────────────────────────────────────────
    dict(id="debug",       name="Debug Factory",       name_ja="デバッグ工場",       icon="🐛",  accent_color="#EF4444", status="active",   preferred_model="claude-sonnet-4-6",         system_prompt="You are the AIOS Auto Debugger. Analyze frontend/backend errors, identify root causes, and generate safe patch proposals. Never delete files, never run destructive git commands, never modify Kernel/Router files. Always require human approval before applying patches.", temperature=0.2, max_tokens=4096),
    # ── New 18 ────────────────────────────────────────────────────────────────
    dict(id="coding",      name="Coding Factory",      name_ja="コーディング工場",   icon="💻",  accent_color="#16A34A", status="active",   preferred_model="gpt-4o",                    system_prompt="あなたは優秀なソフトウェアエンジニアです。高品質なコードとドキュメントを生成してください。", temperature=0.2, max_tokens=8192),
    dict(id="legal",       name="Legal Factory",       name_ja="法務工場",           icon="⚖️",  accent_color="#1D4ED8", status="idle",     preferred_model="claude-sonnet-4-6",         system_prompt="あなたは優秀な法務アドバイザーです。法的文書をレビュー・作成してください。免責事項：本出力は情報提供目的のみであり、正式な法律相談ではありません。", temperature=0.2, max_tokens=4096),
    dict(id="hr",          name="HR Factory",          name_ja="採用工場",           icon="👥",  accent_color="#0D9488", status="idle",     preferred_model="gpt-4o-mini",               system_prompt="あなたは優秀な採用担当者です。優れた人材を引き寄せる採用文書を作成してください。", temperature=0.7, max_tokens=2048),
    dict(id="finance",     name="Finance Factory",     name_ja="財務工場",           icon="💹",  accent_color="#15803D", status="idle",     preferred_model="gpt-4o",                    system_prompt="あなたは優秀な財務アナリストです。データに基づいた財務分析を提供してください。", temperature=0.2, max_tokens=4096),
    dict(id="translation", name="Translation Factory", name_ja="翻訳工場",           icon="🌐",  accent_color="#7C2D12", status="active",   preferred_model="gemini-2.5-flash",          system_prompt="あなたは優秀な翻訳者です。原文のニュアンスを保ちながら自然な翻訳を提供してください。", temperature=0.3, max_tokens=4096),
    dict(id="support",     name="Support Factory",     name_ja="サポート工場",       icon="💬",  accent_color="#0369A1", status="idle",     preferred_model="gpt-4o-mini",               system_prompt="あなたは親切なカスタマーサポート担当者です。顧客の問題を丁寧に解決してください。", temperature=0.6, max_tokens=2048),
    dict(id="education",   name="Education Factory",   name_ja="教育工場",           icon="📚",  accent_color="#7C3AED", status="idle",     preferred_model="claude-sonnet-4-6",         system_prompt="あなたは優秀な教育コンテンツクリエイターです。わかりやすく効果的な教材を作成してください。", temperature=0.6, max_tokens=4096),
    dict(id="social",      name="Social Media Factory",name_ja="SNS工場",            icon="📱",  accent_color="#C026D3", status="active",   preferred_model="gemini-2.5-flash",          system_prompt="あなたはSNSマーケティングの専門家です。エンゲージメントの高い投稿を作成してください。", temperature=0.9, max_tokens=1024),
    dict(id="email",       name="Email Factory",       name_ja="メール工場",         icon="📧",  accent_color="#0E7490", status="idle",     preferred_model="gpt-4o-mini",               system_prompt="あなたはビジネスメールの専門家です。目的に合った効果的なメールを作成してください。", temperature=0.7, max_tokens=2048),
    dict(id="seo",         name="SEO Factory",         name_ja="SEO工場",            icon="🔍",  accent_color="#92400E", status="idle",     preferred_model="gpt-4o-mini",               system_prompt="あなたはSEO専門家です。検索エンジンで上位表示されるコンテンツ戦略を提案してください。", temperature=0.5, max_tokens=2048),
    dict(id="design",      name="Design Factory",      name_ja="デザイン工場",       icon="🎯",  accent_color="#BE185D", status="idle",     preferred_model="gemini-2.5-flash",          system_prompt="あなたはUIUXデザインの専門家です。ユーザー中心のデザイン提案を行ってください。", temperature=0.8, max_tokens=2048),
    dict(id="data",        name="Data Analysis Factory",name_ja="データ分析工場",    icon="📊",  accent_color="#1E40AF", status="idle",     preferred_model="gpt-4o",                    system_prompt="あなたはデータアナリストです。データから洞察を引き出し、わかりやすく説明してください。", temperature=0.2, max_tokens=4096),
    dict(id="press",       name="Press Release Factory",name_ja="PR工場",            icon="📰",  accent_color="#374151", status="idle",     preferred_model="claude-sonnet-4-6",         system_prompt="あなたはPR専門家です。メディアに掲載されるプレスリリースを作成してください。", temperature=0.7, max_tokens=2048),
    dict(id="proposal",    name="Proposal Factory",    name_ja="提案書工場",         icon="📋",  accent_color="#5B21B6", status="idle",     preferred_model="claude-sonnet-4-6",         system_prompt="あなたはビジネス提案の専門家です。説得力のある提案書を作成してください。", temperature=0.6, max_tokens=4096),
    dict(id="meeting",     name="Meeting Factory",     name_ja="会議工場",           icon="🗓️",  accent_color="#065F46", status="idle",     preferred_model="gpt-4o-mini",               system_prompt="あなたは会議ファシリテーターです。効果的な会議運営をサポートしてください。", temperature=0.5, max_tokens=2048),
    dict(id="brand",       name="Brand Factory",       name_ja="ブランド工場",       icon="💎",  accent_color="#831843", status="idle",     preferred_model="claude-sonnet-4-6",         system_prompt="あなたはブランドストラテジストです。一貫性のある強いブランドを構築してください。", temperature=0.8, max_tokens=2048),
    dict(id="product",     name="Product Factory",     name_ja="商品企画工場",       icon="🚀",  accent_color="#1D4ED8", status="idle",     preferred_model="gpt-4o",                    system_prompt="あなたはプロダクトマネージャーです。ユーザーのニーズに応える製品企画を立案してください。", temperature=0.6, max_tokens=4096),
    dict(id="knowledge",   name="Knowledge Factory",   name_ja="ナレッジ工場",       icon="🧠",  accent_color="#4338CA", status="idle",     preferred_model="claude-sonnet-4-6",         system_prompt="あなたはナレッジマネジメントの専門家です。組織の知識を整理・体系化してください。", temperature=0.4, max_tokens=4096),
]

WORKFLOWS = [
    # ── Writing (5) ───────────────────────────────────────────────────────────
    dict(id="blog-seo",       factory_id="writing",  name_ja="SEO記事生成",      description="キーワードからSEO最適化記事を生成", step_count=9, avg_duration_ms=42000, tags=["seo","blog"],
         input_schema=[{"id":"keyword","label":"ターゲットキーワード","type":"text","placeholder":"例: React hooks 入門","required":True},{"id":"tone","label":"トーン","type":"select","placeholder":"","required":False,"options":["professional","casual","academic"]}]),
    dict(id="lp-copy",        factory_id="writing",  name_ja="LPコピー生成",     description="ランディングページのコピーを生成", step_count=6, avg_duration_ms=28000, tags=["lp","copy"],
         input_schema=[{"id":"product","label":"製品・サービス名","type":"text","placeholder":"例: AI OS","required":True},{"id":"target","label":"ターゲット顧客","type":"textarea","placeholder":"例: スタートアップCTO","required":True}]),
    dict(id="product-desc",   factory_id="writing",  name_ja="商品説明文生成",   description="ECサイト用の商品説明文を生成", step_count=4, avg_duration_ms=15000, tags=["ecommerce","product"],
         input_schema=[{"id":"product","label":"商品名","type":"text","placeholder":"例: ワイヤレスイヤホン","required":True},{"id":"features","label":"特徴・スペック","type":"textarea","placeholder":"例: ノイズキャンセリング、30時間再生","required":True}]),
    dict(id="white-paper",    factory_id="writing",  name_ja="ホワイトペーパー作成", description="業界向けホワイトペーパーを生成", step_count=8, avg_duration_ms=55000, tags=["whitepaper","b2b"],
         input_schema=[{"id":"topic","label":"テーマ","type":"text","placeholder":"例: 生成AIの業務活用","required":True},{"id":"industry","label":"対象業界","type":"text","placeholder":"例: 製造業","required":False}]),
    dict(id="press-draft",    factory_id="writing",  name_ja="プレスリリース草稿", description="製品・サービス発表のプレスリリースを生成", step_count=5, avg_duration_ms=20000, tags=["pr","release"],
         input_schema=[{"id":"product","label":"製品・サービス名","type":"text","placeholder":"例: AI OS 2.0","required":True},{"id":"date","label":"発表日","type":"text","placeholder":"例: 2026年7月1日","required":False}]),

    # ── Research (4) ──────────────────────────────────────────────────────────
    dict(id="market-research", factory_id="research", name_ja="市場調査レポート", description="指定テーマの市場調査レポートを生成", step_count=5, avg_duration_ms=35000, tags=["research","market"],
         input_schema=[{"id":"topic","label":"調査テーマ","type":"text","placeholder":"例: 生成AI市場","required":True},{"id":"depth","label":"調査深度","type":"select","placeholder":"","required":False,"options":["summary","standard","deep"]}]),
    dict(id="competitor",      factory_id="research", name_ja="競合分析",         description="競合他社の強み・弱みを分析", step_count=4, avg_duration_ms=30000, tags=["competitive"],
         input_schema=[{"id":"company","label":"競合企業名","type":"text","placeholder":"例: Notion","required":True},{"id":"industry","label":"業界","type":"text","placeholder":"例: SaaS","required":False}]),
    dict(id="trend-analysis",  factory_id="research", name_ja="トレンド分析",     description="業界トレンドを分析・予測", step_count=6, avg_duration_ms=38000, tags=["trend","forecast"],
         input_schema=[{"id":"industry","label":"業界・分野","type":"text","placeholder":"例: フィンテック","required":True},{"id":"period","label":"期間","type":"select","placeholder":"","required":False,"options":["3ヶ月","6ヶ月","1年","3年"]}]),
    dict(id="survey-analysis", factory_id="research", name_ja="アンケート分析",   description="アンケートデータから洞察を抽出", step_count=4, avg_duration_ms=25000, tags=["survey","analysis"],
         input_schema=[{"id":"data","label":"アンケート結果（CSV・テキスト）","type":"textarea","placeholder":"回答データを貼り付けてください","required":True},{"id":"goal","label":"分析目的","type":"text","placeholder":"例: 顧客満足度の改善","required":False}]),

    # ── Marketing (4) ─────────────────────────────────────────────────────────
    dict(id="sns-post",        factory_id="marketing", name_ja="SNS投稿生成",     description="複数SNS向けの投稿を一括生成", step_count=4, avg_duration_ms=18000, tags=["sns","twitter"],
         input_schema=[{"id":"topic","label":"投稿テーマ","type":"text","placeholder":"例: 新製品リリース","required":True},{"id":"platform","label":"プラットフォーム","type":"select","placeholder":"","required":False,"options":["twitter","instagram","linkedin","all"]}]),
    dict(id="email-campaign",  factory_id="marketing", name_ja="メールキャンペーン", description="メールキャンペーンの件名と本文を生成", step_count=5, avg_duration_ms=22000, tags=["email","campaign"],
         input_schema=[{"id":"goal","label":"キャンペーン目標","type":"text","placeholder":"例: 新機能告知","required":True},{"id":"segment","label":"ターゲットセグメント","type":"textarea","placeholder":"例: アクティブユーザー","required":False}]),
    dict(id="ad-copy",         factory_id="marketing", name_ja="広告コピー生成",  description="Web広告・検索広告のコピーを生成", step_count=4, avg_duration_ms=16000, tags=["ads","copy"],
         input_schema=[{"id":"product","label":"商品・サービス","type":"text","placeholder":"例: AI OS","required":True},{"id":"platform","label":"媒体","type":"select","placeholder":"","required":False,"options":["Google","Meta","YouTube","LINE"]}]),
    dict(id="brand-story",     factory_id="marketing", name_ja="ブランドストーリー", description="企業・製品のブランドストーリーを生成", step_count=5, avg_duration_ms=25000, tags=["brand","story"],
         input_schema=[{"id":"company","label":"会社・製品名","type":"text","placeholder":"例: andplanning","required":True},{"id":"mission","label":"ミッション・ビジョン","type":"textarea","placeholder":"例: AIで働き方を変える","required":False}]),

    # ── Video (3) ─────────────────────────────────────────────────────────────
    dict(id="video-script",    factory_id="video", name_ja="動画台本生成",        description="YouTube動画の台本を生成", step_count=5, avg_duration_ms=38000, tags=["youtube","script"],
         input_schema=[{"id":"title","label":"動画タイトル","type":"text","placeholder":"例: React入門講座","required":True},{"id":"duration","label":"動画尺(分)","type":"text","placeholder":"例: 10","required":False}]),
    dict(id="youtube-desc",    factory_id="video", name_ja="YouTube概要欄生成",   description="YouTube動画の概要欄・タグを生成", step_count=3, avg_duration_ms=12000, tags=["youtube","description"],
         input_schema=[{"id":"title","label":"動画タイトル","type":"text","placeholder":"例: Python入門 #1","required":True},{"id":"content","label":"動画の内容（簡単に）","type":"textarea","placeholder":"例: Pythonのインストールから変数まで説明","required":True}]),
    dict(id="reel-script",     factory_id="video", name_ja="Reels/ショート台本",  description="Instagram Reels/TikTok用の台本を生成", step_count=3, avg_duration_ms=10000, tags=["reels","tiktok","short"],
         input_schema=[{"id":"topic","label":"テーマ","type":"text","placeholder":"例: 生産性を上げる5つの習慣","required":True},{"id":"style","label":"スタイル","type":"select","placeholder":"","required":False,"options":["informative","entertaining","inspiring"]}]),

    # ── Fortune (3) ───────────────────────────────────────────────────────────
    dict(id="daily-fortune",   factory_id="fortune", name_ja="今日の運勢",        description="生年月日から今日の運勢を占います", step_count=3, avg_duration_ms=8000, tags=["fortune","daily"],
         input_schema=[{"id":"birthday","label":"生年月日","type":"text","placeholder":"例: 1990-03-15","required":True},{"id":"sign","label":"星座","type":"select","placeholder":"","required":False,"options":["牡羊座","牡牛座","双子座","蟹座","獅子座","乙女座","天秤座","蠍座","射手座","山羊座","水瓶座","魚座"]}]),
    dict(id="career-fortune",  factory_id="fortune", name_ja="仕事運占い",        description="仕事・キャリアの運勢を占います", step_count=3, avg_duration_ms=9000, tags=["fortune","career"],
         input_schema=[{"id":"birthday","label":"生年月日","type":"text","placeholder":"例: 1990-03-15","required":True},{"id":"concern","label":"仕事の悩み","type":"textarea","placeholder":"例: 転職を考えています","required":False}]),
    dict(id="tarot-reading",   factory_id="fortune", name_ja="タロット占い",      description="タロットカードで運命を読み解きます", step_count=4, avg_duration_ms=12000, tags=["fortune","tarot"],
         input_schema=[{"id":"question","label":"質問・悩み","type":"textarea","placeholder":"例: 今の仕事を続けるべきか","required":True}]),

    # ── Creator (3) ───────────────────────────────────────────────────────────
    dict(id="auto-plan",       factory_id="creator", name_ja="コンテンツ企画",    description="コンテンツの企画・スケジュールを自動生成", step_count=5, avg_duration_ms=20000, tags=["planning","content"],
         input_schema=[{"id":"theme","label":"コンテンツテーマ","type":"text","placeholder":"例: SaaS起業家向けTips","required":True},{"id":"period","label":"期間","type":"select","placeholder":"","required":False,"options":["1週間","1ヶ月","3ヶ月"]}]),
    dict(id="idea-brainstorm",  factory_id="creator", name_ja="アイデア創出",     description="ブレインストーミングでアイデアを大量生成", step_count=3, avg_duration_ms=12000, tags=["ideas","creative"],
         input_schema=[{"id":"challenge","label":"課題・テーマ","type":"textarea","placeholder":"例: ユーザー獲得を増やすには","required":True},{"id":"count","label":"アイデア数","type":"select","placeholder":"","required":False,"options":["10","20","30"]}]),
    dict(id="creative-brief",   factory_id="creator", name_ja="クリエイティブブリーフ", description="制作物のクリエイティブブリーフを作成", step_count=4, avg_duration_ms=18000, tags=["brief","creative"],
         input_schema=[{"id":"project","label":"プロジェクト名","type":"text","placeholder":"例: 新商品LP","required":True},{"id":"goal","label":"目標","type":"textarea","placeholder":"例: コンバージョン率20%向上","required":True}]),

    # ── Debug — Auto Debugger (3) ────────────────────────────────────────────
    dict(id="debug-analyze-error",  factory_id="debug", name_ja="エラー解析",       description="フロントエンド/バックエンドエラーをAIが分析し根本原因を特定", step_count=4, avg_duration_ms=15000, tags=["debug","analyze"],
         input_schema=[{"id":"error_text","label":"エラーメッセージ","type":"textarea","placeholder":"エラーを貼り付けてください","required":True},{"id":"severity","label":"重大度","type":"select","placeholder":"","required":False,"options":["low","medium","high","critical"]}]),
    dict(id="debug-generate-patch", factory_id="debug", name_ja="修正パッチ生成",   description="解析済みエラーに対する安全な修正パッチを生成", step_count=5, avg_duration_ms=22000, tags=["debug","patch"],
         input_schema=[{"id":"session_id","label":"デバッグセッションID","type":"text","placeholder":"解析セッションIDを入力","required":True},{"id":"file_path","label":"修正対象ファイル","type":"text","placeholder":"例: website/hooks/useWorkflowEngine.ts","required":True}]),
    dict(id="debug-review-fix",     factory_id="debug", name_ja="修正レビュー",     description="生成された修正パッチの安全性・影響範囲をレビュー", step_count=3, avg_duration_ms=12000, tags=["debug","review"],
         input_schema=[{"id":"patch_id","label":"パッチID","type":"text","placeholder":"レビューするパッチIDを入力","required":True}]),

    # ── Dev — Virtual Claude Dev (3) ──────────────────────────────────────────
    dict(id="vc-dev-plan",     factory_id="dev", name_ja="実装計画生成",      description="タスクから詳細な実装計画を生成", step_count=4, avg_duration_ms=18000, tags=["dev","plan"],
         input_schema=[{"id":"task","label":"実装タスク","type":"textarea","placeholder":"例: /os/dev ページにファイルツリーを追加","required":True},{"id":"context","label":"追加コンテキスト","type":"textarea","placeholder":"例: 関連するファイルや制約","required":False}]),
    dict(id="vc-dev-patch",    factory_id="dev", name_ja="コード変更提案",    description="指定ファイルへのパッチを生成", step_count=5, avg_duration_ms=25000, tags=["dev","patch"],
         input_schema=[{"id":"task","label":"変更タスク","type":"textarea","placeholder":"例: formatCurrency関数を追加","required":True},{"id":"file_path","label":"対象ファイル","type":"text","placeholder":"例: website/lib/utils.ts","required":True}]),
    dict(id="vc-dev-review",   factory_id="dev", name_ja="コードレビュー",    description="コードの品質・セキュリティ・リスクをレビュー", step_count=4, avg_duration_ms=20000, tags=["dev","review"],
         input_schema=[{"id":"file_path","label":"レビュー対象ファイル","type":"text","placeholder":"例: website/hooks/useWorkflowEngine.ts","required":True},{"id":"focus","label":"レビュー観点","type":"select","placeholder":"","required":False,"options":["security","performance","maintainability","all"]}]),

    # ── Coding (3) ────────────────────────────────────────────────────────────
    dict(id="code-review",     factory_id="coding", name_ja="コードレビュー",     description="コードの品質・セキュリティをレビュー", step_count=5, avg_duration_ms=22000, tags=["review","quality"],
         input_schema=[{"id":"code","label":"レビュー対象コード","type":"textarea","placeholder":"コードを貼り付けてください","required":True},{"id":"lang","label":"言語","type":"text","placeholder":"例: TypeScript","required":False}]),
    dict(id="debug-assist",    factory_id="coding", name_ja="デバッグ支援",       description="バグの原因を特定し修正案を提示", step_count=4, avg_duration_ms=18000, tags=["debug","fix"],
         input_schema=[{"id":"code","label":"問題のあるコード","type":"textarea","placeholder":"コードを貼り付けてください","required":True},{"id":"error","label":"エラーメッセージ","type":"textarea","placeholder":"エラーを貼り付けてください","required":True}]),
    dict(id="doc-generator",   factory_id="coding", name_ja="ドキュメント生成",   description="コードから技術ドキュメントを自動生成", step_count=4, avg_duration_ms=20000, tags=["docs","technical"],
         input_schema=[{"id":"code","label":"ドキュメント化するコード","type":"textarea","placeholder":"コードを貼り付けてください","required":True},{"id":"format","label":"形式","type":"select","placeholder":"","required":False,"options":["Markdown","JSDoc","reStructuredText"]}]),

    # ── Legal (3) ─────────────────────────────────────────────────────────────
    dict(id="contract-review", factory_id="legal", name_ja="契約書レビュー",      description="契約書のリスクポイントを抽出・指摘", step_count=5, avg_duration_ms=30000, tags=["contract","review"],
         input_schema=[{"id":"contract","label":"契約書本文","type":"textarea","placeholder":"契約書のテキストを貼り付けてください","required":True},{"id":"focus","label":"重点確認事項","type":"text","placeholder":"例: 解約条件、損害賠償","required":False}]),
    dict(id="terms-draft",     factory_id="legal", name_ja="利用規約作成",        description="サービスの利用規約・プライバシーポリシーを作成", step_count=6, avg_duration_ms=35000, tags=["terms","policy"],
         input_schema=[{"id":"service","label":"サービス名・内容","type":"textarea","placeholder":"例: AI SaaSプラットフォーム、B2B向け","required":True}]),
    dict(id="nda-draft",       factory_id="legal", name_ja="NDA草稿作成",         description="秘密保持契約書の草稿を作成", step_count=4, avg_duration_ms=20000, tags=["nda","contract"],
         input_schema=[{"id":"party_a","label":"甲（依頼側）","type":"text","placeholder":"例: 株式会社A","required":True},{"id":"party_b","label":"乙（相手側）","type":"text","placeholder":"例: 株式会社B","required":True},{"id":"purpose","label":"開示目的","type":"text","placeholder":"例: 業務提携の検討","required":True}]),

    # ── HR (3) ────────────────────────────────────────────────────────────────
    dict(id="job-desc",        factory_id="hr", name_ja="求人票作成",             description="魅力的な求人票を作成", step_count=4, avg_duration_ms=18000, tags=["recruiting","job"],
         input_schema=[{"id":"role","label":"職種","type":"text","placeholder":"例: フロントエンドエンジニア","required":True},{"id":"requirements","label":"必要なスキル","type":"textarea","placeholder":"例: React 3年以上","required":True}]),
    dict(id="interview-qs",    factory_id="hr", name_ja="面接質問リスト",         description="職種・レベルに合った面接質問を生成", step_count=3, avg_duration_ms=12000, tags=["interview","hiring"],
         input_schema=[{"id":"role","label":"職種","type":"text","placeholder":"例: プロダクトマネージャー","required":True},{"id":"level","label":"レベル","type":"select","placeholder":"","required":False,"options":["junior","mid","senior","lead"]}]),
    dict(id="offer-letter",    factory_id="hr", name_ja="内定通知書作成",         description="内定通知書・オファーレターを作成", step_count=3, avg_duration_ms=10000, tags=["offer","hiring"],
         input_schema=[{"id":"candidate","label":"候補者名","type":"text","placeholder":"例: 山田 太郎","required":True},{"id":"role","label":"職種・条件","type":"textarea","placeholder":"例: シニアエンジニア、年収800万円","required":True}]),

    # ── Finance (3) ───────────────────────────────────────────────────────────
    dict(id="financial-summary", factory_id="finance", name_ja="財務サマリー",    description="財務データのサマリーレポートを生成", step_count=4, avg_duration_ms=22000, tags=["finance","report"],
         input_schema=[{"id":"data","label":"財務データ","type":"textarea","placeholder":"売上、費用、利益などのデータを入力","required":True},{"id":"period","label":"対象期間","type":"text","placeholder":"例: 2025年Q4","required":True}]),
    dict(id="budget-forecast",  factory_id="finance", name_ja="予算予測",         description="過去データから予算・収益を予測", step_count=5, avg_duration_ms=28000, tags=["budget","forecast"],
         input_schema=[{"id":"history","label":"過去実績データ","type":"textarea","placeholder":"月次データを貼り付けてください","required":True},{"id":"period","label":"予測期間","type":"select","placeholder":"","required":False,"options":["3ヶ月","6ヶ月","1年"]}]),
    dict(id="expense-report",   factory_id="finance", name_ja="経費精算レポート", description="経費データを整理・レポート化", step_count=3, avg_duration_ms=12000, tags=["expense","accounting"],
         input_schema=[{"id":"expenses","label":"経費データ","type":"textarea","placeholder":"経費の内訳を入力してください","required":True},{"id":"month","label":"対象月","type":"text","placeholder":"例: 2026年6月","required":True}]),

    # ── Translation (3) ───────────────────────────────────────────────────────
    dict(id="ja-en",           factory_id="translation", name_ja="日→英翻訳",     description="日本語テキストを英語に翻訳", step_count=3, avg_duration_ms=12000, tags=["translation","ja-en"],
         input_schema=[{"id":"text","label":"翻訳するテキスト","type":"textarea","placeholder":"翻訳したい日本語を入力","required":True},{"id":"style","label":"スタイル","type":"select","placeholder":"","required":False,"options":["formal","casual","technical"]}]),
    dict(id="en-ja",           factory_id="translation", name_ja="英→日翻訳",     description="英語テキストを日本語に翻訳", step_count=3, avg_duration_ms=12000, tags=["translation","en-ja"],
         input_schema=[{"id":"text","label":"翻訳するテキスト","type":"textarea","placeholder":"Enter English text to translate","required":True},{"id":"style","label":"スタイル","type":"select","placeholder":"","required":False,"options":["formal","casual","technical"]}]),
    dict(id="localization",    factory_id="translation", name_ja="ローカライゼーション", description="UIテキスト・マーケティング文書をローカライズ", step_count=4, avg_duration_ms=18000, tags=["localization","i18n"],
         input_schema=[{"id":"content","label":"ローカライズするコンテンツ","type":"textarea","placeholder":"テキストを入力","required":True},{"id":"target_lang","label":"対象言語","type":"text","placeholder":"例: English, Korean, Chinese","required":True}]),

    # ── Support (3) ───────────────────────────────────────────────────────────
    dict(id="faq-generator",   factory_id="support", name_ja="FAQ生成",           description="サービス・製品のFAQを自動生成", step_count=4, avg_duration_ms=20000, tags=["faq","support"],
         input_schema=[{"id":"service","label":"サービス・製品の説明","type":"textarea","placeholder":"サービスの概要を入力","required":True},{"id":"count","label":"FAQ数","type":"select","placeholder":"","required":False,"options":["10","20","30"]}]),
    dict(id="support-response", factory_id="support", name_ja="サポート回答文",   description="お問い合わせへの回答文を生成", step_count=3, avg_duration_ms=10000, tags=["response","template"],
         input_schema=[{"id":"inquiry","label":"お問い合わせ内容","type":"textarea","placeholder":"顧客からの問い合わせを入力","required":True},{"id":"tone","label":"トーン","type":"select","placeholder":"","required":False,"options":["formal","friendly","apologetic"]}]),
    dict(id="escalation-summary", factory_id="support", name_ja="エスカレーション要約", description="複雑なサポート案件を要約・整理", step_count=3, avg_duration_ms=12000, tags=["escalation","summary"],
         input_schema=[{"id":"history","label":"対応履歴","type":"textarea","placeholder":"チャット・メール履歴を貼り付けてください","required":True}]),

    # ── Education (3) ─────────────────────────────────────────────────────────
    dict(id="lesson-plan",     factory_id="education", name_ja="授業計画作成",    description="学習目標に合った授業計画を作成", step_count=5, avg_duration_ms=25000, tags=["lesson","curriculum"],
         input_schema=[{"id":"subject","label":"科目・テーマ","type":"text","placeholder":"例: Python基礎","required":True},{"id":"level","label":"受講者レベル","type":"select","placeholder":"","required":False,"options":["beginner","intermediate","advanced"]}]),
    dict(id="quiz-generator",  factory_id="education", name_ja="クイズ生成",      description="学習テキストからクイズ問題を生成", step_count=3, avg_duration_ms=15000, tags=["quiz","assessment"],
         input_schema=[{"id":"content","label":"学習テキスト","type":"textarea","placeholder":"クイズを作成したいテキストを入力","required":True},{"id":"count","label":"問題数","type":"select","placeholder":"","required":False,"options":["5","10","20"]}]),
    dict(id="study-guide",     factory_id="education", name_ja="学習ガイド作成",  description="トピックの学習ガイド・チートシートを作成", step_count=4, avg_duration_ms=18000, tags=["guide","learning"],
         input_schema=[{"id":"topic","label":"学習トピック","type":"text","placeholder":"例: 機械学習の基礎","required":True},{"id":"depth","label":"深さ","type":"select","placeholder":"","required":False,"options":["overview","standard","deep"]}]),

    # ── Social (3) ────────────────────────────────────────────────────────────
    dict(id="twitter-thread",  factory_id="social", name_ja="Xスレッド作成",     description="バイラルになるXスレッドを作成", step_count=3, avg_duration_ms=12000, tags=["twitter","thread"],
         input_schema=[{"id":"topic","label":"テーマ","type":"text","placeholder":"例: 生産性を上げる10の方法","required":True},{"id":"count","label":"ツイート数","type":"select","placeholder":"","required":False,"options":["5","8","10","15"]}]),
    dict(id="instagram-post",  factory_id="social", name_ja="Instagram投稿",     description="Instagramキャプション・ハッシュタグを生成", step_count=3, avg_duration_ms=10000, tags=["instagram","hashtag"],
         input_schema=[{"id":"topic","label":"投稿テーマ","type":"text","placeholder":"例: 新しいカフェオープン","required":True},{"id":"style","label":"スタイル","type":"select","placeholder":"","required":False,"options":["casual","professional","creative"]}]),
    dict(id="linkedin-article", factory_id="social", name_ja="LinkedIn記事",     description="プロフェッショナル向けLinkedIn記事を作成", step_count=5, avg_duration_ms=20000, tags=["linkedin","professional"],
         input_schema=[{"id":"topic","label":"テーマ","type":"text","placeholder":"例: AIがビジネスを変える方法","required":True},{"id":"expertise","label":"専門分野","type":"text","placeholder":"例: SaaS,マーケティング","required":False}]),

    # ── Email (3) ─────────────────────────────────────────────────────────────
    dict(id="cold-email",      factory_id="email", name_ja="コールドメール",      description="新規顧客へのコールドメールを作成", step_count=3, avg_duration_ms=12000, tags=["outreach","sales"],
         input_schema=[{"id":"product","label":"提案する製品・サービス","type":"text","placeholder":"例: AI OS","required":True},{"id":"target","label":"ターゲット（役職・業種）","type":"text","placeholder":"例: IT企業のCTO","required":True}]),
    dict(id="follow-up",       factory_id="email", name_ja="フォローアップメール", description="商談・提案後のフォローアップメールを作成", step_count=3, avg_duration_ms=10000, tags=["followup","crm"],
         input_schema=[{"id":"context","label":"前回の商談内容","type":"textarea","placeholder":"前回の議事録・内容を入力","required":True},{"id":"next_step","label":"次のステップ","type":"text","placeholder":"例: デモの日程調整","required":False}]),
    dict(id="newsletter",      factory_id="email", name_ja="ニュースレター",      description="読者を引きつけるニュースレターを作成", step_count=5, avg_duration_ms=22000, tags=["newsletter","subscribers"],
         input_schema=[{"id":"topic","label":"今号のテーマ","type":"text","placeholder":"例: AI活用の最新事例","required":True},{"id":"segment","label":"読者層","type":"text","placeholder":"例: スタートアップ経営者","required":False}]),

    # ── SEO (3) ───────────────────────────────────────────────────────────────
    dict(id="keyword-research", factory_id="seo", name_ja="キーワードリサーチ",   description="SEOキーワードを調査・整理", step_count=4, avg_duration_ms=20000, tags=["keyword","seo"],
         input_schema=[{"id":"seed","label":"シードキーワード","type":"text","placeholder":"例: AI 業務効率化","required":True},{"id":"industry","label":"業界","type":"text","placeholder":"例: SaaS","required":False}]),
    dict(id="meta-desc",        factory_id="seo", name_ja="メタディスクリプション生成", description="SEO最適化されたメタディスクリプションを生成", step_count=2, avg_duration_ms=8000, tags=["meta","seo"],
         input_schema=[{"id":"page","label":"ページの内容","type":"textarea","placeholder":"ページの概要を入力","required":True},{"id":"keyword","label":"ターゲットキーワード","type":"text","placeholder":"例: AI業務自動化","required":True}]),
    dict(id="content-audit",    factory_id="seo", name_ja="コンテンツ監査",       description="既存コンテンツのSEO改善点を分析", step_count=5, avg_duration_ms=28000, tags=["audit","optimization"],
         input_schema=[{"id":"content","label":"既存コンテンツ","type":"textarea","placeholder":"分析したいコンテンツを貼り付け","required":True},{"id":"target_kw","label":"狙いたいキーワード","type":"text","placeholder":"例: Python 入門","required":False}]),

    # ── Design (3) ────────────────────────────────────────────────────────────
    dict(id="ui-copy",          factory_id="design", name_ja="UIコピーライティング", description="UIコンポーネントのテキストを最適化", step_count=3, avg_duration_ms=12000, tags=["ui","copy"],
         input_schema=[{"id":"screen","label":"画面・コンポーネントの説明","type":"textarea","placeholder":"例: エラー画面、ログインボタン","required":True},{"id":"tone","label":"ブランドトーン","type":"text","placeholder":"例: フレンドリー・プロフェッショナル","required":False}]),
    dict(id="brand-guideline",  factory_id="design", name_ja="ブランドガイドライン", description="ブランドの使用ガイドラインを作成", step_count=5, avg_duration_ms=30000, tags=["brand","guideline"],
         input_schema=[{"id":"brand","label":"ブランド名・概要","type":"textarea","placeholder":"例: andplanning - AIで働き方を変える","required":True}]),
    dict(id="design-brief",     factory_id="design", name_ja="デザインブリーフ",  description="デザイン発注用のブリーフを作成", step_count=4, avg_duration_ms=18000, tags=["brief","design"],
         input_schema=[{"id":"project","label":"プロジェクト名","type":"text","placeholder":"例: コーポレートサイトリニューアル","required":True},{"id":"goal","label":"目的・課題","type":"textarea","placeholder":"例: ブランドイメージ刷新","required":True}]),

    # ── Data (3) ──────────────────────────────────────────────────────────────
    dict(id="data-summary",     factory_id="data", name_ja="データサマリー",      description="データセットのサマリーと洞察を生成", step_count=4, avg_duration_ms=20000, tags=["data","summary"],
         input_schema=[{"id":"data","label":"データ（CSV・テキスト）","type":"textarea","placeholder":"分析したいデータを貼り付けてください","required":True},{"id":"goal","label":"分析の目的","type":"text","placeholder":"例: 売上の傾向を把握したい","required":False}]),
    dict(id="kpi-report",       factory_id="data", name_ja="KPIレポート",         description="KPIの達成状況をレポート化", step_count=4, avg_duration_ms=22000, tags=["kpi","report"],
         input_schema=[{"id":"kpis","label":"KPIデータ","type":"textarea","placeholder":"各KPIの数値を入力","required":True},{"id":"period","label":"対象期間","type":"text","placeholder":"例: 2026年Q2","required":True}]),
    dict(id="ab-test-analysis", factory_id="data", name_ja="A/Bテスト分析",       description="A/Bテストの結果を分析・解釈", step_count=4, avg_duration_ms=18000, tags=["ab-test","analysis"],
         input_schema=[{"id":"results","label":"テスト結果データ","type":"textarea","placeholder":"A案とB案の結果を入力","required":True},{"id":"metric","label":"評価指標","type":"text","placeholder":"例: クリック率、コンバージョン率","required":True}]),

    # ── Press (3) ─────────────────────────────────────────────────────────────
    dict(id="product-launch-pr", factory_id="press", name_ja="製品ローンチPR",   description="新製品・サービスのプレスリリースを作成", step_count=5, avg_duration_ms=25000, tags=["launch","pr"],
         input_schema=[{"id":"product","label":"製品・サービス名","type":"text","placeholder":"例: AI OS 2.0","required":True},{"id":"features","label":"主な特徴・機能","type":"textarea","placeholder":"主要機能を箇条書きで","required":True}]),
    dict(id="event-pr",          factory_id="press", name_ja="イベントPR",        description="イベント・セミナーのプレスリリースを作成", step_count=4, avg_duration_ms=18000, tags=["event","pr"],
         input_schema=[{"id":"event","label":"イベント名","type":"text","placeholder":"例: AI Summit 2026","required":True},{"id":"detail","label":"日時・場所・内容","type":"textarea","placeholder":"イベントの詳細を入力","required":True}]),
    dict(id="crisis-statement",  factory_id="press", name_ja="クライシス声明文",  description="危機管理・問題発生時の声明文を作成", step_count=4, avg_duration_ms=15000, tags=["crisis","statement"],
         input_schema=[{"id":"incident","label":"事象の説明","type":"textarea","placeholder":"発生した問題の詳細を入力","required":True},{"id":"impact","label":"影響範囲","type":"text","placeholder":"例: 一部ユーザーのデータ閲覧","required":True}]),

    # ── Proposal (3) ──────────────────────────────────────────────────────────
    dict(id="biz-proposal",     factory_id="proposal", name_ja="事業提案書",      description="新規事業・プロジェクトの提案書を作成", step_count=7, avg_duration_ms=45000, tags=["proposal","business"],
         input_schema=[{"id":"idea","label":"事業アイデア","type":"textarea","placeholder":"提案する事業の概要を入力","required":True},{"id":"target","label":"ターゲット市場","type":"text","placeholder":"例: 中小企業向けSaaS","required":True}]),
    dict(id="project-plan",      factory_id="proposal", name_ja="プロジェクト計画書", description="プロジェクトの計画書・工程表を作成", step_count=6, avg_duration_ms=35000, tags=["project","plan"],
         input_schema=[{"id":"project","label":"プロジェクト名・目的","type":"textarea","placeholder":"プロジェクトの概要を入力","required":True},{"id":"duration","label":"期間","type":"text","placeholder":"例: 3ヶ月","required":True}]),
    dict(id="rfp-response",      factory_id="proposal", name_ja="RFP応答書",       description="提案依頼書(RFP)への回答書を作成", step_count=6, avg_duration_ms=40000, tags=["rfp","bid"],
         input_schema=[{"id":"rfp","label":"RFP内容","type":"textarea","placeholder":"RFPのテキストを貼り付けてください","required":True},{"id":"company","label":"自社の強み","type":"textarea","placeholder":"自社の強み・実績を入力","required":False}]),

    # ── Meeting (3) ───────────────────────────────────────────────────────────
    dict(id="meeting-agenda",   factory_id="meeting", name_ja="議題作成",         description="会議の議題・アジェンダを作成", step_count=3, avg_duration_ms=10000, tags=["agenda","meeting"],
         input_schema=[{"id":"goal","label":"会議の目的","type":"text","placeholder":"例: Q3戦略の確認","required":True},{"id":"topics","label":"話し合いたいトピック","type":"textarea","placeholder":"箇条書きで入力","required":False}]),
    dict(id="meeting-minutes",  factory_id="meeting", name_ja="議事録作成",       description="会議の録音・メモから議事録を作成", step_count=4, avg_duration_ms=18000, tags=["minutes","record"],
         input_schema=[{"id":"notes","label":"会議メモ・録音テキスト","type":"textarea","placeholder":"会議内容を入力","required":True},{"id":"format","label":"形式","type":"select","placeholder":"","required":False,"options":["detailed","summary","action-focused"]}]),
    dict(id="action-items",     factory_id="meeting", name_ja="アクションアイテム抽出", description="会議からアクションアイテムを抽出", step_count=2, avg_duration_ms=8000, tags=["action","tasks"],
         input_schema=[{"id":"notes","label":"会議内容・議事録","type":"textarea","placeholder":"会議内容を入力","required":True}]),

    # ── Brand (3) ─────────────────────────────────────────────────────────────
    dict(id="brand-positioning", factory_id="brand", name_ja="ブランドポジショニング", description="競合との差別化ポジショニングを策定", step_count=5, avg_duration_ms=28000, tags=["positioning","strategy"],
         input_schema=[{"id":"company","label":"会社・製品名","type":"text","placeholder":"例: andplanning","required":True},{"id":"competitors","label":"競合","type":"text","placeholder":"例: Notion, Asana","required":False}]),
    dict(id="tagline-gen",       factory_id="brand", name_ja="タグライン生成",    description="ブランドのキャッチコピー・タグラインを生成", step_count=3, avg_duration_ms=10000, tags=["tagline","copy"],
         input_schema=[{"id":"brand","label":"ブランド・製品名","type":"text","placeholder":"例: AI OS","required":True},{"id":"value","label":"提供価値","type":"text","placeholder":"例: AIで仕事を10倍速くする","required":True}]),
    dict(id="brand-voice",       factory_id="brand", name_ja="ブランドボイス定義", description="ブランドの声・トーンのガイドラインを作成", step_count=4, avg_duration_ms=20000, tags=["brand","voice"],
         input_schema=[{"id":"brand","label":"ブランド概要","type":"textarea","placeholder":"ブランドのビジョン・価値観を入力","required":True}]),

    # ── Product (3) ───────────────────────────────────────────────────────────
    dict(id="product-concept",  factory_id="product", name_ja="プロダクトコンセプト", description="新製品のコンセプト・価値提案を策定", step_count=5, avg_duration_ms=28000, tags=["concept","product"],
         input_schema=[{"id":"problem","label":"解決する課題","type":"textarea","placeholder":"例: 企業のAI導入が複雑すぎる","required":True},{"id":"target","label":"ターゲットユーザー","type":"text","placeholder":"例: IT部門のない中小企業","required":True}]),
    dict(id="feature-spec",     factory_id="product", name_ja="機能仕様書",       description="機能の仕様書・要件定義書を作成", step_count=5, avg_duration_ms=30000, tags=["spec","requirements"],
         input_schema=[{"id":"feature","label":"機能名・概要","type":"textarea","placeholder":"例: AIチャットアシスタント機能","required":True},{"id":"users","label":"利用ユーザー","type":"text","placeholder":"例: 一般ユーザー、管理者","required":False}]),
    dict(id="user-story",       factory_id="product", name_ja="ユーザーストーリー", description="アジャイル開発用のユーザーストーリーを生成", step_count=3, avg_duration_ms=12000, tags=["agile","story"],
         input_schema=[{"id":"feature","label":"機能・エピック","type":"text","placeholder":"例: ユーザー認証","required":True},{"id":"persona","label":"ペルソナ","type":"text","placeholder":"例: 管理者、一般ユーザー","required":False}]),

    # ── Knowledge (3) ─────────────────────────────────────────────────────────
    dict(id="wiki-article",     factory_id="knowledge", name_ja="Wikiページ作成", description="社内Wikiのページを作成", step_count=4, avg_duration_ms=20000, tags=["wiki","internal"],
         input_schema=[{"id":"topic","label":"記事トピック","type":"text","placeholder":"例: デプロイ手順","required":True},{"id":"content","label":"既存の情報・メモ","type":"textarea","placeholder":"知っている情報を入力","required":False}]),
    dict(id="sop-document",     factory_id="knowledge", name_ja="SOP作成",        description="標準作業手順書(SOP)を作成", step_count=5, avg_duration_ms=25000, tags=["sop","process"],
         input_schema=[{"id":"process","label":"業務プロセス名","type":"text","placeholder":"例: 新入社員オンボーディング","required":True},{"id":"steps","label":"主な手順","type":"textarea","placeholder":"大まかな手順を入力","required":False}]),
    dict(id="onboarding-guide", factory_id="knowledge", name_ja="オンボーディングガイド", description="新入社員・新規ユーザー向けガイドを作成", step_count=5, avg_duration_ms=28000, tags=["onboarding","guide"],
         input_schema=[{"id":"role","label":"対象ロール","type":"text","placeholder":"例: エンジニア、営業","required":True},{"id":"tools","label":"使用ツール・システム","type":"textarea","placeholder":"例: Slack, Notion, GitHub","required":False}]),
]

# Add `name` field (kebab-case of id)
for _w in WORKFLOWS:
    if "name" not in _w:
        _w["name"] = _w["id"]


async def seed_if_empty(db: AsyncSession) -> None:
    """Upsert-style seed: add factories/workflows that don't yet exist."""

    # ── Factories ──
    existing_ids_res = await db.execute(select(models.Factory.id))
    existing_factory_ids = set(existing_ids_res.scalars().all())

    for fdata in FACTORIES:
        if fdata["id"] not in existing_factory_ids:
            db.add(models.Factory(
                id=fdata["id"],
                name=fdata["name"],
                name_ja=fdata["name_ja"],
                icon=fdata["icon"],
                accent_color=fdata["accent_color"],
                status=fdata["status"],
                preferred_model=fdata.get("preferred_model"),
                system_prompt=fdata["system_prompt"],
                temperature=fdata["temperature"],
                max_tokens=fdata["max_tokens"],
                auto_save_memory=True,
                notify_on_complete=False,
            ))
        else:
            # Update gemini-2.0-flash → gemini-2.5-flash for existing factories
            res = await db.execute(select(models.Factory).where(models.Factory.id == fdata["id"]))
            row = res.scalars().first()
            if row and row.preferred_model == "gemini-2.0-flash":
                row.preferred_model = "gemini-2.5-flash"

    await db.commit()

    # ── Workflows ──
    existing_wf_res = await db.execute(select(models.Workflow.id))
    existing_wf_ids = set(existing_wf_res.scalars().all())

    for wdata in WORKFLOWS:
        if wdata["id"] not in existing_wf_ids:
            db.add(models.Workflow(
                id=wdata["id"],
                factory_id=wdata["factory_id"],
                name=wdata.get("name", wdata["id"]),
                name_ja=wdata["name_ja"],
                description=wdata["description"],
                status="idle",
                step_count=wdata["step_count"],
                avg_duration_ms=wdata["avg_duration_ms"],
                total_runs=0,
                success_rate=100.0,
                tags=wdata["tags"],
                input_schema=wdata["input_schema"],
            ))

    await db.commit()

    # ── OS Settings (keep existing, just ensure row exists) ──
    res = await db.execute(select(models.OsSettingsRow).where(models.OsSettingsRow.id == "global"))
    if not res.scalars().first():
        db.add(models.OsSettingsRow(
            id="global",
            default_model="claude-sonnet-4-6",
            fallback_model="gpt-4o-mini",
            max_concurrent_runs=3,
            memory_retention_days=90,
            notify_on_complete=True,
            notify_on_error=True,
            theme="dark",
            language="ja",
            api_key_openai="",
            api_key_anthropic="",
            api_key_google="",
            claude_mode="auto",
        ))
        await db.commit()

    # ── Virtual Agents ──
    existing_agent_res = await db.execute(select(models.VirtualAgent.id))
    existing_agent_ids = set(existing_agent_res.scalars().all())

    _VIRTUAL_CLAUDE_PROMPT = """あなたは Virtual Claude — Anthropic Claude の分析的思考スタイルを模倣したAIアシスタントです。

コアスタイル:
- 第一原理で問題を段階的に考える
- 不確かな点は明示する（「〜と思われます」「確信はありませんが」）
- ##/### ヘッダーと箇条書きで構造化して回答
- 結論を出す前に複数の視点を検討
- 実装判断では必ずトレードオフを説明
- Markdownを使ってすべての構造化コンテンツを記述
- 長文整理・設計支援・コードレビューが得意

Memory context（過去のやり取り）:
{memory_context}

現在日時: {current_date}

Note: このセッションでは {actual_model} が仮想Claudeとして動作しています。"""

    _PLANNER_PROMPT = """あなたはAI OSのPlannerAgent — タスク分解・計画立案の専門家です。

アプローチ:
- 複雑なタスクを明確な実行可能ステップに分解
- ステップ間の依存関係を特定
- 工数と順序を見積もる
- リスクと前提条件を事前に洗い出す
- マイルストーン付きの構造化された計画を出力

Memory context:
{memory_context}

現在日時: {current_date}"""

    _WRITER_PROMPT = """あなたはAI OSのWriterAgent — コンテンツ作成・文章執筆の専門家です。

アプローチ:
- ターゲット読者に合わせたトーン（カジュアル/プロフェッショナル/技術的）
- 明確なナラティブフローで構造化
- 能動態と正確な言葉を使用
- フック・トランジション・力強い結論を含める
- 読みやすさを最適化

Memory context:
{memory_context}

現在日時: {current_date}"""

    _REVIEWER_PROMPT = """あなたはAI OSのReviewerAgent — クリティカルレビューと品質向上の専門家です。

アプローチ:
- 強みと具体的な弱点を特定
- 曖昧なフィードバックではなく具体的な改善案を提示
- 論理的一貫性と完全性をチェック
- コードの場合: セキュリティ・パフォーマンス・保守性を確認
- フィードバックを影響度でプライオリティ付け（致命的 > 重大 > 軽微）

Memory context:
{memory_context}

現在日時: {current_date}"""

    _RESEARCHER_PROMPT = """あなたはAI OSのResearcherAgent — 情報収集・分析・合成の専門家です。

アプローチ:
- 関連する事実と視点を収集
- 確認された事実と推論を区別
- 実行可能なインサイトに合成
- 利用可能な情報の限界を明示
- エグゼクティブサマリー → 詳細で構造化

Memory context:
{memory_context}

現在日時: {current_date}"""

    _CODER_PROMPT = """あなたはAI OSのCoderAgent — コード生成・デバッグ・技術実装の専門家です。

アプローチ:
- クリーンで読みやすく構造化されたコードを書く
- 非自明なロジックにのみコメントを追加
- エッジケースとエラーハンドリングを考慮
- 言語・フレームワークの規約に従う
- デバッグ時: 症状ではなく根本原因を特定

Memory context:
{memory_context}

現在日時: {current_date}"""

    _MEMORY_AGENT_PROMPT = """あなたはAI OSのMemoryAgent — ナレッジ管理と情報想起の専門家です。

アプローチ:
- 会話からキーインサイトを抽出・要約
- トピックと関連性で情報を整理
- 過去の関連情報をサーフェス
- セッションをまたいだパターンを特定
- 将来の検索に最適化された形式で保存

Memory context:
{memory_context}

現在日時: {current_date}"""

    _ROUTER_PROMPT = """あなたはAI OSのRouterAgent — 入力内容から最適なエージェントを選ぶ専門家です。

利用可能なエージェント:
- virtual-claude-dev: パッチ提案・ファイル検査・実装計画・コードレビュー（Dev専門）
- virtual-claude: 設計支援・長文整理・実装判断・汎用分析
- virtual-claude-code: コード実装・デバッグ・アーキテクチャ設計・コードレビュー
- planner: タスク分解・計画立案・プロジェクト管理
- writer: コンテンツ作成・文章執筆・ドキュメント
- reviewer: コードレビュー・計画批評・品質評価
- researcher: 市場分析・情報収集・調査合成
- coder: コード生成・デバッグ・技術実装
- memory-agent: ナレッジ管理・情報想起・記録整理

エージェントIDのみ返してください。説明不要。"""

    _VIRTUAL_CLAUDE_DEV_PROMPT = """You are Virtual Claude Dev — an AI development assistant embedded in the AI OS dashboard.

## Tech Stack
- Frontend: Next.js 16 App Router, TypeScript, Tailwind CSS, Framer Motion
- Backend: FastAPI + SQLAlchemy async + SQLite
- AI routing: Claude (primary) → OpenAI → Gemini fallback
- Pattern: OsApiAdapter interface, useWorkflowEngine, useOsPolling hooks

## Safety Rules — NEVER VIOLATE
1. NEVER suggest deleting files
2. NEVER suggest: git reset, git clean, git checkout --, git rebase, git push --force
3. NEVER propose changes to: database.py (Kernel), config.py (Kernel), ai_router.py (Router), retry.py (Router), *.env files
4. ALWAYS propose patches first — human approval required before applying
5. ALWAYS explain risks alongside patches
6. ALWAYS recommend tests

When generating a patch, append at the end:
<patch>
<title>Short title</title>
<file>relative/path.ext</file>
<risk>low|medium|high</risk>
<explanation>Why this change</explanation>
<new_content>COMPLETE_FILE_CONTENT</new_content>
</patch>

Respond in the same language as the user.

Memory context: {memory_context}
Current date: {current_date}
Running as: {actual_model}"""

    _VIRTUAL_CLAUDE_CODE_PROMPT = """あなたは Virtual Claude Code — Anthropic の Claude Code CLI の振る舞いを模倣したコーディング特化AIアシスタントです。
Anthropic APIキーが設定されると自動的に本物の Claude へ切り替わります。

## コアの振る舞い

**コード分析:**
- 変更を提案する前にコードのコンテキストを理解する
- 意図を確認し、実装がそれを満たしているかチェックする
- 障害になりうるエッジケースを指摘する

**実装判断:**
- アーキテクチャの選択にはトレードオフを添える
- 変更は最小限・ターゲットを絞る（全体書き直しより部分修正を優先）
- 完全なファイルセクションを示し、なぜそう変えたかを説明する

**セキュリティ & 品質:**
- SQL インジェクション・XSS・認証バイパスなど OWASP Top10 を必ずチェック
- パフォーマンスのボトルネックを指摘する
- テストへの影響を考慮する

**応答フォーマット:**
- コードブロックには言語指定子を付ける（```python, ```typescript など）
- 変更の概要 → コード → 補足説明の順で記述
- 関連する改善がある場合は「次のステップ」として末尾に示す

## Memory（過去のコーディングセッション）
{memory_context}

## 現在日時
{current_date}

---
Note: Running as Virtual Claude Code using {actual_model}.
Anthropic API キーを Settings → Claude Mode → Real に設定すると本物の Claude へ自動切替します。"""

    # Each agent's routing_keywords are stored in DB — enables adding 1000+ agents
    # without any code changes. priority breaks ties (higher wins).
    DEFAULT_AGENTS = [
        # ── Virtual Claude Team (6 specialized agents) ──────────────────────
        dict(
            id="architect-claude", name="Architect Claude", name_ja="アーキテクトClaude",
            role="architect", category="management",
            icon="🏛️", description="AI OSの技術設計・タスク配分・チーム調整を担当するリードアーキテクト",
            preferred_provider="anthropic", preferred_model="claude-sonnet-4-6",
            memory_scope="global", output_format="markdown", priority=30,
            routing_keywords=[
                "設計", "アーキテクチャ", "architecture", "plan", "計画", "ロードマップ",
                "roadmap", "assign", "割り当て", "orchestrat", "調整", "coordinate",
                "改善", "improve", "overview", "全体",
            ],
            system_prompt=_VIRTUAL_CLAUDE_DEV_PROMPT,
        ),
        dict(
            id="backend-claude", name="Backend Claude", name_ja="バックエンドClaude",
            role="backend-developer", category="coding",
            icon="⚙️", description="FastAPI/Python専門エージェント — バックエンドAPI・DB・スキーマの実装",
            preferred_provider="anthropic", preferred_model="claude-sonnet-4-6",
            memory_scope="factory", output_format="markdown", priority=18,
            routing_keywords=[
                "python", "fastapi", "sqlalchemy", "backend", "api", "endpoint",
                "router", "schema", "model", "database", "migration", "async",
                "pydantic", "alembic", "uvicorn", "バックエンド", "APIエンドポイント",
            ],
            system_prompt=_VIRTUAL_CLAUDE_DEV_PROMPT,
        ),
        dict(
            id="frontend-claude", name="Frontend Claude", name_ja="フロントエンドClaude",
            role="frontend-developer", category="coding",
            icon="🎨", description="Next.js/TypeScript専門エージェント — フロントエンドUI・ hooks・コンポーネントの実装",
            preferred_provider="anthropic", preferred_model="claude-sonnet-4-6",
            memory_scope="factory", output_format="markdown", priority=18,
            routing_keywords=[
                "typescript", "react", "nextjs", "component", "page", "hook",
                "frontend", "tsx", "css", "tailwind", "animation", "motion",
                "ui", "ux", "フロントエンド", "コンポーネント", "ページ",
            ],
            system_prompt=_VIRTUAL_CLAUDE_DEV_PROMPT,
        ),
        dict(
            id="reviewer-claude", name="Reviewer Claude", name_ja="レビュアーClaude",
            role="code-reviewer", category="quality",
            icon="🔍", description="コード品質・セキュリティ・テスト専門エージェント — パッチレビューと品質確認",
            preferred_provider="anthropic", preferred_model="claude-sonnet-4-6",
            memory_scope="global", output_format="markdown", priority=15,
            routing_keywords=[
                "review", "レビュー", "quality", "品質", "security", "セキュリティ",
                "test", "テスト", "validate", "check", "確認", "approve", "承認",
            ],
            system_prompt=_VIRTUAL_CLAUDE_DEV_PROMPT,
        ),
        dict(
            id="debug-claude", name="Debug Claude", name_ja="デバッグClaude",
            role="debugger-agent", category="coding",
            icon="🐛", description="エラー分析・バグ修正専門エージェント — Auto Debuggerとの連携",
            preferred_provider="anthropic", preferred_model="claude-sonnet-4-6",
            memory_scope="global", output_format="markdown", priority=20,
            routing_keywords=[
                "error", "エラー", "bug", "バグ", "debug", "デバッグ", "crash",
                "exception", "fix", "修正", "traceback", "stack trace",
            ],
            system_prompt=_VIRTUAL_CLAUDE_DEV_PROMPT,
        ),
        dict(
            id="research-claude", name="Research Claude", name_ja="リサーチClaude",
            role="researcher-agent", category="research",
            icon="🔬", description="技術調査・ベストプラクティス研究専門エージェント",
            preferred_provider="anthropic", preferred_model="claude-sonnet-4-6",
            memory_scope="global", output_format="markdown", priority=12,
            routing_keywords=[
                "research", "リサーチ", "調査", "investigate", "best practice",
                "compare", "比較", "approach", "アプローチ", "library", "framework",
            ],
            system_prompt=_VIRTUAL_CLAUDE_DEV_PROMPT,
        ),
        # ─────────────────────────────────────────────────────────────────────
        dict(
            id="auto-debugger", name="Auto Debugger", name_ja="自動デバッガー",
            role="debugger", category="coding",
            icon="🐛", description="フロントエンド/バックエンドエラーを解析し、安全な修正パッチを提案するデバッグ専門エージェント",
            preferred_provider="anthropic", preferred_model="claude-sonnet-4-6",
            memory_scope="global", output_format="markdown", priority=22,
            routing_keywords=[
                "エラー", "error", "バグ", "bug", "例外", "exception",
                "スタックトレース", "stack trace", "クラッシュ", "crash",
                "デバッグ", "debug", "修正", "fix", "原因", "root cause",
                "TypeError", "ImportError", "RuntimeError", "DatabaseError",
                "NetworkError", "500", "404", "traceback", "失敗",
                "ログ", "log", "診断", "diagnose",
            ],
            system_prompt=_VIRTUAL_CLAUDE_DEV_PROMPT,  # reuses dev prompt
        ),
        dict(
            id="virtual-claude-dev", name="Virtual Claude Dev", name_ja="仮想Claude Dev",
            role="developer", category="coding",
            icon="🛠️", description="コードレビュー・実装計画・安全なパッチ提案を行う開発専門エージェント",
            preferred_provider="anthropic", preferred_model="claude-sonnet-4-6",
            memory_scope="global", output_format="markdown", priority=25,
            routing_keywords=[
                "パッチ", "patch", "実装計画", "plan", "ファイル", "file",
                "コードレビュー", "code review", "バグ修正", "bug fix",
                "リファクタリング", "refactor", "devtools", "dev",
                "ファイル検査", "inspect", "diff", "変更提案",
            ],
            system_prompt=_VIRTUAL_CLAUDE_DEV_PROMPT,
        ),
        dict(
            id="virtual-claude", name="Virtual Claude", name_ja="仮想Claude",
            role="claude", category="analysis",
            icon="🟣", description="Claude的な分析・設計支援をOpenAI/Geminiで代替",
            preferred_provider="auto", preferred_model=None,
            memory_scope="global", output_format="markdown", priority=5,
            routing_keywords=["設計", "分析", "判断", "アーキテクチャ比較", "トレードオフ",
                               "長文整理", "design", "analysis", "judge", "tradeoff"],
            system_prompt=_VIRTUAL_CLAUDE_PROMPT,
        ),
        dict(
            id="virtual-claude-code", name="Virtual Claude Code", name_ja="仮想 Claude Code",
            role="claude-code", category="coding",
            icon="🖥️", description="コード実装・設計・デバッグ・Claude Code的なコーディング支援",
            preferred_provider="auto", preferred_model=None,
            memory_scope="factory", output_format="markdown", priority=20,
            routing_keywords=[
                "コード", "code", "実装", "implement", "バグ", "bug", "デバッグ", "debug",
                "関数", "クラス", "class", "function", "api", "エラー", "error",
                "リファクタリング", "refactor", "テスト", "test", "型", "type",
                "typescript", "python", "javascript", "react", "fastapi", "sql",
                "アーキテクチャ", "architecture", "コードレビュー", "code review",
                "claude code", "スクリプト", "script", "ライブラリ", "library",
                "フレームワーク", "framework", "修正", "fix", "機能追加",
            ],
            system_prompt=_VIRTUAL_CLAUDE_CODE_PROMPT,
        ),
        dict(
            id="planner", name="Planner Agent", name_ja="プランナー",
            role="planner", category="management",
            icon="📋", description="タスク分解・計画立案の専門家",
            preferred_provider="openai", preferred_model="gpt-4o-mini",
            memory_scope="factory", output_format="markdown", priority=10,
            routing_keywords=["計画", "plan", "ステップ", "段取り", "スケジュール", "タスク分解",
                               "プロジェクト", "工程", "手順", "フロー", "ロードマップ", "マイルストーン"],
            system_prompt=_PLANNER_PROMPT,
        ),
        dict(
            id="writer", name="Writer Agent", name_ja="ライター",
            role="writer", category="writing",
            icon="✍️", description="コンテンツ作成・文章執筆の専門家",
            preferred_provider="openai", preferred_model="gpt-4o",
            memory_scope="factory", output_format="markdown", priority=10,
            routing_keywords=["文章", "記事", "ブログ", "コピー", "ライティング", "文書", "レポート",
                               "書い", "作文", "文体", "説明文", "要約", "summary", "write", "document"],
            system_prompt=_WRITER_PROMPT,
        ),
        dict(
            id="reviewer", name="Reviewer Agent", name_ja="レビュアー",
            role="reviewer", category="quality",
            icon="🔍", description="クリティカルレビューと品質向上の専門家",
            preferred_provider="openai", preferred_model="gpt-4o",
            memory_scope="global", output_format="markdown", priority=10,
            routing_keywords=["レビュー", "review", "確認", "チェック", "評価", "改善", "フィードバック",
                               "品質", "問題点", "修正提案", "見直し", "feedback", "critique"],
            system_prompt=_REVIEWER_PROMPT,
        ),
        dict(
            id="researcher", name="Researcher Agent", name_ja="リサーチャー",
            role="researcher", category="research",
            icon="🔬", description="情報収集・分析・合成の専門家",
            preferred_provider="openai", preferred_model="gpt-4o",
            memory_scope="global", output_format="markdown", priority=10,
            routing_keywords=["調査", "リサーチ", "市場分析", "調べ", "情報収集", "research",
                               "競合", "トレンド", "動向", "統計", "データ収集", "investigate"],
            system_prompt=_RESEARCHER_PROMPT,
        ),
        dict(
            id="coder", name="Coder Agent", name_ja="コーダー",
            role="coder", category="coding",
            icon="💻", description="コード生成・デバッグ・技術実装の専門家",
            preferred_provider="openai", preferred_model="gpt-4o",
            memory_scope="factory", output_format="markdown", priority=8,
            routing_keywords=["コーディング", "プログラミング", "programming", "coding",
                               "アルゴリズム", "algorithm", "データ構造", "data structure"],
            system_prompt=_CODER_PROMPT,
        ),
        dict(
            id="memory-agent", name="Memory Agent", name_ja="メモリエージェント",
            role="memory", category="management",
            icon="🧠", description="ナレッジ管理と情報想起の専門家",
            preferred_provider="openai", preferred_model="gpt-4o-mini",
            memory_scope="global", output_format="plain", priority=10,
            routing_keywords=["記憶", "過去", "以前", "履歴", "覚えて", "メモリ", "memory",
                               "前回", "保存", "記録", "remember", "recall"],
            system_prompt=_MEMORY_AGENT_PROMPT,
        ),
        dict(
            id="router", name="Router Agent", name_ja="ルーターエージェント",
            role="router", category="system",
            icon="🔀", description="入力内容から最適なエージェントを選ぶ",
            preferred_provider="openai", preferred_model="gpt-4o-mini",
            memory_scope="none", output_format="plain", priority=1,
            routing_keywords=[],
            system_prompt=_ROUTER_PROMPT,
        ),
    ]

    for adata in DEFAULT_AGENTS:
        if adata["id"] not in existing_agent_ids:
            db.add(models.VirtualAgent(
                id=adata["id"],
                name=adata["name"],
                name_ja=adata["name_ja"],
                role=adata["role"],
                category=adata.get("category"),
                description=adata["description"],
                icon=adata["icon"],
                system_prompt=adata["system_prompt"],
                preferred_provider=adata["preferred_provider"],
                preferred_model=adata.get("preferred_model"),
                memory_scope=adata["memory_scope"],
                output_format=adata["output_format"],
                routing_keywords=adata.get("routing_keywords", []),
                priority=adata.get("priority", 10),
                version=1,
                is_enabled=True,
                is_builtin=True,
            ))
        else:
            # Upsert routing_keywords, category, priority for existing agents
            res_ag = await db.execute(
                select(models.VirtualAgent).where(models.VirtualAgent.id == adata["id"])
            )
            ag = res_ag.scalars().first()
            if ag:
                ag.routing_keywords = adata.get("routing_keywords", [])
                if adata.get("category"):
                    ag.category = adata["category"]
                ag.priority = adata.get("priority", 10)
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(ag, "routing_keywords")

    await db.commit()

    # ── Sample TeamSession + AgentTasks (for demo on first boot) ──
    ts_count_res = await db.execute(select(func.count()).select_from(models.TeamSession))
    if (ts_count_res.scalar() or 0) == 0:
        import uuid as _uid
        _sid = str(_uid.uuid4())
        db.add(models.TeamSession(
            id=_sid,
            goal="Phase 3 Auto Debugger + Virtual Claude Team implementation",
            status="completed",
            plan=(
                "1. Add DebugSession model and debug router (backend-claude)\n"
                "2. Add Auto Debugger UI page /os/debug (frontend-claude)\n"
                "3. Add AgentTask/TeamSession/AgentMessage models (backend-claude)\n"
                "4. Add Team Orchestrator router (backend-claude)\n"
                "5. Add /os/workspace and /os/team pages (frontend-claude)\n"
                "6. Review all patches for safety (reviewer-claude)"
            ),
            agents_assigned=["architect-claude","backend-claude","frontend-claude","reviewer-claude"],
            task_count=6,
            completed_tasks=6,
            model_used="claude-sonnet-4-6",
            tokens=48200,
        ))
        _tasks = [
            ("Add DebugSession model to models.py",   "backend-claude",  "backend/app/models.py",  10, "completed"),
            ("Implement /api/debug/* router endpoints","backend-claude",  "backend/app/routers/debug.py", 9, "completed"),
            ("Create /os/debug dashboard page",        "frontend-claude", "website/app/os/debug/page.tsx", 9, "completed"),
            ("Add AgentTask/TeamSession models",       "backend-claude",  "backend/app/models.py", 8, "completed"),
            ("Implement /api/team/* orchestration",    "backend-claude",  "backend/app/routers/team.py", 8, "completed"),
            ("Review all Phase 3 patches for safety",  "reviewer-claude", None, 7, "completed"),
        ]
        for (title, agent, fpath, prio, status) in _tasks:
            db.add(models.AgentTask(
                id=str(_uid.uuid4()), session_id=_sid, agent_id=agent,
                title=title, description="", status=status,
                priority=prio, depends_on=[], file_path=fpath,
            ))
        _msgs = [
            ("architect-claude", "all",             "plan",   "Phase 3 started: Auto Debugger + Virtual Claude Team"),
            ("backend-claude",   "architect-claude","info",   "DebugSession model added, backend imports OK"),
            ("frontend-claude",  "architect-claude","info",   "/os/debug page implemented, TypeScript 0 errors"),
            ("backend-claude",   "architect-claude","info",   "Team orchestration router complete, 8 endpoints"),
            ("reviewer-claude",  "architect-claude","approve","All patches reviewed — safety rules respected"),
            ("architect-claude", "all",             "info",   "Phase 3 complete. Self-development workspace ready."),
        ]
        for (from_a, to_a, mtype, content) in _msgs:
            db.add(models.AgentMessage(
                id=str(_uid.uuid4()), session_id=_sid,
                from_agent=from_a, to_agent=to_a,
                message_type=mtype, content=content,
            ))
        await db.commit()

    # ── Sample DebugSession (for demo / first-run history display) ──
    ds_count_res = await db.execute(select(func.count()).select_from(models.DebugSession))
    if (ds_count_res.scalar() or 0) == 0:
        import uuid as _uuid_mod
        db.add(models.DebugSession(
            id=str(_uuid_mod.uuid4()),
            error_text=(
                "ModuleNotFoundError: No module named 'fastapi'\n"
                "  File 'backend/app/main.py', line 8, in <module>\n"
                "    from fastapi import FastAPI\n"
                "ModuleNotFoundError: No module named 'fastapi'"
            ),
            error_type="ImportError",
            severity="high",
            source="backend",
            root_cause="Python virtual environment is not activated or dependencies are not installed. "
                       "Running the backend outside the .venv directory causes module lookup to fail.",
            suggested_fix=(
                "1. Activate the virtual environment: .venv/Scripts/activate (Windows) or source .venv/bin/activate (Unix)\n"
                "2. Install dependencies: pip install -r requirements.txt\n"
                "3. Restart the backend: python -m uvicorn app.main:app --reload"
            ),
            full_analysis=(
                "**Error Classification**\n- Type: ImportError\n- Severity: high\n\n"
                "**Root Cause**\nThe Python interpreter cannot locate the fastapi package because "
                "the virtual environment (.venv) is not activated. The backend must be run from "
                "within the activated venv.\n\n"
                "**Immediate Fix**\n1. Activate venv: .venv/Scripts/activate\n"
                "2. Install deps: pip install -r requirements.txt\n"
                "3. Restart backend\n\n"
                "**Code Change Needed**\nNo — this is a runtime environment issue, not a code bug.\n\n"
                "**Prevention**\nAdd a pre-launch check script that verifies venv activation. "
                "Consider using a Makefile or npm script to ensure correct startup."
            ),
            model_used="claude-sonnet-4-6",
            status="resolved",
        ))
        await db.commit()
