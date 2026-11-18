/*
 * FIKTIVE TESTDATEN für site/relations-test.js und site/relations-browser-test.js.
 * Keine realen Videos, Kanäle, Personen oder Faktenchecks. Diese Datei wird nicht veröffentlicht
 * (der Workflow kopiert nur ausdrücklich genannte Seitendateien) und darf nie als echte Daten dienen.
 *
 * Abgedeckt: zwei Reaktionen verschiedener Kanäle zu einem Original, eine Reaktion zu zwei
 * Originalen, ein offener Prüfkonflikt mit Review-Aufgabe, eine geklärte Abweichung und eine
 * stimmige Gegenbehauptung.
 */
'use strict';

const NOTE = 'Fiktive Testdaten – kein echter Faktencheck.';

function meta(videoId, role, extra = {}) {
  return {
    schemaVersion: 1, videoId, role, reactionType: null,
    channel: 'Fiktiver Testkanal', title: 'Fiktives Testvideo ' + videoId,
    videoUrl: 'https://www.youtube.com/watch?v=' + videoId, workStatus: 'Teilbestand geprüft',
    identification: { basis: NOTE, certainty: 'Belegt', checkedOn: '2026-11-18' },
    ...extra
  };
}

function claim(videoId, n, verdict, description) {
  return {
    id: `${videoId}-A${String(n).padStart(4, '0')}`, videoId, chapter: 1, legacyId: null,
    kind: verdict === 'Meinung / Prognose' ? 'Meinung' : 'Tatsachenbehauptung',
    description: description + ' (' + NOTE + ')',
    status: verdict ? 'Abgeschlossen' : 'Offen', verdict,
    reason: verdict ? 'Fiktive Begründung für Tests.' : 'Fiktiv, noch offen.',
    assessmentBasis: NOTE,
    migration: { changeType: 'Neuerfassung', mapping: NOTE, assessmentChange: NOTE },
    sourceRefs: [{ sourceId: 'S001', note: NOTE }], openQuestions: [], occurrences: [], relations: []
  };
}

function data(videoId, claims) {
  return {
    schemaVersion: 2,
    scope: { kind: 'Teilbestand', videoId, videoUrl: 'https://www.youtube.com/watch?v=' + videoId, durationSeconds: 600, asOf: '2026-11-18',
      baselineCommit: null, selectedLegacyIds: [], totalLegacyPoints: 0, unmigratedLegacyPoints: 0,
      coverageNote: 'Recherche abgeschlossen (fiktiv). ' + NOTE, researchNote: NOTE },
    speakers: [], legacyPoints: [],
    sources: [{ id: 'S001', title: 'Fiktive Testquelle', url: 'https://example.org/fiktive-quelle', details: NOTE, accessedOn: '2026-11-18', accessBasis: NOTE }],
    claims
  };
}

const O1 = 'FIKTIVORIG1', O2 = 'FIKTIVORIG2', RA = 'FIKTIVREAKA', RB = 'FIKTIVREAKB';

const VIDEOS = {
  [O1]: { meta: meta(O1, 'original', { channel: 'Fiktiver Interviewkanal' }), data: data(O1, [
    claim(O1, 1, 'Belegt', 'Fiktive Zahl X ist im Jahr 2025 gestiegen.'),
    claim(O1, 2, 'Widerlegt', 'Fiktive Behörde Y hat Regel Z abgeschafft.'),
    claim(O1, 3, 'Belegt', 'Fiktive Quote lag 2024 bei 10 Prozent.')
  ]) },
  [O2]: { meta: meta(O2, 'original', { channel: 'Fiktiver Interviewkanal' }), data: data(O2, [
    claim(O2, 1, 'Teilweise belegt', 'Fiktive Entwicklung W hält seit Jahren an.')
  ]) },
  [RA]: { meta: meta(RA, 'reaction', { channel: 'Fiktiver Kanal A', reactionType: 'kritisch' }), data: data(RA, [
    claim(RA, 1, 'Widerlegt', 'Fiktive Zahl X ist im Jahr 2025 gestiegen (in der Reaktion bestritten).'),
    claim(RA, 2, 'Belegt', 'Fiktive Behörde Y hat Regel Z nicht abgeschafft.'),
    claim(RA, 3, 'Meinung / Prognose', 'Fiktive Entwicklung W wird sich umkehren.')
  ]) },
  [RB]: { meta: meta(RB, 'reaction', { channel: 'Fiktiver Kanal B', reactionType: 'zustimmend' }), data: data(RB, [
    claim(RB, 1, 'Widerlegt', 'Fiktive Quote lag 2024 bei 10 Prozent (andere Abgrenzung).')
  ]) }
};

const RELATIONS = {
  schemaVersion: 1,
  note: NOTE,
  relations: [
    { id: 'R0001', reactionVideoId: RA, originalVideoId: O1, certainty: 'Belegt', basis: 'Fiktiv: Reaktion nennt das Original ausdrücklich. ' + NOTE,
      claimLinks: [
        { id: 'L0001', type: 'gleiche_behauptung', originalClaimId: `${O1}-A0001`, reactionClaimId: `${RA}-A0001`, reactionSeconds: 95,
          note: 'Fiktiv: beide prüfen dieselbe Zahl, mit gegensätzlichem Ergebnis.',
          review: { task: 'https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/issues/4', note: 'Fiktive Review-Aufgabe.' } },
        { id: 'L0002', type: 'gegenbehauptung', originalClaimId: `${O1}-A0002`, reactionClaimId: `${RA}-A0002`,
          note: 'Fiktiv: Reaktion widerspricht einer im Original widerlegten Aussage.' },
        { id: 'L0003', type: 'gibt_wieder', originalClaimId: `${O1}-A0003`, reactionClaimId: null, reactionSeconds: 30,
          note: 'Fiktiv: Reaktion gibt die Originalaussage wieder.' }
      ] },
    { id: 'R0002', reactionVideoId: RB, originalVideoId: O1, certainty: 'Plausibel', basis: 'Fiktiv: zeitliche und thematische Nähe. ' + NOTE,
      claimLinks: [
        { id: 'L0004', type: 'gleiche_behauptung', originalClaimId: `${O1}-A0003`, reactionClaimId: `${RB}-A0001`,
          note: 'Fiktiv: gleiche Quote, unterschiedliche Abgrenzung.',
          resolution: { status: 'unterschiedlicher_bezug', note: 'Fiktiv: unterschiedliche Grundgesamtheit.', date: '2026-11-18', sources: ['https://example.org/fiktive-quelle'] },
          history: [{ date: '2026-11-18', change: 'Fiktiv: Abweichung als unterschiedlicher Bezug geklärt.' }] }
      ] },
    { id: 'R0003', reactionVideoId: RA, originalVideoId: O2, certainty: 'Belegt', basis: 'Fiktiv: Reaktion bespricht auch dieses Original. ' + NOTE,
      claimLinks: [
        { id: 'L0005', type: 'ergaenzt', originalClaimId: `${O2}-A0001`, reactionClaimId: `${RA}-A0003`, note: 'Fiktiv: Prognose zur Entwicklung.' }
      ] }
  ]
};

/* Map im Format, das validateRelations erwartet. */
function videoMap(videos = VIDEOS) {
  return new Map(Object.entries(videos).map(([id, v]) => [id, { meta: v.meta, claims: v.data ? v.data.claims : null }]));
}

module.exports = { NOTE, O1, O2, RA, RB, VIDEOS, RELATIONS, videoMap, meta, claim, data };
