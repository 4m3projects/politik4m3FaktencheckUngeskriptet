/*
 * Tests für die zweite Bewertungsebene „Rhetorik und Darstellung“ (site/rhetoric.js).
 * Ausführen: node --test site/rhetoric-test.js   (läuft im Workflow „Webseite“)
 * Nutzt fiktive Testdaten (klar gekennzeichnet) und prüft zusätzlich die echten Projektdaten.
 * Wird nicht veröffentlicht.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('./rhetoric.js');

const ROOT = path.join(__dirname, '..');
const BASE = path.join(ROOT, 'faktenchecks');
const NOTE = 'Fiktive Testdaten – kein echter Faktencheck.';
const V = 'FIKTIVRHET1';
const clone = x => JSON.parse(JSON.stringify(x));
const has = (list, re) => assert.ok(list.some(e => re.test(e)), 'erwartet: ' + re + '\nerhalten: ' + list.join(' | '));
const deepFreeze = o => { Object.values(o).forEach(x => { if (x && typeof x === 'object') deepFreeze(x); }); return Object.freeze(o); };

function claim(n, kind, verdict) {
  return { id: `${V}-A000${n}`, videoId: V, chapter: 1, kind, status: verdict ? 'Abgeschlossen' : 'Offen', verdict,
    description: 'Fiktive Aussage ' + n + ' (' + NOTE + ')', reason: NOTE, occurrences: [], relations: [] };
}
const FACTS = {
  schemaVersion: 2,
  scope: { videoId: V, durationSeconds: 600, kind: 'Teilbestand' },
  speakers: [{ id: 'SP01', name: 'Fiktive Person', videoRole: 'Gast', identityBasis: NOTE }],
  claims: [claim(1, 'Tatsachenbehauptung', 'Belegt'), claim(2, 'Meinung', 'Meinung / Prognose'), claim(3, 'Tatsachenbehauptung', 'Widerlegt')]
};
function ann(n, claimNo, feature, extra = {}) {
  return {
    id: `${V}-R000${n}`, claimId: claimNo ? `${V}-A000${claimNo}` : null, feature, startSeconds: 10 * n, endSeconds: 10 * n + 5,
    speaker: { id: 'SP01', attribution: 'Plausibel', basis: NOTE },
    observation: 'Fiktive Beobachtung. ' + NOTE, reason: NOTE, context: NOTE, assessment: 'Erkennbar', reliability: 'Mittel',
    uncertainty: NOTE, missingInformation: null, status: 'KI-Vorschlag', basis: NOTE,
    history: [{ date: '2026-11-18', by: 'Test', change: NOTE }], ...extra
  };
}
const RHET = {
  schemaVersion: 1, videoId: V,
  review: { status: 'Teilweise geprüft', checkedOn: '2026-11-18', by: 'Test', basis: NOTE, coverage: NOTE, limits: [NOTE], history: [] },
  annotations: [ann(1, 1, 'abwertung'), ann(2, 2, 'ironie')]
};
const errs = (r, f = FACTS) => R.validate(r, V, f);

test('Fiktive Daten sind gültig und klar gekennzeichnet', () => {
  assert.deepEqual(errs(RHET), []);
  assert.match(V, /^FIKTIV/);
  for (const a of RHET.annotations) assert.match(a.observation, /Fiktive Testdaten/);
});

test('Prüffall: „Belegt“ + abwertende Formulierung bleiben getrennt darstellbar', () => {
  const by = R.byClaim(RHET);
  const c = FACTS.claims[0];
  assert.equal(c.verdict, 'Belegt');
  assert.deepEqual(by.get(c.id).map(a => a.feature), ['abwertung']);
  assert.equal(Object.hasOwn(by.get(c.id)[0], 'verdict'), false, 'Annotation trägt keine Faktenbewertung');
});

test('Prüffall: „Meinung / Prognose“ + Ironie bleiben getrennt darstellbar', () => {
  const by = R.byClaim(RHET);
  const c = FACTS.claims[1];
  assert.equal(c.verdict, 'Meinung / Prognose');
  assert.deepEqual(by.get(c.id).map(a => a.feature), ['ironie']);
});

test('Prüffall: „Widerlegt“ ohne Rhetorik-Hinweis ist gültig – kein Merkmal wird erzwungen', () => {
  assert.equal(R.byClaim(RHET).get(FACTS.claims[2].id), undefined);
  assert.deepEqual(errs({ ...RHET, annotations: [] }), []);
});

test('Fehlende Rhetorikdatei bricht nichts und gilt als „noch nicht geprüft“, nicht als unauffällig', () => {
  assert.deepEqual(R.reviewState(null), { status: 'Noch nicht geprüft', annotations: 0, claims: 0 });
  assert.equal(R.byClaim(null).size, 0);
  assert.equal(R.visible(undefined).length, 0);
  assert.deepEqual(Object.values(R.featureCounts(null)), Object.keys(R.FEATURES).map(() => 0));
});

test('Rhetorik verändert keine Faktendaten (Ebene 1 bleibt unverändert)', () => {
  const facts = deepFreeze(clone(FACTS)), rhet = deepFreeze(clone(RHET));
  const before = JSON.stringify(facts);
  assert.deepEqual(R.validate(rhet, V, facts), []);
  R.byClaim(rhet); R.featureCounts(rhet); R.reviewState(rhet); R.visible(rhet);
  assert.equal(JSON.stringify(facts), before);
});

test('Keine Fehlerpunkte, Noten oder Faktenurteile in Rhetorik-Annotationen', () => {
  for (const f of ['verdict', 'score', 'points', 'penalty', 'rating']) {
    const r = clone(RHET); r.annotations[0][f] = 'Widerlegt';
    has(errs(r), new RegExp('Feld ' + f + ' ist verboten'));
  }
  const r = clone(RHET); r.annotations[0].irgendwas = 1;
  has(errs(r), /unbekanntes Feld irgendwas/);
});

test('Pflichtangaben je Markierung: Zeitmarke, Sprecher, Beobachtung, Merkmal, Begründung, Unsicherheit', () => {
  for (const f of ['observation', 'reason', 'context', 'uncertainty', 'basis']) {
    const r = clone(RHET); r.annotations[0][f] = ' ';
    has(errs(r), new RegExp(f + ' fehlt'));
  }
  let r = clone(RHET); r.annotations[0].feature = 'luege';
  has(errs(r), /unbekanntes Merkmal/);
  r = clone(RHET); r.annotations[0].endSeconds = 5;
  has(errs(r), /Zeitmarke/);
  r = clone(RHET); r.annotations[0].startSeconds = 590; r.annotations[0].endSeconds = 700;
  has(errs(r), /außerhalb der Videolaufzeit/);
  r = clone(RHET); r.annotations[0].speaker = { id: 'SP01', attribution: 'Ungeklärt', basis: NOTE };
  has(errs(r), /ungeklärtem Sprecher/);
  r = clone(RHET); r.annotations[0].speaker.id = 'SP99';
  has(errs(r), /SP99 steht nicht im Sprecherverzeichnis/);
  r = clone(RHET); r.annotations[0].assessment = 'Sicher';
  has(errs(r), /assessment/);
  r = clone(RHET); r.annotations[0].history = [];
  has(errs(r), /Erfassungseintrag/);
  r = clone(RHET); r.annotations[0].claimId = `${V}-A0099`;
  has(errs(r), /A0099 existiert nicht/);
  r = clone(RHET); r.annotations[1].id = r.annotations[0].id;
  has(errs(r), /doppelte id/);
});

test('Tunnelblick nur mit konkret benannter fehlender Information und Quelle oder Begründung', () => {
  let r = clone(RHET); r.annotations.push(ann(3, 3, 'tunnelblick'));
  has(errs(r), /Tunnelblick braucht missingInformation/);
  r = clone(RHET); r.annotations.push(ann(3, 3, 'tunnelblick', { missingInformation: { what: 'Fiktive Gegenzahl.' } }));
  has(errs(r), /Tunnelblick braucht/);
  r = clone(RHET); r.annotations.push(ann(3, 3, 'tunnelblick', { missingInformation: { what: 'Fiktive Gegenzahl.', source: 'https://example.org/fiktiv' } }));
  assert.deepEqual(errs(r), []);
  r = clone(RHET); r.annotations.push(ann(3, 3, 'tunnelblick', { assessment: 'Nicht beurteilbar' }));
  assert.deepEqual(errs(r), [], '„Nicht beurteilbar“ braucht keine Gegeninformation');
});

test('Prüfstand je Video: Vollständigkeit nur ohne offene Grenzen; verworfene Hinweise werden nicht angezeigt', () => {
  let r = clone(RHET); r.review.status = 'Vollständig geprüft';
  has(errs(r), /Vollständig geprüft/);
  r = clone(RHET); r.review.status = 'fertig';
  has(errs(r), /review.status/);
  r = clone(RHET); r.annotations[0].status = 'Redaktionell verworfen';
  assert.deepEqual(errs(r), []);
  assert.equal(R.visible(r).length, 1);
  assert.equal(R.featureCounts(r).abwertung, 0);
  assert.deepEqual(R.reviewState(r), { status: 'Teilweise geprüft', annotations: 1, claims: 1 });
});

/* ---------- Echte Projektdaten ---------- */

const videoDirs = fs.readdirSync(BASE).filter(x => /^[A-Za-z0-9_-]{11}$/.test(x) && fs.existsSync(path.join(BASE, x, 'video.json')));
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));

test('Echte Projektdaten: jede rhetorik.json ist gültig und passt zu ihren Aussagen', () => {
  let n = 0;
  for (const id of videoDirs) {
    const p = path.join(BASE, id, 'rhetorik.json');
    if (!fs.existsSync(p)) continue;
    const factsPath = path.join(BASE, id, 'strukturiert', 'aussagen.json');
    const facts = fs.existsSync(factsPath) ? read(factsPath) : null;
    assert.deepEqual(R.validate(read(p), id, facts), [], id);
    n++;
  }
  assert.ok(n > 0, 'mindestens ein Video ist rhetorisch eingeordnet');
});

test('Echte Projektdaten: Rhetorik steht nicht in den Faktendateien und kein Video behauptet Vollständigkeit ohne Grundlage', () => {
  for (const id of videoDirs) {
    assert.equal(fs.existsSync(path.join(BASE, id, 'strukturiert', 'rhetorik.json')), false, id);
    const factsPath = path.join(BASE, id, 'strukturiert', 'aussagen.json');
    if (fs.existsSync(factsPath)) {
      for (const c of read(factsPath).claims) assert.equal(Object.keys(c).some(k => /rhetor/i.test(k)), false, c.id);
    }
    const p = path.join(BASE, id, 'rhetorik.json');
    if (fs.existsSync(p)) {
      const r = read(p);
      for (const a of r.annotations) assert.equal(a.status, 'KI-Vorschlag', a.id + ': ohne redaktionelle Prüfung nur als KI-Vorschlag');
      assert.notEqual(r.review.status, 'Vollständig geprüft', id);
    }
  }
});

test('Echte Projektdaten: „Meinung / Prognose“ + Ironie liegt real vor und bleibt getrennt', () => {
  const id = 'zUnxDR5ttRU';
  const p = path.join(BASE, id, 'rhetorik.json');
  if (!fs.existsSync(p)) return;
  const facts = read(path.join(BASE, id, 'strukturiert', 'aussagen.json'));
  const by = R.byClaim(read(p));
  const c = facts.claims.find(x => x.id === id + '-A0001');
  assert.equal(c.verdict, 'Meinung / Prognose');
  assert.ok(by.get(c.id).some(a => a.feature === 'ironie'));
  assert.ok(by.get(c.id).some(a => a.feature === 'abwertung'));
});
