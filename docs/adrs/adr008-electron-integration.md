# ADR 008: Electron-Integration für Desktop-Betrieb

## Status
Akzeptiert

## Kontext
Der SVWS-Server sendet CORS-Header, die aus einem Browser heraus nicht nutzbar sind:
`credentials: true` in Kombination mit `Access-Control-Allow-Origin: *` ist laut
CORS-Spezifikation ungültig und wird von Browsern abgelehnt. Der reine Browser-Betrieb
(siehe [[adr003-offline-modus]]) ist dadurch für den REST-Modus gegen echte SVWS-Server
eingeschränkt, ohne dass die App selbst dagegen etwas tun kann.

## Entscheidung
Zusätzlich zum Browser-Betrieb wird eine Electron-App bereitgestellt. Der Electron
Main-Process korrigiert die CORS-Header serverseitig aus Sicht der App und akzeptiert
selbstsignierte Zertifikate, die an Schulen verbreitet sind.

Umsetzung:
- `electron/main.cjs` — Main-Process; patcht CORS-Header, akzeptiert selbstsignierte
  Zertifikate.
- `package.json` — `"main": "electron/main.cjs"`, electron-builder-Konfiguration, Skripte
  `electron:dev` / `electron:build`.
- `scripts/release.mjs` — baut in einem Durchgang: 1) den Vite-Offline-Build,
  2) AppImage + NSIS-Installer via electron-builder, 3) ein Webserver-ZIP für den reinen
  Browser-Betrieb.
- `npm run release` erzeugt alle drei Artefakte.

Referenzprojekt mit vergleichbarer Struktur: `SVWS-Import`
(`/home/pfotenhauer/git/SVWS-Import/`).

## Konsequenzen
Vorteile:
- REST-Modus funktioniert zuverlässig gegen SVWS-Server mit inkorrekter CORS-Konfiguration
  und selbstsignierten Zertifikaten, ohne den SVWS-Server selbst anpassen zu müssen.
- Ein Build-Prozess (`npm run release`) deckt Desktop- (AppImage, NSIS) und
  Webserver-Deployment gleichzeitig ab.

Nachteile:
- Zusätzliche Build- und Wartungslast (electron-builder-Konfiguration, zwei Runtime-Kontexte
  Browser/Electron müssen konsistent gehalten werden).
- Das Akzeptieren selbstsignierter Zertifikate im Main-Process untergräbt TLS-Validierung
  gegenüber dem SVWS-Server — siehe die verwandte Einschätzung in
  [[adr006-OfflineMode-Sicherheitsbericht]] (M-2, `trustSelfSigned`).
