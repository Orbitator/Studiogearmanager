# Studio Gear Manager 1.0.5 — Änderungen vom 08.10.2026

> Basis: Live-Version 1.0.3 (SGM.zip vom Webserver). Geändert: `app.js`, `index.html`, `styles.css`.
> Getestet mit 57 automatisierten Browser-Checks (Chromium).

## Fehlerbehebung (Free)
- **Bild-Link ging beim Bearbeiten verloren** — `fillForm()` übernimmt `device.image` jetzt immer (vorher nur `data:`-Bilder).
- **Galerie ging ohne Pro verloren** — `deviceFromForm()` behält `currentDevice.images`, wenn keine Lizenz aktiv ist.
- **Galerie ohne Hauptbild** — bei Pro wird `device.image` als erstes Galeriebild übernommen, wenn `images[]` fehlt.
- **Bild entfernen/hochladen im Gerätepass** hält `images[]` synchron.
- **Rating der ersten drei Geräte** sprang auf 4/5/4 zurück — `normalizeDevices()` ohne Demo-Fallback; Demo-Ratings stehen in `seedDevices`.
- **DE-Tab „Bewertung" statt „Notizen"** — `tabs`-Array auf 7 Einträge korrigiert.
- **Pfeiltasten** wechselten bei offener Lightbox auch das Gerät — `kbdNav` bricht bei `isLightboxOpen()` ab; Lightbox-Tasten nur, wenn sie offen ist.
- **Grid-Spalten** erzwangen auch für Free 4 Spalten inline und zerstörten Handy- und Listenansicht — jetzt CSS-Variable `--grid-cols`, nur Pro + Grid-Modus + Bildschirm > 1180 px.
- **Lizenz „aktiv" obwohl nicht gespeichert** — `storeLicense()` prüft den Schreibvorgang; bei Fehler Meldung `licenseStoreFailed`.
- **Nach Lizenz-Aktivierung kein Refresh** — `onLicenseChanged()` schließt den Limit-Dialog und rendert alles neu.
- **„Zur Pro-Version upgraden" lief ins Leere** (`#proUpgradeBtn` existiert nicht) — öffnet `PRO_SHOP_URL` oder den Lizenz-Tab.
- **Wunschliste → Bibliothek umging das Free-Limit** — `freeLimitReached()` zentral für Neu, Duplizieren, Übernahme.

## Optimierung (Free)
- Listenansicht: `max-height` auf Fensterhöhe, Kopfzeile `sticky`; Spalten bleiben bündig über `--list-template` + `--list-min-width`.
- Gerätekarten: Logo über dem Namen (`.card-logo-above`), Name zweizeilig (`-webkit-line-clamp: 2`).
- Wunschlisten-Links landen im neuen Feld `links` statt in den Notizen.
- Setup → Kategorien: umbenennen, zusammenführen (gleicher Name), entfernen — ändert Geräte und Wünsche mit.
- Marktwert-Anzeige ohne „0–0 €" und ohne „·" am Ende; Übersicht ohne „— / —".
- Setup-Tabs brechen um, Dialog etwas breiter.

## Neue Funktionen (Free)
- **Duplizieren** (`duplicateSelectedDevice`): leert Seriennummer, Kaufjahr, Preis, Garantie; öffnet direkt den Bearbeiten-Dialog.
- **Miniaturbild in der Liste**: neue Spalte `deviceImage` (Standard an), Hover-Vorschau `#thumbPreview`, Klick öffnet die Lightbox.
- **Links bei Geräten**: Feld `device.links`, Zeilen „Name | URL" oder „URL"; klickbar im Tab Dokumente; URLs in Notizen werden klickbar. Nur `http(s)`/`mailto`.
- **Verkauft**: Button „Als verkauft markieren / Wieder aktiv", Status `Verkauft`; verkaufte Geräte zählen nicht zum Gesamtwert, Chip „Verkaufte ausblenden".
- **Auf Wunschliste setzen**: kopiert Hersteller, Modell, Typ, Bild, Logo, Links; fragt, ob zusätzlich „Verkauft".
- **Bauform** (`device.formFactor`): Vorgaben Keyboard, 19" Rack, Desktop, Eurorack, Pedal, Software; in Formular, Grid, Liste, Sortierung, Suche, CSV.

## Pro
- **Eigene Felder** (Setup → Eigene Felder): `CUSTOM_FIELDS_KEY`, Werte in `device.custom[id]`. Typen Text, Zahl, Datum, Ja/Nein, Auswahl, Link; Abschnitt im Formular; Reihenfolge ↑/↓. In Grid, Liste (Schlüssel `cf:<id>`), Sortierung, Suche, Gerätepass, CSV, Backup. Ohne Lizenz bleiben Werte erhalten.
- **Spaltenbreiten**: `.col-resizer` im Listenkopf ziehen, Doppelklick = automatisch (nochmal = zurück); `viewSettings.listColWidths`.
- **Logo-Position**: `viewSettings.logoPosition` (`above`/`inline`).
- **Kategorien-Reihenfolge**: `CATEGORY_ORDER_KEY`; Free sortiert alphabetisch.

## Neue Speicherschlüssel (im Backup enthalten)
`studioGearManager.customFields.v1`, `studioGearManager.categoryOrder.v1`, `studioGearManager.hideSold.v1`

## Offen / bewusst nicht geändert
- `PRO_SHOP_URL` ist leer — Kauf-Link eintragen, sobald LemonSqueezy steht.
- Verkaufte Geräte zählen weiter zum Free-Limit von 25.
- `isProUser()` prüft weiter nur das Vorhandensein des Schlüssels; Lizenz wird weiter mit ins Backup exportiert (siehe Review vom 08.10.).

## Nachtrag: Pro bestellen (manuelle Lizenzvergabe)
- Limit-Dialog „Zur Pro-Version upgraden" und neuer Button „Pro-Version kaufen" (Setup → Lizenz, nur Free) öffnen `showProOrderDialog()`: Name, E-Mail, Kästchen „Für 19 € kaufen" / „Buy for 19 €", Button „Zahlungspflichtig bestellen". DE/EN.
- `order.php` (neu): prüft Eingaben, Honeypot + Rate-Limit, speichert in `orders/orders.csv` (Ordner per `.htaccess` gesperrt), schickt E-Mail an `$NOTIFY_EMAIL`.
- Ohne Server/PHP: Fallback öffnet das E-Mail-Programm mit vorausgefüllter Bestellung an `ORDER_EMAIL`.
- Konstanten in `app.js`: `PRO_PRICE`, `ORDER_EMAIL`, `PRO_SHOP_URL` (gesetzt = externer Shop statt Formular).

---

# 1.0.6 — 10.10.2026

## Fehlerbehebung
- **Setup-Dialoge abgeschnitten**: Das Formular war ein CSS-Grid ohne Spaltenbreite → die breiteste Zeile (Tabs/Buttons) bestimmte die Breite, rechts wurde abgeschnitten (v. a. Handy/Tablet und schmale Fenster). Jetzt Flex-Spalte mit `min-width: 0`; nur der Inhaltsbereich scrollt, Kopf, Tabs und Buttons bleiben sichtbar. Tabs und Buttons brechen um. Getestet: alle 8 Tabs bei 1440×900, 1280×720, 1024×700, 390×800 — kein Überlauf.
- **Rohe Schlüssel statt Text** (z. B. `settingsTabCategories`, Footer „v1.0.3"): Browser hatte die alte `app.js` aus dem Cache. `index.html` lädt jetzt `styles.css?v=1.0.6` und `app.js?v=1.0.6` — bei jedem Update die Zahl erhöhen. Zusätzlich: fehlt ein Übersetzungsschlüssel, bleibt der deutsche Text aus der HTML stehen.
- **Setup-Titel** zeigte immer „Setup / Farben" — zeigt jetzt den aktiven Tab; Einleitung allgemein formuliert.

## Optimierung
- Versionsnummer klein hinter dem Titel (`#appVersionTitle`, aus `APP_VERSION`).

## Beim Update beachten
- **Alle drei Dateien** `index.html`, `app.js`, `styles.css` zusammen ersetzen.
