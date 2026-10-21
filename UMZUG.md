# Umzug in den neuen Claude-Account (Claude Code)

## 1. Projekt auf deinen Rechner
Den Ordner aus `SGM-Umzug.zip` entpacken, z. B. nach
`~/Documents/Apps/Stud.IO/StudioGearManager`.
Der Git-Verlauf (alle Versionen seit 1.0.3) ist im Ordner `.git` enthalten. Auf dem Mac sind
Ordner mit Punkt versteckt (Cmd+Shift+. zeigt sie an).

## 2. Auf GitHub sichern (empfohlen)
Claude Code im Web und auf dem Handy arbeitet mit GitHub-Repositories. Lokal geht es auch ohne.
1. Auf github.com ein neues **privates** Repository anlegen, z. B. `studio-gear-manager` (ohne README).
2. Im Projektordner im Terminal:
   ```bash
   git remote add origin https://github.com/DEIN-NAME/studio-gear-manager.git
   git push -u origin main
   ```

## 3. Claude Code im neuen Account
- **Am Rechner:** Terminal im Projektordner öffnen, `claude` starten, mit dem neuen Account anmelden.
- **Im Browser/Handy:** claude.ai/code → GitHub verbinden → Repository wählen.
Claude liest automatisch `CLAUDE.md` und kennt damit Aufbau, Regeln, Release-Checkliste und offene Punkte.
Ein guter erster Satz: „Lies CLAUDE.md und führe die Tests aus.“

## 4. Was NICHT automatisch mitkommt
| Was | Was tun |
|---|---|
| **Lizenzliste im Code-Generator-Artefakt** (alter Account) | Im alten Artefakt: Sicherung → „Als .json speichern“. Im neuen Account das Artefakt neu veröffentlichen (Quelltext: `artifacts/code-generator/index.html`) und die Datei dort importieren. |
| **Lizenzliste auf dem Server** (`licenses.php`) | Bleibt einfach auf dem Server, nichts zu tun. |
| **Spenden-Widget-Artefakt** | Bei Bedarf aus `artifacts/spenden-widget/` neu veröffentlichen. Die Datei `donate-widget.js` funktioniert auch ohne Artefakt. |
| **Chatverläufe und Erinnerungen** | Lassen sich nicht übertragen. Das Wichtige steht in `CLAUDE.md`. |
| **Projekt-Dokumente auf claude.ai** | Sind identisch mit den Dateien in diesem Ordner. |

## 5. Danach
Im alten Account nichts löschen, bis die Lizenzliste im neuen Account geprüft ist.
