# Architecture Decision Records

Übersicht aller Architekturentscheidungen für SVWS-Conference. Jede ADR beschreibt eine
Entscheidung im Format Status / Kontext / Entscheidung / Konsequenzen. Für einen
komprimierten Überblick speziell für KI-Agenten siehe auch `architecture.md`, Abschnitt 5.

| # | Titel | Status |
|---|-------|--------|
| [001](adr001-framework-vue3.md) | Framework — Vue 3 statt Vanilla JS oder Svelte | Akzeptiert |
| [002](adr002-fflate-zip-library.md) | ZIP-Bibliothek — fflate statt pako | Akzeptiert |
| [003](adr003-offline-modus.md) | Offline-Modus als Hauptziel — kein persistenter Datenspeicher | Akzeptiert |
| [004](adr004-notenbearbeitung.md) | Notenbearbeitung in der Konferenzansicht (lokaler Change-Buffer) | Akzeptiert |
| [005](adr005-SVWS-Conference-Sicherheitsbericht.md) | Sicherheitsbericht SVWS-Conference 0.2.2 | Bericht |
| [006](adr006-OfflineMode-Sicherheitsbericht.md) | Sicherheitseinschätzung Offline-Modus | Bericht |
| [007](adr007-design-system.md) | Einheitliches Design-System für SVWS-Apps | Akzeptiert |
| [008](adr008-electron-integration.md) | Electron-Integration für Desktop-Betrieb | Akzeptiert |
| [009](adr009-fix-k1-password-storage.md) | Fix K-1 — Passwort aus localStorage entfernen | Umgesetzt |

ADR-005 und ADR-006 sind Sicherheitsberichte (keine Entscheidungsvorlage), auf denen spätere
Fixes wie ADR-009 aufbauen.

## Verwandtes Dokument

`architecture.md` im selben Ordner ist keine ADR, sondern eine laufend gepflegte
Architekturübersicht für KI-Agenten (Projektstruktur, Datenfluss, Patterns, Kernpunkte aller
ADRs).
