# SVWS-Conference: Architecture for AI Agents

**Datum:** Mai 2026 | **Version:** 0.2.x | **Status:** Production  
Diese Datei bietet eine schnelle technische Übersicht für KI-Agenten, um neue Features zu entwickeln oder Bugs zu beheben.

---

## 1. Projekt-Übersicht

**Name:** SVWS Konferenzübersicht  
**Zweck:** Browser-basierte digitale Notenkonferenz für Schulen. Lehrkräfte laden einen ENM-Export (Elektronisches Notenmanagement) vom SVWS-Server oder per Datei-Upload, bearbeiten Noten während der Konferenz und exportieren geänderte Daten zurück.

**Kernfeatures:**
- 📊 Tabellarische Noten-Ansicht (Schüler × Lerngruppen/Fächer)
- ✏️ In-place Notenbearbeitung mit Änderungstracking
- 🔍 Detail-Modal für Einzelschüler (Lupe-Ansicht)
- ⏱️ Konfidentieller Konferenz-Timer
- 💾 Export-Dialog mit Diff-Anzeige (was hat sich geändert)
- 🔌 Online-Modus (Server-Abruf per BasicAuth) + Offline-Modus (Datei-Upload)
- 📄 PDF-Export des Änderungslogs
- 🎨 Print-optimiertes Layout (A4)

---

## 2. Technologie-Stack

| Layer | Technologie | Version | Zweck |
|-------|-----------|---------|--------|
| **Framework** | Vue 3 | 3.5+ | Reactive UI Components (Composition API) |
| **Build** | Vite | 5.4+ | Zero-config bundler & dev server |
| **Sprache** | TypeScript | 5.8+ | Type safety |
| **Zustand** | Pinia | 2.1+ | Central store (composition-based) |
| **Offline** | fflate | 0.8+ | Client-side gzip decompression (9 kB) |
| **PDF** | jsPDF | 4.2+ | Server-side PDF generation (client-rendered) |
| **Sanitize** | DOMPurify | 3.3+ | XSS-Prevention beim Rendern von Markdown |
| **Markdown** | marked | 18.0+ | Changelog-Rendering (in Bemerkungen) |
| **Test** | Vitest | 2.1+ | Unit-Testing |
| **Lint** | ESLint | 9.25+ | Code quality |

**Build-Strategie:**
- Dev: `npm run dev` → Vite Dev Server mit HMR + lokaler Proxy-Support
- Prod: `npm run build` → Statische `dist/`-Dateien (auch offline/file://-kompatibel)
- Offline: `npm run build` → Zusätzlicher Step `scripts/build-offline.mjs` (HTML-Inline, globale Zustandsinit)

---

## 3. Projektstruktur

```
SVWS-Conference/
├── index.html                          # SPA Entry Point
├── src/
│   ├── main.ts                         # App Init + Pinia Store Setup
│   ├── App.vue                         # Root Component (Setup Syntax, Render Function)
│   ├── style.css                       # Global Styles + Print CSS
│   ├── env.d.ts                        # Type Definitions (Vite, __SVWS_DEFAULTS__)
│   │
│   ├── components/
│   │   ├── ConferenceApp.vue           # Главный App Container
│   │   └── conference/
│   │       ├── StartScreenSection.vue  # Login / File-Upload Screen
│   │       ├── ConferenceHeaderSection.vue  # Klasse-Selector, Mode, Timer Chip
│   │       ├── KlasseTableSection.vue  # Haupttabelle (Schüler × Lerngruppen)
│   │       ├── LupeModalSection.vue    # Detail-Modal (Lupe-Ansicht)
│   │       └── AppDialogsSection.vue   # Timer Modal, Änderungen-Dialog, Export-Bestätigung
│   │
│   ├── stores/
│   │   └── conferenceStore.ts          # Pinia Store (ENM Data + Change Tracking)
│   │
│   ├── composables/
│   │   └── useConferenceDerivedData.ts # Computed State für Render (Avg, Fehlstunden, Lupe-Subj.)
│   │
│   ├── parser/
│   │   └── enmParser.ts                # gunzip + JSON-Parse + Validation
│   │
│   ├── types/
│   │   ├── enm.ts                      # ENM Schema Types (Klassen, Schüler, Noten, Lerngruppen)
│   │   └── validation.ts               # Zod-free JSON Schema Validation
│   │
│   └── utils/
│       ├── changeLogMapping.ts         # Format Change-Deltas für UI/PDF
│       └── lupeCardPresentation.ts     # Render Logic für Lupe Detail-Cards
│
├── scripts/
│   ├── build-offline.mjs               # Offline-Build: Inlining, Sandbox, Fallbacks
│   └── copy-impressum.mjs              # Post-Build: Impressum-Datei Handling
│
├── docs/
│   ├── index.md                        # User Manual Start
│   ├── adrs/                           # Architecture Decision Records (siehe adrs/README.md)
│   │   ├── README.md                   # Index aller ADRs
│   │   ├── adr001-framework-vue3.md    # Kein Framework-Zwang → Vue 3 wählen
│   │   ├── adr002-fflate-zip-library.md # fflate statt pako
│   │   ├── adr003-offline-modus.md     # Offline-Modus als Hauptziel
│   │   ├── adr004-notenbearbeitung.md  # Lokaler Change-Buffer im Store
│   │   ├── adr005-SVWS-Conference-Sicherheitsbericht.md
│   │   ├── adr006-OfflineMode-Sicherheitsbericht.md
│   │   ├── adr007-design-system.md
│   │   ├── adr008-electron-integration.md
│   │   └── adr009-fix-k1-password-storage.md
│   ├── manual/                         # Benutzerhandbuch (01-10-anhang)
│   └── mockup-konferenzuebersicht.html # Screenshot Referenz
│
├── data/                               # Test / Demo ENM Files (local dev)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
└── README.md
```

---

## 4. Data Flow & Core Concepts

### 4.1 Datenbeschaffung (Zwei Pfade)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  **ONLINE-MODUS**: StartScreenSection (Login)               │
│  ├─→ User gibt Server-URL, Schema, Username, Password       │
│  ├─→ persistRuntimeConfig() speichert (AUSSER Passwort)     │
│  └─→ await store.loadFromServer()                           │
│      ├─→ buildEnmCandidateUrls() (fallback 5 Endpunkte)    │
│      ├─→ fetch(url, { Authorization: 'Basic ...' })        │
│      ├─→ response.arrayBuffer()                              │
│      ├─→ parseEnmGzip(arrayBuffer)                          │
│      │   ├─→ gunzipSync(data)                               │
│      │   ├─→ JSON.parse()                                    │
│      │   └─→ validateEnmExport()                             │
│      └─→ store.setExport() + store.selectedKlasseId = 1      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  **OFFLINE-MODUS**: File <input type="file">               │
│  ├─→ User wählt .gz-Datei                                   │
│  ├─→ await store.loadFromFile(file)                         │
│  │   ├─→ file.arrayBuffer()                                 │
│  │   ├─→ parseEnmGzip(arrayBuffer)  ← gleicher Parser       │
│  │   └─→ store.setExport() + resetChanges()                 │
│  │                                                            │
│  └─→ **OPTIONAL**: .env-Datei-Upload (onConfigFileSelected)│
│      ├─→ file.text()                                         │
│      ├─→ parseEnvLikeText(content)                           │
│      └─→ serverUrl/schema/username werden vorausgefüllt     │
│          (Passwort wird NICHT aus .env übernommen)           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 ENM Export Format (Minimal)

```typescript
type EnmExport = {
  schulInfo: { schuljahr: number, abschnitt: number }
  schueler: EnmSchueler[]
  lehrer: EnmLehrer[]
  faecher: EnmFach[]
  klassen: EnmKlasse[]           // Klasse enthält schueler[], faecher[]
  lerngruppen: EnmLerngruppe[]   // Lerngruppe enthält schueler[], lehrer[], fach
}

type EnmSchueler = {
  id: number | string
  nachname: string
  vorname: string
  geschlecht?: 'm' | 'w' | 'd' | 'x'
  bemerkungen?: { ASV?: string, AUE?: string, ZB?: string }
  fehlstundenGesamt?: number
  fehlstundenGesamtUnentschuldigt?: number
}

type EnmLerngruppe = {
  id: number | string
  fachID: number | string
  schueler: { id: number, note?: Notenkuerzel, fehlstunden?: {fach, unentschuldigt} }[]
  lehrer: { id: number, rolle?: string }[]
  kursart?: Kursart
  bemerkung?: string
}
```

### 4.3 Pinia Store (conferenceStore.ts)

**State:**
```typescript
const store = {
  // Raw-Daten
  enmExport: EnmExport | null
  dataSource: 'server' | 'file' | null
  
  // Selection
  selectedKlasseId: number | null
  
  // Change Tracking (Hauptfeature!)
  noteChanges: Map<string, Notenkuerzel | null>      // key: "schuelerId:lerngruppeId"
  bemerkungChanges: Map<...>
  fehlstundenChanges: Map<...>
  
  // UI State
  loading: boolean
  error: string | null
}
```

**Key Actions:**
- `loadFromServer(config)` → Fetch + Parse + Store
- `loadFromFile(file)` → Parse File + Store
- `selectKlasse(id)` → Ändert selectedKlasseId, triggert UI-Update
- `updateNote(schuelerId, lerngruppeId, note)` → Schreibt in noteChanges
- `isNoteChanged(schuelerId, lerngruppeId)` → Boolean (für CSS-Highlighting)
- `importPatchedExportToServer(config)` → Sendet Änderungen zurück zum SVWS
- `createPatchedExportGzip()` → Blob mit nur den Änderungen (Diff-Export)

**Key Getters:**
```typescript
currentKlasse:        KonferenzKlasse   // null falls keine Klasse gewählt
availableKlassen:     KonferenzKlasse[] // alle Klassen aus enmExport
hasAnyChanges:        boolean           // true falls noteChanges.size > 0
totalChangeCount:     number            // Summe aller geänderten Cells
```

### 4.4 Component Communication Pattern

```
ConferenceApp.vue (Root)
  │
  ├─→ ConferenceHeaderSection (read: store.*, methods: selectKlasse, setMode, etc.)
  │   ├─→ Klasse-Selector (dropdown)
  │   ├─→ Mode Toggle (Klasse ↔ Lerngruppe)
  │   ├─→ Timer Chip (Kontrolle)
  │   └─→ Change-Counter Badge
  │
  ├─→ KlasseTableSection (read: currentKlasse, getNote, isChanged, methods: updateNote)
  │   └─→ Table with inline <select> für Noten (on-change → store.updateNote)
  │
  ├─→ LupeModalSection (read: currentKlasse, selectedSchuelerId, methods: updateNote)
  │   └─→ Lupe Detail Cards (Alternative Tabellenansicht)
  │
  └─→ AppDialogsSection (read: store.*, methods: exportChanges, printLog, etc.)
      ├─→ Timer Modal
      ├─→ Changes Dialog (zeigt alle Deltas)
      └─→ Export Confirmation Modal
```

---

## 5. Kritische Architektur-Entscheidungen (ADRs)

Alle ADRs befinden sich in `docs/adrs/`. Hier die **Kernpunkte für Agenten**:

### ADR-001: Framework Vue 3 (nicht Svelte / vanilla)
- **Grund:** Composition API = gleich ob CDN oder SFC (`.vue`)
- **Implication:** Vite + TypeScript ist Standard. Keine Vanilla JS.
- **Für Agenten:** Verwende immer `<script setup>` oder `setup()` function.

### ADR-002: fflate statt pako
- **Grund:** fflate ist nur 9 kB gzip, reiner JavaScript, keine WASM
- **Implication:** `gunzipSync()` läuft direkt im Main Thread (OK für ~10 MB Dateien)
- **Für Agenten:** Import: `import { gunzipSync } from 'fflate'`

### ADR-003: Offline-Modus als Hauptziel
- **Grund:** Schulserver können ausfallen; Datei-Upload muss zuverlässig laufen
- **Implication:** Browser-Speicher, keine Datenbank, keine persistente API
- **Für Agenten:** LocalStorage nur für non-sensitive Daten (Host, Schema, Username — NIEMALS Password)

### ADR-004: Lokaler Change-Buffer (statt zu modifizieren)
- **Grund:** ENM-Export ist Momentaufnahme, sollte unveränderlich bleiben
- **Implication:** Alle Änderungen leben im Store als Map (`noteChanges`, `bemerkungChanges`, etc.)
- **Für Agenten:** Nutze immer `store.updateNote()`, nie direkt `store.enmExport.schueler[i].note = ...`
- **Pattern:** `getNote(schuelerId, lgId) { return noteChanges.get(key) ?? originalNote }`

### ADR-005 & 006: Sicherheits-Audits (April 2026)
- **Kritisch K-1:** Passwort darf NIEMALS in localStorage landen
  - ✅ Fix: `persistRuntimeConfig()` schließt Passwort aus (umgesetzt in ADR-009)
  - ⚠️ Aber: `.env`-Upload muss auch gefixed werden
- **Kritisch H-1:** ENM-Daten über Proxy zu Drittem = ungültig bei offline-first Architektur
- **Für Agenten:** CSP-Header prüfen, localStorage-Keys auditieren, keine base64-Codierung als „Verschlüsselung"

### ADR-007: Einheitliches Design-System
- **Grund:** SVWS-Conference und SVWS-Import sollen als Produktfamilie einheitlich wirken
- **Implication:** Emerald-Farbpalette, explizite CSS Custom Properties statt PrimeVue-Interna
- **Für Agenten:** Keine `--p-surface-*`-Legacy-Variablen verwenden; Notenstufen- und LK-Badge-Farben bleiben app-spezifisch

### ADR-008: Electron-Integration
- **Grund:** SVWS-Server sendet ungültige CORS-Header (`credentials:true` + `allow-origin:*`), die Browser ablehnen
- **Implication:** `electron/main.cjs` patcht CORS im Main-Process; `npm run release` baut AppImage, NSIS und Webserver-ZIP
- **Für Agenten:** Browser-Build und Electron-Build müssen konsistent bleiben; TLS-Trust für selbstsignierte Zertifikate nur im Electron-Kontext

### ADR-009: Fix K-1 — Passwort-Speicherung
- **Grund:** Umsetzung des kritischen Befunds K-1 aus ADR-005
- **Implication:** Passwort nur noch im reaktiven In-Memory-State, nie in localStorage; Migration bestehender Einträge beim Laden
- **Für Agenten:** Bei jeder Änderung an der Config-Persistenz (`ge()`/`sG()`-Äquivalente) sicherstellen, dass `password` weiterhin ausgeschlossen bleibt

---

## 6. Sicherheits-Anforderungen

🔴 **KRITISCH — Agenten müssen wissen:**

1. **Password Storage**
   - ❌ `localStorage.setItem(..., JSON.stringify({ password: ... }))`
   - ✅ Lese das Passwort zur Laufzeit in `ref('')`, sende es nur per `Authorization`-Header
   - Code-Pattern: `const password = ref('')` + `fetch(url, { headers: { Authorization: 'Basic ' + btoa(...) } })`

2. **XSS Prevention**
   - DOMPurify wird benutzt, aber nur explizit aufgerufen
   - Markdown (Bemerkungen) wird mit `marked` geparsed + `DOMPurify.sanitize()` → kann aber noch XSS-anfällig sein
   - **Für Agenten:** Nutze immer `v-html` mit DOMPurify:
     ```vue
     <div v-html="DOMPurify.sanitize(marked.parse(bemerkung))" />
     ```

3. **CORS & Same-Origin**
   - App läuft `file://` oder `https://school.local/svws-conference/`
   - SVWS-Server muss `Access-Control-Allow-Origin` gesetzt haben
   - Relativer Proxy-Pfad `/api/svws/...` ist **deprecated** (siehe H-1)
   - **Für Agenten:** Immer absente URLs bauen, Basic-Auth im Header

4. **Datenschutz = Offline-First**
   - Alle ENM-Daten bleiben im Browser-RAM
   - Kein Tracking, keine Cookies, keine Drittserver
   - **Für Agenten:** Wenn ihr eine neue Feature schreibt (z.B. Sync), sie darf keine Daten ohne Explizit-Zustimmung senden

---

## 7. Important Patterns & Conventions

### 7.1 Vue Setup Syntax (bevorzugt)

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Notenkuerzel } from '../types/enm'

// Props (automatisch typisiert)
const props = defineProps<{
  schuelerId: number
  note: Notenkuerzel | null
}>()

// Emits
const emit = defineEmits<{
  updateNote: [note: Notenkuerzel | null]
}>()

// State
const isEditing = ref(false)

// Computed
const displayText = computed(() => props.note ?? '–')

// Methods (normale Functions)
function handleChange(newNote: Notenkuerzel | null) {
  emit('updateNote', newNote)
  isEditing.value = false
}
</script>
```

Alternativ: `defineComponent + setup()` function (wird auch benutzt, z.B. in ConferenceApp.vue für Render Functions).

### 7.2 Type Safety

- ✅ `type Notenkuerzel = '1' | '2' | ... | '6'` (Union, nicht string)
- ✅ `function getNote(schuelerId: number, lerngruppeId: number): Notenkuerzel | null`
- ✅ `const store = useConferenceStore()` (Pinia TypeScript inference)
- ❌ Nie `any`, nie `as unknown`
- **Für Agenten:** `npm run typecheck` vor `git push`

### 7.3 Store Access Pattern

```typescript
// ✅ In einer Komponente:
const store = useConferenceStore()
const currentKlasse = computed(() => store.currentKlasse)
const selectedSchueler = computed(() => {
  const id = store.selectedSchuelerId
  return store.currentKlasse?.schueler.find(s => s.schueler.id === id)
})

// ✅ Änderungen tracken:
function updateNote(schuelerId: number, lgId: number, note: Notenkuerzel | null) {
  store.updateNote(schuelerId, lgId, note)
  // Store triggert automatisch UI-Updates via reactive()
}

// ❌ Niemals:
store.enmExport!.klassen[0].schueler[0].noten = ...
```

### 7.4 Change Tracking Pattern

```typescript
// Im Store:
const noteChanges = new Map<string, Notenkuerzel | null>()

function updateNote(schuelerId: number, lerngruppeId: number, note: Notenkuerzel | null) {
  const key = `${schuelerId}:${lerngruppeId}`
  const original = getOriginalNote(schuelerId, lerngruppeId)
  
  if (note === original) {
    // Keine Änderung: Eintrag löschen
    noteChanges.delete(key)
  } else {
    // Änderung: speichern
    noteChanges.set(key, note)
  }
}

function getNote(schuelerId: number, lerngruppeId: number): Notenkuerzel | null {
  const key = `${schuelerId}:${lerngruppeId}`
  // Change-Puffer hat Priorität
  if (noteChanges.has(key)) {
    return noteChanges.get(key) ?? null
  }
  // Fallback: Original aus ENM
  return getOriginalNote(schuelerId, lerngruppeId)
}
```

### 7.5 Styling Patterns

- Global CSS: `src/style.css` (nur globale Resets, Farben, Print-Media)
- **Kein Tailwind, kein CSS-in-JS** (Projekt ist bewusst minimal)
- Scoped Styles in `.vue`-Files: `.vue`-Compiler handhabt das automatisch
- Print-CSS: `@media print { ... }` für A4-Layout

---

## 8. Common Tasks for AI Agents

### Task: Neue Noten-Spalte in der Tabelle anzeigen

1. Stelle sicher, dass die neue Spalte im ENM-Schema existiert (`src/types/enm.ts`)
2. Update `KlasseTableSection.vue`: neue `<th>` + neue `<td>` mit Binding
3. Update `buildConferenceDerivedData()` falls Computed-Werte nötig sind
4. Test: `npm run test:run` + visueller Check mit `npm run dev`

### Task: Berechnung (z.B. Notendurchschnitt) ändern

1. Öffne `src/composables/useConferenceDerivedData.ts` (berechnet avg, gradedCount, etc.)
2. Diese Function wird aus `ConferenceApp.vue` aufgerufen, liefert derived state
3. Update die Logik, Test mit `npm run test:run`
4. Komponenten re-rendern automatisch, falls computed value ändert sich

### Task: Neuer Diag-Modal (wie Timer/Export)

1. Füge Modal-State zu `ConferenceApp.vue` hinzu: `const myModalOpen = ref(false)`
2. Erstelle Komponente `src/components/conference/MyModal.vue`
3. Registriere in `AppDialogsSection.vue` (oder neue eigene Section)
4. Render in `return h()` Funktion mit Bedingung: `myModalOpen.value ? h(MyModal, {...}) : null`

### Task: Change Tracking für neues Feld (z.B. Bemerkung, Fehlstunden)

1. Öffne `src/stores/conferenceStore.ts`
2. Füge neuer Map hinzu: `const bemerkungChanges = new Map<string, string | null>()`
3. Schreibe `updateBemerkung(schuelerId, lgId, text)` Funktion (wie `updateNote`)
4. Schreibe `getBemerkung(...)` Funktion mit Change-Puffer-Logik
5. Update `hasAnyChanges` und `listNoteChanges()` um neue Änderungen zu erfassen

### Task: Offline-Build testen (file:// protocol)

```bash
npm run build
# Öffne dann lokal:
#   Firefox: about:blank, wähle Datei → /dist/index.html
#   Oder einfach Doppelklick auf dist/index.html (falls OS-Support)
```

---

## 9. Command Reference

| Befehl | Zweck |
|--------|-------|
| `npm install` | Dependencies installieren |
| `npm run dev` | Vite Dev Server (http://localhost:5173) |
| `npm run build` | Production Build → `dist/` |
| `npm run typecheck` | TypeScript Checks ohne Emit |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (Watch Mode) |
| `npm run test:run` | Vitest (einmalig) |

---

## 10. Quick Reference für häufige Fehler

| Fehler | Grund | Fix |
|--------|-------|-----|
| `Cannot read property 'schueler' of null` | `currentKlasse` ist null | Check: `store.selectedKlasseId`, `store.enmExport` |
| Password in localStorage sichtbar | ADR-005 Violation | Entferne password aus persist-Config, use `ref('')` |
| ENM-Datei lädt nicht | gunzip-Fehler | Check: `npm list fflate`, siehe `enmParser.ts` error handling |
| Timer-Sound fehlt | Browser-Policy | OK, ist degradation (audio-Fehler loggen, nicht werfen) |
| Änderungen gehen nach Reload verloren | Erwartetes Verhalten | `localStorage` hat nur runtime-config, ENM bleibt nicht persistiert |
| PDF erzeugt leere Seite | jsPDF-Fehler | Check: `printChangeLog()` in `ConferenceApp.vue` |

---

## 11. External Resources

- **SVWS-Server Docs:** https://svws.dw.schulen-online.de/
- **Vue 3 Docs:** https://vuejs.org/
- **Pinia Docs:** https://pinia.vuejs.org/
- **fflate NPM:** https://www.npmjs.com/package/fflate
- **User Manual (DE):** https://fpfotenhauer.github.io/SVWS-Conference/

---

## 12. For Next Prompts: Copy-Paste Template

Verwende diese Vorlage bei der Kommunikation mit neuen KI-Agenten:

```
Context: SVWS-Conference ist eine Vue 3 + TypeScript + Pinia SPA für Schulnoten-Konferenzen.
- ENM-Exportformat: gzipped JSON mit Klassen, Schülern, Lerngruppen, Noten
- Offline-First: Alle Daten im Browser, kein Backend außer SVWS-Server (optional)
- Change Tracking: Lokale Map pro Zelltyp (Noten, Bemerkungen, Fehlstunden)
- Security: No Password Storage, XSS-Prevention, CORS-aware

Task: [Deine Feature/Bug-Beschreibung]

Architecture Ref: docs/adrs/, siehe auch architecture.md Sektion [N]
Type Definitions: src/types/enm.ts
Store: src/stores/conferenceStore.ts (Pinia, Setup Syntax)
Main Components: src/components/conference/{KlasseTableSection,LupeModalSection,AppDialogsSection}.vue

Acceptance Criteria:
- TypeScript keine Fehler (npm run typecheck)
- ESLint OK (npm run lint)
- Units tests grün (npm run test:run)
- Visueller Test in dev (npm run dev)
```

---

**Zuletzt aktualisiert:** Mai 2026 | **Maintainer:** pfotenhauer
