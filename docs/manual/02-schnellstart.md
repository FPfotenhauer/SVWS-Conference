<img src="../assets/svws-konferenz-logo-slim.svg" alt="SVWS Logo (schmal)" style="float:left; margin-right:12px; height:60px"> <br>

# Schnellstart

[Startseite](../index.md) | [Inhaltsverzeichnis](00-inhaltsverzeichnis.md) | [Einleitung](01-einleitung.md)

Dieses Kapitel richtet sich an Anwenderinnen und Anwender, die die Anwendung direkt nutzen möchten.

Sie benötigen keine Entwicklungsumgebung. Die Konferenzübersicht kann entweder direkt als HTML-Datei geöffnet oder über einen kleinen Webserver bereitgestellt werden.

## Ziel

Am Ende des Schnellstarts können Sie:

- die Anwendung öffnen
- Konferenzdaten laden (online oder offline)
- die Übersicht für Klassen und Lerngruppen öffnen

## Schritt 1: Voraussetzungen prüfen

Für die Nutzung werden benötigt:

- ein aktueller Browser (zum Beispiel Firefox, Chrome, Edge oder Safari)
- ein bereitgestellter Anwendungsordner mit der Datei index.html
- optional: Zugangsdaten für den SVWS-Server (bei Online-Abruf)

## Schritt 2: Anwendung starten

Es gibt zwei einfache Wege.

### Option A: Direkt per HTML-Datei starten

1. Den Anwendungsordner öffnen
2. Die Datei index.html per Doppelklick starten
3. Die Anwendung öffnet sich im Standardbrowser

Diese Variante ist besonders schnell für Einzelarbeitsplätze.

### Option B: Über einen kleinen Webserver bereitstellen

Diese Variante ist sinnvoll, wenn mehrere Personen im gleichen Netzwerk auf die Anwendung zugreifen sollen.

Beispiel für die IT-Betreuung:

1. Den Anwendungsordner auf einem Server oder einem PC im Schulnetz bereitstellen
2. Einen einfachen Webserver darauf starten
3. Die bereitgestellte Adresse im Browser aufrufen

Hinweis: Die konkrete Einrichtung kann je nach Schulumgebung abweichen.

## Schritt 3: Daten laden

Es gibt zwei Wege:

### Option A: Online-Abruf vom SVWS-Server

In der Server-Kachel eintragen:

- SVWS-Basis-URL
- Schema
- Benutzername
- Passwort

Anschließend den Abruf starten.

### Option B: Offline per Datei-Upload

Wenn kein direkter Serverzugriff möglich ist:

1. ENM-Exportdatei enm.json.gz bereithalten
2. Datei in der Anwendung hochladen
3. Darstellung der Daten prüfen

## Schritt 4: Konferenzübersicht verwenden

Nach dem Laden der Daten:

- gewünschte Klasse oder Lerngruppe auswählen
- Notenübersicht prüfen
- bei Bedarf zwischen Bereichen der Oberfläche navigieren

## Schritt 5: Im Alltag arbeiten

Wenn die Daten geladen sind, kann die Anwendung direkt im Konferenzalltag genutzt werden.

- Klassen und Lerngruppen aufrufen
- Notenstände vergleichen
- Konferenzentscheidungen vorbereiten

## Schritt 6: Impressum einrichten

Im Anwendungsordner liegt die Datei `impressum.example.js`. Sie enthält ein Beispiel-Impressum mit Platzhaltern und muss vor dem Einsatz angepasst werden.

1. Die Datei `impressum.example.js` in einem Texteditor öffnen
2. Die Schuladaten, Kontaktdaten und den Schulträger eintragen
3. Datum unter `Stand:` aktualisieren
4. Datei als `impressum.js` im gleichen Ordner speichern

Die Datei `impressum.example.js` bleibt unverändert als Vorlage erhalten. Die Anwendung liest ausschließlich `impressum.js`.

Hinweis: Das Impressum wird im Browser der Nutzerinnen und Nutzer angezeigt. Es gelten die datenschutzrechtlichen Anforderungen des jeweiligen Bundeslandes. Im reinen Offline-Betrieb (Öffnen per Doppelklick ohne Webserver) ist kein Impressum erforderlich.

## Häufige Startprobleme

- Anwendung startet nicht: prüfen, ob index.html im richtigen Ordner geöffnet wurde
- Keine Daten sichtbar: Schema, Zugangsdaten oder ENM-Datei kontrollieren
- Verbindungsprobleme online: Netzwerk, CORS und Zertifikatssituation prüfen

Weiterführende Details folgen in den Kapiteln Voraussetzungen, Daten laden und Fehlerbehebung.