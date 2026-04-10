# Sicherheitsbericht: SVWS-Conference-0.2.2

**Datum:** 08. April 2026  
**Geprüfte Version:** SVWS-Conference 0.2.2  
**Dateien:** `index.html`, `assets/app.js` (946 KB, minifiziert), `assets/app.css`  
**Prüfumfang:** Statische Code-Analyse der gesamten SPA (beautifiziert, 34.264 Zeilen)  
**Anforderung:** Keine Daten dürfen den Browser verlassen.

---

## Zusammenfassung

| Schweregrad | Anzahl |
|-------------|--------|
| 🔴 Kritisch | 1 |
| 🟠 Hoch | 2 |
| 🟡 Mittel | 2 |
| 🟢 Niedrig | 2 |
| ℹ️ Info / Positiv | 2 |

---

## 🔴 Kritisch

### K-1: Passwort im Klartext in `localStorage` gespeichert

**Fundstelle:** `app.js`, Funktion `ge()`, Zeile ~32983 (beautifiziert)

**Beschreibung:**  
Die Funktion `ge()` serialisiert das gesamte Konfigurationsobjekt als JSON und schreibt es dauerhaft in `window.localStorage`:

```js
window.localStorage.setItem("svws-conference.runtime-config", JSON.stringify({
    baseUrl:          i.value,
    schema:           a.value,
    username:         s.value,
    password:         o.value,      // ← Klartext-Passwort
    trustSelfSigned:  l.value
}));
```

`localStorage` ist:
- **persistent** (bleibt nach Sitzungsende erhalten),
- **domainweit lesbar** (jedes Script auf derselben Origin hat Zugriff),
- **im Falle einer XSS-Lücke vollständig kompromittierbar**.

Das gespeicherte Passwort ist zwar base64-kodiert (JSON-String), aber nicht verschlüsselt — es ist trivial auslesbar.

**Auswirkung:**  
Ein Angreifer mit Zugriff auf die Origin (z. B. durch eine XSS-Schwachstelle in einer weiteren App auf demselben Host, Browser-Extensions mit Zugriff auf Storage oder physischen Gerätezugriff) erhält das SVWS-Server-Passwort im Klartext.

**Empfehlung:**  
Passwort **niemals persistent speichern**. Nur nicht-sensible Konfiguration persistieren:

```js
// Nur speichern:
window.localStorage.setItem("svws-conference.runtime-config", JSON.stringify({
    baseUrl:         i.value,
    schema:          a.value,
    trustSelfSigned: l.value
    // username und password werden NICHT gespeichert
}));
```

Das Passwort wird zur Laufzeit eingegeben und ausschließlich im reaktiven State (`ref()`) gehalten. Bei Bedarf kann `sessionStorage` als kurzfristige Alternative genutzt werden — mit explizitem Löschen beim `beforeunload`-Event.

---

## 🟠 Hoch

### H-1: ENM-Schuldaten und Credentials werden an einen relativen Proxy-Endpunkt gesendet

**Fundstelle:** `app.js`, Funktion `Ce()`, Zeilen ~32421 ff. (beautifiziert)

**Beschreibung:**  
Beim Export/Import der Notendaten (ENM) sendet die App einen POST-Request an den relativen Pfad `/api/svws/enm-import`:

```js
fetch("/api/svws/enm-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        ...Be,               // enthält username + password
        gzipBase64: eG(at)  // gesamte ENM-Schüler-/Notendaten
    })
})
```

Das Objekt `Be` enthält das vollständige Konfigurationsobjekt inklusive `username` und `password`. Dieser relative Endpunkt setzt einen **serverseitigen Reverse-Proxy voraus**, der auf dem gleichen Host wie die SPA läuft. 

Zusätzlich existiert eine direkte Fallback-Variante (`vt()`), die die ENM-Daten mit Basic-Auth direkt an den SVWS-Server sendet — das ist korrekt implementiert (`Authorization`-Header). Der Proxy-Pfad hingegen übergibt die Credentials im **Request-Body**, was problematisch ist.

**Auswirkung:**  
- Wenn die SPA auf einem Webserver deployed wird, der nicht der SVWS-Server ist, fließen alle Schüler- und Notendaten sowie die Server-Credentials durch diesen Drittserver.
- Die Architektur (lokale SPA + Proxy) widerspricht dem Anspruch "keine Daten verlassen den Browser", falls der Proxy nicht auf dem Schulserver selbst läuft.
- Credentials im Request-Body statt im `Authorization`-Header gelten als schlechte Praxis (werden in Server-Logs, Proxy-Logs etc. mitgeschrieben).

**Empfehlung:**  
- Proxy-Architektur in der Dokumentation klar beschreiben und einschränken.
- Credentials **ausschließlich im `Authorization`-Header** übertragen, nie im Request-Body.
- Den Proxy so konfigurieren, dass er Logs mit sensitiven Daten unterdrückt.
- Prüfen, ob der Proxy-Pfad für den Offline-Datei-Upload-Modus überhaupt benötigt wird — ggf. entfernen.

---

### H-2: Fehlende Content-Security-Policy (CSP)

**Fundstelle:** `index.html`

**Beschreibung:**  
Die `index.html` enthält weder einen `<meta http-equiv="Content-Security-Policy">`-Tag noch Hinweise auf serverseitig gesetzte CSP-Header. Ohne CSP sind folgende Angriffsvektoren durch den Browser nicht eingeschränkt:

- Inline-Script-Ausführung (XSS)
- Laden externer Ressourcen (Exfiltration via `<img>`, `<script>`, etc.)
- Verbindungsaufbau zu beliebigen Hosts (`connect-src`)

Da die SPA sensible Schüler- und Notendaten verarbeitet, ist das Fehlen einer CSP besonders kritisch.

**Empfehlung:**  
CSP als `<meta>`-Tag in `index.html` einfügen (oder serverseitig als HTTP-Header):

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://[svws-server-url];
  object-src 'none';
  frame-ancestors 'none';
  base-uri 'self';
">
```

`'unsafe-inline'` für `style-src` kann entfernt werden, wenn kein Inline-CSS im Bundle vorhanden ist (prüfen).

---

## 🟡 Mittel

### M-1: CDN-Script-Injection (pdfobject) in neuem Fenster

**Fundstelle:** `app.js`, jsPDF-Modul, Zeilen ~21829 ff. (beautifiziert)

**Beschreibung:**  
Beim PDF-Export im Modus `pdfobjectnewwindow` öffnet jsPDF ein neues Browserfenster und injiziert dort dynamisch ein `<script>`-Tag:

```js
var Ee = "https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js";
var It = Tt.document.createElement("script");
It.src = Ee;
It.integrity = "sha512-4ze/a9/4jqu+...";  // SRI-Hash vorhanden
It.crossOrigin = "anonymous";
Tt.body.appendChild(It);
```

**Positiv:** Ein SRI-Hash (`integrity`) ist vorhanden und wird gesetzt, sofern keine benutzerdefinierte URL (`I.pdfObjectUrl`) angegeben wird. Wird eine eigene URL übergeben, entfällt der SRI-Schutz.

**Problem:**
- Das neu geöffnete Fenster hat keine CSP — der SRI-Hash schützt nur die Integrität des Scripts, nicht vor weiterem Nachladen von Ressourcen durch dieses Script.
- Eine benutzerdefinierte `pdfObjectUrl` kann beliebigen Code einschleusen.
- Der externe CDN-Aufruf verlässt den Browser-Kontext (auch wenn nur eine JS-Datei geladen wird).

**Empfehlung:**  
- `pdfobject` lokal ins Bundle aufnehmen (kein CDN-Aufruf nötig).
- Den `pdfobjectnewwindow`-Modus auf die Notwendigkeit prüfen — ggf. durch `bloburl` ersetzen.
- Benutzerdefinierte URLs für `pdfObjectUrl` unterbinden oder validieren.

---

### M-2: `trustSelfSigned`-Flag wird an Proxy weitergegeben — TLS-Validierung unklar

**Fundstelle:** `app.js`, Funktion `AG()`, Zeilen ~32184 ff. (beautifiziert)

**Beschreibung:**  
Der Parameter `trustSelfSigned` wird im Request-Body an den Proxy-Endpunkt `/api/svws/alive` mitgesendet:

```js
fetch("/api/svws/alive", {
    method: "POST",
    body: JSON.stringify({
        baseUrl:         e,
        trustSelfSigned: t   // ← steuert TLS-Verhalten des Proxys?
    })
})
```

Im Browser selbst kann TLS-Zertifikatsvalidierung nicht durch JavaScript beeinflusst werden. Dieses Flag hat nur Wirkung, wenn der serverseitige Proxy es auswertet und daraufhin die Zertifikatsprüfung zum SVWS-Server deaktiviert.

**Auswirkung:**  
Wenn der Proxy auf `trustSelfSigned: true` reagiert und TLS-Validierung deaktiviert, ist die Verbindung zum SVWS-Server anfällig für Man-in-the-Middle-Angriffe — auch wenn die Verbindung vom Browser zum Proxy verschlüsselt ist.

**Empfehlung:**  
- Proxy-Implementierung prüfen und dokumentieren.
- TLS-Zertifikatsvalidierung darf **nicht dauerhaft** deaktiviert werden.
- Stattdessen: Das selbstsignierte Zertifikat des SVWS-Servers dem Trust-Store des Proxys hinzufügen.
- Das `trustSelfSigned`-Flag aus dem API-Request entfernen.

---

## 🟢 Niedrig

### N-1: Kein Clickjacking-Schutz (`X-Frame-Options` / `frame-ancestors`)

**Fundstelle:** `index.html`

**Beschreibung:**  
Die SPA setzt weder `X-Frame-Options: DENY` noch `frame-ancestors 'none'` in einer CSP. Die Anwendung könnte in einem versteckten `<iframe>` eingebettet werden, um Nutzerinteraktionen abzugreifen (Clickjacking).

**Empfehlung:**  
In der CSP (siehe H-2) `frame-ancestors 'none'` setzen. Alternativ serverseitig:

```
X-Frame-Options: DENY
```

---

### N-2: Kein `Referrer-Policy`-Header

**Fundstelle:** `index.html`

**Beschreibung:**  
Beim Öffnen externer Links (CDN-Aufruf, etwaige Weiterleitungen) könnten URL-Parameter — etwa der Schema-Name der Schule — als `Referer`-Header übermittelt werden.

**Empfehlung:**  

```html
<meta name="referrer" content="no-referrer">
```

---

## ℹ️ Info / Positive Befunde

### I-1: Keine Telemetrie, kein Tracking, keine externen Verbindungen im Normalbetrieb

**Befund:**  
Weder `navigator.sendBeacon`, noch externe Analytics-Skripte, noch WebSockets wurden gefunden. `postMessage` ist auf die eigene Origin beschränkt (`zh.protocol + "//" + zh.host`). Im Datei-Upload-Modus (ohne Server) verlassen **keine Daten** den Browser — der Anspruch wird für diesen Modus erfüllt.

---

### I-2: DOMPurify v3.3.3 eingebunden, kein `eval()`, keine unsicheren Vue-Direktiven

**Befund:**  
DOMPurify (Version 3.3.3, aktuell) ist eingebunden und wird für `innerHTML`-Sanitierung verwendet. Im App-eigenen Code wurden keine `eval()`-Aufrufe, kein `new Function()` und keine unsanitized `v-html`-Direktiven gefunden. Das XSS-Risiko durch DOM-Manipulation ist entsprechend gering.

---

## Maßnahmen-Übersicht

| ID | Befund | Priorität | Aufwand |
|----|--------|-----------|---------|
| K-1 | Passwort aus localStorage entfernen | Sofort | Gering |
| H-1 | Proxy-Architektur absichern, Credentials aus Body entfernen | Hoch | Mittel |
| H-2 | Content-Security-Policy einführen | Hoch | Gering |
| M-1 | pdfobject lokal bündeln | Mittel | Gering |
| M-2 | trustSelfSigned-Mechanismus prüfen und absichern | Mittel | Mittel |
| N-1 | frame-ancestors 'none' in CSP | Niedrig | Minimal |
| N-2 | Referrer-Policy setzen | Niedrig | Minimal |

---

*Bericht erstellt mit Claude (Anthropic) — statische Code-Analyse, kein Laufzeit-Test.*
