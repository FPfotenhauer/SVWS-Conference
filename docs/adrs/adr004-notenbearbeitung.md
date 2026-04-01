# ADR 004: Notenbearbeitung in der Konferenzansicht

## Status
Akzeptiert

## Kontext
Die Konferenzoberflaeche soll Noten nicht nur anzeigen, sondern waehrend der Sitzung direkt bearbeitbar machen.
Dabei muss die App sowohl mit Serverdaten als auch mit lokal geladenen Exportdateien funktionieren.

Wichtige Randbedingungen:
- Ein ENM-Export ist eine Momentaufnahme und darf nicht unkontrolliert mutiert werden.
- Konferenzen muessen auch bei instabiler Verbindung arbeitsfaehig bleiben.
- Aenderungen sollen sichtbar, ruecksetzbar und spaeter exportierbar sein.

## Entscheidung
Es wird von Anfang an ein lokaler Aenderungspuffer im Store eingefuehrt.

Der Puffer wird als Map mit Zellschluessel gefuehrt:
- Schluessel: schuelerId:lerngruppeId
- Wert: neue Note oder null

Regeln:
- Originaldaten aus dem ENM-Export bleiben unveraendert.
- Beim Lesen einer Note hat der Aenderungspuffer Vorrang vor den Originaldaten.
- Wenn eine neue Note der Originalnote entspricht, wird der Aenderungseintrag entfernt.
- Beim Laden neuer Daten (Datei oder Server) wird der Puffer geleert.

## Konsequenzen
Vorteile:
- Bearbeitung ist sofort nutzbar, auch ohne Schreib-API am Server.
- Der Benutzer sieht jederzeit, welche Noten geaendert wurden.
- Rueckgaengig machen und spaeteres Exportieren von Diffs ist moeglich.

Nachteile:
- Es braucht zusaetzliche UI-Logik fuer geaenderte Zellen und Editiermodus.
- Eine spaetere serverseitige Rueckschreibung erfordert einen separaten Synchronisationsschritt.

## Umsetzung im Projekt
Der Store stellt dafuer folgende Funktionen bereit:
- getNote(schuelerId, lerngruppeId)
- updateNote(schuelerId, lerngruppeId, note)
- isNoteChanged(schuelerId, lerngruppeId)
- clearNoteChanges()
- listNoteChanges()
- hasNoteChanges und noteChangeCount

Die Konferenzansicht rendert Notenzellen editierbar ueber Select-Felder und markiert geaenderte Zellen visuell.

## Ausblick
Naechster Schritt ist eine persistente Uebernahme der Aenderungen:
- entweder als Diff-Export
- oder ueber eine spaetere Schreib-API zum SVWS-Server
