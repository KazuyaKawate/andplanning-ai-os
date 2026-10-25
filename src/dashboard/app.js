(function () {
  "use strict";

  const D = window.AIOS_DATA;
  const $ = (sel) => document.querySelector(sel);

  const STATUS_LABEL = { working: "作業中・", done: "できた！", review: "確認中", idle: "待機" };
  const SIM_INTERVAL_MS = 2600;

  // ---------- 小さな道具 ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function hash(str) {
    let h = 0;
    for (const ch of str) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return h;
  }

  function man(n) {
    if (n >= 10000) return { v: (n / 10000).toFixed(1), u: "万" };
    return { v: n.toLocaleString("ja-JP"), u: "" };
  }

  function yen(n) {
    return "¥" + n.toLocaleString("ja-JP");
  }

  function hhmm(d) {
    return d.toTimeString().slice(0, 5);
  }

  // 名前から決まる、ゆるい顔のアイコン
  function avatar(name, bg, opts = {}) {
    const h = hash(name);
    const hair = opts.crown ? "crown" : ["none", "tuft", "cap", "bangs", "antenna"][h % 5];
    const mouth = ["M42 60 Q50 67 58 60", "M43 61 Q50 64 57 61", "M44 59 Q50 66 56 59"][h % 3];
    const eyeY = 50 + (h % 3);
    const extras = {
      none: "",
      tuft: '<path d="M50 28 q-6 -10 2 -12 q-2 6 4 8" fill="none" stroke="#1d1d1f" stroke-width="2.5" stroke-linecap="round"/>',
      cap: '<path d="M30 44 Q50 18 70 44 Z" fill="#1d1d1f"/><path d="M62 42 h14" stroke="#1d1d1f" stroke-width="4" stroke-linecap="round"/>',
      bangs: '<path d="M30 46 Q34 26 50 26 Q66 26 70 46 Q60 38 50 40 Q40 38 30 46Z" fill="#3a2f2a"/>',
      antenna: '<path d="M50 28 V18" stroke="#1d1d1f" stroke-width="2.5"/><circle cx="50" cy="16" r="4" fill="#ff5fa2" stroke="#1d1d1f" stroke-width="2"/>',
      crown: '<path d="M36 30 L40 16 L46 26 L50 12 L54 26 L60 16 L64 30 Z" fill="#ffd84d" stroke="#1d1d1f" stroke-width="2.5" stroke-linejoin="round"/>',
    }[hair];
    const big = opts.big
      ? '<path d="M26 82 Q50 66 74 82 L74 100 L26 100Z" fill="#fff" stroke="#1d1d1f" stroke-width="2.5"/>'
      : "";
    return (
      `<svg class="avatar" viewBox="0 0 100 100" role="img" aria-label="${esc(name)}">` +
      `<circle cx="50" cy="50" r="50" fill="${bg}"/>` +
      big +
      `<circle cx="50" cy="52" r="22" fill="#fff" stroke="#1d1d1f" stroke-width="2.5"/>` +
      extras +
      `<circle cx="42" cy="${eyeY}" r="2.6" fill="#1d1d1f"/><circle cx="58" cy="${eyeY}" r="2.6" fill="#1d1d1f"/>` +
      `<circle cx="37" cy="58" r="3" fill="#ffb3c7" opacity=".8"/><circle cx="63" cy="58" r="3" fill="#ffb3c7" opacity=".8"/>` +
      `<path d="${mouth}" fill="none" stroke="#1d1d1f" stroke-width="2.2" stroke-linecap="round"/>` +
      `</svg>`
    );
  }

  // ---------- 状態 ----------
  const state = {
    paused: false,
    done: 18,
    posts: 3,
    hourly: Array.from({ length: 24 }, (_, i) => Math.round(2 + 4 * Math.sin(i / 3) ** 2 + (hash("h" + i) % 4))),
    log: [],
  };

  // 全AI社員の一覧(シミュレーション用)
  const staff = [];
  D.departments.forEach((dept) => {
    staff.push({ person: dept.lead, dept, isLead: true });
    dept.members.forEach((m) => staff.push({ person: m, dept, isLead: false }));
  });

  // ---------- 描画 ----------
  function renderStatic() {
    $("#title").textContent = D.company.title;
    $("#tagline").textContent = D.company.tagline;
    document.title = `${D.company.name} AI OS`;

    // SNS
    const total = D.sns.reduce((s, x) => s + x.value, 0);
    const t = man(total);
    $("#sns-total").textContent = t.v + t.u;
    $("#sns").innerHTML = D.sns
      .map((s) => {
        const m = man(s.value);
        return (
          `<div class="sns-card"><div class="label"><i style="background:${s.color}"></i>${esc(s.label)}</div>` +
          `<strong>${m.v}<small>${m.u}</small></strong><div class="sub">${esc(s.sub)}</div></div>`
        );
      })
      .join("");

    // 事業
    const b = D.business;
    const pct = Math.min(100, Math.round((b.revenue / b.target) * 100));
    $("#biz").innerHTML =
      `<div class="biz-card"><small>売上</small><strong>${yen(b.revenue)}</strong>` +
      `<div class="meter"><i style="width:${pct}%"></i></div><div class="meter-label">目標 ${yen(b.target)} の ${pct}%</div></div>` +
      `<div class="biz-card"><small>新しい問い合わせ</small><strong>${b.leads}<small>件</small></strong></div>` +
      `<div class="biz-card"><small>進行中の案件</small><strong>${b.projects}<small>件</small></strong></div>`;

    $("#tools").innerHTML = D.tools.map((x) => `<span class="tool"><i></i>${esc(x)}</span>`).join("");

    // 社長・CEO・レビュー役
    $("#owner").innerHTML =
      avatar(D.owner.name, "#fff", { big: true }) + `<h3>${esc(D.owner.name)}</h3><p>${esc(D.owner.note)}</p>`;
    $("#ceo").innerHTML =
      `<div class="bubble">${esc(D.ceo.message)}</div>` +
      avatar(D.ceo.name, "#e9ecff", { crown: true }) +
      `<h3>${esc(D.ceo.name)}</h3><p>${esc(D.ceo.role)}(${esc(D.ceo.engine)})</p>`;
    const r = D.reviewer;
    $("#reviewer").innerHTML =
      avatar(r.name, "#dff4ff") + `<h3>${esc(r.name)}</h3><p>${esc(r.role)}(${esc(r.engine)})</p>`;
    $("#review-members").innerHTML = r.members
      .map((m) => `<div class="rm" data-rm>${esc(m.name)} <small>${esc(m.role)}</small>${avatar(m.name, "#f2f2f5")}</div>`)
      .join("");

    // 部署レーン
    $("#lanes").innerHTML = D.departments
      .map(
        (d) =>
          `<div class="lane" id="lane-${d.id}" style="--c:${d.color}">` +
          `<span class="lane-tag">${esc(d.name)}<b data-count></b></span>` +
          `<span class="badge" data-badge></span>` +
          `<div class="lead">${avatar(d.lead.name, "#fff")}<div><h4>${esc(d.lead.name)}</h4><p>${esc(d.lead.role)} · ${esc(d.factory)}</p></div></div>` +
          `<div class="members">${d.members
            .map((m, i) => `<div class="member" data-i="${i}">${avatar(m.name, "#fff")}<i class="dot"></i><span>${esc(m.role)}</span></div>`)
            .join("")}</div>` +
          `</div>`
      )
      .join("");
  }

  function renderDynamic() {
    let working = 0;
    D.departments.forEach((d) => {
      const lane = document.getElementById("lane-" + d.id);
      const badge = lane.querySelector("[data-badge]");
      badge.className = "badge " + d.lead.status;
      badge.textContent = STATUS_LABEL[d.lead.status];
      lane.querySelectorAll(".member").forEach((el) => {
        const m = d.members[+el.dataset.i];
        el.querySelector(".dot").className = "dot " + m.status;
        el.title = `${m.name}(${m.role}):${STATUS_LABEL[m.status]}`;
      });
      const people = [d.lead, ...d.members];
      const active = people.filter((p) => p.status === "working").length;
      working += active;
      lane.querySelector("[data-count]").textContent = `${active}/${people.length}`;
    });

    $("#kpi-done").textContent = state.done;
    $("#kpi-working").textContent = working;
    $("#kpi-posts").textContent = state.posts;

    // 24時間のスパークライン
    const max = Math.max(...state.hourly);
    const pts = state.hourly.map((v, i) => `${(i / 23) * 120},${28 - (v / max) * 24 - 2}`).join(" ");
    $("#spark").innerHTML = `<polyline points="${pts}"/>`;
    $("#spark-total").textContent = state.hourly.reduce((a, b) => a + b, 0);

    $("#ticker").innerHTML = state.log
      .map((l) => `<li><time>${l.time}</time>${esc(l.text)}</li>`)
      .join("");

    drawWires();
  }

  // ---------- 線 ----------
  function center(el, root, side) {
    const r = el.getBoundingClientRect();
    const x = side === "left" ? r.left : side === "right" ? r.right : r.left + r.width / 2;
    const y = side === "top" ? r.top : side === "bottom" ? r.bottom : r.top + r.height / 2;
    return { x: x - root.left, y: y - root.top };
  }

  function curve(a, b) {
    const mx = (a.x + b.x) / 2;
    return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
  }

  function drawWires() {
    const org = $("#org");
    const svg = $("#wires");
    if (getComputedStyle(svg).display === "none") return;
    const root = org.getBoundingClientRect();
    const ceoAv = $("#ceo .avatar");
    const revAv = $("#reviewer .avatar");
    const ownerAv = $("#owner .avatar");
    const paths = [];

    paths.push(`<path d="${curve(center(ownerAv, root, "right"), center(ceoAv, root, "left"))}"/>`);
    const a = center(ceoAv, root, "bottom");
    const b = center(revAv, root, "top");
    paths.push(`<path class="review" d="M${a.x},${a.y} L${b.x},${b.y}"/>`);

    D.departments.forEach((d) => {
      const lane = document.getElementById("lane-" + d.id);
      const busy = [d.lead, ...d.members].some((p) => p.status === "working");
      const from = center(ceoAv, root, "right");
      const to = center(lane, root, "left");
      const style = busy ? ` style="stroke:${d.color}"` : "";
      paths.push(`<path class="${busy ? "flow" : ""}"${style} d="${curve(from, to)}"/>`);
    });

    document.querySelectorAll("[data-rm]").forEach((el) => {
      const from = center(el.querySelector(".avatar"), root, "right");
      const to = center(revAv, root, "left");
      paths.push(`<path d="${curve(from, to)}"/>`);
    });

    svg.innerHTML = paths.join("");
  }

  // ---------- 動き(サンプルのシミュレーション) ----------
  const NEXT = { idle: "working", working: "done", done: "review", review: "idle" };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function addLog(text) {
    state.log.unshift({ time: hhmm(new Date()), text });
    state.log = state.log.slice(0, 14);
  }

  function tick() {
    if (state.paused) return;
    const s = pick(staff);
    const before = s.person.status;
    const after = (s.person.status = NEXT[before] || "working");

    const ceo = D.ceo.name;
    if (after === "working") {
      addLog(`${ceo} → ${s.person.name} 依頼`);
    } else if (after === "done") {
      state.done += 1;
      state.hourly[23] += 1;
      if (["writing", "video"].includes(s.dept.id)) state.posts += 1;
      addLog(`${s.person.name} → ${ceo} 納品`);
      bump("#kpi-done");
    } else if (after === "review") {
      addLog(`${ceo} → ${D.reviewer.name} 確認お願い(${s.person.name}の仕事)`);
    }

    renderDynamic();

    const lane = document.getElementById("lane-" + s.dept.id);
    const target = s.isLead
      ? lane.querySelector("[data-badge]")
      : lane.querySelector(`.member[data-i="${s.dept.members.indexOf(s.person)}"]`);
    if (target) {
      target.classList.remove("pop");
      void target.offsetWidth;
      target.classList.add("pop");
    }
  }

  function bump(sel) {
    const el = $(sel).parentElement;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  // ---------- 操作 ----------
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $("#theme").textContent = theme === "night" ? "☀ Day" : "☾ Night";
    try {
      localStorage.setItem("aios-theme", theme);
    } catch (e) {
      /* 保存できなくても表示は続ける */
    }
    requestAnimationFrame(drawWires);
  }

  function init() {
    renderStatic();

    let saved = null;
    try {
      saved = localStorage.getItem("aios-theme");
    } catch (e) {
      /* noop */
    }
    setTheme(saved || "night");

    const now = new Date();
    ["ケイ → ソラ 返事", "ソラ → リク 依頼", "ミナ → ソラ 納品", "ソラ → ルカ 確認お願い"].forEach((t, i) => {
      state.log.push({ time: hhmm(new Date(now - (i + 1) * 4 * 60000)), text: t });
    });

    renderDynamic();

    const clock = () => ($("#clock").textContent = new Date().toTimeString().slice(0, 8));
    clock();
    setInterval(clock, 1000);
    setInterval(tick, SIM_INTERVAL_MS);

    $("#pause").addEventListener("click", () => {
      state.paused = !state.paused;
      document.body.classList.toggle("paused", state.paused);
      $("#pause").textContent = state.paused ? "▶ 動かす" : "⏸ 動きを止める";
    });
    $("#theme").addEventListener("click", () =>
      setTheme(document.documentElement.dataset.theme === "night" ? "day" : "night")
    );

    window.addEventListener("resize", drawWires);
    if (document.fonts) document.fonts.ready.then(drawWires);
  }

  init();
})();
