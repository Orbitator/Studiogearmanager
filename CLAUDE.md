# Studio Gear Manager (SGM) – Projektkontext für Claude Code

Antworte auf Deutsch, knapp und direkt. Entwickler: HOLODECK (alleiniger Entwickler).
Arbeitsweise: gebündelt umsetzen, wenig Token verbrauchen, keine langen Zusammenfassungen.

## Was ist das?
Client-seitige Single-Page-PWA für Musiker und Studios zur Verwaltung von Studio-Equipment
(Synths, Effekte, MIDI, Zubehör, Dokumente, Marktwerte). Vanilla HTML/CSS/JS, **keine Frameworks,
kein Build-Schritt**. Daten liegen im Browser (IndexedDB + localStorage). UI Deutsch + Englisch.
Aktuelle Version: **1.0.6** (live). Free-Version mit Gerätelimit, Pro per Lizenzcode (19 €, manuell vergeben).

## Dateien
| Datei | Zweck |
|---|---|
| `index.html` | Markup aller Ansichten und Dialoge. Lädt `styles.css?v=…` und `app.js?v=…` |
| `app.js` | gesamte App-Logik (~5.700 Zeilen) |
| `styles.css` | Styles; neuere Blöcke werden **unten angehängt** und überschreiben ältere |
| `manifest.json`, `icon.svg` | PWA |
| `counter.php` | Besucherzähler (UUID-basiert) |
| `order.php` | Pro-Bestellformular → `orders/orders.csv` + Mail an HOLODECK |
| `codegenerator.html` | Admin-Tool: Lizenzen, Spenden-Codes, Feature-Manager, Versionstexte, Limits, Statistik. **Enthält keine Secrets.** |
| `licenses.php` | Server-Speicher für den Code-Generator (Passwort, automatische Backups in `licdata/`) |
| `sgm-pro-features.js`, `sgm-whats-new-v1.0.3.js` | Altlasten/Snippets aus dem Generator |
| `artifacts/code-generator/` | Quelltext des Code-Generator-Artefakts (claude.ai, eigener Datenspeicher) |
| `artifacts/spenden-widget/` | Spendenhinweis als eigenständiges Script (`donate-widget.js`) + Baukasten-Seite |
| `tests/` | Playwright-Tests (siehe unten) |
| `docs/` | Changelogs, UX-Review vom 08.10.2026, `TEXTE.md` (Release Notes, Pro-Werbetext, Kunden-Mail DE/EN) |

## Architektur von app.js (Orientierung)
- Konstanten ganz oben: `APP_VERSION`, `FREE_DEVICE_LIMIT = 25`, `PRO_SHOP_URL` (leer = Formular), `PRO_PRICE = 19`, `ORDER_EMAIL`, `WHATS_NEW` (Release-Notes DE/EN, Free/Pro).
- Speicher: `STORAGE_KEY`, `WISHLIST_KEY` (`studioGearManager.*.v1`), IndexedDB `studioGearManager`; weitere Schlüssel: `CUSTOM_FIELDS_KEY`, `CATEGORY_ORDER_KEY`, `HIDE_SOLD_KEY`, `LICENSE_KEY`, Donor-/Nag-Keys.
- i18n: `i18n.de` / `i18n.en`, Zugriff über `t(key)`; HTML nutzt `data-i18n`, `data-i18n-placeholder`, `data-i18n-title`; `applyTranslations()` setzt Texte. Fehlt ein Key, bleibt der HTML-Text stehen. **Neue Texte immer in DE und EN anlegen.** Nutzer können Beschriftungen überschreiben (`userLabels`).
- Event-Handler laufen über `safe(name, fn)`; Logging über `Logger.info/warn/error`.
- Pro: `isProUser()` prüft nur, ob `LICENSE_KEY` gesetzt ist. `storeLicense()` prüft den Schreibvorgang, `onLicenseChanged()` rendert neu. Limit zentral über `freeLimitReached()`.
- Lizenzcodes `SGMP-XXXX-XXXX-CCCC`: `base = sha256(LICENSE_SECRET + "seed-" + seed)[0..8]`, `check = sha256(LICENSE_SECRET + base)[0..4]`, Großbuchstaben. Spenden-Codes `SGM-…` genauso mit `DONOR_SECRET`. **Secrets nie ändern**, sonst werden vergebene Codes ungültig. Gleicher Algorithmus in `codegenerator.html`, `licenses.php` und dem Artefakt.
- Setup-Dialog: Tabs `colors, views, categories, customFields, labels, backup, license, logs`; `switchSettingsTab()` setzt auch den Titel.

## Produktregeln
- **Free bekommt alle Optimierungen und Fehlerbehebungen; Pro bekommt individuelle Anpassungen** (eigene Felder, Spaltenbreiten, Logo-Position, Kategorien-Reihenfolge, Grid-Spalten, Galerie). Free darf sich nie beschnitten anfühlen.
- Spendenhinweis (Nag-Toast) wird bei Pro und eingelöstem Spenden-Code unterdrückt.

## Pro-Verkauf (aktueller Ablauf)
- Preis **19 € einmalig**, inklusive Pro-Updates für 12 Monate (so steht es im Bestellformular).
- Ablauf: Kunde bestellt in der App (Setup → Lizenz → „Pro-Version kaufen“ oder Limit-Dialog) → `order.php` speichert in `orders/orders.csv` und mailt an HOLODECK → Zahlung manuell anfordern → Lizenz im Code-Generator erzeugen → Code per Mail schicken (Vorlage in `docs/TEXTE.md`).
- Lizenzliste liegt auf dem Server (`licenses.php`, Passwort) und zusätzlich im Code-Generator-Artefakt auf claude.ai. Beide nutzen denselben Algorithmus; abgleichen per JSON-Export/-Import.
- Ohne Server/PHP öffnet das Bestellformular das Mailprogramm (Fallback an `ORDER_EMAIL`).

## Release-Checkliste (bei jeder neuen Version)
1. `APP_VERSION` und `WHATS_NEW.version` in `app.js` erhöhen, Notes DE + EN (Fehlerbehebung / Optimierung / Neue Funktionen; Pro getrennt).
2. In `index.html` **beide** Cache-Busting-Parameter `?v=` (styles.css, app.js) auf die neue Version setzen. Sonst laufen bei Nutzern neue HTML mit alter app.js → rohe i18n-Schlüssel.
3. Versionsnummer im Titel (`#appVersionTitle`) kommt automatisch aus `APP_VERSION`.
4. Tests laufen lassen, Changelog in `docs/` ergänzen.
5. Hochladen: immer `index.html`, `app.js`, `styles.css` **zusammen**.

## Bekannte Stolperfallen
- Formularzugriffe immer absichern (der Crash bei `form.elements.image.value` kam mehrfach zurück).
- Safari: Bilder als `pendingDeviceImage` im State halten, nicht als Base64 in Inputs; komplexe Template-Literals vermeiden.
- Lightbox: `stopPropagation()` beim Öffnen + Listener auf Dokumentebene zum Schließen. Pfeiltasten nur, wenn die Lightbox offen ist.
- Grid-Spalten nur für Pro + Grid-Ansicht + breite Fenster (CSS-Variable `--grid-cols`).
- Dialoge mit vielen Tabs: Flex-Spalte + `min-width: 0`, sonst bestimmt die breiteste Zeile die Breite (Bug in 1.0.5).

## Sicherheit / Server
- `app.js` ist öffentlich und enthält die Secrets zwangsläufig (reine Browser-App). Code-Erzeugung lässt sich nicht wirklich schützen.
- `licenses.php`: `$ADMIN_PASSWORD` nur auf dem Server eintragen, **nie mit Passwort committen**. Daten in `licdata/*.json.php` (von außen nicht abrufbar).
- `orders/`, `licdata/`, `visitor_ids*.txt` gehören nicht ins Repo (siehe `.gitignore`). Repo **privat** halten.

## Tests
```bash
pip install playwright && python -m playwright install chromium
python tests/test_sgm.py . tests/shots                     # 57 App-Checks, startet eigenen Server auf :8765
python -m http.server 8765 & python tests/test_setup.py http://localhost:8765/index.html tests/shots   # Setup-Dialog in 4 Größen
# Code-Generator + licenses.php (PHP nötig, Test-Kopie mit gesetztem Passwort):
php -S 127.0.0.1:8890 & python tests/test_cg.py http://127.0.0.1:8890/codegenerator.html tests/shots <passwort>
```

## Offene Punkte
- `PRO_SHOP_URL` leer → LemonSqueezy mit Webhook-Lizenzversand ist geplant.
- Reverb-API für Marktwerte als Pro-Funktion geplant.
- Verkaufte Geräte zählen noch zum Free-Limit (bewusst offen gelassen).
- Ein Pro-Nutzer meldete, dass das Gerätelimit trotz Lizenz blieb. Ursachen vermutlich anderer Speicherkontext (Homescreen-App vs. Browser, Safari löscht nach 7 Tagen). Seit 1.0.5 prüft `storeLicense()` das Speichern; Rückmeldung des Nutzers steht aus.
- Mobile-Optimierung der App selbst (nicht nur Code-Generator) wurde angefragt, aber noch nicht umgesetzt.

## Nicht Teil dieses Projekts
X-Generator / ONE CLICK SYNTH (Website, Audio-Player) wird separat betreut.
