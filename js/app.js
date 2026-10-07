/* Autofeud — UI, game flow, sound, effects */
(function (AF) {
  'use strict';
  const $ = id => document.getElementById(id);
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const catOf = id => AF.CATEGORIES.find(c => c.id === id);

  /* ================= sound (synthesized, no files) ================= */
  const Sound = {
    ctx: null, on: true,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.out = this.ctx.createDynamicsCompressor();
      this.out.connect(this.ctx.destination);
    },
    tone(f, dur, type, vol, delay, slide) {
      if (!this.on || !this.ctx) return;
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.out);
      o.start(t); o.stop(t + dur + 0.02);
    },
    hit(rank) { const f = 620 + (9 - rank) * 34; this.tone(f, 0.18, 'triangle', 0.16); this.tone(f * 1.5, 0.32, 'sine', 0.13, 0.08); this.tone(f * 3, 0.2, 'sine', 0.04, 0.12); },
    aiHit() { this.tone(440, 0.16, 'triangle', 0.12); this.tone(554, 0.26, 'triangle', 0.1, 0.08); },
    miss() { this.tone(180, 0.3, 'sawtooth', 0.07, 0, 110); this.tone(120, 0.32, 'square', 0.04, 0.02, 90); },
    dupe() { this.tone(520, 0.08, 'sine', 0.08); this.tone(520, 0.08, 'sine', 0.06, 0.1); },
    flip() { this.tone(300 + Math.random() * 60, 0.06, 'triangle', 0.05); },
    key() { this.tone(1500 + Math.random() * 400, 0.018, 'square', 0.012); },
    tick() { this.tone(980, 0.05, 'square', 0.04); },
    clear() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.13, i * 0.09)); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.13, i * 0.11)); this.tone(1568, 0.6, 'sine', 0.08, 0.6); },
    lose() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.11, i * 0.16)); },
    hint() { this.tone(880, 0.12, 'sine', 0.08); this.tone(1320, 0.18, 'sine', 0.06, 0.07); }
  };

  /* ================= confetti ================= */
  const Confetti = {
    parts: [], running: false,
    burst(n, x, y) {
      if (document.documentElement.dataset.motion === 'off') return;
      const cv = $('confetti');
      cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
      const cols = ['#7c5cff', '#ff4f9a', '#ff8a1f', '#f5b400', '#16b47a', '#2f8cff'];
      x = x === undefined ? innerWidth / 2 : x; y = y === undefined ? innerHeight / 3 : y;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
          w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: cols[i % cols.length], life: 90 + Math.random() * 60 });
      }
      if (!this.running) { this.running = true; requestAnimationFrame(() => this.step()); }
    },
    step() {
      const cv = $('confetti'), g = cv.getContext('2d'), k = devicePixelRatio;
      g.clearRect(0, 0, cv.width, cv.height);
      this.parts = this.parts.filter(p => p.life-- > 0 && p.y < innerHeight + 40);
      for (const p of this.parts) {
        p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x * k, p.y * k); g.rotate(p.r); g.globalAlpha = Math.min(1, p.life / 30);
        g.fillStyle = p.c; g.fillRect(-p.w * k / 2, -p.h * k / 2, p.w * k, p.h * k * Math.abs(Math.cos(p.r * 2)) + k); g.restore();
      }
      if (this.parts.length) requestAnimationFrame(() => this.step());
      else { this.running = false; g.clearRect(0, 0, cv.width, cv.height); }
    }
  };

  /* ================= app ================= */
  const MODES = {
    classic: { name: 'Classic', rounds: 5, strikes: 3, hints: 3 },
    daily: { name: 'Daily Challenge', rounds: 5, strikes: 3, hints: 2 },
    versus: { name: 'Versus AI', rounds: 5, strikes: 3, hints: 1 },
    speed: { name: 'Speed Rush', rounds: 99, strikes: 0, hints: 2, time: 60 }
  };

  const App = {
    p: null, mode: 'classic', cat: 'mixed', aiLevel: 'medium', g: null, token: 0,

    boot() {
      this.p = AF.Store.load();
      Sound.on = this.p.settings.sound;
      this.applyTheme();
      this.renderProfile();
      this.renderSetup();
      this.bind();
      this.demo();
      this.refreshDaily();
    },
    save() { AF.Store.save(this.p); },

    applyTheme() {
      const s = this.p.settings, root = document.documentElement;
      if (s.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = s.theme;
      root.dataset.motion = s.motion ? 'on' : 'off';
    },

    /* ---------- profile ---------- */
    renderProfile() {
      const p = this.p, lvl = AF.levelOf(p.xp), name = p.name || 'Player';
      $('p-name').textContent = name;
      $('avatar').textContent = name[0].toUpperCase();
      $('p-level').textContent = 'Lv ' + lvl + ' · ' + AF.titleOf(lvl);
      const a = AF.xpFor(lvl), b = AF.xpFor(lvl + 1);
      $('p-xp').style.width = Math.round((p.xp - a) / (b - a) * 100) + '%';
    },

    /* ---------- home ---------- */
    renderSetup() {
      const cats = [{ id: 'mixed', name: 'Mixed', icon: '🎲' }].concat(AF.CATEGORIES);
      $('cats').innerHTML = cats.map(c => `<button class="chip${c.id === this.cat ? ' sel' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`).join('');
      $('ai-levels').innerHTML = Object.keys(AF.AI_LEVELS).map(k => `<button data-lvl="${k}" class="${k === this.aiLevel ? 'sel' : ''}">${AF.AI_LEVELS[k].name}</button>`).join('');
      document.querySelectorAll('.mode').forEach(m => m.classList.toggle('sel', m.dataset.mode === this.mode));
      $('cat-wrap').classList.toggle('hidden', this.mode === 'daily');
      $('ai-wrap').classList.toggle('hidden', this.mode !== 'versus');
      const notes = {
        classic: '5 rounds · 3 strikes · 3 hints',
        daily: this.dailyDone() ? 'Done today · ' + fmt(this.p.daily.history[AF.today()].score) + ' pts · replay is practice' : '5 rounds · one per category · 2 hints',
        versus: 'Best of 5 · you go first in odd rounds',
        speed: '60 s · +3 s per answer · skip anytime'
      };
      $('setup-note').textContent = notes[this.mode];
    },
    dailyDone() { return !!this.p.daily.history[AF.today()]; },
    refreshDaily() {
      const b = $('daily-badge'), done = this.dailyDone();
      b.textContent = done ? '✓ ' + fmt(this.p.daily.history[AF.today()].score) : 'NEW';
      b.className = 'badge ' + (done ? 'done' : 'new');
    },

    demo() {
      const samples = AF.shuffle(AF.QUESTIONS.slice()).slice(0, 12);
      let i = 0;
      const run = async () => {
        while (true) {
          if ($('home').classList.contains('hidden')) { await wait(800); continue; }
          const q = samples[i++ % samples.length];
          const qEl = $('demo-q'), drop = $('demo-drop');
          drop.innerHTML = '';
          for (let k = 0; k <= q.query.length; k++) {
            qEl.innerHTML = esc(q.query.slice(0, k)) + '<span class="caret"></span>';
            await wait(55 + Math.random() * 45);
          }
          await wait(250);
          drop.innerHTML = q.answers.slice(0, 4).map(a => `<div>🔍&nbsp; ${esc(q.query)} <b>${esc(a.text)}</b></div>`).join('');
          const rows = drop.querySelectorAll('div');
          for (const r of rows) { await wait(120); r.classList.add('on'); }
          await wait(2600);
          rows.forEach(r => r.classList.remove('on'));
          await wait(300);
        }
      };
      run();
    },

    /* ---------- events ---------- */
    bind() {
      const unlock = () => Sound.init();
      addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
      $('modes').addEventListener('click', e => { const m = e.target.closest('.mode'); if (m) { this.mode = m.dataset.mode; this.renderSetup(); } });
      $('modes').addEventListener('dblclick', e => { if (e.target.closest('.mode')) this.start(); });
      $('cats').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) { this.cat = c.dataset.cat; this.renderSetup(); } });
      $('ai-levels').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { this.aiLevel = b.dataset.lvl; this.renderSetup(); } });
      $('start').addEventListener('click', () => this.start());
      $('search').addEventListener('submit', e => { e.preventDefault(); this.playerGuess(); });
      $('hint').addEventListener('click', () => this.useHint());
      $('pass').addEventListener('click', () => this.pass());
      $('next').addEventListener('click', () => this.nextRound());
      $('quit').addEventListener('click', () => this.confirmQuit());
      $('profile').addEventListener('click', () => this.open('settings'));
      document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => this.open(b.dataset.open)));
      $('modal').addEventListener('click', e => { if (e.target === $('modal') || e.target.closest('.close')) this.closeModal(); });
      addEventListener('keydown', e => {
        if (e.key === 'Escape' && !$('modal').classList.contains('hidden')) this.closeModal();
        else if (e.key === 'Enter' && !$('banner').classList.contains('hidden') && $('modal').classList.contains('hidden') && document.activeElement !== $('guess')) { e.preventDefault(); this.nextRound(); }
      });
      $('guess').addEventListener('input', () => { if (this.g && this.g.turn !== 'ai') Sound.key(); });
    },

    /* ---------- game flow ---------- */
    start() {
      Sound.init();
      const M = MODES[this.mode], today = AF.today();
      const daily = this.mode === 'daily' ? today : null;
      const qs = AF.pickQuestions(this.mode === 'speed' ? 40 : M.rounds, daily ? null : this.cat, { daily, seen: this.p.seen });
      const [aiName, aiEmoji] = AF.AI_NAMES[Math.floor(Math.random() * AF.AI_NAMES.length)];
      this.token++;
      this.g = {
        mode: this.mode, M, qs, idx: -1, score: 0, hints: M.hints, hintsUsed: 0, streak: 0, maxStreak: 0, found: 0,
        rounds: [], practice: daily && this.dailyDone(), daily,
        me: { pts: 0, x: 0 }, ai: { pts: 0, x: 0, name: aiName, emoji: aiEmoji, level: this.aiLevel }, turn: 'me',
        time: M.time || 0, over: false
      };
      $('home').classList.add('hidden');
      $('game').classList.remove('hidden');
      $('mini-logo').classList.remove('hidden');
      $('versus').classList.toggle('hidden', this.mode !== 'versus');
      $('g-scorebox').classList.toggle('hidden', this.mode === 'versus');
      $('timer').classList.toggle('hidden', this.mode !== 'speed');
      $('strikes').classList.toggle('hidden', this.mode === 'speed' || this.mode === 'versus');
      $('pass').textContent = this.mode === 'speed' ? 'Skip ▸' : 'Give up';
      if (this.mode === 'versus') {
        const name = this.p.name || 'You';
        $('vs-me-name').textContent = name; $('vs-me-av').textContent = name[0].toUpperCase();
        $('vs-ai-name').textContent = aiName + ' · ' + AF.AI_LEVELS[this.aiLevel].name; $('vs-ai-av').textContent = aiEmoji;
      }
      if (this.mode === 'speed') this.startTimer();
      scrollTo(0, 0);
      this.nextRound();
    },

    startTimer() {
      const tok = this.token;
      let last = performance.now(), lastSec = -1;
      const loop = now => {
        if (tok !== this.token || !this.g || this.g.over) return;
        if ($('modal').classList.contains('hidden') || this.g.inResults) this.g.time -= (now - last) / 1000;
        last = now;
        const s = Math.max(0, Math.ceil(this.g.time));
        $('timer').textContent = s;
        $('timer').classList.toggle('low', s <= 10);
        if (s <= 10 && s !== lastSec && s > 0) Sound.tick();
        lastSec = s;
        if (this.g.time <= 0) { this.endRound('time'); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    nextRound() {
      const g = this.g;
      if (!g) return;
      $('banner').classList.add('hidden');
      g.idx++;
      if (g.mode !== 'speed' && g.idx >= g.M.rounds) { this.finish(); return; }
      if (g.idx >= g.qs.length) g.qs.push(...AF.pickQuestions(10, this.cat, {}));
      const q = g.qs[g.idx];
      g.round = { q, revealed: {}, by: {}, hinted: {}, strikes: 0, tried: new Set(), over: false, points: 0, foundMe: 0 };
      g.me.x = 0; g.ai.x = 0;
      g.turn = g.mode === 'versus' && g.idx % 2 === 1 ? 'ai' : 'me';
      const c = catOf(q.cat);
      $('g-cat').innerHTML = c.icon + ' ' + c.name;
      $('g-cat').style.background = c.color;
      $('g-round').textContent = g.mode === 'speed' ? 'Search ' + (g.idx + 1) : 'Round ' + (g.idx + 1) + ' of ' + g.M.rounds + (g.practice ? ' · practice' : '');
      $('g-query').textContent = q.query;
      $('guess').value = '';
      $('feedback').textContent = g.mode === 'versus' ? '' : 'Finish the search. Type what comes next.';
      $('feedback').className = 'feedback';
      $('board').innerHTML = q.answers.map(a => `<div class="slot" data-r="${a.rank}"><div class="face front"><span class="n">${a.rank + 1}</span><span class="t"></span><span class="p">${fmt(a.points)}</span></div><div class="face back"><span class="n">${a.rank + 1}</span><span class="t"><i>${esc(q.query)}</i> ${esc(a.text)}</span><span class="p"></span></div></div>`).join('');
      $('actions').classList.remove('hidden');
      this.renderStrikes();
      this.renderHint();
      this.renderScore();
      this.setTurn(g.turn);
    },

    setTurn(who) {
      const g = this.g;
      g.turn = who;
      const mine = who === 'me' && !g.round.over;
      $('guess').disabled = !mine; $('go').disabled = !mine;
      $('hint').disabled = !mine || g.hints <= 0;
      $('pass').disabled = !mine;
      if (g.mode === 'versus') {
        $('vs-me').classList.toggle('turn', who === 'me' && !g.round.over);
        $('vs-ai').classList.toggle('turn', who === 'ai' && !g.round.over);
        $('guess').placeholder = who === 'me' ? 'your turn…' : '';
      } else $('guess').placeholder = '…';
      if (mine) setTimeout(() => { if (!$('guess').disabled && $('modal').classList.contains('hidden')) $('guess').focus({ preventScroll: true }); }, 30);
      if (who === 'ai' && !g.round.over) this.aiTurn();
    },

    playerGuess() {
      const g = this.g;
      if (!g || g.round.over || g.turn !== 'me') return;
      const text = $('guess').value.trim();
      if (!text) return;
      $('guess').value = '';
      this.judge(text, 'me');
    },

    async aiTurn() {
      const g = this.g, tok = this.token, rnd = g.round;
      const say = t => { $('vs-ai-say').textContent = t; };
      say(AF.AI_LINES.think[Math.floor(Math.random() * AF.AI_LINES.think.length)]);
      const pick = AF.aiGuess(rnd.q, rnd.revealed, rnd.tried, g.ai.level);
      await wait(pick.think * 1000);
      if (tok !== this.token || rnd !== g.round || rnd.over) return;
      const input = $('guess');
      input.value = '';
      for (const ch of pick.text) {
        input.value += ch;
        Sound.key();
        await wait(70 + Math.random() * 90);
        if (tok !== this.token || rnd !== g.round) return;
      }
      await wait(280);
      if (tok !== this.token || rnd !== g.round || rnd.over) return;
      input.value = '';
      this.judge(pick.text, 'ai');
    },

    judge(text, who) {
      const g = this.g, r = g.round, q = r.q;
      r.tried.add(text.toLowerCase());
      const m = AF.match(q, text, r.revealed);
      const fb = $('feedback');
      if (m.answer) {
        const a = m.answer, pts = r.hinted[a.rank] ? a.points / 2 : a.points;
        r.revealed[a.rank] = who; r.by[a.rank] = who;
        this.flip(a.rank, who, pts);
        if (who === 'me') {
          g.streak++; g.maxStreak = Math.max(g.maxStreak, g.streak); g.found++; r.foundMe++;
          if (g.mode === 'versus') g.me.pts += pts; else g.score += pts;
          r.points += pts;
          if (g.mode === 'speed') g.time += 3;
          Sound.hit(a.rank);
          fb.textContent = a.rank === 0 ? '#1 answer! +' + fmt(pts) : 'Nice! +' + fmt(pts);
        } else {
          g.ai.pts += pts;
          Sound.aiHit();
          $('vs-ai-say').textContent = AF.AI_LINES.hit[Math.floor(Math.random() * AF.AI_LINES.hit.length)];
          fb.textContent = g.ai.name + ' found “' + a.text + '” +' + fmt(pts);
        }
        fb.className = 'feedback ok';
        $('search').classList.remove('shake'); $('search').classList.add('good');
        setTimeout(() => $('search').classList.remove('good'), 500);
        this.announce((who === 'me' ? 'Correct: ' : g.ai.name + ' found: ') + a.text);
        this.renderScore();
        if (Object.keys(r.revealed).length === 10) { this.endRound('clear'); return; }
        if (who === 'ai') this.setTurn('ai');
        else this.renderHint();
        return;
      }
      if (m.dupe) {
        Sound.dupe();
        fb.textContent = '“' + m.dupe.text + '” is already on the board.';
        fb.className = 'feedback';
        if (who === 'ai') this.setTurn('ai');
        return;
      }
      // miss
      Sound.miss();
      const s = $('search');
      s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake');
      fb.textContent = '“' + text + '” is not in the top 10.';
      fb.className = 'feedback bad';
      this.announce('Not on the board');
      if (who === 'me') g.streak = 0;
      if (g.mode === 'speed') return;
      if (g.mode === 'versus') {
        const side = g[who], other = who === 'me' ? 'ai' : 'me';
        side.x++;
        if (who === 'ai') $('vs-ai-say').textContent = AF.AI_LINES.miss[Math.floor(Math.random() * AF.AI_LINES.miss.length)];
        this.renderStrikes();
        if (g[other].x < g.M.strikes) this.setTurn(other);
        else if (side.x < g.M.strikes) this.setTurn(who);
        else this.endRound('strikes');
        return;
      }
      r.strikes++;
      this.renderStrikes();
      if (r.strikes >= g.M.strikes) this.endRound('strikes');
    },

    flip(rank, who, pts) {
      const el = $('board').querySelector(`.slot[data-r="${rank}"]`);
      if (!el) return;
      el.querySelector('.back .p').textContent = pts ? fmt(pts) : '';
      el.classList.add('flip');
      if (who === 'ai') el.classList.add('by-ai');
      if (who === 'miss') el.classList.add('missed');
      else {
        el.classList.add('pop');
        const b = el.getBoundingClientRect();
        const f = document.createElement('div');
        f.className = 'floater';
        f.textContent = '+' + fmt(pts);
        if (who === 'ai') f.style.color = 'var(--brand2)';
        f.style.left = (b.left + b.width / 2) + 'px'; f.style.top = (b.top - 6) + 'px';
        document.body.appendChild(f);
        setTimeout(() => f.remove(), 1200);
        if (rank === 0 && who === 'me') Confetti.burst(40, b.left + b.width / 2, b.top);
      }
    },

    async endRound(why) {
      const g = this.g, r = g.round;
      if (r.over) return;
      r.over = true;
      this.setTurn(g.turn);
      $('actions').classList.add('hidden');
      const tok = this.token;
      const all = Object.keys(r.revealed).length === 10;
      g.rounds.push({ q: r.q, found: Object.keys(r.by).filter(k => r.by[k] === 'me').map(Number), ai: Object.keys(r.by).filter(k => r.by[k] === 'ai').map(Number), points: r.points, all });
      const st = this.p.stats;
      st.cats[r.q.cat] = (st.cats[r.q.cat] || 0) + 1;
      if (!this.p.seen.includes(r.q.id)) { this.p.seen.push(r.q.id); if (this.p.seen.length > 50) this.p.seen.shift(); }
      if (all && r.foundMe === 10) { Sound.clear(); Confetti.burst(140); }
      if (g.mode === 'versus') { $('vs-me').classList.remove('turn'); $('vs-ai').classList.remove('turn'); }
      const fb = $('feedback');
      if (why === 'strikes') { fb.textContent = g.mode === 'versus' ? 'Both sides struck out!' : 'Three strikes! Here is the full list.'; fb.className = 'feedback bad'; }
      else if (why === 'clear') { fb.textContent = all && r.foundMe === 10 ? 'Perfect board! 🎉' : 'Board cleared!'; fb.className = 'feedback ok'; }
      else if (why === 'time') { fb.textContent = 'Time!'; fb.className = 'feedback bad'; }
      else { fb.textContent = 'Here is the full list.'; fb.className = 'feedback'; }
      // reveal what was missed
      for (const a of r.q.answers) {
        if (r.revealed[a.rank]) continue;
        r.revealed[a.rank] = 'miss';
        this.flip(a.rank, 'miss', 0);
        Sound.flip();
        await wait(g.mode === 'speed' ? 60 : 140);
        if (tok !== this.token) return;
      }
      if (g.mode === 'speed') {
        if (why === 'time') { await wait(900); if (tok === this.token) this.finish(); }
        else { await wait(why === 'clear' ? 900 : 650); if (tok === this.token) this.nextRound(); }
        return;
      }
      const last = g.idx + 1 >= g.M.rounds;
      const mine = g.rounds[g.rounds.length - 1].found.length;
      $('banner-title').textContent = g.mode === 'versus'
        ? `You ${fmt(g.me.pts)} – ${fmt(g.ai.pts)} ${g.ai.name}`
        : `${mine}/10 found · +${fmt(r.points)}`;
      $('banner-sub').textContent = last ? 'That was the last round.' : 'Round ' + (g.idx + 2) + ' is next.';
      $('next').textContent = last ? 'See results ▸' : 'Next round ▸';
      $('banner').classList.remove('hidden');
      $('next').focus({ preventScroll: true });
    },

    pass() {
      const g = this.g;
      if (!g || g.round.over || g.turn !== 'me') return;
      if (g.mode === 'versus') { g.me.x = g.M.strikes; this.renderStrikes(); if (g.ai.x < g.M.strikes) this.setTurn('ai'); else this.endRound('pass'); return; }
      this.endRound('pass');
    },

    useHint() {
      const g = this.g;
      if (!g || g.hints <= 0 || g.round.over || g.turn !== 'me') return;
      const a = g.round.q.answers.find(x => !g.round.revealed[x.rank] && !g.round.hinted[x.rank]);
      if (!a) return;
      g.hints--; g.hintsUsed++;
      g.round.hinted[a.rank] = true;
      const masked = a.text.split(' ').map(w => w[0] + '•'.repeat(Math.max(0, w.length - 1))).join(' ');
      const el = $('board').querySelector(`.slot[data-r="${a.rank}"] .front`);
      el.querySelector('.t').innerHTML = `<span class="hint">${esc(masked)}</span>`;
      el.querySelector('.p').textContent = fmt(a.points / 2);
      Sound.hint();
      $('feedback').textContent = 'Hint: answer #' + (a.rank + 1) + ' is now worth half.';
      $('feedback').className = 'feedback';
      this.renderHint();
      $('guess').focus({ preventScroll: true });
    },

    renderHint() {
      const g = this.g;
      $('hint-n').textContent = '(' + g.hints + ')';
      $('hint').disabled = g.hints <= 0 || g.round.over || g.turn !== 'me';
    },
    renderStrikes() {
      const g = this.g;
      if (g.mode === 'versus') {
        $('vs-me-x').textContent = '✕'.repeat(g.me.x);
        $('vs-ai-x').textContent = '✕'.repeat(g.ai.x);
        return;
      }
      const n = g.round ? g.round.strikes : 0;
      $('strikes').innerHTML = Array.from({ length: g.M.strikes }, (_, i) => `<span class="strike${i < n ? ' on' : ''}">✕</span>`).join('');
    },
    renderScore() {
      const g = this.g;
      $('g-score').textContent = fmt(g.score);
      $('vs-me-pts').textContent = fmt(g.me.pts);
      $('vs-ai-pts').textContent = fmt(g.ai.pts);
    },

    /* ---------- results ---------- */
    finish() {
      const g = this.g, p = this.p, st = p.stats;
      g.over = true; g.inResults = true;
      const score = g.mode === 'versus' ? g.me.pts : g.score;
      const lvlBefore = AF.levelOf(p.xp);
      let xp = Math.round(score / 100);
      let outcome = '';
      if (g.mode === 'versus') {
        if (g.me.pts > g.ai.pts) { outcome = 'win'; st.wins++; xp += 100; }
        else if (g.me.pts < g.ai.pts) { outcome = 'lose'; st.losses++; }
        else outcome = 'draw';
      }
      if (g.practice) xp = Math.round(xp / 4);
      p.xp += xp;
      st.games++;
      st.rounds += g.rounds.length;
      st.found += g.found;
      st.perfect += g.rounds.filter(r => r.found.length === 10).length;
      st.tops += g.rounds.filter(r => r.found.includes(0)).length;
      st.deep += g.rounds.filter(r => r.found.includes(9)).length;
      st.bestRun = Math.max(st.bestRun, g.maxStreak);
      const prevBest = st.best[g.mode] || 0;
      if (!g.practice) st.best[g.mode] = Math.max(prevBest, score);
      if (g.mode === 'speed') st.speedBest = Math.max(st.speedBest, g.found);
      if (g.mode === 'daily' && !g.practice) {
        const d = p.daily, y = new Date(); y.setDate(y.getDate() - 1);
        const yk = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
        d.streak = d.last === yk ? d.streak + 1 : 1;
        d.last = g.daily;
        d.history[g.daily] = { score, rounds: g.rounds.map(r => r.found) };
      }
      // achievements
      const got = [];
      const award = (id, cond) => { if (cond && !p.ach[id]) { p.ach[id] = Date.now(); got.push(AF.ACHIEVEMENTS.find(a => a.id === id)); } };
      award('first', true);
      award('perfect', g.rounds.some(r => r.found.length === 10));
      award('streak5', g.maxStreak >= 5);
      award('mind', g.mode !== 'speed' && g.rounds.length >= 5 && g.rounds.every(r => r.found.includes(0)));
      award('deep', st.deep >= 10);
      award('k50', g.mode === 'classic' && score >= 50000);
      award('nohint', g.mode === 'classic' && g.hintsUsed === 0 && score >= 30000);
      award('rival', outcome === 'win');
      award('buster', outcome === 'win' && g.ai.level === 'hard');
      award('speed20', g.mode === 'speed' && g.found >= 20);
      award('daily3', p.daily.streak >= 3);
      award('explorer', AF.CATEGORIES.every(c => st.cats[c.id]));
      this.save();
      this.renderProfile();
      this.refreshDaily();

      const lvl = AF.levelOf(p.xp), a = AF.xpFor(lvl), b = AF.xpFor(lvl + 1);
      const title = g.mode === 'versus' ? (outcome === 'win' ? 'You win! 🏆' : outcome === 'lose' ? g.ai.name + ' wins' : 'It\'s a draw!')
        : g.mode === 'speed' ? 'Time\'s up!' : g.mode === 'daily' ? 'Daily complete!' : 'Game over';
      const newBest = !g.practice && score > prevBest && prevBest > 0;
      if (outcome === 'lose') Sound.lose(); else { Sound.win(); Confetti.burst(outcome === 'win' || newBest ? 180 : 90); }
      const rounds = g.rounds.slice(0, g.mode === 'speed' ? 8 : 5).map(r => `<div><span>${esc(r.q.query)}…</span><span>${r.found.length}/10${g.mode === 'versus' ? ' · AI ' + r.ai.length : ''}</span></div>`).join('');
      this.showModal(`
        <div class="result-head">
          <h2>${title}</h2>
          <div class="big-score">${fmt(score)}</div>
          <div class="sub">${g.mode === 'versus' ? 'vs ' + esc(g.ai.name) + ' ' + fmt(g.ai.pts) + ' · ' : ''}${newBest ? '🎉 New personal best! · ' : ''}${g.practice ? 'Practice run · ' : ''}${MODES[g.mode].name}</div>
        </div>
        <div class="kpis">
          <div class="kpi"><b>${g.found}</b><span>Found</span></div>
          <div class="kpi"><b>${g.rounds.filter(r => r.found.includes(0)).length}</b><span>#1 hits</span></div>
          <div class="kpi"><b>${g.maxStreak}</b><span>Best run</span></div>
          <div class="kpi"><b>+${xp}</b><span>XP</span></div>
        </div>
        <div class="levelup"><b>Lv ${lvl}</b><span class="xpbar"><i style="width:${Math.round((p.xp - a) / (b - a) * 100)}%"></i></span><b>${lvl > lvlBefore ? '⬆ Level up!' : AF.titleOf(lvl)}</b></div>
        ${got.length ? '<div class="ach-new">' + got.map(x => `<div>${x.icon} Achievement unlocked: ${x.name}</div>`).join('') + '</div>' : ''}
        <h3>Rounds</h3><div class="round-list">${rounds}</div>
        <div class="row-btns">
          ${g.mode === 'daily' ? '<button class="btn hot" id="share">📋 Share result</button>' : ''}
          <button class="btn primary" id="again">Play again</button>
          <button class="btn ghost" id="home-btn">Menu</button>
        </div>`, () => this.toHome());
      $('again').onclick = () => { this.closeModal(true); this.start(); };
      $('home-btn').onclick = () => this.closeModal();
      if ($('share')) $('share').onclick = () => this.share(score);
    },

    share(score) {
      const g = this.g;
      const lines = g.rounds.map(r => Array.from({ length: 10 }, (_, i) => r.found.includes(i) ? '🟪' : '⬜').join(''));
      const text = `Autofeud Daily ${g.daily}\n🔎 ${fmt(score)} pts\n${lines.join('\n')}` + (/^https?:/.test(location.href) ? '\n' + location.href.split('#')[0] : '');
      const done = () => this.toast('Copied! Paste it anywhere.');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => this.copyFallback(text, done));
      else this.copyFallback(text, done);
    },
    copyFallback(text, done) {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { this.toast('Could not copy'); }
      t.remove();
    },

    toHome() {
      this.token++;
      this.g = null;
      $('game').classList.add('hidden');
      $('home').classList.remove('hidden');
      $('mini-logo').classList.add('hidden');
      this.renderSetup();
      scrollTo(0, 0);
    },

    confirmQuit() {
      const g = this.g;
      if (!g || g.over) { this.toHome(); return; }
      this.showModal(`<h2>Leave this game?</h2><p>Your score for this game will not be saved.</p>
        <div class="row-btns"><button class="btn primary" id="stay">Keep playing</button><button class="btn ghost" id="leave">Leave</button></div>`);
      $('stay').onclick = () => this.closeModal();
      $('leave').onclick = () => { this.closeModal(true); this.toHome(); };
    },

    /* ---------- modals ---------- */
    showModal(html, onClose) {
      $('modal-body').innerHTML = html;
      $('modal').classList.remove('hidden');
      this.onClose = onClose || null;
      const f = $('modal').querySelector('.row-btns .btn, input');
      if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
    },
    closeModal(silent) {
      $('modal').classList.add('hidden');
      const cb = this.onClose; this.onClose = null;
      if (cb && !silent) cb();
      if (this.g && !this.g.over && this.g.turn === 'me' && !this.g.round.over) $('guess').focus({ preventScroll: true });
    },
    open(which) {
      if (which === 'help') this.showModal(`
        <h2>How to play</h2>
        <p>A search is cut off, like <b>why do cats …</b>. Guess the 10 most popular ways to finish it.</p>
        <ul>
          <li>Type only what comes next: <b>purr</b> counts for “why do cats purr”.</li>
          <li>Small typos and plurals are fine. One key word is enough.</li>
          <li>Answer #1 is worth 10,000 points, #10 is worth 1,000.</li>
          <li>A wrong guess is a strike. Three strikes end the round.</li>
          <li>💡 Hints show the first letters of the best hidden answer, which then scores half.</li>
        </ul>
        <h3>Modes</h3>
        <ul>
          <li><b>Classic</b>: 5 searches from the category you pick.</li>
          <li><b>Daily Challenge</b>: everyone gets the same 5 searches today. Share your result.</li>
          <li><b>Versus AI</b>: take turns. A hit keeps your turn, a miss passes it. Three misses and you are out for the round.</li>
          <li><b>Speed Rush</b>: 60 seconds, no strikes, every hit adds 3 seconds.</li>
        </ul>
        <p>All searches are written for this game and kept school friendly.</p>`);
      else if (which === 'stats') {
        const p = this.p, s = p.stats, lvl = AF.levelOf(p.xp);
        this.showModal(`
          <h2>Stats</h2>
          <div class="levelup"><b>Lv ${lvl} · ${AF.titleOf(lvl)}</b><span class="xpbar"><i style="width:${Math.round((p.xp - AF.xpFor(lvl)) / (AF.xpFor(lvl + 1) - AF.xpFor(lvl)) * 100)}%"></i></span><b>${fmt(p.xp)} XP</b></div>
          <div class="kpis">
            <div class="kpi"><b>${s.games}</b><span>Games</span></div>
            <div class="kpi"><b>${fmt(s.found)}</b><span>Found</span></div>
            <div class="kpi"><b>${s.perfect}</b><span>Perfect</span></div>
            <div class="kpi"><b>${s.wins}–${s.losses}</b><span>vs AI</span></div>
            <div class="kpi"><b>${fmt(s.best.classic)}</b><span>Best classic</span></div>
            <div class="kpi"><b>${fmt(s.best.daily)}</b><span>Best daily</span></div>
            <div class="kpi"><b>${s.speedBest}</b><span>Best rush</span></div>
            <div class="kpi"><b>${p.daily.streak}</b><span>Daily streak</span></div>
          </div>
          <h3>Achievements · ${Object.keys(p.ach).length}/${AF.ACHIEVEMENTS.length}</h3>
          <div class="ach-grid">${AF.ACHIEVEMENTS.map(a => `<div class="ach${p.ach[a.id] ? ' got' : ''}"><span class="i">${a.icon}</span><span><b>${a.name}</b><small>${a.desc}</small></span></div>`).join('')}</div>`);
      } else if (which === 'settings') {
        const s = this.p.settings;
        this.showModal(`
          <h2>Settings</h2>
          <div class="set" style="display:block"><div style="margin-bottom:8px">Your name</div><input id="set-name" class="text-input" maxlength="16" placeholder="Player" value="${esc(this.p.name)}"></div>
          <div class="set">Sound<button class="switch${s.sound ? ' on' : ''}" id="set-sound" aria-label="Sound"></button></div>
          <div class="set">Animations<button class="switch${s.motion ? ' on' : ''}" id="set-motion" aria-label="Animations"></button></div>
          <div class="set">Theme<div class="seg" id="set-theme">${['auto', 'light', 'dark'].map(t => `<button data-t="${t}" class="${s.theme === t ? 'sel' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
          <div class="set">Progress<button class="btn ghost" id="set-reset">Reset all progress</button></div>`);
        $('set-name').addEventListener('input', e => { this.p.name = e.target.value.trim().slice(0, 16); this.save(); this.renderProfile(); });
        $('set-sound').onclick = e => { s.sound = !s.sound; Sound.on = s.sound; e.currentTarget.classList.toggle('on', s.sound); this.save(); };
        $('set-motion').onclick = e => { s.motion = !s.motion; e.currentTarget.classList.toggle('on', s.motion); this.applyTheme(); this.save(); };
        $('set-theme').onclick = e => { const b = e.target.closest('button'); if (!b) return; s.theme = b.dataset.t; this.applyTheme(); this.save(); $('set-theme').querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); };
        let armed = false;
        $('set-reset').onclick = e => {
          if (!armed) { armed = true; e.currentTarget.textContent = 'Tap again to confirm'; return; }
          this.p = AF.Store.reset(); this.save(); this.applyTheme(); Sound.on = true; this.renderProfile(); this.refreshDaily(); this.renderSetup(); this.closeModal(); this.toast('Progress reset');
        };
      }
    },

    toast(msg) {
      const t = document.createElement('div');
      t.className = 'toast'; t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2200);
    },
    announce(msg) { $('announce').textContent = msg; }
  };

  AF.App = App;
  AF.Sound = Sound;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.boot());
  else App.boot();
})(window.AF = window.AF || {});
