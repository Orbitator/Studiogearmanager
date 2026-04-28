// ============ Studio Gear Manager ============

let db;
let currentView = 'library';
let currentSort = 'name-asc';
let currentCategory = 'all';
let currentSearch = '';
let currentDeviceId = null;
let currentDetailTab = 'overview';

// --- IndexedDB ---
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('StudioGearDB', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('gear')) db.createObjectStore('gear', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('wishlist')) db.createObjectStore('wishlist', { keyPath: 'id' });
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(); };
        request.onerror = (e) => reject(e.target.error);
    });
}

function dbGet(store, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function dbGetAll(store) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function dbPut(store, item) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

function dbDelete(store, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

function dbClear(store) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// --- Settings ---
function getSettings() {
    return {
        language: localStorage.getItem('language') || 'de',
        theme: localStorage.getItem('theme') || 'dark',
        accent: localStorage.getItem('accent') || '#3498db',
        showPhotos: localStorage.getItem('showPhotos') !== 'false',
        showValues: localStorage.getItem('showValues') !== 'false',
        donationDisabled: localStorage.getItem('donationDisabled') === 'true',
        catLabels: JSON.parse(localStorage.getItem('catLabels') || '["","","","",""]'),
        colWidths: JSON.parse(localStorage.getItem('colWidths') || '{}'),
    };
}

function applySettings() {
    const s = getSettings();
    document.documentElement.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--accent', s.accent);
    
    const btn = document.getElementById('donate-button');
    if (btn) btn.style.display = s.donationDisabled ? 'none' : '';
}

// --- Render ---
async function renderLibrary() {
    const gear = await dbGetAll('gear');
    const s = getSettings();
    
    // Filter
    let items = gear;
    if (currentCategory !== 'all') items = items.filter(g => g.category === currentCategory);
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        items = items.filter(g => 
            (g.name||'').toLowerCase().includes(q) ||
            (g.manufacturer||'').toLowerCase().includes(q)
        );
    }
    
    // Sort
    items.sort((a,b) => {
        switch(currentSort) {
            case 'name-asc': return (a.name||'').localeCompare(b.name||'');
            case 'name-desc': return (b.name||'').localeCompare(a.name||'');
            case 'manufacturer-asc': return (a.manufacturer||'').localeCompare(b.manufacturer||'');
            case 'manufacturer-desc': return (b.manufacturer||'').localeCompare(a.manufacturer||'');
            case 'value-desc': return (b.value||0) - (a.value||0);
            case 'value-asc': return (a.value||0) - (b.value||0);
            case 'date-desc': return (b.dateAdded||0) - (a.dateAdded||0);
            default: return 0;
        }
    });
    
    // Grid
    const grid = document.getElementById('gear-grid');
    grid.innerHTML = items.length ? '' : '<p style="grid-column:1/-1;text-align:center;padding:40px;">Keine Geräte</p>';
    
    items.forEach(g => {
        const card = document.createElement('div');
        card.className = 'gear-card';
        card.onclick = () => openDetail(g.id);
        card.innerHTML = `
            ${s.showPhotos && g.photo ? `<img class="card-photo" src="${g.photo}" alt="">` : ''}
            <div class="card-header">
                ${g.manufacturerLogo ? `<img class="card-logo" src="${g.manufacturerLogo}" alt="">` : ''}
                <span class="card-name">${g.name||'Unbenannt'}</span>
            </div>
            <div class="card-manufacturer">${g.manufacturer||''}</div>
            <div class="card-category">${g.category||''}</div>
            ${s.showValues && g.value ? `<div class="card-value">€${g.value}</div>` : ''}
        `;
        grid.appendChild(card);
    });
    
    // Table
    const tbody = document.getElementById('gear-table-body');
    tbody.innerHTML = '';
    items.forEach(g => {
        const tr = document.createElement('tr');
        tr.onclick = () => openDetail(g.id);
        tr.innerHTML = `
            <td>${g.photo ? `<img class="table-photo" src="${g.photo}" alt="">` : ''}</td>
            <td>${g.name||''}</td>
            <td>${g.manufacturer||''}</td>
            <td>${g.category||''}</td>
            <td>${g.value ? '€'+g.value : ''}</td>
            <td>${g.powerConnector||''}</td>
            <td><button class="btn-secondary" style="padding:2px 8px;font-size:0.8em;" onclick="event.stopPropagation(); deleteGear('${g.id}')">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    applyColumnWidths();
}

function applyColumnWidths() {
    const widths = getSettings().colWidths;
    Object.entries(widths).forEach(([col, w]) => {
        document.documentElement.style.setProperty(`--col-${col}`, w + 'px');
    });
}

async function renderWishlist() {
    const wishes = await dbGetAll('wishlist');
    const grid = document.getElementById('wishlist-grid');
    grid.innerHTML = wishes.length ? '' : '<p style="grid-column:1/-1;text-align:center;padding:40px;">Keine Wünsche</p>';
    
    wishes.forEach(w => {
        const card = document.createElement('div');
        card.className = 'gear-card wish-item';
        card.innerHTML = `
            <div class="card-name">${w.name||'Unbenannt'}</div>
            <div class="card-manufacturer">${w.manufacturer||''}</div>
            ${w.price ? `<div class="wish-price">€${w.price}</div>` : ''}
            ${w.link ? `<a href="${w.link}" target="_blank" style="font-size:0.8em;color:var(--accent);">Link</a>` : ''}
            <button class="btn-take" onclick="event.stopPropagation(); takeToLibrary('${w.id}')">In Bibliothek</button>
        `;
        grid.appendChild(card);
    });
}

// --- Detail ---
async function openDetail(id) {
    currentDeviceId = id;
    const device = await dbGet('gear', id);
    if (!device) return;
    document.getElementById('detail-modal').style.display = 'flex';
    renderDetailTab(device);
}

function closeDetail() {
    document.getElementById('detail-modal').style.display = 'none';
    currentDeviceId = null;
}

async function renderDetailTab(device) {
    const area = document.getElementById('detail-content');
    switch(currentDetailTab) {
        case 'overview':
            area.innerHTML = `
                ${device.photo ? `<img class="detail-photo" src="${device.photo}" onclick="showPhoto('${device.photo}')">` : ''}
                <div class="detail-field"><label>Name</label>${device.name||''}</div>
                <div class="detail-field"><label>Hersteller</label>${device.manufacturer||''}</div>
                <div class="detail-field"><label>Kategorie</label>${device.category||''}</div>
                <div class="detail-field"><label>Modell</label>${device.model||''}</div>
                <div class="detail-field"><label>Seriennummer</label>${device.serialNumber||''}</div>
                <div class="detail-field"><label>Kaufdatum</label>${device.purchaseDate||''}</div>
            `;
            break;
        case 'documents':
            area.innerHTML = `
                <button class="btn-primary" onclick="openDocDialog()" style="margin-bottom:10px;">+ Dokument hinzufügen</button>
                <div id="doc-list">
                    ${(device.documents||[]).map((d,i) => `
                        <div class="detail-field" style="display:flex;justify-content:space-between;align-items:center;">
                            <a href="${d.file}" target="_blank" rel="noopener" style="color:var(--accent);">${d.name||'Dokument'}</a>
                            <button class="btn-secondary" style="padding:2px 8px;" onclick="event.stopPropagation(); deleteDoc('${device.id}',${i})">🗑️</button>
                        </div>
                    `).join('') || '<p>Keine Dokumente</p>'}
                </div>
            `;
            break;
        case 'notes':
            area.innerHTML = `
                <textarea id="notes-area" style="width:100%;min-height:150px;background:var(--bg);color:var(--text);border:1px solid var(--border);padding:10px;border-radius:4px;">${device.notes||''}</textarea>
                <button class="btn-primary" onclick="saveNotes()" style="margin-top:10px;">Notizen speichern</button>
            `;
            break;
        default:
            area.innerHTML = `<p>Keine Daten</p>`;
    }
}

async function saveNotes() {
    const notes = document.getElementById('notes-area').value;
    const device = await dbGet('gear', currentDeviceId);
    if (device) {
        device.notes = notes;
        await dbPut('gear', device);
        alert('Gespeichert!');
    }
}

function showPhoto(src) {
    document.getElementById('photo-modal').style.display = 'flex';
    document.getElementById('photo-img').src = src;
}

// --- Dokumente ---
function openDocDialog() {
    document.getElementById('doc-modal').style.display = 'flex';
    document.getElementById('doc-name').value = '';
    document.getElementById('doc-file').value = '';
    document.getElementById('doc-url').value = '';
    document.getElementById('doc-type').value = 'file';
    toggleDocType();
}

function closeDocDialog() {
    document.getElementById('doc-modal').style.display = 'none';
}

function toggleDocType() {
    const type = document.getElementById('doc-type').value;
    document.getElementById('doc-file-area').style.display = type === 'file' ? 'block' : 'none';
    document.getElementById('doc-url-area').style.display = type === 'url' ? 'block' : 'none';
}

async function addDocument() {
    const name = document.getElementById('doc-name').value.trim() || 'Dokument';
    const type = document.getElementById('doc-type').value;
    
    const device = await dbGet('gear', currentDeviceId);
    if (!device) return;
    if (!device.documents) device.documents = [];
    
    if (type === 'url') {
        const url = document.getElementById('doc-url').value.trim();
        if (!url) { alert('URL eingeben!'); return; }
        device.documents.push({ name, file: url, type: 'link' });
        await dbPut('gear', device);
        closeDocDialog();
        renderDetailTab(device);
    } else {
        const fileInput = document.getElementById('doc-file');
        if (!fileInput.files.length) { alert('Datei auswählen!'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            device.documents.push({ name, file: e.target.result, type: 'file' });
            await dbPut('gear', device);
            closeDocDialog();
            renderDetailTab(device);
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

async function deleteDoc(deviceId, index) {
    if (!confirm('Dokument löschen?')) return;
    const device = await dbGet('gear', deviceId);
    if (device?.documents) {
        device.documents.splice(index, 1);
        await dbPut('gear', device);
        renderDetailTab(device);
    }
}

// --- Gerät löschen ---
async function deleteGear(id) {
    if (!confirm('Gerät löschen?')) return;
    await dbDelete('gear', id);
    renderLibrary();
}

// --- Wishlist -> Bibliothek ---
async function takeToLibrary(wishId) {
    const wish = await dbGet('wishlist', wishId);
    if (!wish) return;
    await dbPut('gear', {
        id: 'gear_' + Date.now(),
        name: wish.name,
        manufacturer: wish.manufacturer,
        value: wish.price,
        dateAdded: Date.now()
    });
    await dbDelete('wishlist', wishId);
    renderLibrary();
    renderWishlist();
}

// --- Backup ---
async function exportBackup() {
    const gear = await dbGetAll('gear');
    const wishes = await dbGetAll('wishlist');
    const backup = { gear, wishes, date: new Date().toISOString(), version: 1 };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'studio-gear-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

async function importBackup(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Flexiblere Validierung
        if (!data || typeof data !== 'object') throw new Error('Ungültiges Format');
        if (!data.gear && !data.wishes) throw new Error('Keine gear/wishes gefunden');
        
        const gear = Array.isArray(data.gear) ? data.gear : [];
        const wishes = Array.isArray(data.wishes) ? data.wishes : [];
        
        if (!confirm(`${gear.length} Geräte und ${wishes.length} Wünsche importieren?`)) return;
        
        await dbClear('gear');
        await dbClear('wishlist');
        
        for (const item of gear) await dbPut('gear', item);
        for (const item of wishes) await dbPut('wishlist', item);
        
        alert('Import erfolgreich!');
        renderLibrary();
        renderWishlist();
    } catch (e) {
        alert('Fehler beim Import: ' + e.message);
    }
}

// --- CSV ---
async function exportCSV() {
    const gear = await dbGetAll('gear');
    const rows = gear.map(g => [g.name,g.manufacturer,g.category,g.model,g.value,g.purchaseDate]);
    let csv = 'Name,Hersteller,Kategorie,Modell,Wert,Kaufdatum\n';
    rows.forEach(r => csv += r.map(c => `"${(c||'').toString().replace(/"/g,'""')}"`).join(',') + '\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventory.csv';
    a.click();
    URL.revokeObjectURL(a.href);
}

// --- Setup ---
function openSetup() {
    const s = getSettings();
    document.getElementById('setting-language').value = s.language;
    document.getElementById('setting-theme').value = s.theme;
    document.getElementById('setting-accent').value = s.accent;
    document.getElementById('setting-photos').checked = s.showPhotos;
    document.getElementById('setting-values').checked = s.showValues;
    document.getElementById('setting-donation').checked = !s.donationDisabled;
    
    const labels = s.catLabels;
    for (let i = 0; i < 5; i++) {
        const el = document.getElementById('setting-cat' + (i+1));
        if (el) el.value = labels[i] || '';
    }
    
    document.getElementById('setup-modal').style.display = 'flex';
}

function closeSetup() {
    document.getElementById('setup-modal').style.display = 'none';
}

function saveSettings() {
    localStorage.setItem('language', document.getElementById('setting-language').value);
    localStorage.setItem('theme', document.getElementById('setting-theme').value);
    localStorage.setItem('accent', document.getElementById('setting-accent').value);
    localStorage.setItem('showPhotos', document.getElementById('setting-photos').checked);
    localStorage.setItem('showValues', document.getElementById('setting-values').checked);
    
    const labels = [];
    for (let i = 0; i < 5; i++) {
        const el = document.getElementById('setting-cat' + (i+1));
        labels.push(el?.value || '');
    }
    localStorage.setItem('catLabels', JSON.stringify(labels));
    
    applySettings();
    renderLibrary();
    closeSetup();
}

function setupDonationToggle() {
    const cb = document.getElementById('setting-donation');
    if (!cb) return;
    cb.addEventListener('change', function(e) {
        if (!e.target.checked) {
            if (confirm('Hast du bereits gespendet?')) {
                localStorage.setItem('donationDisabled', 'true');
                document.getElementById('donate-button').style.display = 'none';
            } else {
                e.target.checked = true;
            }
        } else {
            localStorage.removeItem('donationDisabled');
            document.getElementById('donate-button').style.display = '';
        }
    });
}

// --- Column Resize ---
function initColumnResize() {
    document.querySelectorAll('.gear-table th').forEach(th => {
        if (th.querySelector('.resize-handle')) return;
        const col = th.dataset.col;
        if (!col) return;
        
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        th.appendChild(handle);
        
        let startX, startW;
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startW = th.offsetWidth;
            handle.classList.add('dragging');
            
            const move = (ev) => {
                const w = Math.max(40, startW + ev.clientX - startX);
                document.documentElement.style.setProperty(`--col-${col}`, w + 'px');
            };
            const up = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
                handle.classList.remove('dragging');
                const w = parseInt(document.documentElement.style.getPropertyValue(`--col-${col}`));
                if (w) {
                    const widths = getSettings().colWidths;
                    widths[col] = w;
                    localStorage.setItem('colWidths', JSON.stringify(widths));
                }
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });
    });
}

// --- Init ---
async function init() {
    try {
        await openDB();
        applySettings();
        
        // Event Listeners
        document.getElementById('search-toggle').onclick = () => document.getElementById('search-bar').classList.toggle('hidden');
        document.getElementById('search-close').onclick = () => {
            document.getElementById('search-bar').classList.add('hidden');
            document.getElementById('search-input').value = '';
            currentSearch = '';
            renderLibrary();
        };
        document.getElementById('search-input').oninput = (e) => { currentSearch = e.target.value; renderLibrary(); };
        
        document.getElementById('view-grid').onclick = () => {
            document.getElementById('gear-grid').style.display = 'grid';
            document.getElementById('gear-table').classList.add('hidden');
            document.getElementById('view-grid').classList.add('active');
            document.getElementById('view-list').classList.remove('active');
        };
        document.getElementById('view-list').onclick = () => {
            document.getElementById('gear-grid').style.display = 'none';
            document.getElementById('gear-table').classList.remove('hidden');
            document.getElementById('view-list').classList.add('active');
            document.getElementById('view-grid').classList.remove('active');
            renderLibrary().then(() => initColumnResize());
        };
        
        document.getElementById('sort-select').onchange = (e) => { currentSort = e.target.value; renderLibrary(); };
        document.getElementById('category-filter').onchange = (e) => { currentCategory = e.target.value; renderLibrary(); };
        
        document.getElementById('export-backup').onclick = exportBackup;
        document.getElementById('import-backup').onclick = () => document.getElementById('import-file').click();
        document.getElementById('import-file').onchange = (e) => { if (e.target.files[0]) importBackup(e.target.files[0]); };
        document.getElementById('export-csv').onclick = exportCSV;
        
        document.getElementById('setup-button').onclick = openSetup;
        document.getElementById('close-setup').onclick = saveSettings;
        document.getElementById('load-demo').onclick = loadDemo;
        document.getElementById('reset-data').onclick = resetAll;
        document.getElementById('export-logs').onclick = () => alert('Logs nicht implementiert');
        
        document.getElementById('close-detail').onclick = closeDetail;
        document.getElementById('detail-modal').onclick = (e) => { if (e.target.id === 'detail-modal') closeDetail(); };
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = async () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentDetailTab = btn.dataset.tab;
                const device = await dbGet('gear', currentDeviceId);
                if (device) renderDetailTab(device);
            };
        });
        
        document.getElementById('doc-save').onclick = addDocument;
        document.getElementById('doc-cancel').onclick = closeDocDialog;
        document.getElementById('doc-type').onchange = toggleDocType;
        document.getElementById('doc-modal').onclick = (e) => { if (e.target.id === 'doc-modal') closeDocDialog(); };
        
        document.getElementById('photo-close').onclick = () => document.getElementById('photo-modal').style.display = 'none';
        document.getElementById('photo-modal').onclick = (e) => { if (e.target.id === 'photo-modal') document.getElementById('photo-modal').style.display = 'none'; };
        
        document.getElementById('add-wish').onclick = () => document.getElementById('wish-modal').style.display = 'flex';
        document.getElementById('wish-save').onclick = async () => {
            const name = document.getElementById('wish-name').value.trim();
            if (!name) { alert('Name fehlt'); return; }
            await dbPut('wishlist', {
                id: 'wish_' + Date.now(),
                name,
                manufacturer: document.getElementById('wish-manufacturer').value.trim(),
                price: parseFloat(document.getElementById('wish-price').value) || 0,
                link: document.getElementById('wish-link').value.trim()
            });
            document.getElementById('wish-modal').style.display = 'none';
            renderWishlist();
        };
        document.getElementById('wish-cancel').onclick = () => document.getElementById('wish-modal').style.display = 'none';
        
        document.getElementById('donate-button').onclick = () => window.open('https://paypal.me/yourlink', '_blank');
        
        setupDonationToggle();
        
        // Nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                document.getElementById('library-view').classList.toggle('active', currentView === 'library');
                document.getElementById('wishlist-view').classList.toggle('active', currentView === 'wishlist');
                if (currentView === 'library') renderLibrary(); else renderWishlist();
            };
        });
        
        // Kategorie-Dropdown füllen
        const labels = getSettings().catLabels;
        const catSelect = document.getElementById('category-filter');
        for (let i = 0; i < 5; i++) {
            const opt = document.createElement('option');
            opt.value = 'cat' + (i+1);
            opt.textContent = labels[i] || ('Kategorie ' + (i+1));
            catSelect.appendChild(opt);
        }
        
        await renderLibrary();
        await renderWishlist();
        
        console.log('✅ Studio Gear Manager bereit');
    } catch (e) {
        console.error('❌ Fehler:', e);
        alert('Fehler beim Start: ' + e.message);
    }
}

// Demo-Daten
async function loadDemo() {
    if (!confirm('Demo-Daten laden?')) return;
    await dbClear('gear');
    await dbClear('wishlist');
    
    const gear = [
        { id: 'demo1', name: 'SM7B', manufacturer: 'Shure', category: 'cat1', value: 399 },
        { id: 'demo2', name: 'Apollo Twin X', manufacturer: 'UA', category: 'cat2', value: 899 },
        { id: 'demo3', name: 'HS8', manufacturer: 'Yamaha', category: 'cat3', value: 250 }
    ];
    const wishes = [
        { id: 'wish1', name: 'U87', manufacturer: 'Neumann', price: 3200 }
    ];
    
    for (const g of gear) await dbPut('gear', g);
    for (const w of wishes) await dbPut('wishlist', w);
    
    alert('Demo-Daten geladen!');
    closeSetup();
    renderLibrary();
    renderWishlist();
}

function resetAll() {
    if (!confirm('ALLE DATEN LÖSCHEN?')) return;
    Promise.all([dbClear('gear'), dbClear('wishlist')]).then(() => {
        alert('Daten gelöscht!');
        location.reload();
    });
}

// Start
init();
