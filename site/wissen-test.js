/*
 * Tests der Themen-Wissensdatenbank (site/wissen.js, scripts/wissen.js).
 * Ausführen: node --test site/wissen-test.js
 * Alle Testdaten sind synthetisch; keine echten Faktenchecks.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const K = require('./wissen.js');

const CFG = { schemaVersion: 1, namespace: 'UG', knowledgeSources: [], publicTopics: { minVideos: 2, minClaimsPerVideo: 2, relevances: ['Schwerpunkt', 'Behandelt'] }, recommendations: { minDecidedFacts: 3, maxErrorShare: 0.25 }, review: { maxAgeDays: 365 }, corrections: { maxClaimsWithoutApproval: 3, lockMaxAgeDays: 7 } };
const H = [{ date: '2026-11-19', agent: 'Test', change: 'Angelegt.' }];
const topic = (id, name, extra) => Object.assign({ id, name, level: K.LEVELS[id.split('/').length - 1], parent: id.includes('/') ? id.split('/').slice(0, -1).join('/') : null, aliases: [], description: null, visibility: 'automatisch', mergedInto: null, history: [] }, extra);
const TOPICS = { schemaVersion: 1, topics: [
  topic('atomkraft', 'Atomkraft', { aliases: ['Kernkraft'] }),
  topic('atomkraft/kosten', 'Kosten'),
  topic('atomkraft/sicherheit', 'Sicherheit'),
  topic('geld', 'Geld'),
  topic('kernenergie', 'Kernenergie', { mergedInto: 'atomkraft', history: H })
] };

let srcN = 0;
function claim(vid, n, verdict, extra) {
  const id = vid + '-A' + String(n).padStart(4, '0');
  return Object.assign({ id, videoId: vid, kind: verdict === 'Meinung / Prognose' ? 'Meinung' : 'Tatsachenbehauptung', description: 'Aussage ' + id, status: verdict ? 'Abgeschlossen' : 'Offen', verdict, reason: 'Begründung ' + id, sourceRefs: [{ sourceId: 'S001', note: '' }], occurrences: [{ id: vid + '-O' + n, startSeconds: 60 * n }], relations: [] }, extra);
}
function facts(vid, claims, sources) {
  return { schemaVersion: 2, scope: { videoId: vid, durationSeconds: 7200 }, sources: sources || [{ id: 'S001', title: 'Quelle ' + vid + ' ' + (++srcN), url: 'https://example.org/' + vid }], claims };
}
function vtopics(vid, topics, claims) {
  return { schemaVersion: 1, videoId: vid, basis: 'Aus den erfassten Aussagen und Fundstellen.', topics, claims, history: H };
}
const VA = 'AAAAAAAAAAA', VB = 'BBBBBBBBBBB', VC = 'CCCCCCCCCCC';

function bundle() {
  const shared = { id: 'S001', title: 'Studie X', url: 'https://www.example.org/studie?utm_source=a' };
  const fa = facts(VA, [claim(VA, 1, 'Belegt'), claim(VA, 2, 'Widerlegt'), claim(VA, 3, 'Belegt'), claim(VA, 4, 'Belegt'), claim(VA, 5, 'Nicht ausreichend belegbar'), claim(VA, 6, null)], [shared]);
  const fb = facts(VB, [claim(VB, 1, 'Widerlegt'), claim(VB, 2, 'Widerlegt'), claim(VB, 3, 'Belegt'), claim(VB, 4, 'Meinung / Prognose')], [{ id: 'S001', title: 'Studie X', url: 'https://example.org/studie' }]);
  const fc = facts(VC, [claim(VC, 1, 'Belegt'), claim(VC, 2, 'Belegt')]);
  return {
    config: CFG,
    topics: JSON.parse(JSON.stringify(TOPICS)),
    entries: [],
    corrections: [],
    videos: [
      { id: VA, facts: fa, topics: vtopics(VA, [{ topic: 'atomkraft', relevance: 'Schwerpunkt', basis: 'Längerer Abschnitt.', segments: [{ startSeconds: 50, endSeconds: 400, note: 'Erklärt Kosten mit Zahlen.' }] }],
        [1, 2, 3, 4, 5, 6].map(n => ({ claimId: VA + '-A000' + n, topics: [n === 2 ? 'atomkraft/sicherheit' : 'atomkraft/kosten'] }))) },
      { id: VB, facts: fb, topics: vtopics(VB, [{ topic: 'atomkraft', relevance: 'Behandelt', basis: 'Mehrere Aussagen.', segments: [] }, { topic: 'geld', relevance: 'Erwähnt', basis: 'Beiläufig.', segments: [] }],
        [{ claimId: VB + '-A0001', topics: ['atomkraft/kosten'] }, { claimId: VB + '-A0002', topics: ['atomkraft/sicherheit'] }, { claimId: VB + '-A0003', topics: ['atomkraft/kosten'] }, { claimId: VB + '-A0004', topics: ['geld'] }]) },
      { id: VC, facts: fc, topics: vtopics(VC, [{ topic: 'geld', relevance: 'Erwähnt', basis: 'Nur Randbemerkung.', segments: [] }], [{ claimId: VC + '-A0001', topics: ['geld'] }, { claimId: VC + '-A0002', topics: ['geld'] }]) }
    ]
  };
}

function entry(extra) {
  return Object.assign({
    schemaVersion: 1, id: 'UG-K0001', revision: 1, claim: 'Atomstrom sei billiger als Windstrom.', topics: ['atomkraft/kosten'], status: 'Geprüft', verdict: 'Widerlegt',
    reason: 'Laut Studie X nicht.', validity: { asOf: '2026-11-19', timeScope: 'Stand 2025', subjectScope: 'Deutschland, Neubau', validUntil: null }, checkedOn: '2026-11-19',
    sources: [{ id: 'Q1', title: 'Studie X', url: 'https://example.org/studie', details: 'Institut, 2025', accessedOn: '2026-11-19', kind: 'Studie' }],
    dependsOn: [], supersededBy: null,
    links: [
      { claimId: VA + '-A0002', repo: null, relation: 'gleichwertig', contextNote: 'Gleicher Zeitbezug 2025 und gleicher Geltungsbereich.', linkedBy: 'Test', linkedOn: '2026-11-19' },
      { claimId: VB + '-A0001', repo: null, relation: 'gleichwertig', contextNote: 'Gleicher Zeitbezug 2025 und gleicher Geltungsbereich.', linkedBy: 'Test', linkedOn: '2026-11-19' }
    ],
    lock: null,
    history: [{ revision: 1, date: '2026-11-19', agent: 'Test', change: 'Angelegt.', previous: null }]
  }, extra);
}

function correction(extra) {
  return Object.assign({
    schemaVersion: 1, id: 'UG-C0001', kind: 'Fehlbewertung', status: 'Gemeldet', reportedOn: '2026-11-19', reportedBy: 'Test',
    trigger: { claimId: VA + '-A0001', entryId: null, description: 'Neue Primärquelle widerspricht.' },
    evidence: [], affected: [{ target: VA + '-A0001', reason: 'Ausgangspunkt' }], decision: null, changes: [], history: H
  }, extra);
}

/* ------------------------------------------------------------ Bestand und Konfiguration */

test('leerer Bestand und Projektdaten sind gültig', () => {
  const { load } = require('../scripts/wissen.js');
  const b = load(path.join(__dirname, '..'));
  assert.deepEqual(K.validateAll(b), []);
  assert.equal(K.config(b.config).namespace, 'UG');
});

test('synthetischer Bestand ist gültig', () => {
  assert.deepEqual(K.validateAll(bundle()), []);
});

test('Konfiguration: Mindestanzahl konfigurierbar, bloße Erwähnung darf nicht zählen', () => {
  assert.deepEqual(K.validateConfig(CFG), []);
  assert.ok(K.validateConfig(Object.assign({}, CFG, { publicTopics: { minVideos: 0 } })).some(x => /minVideos/.test(x)));
  assert.ok(K.validateConfig(Object.assign({}, CFG, { publicTopics: { relevances: ['Erwähnt'] } })).some(x => /Erwähnung/.test(x)));
  assert.ok(K.validateConfig(Object.assign({}, CFG, { namespace: 'ug' })).length);
});

test('mehrere Wissensdatenbanken: Projekte, zentrale und themenspezifische', () => {
  const ks = [
    { namespace: 'HP', name: 'Hauptprojekt', type: 'Projekt', repo: '4m3projects/politik4m3Facktencheck', topics: [] },
    { namespace: 'WDB', name: 'Politik4M3 Wissensdatenbank', type: 'Zentral', repo: '4m3projects/politik4m3Wissensdatenbank', topics: [] },
    { namespace: 'WATOM', name: 'Wissensdatenbank Atomkraft', type: 'Thematisch', repo: '4m3projects/politik4m3WissensdatenbankAtomkraft', topics: ['atomkraft'] }
  ];
  const cfg = Object.assign({}, CFG, { knowledgeSources: ks });
  assert.deepEqual(K.validateConfig(cfg), []);
  assert.ok(K.validateConfig(Object.assign({}, cfg, { knowledgeSources: ks.concat({ namespace: 'UG', name: 'x', type: 'Projekt', repo: 'a/b', topics: [] }) })).some(x => /mehrfach/.test(x)));
  assert.deepEqual(K.knowledgeSourcesFor(cfg, 'atomkraft/kosten').map(k => k.namespace), ['HP', 'WDB', 'WATOM']);
  assert.deepEqual(K.knowledgeSourcesFor(cfg, 'geld').map(k => k.namespace), ['HP', 'WDB'], 'Themen-Datenbank nur für ihr Thema');
  const b = bundle(); b.config = cfg;
  const ctx = ctxFor(b); ctx.config = cfg;
  assert.deepEqual(K.validateEntry(entry({ dependsOn: ['WATOM-K0012'] }), ctx), [], 'Abhängigkeit in themenspezifische Datenbank');
  assert.ok(K.validateEntry(entry({ dependsOn: ['XYZ-K0001'] }), ctx).some(x => /keiner eingetragenen Wissensdatenbank/.test(x)));
  const alt = entry({ status: 'Abgelöst', supersededBy: 'WDB-K0100', validity: { asOf: '2026-11-19', timeScope: 'bis 2025', subjectScope: 'Deutschland', validUntil: '2025-12-31' } });
  assert.deepEqual(K.validateEntry(alt, ctx), [], 'Nachfolger in zentraler Datenbank');
});

/* ------------------------------------------------------------ Themen */

test('Themen: Ebenen, Elternthema, kurze Hauptthemen, Doppelungen, Zusammenführung', () => {
  assert.deepEqual(K.validateTopics(TOPICS), []);
  const t = JSON.parse(JSON.stringify(TOPICS));
  t.topics.push(topic('energie/strom', 'Strom'));
  assert.ok(K.validateTopics(t).some(x => /übergeordnetes Thema energie fehlt/.test(x)));
  const d = JSON.parse(JSON.stringify(TOPICS));
  d.topics.push(topic('kernkraft', 'Kernkraft'));
  assert.ok(K.validateTopics(d).some(x => /schon bei atomkraft/.test(x)), 'Alias kollidiert mit neuem Thema');
  const l = JSON.parse(JSON.stringify(TOPICS));
  l.topics.push(topic('rente', 'Die Zukunft der gesetzlichen Rente'));
  assert.ok(K.validateTopics(l).some(x => /kurzen Namen/.test(x)));
  const m = JSON.parse(JSON.stringify(TOPICS));
  m.topics.find(x => x.id === 'kernenergie').history = [];
  assert.ok(K.validateTopics(m).some(x => /Zusammenführung braucht/.test(x)));
  assert.equal(K.resolveTopic(K.topicIndex(TOPICS), 'kernenergie'), 'atomkraft');
});

test('Videothemen: nur Inhalt, keine Titelzuordnung, bekannte Aussagen und Themen', () => {
  const b = bundle();
  const byId = K.topicIndex(b.topics);
  const v = b.videos[0];
  assert.deepEqual(K.validateVideoTopics(v.topics, VA, v.facts, byId, CFG), []);
  const t1 = JSON.parse(JSON.stringify(v.topics)); t1.basis = 'Titel des Videos';
  assert.ok(K.validateVideoTopics(t1, VA, v.facts, byId, CFG).some(x => /Titel/.test(x)));
  const t2 = JSON.parse(JSON.stringify(v.topics)); t2.claims.push({ claimId: VA + '-A0099', topics: ['atomkraft'] });
  assert.ok(K.validateVideoTopics(t2, VA, v.facts, byId, CFG).some(x => /gibt es in aussagen.json nicht/.test(x)));
  const t3 = JSON.parse(JSON.stringify(v.topics)); t3.claims[0].topics = ['kernenergie'];
  assert.ok(K.validateVideoTopics(t3, VA, v.facts, byId, CFG).some(x => /zusammengeführt/.test(x)));
  const t4 = JSON.parse(JSON.stringify(v.topics)); t4.topics.push({ topic: 'geld', relevance: 'Schwerpunkt', basis: 'x', segments: [] });
  assert.ok(K.validateVideoTopics(t4, VA, v.facts, byId, CFG).some(x => /braucht zugeordnete Aussagen/.test(x)), 'Schwerpunkt ohne Inhalt');
  const t5 = JSON.parse(JSON.stringify(v.topics)); t5.topics[0].segments[0].endSeconds = 99999;
  assert.ok(K.validateVideoTopics(t5, VA, v.facts, byId, CFG).some(x => /nach dem Video/.test(x)));
  const t6 = JSON.parse(JSON.stringify(v.topics)); t6.claims[0].topics = ['geld'];
  assert.ok(K.validateVideoTopics(t6, VA, v.facts, byId, CFG).some(x => /fehlt in topics des Videos/.test(x)));
});

test('öffentliche Themen: mindestens zwei Videos, Erwähnung zählt nicht, manuelle Ausnahmen', () => {
  const b = bundle();
  let s = K.topicStats(b.topics, b.videos, CFG);
  assert.equal(s.get('atomkraft').public, true);
  assert.deepEqual(s.get('atomkraft').videos, [VA, VB]);
  assert.equal(s.get('atomkraft/kosten').public, true);
  assert.equal(s.get('geld').public, false, 'nur erwähnt');
  assert.deepEqual(s.get('geld').mentionedIn, [VB, VC]);
  assert.ok(!s.has('kernenergie'), 'zusammengeführte Themen erscheinen nicht');
  s = K.topicStats(b.topics, b.videos, Object.assign({}, CFG, { publicTopics: { minVideos: 3 } }));
  assert.equal(s.get('atomkraft').public, false, 'Mindestanzahl konfigurierbar');
  b.topics.topics.find(t => t.id === 'geld').visibility = 'freigegeben';
  b.topics.topics.find(t => t.id === 'atomkraft').visibility = 'intern';
  s = K.topicStats(b.topics, b.videos, CFG);
  assert.equal(s.get('geld').public, true);
  assert.equal(s.get('atomkraft').public, false);
  assert.equal(s.get('atomkraft/kosten').public, false, 'Unterthema folgt dem Hauptthema');
});

test('zu wenige Aussagen im Video: Thema zählt dort nicht', () => {
  const b = bundle();
  b.videos[1].topics.claims = b.videos[1].topics.claims.filter(a => a.claimId !== VB + '-A0002' && a.claimId !== VB + '-A0003');
  const s = K.topicStats(b.topics, b.videos, CFG);
  assert.deepEqual(s.get('atomkraft').videos, [VA]);
  assert.equal(s.get('atomkraft').public, false);
});

/* ------------------------------------------------------------ Wissenseinträge, Quellen */

function ctxFor(b) {
  const claims = new Map();
  for (const v of b.videos) for (const c of v.facts.claims) claims.set(c.id, c);
  return { config: CFG, topics: K.topicIndex(b.topics), claims, entries: new Map(b.entries.map(e => [e.id, e])) };
}

test('Wissenseintrag: gültig, Quellen- und Kontextpflicht', () => {
  const b = bundle();
  const en = entry();
  b.entries = [en];
  assert.deepEqual(K.validateEntry(en, ctxFor(b)), []);
  assert.ok(K.validateEntry(entry({ sources: [] }), ctxFor(b)).some(x => /externe Originalquelle/.test(x)), 'keine Quelle');
  const own = entry({ sources: [{ id: 'Q1', title: 'Unser Faktencheck', url: 'https://4m3projects.github.io/politik4m3Facktencheck/#/video/x', details: 'eigene Seite', accessedOn: '2026-11-19', kind: 'Sonstige' }] });
  assert.ok(K.validateEntry(own, ctxFor(b)).some(x => /keine Originalquelle/.test(x)), 'frühere KI-Bewertung ist kein Beleg');
  const weak = entry(); weak.links[0].contextNote = 'ähnlich';
  assert.ok(K.validateEntry(weak, ctxFor(b)).some(x => /ähnliche Begriffe genügen nicht/.test(x)));
  assert.ok(K.validateEntry(entry({ id: 'HP-K0001' }), ctxFor(b)).some(x => /UG-K0001/.test(x)), 'Kürzel des Projekts');
  const ext = entry(); ext.links.push({ claimId: 'ZZZZZZZZZZZ-A0001', repo: '4m3projects/politik4m3Facktencheck', relation: 'verwandt', contextNote: 'Gleiche Frage im Hauptprojekt, andere Zahl.', linkedBy: 'Test', linkedOn: '2026-11-19' });
  assert.deepEqual(K.validateEntry(ext, ctxFor(b)), [], 'Verknüpfung ins Schwesterrepo');
  const missing = entry(); missing.links[0].claimId = VA + '-A0042';
  assert.ok(K.validateEntry(missing, ctxFor(b)).some(x => /gibt es hier nicht/.test(x)));
});

test('mehrere Bewertungen derselben Quelle zählen als eine Quelle', () => {
  const s = [
    { url: 'https://www.example.org/studie?utm_source=x' },
    { url: 'https://example.org/studie/' },
    { url: 'https://example.org/studie#seite2' },
    { url: 'https://4m3projects.github.io/politik4m3FaktencheckUngeskriptet/#/video/a' },
    { url: 'https://other.org/a' }
  ];
  assert.equal(K.independentSources(s, ['4m3projects.github.io']), 2);
});

test('Versionierung: Historie lückenlos, alter Stand bleibt erhalten', () => {
  const b = bundle();
  const before = entry();
  b.entries = [before];
  const after = entry({ revision: 2, verdict: 'Irreführend / Kontext fehlt', reason: 'Neu: nur für Neubau.', history: before.history.concat({ revision: 2, date: '2026-11-20', agent: 'Test', change: 'Neu bewertet (UG-C0001).', previous: { verdict: 'Widerlegt', reason: 'Laut Studie X nicht.' } }) });
  assert.deepEqual(K.validateEntry(after, ctxFor(b)), []);
  assert.deepEqual(K.validateEntryChange(before, after), []);
  const overwritten = entry({ verdict: 'Belegt', reason: 'Still geändert.' });
  assert.ok(K.validateEntryChange(before, overwritten).some(x => /Revision muss genau/.test(x)), 'stilles Überschreiben');
  const noPrev = JSON.parse(JSON.stringify(after)); noPrev.history[1].previous = null;
  assert.ok(K.validateEntry(noPrev, ctxFor(b)).some(x => /nichts spurlos überschreiben/.test(x)));
  const wrongPrev = JSON.parse(JSON.stringify(after)); wrongPrev.history[1].previous = { verdict: 'Belegt', reason: 'x' };
  assert.ok(K.validateEntryChange(before, wrongPrev).some(x => /previous/.test(x)));
  const rewritten = JSON.parse(JSON.stringify(after)); rewritten.history[0].change = 'Umgeschrieben.';
  assert.ok(K.validateEntryChange(before, rewritten).some(x => /bisherige Historie/.test(x)));
  // Paralleler Agent: beide erhöhen von 1 auf 2 – nach dem ersten Merge muss der zweite auf 3 gehen.
  assert.ok(K.validateEntryChange(after, entry({ revision: 2, reason: 'anderer Agent', history: after.history })).length, 'Konflikt erkannt');
  // Nur Sperre gesetzt: keine neue Revision nötig.
  assert.deepEqual(K.validateEntryChange(before, entry({ lock: { agent: 'Codex', since: '2026-11-19', ref: 'PR #60' } })), []);
});

test('Faktenlage geändert: Ablösung statt rückwirkender Falschbewertung', () => {
  const b = bundle();
  const neu = entry({ id: 'UG-K0002', verdict: 'Belegt', links: [], validity: { asOf: '2026-11-19', timeScope: 'ab 2026', subjectScope: 'Deutschland', validUntil: null } });
  const alt = entry({ status: 'Abgelöst', supersededBy: 'UG-K0002', validity: { asOf: '2026-11-19', timeScope: 'bis 2025', subjectScope: 'Deutschland', validUntil: '2025-12-31' } });
  b.entries = [alt, neu];
  assert.deepEqual(K.validateEntry(alt, ctxFor(b)), []);
  assert.ok(K.validateEntry(entry({ status: 'Abgelöst' }), ctxFor(b)).some(x => /supersededBy/.test(x)));
  const corr = correction({ kind: 'Faktenlage geändert', status: 'Umgesetzt', evidence: [{ title: 'Neue Statistik', url: 'https://example.org/neu', accessedOn: '2026-11-19', finding: 'Seit 2026 anders.' }], decision: { by: 'Jens', date: '2026-11-19', basis: 'Neue Daten.' },
    changes: [{ target: VA + '-A0002', field: 'verdict', before: 'Widerlegt', after: 'Belegt' }] });
  assert.ok(K.validateCorrection(corr, ctxFor(b)).some(x => /bleiben frühere Videoaussagen/.test(x)));
});

/* ------------------------------------------------------------ Korrekturen */

test('Korrektur: keine Bestätigung ohne externe Quelle und Entscheidung', () => {
  const b = bundle();
  assert.deepEqual(K.validateCorrection(correction(), ctxFor(b)), []);
  const noDecision = correction({ status: 'Bestätigt' });
  assert.ok(K.validateCorrection(noDecision, ctxFor(b)).some(x => /Entscheidung/.test(x)));
  const onlyAi = correction({ status: 'Bestätigt', decision: { by: 'Jens', date: '2026-11-19', basis: 'Zweite KI widerspricht.' } });
  assert.ok(K.validateCorrection(onlyAi, ctxFor(b)).some(x => /Widerspruch zwischen zwei KI-Ergebnissen/.test(x)));
  const ok = correction({ status: 'Bestätigt', evidence: [{ title: 'Amt', url: 'https://destatis.de/x', accessedOn: '2026-11-19', finding: 'Zahl ist 12 %.' }], decision: { by: 'Jens', date: '2026-11-19', basis: 'Primärquelle gelesen.' } });
  assert.deepEqual(K.validateCorrection(ok, ctxFor(b)), []);
  const early = correction({ changes: [{ target: VA + '-A0001', field: 'verdict', before: 'Belegt', after: 'Widerlegt' }] });
  assert.ok(K.validateCorrection(early, ctxFor(b)).some(x => /erst bei Status Umgesetzt/.test(x)));
});

test('Korrektur: Schutz vor Massenänderung ohne menschliche Freigabe', () => {
  const b = bundle();
  const ev = [{ title: 'Amt', url: 'https://destatis.de/x', accessedOn: '2026-11-19', finding: 'f' }];
  const many = correction({ status: 'Bestätigt', evidence: ev, decision: { by: 'Regel:Rundungsfehler', date: '2026-11-19', basis: 'b' },
    affected: [1, 2, 3, 4].map(n => ({ target: VA + '-A000' + n, reason: 'gleiche Quelle' })) });
  assert.ok(K.needsHumanApproval(many, CFG));
  assert.ok(K.validateCorrection(many, ctxFor(b)).some(x => /menschliche Freigabe/.test(x)));
  const few = correction({ status: 'Bestätigt', evidence: ev, decision: { by: 'Regel:Rundungsfehler', date: '2026-11-19', basis: 'b' } });
  assert.deepEqual(K.validateCorrection(few, ctxFor(b)), [], 'kleine eindeutige Fälle per Regel');
  const entryVerdict = correction({ status: 'Umgesetzt', evidence: ev, decision: { by: 'Regel:x', date: '2026-11-19', basis: 'b' }, changes: [{ target: 'UG-K0001', field: 'verdict', before: 'Widerlegt', after: 'Belegt' }] });
  assert.ok(K.needsHumanApproval(entryVerdict, CFG), 'Urteil eines Wissenseintrags braucht Menschen');
});

test('Korrektur: umgesetzte Änderung muss im Datenstand stehen', () => {
  const b = bundle();
  const ev = [{ title: 'Amt', url: 'https://destatis.de/x', accessedOn: '2026-11-19', finding: 'f' }];
  const done = correction({ status: 'Umgesetzt', evidence: ev, decision: { by: 'Jens', date: '2026-11-19', basis: 'b' }, changes: [{ target: VA + '-A0001', field: 'verdict', before: 'Widerlegt', after: 'Belegt' }] });
  assert.ok(K.validateCorrection(done, ctxFor(b)).some(x => /migration.assessmentChange/.test(x)), 'Vermerk an der Aussage fehlt');
  b.videos[0].facts.claims[0].migration = { changeType: 'x', mapping: 'x', assessmentChange: 'Korrektur UG-C0001 (2026-11-19, Test): vorher Widerlegt.' };
  assert.deepEqual(K.validateCorrection(done, ctxFor(b)), []);
  done.changes[0] = { target: VA + '-A0001', field: 'verdict', before: 'Belegt', after: 'Widerlegt' };
  assert.ok(K.validateCorrection(done, ctxFor(b)).some(x => /nicht auf dem umgesetzten Wert/.test(x)), 'nur behauptete Korrektur');
});

/* ------------------------------------------------------------ Betroffenheit und Konsistenz */

test('Betroffenheit: gleiche Quelle über Videos, verknüpfte Aussagen, abhängige Einträge', () => {
  const b = bundle();
  const k1 = entry();
  const k2 = entry({ id: 'UG-K0002', claim: 'Abgeleitete Behauptung zu Stromkosten.', dependsOn: ['UG-K0001'], sources: [{ id: 'Q1', title: 'Andere', url: 'https://other.org/x', details: 'd', accessedOn: '2026-11-19', kind: 'Studie' }],
    links: [{ claimId: VB + '-A0003', repo: null, relation: 'teilaspekt', contextNote: 'Beruht auf derselben Kostenannahme.', linkedBy: 'Test', linkedOn: '2026-11-19' }] });
  b.entries = [k1, k2];
  const bySource = K.impact({ sourceUrl: 'https://example.org/studie' }, b);
  // Alle Aussagen in A und B nutzen S001 = Studie X (normalisierte URL), C nicht.
  assert.ok(bySource.claims.some(c => c.id === VA + '-A0001'));
  assert.ok(bySource.claims.some(c => c.id === VB + '-A0004'));
  assert.ok(!bySource.claims.some(c => c.id.startsWith(VC)), 'unbeteiligtes Video nicht betroffen');
  assert.deepEqual(bySource.entries.map(e => e.id), ['UG-K0001', 'UG-K0002'], 'abhängiger Eintrag mit anderer Quelle gefunden');
  assert.ok(bySource.claims.some(c => c.id === VB + '-A0003'));
  assert.ok(K.impact({ entryId: 'UG-K0001' }, b).claims.some(c => c.id === VB + '-A0003' && /UG-K0002/.test(c.reason)), 'über Abhängigkeit gefunden');
  assert.deepEqual(bySource.videos, [VA, VB]);
  assert.ok(bySource.topics.includes('atomkraft/kosten'));
  assert.ok(bySource.derived.length > 0, 'Statistik, Ampel, Themenseiten werden neu berechnet');
  const byClaim = K.impact({ claimId: VC + '-A0001' }, b);
  assert.deepEqual(byClaim.claims.map(c => c.id), [VC + '-A0001', VC + '-A0002'], 'Aussage mit gleicher Quelle im selben Video');
  const byEntry = K.impact({ entryId: 'UG-K0002' }, b);
  assert.deepEqual(byEntry.entries.map(e => e.id), ['UG-K0002'], 'Abhängigkeit wirkt nur in eine Richtung');
});

test('Kreisabhängigkeiten werden abgewiesen', () => {
  const b = bundle();
  b.entries = [entry({ dependsOn: ['UG-K0002'] }), entry({ id: 'UG-K0002', links: [], dependsOn: ['UG-K0001'] })];
  assert.ok(K.validateAll(b).some(x => /Kreisabhängigkeit/.test(x)));
});

test('Konsistenz: Abweichungen werden gemeldet, nicht automatisch angeglichen', () => {
  const b = bundle();
  const en = entry();
  en.links.push({ claimId: VA + '-A0001', repo: null, relation: 'gleichwertig', contextNote: 'Gleicher Zeitbezug und Geltungsbereich.', linkedBy: 'Test', linkedOn: '2026-11-19' });
  en.lock = { agent: 'Codex', since: '2026-11-01', ref: 'PR #60' };
  b.entries = [en, entry({ id: 'UG-K0002', links: [], checkedOn: '2024-01-01' })];
  b.corrections = [correction()];
  const before = JSON.stringify(b.videos);
  const hints = K.consistency(b, '2026-11-19');
  assert.ok(hints.some(h => h.type === 'Abweichung' && h.claimId === VA + '-A0001'));
  assert.ok(!hints.some(h => h.type === 'Abweichung' && h.claimId === VA + '-A0002'));
  assert.ok(hints.some(h => h.type === 'Veraltet' && h.entryId === 'UG-K0002'));
  assert.ok(hints.some(h => h.type === 'Sperre'));
  assert.ok(hints.some(h => h.type === 'Offene Korrektur'));
  assert.equal(JSON.stringify(b.videos), before, 'Bewertungen bleiben unverändert');
});

/* ------------------------------------------------------------ Themenseite und Empfehlungen */

test('Themenseite: Abschnitte, keine Doppelung, wiederkehrend nur im eigenen Bestand, unbelegt ≠ falsch', () => {
  const b = bundle();
  b.entries = [entry()];
  const p = K.topicPage('atomkraft', b);
  assert.equal(p.sections.falsch.length, 2, 'Eintrag + VB-A0002');
  const e = p.sections.falsch.find(x => x.type === 'entry');
  assert.equal(e.recurring, true);
  assert.deepEqual(e.videos, [VA, VB]);
  const ids = p.sections.falsch.filter(x => x.type === 'claim').map(x => x.claim.id);
  assert.ok(!ids.includes(VA + '-A0002') && !ids.includes(VB + '-A0001'), 'verknüpfte Aussagen nur am Eintrag');
  assert.deepEqual(p.sections.unbelegt.map(x => x.claim.id), [VA + '-A0005']);
  assert.ok(!p.sections.falsch.some(x => x.type === 'claim' && x.claim.verdict === 'Nicht ausreichend belegbar'));
  assert.equal(p.sections.belegt.length, 4, 'korrekte Aussagen erscheinen ebenfalls');
  assert.ok(![].concat(...Object.values(p.sections)).some(x => x.type === 'claim' && (x.claim.status !== 'Abgeschlossen' || x.claim.kind !== 'Tatsachenbehauptung')), 'keine offenen Aussagen, keine Meinungen');
  assert.equal(K.topicPage('kernenergie', b).topic.id, 'atomkraft', 'Weiterleitung');
  const sub = K.topicPage('atomkraft/sicherheit', b);
  assert.equal(sub.sections.belegt.length, 0);
});

test('Empfehlungen: themenbezogen, nicht nach Gesamtquote, mit Abschnitt und Begründung', () => {
  const b = bundle();
  // Video A hat insgesamt einen Fehler, ist aber zu Kosten gut belegt.
  const r = K.recommendations('atomkraft/kosten', b);
  assert.deepEqual(r.map(x => x.videoId), [VA]);
  assert.equal(r[0].decided, 3);
  assert.equal(r[0].supported, 3);
  assert.equal(r[0].segments[0].startSeconds, 50);
  assert.match(r[0].reason, /3 entschiedene/);
  // Für das Gesamtthema fällt B (2 von 3 widerlegt) heraus, A bleibt trotz Fehler (1 von 4) knapp drin.
  const all = K.recommendations('atomkraft', b, Object.assign({}, CFG, { recommendations: { minDecidedFacts: 3, maxErrorShare: 0.3 } }));
  assert.deepEqual(all.map(x => x.videoId), [VA]);
  const strict = K.recommendations('atomkraft', b);
  assert.deepEqual(strict.map(x => x.videoId), [], '25 % Fehler im Thema reichen zum Ausschluss');
});

/* ------------------------------------------------------------ Suche und Wiederverwendung */

test('Ähnlichkeit: findet sinngleiche Formulierungen, ungleiche Zahlen werden abgewertet', () => {
  const a = 'Der Dollar habe seit 1971 rund 95 Prozent seiner Kaufkraft verloren.';
  assert.ok(K.similarity(a, 'Seit 1971 hat der Dollar etwa 95 Prozent Kaufkraft verloren.') > 0.5);
  const other = K.similarity(a, 'Seit 1971 hat der Dollar etwa 87 Prozent Kaufkraft verloren.');
  assert.ok(other < K.similarity(a, 'Seit 1971 hat der Dollar etwa 95 Prozent Kaufkraft verloren.'));
  assert.ok(K.similarity(a, 'Atomstrom ist teurer als Windstrom.') < 0.1);
  assert.deepEqual(K.tokens('1.000 Euro'), K.tokens('1000 Euro'));
});

test('Wiederverwendung: Suche findet vorhandenen Eintrag und Aussagen, auch über Repos', () => {
  const b = bundle();
  b.entries = [entry()];
  b.videos[0].facts.claims[1].description = 'Atomstrom sei billiger als Strom aus Windkraft.';
  const items = K.searchItems(b, 'UG').concat(K.searchItems({ entries: [entry({ id: 'HP-K0007', claim: 'Atomstrom ist billiger als Windstrom in Deutschland.' })], videos: [] }, 'HP'));
  const res = K.search('Ist Atomstrom billiger als Windstrom?', items);
  assert.ok(res.length >= 3);
  assert.ok(res.slice(0, 2).every(r => r.kind === 'Eintrag'));
  assert.ok(res.some(r => r.repo === 'HP'));
  assert.ok(res.some(r => r.id === VA + '-A0002'));
});

test('Kandidaten für Mehrfachvorkommen nur aus verschiedenen Videos', () => {
  const b = bundle();
  b.videos[0].facts.claims[0].description = 'Die Inflation in Deutschland lag 2023 bei 5,9 Prozent.';
  b.videos[0].facts.claims[2].description = 'Die Inflation in Deutschland lag 2023 bei 5,9 Prozent laut Amt.';
  b.videos[1].facts.claims[2].description = 'Die Inflationsrate in Deutschland lag 2023 bei 5,9 Prozent.';
  const c = K.duplicateCandidates(b, { min: 0.4 });
  assert.ok(c.length >= 1);
  assert.ok(c.every(p => p.a.slice(0, 11) !== p.b.slice(0, 11)));
});

/* ------------------------------------------------------------ Export und Bestandsschutz */

test('Export: kompaktes Verzeichnis ohne Änderung der Bewertungen', () => {
  const b = bundle();
  b.entries = [entry()];
  const before = JSON.stringify(b.videos.map(v => v.facts));
  const x = K.exportIndex(b);
  assert.equal(JSON.stringify(b.videos.map(v => v.facts)), before);
  assert.equal(x.videos.length, 3);
  const c = x.videos[0].claims.find(y => y.id === VA + '-A0002');
  assert.equal(c.verdict, 'Widerlegt');
  assert.equal(c.startSeconds, 120);
  assert.equal(c.sources[0].title, 'Studie X');
  assert.ok(x.topicStats.find(s => s.id === 'atomkraft').public);
});

test('Agentenwerkzeug läuft auf dem echten Bestand', () => {
  const { main } = require('../scripts/wissen.js');
  const out = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = s => { out.push(String(s)); return true; };
  try {
    assert.equal(main(['pruefen', '--heute', '2026-11-19']), 0);
    assert.equal(main(['suche', 'Energiepreise', 'Industrie']), 0);
    assert.equal(main(['betroffen', '--quelle', 'https://www.destatis.de/']), 0);
    assert.equal(main(['suche']), 2);
    assert.equal(main(['korrekturen']), 0);
    assert.equal(main(['korrektur', '--quelle', 'https://www.destatis.de/', '--agent', 'Test']), 0, 'Entwurf ohne Speichern');
    assert.equal(main(['korrektur']), 2);
    assert.equal(main(['korrektur', '--aussage', 'x', '--art', 'Unsinn']), 2);
  } finally { process.stdout.write = orig; }
  assert.ok(out.join('').includes('OK: Wissensdatenbank gültig.'));
});

/* ------------------------------------------------------------ Korrekturablauf (Schritt 6) */

test('Korrekturentwurf: nächste ID, alle Betroffenen, Status Gemeldet, gültig', () => {
  const b = bundle();
  b.entries = [entry()];
  b.corrections = [correction()];
  assert.equal(K.nextId('UG', 'C', ['UG-C0001', 'UG-C0009', 'HP-C0042']), 'UG-C0010');
  assert.equal(K.nextId('HP', 'K', []), 'HP-K0001');
  const d = K.draftCorrection(b, { claimId: VA + '-A0002', agent: 'Test', date: '2026-11-19', description: 'Quelle falsch gelesen.' });
  assert.equal(d.id, 'UG-C0002');
  assert.equal(d.status, 'Gemeldet');
  const targets = d.affected.map(x => x.target);
  assert.ok(targets.includes(VA + '-A0002') && targets.includes(VB + '-A0001') && targets.includes('UG-K0001'), targets.join(','));
  assert.deepEqual(K.validateCorrection(d, ctxFor(b)), []);
  assert.ok(K.needsHumanApproval(d, CFG), 'gleiche Quelle in vielen Aussagen: Freigabe nötig');
  assert.throws(() => K.draftCorrection(b, {}));
});

test('Korrekturbericht nennt Freigabebedarf und nächsten Schritt', () => {
  const b = bundle();
  assert.match(K.correctionReport(b), /Keine Korrekturvorgänge/);
  b.corrections = [correction(), correction({ id: 'UG-C0002', status: 'In Prüfung', affected: [1, 2, 3, 4].map(n => ({ target: VA + '-A000' + n, reason: 'r' })) })];
  const md = K.correctionReport(b);
  assert.match(md, /\| UG-C0001 \| Fehlbewertung \| Gemeldet \| 1 \| Regel möglich/);
  assert.match(md, /\| UG-C0002 .*Mensch nötig .*Entscheidung durch Jens/);
});

test('Urteilsänderungen ohne Korrekturvorgang werden erkannt, abgedeckte nicht', () => {
  const before = new Map([[VA + '-A0001', { status: 'Abgeschlossen', verdict: 'Belegt' }], [VA + '-A0002', { status: 'Abgeschlossen', verdict: 'Belegt' }], [VA + '-A0003', { status: 'Offen', verdict: null }]]);
  const after = new Map([[VA + '-A0001', { status: 'Abgeschlossen', verdict: 'Widerlegt' }], [VA + '-A0002', { status: 'Abgeschlossen', verdict: 'Widerlegt' }], [VA + '-A0003', { status: 'Abgeschlossen', verdict: 'Belegt' }]]);
  const corr = correction({ status: 'Umgesetzt', changes: [{ target: VA + '-A0002', field: 'verdict', before: 'Belegt', after: 'Widerlegt' }] });
  assert.deepEqual(K.uncoveredVerdictChanges(before, after, [corr]), [{ id: VA + '-A0001', before: 'Belegt', after: 'Widerlegt' }], 'Erstprüfung (Offen) zählt nicht');
});

test('Öffentliches Korrekturprotokoll: nur umgesetzte Vorgänge, mit Themen', () => {
  const b = bundle();
  const ev = [{ title: 'Amt', url: 'https://destatis.de/x', accessedOn: '2026-11-19', finding: 'f' }];
  b.corrections = [correction(), correction({ id: 'UG-C0002', status: 'Umgesetzt', evidence: ev, decision: { by: 'Jens', date: '2026-11-20', basis: 'Primärquelle.' }, changes: [{ target: VA + '-A0002', field: 'verdict', before: 'Belegt', after: 'Widerlegt' }] })];
  const pub = K.exportIndex(b).corrections;
  assert.equal(pub.length, 1);
  assert.equal(pub[0].id, 'UG-C0002');
  assert.deepEqual(pub[0].topics, ['atomkraft/sicherheit']);
  assert.equal(pub[0].changes[0].before, 'Belegt');
  assert.equal(pub[0].decidedBy, 'Jens');
});
