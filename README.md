# And Planning AI Operating System

> **Build Your AI Factory. Operate Your Future.**

[![Status](https://img.shields.io/badge/status-active_development-blue)](.)
[![Version](https://img.shields.io/badge/version-0.1.0-cyan)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-Proprietary-navy)](LICENSE)

---

## プロジェクト概要

**And Planning** は、複数のAIが協調して動作する **日本初のAI Operating System** を開発しています。

AIが考え、AIが動き、AIが成果を積み重ねる。  
あなたは方向を決めるだけでいい。

---

## システム構成

```
外部入力（ユーザー / スケジューラー）
        ↓
    [ Inbox ]          タスクを受け取る
        ↓
    [ AI Router ]      Claude / ChatGPT / Gemini に振り分ける
        ↓
  [ Orchestrator ]     複数Workflowを並列管理
        ↓
 [ Workflow Engine ]   ステップを順序通り実行
        ↓
   [ Factories ]       成果物を生成
        ↓
  [ Memory / Snapshot ] 結果を記憶・保存
        ↓
   [ Dashboard ]       状態を可視化
```

---

## Factory 一覧

| Factory | 役割 |
|---------|------|
| Creator Factory | クリエイターコンテンツ生成 |
| Writing Factory | 文章・記事の自動生成 |
| Video Factory | 動画制作支援 |
| Research Factory | 情報収集・分析 |
| Marketing Factory | マーケティング自動化 |
| Fortune Factory | 占い・予測コンテンツ |

---

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | システム全体の設計書 |
| [ROADMAP.md](ROADMAP.md) | 開発ロードマップ |
| [CONTRIBUTING.md](CONTRIBUTING.md) | AI・人間の開発ルール |
| [CHANGELOG.md](CHANGELOG.md) | 更新履歴 |
| [docs/Vision.md](docs/Vision.md) | ビジョン・ミッション |
| [docs/Concept.md](docs/Concept.md) | AI OSのコンセプト |
| [docs/Brand.md](docs/Brand.md) | ブランドガイドライン |
| [docs/Factory.md](docs/Factory.md) | Factory設計仕様 |
| [docs/Workflow.md](docs/Workflow.md) | Workflow Engine仕様 |

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| バックエンド | Python 3.11+ |
| AI統合 | Anthropic / OpenAI / Google AI SDK |
| Dashboard | Streamlit |
| Website | HTML/CSS/JS → Next.js（将来） |
| データ保存 | JSON（ローカルファイル） |

---

## ディレクトリ構成

```
andplanning-ai-os/
├── README.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── docs/               # 詳細ドキュメント
├── src/                # バックエンド実装
├── config/             # 設定ファイル
├── factories/          # Factory定義
└── website/            # 公式ホームページ
```

---

## ライセンス

Copyright © 2026 And Planning. All Rights Reserved.  
詳細は [LICENSE](LICENSE) を参照してください。
