# ADR 001: Framework — Vue 3 statt Vanilla JS oder Svelte

## Status
Akzeptiert

## Kontext
Für die SVWS-Konferenzübersicht (digitale Notenkonferenz für Schulen) musste ein
Frontend-Ansatz gewählt werden. Randbedingungen:

- Deployment als statische Dateien, keine Backend-Infrastruktur nötig.
- Zielgruppe sind Schulen, teils mit eingeschränkter IT-Infrastruktur — ein
  Zero-Build-Betrieb (z. B. `index.html` per Doppelklick) sollte anfangs möglich bleiben.
- Die App sollte mit wachsendem Funktionsumfang (Notenbearbeitung, Stores,
  mehrere Ansichten) skalieren können, ohne die Architektur neu aufzusetzen.

Zur Debatte standen: reines Vanilla JS mit ES-Modulen, Svelte und Vue 3.

## Entscheidung
Vue 3 mit Composition API wird als Framework verwendet.

Ausschlaggebend:
- **CDN-Modus möglich:** Vue 3 kann per `<script src="https://unpkg.com/vue@3/dist/vue.global.js">`
  ganz ohne Build-Schritt eingebunden werden — die App bleibt dann eine einzelne `index.html`.
- **Migrationspfad ohne Bruch:** Die Composition-API-Logik ist zwischen CDN-Modus und
  Vite + Single-File-Components (`.vue`) nahezu identisch. Der Umstieg von Zero-Build auf
  eine vollwertige Vite-SPA erfordert keine Neuentwicklung der Komponentenlogik.
- **Verbreitung im Schulumfeld:** Vue ist geläufiger als Svelte, was die Wartbarkeit durch
  Dritte (z. B. andere Schul-IT-Teams) verbessert.

Daraus ergaben sich ursprünglich zwei Deployment-Stufen (Zero-Build-CDN zuerst, Vite + SFC
später beim Ausbau der App). Das Projekt ist inzwischen vollständig auf die zweite Stufe
umgestellt: Vite + TypeScript + Pinia, siehe [[adr004-notenbearbeitung]].

## Konsequenzen
Vorteile:
- Kein Framework-Zwang zu Build-Tooling in frühen Projektphasen.
- Composition API sorgt für einheitlichen Code-Stil unabhängig vom Deployment-Modus.
- Guter Wissenstransfer zu anderen SVWS-Apps (z. B. SVWS-Import), die ebenfalls Vue nutzen.

Nachteile:
- Vue-spezifisches Wissen nötig, kein Vanilla-JS-Standard.
- Der ursprüngliche Zero-Build-CDN-Modus wird nicht mehr aktiv gepflegt, da vollständig auf
  Vite umgestellt wurde.

## Für Agenten
Verwende immer `<script setup>` (bzw. `setup()`-Funktion) mit der Composition API. Kein
Options-API-Code, kein Vanilla JS.
