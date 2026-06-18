---
name: project-electron
description: Electron-Integration wurde hinzugefügt; npm run release baut AppImage, NSIS-Installer und Webserver-ZIP
metadata:
  type: project
---

Electron-App-Integration hinzugefügt (analog zu [[svws-import-reference]]).

**Why:** CORS-Probleme beim direkten Zugriff auf den SVWS-Server aus dem Browser umgehen. Der SVWS-Server sendet `credentials:true` + `allow-origin:*` (per CORS-Spec ungültig); Electron korrigiert das im Main-Process.

**How to apply:** 
- `electron/main.cjs` — Main-Process; patcht CORS-Header, akzeptiert selbstsignierte Zertifikate
- `package.json` — `"main": "electron/main.cjs"`, electron-builder-Config, Skripte `electron:dev` / `electron:build`
- `scripts/release.mjs` — baut jetzt: 1) Vite-Offline-Build 2) AppImage + NSIS via electron-builder 3) Webserver-ZIP

Referenzprojekt mit gleicher Struktur: `/home/pfotenhauer/git/SVWS-Import/`
