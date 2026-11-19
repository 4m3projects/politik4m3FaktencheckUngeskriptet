/*
 * Politik4M3 Faktencheck – Themen-Wissensdatenbank.
 * Eigener Code ohne Fremdbibliotheken. Reine Logik ohne DOM-Zugriff, damit sie im Browser
 * (window.FactKnowledge), unter Node (require) und im Agentenwerkzeug scripts/wissen.js gleich arbeitet.
 *
 * Grundlage und Datenmodell: docs/WISSENSDATENBANK.md.
 * Daten: wissen/konfiguration.json, wissen/themen.json, wissen/eintraege/*.json,
 *        wissen/korrekturen/*.json, faktenchecks/<ID>/themen.json.
 *
 * Grundsätze:
 *  - Die Faktenprüfung in strukturiert/aussagen.json bleibt die einzige Quelle für Bewertungen von
 *    Videoaussagen. Dieses Modul liest Aussagen nur und verändert sie nie.
 *  - Abgeleitete Ergebnisse (öffentliche Themen, Themenseiten, „wiederkehrend“, Empfehlungen)
 *    werden berechnet, nie gespeichert.
 *  - Ähnlichkeit liefert Kandidaten, keine Gleichsetzung. Frühere Bewertungen sind kein Beleg.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FactKnowledge = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Dieselben sechs Kategorien wie im Faktencheck (Schema 2). */
  const VERDICTS = ['Belegt', 'Teilweise belegt', 'Irreführend / Kontext fehlt', 'Widerlegt', 'Nicht ausreichend belegbar', 'Meinung / Prognose'];
  const DECIDED = ['Belegt', 'Teilweise belegt', 'Irreführend / Kontext fehlt', 'Widerlegt'];
  const ERROR_VERDICTS = ['Irreführend / Kontext fehlt', 'Widerlegt'];
  const LEVELS = ['Hauptthema', 'Unterthema', 'Fragestellung'];
  const VISIBILITY = ['automatisch', 'freigegeben', 'intern'];
  const RELEVANCE = ['Schwerpunkt', 'Behandelt', 'Erwähnt'];
  const ENTRY_STATUS = ['Entwurf', 'Geprüft', 'Abgelöst', 'Zurückgezogen'];
  const LINK_RELATIONS = {
    gleichwertig: 'Sinngemäß dieselbe Behauptung mit gleichem Geltungsbereich und Zeitbezug',
    teilaspekt: 'Die Aussage behauptet einen Teil des Eintrags oder umgekehrt',
    verwandt: 'Gleiche Frage, andere Behauptung; kein Bewertungsabgleich',
    widerspricht: 'Die Aussage behauptet das Gegenteil des Eintrags'
  };
  const SOURCE_KINDS = ['Primärquelle', 'Sekundärquelle', 'Studie', 'Amtliche Statistik', 'Gesetzestext', 'Medienbericht', 'Sonstige'];
  const CORRECTION_KINDS = ['Fehlbewertung', 'Quelle falsch interpretiert', 'Faktenlage geändert', 'Zuordnung falsch'];
  const CORRECTION_STATUS = ['Gemeldet', 'In Prüfung', 'Bestätigt', 'Verworfen', 'Umgesetzt'];
  const DEFAULT_CONFIG = {
    schemaVersion: 1,
    namespace: 'XX',
    publicTopics: { minVideos: 2, minClaimsPerVideo: 2, relevances: ['Schwerpunkt', 'Behandelt'] },
    recommendations: { minDecidedFacts: 3, maxErrorShare: 0.25 },
    review: { maxAgeDays: 365 },
    corrections: { maxClaimsWithoutApproval: 3, lockMaxAgeDays: 7 },
    /* Weitere Wissensdatenbanken (andere Projekte, zentrale oder themenspezifische Repos) im selben Format. */
    knowledgeSources: []
  };
  const NAMESPACE = /^[A-Z][A-Z0-9]{1,5}$/;
  const SOURCE_TYPES = ['Projekt', 'Zentral', 'Thematisch'];

  const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
  const CLAIM_ID = /^[A-Za-z0-9_-]{11}-A\d{4,}$/;
  const TOPIC_ID = /^[a-z0-9äöüß]+(?:-[a-z0-9äöüß]+)*(?:\/[a-z0-9äöüß]+(?:-[a-z0-9äöüß]+)*){0,2}$/;
  const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const text = x => typeof x === 'string' && x.trim().length > 0;
  const https = x => typeof x === 'string' && /^https:\/\/\S+$/.test(x);
  const isoDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(Date.parse(x));
  const secs = x => Number.isInteger(x) && x >= 0;
  const entryIdRe = ns => new RegExp('^' + ns + '-K\\d{4,}$');
  const ANY_ENTRY = /^([A-Z][A-Z0-9]{1,5})-K\d{4,}$/;
  const correctionIdRe = ns => new RegExp('^' + ns + '-C\\d{4,}$');

  function unknownKeys(obj, allowed, at, e) {
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) e.push(at + ': unbekanntes Feld „' + k + '“.');
  }
  function requireKeys(obj, keys, at, e) {
    for (const k of keys) if (!(k in obj)) e.push(at + ': Pflichtfeld „' + k + '“ fehlt.');
  }

  /* ---------------------------------------------------------------- Konfiguration */

  function config(raw) {
    const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (!isObj(raw)) return c;
    for (const k of Object.keys(c)) {
      if (!(k in raw)) continue;
      if (isObj(c[k]) && isObj(raw[k])) Object.assign(c[k], raw[k]);
      else c[k] = raw[k];
    }
    return c;
  }

  function validateConfig(raw) {
    const e = [];
    const at = 'wissen/konfiguration.json';
    if (!isObj(raw)) return [at + ': muss ein JSON-Objekt sein.'];
    unknownKeys(raw, Object.keys(DEFAULT_CONFIG), at, e);
    if (raw.schemaVersion !== 1) e.push(at + ': schemaVersion muss 1 sein.');
    if (typeof raw.namespace !== 'string' || !NAMESPACE.test(raw.namespace)) e.push(at + ': namespace muss aus 2–6 Großbuchstaben/Ziffern bestehen und mit einem Buchstaben beginnen.');
    if ('knowledgeSources' in raw) {
      if (!Array.isArray(raw.knowledgeSources)) e.push(at + ': knowledgeSources muss eine Liste sein.');
      else {
        const seen = new Set([raw.namespace]);
        raw.knowledgeSources.forEach((k, i) => {
          const kat = at + ' knowledgeSources[' + i + ']';
          if (!isObj(k)) { e.push(kat + ': muss ein Objekt sein.'); return; }
          unknownKeys(k, ['namespace', 'name', 'type', 'repo', 'topics'], kat, e);
          if (typeof k.namespace !== 'string' || !NAMESPACE.test(k.namespace)) e.push(kat + ': ungültiges namespace.');
          else if (seen.has(k.namespace)) e.push(kat + ': namespace ' + k.namespace + ' ist mehrfach vergeben.');
          seen.add(k.namespace);
          if (!text(k.name)) e.push(kat + ': name fehlt.');
          if (!SOURCE_TYPES.includes(k.type)) e.push(kat + ': type muss ' + SOURCE_TYPES.join(', ') + ' sein.');
          if (typeof k.repo !== 'string' || !REPO.test(k.repo)) e.push(kat + ': repo muss besitzer/name sein.');
          if (!Array.isArray(k.topics) || k.topics.some(t => typeof t !== 'string' || !TOPIC_ID.test(t))) e.push(kat + ': topics muss eine Liste von Themen-IDs sein (leer = alle Themen).');
        });
      }
    }
    const c = config(raw);
    const p = c.publicTopics;
    if (!Number.isInteger(p.minVideos) || p.minVideos < 1) e.push(at + ': publicTopics.minVideos muss eine ganze Zahl ≥ 1 sein.');
    if (!Number.isInteger(p.minClaimsPerVideo) || p.minClaimsPerVideo < 1) e.push(at + ': publicTopics.minClaimsPerVideo muss eine ganze Zahl ≥ 1 sein.');
    if (!Array.isArray(p.relevances) || !p.relevances.length || p.relevances.some(r => !RELEVANCE.includes(r))) e.push(at + ': publicTopics.relevances enthält unbekannte Relevanzstufen.');
    if (p.relevances && p.relevances.includes('Erwähnt')) e.push(at + ': eine bloße Erwähnung darf nicht für öffentliche Themen zählen.');
    const r = c.recommendations;
    if (!Number.isInteger(r.minDecidedFacts) || r.minDecidedFacts < 1) e.push(at + ': recommendations.minDecidedFacts muss ≥ 1 sein.');
    if (typeof r.maxErrorShare !== 'number' || r.maxErrorShare <= 0 || r.maxErrorShare > 1) e.push(at + ': recommendations.maxErrorShare muss zwischen 0 und 1 liegen.');
    if (!Number.isInteger(c.review.maxAgeDays) || c.review.maxAgeDays < 1) e.push(at + ': review.maxAgeDays muss ≥ 1 sein.');
    if (!Number.isInteger(c.corrections.maxClaimsWithoutApproval) || c.corrections.maxClaimsWithoutApproval < 0) e.push(at + ': corrections.maxClaimsWithoutApproval muss ≥ 0 sein.');
    if (!Number.isInteger(c.corrections.lockMaxAgeDays) || c.corrections.lockMaxAgeDays < 1) e.push(at + ': corrections.lockMaxAgeDays muss ≥ 1 sein.');
    return e;
  }

  /* ---------------------------------------------------------------- Themen */

  function normName(s) {
    return String(s || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function validateTopics(data) {
    const e = [];
    const at = 'wissen/themen.json';
    if (!isObj(data)) return [at + ': muss ein JSON-Objekt sein.'];
    unknownKeys(data, ['schemaVersion', 'topics'], at, e);
    if (data.schemaVersion !== 1) e.push(at + ': schemaVersion muss 1 sein.');
    if (!Array.isArray(data.topics)) return e.concat(at + ': topics muss eine Liste sein.');
    const ids = new Map();
    for (const t of data.topics) if (isObj(t) && typeof t.id === 'string') {
      if (ids.has(t.id)) e.push(at + ': Thema ' + t.id + ' doppelt.');
      ids.set(t.id, t);
    }
    const names = new Map();
    data.topics.forEach((t, i) => {
      const tat = at + ' Thema ' + (isObj(t) && t.id ? t.id : '#' + (i + 1));
      if (!isObj(t)) { e.push(tat + ': muss ein Objekt sein.'); return; }
      const keys = ['id', 'name', 'level', 'parent', 'aliases', 'description', 'visibility', 'mergedInto', 'history'];
      unknownKeys(t, keys, tat, e);
      requireKeys(t, keys, tat, e);
      if (typeof t.id !== 'string' || !TOPIC_ID.test(t.id)) e.push(tat + ': ID muss aus kleingeschriebenen Wortteilen mit „/“ als Ebenentrenner bestehen (höchstens drei Ebenen).');
      if (!text(t.name)) e.push(tat + ': Name fehlt.');
      if (!LEVELS.includes(t.level)) e.push(tat + ': level muss ' + LEVELS.join(', ') + ' sein.');
      if (!VISIBILITY.includes(t.visibility)) e.push(tat + ': visibility muss ' + VISIBILITY.join(', ') + ' sein.');
      if (!Array.isArray(t.aliases) || t.aliases.some(a => !text(a))) e.push(tat + ': aliases muss eine Liste von Texten sein.');
      if (!(t.description === null || text(t.description))) e.push(tat + ': description muss Text oder null sein.');
      if (!Array.isArray(t.history)) e.push(tat + ': history muss eine Liste sein.');
      else validateHistory(t.history, tat, e, false);
      const depth = typeof t.id === 'string' ? t.id.split('/').length : 0;
      const expectedLevel = LEVELS[depth - 1];
      if (expectedLevel && t.level !== expectedLevel) e.push(tat + ': Ebene „' + t.level + '“ passt nicht zur ID (erwartet ' + expectedLevel + ').');
      if (t.level === 'Hauptthema') {
        if (t.parent !== null) e.push(tat + ': Hauptthemen haben kein übergeordnetes Thema.');
        if (text(t.name) && t.name.trim().split(/\s+/).length > 3) e.push(tat + ': Hauptthemen brauchen einen kurzen Namen (höchstens drei Wörter, möglichst eines).');
      } else if (typeof t.id === 'string') {
        const parentId = t.id.split('/').slice(0, -1).join('/');
        if (t.parent !== parentId) e.push(tat + ': parent muss ' + parentId + ' sein.');
        else if (!ids.has(parentId)) e.push(tat + ': übergeordnetes Thema ' + parentId + ' fehlt.');
      }
      if (t.mergedInto !== null) {
        if (!ids.has(t.mergedInto)) e.push(tat + ': mergedInto verweist auf unbekanntes Thema ' + t.mergedInto + '.');
        else if (ids.get(t.mergedInto).mergedInto !== null) e.push(tat + ': mergedInto muss direkt auf ein aktives Thema zeigen.');
        if (t.mergedInto === t.id) e.push(tat + ': kann nicht in sich selbst zusammengeführt sein.');
        if (Array.isArray(t.history) && !t.history.length) e.push(tat + ': Zusammenführung braucht einen Eintrag in history.');
      }
      if (t.mergedInto === null && text(t.name)) {
        // Doppelungen innerhalb derselben Ebene unter demselben Elternthema vermeiden.
        const scope = (t.parent || '') + '|';
        for (const n of [t.name].concat(Array.isArray(t.aliases) ? t.aliases : [])) {
          const key = scope + normName(n);
          if (names.has(key) && names.get(key) !== t.id) e.push(tat + ': Name oder Alias „' + n + '“ ist schon bei ' + names.get(key) + ' vergeben (Themen zusammenführen).');
          else names.set(key, t.id);
        }
      }
    });
    return e;
  }

  function topicIndex(topicsData) {
    const byId = new Map();
    for (const t of (topicsData && topicsData.topics) || []) byId.set(t.id, t);
    return byId;
  }

  /* Zusammengeführte Themen auf ihr aktives Ziel abbilden. */
  function resolveTopic(byId, id) {
    let t = byId.get(id);
    let guard = 0;
    while (t && t.mergedInto && guard++ < 10) t = byId.get(t.mergedInto);
    return t ? t.id : null;
  }

  /* Ein Thema und alle Vorfahren (atomkraft/kosten → atomkraft/kosten, atomkraft). */
  function withAncestors(id) {
    const parts = id.split('/');
    const out = [];
    for (let i = parts.length; i > 0; i--) out.push(parts.slice(0, i).join('/'));
    return out;
  }

  function validateHistory(list, at, e, needRevision) {
    list.forEach((h, i) => {
      const hat = at + ' history[' + i + ']';
      if (!isObj(h)) { e.push(hat + ': muss ein Objekt sein.'); return; }
      const keys = needRevision ? ['revision', 'date', 'agent', 'change', 'previous'] : ['date', 'agent', 'change'];
      unknownKeys(h, keys, hat, e);
      requireKeys(h, keys, hat, e);
      if (!isoDate(h.date)) e.push(hat + ': date muss JJJJ-MM-TT sein.');
      if (!text(h.agent)) e.push(hat + ': agent fehlt (wer hat geändert?).');
      if (!text(h.change)) e.push(hat + ': change fehlt.');
      if (needRevision && h.revision !== i + 1) e.push(hat + ': revision muss ' + (i + 1) + ' sein (lückenlose Historie).');
    });
  }

  /* ---------------------------------------------------------------- Themen eines Videos */

  /*
   * faktenchecks/<ID>/themen.json prüfen.
   * facts: aussagen.json desselben Videos (oder null), byId: Themenindex.
   */
  function validateVideoTopics(data, dirId, facts, byId, cfg) {
    const e = [];
    const at = 'themen.json' + (dirId ? ' (' + dirId + ')' : '');
    const c = config(cfg);
    if (!isObj(data)) return [at + ': muss ein JSON-Objekt sein.'];
    unknownKeys(data, ['schemaVersion', 'videoId', 'basis', 'topics', 'claims', 'history'], at, e);
    if (data.schemaVersion !== 1) e.push(at + ': schemaVersion muss 1 sein.');
    if (!VIDEO_ID.test(String(data.videoId)) || (dirId && data.videoId !== dirId)) e.push(at + ': videoId passt nicht zum Verzeichnis.');
    if (!text(data.basis)) e.push(at + ': basis muss die tatsächliche Inhaltsgrundlage der Zuordnung nennen.');
    else if (/^\s*(nur\s+)?(video)?titel\b/i.test(data.basis)) e.push(at + ': Zuordnung darf nicht nur auf dem Titel beruhen.');
    if (!Array.isArray(data.topics)) e.push(at + ': topics muss eine Liste sein.');
    if (!Array.isArray(data.claims)) e.push(at + ': claims muss eine Liste sein.');
    if (!Array.isArray(data.history) || !data.history.length) e.push(at + ': history braucht mindestens einen Eintrag.');
    else validateHistory(data.history, at, e, false);
    if (e.length) return e;
    const claims = new Map(((facts && facts.claims) || []).map(x => [x.id, x]));
    const duration = facts && facts.scope ? facts.scope.durationSeconds : null;
    const known = id => byId.has(id);
    const seenClaims = new Set();
    const claimCount = new Map();
    data.claims.forEach((a, i) => {
      const cat = at + ' claims[' + i + ']';
      if (!isObj(a)) { e.push(cat + ': muss ein Objekt sein.'); return; }
      unknownKeys(a, ['claimId', 'topics'], cat, e);
      if (typeof a.claimId !== 'string' || !a.claimId.startsWith(data.videoId + '-')) e.push(cat + ': claimId muss zu diesem Video gehören.');
      else if (facts && !claims.has(a.claimId)) e.push(cat + ': Aussage ' + a.claimId + ' gibt es in aussagen.json nicht.');
      if (seenClaims.has(a.claimId)) e.push(cat + ': Aussage ' + a.claimId + ' ist doppelt aufgeführt.');
      seenClaims.add(a.claimId);
      if (!Array.isArray(a.topics) || !a.topics.length) { e.push(cat + ': topics darf nicht leer sein.'); return; }
      if (new Set(a.topics).size !== a.topics.length) e.push(cat + ': Thema doppelt.');
      for (const t of a.topics) {
        if (!known(t)) e.push(cat + ': unbekanntes Thema ' + t + '.');
        else if (byId.get(t).mergedInto) e.push(cat + ': Thema ' + t + ' ist zusammengeführt in ' + byId.get(t).mergedInto + '; bitte das Ziel verwenden.');
        for (const anc of withAncestors(t)) claimCount.set(anc, (claimCount.get(anc) || 0) + 1);
      }
    });
    const seenTopics = new Set();
    data.topics.forEach((t, i) => {
      const tat = at + ' topics[' + i + ']';
      if (!isObj(t)) { e.push(tat + ': muss ein Objekt sein.'); return; }
      unknownKeys(t, ['topic', 'relevance', 'basis', 'segments'], tat, e);
      requireKeys(t, ['topic', 'relevance', 'basis', 'segments'], tat, e);
      if (!known(t.topic)) e.push(tat + ': unbekanntes Thema ' + t.topic + '.');
      else if (byId.get(t.topic).mergedInto) e.push(tat + ': Thema ' + t.topic + ' ist zusammengeführt; bitte das Ziel verwenden.');
      if (seenTopics.has(t.topic)) e.push(tat + ': Thema doppelt.');
      seenTopics.add(t.topic);
      if (!RELEVANCE.includes(t.relevance)) e.push(tat + ': relevance muss ' + RELEVANCE.join(', ') + ' sein.');
      if (!text(t.basis)) e.push(tat + ': basis fehlt.');
      if (!Array.isArray(t.segments)) { e.push(tat + ': segments muss eine Liste sein.'); return; }
      if (t.relevance !== 'Erwähnt' && !claimCount.get(t.topic) && !t.segments.length) e.push(tat + ': „' + t.relevance + '“ braucht zugeordnete Aussagen oder Abschnitte aus dem Videoinhalt.');
      t.segments.forEach((s, j) => {
        const sat = tat + ' segments[' + j + ']';
        if (!isObj(s)) { e.push(sat + ': muss ein Objekt sein.'); return; }
        unknownKeys(s, ['startSeconds', 'endSeconds', 'note'], sat, e);
        if (!secs(s.startSeconds) || !secs(s.endSeconds) || s.endSeconds <= s.startSeconds) e.push(sat + ': ungültiger Zeitbereich.');
        else if (Number.isInteger(duration) && s.endSeconds > duration) e.push(sat + ': Abschnitt endet nach dem Video.');
        if (!text(s.note)) e.push(sat + ': note fehlt (was wird in diesem Abschnitt erklärt?).');
      });
    });
    // Jede Aussagenzuordnung muss sich in der Themenliste des Videos wiederfinden (Hauptthema genügt).
    for (const a of data.claims) for (const t of (a.topics || [])) {
      if (!withAncestors(t).some(x => seenTopics.has(x))) e.push(at + ': Thema ' + t + ' (Aussage ' + a.claimId + ') fehlt in topics des Videos.');
    }
    return e;
  }

  /* ---------------------------------------------------------------- Wissenseinträge */

  function normUrl(u) {
    try {
      const x = new URL(u);
      x.hash = '';
      for (const k of [...x.searchParams.keys()]) if (/^utm_|^fbclid$|^gclid$/.test(k)) x.searchParams.delete(k);
      return (x.host.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '') + (x.search || '')).toLowerCase();
    } catch (_) { return String(u || '').toLowerCase(); }
  }

  /* Unabhängige Originalquellen: gleiche URL = eine Quelle, eigene Seiten zählen nie. */
  function independentSources(sources, ownHosts) {
    const own = (ownHosts || []).map(h => h.toLowerCase());
    const seen = new Set();
    for (const s of sources || []) {
      if (!s || !https(s.url)) continue;
      const key = normUrl(s.url);
      if (own.some(h => key.startsWith(h))) continue;
      seen.add(key);
    }
    return seen.size;
  }

  const OWN_HOSTS = ['4m3projects.github.io', 'github.com/4m3projects'];

  /*
   * Einen Wissenseintrag prüfen.
   * ctx: { config, topics (Index), claims (Map Aussage-ID → Aussage, nur lokale), entries (Map ID → Eintrag),
   *        fileName (erwarteter Dateiname ohne .json) }
   */
  function validateEntry(entry, ctx) {
    const e = [];
    const c = config(ctx.config);
    const at = 'Wissenseintrag ' + (isObj(entry) && entry.id ? entry.id : (ctx.fileName || '?'));
    if (!isObj(entry)) return [at + ': muss ein JSON-Objekt sein.'];
    const keys = ['schemaVersion', 'id', 'revision', 'claim', 'topics', 'status', 'verdict', 'reason', 'validity', 'checkedOn', 'sources', 'dependsOn', 'supersededBy', 'links', 'lock', 'history'];
    unknownKeys(entry, keys, at, e);
    requireKeys(entry, keys, at, e);
    if (entry.schemaVersion !== 1) e.push(at + ': schemaVersion muss 1 sein.');
    if (typeof entry.id !== 'string' || !entryIdRe(c.namespace).test(entry.id)) {
      // Fremde Einträge (anderes Kürzel) dürfen nicht in diesem Repo liegen.
      e.push(at + ': ID muss ' + c.namespace + '-K0001 usw. sein.');
    }
    if (ctx.fileName && entry.id !== ctx.fileName) e.push(at + ': Dateiname muss ' + entry.id + '.json sein.');
    if (!text(entry.claim)) e.push(at + ': claim (die geprüfte Behauptung) fehlt.');
    if (!ENTRY_STATUS.includes(entry.status)) e.push(at + ': status muss ' + ENTRY_STATUS.join(', ') + ' sein.');
    if (!(entry.verdict === null || VERDICTS.includes(entry.verdict))) e.push(at + ': verdict muss eine der sechs Kategorien oder null sein.');
    if (entry.status === 'Geprüft' && entry.verdict === null) e.push(at + ': geprüfte Einträge brauchen ein Urteil.');
    if (entry.status === 'Entwurf' && entry.verdict !== null) e.push(at + ': Entwürfe haben noch kein Urteil (verdict null).');
    if (!text(entry.reason)) e.push(at + ': reason (Begründung) fehlt.');
    if (!isoDate(entry.checkedOn)) e.push(at + ': checkedOn muss JJJJ-MM-TT sein.');
    // Themen
    if (!Array.isArray(entry.topics) || !entry.topics.length) e.push(at + ': mindestens ein Thema nötig.');
    else for (const t of entry.topics) {
      if (!ctx.topics || !ctx.topics.has(t)) e.push(at + ': unbekanntes Thema ' + t + '.');
      else if (ctx.topics.get(t).mergedInto) e.push(at + ': Thema ' + t + ' ist zusammengeführt; bitte das Ziel verwenden.');
    }
    // Gültigkeitsbereich
    if (!isObj(entry.validity)) e.push(at + ': validity fehlt.');
    else {
      unknownKeys(entry.validity, ['asOf', 'timeScope', 'subjectScope', 'validUntil'], at + ' validity', e);
      if (!isoDate(entry.validity.asOf)) e.push(at + ': validity.asOf muss JJJJ-MM-TT sein.');
      if (!text(entry.validity.timeScope)) e.push(at + ': validity.timeScope (zeitlicher Gültigkeitsbereich) fehlt.');
      if (!text(entry.validity.subjectScope)) e.push(at + ': validity.subjectScope (sachlicher Gültigkeitsbereich) fehlt.');
      if (!(entry.validity.validUntil === null || isoDate(entry.validity.validUntil))) e.push(at + ': validity.validUntil muss Datum oder null sein.');
    }
    // Quellen
    const sourceIds = new Set();
    if (!Array.isArray(entry.sources)) e.push(at + ': sources muss eine Liste sein.');
    else entry.sources.forEach((s, i) => {
      const sat = at + ' sources[' + i + ']';
      if (!isObj(s)) { e.push(sat + ': muss ein Objekt sein.'); return; }
      unknownKeys(s, ['id', 'title', 'url', 'details', 'accessedOn', 'kind'], sat, e);
      if (!text(s.id) || sourceIds.has(s.id)) e.push(sat + ': id fehlt oder doppelt.');
      sourceIds.add(s.id);
      if (!text(s.title)) e.push(sat + ': title fehlt.');
      if (!https(s.url)) e.push(sat + ': url muss ein direkter https-Link sein.');
      else if (OWN_HOSTS.some(h => normUrl(s.url).startsWith(h))) e.push(sat + ': eigene Faktenchecks sind keine Originalquelle (stattdessen links/dependsOn verwenden).');
      if (!text(s.details)) e.push(sat + ': details (Herausgeber, Datenstand) fehlt.');
      if (!isoDate(s.accessedOn)) e.push(sat + ': accessedOn muss JJJJ-MM-TT sein.');
      if (!SOURCE_KINDS.includes(s.kind)) e.push(sat + ': kind muss ' + SOURCE_KINDS.join(', ') + ' sein.');
    });
    if (entry.status === 'Geprüft' && entry.verdict !== 'Meinung / Prognose' && independentSources(entry.sources, OWN_HOSTS) === 0) {
      e.push(at + ': ein geprüfter Eintrag braucht mindestens eine externe Originalquelle; frühere KI-Bewertungen sind kein Beleg.');
    }
    // Abhängigkeiten und Ablösung
    if (!Array.isArray(entry.dependsOn)) e.push(at + ': dependsOn muss eine Liste sein.');
    else for (const d of entry.dependsOn) {
      const m = ANY_ENTRY.exec(String(d));
      if (d === entry.id) e.push(at + ': hängt von sich selbst ab.');
      else if (!m) e.push(at + ': dependsOn enthält keine Eintrags-ID: ' + d + '.');
      else if (m[1] === c.namespace) { if (ctx.entries && !ctx.entries.has(d)) e.push(at + ': dependsOn verweist auf unbekannten Eintrag ' + d + '.'); }
      else if (!c.knowledgeSources.some(k => k.namespace === m[1])) e.push(at + ': dependsOn ' + d + ' gehört zu keiner eingetragenen Wissensdatenbank (knowledgeSources).');
    }
    if (entry.status === 'Abgelöst') {
      const sb = ANY_ENTRY.exec(String(entry.supersededBy));
      const foreignOk = sb && sb[1] !== c.namespace && c.knowledgeSources.some(k => k.namespace === sb[1]);
      if (!(typeof entry.supersededBy === 'string' && (foreignOk || (ctx.entries && ctx.entries.has(entry.supersededBy))))) e.push(at + ': abgelöste Einträge brauchen supersededBy mit vorhandenem Nachfolger.');
      if (!(isObj(entry.validity) && isoDate(entry.validity.validUntil))) e.push(at + ': abgelöste Einträge brauchen validity.validUntil (bis wann die Aussage galt).');
    } else if (entry.supersededBy !== null) e.push(at + ': supersededBy nur bei status Abgelöst.');
    // Verknüpfungen
    const linked = new Set();
    if (!Array.isArray(entry.links)) e.push(at + ': links muss eine Liste sein.');
    else entry.links.forEach((l, i) => {
      const lat = at + ' links[' + i + ']';
      if (!isObj(l)) { e.push(lat + ': muss ein Objekt sein.'); return; }
      const lk = ['claimId', 'repo', 'relation', 'contextNote', 'linkedBy', 'linkedOn'];
      unknownKeys(l, lk, lat, e);
      requireKeys(l, lk, lat, e);
      if (typeof l.claimId !== 'string' || !CLAIM_ID.test(l.claimId)) e.push(lat + ': claimId muss eine Aussage-ID wie VIDEOID0001-A0001 sein.');
      if (!(l.repo === null || (typeof l.repo === 'string' && REPO.test(l.repo)))) e.push(lat + ': repo muss null (dieses Repo) oder besitzer/name sein.');
      if (l.repo === null && ctx.claims && !ctx.claims.has(l.claimId)) e.push(lat + ': Aussage ' + l.claimId + ' gibt es hier nicht.');
      if (!(l.relation in LINK_RELATIONS)) e.push(lat + ': relation muss ' + Object.keys(LINK_RELATIONS).join(', ') + ' sein.');
      if (!text(l.contextNote) || l.contextNote.trim().length < 15) e.push(lat + ': contextNote muss begründen, warum Kontext, Zeitbezug und Geltungsbereich passen (ähnliche Begriffe genügen nicht).');
      if (!text(l.linkedBy)) e.push(lat + ': linkedBy fehlt.');
      if (!isoDate(l.linkedOn)) e.push(lat + ': linkedOn muss JJJJ-MM-TT sein.');
      const key = (l.repo || '') + '|' + l.claimId;
      if (linked.has(key)) e.push(lat + ': Aussage doppelt verknüpft.');
      linked.add(key);
    });
    // Sperre
    if (entry.lock !== null) {
      if (!isObj(entry.lock)) e.push(at + ': lock muss null oder Objekt sein.');
      else {
        unknownKeys(entry.lock, ['agent', 'since', 'ref'], at + ' lock', e);
        if (!text(entry.lock.agent) || !isoDate(entry.lock.since) || !text(entry.lock.ref)) e.push(at + ': lock braucht agent, since (Datum) und ref (Issue/PR).');
      }
    }
    // Versionierung
    if (!Number.isInteger(entry.revision) || entry.revision < 1) e.push(at + ': revision muss ≥ 1 sein.');
    if (!Array.isArray(entry.history) || !entry.history.length) e.push(at + ': history braucht mindestens einen Eintrag.');
    else {
      validateHistory(entry.history, at, e, true);
      if (entry.history.length !== entry.revision) e.push(at + ': revision (' + entry.revision + ') muss der Anzahl der Historieneinträge (' + entry.history.length + ') entsprechen.');
      entry.history.forEach((h, i) => {
        if (i === 0) { if (isObj(h) && h.previous !== null) e.push(at + ': erster Historieneintrag hat previous null.'); return; }
        if (!isObj(h) || !isObj(h.previous) || !('verdict' in h.previous) || !('reason' in h.previous)) e.push(at + ' history[' + i + ']: previous muss den vorigen Stand (verdict, reason) erhalten – nichts spurlos überschreiben.');
      });
    }
    return e;
  }

  /*
   * Änderung eines Eintrags gegenüber dem vorigen Stand prüfen (Schutz vor Überschreiben).
   * before: Eintrag im Zielzweig (main), after: neuer Stand.
   */
  function validateEntryChange(before, after) {
    const e = [];
    if (!before) return e;
    const at = 'Wissenseintrag ' + after.id;
    if (after.id !== before.id) e.push(at + ': ID darf sich nicht ändern.');
    const changed = JSON.stringify(Object.assign({}, before, { lock: null })) !== JSON.stringify(Object.assign({}, after, { lock: null }));
    if (!changed) return e;
    if (after.revision !== before.revision + 1) e.push(at + ': Revision muss genau von ' + before.revision + ' auf ' + (before.revision + 1) + ' steigen (paralleler Bearbeitungsstand?).');
    if (JSON.stringify(after.history.slice(0, before.history.length)) !== JSON.stringify(before.history)) e.push(at + ': bisherige Historie darf nicht verändert werden.');
    const last = after.history[after.history.length - 1];
    if ((before.verdict !== after.verdict || before.reason !== after.reason) && last && isObj(last.previous)) {
      if (last.previous.verdict !== before.verdict || last.previous.reason !== before.reason) e.push(at + ': previous im neuen Historieneintrag muss Urteil und Begründung des vorigen Stands enthalten.');
    }
    return e;
  }

  /* ---------------------------------------------------------------- Korrekturvorgänge */

  function validateCorrection(corr, ctx) {
    const e = [];
    const c = config(ctx.config);
    const at = 'Korrektur ' + (isObj(corr) && corr.id ? corr.id : (ctx.fileName || '?'));
    if (!isObj(corr)) return [at + ': muss ein JSON-Objekt sein.'];
    const keys = ['schemaVersion', 'id', 'kind', 'status', 'reportedOn', 'reportedBy', 'trigger', 'evidence', 'affected', 'decision', 'changes', 'history'];
    unknownKeys(corr, keys, at, e);
    requireKeys(corr, keys, at, e);
    if (corr.schemaVersion !== 1) e.push(at + ': schemaVersion muss 1 sein.');
    if (typeof corr.id !== 'string' || !correctionIdRe(c.namespace).test(corr.id)) e.push(at + ': ID muss ' + c.namespace + '-C0001 usw. sein.');
    if (ctx.fileName && corr.id !== ctx.fileName) e.push(at + ': Dateiname muss ' + corr.id + '.json sein.');
    if (!CORRECTION_KINDS.includes(corr.kind)) e.push(at + ': kind muss ' + CORRECTION_KINDS.join(', ') + ' sein.');
    if (!CORRECTION_STATUS.includes(corr.status)) e.push(at + ': status muss ' + CORRECTION_STATUS.join(', ') + ' sein.');
    if (!isoDate(corr.reportedOn)) e.push(at + ': reportedOn muss JJJJ-MM-TT sein.');
    if (!text(corr.reportedBy)) e.push(at + ': reportedBy fehlt.');
    if (!isObj(corr.trigger) || !text(corr.trigger.description)) e.push(at + ': trigger.description fehlt.');
    else unknownKeys(corr.trigger, ['claimId', 'entryId', 'description'], at + ' trigger', e);
    if (!Array.isArray(corr.evidence)) e.push(at + ': evidence muss eine Liste sein.');
    else corr.evidence.forEach((v, i) => {
      const vat = at + ' evidence[' + i + ']';
      if (!isObj(v)) { e.push(vat + ': muss ein Objekt sein.'); return; }
      unknownKeys(v, ['title', 'url', 'accessedOn', 'finding'], vat, e);
      if (!text(v.title) || !https(v.url) || !isoDate(v.accessedOn) || !text(v.finding)) e.push(vat + ': title, https-url, accessedOn und finding sind Pflicht.');
    });
    if (!Array.isArray(corr.affected)) e.push(at + ': affected muss eine Liste sein.');
    else corr.affected.forEach((a, i) => {
      if (!isObj(a) || !text(a.target) || !text(a.reason)) e.push(at + ' affected[' + i + ']: target und reason sind Pflicht.');
      else unknownKeys(a, ['target', 'reason'], at + ' affected[' + i + ']', e);
    });
    if (!Array.isArray(corr.history) || !corr.history.length) e.push(at + ': history braucht mindestens einen Eintrag.');
    else validateHistory(corr.history, at, e, false);
    if (!Array.isArray(corr.changes)) { e.push(at + ': changes muss eine Liste sein.'); return e; }
    corr.changes.forEach((ch, i) => {
      const cat = at + ' changes[' + i + ']';
      if (!isObj(ch)) { e.push(cat + ': muss ein Objekt sein.'); return; }
      unknownKeys(ch, ['target', 'field', 'before', 'after'], cat, e);
      requireKeys(ch, ['target', 'field', 'before', 'after'], cat, e);
      if (!text(ch.target) || !text(ch.field)) e.push(cat + ': target und field sind Pflicht.');
      if (JSON.stringify(ch.before) === JSON.stringify(ch.after)) e.push(cat + ': before und after sind gleich.');
    });

    // Entscheidungs- und Freigaberegeln
    const decided = ['Bestätigt', 'Verworfen', 'Umgesetzt'].includes(corr.status);
    if (decided) {
      if (!isObj(corr.decision)) e.push(at + ': Status ' + corr.status + ' braucht eine dokumentierte Entscheidung (decision).');
      else {
        unknownKeys(corr.decision, ['by', 'date', 'basis'], at + ' decision', e);
        if (!text(corr.decision.by) || !isoDate(corr.decision.date) || !text(corr.decision.basis)) e.push(at + ': decision braucht by, date und basis.');
      }
    } else if (corr.decision !== null) e.push(at + ': decision erst ab Status Bestätigt/Verworfen.');
    if (['Bestätigt', 'Umgesetzt'].includes(corr.status) && Array.isArray(corr.evidence) && corr.evidence.filter(v => isObj(v) && https(v.url) && !OWN_HOSTS.some(h => normUrl(v.url).startsWith(h))).length === 0) {
      e.push(at + ': eine Bestätigung braucht geprüfte externe Originalquellen; ein Widerspruch zwischen zwei KI-Ergebnissen genügt nicht.');
    }
    if (corr.status !== 'Umgesetzt' && corr.changes.length) e.push(at + ': changes erst bei Status Umgesetzt eintragen.');
    if (corr.status === 'Umgesetzt' && !corr.changes.length) e.push(at + ': Umgesetzt ohne dokumentierte Änderungen.');
    const verdictChangesOnClaims = corr.changes.filter(ch => isObj(ch) && CLAIM_ID.test(String(ch.target)) && ch.field === 'verdict');
    if (corr.kind === 'Faktenlage geändert' && verdictChangesOnClaims.length) {
      e.push(at + ': bei geänderter Faktenlage bleiben frühere Videoaussagen für ihren Zeitpunkt bewertet; stattdessen Eintrag ablösen (validUntil, supersededBy).');
    }
    if (needsHumanApproval(corr, c) && isObj(corr.decision) && /^Regel:/.test(String(corr.decision.by)) && corr.status !== 'Verworfen') {
      e.push(at + ': diese Korrektur betrifft viele Aussagen oder ändert ein Urteil eines Wissenseintrags und braucht eine menschliche Freigabe (decision.by = Name).');
    }
    // Umgesetzte Urteilsänderungen müssen im aktuellen Datenstand sichtbar sein (keine nur behauptete Korrektur).
    if (corr.status === 'Umgesetzt') for (const ch of corr.changes) {
      if (!isObj(ch)) continue;
      const current = ctx.claims && ctx.claims.get(ch.target) || ctx.entries && ctx.entries.get(ch.target);
      if (current && ch.field in current && JSON.stringify(current[ch.field]) !== JSON.stringify(ch.after)) {
        // Spätere Korrekturen dürfen denselben Wert erneut ändern; dann muss es eine jüngere Korrektur geben.
        if (!(ctx.laterChanges && ctx.laterChanges(corr.id, ch.target, ch.field))) e.push(at + ': ' + ch.target + '.' + ch.field + ' steht nicht auf dem umgesetzten Wert.');
      }
    }
    return e;
  }

  function needsHumanApproval(corr, cfg) {
    const c = config(cfg);
    const claimTargets = new Set([].concat(corr.affected || [], corr.changes || []).filter(isObj).map(x => x.target).filter(t => CLAIM_ID.test(String(t))));
    if (claimTargets.size > c.corrections.maxClaimsWithoutApproval) return true;
    if ((corr.changes || []).some(ch => isObj(ch) && !CLAIM_ID.test(String(ch.target)) && ch.field === 'verdict')) return true;
    return false;
  }

  /* ---------------------------------------------------------------- Gesamtbestand */

  /*
   * Alle Wissensdaten gemeinsam prüfen.
   * bundle: { config, topics, entries: [..], corrections: [..], videos: [{ id, facts, topics }] }
   */
  function validateAll(bundle) {
    const e = [];
    const cfg = config(bundle.config);
    if (bundle.config) e.push(...validateConfig(bundle.config));
    e.push(...validateTopics(bundle.topics || { schemaVersion: 1, topics: [] }));
    const byId = topicIndex(bundle.topics);
    const claims = claimMap(bundle.videos);
    const entries = new Map((bundle.entries || []).filter(isObj).map(x => [x.id, x]));
    if (entries.size !== (bundle.entries || []).length) e.push('Wissenseinträge: doppelte IDs.');
    for (const v of bundle.videos || []) if (v.topics) e.push(...validateVideoTopics(v.topics, v.id, v.facts || null, byId, cfg));
    for (const x of bundle.entries || []) e.push(...validateEntry(x, { config: cfg, topics: byId, claims, entries, fileName: x && x.__file }));
    e.push(...dependencyCycles(entries));
    const corrs = (bundle.corrections || []).slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const laterChanges = (id, target, field) => corrs.some(o => o.id > id && o.status === 'Umgesetzt' && (o.changes || []).some(ch => ch.target === target && ch.field === field));
    for (const x of corrs) e.push(...validateCorrection(x, { config: cfg, claims, entries, fileName: x && x.__file, laterChanges }));
    return e;
  }

  function dependencyCycles(entries) {
    const e = [];
    const state = new Map();
    const visit = (id, path) => {
      if (state.get(id) === 2) return;
      if (state.get(id) === 1) { e.push('Wissenseinträge: Kreisabhängigkeit ' + path.concat(id).join(' → ') + '.'); return; }
      state.set(id, 1);
      for (const d of ((entries.get(id) || {}).dependsOn || [])) if (entries.has(d)) visit(d, path.concat(id));
      state.set(id, 2);
    };
    for (const id of entries.keys()) visit(id, []);
    return e;
  }

  function claimMap(videos) {
    const m = new Map();
    for (const v of videos || []) for (const c of ((v.facts && v.facts.claims) || [])) m.set(c.id, c);
    return m;
  }

  /* ---------------------------------------------------------------- Öffentliche Themen */

  /*
   * Welche Themen erscheinen öffentlich? Ein Thema zählt in einem Video, wenn es dort als
   * Schwerpunkt/Behandelt geführt ist UND genug Aussagen (inkl. Unterthemen) zugeordnet sind.
   * Rückgabe: Map Thema-ID → { topic, videos: [IDs], public, reason }.
   */
  function topicStats(topicsData, videos, cfg) {
    const c = config(cfg);
    const byId = topicIndex(topicsData);
    const res = new Map();
    for (const t of byId.values()) if (!t.mergedInto) res.set(t.id, { topic: t, videos: [], mentionedIn: [], claims: 0, public: false, reason: '' });
    for (const v of videos || []) {
      if (!v.topics) continue;
      const count = new Map();
      for (const a of v.topics.claims || []) {
        const seen = new Set();
        for (const raw of a.topics) {
          const t = resolveTopic(byId, raw);
          if (!t) continue;
          for (const anc of withAncestors(t)) if (!seen.has(anc)) { seen.add(anc); count.set(anc, (count.get(anc) || 0) + 1); }
        }
      }
      const relevant = new Set();
      for (const vt of v.topics.topics || []) {
        const t = resolveTopic(byId, vt.topic);
        if (!t) continue;
        if (c.publicTopics.relevances.includes(vt.relevance) && (count.get(t) || 0) >= c.publicTopics.minClaimsPerVideo) {
          for (const anc of withAncestors(t)) relevant.add(anc);
        } else if (res.has(t)) res.get(t).mentionedIn.push(v.id);
      }
      // Unterthemen ohne eigene Videozeile gelten als relevant, wenn genug Aussagen zugeordnet sind
      // und das übergeordnete Thema relevant ist.
      for (const [t, n] of count) if (n >= c.publicTopics.minClaimsPerVideo && relevant.has(t.split('/')[0])) relevant.add(t);
      for (const t of relevant) if (res.has(t)) res.get(t).videos.push(v.id);
      for (const [t, n] of count) if (res.has(t)) res.get(t).claims += n;
    }
    for (const r of res.values()) {
      const vis = r.topic.visibility;
      if (vis === 'freigegeben') { r.public = true; r.reason = 'Manuell freigegeben.'; }
      else if (vis === 'intern') { r.public = false; r.reason = 'Manuell nicht öffentlich.'; }
      else if (r.videos.length >= c.publicTopics.minVideos) { r.public = true; r.reason = 'In ' + r.videos.length + ' Videos ausreichend behandelt (Mindestwert ' + c.publicTopics.minVideos + ').'; }
      else { r.public = false; r.reason = 'Erst in ' + r.videos.length + ' von mindestens ' + c.publicTopics.minVideos + ' Videos ausreichend behandelt.'; }
      // Unterthemen nur öffentlich, wenn das Hauptthema öffentlich ist.
    }
    for (const r of res.values()) {
      if (r.topic.parent && r.public) {
        const root = res.get(r.topic.id.split('/')[0]);
        if (root && !root.public) { r.public = false; r.reason = 'Hauptthema ist (noch) nicht öffentlich.'; }
      }
    }
    return res;
  }

  /* ---------------------------------------------------------------- Themenseite */

  function bucket(verdict) {
    if (verdict === 'Belegt') return 'belegt';
    if (verdict === 'Teilweise belegt') return 'teilweise';
    if (ERROR_VERDICTS.includes(verdict)) return 'falsch';
    if (verdict === 'Nicht ausreichend belegbar') return 'unbelegt';
    return null;
  }

  /*
   * Inhalte einer Themenseite berechnen.
   * Rückgabe: { topic, sections: { belegt, teilweise, falsch, unbelegt }, recommendations }
   * Jeder Abschnitt enthält Einträge ({ type: 'entry', entry, claims, videos, recurring }) und
   * einzelne Aussagen ohne Eintrag ({ type: 'claim', claim, videoId }).
   * Aussagen, die über „gleichwertig“ an einem Eintrag hängen, erscheinen nur beim Eintrag.
   */
  function topicPage(topicId, bundle) {
    const cfg = config(bundle.config);
    const byId = topicIndex(bundle.topics);
    const id = resolveTopic(byId, topicId);
    if (!id) return null;
    const inTopic = t => { const r = resolveTopic(byId, t); return !!r && withAncestors(r).includes(id); };
    const claims = claimMap(bundle.videos);
    const sections = { belegt: [], teilweise: [], falsch: [], unbelegt: [] };
    const covered = new Set();
    for (const en of bundle.entries || []) {
      if (en.status !== 'Geprüft' || !en.topics.some(inTopic)) continue;
      const b = bucket(en.verdict);
      const eq = en.links.filter(l => l.relation === 'gleichwertig');
      for (const l of eq) if (!l.repo) covered.add(l.claimId);
      const videos = [...new Set(eq.map(l => l.claimId.slice(0, 11)))];
      if (!b) continue;
      sections[b].push({ type: 'entry', entry: en, claims: eq.map(l => ({ link: l, claim: l.repo ? null : claims.get(l.claimId) || null })), videos, recurring: videos.length >= 2 });
    }
    for (const v of bundle.videos || []) {
      if (!v.topics) continue;
      for (const a of v.topics.claims || []) {
        if (!a.topics.some(inTopic) || covered.has(a.claimId)) continue;
        const c = claims.get(a.claimId);
        if (!c || c.status !== 'Abgeschlossen' || c.kind !== 'Tatsachenbehauptung') continue;
        const b = bucket(c.verdict);
        if (b) sections[b].push({ type: 'claim', claim: c, videoId: v.id });
      }
    }
    return { topic: byId.get(id), sections, recommendations: recommendations(id, bundle, cfg) };
  }

  /*
   * Videoempfehlungen für ein Thema. Nur Aussagen dieses Themas zählen, nie die Gesamtquote des Videos,
   * nie Person, Kanal oder politische Position.
   */
  function recommendations(topicId, bundle, cfg) {
    const c = config(cfg || bundle.config);
    const byId = topicIndex(bundle.topics);
    const id = resolveTopic(byId, topicId);
    const inTopic = t => { const r = resolveTopic(byId, t); return !!r && withAncestors(r).includes(id); };
    const out = [];
    for (const v of bundle.videos || []) {
      if (!v.topics || !v.facts) continue;
      const claims = new Map(v.facts.claims.map(x => [x.id, x]));
      const mine = (v.topics.claims || []).filter(a => a.topics.some(inTopic)).map(a => claims.get(a.claimId)).filter(Boolean);
      const decided = mine.filter(x => x.status === 'Abgeschlossen' && x.kind === 'Tatsachenbehauptung' && DECIDED.includes(x.verdict));
      if (decided.length < c.recommendations.minDecidedFacts) continue;
      const errors = decided.filter(x => ERROR_VERDICTS.includes(x.verdict)).length;
      const share = errors / decided.length;
      if (share >= c.recommendations.maxErrorShare) continue;
      const supported = decided.filter(x => x.verdict === 'Belegt').length;
      const srcIds = new Set();
      for (const x of decided) for (const r of x.sourceRefs || []) srcIds.add(r.sourceId);
      const segs = [];
      // Abschnitte des Themas, seiner Unterthemen oder des übergeordneten Themas (dort steht das Unterthema meist mit).
      for (const vt of v.topics.topics || []) {
        const r = resolveTopic(byId, vt.topic);
        if (r && (inTopic(r) || withAncestors(id).includes(r))) for (const s of vt.segments) segs.push(Object.assign({ topic: r }, s));
      }
      segs.sort((a, b) => a.startSeconds - b.startSeconds);
      out.push({
        videoId: v.id,
        decided: decided.length,
        supported,
        partly: decided.filter(x => x.verdict === 'Teilweise belegt').length,
        errors,
        errorShare: share,
        sources: srcIds.size,
        segments: segs,
        reason: decided.length + ' entschiedene Tatsachenbehauptungen zu diesem Thema, davon ' + supported + ' belegt und ' + errors + ' widerlegt oder irreführend; ' + srcIds.size + ' verschiedene Quellen.'
      });
    }
    out.sort((a, b) => b.supported - a.supported || b.sources - a.sources || a.errorShare - b.errorShare || a.videoId.localeCompare(b.videoId));
    return out;
  }

  /* ---------------------------------------------------------------- Ähnlichkeitssuche */

  const STOP = new Set(('der die das den dem des ein eine einer einem einen eines und oder aber auch als am an auf aus bei bis da dass daß damit dann denn doch durch es für hat haben hatte ich ihr im in ist ja kann man mit nach nicht noch nur ob schon sei seien sein sich sie sind so über um und uns vom von vor war waren was weil wenn werde werden wie wir wird wurde wurden zu zum zur sehr mehr viel viele immer etwa rund gibt gab geben laut soll sollen würde würden habe hätte hätten diese dieser dieses diesem diesen jeder jede jedes alle allen').split(' '));

  function stem(w) {
    // Sehr einfache deutsche Endungskürzung; genügt für Kandidatensuche, nicht für Gleichsetzung.
    for (const suf of ['ungen', 'ung', 'heiten', 'heit', 'keiten', 'keit', 'lich', 'ische', 'ischen', 'isch', 'ern', 'en', 'er', 'es', 'e', 'n', 's']) {
      if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, -suf.length);
    }
    return w;
  }

  function tokens(s) {
    const out = [];
    const norm = String(s || '').toLowerCase().normalize('NFKC').replace(/(\d)[.\s](?=\d{3}\b)/g, '$1').replace(/(\d),(\d)/g, '$1.$2');
    for (const raw of norm.split(/[^\p{L}\p{N}.%]+/u)) {
      const w = raw.replace(/^\.+|\.+$/g, '');
      if (!w || STOP.has(w)) continue;
      if (/\d/.test(w)) { out.push('#' + w.replace(/%$/, '')); continue; }
      if (w.length < 3) continue;
      out.push(stem(w.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')));
    }
    return out;
  }

  function similarity(a, b) {
    const A = new Set(Array.isArray(a) ? a : tokens(a));
    const B = new Set(Array.isArray(b) ? b : tokens(b));
    if (!A.size || !B.size) return 0;
    let inter = 0, nums = 0, numMatch = 0;
    for (const t of A) {
      if (t[0] === '#') { nums++; if (B.has(t)) numMatch++; }
      if (B.has(t)) inter++;
    }
    const jac = inter / (A.size + B.size - inter);
    // Ungleiche Zahlen deuten auf eine andere Behauptung hin (z. B. 10 % gegenüber 30 %).
    const bNums = [...B].filter(t => t[0] === '#').length;
    const numPenalty = nums && bNums && !numMatch ? 0.5 : 1;
    return Math.round(jac * numPenalty * 1000) / 1000;
  }

  /*
   * Gezielte Suche in Einträgen und Aussagen. items: [{ kind, id, text, ... }]. Nur Kandidaten.
   */
  function search(query, items, opts) {
    const o = Object.assign({ limit: 10, min: 0.12 }, opts);
    const q = tokens(query);
    const res = [];
    for (const it of items) {
      const s = similarity(q, it.tokens || tokens(it.text));
      if (s >= o.min) res.push(Object.assign({ score: s }, it, { tokens: undefined }));
    }
    res.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
    return res.slice(0, o.limit);
  }

  /* Suchbestand aus Einträgen und Aussagen bilden. */
  function searchItems(bundle, repoLabel) {
    const items = [];
    for (const en of bundle.entries || []) items.push({ kind: 'Eintrag', id: en.id, repo: repoLabel || null, text: en.claim + ' ' + en.topics.join(' '), verdict: en.verdict, status: en.status, checkedOn: en.checkedOn });
    for (const v of bundle.videos || []) for (const c of ((v.facts && v.facts.claims) || [])) {
      items.push({ kind: 'Aussage', id: c.id, repo: repoLabel || null, text: c.description, verdict: c.verdict, status: c.status });
    }
    return items;
  }

  /* Kandidaten für mehrfach vorkommende Behauptungen (für neue Einträge): Paare aus verschiedenen Videos. */
  function duplicateCandidates(bundle, opts) {
    const o = Object.assign({ min: 0.45, limit: 50 }, opts);
    const list = [];
    for (const v of bundle.videos || []) for (const c of ((v.facts && v.facts.claims) || [])) {
      if (c.kind === 'Tatsachenbehauptung') list.push({ id: c.id, videoId: v.id, tokens: tokens(c.description), text: c.description, verdict: c.verdict });
    }
    // Invertierter Index: nur Paare mit gemeinsamen Wörtern vergleichen (skaliert auf Tausende Aussagen).
    const inv = new Map();
    list.forEach((x, i) => { for (const t of new Set(x.tokens)) { if (!inv.has(t)) inv.set(t, []); inv.get(t).push(i); } });
    const out = [];
    const seen = new Set();
    list.forEach((x, i) => {
      const cand = new Set();
      for (const t of new Set(x.tokens)) { const l = inv.get(t); if (l.length <= 200) for (const j of l) if (j > i) cand.add(j); }
      for (const j of cand) {
        const y = list[j];
        if (y.videoId === x.videoId) continue;
        const s = similarity(x.tokens, y.tokens);
        const key = x.id + '|' + y.id;
        if (s >= o.min && !seen.has(key)) { seen.add(key); out.push({ score: s, a: x.id, b: y.id, aText: x.text, bText: y.text, aVerdict: x.verdict, bVerdict: y.verdict }); }
      }
    });
    out.sort((p, q) => q.score - p.score);
    return out.slice(0, o.limit);
  }

  /* ---------------------------------------------------------------- Betroffenheit (Korrekturweitergabe) */

  /*
   * Wer ist von einem Fehler betroffen? query: { sourceUrl } | { entryId } | { claimId }.
   * Findet gezielt: Aussagen mit derselben Quelle, verknüpfte Aussagen, Einträge mit derselben Quelle,
   * Einträge, die (auch indirekt) über dependsOn auf einem betroffenen Eintrag aufbauen, sowie die
   * davon abhängigen Videos und Themen. Keine Neuanalyse unbeteiligter Videos.
   */
  function impact(query, bundle) {
    const claims = [];
    const entries = new Map();
    const reasons = new Map();
    const addClaim = (id, why) => { if (!reasons.has(id)) { reasons.set(id, why); claims.push(id); } };
    const addEntry = (en, why) => { if (!entries.has(en.id)) entries.set(en.id, { entry: en, reason: why }); };
    const all = bundle.entries || [];
    const facts = new Map();
    for (const v of bundle.videos || []) if (v.facts) facts.set(v.id, v.facts);
    const claimsOfEntry = en => {
      for (const l of en.links) if (!l.repo) addClaim(l.claimId, 'Verknüpft mit ' + en.id + ' (' + l.relation + ')');
    };

    if (query.sourceUrl) {
      const key = normUrl(query.sourceUrl);
      for (const [vid, f] of facts) {
        const ids = new Set((f.sources || []).filter(s => normUrl(s.url) === key).map(s => s.id));
        if (!ids.size) continue;
        for (const c of f.claims) if ((c.sourceRefs || []).some(r => ids.has(r.sourceId))) addClaim(c.id, 'Nutzt dieselbe Quelle (' + [...ids].join(', ') + ' in ' + vid + ')');
      }
      for (const en of all) if (en.sources.some(s => normUrl(s.url) === key)) addEntry(en, 'Nutzt dieselbe Quelle');
    }
    if (query.claimId) {
      addClaim(query.claimId, 'Ausgangspunkt');
      for (const en of all) if (en.links.some(l => !l.repo && l.claimId === query.claimId)) addEntry(en, 'Mit der Aussage verknüpft');
      // Aussagen mit identischer Quellenbasis sind Kandidaten für denselben Lesefehler.
      const vid = query.claimId.slice(0, 11);
      const f = facts.get(vid);
      const c = f && f.claims.find(x => x.id === query.claimId);
      if (c) for (const r of c.sourceRefs || []) {
        const s = f.sources.find(x => x.id === r.sourceId);
        if (s) for (const x of impact({ sourceUrl: s.url }, bundle).claims) addClaim(x.id, 'Nutzt dieselbe Quelle wie ' + query.claimId);
      }
    }
    if (query.entryId) {
      const en = all.find(x => x.id === query.entryId);
      if (en) addEntry(en, 'Ausgangspunkt');
    }
    // Abhängige Einträge transitiv
    let grew = true;
    while (grew) {
      grew = false;
      for (const en of all) {
        if (entries.has(en.id)) continue;
        const dep = en.dependsOn.find(d => entries.has(d));
        if (dep) { addEntry(en, 'Baut auf ' + dep + ' auf'); grew = true; }
      }
    }
    for (const { entry } of entries.values()) claimsOfEntry(entry);
    const videos = [...new Set(claims.map(id => id.slice(0, 11)))].sort();
    const byId = topicIndex(bundle.topics);
    const topics = new Set();
    for (const v of bundle.videos || []) if (v.topics) for (const a of v.topics.claims) if (reasons.has(a.claimId)) for (const t of a.topics) { const r = resolveTopic(byId, t); if (r) withAncestors(r).forEach(x => topics.add(x)); }
    for (const { entry } of entries.values()) for (const t of entry.topics) { const r = resolveTopic(byId, t); if (r) withAncestors(r).forEach(x => topics.add(x)); }
    return {
      claims: claims.map(id => ({ id, reason: reasons.get(id) })),
      entries: [...entries.values()].map(x => ({ id: x.entry.id, reason: x.reason })),
      videos,
      topics: [...topics].sort(),
      derived: videos.length ? ['Statistik und Berichte der Videos (Build-Factcheck)', 'Faktenampel (berechnet)', 'Themenseiten und Empfehlungen (berechnet)'] : []
    };
  }

  /* ---------------------------------------------------------------- Konsistenz (Fehlererkennung) */

  function daysBetween(a, b) { return Math.floor((Date.parse(b) - Date.parse(a)) / 86400000); }

  /*
   * Hinweise für einen Prüfauftrag, keine automatische Änderung:
   *  - Abweichung: gleichwertige Aussage hat anderes Urteil als der Eintrag
   *  - Gegensatz: als „widerspricht“ verknüpfte Aussage hat dasselbe Urteil wie der Eintrag (bei Belegt/Widerlegt)
   *  - Veraltet: Eintrag älter als review.maxAgeDays oder validUntil überschritten, aber nicht abgelöst
   *  - Sperre: lock älter als lockMaxAgeDays
   *  - Offene Korrektur betrifft Eintrag
   */
  function consistency(bundle, today) {
    const c = config(bundle.config);
    const now = today || new Date().toISOString().slice(0, 10);
    const claims = claimMap(bundle.videos);
    const out = [];
    for (const en of bundle.entries || []) {
      if (en.status === 'Geprüft') for (const l of en.links) {
        if (l.repo) continue;
        const cl = claims.get(l.claimId);
        if (!cl || cl.status !== 'Abgeschlossen') continue;
        if (l.relation === 'gleichwertig' && cl.verdict !== en.verdict) out.push({ type: 'Abweichung', entryId: en.id, claimId: l.claimId, text: en.id + ' ist „' + en.verdict + '“, die gleichwertige Aussage ' + l.claimId + ' ist „' + cl.verdict + '“. Originalquellen beider Prüfungen vergleichen; keine automatische Angleichung.' });
        if (l.relation === 'widerspricht' && ['Belegt', 'Widerlegt'].includes(en.verdict) && cl.verdict === en.verdict) out.push({ type: 'Gegensatz', entryId: en.id, claimId: l.claimId, text: en.id + ' und die widersprechende Aussage ' + l.claimId + ' sind beide „' + en.verdict + '“.' });
      }
      if (en.status === 'Geprüft' || en.status === 'Entwurf') {
        if (en.validity && en.validity.validUntil && en.validity.validUntil < now) out.push({ type: 'Veraltet', entryId: en.id, text: en.id + ' galt bis ' + en.validity.validUntil + ', ist aber nicht abgelöst.' });
        else if (daysBetween(en.checkedOn, now) > c.review.maxAgeDays) out.push({ type: 'Veraltet', entryId: en.id, text: en.id + ' wurde zuletzt am ' + en.checkedOn + ' geprüft (älter als ' + c.review.maxAgeDays + ' Tage). Aktualität prüfen.' });
      }
      if (en.lock && daysBetween(en.lock.since, now) > c.corrections.lockMaxAgeDays) out.push({ type: 'Sperre', entryId: en.id, text: en.id + ' ist seit ' + en.lock.since + ' von ' + en.lock.agent + ' gesperrt (' + en.lock.ref + '). Nachfragen oder Sperre lösen.' });
    }
    for (const corr of bundle.corrections || []) {
      if (['Gemeldet', 'In Prüfung', 'Bestätigt'].includes(corr.status)) out.push({ type: 'Offene Korrektur', correctionId: corr.id, text: corr.id + ' (' + corr.kind + ') ist ' + corr.status + ': ' + corr.trigger.description });
    }
    return out;
  }

  /* Welche weiteren Wissensdatenbanken sind für ein Thema zuständig? (leere topics = alle Themen) */
  function knowledgeSourcesFor(cfg, topicId) {
    const c = config(cfg);
    return c.knowledgeSources.filter(k => !topicId || !k.topics.length || k.topics.some(t => withAncestors(topicId).includes(t) || withAncestors(t).includes(topicId)));
  }

  /* ---------------------------------------------------------------- Öffentliches Verzeichnis */

  /*
   * Kompaktes Verzeichnis für die Webseite (daten/wissen.json): nur Aussagen mit Themen, nur die
   * Felder, die die Themenseiten brauchen. So muss die Seite nicht alle Videos laden.
   */
  function exportIndex(bundle) {
    const cfg = config(bundle.config);
    const stats = topicStats(bundle.topics, bundle.videos, cfg);
    const videos = [];
    for (const v of bundle.videos || []) {
      if (!v.topics || !v.facts) continue;
      const claims = new Map(v.facts.claims.map(x => [x.id, x]));
      const sources = new Map((v.facts.sources || []).map(s => [s.id, s]));
      videos.push({
        id: v.id,
        topics: v.topics.topics,
        claims: v.topics.claims.map(a => {
          const c = claims.get(a.claimId);
          if (!c) return null;
          const occ = (c.occurrences || [])[0];
          return {
            id: c.id, topics: a.topics, kind: c.kind, status: c.status, verdict: c.verdict, description: c.description, reason: c.reason,
            startSeconds: occ ? occ.startSeconds : null,
            sources: (c.sourceRefs || []).map(r => sources.get(r.sourceId)).filter(Boolean).map(s => ({ title: s.title, url: s.url }))
          };
        }).filter(Boolean)
      });
    }
    return {
      schemaVersion: 1,
      config: cfg,
      topics: (bundle.topics && bundle.topics.topics) || [],
      topicStats: [...stats.values()].map(s => ({ id: s.topic.id, videos: s.videos, claims: s.claims, public: s.public, reason: s.reason })),
      entries: bundle.entries || [],
      videos
    };
  }

  return {
    VERDICTS, DECIDED, ERROR_VERDICTS, LEVELS, VISIBILITY, RELEVANCE, ENTRY_STATUS, LINK_RELATIONS, SOURCE_KINDS,
    CORRECTION_KINDS, CORRECTION_STATUS, DEFAULT_CONFIG, SOURCE_TYPES, knowledgeSourcesFor,
    config, validateConfig, validateTopics, validateVideoTopics, validateEntry, validateEntryChange, validateCorrection,
    validateAll, needsHumanApproval, topicIndex, resolveTopic, withAncestors, topicStats, topicPage, recommendations,
    tokens, similarity, search, searchItems, duplicateCandidates, normUrl, independentSources, impact, consistency, exportIndex
  };
});
