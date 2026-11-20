/*
 * Politik4M3 Faktencheck – Video-Ansicht mit zeitlich synchronisierten Aussagen.
 * Eigener Code ohne Fremdbibliotheken; nutzt Hilfsfunktionen aus app.js und die Logik aus sync.js.
 *
 * Datenschutz: Bis zum ausdrücklichen Klick auf „Video laden“ stellt diese Seite keinerlei
 * Verbindung zu YouTube oder Google her (keine Skripte, keine iframes, keine Vorschaubilder).
 * Danach wird die offizielle YouTube IFrame Player API geladen und der Player im erweiterten
 * Datenschutzmodus (youtube-nocookie.com) eingebettet. Kein API-Schlüssel, kein eigener Server.
 */
'use strict';

const VIDEO_PREFS = 'p4m3-video-ansicht';
const YT_API_URL = 'https://www.youtube.com/iframe_api';
const YT_HOST = 'https://www.youtube-nocookie.com';
const YT_TIMEOUT_MS = 15000;

function loadPrefs() {
  try { return Object.assign({ layout: 'side', autoscroll: true }, JSON.parse(localStorage.getItem(VIDEO_PREFS) || '{}')); }
  catch { return { layout: 'side', autoscroll: true }; }
}
function savePrefs(p) {
  try { localStorage.setItem(VIDEO_PREFS, JSON.stringify(p)); } catch { /* Speicher nicht verfügbar – nur Komfort */ }
}

/* Lädt die IFrame API höchstens einmal je Seitenaufruf; nur nach Nutzerklick aufgerufen. */
let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ytApiPromise = null; reject(new Error('Zeitüberschreitung beim Laden des YouTube-Players.')); }, YT_TIMEOUT_MS);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (typeof prev === 'function') { try { prev(); } catch (e) { console.error(e); } }
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = YT_API_URL;
    s.async = true;
    s.referrerPolicy = 'strict-origin-when-cross-origin';
    s.onerror = () => { clearTimeout(timer); ytApiPromise = null; s.remove(); reject(new Error('Der YouTube-Player konnte nicht geladen werden (blockiert oder offline).')); };
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

function speakerText(o, speakers) {
  const name = id => (id && speakers[id] ? (speakers[id].name || 'Unbenannte Stimme ' + id) : id);
  if (o.attributionStatus === 'Bestätigt') return `${esc(name(o.speakerId))} (Zuordnung bestätigt)`;
  if (o.attributionStatus === 'Plausibel') return `vermutlich ${esc(name(o.candidateSpeakerId))} (plausibel, nicht bestätigt)`;
  return 'Sprecher ungeklärt';
}

function vcItem(entry, c, o, v, ctx) {
  const d = v.data;
  const shortId = c.id.replace(v.id + '-', '');
  const range = `${hms(entry.start)}–${hms(entry.end)}`;
  const ext = entry.untimed ? null : videoTimeUrl(d.scope.videoUrl, entry.start);
  const rhetList = (ctx.rhet && ctx.rhet.get(c.id)) || [];
  const issues = entry.issues.map(k => `<span class="badge plain warn-badge">${esc(FactSync.ISSUE_TEXT[k] || k)}</span>`).join('');
  const srcs = (c.sourceRefs || []).map(r => {
    const s = ctx.sources[r.sourceId];
    if (!s) return `<li>${esc(r.sourceId)}${r.note ? ` – ${esc(r.note)}` : ''}</li>`;
    return `<li>${extLink(s.url, esc(s.title))}<div class="src-meta">${esc(s.details)} · abgerufen ${esc(deDate(s.accessedOn))} · ${esc(s.accessBasis)}</div>${r.note ? `<div class="src-note">Bezug: ${esc(r.note)}</div>` : ''}</li>`;
  }).join('');
  const q = (c.openQuestions || []).map(x => `<li>${esc(x)}</li>`).join('');
  const label = `Zur Fundstelle ${hms(entry.start)} springen: ${c.description}`;
  return `<li class="vc-item" id="vc-${esc(entry.key)}" data-key="${esc(entry.key)}">
    <div class="vc-item-top">
      ${entry.untimed ? '<span class="time">ohne Zeitmarke</span>' : `<button type="button" class="vc-seek" data-key="${esc(entry.key)}" aria-label="${esc(label)}"><span class="time">▶ ${range}</span></button>`}
      ${verdictBadge(c.verdict, c.status, c.reason)}
      <span class="vc-flag" aria-hidden="true"></span>
    </div>
    <p class="vc-desc">${esc(c.description)}</p>
    ${c.shortReason ? `<p class="vc-short">${esc(c.shortReason)}</p>` : ''}
    ${counterBlock(ctx.counterOf ? ctx.counterOf(c) : [], true)}
    <div class="vc-meta">
      <span class="badge plain">Zeit ${esc(entry.precision || 'unbekannt')}</span>
      ${entry.count > 1 ? `<span class="badge plain">Vorkommen ${entry.index} von ${entry.count}</span>` : ''}
      <span class="badge kind">Kapitel ${esc(c.chapter)}</span>
      <span class="badge kind">${esc(c.kind)}</span>
      ${typeof fiSpeakerBadge === 'function' ? fiSpeakerBadge(c) : ''}
      ${issues}
      ${vcRhetFlags(rhetList)}
    </div>
    <details class="vc-details">
      <summary>${c.shortReason ? 'Ausführliche Begründung, Quellen und Zuordnung' : 'Einordnung, Quellen und Zuordnung'}</summary>
      <div class="vc-body">
        ${c.reason ? `<p>${esc(c.reason)}</p>` : ''}
        ${c.assessmentBasis ? `<p class="small"><strong>Grundlage:</strong> ${esc(c.assessmentBasis)}</p>` : ''}
        <dl class="kv">
          <dt>Sprecher</dt><dd>${speakerText(o, ctx.speakers)}</dd>
          <dt>Aussagebezug</dt><dd>${esc(o.role)} (${esc(o.roleStatus)})</dd>
          <dt>Zeitgrundlage</dt><dd>${esc(o.timeBasis)}</dd>
          ${o.note ? `<dt>Hinweis</dt><dd>${esc(o.note)}</dd>` : ''}
        </dl>
        ${rhetBlock(rhetList, v)}
        <div><h4>Quellen</h4>${srcs ? `<ul class="sources">${srcs}</ul>` : '<p class="small">Dieser Aussage sind keine Sachquellen zugeordnet.</p>'}</div>
        ${q ? `<div><h4>${isUnverifiable(c) ? 'Was für eine Prüfung fehlt' : 'Offene Fragen'}</h4><ul class="questions">${q}</ul></div>` : ''}
        <p class="small"><a href="#/video/${esc(v.id)}/aussage/${esc(c.id)}">Vollständige Prüfung ${esc(shortId)}</a>${ext ? ` · ${extLink(ext, 'Stelle auf YouTube öffnen')}` : ''}</p>
      </div>
    </details>
  </li>`;
}

/* Kurze Darstellungs-Merkmale (KI-Hinweise, zweite Ebene) als Badges; per Einstellung ausblendbar (.hide-rhet). */
function vcRhetFlags(list) {
  return [...new Set(list.map(a => a.feature))].map(k => `<span class="badge rhet-badge rhet-flag" data-tip="Darstellungshinweis (KI), getrennt von der Faktenbewertung">Darstellung: ${esc(FactRhetoric.FEATURES[k]?.name || k)}</span>`).join('');
}

async function pageVideoSync(id, opts = {}) {
  const v = await loadVideo(id);
  const d = v.data;
  const ytId = d ? FactSync.youtubeId(d.scope.videoUrl) : null;
  if (!d || !ytId || (d.scope.videoId && d.scope.videoId !== ytId)) { location.replace(`#/video/${id}`); return; }

  const byClaim = Object.fromEntries(d.claims.map(c => [c.id, c]));
  const ctx = {
    speakers: Object.fromEntries((d.speakers || []).map(s => [s.id, s])),
    sources: Object.fromEntries((d.sources || []).map(s => [s.id, s])),
    /* Darstellungshinweise (zweite Ebene) je Aussage; fehlen sie, bleibt die Liste unverändert. */
    rhet: FactRhetoric.byClaim(v.rhet),
    /* Belegte Gegenaussagen aus anderen geprüften Videos (nur bei kritischen Aussagen). */
    counterOf: await counterContext(v)
  };
  const rhetFlags = id => vcRhetFlags(ctx.rhet.get(id) || []);
  const timeline = FactSync.buildTimeline(d.claims, { durationSeconds: d.scope.durationSeconds });
  const occOf = e => (byClaim[e.claimId].occurrences || [])[e.index - 1];
  const entryByKey = Object.fromEntries([...timeline.entries, ...timeline.untimed].map(e => [e.key, e]));
  const prefs = loadPrefs();
  const extUrl = safeUrl(d.scope.videoUrl);
  const tolText = Object.entries(FactSync.TOLERANCE).map(([k, s]) => `${k}: ±${s} s`).join(', ');

  const items = timeline.entries.map(e => vcItem(e, byClaim[e.claimId], occOf(e), v, ctx)).join('');
  const untimed = timeline.untimed.map(e => vcItem({ ...e, untimed: true }, byClaim[e.claimId], occOf(e), v, ctx)).join('');

  setPage(`<div class="wrap">
    ${videoHeader(v, 'video')}
    ${d.scope.kind === 'Teilbestand' && !researchDone(d.scope) ? `<p class="notice warn"><strong>Teilbestand:</strong> Nur ein Teil der Aussagen dieses Videos ist strukturiert geprüft. Stellen ohne Eintrag sind nicht automatisch unproblematisch.</p>` : ''}
  </div>
  <section class="vc" id="vc" data-layout="${prefs.layout === 'stack' ? 'stack' : 'side'}" data-format="${FactRelations.isShort(v.video, d.scope.videoUrl) ? 'short' : 'video'}" aria-label="Video mit Faktencheck">
    <div class="vc-shell">
      <div class="vc-toolbar">
        <div class="seg" role="group" aria-label="Anordnung von Video und Aussagen">
          <button type="button" data-layout="side">Nebeneinander</button>
          <button type="button" data-layout="stack">Untereinander</button>
        </div>
        <label class="vc-check"><input type="checkbox" id="vc-auto"${prefs.autoscroll ? ' checked' : ''}> Liste automatisch mitscrollen</label>
        <button type="button" class="btn ghost" id="vc-hold" aria-pressed="false" disabled title="Hält die Hervorhebung an, z. B. während einer Werbung">⏸ Synchronisierung anhalten</button>
        <button type="button" class="btn ghost vc-expand" id="vc-expand" aria-haspopup="dialog">⛶ Großansicht</button>
        <button type="button" class="btn ghost vc-close" id="vc-close">✕ Großansicht schließen</button>
      </div>
      <div class="vc-grid">
        <div class="vc-player-col">
          <div class="vc-frame" id="vc-frame">
            <div class="vc-consent" id="vc-consent">
              <h2>Originalvideo einbetten?</h2>
              <p>Erst nach deinem Klick wird der Player von YouTube geladen. Dabei stellt dein Browser eine Verbindung zu YouTube (Google) her; übertragen werden mindestens deine IP-Adresse und technische Gerätedaten, und YouTube kann Cookies oder ähnliche Speicher nutzen. Wir verwenden den erweiterten Datenschutzmodus (youtube-nocookie.com), der das nach Angaben von YouTube einschränkt, aber nicht ausschließt. Bis dahin lädt diese Seite nichts von YouTube.</p>
              <p id="vc-pending" class="vc-pending" hidden></p>
              <div class="btn-row">
                <button type="button" class="btn" id="vc-load">▶ Video laden</button>
                ${extUrl ? extLink(extUrl, '<span class="btn ghost">Stattdessen auf YouTube öffnen</span>') : ''}
              </div>
              <p class="small">Der Faktencheck neben bzw. unter dem Video ist auch ohne Einbettung vollständig lesbar.</p>
            </div>
          </div>
          <div class="vc-now">
            <p class="vc-time" id="vc-time">Video nicht geladen</p>
            <div id="vc-current" aria-live="polite" aria-atomic="true"><p class="small">Lade das Video oder wähle eine Zeitmarke. Ohne Video bleibt die Liste vollständig lesbar.</p></div>
          </div>
        </div>
        <div class="vc-list-col">
          <div class="vc-scroll" id="vc-scroll">
          <h2 class="vc-list-head" id="vc-list-h">Fundstellen im Zeitverlauf <span class="muted">(${timeline.entries.length})</span></h2>
          <p class="small vc-hint">Alle Zeitmarken sind ${timeline.entries.every(e => e.precision === 'Ungefähr') ? 'ungefähr (aus Untertiteltext eingegrenzt, ohne Audio-/Videokontrolle)' : 'unterschiedlich genau; siehe Angabe je Eintrag'}. Einträge kurz davor oder danach werden deshalb als „in der Nähe“ markiert (${esc(tolText)}).</p>
          <ol class="vc-list" id="vc-list" aria-labelledby="vc-list-h" tabindex="-1">${items || '<li class="small">Keine Fundstellen mit Zeitmarke vorhanden.</li>'}</ol>
          ${untimed ? `<h3 class="vc-list-head">Ohne verwendbare Zeitmarke</h3><ol class="vc-list vc-list-untimed">${untimed}</ol>` : ''}
          </div>
        </div>
      </div>
    </div>
  </section>`, 'start');
  document.title = 'Video mit Faktencheck – ' + v.title + ' – Politik4M3 Faktencheck';
  window.scrollTo(0, 0);

  const $ = s => document.getElementById(s);
  const vc = $('vc'), list = $('vc-list'), scroller = $('vc-scroll'), frame = $('vc-frame'), timeEl = $('vc-time'), currentEl = $('vc-current');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const itemEls = Object.fromEntries([...vc.querySelectorAll('.vc-item')].map(el => [el.dataset.key, el]));

  let player = null, ready = false, pendingSeek = null, controller = null, lastUserScroll = 0, destroyed = false, expanded = false, lastFocus = null, autoplay = false;

  /* ---------- Layout und Großansicht ---------- */
  const setLayout = layout => {
    vc.dataset.layout = layout;
    vc.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layout === layout)));
    prefs.layout = layout; savePrefs(prefs);
  };
  setLayout(vc.dataset.layout);
  vc.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => setLayout(b.dataset.layout)));
  $('vc-auto').addEventListener('change', e => { prefs.autoscroll = e.target.checked; savePrefs(prefs); });

  const focusables = () => [...vc.querySelectorAll('button, a[href], input, summary, iframe, [tabindex="0"]')].filter(el => !el.closest('[hidden]') && el.offsetParent !== null);
  const onKey = e => {
    if (!expanded) return;
    if (e.key === 'Escape') { e.preventDefault(); setExpanded(false); return; }
    if (e.key === 'Tab') {
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  // Alles außerhalb des Dialogs ist während der Großansicht nicht erreichbar (auch nicht per Tab aus dem Player heraus).
  const outside = () => [document.querySelector('.topbar'), document.querySelector('.footer'), document.querySelector('.skip'),
    ...[...vc.parentElement.children].filter(el => el !== vc)].filter(Boolean);
  const setOutsideInert = on => outside().forEach(el => { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
  const setExpanded = on => {
    expanded = on;
    // Kein Umhängen im DOM: ein verschobener iframe würde neu laden und die Wiedergabe abbrechen.
    vc.classList.toggle('is-expanded', on);
    document.body.classList.toggle('vc-lock', on);
    setOutsideInert(on);
    if (on) {
      lastFocus = document.activeElement;
      vc.setAttribute('role', 'dialog'); vc.setAttribute('aria-modal', 'true');
      $('vc-close').focus();
    } else {
      vc.removeAttribute('role'); vc.removeAttribute('aria-modal');
      (lastFocus && document.contains(lastFocus) ? lastFocus : $('vc-expand')).focus();
    }
    scrollToCurrent(true);
  };
  $('vc-expand').addEventListener('click', () => setExpanded(true));
  $('vc-close').addEventListener('click', () => setExpanded(false));
  document.addEventListener('keydown', onKey);

  /* ---------- Anzeige des aktuellen Stands ---------- */
  ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach(t => scroller.addEventListener(t, () => { lastUserScroll = Date.now(); }, { passive: true }));

  function scrollToCurrent(force) {
    const el = list.querySelector('.vc-item.is-current') || list.querySelector('.vc-item.is-near');
    if (!el || (!force && !$('vc-auto').checked)) return;
    if (!force && Date.now() - lastUserScroll < 4000) return; // Nutzer liest gerade selbst
    if (scroller.scrollHeight > scroller.clientHeight + 1) scrollToEl(el);
  }

  const STATE_TEXT = { playing: 'Wiedergabe läuft', paused: 'Pausiert', buffering: 'Lädt …', cued: 'Bereit', unstarted: 'Bereit', ended: 'Video zu Ende', error: 'Playerfehler' };

  const BASIS_FLAG = { pruefung: 'Neue Position wird geprüft …', unklar: 'Synchronisierung vorübergehend unklar', angehalten: 'Synchronisierung angehalten' };

  function render(info) {
    const basis = info.basis || 'ok';
    const raw = info.rawTime != null && Math.abs(info.rawTime - info.time) > 1 ? ` · Player meldet ${hms(info.rawTime)}` : '';
    timeEl.textContent = basis === 'ok'
      ? `${hms(info.time)} · ${STATE_TEXT[info.state] || ''}`
      : `Anzeige gehalten bei ${hms(info.time)} · ${BASIS_FLAG[basis]}${raw}`;
    if (!info.changed) return;
    vc.dataset.basis = basis;
    const holdBtn = $('vc-hold');
    if (holdBtn) {
      holdBtn.setAttribute('aria-pressed', String(basis === 'angehalten'));
      holdBtn.textContent = basis === 'angehalten' ? '▶ Synchronisierung fortsetzen' : '⏸ Synchronisierung anhalten';
    }
    const keys = new Map(info.matches.map(m => [m.entry.key, m.match]));
    for (const [key, el] of Object.entries(itemEls)) {
      const m = keys.get(key);
      el.classList.toggle('is-current', m === 'genau');
      el.classList.toggle('is-near', m === 'nahe');
      if (m === 'genau') el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
      el.querySelector('.vc-flag').textContent = !m ? '' : basis !== 'ok' ? 'Zuletzt bestätigte Stelle'
        : m === 'genau' ? 'Jetzt im Video' : 'In der Nähe (Zeitmarke ungefähr)';
    }
    let html;
    if (basis === 'unklar') {
      html = `<div class="vc-basis" role="status"><p><strong>Synchronisierung vorübergehend unklar.</strong> ${esc(FactSync.BASIS_REASON[info.reason] || '')} Die Liste bleibt bei der zuletzt bestätigten Stelle ${hms(info.time)} und läuft weiter, sobald das Hauptvideo wieder plausibel ist.</p>
        <p class="small">Werbung lässt sich über die offizielle YouTube-Schnittstelle nicht sicher erkennen. Wenn du selbst gespult hast: <button type="button" class="linkish" data-accept>aktuelle Videozeit übernehmen</button> oder eine Zeitmarke in der Liste wählen.</p></div>`;
    } else if (basis === 'pruefung') {
      html = `<p class="small vc-basis">Die Videoposition hat sich sprunghaft geändert. Die neue Stelle wird kurz geprüft; bis dahin bleibt die Anzeige bei ${hms(info.time)}.</p>`;
    } else if (basis === 'angehalten') {
      html = `<p class="small vc-basis">Synchronisierung angehalten. Die Liste bleibt bei ${hms(info.time)}. Zeitmarken in der Liste funktionieren weiter.</p>`;
    } else if (info.state === 'ended') {
      html = '<p class="small">Das Video ist zu Ende. Alle Fundstellen stehen weiterhin in der Liste.</p>';
    } else if (info.matches.length) {
      html = `<p class="vc-now-label">${info.matches.length === 1 ? 'Zu dieser Stelle gehört' : `Zu dieser Stelle gehören ${info.matches.length} Einträge`}:</p><ul class="vc-now-list">` +
        info.matches.map(m => {
          const c = byClaim[m.entry.claimId];
          return `<li class="${m.match === 'genau' ? 'is-current' : 'is-near'}"><button type="button" class="linkish" data-goto="${esc(m.entry.key)}">${esc(c.description)}</button>
            <span class="vc-now-badges">${verdictBadge(c.verdict, c.status, c.reason)}${m.match === 'nahe' ? '<span class="badge plain">in der Nähe</span>' : ''}${rhetFlags(c.id)}</span></li>`;
        }).join('') + '</ul>';
    } else {
      const n = info.next;
      html = `<p class="small">An dieser Stelle ist keine geprüfte Aussage zugeordnet. Das ist keine Aussage über die Richtigkeit des Gesagten.</p>` +
        (n ? `<p class="small"><button type="button" class="linkish" data-seek="${esc(n.key)}">Nächste Fundstelle bei ${hms(n.start)}</button></p>` : '');
    }
    currentEl.innerHTML = html;
    scrollToCurrent(info.seeked);
  }

  currentEl.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g) {
      const el = itemEls[g.dataset.goto];
      if (el) { el.querySelector('details').open = true; scrollToEl(el); const b = el.querySelector('.vc-seek'); if (b) b.focus({ preventScroll: true }); }
      return;
    }
    const s = e.target.closest('[data-seek]');
    if (s) { seekTo(entryByKey[s.dataset.seek]); return; }
    if (e.target.closest('[data-accept]') && controller) controller.acceptCurrent();
  });
  $('vc-hold').addEventListener('click', () => {
    if (controller) controller.setHold($('vc-hold').getAttribute('aria-pressed') !== 'true');
  });
  function scrollToEl(el) {
    const top = scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8;
    scroller.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------- Player ---------- */
  function showFallback(message) {
    ready = false;
    if (controller) { controller.setState('error'); }
    frame.innerHTML = `<div class="vc-consent vc-error" role="alert">
      <h2>Video kann hier nicht abgespielt werden</h2>
      <p>${esc(message)}</p>
      <div class="btn-row">${extUrl ? extLink(extUrl, '<span class="btn">Video auf YouTube öffnen</span>') : ''}
        <button type="button" class="btn ghost" id="vc-retry">Erneut versuchen</button></div>
      <p class="small">Die Zeitmarken in der Liste öffnen auf Wunsch die jeweilige Stelle direkt auf YouTube („Stelle auf YouTube öffnen“ in den Details).</p>
    </div>`;
    timeEl.textContent = 'Playerfehler';
    $('vc-retry').addEventListener('click', () => { teardownPlayer(); frame.innerHTML = '<div id="vc-yt"></div>'; startPlayer(); });
  }

  function teardownPlayer() {
    if (controller) { controller.destroy(); controller = null; }
    if (player && typeof player.destroy === 'function') { try { player.destroy(); } catch (e) { /* bereits entfernt */ } }
    player = null; ready = false;
    const h = $('vc-hold'); if (h) h.disabled = true;
  }

  async function startPlayer() {
    frame.innerHTML = '<div class="vc-loading" id="vc-yt" role="status">YouTube-Player wird geladen …</div>';
    timeEl.textContent = 'Player wird geladen …';
    let YT;
    try { YT = await loadYouTubeApi(); }
    catch (err) { if (!destroyed) showFallback(err.message); return; }
    if (destroyed) return;
    const host = document.createElement('div');
    host.id = 'vc-yt';
    frame.replaceChildren(host);
    controller = new FactSync.SyncController(timeline, {
      getTime: () => (player && ready && typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : NaN),
      getRate: () => (player && ready && typeof player.getPlaybackRate === 'function' ? player.getPlaybackRate() : 1),
      getDuration: () => (player && ready && typeof player.getDuration === 'function' ? player.getDuration() : NaN),
      expectedDuration: d.scope.durationSeconds,
      onUpdate: render
    });
    try {
      player = new YT.Player(host, {
        host: YT_HOST,
        videoId: ytId,
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, enablejsapi: 1, origin: location.origin, start: pendingSeek != null ? Math.floor(pendingSeek) : 0 },
        events: {
          onReady: () => {
            if (destroyed) return;
            ready = true;
            $('vc-hold').disabled = false;
            const iframe = player.getIframe && player.getIframe();
            if (iframe) { iframe.title = 'YouTube-Videoplayer: ' + v.title; iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen'); }
            controller.setState('cued');
            if (pendingSeek != null) { const t = pendingSeek; pendingSeek = null; player.seekTo(t, true); player.playVideo(); controller.markSeek(t); }
            else if (autoplay) player.playVideo();
          },
          onStateChange: e => { if (controller) controller.setState(FactSync.stateName(e.data)); },
          onError: e => showFallback(FactSync.errorText(e.data))
        }
      });
    } catch (err) {
      showFallback('Der YouTube-Player konnte nicht gestartet werden.');
    }
  }

  function seekTo(entry) {
    if (!entry || entry.start == null) return;
    if (player && ready) {
      player.seekTo(entry.start, true);
      player.playVideo();
      controller.markSeek(entry.start);
      return;
    }
    // Ohne ausdrückliche Zustimmung nichts von YouTube laden: Ziel merken und auf den Ladeknopf verweisen.
    pendingSeek = entry.start;
    const p = $('vc-pending'), btn = $('vc-load');
    if (p && btn) {
      p.hidden = false;
      p.textContent = `Gewählte Stelle: ${hms(entry.start)}. Nach dem Laden startet das Video dort.`;
      btn.textContent = `▶ Video laden und ab ${hms(entry.start)} abspielen`;
      frame.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      btn.focus({ preventScroll: true });
    }
    // Liste trotzdem auf die gewählte Stelle einstellen, damit der Zusammenhang sichtbar bleibt.
    render({ time: entry.start, state: 'unstarted', matches: FactSync.matchAt(timeline, entry.start), next: FactSync.nextAfter(timeline, entry.start), changed: true, seeked: true });
    timeEl.textContent = `Gewählt: ${hms(entry.start)} · Video nicht geladen`;
  }

  $('vc-load').addEventListener('click', startPlayer);

  /* Knopf „Video mit Faktencheck hier abspielen“ auf der Detailseite: Der Klick dort ist die
     ausdrückliche Zustimmung (Hinweis steht am Knopf). Gilt nur für diesen Aufruf; die Adresse wird
     auf die normale Video-Ansicht zurückgesetzt, damit Neuladen nicht erneut automatisch startet. */
  if (opts.autostart) {
    history.replaceState(null, '', `#/video/${id}/video`);
    autoplay = true;
    vc.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    startPlayer();
  }
  vc.addEventListener('click', e => {
    const b = e.target.closest('.vc-seek');
    if (b) seekTo(entryByKey[b.dataset.key]);
  });

  state.cleanup = () => {
    destroyed = true;
    teardownPlayer();
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('vc-lock');
    setOutsideInert(false);
  };
}
