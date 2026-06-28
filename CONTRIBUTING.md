# CONTRIBUTING.md
# And Planning AI OS — 開発参加ガイド

> このリポジトリは **Claude・ChatGPT・Gemini・人間** が共同開発します。
> すべての開発者（AIを含む）はこのファイルを必ず読んでから作業を開始してください。

---

## 開発の大原則

```
1. 保守性   > 新機能追加のしやすさより、既存コードの理解しやすさを優先
2. 拡張性   > 将来のFactory追加・AI追加を常に意識した設計
3. 可読性   > 自分以外のAIが読んでも意図がわかるコード
4. 最小変更 > 既存コードへの影響は常に最小限に抑える
5. ドキュメントファースト > コードより先にドキュメントを更新する
```

---

## ブランチ戦略

```
main          ← 本番環境（And Planningの承認なしにプッシュ禁止）
  └── develop ← 開発統合ブランチ
        ├── feature/xxx    ← 新機能開発
        ├── fix/xxx        ← バグ修正
        ├── docs/xxx       ← ドキュメント更新
        └── factory/xxx    ← 新Factory追加
```

**ルール:**
- `main` への直接プッシュは禁止
- すべての変更はPull Requestで行う
- PR作成前にテストを必ず実行する

---

## コミットメッセージの書き方

```
形式: [種類] 変更内容の説明（日本語）

種類一覧:
  feat     新機能追加
  fix      バグ修正
  docs     ドキュメント更新
  refactor コードリファクタリング
  test     テスト追加・修正
  style    フォーマット・命名変更
  factory  新Factory追加

例:
  feat: Note Factory MVP実装（Planner/Writer/Publisher）
  fix: WorkflowRunner のリトライロジック修正
  docs: ARCHITECTURE.md にデータフロー図を追加
  factory: Research Factory スタブ追加
```

---

## 命名規則（全員厳守）

| 対象 | ルール | 良い例 | 悪い例 |
|------|--------|--------|--------|
| フォルダ | kebab-case | `note-factory/` | `NoteFactory/` |
| Pythonファイル | snake_case | `ai_router.py` | `AIRouter.py` |
| HTMLファイル | kebab-case | `index.html` | `Index.html` |
| CSSファイル | kebab-case | `style.css` | `Style.css` |
| JSファイル | kebab-case | `main.js` | `Main.js` |
| Pythonクラス | PascalCase | `NoteFactory` | `note_factory` |
| Python関数 | snake_case | `build_workflow()` | `BuildWorkflow()` |
| Python変数 | snake_case | `article_count` | `articleCount` |
| JS関数 | camelCase | `initScroll()` | `init_scroll()` |
| CSS変数 | --kebab-case | `--color-navy` | `--colorNavy` |
| 定数 | UPPER_SNAKE | `MAX_RETRY` | `maxRetry` |
| 設定ファイル | kebab-case.json | `note-factory.json` | `NoteFactory.json` |

---

## ファイル配置ルール

```
新しい機能を追加するとき、必ずこの場所に置く:

src/core/          → OS中枢（Router/Scheduler/Orchestratorの改修）
src/factories/     → Factory実装
config/            → 設定ファイル（JSONのみ、秘匿情報禁止）
docs/              → ドキュメント
website/           → ホームページ
```

---

## セキュリティルール（全員厳守）

```
絶対にコミットしてはいけないもの:
  - APIキー（ANTHROPIC_API_KEY 等）
  - パスワード
  - 個人情報
  - .env ファイル
  - data/ フォルダの内容（ユーザーデータ）

必ず .gitignore に含めること:
  .env
  data/
  __pycache__/
  *.pyc
  .DS_Store
  node_modules/
  venv/
```

---

## AI別の役割分担

### Claude（主担当）
- **得意:** 設計・推論・日本語品質
- **担当範囲:**
  - システム設計・アーキテクチャ決定
  - バックエンド（Python）コア実装
  - ドキュメント執筆
  - コードレビュー
- **作業前の確認事項:**
  1. `ARCHITECTURE.md` を読む
  2. 影響範囲を報告してから実装開始
  3. 日本語コメントを必ず入れる

### ChatGPT（補助担当）
- **得意:** 汎用コーディング・API統合
- **担当範囲:**
  - API統合・外部サービス連携
  - テストコード作成
  - リファクタリング
- **作業前の確認事項:**
  1. `CONVENTIONS.md` の命名規則を確認
  2. 既存ファイルのリストを確認してから新規作成
  3. テストを必ず書く

### Gemini（ドキュメント担当）
- **得意:** 情報整理・ドキュメント生成
- **担当範囲:**
  - ドキュメントの作成・更新
  - `docs/` フォルダ管理
  - CHANGELOG.md 更新
- **作業前の確認事項:**
  1. コード変更後は必ず該当ドキュメントを更新
  2. `ARCHITECTURE.md` を最新状態に保つ

---

## Pull Request のルール

### PR作成前のチェックリスト
```
□ ARCHITECTURE.md を読んだ
□ CONVENTIONS.md の命名規則に従っている
□ テストを書いた・実行した
□ 既存コードへの影響を確認した
□ APIキー等の秘匿情報が含まれていない
□ コメント（日本語）を入れた
```

### PR説明文のテンプレート
```markdown
## 変更内容
（何を変更したか）

## 変更の理由
（なぜ必要か）

## 影響範囲
（どのファイル・機能に影響するか）

## テスト
（どのテストを実行したか）

## スクリーンショット（UI変更の場合）
```

---

## 新しいFactoryを追加するとき

```
1. このファイルで手順を確認
2. ARCHITECTURE.md の手順に従う
3. factories/_template/ をコピー
4. ブランチ名: factory/{factory-name}
5. PRタイトル: [factory] {Factory名} MVP実装
```

詳細は `docs/Factory.md` を参照。

---

## 質問・相談

And Planning（プロジェクトオーナー）に確認してから進める事項:
- アーキテクチャの根本的な変更
- 新しい外部サービスの追加
- `main` ブランチへのマージ
- 商用機能の実装

---

*最終更新: 2026-06-28 / And Planning*
