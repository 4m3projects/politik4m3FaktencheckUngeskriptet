/*
 * Politik4M3 Faktencheck – zweite Bewertungsebene: Rhetorik und Darstellung.
 * Eigener Code ohne Fremdbibliotheken. Reine Logik ohne DOM-Zugriff, damit sie im Browser
 * (window.FactRhetoric) und unter Node (require) gleich geprüft werden kann.
 *
 * Grundlage: docs/AGENTEN_RHETORIK.md, Datenmodell: docs/RHETORIK.md.
 * Datenquelle: faktenchecks/<ID>/rhetorik.json (optional, je Video).
 *
 * Grundsätze:
 *  - Ebene 1 (Faktenprüfung in strukturiert/aussagen.json) bleibt unverändert. Dieses Modul liest
 *    Aussagen nur, verändert sie nie und rechnet nichts in Faktenstatistiken ein.
 *  - Rhetorik-Hinweise sind beschreibende KI-Einschätzungen, keine Fehlerpunkte, keine Wahr/Falsch-
 *    Kategorie und keine Personennote. Es gibt bewusst keine Gesamtkennzahl.
 *  - Fehlt rhetorik.json, ist das Video rhetorisch „noch nicht geprüft“ – nicht „unauffällig“.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FactRhetoric = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Merkmale laut docs/AGENTEN_RHETORIK.md. Schlüssel sind stabil, Texte nur Anzeige. */
  const FEATURES = {
    abwertung: { name: 'Abwertende Sprache', hint: 'Abwertende Formulierung oder persönliche Herabsetzung; getrennt von scharfer Sachkritik.' },
    ironie: { name: 'Ironie / Satire', hint: 'Ironie, Sarkasmus oder Satire als Stilmittel – nicht automatisch negativ.' },
    tunnelblick: { name: 'Möglicher Tunnelblick', hint: 'Eine konkret benannte, für die Schlussfolgerung relevante Gegeninformation fehlt.' },
    pauschalisierung: { name: 'Pauschalisierung', hint: 'Verallgemeinerung von Einzelnen oder Einzelfällen auf Gruppen oder auf „alle“.' },
    emotionalisierung: { name: 'Emotionalisierung', hint: 'Beobachtbare emotionalisierende Mittel wie Superlative oder Bedrohungsbilder; kein Sachfehler.' },
    gegenposition: { name: 'Wiedergabe von Gegenpositionen', hint: 'Wie fair oder verzerrt eine Gegenposition wiedergegeben wird.' }
  };
  /* Wie deutlich das Merkmal an dieser Stelle ist. „Nicht beurteilbar“ statt Gewissheit bei fehlendem Kontext. */
  const ASSESSMENTS = ['Erkennbar', 'Möglich', 'Nicht beurteilbar'];
  const RELIABILITY = ['Hoch', 'Mittel', 'Niedrig'];
  /* Redaktioneller Stand einer einzelnen Markierung. */
  const STATUS = ['KI-Vorschlag', 'Redaktionell bestätigt', 'Redaktionell verworfen'];
  /* Prüfstand eines ganzen Videos auf Ebene 2. */
  const REVIEW_STATUS = ['Noch nicht geprüft', 'Teilweise geprüft', 'Vollständig geprüft'];
  const ATTRIBUTION = ['Bestätigt', 'Plausibel', 'Ungeklärt'];
  /* Felder, die eine Annotation niemals tragen darf: Ebene 2 ändert keine Faktenbewertung. */
  const FORBIDDEN = ['verdict', 'status_fact', 'score', 'points', 'penalty', 'rating'];

  const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const text = x => typeof x === 'string' && x.trim().length > 0;
  const https = x => typeof x === 'string' && /^https:\/\/\S+$/.test(x);
  const isoDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
  const secs = x => Number.isInteger(x) && x >= 0;
  const KNOWN = new Set(['id', 'claimId', 'feature', 'startSeconds', 'endSeconds', 'speaker', 'observation', 'reason',
    'context', 'assessment', 'reliability', 'uncertainty', 'missingInformation', 'status', 'basis', 'history']);

  /*
   * rhetorik.json prüfen.
   * data: Inhalt von rhetorik.json; dirId: Verzeichnisname; facts: aussagen.json desselben Videos oder null.
   * Gibt eine Liste von Fehlern zurück, leer = gültig.
   */
  function validate(data, dirId, facts) {
    const e = [];
    const at = 'rhetorik.json' + (dirId ? ' (' + dirId + ')' : '');
    if (!isObj(data)) return [at + ': muss ein JSON-Objekt sein.'];
    if (data.schemaVersion !== 1) e.push(at + ': schemaVersion muss 1 sein.');
    if (!VIDEO_ID.test(data.videoId || '')) e.push(at + ': ungültige videoId.');
    if (dirId && data.videoId !== dirId) e.push(at + ': videoId passt nicht zum Verzeichnis.');
    for (const k of Object.keys(data)) if (!['schemaVersion', 'videoId', 'review', 'annotations'].includes(k)) e.push(at + ': unbekanntes Feld ' + k + '.');

    const rv = data.review;
    if (!isObj(rv)) e.push(at + ': review fehlt.');
    else {
      if (!REVIEW_STATUS.includes(rv.status)) e.push(at + ': review.status muss ' + REVIEW_STATUS.join(', ') + ' sein.');
      if (!isoDate(rv.checkedOn)) e.push(at + ': review.checkedOn muss ein Datum (JJJJ-MM-TT) sein.');
      if (!text(rv.by)) e.push(at + ': review.by (prüfender Agent oder Mensch) fehlt.');
      if (!text(rv.basis)) e.push(at + ': review.basis (tatsächliche Grundlage) fehlt.');
      if (!text(rv.coverage)) e.push(at + ': review.coverage (tatsächlicher Umfang) fehlt.');
      if (!Array.isArray(rv.limits) || !rv.limits.every(text)) e.push(at + ': review.limits muss eine Liste von Texten sein.');
      if (rv.status === 'Vollständig geprüft' && Array.isArray(rv.limits) && rv.limits.length) e.push(at + ': „Vollständig geprüft“ verträgt keine offenen Grenzen (review.limits).');
      checkHistory(rv.history, at + ' / review', e);
    }

    if (!Array.isArray(data.annotations)) return e.concat(at + ': annotations muss eine Liste sein.');
    const claims = new Map(((facts && facts.claims) || []).map(c => [c.id, c]));
    const speakers = new Set(((facts && facts.speakers) || []).map(s => s.id));
    const duration = facts && facts.scope && Number.isInteger(facts.scope.durationSeconds) ? facts.scope.durationSeconds : null;
    const ids = new Set();
    for (const a of data.annotations) {
      const aat = at + ' / ' + (a && a.id || '?');
      if (!isObj(a)) { e.push(aat + ': Annotation muss ein Objekt sein.'); continue; }
      if (!new RegExp('^' + escRe(data.videoId || '') + '-R\\d{4}$').test(a.id || '')) e.push(aat + ': id muss <Video-ID>-R0001 o. ä. sein.');
      if (ids.has(a.id)) e.push(aat + ': doppelte id.');
      ids.add(a.id);
      for (const k of Object.keys(a)) {
        if (FORBIDDEN.includes(k)) e.push(aat + ': Feld ' + k + ' ist verboten – Rhetorik ändert keine Faktenbewertung und vergibt keine Punkte.');
        else if (!KNOWN.has(k)) e.push(aat + ': unbekanntes Feld ' + k + '.');
      }
      if (!Object.hasOwn(FEATURES, a.feature)) e.push(aat + ': unbekanntes Merkmal (feature).');
      if (a.claimId != null) {
        if (facts && !claims.has(a.claimId)) e.push(aat + ': Aussage ' + a.claimId + ' existiert nicht.');
        if (!String(a.claimId).startsWith((data.videoId || '') + '-A')) e.push(aat + ': claimId gehört nicht zu diesem Video.');
      }
      if (!secs(a.startSeconds) || !secs(a.endSeconds) || a.endSeconds < a.startSeconds) e.push(aat + ': Zeitmarke (startSeconds ≤ endSeconds, ganze Sekunden) fehlt oder ist ungültig.');
      else if (duration != null && a.endSeconds > duration) e.push(aat + ': Zeitmarke liegt außerhalb der Videolaufzeit.');
      const sp = a.speaker;
      if (!isObj(sp) || !ATTRIBUTION.includes(sp.attribution) || !text(sp.basis)) e.push(aat + ': speaker braucht attribution (Bestätigt/Plausibel/Ungeklärt) und basis.');
      else {
        if (sp.attribution === 'Ungeklärt' && sp.id != null) e.push(aat + ': bei ungeklärtem Sprecher ist speaker.id null.');
        if (sp.attribution !== 'Ungeklärt' && !text(sp.id)) e.push(aat + ': speaker.id fehlt.');
        if (sp.id != null && facts && !speakers.has(sp.id)) e.push(aat + ': Sprecher ' + sp.id + ' steht nicht im Sprecherverzeichnis.');
      }
      for (const f of ['observation', 'reason', 'context', 'uncertainty', 'basis']) if (!text(a[f])) e.push(aat + ': ' + f + ' fehlt.');
      if (!ASSESSMENTS.includes(a.assessment)) e.push(aat + ': assessment muss ' + ASSESSMENTS.join(', ') + ' sein.');
      if (!RELIABILITY.includes(a.reliability)) e.push(aat + ': reliability muss ' + RELIABILITY.join(', ') + ' sein.');
      if (!STATUS.includes(a.status)) e.push(aat + ': status muss ' + STATUS.join(', ') + ' sein.');
      if (a.feature === 'tunnelblick' && a.assessment !== 'Nicht beurteilbar') {
        const m = a.missingInformation;
        if (!isObj(m) || !text(m.what) || !(https(m.source) || text(m.reasoning))) {
          e.push(aat + ': Tunnelblick braucht missingInformation.what und eine Quelle (HTTPS) oder nachvollziehbare Begründung.');
        }
      } else if (a.missingInformation != null && !isObj(a.missingInformation)) e.push(aat + ': missingInformation muss ein Objekt sein.');
      checkHistory(a.history, aat, e);
      if (!Array.isArray(a.history) || !a.history.length) e.push(aat + ': history braucht mindestens den Erfassungseintrag.');
    }
    return e;
  }

  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function checkHistory(h, at, e) {
    if (h == null) return;
    if (!Array.isArray(h) || !h.every(x => isObj(x) && isoDate(x.date) && text(x.by) && text(x.change))) e.push(at + ': history-Einträge brauchen date, by und change.');
  }

  /* Sichtbare Annotationen: redaktionell verworfene werden nicht angezeigt, bleiben aber in den Daten. */
  function visible(data) {
    return ((data && data.annotations) || []).filter(a => a.status !== 'Redaktionell verworfen');
  }

  /* Annotationen je Aussage-ID. Annotationen ohne Aussagebezug stehen unter null. Liest nur. */
  function byClaim(data) {
    const m = new Map();
    for (const a of visible(data)) {
      const k = a.claimId ?? null;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(a);
    }
    return m;
  }

  /* Anzahl Hinweise je Merkmal – eine Übersicht, keine Kennzahl, keine Wertung. */
  function featureCounts(data) {
    const counts = Object.fromEntries(Object.keys(FEATURES).map(k => [k, 0]));
    for (const a of visible(data)) if (Object.hasOwn(counts, a.feature)) counts[a.feature]++;
    return counts;
  }

  /* Prüfstand eines Videos, auch ohne rhetorik.json. */
  function reviewState(data) {
    if (!data || !isObj(data.review)) return { status: 'Noch nicht geprüft', annotations: 0, claims: 0 };
    const v = visible(data);
    return { status: data.review.status, annotations: v.length, claims: new Set(v.map(a => a.claimId).filter(Boolean)).size };
  }

  return { FEATURES, ASSESSMENTS, RELIABILITY, STATUS, REVIEW_STATUS, ATTRIBUTION,
    validate, visible, byClaim, featureCounts, reviewState };
});
