<img src="../assets/svws-konferenz-logo-slim.svg" alt="SVWS Logo (schmal)" style="float:left; margin-right:12px; height:60px" /> <br>

# Fehlerbehebung

[Startseite](../index.md) | [Inhaltsverzeichnis](00-inhaltsverzeichnis.md) | [Einleitung](01-einleitung.md) | [Schnellstart](02-schnellstart.md) | [Voraussetzungen](03-voraussetzungen.md)

Dieses Kapitel hilft Ihnen bei typischen Problemen und zeigt, wie Sie schnell wieder arbeitsfähig sind.

## 1. Die Anwendung startet nicht

- Prüfen Sie, ob Sie `index.html` im richtigen Ordner geöffnet haben.
- Wenn Sie die App per Doppelklick öffnen, verwenden Sie einen aktuellen Browser.
- Bei Nutzung eines lokalen Webservers prüfen Sie, ob der Server läuft und die Adresse korrekt ist.
- Bei Dateisystem- oder Berechtigungsproblemen starten Sie den Browser neu oder speichern die Dateien in einem anderen Verzeichnis.

## 2. Keine Daten sichtbar nach Datei-Upload

- Vergewissern Sie sich, dass die hochgeladene Datei wirklich eine gültige `enm.json.gz`-Datei ist.
- Prüfen Sie, ob die Datei vollständig heruntergeladen wurde.
- Falls die Datei beschädigt ist, laden Sie sie erneut vom SVWS-Server oder aus dem Schulnetzwerk.
- Verwenden Sie einen modernen Browser; ältere Browser oder restriktive Sicherheitsplugins können das Lesen großer Dateien blockieren.

## 3. Online-Abruf schlägt fehl

- Prüfen Sie die SVWS-Basis-URL auf Tippfehler.
- Stellen Sie sicher, dass das korrekt Schema, der Benutzername und das Passwort eingegeben sind.
- Achten Sie auf sichere Verbindungen: Wenn der SVWS-Server HTTPS verwendet, muss das Zertifikat vom Browser als vertrauenswürdig akzeptiert werden.
- Bei CORS-Fehlern muss die Serverkonfiguration so angepasst werden, dass der Browser den Abruf erlaubt.

## 4. Die Anwendung lädt zu langsam oder stürzt bei großen Dateien ab

- Große ENM-Exporte (mehrere zehn MB) benötigen mehr Zeit zum Entpacken und Parsen.
- Schließen Sie andere Browser-Tabs und Programme, um mehr Arbeitsspeicher freizugeben.
- Wenn möglich, nutzen Sie kleinere Exporte oder eine Datei, die nur einen begrenzten Datenbereich enthält.

## 5. Daten werden nicht korrekt angezeigt

- Prüfen Sie, ob die geladenen Daten dem erwarteten SVWS-Exportformat entsprechen.
- Bei ungewöhnlichen Zeichen oder fehlenden Einträgen prüfen Sie die Originaldatei auf Formatfehler.
- Im Zweifelsfall fragen Sie die IT oder den SVWS-Administrator nach einer gültigen `enm.json.gz`-Exportdatei.

## 6. Exportierte Ergebnisse fehlen oder sind unvollständig

- Kontrollieren Sie, ob die Export-Funktion im Benutzerinterface erfolgreich ausgeführt wurde.
- Die Anwendung speichert Änderungen nur lokal; ein Export erstellt keine automatische Sicherung in der Cloud.
- Speichern Sie exportierte Dateien an einem sicheren Ort, bevor Sie die Seite schließen.

## 7. Sicherheitswarnungen und Browsermeldungen

- Einige Browser zeigen beim Offline-Start Warnungen, wenn lokale Dateien geladen werden. Das ist normal, solange Sie die App aus einer vertrauenswürdigen Quelle gestartet haben.
- Wenn der Browser das Laden von lokalem JavaScript blockiert, prüfen Sie die Sicherheits- oder Datenschutzeinstellungen des Browsers.
- Nutzen Sie bei Bedarf einen alternativen Browser, wenn der aktuelle Browser zu restriktiv reagiert.

## 8. Wenn nichts hilft

- Laden Sie die Seite neu und versuchen Sie den Vorgang noch einmal.
- Schließen Sie den Browser vollständig und öffnen Sie die App erneut.
- Nutzen Sie ein anderes Gerät oder einen anderen aktuellen Browser.
- Wenden Sie sich an Ihre IT-Abteilung mit den Angaben zur Datei, der verwendeten Browser-Version und dem genauen Fehlerbild.
