# Faktenampel – ersetzt durch den Faktenindex

Seit dem 20.11.2026 beruht die Faktenampel auf dem gemeinsamen **Faktenindex** aller Politik4M3-Faktencheckseiten. Die verbindliche Regel steht in [FAKTENINDEX.md](FAKTENINDEX.md), die Berechnung in `site/faktenindex.js`.

## Was sich geändert hat

| Bis 19.11.2026 (`site/ampel.js`) | Seit 20.11.2026 (`site/faktenindex.js`) |
| --- | --- |
| Fehleranteil = (Widerlegt + Irreführend) ÷ entschiedene Tatsachenbehauptungen | Faktenindex I = Σ(R·p) ÷ Σ[R·(p + 5·f + u)], widerlegte Anteile fünffach |
| Grün unter 10 %, Gelb unter 25 %, Rot ab 25 % Fehleranteil | Grün ab 0,800, Gelb ab 0,400, Rot darunter |
| Teilweise belegt zählte wie belegt, Nicht ausreichend belegbar gar nicht | Teilweise belegt zu drei Vierteln belegt, zu einem Viertel ungeklärt; Irreführend zu drei Vierteln belegt, zu einem Viertel widerlegt; Nicht ausreichend belegbar ungeklärt |
| Mindestens 20 % der erfassten Tatsachenbehauptungen entschieden | Prüfabdeckung mindestens 80 % (vorläufiger Standard); nicht überprüfbare zählen nicht mit |
| Mindestens 10 entschieden (Shorts/Musikvideos 3), 20 erfasste je Stunde | unverändert, gezählt werden die in den Index eingehenden Aussagen |
| Keine Bedeutungsgewichtung | Bedeutungsfaktor R je Aussage, Standard 1,0 |

Unverändert gilt: Die Ampel wird nie gespeichert oder gesetzt, nur berechnet. Darstellungshinweise fließen nie ein. Ein abgeschlossenes Video erscheint nie als „Prüfung läuft“. Die Ampel beschreibt nur den geprüften Bestand, nicht das ganze Video und keine Person.
