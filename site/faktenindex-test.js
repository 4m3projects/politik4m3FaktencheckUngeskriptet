/*
 * Tests für den gemeinsamen Faktenindex (site/faktenindex.js) und seine Anzeige (site/faktenindex-ui.js).
 * Ausführen: node --test site/faktenindex-test.js   (läuft im Workflow der Webseite)
 * DIESE DATEI IST IN ALLEN DREI FAKTENCHECK-REPOSITORIES GLEICH. Sie prüft fiktive Fälle und zusätzlich alle
 * echten Videos des jeweiligen Repositories. Wird nicht veröffentlicht.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const FI = require('./faktenindex.js');

let seq = 0;
const claim = (verdict, extra = {}) => ({
  id: 'X-A' + String(++seq).padStart(4, '0'), kind: verdict === 'Meinung / Prognose' ? 'Meinung' : 'Tatsachenbehauptung',
  status: 'Abgeschlossen', verdict, occurrences: [{ role: 'Behauptung', roleStatus: 'Plausibel' }], ...extra
});
const many = (n, verdict, extra) => Array.from({ length: n }, () => claim(verdict, extra));
const open = (n, status = 'Offen') => Array.from({ length: n }, () => claim(null, { status, verdict: null }));
const idx = claims => FI.compute(claims).indexRounded;
const weighted = (R, reason = 'Zentrale Grundlage der Hauptthese des Videos.') => ({ factIndex: { weight: R, weightReason: reason, weightStatus: 'Vorläufig', assessedBy: 'Claude', assessedOn: '2026-11-20', assessedBeforeVerdict: true } });
const data = (claims, durationSeconds = 600) => ({ scope: { durationSeconds }, claims });

test('Alle Aussagen belegt → 1,000; alle widerlegt → 0,000', () => {
  assert.equal(idx(many(10, 'Belegt')), 1);
  assert.equal(idx(many(10, 'Widerlegt')), 0);
});

test('Beispiele aus dem Auftrag (Faktor 1): 10:1 → 0,500, 20:1 → 0,667, 100:1 → 0,909', () => {
  assert.equal(idx([...many(10, 'Belegt'), claim('Widerlegt')]), 0.5);
  assert.equal(idx([...many(20, 'Belegt'), claim('Widerlegt')]), 0.667);
  assert.equal(idx([...many(100, 'Belegt'), claim('Widerlegt')]), 0.909);
});

test('30 belegte mit Faktor 1 und 1 widerlegte mit Faktor 3 → 0,500', () => {
  assert.equal(idx([...many(30, 'Belegt'), claim('Widerlegt', weighted(3))]), 0.5);
});

test('Eine Widerlegung führt bei endlich vielen belegten Aussagen nie zu exakt 1', () => {
  for (const n of [1, 10, 1000, 100000]) assert.ok(FI.compute([...many(n, 'Belegt'), claim('Widerlegt')]).index < 1);
});

test('Keine bewertbaren Aussagen → kein Zahlenwert, sondern „Nicht bewertbar“', () => {
  const claims = [...many(5, 'Meinung / Prognose'), claim(null, { status: 'Nicht überprüfbar', verdict: null })];
  assert.equal(FI.compute(claims).index, null);
  const r = FI.rate(data(claims), { workStatus: 'Abgeschlossen' });
  assert.equal(r.key, 'nicht_bewertbar');
  assert.equal(r.reliable, false);
  assert.equal(FI.rate(null, null).key, 'nicht_bewertbar');
});

test('Noch nicht geprüfte Aussagen zählen nicht als widerlegt und nicht als ungeklärt, nur in der Prüfabdeckung', () => {
  const base = many(10, 'Belegt');
  const r = FI.compute([...base, ...open(5), ...open(2, 'In Bearbeitung')]);
  assert.equal(r.indexRounded, 1);
  assert.equal(r.indexed, 10);
  assert.equal(r.pending, 7);
  assert.equal(Math.round(r.coverage * 1000) / 1000, 0.588);
});

test('Geprüft, aber ungeklärt (nicht ausreichend belegbar) senkt den Index als ungeklärter Anteil und zählt als geprüft', () => {
  const r = FI.compute([...many(9, 'Belegt'), claim('Nicht ausreichend belegbar')]);
  assert.equal(r.indexRounded, 0.9);
  assert.equal(r.coverage, 1);
  assert.equal(r.counts.ungeklaert, 1);
});

test('Nicht überprüfbar, Meinungen, Fremdbezüge und Wiederholungen bleiben außerhalb von Index und Abdeckung', () => {
  const main = claim('Widerlegt');
  const claims = [...many(10, 'Belegt'), main,
    claim(null, { status: 'Nicht überprüfbar', verdict: null }),
    claim('Meinung / Prognose'),
    claim('Widerlegt', { occurrences: [{ role: 'Zurückweisung', roleStatus: 'Bestätigt' }] }),
    claim('Widerlegt', { factIndex: { duplicateOf: main.id } })];
  const r = FI.compute(claims);
  assert.equal(r.indexRounded, 0.5);
  assert.deepEqual([r.counts.nicht_pruefbar, r.counts.meinung, r.counts.fremdbezug, r.counts.duplikat], [1, 1, 1, 1]);
  assert.equal(r.coverage, 1);
});

test('Wiederholungen derselben Aussage (mehrere Fundstellen) werden nur einmal gewichtet', () => {
  const once = claim('Widerlegt');
  const thrice = { ...claim('Widerlegt'), occurrences: Array(3).fill({ role: 'Behauptung', roleStatus: 'Bestätigt' }) };
  assert.equal(idx([...many(10, 'Belegt'), once]), idx([...many(10, 'Belegt'), thrice]));
});

test('Höhere Bedeutung einer widerlegten Aussage senkt den Index, wenn positive Anteile vorhanden sind', () => {
  const a = FI.compute([...many(10, 'Belegt'), claim('Widerlegt')]).index;
  const b = FI.compute([...many(10, 'Belegt'), claim('Widerlegt', weighted(2))]).index;
  assert.ok(b < a);
  assert.equal(idx([claim('Widerlegt', weighted(3))]), 0, 'ohne positive Anteile bleibt 0');
});

test('Höhere Bedeutung einer belegten Aussage erhöht den Index, wenn negative oder ungeklärte Anteile vorhanden sind', () => {
  const a = FI.compute([claim('Belegt'), claim('Widerlegt')]).index;
  const b = FI.compute([claim('Belegt', weighted(3)), claim('Widerlegt')]).index;
  assert.ok(b > a);
  const c = FI.compute([claim('Belegt'), claim('Nicht ausreichend belegbar')]).index;
  const d = FI.compute([claim('Belegt', weighted(2)), claim('Nicht ausreichend belegbar')]).index;
  assert.ok(d > c);
  assert.equal(idx(many(4, 'Belegt', weighted(3))), 1, 'nur belegte bleiben 1');
});

test('Mischkategorien: Standardanteile und begründete eigene Anteile', () => {
  assert.equal(idx([claim('Teilweise belegt')]), 0.5);
  assert.equal(idx([claim('Irreführend / Kontext fehlt')]), 0.091);
  const own = claim('Teilweise belegt', { factIndex: { shares: { p: 0.75, f: 0, u: 0.25 }, sharesReason: 'Kernzahl belegt, nur Jahreszahl offen.' } });
  assert.equal(idx([own]), 0.75);
  assert.deepEqual(FI.validateData(data([own])), []);
  const bad = claim('Belegt', { factIndex: { shares: { p: 0.5, f: 0, u: 0.5 }, sharesReason: 'x' } });
  assert.equal(idx([bad]), 1, 'feste Kategorien ignorieren eigene Anteile');
  assert.ok(FI.validateData(data([bad])).length > 0);
});

test('Der Index bleibt immer zwischen 0 und 1 (Zufallsfälle)', () => {
  const verdicts = Object.keys(FI.CONFIG.shares);
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 500; k++) {
    const claims = Array.from({ length: 1 + Math.floor(rnd() * 40) }, () => claim(verdicts[Math.floor(rnd() * verdicts.length)], weighted(0.5 + Math.round(rnd() * 10) * 0.25)));
    const r = FI.compute(claims);
    assert.ok(r.index >= 0 && r.index <= 1 && r.unweighted >= 0 && r.unweighted <= 1);
  }
});

test('Ungewichteter Vergleichsindex und Differenz', () => {
  const r = FI.compute([...many(30, 'Belegt'), claim('Widerlegt', weighted(3))]);
  assert.equal(r.unweightedRounded, 0.75);
  assert.equal(r.indexRounded, 0.5);
  assert.equal(r.difference, -0.25);
  assert.equal(r.weightedClaims, 1);
});

test('Ampel nur aus Index und Bewertbarkeit: Schwellen 0,800 und 0,400 (gerundet auf drei Stellen)', () => {
  const done = { workStatus: 'Abgeschlossen' };
  const at = (p, f) => FI.rate(data([...many(p, 'Belegt'), ...many(f, 'Widerlegt')]), done);
  assert.equal(at(10, 0).key, 'gruen');
  assert.equal(at(40, 1).key, 'gruen');       // 40/50 = 0,800
  assert.equal(at(39, 1).key, 'gelb');        // 0,796
  assert.equal(at(20, 3).key, 'gelb');        // 20/50 = 0,400
  assert.equal(at(19, 3).key, 'rot');         // 0,388
  assert.equal(at(0, 10).key, 'rot');
  for (const k of ['gruen', 'gelb', 'rot']) assert.equal(FI.levelFor(k === 'gruen' ? 0.9 : k === 'gelb' ? 0.5 : 0.1), k);
  assert.equal(FI.rate(data(many(10, 'Belegt')), { workStatus: 'Abgeschlossen', ampel: 'rot' }).key, 'gruen', 'eine gesetzte Farbe wird ignoriert');
});

test('Graue Ampel bei zu geringer Prüfabdeckung, laufender Prüfung oder zu kleiner Grundlage – Index bleibt sichtbar', () => {
  const claims = [...many(10, 'Belegt'), ...open(5)];
  const running = FI.rate(data(claims), { workStatus: 'Teilbestand geprüft' });
  assert.equal(running.key, 'vorlaeufig');
  assert.equal(running.indexRounded, 1);
  assert.match(running.reason, /Prüfabdeckung 66 %/);
  assert.equal(FI.rate(data(claims), { workStatus: 'Abgeschlossen' }).key, 'nicht_bewertbar', 'abgeschlossen heißt nie „läuft“');
  assert.equal(FI.rate(data(many(20, 'Belegt')), { workStatus: 'In Bearbeitung' }).key, 'vorlaeufig');
  assert.equal(FI.rate(data(many(9, 'Belegt')), { workStatus: 'Abgeschlossen' }).key, 'nicht_bewertbar');
  assert.equal(FI.rate(data([...many(12, 'Belegt'), ...open(3)]), { workStatus: 'Abgeschlossen' }).key, 'gruen', '12/15 = 80 % reicht');
  assert.equal(FI.rate(data(many(30, 'Belegt'), 7200), { workStatus: 'Abgeschlossen' }).key, 'nicht_bewertbar', '30 in 2 h < 20 je Stunde');
});

test('Shorts und Musikvideos: Vollerhebung, ab 3 bewerteten Aussagen', () => {
  for (const format of ['short', 'musikvideo']) {
    assert.equal(FI.rate(data(many(3, 'Belegt'), 58), { format, workStatus: 'Abgeschlossen' }).key, 'gruen');
    assert.equal(FI.rate(data(many(2, 'Belegt'), 58), { format, workStatus: 'Abgeschlossen' }).key, 'nicht_bewertbar');
  }
});

test('Prüfung der factIndex-Felder: Begründungspflicht, Skala, Kontrolle durch anderen Agenten, Strittig', () => {
  const ok = claim('Belegt', weighted(2.5));
  assert.deepEqual(FI.validateData(data([ok])), []);
  const noReason = claim('Belegt', { factIndex: { ...weighted(2).factIndex, weightReason: '' } });
  assert.match(FI.validateData(data([noReason])).join(), /Begründung/);
  assert.match(FI.validateData(data([claim('Belegt', weighted(4))])).join(), /zwischen 0.5 und 3/);
  assert.match(FI.validateData(data([claim('Belegt', weighted(1.3))])).join(), /Schritten/);
  const self = claim('Belegt', { factIndex: { ...weighted(2).factIndex, weightStatus: 'Gegengeprüft', reviews: [{ agent: 'Claude', date: '2026-11-21', result: 'Bestätigt', reason: 'ok' }] } });
  assert.match(FI.validateData(data([self])).join(), /anderen Agenten/);
  const disputed = claim('Belegt', { factIndex: { ...weighted(2).factIndex, weightStatus: 'Gegengeprüft', reviews: [{ agent: 'ChatGPT', date: '2026-11-21', result: 'Abweichend', proposedWeight: 1, reason: 'Nebenaspekt' }] } });
  assert.match(FI.validateData(data([disputed])).join(), /bestätigende Kontrolle|strittig/);
  const checked = claim('Belegt', { factIndex: { ...weighted(2).factIndex, weightStatus: 'Gegengeprüft', reviews: [{ agent: 'ChatGPT', date: '2026-11-21', result: 'Bestätigt', reason: 'Zentrale These.' }], history: [{ date: '2026-11-21', agent: 'Claude', field: 'weight', previous: 1, next: 2, reason: 'Als zentrale Grundlage erkannt.' }] } });
  assert.deepEqual(FI.validateData(data([checked])), []);
  assert.match(FI.validateData(data([claim('Belegt', { factIndex: { foo: 1 } })])).join(), /kein bekanntes Feld/);
  const a = claim('Belegt'), b = claim('Belegt', { factIndex: { duplicateOf: a.id } }), c = claim('Belegt', { factIndex: { duplicateOf: b.id } });
  assert.match(FI.validateData(data([a, b, c])).join(), /Hauptaussage/);
  assert.match(FI.validateData(data([claim('Belegt', { factIndex: { duplicateOf: 'gibt-es-nicht' } })])).join(), /unbekannte/);
});

test('Bedeutungsfaktor: Standard 1,0 und Stufenbezeichnungen', () => {
  assert.equal(FI.weightOf(claim('Belegt')), 1);
  assert.equal(FI.weightLabel(0.5), 'Nebensächliche Aussage');
  assert.equal(FI.weightLabel(2.5), 'Hohe Bedeutung');
  assert.equal(FI.weightLabel(3), 'Sehr hohe Bedeutung');
});

test('Konfiguration ist zentral und unveränderlich', () => {
  assert.ok(Object.isFrozen(FI.CONFIG) && Object.isFrozen(FI.CONFIG.thresholds) && Object.isFrozen(FI.CONFIG.shares.Belegt));
  for (const s of Object.values(FI.CONFIG.shares)) assert.equal(s.p + s.f + s.u, 1);
  assert.equal(FI.CONFIG.refutedFactor, 10);
});

/* Anzeige: faktenindex-ui.js wird mit FactIndex in einem leeren Kontext geladen (kein DOM nötig). */
function ui() {
  const ctx = vm.createContext({ FactIndex: FI, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'faktenindex-ui.js'), 'utf8'), ctx);
  return ctx;
}

test('Anzeige: Index, Ampel und Prüfabdeckung; Rechnung aufklappbar; graue Ampel mit vorläufigem Index', () => {
  const ctx = ui();
  ctx.v = { id: 'X', video: { workStatus: 'Abgeschlossen' }, data: data([...many(30, 'Belegt'), claim('Widerlegt', weighted(3))]) };
  const head = vm.runInContext('fiHeader(v)', ctx);
  assert.match(head, /Faktenindex<\/dt><dd>0,500/);
  assert.match(head, /Ampel<\/dt><dd>Gelb/);
  assert.match(head, /Prüfabdeckung<\/dt><dd>100 %/);
  assert.match(head, /zehnmal stärker gewichtet/);
  assert.match(head, /<details class="fi-details">/);
  assert.match(head, /Ungewichteter Index: <b>0,750<\/b>.*Differenz: <b>−0,250<\/b>/s);
  ctx.w = { id: 'Y', video: { workStatus: 'Teilbestand geprüft' }, data: data([...many(10, 'Belegt'), ...open(10)]) };
  const card = vm.runInContext("fiAmpelView(w, '')", ctx);
  assert.match(card, /ampel-vorlaeufig/);
  assert.match(card, /Faktenindex 1,000 \(vorläufig\) · Grau/);
  assert.match(card, /Prüfabdeckung 50 %/);
});

test('Anzeige je Aussage: Faktor, Begründung, Anteile, Kontrollen, Agenten; Ungeprüftes ohne Indexwirkung', () => {
  const ctx = ui();
  const c = claim('Widerlegt', { factIndex: { ...weighted(2.5, 'Die Aussage ist für die zentrale Argumentation des Videos entscheidend.').factIndex, reviews: [{ agent: 'ChatGPT', date: '2026-11-21', result: 'Abweichend', proposedWeight: 2, reason: 'Wichtig, aber nicht allein tragend.' }], weightStatus: 'Strittig' } });
  ctx.v = { id: 'X', data: data([...many(10, 'Belegt'), c]) };
  ctx.c = c;
  const html = vm.runInContext('fiClaimBlock(c, v)', ctx);
  assert.match(html, /Faktenstatus<\/dt><dd>Widerlegt/);
  assert.match(html, /<b>2,50<\/b> – KI-Einschätzung: Hohe Bedeutung · Strittig/);
  assert.match(html, /zentrale Argumentation/);
  assert.match(html, /widerlegt 100 %/);
  assert.match(html, /Abweichend \(vorgeschlagen 2,00\)/);
  assert.match(html, /Claude, ChatGPT/);
  assert.match(vm.runInContext('fiClaimBadge(c)', ctx), /Bedeutung 2,50 · strittig/);
  ctx.o = open(1)[0];
  assert.match(vm.runInContext('fiClaimBlock(o, v)', ctx), /zählt nicht im Index \(weder als widerlegt noch als ungeklärt\)/);
  assert.equal(vm.runInContext('fiClaimBadge(o)', ctx), '');
});

test('Methodik nennt Formel, Schwellen und Beispiele aus der zentralen Konfiguration', () => {
  const html = vm.runInContext("fiMethod(k => '<i>' + k + '</i>')", ui());
  assert.match(html, /10 belegt, 1 widerlegt → 0,500/);
  assert.match(html, /100 belegt, 1 widerlegt → 0,909/);
  assert.match(html, /Grün: Faktenindex ab 0,800/);
  assert.match(html, /Prüfabdeckung unter 80 %/);
});

/* Echte Daten dieses Repositories: Felder gültig, Werte im Bereich, Ampel nur aus Index und Bewertbarkeit. */
const BASE = path.join(__dirname, '..', 'faktenchecks');
for (const id of fs.existsSync(BASE) ? fs.readdirSync(BASE).sort() : []) {
  const file = path.join(BASE, id, 'strukturiert', 'aussagen.json');
  if (!fs.existsSync(file)) continue;
  test(`Echte Daten ${id}: Faktenindex gültig und konsistent`, () => {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    const vf = path.join(BASE, id, 'video.json');
    const video = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, 'utf8')) : null;
    assert.deepEqual(FI.validateData(d), []);
    const r = FI.rate(d, video);
    if (r.index != null) assert.ok(r.index >= 0 && r.index <= 1);
    if (r.reliable) {
      assert.equal(r.key, FI.levelFor(r.indexRounded));
      assert.ok(r.coverage >= FI.CONFIG.minCoverage);
    }
    if (video?.workStatus === 'Abgeschlossen') assert.notEqual(r.key, 'vorlaeufig', 'Abgeschlossene Videos erscheinen nie als „Prüfung läuft“');
    /* Jede Aussage ist genau einer Klasse zugeordnet; Index und Abdeckung zählen jede höchstens einmal. */
    assert.equal(Object.values(r.counts).reduce((a, b) => a + b, 0), d.claims.length);
  });
}
