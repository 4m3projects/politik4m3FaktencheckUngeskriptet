/* [Codex] Drei reale Videos und gemeinsame Vergleichsansicht zu #13. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const O = 'OQnvClWgN-g', A = 'qQAcmDzd9O8', P = 'L7E04TJtRBU';
function build() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'p4m3-krall-'));
  for (const f of ['index.html', 'app.js', 'style.css', 'sync.js', 'relations.js', 'video.js']) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
  const videos = [];
  const base = path.join(ROOT, 'faktenchecks');
  fs.mkdirSync(path.join(out, 'daten'));
  for (const id of fs.readdirSync(base).filter(id => /^[\w-]{11}$/.test(id))) {
    const source = path.join(base, id);
    if (!fs.existsSync(path.join(source, 'README.md'))) continue;
    const files = [];
    function copy(rel) {
      for (const e of fs.readdirSync(path.join(source, rel), { withFileTypes: true })) {
        const r = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) copy(r);
        else if (e.name.endsWith('.md') || /^strukturiert\/(aussagen|statistik)\.json$/.test(r)) {
          fs.mkdirSync(path.dirname(path.join(out, 'daten', id, r)), { recursive: true });
          fs.copyFileSync(path.join(source, r), path.join(out, 'daten', id, r));
          if (e.name.endsWith('.md')) files.push(r);
        }
      }
    }
    copy('');
    const video = JSON.parse(fs.readFileSync(path.join(source, 'video.json'), 'utf8'));
    videos.push({ id, title: video.title, video, files: files.sort(), structured: fs.existsSync(path.join(source, 'strukturiert/aussagen.json')) });
  }
  fs.copyFileSync(path.join(base, 'beziehungen.json'), path.join(out, 'daten/beziehungen.json'));
  fs.writeFileSync(path.join(out, 'daten/index.json'), JSON.stringify({ videos, repository: '4m3projects/politik4m3FaktencheckUngeskriptet', commit: 'krall-test', generated: '2026-11-18T00:00:00Z' }));
  return out;
}
async function main() {
  const out = build();
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(out, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(out + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': (mime[path.extname(file)] || 'text/plain') + '; charset=utf-8' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    const errors = [], external = [];
    const base = `http://127.0.0.1:${server.address().port}/`;
    await page.route(u => !u.href.startsWith(base), r => { external.push(r.request().url()); return r.abort(); });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    async function open(hash) {
      await page.goto(base + hash);
      await page.waitForFunction(() => !/Daten werden geladen/.test(document.getElementById('inhalt').innerText));
    }
    await open('#/');
    const cards = await page.locator('.cards a.card').evaluateAll(a => a.map(e => e.getAttribute('href')));
    assert.ok(cards.includes('#/video/' + O));
    assert.ok(!cards.some(h => h.includes(A) || h.includes(P)));
    console.log('ok Startseite: Krall-Original, beide Reaktionen ausschließlich zugeordnet');
    for (const id of [O, A, P]) {
      await open('#/video/' + id);
      const link = page.locator('a.case-comparison');
      assert.equal(await link.count(), 1, id);
      assert.equal(await link.getAttribute('href'), `#/video/${O}/bericht/vergleich.md`);
      const text = await page.locator('#inhalt').innerText();
      if (id === O) {
        assert.match(text, /Alfred räumt auf/);
        assert.match(text, /Politik4m3/);
      } else assert.ok(await page.locator(`.role-line a[href="#/video/${O}"]`).count());
      await link.click();
      await page.locator('.prose h1').waitFor();
      assert.match(await page.locator('.prose h1').innerText(), /Original, Alfred und Politik4M3/);
    }
    console.log('ok Alle drei Detailseiten öffnen denselben gemeinsamen Vergleich');
    const rows = await page.locator('.prose tbody tr').count();
    assert.ok(rows >= 20, 'mindestens zwanzig Themen mit drei getrennten Positionen');
    const refs = await page.locator('.prose a[href*="/aussage/"]').evaluateAll(a => a.map(e => e.getAttribute('href')));
    for (const id of [O, A, P]) assert.ok(refs.some(h => h.startsWith(`#/video/${id}/aussage/`)));
    for (const href of [...new Set(refs)]) {
      await open(href);
      const claim = href.split('/').at(-1);
      assert.equal(await page.locator(`[id="${claim}"]`).count(), 1, href);
    }
    console.log(`ok Vergleich: ${rows} Themen, alle ${new Set(refs).size} konkreten Aussagenlinks erreichbar`);
    await open(`#/video/${A}/aussage/${A}-A0031`);
    assert.match(await page.locator(`[id="${A}-A0031"]`).innerText(), /In Bearbeitung/);
    await page.locator(`[id="${A}-A0031"] details`).evaluate(e => { e.open = true; });
    assert.match(await page.locator(`[id="${A}-A0031"]`).innerText(), /Unabhängigkeit|Unabhängigkeits/);
    console.log('ok Nicht nachgewiesene Vollprüfungs-/Indexmethodik bleibt sichtbar offen');
    for (const width of [390, 760]) {
      await page.setViewportSize({ width, height: 850 });
      for (const hash of [`#/video/${O}`, `#/video/${A}`, `#/video/${O}/bericht/vergleich.md`]) {
        await open(hash);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 0) {
          console.log(await page.evaluate(() => [...document.querySelectorAll('#inhalt *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(e => ({ tag: e.tagName, class: e.className, right: e.getBoundingClientRect().right, text: e.innerText.slice(0, 80) }))));
          if (process.env.SCREENSHOTS) {
            fs.mkdirSync(process.env.SCREENSHOTS, { recursive: true });
            await page.screenshot({ path: path.join(process.env.SCREENSHOTS, 'krall-overflow.png'), fullPage: true });
          }
        }
        assert.ok(overflow <= 0, `${width}px ${hash}: ${overflow}px Überlauf`);
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, [], 'keine ungefragten Fremdanfragen');
    console.log('ok Mobil/Tablet: kein Seitenüberlauf, keine fehlenden Dateien oder Fremdanfragen');
    if (process.env.SCREENSHOTS) {
      fs.mkdirSync(process.env.SCREENSHOTS, { recursive: true });
      await page.setViewportSize({ width: 1360, height: 900 });
      await open(`#/video/${O}/bericht/vergleich.md`);
      await page.screenshot({ path: path.join(process.env.SCREENSHOTS, 'krall-vergleich.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 850 });
      await page.screenshot({ path: path.join(process.env.SCREENSHOTS, 'krall-vergleich-mobil.png'), fullPage: true });
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(r => server.close(r));
    fs.rmSync(out, { recursive: true, force: true });
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
