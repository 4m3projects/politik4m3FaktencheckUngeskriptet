#!/usr/bin/env node
/*
 * Agentenwerkzeug für die Themen-Wissensdatenbank (docs/WISSENSDATENBANK.md).
 * Nur Node.js, keine Fremdbibliotheken, keine KI-Aufrufe. Liest Dateien, schreibt nur bei „export“.
 *
 *   node scripts/wissen.js pruefen [--heute JJJJ-MM-TT]       Daten prüfen und Prüfaufträge melden
 *   node scripts/wissen.js suche "<Behauptung>" [--repo PFAD]  gezielte Suche in Einträgen und Aussagen
 *   node scripts/wissen.js betroffen --quelle URL | --eintrag ID | --aussage ID [--repo PFAD]
 *   node scripts/wissen.js kandidaten [--min 0.45]             ähnliche Aussagen aus verschiedenen Videos
 *   node scripts/wissen.js themen                              öffentliche/interne Themen mit Begründung
 *   node scripts/wissen.js aenderung --basis origin/main       Schutz vor Überschreiben geänderter Einträge
 *   node scripts/wissen.js export <Datei>                      kompaktes Verzeichnis für die Webseite
 *   node scripts/wissen.js quellen [--thema ID]                eingetragene weitere Wissensdatenbanken
 *
 * --repo PFAD bzw. --repo KÜRZEL=PFAD darf mehrfach angegeben werden: lokale Klone weiterer Wissensdatenbanken (anderes Projekt,
 * zentrale oder themenspezifische Wissensdatenbank). Welche es gibt, steht in wissen/konfiguration.json
 * unter knowledgeSources („quellen“ listet sie). Ohne Angabe wird nur dieses Repo durchsucht.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const K = require(path.join(__dirname, '..', 'site', 'wissen.js'));

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => path.join(dir, f));
}

function withFile(obj, file) {
  Object.defineProperty(obj, '__file', { value: path.basename(file, '.json'), enumerable: false });
  return obj;
}

/* Gesamten Wissensbestand eines Repos laden. */
function load(root) {
  const w = path.join(root, 'wissen');
  const cfgFile = path.join(w, 'konfiguration.json');
  const topicsFile = path.join(w, 'themen.json');
  const bundle = {
    root,
    config: fs.existsSync(cfgFile) ? readJson(cfgFile) : null,
    topics: fs.existsSync(topicsFile) ? readJson(topicsFile) : { schemaVersion: 1, topics: [] },
    // Dateiname nur für die Prüfung „Dateiname = ID“, nicht aufzählbar und damit kein Datenfeld.
    entries: listJson(path.join(w, 'eintraege')).map(f => withFile(readJson(f), f)),
    corrections: listJson(path.join(w, 'korrekturen')).map(f => withFile(readJson(f), f)),
    videos: []
  };
  const fc = path.join(root, 'faktenchecks');
  if (fs.existsSync(fc)) for (const id of fs.readdirSync(fc).sort()) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) continue;
    const factsFile = path.join(fc, id, 'strukturiert', 'aussagen.json');
    const topicsVideo = path.join(fc, id, 'themen.json');
    bundle.videos.push({
      id,
      facts: fs.existsSync(factsFile) ? readJson(factsFile) : null,
      topics: fs.existsSync(topicsVideo) ? readJson(topicsVideo) : null
    });
  }
  return bundle;
}

function strip(bundle) {
  // __file nur für Dateinamenprüfung; nicht exportieren.
  return Object.assign({}, bundle, {
    entries: bundle.entries.map(x => { const y = Object.assign({}, x); delete y.__file; return y; }),
    corrections: bundle.corrections.map(x => { const y = Object.assign({}, x); delete y.__file; return y; })
  });
}

function args(argv) {
  const out = { _: [], repo: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      if (k === 'repo') out.repo.push(v); else out[k] = v;
    } else out._.push(a);
  }
  return out;
}

function nsOf(b) { return b.namespace || K.config(b.config).namespace; }

function label(b) {
  const ns = nsOf(b);
  return ns + ' (' + path.basename(path.resolve(b.root)) + ')';
}

function main(argv) {
  const a = args(argv);
  const cmd = a._[0];
  const here = path.join(__dirname, '..');
  // --repo HP=../pfad setzt das Kürzel ausdrücklich (für Repos, die noch keine wissen/konfiguration.json haben).
  const bundles = [load(here)].concat(a.repo.map(r => {
    const m = /^([A-Z][A-Z0-9]{1,5})=(.+)$/.exec(String(r));
    const b = load(path.resolve(m ? m[2] : String(r)));
    if (m) b.namespace = m[1];
    return b;
  }));
  const own = bundles[0];
  const log = s => process.stdout.write(s + '\n');

  if (cmd === 'pruefen') {
    const errors = K.validateAll(own);
    for (const e of errors) log('FEHLER: ' + e);
    const hints = K.consistency(strip(own), typeof a.heute === 'string' ? a.heute : undefined);
    for (const h of hints) log('PRÜFAUFTRAG [' + h.type + ']: ' + h.text);
    const nTopicVideos = own.videos.filter(v => v.topics).length;
    log((errors.length ? 'Wissensdatenbank ungültig: ' + errors.length + ' Fehler.' : 'OK: Wissensdatenbank gültig.') +
      ' Themen: ' + own.topics.topics.length + ', Videos mit Themen: ' + nTopicVideos + ' von ' + own.videos.length +
      ', Einträge: ' + own.entries.length + ', Korrekturvorgänge: ' + own.corrections.length + ', Prüfaufträge: ' + hints.length + '.');
    return errors.length ? 1 : 0;
  }
  if (cmd === 'quellen') {
    const list = K.knowledgeSourcesFor(own.config, typeof a.thema === 'string' ? a.thema : null);
    const loaded = new Set(bundles.slice(1).map(nsOf));
    log('Eigene Wissensdatenbank: ' + label(own));
    for (const k of list) log('  ' + k.namespace.padEnd(6) + ' ' + k.type.padEnd(10) + ' ' + k.repo + ' – ' + k.name + (k.topics.length ? ' (Themen: ' + k.topics.join(', ') + ')' : '') + (loaded.has(k.namespace) ? ' [geladen]' : ''));
    if (!list.length) log('  Keine weiteren Wissensdatenbanken eingetragen.');
    return 0;
  }
  if (cmd === 'suche') {
    const q = a._.slice(1).join(' ');
    if (!q) { log('Bitte eine Behauptung angeben.'); return 2; }
    const loaded = new Set(bundles.slice(1).map(nsOf));
    const missing = K.knowledgeSourcesFor(own.config, typeof a.thema === 'string' ? a.thema : null).filter(k => !loaded.has(k.namespace));
    if (missing.length) log('Hinweis: nicht mit --repo eingebunden: ' + missing.map(k => k.namespace + ' (' + k.repo + ')').join(', ') + '. Für eine vollständige Suche klonen und mit --repo angeben.\n');
    let items = [];
    for (const b of bundles) items = items.concat(K.searchItems(strip(b), label(b)));
    const res = K.search(q, items, { limit: Number(a.limit) || 15 });
    if (!res.length) log('Keine ähnlichen Einträge oder Aussagen gefunden. Kein Treffer ist kein Beleg für fehlende Vorarbeit; andere Begriffe versuchen.');
    for (const r of res) log(r.score.toFixed(2) + '  ' + r.kind.padEnd(7) + ' ' + r.id + '  [' + (r.verdict || r.status) + ']  ' + r.repo + '\n       ' + (r.label || r.text).slice(0, 220));
    if (res.length) log('\nHinweis: Treffer sind Kandidaten. Vor Übernahme Zeitbezug, Geltungsbereich und Kontext prüfen und die Originalquellen selbst lesen; eine frühere Bewertung ist kein Beleg.');
    return 0;
  }
  if (cmd === 'betroffen') {
    const q = a.quelle ? { sourceUrl: a.quelle } : a.eintrag ? { entryId: a.eintrag } : a.aussage ? { claimId: a.aussage } : null;
    if (!q) { log('Bitte --quelle, --eintrag oder --aussage angeben.'); return 2; }
    for (const b of bundles) {
      const r = K.impact(q, strip(b));
      log('== ' + label(b));
      log('Aussagen (' + r.claims.length + '):');
      for (const c of r.claims) log('  ' + c.id + ' – ' + c.reason);
      log('Wissenseinträge (' + r.entries.length + '):');
      for (const e of r.entries) log('  ' + e.id + ' – ' + e.reason);
      log('Videos: ' + (r.videos.join(', ') || '–'));
      log('Themen: ' + (r.topics.join(', ') || '–'));
      if (r.derived.length) log('Automatisch neu berechnet nach Korrektur: ' + r.derived.join('; '));
    }
    return 0;
  }
  if (cmd === 'kandidaten') {
    const res = K.duplicateCandidates(strip(own), { min: Number(a.min) || 0.45, limit: Number(a.limit) || 50 });
    for (const r of res) log(r.score.toFixed(2) + '  ' + r.a + ' [' + r.aVerdict + ']  ↔  ' + r.b + ' [' + r.bVerdict + ']\n       ' + r.aText.slice(0, 160) + '\n       ' + r.bText.slice(0, 160));
    log(res.length + ' Kandidatenpaare. Nur Vorschläge: gleichwertig erst nach inhaltlicher Prüfung verknüpfen.');
    return 0;
  }
  if (cmd === 'themen') {
    const s = K.topicStats(own.topics, own.videos, own.config);
    for (const r of s.values()) log((r.public ? 'öffentlich ' : 'intern     ') + r.topic.id.padEnd(40) + ' Videos: ' + r.videos.length + ', Aussagen: ' + r.claims + ' – ' + r.reason);
    return 0;
  }
  if (cmd === 'aenderung') {
    const base = typeof a.basis === 'string' ? a.basis : 'origin/main';
    const errors = [];
    for (const en of own.entries) {
      let before = null;
      try {
        before = JSON.parse(execFileSync('git', ['-C', here, 'show', base + ':wissen/eintraege/' + en.__file + '.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
      } catch (_) { before = null; }
      const after = Object.assign({}, en); delete after.__file;
      errors.push(...K.validateEntryChange(before, after));
    }
    for (const e of errors) log('FEHLER: ' + e);
    log(errors.length ? 'Änderungsprüfung fehlgeschlagen.' : 'OK: keine Einträge überschrieben (Basis ' + base + ').');
    return errors.length ? 1 : 0;
  }
  if (cmd === 'export') {
    const out = a._[1];
    if (!out) { log('Bitte Zieldatei angeben.'); return 2; }
    const errors = K.validateAll(own);
    if (errors.length) { for (const e of errors) log('FEHLER: ' + e); return 1; }
    fs.writeFileSync(out, JSON.stringify(K.exportIndex(strip(own))));
    log('Geschrieben: ' + out);
    return 0;
  }
  log('Befehle: pruefen, suche, betroffen, kandidaten, themen, aenderung, export (Details im Dateikopf).');
  return cmd ? 2 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { load, main };
