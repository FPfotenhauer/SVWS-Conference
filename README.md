# SVWS Konferenzübersicht

Digitale Notenkonferenz-Übersicht für Klassen und Lerngruppen.  
Liest den ENM-Export des SVWS-Servers (`.gz`-Datei) und stellt alle Noten übersichtlich dar.

Zum Benutzerhandbuch geht es hier:
https://fpfotenhauer.github.io/SVWS-Conference/

## Voraussetzungen

- Node.js 20 oder neuer
- npm 10 oder neuer

## Entwicklung

```bash
npm install
npm run dev
```

Die App läuft dann unter `http://localhost:5173`.

Der lokale Vite-Server stellt nur in der Entwicklung einen Hilfs-Proxy unter `/api/svws/*` bereit.
Dieser Proxy ist auf den lokalen Dev-Kontext beschränkt und übernimmt Zugangsdaten ausschließlich über den `Authorization`-Header, nicht über den Request-Body.

## Build für den Produktiveinsatz

```bash
npm run build
```

Der fertige Build liegt im Ordner `dist/`. Die Dateien darin können auf jeden Webserver kopiert werden — oder direkt per Doppelklick auf `dist/index.html` geöffnet werden (kein Server nötig).

Hinweis: Der Standard-Build ist bewusst offline-fähig erzeugt, damit das Öffnen per `file://` funktioniert.

## Release erstellen

```bash
npm run release
```

Baut das Projekt und erstellt eine ZIP-Datei im Ordner `release/`, die alle Dateien aus `dist/` enthält — inklusive `impressum.example.js`. Die Datei ist versioniert benannt, z. B. `svws-conference-0.4.0.zip`, und kann direkt an Schulen weitergegeben werden.

## Qualitätssicherung

```bash
npm run typecheck   # TypeScript-Typen prüfen
npm run lint        # ESLint
npm test            # Vitest Unit-Tests
npm run test:run    # Tests einmalig ausführen (ohne Watch)
```

## Datenbezug

### Online: REST-Abruf vom SVWS-Server

Die App ruft den ENM-Export per BasicAuth ab.

Verbindungsdaten in der Server-Kachel:

- SVWS-Basis-URL
- Schema
- Benutzername
- Passwort (darf leer sein)

Der Abruf erfolgt gegen einen der folgenden Endpunkte (je nach SVWS-Konfiguration):

```
GET {SVWS-Basis-URL}/db/{schema}/enm/v2/alle/gzip
GET {SVWS-Basis-URL}/db/{schema}/enm/v1/alle/gzip
GET {SVWS-Basis-URL}/api/v1/schule/{schema}/export/enm
GET {SVWS-Basis-URL}/api/v1/schule/export/enm?schema={schema}
GET {SVWS-Basis-URL}/api/v1/schule/export/enm
Accept: application/octet-stream
Authorization: Basic base64({username}:{password})
```

Hinweis zu selbstsignierten Zertifikaten:

- In der Entwicklungsumgebung (`npm run dev`) kann die Option `Zertifikat vertrauen` gesetzt werden.
- Im statischen/offline Build kann der Browser selbstsignierte Zertifikate nicht per App-Option umgehen.
- Produktiv- und Offline-Builds sprechen den SVWS-Server direkt aus dem Browser an; der Host der SPA erhält dabei keine ENM-Daten oder Credentials über relative Proxy-Endpunkte.

CORS-Konfiguration am SVWS-Server (Beispiel für nginx als Reverse Proxy):

```nginx
location /api/ {
    proxy_pass http://localhost:8443/;
    add_header 'Access-Control-Allow-Origin' 'https://ihre-konferenz-app.schule.de' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
}
```

### Offline: Manueller Datei-Upload

Wenn keine Verbindung zum SVWS-Server besteht, kann die ENM-Exportdatei  
(`enm.json.gz`) direkt in die App hochgeladen werden. Alle Daten bleiben  
im Browser — es werden keine Daten an externe Server übertragen.

## Datenschutz

- Alle Verarbeitung findet ausschließlich im Browser statt
- Keine Übertragung von Schülerdaten an Dritte
- Keine Cookies, keine persistente Speicherung
- Daten existieren nur für die Dauer der Browser-Session

## Datenformat

Die App erwartet den SVWS ENM-Export im Format `enm.json.gz`  
(gzip-komprimiertes JSON). Eine Beispieldatei mit Testdaten liegt unter `data/enm_json.gz`.

Die Typdefinitionen des vollständigen Schemas befinden sich in  
`src/types/enm.ts`.
