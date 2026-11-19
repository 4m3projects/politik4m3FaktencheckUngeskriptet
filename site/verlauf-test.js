/*
 * Tests des Verlaufs (scripts/verlauf.js): Ereignisse werden nur aus Datenänderungen abgeleitet.
 * Ausführen: node --test site/verlauf-test.js
 * Testdaten sind synthetisch; der letzte Test liest die echte Git-Historie dieses Repositorys.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../scripts/verlauf.js');

const claim = (id, status, verdict, extra) => Object.assign({ id, status, verdict, reason: 'r' }, extra);
const snap = (ws, claims, extra) => Object.assign({ video: ws === undefined ? null : { role: 'original', workStatus: ws }, claims: claims ? { scope: { asOf: '2026-11-19' }, claims } : null, rhetoric: null, topics: null, reports: { 'README.md': 'a' } }, extra);
const kinds = items => items.map(i => i.kind);

test('neues Video: aufgenommen, Prüfung begonnen, Aussagen erfasst', () => {
  const it = V.diffSnapshots(null, snap('In Bearbeitung', [claim('a', 'Offen', null)]));
  assert.deepEqual(kinds(it), ['aufgenommen', 'begonnen', 'aussagen']);
  assert.match(it[2].text, /^1 Aussage erfasst$/);
});

test('Bestand zu Beginn der Versionsgeschichte wird nicht als neu bezeichnet', () => {
  const it = V.sortItems(V.diffSnapshots(null, snap('Teilbestand geprüft', []), { root: true }));
  assert.equal(it[0].kind, 'bestand');
  assert.ok(kinds(it).includes('veroeffentlicht'));
  assert.ok(!kinds(it).includes('aufgenommen'));
});

test('Arbeitsstand In Bearbeitung → Teilbestand geprüft heißt veröffentlicht', () => {
  const it = V.sortItems(V.diffSnapshots(snap('In Bearbeitung', [claim('a', 'Offen', null)]), snap('Teilbestand geprüft', [claim('a', 'Abgeschlossen', 'Belegt')])));
  assert.equal(it[0].kind, 'veroeffentlicht');
  assert.ok(kinds(it).includes('geprueft'));
  assert.ok(!kinds(it).includes('bewertung'), 'Erstbewertung ist keine geänderte Bewertung');
});

test('ohne Arbeitsstand: erste Aussagen bedeuten Prüfung begonnen', () => {
  const it = V.diffSnapshots(snap(undefined, null), snap(undefined, [claim('a', 'Offen', null)]));
  assert.deepEqual(kinds(it), ['begonnen', 'aussagen']);
});

test('geänderte Bewertung wird gezählt und steht oben', () => {
  const prev = snap('Teilbestand geprüft', [claim('a', 'Abgeschlossen', 'Belegt'), claim('b', 'Abgeschlossen', 'Belegt')]);
  const cur = snap('Teilbestand geprüft', [claim('a', 'Abgeschlossen', 'Widerlegt'), claim('b', 'Abgeschlossen', 'Belegt', { reason: 'neu' }), claim('c', 'Offen', null)]);
  const it = V.sortItems(V.diffSnapshots(prev, cur));
  assert.equal(it[0].kind, 'bewertung');
  assert.equal(it[0].text, '1 Bewertung geändert');
  assert.ok(it.some(i => i.text === '1 Aussage neu erfasst'));
  assert.ok(it.some(i => i.kind === 'inhalt' && /^1 Aussage überarbeitet/.test(i.text)));
});

test('Aussage zurück in Prüfung und entfernte Aussagen', () => {
  const prev = snap('Teilbestand geprüft', [claim('a', 'Abgeschlossen', 'Belegt'), claim('b', 'Offen', null)]);
  const cur = snap('Teilbestand geprüft', [claim('a', 'In Bearbeitung', 'Belegt')]);
  const it = V.diffSnapshots(prev, cur);
  assert.ok(it.some(i => i.kind === 'zurueck'));
  assert.ok(it.some(i => /1 Aussage entfernt/.test(i.text)));
});

test('reine Formatänderung (Schlüsselreihenfolge) ergibt kein Ereignis', () => {
  const a = snap('Teilbestand geprüft', [{ id: 'a', status: 'Abgeschlossen', verdict: 'Belegt', reason: 'x' }]);
  const b = snap('Teilbestand geprüft', [{ reason: 'x', verdict: 'Belegt', status: 'Abgeschlossen', id: 'a' }]);
  assert.deepEqual(V.diffSnapshots(a, b), []);
});

test('Darstellungshinweise, Themen, Videoangaben und Berichte', () => {
  const prev = snap('Teilbestand geprüft', []);
  const cur = snap('Teilbestand geprüft', [], { rhetoric: { annotations: [] }, topics: { t: 1 }, reports: { 'README.md': 'b' } });
  cur.video.channel = 'X';
  assert.deepEqual(kinds(V.sortItems(V.diffSnapshots(prev, cur))), ['rhetorik', 'angaben', 'themen', 'bericht']);
});

test('echte Historie: jedes Video höchstens einmal, neueste Änderung zuerst', () => {
  const h = V.buildHistory();
  assert.equal(h.schemaVersion, 1);
  const ids = h.videos.map(v => v.id);
  assert.equal(new Set(ids).size, ids.length);
  for (let i = 1; i < h.videos.length; i++) assert.ok(h.videos[i - 1].events[0].date >= h.videos[i].events[0].date);
  for (const v of h.videos) {
    assert.ok(v.events.length > 0);
    for (const e of v.events) { assert.match(e.commit, /^[0-9a-f]{40}$/); assert.ok(e.items.length > 0); for (const i of e.items) assert.ok(V.KINDS[i.kind], i.kind); }
  }
});
