/*
 * Politik4M3 Faktencheck – Anzeige des gemeinsamen Faktenindex (site/faktenindex.js).
 *
 * DIESE DATEI IST IN ALLEN DREI REPOSITORIES BYTEGLEICH (wie site/faktenindex.js); die CI der Schwesterprojekte
 * vergleicht sie mit dem Hauptprojekt. Sie erzeugt nur HTML-Text und greift nicht auf das DOM zu, damit die
 * Node-Tests sie ohne Browser laden können. Verwendet von app.js (Karten, Videoseite, Aussagen, Methodik),
 * themen.js (über ampelView) und der Verlaufsseite.
 *
 * Grundsatz der Darstellung: zuerst die verständliche Bewertung (Index, Ampel, Prüfabdeckung, ein Satz Erklärung),
 * die Rechnung nur aufgeklappt.
 */
'use strict';

const FI_TEXT = 'Der Faktenindex berücksichtigt belegte, widerlegte und ungeklärte Aussagen. Widerlegte Aussagen werden fünfmal stärker gewichtet. Die KI-Prüfer berücksichtigen zusätzlich die Bedeutung einzelner Aussagen.';
const FI_SCOPE = 'Er beschreibt nur die geprüften Tatsachenbehauptungen, nicht das ganze Video und keine Person. Meinungen, noch nicht geprüfte und nicht überprüfbare Aussagen zählen nicht; Darstellungshinweise fließen nie ein.';

function fiEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const fiNum = (x, d = 1) => Number(x).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const fiShare = x => Math.round(x * 100) + ' %';
const fiSigned = x => (x > 0 ? '+' : x < 0 ? '−' : '±') + FactIndex.format(Math.abs(x));
const fiReliable = key => key === 'gruen' || key === 'gelb' || key === 'rot';

function fiRate(v) { return FactIndex.rate(v?.data || null, v?.video || null); }

/* Titel und Unterzeile der Ampel. Grau zeigt einen schon berechneten Index ausdrücklich als vorläufig. */
function fiTitle(r) {
  if (fiReliable(r.key)) return `Faktenindex ${FactIndex.format(r.indexRounded)} · ${r.name}`;
  if (r.index != null) return `Faktenindex ${FactIndex.format(r.indexRounded)} (vorläufig) · Grau`;
  return 'Faktenindex: nicht bewertbar · Grau';
}
function fiSub(r) {
  const cov = r.coverage == null ? 'Prüfabdeckung –' : `Prüfabdeckung ${FactIndex.percent(r.coverage)}`;
  return `${r.label} · ${cov} · ${r.status}`;
}

/* Ampel mit Index. variant: '' (Karte), 'compact' (Listen), 'big' (Videoseite und Methodik-Übersicht). */
function fiAmpelView(v, variant = '') {
  const r = fiRate(v);
  const title = fiTitle(r), sub = fiSub(r);
  const cls = `ampel ampel-${r.key}${variant ? ' ' + (variant === 'big' ? 'ampel-big' : variant) : ''}`;
  const aria = `${title}. ${sub}. ${r.reason}`;
  const attrs = `role="img" aria-label="${fiEsc(aria)}" data-ampel-key="${fiEsc(r.key)}" data-ampel-title="${fiEsc(title)}" data-ampel-sub="${fiEsc(sub)}" data-ampel-text="${fiEsc(r.reason + ' ' + r.text)}"`;
  return `<div class="${cls}" ${attrs}>
    <span class="ampel-lights" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="ampel-text" aria-hidden="true"><span class="ampel-title">${fiEsc(title)}</span><span class="ampel-sub">${fiEsc(sub)}</span></span>
  </div>`;
}

/* Kopf der Videoseite: Index, Ampel und Prüfabdeckung als Kennzahlen, darunter ein Satz und die aufklappbare Rechnung. */
function fiHeader(v) {
  const r = fiRate(v);
  const cls = `ampel fi-head ampel-${r.key} ampel-big`;
  const ampel = fiReliable(r.key) ? r.name : `Grau – ${r.label}`;
  return `<div class="${cls}" role="group" aria-label="Faktenindex dieses Videos" data-ampel-key="${fiEsc(r.key)}" data-ampel-title="${fiEsc(fiTitle(r))}" data-ampel-sub="${fiEsc(fiSub(r))}" data-ampel-text="${fiEsc(r.reason)}">
    <span class="ampel-lights" aria-hidden="true"><i></i><i></i><i></i></span>
    <dl class="fi-kv">
      <div><dt>Faktenindex</dt><dd>${r.index == null ? 'Nicht bewertbar' : fiEsc(FactIndex.format(r.indexRounded)) + (fiReliable(r.key) ? '' : ' <span class="fi-tag">vorläufig</span>')}</dd></div>
      <div><dt>Ampel</dt><dd>${fiEsc(ampel)}</dd></div>
      <div><dt>Prüfabdeckung</dt><dd>${fiEsc(FactIndex.percent(r.coverage))}</dd></div>
      <div><dt>Bewertung</dt><dd>${fiEsc(fiReliable(r.key) ? r.label : r.status)}</dd></div>
    </dl>
  </div>
  <p class="small ampel-note">${fiEsc(FI_TEXT)} ${fiEsc(FI_SCOPE)}</p>
  ${fiDetails(v, r)}`;
}

/* Aufklappbare Rechnung je Video: Formel mit Zahlen, Beiträge je Kategorie, Prüfabdeckung, Vergleichsindex. */
function fiDetails(v, r = fiRate(v)) {
  const claims = v?.data?.claims || [];
  const byId = new Map(claims.map(c => [c.id, c]));
  const groups = new Map();
  for (const x of r.contributions) {
    const c = byId.get(x.id);
    const key = `${c.verdict}|${x.p}|${x.f}|${x.u}|${x.ownShares}`;
    const g = groups.get(key) || { verdict: c.verdict, p: x.p, f: x.f, u: x.u, own: x.ownShares, n: 0, R: 0, num: 0, den: 0 };
    g.n++; g.R += x.R; g.num += x.num; g.den += x.den;
    groups.set(key, g);
  }
  const rows = [...groups.values()].sort((a, b) => b.n - a.n).map(g => `<tr><th scope="row">${fiEsc(g.verdict)}${g.own ? ' <span class="fi-tag">eigene Anteile</span>' : ''}</th><td>${g.n}</td><td>${fiShare(g.p)} / ${fiShare(g.f)} / ${fiShare(g.u)}</td><td>${fiNum(g.R, 2)}</td><td>${fiNum(g.num, 2)}</td><td>${fiNum(g.den, 2)}</td></tr>`).join('');
  const s = r.sums, k = FactIndex.CONFIG.refutedFactor;
  const formula = r.index == null ? '<p>Es gibt noch keine bewertete Tatsachenbehauptung, deshalb keinen Zahlenwert.</p>'
    : `<p class="fi-formula">I = Σ(R·p) ÷ Σ[R·(p + ${k}·f + u)] = ${fiNum(s.weightedNumerator, 2)} ÷ ${fiNum(s.weightedDenominator, 2)} = <strong>${fiEsc(FactIndex.format(r.indexRounded))}</strong></p>`;
  const cnt = r.counts;
  const cov = `<ul class="fi-list">
      <li>Geprüft mit belastbarem Ergebnis: <b>${cnt.belastbar}</b></li>
      <li>Geprüft, Ergebnis ungeklärt (nicht ausreichend belegbar): <b>${cnt.ungeklaert}</b></li>
      <li>Prüfung begonnen: <b>${cnt.in_pruefung}</b></li>
      <li>Noch nicht geprüft: <b>${cnt.ungeprueft}</b></li>
    </ul>
    <p class="small">Prüfabdeckung = geprüfte ÷ alle relevanten Tatsachenbehauptungen = ${r.done} ÷ ${r.done + r.pending}${r.coverage == null ? '' : ' = ' + FactIndex.percent(r.coverage)}. Sie ist unabhängig vom Index: Eine hohe Abdeckung heißt nicht, dass viel belegt ist. Nicht mitgezählt, weil keine bewertbare Tatsachenbehauptung: ${cnt.nicht_pruefbar} nicht überprüfbar, ${cnt.meinung} Meinungen oder Prognosen${cnt.fremdbezug ? `, ${cnt.fremdbezug} nur erwähnt oder zurückgewiesen` : ''}${cnt.duplikat ? `, ${cnt.duplikat} Wiederholungen` : ''}.</p>`;
  const weighted = r.contributions.filter(x => x.R !== FactIndex.CONFIG.weight.default);
  const infl = weighted.slice().sort((a, b) => Math.abs(b.R - 1) - Math.abs(a.R - 1)).slice(0, 8).map(x => {
    const c = byId.get(x.id);
    const without = FactIndex.withoutClaim(claims, x.id);
    return `<li><a href="#/video/${fiEsc(v.id)}/aussage/${fiEsc(x.id)}">${fiEsc(String(x.id).replace(v.id + '-', ''))}</a>: Faktor ${fiNum(x.R, 2)} · ${fiEsc(c.verdict)}${without == null ? '' : ` · ohne diese Aussage ${fiEsc(FactIndex.format(FactIndex.round(without)))}`}</li>`;
  }).join('');
  const cmp = r.index == null ? '' : `<h4>Vergleich ohne Bedeutungsfaktoren</h4>
    <p>Ungewichteter Index: <b>${fiEsc(FactIndex.format(r.unweightedRounded))}</b> · gewichteter Index: <b>${fiEsc(FactIndex.format(r.indexRounded))}</b> · Differenz: <b>${fiEsc(fiSigned(r.difference))}</b></p>
    <p class="small">${weighted.length ? `${weighted.length} Aussage${weighted.length === 1 ? ' hat' : 'n haben'} einen eingeschätzten Bedeutungsfaktor ungleich 1,0. Ein Faktor über 1 verstärkt den Einfluss einer Aussage, egal ob sie belegt oder widerlegt ist; die Differenz zeigt, wie stark diese Einschätzungen der KI-Prüfer das Ergebnis verändern.` : 'Alle Aussagen stehen noch auf dem Standardfaktor 1,0, deshalb sind beide Werte gleich. Die einzelnen Bedeutungsfaktoren werden nachträglich von den KI-Prüfern eingeschätzt und gegengeprüft.'}</p>
    ${infl ? `<ul class="fi-list">${infl}</ul>` : ''}`;
  return `<details class="fi-details">
    <summary>So ist der Faktenindex berechnet</summary>
    <div class="fi-body">
      <p>Jede bewertete Tatsachenbehauptung hat einen belegten Anteil p, einen widerlegten Anteil f und einen ungeklärten Anteil u (zusammen 1) sowie einen Bedeutungsfaktor R (Standard 1,0). Widerlegte Anteile zählen ${k}-fach.</p>
      ${formula}
      ${rows ? `<div class="fi-table-wrap"><table class="fi-table"><caption>Beiträge je Bewertung</caption><thead><tr><th scope="col">Bewertung</th><th scope="col">Aussagen</th><th scope="col">p / f / u</th><th scope="col">Σ R</th><th scope="col">Σ R·p</th><th scope="col">Σ R·(p+${k}f+u)</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
      <h4>Prüfabdeckung</h4>${cov}
      <h4>Ampel</h4><p>${fiEsc(r.reason)}</p>
      <p class="small">Grün ab ${FactIndex.format(FactIndex.CONFIG.thresholds.green)}, Gelb ab ${FactIndex.format(FactIndex.CONFIG.thresholds.yellow)}, darunter Rot. Grau, solange die Grundlage nicht reicht, unter anderem bei einer Prüfabdeckung unter ${FactIndex.percent(FactIndex.CONFIG.minCoverage)}${FactIndex.CONFIG.minCoverageProvisional ? ' (vorläufiger Standard, wird kalibriert, sobald genug Daten vorliegen)' : ''}.</p>
      ${cmp}
      <p class="small"><a href="#/methodik#faktenindex">Ausführliche Regel in der Methodik</a></p>
    </div>
  </details>`;
}

/* Kleine Kennzeichnung im Kopf einer Aussage, nur wenn der Faktor vom Standard abweicht oder strittig ist. */
function fiClaimBadge(c) {
  const x = c?.factIndex;
  if (!x || !('weight' in x)) return '';
  const R = FactIndex.weightOf(c);
  return `<span class="badge plain fi-badge" data-tip="Bedeutungsfaktor im Faktenindex: ${fiEsc(FactIndex.weightLabel(R))} (${fiEsc(x.weightStatus)}).">Bedeutung ${fiNum(R, R % 1 ? 2 : 1)}${x.weightStatus === 'Strittig' ? ' · strittig' : x.weightStatus === 'Vorläufig' ? ' · vorläufig' : ''}</span>`;
}

/* Detail je Aussage: Faktenstatus, Anteile, Bedeutungsfaktor mit Begründung, Kontrollen, Änderungen, Einfluss. */
function fiClaimBlock(c, v) {
  const cls = FactIndex.classify(c);
  const info = FactIndex.CLASSES[cls];
  const x = c.factIndex || {};
  const status = c.verdict || (c.status === 'Offen' ? 'Noch nicht geprüft' : c.status);
  const why = {
    meinung: 'Meinungen, Prognosen und Werturteile gehen nicht in den Faktenindex ein.',
    fremdbezug: 'Das Video macht sich diese Aussage nicht zu eigen (nur erwähnt, nachgefragt oder zurückgewiesen); sie zählt deshalb nicht.',
    duplikat: `Wiederholung von ${x.duplicateOf ? String(x.duplicateOf).replace(v.id + '-', '') : 'einer anderen Aussage'}; sie wird nur dort einmal gezählt.`,
    nicht_pruefbar: 'Für diese Aussage gibt es keine öffentliche Prüfgrundlage. Sie zählt weder für noch gegen den Index und nicht zur Prüfabdeckung.',
    ungeprueft: 'Noch nicht geprüft: Die Aussage zählt nicht im Index (weder als widerlegt noch als ungeklärt), senkt aber die Prüfabdeckung, bis sie geprüft ist.',
    in_pruefung: 'Prüfung begonnen: Die Aussage zählt erst nach Abschluss im Index und senkt bis dahin die Prüfabdeckung.'
  }[cls];
  const agents = new Set();
  if (x.assessedBy) agents.add(x.assessedBy);
  (x.reviews || []).forEach(r => r?.agent && agents.add(r.agent));
  (c.research?.rounds || []).forEach(r => r?.agent && agents.add(r.agent));
  const rows = [`<dt>Faktenstatus</dt><dd>${fiEsc(status)} · ${fiEsc(info.label)}</dd>`];
  if (!info.indexed) {
    rows.push(`<dt>Im Faktenindex</dt><dd>${fiEsc(why)}</dd>`);
  } else {
    const s = FactIndex.sharesOf(c);
    const R = FactIndex.weightOf(c);
    const con = FactIndex.contribution(c);
    const claims = v?.data?.claims || [];
    const all = FactIndex.compute(claims).index;
    const without = FactIndex.withoutClaim(claims, c.id);
    rows.push(`<dt>Anteile</dt><dd>belegt ${fiShare(s.p)} · widerlegt ${fiShare(s.f)} · ungeklärt ${fiShare(s.u)}${s.own ? ` (eigene Anteile: ${fiEsc(x.sharesReason)})` : ` (Standard für „${fiEsc(c.verdict)}“)`}</dd>`);
    if ('weight' in x) {
      rows.push(`<dt>Bedeutungsfaktor</dt><dd><b>${fiNum(R, 2)}</b> – KI-Einschätzung: ${fiEsc(FactIndex.weightLabel(R))} · ${fiEsc(x.weightStatus)} · eingeschätzt von ${fiEsc(x.assessedBy)} am ${fiEsc(x.assessedOn)}${x.assessedBeforeVerdict ? ', vor Kenntnis des Faktenurteils' : ', nach dem Faktenurteil'}</dd>`);
      if (x.weightReason) rows.push(`<dt>Begründung des Faktors</dt><dd>${fiEsc(x.weightReason)}</dd>`);
    } else {
      rows.push(`<dt>Bedeutungsfaktor</dt><dd><b>1,0</b> – Standardwert, noch nicht einzeln eingeschätzt</dd>`);
    }
    rows.push(`<dt>Einfluss</dt><dd>Zähler R·p = ${fiNum(con.num, 2)}, Nenner R·(p + ${FactIndex.CONFIG.refutedFactor}·f + u) = ${fiNum(con.den, 2)}${without == null || all == null ? '' : `; Index mit dieser Aussage ${fiEsc(FactIndex.format(FactIndex.round(all)))}, ohne sie ${fiEsc(FactIndex.format(FactIndex.round(without)))}`}</dd>`);
  }
  const reviews = (x.reviews || []).map(r => `<li>${fiEsc(r.date)} · ${fiEsc(r.agent)}: ${fiEsc(r.result)}${r.result === 'Abweichend' ? ` (vorgeschlagen ${fiNum(r.proposedWeight, 2)})` : ''} – ${fiEsc(r.reason)}</li>`).join('');
  if (reviews) rows.push(`<dt>Kontrollen und abweichende Einschätzungen</dt><dd><ul class="questions">${reviews}</ul></dd>`);
  const hist = (x.history || []).map(h => `<li>${fiEsc(h.date)} · ${fiEsc(h.agent)}: ${fiEsc(h.field)} ${fiEsc(String(h.previous))} → ${fiEsc(String(h.next))} – ${fiEsc(h.reason)}</li>`).join('');
  if (hist) rows.push(`<dt>Änderungen</dt><dd><ul class="questions">${hist}</ul></dd>`);
  if (agents.size) rows.push(`<dt>Beteiligte KI-Agenten</dt><dd>${fiEsc([...agents].join(', '))}</dd>`);
  return `<div class="fi-claim"><h4>Faktenindex</h4><dl class="kv">${rows.join('')}</dl></div>`;
}

/* Methodik, Abschnitt Faktenindex. demo: Funktion key -> HTML einer Beispielampel. */
function fiMethod(demo) {
  const C = FactIndex.CONFIG;
  const ex = (p, f) => {
    const claims = [];
    for (let i = 0; i < p; i++) claims.push({ id: 'p' + i, kind: 'Tatsachenbehauptung', status: 'Abgeschlossen', verdict: 'Belegt' });
    for (let i = 0; i < f; i++) claims.push({ id: 'f' + i, kind: 'Tatsachenbehauptung', status: 'Abgeschlossen', verdict: 'Widerlegt' });
    return FactIndex.format(FactIndex.compute(claims).indexRounded);
  };
  const map = Object.entries(C.shares).map(([k, s]) => `<tr><th scope="row">${fiEsc(k)}</th><td>${fiShare(s.p)}</td><td>${fiShare(s.f)}</td><td>${fiShare(s.u)}</td></tr>`).join('');
  const scale = C.weightScale.map(s => `<li><b>${fiNum(s.value, 1)}</b> – ${fiEsc(s.label)}</li>`).join('');
  return `<section class="section prose-plain" id="faktenindex"><h2>Faktenindex und Ampel: das Video auf einen Blick</h2>
      <p>Jedes Video erhält einen berechneten <strong>Faktenindex</strong> zwischen 0 und 1. 1,000 heißt: Alle bewerteten Tatsachenbehauptungen sind belegt. 0,000 heißt: Alle sind widerlegt. ${fiEsc(FI_TEXT)} ${fiEsc(FI_SCOPE)}</p>
      <p>Der Index ist eine offengelegte Rechnung aus den Einzelbewertungen oben. Er wird nirgends gespeichert und von niemandem gesetzt, auch nicht von einer KI: Er wird bei jedem Aufruf nach derselben Regel berechnet, auf allen drei Politik4M3-Faktencheckseiten gleich. Ändert sich eine Bewertung, eine Aussage oder ein Bedeutungsfaktor, ändern sich Index und Ampel überall sofort mit.</p>
      <h3>Rechnung</h3>
      <p class="fi-formula">Faktenindex = Σ(R·p) ÷ Σ[R·(p + ${C.refutedFactor}·f + u)]</p>
      <p>Für jede Aussage: p = belegter, f = widerlegter, u = ungeklärter Anteil (p + f + u = 1), R = Bedeutungsfaktor. Eine widerlegte Aussage wiegt ${C.refutedFactor}-mal so schwer wie eine belegte. Beispiele mit Faktor 1: 10 belegt, 0 widerlegt → ${ex(10, 0)}; 10 belegt, 1 widerlegt → ${ex(10, 1)}; 20 belegt, 1 widerlegt → ${ex(20, 1)}; 100 belegt, 1 widerlegt → ${ex(100, 1)}; 0 belegt, 10 widerlegt → ${ex(0, 10)}. Sobald eine Widerlegung vorliegt, erreicht der Index nie genau 1.</p>
      <div class="fi-table-wrap"><table class="fi-table"><caption>So gehen die Bewertungen ein</caption><thead><tr><th scope="col">Bewertung</th><th scope="col">belegt p</th><th scope="col">widerlegt f</th><th scope="col">ungeklärt u</th></tr></thead><tbody>${map}</tbody></table></div>
      <ul>
        <li><strong>Teilweise belegt</strong> und <strong>Irreführend / Kontext fehlt</strong> sind Mischfälle. Wenn die Prüfung genauer zeigt, welcher Teil belegt, widerlegt oder offen ist, dürfen die Prüfer andere Anteile setzen – nur mit Begründung, die bei der Aussage steht.</li>
        <li><strong>Gar nicht</strong> in den Index gehen ein: Meinungen, Prognosen, Werturteile und Satire; noch nicht geprüfte und laufende Prüfungen (ungeprüft ist weder falsch noch ungeklärt); nicht überprüfbare Aussagen ohne öffentliche Prüfgrundlage; Aussagen, die das Video nur erwähnt oder zurückweist; Wiederholungen derselben Aussage (jede Aussage zählt einmal, egal wie oft sie fällt).</li>
        <li>Gibt es keine bewertbare Tatsachenbehauptung, steht „Nicht bewertbar“ statt einer Zahl.</li>
      </ul>
      <h3>Bedeutungsfaktor</h3>
      <p>Nicht jede Aussage ist für ein Video gleich wichtig. Die KI-Prüfer können deshalb einen Bedeutungsfaktor vergeben; Standard ist 1,0. Zwischenwerte in Viertelschritten sind erlaubt.</p>
      <ul class="fi-list">${scale}</ul>
      <p>Maßstab ist allein, wie zentral die Aussage für die Hauptthese und Argumentation des Videos ist, welche Folgen eine falsche Darstellung hätte, ob sie besonders hervorgehoben wird und ob sie eigenständig ist. <strong>Nicht</strong> maßgeblich ist, ob sie stimmt: Eine zentrale belegte Aussage bekommt denselben Faktor wie eine zentrale widerlegte; die Bedeutung soll möglichst vor dem Faktenurteil eingeschätzt werden. Jeder Faktor ungleich 1,0 hat eine öffentliche Begründung und wird von einem anderen KI-Prüfer kontrolliert; ohne begründeten Konsens bleibt er „vorläufig“ oder „strittig“. Ein höherer Faktor ändert nie das Faktenurteil selbst. Zum Vergleich zeigt jede Videoseite aufgeklappt auch den Index ohne Bedeutungsfaktoren und die Differenz.</p>
      <h3>Prüfabdeckung</h3>
      <p>Die Prüfabdeckung zeigt getrennt vom Index, welcher Anteil der relevanten Tatsachenbehauptungen schon fertig geprüft ist (belastbares oder ungeklärtes Ergebnis) – gemessen an allen, die geprüft, gerade in Prüfung oder noch nicht geprüft sind. Eine hohe Prüfabdeckung heißt nicht, dass viel belegt ist; ein Index bei geringer Abdeckung ist nur vorläufig.</p>
      <h3>Ampel</h3>
      <p>Die Ampel ergibt sich ausschließlich aus dem Index und der Bewertbarkeit. Niemand kann sie von Hand oder per KI anders setzen.</p>
      <ul class="verdict-list">
        <li>${demo('gruen')}<p>Grün: Faktenindex ab ${FactIndex.format(C.thresholds.green)}.</p></li>
        <li>${demo('gelb')}<p>Gelb: ${FactIndex.format(C.thresholds.yellow)} bis unter ${FactIndex.format(C.thresholds.green)}.</p></li>
        <li>${demo('rot')}<p>Rot: unter ${FactIndex.format(C.thresholds.yellow)}.</p></li>
        <li>${demo('nicht_bewertbar')}<p>Grau – nicht bewertbar: weniger als ${C.minIndexed} bewertete Tatsachenbehauptungen, Prüfabdeckung unter ${FactIndex.percent(C.minCoverage)} oder weniger als ${C.minFactsPerHour} erfasste Tatsachenbehauptungen je Stunde Laufzeit (eine Auswahl, kein Querschnitt). Bei vollständig erfassten YouTube Shorts und Musikvideos genügen ${C.fullCapture.short.minIndexed} bewertete Aussagen.</p></li>
        <li>${demo('vorlaeufig')}<p>Grau – Prüfung läuft: Die Analyse ist noch nicht abgeschlossen und die Grundlage reicht noch nicht. Ein schon berechneter Index wird als „vorläufig“ angezeigt.</p></li>
      </ul>
      <p class="small">Die Mindestabdeckung von ${FactIndex.percent(C.minCoverage)} ist ein vorläufiger, bewusst vorsichtiger Standard. Sie wird überprüft, sobald genug geprüfte Videos eine Kalibrierung erlauben. Regelstand ${fiEsc(C.version)} vom ${fiEsc(C.since.split('-').reverse().join('.'))}.</p>
      <ul>
        <li id="musikvideos"><strong>YouTube Shorts und Musikvideos</strong> werden immer vollständig erfasst. Ein Lied darf zuspitzen und in Bildern sprechen; bewertet wird nur ein nachprüfbarer Tatsachenkern, reine Kunstsprache zählt nicht und ist keine Falschaussage. Bei so wenigen Aussagen kann schon eine einzige widerlegte die Farbe ändern; die Grundlage steht immer dabei.</li>
        <li><strong>Nachvollziehbarkeit:</strong> Jede Änderung eines Bedeutungsfaktors steht mit altem und neuem Wert, Grund, Datum und Agent bei der Aussage. Die Seite „Verlauf“ zeigt für jeden Stand, wie sich der Faktenindex eines Videos dadurch verändert hat.</li>
      </ul>
    </section>`;
}

/* Verlauf: Indexänderung eines Stands in Worten (Werte aus daten/verlauf.json, dort mit derselben Regel berechnet). */
function fiHistoryText(e) {
  const x = e?.factIndex;
  if (!x || (x.before == null && x.after == null) || x.before === x.after) return '';
  const f = y => (y == null ? 'nicht bewertbar' : FactIndex.format(y));
  return `Faktenindex ${f(x.before)} → ${f(x.after)}`;
}
