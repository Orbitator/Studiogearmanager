import sys
from playwright.sync_api import sync_playwright
URL, OUT = sys.argv[1], sys.argv[2]
tabs=["colors","views","categories","customFields","labels","backup","license","logs"]
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,h in [(1280,720),(1440,900),(1024,700),(390,800)]:
        page=b.new_page(viewport={"width":w,"height":h})
        errs=[]; page.on("pageerror",lambda e: errs.append(str(e)))
        page.goto(URL); page.wait_for_timeout(900)
        if page.locator("#startDemoBtn").is_visible(): page.click("#startDemoBtn")
        page.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
        page.evaluate("openSettings ? openSettings() : null") if page.evaluate("typeof openSettings")=="function" else page.click("#settingsBtn")
        page.wait_for_timeout(300)
        for tb in tabs:
            page.click(f'[data-settings-tab="{tb}"]'); page.wait_for_timeout(150)
            r=page.evaluate("""()=>{const d=document.querySelector('#settingsDialog');const p=document.querySelector('.settings-panel.active');
              const dr=d.getBoundingClientRect();const out=[];
              p.querySelectorAll('*').forEach(e=>{const r=e.getBoundingClientRect(); if(r.width&&(r.left<dr.left-1||r.right>dr.right+1)) out.push(e.tagName+'.'+e.className)});
              const act=document.querySelector('#settingsDialog .dialog-actions').getBoundingClientRect();
              return {pScrollW:p.scrollWidth,pClientW:p.clientWidth,dlgBottom:dr.bottom,vh:innerHeight,actBottom:act.bottom,panelH:p.clientHeight,panelSH:p.scrollHeight,out:out.slice(0,4)}}""")
            bad = r["pScrollW"]>r["pClientW"]+1 or r["out"] or r["actBottom"]>r["dlgBottom"]+1 or r["dlgBottom"]>h or r["panelH"]<120
            print(("BAD " if bad else "ok  ")+f"{w}x{h} {tb}",r)
            page.screenshot(path=f"{OUT}/{w}_{tb}.png")
        if errs: print("ERR",errs[:3])
        page.close()
    b.close()
