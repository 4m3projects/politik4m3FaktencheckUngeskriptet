/*
 * Politik4M3 Faktencheck – Rangliste der Videos und Kanäle nach dem Faktenindex.
 *
 * DIESE DATEI IST IN ALLEN DREI REPOSITORIES GLEICH (politik4m3Facktencheck maßgeblich,
 * politik4m3FaktencheckUngeskriptet, politik4m3FaktencheckKlima). Regeln in Worten: docs/RANGLISTE.md.
 *
 * Die Rangliste speichert nichts und bewertet nichts selbst. Sie ordnet die Videos ausschließlich nach dem bei jedem
 * Seitenaufruf berechneten Faktenindex (site/faktenindex.js, FactIndex.rate). Ändert sich eine Bewertung oder die
 * Regel des Faktenindex, ändern sich Reihenfolge und Kanalwerte beim nächsten Aufruf von selbst.
 *
 * Videos:
 *   1. Einen Platz bekommen nur Videos mit belastbarer Ampel (Grün, Gelb, Rot). Höherer Index (auf drei Stellen
 *      gerundet, wie angezeigt) steht oben. Gleicher Index → gleicher Platz; danach ordnen höhere Prüfabdeckung,
 *      mehr bewertete Aussagen, dann der Titel.
 *   2. Videos mit grauer Ampel stehen getrennt („Noch ohne Platz“), ein vorläufiger Index nur als Information.
 * Kanäle:
 *   Kanalwert = Durchschnitt der (gerundeten) Faktenindizes aller Videos des Kanals, die einen Platz haben, jedes
 *   Video gleich gewichtet. Kanäle ohne ein solches Video bekommen keinen Platz. Gleicher Kanalwert → gleicher Platz;
 *   danach mehr Videos mit Platz, dann der Name. Der Kanalwert beschreibt nur die hier geprüften Videos.
 *
 * Reine Logik (rank, channels, channelOf, channelSlug) ohne DOM; im Browser als window.FactRanking, unter Node per
 * require(). Die Anzeige (renderPage) nutzt im Browser FactIndex sowie fiAmpelView und fiEsc aus faktenindex-ui.js.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FactRanking = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RELIABLE = ['gruen', 'gelb', 'rot'];
  const DECIMALS = 3;

  const titleOf = v => String(v?.video?.title || v?.title || v?.id || '');
  const byTitle = (a, b) => titleOf(a.v).localeCompare(titleOf(b.v), 'de');
  const round = x => Math.round(x * 10 ** DECIMALS) / 10 ** DECIMALS;

  /* Kanalname eines Videos: video.json „channel“, sonst README-Stichpunkt „- Kanal: …“ ohne Klammerzusatz. */
  function channelOf(v) {
    const fromVideo = typeof v?.video?.channel === 'string' ? v.video.channel.trim() : '';
    if (fromVideo) return fromVideo;
    const raw = String(v?.meta?.Kanal || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '');
    return raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  /* Stabile Adresse eines Kanals: „{ungeskriptet} by Ben“ → „ungeskriptet-by-ben“. */
  function channelSlug(name) {
    return String(name || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  const channelHref = name => '#/rangliste/kanal/' + encodeURIComponent(channelSlug(name));

  function placeBy(list, valueOf) {
    list.forEach((x, i) => { x.place = i > 0 && valueOf(list[i - 1]) === valueOf(x) ? list[i - 1].place : i + 1; });
  }

  /*
   * videos: [{ id, title, video, data, meta }] wie loadVideo sie liefert.
   * rate: Funktion (data, video) → Ergebnis von FactIndex.rate (wird übergeben, damit die Logik testbar bleibt).
   * Ergebnis: { ranked: [{ place, v, r, channel }], unranked: [{ v, r, channel }] }
   */
  function rank(videos, rate) {
    const rows = (videos || []).filter(Boolean).map(v => ({ v, r: rate(v.data || null, v.video || null), channel: channelOf(v) }));
    const ranked = rows.filter(x => RELIABLE.includes(x.r.key) && x.r.indexRounded != null);
    const unranked = rows.filter(x => !ranked.includes(x));
    ranked.sort((a, b) =>
      (b.r.indexRounded - a.r.indexRounded) ||
      ((b.r.coverage ?? 0) - (a.r.coverage ?? 0)) ||
      (b.r.indexed - a.r.indexed) ||
      byTitle(a, b));
    placeBy(ranked, x => x.r.indexRounded);
    /* Ohne Platz: zuerst die mit vorläufigem Index (absteigend), dann ohne Index; jeweils nach Titel. */
    unranked.sort((a, b) => {
      const ai = a.r.indexRounded, bi = b.r.indexRounded;
      if (ai != null && bi != null && ai !== bi) return bi - ai;
      if ((ai == null) !== (bi == null)) return ai == null ? 1 : -1;
      return byTitle(a, b);
    });
    return { ranked, unranked };
  }

  /*
   * Kanäle aus einer Rangliste (Ergebnis von rank). Videos ohne Kanalangabe bleiben außen vor.
   * Ergebnis: { ranked: [{ place, name, slug, score, videos, rankedVideos }], unranked: [...] }
   */
  function channels(result) {
    const map = new Map();
    for (const x of result.ranked.concat(result.unranked)) {
      if (!x.channel) continue;
      const slug = channelSlug(x.channel);
      if (!slug) continue;
      if (!map.has(slug)) map.set(slug, { name: x.channel, slug, videos: [], rankedVideos: [] });
      const c = map.get(slug);
      c.videos.push(x);
      if (x.place) c.rankedVideos.push(x);
    }
    const all = [...map.values()];
    all.forEach(c => {
      c.score = c.rankedVideos.length ? round(c.rankedVideos.reduce((s, x) => s + x.r.indexRounded, 0) / c.rankedVideos.length) : null;
    });
    const ranked = all.filter(c => c.score != null).sort((a, b) =>
      (b.score - a.score) || (b.rankedVideos.length - a.rankedVideos.length) || a.name.localeCompare(b.name, 'de'));
    placeBy(ranked, c => c.score);
    const unranked = all.filter(c => c.score == null).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return { ranked, unranked };
  }

  /* Ampelfarbe eines Kanalwerts nach denselben Schwellen wie beim Video. */
  function levelOfScore(score, thresholds = { green: 0.8, yellow: 0.4 }) {
    if (score == null) return 'nicht_bewertbar';
    return score >= thresholds.green ? 'gruen' : score >= thresholds.yellow ? 'gelb' : 'rot';
  }

  /* ---------- Anzeige (nur im Browser) ---------- */

  /*
   * opts.view: 'videos' (Standard), 'kanaele' oder 'kanal'; opts.channel: Kanaladresse (slug) bei 'kanal'.
   * opts.roleLabel(v): kurze Einordnung, z. B. „Originalinterview“ oder „Reaktion von …“ (oder '').
   * opts.roleKey(v): 'original' | 'reaction' | '' für den Filter (optional).
   */
  function renderPage(videos, opts = {}) {
    const esc = typeof fiEsc === 'function' ? fiEsc : String;
    const fmt = x => FactIndex.format(x);
    const pct = x => FactIndex.percent(x).replace(' %', ' %');
    const roleLabel = opts.roleLabel || (() => '');
    const roleKey = opts.roleKey || (() => '');
    const view = opts.view || 'videos';
    const result = rank(videos, FactIndex.rate);
    const ch = channels(result);
    const total = result.ranked.length;
    const chLink = name => name ? `<a href="${esc(channelHref(name))}">${esc(name)}</a>` : '';
    const level = score => levelOfScore(score, FactIndex.CONFIG?.thresholds);

    const roleText = x => {
      const role = roleLabel(x.v);
      /* Den Kanalnamen in der Einordnung („Reaktion von Kanal“) verlinken, sonst getrennt anhängen. */
      if (role && x.channel && role.endsWith(x.channel)) return esc(role.slice(0, -x.channel.length)) + chLink(x.channel);
      return [role ? esc(role) : '', x.channel ? 'Kanal: ' + chLink(x.channel) : ''].filter(Boolean).join(' · ');
    };
    const row = (x, placeText) => `<li class="rang-item rang-${esc(x.r.key)}" id="rang-${esc(x.v.id)}" data-rang-role="${esc(roleKey(x.v))}" data-rang-index="${esc(fmt(x.r.indexRounded))}">
        <span class="rang-place" aria-label="Platz ${x.place}">${x.place}.</span>
        <div class="rang-body">
          <h2 class="rang-title"><a href="#/video/${esc(x.v.id)}">${esc(titleOf(x.v))}</a></h2>
          <p class="small muted">${[roleText(x), `${x.r.indexed} bewertete Tatsachenbehauptungen`, `Prüfabdeckung ${esc(pct(x.r.coverage))}`, placeText || ''].filter(Boolean).join(' · ')}</p>
        </div>
        <div class="rang-score">${fiAmpelView(x.v, 'compact')}</div>
      </li>`;
    const rowGrey = x => `<li class="rang-item rang-grau" id="rang-${esc(x.v.id)}" data-rang-role="${esc(roleKey(x.v))}">
        <span class="rang-place" aria-label="ohne Platz">–</span>
        <div class="rang-body">
          <h2 class="rang-title"><a href="#/video/${esc(x.v.id)}">${esc(titleOf(x.v))}</a></h2>
          <p class="small muted">${[roleText(x), esc(x.r.reason)].filter(Boolean).join(' · ')}</p>
        </div>
        <div class="rang-score">${fiAmpelView(x.v, 'compact')}</div>
      </li>`;
    const scoreBadge = c => {
      const key = level(c.score);
      const title = c.score == null ? 'Kanalwert: noch keiner' : `Kanalwert ${fmt(c.score)}`;
      return `<div class="ampel compact ampel-${esc(key)}" role="img" aria-label="${esc(title)}" data-ampel-key="${esc(key)}">
        <span class="ampel-lights" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="ampel-text" aria-hidden="true"><span class="ampel-title">${esc(title)}</span></span>
      </div>`;
    };
    const greyBlock = list => list.length ? `<section class="section" aria-labelledby="h-rang-ohne">
      <div class="section-head"><h2 id="h-rang-ohne">Noch ohne Platz</h2>
      <p class="small">Diese Videos haben eine graue Ampel: Die Prüfung läuft noch, oder die Grundlage reicht nicht für eine Einordnung. Ein schon berechneter Index ist nur vorläufig und zählt nicht für die Rangliste.</p></div>
      <ul class="rang rang-ohne">${list.map(rowGrey).join('')}</ul>
    </section>` : '';
    const tabs = active => `<nav class="rang-tabs" aria-label="Ansicht der Rangliste">
        <a href="#/rangliste"${active === 'videos' ? ' aria-current="page"' : ''}>Videos</a>
        <a href="#/rangliste/kanaele"${active === 'kanaele' ? ' aria-current="page"' : ''}>Kanäle</a>
      </nav>`;
    const channelNote = '<p class="small">Der Kanalwert ist der Durchschnitt der Faktenindizes aller Videos dieses Kanals, die hier einen Platz haben; jedes Video zählt gleich. Er beschreibt nur die von uns geprüften Videos, nicht den ganzen Kanal und nicht die Glaubwürdigkeit von Personen. Bei Interviewformaten stammen viele Aussagen von Gästen.</p>';
    const crumbs = tail => `<nav class="crumbs" aria-label="Brotkrumennavigation"><a href="#/">Faktenchecks</a> / ${tail}</nav>`;

    if (view === 'kanal') {
      const c = ch.ranked.concat(ch.unranked).find(x => x.slug === opts.channel);
      if (!c) {
        return `<div class="wrap">${crumbs('<a href="#/rangliste">Rangliste</a> / Kanal')}
          <section class="section"><h1>Kanal nicht gefunden</h1><p>Zu dieser Adresse gibt es kein geprüftes Video. <a href="#/rangliste/kanaele">Alle Kanäle</a></p></section></div>`;
      }
      const grey = c.videos.filter(x => !x.place);
      /* Platz innerhalb des Kanals (gleiche Regel), dazu der Gesamtplatz unter allen Videos. */
      const local = c.rankedVideos.map(x => ({ ...x, globalPlace: x.place }));
      placeBy(local, x => x.r.indexRounded);
      return `<div class="wrap">
    ${crumbs(`<a href="#/rangliste">Rangliste</a> / <a href="#/rangliste/kanaele">Kanäle</a> / ${esc(c.name)}`)}
    <section class="section">
      <div class="rang-kanal-titel"><p class="eyebrow">Kanal</p><h1>${esc(c.name)}</h1>
      <div class="rang-kanal-kopf">${scoreBadge(c)}<p>${c.place ? `Platz ${c.place} von ${ch.ranked.length} Kanälen · ` : 'Noch ohne Platz unter den Kanälen · '}${c.rankedVideos.length} von ${c.videos.length} geprüften Videos mit Platz</p></div>
      ${channelNote}</div>
      ${c.rankedVideos.length ? `<ol class="rang">${local.map(x => row(x, `Gesamtplatz ${x.globalPlace} von ${total}`)).join('')}</ol>` : '<p class="muted">Noch kein Video dieses Kanals hat eine ausreichende Prüfgrundlage für einen Platz.</p>'}
      <p class="rang-links"><a href="#/rangliste/kanaele">Alle Kanäle</a> · <a href="#/rangliste">Alle Videos</a></p>
    </section>
    ${greyBlock(grey)}
  </div>`;
    }

    if (view === 'kanaele') {
      const chRow = c => `<li class="rang-item rang-kanal" id="kanal-${esc(c.slug)}">
        <span class="rang-place"${c.place ? ` aria-label="Platz ${c.place}">${c.place}.` : ' aria-label="ohne Platz">–'}</span>
        <div class="rang-body">
          <h2 class="rang-title"><a href="${esc(channelHref(c.name))}">${esc(c.name)}</a></h2>
          <p class="small muted">${c.rankedVideos.length ? `Durchschnitt aus ${c.rankedVideos.length} ${c.rankedVideos.length === 1 ? 'Video' : 'Videos'} mit Platz` : 'Noch kein Video mit Platz'}${c.videos.length > c.rankedVideos.length ? ` · ${c.videos.length - c.rankedVideos.length} weitere noch ohne Platz` : ''}</p>
        </div>
        <div class="rang-score">${scoreBadge(c)}</div>
      </li>`;
      return `<div class="wrap">
    ${crumbs('<a href="#/rangliste">Rangliste</a> / Kanäle')}
    <section class="section">
      <div class="section-head"><h1>Rangliste der Kanäle</h1>
      <p>Alle Kanäle mit geprüften Videos, geordnet nach ihrem Kanalwert. Ein Klick auf den Kanal zeigt seine Videos und ihre Plätze.</p>
      ${channelNote}</div>
      ${tabs('kanaele')}
      ${ch.ranked.length ? `<ol class="rang">${ch.ranked.map(chRow).join('')}</ol>` : '<p class="muted">Noch kein Kanal hat ein Video mit Platz.</p>'}
    </section>
    ${ch.unranked.length ? `<section class="section" aria-labelledby="h-kanal-ohne"><div class="section-head"><h2 id="h-kanal-ohne">Kanäle noch ohne Platz</h2></div>
      <ul class="rang rang-ohne">${ch.unranked.map(chRow).join('')}</ul></section>` : ''}
  </div>`;
    }

    const keys = new Set(result.ranked.concat(result.unranked).map(x => roleKey(x.v)).filter(Boolean));
    const roleFilter = keys.has('original') && keys.has('reaction')
      ? `<div class="rang-filter" role="group" aria-label="Rangliste filtern">
          <button type="button" data-rang-filter="" aria-pressed="true">Alle Videos</button>
          <button type="button" data-rang-filter="original" aria-pressed="false">Nur Originale</button>
          <button type="button" data-rang-filter="reaction" aria-pressed="false">Nur Reaktionen</button>
        </div>` : '';
    const allCh = ch.ranked.concat(ch.unranked).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const channelFilter = allCh.length > 1 ? `<label class="rang-kanalwahl">Kanal: <select data-rang-kanal>
          <option value="">Alle Kanäle</option>
          ${allCh.map(c => `<option value="${esc(c.slug)}">${esc(c.name)} (${c.videos.length})</option>`).join('')}
        </select></label>` : '';

    return `<div class="wrap">
    ${crumbs('Rangliste')}
    <section class="section">
      <div class="section-head"><h1>Rangliste</h1>
      <p>Alle geprüften Videos, geordnet nach ihrem <a href="#/methodik#faktenindex">Faktenindex</a>: Videos mit gut belegter Faktenlage stehen oben, Videos mit vielen widerlegten Aussagen unten. Die Rangliste wird bei jedem Aufruf aus den bestehenden Bewertungen berechnet. Ändert sich eine Bewertung, wandert das Video von selbst nach oben oder unten.</p>
      <p class="small">Einen Platz bekommt nur ein Video mit ausreichender Prüfgrundlage (Ampel Grün, Gelb oder Rot). Bei gleichem Index teilen sich Videos den Platz. Die Rangliste bewertet die Faktenlage der geprüften Aussagen eines Videos, nicht die Glaubwürdigkeit von Personen.</p></div>
      ${tabs('videos')}
      ${roleFilter || channelFilter ? `<div class="rang-filterzeile">${roleFilter}${channelFilter}</div>` : ''}
      ${result.ranked.length ? `<ol class="rang">${result.ranked.map(x => row(x)).join('')}</ol>` : '<p class="muted">Noch kein Video hat eine ausreichende Prüfgrundlage für einen Platz.</p>'}
    </section>
    ${greyBlock(result.unranked)}
  </div>`;
  }

  /* Filterknöpfe und Kanalauswahl nach dem Einsetzen der Seite verbinden. */
  function bindFilter(container) {
    if (!container) return;
    const buttons = [...container.querySelectorAll('[data-rang-filter]')];
    buttons.forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.rangFilter;
      buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      container.querySelectorAll('.rang-item').forEach(li => { li.hidden = !!f && li.dataset.rangRole !== f; });
    }));
    const sel = container.querySelector('[data-rang-kanal]');
    if (sel) sel.addEventListener('change', () => { if (sel.value) location.hash = '#/rangliste/kanal/' + encodeURIComponent(sel.value); });
  }

  return { rank, channels, channelOf, channelSlug, channelHref, levelOfScore, renderPage, bindFilter };
});
