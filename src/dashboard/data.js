/*
 * And Planning AI OS — ダッシュボード設定データ
 *
 * ここを書き換えるだけで、表示される社員・部署・数字が変わります。
 * 数字は今はサンプルです。後で各サービスのAPIやスプレッドシートとつなぐ想定です。
 *
 * status: "working"(作業中) / "done"(できた!) / "review"(確認中) / "idle"(待機)
 */
window.AIOS_DATA = {
  company: {
    name: "And Planning",
    title: "AIカンパニーの1日",
    tagline: "社長はひとり。働くのはAIの社員たち。",
  },

  // 人間(最終決定者)
  owner: { name: "社長", role: "最終決定", note: "決めるのは社長だけ" },

  // AI CEO(全体の指揮)
  ceo: { name: "ソラ", role: "AI CEO", engine: "Claude Code", message: "みんなを見守り中" },

  // 相互レビュー担当(別エンジン)
  reviewer: {
    name: "ルカ",
    role: "レビュー役",
    engine: "Codex",
    members: [
      { name: "レン", role: "デザイン" },
      { name: "アオ", role: "コード" },
      { name: "シオン", role: "事実確認" },
      { name: "ジン", role: "独立監査" },
    ],
  },

  // つないでいる道具(MCP / コネクタ)
  tools: ["Gmail", "Calendar", "Sheets", "Canva", "GitHub", "YouTube"],

  // SNSの数字(value は実数。万単位は自動で表示)
  sns: [
    { key: "youtube", label: "YouTube", value: 407000, sub: "再生/累計", color: "#ff3b30" },
    { key: "threads", label: "Threads", value: 917000, sub: "閲覧/30日", color: "#8e8e93" },
    { key: "instagram", label: "Instagram", value: 393000, sub: "再生/累計", color: "#e1306c" },
    { key: "x", label: "X", value: 269000, sub: "表示/累計", color: "#5e5ce6" },
    { key: "tiktok", label: "TikTok", value: 59000, sub: "再生/累計", color: "#00c7be" },
  ],

  // 事業の数字
  business: {
    revenue: 1280000, // 今月の売上(円)
    target: 2000000, // 今月の目標(円)
    leads: 24, // 新しい問い合わせ
    projects: 7, // 進行中の案件
  },

  // 部署(Factory)と、そこで働くAI社員
  departments: [
    {
      id: "marketing",
      name: "営業・マーケ",
      factory: "Marketing Factory",
      color: "#ff8a8a",
      lead: { name: "ハル", role: "営業", status: "working" },
      members: [
        { name: "ケーラ", role: "広告運用", status: "idle" },
        { name: "マキ", role: "顧客対応", status: "working" },
      ],
    },
    {
      id: "writing",
      name: "発信・文章",
      factory: "Writing Factory",
      color: "#ffb86b",
      lead: { name: "ミナ", role: "コンテンツ", status: "done" },
      members: [
        { name: "コト", role: "ショート台本", status: "done" },
        { name: "ツヅリ", role: "Threads", status: "working" },
      ],
    },
    {
      id: "research",
      name: "調査",
      factory: "Research Factory",
      color: "#6cc4ff",
      lead: { name: "リク", role: "リサーチ", status: "done" },
      members: [{ name: "サグル", role: "トレンド収集", status: "idle" }],
    },
    {
      id: "creator",
      name: "開発",
      factory: "Creator Factory",
      color: "#b39dff",
      lead: { name: "ケイ", role: "開発", status: "working" },
      members: [
        { name: "ツクル", role: "自動化", status: "working" },
        { name: "ナオス", role: "保守", status: "idle" },
      ],
    },
    {
      id: "video",
      name: "動画",
      factory: "Video Factory",
      color: "#6be3b0",
      lead: { name: "ノア", role: "動画制作", status: "review" },
      members: [
        { name: "キリ", role: "切り抜き", status: "done" },
        { name: "サムネ", role: "サムネ", status: "working" },
        { name: "テロ", role: "字幕", status: "idle" },
      ],
    },
    {
      id: "fortune",
      name: "占い",
      factory: "Fortune Factory",
      color: "#ffd84d",
      lead: { name: "ユイ", role: "占い", status: "working" },
      members: [
        { name: "ホシ", role: "星読み", status: "done" },
        { name: "カード", role: "タロット", status: "idle" },
      ],
    },
    {
      id: "ops",
      name: "運営・財務",
      factory: "Back Office",
      color: "#ffa06b",
      lead: { name: "ツムギ", role: "経理", status: "idle" },
      members: [
        { name: "カズ", role: "売上集計", status: "done" },
        { name: "ヒショ", role: "秘書", status: "working" },
      ],
    },
  ],
};
