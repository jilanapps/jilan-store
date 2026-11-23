// Jilan Chat v4.7 — calllog.js
// WhatsApp-style Calls tab. Replaces JC.loadCallHistory from calls.js
// (loaded after it). Display only — no signalling/audio code here.
//  - 12-hour times: "4:12 PM", "Yesterday", "22/11/2026"
//  - small arrow: outgoing (up-right) / incoming (down-left); missed in red
//  - consecutive calls with the same person + kind + direction + missed
//    state are grouped into one row with a count "(3)"
//  - talk time shown when the call really connected (connectedAt..endedAt)
//  - right side call-back icon (voice or video, matching the call)
//  - "Clear call log" (Calls ⋮): per-phone hide via localStorage, nothing
//    is deleted in Firestore.
(function () {
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toMs(ts) {
    if (!ts) return 0;
    if (typeof ts === "number") return ts;
    if (ts.toMillis) return ts.toMillis();
    if (ts.toDate) return ts.toDate().getTime();
    var t = new Date(ts).getTime();
    return isNaN(t) ? 0 : t;
  }
  var CLEAR_KEY = "jilanchat-calllog-cleared";
  JC.callLogClearedAt = function () {
    try { return parseInt(localStorage.getItem(CLEAR_KEY) || "0", 10) || 0; } catch (e) { return 0; }
  };
  JC.clearCallLog = function (now) {
    try { localStorage.setItem(CLEAR_KEY, String(now || Date.now())); } catch (e) {}
  };

  // One call doc -> normalised entry.
  JC.callEntry = function (id, d, me) {
    d = d || {};
    var outgoing = d.callerUid === me;
    var connected = !!(d.connectedAt || d.answer || d.status === "accepted");
    var startMs = toMs(d.createdAt);
    var dur = 0;
    if (d.connectedAt && d.endedAt) dur = Math.max(0, Math.round((toMs(d.endedAt) - toMs(d.connectedAt)) / 1000));
    return {
      id: id,
      otherUid: outgoing ? d.calleeUid : d.callerUid,
      kind: d.kind === "video" ? "video" : "voice",
      outgoing: outgoing,
      missed: !outgoing && !connected,
      declined: d.status === "declined",
      connected: connected,
      durationSec: dur,
      at: startMs
    };
  };
  // Newest first; group runs of the same person/kind/direction/missed.
  JC.groupCalls = function (entries) {
    var sorted = entries.slice().sort(function (a, b) { return b.at - a.at; });
    var out = [];
    sorted.forEach(function (e) {
      var g = out[out.length - 1];
      if (g && g.otherUid === e.otherUid && g.kind === e.kind && g.outgoing === e.outgoing && g.missed === e.missed) {
        g.count++; g.items.push(e);
        return;
      }
      out.push({ otherUid: e.otherUid, kind: e.kind, outgoing: e.outgoing, missed: e.missed,
        at: e.at, durationSec: e.durationSec, connected: e.connected, count: 1, items: [e] });
    });
    return out;
  };
  JC.fmtCallDur = function (sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var mm = (h ? (m < 10 ? "0" : "") : "") + m;
    return (h ? h + ":" : "") + mm + ":" + (s < 10 ? "0" : "") + s;
  };
  JC.callLabel = function (g) {
    var k = g.kind === "video" ? "video call" : "voice call";
    if (g.missed) return "Missed " + k;
    return (g.outgoing ? "Outgoing " : "Incoming ") + k;
  };

  var SVG_OUT = '<svg class="cl-arrow" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z"/></svg>';
  var SVG_IN = '<svg class="cl-arrow" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 5.41 18.59 4 7 15.59V9H5v10h10v-2H8.41z"/></svg>';
  var SVG_PHONE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z"/></svg>';
  var SVG_VIDEO = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>';

  JC.callRowHtml = function (g, name, avatar, now) {
    var t = JC.fmtListTime ? JC.fmtListTime(g.at, now) : "";
    var meta = (g.connected && g.durationSec && !g.missed) ? " · " + JC.fmtCallDur(g.durationSec) : "";
    return '<div class="avatar">' + (avatar || esc(((name || "?")[0] || "?").toUpperCase())) + '</div>' +
      '<div class="info"><div class="name cl-name' + (g.missed ? " missed" : "") + '">' + esc(name || "…") +
      (g.count > 1 ? ' <span class="cl-count">(' + g.count + ')</span>' : "") + '</div>' +
      '<div class="detail cl-detail' + (g.missed ? " missed" : "") + '">' + (g.outgoing ? SVG_OUT : SVG_IN) +
      '<span>' + esc(JC.callLabel(g)) + '</span>' +
      '<span class="cl-time">' + esc((t ? " · " + t : "") + meta) + '</span></div></div>' +
      '<button type="button" class="icon-btn cl-callback" aria-label="' + (g.kind === "video" ? "Video call" : "Voice call") + '">' +
      (g.kind === "video" ? SVG_VIDEO : SVG_PHONE) + '</button>';
  };

  function profileOf(uid) {
    var p = JC.getCachedProfile ? JC.getCachedProfile(uid) : null;
    if (p) return Promise.resolve(p);
    return JC.db.collection("users").doc(uid).get().then(function (s) { return s.exists ? s.data() : { displayName: "Unknown" }; })
      .catch(function () { return { displayName: "Unknown" }; });
  }
  function avatarFor(p) {
    var ph = p && p.photoURL;
    if (typeof ph === "string" && (ph.indexOf("data:image/") === 0 || ph.indexOf("https://") === 0)) {
      return '<img src="' + esc(ph) + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
    }
    return "";
  }

  JC.loadCallHistory = function () {
    var list = $("callList");
    var empty = $("callsEmpty");
    if (!JC.db || !JC.currentUser || !list) return;
    var me = JC.currentUser.uid;
    list.innerHTML = JC.skeletonRows ? JC.skeletonRows(6, "call") : "<p class='cl-loading'>Loading&hellip;</p>";
    if (empty) empty.classList.add("hidden");
    var qOut = JC.db.collection("calls").where("callerUid", "==", me).limit(30).get();
    var qIn = JC.db.collection("calls").where("calleeUid", "==", me).limit(30).get();
    Promise.all([qOut, qIn]).then(function (results) {
      var seen = {}, entries = [];
      var cleared = JC.callLogClearedAt();
      results.forEach(function (snap) {
        snap.forEach(function (doc) {
          if (seen[doc.id]) return;
          seen[doc.id] = true;
          var e = JC.callEntry(doc.id, doc.data(), me);
          if (e.at && e.at <= cleared) return;
          if (!e.at && cleared) return;
          entries.push(e);
        });
      });
      var groups = JC.groupCalls(entries).slice(0, 40);
      list.innerHTML = "";
      if (!groups.length) { if (empty) empty.classList.remove("hidden"); return; }
      groups.forEach(function (g) {
        var div = document.createElement("div");
        div.className = "chat-row call-row";
        div.innerHTML = JC.callRowHtml(g, "", "");
        list.appendChild(div);
        profileOf(g.otherUid).then(function (p) {
          div.innerHTML = JC.callRowHtml(g, p.displayName || "Unknown", avatarFor(p));
          wire(div, g);
        });
        wire(div, g);
      });
    }).catch(function () {
      list.innerHTML = "<p class='cl-loading'>Could not load calls.</p>";
    });
    function wire(div, g) {
      var chatId = JC.chatIdFor ? JC.chatIdFor(me, g.otherUid) : null;
      div.onclick = function (e) {
        if (!chatId || !JC.openChat) return;
        var cb = e && e.target && e.target.closest && e.target.closest(".cl-callback");
        JC.openChat(chatId, g.otherUid);
        if (cb && JC.startCall) setTimeout(function () { JC.startCall(g.kind); }, 150);
      };
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    var btn = $("btnCallsMenu"), menu = $("callsMenu");
    if (!btn || !menu) return;
    btn.addEventListener("click", function (e) { if (e && e.stopPropagation) e.stopPropagation(); menu.classList.toggle("hidden"); });
    document.addEventListener("click", function () { menu.classList.add("hidden"); });
    var clr = $("btnClearCallLog");
    if (clr) clr.addEventListener("click", function () {
      menu.classList.add("hidden");
      if (!window.confirm || window.confirm("Clear call log? Calls will be removed from this phone only.")) {
        JC.clearCallLog();
        JC.loadCallHistory();
        if (JC.toast) JC.toast("Call log cleared");
      }
    });
  });
})();
