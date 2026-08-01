# ADR 009: Fix K-1 — Passwort aus localStorage entfernen

## Status
Akzeptiert / Umgesetzt

## Kontext
Der Sicherheitsbericht [[adr005-SVWS-Conference-Sicherheitsbericht]] identifiziert als
kritischsten Befund K-1: Benutzername und Passwort wurden dauerhaft im Klartext (JSON,
nicht verschlüsselt) in `window.localStorage` gespeichert. `localStorage` ist persistent,
domainweit lesbar und im Falle einer XSS-Lücke vollständig kompromittierbar — das verletzt
die in [[adr003-offline-modus]] festgelegte Regel, niemals sensible Daten zu persistieren.

Betroffen: `src/` vor dem Vite-Build; die hier dokumentierten Änderungen beziehen sich auf
die minifizierte Entsprechung in `assets/app.js` (Zeilen ~32762–32985, Stand
SVWS-Conference 0.2.2).

## Entscheidung
Das Passwort wird ausschließlich im reaktiven In-Memory-State (`ref('')`) gehalten und beim
Neuladen der Seite bewusst leer gelassen — der Nutzer muss es bei jedem Sitzungsstart neu
eingeben. Alle übrigen Konfigurationsfelder bleiben wie zuvor in `localStorage`:

| Feld | Vorher | Nachher |
|-----|--------|---------|
| `baseUrl` | localStorage | localStorage |
| `schema` | localStorage | localStorage |
| `username` | localStorage | localStorage |
| `password` | localStorage 🔴 | **nicht gespeichert** |
| `trustSelfSigned` | localStorage | localStorage |

Zusätzlich wird beim Abmelden das Passwort aktiv aus dem Speicher gelöscht.

### Änderung 1 — Speicherfunktion `ge()` (localStorage schreiben)
```js
function ge() {
    if (typeof window > "u") return;
    // Passwort wird bewusst NICHT persistiert – nur nicht-sensitive Felder speichern.
    let be = {
        baseUrl:         i.value,
        schema:          a.value,
        username:        s.value,
        // password: absichtlich weggelassen
        trustSelfSigned: l.value
    };
    try {
        window.localStorage.setItem(AI, JSON.stringify(be))
    } catch {}
}
```

### Änderung 2 — Ladefunktion `sG()` (localStorage lesen, Migration)
Bereits vorhandene `password`-Einträge bei Nutzern, die den Fix noch nicht hatten, werden
beim Laden bereinigt und der bereinigte Wert sofort zurückgeschrieben:
```js
function sG() {
    if (typeof window > "u") return {};
    try {
        let e = window.localStorage.getItem(AI);
        if (!e) return {};
        let t = JSON.parse(e);
        if (typeof t !== "object" || t === null) return {};

        if ("password" in t) {
            delete t.password;
            window.localStorage.setItem(AI, JSON.stringify(t));
        }

        return t;
    } catch {
        return {};
    }
}
```

### Änderung 3 — Initialisierung des reaktiven Passwort-State
```js
// Passwort wird nie aus dem Speicher geladen – immer leer initialisieren.
let o = Zt("");
```
Hinweis zu `A.password` (`__SVWS_DEFAULTS__`): Falls das Passwort über die
Build-Zeit-Variable `__SVWS_DEFAULTS__` injiziert wird (z. B. für Entwicklungsumgebungen),
muss dieser Mechanismus ebenfalls entfernt oder auf eine sichere Alternative umgestellt
werden (z. B. `.env`-Datei, die nicht in den Build eingeht). In Produktivumgebungen darf
`A.password` nicht gesetzt sein.

### Änderung 4 — Abmelden: Passwort aus dem reaktiven State löschen
```js
function Ke() {
    o.value = "";   // Passwort aktiv aus dem reaktiven State löschen.
    e.reset();
    m.value = null;
    B.value = "klasse";
    v.value  = !1;
    ee.value = !1;
    pe.value = !1;
    ie.value = !1;
    q.value  = null;
    h.value  = "Abgemeldet. Noch keine Daten geladen.";
}
```

### Änderung 5 — UX: Hinweistext im Passwort-Feld
```js
ne("input", {
    class:        "tile-input",
    type:         "password",
    placeholder:  "Passwort (wird nicht gespeichert)",
    value:        o.value,
    autocomplete: "current-password",
    onInput: ce => {
        // ge() wird hier NICHT aufgerufen – das Passwort-Feld löst keine Persistierung aus.
        o.value = ce.target.value;
    }
})
```
`ge()` wurde zuvor bei jeder Tastatureingabe im Passwort-Feld aufgerufen. Der Aufruf könnte
prinzipiell drinbleiben, da `ge()` das Passwort nicht mehr enthält — das explizite Weglassen
macht die Intention aber klar und verhindert eine versehentliche Regression.

## Konsequenzen
Vorteile:
- Behebt den kritischen Befund K-1 vollständig, inkl. Migration bereits betroffener
  bestehender `localStorage`-Einträge.
- Konsistent mit der in [[adr003-offline-modus]] festgelegten Regel.

Nachteile:
- Nutzer müssen das Passwort bei jedem Sitzungsstart neu eingeben (bewusst in Kauf
  genommen — siehe Placeholder-Text in Änderung 5).

## Verifikation
```js
// Browser-Konsole, nach Login und Seiten-Neuladen:
JSON.parse(localStorage.getItem("svws-conference.runtime-config"))
// Erwartet: { baseUrl: "https://...", schema: "...", username: "...", trustSelfSigned: false }
// → kein "password"-Feld
```
```js
// Migrationstest: alten Eintrag simulieren
localStorage.setItem(
    "svws-conference.runtime-config",
    JSON.stringify({ baseUrl: "x", schema: "y", username: "z", password: "geheim" })
);
// → nach Neuladen der Seite muss "password" aus dem Eintrag entfernt sein (Änderung 2).
```
