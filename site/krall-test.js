/* [Codex] Fallregressionen zu #13. Keine Testdaten im veröffentlichten Bestand. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('./relations.js');
const ROOT = path.join(__dirname, '..');
const O = 'OQnvClWgN-g', A = 'qQAcmDzd9O8', P = 'L7E04TJtRBU';
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const data = Object.fromEntries([O, A, P].map(id => [id, read(`faktenchecks/${id}/strukturiert/aussagen.json`)]));
const meta = Object.fromEntries([O, A, P].map(id => [id, read(`faktenchecks/${id}/video.json`)]));
const relations = read('faktenchecks/beziehungen.json');
const byText = (id, re) => { const c = data[id].claims.find(c => re.test(c.description)); assert.ok(c, String(re)); return c; };

test('Krall: drei verschiedene Prüfobjekte, zwei Reaktionen zu genau diesem Original', () => {
  assert.equal(meta[O].role, 'original');
  for (const id of [A, P]) {
    assert.equal(meta[id].role, 'reaction');
    assert.notEqual(meta[id].channel, meta[O].channel);
    const rel = relations.relations.filter(r => r.reactionVideoId === id);
    assert.equal(rel.length, 1);
    assert.equal(rel[0].originalVideoId, O);
    assert.equal(rel[0].certainty, 'Belegt');
    assert.ok(rel[0].claimLinks.length > 0);
  }
  assert.notEqual(meta[A].channel, meta[P].channel);
});

test('Krall: Teilbestand und vorhandene Vorarbeit ergeben keine künstliche Voll- oder Fehlerquote', () => {
  for (const id of [O, A, P]) {
    assert.equal(data[id].scope.kind, 'Teilbestand');
    assert.match(data[id].scope.coverageNote, /keine.*[Ff]ehlerquote/);
    assert.ok(data[id].claims.some(c => c.verdict === 'Belegt'));
    assert.ok(data[id].claims.filter(c => c.status !== 'Abgeschlossen').every(c => c.verdict === null && c.openQuestions.length));
  }
  const archive = fs.readFileSync(path.join(ROOT, 'docs/arbeitsstaende/krall/vorarbeit-2026-11-14.md'), 'utf8');
  assert.equal((archive.match(/^## V14-/gm) || []).length, 178);
  assert.match(archive, /keine 178 atomaren Tatsachen, keine 178 Fehler/);
  assert.match(archive, /SHA-256 [0-9a-f]{64}/);
});

test('Krall: Hosteinwand, Gast und fremde Wiedergaben bleiben getrennt', () => {
  const host = byText(O, /^Ben fragt/);
  assert.equal(host.occurrences[0].role, 'Rückfrage');
  assert.equal(host.occurrences[0].candidateSpeakerId, 'SP02');
  assert.equal(host.kind, 'Meinung');
  assert.equal(host.verdict, 'Meinung / Prognose');
  for (const d of Object.values(data)) for (const c of d.claims) for (const o of c.occurrences) {
    assert.notEqual(o.attributionStatus, 'Bestätigt', 'keine Textprüfung als Stimmkontrolle ausgeben');
    assert.equal(o.precision, 'Ungefähr');
    assert.ok(o.endSeconds <= d.scope.durationSeconds);
  }
  assert.equal(byText(O, /Unabhängigkeit der EZB/).verdict, 'Meinung / Prognose', 'praktisches Gesamturteil nicht allein durch Rechtsnorm als falsch einstufen');
});

test('Krall: richtige Rechnungen und zu starke Wiedergaben getrennt prüfen', () => {
  assert.equal(byText(O, /sechs auf 4,8/).verdict, 'Widerlegt');
  const quote = byText(P, /ausdrücklich.*22 Prozent/);
  assert.equal(quote.verdict, 'Teilweise belegt');
  assert.match(quote.reason, /20 Prozent/);
  assert.equal(byText(P, /100 auf 122/).verdict, 'Belegt');
  assert.equal(byText(O, /gegenüber Gold über 99/).verdict, 'Belegt');
  assert.equal(byText(O, /sämtliche Güter/).verdict, 'Widerlegt');
  assert.equal(byText(P, /gesamtes künftiges Einkommen/).verdict, 'Teilweise belegt');
});

test('Krall: regionale und globale Korallenfragen nicht zu künstlichem Konflikt vereinigen', () => {
  assert.equal(byText(O, /weltweiten Korallenflächen/).verdict, 'Nicht ausreichend belegbar');
  assert.equal(byText(P, /AIMS dokumentiere/).verdict, 'Belegt');
  assert.equal(byText(P, /weltweiten aktuellen Korallenrekord/).verdict, 'Irreführend / Kontext fehlt');
  const link = relations.relations.find(r => r.reactionVideoId === P).claimLinks.find(l => l.reactionClaimId === byText(P, /AIMS dokumentiere/).id);
  assert.equal(link.type, 'ergaenzt', 'regionaler Beleg hat anderen Prüfumfang');
});

test('Krall: über Alfred identifizierte Aussagen getrennt von ihrer Wiedergabe nachprüfen', () => {
  for (const re of [/gesamte Corona-Zeit/, /Politiker seien im Durchschnitt/]) {
    const original = byText(O, re);
    assert.equal(original.status, 'Abgeschlossen');
    assert.ok(original.research.rounds.length >= (original.verdict === 'Nicht ausreichend belegbar' ? 2 : 1));
    const links = relations.relations.find(r => r.reactionVideoId === A).claimLinks.filter(l => l.originalClaimId === original.id);
    assert.ok(links.length > 0);
    assert.ok(links.every(l => l.type === 'gibt_wieder'));
  }
});

test('Krall: fehlende Indexdaten bleiben offen, zugängliche EBA-Belege werden ausgewertet', () => {
  for (const re of [/Jeder Satz/, /alle zehn Minuten/, /alle acht Minuten/, /1.360 Punkten/]) {
    const c = byText(A, re);
    assert.equal(c.verdict, null);
    assert.notEqual(c.status, 'Abgeschlossen');
  }
  const capital = byText(A, /Rekordkapitalpolster/);
  assert.equal(capital.verdict, 'Teilweise belegt');
  assert.match(capital.reason, /Quote|quote/);
  assert.ok(capital.sourceRefs.every(ref => data[A].sources.some(s => s.id === ref.sourceId && /eba\.europa\.eu/.test(s.url))));
  const may = byText(A, /Mai 2020.*Vorhersage/);
  assert.equal(may.verdict, 'Irreführend / Kontext fehlt');
  assert.match(may.reason, /12\.03\.2020/);
  assert.ok(may.openQuestions.length > 0, 'inhaltlicher Primärabgleich bleibt sichtbar');
  const secondary = byText(P, /garantierter sofortiger Weiterverkauf/);
  assert.equal(secondary.verdict, 'Belegt');
  assert.match(secondary.reason, /amtliche OMT-Urteilserläuterung/);
});

test('Krall: Quellen, konkrete Referenzen und Konfliktaufgaben auf echten Daten', () => {
  const videos = new Map([O, A, P].map(id => [id, { meta: meta[id], claims: data[id].claims }]));
  const rel = { schemaVersion: 1, relations: relations.relations.filter(r => [A, P].includes(r.reactionVideoId)) };
  assert.deepEqual(R.validateRelations(rel, videos), []);
  for (const r of rel.relations) for (const l of r.claimLinks) {
    const oc = data[O].claims.find(c => c.id === l.originalClaimId);
    const rc = data[r.reactionVideoId].claims.find(c => c.id === l.reactionClaimId);
    assert.ok(oc && rc);
    assert.equal(l.reactionSeconds, rc.occurrences[0].startSeconds);
    const cmp = R.compareLink(l, oc, rc);
    if (cmp.state === 'konflikt') assert.ok(l.review?.task, 'echter Konflikt braucht Aufgabe');
  }
  const invalid = structuredClone(rel);
  invalid.relations[0].claimLinks[0].originalClaimId = `${O}-A9999`;
  assert.ok(R.validateRelations(invalid, videos).some(e => /existiert nicht/.test(e)));
  const conflict = structuredClone(rel);
  const link = conflict.relations[0].claimLinks.find(l => l.type === 'gegenbehauptung');
  const original = data[O].claims.find(c => c.id === link.originalClaimId);
  const fakeVideos = new Map([...videos].map(([id, v]) => [id, structuredClone(v)]));
  fakeVideos.get(A).claims.find(c => c.id === link.reactionClaimId).verdict = original.verdict;
  delete link.review;
  assert.ok(R.validateRelations(conflict, fakeVideos).some(e => /Prüfkonflikt ohne Review/.test(e)));
});

test('Krall: Vergleichsbericht verlinkt nur vorhandene Aussagen aller drei Videos', () => {
  const md = fs.readFileSync(path.join(ROOT, `faktenchecks/${O}/vergleich.md`), 'utf8');
  const targets = [...md.matchAll(/#\/video\/([\w-]{11})\/aussage\/([\w-]+)\)/g)];
  assert.deepEqual([...new Set(targets.map(m => m[1]))].sort(), [O, A, P].sort());
  for (const [, id, claim] of targets) assert.ok(data[id].claims.some(c => c.id === claim), claim);
  assert.match(md, /Fehlender Eintrag bedeutet/);
  assert.match(md, /Keine vollständige audiovisuelle Kontrolle/);
});
