/*
 * Politik4M3 Faktencheck – Gegendarstellungen aus anderen geprüften Videos.
 * Eigener Code ohne Fremdbibliotheken. Reine Logik ohne DOM-Zugriff, damit sie im Browser
 * (window.FactCounter) und unter Node (require) gleich geprüft werden kann.
 *
 * Zweck (docs/GEGENDARSTELLUNG.md): Steht bei einer kritisch eingeordneten Aussage (widerlegt, irreführend,
 * nicht ausreichend belegbar, Meinung/Vermutung oder noch ohne Urteil) in einem anderen Video eine
 * belegte Gegenaussage, wird diese als Referenz mit Zeitmarke angezeigt („Hier wird es anders und belegt erklärt“).
 *
 * Grundsätze:
 *  - Nichts wird gespeichert oder neu bewertet. Die Zuordnung ergibt sich ausschließlich aus bereits
 *    gepflegten Verknüpfungen: `gegenbehauptung` in faktenchecks/beziehungen.json und Wissenseinträge
 *    (wissen/eintraege), in denen eine Aussage dem Eintrag entspricht und die andere ihm widerspricht.
 *  - Angezeigt werden nur Gegenaussagen, die selbst abgeschlossen als „Belegt“ oder „Teilweise belegt“ bewertet sind.
 *  - Belegte und teilweise belegte Aussagen erhalten nie eine Gegendarstellung.
 *  - Bei mehreren Gegenaussagen gewinnt die besser bewertete (Belegt vor Teilweise belegt), danach das
 *    Video mit der besseren Faktenampel (berechnet nur in site/faktenindex.js und hier nur übergeben).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FactCounter = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Diese Urteile gelten als tragfähig; solche Aussagen bekommen keine Gegendarstellung. */
  const SUPPORTED = ['Belegt', 'Teilweise belegt'];
  /* Rangfolge der Gegenaussage und der Faktenampel ihres Videos (kleiner = besser). */
  const VERDICT_RANK = { 'Belegt': 0, 'Teilweise belegt': 1 };
  const AMPEL_RANK = { gruen: 0, gelb: 1, nicht_bewertbar: 2, vorlaeufig: 3, rot: 4 };
  /* Haltung einer Aussage zu einem Wissenseintrag: +1 behauptet ihn, -1 widerspricht ihm, sonst keine. */
  const STANCE = { gleichwertig: 1, teilaspekt: 1, widerspricht: -1 };
  const POLARITY = { 'Belegt': 1, 'Teilweise belegt': 1, 'Irreführend / Kontext fehlt': -1, 'Widerlegt': -1 };

  const videoOf = claimId => String(claimId || '').slice(0, 11);

  /* Kritisch = keine tragfähige Endbewertung: widerlegt, irreführend, nicht ausreichend belegbar,
     Meinung/Prognose (Vermutung) sowie noch offene, laufende oder nicht überprüfbare Aussagen. */
  function isCritical(claim) {
    return !!claim && !(claim.status === 'Abgeschlossen' && SUPPORTED.includes(claim.verdict));
  }

  /* Taugt eine Aussage als Gegendarstellung? Nur abgeschlossen belegt oder teilweise belegt. */
  function isSupported(claim) {
    return !!claim && claim.status === 'Abgeschlossen' && SUPPORTED.includes(claim.verdict);
  }

  /*
   * Alle Verknüpfungen, über die eine Aussage eine Gegenaussage haben kann.
   * relations: Inhalt von beziehungen.json; entries: Wissenseinträge (Array).
   * Ergebnis: Map claimId -> [{ claimId (Gegenaussage), via: 'reaktion'|'wissen', ref, note, seconds }]
   */
  function buildIndex(relations, entries) {
    const out = new Map();
    const add = (k, v) => { if (!out.has(k)) out.set(k, []); out.get(k).push(v); };
    for (const r of (relations && relations.relations) || []) {
      for (const l of r.claimLinks || []) {
        if (l.type !== 'gegenbehauptung' || !l.originalClaimId || !l.reactionClaimId) continue;
        add(l.originalClaimId, { claimId: l.reactionClaimId, via: 'reaktion', ref: l.id, note: l.note, seconds: l.reactionSeconds ?? null });
        add(l.reactionClaimId, { claimId: l.originalClaimId, via: 'reaktion', ref: l.id, note: l.note, seconds: null });
      }
    }
    for (const k of entries || []) {
      if (!k || k.status !== 'Geprüft' || POLARITY[k.verdict] == null) continue;
      const links = (k.links || []).filter(l => !l.repo && STANCE[l.relation] != null);
      for (const a of links) {
        for (const b of links) {
          if (a === b || STANCE[a.relation] === STANCE[b.relation]) continue;
          /* b ist nur dann eine Gegendarstellung, wenn seine Haltung zum Eintrag dessen Urteil folgt. */
          if (STANCE[b.relation] * POLARITY[k.verdict] !== 1) continue;
          add(a.claimId, { claimId: b.claimId, via: 'wissen', ref: k.id, note: b.contextNote || k.claim, seconds: null, relation: b.relation });
        }
      }
    }
    return out;
  }

  /* IDs der Videos, deren Aussagen für die Gegendarstellungen dieser Aussagen gebraucht werden. */
  function neededVideos(index, claimIds) {
    const ids = new Set();
    for (const id of claimIds) for (const c of index.get(id) || []) ids.add(videoOf(c.claimId));
    return [...ids];
  }

  /*
   * Gegendarstellungen zu einer Aussage, beste zuerst.
   * lookup(claimId) -> { claim, ampel } oder null; ampel ist der Schlüssel aus FactIndex.rate (optional).
   * Ergebnis: [{ claimId, videoId, claim, ampel, via, ref, note, seconds }]
   */
  function forClaim(claim, index, lookup) {
    if (!isCritical(claim)) return [];
    const own = videoOf(claim.id);
    const seen = new Map();
    for (const c of index.get(claim.id) || []) {
      const videoId = videoOf(c.claimId);
      if (videoId === own) continue;
      const hit = lookup(c.claimId);
      if (!hit || !isSupported(hit.claim)) continue;
      const item = { ...c, videoId, claim: hit.claim, ampel: hit.ampel || null };
      const prev = seen.get(c.claimId);
      /* Dieselbe Gegenaussage über beide Wege: die direkte Reaktionsverknüpfung behalten. */
      if (!prev || (prev.via !== 'reaktion' && c.via === 'reaktion')) seen.set(c.claimId, item);
    }
    return [...seen.values()].sort(compare);
  }

  function compare(a, b) {
    return (VERDICT_RANK[a.claim.verdict] - VERDICT_RANK[b.claim.verdict]) ||
      ((AMPEL_RANK[a.ampel] ?? 3) - (AMPEL_RANK[b.ampel] ?? 3)) ||
      ((a.via === 'reaktion' ? 0 : 1) - (b.via === 'reaktion' ? 0 : 1)) ||
      a.claimId.localeCompare(b.claimId);
  }

  /* Stelle der Gegenaussage im anderen Video: erste Fundstelle, sonst die Stelle der Reaktion. */
  function startSeconds(item) {
    const o = (item.claim.occurrences || []).find(x => Number.isInteger(x.startSeconds));
    if (o) return o.startSeconds;
    return Number.isInteger(item.seconds) ? item.seconds : null;
  }

  return { SUPPORTED, AMPEL_RANK, isCritical, isSupported, buildIndex, neededVideos, forClaim, startSeconds, videoOf };
});
