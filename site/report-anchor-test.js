/* Aufruf: node --test site/report-anchor-test.js. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const ID = 'bXVpA6kPNv8';
const route = file => '#/video/' + ID + '/bericht/' + file;
const reports = {
  'README.md': '# Übersicht\n\n[Selber](#übersicht) [A0041 bleibt offen](02_analyse.md#0013--haushaltsprognose-schipkau) [VKU](04_quellen.md#s064) [Plain](04_quellen.md)\n\n[Ganz extern](https://example.com/page#part) [Repo](../../docs/QUELLEN.md#kapitel)',
  '02_analyse.md': '# Analyse\n\n## 00:13 – Haushaltsprognose Schipkau\n\n[Wieder](#wiederholung-1) [Fremd](kapitel/01.md#pr%C3%BCf-gr%C3%BCnde)\n\n## Wiederholung\n\n## Wiederholung\n\n## Wiederholung-1',
  '04_quellen.md': '# Quellen\n\n## S064',
  'kapitel/01.md': '# Kapitel\n\n## **Prüf** Gründe ##'
};

function load() {
  const location = { hash: '' }, calls = [], active = { heading: null };
  const nav = { scrollTop: 0 };
  const article = {
    html: '',
    headings: [],
    getBoundingClientRect: () => ({ top: 360 }),
    querySelectorAll(selector) { return selector === '[data-report-anchor]' ? this.headings : []; }
  };
  const main = {
    contains: () => true,
    querySelector: selector => ({ '.report-nav': nav, '.report-layout .prose': article }[selector] || null)
  };
  const document = Object.assign(new EventTarget(), {
    getElementById: id => id === 'inhalt' ? main : null,
    querySelector: selector => selector === '.topbar' ? { getBoundingClientRect: () => ({ height: 84 }) } : null
  });
  const context = vm.createContext({
    document, location,
    window: Object.assign(new EventTarget(), { scrollY: 10, scrollTo: (x, y) => calls.push([x, y]) }),
    console: { error() {} }
  });
  vm.runInContext(app, context, { filename: 'app.js' });
  const defaultRead = async filePath => reports[filePath.slice(ID.length + 1)];
  Object.assign(context, {
    fixtureId: ID,
    readMarkdown: defaultRead,
    loadFixture: async () => ({ id: ID, files: Object.keys(reports) }),
    paint(html) {
      article.html = html;
      active.heading = null;
      nav.scrollTop = 0;
      article.headings = [...html.matchAll(/<h[1-4] id="([^"]+)" data-report-anchor="([^"]*)">/g)].map((m, i) => ({
        id: m[1], dataset: { reportAnchor: m[2] },
        getBoundingClientRect: () => ({ top: 500 + i * 60 }),
        setAttribute(name, value) { this[name] = value; },
        focus({ preventScroll }) { active.heading = this; assert.equal(preventScroll, true); }
      }));
    }
  });
  vm.runInContext([
    'state.index = { repository: "4m3projects/test" };',
    'loadVideo = loadFixture; getText = path => readMarkdown(path);',
    'videoHeader = () => ""; setPage = paint; decorateVerdicts = () => {};',
    'const runRoute = () => route();'
  ].join('\n'), context);

  return {
    article, calls, active, nav, document, location, context, defaultRead,
    go(hash) {
      location.hash = hash;
      return vm.runInContext('runRoute()', context);
    },
    async follow(text) {
      const href = [...article.html.matchAll(/href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].find(m => m[2] === text)?.[1];
      assert.ok(href, text);
      const a = { getAttribute: () => href };
      const event = Object.assign(new Event('click', { cancelable: true }), { button: 0 });
      Object.defineProperty(event, 'target', { value: { closest: selector => selector.includes('/bericht/') ? a : null } });
      if (document.dispatchEvent(event) && href !== location.hash) await this.go(href);
      return href;
    }
  };
}

test('Markdown behält Bericht, Sprungmarke und unveränderte Links ohne Fragment', async () => {
  const view = load();
  await view.go(route('README.md'));
  assert.match(view.article.html, /href="#\/video\/bXVpA6kPNv8\/bericht\/README\.md#%C3%BCbersicht"/);
  assert.match(view.article.html, /href="#\/video\/bXVpA6kPNv8\/bericht\/02_analyse\.md#0013--haushaltsprognose-schipkau"/);
  assert.match(view.article.html, /href="#\/video\/bXVpA6kPNv8\/bericht\/04_quellen\.md#s064"/);
  assert.match(view.article.html, /href="#\/video\/bXVpA6kPNv8\/bericht\/04_quellen\.md">Plain/);
  assert.match(view.article.html, /href="https:\/\/example\.com\/page#part"/);
  assert.match(view.article.html, /href="https:\/\/github\.com\/4m3projects\/test\/blob\/main\/docs\/QUELLEN\.md#kapitel"/);
});

test('Direktlink und Berichtswechsel fokussieren das richtige Ziel unter der Kopfleiste', async () => {
  const view = load();
  await view.go(route('04_quellen.md#s064'));
  assert.match(view.document.title, /^Quellen/);
  assert.equal(view.active.heading.dataset.reportAnchor, 's064');
  assert.equal(view.active.heading.tabindex, '-1');
  assert.deepEqual(view.calls.at(-1), [0, 470]);
  await view.go(route('README.md'));
  view.nav.scrollTop = 23;
  assert.equal(await view.follow('A0041 bleibt offen'), route('02_analyse.md#0013--haushaltsprognose-schipkau'));
  assert.equal(view.active.heading.dataset.reportAnchor, '0013--haushaltsprognose-schipkau');
  assert.equal(view.nav.scrollTop, 23);
  assert.deepEqual(view.calls.at(-1), [0, 470], 'Berichtsanfang überschreibt den Abschnitt nicht');
});

test('Gleicher Bericht, doppelte Überschriften, URL-Kodierung und Zurück-Routen', async () => {
  const view = load();
  const entry = route('02_analyse.md#0013--haushaltsprognose-schipkau');
  await view.go(entry);
  const dup = await view.follow('Wieder');
  assert.equal(dup, route('02_analyse.md#wiederholung-1'));
  assert.equal(view.active.heading.id, 'h-wiederholung-1');
  assert.equal(new Set(view.article.headings.map(h => h.id)).size, view.article.headings.length);
  assert.equal(view.article.headings.at(-1).dataset.reportAnchor, 'wiederholung-1-1');
  await view.go(entry); // derselbe Hash wie bei Browser-Zurück
  assert.equal(view.active.heading.dataset.reportAnchor, '0013--haushaltsprognose-schipkau');
  assert.equal(await view.follow('Fremd'), route('kapitel/01.md#pr%C3%BCf-gr%C3%BCnde'));
  assert.equal(view.active.heading.dataset.reportAnchor, 'prüf-gründe');
  await view.go(route('kapitel/01.md#h-pr%C3%BCf-gr%C3%BCnde'));
  assert.equal(view.active.heading.id, 'h-prüf-gründe', 'alte h-ID bleibt nutzbar');
});

test('Ungültiges oder fehlendes Fragment lässt den richtigen Bericht normal lesbar', async () => {
  const view = load();
  for (const frag of ['#%ZZ', '#nicht-da', '']) {
    await view.go(route('04_quellen.md' + frag));
    assert.match(view.document.title, /^Quellen/);
    assert.equal(view.active.heading, null);
    assert.deepEqual(view.calls.at(-1), [0, 0]);
  }
});

test('Eine überholte, langsame Berichtsroute kann die neuere nicht überschreiben', async () => {
  const view = load();
  let release;
  const slow = new Promise(resolve => { release = resolve; });
  view.context.readMarkdown = async path => path.endsWith('/04_quellen.md') ? slow : view.defaultRead(path);
  const pending = view.go(route('04_quellen.md#s064'));
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await view.go(route('02_analyse.md#0013--haushaltsprognose-schipkau'));
  release(reports['04_quellen.md']);
  await pending;
  assert.match(view.document.title, /^Analyse/);
  assert.equal(view.active.heading.dataset.reportAnchor, '0013--haushaltsprognose-schipkau');
});

test('Ausgeformte Video-, Aussage- und Berichtslinks aus Vergleichsberichten bleiben intern', async () => {
  const view = load();
  vm.runInContext('state.index.videos = [{ id: fixtureId }]', view.context);
  view.context.readMarkdown = async p => p.endsWith('/README.md')
    ? '# Vergleich\n\n[Video](#/video/' + ID + ') [Aussage](#/video/' + ID + '/aussage/' + ID +
      '-A0001) [Bericht](' + route('04_quellen.md') + ') [Abschnitt](' + route('04_quellen.md#s064') + ')'
    : view.defaultRead(p);
  await view.go(route('README.md'));
  assert.ok(view.article.html.includes('href="#/video/' + ID + '">Video</a>'));
  assert.ok(view.article.html.includes('href="#/video/' + ID + '/aussage/' + ID + '-A0001">Aussage</a>'));
  assert.ok(view.article.html.includes('href="' + route('04_quellen.md') + '">Bericht</a>'));
  assert.equal(await view.follow('Abschnitt'), route('04_quellen.md#s064'));
  assert.equal(view.active.heading.dataset.reportAnchor, 's064');
});
