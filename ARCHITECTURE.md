# ARCHITECTURE.md
# And Planning AI Operating System — システム設計書

> このファイルは **Claude・ChatGPT・Gemini を含むすべての開発AI** が
> コードを書く前に必ず参照する設計書です。
> 変更時は必ずこのファイルも更新してください。

---

## 1. システム全体像

```
┌─────────────────────────────────────────────────────────┐
│                    外部入力レイヤー                       │
│   スマホ / Web / スケジューラー / 手動トリガー             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    [ Inbox ]                             │
│   タスクを受信・キューに積む                              │
│   src/core/inbox/                                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  [ AI Router ]                           │
│   Claude / ChatGPT / Gemini への振り分け                 │
│   コスト・精度・可用性に基づいて自動選択                   │
│   src/core/router/                                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                [ Orchestrator ]                          │
│   複数Workflowの並列管理・優先度制御                      │
│   src/core/orchestrator/                                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              [ Workflow Engine ]                         │
│   ステップを依存関係に従って順次実行                       │
│   一時停止・再開・キャンセル対応                          │
│   src/core/workflow/                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    [Creator]    [Writing]    [Research]  ...Factory群
    [Video]      [Marketing]  [Fortune]
    src/factories/
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│             [ Memory / Snapshot ]                        │
│   実行結果・記憶・状態をJSONファイルに永続化              │
│   data/                                                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  [ Dashboard ]                           │
│   稼働状況・統計をStreamlitで可視化                       │
│   src/dashboard/                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 2. コンポーネント詳細

### 2-1. Inbox
- 外部からのタスクを受け付ける唯一の入口
- タスクはキューに積まれ、順番に処理される
- 複数のInbox Source に対応（手動・スケジューラー・API）
- **拡張ポイント:** `BaseInboxSource` を継承して新しいソースを追加

### 2-2. AI Router
- Claude / ChatGPT / Gemini を統一インターフェースで呼び出す
- プロバイダーの優先度・コスト・可用性に基づいて自動選択
- フォールバック機能（1つ失敗したら次のプロバイダーへ）
- **拡張ポイント:** `BaseProvider` を継承して新しいAIを追加

### 2-3. Orchestrator
- 複数の WorkflowJob を管理するマネージャー
- 優先度キュー・同時実行数制限・依存関係管理
- Inbox と Scheduler から WorkflowJob を受け取る
- **状態:** `data/orchestrator_status.json` に書き出す

### 2-4. Workflow Engine
- WorkflowDefinition（JSONファイル）を読み込んで実行
- Kahn's algorithm でステップの依存関係を解決
- リトライ・一時停止・Human Approval に対応
- **状態:** `data/workflows/{workflow_id}.json` に書き出す

### 2-5. Factory
- 具体的な成果物を生成する専門モジュール
- 各Factoryは独立したモジュールとして設計
- WorkflowのステップとしてExecutorを提供
- **拡張ポイント:** `BaseFactory` を継承して新しいFactoryを追加

### 2-6. Memory / Snapshot
- Memory: 長期記憶（記事履歴・学習データ等）
- Snapshot: システム全体の状態バックアップ
- すべてローカルJSONファイルで管理（外部DB不要）

### 2-7. Dashboard
- Streamlit で構築されたオペレーションUI
- すべてのコンポーネントの状態をリアルタイムで表示
- `data/` フォルダのJSONを読み込むだけ（API不要）

---

## 3. データフロー（具体例）

```
【note記事生成の場合】

1. スマホから「記事を書いて」と送信
        ↓
2. Inbox がタスクを受信・キューに追加
        ↓
3. Orchestrator が WorkflowJob を生成
        ↓
4. Workflow Engine が note_daily.json を読み込んで実行

   Step 1: note_idea     → Claudeがトピックを生成
   Step 2: note_plan     → Claudeが記事構成を生成
   Step 3: note_write    → Claudeが本文を執筆
   Step 4: note_review   → ルールチェック（文字数・禁止語）
   Step 5: human_approval → 人間の承認を待つ
   Step 6: note_publish  → draft.md を出力
   Step 7: note_analyze  → 統計を更新
   Step 8: note_memory   → 記事を記憶に保存
   Step 9: snapshot      → システム全体をバックアップ
        ↓
5. Dashboard に結果が表示される
```

---

## 4. ファイル永続化の原則

```
data/                           ← 実行時データ（コミットしない）
├── orchestrator_status.json    # Orchestrator の現在状態
├── scheduler_status.json       # Scheduler の現在状態
├── workflows/                  # Workflow 実行ログ
│   └── {workflow_id}.json
├── note_memory.json            # Note Factory の記事記憶
├── note_stats.json             # Note Factory の統計
└── inbox_queue_stats.json      # Inbox キュー統計
```

**原則:**
- すべての状態は `data/` 以下の JSON ファイルに保存する
- Dashboard は JSON を読むだけ（API呼び出し不要）
- `data/` は `.gitignore` に追加（個人データ保護）
- APIキー・認証情報は `.env` のみに記載（コミット厳禁）

---

## 5. Workflow定義ファイルの構造

```json
{
  "name": "workflow_name",
  "description": "このワークフローの説明",
  "version": "1.0.0",
  "steps": [
    {
      "step_id": "step_1",
      "step_type": "ai_task",
      "name": "ステップ名",
      "depends_on": [],
      "config": {
        "prompt": "AIへの指示"
      },
      "retry_max": 2,
      "on_failure": "abort"
    }
  ]
}
```

**配置場所:** `config/workflow_definitions/{workflow-name}.json`

---

## 6. 新しいFactoryを追加する手順

```
1. config/workflow_definitions/{factory}-workflow.json を作成
2. src/factories/{factory-name}/ フォルダを作成
   ├── __init__.py
   ├── models.py      データモデル定義
   ├── factory.py     BaseFactory継承クラス
   ├── executors.py   Workflow Stepの実行クラス群
   └── memory.py      記憶・永続化
3. src/workflow/enums.py に StepType を追加
4. EXECUTOR_REGISTRY に Executor を登録
5. config/{factory-name}.json を作成
6. このARCHITECTURE.md のFactory一覧を更新
```

---

## 7. 技術スタック

| 領域 | 技術 | バージョン | 理由 |
|------|------|-----------|------|
| バックエンド | Python | 3.11+ | AI SDKの充実、可読性 |
| AI: Claude | anthropic SDK | 最新 | 日本語品質・推論力 |
| AI: ChatGPT | openai SDK | 最新 | 汎用性・速度 |
| AI: Gemini | google-genai | 最新 | 将来統合予定 |
| Dashboard | Streamlit | 最新 | Python完結・高速 |
| Website | HTML/CSS/JS | - | 初期MVP |
| Website将来 | Next.js | 14+ | SEO・パフォーマンス |
| データ | JSON ファイル | - | シンプル・外部依存なし |

---

## 8. AI開発者への指示

### 全AIへの共通ルール
1. コードを書く前に必ずこのファイルを読む
2. 既存コードへの影響を最小限にする
3. 変更前に影響範囲を報告する
4. テストなしのコミットは禁止
5. プッシュは And Planning の承認後のみ
6. APIキー・認証情報はコードに書かない

### Claude へ
- 日本語コメントを優先
- 設計の根拠を説明してからコードを書く
- `CONTRIBUTING.md` の Claude セクションを参照

### ChatGPT へ
- `CONVENTIONS.md` の命名規則を厳守
- 新ファイル作成前に既存ファイルを確認
- `CONTRIBUTING.md` の ChatGPT セクションを参照

### Gemini へ
- ドキュメントの生成・更新を担当
- コード変更後にこのファイルを最新状態に保つ
- `CONTRIBUTING.md` の Gemini セクションを参照

---

## 9. バージョン情報

| 項目 | 内容 |
|------|------|
| ドキュメントバージョン | v0.1.0 |
| 最終更新 | 2026-06-28 |
| 管理者 | And Planning |
| 次のマイルストーン | Website MVP + Note Factory MVP |
