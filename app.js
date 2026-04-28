const STORAGE_KEY = "studioGearManager.devices.v1";
const WISHLIST_KEY = "studioGearManager.wishlist.v1";
const LANG_KEY = "studioGearManager.lang.v1";
const SETUP_KEY = "studioGearManager.setupDone.v1";
const LAST_BACKUP_KEY = "studioGearManager.lastBackup.v1";
const THEME_KEY = "studioGearManager.theme.v1";
const VIEW_SETTINGS_KEY = "studioGearManager.viewSettings.v1";
const LOG_KEY = "studioGearManager.logs.v1";
const VIEW_KEY = "studioGearManager.currentView.v1";
const LABELS_KEY = "studioGearManager.labels.v1";
const NAG_DISMISSED_KEY = "studioGearManager.nagDismissed.v1";
const NAG_DONATED_KEY = "studioGearManager.nagDonated.v1";

// === Spendenlink ===
const DONATION_URL = "https://www.paypal.com/donate/?hosted_button_id=EBGB8X7Y7AVKE";

// Nag-Intervall: zufällig zwischen 5 und 15 Minuten
const NAG_MIN_DELAY_MS = 5 * 60 * 1000;
const NAG_MAX_DELAY_MS = 15 * 60 * 1000;
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
    backupReminderTitle: "Lokale Speicherung aktiv",
    backupReminderText: "Die Daten liegen nur in diesem Browser. Bitte regelmäßig ein JSON-Backup exportieren.",
    backupNow: "Backup exportieren",
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
    settingsTitle: "Setup / Farben",
    settingsIntro: "Hier kannst du die wichtigsten Farben der Oberfläche anpassen. Die Einstellungen werden lokal im Browser gespeichert.",
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
    statValue: "Gesamtwert",
    statDocs: "Dokumente",
    statIssues: "Mängel",
    emptyState: "Keine Geräte gefunden.",
    backToGallery: "Zur Galerie",
    devicePassport: "Gerätepass / Datenmaske",
    noImage: "Kein Bild verfügbar",
    searchImage: "Bild suchen",
    ownImage: "Eigenes Bild",
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
    tabs: ["Übersicht", "Audio", "MIDI", "Strom", "Wert", "Dokumente", "Bewertung", "Notizen"],
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
  },
  en: {

    localEdition: "Local Browser Edition",
    startupTitle: "Welcome to Studio Gear Manager",
    startupText: "This app runs locally in your browser. Your data is not transferred to a server; it is stored in this browser. Export a JSON backup regularly.",
    startDemo: "Load demo data",
    startEmpty: "Start empty library",
    importBackup: "Import backup",
    backupReminderTitle: "Local storage active",
    backupReminderText: "The data only exists in this browser. Please export a JSON backup regularly.",
    backupNow: "Export backup",
    exportCsv: "Export CSV",
    sortLabel: "Sortieren",
    sortAddedDesc: "Zuletzt hinzugefügt",
    sortNameAsc: "Alphabetisch A–Z",
    sortRatingDesc: "Rating absteigend",
    sortPriceDesc: "Preis absteigend",
    sortYearDesc: "Anschaffungsjahr neueste",
    printDevice: "Print device passport",
    removeImage: "Remove image",
    settingsTitle: "Setup / Colors",
    settingsIntro: "Adjust the main interface colors here. Settings are stored locally in this browser.",
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
    statValue: "Total value",
    statDocs: "Documents",
    statIssues: "Issues",
    emptyState: "No devices found.",
    backToGallery: "Back to gallery",
    devicePassport: "Device passport / data sheet",
    noImage: "No image available",
    searchImage: "Search image",
    ownImage: "Own image",
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
  if (document.querySelector(".settings-tab")) switchSettingsTab("colors");
  $("#settingsDialog")?.showModal();
}

function saveSettings(event) {
  event.preventDefault();
  currentTheme = themeFromForm();
  safeStorageWrite(THEME_KEY, currentTheme, "theme");
  applyTheme();
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
    { key: "manufacturerLogo", labelKey: "fieldManufacturerLogo" },
    { key: "name", labelKey: "fieldDeviceName" },
    { key: "manufacturer", labelKey: "fieldManufacturer" },
    { key: "model", labelKey: "fieldModel" },
    { key: "serialNumber", labelKey: "fieldSerialNumber" },
    { key: "firmwareVersion", labelKey: "fieldFirmwareVersion" },
    { key: "type", labelKey: "fieldDeviceType" },
    { key: "subcategory", labelKey: "fieldSubcategory" },
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
    "manufacturerLogo", "manufacturer", "model", "type", "subcategory",
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
    };
  } catch {
    return clonePlain(defaultViewSettings);
  }
}

function saveViewSettings() {
  return safeStorageWrite(VIEW_SETTINGS_KEY, viewSettings, "viewSettings");
}

function renderViewSettingsControls() {
  renderFieldToggleList("grid", $("#gridFieldSettings"));
  renderFieldToggleList("list", $("#listFieldSettings"));
  renderLogsList();
  renderLabelsEditor();
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

/* ============================================================
   Nag-Toast — kleiner Hinweis mit Spendenbutton, alle 5–15 min
   ============================================================ */
function nagShouldSuppress() {
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
  container.innerHTML = fieldDefinitions[view].map((field) => {
    const checked = viewSettings[view]?.[field.key] ? "checked" : "";
    return `
      <label class="field-toggle">
        <input type="checkbox" data-view="${view}" data-field="${field.key}" ${checked}>
        <span>${t(field.labelKey)}</span>
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
let pendingDocs = [];
let pendingManufacturerLogo = "";
let currentCategory = "Alle";
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
    rating: Math.max(0, Math.min(5, Number(device.rating || (index === 0 ? 4 : index === 1 ? 5 : index === 2 ? 4 : 0)))),
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
      .then(() => Logger.info("storage", "Geräte gespeichert (IndexedDB)", { count: devices.length }))
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
    if (t(key)) node.textContent = t(key);
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
  renderSortState();
  const allSubOption = document.querySelector('#subcategoryFilterSelect option[value=""]');
  if (allSubOption) allSubOption.textContent = t("allSubcategories");
  renderCategories();
  renderSubcategoryFilter();
  renderTabs();
  renderAll();
}

function renderCategories() {
  const wrapper = $("#categoryFilters");
  if (!wrapper) return;
  const categories = [t("all"), ...new Set(devices.map((device) => device.type).filter(Boolean))];
  const canonicalAll = lang === "de" ? "Alle" : "All";
  wrapper.innerHTML = "";

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

  categories.forEach((categoryLabel, index) => {
    const btn = document.createElement("button");
    btn.className = "filter-chip";
    const isAll = index === 0;
    const isActive = isAll ? (currentCategory === "Alle" || currentCategory === "All") : currentCategory === categoryLabel;
    if (isActive) btn.classList.add("active");
    btn.textContent = categoryLabel;
    btn.addEventListener("click", () => {
      currentCategory = isAll ? canonicalAll : categoryLabel;
      currentSubcategory = "";
      renderAll();
    });
    wrapper.appendChild(btn);
  });
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
  const values = {
    deviceImage: device.image || "",
    manufacturerLogo: device.manufacturerLogo || "",
    name: device.name || "",
    manufacturer: device.manufacturer || "",
    model: device.model || "",
    type: device.type || "",
    subcategory: device.subcategory || "",
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
    year: Number(device.purchaseYear || 0),
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
      ...(device.docs || []).map((doc) => `${doc.name} ${doc.filename} ${doc.type}`),
    ].join(" "));

    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesCategory = allLabels.includes(currentCategory) || device.type === currentCategory;
    const matchesSubcategory = !currentSubcategory || device.subcategory === currentSubcategory;
    return matchesQuery && matchesCategory && matchesSubcategory;
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
  const totalValue = devices.reduce((sum, device) => sum + Number(device.marketMedian || 0), 0);
  const totalDocs = devices.reduce((sum, device) => sum + (device.docs?.length || 0), 0);
  const issues = devices.filter(issueDetected).length;

  setText("#statDevices", String(devices.length));
  setText("#statValue", formatCurrency(totalValue));
  setText("#statDocs", String(totalDocs));
  setText("#statIssues", String(issues));
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
  const docs = normalizeDocs(device.docs || []);
  const values = {
    deviceImage: device.image ? `<img class="mini-device-image" src="${escapeAttribute(device.image)}" alt="${escapeAttribute(device.name || "")}">` : "—",
    manufacturerLogo: logoMarkup(device, "manufacturer-logo list-logo-img") || "—",
    name: escapeHtml(device.name || "—"),
    manufacturer: escapeHtml(device.manufacturer || "—"),
    model: escapeHtml(device.model || "—"),
    serialNumber: escapeHtml(device.serialNumber || "—"),
    firmwareVersion: escapeHtml(device.firmwareVersion || "—"),
    type: escapeHtml(device.type || "—"),
    subcategory: escapeHtml(device.subcategory || "—"),
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
  const fields = fieldDefinitions.grid.filter((field) => {
    if (["deviceImage", "manufacturerLogo", "name", "type", "subcategory", "rating"].includes(field.key)) return false;
    return viewSettings.grid[field.key];
  });

  return fields.map((field) => `
    <span title="${escapeAttribute(t(field.labelKey))}">
      ${escapeHtml(t(field.labelKey))}: <b>${getDeviceFieldDisplay(device, field.key)}</b>
    </span>
  `).join("");
}

function renderListView(devicesToShow) {
  const fields = fieldDefinitions.list.filter((field) => viewSettings.list[field.key]);

  const header = fields.map((field) => {
    const isActive = sortField === field.key;
    const marker = isActive ? (sortDirection === "asc" ? "↑" : "↓") : "";
    return `
      <button class="list-sort-header ${isActive ? "active" : ""}" type="button" data-sort-field="${field.key}" title="${escapeAttribute(t(field.labelKey))}">
        <span>${t(field.labelKey)}</span>
        <b>${marker}</b>
      </button>
    `;
  }).join("");

  const rows = devicesToShow.map((device) => {
    const cells = fields.map((field) => `<span class="list-${field.key}">${getDeviceFieldDisplay(device, field.key)}</span>`).join("");
    return `<button class="device-list-row" type="button" data-device-id="${device.id}" style="--list-cols:${Math.max(fields.length, 1)}">${cells}</button>`;
  }).join("");

  return `
    <div class="device-list-view">
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
  const grid = $("#deviceGrid");
  if (!grid) return;
  const filtered = getFilteredDevices();
  grid.innerHTML = "";
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
    return;
  }

  grid.classList.remove("is-list-mode");

  filtered.forEach((device) => {
    const card = document.createElement("button");
    card.className = "device-card";
    card.type = "button";
    card.addEventListener("click", () => openDetail(device.id));

    const hasIssue = issueDetected(device);
    card.innerHTML = `
      ${viewSettings.grid.deviceImage ? `
      <div class="device-image">
        <img src="${escapeHtml(device.image || "")}" alt="${escapeHtml(device.name)}" onerror="this.style.display='none'">
        <span class="badge">${escapeHtml(device.status || "")}</span>
        ${hasIssue ? `<span class="issue-badge">!</span>` : ""}
      </div>` : ""}
      <div class="device-body">
        ${viewSettings.grid.rating ? renderCardRatingTop(device) : ""}
        ${viewSettings.grid.manufacturerLogo ? `<div class="card-manufacturer-logo">${logoMarkup(device)}</div>` : ""}
        ${viewSettings.grid.name ? `<h3>${escapeHtml(device.name)}</h3>` : ""}
        ${(viewSettings.grid.type || viewSettings.grid.subcategory) ? `<p>${escapeHtml([
          viewSettings.grid.type ? device.type : "",
          viewSettings.grid.subcategory ? device.subcategory : ""
        ].filter(Boolean).join(" · "))}</p>` : ""}
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
  $("#detailCategory").textContent = [device.type, device.subcategory].filter(Boolean).join(" · ");
  $("#detailRating").innerHTML = renderRating(device, "detail");
  $("#detailRating").querySelectorAll(".rating-star").forEach((star) => {
    star.addEventListener("click", (event) => {
      event.stopPropagation();
      setDeviceRating(star.dataset.deviceId, star.dataset.rating);
    });
  });
  $("#detailMarketRange").textContent = `${device.marketMin || 0}–${device.marketMax || 0} ${currencySymbol()}`;
  $("#detailMarketMeta").textContent = `${t("median")} ${device.marketMedian || 0} ${currencySymbol()} · ${device.lastChecked || ""}`;

  renderTabs();
  renderTabContent(device);
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
        ${field(t("serialNumber"), device.serialNumber)}
        ${field(t("firmwareVersion"), device.firmwareVersion)}
        ${field(t("warrantyUntil"), formatDisplayDate(device.warrantyUntil))}
        ${field(t("audio"), `${device.audio?.outputs || "—"} / ${device.audio?.inputs || "—"}`)}
        ${field("MIDI", `In ${device.midi?.in || "—"}, Out ${device.midi?.out || "—"}, Thru ${device.midi?.thru || "—"}`)}
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
        ${field(t("marketRange"), `${device.marketMin || 0}–${device.marketMax || 0} ${currencySymbol()}`)}
        ${field(t("median"), `${device.marketMedian || 0} ${currencySymbol()}`)}
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

    content.innerHTML = `
      <div class="doc-list">
        ${rows || `<div class="notes-box">${t("emptyState")}</div>`}
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
    content.innerHTML = `<div class="notes-box">${escapeHtml(device.notes || "—")}</div>`;
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
    if (saveDevices()) {
      renderDetail();
      renderGrid();
    }
  });
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
  "name", "manufacturer", "model", "serialNumber", "firmwareVersion", "type", "subcategory", "status", "condition", "location",
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
    renderManufacturerLogoPreview();
    renderDocumentAttachmentList(pendingDocs);
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
    notes: device.notes,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? "";
  });
  form.elements.warrantyUntil.value = toDateInputValue(device.warrantyUntil);
  pendingManufacturerLogo = device.manufacturerLogo || "";
  renderManufacturerLogoPreview();
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
    status: get("status") || "Aktiv",
    condition: get("condition"),
    location: get("location"),
    image: get("image"),
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
    devices.unshift(device);
    selectedId = device.id;
  }

  saveDevices();
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

function exportJson() {
  const blob = new Blob([JSON.stringify(devices, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
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
    ["Name", "Hersteller", "Modell", "Seriennummer", "Firmware Version", "Typ", "Subkategorie", "Status", "Zustand", "Standort", "Kaufjahr", "Anschaffungspreis", "Marktwert Min", "Marktwert Max", "Median", "MIDI Kanal", "Audio Ausgänge", "Audio Eingänge", "Bewertung", "Notizen"],
    ...devices.map((device) => [
      device.name,
      device.manufacturer,
      device.model,
      device.serialNumber,
      device.firmwareVersion,
      device.type,
      device.subcategory,
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
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "[]"));
      if (!Array.isArray(parsed)) throw new Error("Invalid JSON");
      devices = normalizeDevices(parsed);
      saveDevices();
      refreshInputSuggestions();
      selectedId = null;
      $("#detailView").classList.add("hidden");
      $("#galleryView").classList.remove("hidden");
      renderCategories();
      renderAll();
    } catch {
      alert(t("importError"));
    }
  };
  reader.readAsText(file);
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
      .then(() => Logger.info("storage", "Wishlist gespeichert (IndexedDB)", { count: wishlist.length }))
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
    form.elements.image.value = item.image && !item.image.startsWith("data:") ? item.image : "";
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
    notes: parseWishlistLinks(item.links).join("\n"),
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
  device.image = "";
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

function bindEvents() {

  $("#settingsBtn")?.addEventListener("click", safe("openSettings", openSettingsDialog));
  $("#settingsForm")?.addEventListener("submit", saveSettings);
  $("#closeSettingsBtn")?.addEventListener("click", () => $("#settingsDialog")?.close());
  $("#cancelSettingsBtn")?.addEventListener("click", () => $("#settingsDialog")?.close());
  $("#resetThemeBtn")?.addEventListener("click", resetTheme);
  $("#resetViewSettingsBtn")?.addEventListener("click", resetViewSettings);
  document.querySelectorAll(".settings-tab").forEach((button) => {
    button.addEventListener("click", safe("settingsTab", () => {
      switchSettingsTab(button.dataset.settingsTab);
      if (button.dataset.settingsTab === "logs") renderLogsList();
      if (button.dataset.settingsTab === "labels") renderLabelsEditor();
    }));
  });
  $("#exportLogsBtn")?.addEventListener("click", safe("exportLogs", exportLogs));
  $("#clearLogsBtn")?.addEventListener("click", safe("clearLogs", clearLogs));
  $("#testNagBtn")?.addEventListener("click", safe("testNag", nagShowNow));
  $("#resetNagBtn")?.addEventListener("click", safe("resetNag", nagReset));
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
  $("#removeImageBtn")?.addEventListener("click", safe("removeImage", removeSelectedImage));
  $("#printDeviceBtn")?.addEventListener("click", safe("printDevice", printSelectedDevice));
  $("#backBtn")?.addEventListener("click", safe("backToGallery", closeDetail));
  $("#prevDeviceBtn")?.addEventListener("click", safe("prevDevice", () => goToAdjacentDevice("prev")));
  $("#nextDeviceBtn")?.addEventListener("click", safe("nextDevice", () => goToAdjacentDevice("next")));
  document.addEventListener("keydown", safe("kbdNav", (event) => {
    const detailOpen = $("#detailView") && !$("#detailView").classList.contains("hidden");
    if (!detailOpen || currentView !== "library") return;
    if (event.target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); goToAdjacentDevice("prev"); }
    else if (event.key === "ArrowRight") { event.preventDefault(); goToAdjacentDevice("next"); }
  }));
  $("#imageSearchBtn")?.addEventListener("click", safe("imageSearch", openImageSearch));
  $("#imageUploadInput")?.addEventListener("change", safe("imageUpload", (event) => handleImageUpload(event.target.files?.[0])));
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
  $("#exportBtn")?.addEventListener("click", safe("exportJson", exportJson));
  $("#exportCsvBtn")?.addEventListener("click", safe("exportCsv", exportCsv));
  $("#importInput")?.addEventListener("change", safe("importJson", (event) => importJson(event.target.files?.[0])));
  $("#startupImportInput")?.addEventListener("change", safe("startupImport", (event) => {
    importJson(event.target.files?.[0]);
    safeLocalStorageSet(SETUP_KEY, "true");
    $("#startupDialog")?.close();
  }));
  $("#startDemoBtn")?.addEventListener("click", safe("startDemo", () => handleStartupChoice("demo")));
  $("#startEmptyBtn")?.addEventListener("click", safe("startEmpty", () => handleStartupChoice("empty")));

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
  safeBootStep("applyTranslations", applyTranslations);

  // Events FRÜH binden — auch wenn Daten-Load später scheitert, müssen Buttons reagieren.
  // Erstes Render mit leeren Arrays. Daten-Load aktualisiert die Anzeige nachträglich.
  safeBootStep("bindEvents", bindEvents);
  safeBootStep("renderAll (leer)", renderAll);

  // Daten-Schicht initialisieren (IndexedDB öffnen + Migration)
  await safeBootStepAsync("initDataLayer", initDataLayer);

  // Daten asynchron laden
  await safeBootStepAsync("loadDevices", async () => {
    devices = await loadDevicesAsync();
  });
  await safeBootStepAsync("loadWishlist", async () => {
    wishlist = await loadWishlistAsync();
  });

  // Erneut rendern mit echten Daten
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
