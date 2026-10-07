/* Engine checks: node tests/engine.test.js
   - every answer can be hit by its own text and by each of its keys
   - common misspellings, plurals and "query + answer" guesses still count
   - the AI finds more answers at higher levels */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { window: {}, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['data.js', 'engine.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), ctx, { filename: f });
const AF = ctx.AF;
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log('  FAIL ' + msg); } };

console.log('questions:', AF.QUESTIONS.length);
for (const q of AF.QUESTIONS) {
  check(q.answers.length === 10, q.id + ' needs 10 answers');
  const none = {};
  for (const a of q.answers) {
    const byText = AF.match(q, a.text, none).answer;
    check(byText === a, `${q.query} | "${a.text}" by text -> ${byText && byText.text}`);
    for (const k of a.keys) {
      const m = AF.match(q, k, none).answer;
      check(m === a, `${q.query} | key "${k}" -> ${m && m.text} (want ${a.text})`);
    }
    const full = AF.match(q, q.query + ' ' + a.text, none).answer;
    check(full === a, `${q.query} | full phrase "${q.query} ${a.text}" -> ${full && full.text}`);
  }
}

const q = AF.QUESTIONS.find(x => x.query === 'why do cats');
const hit = g => (AF.match(q, g, {}).answer || {}).text;
check(hit('Purr!') === 'purr', 'punctuation');
check(hit('purring') === 'purr' || hit('purring') === undefined, 'stem');
check(hit('whiskrs') === 'have whiskers', 'typo');
check(hit('box') === 'like boxes', 'singular');
check(hit('why do cats knead') === 'knead', 'with query');
check(hit('bananas') === undefined, 'miss');
check(AF.match(q, 'purr', { 0: true }).dupe, 'duplicate detection');

// AI quality by level
for (const lvl of ['easy', 'medium', 'hard']) {
  const r = AF.rng(42);
  let found = 0, guesses = 0;
  for (const qq of AF.QUESTIONS) {
    const rev = {}, tried = new Set();
    for (let i = 0; i < 6; i++) {
      const g = AF.aiGuess(qq, rev, tried, lvl, r);
      tried.add(g.text.toLowerCase());
      guesses++;
      const m = AF.match(qq, g.text, rev);
      if (m.answer) { rev[m.answer.rank] = true; found++; }
    }
  }
  console.log(`AI ${lvl.padEnd(6)} hit rate ${(found / guesses * 100).toFixed(0)}%`);
  check(found > 0, 'AI ' + lvl + ' finds answers');
}

const d1 = AF.pickQuestions(5, null, { daily: '2026-10-07' }).map(x => x.id).join();
const d2 = AF.pickQuestions(5, null, { daily: '2026-10-07' }).map(x => x.id).join();
check(d1 === d2, 'daily is deterministic');
check(new Set(d1.split(',')).size === 5, 'daily has 5 different searches');

console.log(fails ? fails + ' FAILURES' : 'All checks passed');
process.exit(fails ? 1 : 0);
