Sehr guter Zeitpunkt für diese Frage — das Mockup ist stabil genug als Referenz, und die Anforderung "Noten änderbar" hat architektonische Konsequenzen die man von Anfang an einplanen muss.GitHub Raw ist leider gesperrt. Aber auf Basis unserer bisherigen Arbeit — Typen, Store, Parser und das fertige Mockup — kann ich einen sehr konkreten Plan machen.

---

## Wie sinnvoll weiterarbeiten?

### 1. Die kritische Architekturentscheidung zuerst: Noten ändern

Das ist keine kleine Ergänzung, sondern beeinflusst den gesamten Datenstrom. Es gibt zwei grundlegend verschiedene Ansätze:

**Option A — Direkt via SVWS-API schreiben**
Die App schreibt geänderte Noten per `PATCH`/`PUT` sofort zurück an den SVWS-Server. Sauber, keine lokale Persistenz nötig — aber setzt voraus, dass die SVWS-API entsprechende Endpunkte hat und CORS erlaubt.

**Option B — Lokaler Änderungspuffer, Export am Ende**
Änderungen leben nur im Store. Am Ende der Konferenz wird ein Diff-Export erzeugt (nur geänderte Noten) der manuell ins SVWS eingespielt wird. Robuster, funktioniert auch offline.

Für den Schulalltag ist **Option B realistischer** — Konferenzen laufen oft ohne stabiles Netz, und ein "Änderungen speichern"-Button am Ende ist für Lehrkräfte intuitiver als unsichtbares Live-Schreiben.


Es wird Option B gewählt.

---

### 2. Was der Store dafür braucht

Der aktuelle `conferenceStore.ts` ist read-only. Er braucht eine Erweiterungsschicht für Änderungen:

```typescript
// Zusatz im Store
const changes = ref<Map<string, Notenkuerzel | null>>(new Map())
// Key: `${schuelerId}:${lerngruppenId}`

function updateNote(
  schuelerId: number,
  lerngruppenId: number,
  note: Notenkuerzel | null
): void {
  const key = `${schuelerId}:${lerngruppenId}`
  changes.value.set(key, note)
}

function getNote(schuelerId: number, lerngruppenId: number): Notenkuerzel | null {
  const key = `${schuelerId}:${lerngruppenId}`
  // Änderungspuffer hat Vorrang vor Originaldaten
  if (changes.value.has(key)) return changes.value.get(key) ?? null
  // Sonst Originaldaten aus dem ENM-Export
  const schueler = enmExport.value?.schueler.find(s => s.id === schuelerId)
  return schueler?.leistungsdaten.find(ld => ld.lerngruppenID === lerngruppenId)?.note ?? null
}

const hasChanges = computed(() => changes.value.size > 0)

const changeCount = computed(() => changes.value.size)
```

Das Wichtige: Original-ENM-Daten werden **nie mutiert**. Der Puffer ist eine eigene Map.

---

### 3. Die Notenbearbeitung in der UI

In der Tabelle soll eine Zelle beim Klick editierbar werden. Das Muster dafür in Vue:

```vue
<!-- In ClassView.vue -->
<td @click="startEdit(schueler.id, lerngruppe.id)">
  <NoteCell
    :note="getNote(schueler.id, lerngruppe.id)"
    :editing="isEditing(schueler.id, lerngruppe.id)"
    :changed="isChanged(schueler.id, lerngruppe.id)"
    @save="updateNote(schueler.id, lerngruppe.id, $event)"
    @cancel="cancelEdit()"
  />
</td>
```

`NoteCell` zeigt entweder das Badge oder ein `<select>` mit allen Notenkürzeln aus `enmExport.noten`. Geänderte Noten bekommen eine visuelle Markierung (z.B. kleiner Punkt oder andere Umrandung) damit die Konferenzleitung sieht was angepasst wurde.

---

### 4. Empfohlene Reihenfolge der nächsten Schritte

**Schritt 1 — `ClassView.vue` aus dem Mockup ableiten** (1-2 Tage)
Das Mockup ist fertig — jetzt 1:1 als Vue-Komponente umsetzen, zunächst noch ohne Bearbeitung. Reine Darstellung mit echten ENM-Daten aus dem Store.

**Schritt 2 — `NoteCell.vue` Komponente** (1 Tag)
Kleines, fokussiertes Bauteil: Anzeige-Modus und Edit-Modus. Isoliert testbar. Nutzt die `noten`-Liste aus dem ENM-Export als Dropdown-Optionen.

**Schritt 3 — Store um Änderungspuffer erweitern** (halber Tag)
`changes`-Map, `updateNote()`, `getNote()`, `hasChanges`, `exportChanges()` hinzufügen. Bestehende Tests anpassen.

**Schritt 4 — `LupeView.vue`** (1 Tag)
Schülerlupe als eigenständige Komponente, ebenfalls aus dem Mockup abgeleitet. Zeigt auch geänderte Noten (aus dem Puffer).

**Schritt 5 — `ConferenceTimer.vue`** (halber Tag)
Timer als Modal-Komponente, wiederverwendbar.

**Schritt 6 — Änderungen speichern / exportieren** (1-2 Tage)
"Änderungen übernehmen"-Button in der Toolbar. Entweder SVWS-API-Call (Option A) oder Download als JSON-Diff (Option B). Hier auch: Bestätigungsdialog mit Zusammenfassung aller Änderungen.

---

### 5. Konkrete Prompts für die nächsten Schritte

**Prompt: ClassView.vue**
```
Kontext: Vue 3 + TypeScript + Pinia, conferenceStore bekannt,
Typen aus enm.ts bekannt. Das Mockup (angehängte HTML-Datei)
definiert das Ziel-Design.

Erstelle src/components/ClassView.vue nach dem Mockup.
- Props: keine (liest direkt aus conferenceStore)
- Zeigt currentKlasse als Tabelle: Zeilen = Schüler,
  Spalten = Fächer (aus lerngruppen abgeleitet)
- Notenwert kommt aus store.getNote(schuelerId, lerngruppenId)
- Klick auf Zeile → store.selectSchueler(id)
- Ausgewählte Zeile hervorgehoben (lila Balken wie im Mockup)
- Geänderte Noten (store.isChanged) mit kleinem Marker
- Scoped CSS, kein Framework, Farben per CSS-Variablen
```

**Prompt: NoteCell.vue**
```
Erstelle src/components/NoteCell.vue:
Props: note: Notenkuerzel | null, editing: boolean,
       changed: boolean, availableNoten: EnmNote[]
Emits: save(note: Notenkuerzel | null), cancel()

Anzeige-Modus: farbiges Badge wie im Mockup
Edit-Modus: <select> mit allen Kürzeln aus availableNoten,
            vorausgewählt auf aktuellen Wert,
            Enter = save, Escape = cancel,
            autofocus beim Öffnen
Geänderter Zustand: kleiner blauer Punkt oben rechts am Badge
Kein any, vollständig typisiert.
```

---

### 6. Was ins Repository gehört (jetzt)

Bevor mit der Implementierung begonnen wird, lohnt es sich kurz folgende Dinge einzupflegen:

- Das finale Mockup als `docs/mockup-konferenzuebersicht.html`
- Eine kurze ADR für die Notenbearbeitung: `docs/adrs/ADR-04-notenbearbeitung.md` — Option B dokumentieren, damit spätere Entwickler die Entscheidung nachvollziehen können
- Die `enm_json.gz` Testdatei falls noch nicht im Repository (als `data/enm_test.json.gz`)

Soll ich direkt mit `ClassView.vue` oder dem Store-Erweiterungs-Prompt anfangen?