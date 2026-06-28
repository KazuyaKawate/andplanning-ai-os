# ROADMAP.md
# And Planning AI OS — 開発ロードマップ

> 最終目標: 完全自律型AI Operating Systemの商用リリース

---

## 現在地

```
Phase 1 ████████░░  80%  基盤構築
Phase 2 ██░░░░░░░░  20%  Factory MVP
Phase 3 ░░░░░░░░░░   0%  商用化
Phase 4 ░░░░░░░░░░   0%  スケール
```

---

## Phase 1 — Foundation（基盤構築）
**目標期間:** 〜 2026 Q2  
**ステータス:** 進行中

### 完了済み
- [x] AI Router（Claude / ChatGPT / Gemini 統合）
- [x] Inbox（タスク受信・キュー管理）
- [x] Scheduler（定時実行・トリガー）
- [x] Workflow Engine（ステップ実行エンジン）
- [x] Orchestrator（複数Workflow統括）
- [x] Dashboard（Streamlit 稼働監視）
- [x] Memory / Snapshot（状態永続化）
- [x] Factory Registry（Factory管理基盤）

### 進行中
- [ ] ドキュメント整備（本作業）
- [ ] Website MVP（公式ホームページ）
- [ ] Note Factory MVP（最初の実用Factory）

---

## Phase 2 — Factory MVP（Factory群の実用化）
**目標期間:** 2026 Q3  
**ステータス:** 準備中

### Note Factory（最優先）
- [ ] note.com記事の完全自動生成
- [ ] Planner / Writer / Reviewer / Publisher
- [ ] Human Approval フロー
- [ ] 収益分析・統計

### Writing Factory
- [ ] ブログ記事生成
- [ ] メルマガ自動作成
- [ ] SEO最適化

### Research Factory
- [ ] Web情報収集
- [ ] トレンド分析レポート
- [ ] 競合調査自動化

### Creator Factory
- [ ] YouTube台本生成
- [ ] SNS投稿カレンダー
- [ ] コンテンツ戦略立案

---

## Phase 3 — Commercial（商用化）
**目標期間:** 2026 Q4  
**ステータス:** 計画中

- [ ] SaaS化（マルチテナント対応）
- [ ] Web API 公開
- [ ] ユーザー管理・認証
- [ ] 料金プラン設計
- [ ] 月額サブスクリプション
- [ ] 利用統計・課金基盤

---

## Phase 4 — Scale（スケールアップ）
**目標期間:** 2027〜  
**ステータス:** 構想中

- [ ] Marketing Factory
- [ ] Video Factory
- [ ] Fortune Factory
- [ ] カスタムFactory作成機能（ユーザー自身が追加）
- [ ] AI同士の自律的な連携
- [ ] モバイルアプリ
- [ ] 海外展開（英語対応）

---

## マイルストーン

| マイルストーン | 目標日 | 内容 |
|-------------|--------|------|
| M1 | 2026-07 | Website公開 + Note Factory MVP |
| M2 | 2026-09 | Writing + Research Factory |
| M3 | 2026-10 | Creator Factory |
| M4 | 2026-12 | SaaS化・商用ローンチ |
| M5 | 2027-03 | 全Factory揃え |
| M6 | 2027-06 | 海外展開 |

---

## 技術的負債・改善予定

| 項目 | 優先度 | 時期 |
|------|--------|------|
| テストカバレッジ向上 | 高 | Phase 2 |
| CronTrigger実装 | 高 | Phase 2 |
| note.com API連携 | 高 | Phase 2 |
| Dashboard UI改善 | 中 | Phase 3 |
| マルチテナント対応 | 高 | Phase 3 |
| 外部DB移行（PostgreSQL） | 中 | Phase 3 |
| Next.js移行（Website） | 中 | Phase 3 |
| CI/CD整備 | 中 | Phase 3 |

---

*最終更新: 2026-06-28 / And Planning*
