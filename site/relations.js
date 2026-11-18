/*
 * Politik4M3 Faktencheck – Originalinterviews, Reaktionsvideos und ihre Beziehungen.
 * Eigener Code ohne Fremdbibliotheken. Reine Logik ohne DOM-Zugriff, damit sie im Browser
 * (window.FactRelations) und unter Node (require) gleich geprüft werden kann.
 *
 * Datenquellen (siehe docs/REAKTIONSVIDEOS.md):
 *   faktenchecks/<ID>/video.json      Rolle und Metadaten je Video
 *   faktenchecks/beziehungen.json     Beziehungen Reaktion ↔ Original (mehrere-zu-mehrere)
 *
 * Grundsatz: Der Originalcheck ist kein Wahrheitsmaßstab. Abweichende Bewertungen werden
 * nicht angeglichen, sondern als Prüfkonflikt sichtbar gemacht, bis sie begründet geklärt sind.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FactRelations = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ROLES = ['original', 'reaction'];
  const REACTION_TYPES = {
    zustimmend: 'Zustimmende Reaktion',
    kritisch: 'Kritische Reaktion',
    gemischt: 'Gemischte Reaktion',
    kommentar: 'Kommentar',
    analyse: 'Analyse',
    faktencheck: 'Eigener Faktencheck',
    einordnung: 'Journalistische Einordnung'
  };
  const WORK_STATUS = ['Erfasst', 'In Bearbeitung', 'Teilbestand geprüft', 'Abgeschlossen'];
  const CERTAINTY = ['Belegt', 'Plausibel'];
  /* Art der Verknüpfung zweier Aussagen. Nur die beiden ersten werden automatisch verglichen. */
  const LINK_TYPES = {
    gleiche_behauptung: 'Gleiche überprüfbare Behauptung',
    gegenbehauptung: 'Gegenbehauptung zur Originalaussage',
    gibt_wieder: 'Gibt die Originalaussage wieder',
    ergaenzt: 'Ergänzt die Originalaussage'
  };
  const RESOLUTIONS = {
    unterschiedlicher_bezug: 'Unterschiedlicher Bezugszeitpunkt oder Geltungsbereich',
    neubewertung_original: 'Originalcheck wurde neu bewertet',
    neubewertung_reaktion: 'Reaktionscheck wurde neu bewertet',
    begruendet_abweichend: 'Abweichung begründet, beide Bewertungen bleiben'
  };
  /* Richtung einer Endbewertung. Meinung, nicht belegbar und offene Prüfungen haben keine. */
  const POLARITY = { 'Belegt': 1, 'Teilweise belegt': 1, 'Irreführend / Kontext fehlt': -1, 'Widerlegt': -1 };

  const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const text = x => typeof x === 'string' && x.trim().length > 0;
  const https = x => typeof x === 'string' && /^https:\/\/\S+$/.test(x);
  const isoDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);

  /* Metadaten eines Videos (video.json). Gibt eine Liste von Fehlern zurück, leer = gültig. */
  function validateVideoMeta(m, dirId) {
    const e = [];
    const at = 'video.json' + (dirId ? ' (' + dirId + ')' : '');
    if (!isObj(m)) return [at + ': muss ein JSON-Objekt sein.'];
    if (m.schemaVersion !== 1) e.push(at + ': schemaVersion muss 1 sein.');
    if (!VIDEO_ID.test(m.videoId || '')) e.push(at + ': ungültige videoId.');
    if (dirId && m.videoId !== dirId) e.push(at + ': videoId passt nicht zum Verzeichnis.');
    if (!ROLES.includes(m.role)) e.push(at + ': role muss original oder reaction sein.');
    if (m.role === 'reaction' && !Object.hasOwn(REACTION_TYPES, m.reactionType)) e.push(at + ': unbekannter reactionType.');
    if (m.role === 'original' && m.reactionType != null) e.push(at + ': ein Original hat keinen reactionType.');
    if (!text(m.channel)) e.push(at + ': channel fehlt.');
    if (!text(m.title)) e.push(at + ': title fehlt.');
    if (!https(m.videoUrl)) e.push(at + ': videoUrl muss eine HTTPS-Adresse sein.');
    if (!WORK_STATUS.includes(m.workStatus)) e.push(at + ': unbekannter workStatus.');
    const idf = m.identification;
    if (!isObj(idf) || !text(idf.basis) || !CERTAINTY.includes(idf.certainty) || !isoDate(idf.checkedOn)) {
      e.push(at + ': identification braucht basis, certainty (Belegt/Plausibel) und checkedOn.');
    } else if (m.role === 'original' && idf.certainty !== 'Belegt') {
      e.push(at + ': als Original nur nach belegter Identifikation einordnen.');
    }
    return e;
  }

  /*
   * Beziehungsdatei prüfen.
   * videos: Map videoId -> { meta (video.json oder null), claims (Array oder null) }
   * Gibt Fehler zurück; Konflikte ohne Review-Aufgabe sind ebenfalls Fehler.
   */
  function validateRelations(rel, videos) {
    const e = [];
    if (!isObj(rel)) return ['beziehungen.json: muss ein JSON-Objekt sein.'];
    if (rel.schemaVersion !== 1) e.push('beziehungen.json: schemaVersion muss 1 sein.');
    if (!Array.isArray(rel.relations)) return e.concat('beziehungen.json: relations muss eine Liste sein.');
    const ids = new Set(), pairs = new Set(), linkIds = new Set();
    for (const r of rel.relations) {
      const at = 'Beziehung ' + (r && r.id || '?');
      if (!isObj(r) || !/^R\d{4}$/.test(r.id || '')) { e.push(at + ': id muss R0001 o. ä. sein.'); continue; }
      if (ids.has(r.id)) e.push(at + ': doppelte id.');
      ids.add(r.id);
      const re = videos.get(r.reactionVideoId), or = videos.get(r.originalVideoId);
      if (!re) e.push(at + ': Reaktionsvideo ' + r.reactionVideoId + ' existiert nicht.');
      else if (re.meta?.role !== 'reaction') e.push(at + ': ' + r.reactionVideoId + ' ist nicht als Reaktion eingeordnet.');
      if (!or) e.push(at + ': Original ' + r.originalVideoId + ' existiert nicht.');
      else if (or.meta?.role !== 'original') e.push(at + ': ' + r.originalVideoId + ' ist nicht als Original eingeordnet.');
      if (r.reactionVideoId === r.originalVideoId) e.push(at + ': Video kann nicht auf sich selbst reagieren.');
      const pair = r.reactionVideoId + '>' + r.originalVideoId;
      if (pairs.has(pair)) e.push(at + ': Paar Reaktion/Original ist doppelt erfasst.');
      pairs.add(pair);
      if (!text(r.basis)) e.push(at + ': Begründung (basis) der Zuordnung fehlt.');
      if (!CERTAINTY.includes(r.certainty)) e.push(at + ': certainty muss Belegt oder Plausibel sein.');
      if (!Array.isArray(r.claimLinks)) { e.push(at + ': claimLinks muss eine Liste sein.'); continue; }
      checkHistory(r.history, at, e);
      for (const l of r.claimLinks) {
        const lat = at + ' / ' + (l && l.id || '?');
        if (!isObj(l) || !/^L\d{4}$/.test(l.id || '')) { e.push(lat + ': id muss L0001 o. ä. sein.'); continue; }
        if (linkIds.has(l.id)) e.push(lat + ': doppelte id.');
        linkIds.add(l.id);
        if (!Object.hasOwn(LINK_TYPES, l.type)) e.push(lat + ': unbekannter type.');
        if (!text(l.note)) e.push(lat + ': Erläuterung (note) fehlt.');
        const oc = findClaim(or, l.originalClaimId);
        if (!oc) e.push(lat + ': Originalaussage ' + l.originalClaimId + ' existiert nicht.');
        if (l.reactionClaimId != null && !findClaim(re, l.reactionClaimId)) e.push(lat + ': Reaktionsaussage ' + l.reactionClaimId + ' existiert nicht.');
        if (l.reactionClaimId == null && (l.type === 'gleiche_behauptung' || l.type === 'gegenbehauptung')) e.push(lat + ': Vergleich braucht reactionClaimId.');
        if (l.reactionSeconds != null && !(Number.isInteger(l.reactionSeconds) && l.reactionSeconds >= 0)) e.push(lat + ': reactionSeconds muss eine ganze Zahl ≥ 0 sein.');
        if (l.review != null && (!isObj(l.review) || !https(l.review.task) || !text(l.review.note))) e.push(lat + ': review braucht task (HTTPS-Link) und note.');
        if (l.resolution != null) {
          const s = l.resolution;
          if (!isObj(s) || !Object.hasOwn(RESOLUTIONS, s.status) || !text(s.note) || !isoDate(s.date) || !Array.isArray(s.sources) || !s.sources.every(https) || !s.sources.length) {
            e.push(lat + ': resolution braucht status, note, date und mindestens eine Quelle (HTTPS).');
          }
        }
        checkHistory(l.history, lat, e);
        const c = compareLink(l, oc, findClaim(re, l.reactionClaimId));
        if (c.state === 'konflikt' && !l.review) e.push(lat + ': ungeklärter Prüfkonflikt ohne Review-Aufgabe (review.task).');
      }
    }
    return e;
  }

  function checkHistory(h, at, e) {
    if (h == null) return;
    if (!Array.isArray(h) || !h.every(x => isObj(x) && isoDate(x.date) && text(x.change))) e.push(at + ': history-Einträge brauchen date und change.');
  }

  function findClaim(video, claimId) {
    if (!video || !Array.isArray(video.claims) || claimId == null) return null;
    return video.claims.find(c => c.id === claimId) || null;
  }

  /*
   * Vergleich zweier verknüpfter Aussagen.
   * state: 'kein_vergleich' | 'offen' (eine Seite ohne Endbewertung) | 'stimmig' | 'konflikt' | 'geklaert'
   */
  function compareLink(link, originalClaim, reactionClaim) {
    if (!link || (link.type !== 'gleiche_behauptung' && link.type !== 'gegenbehauptung')) return { state: 'kein_vergleich' };
    const po = POLARITY[originalClaim?.verdict], pr = POLARITY[reactionClaim?.verdict];
    if (po == null || pr == null) return { state: 'offen' };
    const consistent = link.type === 'gleiche_behauptung' ? po === pr : po !== pr;
    if (consistent) return { state: 'stimmig' };
    return link.resolution ? { state: 'geklaert' } : { state: 'konflikt' };
  }

  /* Index für die Webseite: Reaktionen je Original, Originale je Reaktion, Links je Aussage. */
  function buildIndex(rel) {
    const byOriginal = new Map(), byReaction = new Map(), byClaim = new Map();
    const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
    for (const r of (rel && rel.relations) || []) {
      push(byOriginal, r.originalVideoId, r);
      push(byReaction, r.reactionVideoId, r);
      for (const l of r.claimLinks || []) {
        push(byClaim, l.originalClaimId, { relation: r, link: l });
        if (l.reactionClaimId) push(byClaim, l.reactionClaimId, { relation: r, link: l });
      }
    }
    return { byOriginal, byReaction, byClaim };
  }

  const STATE_TEXT = {
    kein_vergleich: 'Kein automatischer Vergleich',
    offen: 'Vergleich offen: mindestens eine Seite ohne Endbewertung',
    stimmig: 'Bewertungen passen zusammen',
    konflikt: 'Prüfkonflikt offen',
    geklaert: 'Abweichung begründet geklärt'
  };

  return { ROLES, REACTION_TYPES, WORK_STATUS, LINK_TYPES, RESOLUTIONS, POLARITY, STATE_TEXT,
    validateVideoMeta, validateRelations, compareLink, buildIndex, findClaim };
});
