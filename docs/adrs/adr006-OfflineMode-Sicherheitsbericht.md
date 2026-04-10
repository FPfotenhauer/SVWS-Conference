Lass mich nochmal gezielt in den File-Upload-Pfad schauen.Jetzt habe ich ein vollständiges Bild. Meine Einschätzung:

---

**Der Offline-Modus ist der sicherere der beiden Modi — aber nicht ohne Schwachstellen.**

**Was gut funktioniert:**

Der Datenpfad ist sauber: Datei → `arrayBuffer()` → gunzip (pako/CompressionStream, alles im Browser) → `JSON.parse()` → Vue-Store. Es gibt keine Netzwerkverbindung. Der Export läuft ebenfalls vollständig lokal: geänderte Daten werden zu einer neuen `.gz`-Datei komprimiert und per `URL.createObjectURL()` + `<a download>` zum Browser-Download gereicht — die `ObjectURL` wird nach 10 Sekunden korrekt mit `revokeObjectURL()` freigegeben. Der File-Input wird nach dem Laden gecleart (`Oe.value = ""`). Das ist alles ordentlich.

**Drei Punkte, die Du trotzdem im Blick behalten solltest:**

**1. Partielle Schemavalidierung (niedrig, aber relevant).** `X3()` validiert nur die ersten **3 Schüler** und **5 Lerngruppen**, alle Klassen und Fächer aber vollständig. Das ist vermutlich eine Performanceentscheidung — bei großen Schulen macht eine vollständige Validierung im Browser Probleme. Konsequenz: Eine manipulierte ENM-Datei mit schadhaften Einträgen ab Index 4 (Schüler) bzw. 6 (Lerngruppen) wird ohne Fehler geladen. Das Risiko ist gering, weil die Datei aus dem eigenen SVWS-Server stammt, sollte aber dokumentiert sein.

**2. `.env`-Datei-Upload schreibt das Passwort in localStorage** — das ist derselbe K-1-Befund, aber auch im Offline-Modus aktiv. Wenn jemand eine `.env`-Datei mit `SVWSSERVER_PASSWORD=...` hochlädt, landet das Passwort sofort in `localStorage`. Das ist im reinen Offline-Betrieb (keine Serververbindung) zwar weniger kritisch, aber der Fix aus K-1 greift hier genauso und löst es mit.

**3. ENM-Daten liegen ungekapselt im JS-Heap.** Das ist kein Bug, sondern technisch unvermeidbar — eine SPA muss die Daten ja irgendwo halten. Es bedeutet aber: Die Schüler- und Notendaten sind über die Laufzeit der Seite im Speicher. Solange keine andere Script-Quelle auf der Origin läuft (→ deshalb ist die CSP aus H-2 auch für den Offline-Modus wichtig), ist das kein Problem.

**Fazit:** Der Offline-Modus erfüllt die Anforderung „keine Daten verlassen den Browser" korrekt und zuverlässig. Die CSP aus H-2 ist auch hier sinnvoll, und K-1 sollte konsequent für beide Modi gefixt werden. Sonst gibt es nichts Kritisches.