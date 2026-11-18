/*
 * Browsertest für Originalinterviews, Reaktionsvideos und Prüfkonflikte.
 * Ausführen (Playwright und Chromium müssen vorhanden sein): node site/relations-browser-test.js
 * Baut die Seite wie der Workflow in ein temporäres Verzeichnis: einmal nur mit echten Daten,
 * einmal zusätzlich mit den FIKTIVEN Fixtures aus site/relations-fixtures.js. Die Fixtures
 * landen nur im temporären Testaufbau, nie im Repository-Datenbestand oder auf der Webseite.
 * Alle Anfragen an fremde Hosts werden abgefangen. Wird nicht veröffentlicht.
 */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const F = require('./relations-fixtures.js');

const ROOT = path.join(__dirname, '..');
const SITE_FILES = ['index.html', 'style.css', 'app.js', 'sync.js', 'video.js', 'relations.js', 'rhetoric.js'];

function buildSite(withFixtures) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'p4m3-rel-'));
  for (const f of SITE_FILES) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
  fs.mkdirSync(path.join(out, 'daten'));
  const videos = [];
  const base = path.join(ROOT, 'faktenchecks');
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
    files.sort();
    for (const f of files) {
      fs.mkdirSync(path.dirname(path.join(out, 'daten', id, f)), { recursive: true });
      fs.copyFileSync(path.join(dir, f), path.join(out, 'daten', id, f));
    }
    const structured = fs.existsSync(path.join(dir, 'strukturiert', 'aussagen.json'));
    if (structured) for (const f of ['aussagen.json', 'statistik.json']) {
      const p = path.join(dir, 'strukturiert', f);
      if (fs.existsSync(p)) fs.copyFileSync(p, path.join(out, 'daten', id, 'strukturiert', f));
    }
    const metaPath = path.join(dir, 'video.json');
    const video = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
    const title = (/^# (.+)$/m.exec(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')) || [])[1] || id;
    videos.push({ id, title, structured, files, video });
  }
  let relations = JSON.parse(fs.readFileSync(path.join(base, 'beziehungen.json'), 'utf8'));
  if (withFixtures) {
    for (const [id, v] of Object.entries(F.VIDEOS)) {
      const d = path.join(out, 'daten', id, 'strukturiert');
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(out, 'daten', id, 'README.md'), `# ${v.meta.title}\n\n- Kanal: ${v.meta.channel}\n\n${F.NOTE}\n`);
      fs.writeFileSync(path.join(d, 'aussagen.json'), JSON.stringify(v.data));
      videos.push({ id, title: v.meta.title, structured: true, files: ['README.md'], video: v.meta });
    }
    relations = F.RELATIONS;
  }
  fs.writeFileSync(path.join(out, 'daten', 'beziehungen.json'), JSON.stringify(relations));
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
  const real = await serve(buildSite(false));
  const fix = await serve(buildSite(true));
  const urlOf = s => `http://127.0.0.1:${s.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  await ctx.route(u => !u.href.startsWith('http://127.0.0.1:'), r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(m.text()); });
  /* Fehlende Dateien protokollieren; nur die bewusst weggelassene Statistik der Fixtures ist erlaubt. */
  page.on('response', r => { if (r.status() >= 400 && !/\/FIKTIV\w+\/strukturiert\/statistik\.json$/.test(r.url())) errors.push(r.status() + ' ' + r.url()); });
  const open = async (base, hash) => {
    await page.goto('about:blank');
    await page.goto(base + hash);
    await page.waitForFunction(() => !/Daten werden geladen/.test(document.getElementById('inhalt').innerText), null, { timeout: 15000 });
    return page.innerText('#inhalt');
  };

  await step('Echte Daten: beide Interviews als Originale auf der Startseite, nichts uneingeordnet', async () => {
    const t = await open(urlOf(real), '#/');
    assert.match(t, /Geprüfte Originalinterviews/);
    assert.match(t, /Naomi Seibt/);
    assert.match(t, /Horst Lüning/);
    assert.doesNotMatch(t, /Noch nicht eingeordnet/);
    const base = path.join(ROOT, 'faktenchecks');
    const count = fs.readdirSync(base).filter(id => {
      const p = path.join(base, id, 'video.json');
      return fs.existsSync(p) && JSON.parse(fs.readFileSync(p, 'utf8')).role === 'original';
    }).length;
    assert.match(t, new RegExp(count + ' Originalinterviews'));
  });

  await step('Echte Daten: Detailseite zeigt Rolle und Reaktionsabschnitt, Direktlinks funktionieren', async () => {
    assert.match(await open(urlOf(real), '#/video/mlxFA9T88I0'), /Originalinterview/);
    const tabs = await page.$$eval('.tabs a', a => a.map(x => [x.innerText, x.getAttribute('href')]));
    assert.deepEqual(tabs.find(x => /^Reaktionen/.test(x[0])), ['Reaktionen (1)', '#/video/mlxFA9T88I0/reaktionen'], 'Reiter Reaktionen in der Reiterleiste');
    const t = await open(urlOf(real), '#/video/mlxFA9T88I0/reaktionen');
    assert.match(t, /Reaktionen und weitere Faktenchecks/);
    assert.match(t, /Alfred räumt auf/);
    assert.match(await open(urlOf(real), '#/video/mdo14671BPE/reaktionen'), /Hank Loose/);
    await open(urlOf(real), '#/video/mdo14671BPE/aussage/mdo14671BPE-A0001');
    assert.ok(await page.$('#mdo14671BPE-A0001'));
    assert.match(await open(urlOf(real), '#/video/mlxFA9T88I0/bericht/README.md'), /Horst Lüning/);
    assert.match(await open(urlOf(real), '#/video/mlxFA9T88I0/video'), /Video laden/);
    assert.match(await open(urlOf(real), '#/methodik'), /So prüfen wir/);
    assert.match(await open(urlOf(real), '#/jens'), /Jens der Christ/);
  });

  const B = urlOf(fix);
  await step('Reiterwechsel: Reiterleiste bleibt an ihrer Stelle statt nach oben zu springen', async () => {
    await open(urlOf(real), '#/video/mlxFA9T88I0');
    const tabsTop = () => page.$eval('#inhalt .tabs', el => Math.round(el.getBoundingClientRect().top));
    await page.$eval('#inhalt .tabs', el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 200));
    const before = await tabsTop();
    assert.ok(Math.abs(before - 200) <= 2, 'Ausgangslage: Leiste bei 200 px, ist ' + before);
    for (const label of ['Reaktionen', 'Berichte', 'Video mit Faktencheck', 'Aussagen']) {
      await page.click(`#inhalt .tabs a:has-text("${label}")`);
      await page.waitForFunction(l => (document.querySelector('#inhalt .tabs a[aria-current="page"]')?.innerText || '').startsWith(l), label);
      await page.waitForTimeout(100);
      const now = await tabsTop();
      assert.ok(Math.abs(now - before) <= 2, `${label}: Leiste bei ${now} px statt ${before} px`);
      assert.ok(await page.evaluate(() => window.scrollY) > 0, label + ': nicht nach oben gesprungen');
    }
    await open(urlOf(real), '#/video/mlxFA9T88I0/reaktionen');
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'Direktaufruf beginnt oben');
  });

  await step('Echte Reaktion: Hank unter Naomi mit Rücklink und begrenzter Gegenprüfung', async () => {
    const t = await open(urlOf(real), '#/video/mdo14671BPE/reaktionen');
    assert.match(t, /Hank Loose/);
    assert.match(t, /Teilbestand geprüft/);
    assert.ok(await page.$('a[href="#/video/zUnxDR5ttRU"]'));
    const reaction = (await open(urlOf(real), '#/video/zUnxDR5ttRU')) + (await open(urlOf(real), '#/video/zUnxDR5ttRU/reaktionen'));
    assert.match(reaction, /Bezüge auf Originalinterviews/);
    assert.match(reaction, /Teilbestand – keine Bilanz des ganzen Videos/);
    assert.ok(await page.$('.role-line a[href="#/video/mdo14671BPE"]'));
    assert.match(reaction, /Sprecher und Ursprung sind ungeklärt/);
    assert.match(reaction, /nicht nur als alleinigen Grund/);
    assert.match(await open(urlOf(real), '#/video/zUnxDR5ttRU/bericht/03_faktencheck.md'), /7341daa/);
    const home = await open(urlOf(real), '#/');
    const cards = await page.$$eval('.cards a.card', a => a.map(x => x.getAttribute('href')));
    assert.ok(!cards.some(h => h.includes('zUnxDR5ttRU')), 'Reaktion ist keine Originalkarte');
    const expected = fs.readdirSync(path.join(ROOT, 'faktenchecks')).filter(id => {
      const p = path.join(ROOT, 'faktenchecks', id, 'video.json');
      return fs.existsSync(p) && JSON.parse(fs.readFileSync(p, 'utf8')).role === 'original';
    }).length;
    assert.match(home, new RegExp(expected + ' Originalinterviews'));
  });

  await step('Echte Reaktion mobil: Vergleich und Berichte bleiben ohne Überlauf erreichbar', async () => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(urlOf(real), '#/video/zUnxDR5ttRU');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await open(urlOf(real), '#/video/zUnxDR5ttRU/bericht/README.md');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await step('Fixtures: Startseite listet nur Originale, Reaktionen nicht als Hauptvideos', async () => {
    const t = await open(B, '#/');
    assert.match(t, new RegExp(F.VIDEOS[F.O1].meta.title));
    assert.match(t, new RegExp(F.VIDEOS[F.O2].meta.title));
    assert.doesNotMatch(t, new RegExp(F.VIDEOS[F.RA].meta.title));
    assert.doesNotMatch(t, new RegExp(F.VIDEOS[F.RB].meta.title));
    assert.match(t, /2 zugeordnete Reaktionen/);
    const cards = await page.$$eval('.cards a.card', a => a.map(x => x.getAttribute('href')));
    assert.ok(!cards.some(h => h.includes(F.RA) || h.includes(F.RB)), 'keine Karte für Reaktionen');
  });

  await step('Fixtures: Original zeigt beide Reaktionen mit Kanal, Typ, Status und Konflikthinweis', async () => {
    const t = await open(B, '#/video/' + F.O1 + '/reaktionen');
    assert.match(t, /Reaktionen und weitere Faktenchecks/);
    assert.match(t, /Fiktiver Kanal A · Kritische Reaktion/);
    assert.match(t, /Fiktiver Kanal B · Zustimmende Reaktion/);
    assert.match(t, /Zuordnung plausibel/);
    assert.match(t, /1 offener Prüfkonflikt/);
    assert.equal((await page.$$('.cmp.cmp-conflict')).length, 1);
    assert.match(t, /Prüfkonflikt offen/);
    assert.match(t, /Abweichung begründet geklärt/);
    assert.match(t, /Unterschiedlicher Bezugszeitpunkt oder Geltungsbereich/);
    const review = await page.$eval('#L0001', e => e.innerText);
    assert.match(review, /Review-Aufgabe/);
    assert.match(review, /Widerlegt/);
    assert.match(review, /Belegt/);
    await open(B, '#/video/' + F.O1);
    const badge = await page.$eval(`#${F.O1}-A0001 .claim-top`, e => e.innerText);
    assert.match(badge, /Prüfkonflikt mit verknüpfter Aussage/);
  });

  await step('Fixtures: Reaktion verlinkt auf beide Originale und stellt Aussagen gegenüber', async () => {
    const t = await open(B, '#/video/' + F.RA + '/reaktionen');
    assert.ok(await page.$('.tabs a[aria-current="page"][href="#/video/' + F.RA + '/reaktionen"]'), 'Reiter „Bezug zum Original“ aktiv');
    assert.match(t, /Kritische Reaktion von Fiktiver Kanal A/);
    assert.match(t, /Bezüge auf Originalinterviews/);
    const back = await page.$$eval('.role-line a', a => a.map(x => x.getAttribute('href')));
    assert.deepEqual(back.sort(), ['#/video/' + F.O1, '#/video/' + F.O2].sort());
    assert.match(t, /Gegenbehauptung zur Originalaussage/);
    assert.match(t, /Bewertungen passen zusammen/);
    assert.match(t, /Stelle in der Reaktion 00:01:35/);
  });

  await step('Fixtures: Querverweis einer Reaktionsaussage führt zur Originalaussage', async () => {
    await open(B, `#/video/${F.RA}/aussage/${F.RA}-A0001`);
    const href = await page.$eval(`#${F.RA}-A0001 details`, (d, o1) => { d.open = true; return [...d.querySelectorAll('a')].map(a => a.getAttribute('href')).find(h => h.includes(o1 + '/aussage/')); }, F.O1);
    assert.equal(href, `#/video/${F.O1}/aussage/${F.O1}-A0001`);
    await open(B, href);
    assert.ok(await page.$(`#${F.O1}-A0001`));
  });

  await step('Mobil (390 px): Gegenüberstellung ohne horizontales Scrollen', async () => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(B, '#/video/' + F.O1 + '/reaktionen');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, 'horizontal verschoben um ' + over + ' px');
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await step('YouTube-Vorschaubilder: ohne Zustimmung keine Anfrage, nach Zustimmung angezeigt, abschaltbar', async () => {
    const thumbs = [];
    page.on('request', r => { if (r.url().startsWith('https://i.ytimg.com/')) thumbs.push(r.url()); });
    await page.evaluate(() => localStorage.clear());
    await open(urlOf(real), '#/');
    assert.equal(await page.$$eval('img.card-thumb', x => x.length), 0);
    assert.ok(await page.$('.thumb-ask'), 'Abfrage sichtbar');
    assert.deepEqual(thumbs, [], 'ohne Zustimmung nichts von YouTube');
    await page.click('[data-thumbs="ja"]');
    await page.waitForSelector('img.card-thumb');
    const srcs = await page.$$eval('img.card-thumb', x => x.map(i => i.getAttribute('src')));
    const originals = fs.readdirSync(path.join(ROOT, 'faktenchecks')).filter(id => {
      const p = path.join(ROOT, 'faktenchecks', id, 'video.json');
      return fs.existsSync(p) && JSON.parse(fs.readFileSync(p, 'utf8')).role === 'original';
    });
    assert.deepEqual(srcs.sort(), originals.map(id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`).sort());
    assert.equal(await page.$('.thumb-ask'), null, 'Abfrage nach Wahl verschwunden');
    assert.match(await page.innerText('#thumb-setting'), /an/);
    await open(urlOf(real), '#/video/mlxFA9T88I0/reaktionen');
    assert.equal(await page.$eval('img.rel-thumb', i => i.getAttribute('src')), 'https://i.ytimg.com/vi/sLMyP0H7tSY/mqdefault.jpg');
    await page.click('#thumb-setting');
    await page.waitForFunction(() => !document.querySelector('img.rel-thumb'));
    assert.match(await page.innerText('#thumb-setting'), /aus/);
    await open(urlOf(real), '#/');
    assert.equal(await page.$('.thumb-ask'), null, 'Ablehnung wird gemerkt');
    assert.equal(await page.$$eval('img.card-thumb', x => x.length), 0);
    await page.evaluate(() => localStorage.clear());
  });

  await step('Keine Skriptfehler in der Konsole', async () => {
    assert.deepEqual(errors, []);
  });

  await browser.close(); real.close(); fix.close();
  const ok = results.filter(Boolean).length;
  console.log(`\n${ok} von ${results.length} Browserprüfungen bestanden.`);
  process.exit(ok === results.length ? 0 : 1);
})();
