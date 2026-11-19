#!/usr/bin/env node
/*
 * Verlauf der Videos (Seite „Verlauf“, #/verlauf), berechnet aus der Git-Historie von faktenchecks/<ID>/.
 * Nichts wird von Hand gepflegt: Für jeden Stand von main (erste Elternlinie), der ein Video verändert, werden
 * die Daten vorher/nachher verglichen und daraus kurze Ereignisse abgeleitet (aufgenommen, Prüfung begonnen,
 * veröffentlicht, Bewertungen geändert …). Reine Formatänderungen an JSON-Dateien zählen nicht.
 *
 *   node scripts/verlauf.js export <Ausgabedatei>   schreibt daten/verlauf.json für die Webseite
 *   node scripts/verlauf.js zeigen                  gibt den Verlauf lesbar aus
 *
 * Die Vergleichslogik (diffSnapshots) ist rein und wird in site/verlauf-test.js getestet.
 */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/* Gewicht der Ereignisarten: das wichtigste Ereignis eines Stands wird zur Überschrift im Verlauf. */
const KINDS = {
  veroeffentlicht: { rank: 1, label: 'Faktencheck veröffentlicht' },
  abgeschlossen: { rank: 2, label: 'Faktencheck abgeschlossen' },
  begonnen: { rank: 3, label: 'Prüfung begonnen' },
  aufgenommen: { rank: 4, label: 'Video aufgenommen' },
  bestand: { rank: 0, label: 'Seit Beginn des Verlaufs vorhanden' },
  bewertung: { rank: 6, label: 'Bewertungen geändert' },
  geprueft: { rank: 7, label: 'Aussagen geprüft' },
  aussagen: { rank: 8, label: 'Aussagen erfasst' },
  pruefstand: { rank: 9, label: 'Prüfstand geändert' },
  rhetorik: { rank: 10, label: 'Darstellungshinweise' },
  inhalt: { rank: 11, label: 'Begründungen oder Quellen ergänzt' },
  zurueck: { rank: 12, label: 'Prüfstand zurückgesetzt' },
  angaben: { rank: 13, label: 'Videoangaben aktualisiert' },
  themen: { rank: 14, label: 'Themenzuordnung aktualisiert' },
  bericht: { rank: 15, label: 'Berichte aktualisiert' }
};

const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;

/* Stabiler Vergleich geparster JSON-Daten (Schlüsselreihenfolge und Einrückung egal). */
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const same = (a, b) => canon(a) === canon(b);

const DONE_STATES = ['Teilbestand geprüft', 'Abgeschlossen'];

/*
 * Ein Snapshot beschreibt ein Video zu einem Stand:
 *   { video: video.json|null, claims: aussagen.json|null, rhetoric: rhetorik.json|null, topics: themen.json|null,
 *     reports: { "<Pfad>": "<Blob-Hash>" } }   (Markdown- und sonstige Dateien nur über ihren Inhalts-Hash)
 * prev ist null, wenn das Video in diesem Stand neu ist. root: Stand ist der Anfang der Versionsgeschichte.
 * Ergebnis: Liste von { kind, text }, leer bei Änderungen ohne inhaltliche Bedeutung.
 */
function diffSnapshots(prev, cur, opts = {}) {
  const items = [];
  const add = (kind, text) => items.push({ kind, text: text || KINDS[kind].label });
  if (!cur) return items;
  const wsPrev = prev?.video?.workStatus || null;
  const wsCur = cur.video?.workStatus || null;
  const claimsPrev = prev?.claims?.claims || [];
  const claimsCur = cur.claims?.claims || [];

  if (!prev) {
    if (opts.root) add('bestand', 'Bereits vorhanden, als die Versionsgeschichte begann');
    else add('aufgenommen');
    if (wsCur === 'In Bearbeitung') add('begonnen');
    else if (DONE_STATES.includes(wsCur)) add(wsCur === 'Abgeschlossen' ? 'abgeschlossen' : 'veroeffentlicht', `${KINDS[wsCur === 'Abgeschlossen' ? 'abgeschlossen' : 'veroeffentlicht'].label} (${wsCur})`);
    else if (!wsCur && claimsCur.length) add('begonnen');
    if (claimsCur.length) add('aussagen', n(claimsCur.length, 'Aussage erfasst', 'Aussagen erfasst'));
    if (cur.rhetoric) add('rhetorik', 'Darstellungshinweise hinzugefügt');
    return items;
  }

  /* Arbeitsstand des Videos (video.json). Ohne Arbeitsstand: erste erfasste Aussagen = Prüfung begonnen. */
  if (wsCur !== wsPrev) {
    if (wsCur === 'Abgeschlossen') add('abgeschlossen');
    else if (wsCur === 'Teilbestand geprüft') add('veroeffentlicht', DONE_STATES.includes(wsPrev) ? `Prüfstand: ${wsCur}` : `${KINDS.veroeffentlicht.label} (${wsCur})`);
    else if (wsCur === 'In Bearbeitung') add(DONE_STATES.includes(wsPrev) ? 'zurueck' : 'begonnen', DONE_STATES.includes(wsPrev) ? 'Erneut in Bearbeitung' : undefined);
    else if (wsCur) add('pruefstand', `Arbeitsstand: ${wsCur}`);
  } else if (!wsCur && !claimsPrev.length && claimsCur.length) {
    add('begonnen');
  }

  /* Einzelne Aussagen (strukturiert/aussagen.json), zugeordnet über ihre ID. */
  const before = new Map(claimsPrev.map(c => [c.id, c]));
  const after = new Map(claimsCur.map(c => [c.id, c]));
  let added = 0, removed = 0, verdict = 0, finished = 0, reopened = 0, status = 0, content = 0;
  for (const [id, c] of after) {
    const p = before.get(id);
    if (!p) { added++; continue; }
    const vChanged = (p.verdict || null) !== (c.verdict || null);
    const sChanged = (p.status || null) !== (c.status || null);
    if (vChanged && p.verdict) verdict++;
    if (sChanged) {
      if (c.status === 'Abgeschlossen' || c.status === 'Nicht überprüfbar') finished++;
      else if (p.status === 'Abgeschlossen' || p.status === 'Nicht überprüfbar') reopened++;
      else status++;
    } else if (vChanged && !p.verdict) finished++;
    if (!vChanged && !sChanged && !same(p, c)) content++;
  }
  for (const id of before.keys()) if (!after.has(id)) removed++;
  if (verdict) add('bewertung', n(verdict, 'Bewertung geändert', 'Bewertungen geändert'));
  if (finished) add('geprueft', n(finished, 'Aussage fertig geprüft', 'Aussagen fertig geprüft'));
  if (added) add('aussagen', n(added, 'Aussage neu erfasst', 'Aussagen neu erfasst'));
  if (removed) add('aussagen', n(removed, 'Aussage entfernt oder zusammengeführt', 'Aussagen entfernt oder zusammengeführt'));
  if (reopened) add('zurueck', n(reopened, 'Aussage erneut in Prüfung', 'Aussagen erneut in Prüfung'));
  if (status) add('pruefstand', n(status, 'Prüfstand geändert', 'Prüfstände geändert'));
  const restPrev = prev.claims ? { ...prev.claims, claims: null } : null;
  const restCur = cur.claims ? { ...cur.claims, claims: null } : null;
  if (content || (prev.claims && !same(restPrev, restCur))) {
    add('inhalt', content ? `${n(content, 'Aussage', 'Aussagen')} überarbeitet (Begründung, Quellen oder Kontext)` : 'Quellen oder Datenstand aktualisiert');
  }

  if (!prev.rhetoric && cur.rhetoric) add('rhetorik', 'Darstellungshinweise hinzugefügt');
  else if (prev.rhetoric && !cur.rhetoric) add('rhetorik', 'Darstellungshinweise entfernt');
  else if (!same(prev.rhetoric, cur.rhetoric)) add('rhetorik', 'Darstellungshinweise aktualisiert');

  const vPrev = prev.video ? { ...prev.video, workStatus: null } : null;
  const vCur = cur.video ? { ...cur.video, workStatus: null } : null;
  if (!same(vPrev, vCur)) add('angaben');
  if (!same(prev.topics, cur.topics)) add('themen');
  if (!same(prev.reports || {}, cur.reports || {})) add('bericht');
  return items;
}

/* Wichtigstes Ereignis zuerst. */
function sortItems(items) {
  return items.slice().sort((a, b) => KINDS[a.kind].rank - KINDS[b.kind].rank);
}

/* ---------- Git ---------- */

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
}

function parseJson(text) {
  try { return JSON.parse(text); } catch (e) { return { unlesbar: text.length }; }
}

/* Stand eines Videos zu einem Commit, aus dem Git-Baum gelesen. */
function snapshotAt(sha, id) {
  const prefix = `faktenchecks/${id}/`;
  const out = git(['ls-tree', '-r', sha, '--', prefix]);
  const files = new Map();
  for (const line of out.split('\n')) {
    const m = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line);
    if (m) files.set(m[2].slice(prefix.length), m[1]);
  }
  if (!files.size) return null;
  const read = rel => (files.has(rel) ? parseJson(git(['cat-file', 'blob', files.get(rel)])) : null);
  const reports = {};
  for (const [rel, hash] of files) {
    if (['video.json', 'strukturiert/aussagen.json', 'strukturiert/statistik.json', 'rhetorik.json', 'themen.json'].includes(rel)) continue;
    reports[rel] = hash;
  }
  return { video: read('video.json'), claims: read('strukturiert/aussagen.json'), rhetoric: read('rhetorik.json'), topics: read('themen.json'), reports };
}

function shallowCommits() {
  try { return new Set(fs.readFileSync(path.resolve(ROOT, git(['rev-parse', '--git-path', 'shallow']).trim()), 'utf8').split('\n').filter(Boolean)); } catch (e) { return new Set(); }
}

/* Alle Videos mit ihren Ereignissen, neuestes zuerst. ref: Stand, dessen erste Elternlinie gelesen wird. */
function buildHistory(ref = 'HEAD') {
  const shallow = shallowCommits();
  const ids = git(['ls-tree', '--name-only', ref, 'faktenchecks/']).split('\n').map(p => p.split('/')[1]).filter(x => x && ID_RE.test(x));
  const videos = [];
  let start = null;
  for (const id of ids) {
    const log = git(['log', '--first-parent', '--reverse', '--format=%H%x09%cI%x09%P', ref, '--', `faktenchecks/${id}/`]).trim();
    const events = [];
    let prev = null;
    for (const line of log ? log.split('\n') : []) {
      const [sha, date, parents] = line.split('\t');
      const cur = snapshotAt(sha, id);
      const root = !parents || shallow.has(sha);
      if (root && (!start || date < start.date)) start = { commit: sha, date };
      const items = sortItems(diffSnapshots(prev, cur, { root }));
      if (cur && items.length) events.push({ date, commit: sha, items });
      prev = cur;
    }
    if (events.length) videos.push({ id, events: events.reverse() });
  }
  videos.sort((a, b) => (b.events[0].date > a.events[0].date ? 1 : b.events[0].date < a.events[0].date ? -1 : 0));
  return { schemaVersion: 1, start, videos };
}

if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'export' && arg) {
    const h = buildHistory();
    fs.mkdirSync(path.dirname(path.resolve(arg)), { recursive: true });
    fs.writeFileSync(arg, JSON.stringify(h));
    console.log(`Verlauf: ${h.videos.length} Videos, ${h.videos.reduce((s, v) => s + v.events.length, 0)} Ereignisse`);
  } else if (cmd === 'zeigen') {
    const h = buildHistory();
    for (const v of h.videos) {
      console.log(v.id);
      for (const e of v.events) console.log(`  ${e.date} ${e.commit.slice(0, 7)} ${e.items.map(i => i.text).join(' · ')}`);
    }
  } else {
    console.error('Aufruf: node scripts/verlauf.js export <Datei> | zeigen');
    process.exit(2);
  }
}

module.exports = { KINDS, diffSnapshots, sortItems, buildHistory, canon };
