'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { audit } = require('./pruefstand.js');
const { report } = require('../scripts/ampel-audit.js');
const FI = require('./faktenindex.js');
const claims = n => Array.from({ length: n }, (_, i) => ({ id: `A${i}`, kind: 'Tatsachenbehauptung', status: 'Abgeschlossen', verdict: 'Belegt' }));

test('Laufender Prüfstand verdeckt nicht die gleichzeitig zu geringe Erfassungsdichte', () => {
  const data = { scope: { durationSeconds: 12053 }, claims: claims(49) };
  const before = JSON.stringify(data);
  const a = audit(data, { workStatus: 'In Bearbeitung' });
  assert.deepEqual(a.blockers.map(b => b.code), ['arbeitsstand', 'erfassungsdichte']);
  assert.match(a.blockers[1].text, /mindestens 67/);
  assert.match(a.blockers[1].text, /18 weitere/);
  assert.deepEqual(a.rating, FI.rate(data, { workStatus: 'In Bearbeitung' }));
  assert.equal(JSON.stringify(data), before);
});

test('Fertiges Faktenurteil mit ungeklärter Haltung bleibt eine Prüfaufgabe', () => {
  const data = { claims: claims(10) };
  data.claims[0].attribution = { statementBy: 'Zitierte Person', creatorStance: 'Ungeklärt' };
  const a = audit(data, {});
  assert.equal(a.pending[0].id, 'A0');
  assert.equal(a.rating.indexed, 9);
  assert.equal(a.rating.coverage, 0.9);
  data.claims[0].attribution.creatorStance = 'Distanziert';
  assert.equal(audit(data, {}).pending.length, 0);
});

test('Audit beachtet die gemeinsame Mindestzahl für Kurzformate und erfindet keine Laufzeit', () => {
  const data = { claims: claims(3) };
  assert.equal(audit(data, { format: 'short', workStatus: 'Abgeschlossen' }).blockers.length, 0);
  assert.deepEqual(audit(data, {}).blockers.map(b => b.code), ['mindestzahl']);
});

test('Ausreichender Bestand bekommt keine Ampel-Aufgabe; fehlende Daten sind eigener Arbeitsauftrag', () => {
  assert.equal(audit({ scope: { durationSeconds: 1800 }, claims: claims(10) }, {}).blockers.length, 0);
  assert.deepEqual(audit(null, {}).blockers.map(b => b.code), ['daten']);
  const a = audit({ claims: claims(10).map(c => ({ ...c, status: 'Offen', verdict: null })) }, {});
  assert.deepEqual(a.blockers.map(b => b.code), ['kein_index', 'mindestzahl', 'abdeckung']);
});

test('Repository-Audit erfasst neue Videos ohne Aussagen und funktioniert ohne Videodaten', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p4m3-audit-'));
  try {
    assert.deepEqual(report(root), []);
    const dir = path.join(root, 'faktenchecks', 'abcdefghijk');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'video.json'), JSON.stringify({ title: 'Neu' }));
    fs.writeFileSync(path.join(root, 'faktenchecks', 'beziehungen.json'), '{}');
    const rows = report(root);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'Neu');
    assert.equal(rows[0].ampel, 'nicht_bewertbar');
    assert.equal(rows[0].blockers[0].code, 'daten');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Alle echten Videos behalten exakt das Ergebnis der zentralen Ampelregel', () => {
  const base = path.join(__dirname, '..', 'faktenchecks');
  const rows = report(path.join(__dirname, '..'));
  assert.equal(rows.length, fs.readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory() && /^[A-Za-z0-9_-]{11}$/.test(e.name)).length);
  for (const row of rows) {
    const file = path.join(base, row.id, 'strukturiert', 'aussagen.json');
    const meta = path.join(base, row.id, 'video.json');
    const r = FI.rate(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : null, fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta)) : null);
    assert.equal(row.ampel, r.key, row.id);
    assert.equal(row.reliable, r.reliable, row.id);
  }
});
