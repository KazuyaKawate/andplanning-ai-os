# Brand.md
# And Planning — ブランドガイドライン

> このファイルはWebsite・資料・SNS・プレゼンなど
> すべてのビジュアル制作物に適用されます。

---

## ブランドアイデンティティ

### ブランド名
- **正式名称:** And Planning
- **略称:** AP（ロゴのみで使用）
- **プロダクト名:** And Planning AI OS
- **表記ルール:** 「AND PLANNING」ではなく「And Planning」

### タグライン
```
メイン:  Build Your AI Factory. Operate Your Future.
サブ:    AIが考え、AIが動き、AIが成果を積み重ねる。
英語:    Your AI. Your Factory. Your Future.
```

### ブランドの性格（トーン）
| 属性 | 説明 |
|------|------|
| 未来的 | 最先端だが難解でない |
| 信頼性 | 技術的な確かさを感じさせる |
| ミニマル | 余計な装飾をしない |
| 知性的 | 説明なしでも「すごい」と感じさせる |
| 日本的 | 精密さ・丁寧さ・誠実さ |

---

## カラーシステム

### プライマリカラー

```
Deep Space Navy   #030712
  用途: Hero背景、最も暗い背景
  意味: 宇宙・無限の可能性

Navy              #0F172A
  用途: セクション背景、カード背景
  意味: 深さ・信頼性

Navy Light        #1E293B
  用途: カード・枠・区切り
  意味: 構造・秩序
```

### アクセントカラー

```
Blue              #2563EB
  用途: プライマリボタン、リンク、強調
  意味: テクノロジー・革新

Blue Bright       #3B82F6
  用途: ホバー状態、ハイライト
  意味: エネルギー・活動

Cyan              #06B6D4
  用途: キーワード強調、アイコン、グラデーション
  意味: 知性・精度・AI

Cyan Glow         #22D3EE
  用途: グロー効果、アニメーション
  意味: 光・未来
```

### ニュートラルカラー

```
White             #FFFFFF
  用途: 見出し、白背景セクション、ボタンテキスト

Gray 100          #F1F5F9
  用途: ライトセクション背景

Gray 400          #94A3B8
  用途: 本文・説明テキスト、プレースホルダー

Gray 600          #475569
  用途: サブテキスト（ダーク背景上）
```

### グラデーション

```css
/* Hero グラデーション */
background: linear-gradient(135deg, #030712 0%, #0F172A 50%, #1E293B 100%);

/* アクセントグラデーション */
background: linear-gradient(90deg, #2563EB 0%, #06B6D4 100%);

/* グローエフェクト */
box-shadow: 0 0 40px rgba(6, 182, 212, 0.3);
```

---

## タイポグラフィ

### フォントファミリー

```css
/* 英語見出し */
font-family: 'Inter', sans-serif;

/* 日本語 + 英語混在 */
font-family: 'Noto Sans JP', 'Inter', sans-serif;

/* コード・技術表現 */
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

### フォントサイズ（デスクトップ）

```
Hero見出し (H1):  72px / font-weight: 700
ページ見出し (H2): 48px / font-weight: 700
セクション (H3):   32px / font-weight: 600
カード見出し (H4): 24px / font-weight: 600
本文大:            18px / font-weight: 400
本文標準:          16px / font-weight: 400
キャプション:      14px / font-weight: 400
ラベル:            12px / font-weight: 500 / letter-spacing: 0.1em
```

### フォントサイズ（モバイル）

```
Hero見出し (H1):  40px
ページ見出し (H2): 32px
セクション (H3):   24px
本文標準:          16px
```

---

## スペーシングシステム

```css
/* 8px グリッドシステム */
--space-1:   8px
--space-2:  16px
--space-3:  24px
--space-4:  32px
--space-5:  48px
--space-6:  64px
--space-7:  96px
--space-8: 128px
--space-9: 192px
```

**セクション間の余白:** 最低 `--space-8` (128px) 以上

---

## UIコンポーネント

### ボタン

```
プライマリ:
  背景: #2563EB → ホバー: #3B82F6
  文字: #FFFFFF
  パディング: 16px 32px
  角丸: 8px
  
セカンダリ:
  背景: 透明
  枠: 1px solid #2563EB
  文字: #2563EB
  パディング: 14px 30px

シアンアクセント:
  背景: linear-gradient(90deg, #2563EB, #06B6D4)
  文字: #FFFFFF
```

### カード

```
背景: #1E293B
枠: 1px solid rgba(255,255,255,0.1)
角丸: 16px
パディング: 32px
ホバー時の枠: 1px solid #06B6D4
ホバー時のシャドウ: 0 0 30px rgba(6,182,212,0.2)
```

---

## ロゴについて

### 現在（プレースホルダー）
- テキストロゴ: 「And Planning」
- フォント: Inter Bold
- カラー: White (#FFFFFF)

### 将来のロゴ要件
- SVGフォーマットで提供
- White版・Navy版の2種類を用意
- 最小サイズ: 120px幅
- ロゴ周囲のクリアスペース: ロゴ高さの50%以上

### ロゴの差し替え方法
```html
<!-- website/assets/images/logo/ に以下を配置 -->
logo.svg         ← カラー版
logo-white.svg   ← 白抜き版
logo-navy.svg    ← ネイビー版
```

---

## 避けるべき表現

```
NG: 「最強のAI」「完璧な自動化」（過度な誇張）
NG: 「簡単にできる」（過度な単純化）
NG: 「AIが全部やってくれる」（人間の関与を隠す）

OK: 「AIと一緒に作業効率を10倍に」
OK: 「Workflowで繰り返し作業を自動化」
OK: 「人間の承認のもと、AIが実行する」
```

---

*And Planning — Build Your AI Factory. Operate Your Future.*
