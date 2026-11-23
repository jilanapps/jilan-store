// Jilan Chat v4.12 — status2.js
// WhatsApp-style Updates screen helpers (user order 2026-11-23 09:43):
//  - full-screen text-status composer (whole screen = background colour,
//    big centred text, X / font / palette on top, mic bottom-left for a
//    voice status, round send bottom-right)
//  - small "Add status" sheet (Text / Photo / Voice) for the My status plus
//  - status reactions in the viewer: heart button next to Reply + quick
//    emoji row while the reply box is focused. Reactions are normal 1-to-1
//    chat messages quoting the status (JC.sendStatusReaction in status.js)
//    so no Firestore rules change is needed.
// Posting, voice recording and the viewer itself stay in status.js.

(function () {
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }

  // ---------- composer ----------
  var composerPushed = false;
  function bgList() { return JC.STATUS_BGS || ["#1f7ae0"]; }
  function fontList() { return JC.STATUS_FONTS || ["sans"]; }
  function style() { return JC.statusStyle || (JC.statusStyle = { bg: bgList()[0], font: fontList()[0] }); }

  JC.statusComposerFontSize = function (len) {
    len = len || 0;
    if (len > 140) return 22;
    if (len > 80) return 26;
    if (len > 30) return 30;
    return 36;
  };

  function paintComposer() {
    var c = $("statusComposer"), inp = $("statusTextInput");
    if (!c || !inp) return;
    var st = style();
    c.style.background = st.bg;
    var cls = "f-" + st.font;
    inp.className = cls;
    var len = (inp.value || "").length;
    inp.style.fontSize = JC.statusComposerFontSize(len) + "px";
    inp.style.height = "auto";
    if (inp.scrollHeight) inp.style.height = Math.min(inp.scrollHeight, (window.innerHeight || 640) * 0.6) + "px";
    var send = $("btnPostTextStatus");
    if (send && send.classList) send.classList.toggle("dim", !(inp.value || "").trim());
  }
  JC.paintStatusComposer = paintComposer;

  JC.cycleStatusColor = function () {
    var list = bgList(), st = style();
    var i = list.indexOf(st.bg);
    st.bg = list[(i + 1) % list.length];
    paintComposer();
    return st.bg;
  };
  JC.cycleStatusFont = function () {
    var list = fontList(), st = style();
    var i = list.indexOf(st.font);
    st.font = list[(i + 1) % list.length];
    paintComposer();
    return st.font;
  };

  JC.isStatusComposerOpen = function () {
    var c = $("statusComposer");
    return !!(c && !c.classList.contains("hidden"));
  };

  JC.openStatusComposer = function (opts) {
    opts = opts || {};
    closeSheet(true);
    var c = $("statusComposer"); if (!c) return;
    c.classList.remove("hidden");
    var inp = $("statusTextInput");
    paintComposer();
    try { window.history.pushState({ screen: "screen-status", jcStatusComposer: 1 }, ""); composerPushed = true; } catch (e) { composerPushed = false; }
    if (opts.voice) { if (JC.startVoiceStatus) JC.startVoiceStatus(); }
    else if (inp && inp.focus) { setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60); }
  };

  // Hide only (no history change) — used by popstate.
  function hideComposer() {
    var c = $("statusComposer"); if (!c) return;
    if (JC.isVoiceStatusRecording && JC.isVoiceStatusRecording() && JC.stopVoiceStatus) JC.stopVoiceStatus(false);
    c.classList.add("hidden");
    var inp = $("statusTextInput"); if (inp && inp.blur) { try { inp.blur(); } catch (e) {} }
  }
  JC.closeStatusComposer = function () {
    if (!JC.isStatusComposerOpen()) return;
    hideComposer();
    if (composerPushed) {
      composerPushed = false;
      try { if (window.history.state && window.history.state.jcStatusComposer) window.history.back(); } catch (e) {}
    }
  };

  // ---------- add-status sheet ----------
  var sheetPushed = false;
  JC.openStatusAddSheet = function () {
    var sh = $("statusAddSheet"); if (!sh) return;
    sh.classList.remove("hidden");
    try { window.history.pushState({ screen: "screen-status", jcStatusSheet: 1 }, ""); sheetPushed = true; } catch (e) { sheetPushed = false; }
  };
  function closeSheet(viaAction) {
    var sh = $("statusAddSheet"); if (!sh || sh.classList.contains("hidden")) return;
    sh.classList.add("hidden");
    if (sheetPushed) {
      sheetPushed = false;
      // An action that opens something else replaces the sheet's entry.
      try {
        if (window.history.state && window.history.state.jcStatusSheet) {
          if (viaAction) window.history.replaceState({ screen: "screen-status" }, "");
          else window.history.back();
        }
      } catch (e) {}
    }
  }
  JC.closeStatusAddSheet = function () { closeSheet(false); };

  // ---------- viewer reactions ----------
  var popTimer = null;
  function popEmoji(emoji) {
    var sv = $("statusViewer"); if (!sv || !document.createElement) return;
    var el = document.createElement("div");
    el.className = "sv-pop";
    el.textContent = emoji;
    sv.appendChild(el);
    setTimeout(function () { if (el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el); }, 950);
  }
  JC._statusPop = popEmoji;

  function paintHeart(item) {
    var h = $("svHeart"); if (!h) return;
    var on = JC.statusReactedWith && JC.statusReactedWith(item) === JC.STATUS_HEART;
    h.classList.toggle("on", !!on);
    if (h.setAttribute) h.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function paintReplyButtons() {
    var inp = $("svReplyInput"), h = $("svHeart"), send = $("svReplySend");
    if (!inp || !h || !send) return;
    var typed = !!(inp.value || "").trim();
    h.classList.toggle("hidden", typed);
    send.classList.toggle("hidden", !typed);
  }
  JC.paintStatusReplyButtons = paintReplyButtons;
  function showQuick(on) {
    var q = $("svQuick"); if (!q) return;
    q.classList.toggle("hidden", !on);
  }

  JC.onStatusItemShown = function (item, mine) {
    showQuick(false);
    if (mine) return;
    paintHeart(item);
    paintReplyButtons();
  };

  JC.reactToCurrentStatus = function (emoji) {
    var item = JC.statusCurrentItem && JC.statusCurrentItem();
    if (!item || !JC.sendStatusReaction) return Promise.resolve(false);
    popEmoji(emoji);
    var inp = $("svReplyInput");
    showQuick(false);
    if (inp && inp.blur) { try { inp.blur(); } catch (e) {} }
    return JC.sendStatusReaction(item, emoji).then(function (ok) {
      paintHeart(item);
      if (JC.statusPause) JC.statusPause(false);
      return ok;
    });
  };

  function buildQuick() {
    var q = $("svQuick"); if (!q) return;
    var list = JC.STATUS_QUICK_REACTS || [];
    q.innerHTML = list.map(function (e) {
      return '<button type="button" class="sv-qr" data-emoji="' + e + '" aria-label="React ' + e + '">' + e + "</button>";
    }).join("");
  }

  // ---------- wire ----------
  document.addEventListener("DOMContentLoaded", function () {
    var pen = $("btnStatusText");
    if (pen) pen.addEventListener("click", function () { JC.openStatusComposer(); });
    var x = $("stcClose");
    if (x) x.addEventListener("click", function () { JC.closeStatusComposer(); });
    var f = $("stcFont"); if (f) f.addEventListener("click", function () { JC.cycleStatusFont(); });
    var col = $("stcColor"); if (col) col.addEventListener("click", function () { JC.cycleStatusColor(); });
    var inp = $("statusTextInput");
    if (inp) inp.addEventListener("input", paintComposer);

    var sh = $("statusAddSheet");
    if (sh) sh.addEventListener("click", function (e) { if (e && e.target === sh) JC.closeStatusAddSheet(); });
    var sT = $("sasText"); if (sT) sT.addEventListener("click", function () { JC.openStatusComposer(); });
    var sP = $("sasPhoto"); if (sP) sP.addEventListener("click", function () { closeSheet(false); var fi = $("statusFileInput"); if (fi) fi.click(); });
    var sV = $("sasVoice"); if (sV) sV.addEventListener("click", function () { JC.openStatusComposer({ voice: true }); });

    buildQuick();
    var q = $("svQuick");
    if (q) {
      // Keep the reply box focused while tapping an emoji (no blur flicker).
      ["pointerdown", "mousedown", "touchstart"].forEach(function (ev) {
        q.addEventListener(ev, function (e) { if (e && e.preventDefault) e.preventDefault(); if (e && e.stopPropagation) e.stopPropagation(); });
      });
      q.addEventListener("click", function (e) {
        var t = e && e.target, b = t && t.closest ? t.closest(".sv-qr") : t;
        var em = b && b.getAttribute && b.getAttribute("data-emoji");
        if (em) JC.reactToCurrentStatus(em);
      });
    }
    var heart = $("svHeart");
    if (heart) heart.addEventListener("click", function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      JC.reactToCurrentStatus(JC.STATUS_HEART);
    });
    var rIn = $("svReplyInput");
    if (rIn) {
      rIn.addEventListener("focus", function () { showQuick(true); });
      rIn.addEventListener("blur", function () { setTimeout(function () { showQuick(false); }, 120); });
      rIn.addEventListener("input", function () { paintReplyButtons(); showQuick(!(rIn.value || "").trim()); });
      rIn.addEventListener("keyup", paintReplyButtons);
    }
    var rs = $("svReplySend");
    if (rs) rs.addEventListener("click", function () { setTimeout(paintReplyButtons, 0); });

    // System Back closes the composer / sheet first.
    window.addEventListener("popstate", function () {
      if (JC.isStatusComposerOpen()) { composerPushed = false; hideComposer(); }
      var s2 = $("statusAddSheet");
      if (s2 && !s2.classList.contains("hidden")) { sheetPushed = false; s2.classList.add("hidden"); }
    });
  });
})();
