/* Autofeud — engine: bank parsing, forgiving answer matching, seeded random,
   humanlike AI rival, profile storage, levels and achievements. No DOM here. */
(function (AF) {
  'use strict';

  /* ---------- text helpers ---------- */
  const STOP = new Set(('a an the to of in on at for and or is are be my your you we i it its with from so do does did ' +
    'very too that this than as by up out me im am was were has have had their they them our us he she his her what why how ' +
    'when who can will just like dont cant doesnt').split(' '));

  function norm(s) {
    return String(s).toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function stem(w) {
    if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
    if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
    if (w.length > 4 && /(ches|shes|xes|sses|oes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let best = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev[j - 2] + 1);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  // allowed typos grow with word length
  const tol = n => (n >= 9 ? 2 : n >= 5 ? 1 : 0);
  function wordsOf(s) { return norm(s).split(' ').filter(w => w && !STOP.has(w)); }
  // 2 = same word (or same stem), 1 = close enough to be a typo, 0 = different
  function sameWord(a, b) {
    if (a === b) return 2;
    const sa = stem(a), sb = stem(b);
    if (sa === sb) return 2;
    const t = tol(Math.min(sa.length, sb.length));
    return t > 0 && lev(sa, sb, t) <= t ? 1 : 0;
  }

  /* ---------- bank ---------- */
  function parseEntry(line, cat, idx) {
    const parts = line.split('|');
    const query = parts[0];
    const answers = parts.slice(1).map((raw, rank) => {
      const [display, keyStr] = raw.split('=');
      const keys = keyStr ? keyStr.split(',').map(norm).filter(Boolean) : wordsOf(display);
      return { rank, text: display, keys: keys.length ? keys : [norm(display)], full: norm(display), points: (10 - rank) * 1000 };
    });
    return { id: cat + ':' + idx, cat, query, answers };
  }
  AF.QUESTIONS = [];
  for (const c of AF.CATEGORIES) AF.BANK[c.id].forEach((l, i) => AF.QUESTIONS.push(parseEntry(l, c.id, i)));
  AF.byId = id => AF.QUESTIONS.find(q => q.id === id);

  /* ---------- matching ----------
     Returns { answer } for the best unrevealed hit, { dupe } if the guess only
     matches answers already on the board, or {} for a miss. */
  AF.match = function (q, guess, revealed) {
    const g = norm(guess);
    if (!g) return {};
    // the guess may repeat the search itself ("why do cats purr")
    const qWords = new Set(wordsOf(q.query));
    const gw = wordsOf(g).filter(w => !qWords.has(w));
    const toks = gw.length ? gw : g.split(' ').filter(w => !qWords.has(w));
    let best = null, bestScore = 0, dupe = null;
    for (const a of q.answers) {
      let score = 0;
      if (g === a.full || norm(q.query + ' ' + a.text) === g) score = 100;
      else {
        for (const k of a.keys) score += Math.max(0, ...toks.map(t => sameWord(t, k)));
        if (!score && a.full.length >= 8 && lev(g, a.full, tol(a.full.length)) <= tol(a.full.length)) score = 1;
      }
      if (!score) continue;
      if (revealed[a.rank]) { if (!dupe || score > dupe.s) dupe = { a, s: score }; continue; }
      if (score > bestScore || (score === bestScore && a.rank < best.rank)) { best = a; bestScore = score; }
    }
    if (best) return { answer: best };
    if (dupe) return { dupe: dupe.a };
    return {};
  };

  /* ---------- seeded random ---------- */
  AF.rng = function (seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  };
  AF.hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  AF.shuffle = (arr, r) => { r = r || Math.random; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  AF.today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  /* pick n questions: daily = same for everyone that day, otherwise avoid recently seen ones */
  AF.pickQuestions = function (n, cat, opts) {
    opts = opts || {};
    const pool = AF.QUESTIONS.filter(q => !cat || cat === 'mixed' || q.cat === cat);
    if (opts.daily) {
      const r = AF.rng(AF.hash('autofeud-' + opts.daily));
      const cats = AF.shuffle(AF.CATEGORIES.map(c => c.id), r).slice(0, n);
      return cats.map(c => { const list = AF.QUESTIONS.filter(q => q.cat === c); return list[Math.floor(r() * list.length)]; });
    }
    const seen = new Set(opts.seen || []);
    const fresh = AF.shuffle(pool.filter(q => !seen.has(q.id)));
    const old = AF.shuffle(pool.filter(q => seen.has(q.id)));
    const out = fresh.concat(old);
    while (out.length < n) out.push(...AF.shuffle(pool.slice()));
    return out.slice(0, n);
  };

  /* ---------- AI rival ---------- */
  AF.AI_LEVELS = {
    easy: { name: 'Easy', hit: 0.4, bias: 2.2, typo: 0.18, think: [1.8, 3.4] },
    medium: { name: 'Medium', hit: 0.58, bias: 1.5, typo: 0.1, think: [1.3, 2.6] },
    hard: { name: 'Hard', hit: 0.76, bias: 0.9, typo: 0.05, think: [0.9, 2.0] }
  };
  AF.AI_NAMES = [['Nova', '🤖'], ['Pixel', '👾'], ['Byte', '🦾'], ['Echo', '🛰️'], ['Juno', '🧠'], ['Sparky', '⚡'], ['Mochi', '🐱'], ['Ziggy', '🦊']];

  function typo(word, r) {
    if (word.length < 5) return word;
    const i = 1 + Math.floor(r() * (word.length - 2));
    const k = r();
    if (k < 0.4) return word.slice(0, i) + word.slice(i + 1); // dropped letter
    if (k < 0.75) return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2); // swapped
    return word.slice(0, i) + word[i] + word.slice(i); // doubled
  }

  /* Decide the AI's next guess. Returns { text, think } where think is seconds. */
  AF.aiGuess = function (q, revealed, tried, level, r) {
    r = r || Math.random;
    const L = AF.AI_LEVELS[level] || AF.AI_LEVELS.medium;
    const think = L.think[0] + r() * (L.think[1] - L.think[0]);
    const open = q.answers.filter(a => !revealed[a.rank]);
    // more likely to know the answer while the board is still full; easy bots stick to the obvious ones
    const hitChance = L.hit * (0.65 + 0.35 * open.length / 10);
    if (open.length && r() < hitChance) {
      const w = open.map(a => Math.pow(11 - a.rank, L.bias));
      let x = r() * w.reduce((s, v) => s + v, 0), pick = open[0];
      for (let i = 0; i < open.length; i++) { x -= w[i]; if (x <= 0) { pick = open[i]; break; } }
      let text = pick.keys[Math.floor(r() * pick.keys.length)];
      if (r() < 0.35 && pick.text.split(' ').length <= 4) text = pick.text; // sometimes types the full phrase
      if (r() < L.typo) { const t = typo(text, r); if (AF.match(q, t, revealed).answer === pick) text = t; }
      if (!tried.has(norm(text)) && AF.match(q, text, revealed).answer) return { text, think };
    }
    // wrong guess: something plausible from the same category, or a generic word
    const same = AF.QUESTIONS.filter(o => o.cat === q.cat && o !== q).flatMap(o => o.answers.slice(0, 5).map(a => a.keys[0]));
    const pool = AF.shuffle(same.concat(AF.DECOYS), r);
    for (const w of pool) {
      const m = AF.match(q, w, revealed);
      if (!m.answer && !m.dupe && !tried.has(norm(w))) return { text: w, think: think * 0.9 };
    }
    return { text: 'no idea', think };
  };
  AF.AI_LINES = {
    hit: ['Nailed it!', 'Easy one.', 'Knew it!', 'Yesss!', 'Called it.', 'Too easy 😎'],
    miss: ['Hmm, nope.', 'Ugh!', 'Really?!', 'I was so sure…', 'Wait what', 'Oops 😅'],
    think: ['Hmm…', 'Let me think…', 'Ooh, I know…', 'Thinking…', 'Hmmmm']
  };

  /* ---------- profile ---------- */
  const KEY = 'autofeud.v1';
  const DEFAULT = () => ({
    name: '', xp: 0,
    settings: { sound: true, theme: 'auto', motion: true },
    stats: { games: 0, rounds: 0, found: 0, perfect: 0, tops: 0, deep: 0, wins: 0, losses: 0, bestRun: 0,
      best: { classic: 0, daily: 0, versus: 0, speed: 0 }, speedBest: 0, cats: {} },
    daily: { last: '', streak: 0, history: {} },
    ach: {}, seen: []
  });
  function merge(base, extra) {
    for (const k in extra) {
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k] && typeof base[k] === 'object') merge(base[k], extra[k]);
      else if (extra[k] !== undefined) base[k] = extra[k];
    }
    return base;
  }
  AF.Store = {
    load() {
      try { const raw = localStorage.getItem(KEY); if (raw) return merge(DEFAULT(), JSON.parse(raw)); } catch (e) { /* private mode */ }
      return DEFAULT();
    },
    save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* ignore */ } },
    reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } return DEFAULT(); }
  };

  /* ---------- levels ---------- */
  AF.levelOf = xp => Math.floor(Math.sqrt(xp / 400)) + 1;
  AF.xpFor = lvl => (lvl - 1) * (lvl - 1) * 400;
  AF.TITLES = ['Newbie', 'Searcher', 'Curious Cat', 'Clicker', 'Browser', 'Trend Spotter', 'Know-It-All', 'Mind Reader', 'Search Wizard', 'Internet Legend'];
  AF.titleOf = lvl => AF.TITLES[Math.min(AF.TITLES.length - 1, Math.floor((lvl - 1) / 3))];

  /* ---------- achievements ---------- */
  AF.ACHIEVEMENTS = [
    { id: 'first', icon: '🔍', name: 'First Search', desc: 'Finish your first game.' },
    { id: 'perfect', icon: '💯', name: 'Top 10', desc: 'Find all 10 answers in one round.' },
    { id: 'streak5', icon: '🎯', name: 'Sharpshooter', desc: 'Get 5 answers in a row without a miss.' },
    { id: 'mind', icon: '🧠', name: 'Mind Reader', desc: 'Find the #1 answer in every round of a game.' },
    { id: 'deep', icon: '🕳️', name: 'Deep Cut', desc: 'Find a #10 answer 10 times.' },
    { id: 'k50', icon: '🏅', name: '50K Club', desc: 'Score 50,000 in a Classic game.' },
    { id: 'nohint', icon: '🙈', name: 'No Help Needed', desc: 'Score 30,000 in Classic without hints.' },
    { id: 'rival', icon: '🤝', name: 'Rival', desc: 'Win a Versus match.' },
    { id: 'buster', icon: '🦾', name: 'Bot Buster', desc: 'Beat the Hard AI.' },
    { id: 'speed20', icon: '⚡', name: 'Speed Demon', desc: 'Find 20 answers in one Speed Rush.' },
    { id: 'daily3', icon: '📅', name: 'Daily Habit', desc: 'Play the Daily Challenge 3 days in a row.' },
    { id: 'explorer', icon: '🧭', name: 'Explorer', desc: 'Play a round in every category.' }
  ];
})(window.AF = window.AF || {});
