"""
Seed initial data if the database is empty.
Mirrors the structure of website/lib/mock/index.ts.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app import models


def _ago(minutes: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=minutes)


FACTORIES = [
    dict(id="writing",   name="Writing Factory",   name_ja="文章工場",     icon="✐",  accent_color="#2563EB", status="active",   preferred_model="claude-sonnet-4-6",         system_prompt="あなたは優秀な日本語コピーライターです。", temperature=0.8, max_tokens=4096),
    dict(id="research",  name="Research Factory",  name_ja="リサーチ工場", icon="🔍", accent_color="#7C3AED", status="active",   preferred_model="gpt-4o",                    system_prompt="あなたは優秀なリサーチアナリストです。",  temperature=0.3, max_tokens=4096),
    dict(id="marketing", name="Marketing Factory", name_ja="マーケ工場",   icon="📣", accent_color="#059669", status="active",   preferred_model="gemini-2.0-flash",           system_prompt="あなたは優秀なマーケターです。",          temperature=0.9, max_tokens=2048),
    dict(id="video",     name="Video Factory",     name_ja="動画工場",     icon="🎬", accent_color="#DC2626", status="idle",     preferred_model="gemini-2.0-flash",           system_prompt="あなたは優秀な動画クリエイターです。",    temperature=0.8, max_tokens=2048),
    dict(id="fortune",   name="Fortune Factory",   name_ja="占い工場",     icon="🔮", accent_color="#9333EA", status="idle",     preferred_model="claude-haiku-4-5-20251001",  system_prompt="あなたは神秘的な占い師です。",            temperature=1.0, max_tokens=1024),
    dict(id="creator",   name="Creator Factory",   name_ja="クリエイター工場", icon="🎨", accent_color="#F59E0B", status="active", preferred_model="gpt-4o-mini",             system_prompt="あなたは多才なクリエイターです。",        temperature=0.9, max_tokens=2048),
    dict(id="ai-os",     name="AI OS Core",        name_ja="AI OS コア",   icon="⚙️",  accent_color="#22D3EE", status="active",   preferred_model=None,                        system_prompt="You are the AI OS orchestration core.",  temperature=0.5, max_tokens=8192),
]

WORKFLOWS = [
    # Writing
    dict(id="blog-seo",      factory_id="writing",   name="blog-seo-article",      name_ja="SEO記事生成",        description="キーワードからSEO最適化記事を生成します",      status="idle", step_count=9, avg_duration_ms=42000, total_runs=128, success_rate=97.7, tags=["seo","blog","writing"],
         input_schema=[{"id":"keyword","label":"ターゲットキーワード","type":"text","placeholder":"例: React hooks 入門","required":True},{"id":"tone","label":"トーン","type":"select","placeholder":"","required":False,"options":["professional","casual","academic"]}]),
    dict(id="lp-copy",       factory_id="writing",   name="lp-copywriting",        name_ja="LPコピー生成",       description="ランディングページのコピーを生成します",          status="idle", step_count=6, avg_duration_ms=28000, total_runs=64,  success_rate=95.3, tags=["lp","copy","conversion"],
         input_schema=[{"id":"product","label":"製品・サービス名","type":"text","placeholder":"例: AI OS","required":True},{"id":"target","label":"ターゲット顧客","type":"textarea","placeholder":"例: スタートアップCTO","required":True}]),
    # Research
    dict(id="market-research",factory_id="research", name="market-research",       name_ja="市場調査レポート",   description="指定テーマの市場調査レポートを生成します",        status="idle", step_count=5, avg_duration_ms=35000, total_runs=42,  success_rate=92.9, tags=["research","market","report"],
         input_schema=[{"id":"topic","label":"調査テーマ","type":"text","placeholder":"例: 生成AI市場","required":True},{"id":"depth","label":"調査深度","type":"select","placeholder":"","required":False,"options":["summary","standard","deep"]}]),
    dict(id="competitor",     factory_id="research", name="competitor-analysis",   name_ja="競合分析",           description="競合他社の強み・弱みを分析します",                status="idle", step_count=4, avg_duration_ms=30000, total_runs=28,  success_rate=96.4, tags=["competitive","analysis"],
         input_schema=[{"id":"company","label":"競合企業名","type":"text","placeholder":"例: Notion","required":True}]),
    # Marketing
    dict(id="sns-post",       factory_id="marketing",name="sns-post-generator",    name_ja="SNS投稿生成",        description="複数SNS向けの投稿を一括生成します",               status="idle", step_count=4, avg_duration_ms=18000, total_runs=210, success_rate=99.0, tags=["sns","twitter","instagram"],
         input_schema=[{"id":"topic","label":"投稿テーマ","type":"text","placeholder":"例: 新製品リリース","required":True},{"id":"platform","label":"プラットフォーム","type":"select","placeholder":"","required":False,"options":["twitter","instagram","linkedin","all"]}]),
    dict(id="email-campaign", factory_id="marketing",name="email-campaign",        name_ja="メールキャンペーン", description="メールキャンペーンの件名と本文を生成します",        status="idle", step_count=5, avg_duration_ms=22000, total_runs=76,  success_rate=94.7, tags=["email","campaign","marketing"],
         input_schema=[{"id":"goal","label":"キャンペーン目標","type":"text","placeholder":"例: 新機能告知","required":True},{"id":"segment","label":"ターゲットセグメント","type":"textarea","placeholder":"例: アクティブユーザー","required":False}]),
    # Video
    dict(id="video-script",   factory_id="video",    name="video-script",          name_ja="動画台本生成",       description="YouTube動画の台本を生成します",                   status="idle", step_count=5, avg_duration_ms=38000, total_runs=34,  success_rate=91.2, tags=["youtube","script","video"],
         input_schema=[{"id":"title","label":"動画タイトル","type":"text","placeholder":"例: React入門講座","required":True},{"id":"duration","label":"動画尺(分)","type":"text","placeholder":"例: 10","required":False}]),
    # Fortune
    dict(id="daily-fortune",  factory_id="fortune",  name="daily-fortune",         name_ja="今日の運勢",         description="生年月日から今日の運勢を占います",                 status="idle", step_count=3, avg_duration_ms=8000,  total_runs=320, success_rate=100.0, tags=["fortune","daily"],
         input_schema=[{"id":"birthday","label":"生年月日","type":"text","placeholder":"例: 1990-03-15","required":True},{"id":"sign","label":"星座","type":"select","placeholder":"","required":False,"options":["牡羊座","牡牛座","双子座","蟹座","獅子座","乙女座","天秤座","蠍座","射手座","山羊座","水瓶座","魚座"]}]),
    # Creator
    dict(id="product-desc",   factory_id="creator",  name="product-description",   name_ja="商品説明文生成",     description="ECサイト向け商品説明文を生成します",               status="idle", step_count=4, avg_duration_ms=15000, total_runs=89,  success_rate=98.9, tags=["ecommerce","product","description"],
         input_schema=[{"id":"product","label":"商品名","type":"text","placeholder":"例: ワイヤレスイヤホン","required":True},{"id":"features","label":"特徴・スペック","type":"textarea","placeholder":"例: ノイズキャンセリング、30時間再生","required":True}]),
    # AI OS
    dict(id="auto-plan",      factory_id="ai-os",    name="auto-planning",         name_ja="自動タスク計画",     description="目標からタスクを自動分解・スケジューリングします",  status="idle", step_count=6, avg_duration_ms=25000, total_runs=15,  success_rate=93.3, tags=["planning","automation","ai-os"],
         input_schema=[{"id":"goal","label":"達成したい目標","type":"textarea","placeholder":"例: 新機能のマーケティング計画を立てる","required":True},{"id":"deadline","label":"期限","type":"text","placeholder":"例: 2週間後","required":False}]),
]

SETTINGS = dict(
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
)


async def seed_if_empty(db: AsyncSession) -> None:
    """Insert seed data only when the tables are empty."""
    # Check factories
    result = await db.execute(select(models.Factory).limit(1))
    if result.scalars().first():
        return  # Already seeded

    # Factories
    for f in FACTORIES:
        db.add(models.Factory(**f))

    # Workflows
    for w in WORKFLOWS:
        db.add(models.Workflow(**w))

    # Settings
    db.add(models.OsSettingsRow(**SETTINGS))

    await db.commit()
