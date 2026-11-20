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
  for (const f of ['index.html', 'style.css', 'app.js', 'sync.js', 'video.js', 'relations.js', 'rhetoric.js', 'faktenindex.js', 'faktenindex-ui.js', 'rangliste.js', 'wissen.js', 'gegendarstellung.js', 'themen.js', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
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
  const wf = path.join(out, 'daten', 'wissen.json');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'wissen.js'), 'export', wf]);
  // Nur im Test: ein ausgedachter umgesetzter Korrekturvorgang, um das öffentliche Protokoll zu prüfen.
  const w = JSON.parse(fs.readFileSync(wf, 'utf8'));
  w.corrections = (w.corrections || []).concat({ id: 'UG-C9999', kind: 'Fehlbewertung', date: '2026-11-19', decidedBy: 'Test', basis: 'Testvorgang.', description: 'Testkorrektur für den Browsertest.',
    evidence: [{ title: 'Testquelle', url: 'https://example.org/test', accessedOn: '2026-11-19', finding: 'Testbefund.' }],
    changes: [{ target: 'L7E04TJtRBU-A0012', field: 'verdict', before: 'Teilweise belegt', after: 'Belegt' }], topics: ['geld/ezb'] });
  fs.writeFileSync(wf, JSON.stringify(w));
  return out;
}

function serve(dir) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.json': 'application/json', '.md': 'text/plain; charset=utf-8' };
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
  // Vorschaubilder nicht aus dem Netz laden: ein graues Ersatzbild statt YouTube.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+v9/PQAJaAPNQ6R2HgAAAABJRU5ErkJggg==', 'base64');
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
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
    for (const id of ['geld', 'geld/ezb', 'staatsfinanzen', 'stasi', 'klima']) {
      await page.goto(url + '#/thema/' + id);
      await page.waitForSelector('h1');
      const txt = await page.locator('#falsch').innerText().catch(() => '');
      assert.ok(!txt.includes('Nicht ausreichend belegbar'), id);
    }
  });
  await step('Wissenseinträge erscheinen mit Herkunft, verknüpfte Aussagen nicht doppelt', async () => {
    await page.goto(url + '#/thema/geld/ezb');
    await page.waitForSelector('h1');
    const entries = page.locator('.kb-entry');
    if (!(await entries.count())) return; // Bestand ohne Einträge: nichts zu prüfen
    const txt = await page.locator('main').innerText();
    const ids = await page.locator('.kb-origin a').evaluateAll(as => as.map(a => a.getAttribute('href').split('/').pop()));
    const linked = await page.evaluate(() => state.wissen.raw.entries.flatMap(e => e.links.filter(l => l.relation === 'gleichwertig').map(l => l.claimId)));
    for (const id of linked) assert.ok(!ids.includes(id), id + ' doppelt');
    assert.match(txt, /Wissenseintrag/);
    await shot('thema-ezb');
  });
  await step('Wissenseintrag: aufklappbare Videoliste mit Links zur Aussage und zur Stelle', async () => {
    await page.goto(url + '#/thema/geld');
    await page.waitForSelector('h1');
    const occ = page.locator('.kb-entry .kb-occ').first();
    assert.equal(await occ.count(), 1, 'Videoliste fehlt');
    assert.match(await occ.locator('summary').innerText(), /In \d+ von uns geprüften Videos/);
    assert.equal(await occ.locator('.occ-list').isVisible(), false, 'zunächst eingeklappt');
    await occ.locator('summary').click();
    await occ.locator('.occ-list').waitFor();
    const items = occ.locator('.occ-item');
    assert.ok(await items.count() >= 2, 'mindestens zwei Videos');
    const hrefs = await items.locator('a[href^="#/video/"]').evaluateAll(as => as.map(a => a.getAttribute('href')));
    assert.ok(hrefs.every(h => /^#\/video\/[A-Za-z0-9_-]{11}\/aussage\/[A-Za-z0-9_-]{11}-A\d{4}$/.test(h)), hrefs.join(', '));
    assert.ok(await items.locator('a[href*="t="]').count() >= 1, 'Zeitmarke bei YouTube');
    /* Gesamt-Faktenampel des Videos je Eintrag, berechnet wie auf der Videoseite (site/faktenindex.js). */
    assert.equal(await items.locator('.occ-ampel .ampel').count(), await items.count(), 'Video-Ampel je Eintrag');
    for (const it of await items.all()) {
      const vid = (await it.locator('a[href^="#/video/"]').first().getAttribute('href')).split('/')[2];
      const expect = await page.evaluate(id => { const v = state.videos.get(id); return FactIndex.rate(v.data, v.video).key; }, vid);
      assert.match(await it.locator('.occ-ampel .ampel').getAttribute('class'), new RegExp('ampel-' + expect + '\\b'), vid);
    }
    assert.match(await items.first().innerText(), /Diese Aussage:/);
    assert.equal(await page.locator('img[src*="ytimg"]').count(), 0, 'ohne Zustimmung keine Vorschaubilder');
    assert.equal(await page.locator('.thumb-ask').count(), 1, 'Frage nach Vorschaubildern');
    await shot('thema-geld-videos');
    await page.click('[data-thumbs="ja"]');
    await page.waitForSelector('.kb-entry .kb-occ');
    await page.locator('.kb-entry .kb-occ summary').first().click();
    assert.ok(await page.locator('.kb-occ img.occ-thumb[src^="https://i.ytimg.com/vi/"]').count() >= 2, 'Vorschaubilder nach Zustimmung');
    assert.ok(await page.locator('.kb-origin img.origin-thumb').count() >= 1, 'Vorschaubild bei Einzelaussagen');
    await shot('thema-geld-videos-bilder');
    await page.locator('.kb-occ .occ-body a[href*="/aussage/"]').first().click();
    await page.waitForFunction(() => /#\/video\/.+\/aussage\//.test(location.hash));
    await page.evaluate(() => { localStorage.removeItem('p4m3.ytVorschaubilder'); state.thumbChoice = null; });
  });
  await step('Korrekturprotokoll: Übersicht und betroffene Themenseite, nicht auf fremden Themen', async () => {
    await page.goto(url + '#/themen');
    await page.waitForSelector('#korrekturen');
    const t = await page.locator('#korrekturen').innerText();
    assert.match(t, /UG-C9999/);
    assert.match(t, /Teilweise belegt\s*→\s*Belegt/);
    assert.match(await page.locator('#korrekturen .kb-correction').filter({ hasText: 'UG-C9999' }).locator('.kb-changes a').first().getAttribute('href'), /^#\/video\/L7E04TJtRBU\/aussage\/L7E04TJtRBU-A0012$/);
    for (const [id, expect] of [['geld', true], ['geld/ezb', true], ['klima', false]]) {
      await page.goto(url + '#/thema/' + id);
      await page.waitForSelector('h1');
      assert.equal(await page.locator('#korrekturen .kb-correction').filter({ hasText: 'UG-C9999' }).count(), expect ? 1 : 0, id);
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
  await step('Gegendarstellung: widerlegte Aussage zeigt belegte Gegenaussage aus anderem Video mit Zeitmarke', async () => {
    await page.goto(url + '#/video/OQnvClWgN-g/aussage/OQnvClWgN-g-A0003');
    await page.waitForSelector('.claim');
    const box = page.locator('[id="OQnvClWgN-g-A0003"] .counter');
    assert.equal(await box.count(), 1);
    const t = await box.innerText();
    assert.match(t, /Gegendarstellung/);
    assert.match(t, /Belegt/);
    assert.match(await box.locator('.counter-main a[href*="/aussage/L7E04TJtRBU-A0007"]').first().getAttribute('href'), /L7E04TJtRBU-A0007/);
    assert.ok(await box.locator('a[href*="youtube"][href*="t="]').count() > 0 || await box.locator('a[href*="youtu"]').count() > 0, 'Zeitmarken-Link fehlt');
    assert.ok(await box.locator('.ampel').count() > 0, 'Ampel des Gegenvideos fehlt');
    await shot('gegendarstellung');
  });
  await step('Gegendarstellung: mehrere Gegenaussagen, beste vorn, Rest aufklappbar', async () => {
    const box = page.locator('[id="OQnvClWgN-g-A0009"] .counter');
    assert.equal(await box.count(), 1);
    assert.equal(await box.locator('.counter-main').count(), 1);
    assert.match(await box.locator('.counter-more summary').innerText(), /weitere/);
  });
  await step('Gegendarstellung: belegte Aussagen bekommen keine', async () => {
    const ids = await page.evaluate(() => [...document.querySelectorAll('.claim')].filter(el => el.querySelector('.counter')).map(el => el.id));
    const verdicts = await page.evaluate(ids => ids.map(id => document.getElementById(id).querySelector('.claim-top .badge').innerText), ids);
    assert.ok(ids.length >= 10, 'zu wenige: ' + ids.length);
    for (const v of verdicts) assert.ok(!/^(Belegt|Teilweise belegt)/.test(v.trim()), v);
  });
  await step('Gegendarstellung erscheint auch neben dem laufenden Video', async () => {
    await page.goto(url + '#/video/OQnvClWgN-g/video');
    await page.waitForSelector('.vc-item');
    assert.ok(await page.locator('.vc-item .counter-compact').count() >= 10);
    await shot('gegendarstellung-video');
  });
  await step('Gegendarstellung über die Wissensdatenbank (ohne Reaktionsbeziehung)', async () => {
    await page.goto(url + '#/video/mlxFA9T88I0/aussage/mlxFA9T88I0-A0276');
    await page.waitForSelector('.claim');
    const box = page.locator('[id="mlxFA9T88I0-A0276"] .counter');
    assert.equal(await box.count(), 1);
    assert.match(await box.innerText(), /Wissensdatenbank/);
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
