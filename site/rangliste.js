/*
 * Politik4M3 Faktencheck – Rangliste der Videos nach ihrem Faktenindex.
 *
 * DIESE DATEI IST IN ALLEN DREI REPOSITORIES GLEICH (politik4m3Facktencheck, politik4m3FaktencheckUngeskriptet,
 * politik4m3FaktencheckKlima). Regeln in Worten: docs/RANGLISTE.md.
 *
 * Die Rangliste speichert nichts und bewertet nichts selbst. Sie ordnet die Videos ausschließlich nach dem bei jedem
 * Seitenaufruf berechneten Faktenindex (site/faktenindex.js, FactIndex.rate). Ändert sich eine Bewertung oder die
 * Regel des Faktenindex, ändert sich die Reihenfolge beim nächsten Aufruf von selbst.
 *
 * Reihenfolge:
 *   1. In der Rangliste stehen nur Videos mit belastbarer Ampel (Grün, Gelb, Rot). Höherer Index (auf drei Stellen
 *      gerundet, wie angezeigt) steht oben. Bei gleichem Index teilen sich die Videos den Platz; danach ordnet die
 *      höhere Prüfabdeckung, dann die größere Zahl bewerteter Aussagen, dann der Titel.
 *   2. Videos mit grauer Ampel (nicht bewertbar oder Prüfung läuft) bekommen keinen Platz. Sie stehen getrennt
 *      darunter, ein schon berechneter vorläufiger Index nur als Information.
 *
 * Reine Logik (rank) ohne DOM; im Browser als window.FactRanking, unter Node per require().
 * Die Anzeige (renderPage) nutzt im Browser fiAmpelView und fiEsc aus site/faktenindex-ui.js.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FactRanking = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RELIABLE = ['gruen', 'gelb', 'rot'];

  const titleOf = v => String(v?.video?.title || v?.title || v?.id || '');
  const byTitle = (a, b) => titleOf(a.v).localeCompare(titleOf(b.v), 'de');

  /*
   * videos: [{ id, title, video, data, ... }] wie loadVideo sie liefert.
   * rate: Funktion (data, video) → Ergebnis von FactIndex.rate (wird übergeben, damit die Logik testbar bleibt).
   * Ergebnis: { ranked: [{ place, v, r }], unranked: [{ v, r }] }
   */
  function rank(videos, rate) {
    const rows = (videos || []).filter(Boolean).map(v => ({ v, r: rate(v.data || null, v.video || null) }));
    const ranked = rows.filter(x => RELIABLE.includes(x.r.key) && x.r.indexRounded != null);
    const unranked = rows.filter(x => !ranked.includes(x));
    ranked.sort((a, b) =>
      (b.r.indexRounded - a.r.indexRounded) ||
      ((b.r.coverage ?? 0) - (a.r.coverage ?? 0)) ||
      (b.r.indexed - a.r.indexed) ||
      byTitle(a, b));
    /* Gleicher (angezeigter) Index → gleicher Platz („1, 2, 2, 4“). */
    ranked.forEach((x, i) => {
      x.place = i > 0 && ranked[i - 1].r.indexRounded === x.r.indexRounded ? ranked[i - 1].place : i + 1;
    });
    /* Ohne Platz: zuerst die mit vorläufigem Index (absteigend), dann ohne Index; jeweils nach Titel. */
    unranked.sort((a, b) => {
      const ai = a.r.indexRounded, bi = b.r.indexRounded;
      if (ai != null && bi != null && ai !== bi) return bi - ai;
      if ((ai == null) !== (bi == null)) return ai == null ? 1 : -1;
      return byTitle(a, b);
    });
    return { ranked, unranked };
  }

  /* ---------- Anzeige (nur im Browser) ---------- */

  /*
   * opts.roleLabel(v): kurze Einordnung, z. B. „Originalinterview“ oder „Reaktion von …“ (oder '').
   * opts.roleKey(v): 'original' | 'reaction' | '' für den Filter (optional).
   */
  function renderPage(videos, opts = {}) {
    const esc = typeof fiEsc === 'function' ? fiEsc : String;
    const fmt = x => FactIndex.format(x);
    const pct = x => FactIndex.percent(x).replace(' %', '\u00a0%');
    const roleLabel = opts.roleLabel || (() => '');
    const roleKey = opts.roleKey || (() => '');
    const { ranked, unranked } = rank(videos, FactIndex.rate);

    const keys = new Set(ranked.concat(unranked).map(x => roleKey(x.v)).filter(Boolean));
    const filter = keys.has('original') && keys.has('reaction')
      ? `<div class="rang-filter" role="group" aria-label="Rangliste filtern">
          <button type="button" data-rang-filter="" aria-pressed="true">Alle Videos</button>
          <button type="button" data-rang-filter="original" aria-pressed="false">Nur Originale</button>
          <button type="button" data-rang-filter="reaction" aria-pressed="false">Nur Reaktionen</button>
        </div>` : '';

    const meta = x => {
      const role = roleLabel(x.v);
      return `${role ? esc(role) + ' · ' : ''}${x.r.indexed} bewertete Tatsachenbehauptungen · Prüfabdeckung ${esc(pct(x.r.coverage))}`;
    };
    const row = x => `<li class="rang-item rang-${esc(x.r.key)}" id="rang-${esc(x.v.id)}" data-rang-role="${esc(roleKey(x.v))}" data-rang-index="${esc(fmt(x.r.indexRounded))}">
        <span class="rang-place" aria-label="Platz ${x.place}">${x.place}.</span>
        <div class="rang-body">
          <h2 class="rang-title"><a href="#/video/${esc(x.v.id)}">${esc(titleOf(x.v))}</a></h2>
          <p class="small muted">${meta(x)}</p>
        </div>
        <div class="rang-score">${fiAmpelView(x.v, 'compact')}</div>
      </li>`;
    const rowGrey = x => `<li class="rang-item rang-grau" id="rang-${esc(x.v.id)}" data-rang-role="${esc(roleKey(x.v))}">
        <span class="rang-place" aria-label="ohne Platz">–</span>
        <div class="rang-body">
          <h2 class="rang-title"><a href="#/video/${esc(x.v.id)}">${esc(titleOf(x.v))}</a></h2>
          <p class="small muted">${roleLabel(x.v) ? esc(roleLabel(x.v)) + ' · ' : ''}${esc(x.r.reason)}</p>
        </div>
        <div class="rang-score">${fiAmpelView(x.v, 'compact')}</div>
      </li>`;

    return `<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumennavigation"><a href="#/">Faktenchecks</a> / Rangliste</nav>
    <section class="section">
      <div class="section-head"><h1>Rangliste</h1>
      <p>Alle geprüften Videos, geordnet nach ihrem <a href="#/methodik#faktenindex">Faktenindex</a>: Videos mit gut belegter Faktenlage stehen oben, Videos mit vielen widerlegten Aussagen unten. Die Rangliste wird bei jedem Aufruf aus den bestehenden Bewertungen berechnet. Ändert sich eine Bewertung, wandert das Video von selbst nach oben oder unten.</p>
      <p class="small">Einen Platz bekommt nur ein Video mit ausreichender Prüfgrundlage (Ampel Grün, Gelb oder Rot). Bei gleichem Index teilen sich Videos den Platz. Die Rangliste bewertet die Faktenlage der geprüften Aussagen eines Videos, nicht die Glaubwürdigkeit von Personen.</p></div>
      ${filter}
      ${ranked.length ? `<ol class="rang">${ranked.map(row).join('')}</ol>` : '<p class="muted">Noch kein Video hat eine ausreichende Prüfgrundlage für einen Platz.</p>'}
    </section>
    ${unranked.length ? `<section class="section" aria-labelledby="h-rang-ohne">
      <div class="section-head"><h2 id="h-rang-ohne">Noch ohne Platz</h2>
      <p class="small">Diese Videos haben eine graue Ampel: Die Prüfung läuft noch, oder die Grundlage reicht nicht für eine Einordnung. Ein schon berechneter Index ist nur vorläufig und zählt nicht für die Rangliste.</p></div>
      <ul class="rang rang-ohne">${unranked.map(rowGrey).join('')}</ul>
    </section>` : ''}
  </div>`;
  }

  /* Filterknöpfe nach dem Einsetzen der Seite verbinden. */
  function bindFilter(container) {
    if (!container) return;
    const buttons = [...container.querySelectorAll('[data-rang-filter]')];
    buttons.forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.rangFilter;
      buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      container.querySelectorAll('.rang-item').forEach(li => { li.hidden = !!f && li.dataset.rangRole !== f; });
    }));
  }

  return { rank, renderPage, bindFilter };
});
