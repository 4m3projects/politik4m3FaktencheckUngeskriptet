/*
 * Tests für Originale, Reaktionen und Beziehungen (site/relations.js).
 * Ausführen: node --test site/relations-test.js   (läuft im Workflow „Webseite“)
 * Nutzt fiktive Fixtures aus site/relations-fixtures.js und prüft zusätzlich die echten Projektdaten.
 * Wird nicht veröffentlicht.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('./relations.js');
const F = require('./relations-fixtures.js');

const clone = x => JSON.parse(JSON.stringify(x));
const errs = (rel, videos = F.VIDEOS) => R.validateRelations(rel, F.videoMap(videos));
const has = (list, re) => assert.ok(list.some(e => re.test(e)), 'erwartet: ' + re + '\nerhalten: ' + list.join(' | '));

test('Startseite sortiert nach dem jüngeren Datum aus Prüfstand und Veröffentlichung', () => {
  const video = (id, asOf, meta = {}) => ({ id, meta, data: asOf ? { scope: { asOf } } : null });
  const entries = [
    video('ohne-datum', null),
    video('alt', '2026-11-18', { Veröffentlichung: '2025-08-23' }),
    video('neuer-upload', '2026-11-17', { Veröffentlichung: '2026-11-20' }),
    video('gleichstand', '2026-11-18', { 'Veröffentlichung laut erfassten Metadaten': '9.11.2026' }),
    video('nachrecherche', '2026-11-19', { Veröffentlichung: '2024-02-29' }),
    video('nur-upload', null, { 'Upload laut Metadaten': '18.11.2026; Laufzeit: 1:00' }),
    video('ungueltig', null, { Veröffentlichung: '31.02.2026' }),
  ];
  assert.deepEqual(entries.sort(R.compareVideoRecency).map(v => v.id), [
    'neuer-upload', 'nachrecherche', 'nur-upload', 'gleichstand', 'alt', 'ohne-datum', 'ungueltig',
  ]);
});

test('Fixtures sind gültig und klar als fiktiv gekennzeichnet', () => {
  assert.deepEqual(errs(F.RELATIONS), []);
  for (const [id, v] of Object.entries(F.VIDEOS)) {
    assert.deepEqual(R.validateVideoMeta(v.meta, id), []);
    assert.match(id, /^FIKTIV/);
    for (const c of v.data.claims) assert.match(c.description, /Fiktive Testdaten/);
  }
  assert.match(F.RELATIONS.note, /Fiktive Testdaten/);
});

test('Zwei Reaktionen verschiedener Kanäle zu einem Original, eine Reaktion zu zwei Originalen', () => {
  const ix = R.buildIndex(F.RELATIONS);
  const reactions = ix.byOriginal.get(F.O1).map(r => r.reactionVideoId);
  assert.deepEqual(reactions.sort(), [F.RA, F.RB].sort());
  assert.notEqual(F.VIDEOS[F.RA].meta.channel, F.VIDEOS[F.RB].meta.channel);
  assert.deepEqual(ix.byReaction.get(F.RA).map(r => r.originalVideoId).sort(), [F.O1, F.O2].sort());
  assert.equal(ix.byClaim.get(`${F.O1}-A0003`).length, 2, 'eine Originalaussage kann von mehreren Reaktionen verknüpft sein');
  assert.equal(ix.byOriginal.get(F.RA), undefined, 'Reaktion ist kein Original');
});

test('Video-Metadaten: Pflichtfelder, Rolle und belegte Identifikation', () => {
  const ok = F.VIDEOS[F.O1].meta;
  has(R.validateVideoMeta({ ...ok, role: 'reaktion' }, F.O1), /role/);
  has(R.validateVideoMeta({ ...ok, videoId: F.O2 }, F.O1), /passt nicht zum Verzeichnis/);
  has(R.validateVideoMeta({ ...ok, identification: { ...ok.identification, certainty: 'Plausibel' } }, F.O1), /nur nach belegter Identifikation/);
  has(R.validateVideoMeta({ ...ok, reactionType: 'kritisch' }, F.O1), /keinen reactionType/);
  has(R.validateVideoMeta({ ...F.VIDEOS[F.RA].meta, reactionType: 'boese' }, F.RA), /reactionType/);
  has(R.validateVideoMeta({ ...ok, videoUrl: 'http://example.org' }, F.O1), /HTTPS/);
  has(R.validateVideoMeta({ ...ok, workStatus: 'fertig' }, F.O1), /workStatus/);
  has(R.validateVideoMeta([], F.O1), /JSON-Objekt/);
  // Eine Reaktion darf nur plausibel zugeordnet sein; das wird dann in der Beziehung offen ausgewiesen.
  assert.deepEqual(R.validateVideoMeta({ ...F.VIDEOS[F.RB].meta, identification: { ...ok.identification, certainty: 'Plausibel' } }, F.RB), []);
});

test('Fehlende Referenzen werden erkannt', () => {
  let rel = clone(F.RELATIONS); rel.relations[0].originalVideoId = 'FEHLTXXXXXX';
  has(errs(rel), /Original FEHLTXXXXXX existiert nicht/);
  rel = clone(F.RELATIONS); rel.relations[0].claimLinks[1].originalClaimId = `${F.O1}-A0999`;
  has(errs(rel), /Originalaussage .*A0999 existiert nicht/);
  rel = clone(F.RELATIONS); rel.relations[0].claimLinks[1].reactionClaimId = `${F.RA}-A0999`;
  has(errs(rel), /Reaktionsaussage .*A0999 existiert nicht/);
  rel = clone(F.RELATIONS); rel.relations[0].claimLinks[0].reactionClaimId = null;
  has(errs(rel), /Vergleich braucht reactionClaimId/);
});

test('Rollen, Selbstbezug, Duplikate und Pflichtbegründungen', () => {
  let rel = clone(F.RELATIONS); rel.relations[0].reactionVideoId = F.O2;
  has(errs(rel), /nicht als Reaktion eingeordnet/);
  rel = clone(F.RELATIONS); rel.relations[0].originalVideoId = F.RB;
  has(errs(rel), /nicht als Original eingeordnet/);
  const unclassified = clone(F.VIDEOS); unclassified[F.O1].meta = null;
  has(errs(F.RELATIONS, unclassified), /nicht als Original eingeordnet/);
  rel = clone(F.RELATIONS); rel.relations[0].originalVideoId = F.RA;
  has(errs(rel), /auf sich selbst/);
  rel = clone(F.RELATIONS); rel.relations[1].id = 'R0001';
  has(errs(rel), /doppelte id/);
  rel = clone(F.RELATIONS); rel.relations[1].claimLinks[0].id = 'L0001';
  has(errs(rel), /L0001: doppelte id/);
  rel = clone(F.RELATIONS); rel.relations.push({ ...clone(F.RELATIONS.relations[0]), id: 'R0009', claimLinks: [] });
  has(errs(rel), /doppelt erfasst/);
  rel = clone(F.RELATIONS); rel.relations[0].basis = ' ';
  has(errs(rel), /Begründung/);
  rel = clone(F.RELATIONS); rel.relations[0].claimLinks[2].note = '';
  has(errs(rel), /note/);
  rel = clone(F.RELATIONS); rel.relations[0].claimLinks[2].type = 'beliebig';
  has(errs(rel), /unbekannter type/);
  rel = clone(F.RELATIONS); rel.relations[0].certainty = 'Sicher';
  has(errs(rel), /certainty/);
  rel = clone(F.RELATIONS); rel.relations[1].claimLinks[0].history = [{ date: 'gestern', change: 'x' }];
  has(errs(rel), /history/);
  has(R.validateRelations({ schemaVersion: 1 }, F.videoMap()), /relations muss eine Liste/);
});

test('Konfliktkennzeichnung: gleiche Behauptung, Gegenbehauptung, offen, ohne Vergleich, geklärt', () => {
  const c = v => ({ verdict: v });
  const L = type => ({ type });
  assert.equal(R.compareLink(L('gleiche_behauptung'), c('Belegt'), c('Widerlegt')).state, 'konflikt');
  assert.equal(R.compareLink(L('gleiche_behauptung'), c('Belegt'), c('Teilweise belegt')).state, 'stimmig', 'Abstufung ist kein Konflikt');
  assert.equal(R.compareLink(L('gleiche_behauptung'), c('Irreführend / Kontext fehlt'), c('Widerlegt')).state, 'stimmig');
  assert.equal(R.compareLink(L('gegenbehauptung'), c('Widerlegt'), c('Belegt')).state, 'stimmig');
  assert.equal(R.compareLink(L('gegenbehauptung'), c('Belegt'), c('Belegt')).state, 'konflikt');
  assert.equal(R.compareLink(L('gleiche_behauptung'), c('Belegt'), c('Meinung / Prognose')).state, 'offen', 'Meinung ist nicht falsch');
  assert.equal(R.compareLink(L('gleiche_behauptung'), c('Belegt'), c('Nicht ausreichend belegbar')).state, 'offen');
  assert.equal(R.compareLink(L('gleiche_behauptung'), c('Belegt'), c(null)).state, 'offen');
  assert.equal(R.compareLink(L('gibt_wieder'), c('Belegt'), c('Widerlegt')).state, 'kein_vergleich');
  assert.equal(R.compareLink({ type: 'gleiche_behauptung', resolution: {} }, c('Belegt'), c('Widerlegt')).state, 'geklaert');
  // Fixtures: genau ein offener Konflikt, eine geklärte Abweichung, eine stimmige Gegenbehauptung.
  const states = {};
  for (const r of F.RELATIONS.relations) for (const l of r.claimLinks) {
    const oc = R.findClaim({ claims: F.VIDEOS[r.originalVideoId].data.claims }, l.originalClaimId);
    const rc = R.findClaim({ claims: F.VIDEOS[r.reactionVideoId].data.claims }, l.reactionClaimId);
    states[l.id] = R.compareLink(l, oc, rc).state;
  }
  assert.deepEqual(states, { L0001: 'konflikt', L0002: 'stimmig', L0003: 'kein_vergleich', L0004: 'geklaert', L0005: 'kein_vergleich' });
});

test('Ungeklärter Konflikt ohne Review-Aufgabe blockiert, unvollständige Klärung ebenfalls', () => {
  let rel = clone(F.RELATIONS); delete rel.relations[0].claimLinks[0].review;
  has(errs(rel), /ungeklärter Prüfkonflikt ohne Review-Aufgabe/);
  rel = clone(F.RELATIONS); rel.relations[0].claimLinks[0].review = { task: 'kein link', note: 'x' };
  has(errs(rel), /review braucht task/);
  rel = clone(F.RELATIONS); rel.relations[1].claimLinks[0].resolution.sources = [];
  has(errs(rel), /resolution braucht/);
  rel = clone(F.RELATIONS); rel.relations[1].claimLinks[0].resolution.status = 'angeglichen';
  has(errs(rel), /resolution braucht/);
  // Ohne gültige Klärung wird die Abweichung wieder zum Konflikt und braucht eine Review-Aufgabe.
  rel = clone(F.RELATIONS); delete rel.relations[1].claimLinks[0].resolution;
  has(errs(rel), /L0004: ungeklärter Prüfkonflikt/);
});

test('Echte Projektdaten: jedes Video eingeordnet, bestehende Interviews als Original, Beziehungen gültig', () => {
  const root = path.join(__dirname, '..', 'faktenchecks');
  const videos = new Map();
  for (const id of fs.readdirSync(root).filter(x => /^[A-Za-z0-9_-]{11}$/.test(x))) {
    if (!fs.existsSync(path.join(root, id, 'README.md'))) continue;
    const metaPath = path.join(root, id, 'video.json');
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
    if (meta) assert.deepEqual(R.validateVideoMeta(meta, id), [], id);
    const dataPath = path.join(root, id, 'strukturiert', 'aussagen.json');
    const claims = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf8')).claims : null;
    videos.set(id, { meta, claims });
  }
  for (const id of ['mdo14671BPE', 'mlxFA9T88I0']) assert.equal(videos.get(id)?.meta?.role, 'original', id);
  for (const [id, v] of videos) assert.ok(!/^FIKTIV/.test(id) && !/Fiktive Testdaten/.test(JSON.stringify(v.meta || {})), 'keine Testdaten in echten Daten: ' + id);
  const rel = JSON.parse(fs.readFileSync(path.join(root, 'beziehungen.json'), 'utf8'));
  assert.deepEqual(R.validateRelations(rel, videos), []);
  assert.ok(!/FIKTIV|Fiktive Testdaten/.test(JSON.stringify(rel)), 'keine Testdaten in beziehungen.json');
});

// [Codex] Der reale Drei-Video-Fall aus #13 läuft auch im bestehenden CI-Einstieg.
require('./krall-test.js');

test('Hank/Naomi: unbekannte Rollen und nicht geprüfte Quellen werden nicht zu Endurteilen', () => {
  const root = path.join(__dirname, '..', 'faktenchecks', 'zUnxDR5ttRU');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'strukturiert', 'aussagen.json'), 'utf8'));
  const claim = n => data.claims.find(c => c.id.endsWith(n));
  const ambiguous = claim('A0024');
  assert.equal(ambiguous.verdict, null);
  assert.ok(ambiguous.occurrences.every(o => o.speakerId === null && o.candidateSpeakerId === null && o.attributionStatus === 'Ungeklärt' && o.roleStatus === 'Ungeklärt'));
  assert.equal(claim('A0011').verdict, null, 'unzugänglicher Medienbericht bleibt offen');
  assert.equal(claim('A0019').verdict, null, 'fehlende Sichtprüfung wird nicht als erledigt ausgegeben');
  assert.match(claim('A0031').reason, /nicht nur als alleinigen Grund/, 'abweichende Wiedergabe wird dokumentiert');
  assert.equal(data.scope.kind, 'Teilbestand');
  assert.match(data.scope.researchNote, /Keine vollständige Audio-/);
});

test('Hank/Naomi: fehlende Bestätigung bleibt Ergänzung und keine gegenteilige Tatsachenbehauptung', () => {
  const root = path.join(__dirname, '..', 'faktenchecks');
  const rel = JSON.parse(fs.readFileSync(path.join(root, 'beziehungen.json'), 'utf8')).relations.find(r => r.reactionVideoId === 'zUnxDR5ttRU');
  const originals = JSON.parse(fs.readFileSync(path.join(root, 'mdo14671BPE', 'strukturiert', 'aussagen.json'), 'utf8'));
  for (const l of rel.claimLinks) {
    const c = originals.claims.find(c => c.id === l.originalClaimId);
    if (c.verdict == null || c.verdict === 'Nicht ausreichend belegbar') {
      assert.ok(['gibt_wieder', 'ergaenzt'].includes(l.type), l.id + ': kein künstlicher Widerspruch');
    }
  }
  assert.equal(rel.originalVideoId, 'mdo14671BPE');
});
