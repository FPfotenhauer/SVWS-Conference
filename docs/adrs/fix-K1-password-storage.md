# Fix K-1: Passwort aus `localStorage` entfernen

**Befund:** Benutzername und Passwort werden dauerhaft im Klartext in `localStorage` gespeichert.  
**Datei:** `src/` (Quellcode vor dem Vite-Build) — die nachfolgenden Änderungen beziehen sich auf die
minifizierte Entsprechung in `assets/app.js` (Zeilen ~32762–32985).

---

## Strategie

| Was | Vorher | Nachher |
|-----|--------|---------|
| `baseUrl` | localStorage | localStorage ✅ |
| `schema` | localStorage | localStorage ✅ |
| `username` | localStorage | localStorage ✅ |
| `password` | localStorage 🔴 | **nicht gespeichert** ✅ |
| `trustSelfSigned` | localStorage | localStorage ✅ |

Das Passwort-Feld wird **ausschließlich im reaktiven In-Memory-State** (`ref('')`) gehalten und
beim Neuladen der Seite bewusst leer gelassen — der Nutzer muss es neu eingeben. Das ist
das korrekte Verhalten für eine sicherheitskritische Anwendung.

Zusätzlich wird beim Abmelden (`Ke()`) das Passwort aktiv aus dem Speicher gelöscht.

---

## Änderung 1 — Speicherfunktion `ge()` (localStorage schreiben)

### Vorher
```js
function ge() {
    if (typeof window > "u") return;
    let be = {
        baseUrl:         i.value,
        schema:          a.value,
        username:        s.value,
        password:        o.value,   // ← SICHERHEITSLÜCKE
        trustSelfSigned: l.value
    };
    try {
        window.localStorage.setItem(AI, JSON.stringify(be))
    } catch {}
}
```

### Nachher
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

---

## Änderung 2 — Ladefunktion `sG()` (localStorage lesen)

Die Ladefunktion selbst muss nicht geändert werden — sie liest, was vorhanden ist.
Da `password` nicht mehr geschrieben wird, ist `n.password` beim nächsten Start immer `undefined`.

**Aber:** Für bereits betroffene Nutzer, die das Passwort noch im localStorage haben,
sollte der vorhandene Eintrag beim Laden bereinigt werden:

### Nachher
```js
function sG() {
    if (typeof window > "u") return {};
    try {
        let e = window.localStorage.getItem(AI);
        if (!e) return {};
        let t = JSON.parse(e);
        if (typeof t !== "object" || t === null) return {};

        // Passwort aus einem ggf. vorhandenen alten Eintrag entfernen und
        // den bereinigten Wert sofort zurückschreiben.
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

---

## Änderung 3 — Initialisierung des reaktiven Passwort-State

### Vorher
```js
let o = Zt(n.password ?? A.password ?? "");
//         ^^^^^^^^^^   ^^^^^^^^^^
//         aus localStorage  aus __SVWS_DEFAULTS__
```

### Nachher
```js
// Passwort wird nie aus dem Speicher geladen – immer leer initialisieren.
// Der Nutzer gibt es bei jedem Sitzungsstart neu ein.
let o = Zt("");
```

> **Hinweis zu `A.password` (`__SVWS_DEFAULTS__`):** Wenn das Passwort über die
> Build-Zeit-Variable `__SVWS_DEFAULTS__` injiziert wird (z. B. für Entwicklungsumgebungen),
> sollte dieser Mechanismus ebenfalls entfernt oder auf eine sichere Alternative umgestellt
> werden (z. B. `.env`-Datei, die *nicht* in den Build eingeht). Für Produktivumgebungen
> darf `A.password` nicht gesetzt sein.

---

## Änderung 4 — Abmelden: Passwort aus dem reaktiven State löschen

Die Funktion `Ke()` (Logout/Reset) sollte das Passwort im Speicher aktiv nullen,
damit es nicht für den Rest der Browser-Session im Heap verbleibt:

### Vorher
```js
function Ke() {
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

### Nachher
```js
function Ke() {
    // Passwort aktiv aus dem reaktiven State löschen.
    o.value = "";

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

---

## Änderung 5 — UX: Hinweistext im Passwort-Feld

Da das Passwort nach einem Neuladen nicht mehr vorausgefüllt ist, sollte dem Nutzer
das kurz erklärt werden. Das Input-Feld erhält einen sprechenden Placeholder:

### Vorher
```js
ne("input", {
    class:        "tile-input",
    type:         "password",
    placeholder:  "Passwort",
    value:        o.value,
    autocomplete: "current-password",
    onInput: ce => {
        o.value = ce.target.value, ge()
    }
})
```

### Nachher
```js
ne("input", {
    class:        "tile-input",
    type:         "password",
    // Erklärender Placeholder: Passwort wird nicht gespeichert
    placeholder:  "Passwort (wird nicht gespeichert)",
    value:        o.value,
    autocomplete: "current-password",
    onInput: ce => {
        // ge() wird hier NICHT aufgerufen – das Passwort-Feld löst keine Persistierung aus.
        o.value = ce.target.value;
    }
})
```

> **Warum kein `ge()` im `onInput`?** Bisher wurde `ge()` bei jeder Tastatureingabe im
> Passwort-Feld aufgerufen, was bedeutete, dass das Passwort mit jedem Zeichen neu in
> den localStorage geschrieben wurde. Da `ge()` das Passwort nun nicht mehr enthält,
> könnte der Aufruf prinzipiell drin bleiben — aber das explizite Weglassen macht die
> Intention klar und verhindert versehentliche Regressions.

---

## Zusammenfassung der Änderungen

| Änderung | Datei / Funktion | Art |
|----------|-----------------|-----|
| 1 | `ge()` — `password` aus dem gespeicherten Objekt entfernen | **Pflicht** |
| 2 | `sG()` — vorhandene `password`-Einträge beim Lesen bereinigen | **Pflicht** (Migration) |
| 3 | `o = Zt(...)` — Initialisierung immer mit leerem String | **Pflicht** |
| 4 | `Ke()` — `o.value = ""` beim Logout | Empfohlen |
| 5 | Passwort-Input — Placeholder + kein `ge()`-Aufruf | Empfohlen (UX) |

---

## Verifikation nach dem Fix

Nach dem Rebuild kann der Fix im Browser-DevTools verifiziert werden:

```js
// In der Browser-Konsole (nach Login und Seiten-Neuladen):
JSON.parse(localStorage.getItem("svws-conference.runtime-config"))
// Erwartetes Ergebnis:
// { baseUrl: "https://...", schema: "...", username: "...", trustSelfSigned: false }
// → kein "password"-Feld
```

```js
// Sicherheitstest: Alten Eintrag simulieren
localStorage.setItem(
    "svws-conference.runtime-config",
    JSON.stringify({ baseUrl: "x", schema: "y", username: "z", password: "geheim" })
);
// → Nach Neuladen der Seite muss "password" aus dem Eintrag entfernt worden sein (Änderung 2).
```
