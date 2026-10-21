// ── What's New ──
// Generiert: 4.5.2026, 21:39:32
// Version: 1.0.3
const WHATS_NEW = {
  version: "1.0.3",
  notes: {
    de: {
      free: `Neu in dieser Version:

- Performance Verbesserungen
- Bug-Fixes: Lightbox schließt nicht sofort,
- Sortierwörter-System (konfigurierbar, wird beim Sortieren ignoriert)
- Sortierkriterien konfigurierbar (welche Optionen im Dropdown erscheinen)`,
      pro:  `Neu und exklusiv für diese Pro Version:

- Pro-Lizenz-System (1 Jahr Updates inklusive)
- wählbare Grid-Spalten pro Zeile (2–5)
- Mehrere Gerätebilder möglich (Galerie)
- Lightbox mit Galerie-Navigation (←/→, ESC)
- unbegrenzte Anzahl von Geräten, Kategorien und Subkategorien`,
    },
    en: {
      free: `New in this version:

- Performance improvements

Bug fixes: 
- Lightbox does not close immediately
- Configurable sorting words system (ignored during sorting)
- Configurable sorting criteria (choose which options appear in the dropdown)`,
      pro:  `New an exclusive in this Pro version:

- Pro license system (1 year of updates included)
- Selectable grid columns per row (2–5)
- Multiple device images supported (gallery)
- Lightbox with gallery navigation (←/→, ESC)
- Unlimited number of devices, categories, and subcategories`,
    },
  },
};

const WHATS_NEW_KEY = "studioGearManager.whatsNewSeen.v1";

function showWhatsNewIfNeeded() {
  if (!WHATS_NEW.notes) return;
  // Bereits gesehen → überspringen
  if (localStorage.getItem(WHATS_NEW_KEY) === WHATS_NEW.version) return;
  // Erster App-Start (kein Setup durchgeführt) → nicht anzeigen,
  // damit der Willkommen-Dialog nicht überlagert wird.
  // Donor-Codes und Lizenz-Codes bleiben dabei vollständig erhalten —
  // sie liegen unabhängig im localStorage und werden hier nicht verändert.
  if (localStorage.getItem(SETUP_KEY) !== "true") {
    localStorage.setItem(WHATS_NEW_KEY, WHATS_NEW.version);
    return;
  }
  const lang = (localStorage.getItem(LANG_KEY) || "de") === "en" ? "en" : "de";
  const notes = WHATS_NEW.notes[lang];
  let body = notes.free || "";
  if (isProUser() && notes.pro) body += (body ? "\n\n" : "") + notes.pro;
  if (!body) { localStorage.setItem(WHATS_NEW_KEY, WHATS_NEW.version); return; }
  _showWhatsNewDialog(WHATS_NEW.version, body, lang);
}

function _showWhatsNewDialog(version, body, lang) {
  const isPremium = !!localStorage.getItem(DONOR_CODE_KEY);
  const title    = lang === "en" ? `What's New in v${version}` : `Neu in Version ${version}`;
  const btnLabel = lang === "en" ? "Got it" : "Verstanden";
  const premiumBadge = isPremium
    ? `<span style="display:inline-block;background:#67e8f9;color:#06111f;font-size:10px;
                   font-weight:800;padding:2px 8px;border-radius:4px;letter-spacing:.05em;
                   margin-left:8px;vertical-align:middle">PREMIUM</span>`
    : "";
  const dlg = document.createElement("dialog");
  dlg.className = "dialog";
  dlg.style.cssText = "max-width:500px;padding:32px;";
  dlg.innerHTML = `
    <div style="margin-bottom:18px">
      <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
                  color:rgba(207,250,254,.6);margin-bottom:6px">
        Studio Gear Manager v${_escHtml(version)}${premiumBadge}
      </div>
      <h3 style="margin:0;font-size:22px;letter-spacing:-.03em">${_escHtml(title)}</h3>
    </div>
    <div style="white-space:pre-wrap;line-height:1.75;color:#cbd5e1;font-size:14px;
                margin-bottom:24px;max-height:60vh;overflow-y:auto">
      ${_escHtml(body)}
    </div>
    <button class="btn btn-primary" style="width:100%"
      onclick="this.closest('dialog').close()">${_escHtml(btnLabel)}</button>
  `;
  document.body.appendChild(dlg);
  dlg.addEventListener("close", () => {
    localStorage.setItem(WHATS_NEW_KEY, WHATS_NEW.version);
    dlg.remove();
  });
  dlg.showModal();
}

function _escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}