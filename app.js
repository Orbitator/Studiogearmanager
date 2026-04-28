// ============ STUDIO GEAR MANAGER - app.js ============

// --- Globale Variablen ---
let db = null;
let currentView = 'library';
let currentSort = 'name-asc';
let currentCategory = 'all';
let currentSearch = '';
let currentDeviceId = null;
let currentDetailTab = 'overview';
let pendingDocData = null;

// --- IndexedDB Initialisierung ---
const DB_NAME = 'StudioGearDB';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('gear')) {
                db.createObjectStore('gear', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('wishlist')) {
                db.createObjectStore('wishlist', { keyPath: 'id' });
            }
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        
        request.onerror = (event) => {
            console.error('DB-Fehler:', event.target.error);
            reject(event.target.error);
        };
    });
}

function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbPut(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbDelete(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- Lokalisierung ---
const translations = {
    de: {
        library: '📦 Bibliothek',
        wishlist: '⭐ Wunschliste',
        search: 'Volltextsuche...',
        allCategories: 'Alle Kategorien',
        addGear: '+ Neues Gerät',
        exportBackup: '📥 Backup exportieren',
        importBackup: '📤 Backup importieren',
        csvExport: '📊 CSV exportieren',
        noGear: 'Noch keine Geräte. Klicke auf "+ Neues Gerät" um zu starten.',
        noWishes: 'Noch keine Wünsche.',
        confirmDelete: 'Wirklich löschen?',
        takeToLibrary: 'In Bibliothek übernehmen',
    },
    en: {
        library: '📦 Library',
        wishlist: '⭐ Wishlist',
        search: 'Fulltext search...',
        allCategories: 'All Categories',
        addGear: '+ New Device',
        exportBackup: '📥 Export Backup',
        importBackup: '📤 Import Backup',
        csvExport: '📊 Export CSV',
        noGear: 'No devices yet. Click "+ New Device" to start.',
        noWishes: 'No wishes yet.',
        confirmDelete: 'Really delete?',
        takeToLibrary: 'Move to Library',
    }
};

let currentLang = localStorage.getItem('language') || 'de';

function t(key) {
    return translations[currentLang]?.[key] || translations['de'][key] || key;
}

// --- Einstellungen ---
function getSettings() {
    return {
        language: localStorage.getItem('language') || 'de',
        theme: localStorage.getItem('theme') || 'dark',
        accentColor: localStorage.getItem('accentColor') || '#3498db',
        showPhotos: localStorage.getItem('showPhotos') !== 'false',
        showValues: localStorage.getItem('showValues') !== 'false',
        catLabels: JSON.parse(localStorage.getItem('catLabels') || '["","","","",""]'),
        donationButtonDisabled: localStorage.getItem('donationButtonDisabled') === 'true',
        listColWidths: JSON.parse(localStorage.getItem('listColWidths') || '{}'),
    };
}

function applySettings() {
    const settings = getSettings();
    
    // Theme
    document.documentElement.setAttribute('data-theme', settings.theme);
    
    // Accent Color
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
    document.documentElement.style.setProperty('--accent-hover', adjustColor(settings.accentColor, -20));
    
    // Donate Button
    const donateBtn = document.getElementById('donate-button');
    if (donateBtn) {
        donateBtn.style.display = settings.donationButtonDisabled ? 'none' : 'flex';
    }
    
    // Kategorie-Labels
    settings.catLabels.forEach((label, i) => {
        if (label) {
            const option = document.querySelector(`#category-filter option[value="cat${i+1}"]`);
            if (option) option.textContent = label;
        }
    });
}

function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

// --- UI Rendering ---
async function renderLibrary() {
    const gear = await dbGetAll('gear');
    const settings = getSettings();
    const grid = document.getElementById('gear-grid');
    const listBody = document.getElementById('gear-table-body');
    const isGridView = !document.getElementById('gear-list').classList.contains('hidden');
    
    // Filter & Sort
    let filtered = gear;
    if (currentCategory !== 'all') {
        filtered = filtered.filter(g => g.category === currentCategory);
    }
    if (currentSearch) {
        const search = currentSearch.toLowerCase();
        filtered = filtered.filter(g => 
            (g.name || '').toLowerCase().includes(search) ||
            (g.manufacturer || '').toLowerCase().includes(search) ||
            (g.notes || '').toLowerCase().includes(search)
        );
    }
    
    filtered.sort((a, b) => {
        switch(currentSort) {
            case 'name-asc': return (a.name || '').localeCompare(b.name || '');
            case 'name-desc': return (b.name || '').localeCompare(a.name || '');
            case 'manufacturer-asc': return (a.manufacturer || '').localeCompare(b.manufacturer || '');
            case 'manufacturer-desc': return (b.manufacturer || '').localeCompare(a.manufacturer || '');
            case 'value-desc': return (b.value || 0) - (a.value || 0);
            case 'value-asc': return (a.value || 0) - (b.value || 0);
            case 'date-added-desc': return (b.dateAdded || 0) - (a.dateAdded || 0);
            default: return 0;
        }
    });
    
    // Grid-Ansicht
    grid.innerHTML = filtered.length === 0 ? 
        `<p style="grid-column:1/-1;text-align:center;padding:40px;">${t('noGear')}</p>` : '';
    
    filtered.forEach(device => {
        const card = document.createElement('div');
        card.className = 'gear-card';
        card.onclick = () => openDetail(device.id);
        card.innerHTML = `
            ${settings.showPhotos && device.photo ? `<img class="card-photo" src="${device.photo}" alt="${device.name}">` : ''}
            <div class="card-header">
                ${device.manufacturerLogo ? `<img class="manufacturer-logo" src="${device.manufacturerLogo}" alt="">` : ''}
                <span class="card-name">${device.name || 'Unbenannt'}</span>
            </div>
            <div class="card-manufacturer">${device.manufacturer || ''}</div>
            <div class="card-category">${device.category || 'Keine Kategorie'}</div>
            ${settings.showValues && device.value ? `<div class="card-value">€${device.value}</div>` : ''}
        `;
        grid.appendChild(card);
    });
    
    // Listenansicht
    listBody.innerHTML = '';
    filtered.forEach(device => {
        const row = document.createElement('tr');
        row.onclick = () => openDetail(device.id);
        row.innerHTML = `
            <td>${device.photo ? `<img class="list-photo" src="${device.photo}" alt="">` : ''}</td>
            <td>${device.name || ''}</td>
            <td>${device.manufacturer || ''}</td>
            <td>${device.category || ''}</td>
            <td>${device.value ? '€' + device.value : ''}</td>
            <td>${device.powerConnector || ''}</td>
            <td>
                <button class="btn-secondary" style="padding:4px 8px;font-size:0.8em;" onclick="event.stopPropagation(); deleteDevice('${device.id}')">🗑️</button>
            </td>
        `;
        listBody.appendChild(row);
    });
    
    // Spaltenbreiten aus localStorage anwenden
    applyListColumnWidths();
}

function applyListColumnWidths() {
    const settings = getSettings();
    const widths = settings.listColWidths;
    if (Object.keys(widths).length === 0) return;
    
    document.querySelectorAll('.gear-table th').forEach(th => {
        const col = th.dataset.col;
        if (widths[col]) {
            document.documentElement.style.setProperty(`--col-${col}`, widths[col] + 'px');
        }
    });
}

async function renderWishlist() {
    const wishes = await dbGetAll('wishlist');
    const grid = document.getElementById('wishlist-grid');
    
    grid.innerHTML = wishes.length === 0 ? 
        `<p style="grid-column:1/-1;text-align:center;padding:40px;">${t('noWishes')}</p>` : '';
    
    wishes.forEach(wish => {
        const card = document.createElement('div');
        card.className = 'gear-card wish-item';
        card.innerHTML = `
            <div class="card-name">${wish.name || 'Unbenannt'}</div>
            <div class="card-manufacturer">${wish.manufacturer || ''}</div>
            ${wish.price ? `<div class="wish-price">€${wish.price}</div>` : ''}
            ${wish.link ? `<a href="${wish.link}" target="_blank" rel="noopener" style="font-size:0.8em;color:var(--accent-color);">Link</a>` : ''}
            <button class="btn-take" onclick="event.stopPropagation(); takeToLibrary('${wish.id}')">${t('takeToLibrary')}</button>
        `;
        grid.appendChild(card);
    });
}

// --- Detail-Dialog ---
async function openDetail(deviceId) {
    const gear = await dbGetAll('gear');
    const device = gear.find(g => g.id === deviceId);
    if (!device) return;
    
    currentDeviceId = deviceId;
    document.getElementById('detail-dialog').style.display = 'flex';
    renderDetailTab(device);
}

function closeDetail() {
    document.getElementById('detail-dialog').style.display = 'none';
    currentDeviceId = null;
}

function renderDetailTab(device) {
    const area = document.getElementById('detail-content-area');
    const tab = currentDetailTab;
    
    switch(tab) {
        case 'overview':
            area.innerHTML = `
                ${device.photo ? `<img class="detail-photo" src="${device.photo}" alt="" onclick="document.getElementById('photo-modal').style.display='flex'; document.getElementById('photo-modal-img').src='${device.photo}';">` : ''}
                <div class="detail-field"><label>Name</label><span>${device.name || ''}</span></div>
                <div class="detail-field"><label>Hersteller</label><span>${device.manufacturer || ''}</span></div>
                ${device.manufacturerLogo ? `<div class="detail-field"><label>Logo</label><img src="${device.manufacturerLogo}" style="width:50px;"></div>` : ''}
                <div class="detail-field"><label>Kategorie</label><span>${device.category || ''}</span></div>
                <div class="detail-field"><label>Modell</label><span>${device.model || ''}</span></div>
                <div class="detail-field"><label>Seriennummer</label><span>${device.serialNumber || ''}</span></div>
                <div class="detail-field"><label>Kaufdatum</label><span>${device.purchaseDate || ''}</span></div>
            `;
            break;
        case 'audio':
            area.innerHTML = `
                <div class="detail-field"><label>Anschlusstyp</label><span>${device.audioConnector || ''}</span></div>
                <div class="detail-field"><label>Impedanz</label><span>${device.impedance || ''}</span></div>
                <div class="detail-field"><label>Max. Pegel</label><span>${device.maxLevel || ''}</span></div>
                <div class="detail-field"><label>Frequenzbereich</label><span>${device.frequencyRange || ''}</span></div>
            `;
            break;
        case 'midi':
            area.innerHTML = `
                <div class="detail-field"><label>MIDI Typ</label><span>${device.midiType || ''}</span></div>
                <div class="detail-field"><label>MIDI Channel</label><span>${device.midiChannel || ''}</span></div>
                <div class="detail-field"><label>MIDI Anschluss</label><span>${device.midiConnector || ''}</span></div>
            `;
            break;
        case 'power':
            area.innerHTML = `
                <div class="detail-field"><label>Stromanschluss</label><span>${device.powerConnector || ''}</span></div>
                <div class="detail-field"><label>Spannung</label><span>${device.voltage || ''}</span></div>
                <div class="detail-field"><label>Leistungsaufnahme</label><span>${device.powerConsumption || ''}</span></div>
            `;
            break;
        case 'value':
            area.innerHTML = `
                <div class="detail-field"><label>Geschätzter Wert</label><span>${device.value ? '€' + device.value : ''}</span></div>
                <div class="detail-field"><label>Kaufpreis</label><span>${device.purchasePrice ? '€' + device.purchasePrice : ''}</span></div>
                <div class="detail-field"><label>Wertentwicklung</label><span>${device.valueTrend || ''}</span></div>
            `;
            break;
        case 'documents':
            area.innerHTML = `
                <div style="margin-bottom:10px;">
                    <button class="btn-primary" onclick="openDocDialog()">+ Dokument hinzufügen</button>
                </div>
                <div id="documents-list">
                    ${(device.documents || []).map((doc, i) => `
                        <div class="detail-field" style="display:flex;justify-content:space-between;align-items:center;">
                            <a href="${doc.file || ''}" target="_blank" rel="noopener" style="color:var(--accent-color);">${doc.name || 'Dokument ' + (i+1)}</a>
                            <button class="btn-secondary" style="padding:2px 8px;font-size:0.8em;" onclick="event.stopPropagation(); deleteDocument('${device.id}', ${i})">🗑️</button>
                        </div>
                    `).join('')}
                    ${(device.documents || []).length === 0 ? '<p style="color:var(--text-secondary);">Keine Dokumente</p>' : ''}
                </div>
            `;
            break;
        case 'notes':
            area.innerHTML = `
                <div class="detail-field">
                    <label>Notizen</label>
                    <textarea id="notes-textarea" style="width:100%;min-height:150px;background:var(--bg-color);color:var(--text-color);border:1px solid var(--border-color);padding:10px;border-radius:4px;">${device.notes || ''}</textarea>
                </div>
                <button class="btn-primary" onclick="saveNotes()">Notizen speichern</button>
            `;
            break;
    }
}

async function saveNotes() {
    const notes = document.getElementById('notes-textarea').value;
    const gear = await dbGetAll('gear');
    const device = gear.find(g => g.id === currentDeviceId);
    if (device) {
        device.notes = notes;
        await dbPut('gear', device);
        alert('Notizen gespeichert!');
    }
}

// --- Dokumente ---
function openDocDialog() {
    document.getElementById('doc-dialog').style.display = 'flex';
    document.getElementById('doc-name-input').value = '';
    document.getElementById('doc-file-input').value = '';
    document.getElementById('doc-url-input').value = '';
    document.getElementById('doc-type-select').value = 'file';
    toggleDocType();
}

function closeDocDialog() {
    document.getElementById('doc-dialog').style.display = 'none';
}

function toggleDocType() {
    const type = document.getElementById('doc-type-select').value;
    document.getElementById('doc-file-upload-area').style.display = type === 'file' ? 'block' : 'none';
    document.getElementById('doc-url-input-area').style.display = type === 'url' ? 'block' : 'none';
}

async function addDocumentToDevice() {
    const name = document.getElementById('doc-name-input').value.trim() || 'Dokument';
    const type = document.getElementById('doc-type-select').value;
    
    if (type === 'file') {
        const fileInput = document.getElementById('doc-file-input');
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Bitte eine Datei auswählen.');
            return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            await saveDocumentToDevice({ name, file: e.target.result, type: 'file' });
        };
        reader.readAsDataURL(file);
    } else {
        const url = document.getElementById('doc-url-input').value.trim();
        if (!url) {
            alert('Bitte eine URL eingeben.');
            return;
        }
        await saveDocumentToDevice({ name, file: url, type: 'link' });
    }
}

async function saveDocumentToDevice(docData) {
    const gear = await dbGetAll('gear');
    const device = gear.find(g => g.id === currentDeviceId);
    if (!device) return;
    
    if (!device.documents) device.documents = [];
    device.documents.push(docData);
    await dbPut('gear', device);
    closeDocDialog();
    renderDetailTab(device);
}

async function deleteDocument(deviceId, docIndex) {
    if (!confirm('Dokument wirklich löschen?')) return;
    const gear = await dbGetAll('gear');
    const device = gear.find(g => g.id === deviceId);
    if (device && device.documents) {
        device.documents.splice(docIndex, 1);
        await dbPut('gear', device);
        renderDetailTab(device);
    }
}

// --- Gerät löschen ---
async function deleteDevice(deviceId) {
    if (!confirm(t('confirmDelete'))) return;
    await dbDelete('gear', deviceId);
    renderLibrary();
}

// --- Wishlist in Bibliothek übernehmen ---
async function takeToLibrary(wishId) {
    const wishes = await dbGetAll('wishlist');
    const wish = wishes.find(w => w.id === wishId);
    if (!wish) return;
    
    const newDevice = {
        id: 'gear_' + Date.now(),
        name: wish.name,
        manufacturer: wish.manufacturer,
        value: wish.price,
        dateAdded: Date.now(),
    };
    
    await dbPut('gear', newDevice);
    await dbDelete('wishlist', wishId);
    renderLibrary();
    renderWishlist();
}

// --- Backup / CSV ---
async function exportBackup() {
    const gear = await dbGetAll('gear');
    const wishes = await dbGetAll('wishlist');
    const backup = { gear, wishes, exportDate: new Date().toISOString(), version: 1 };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `studio-gear-backup-${new Date().toISOString().slice(0,10)}.json`);
}

async function importBackup(file) {
    try {
        const text = await file.text();
        const backup = JSON.parse(text);
        if (!backup.gear || !backup.wishes) throw new Error('Ungültiges Backup');
        
        if (!confirm(`Backup mit ${backup.gear.length} Geräten und ${backup.wishes.length} Wünschen importieren? Aktuelle Daten werden überschrieben!`)) return;
        
        // Clear stores
        const tx = db.transaction(['gear', 'wishlist'], 'readwrite');
        await tx.objectStore('gear').clear();
        await tx.objectStore('wishlist').clear();
        await tx.done;
        
        // Import
        for (const item of backup.gear) await dbPut('gear', item);
        for (const item of backup.wishes) await dbPut('wishlist', item);
        
        alert('Import erfolgreich!');
        renderLibrary();
        renderWishlist();
    } catch (e) {
        alert('Fehler beim Import: ' + e.message);
    }
}

async function exportCSV() {
    const gear = await dbGetAll('gear');
    const headers = ['Name', 'Hersteller', 'Kategorie', 'Modell', 'Wert', 'Kaufdatum'];
    const rows = gear.map(g => [
        g.name || '', g.manufacturer || '', g.category || '', g.model || '', g.value || '', g.purchaseDate || ''
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${(cell+'').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `studio-gear-inventory-${new Date().toISOString().slice(0,10)}.csv`);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Setup / Einstellungen ---
function openSetup() {
    const settings = getSettings();
    document.getElementById('language-select').value = settings.language;
    document.getElementById('theme-select').value = settings.theme;
    document.getElementById('accent-color-input').value = settings.accentColor;
    document.getElementById('show-photos-check').checked = settings.showPhotos;
    document.getElementById('show-values-check').checked = settings.showValues;
    document.getElementById('show-donation-btn').checked = !settings.donationButtonDisabled;
    
    const catLabels = settings.catLabels;
    for (let i = 0; i < 5; i++) {
        const input = document.getElementById(`label-cat${i+1}`);
        if (input) input.value = catLabels[i] || '';
    }
    
    document.getElementById('setup-dialog').style.display = 'flex';
}

function closeSetup() {
    document.getElementById('setup-dialog').style.display = 'none';
}

async function saveSettings() {
    const newLang = document.getElementById('language-select').value;
    localStorage.setItem('language', newLang);
    localStorage.setItem('theme', document.getElementById('theme-select').value);
    localStorage.setItem('accentColor', document.getElementById('accent-color-input').value);
    localStorage.setItem('showPhotos', document.getElementById('show-photos-check').checked);
    localStorage.setItem('showValues', document.getElementById('show-values-check').checked);
    
    const catLabels = [];
    for (let i = 0; i < 5; i++) {
        const input = document.getElementById(`label-cat${i+1}`);
        catLabels.push(input?.value || '');
    }
    localStorage.setItem('catLabels', JSON.stringify(catLabels));
    
    applySettings();
    if (newLang !== currentLang) {
        currentLang = newLang;
        renderLibrary();
        renderWishlist();
    }
    closeSetup();
}

// Spendenbutton-Deaktivierung mit Nachfrage
function setupDonationToggle() {
    const checkbox = document.getElementById('show-donation-btn');
    if (!checkbox) return;
    
    checkbox.addEventListener('change', function(e) {
        if (!e.target.checked) {
            const userConfirmed = confirm('Du hast bereits gespendet?');
            if (userConfirmed) {
                localStorage.setItem('donationButtonDisabled', 'true');
                const donateBtn = document.getElementById('donate-button');
                if (donateBtn) donateBtn.style.display = 'none';
            } else {
                e.target.checked = true;
            }
        } else {
            localStorage.removeItem('donationButtonDisabled');
            const donateBtn = document.getElementById('donate-button');
            if (donateBtn) donateBtn.style.display = 'flex';
        }
    });
}

// --- Demo-Daten ---
async function loadDemoData() {
    if (!confirm('Demo-Daten laden? Vorhandene Daten werden überschrieben!')) return;
    
    const transaction = db.transaction(['gear', 'wishlist'], 'readwrite');
    await transaction.objectStore('gear').clear();
    await transaction.objectStore('wishlist').clear();
    await transaction.done;
    
    const demoGear = [
        { id: 'demo1', name: 'SM7B', manufacturer: 'Shure', category: 'cat1', value: 399, photo: '', powerConnector: 'XLR', documents: [{ name: 'Manual', file: 'https://www.shure.com/en-US/products/microphones/sm7b', type: 'link' }] },
        { id: 'demo2', name: 'Apollo Twin X', manufacturer: 'Universal Audio', category: 'cat2', value: 899, powerConnector: '12V DC' },
        { id: 'demo3', name: 'HS8', manufacturer: 'Yamaha', category: 'cat3', value: 250, powerConnector: 'IEC' },
    ];
    
    const demoWishes = [
        { id: 'wish1', name: 'U87', manufacturer: 'Neumann', price: 3200, link: 'https://www.neumann.com' },
    ];
    
    for (const item of demoGear) await dbPut('gear', item);
    for (const item of demoWishes) await dbPut('wishlist', item);
    
    alert('Demo-Daten geladen!');
    closeSetup();
    renderLibrary();
    renderWishlist();
}

// --- Alle Daten löschen ---
async function resetAllData() {
    if (!confirm('ALLE Daten löschen? Das kann nicht rückgängig gemacht werden!')) return;
    const transaction = db.transaction(['gear', 'wishlist'], 'readwrite');
    await transaction.objectStore('gear').clear();
    await transaction.objectStore('wishlist').clear();
    await transaction.done;
    localStorage.clear();
    alert('Alle Daten gelöscht!');
    location.reload();
}

// --- Event Listener ---
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            document.getElementById('library-view').classList.toggle('active', currentView === 'library');
            document.getElementById('wishlist-view').classList.toggle('active', currentView === 'wishlist');
            if (currentView === 'library') renderLibrary();
            else renderWishlist();
        });
    });
    
    // Grid/List Toggle
    document.getElementById('view-grid-btn').addEventListener('click', () => {
        document.getElementById('gear-grid').style.display = 'grid';
        document.getElementById('gear-list').classList.add('hidden');
        document.getElementById('view-grid-btn').classList.add('active');
        document.getElementById('view-list-btn').classList.remove('active');
        renderLibrary();
    });
    
    document.getElementById('view-list-btn').addEventListener('click', () => {
        document.getElementById('gear-grid').style.display = 'none';
        document.getElementById('gear-list').classList.remove('hidden');
        document.getElementById('view-grid-btn').classList.remove('active');
        document.getElementById('view-list-btn').classList.add('active');
        renderLibrary();
        initListColumnResize();
    });
    
    // Search
    document.getElementById('search-toggle-btn').addEventListener('click', () => {
        document.getElementById('search-container').classList.toggle('hidden');
        document.getElementById('search-input').focus();
    });
    
    document.getElementById('search-close-btn').addEventListener('click', () => {
        document.getElementById('search-container').classList.add('hidden');
        document.getElementById('search-input').value = '';
        currentSearch = '';
        renderLibrary();
    });
    
    document.getElementById('search-input').addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderLibrary();
    });
    
    // Sort & Filter
    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderLibrary();
    });
    
    document.getElementById('category-filter').addEventListener('change', (e) => {
        currentCategory = e.target.value;
        renderLibrary();
    });
    
    // Buttons
    document.getElementById('add-gear-btn').addEventListener('click', () => {
        alert('Gerät hinzufügen: Bitte über den + Button im Detail-Dialog der Wunschliste oder direkt ein JSON-Backup erstellen und manuell bearbeiten. In einer zukünftigen Version wird es einen vollständigen Geräte-Editor geben.');
    });
    
    document.getElementById('export-btn').addEventListener('click', exportBackup);
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
    document.getElementById('import-file-input').addEventListener('change', (e) => {
        if (e.target.files[0]) importBackup(e.target.files[0]);
    });
    document.getElementById('csv-export-btn').addEventListener('click', exportCSV);
    
    // Setup
    document.getElementById('setup-btn').addEventListener('click', openSetup);
    document.getElementById('close-setup-btn').addEventListener('click', saveSettings);
    document.getElementById('load-demo-btn').addEventListener('click', loadDemoData);
    document.getElementById('reset-btn').addEventListener('click', resetAllData);
    document.getElementById('export-logs-btn').addEventListener('click', () => {
        const logs = JSON.parse(localStorage.getItem('logs') || '[]');
        const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
        downloadBlob(blob, 'studio-gear-logs.txt');
    });
    
    setupDonationToggle();
    
    // Detail Dialog
    document.getElementById('close-detail-btn').addEventListener('click', closeDetail);
    document.getElementById('detail-dialog').addEventListener('click', (e) => {
        if (e.target === document.getElementById('detail-dialog')) closeDetail();
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDetailTab = btn.dataset.tab;
            const gear = await dbGetAll('gear');
            const device = gear.find(g => g.id === currentDeviceId);
            if (device) renderDetailTab(device);
        });
    });
    
    // Foto-Modal
    document.getElementById('photo-modal-close').addEventListener('click', () => {
        document.getElementById('photo-modal').style.display = 'none';
    });
    document.getElementById('photo-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('photo-modal')) {
            document.getElementById('photo-modal').style.display = 'none';
        }
    });
    
    // Dokument Dialog
    document.getElementById('add-doc-confirm-btn').addEventListener('click', addDocumentToDevice);
    document.getElementById('close-doc-btn').addEventListener('click', closeDocDialog);
    document.getElementById('doc-type-select').addEventListener('change', toggleDocType);
    document.getElementById('doc-dialog').addEventListener('click', (e) => {
        if (e.target === document.getElementById('doc-dialog')) closeDocDialog();
    });
    
    // Wish Dialog
    document.getElementById('add-wish-btn').addEventListener('click', () => {
        document.getElementById('wish-dialog').style.display = 'flex';
    });
    document.getElementById('close-wish-btn').addEventListener('click', () => {
        document.getElementById('wish-dialog').style.display = 'none';
    });
    document.getElementById('add-wish-confirm-btn').addEventListener('click', async () => {
        const name = document.getElementById('wish-name-input').value.trim();
        if (!name) { alert('Name erforderlich'); return; }
        const wish = {
            id: 'wish_' + Date.now(),
            name,
            manufacturer: document.getElementById('wish-manufacturer-input').value.trim(),
            price: parseFloat(document.getElementById('wish-price-input').value) || 0,
            link: document.getElementById('wish-link-input').value.trim(),
        };
        await dbPut('wishlist', wish);
        document.getElementById('wish-dialog').style.display = 'none';
        renderWishlist();
    });
    document.getElementById('wish-dialog').addEventListener('click', (e) => {
        if (e.target === document.getElementById('wish-dialog')) {
            document.getElementById('wish-dialog').style.display = 'none';
        }
    });
    
    // Setup Dialog
    document.getElementById('setup-dialog').addEventListener('click', (e) => {
        if (e.target === document.getElementById('setup-dialog')) closeSetup();
    });
    
    // Spendenbutton Click
    document.getElementById('donate-button').addEventListener('click', () => {
        window.open('https://paypal.me/yourpaypal', '_blank');
    });
}

// --- Spalten-Resize für Listenansicht ---
function initListColumnResize() {
    const headers = document.querySelectorAll('.gear-table th');
    headers.forEach(th => {
        // Handle nur einmal hinzufügen
        if (th.querySelector('.resize-handle')) return;
        
        const col = th.dataset.col;
        if (!col) return;
        
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        th.appendChild(handle);
        
        let startX, startWidth;
        
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startWidth = th.offsetWidth;
            handle.classList.add('dragging');
            
            const onMouseMove = (moveEvent) => {
                const newWidth = Math.max(40, startWidth + moveEvent.clientX - startX);
                document.documentElement.style.setProperty(`--col-${col}`, newWidth + 'px');
            };
            
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                handle.classList.remove('dragging');
                
                // Speichern
                const newWidth = parseInt(document.documentElement.style.getPropertyValue(`--col-${col}`));
                if (newWidth) {
                    const settings = getSettings();
                    const widths = settings.listColWidths;
                    widths[col] = newWidth;
                    localStorage.setItem('listColWidths', JSON.stringify(widths));
                }
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// --- Initialisierung ---
async function init() {
    try {
        await openDB();
        applySettings();
        setupEventListeners();
        
        // Kategorie-Filter dynamisch füllen
        const catLabels = getSettings().catLabels;
        const catFilter = document.getElementById('category-filter');
        for (let i = 0; i < 5; i++) {
            const label = catLabels[i] || `Kategorie ${i+1}`;
            const option = document.createElement('option');
            option.value = `cat${i+1}`;
            option.textContent = label;
            catFilter.appendChild(option);
        }
        
        await renderLibrary();
        await renderWishlist();
        
        console.log('Studio Gear Manager erfolgreich initialisiert.');
    } catch (error) {
        console.error('Fehler bei der Initialisierung:', error);
    }
}

init();
