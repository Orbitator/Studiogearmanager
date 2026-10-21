import sys, json
from playwright.sync_api import sync_playwright
URL=sys.argv[1] if len(sys.argv)>1 else "http://127.0.0.1:8890/codegenerator.html"
OUT=sys.argv[2] if len(sys.argv)>2 else "."
PASS=sys.argv[3] if len(sys.argv)>3 else "test-passwort-123"
res=[]
def check(n,c,info=""): res.append(c); print(("PASS " if c else "FAIL ")+n+("" if c else f"  [{info}]"))
with sync_playwright() as p:
    b=p.chromium.launch()
    # Gerät A: Desktop mit alter, lokaler Liste
    A=b.new_context(viewport={"width":1280,"height":900}); pa=A.new_page(); ea=[]; pa.on("pageerror",lambda e:ea.append(str(e)))
    pa.on("dialog", lambda d: d.accept())
    pa.goto(URL); pa.evaluate("""localStorage.setItem('sgm-codegen-liclist-v1', JSON.stringify([{firstName:'Alt',lastName:'Kunde',email:'alt@k.de',code:'SGMP-XXXX-XXXX-XXXX',date:'2026-01-01'}]))""")
    # echten alten Code erzeugen (seed 7) mit dem Algorithmus im Browser
    code7 = pa.evaluate("generateLicCode(7,'SGMP-v1-4e7b2d19-pro')")
    pa.evaluate(f"""localStorage.setItem('sgm-codegen-liclist-v1', JSON.stringify([{{firstName:'Alt',lastName:'Kunde',email:'alt@k.de',code:'{code7}',date:'2026-01-01',seed:7}}]))""")
    pa.reload(); pa.wait_for_timeout(500)
    check("Keine Secrets im HTML", "4e7b2d19" not in open(__import__("os").path.join(__import__("os").path.dirname(__file__),"..","codegenerator.html")).read() and "8f3a9c21" not in open(__import__("os").path.join(__import__("os").path.dirname(__file__),"..","codegenerator.html")).read())
    pa.click("text=Lizenzen")
    check("Server-URL vorbelegt", pa.input_value("#srvUrl").endswith("/licenses.php"), pa.input_value("#srvUrl"))
    pa.fill("#srvPass","falsch"); pa.click(".srv-connect"); pa.wait_for_timeout(900)
    check("Falsches Passwort abgewiesen", "Falsches Passwort" in pa.text_content("#srvStatus"), pa.text_content("#srvStatus"))
    check("Lokale Liste bleibt nach Fehl-Login", len(json.loads(pa.evaluate("localStorage.getItem('sgm-codegen-liclist-v1')")))==1)
    pa.fill("#srvPass",PASS); pa.click(".srv-connect"); pa.wait_for_timeout(1200)
    st=pa.text_content("#srvStatus")
    check("Verbunden", "Verbunden" in st, st)
    rows=pa.locator("#licListBody tr").count()
    check("Lokale Lizenz auf Server übertragen (2 + 1 = 3)", rows==3, rows)
    check("Secret vom Server gesetzt", pa.input_value("#licSecretInput")=="SGMP-v1-4e7b2d19-pro")
    check("Secret-Felder im Server-Modus ausgeblendet", not pa.locator("#licSecretInput").is_visible())
    check("Nächster Seed = 8", pa.input_value("#licSeed")=="8", pa.input_value("#licSeed"))

    # Gerät B: iPhone
    B=b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True, device_scale_factor=2,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")
    pb=B.new_page(); eb=[]; pb.on("pageerror",lambda e:eb.append(str(e))); pb.on("dialog", lambda d: d.accept())
    pb.goto(URL); pb.wait_for_timeout(400)
    pb.click("text=Lizenzen"); pb.fill("#srvPass",PASS); pb.click(".srv-connect"); pb.wait_for_timeout(1000)
    check("Handy sieht dieselbe Liste", pb.locator("#licListBody tr").count()==3)
    pb.screenshot(path=f"{OUT}/cg_mobile_list.png", full_page=False)
    # gleichzeitig: beide wollen Seed 8
    pb.fill("#licFirstName","Handy"); pb.fill("#licEmail","h@y.de")
    pa.fill("#licFirstName","Desktop"); pa.fill("#licEmail","d@t.de")
    pa.click("#licGenerateBtn"); pa.wait_for_timeout(700)
    pb.click("#licGenerateBtn"); pb.wait_for_timeout(900)
    lst=pb.evaluate("JSON.parse(localStorage.getItem('sgm-codegen-liclist-v1'))")
    seeds=sorted(l['seed'] for l in lst); codes=[l['code'] for l in lst]
    check("Kein doppelter Seed trotz gleichem Start-Seed", len(seeds)==len(set(seeds)) and len(codes)==len(set(codes)), seeds)
    check("Handy-Lizenz mit Gerät 'iPhone' gespeichert", any(l.get('device')=='iPhone' for l in lst))
    # alle Codes gültig im Sinne von app.js
    ok=all(pa.evaluate(f"(async()=>{{const c='{c}'.replace(/-/g,'');const h=await sha256hex('SGMP-v1-4e7b2d19-pro'+c.slice(4,12));return h.slice(0,4).toUpperCase()===c.slice(12)}})()") for c in codes)
    check("Alle Server-Codes gültig (App-Prüfung)", ok)
    check("Formular nach Erzeugen geleert", pb.input_value("#licFirstName")=="")
    check("Mail-Link für Kunden vorhanden", pb.locator("#licenseOutput a.copy-btn[href^='mailto:']").count()==1)
    # Desktop aktualisiert sich beim Zurückkehren
    pa.evaluate("serverRefresh(false)"); pa.wait_for_timeout(600)
    check("Desktop sieht Handy-Lizenz", pa.locator("#licListBody tr").count()==5, pa.locator("#licListBody tr").count())
    # Löschen auf Desktop
    pa.locator("#licListBody tr").first.locator(".lic-del").click(); pa.wait_for_timeout(700)
    pb.evaluate("serverRefresh(false)"); pb.wait_for_timeout(600)
    check("Löschen synchronisiert", pb.locator("#licListBody tr").count()==4)
    # Handy-Reload bleibt angemeldet
    pb.reload(); pb.wait_for_timeout(1200); pb.click("text=Lizenzen")
    check("Handy bleibt nach Neuladen angemeldet", "Verbunden" in pb.text_content("#srvStatus"))
    # Mobile-Layout: kein horizontales Scrollen in irgendeinem Tab
    for tab in ["Spenden-Codes","Lizenzen","Feature-Manager","Version","Benutzer","Limits"]:
        pb.click(f".tab-btn:has-text('{tab}')"); pb.wait_for_timeout(150)
        sw=pb.evaluate("document.documentElement.scrollWidth")
        check(f"Mobil kein Querscrollen: {tab}", sw<=390, sw)
        pb.screenshot(path=f"{OUT}/cg_m_{tab[:5]}.png")
    pb.click(".tab-btn:has-text('Lizenzen')")
    fs=pb.evaluate("getComputedStyle(document.querySelector('#licEmail')).fontSize")
    check("Eingaben 16px (kein iOS-Zoom)", fs=="16px", fs)
    pb.locator("#licListBody").scroll_into_view_if_needed(); pb.screenshot(path=f"{OUT}/cg_mobile_cards.png")
    # Spenden-Code mit Server-Secret auf dem Handy
    pb.click(".tab-btn:has-text('Spenden-Codes')"); pb.click("text=Codes generieren") if pb.locator("text=Codes generieren").count() else None
    pb.wait_for_timeout(400)
    check("Spenden-Codes erzeugt", pb.locator("#output .code-row").count()>0)
    # Server-Sicherungen
    pa.click("text=Server-Sicherungen"); pa.wait_for_timeout(600)
    check("Server-Sicherungen gelistet", pa.locator(".srv-backup-row").count()>=3)
    pa.screenshot(path=f"{OUT}/cg_desktop.png", full_page=True)
    check("Keine JS-Fehler", not ea and not eb, (ea+eb)[:3])
    b.close()
print(f"\n{sum(res)}/{len(res)} bestanden")
