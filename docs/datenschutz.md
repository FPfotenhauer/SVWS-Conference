# Datenschutzhinweise

## 1. Keine Daten ohne Nutzeraktion

SVWS-Konferenzübersicht sendet Daten nur dann an einen Server, wenn Sie dies ausdrücklich auslösen.

- Im Offline-Modus (Datei-Upload) bleiben Ihre Daten vollständig lokal im Browser.
- Im Online-Modus wird nur beim Abruf der ENM-Daten und beim Zurückspielen von Änderungen eine Anfrage an den SVWS-Server gesendet.

## 2. Keine Speicherung von Zugangsdaten

Das Passwort wird ausschließlich temporär im Arbeitsspeicher des Browsers gehalten.

- Es wird nicht in `localStorage`, `sessionStorage` oder Cookies gespeichert.
- Server-URL, Schema und Benutzername werden im `localStorage` für eine komfortablere Wiedereingabe gespeichert – kein Passwort.
- Nach einem Seiten-Reload muss das Passwort erneut eingegeben werden.

## 3. Schutz der Originaldaten

- Die original geladenen ENM-Daten werden nicht verändert.
- Alle Notenänderungen werden separat als lokaler Puffer verwaltet.
- Nur ausdrücklich bestätigte Änderungen werden exportiert oder an den SVWS-Server zurückgespielt.

## 4. Datenhaltung im Browser

- Alle Schüler- und Notendaten verbleiben ausschließlich im Arbeitsspeicher des Browsers.
- Kein Tracking, keine Cookies, keine Drittserver.
- Nach dem Schließen des Browser-Tabs gehen alle geladenen Daten unwiderruflich verloren.

## 5. Empfehlungen für Lehrkräfte

- Arbeiten Sie nach Möglichkeit über eine verschlüsselte `https://`-Verbindung.
- Schließen Sie den Browser-Tab nach Abschluss der Konferenz.
- Geben Sie ENM-Exportdateien nicht unbefugt weiter.
