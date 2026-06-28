# CHANGELOG.md
# And Planning AI OS — 更新履歴

> このファイルは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づいて管理されます。
> バージョンは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

---

## [Unreleased]
### 追加予定
- Website MVP（公式ホームページ）
- Note Factory MVP（最初の実用Factory）
- CronTrigger（定時実行トリガー）
- note.com API連携

---

## [0.1.0] — 2026-06-28
### 追加
- AI Router（Claude / Claude Flash / Claude Haiku 対応）
- Inbox システム（タスク受信・キュー管理）
- Factory Scheduler（定時実行・IntervalTrigger）
- Workflow Engine（DAG実行・リトライ・Human Approval）
- Factory Orchestrator（複数Workflow統括・優先度管理）
- Dashboard（Streamlit稼働監視・各コンポーネント統計）
- Memory システム（状態永続化）
- Snapshot システム（バックアップ）
- Factory Registry（Factory・Executor・Workflow自動登録）
- EventBus（イベント駆動アーキテクチャ）
- 7つのFactory スタブ（Creator/Fortune/SNS/Writing/Video/Research/Marketing）
- リポジトリドキュメント整備（README/ARCHITECTURE/ROADMAP/CONTRIBUTING）

### 技術的な詳細
- Python 3.11+
- Anthropic SDK（Claude統合）
- OpenAI SDK（ChatGPT統合）
- Streamlit Dashboard
- JSON ファイルベースの状態管理

---

## バージョン番号の付け方

```
MAJOR.MINOR.PATCH

MAJOR: 後方互換性のない大きな変更（アーキテクチャ刷新等）
MINOR: 後方互換性のある新機能追加（新Factory追加等）
PATCH: バグ修正・小さな改善
```

---

*管理者: And Planning*
