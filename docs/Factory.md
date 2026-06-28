# Factory.md
# And Planning — Factory設計仕様

---

## Factoryとは

**Factory（ファクトリー）** は、特定の種類の成果物を生成するための専門モジュールです。

```
工場（Factory）のアナロジー:
  原材料（アイデア・データ）
      ↓
  製造ライン（Workflow）
      ↓
  各工程（Step / Executor）
      ↓
  完成品（記事・動画台本・分析レポート）
```

---

## 現在のFactory一覧

### 1. Creator Factory
| 項目 | 内容 |
|------|------|
| 役割 | クリエイターコンテンツの総合生成 |
| 主な成果物 | 記事・画像指示・スクリプト・企画書 |
| ステータス | スタブ（将来実装） |
| 担当AI | Claude（品質重視） |

### 2. Writing Factory
| 項目 | 内容 |
|------|------|
| 役割 | 文章・記事の自動生成 |
| 主な成果物 | note記事・ブログ・メルマガ・LP文章 |
| ステータス | Note Factory MVP実装済み |
| 担当AI | Claude（日本語品質） |

### 3. Video Factory
| 項目 | 内容 |
|------|------|
| 役割 | 動画制作支援 |
| 主な成果物 | YouTube台本・サムネイル指示・構成案 |
| ステータス | スタブ（将来実装） |
| 担当AI | Claude / ChatGPT |

### 4. Research Factory
| 項目 | 内容 |
|------|------|
| 役割 | 情報収集・分析 |
| 主な成果物 | トレンドレポート・競合分析・要約 |
| ステータス | スタブ（将来実装） |
| 担当AI | Gemini（情報収集） + Claude（分析） |

### 5. Marketing Factory
| 項目 | 内容 |
|------|------|
| 役割 | マーケティング自動化 |
| 主な成果物 | SNS投稿・広告文・メール文章・戦略 |
| ステータス | スタブ（将来実装） |
| 担当AI | Claude / ChatGPT |

### 6. Fortune Factory
| 項目 | 内容 |
|------|------|
| 役割 | 占い・予測コンテンツ |
| 主な成果物 | 運勢記事・占い結果・予測レポート |
| ステータス | スタブ（将来実装） |
| 担当AI | Claude |

---

## Factoryの内部構造

すべてのFactoryは以下の構造を持ちます：

```
src/factories/{factory-name}/
├── __init__.py          # パッケージ初期化・Executor登録
├── models.py            # データモデル定義
│                        # (Article, Plan, Stats等のdataclass)
├── factory.py           # BaseFactory継承クラス
│                        # build_workflow_definitions()を実装
├── executors.py         # Workflow Step Executor群
│                        # 各StepTypeに対応したExecutorクラス
├── memory.py            # 記憶・永続化（data/{name}_memory.json）
└── analyzer.py          # 統計・分析（data/{name}_stats.json）
```

---

## Factory追加手順

### Step 1: 仕様を決める
```
□ Factory名（英語、kebab-case）
□ 主な成果物は何か
□ Workflowのステップ一覧
□ 使用するAIプロバイダー
```

### Step 2: StepTypeを追加
```python
# src/workflow/enums.py に追加
class StepType(str, Enum):
    # 既存...
    NEW_FACTORY_STEP = "new_factory_step"
```

### Step 3: モジュールを作成
```bash
src/factories/{factory-name}/
├── __init__.py
├── models.py
├── factory.py
├── executors.py
├── memory.py
└── analyzer.py
```

### Step 4: Workflow定義を作成
```json
// config/workflow_definitions/{factory}-workflow.json
{
  "name": "factory_workflow",
  "steps": [...]
}
```

### Step 5: 設定ファイルを作成
```json
// config/{factory-name}.json
{
  "target_output": "...",
  "model": "auto"
}
```

### Step 6: Executor を EXECUTOR_REGISTRY に登録
```python
# src/factories/{factory-name}/__init__.py
from src.workflow.executors import EXECUTOR_REGISTRY
EXECUTOR_REGISTRY["new_factory_step"] = NewFactoryExecutor
```

### Step 7: テストを作成・実行
```bash
# 40件以上のテストが必要
venv/Scripts/python.exe tests/test_{factory}_factory.py
```

### Step 8: ドキュメントを更新
- `ARCHITECTURE.md` のFactory一覧を更新
- `ROADMAP.md` のステータスを更新
- `CHANGELOG.md` に追記
- このファイル（Factory.md）のFactory一覧を更新

---

## BaseFactoryの設計

```python
class BaseFactory(ABC):
    """
    すべてのFactoryの基底クラス。
    factory_name と build_workflow_definitions() を実装すること。
    """

    @property
    @abstractmethod
    def factory_name(self) -> str:
        """Registryキーとなる一意名称（英語・小文字）"""

    def build_workflow_definitions(self) -> list[WorkflowDefinition]:
        """このFactoryが管理するWorkflow定義リストを返す"""
        return []

    def get_default_context(self) -> dict:
        """Workflow起動時に注入するデフォルトコンテキスト"""
        return {}
```

---

## データの流れ（Factory内部）

```
Workflow Engine がステップを実行
        ↓
Executor.execute(step, status) が呼ばれる
        ↓
status.context からデータを読み込む
        ↓
AIRouterを使ってコンテンツを生成
        ↓
status.context にデータを書き込む（次のステップへ渡す）
        ↓
StepResult(success=True, output={...}) を返す
        ↓
次のステップが status.context を読み込む
```

---

## 設計のベストプラクティス

### DO（やること）
- 各Executorは1つの責任のみ持つ
- status.contextを通じてデータを受け渡す
- ルーターなしでも動作するスタブモードを用意する
- 全Executorにエラーハンドリングを入れる

### DON'T（やらないこと）
- Executorをまたいでグローバル変数を使わない
- 外部APIを直接呼ばずAI Routerを経由する
- ハードコードされた設定値を使わない（configから読む）
- 既存Executorを変更せず新しいExecutorを追加する

---

*最終更新: 2026-06-28 / And Planning*
