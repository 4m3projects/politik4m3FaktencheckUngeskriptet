/*
 * Politik4M3 Faktencheck – Zeitsynchronisierung zwischen Videoposition und Aussagen.
 * Eigener Code ohne Fremdbibliotheken. Reine Logik ohne DOM- oder YouTube-Zugriff,
 * damit sie im Browser (window.FactSync) und unter Node (require) getestet werden kann.
 *
 * Grundsatz: Es werden keine Zeiten erfunden. Die Fundstellen kommen unverändert aus
 * aussagen.json (startSeconds/endSeconds/precision). Ungefähre Zeitmarken erhalten nur
 * für die Anzeige „in der Nähe“ einen Toleranzbereich; die Daten selbst bleiben unberührt.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FactSync = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Toleranz in Sekunden je Zeitpräzision, nur für den Status „in der Nähe“. */
  const TOLERANCE = { 'Ungefähr': 5, 'Kontrolliert': 1 };
  const UNKNOWN_PRECISION_TOLERANCE = 5;

  const ISSUE_TEXT = {
    'ohne-ende': 'Ende der Fundstelle fehlt; nur der Beginn ist bekannt.',
    'ende-vor-start': 'Ende liegt vor dem Beginn; nur der Beginn wird verwendet.',
    'ausserhalb-laufzeit': 'Fundstelle liegt außerhalb der angegebenen Videolaufzeit.',
    'unbekannte-praezision': 'Zeitpräzision nicht angegeben oder unbekannt; als ungefähr behandelt.',
    'ohne-zeitmarke': 'Keine verwendbare Zeitmarke; kann nicht mit dem Video synchronisiert werden.'
  };

  function isTime(x) { return typeof x === 'number' && Number.isFinite(x) && x >= 0; }

  /*
   * Baut aus den Aussagen eine nach Zeit sortierte Liste aller Fundstellen.
   * Jede Fundstelle (auch Wiederholungen derselben Aussage) ist ein eigener Eintrag.
   * Rückgabe: { entries, untimed } – untimed enthält Fundstellen ohne verwendbare Zeitmarke.
   */
  function buildTimeline(claims, opts) {
    const duration = opts && isTime(opts.durationSeconds) ? opts.durationSeconds : null;
    const entries = [];
    const untimed = [];
    for (const c of claims || []) {
      const occs = Array.isArray(c.occurrences) ? c.occurrences : [];
      occs.forEach((o, i) => {
        const base = {
          key: String(o.id || (c.id + '#' + (i + 1))),
          claimId: c.id,
          occurrenceId: o.id || null,
          index: i + 1,
          count: occs.length,
          precision: o.precision || null,
          issues: []
        };
        if (!isTime(o.startSeconds)) {
          base.issues.push('ohne-zeitmarke');
          untimed.push(base);
          return;
        }
        const start = o.startSeconds;
        let end = o.endSeconds;
        if (!isTime(end)) { base.issues.push('ohne-ende'); end = start; }
        else if (end < start) { base.issues.push('ende-vor-start'); end = start; }
        if (duration != null && start > duration) base.issues.push('ausserhalb-laufzeit');
        let tolerance = TOLERANCE[o.precision];
        if (tolerance == null) { base.issues.push('unbekannte-praezision'); tolerance = UNKNOWN_PRECISION_TOLERANCE; }
        entries.push({ ...base, start, end, tolerance });
      });
    }
    entries.sort((a, b) => a.start - b.start || a.end - b.end || String(a.claimId).localeCompare(String(b.claimId)) || a.index - b.index);
    return { entries, untimed };
  }

  /* Ende eines Bereichs für den Vergleich: Punktmarken gelten eine Sekunde lang. */
  function effectiveEnd(e) { return Math.max(e.end, e.start + 1); }

  /*
   * Welche Fundstellen gehören zur Zeit t?
   * 'genau': t liegt im angegebenen Bereich [start, end).
   * 'nahe':  t liegt nur im Toleranzbereich einer (ungefähren) Zeitmarke.
   * Sortierung: genaue Treffer zuerst, dann nach Beginn.
   */
  function matchAt(timeline, t) {
    if (!isTime(t)) return [];
    const out = [];
    for (const e of timeline.entries) {
      const end = effectiveEnd(e);
      if (t >= e.start && t < end) out.push({ entry: e, match: 'genau' });
      else if (t >= e.start - e.tolerance && t < end + e.tolerance) out.push({ entry: e, match: 'nahe' });
    }
    out.sort((a, b) => (a.match === b.match ? 0 : a.match === 'genau' ? -1 : 1) || a.entry.start - b.entry.start);
    return out;
  }

  /* Nächste Fundstelle, die nach t beginnt (für die neutrale Meldung). */
  function nextAfter(timeline, t) {
    for (const e of timeline.entries) if (e.start > t) return e;
    return null;
  }

  /* Stabile Signatur einer Trefferliste, um Änderungen zu erkennen. */
  function signature(matches) {
    return matches.map(m => m.entry.key + ':' + m.match).join('|');
  }

  /*
   * Steuert die Abfrage der Playerzeit und prüft, ob sie eine verlässliche Zeitbasis des
   * Hauptvideos ist. Abhängigkeiten werden injiziert, damit die Logik ohne echten Player
   * und ohne echte Uhr getestet werden kann.
   *
   * opts.getTime()          aktuelle Playerzeit in Sekunden
   * opts.getDuration()      optional, vom Player gemeldete Gesamtdauer (IFrame API getDuration)
   * opts.expectedDuration   Laufzeit des Hauptvideos laut Daten (scope.durationSeconds)
   * opts.getRate()          optional, Wiedergabegeschwindigkeit
   * opts.onUpdate(info)     siehe tick()
   * opts.now()              Millisekunden (Standard: Date.now)
   * opts.setInterval / opts.clearInterval  Timerfunktionen
   *
   * Hintergrund (Issue #8): Die IFrame API meldet Werbung nicht. Während einer Werbung kann
   * getCurrentTime() einen anderen Zähler liefern. Deshalb wird eine Playerzeit nur übernommen,
   * wenn sie zur bisherigen bestätigten Zeit passt, vom Nutzer über die Liste angesteuert wurde
   * oder nach einem unerklärten Sprung stabil weiterläuft UND die gemeldete Dauer zur Laufzeit
   * des Hauptvideos passt. Ein durchlaufender Zähler allein reicht nie. Sonst bleibt die Anzeige
   * bei der zuletzt bestätigten Stelle und wird als „unklar“ gekennzeichnet. Das ist eine
   * Plausibilitätsprüfung, keine zuverlässige Werbeerkennung.
   */
  const POLL_MS = { playing: 250, buffering: 500, paused: 1000, cued: 1000, unstarted: 1000 };

  const BASIS_REASON = {
    'dauer': 'Die vom Player gemeldete Dauer passt nicht zur Laufzeit des Hauptvideos (zum Beispiel während einer Werbung).',
    'dauer-unbekannt': 'Die Playerzeit ist gesprungen, und die Dauer des laufenden Inhalts ist nicht bekannt.',
    'anfang': 'Die Playerzeit ist ohne Auswahl in der Liste an den Anfang gesprungen (zum Beispiel durch eine Werbung).'
  };

  function SyncController(timeline, opts) {
    this.timeline = timeline;
    this.o = Object.assign({
      getRate: () => 1,
      getDuration: () => NaN,
      expectedDuration: null,
      now: () => Date.now(),
      setInterval: (f, ms) => setInterval(f, ms),
      clearInterval: id => clearInterval(id),
      seekThreshold: 2,       // Sekunden Abweichung, ab der ein Sprung als unerklärt gilt
      confirmMs: 1000,        // so lange muss eine neue Position stabil sein
      durationTolerance: 5    // Sekunden, mindestens; zusätzlich 1 % der Laufzeit
    }, opts);
    this.state = 'unstarted';
    this.timer = null;
    this.timerMs = 0;
    this.trusted = null;      // zuletzt bestätigte Hauptvideozeit
    this.trustedNow = null;
    this.verified = false;    // wurde die Zeitbasis schon einmal bei passender Dauer bestätigt?
    this.pending = null;      // { t, now, since } neue Position in Prüfung
    this.basis = 'ok';        // ok | pruefung | unklar | angehalten
    this.reason = null;
    this.held = false;
    this.lastRaw = null;
    this.lastSig = null;
    this.lastBasis = null;
    this.forceSeek = false;
    this.destroyed = false;
  }

  SyncController.prototype.setState = function (s) {
    if (this.destroyed) return;
    const prev = this.state;
    this.state = s;
    const ms = POLL_MS[s] || 0;
    if (ms !== this.timerMs) {
      if (this.timer != null) this.o.clearInterval(this.timer);
      this.timer = ms ? this.o.setInterval(() => this.tick(), ms) : null;
      this.timerMs = ms;
    }
    this.tick(undefined, prev !== s);
  };

  /* Vom Nutzer in der Liste ausgelöster Sprung: Zielzeit gilt sofort als bestätigt. */
  SyncController.prototype.markSeek = function (target) {
    if (this.destroyed) return;
    this.forceSeek = true;
    if (isTime(target)) this.tick(target);
  };

  /* Manuelles Anhalten/Fortsetzen der Synchronisierung durch den Nutzer. */
  SyncController.prototype.setHold = function (on) {
    if (this.destroyed) return;
    this.held = !!on;
    if (!on) { this.pending = null; this.forceAccept = true; }
    this.tick(undefined, true);
  };

  /* Nutzer entscheidet ausdrücklich, die aktuelle Playerzeit zu übernehmen. */
  SyncController.prototype.acceptCurrent = function () {
    if (this.destroyed) return;
    this.forceAccept = 'immer';
    this.tick(undefined, true);
  };

  SyncController.prototype.durationStatus = function () {
    const exp = this.o.expectedDuration;
    const d = Number(this.o.getDuration());
    if (!isTime(d) || d <= 0) return 'unbekannt';
    if (!isTime(exp) || exp <= 0) return 'unbekannt';
    const tol = Math.max(this.o.durationTolerance, exp * 0.01);
    return Math.abs(d - exp) <= tol ? 'passend' : 'abweichend';
  };

  /*
   * info = { time, rawTime, state, basis, reason, matches, next, changed, seeked }
   * time:  bestätigte Hauptvideozeit, nach der hervorgehoben wird
   * rawTime: zuletzt gelesene Playerzeit (kann während einer Werbung abweichen)
   * basis: ok | pruefung (neue Position wird geprüft) | unklar | angehalten
   */
  SyncController.prototype.tick = function (override, stateChanged) {
    if (this.destroyed) return null;
    const now = this.o.now();
    const userSeek = this.forceSeek && isTime(override);
    this.forceSeek = false;
    const force = this.forceAccept; this.forceAccept = false;
    let raw = isTime(override) ? override : Number(this.o.getTime());
    if (!isTime(raw)) raw = null;
    if (raw != null) this.lastRaw = raw;
    let seeked = false;
    const prevTrusted = this.trusted;

    const dur = this.durationStatus();
    const accept = t => {
      if (prevTrusted != null && Math.abs(t - prevTrusted) > this.o.seekThreshold) seeked = true;
      if (dur === 'passend') this.verified = true;
      this.trusted = t; this.trustedNow = now; this.pending = null; this.basis = 'ok'; this.reason = null;
    };
    const unclear = reason => { this.basis = 'unklar'; this.reason = reason; this.pending = null; };

    if (this.held && !userSeek) {
      this.basis = 'angehalten'; this.reason = null;
    } else if (userSeek) {
      accept(raw); seeked = true;
    } else if (raw == null) {
      // keine verwertbare Zeit: Zustand unverändert lassen
    } else if (force === 'immer') {
      accept(raw);
    } else {
      const rate = this.state === 'playing' ? (Number(this.o.getRate()) || 1) : 0;
      if (dur === 'abweichend') {
        unclear('dauer');
      } else if (dur === 'passend' && !this.verified) {
        // Erste Lesung mit passender Dauer (z. B. Hauptvideo beginnt nach einer Vorab-Werbung).
        accept(raw);
      } else if (this.trusted == null || force) {
        if (this.trusted != null && raw < 2 && this.trusted > 10 && !force) unclear('anfang');
        else accept(raw);
      } else {
        const elapsed = Math.max(0, now - this.trustedNow) / 1000;
        const expected = this.trusted + elapsed * rate;
        // Passt zur bestätigten Zeit: normal weiter, gepuffert oder nach Werbung an alter Stelle fortgesetzt.
        if (raw >= this.trusted - 1 && raw <= expected + this.o.seekThreshold) {
          accept(raw);
        } else if ((raw < 2 && this.trusted > 10) || (this.basis === 'unklar' && this.reason === 'anfang')) {
          // Sprung an den Anfang ohne Auswahl in der Liste: bleibt unklar, bis die alte Stelle
          // wieder erreicht wird oder der Nutzer entscheidet. Ein weiterlaufender Zähler reicht nicht.
          unclear('anfang');
        } else if (dur === 'unbekannt') {
          unclear('dauer-unbekannt');
        } else {
          const p = this.pending;
          const stable = p && Math.abs(raw - (p.t + Math.max(0, now - p.now) / 1000 * rate)) <= 1;
          if (!stable) { this.pending = { t: raw, now, since: now }; this.basis = 'pruefung'; this.reason = null; }
          else if (now - p.since >= this.o.confirmMs) accept(raw);
          else { this.pending = { t: raw, now, since: p.since }; this.basis = 'pruefung'; }
        }
      }
    }

    const t = this.trusted != null ? this.trusted : 0;
    const matches = matchAt(this.timeline, t);
    const sig = signature(matches);
    const changed = sig !== this.lastSig || !!stateChanged || seeked || this.basis !== this.lastBasis;
    this.lastSig = sig;
    this.lastBasis = this.basis;
    const info = { time: t, rawTime: this.lastRaw, state: this.state, basis: this.basis, reason: this.reason,
      matches, next: nextAfter(this.timeline, t), changed, seeked };
    if (this.o.onUpdate) this.o.onUpdate(info);
    return info;
  };

  SyncController.prototype.destroy = function () {
    if (this.timer != null) this.o.clearInterval(this.timer);
    this.timer = null;
    this.timerMs = 0;
    this.destroyed = true;
  };

  /* YouTube-Player-Zustände (IFrame API) auf eigene Namen abbilden. */
  function stateName(code) {
    return ({ '-1': 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' })[code] || 'unstarted';
  }

  /* Fehlercodes der IFrame API in verständliche Hinweise übersetzen. */
  function errorText(code) {
    switch (Number(code)) {
      case 2: return 'Der Player hat eine ungültige Anfrage erhalten.';
      case 5: return 'Das Video kann im eingebetteten Player dieses Browsers nicht abgespielt werden.';
      case 100: return 'Das Video wurde nicht gefunden oder ist nicht öffentlich.';
      case 101:
      case 150: return 'Die Einbettung dieses Videos ist vom Kanal nicht erlaubt.';
      case 153: return 'YouTube hat die Einbettung abgelehnt (fehlende Herkunftsangabe des Browsers).';
      default: return 'Der YouTube-Player meldet einen Fehler.';
    }
  }

  /* Elfstellige YouTube-ID nur aus einer HTTPS-Watch-/Kurz-URL akzeptieren. */
  /* Video-ID aus einer YouTube-Adresse: watch?v=, youtu.be/ und Shorts (youtube.com/shorts/<ID>). */
  function youtubeId(url) {
    const m = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})(?:[&#?/]|$)/.exec(String(url || ''));
    return m ? m[1] : null;
  }

  return { TOLERANCE, ISSUE_TEXT, BASIS_REASON, buildTimeline, matchAt, nextAfter, signature, SyncController, stateName, errorText, youtubeId };
});
