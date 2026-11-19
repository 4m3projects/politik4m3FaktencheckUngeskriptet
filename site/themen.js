/*
 * Politik4M3 Faktencheck – öffentliche Themen-Wissensdatenbank (Darstellung).
 * Eigener Code ohne Fremdbibliotheken. Nutzt die Hilfsfunktionen aus app.js (esc, setPage, verdictBadge …)
 * und die Rechenlogik aus wissen.js (window.FactKnowledge). Datenquelle: daten/wissen.json, im Workflow
 * mit `node scripts/wissen.js export` erzeugt. Liest nur, ändert keine Bewertung.
 * Grundlage: docs/WISSENSDATENBANK.md.
 */
'use strict';

/* Wissensverzeichnis einmal laden. Fehlt es, gibt es schlicht noch keine Themen. */
async function loadKnowledge() {
  if (state.wissen !== undefined) return state.wissen;
  try {
    const x = await getJson('wissen.json');
    const videos = (x.videos || []).map(v => ({ id: v.id, facts: { claims: v.claims }, topics: { topics: v.topics, claims: v.claims.map(c => ({ claimId: c.id, topics: c.topics })) } }));
    state.wissen = {
      raw: x,
      bundle: { config: x.config, topics: { schemaVersion: 1, topics: x.topics || [] }, entries: x.entries || [], videos },
      stats: new Map((x.topicStats || []).map(s => [s.id, s])),
      byId: FactKnowledge.topicIndex({ topics: x.topics || [] }),
      claims: new Map(videos.flatMap(v => v.facts.claims.map(c => [c.id, Object.assign({ videoId: v.id }, c)])))
    };
  } catch (e) {
    console.warn('Kein Wissensverzeichnis', e);
    state.wissen = null;
  }
  return state.wissen;
}

function topicName(id) {
  const t = state.wissen?.byId.get(id);
  return t ? t.name : id;
}
function topicPath(id) {
  return FactKnowledge.withAncestors(id).reverse().map(x => topicName(x)).join(' › ');
}
function topicHref(id) { return '#/thema/' + id.split('/').map(encodeURIComponent).join('/'); }

/* Themen eines Videos für den Kopf der Videoseite (nur öffentliche als Link-Chips, übrige still als Text). */
function videoTopicLine(videoId) {
  const w = state.wissen;
  if (!w) return '';
  const v = w.raw.videos.find(x => x.id === videoId);
  if (!v || !v.topics.length) return '';
  const order = { Schwerpunkt: 0, Behandelt: 1, 'Erwähnt': 2 };
  const items = v.topics.slice().sort((a, b) => order[a.relevance] - order[b.relevance]).map(t => {
    const pub = w.stats.get(t.topic)?.public;
    return `<a class="badge kind topic-chip${pub ? '' : ' topic-internal'}" href="${esc(topicHref(t.topic))}" title="${esc(t.relevance)}${pub ? '' : ' · noch keine eigene Themenseite in der Übersicht'}">${esc(topicName(t.topic))}</a>`;
  });
  return `<p class="topic-line"><span class="small">Themen:</span> ${items.join(' ')}</p>`;
}

function claimItem(c, videoId) {
  const url = state.index.videos.find(v => v.id === videoId)?.video?.videoUrl;
  const t = c.startSeconds != null ? (videoTimeUrl(url, c.startSeconds) ? extLink(videoTimeUrl(url, c.startSeconds), `▶ ${hms(c.startSeconds)}`) : hms(c.startSeconds)) : '';
  const srcs = (c.sources || []).slice(0, 4).map(s => `<li>${extLink(s.url, esc(s.title))}</li>`).join('');
  return `<li class="kb-item">
    <div class="claim-top">${verdictBadge(c.verdict, c.status, c.reason)}</div>
    <p class="claim-desc">${esc(c.description)}</p>
    <p class="claim-reason">${esc(c.reason)}</p>
    <p class="small kb-origin">Aus: <a href="#/video/${esc(videoId)}/aussage/${esc(c.id)}">${esc(videoName(videoId))} · ${esc(shortClaim(c.id, videoId))}</a> ${t}</p>
    ${srcs ? `<details class="kb-src"><summary>Quellen (${(c.sources || []).length})</summary><ul>${srcs}</ul></details>` : ''}
  </li>`;
}

function entryItem(x) {
  const en = x.entry;
  const srcs = en.sources.map(s => `<li>${extLink(s.url, esc(s.title))} <span class="small">${esc(s.details)}</span></li>`).join('');
  const links = x.claims.map(({ link: l, claim: c }) => {
    const vid = l.claimId.slice(0, 11);
    return `<li>${l.repo ? esc(l.repo) + ' · ' + esc(l.claimId) : `<a href="#/video/${esc(vid)}/aussage/${esc(l.claimId)}">${esc(videoName(vid))} · ${esc(shortClaim(l.claimId, vid))}</a>`}${c ? ' – ' + esc(c.description) : ''}</li>`;
  }).join('');
  return `<li class="kb-item kb-entry">
    <div class="claim-top">${verdictBadge(en.verdict, 'Abgeschlossen', en.reason)}
      <span class="badge kind">Wissenseintrag ${esc(en.id)}</span>
      ${x.recurring ? `<span class="badge plain" data-tip="Zählt nur Vorkommen in den von uns geprüften Videos – keine Aussage darüber, wie verbreitet die Behauptung allgemein ist.">In ${x.videos.length} von uns geprüften Videos</span>` : ''}</div>
    <p class="claim-desc">${esc(en.claim)}</p>
    <p class="claim-reason">${esc(en.reason)}</p>
    <p class="small">Gilt für: ${esc(en.validity.subjectScope)}, ${esc(en.validity.timeScope)} · geprüft am ${esc(deDate(en.checkedOn))}${en.revision > 1 ? ` · ${en.revision - 1} Korrektur${en.revision > 2 ? 'en' : ''} dokumentiert` : ''}</p>
    <details class="kb-src"><summary>Quellen und Videoaussagen</summary><ul>${srcs}</ul>${links ? `<h4>Vorkommen in Videos</h4><ul>${links}</ul>` : ''}</details>
  </li>`;
}

function kbSection(id, title, intro, items) {
  if (!items.length) return '';
  const html = items.map(x => x.type === 'entry' ? entryItem(x) : claimItem(x.claim, x.videoId)).join('');
  return `<section class="section" id="${id}"><div class="section-head"><h2>${esc(title)} <span class="count">${items.length}</span></h2></div>
    <p class="small kb-intro">${intro}</p><ul class="kb-list">${html}</ul></section>`;
}

/* Öffentliches Korrekturprotokoll: umgesetzte Korrekturen mit vorher/nachher, Grund, Quellen und Datum. */
function correctionSection(list, intro) {
  if (!list || !list.length) return '';
  const target = id => {
    const vid = id.slice(0, 11);
    return /^[A-Za-z0-9_-]{11}-A\d{4,}$/.test(id) ? `<a href="#/video/${esc(vid)}/aussage/${esc(id)}">${esc(videoName(vid))} · ${esc(shortClaim(id, vid))}</a>` : `Wissenseintrag ${esc(id)}`;
  };
  const val = v => esc(typeof v === 'string' ? v : JSON.stringify(v));
  const items = list.map(c => `<li class="kb-item kb-correction">
    <div class="claim-top"><span class="badge kind">Korrektur ${esc(c.id)}</span> <span class="badge plain">${esc(c.kind)}</span></div>
    <p class="claim-desc">${esc(c.description)}</p>
    <ul class="kb-changes">${c.changes.map(ch => `<li>${target(ch.target)}: ${ch.field === 'verdict' ? 'Bewertung' : esc(ch.field)} <s>${val(ch.before)}</s> → <strong>${val(ch.after)}</strong></li>`).join('')}</ul>
    <p class="small">Entschieden am ${esc(deDate(c.date))} (${esc(c.decidedBy)}): ${esc(c.basis)}</p>
    ${c.evidence.length ? `<details class="kb-src"><summary>Quellen der Korrektur (${c.evidence.length})</summary><ul>${c.evidence.map(v => `<li>${extLink(v.url, esc(v.title))} <span class="small">abgerufen ${esc(deDate(v.accessedOn))}: ${esc(v.finding)}</span></li>`).join('')}</ul></details>` : ''}
  </li>`).join('');
  return `<section class="section" id="korrekturen"><div class="section-head"><h2>Korrekturen <span class="count">${list.length}</span></h2></div>
    <p class="small kb-intro">${intro}</p><ul class="kb-list">${items}</ul></section>`;
}

async function pageTopics() {
  const w = await loadKnowledge();
  if (!w) {
    setPage(`<div class="wrap"><nav class="crumbs" aria-label="Brotkrumen"><a href="#/">Faktenchecks</a> / Themen</nav><p class="notice">Die Themenübersicht ist noch nicht verfügbar.</p></div>`, 'themen');
    return;
  }
  const roots = w.raw.topics.filter(t => t.level === 'Hauptthema' && !t.mergedInto);
  const pub = roots.filter(t => w.stats.get(t.id)?.public);
  const card = t => {
    const s = w.stats.get(t.id);
    const subs = w.raw.topics.filter(x => x.parent === t.id && !x.mergedInto && w.stats.get(x.id)?.public);
    return `<a class="card topic-card" href="${esc(topicHref(t.id))}">
      <h3>${esc(t.name)}</h3>
      <p class="meta">${s.claims} zugeordnete Aussagen aus ${s.videos.length} Videos</p>
      ${t.description ? `<p class="small">${esc(t.description)}</p>` : ''}
      ${subs.length ? `<p class="small topic-subs">${subs.map(x => esc(x.name)).join(' · ')}</p>` : ''}
    </a>`;
  };
  const others = w.raw.topics.filter(t => !t.mergedInto && !w.stats.get(t.id)?.public && (w.stats.get(t.id)?.claims || 0) > 0);
  setPage(`<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumen"><a href="#/">Faktenchecks</a> / Themen</nav>
    <header class="video-head"><h1>Themen</h1>
      <p class="lead" style="color:var(--text-2);max-width:70ch">Was wir zu einem Thema bereits geprüft haben: belegte Tatsachen, widerlegte oder irreführende Behauptungen und offene Fragen, jeweils mit Quellen und der Stelle im Video. Die Übersicht wächst mit jedem geprüften Video.</p>
      <p class="small">Ein Thema erhält eine eigene Kategorie, sobald es in mindestens ${esc(w.raw.config.publicTopics.minVideos)} geprüften Videos ausreichend behandelt wurde. <a href="#/methodik#themen">So entstehen Themen und Empfehlungen</a></p>
    </header>
    <section class="section"><label class="kb-search"><span>Thema oder Behauptung suchen</span>
      <input type="search" id="kb-q" placeholder="z. B. Windkraft, Inflation, Stasi" autocomplete="off"></label>
      <div id="kb-results" aria-live="polite"></div></section>
    <section class="section"><div class="cards">${pub.map(card).join('')}</div></section>
    ${others.length ? `<section class="section"><div class="section-head"><h2>Weitere Themen</h2><p>Noch in zu wenigen Videos behandelt für eine eigene Kategorie.</p></div>
      <p class="topic-others">${others.map(t => `<a class="badge kind topic-chip topic-internal" href="${esc(topicHref(t.id))}">${esc(topicPath(t.id))}</a>`).join(' ')}</p></section>` : ''}
    ${correctionSection(w.raw.corrections, 'Wenn wir einen Fehler in einer früheren Bewertung finden, korrigieren wir ihn überall, wo er vorkommt, und dokumentieren hier die alte und neue Bewertung, den Grund und die Quellen.')}
  </div>`, 'themen');
  document.title = 'Themen – Politik4M3 Faktencheck Ungeskriptet';
  const q = document.getElementById('kb-q');
  const out = document.getElementById('kb-results');
  const items = w.raw.topics.filter(t => !t.mergedInto).map(t => ({ kind: 'Thema', id: t.id, text: [t.name, ...t.aliases, t.description || ''].join(' ') }))
    .concat([...w.claims.values()].filter(c => c.status === 'Abgeschlossen' && c.kind === 'Tatsachenbehauptung').map(c => ({ kind: 'Aussage', id: c.id, text: c.description })));
  let timer = null;
  q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const v = q.value.trim();
      if (v.length < 3) { out.innerHTML = ''; return; }
      const res = FactKnowledge.search(v, items, { limit: 12, min: 0.08 });
      out.innerHTML = res.length ? `<ul class="kb-results">${res.map(r => {
        if (r.kind === 'Thema') return `<li><span class="badge kind">Thema</span> <a href="${esc(topicHref(r.id))}">${esc(topicPath(r.id))}</a></li>`;
        const c = w.claims.get(r.id);
        return `<li>${verdictBadge(c.verdict, c.status, c.reason)} <a href="#/video/${esc(c.videoId)}/aussage/${esc(c.id)}">${esc(c.description)}</a> <span class="small">${esc(videoName(c.videoId))}</span></li>`;
      }).join('')}</ul>` : '<p class="small">Keine Treffer. Andere Begriffe versuchen.</p>';
      bindTips(out);
    }, 150);
  });
  window.scrollTo(0, 0);
}

async function pageTopic(id) {
  const w = await loadKnowledge();
  if (!w) return pageTopics();
  const p = FactKnowledge.topicPage(id, w.bundle);
  if (!p) { setPage(`<div class="wrap"><nav class="crumbs" aria-label="Brotkrumen"><a href="#/">Faktenchecks</a> / <a href="#/themen">Themen</a></nav><p class="notice warn">Dieses Thema gibt es nicht.</p></div>`, 'themen'); return; }
  if (p.topic.id !== id) { location.replace(topicHref(p.topic.id)); return; }
  const t = p.topic;
  const s = w.stats.get(t.id) || { public: false, videos: [], claims: 0, reason: '' };
  const crumbs = FactKnowledge.withAncestors(t.id).reverse().map(x => x === t.id ? `<span aria-current="page">${esc(topicName(x))}</span>` : `<a href="${esc(topicHref(x))}">${esc(topicName(x))}</a>`).join(' / ');
  const subs = w.raw.topics.filter(x => x.parent === t.id && !x.mergedInto && (w.stats.get(x.id)?.claims || 0) > 0);
  const sec = p.sections;
  const recs = p.recommendations.map(r => {
    const seg = r.segments[0];
    const url = state.index.videos.find(v => v.id === r.videoId)?.video?.videoUrl;
    return `<li class="kb-item"><a href="#/video/${esc(r.videoId)}"><strong>${esc(videoName(r.videoId))}</strong></a>
      ${seg ? `<p class="small">Abschnitt ${videoTimeUrl(url, seg.startSeconds) ? extLink(videoTimeUrl(url, seg.startSeconds), `▶ ${hms(seg.startSeconds)}–${hms(seg.endSeconds)}`) : ''}: ${esc(seg.note)}</p>` : ''}
      <p class="small">Warum: ${esc(r.reason)}</p></li>`;
  }).join('');
  const empty = !sec.belegt.length && !sec.teilweise.length && !sec.falsch.length && !sec.unbelegt.length;
  setPage(`<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumen"><a href="#/">Faktenchecks</a> / <a href="#/themen">Themen</a> / ${crumbs}</nav>
    <header class="video-head"><h1>${esc(t.name)}</h1>
      ${t.description ? `<p class="lead" style="color:var(--text-2);max-width:70ch">${esc(t.description)}</p>` : ''}
      <p class="small">${s.claims} zugeordnete Aussagen aus ${s.videos.length || 'bisher keinem'} ${s.videos.length === 1 ? 'Video' : 'Videos'} mit ausreichender Behandlung.${s.public ? '' : ' Dieses Thema hat noch keine eigene Kategorie in der Übersicht: ' + esc(s.reason)}</p>
      ${subs.length ? `<p class="topic-others">${subs.map(x => `<a class="badge kind topic-chip" href="${esc(topicHref(x.id))}">${esc(x.name)}</a>`).join(' ')}</p>` : ''}
      <p class="small">Hier erscheinen nur abgeschlossen bewertete Tatsachenbehauptungen. Meinungen, Prognosen und noch nicht geprüfte Aussagen stehen auf den Videoseiten.</p>
    </header>
    ${empty ? '<p class="notice">Zu diesem Thema gibt es noch keine abgeschlossen bewerteten Tatsachenbehauptungen.</p>' : ''}
    ${kbSection('belegt', 'Belegte Tatsachen', 'Aussagen, die unsere Prüfungen mit Quellen bestätigt haben – auch das ist ein Ergebnis.', sec.belegt)}
    ${kbSection('teilweise', 'Teilweise belegt', 'Ein wesentlicher Teil stimmt, ein anderer ist ungenau oder zu weit gefasst. Die Begründung sagt, welcher.', sec.teilweise)}
    ${kbSection('falsch', 'Falsche oder irreführende Behauptungen', 'Widerlegt oder irreführend, mit Begründung, was nicht stimmt oder welcher Kontext fehlt.', sec.falsch)}
    ${kbSection('unbelegt', 'Nicht ausreichend belegt', 'Recherchiert, aber die Quellen reichen weder für eine Bestätigung noch für eine Widerlegung. Das heißt ausdrücklich nicht „falsch“.', sec.unbelegt)}
    ${recs ? `<section class="section" id="empfehlungen"><div class="section-head"><h2>Passende Videos</h2></div>
      <p class="small kb-intro">Videos, deren Aussagen zu diesem Thema überwiegend belegt sind. Gezählt werden nur Aussagen zu diesem Thema, nicht das ganze Video und nicht die Person. <a href="#/methodik#themen">Regel</a></p>
      <ul class="kb-list">${recs}</ul></section>` : ''}
    ${correctionSection((w.raw.corrections || []).filter(c => c.topics.some(x => FactKnowledge.withAncestors(x).includes(t.id))), 'Korrigierte frühere Bewertungen zu diesem Thema, mit alter und neuer Bewertung, Grund und Quellen.')}
  </div>`, 'themen');
  document.title = t.name + ' – Themen – Politik4M3 Faktencheck Ungeskriptet';
  window.scrollTo(0, 0);
}
