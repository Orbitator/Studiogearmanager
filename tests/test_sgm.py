import sys, threading, http.server, socketserver, functools, json
from playwright.sync_api import sync_playwright

ROOT = sys.argv[1]
PORT = 8765
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORT), Q)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/index.html"

results = []
def check(name, cond, info=""):
    results.append((name, bool(cond), info))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{info}]" if info and not cond else ""))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1400, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "404" not in m.text and "counter.php" not in m.text and "Failed to load resource" not in m.text and "konnte nicht gespeichert" not in m.text else None)
    page.on("dialog", lambda d: d.accept())
    page.goto(URL)
    page.wait_for_timeout(800)
    # Startdialog: Demo laden
    if page.locator("#startDemoBtn").is_visible():
        page.click("#startDemoBtn")
    page.wait_for_timeout(500)
    for sel in ["#whatsNewDialog", "dialog[open]"]:
        page.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
    check("boot ohne JS-Fehler", not errors, "; ".join(errors[:3]))
    n0 = page.evaluate("devices.length")
    check("Demo-Daten geladen", n0 == 6, n0)

    # 1) URL-Bild bleibt beim Bearbeiten erhalten
    img_before = page.evaluate("devices.find(d=>d.id===1).image")
    page.evaluate("openDetail(1)")
    page.click("#editDeviceBtn")
    page.wait_for_timeout(200)
    page.click("#deviceForm button[type=submit]")
    page.wait_for_timeout(300)
    img_after = page.evaluate("devices.find(d=>d.id===1).image")
    check("URL-Bild bleibt nach Bearbeiten erhalten", img_before and img_before == img_after, img_after)

    # 2) Rating 0 bleibt nach Reload
    page.evaluate("setDeviceRating(1, devices.find(d=>d.id===1).rating)")  # toggle auf 0
    page.wait_for_timeout(300)
    page.reload(); page.wait_for_timeout(900)
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
    r = page.evaluate("devices.find(d=>d.id===1).rating")
    check("Rating 0 bleibt nach Reload", r == 0, r)

    # 3) Tab-Beschriftung
    page.evaluate("openDetail(1)")
    tabs = page.evaluate("[...document.querySelectorAll('#tabs .tab-btn')].map(b=>b.textContent)")
    check("Letzter Tab heißt Notizen", tabs[-1] == "Notizen", tabs)

    # 4) Pfeiltasten in Lightbox wechseln nicht das Gerät
    page.click("#detailImage")
    page.wait_for_timeout(150)
    sel_before = page.evaluate("selectedId")
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(150)
    check("Lightbox offen", page.evaluate("isLightboxOpen()"))
    check("Pfeiltaste in Lightbox wechselt Gerät nicht", page.evaluate("selectedId") == sel_before)
    page.keyboard.press("Escape")
    page.wait_for_timeout(100)
    check("ESC schließt Lightbox", not page.evaluate("isLightboxOpen()"))
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(200)
    check("Pfeiltaste ohne Lightbox wechselt Gerät", page.evaluate("selectedId") != sel_before)

    # 5) Duplizieren
    page.evaluate("openDetail(2)")
    page.click("#duplicateDeviceBtn")
    page.wait_for_timeout(300)
    n1 = page.evaluate("devices.length")
    copy = page.evaluate("devices[0]")
    check("Duplizieren erstellt Kopie", n1 == n0 + 1 and copy["name"].endswith("(Kopie)") and copy["serialNumber"] == "" , copy["name"])
    check("Duplikat öffnet Bearbeiten-Dialog", page.evaluate("$('#deviceDialog').open"))
    # 6) Links-Feld speichern
    page.fill("#deviceForm textarea[name=links]", "Shop | https://example.com/shop\nwww.korg.com")
    page.fill("#deviceForm input[name=formFactor]", "Desktop")
    page.click("#deviceForm button[type=submit]")
    page.wait_for_timeout(300)
    d = page.evaluate("devices[0]")
    check("Links + Bauform gespeichert", "example.com" in d["links"] and d["formFactor"] == "Desktop", d.get("links"))
    page.evaluate("activeTab='documents'; renderDetail()")
    links = page.evaluate("[...document.querySelectorAll('.device-link-btn')].map(a=>[a.textContent.trim(), a.href])")
    check("Links klickbar mit Namen/Domain", len(links) == 2 and "Shop" in links[0][0] and "korg.com" in links[1][0], links)

    # 7) Auf Wunschliste + verkauft
    wl0 = page.evaluate("wishlist.length")
    page.click("#toWishlistBtn")
    page.wait_for_timeout(300)
    check("Auf Wunschliste gesetzt", page.evaluate("wishlist.length") == wl0 + 1)
    check("Zusätzlich als verkauft markiert", page.evaluate("isSold(devices[0])"))
    check("Wunsch übernimmt Links", "example.com" in page.evaluate("wishlist[0].links"))
    check("Button zeigt 'Wieder aktiv'", page.evaluate("$('#markSoldBtn').textContent") == "Wieder aktiv")
    # Verkaufte ausblenden
    page.evaluate("closeDetail()")
    page.wait_for_timeout(200)
    check("Chip 'Verkaufte ausblenden' sichtbar", page.locator(".sold-toggle").count() == 1)
    page.click(".sold-toggle"); page.wait_for_timeout(200)
    check("Verkaufte ausgeblendet", page.evaluate("getFilteredDevices().length") == n1 - 1)
    page.click(".sold-toggle"); page.wait_for_timeout(200)

    # 8) Wunschliste -> Bibliothek: Links bleiben Links
    page.evaluate("moveWishlistToLibrary(wishlist[0].id)")
    page.wait_for_timeout(300)
    nd = page.evaluate("devices[0]")
    check("Übernahme: Links im Links-Feld, nicht in Notizen", "example.com" in nd["links"] and "example.com" not in (nd.get("notes") or ""), nd.get("notes"))

    # 9) Listenansicht: Miniatur, Lightbox, Sticky, kein Inline-Grid
    page.evaluate("devices.forEach(d=>{ if(String(d.image).startsWith('http')) d.image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; }); closeDetail(); viewMode='list'; renderAll()")
    page.wait_for_timeout(300)
    check("Miniaturspalte in Liste", page.locator(".device-list-row .mini-device-image").count() > 0)
    inline = page.evaluate("$('#deviceGrid').style.gridTemplateColumns")
    check("Kein Inline-Grid in Listenansicht", inline == "", inline)
    page.locator(".device-list-row .mini-device-image").first.hover()
    page.wait_for_timeout(200)
    check("Hover-Vorschau sichtbar", page.evaluate("document.getElementById('thumbPreview')?.classList.contains('visible')"))
    page.locator(".device-list-row .mini-device-image").first.click()
    page.wait_for_timeout(200)
    check("Klick auf Miniatur öffnet Lightbox, nicht Gerätepass", page.evaluate("isLightboxOpen()") and page.evaluate("$('#detailView').classList.contains('hidden')"))
    page.keyboard.press("Escape")
    pos = page.evaluate("getComputedStyle(document.querySelector('.device-list-header')).position")
    check("Kopfzeile sticky", pos == "sticky", pos)
    mh = page.evaluate("getComputedStyle(document.querySelector('.device-list-view')).maxHeight")
    check("Liste auf Fensterhöhe begrenzt", mh not in ("none", ""), mh)
    # Spaltenausrichtung: Header- und Zeilen-Spalten gleich
    al = page.evaluate("""(()=>{const h=[...document.querySelectorAll('.device-list-header .list-sort-header')].map(e=>Math.round(e.getBoundingClientRect().left));
      const r=[...document.querySelectorAll('.device-list-row')[0].children].map(e=>Math.round(e.getBoundingClientRect().left));
      return h.map((x,i)=>Math.abs(x-r[i])).reduce((a,b)=>Math.max(a,b),0)})()""")
    check("Spalten bündig (Header vs. Zeile)", al <= 16, al)
    check("Free: keine Resize-Griffe", page.locator(".col-resizer").count() == 0)

    # 10) Kategorien umbenennen/zusammenführen
    page.evaluate("openSettingsDialog(); switchSettingsTab('categories'); renderCategoryManager()")
    cats = page.evaluate("getOrderedCategories()")
    check("Free: Kategorien alphabetisch", cats == sorted(cats, key=lambda x: x.lower()), cats)
    first, second = cats[0], cats[1]
    page.evaluate(f"renameCategory({json.dumps(first)}, {json.dumps(second)})")
    page.wait_for_timeout(200)
    check("Kategorie zusammengeführt", first not in page.evaluate("getOrderedCategories()"))
    page.evaluate("$('#settingsDialog').close()")

    # 11) Pro aktivieren
    code = page.evaluate("""(async()=>{const s=LICENSE_SECRET;const base=(await sha256hex(s+'seed-1')).slice(0,8).toUpperCase();
      const chk=(await sha256hex(s+base)).slice(0,4).toUpperCase(); return `SGMP-${base.slice(0,4)}-${base.slice(4,8)}-${chk}`})()""")
    page.evaluate("openSettingsDialog(); switchSettingsTab('license'); renderLicenseStatus()")
    page.fill("#licenseCodeInput", code)
    page.click("#redeemLicenseBtn")
    page.wait_for_timeout(300)
    check("Pro aktiviert", page.evaluate("isProUser()"), page.evaluate("$('#licenseCodeFeedback').textContent"))
    page.evaluate("$('#settingsDialog').close()")
    page.wait_for_timeout(200)
    check("Pro: Resize-Griffe in Liste sichtbar (ohne Reload)", page.locator(".col-resizer").count() > 0)
    # Doppelklick passt Breite an
    page.locator(".col-resizer").nth(2).dblclick()
    page.wait_for_timeout(200)
    w = page.evaluate("viewSettings.listColWidths")
    check("Doppelklick setzt Spaltenbreite", len(w) == 1, w)
    al2 = page.evaluate("""(()=>{const h=[...document.querySelectorAll('.device-list-header .list-sort-header')].map(e=>Math.round(e.getBoundingClientRect().left));
      const r=[...document.querySelectorAll('.device-list-row')[0].children].map(e=>Math.round(e.getBoundingClientRect().left));
      return h.map((x,i)=>Math.abs(x-r[i])).reduce((a,b)=>Math.max(a,b),0)})()""")
    check("Spalten nach Resize bündig", al2 <= 16, al2)
    # Ziehen
    hdl = page.locator(".col-resizer").nth(3)
    box = hdl.bounding_box()
    before = page.evaluate("document.querySelectorAll('.device-list-header .list-sort-header')[3].getBoundingClientRect().width")
    page.mouse.move(box["x"] + 4, box["y"] + 10); page.mouse.down(); page.mouse.move(box["x"] + 124, box["y"] + 10, steps=5); page.mouse.up()
    page.wait_for_timeout(200)
    after = page.evaluate("document.querySelectorAll('.device-list-header .list-sort-header')[3].getBoundingClientRect().width")
    check("Ziehen verbreitert Spalte", after > before + 60, f"{before}->{after}")
    check("Sortierung beim Ziehen nicht ausgelöst", page.evaluate("sortField") in ("added",), page.evaluate("sortField"))

    # 12) Eigene Felder
    page.evaluate("openSettingsDialog(); switchSettingsTab('customFields'); renderCustomFieldsEditor()")
    page.click("#addCustomFieldBtn")
    page.fill("#customFieldsEditor .cf-label >> nth=-1", "Rack-Position")
    page.locator("#customFieldsEditor .cf-label >> nth=-1").dispatch_event("change")
    page.click("#addCustomFieldBtn")
    page.fill("#customFieldsEditor .cf-label >> nth=-1", "Shop-Link")
    page.locator("#customFieldsEditor .cf-label >> nth=-1").dispatch_event("change")
    page.select_option("#customFieldsEditor .cf-type >> nth=-1", "url")
    page.wait_for_timeout(200)
    check("Zwei eigene Felder angelegt", page.evaluate("customFields.filter(f=>f.label).length") == 2)
    page.evaluate("$('#settingsDialog').close(); openDetail(3)")
    page.click("#editDeviceBtn"); page.wait_for_timeout(200)
    cf = page.evaluate("customFields.map(f=>f.id)")
    check("Eigene Felder im Formular", page.locator(f"#deviceForm [name=cf_{cf[0]}]").count() == 1)
    page.fill(f"#deviceForm [name=cf_{cf[0]}]", "Rack A / HE 3")
    page.fill(f"#deviceForm [name=cf_{cf[1]}]", "https://shop.example.org/x")
    page.click("#deviceForm button[type=submit]"); page.wait_for_timeout(300)
    check("Werte eigener Felder gespeichert", page.evaluate(f"devices.find(d=>d.id===3).custom['{cf[0]}']") == "Rack A / HE 3")
    page.evaluate("activeTab='overview'; renderDetail()")
    ov = page.evaluate("$('#tabContent').innerText")
    check("Eigenes Feld im Gerätepass", "Rack A / HE 3" in ov and "shop.example.org" in ov, ov[-200:])
    page.evaluate(f"viewSettings.list['cf:{cf[0]}']=true; saveViewSettings(); closeDetail(); viewMode='list'; renderAll()")
    page.wait_for_timeout(200)
    check("Eigenes Feld als Listenspalte", page.locator(f".list-cf_{cf[0]}").count() > 0)
    check("Eigenes Feld im Sortier-Dropdown", page.locator(f"#sortFieldSelect option[value='cf:{cf[0]}']").count() == 1)
    page.evaluate(f"searchQuery='HE 3'; renderGrid()")
    check("Suche findet Wert eigenes Feld", page.evaluate("getFilteredDevices().length") == 1)
    page.evaluate("searchQuery=''; renderGrid()")

    # 13) Logo-Position Pro
    page.evaluate("viewMode='grid'; viewSettings.logoPosition='inline'; renderAll()")
    check("Logo inline (Pro)", page.locator(".card-inline-logo").count() > 0 or page.locator(".card-name-row").count() > 0)
    page.evaluate("devices[0].manufacturerLogo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; viewSettings.logoPosition='above'; renderAll()")
    check("Logo über Namen (Standard)", page.locator(".card-logo-above").count() > 0)

    # 14) Pro entfernen: Galerie/Custom bleiben beim Speichern erhalten
    page.evaluate("devices.find(d=>d.id===4).images=['data:image/png;base64,AAA','data:image/png;base64,BBB']; devices.find(d=>d.id===4).image='data:image/png;base64,AAA'; saveDevices()")
    page.evaluate("localStorage.removeItem(LICENSE_KEY); onLicenseChanged()")
    page.evaluate("openDetail(4)"); page.click("#editDeviceBtn"); page.wait_for_timeout(200)
    page.click("#deviceForm button[type=submit]"); page.wait_for_timeout(300)
    check("Ohne Pro: Galerie bleibt erhalten", page.evaluate("(devices.find(d=>d.id===4).images||[]).length") == 2)
    page.evaluate("openDetail(3)"); page.click("#editDeviceBtn"); page.wait_for_timeout(200)
    check("Ohne Pro: keine eigenen Felder im Formular", page.locator(".cf-input-label").count() == 0)
    page.click("#deviceForm button[type=submit]"); page.wait_for_timeout(300)
    check("Ohne Pro: Werte eigener Felder bleiben erhalten", page.evaluate(f"devices.find(d=>d.id===3).custom['{cf[0]}']") == "Rack A / HE 3")
    check("Ohne Pro: kein eigenes Feld in Liste", page.evaluate(f"getFieldDefs('list').some(f=>f.custom)") is False)

    # 15) Free-Limit + Duplizieren
    page.evaluate("for(let i=devices.length;i<25;i++) devices.push({...clonePlain(devices[1]), id: 1000+i}); saveDevices(); closeDetail(); openDetail(devices[1].id)")
    page.click("#duplicateDeviceBtn"); page.wait_for_timeout(200)
    check("Free-Limit greift beim Duplizieren", page.evaluate("devices.length") == 25 and page.evaluate("!!document.getElementById('freeLimitDialog')?.open"))
    page.click("#freeLimitLicenseBtn"); page.wait_for_timeout(200)
    check("'Lizenz eingeben' öffnet Lizenz-Tab", page.evaluate("$('#settingsDialog').open && document.querySelector('.settings-panel[data-settings-panel=license]').classList.contains('active')"))
    page.evaluate("$('#settingsDialog').close()")

    # 16) Lizenz-Speicherfehler wird gemeldet
    page.evaluate("(()=>{ window._origSet = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v){ if(k===LICENSE_KEY) throw new DOMException('full','QuotaExceededError'); return window._origSet.call(this,k,v); }; return null; })()")
    page.evaluate("openSettingsDialog(); switchSettingsTab('license'); renderLicenseStatus()")
    page.fill("#licenseCodeInput", code); page.click("#redeemLicenseBtn"); page.wait_for_timeout(300)
    fb = page.evaluate("$('#licenseCodeFeedback').textContent")
    check("Speicherfehler: keine falsche Erfolgsmeldung", "nicht gespeichert" in fb, fb)
    page.evaluate("(()=>{ Storage.prototype.setItem = window._origSet; $('#settingsDialog').close(); return null; })()")

    # 17) Mobile: Grid nicht in feste Spalten gezwängt
    page.evaluate("storeLicense(" + json.dumps(code) + "); viewSettings.gridColumns=5; viewMode='grid'; closeDetail(); renderAll()")
    page.set_viewport_size({"width": 400, "height": 800})
    page.wait_for_timeout(300)
    cols = page.evaluate("getComputedStyle($('#deviceGrid')).gridTemplateColumns.split(' ').length")
    check("Handy: 1 Spalte trotz Pro-Einstellung 5", cols == 1, cols)
    page.set_viewport_size({"width": 1400, "height": 900})
    page.wait_for_timeout(300)
    cols = page.evaluate("getComputedStyle($('#deviceGrid')).gridTemplateColumns.split(' ').length")
    check("Desktop: 5 Spalten (Pro)", cols == 5, cols)

    # 18) EN-Übersetzung + CSV + Backup-Keys
    page.evaluate("lang='en'; applyTranslations()")
    check("EN: Duplizieren übersetzt", page.evaluate("$('#duplicateDeviceBtn').textContent") == "Duplicate")
    page.evaluate("lang='de'; applyTranslations()")
    keys = page.evaluate("Object.keys(buildBackupPayload().settings)")
    check("Backup enthält eigene Felder", "studioGearManager.customFields.v1" in keys, keys)
    check("Keine JS-Fehler im gesamten Test", not errors, "; ".join(errors[:5]))
    page.screenshot(path=sys.argv[2] + "/grid.png")
    page.evaluate("viewMode='list'; renderAll()"); page.wait_for_timeout(200)
    page.screenshot(path=sys.argv[2] + "/list.png")
    page.evaluate("openSettingsDialog(); switchSettingsTab('customFields'); renderCustomFieldsEditor()"); page.wait_for_timeout(200)
    page.screenshot(path=sys.argv[2] + "/customfields.png")
    page.evaluate("$('#settingsDialog').close(); openDetail(3); openDialog('edit', 3)"); page.wait_for_timeout(200)
    page.screenshot(path=sys.argv[2] + "/form.png")
    b.close()
srv.shutdown()
fails = [r for r in results if not r[1]]
print(f"\n{len(results)-len(fails)}/{len(results)} bestanden")
