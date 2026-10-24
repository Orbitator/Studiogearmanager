# Studio Gear Manager — Änderungen vom 04.05.2026

> Übergabe-Dokument für Claude Code  
> Alle Änderungen gegenüber dem Stand vom 03.05.2026 (v1.0.0)

---

## Dateiübersicht

| Datei | Status |
|---|---|
| `app.js` | Geändert |
| `index.html` | Geändert |
| `styles.css` | Geändert (Klassen angehängt) |
| `counter.php` | **Neu** |
| `codegenerator.html` | Erweitert |

---

## app.js

### Neue Konstanten (Dateianfang)

```js
const VISITOR_UUID_KEY  = "studioGearManager.visitorId.v1";
const APP_VERSION       = "1.0.2";           // war: 1.0.0
const SORT_WORDS_KEY    = "studioGearManager.sortWords.v1";
const SORT_CRITERIA_KEY = "studioGearManager.sortCriteria.v1";
const LICENSE_KEY       = "studioGearManager.licenseCode.v1";
const LICENSE_SECRET    = "SGMP-v1-4e7b2d19-pro";
```

---

### Bug-Fixes

#### 1. editDevice-Crash (`form.elements.image`)
`form.elements.image` existiert nicht mehr im Formular — zwei ungeschützte Zugriffe mit Guard versehen:

```js
// Zeile ~3201 (fillForm):
if (pendingDeviceImage && form.elements.image) form.elements.image.value = "";

// Zeile ~3940 (openWishlistDialog):
if (form.elements.image) form.elements.image.value = item.image ... ? item.image : "";
```

#### 2. Lightbox schließt sofort nach Öffnen
`event.stopPropagation()` im Open-Handler des `#detailImage`-Klick-Listeners hinzugefügt, damit der `document`-Click-Handler die Lightbox nicht sofort wieder schließt.

#### 3. manifest.json 404-Konsolenfehler
`<link rel="manifest" href="./manifest.json" />` aus `index.html` entfernt.

---

### Sortierwörter

Artikel und Präfixe, die beim Sortieren nach Name/Hersteller ignoriert werden.

```js
const DEFAULT_SORT_WORDS = ["Der","Die","Das","The","A","An","Ein","Eine"];
let sortIgnoreWords = [...]           // aus localStorage, persistiert in SORT_WORDS_KEY
function saveSortWords() {}
function stripSortPrefix(value) {}    // entfernt Artikel vor der Sortierung
function renderSortWordsEditor() {}   // befüllt #sortWordsInput
function saveSortWordsFromForm() {}   // liest #sortWordsInput → sortIgnoreWords
```

`stripSortPrefix()` wird in `getDeviceSortValue()` auf `name` und `manufacturer` angewendet.

---

### Sortierkriterien

Welche Optionen in der Sortier-Dropdown erscheinen, ist konfigurierbar.

```js
const ALL_SORT_CRITERIA = [
  { value: "added",        i18nKey: "sortFieldAdded" },
  { value: "name",         i18nKey: "sortFieldName" },
  { value: "year",         i18nKey: "sortFieldYear" },
  { value: "purchaseDate", i18nKey: "sortFieldPurchaseDate" },
  { value: "manufacturer", i18nKey: "sortFieldManufacturer" },
  { value: "midiChannel",  i18nKey: "sortFieldMidiChannel" },
  { value: "price",        i18nKey: "sortFieldPrice" },
  { value: "rating",       i18nKey: "sortFieldRating" },
  { value: "subcategory",  i18nKey: "sortFieldSubcategory" },
  { value: "type",         i18nKey: "sortFieldType" },
];

let sortCriteriaVisible = null;       // null = alle sichtbar (Default)
function saveSortCriteria() {}
function applySortCriteria() {}       // blendet <option>-Elemente im <select> aus/ein
function renderSortCriteriaEditor() {} // rendert Checkboxen in #sortCriteriaSettings
```

Wird beim Boot und beim Speichern der Einstellungen aufgerufen.

---

### Pro-Lizenz-System

#### Feature-Registry

```js
const PRO_FEATURES = {
  gridColumns:    { pro: true },   // Karten pro Zeile konfigurierbar
  multipleImages: { pro: true },   // Mehrere Gerätebilder + Galerie
};
```

Neue Features hier eintragen: `{ pro: true }` = nur Pro, `{ pro: false }` = alle.

#### Hilfsfunktionen

```js
function isProUser() {}              // true wenn LICENSE_KEY in localStorage
function requiresPro(featureKey) {}  // true wenn Feature erlaubt (Free oder lizenziert)
```

#### Lizenz-Validierung und -Verwaltung

```js
async function validateLicenseCode(rawCode) {}  // Format: SGMP-XXXX-XXXX-XXXX (16 Zeichen ohne Striche)
async function redeemLicenseCode() {}           // liest #licenseCodeInput, speichert bei Erfolg
function renderLicenseStatus() {}               // aktualisiert UI im Lizenz-Tab
function revokeLicenseCode() {}                 // entfernt LICENSE_KEY aus localStorage
```

Lizenz-Codes beginnen mit `SGMP-` (Spenden-Codes: `SGM-`). Anderes Secret (`LICENSE_SECRET`).

---

### Besucher-Zähler

```js
function generateUUID() {}      // erstellt eindeutige Browser-ID
function trackVisitor() {}      // sendet UUID an counter.php, speichert Anzahl in sessionStorage
function renderVisitorCount() {} // zeigt "· N Benutzer" im Extras-Tab (#visitorCountDisplay)
```

Wird beim Boot aufgerufen. Scheitert still wenn `counter.php` nicht erreichbar ist.

---

### Grid-Spalten pro Zeile (Pro-Feature)

```js
// In loadViewSettings() — neu:
gridColumns: parsed.gridColumns || 4,

function applyGridColumns() {}           // setzt grid-template-columns inline am #deviceGrid
function renderGridColumnsControl() {}   // befüllt #gridColumnsInput-Slider, deaktiviert wenn kein Pro
```

`applyGridColumns()` wird aufgerufen in:
- `renderGrid()` (bei jedem Grid-Render)
- Boot-Sequenz

Slider hat Live-Vorschau: ändert Grid sofort ohne Speichern.

---

### Mehrere Gerätebilder (Pro-Feature)

```js
let pendingDeviceImages = [];  // Array von { src: string, name: string }
```

#### handleFormImageUpload() — erweitert
- **Pro:** Datei wird in `pendingDeviceImages[]` gepusht. Erstes Bild = Hauptbild (`pendingDeviceImage`).
- **Free:** wie bisher, ein Bild.

#### renderFormImagePreview() — erweitert
- **Pro:** Thumbnail-Galerie (`.form-image-gallery`) mit Löschen-Button je Bild und "Hauptbild"-Badge.
- **Free:** wie bisher, ein Bild mit Entfernen-Button.

#### deviceFromForm() — erweitert
```js
image:  pendingDeviceImage || get("image"),
images: isProUser() && pendingDeviceImages.length > 0
          ? pendingDeviceImages.map(i => i.src)
          : undefined,
```

#### fillForm() — erweitert
```js
pendingDeviceImages = isProUser() && Array.isArray(device.images)
  ? device.images.map((src, i) => ({ src, name: `Bild ${i + 1}` }))
  : [];
```

#### Reset von `pendingDeviceImages = []`
Erfolgt an drei Stellen: nach Speichern, beim Öffnen neuer Geräte, beim Schließen ohne Speichern.

---

### Lightbox — Galerie-Navigation

```js
function updateLightboxNav() {}     // zeigt/versteckt #lightboxPrev, #lightboxNext, #lightboxCounter
function lightboxNavigate(dir) {}   // dir: +1 oder -1, wraps around
```

Beim Öffnen der Lightbox:
```js
const gallery = (isProUser() && device?.images?.length > 1)
  ? device.images : [img.src];
lb.dataset.gallery    = JSON.stringify(gallery);
lb.dataset.galleryIdx = "0";
```

Tastatursteuerung: `←`/`→` navigieren, `ESC` schließt.  
Nav-Buttons `#lightboxPrev` und `#lightboxNext` verwenden `stopPropagation`, damit die Lightbox nicht gleichzeitig schließt.

---

### renderViewSettingsControls() — erweitert

Ruft jetzt zusätzlich auf:
```js
renderGridColumnsControl();
renderSortCriteriaEditor();
renderSortWordsEditor();
```

---

### saveSettings() — erweitert

Speichert zusätzlich:
```js
saveSortWordsFromForm();
// Grid-Spalten (nur Pro):
viewSettings.gridColumns = Math.min(5, Math.max(2, parseInt(colInput.value) || 4));
saveViewSettings();
applyGridColumns();
// Sortierkriterien aus Checkboxen:
document.querySelectorAll("[data-sort-criteria]").forEach(cb => {
  sortCriteriaVisible[cb.dataset.sortCriteria] = cb.checked;
});
saveSortCriteria();
applySortCriteria();
```

---

### openSettingsDialog() — erweitert

Ruft zusätzlich auf:
```js
renderLicenseStatus();
renderVisitorCount();
```

---

### Export (exportJson) — erweitert

Neue Keys im Backup:
```js
SORT_WORDS_KEY, SORT_CRITERIA_KEY, LICENSE_KEY
```

---

### bindEvents() — neue Listener

```js
"#redeemLicenseBtn"    → redeemLicenseCode()
"#revokeLicenseBtn"    → revokeLicenseCode()
"#licenseCodeInput"    → Enter → redeemLicenseCode()
"#resetSortWordsBtn"   → sortIgnoreWords = [...DEFAULT_SORT_WORDS], saveSortWords(), renderSortWordsEditor()
"#gridColumnsInput"    → input-Event: Live-Spaltenupdate (nur Pro)
"#formImageUploadInput"→ multiple files: forEach → handleFormImageUpload() (Pro), sonst nur files[0]
document click         → Lightbox schließen + Nav-Button-Handling
document keydown       → ESC schließt Lightbox, ←/→ navigieren
```

---

### Boot-Sequenz — neue Schritte

```
applySortCriteria → applyGridColumns → trackVisitor
```

---

### i18n — neue Schlüssel (DE + EN)

| Key | Beschreibung |
|---|---|
| `settingsTabLicense` | Tab-Bezeichnung „Lizenz" |
| `licenseTitle` | Überschrift im Lizenz-Panel |
| `licenseHelp` | Erklärungstext |
| `licenseCodePlaceholder` | `SGMP-XXXX-XXXX-XXXX` |
| `licenseCodeRedeem` | Button „Lizenz aktivieren" |
| `licenseCodeRevoke` | Button „Lizenz entfernen" |
| `licenseCodeSuccess` | Erfolgstext |
| `licenseCodeInvalid` | Fehlertext |
| `licenseActive` | Status „Pro aktiv" |
| `licenseInactive` | Status „Free-Version" |
| `licenseRevokeConfirm` | Bestätigungsdialog |
| `sortWordsTitle` | „Sortierwörter" |
| `sortWordsHelp` | Erklärungstext |
| `sortWordsReset` | Button „Zurücksetzen" |
| `sortCriteriaTitle` | „Sortierkriterien" |
| `sortCriteriaHelp` | Erklärungstext |
| `gridColumnsTitle` | „Karten pro Zeile" |
| `gridColumnsHelp` | Erklärungstext |
| `gridColumnsProHint` | Pro-Hinweis |
| `sortFieldAdded` … `sortFieldType` | 10 Sortierkriterien-Labels |

---

## index.html

### Logo neben Gerätebild (Formular)

Logo-Feld aus dem Formular-Grid herausgelöst. Neues Layout:

```html
<div class="form-media-row">
  <div class="form-logo-side">
    <label class="manufacturer-logo-field">
      <!-- Hersteller Logo Upload -->
    </label>
  </div>
  <div class="form-image-field">
    <!-- Bild suchen + Hochladen -->
    <input id="formImageUploadInput" type="file" accept="image/*" multiple />
    <div id="formImagePreview"></div>
  </div>
</div>
```

### Settings-Tabs — erweitert

```html
<button class="settings-tab" data-settings-tab="license" data-i18n="settingsTabLicense">Lizenz</button>
```
Eingefügt zwischen „Extras" und „Logs".

### Settings-Panel „Ansichten" — erweitert

Drei neue Sections unterhalb des Grid/Listen-Layouts:

```html
<!-- 1. Grid-Spalten (Pro) -->
<section class="view-settings-card grid-columns-card">
  <h4>Karten pro Zeile <span class="pro-feature-badge">PRO</span></h4>
  <input id="gridColumnsInput" type="range" min="2" max="5" value="4" step="1" />
  <span id="gridColumnsValue">4</span>
  <p id="gridColumnsProHint" style="display:none">⭐ Pro-Funktion</p>
</section>

<!-- 2. Sortierkriterien -->
<section class="view-settings-card sort-criteria-card">
  <div id="sortCriteriaSettings" class="sort-criteria-grid"></div>
</section>

<!-- 3. Sortierwörter -->
<section class="view-settings-card sort-words-card">
  <input id="sortWordsInput" type="text" />
  <button id="resetSortWordsBtn">Zurücksetzen</button>
</section>
```

### Settings-Panel „Lizenz" — neu

```html
<section class="settings-panel" data-settings-panel="license">
  <p id="licenseCodeStatus"></p>
  <div id="licenseCodeInputRow">
    <input id="licenseCodeInput" type="text" placeholder="SGMP-XXXX-XXXX-XXXX" />
    <button id="redeemLicenseBtn">Lizenz aktivieren</button>
  </div>
  <p id="licenseCodeFeedback"></p>
  <button id="revokeLicenseBtn" style="display:none">Lizenz entfernen</button>
</section>
```

### Extras-Panel — Besucher-Zähler

```html
<span class="visitor-count-display" id="visitorCountDisplay"></span>
```
Direkt hinter der Versionsnummer in `.version-footer`.

### Gerätepass — Bild klickbar

```html
<img id="detailImage" alt="" class="zoomable-image" title="Klicken zum Vergrößern" />
```

### Lightbox — Galerie-Navigation

```html
<div id="imageLightbox" class="lightbox hidden">
  <span class="lightbox-close">×</span>
  <button id="lightboxPrev" class="lightbox-nav lightbox-prev" style="display:none">←</button>
  <img id="lightboxImg" src="" alt="" />
  <button id="lightboxNext" class="lightbox-nav lightbox-next" style="display:none">→</button>
  <span id="lightboxCounter" class="lightbox-counter"></span>
</div>
```

---

## styles.css

Alle neuen Klassen am Ende der Datei angehängt:

| Klasse | Zweck |
|---|---|
| `.form-media-row` | Flex-Container: Logo links, Bild rechts |
| `.form-logo-side` | Logo-Spalte (flex: 0 0 200px) |
| `.sort-words-card` | Sortierwörter-Karte (margin-top: 14px) |
| `.sort-criteria-card` | Sortierkriterien-Karte |
| `.sort-criteria-grid` | 2-spaltige Checkbox-Liste |
| `.sort-words-row` | Flex-Zeile: Input + Button |
| `.sort-words-input` | Textfeld für Sortierwörter |
| `.lightbox` | Fullscreen-Overlay (position: fixed, z: 9999) |
| `.lightbox.hidden` | display: none |
| `.lightbox img` | max 94vw / 90vh, cursor: zoom-out |
| `.lightbox-close` | ×-Button oben rechts |
| `.lightbox-nav` | Prev/Next-Buttons |
| `.lightbox-prev` / `.lightbox-next` | Positionierung links/rechts |
| `.lightbox-counter` | „2 / 3" unten mittig |
| `.zoomable-image` | cursor: zoom-in |
| `.pro-feature-badge` | Gelbes PRO-Badge |
| `.pro-hint` | Gelber Hinweistext |
| `.grid-columns-card` | Karten-pro-Zeile-Card |
| `.grid-columns-row` | Flex: Slider + Zahl |
| `.form-image-gallery` | Thumbnail-Galerie im Formular |
| `.form-gallery-thumb` | 100×70px Thumbnail-Container |
| `.gallery-remove-btn` | ✕-Button auf Thumbnail |
| `.gallery-main-badge` | „Hauptbild"-Badge auf erstem Thumbnail |
| `.visitor-count-display` | „· N Benutzer" in Extras |

**Bestehende Klasse geändert:**  
`.settings-panel` → `padding-bottom: 24px` ergänzt (verhindert Abschneiden der letzten Karte).

---

## counter.php (neu)

Liegt im selben Ordner wie `index.html`.

- Empfängt `GET ?uid=UUID`
- Validiert Format (nur `[a-f0-9-]`, Länge 36)
- Speichert eindeutige UUIDs in `visitor_ids.txt` (LOCK_EX)
- Gibt `{"unique": N}` als JSON zurück
- Scheitert still wenn nicht vorhanden (App funktioniert weiter)

---

## codegenerator.html

### Neuer Tab: Feature-Manager

Dritter Tab neben „Spenden-Codes" und „Lizenzen".

**Funktionen:**
- Tabellarische Ansicht aller Features mit Free/Pro-Toggle-Buttons
- Neue Features hinzufügen: Key (camelCase, validiert), Name, Beschreibung
- Features einzeln löschen
- Persistenz in `localStorage` unter Key `sgm-codegen-features-v1`
- Vorbelegt mit `gridColumns` und `multipleImages`

**Snippet-Generator:**
- Erzeugt fertigen `PRO_FEATURES`-Block mit Timestamp und Feature-Zähler
- Kopieren-Button (Clipboard API)
- Download als `sgm-pro-features.js`

**Workflow:**
1. Neues Feature in `app.js` bauen
2. Im Feature-Manager eintragen + Free/Pro setzen
3. Snippet generieren → in `app.js` `PRO_FEATURES`-Konstante ersetzen

---

## Offene Punkte / Hinweise für Claude Code

- `PRO_FEATURES` in `app.js` muss manuell mit dem Snippet aus dem Feature-Manager synchron gehalten werden
- `counter.php` benötigt PHP auf dem Webserver; ohne PHP läuft die App normal weiter
- `device.images[]` (Array) ist additiv zu `device.image` (String) — Abwärtskompatibilität gegeben
- Für neue Pro-Features: `requiresPro("featureKey")` prüfen, bei `false` → Pro-Hinweis zeigen und Funktion sperren
