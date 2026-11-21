/* Read-only Arbeitsdiagnose. Farbe und Index kommen ausschließlich aus FactIndex.rate.
 * Zeigt alle gleichzeitig bestehenden Hürden, auch wenn rate nur die erste nennt. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./faktenindex.js'));
  else root.FactProgress = factory(root.FactIndex);
})(typeof self !== 'undefined' ? self : this, function (FactIndex) {
  'use strict';
  function audit(data, video) {
    const rating = FactIndex.rate(data, video);
    const blockers = [];
    const add = (code, text) => blockers.push({ code, text });
    const pending = (data?.claims || []).filter(c => ['ungeprueft', 'in_pruefung', 'zuordnung_offen'].includes(FactIndex.classify(c)));
    if (!Array.isArray(data?.claims)) {
      add('daten', 'Strukturierte Aussagen mit Originalfundstellen und Quellen erfassen und prüfen.');
      return { rating, blockers, pending };
    }
    if (video?.workStatus === 'In Bearbeitung') add('arbeitsstand', 'Die Analyse läuft noch. Erfassung und Quellenprüfung abschließen; den Arbeitsstand erst danach aktualisieren.');
    if (rating.index == null) add('kein_index', 'Noch keine bewertbare Tatsachenbehauptung im Faktenindex.');
    if (rating.indexed < rating.minIndexed) add('mindestzahl', `${rating.indexed} bewertete Tatsachenbehauptungen im Index; mindestens ${rating.minIndexed} erforderlich.`);
    if (rating.coverage != null && rating.coverage < FactIndex.CONFIG.minCoverage) add('abdeckung', `Prüfabdeckung ${FactIndex.percent(rating.coverage)}; mindestens ${FactIndex.percent(FactIndex.CONFIG.minCoverage)} erforderlich. Offene Sachprüfungen und ungeklärte Zurechnungen bearbeiten.`);
    const seconds = Number(data.scope?.durationSeconds);
    const minimum = seconds > 0 ? Math.ceil(seconds / 3600 * FactIndex.CONFIG.minFactsPerHour) : null;
    if (minimum != null && rating.facts < minimum) add('erfassungsdichte', `${rating.facts} Tatsachenbehauptungen erfasst; bei dieser Laufzeit mindestens ${minimum} erforderlich. Mindestens ${minimum - rating.facts} weitere eigenständige Tatsachen aus dem gesamten Video erfassen und prüfen. Keine Wiederholungen zum Auffüllen zählen.`);
    return { rating, blockers, pending };
  }
  return { audit };
});
