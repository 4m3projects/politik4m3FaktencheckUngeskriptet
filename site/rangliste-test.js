/* Tests der Rangliste (site/rangliste.js). Aufruf: node --test site/rangliste-test.js
   Die Rangliste ordnet nur nach dem berechneten Faktenindex; sie speichert und verändert keine Bewertung. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const FactIndex = require('./faktenindex.js');
const FactRanking = require('./rangliste.js');

/* Künstliche Ergebnisse: rate liefert, was im Test vorgegeben ist. */
const fake = (id, key, idx, coverage = 1, indexed = 20, title = id) =>
  ({ id, title, data: { key, indexRounded: idx, coverage, indexed }, video: null });
const rate = d => d;

test('belastbare Videos nach Index absteigend, gute oben', () => {
  const { ranked } = FactRanking.rank([fake('a', 'rot', 0.2), fake('b', 'gruen', 0.95), fake('c', 'gelb', 0.6)], rate);
  assert.deepEqual(ranked.map(x => x.v.id), ['b', 'c', 'a']);
  assert.deepEqual(ranked.map(x => x.place), [1, 2, 3]);
});

test('gleicher angezeigter Index teilt sich den Platz; Abdeckung, Anzahl, Titel ordnen', () => {
  const { ranked } = FactRanking.rank([
    fake('x', 'gruen', 0.9, 0.85, 20, 'Zebra'), fake('y', 'gruen', 0.9, 0.95, 20, 'Affe'),
    fake('z', 'gruen', 0.9, 0.95, 30, 'Mops'), fake('w', 'gelb', 0.5)
  ], rate);
  assert.deepEqual(ranked.map(x => x.v.id), ['z', 'y', 'x', 'w']);
  assert.deepEqual(ranked.map(x => x.place), [1, 1, 1, 4]);
});

test('graue Ampel bekommt keinen Platz, auch mit hohem vorläufigem Index', () => {
  const { ranked, unranked } = FactRanking.rank([
    fake('g', 'vorlaeufig', 0.99), fake('n', 'nicht_bewertbar', null), fake('k', 'nicht_bewertbar', 0.1), fake('r', 'rot', 0.3)
  ], rate);
  assert.deepEqual(ranked.map(x => x.v.id), ['r']);
  assert.deepEqual(unranked.map(x => x.v.id), ['g', 'k', 'n']);
  assert.ok(unranked.every(x => x.place === undefined));
});

test('leere Eingabe', () => {
  assert.deepEqual(FactRanking.rank([], rate), { ranked: [], unranked: [] });
  assert.deepEqual(FactRanking.rank(null, rate), { ranked: [], unranked: [] });
});

test('echte Videos: Reihenfolge folgt genau dem Faktenindex, keine Daten werden verändert', () => {
  const dir = path.join(__dirname, '..', 'faktenchecks');
  const videos = fs.existsSync(dir) ? fs.readdirSync(dir).flatMap(id => {
    const p = path.join(dir, id, 'strukturiert', 'aussagen.json');
    if (!fs.existsSync(p)) return [];
    const vp = path.join(dir, id, 'video.json');
    return [{ id, title: id, data: JSON.parse(fs.readFileSync(p, 'utf8')), video: fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : null }];
  }) : [];
  const before = JSON.stringify(videos);
  const { ranked, unranked } = FactRanking.rank(videos, FactIndex.rate);
  assert.equal(JSON.stringify(videos), before, 'Rangliste verändert keine Prüfdaten');
  assert.equal(ranked.length + unranked.length, videos.length);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].r.indexRounded >= ranked[i].r.indexRounded);
  for (const x of ranked) assert.ok(['gruen', 'gelb', 'rot'].includes(x.r.key));
  for (const x of unranked) assert.ok(!['gruen', 'gelb', 'rot'].includes(x.r.key));
});
