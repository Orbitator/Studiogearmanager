/*!
 * Donate Widget 1.0 — Spendenhinweis aus dem Studio Gear Manager, als eigenständiges Script
 * (c) HOLODECK · ohne Abhängigkeiten · eine Datei, CSS wird automatisch eingefügt
 *
 * EINBINDEN (einfachste Variante, vor </body>):
 *   <script src="donate-widget.js" data-url="https://www.paypal.com/donate/?hosted_button_id=…"></script>
 *
 * Alle Einstellungen gehen als data-Attribute am <script>-Tag oder per JavaScript:
 *   DonateWidget.init({ url: "…", lang: "en", minDelay: 5, maxDelay: 15 });
 *
 * Steuerung:  DonateWidget.show()   sofort anzeigen (Test, ignoriert Sperren)
 *             DonateWidget.hide()   ausblenden
 *             DonateWidget.reset()  „später“/„gespendet“ vergessen
 *             DonateWidget.suppress(true|false)  z. B. für Pro-Nutzer dauerhaft aus
 */
(function (global) {
  "use strict";

  var TEXTS = {
    de: {
      title: "Hilft dir die App?",
      text: "Wenn ja, freu ich mich riesig über einen kleinen Beitrag. ❤️",
      donate: "Ein Latte Macchiato ausgeben? ;-)",
      later: "Vielleicht später",
      close: "Schließen",
    },
    en: {
      title: "Enjoying the app?",
      text: "If so, I'd be thrilled with a small contribution. ❤️",
      donate: "Buy me a latte? ;-)",
      later: "Maybe later",
      close: "Close",
    },
  };

  var DEFAULTS = {
    url: "",                 // Spenden-Link (PayPal, Ko-fi, Buy Me a Coffee …)
    lang: "auto",            // "de", "en" oder "auto" (Browsersprache)
    title: "", text: "", donate: "", later: "",   // eigene Texte (leer = Standardtext der Sprache)
    emoji: "☕",
    firstDelay: 10,          // Minuten bis zum ersten Hinweis
    minDelay: 10,            // danach alle minDelay … maxDelay Minuten (zufällig)
    maxDelay: 30,
    graceDays: 30,           // nach Klick auf „Spenden“ so viele Tage Ruhe
    laterRepeat: true,       // nach „Vielleicht später“ erneut einplanen
    position: "right",       // "right" | "left"
    theme: "light",          // "light" | "dark" | "auto"
    accent: "#22d3ee",       // Farbe des Spenden-Buttons
    accentText: "#06111f",   // Schriftfarbe auf dem Button
    storageKey: "donateWidget", // eigener Schlüssel je Projekt, falls mehrere Apps auf einer Domain laufen
    autoStart: true,         // false = nur über DonateWidget.show() / schedule()
    skipWhenDialogOpen: true, // nicht über offene <dialog>-Fenster legen
    container: null          // Element oder CSS-Selektor: Hinweis darin statt in der Bildschirmecke zeigen
  };

  var cfg = null, el = null, timer = null, styleEl = null;
  var SCRIPT_EL = document.currentScript;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(cfg.storageKey + "." + key);
      if (value === null) localStorage.removeItem(cfg.storageKey + "." + key);
      else localStorage.setItem(cfg.storageKey + "." + key, String(value));
    } catch (_) { return null; }
  }

  function num(v, fallback) { var n = parseFloat(v); return isFinite(n) && n >= 0 ? n : fallback; }

  function readScriptConfig() {
    var s = SCRIPT_EL || document.querySelector("script[data-donate-widget], script[src*='donate-widget']");
    if (!s || !s.dataset) return {};
    var d = s.dataset, out = {};
    Object.keys(DEFAULTS).forEach(function (k) { if (d[k] !== undefined) out[k] = d[k]; });
    return out;
  }

  function normalize(o) {
    var c = {};
    Object.keys(DEFAULTS).forEach(function (k) { c[k] = o[k] !== undefined && o[k] !== "" ? o[k] : DEFAULTS[k]; });
    ["firstDelay", "minDelay", "maxDelay", "graceDays"].forEach(function (k) { c[k] = num(c[k], DEFAULTS[k]); });
    if (c.maxDelay < c.minDelay) c.maxDelay = c.minDelay;
    ["laterRepeat", "autoStart", "skipWhenDialogOpen"].forEach(function (k) { c[k] = c[k] === true || c[k] === "true" || c[k] === "1"; });
    var lang = c.lang === "auto" ? (navigator.language || "de").slice(0, 2).toLowerCase() : c.lang;
    c.langResolved = TEXTS[lang] ? lang : "en";
    return c;
  }

  function t(key) { return cfg[key] || TEXTS[cfg.langResolved][key]; }

  function css() {
    return [
      ".dw-toast{--dw-bg:#ffffff;--dw-bg2:#f1f5f9;--dw-fg:#0f172a;--dw-muted:#475569;--dw-line:rgba(103,232,249,.35);--dw-ghost:#e2e8f0;",
      "position:fixed;bottom:calc(22px + env(safe-area-inset-bottom,0px));z-index:2147483000;width:min(340px,calc(100vw - 28px));box-sizing:border-box;",
      "padding:18px 18px 14px;background:linear-gradient(180deg,var(--dw-bg),var(--dw-bg2));color:var(--dw-fg);border:1px solid var(--dw-line);border-radius:18px;",
      "box-shadow:0 24px 60px rgba(0,0,0,.35),0 0 28px rgba(34,211,238,.18);font:14px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;",
      "opacity:0;transform:translateY(14px);transition:opacity .22s ease,transform .22s ease;text-align:left}",
      ".dw-toast.dw-right{right:22px}.dw-toast.dw-left{left:22px}",
      ".dw-toast.dw-visible{opacity:1;transform:none}",
      ".dw-toast[hidden]{display:none!important}",
      ".dw-toast.dw-inline{position:absolute;bottom:16px;z-index:5}.dw-inline.dw-right{right:16px}.dw-inline.dw-left{left:16px}",
      ".dw-toast.dw-dark{--dw-bg:#172033;--dw-bg2:#0f172a;--dw-fg:#e2e8f0;--dw-muted:#94a3b8;--dw-line:rgba(103,232,249,.28);--dw-ghost:#1e293b}",
      "@media (prefers-color-scheme:dark){.dw-toast.dw-auto{--dw-bg:#172033;--dw-bg2:#0f172a;--dw-fg:#e2e8f0;--dw-muted:#94a3b8;--dw-line:rgba(103,232,249,.28);--dw-ghost:#1e293b}}",
      ".dw-toast *{box-sizing:border-box}",
      ".dw-close{position:absolute;top:8px;right:8px;width:30px;height:30px;border:0;border-radius:999px;background:transparent;color:var(--dw-muted);font-size:19px;line-height:1;cursor:pointer}",
      ".dw-close:hover,.dw-close:focus-visible{background:var(--dw-ghost);color:var(--dw-fg);outline:none}",
      ".dw-emoji{font-size:26px;margin-bottom:4px;line-height:1.2}",
      ".dw-title{margin:0 0 4px;padding-right:26px;font-size:15px;font-weight:800;letter-spacing:-.005em;color:var(--dw-fg)}",
      ".dw-text{margin:0 0 12px;font-size:13px;color:var(--dw-muted);line-height:1.45}",
      ".dw-actions{display:flex;flex-direction:column;gap:6px}",
      ".dw-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:38px;padding:9px 12px;border-radius:14px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;text-decoration:none;transition:transform .15s ease,filter .15s ease}",
      ".dw-btn:active{transform:scale(.98)}",
      ".dw-btn:focus-visible{outline:2px solid var(--dw-accent);outline-offset:2px}",
      ".dw-donate{background:var(--dw-accent);color:var(--dw-accent-fg);border:0;box-shadow:0 0 24px color-mix(in srgb,var(--dw-accent) 30%,transparent)}",
      ".dw-donate:hover{filter:brightness(1.08)}",
      ".dw-later{background:transparent;color:var(--dw-fg);border:1px solid var(--dw-ghost)}",
      ".dw-later:hover{background:var(--dw-ghost)}",
      "@media (max-width:540px){.dw-toast:not(.dw-inline){left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));width:auto}}",
      "@media (prefers-reduced-motion:reduce){.dw-toast{transition:none}}",
    ].join("");
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function build() {
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-donate-widget", "");
      styleEl.textContent = css();
      document.head.appendChild(styleEl);
    }
    if (el) el.remove();
    el = document.createElement("div");
    el.className = "dw-toast dw-" + (cfg.position === "left" ? "left" : "right") + " dw-" + (cfg.theme === "dark" ? "dark" : cfg.theme === "auto" ? "auto" : "light");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", t("title"));
    el.hidden = true;
    el.style.setProperty("--dw-accent", cfg.accent);
    el.style.setProperty("--dw-accent-fg", cfg.accentText);
    el.innerHTML =
      '<button type="button" class="dw-close" aria-label="' + esc(t("close")) + '">×</button>' +
      (cfg.emoji ? '<div class="dw-emoji" aria-hidden="true">' + esc(cfg.emoji) + "</div>" : "") +
      '<h4 class="dw-title">' + esc(t("title")) + "</h4>" +
      '<p class="dw-text">' + esc(t("text")) + "</p>" +
      '<div class="dw-actions">' +
      '<a class="dw-btn dw-donate" href="' + esc(cfg.url || "#") + '" target="_blank" rel="noopener">' + esc(t("donate")) + "</a>" +
      '<button type="button" class="dw-btn dw-later">' + esc(t("later")) + "</button>" +
      "</div>";
    el.querySelector(".dw-close").addEventListener("click", function () { dismiss("close"); });
    el.querySelector(".dw-later").addEventListener("click", function () { dismiss("later"); });
    el.querySelector(".dw-donate").addEventListener("click", function (e) {
      if (!cfg.url) { e.preventDefault(); console.warn("[DonateWidget] Kein Spenden-Link (data-url) gesetzt."); }
      store("donated", Date.now());
      emit("donate");
      hide();
    });
    var parent = cfg.container ? (typeof cfg.container === "string" ? document.querySelector(cfg.container) : cfg.container) : null;
    if (parent) el.classList.add("dw-inline");
    (parent || document.body).appendChild(el);
  }

  function emit(name) {
    try { document.dispatchEvent(new CustomEvent("donatewidget:" + name)); } catch (_) {}
  }

  function suppressed() {
    if (store("off") === "1") return true;
    var donated = Number(store("donated") || 0);
    return !!donated && Date.now() - donated < cfg.graceDays * 86400000;
  }

  function show(force) {
    if (!cfg) init({});
    if (!force && suppressed()) return false;
    if (!el || !el.isConnected) build();
    el.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("dw-visible"); }); });
    emit("show");
    return true;
  }

  function hide() {
    if (!el) return;
    el.classList.remove("dw-visible");
    setTimeout(function () { if (el) el.hidden = true; }, 230);
  }

  function dismiss(reason) {
    store("dismissed", Date.now());
    emit(reason);
    hide();
    if (cfg.laterRepeat) schedule();
  }

  function schedule(minutes) {
    clearTimeout(timer);
    if (suppressed()) return;
    var m = minutes !== undefined ? minutes : cfg.minDelay + Math.random() * (cfg.maxDelay - cfg.minDelay);
    timer = setTimeout(function () {
      if (suppressed()) return;
      if (cfg.skipWhenDialogOpen && document.querySelector("dialog[open]")) { schedule(); return; }
      show();
    }, m * 60000);
  }

  function init(options) {
    clearTimeout(timer);
    cfg = normalize(Object.assign({}, SCRIPT_CFG, options || {}));
    var start = function () {
      build();
      if (cfg.autoStart) schedule(cfg.firstDelay);
    };
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
    return api;
  }

  var api = {
    init: init,
    show: function () { return show(true); },
    hide: hide,
    schedule: function (minutes) { schedule(minutes); },
    reset: function () { store("donated", null); store("dismissed", null); store("off", null); schedule(cfg ? cfg.firstDelay : undefined); },
    suppress: function (on) { store("off", on === false ? null : "1"); if (on !== false) { clearTimeout(timer); hide(); } else schedule(); },
    isSuppressed: function () { return !!cfg && suppressed(); },
    get config() { return Object.assign({}, cfg); },
    version: "1.0",
  };
  var SCRIPT_CFG = readScriptConfig();
  global.DonateWidget = api;

  // Automatischer Start, wenn das Script mit data-url (oder data-auto) eingebunden wurde
  if (SCRIPT_CFG.url || (SCRIPT_EL && SCRIPT_EL.hasAttribute("data-auto"))) init({});
})(window);
