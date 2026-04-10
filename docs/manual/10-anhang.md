<img src="../assets/svws-konferenz-logo-slim.svg" alt="SVWS Logo (schmal)" style="float:left; margin-right:12px; height:60px" /> <br>

# Anhang

[Startseite](../index.md) | [Inhaltsverzeichnis](00-inhaltsverzeichnis.md) | [Einleitung](01-einleitung.md) | [Schnellstart](02-schnellstart.md) | [Voraussetzungen](03-voraussetzungen.md)

In diesem Anhang finden Sie Begriffe, Abkürzungen und weiterführende Informationen.

## Begriffe und Abkürzungen

- **SVWS**: Schulverwaltungssystem. Die App nutzt den Export aus dem SVWS zur Anzeige von Konferenzdaten.
- **ENM**: Das von SVWS erzeugte Exportformat, das in der komprimierten Datei `enm.json.gz` bereitgestellt wird.
- **JSON**: JavaScript Object Notation, ein Textformat für strukturierte Daten.
- **GZIP**: Ein Kompressionsformat, mit dem die Exportdatei `enm.json.gz` verkleinert wird.
- **CORS**: Cross-Origin Resource Sharing. Eine Browser-Sicherheitsfunktion, die beim Online-Abruf von Daten vom SVWS-Server relevant sein kann.
- **Offline-Modus**: Nutzung der Anwendung ohne Netzwerkverbindung, mit manuellem Upload einer Exportdatei.
- **Browser-Cache**: Temporärer Speicher, in dem der Browser Dateien und Seiten zwischenspeichert.
- **Local Storage**: In dieser Anwendung wird kein persistentes Browserspeicherformat zur Speicherung sensibler Daten genutzt.

## Weiterführende Informationen

- Halten Sie sich an die Datenschutzrichtlinien Ihrer Schule, wenn Sie mit personenbezogenen Daten arbeiten.
- Sichern Sie Exportdateien und Berichte nur auf geschützten Schulservern oder verschlüsselten Speichermedien.
- Fragen Sie Ihre IT-Abteilung bei Unklarheiten zu Netzwerk, CORS oder Serverzertifikaten.

## Technische Hinweise

- Diese Anwendung ist als statische Webseite ausgelegt und erfordert keine Backend-Infrastruktur.
- Wenn Sie die App über einen Webserver bereitstellen, genügt ein einfacher statischer Server wie `python -m http.server`.
- Für komfortablen Betrieb empfiehlt sich ein aktueller Browser und ausreichend Arbeitsspeicher bei großen Exportdateien.
