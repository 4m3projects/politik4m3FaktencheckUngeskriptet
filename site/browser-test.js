/*
 * Browsertest der Video-Ansicht mit Playwright und einem nachgebildeten YouTube-Player.
 * Ausführen (Playwright und Chromium müssen lokal vorhanden sein): node site/browser-test.js
 * Wird nicht veröffentlicht und nicht im Workflow ausgeführt. Es werden keine echten
 * YouTube-Anfragen gestellt: alle Anfragen an fremde Hosts werden abgefangen und protokolliert.
 * Optional: SCREENSHOTS=<Verzeichnis> speichert Bildschirmfotos.
 */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const VIDEO = 'mlxFA9T88I0';

/* Seite wie im Workflow zusammenstellen (vereinfachte Nachbildung). */
function buildSite() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'p4m3-site-'));
  for (const f of ['index.html', 'style.css', 'app.js', 'sync.js', 'video.js', 'relations.js', 'rhetoric.js', 'faktenindex.js', 'faktenindex-ui.js', 'rangliste.js', 'wissen.js', 'gegendarstellung.js', 'themen.js', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
  const videos = [];
  const base = path.join(ROOT, 'faktenchecks');
  for (const id of fs.readdirSync(base).filter(x => /^[A-Za-z0-9_-]{11}$/.test(x))) {
    const dir = path.join(base, id);
    const files = [];
    const walk = rel => {
      for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
        const r = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) walk(r);
        else if (e.name.endsWith('.md')) files.push(r);
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
    const title = (/^# (.+)$/m.exec(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')) || [])[1] || id;
    const metaPath = path.join(dir, 'video.json');
    const rhetPath = path.join(dir, 'rhetorik.json');
    const rhetoric = fs.existsSync(rhetPath);
    if (rhetoric) { fs.mkdirSync(path.join(out, 'daten', id), { recursive: true }); fs.copyFileSync(rhetPath, path.join(out, 'daten', id, 'rhetorik.json')); }
    videos.push({ id, title, structured, rhetoric, files, video: fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null });
  }
  fs.copyFileSync(path.join(base, 'beziehungen.json'), path.join(out, 'daten', 'beziehungen.json'));
  fs.writeFileSync(path.join(out, 'daten', 'index.json'), JSON.stringify({ generated: new Date().toISOString(), commit: 'test', repository: '4m3projects/politik4m3Facktencheck', videos }));
  /* Wissensverzeichnis wie im Workflow (node scripts/wissen.js export). */
  require('node:child_process').execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'wissen.js'), 'export', path.join(out, 'daten', 'wissen.json')]);
  /* Verlauf wie im Workflow (node scripts/verlauf.js export). */
  require('node:child_process').execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'verlauf.js'), 'export', path.join(out, 'daten', 'verlauf.json')]);
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

/* Nachgebildete IFrame API: gleiche Schnittstelle wie YT.Player, steuerbar über window.__yt. */
const FAKE_API = `
(function () {
  const ctl = window.__yt = { players: [], seeks: [], options: null, failWith: null, duration: 11166 };
  function Player(el, opts) {
    const host = typeof el === 'string' ? document.getElementById(el) : el;
    const iframe = document.createElement('iframe');
    iframe.src = 'about:blank';
    iframe.dataset.fakeHost = opts.host;
    host.replaceWith(iframe);
    ctl.options = opts; ctl.players.push(this);
    this.t = (opts.playerVars && opts.playerVars.start) || 0; this.s = 5; this.opts = opts; this.iframe = iframe;
    setTimeout(() => {
      if (ctl.failWith != null) { opts.events.onError({ data: ctl.failWith }); return; }
      opts.events.onReady({ target: this });
    }, 20);
  }
  // Zeit läuft im Zustand „playing“ in Echtzeit weiter; Zuweisung an .t setzt die Position.
  Object.defineProperty(Player.prototype, 't', {
    get() { return this._t + (this.s === 1 ? (Date.now() - this._since) / 1000 : 0); },
    set(v) { this._t = v; this._since = Date.now(); }
  });
  Player.prototype.getCurrentTime = function () { return this.t; };
  Player.prototype.getDuration = function () { return ctl.duration; };
  Player.prototype.getPlaybackRate = function () { return 1; };
  Player.prototype.getIframe = function () { return this.iframe; };
  Player.prototype.seekTo = function (t) { this.t = t; ctl.seeks.push(t); };
  Player.prototype.playVideo = function () { this.state(1); };
  Player.prototype.pauseVideo = function () { this.state(2); };
  Player.prototype.destroy = function () { this.iframe.remove(); this.destroyed = true; };
  Player.prototype.state = function (s) { const t = this.t; this.s = s; this.t = t; this.opts.events.onStateChange({ data: s, target: this }); };
  window.YT = { Player, PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } };
  setTimeout(() => window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(), 10);
})();`;

const results = [];
async function step(name, fn) {
  try { await fn(); results.push(['ok', name]); console.log('ok   ' + name); }
  catch (e) { results.push(['FAIL', name, e.message]); console.log('FAIL ' + name + '\n     ' + e.message.split('\n').join('\n     ')); }
}

(async () => {
  const dir = buildSite();
  const server = await serve(dir);
  const base = `http://127.0.0.1:${server.address().port}/`;
  const shots = process.env.SCREENSHOTS;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, reducedMotion: 'reduce' });
  const external = [];
  const consoleErrors = [];
  let apiMode = 'ok';
  await ctx.route(url => !url.href.startsWith(base), route => {
    const u = route.request().url();
    external.push(u);
    if (u === 'https://www.youtube.com/iframe_api' && apiMode === 'ok') return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_API });
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(e.message));

  await step('Startseite und Aussagen-Ansicht weiter funktionsfähig', async () => {
    await page.goto(base + '#/');
    await page.waitForSelector('.card');
    await page.goto(base + `#/video/${VIDEO}`);
    await page.waitForSelector('#claims .claim');
    assert.ok(await page.locator('.tabs a', { hasText: 'Video mit Faktencheck' }).count() === 1);
    assert.match(await page.locator('.notice.todo').textContent(), /noch nicht geprüft/);
    assert.ok(await page.locator('.stat-todo').count() === 1, 'Zahl noch nicht geprüfter Aussagen sichtbar');
    await page.locator('.notice.todo a').click();
    await page.waitForSelector('#pruefstatus');
    assert.match(await page.locator('#pruefstatus').textContent(), /Nicht ausreichend belegbar/);
  });

  await step('Video-Ansicht ohne YouTube: Liste vollständig lesbar, keine externen Anfragen', async () => {
    await page.goto(base + `#/video/${VIDEO}/video`);
    await page.waitForSelector('.vc-item');
    const n = await page.locator('#vc-list .vc-item').count();
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'faktenchecks', VIDEO, 'strukturiert', 'aussagen.json'), 'utf8'));
    assert.equal(n, data.claims.reduce((s, c) => s + c.occurrences.length, 0));
    assert.equal(await page.locator('iframe').count(), 0);
    assert.equal(await page.locator('#vc-consent').isVisible(), true);
    assert.ok(await page.locator('.vc-item', { hasText: 'Vorkommen 2 von 2' }).count() >= 1, 'Wiederholung gekennzeichnet');
    assert.ok(await page.locator('.vc-item .badge', { hasText: 'Nicht überprüfbar' }).count() > 0, 'nicht überprüfbare Aussagen gekennzeichnet');
    const unchecked = data.claims.filter(c => c.status === 'Offen').reduce((s, c) => s + c.occurrences.length, 0);
    assert.ok(unchecked > 0, 'Testdaten enthalten noch nicht geprüfte Aussagen');
    assert.equal(await page.locator('.vc-item .badge-todo', { hasText: 'Noch nicht geprüft' }).count(), unchecked, 'noch nicht geprüfte Aussagen ausdrücklich gekennzeichnet');
    await page.waitForTimeout(300);
    assert.deepEqual(external, [], 'externe Anfragen vor dem Klick: ' + external.join(', '));
    if (shots) await page.screenshot({ path: path.join(shots, 'vor-dem-laden.png') });
  });

  await step('Zeitmarke ohne geladenes Video lädt nichts, merkt aber die Stelle', async () => {
    await page.locator('#vc-list .vc-item').nth(3).locator('.vc-seek').click();
    assert.equal(await page.locator('#vc-pending').isVisible(), true);
    assert.match(await page.locator('#vc-load').textContent(), /ab 00:00:/);
    assert.ok(await page.locator('.vc-item.is-current').count() >= 1);
    assert.deepEqual(external, []);
  });

  await step('Klick auf „Video laden“: IFrame API, youtube-nocookie, Start an gemerkter Stelle', async () => {
    await page.click('#vc-load');
    await page.waitForFunction(() => window.__yt && window.__yt.players.length === 1);
    assert.deepEqual(external, ['https://www.youtube.com/iframe_api']);
    const opts = await page.evaluate(() => ({ host: __yt.options.host, videoId: __yt.options.videoId, origin: __yt.options.playerVars.origin, seeks: __yt.seeks }));
    assert.equal(opts.host, 'https://www.youtube-nocookie.com');
    assert.equal(opts.videoId, VIDEO);
    assert.equal(opts.origin, base.replace(/\/$/, ''));
    await page.waitForFunction(() => __yt.seeks.length === 1);
    assert.match(await page.locator('#vc-time').textContent(), /Wiedergabe läuft/);
    const title = await page.locator('#vc-frame iframe').getAttribute('title');
    assert.match(title, /YouTube-Videoplayer/);
  });

  await step('Synchronisation: überlappende Aussagen gleichzeitig, neutrale Meldung ohne Zuordnung', async () => {
    // pausiert an eine Stelle mit zwei überlappenden Aussagen (A0012 1–5 s, A0013 4–14 s) ziehen
    // Expliziter Seek: ein unerklärter Sprung an den Anfang wird absichtlich als mögliche Werbung gehalten.
    await page.locator('#vc-mlxFA9T88I0-O0013 .vc-seek').click();
    await page.evaluate(() => { __yt.players[0].pauseVideo(); __yt.players[0].t = 4.5; });
    await page.waitForFunction(() => document.querySelectorAll('#vc-list .vc-item.is-current').length === 2);
    const cur = await page.locator('#vc-list .vc-item.is-current .vc-flag').allTextContents();
    assert.deepEqual(cur, ['Jetzt im Video', 'Jetzt im Video']);
    assert.ok(await page.locator('#vc-current li').count() >= 2);
    // Im erweiterten Bestand ist die frühere Testlücke bei 1200 s inzwischen mit Aussagen belegt.
    await page.evaluate(() => { __yt.players[0].t = 61; });
    await page.waitForFunction(() => /keine geprüfte Aussage/.test(document.getElementById('vc-current').textContent));
    assert.equal(await page.locator('#vc-list .vc-item.is-current, #vc-list .vc-item.is-near').count(), 0);
    assert.match(await page.locator('#vc-current').textContent(), /Nächste Fundstelle bei 00:02:18/);
  });

  await step('Ungenaue Zeitmarke: Eintrag kurz vor Beginn als „in der Nähe“', async () => {
    await page.evaluate(() => { __yt.players[0].t = 18; }); // A0014 beginnt bei 20 s
    await page.waitForFunction(() => document.querySelectorAll('#vc-list .vc-item.is-near').length > 0);
    assert.match(await page.locator('#vc-list .vc-item.is-near .vc-flag').first().textContent(), /In der Nähe/);
  });

  await step('Klick auf Fundstelle springt im Player; Wiederholung springt zur zweiten Stelle', async () => {
    // Stabile Fundstellen statt des ersten chronologischen Treffers: inzwischen gibt es frühere Wiederholungen.
    const rep = page.locator('#vc-mlxFA9T88I0-O0007');
    await rep.locator('.vc-seek').click();
    const seeks = await page.evaluate(() => __yt.seeks);
    assert.equal(seeks[seeks.length - 1], 7385);
    await page.waitForFunction(() => document.querySelector('#vc-list .vc-item.is-current .vc-flag'));
    assert.match(await page.locator('#vc-list .vc-item.is-current').first().textContent(), /Vorkommen 1 von 2/);
    await page.locator('#vc-mlxFA9T88I0-O0019 .vc-seek').click();
    assert.equal(await page.evaluate(() => __yt.seeks.at(-1)), 30);
    await page.waitForFunction(() => document.querySelector('#vc-mlxFA9T88I0-O0019.is-current'));
    assert.match(await page.locator('#vc-mlxFA9T88I0-O0019').textContent(), /Vorkommen 2 von 2/);
  });

  await step('Werbung (eigene Dauer, Zähler ab 0): Anzeige hält, Hinweis, danach Fortsetzung', async () => {
    await page.evaluate(() => { __yt.players[0].t = 8380; });
    await page.waitForFunction(() => /02:19:4/.test(document.querySelector('#vc-list .vc-item.is-current .time')?.textContent || ''), null, { timeout: 5000 });
    const before = await page.evaluate(() => [...document.querySelectorAll('#vc-list .vc-item.is-current')].map(e => e.id));
    await page.evaluate(() => { __yt.duration = 15; __yt.players[0].t = 0; });
    await page.waitForFunction(() => /vorübergehend unklar/.test(document.getElementById('vc-current').textContent));
    await page.waitForTimeout(2000);
    const during = await page.evaluate(() => [...document.querySelectorAll('#vc-list .vc-item.is-current')].map(e => e.id));
    assert.deepEqual(during, before, 'Hervorhebung bleibt bei der letzten bestätigten Stelle');
    assert.match(await page.locator('#vc-time').textContent(), /Anzeige gehalten bei 02:19:4/);
    assert.equal(await page.locator('#vc').getAttribute('data-basis'), 'unklar');
    await page.evaluate(() => { __yt.duration = 11166; __yt.players[0].t = 8381; });
    await page.waitForFunction(() => document.getElementById('vc').dataset.basis === 'ok');
    assert.match(await page.locator('#vc-list .vc-item.is-current .time').first().textContent(), /02:19:4/);
  });

  await step('Unklare Zeit nach Sprung an den Anfang: Nutzer kann übernehmen', async () => {
    await page.evaluate(() => { __yt.players[0].t = 0.5; });
    await page.waitForFunction(() => document.getElementById('vc').dataset.basis === 'unklar');
    await page.waitForTimeout(2500);
    assert.equal(await page.locator('#vc').getAttribute('data-basis'), 'unklar', 'weiterlaufender Zähler wird nicht automatisch übernommen');
    await page.click('#vc-current [data-accept]');
    await page.waitForFunction(() => document.getElementById('vc').dataset.basis === 'ok');
    assert.ok(await page.locator('#vc-list .vc-item.is-current, #vc-list .vc-item.is-near').count() > 0);
  });

  await step('Synchronisierung manuell anhalten und fortsetzen', async () => {
    await page.click('#vc-hold');
    assert.equal(await page.locator('#vc-hold').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#vc').getAttribute('data-basis'), 'angehalten');
    await page.evaluate(() => { __yt.players[0].t = 7390; });
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#vc').getAttribute('data-basis'), 'angehalten');
    await page.click('#vc-hold');
    await page.waitForFunction(() => /02:03:0/.test(document.querySelector('#vc-list .vc-item.is-current .time')?.textContent || ''));
    assert.equal(await page.locator('#vc-hold').getAttribute('aria-pressed'), 'false');
  });

  await step('Pause und Videoende werden angezeigt', async () => {
    await page.evaluate(() => __yt.players[0].pauseVideo());
    await page.waitForFunction(() => /Pausiert/.test(document.getElementById('vc-time').textContent));
    await page.evaluate(() => __yt.players[0].state(0));
    await page.waitForFunction(() => /zu Ende/.test(document.getElementById('vc-current').textContent));
  });

  await step('Auto-Scroll abschaltbar und Einstellung gemerkt; Seek scrollt die Liste', async () => {
    await page.uncheck('#vc-auto');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('p4m3-video-ansicht')));
    assert.equal(stored.autoscroll, false);
    await page.check('#vc-auto');
    await page.evaluate(() => { __yt.players[0].state(1); __yt.players[0].t = 8390; });
    await page.waitForFunction(() => {
      const l = document.getElementById('vc-scroll'), el = l.querySelector('.vc-item.is-current');
      if (!el) return false;
      const lr = l.getBoundingClientRect(), r = el.getBoundingClientRect();
      return r.top >= lr.top - 1 && r.top < lr.bottom;
    }, null, { timeout: 3000 });
  });

  await step('Layout umschalten (nebeneinander / untereinander)', async () => {
    const box = () => page.evaluate(() => {
      const a = document.querySelector('.vc-player-col').getBoundingClientRect(), b = document.querySelector('.vc-list-col').getBoundingClientRect();
      return { side: b.left >= a.right - 1, below: b.top >= a.bottom - 1 };
    });
    await page.click('.seg button[data-layout="side"]');
    assert.equal((await box()).side, true);
    const align = await page.evaluate(() => {
      const sc = document.getElementById('vc-scroll');
      return { inside: sc.contains(document.getElementById('vc-list-h')), dy: Math.abs(sc.getBoundingClientRect().top - document.getElementById('vc-frame').getBoundingClientRect().top) };
    });
    assert.ok(align.inside, 'Überschrift „Fundstellen im Zeitverlauf“ scrollt mit der Liste');
    assert.ok(align.dy <= 2, 'Listenbereich beginnt auf Höhe des Videos, Abstand ' + align.dy + ' px');
    if (shots) await page.screenshot({ path: path.join(shots, 'nebeneinander.png') });
    await page.click('.seg button[data-layout="stack"]');
    assert.equal((await box()).below, true);
    assert.equal(await page.locator('.seg button[data-layout="stack"]').getAttribute('aria-pressed'), 'true');
    await page.click('.seg button[data-layout="side"]');
  });

  await step('Großansicht: Dialog mit Video und Fakten, Fokus, Escape, Player bleibt erhalten', async () => {
    // Eigene Ausgangslage: Der Echtzeit-Mock darf während der vorigen Layoutprüfung
    // bereits über die geprüfte Fundstelle hinausgelaufen sein (z. B. unter hoher Last).
    await page.evaluate(() => { __yt.players[0].t = 8390; __yt.players[0].pauseVideo(); });
    await page.waitForFunction(() => document.getElementById('vc').dataset.basis === 'ok' && /02:19:/.test(document.querySelector('#vc-list .vc-item.is-current .time')?.textContent || ''));
    await page.evaluate(() => __yt.players[0].pauseVideo());
    await page.waitForTimeout(300);
    const iframeBefore = await page.locator('#vc-frame iframe').elementHandle();
    await page.click('#vc-expand');
    assert.equal(await page.locator('#vc').getAttribute('role'), 'dialog');
    assert.equal(await page.locator('#vc').getAttribute('aria-modal'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'vc-close');
    const r = await page.locator('#vc').boundingBox();
    assert.ok(r.width >= 1350 && r.height >= 850, 'füllt den Bildschirm');
    assert.equal(await page.locator('.vc-list-col').isVisible(), true);
    await page.waitForTimeout(800);
    const cur = await page.evaluate(() => [...document.querySelectorAll('#vc-list .vc-item.is-current .time')].map(e => e.textContent));
    assert.ok(cur.length >= 1 && cur.every(t => /02:19:/.test(t)), 'aktuelle Einträge: ' + cur.join(', ') + ' · ' + await page.locator('#vc-time').textContent());
    const visible = await page.evaluate(() => { const l = document.getElementById('vc-list').getBoundingClientRect(), r = document.querySelector('#vc-list .vc-item.is-current').getBoundingClientRect(); return (r.top >= l.top - 1 && r.top < l.bottom) || JSON.stringify({ l: [l.top, l.bottom], r: [r.top, r.bottom], st: document.getElementById('vc-list').scrollTop, sh: document.getElementById('vc-list').scrollHeight }); });
    assert.equal(visible, true, 'aktueller Eintrag in der Großansicht sichtbar');
    if (shots) await page.screenshot({ path: path.join(shots, 'grossansicht.png') });
    for (let i = 0; i < 60; i++) await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#vc')), true, 'Fokus bleibt im Dialog');
    assert.equal(await page.locator('.topbar').getAttribute('inert'), '', 'Seite außerhalb inaktiv');
    // Escape innerhalb des YouTube-iframes verarbeitet YouTube selbst; daher Fokus auf ein Seitenelement.
    await page.focus('#vc-auto');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.topbar').getAttribute('inert'), null);
    assert.equal(await page.locator('#vc').getAttribute('role'), null);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'vc-expand');
    assert.equal(await iframeBefore.evaluate(el => el.isConnected), true, 'iframe nicht neu geladen');
  });

  await step('Seitenwechsel räumt Player auf', async () => {
    await page.goto(base + `#/video/${VIDEO}`);
    await page.waitForSelector('#claims .claim');
    assert.equal(await page.evaluate(() => __yt.players[0].destroyed), true);
  });

  await step('Knopf „hier abspielen“ auf der Detailseite: scrollt zum Video und startet es sofort', async () => {
    const p3 = await ctx.newPage();
    p3.on('pageerror', e => consoleErrors.push(e.message));
    await p3.goto(base + `#/video/${VIDEO}`);
    await p3.waitForSelector('#claims .claim');
    assert.equal(await p3.evaluate(() => !!window.__yt), false, 'vor dem Klick nichts von YouTube geladen');
    assert.match(await p3.locator('.btn-note').textContent(), /YouTube/);
    await p3.click('a.btn:has-text("hier abspielen")');
    await p3.waitForFunction(() => window.__yt && __yt.players.length === 1 && __yt.players[0].s === 1);
    assert.equal(await p3.evaluate(() => location.hash), `#/video/${VIDEO}/video`, 'Adresse ohne Autostart, Neuladen startet nicht erneut');
    assert.equal(await p3.evaluate(() => __yt.options.host), 'https://www.youtube-nocookie.com');
    await p3.waitForTimeout(800);
    const top = await p3.evaluate(() => document.getElementById('vc').getBoundingClientRect().top);
    assert.ok(Math.abs(top) < 80, 'Video-Bereich oben im Blick, Abstand ' + top);
    await p3.reload();
    await p3.waitForSelector('#vc-load');
    assert.equal(await p3.evaluate(() => !!window.__yt), false, 'nach Neuladen kein automatischer Start');
    await p3.close();
  });

  await step('Playerfehler (Einbettung verboten) zeigt Fallback-Link', async () => {
    await page.goto(base + `#/video/${VIDEO}/video`);
    await page.waitForSelector('#vc-load');
    await page.evaluate(() => { __yt.failWith = 150; });
    await page.click('#vc-load');
    await page.waitForSelector('.vc-error');
    assert.match(await page.locator('.vc-error').textContent(), /Einbettung dieses Videos ist vom Kanal nicht erlaubt/);
    assert.equal(await page.locator('.vc-error a[href^="https://www.youtube.com/watch?v=' + VIDEO + '"]').count(), 1);
    assert.equal(await page.locator('#vc-list .vc-item').count() > 0, true);
  });

  await step('Blockiertes Player-Skript zeigt Fallback statt zu hängen', async () => {
    const p2 = await ctx.newPage();
    p2.on('pageerror', e => consoleErrors.push(e.message));
    apiMode = 'block';
    await p2.goto(base + `#/video/${VIDEO}/video`);
    await p2.click('#vc-load');
    await p2.waitForSelector('.vc-error', { timeout: 5000 });
    assert.match(await p2.locator('.vc-error').textContent(), /nicht geladen werden/);
    apiMode = 'ok';
    await p2.close();
  });

  await step('Mobil (390 px): keine horizontale Verschiebung, Bedienelemente erreichbar', async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await m.route(url => !url.href.startsWith(base), r => { external.push(r.request().url()); return r.abort(); });
    const p = await m.newPage();
    await p.goto(base + `#/video/${VIDEO}/video`);
    await p.waitForSelector('.vc-item');
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, 'horizontaler Überlauf ' + overflow + ' px');
    const a = await p.locator('.vc-player-col').boundingBox(), b = await p.locator('.vc-list-col').boundingBox();
    assert.ok(b.y >= a.y + a.height - 1, 'auf schmalen Bildschirmen untereinander');
    assert.equal(await p.locator('.seg').isVisible(), false, 'Layoutumschalter auf schmalen Bildschirmen ausgeblendet');
    const c = await p.locator('#vc-consent').boundingBox(), lb = await p.locator('#vc-load').boundingBox();
    assert.ok(lb.y + lb.height <= c.y + c.height + 1, 'Ladeknopf ohne inneres Scrollen erreichbar');
    if (shots) { await p.locator('#vc-frame').scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(shots, 'mobil.png'), fullPage: false }); }
    await m.close();
  });

  await step('Verlauf: oben in der Leiste, jedes Video einmal, neueste Änderung zuerst', async () => {
    await page.setViewportSize({ width: 1360, height: 860 });
    await page.goto(base + '#/');
    await page.waitForSelector('.card');
    assert.equal(await page.locator('.mainnav a', { hasText: 'Jens der Christ' }).count(), 0, 'Personenlink nicht mehr in der Leiste');
    assert.ok(await page.locator('section[aria-labelledby="h-team"] a[href="#/jens"]').count() === 1, 'Person weiter unten auf der Startseite verlinkt');
    await page.locator('.mainnav a', { hasText: 'Verlauf' }).click();
    await page.waitForSelector('.verlauf-item');
    assert.equal(await page.locator('.mainnav a[aria-current="page"]').textContent(), 'Verlauf');
    const ids = await page.locator('.verlauf > .verlauf-item').evaluateAll(els => els.map(e => e.id));
    assert.equal(new Set(ids).size, ids.length, 'jedes Video nur einmal');
    const times = await page.locator('.verlauf > .verlauf-item .verlauf-when time').evaluateAll(els => els.map(e => e.getAttribute('datetime')));
    for (let i = 1; i < times.length; i++) assert.ok(new Date(times[i - 1]) >= new Date(times[i]), 'absteigend sortiert');
    await page.locator('.verlauf-item .verlauf-title a').first().click();
    await page.waitForSelector('#claims .claim, .tabs');
    if (shots) { await page.goto(base + '#/verlauf'); await page.waitForSelector('.verlauf-item'); await page.screenshot({ path: path.join(shots, 'verlauf.png'), fullPage: true }); }
  });

  await step('Rangliste: oben in der Leiste, Index absteigend, graue Ampel ohne Platz', async () => {
    await page.setViewportSize({ width: 1360, height: 860 });
    await page.goto(base + '#/');
    await page.waitForSelector('.card');
    await page.locator('.mainnav a', { hasText: 'Rangliste' }).click();
    await page.waitForSelector('.rang-item');
    assert.equal(await page.locator('.mainnav a[aria-current="page"]').textContent(), 'Rangliste');
    const idx = await page.locator('ol.rang > .rang-item').evaluateAll(els => els.map(e => Number(e.dataset.rangIndex.replace(',', '.'))));
    assert.ok(idx.length > 0, 'mindestens ein Video mit Platz');
    for (let i = 1; i < idx.length; i++) assert.ok(idx[i - 1] >= idx[i], 'absteigend nach Faktenindex');
    const keys = await page.locator('ol.rang > .rang-item .ampel').evaluateAll(els => els.map(e => e.dataset.ampelKey));
    assert.ok(keys.every(k => ['gruen', 'gelb', 'rot'].includes(k)), 'nur belastbare Ampeln mit Platz');
    const grey = await page.locator('.rang-ohne .rang-item .ampel').evaluateAll(els => els.map(e => e.dataset.ampelKey));
    assert.ok(grey.every(k => !['gruen', 'gelb', 'rot'].includes(k)), 'graue Ampeln ohne Platz');
    if (await page.locator('[data-rang-filter="reaction"]').count()) {
      await page.locator('[data-rang-filter="original"]').click();
      const roles = await page.locator('.rang-item:not([hidden])').evaluateAll(els => els.map(e => e.dataset.rangRole));
      assert.ok(roles.length && roles.every(r => r === 'original'), 'Filter zeigt nur Originale');
    }
    if (shots) await page.screenshot({ path: path.join(shots, 'rangliste.png'), fullPage: true });
    await page.locator('ol.rang .rang-item:not([hidden]) .rang-title a').first().click();
    await page.waitForSelector('#claims .claim, .tabs');
  });

  await step('Kanal-Rangliste: Reiter Kanäle, Kanalseite, Kanalauswahl, Kanalname auf der Videoseite verlinkt', async () => {
    await page.goto(base + '#/rangliste');
    await page.waitForSelector('.rang-tabs');
    await page.locator('.rang-tabs a', { hasText: 'Kanäle' }).click();
    await page.waitForSelector('.rang-kanal');
    const scores = await page.locator('ol.rang > .rang-kanal .ampel').evaluateAll(els => els.map(e => Number(e.getAttribute('aria-label').replace(/[^0-9,]/g, '').replace(',', '.'))));
    assert.ok(scores.length > 0, 'mindestens ein Kanal mit Platz');
    for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1] >= scores[i], 'Kanäle absteigend nach Kanalwert');
    const name = (await page.locator('ol.rang > .rang-kanal .rang-title a').first().textContent()).trim();
    await page.locator('ol.rang > .rang-kanal .rang-title a').first().click();
    await page.waitForSelector('.rang-kanal-kopf');
    assert.equal((await page.locator('main h1, #inhalt h1').first().textContent()).trim(), name);
    assert.equal(await page.locator('.mainnav a[aria-current="page"]').textContent(), 'Rangliste');
    if (shots) await page.screenshot({ path: path.join(shots, 'rangliste-kanal.png'), fullPage: true });
    /* Kanalauswahl in der Videoansicht führt zur Kanalseite. */
    await page.goto(base + '#/rangliste');
    await page.waitForSelector('[data-rang-kanal]');
    const opt = await page.locator('[data-rang-kanal] option').nth(1).getAttribute('value');
    await page.selectOption('[data-rang-kanal]', opt);
    await page.waitForFunction(o => location.hash === '#/rangliste/kanal/' + o, opt);
    await page.waitForSelector('.rang-kanal-kopf');
    /* Auf einer Videoseite ist der Kanalname ein Link zur Kanal-Rangliste. */
    await page.goto(base + '#/rangliste');
    await page.waitForSelector('ol.rang .rang-title a');
    await page.locator('ol.rang .rang-title a').first().click();
    await page.waitForSelector('a.channel-link');
    await page.locator('a.channel-link').first().click();
    await page.waitForSelector('.rang-kanal-kopf');
    if (shots) { await page.goto(base + '#/rangliste/kanaele'); await page.waitForSelector('.rang-kanal'); await page.screenshot({ path: path.join(shots, 'rangliste-kanaele.png'), fullPage: true }); }
  });

  await step('Keine Skriptfehler in der Konsole', async () => {
    const relevant = consoleErrors.filter(e => !/net::ERR_FAILED|Failed to load resource/.test(e));
    assert.deepEqual(relevant, []);
  });

  await browser.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  const failed = results.filter(r => r[0] !== 'ok');
  console.log(`\n${results.length - failed.length} von ${results.length} Browserprüfungen bestanden.`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
