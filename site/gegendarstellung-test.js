/*
 * Tests für site/gegendarstellung.js (Gegendarstellungen aus anderen geprüften Videos).
 * Fiktive Daten; zum Schluss eine Prüfung gegen die echten Projektdaten.
 * Aufruf: node --test site/gegendarstellung-test.js
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('./gegendarstellung.js');

const claim = (id, verdict, status = 'Abgeschlossen', start = 60) => ({ id, verdict, status, description: id, occurrences: [{ startSeconds: start }] });
const ORIG = 'AAAAAAAAAAA', R1 = 'BBBBBBBBBBB', R2 = 'CCCCCCCCCCC', R3 = 'DDDDDDDDDDD';
const rel = links => ({ schemaVersion: 1, relations: [{ id: 'R0001', reactionVideoId: R1, originalVideoId: ORIG, claimLinks: links }] });
const link = (id, type, o, r, seconds = 30) => ({ id, type, originalClaimId: o, reactionClaimId: r, reactionSeconds: seconds, note: 'n' });
const lookupFrom = (claims, ampel = {}) => id => {
  const c = claims.find(x => x.id === id);
  return c ? { claim: c, ampel: ampel[C.videoOf(id)] || null } : null;
};

test('Kritisch sind alle Aussagen ohne tragfähiges Urteil, belegte nie', () => {
  for (const v of ['Widerlegt', 'Irreführend / Kontext fehlt', 'Nicht ausreichend belegbar', 'Meinung / Prognose']) assert.equal(C.isCritical(claim('X', v)), true, v);
  assert.equal(C.isCritical(claim('X', null, 'Offen')), true);
  assert.equal(C.isCritical(claim('X', null, 'In Bearbeitung')), true);
  assert.equal(C.isCritical(claim('X', null, 'Nicht überprüfbar')), true);
  assert.equal(C.isCritical(claim('X', 'Belegt')), false);
  assert.equal(C.isCritical(claim('X', 'Teilweise belegt')), true);
});

test('Gegenbehauptung aus Reaktion erscheint nur, wenn die Gegenaussage belegt ist', () => {
  const o = claim(ORIG + '-A0001', 'Widerlegt');
  const ok = claim(R1 + '-A0001', 'Belegt', 'Abgeschlossen', 95);
  const weak = claim(R1 + '-A0002', 'Nicht ausreichend belegbar');
  const open = claim(R1 + '-A0003', 'Belegt', 'In Bearbeitung');
  const idx = C.buildIndex(rel([link('L0001', 'gegenbehauptung', o.id, ok.id), link('L0002', 'gegenbehauptung', o.id, weak.id), link('L0003', 'gegenbehauptung', o.id, open.id)]), []);
  const res = C.forClaim(o, idx, lookupFrom([o, ok, weak, open]));
  assert.deepEqual(res.map(x => x.claimId), [ok.id]);
  assert.equal(C.startSeconds(res[0]), 95);
});

test('Belegte Aussagen bekommen keine Gegendarstellung', () => {
  const o = claim(ORIG + '-A0001', 'Belegt');
  const r = claim(R1 + '-A0001', 'Widerlegt');
  const idx = C.buildIndex(rel([link('L0001', 'gegenbehauptung', o.id, r.id)]), []);
  assert.deepEqual(C.forClaim(o, idx, lookupFrom([o, r])), []);
  assert.deepEqual(C.forClaim(r, idx, lookupFrom([o, r])).map(x => x.claimId), [o.id]);
});

test('Auch eine kritische Reaktionsaussage kann vom Original korrigiert werden', () => {
  const o = claim(ORIG + '-A0001', 'Belegt');
  const r = claim(R1 + '-A0001', 'Irreführend / Kontext fehlt');
  const idx = C.buildIndex(rel([link('L0001', 'gegenbehauptung', o.id, r.id)]), []);
  assert.deepEqual(C.forClaim(r, idx, lookupFrom([o, r])).map(x => x.claimId), [o.id]);
});

test('Andere Verknüpfungsarten liefern keine Gegendarstellung', () => {
  const o = claim(ORIG + '-A0001', 'Widerlegt');
  const r = claim(R1 + '-A0001', 'Belegt');
  for (const type of ['gleiche_behauptung', 'gibt_wieder', 'ergaenzt']) {
    const idx = C.buildIndex(rel([link('L0001', type, o.id, r.id)]), []);
    assert.deepEqual(C.forClaim(o, idx, lookupFrom([o, r])), [], type);
  }
});

test('Wissenseintrag: widersprechende, dem Urteil folgende Aussage ist Gegendarstellung', () => {
  const a = claim(ORIG + '-A0001', 'Widerlegt');      // behauptet den Eintrag, der widerlegt ist
  const b = claim(R2 + '-A0005', 'Belegt');           // widerspricht dem Eintrag
  const c = claim(R3 + '-A0001', 'Belegt');           // nur verwandt
  const entry = { id: 'UG-K0001', status: 'Geprüft', verdict: 'Widerlegt', claim: 'k', links: [
    { claimId: a.id, relation: 'gleichwertig' }, { claimId: b.id, relation: 'widerspricht', contextNote: 'Gegenteil belegt' }, { claimId: c.id, relation: 'verwandt' }] };
  const idx = C.buildIndex({ relations: [] }, [entry]);
  const res = C.forClaim(a, idx, lookupFrom([a, b, c]));
  assert.deepEqual(res.map(x => [x.claimId, x.via, x.ref]), [[b.id, 'wissen', 'UG-K0001']]);
  /* Belegter Eintrag: die gleichwertige Aussage korrigiert die widersprechende */
  const entry2 = { ...entry, verdict: 'Belegt', links: [{ claimId: a.id, relation: 'widerspricht' }, { claimId: b.id, relation: 'teilaspekt' }] };
  const idx2 = C.buildIndex({ relations: [] }, [entry2]);
  assert.deepEqual(C.forClaim(a, idx2, lookupFrom([a, b])).map(x => x.claimId), [b.id]);
  /* Nicht freigegebene Einträge und Verweise in andere Repos zählen nicht */
  assert.deepEqual(C.forClaim(a, C.buildIndex({}, [{ ...entry, status: 'Entwurf' }]), lookupFrom([a, b])), []);
  const foreign = { ...entry, links: [{ claimId: a.id, relation: 'gleichwertig' }, { claimId: b.id, relation: 'widerspricht', repo: 'HP' }] };
  assert.deepEqual(C.forClaim(a, C.buildIndex({}, [foreign]), lookupFrom([a, b])), []);
});

test('Aussagen im selben Video sind keine Gegendarstellung', () => {
  const a = claim(ORIG + '-A0001', 'Widerlegt');
  const b = claim(ORIG + '-A0002', 'Belegt');
  const entry = { id: 'UG-K0001', status: 'Geprüft', verdict: 'Widerlegt', links: [{ claimId: a.id, relation: 'gleichwertig' }, { claimId: b.id, relation: 'widerspricht' }] };
  assert.deepEqual(C.forClaim(a, C.buildIndex({}, [entry]), lookupFrom([a, b])), []);
});

test('Mehrere Gegendarstellungen: nur belegt, dann bessere Ampel, ohne Doppelte', () => {
  const o = claim(ORIG + '-A0001', 'Widerlegt');
  const part = claim(R1 + '-A0001', 'Teilweise belegt');
  const red = claim(R2 + '-A0001', 'Belegt');
  const green = claim(R3 + '-A0001', 'Belegt');
  const relations = { relations: [
    { id: 'R0001', reactionVideoId: R1, originalVideoId: ORIG, claimLinks: [link('L0001', 'gegenbehauptung', o.id, part.id)] },
    { id: 'R0002', reactionVideoId: R2, originalVideoId: ORIG, claimLinks: [link('L0002', 'gegenbehauptung', o.id, red.id)] },
    { id: 'R0003', reactionVideoId: R3, originalVideoId: ORIG, claimLinks: [link('L0003', 'gegenbehauptung', o.id, green.id)] }] };
  const entry = { id: 'UG-K0001', status: 'Geprüft', verdict: 'Widerlegt', links: [{ claimId: o.id, relation: 'gleichwertig' }, { claimId: green.id, relation: 'widerspricht' }] };
  const res = C.forClaim(o, C.buildIndex(relations, [entry]), lookupFrom([o, part, red, green], { [R2]: 'rot', [R3]: 'gruen', [R1]: 'gruen' }));
  assert.deepEqual(res.map(x => x.claimId), [green.id, red.id]);
  assert.equal(res[0].via, 'reaktion');
});

test('neededVideos nennt nur die Videos der möglichen Gegenaussagen', () => {
  const idx = C.buildIndex(rel([link('L0001', 'gegenbehauptung', ORIG + '-A0001', R1 + '-A0001')]), []);
  assert.deepEqual(C.neededVideos(idx, [ORIG + '-A0001']), [R1]);
  assert.deepEqual(C.neededVideos(idx, [ORIG + '-A0099']), []);
});

test('Echte Projektdaten: jede Gegendarstellung ist belegt, kommt aus einem anderen Video und gehört zu einer kritischen Aussage', () => {
  const root = path.join(__dirname, '..');
  const relations = JSON.parse(fs.readFileSync(path.join(root, 'faktenchecks/beziehungen.json'), 'utf8'));
  const dir = path.join(root, 'wissen/eintraege');
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : [];
  const claims = new Map();
  for (const d of fs.readdirSync(path.join(root, 'faktenchecks'))) {
    const p = path.join(root, 'faktenchecks', d, 'strukturiert/aussagen.json');
    if (fs.existsSync(p)) for (const c of JSON.parse(fs.readFileSync(p, 'utf8')).claims) claims.set(c.id, c);
  }
  const idx = C.buildIndex(relations, entries);
  for (const c of claims.values()) {
    for (const x of C.forClaim(c, idx, id => claims.has(id) ? { claim: claims.get(id) } : null)) {
      assert.ok(C.isCritical(c), c.id);
      assert.ok(C.isSupported(x.claim), x.claimId);
      assert.notEqual(x.videoId, C.videoOf(c.id));
    }
  }
});
