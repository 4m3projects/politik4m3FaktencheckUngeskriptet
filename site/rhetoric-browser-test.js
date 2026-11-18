/*
 * Browsertest der zweiten Bewertungsebene (Rhetorik) mit Playwright.
 * Ausführen (Playwright und Chromium müssen lokal vorhanden sein): node site/rhetoric-browser-test.js
 * Wird nicht veröffentlicht und nicht im Workflow ausgeführt. Alle Anfragen an fremde Hosts werden abgefangen.
 * Baut die Seite zweimal: mit den echten rhetorik.json-Dateien und ohne sie (Rückwärtskompatibilität).
 */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SITE_FILES = ['index.html', 'style.css', 'app.js', 'sync.js', 'video.js', 'relations.js', 'rhetoric.js', 'ampel.js'];

function buildSite(withRhetoric) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'p4m3-rhet-'));
  for (const f of SITE_FILES) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
  const base = path.join(ROOT, 'faktenchecks');
  const videos = [];
  for (const id of fs.readdirSync(base).filter(x => /^[A-Za-z0-9_-]{11}$/.test(x)).sort()) {
    const dir = path.join(base, id);
    if (!fs.existsSync(path.join(dir, 'README.md'))) continue;
    const files = [];
    const walk = rel => {
      for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
        const r = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) walk(r); else if (e.name.endsWith('.md')) files.push(r);
      }
    };
    walk('');
    for (const f of files) {
      fs.mkdirSync(path.dirname(path.join(out, 'daten', id, f)), { recursive: true });
      fs.copyFileSync(path.join(dir, f), path.join(out, 'daten', id, f));
    }
    const structured = fs.existsSync(path.join(dir, 'strukturiert', 'aussagen.json'));
    if (structured) for (const f of ['aussagen.json', 'statistik.json']) {
      const p = path.join(dir, 'strukturiert', f);
      if (fs.existsSync(p)) fs.copyFileSync(p, path.join(out, 'daten', id, 'strukturiert', f));
    }
    const rp = path.join(dir, 'rhetorik.json');
    const rhetoric = withRhetoric && fs.existsSync(rp);
    if (rhetoric) fs.copyFileSync(rp, path.join(out, 'daten', id, 'rhetorik.json'));
    const mp = path.join(dir, 'video.json');
    const title = (/^# (.+)$/m.exec(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')) || [])[1] || id;
    videos.push({ id, title, structured, rhetoric, files: files.sort(), video: fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : null });
  }
  fs.copyFileSync(path.join(base, 'beziehungen.json'), path.join(out, 'daten', 'beziehungen.json'));
  fs.writeFileSync(path.join(out, 'daten', 'index.json'), JSON.stringify({ generated: '2026-11-18T00:00:00Z', commit: 'test000', repository: '4m3projects/politik4m3FaktencheckUngeskriptet', videos }));
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
  try { await fn(); results.push(true); console.log('ok   ' + name); }
  catch (e) { results.push(false); console.log('FAIL ' + name + '\n     ' + String(e.message).split('\n').join('\n     ')); }
}

(async () => {
  const browser = await chromium.launch();
  const withR = await serve(buildSite(true));
  const without = await serve(buildSite(false));
  const urlOf = s => `http://127.0.0.1:${s.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route(u => !u.href.startsWith('http://127.0.0.1:'), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  const open = async (base, hash) => {
    await page.goto('about:blank');
    await page.goto(base + hash);
    await page.waitForFunction(() => !/Daten werden geladen/.test(document.getElementById('inhalt').innerText), null, { timeout: 15000 });
    return page.innerText('#inhalt');
  };
  const W = urlOf(withR), O = urlOf(without);
  const V = 'zUnxDR5ttRU';

  const R = require('./rhetoric.js');
  const rhetOf = id => JSON.parse(fs.readFileSync(path.join(ROOT, 'faktenchecks', id, 'rhetorik.json'), 'utf8'));
  await step('Startseite: Darstellungshinweise je Interview mit Anzahl je Merkmal sichtbar', async () => {
    await open(W, '#/');
    let total = 0;
    for (const id of ['mdo14671BPE', 'mlxFA9T88I0']) {
      const r = rhetOf(id), st = R.reviewState(r);
      total += st.annotations;
      const box = (await page.locator(`a.card[href="#/video/${id}"] .rhet-sum`).innerText()).replace(/\s+/g, ' ');
      assert.match(box, new RegExp(`Darstellung · ${st.annotations} KI-Hinweise`, 'i'));
      for (const [k, n] of Object.entries(R.featureCounts(r)).filter(([, n]) => n > 0)) {
        assert.ok(box.includes(`${R.FEATURES[k].name} ${n}`), id + ': ' + R.FEATURES[k].name + ' ' + n + ' fehlt in: ' + box);
      }
    }
    assert.match(await page.innerText('.hero-facts'), new RegExp(total + ' Darstellungshinweise \\(KI\\)'));
    const t = await open(O, '#/');
    assert.match(t, /Noch nicht geprüft/);
    assert.doesNotMatch(await page.innerText('.hero-facts'), /Darstellungshinweise/);
  });

  await step('Detailseite: Übersicht zeigt Darstellungshinweise, Klick filtert nach Merkmal', async () => {
    await open(W, '#/video/' + V);
    const box = (await page.locator('.section .rhet-sum').innerText()).replace(/\s+/g, ' ');
    assert.match(box, /Abwertende Sprache 1/);
    await page.click('.section .rhet-sum [data-rhet-filter="abwertung"]');
    assert.match(await page.innerText('#count'), /^1 von 43 Aussagen$/);
    await page.click('.section .rhet-sum [data-rhet-filter="abwertung"]');
    assert.match(await page.innerText('#count'), /^43 Aussagen$/);
  });

  await step('„Meinung / Prognose“ + Ironie + Abwertung: beide Ebenen getrennt an derselben Aussage', async () => {
    await open(W, '#/video/' + V);
    const card = page.locator('#' + V + '-A0001');
    assert.match(await card.locator('.claim-top').innerText(), /Meinung \/ Prognose/);
    const badges = await card.locator('.rhet .rhet-badge').allInnerTexts();
    assert.deepEqual(badges.sort(), ['Abwertende Sprache', 'Ironie / Satire']);
    assert.match(await card.locator('.rhet-label').innerText(), /KI-Hinweis, getrennt von der Faktenbewertung/i);
    const flags = await card.locator('.claim-top .rhet-flag').allInnerTexts();
    assert.deepEqual(flags.sort(), ['Darstellung: Abwertende Sprache', 'Darstellung: Ironie / Satire'], 'Kennzeichnung im Kopf, klar als Darstellung benannt');
    assert.equal(await card.locator('.claim-top .badge:not(.rhet-flag)').first().innerText(), 'Meinung / Prognose', 'Faktenbewertung bleibt das erste Abzeichen');
    assert.match(await page.innerText('.rhet-panel'), /Teilweise geprüft/);
    assert.match(await page.innerText('.rhet-panel'), /zählen nicht als Fehler/);
  });

  await step('Faktenstatistik und Verteilung sind mit und ohne Rhetorikdatei identisch', async () => {
    for (const id of ['mdo14671BPE', 'mlxFA9T88I0', 'sLMyP0H7tSY', V]) {
      const grab = async base => {
        await open(base, '#/video/' + id);
        return page.evaluate(() => [document.querySelector('.stats')?.innerText || '', document.querySelector('.dist')?.getAttribute('aria-label') || '',
          [...document.querySelectorAll('.claim')].map(c => c.querySelector('.claim-top .badge').innerText).join('|')]);
      };
      assert.deepEqual(await grab(W), await grab(O), id);
    }
  });

  await step('Ohne Rhetorikdatei: „noch nicht geprüft“, keine Hinweise, kein Filter, keine Fehler', async () => {
    await open(O, '#/video/' + V);
    assert.match(await page.innerText('.rhet-panel'), /Noch nicht geprüft/);
    assert.match(await page.innerText('.rhet-panel'), /nicht, dass es rhetorisch unauffällig ist/);
    assert.equal(await page.locator('.rhet').count(), 0);
    assert.equal(await page.locator('#f-r').count(), 0);
  });

  await step('Ein-/Ausblenden: Hinweise verschwinden, Wahl bleibt nach Neuladen erhalten', async () => {
    await page.evaluate(() => localStorage.clear());
    await open(W, '#/video/' + V);
    const shown = () => page.locator('.rhet').first().isVisible();
    assert.equal(await shown(), true);
    await page.uncheck('#f-rs');
    assert.equal(await shown(), false);
    assert.equal(await page.locator('.rhet-flag').first().isVisible(), false, 'Kopf-Kennzeichnung ebenfalls ausgeblendet');
    await open(W, '#/video/' + V);
    assert.equal(await page.isChecked('#f-rs'), false);
    assert.equal(await shown(), false);
    await page.check('#f-rs');
    assert.equal(await shown(), true);
    await page.evaluate(() => localStorage.clear());
  });

  await step('Filter nach Rhetorik-Merkmal', async () => {
    await open(W, '#/video/' + V);
    await page.selectOption('#f-r', '*');
    assert.match(await page.innerText('#count'), /^3 von 43 Aussagen$/);
    await page.selectOption('#f-r', 'abwertung');
    assert.match(await page.innerText('#count'), /^1 von 43 Aussagen$/);
    await page.selectOption('#f-r', '');
    assert.match(await page.innerText('#count'), /^43 Aussagen$/);
  });

  await step('Direktlink auf eine Aussage öffnet die Fundstellen, nicht nur den Rhetorik-Hinweis', async () => {
    await open(W, '#/video/' + V + '/aussage/' + V + '-A0001');
    assert.equal(await page.$eval('#' + V + '-A0001 > details', d => d.open), true);
    assert.equal(await page.$eval('#' + V + '-A0001 .rhet details', d => d.open), false);
  });

  await step('Video-Ansicht: Fundstellen neben dem Video zeigen die Darstellungshinweise', async () => {
    await page.evaluate(() => localStorage.clear());
    await open(W, '#/video/' + V + '/video');
    const item = page.locator(`#vc-list .vc-item:has(a[href$="/aussage/${V}-A0001"])`).first();
    const flags = await item.locator('.vc-meta .rhet-flag').allInnerTexts();
    assert.deepEqual(flags.sort(), ['Darstellung: Abwertende Sprache', 'Darstellung: Ironie / Satire'], 'Merkmale an der Fundstelle');
    await item.locator('summary').first().click();
    const badges = await item.locator('.vc-body .rhet .rhet-badge').allInnerTexts();
    assert.deepEqual(badges.sort(), ['Abwertende Sprache', 'Ironie / Satire'], 'Hinweise mit Begründung in den Details');
    const total = [...R.byClaim(rhetOf(V)).keys()].filter(Boolean).length;
    assert.ok(await page.locator('#vc-list .vc-item:has(.rhet-flag)').count() >= Math.min(total, 1), 'weitere markierte Fundstellen');
    await item.locator('.vc-seek').click();
    await page.waitForFunction(() => document.querySelector('#vc-current .rhet-flag'));
    assert.match(await page.innerText('#vc-current'), /Darstellung: (Abwertende Sprache|Ironie \/ Satire)/, 'auch in „Zu dieser Stelle gehört“');
    await open(O, '#/video/' + V + '/video');
    assert.equal(await page.locator('.vc-item .rhet-flag, .vc-item .rhet').count(), 0, 'ohne Rhetorikdatei keine Hinweise');
  });

  await step('Methodik erklärt die zweite Ebene', async () => {
    const t = await open(W, '#/methodik');
    assert.match(t, /Maßstab 2 – Darstellung: wie etwas gesagt wird/);
    assert.equal(await page.locator('#darstellung .verdict-list li').count(), 6, 'sechs Darstellungsmerkmale aufgezählt');
    assert.match(t, /Keine Fehlerpunkte/);
  });

  await step('Mobil (390 px): keine horizontale Verschiebung', async () => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(W, '#/video/mlxFA9T88I0');
    await page.click('#mlxFA9T88I0-A0387 .rhet summary');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, 'horizontal verschoben um ' + over + ' px');
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await step('Keine Skriptfehler in der Konsole', async () => { assert.deepEqual(errors, []); });

  if (process.env.SCREENSHOTS) {
    await open(W, '#/video/' + V + '/aussage/' + V + '-A0001');
    await page.screenshot({ path: path.join(process.env.SCREENSHOTS, 'rhetorik.png') });
  }
  await browser.close(); withR.close(); without.close();
  const ok = results.filter(Boolean).length;
  console.log(`\n${ok} von ${results.length} Browserprüfungen bestanden.`);
  process.exit(ok === results.length ? 0 : 1);
})();
