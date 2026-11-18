/*
 * Tests für die Faktenampel (site/ampel.js).
 * Ausführen: node --test site/ampel-test.js   (läuft im Workflow „Webseite“)
 * Nutzt fiktive Kennzahlen und prüft zusätzlich alle echten Projektdaten. Wird nicht veröffentlicht.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('./ampel.js');

const BASE = path.join(__dirname, '..', 'faktenchecks');

/* Fiktive statistik.json mit den angegebenen abgeschlossenen Zahlen. */
function stats({ belegt = 0, teilweise = 0, irre = 0, widerlegt = 0, unbelegbar = 0, meinung = 0, open = 0, work = 0 }) {
  const completed = belegt + teilweise + irre + widerlegt + unbelegbar;
  return {
    completedFacts: completed, openFacts: open, inProgressFacts: work,
    categories: [
      { category: 'Belegt', completedCount: belegt },
      { category: 'Teilweise belegt', completedCount: teilweise },
      { category: 'Irreführend / Kontext fehlt', completedCount: irre },
      { category: 'Widerlegt', completedCount: widerlegt },
      { category: 'Nicht ausreichend belegbar', completedCount: unbelegbar },
      { category: 'Meinung / Prognose', completedCount: meinung }
    ]
  };
}

test('Schwellen: grün unter 10 %, gelb ab 10 %, rot ab 25 %', () => {
  assert.equal(A.rate(stats({ belegt: 91, widerlegt: 9 })).key, 'gruen');
  assert.equal(A.rate(stats({ belegt: 90, widerlegt: 10 })).key, 'gelb');
  assert.equal(A.rate(stats({ belegt: 76, irre: 24 })).key, 'gelb');
  assert.equal(A.rate(stats({ belegt: 75, irre: 20, widerlegt: 5 })).key, 'rot');
});

test('Teilweise belegt zählt nicht als Fehler', () => {
  const r = A.rate(stats({ teilweise: 20 }));
  assert.equal(r.key, 'gruen');
  assert.equal(r.errors, 0);
});

test('Meinungen und „nicht ausreichend belegbar“ zählen nicht in die Grundlage', () => {
  const r = A.rate(stats({ belegt: 12, widerlegt: 3, unbelegbar: 70, meinung: 100 }));
  assert.equal(r.decided, 15);
  assert.equal(r.key, 'nicht_bewertbar', 'nur 15 von 85 Tatsachen entschieden (< 20 %)');
  assert.equal(A.rate(stats({ belegt: 12, widerlegt: 3, meinung: 100 })).key, 'gelb', '3 von 15 = 20 %');
});

test('Zu wenige entschiedene Aussagen: nicht bewertbar, mit laufender Prüfung: vorläufig', () => {
  assert.equal(A.rate(stats({ belegt: 9 })).key, 'nicht_bewertbar');
  assert.equal(A.rate(stats({ belegt: 9, work: 3 })).key, 'vorlaeufig');
  assert.equal(A.rate(stats({ belegt: 10, open: 41 })).key, 'nicht_bewertbar');
  assert.equal(A.rate(stats({ belegt: 10, open: 40 })).key, 'gruen');
  assert.equal(A.rate(stats({ meinung: 38, open: 132 })).key, 'nicht_bewertbar');
  assert.equal(A.rate(null).key, 'nicht_bewertbar');
});

test('Analyse „In Bearbeitung“ ist immer vorläufig', () => {
  assert.equal(A.rate(stats({ widerlegt: 50 }), { workStatus: 'In Bearbeitung' }).key, 'vorlaeufig');
  assert.equal(A.rate(stats({ widerlegt: 50 }), { workStatus: 'Teilbestand geprüft' }).key, 'rot');
});

test('Rhetorik-Daten haben keinen Einfluss (Signatur nimmt sie gar nicht an)', () => {
  assert.equal(A.rate.length, 3);
});

test('Gezielte Kleinauswahl aus langem Video: nicht bewertbar', () => {
  const s = stats({ belegt: 2, irre: 6, widerlegt: 9, work: 10 });
  assert.equal(A.rate(s, null, 3 * 3600).key, 'nicht_bewertbar', '27 Tatsachen bei 3 Stunden < 20 je Stunde');
  assert.equal(A.rate(s, null, 3600).key, 'rot', '27 Tatsachen bei 1 Stunde reichen');
  assert.equal(A.rate(s).key, 'rot', 'ohne Laufzeit keine Dichteprüfung');
});

test('Echte Projektdaten: jede Ampel ist berechenbar und begründet', () => {
  for (const id of fs.readdirSync(BASE)) {
    const dir = path.join(BASE, id);
    if (!fs.statSync(dir).isDirectory()) continue;
    const sp = path.join(dir, 'strukturiert', 'statistik.json');
    const vp = path.join(dir, 'video.json');
    const s = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, 'utf8')) : null;
    const v = fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, 'utf8')) : null;
    const ap = path.join(dir, 'strukturiert', 'aussagen.json');
    const dur = fs.existsSync(ap) ? JSON.parse(fs.readFileSync(ap, 'utf8')).scope?.durationSeconds : null;
    const r = A.rate(s, v, dur);
    assert.ok(Object.hasOwn(A.LEVELS, r.key), id);
    assert.ok(r.reason, id);
    assert.ok(r.decided <= r.facts || !s, id);
    if (v?.workStatus === 'In Bearbeitung') assert.equal(r.key, 'vorlaeufig', id);
  }
});
