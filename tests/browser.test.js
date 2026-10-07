/* Browser test: NODE_PATH=$(npm root -g) node tests/browser.test.js [shots-dir]   (PAGE=standalone.html to test the single file)
   Plays every mode in Chromium (fonts from jsDelivr are blocked so it runs offline). */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'tests', 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function open(opts) {
    const page = await browser.newPage(opts);
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
    // our own jsDelivr files are served from this folder; everything else (fonts) is blocked
    await page.route(/^https:\/\//, r => {
      const own = r.request().url().split('/gh/ertemr33/feud@main/')[1];
      if (own) return r.fulfill({ path: path.join(ROOT, own.split('?')[0]), contentType: own.endsWith('.css') ? 'text/css' : 'application/javascript' });
      return r.abort();
    });
    await page.goto('file://' + path.join(ROOT, process.env.PAGE || 'index.html'));
    await page.waitForTimeout(600);
    return page;
  }
  const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
  const query = p => p.evaluate(() => AF.App.g.round.q.query);
  const answers = p => p.evaluate(() => AF.App.g.round.q.answers.map(a => a.keys[0]));
  const guess = async (p, t) => { await p.fill('#guess', t); await p.press('#guess', 'Enter'); await p.waitForTimeout(120); };

  const page = await open({ viewport: { width: 1280, height: 860 } });
  await page.waitForTimeout(2500);
  await shot(page, '01-home');

  // Classic: 2 hits, a typo, a dupe, a hint, 3 misses
  await page.click('#start');
  await page.waitForTimeout(300);
  let a = await answers(page);
  await guess(page, a[0]);
  await guess(page, a[3]);
  await guess(page, a[0]);
  await page.click('#hint');
  await guess(page, 'zzzz qqq');
  await page.waitForTimeout(300);
  await shot(page, '02-classic');
  const s1 = await page.evaluate(() => [AF.App.g.score, AF.App.g.round.strikes, AF.App.g.hints]);
  if (s1[0] !== 17000 || s1[1] !== 1 || s1[2] !== 2) errors.push('classic state wrong: ' + s1);
  await guess(page, 'xxyyzz');
  await guess(page, 'wwvvuu');
  await page.waitForTimeout(2200);
  await shot(page, '03-round-over');
  if (await page.isHidden('#banner')) errors.push('banner should show after 3 strikes');
  // finish the game: perfect board in round 2, give up the rest
  await page.click('#next');
  a = await answers(page);
  for (const k of a) await guess(page, k);
  await page.waitForTimeout(1800);
  await shot(page, '04-perfect');
  for (let i = 0; i < 3; i++) { await page.click('#next'); await page.click('#pass'); await page.waitForTimeout(1700); }
  await page.click('#next');
  await page.waitForTimeout(600);
  await shot(page, '05-results');
  if (await page.isHidden('#modal')) errors.push('results modal missing');
  await page.click('#home-btn');

  // Versus vs Hard AI
  await page.click('.mode[data-mode="versus"]');
  await page.click('#ai-levels button[data-lvl="hard"]');
  await page.click('#start');
  await page.waitForTimeout(300);
  await guess(page, 'qqqqq zz'); // miss -> AI turn
  await page.waitForTimeout(6000);
  await shot(page, '06-versus');
  const vs = await page.evaluate(() => ({ turn: AF.App.g.turn, ai: AF.App.g.ai.pts, aix: AF.App.g.ai.x }));
  console.log('versus after AI turn:', JSON.stringify(vs));
  if (vs.ai === 0 && vs.aix === 0) errors.push('AI never played');
  await page.evaluate(() => AF.App.confirmQuit());
  await page.click('#leave');

  // Speed Rush
  await page.click('.mode[data-mode="speed"]');
  await page.click('#start');
  await page.waitForTimeout(300);
  a = await answers(page);
  await guess(page, a[1]);
  await guess(page, 'nope nope');
  await page.click('#pass');
  await page.waitForTimeout(1200);
  await shot(page, '07-speed');
  const sp = await page.evaluate(() => [AF.App.g.idx, AF.App.g.time]);
  if (sp[0] !== 1 || sp[1] < 60) errors.push('speed: skip/time bonus wrong ' + sp);
  await page.evaluate(() => { AF.App.g.time = 0.2; });
  await page.waitForTimeout(2500);
  if (await page.isHidden('#modal')) errors.push('speed results missing');
  await page.click('#home-btn');

  // Daily + share + settings/stats
  await page.click('.mode[data-mode="daily"]');
  await page.click('#start');
  const dq = await query(page);
  for (let i = 0; i < 5; i++) { await page.click('#pass'); await page.waitForTimeout(1700); await page.click('#next'); }
  await page.waitForTimeout(600);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.click('#share');
  await page.waitForTimeout(300);
  await page.click('#home-btn');
  const badge = await page.textContent('#daily-badge');
  if (!badge.includes('✓')) errors.push('daily not marked done');
  const again = await page.evaluate(() => AF.pickQuestions(5, null, { daily: AF.today() })[0].query);
  if (again !== dq) errors.push('daily not deterministic');
  await page.click('[data-open="stats"]');
  await page.waitForTimeout(300);
  await shot(page, '08-stats');
  await page.click('.modal .close');
  await page.click('[data-open="settings"]');
  await page.click('#set-theme button[data-t="dark"]');
  await page.click('.modal .close');
  await page.waitForTimeout(300);
  await shot(page, '09-dark-home');

  // persistence
  const games = await page.evaluate(() => JSON.parse(localStorage.getItem('autofeud.v1')).stats.games);
  if (games < 3) errors.push('stats not saved: ' + games);

  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.waitForTimeout(1500);
  await shot(mobile, '10-mobile-home');
  await mobile.tap('#start');
  await mobile.waitForTimeout(300);
  a = await answers(mobile);
  await guess(mobile, a[2]);
  await mobile.waitForTimeout(700);
  await shot(mobile, '11-mobile-game');
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) errors.push('mobile has horizontal scroll');

  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('Browser test passed (' + OUT + ')');
})().catch(e => { console.error(e); process.exit(1); });
