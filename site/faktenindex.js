/*
 * Politik4M3 Faktencheck – gemeinsamer Faktenindex für alle Faktencheck-Seiten.
 *
 * DIESE DATEI IST IN ALLEN DREI REPOSITORIES BYTEGLEICH:
 *   4m3projects/politik4m3Facktencheck (maßgeblich), politik4m3FaktencheckUngeskriptet, politik4m3FaktencheckKlima.
 * Änderungen immer zuerst im Hauptprojekt und dann unverändert in die Schwesterprojekte übernehmen; deren CI
 * vergleicht die Datei mit der Fassung im Hauptprojekt. Regeln in Worten: docs/FAKTENINDEX.md.
 *
 * Reine Logik ohne DOM-Zugriff: im Browser als window.FactIndex, unter Node per require().
 * Der Index wird nie gespeichert, sondern bei jeder Anzeige aus strukturiert/aussagen.json berechnet. Damit
 * ändern sich Videokarten, Videoseite, Themenseiten, Methodik und Verlauf automatisch, sobald eine Aussage neu
 * bewertet, ergänzt, zusammengeführt oder ihr Bedeutungsfaktor geändert wird; widersprüchliche Stände gibt es nicht.
 *
 * Formel je Video (Aussage i mit Anteilen p, f, u, p + f + u = 1, und Bedeutungsfaktor R):
 *   I = Σ(R·p) / Σ[R·(p + 5·f + u)]
 * Nur abgeschlossen bewertete Tatsachenbehauptungen gehen ein. Meinungen/Prognosen, noch nicht geprüfte, laufende
 * und nicht überprüfbare Aussagen zählen nicht (ungeprüft ist nicht falsch und nicht ungeklärt).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FactIndex = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const deepFreeze = o => { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); };

  /* Zentrale Konfiguration. Schwellen und Mindestabdeckung gelten für alle Seiten gleich. */
  const CONFIG = deepFreeze({
    version: '1.1',
    since: '2026-11-20',
    refutedFactor: 5,                  // widerlegter Anteil zählt fünffach (bis 20.11.2026: 10)
    decimals: 3,                       // Anzeige und Ampelvergleich auf drei Nachkommastellen
    thresholds: { green: 0.8, yellow: 0.4 },   // Grün ab 0,800; Gelb ab 0,400; darunter Rot
    /* Bewertbarkeit (sonst graue Ampel). minCoverage ist ein vorläufiger, bewusst vorsichtiger Standard,
       bis genug Daten für eine Kalibrierung vorliegen (docs/FAKTENINDEX.md, „Mindestabdeckung“). */
    minCoverage: 0.8,
    minCoverageProvisional: true,
    minIndexed: 10,                    // so viele Aussagen müssen mindestens in den Index eingehen
    minFactsPerHour: 20,               // erfasste Tatsachenbehauptungen je Stunde (Schutz vor gezielter Kleinauswahl)
    fullCapture: { short: { minIndexed: 3 }, musikvideo: { minIndexed: 3 } },   // Vollerhebung kurzer Formate
    /* Abbildung der bestehenden Bewertungskategorien auf belegt (p), widerlegt (f), ungeklärt (u). */
    shares: {
      'Belegt': { p: 1, f: 0, u: 0 },
      'Teilweise belegt': { p: 0.5, f: 0, u: 0.5 },
      'Irreführend / Kontext fehlt': { p: 0.5, f: 0.5, u: 0 },
      'Widerlegt': { p: 0, f: 1, u: 0 },
      'Nicht ausreichend belegbar': { p: 0, f: 0, u: 1 }
    },
    /* Nur bei Mischkategorien dürfen begründete eigene Anteile die Standardabbildung ersetzen. */
    adjustableShares: ['Teilweise belegt', 'Irreführend / Kontext fehlt'],
    shareStep: 0.05,
    /* Bedeutungsfaktor R: Standard 1,0; Abweichungen nur mit Begründung; Zwischenwerte in Viertelschritten. */
    weight: { default: 1, min: 0.5, max: 3, step: 0.25 },
    weightScale: [
      { value: 0.5, label: 'Nebensächliche Aussage' },
      { value: 1, label: 'Normale Aussage' },
      { value: 1.5, label: 'Erhöhte Bedeutung' },
      { value: 2, label: 'Hohe Bedeutung' },
      { value: 3, label: 'Sehr hohe Bedeutung' }
    ],
    weightStatuses: ['Vorläufig', 'Gegengeprüft', 'Strittig'],
    reviewResults: ['Bestätigt', 'Abweichend'],
    /* Vorkommen, mit denen sich das Video eine Aussage nicht selbst zu eigen macht (wie in statistik.json). */
    foreignRoles: ['Rückfrage', 'Fremdbezug', 'Zurückweisung']
  });

  const LEVELS = deepFreeze({
    gruen: { name: 'Grün', label: 'Weitgehend belegte Faktenlage', text: 'Faktenindex ab 0,800 bei ausreichender Prüfabdeckung.' },
    gelb: { name: 'Gelb', label: 'Gemischte Faktenlage', text: 'Faktenindex von 0,400 bis unter 0,800 bei ausreichender Prüfabdeckung.' },
    rot: { name: 'Rot', label: 'Erhebliche Fehler in der Faktenlage', text: 'Faktenindex unter 0,400 bei ausreichender Prüfabdeckung.' },
    nicht_bewertbar: { name: 'Grau', label: 'Nicht bewertbar', text: 'Keine ausreichende Bewertungsgrundlage: zu wenige bewertete Tatsachenbehauptungen, zu geringe Prüfabdeckung oder nur eine kleine Auswahl aus einem langen Video.' },
    vorlaeufig: { name: 'Grau', label: 'Prüfung läuft', text: 'Die Prüfung läuft noch. Ein bereits berechneter Index ist vorläufig; die Ampel bleibt grau, bis die Prüfabdeckung reicht.' }
  });

  /* Klassen je Aussage: in den Index (indexed), nur in die Prüfabdeckung (pending) oder gar nicht (excluded). */
  const CLASSES = deepFreeze({
    belastbar: { label: 'Geprüft, belastbares Ergebnis', indexed: true, coverage: 'done' },
    ungeklaert: { label: 'Geprüft, Ergebnis ungeklärt', indexed: true, coverage: 'done' },
    ungeprueft: { label: 'Noch nicht geprüft', indexed: false, coverage: 'pending' },
    in_pruefung: { label: 'Prüfung begonnen', indexed: false, coverage: 'pending' },
    nicht_pruefbar: { label: 'Nicht überprüfbar', indexed: false, coverage: null },
    meinung: { label: 'Meinung, Prognose oder Werturteil', indexed: false, coverage: null },
    fremdbezug: { label: 'Nur erwähnt oder zurückgewiesen', indexed: false, coverage: null },
    duplikat: { label: 'Wiederholung einer anderen Aussage', indexed: false, coverage: null }
  });

  const round = (x, d = CONFIG.decimals) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
  const isNum = x => typeof x === 'number' && Number.isFinite(x);
  const onStep = (x, step) => Math.abs(x / step - Math.round(x / step)) < 1e-9;
  const fi = c => (c && c.factIndex && typeof c.factIndex === 'object' ? c.factIndex : null);

  /* Bedeutungsfaktor R einer Aussage (Standard 1,0, wenn nichts eingeschätzt ist). */
  function weightOf(c) {
    const w = fi(c)?.weight;
    return isNum(w) ? w : CONFIG.weight.default;
  }
  function weightLabel(w) {
    let best = CONFIG.weightScale[0];
    for (const s of CONFIG.weightScale) if (Math.abs(s.value - w) < Math.abs(best.value - w) || (Math.abs(s.value - w) === Math.abs(best.value - w) && s.value < w)) best = s;
    return best.label;
  }

  /* Hat sich das Video die Aussage selbst zu eigen gemacht? Ohne Fundstellen: ja (ältere Datenformen). */
  function ownStatement(c) {
    const occ = Array.isArray(c?.occurrences) ? c.occurrences : [];
    if (!occ.length) return true;
    return occ.some(o => !CONFIG.foreignRoles.includes(o.role) && o.roleStatus !== 'Ungeklärt');
  }

  function classify(c) {
    if (!c || c.kind !== 'Tatsachenbehauptung' || c.verdict === 'Meinung / Prognose') return 'meinung';
    if (!ownStatement(c)) return 'fremdbezug';
    if (fi(c)?.duplicateOf) return 'duplikat';
    if (c.status === 'Nicht überprüfbar') return 'nicht_pruefbar';
    if (c.status === 'In Bearbeitung') return 'in_pruefung';
    if (c.status !== 'Abgeschlossen' || !CONFIG.shares[c.verdict]) return 'ungeprueft';
    return c.verdict === 'Nicht ausreichend belegbar' ? 'ungeklaert' : 'belastbar';
  }

  /* Anteile p/f/u einer Aussage; eigene Anteile nur bei Mischkategorien (sonst Standardabbildung). */
  function sharesOf(c) {
    const cls = classify(c);
    if (!CLASSES[cls].indexed) return null;
    const own = fi(c)?.shares;
    if (own && CONFIG.adjustableShares.includes(c.verdict) && isNum(own.p) && isNum(own.f) && isNum(own.u)) return { p: own.p, f: own.f, u: own.u, own: true };
    return { ...CONFIG.shares[c.verdict], own: false };
  }

  /* Beitrag einer Aussage zu Zähler und Nenner, gewichtet und ungewichtet. */
  function contribution(c) {
    const s = sharesOf(c);
    if (!s) return null;
    const R = weightOf(c);
    const den1 = s.p + CONFIG.refutedFactor * s.f + s.u;
    return { id: c.id, R, p: s.p, f: s.f, u: s.u, ownShares: s.own, num: R * s.p, den: R * den1, num1: s.p, den1 };
  }

  /* Faktenindex und Prüfabdeckung einer Aussagenliste. Gibt nie einen Wert außerhalb von 0 bis 1 zurück. */
  function compute(claims) {
    const list = Array.isArray(claims) ? claims : [];
    const counts = Object.fromEntries(Object.keys(CLASSES).map(k => [k, 0]));
    const parts = [];
    let num = 0, den = 0, num1 = 0, den1 = 0;
    for (const c of list) {
      const cls = classify(c);
      counts[cls]++;
      const x = contribution(c);
      if (!x) continue;
      parts.push(x);
      num += x.num; den += x.den; num1 += x.num1; den1 += x.den1;
    }
    const clamp = x => Math.min(1, Math.max(0, x));
    const index = den > 0 ? clamp(num / den) : null;
    const unweighted = den1 > 0 ? clamp(num1 / den1) : null;
    const done = counts.belastbar + counts.ungeklaert;
    const pending = counts.ungeprueft + counts.in_pruefung;
    const coverage = done + pending > 0 ? done / (done + pending) : null;
    /* Erfasste Tatsachenbehauptungen (für die Erfassungsdichte je Stunde): auch nicht überprüfbare. */
    const facts = done + pending + counts.nicht_pruefbar;
    const weighted = parts.filter(x => x.R !== CONFIG.weight.default).length;
    return {
      index, indexRounded: round(index), unweighted, unweightedRounded: round(unweighted),
      difference: index == null ? null : round(round(index) - round(unweighted)),
      sums: { weightedNumerator: num, weightedDenominator: den, numerator: num1, denominator: den1 },
      coverage, counts, indexed: parts.length, done, pending, facts, weightedClaims: weighted, contributions: parts
    };
  }

  /* Wie stark verändert eine Aussage den Index? Wert ohne diese Aussage (für die Detailansicht). */
  function withoutClaim(claims, id) {
    return compute((claims || []).filter(c => c.id !== id)).index;
  }

  function levelFor(indexRounded) {
    if (indexRounded >= CONFIG.thresholds.green) return 'gruen';
    if (indexRounded >= CONFIG.thresholds.yellow) return 'gelb';
    return 'rot';
  }

  /* Prüfstand in Worten (unabhängig vom Index). */
  function reviewStatus(r, video) {
    const ws = video?.workStatus;
    if (ws === 'In Bearbeitung') return 'Prüfung läuft';
    if (ws === 'Abgeschlossen') return r.pending ? 'Prüfung abgeschlossen, einzelne Aussagen offen' : 'Prüfung abgeschlossen';
    if (ws === 'Teilbestand geprüft') return 'Teilbestand geprüft';
    return r.pending ? 'Prüfung läuft' : 'Erfasste Aussagen geprüft';
  }

  const fmt = x => (x == null ? '–' : x.toFixed(CONFIG.decimals).replace('.', ','));
  const pctText = x => (x == null ? '–' : Math.floor(x * 100 + 1e-9) + ' %');  // abgerundet: nie mehr Abdeckung zeigen als erreicht

  /*
   * Ampel eines Videos: ausschließlich aus dem berechneten Index und der Bewertbarkeit.
   * data: Inhalt von strukturiert/aussagen.json (oder null); video: video.json (oder null).
   */
  function rate(data, video) {
    const claims = data?.claims || null;
    const r = compute(claims || []);
    const minIndexed = CONFIG.fullCapture[video?.format]?.minIndexed ?? CONFIG.minIndexed;
    const hours = Number(data?.scope?.durationSeconds) > 0 ? Number(data.scope.durationSeconds) / 3600 : null;
    const base = { ...r, minIndexed, status: reviewStatus(r, video), config: CONFIG };
    const out = (key, reason) => ({ ...base, key, ...LEVELS[key], reason, reliable: key === 'gruen' || key === 'gelb' || key === 'rot' });
    const finished = video?.workStatus === 'Abgeschlossen';
    const waiting = r.pending > 0 && !finished;
    const rest = finished && r.pending ? ` Die Analyse ist abgeschlossen; ${r.pending} Aussagen bleiben als noch nicht geprüft vermerkt.` : '';

    if (!claims) return out('nicht_bewertbar', 'Für dieses Video liegen keine strukturierten Prüfdaten vor.');
    if (video?.workStatus === 'In Bearbeitung') return out('vorlaeufig', `Die Analyse läuft noch; ${r.done} von ${r.done + r.pending} relevanten Tatsachenbehauptungen sind geprüft.`);
    if (r.index == null) return out(waiting ? 'vorlaeufig' : 'nicht_bewertbar', waiting ? `Noch keine Tatsachenbehauptung fertig geprüft; ${r.pending} stehen aus.` : 'Keine bewertbaren Tatsachenbehauptungen (nur Meinungen, Prognosen oder nicht überprüfbare Aussagen).');
    if (r.indexed < minIndexed) {
      return out(waiting ? 'vorlaeufig' : 'nicht_bewertbar', `Erst ${r.indexed} Tatsachenbehauptungen gehen in den Index ein; nötig sind ${minIndexed !== CONFIG.minIndexed ? 'bei vollständig erfassten Kurzformaten ' : ''}mindestens ${minIndexed}.${rest}`);
    }
    if (r.coverage < CONFIG.minCoverage) {
      return out(waiting ? 'vorlaeufig' : 'nicht_bewertbar', `Prüfabdeckung ${pctText(r.coverage)}: ${r.done} von ${r.done + r.pending} relevanten Tatsachenbehauptungen geprüft; für eine Ampel nötig sind mindestens ${pctText(CONFIG.minCoverage)}.${rest}`);
    }
    if (hours && r.facts / hours < CONFIG.minFactsPerHour) {
      return out(waiting ? 'vorlaeufig' : 'nicht_bewertbar', `Nur ${r.facts} Tatsachenbehauptungen bei ${hours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Stunden Laufzeit erfasst – eine Auswahl, kein Querschnitt; nötig sind mindestens ${CONFIG.minFactsPerHour} je Stunde (${Math.ceil(hours * CONFIG.minFactsPerHour)}).${rest}`);
    }
    return out(levelFor(r.indexRounded), `Faktenindex ${fmt(r.indexRounded)} aus ${r.indexed} bewerteten Tatsachenbehauptungen; Prüfabdeckung ${pctText(r.coverage)}.${rest}`);
  }

  /* ---------- Prüfung der Felder je Aussage (factIndex), gemeinsam für alle Repositories ---------- */
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const txt = x => typeof x === 'string' && x.trim().length > 0;
  const KEYS = ['weight', 'weightReason', 'weightStatus', 'assessedBy', 'assessedOn', 'assessedBeforeVerdict', 'shares', 'sharesReason', 'duplicateOf', 'reviews', 'history'];

  function validateClaim(c, ids) {
    const e = [];
    const x = c?.factIndex;
    if (x === undefined) return e;
    const at = `${c.id}: factIndex`;
    if (!x || typeof x !== 'object' || Array.isArray(x)) return [`${at} muss ein Objekt sein.`];
    for (const k of Object.keys(x)) if (!KEYS.includes(k)) e.push(`${at}.${k} ist kein bekanntes Feld.`);
    const W = CONFIG.weight;
    if ('weight' in x) {
      if (!isNum(x.weight) || x.weight < W.min || x.weight > W.max || !onStep(x.weight, W.step)) e.push(`${at}.weight muss zwischen ${W.min} und ${W.max} in Schritten von ${W.step} liegen.`);
      if (!txt(x.weightReason) && x.weight !== W.default) e.push(`${at}: Ein Bedeutungsfaktor ungleich ${W.default} braucht eine Begründung (weightReason).`);
      if (!CONFIG.weightStatuses.includes(x.weightStatus)) e.push(`${at}.weightStatus muss ${CONFIG.weightStatuses.join(', ')} sein.`);
      if (!txt(x.assessedBy)) e.push(`${at}.assessedBy (einschätzender Agent) fehlt.`);
      if (!ISO.test(x.assessedOn || '')) e.push(`${at}.assessedOn muss ein Datum JJJJ-MM-TT sein.`);
      if (typeof x.assessedBeforeVerdict !== 'boolean') e.push(`${at}.assessedBeforeVerdict muss true oder false sein.`);
    } else {
      for (const k of ['weightReason', 'weightStatus', 'assessedBy', 'assessedOn', 'assessedBeforeVerdict']) if (k in x) e.push(`${at}.${k} nur zusammen mit weight.`);
    }
    if ('shares' in x) {
      const s = x.shares;
      if (!CONFIG.adjustableShares.includes(c.verdict)) e.push(`${at}.shares nur bei ${CONFIG.adjustableShares.join(' oder ')}.`);
      else if (!s || !['p', 'f', 'u'].every(k => isNum(s[k]) && s[k] >= 0 && s[k] <= 1 && onStep(s[k], CONFIG.shareStep)) || Object.keys(s).length !== 3) e.push(`${at}.shares braucht p, f und u zwischen 0 und 1 in Schritten von ${CONFIG.shareStep}.`);
      else {
        if (Math.abs(s.p + s.f + s.u - 1) > 1e-9) e.push(`${at}.shares: p + f + u muss 1 ergeben.`);
        if (c.verdict === 'Teilweise belegt' && (s.p <= 0 || s.p >= 1)) e.push(`${at}.shares: „Teilweise belegt“ braucht einen belegten Anteil über 0 und unter 1.`);
        if (c.verdict === 'Irreführend / Kontext fehlt' && s.f <= 0) e.push(`${at}.shares: „Irreführend / Kontext fehlt“ braucht einen widerlegten Anteil über 0.`);
      }
      if (!txt(x.sharesReason)) e.push(`${at}.sharesReason (Begründung der Anteile) fehlt.`);
    } else if ('sharesReason' in x) e.push(`${at}.sharesReason nur zusammen mit shares.`);
    if ('duplicateOf' in x) {
      if (!txt(x.duplicateOf) || x.duplicateOf === c.id) e.push(`${at}.duplicateOf muss auf eine andere Aussage zeigen.`);
      else if (ids && !ids.has(x.duplicateOf)) e.push(`${at}.duplicateOf verweist auf unbekannte Aussage ${x.duplicateOf}.`);
    }
    if ('reviews' in x) {
      if (!Array.isArray(x.reviews)) e.push(`${at}.reviews muss eine Liste sein.`);
      else x.reviews.forEach((r, i) => {
        const ra = `${at}.reviews[${i}]`;
        if (!txt(r?.agent) || !ISO.test(r?.date || '') || !CONFIG.reviewResults.includes(r?.result) || !txt(r?.reason)) e.push(`${ra} braucht agent, date, result (${CONFIG.reviewResults.join('/')}) und reason.`);
        if (r?.result === 'Abweichend' && !(isNum(r.proposedWeight) && r.proposedWeight >= W.min && r.proposedWeight <= W.max && onStep(r.proposedWeight, W.step))) e.push(`${ra}: Abweichende Einschätzung braucht proposedWeight.`);
        if (txt(r?.agent) && r.agent === x.assessedBy) e.push(`${ra}: Kontrolle muss von einem anderen Agenten stammen als die Einschätzung.`);
      });
      if ('weight' in x && x.weightStatus === 'Gegengeprüft' && (!Array.isArray(x.reviews) || !x.reviews.some(r => r?.result === 'Bestätigt'))) e.push(`${at}: „Gegengeprüft“ braucht mindestens eine bestätigende Kontrolle.`);
      if ('weight' in x && x.weightStatus === 'Gegengeprüft' && Array.isArray(x.reviews) && x.reviews.some(r => r?.result === 'Abweichend') && !x.reviews.some(r => r?.result === 'Bestätigt' && r.date >= Math.max(...x.reviews.filter(y => y?.result === 'Abweichend').map(y => y.date)))) e.push(`${at}: Nach einer abweichenden Kontrolle ist der Faktor strittig, bis eine spätere Kontrolle ihn bestätigt.`);
    } else if ('weight' in x && x.weightStatus === 'Gegengeprüft') e.push(`${at}: „Gegengeprüft“ braucht mindestens eine bestätigende Kontrolle.`);
    if ('history' in x) {
      if (!Array.isArray(x.history)) e.push(`${at}.history muss eine Liste sein.`);
      else x.history.forEach((h, i) => {
        if (!ISO.test(h?.date || '') || !txt(h?.agent) || !txt(h?.field) || !txt(h?.reason) || !('previous' in (h || {})) || !('next' in (h || {}))) e.push(`${at}.history[${i}] braucht date, agent, field, previous, next und reason.`);
      });
    }
    return e;
  }

  function validateData(data) {
    const claims = data?.claims || [];
    const ids = new Set(claims.map(c => c.id));
    const errors = claims.flatMap(c => validateClaim(c, ids));
    const byId = new Map(claims.map(c => [c.id, c]));
    for (const c of claims) {
      const d = fi(c)?.duplicateOf;
      if (d && fi(byId.get(d))?.duplicateOf) errors.push(`${c.id}: duplicateOf muss auf die zusammengeführte Hauptaussage zeigen, nicht auf eine weitere Wiederholung.`);
    }
    return errors;
  }

  return { CONFIG, LEVELS, CLASSES, classify, sharesOf, weightOf, weightLabel, contribution, compute, withoutClaim, levelFor, reviewStatus, rate, validateClaim, validateData, format: fmt, percent: pctText, round };
});
