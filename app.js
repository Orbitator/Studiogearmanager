const STORAGE_KEY = "studioGearManager.devices.v1";
const VISITOR_UUID_KEY  = "studioGearManager.visitorId.v1";
const WISHLIST_KEY = "studioGearManager.wishlist.v1";
const LANG_KEY = "studioGearManager.lang.v1";
const SETUP_KEY = "studioGearManager.setupDone.v1";
const LAST_BACKUP_KEY   = "studioGearManager.lastBackup.v1";
const APP_VERSION       = "1.0.6";
const FREE_DEVICE_LIMIT = 25; // Free-Version: max. Geräte (0 = unbegrenzt)
const PRO_SHOP_URL      = ""; // Link zum Pro-Kauf (z. B. LemonSqueezy). Leer = Bestellformular in der App.
const PRO_PRICE         = 19; // Preis der Pro-Version in Euro (Anzeige im Bestellformular)
const ORDER_EMAIL       = "holodeckmusicproject@gmail.com"; // Fallback per E-Mail, wenn order.php nicht erreichbar ist

// ── What's New ──
// Generiert: 7.5.2026, 13:55:44
// Version: 1.0.4
const WHATS_NEW = {
  version: "1.0.6",
  notes: {
    de: {
      free: `Neu in dieser Version:

Fehlerbehebung
- Setup-Dialoge werden nicht mehr abgeschnitten (alle Tabs, auch auf Handy und Tablet)
- Versionsnummer steht jetzt klein hinter dem Titel
- Bild-Links gehen beim Bearbeiten nicht mehr verloren
- Bewertungen springen nach dem Neuladen nicht mehr zurück
- Notizen-Tab richtig beschriftet, Pfeiltasten blättern in der Bildvorschau nur die Bilder
- Handy- und Listenansicht nicht mehr in feste Spalten gezwängt

Optimierung
- Listenansicht: Scrollleiste immer unten im Fenster, Kopfzeile bleibt stehen
- Gerätekarten: Logo über dem Namen, lange Namen zweizeilig
- Links aus der Wunschliste bleiben klickbar
- Kategorien umbenennen, zusammenführen, entfernen (Setup → Kategorien)

Neue Funktionen
- Gerät duplizieren
- Miniaturbild in der Liste mit Vorschau
- Links bei Geräten (Name | URL)
- Als verkauft markieren & zurück auf die Wunschliste
- Neues Feld „Bauform"`,
      pro: `Exklusiv in Pro:

- Eigene Felder (Setup → Eigene Felder)
- Spaltenbreiten in der Liste ziehen, Doppelklick passt automatisch an
- Logo-Position wählbar
- Kategorien in eigener Reihenfolge`,
    },
    en: {
      free: `New in this version:

Bug fixes
- Setup dialogs are no longer cut off (all tabs, also on phone and tablet)
- Version number now shown next to the title
- Image links are no longer lost when editing
- Ratings no longer jump back after reloading
- Notes tab labelled correctly, arrow keys in the image viewer only browse images
- Mobile and list view no longer forced into fixed columns

Improvements
- List view: scrollbar always at the bottom of the window, sticky header
- Device cards: logo above the name, long names wrap to two lines
- Links from the wishlist stay clickable
- Rename, merge and remove categories (Setup → Categories)

New features
- Duplicate device
- Thumbnail in list view with preview
- Links for devices (Name | URL)
- Mark as sold & add back to the wishlist
- New field "Form factor"`,
      pro: `Pro exclusive:

- Custom fields (Setup → Custom fields)
- Drag list column widths, double-click to auto-fit
- Selectable logo position
- Custom category order`,
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
const THEME_KEY = "studioGearManager.theme.v1";
const VIEW_SETTINGS_KEY = "studioGearManager.viewSettings.v1";
const LOG_KEY = "studioGearManager.logs.v1";
const VIEW_KEY = "studioGearManager.currentView.v1";
const LABELS_KEY = "studioGearManager.labels.v1";
const SORT_WORDS_KEY    = "studioGearManager.sortWords.v1";
const SORT_CRITERIA_KEY = "studioGearManager.sortCriteria.v1";
const NAG_DISMISSED_KEY = "studioGearManager.nagDismissed.v1";
const NAG_DONATED_KEY   = "studioGearManager.nagDonated.v1";
const DONOR_CODE_KEY    = "studioGearManager.donorCode.v1";
const LICENSE_KEY       = "studioGearManager.licenseCode.v1";
const CUSTOM_FIELDS_KEY  = "studioGearManager.customFields.v1";   // Pro: eigene Felder
const CATEGORY_ORDER_KEY = "studioGearManager.categoryOrder.v1";  // Pro: Reihenfolge der Kategorie-Chips
const HIDE_SOLD_KEY      = "studioGearManager.hideSold.v1";       // Verkaufte Geräte ausblenden
const SOLD_STATUS        = "Verkauft";
const DEFAULT_FORM_FACTORS = ["Keyboard", "19\" Rack", "Desktop", "Eurorack", "Pedal", "Software"];
const DEFAULT_STATUSES     = ["Aktiv", "Defekt", "Verliehen", "Verkauft"];
const AUTO_BACKUP_TS_KEY = "studioGearManager.autoBackupTs.v1";
const AUTO_BACKUP_HANDLE_IDB_KEY = "autoBackupHandle";
// Vor Veröffentlichung ändern — dann neue Codes mit generateDonorCode(n) generieren
const DONOR_SECRET      = "SGM-v1-8f3a9c21-donor";
const LICENSE_SECRET    = "SGMP-v1-4e7b2d19-pro";

// === Spendenlink ===
const DONATION_URL = "https://www.paypal.com/donate/?hosted_button_id=EBGB8X7Y7AVKE";

// Nag-Intervall: zufällig zwischen 5 und 15 Minuten
const NAG_MIN_DELAY_MS = 10 * 60 * 1000;
const NAG_MAX_DELAY_MS = 30 * 60 * 1000;
// Nach Klick auf Spendenbutton 30 Tage Ruhe
const NAG_DONATED_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

// User-überschriebene Beschriftungen. t(key) prüft diese vor den i18n-Defaults.
let userLabels = (() => {
  try {
    const raw = localStorage.getItem(LABELS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) { return {}; }
})();

function saveUserLabels() {
  try {
    localStorage.setItem(LABELS_KEY, JSON.stringify(userLabels));
  } catch (error) {
    if (typeof Logger !== "undefined") Logger.error("storage", "Konnte userLabels nicht speichern", { error: String(error) });
  }
}

// ── Sortierwörter (Artikel / Präfixe, die beim Sortieren ignoriert werden) ──
const DEFAULT_SORT_WORDS = ["Der", "Die", "Das", "The", "A", "An", "Ein", "Eine"];
let sortIgnoreWords = (() => {
  try {
    const raw = localStorage.getItem(SORT_WORDS_KEY);
    if (!raw) return [...DEFAULT_SORT_WORDS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_SORT_WORDS];
  } catch (_) { return [...DEFAULT_SORT_WORDS]; }
})();

function saveSortWords() {
  try {
    localStorage.setItem(SORT_WORDS_KEY, JSON.stringify(sortIgnoreWords));
  } catch (error) {
    if (typeof Logger !== "undefined") Logger.error("storage", "Konnte sortWords nicht speichern", { error: String(error) });
  }
}

function stripSortPrefix(value) {
  const str = String(value || "").trim();
  for (const word of sortIgnoreWords) {
    const prefix = word.trim();
    if (!prefix) continue;
    const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
    if (re.test(str)) return str.replace(re, "").trim();
  }
  return str;
}

// ── Sortierkriterien-Sichtbarkeit ──
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
  { value: "formFactor",   i18nKey: "sortFieldFormFactor" },
];

let sortCriteriaVisible = (() => {
  try {
    const raw = localStorage.getItem(SORT_CRITERIA_KEY);
    if (!raw) return null; // null = alle sichtbar (Default)
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) { return null; }
})();

function saveSortCriteria() {
  try {
    localStorage.setItem(SORT_CRITERIA_KEY, JSON.stringify(sortCriteriaVisible));
  } catch (error) {
    if (typeof Logger !== "undefined") Logger.error("storage", "Konnte sortCriteria nicht speichern", { error: String(error) });
  }
}

function applySortCriteria() {
  const select = document.getElementById("sortFieldSelect");
  if (!select) return;
  let currentVisible = null;
  Array.from(select.options).forEach((opt) => {
    const visible = !sortCriteriaVisible || sortCriteriaVisible[opt.value] !== false;
    opt.hidden = !visible;
    if (visible && currentVisible === null) currentVisible = opt.value;
  });
  // Falls aktuell gewähltes Kriterium ausgeblendet, auf erstes sichtbares zurückfallen
  const currentOpt = select.querySelector(`option[value="${select.value}"]`);
  if (currentOpt && currentOpt.hidden) {
    select.value = currentVisible || "added";
    sortField = select.value;
  }
}

/* ============================================================
   Logger
   - In-Memory + localStorage Ring-Buffer (max 200 Einträge)
   - Levels: info | warn | error
   - Wird auch von window.onerror und unhandledrejection befüllt
   ============================================================ */
const LOG_LIMIT = 200;
const Logger = (function () {
  let entries = [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) entries = parsed.slice(-LOG_LIMIT);
    }
  } catch (_) {
    entries = [];
  }

  function persist() {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-LOG_LIMIT)));
    } catch (_) {
      // Wenn das Quota voll ist, nicht abstürzen — Logs sind sekundär.
    }
  }

  function add(level, category, message, details) {
    const entry = {
      ts: new Date().toISOString(),
      level: level || "info",
      category: category || "app",
      message: String(message || ""),
      details: details ?? null,
    };
    entries.push(entry);
    if (entries.length > LOG_LIMIT) entries = entries.slice(-LOG_LIMIT);
    persist();
    const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    try { consoleFn(`[${entry.category}]`, entry.message, entry.details ?? ""); } catch (_) {}
  }

  return {
    info: (cat, msg, det) => add("info", cat, msg, det),
    warn: (cat, msg, det) => add("warn", cat, msg, det),
    error: (cat, msg, det) => add("error", cat, msg, det),
    all: () => entries.slice(),
    clear: () => { entries = []; persist(); },
    export: () => JSON.stringify(entries, null, 2),
  };
})();

window.addEventListener("error", (event) => {
  Logger.error("window.error", event.message || "Unbekannter Fehler", {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  Logger.error("promise", "Unhandled promise rejection", {
    reason: String(event.reason),
    stack: event.reason?.stack,
  });
});

Logger.info("boot", "App-Skript geladen", {
  userAgent: navigator.userAgent,
  dialogSupported: typeof HTMLDialogElement !== "undefined" && typeof HTMLDialogElement.prototype.showModal === "function",
  indexedDBSupported: typeof indexedDB !== "undefined",
});

/* ============================================================
   IndexedDB-Schicht
   - Eine DB "studioGearManager", ein Store "keyValue" (keyPath: "key")
   - Async Promise-API; Fallback auf localStorage, falls IDB nicht verfügbar
   ============================================================ */
const DB_NAME = "studioGearManager";
const DB_VERSION = 1;
const DB_STORE = "keyValue";
const DB_DEVICES_KEY = "devices";
const DB_WISHLIST_KEY = "wishlist";

let _db = null;
let _dbAvailable = false;

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB nicht verfügbar"));
      return;
    }
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open fehlgeschlagen"));
    req.onblocked = () => Logger.warn("db", "IndexedDB-Open blockiert (anderer Tab offen?)");
  });
}

function dbGet(key) {
  return new Promise((resolve, reject) => {
    if (!_db) { resolve(null); return; }
    const tx = _db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(key, value) {
  return new Promise((resolve, reject) => {
    if (!_db) { reject(new Error("DB nicht initialisiert")); return; }
    const tx = _db.transaction(DB_STORE, "readwrite");
    const req = tx.objectStore(DB_STORE).put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

async function migrateLocalStorageToDB() {
  // Beim ersten erfolgreichen IndexedDB-Boot bestehende localStorage-Daten übernehmen.
  // localStorage-Daten bleiben als Sicherheitsnetz erstmal erhalten.
  let migratedDevices = false;
  let migratedWishlist = false;

  const idbDevices = await dbGet(DB_DEVICES_KEY);
  if (idbDevices === null) {
    const lsDevicesRaw = localStorage.getItem(STORAGE_KEY);
    if (lsDevicesRaw) {
      try {
        const parsed = JSON.parse(lsDevicesRaw);
        if (Array.isArray(parsed)) {
          await dbPut(DB_DEVICES_KEY, parsed);
          migratedDevices = true;
          Logger.info("db.migration", `Geräte migriert (${parsed.length} Einträge)`);
        }
      } catch (error) {
        Logger.warn("db.migration", "Konnte alte Geräte-Daten nicht migrieren", { error: String(error) });
      }
    }
  }

  const idbWishlist = await dbGet(DB_WISHLIST_KEY);
  if (idbWishlist === null) {
    const lsWishlistRaw = localStorage.getItem(WISHLIST_KEY);
    if (lsWishlistRaw) {
      try {
        const parsed = JSON.parse(lsWishlistRaw);
        if (Array.isArray(parsed)) {
          await dbPut(DB_WISHLIST_KEY, parsed);
          migratedWishlist = true;
          Logger.info("db.migration", `Wishlist migriert (${parsed.length} Einträge)`);
        }
      } catch (error) {
        Logger.warn("db.migration", "Konnte alte Wishlist nicht migrieren", { error: String(error) });
      }
    }
  }

  return { migratedDevices, migratedWishlist };
}

async function cleanupRedundantLocalStorage() {
  // Wenn IndexedDB die Daten erfolgreich enthält, kann die alte localStorage-Kopie weg.
  // Das befreit das knappe localStorage-Quota für kleine Schlüssel (Sprache, View, Nag).
  try {
    const idbDevices = await dbGet(DB_DEVICES_KEY);
    if (Array.isArray(idbDevices) && localStorage.getItem(STORAGE_KEY) !== null) {
      localStorage.removeItem(STORAGE_KEY);
      Logger.info("db.cleanup", "Redundante localStorage-Geräte entfernt — Quota befreit");
    }
  } catch (error) {
    Logger.warn("db.cleanup", "Cleanup devices fehlgeschlagen", { error: String(error) });
  }
  try {
    const idbWishlist = await dbGet(DB_WISHLIST_KEY);
    if (Array.isArray(idbWishlist) && localStorage.getItem(WISHLIST_KEY) !== null) {
      localStorage.removeItem(WISHLIST_KEY);
      Logger.info("db.cleanup", "Redundante localStorage-Wishlist entfernt — Quota befreit");
    }
  } catch (error) {
    Logger.warn("db.cleanup", "Cleanup wishlist fehlgeschlagen", { error: String(error) });
  }
}

async function initDataLayer() {
  try {
    _db = await openIndexedDB();
    _dbAvailable = true;
    Logger.info("db", "IndexedDB geöffnet");
    await migrateLocalStorageToDB();
    await cleanupRedundantLocalStorage();
  } catch (error) {
    _db = null;
    _dbAvailable = false;
    Logger.error("db", "IndexedDB nicht verfügbar — Fallback auf localStorage", { error: String(error) });
    showAppError("Hinweis: Browser-Datenbank (IndexedDB) ist nicht verfügbar. Es wird auf den begrenzten localStorage zurückgegriffen. Daten werden nach 5–10 MB nicht mehr gespeichert.");
  }
}

const i18n = {
  de: {

    localEdition: "Local Browser Edition",
    startupTitle: "Willkommen im Studio Gear Manager",
    startupText: "Diese App läuft lokal in deinem Browser. Deine Daten werden nicht auf einen Server übertragen, sondern im Browser gespeichert. Exportiere regelmäßig ein Backup als JSON.",
    startDemo: "Demo-Daten laden",
    startEmpty: "Leere Bibliothek starten",
    importBackup: "Backup importieren",
    startupLicenseTitle: "⭐ Pro-Lizenz vorhanden?",
    startupLicenseHint: "Gib deinen Lizenzcode ein, um direkt mit allen Pro-Funktionen zu starten.",
    backupReminderTitle: "Lokale Speicherung aktiv",
    backupReminderText: "Die Daten liegen nur in diesem Browser. Bitte regelmäßig ein JSON-Backup exportieren.",
    backupNow: "Backup exportieren",
    autoBackupTitle: "Auto-Backup",
    autoBackupHint: "Schreibt nach jeder Änderung automatisch eine Sicherungskopie in eine Datei deiner Wahl — auch über Updates hinweg.",
    autoBackupSetup: "📂 Backup-Datei wählen…",
    autoBackupDisable: "✕ Deaktivieren",
    exportCsv: "Export CSV",
    sortLabel: "Sort",
    sortAddedDesc: "Recently added",
    sortNameAsc: "Alphabetically A–Z",
    sortRatingDesc: "Rating descending",
    sortPriceDesc: "Price descending",
    sortYearDesc: "Purchase year newest",
    sortLabel: "Sortieren",
    sortFieldAdded: "Hinzugefügt",
    sortFieldName: "Alphabetisch",
    sortFieldManufacturer: "Hersteller",
    sortFieldMidiChannel: "MIDI-Kanal",
    switchToList: "Listenansicht",
    switchToGrid: "Grid-Ansicht",
    sortFieldRating: "Rating",
    sortFieldPrice: "Preis",
    sortFieldYear: "Anschaffungsjahr",
    sortAsc: "Aufsteigend",
    sortDesc: "Absteigend",
    sortAddedDesc: "Zuletzt hinzugefügt",
    sortNameAsc: "Alphabetisch A–Z",
    sortRatingDesc: "Rating absteigend",
    sortPriceDesc: "Preis absteigend",
    sortYearDesc: "Anschaffungsjahr neueste",
    printDevice: "Gerätepass drucken",
    removeImage: "Bild entfernen",
    settingsTitle: "Setup",
    settingsIntro: "Hier passt du Farben, Ansichten, Kategorien, Felder und Beschriftungen an. Alles wird lokal in diesem Browser gespeichert.",
    settingsTabColors: "Farben",
    settingsTabViews: "Ansichten definieren",
    settingsTabLabels: "Beschriftungen",
    settingsTabLogs: "Logs",
    labelsHelp: "Beschriftungen, Datenfeld-Labels und Button-Texte können hier individuell überschrieben werden. Leeres Feld = Standardtext der gewählten Sprache.",
    labelsGroupButtons: "Buttons & Aktionen",
    labelsGroupFields: "Datenfelder",
    labelsGroupSections: "Sektionstitel & Dialoge",
    labelsGroupStats: "Statistiken",
    labelsGroupOther: "Sonstige UI-Texte",
    resetUserLabels: "Alle Beschriftungen zurücksetzen",
    confirmResetLabels: "Wirklich alle individuellen Beschriftungen zurücksetzen?",
    exportLogs: "Logs als JSON exportieren",
    clearLogs: "Logs löschen",
    logsCount: "Einträge",
    logsEmpty: "Noch keine Log-Einträge.",
    confirmClearLogs: "Alle Log-Einträge löschen?",
    gridViewFields: "Grid-Ansicht",
    gridViewFieldsHelp: "Wähle die Felder, die auf den Gerätekarten angezeigt werden sollen.",
    listViewFields: "Listenansicht",
    listViewFieldsHelp: "Wähle die Spalten, die in der Listenansicht angezeigt werden sollen.",
    resetViewSettings: "Ansichten zurücksetzen",
    sortWordsTitle: "Sortierwörter",
    sortWordsHelp: "Wörter (z. B. Artikel), die beim Sortieren nach Name/Hersteller ignoriert werden. Kommagetrennt eingeben.",
    sortWordsReset: "Zurücksetzen",
    sortCriteriaTitle: "Sortierkriterien",
    sortCriteriaHelp: "Wähle, welche Sortieroptionen in der Auswahlliste erscheinen sollen.",
    gridColumnsTitle: "Karten pro Zeile",
    gridColumnsHelp: "Anzahl der Gerätekarten pro Zeile im Grid (2–5). Nur Pro.",
    gridColumnsProHint: "⭐ Pro-Funktion — Lizenz erforderlich",
    fieldLogo: "Hersteller-Logo",
    fieldName: "Gerätename",
    fieldManufacturer: "Hersteller",
    fieldModel: "Modell",
    fieldType: "Gerätetyp",
    fieldSubcategory: "Subkategorie",
    fieldPurchasePrice: "Anschaffungspreis",
    fieldMarketValue: "Marktwert",
    fieldMidiChannel: "MIDI-Kanal",
    fieldStatus: "Status",
    fieldPower: "Stromdaten",
    fieldRating: "Rating",
    fieldLocation: "Standort",
    fieldDeviceImage: "Gerätebild",
    fieldManufacturerLogo: "Hersteller-Logo",
    fieldDeviceName: "Gerätename",
    fieldManufacturer: "Hersteller",
    fieldModel: "Modell",
    fieldSerialNumber: "Seriennummer",
    fieldFirmwareVersion: "Firmware Version",
    fieldDeviceType: "Gerätetyp",
    fieldSubcategory: "Subkategorie",
    fieldStatus: "Status",
    fieldCondition: "Zustand",
    fieldLocation: "Standort",
    fieldPurchaseYear: "Kaufjahr",
    fieldPurchasePrice: "Anschaffungspreis",
    fieldWarrantyUntil: "Garantie bis",
    fieldMarketMin: "Marktwert min.",
    fieldMarketMax: "Marktwert max.",
    fieldMarketMedian: "Marktwert Median",
    fieldLastChecked: "Letzte Prüfung",
    fieldAudioOutputs: "Audio-Ausgänge",
    fieldAudioInputs: "Audio-Eingänge",
    fieldConnector: "Anschlussart",
    fieldLevel: "Pegel",
    fieldMidiIn: "MIDI In",
    fieldMidiOut: "MIDI Out",
    fieldMidiThru: "MIDI Thru",
    fieldUsbMidi: "USB-MIDI",
    fieldMidiChannel: "MIDI-Kanal",
    fieldProgramChange: "Program Change",
    fieldMsb: "MSB",
    fieldLsb: "LSB",
    fieldPowerData: "Stromdaten",
    fieldPsu: "Netzteil",
    fieldPowerConnector: "Stromanschluss",
    fieldVoltage: "Spannung",
    fieldNotes: "Notizen",
    fieldDocuments: "Dokumente",
    fieldRating: "Rating",
    resetColors: "Farben zurücksetzen",
    sectionGeneral: "Allgemein",
    sectionPurchase: "Anschaffung & Wert",
    sectionAudioMidi: "Audio & MIDI",
    sectionPowerDocs: "Strom & Dokumente",
    colorBackgroundA: "Hintergrund 1",
    colorBackgroundB: "Hintergrund 2",
    colorPanel: "Karten dunkel",
    colorText: "Schrift hell",
    colorMuted: "Sekundärschrift",
    colorAccent: "Akzentfarbe",
    colorButtonBg: "Button-Hintergrund",
    colorButtonText: "Button-Schrift",
    colorCardBg: "Gerätekarten",
    colorCardText: "Gerätekarten-Schrift",
    colorDetailBg: "Detail-Hintergrund",
    colorStar: "Sterne",
    settingsSectionSurface: "Oberfläche",
    settingsSectionButtons: "Buttons einzeln",
    colorBgShort: "BG",
    colorTextShort: "Text",
    btnThemeLanguage: "Sprache",
    btnThemeSetup: "Setup",
    btnThemeAdd: "Gerät hinzufügen",
    btnThemeBackup: "Backup exportieren",
    btnThemeCsv: "Export CSV",
    btnThemeImport: "Import JSON",
    btnThemeSortUp: "Sortierung ↑",
    btnThemeSortDown: "Sortierung ↓",
    btnThemeEdit: "Gerät bearbeiten",
    btnThemePrint: "Gerätepass drucken",
    btnThemeRemoveImage: "Bild entfernen",
    btnThemeDelete: "Gerät löschen",
    btnThemeDialogCancel: "Dialog Abbrechen",
    btnThemeDialogSave: "Dialog Speichern",
    btnThemeResetColors: "Farben zurücksetzen",
    btnThemeSettingsCancel: "Setup Abbrechen",
    btnThemeSettingsSave: "Setup Speichern",
    btnThemeViewToggle: "View-Toggle (inaktiv)",
    btnThemeViewToggleActive: "View-Toggle (aktiv)",
    btnThemeAddWishlist: "Wunsch hinzufügen",
    btnThemeMoveToLibrary: "In Bibliothek übernehmen",
    btnThemeEditWishlist: "Wunsch bearbeiten",
    btnThemeDeleteWishlist: "Wunsch löschen",
    settingsSectionWishlist: "Buttons Wunschliste",
    lastBackupNever: "Noch kein Backup exportiert.",
    lastBackupAt: "Letztes Backup:",
    confirmRemoveImage: "Bild dieses Geräts entfernen?",
    rating: "Bewertung",
    starsOutOfFive: "von 5 Sternen",
    eyebrow: "HOLODECK MUSIC · Studio Gear Library",
    appTitle: "Studio Gear Manager",
    subtitle: "Visuelle Bibliothek für Synthesizer, Effektgeräte, MIDI-Hardware, Zubehör, Dokumente, Marktwerte und technische Gerätedaten.",
    addDevice: "Gerät hinzufügen",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    statDevices: "Geräte",
    statValue: "Akt. Gesamtwert",
    statDocs: "Wunschliste",
    statIssues: "Mängel",
    emptyState: "Keine Geräte gefunden.",
    backToGallery: "Zurück",
    devicePassport: "Gerätepass / Datenmaske",
    noImage: "Kein Bild verfügbar",
    searchImage: "Bild suchen",
    ownImage: "Eigenes Bild",
    addImage: "Weiteres Bild",
    freeLimitTitle: "Geräte-Limit erreicht",
    freeLimitText: "Die kostenlose Version erlaubt maximal {n} Geräte.",
    freeLimitUpgrade: "Zur Pro-Version upgraden",
    freeLimitClose: "Verstanden",
    freeLimitEnterLicense: "Lizenz eingeben",
    buyPro: "Pro-Version kaufen",
    proOrderTitle: "Pro-Version bestellen",
    proOrderIntro: "Trag deinen Namen und deine E-Mail-Adresse ein. Du bekommst die Zahlungsinformationen per E-Mail und nach Zahlungseingang deinen persönlichen Lizenzcode.",
    proOrderFeat1: "Unbegrenzt viele Geräte",
    proOrderFeat2: "Eigene Felder, Spaltenbreiten, Logo-Position",
    proOrderFeat3: "Mehrere Bilder pro Gerät mit Galerie",
    proOrderFeat4: "Alle Pro-Updates der nächsten 12 Monate",
    proOrderName: "Name",
    proOrderEmail: "E-Mail-Adresse",
    proOrderAccept: "Für {price} kaufen",
    proOrderNote: "Deine Angaben werden nur zur Abwicklung der Bestellung und zum Versand des Lizenzcodes verwendet.",
    proOrderSubmit: "Zahlungspflichtig bestellen",
    proOrderSending: "Bestellung wird gesendet …",
    proOrderErrName: "Bitte deinen Namen eintragen.",
    proOrderErrEmail: "Bitte eine gültige E-Mail-Adresse eintragen.",
    proOrderErrAccept: "Bitte das Kästchen „Für {price} kaufen“ ankreuzen.",
    proOrderErrRate: "Zu viele Bestellungen in kurzer Zeit. Bitte später noch einmal versuchen.",
    proOrderThanksTitle: "Danke für deine Bestellung!",
    proOrderThanksText: "Wir melden uns in Kürze an {email} mit den Zahlungsinformationen. Nach Zahlungseingang erhältst du deinen Lizenzcode — einzugeben unter Setup → Lizenz.",
    proOrderMailFallback: "Dein E-Mail-Programm wurde mit der Bestellung geöffnet. Bitte die E-Mail absenden. Falls sich nichts geöffnet hat: Bitte Name und E-Mail an {mail} schicken.",
    licenseStoreFailed: "✗ Lizenz gültig, konnte aber nicht gespeichert werden. Browser-Speicher voll oder privates Fenster? Bitte ein Backup exportieren, Platz schaffen und erneut versuchen.",
    sortFieldFormFactor: "Bauform",
    fieldFormFactor: "Bauform",
    formFactor: "Bauform",
    yes: "Ja",
    delete: "Löschen",
    links: "Links",
    linksHint: "Eine Zeile pro Link: Name | https://… (Name optional)",
    copySuffix: "(Kopie)",
    duplicateDevice: "Duplizieren",
    toWishlist: "Auf Wunschliste setzen",
    markSold: "Als verkauft markieren",
    markActive: "Wieder aktiv",
    hideSold: "Verkaufte ausblenden",
    showSold: "Verkaufte anzeigen",
    confirmToWishlist: "Dieses Gerät auf die Wunschliste setzen? Hersteller, Modell, Bild, Logo und Links werden übernommen.",
    confirmAlsoMarkSold: "Gerät zusätzlich als „Verkauft“ markieren?",
    toastAddedToWishlist: "Auf die Wunschliste gesetzt ✓",
    colResizeHint: "Ziehen: Breite ändern · Doppelklick: automatisch anpassen",
    settingsTabCategories: "Kategorien",
    settingsTabCustomFields: "Eigene Felder",
    categoriesTitle: "Kategorien verwalten",
    categoriesHelp: "Umbenennen ändert alle betroffenen Geräte. Gleicher Name wie eine bestehende Kategorie = zusammenführen. ✕ entfernt die Kategorie von allen Geräten.",
    categoryOrderProHint: "⭐ Eigene Reihenfolge der Kategorien ist eine Pro-Funktion — ohne Pro alphabetisch.",
    categoryRemove: "Kategorie entfernen",
    categoryMergeConfirm: "„{from}“ mit „{to}“ zusammenführen? Alle Geräte erhalten die Kategorie „{to}“.",
    categoryRemoveConfirm: "Kategorie „{name}“ von allen Geräten entfernen? Die Geräte selbst bleiben erhalten.",
    customFieldsTitle: "Eigene Felder",
    customFieldsHelp: "Eigene Felder mit selbst gewählter Bezeichnung und Feldtyp. Reihenfolge per ↑/↓, Abschnitt bestimmt die Position im Formular. Anzeige in Grid/Liste unter „Ansichten definieren“.",
    customFieldsProHint: "⭐ Eigene Felder sind eine Pro-Funktion. Bereits erfasste Werte bleiben ohne Lizenz erhalten.",
    customFieldsEmpty: "Noch keine eigenen Felder angelegt.",
    customFieldBadge: "eigen",
    customFieldLabelPh: "Bezeichnung, z. B. Rack-Position",
    customFieldOptionsPh: "Auswahlwerte, kommagetrennt",
    customFieldDeleteConfirm: "Feld „{name}“ löschen? Bereits erfasste Werte bleiben in den Geräten gespeichert.",
    addCustomField: "+ Feld hinzufügen",
    cfType_text: "Text",
    cfType_number: "Zahl",
    cfType_date: "Datum",
    cfType_checkbox: "Ja/Nein",
    cfType_select: "Auswahl",
    cfType_url: "Link",
    proViewTitle: "Darstellung",
    proViewHelp: "Position des Hersteller-Logos auf den Gerätekarten und Spaltenbreiten der Listenansicht.",
    proViewHint: "⭐ Pro-Funktion — Lizenz erforderlich",
    logoPositionTitle: "Logo-Position",
    logoAbove: "Über dem Gerätenamen",
    logoInline: "Neben dem Gerätenamen",
    resetColWidths: "Spaltenbreiten zurücksetzen",
    location: "Standort",
    status: "Status",
    condition: "Zustand",
    currentMarketValue: "Aktueller Marktwert",
    editDevice: "Gerät bearbeiten",
    deleteDevice: "Gerät löschen",
    dialogTitleAdd: "Gerät hinzufügen",
    dialogTitleEdit: "Gerät bearbeiten",
    cancel: "Abbrechen",
    save: "Speichern",
    name: "Name",
    manufacturer: "Hersteller",
    manufacturerLogo: "Hersteller Logo",
    model: "Modell",
    serialNumber: "Seriennummer",
    firmwareVersion: "Firmware Version",
    category: "Kategorie",
    type: "Gerätetyp",
    subcategory: "Subkategorie",
    subcategoryFilterLabel: "Subkategorie",
    allSubcategories: "Alle Subkategorien",
    imageUrl: "Bild-URL",
    purchaseYear: "Kaufjahr",
    purchasePrice: "Anschaffungspreis",
    warranty: "Garantie",
    warrantyUntil: "Garantie bis",
    marketMin: "Marktwert min.",
    marketMax: "Marktwert max.",
    marketMedian: "Marktwert Median",
    lastChecked: "Letzte Prüfung",
    confidence: "Vertrauen",
    audioOutputs: "Audio-Ausgänge",
    audioInputs: "Audio-Eingänge",
    connector: "Anschlussart",
    level: "Pegel",
    midiIn: "MIDI In",
    midiOut: "MIDI Out",
    midiThru: "MIDI Thru",
    usbMidi: "USB-MIDI",
    midiChannel: "MIDI-Kanal",
    programChange: "Program Change",
    powerData: "Stromdaten",
    psu: "Netzteil",
    powerConnector: "Stromanschluss",
    voltage: "Spannung",
    notes: "Notizen",
    documentsHint: "Dokumente als Liste, eine Zeile pro Dokument: Name | Typ | Link",
    tabs: ["Übersicht", "Audio", "MIDI", "Strom", "Wert", "Dokumente", "Notizen"],
    all: "Alle",
    searchPlaceholder: "Gerät, Hersteller, MIDI-Kanal, Standort, Notiz oder Dokument suchen …",
    purchase: "Kauf",
    value: "Wert",
    issueDocumented: "Mängel dokumentiert",
    audio: "Audio",
    power: "Strom",
    documents: "Dokumente",
    documentName: "Dokumentname",
    documentFile: "Datei auswählen",
    addDocument: "Dokument hinzufügen",
    documentsAttachmentHint: "Dokumente lokal als Anhang hinzufügen.",
    removeDocument: "Entfernen",
    openDocument: "Öffnen",
    documentTooLarge: "Die Datei ist sehr groß. Browser-Speicher kann begrenzt sein.",
    documentNeedsNameAndFile: "Bitte Dokumentname und Datei auswählen.",
    marketRange: "Automatische Spanne",
    median: "Median",
    marketToolsTitle: "Online-Marktpreis recherchieren",
    marketToolsText: "Diese Version öffnet vorbereitete Suchanfragen. Eine echte automatische Preisermittlung benötigt später API-Zugänge, z. B. eBay oder Reverb.",
    searchReverb: "Reverb suchen",
    searchEbay: "eBay suchen",
    searchImagesGoogle: "Google Bilder",
    searchImagesBing: "Bing Bilder",
    open: "Öffnen",
    attachDocument: "Dokument anhängen",
    confirmDelete: "Dieses Gerät wirklich löschen?",
    importError: "Die JSON-Datei konnte nicht gelesen werden.",
    viewLibrary: "Bibliothek",
    viewWishlist: "Wunschliste",
    addWishlistItem: "Wunsch hinzufügen",
    wishlistTitle: "Wunschliste",
    wishlistIntro: "Geräte, die du gern kaufen möchtest. Erfasse Hersteller, Modell, Preise und Angebotslinks. Ein Klick übernimmt das Gerät beim Kauf in deine Bibliothek.",
    wishlistEmpty: "Noch keine Wünsche erfasst.",
    wishlistDialogTitleAdd: "Wunsch hinzufügen",
    wishlistDialogTitleEdit: "Wunsch bearbeiten",
    sectionWishlistPricing: "Preise & Links",
    priceNew: "Neupreis",
    priceUsed: "Gebrauchtpreis",
    wishlistLinks: "Links (eine URL pro Zeile)",
    moveToLibrary: "In Bibliothek übernehmen",
    confirmMoveToLibrary: "Gerät jetzt aus der Wunschliste in die Bibliothek übernehmen?",
    confirmDeleteWishlist: "Diesen Wunsch wirklich löschen?",
    editWishlist: "Bearbeiten",
    deleteWishlist: "Löschen",
    openLink: "Link öffnen",
    wishlistSearchEmpty: "Bitte zuerst Hersteller oder Modell eingeben.",
    wishlistSearchPlaceholder: "Wunsch suchen …",
    wishlistStatCount: "Wünsche",
    wishlistStatBudget: "Gesamtbudget (gebraucht)",
    wishlistStatBudgetNew: "Gesamtbudget (neu)",
    wishlistStatLinks: "Links",
    sortFieldModel: "Modell",
    sortFieldPriceNew: "Neupreis",
    sortFieldPriceUsed: "Gebrauchtpreis",
    prevDevice: "Vorheriges Gerät",
    nextDevice: "Nächstes Gerät",
    nagTitle: "Hilft dir die App?",
    nagText: "Wenn ja, freu ich mich riesig über einen kleinen Beitrag. ❤️",
    nagDonate: "Ein Latte Macciato ausgeben? ;-)",
    nagLater: "Vielleicht später",
    testNag: "Spendenhinweis jetzt testen",
    resetNag: "Spendenhinweis-Sperre zurücksetzen",
    nagResetConfirm: "Sperre aufgehoben — der Hinweis erscheint demnächst wieder.",
    settingsTabBackup: "Extras",
    settingsTabLicense: "Lizenz",
    donorCodeTitle: "Spenden-Code einlösen",
    donorCodeHelp: "Nach deiner Spende erhältst du per E-Mail einen persönlichen Code. Gib ihn hier ein, um den Spendenhinweis dauerhaft auszublenden.",
    donorCodePlaceholder: "SGM-XXXX-XXXX-XXXX",
    donorCodeRedeem: "Code anwenden",
    donorCodeRevoke: "Code entfernen",
    donorCodeSuccess: "Vielen Dank für Deine Spende! 🎉",
    donorCodeInvalid: "✗ Ungültiger Code. Bitte prüfe die Eingabe.",
    donorCodeActive: "Premium-User",
    donorCodeRevokeConfirm: "Spenden-Code entfernen? Der Spendenhinweis erscheint dann wieder.",
    licenseTitle: "Pro-Lizenz",
    licenseHelp: "Gib deinen Lizenzcode ein, um die Pro-Funktionen freizuschalten.",
    licenseCodePlaceholder: "SGMP-XXXX-XXXX-XXXX",
    licenseCodeRedeem: "Lizenz aktivieren",
    licenseCodeRevoke: "Lizenz entfernen",
    licenseCodeSuccess: "✓ Pro-Lizenz aktiv — alle Funktionen freigeschaltet.",
    licenseCodeInvalid: "✗ Ungültiger Lizenzcode. Bitte prüfe die Eingabe.",
    licenseActive: "✓ Pro-Version aktiv",
    licenseInactive: "Free-Version",
    licenseRevokeConfirm: "Lizenz entfernen? Pro-Funktionen werden deaktiviert.",
    sortFieldType: "Gerätetyp",
    sortFieldSubcategory: "Subkategorie",
    sortFieldPurchaseDate: "Kaufdatum",
    categoryViewChips: "Als Schaltflächen",
    categoryViewDropdown: "Als Auswahlliste",
  },
  en: {

    localEdition: "Local Browser Edition",
    startupTitle: "Welcome to Studio Gear Manager",
    startupText: "This app runs locally in your browser. Your data is not transferred to a server; it is stored in this browser. Export a JSON backup regularly.",
    startDemo: "Load demo data",
    startEmpty: "Start empty library",
    importBackup: "Import backup",
    startupLicenseTitle: "⭐ Have a Pro license?",
    startupLicenseHint: "Enter your license code to start with all Pro features unlocked.",
    backupReminderTitle: "Local storage active",
    backupReminderText: "The data only exists in this browser. Please export a JSON backup regularly.",
    backupNow: "Export backup",
    autoBackupTitle: "Auto-Backup",
    autoBackupHint: "Automatically writes a backup file after every change — persists across app updates.",
    autoBackupSetup: "📂 Choose backup file…",
    autoBackupDisable: "✕ Disable",
    exportCsv: "Export CSV",
    sortLabel: "Sortieren",
    sortAddedDesc: "Zuletzt hinzugefügt",
    sortNameAsc: "Alphabetisch A–Z",
    sortRatingDesc: "Rating absteigend",
    sortPriceDesc: "Preis absteigend",
    sortYearDesc: "Anschaffungsjahr neueste",
    printDevice: "Print device passport",
    removeImage: "Remove image",
    settingsTitle: "Setup",
    settingsIntro: "Adjust colors, views, categories, fields and labels here. Everything is stored locally in this browser.",
    settingsTabColors: "Colors",
    settingsTabViews: "Define views",
    settingsTabLabels: "Labels",
    settingsTabLogs: "Logs",
    labelsHelp: "Customize all field labels, button texts and section titles here. Empty input = default text for the selected language.",
    labelsGroupButtons: "Buttons & actions",
    labelsGroupFields: "Data fields",
    labelsGroupSections: "Section titles & dialogs",
    labelsGroupStats: "Statistics",
    labelsGroupOther: "Other UI strings",
    resetUserLabels: "Reset all labels",
    confirmResetLabels: "Really reset all custom labels?",
    exportLogs: "Export logs as JSON",
    clearLogs: "Clear logs",
    logsCount: "entries",
    logsEmpty: "No log entries yet.",
    confirmClearLogs: "Clear all log entries?",
    gridViewFields: "Grid view",
    gridViewFieldsHelp: "Choose the fields shown on device cards.",
    listViewFields: "List view",
    listViewFieldsHelp: "Choose the columns shown in the list view.",
    resetViewSettings: "Reset views",
    sortWordsTitle: "Sort words",
    sortWordsHelp: "Words (e.g. articles) to ignore when sorting by name/manufacturer. Comma-separated.",
    sortWordsReset: "Reset",
    sortCriteriaTitle: "Sort criteria",
    sortCriteriaHelp: "Choose which sort options appear in the sort dropdown.",
    gridColumnsTitle: "Cards per row",
    gridColumnsHelp: "Number of device cards per row in grid view (2–5). Pro only.",
    gridColumnsProHint: "⭐ Pro feature — license required",
    fieldLogo: "Manufacturer logo",
    fieldName: "Device name",
    fieldManufacturer: "Manufacturer",
    fieldModel: "Model",
    fieldType: "Device type",
    fieldSubcategory: "Subcategory",
    fieldPurchasePrice: "Purchase price",
    fieldMarketValue: "Market value",
    fieldMidiChannel: "MIDI channel",
    fieldStatus: "Status",
    fieldPower: "Power data",
    fieldRating: "Rating",
    fieldLocation: "Location",
    fieldDeviceImage: "Device image",
    fieldManufacturerLogo: "Manufacturer logo",
    fieldDeviceName: "Device name",
    fieldManufacturer: "Manufacturer",
    fieldModel: "Model",
    fieldSerialNumber: "Serial number",
    fieldFirmwareVersion: "Firmware version",
    fieldDeviceType: "Device type",
    fieldSubcategory: "Subcategory",
    fieldStatus: "Status",
    fieldCondition: "Condition",
    fieldLocation: "Location",
    fieldPurchaseYear: "Purchase year",
    fieldPurchasePrice: "Purchase price",
    fieldWarrantyUntil: "Warranty until",
    fieldMarketMin: "Market value min.",
    fieldMarketMax: "Market value max.",
    fieldMarketMedian: "Market median",
    fieldLastChecked: "Last checked",
    fieldAudioOutputs: "Audio outputs",
    fieldAudioInputs: "Audio inputs",
    fieldConnector: "Connector type",
    fieldLevel: "Level",
    fieldMidiIn: "MIDI In",
    fieldMidiOut: "MIDI Out",
    fieldMidiThru: "MIDI Thru",
    fieldUsbMidi: "USB MIDI",
    fieldMidiChannel: "MIDI channel",
    fieldProgramChange: "Program Change",
    fieldMsb: "MSB",
    fieldLsb: "LSB",
    fieldPowerData: "Power data",
    fieldPsu: "Power supply",
    fieldPowerConnector: "Power connector",
    fieldVoltage: "Voltage",
    fieldNotes: "Notes",
    fieldDocuments: "Documents",
    fieldRating: "Rating",
    resetColors: "Reset colors",
    sectionGeneral: "General",
    sectionPurchase: "Purchase & value",
    sectionAudioMidi: "Audio & MIDI",
    sectionPowerDocs: "Power & documents",
    colorBackgroundA: "Background 1",
    colorBackgroundB: "Background 2",
    colorPanel: "Dark panels",
    colorText: "Light text",
    colorMuted: "Secondary text",
    colorAccent: "Accent color",
    colorButtonBg: "Button background",
    colorButtonText: "Button text",
    colorCardBg: "Device cards",
    colorCardText: "Device card text",
    colorDetailBg: "Detail background",
    colorStar: "Stars",
    settingsSectionSurface: "Surface",
    settingsSectionButtons: "Buttons individually",
    colorBgShort: "BG",
    colorTextShort: "Text",
    btnThemeLanguage: "Language",
    btnThemeSetup: "Setup",
    btnThemeAdd: "Add device",
    btnThemeBackup: "Export backup",
    btnThemeCsv: "Export CSV",
    btnThemeImport: "Import JSON",
    btnThemeSortUp: "Sort ↑",
    btnThemeSortDown: "Sort ↓",
    btnThemeEdit: "Edit device",
    btnThemePrint: "Print device sheet",
    btnThemeRemoveImage: "Remove image",
    btnThemeDelete: "Delete device",
    btnThemeDialogCancel: "Dialog cancel",
    btnThemeDialogSave: "Dialog save",
    btnThemeResetColors: "Reset colors",
    btnThemeSettingsCancel: "Setup cancel",
    btnThemeSettingsSave: "Setup save",
    btnThemeViewToggle: "View toggle (inactive)",
    btnThemeViewToggleActive: "View toggle (active)",
    btnThemeAddWishlist: "Add wish",
    btnThemeMoveToLibrary: "Move to library",
    btnThemeEditWishlist: "Edit wish",
    btnThemeDeleteWishlist: "Delete wish",
    settingsSectionWishlist: "Wishlist buttons",
    lastBackupNever: "No backup exported yet.",
    lastBackupAt: "Last backup:",
    confirmRemoveImage: "Remove this device image?",
    rating: "Rating",
    starsOutOfFive: "out of 5 stars",
    eyebrow: "HOLODECK MUSIC · Studio Gear Library",
    appTitle: "Studio Gear Manager",
    subtitle: "Visual library for synthesizers, effects, MIDI hardware, accessories, documents, market values and technical device data.",
    addDevice: "Add device",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    statDevices: "Devices",
    statValue: "Cur. total value",
    statDocs: "Wishlist",
    statIssues: "Issues",
    emptyState: "No devices found.",
    backToGallery: "Back",
    devicePassport: "Device passport / data sheet",
    noImage: "No image available",
    searchImage: "Search image",
    ownImage: "Own image",
    addImage: "Add Image",
    freeLimitTitle: "Device limit reached",
    freeLimitText: "The free version allows a maximum of {n} devices.",
    freeLimitUpgrade: "Upgrade to Pro",
    freeLimitClose: "Got it",
    freeLimitEnterLicense: "Enter license",
    buyPro: "Buy Pro version",
    proOrderTitle: "Order Pro version",
    proOrderIntro: "Enter your name and email address. You will receive the payment details by email and your personal license code once payment has been received.",
    proOrderFeat1: "Unlimited devices",
    proOrderFeat2: "Custom fields, column widths, logo position",
    proOrderFeat3: "Multiple images per device with gallery",
    proOrderFeat4: "All Pro updates for the next 12 months",
    proOrderName: "Name",
    proOrderEmail: "Email address",
    proOrderAccept: "Buy for {price}",
    proOrderNote: "Your details are only used to process the order and to send you the license code.",
    proOrderSubmit: "Order with obligation to pay",
    proOrderSending: "Sending order …",
    proOrderErrName: "Please enter your name.",
    proOrderErrEmail: "Please enter a valid email address.",
    proOrderErrAccept: "Please tick the box “Buy for {price}”.",
    proOrderErrRate: "Too many orders in a short time. Please try again later.",
    proOrderThanksTitle: "Thank you for your order!",
    proOrderThanksText: "We will contact you shortly at {email} with the payment details. After payment you will receive your license code — enter it under Setup → License.",
    proOrderMailFallback: "Your email program was opened with the order. Please send the email. If nothing opened: please send your name and email to {mail}.",
    licenseStoreFailed: "✗ License is valid but could not be saved. Browser storage full or private window? Please export a backup, free up space and try again.",
    sortFieldFormFactor: "Form factor",
    fieldFormFactor: "Form factor",
    formFactor: "Form factor",
    yes: "Yes",
    delete: "Delete",
    links: "Links",
    linksHint: "One line per link: Name | https://… (name optional)",
    copySuffix: "(copy)",
    duplicateDevice: "Duplicate",
    toWishlist: "Add to wishlist",
    markSold: "Mark as sold",
    markActive: "Mark active again",
    hideSold: "Hide sold",
    showSold: "Show sold",
    confirmToWishlist: "Add this device to the wishlist? Manufacturer, model, image, logo and links are copied.",
    confirmAlsoMarkSold: "Also mark the device as “Sold”?",
    toastAddedToWishlist: "Added to wishlist ✓",
    colResizeHint: "Drag: change width · Double-click: auto-fit",
    settingsTabCategories: "Categories",
    settingsTabCustomFields: "Custom fields",
    categoriesTitle: "Manage categories",
    categoriesHelp: "Renaming updates all affected devices. Using the name of an existing category merges them. ✕ removes the category from all devices.",
    categoryOrderProHint: "⭐ Custom category order is a Pro feature — alphabetical without Pro.",
    categoryRemove: "Remove category",
    categoryMergeConfirm: "Merge “{from}” into “{to}”? All devices get the category “{to}”.",
    categoryRemoveConfirm: "Remove category “{name}” from all devices? The devices themselves are kept.",
    customFieldsTitle: "Custom fields",
    customFieldsHelp: "Your own fields with a label and field type of your choice. Order via ↑/↓, the section sets the position in the form. Show them in grid/list under “Define views”.",
    customFieldsProHint: "⭐ Custom fields are a Pro feature. Values already entered are kept without a license.",
    customFieldsEmpty: "No custom fields yet.",
    customFieldBadge: "custom",
    customFieldLabelPh: "Label, e.g. rack position",
    customFieldOptionsPh: "Options, comma-separated",
    customFieldDeleteConfirm: "Delete field “{name}”? Values already entered stay stored in the devices.",
    addCustomField: "+ Add field",
    cfType_text: "Text",
    cfType_number: "Number",
    cfType_date: "Date",
    cfType_checkbox: "Yes/No",
    cfType_select: "Choice",
    cfType_url: "Link",
    proViewTitle: "Display",
    proViewHelp: "Position of the manufacturer logo on device cards and column widths in list view.",
    proViewHint: "⭐ Pro feature — license required",
    logoPositionTitle: "Logo position",
    logoAbove: "Above the device name",
    logoInline: "Next to the device name",
    resetColWidths: "Reset column widths",
    location: "Location",
    status: "Status",
    condition: "Condition",
    currentMarketValue: "Current market value",
    editDevice: "Edit device",
    deleteDevice: "Delete device",
    dialogTitleAdd: "Add device",
    dialogTitleEdit: "Edit device",
    cancel: "Cancel",
    save: "Save",
    name: "Name",
    manufacturer: "Manufacturer",
    manufacturerLogo: "Manufacturer logo",
    model: "Model",
    serialNumber: "Serial number",
    firmwareVersion: "Firmware version",
    category: "Category",
    type: "Device type",
    subcategory: "Subcategory",
    subcategoryFilterLabel: "Subcategory",
    allSubcategories: "All subcategories",
    imageUrl: "Image URL",
    purchaseYear: "Purchase year",
    purchasePrice: "Purchase price",
    warranty: "Warranty",
    warrantyUntil: "Warranty until",
    marketMin: "Market value min.",
    marketMax: "Market value max.",
    marketMedian: "Market value median",
    lastChecked: "Last check",
    confidence: "Confidence",
    audioOutputs: "Audio outputs",
    audioInputs: "Audio inputs",
    connector: "Connector type",
    level: "Level",
    midiIn: "MIDI In",
    midiOut: "MIDI Out",
    midiThru: "MIDI Thru",
    usbMidi: "USB MIDI",
    midiChannel: "MIDI channel",
    programChange: "Program Change",
    powerData: "Power data",
    psu: "Power supply",
    powerConnector: "Power connector",
    voltage: "Voltage",
    notes: "Notes",
    documentsHint: "Documents as list, one document per line: Name | Type | Link",
    tabs: ["Overview", "Audio", "MIDI", "Power", "Value", "Documents", "Notes"],
    all: "All",
    searchPlaceholder: "Search device, manufacturer, MIDI channel, location, note or document …",
    purchase: "Bought",
    value: "Value",
    issueDocumented: "Issues documented",
    audio: "Audio",
    power: "Power",
    documents: "Documents",
    documentName: "Document name",
    documentFile: "Choose file",
    addDocument: "Add document",
    documentsAttachmentHint: "Add documents locally as attachments.",
    removeDocument: "Remove",
    openDocument: "Open",
    documentTooLarge: "This file is large. Browser storage may be limited.",
    documentNeedsNameAndFile: "Please choose a document name and file.",
    marketRange: "Automatic range",
    median: "Median",
    marketToolsTitle: "Research online market price",
    marketToolsText: "This version opens prepared search queries. Real automatic valuation needs API credentials later, e.g. eBay or Reverb.",
    searchReverb: "Search Reverb",
    searchEbay: "Search eBay",
    searchImagesGoogle: "Google Images",
    searchImagesBing: "Bing Images",
    open: "Open",
    attachDocument: "Attach document",
    confirmDelete: "Delete this device?",
    importError: "Could not read the JSON file.",
    viewLibrary: "Library",
    viewWishlist: "Wishlist",
    addWishlistItem: "Add wish",
    wishlistTitle: "Wishlist",
    wishlistIntro: "Devices you'd like to buy. Capture manufacturer, model, prices and offer links. One click moves a wish into your library after purchase.",
    wishlistEmpty: "No wishes captured yet.",
    wishlistDialogTitleAdd: "Add wish",
    wishlistDialogTitleEdit: "Edit wish",
    sectionWishlistPricing: "Prices & links",
    priceNew: "New price",
    priceUsed: "Used price",
    wishlistLinks: "Links (one URL per line)",
    moveToLibrary: "Move to library",
    confirmMoveToLibrary: "Move this device from wishlist to library now?",
    confirmDeleteWishlist: "Delete this wish?",
    editWishlist: "Edit",
    deleteWishlist: "Delete",
    openLink: "Open link",
    wishlistSearchEmpty: "Please enter manufacturer or model first.",
    wishlistSearchPlaceholder: "Search wish …",
    wishlistStatCount: "Wishes",
    wishlistStatBudget: "Total budget (used)",
    wishlistStatBudgetNew: "Total budget (new)",
    wishlistStatLinks: "Links",
    sortFieldModel: "Model",
    sortFieldPriceNew: "New price",
    sortFieldPriceUsed: "Used price",
    prevDevice: "Previous device",
    nextDevice: "Next device",
    nagTitle: "Enjoying the app?",
    nagText: "If so, I'd be thrilled with a small contribution. ❤️",
    nagDonate: "Buy me a latte? ;-)",
    nagLater: "Maybe later",
    testNag: "Test donation toast now",
    resetNag: "Reset donation toast suppression",
    nagResetConfirm: "Suppression cleared — the toast will appear again soon.",
    settingsTabBackup: "Extras",
    settingsTabLicense: "License",
    donorCodeTitle: "Redeem donor code",
    donorCodeHelp: "After your donation you'll receive a personal code by email. Enter it here to permanently hide the donation prompt.",
    donorCodePlaceholder: "SGM-XXXX-XXXX-XXXX",
    donorCodeRedeem: "Apply code",
    donorCodeRevoke: "Remove code",
    donorCodeSuccess: "Thanks for your donation! 🎉",
    donorCodeInvalid: "✗ Invalid code. Please check your input.",
    donorCodeActive: "Premium-User",
    donorCodeRevokeConfirm: "Remove donor code? The donation prompt will reappear.",
    licenseTitle: "Pro License",
    licenseHelp: "Enter your license code to unlock Pro features.",
    licenseCodePlaceholder: "SGMP-XXXX-XXXX-XXXX",
    licenseCodeRedeem: "Activate license",
    licenseCodeRevoke: "Remove license",
    licenseCodeSuccess: "✓ Pro license active — all features unlocked.",
    licenseCodeInvalid: "✗ Invalid license code. Please check your input.",
    licenseActive: "✓ Pro version active",
    licenseInactive: "Free version",
    licenseRevokeConfirm: "Remove license? Pro features will be deactivated.",
    sortFieldType: "Device type",
    sortFieldSubcategory: "Subcategory",
    sortFieldPurchaseDate: "Purchase date",
    categoryViewChips: "As buttons",
    categoryViewDropdown: "As dropdown",
  },
};


const defaultTheme = {
  bg0: "#020617",
  bg1: "#0f172a",
  panelColor: "#0f172a",
  textColor: "#f8fafc",
  mutedColor: "#94a3b8",
  accentColor: "#67e8f9",
  cardBg: "#ffffff",
  cardText: "#020617",
  detailBg: "#ffffff",
  starColor: "#f59e0b",

  btnLanguageBg: "#0f172a",
  btnLanguageText: "#e2e8f0",
  btnSettingsBg: "#0f172a",
  btnSettingsText: "#e2e8f0",
  btnAddBg: "#67e8f9",
  btnAddText: "#06111f",
  btnBackupBg: "#0f172a",
  btnBackupText: "#e2e8f0",
  btnCsvBg: "#0f172a",
  btnCsvText: "#e2e8f0",
  btnImportBg: "#0f172a",
  btnImportText: "#e2e8f0",
  btnSortAscBg: "#0f172a",
  btnSortAscText: "#e2e8f0",
  btnSortDescBg: "#67e8f9",
  btnSortDescText: "#06111f",
  btnEditBg: "#67e8f9",
  btnEditText: "#06111f",
  btnPrintBg: "#0f172a",
  btnPrintText: "#e2e8f0",
  btnRemoveImageBg: "#0f172a",
  btnRemoveImageText: "#e2e8f0",
  btnDeleteBg: "#7f1d1d",
  btnDeleteText: "#fee2e2",
  btnDialogCancelBg: "#6b7280",
  btnDialogCancelText: "#ffffff",
  btnDialogSaveBg: "#67e8f9",
  btnDialogSaveText: "#06111f",
  btnResetThemeBg: "#6b7280",
  btnResetThemeText: "#ffffff",
  btnSettingsCancelBg: "#6b7280",
  btnSettingsCancelText: "#ffffff",
  btnSettingsSaveBg: "#67e8f9",
  btnSettingsSaveText: "#06111f",

  btnViewToggleBg: "#0f172a",
  btnViewToggleText: "#e2e8f0",
  btnViewToggleActiveBg: "#67e8f9",
  btnViewToggleActiveText: "#06111f",
  btnAddWishlistBg: "#67e8f9",
  btnAddWishlistText: "#06111f",
  btnMoveToLibraryBg: "#22c55e",
  btnMoveToLibraryText: "#052e16",
  btnEditWishlistBg: "#0f172a",
  btnEditWishlistText: "#e2e8f0",
  btnDeleteWishlistBg: "#7f1d1d",
  btnDeleteWishlistText: "#fee2e2",
};

let currentTheme = loadTheme();

function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return { ...defaultTheme };
    return { ...defaultTheme, ...JSON.parse(raw) };
  } catch {
    return { ...defaultTheme };
  }
}

function applyTheme(theme = currentTheme) {
  const root = document.documentElement;

  root.style.setProperty("--theme-bg0", theme.bg0);
  root.style.setProperty("--theme-bg1", theme.bg1);
  root.style.setProperty("--theme-panel", theme.panelColor);
  root.style.setProperty("--theme-text", theme.textColor);
  root.style.setProperty("--theme-muted", theme.mutedColor);
  root.style.setProperty("--theme-accent", theme.accentColor);
  root.style.setProperty("--theme-card-bg", theme.cardBg);
  root.style.setProperty("--theme-card-text", theme.cardText);
  root.style.setProperty("--theme-detail-bg", theme.detailBg);
  root.style.setProperty("--theme-star", theme.starColor);

  Object.entries(theme).forEach(([key, value]) => {
    if (key.startsWith("btn")) {
      const cssKey = key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
      root.style.setProperty(`--${cssKey}`, value);
    }
  });
}

function fillSettingsForm() {
  const form = $("#settingsForm");
  if (!form) return;
  Object.entries(currentTheme).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  renderViewSettingsControls();
}

function themeFromForm() {
  const form = $("#settingsForm");
  const next = { ...currentTheme };
  Object.keys(defaultTheme).forEach((key) => {
    if (form.elements[key]) next[key] = form.elements[key].value || defaultTheme[key];
  });
  return next;
}

function openSettingsDialog() {
  fillSettingsForm();
  renderViewSettingsControls();
  renderDonorCodeStatus();
  renderLicenseStatus();
  renderBackupInfo();
  renderVisitorCount();
  if (document.querySelector(".settings-tab")) switchSettingsTab("colors");
  const vEl = $("#appVersionDisplay");
  if (vEl) vEl.textContent = `v${APP_VERSION}`;
  $("#settingsDialog")?.showModal();
}

function saveSettings(event) {
  event.preventDefault();
  currentTheme = themeFromForm();
  safeStorageWrite(THEME_KEY, currentTheme, "theme");
  applyTheme();
  saveSortWordsFromForm();
  // Grid-Spalten (Pro)
  const colInput = document.getElementById("gridColumnsInput");
  if (colInput && isProUser()) {
    viewSettings.gridColumns = Math.min(5, Math.max(2, parseInt(colInput.value) || 4));
    saveViewSettings();
    applyGridColumns();
  }
  // Sortierkriterien aus Checkboxen lesen
  sortCriteriaVisible = {};
  document.querySelectorAll("[data-sort-criteria]").forEach((cb) => {
    sortCriteriaVisible[cb.dataset.sortCriteria] = cb.checked;
  });
  saveSortCriteria();
  applySortCriteria();
  $("#settingsDialog")?.close();
}

function resetTheme() {
  currentTheme = { ...defaultTheme };
  localStorage.setItem(THEME_KEY, JSON.stringify(currentTheme));
  applyTheme();
  fillSettingsForm();
}

const fieldDefinitions = {
  grid: [
    { key: "deviceImage", labelKey: "fieldDeviceImage" },
    { key: "manufacturerLogo", labelKey: "fieldManufacturerLogo" },
    { key: "name", labelKey: "fieldDeviceName" },
    { key: "manufacturer", labelKey: "fieldManufacturer" },
    { key: "model", labelKey: "fieldModel" },
    { key: "serialNumber", labelKey: "fieldSerialNumber" },
    { key: "firmwareVersion", labelKey: "fieldFirmwareVersion" },
    { key: "type", labelKey: "fieldDeviceType" },
    { key: "subcategory", labelKey: "fieldSubcategory" },
    { key: "formFactor", labelKey: "fieldFormFactor" },
    { key: "status", labelKey: "fieldStatus" },
    { key: "condition", labelKey: "fieldCondition" },
    { key: "location", labelKey: "fieldLocation" },
    { key: "purchaseYear", labelKey: "fieldPurchaseYear" },
    { key: "purchasePrice", labelKey: "fieldPurchasePrice" },
    { key: "warrantyUntil", labelKey: "fieldWarrantyUntil" },
    { key: "marketMin", labelKey: "fieldMarketMin" },
    { key: "marketMax", labelKey: "fieldMarketMax" },
    { key: "marketMedian", labelKey: "fieldMarketMedian" },
    { key: "lastChecked", labelKey: "fieldLastChecked" },
    { key: "audioOutputs", labelKey: "fieldAudioOutputs" },
    { key: "audioInputs", labelKey: "fieldAudioInputs" },
    { key: "connector", labelKey: "fieldConnector" },
    { key: "level", labelKey: "fieldLevel" },
    { key: "midiIn", labelKey: "fieldMidiIn" },
    { key: "midiOut", labelKey: "fieldMidiOut" },
    { key: "midiThru", labelKey: "fieldMidiThru" },
    { key: "usbMidi", labelKey: "fieldUsbMidi" },
    { key: "midiChannel", labelKey: "fieldMidiChannel" },
    { key: "programChange", labelKey: "fieldProgramChange" },
    { key: "msb", labelKey: "fieldMsb" },
    { key: "lsb", labelKey: "fieldLsb" },
    { key: "powerData", labelKey: "fieldPowerData" },
    { key: "psu", labelKey: "fieldPsu" },
    { key: "powerConnector", labelKey: "fieldPowerConnector" },
    { key: "voltage", labelKey: "fieldVoltage" },
    { key: "notes", labelKey: "fieldNotes" },
    { key: "documents", labelKey: "fieldDocuments" },
    { key: "rating", labelKey: "fieldRating" },
  ],
  list: [
    { key: "deviceImage", labelKey: "fieldDeviceImage" },
    { key: "manufacturerLogo", labelKey: "fieldManufacturerLogo" },
    { key: "name", labelKey: "fieldDeviceName" },
    { key: "manufacturer", labelKey: "fieldManufacturer" },
    { key: "model", labelKey: "fieldModel" },
    { key: "serialNumber", labelKey: "fieldSerialNumber" },
    { key: "firmwareVersion", labelKey: "fieldFirmwareVersion" },
    { key: "type", labelKey: "fieldDeviceType" },
    { key: "subcategory", labelKey: "fieldSubcategory" },
    { key: "formFactor", labelKey: "fieldFormFactor" },
    { key: "status", labelKey: "fieldStatus" },
    { key: "condition", labelKey: "fieldCondition" },
    { key: "location", labelKey: "fieldLocation" },
    { key: "purchaseYear", labelKey: "fieldPurchaseYear" },
    { key: "purchasePrice", labelKey: "fieldPurchasePrice" },
    { key: "warrantyUntil", labelKey: "fieldWarrantyUntil" },
    { key: "marketMin", labelKey: "fieldMarketMin" },
    { key: "marketMax", labelKey: "fieldMarketMax" },
    { key: "marketMedian", labelKey: "fieldMarketMedian" },
    { key: "lastChecked", labelKey: "fieldLastChecked" },
    { key: "audioOutputs", labelKey: "fieldAudioOutputs" },
    { key: "audioInputs", labelKey: "fieldAudioInputs" },
    { key: "connector", labelKey: "fieldConnector" },
    { key: "level", labelKey: "fieldLevel" },
    { key: "midiIn", labelKey: "fieldMidiIn" },
    { key: "midiOut", labelKey: "fieldMidiOut" },
    { key: "midiThru", labelKey: "fieldMidiThru" },
    { key: "usbMidi", labelKey: "fieldUsbMidi" },
    { key: "midiChannel", labelKey: "fieldMidiChannel" },
    { key: "programChange", labelKey: "fieldProgramChange" },
    { key: "msb", labelKey: "fieldMsb" },
    { key: "lsb", labelKey: "fieldLsb" },
    { key: "powerData", labelKey: "fieldPowerData" },
    { key: "psu", labelKey: "fieldPsu" },
    { key: "powerConnector", labelKey: "fieldPowerConnector" },
    { key: "voltage", labelKey: "fieldVoltage" },
    { key: "notes", labelKey: "fieldNotes" },
    { key: "documents", labelKey: "fieldDocuments" },
    { key: "rating", labelKey: "fieldRating" },
  ],
};

const defaultViewSettings = {
  grid: Object.fromEntries(fieldDefinitions.grid.map((field) => [field.key, [
    "deviceImage", "manufacturerLogo", "name", "type", "subcategory",
    "purchasePrice", "marketMax", "marketMin", "midiChannel", "location", "rating"
  ].includes(field.key)])),
  list: Object.fromEntries(fieldDefinitions.list.map((field) => [field.key, [
    "deviceImage", "manufacturerLogo", "manufacturer", "model", "type", "subcategory",
    "midiChannel", "status", "powerData", "rating"
  ].includes(field.key)])),
};

// Tiefer Klon für plain-Objekte/Arrays. structuredClone wo verfügbar, sonst JSON-Roundtrip.
function clonePlain(value) {
  if (value === null || value === undefined) return value;
  try {
    if (typeof structuredClone === "function") return structuredClone(value);
  } catch (_) { /* fallthrough */ }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

let viewSettings = loadViewSettings();

function loadViewSettings() {
  try {
    const raw = localStorage.getItem(VIEW_SETTINGS_KEY);
    if (!raw) return clonePlain(defaultViewSettings);
    const parsed = JSON.parse(raw);
    return {
      grid: { ...defaultViewSettings.grid, ...(parsed.grid || {}) },
      list: { ...defaultViewSettings.list, ...(parsed.list || {}) },
      gridColumns: parsed.gridColumns || 4,
      listColWidths: parsed.listColWidths && typeof parsed.listColWidths === "object" ? parsed.listColWidths : {}, // Pro
      logoPosition: parsed.logoPosition === "inline" ? "inline" : "above",                                          // Pro
    };
  } catch {
    return clonePlain(defaultViewSettings);
  }
}

function saveViewSettings() {
  return safeStorageWrite(VIEW_SETTINGS_KEY, viewSettings, "viewSettings");
}

/* ============================================================
   v1.0.5 — Eigene Felder (Pro), Kategorien, Links, Verkauft
   ============================================================ */
const CUSTOM_FIELD_TYPES    = ["text", "number", "date", "checkbox", "select", "url"];
const CUSTOM_FIELD_SECTIONS = ["general", "purchase", "audiomidi", "powerdocs"];
const SECTION_TITLE_KEYS    = { general: "sectionGeneral", purchase: "sectionPurchase", audiomidi: "sectionAudioMidi", powerdocs: "sectionPowerDocs" };

function normalizeCustomField(f) {
  return {
    id: String(f.id),
    label: String(f.label || ""),
    type: CUSTOM_FIELD_TYPES.includes(f.type) ? f.type : "text",
    options: Array.isArray(f.options) ? f.options.map((o) => String(o).trim()).filter(Boolean) : [],
    section: CUSTOM_FIELD_SECTIONS.includes(f.section) ? f.section : "general",
  };
}

let customFields = (() => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((f) => f && f.id).map(normalizeCustomField) : [];
  } catch (_) { return []; }
})();

function saveCustomFields() {
  safeStorageWrite(CUSTOM_FIELDS_KEY, customFields, "customFields", customFields.length);
}

/** Eigene Felder sind Pro. Ohne Lizenz bleiben Definitionen und Werte erhalten, werden aber nicht angezeigt. */
function activeCustomFields() {
  return isProUser() ? customFields.filter((f) => f.label.trim()) : [];
}

const customFieldKey = (f) => `cf:${f.id}`;

function findCustomFieldByKey(key) {
  if (!String(key).startsWith("cf:")) return null;
  const id = String(key).slice(3);
  return activeCustomFields().find((f) => f.id === id) || null;
}

/** Feldliste für Grid/Liste inkl. eigener Felder. */
function getFieldDefs(view) {
  return [
    ...fieldDefinitions[view],
    ...activeCustomFields().map((f) => ({ key: customFieldKey(f), label: f.label, custom: true })),
  ];
}

function fieldLabel(field) {
  return field.label || t(field.labelKey);
}

function customRawValue(device, f) {
  return device?.custom?.[f.id] ?? "";
}

function customDisplayText(device, f) {
  const v = customRawValue(device, f);
  if (f.type === "checkbox") return v ? "✓" : "—";
  if (v === "" || v === null || v === undefined) return "—";
  if (f.type === "date") return formatDisplayDate(v);
  if (f.type === "url") return linkLabel(v);
  return String(v);
}

function customSortValue(device, f) {
  const v = customRawValue(device, f);
  if (f.type === "number") return v === "" ? "" : Number(v);
  if (f.type === "checkbox") return v ? 1 : "";
  return String(v || "");
}

/** Rendert die Eingabefelder der eigenen Felder in die passenden Formular-Abschnitte. */
function renderCustomFieldInputs(device) {
  const form = $("#deviceForm");
  const grid = form?.querySelector(".form-section-grid");
  if (!grid) return;
  grid.querySelectorAll(".cf-input-label").forEach((el) => el.remove());

  activeCustomFields().forEach((f) => {
    const label = document.createElement("label");
    label.className = "cf-input-label";
    const name = `cf_${f.id}`;
    const value = customRawValue(device, f);
    let control;
    if (f.type === "select") {
      control = `<select name="${name}"><option value=""></option>${f.options.map((o) =>
        `<option value="${escapeAttribute(o)}" ${o === value ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}</select>`;
    } else if (f.type === "checkbox") {
      control = `<span class="cf-checkbox"><input type="checkbox" name="${name}" ${value ? "checked" : ""}> ${escapeHtml(t("yes"))}</span>`;
    } else {
      const type = { number: "number", date: "date", url: "url" }[f.type] || "text";
      control = `<input type="${type}" name="${name}" value="${escapeAttribute(value)}" ${f.type === "url" ? 'placeholder="https://…"' : ""}>`;
    }
    label.innerHTML = `<span>${escapeHtml(f.label)} <em class="cf-badge">${escapeHtml(t("customFieldBadge"))}</em></span>${control}`;

    // Einfügen: am Ende des gewählten Abschnitts = vor dem Titel des nächsten Abschnitts
    const order = CUSTOM_FIELD_SECTIONS;
    const nextKey = order.slice(order.indexOf(f.section) + 1).map((s) => SECTION_TITLE_KEYS[s])[0];
    let anchor = nextKey ? grid.querySelector(`.form-section-title[data-i18n="${nextKey}"]`) : null;
    // Allgemein: vor der Logo/Bild-Zeile, damit die Felder im Raster bleiben
    if (f.section === "general") anchor = grid.querySelector(".form-media-row") || anchor;
    grid.insertBefore(label, anchor || null);
  });
}

/** Werte der eigenen Felder aus dem Formular. Werte gelöschter/inaktiver Felder bleiben erhalten. */
function customValuesFromForm(currentDevice) {
  const result = { ...(currentDevice?.custom || {}) };
  const form = $("#deviceForm");
  activeCustomFields().forEach((f) => {
    const el = form?.elements[`cf_${f.id}`];
    if (!el) return;
    if (f.type === "checkbox") result[f.id] = el.checked ? "1" : "";
    else result[f.id] = String(el.value || "").trim();
  });
  return result;
}

/** Setup-Tab „Eigene Felder". */
function renderCustomFieldsEditor() {
  const box = $("#customFieldsEditor");
  if (!box) return;
  const isPro = isProUser();
  $("#customFieldsProHint")?.classList.toggle("hidden", isPro);
  $("#addCustomFieldBtn") && ($("#addCustomFieldBtn").disabled = !isPro);

  if (!customFields.length) {
    box.innerHTML = `<p class="cf-empty">${escapeHtml(t("customFieldsEmpty"))}</p>`;
    return;
  }
  const typeOpts = (sel) => CUSTOM_FIELD_TYPES.map((ty) =>
    `<option value="${ty}" ${ty === sel ? "selected" : ""}>${escapeHtml(t(`cfType_${ty}`))}</option>`).join("");
  const sectionOpts = (sel) => CUSTOM_FIELD_SECTIONS.map((sec) =>
    `<option value="${sec}" ${sec === sel ? "selected" : ""}>${escapeHtml(t(SECTION_TITLE_KEYS[sec]))}</option>`).join("");

  box.innerHTML = customFields.map((f, i) => `
    <div class="cf-row" data-idx="${i}">
      <input class="cf-label" type="text" value="${escapeAttribute(f.label)}" placeholder="${escapeAttribute(t("customFieldLabelPh"))}" ${isPro ? "" : "disabled"}>
      <select class="cf-type" ${isPro ? "" : "disabled"}>${typeOpts(f.type)}</select>
      <select class="cf-section" ${isPro ? "" : "disabled"}>${sectionOpts(f.section)}</select>
      <input class="cf-options ${f.type === "select" ? "" : "hidden"}" type="text" value="${escapeAttribute(f.options.join(", "))}" placeholder="${escapeAttribute(t("customFieldOptionsPh"))}" ${isPro ? "" : "disabled"}>
      <div class="cf-row-actions">
        <button type="button" class="btn btn-ghost cf-up" title="↑" ${!isPro || i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="btn btn-ghost cf-down" title="↓" ${!isPro || i === customFields.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="btn btn-ghost cf-delete" title="${escapeAttribute(t("delete"))}" ${isPro ? "" : "disabled"}>✕</button>
      </div>
    </div>`).join("");

  box.querySelectorAll(".cf-row").forEach((row) => {
    const idx = Number(row.dataset.idx);
    const f = customFields[idx];
    const commit = (rerender = false) => { saveCustomFields(); afterCustomFieldsChanged(); if (rerender) renderCustomFieldsEditor(); };
    row.querySelector(".cf-label").addEventListener("change", (e) => { f.label = e.target.value.trim(); commit(); });
    row.querySelector(".cf-type").addEventListener("change", (e) => { f.type = e.target.value; commit(true); });
    row.querySelector(".cf-section").addEventListener("change", (e) => { f.section = e.target.value; commit(); });
    row.querySelector(".cf-options").addEventListener("change", (e) => {
      f.options = e.target.value.split(",").map((o) => o.trim()).filter(Boolean); commit();
    });
    row.querySelector(".cf-up").addEventListener("click", () => {
      [customFields[idx - 1], customFields[idx]] = [customFields[idx], customFields[idx - 1]]; commit(true);
    });
    row.querySelector(".cf-down").addEventListener("click", () => {
      [customFields[idx + 1], customFields[idx]] = [customFields[idx], customFields[idx + 1]]; commit(true);
    });
    row.querySelector(".cf-delete").addEventListener("click", () => {
      if (!confirm(t("customFieldDeleteConfirm").replace("{name}", f.label || "—"))) return;
      customFields.splice(idx, 1); commit(true);
    });
  });
}

function addCustomField() {
  if (!isProUser()) return;
  customFields.push(normalizeCustomField({ id: Date.now().toString(36), label: "", type: "text", section: "general" }));
  saveCustomFields();
  renderCustomFieldsEditor();
  const inputs = document.querySelectorAll("#customFieldsEditor .cf-label");
  inputs[inputs.length - 1]?.focus();
}

function afterCustomFieldsChanged() {
  renderCustomSortOptions();
  renderFieldToggleList("grid", $("#gridFieldSettings"));
  renderFieldToggleList("list", $("#listFieldSettings"));
  renderGrid();
  if (selectedId) renderDetail();
}

/** Eigene Felder im Sortier-Dropdown. */
function renderCustomSortOptions() {
  const select = $("#sortFieldSelect");
  if (!select) return;
  select.querySelectorAll("option[data-custom]").forEach((o) => o.remove());
  activeCustomFields().forEach((f) => {
    const opt = document.createElement("option");
    opt.value = customFieldKey(f);
    opt.dataset.custom = "1";
    opt.textContent = f.label;
    select.appendChild(opt);
  });
  if (String(sortField).startsWith("cf:") && !findCustomFieldByKey(sortField)) sortField = "added";
  select.value = sortField;
}

/* ── Kategorien verwalten ───────────────────────────────── */
let categoryOrder = (() => {
  try { const p = JSON.parse(localStorage.getItem(CATEGORY_ORDER_KEY) || "[]"); return Array.isArray(p) ? p : []; }
  catch (_) { return []; }
})();

/** Alle Kategorien (Gerätetypen): Pro = eigene Reihenfolge, sonst alphabetisch. */
function getOrderedCategories() {
  const all = [...new Set(devices.map((d) => d.type).filter(Boolean))];
  const alpha = (a, b) => a.localeCompare(b, lang === "de" ? "de" : "en", { sensitivity: "base" });
  if (!isProUser() || !categoryOrder.length) return all.sort(alpha);
  const known = categoryOrder.filter((c) => all.includes(c));
  return [...known, ...all.filter((c) => !known.includes(c)).sort(alpha)];
}

function renameCategory(oldName, newName) {
  const next = String(newName || "").trim();
  if (next === oldName) return;
  let changed = 0;
  devices.forEach((d) => { if (d.type === oldName) { d.type = next; changed++; } });
  wishlist.forEach((w) => { if (w.type === oldName) { w.type = next; changed++; } });
  categoryOrder = categoryOrder.map((c) => (c === oldName ? next : c)).filter((c, i, arr) => c && arr.indexOf(c) === i);
  safeStorageWrite(CATEGORY_ORDER_KEY, categoryOrder, "categoryOrder");
  if (currentCategory === oldName) { currentCategory = next || "Alle"; currentSubcategory = ""; }
  saveDevices();
  saveWishlist();
  Logger.info("categories", next ? `Kategorie umbenannt: ${oldName} → ${next}` : `Kategorie entfernt: ${oldName}`, { changed });
  renderCategoryManager();
  renderAll();
}

function moveCategory(name, dir) {
  if (!isProUser()) return;
  const list = getOrderedCategories();
  const i = list.indexOf(name);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  categoryOrder = list;
  safeStorageWrite(CATEGORY_ORDER_KEY, categoryOrder, "categoryOrder");
  renderCategoryManager();
  renderCategories();
}

/** Setup-Tab „Kategorien". */
function renderCategoryManager() {
  const box = $("#categoryManager");
  if (!box) return;
  const cats = getOrderedCategories();
  const isPro = isProUser();
  $("#categoryOrderProHint")?.classList.toggle("hidden", isPro);
  if (!cats.length) { box.innerHTML = `<p class="cf-empty">${escapeHtml(t("emptyState"))}</p>`; return; }
  box.innerHTML = cats.map((c, i) => {
    const count = devices.filter((d) => d.type === c).length;
    return `
      <div class="cat-row" data-cat="${escapeAttribute(c)}">
        <input class="cat-name" type="text" value="${escapeAttribute(c)}">
        <span class="cat-count">${count}</span>
        <div class="cf-row-actions">
          <button type="button" class="btn btn-ghost cat-up" ${!isPro || i === 0 ? "disabled" : ""} title="↑">↑</button>
          <button type="button" class="btn btn-ghost cat-down" ${!isPro || i === cats.length - 1 ? "disabled" : ""} title="↓">↓</button>
          <button type="button" class="btn btn-ghost cat-delete" title="${escapeAttribute(t("categoryRemove"))}">✕</button>
        </div>
      </div>`;
  }).join("");

  box.querySelectorAll(".cat-row").forEach((row) => {
    const name = row.dataset.cat;
    row.querySelector(".cat-name").addEventListener("change", (e) => {
      const next = e.target.value.trim();
      if (!next) { e.target.value = name; return; }
      const merge = getOrderedCategories().includes(next);
      if (merge && !confirm(t("categoryMergeConfirm").replace("{from}", name).replace("{to}", next))) { e.target.value = name; return; }
      renameCategory(name, next);
    });
    row.querySelector(".cat-up").addEventListener("click", () => moveCategory(name, -1));
    row.querySelector(".cat-down").addEventListener("click", () => moveCategory(name, 1));
    row.querySelector(".cat-delete").addEventListener("click", () => {
      if (!confirm(t("categoryRemoveConfirm").replace("{name}", name))) return;
      renameCategory(name, "");
    });
  });
}

/* ── Links bei Geräten ──────────────────────────────────── */
function normalizeUrl(raw) {
  let url = String(raw || "").trim();
  if (!url) return "";
  if (/^www\./i.test(url)) url = `https://${url}`;
  return /^(https?:|mailto:)/i.test(url) ? url : "";
}

function linkLabel(url) {
  try { return new URL(normalizeUrl(url) || url).hostname.replace(/^www\./, ""); }
  catch (_) { return String(url); }
}

/** Zeilen „Name | URL" oder nur „URL" → [{ label, url }]. Unsichere Schemata werden verworfen. */
function parseDeviceLinks(text) {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    const url = normalizeUrl(parts.length > 1 ? parts[parts.length - 1] : parts[0]);
    const label = parts.length > 1 ? parts.slice(0, -1).join(" | ") : "";
    return url ? { label: label || linkLabel(url), url } : null;
  }).filter(Boolean);
}

function renderLinkButtons(links) {
  return links.map((l) =>
    `<a class="btn btn-ghost device-link-btn" target="_blank" rel="noopener" href="${escapeAttribute(l.url)}" title="${escapeAttribute(l.url)}">↗ ${escapeHtml(l.label)}</a>`
  ).join("");
}

/** Notizen: Text escapen und URLs klickbar machen. */
function linkifyText(text) {
  return escapeHtml(text).replace(/\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)])/gi, (m) => {
    const href = normalizeUrl(m.replace(/&amp;/g, "&"));
    return href ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener">${m}</a>` : m;
  });
}

/* ── Verkauft / Wunschliste / Duplizieren ───────────────── */
function isSold(device) {
  return ["verkauft", "sold"].includes(String(device?.status || "").trim().toLowerCase());
}

let hideSold = localStorage.getItem(HIDE_SOLD_KEY) === "1";

function toggleSoldStatus() {
  const device = selectedDevice();
  if (!device) return;
  device.status = isSold(device) ? "Aktiv" : SOLD_STATUS;
  saveDevices();
  renderAll();
  renderDetail();
}

function duplicateSelectedDevice() {
  const device = selectedDevice();
  if (!device || freeLimitReached()) return;
  const copy = clonePlain(device);
  copy.id = Date.now();
  copy.name = `${device.name || ""} ${t("copySuffix")}`.trim();
  // Exemplar-spezifische Daten leeren
  copy.serialNumber = "";
  copy.purchaseYear = "";
  copy.purchasePrice = 0;
  copy.warrantyUntil = "";
  if (isSold(copy)) copy.status = "Aktiv";
  devices.unshift(copy);
  saveDevices();
  Logger.info("ui", `Gerät dupliziert: ${device.name}`);
  selectedId = copy.id;
  renderAll();
  renderDetail();
  openDialog("edit", copy.id); // direkt bearbeiten: Seriennummer, Kaufdatum, Preis
}

function addSelectedDeviceToWishlist() {
  const device = selectedDevice();
  if (!device) return;
  if (!confirm(t("confirmToWishlist"))) return;
  wishlist.unshift(normalizeWishlistItem({
    id: Date.now(),
    manufacturer: device.manufacturer,
    model: device.model || device.name,
    type: device.type,
    subcategory: device.subcategory,
    image: device.image,
    manufacturerLogo: device.manufacturerLogo,
    priceNew: 0,
    priceUsed: Number(device.marketMedian || device.purchasePrice || 0),
    links: parseDeviceLinks(device.links).map((l) => l.url).join("\n"),
  }));
  saveWishlist();
  Logger.info("ui", `Auf Wunschliste gesetzt: ${device.name}`);
  if (!isSold(device) && confirm(t("confirmAlsoMarkSold"))) {
    device.status = SOLD_STATUS;
    saveDevices();
  }
  renderAll();
  renderDetail();
  showToast(t("toastAddedToWishlist"));
}

function showToast(message) {
  document.querySelector(".sgm-toast")?.remove();
  const el = document.createElement("div");
  el.className = "sgm-toast";
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("visible"));
  setTimeout(() => { el.classList.remove("visible"); setTimeout(() => el.remove(), 250); }, 3500);
}

/* ── Listenansicht: Spaltenbreiten (Pro) & Miniatur-Vorschau ─ */
function listColumnTemplate(fields) {
  const widths = (isProUser() && viewSettings.listColWidths) || {};
  return fields.map((f) => (widths[f.key] ? `${Math.round(widths[f.key])}px` : (f.key === "deviceImage" ? "90px" : "minmax(135px, 1fr)"))).join(" ");
}

/** Mindestbreite der Liste = Summe der Spalten-Mindestbreiten + Abstände + Innenabstand. */
function listMinWidth(fields) {
  const widths = (isProUser() && viewSettings.listColWidths) || {};
  const sum = fields.reduce((acc, f) => acc + (widths[f.key] || (f.key === "deviceImage" ? 90 : 135)), 0);
  return Math.round(sum + Math.max(0, fields.length - 1) * 10 + 28);
}

function setListColWidth(key, width) {
  viewSettings.listColWidths = { ...(viewSettings.listColWidths || {}) };
  if (width) viewSettings.listColWidths[key] = Math.max(56, Math.min(800, width));
  else delete viewSettings.listColWidths[key];
}

function bindListInteractions(grid, fields) {
  const view = grid.querySelector(".device-list-view");
  if (!view) return;

  // Miniaturbild: Hover-Vorschau + Klick öffnet die Lightbox (ohne Gerätepass)
  grid.querySelectorAll(".device-list-row .mini-device-image").forEach((img) => {
    const id = Number(img.closest(".device-list-row")?.dataset.deviceId);
    img.addEventListener("mouseenter", (e) => showThumbPreview(img.src, e));
    img.addEventListener("mousemove", (e) => positionThumbPreview(e));
    img.addEventListener("mouseleave", hideThumbPreview);
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      hideThumbPreview();
      openDeviceLightbox(devices.find((d) => d.id === id), img.src);
    });
  });

  if (!isProUser()) return;
  let dragging = false;
  view.querySelectorAll(".col-resizer").forEach((handle) => {
    const key = handle.dataset.resizeField;
    handle.addEventListener("click", (e) => e.stopPropagation());
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const header = handle.closest(".list-sort-header");
      const startX = e.clientX;
      const startW = header.getBoundingClientRect().width;
      dragging = true;
      handle.setPointerCapture?.(e.pointerId);
      const onMove = (ev) => {
        setListColWidth(key, startW + (ev.clientX - startX));
        view.style.setProperty("--list-template", listColumnTemplate(fields));
        view.style.setProperty("--list-min-width", `${listMinWidth(fields)}px`);
      };
      const onUp = () => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        saveViewSettings();
        setTimeout(() => { dragging = false; }, 0);
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
    });
    // Doppelklick: Breite an den längsten Inhalt anpassen; nochmal = zurück auf automatisch
    handle.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const current = viewSettings.listColWidths?.[key];
      const cells = [...view.querySelectorAll(`.list-${CSS.escape(key)}`)];
      const label = handle.closest(".list-sort-header")?.querySelector("span");
      const fit = Math.max(label ? label.scrollWidth + 48 : 80, ...cells.map((c) => c.scrollWidth + 24));
      setListColWidth(key, current && Math.abs(current - fit) < 4 ? 0 : fit);
      view.style.setProperty("--list-template", listColumnTemplate(fields));
      view.style.setProperty("--list-min-width", `${listMinWidth(fields)}px`);
      saveViewSettings();
    });
  });
  // Sortier-Klick unterdrücken, wenn gerade gezogen wurde
  view.querySelectorAll(".list-sort-header").forEach((h) => h.addEventListener("click", (e) => {
    if (dragging) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true));
}

function showThumbPreview(src, e) {
  let box = document.getElementById("thumbPreview");
  if (!box) {
    box = document.createElement("div");
    box.id = "thumbPreview";
    box.innerHTML = "<img alt=''>";
    document.body.appendChild(box);
  }
  box.querySelector("img").src = src;
  box.classList.add("visible");
  positionThumbPreview(e);
}

function positionThumbPreview(e) {
  const box = document.getElementById("thumbPreview");
  if (!box) return;
  const w = 300, h = 220, pad = 18;
  let x = e.clientX + pad, y = e.clientY + pad;
  if (x + w > window.innerWidth) x = e.clientX - w - pad;
  if (y + h > window.innerHeight) y = window.innerHeight - h - 8;
  box.style.left = `${Math.max(8, x)}px`;
  box.style.top = `${Math.max(8, y)}px`;
}

function hideThumbPreview() {
  document.getElementById("thumbPreview")?.classList.remove("visible");
}

/* ── Pro-Ansichtsoptionen (Logo-Position, Spaltenbreiten zurücksetzen) ─ */
function renderProViewControls() {
  const isPro = isProUser();
  const sel = $("#logoPositionSelect");
  if (sel) { sel.value = viewSettings.logoPosition || "above"; sel.disabled = !isPro; }
  const btn = $("#resetColWidthsBtn");
  if (btn) btn.disabled = !isPro;
  $("#proViewHint")?.classList.toggle("hidden", isPro);
}

function renderViewSettingsControls() {
  renderFieldToggleList("grid", $("#gridFieldSettings"));
  renderFieldToggleList("list", $("#listFieldSettings"));
  renderGridColumnsControl();
  renderProViewControls();
  renderCustomFieldsEditor();
  renderCategoryManager();
  renderSortCriteriaEditor();
  renderSortWordsEditor();
  renderLogsList();
  renderLabelsEditor();
}

function applyGridColumns() {
  // Nur Pro + Grid-Modus: Spaltenzahl als CSS-Variable. Media-Queries begrenzen sie auf
  // Tablet/Handy (siehe styles.css). Inline-grid-template-columns würde die Liste und die
  // Mobilansicht zerstören — daher nie direkt setzen.
  const grid = document.getElementById("deviceGrid");
  if (!grid) return;
  grid.style.gridTemplateColumns = "";
  if (isProUser() && viewMode === "grid") {
    grid.style.setProperty("--grid-cols", String(viewSettings.gridColumns || 4));
    grid.classList.add("has-custom-cols");
  } else {
    grid.style.removeProperty("--grid-cols");
    grid.classList.remove("has-custom-cols");
  }
}

function renderGridColumnsControl() {
  const el = document.getElementById("gridColumnsInput");
  if (!el) return;
  const isPro = isProUser();
  el.disabled = !isPro;
  el.value = viewSettings.gridColumns || 4;
  const hint = document.getElementById("gridColumnsProHint");
  if (hint) hint.style.display = isPro ? "none" : "";
}

function renderSortCriteriaEditor() {
  const container = $("#sortCriteriaSettings");
  if (!container) return;
  container.innerHTML = "";
  ALL_SORT_CRITERIA.forEach(({ value, i18nKey }) => {
    const isVisible = !sortCriteriaVisible || sortCriteriaVisible[value] !== false;
    const label = document.createElement("label");
    label.className = "field-toggle";
    label.innerHTML = `
      <input type="checkbox" data-sort-criteria="${value}" ${isVisible ? "checked" : ""} />
      <span>${t(i18nKey)}</span>`;
    container.appendChild(label);
  });
}

function renderSortWordsEditor() {
  const el = $("#sortWordsInput");
  if (!el) return;
  el.value = sortIgnoreWords.join(", ");
}

function saveSortWordsFromForm() {
  const el = $("#sortWordsInput");
  if (!el) return;
  sortIgnoreWords = el.value.split(",").map((w) => w.trim()).filter(Boolean);
  saveSortWords();
}

/* ============================================================
   Label-Editor (Setup-Tab "Beschriftungen")
   ============================================================ */
const editableLabelGroups = [
  {
    titleKey: "labelsGroupButtons",
    keys: [
      "addDevice", "editDevice", "deleteDevice", "removeImage", "printDevice",
      "save", "cancel", "backupNow", "exportCsv", "importJson", "exportJson",
      "addDocument", "openDocument", "removeDocument", "attachDocument",
      "searchImage", "ownImage", "searchReverb", "searchEbay", "open",
      "addWishlistItem", "viewLibrary", "viewWishlist",
      "moveToLibrary", "editWishlist", "deleteWishlist", "openLink",
      "prevDevice", "nextDevice", "backToGallery",
    ],
  },
  {
    titleKey: "labelsGroupFields",
    keys: [
      "name", "manufacturer", "manufacturerLogo", "model",
      "serialNumber", "firmwareVersion", "type", "subcategory",
      "status", "condition", "location", "imageUrl",
      "purchaseYear", "purchasePrice", "warrantyUntil",
      "marketMin", "marketMax", "marketMedian", "lastChecked",
      "audioOutputs", "audioInputs", "connector", "level",
      "midiIn", "midiOut", "midiThru", "usbMidi", "midiChannel", "programChange",
      "powerData", "psu", "powerConnector", "voltage", "notes",
      "priceNew", "priceUsed", "wishlistLinks",
      "documentName", "documentFile",
    ],
  },
  {
    titleKey: "labelsGroupSections",
    keys: [
      "sectionGeneral", "sectionPurchase", "sectionAudioMidi", "sectionPowerDocs",
      "sectionWishlistPricing", "currentMarketValue", "documents",
      "dialogTitleAdd", "dialogTitleEdit",
      "wishlistDialogTitleAdd", "wishlistDialogTitleEdit",
      "wishlistTitle", "wishlistIntro",
    ],
  },
  {
    titleKey: "labelsGroupStats",
    keys: [
      "statDevices", "statValue", "statDocs", "statIssues",
      "wishlistStatCount", "wishlistStatBudget", "wishlistStatBudgetNew", "wishlistStatLinks",
    ],
  },
  {
    titleKey: "labelsGroupOther",
    keys: [
      "appTitle", "subtitle", "devicePassport", "rating",
      "sortLabel", "sortAsc", "sortDesc", "all", "allSubcategories", "subcategoryFilterLabel",
      "sortFieldAdded", "sortFieldName", "sortFieldManufacturer", "sortFieldMidiChannel",
      "sortFieldRating", "sortFieldPrice", "sortFieldYear",
      "sortFieldType", "sortFieldSubcategory", "sortFieldPurchaseDate",
      "sortFieldModel", "sortFieldPriceNew", "sortFieldPriceUsed",
      "switchToList", "switchToGrid",
      "emptyState", "wishlistEmpty",
      "searchPlaceholder", "wishlistSearchPlaceholder",
      "marketRange", "median", "marketToolsTitle",
    ],
  },
];

function renderLabelsEditor() {
  const container = $("#labelsEditor");
  if (!container) return;

  container.innerHTML = editableLabelGroups.map((group) => {
    const rows = group.keys.map((key) => {
      const fallback = i18n[lang][key] || i18n.de[key] || key;
      const current = userLabels[key] ?? "";
      return `
        <label class="label-edit-row">
          <span class="label-key" title="${escapeAttribute(key)}">${escapeHtml(fallback)}</span>
          <input type="text" data-label-key="${escapeAttribute(key)}" placeholder="${escapeAttribute(fallback)}" value="${escapeAttribute(current)}">
        </label>
      `;
    }).join("");
    return `
      <section class="labels-group">
        <h4>${escapeHtml(t(group.titleKey))}</h4>
        <div class="labels-list">${rows}</div>
      </section>
    `;
  }).join("");

  container.querySelectorAll('input[data-label-key]').forEach((input) => {
    input.addEventListener("change", safe("labelEdit", () => {
      const key = input.dataset.labelKey;
      const value = input.value.trim();
      if (value) {
        userLabels[key] = value;
      } else {
        delete userLabels[key];
      }
      saveUserLabels();
      Logger.info("ui", `Label überschrieben: ${key}`, { value });
      applyTranslations();
      // Komponenten neu rendern, die i18n-Strings dynamisch aufbauen
      renderAll();
      if (currentView === "wishlist") renderWishlist();
      if ($("#detailView") && !$("#detailView").classList.contains("hidden")) renderDetail();
    }));
  });
}

// ── Donor Code System ─────────────────────────────────────────────────────
// Format: SGM-XXXX-XXXX-YYYY
// Codes generieren (Browser-Konsole der laufenden App):
//   generateDonorCode(1).then(console.log)
//   for(let i=1;i<=20;i++) generateDonorCode(i).then(console.log)
// ─────────────────────────────────────────────────────────────────────────

async function sha256hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validateDonationCode(rawCode) {
  if (!rawCode) return false;
  const code = String(rawCode).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code.startsWith("SGM") || code.length !== 15) return false;
  const base  = code.slice(3, 11);
  const check = code.slice(11);
  const hash  = await sha256hex(DONOR_SECRET + base);
  return hash.slice(0, 4).toUpperCase() === check;
}

/* ============================================================
   Pro-Lizenz-System
   - Codes: SGMP-XXXX-XXXX-XXXX  (Prefix "SGMP" = SGM Pro)
   - Validierung: SHA-256 wie Donor-Codes, anderes Secret
   - Feature-Registry: PRO_FEATURES markiert jede Funktion
     als { pro: true } (nur Pro) oder { pro: false } (Free+Pro)
   ============================================================ */

// ── Pro-Feature Registry ──
// Generiert: 4.5.2026, 22:18:09
// Free-Features: 0 | Pro-Features: 2

const PRO_FEATURES = {
  gridColumns       : { pro: true,  label: "Karten pro Zeile", desc: "Anzahl Grid-Spalten (2–5) frei wählbar" },
  multipleImages    : { pro: true,  label: "Mehrere Gerätebilder", desc: "Bildergalerie mit Vor/Zurück-Navigation" },
};

function isProUser() {
  return Boolean(localStorage.getItem(LICENSE_KEY));
}

function requiresPro(featureKey) {
  const feature = PRO_FEATURES[featureKey];
  if (!feature || !feature.pro) return true; // unbekannt oder Free → erlaubt
  return isProUser();
}

async function validateLicenseCode(rawCode) {
  if (!rawCode) return false;
  const code = String(rawCode).toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Format: SGMP + 8 Zeichen base + 4 Zeichen checksum = 16 Zeichen ohne Trennstriche
  if (!code.startsWith("SGMP") || code.length !== 16) return false;
  const base  = code.slice(4, 12);
  const check = code.slice(12);
  const hash  = await sha256hex(LICENSE_SECRET + base);
  return hash.slice(0, 4).toUpperCase() === check;
}

/** Speichert den Lizenzcode und prüft, ob er wirklich im Speicher angekommen ist. */
function storeLicense(raw) {
  const code = String(raw).trim().toUpperCase();
  const ok = safeLocalStorageSet(LICENSE_KEY, code) && localStorage.getItem(LICENSE_KEY) === code;
  if (!ok) Logger.error("license", "Lizenz konnte nicht gespeichert werden (Browser-Speicher voll oder gesperrt?)");
  return ok;
}

/** Nach Aktivieren/Entfernen der Lizenz: Pro-abhängige Oberfläche sofort aktualisieren. */
function onLicenseChanged() {
  document.getElementById("freeLimitDialog")?.close?.();
  applyGridColumns();
  renderGridColumnsControl();
  renderProViewControls();
  renderCustomFieldsEditor();
  renderCategoryManager();
  renderAll();
}

async function redeemLicenseCode() {
  const input = $("#licenseCodeInput");
  if (!input) return;
  const raw = input.value.trim();
  if (!raw) return;
  const valid = await validateLicenseCode(raw);
  const feedbackEl = $("#licenseCodeFeedback");
  if (valid) {
    if (!storeLicense(raw)) {
      if (feedbackEl) {
        feedbackEl.textContent = t("licenseStoreFailed");
        feedbackEl.className = "donor-feedback donor-feedback--err";
      }
      return;
    }
    Logger.info("license", "Gültiger Pro-Lizenzcode eingelöst");
    if (feedbackEl) {
      feedbackEl.textContent = t("licenseCodeSuccess");
      feedbackEl.className = "donor-feedback donor-feedback--ok";
    }
    renderLicenseStatus();
    onLicenseChanged();
  } else {
    Logger.warn("license", "Ungültiger Lizenzcode eingegeben");
    if (feedbackEl) {
      feedbackEl.textContent = t("licenseCodeInvalid");
      feedbackEl.className = "donor-feedback donor-feedback--err";
    }
  }
}

function renderLicenseStatus() {
  const stored    = localStorage.getItem(LICENSE_KEY);
  const statusEl  = $("#licenseCodeStatus");
  const inputRow  = $("#licenseCodeInputRow");
  const inputEl   = $("#licenseCodeInput");
  const revokeBtn = $("#revokeLicenseBtn");
  const feedbackEl = $("#licenseCodeFeedback");
  if (!statusEl) return;
  const buyBtn = $("#buyProBtn");
  if (buyBtn) buyBtn.style.display = stored ? "none" : "";
  if (stored) {
    statusEl.textContent = t("licenseActive");
    statusEl.className = "donor-code-status donor-code-status--active";
    if (inputRow)  inputRow.style.display = "none";
    if (inputEl)   { inputEl.disabled = true; inputEl.value = stored; }
    if (revokeBtn) revokeBtn.style.display = "";
    if (feedbackEl) {
      feedbackEl.textContent = t("licenseCodeSuccess");
      feedbackEl.className = "donor-feedback donor-feedback--ok";
    }
  } else {
    statusEl.textContent = t("licenseInactive");
    statusEl.className = "donor-code-status";
    if (inputRow)  inputRow.style.display = "";
    if (inputEl)   { inputEl.disabled = false; inputEl.value = ""; }
    if (revokeBtn) revokeBtn.style.display = "none";
    if (feedbackEl) { feedbackEl.textContent = ""; feedbackEl.className = "donor-feedback"; }
  }
}

function revokeLicenseCode() {
  if (!confirm(t("licenseRevokeConfirm"))) return;
  try { localStorage.removeItem(LICENSE_KEY); } catch (_) {}
  renderLicenseStatus();
  onLicenseChanged();
}

window.generateDonorCode = async function(seed) {
  const base  = (await sha256hex(DONOR_SECRET + "seed-" + seed)).slice(0, 8).toUpperCase();
  const check = (await sha256hex(DONOR_SECRET + base)).slice(0, 4).toUpperCase();
  return `SGM-${base.slice(0, 4)}-${base.slice(4, 8)}-${check}`;
};

async function redeemDonationCode() {
  const input = $("#donorCodeInput");
  if (!input) return;
  const raw = input.value.trim();
  if (!raw) return;
  const valid = await validateDonationCode(raw);
  const feedbackEl = $("#donorCodeFeedback");
  if (valid) {
    safeLocalStorageSet(DONOR_CODE_KEY, raw.toUpperCase());
    Logger.info("donor", "Gültiger Spenden-Code eingelöst");
    if (feedbackEl) {
      feedbackEl.textContent = t("donorCodeSuccess");
      feedbackEl.className = "donor-feedback donor-feedback--ok";
    }
    renderDonorCodeStatus();
    nagHide();
  } else {
    Logger.warn("donor", "Ungültiger Spenden-Code eingegeben");
    if (feedbackEl) {
      feedbackEl.textContent = t("donorCodeInvalid");
      feedbackEl.className = "donor-feedback donor-feedback--err";
    }
  }
}

function renderDonorCodeStatus() {
  const stored   = localStorage.getItem(DONOR_CODE_KEY);
  const statusEl = $("#donorCodeStatus");
  const inputRow = $("#donorCodeInputRow");
  const inputEl  = $("#donorCodeInput");
  const feedbackEl = $("#donorCodeFeedback");
  if (!statusEl) return;
  if (stored) {
    statusEl.textContent = t("donorCodeActive");
    statusEl.className = "donor-code-status donor-code-status--active";
    if (inputRow) inputRow.style.display = "none";
    if (inputEl)  { inputEl.disabled = true; inputEl.value = stored; }
    if (feedbackEl) {
      feedbackEl.textContent = t("donorCodeSuccess");
      feedbackEl.className = "donor-feedback donor-feedback--ok";
    }
  } else {
    statusEl.textContent = "";
    statusEl.className = "donor-code-status";
    if (inputRow) inputRow.style.display = "";
    if (inputEl)  { inputEl.disabled = false; inputEl.value = ""; }
    if (feedbackEl) { feedbackEl.textContent = ""; feedbackEl.className = "donor-feedback"; }
  }
}

function revokeDonationCode() {
  if (!confirm(t("donorCodeRevokeConfirm"))) return;
  try { localStorage.removeItem(DONOR_CODE_KEY); } catch (_) {}
  renderDonorCodeStatus();
}

/* ============================================================
   Nag-Toast — kleiner Hinweis mit Spendenbutton, alle 5–15 min
   ============================================================ */
function nagShouldSuppress() {
  if (isProUser()) return true;
  if (localStorage.getItem(DONOR_CODE_KEY)) return true;
  const donated = Number(localStorage.getItem(NAG_DONATED_KEY) || 0);
  if (donated && Date.now() - donated < NAG_DONATED_GRACE_MS) return true;
  return false;
}

function nagShow() {
  if (nagShouldSuppress()) return;
  const toast = $("#nagToast");
  if (!toast) return;
  toast.classList.remove("hidden");
  // Sanfter Slide-In-Effekt
  requestAnimationFrame(() => toast.classList.add("nag-visible"));
  Logger.info("ui", "Nag-Toast angezeigt");
}

function nagHide() {
  const toast = $("#nagToast");
  if (!toast) return;
  toast.classList.remove("nag-visible");
  setTimeout(() => toast.classList.add("hidden"), 220);
}

function nagDismiss(reason) {
  safeLocalStorageSet(NAG_DISMISSED_KEY, Date.now());
  Logger.info("ui", `Nag-Toast geschlossen (${reason || "manuell"})`);
  nagHide();
  scheduleNextNag();
}

function nagDonate() {
  safeLocalStorageSet(NAG_DONATED_KEY, Date.now());
  Logger.info("ui", "Spendenbutton geklickt");
  try {
    window.open(DONATION_URL, "_blank", "noopener");
  } catch (error) {
    Logger.warn("ui", "Konnte Spendenlink nicht öffnen", { error: String(error) });
  }
  nagHide();
}

function nagShowNow() {
  // Test-Helfer: ignoriert Suppression
  const toast = $("#nagToast");
  if (!toast) return;
  toast.classList.remove("hidden");
  requestAnimationFrame(() => toast.classList.add("nag-visible"));
  Logger.info("ui", "Nag-Toast manuell angezeigt (Test)");
}

function nagReset() {
  try { localStorage.removeItem(NAG_DISMISSED_KEY); } catch (_) {}
  try { localStorage.removeItem(NAG_DONATED_KEY); } catch (_) {}
  Logger.info("ui", "Nag-Sperre zurückgesetzt");
  alert(t("nagResetConfirm"));
  scheduleNextNag();
}

function scheduleNextNag() {
  if (nagShouldSuppress()) return;
  const delay = NAG_MIN_DELAY_MS + Math.random() * (NAG_MAX_DELAY_MS - NAG_MIN_DELAY_MS);
  setTimeout(() => {
    if (nagShouldSuppress()) return;
    // Nicht stören, wenn gerade ein Dialog offen ist
    const dialogOpen = document.querySelector("dialog[open]");
    if (dialogOpen) {
      scheduleNextNag();
      return;
    }
    nagShow();
  }, delay);
}

function resetUserLabels() {
  if (!confirm(t("confirmResetLabels"))) return;
  userLabels = {};
  saveUserLabels();
  Logger.info("ui", "Alle Label-Overrides entfernt");
  applyTranslations();
  renderAll();
  if (currentView === "wishlist") renderWishlist();
  renderLabelsEditor();
}

function renderLogsList() {
  const list = $("#logsList");
  const count = $("#logsCount");
  if (!list) return;
  const entries = Logger.all().slice().reverse();
  if (count) count.textContent = `${entries.length} ${t("logsCount")}`;

  if (!entries.length) {
    list.innerHTML = `<div class="logs-empty">${t("logsEmpty")}</div>`;
    return;
  }

  list.innerHTML = entries.map((entry) => {
    const ts = entry.ts.replace("T", " ").replace(/\..*$/, "");
    const detailText = entry.details ? JSON.stringify(entry.details, null, 2) : "";
    return `
      <div class="log-entry log-${escapeAttribute(entry.level)}">
        <div class="log-head">
          <span class="log-time">${escapeHtml(ts)}</span>
          <span class="log-level log-level-${escapeAttribute(entry.level)}">${escapeHtml(entry.level.toUpperCase())}</span>
          <span class="log-category">${escapeHtml(entry.category)}</span>
        </div>
        <div class="log-message">${escapeHtml(entry.message)}</div>
        ${detailText ? `<pre class="log-details">${escapeHtml(detailText)}</pre>` : ""}
      </div>
    `;
  }).join("");
}

function exportLogs() {
  const blob = new Blob([Logger.export()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `studio-gear-manager-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
  Logger.info("ui", "Logs exportiert");
}

function clearLogs() {
  if (!confirm(t("confirmClearLogs"))) return;
  Logger.clear();
  Logger.info("ui", "Logs geleert");
  renderLogsList();
}

function renderFieldToggleList(view, container) {
  if (!container) return;
  container.innerHTML = getFieldDefs(view).map((field) => {
    const checked = viewSettings[view]?.[field.key] ? "checked" : "";
    return `
      <label class="field-toggle ${field.custom ? "is-custom" : ""}">
        <input type="checkbox" data-view="${view}" data-field="${escapeAttribute(field.key)}" ${checked}>
        <span>${escapeHtml(fieldLabel(field))}</span>
      </label>
    `;
  }).join("");

  container.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      const viewName = input.dataset.view;
      const fieldName = input.dataset.field;
      viewSettings[viewName][fieldName] = input.checked;
      saveViewSettings();
      renderGrid();
    });
  });
}

function resetViewSettings() {
  viewSettings = clonePlain(defaultViewSettings);
  saveViewSettings();
  renderViewSettingsControls();
  renderGrid();
}

function switchSettingsTab(tabName) {
  document.querySelectorAll(".settings-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.settingsTab === tabName);
  });
  document.querySelectorAll(".settings-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.settingsPanel === tabName);
  });
  // Titel zeigt den aktiven Tab (vorher stand immer „Setup / Farben" da)
  const titleEl = document.querySelector('#settingsDialog [data-i18n="settingsTitle"]');
  const activeBtn = document.querySelector(`.settings-tab[data-settings-tab="${tabName}"]`);
  if (titleEl && activeBtn) titleEl.textContent = `${t("settingsTitle")} / ${activeBtn.textContent.trim()}`;
  document.querySelector("#settingsDialog .settings-content")?.scrollTo(0, 0);
}




function toDateInputValue(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return "";
}

function formatDisplayDate(value) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}.${month}.${year}`;
  }
  return value;
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const seedDevices = [
  {
    id: 1,
    rating: 4,
    name: "Roland JV-1080",
    manufacturer: "Roland",
    model: "JV-1080",
    category: "Synthesizer / Rackmodul",
    type: "Digitaler Synthesizer / Soundmodul",
    subcategory: "Rackmodul",
    status: "Aktiv",
    condition: "Gebraucht / mit Defekten",
    location: "Studio Rack 1",
    image: "https://images.reverb.com/image/upload/s--Z0SjmTeh--/a_0/f_auto,t_large/v1688654894/yl9lbqmdfkswzqt4uzje.jpg",
    purchaseYear: 2021,
    purchasePrice: 390,
    warranty: "12 Monate",
    warrantyUntil: "abgelaufen",
    marketMin: 420,
    marketMax: 480,
    marketMedian: 449,
    lastChecked: "26.04.2026",
    confidence: "mittel",
    audio: { outputs: "6, davon Main L/R + 4 Einzelausgänge", inputs: "keine", connector: "6,3 mm Klinke", level: "Line" },
    midi: { in: "ja", out: "ja", thru: "ja", usb: "nein", channel: "3", pc: "ja", msb: "", lsb: "", sysex: "ja" },
    power: { summary: "12V, 1,5A, 60W", psu: "intern", connector: "Kaltgerät", voltage: "230V" },
    notes: "Sehr guter Brot-und-Butter-Synth, besonders für Pads und 90er-Layer. Knöpfe Volume und Cutoff sind defekt.",
    docs: [
      { name: "Bedienungsanleitung", type: "PDF", link: "https://www.roland.com/global/support/by_product/jv-1080/owners_manuals/" },
      { name: "MIDI Implementation Chart", type: "PDF", link: "https://www.roland.com/global/support/by_product/jv-1080/owners_manuals/" },
      { name: "Kaufbeleg", type: "PDF/JPG", link: "" },
    ],
  },
  {
    id: 2,
    rating: 5,
    name: "Elektron Digitakt",
    manufacturer: "Elektron",
    model: "Digitakt",
    category: "Drum Machine / Sampler",
    type: "Digital Drum Computer",
    subcategory: "Sampler / Drum Machine",
    status: "Aktiv",
    condition: "Sehr gut",
    location: "Desktop rechts",
    image: "https://images.reverb.com/image/upload/s--Vzmp6vli--/f_auto,t_large/v1687205136/csuuggrmfotfvnximwdx.jpg",
    purchaseYear: 2022,
    purchasePrice: 520,
    warranty: "24 Monate",
    warrantyUntil: "abgelaufen",
    marketMin: 430,
    marketMax: 540,
    marketMedian: 489,
    lastChecked: "26.04.2026",
    confidence: "hoch",
    audio: { outputs: "Main L/R + Kopfhörer", inputs: "2 Audio-Eingänge", connector: "6,3 mm Klinke", level: "Line" },
    midi: { in: "ja", out: "ja", thru: "ja", usb: "ja", channel: "10", pc: "ja", msb: "", lsb: "", sysex: "ja" },
    power: { summary: "12V DC", psu: "extern", connector: "Hohlstecker", voltage: "12V" },
    notes: "Zentrale Drum- und Sample-Maschine. Sehr gut für schnelle Pattern-Ideen.",
    docs: [{ name: "Manual", type: "PDF", link: "https://www.elektron.se/support" }],
  },
  {
    id: 3,
    rating: 4,
    name: "Squarp Hapax",
    manufacturer: "Squarp",
    model: "Hapax",
    category: "Sequencer / MIDI-Zentrale",
    type: "Hardware Sequencer",
    subcategory: "MIDI-Zentrale",
    status: "Aktiv",
    condition: "Sehr gut",
    location: "Desktop Mitte",
    image: "https://images.reverb.com/image/upload/s--lcjPdh8a--/f_auto,t_large/v1717164790/jfgicsrduayxfmpghgab.jpg",
    purchaseYear: 2024,
    purchasePrice: 930,
    warranty: "24 Monate",
    warrantyUntil: "läuft",
    marketMin: 780,
    marketMax: 930,
    marketMedian: 849,
    lastChecked: "26.04.2026",
    confidence: "mittel",
    audio: { outputs: "keine", inputs: "keine", connector: "—", level: "—" },
    midi: { in: "ja", out: "mehrere", thru: "über Routing", usb: "ja", channel: "multi", pc: "ja", msb: "projektabhängig", lsb: "projektabhängig", sysex: "teilweise" },
    power: { summary: "USB-C / Netzteil", psu: "extern", connector: "USB-C", voltage: "5V" },
    notes: "Zentrale Steuerung für MIDI-Setups, Program Changes und komplexe Song-Strukturen.",
    docs: [{ name: "Manual", type: "PDF", link: "https://squarp.net/hapax/manual/" }],
  },
  {
    id: 4,
    name: "Eventide H9",
    manufacturer: "Eventide",
    model: "H9",
    category: "Effektgerät",
    type: "Multi-Effektpedal",
    subcategory: "Pedal / Send FX",
    status: "Aktiv",
    condition: "Gut",
    location: "Pedalboard / Send FX",
    image: "https://images.reverb.com/image/upload/s--R7PXYeXb--/f_auto,t_large/v1663864926/uzt7sw5pcvcpnsmbmz4w.jpg",
    purchaseYear: 2020,
    purchasePrice: 430,
    warranty: "12 Monate",
    warrantyUntil: "abgelaufen",
    marketMin: 330,
    marketMax: 430,
    marketMedian: 379,
    lastChecked: "26.04.2026",
    confidence: "mittel",
    audio: { outputs: "Stereo Out L/R", inputs: "Stereo In L/R", connector: "6,3 mm Klinke", level: "Instrument / Line" },
    midi: { in: "ja", out: "ja", thru: "nein", usb: "ja", channel: "5", pc: "ja", msb: "", lsb: "", sysex: "ja" },
    power: { summary: "9V DC, 500 mA", psu: "extern", connector: "Hohlstecker", voltage: "9V" },
    notes: "Sehr flexibel für Modulation, Delay und Reverb. Besonders nützlich als Send-Effekt.",
    docs: [{ name: "Manual", type: "PDF", link: "https://www.eventideaudio.com/support/downloads/" }],
  },
  {
    id: 5,
    name: "Korg Minilogue XD",
    manufacturer: "Korg",
    model: "Minilogue XD",
    category: "Synthesizer",
    type: "Analoger Poly-Synthesizer",
    subcategory: "Keyboard-Synthesizer",
    status: "Aktiv",
    condition: "Sehr gut",
    location: "Keyboard-Stand links",
    image: "https://images.reverb.com/image/upload/s--EafRY6ob--/f_auto,t_large/v1550791539/x7fcpyjfxmzmsksigwml.jpg",
    purchaseYear: 2023,
    purchasePrice: 480,
    warranty: "24 Monate",
    warrantyUntil: "läuft",
    marketMin: 430,
    marketMax: 560,
    marketMedian: 499,
    lastChecked: "26.04.2026",
    confidence: "hoch",
    audio: { outputs: "Stereo Out L/R", inputs: "Audio In", connector: "6,3 mm Klinke", level: "Line" },
    midi: { in: "ja", out: "ja", thru: "nein", usb: "ja", channel: "2", pc: "ja", msb: "", lsb: "", sysex: "ja" },
    power: { summary: "9V DC", psu: "extern", connector: "Hohlstecker", voltage: "9V" },
    notes: "Sehr direkter Synth für schnelle Ideen, Pads und Sequenzen.",
    docs: [{ name: "Manual", type: "PDF", link: "https://www.korg.com/support/download/" }],
  },
  {
    id: 6,
    name: "MOTU M4",
    manufacturer: "MOTU",
    model: "M4",
    category: "Audiointerface",
    type: "USB-Audiointerface",
    subcategory: "Desktop-Interface",
    status: "Aktiv",
    condition: "Sehr gut",
    location: "Desktop links",
    image: "https://images.reverb.com/image/upload/s--BZMZ7swU--/f_auto,t_large/v1581388418/e1i8ldl93f5gsgm5oc9t.jpg",
    purchaseYear: 2022,
    purchasePrice: 240,
    warranty: "24 Monate",
    warrantyUntil: "abgelaufen",
    marketMin: 180,
    marketMax: 240,
    marketMedian: 219,
    lastChecked: "26.04.2026",
    confidence: "hoch",
    audio: { outputs: "4 Line-Outs + Kopfhörer", inputs: "2 Mic/Line/Instrument + 2 Line", connector: "XLR/Klinke Combo, 6,3 mm Klinke", level: "Mic / Instrument / Line" },
    midi: { in: "ja", out: "ja", thru: "nein", usb: "ja", channel: "—", pc: "—", msb: "", lsb: "", sysex: "—" },
    power: { summary: "USB-C Bus-Powered", psu: "USB", connector: "USB-C", voltage: "5V" },
    notes: "Kompaktes Interface mit sehr guter Pegelanzeige.",
    docs: [{ name: "Manual", type: "PDF", link: "https://motu.com/en-us/download/" }],
  },
];

// Daten werden im async Boot über loadDevicesAsync()/loadWishlistAsync() befüllt.
let devices = [];
let wishlist = [];
let currentView = "library";
let editingWishlistId = null;
let pendingWishlistImage = "";
// Wishlist-eigene Filter-/Sort-/View-State (unabhängig von der Library)
let wishlistSearchQuery = "";
let wishlistSortField = "added";
let wishlistSortDirection = "desc";
let wishlistCurrentCategory = "Alle";
let wishlistCurrentSubcategory = "";
let wishlistViewMode = "grid";
let pendingWishlistLogo = "";
let lang = localStorage.getItem(LANG_KEY) || "de";
let selectedId = null;
let activeTab = "overview";
let editingId = null;
let pendingDocs              = [];
let pendingManufacturerLogo = "";
let pendingDeviceImage      = "";   // Safari-safe: Base64-Fotos nicht im text-input lagern
let pendingDeviceImages     = [];   // Pro: mehrere Bilder [ {src, name} ]
let _galleryDragSrcIdx      = null; // Drag & Drop Quellindex
let currentCategory    = "Alle";
let categoryFilterMode = localStorage.getItem("sgm.catMode") || "chips"; // "chips" | "dropdown"
let searchQuery = "";
let currentSubcategory = "";
let viewMode = "grid";
let sortField = "added";
let sortDirection = "desc";

const $ = (selector) => document.querySelector(selector);

const tabKeys = ["overview", "audio", "midi", "power", "value", "documents", "notes"];

// Alias-Tabelle: Anzeige-Keys (für Karten- und Listenansicht) fallen auf die
// schlanken Keys aus dem Eingabedialog zurück, falls dort ein User-Override existiert.
// So reicht es, im Setup einmal "Status" oder "Modell" umzubenennen — die Änderung
// wirkt überall (Eingabedialog, Detailansicht, Karten, Liste, View-Settings).
const labelAliasFromFieldKey = {
  fieldManufacturerLogo: "manufacturerLogo",
  fieldDeviceName: "name",
  fieldManufacturer: "manufacturer",
  fieldModel: "model",
  fieldSerialNumber: "serialNumber",
  fieldFirmwareVersion: "firmwareVersion",
  fieldDeviceType: "type",
  fieldSubcategory: "subcategory",
  fieldStatus: "status",
  fieldCondition: "condition",
  fieldLocation: "location",
  fieldPurchaseYear: "purchaseYear",
  fieldPurchasePrice: "purchasePrice",
  fieldWarrantyUntil: "warrantyUntil",
  fieldMarketMin: "marketMin",
  fieldMarketMax: "marketMax",
  fieldMarketMedian: "marketMedian",
  fieldLastChecked: "lastChecked",
  fieldAudioOutputs: "audioOutputs",
  fieldAudioInputs: "audioInputs",
  fieldConnector: "connector",
  fieldLevel: "level",
  fieldMidiIn: "midiIn",
  fieldMidiOut: "midiOut",
  fieldMidiThru: "midiThru",
  fieldUsbMidi: "usbMidi",
  fieldMidiChannel: "midiChannel",
  fieldProgramChange: "programChange",
  fieldPowerData: "powerData",
  fieldPsu: "psu",
  fieldPowerConnector: "powerConnector",
  fieldVoltage: "voltage",
  fieldNotes: "notes",
  fieldDocuments: "documents",
  fieldRating: "rating",
};

function t(key) {
  // 1. Direkter User-Override
  if (userLabels && Object.prototype.hasOwnProperty.call(userLabels, key)) {
    const overridden = userLabels[key];
    if (overridden !== undefined && overridden !== null && overridden !== "") return overridden;
  }
  // 2. Alias-Override: field* fällt auf den schlanken Key zurück
  const alias = labelAliasFromFieldKey[key];
  if (alias && userLabels && Object.prototype.hasOwnProperty.call(userLabels, alias)) {
    const aliased = userLabels[alias];
    if (aliased !== undefined && aliased !== null && aliased !== "") return aliased;
  }
  // 3. Sprachstandard
  return i18n[lang][key] || i18n.de[key] || key;
}

function loadDevices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeDevices(seedDevices);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return normalizeDevices(seedDevices);
    return normalizeDevices(parsed);
  } catch (error) {
    console.error("Could not load saved devices:", error);
    return normalizeDevices(seedDevices);
  }
}

function normalizeDevices(items) {
  return items.map((device, index) => ({
    rating: Number(device.rating || 0),
    ...device,
    category: device.category || "",
    subcategory: device.subcategory || "",
    manufacturerLogo: device.manufacturerLogo || "",
    warranty: "",
    warrantyUntil: toDateInputValue(device.warrantyUntil),
    confidence: "",
    docs: normalizeDocs(device.docs || []),
    midi: { ...(device.midi || {}), sysex: "" },
    formFactor: device.formFactor || "",
    links: typeof device.links === "string" ? device.links : "",
    custom: device.custom && typeof device.custom === "object" ? device.custom : {},
    // Früher bekamen die ersten drei Geräte bei Rating 0 feste Demo-Werte (4/5/4) — das
    // überschrieb echte Nutzer-Bewertungen bei jedem Laden. Demo-Ratings stehen jetzt in seedDevices.
    rating: Math.max(0, Math.min(5, Number(device.rating) || 0)),
  }));
}

function normalizeDocs(docs) {
  return (docs || []).map((doc) => ({
    id: doc.id || Date.now() + Math.random(),
    name: doc.name || doc.documentName || "Dokument",
    type: doc.type || doc.mimeType || "",
    filename: doc.filename || "",
    size: doc.size || 0,
    dataUrl: doc.dataUrl || "",
    link: doc.link || "",
  }));
}

function saveDevices() {
  if (_dbAvailable) {
    dbPut(DB_DEVICES_KEY, devices)
      .then(() => { Logger.info("storage", "Geräte gespeichert (IndexedDB)", { count: devices.length }); scheduleAutoBackup(); })
      .catch((error) => {
        if (isQuotaError(error)) {
          Logger.error("storage.quota", "IndexedDB-Quota überschritten beim Speichern der Geräte", { count: devices.length });
          showQuotaError();
        } else {
          Logger.error("storage", "IndexedDB-Schreibfehler (devices)", { error: String(error) });
          showAppError(`Speicherfehler: ${error?.message || error}`);
        }
      });
    return true;
  }
  return safeStorageWrite(STORAGE_KEY, devices, "devices", devices.length);
}

async function loadDevicesAsync() {
  if (_dbAvailable) {
    try {
      const data = await dbGet(DB_DEVICES_KEY);
      if (Array.isArray(data)) {
        Logger.info("storage", `Geräte aus IndexedDB geladen`, { count: data.length });
        return normalizeDevices(data);
      }
    } catch (error) {
      Logger.error("storage", "IndexedDB-Lesefehler (devices) — Fallback auf localStorage", { error: String(error) });
    }
  }
  // Fallback localStorage (auch nach Migration als Sicherheitsnetz vorhanden)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        Logger.info("storage", `Geräte aus localStorage geladen (Fallback)`, { count: parsed.length });
        return normalizeDevices(parsed);
      }
    }
  } catch (error) {
    Logger.warn("storage", "localStorage-Lesefehler (devices)", { error: String(error) });
  }
  return [];
}

function isQuotaError(error) {
  if (!error) return false;
  return error.name === "QuotaExceededError" ||
         error.code === 22 ||
         error.code === 1014 ||
         /quota/i.test(error.message || "");
}

function approxByteLength(value) {
  try { return new Blob([value]).size; } catch (_) { return value.length; }
}

function safeStorageWrite(key, value, category, count) {
  let payload = "";
  try {
    payload = typeof value === "string" ? value : JSON.stringify(value);
  } catch (error) {
    Logger.error("storage", `Konnte ${category} nicht serialisieren`, { error: String(error) });
    return false;
  }

  try {
    localStorage.setItem(key, payload);
    Logger.info("storage", `Gespeichert: ${category}`, {
      bytes: approxByteLength(payload),
      count: count ?? null,
    });
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      Logger.error("storage.quota", `Speicher voll beim Schreiben von ${category}`, {
        bytes: approxByteLength(payload),
        count: count ?? null,
      });
      showQuotaError();
    } else {
      Logger.error("storage", `Schreibfehler bei ${category}`, { error: String(error) });
      showAppError(`Speicherfehler: ${error.message || error}`);
    }
    return false;
  }
}

/**
 * Defensives localStorage-Set für kleine Schlüssel (Sprache, View, Nag, Setup-Flag).
 * Wirft NIE — bei Quota-Fehlern wird nur ins Log geschrieben.
 */
function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    Logger.warn("storage.local", `Konnte ${key} nicht schreiben`, { error: String(error?.message || error) });
    return false;
  }
}

function showQuotaError() {
  const message = (lang === "de"
    ? "Browser-Speicher voll. Aktion wurde nicht gespeichert. Bitte zuerst ein Backup als JSON exportieren und anschließend Geräte oder Bilder entfernen, um Platz zu schaffen."
    : "Browser storage is full. The action was NOT saved. Please export a JSON backup first and then remove devices or images to free space.");
  showAppError(message);
}

function showFreeLimitDialog() {
  const existingEl = document.getElementById("freeLimitDialog");
  if (existingEl) existingEl.remove();

  const text = t("freeLimitText").replace("{n}", FREE_DEVICE_LIMIT);
  const el = document.createElement("dialog");
  el.id = "freeLimitDialog";
  el.style.cssText = "background:#111118;color:#e2e8f0;border:1px solid #1e1e2e;border-radius:12px;padding:32px;max-width:400px;width:90%";
  el.innerHTML = `
    <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:12px;color:#f87171">${t("freeLimitTitle")}</h2>
    <p style="margin-bottom:20px;line-height:1.6;color:#94a3b8">${text}</p>
    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
      <button id="freeLimitUpgradeBtn" style="background:#f59e0b;color:#000;border:none;border-radius:8px;padding:9px 18px;font-weight:700;cursor:pointer">${t("freeLimitUpgrade")} ⭐</button>
      <button id="freeLimitLicenseBtn" style="background:#1e1e2e;color:#fcd34d;border:1px solid #92400e;border-radius:8px;padding:9px 18px;cursor:pointer">${t("freeLimitEnterLicense")}</button>
      <button id="freeLimitCloseBtn" style="background:#1e1e2e;color:#e2e8f0;border:1px solid #374151;border-radius:8px;padding:9px 18px;cursor:pointer">${t("freeLimitClose")}</button>
    </div>`;
  document.body.appendChild(el);
  el.showModal();
  document.getElementById("freeLimitCloseBtn").onclick = () => el.close();
  document.getElementById("freeLimitLicenseBtn").onclick = () => {
    el.close();
    $("#deviceDialog")?.close();
    openSettingsDialog();
    switchSettingsTab("license");
    renderLicenseStatus();
    setTimeout(() => $("#licenseCodeInput")?.focus(), 50);
  };
  document.getElementById("freeLimitUpgradeBtn").onclick = () => {
    el.close();
    if (PRO_SHOP_URL) window.open(PRO_SHOP_URL, "_blank", "noopener");
    else showProOrderDialog();
  };
}

/* ============================================================
   Pro bestellen — Formular (Name, E-Mail, Kauf-Bestätigung)
   Versand an order.php; ohne Server (lokal/file://) per E-Mail-Programm.
   Die Lizenz wird danach manuell im Code-Generator erzeugt.
   ============================================================ */
function showProOrderDialog() {
  document.getElementById("proOrderDialog")?.remove();
  const price = formatPrice(PRO_PRICE);
  const el = document.createElement("dialog");
  el.id = "proOrderDialog";
  el.className = "pro-order-dialog";
  el.innerHTML = `
    <form method="dialog" class="pro-order-form" novalidate>
      <button type="button" class="pro-order-close" aria-label="${escapeAttribute(t("cancel"))}">×</button>
      <h2>${escapeHtml(t("proOrderTitle"))} ⭐</h2>
      <p class="pro-order-intro">${escapeHtml(t("proOrderIntro"))}</p>
      <ul class="pro-order-features">
        ${["proOrderFeat1", "proOrderFeat2", "proOrderFeat3", "proOrderFeat4"].map((k) => `<li>${escapeHtml(t(k))}</li>`).join("")}
      </ul>
      <label class="pro-order-field"><span>${escapeHtml(t("proOrderName"))}</span>
        <input name="name" type="text" autocomplete="name" maxlength="120" required></label>
      <label class="pro-order-field"><span>${escapeHtml(t("proOrderEmail"))}</span>
        <input name="email" type="email" autocomplete="email" maxlength="160" required></label>
      <input name="website" type="text" tabindex="-1" autocomplete="off" class="pro-order-hp" aria-hidden="true">
      <label class="pro-order-check">
        <input name="accept" type="checkbox" required>
        <span>${escapeHtml(t("proOrderAccept").replace("{price}", price))}</span>
      </label>
      <p class="pro-order-note">${escapeHtml(t("proOrderNote"))}</p>
      <p class="pro-order-feedback" role="status"></p>
      <div class="pro-order-actions">
        <button type="button" class="pro-order-cancel">${escapeHtml(t("cancel"))}</button>
        <button type="submit" class="pro-order-submit">${escapeHtml(t("proOrderSubmit"))}</button>
      </div>
    </form>`;
  document.body.appendChild(el);
  el.showModal();

  const form = el.querySelector("form");
  const feedback = el.querySelector(".pro-order-feedback");
  const submitBtn = el.querySelector(".pro-order-submit");
  const close = () => { el.close(); el.remove(); };
  el.querySelector(".pro-order-close").onclick = close;
  el.querySelector(".pro-order-cancel").onclick = close;
  setTimeout(() => form.elements.name.focus(), 30);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const accept = form.elements.accept.checked;
    const showError = (key, field) => {
      feedback.textContent = t(key).replace("{price}", price);
      feedback.className = "pro-order-feedback err";
      field?.focus();
    };
    if (!name) return showError("proOrderErrName", form.elements.name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError("proOrderErrEmail", form.elements.email);
    if (!accept) return showError("proOrderErrAccept", form.elements.accept);

    submitBtn.disabled = true;
    feedback.textContent = t("proOrderSending");
    feedback.className = "pro-order-feedback";
    const payload = { name, email, accept: true, lang, version: APP_VERSION, website: form.elements.website.value };
    let sent = false;
    if (location.protocol !== "file:") {
      try {
        const res = await fetch("order.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) sent = true;
        else if (data?.error === "rate") { submitBtn.disabled = false; return showError("proOrderErrRate"); }
      } catch (_) { /* Server/PHP nicht erreichbar → E-Mail-Fallback */ }
    }
    if (sent) {
      Logger.info("license", "Pro-Bestellung gesendet");
      form.innerHTML = `
        <h2>${escapeHtml(t("proOrderThanksTitle"))} 🎉</h2>
        <p class="pro-order-intro">${escapeHtml(t("proOrderThanksText").replace("{email}", email))}</p>
        <div class="pro-order-actions"><button type="button" class="pro-order-submit">${escapeHtml(t("freeLimitClose"))}</button></div>`;
      form.querySelector("button").onclick = close;
      return;
    }
    // Fallback: vorausgefüllte E-Mail im E-Mail-Programm
    const subject = `Studio Gear Manager Pro – ${t("proOrderTitle")}`;
    const body = `${t("proOrderName")}: ${name}\n${t("proOrderEmail")}: ${email}\n${t("proOrderAccept").replace("{price}", price)}: ✓\nApp: ${APP_VERSION}`;
    window.location.href = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    submitBtn.disabled = false;
    feedback.textContent = t("proOrderMailFallback").replace("{mail}", ORDER_EMAIL);
    feedback.className = "pro-order-feedback";
  });
}

function formatPrice(value) {
  return `${Number(value).toLocaleString(lang === "de" ? "de-DE" : "en-US")} €`;
}

/** true = Free-Limit erreicht (Dialog wird angezeigt). Zentral für Neu, Duplizieren, Übernahme. */
function freeLimitReached() {
  if (isProUser() || FREE_DEVICE_LIMIT <= 0 || devices.length < FREE_DEVICE_LIMIT) return false;
  showFreeLimitDialog();
  return true;
}

function currencySymbol() {
  return lang === "de" ? "€" : "$";
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString(lang === "de" ? "de-DE" : "en-US")} ${currencySymbol()}`;
}

function getSearchTitle(device) {
  return [device.manufacturer, device.model || device.name].filter(Boolean).join(" ").trim();
}

function encodeQuery(value) {
  return encodeURIComponent(value);
}

function issueDetected(device) {
  return (device.notes || "").toLowerCase().includes("defekt") ||
         (device.notes || "").toLowerCase().includes("defect") ||
         (device.condition || "").toLowerCase().includes("defekt");
}

function applyTranslations() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    const value = t(key);
    // Fehlender Schlüssel (t() liefert den Key selbst) → Text aus der HTML behalten
    if (value && value !== key) node.textContent = value;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const value = t(node.getAttribute("data-i18n-placeholder"));
    if (value) node.setAttribute("placeholder", value);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const key = node.getAttribute("data-i18n-title");
    const value = t(key);
    if (value) {
      node.setAttribute("title", value);
      node.setAttribute("aria-label", value);
    }
  });
  // Währungs-Icons in Stat-Cards locale-abhängig setzen
  document.querySelectorAll("[data-currency-icon]").forEach((node) => {
    node.textContent = currencySymbol();
  });
  const vTitle = $("#appVersionTitle");
  if (vTitle) vTitle.textContent = `v${APP_VERSION}`;
  if ($("#languageToggle")) $("#languageToggle").textContent = lang === "de" ? "EN" : "DE";
  if ($("#searchInput")) $("#searchInput").placeholder = t("searchPlaceholder");
  if ($("#wishlistSearchInput")) $("#wishlistSearchInput").placeholder = t("wishlistSearchPlaceholder");
  document.querySelectorAll("#sortFieldSelect option[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    node.textContent = t(key);
  });
  if ($("#sortAscBtn")) {
    $("#sortAscBtn").title = t("sortAsc");
    $("#sortAscBtn").setAttribute("aria-label", t("sortAsc"));
  }
  if ($("#sortDescBtn")) {
    $("#sortDescBtn").title = t("sortDesc");
    $("#sortDescBtn").setAttribute("aria-label", t("sortDesc"));
  }
  renderCustomSortOptions();
  renderSortState();
  const allSubOption = document.querySelector('#subcategoryFilterSelect option[value=""]');
  if (allSubOption) allSubOption.textContent = t("allSubcategories");
  renderCategories();
  renderSubcategoryFilter();
  renderTabs();
  renderAll();
  const activeSettingsTab = document.querySelector(".settings-tab.active")?.dataset.settingsTab;
  if (activeSettingsTab) switchSettingsTab(activeSettingsTab);
}

function renderCategories() {
  const wrapper = $("#categoryFilters");
  if (!wrapper) return;
  const categories = [t("all"), ...getOrderedCategories()];
  const canonicalAll = lang === "de" ? "Alle" : "All";
  wrapper.innerHTML = "";

  // ── View-Toggle (Grid/List) ────────────────────────────────
  const viewToggle = document.createElement("button");
  viewToggle.className = "view-toggle-chip";
  viewToggle.type = "button";
  viewToggle.title = viewMode === "grid" ? t("switchToList") : t("switchToGrid");
  viewToggle.setAttribute("aria-label", viewToggle.title);
  viewToggle.innerHTML = viewMode === "grid"
    ? `<span class="view-symbol">☷</span>`
    : `<span class="view-symbol">▦</span>`;
  viewToggle.addEventListener("click", () => {
    viewMode = viewMode === "grid" ? "list" : "grid";
    renderAll();
  });
  wrapper.appendChild(viewToggle);

  // ── Kategorie-Modus-Toggle ─────────────────────────────────
  const modeToggle = document.createElement("button");
  modeToggle.className = "view-toggle-chip cat-mode-toggle";
  modeToggle.type = "button";
  modeToggle.title = categoryFilterMode === "chips" ? t("categoryViewDropdown") : t("categoryViewChips");
  modeToggle.innerHTML = categoryFilterMode === "chips" ? "≡▾" : "⬡";
  modeToggle.addEventListener("click", () => {
    categoryFilterMode = categoryFilterMode === "chips" ? "dropdown" : "chips";
    localStorage.setItem("sgm.catMode", categoryFilterMode);
    renderCategories();
  });
  wrapper.appendChild(modeToggle);

  // ── Verkaufte ein-/ausblenden (nur sichtbar, wenn es verkaufte Geräte gibt) ──
  const soldCount = devices.filter(isSold).length;
  if (soldCount) {
    const soldToggle = document.createElement("button");
    soldToggle.className = `view-toggle-chip sold-toggle ${hideSold ? "active" : ""}`;
    soldToggle.type = "button";
    soldToggle.textContent = `${hideSold ? t("showSold") : t("hideSold")} (${soldCount})`;
    soldToggle.addEventListener("click", () => {
      hideSold = !hideSold;
      safeLocalStorageSet(HIDE_SOLD_KEY, hideSold ? "1" : "0");
      renderAll();
    });
    wrapper.appendChild(soldToggle);
  }

  if (categoryFilterMode === "dropdown") {
    // ── Dropdown-Modus ─────────────────────────────────────
    const sel = document.createElement("select");
    sel.className = "category-dropdown";
    categories.forEach((label, i) => {
      const opt = document.createElement("option");
      opt.value = i === 0 ? canonicalAll : label;
      opt.textContent = label;
      if (currentCategory === opt.value || (i === 0 && (currentCategory === "Alle" || currentCategory === "All"))) {
        opt.selected = true;
      }
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      currentCategory = sel.value;
      currentSubcategory = "";
      renderAll();
    });
    wrapper.appendChild(sel);
  } else {
    // ── Chips-Modus (bestehend) ────────────────────────────
    categories.forEach((label, i) => {
      const btn = document.createElement("button");
      btn.className = "filter-chip";
      const isAll = i === 0;
      const isActive = isAll
        ? (currentCategory === "Alle" || currentCategory === "All")
        : currentCategory === label;
      if (isActive) btn.classList.add("active");
      btn.textContent = label;
      btn.addEventListener("click", () => {
        currentCategory = isAll ? canonicalAll : label;
        currentSubcategory = "";
        renderAll();
      });
      wrapper.appendChild(btn);
    });
  }
}

function renderSortState() {
  if ($("#sortFieldSelect")) $("#sortFieldSelect").value = sortField;
  if ($("#sortAscBtn")) $("#sortAscBtn").classList.toggle("active", sortDirection === "asc");
  if ($("#sortDescBtn")) $("#sortDescBtn").classList.toggle("active", sortDirection === "desc");
}


function getAvailableSubcategories() {
  const allLabels = ["Alle", "All"];
  const items = devices.filter((device) => {
    return allLabels.includes(currentCategory) || device.type === currentCategory;
  });

  return [...new Set(items.map((device) => device.subcategory).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), lang === "de" ? "de" : "en", { sensitivity: "base" }));
}

function renderSubcategoryFilter() {
  const select = $("#subcategoryFilterSelect");
  const wrap = $("#subcategoryFilterWrap");
  const combo = document.querySelector(".filter-combo");
  if (!select || !wrap) return;

  const allLabels = ["Alle", "All"];
  const categoryIsAll = allLabels.includes(currentCategory);

  if (categoryIsAll) {
    currentSubcategory = "";
    wrap.classList.add("hidden-by-category");
    combo?.classList.add("no-subcategory");
    select.innerHTML = `<option value="">${t("allSubcategories")}</option>`;
    select.value = "";
    return;
  }

  wrap.classList.remove("hidden-by-category");
  combo?.classList.remove("no-subcategory");

  const subcategories = getAvailableSubcategories();

  if (currentSubcategory && !subcategories.includes(currentSubcategory)) {
    currentSubcategory = "";
  }

  wrap.classList.toggle("is-muted", subcategories.length === 0);

  select.innerHTML = `<option value="">${t("allSubcategories")}</option>` + subcategories.map((subcategory) => {
    const selected = subcategory === currentSubcategory ? "selected" : "";
    return `<option value="${escapeAttribute(subcategory)}" ${selected}>${escapeHtml(subcategory)}</option>`;
  }).join("");

  select.value = currentSubcategory;
}


function midiChannelSortValue(device) {
  const raw = String(device.midi?.channel || "").trim().toLowerCase();
  if (!raw || raw === "—" || raw === "-" || raw === "multi") return Number.POSITIVE_INFINITY;
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}


function getDeviceSortValue(device, key) {
  const cf = findCustomFieldByKey(key);
  if (cf) return customSortValue(device, cf);
  const values = {
    deviceImage: device.image || "",
    manufacturerLogo: device.manufacturerLogo || "",
    name: stripSortPrefix(device.name || ""),
    manufacturer: stripSortPrefix(device.manufacturer || ""),
    model: device.model || "",
    type: device.type || "",
    subcategory: device.subcategory || "",
    formFactor: device.formFactor || "",
    status: device.status || "",
    condition: device.condition || "",
    location: device.location || "",
    purchaseYear: Number(device.purchaseYear || 0),
    purchasePrice: Number(device.purchasePrice || 0),
    warrantyUntil: device.warrantyUntil || "",
    marketMin: Number(device.marketMin || 0),
    marketMax: Number(device.marketMax || 0),
    marketMedian: Number(device.marketMedian || 0),
    lastChecked: device.lastChecked || "",
    audioOutputs: device.audio?.outputs || "",
    audioInputs: device.audio?.inputs || "",
    connector: device.audio?.connector || "",
    level: device.audio?.level || "",
    midiIn: device.midi?.in || "",
    midiOut: device.midi?.out || "",
    midiThru: device.midi?.thru || "",
    usbMidi: device.midi?.usb || "",
    midiChannel: midiChannelSortValue(device),
    programChange: device.midi?.pc || "",
    msb: device.midi?.msb || "",
    lsb: device.midi?.lsb || "",
    powerData: device.power?.summary || "",
    psu: device.power?.psu || "",
    powerConnector: device.power?.connector || "",
    voltage: device.power?.voltage || "",
    notes: device.notes || "",
    documents: normalizeDocs(device.docs || []).length,
    rating: Number(device.rating || 0),
    added: Number(device.id || 0),
    price: Number(device.marketMedian || device.marketMax || device.purchasePrice || 0),
    year:  Number(device.purchaseYear || 0),
    purchaseDate: device.purchaseYear ? String(device.purchaseYear) : "",
  };
  return values[key] ?? "";
}

function compareSortValues(aValue, bValue) {
  const aMissing = aValue === "" || aValue === null || aValue === undefined || aValue === Number.POSITIVE_INFINITY;
  const bMissing = bValue === "" || bValue === null || bValue === undefined || bValue === Number.POSITIVE_INFINITY;

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (typeof aValue === "number" && typeof bValue === "number") {
    return aValue - bValue;
  }

  return String(aValue).localeCompare(String(bValue), lang === "de" ? "de" : "en", { sensitivity: "base", numeric: true });
}

function sortDevices(list) {
  const sorted = [...list];
  const direction = sortDirection === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    const aValue = getDeviceSortValue(a, sortField);
    const bValue = getDeviceSortValue(b, sortField);
    let cmp = compareSortValues(aValue, bValue);

    if (cmp === 0) {
      cmp = String(a.name || "").localeCompare(String(b.name || ""), lang === "de" ? "de" : "en", { sensitivity: "base", numeric: true });
    }

    return cmp * direction;
  });

  return sorted;
}

function getFilteredDevices() {
  const normalizedQuery = normalizeSearchText(searchQuery.trim());
  const allLabels = ["Alle", "All"];
  const filtered = devices.filter((device) => {
    const haystack = normalizeSearchText([
      device.name,
      device.manufacturer,
      device.model,
      device.serialNumber,
      device.firmwareVersion,
      device.type,
      device.subcategory,
      device.location,
      device.status,
      device.condition,
      device.notes,
      device.midi?.channel,
      device.audio?.outputs,
      device.audio?.inputs,
      device.formFactor,
      device.links,
      ...activeCustomFields().map((f) => customRawValue(device, f)),
      ...(device.docs || []).map((doc) => `${doc.name} ${doc.filename} ${doc.type}`),
    ].join(" "));

    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesCategory = allLabels.includes(currentCategory) || device.type === currentCategory;
    const matchesSubcategory = !currentSubcategory || device.subcategory === currentSubcategory;
    const matchesSold = !hideSold || !isSold(device);
    return matchesQuery && matchesCategory && matchesSubcategory && matchesSold;
  });

  return sortDevices(filtered);
}

function renderBackupInfo() {
  const node = $("#lastBackupInfo");
  if (!node) return;
  const last = localStorage.getItem(LAST_BACKUP_KEY);
  if (!last) {
    node.textContent = ` ${t("lastBackupNever")}`;
    return;
  }
  const date = new Date(last);
  node.textContent = ` ${t("lastBackupAt")} ${date.toLocaleString(lang === "de" ? "de-DE" : "en-US")}`;
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

function renderStats() {
  const filtered   = getFilteredDevices();
  const isFiltered = filtered.length !== devices.length;

  // Verkaufte Geräte zählen nicht zum aktuellen Gesamtwert
  const totalValue   = filtered.filter((d) => !isSold(d)).reduce((sum, d) =>
    sum + Number(d.marketMedian || d.purchasePrice || 0), 0);
  const wishlistCount = wishlist.length;
  const issues        = filtered.filter(issueDetected).length;

  setText("#statDevices", isFiltered ? `${filtered.length} / ${devices.length}` : String(devices.length));
  setText("#statValue",   formatCurrency(totalValue));
  setText("#statDocs",    String(wishlistCount));
  setText("#statIssues",  String(issues));
}

function buildRatingStars(device) {
  const current = Number(device.rating || 0);
  return [1, 2, 3, 4, 5].map((value) => {
    const active = value <= current ? "active" : "";
    return `<button class="rating-star ${active}" type="button" data-device-id="${device.id}" data-rating="${value}" aria-label="${t("rating")} ${value}">★</button>`;
  }).join("");
}

function renderRating(device, variant = "detail") {
  const current = Number(device.rating || 0);
  return `
    <div class="rating-row rating-${variant}" aria-label="${t("rating")}">
      <div class="rating-stars">${buildRatingStars(device)}</div>
      <span class="rating-label">${current || "—"}/5</span>
    </div>
  `;
}

function renderCardRatingTop(device) {
  return `<div class="card-rating-top"><div class="rating-stars">${buildRatingStars(device)}</div></div>`;
}

function renderCardRatingBottom(device) {
  const current = Number(device.rating || 0);
  return `<div class="card-rating-bottom"><span class="rating-label">${current || "—"}/5</span></div>`;
}

function setDeviceRating(id, rating) {
  devices = devices.map((device) => {
    if (Number(device.id) !== Number(id)) return device;
    const current = Number(device.rating || 0);
    return { ...device, rating: current === Number(rating) ? 0 : Number(rating) };
  });
  saveDevices();
  renderGrid();
  if (selectedId && Number(selectedId) === Number(id)) renderDetail();
}

function updateSearchVisualState() {
  const input = $("#searchInput");
  if (!input) return;
  input.closest(".search-wrap")?.classList.toggle("has-value", Boolean(input.value.trim()));
}



function getDeviceFieldDisplay(device, key) {
  const cf = findCustomFieldByKey(key);
  if (cf) return escapeHtml(customDisplayText(device, cf));
  const docs = normalizeDocs(device.docs || []);
  const values = {
    deviceImage: device.image ? `<img class="mini-device-image" src="${escapeAttribute(device.image)}" alt="" onerror="this.style.visibility='hidden'">` : "—",
    manufacturerLogo: logoMarkup(device, "manufacturer-logo list-logo-img") || "—",
    name: escapeHtml(device.name || "—"),
    manufacturer: escapeHtml(device.manufacturer || "—"),
    model: escapeHtml(device.model || "—"),
    serialNumber: escapeHtml(device.serialNumber || "—"),
    firmwareVersion: escapeHtml(device.firmwareVersion || "—"),
    type: escapeHtml(device.type || "—"),
    subcategory: escapeHtml(device.subcategory || "—"),
    formFactor: escapeHtml(device.formFactor || "—"),
    status: escapeHtml(device.status || "—"),
    condition: escapeHtml(device.condition || "—"),
    location: escapeHtml(device.location || "—"),
    purchaseYear: escapeHtml(device.purchaseYear || "—"),
    purchasePrice: formatCurrency(device.purchasePrice),
    warrantyUntil: escapeHtml(formatDisplayDate(device.warrantyUntil)),
    marketMin: `${escapeHtml(device.marketMin || "—")} ${currencySymbol()}`,
    marketMax: `${escapeHtml(device.marketMax || "—")} ${currencySymbol()}`,
    marketMedian: `${escapeHtml(device.marketMedian || "—")} ${currencySymbol()}`,
    lastChecked: escapeHtml(device.lastChecked || "—"),
    audioOutputs: escapeHtml(device.audio?.outputs || "—"),
    audioInputs: escapeHtml(device.audio?.inputs || "—"),
    connector: escapeHtml(device.audio?.connector || "—"),
    level: escapeHtml(device.audio?.level || "—"),
    midiIn: escapeHtml(device.midi?.in || "—"),
    midiOut: escapeHtml(device.midi?.out || "—"),
    midiThru: escapeHtml(device.midi?.thru || "—"),
    usbMidi: escapeHtml(device.midi?.usb || "—"),
    midiChannel: escapeHtml(device.midi?.channel || "—"),
    programChange: escapeHtml(device.midi?.pc || "—"),
    msb: escapeHtml(device.midi?.msb || "—"),
    lsb: escapeHtml(device.midi?.lsb || "—"),
    powerData: escapeHtml(device.power?.summary || "—"),
    psu: escapeHtml(device.power?.psu || "—"),
    powerConnector: escapeHtml(device.power?.connector || "—"),
    voltage: escapeHtml(device.power?.voltage || "—"),
    notes: escapeHtml(device.notes || "—"),
    documents: escapeHtml(docs.length ? `${docs.length} ${t("documents")}` : "—"),
    rating: renderReadOnlyStars(device.rating || 0),
  };
  return values[key] ?? "—";
}

function renderGridMetaFields(device) {
  const fields = getFieldDefs("grid").filter((field) => {
    if (["deviceImage", "manufacturerLogo", "name", "type", "subcategory", "rating"].includes(field.key)) return false;
    return viewSettings.grid[field.key];
  });

  return fields.map((field) => `
    <span title="${escapeAttribute(fieldLabel(field))}">
      ${escapeHtml(fieldLabel(field))}: <b>${getDeviceFieldDisplay(device, field.key)}</b>
    </span>
  `).join("");
}

/** CSS-sicherer Spalten-Schlüssel (eigene Felder heißen „cf:…"). */
function listCssKey(key) {
  return String(key).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getVisibleListFields() {
  return getFieldDefs("list").filter((field) => viewSettings.list[field.key]);
}

function renderListView(devicesToShow) {
  const fields = getVisibleListFields();
  const isPro = isProUser();
  const cssKey = listCssKey;

  const header = fields.map((field) => {
    const isActive = sortField === field.key;
    const marker = isActive ? (sortDirection === "asc" ? "↑" : "↓") : "";
    return `
      <button class="list-sort-header ${isActive ? "active" : ""}" type="button" data-sort-field="${escapeAttribute(field.key)}" title="${escapeAttribute(fieldLabel(field))}">
        <span>${escapeHtml(fieldLabel(field))}</span>
        <b>${marker}</b>
        ${isPro ? `<i class="col-resizer" data-resize-field="${escapeAttribute(cssKey(field.key))}" title="${escapeAttribute(t("colResizeHint"))}"></i>` : ""}
      </button>
    `;
  }).join("");

  const rows = devicesToShow.map((device) => {
    const cells = fields.map((field) => `<span class="list-${cssKey(field.key)}">${getDeviceFieldDisplay(device, field.key)}</span>`).join("");
    return `<button class="device-list-row ${isSold(device) ? "is-sold" : ""}" type="button" data-device-id="${device.id}" style="--list-cols:${Math.max(fields.length, 1)}">${cells}</button>`;
  }).join("");

  const keyed = fields.map((f) => ({ key: cssKey(f.key) }));
  const template = listColumnTemplate(keyed);
  return `
    <div class="device-list-view" style="--list-template:${escapeAttribute(template)};--list-min-width:${listMinWidth(keyed)}px">
      <div class="device-list-header" style="--list-cols:${Math.max(fields.length, 1)}">
        ${header}
      </div>
      ${rows}
    </div>
  `;
}

function renderListCell(device, key) {
  return getDeviceFieldDisplay(device, key);
}

function renderReadOnlyStars(rating) {
  const value = Number(rating || 0);
  return [1, 2, 3, 4, 5].map((star) => `<span class="readonly-star ${star <= value ? "active" : ""}">★</span>`).join("");
}

function renderGrid() {
  updateSearchVisualState();
  renderStats();
  const grid = $("#deviceGrid");
  if (!grid) return;
  const filtered = getFilteredDevices();
  grid.innerHTML = "";
  applyGridColumns();
  $("#emptyState")?.classList.toggle("hidden", filtered.length > 0);

  if (viewMode === "list") {
    grid.classList.add("is-list-mode");
    grid.innerHTML = renderListView(filtered);
    grid.querySelectorAll(".list-sort-header").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const nextField = button.dataset.sortField;
        if (sortField === nextField) {
          sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
          sortField = nextField;
          sortDirection = "asc";
        }

        const sortSelect = $("#sortFieldSelect");
        if (sortSelect && [...sortSelect.options].some((option) => option.value === sortField)) {
          sortSelect.value = sortField;
        }

        renderSortState();
        renderGrid();
      });
    });

    grid.querySelectorAll(".device-list-row").forEach((row) => {
      row.addEventListener("click", () => openDetail(Number(row.dataset.deviceId)));
    });
    bindListInteractions(grid, getVisibleListFields().map((f) => ({ key: listCssKey(f.key) })));
    return;
  }

  grid.classList.remove("is-list-mode");

  filtered.forEach((device) => {
    const card = document.createElement("button");
    card.className = `device-card ${isSold(device) ? "is-sold" : ""}`;
    card.type = "button";
    card.addEventListener("click", () => openDetail(device.id));

    const hasIssue = issueDetected(device);
    const typeSubcat = [
      viewSettings.grid.type ? device.type : "",
      viewSettings.grid.subcategory ? device.subcategory : "",
    ].filter(Boolean).join(" · ");
    // Logo über dem Namen (Standard) oder daneben (Pro-Einstellung)
    const logoInline = isProUser() && viewSettings.logoPosition === "inline";
    const logoHtml = viewSettings.grid.manufacturerLogo ? logoMarkup(device, logoInline ? "card-inline-logo" : "card-above-logo") : "";

    card.innerHTML = `
      ${viewSettings.grid.deviceImage ? `
      <div class="device-image">
        <img src="${escapeHtml(device.image || "")}" alt="${escapeHtml(device.name)}" onerror="this.style.display='none'">
        <span class="badge">${escapeHtml(device.status || "")}</span>
        ${hasIssue ? `<span class="issue-badge">!</span>` : ""}
      </div>` : ""}
      <div class="device-body">
        ${viewSettings.grid.rating ? renderCardRatingTop(device) : ""}
        ${logoInline ? `
        <div class="card-name-row">
          ${logoHtml}
          ${viewSettings.grid.name ? `<h3 title="${escapeAttribute(device.name)}">${escapeHtml(device.name)}</h3>` : ""}
        </div>` : `
        ${logoHtml ? `<div class="card-logo-above">${logoHtml}</div>` : ""}
        ${viewSettings.grid.name ? `<h3 class="card-title" title="${escapeAttribute(device.name)}">${escapeHtml(device.name)}</h3>` : ""}`}
        ${(viewSettings.grid.type || viewSettings.grid.subcategory) && typeSubcat ? `<p>${escapeHtml(typeSubcat)}</p>` : ""}
        <div class="device-meta-grid">
          ${renderGridMetaFields(device)}
        </div>
        ${viewSettings.grid.rating ? renderCardRatingBottom(device) : ""}
      </div>
    `;
    card.querySelectorAll(".rating-star").forEach((star) => {
      star.addEventListener("click", (event) => {
        event.stopPropagation();
        setDeviceRating(star.dataset.deviceId, star.dataset.rating);
      });
    });

    grid.appendChild(card);
  });
}

function openDetail(id) {
  selectedId = id;
  activeTab = "overview";
  $("#galleryView").classList.add("hidden");
  $("#detailView").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderDetail();
}

function goToAdjacentDevice(direction) {
  const list = getFilteredDevices();
  if (!list.length || selectedId == null) return;
  const idx = list.findIndex((d) => d.id === selectedId);
  if (idx < 0) return;
  const next = direction === "next"
    ? list[(idx + 1) % list.length]
    : list[(idx - 1 + list.length) % list.length];
  if (next && next.id !== selectedId) {
    openDetail(next.id);
  }
}

function closeDetail() {
  selectedId = null;
  $("#detailView").classList.add("hidden");
  $("#galleryView").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAll();
}

function selectedDevice() {
  return devices.find((device) => device.id === selectedId);
}

function renderTabs() {
  const tabs = $("#tabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  const labels = t("tabs");
  tabKeys.forEach((key, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tab-btn ${activeTab === key ? "active" : ""}`;
    btn.textContent = labels[index];
    btn.addEventListener("click", () => {
      activeTab = key;
      renderDetail();
    });
    tabs.appendChild(btn);
  });
}

function renderDetail() {
  const device = selectedDevice();
  if (!device) return;

  $("#detailImage").src = device.image || "";
  $("#detailImage").alt = device.name;
  $("#detailImage").classList.toggle("hidden", !device.image);
  $("#imageFallback").classList.toggle("hidden", Boolean(device.image));

  $("#detailLocation").textContent = device.location || "—";
  $("#detailStatus").textContent = device.status || "—";
  $("#detailCondition").textContent = device.condition || "—";
  $("#detailManufacturerLogo").innerHTML = logoMarkup(device, "manufacturer-logo detail-logo-img");
  $("#detailManufacturer").textContent = [device.manufacturer, device.model].filter(Boolean).join(" · ");
  $("#detailName").textContent = device.name;
  $("#detailCategory").textContent = [device.type, device.subcategory, device.formFactor].filter(Boolean).join(" · ");
  $("#detailRating").innerHTML = renderRating(device, "detail");
  $("#detailRating").querySelectorAll(".rating-star").forEach((star) => {
    star.addEventListener("click", (event) => {
      event.stopPropagation();
      setDeviceRating(star.dataset.deviceId, star.dataset.rating);
    });
  });
  $("#detailMarketRange").textContent = formatMarketRange(device);
  $("#detailMarketMeta").textContent = [
    device.marketMedian ? `${t("median")} ${device.marketMedian} ${currencySymbol()}` : "",
    device.lastChecked || "",
  ].filter(Boolean).join(" · ");

  // Aktions-Buttons an den Gerätezustand anpassen
  const soldBtn = $("#markSoldBtn");
  if (soldBtn) soldBtn.textContent = isSold(device) ? t("markActive") : t("markSold");
  const removeImgBtn = $("#removeImageBtn");
  if (removeImgBtn) removeImgBtn.disabled = !device.image;

  renderTabs();
  renderTabContent(device);
}

/** Eigenes Feld im Gerätepass; Link-Felder klickbar. */
function customDetailField(device, f) {
  const raw = customRawValue(device, f);
  if (f.type === "url" && normalizeUrl(raw)) {
    return `<div class="info-field"><span>${escapeHtml(f.label)}</span><strong><a href="${escapeAttribute(normalizeUrl(raw))}" target="_blank" rel="noopener">${escapeHtml(linkLabel(raw))}</a></strong></div>`;
  }
  const text = customDisplayText(device, f);
  return field(f.label, text === "—" ? "" : text);
}

function formatMarketRange(device) {
  const min = Number(device.marketMin || 0), max = Number(device.marketMax || 0);
  if (!min && !max) return "—";
  if (!min || !max || min === max) return `${min || max} ${currencySymbol()}`;
  return `${Math.min(min, max)}–${Math.max(min, max)} ${currencySymbol()}`;
}

function field(label, value) {
  return `
    <div class="info-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "—")}</strong>
    </div>
  `;
}

function renderTabContent(device) {
  const content = $("#tabContent");
  const labels = t("tabs");

  if (activeTab === "overview") {
    content.innerHTML = `
      <div class="info-grid">
        ${field(t("purchaseYear"), device.purchaseYear)}
        ${field(t("purchasePrice"), formatCurrency(device.purchasePrice))}
        ${field(t("subcategory"), device.subcategory)}
        ${field(t("formFactor"), device.formFactor)}
        ${field(t("serialNumber"), device.serialNumber)}
        ${field(t("firmwareVersion"), device.firmwareVersion)}
        ${field(t("warrantyUntil"), formatDisplayDate(device.warrantyUntil))}
        ${field(t("audio"), [device.audio?.outputs && `Out: ${device.audio.outputs}`, device.audio?.inputs && `In: ${device.audio.inputs}`].filter(Boolean).join(" · "))}
        ${field("MIDI", [["In", device.midi?.in], ["Out", device.midi?.out], ["Thru", device.midi?.thru]].filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", "))}
        ${activeCustomFields().map((f) => customDetailField(device, f)).join("")}
      </div>
    `;
  }

  if (activeTab === "audio") {
    content.innerHTML = `
      <div class="info-grid">
        ${field(t("audioOutputs"), device.audio?.outputs)}
        ${field(t("audioInputs"), device.audio?.inputs)}
        ${field(t("connector"), device.audio?.connector)}
        ${field(t("level"), device.audio?.level)}
      </div>
    `;
  }

  if (activeTab === "midi") {
    content.innerHTML = `
      <div class="info-grid">
        ${field(t("midiIn"), device.midi?.in)}
        ${field(t("midiOut"), device.midi?.out)}
        ${field(t("midiThru"), device.midi?.thru)}
        ${field(t("usbMidi"), device.midi?.usb)}
        ${field(t("midiChannel"), device.midi?.channel)}
        ${field(t("programChange"), device.midi?.pc)}
        ${field("MSB", device.midi?.msb)}
        ${field("LSB", device.midi?.lsb)}
      </div>
    `;
  }

  if (activeTab === "power") {
    content.innerHTML = `
      <div class="info-grid">
        ${field(t("powerData"), device.power?.summary)}
        ${field(t("psu"), device.power?.psu)}
        ${field(t("powerConnector"), device.power?.connector)}
        ${field(t("voltage"), device.power?.voltage)}
      </div>
    `;
  }

  if (activeTab === "value") {
    const query = encodeQuery(getSearchTitle(device));
    content.innerHTML = `
      <div class="info-grid">
        ${field(t("marketRange"), formatMarketRange(device) === "—" ? "" : formatMarketRange(device))}
        ${field(t("median"), device.marketMedian ? `${device.marketMedian} ${currencySymbol()}` : "")}
      </div>
      <div class="market-box">
        <strong>${t("marketToolsTitle")}</strong>
        <p>${t("marketToolsText")}</p>
        <div class="market-tools">
          <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://reverb.com/marketplace?query=${query}">${t("searchReverb")}</a>
          <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.ebay.de/sch/i.html?_nkw=${query}&_sacat=0&LH_Complete=1&LH_Sold=1">${t("searchEbay")}</a>
        </div>
      </div>
    `;
  }

  if (activeTab === "documents") {
    const docs = normalizeDocs(device.docs || []);
    const rows = docs.map((doc, index) => {
      const openButton = doc.dataUrl
        ? `<button class="btn btn-ghost doc-open-btn" type="button" data-doc-index="${index}">${t("openDocument")}</button>`
        : doc.link
          ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${escapeAttribute(doc.link)}">${t("openDocument")}</a>`
          : `<button class="btn btn-ghost" disabled>${t("openDocument")}</button>`;

      return `
        <div class="doc-row">
          <div>
            <strong>${escapeHtml(doc.name || "")}</strong>
            <span>${escapeHtml(doc.filename || doc.type || "")}</span>
          </div>
          ${openButton}
        </div>
      `;
    }).join("");

    const links = parseDeviceLinks(device.links);
    content.innerHTML = `
      ${links.length ? `<div class="device-links"><strong>${escapeHtml(t("links"))}</strong><div class="device-links-list">${renderLinkButtons(links)}</div></div>` : ""}
      <div class="doc-list">
        ${rows || (links.length ? "" : `<div class="notes-box">${t("emptyState")}</div>`)}
      </div>
    `;

    content.querySelectorAll(".doc-open-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const doc = docs[Number(button.dataset.docIndex)];
        openAttachedDocument(doc);
      });
    });
  }

  if (activeTab === "notes") {
    content.innerHTML = `<div class="notes-box">${device.notes ? linkifyText(device.notes) : "—"}</div>`;
  }
}

function openImageSearch() {
  const device = selectedDevice();
  if (!device) return;
  const query = encodeQuery(`${getSearchTitle(device)} product image`);
  window.open(`https://www.google.com/search?tbm=isch&q=${query}`, "_blank", "noopener");
}

/* ============================================================
   Bild-Kompression (verkleinert auf max. Breite/Höhe und re-encodet als JPEG)
   ============================================================ */
function compressImageFile(file, options, callback) {
  const opts = Object.assign({ maxWidth: 1200, maxHeight: 1200, quality: 0.85, mime: "image/jpeg" }, options || {});
  if (!file) { callback(null); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const original = String(reader.result || "");
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(opts.maxWidth / img.naturalWidth, opts.maxHeight / img.naturalHeight, 1);
      const w = Math.max(1, Math.round(img.naturalWidth * ratio));
      const h = Math.max(1, Math.round(img.naturalHeight * ratio));
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (opts.mime === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL(opts.mime, opts.quality);
        const before = approxByteLength(original);
        const after = approxByteLength(compressed);
        Logger.info("image.compress", "Bild komprimiert", {
          fileName: file.name,
          originalType: file.type,
          beforeBytes: before,
          afterBytes: after,
          width: w,
          height: h,
        });
        callback(compressed);
      } catch (error) {
        Logger.warn("image.compress", "Kompression fehlgeschlagen, Original wird verwendet", { error: String(error), fileName: file.name });
        callback(original);
      }
    };
    img.onerror = () => {
      Logger.warn("image.compress", "Bild konnte nicht decodiert werden, Original wird verwendet", { fileName: file.name });
      callback(original);
    };
    img.src = original;
  };
  reader.onerror = () => {
    Logger.error("image.compress", "FileReader-Fehler", { fileName: file.name });
    callback(null);
  };
  reader.readAsDataURL(file);
}

function handleImageUpload(file) {
  const device = selectedDevice();
  if (!device || !file) return;
  compressImageFile(file, { maxWidth: 1200, maxHeight: 1200 }, (dataUrl) => {
    if (!dataUrl) return;
    device.image = dataUrl;
    // Galerie synchron halten: neues Hauptbild ersetzt das erste Galeriebild
    if (Array.isArray(device.images) && device.images.length) device.images[0] = dataUrl;
    if (saveDevices()) {
      renderDetail();
      renderGrid();
    }
  });
}

// Bild-Upload im Gerät-Bearbeiten-Formular (speichert in pendingDeviceImage)
function handleFormImageUpload(file) {
  if (!file) return;
  compressImageFile(file, { maxWidth: 1200, maxHeight: 1200 }, (dataUrl) => {
    if (!dataUrl) return;
    if (isProUser()) {
      // Pro: zu Galerie hinzufügen
      pendingDeviceImages.push({ src: dataUrl, name: file.name });
      if (!pendingDeviceImage) pendingDeviceImage = dataUrl; // erstes = Hauptbild
    } else {
      pendingDeviceImage = dataUrl;
    }
    renderFormImagePreview();
  });
}

function renderFormImagePreview() {
  const preview = $("#formImagePreview");
  if (!preview) return;

  if (isProUser() && pendingDeviceImages.length > 0) {
    // Pro: Galerie-Vorschau mit Drag & Drop + Löschen
    preview.innerHTML = `<div class="form-image-gallery">${
      pendingDeviceImages.map((img, i) => `
        <div class="form-gallery-thumb" data-idx="${i}" draggable="true" title="Ziehen zum Sortieren">
          <img src="${escapeAttribute(img.src)}" alt="${escapeAttribute(img.name)}">
          <button type="button" class="gallery-remove-btn" data-idx="${i}" title="Entfernen">✕</button>
          ${i === 0 ? '<span class="gallery-main-badge">Hauptbild</span>' : ''}
        </div>`).join("")
    }</div>`;

    preview.querySelectorAll(".form-gallery-thumb").forEach((thumb) => {
      // Löschen
      thumb.querySelector(".gallery-remove-btn")?.addEventListener("click", () => {
        const idx = Number(thumb.dataset.idx);
        pendingDeviceImages.splice(idx, 1);
        pendingDeviceImage = pendingDeviceImages[0]?.src || "";
        renderFormImagePreview();
      });

      // Drag & Drop
      thumb.addEventListener("dragstart", (e) => {
        _galleryDragSrcIdx = Number(thumb.dataset.idx);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => thumb.classList.add("dragging"), 0);
      });
      thumb.addEventListener("dragend", () => {
        thumb.classList.remove("dragging");
        preview.querySelectorAll(".form-gallery-thumb").forEach(t => t.classList.remove("drag-over"));
      });
      thumb.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        preview.querySelectorAll(".form-gallery-thumb").forEach(t => t.classList.remove("drag-over"));
        thumb.classList.add("drag-over");
      });
      thumb.addEventListener("dragleave", () => {
        thumb.classList.remove("drag-over");
      });
      thumb.addEventListener("drop", (e) => {
        e.preventDefault();
        thumb.classList.remove("drag-over");
        const targetIdx = Number(thumb.dataset.idx);
        if (_galleryDragSrcIdx === null || _galleryDragSrcIdx === targetIdx) return;
        const [moved] = pendingDeviceImages.splice(_galleryDragSrcIdx, 1);
        pendingDeviceImages.splice(targetIdx, 0, moved);
        pendingDeviceImage = pendingDeviceImages[0]?.src || "";
        _galleryDragSrcIdx = null;
        renderFormImagePreview();
      });
    });

  } else if (pendingDeviceImage) {
    // Free: einzelnes Bild
    preview.innerHTML = `<img src="${escapeAttribute(pendingDeviceImage)}" alt="Vorschau">
      <button type="button" id="formImageRemoveBtn" class="btn btn-ghost form-image-remove">✕ Entfernen</button>`;
    preview.querySelector("#formImageRemoveBtn")?.addEventListener("click", () => {
      pendingDeviceImage = "";
      renderFormImagePreview();
    });
  } else {
    preview.innerHTML = "";
  }
}

function openFormImageSearch() {
  const form = $("#deviceForm");
  if (!form) return;
  const name = form.elements.name?.value?.trim() || "";
  const mfr  = form.elements.manufacturer?.value?.trim() || "";
  const query = encodeQuery(`${mfr} ${name} product image`.trim());
  window.open(`https://www.google.com/search?tbm=isch&q=${query}`, "_blank", "noopener");
}



function logoMarkup(device, className = "manufacturer-logo") {
  if (!device?.manufacturerLogo) return "";
  return `<img class="${className}" src="${escapeAttribute(device.manufacturerLogo)}" alt="${escapeAttribute(device.manufacturer || "Hersteller Logo")}">`;
}

function renderManufacturerLogoPreview() {
  const input = $("#manufacturerLogoInput");
  if (!input) return;

  let preview = document.querySelector(".manufacturer-logo-preview");
  if (!preview) {
    preview = document.createElement("div");
    preview.className = "manufacturer-logo-preview";
    input.closest("label")?.appendChild(preview);
  }

  preview.innerHTML = pendingManufacturerLogo
    ? `<img src="${escapeAttribute(pendingManufacturerLogo)}" alt="Logo">`
    : `<span>—</span>`;
}

function handleManufacturerLogoUpload(file) {
  if (!file) return;
  compressImageFile(file, { maxWidth: 400, maxHeight: 400, mime: "image/png", quality: 0.9 }, (dataUrl) => {
    if (!dataUrl) return;
    pendingManufacturerLogo = dataUrl;
    renderManufacturerLogoPreview();
  });
}

function renderDocumentAttachmentList(docs) {
  pendingDocs = normalizeDocs(docs || pendingDocs || []);
  const list = $("#documentAttachmentList");
  if (!list) return;

  if (!pendingDocs.length) {
    list.innerHTML = `<div class="document-attachment-item"><div><strong>—</strong><span>${t("emptyState")}</span></div></div>`;
    return;
  }

  list.innerHTML = pendingDocs.map((doc, index) => `
    <div class="document-attachment-item">
      <div>
        <strong>${escapeHtml(doc.name || "")}</strong>
        <span>${escapeHtml(doc.filename || doc.type || "")}</span>
      </div>
      <button class="btn btn-ghost document-remove-btn" type="button" data-doc-index="${index}">${t("removeDocument")}</button>
    </div>
  `).join("");

  list.querySelectorAll(".document-remove-btn").forEach((button) => {
    button.addEventListener("click", () => {
      pendingDocs.splice(Number(button.dataset.docIndex), 1);
      renderDocumentAttachmentList(pendingDocs);
    });
  });
}

function addDocumentAttachment() {
  const nameInput = $("#documentNameInput");
  const fileInput = $("#documentFileInput");
  const documentName = nameInput.value.trim();
  const file = fileInput.files?.[0];

  if (!documentName || !file) {
    alert(t("documentNeedsNameAndFile"));
    return;
  }

  if (file.size > 3 * 1024 * 1024) {
    console.warn(t("documentTooLarge"));
  }

  const reader = new FileReader();
  reader.onload = () => {
    pendingDocs.push({
      id: Date.now() + Math.random(),
      name: documentName,
      filename: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      dataUrl: String(reader.result || ""),
      link: "",
    });
    nameInput.value = "";
    fileInput.value = "";
    renderDocumentAttachmentList(pendingDocs);
  };
  reader.readAsDataURL(file);
}

function openAttachedDocument(doc) {
  if (!doc?.dataUrl) return;
  const win = window.open();
  if (win) {
    win.document.write(`
      <html>
        <head><title>${escapeHtml(doc.name || doc.filename || "Dokument")}</title></head>
        <body style="margin:0">
          <iframe src="${doc.dataUrl}" style="border:0;width:100%;height:100vh"></iframe>
        </body>
      </html>
    `);
    win.document.close();
  } else {
    const link = document.createElement("a");
    link.href = doc.dataUrl;
    link.download = doc.filename || doc.name || "document";
    link.click();
  }
}


const suggestionFields = [
  "name", "manufacturer", "model", "serialNumber", "firmwareVersion", "type", "subcategory", "formFactor", "status", "condition", "location",
  "image", "purchaseYear", "purchasePrice", "warrantyUntil", "marketMin", "marketMax",
  "marketMedian", "lastChecked", "audioOutputs", "audioInputs", "connector", "level",
  "midiIn", "midiOut", "midiThru", "usbMidi", "midiChannel", "pc", "msb", "lsb",
  "powerSummary", "psu", "powerConnector", "voltage"
];

function getSuggestionValue(device, field) {
  const map = {
    name: device.name,
    manufacturer: device.manufacturer,
    model: device.model,
    serialNumber: device.serialNumber,
    firmwareVersion: device.firmwareVersion,
    type: device.type,
    subcategory: device.subcategory,
    formFactor: device.formFactor,
    status: device.status,
    condition: device.condition,
    location: device.location,
    image: device.image,
    purchaseYear: device.purchaseYear,
    purchasePrice: device.purchasePrice,
    warrantyUntil: device.warrantyUntil,
    marketMin: device.marketMin,
    marketMax: device.marketMax,
    marketMedian: device.marketMedian,
    lastChecked: device.lastChecked,
    audioOutputs: device.audio?.outputs,
    audioInputs: device.audio?.inputs,
    connector: device.audio?.connector,
    level: device.audio?.level,
    midiIn: device.midi?.in,
    midiOut: device.midi?.out,
    midiThru: device.midi?.thru,
    usbMidi: device.midi?.usb,
    midiChannel: device.midi?.channel,
    pc: device.midi?.pc,
    msb: device.midi?.msb,
    lsb: device.midi?.lsb,
    powerSummary: device.power?.summary,
    psu: device.power?.psu,
    powerConnector: device.power?.connector,
    voltage: device.power?.voltage,
  };
  const value = map[field];
  return value === undefined || value === null ? "" : String(value).trim();
}

function getSuggestionsForField(field) {
  const values = devices
    .map((device) => getSuggestionValue(device, field))
    .filter((value) => value && !value.startsWith("data:image/"));
  // Vorgabewerte für Bauform und Status immer anbieten
  if (field === "formFactor") values.push(...DEFAULT_FORM_FACTORS);
  if (field === "status") values.push(...DEFAULT_STATUSES);

  return [...new Set(values)].sort((a, b) => a.localeCompare(b, lang === "de" ? "de" : "en", { sensitivity: "base", numeric: true }));
}

function refreshInputSuggestions() {
  suggestionFields.forEach((field) => {
    const list = document.getElementById(`${field}Suggestions`);
    if (!list) return;
    list.innerHTML = getSuggestionsForField(field)
      .map((value) => `<option value="${escapeAttribute(value)}"></option>`)
      .join("");
  });
}

function openDialog(mode, id = null) {
  refreshInputSuggestions();
  editingId = mode === "edit" ? id : null;
  const form = $("#deviceForm");
  form.reset();

  const title = $("#dialogTitle");
  title.textContent = mode === "edit" ? t("dialogTitleEdit") : t("dialogTitleAdd");

  const device = editingId ? devices.find((item) => item.id === editingId) : null;
  if (device) {
    fillForm(device);
  } else {
    pendingDocs = [];
    pendingManufacturerLogo = "";
    pendingDeviceImage = "";
    pendingDeviceImages = [];
    renderManufacturerLogoPreview();
    renderFormImagePreview();
    renderDocumentAttachmentList(pendingDocs);
    renderCustomFieldInputs(null);
  }

  $("#deviceDialog").showModal();
}

function fillForm(device) {
  const form = $("#deviceForm");
  const values = {
    name: device.name,
    manufacturer: device.manufacturer,
    model: device.model,
    serialNumber: device.serialNumber,
    firmwareVersion: device.firmwareVersion,
    type: device.type,
    subcategory: device.subcategory,
    formFactor: device.formFactor,
    status: device.status,
    condition: device.condition,
    location: device.location,
    links: device.links,
    purchaseYear: device.purchaseYear,
    purchasePrice: device.purchasePrice,
    warrantyUntil: device.warrantyUntil,
    marketMin: device.marketMin,
    marketMax: device.marketMax,
    marketMedian: device.marketMedian,
    lastChecked: device.lastChecked,
    audioOutputs: device.audio?.outputs,
    audioInputs: device.audio?.inputs,
    connector: device.audio?.connector,
    level: device.audio?.level,
    midiIn: device.midi?.in,
    midiOut: device.midi?.out,
    midiThru: device.midi?.thru,
    usbMidi: device.midi?.usb,
    midiChannel: device.midi?.channel,
    pc: device.midi?.pc,
    msb: device.midi?.msb,
    lsb: device.midi?.lsb,
    powerSummary: device.power?.summary,
    psu: device.power?.psu,
    powerConnector: device.power?.connector,
    voltage: device.power?.voltage,
    notes: device.notes,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? "";
  });
  form.elements.warrantyUntil.value = toDateInputValue(device.warrantyUntil);
  pendingManufacturerLogo = device.manufacturerLogo || "";
  // Hauptbild immer übernehmen — egal ob Base64 oder URL. Früher nur data:-Bilder:
  // URL-Bilder (Demo, Reverb-Links) gingen beim Speichern verloren, weil es kein URL-Feld mehr gibt.
  pendingDeviceImage  = device.image || "";
  if (isProUser()) {
    const gallery = Array.isArray(device.images) && device.images.length ? device.images.slice() : [];
    // Hauptbild ohne Galerie-Array → als erstes Galeriebild übernehmen
    if (!gallery.length && device.image) gallery.push(device.image);
    pendingDeviceImages = gallery.map((src, i) => ({ src, name: `Bild ${i + 1}` }));
  } else {
    pendingDeviceImages = [];
  }
  renderCustomFieldInputs(device);
  renderManufacturerLogoPreview();
  renderFormImagePreview();
  renderDocumentAttachmentList(normalizeDocs(device.docs || []));
}

function findExistingManufacturerLogo(name) {
  if (!name) return "";
  const target = String(name).trim().toLowerCase();
  if (!target) return "";
  // Erst Library-Geräte durchsuchen, dann Wishlist
  for (const item of [...devices, ...wishlist]) {
    if ((item.manufacturer || "").trim().toLowerCase() === target && item.manufacturerLogo) {
      return item.manufacturerLogo;
    }
  }
  return "";
}

function deviceFromForm() {
  const form = $("#deviceForm");
  const get = (name) => form.elements[name]?.value?.trim() || "";

  const currentDevice = editingId ? devices.find((item) => item.id === editingId) : null;
  const manufacturerName = get("manufacturer");

  // Logo-Auto-Zuordnung: wenn kein eigenes Logo gesetzt, aber Hersteller schon mit Logo bekannt
  let manufacturerLogo = pendingManufacturerLogo;
  if (!manufacturerLogo && manufacturerName) {
    const found = findExistingManufacturerLogo(manufacturerName);
    if (found) {
      manufacturerLogo = found;
      Logger.info("ui", `Logo automatisch zugewiesen für Hersteller "${manufacturerName}"`);
    }
  }

  return {
    id: editingId || Date.now(),
    rating: Number(currentDevice?.rating || 0),
    name: get("name"),
    manufacturer: manufacturerName,
    manufacturerLogo,
    model: get("model"),
    serialNumber: get("serialNumber"),
    firmwareVersion: get("firmwareVersion"),
    type: get("type"),
    subcategory: get("subcategory"),
    formFactor: get("formFactor"),
    status: get("status") || "Aktiv",
    condition: get("condition"),
    location: get("location"),
    links: form.elements.links?.value?.trim() || "",
    image: pendingDeviceImage,
    // Ohne Pro bleibt eine bestehende Galerie unverändert erhalten (nur ausgeblendet) —
    // sonst würde Bearbeiten nach Lizenz-Ablauf alle Zusatzbilder löschen.
    images: isProUser()
      ? (pendingDeviceImages.length > 0 ? pendingDeviceImages.map((i) => i.src) : undefined)
      : currentDevice?.images,
    custom: customValuesFromForm(currentDevice),
    purchaseYear: Number(get("purchaseYear")) || "",
    purchasePrice: Number(get("purchasePrice")) || 0,
    warrantyUntil: get("warrantyUntil"),
    marketMin: Number(get("marketMin")) || 0,
    marketMax: Number(get("marketMax")) || 0,
    marketMedian: Number(get("marketMedian")) || 0,
    lastChecked: get("lastChecked"),
    audio: {
      outputs: get("audioOutputs"),
      inputs: get("audioInputs"),
      connector: get("connector"),
      level: get("level"),
    },
    midi: {
      in: get("midiIn"),
      out: get("midiOut"),
      thru: get("midiThru"),
      usb: get("usbMidi"),
      channel: get("midiChannel"),
      pc: get("pc"),
      msb: get("msb"),
      lsb: get("lsb"),
    },
    power: {
      summary: get("powerSummary"),
      psu: get("psu"),
      connector: get("powerConnector"),
      voltage: get("voltage"),
    },
    notes: get("notes"),
    docs: normalizeDocs(pendingDocs),
  };
}

function parseDocs(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", type = "", link = ""] = line.split("|").map((part) => part.trim());
      return { name, type, link };
    });
}

function saveFormDevice(event) {
  event.preventDefault();
  const device = deviceFromForm();

  if (editingId) {
    devices = devices.map((item) => item.id === editingId ? device : item);
    selectedId = editingId;
  } else {
    if (freeLimitReached()) return;
    devices.unshift(device);
    selectedId = device.id;
  }

  saveDevices();
  pendingDeviceImage  = "";
  pendingDeviceImages = [];
  refreshInputSuggestions();
  $("#deviceDialog").close();
  $("#galleryView").classList.add("hidden");
  $("#detailView").classList.remove("hidden");
  renderCategories();
  renderStats();
  renderGrid();
  renderDetail();
}

function deleteSelectedDevice() {
  const device = selectedDevice();
  if (!device) return;
  if (!confirm(t("confirmDelete"))) return;

  devices = devices.filter((item) => item.id !== device.id);
  saveDevices();
  closeDetail();
}

// ─── AUTO-BACKUP (File System Access API) ─────────────────────────────────────

let _autoBackupHandle  = null;   // in-memory Cache des FileSystemFileHandle
let _autoBackupEnabled = false;
let _autoBackupTimer   = null;   // Debounce-Timer

/** Payload identisch mit exportJson — alle Daten + Einstellungen. */
function buildBackupPayload() {
  const settingsKeys = [
    LANG_KEY, THEME_KEY, VIEW_SETTINGS_KEY, LABELS_KEY, SORT_WORDS_KEY, SORT_CRITERIA_KEY,
    LAST_BACKUP_KEY, NAG_DISMISSED_KEY, NAG_DONATED_KEY, VIEW_KEY, DONOR_CODE_KEY, LICENSE_KEY,
    CUSTOM_FIELDS_KEY, CATEGORY_ORDER_KEY, HIDE_SOLD_KEY,
  ];
  const settings = {};
  settingsKeys.forEach((k) => { const v = localStorage.getItem(k); if (v !== null) settings[k] = v; });
  return { version: 2, exportedAt: new Date().toISOString(), devices, wishlist, settings };
}

/** Stellt sicher, dass der Handle eine readwrite-Berechtigung hat. */
async function ensureAutoBackupPermission() {
  if (!_autoBackupHandle) return false;
  try {
    let perm = await _autoBackupHandle.queryPermission({ mode: "readwrite" });
    if (perm === "prompt") perm = await _autoBackupHandle.requestPermission({ mode: "readwrite" });
    return perm === "granted";
  } catch (_) { return false; }
}

/** Schreibt das Backup sofort in die hinterlegte Datei. */
async function performAutoBackup() {
  if (!_autoBackupHandle) return;
  try {
    const granted = await ensureAutoBackupPermission();
    if (!granted) {
      Logger.warn("autobackup", "Berechtigung verweigert — Backup übersprungen");
      renderAutoBackupStatus();
      return;
    }
    const json     = JSON.stringify(buildBackupPayload(), null, 2);
    const writable = await _autoBackupHandle.createWritable();
    await writable.write(json);
    await writable.close();
    safeLocalStorageSet(AUTO_BACKUP_TS_KEY, new Date().toISOString());
    Logger.info("autobackup", `Auto-Backup geschrieben (${devices.length} Geräte, ${wishlist.length} Wünsche)`);
    renderAutoBackupStatus();
  } catch (err) {
    Logger.error("autobackup", "Auto-Backup fehlgeschlagen", { error: String(err) });
    renderAutoBackupStatus();
  }
}

/** Plant einen Backup-Schreibvorgang mit 3 s Debounce. */
function scheduleAutoBackup() {
  if (!_autoBackupEnabled || !_autoBackupHandle) return;
  clearTimeout(_autoBackupTimer);
  _autoBackupTimer = setTimeout(() => performAutoBackup(), 3000);
}

/** Öffnet den Datei-Picker und richtet das Auto-Backup ein. */
async function setupAutoBackup() {
  if (!window.showSaveFilePicker) {
    alert("Dein Browser unterstützt die File System Access API nicht.\nBitte Chrome oder Edge verwenden.");
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: "studio-gear-manager-autobackup.json",
      types: [{ description: "JSON Backup", accept: { "application/json": [".json"] } }],
    });
    await dbPut(AUTO_BACKUP_HANDLE_IDB_KEY, handle);
    _autoBackupHandle  = handle;
    _autoBackupEnabled = true;
    Logger.info("autobackup", "Auto-Backup eingerichtet: " + handle.name);
    await performAutoBackup();   // sofort ersten Backup schreiben
    renderAutoBackupStatus();
  } catch (err) {
    if (err.name !== "AbortError") {
      Logger.error("autobackup", "Setup fehlgeschlagen", { error: String(err) });
    }
  }
}

/** Deaktiviert das Auto-Backup und entfernt den gespeicherten Handle. */
async function disableAutoBackup() {
  try { await dbPut(AUTO_BACKUP_HANDLE_IDB_KEY, null); } catch (_) {}
  _autoBackupHandle  = null;
  _autoBackupEnabled = false;
  safeLocalStorageSet(AUTO_BACKUP_TS_KEY, "");
  Logger.info("autobackup", "Auto-Backup deaktiviert");
  renderAutoBackupStatus();
}

/** Lädt den gespeicherten Handle beim App-Start. */
async function initAutoBackup() {
  if (!_dbAvailable) return;
  try {
    const h = await dbGet(AUTO_BACKUP_HANDLE_IDB_KEY);
    if (h && typeof h.queryPermission === "function") {
      _autoBackupHandle  = h;
      _autoBackupEnabled = true;
      Logger.info("autobackup", "Auto-Backup Handle geladen: " + (h.name || "?"));
    }
  } catch (err) {
    Logger.warn("autobackup", "Handle nicht ladbar", { error: String(err) });
  }
}

/** Aktualisiert die Status-Anzeige im Settings-Dialog. */
function renderAutoBackupStatus() {
  const statusEl    = document.getElementById("autoBackupStatus");
  const setupBtn    = document.getElementById("autoBackupSetupBtn");
  const disableBtn  = document.getElementById("autoBackupDisableBtn");
  if (!statusEl) return;
  if (_autoBackupEnabled && _autoBackupHandle) {
    const filename = _autoBackupHandle.name || "backup.json";
    const ts       = localStorage.getItem(AUTO_BACKUP_TS_KEY);
    const tsStr    = ts
      ? new Date(ts).toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
      : "–";
    statusEl.innerHTML = `<span style="color:var(--ok)">✓ Aktiv</span> · ${filename} · zuletzt: ${tsStr}`;
    if (setupBtn)   setupBtn.style.display   = "none";
    if (disableBtn) disableBtn.style.display = "";
  } else {
    statusEl.innerHTML = `<span style="color:var(--muted)">Nicht eingerichtet</span>`;
    if (setupBtn)   setupBtn.style.display   = "";
    if (disableBtn) disableBtn.style.display = "none";
  }
}

// ──────────────────────────────────────────────────────────────────────────────

function exportJson() {
  const settingsKeys = [
    LANG_KEY, THEME_KEY, VIEW_SETTINGS_KEY, LABELS_KEY, SORT_WORDS_KEY, SORT_CRITERIA_KEY,
    LAST_BACKUP_KEY, NAG_DISMISSED_KEY, NAG_DONATED_KEY, VIEW_KEY,
    DONOR_CODE_KEY, LICENSE_KEY,
    CUSTOM_FIELDS_KEY, CATEGORY_ORDER_KEY, HIDE_SOLD_KEY,
  ];
  const settings = {};
  settingsKeys.forEach((key) => {
    const val = localStorage.getItem(key);
    if (val !== null) settings[key] = val;
  });
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    devices,
    wishlist,
    settings,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "studio-gear-manager-export.json";
  link.click();
  URL.revokeObjectURL(url);
  safeLocalStorageSet(LAST_BACKUP_KEY, new Date().toISOString());
  renderBackupInfo();
}

function exportCsv() {
  const rows = [
    ["Name", "Hersteller", "Modell", "Seriennummer", "Firmware Version", "Typ", "Subkategorie", "Bauform", "Status", "Zustand", "Standort", "Kaufjahr", "Anschaffungspreis", "Marktwert Min", "Marktwert Max", "Median", "MIDI Kanal", "Audio Ausgänge", "Audio Eingänge", "Bewertung", "Notizen", "Links", ...activeCustomFields().map((f) => f.label)],
    ...devices.map((device) => [
      device.name,
      device.manufacturer,
      device.model,
      device.serialNumber,
      device.firmwareVersion,
      device.type,
      device.subcategory,
      device.formFactor || "",
      device.status,
      device.condition,
      device.location,
      device.purchaseYear,
      device.purchasePrice,
      device.marketMin,
      device.marketMax,
      device.marketMedian,
      device.midi?.channel || "",
      device.audio?.outputs || "",
      device.audio?.inputs || "",
      device.rating || 0,
      device.notes || "",
      parseDeviceLinks(device.links).map((l) => `${l.label} | ${l.url}`).join(" / "),
      ...activeCustomFields().map((f) => customDisplayText(device, f).replace(/^—$/, "")),
    ])
  ];

  const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "studio-gear-manager-inventar.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function importJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => alert(t("importError"));
  reader.onload = () => {
    try {
      const raw = reader.result;
      if (typeof raw !== "string" || !raw.trim()) throw new Error("empty");
      const clean  = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw; // BOM
      const parsed = JSON.parse(clean);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        // v2: { version, devices, wishlist, settings }
        const importedDevices  = Array.isArray(parsed.devices)  ? parsed.devices  : [];
        const importedWishlist = Array.isArray(parsed.wishlist) ? parsed.wishlist : [];
        const importedSettings = parsed.settings && typeof parsed.settings === "object" ? parsed.settings : null;
        const msg = `${importedDevices.length} Geräte, ${importedWishlist.length} Wünsche${importedSettings ? " + Einstellungen" : ""}`;
        if (!confirm(`Import: ${msg}?`)) return;
        devices  = normalizeDevices(importedDevices);
        saveDevices();
        wishlist = importedWishlist.map(normalizeWishlistItem);
        saveWishlist();
        if (importedSettings) {
          Object.entries(importedSettings).forEach(([k, v]) => {
            try { localStorage.setItem(k, v); } catch (_) {}
          });
          applyTheme();
          applyTranslations();
        }
      } else if (Array.isArray(parsed)) {
        // v1 Fallback: reines devices-Array
        if (!confirm(`Import: ${parsed.length} Geräte (Legacy-Format)?`)) return;
        devices = normalizeDevices(parsed);
        saveDevices();
      } else {
        throw new Error("unknown format");
      }

      refreshInputSuggestions();
      selectedId = null;
      $("#detailView")?.classList.add("hidden");
      $("#galleryView")?.classList.remove("hidden");
      renderCategories();
      renderAll();
      safeLocalStorageSet(LAST_BACKUP_KEY, new Date().toISOString());
      renderBackupInfo();
    } catch (err) {
      Logger.error("import", "JSON-Import fehlgeschlagen", { error: String(err) });
      alert(t("importError"));
    }
  };
  reader.readAsText(file, "utf-8");
}

function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeWishlistItem);
  } catch (error) {
    console.error("Could not load wishlist:", error);
    return [];
  }
}

function normalizeWishlistItem(item) {
  return {
    id: item.id || Date.now() + Math.random(),
    manufacturer: item.manufacturer || "",
    model: item.model || "",
    type: item.type || "",
    subcategory: item.subcategory || "",
    image: item.image || "",
    manufacturerLogo: item.manufacturerLogo || "",
    priceNew: Number(item.priceNew || 0),
    priceUsed: Number(item.priceUsed || 0),
    links: item.links || "",
  };
}

function saveWishlist() {
  if (_dbAvailable) {
    dbPut(DB_WISHLIST_KEY, wishlist)
      .then(() => { Logger.info("storage", "Wishlist gespeichert (IndexedDB)", { count: wishlist.length }); scheduleAutoBackup(); })
      .catch((error) => {
        if (isQuotaError(error)) {
          Logger.error("storage.quota", "IndexedDB-Quota überschritten beim Speichern der Wishlist", { count: wishlist.length });
          showQuotaError();
        } else {
          Logger.error("storage", "IndexedDB-Schreibfehler (wishlist)", { error: String(error) });
          showAppError(`Speicherfehler: ${error?.message || error}`);
        }
      });
    return true;
  }
  return safeStorageWrite(WISHLIST_KEY, wishlist, "wishlist", wishlist.length);
}

async function loadWishlistAsync() {
  if (_dbAvailable) {
    try {
      const data = await dbGet(DB_WISHLIST_KEY);
      if (Array.isArray(data)) {
        Logger.info("storage", `Wishlist aus IndexedDB geladen`, { count: data.length });
        return data.map(normalizeWishlistItem);
      }
    } catch (error) {
      Logger.error("storage", "IndexedDB-Lesefehler (wishlist) — Fallback auf localStorage", { error: String(error) });
    }
  }
  return loadWishlist();
}

function setView(view) {
  currentView = view === "wishlist" ? "wishlist" : "library";
  const isWishlist = currentView === "wishlist";

  safeLocalStorageSet(VIEW_KEY, currentView);
  Logger.info("ui", `View gewechselt: ${currentView}`);

  document.querySelectorAll(".view-toggle-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === currentView);
  });

  $("#galleryView")?.classList.toggle("hidden", isWishlist);
  $("#detailView")?.classList.add("hidden");
  $("#wishlistView")?.classList.toggle("hidden", !isWishlist);
  $("#addDeviceBtn")?.classList.toggle("hidden", isWishlist);
  $("#addWishlistBtn")?.classList.toggle("hidden", !isWishlist);

  if (isWishlist) {
    selectedId = null;
    renderWishlist();
  } else {
    renderGrid();
  }
}

function parseWishlistLinks(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getFilteredWishlist() {
  const allLabels = ["Alle", "All"];
  const normalizedQuery = normalizeSearchText((wishlistSearchQuery || "").trim());

  const filtered = wishlist.filter((item) => {
    const haystack = normalizeSearchText([
      item.manufacturer, item.model, item.type, item.subcategory, item.links,
    ].join(" "));
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesCategory = allLabels.includes(wishlistCurrentCategory) || item.type === wishlistCurrentCategory;
    const matchesSubcategory = !wishlistCurrentSubcategory || item.subcategory === wishlistCurrentSubcategory;
    return matchesQuery && matchesCategory && matchesSubcategory;
  });

  return sortWishlist(filtered);
}

function sortWishlist(list) {
  const dir = wishlistSortDirection === "asc" ? 1 : -1;
  const key = wishlistSortField || "added";
  return [...list].sort((a, b) => {
    let av, bv;
    switch (key) {
      case "manufacturer": av = (a.manufacturer || "").toLowerCase(); bv = (b.manufacturer || "").toLowerCase(); break;
      case "model": av = (a.model || "").toLowerCase(); bv = (b.model || "").toLowerCase(); break;
      case "priceNew": av = Number(a.priceNew || 0); bv = Number(b.priceNew || 0); break;
      case "priceUsed": av = Number(a.priceUsed || 0); bv = Number(b.priceUsed || 0); break;
      case "added":
      default: av = Number(a.id) || 0; bv = Number(b.id) || 0; break;
    }
    return compareSortValues(av, bv) * dir;
  });
}

function getAvailableWishlistSubcategories() {
  const allLabels = ["Alle", "All"];
  const filtered = allLabels.includes(wishlistCurrentCategory)
    ? wishlist
    : wishlist.filter((item) => item.type === wishlistCurrentCategory);
  return [...new Set(filtered.map((item) => item.subcategory).filter(Boolean))].sort();
}

function renderWishlistStats() {
  const count = wishlist.length;
  const usedSum = wishlist.reduce((sum, item) => sum + (Number(item.priceUsed) || 0), 0);
  const newSum = wishlist.reduce((sum, item) => sum + (Number(item.priceNew) || 0), 0);
  const linkSum = wishlist.reduce((sum, item) => sum + parseWishlistLinks(item.links).length, 0);
  if ($("#wishlistStatCount")) $("#wishlistStatCount").textContent = String(count);
  if ($("#wishlistStatBudget")) $("#wishlistStatBudget").textContent = formatCurrency(usedSum);
  if ($("#wishlistStatBudgetNew")) $("#wishlistStatBudgetNew").textContent = formatCurrency(newSum);
  if ($("#wishlistStatLinks")) $("#wishlistStatLinks").textContent = String(linkSum);
}

function renderWishlistCategories() {
  const wrapper = $("#wishlistCategoryFilters");
  if (!wrapper) return;
  const categories = [t("all"), ...new Set(wishlist.map((item) => item.type).filter(Boolean))];
  wrapper.innerHTML = "";

  // View-Toggle (Grid/List) als erstes Chip — analog zur Library
  const viewToggle = document.createElement("button");
  viewToggle.className = "view-toggle-chip";
  viewToggle.type = "button";
  viewToggle.title = wishlistViewMode === "grid" ? t("switchToList") : t("switchToGrid");
  viewToggle.setAttribute("aria-label", viewToggle.title);
  viewToggle.innerHTML = wishlistViewMode === "grid"
    ? `<span class="view-symbol">☷</span>`
    : `<span class="view-symbol">▦</span>`;
  viewToggle.addEventListener("click", safe("wishlistViewToggle", () => {
    wishlistViewMode = wishlistViewMode === "grid" ? "list" : "grid";
    renderWishlist();
  }));
  wrapper.appendChild(viewToggle);

  categories.forEach((label, index) => {
    const btn = document.createElement("button");
    btn.className = "filter-chip";
    const isAll = index === 0;
    const isActive = isAll ? (wishlistCurrentCategory === "Alle" || wishlistCurrentCategory === "All") : wishlistCurrentCategory === label;
    if (isActive) btn.classList.add("active");
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", safe("wishlistCategoryChip", () => {
      wishlistCurrentCategory = isAll ? "Alle" : label;
      wishlistCurrentSubcategory = "";
      renderWishlist();
    }));
    wrapper.appendChild(btn);
  });
}

function renderWishlistSubcategoryFilter() {
  const wrap = $("#wishlistSubcategoryFilterWrap");
  const select = $("#wishlistSubcategoryFilterSelect");
  if (!wrap || !select) return;
  const allLabels = ["Alle", "All"];
  if (allLabels.includes(wishlistCurrentCategory)) {
    wrap.classList.add("hidden");
    return;
  }
  const subs = getAvailableWishlistSubcategories();
  if (!subs.length) {
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");
  const allLabel = t("allSubcategories");
  select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` +
    subs.map((s) => `<option value="${escapeAttribute(s)}" ${s === wishlistCurrentSubcategory ? "selected" : ""}>${escapeHtml(s)}</option>`).join("");
}

function renderWishlistSortState() {
  const ascBtn = $("#wishlistSortAscBtn");
  const descBtn = $("#wishlistSortDescBtn");
  if (ascBtn) ascBtn.classList.toggle("active", wishlistSortDirection === "asc");
  if (descBtn) descBtn.classList.toggle("active", wishlistSortDirection === "desc");
  const select = $("#wishlistSortFieldSelect");
  if (select && [...select.options].some((o) => o.value === wishlistSortField)) {
    select.value = wishlistSortField;
  }
}

function renderWishlistGridCard(item) {
  const heading = [item.manufacturer, item.model].filter(Boolean).join(" ").trim() || "—";
  const links = parseWishlistLinks(item.links);
  const linksHtml = links.length
    ? `<div class="wishlist-links">${links.map((url, index) => `
        <a class="btn btn-ghost" target="_blank" rel="noopener" href="${escapeAttribute(url)}">${t("openLink")} ${links.length > 1 ? `#${index + 1}` : ""}</a>
      `).join("")}</div>`
    : "";
  const subline = [item.type, item.subcategory].filter(Boolean).join(" · ");
  return `
    <div class="device-image">
      <img src="${escapeAttribute(item.image || "")}" alt="${escapeAttribute(heading)}" onerror="this.style.display='none'">
    </div>
    <div class="device-body">
      ${item.manufacturerLogo ? `<div class="card-manufacturer-logo"><img class="manufacturer-logo" src="${escapeAttribute(item.manufacturerLogo)}" alt=""></div>` : ""}
      <h3>${escapeHtml(heading)}</h3>
      ${subline ? `<p>${escapeHtml(subline)}</p>` : ""}
      <div class="device-meta-grid">
        <span>${t("priceNew")}: <b>${formatCurrency(item.priceNew)}</b></span>
        <span>${t("priceUsed")}: <b>${formatCurrency(item.priceUsed)}</b></span>
      </div>
      ${linksHtml}
      <div class="wishlist-actions">
        <button class="btn btn-primary wishlist-move-btn" type="button" data-wishlist-id="${item.id}">${t("moveToLibrary")}</button>
        <button class="btn btn-ghost wishlist-edit-btn" type="button" data-wishlist-id="${item.id}">${t("editWishlist")}</button>
        <button class="btn btn-danger wishlist-delete-btn" type="button" data-wishlist-id="${item.id}">${t("deleteWishlist")}</button>
      </div>
    </div>
  `;
}

function renderWishlistListView(items) {
  const headers = [
    { key: "manufacturer", label: t("fieldManufacturer") },
    { key: "model", label: t("fieldModel") },
    { key: "type", label: t("fieldDeviceType") },
    { key: "subcategory", label: t("fieldSubcategory") },
    { key: "priceNew", label: t("priceNew") },
    { key: "priceUsed", label: t("priceUsed") },
    { key: "actions", label: "" },
  ];

  const headerHtml = headers.map((h) => {
    const isSortable = ["manufacturer", "model", "priceNew", "priceUsed"].includes(h.key);
    const isActive = wishlistSortField === h.key;
    const marker = isActive ? (wishlistSortDirection === "asc" ? "↑" : "↓") : "";
    return isSortable
      ? `<button class="list-sort-header wishlist-list-sort-header ${isActive ? "active" : ""}" type="button" data-sort-field="${h.key}"><span>${escapeHtml(h.label)}</span><b>${marker}</b></button>`
      : `<button class="list-sort-header" type="button" disabled><span>${escapeHtml(h.label)}</span></button>`;
  }).join("");

  const rowsHtml = items.map((item) => `
    <div class="device-list-row wishlist-list-row" data-wishlist-id="${item.id}" style="--list-cols:${headers.length}">
      <span>${escapeHtml(item.manufacturer || "—")}</span>
      <span>${escapeHtml(item.model || "—")}</span>
      <span>${escapeHtml(item.type || "—")}</span>
      <span>${escapeHtml(item.subcategory || "—")}</span>
      <span>${formatCurrency(item.priceNew)}</span>
      <span>${formatCurrency(item.priceUsed)}</span>
      <span class="wishlist-list-actions">
        <button class="btn btn-primary wishlist-move-btn" type="button" data-wishlist-id="${item.id}">${t("moveToLibrary")}</button>
        <button class="btn btn-ghost wishlist-edit-btn" type="button" data-wishlist-id="${item.id}">${t("editWishlist")}</button>
        <button class="btn btn-danger wishlist-delete-btn" type="button" data-wishlist-id="${item.id}">${t("deleteWishlist")}</button>
      </span>
    </div>
  `).join("");

  return `
    <div class="device-list-view">
      <div class="device-list-header" style="--list-cols:${headers.length}">${headerHtml}</div>
      ${rowsHtml}
    </div>
  `;
}

function renderWishlist() {
  renderWishlistStats();
  renderWishlistCategories();
  renderWishlistSubcategoryFilter();
  renderWishlistSortState();

  const grid = $("#wishlistGrid");
  const empty = $("#wishlistEmptyState");
  if (!grid) return;

  const filtered = getFilteredWishlist();
  if (empty) empty.classList.toggle("hidden", filtered.length > 0);

  if (wishlistViewMode === "list") {
    grid.classList.add("is-list-mode");
    grid.innerHTML = renderWishlistListView(filtered);

    grid.querySelectorAll(".wishlist-list-sort-header").forEach((button) => {
      button.addEventListener("click", safe("wishlistListSort", (event) => {
        event.stopPropagation();
        const nextField = button.dataset.sortField;
        if (wishlistSortField === nextField) {
          wishlistSortDirection = wishlistSortDirection === "asc" ? "desc" : "asc";
        } else {
          wishlistSortField = nextField;
          wishlistSortDirection = "asc";
        }
        renderWishlist();
      }));
    });
  } else {
    grid.classList.remove("is-list-mode");
    grid.innerHTML = "";
    filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = "device-card wishlist-card";
      card.innerHTML = renderWishlistGridCard(item);
      grid.appendChild(card);
    });
  }

  // Action-Buttons in Grid + List binden
  grid.querySelectorAll(".wishlist-move-btn").forEach((button) => {
    button.addEventListener("click", safe("wishlistMove", (event) => {
      event.stopPropagation();
      moveWishlistToLibrary(button.dataset.wishlistId);
    }));
  });
  grid.querySelectorAll(".wishlist-edit-btn").forEach((button) => {
    button.addEventListener("click", safe("wishlistEdit", (event) => {
      event.stopPropagation();
      openWishlistDialog("edit", button.dataset.wishlistId);
    }));
  });
  grid.querySelectorAll(".wishlist-delete-btn").forEach((button) => {
    button.addEventListener("click", safe("wishlistDelete", (event) => {
      event.stopPropagation();
      deleteWishlistItem(button.dataset.wishlistId);
    }));
  });
}

function openWishlistDialog(mode, id = null) {
  const form = $("#wishlistForm");
  if (!form) return;
  form.reset();
  editingWishlistId = mode === "edit" ? id : null;
  $("#wishlistDialogTitle").textContent = mode === "edit" ? t("wishlistDialogTitleEdit") : t("wishlistDialogTitleAdd");

  const item = editingWishlistId ? wishlist.find((entry) => String(entry.id) === String(editingWishlistId)) : null;
  if (item) {
    form.elements.manufacturer.value = item.manufacturer || "";
    form.elements.model.value = item.model || "";
    if (form.elements.type) form.elements.type.value = item.type || "";
    if (form.elements.subcategory) form.elements.subcategory.value = item.subcategory || "";
    if (form.elements.image) form.elements.image.value = item.image && !item.image.startsWith("data:") ? item.image : "";
    form.elements.priceNew.value = item.priceNew || "";
    form.elements.priceUsed.value = item.priceUsed || "";
    form.elements.links.value = item.links || "";
    pendingWishlistImage = item.image && item.image.startsWith("data:") ? item.image : "";
    pendingWishlistLogo = item.manufacturerLogo || "";
  } else {
    pendingWishlistImage = "";
    pendingWishlistLogo = "";
  }
  renderWishlistPreview();

  $("#wishlistDialog").showModal();
}

function renderWishlistPreview() {
  const box = $("#wishlistPreviewBox");
  if (!box) return;
  const formImage = $("#wishlistForm")?.elements.image?.value?.trim() || "";
  const previewImage = pendingWishlistImage || formImage;
  box.innerHTML = `
    ${previewImage ? `<img src="${escapeAttribute(previewImage)}" alt="" class="wishlist-preview-image">` : ""}
    ${pendingWishlistLogo ? `<img src="${escapeAttribute(pendingWishlistLogo)}" alt="" class="manufacturer-logo wishlist-preview-logo">` : ""}
  `;
}

function openWishlistImageSearch() {
  const form = $("#wishlistForm");
  if (!form) return;
  const manufacturer = form.elements.manufacturer?.value?.trim() || "";
  const model = form.elements.model?.value?.trim() || "";
  const title = [manufacturer, model].filter(Boolean).join(" ").trim();
  if (!title) {
    alert(t("wishlistSearchEmpty"));
    return;
  }
  const query = encodeQuery(`${title} product image`);
  window.open(`https://www.google.com/search?tbm=isch&q=${query}`, "_blank", "noopener");
}

function handleWishlistImageUpload(file) {
  if (!file) return;
  compressImageFile(file, { maxWidth: 1200, maxHeight: 1200 }, (dataUrl) => {
    if (!dataUrl) return;
    pendingWishlistImage = dataUrl;
    renderWishlistPreview();
  });
}

function handleWishlistLogoUpload(file) {
  if (!file) return;
  compressImageFile(file, { maxWidth: 400, maxHeight: 400, mime: "image/png", quality: 0.9 }, (dataUrl) => {
    if (!dataUrl) return;
    pendingWishlistLogo = dataUrl;
    renderWishlistPreview();
  });
}

function wishlistItemFromForm() {
  const form = $("#wishlistForm");
  const get = (name) => form.elements[name]?.value?.trim() || "";
  const formImage = get("image");
  const existing = editingWishlistId ? wishlist.find((entry) => String(entry.id) === String(editingWishlistId)) : null;

  // Logo-Auto-Zuordnung: wenn kein eigenes Logo, aber Hersteller schon mit Logo bekannt
  const manufacturerName = get("manufacturer");
  let manufacturerLogo = pendingWishlistLogo;
  if (!manufacturerLogo && manufacturerName) {
    const found = findExistingManufacturerLogo(manufacturerName);
    if (found) {
      manufacturerLogo = found;
      Logger.info("ui", `Logo automatisch zugewiesen für Hersteller "${manufacturerName}" (Wishlist)`);
    }
  }

  return normalizeWishlistItem({
    id: existing?.id || Date.now(),
    manufacturer: manufacturerName,
    model: get("model"),
    type: get("type"),
    subcategory: get("subcategory"),
    image: pendingWishlistImage || formImage,
    manufacturerLogo,
    priceNew: Number(get("priceNew")) || 0,
    priceUsed: Number(get("priceUsed")) || 0,
    links: get("links"),
  });
}

function saveWishlistItem(event) {
  event.preventDefault();
  const item = wishlistItemFromForm();
  if (editingWishlistId) {
    wishlist = wishlist.map((entry) => String(entry.id) === String(editingWishlistId) ? item : entry);
  } else {
    wishlist.unshift(item);
  }
  saveWishlist();
  $("#wishlistDialog").close();
  renderWishlist();
}

function deleteWishlistItem(id) {
  if (!confirm(t("confirmDeleteWishlist"))) return;
  wishlist = wishlist.filter((entry) => String(entry.id) !== String(id));
  saveWishlist();
  renderWishlist();
}

function moveWishlistToLibrary(id) {
  const item = wishlist.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  if (freeLimitReached()) return;
  if (!confirm(t("confirmMoveToLibrary"))) return;

  const purchasePrice = Number(item.priceUsed) || Number(item.priceNew) || 0;
  const name = [item.manufacturer, item.model].filter(Boolean).join(" ").trim() || item.model || item.manufacturer || "Neues Gerät";

  const newDevice = normalizeDevices([{
    id: Date.now(),
    name,
    manufacturer: item.manufacturer || "",
    model: item.model || "",
    type: item.type || "",
    subcategory: item.subcategory || "",
    manufacturerLogo: item.manufacturerLogo || "",
    image: item.image || "",
    purchaseYear: new Date().getFullYear(),
    purchasePrice,
    // Links bleiben klickbar (eigenes Feld) statt als Text in den Notizen zu landen
    links: parseWishlistLinks(item.links).join("\n"),
    status: "Aktiv",
    rating: 0,
  }])[0];

  devices.unshift(newDevice);
  saveDevices();
  wishlist = wishlist.filter((entry) => String(entry.id) !== String(id));
  saveWishlist();

  setView("library");
  selectedId = newDevice.id;
  $("#galleryView").classList.add("hidden");
  $("#detailView").classList.remove("hidden");
  renderAll();
  renderDetail();
}

function renderAll() {
  refreshInputSuggestions();
  renderBackupInfo();
  renderStats();
  renderGrid();
  renderCategories();
  renderSubcategoryFilter();
  if (selectedId) renderDetail();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function removeSelectedImage() {
  const device = selectedDevice();
  if (!device) return;
  if (!confirm(t("confirmRemoveImage"))) return;
  // Hauptbild entfernen; bei Galerie rückt das nächste Bild nach
  if (Array.isArray(device.images) && device.images.length) {
    device.images = device.images.slice(1);
    if (!device.images.length) delete device.images;
  }
  device.image = device.images?.[0] || "";
  saveDevices();
  renderDetail();
  renderGrid();
}

function printSelectedDevice() {
  const device = selectedDevice();
  if (!device) return;
  window.print();
}

function handleStartupChoice(mode) {
  if (mode === "demo") {
    devices = normalizeDevices(seedDevices);
    saveDevices();
  }
  if (mode === "empty") {
    devices = [];
    saveDevices();
  }
  safeLocalStorageSet(SETUP_KEY, "true");
  $("#startupDialog").close();
  selectedId = null;
  $("#detailView").classList.add("hidden");
  $("#galleryView").classList.remove("hidden");
  renderCategories();
  renderAll();
}

function maybeShowStartup() {
  const hasSetup = localStorage.getItem(SETUP_KEY) === "true";
  const hasData = (devices && devices.length > 0) || (wishlist && wishlist.length > 0);
  if (!hasSetup && !hasData) {
    $("#startupDialog")?.showModal();
  }
}


function showAppError(message) {
  console.error(message);
  const existing = document.querySelector(".app-error-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.className = "app-error-banner";
  banner.textContent = message;
  document.querySelector(".app-shell")?.prepend(banner);
}

function safe(name, fn) {
  return function (...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      Logger.error(`handler.${name}`, String(error?.message || error), { stack: error?.stack });
      showAppError(`Fehler in ${name}: ${error?.message || error}`);
    }
  };
}

/**
 * Enter im Formular speichert und schließt — Textarea-Enter bleibt Newline.
 * Wir rufen die Submit-Funktion direkt, damit auch Browser-Quirks (datalist
 * autocomplete, Safari etc.) das Verhalten konsistent zeigen.
 */
function enableEnterSubmit(formSelector, submitFn) {
  const form = $(formSelector);
  if (!form) return;
  form.addEventListener("keydown", safe(`enterSubmit:${formSelector}`, (event) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (!target) return;
    const tag = target.tagName;
    // Textarea: Enter bleibt Newline
    if (tag === "TEXTAREA") return;
    // Buttons handhaben Enter selbst (Cancel/Close-Buttons sollen nicht speichern)
    if (tag === "BUTTON") return;
    // Datei-Inputs ignorieren
    if (target.type === "file") return;
    event.preventDefault();
    submitFn(event);
  }));
}

// ── Besucher-Zähler ──
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function trackVisitor() {
  try {
    let uid = localStorage.getItem(VISITOR_UUID_KEY);
    if (!uid) {
      uid = generateUUID();
      localStorage.setItem(VISITOR_UUID_KEY, uid);
    }
    const type = isProUser() ? "pro" : "free";
    fetch(`counter.php?uid=${encodeURIComponent(uid)}&type=${type}`)
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.unique === "number") sessionStorage.setItem("sgm.visitorCount", String(data.unique));
        if (typeof data.free   === "number") sessionStorage.setItem("sgm.visitorFree",  String(data.free));
        if (typeof data.pro    === "number") sessionStorage.setItem("sgm.visitorPro",   String(data.pro));
      })
      .catch(() => {}); // Kein PHP → still scheitern
  } catch (_) {}
}

function renderVisitorCount() {
  const el = document.getElementById("visitorCountDisplay");
  if (!el) return;
  const count = sessionStorage.getItem("sgm.visitorCount");
  el.textContent = count ? `· ${count} Benutzer` : "";
}

// ── Lightbox: Schließen (top-level, immer verfügbar) ──
function closeLightbox() {
  const lb = document.getElementById("imageLightbox");
  if (!lb || lb.classList.contains("hidden")) return;
  lb.classList.add("hidden");
  const lbImg = document.getElementById("lightboxImg");
  if (lbImg) lbImg.src = "";
  lb.dataset.gallery = "";
  lb.dataset.galleryIdx = "0";
}

/** Öffnet die Lightbox mit einer Bildliste (Galerie) ab Index startIdx. */
function openLightbox(gallery, startIdx = 0) {
  const lb = document.getElementById("imageLightbox");
  const lbImg = document.getElementById("lightboxImg");
  const list = (gallery || []).filter(Boolean);
  if (!lb || !lbImg || !list.length) return;
  lb.dataset.gallery    = JSON.stringify(list);
  lb.dataset.galleryIdx = String(Math.min(Math.max(0, startIdx), list.length - 1));
  lbImg.src = list[Number(lb.dataset.galleryIdx)];
  lb.classList.remove("hidden");
  updateLightboxNav();
}

/** Galerie eines Geräts: alle Bilder (Pro) oder nur das Hauptbild. */
function openDeviceLightbox(device, fallbackSrc = "") {
  if (!device) return;
  const gallery = (isProUser() && device.images?.length > 1) ? device.images : [device.image || fallbackSrc];
  openLightbox(gallery, 0);
}

function isLightboxOpen() {
  const lb = document.getElementById("imageLightbox");
  return Boolean(lb && !lb.classList.contains("hidden"));
}

function updateLightboxNav() {
  const lb = document.getElementById("imageLightbox");
  if (!lb) return;
  let gallery = [];
  try { gallery = JSON.parse(lb.dataset.gallery || "[]"); } catch (_) {}
  const idx  = Number(lb.dataset.galleryIdx || 0);
  const show = gallery.length > 1;
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");
  const counter = document.getElementById("lightboxCounter");
  if (prevBtn) prevBtn.style.display = show ? "" : "none";
  if (nextBtn) nextBtn.style.display = show ? "" : "none";
  if (counter) counter.textContent   = show ? `${idx + 1} / ${gallery.length}` : "";
}

function lightboxNavigate(dir) {
  const lb = document.getElementById("imageLightbox");
  if (!lb) return;
  let gallery = [];
  try { gallery = JSON.parse(lb.dataset.gallery || "[]"); } catch (_) {}
  if (gallery.length < 2) return;
  let idx = (Number(lb.dataset.galleryIdx || 0) + dir + gallery.length) % gallery.length;
  lb.dataset.galleryIdx = String(idx);
  const lbImg = document.getElementById("lightboxImg");
  if (lbImg) lbImg.src = gallery[idx];
  updateLightboxNav();
}

// Lightbox: Klick-Handler (Nav-Buttons + Schließen in einem Listener)
document.addEventListener("click", (event) => {
  const lb = document.getElementById("imageLightbox");
  if (!lb || lb.classList.contains("hidden")) return;
  if (event.target.closest("#lightboxPrev")) { lightboxNavigate(-1); return; }
  if (event.target.closest("#lightboxNext")) { lightboxNavigate(1);  return; }
  closeLightbox();
});

// ESC → schließen, ←/→ → navigieren
document.addEventListener("keydown", (event) => {
  if (!isLightboxOpen()) return;
  if (event.key === "Escape")      closeLightbox();
  if (event.key === "ArrowRight")  lightboxNavigate(1);
  if (event.key === "ArrowLeft")   lightboxNavigate(-1);
});

function bindEvents() {

  $("#settingsBtn")?.addEventListener("click", safe("openSettings", openSettingsDialog));
  $("#settingsForm")?.addEventListener("submit", saveSettings);
  $("#closeSettingsBtn")?.addEventListener("click", () => $("#settingsDialog")?.close());
  $("#cancelSettingsBtn")?.addEventListener("click", () => $("#settingsDialog")?.close());
  $("#resetThemeBtn")?.addEventListener("click", resetTheme);
  $("#resetViewSettingsBtn")?.addEventListener("click", resetViewSettings);
  $("#resetSortWordsBtn")?.addEventListener("click", safe("resetSortWords", () => {
    sortIgnoreWords = [...DEFAULT_SORT_WORDS];
    saveSortWords();
    renderSortWordsEditor();
  }));
  document.querySelectorAll(".settings-tab").forEach((button) => {
    button.addEventListener("click", safe("settingsTab", () => {
      switchSettingsTab(button.dataset.settingsTab);
      if (button.dataset.settingsTab === "logs")   renderLogsList();
      if (button.dataset.settingsTab === "labels") renderLabelsEditor();
      if (button.dataset.settingsTab === "backup") { renderBackupInfo(); renderDonorCodeStatus(); renderAutoBackupStatus(); }
      if (button.dataset.settingsTab === "license") { renderLicenseStatus(); }
      if (button.dataset.settingsTab === "customFields") renderCustomFieldsEditor();
      if (button.dataset.settingsTab === "categories") renderCategoryManager();
    }));
  });
  $("#exportLogsBtn")?.addEventListener("click", safe("exportLogs", exportLogs));
  $("#clearLogsBtn")?.addEventListener("click",  safe("clearLogs",  clearLogs));
  $("#testNagBtn")?.addEventListener("click",    safe("testNag",    nagShowNow));
  $("#resetNagBtn")?.addEventListener("click",   safe("resetNag",   nagReset));
  $("#exportBtn")?.addEventListener("click",     safe("exportJson", exportJson));
  $("#importInput")?.addEventListener("change",  safe("importJson", (e) => importJson(e.target.files?.[0])));
  $("#autoBackupSetupBtn")?.addEventListener("click",   safe("autoBackupSetup",   setupAutoBackup));
  $("#autoBackupDisableBtn")?.addEventListener("click", safe("autoBackupDisable", disableAutoBackup));
  $("#redeemDonorCodeBtn")?.addEventListener("click", safe("redeemCode",  redeemDonationCode));
  $("#revokeDonorCodeBtn")?.addEventListener("click", safe("revokeCode",  revokeDonationCode));
  $("#donorCodeInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); redeemDonationCode(); }
  });
  $("#redeemLicenseBtn")?.addEventListener("click", safe("redeemLicense", redeemLicenseCode));
  $("#buyProBtn")?.addEventListener("click", safe("buyPro", () => {
    if (PRO_SHOP_URL) window.open(PRO_SHOP_URL, "_blank", "noopener");
    else { $("#settingsDialog")?.close(); showProOrderDialog(); }
  }));
  $("#revokeLicenseBtn")?.addEventListener("click", safe("revokeLicense",  revokeLicenseCode));
  $("#licenseCodeInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); redeemLicenseCode(); }
  });
  // Grid-Spalten Slider Live-Vorschau
  $("#gridColumnsInput")?.addEventListener("input", (e) => {
    const v = e.target.value;
    const display = document.getElementById("gridColumnsValue");
    if (display) display.textContent = v;
    if (isProUser()) {
      viewSettings.gridColumns = Number(v);
      saveViewSettings();
      applyGridColumns();
    }
  });
  $("#resetUserLabelsBtn")?.addEventListener("click", safe("resetLabels", resetUserLabels));
  $("#settingsForm")?.querySelectorAll('input[type="color"]').forEach((input) => {
    input.addEventListener("input", () => {
      const previewTheme = themeFromForm();
      applyTheme(previewTheme);
    });
  });

  $("#languageToggle")?.addEventListener("click", safe("languageToggle", () => {
    lang = lang === "de" ? "en" : "de";
    safeLocalStorageSet(LANG_KEY, lang);
    applyTranslations();
  }));

  $("#subcategoryFilterSelect")?.addEventListener("change", safe("subcategoryFilter", (event) => {
    currentSubcategory = event.target.value;
    renderGrid();
  }));

  $("#searchInput")?.addEventListener("input", safe("search.input", (event) => {
    searchQuery = event.target.value;
    event.target.closest(".search-wrap")?.classList.toggle("has-value", Boolean(searchQuery.trim()));
    renderGrid();
  }));

  $("#searchInput")?.addEventListener("blur", safe("search.blur", (event) => {
    event.target.closest(".search-wrap")?.classList.toggle("has-value", Boolean(event.target.value.trim()));
  }));

  $("#sortFieldSelect")?.addEventListener("change", safe("sortField", (event) => {
    sortField = event.target.value;
    renderGrid();
    renderSortState();
  }));

  $("#sortAscBtn")?.addEventListener("click", safe("sortAsc", () => {
    sortDirection = "asc";
    renderGrid();
    renderSortState();
  }));

  $("#sortDescBtn")?.addEventListener("click", safe("sortDesc", () => {
    sortDirection = "desc";
    renderGrid();
    renderSortState();
  }));

  $("#addDeviceBtn")?.addEventListener("click", safe("addDevice", () => {
    Logger.info("ui", "Add Device geklickt");
    openDialog("add");
  }));
  $("#editDeviceBtn")?.addEventListener("click", safe("editDevice", () => {
    if (selectedId) openDialog("edit", selectedId);
  }));
  $("#deleteDeviceBtn")?.addEventListener("click", safe("deleteDevice", deleteSelectedDevice));
  $("#duplicateDeviceBtn")?.addEventListener("click", safe("duplicateDevice", duplicateSelectedDevice));
  $("#toWishlistBtn")?.addEventListener("click", safe("toWishlist", addSelectedDeviceToWishlist));
  $("#markSoldBtn")?.addEventListener("click", safe("markSold", toggleSoldStatus));
  $("#addCustomFieldBtn")?.addEventListener("click", safe("addCustomField", addCustomField));
  $("#logoPositionSelect")?.addEventListener("change", safe("logoPosition", (e) => {
    if (!isProUser()) return;
    viewSettings.logoPosition = e.target.value === "inline" ? "inline" : "above";
    saveViewSettings();
    renderGrid();
  }));
  $("#resetColWidthsBtn")?.addEventListener("click", safe("resetColWidths", () => {
    viewSettings.listColWidths = {};
    saveViewSettings();
    renderGrid();
  }));
  $("#removeImageBtn")?.addEventListener("click", safe("removeImage", removeSelectedImage));
  $("#printDeviceBtn")?.addEventListener("click", safe("printDevice", printSelectedDevice));
  $("#backBtn")?.addEventListener("click", safe("backToGallery", closeDetail));
  $("#prevDeviceBtn")?.addEventListener("click", safe("prevDevice", () => goToAdjacentDevice("prev")));
  $("#nextDeviceBtn")?.addEventListener("click", safe("nextDevice", () => goToAdjacentDevice("next")));
  document.addEventListener("keydown", safe("kbdNav", (event) => {
    const detailOpen = $("#detailView") && !$("#detailView").classList.contains("hidden");
    if (!detailOpen || currentView !== "library") return;
    if (isLightboxOpen()) return; // Pfeiltasten blättern dann nur die Bilder, nicht die Geräte
    if (document.querySelector("dialog[open]")) return;
    if (event.target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); goToAdjacentDevice("prev"); }
    else if (event.key === "ArrowRight") { event.preventDefault(); goToAdjacentDevice("next"); }
  }));
  $("#imageSearchBtn")?.addEventListener("click", safe("imageSearch", openImageSearch));
  $("#imageUploadInput")?.addEventListener("change", safe("imageUpload", (event) => handleImageUpload(event.target.files?.[0])));

  // ── Bild-Zoom (Lightbox) — Öffnen ──
  $("#detailImage")?.addEventListener("click", (event) => {
    event.stopPropagation();
    const img = document.getElementById("detailImage");
    if (!img || !img.src || img.classList.contains("hidden")) return;
    openDeviceLightbox(selectedDevice(), img.src);
  });
  $("#formImageSearchBtn")?.addEventListener("click", safe("formImageSearch", openFormImageSearch));
  $("#formImageUploadBtn")?.addEventListener("click", () => $("#formImageUploadInput")?.click());
  $("#formImageAddBtn")?.addEventListener("click",    () => $("#formImageUploadInput")?.click());
  $("#formImageUploadInput")?.addEventListener("change", safe("formImageUpload", (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (isProUser()) {
      Array.from(files).forEach(f => handleFormImageUpload(f));
    } else {
      handleFormImageUpload(files[0]);
    }
    event.target.value = ""; // Reset damit dieselbe Datei erneut wählbar ist
  }));
  $("#deviceForm")?.addEventListener("submit", safe("saveDevice", saveFormDevice));
  $("#manufacturerLogoInput")?.addEventListener("change", safe("logoUpload", (event) => handleManufacturerLogoUpload(event.target.files?.[0])));
  $("#deviceForm")?.elements.manufacturer?.addEventListener("input", safe("manufacturerInput", (event) => {
    if (!pendingManufacturerLogo) {
      const found = findExistingManufacturerLogo(event.target.value);
      if (found) {
        pendingManufacturerLogo = found;
        renderManufacturerLogoPreview();
      }
    }
  }));
  $("#addDocumentBtn")?.addEventListener("click", safe("addDocument", addDocumentAttachment));
  $("#closeDialogBtn")?.addEventListener("click", safe("closeDeviceDialog", () => $("#deviceDialog")?.close()));
  $("#cancelDialogBtn")?.addEventListener("click", safe("cancelDeviceDialog", () => $("#deviceDialog")?.close()));
  $("#exportCsvBtn")?.addEventListener("click", safe("exportCsv", exportCsv));
  $("#startupImportInput")?.addEventListener("change", safe("startupImport", (event) => {
    importJson(event.target.files?.[0]);
    safeLocalStorageSet(SETUP_KEY, "true");
    $("#startupDialog")?.close();
  }));
  $("#startDemoBtn")?.addEventListener("click", safe("startDemo", () => handleStartupChoice("demo")));
  $("#startEmptyBtn")?.addEventListener("click", safe("startEmpty", () => handleStartupChoice("empty")));
  $("#startupRedeemLicenseBtn")?.addEventListener("click", safe("startupRedeemLicense", async () => {
    const input = $("#startupLicenseInput");
    const feedback = $("#startupLicenseFeedback");
    if (!input || !feedback) return;
    const raw = input.value.trim();
    if (!raw) return;
    const valid = await validateLicenseCode(raw);
    if (valid) {
      if (!storeLicense(raw)) {
        feedback.textContent = t("licenseStoreFailed");
        feedback.style.color = "var(--err, #f87171)";
        return;
      }
      feedback.textContent = t("licenseCodeSuccess");
      feedback.style.color = "var(--ok, #4ade80)";
      Logger.info("license", "Pro-Lizenz beim Start eingelöst");
      onLicenseChanged();
    } else {
      feedback.textContent = t("licenseCodeInvalid");
      feedback.style.color = "var(--err, #f87171)";
    }
  }));
  $("#startupLicenseInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); $("#startupRedeemLicenseBtn")?.click(); }
  });

  document.querySelectorAll(".view-toggle-btn").forEach((button) => {
    button.addEventListener("click", safe("viewToggle", () => setView(button.dataset.view)));
  });
  $("#addWishlistBtn")?.addEventListener("click", safe("addWishlist", () => {
    Logger.info("ui", "Add Wishlist geklickt");
    openWishlistDialog("add");
  }));
  $("#wishlistForm")?.addEventListener("submit", safe("saveWishlistItem", saveWishlistItem));
  $("#closeWishlistDialogBtn")?.addEventListener("click", safe("closeWishlistDialog", () => $("#wishlistDialog")?.close()));
  $("#cancelWishlistDialogBtn")?.addEventListener("click", safe("cancelWishlistDialog", () => $("#wishlistDialog")?.close()));
  $("#wishlistImageInput")?.addEventListener("change", safe("wishlistImageUpload", (event) => handleWishlistImageUpload(event.target.files?.[0])));
  $("#wishlistLogoInput")?.addEventListener("change", safe("wishlistLogoUpload", (event) => handleWishlistLogoUpload(event.target.files?.[0])));
  $("#wishlistImageSearchBtn")?.addEventListener("click", safe("wishlistImageSearch", openWishlistImageSearch));
  $("#wishlistForm")?.elements.image?.addEventListener("input", safe("wishlistImageInput", renderWishlistPreview));
  $("#wishlistForm")?.elements.manufacturer?.addEventListener("input", safe("wishlistManufacturerInput", (event) => {
    if (!pendingWishlistLogo) {
      const found = findExistingManufacturerLogo(event.target.value);
      if (found) {
        pendingWishlistLogo = found;
        renderWishlistPreview();
      }
    }
  }));

  // Enter speichert in allen Dialog-Formularen
  enableEnterSubmit("#deviceForm", saveFormDevice);
  enableEnterSubmit("#wishlistForm", saveWishlistItem);
  enableEnterSubmit("#settingsForm", saveSettings);

  // Wishlist-Toolbar
  $("#wishlistSearchInput")?.addEventListener("input", safe("wishlistSearch", (event) => {
    wishlistSearchQuery = event.target.value;
    event.target.closest(".search-wrap")?.classList.toggle("has-value", Boolean(wishlistSearchQuery.trim()));
    renderWishlist();
  }));
  $("#wishlistSortFieldSelect")?.addEventListener("change", safe("wishlistSortField", (event) => {
    wishlistSortField = event.target.value;
    renderWishlist();
  }));
  $("#wishlistSortAscBtn")?.addEventListener("click", safe("wishlistSortAsc", () => {
    wishlistSortDirection = "asc";
    renderWishlist();
  }));
  $("#wishlistSortDescBtn")?.addEventListener("click", safe("wishlistSortDesc", () => {
    wishlistSortDirection = "desc";
    renderWishlist();
  }));
  $("#wishlistSubcategoryFilterSelect")?.addEventListener("change", safe("wishlistSubcategoryFilter", (event) => {
    wishlistCurrentSubcategory = event.target.value;
    renderWishlist();
  }));

  // Nag-Toast (Spenden-Hinweis)
  $("#nagCloseBtn")?.addEventListener("click", safe("nagClose", () => nagDismiss("close")));
  $("#nagLaterBtn")?.addEventListener("click", safe("nagLater", () => nagDismiss("later")));
  $("#nagDonateBtn")?.addEventListener("click", safe("nagDonate", nagDonate));
}

function runTests() {
  console.assert(Array.isArray(devices), "devices must be an array");
  console.assert(i18n.de.tabs.length === tabKeys.length, "DE tabs must match tab keys");
  console.assert(i18n.en.tabs.length === tabKeys.length, "EN tabs must match tab keys");
  console.assert(devices.every((device) => device.name), "each device needs a name");
  console.assert(devices.every((device) => Number(device.marketMin) <= Number(device.marketMax)), "marketMin must be <= marketMax");
  console.assert(devices.every((device) => Number(device.rating || 0) >= 0 && Number(device.rating || 0) <= 5), "rating must be between 0 and 5");
  console.assert(normalizeSearchText("MOTÜ").includes("motu"), "search normalization should remove diacritics");
  console.assert(normalizeDocs([{ name: "Manual" }]).length === 1, "normalizeDocs should parse documents");
  console.assert(normalizeDevices([{ id: 1, name: "X" }])[0].subcategory === "", "normalizeDevices should add subcategory");
  console.assert(Array.isArray(getAvailableSubcategories()), "subcategory filter should return a list");
  console.assert(/[€$]/.test(formatCurrency(1787)), "currency formatting should include currency symbol");
  console.assert(renderRating({ id: 1, rating: 3 }).includes("rating-star"), "renderRating should output stars");
  console.assert(sortDevices([{ id: 1, name: "B" }, { id: 2, name: "A" }]).length === 2, "sortDevices should return a list");
  const previousSortField = sortField;
  const previousSortDirection = sortDirection;
  sortField = "name"; sortDirection = "asc";
  console.assert(sortDevices([{ id: 1, name: "B" }, { id: 2, name: "A" }])[0].name === "A", "name sorting should work");
  sortField = previousSortField;
  sortDirection = previousSortDirection;
  console.assert(renderCardRatingTop({ id: 1, rating: 4 }).includes("rating-stars"), "grid top rating should render");
  console.assert(renderCardRatingBottom({ id: 1, rating: 4 }).includes("/5"), "grid bottom rating should render");
  console.assert(midiChannelSortValue({ midi: { channel: "Ch 10" } }) === 10, "MIDI channel sorting should parse numbers");
  console.assert(compareSortValues("A", "B") < 0, "generic sort comparison should work");
  console.assert(getDeviceSortValue({ manufacturer: "Roland" }, "manufacturer") === "Roland", "generic device sort value should work");
  console.assert(renderReadOnlyStars(3).includes("readonly-star"), "read-only stars should render");
  console.assert(logoMarkup({ manufacturerLogo: "data:image/png;base64,abc", manufacturer: "X" }).includes("manufacturer-logo"), "manufacturer logo should render");
  console.assert(fieldDefinitions.grid.length > 30 && fieldDefinitions.list.length > 30, "all captured fields should be configurable");
  console.assert(Array.isArray(getSuggestionsForField("manufacturer")), "suggestions should return an array");
  console.assert(renderListCell({ manufacturer: "Roland" }, "manufacturer").includes("Roland"), "list cell renderer should work");
  console.assert(defaultTheme.accentColor.startsWith("#"), "default theme should use hex colors");
  console.assert(defaultTheme.btnAddBg.startsWith("#"), "per-button theme defaults should exist");
  console.assert(normalizeDevices([{ id: 1, name: "X", marketMin: 1, marketMax: 2 }])[0].rating >= 0, "normalizeDevices should add rating");
}

/* ============================================================
   Boot — jeder Schritt einzeln abgesichert, damit ein Fehler
   in einem Schritt nicht die ganze App lahmlegt.
   ============================================================ */
function safeBootStep(name, fn) {
  try {
    fn();
    Logger.info("boot", `Schritt ok: ${name}`);
  } catch (error) {
    Logger.error("boot", `Fehler in Schritt: ${name}`, { error: String(error?.message || error), stack: error?.stack });
    showAppError(`Fehler beim Starten (${name}): ${error?.message || error}. Bestehende Daten wurden nicht gelöscht.`);
  }
}

async function safeBootStepAsync(name, fn) {
  try {
    await fn();
    Logger.info("boot", `Schritt ok (async): ${name}`);
  } catch (error) {
    Logger.error("boot", `Fehler in async-Schritt: ${name}`, { error: String(error?.message || error), stack: error?.stack });
    showAppError(`Fehler beim Starten (${name}): ${error?.message || error}.`);
  }
}

function detectDialogSupport() {
  const dialog = document.createElement("dialog");
  const supported = typeof dialog.showModal === "function";
  if (!supported) {
    Logger.error("boot", "Browser unterstützt <dialog>-Element nicht — Dialoge werden nicht öffnen", {
      userAgent: navigator.userAgent,
    });
    showAppError("Hinweis: Dieser Browser ist veraltet und unterstützt keine Dialog-Elemente. Bitte einen aktuellen Chrome, Firefox, Safari oder Edge verwenden.");
  }
  return supported;
}

(async function bootSequence() {
  // Schritte, die keine Daten brauchen
  safeBootStep("dialog support", detectDialogSupport);
  safeBootStep("applyTheme", applyTheme);
  safeBootStep("applySortCriteria", applySortCriteria);
  safeBootStep("applyGridColumns", applyGridColumns);
  safeBootStep("trackVisitor", trackVisitor);
  safeBootStep("applyTranslations", applyTranslations);

  // Events FRÜH binden — auch wenn Daten-Load später scheitert, müssen Buttons reagieren.
  // Erstes Render mit leeren Arrays. Daten-Load aktualisiert die Anzeige nachträglich.
  safeBootStep("bindEvents", bindEvents);
  safeBootStep("renderAll (leer)", renderAll);

  // Daten-Schicht initialisieren (IndexedDB öffnen + Migration)
  await safeBootStepAsync("initDataLayer", initDataLayer);

  // Auto-Backup Handle laden (nach IndexedDB-Init)
  await safeBootStepAsync("initAutoBackup", initAutoBackup);

  // Daten asynchron laden
  await safeBootStepAsync("loadDevices", async () => {
    devices = await loadDevicesAsync();
  });
  await safeBootStepAsync("loadWishlist", async () => {
    wishlist = await loadWishlistAsync();
  });

  // Erneut rendern mit echten Daten
  safeBootStep("customSortOptions", renderCustomSortOptions);
  safeBootStep("renderAll", renderAll);

  // Letzte Ansicht wiederherstellen
  safeBootStep("restoreView", () => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "wishlist" || saved === "library") {
      setView(saved);
    }
  });

  // Startup-Dialog ggf. anzeigen
  safeBootStep("maybeShowStartup", maybeShowStartup);
  safeBootStep("showWhatsNewIfNeeded", showWhatsNewIfNeeded);

  // Nag-Toast (Spendenhinweis) zeitversetzt einplanen — keine Belästigung beim Start
  safeBootStep("scheduleNag", scheduleNextNag);

  // Tests laufen nur im Debug-Modus (?debug=1) und sind nicht-blockierend.
  if (/[?&]debug=1\b/.test(location.search)) {
    safeBootStep("runTests", runTests);
  }

  Logger.info("boot", "App-Boot abgeschlossen", {
    devices: devices.length,
    wishlist: wishlist.length,
    view: currentView,
    dbAvailable: _dbAvailable,
  });
})();
