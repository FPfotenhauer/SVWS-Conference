# ADR 002: ZIP-Bibliothek — fflate statt pako

## Status
Akzeptiert

## Kontext
Das SVWS-Exportformat liegt gezippt vor und muss vollständig im Browser entpackt werden
(kein Server-seitiges Un-Zippen, siehe [[adr003-offline-modus]]). Für das Entpacken kam eine
JavaScript-ZIP-Bibliothek in Frage; zur Debatte standen u. a. `pako` und `fflate`.

Randbedingungen:
- Rein clientseitig, keine Serverabhängigkeit.
- Kleine Bundle-Größe, da die App als statische Datei ausgeliefert wird.
- Muss sowohl mit `ArrayBuffer` (aus `fetch`, REST-Modus) als auch mit `File`-Objekten
  (aus Datei-Upload, Offline-Modus) umgehen können.

## Entscheidung
`fflate` wird als ZIP-Bibliothek verwendet.

Ausschlaggebend:
- Nur ~9 kB gzip, deutlich kleiner als `pako`.
- Reines JavaScript, keine WASM-Abhängigkeit — läuft ohne zusätzliche Ladezeit oder
  MIME-Type-Konfiguration auf dem Webserver.
- `gunzipSync()` läuft direkt im Main Thread, was für die zu erwartenden Dateigrößen
  (bis ca. 10 MB) ausreichend performant ist.

## Konsequenzen
Vorteile:
- Kleinerer Bundle-Footprint als mit `pako`.
- Kein WASM-Loading, kein zusätzlicher Build-Schritt für Binärassets.

Nachteile:
- Synchrones Entpacken im Main Thread blockiert bei sehr großen Exportdateien kurzzeitig
  die UI. Für die aktuelle Größenordnung (~10 MB) unkritisch, sollte aber bei deutlich
  größeren Schulen (viele Klassen/Lerngruppen) neu bewertet werden (z. B. Web Worker).

## Für Agenten
Import ausschließlich über `import { gunzipSync } from 'fflate'`. Kein `pako`, keine
WASM-basierten ZIP-Libraries.
