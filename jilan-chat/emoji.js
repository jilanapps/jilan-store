// Jilan Chat v4.10 — full emoji picker + stickers tab (WhatsApp-style).
// - All standard Unicode emoji (data in emoji-data.js, loaded lazily with a
//   <script src> the first time the picker opens; no fetch() of local files).
// - Emoji are drawn by the phone's own emoji font. No emoji images are
//   shipped (Apple's emoji artwork is Apple's copyrighted design).
// - Category tabs, English keyword search, Recent (per phone, max 32),
//   backspace, bottom tabs "Emoji | Stickers".
(function () {
  "use strict";
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var RECENT_KEY = "jc_recent_emoji", RECENT_ST_KEY = "jc_recent_stickers";
  var RECENT_MAX = 32, RECENT_ST_MAX = 12;
  JC.EMOJI_RECENT_MAX = RECENT_MAX;

  // Category order + SVG tab icons (stroke icons, currentColor).
  var SV = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var CATS = [
    { id: "recent", label: "Recent", icon: SV + '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' },
    { id: "people", label: "Smileys & People", icon: SV + '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8"/><path d="M9 10h.01M15 10h.01"/></svg>' },
    { id: "nature", label: "Animals & Nature", icon: SV + '<circle cx="7" cy="9" r="2"/><circle cx="17" cy="9" r="2"/><circle cx="10" cy="5" r="2"/><circle cx="14" cy="5" r="2"/><path d="M12 12c-3 0-5 3-5 5.5 0 1.6 1.3 2.5 2.8 2.5 1 0 1.5-.5 2.2-.5s1.2.5 2.2.5c1.5 0 2.8-.9 2.8-2.5C17 15 15 12 12 12z"/></svg>' },
    { id: "food", label: "Food & Drink", icon: SV + '<path d="M5 11h14a7 7 0 0 1-14 0z"/><path d="M8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5M16 7c0-1 1-1.5 1-2.5"/></svg>' },
    { id: "activity", label: "Activity", icon: SV + '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>' },
    { id: "travel", label: "Travel & Places", icon: SV + '<path d="M5 16V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7z"/><path d="M5 12h14M7 19v-3M17 19v-3"/><circle cx="8" cy="14" r=".5"/><circle cx="16" cy="14" r=".5"/></svg>' },
    { id: "objects", label: "Objects", icon: SV + '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/></svg>' },
    { id: "symbols", label: "Symbols", icon: SV + '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>' },
    { id: "flags", label: "Flags", icon: SV + '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>' }
  ];
  JC.EMOJI_CATEGORIES = CATS.map(function (c) { return c.id; });

  // A few extra search words (emoji names already cover most words).
  var ALIAS = {
    love: "heart", laugh: "tears of joy", lol: "tears of joy", haha: "grinning", happy: "smil", sad: "crying", cry: "crying",
    angry: "angry", ok: "ok hand", yes: "thumbs up", like: "thumbs up", no: "thumbs down", pray: "folded hands", dua: "palms up",
    thanks: "folded hands", kiss: "kiss", fire: "fire", party: "party", eid: "crescent", moon: "moon", mosque: "mosque",
    pakistan: "pakistan", cricket: "cricket", tea: "teacup", chai: "teacup", rose: "rose", flower: "flower", sleep: "sleep", cool: "sunglasses"
  };

  // Most-wanted result for common searches.
  var TOP = { heart: "\u2764\uFE0F", love: "\u2764\uFE0F", smile: "\u{1F600}", laugh: "\u{1F602}", thumbs: "\u{1F44D}", pray: "\u{1F64F}", fire: "\u{1F525}" };

  // ---------- data ----------
  var dataLoading = null;
  JC.loadEmojiData = function () {
    if (window.JC_EMOJI_DATA) return Promise.resolve(window.JC_EMOJI_DATA);
    if (dataLoading) return dataLoading;
    dataLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "emoji-data.js?v=410";
      s.onload = function () { window.JC_EMOJI_DATA ? resolve(window.JC_EMOJI_DATA) : reject(new Error("no data")); };
      s.onerror = function () { dataLoading = null; reject(new Error("load failed")); };
      document.head.appendChild(s);
    });
    return dataLoading;
  };
  JC.emojiCount = function (data) {
    data = data || window.JC_EMOJI_DATA || {}; var n = 0;
    Object.keys(data).forEach(function (k) { n += (data[k] || []).length; });
    return n;
  };
  JC.searchEmoji = function (q, data) {
    data = data || window.JC_EMOJI_DATA || {};
    q = String(q || "").trim().toLowerCase();
    if (!q) return [];
    var words = [q]; if (ALIAS[q]) words.push(ALIAS[q]);
    var out = [], seen = {}, n = 0;
    CATS.forEach(function (c) {
      (data[c.id] || []).forEach(function (e) {
        if (seen[e[0]]) return;
        var nm = " " + e[1] + " ";
        for (var i = 0; i < words.length; i++) {
          if (nm.indexOf(" " + words[i]) >= 0) {
            // whole-word match ranks first ("red heart" before "smiling face with hearts")
            var score = TOP[q] === e[0] ? -1 : nm.indexOf(" " + words[i] + " ") >= 0 ? (e[1] === words[i] ? 0 : (nm.slice(-words[i].length - 2) === " " + words[i] + " " ? 0.5 : 1)) : 2;
            seen[e[0]] = 1; out.push({ e: e, s: score + i * 0.5, n: n++ }); return;
          }
        }
      });
    });
    out.sort(function (a, b) { return a.s - b.s || a.n - b.n; });
    return out.slice(0, 240).map(function (x) { return x.e; });
  };

  // ---------- recent (per phone) ----------
  function readList(key) { try { var a = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string"; }) : []; } catch (e) { return []; } }
  function pushList(key, v, max) {
    var a = readList(key).filter(function (x) { return x !== v; }); a.unshift(v);
    if (a.length > max) a = a.slice(0, max);
    try { localStorage.setItem(key, JSON.stringify(a)); } catch (e) {}
    return a;
  }
  JC.getRecentEmoji = function () { return readList(RECENT_KEY).slice(0, RECENT_MAX); };
  JC.addRecentEmoji = function (e) { return pushList(RECENT_KEY, e, RECENT_MAX); };
  JC.getRecentStickers = function () { return readList(RECENT_ST_KEY).filter(function (s) { return (JC.STICKERS || []).indexOf(s) >= 0; }); };
  JC.addRecentSticker = function (s) { return pushList(RECENT_ST_KEY, s, RECENT_ST_MAX); };

  // ---------- insert / backspace at the cursor ----------
  JC.insertAtCursor = function (input, text) {
    var v = input.value || "";
    var a = typeof input.selectionStart === "number" ? input.selectionStart : v.length;
    var b = typeof input.selectionEnd === "number" ? input.selectionEnd : a;
    input.value = v.slice(0, a) + text + v.slice(b);
    var p = a + text.length;
    try { input.setSelectionRange(p, p); } catch (e) {}
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  function lastGraphemeLen(s) {
    if (!s) return 0;
    try {
      if (window.Intl && Intl.Segmenter) {
        var segs = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s));
        return segs.length ? segs[segs.length - 1].segment.length : 0;
      }
    } catch (e) {}
    // Fallback: swallow joiners, variation selectors, skin tones, tags, keycap.
    var cps = Array.from(s), n = 0, i = cps.length - 1;
    var ext = /[\u200d\ufe0f\u20e3]|[\u{1F3FB}-\u{1F3FF}]|[\u{E0020}-\u{E007F}]/u;
    while (i >= 0) {
      n += cps[i].length;
      if (ext.test(cps[i])) { i--; continue; }
      if (i > 0 && cps[i - 1] === "\u200d") { n += 1; i -= 2; continue; }
      // regional-indicator pair (flags)
      if (/[\u{1F1E6}-\u{1F1FF}]/u.test(cps[i]) && i > 0 && /[\u{1F1E6}-\u{1F1FF}]/u.test(cps[i - 1])) n += cps[i - 1].length;
      break;
    }
    return n;
  }
  JC.backspaceAtCursor = function (input) {
    var v = input.value || "";
    var a = typeof input.selectionStart === "number" ? input.selectionStart : v.length;
    var b = typeof input.selectionEnd === "number" ? input.selectionEnd : a;
    if (a !== b) { input.value = v.slice(0, a) + v.slice(b); }
    else { var k = lastGraphemeLen(v.slice(0, a)); if (!k) return; input.value = v.slice(0, a - k) + v.slice(a); a -= k; }
    try { input.setSelectionRange(a, a); } catch (e) {}
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // ---------- sticker send ----------
  JC.sendSticker = function (s) {
    if ((JC.STICKERS || []).indexOf(s) < 0) return Promise.resolve();
    JC.addRecentSticker(s);
    var p = JC.sendCurrentMessage ? JC.sendCurrentMessage({ type: "text", text: "Sticker", sticker: s }) : null;
    if (p && p.catch) p.catch(function () { if (JC.toast) JC.toast("Sticker not sent."); });
    return p || Promise.resolve();
  };
  // Newest pack (Islamic greetings first) before the original 16.
  function stickerOrder() { var a = JC.STICKERS || []; return a.slice(16).concat(a.slice(0, 16)); }
  JC.stickerDisplayOrder = stickerOrder;
  function stickerLabel(s) { var i = (JC.STICKERS || []).indexOf(s); return (JC.STICKER_LABELS || [])[i] || "Sticker"; }
  function stickerBtn(s) { return '<button type="button" class="ep-st" data-st="' + esc(s) + '" aria-label="' + esc(stickerLabel(s)) + '"><img src="stickers/' + esc(s) + '.svg" alt="' + esc(stickerLabel(s)) + '" loading="lazy"></button>'; }

  // ---------- picker UI (reusable: composer panel + reaction modal) ----------
  var BACKSPACE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>';
  var SEARCH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  function emojiBtn(e) { return '<button type="button" class="ep-e" data-e="' + esc(e[0]) + '" title="' + esc(e[1] || "") + '">' + esc(e[0]) + "</button>"; }

  function buildPicker(root, opts) {
    opts = opts || {};
    var withStickers = opts.stickers !== false;
    root.innerHTML =
      '<div class="ep-top">' +
        '<div class="ep-search">' + SEARCH + '<input type="search" class="ep-q" placeholder="Search emoji" autocomplete="off" aria-label="Search emoji"></div>' +
        '<div class="ep-cats" role="tablist">' + CATS.map(function (c) { return '<button type="button" class="ep-cat" data-cat="' + c.id + '" title="' + esc(c.label) + '" aria-label="' + esc(c.label) + '">' + c.icon + "</button>"; }).join("") + "</div>" +
      "</div>" +
      '<div class="ep-body" tabindex="-1"><div class="ep-loading">Loading emoji&hellip;</div></div>' +
      '<div class="ep-sbody hidden"></div>' +
      (withStickers || opts.backspace !== false ?
      '<div class="ep-bottom">' +
        (withStickers ? '<div class="ep-modes"><button type="button" class="ep-mode active" data-mode="emoji">Emoji</button><button type="button" class="ep-mode" data-mode="stickers">Stickers</button></div>' : '<div class="ep-modes"></div>') +
        (opts.backspace === false ? "" : '<button type="button" class="ep-bksp" title="Backspace" aria-label="Backspace">' + BACKSPACE + "</button>") +
      "</div>" : "");
    var body = root.querySelector(".ep-body"), sbody = root.querySelector(".ep-sbody");
    var q = root.querySelector(".ep-q"), top = root.querySelector(".ep-top");
    var data = null, mode = "emoji";

    function renderRecent() {
      var sec = body.querySelector('[data-sec="recent"] .ep-grid');
      if (!sec) return;
      var r = JC.getRecentEmoji();
      sec.innerHTML = r.length ? r.map(function (e) { return emojiBtn([e, ""]); }).join("") : '<div class="ep-empty">Emoji you use will show here.</div>';
    }
    function renderAll() {
      var html = "";
      CATS.forEach(function (c) {
        var list = c.id === "recent" ? [] : (data && data[c.id]) || [];
        if (c.id !== "recent" && !list.length) return;
        html += '<div class="ep-sec" data-sec="' + c.id + '"><div class="ep-h">' + esc(c.label) + '</div><div class="ep-grid">' + list.map(emojiBtn).join("") + "</div></div>";
      });
      if (!data) html += '<div class="ep-loading">Loading emoji&hellip;</div>';
      body.innerHTML = html;
      renderRecent();
      setActiveCat("recent");
    }
    function renderSearch(text) {
      var res = JC.searchEmoji(text, data || {});
      body.innerHTML = '<div class="ep-sec" data-sec="search"><div class="ep-h">Search results</div><div class="ep-grid">' +
        (res.length ? res.map(emojiBtn).join("") : '<div class="ep-empty">No emoji found.</div>') + "</div></div>";
      body.scrollTop = 0;
    }
    function renderStickers() {
      var rec = JC.getRecentStickers();
      sbody.innerHTML = (rec.length ? '<div class="ep-h">Recent</div><div class="ep-sgrid">' + rec.map(stickerBtn).join("") + "</div>" : "") +
        '<div class="ep-h">All stickers</div><div class="ep-sgrid">' + stickerOrder().map(stickerBtn).join("") + "</div>";
    }
    function setActiveCat(id) {
      root.querySelectorAll(".ep-cat").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-cat") === id); });
    }
    function setMode(m) {
      mode = m;
      root.querySelectorAll(".ep-mode").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-mode") === m); });
      var st = m === "stickers";
      top.classList.toggle("hidden", st); body.classList.toggle("hidden", st); sbody.classList.toggle("hidden", !st);
      var bk = root.querySelector(".ep-bksp"); if (bk) bk.classList.toggle("hidden", st);
      if (st) renderStickers();
      else renderRecent();
    }

    renderAll();
    JC.loadEmojiData().then(function (d) { data = d; if (!q.value.trim()) renderAll(); else renderSearch(q.value); })
      .catch(function () { var l = body.querySelector(".ep-loading"); if (l) l.textContent = "Couldn't load emoji. Check your internet."; });

    q.addEventListener("input", function () { var t = q.value.trim(); if (t) renderSearch(t); else renderAll(); });
    root.querySelector(".ep-cats").addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest(".ep-cat"); if (!b) return;
      var id = b.getAttribute("data-cat");
      if (q.value) { q.value = ""; renderAll(); }
      var sec = body.querySelector('[data-sec="' + id + '"]');
      if (sec) body.scrollTop = sec.offsetTop;
      setActiveCat(id);
    });
    body.addEventListener("scroll", function () {
      if (q.value) return;
      var secs = body.querySelectorAll(".ep-sec"), cur = "recent", y = body.scrollTop + 8;
      for (var i = 0; i < secs.length; i++) if (secs[i].offsetTop <= y) cur = secs[i].getAttribute("data-sec");
      setActiveCat(cur);
    }, { passive: true });
    // Keep the message input's focus/cursor: picker buttons don't steal focus.
    root.addEventListener("mousedown", function (ev) { if (ev.target.closest && ev.target.closest("button") ) ev.preventDefault(); });
    root.addEventListener("click", function (ev) {
      var t = ev.target.closest ? ev.target : null; if (!t) return;
      var e = t.closest(".ep-e");
      if (e) { var ch = e.getAttribute("data-e"); JC.addRecentEmoji(ch); if (opts.onEmoji) opts.onEmoji(ch); return; }
      var s = t.closest(".ep-st");
      if (s) { if (opts.onSticker) opts.onSticker(s.getAttribute("data-st")); return; }
      var m = t.closest(".ep-mode");
      if (m) { setMode(m.getAttribute("data-mode")); return; }
      if (t.closest(".ep-bksp") && opts.onBackspace) opts.onBackspace();
    });
    return { setMode: setMode, renderRecent: renderRecent, root: root };
  }
  JC._buildEmojiPicker = buildPicker;

  // ---------- composer panel ----------
  var panel = null, picker = null;
  function ensurePanel() {
    if (panel) return panel;
    var composer = $("composer"); if (!composer) return null;
    panel = document.createElement("div");
    panel.id = "emojiPicker"; panel.className = "emoji-picker hidden";
    composer.parentNode.insertBefore(panel, composer.nextSibling);
    picker = buildPicker(panel, {
      onEmoji: function (ch) { var i = $("msgInput"); if (i) JC.insertAtCursor(i, ch); },
      onBackspace: function () { var i = $("msgInput"); if (i) JC.backspaceAtCursor(i); },
      onSticker: function (s) { JC.sendSticker(s); }
    });
    return panel;
  }
  JC.isEmojiPickerOpen = function () { return !!(panel && !panel.classList.contains("hidden")); };
  JC.openEmojiPicker = function (mode) {
    if (!ensurePanel()) return;
    var old = $("emojiPanel"); if (old) old.classList.add("hidden");
    var i = $("msgInput"); if (i && document.activeElement === i) i.blur(); // keyboard down, picker up (WhatsApp)
    panel.classList.remove("hidden");
    picker.setMode(mode === "stickers" ? "stickers" : "emoji");
    var b = $("btnEmoji"); if (b) b.classList.add("active");
    if (JC.fitAppHeight) JC.fitAppHeight();
    var msgs = $("messages"); if (msgs) msgs.scrollTop = msgs.scrollHeight;
  };
  JC.closeEmojiPicker = function () {
    if (panel) panel.classList.add("hidden");
    var b = $("btnEmoji"); if (b) b.classList.remove("active");
    if (JC.fitAppHeight) JC.fitAppHeight();
  };
  JC.toggleEmojiPicker = function () { if (JC.isEmojiPickerOpen()) { JC.closeEmojiPicker(); var i = $("msgInput"); if (i) i.focus(); } else JC.openEmojiPicker("emoji"); };

  // Reaction "+" → full picker in a modal (emoji only).
  JC.pickEmoji = function (cb) {
    if (!JC.modal) return;
    JC.modal('<div class="sheet-title">Choose a reaction</div><div class="emoji-picker in-modal"></div>', function (card, close) {
      buildPicker(card.querySelector(".emoji-picker"), { stickers: false, backspace: false, onEmoji: function (ch) { close(); if (ch.length > 16) { if (JC.toast) JC.toast("This emoji can't be used as a reaction."); return; } cb(ch); } });
    });
  };

  // Paperclip -> Sticker opens the same panel on the Stickers tab.
  JC.openStickerPicker = function () { JC.openEmojiPicker("stickers"); };

  document.addEventListener("DOMContentLoaded", function () {
    var i = $("msgInput");
    // Tapping the text box brings the keyboard back and hides the picker.
    if (i) ["focus", "pointerdown"].forEach(function (ev) { i.addEventListener(ev, function () { if (JC.isEmojiPickerOpen()) JC.closeEmojiPicker(); }); });
    // Leaving the chat screen closes the picker.
    var sc = $("screen-chat");
    if (sc && window.MutationObserver) new MutationObserver(function () { if (!sc.classList.contains("active")) JC.closeEmojiPicker(); }).observe(sc, { attributes: true, attributeFilter: ["class"] });
    // After a sticker send, nothing else to do; after a text send keep picker as is.
  });
})();
