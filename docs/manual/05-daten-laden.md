<img src="../assets/svws-konferenz-logo-slim.svg" alt="SVWS Logo (schmal)" style="float:left; margin-right:12px; height:60px"> <br>

# Daten laden

Dieses Kapitel erklärt zwei Wege, wie Sie die für die Konferenz benötigten Daten in die Anwendung bringen: Verbinden mit einem SVWS-Server (Online) und manuelles Hochladen einer Exportdatei (`enm.json.gz`) (Offline).

## 1. Verbinden mit einem Server (Online)

- Tragen Sie die Basis-URL Ihres SVWS-Servers ein (z. B. `https://svws.mein-server.de`), wählen ggf. das Schema aus und geben Ihren Benutzernamen sowie Ihr Passwort ein.
- Klicken Sie auf **Server verbinden**. Die Anwendung versucht, den ENM-Export vom Server herunterzuladen und im Browser zu parsen.
- Während des Abrufs sehen Sie Statusmeldungen

Hinweise:
- Wenn die Verbindung fehlschlägt, prüfen Sie URL, Zugangsdaten und ggf. Firewall/Proxy-Einstellungen.
- Bei großen Datenmengen kann der Download einige Sekunden dauern.

## 2. Manueller Upload (Offline)

- Klicken Sie in der Datei-Upload-Sektion auf **Datei auswählen** und wählen Sie eine gültige `enm.json.gz` aus.
- Die Datei wird im Browser entpackt und geparst; sehen Sie sich die bestätigende Meldung an.
- Nach dem erfolgreichen Einlesen wird die Datenquelle in der Statusleiste angezeigt und die Inhalte (Klassen, Schüler, Noten) stehen zur Ansicht und Nutzung bereit.

Prüf- und Fehlerhinweise:
- Stellen Sie sicher, dass die Datei ein gültiger ENM-Export ist (Dateiname-Format und Struktur). Eine beschädigte oder nicht passende Datei führt zu einer Fehlermeldung beim Parsen.
- Falls beim Entpacken/Parsen Fehler auftreten, laden Sie die Datei erneut herunter oder kontaktieren Sie die Person, die den Export erstellt hat.
- Bei Unsicherheit öffnen Sie die Entwicklerkonsole des Browsers (F12) und prüfen die Fehlermeldungen; diese helfen beim Troubleshooting.

## Gute Praxis

- Testen Sie neue Exporte zuerst mit einer Testdatenbank.
- Nutzen Sie die Export-/Speicherfunktion, um vor größeren Änderungen einen Snapshot der aktuellen Ansicht zu erzeugen.
- Denken Sie an regelmäßige Datensicherungen.

Weiterführend: Siehe Kapitel 4 für Hinweise zur Oberfläche und Kapitel 6 für die Arbeit in der Konferenzübersicht.
