'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function app() {
  const context = vm.createContext({
    window: { addEventListener() {} }, document: { addEventListener() {} },
    FactRelations: require('./relations.js'), FactRhetoric: require('./rhetoric.js')
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), context);
  return context;
}

test('Prüfaufgaben trennen unbearbeitete Aussagen von abgeschlossenen Einordnungen', () => {
  const ctx = app();
  ctx.video = { data: { claims: [
    { id: 'offen', status: 'Offen', verdict: null },
    { id: 'laufend', status: 'In Bearbeitung', verdict: null },
    { id: 'privat', status: 'Nicht überprüfbar', verdict: null },
    { id: 'unbelegt', status: 'Abgeschlossen', verdict: 'Nicht ausreichend belegbar' },
    { id: 'belegt', status: 'Abgeschlossen', verdict: 'Belegt' }
  ] } };
  assert.equal(vm.runInContext('pendingClaims(video).map(c => c.id).join(",")', ctx), 'offen,laufend');
});

test('Prüfstand behandelt fehlende Daten und leeren Bestand ohne Vollständigkeitsbehauptung', () => {
  const ctx = app();
  assert.equal(vm.runInContext('progressOverview([])', ctx), '');
  ctx.videos = [{ id: 'abcdefghijk', title: '<Test>', video: { role: 'reaction' }, meta: {} }];
  const html = vm.runInContext('progressOverview(videos)', ctx);
  assert.match(html, /Reaktion/);
  assert.match(html, /Keine strukturierten Aussagen/);
  assert.match(html, /Noch nicht geprüft/);
  assert.match(html, /&lt;Test&gt;/);
  assert.match(html, /keine vollständige Prüfung/);
});

test('Keine offenen Aussagen ist kein Nachweis einer Vollprüfung; Fragen werden maskiert', () => {
  const ctx = app();
  ctx.video = { id: 'abcdefghijk', data: { scope: { coverageNote: 'Auswahl' }, claims: [] } };
  assert.match(vm.runInContext('pendingSection(video)', ctx), /keine Vollerfassung/);
  ctx.video.data.claims.push({ id: 'A001', status: 'Offen', description: 'Beispiel', openQuestions: ['<script>'] });
  const html = vm.runInContext('pendingSection(video)', ctx);
  assert.match(html, /abcdefghijk\/aussage\/A001/);
  assert.match(html, /&lt;script&gt;/);
});

test('Kanal und Laufzeit stammen bei fehlenden README-Angaben aus vorhandenen Daten', () => {
  const ctx = app();
  ctx.video = { meta: {}, video: { channel: 'A & B' }, data: { scope: { durationSeconds: 12053 } } };
  const html = vm.runInContext('videoFacts(video)', ctx);
  assert.match(html, /A &amp; B/);
  assert.match(html, /03:20:53/);
  ctx.video.meta = { Kanal: 'README', Laufzeit: '03:20:00' };
  assert.match(vm.runInContext('videoFacts(video)', ctx), /README/);
  assert.match(vm.runInContext('videoFacts(video)', ctx), /03:20:00/);
});
