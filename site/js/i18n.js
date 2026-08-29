// Generic multi-language runtime — shared across Carbon sites.
// Depends on window.__I18N__ (emitted per-site by i18n/build.js) and reads
// data-locale / data-prefix off its own <script> tag.
// Responsibilities (and nothing else — page copy itself is baked into the
// static HTML at build time, this file never rewrites page text):
//   1. Render a Language / Country selector in #i18nSwitcher.
//   2. Detect a mismatch between the visitor's browser language and the
//      current page's locale, and offer (never force) a switch.
//   3. Remember the visitor's explicit choice (localStorage + cookie),
//      and defer to it on their next visit to the site root only —
//      never override a locale the visitor navigated to directly.
(function () {
  'use strict';
  var DATA = window.__I18N__;
  if (!DATA) return; // i18n-data.js not loaded — fail silent, page still works.

  var scriptEl = document.currentScript;
  var CURRENT = scriptEl.getAttribute('data-locale') || DATA.defaultLocale;
  var STORE_KEY = 'se_lang';
  var DISMISS_KEY = 'se_lang_suggest_dismissed';
  var COOKIE_DAYS = 365;

  function pathFor(code) {
    return code === DATA.defaultLocale ? '/' : '/' + code + '/';
  }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setCookie(name, value) {
    var d = new Date();
    d.setTime(d.getTime() + COOKIE_DAYS * 864e5);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  function safeGet(store, key) {
    try { return store.getItem(key); } catch (e) { return null; }
  }
  function safeSet(store, key, val) {
    try { store.setItem(key, val); } catch (e) {}
  }

  function getStoredLocale() {
    return safeGet(window.localStorage, STORE_KEY) || getCookie(STORE_KEY);
  }
  function storeLocale(code) {
    safeSet(window.localStorage, STORE_KEY, code);
    setCookie(STORE_KEY, code);
  }

  function bestMatchFromBrowser() {
    var prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    var codes = DATA.registry.map(function (l) { return l.code; });
    for (var i = 0; i < prefs.length; i++) {
      var p = (prefs[i] || '').toLowerCase();
      // exact match first (e.g. "zh-tw")
      for (var j = 0; j < codes.length; j++) {
        if (codes[j].toLowerCase() === p) return codes[j];
      }
      // then base-language match (e.g. "en-us" -> "en"), skipping zh which needs the region
      var base = p.split('-')[0];
      if (base !== 'zh') {
        for (var k = 0; k < codes.length; k++) {
          if (codes[k].toLowerCase().split('-')[0] === base) return codes[k];
        }
      }
    }
    return null;
  }

  function buildSwitcher() {
    var host = document.getElementById('i18nSwitcher');
    if (!host) return;
    var select = document.createElement('select');
    select.className = 'i18n-select';
    select.setAttribute('aria-label', (DATA.strings[CURRENT] || DATA.strings[DATA.defaultLocale]).lang_label);
    DATA.registry.forEach(function (l) {
      var opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.name;
      if (l.code === CURRENT) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', function () {
      var code = select.value;
      storeLocale(code);
      window.location.href = pathFor(code);
    });
    host.appendChild(select);
  }

  function showSuggestBanner(suggested) {
    var banner = document.getElementById('i18nSuggestBanner');
    if (!banner) return;
    var s = DATA.strings[suggested];
    var localeMeta = DATA.registry.find(function (l) { return l.code === suggested; });
    var text = s.suggest_text.replace('{name}', s.brand ? localeMeta.name : localeMeta.name);
    banner.innerHTML = '';
    var span = document.createElement('span');
    span.textContent = text;
    var accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'i18n-suggest-accept';
    accept.textContent = s.suggest_accept;
    accept.addEventListener('click', function () {
      storeLocale(suggested);
      window.location.href = pathFor(suggested);
    });
    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'i18n-suggest-dismiss';
    dismiss.textContent = s.suggest_dismiss;
    dismiss.addEventListener('click', function () {
      safeSet(window.localStorage, DISMISS_KEY, suggested);
      banner.hidden = true;
    });
    banner.appendChild(span);
    banner.appendChild(accept);
    banner.appendChild(dismiss);
    banner.hidden = false;
  }

  function init() {
    buildSwitcher();

    var stored = getStoredLocale();
    var isRoot = window.location.pathname === '/' || window.location.pathname === '/index.html';

    // Rule: an explicit stored preference is only auto-applied when the
    // visitor lands on the site root with no locale signal yet. A direct
    // link to any specific /xx/ page is always respected as-is.
    if (stored && stored !== CURRENT && isRoot && CURRENT === DATA.defaultLocale) {
      var valid = DATA.registry.some(function (l) { return l.code === stored; });
      if (valid) {
        window.location.replace(pathFor(stored));
        return;
      }
    }

    // Otherwise, if there is no stored preference yet, offer (don't force)
    // a browser-language-based suggestion — unless already dismissed for
    // that same suggested locale.
    if (!stored) {
      var suggestion = bestMatchFromBrowser();
      var dismissedFor = safeGet(window.localStorage, DISMISS_KEY);
      if (suggestion && suggestion !== CURRENT && suggestion !== dismissedFor) {
        showSuggestBanner(suggestion);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
