# Rangliste – Videos nach Faktenindex

Erstellt von: Claude, auf Auftrag von Jens (20.11.2026).

**Diese Regel und `site/rangliste.js` sind in allen drei Repositories gleich** (`politik4m3Facktencheck`, `politik4m3FaktencheckUngeskriptet`, `politik4m3FaktencheckKlima`).

## Was die Seite zeigt

Die Seite „Rangliste“ (`#/rangliste`, Menüpunkt in der oberen Leiste) ordnet alle geprüften Videos nach ihrem [Faktenindex](FAKTENINDEX.md): gut belegte Faktenlage oben, viele widerlegte Aussagen unten.

## Regeln

1. **Nur berechnet.** Grundlage ist ausschließlich `FactIndex.rate` aus `site/faktenindex.js`. Die Rangliste speichert nichts, hat kein eigenes Datenfeld und verändert keine Bewertung. Ändert sich eine Bewertung, ein Bedeutungsfaktor oder die Regel des Faktenindex, ändert sich die Reihenfolge beim nächsten Aufruf von selbst.
2. **Platz nur mit belastbarer Ampel.** Einen Platz bekommen nur Videos mit Ampel Grün, Gelb oder Rot. Videos mit grauer Ampel (nicht bewertbar oder Prüfung läuft) stehen getrennt unter „Noch ohne Platz“; ein vorläufiger Index wird dort nur angezeigt und zählt nicht.
3. **Reihenfolge.** Höherer Index (auf drei Stellen gerundet, wie angezeigt) zuerst. Gleicher Index heißt gleicher Platz („1, 1, 3“). Innerhalb gleicher Plätze ordnen höhere Prüfabdeckung, dann mehr bewertete Aussagen, dann der Titel.
4. **Videos, keine Personen.** Die Rangliste bewertet die Faktenlage der geprüften Aussagen eines Videos. Sie ist keine Glaubwürdigkeitsnote für Gäste, Moderatoren oder Kanäle.
5. Wo es Originale und Reaktionen gibt, lässt sich die Liste danach filtern.

Agenten setzen nie einen Platz von Hand und ändern nie eine Einzelbewertung, um einen Platz zu erreichen. Änderungen an der Reihenfolge nur in `site/rangliste.js` mit Tests (`site/rangliste-test.js`) und dieser Datei, in allen drei Repositories gleich.
