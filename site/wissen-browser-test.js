/*
 * Browsertest der öffentlichen Themen-Wissensdatenbank (themen.js) mit Playwright.
 * Ausführen (Playwright und Chromium müssen lokal vorhanden sein): node site/wissen-browser-test.js
 * Wird nicht veröffentlicht und nicht im Workflow ausgeführt. Externe Anfragen werden blockiert.
 * Optional: SCREENSHOTS=<Verzeichnis> speichert Bildschirmfotos.
 */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');

/* Seite wie im Workflow zusammenstellen (vereinfachte Nachbildung, nur JSON-Daten). */
function buildSite() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'p4m3-wissen-'));
  for (const f of ['index.html', 'style.css', 'app.js', 'sync.js', 'video.js', 'relations.js', 'rhetoric.js', 'ampel.js', 'wissen.js', 'themen.js']) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
  fs.mkdirSync(path.join(out, 'daten'));
  const videos = [];
  const base = path.join(ROOT, 'faktenchecks');
  for (const id of fs.readdirSync(base).filter(x => /^[A-Za-z0-9_-]{11}$/.test(x))) {
    const dir = path.join(base, id);
    const d = path.join(out, 'daten', id, 'strukturiert');
    fs.mkdirSync(d, { recursive: true });
    for (const f of ['aussagen.json', 'statistik.json']) if (fs.existsSync(path.join(dir, 'strukturiert', f))) fs.copyFileSync(path.join(dir, 'strukturiert', f), path.join(d, f));
    fs.copyFileSync(path.join(dir, 'README.md'), path.join(out, 'daten', id, 'README.md'));
    if (fs.existsSync(path.join(dir, 'rhetorik.json'))) fs.copyFileSync(path.join(dir, 'rhetorik.json'), path.join(out, 'daten', id, 'rhetorik.json'));
    const title = (/^# (.+)$/m.exec(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')) || [])[1] || id;
    videos.push({ id, title, structured: true, rhetoric: fs.existsSync(path.join(dir, 'rhetorik.json')), files: ['README.md'], video: JSON.parse(fs.readFileSync(path.join(dir, 'video.json'), 'utf8')) });
  }
  fs.copyFileSync(path.join(base, 'beziehungen.json'), path.join(out, 'daten', 'beziehungen.json'));
  fs.writeFileSync(path.join(out, 'daten', 'index.json'), JSON.stringify({ generated: new Date().toISOString(), commit: 'test', repository: '4m3projects/politik4m3FaktencheckUngeskriptet', videos }));
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'wissen.js'), 'export', path.join(out, 'daten', 'wissen.json')]);
  return out;
}

function serve(dir) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain; charset=utf-8' };
  const server = http.createServer((req, res) => {
    const p = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!p.startsWith(dir) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

const results = [];
async function step(name, fn) {
  try { await fn(); results.push(['ok', name]); console.log('ok   ' + name); }
  catch (e) { results.push(['FAIL', name, e.message]); console.log('FAIL ' + name + '\n     ' + e.message.split('\n').join('\n     ')); }
}

(async () => {
  const dir = buildSite();
  const server = await serve(dir);
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const shot = async name => { if (process.env.SCREENSHOTS) await page.screenshot({ path: path.join(process.env.SCREENSHOTS, name + '.png'), fullPage: true }); };

  await step('Navigation enthält „Themen“', async () => {
    await page.goto(url + '#/');
    await page.waitForSelector('.card');
    assert.equal(await page.locator('.mainnav a[data-nav="themen"]').count(), 1);
  });
  await step('Themenübersicht zeigt öffentliche Hauptthemen, interne getrennt', async () => {
    await page.goto(url + '#/themen');
    await page.waitForSelector('.topic-card');
    const names = await page.locator('.topic-card h3').allTextContents();
    for (const n of ['Klima', 'Energie', 'Geld', 'Staatsfinanzen']) assert.ok(names.includes(n), n + ' fehlt: ' + names.join(', '));
    assert.ok(!names.includes('Argentinien'), 'Argentinien ist nur in einem Video ausreichend behandelt');
    assert.ok((await page.locator('.topic-others').innerText()).includes('Argentinien'));
    assert.equal(await page.locator('.mainnav a[aria-current="page"]').getAttribute('data-nav'), 'themen');
    await shot('themen');
  });
  await step('Suche findet Themen und Aussagen', async () => {
    await page.fill('#kb-q', 'Windkraft Energie');
    await page.waitForSelector('#kb-results li');
    const t = await page.locator('#kb-results').innerText();
    assert.match(t, /Windkraft/);
  });
  await step('Themenseite Windkraft: Abschnitte, Herkunft, Empfehlungsbegründung', async () => {
    await page.goto(url + '#/thema/energie/windkraft');
    await page.waitForSelector('h1');
    assert.equal(await page.locator('h1').innerText(), 'Windkraft');
    assert.ok(await page.locator('#belegt .kb-item').count() > 0, 'belegte Tatsachen');
    assert.ok(await page.locator('#falsch .kb-item').count() > 0, 'widerlegte Behauptungen');
    const first = page.locator('.kb-origin a').first();
    assert.match(await first.getAttribute('href'), /^#\/video\/[A-Za-z0-9_-]{11}\/aussage\//);
    if (await page.locator('#empfehlungen').count()) assert.match(await page.locator('#empfehlungen').innerText(), /Warum:/);
    await shot('thema-windkraft');
  });
  await step('Unbelegt steht nie unter „falsch“', async () => {
    for (const id of ['geld', 'staatsfinanzen', 'stasi', 'klima']) {
      await page.goto(url + '#/thema/' + id);
      await page.waitForSelector('h1');
      const txt = await page.locator('#falsch').innerText().catch(() => '');
      assert.ok(!txt.includes('Nicht ausreichend belegbar'), id);
    }
  });
  await step('Internes Thema ist erreichbar und gekennzeichnet', async () => {
    await page.goto(url + '#/thema/argentinien');
    await page.waitForSelector('h1');
    assert.match(await page.locator('.video-head').innerText(), /noch keine eigene Kategorie/);
  });
  await step('Videoseite zeigt Themen-Chips', async () => {
    await page.goto(url + '#/video/OQnvClWgN-g');
    await page.waitForSelector('.topic-line');
    const t = await page.locator('.topic-line').innerText();
    assert.match(t, /Klima/);
    await page.locator('.topic-line a', { hasText: 'Klima' }).click();
    await page.waitForSelector('h1:text("Klima")');
  });
  await step('Unbekanntes Thema: Hinweis statt Absturz', async () => {
    await page.goto(url + '#/thema/gibt-es-nicht');
    await page.waitForSelector('.notice.warn');
  });
  await step('Schmale Ansicht ohne waagrechtes Scrollen', async () => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(url + '#/thema/geld');
    await page.waitForSelector('h1');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 1, 'Überbreite ' + over);
    await shot('thema-geld-mobil');
  });
  await step('Keine Skriptfehler', async () => { assert.deepEqual(errors, []); });

  await browser.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  const failed = results.filter(r => r[0] !== 'ok');
  console.log(`\n${results.length - failed.length}/${results.length} bestanden`);
  process.exitCode = failed.length ? 1 : 0;
})();
