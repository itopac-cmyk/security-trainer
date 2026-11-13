/* Security Trainer – Oberfläche, Routing und Lernlogik */
(() => {
  "use strict";

  const USER = "Isa";
  const $app = () => document.getElementById("app");
  const DECKS = CONTENT.decks;
  const deckById = (id) => DECKS.find((d) => d.id === id);
  const modById = (id) => CONTENT.modules.find((m) => m.id === id);
  const scById = (id) => CONTENT.scenarios.find((s) => s.id === id);
  const EXAM_MODES = {
    quick: { label: "Schnelltest", n: 10, min: 6 },
    full: { label: "Vollprüfung", n: 20, min: 12 },
  };
  const PASS = 80;

  const session = { filter: "all", train: null, mod: null, sc: null, exam: null, examCfg: { mode: "quick", deck: "all" }, fix: null, timer: null, hideInstall: false };

  /* ---------- Helfer ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function formatDate(d) {
    return d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function greeting() {
    const h = new Date().getHours();
    if (h < 11) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  }
  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function isIOSSafari() {
    const ua = navigator.userAgent;
    return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  }
  function pctBar(pct, cls) {
    const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
    return `<div class="bar ${cls || ""}"><i style="width:${p}%"></i></div>`;
  }
  function avg(arr) { return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(arr, rand) {
    const a = arr.slice(), r = rand || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
  function stopTimer() { if (session.timer) { clearInterval(session.timer); session.timer = null; } }
  const REIFE = { mature: ["etabliert", "teal"], trending: ["Trend", "gold"], emerging: ["aufkommend", "violet"] };
  function reifeBadge(c) { const r = c && REIFE[c.reife]; return r ? `<span class="badge ${r[1]}" title="Reifegrad">${r[0]}</span>` : ""; }
  function typeBadge(t, c) { return (t === "konzept" ? `<span class="badge gold">Konzept</span>` : `<span class="badge teal">Begriff</span>`) + (c && c.cmp ? `<span class="badge violet">Vergleich</span>` : "") + (c && c.prio === 1 ? `<span class="badge muted-badge" title="Prüfungskritisch">★ Kern</span>` : ""); }
  function cardBack(c) {
    return `<p class="short">${esc(c.short)}</p>
      <p>${esc(c.explain)}</p>
      ${c.points && c.points.length ? `<ul class="points">${c.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
      ${c.example ? `<div class="example"><span class="lbl">Beispiel</span>${esc(c.example)}</div>` : ""}
      ${c.pitfall ? `<div class="pitfall"><span class="lbl">Prüfungsfalle</span>${esc(c.pitfall)}</div>` : ""}
      ${c.merker ? `<div class="merker"><span class="lbl">Merke</span>${esc(c.merker)}</div>` : ""}`;
  }
  function relCards(c) { return (c.rel || []).map(([dId, cId]) => { const d = deckById(dId); const x = d && d.cards.find((y) => y.id === cId); return x ? [d, x] : null; }).filter(Boolean); }
  function frontHtml(c) { return `<h2 class="flash-front">${esc(c.front)}</h2>${c.de ? `<p class="flash-de">${esc(c.de)}</p>` : ""}`; }
  function scrollTop() { window.scrollTo(0, 0); }

  function topbar(title, opts) {
    const o = opts || {};
    return `<header class="topbar">
      ${o.noback ? `<span class="icon-btn ghost"></span>` : `<button type="button" class="icon-btn" data-go="${esc(o.back || "#/")}" aria-label="Zurück">‹</button>`}
      <div class="tb-title"><h1>${esc(title)}</h1>${o.sub ? `<p>${esc(o.sub)}</p>` : ""}</div>
      ${o.right || `<span class="icon-btn ghost"></span>`}
    </header>`;
  }

  function tabbar(active) {
    const dot = Store.get().mistakes.length > 0;
    const tabs = [
      ["home", "#/", "🏠", "Start"],
      ["decks", "#/decks", "🗂️", "Decks"],
      ["concepts", "#/concepts", "🧩", "Konzepte"],
      ["scenarios", "#/scenarios", "🎯", "Szenarien"],
      ["more", "#/more", "☰", "Mehr"],
    ];
    return `<nav class="tabbar">${tabs.map(([k, h, e, l]) => `
      <a href="${h}" class="tab ${active === k ? "active" : ""}"><span class="t-ico">${e}${k === "more" && dot ? `<b class="dot"></b>` : ""}</span><span>${l}</span></a>`).join("")}</nav>`;
  }

  /* ---------- Fortschrittswerte ---------- */
  function totalDue() { return DECKS.reduce((a, d) => a + Store.deckStats(d).due, 0); }
  function modPct(m) {
    const s = Store.get().concepts[m.id];
    if (!s) return 0;
    const done = m.exercises.filter((x) => s.done[x.id]).length;
    return Math.round(done / m.exercises.length * 100);
  }
  function scPct(sc) { const s = Store.get().scenarios[sc.id]; return s ? s.best : 0; }
  function lastExamPct() { const e = Store.get().exams[0]; return e ? e.pct : 0; }
  function deckPctAll() { return avg(DECKS.map((d) => Store.deckStats(d).pct)); }
  function overallProgress() { return avg([deckPctAll(), avg(CONTENT.modules.map(modPct)), avg(CONTENT.scenarios.map(scPct))]); }
  function countType(t) { return DECKS.reduce((a, d) => a + d.cards.filter((c) => c.type === t).length, 0); }

  /* ---------- Sitzungen zusammenstellen ---------- */
  function allCards() {
    const out = [];
    DECKS.forEach((d) => d.cards.forEach((c) => out.push({ deck: d.id, card: c })));
    return out;
  }

  function dueItems(filterFn) {
    const now = Date.now();
    return allCards()
      .filter((x) => (!filterFn || filterFn(x)) && Store.isDue(Store.cardState(x.deck, x.card.id), now))
      .sort((a, b) => Store.cardState(a.deck, a.card.id).due - Store.cardState(b.deck, b.card.id).due);
  }

  const CARD_DECK = {};
  DECKS.forEach((d) => d.cards.forEach((c) => { CARD_DECK[c.id] = d.id; }));
  function cmpReady(c) { return !c.cmp || (c.vs || []).every((id) => Store.cardState(CARD_DECK[id], id)); }
  function prioOrder(list, rand) {
    // gewichtete Reihenfolge: Kernkarten (prio 1) zuerst wahrscheinlicher, Details (prio 3) seltener
    const w = { 1: 6, 2: 3, 3: 1 };
    return list.map((x) => ({ x, k: Math.pow(rand(), 1 / (w[x.card.prio] || 3)) })).sort((a, b) => b.k - a.k).map((o) => o.x);
  }
  function newItems(filterFn, rand) {
    const byDeck = {};
    DECKS.forEach((d) => {
      byDeck[d.id] = prioOrder(d.cards.filter((c) => !Store.cardState(d.id, c.id) && cmpReady(c)).map((c) => ({ deck: d.id, card: c })).filter((x) => !filterFn || filterFn(x)), rand);
    });
    const out = [];
    let added = true;
    const order = shuffle(DECKS.map((d) => d.id), rand);
    while (added) {
      added = false;
      order.forEach((id) => { const x = byDeck[id].shift(); if (x) { out.push(x); added = true; } });
    }
    return out;
  }

  const PRIO_W = { 1: 6, 2: 3, 3: 1 };
  const NEW_SHARE = 0.3;
  function mixSize() { const goal = Store.get().settings.goal || 15; return Math.max(15, Math.min(20, goal)); }
  function mixNewMax() { return Math.floor(mixSize() * NEW_SHARE); }
  function buildMix() {
    // Tagesmix: Wiederholungen nach Fälligkeit und Priorität gewichtet, höchstens 30 % neue Karten
    const size = mixSize();
    const newMax = mixNewMax();
    const rand = rng(hashStr("mix-" + Store.todayKey()));
    const now = Date.now();
    const DAYMS = 86400000;
    const score = (x) => { const cs = Store.cardState(x.deck, x.card.id); return (now - cs.due) / DAYMS + (PRIO_W[x.card.prio] || 3) / 2 + rand() * 0.5; };
    const due = dueItems().map((x) => ({ x, k: score(x) })).sort((a, b) => b.k - a.k).map((o) => o.x).slice(0, size - Math.min(newMax, 2));
    const used = new Set(due.map((x) => x.card.id));
    let review = due.slice();
    if (review.length < size - newMax) {
      // weitere gelernte Karten (niedrigste Box zuerst, Kernkarten bevorzugt) zur Festigung
      const learned = allCards().filter((x) => !used.has(x.card.id) && Store.cardState(x.deck, x.card.id))
        .map((x) => { const cs = Store.cardState(x.deck, x.card.id); return { x, k: cs.box * 2 - (PRIO_W[x.card.prio] || 3) / 3 + rand() }; })
        .sort((a, b) => a.k - b.k).map((o) => o.x);
      while (review.length < size - newMax && learned.length) { const x = learned.shift(); review.push(x); used.add(x.card.id); }
    }
    const fresh = newItems(null, rand).filter((x) => !used.has(x.card.id));
    const begr = fresh.filter((x) => x.card.type === "begriff");
    const konz = fresh.filter((x) => x.card.type === "konzept");
    const picks = [];
    const nNew = Math.min(newMax, size - review.length);
    while (picks.length < nNew && (begr.length || konz.length)) {
      const wantK = picks.filter((x) => x.card.type === "konzept").length < picks.length / 2 + 0.5;
      const src = (wantK && konz.length) || !begr.length ? konz : begr;
      picks.push(src.shift());
    }
    return shuffle(review.concat(picks), rand);
  }

  function buildDueOnly() { return dueItems().slice(0, 30); }

  function buildConceptsOfDay() {
    const rand = rng(hashStr("konz-" + Store.todayKey()));
    const f = (x) => x.card.type === "konzept";
    const due = dueItems(f).slice(0, 6);
    const fresh = newItems(f, rand).slice(0, 10 - due.length);
    let list = due.concat(fresh);
    if (list.length < 10) {
      const ids = new Set(list.map((x) => x.card.id));
      list = list.concat(shuffle(allCards().filter((x) => f(x) && !ids.has(x.card.id)), rand).slice(0, 10 - list.length));
    }
    return shuffle(list, rand);
  }

  function clusterItems(deck, cl) {
    const own = deck.cards.filter((c) => c.cl === cl.id).map((c) => ({ deck: deck.id, card: c }));
    const refs = (cl.refs || []).map(([dId, cId]) => { const d = deckById(dId); const c = d && d.cards.find((x) => x.id === cId); return c ? { deck: dId, card: c } : null; }).filter(Boolean);
    return { own, refs };
  }
  function buildFromItems(items, filter) {
    const pool = items.filter((x) => filter === "all" || x.card.type === filter);
    const now = Date.now();
    const due = pool.filter((x) => Store.isDue(Store.cardState(x.deck, x.card.id), now))
      .sort((a, b) => Store.cardState(a.deck, a.card.id).due - Store.cardState(b.deck, b.card.id).due);
    const fresh = shuffle(pool.filter((x) => !Store.cardState(x.deck, x.card.id)), Math.random);
    let list = due.concat(fresh).slice(0, 20);
    if (!list.length) list = shuffle(pool.slice(), Math.random).sort((a, b) => Store.cardState(a.deck, a.card.id).box - Store.cardState(b.deck, b.card.id).box).slice(0, 15);
    return list;
  }
  function itemStats(items) {
    const now = Date.now();
    let seen = 0, due = 0, sum = 0;
    items.forEach((x) => { const cs = Store.cardState(x.deck, x.card.id); if (!cs) return; seen += 1; if (Store.isDue(cs, now)) due += 1; sum += Math.min(cs.box, 5) / 5; });
    return { seen, due, total: items.length, pct: items.length ? Math.round(sum / items.length * 100) : 0 };
  }

  function buildDeck(deck, filter) {
    const f = (x) => x.deck === deck.id && (filter === "all" || x.card.type === filter);
    const due = dueItems(f);
    const fresh = newItems(f, Math.random);
    let list = due.concat(fresh).slice(0, 20);
    if (!list.length) {
      list = shuffle(deck.cards.filter((c) => filter === "all" || c.type === filter).map((c) => ({ deck: deck.id, card: c })))
        .sort((a, b) => Store.cardState(a.deck, a.card.id).box - Store.cardState(b.deck, b.card.id).box).slice(0, 15);
    }
    return list;
  }

  function startTraining(kind, list, title, back) {
    session.train = { kind, queue: list.slice(), total: list.length, idx: 0, flipped: false, right: 0, wrong: 0, again: new Set(), title, back };
  }

  /* ---------- START ---------- */
  function renderHome() {
    const st = Store.get();
    const goal = st.settings.goal || 15;
    const done = st.daily.count || 0;
    const hidden = isStandalone() || session.hideInstall || localStorage.getItem("sec-trainer-hide-install") === "1";
    const install = !hidden && isIOSSafari() ? `
      <div class="install-hint" id="install-hint">
        <button type="button" id="hide-install" aria-label="Hinweis schließen">✕</button>
        <strong>Zum Home-Bildschirm</strong>
        In Safari auf <b>Teilen</b> tippen und „Zum Home-Bildschirm“ wählen. Danach startet der Trainer wie eine App – auch offline.
      </div>` : "";
    const due = totalDue();
    const mistakes = st.mistakes.length;
    const last = st.lastRoute && st.lastRoute !== "#/" && !/train|run/.test(st.lastRoute) ? st.lastRoute : null;
    const tiles = [
      { href: "#/decks", emoji: "🗂️", bg: "var(--teal-soft)", title: "Decks", text: `${DECKS.length} Decks · ${countType("begriff")} Begriffe · ${countType("konzept")} Konzepte`, pct: deckPctAll() },
      { href: "#/concepts", emoji: "🧩", bg: "var(--gold-soft)", title: "Konzepte", text: `${CONTENT.modules.length} Module mit Übungen`, pct: avg(CONTENT.modules.map(modPct)) },
      { href: "#/scenarios", emoji: "🎯", bg: "#e8eef2", title: "Szenarien", text: `${CONTENT.scenarios.length} Praxisfälle`, pct: avg(CONTENT.scenarios.map(scPct)) },
      { href: "#/exam", emoji: "📋", bg: "#ece8f5", title: "Prüfung", text: `${CONTENT.exam.length} Fragen im Pool`, pct: lastExamPct() },
    ];
    $app().innerHTML = `
      ${topbar("Security Trainer", { noback: true, sub: "CISM · CISSP · CISO · CRA · MVO · OT", right: `<span class="pill-top">${st.streak.current || 0} 🔥</span>` })}
      <div class="page">
        <p class="greet">${greeting()}, ${esc(USER)}</p>
        <p class="date-line">${esc(formatDate(new Date()))}</p>
        ${install}
        <button type="button" class="mix-card" data-act="mix">
          <span class="mix-ico">⚡</span>
          <span class="mix-txt"><strong>Heutiger Tagesmix</strong><span>${due ? plural(due, "fällige Karte", "fällige Karten") + ` + bis zu ${mixNewMax()} neue Begriffe & Konzepte` : `Wiederholung + bis zu ${mixNewMax()} neue Begriffe & Konzepte aus allen Decks`}</span></span>
          <span class="chev">›</span>
        </button>
        <div class="row two">
          <button type="button" class="btn ghost-btn" data-act="due" ${due ? "" : "disabled"}>⏰ Nur fällige${due ? ` (${due})` : ""}</button>
          <button type="button" class="btn ghost-btn" data-act="konz">🧠 Konzepte des Tages</button>
        </div>
        <div class="row two">
          <div class="stat-chip"><span class="emoji">🔥</span><div><span class="lbl">Serie</span><span class="val">${plural(st.streak.current || 0, "Tag", "Tage")}</span></div></div>
          <div class="stat-chip"><span class="emoji">🏆</span><div><span class="lbl">Beste Serie</span><span class="val">${plural(st.streak.best || 0, "Tag", "Tage")}</span></div></div>
        </div>
        <div class="card goal-card">
          <div class="goal-head"><strong>Tagesziel</strong><span>${done} / ${goal}</span></div>
          ${pctBar(done / goal * 100, done >= goal ? "gold" : "")}
          ${done >= goal ? `<p class="small ok-text">Tagesziel erreicht – stark!</p>` : ""}
        </div>
        <div class="grid-2">
          ${tiles.map((t) => `
            <a class="tile" href="${t.href}">
              <div class="tile-emoji" style="background:${t.bg}">${t.emoji}</div>
              <h2>${t.title}</h2>
              <p>${esc(t.text)}</p>
              ${pctBar(t.pct)}
            </a>`).join("")}
        </div>
        ${mistakes ? `<a class="list-row card" href="#/mistakes">
          <div class="avatar" style="background:var(--danger-soft)">🐞</div>
          <div class="meta"><h3>Fehlerbox</h3><p>${plural(mistakes, "Eintrag", "Einträge")} zum Wiederholen</p></div>
          <span class="badge danger">${mistakes}</span><span class="chev">›</span></a>` : ""}
        ${last ? `<a class="list-row card" href="${esc(last)}">
          <div class="avatar" style="background:#e8eef2">▶️</div>
          <div class="meta"><h3>Weiterlernen</h3><p>Dort weitermachen, wo du aufgehört hast</p></div>
          <span class="chev">›</span></a>` : ""}
        <p class="footer-note">Gesamtfortschritt ${overallProgress()}&nbsp;%</p>
      </div>
      ${tabbar("home")}`;

    const hide = document.getElementById("hide-install");
    if (hide) hide.addEventListener("click", () => {
      localStorage.setItem("sec-trainer-hide-install", "1");
      session.hideInstall = true;
      const el = document.getElementById("install-hint");
      if (el) el.remove();
    });
    $app().querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
      const a = b.getAttribute("data-act");
      if (a === "mix") startTraining("mix", buildMix(), "Heutiger Tagesmix", "#/");
      if (a === "due") startTraining("due", buildDueOnly(), "Nur fällige", "#/");
      if (a === "konz") startTraining("konz", buildConceptsOfDay(), "Konzepte des Tages", "#/");
      location.hash = "#/train";
    }));
  }

  /* ---------- DECKS ---------- */
  function renderDecks() {
    const f = session.filter;
    const pills = [["all", "Alle"], ["begriff", "Nur Begriffe"], ["konzept", "Nur Konzepte"]];
    $app().innerHTML = `
      ${topbar("Decks", { noback: true, sub: `${countType("begriff")} Begriffe · ${countType("konzept")} Konzepte` })}
      <div class="page">
        <input type="search" class="search" id="q" placeholder="🔍 Begriff in allen Decks suchen …" value="${esc(session.q || "")}" autocomplete="off" aria-label="Suche">
        <div id="q-res"></div>
        <div class="seg">${pills.map(([k, l]) => `<button type="button" class="${f === k ? "on" : ""}" data-filter="${k}">${l}</button>`).join("")}</div>
        ${DECKS.map((d) => {
          const s = Store.deckStats(d);
          const b = d.cards.filter((c) => c.type === "begriff").length;
          const k = d.cards.length - b;
          const due = f === "all" ? s.due : d.cards.filter((c) => c.type === f && Store.isDue(Store.cardState(d.id, c.id))).length;
          return `<a class="deck-card card" href="#/decks/${d.id}">
            <div class="deck-head">
              <div class="avatar" style="background:${esc(d.color)}22">${d.emoji}</div>
              <div class="meta"><h3>${esc(d.title)}</h3><p>${esc(d.blurb)}</p></div>
              ${due ? `<span class="badge danger">${due} fällig</span>` : ""}
            </div>
            <div class="deck-counts"><span class="badge teal">${b} Begriffe</span><span class="badge gold">${k} Konzepte</span><span class="badge muted-badge">${(d.clusters || []).length} Cluster</span><span class="small muted">${s.seen}/${s.total} gesehen</span></div>
            ${pctBar(s.pct)}
          </a>`;
        }).join("")}
      </div>
      ${tabbar("decks")}`;
    $app().querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => { session.filter = b.getAttribute("data-filter"); renderDecks(); }));
    const q = document.getElementById("q");
    const upd = () => { session.q = q.value; document.getElementById("q-res").innerHTML = searchResults(q.value); };
    q.addEventListener("input", upd);
    if (session.q) upd();
  }

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function searchResults(raw) {
    const q = norm(raw).trim();
    if (q.length < 2) return "";
    const hits = [];
    DECKS.forEach((d) => d.cards.forEach((c) => {
      const front = norm(c.front), aka = norm((c.aka || []).concat(c.de || [], c.cov || []).join(" | "));
      const ws = (t) => t.startsWith(q) || t.includes(" " + q) || t.includes("(" + q) || t.includes("-" + q);
      const score = front.includes(q) ? (front.startsWith(q) ? 4 : ws(front) ? 3 : 2) : aka.includes(q) ? (ws(aka) ? 2.5 : 1.5) : norm(c.short + " " + c.tag).includes(q) ? 1 : 0;
      if (score) hits.push({ d, c, score });
    }));
    hits.sort((a, b) => b.score - a.score || a.c.front.localeCompare(b.c.front, "de"));
    if (!hits.length) return `<p class="small muted">Keine Treffer.</p>`;
    return `<div class="q-list">${hits.slice(0, 30).map(({ d, c }) => `<a class="list-row card q-hit" href="#/card/${d.id}/${c.id}">
      <div class="avatar" style="background:${esc(d.color)}22">${d.emoji}</div>
      <div class="meta"><h3>${esc(c.front)}</h3><p>${esc(c.tag)}${c.aka && c.aka.length ? " · " + esc(c.aka.slice(0, 2).join(", ")) : ""}</p></div><span class="chev">›</span></a>`).join("")}
      ${hits.length > 30 ? `<p class="small muted">${hits.length - 30} weitere Treffer – Suche verfeinern.</p>` : ""}</div>`;
  }

  function renderDeck(id) {
    const d = deckById(id);
    if (!d) { location.hash = "#/decks"; return; }
    const f = session.filter;
    const pills = [["all", "Alle"], ["begriff", "Begriffe"], ["konzept", "Konzepte"]];
    const s = Store.deckStats(d);
    const b = d.cards.filter((c) => c.type === "begriff").length;
    $app().innerHTML = `
      ${topbar(d.title, { back: "#/decks", sub: `${b} Begriffe · ${d.cards.length - b} Konzepte · ${(d.clusters || []).length} Cluster` })}
      <div class="page">
        <p class="small">${esc(d.blurb)}</p>
        ${pctBar(s.pct)}
        <button type="button" class="btn primary wide" data-go="#/decks/${d.id}/train">▶ Ganzes Deck trainieren${s.due ? ` (${s.due} fällig)` : ""}</button>
        <div class="seg">${pills.map(([k, l]) => `<button type="button" class="${f === k ? "on" : ""}" data-filter="${k}">${l}</button>`).join("")}</div>
        <h2 class="sec-h">Cluster</h2>
        ${(d.clusters || []).map((cl) => {
          const { own, refs } = clusterItems(d, cl);
          const ownF = own.filter((x) => f === "all" || x.card.type === f);
          if (!ownF.length) return "";
          const st = itemStats(own);
          const nb = own.filter((x) => x.card.type === "begriff").length;
          return `<a class="list-row card cl-row" href="#/decks/${d.id}/c/${cl.id}">
            <div class="meta"><h3>${esc(cl.title)}</h3>${cl.sub ? `<p>${esc(cl.sub)}</p>` : ""}
              <div class="deck-counts"><span class="badge teal">${nb} B</span><span class="badge gold">${own.length - nb} K</span>${refs.length ? `<span class="badge muted-badge">+${refs.length} verknüpft</span>` : ""}${st.due ? `<span class="badge danger">${st.due} fällig</span>` : ""}<span class="small muted">${st.seen}/${st.total}</span></div>
              ${pctBar(st.pct)}</div>
            <span class="chev">›</span></a>`;
        }).join("")}
      </div>
      ${tabbar("decks")}`;
    $app().querySelectorAll("[data-filter]").forEach((x) => x.addEventListener("click", () => { session.filter = x.getAttribute("data-filter"); renderDeck(id); }));
  }

  function routeClusterTrain(id, clId) {
    const d = deckById(id);
    const cl = d && (d.clusters || []).find((x) => x.id === clId);
    if (!cl) { location.hash = d ? "#/decks/" + id : "#/decks"; return; }
    const { own, refs } = clusterItems(d, cl);
    const f = session.filter;
    startTraining("cluster", buildFromItems(own.concat(refs), f), cl.title, "#/decks/" + id);
    renderTrain();
  }

  function renderCard(deckId, cardId) {
    const d = deckById(deckId);
    const c = d && d.cards.find((x) => x.id === cardId);
    if (!c) { location.hash = "#/decks"; return; }
    const cl = (d.clusters || []).find((x) => x.id === c.cl);
    const links = DECKS.flatMap((dd) => (dd.clusters || []).filter((x) => (x.refs || []).some(([a, b]) => a === deckId && b === cardId)).map((x) => [dd, x]));
    $app().innerHTML = `
      ${topbar(c.front, { back: "#/decks", sub: d.title })}
      <div class="page">
        <div class="flash flipped">
          <div class="flash-badges">${typeBadge(c.type, c)}${reifeBadge(c)}<span class="badge muted-badge">${esc(c.tag)}</span><span class="deck-mini">${d.emoji}</span></div>
          ${frontHtml(c)}
          <div class="flash-back">
            ${cardBack(c)}
            ${c.aka && c.aka.length ? `<p class="small muted">Auch: ${esc(c.aka.join(" · "))}</p>` : ""}
          </div>
        </div>
        ${cl ? `<button type="button" class="btn primary wide" data-go="#/decks/${d.id}/c/${cl.id}">Cluster „${esc(cl.title)}“ trainieren</button>` : ""}
        ${links.map(([dd, x]) => `<button type="button" class="btn ghost-btn wide" data-go="#/decks/${dd.id}/c/${x.id}">Auch in: ${dd.emoji} ${esc(x.title)}</button>`).join("")}
        ${relCards(c).length ? `<h3 class="rel-h">Siehe auch</h3><div class="q-list">${relCards(c).map(([dd, x]) => `<a class="list-row card q-hit" href="#/card/${dd.id}/${x.id}"><div class="avatar" style="background:${esc(dd.color)}22">${dd.emoji}</div><div class="meta"><h3>${esc(x.front)}</h3><p>${esc(x.de || x.short)}</p></div><span class="chev">›</span></a>`).join("")}</div>` : ""}
      </div>
      ${tabbar("decks")}`;
  }

  function routeDeckTrain(id) {
    const d = deckById(id);
    if (!d) { location.hash = "#/decks"; return; }
    const f = session.filter;
    const list = buildDeck(d, f);
    const label = f === "all" ? "" : f === "begriff" ? " · Begriffe" : " · Konzepte";
    startTraining("deck", list, d.title + label, "#/decks/" + d.id);
    renderTrain();
  }

  /* ---------- KARTENTRAINER ---------- */
  function renderTrain() {
    const t = session.train;
    if (!t) { location.hash = "#/"; return; }
    if (!t.queue.length) return renderTrainDone();
    const item = t.queue[0];
    const c = item.card;
    const d = deckById(item.deck);
    const doneCount = t.right + t.wrong;
    const progress = t.total ? Math.min(100, (t.total - t.queue.length) / t.total * 100) : 0;
    $app().innerHTML = `
      ${topbar(t.title, { back: t.back, sub: `${t.total - t.queue.length + 1} / ${t.total}${t.again.size ? ` · ${t.again.size} zum Wiederholen` : ""}` })}
      <div class="page">
        ${pctBar(progress)}
        <div class="flash ${t.flipped ? "flipped" : ""}" id="flash" role="button" tabindex="0" aria-label="Karte umdrehen">
          <div class="flash-badges">${typeBadge(c.type, c)}${reifeBadge(c)}<span class="badge muted-badge">${esc(c.tag || d.title)}</span><span class="deck-mini">${d.emoji}</span></div>
          ${frontHtml(c)}
          ${t.flipped ? `
            <div class="flash-back">
              ${cardBack(c)}
              ${relCards(c).length ? `<p class="small muted">Siehe auch: ${esc(relCards(c).map(([, x]) => x.front).join(" · "))}</p>` : ""}
            </div>` : `<p class="tap-hint">Tippen zum Aufdecken</p>`}
        </div>
        ${t.flipped ? `<div class="grade-row">
          <button type="button" class="btn danger-btn" data-grade="0">↺ Nochmal</button>
          <button type="button" class="btn primary" data-grade="1">✓ Gewusst</button>
        </div>` : ""}
        <p class="footer-note">${doneCount ? `${t.right} gewusst · ${t.wrong} nochmal` : "Erst überlegen, dann aufdecken."}</p>
      </div>`;
    const flash = document.getElementById("flash");
    const flip = () => { if (!t.flipped) { t.flipped = true; renderTrain(); } };
    flash.addEventListener("click", flip);
    flash.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    $app().querySelectorAll("[data-grade]").forEach((b) => b.addEventListener("click", () => {
      const ok = b.getAttribute("data-grade") === "1";
      Store.gradeCard(item.deck, c.id, ok);
      t.queue.shift();
      if (ok) t.right += 1;
      else {
        t.wrong += 1;
        if (!t.again.has(c.id)) { t.again.add(c.id); t.queue.push(item); t.total += 1; }
      }
      t.flipped = false;
      renderTrain();
      scrollTop();
    }));
  }

  function renderTrainDone() {
    const t = session.train;
    const empty = t.right + t.wrong === 0;
    $app().innerHTML = `
      ${topbar(t.title, { back: t.back })}
      <div class="page center-page">
        <div class="result-emoji">${empty ? "🎉" : t.wrong === 0 ? "🏆" : "💪"}</div>
        <h2>${empty ? "Nichts fällig" : "Runde geschafft"}</h2>
        <p class="muted">${empty ? "Gerade ist hier nichts zu wiederholen. Starte den Tagesmix oder ein anderes Deck." : `${t.right} gewusst · ${t.wrong} nochmal. Falsche Karten kommen in 10 Minuten wieder.`}</p>
        <div class="card goal-card"><div class="goal-head"><strong>Tagesziel</strong><span>${Store.get().daily.count} / ${Store.get().settings.goal}</span></div>${pctBar(Store.get().daily.count / Store.get().settings.goal * 100, Store.get().daily.count >= Store.get().settings.goal ? "gold" : "")}</div>
        <button type="button" class="btn primary wide" data-go="${esc(t.back)}">Fertig</button>
        <button type="button" class="btn ghost-btn wide" data-go="#/">Zur Startseite</button>
      </div>`;
  }

  /* ---------- KONZEPTE ---------- */
  function renderConcepts() {
    $app().innerHTML = `
      ${topbar("Konzepte", { noback: true, sub: `${CONTENT.modules.length} Module mit Theorie und Übungen` })}
      <div class="page">
        ${CONTENT.modules.map((m, i) => {
          const p = modPct(m);
          return `<a class="list-row card" href="#/concepts/${m.id}">
            <div class="avatar" style="background:var(--gold-soft)">${m.emoji}</div>
            <div class="meta"><h3>${i + 1}. ${esc(m.title)}</h3><p>${m.sections.length} Abschnitte · ${m.exercises.length} Übungen</p>${pctBar(p)}</div>
            ${p === 100 ? `<span class="badge teal">✓</span>` : ""}<span class="chev">›</span></a>`;
        }).join("")}
      </div>
      ${tabbar("concepts")}`;
  }

  function renderModule(id) {
    const m = modById(id);
    if (!m) { location.hash = "#/concepts"; return; }
    if (!session.mod || session.mod.id !== id) session.mod = { id, step: "theory" };
    if (session.mod.step === "theory") return renderModuleTheory(m);
    return renderExercise(m);
  }

  function renderTable(t) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${t.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function renderModuleTheory(m) {
    Store.markRead(m.id);
    $app().innerHTML = `
      ${topbar(m.title, { back: "#/concepts", sub: "Theorie" })}
      <div class="page">
        <div class="card intro-card"><span class="big-emoji">${m.emoji}</span><p>${esc(m.intro)}</p></div>
        ${m.sections.map((s) => `
          <section class="card theory">
            <h3>${esc(s.h)}</h3>
            <p>${esc(s.p)}</p>
            ${s.table ? renderTable(s.table) : ""}
            ${s.steps ? `<ol class="steps">${s.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}
          </section>`).join("")}
        <button type="button" class="btn primary wide" id="start-ex">Zu den Übungen (${m.exercises.length}) ›</button>
      </div>`;
    document.getElementById("start-ex").addEventListener("click", () => { startModuleExercises(m); renderExercise(m); scrollTop(); });
  }

  function startModuleExercises(m) {
    session.mod = { id: m.id, step: "ex", idx: 0, right: 0, state: null };
  }

  function exState(ex) {
    if (ex.type === "mc") return { picked: null };
    if (ex.type === "match") {
      return { left: shuffle(ex.pairs.map((p, i) => i)), right: shuffle(ex.pairs.map((p, i) => i)), sel: null, matched: [], errors: 0, bad: null };
    }
    return { pool: shuffle(ex.items.map((x, i) => i)), seq: [], errors: 0, bad: null };
  }

  function renderExercise(m) {
    const s = session.mod;
    if (s.idx >= m.exercises.length) return renderModuleDone(m);
    const ex = m.exercises[s.idx];
    if (!s.state) s.state = exState(ex);
    const st = s.state;
    let body = "", done = false, ok = false;
    if (ex.type === "mc") {
      done = st.picked !== null;
      ok = st.picked === ex.answer;
      body = `<div class="options">${ex.options.map((o, i) => {
        let cls = "";
        if (done && i === ex.answer) cls = "correct";
        else if (done && i === st.picked) cls = "wrong";
        return `<button type="button" class="opt ${cls}" data-opt="${i}" ${done ? "disabled" : ""}>${esc(o)}</button>`;
      }).join("")}</div>`;
    } else if (ex.type === "match") {
      done = st.matched.length === ex.pairs.length;
      ok = done && st.errors === 0;
      body = `<p class="small muted">Links antippen, dann das passende Gegenstück rechts.</p>
        <div class="match-grid">
          <div class="match-col">${st.left.map((i) => `<button type="button" class="chip ${st.matched.includes(i) ? "done" : ""} ${st.sel === i ? "sel" : ""}" data-l="${i}" ${st.matched.includes(i) ? "disabled" : ""}>${esc(ex.pairs[i][0])}</button>`).join("")}</div>
          <div class="match-col">${st.right.map((i) => `<button type="button" class="chip ${st.matched.includes(i) ? "done" : ""} ${st.bad === i ? "bad" : ""}" data-r="${i}" ${st.matched.includes(i) ? "disabled" : ""}>${esc(ex.pairs[i][1])}</button>`).join("")}</div>
        </div>`;
    } else {
      done = st.seq.length === ex.items.length;
      ok = done && st.errors === 0;
      body = `<p class="small muted">Tippe die Elemente in der richtigen Reihenfolge an.</p>
        <ol class="order-seq">${st.seq.map((i) => `<li>${esc(ex.items[i])}</li>`).join("")}${done ? "" : `<li class="order-slot">…</li>`}</ol>
        <div class="order-pool">${st.pool.filter((i) => !st.seq.includes(i)).map((i) => `<button type="button" class="chip ${st.bad === i ? "bad" : ""}" data-o="${i}">${esc(ex.items[i])}</button>`).join("")}</div>`;
    }
    const kind = { mc: "Auswahl", match: "Zuordnen", order: "Reihenfolge" }[ex.type];
    $app().innerHTML = `
      ${topbar(m.title, { back: "#/concepts", sub: `Übung ${s.idx + 1} / ${m.exercises.length} · ${kind}` })}
      <div class="page">
        ${pctBar(s.idx / m.exercises.length * 100)}
        <div class="card q-card"><p class="q">${esc(ex.prompt)}</p>${body}</div>
        ${done ? `<div class="card feedback ${ok ? "ok" : "no"}"><strong>${ok ? "✓ Richtig" : ex.type === "mc" ? "✗ Nicht ganz" : `✓ Gelöst mit ${plural(st.errors, "Fehler", "Fehlern")}`}</strong><p>${esc(ex.explain)}</p></div>
          <button type="button" class="btn primary wide" id="next-ex">${s.idx + 1 < m.exercises.length ? "Weiter ›" : "Abschließen"}</button>` : ""}
        <button type="button" class="btn ghost-btn wide" id="to-theory">Theorie ansehen</button>
      </div>`;

    const finish = (good) => {
      Store.markExercise(m.id, ex.id, good);
      if (good) s.right += 1;
      else if (ex.type === "mc") Store.addMistake({ id: "mx-" + ex.id, src: "Konzept · " + m.title, prompt: ex.prompt, options: ex.options, answer: ex.answer, explain: ex.explain });
    };
    $app().querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => {
      st.picked = +b.getAttribute("data-opt");
      finish(st.picked === ex.answer);
      renderExercise(m);
    }));
    $app().querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => { st.sel = +b.getAttribute("data-l"); st.bad = null; renderExercise(m); }));
    $app().querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => {
      if (st.sel === null) return;
      const r = +b.getAttribute("data-r");
      if (r === st.sel) { st.matched.push(r); st.sel = null; st.bad = null; } else { st.errors += 1; st.bad = r; }
      if (st.matched.length === ex.pairs.length) finish(st.errors === 0);
      renderExercise(m);
    }));
    $app().querySelectorAll("[data-o]").forEach((b) => b.addEventListener("click", () => {
      const i = +b.getAttribute("data-o");
      if (i === st.seq.length) { st.seq.push(i); st.bad = null; } else { st.errors += 1; st.bad = i; }
      if (st.seq.length === ex.items.length) finish(st.errors === 0);
      renderExercise(m);
    }));
    const nx = document.getElementById("next-ex");
    if (nx) nx.addEventListener("click", () => { s.idx += 1; s.state = null; renderExercise(m); scrollTop(); });
    document.getElementById("to-theory").addEventListener("click", () => { session.mod = { id: m.id, step: "theory" }; renderModuleTheory(m); scrollTop(); });
  }

  function renderModuleDone(m) {
    const s = session.mod;
    const pct = Math.round(s.right / m.exercises.length * 100);
    $app().innerHTML = `
      ${topbar(m.title, { back: "#/concepts" })}
      <div class="page center-page">
        <div class="result-emoji">${pct === 100 ? "🏆" : pct >= 60 ? "👍" : "📚"}</div>
        <h2>${s.right} / ${m.exercises.length} fehlerfrei</h2>
        <p class="muted">${pct === 100 ? "Modul sitzt." : "Falsche Auswahlfragen liegen in der Fehlerbox. Theorie noch einmal lesen hilft."}</p>
        <button type="button" class="btn primary wide" id="again">Übungen wiederholen</button>
        <button type="button" class="btn ghost-btn wide" data-go="#/concepts">Alle Module</button>
      </div>`;
    document.getElementById("again").addEventListener("click", () => { startModuleExercises(m); renderExercise(m); });
  }

  /* ---------- SZENARIEN ---------- */
  function renderScenarios() {
    $app().innerHTML = `
      ${topbar("Szenarien", { noback: true, sub: "Entscheiden wie in der Praxis" })}
      <div class="page">
        ${CONTENT.scenarios.map((sc) => {
          const p = scPct(sc);
          return `<a class="list-row card" href="#/scenarios/${sc.id}">
            <div class="avatar" style="background:#e8eef2">${sc.emoji}</div>
            <div class="meta"><h3>${esc(sc.title)}</h3><p><span class="badge muted-badge">${esc(sc.level)}</span> ${sc.questions.length} Fragen${p ? ` · Bestwert ${p} %` : ""}</p></div>
            <span class="chev">›</span></a>`;
        }).join("")}
      </div>
      ${tabbar("scenarios")}`;
  }

  function renderScenario(id) {
    const sc = scById(id);
    if (!sc) { location.hash = "#/scenarios"; return; }
    if (!session.sc || session.sc.id !== id) session.sc = { id, step: "intro", idx: 0, picked: null, right: 0 };
    const s = session.sc;
    if (s.step === "intro") {
      $app().innerHTML = `
        ${topbar(sc.title, { back: "#/scenarios", sub: sc.level })}
        <div class="page">
          <div class="card theory"><h3>${sc.emoji} Situation</h3><p>${esc(sc.situation)}</p></div>
          <div class="card theory goal-box"><h3>🎯 Ziel</h3><p>${esc(sc.goal)}</p></div>
          <button type="button" class="btn primary wide" id="sc-start">Los geht’s (${sc.questions.length} Fragen) ›</button>
        </div>`;
      document.getElementById("sc-start").addEventListener("click", () => { s.step = "q"; s.idx = 0; s.right = 0; s.picked = null; renderScenario(id); });
      return;
    }
    if (s.idx >= sc.questions.length) {
      if (!s.finished) { s.finished = true; Store.finishScenario(sc.id, s.right, sc.questions.length); }
      const pct = Math.round(s.right / sc.questions.length * 100);
      $app().innerHTML = `
        ${topbar(sc.title, { back: "#/scenarios" })}
        <div class="page center-page">
          <div class="result-emoji">${pct === 100 ? "🏆" : pct >= 75 ? "👍" : "🧭"}</div>
          <h2>${s.right} / ${sc.questions.length} richtig</h2>
          <p class="muted">${pct === 100 ? "Saubere Entscheidungen." : "Lies die Begründungen noch einmal – gerade bei „zuerst“ und „am besten“ zählt die Reihenfolge."}</p>
          <button type="button" class="btn primary wide" id="sc-again">Noch einmal</button>
          <button type="button" class="btn ghost-btn wide" data-go="#/scenarios">Alle Szenarien</button>
        </div>`;
      document.getElementById("sc-again").addEventListener("click", () => { session.sc = { id, step: "intro", idx: 0, picked: null, right: 0 }; renderScenario(id); });
      return;
    }
    const q = sc.questions[s.idx];
    const done = s.picked !== null;
    $app().innerHTML = `
      ${topbar(sc.title, { back: "#/scenarios", sub: `Frage ${s.idx + 1} / ${sc.questions.length}` })}
      <div class="page">
        ${pctBar(s.idx / sc.questions.length * 100)}
        <details class="card sit-mini"><summary>Situation anzeigen</summary><p>${esc(sc.situation)}</p></details>
        <div class="card q-card"><p class="q">${esc(q.prompt)}</p>
          <div class="options">${q.options.map((o, i) => {
            let cls = "";
            if (done && i === q.answer) cls = "correct"; else if (done && i === s.picked) cls = "wrong";
            return `<button type="button" class="opt ${cls}" data-opt="${i}" ${done ? "disabled" : ""}>${esc(o)}</button>`;
          }).join("")}</div>
        </div>
        ${done ? `<div class="card feedback ${s.picked === q.answer ? "ok" : "no"}"><strong>${s.picked === q.answer ? "✓ Richtig" : "✗ Besser: " + esc(q.options[q.answer])}</strong><p>${esc(q.explain)}</p></div>
          <button type="button" class="btn primary wide" id="sc-next">${s.idx + 1 < sc.questions.length ? "Weiter ›" : "Auswertung"}</button>` : ""}
      </div>`;
    $app().querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => {
      s.picked = +b.getAttribute("data-opt");
      const ok = s.picked === q.answer;
      if (ok) s.right += 1;
      else Store.addMistake({ id: `ms-${sc.id}-${s.idx}`, src: "Szenario · " + sc.title, prompt: q.prompt, options: q.options, answer: q.answer, explain: q.explain });
      Store.markScenario(sc.id, s.idx, ok);
      renderScenario(id);
    }));
    const nx = document.getElementById("sc-next");
    if (nx) nx.addEventListener("click", () => { s.idx += 1; s.picked = null; renderScenario(id); scrollTop(); });
  }

  /* ---------- MEHR ---------- */
  function renderMore() {
    const st = Store.get();
    const m = st.mistakes.length;
    const rows = [
      ["#/exam", "📋", "#ece8f5", "Prüfung", `Schnelltest oder Vollprüfung · ${CONTENT.exam.length} Fragen`, ""],
      ["#/mistakes", "🐞", "var(--danger-soft)", "Fehlerbox", m ? `${plural(m, "Eintrag", "Einträge")} offen` : "Aktuell leer", m ? `<span class="badge danger">${m}</span>` : ""],
      ["#/progress", "📈", "var(--teal-soft)", "Fortschritt", `Gesamt ${overallProgress()} %`, ""],
      ["#/settings", "⚙️", "#e8eef2", "Einstellungen", `Tagesziel ${st.settings.goal}`, ""],
    ];
    $app().innerHTML = `
      ${topbar("Mehr", { noback: true })}
      <div class="page">
        ${rows.map(([h, e, bg, t, p, extra]) => `<a class="list-row card" href="${h}">
          <div class="avatar" style="background:${bg}">${e}</div>
          <div class="meta"><h3>${t}</h3><p>${esc(p)}</p></div>${extra}<span class="chev">›</span></a>`).join("")}
      </div>
      ${tabbar("more")}`;
  }

  /* ---------- PRÜFUNG ---------- */
  function renderExamSetup() {
    const cfg = session.examCfg;
    const st = Store.get();
    const pool = CONTENT.exam.filter((q) => cfg.deck === "all" || q.deck === cfg.deck).length;
    const mode = EXAM_MODES[cfg.mode];
    $app().innerHTML = `
      ${topbar("Prüfung", { back: "#/more", sub: `Bestanden ab ${PASS} %` })}
      <div class="page">
        <h3 class="section-title">Modus</h3>
        ${Object.entries(EXAM_MODES).map(([k, v]) => `<button type="button" class="mode-card card ${cfg.mode === k ? "on" : ""}" data-mode="${k}">
          <span class="big-emoji">${k === "quick" ? "⚡" : "📋"}</span><span><strong>${v.label}</strong><span class="small muted">${v.n} Fragen · ${v.min} Minuten</span></span></button>`).join("")}
        <h3 class="section-title">Thema</h3>
        <div class="pill-wrap">
          <button type="button" class="pill ${cfg.deck === "all" ? "on" : ""}" data-deck="all">Alle Themen</button>
          ${DECKS.map((d) => `<button type="button" class="pill ${cfg.deck === d.id ? "on" : ""}" data-deck="${d.id}">${d.emoji} ${esc(d.title)}</button>`).join("")}
        </div>
        <p class="small muted">${pool} Fragen im gewählten Pool${pool < mode.n ? ` – die Prüfung nutzt alle ${pool}` : ""}.</p>
        <button type="button" class="btn primary wide" id="exam-start">Prüfung starten</button>
        ${st.exams.length ? `<h3 class="section-title">Letzte Ergebnisse</h3>${st.exams.slice(0, 5).map((e) => `
          <div class="list-row card small-row"><div class="meta"><h3>${esc(e.label)} · ${esc(e.topic)}</h3><p>${new Date(e.date).toLocaleDateString("de-DE")} · ${e.score}/${e.total}</p></div>
          <span class="badge ${e.passed ? "teal" : "danger"}">${e.pct} %</span></div>`).join("")}` : ""}
      </div>`;
    $app().querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { cfg.mode = b.getAttribute("data-mode"); renderExamSetup(); }));
    $app().querySelectorAll("[data-deck]").forEach((b) => b.addEventListener("click", () => { cfg.deck = b.getAttribute("data-deck"); renderExamSetup(); }));
    document.getElementById("exam-start").addEventListener("click", () => {
      const pool2 = CONTENT.exam.filter((q) => cfg.deck === "all" || q.deck === cfg.deck);
      let qs;
      if (cfg.deck === "all") {
        const per = {};
        shuffle(pool2).forEach((q) => { (per[q.deck] = per[q.deck] || []).push(q); });
        qs = [];
        let added = true;
        while (qs.length < mode.n && added) {
          added = false;
          shuffle(Object.keys(per)).forEach((k) => { if (qs.length < mode.n && per[k].length) { qs.push(per[k].shift()); added = true; } });
        }
        qs = shuffle(qs);
      } else qs = shuffle(pool2).slice(0, mode.n);
      session.exam = { mode: cfg.mode, deck: cfg.deck, qs, idx: 0, answers: qs.map(() => null), end: Date.now() + mode.min * 60000, done: false };
      location.hash = "#/exam/run";
    });
  }

  function renderExamRun() {
    const e = session.exam;
    if (!e) { location.hash = "#/exam"; return; }
    if (e.done) return renderExamResult();
    const q = e.qs[e.idx];
    const left = Math.max(0, e.end - Date.now());
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor(left % 60000 / 1000)).padStart(2, "0");
    const d = deckById(q.deck);
    $app().innerHTML = `
      ${topbar(EXAM_MODES[e.mode].label, { back: "#/exam", sub: `Frage ${e.idx + 1} / ${e.qs.length}`, right: `<span class="timer ${left < 60000 ? "warn" : ""}" id="timer">${mm}:${ss}</span>` })}
      <div class="page">
        ${pctBar(e.idx / e.qs.length * 100)}
        <div class="card q-card"><span class="badge muted-badge">${d.emoji} ${esc(d.title)}</span><p class="q">${esc(q.prompt)}</p>
          <div class="options">${q.options.map((o, i) => `<button type="button" class="opt ${e.answers[e.idx] === i ? "sel" : ""}" data-opt="${i}">${esc(o)}</button>`).join("")}</div>
        </div>
        <div class="row two">
          <button type="button" class="btn ghost-btn" id="ex-prev" ${e.idx === 0 ? "disabled" : ""}>‹ Zurück</button>
          ${e.idx + 1 < e.qs.length ? `<button type="button" class="btn ghost-btn" id="ex-skip">Weiter ›</button>` : `<button type="button" class="btn primary" id="ex-finish">Abgeben</button>`}
        </div>
        <p class="footer-note">${e.answers.filter((a) => a !== null).length} von ${e.qs.length} beantwortet</p>
      </div>`;
    $app().querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => {
      e.answers[e.idx] = +b.getAttribute("data-opt");
      if (e.idx + 1 < e.qs.length) e.idx += 1;
      renderExamRun();
    }));
    const prev = document.getElementById("ex-prev");
    if (prev) prev.addEventListener("click", () => { e.idx = Math.max(0, e.idx - 1); renderExamRun(); });
    const skip = document.getElementById("ex-skip");
    if (skip) skip.addEventListener("click", () => { e.idx += 1; renderExamRun(); });
    const fin = document.getElementById("ex-finish");
    if (fin) fin.addEventListener("click", () => {
      const open = e.answers.filter((a) => a === null).length;
      if (open && !window.confirm(`${plural(open, "Frage ist", "Fragen sind")} offen. Trotzdem abgeben?`)) return;
      finishExam();
    });
    if (!session.timer) {
      session.timer = setInterval(() => {
        const ex = session.exam;
        if (!ex || ex.done) { stopTimer(); return; }
        const l = Math.max(0, ex.end - Date.now());
        const el = document.getElementById("timer");
        if (el) {
          el.textContent = String(Math.floor(l / 60000)).padStart(2, "0") + ":" + String(Math.floor(l % 60000 / 1000)).padStart(2, "0");
          el.classList.toggle("warn", l < 60000);
        }
        if (l <= 0) finishExam();
      }, 500);
    }
  }

  function finishExam() {
    const e = session.exam;
    if (!e || e.done) return;
    stopTimer();
    e.done = true;
    const score = e.qs.reduce((a, q, i) => a + (e.answers[i] === q.answer ? 1 : 0), 0);
    const pct = Math.round(score / e.qs.length * 100);
    e.score = score; e.pct = pct; e.passed = pct >= PASS;
    e.qs.forEach((q, i) => {
      if (e.answers[i] !== q.answer) Store.addMistake({ id: "me-" + q.id, src: "Prüfung · " + deckById(q.deck).title, prompt: q.prompt, options: q.options, answer: q.answer, explain: q.explain });
    });
    Store.addExam({ mode: e.mode, label: EXAM_MODES[e.mode].label, topic: e.deck === "all" ? "Alle Themen" : deckById(e.deck).title, score, total: e.qs.length, pct, passed: e.passed });
    Store.activity(0);
    if (location.hash !== "#/exam/run") location.hash = "#/exam/run"; else renderExamResult();
  }

  function renderExamResult() {
    const e = session.exam;
    $app().innerHTML = `
      ${topbar("Ergebnis", { back: "#/exam" })}
      <div class="page">
        <div class="card result-card ${e.passed ? "ok" : "no"}">
          <div class="result-emoji">${e.passed ? "🏆" : "📚"}</div>
          <h2>${e.pct} % · ${e.passed ? "Bestanden" : "Nicht bestanden"}</h2>
          <p>${e.score} von ${e.qs.length} richtig · Grenze ${PASS} %</p>
        </div>
        <h3 class="section-title">Auswertung</h3>
        ${e.qs.map((q, i) => {
          const a = e.answers[i], ok = a === q.answer;
          return `<div class="card review ${ok ? "ok" : "no"}">
            <p class="q">${i + 1}. ${esc(q.prompt)}</p>
            ${ok ? `<p class="small ok-text">✓ ${esc(q.options[q.answer])}</p>` : `<p class="small no-text">✗ ${a === null ? "nicht beantwortet" : esc(q.options[a])}</p><p class="small ok-text">Richtig: ${esc(q.options[q.answer])}</p>`}
            <p class="small muted">${esc(q.explain)}</p>
          </div>`;
        }).join("")}
        <button type="button" class="btn primary wide" data-go="#/exam">Neue Prüfung</button>
        ${e.score < e.qs.length ? `<button type="button" class="btn ghost-btn wide" data-go="#/mistakes">Fehler wiederholen</button>` : ""}
      </div>`;
  }

  /* ---------- FEHLERBOX ---------- */
  function renderMistakes() {
    const st = Store.get();
    const list = st.mistakes;
    $app().innerHTML = `
      ${topbar("Fehlerbox", { back: "#/more", sub: `Gelöst nach ${Store.RESOLVE_AFTER}× richtig` })}
      <div class="page">
        ${list.length ? `<button type="button" class="btn primary wide" id="fix-start">Wiederholen (${Math.min(list.length, 15)})</button>
          ${list.map((m) => `<div class="list-row card small-row">
            <div class="meta"><h3>${esc(m.prompt)}</h3><p>${esc(m.src)} · ${m.right}/${Store.RESOLVE_AFTER} richtig</p></div>
            <button type="button" class="icon-btn light" data-del="${esc(m.id)}" aria-label="Entfernen">✕</button></div>`).join("")}`
          : `<div class="center-page"><div class="result-emoji">✨</div><h2>Alles erledigt</h2><p class="muted">Falsch beantwortete Fragen aus Übungen, Szenarien und Prüfungen landen hier.</p></div>`}
      </div>
      ${tabbar("more")}`;
    const fs = document.getElementById("fix-start");
    if (fs) fs.addEventListener("click", () => {
      session.fix = { items: list.slice(0, 15).map((m) => m.id), idx: 0, picked: null, right: 0 };
      location.hash = "#/mistakes/run";
    });
    $app().querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { Store.removeMistake(b.getAttribute("data-del")); renderMistakes(); }));
  }

  function renderFix() {
    const f = session.fix;
    if (!f) { location.hash = "#/mistakes"; return; }
    if (f.idx >= f.items.length) {
      $app().innerHTML = `
        ${topbar("Fehlerbox", { back: "#/mistakes" })}
        <div class="page center-page"><div class="result-emoji">💪</div><h2>${f.right} / ${f.items.length} richtig</h2>
        <p class="muted">${plural(Store.get().mistakes.length, "Eintrag bleibt", "Einträge bleiben")} offen.</p>
        <button type="button" class="btn primary wide" data-go="#/mistakes">Zur Fehlerbox</button></div>`;
      return;
    }
    const id = f.items[f.idx];
    let m = Store.get().mistakes.find((x) => x.id === id);
    if (!m && f.cache && f.cache.id === id) m = f.cache;
    if (!m) { f.idx += 1; return renderFix(); }
    f.cache = m;
    const done = f.picked !== null;
    $app().innerHTML = `
      ${topbar("Fehlerbox", { back: "#/mistakes", sub: `${f.idx + 1} / ${f.items.length}` })}
      <div class="page">
        <div class="card q-card"><span class="badge muted-badge">${esc(m.src)}</span><p class="q">${esc(m.prompt)}</p>
          <div class="options">${m.options.map((o, i) => {
            let cls = ""; if (done && i === m.answer) cls = "correct"; else if (done && i === f.picked) cls = "wrong";
            return `<button type="button" class="opt ${cls}" data-opt="${i}" ${done ? "disabled" : ""}>${esc(o)}</button>`;
          }).join("")}</div></div>
        ${done ? `<div class="card feedback ${f.picked === m.answer ? "ok" : "no"}"><strong>${f.picked === m.answer ? (f.resolved ? "✓ Gelöst – aus der Fehlerbox entfernt" : "✓ Richtig") : "✗ Noch nicht"}</strong><p>${esc(m.explain)}</p></div>
          <button type="button" class="btn primary wide" id="fix-next">Weiter ›</button>` : ""}
      </div>`;
    $app().querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => {
      f.picked = +b.getAttribute("data-opt");
      const ok = f.picked === m.answer;
      if (ok) f.right += 1;
      f.resolved = Store.answerMistake(m.id, ok);
      renderFix();
    }));
    const nx = document.getElementById("fix-next");
    if (nx) nx.addEventListener("click", () => { f.idx += 1; f.picked = null; f.resolved = false; renderFix(); });
  }

  /* ---------- FORTSCHRITT ---------- */
  function renderProgress() {
    const st = Store.get();
    let seen = 0, mastered = 0, due = 0;
    const rows = DECKS.map((d) => { const s = Store.deckStats(d); seen += s.seen; mastered += s.mastered; due += s.due; return { d, s }; });
    const total = DECKS.reduce((a, d) => a + d.cards.length, 0);
    const boxes = [0, 0, 0, 0, 0, 0];
    DECKS.forEach((d) => d.cards.forEach((c) => { const cs = Store.cardState(d.id, c.id); if (cs) boxes[cs.box] += 1; }));
    $app().innerHTML = `
      ${topbar("Fortschritt", { back: "#/more", sub: `Gesamt ${overallProgress()} %` })}
      <div class="page">
        <div class="row three">
          <div class="stat-chip col"><span class="lbl">Gesehen</span><span class="val">${seen}/${total}</span></div>
          <div class="stat-chip col"><span class="lbl">Sicher</span><span class="val">${mastered}</span></div>
          <div class="stat-chip col"><span class="lbl">Fällig</span><span class="val">${due}</span></div>
        </div>
        <div class="card"><h3 class="mini-h">Leitner-Fächer</h3>
          <div class="boxes">${boxes.map((n, i) => `<div class="box-col"><div class="box-bar"><i style="height:${seen ? Math.round(n / Math.max(...boxes, 1) * 100) : 0}%"></i></div><span>${n}</span><small>${Store.INTERVALS[i]} T</small></div>`).join("")}</div>
        </div>
        <h3 class="section-title">Decks</h3>
        ${rows.map(({ d, s }) => `<div class="card prog-row"><div class="goal-head"><strong>${d.emoji} ${esc(d.title)}</strong><span>${s.pct} %</span></div>${pctBar(s.pct)}<p class="small muted">${s.seen}/${s.total} gesehen · ${s.mastered} sicher · ${s.due} fällig</p></div>`).join("")}
        <h3 class="section-title">Konzept-Module</h3>
        ${CONTENT.modules.map((m) => `<div class="card prog-row"><div class="goal-head"><strong>${m.emoji} ${esc(m.title)}</strong><span>${modPct(m)} %</span></div>${pctBar(modPct(m), "gold")}</div>`).join("")}
        <h3 class="section-title">Szenarien</h3>
        ${CONTENT.scenarios.map((sc) => `<div class="card prog-row"><div class="goal-head"><strong>${sc.emoji} ${esc(sc.title)}</strong><span>${scPct(sc)} %</span></div>${pctBar(scPct(sc))}</div>`).join("")}
        <h3 class="section-title">Prüfungen</h3>
        ${st.exams.length ? st.exams.map((e) => `<div class="list-row card small-row"><div class="meta"><h3>${esc(e.label)} · ${esc(e.topic)}</h3><p>${new Date(e.date).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })} · ${e.score}/${e.total}</p></div><span class="badge ${e.passed ? "teal" : "danger"}">${e.pct} %</span></div>`).join("") : `<p class="small muted">Noch keine Prüfung abgelegt.</p>`}
      </div>
      ${tabbar("more")}`;
  }

  /* ---------- EINSTELLUNGEN ---------- */
  function renderSettings() {
    const st = Store.get();
    $app().innerHTML = `
      ${topbar("Einstellungen", { back: "#/more" })}
      <div class="page">
        <div class="card">
          <div class="goal-head"><strong>Tagesziel</strong><span>${st.settings.goal} Karten/Aufgaben</span></div>
          <div class="stepper">
            <button type="button" class="btn ghost-btn" data-step="-5">−5</button>
            <span class="step-val">${st.settings.goal}</span>
            <button type="button" class="btn ghost-btn" data-step="5">+5</button>
          </div>
          <p class="small muted">Der Tagesmix umfasst bis zu 15–20 Karten, davon höchstens 30 % neue; Kernkarten werden bevorzugt. Jede bewertete Karte, Übung und Szenariofrage zählt zum Ziel.</p>
        </div>
        <div class="card">
          <h3 class="mini-h">Inhalte</h3>
          <p class="small">${DECKS.length} Decks · ${countType("begriff")} Begriffe · ${countType("konzept")} Konzepte · ${CONTENT.modules.length} Konzept-Module · ${CONTENT.scenarios.length} Szenarien · ${CONTENT.exam.length} Prüfungsfragen</p>
          <p class="small muted">Lernhilfe in eigenen Worten. Verbindlich sind Rechtstexte, Normen und offizielle Prüfungsunterlagen.</p>
        </div>
        <div class="card">
          <h3 class="mini-h">Daten</h3>
          <p class="small muted">Dein Fortschritt liegt nur lokal auf diesem Gerät.</p>
          <button type="button" class="btn danger-btn wide" id="reset">Fortschritt zurücksetzen</button>
        </div>
      </div>
      ${tabbar("more")}`;
    $app().querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => { Store.setGoal(st.settings.goal + +b.getAttribute("data-step")); renderSettings(); }));
    document.getElementById("reset").addEventListener("click", () => {
      if (window.confirm("Wirklich den gesamten Fortschritt löschen?")) { Store.reset(); session.train = session.mod = session.sc = session.exam = null; location.hash = "#/"; }
    });
  }

  /* ---------- Routing ---------- */
  function route() {
    const h = location.hash || "#/";
    const parts = h.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (h !== "#/exam/run") stopTimer();
    Store.setLastRoute(h);
    const [a, b, c, e] = parts;
    if (!a) renderHome();
    else if (a === "train") renderTrain();
    else if (a === "decks" && b && c === "train") routeDeckTrain(b);
    else if (a === "decks" && b && c === "c" && e) routeClusterTrain(b, e);
    else if (a === "decks" && b) renderDeck(b);
    else if (a === "decks") renderDecks();
    else if (a === "card" && b && c) renderCard(b, c);
    else if (a === "concepts" && b) renderModule(b);
    else if (a === "concepts") { session.mod = null; renderConcepts(); }
    else if (a === "scenarios" && b) renderScenario(b);
    else if (a === "scenarios") { session.sc = null; renderScenarios(); }
    else if (a === "more") renderMore();
    else if (a === "exam" && b === "run") renderExamRun();
    else if (a === "exam") renderExamSetup();
    else if (a === "mistakes" && b === "run") renderFix();
    else if (a === "mistakes") renderMistakes();
    else if (a === "progress") renderProgress();
    else if (a === "settings") renderSettings();
    else { location.hash = "#/"; return; }
    scrollTop();
  }

  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { e.preventDefault(); location.hash = go.getAttribute("data-go"); }
  });

  window.addEventListener("hashchange", route);

  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  }

  window.__SEC_READY = true;
  route();
})();
