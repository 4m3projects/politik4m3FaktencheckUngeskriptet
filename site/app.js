/*
 * Politik4M3 Faktencheck Ungeskriptet – statische Webseite.
 * Eigener Code ohne Fremdbibliotheken. Liest ausschließlich die vom Workflow
 * bereitgestellten Projektdateien unter daten/ (Schema-2-JSON und eigene Markdown-Berichte).
 * Keine externen Anfragen und keine Speicherung von Nutzerdaten. Einzige Ausnahme: In der
 * Video-Ansicht wird der YouTube-Player erst nach ausdrücklichem Klick auf „Video laden“
 * nachgeladen (youtube-nocookie.com). Lokal gemerkt werden nur Anzeigevorlieben (Layout, Mitscrollen).
 */
'use strict';

const DATA = 'daten/';
const VERDICTS = [
  { name: 'Belegt', key: 'belegt', text: 'Die geprüfte Tatsachenbehauptung wird durch geeignete, gelesene Quellen gestützt.' },
  { name: 'Teilweise belegt', key: 'teilweise', text: 'Ein wesentlicher Teil stimmt, ein anderer Teil ist ungenau, zu weit gefasst oder nicht gestützt.' },
  { name: 'Irreführend / Kontext fehlt', key: 'irrefuehrend', text: 'Einzelangaben können stimmen, der entstehende Eindruck ist ohne fehlenden Kontext aber schief.' },
  { name: 'Widerlegt', key: 'widerlegt', text: 'Geeignete Quellen sprechen klar gegen die Behauptung.' },
  { name: 'Nicht ausreichend belegbar', key: 'unbelegbar', text: 'Begründetes Ergebnis nach Recherche: Mit zugänglichen Quellen weder bestätigt noch widerlegt. Das ist kein Urteil „falsch“.' },
  { name: 'Meinung / Prognose', key: 'meinung', text: 'Wertung oder Vorhersage; nicht als wahr oder falsch bewertbar. Überprüfbare Voraussetzungen werden gesondert betrachtet.' }
];
const STATUS = [
  { name: 'Nicht überprüfbar', key: 'nichtpruefbar', text: 'Abschließend eingeordnet: Mit öffentlich zugänglichen Quellen nicht überprüfbar, der Grund steht in der Begründung. Es wird keine Bewertung geraten; nicht überprüfbar heißt nicht falsch.' },
  { name: 'In Bearbeitung', key: 'bearbeitung', text: 'Die Prüfung läuft; noch keine Endbewertung.' },
  { name: 'Offen', key: 'offen', text: 'Erfasst, aber noch nicht abschließend recherchiert; noch keine Endbewertung.' }
];
const VKEY = Object.fromEntries(VERDICTS.map(v => [v.name, v.key]));

const state = { index: null, videos: new Map(), md: new Map(), tip: null, cleanup: null, relations: { relations: [] }, rel: null };

/* ---------- Hilfsfunktionen ---------- */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function safeUrl(u) {
  return /^https:\/\//i.test(String(u || '')) ? String(u) : null;
}
function extLink(url, label) {
  const u = safeUrl(url);
  return u ? `<a href="${esc(u)}" rel="noopener noreferrer" target="_blank">${label}</a>` : label;
}
function hms(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const p = n => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}
function deDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso || '');
}
function videoTimeUrl(url, sec) {
  const u = safeUrl(url);
  if (!u) return null;
  return u + (u.includes('?') ? '&' : '?') + 't=' + Math.max(0, Math.floor(sec)) + 's';
}
function num(n) { return Number(n).toLocaleString('de-DE'); }
function pct(n) { return n == null ? '–' : Number(n).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %'; }

async function getJson(path) {
  const r = await fetch(DATA + path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(path + ': HTTP ' + r.status);
  return r.json();
}
async function getText(path) {
  if (state.md.has(path)) return state.md.get(path);
  const r = await fetch(DATA + path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(path + ': HTTP ' + r.status);
  const t = await r.text();
  state.md.set(path, t);
  return t;
}

function repoUrl() { return 'https://github.com/' + (state.index?.repository || '4m3projects/politik4m3FaktencheckUngeskriptet'); }
function blobUrl(repoPath) {
  const ref = state.index?.commit || 'main';
  return repoUrl() + '/blob/' + ref + '/' + repoPath.split('/').map(encodeURIComponent).join('/');
}

/* Offene Aussagen, deren Begründung mit „Nicht überprüfbar“/„Nicht überprüft“ beginnt, sind nach
   abgeschlossener Recherche bewusst ohne Bewertung eingeordnet und werden als solche angezeigt. */
function isUnverifiable(c) {
  return !!c && !c.verdict && c.status !== 'Abgeschlossen' && /^Nicht überprüf(bar|t)\b/.test(c.reason || '');
}
function verdictBadge(verdict, status, reason) {
  if (verdict) {
    return `<span class="badge"><i class="fill-${VKEY[verdict] || 'offen'}" aria-hidden="true"></i>${esc(verdict)}</span>`;
  }
  if (isUnverifiable({ verdict, status, reason })) {
    return `<span class="badge"><i class="fill-nichtpruefbar" aria-hidden="true"></i>Nicht überprüfbar</span>`;
  }
  const key = status === 'In Bearbeitung' ? 'bearbeitung' : 'offen';
  return `<span class="badge plain"><i class="fill-${key}" aria-hidden="true"></i>${esc(status || 'Offen')} · noch ohne Bewertung</span>`;
}
/* Abgeschlossene Recherche: coverageNote beginnt mit „Recherche abgeschlossen“. */
function researchDone(scope) {
  return /^Recherche abgeschlossen\b/.test(scope?.coverageNote || '');
}
function bucketOf(c) {
  if (c.verdict) return VKEY[c.verdict] || 'offen';
  if (isUnverifiable(c)) return 'nichtpruefbar';
  return c.status === 'In Bearbeitung' ? 'bearbeitung' : 'offen';
}

/* Verteilung aller strukturierten Aussagen: Endbewertungen plus offene/laufende Prüfungen. */
function distribution(claims) {
  const buckets = [...VERDICTS, ...STATUS].map(b => ({ ...b, n: 0 }));
  for (const c of claims) {
    const b = buckets.find(x => x.key === bucketOf(c));
    if (b) b.n++;
  }
  const total = claims.length || 1;
  const bar = buckets.filter(b => b.n > 0).map(b =>
    `<span class="fill-${b.key}" style="flex:${b.n}" data-tip="${esc(b.name)}: ${b.n} von ${claims.length} (${pct(b.n / total * 100)})"></span>`).join('');
  const legend = buckets.filter(b => b.n > 0).map(b =>
    `<li><i class="fill-${b.key}" aria-hidden="true"></i>${esc(b.name)} <b>${b.n}</b></li>`).join('');
  const label = buckets.filter(b => b.n > 0).map(b => `${b.name}: ${b.n}`).join(', ');
  return `<div class="dist" role="img" aria-label="Verteilung der ${claims.length} strukturierten Aussagen – ${esc(label)}">${bar}</div><ul class="legend">${legend}</ul>`;
}

function bindTips(root) {
  root.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('pointerenter', e => showTip(e, el.dataset.tip));
    el.addEventListener('pointermove', e => moveTip(e));
    el.addEventListener('pointerleave', hideTip);
  });
}
function showTip(e, text) {
  if (!state.tip) { state.tip = document.createElement('div'); state.tip.className = 'dist-tip'; document.body.appendChild(state.tip); }
  state.tip.textContent = text; state.tip.hidden = false; moveTip(e);
}
function moveTip(e) {
  if (!state.tip) return;
  const w = state.tip.offsetWidth;
  state.tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, e.clientX - w / 2)) + 'px';
  state.tip.style.top = (e.clientY - 40) + 'px';
}
function hideTip() { if (state.tip) state.tip.hidden = true; }

/* ---------- Kleiner Markdown-Renderer für die eigenen Berichte ---------- */
/* Unterstützt Überschriften, Absätze, Listen, Tabellen, Fett, Code und Links. HTML im Quelltext wird immer maskiert. */

function resolvePath(baseDir, href) {
  const parts = (baseDir ? baseDir.split('/') : []);
  for (const seg of href.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop(); else parts.push(seg);
  }
  return parts.join('/');
}

function mdLink(text, href, ctx) {
  const [path, frag] = href.split('#');
  if (/^https:\/\//i.test(href)) return `<a href="${esc(href)}" rel="noopener noreferrer" target="_blank">${text}</a>`;
  if (/^[a-z]+:/i.test(href)) return text; // andere Schemata werden nicht verlinkt
  if (!path && frag) return `<a href="#/video/${esc(ctx.videoId)}/bericht/${esc(ctx.file)}">${text}</a>`;
  // Repositorypfad relativ zur aktuellen Datei auflösen.
  const fileDir = ctx.file.includes('/') ? ctx.file.slice(0, ctx.file.lastIndexOf('/')) : '';
  const repoPath = resolvePath('faktenchecks/' + ctx.videoId + (fileDir ? '/' + fileDir : ''), decodeURIComponent(path));
  const prefix = 'faktenchecks/' + ctx.videoId + '/';
  if (repoPath.startsWith(prefix) && repoPath.endsWith('.md') && ctx.files.includes(repoPath.slice(prefix.length))) {
    return `<a href="#/video/${esc(ctx.videoId)}/bericht/${esc(repoPath.slice(prefix.length))}">${text}</a>`;
  }
  if (repoPath.startsWith(prefix) && /strukturiert\/aussagen\.json$/.test(repoPath)) {
    return `<a href="#/video/${esc(ctx.videoId)}">${text}</a>`;
  }
  return `<a href="${esc(blobUrl(repoPath))}" rel="noopener noreferrer" target="_blank">${text}</a>`;
}

function mdInline(src, ctx) {
  const codes = [];
  let s = esc(src).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => mdLink(text, href.replace(/&amp;/g, '&'), ctx));
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  return s;
}

function slug(text) {
  return 'h-' + text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function renderMarkdown(src, ctx) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const isBlockStart = l => /^(#{1,6}\s|\s*[-*]\s|\s*\d+\.\s|\||```)/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = /^```/.exec(line))) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
      const lvl = Math.min(m[1].length, 4);
      const html = mdInline(m[2], ctx);
      out.push(`<h${lvl} id="${esc(slug(m[2]))}">${html}</h${lvl}>`);
      i++; continue;
    }
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.replace(/^\||\|\s*$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]);
      const align = rows[1] && /^\|?[\s:|-]+$/.test(rows[1]) ? cells(rows[1]).map(a => /:$/.test(a) ? 'r' : '') : null;
      const body = rows.slice(align ? 2 : 1);
      const cls = j => (align && align[j] ? ` class="${align[j]}"` : '');
      out.push('<div class="table-wrap"><table><thead><tr>' + head.map((c, j) => `<th${cls(j)}>${mdInline(c, ctx)}</th>`).join('') +
        '</tr></thead><tbody>' + body.map(r => '<tr>' + cells(r).map((c, j) => `<td${cls(j)}>${mdInline(c, ctx)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) {
        let item = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '');
        const numMatch = /^\s*(\d+)\./.exec(lines[i]);
        i++;
        while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) item += ' ' + lines[i++].trim();
        items.push({ html: mdInline(item, ctx), n: numMatch ? numMatch[1] : null });
      }
      if (ordered) {
        out.push('<ol>' + items.map(it => `<li value="${esc(parseInt(it.n, 10))}">${it.html}</li>`).join('') + '</ol>');
      } else {
        out.push('<ul>' + items.map(it => `<li>${it.html}</li>`).join('') + '</ul>');
      }
      continue;
    }
    const buf = [line.trim()]; i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++].trim());
    out.push(`<p>${mdInline(buf.join(' '), ctx)}</p>`);
  }
  return out.join('\n');
}

/* Kennzeichnet in Berichten Bewertungszeilen zusätzlich mit dem Farbabzeichen. */
function decorateVerdicts(root) {
  root.querySelectorAll('li').forEach(li => {
    const strong = li.querySelector('strong');
    if (!strong || !/^Bewertung:?$/.test(strong.textContent.trim())) return;
    const txt = li.textContent.replace(/^\s*Bewertung:?\s*/, '').trim().toLowerCase();
    const v = VERDICTS.find(x => txt.startsWith(x.name.toLowerCase()));
    if (v) li.insertAdjacentHTML('beforeend', ` <i class="badge verdict-inline" aria-hidden="true"><i class="fill-${v.key}"></i></i>`);
  });
}

/* README-Stichpunkte („- Kanal: …“) als Metadaten lesen; nur eigene Projektangaben. */
function readmeMeta(md) {
  const meta = {};
  for (const line of md.split('\n')) {
    if (/^##\s/.test(line)) break;
    const m = /^-\s+([^:]{2,60}):\s+(.+)$/.exec(line.trim());
    if (m) meta[m[1].trim()] = m[2].trim();
  }
  const status = /\*\*Status:\s*([^*]+)\*\*/.exec(md);
  if (status) meta.Status = status[1].trim().replace(/\.$/, '');
  return meta;
}
function stripMd(s) { return String(s || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, ''); }

/* ---------- Daten laden ---------- */

async function loadVideo(id) {
  if (state.videos.has(id)) return state.videos.get(id);
  const entry = state.index.videos.find(v => v.id === id);
  if (!entry) throw new Error('Unbekanntes Video: ' + id);
  const [readme, data, stats, rhet] = await Promise.all([
    getText(id + '/README.md').catch(() => ''),
    entry.structured ? getJson(id + '/strukturiert/aussagen.json') : Promise.resolve(null),
    entry.structured ? getJson(id + '/strukturiert/statistik.json').catch(() => null) : Promise.resolve(null),
    /* Zweite Ebene (Rhetorik) ist optional; fehlt sie, gilt das Video als rhetorisch noch nicht geprüft. */
    entry.rhetoric ? getJson(id + '/rhetorik.json').catch(() => null) : Promise.resolve(null)
  ]);
  const v = { ...entry, readme, meta: readmeMeta(readme), data, stats, rhet };
  state.videos.set(id, v);
  return v;
}

/* ---------- YouTube-Vorschaubilder nur nach Zustimmung ---------- */
/* Ohne Zustimmung lädt die Seite keine Bilder von YouTube. Die Wahl wird nur im eigenen Browser
   gespeichert und lässt sich in der Fußzeile jederzeit ändern. */
const THUMB_KEY = 'p4m3.ytVorschaubilder';
function thumbChoice() {
  try { const v = localStorage.getItem(THUMB_KEY); return v === 'ja' || v === 'nein' ? v : null; } catch (e) { return state.thumbChoice || null; }
}
function setThumbChoice(v) {
  state.thumbChoice = v;
  try { localStorage.setItem(THUMB_KEY, v); } catch (e) { /* ohne Speicher gilt die Wahl nur für diesen Aufruf */ }
  updateThumbSetting();
  route();
}
function ytIdOf(videoId, url) {
  const fromUrl = FactSync.youtubeId(url);
  return fromUrl || (/^[A-Za-z0-9_-]{11}$/.test(videoId || '') ? videoId : null);
}
function thumbImg(videoId, url, cls = 'thumb') {
  if (thumbChoice() !== 'ja') return '';
  const id = ytIdOf(videoId, url);
  return id ? `<img class="${cls}" src="https://i.ytimg.com/vi/${esc(id)}/mqdefault.jpg" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="320" height="180">` : '';
}
function thumbPrompt() {
  if (thumbChoice()) return '';
  return `<div class="notice thumb-ask" role="region" aria-label="Vorschaubilder von YouTube">
    <p><strong>Vorschaubilder von YouTube anzeigen?</strong> Dann lädt dein Browser die Bilder direkt von YouTube (i.ytimg.com, Google); dabei werden mindestens deine IP-Adresse und technische Gerätedaten übertragen. Ohne Zustimmung lädt diese Seite nichts von YouTube. Die Wahl wird nur in deinem Browser gespeichert und lässt sich unten in der Fußzeile ändern.</p>
    <div class="btn-row"><button type="button" class="btn" data-thumbs="ja">Vorschaubilder anzeigen</button><button type="button" class="btn ghost" data-thumbs="nein">Nein, danke</button></div>
  </div>`;
}
function updateThumbSetting() {
  const b = document.getElementById('thumb-setting');
  if (!b) return;
  const on = thumbChoice() === 'ja';
  b.textContent = on ? 'YouTube-Vorschaubilder: an (ausschalten)' : 'YouTube-Vorschaubilder: aus (einschalten)';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-thumbs]');
  if (b) { setThumbChoice(b.dataset.thumbs); return; }
  if (e.target.closest('#thumb-setting')) setThumbChoice(thumbChoice() === 'ja' ? 'nein' : 'ja');
});

/* ---------- Originale, Reaktionen und Beziehungen (site/relations.js) ---------- */

function roleOf(id) { return state.index.videos.find(v => v.id === id)?.video?.role || null; }
function entryOf(id) { return state.index.videos.find(v => v.id === id) || null; }
function videoName(id) {
  const e = entryOf(id);
  return e ? (e.video?.title || e.title) : id;
}
function shortClaim(id, videoId) { return String(id || '').replace(videoId + '-', ''); }
function reactionTypeName(t) { return FactRelations.REACTION_TYPES[t] || t || ''; }
function stateBadge(st) {
  const cls = st === 'konflikt' ? 'conflict' : st === 'geklaert' ? 'resolved' : st === 'stimmig' ? 'ok' : 'neutral';
  return `<span class="badge rel-state rel-${cls}">${st === 'konflikt' ? '⚠ ' : ''}${esc(FactRelations.STATE_TEXT[st])}</span>`;
}
/* Verknüpfte Videos (beide Seiten) laden, damit Aussagen gegenübergestellt werden können. */
async function loadLinked(relations) {
  const ids = new Set();
  for (const r of relations) { ids.add(r.originalVideoId); ids.add(r.reactionVideoId); }
  const out = new Map();
  await Promise.all([...ids].map(async id => { out.set(id, await loadVideo(id).catch(() => null)); }));
  return out;
}
function claimOf(videos, videoId, claimId) {
  return (videos.get(videoId)?.data?.claims || []).find(c => c.id === claimId) || null;
}
function linkView(r, l, videos) {
  const oc = claimOf(videos, r.originalVideoId, l.originalClaimId);
  const rc = l.reactionClaimId ? claimOf(videos, r.reactionVideoId, l.reactionClaimId) : null;
  return { oc, rc, cmp: FactRelations.compareLink(l, oc, rc) };
}
function claimSide(label, videoId, claimId, c) {
  if (!claimId) return `<div class="cmp-side"><div class="cmp-label">${esc(label)}</div><p class="small">Keine eigene Aussage verknüpft.</p></div>`;
  const srcs = c ? Object.fromEntries(sourcesOf(videoId).map(s => [s.id, s])) : {};
  const refs = (c?.sourceRefs || []).slice(0, 4).map(ref => {
    const s = srcs[ref.sourceId];
    return `<li>${s ? extLink(s.url, esc(s.title)) : esc(ref.sourceId)}</li>`;
  }).join('');
  return `<div class="cmp-side"><div class="cmp-label">${esc(label)} · <a href="#/video/${esc(videoId)}/aussage/${esc(claimId)}">${esc(shortClaim(claimId, videoId))}</a></div>
    ${c ? `${verdictBadge(c.verdict, c.status, c.reason)}<p class="cmp-desc">${esc(c.description)}</p><p class="small">${esc(c.reason)}</p>${refs ? `<ul class="sources small">${refs}</ul>` : ''}` : '<p class="small">Aussage nicht gefunden.</p>'}
  </div>`;
}
function sourcesOf(videoId) { return state.videos.get(videoId)?.data?.sources || []; }

function linkCard(r, l, videos) {
  const { oc, rc, cmp } = linkView(r, l, videos);
  const t = l.reactionSeconds != null ? ` · Stelle in der Reaktion ${hms(l.reactionSeconds)}` : '';
  const res = l.resolution ? `<div class="notice"><strong>${esc(FactRelations.RESOLUTIONS[l.resolution.status])}</strong> (${esc(deDate(l.resolution.date))}): ${esc(l.resolution.note)}
      <ul class="small">${l.resolution.sources.map(u => `<li>${extLink(u, esc(u))}</li>`).join('')}</ul></div>` : '';
  const rev = l.review ? `<p class="small">Review-Aufgabe: ${extLink(l.review.task, esc(l.review.task))} – ${esc(l.review.note)}</p>` : '';
  const hist = (l.history || []).map(h => `<li>${esc(deDate(h.date))}: ${esc(h.change)}</li>`).join('');
  return `<article class="cmp${cmp.state === 'konflikt' ? ' cmp-conflict' : ''}" id="${esc(l.id)}">
    <div class="claim-top">${stateBadge(cmp.state)}<span class="badge kind">${esc(FactRelations.LINK_TYPES[l.type])}</span><span class="small">${esc(l.id)}${t}</span></div>
    <p>${esc(l.note)}</p>
    ${cmp.state === 'konflikt' ? '<p class="notice warn"><strong>Prüfkonflikt:</strong> Die beiden Bewertungen widersprechen sich und sind noch nicht geklärt. Keine der beiden Bewertungen ist deshalb automatisch richtig; die Quellen beider Seiten stehen unten gegenüber.</p>' : ''}
    <div class="cmp-grid">${claimSide('Original: ' + videoName(r.originalVideoId), r.originalVideoId, l.originalClaimId, oc)}${claimSide('Reaktion: ' + videoName(r.reactionVideoId), r.reactionVideoId, l.reactionClaimId, rc)}</div>
    ${res}${rev}${hist ? `<details><summary>Korrekturverlauf</summary><ul class="small">${hist}</ul></details>` : ''}
  </article>`;
}

function relationSummary(r, videos, side) {
  const other = side === 'original' ? r.reactionVideoId : r.originalVideoId;
  const e = entryOf(other);
  const conflicts = (r.claimLinks || []).filter(l => linkView(r, l, videos).cmp.state === 'konflikt').length;
  const thumb = thumbImg(other, e?.video?.videoUrl, 'rel-thumb');
  return `<li class="rel-item${thumb ? ' has-thumb' : ''}">
    ${thumb ? `<a href="#/video/${esc(other)}" tabindex="-1" aria-hidden="true">${thumb}</a>` : ''}
    <div class="rel-body">
    <a href="#/video/${esc(other)}"><strong>${esc(videoName(other))}</strong></a>
    <div class="small">${esc(e?.video?.channel || '')}${side === 'original' && e?.video?.reactionType ? ' · ' + esc(reactionTypeName(e.video.reactionType)) : ''} · Analyse: ${esc(e?.video?.workStatus || 'unbekannt')} · Zuordnung ${esc(r.certainty.toLowerCase())}</div>
    <div class="small">${esc(r.basis)}</div>
    <div class="small">${(r.claimLinks || []).length} verknüpfte Aussagen${conflicts ? ` · <span class="rel-conflict-text">⚠ ${conflicts} offene${conflicts === 1 ? 'r' : ''} Prüfkonflikt${conflicts === 1 ? '' : 'e'}</span>` : ''}</div>
    </div>
  </li>`;
}

/* Abschnitt auf der Detailseite: Reaktionen zu einem Original bzw. Bezüge einer Reaktion. */
async function relationsSection(v) {
  const role = v.video?.role;
  if (role === 'original') {
    const rels = state.rel.byOriginal.get(v.id) || [];
    const videos = await loadLinked(rels);
    const links = rels.flatMap(r => (r.claimLinks || []).map(l => linkCard(r, l, videos))).join('');
    return `<section class="section" id="reaktionen" aria-labelledby="h-reaktionen">
      <div class="section-head"><h2 id="h-reaktionen">Reaktionen und weitere Faktenchecks</h2>
      <p>Videos anderer Kanäle, die sich nachweislich auf dieses Interview beziehen. Ihre Aussagen werden eigenständig geprüft; der Faktencheck dieses Interviews ist dafür Kontext, kein Wahrheitsmaßstab.</p></div>
      ${rels.length ? `${thumbPrompt()}<ul class="rel-list">${rels.map(r => relationSummary(r, videos, 'original')).join('')}</ul>` : '<p class="muted">Noch keine Reaktionen zugeordnet.</p>'}
      ${links ? `<h3 style="margin-top:20px">Gegenüberstellung verknüpfter Aussagen</h3><div class="cmp-list">${links}</div>` : ''}
    </section>`;
  }
  if (role === 'reaction') {
    const rels = state.rel.byReaction.get(v.id) || [];
    const videos = await loadLinked(rels);
    const links = rels.flatMap(r => (r.claimLinks || []).map(l => linkCard(r, l, videos))).join('');
    return `<section class="section" id="bezuege" aria-labelledby="h-bezuege">
      <div class="section-head"><h2 id="h-bezuege">Bezüge auf Originalinterviews</h2>
      <p>Wiedergaben und eigene Behauptungen dieser Reaktion, verknüpft mit den geprüften Aussagen des Originals.</p></div>
      ${rels.length ? `${thumbPrompt()}<ul class="rel-list">${rels.map(r => relationSummary(r, videos, 'reaction')).join('')}</ul>` : '<p class="muted">Noch keinem Original zugeordnet.</p>'}
      ${links ? `<div class="cmp-list">${links}</div>` : ''}
    </section>`;
  }
  return '';
}

/* Kurze Rolle im Kopf jeder Videoseite, bei Reaktionen mit Rückverlinkung. */
function roleLine(v) {
  const m = v.video;
  if (!m) return '<p class="role-line small">Noch nicht als Original oder Reaktion eingeordnet.</p>';
  if (m.role === 'original') {
    const n = (state.rel.byOriginal.get(v.id) || []).length;
    return `<p class="role-line"><span class="badge kind">Originalinterview</span>${n ? ` <a href="#/video/${esc(v.id)}/reaktionen">${n} zugeordnete Reaktion${n === 1 ? '' : 'en'}</a>` : ''}</p>`;
  }
  const origs = (state.rel.byReaction.get(v.id) || []).map(r => `<a href="#/video/${esc(r.originalVideoId)}">${esc(videoName(r.originalVideoId))}</a>`);
  return `<p class="role-line"><span class="badge kind">${esc(reactionTypeName(m.reactionType))}</span> von ${esc(m.channel)}${origs.length ? ` · bezieht sich auf: ${origs.join(', ')}` : ''}</p>`;
}

/* ---------- Seiten ---------- */

const main = () => document.getElementById('inhalt');

function setPage(html, nav) {
  hideTip();
  main().style.minHeight = '';
  main().innerHTML = html;
  document.querySelectorAll('.mainnav a[data-nav]').forEach(a => {
    if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  bindTips(main());
}

function videoFacts(v) {
  const m = v.meta;
  const items = [];
  if (m.Kanal) items.push(`<li>Kanal: <strong>${esc(stripMd(m.Kanal))}</strong></li>`);
  const pub = m['Veröffentlichung laut erfassten Metadaten'] || m['Veröffentlichung'];
  if (pub) items.push(`<li>Veröffentlicht: <strong>${esc(stripMd(pub))}</strong></li>`);
  if (m.Laufzeit) items.push(`<li>Laufzeit: <strong>${esc(stripMd(m.Laufzeit))}</strong></li>`);
  if (v.data?.scope?.asOf) items.push(`<li>Datenstand: <strong>${esc(deDate(v.data.scope.asOf))}</strong></li>`);
  return items.join('');
}

function rhetHomeLine(v) {
  const st = FactRhetoric.reviewState(v.rhet);
  if (!v.rhet) return 'Darstellung (Rhetorik): noch nicht geprüft';
  return `Darstellung (Rhetorik): ${esc(st.status.toLowerCase())} · ${st.annotations} KI-Hinweis${st.annotations === 1 ? '' : 'e'}`;
}

async function pageHome() {
  const all = await Promise.all(state.index.videos.map(v => loadVideo(v.id).catch(() => ({ ...v, meta: {}, data: null }))));
  /* Hauptübersicht: nur Originalinterviews; Reaktionen erscheinen bei ihrem Original. */
  const videos = all.filter(v => v.video?.role === 'original');
  const unclassified = all.filter(v => !v.video);
  const shown = videos.concat(unclassified);
  const allClaims = shown.flatMap(v => v.data?.claims || []);
  const done = allClaims.filter(c => c.status === 'Abgeschlossen').length;
  const sources = shown.reduce((n, v) => n + (v.data?.sources?.length || 0), 0);

  const card = v => {
    const claims = v.data?.claims || [];
    const nReact = (state.rel.byOriginal.get(v.id) || []).length;
    const scope = v.data?.scope;
    return `<a class="card" href="#/video/${esc(v.id)}">
      ${thumbImg(v.id, v.video?.videoUrl || scope?.videoUrl, 'card-thumb')}
      <div class="claim-top">${scope ? `<span class="badge kind">${esc(scope.kind)}</span>` : '<span class="badge kind">Bericht</span>'}
      ${v.meta.Status ? `<span class="small">${esc(v.meta.Status)}</span>` : ''}</div>
      <h3>${esc(v.title)}</h3>
      <ul class="facts">${videoFacts(v)}</ul>
      ${claims.length ? `<div>${distribution(claims)}</div>
        <p class="meta">${claims.length} strukturierte Aussagen · ${claims.filter(c => c.status === 'Abgeschlossen').length} abgeschlossen${scope && scope.totalLegacyPoints ? ` · ${scope.totalLegacyPoints - scope.unmigratedLegacyPoints} von ${scope.totalLegacyPoints} Prüfpunkten des Erststands strukturiert` : ''}</p>`
        : '<p class="meta">Noch keine strukturierten Aussagen; Berichte als Text verfügbar.</p>'}
      <p class="meta">${rhetHomeLine(v)}</p>
      ${v.video?.role === 'original' ? `<p class="meta">${nReact ? `${nReact} zugeordnete Reaktion${nReact === 1 ? '' : 'en'} und weitere Faktenchecks` : 'Noch keine Reaktionen zugeordnet'}</p>` : ''}
      <span class="more">Zum Faktencheck →</span>
    </a>`;
  };
  const cards = videos.map(card).join('');
  const otherCards = unclassified.map(card).join('');

  setPage(`
  <section class="hero">
    <div class="wrap">
      <p class="eyebrow">Offenes Lernprojekt · Quellen statt Schlagworte</p>
      <h1>Ben ungeskriptet: Was stimmt – und was hält einer Überprüfung nicht stand?</h1>
      <p class="lead">Bei „ungeskriptet by Ben“ kommen Menschen mit sehr unterschiedlichen, teils kontroversen Ansichten zu Wort. Manche Aussagen sind gut belegt, andere falsch, irreführend oder noch ungeklärt. Auch Aussagen und Nachfragen des Moderators können Gegenstand unserer Prüfung sein. Wir nehmen nach und nach Interviews unter die Lupe – mit Zeitmarken, Quellen und einer fairen Trennung zwischen Tatsachen, Meinungen und offenen Fragen.</p>
      <p class="small">Dieses unabhängige Projekt ist weder eine offizielle Prüfung im Auftrag von Ben Berndt noch eine Zusammenarbeit mit dem Kanal.</p>
      <ul class="hero-facts">
        <li>${videos.length} ${videos.length === 1 ? 'Originalinterview' : 'Originalinterviews'}</li>
        <li>${allClaims.length} strukturierte Aussagen</li>
        <li>${done} abgeschlossen</li>
        <li>${sources} verlinkte Quellen</li>
      </ul>
    </div>
  </section>
  <div class="wrap">
    <section class="section" aria-labelledby="h-hintergrund">
      <div class="section-head"><h2 id="h-hintergrund">Warum wir „ungeskriptet“ prüfen</h2></div>
      <p>Die Frage nach der Verantwortung für Tatsachenbehauptungen in Interviews wurde 2026 öffentlich diskutiert: Nach einem Interview mit Björn Höcke wies die Landesanstalt für Medien NRW in einem Hinweisschreiben darauf hin, dass eine nachweislich falsche Aussage über eine Losung der SA im Interview nicht eingeordnet worden war. Die Behörde ordnet „ungeskriptet by Ben“ als journalistisch-redaktionelles Angebot ein und verweist auf die journalistischen Sorgfaltspflichten.</p>
      <p>Am 24. September 2026 teilte die Medienanstalt mit, dass sie ihre Prüfung dieses Falls abgeschlossen habe und derzeit keine weiteren Aufsichtsmaßnahmen ergreife. Berndts Produktionsfirma ging nach Medienberichten Ende Oktober gerichtlich gegen die behördliche Bewertung und die Aufforderung vor, auch weitere Folgen auf journalistische Sorgfalt zu prüfen. Der Streit betrifft also die Sorgfaltspflichten und ihre Anwendung – nicht eine pauschale Feststellung, sämtliche Videos enthielten verfassungswidrige Aussagen.</p>
      <p>Wir möchten einen konstruktiven Beitrag leisten: Statt pauschaler Vorwürfe prüfen wir Schritt für Schritt nachprüfbare Aussagen aus den Interviews. Dabei kann sich herausstellen, dass ein Gast oder Ben richtigliegt, dass eine Aussage falsch ist oder dass Belege fehlen. Auch externe Reaktionen und Faktenchecks sollen mit den jeweiligen Interviews verknüpft und an denselben Maßstäben gemessen werden. Unsere Prüfungen ersetzen keine rechtliche oder behördliche Kontrolle.</p>
      <p class="small">Zum Hintergrund: <a href="https://www.medienanstalt-nrw.de/presse/pressemitteilungen/pressemitteilungen-2026/2026/september/landesanstalt-fuer-medien-nrw-schliesst-pruefung-im-fall-ungeskriptet-by-ben-ab.html" target="_blank" rel="noopener noreferrer">Mitteilung der Landesanstalt für Medien NRW vom 24.09.2026</a> · <a href="https://www.tagesschau.de/inland/regional/nordrheinwestfalen/wdr-hoecke-interview-podcaster-verklagt-die-nrw-medienaufsicht-wegen-pruefung-100.html" target="_blank" rel="noopener noreferrer">WDR-Bericht vom 29.10.2026 zur Klage</a></p>
    </section>
    <section class="section" aria-labelledby="h-videos">
      <div class="section-head"><h2 id="h-videos">Geprüfte Originalinterviews</h2><p>Interviews des Kanals „ungeskriptet“. Reaktionen und Faktenchecks anderer Kanäle stehen jeweils auf der Seite des Interviews, auf das sie sich beziehen.</p></div>
      ${cards ? thumbPrompt() : ''}
      <div class="cards">${cards || '<p class="muted">Noch keine Faktenchecks veröffentlicht.</p>'}</div>
    </section>
    ${otherCards ? `<section class="section" aria-labelledby="h-other">
      <div class="section-head"><h2 id="h-other">Noch nicht eingeordnet</h2><p>Für diese Analysen ist noch nicht belegt, ob es sich um ein Originalinterview oder eine Reaktion handelt.</p></div>
      <div class="cards">${otherCards}</div>
    </section>` : ''}
    <section class="section" aria-labelledby="h-team">
      <div class="section-head"><h2 id="h-team">Menschen hinter dem Projekt</h2></div>
      <div class="roles">
        <a class="role person-link" href="#/jens">
          <span class="tag">Initiator und Projektverantwortlicher</span>
          <h3>Jens der Christ</h3>
          <p>Christ, politisch interessiert und Entwickler von Politik4M3. Er hat dieses unabhängige Faktencheck-Projekt ins Leben gerufen.</p>
          <span class="person-more">Mehr über Jens der Christ →</span>
        </a>
      </div>
      <p class="small" style="margin-top:16px">Für Recherche und technische Umsetzung werden auch KI-Werkzeuge eingesetzt. Wie Aussagen überprüft werden, steht in der <a href="#/methodik">Methodik</a>.</p>
    </section>
  </div>`, 'start');
  document.title = 'Politik4M3 Faktencheck Ungeskriptet';
}

/* ---------- Zweite Ebene: Rhetorik und Darstellung (siehe docs/RHETORIK.md) ---------- */
/* Rhetorik-Hinweise stehen getrennt neben der Faktenbewertung, ändern sie nie und zählen nicht als Fehler. */
const RHET_KEY = 'p4m3.rhetorikHinweise';
function rhetShown() {
  try { return localStorage.getItem(RHET_KEY) !== 'aus'; } catch (e) { return true; }
}
function setRhetShown(on) {
  try { localStorage.setItem(RHET_KEY, on ? 'an' : 'aus'); } catch (e) { /* nur Anzeigevorliebe */ }
  document.documentElement.classList.toggle('hide-rhet', !on);
}
function rhetBadge(a) {
  const f = FactRhetoric.FEATURES[a.feature];
  return `<span class="badge rhet-badge" data-tip="${esc(f?.hint || '')}">${esc(f?.name || a.feature)}${a.assessment !== 'Erkennbar' ? ' · ' + esc(a.assessment.toLowerCase()) : ''}</span>`;
}
function rhetSpeaker(a, d) {
  const sp = (d?.speakers || []).find(s => s.id === a.speaker?.id);
  const name = sp ? (sp.name || 'Unbenannte Stimme ' + sp.id) : null;
  if (a.speaker?.attribution === 'Bestätigt' && name) return esc(name);
  if (a.speaker?.attribution === 'Plausibel' && name) return 'vermutlich ' + esc(name);
  return 'Sprecher ungeklärt';
}
function rhetBlock(list, v) {
  if (!list || !list.length) return '';
  const url = v.data?.scope?.videoUrl || v.video?.videoUrl;
  const items = list.map(a => {
    const t = `${hms(a.startSeconds)}–${hms(a.endSeconds)}`;
    const time = videoTimeUrl(url, a.startSeconds) ? extLink(videoTimeUrl(url, a.startSeconds), `<span class="time">▶ ${t}</span>`) : `<span class="time">${t}</span>`;
    return `<li class="rhet-item">
      <div class="rhet-top">${rhetBadge(a)}<span class="small">${time} · ${rhetSpeaker(a, v.data)}</span></div>
      <p class="rhet-obs">${esc(a.observation)}</p>
      <details class="rhet-more"><summary>Begründung, Kontext und Unsicherheit</summary>
        <dl class="kv">
          <dt>Begründung</dt><dd>${esc(a.reason)}</dd>
          <dt>Kontext</dt><dd>${esc(a.context)}</dd>
          ${a.missingInformation ? `<dt>Fehlende Information</dt><dd>${esc(a.missingInformation.what)}${a.missingInformation.source ? ' · ' + extLink(a.missingInformation.source, 'Quelle') : ''}${a.missingInformation.reasoning ? ' · ' + esc(a.missingInformation.reasoning) : ''}</dd>` : ''}
          <dt>Unsicherheit</dt><dd>${esc(a.uncertainty)}</dd>
          <dt>Zuverlässigkeit</dt><dd>${esc(a.reliability)}</dd>
          <dt>Sprecherzuordnung</dt><dd>${esc(a.speaker?.basis)}</dd>
          <dt>Grundlage</dt><dd>${esc(a.basis)}</dd>
          <dt>Prüfstand</dt><dd>${esc(a.status)} · ${(a.history || []).map(h => `${esc(deDate(h.date))} ${esc(h.by)}: ${esc(h.change)}`).join(' · ')}</dd>
        </dl>
      </details>
    </li>`;
  }).join('');
  return `<section class="rhet" aria-label="Darstellung: Rhetorik-Hinweise">
    <div class="rhet-label">Darstellung · KI-Hinweis, getrennt von der Faktenbewertung</div>
    <ul class="rhet-list">${items}</ul>
  </section>`;
}
function rhetPanel(v) {
  const r = v.rhet;
  const st = FactRhetoric.reviewState(r);
  if (!r) {
    return `<div class="panel rhet-panel"><h3>Darstellung (zweite Ebene)</h3>
      <p><strong>Noch nicht geprüft.</strong> Für dieses Video gibt es noch keine Rhetorik-Einordnung. Das heißt nicht, dass es rhetorisch unauffällig ist.</p></div>`;
  }
  const counts = FactRhetoric.featureCounts(r);
  const rows = Object.entries(counts).filter(([, n]) => n > 0)
    .map(([k, n]) => `<li>${esc(FactRhetoric.FEATURES[k].name)} <b>${n}</b></li>`).join('');
  return `<div class="panel rhet-panel"><h3>Darstellung (zweite Ebene)</h3>
    <p><strong>${esc(st.status)}</strong> · Stand ${esc(deDate(r.review.checkedOn))} · ${esc(r.review.by)}</p>
    <p>${esc(r.review.coverage)}</p>
    ${rows ? `<ul class="rhet-counts">${rows}</ul>` : ''}
    <p class="small">Hinweise darauf, <em>wie</em> etwas gesagt wird: abwertend, ironisch, pauschal, emotionalisierend, einseitig. Sie sind KI-Einschätzungen, ändern keine Faktenbewertung, zählen nicht als Fehler und ergeben keine Note für Personen.</p>
    <details class="rhet-more"><summary>Grundlage und Grenzen</summary>
      <p class="small">${esc(r.review.basis)}</p>
      <ul class="questions">${(r.review.limits || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    </details></div>`;
}

function claimCard(c, v, chapterTitles, linkedVideos, rhetList) {
  const d = v.data;
  const speakers = Object.fromEntries((d.speakers || []).map(s => [s.id, s]));
  const sources = Object.fromEntries((d.sources || []).map(s => [s.id, s]));
  const shortId = c.id.replace(v.id + '-', '');
  const color = c.verdict ? `var(--v-${VKEY[c.verdict]})` : isUnverifiable(c) ? 'var(--s-nichtpruefbar)' : (c.status === 'In Bearbeitung' ? 'var(--s-bearbeitung)' : 'var(--s-offen)');
  const spk = id => (id && speakers[id] ? (speakers[id].name || 'Unbenannte Stimme ' + id) : id);

  const occ = (c.occurrences || []).map(o => {
    let who;
    if (o.attributionStatus === 'Bestätigt') who = `<strong>${esc(spk(o.speakerId))}</strong> <span class="badge plain">Zuordnung bestätigt</span>`;
    else if (o.attributionStatus === 'Plausibel') who = `vermutlich <strong>${esc(spk(o.candidateSpeakerId))}</strong> <span class="badge plain">Zuordnung plausibel, nicht bestätigt</span>`;
    else who = `<span class="badge plain">Sprecher ungeklärt</span>`;
    const url = videoTimeUrl(d.scope.videoUrl, o.startSeconds);
    const hist = (o.timeHistory || []).map(h => `<li>${hms(h.startSeconds)}–${hms(h.endSeconds)} (${esc(h.precision)}): ${esc(h.basis)}</li>`).join('');
    return `<div class="occ">
      <div class="occ-top">${url ? extLink(url, `<span class="time">▶ ${hms(o.startSeconds)}–${hms(o.endSeconds)}</span>`) : `<span class="time">${hms(o.startSeconds)}–${hms(o.endSeconds)}</span>`}
        <span class="badge plain">Zeit ${esc(o.precision)}</span>${who}<span class="badge plain">${esc(o.role)} (${esc(o.roleStatus)})</span></div>
      <dl class="kv">
        ${o.note ? `<dt>Hinweis</dt><dd>${esc(o.note)}</dd>` : ''}
        <dt>Sprecherzuordnung</dt><dd>${esc(o.attributionBasis)}</dd>
        <dt>Aussagebezug</dt><dd>${esc(o.roleBasis)}</dd>
        <dt>Zeitgrundlage</dt><dd>${esc(o.timeBasis)}</dd>
        ${o.legacySpeaker ? `<dt>Frühere Angabe</dt><dd>${esc(o.legacySpeaker)}</dd>` : ''}
        ${hist ? `<dt>Frühere Fundstellen</dt><dd><ul class="questions">${hist}</ul></dd>` : ''}
      </dl></div>`;
  }).join('');

  const srcs = (c.sourceRefs || []).map(r => {
    const s = sources[r.sourceId];
    if (!s) return `<li><span class="src-title">${esc(r.sourceId)}</span><div class="src-note">${esc(r.note)}</div></li>`;
    return `<li><div class="src-title">${extLink(s.url, esc(s.title))}</div>
      <div class="src-meta">${esc(s.details)} · abgerufen ${esc(deDate(s.accessedOn))}</div>
      <div class="src-meta">Zugriff: ${esc(s.accessBasis)}</div>
      ${r.note ? `<div class="src-note">Bezug: ${esc(r.note)}</div>` : ''}</li>`;
  }).join('');

  const rel = (c.relations || []).map(r => `<li>${esc(r.type)} <a href="#/video/${esc(v.id)}/aussage/${esc(r.claimId)}">${esc(r.claimId.replace(v.id + '-', ''))}</a>: ${esc(r.note)}</li>`).join('');
  const q = (c.openQuestions || []).map(x => `<li>${esc(x)}</li>`).join('');
  const chapter = chapterTitles[c.chapter];
  const xlinks = (state.rel?.byClaim.get(c.id) || []).map(({ relation: r, link: l }) => {
    const cmp = linkedVideos ? linkView(r, l, linkedVideos).cmp : { state: 'kein_vergleich' };
    const otherVideo = c.id === l.originalClaimId ? r.reactionVideoId : r.originalVideoId;
    const otherClaim = c.id === l.originalClaimId ? l.reactionClaimId : l.originalClaimId;
    const target = otherClaim ? `#/video/${otherVideo}/aussage/${otherClaim}` : `#/video/${otherVideo}`;
    return { cmp, html: `<li>${stateBadge(cmp.state)} <a href="${esc(target)}">${esc(videoName(otherVideo))}${otherClaim ? ' · ' + esc(shortClaim(otherClaim, otherVideo)) : ''}</a> – ${esc(FactRelations.LINK_TYPES[l.type])}</li>` };
  });
  const hasConflict = xlinks.some(x => x.cmp.state === 'konflikt');

  return `<article class="claim" id="${esc(c.id)}">
    <div class="claim-head">
      <span class="claim-stripe" style="background:${color}" aria-hidden="true"></span>
      <div class="claim-main">
        <div class="claim-top">${verdictBadge(c.verdict, c.status, c.reason)}
          <span class="badge kind">${esc(c.kind)}</span>
          <span class="badge kind">Kapitel ${esc(c.chapter)}${chapter ? ' · ' + esc(chapter) : ''}</span>
          <a class="claim-id" href="#/video/${esc(v.id)}/aussage/${esc(c.id)}" title="Direktlink zu dieser Aussage">${esc(shortId)}</a>
          ${hasConflict ? '<span class="badge rel-state rel-conflict">⚠ Prüfkonflikt mit verknüpfter Aussage</span>' : ''}</div>
        <div class="claim-desc-label">Prüfgegenstand – unsere Beschreibung, kein Zitat</div>
        <p class="claim-desc">${esc(c.description)}</p>
        <p class="claim-reason">${esc(c.reason)}</p>
        ${rhetBlock(rhetList, v)}
      </div>
    </div>
    <details>
      <summary>Fundstellen, Quellen und Prüfgrundlage</summary>
      <div class="claim-body">
        <div><h4>Grundlage der Bewertung</h4><p class="small" style="color:var(--text-2)">${esc(c.assessmentBasis)}</p></div>
        <div><h4>Fundstellen im Video (${(c.occurrences || []).length})</h4>${occ}</div>
        <div><h4>Quellen</h4>${srcs ? `<ul class="sources">${srcs}</ul>` : '<p class="small">Dieser Aussage sind keine Sachquellen zugeordnet.</p>'}</div>
        ${q ? `<div><h4>${isUnverifiable(c) ? 'Was für eine Prüfung fehlt' : 'Offene Fragen'}</h4><ul class="questions">${q}</ul></div>` : ''}
        ${rel ? `<div><h4>Beziehungen</h4><ul class="questions">${rel}</ul></div>` : ''}
        ${xlinks.length ? `<div><h4>Verknüpfte Aussagen in anderen Videos</h4><ul class="questions">${xlinks.map(x => x.html).join('')}</ul></div>` : ''}
        <div><h4>Herkunft</h4><dl class="kv">
          <dt>Erfassung</dt><dd>${esc(c.migration?.changeType)}${c.legacyId ? ' · früherer Prüfpunkt ' + esc(c.legacyId) : ''}</dd>
          <dt>Zuordnung</dt><dd>${esc(c.migration?.mapping)}</dd>
          <dt>Bewertungsänderung</dt><dd>${esc(c.migration?.assessmentChange)}</dd>
        </dl></div>
      </div>
    </details>
  </article>`;
}

function chapterTitlesFor(v) {
  const titles = {};
  for (const f of v.files) {
    const m = /^kapitel\/(\d+)_/.exec(f);
    if (m) titles[parseInt(m[1], 10)] = null;
  }
  return titles;
}

async function fillChapterTitles(v, titles) {
  const files = v.files.filter(f => /^kapitel\/\d+_.*\.md$/.test(f));
  await Promise.all(files.map(async f => {
    const t = await getText(v.id + '/' + f).catch(() => '');
    const h = /^#\s+(?:\d+\s+)?(.+)$/m.exec(t);
    titles[parseInt(/^kapitel\/(\d+)_/.exec(f)[1], 10)] = h ? h[1].trim() : null;
  }));
}

function videoHeader(v, tab) {
  const scope = v.data?.scope;
  const tabs = [
    v.data ? ['aussagen', `#/video/${v.id}`, 'Aussagen'] : null,
    v.data && FactSync.youtubeId(scope?.videoUrl) ? ['video', `#/video/${v.id}/video`, 'Video mit Faktencheck'] : null,
    ['berichte', `#/video/${v.id}/bericht/README.md`, 'Berichte'],
    v.video?.role === 'original' ? ['reaktionen', `#/video/${v.id}/reaktionen`, `Reaktionen (${(state.rel.byOriginal.get(v.id) || []).length})`] : null,
    v.video?.role === 'reaction' ? ['reaktionen', `#/video/${v.id}/reaktionen`, 'Bezug zum Original'] : null,
  ].filter(Boolean);
  return `<nav class="crumbs" aria-label="Brotkrumen"><a href="#/">Faktenchecks</a> / ${esc(v.id)}</nav>
  <header class="video-head">
    <h1>${esc(v.title)}</h1>
    ${roleLine(v)}
    <ul class="facts">${videoFacts(v)}</ul>
    <div class="btn-row">
      ${tabs.some(t => t[0] === 'video') && tab !== 'video' ? `<a class="btn" href="#/video/${esc(v.id)}/video/start" title="Startet den YouTube-Player (youtube-nocookie.com) direkt neben dem Faktencheck. Dabei werden Daten an YouTube übertragen.">▶ Video mit Faktencheck hier abspielen</a>` : ''}
      ${(scope?.videoUrl || v.video?.videoUrl) ? extLink(scope?.videoUrl || v.video.videoUrl, `<span class="btn ghost">${v.video?.role === 'reaction' ? 'Video' : 'Originalvideo'} auf YouTube</span>`) : ''}
      <a class="btn ghost" href="${esc(blobUrl('faktenchecks/' + v.id))}" rel="noopener noreferrer" target="_blank">Daten auf GitHub</a>
    </div>
    ${tabs.some(t => t[0] === 'video') && tab !== 'video' ? '<p class="small btn-note">Der Knopf „hier abspielen“ lädt den YouTube-Player im erweiterten Datenschutzmodus; dabei werden Daten wie deine IP-Adresse an YouTube (Google) übertragen.</p>' : ''}
  </header>
  <nav class="tabs" aria-label="Ansicht">${tabs.map(t => `<a href="${esc(t[1])}"${t[0] === tab ? ' aria-current="page"' : ''}>${t[2]}</a>`).join('')}</nav>`;
}

async function pageVideo(id, focusClaim) {
  const v = await loadVideo(id);
  if (!v.data) { location.replace(`#/video/${id}/bericht/README.md`); return; }
  const d = v.data, s = v.stats, scope = d.scope;
  const titles = chapterTitlesFor(v);
  await fillChapterTitles(v, titles);
  const chapters = [...new Set(d.claims.map(c => c.chapter))].sort((a, b) => a - b);

  const nUnver = d.claims.filter(isUnverifiable).length;
  const nWork = d.claims.filter(c => c.status === 'In Bearbeitung' && !isUnverifiable(c)).length;
  const nOpen = d.claims.filter(c => c.status === 'Offen' && !isUnverifiable(c)).length;
  const statBlock = s ? `
    <dl class="stats">
      <div class="stat"><dt>Eigenständige Aussagen</dt><dd>${num(s.uniqueStatements)}</dd></div>
      <div class="stat"><dt>Bewertet oder Meinung</dt><dd>${num(s.statusCounts?.Abgeschlossen ?? 0)}</dd></div>
      ${nUnver ? `<div class="stat"><dt>Nicht überprüfbar</dt><dd>${num(nUnver)}</dd></div>` : ''}
      ${nWork ? `<div class="stat"><dt>In Bearbeitung</dt><dd>${num(nWork)}</dd></div>` : ''}
      ${nOpen ? `<div class="stat"><dt>Offen</dt><dd>${num(nOpen)}</dd></div>` : ''}
      <div class="stat"><dt>Quellen</dt><dd>${num(d.sources.length)}</dd></div>
    </dl>` : '';

  const catRows = s?.categories ? s.categories.map(cat =>
    `<li><i class="fill-${VKEY[cat.category]}" aria-hidden="true"></i>${esc(cat.category)} <b>${cat.completedCount}</b>${cat.completedFactPercent != null ? ` <span class="muted">(${pct(cat.completedFactPercent)})</span>` : ''}</li>`).join('') : '';

  const linkedVideos = await loadLinked([...(state.rel.byOriginal.get(v.id) || []), ...(state.rel.byReaction.get(v.id) || [])]);
  const rhetByClaim = FactRhetoric.byClaim(v.rhet);
  const speakers = (d.speakers || []).map(sp => `<li><strong>${esc(sp.name || 'Unbenannte Stimme')}</strong> (${esc(sp.id)}, ${esc(sp.videoRole)})<br><span class="small">${esc(sp.identityBasis)}</span></li>`).join('');

  setPage(`<div class="wrap">
    ${videoHeader(v, 'aussagen')}
    ${scope.kind === 'Teilbestand' && !researchDone(scope) ? `<p class="notice warn"><strong>Teilbestand – keine Bilanz des ganzen Videos.</strong> ${esc(scope.coverageNote)}</p>` : `<p class="notice"><strong>Umfang der Prüfung.</strong> ${esc(scope.coverageNote)}</p>`}
    <div class="grid-2" style="margin-top:20px">
      <div>
        <section class="section" style="margin-bottom:28px">
          ${statBlock}
          <div style="margin-top:16px">${distribution(d.claims)}</div>
        </section>
        <div class="filters" role="search">
          <label class="sr" for="f-q" hidden>Suche</label>
          <input id="f-q" type="search" placeholder="Aussagen durchsuchen …" aria-label="Aussagen durchsuchen">
          <select id="f-v" aria-label="Nach Bewertung filtern">
            <option value="">Alle Bewertungen</option>
            ${VERDICTS.map(x => `<option value="${x.key}">${esc(x.name)}</option>`).join('')}
            ${STATUS.map(x => `<option value="${x.key}">${esc(x.name)}${x.key === 'nichtpruefbar' ? '' : ' (ohne Bewertung)'}</option>`).join('')}
          </select>
          <select id="f-c" aria-label="Nach Kapitel filtern">
            <option value="">Alle Kapitel</option>
            ${chapters.map(n => `<option value="${n}">Kapitel ${n}${titles[n] ? ' · ' + esc(titles[n]) : ''}</option>`).join('')}
          </select>
          ${v.rhet ? `<select id="f-r" aria-label="Nach Rhetorik-Hinweis filtern">
            <option value="">Darstellung: alle</option>
            <option value="*">Mit Rhetorik-Hinweis</option>
            ${Object.entries(FactRhetoric.featureCounts(v.rhet)).filter(([, n]) => n > 0).map(([k]) => `<option value="${k}">${esc(FactRhetoric.FEATURES[k].name)}</option>`).join('')}
          </select>
          <label class="rhet-toggle"><input type="checkbox" id="f-rs"${rhetShown() ? ' checked' : ''}> Rhetorik-Hinweise anzeigen</label>` : ''}
        </div>
        <p class="result-count" id="count" aria-live="polite"></p>
        <div class="claims" id="claims">${d.claims.map(c => claimCard(c, v, titles, linkedVideos, rhetByClaim.get(c.id))).join('')}</div>
      </div>
      <aside class="aside">
        ${catRows ? `<div class="panel"><h3>Ergebnisse der abgeschlossenen Prüfungen</h3><ul class="legend" style="flex-direction:column;align-items:flex-start">${catRows}</ul>
          <p class="small" style="margin-top:10px">Prozente beziehen sich nur auf ${s.percentageDenominator} abgeschlossene Tatsachenbehauptungen; Meinungen, Prognosen und offene Prüfungen zählen nicht mit. Bei so kleinen Zahlen sind Anteile kaum aussagekräftig.</p></div>` : ''}
        ${rhetPanel(v)}
        <div class="panel"><h3>Recherchegrundlage</h3><p>${esc(scope.researchNote)}</p></div>
        ${speakers ? `<div class="panel"><h3>Personen im Video</h3><ul>${speakers}</ul><p class="small" style="margin-top:8px">Sprecherzuordnungen werden je Fundstelle als bestätigt, plausibel oder ungeklärt angegeben. Es gibt bewusst keine Glaubwürdigkeitsnoten oder Ranglisten von Personen.</p></div>` : ''}
        <div class="panel"><h3>Prüfung und Diskussion</h3><p>Erstellt von Codex. ChatGPT und Claude prüfen unabhängig; ihre Hinweise, Widersprüche und Codex’ Entscheidungen stehen öffentlich auf GitHub. Nicht jede Aussage ist bereits gegengeprüft.</p>
          <p style="margin:0"><a href="${esc(repoUrl())}/issues?q=${encodeURIComponent(v.id)}" rel="noopener noreferrer" target="_blank">Diskussionen zu diesem Video →</a></p></div>
      </aside>
    </div>
  </div>`, 'start');
  document.title = v.title + ' – Politik4M3 Faktencheck Ungeskriptet';

  const q = document.getElementById('f-q'), fv = document.getElementById('f-v'), fc = document.getElementById('f-c');
  const fr = document.getElementById('f-r'), frs = document.getElementById('f-rs');
  setRhetShown(rhetShown());
  if (frs) frs.addEventListener('change', () => { setRhetShown(frs.checked); if (!frs.checked && fr) fr.value = ''; apply(); });
  const cards = [...document.querySelectorAll('#claims .claim')];
  const byId = Object.fromEntries(d.claims.map(c => [c.id, c]));
  const apply = () => {
    const term = q.value.trim().toLowerCase();
    let n = 0;
    for (const el of cards) {
      const c = byId[el.id];
      const rl = rhetByClaim.get(c.id) || [];
      const okR = !fr || !fr.value || (fr.value === '*' ? rl.length > 0 : rl.some(a => a.feature === fr.value));
      const ok = (!fv.value || bucketOf(c) === fv.value) && (!fc.value || String(c.chapter) === fc.value) && okR &&
        (!term || el.textContent.toLowerCase().includes(term));
      el.hidden = !ok; if (ok) n++;
    }
    document.getElementById('count').textContent = n === cards.length ? `${n} Aussagen` : `${n} von ${cards.length} Aussagen`;
  };
  [q, fv, fc, fr].filter(Boolean).forEach(el => el.addEventListener('input', apply));
  if (fr) fr.addEventListener('input', () => { if (fr.value && frs && !frs.checked) { frs.checked = true; setRhetShown(true); } });
  apply();

  if (focusClaim) {
    const el = document.getElementById(focusClaim);
    if (el) {
      el.classList.add('highlight');
      el.querySelector(':scope > details').open = true;
      requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    }
  } else {
    window.scrollTo(0, 0);
  }
}

function reportGroups(v) {
  const label = f => ({
    'README.md': 'Überblick', '01_kurz.md': 'Kurzbeschreibung', '02_analyse.md': 'Thematische Analyse',
    '03_faktencheck.md': 'Faktencheck-Übersicht', 'strukturiert/README.md': 'Strukturierte Übersicht',
    'strukturiert/migration.md': 'Herkunftsvergleich'
  }[f]);
  const main = v.files.filter(f => !f.includes('/') ).sort();
  const kapitel = v.files.filter(f => /^kapitel\//.test(f)).sort();
  const struct = v.files.filter(f => /^strukturiert\//.test(f)).sort();
  const name = f => label(f) || f.replace(/^.*\//, '').replace(/\.md$/, '').replace(/^(\d+)_/, '$1 ').replace(/[-_]/g, ' ');
  return [
    ['Berichte', main.sort((a, b) => (a === 'README.md' ? -1 : b === 'README.md' ? 1 : a.localeCompare(b))), name],
    ['Kapitelprüfungen', kapitel, name],
    ['Aus Strukturdaten erzeugt', struct.sort((a, b) => (a === 'strukturiert/README.md' ? -1 : b === 'strukturiert/README.md' ? 1 : a.localeCompare(b))), name]
  ].filter(g => g[1].length);
}

async function pageReport(id, file) {
  const v = await loadVideo(id);
  if (!v.files.includes(file)) throw new Error('Bericht nicht gefunden: ' + file);
  const groups = reportGroups(v);
  const kapTitle = async f => {
    const t = await getText(v.id + '/' + f).catch(() => '');
    const h = /^#\s+(.+)$/m.exec(t);
    return h ? h[1] : null;
  };
  const navHtml = (await Promise.all(groups.map(async ([title, files, name]) => {
    const items = await Promise.all(files.map(async f => {
      const label = /^kapitel\//.test(f) ? (await kapTitle(f)) || name(f) : name(f);
      return `<li><a href="#/video/${esc(v.id)}/bericht/${esc(f)}"${f === file ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`;
    }));
    return `<h3>${esc(title)}</h3><ul>${items.join('')}</ul>`;
  }))).join('');

  const src = await getText(v.id + '/' + file);
  const html = renderMarkdown(src, { videoId: v.id, file, files: v.files });
  setPage(`<div class="wrap">
    ${videoHeader(v, 'berichte')}
    <div class="report-layout">
      <nav class="report-nav" aria-label="Berichte">${navHtml}</nav>
      <div>
        <article class="prose">${html}</article>
        <p class="small" style="margin-top:10px">Quelltext dieser Seite: <a href="${esc(blobUrl('faktenchecks/' + v.id + '/' + file))}" rel="noopener noreferrer" target="_blank">${esc('faktenchecks/' + v.id + '/' + file)}</a></p>
      </div>
    </div>
  </div>`, 'start');
  decorateVerdicts(main());
  const h1 = /^#\s+(.+)$/m.exec(src);
  document.title = (h1 ? stripMd(h1[1]) + ' – ' : '') + 'Politik4M3 Faktencheck Ungeskriptet';
  window.scrollTo(0, 0);
}

/* Reiter „Reaktionen“ (Original) bzw. „Bezug zum Original“ (Reaktion). */
async function pageRelations(id) {
  const v = await loadVideo(id);
  if (!v.video) { location.replace(`#/video/${id}`); return; }
  const html = await relationsSection(v);
  setPage(`<div class="wrap">
    ${videoHeader(v, 'reaktionen')}
    ${html}
  </div>`, 'start');
  document.title = (v.video.role === 'original' ? 'Reaktionen: ' : 'Bezug zum Original: ') + v.title + ' – Politik4M3 Faktencheck Ungeskriptet';
  window.scrollTo(0, 0);
}

function pageMethod() {
  setPage(`<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumen"><a href="#/">Faktenchecks</a> / Methodik</nav>
    <header class="video-head"><h1>So prüfen wir</h1>
      <p class="lead" style="color:var(--text-2);max-width:70ch">Wir bewerten einzelne, überprüfbare Aussagen – nie ein ganzes Video pauschal. Entscheidend sind nachvollziehbare Quellen und die Trennung von Tatsachen, Meinungen und Prognosen.</p></header>

    <section class="section"><h2>Sechs feste Bewertungen</h2>
      <ul class="verdict-list">${VERDICTS.map(x => `<li><span class="badge"><i class="fill-${x.key}" aria-hidden="true"></i>${esc(x.name)}</span><p>${esc(x.text)}</p></li>`).join('')}</ul>
      <p class="small">Solange eine Prüfung <strong>offen</strong> oder <strong>in Bearbeitung</strong> ist, gibt es bewusst keine Bewertung. Eine nicht belegte Aussage ist nicht automatisch falsch.</p>
    </section>

    <section class="section prose-plain"><h2>Grundsätze</h2>
      <ul>
        <li><strong>Eigene Worte statt Zitate.</strong> Jeder Prüfgegenstand ist unsere Beschreibung. Wir veröffentlichen keine Transkripte, Untertitel, Mitschnitte oder Ausschnitte – nur Zeitmarken mit Link zum Original.</li>
        <li><strong>Quellen direkt zugeordnet.</strong> Jede Quelle steht bei der Aussage, die sie stützt, mit Abrufdatum und Angabe, ob sie tatsächlich gelesen wurde. Primärquellen wie amtliche Statistiken, Gesetzestexte und Originalstudien haben Vorrang.</li>
        <li><strong>Zeitbezug.</strong> Wir trennen den Wissensstand zur Zeit der Aufnahme von späteren Daten.</li>
        <li><strong>Vorsichtige Sprecherzuordnung.</strong> Je Fundstelle steht, ob die Person bestätigt, nur plausibel oder ungeklärt ist – und ob es eine eigene Behauptung, Zustimmung, Rückfrage oder Wiedergabe war.</li>
        <li><strong>Keine Doppelzählung.</strong> Wiederholungen werden als weitere Fundstellen derselben Aussage geführt, nicht als neue Aussagen.</li>
        <li><strong>Teilbestände ehrlich kennzeichnen.</strong> Wenn nur ein Teil eines Videos strukturiert geprüft ist, gibt es keine Gesamtbilanz.</li>
        <li><strong>Keine Rankings.</strong> Wir vergeben keine Glaubwürdigkeitsnoten für Personen.</li>
      </ul>
    </section>

    <section class="section prose-plain"><h2>Zweite Ebene: Wie etwas gesagt wird</h2>
      <p>Getrennt von der Frage, ob eine Aussage stimmt, kann eine Stelle einen <strong>Hinweis zur Darstellung</strong> erhalten: ${Object.values(FactRhetoric.FEATURES).map(f => esc(f.name)).join(', ')}. Eine sachlich richtige Aussage kann abwertend formuliert sein, eine falsche Aussage höflich.</p>
      <ul>
        <li><strong>Getrennt und ausblendbar.</strong> Die Hinweise stehen unter der Faktenbewertung, sind als KI-Einschätzung gekennzeichnet und lassen sich ausblenden.</li>
        <li><strong>Keine Fehlerpunkte.</strong> Rhetorik-Hinweise ändern keine Bewertung, fließen in keine Statistik ein und ergeben keine Note für Personen.</li>
        <li><strong>Beobachtung statt Urteil.</strong> Beschrieben wird die Stelle, nicht die Person; Motive werden nicht unterstellt. Ironie und Satire sind Stilmittel und nicht automatisch negativ.</li>
        <li><strong>Möglicher Tunnelblick</strong> wird nur markiert, wenn eine konkret benennbare, relevante Gegeninformation fehlt, mit Quelle oder Begründung.</li>
        <li><strong>Ehrlicher Prüfstand.</strong> Je Video steht, wie weit die Einordnung reicht. Fehlt ein Hinweis, heißt das nicht, dass die Stelle unauffällig ist. Für alle Kanäle, Gäste und Faktenchecker gelten dieselben Maßstäbe.</li>
      </ul>
    </section>

    <section class="section prose-plain"><h2>Originalinterviews und Reaktionen</h2>
      <p>Die Übersicht zeigt Originalinterviews. Videos anderer Kanäle, die sich nachweislich auf ein Interview beziehen, stehen auf dessen Seite und werden mit demselben Verfahren eigenständig geprüft, zustimmende wie kritische. Der Faktencheck des Originals dient dabei als Kontext, nicht als Wahrheitsmaßstab.</p>
      <p>Prüfen Original und Reaktion dieselbe Behauptung mit gegensätzlichem Ergebnis, erscheint ein sichtbarer <strong>Prüfkonflikt</strong> mit Gegenüberstellung der Quellen und einer offenen Review-Aufgabe, bis die Abweichung begründet geklärt ist. Bewertungen werden nie nur angeglichen, damit sie übereinstimmen.</p>
    </section>

    <section class="section prose-plain"><h2>Mehrere KI-Systeme, ein offener Prozess</h2>
      <p>Codex erstellt die Faktenchecks. ChatGPT und Claude prüfen sie unabhängig und kommentieren öffentlich auf GitHub; sie dürfen einander und Codex widersprechen. Codex entscheidet begründet, was übernommen wird. Ein Mensch gibt jede Veröffentlichung frei. Alle Beiträge sind mit dem jeweiligen KI-System gekennzeichnet, auch wenn mehrere denselben GitHub-Account nutzen.</p>
      <p>Auch mehrere KI-Systeme können irren. Wenn du einen Fehler findest, eröffne gern ein <a href="${esc(repoUrl())}/issues" rel="noopener noreferrer" target="_blank">Issue auf GitHub</a>.</p>
      <p>Die verbindlichen Regeln stehen in <a href="${esc(blobUrl('AGENTS.md'))}" rel="noopener noreferrer" target="_blank">AGENTS.md</a>, das Datenmodell in <a href="${esc(blobUrl('docs/STRUKTURIERTE_DATEN.md'))}" rel="noopener noreferrer" target="_blank">docs/STRUKTURIERTE_DATEN.md</a>.</p>
    </section>
  </div>`, 'methodik');
  document.title = 'Methodik – Politik4M3 Faktencheck Ungeskriptet';
  window.scrollTo(0, 0);
}

function pageJens() {
  setPage(`<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumennavigation"><a href="#/">Faktenchecks</a> / Jens der Christ</nav>
    <section class="section prose">
      <p class="eyebrow">Über den Projektgründer</p>
      <h1>Jens der Christ</h1>
      <p class="lead">Hinter Politik4M3 Faktencheck Ungeskriptet steht Jens der Christ – Initiator, Entwickler und Projektverantwortlicher.</p>
      <h2>Wer ist Jens?</h2>
      <p>Jens interessiert sich für Politik und gesellschaftliche Debatten. Als Christ ist ihm wichtig, Menschen respektvoll zu begegnen und unterschiedliche Standpunkte ernst zu nehmen. Er beschäftigt sich außerdem mit Webentwicklung und digitalen Projekten.</p>
      <h2>Warum dieses Projekt?</h2>
      <p>Politische Aussagen in Interviews und Reaktionsvideos sollen nachvollziehbar überprüft werden können. Dafür werden Behauptungen, Quellen, Zeitmarken und Unsicherheiten transparent dokumentiert – auch dann, wenn eine Aussage zutrifft oder sich nicht abschließend prüfen lässt.</p>
      <h2>Wie wird gearbeitet?</h2>
      <p>Jens verantwortet das Projekt. Bei Recherche, Datenaufbereitung und technischer Entwicklung kommen KI-Werkzeuge wie ChatGPT, Claude und Codex zum Einsatz. Ihre Ergebnisse sind nicht automatisch richtig und ersetzen keine sorgfältige Prüfung. Hinweise und Korrekturen sind willkommen.</p>
      <p><a href="#/methodik">Mehr zur Prüfmethode</a> · <a href="${esc(repoUrl())}/issues" rel="noopener noreferrer" target="_blank">Fehler oder Ergänzungen auf GitHub melden</a></p>
      <p class="small">Dies ist ein unabhängiges Projekt von Politik4M3 und keine offizielle Zusammenarbeit mit dem YouTube-Kanal „ungeskriptet“.</p>
    </section>
  </div>`, 'jens');
  document.title = 'Jens der Christ – Politik4M3 Faktencheck Ungeskriptet';
  window.scrollTo(0, 0);
}

function pageError(err) {
  setPage(`<div class="wrap"><p class="notice warn" style="margin-top:32px"><strong>Diese Seite konnte nicht geladen werden.</strong> ${esc(err.message || err)}</p><p><a href="#/">Zur Übersicht</a></p></div>`, '');
}

/* ---------- Routing ---------- */

/* Reiterwechsel: Die Reiterleiste bleibt an derselben Stelle im Fenster, statt nach oben zu springen. */
document.addEventListener('click', e => {
  const a = e.target.closest('.tabs a');
  if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.getAttribute('href') === location.hash) return;
  state.tabJump = { top: a.closest('.tabs').getBoundingClientRect().top, at: Date.now() };
});
function keepTabsInView(jump) {
  const t = main().querySelector('.tabs');
  if (!t) return;
  const bar = document.querySelector('.topbar');
  const min = (bar ? bar.getBoundingClientRect().height : 0) + 8;
  const want = Math.min(Math.max(jump.top, min), window.innerHeight * 0.6);
  const y = window.scrollY + t.getBoundingClientRect().top - want;
  /* Kurzer Reiterinhalt: Seite so weit verlängern, dass die Leiste trotzdem stehen bleibt. */
  const missing = y + window.innerHeight - document.documentElement.scrollHeight;
  if (missing > 0) main().style.minHeight = (main().offsetHeight + missing) + 'px';
  window.scrollTo(0, y);
}

async function route() {
  const jump = state.tabJump && Date.now() - state.tabJump.at < 2000 ? state.tabJump : null;
  state.tabJump = null;
  await routePage();
  if (jump) keepTabsInView(jump);
}

async function routePage() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const parts = h.split('/');
  if (state.cleanup) { try { state.cleanup(); } catch (e) { console.error(e); } state.cleanup = null; }
  try {
    if (!state.index) {
      state.index = await getJson('index.json');
      const b = document.getElementById('build-info');
      if (b && state.index.commit) {
        b.innerHTML = `Erzeugt am ${esc(deDate(state.index.generated))} aus Commit <a href="${esc(repoUrl())}/commit/${esc(state.index.commit)}" rel="noopener noreferrer" target="_blank">${esc(state.index.commit.slice(0, 7))}</a>`;
      }
      document.getElementById('repo-link').href = repoUrl();
      const licenseLink = document.getElementById('license-link');
      if (licenseLink) licenseLink.href = blobUrl('LICENSE');
      /* Fehlende Beziehungsdatei ist kein Fehler: dann gibt es schlicht keine Zuordnungen. */
      state.relations = await getJson('beziehungen.json').catch(() => ({ schemaVersion: 1, relations: [] }));
      state.rel = FactRelations.buildIndex(state.relations);
      updateThumbSetting();
    }
    if (parts[0] === 'video' && parts[1]) {
      if (parts[2] === 'video') return await pageVideoSync(parts[1], { autostart: parts[3] === 'start' });
      if (parts[2] === 'bericht') return await pageReport(parts[1], parts.slice(3).join('/'));
      if (parts[2] === 'reaktionen') return await pageRelations(parts[1]);
      if (parts[2] === 'aussage') return await pageVideo(parts[1], parts[3]);
      return await pageVideo(parts[1]);
    }
    if (parts[0] === 'methodik') return pageMethod();
    if (parts[0] === 'jens') return pageJens();
    return await pageHome();
  } catch (e) {
    console.error(e);
    pageError(e);
  }
}

window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', route);
