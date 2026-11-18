# Vorläufige Prüfdaten und Beziehungen

[Codex] · 18.11.2026. Dies ist ein maschinenlesbarer Austauschblock innerhalb eines erlaubten Dokumentationspfads, kein Produktionsschema. `verdict` beurteilt jeweils die paraphrasierte Aussage Alfreds; alle Befunde bleiben redaktionell vorläufig. `offen` bedeutet unvollständige Prüfung, nicht falsch oder prinzipiell unbelegbar. `same_topic` ist lediglich ein Themenverweis; die Richtung der Originalbehauptung kann abweichen. Es darf daraus kein automatischer Bewertungskonflikt berechnet werden.

```json
{
  "format": "codex-reaction-review-workspace-v1",
  "reviewer": "[Codex]",
  "asOf": "2026-11-18",
  "baselineCommit": "61d7cca135132c178a07b1e5cb8872eb1cc37e51",
  "issueUrl": "https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/issues/5",
  "video": {
    "id": "sLMyP0H7tSY",
    "url": "https://www.youtube.com/watch?v=sLMyP0H7tSY",
    "role": "reaction",
    "title": "Verbietet der digitale Euro, was wir kaufen? Horst Lüning bei Ungeskriptet",
    "channel": "Alfred räumt auf",
    "durationSeconds": 999
  },
  "originalVideoId": "mlxFA9T88I0",
  "coverage": {
    "status": "teilpruefung",
    "basis": "Vollständiges verfügbares Alfred-Untertitelmaterial und relevante Originalpassagen; unabhängige Prüfung der benannten Quellenabschnitte",
    "firstCaptionStartSeconds": 0,
    "lastCaptionStartSeconds": 985,
    "directAudiovisualReview": false,
    "editorialSecondReview": false,
    "readyForPublication": false,
    "limits": [
      "Kein fremdes Transkript gespeichert",
      "Untertitel decken keine vollständigen Bildinformationen ab",
      "Originalaussage-IDs und Suchzeiten sind keine neue akustische Sprecherbestätigung",
      "Keine Gesamtquote und keine Personennoten"
    ]
  },
  "sources": [
    {
      "id": "P01",
      "title": "Alfred-Upload und YouTube-oEmbed",
      "url": "https://www.youtube.com/watch?v=sLMyP0H7tSY",
      "access": "metadaten",
      "accessedOn": "2026-11-18",
      "basis": "YouTube-oEmbed direkt gelesen; Beschreibung und Laufzeit via vidIQ. Untertitel vollständig gelesen; keine direkte audiovisuelle Sichtung."
    },
    {
      "id": "P02",
      "title": "HSE: DSEAR",
      "url": "https://www.hse.gov.uk/fireandexplosion/dsear.htm",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Abschnitte zu Pflichten, Zonen und Zündquellen; heutiger Erläuterungstext."
    },
    {
      "id": "P03",
      "title": "Diageo: Malt Brand Homes Terms and Conditions",
      "url": "https://www.malts.com/en/malt-brand-homes-terms-and-conditions",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Abschnitt Filming and Photography; heutige Hausregeln, kein historischer Vorher-Nachher-Beleg."
    },
    {
      "id": "P04",
      "title": "Scotch Whisky Association: Health & Safety",
      "url": "https://scotch-whisky.org.uk/industry-insights/sustainability/health-safety/",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Abschnitt Fire risks; Branchenverband als Quelle für eigene Sicherheitsbeschreibung, keine unabhängige Unfallvollerhebung."
    },
    {
      "id": "P05",
      "title": "Hansard: Warehouse Fire, Glasgow, 29.03.1960",
      "url": "https://api.parliament.uk/historic-hansard/commons/1960/mar/29/warehouse-fire-glasgow",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Ministerantwort: Lagerhaus, Explosion, 14 Feuerwehrleute und fünf Angehörige des Salvage Corps. Die Frage nennt abweichend 18; maßgeblich ist die differenzierte Antwort."
    },
    {
      "id": "P06",
      "title": "Hansard: Scotch Whisky (Transportation), 02.11.1994",
      "url": "https://api.parliament.uk/historic-hansard/written-answers/1994/nov/02/scotch-whisky-transportation",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Regierungsantwort zu Fässern über 250 Litern und vorgeschlagenen Ausnahmen innerhalb Großbritanniens; keine umgesetzte Endfassung."
    },
    {
      "id": "P07",
      "title": "BMF: Kreditaufnahmebericht des Bundes 2025",
      "url": "https://www.deutsche-finanzagentur.de/fileadmin/user_upload/Finanzagentur/pdf/kreditaufnahmeberichte/Kreditaufnahmebericht_2025.pdf",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Text relevanter Abschnitte geprüft: Tabelle 7 (Druckseite 27), Tabelle 17 (55), Anhang 4.6 (83). Keine vollständige Prüfung der 96 PDF-Seiten; keine visuelle Tabellenkontrolle als Nachweis verwendet."
    },
    {
      "id": "P08",
      "title": "Wissenschaftliche Dienste: WD 4-3000-009/26, 19.02.2026",
      "url": "https://www.bundestag.de/resource/blob/1157946/WD-4-009-26.pdf",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Text Tabelle 6 und Abgrenzung auf Druckseite 20 sowie Planung auf Seite 22 geprüft; amtliche Zusammenstellung, keine Primärbuchführung."
    },
    {
      "id": "P09",
      "title": "Bundestag: Finanzplan 2026–2030, 14.08.2026",
      "url": "https://www.bundestag.de/presse/hib/kurzmeldungen-1205072",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Absatz zu Zinsplanwerten und deren Einbeziehung von Sondervermögen; hib-Zusammenfassung der Regierungsvorlage, vollständige Vorlage nicht geprüft."
    },
    {
      "id": "P10",
      "title": "EZB: FAQs on the digital euro, Seitenkopf 17.08.2026",
      "url": "https://www.ecb.europa.eu/euro/digital_euro/faqs/html/ecb.faq_digital_euro.en.html",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Relevante Projektbeschreibungen, besonders Fragen 20 und 24. Dynamische Seite; angezeigtes Aktualisierungsdatum ist kein Nachweis unveränderter historischer Fassung."
    },
    {
      "id": "P11",
      "title": "Europäisches Parlament: Verfahren 2023/0212(COD)",
      "url": "https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2023%2F0212%28COD%29",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Status und Ereignisliste beim Abruf: noch keine erste Parlamentsposition; kein abgeschlossener Rechtsakt."
    },
    {
      "id": "P12",
      "title": "EZB: Pandemic Emergency Purchase Programme",
      "url": "https://www.ecb.europa.eu/mopo/implement/pepp/html/index.en.html",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Öffentliche Beschreibung, Beginn März 2020 und Wertpapierankäufe. Keine vollständige Untersuchung sämtlicher Pandemiehilfen."
    },
    {
      "id": "P13",
      "title": "Cour de justice de la République: Urteil 19.12.2016",
      "url": "https://www.legifrance.gouv.fr/juri/id/JURITEXT000033943496",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Tatvorwurf, Gründe und Tenor gelesen. Seitenmetadaten nennen Cour de cassation, der Entscheidungstext benennt CJR. Spätere Rechtsmittelhistorie nicht geprüft."
    },
    {
      "id": "P14",
      "title": "YouTube: Voraussetzungen des Partnerprogramms",
      "url": "https://support.google.com/youtube/answer/72851?hl=de",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Langformat-Schwelle und anschließende Kanalprüfung; aktueller dynamischer Hilfetext."
    },
    {
      "id": "P15",
      "title": "Whisky.de: Chronik 30 Jahre",
      "url": "https://www.whisky.de/ueber-uns/firmenportrait/chronik-30-jahre.html",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Abschnitte 1990–1994 und 1995–2001: Gründung, technische Ausbildung, Direktmarketing. Unternehmensselbstauskunft, kein Studien- oder Registeraudit."
    },
    {
      "id": "P16",
      "title": "HSE: ATEX and explosive atmospheres",
      "url": "https://www.hse.gov.uk/fireandexplosion/atex.htm",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Zuordnung Richtlinie 99/92/EC und britische Umsetzung durch DSEAR."
    },
    {
      "id": "P17",
      "title": "Kommission: COM(2023)369",
      "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52023PC0369",
      "access": "blockiert",
      "accessedOn": "2026-11-18",
      "basis": "EUR-Lex lieferte Bot-/JavaScript-Abfrage; HTML/PDF-Varianten und Parlamentskopie ergaben keinen lesbaren Entwurf. Kein Gesetzeszitat verifiziert."
    },
    {
      "id": "P18",
      "title": "EU: Richtlinie 1999/92/EG",
      "url": "https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:31999L0092",
      "access": "blockiert",
      "accessedOn": "2026-11-18",
      "basis": "Kein lesbarer Volltext in diesem Zugriff; regulatorischer Zusammenhang stattdessen anhand HSE geprüft."
    },
    {
      "id": "P19",
      "title": "EZB: Lebenslauf Christine Lagarde",
      "url": "https://www.ecb.europa.eu/ecb/decisions/html/cvlagarde.en.html",
      "access": "gelesen",
      "accessedOn": "2026-11-18",
      "basis": "Ministeramt 2007–2011 und EZB-Präsidentschaft seit November 2019."
    },
    {
      "id": "P20",
      "title": "Originalinterview",
      "url": "https://www.youtube.com/watch?v=mlxFA9T88I0",
      "access": "untertitel",
      "accessedOn": "2026-11-18",
      "basis": "Relevante Original-Untertitelpassagen erneut gelesen; keine direkte akustische Sprecherkontrolle und keine neue Vollprüfung des dreistündigen Interviews."
    }
  ],
  "claims": [
    {
      "id": "sLMyP0H7tSY-A0001",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 16,
        "endSeconds": 86,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "wiedergabe",
      "description": "Lüning wird als technisch ausgebildeter Whiskyunternehmer mit Unternehmensbeginn 1993 vorgestellt.",
      "status": "vorlaeufig",
      "verdict": "teilweise",
      "reason": "P15 stützt Jahr und Ausbildung als Unternehmensselbstauskunft. Die konkrete Berufsakademie und eine gemeinsame rechtliche Gründerrolle sind hier nicht unabhängig belegt; die Chronik bezeichnet Theresia als Gründerin.",
      "sourceRefs": [
        "P01",
        "P15"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0084",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Teilweise belegt",
          "baselineOccurrences": [
            {
              "startSeconds": 2480,
              "endSeconds": 2488,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S040",
            "S056"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0345",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 9095,
              "endSeconds": 9100,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            null
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0025",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 376,
              "endSeconds": 393,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            null
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0002",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 52,
        "endSeconds": 69,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "wiedergabe",
      "description": "Umsatz und 167 Brennereibesuche werden ausdrücklich als eigene Angaben Lünings berichtet.",
      "status": "vorlaeufig",
      "verdict": "offen",
      "reason": "Die entsprechenden Originalstellen und Vergleichs-IDs sind vorhanden. Die Genauigkeit von Besuchszählung und damaligem Umsatz ist damit extern nicht bestätigt. Alfreds Zuschreibung als Selbstauskunft ist von einer Übernahme als geprüfte Kennzahl zu unterscheiden.",
      "sourceRefs": [
        "P01",
        "P20"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0082",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Teilweise belegt",
          "baselineOccurrences": [
            {
              "startSeconds": 2442,
              "endSeconds": 2462,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S056"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0134",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3640,
              "endSeconds": 3656,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S040"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0003",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 69,
        "endSeconds": 106,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "wertung",
      "description": "Aus beruflicher Erfahrung wird eine unterschiedliche fachliche Vertrauenswürdigkeit für Whisky und Staatsschulden abgeleitet.",
      "status": "vorlaeufig",
      "verdict": "meinung",
      "reason": "Kompetenzurteil und satirische Zuspitzung, kein eigenständiger Zahlenbeleg. Fachfremdheit widerlegt keine Aussage; berufliche Erfahrung bestätigt sie nicht.",
      "sourceRefs": [
        "P01"
      ],
      "originalRefs": []
    },
    {
      "id": "sLMyP0H7tSY-A0004",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 180,
        "endSeconds": 195,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Europäischer Explosionsschutz um die Jahrtausendwende hat einen realen regulatorischen Hintergrund.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P16 ordnet die EU-Arbeitsschutzrichtlinie und britische Umsetzung zu. Keine Bestätigung der pauschalen Umklassifizierung jeder Brennerei oder konkreter Millionenaufwendungen.",
      "sourceRefs": [
        "P02",
        "P16"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0143",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3669,
              "endSeconds": 3673,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S046"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0144",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3681,
              "endSeconds": 3688,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S045",
            "S046"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0145",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3686,
              "endSeconds": 3692,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S045",
            "S046"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0005",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 180,
        "endSeconds": 211,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Diageo untersagt Foto- und Aufnahmegeräte aus Sicherheitsgründen in bestimmten Bereichen.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P03 erlaubt private Kameranutzung grundsätzlich und mögliche Verbote in bezeichneten Bereichen. Betriebliche Besucherregeln sind kein generelles gesetzliches Fotografieverbot.",
      "sourceRefs": [
        "P03"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0141",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3645,
              "endSeconds": 3655,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S045"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0142",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Irreführend / Kontext fehlt",
          "baselineOccurrences": [
            {
              "startSeconds": 3670,
              "endSeconds": 3682,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            },
            {
              "startSeconds": 3680,
              "endSeconds": 3683,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S045",
            "S046"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0006",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 195,
        "endSeconds": 228,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Die Whiskybranche behandelt Feuer und Explosion wegen leicht entzündlichen Ethanols als reale Gefahren.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P04 benennt dies ausdrücklich; P02 verlangt risikobezogene Vermeidung von Zündquellen. Das belegt keinen bestimmten durch eine Kamera ausgelösten Unfall.",
      "sourceRefs": [
        "P04",
        "P02"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0140",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Irreführend / Kontext fehlt",
          "baselineOccurrences": [
            {
              "startSeconds": 3656,
              "endSeconds": 3669,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S045",
            "S047"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0007",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 228,
        "endSeconds": 244,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Ein Glasgower Lagerhausbrand 1960 mit Explosion forderte 14 Feuerwehrleute und fünf Bergungsdienstangehörige.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P05 bestätigt Ort, Explosion und getrennte Opferzahlen. Alfred grenzt das Lagerhaus selbst von einer Brennerei ab; damit kein wörtlicher Gegenbeleg für jeden engeren Brennerei-Bezug.",
      "sourceRefs": [
        "P05"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0146",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Irreführend / Kontext fehlt",
          "baselineOccurrences": [
            {
              "startSeconds": 3687,
              "endSeconds": 3693,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S059",
            "S062"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0008",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 228,
        "endSeconds": 244,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Das Glasgower Lagerhaus wird als voller Whisky beschrieben.",
      "status": "vorlaeufig",
      "verdict": "offen",
      "reason": "Die gelesene Ministerantwort P05 nennt ein Zolllager, nicht dessen Inhalt. Das Detail wurde in diesem Durchlauf nicht durch eine weitere Primärquelle bestätigt; daraus folgt keine Widerlegung.",
      "sourceRefs": [
        "P01",
        "P05"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0146",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Irreführend / Kontext fehlt",
          "baselineOccurrences": [
            {
              "startSeconds": 3687,
              "endSeconds": 3693,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S059",
            "S062"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0009",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 244,
        "endSeconds": 259,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "1994 drohten unbeabsichtigte Bauartprüfungen für große Whiskyfässer; der Branchenverband intervenierte.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P06 dokumentiert Eingaben, Fässer über 250 Liter und den vorgeschlagenen Ausnahmepfad innerhalb Großbritanniens. Keine Gleichsetzung mit einem beabsichtigten allgemeinen Transportverbot.",
      "sourceRefs": [
        "P06"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0147",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3692,
              "endSeconds": 3704,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            null
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0148",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3704,
              "endSeconds": 3711,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            null
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0010",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 259,
        "endSeconds": 275,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "schlussfolgerung",
      "description": "Die Fässer durften nach der Intervention bleiben; niemand habe eine Verbotswirkung gewollt.",
      "status": "vorlaeufig",
      "verdict": "teilweise",
      "reason": "Die damalige Regierungsantwort beschreibt eine beabsichtigte Ausnahme, nicht deren späteren Vollzug. Sie bezeichnet die Prüfanforderung als unbeabsichtigt, belegt aber nicht die Absicht sämtlicher Beteiligter. Alfred verallgemeinert hier eine begrenzte Quelle.",
      "sourceRefs": [
        "P06"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0147",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3692,
              "endSeconds": 3704,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            null
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0148",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3704,
              "endSeconds": 3711,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            null
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0011",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 356,
        "endSeconds": 373,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Die historischen Zinsausgaben werden mit knapp vier Milliarden 2021 und rund 39 Milliarden 2023 angegeben.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "Zahlen passen gerundet zur saldierten Reihe P07 Tabelle 7. Abweichende Kernhaushaltsreihe P08 ist eine andere Abgrenzung, kein automatischer Gegenbeweis; siehe R02.",
      "sourceRefs": [
        "P07",
        "P08"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0221",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Belegt",
          "baselineOccurrences": [
            {
              "startSeconds": 5285,
              "endSeconds": 5300,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S070"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0222",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Widerlegt",
          "baselineOccurrences": [
            {
              "startSeconds": 5315,
              "endSeconds": 5320,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            },
            {
              "startSeconds": 5345,
              "endSeconds": 5352,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S070"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0223",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Irreführend / Kontext fehlt",
          "baselineOccurrences": [
            {
              "startSeconds": 5352,
              "endSeconds": 5375,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S070"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0012",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 388,
        "endSeconds": 403,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Die durchschnittliche Restlaufzeit des Bundesportfolios stieg zwischen Ende 2021 und Ende 2024.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P07 Anhang 4.6: ohne Swaps 6,90 auf 7,63 Jahre. Keine Aussage über jede einzelne Neuemission oder die gesamte öffentliche Verschuldung einschließlich Länder und Gemeinden.",
      "sourceRefs": [
        "P07"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0224",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Widerlegt",
          "baselineOccurrences": [
            {
              "startSeconds": 5320,
              "endSeconds": 5345,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S071",
            "S072"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0013",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 403,
        "endSeconds": 450,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Agio-/Disagiobuchungen erklären einen wesentlichen Teil des ausgewiesenen Zinssprungs; ohne diese etwa 15 bzw. 22 Milliarden.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "Eigene Rechnung aus P07 Tabelle 7: 3,8−(−11,1)=14,9; 39,2−17,6=21,6. Dies isoliert die genannten Buchungen, liefert keine vollständige periodengerechte historische Zinsreihe und keine alleinige Kausalerklärung.",
      "sourceRefs": [
        "P07"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0223",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Irreführend / Kontext fehlt",
          "baselineOccurrences": [
            {
              "startSeconds": 5352,
              "endSeconds": 5375,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S070"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0225",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Belegt",
          "baselineOccurrences": [
            {
              "startSeconds": 5343,
              "endSeconds": 5350,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S070"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0014",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 373,
        "endSeconds": 388,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Die Regierungsplanung sieht etwa 68 Milliarden Zinsen für 2029 und über 80 Milliarden für 2030 vor.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P09 enthält die entsprechenden Planwerte. Ausgabenpläne sind keine realisierten Zahlen.",
      "sourceRefs": [
        "P09"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0226",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Meinung / Prognose",
          "baselineOccurrences": [
            {
              "startSeconds": 5375,
              "endSeconds": 5386,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S070"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0015",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 373,
        "endSeconds": 388,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "schlussfolgerung",
      "description": "Lünings 80-Milliarden-Prognose liege nahe an der Regierungsplanung.",
      "status": "vorlaeufig",
      "verdict": "teilweise",
      "reason": "Die Größenordnung passt zu 2030, aber der Original-Vergleichsstand erfasst als Bezug das Ende der laufenden Koalition. Ein Jahresversatz darf nicht stillschweigend als Übereinstimmung gelten; siehe R03.",
      "sourceRefs": [
        "P09",
        "P20"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0226",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Meinung / Prognose",
          "baselineOccurrences": [
            {
              "startSeconds": 5375,
              "endSeconds": 5386,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S070"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0227",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Meinung / Prognose",
          "baselineOccurrences": [
            {
              "startSeconds": 5386,
              "endSeconds": 5403,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S070"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0016",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 463,
        "endSeconds": 487,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "schlussfolgerung",
      "description": "Die wiederholte Erzählung einer heimlichen Bankenrettung wird zurückgewiesen.",
      "status": "vorlaeufig",
      "verdict": "teilweise",
      "reason": "P12 dokumentiert ein öffentliches Wertpapierkaufprogramm, keine allgemeine Eigenkapitalzuführung. Dass es Finanzierungsbedingungen stützte, ist damit nicht ausgeschlossen. Das im Original unscharf benannte Pandemieprogramm ist nur plausibel PEPP; nicht alle Bankenhilfen untersucht.",
      "sourceRefs": [
        "P12",
        "P20"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0250",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Irreführend / Kontext fehlt",
          "baselineOccurrences": [
            {
              "startSeconds": 5730,
              "endSeconds": 5765,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S082"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0017",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 530,
        "endSeconds": 562,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Der digitale Euro soll Bargeld ergänzen; das Gesetzgebungsverfahren ist noch nicht abgeschlossen.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P10 beschreibt das Projekt, P11 zeigt ein offenes Verfahren. Keine Aussage über den endgültigen Rechtsakt oder ein festes Einführungsdatum.",
      "sourceRefs": [
        "P10",
        "P11"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0269",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Widerlegt",
          "baselineOccurrences": [
            {
              "startSeconds": 6455,
              "endSeconds": 6470,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S086"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0018",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 547,
        "endSeconds": 578,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Haltegrenzen und verknüpfte Bankkonten sollen große Zahlungsbeträge trotz begrenzten digitalen Guthabens ermöglichen.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P10 erläutert hypothetische getestete Grenzen bis 3.000 Euro und Kontoverknüpfung. Das ist keine bereits beschlossene allgemeine Abhebe- oder Kaufobergrenze.",
      "sourceRefs": [
        "P10"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0270",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Teilweise belegt",
          "baselineOccurrences": [
            {
              "startSeconds": 6455,
              "endSeconds": 6462,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S086"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0019",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 578,
        "endSeconds": 612,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Programmierbare Verwendungsbeschränkungen passen nicht zum veröffentlichten Euro-Konzept.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P10 grenzt sie ausdrücklich von bedingten Zahlungen ab. Künftige Änderungen und allgemeine Kauf-/Sanktionsgesetze sind damit nicht ausgeschlossen; deren Missbrauch ist hier nicht festgestellt.",
      "sourceRefs": [
        "P10"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0269",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Widerlegt",
          "baselineOccurrences": [
            {
              "startSeconds": 6455,
              "endSeconds": 6470,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S086"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0271",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Meinung / Prognose",
          "baselineOccurrences": [
            {
              "startSeconds": 6420,
              "endSeconds": 6455,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            null
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0020",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 578,
        "endSeconds": 612,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "rechtsbehauptung",
      "description": "Der Kommissionsentwurf schließe programmierbares Geld ausdrücklich aus; Kaufverbote erforderten eine Gesetzesänderung.",
      "status": "vorlaeufig",
      "verdict": "offen",
      "reason": "Der genaue Entwurfstext P17 war nicht lesbar. Die Aussage ist mit P10 vereinbar, aber damit nicht wortlautgetreu juristisch verifiziert. Eine Garantie gegen jede anders begründete staatliche Zahlungsbeschränkung wäre weitergehend.",
      "sourceRefs": [
        "P10",
        "P17"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0269",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Widerlegt",
          "baselineOccurrences": [
            {
              "startSeconds": 6455,
              "endSeconds": 6470,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S086"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0021",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 612,
        "endSeconds": 645,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Lagarde ist EZB-Präsidentin und war französische Finanzministerin.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P19 bestätigt beide Funktionen. Politische Auswahl und rechtliche Unabhängigkeit sind getrennte Fragen; aus dem Amt folgt keine konkrete politische Weisung.",
      "sourceRefs": [
        "P19"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0275",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Belegt",
          "baselineOccurrences": [
            {
              "startSeconds": 6555,
              "endSeconds": 6560,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S087"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0022",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 645,
        "endSeconds": 692,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Der Lagarde-Schuldspruch betrifft Fahrlässigkeit und die durch Dritte veruntreuten 45 Millionen; die größere Schiedssumme ist davon zu unterscheiden.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P13 trennt Anklageumfang und Tenor. Alfreds Differenzierung ist im Kern zutreffend; 403 Millionen sind nicht der im Tenor festgestellte Betrag eigener Veruntreuung Lagardes. Siehe R04.",
      "sourceRefs": [
        "P13"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0276",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Widerlegt",
          "baselineOccurrences": [
            {
              "startSeconds": 6560,
              "endSeconds": 6585,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S115"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0023",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 659,
        "endSeconds": 712,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Das Gericht berücksichtigte unter anderem Persönlichkeit und Ruf, befreite von Strafe und ordnete keinen Registereintrag an.",
      "status": "vorlaeufig",
      "verdict": "belegt",
      "reason": "P13 Gründe und Tenor stützen diese Trennung. Keine nachträglich nicht vollstreckte Strafe. Die spätere Rechtsmittelhistorie wird hier nicht als zusätzlich geprüft ausgegeben.",
      "sourceRefs": [
        "P13"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0276",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Widerlegt",
          "baselineOccurrences": [
            {
              "startSeconds": 6560,
              "endSeconds": 6585,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S115"
          ]
        }
      ]
    },
    {
      "id": "sLMyP0H7tSY-A0024",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 712,
        "endSeconds": 746,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "wertung",
      "description": "Vier ausgewählte Sachkomplexe werden als wiederkehrendes Muster fehlerhafter Erklärungen zusammengefasst.",
      "status": "vorlaeufig",
      "verdict": "meinung",
      "reason": "Übergreifende Bewertung, keine vollständige Fehlerstatistik des Interviews. Jeder Sachkomplex enthält zutreffende und eingeschränkte Teilbefunde.",
      "sourceRefs": [
        "P01"
      ],
      "originalRefs": []
    },
    {
      "id": "sLMyP0H7tSY-A0025",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 729,
        "endSeconds": 854,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "methodik",
      "description": "Die Indexregel fasst widerlegte und nicht überprüfbare Aussagen zusammen; daneben werden andere subjektive Kategorien gebildet.",
      "status": "vorlaeufig",
      "verdict": "meinung",
      "reason": "Offengelegte eigene Bewertungsregel. Unser Projekt übernimmt weder diese Gleichsetzung noch Personennoten. Ungeprüft, nicht überprüfbar und falsch müssen weiterhin getrennt bleiben.",
      "sourceRefs": [
        "P01"
      ],
      "originalRefs": []
    },
    {
      "id": "sLMyP0H7tSY-A0026",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 777,
        "endSeconds": 874,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "zaehlung",
      "description": "Die genannten Indexhäufigkeiten, Redezeit, Prozentabstände und Rangfolge seien aus dem ganzen Gespräch ermittelt.",
      "status": "vorlaeufig",
      "verdict": "offen",
      "reason": "Im gelesenen Text fehlen vollständige Codierliste, Nenner und Gewichtungsrechnung. Grafiken wurden nicht gesichtet. Die Zählung ist hier nicht reproduziert und nicht widerlegt. Zwei Nennungen in einer Indexkategorie sind nicht zwei Sachthemen.",
      "sourceRefs": [
        "P01"
      ],
      "originalRefs": []
    },
    {
      "id": "sLMyP0H7tSY-A0027",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 874,
        "endSeconds": 922,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "wertung",
      "description": "Alfred gibt einen persönlichen Gesprächseindruck und räumt Erklärungsbedarf bei der Messung ein.",
      "status": "vorlaeufig",
      "verdict": "meinung",
      "reason": "Subjektives Fazit; keine Personennote unsererseits. Die Ankündigung einer methodischen Weiterentwicklung ist kein Nachweis für falsche bisherige Zahlen.",
      "sourceRefs": [
        "P01"
      ],
      "originalRefs": []
    },
    {
      "id": "sLMyP0H7tSY-A0028",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 922,
        "endSeconds": 952,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "tatsache",
      "description": "Für Langformat nennt Alfred 1.000 Abonnenten und 4.000 Wiedergabestunden innerhalb eines Jahres als Monetarisierungshürden.",
      "status": "vorlaeufig",
      "verdict": "teilweise",
      "reason": "P14 bestätigt diese Schwelle für die Bewerbung: gültige öffentliche Wiedergabezeit der letzten zwölf Monate, weitere Bedingungen und Kanalprüfung erforderlich. Kein automatischer Zahlungsanspruch; andere Zugangswege existieren.",
      "sourceRefs": [
        "P14"
      ],
      "originalRefs": []
    },
    {
      "id": "sLMyP0H7tSY-A0029",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 937,
        "endSeconds": 969,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "selbstauskunft",
      "description": "Kanalinterne Fortschritte und Finanzierung werden im Schluss berichtet.",
      "status": "vorlaeufig",
      "verdict": "offen",
      "reason": "Historische Abonnentenschwelle, gültige Stunden und Finanzierung sind nicht aus öffentlichen aktuellen Kanalzahlen beweisbar. Kein Zugriff auf private Analytics; Satire nicht als Finanzierungsaudit behandelt.",
      "sourceRefs": [
        "P01"
      ],
      "originalRefs": []
    },
    {
      "id": "sLMyP0H7tSY-A0030",
      "videoId": "sLMyP0H7tSY",
      "speaker": "Alfred",
      "attributionStatus": "textlich_plausibel",
      "occurrence": {
        "startSeconds": 106,
        "endSeconds": 164,
        "precision": "ungefaehr",
        "basis": "Untertitel-Suchbereich; nicht schnittgenau"
      },
      "kind": "wiedergabe",
      "description": "Der Fotoverbotsdialog wird mit Fragen und Reaktionen des Hosts wiedergegeben.",
      "status": "vorlaeufig",
      "verdict": "offen",
      "reason": "Die relevanten Originaluntertitel sind in der Reaktion wiedererkennbar. Der Originalcheck A0142 behandelt eine Hostfrage und eine mögliche Zustimmung des Gasts. Ohne akustische Kontrolle keine abschließende Sprecher-/Schnittzuordnung; Ben wird nicht für unkommentierte Gastbehauptungen verantwortlich gemacht.",
      "sourceRefs": [
        "P01",
        "P20"
      ],
      "originalRefs": [
        {
          "claimId": "mlxFA9T88I0-A0140",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Irreführend / Kontext fehlt",
          "baselineOccurrences": [
            {
              "startSeconds": 3656,
              "endSeconds": 3669,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S045",
            "S047"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0142",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Abgeschlossen",
          "baselineVerdict": "Irreführend / Kontext fehlt",
          "baselineOccurrences": [
            {
              "startSeconds": 3670,
              "endSeconds": 3682,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            },
            {
              "startSeconds": 3680,
              "endSeconds": 3683,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S045",
            "S046"
          ]
        },
        {
          "claimId": "mlxFA9T88I0-A0143",
          "relation": "same_topic",
          "verification": "Vergleichsstand und relevante Original-Untertitel; Sprecher nicht akustisch kontrolliert",
          "baselineStatus": "Offen",
          "baselineVerdict": null,
          "baselineOccurrences": [
            {
              "startSeconds": 3669,
              "endSeconds": 3673,
              "precision": "Ungefähr",
              "attributionStatus": "Plausibel"
            }
          ],
          "baselineSourceIds": [
            "S046"
          ]
        }
      ]
    }
  ]
}
```

## Quellen direkt öffnen

- **P01:** [Alfred-Upload und YouTube-oEmbed](https://www.youtube.com/watch?v=sLMyP0H7tSY) — metadaten; Abruf 2026-11-18.
- **P02:** [HSE: DSEAR](https://www.hse.gov.uk/fireandexplosion/dsear.htm) — gelesen; Abruf 2026-11-18.
- **P03:** [Diageo: Malt Brand Homes Terms and Conditions](https://www.malts.com/en/malt-brand-homes-terms-and-conditions) — gelesen; Abruf 2026-11-18.
- **P04:** [Scotch Whisky Association: Health & Safety](https://scotch-whisky.org.uk/industry-insights/sustainability/health-safety/) — gelesen; Abruf 2026-11-18.
- **P05:** [Hansard: Warehouse Fire, Glasgow, 29.03.1960](https://api.parliament.uk/historic-hansard/commons/1960/mar/29/warehouse-fire-glasgow) — gelesen; Abruf 2026-11-18.
- **P06:** [Hansard: Scotch Whisky (Transportation), 02.11.1994](https://api.parliament.uk/historic-hansard/written-answers/1994/nov/02/scotch-whisky-transportation) — gelesen; Abruf 2026-11-18.
- **P07:** [BMF: Kreditaufnahmebericht des Bundes 2025](https://www.deutsche-finanzagentur.de/fileadmin/user_upload/Finanzagentur/pdf/kreditaufnahmeberichte/Kreditaufnahmebericht_2025.pdf) — gelesen; Abruf 2026-11-18.
- **P08:** [Wissenschaftliche Dienste: WD 4-3000-009/26, 19.02.2026](https://www.bundestag.de/resource/blob/1157946/WD-4-009-26.pdf) — gelesen; Abruf 2026-11-18.
- **P09:** [Bundestag: Finanzplan 2026–2030, 14.08.2026](https://www.bundestag.de/presse/hib/kurzmeldungen-1205072) — gelesen; Abruf 2026-11-18.
- **P10:** [EZB: FAQs on the digital euro, Seitenkopf 17.08.2026](https://www.ecb.europa.eu/euro/digital_euro/faqs/html/ecb.faq_digital_euro.en.html) — gelesen; Abruf 2026-11-18.
- **P11:** [Europäisches Parlament: Verfahren 2023/0212(COD)](https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2023%2F0212%28COD%29) — gelesen; Abruf 2026-11-18.
- **P12:** [EZB: Pandemic Emergency Purchase Programme](https://www.ecb.europa.eu/mopo/implement/pepp/html/index.en.html) — gelesen; Abruf 2026-11-18.
- **P13:** [Cour de justice de la République: Urteil 19.12.2016](https://www.legifrance.gouv.fr/juri/id/JURITEXT000033943496) — gelesen; Abruf 2026-11-18.
- **P14:** [YouTube: Voraussetzungen des Partnerprogramms](https://support.google.com/youtube/answer/72851?hl=de) — gelesen; Abruf 2026-11-18.
- **P15:** [Whisky.de: Chronik 30 Jahre](https://www.whisky.de/ueber-uns/firmenportrait/chronik-30-jahre.html) — gelesen; Abruf 2026-11-18.
- **P16:** [HSE: ATEX and explosive atmospheres](https://www.hse.gov.uk/fireandexplosion/atex.htm) — gelesen; Abruf 2026-11-18.
- **P17:** [Kommission: COM(2023)369](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52023PC0369) — blockiert; Abruf 2026-11-18.
- **P18:** [EU: Richtlinie 1999/92/EG](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:31999L0092) — blockiert; Abruf 2026-11-18.
- **P19:** [EZB: Lebenslauf Christine Lagarde](https://www.ecb.europa.eu/ecb/decisions/html/cvlagarde.en.html) — gelesen; Abruf 2026-11-18.
- **P20:** [Originalinterview](https://www.youtube.com/watch?v=mlxFA9T88I0) — untertitel; Abruf 2026-11-18.
