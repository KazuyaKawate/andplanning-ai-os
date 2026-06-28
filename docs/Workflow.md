# Workflow.md
# And Planning — Workflow Engine 仕様書

---

## Workflow Engineとは

**Workflow Engine** は、定義されたステップを依存関係に従って
自動実行するAI OSの中枢エンジンです。

```
WorkflowDefinition（JSONファイル）
        ↓
  WorkflowRunner が読み込む
        ↓
  依存関係を解決（DAG）
        ↓
  ステップを順番に実行
        ↓
  WorkflowStatus に結果を記録
```

---

## 基本概念

| 用語 | 説明 |
|------|------|
| WorkflowDefinition | ワークフローの設計図（JSONファイル） |
| WorkflowStep | 1つの作業単位（AI呼び出し・承認待ち等） |
| WorkflowStatus | 実行中のワークフローの現在状態 |
| Executor | ステップを実際に実行するクラス |
| context | ステップ間でデータを受け渡す辞書 |

---

## WorkflowDefinition（JSON）の書き方

```json
{
  "name": "ワークフロー名（英語・snake_case）",
  "description": "このワークフローの説明",
  "version": "1.0.0",
  "steps": [
    {
      "step_id": "step_1",
      "step_type": "ステップ種別",
      "name": "ステップ表示名",
      "depends_on": [],
      "config": {},
      "retry_max": 0,
      "retry_delay_sec": 1.0,
      "on_failure": "abort"
    }
  ]
}
```

---

## StepType（ステップ種別）一覧

| step_type | 説明 | 用途 |
|-----------|------|------|
| `ai_task` | AIにテキスト生成を依頼 | 汎用AI処理 |
| `human_approval` | 人間の承認を待つ | 重要な判断前 |
| `memory_update` | Memoryを更新 | 情報を記憶させる |
| `snapshot` | システム全体をバックアップ | 定期保存 |
| `inbox_poll` | Inboxのタスクを取得 | 新着確認 |
| `queue_push` | タスクをキューに追加 | 非同期処理 |
| `condition` | 条件分岐（将来実装） | ルーティング |
| `notification` | 通知送信（将来実装） | アラート |
| `note_idea` | note記事のアイデア生成 | Note Factory |
| `note_plan` | note記事の計画立案 | Note Factory |
| `note_write` | note記事の執筆 | Note Factory |
| `note_review` | note記事のレビュー | Note Factory |
| `note_publish` | note記事の公開（ドラフト） | Note Factory |
| `note_analyze` | note記事の統計更新 | Note Factory |
| `note_memory` | note記事の記憶保存 | Note Factory |

---

## on_failure（失敗時の動作）

| 設定値 | 動作 |
|--------|------|
| `abort` | ワークフロー全体を失敗で終了（デフォルト） |
| `skip` | このステップをスキップして次へ進む |
| `continue` | 失敗を記録して次へ進む（skipと同等） |

---

## ステップ間のデータ受け渡し

ステップ間のデータは `context`（辞書）を通じて受け渡します。

```python
# Executor内でデータを書き込む
def execute(self, step, status):
    # 前のステップのデータを読む
    topic = status.context.get("topic", "")
    
    # このステップの結果を書き込む
    status.context["note_plan"] = plan.to_dict()
    
    return StepResult(success=True, output=plan.to_dict())
```

```
Step 1: note_idea
  → status.context["topic"] = "AI副業の始め方"
  
Step 2: note_plan  ← topicを読む
  → status.context["note_plan"] = {...}
  
Step 3: note_write  ← note_planを読む
  → status.context["note_article"] = {...}
```

---

## Human Approval の流れ

```
Step N: human_approval
        ↓
  WorkflowRunnerが承認待ち状態に遷移
  (WorkflowState.WAITING_APPROVAL)
        ↓
  Dashboard に「承認待ち」が表示される
        ↓
  人間が承認 / 却下 を選択
        ↓
  runner.approve(workflow_id, step_id)
  or
  runner.reject(workflow_id, step_id, reason)
        ↓
  次のステップへ進む / ワークフロー失敗
```

---

## 実行状態の遷移

```
WorkflowState（ワークフロー全体）:
  PENDING → RUNNING → COMPLETED
                    → FAILED
                    → CANCELLED
                    → PAUSED → RUNNING（再開）
                    → WAITING_APPROVAL → RUNNING（承認後）

StepState（個別ステップ）:
  PENDING → RUNNING → COMPLETED
                    → FAILED
                    → SKIPPED
                    → RETRYING → RUNNING（再試行）
                    → WAITING_APPROVAL → COMPLETED（承認後）
```

---

## Workflow設計のベストプラクティス

### ステップの粒度
```
小さすぎる（NG）: "AIに質問する" → 汎用的すぎて再利用しにくい
大きすぎる（NG）: "記事を最初から最後まで生成する" → エラー時に再実行コストが高い
ちょうどいい（OK): "記事の構成を生成する" → 1つの明確な成果物
```

### 依存関係の設計
```json
// 良い例: 直列（前のステップが終わったら次へ）
"depends_on": ["planning"]

// 良い例: 並列（analyze と memory は両方 publish に依存、互いに独立）
// analyze: "depends_on": ["publish"]
// memory:  "depends_on": ["publish"]
// snapshot: "depends_on": ["analyze", "memory"]

// 避けること: 循環依存
// step_A: "depends_on": ["step_B"]
// step_B: "depends_on": ["step_A"]  ← エラーになる
```

### リトライ設定
```json
// 一時的なエラー（API障害等）が想定される場合
"retry_max": 2,
"retry_delay_sec": 5.0,
"on_failure": "skip"

// 重要な処理（失敗したら止める）
"retry_max": 0,
"on_failure": "abort"
```

---

## Workflow実行ファイルの場所

```
config/workflow_definitions/
├── note_daily.json           # Note Factory メインワークフロー
├── inbox_to_snapshot.json    # サンプルワークフロー
└── {new-factory}-workflow.json  # 新Factory追加時
```

実行状態は以下に保存されます：
```
data/workflows/
└── {workflow_id}.json   # 各実行インスタンスの状態
```

---

*最終更新: 2026-06-28 / And Planning*
