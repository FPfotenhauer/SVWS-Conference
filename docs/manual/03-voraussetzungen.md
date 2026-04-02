<img src="../assets/svws-konferenz-logo-slim.svg" alt="SVWS Logo (schmal)" style="float:left; margin-right:12px; height:60px"> <br>

# Voraussetzungen

[Startseite](../index.md) | [Inhaltsverzeichnis](00-inhaltsverzeichnis.md) | [Schnellstart](02-schnellstart.md)

Dieses Kapitel beschreibt die technischen und organisatorischen Voraussetzungen für die Nutzung der SVWS-Konferenzübersicht.

## Browser

- Ein aktueller Browser: Firefox, Chrome (Chromium-basiert), Edge oder Safari.
- JavaScript muss aktiviert sein.
- Desktop-Browser werden empfohlen; die Oberfläche ist für große Bildschirme optimiert.

## Dateien und Format

- Die App verarbeitet den ENM-Export des SVWS als gzip-komprimierte JSON-Datei (`enm.json.gz`).
- Stellen Sie sicher, dass die Datei vollständig heruntergeladen und nicht umbenannt wurde.
- Sehr große Dateien (mehrere Dutzend MB) können auf schwächeren Rechnern spürbar langsamer geladen oder verarbeitet werden.

## Online-Abruf (optional)

- Für den Online-Abruf werden die SVWS-Basis-URL, das Schema sowie ggf. Benutzername und Passwort benötigt (Basic Auth).
- Bei Verbindungsproblemen prüfen Sie bitte:
  - Netzwerkzugang zum SVWS-Server
  - Gültigkeit des Service-Zertifikats (selbstsignierte Zertifikate müssen vom System/Browser vertraut werden)
  - CORS-Konfiguration (falls die App aus dem Browser gegen eine andere Origin zugreift)

Hinweis für die IT: Ein einfacher statischer Webserver reicht aus, um die App im Schulnetz bereitzustellen. Beispiel:

```bash
python -m http.server 8000
```

## Lokale Nutzung (offline)

- Die Anwendung kann per Doppelklick auf `index.html` geöffnet werden; alle Daten bleiben im Browser und werden nicht an Dritte übertragen.
- Offline-Modus ist besonders geeignet, wenn kein direkter Zugriff auf den SVWS-Server möglich ist.

## Datenschutz & Zugriff

- Alle Verarbeitung findet lokal im Browser statt. Achten Sie darauf, dass nur berechtigte Personen Zugriff auf die Arbeitsrechner haben.
- Sensible Dateien (`enm.json.gz`) sollten sicher übertragen und gespeichert werden (z. B. per verschlüsseltem Dateitransfer oder auf einem gesicherten Netzlaufwerk).

## Performance- und Speicherhinweise

- Große ENM-Exporte benötigen mehr Arbeitsspeicher und CPU beim Entpacken und Parsen. Bei Problemen empfehlen sich:
  - kleinere Testdateien verwenden
  - die Datei auf einen Schulserver legen und dort filtern (IT-Unterstützung)

## Kurz-Checkliste vor dem Start

- Browser aktualisieren
- `index.html` bzw. Webserver bereitstellen
- `enm.json.gz` bereitstellen und prüfen
- Bei Online-Abruf: Zugangsdaten und SVWS-URL bereithalten

Weiterführende Hinweise zur konkreten Bedienung finden Sie im Kapitel "Daten laden".
