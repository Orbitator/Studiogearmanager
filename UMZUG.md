# Umzug in den neuen Claude-Account (Claude Code)

## 1. Projekt liegt auf GitHub
Repository: https://github.com/Orbitator/Studiogearmanager (Branch `main`).
Der alte Stand vom April ist im Verlauf erhalten, der aktuelle Stand (1.0.6) liegt obenauf.

## 2. Auf deinen Rechner holen
```bash
cd ~/Documents/Apps/Stud.IO
git clone https://github.com/Orbitator/Studiogearmanager.git StudioGearManager
```
Liegt dort schon ein Ordner `StudioGearManager`, vorher umbenennen.

**Hinweis:** Das Repository ist öffentlich. Empfehlung: auf GitHub unter Settings → General → Danger Zone → „Change visibility“ auf **Private** stellen.

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
