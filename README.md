# Studio Gear Manager

Lokale Browser-App zur visuellen Verwaltung von Studio-Equipment, Wishlist und Marktwerten. Läuft komplett offline, speichert Daten ausschließlich in deinem Browser, kein Server, kein Account.

## Schnellstart (einfach)

1. ZIP entpacken
2. `index.html` per Doppelklick im Browser öffnen
3. Beim ersten Start: "Demo-Daten laden" oder "Leere Bibliothek starten"

Das war's — die App ist sofort einsatzbereit.

## Als Desktop-App / im Dock installieren

Die Funktionen "Zum Dock hinzufügen" (Safari) und "App installieren" (Chrome/Edge) verlangen, dass die App über `http://localhost` läuft, nicht via `file://`. Dafür liefert das ZIP einen kleinen Launcher mit, der einen Mini-Server startet:

### macOS

1. Doppelklick auf **`start.command`**
   - Ein Terminal-Fenster öffnet sich, der Browser springt automatisch auf die App.
   - Beim allerersten Mal kann macOS warnen ("Datei aus unbekannter Quelle"). Rechtsklick → "Öffnen" → "Öffnen" bestätigen.
2. In **Safari**: Menü *Datei → Zum Dock hinzufügen…* → Name bestätigen. Das Studio-Gear-Icon erscheint im Dock und öffnet die App in einem eigenen Fenster.
3. In **Chrome/Edge**: rechts in der Adressleiste das kleine Install-Symbol (Bildschirm mit Pfeil) klicken → "Studio Gear Manager installieren".

Server stoppen: Terminal-Fenster schließen oder `Strg+C` drücken.

Voraussetzung: Python 3 muss installiert sein. macOS hat das nicht mehr standardmäßig — bei Bedarf in der Konsole `xcode-select --install` ausführen.

### Windows

1. Doppelklick auf **`start.bat`**
   - Ein Konsolenfenster öffnet sich, der Browser springt automatisch auf die App.
2. In **Chrome/Edge**: rechts in der Adressleiste das Install-Symbol klicken → "Studio Gear Manager installieren".

Server stoppen: Konsolenfenster schließen.

Voraussetzung: Python 3 muss installiert sein. Falls nicht: [python.org/downloads](https://www.python.org/downloads/) — beim Setup unbedingt "Add Python to PATH" aktivieren.

### iOS / iPadOS

1. App auf einem Mac/Windows-PC im Netzwerk per `start.command`/`start.bat` starten
2. Auf dem iPhone/iPad in Safari `http://<IP-des-Rechners>:8732/index.html` öffnen
3. Teilen-Button → "Zum Home-Bildschirm" → Name bestätigen

Oder die App auf einen Webspace hochladen und dort regulär aufrufen.

### Android

Wie iOS, aber mit Chrome: drei-Punkte-Menü → "App installieren" oder "Zum Startbildschirm hinzufügen".

## Datenspeicherung

Die App speichert in **IndexedDB** (Geräte, Wunschliste) und **localStorage** (Einstellungen, Beschriftungen, Theme). Daten bleiben auf einem Rechner und werden nicht an einen Server übertragen. Jeder Browser hat seine eigenen Daten.

**Wichtig**: Regelmäßig "Backup exportieren" klicken und die JSON-Datei sichern. Bei Löschen der Browser-Daten oder Wechsel des Browsers gehen die Inhalte sonst verloren.

## Features auf einen Blick

- Geräte-Bibliothek mit Grid- und Listenansicht
- Wunschliste mit "In Bibliothek übernehmen"-Funktion
- Volltext-Suche, Sortierung nach 7 Kriterien, Kategorie-Filter
- Detailansicht mit Tabs (Übersicht, Audio, MIDI, Strom, Wert, Dokumente, Notizen)
- Foto-Upload mit automatischer Komprimierung
- Hersteller-Logo wird automatisch wiederverwendet
- Setup-Dialog mit Farb-, Ansichts- und Beschriftungs-Anpassung
- Logs zur Fehleranalyse exportierbar
- Deutsch / Englisch umschaltbar
- JSON-Backup Export/Import
- CSV-Export der Inventarliste
