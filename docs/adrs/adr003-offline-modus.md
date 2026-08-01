# ADR 003: Offline-Modus als Hauptziel — kein persistenter Datenspeicher

## Status
Akzeptiert

## Kontext
Die SVWS-Konferenzübersicht verarbeitet personenbezogene Schüler- und Notendaten. Zwei
Datenbezugswege sind vorgesehen: REST-Abruf vom SVWS-Server (online) und manueller
ZIP-Datei-Upload (offline). Schulserver können ausfallen oder sind nicht immer erreichbar
(z. B. während einer Notenkonferenz vor Ort) — der Datei-Upload-Pfad muss deshalb
eigenständig und zuverlässig funktionieren, nicht nur als Fallback.

Zusätzlich gilt eine harte Datenschutz-Anforderung: Keine Übertragung der Daten an
Drittserver; alle Daten bleiben im Browser.

## Entscheidung
Es gibt keinen persistenten Datenspeicher für die eigentlichen Konferenzdaten (Schüler,
Noten). Diese leben ausschließlich im reaktiven In-Memory-State der Session und werden
beim Neuladen der Seite verworfen.

- Offline-Modus (ZIP-Upload) ist gleichwertiger Haupt-Datenpfad, nicht nur Fallback für den
  REST-Modus.
- `localStorage` wird ausschließlich für nicht-sensitive Konfiguration verwendet
  (Host/`baseUrl`, Schema, Username, `trustSelfSigned`) — niemals für Passwörter oder
  Notendaten. Siehe [[adr009-fix-k1-password-storage]] für den konkreten Fix, nachdem diese
  Regel verletzt wurde.
- Kein Backend, keine Datenbank für die App selbst.

## Konsequenzen
Vorteile:
- Konferenzen bleiben auch bei instabiler oder fehlender Serververbindung arbeitsfähig.
- Datenschutz-by-Design: Ohne Persistenz sensibler Daten ist das Risiko eines dauerhaften
  Datenlecks über den Browser-Speicher strukturell ausgeschlossen.
- Einfaches Deployment ohne Backend-Infrastruktur.

Nachteile:
- Kein automatisches Wiederherstellen des Zustands nach einem versehentlichen Neuladen der
  Seite — der Nutzer muss die Datei erneut laden bzw. sich erneut anmelden.
- Änderungen an Noten müssen separat behandelt werden (siehe [[adr004-notenbearbeitung]]),
  da sie nicht serverseitig zurückgeschrieben werden können, solange keine Schreib-API
  existiert.

## Für Agenten
`localStorage` ausschließlich für nicht-sensitive Felder nutzen (Host, Schema, Username).
Niemals Passwort oder Notendaten persistieren — auch nicht temporär oder base64-kodiert.
