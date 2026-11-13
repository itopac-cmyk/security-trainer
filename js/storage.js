/* Speicher, Leitner-Wiederholung, Serie, Tagesziel und Fehlerbox */
const Store = (() => {
  const KEY = "sec-trainer-v1";
  const DAY = 24 * 60 * 60 * 1000;
  const INTERVALS = [0, 1, 3, 7, 14, 30];
  const RETRY_MS = 10 * 60 * 1000;
  const MAX_EXAMS = 20;
  const MAX_MISTAKES = 80;
  const RESOLVE_AFTER = 2;

  function fresh() {
    return {
      v: 1,
      streak: { current: 0, best: 0, last: null },
      daily: { date: todayKey(), count: 0 },
      settings: { goal: 15 },
      decks: {},
      concepts: {},
      scenarios: {},
      exams: [],
      mistakes: [],
      lastRoute: null,
    };
  }

  function todayKey(d) {
    const x = d || new Date();
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }

  function dayDiff(a, b) {
    const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / DAY);
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const s = Object.assign(fresh(), JSON.parse(raw));
      s.streak = Object.assign(fresh().streak, s.streak);
      s.daily = Object.assign(fresh().daily, s.daily);
      s.settings = Object.assign(fresh().settings, s.settings);
      return s;
    } catch (err) {
      return fresh();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) { /* Speicher voll oder privat */ }
  }

  function rollDay() {
    const t = todayKey();
    if (state.daily.date !== t) state.daily = { date: t, count: 0 };
    if (state.streak.last && dayDiff(state.streak.last, t) > 1) state.streak.current = 0;
  }

  function get() { rollDay(); return state; }

  function touchStreak() {
    const t = todayKey();
    if (state.streak.last === t) return;
    if (state.streak.last && dayDiff(state.streak.last, t) === 1) state.streak.current += 1;
    else state.streak.current = 1;
    state.streak.last = t;
    if (state.streak.current > state.streak.best) state.streak.best = state.streak.current;
  }

  function activity(n) {
    rollDay();
    state.daily.count += n || 1;
    touchStreak();
    save();
  }

  /* ---------- Karten ---------- */
  function cardState(deckId, cardId) {
    const d = state.decks[deckId];
    return d && d[cardId] ? d[cardId] : null;
  }

  function isDue(cs, now) {
    return !!cs && cs.due <= (now || Date.now());
  }

  function gradeCard(deckId, cardId, ok) {
    if (!state.decks[deckId]) state.decks[deckId] = {};
    const cs = state.decks[deckId][cardId] || { box: 0, due: 0, seen: 0, right: 0, wrong: 0 };
    const now = Date.now();
    cs.seen += 1;
    if (ok) {
      cs.right += 1;
      cs.box = Math.min(INTERVALS.length - 1, cs.box + 1);
      cs.due = now + INTERVALS[cs.box] * DAY;
    } else {
      cs.wrong += 1;
      cs.box = 0;
      cs.due = now + RETRY_MS;
    }
    cs.last = now;
    state.decks[deckId][cardId] = cs;
    activity(1);
    return cs;
  }

  function deckStats(deck) {
    const now = Date.now();
    let seen = 0, due = 0, mastered = 0;
    deck.cards.forEach((c) => {
      const cs = cardState(deck.id, c.id);
      if (!cs) return;
      seen += 1;
      if (cs.due <= now) due += 1;
      if (cs.box >= 3) mastered += 1;
    });
    const total = deck.cards.length;
    const pct = total ? Math.round(deck.cards.reduce((a, c) => {
      const cs = cardState(deck.id, c.id);
      return a + (cs ? cs.box / (INTERVALS.length - 1) : 0);
    }, 0) / total * 100) : 0;
    return { total, seen, due, mastered, fresh: total - seen, pct };
  }

  /* ---------- Konzepte & Szenarien ---------- */
  function markExercise(modId, exId, ok) {
    const m = state.concepts[modId] || (state.concepts[modId] = { done: {}, read: false });
    const prev = m.done[exId];
    m.done[exId] = ok || prev === true;
    activity(1);
  }

  function markRead(modId) {
    const m = state.concepts[modId] || (state.concepts[modId] = { done: {}, read: false });
    if (!m.read) { m.read = true; save(); }
  }

  function markScenario(scId, qi, ok) {
    const s = state.scenarios[scId] || (state.scenarios[scId] = { answers: {}, runs: 0, best: 0 });
    s.answers[qi] = ok;
    activity(1);
  }

  function finishScenario(scId, score, total) {
    const s = state.scenarios[scId] || (state.scenarios[scId] = { answers: {}, runs: 0, best: 0 });
    s.runs += 1;
    s.best = Math.max(s.best, total ? Math.round(score / total * 100) : 0);
    save();
  }

  /* ---------- Prüfung ---------- */
  function addExam(result) {
    state.exams.unshift(Object.assign({ date: Date.now() }, result));
    state.exams = state.exams.slice(0, MAX_EXAMS);
    touchStreak();
    save();
  }

  /* ---------- Fehlerbox ---------- */
  function addMistake(item) {
    const ex = state.mistakes.find((m) => m.id === item.id);
    if (ex) { ex.right = 0; ex.added = Date.now(); }
    else state.mistakes.unshift(Object.assign({ right: 0, added: Date.now() }, item));
    state.mistakes = state.mistakes.slice(0, MAX_MISTAKES);
    save();
  }

  function answerMistake(id, ok) {
    const m = state.mistakes.find((x) => x.id === id);
    if (!m) return false;
    if (ok) m.right += 1; else m.right = 0;
    let resolved = false;
    if (m.right >= RESOLVE_AFTER) {
      state.mistakes = state.mistakes.filter((x) => x.id !== id);
      resolved = true;
    }
    activity(1);
    return resolved;
  }

  function removeMistake(id) {
    state.mistakes = state.mistakes.filter((x) => x.id !== id);
    save();
  }

  /* ---------- Einstellungen ---------- */
  function setGoal(n) {
    state.settings.goal = Math.max(5, Math.min(60, Math.round(n)));
    save();
  }

  function setLastRoute(r) {
    if (state.lastRoute !== r) { state.lastRoute = r; save(); }
  }

  function reset() {
    state = fresh();
    save();
  }

  return {
    KEY, INTERVALS, RETRY_MS, RESOLVE_AFTER,
    get, save, todayKey, activity,
    cardState, isDue, gradeCard, deckStats,
    markExercise, markRead, markScenario, finishScenario,
    addExam, addMistake, answerMistake, removeMistake,
    setGoal, setLastRoute, reset,
  };
})();
if (typeof module !== "undefined") module.exports = Store;
