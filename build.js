/* Builds the game from src/:  node build.js
   - index.html       loads css/ and js/ from jsDelivr (gh/ertemr33/feud@main)
   - css/, js/        the files to upload to the root of that repository
   - standalone.html  everything inlined in one file (no CDN needed) */
'use strict';
const fs = require('fs'), path = require('path');
const CDN = 'https://cdn.jsdelivr.net/gh/ertemr33/feud@1f51390/';
const JS = ['data.js', 'engine.js', 'app.js'];
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const out = (f, s) => { fs.mkdirSync(path.dirname(path.join(__dirname, f)), { recursive: true }); fs.writeFileSync(path.join(__dirname, f), s); };

out('css/style.css', src('style.css'));
for (const f of JS) out('js/' + f, src(f));

const tpl = src('index.template.html');
out('index.html', tpl
  .replace('<!--CSS-->', () => `<link rel="stylesheet" href="${CDN}css/style.css">`)
  .replace('<!--JS-->', () => JS.map(f => `<script src="${CDN}js/${f}"></script>`).join('\n  ')));

const js = JS.map(src).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS must not contain </script>');
const single = tpl
  .replace('<!--CSS-->', () => '<style>\n' + src('style.css') + '</style>')
  .replace('<!--JS-->', () => '<script>\n' + js + '</script>');
out('standalone.html', single);
console.log('index.html (CDN) + css/ + js/ + standalone.html', (single.length / 1024).toFixed(1) + ' KB');
