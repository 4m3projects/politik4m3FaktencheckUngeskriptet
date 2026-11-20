#!/usr/bin/env node
/*
 * Faktenindex (site/faktenindex.js) für alle Videos dieses Repositories prüfen und ausgeben.
 * DIESE DATEI IST IN ALLEN DREI FAKTENCHECK-REPOSITORIES GLEICH.
 *
 *   node scripts/faktenindex.js pruefen    prüft die optionalen Felder claims[].factIndex in jeder aussagen.json
 *   node scripts/faktenindex.js bericht    zeigt je Video Faktenindex, Vergleichsindex, Prüfabdeckung und Ampel
 *   node scripts/faktenindex.js json       dasselbe maschinenlesbar
 *
 * Der Index wird nie gespeichert; diese Ausgabe dient nur Prüfern und der CI.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const FactIndex = require('../site/faktenindex.js');

const ROOT = path.join(__dirname, '..');
const FC = path.join(ROOT, 'faktenchecks');

function videos() {
  const out = [];
  for (const id of fs.existsSync(FC) ? fs.readdirSync(FC).sort() : []) {
    const file = path.join(FC, id, 'strukturiert', 'aussagen.json');
    if (!fs.existsSync(file)) continue;
    const vfile = path.join(FC, id, 'video.json');
    out.push({ id, data: JSON.parse(fs.readFileSync(file, 'utf8')), video: fs.existsSync(vfile) ? JSON.parse(fs.readFileSync(vfile, 'utf8')) : null });
  }
  return out;
}

function report() {
  return videos().map(v => {
    const r = FactIndex.rate(v.data, v.video);
    return {
      id: v.id, index: r.indexRounded, unweighted: r.unweightedRounded, difference: r.difference,
      coverage: r.coverage == null ? null : Math.round(r.coverage * 1000) / 10, ampel: r.key, label: r.label,
      reliable: r.reliable, indexed: r.indexed, weighted: r.weightedClaims, counts: r.counts, reason: r.reason
    };
  });
}

const cmd = process.argv[2];
if (cmd === 'pruefen') {
  const errors = videos().flatMap(v => FactIndex.validateData(v.data).map(e => `${v.id}: ${e}`));
  if (errors.length) { errors.forEach(e => console.error('::error::' + e)); process.exit(1); }
  console.log(`Faktenindex-Felder gültig (${videos().length} Videos, Regelstand ${FactIndex.CONFIG.version}).`);
} else if (cmd === 'bericht') {
  for (const r of report()) {
    console.log(`${r.id}  Index ${FactIndex.format(r.index)}  ungewichtet ${FactIndex.format(r.unweighted)}  Abdeckung ${r.coverage == null ? '–' : r.coverage + ' %'}  Ampel ${r.ampel}${r.reliable ? '' : ' (grau)'}  · ${r.indexed} im Index, ${r.weighted} mit eigenem Faktor`);
    console.log(`    ${r.reason}`);
  }
} else if (cmd === 'json') {
  console.log(JSON.stringify(report(), null, 2));
} else {
  console.error('Aufruf: node scripts/faktenindex.js pruefen | bericht | json');
  process.exit(2);
}
