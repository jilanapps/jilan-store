// Jilan Chat v4.8 — features.js (2026-11-22)
// User order 21:48 / 21:50: group fixes + six free features.
//  A) Groups: add member by @username or Gmail (groups.js), private invite
//     link (groupInvites/{code}, admin can reset), working chat ⋮ menu.
//  B) App lock (PIN + fingerprint on vc9+), disappearing messages
//     (Off / 24 hours / 7 days), starred messages, in-chat search,
//     privacy (hide last seen, hide read receipts), location share.
// Spark only: no Storage, no Blaze. Device-only settings live in
// localStorage (app lock, privacy, starred). Server-backed parts that need
// rules v4.8 (invite links, member leave, disappearing deletes) fail
// quietly with a clear message until those rules are published.

(function () {
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function me() { return JC.currentUser && JC.currentUser.uid; }
  function fv() { return window.firebase && firebase.firestore && firebase.firestore.FieldValue; }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(t) { if (JC.toast) JC.toast(t); }
  function item(act, label, cls) { return JC.sheetItem ? JC.sheetItem(act, label, cls) : '<button type="button" class="sheet-item' + (cls ? " " + cls : "") + '" data-act="' + act + '">' + esc(label) + "</button>"; }
  function sheet(html, cb) { if (JC.openSheet) JC.openSheet(html, cb); }
  function bridge(name) { try { return window.Android && typeof window.Android[name] === "function"; } catch (e) { return false; } }
  function tsMs(ts) {
    if (!ts) return Date.now();   // pending server timestamp = now
    if (ts.toMillis) return ts.toMillis();
    if (ts.toDate) return ts.toDate().getTime();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    var n = +new Date(ts); return isNaN(n) ? Date.now() : n;
  }
  JC.V48 = true;

  // =====================================================================
  // 1. SHA-256 (sync, tiny) — PIN hash for app lock.
  // =====================================================================
  JC.sha256 = function (ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, maxWord = mp(2, 32), result = "", words = [], i, j;
    var str = unescape(encodeURIComponent(ascii));
    var bitLen = str.length * 8, hash = [], k = [], pc = 0, isC = {};
    for (var cand = 2; pc < 64; cand++) {
      if (!isC[cand]) {
        for (i = 0; i < 313; i += cand) isC[i] = cand;
        hash[pc] = (mp(cand, .5) * maxWord) | 0;
        k[pc++] = (mp(cand, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    str += "\x80";
    while (str.length % 64 - 56) str += "\x00";
    for (i = 0; i < str.length; i++) {
      j = str.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((bitLen / maxWord) | 0);
    words[words.length] = (bitLen);
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i]
          + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : "") + b.toString(16); }
    return result;
  };

  // =====================================================================
  // 2. PRIVACY (per phone): hide last seen, hide read receipts.
  // WhatsApp rule: if you hide yours, you don't see other people's either.
  // =====================================================================
  var PRIV_KEY = "jc_privacy";
  JC.getPrivacy = function () { var p = lsGet(PRIV_KEY, {}); return { hideLastSeen: !!p.hideLastSeen, hideReceipts: !!p.hideReceipts }; };
  JC.hideLastSeenOn = function () { return JC.getPrivacy().hideLastSeen; };
  JC.hideReadReceiptsOn = function () { return JC.getPrivacy().hideReceipts; };
  JC.setPrivacy = function (key, on) {
    var p = JC.getPrivacy(); p[key] = !!on; lsSet(PRIV_KEY, p);
    if (key === "hideLastSeen" && JC.setPresence) JC.setPresence(true);
    renderSettingsExtras();
  };

  // =====================================================================
  // 3. STARRED MESSAGES (per phone).
  // =====================================================================
  function starKey() { return "jc_starred_" + (me() || "x"); }
  JC.getStarred = function () { var a = lsGet(starKey(), []); return Array.isArray(a) ? a : []; };
  JC.isStarred = function (chatId, msgId) { return JC.getStarred().some(function (s) { return s.chatId === chatId && s.msgId === msgId; }); };
  function chatTitle() {
    if (JC.currentChatIsGroup) return (JC.currentGroup && JC.currentGroup.name) || "Group";
    return (JC.currentChatOther && JC.currentChatOther.displayName) || "Chat";
  }
  JC.toggleStar = function (msgId, m) {
    var chatId = JC.currentChatId; if (!chatId || !msgId) return false;
    var a = JC.getStarred(), i = -1;
    a.forEach(function (s, n) { if (s.chatId === chatId && s.msgId === msgId) i = n; });
    var on;
    if (i >= 0) { a.splice(i, 1); on = false; }
    else {
      a.unshift({ chatId: chatId, msgId: msgId, isGroup: !!JC.currentChatIsGroup, otherUid: JC.currentChatOtherUid || "",
        title: chatTitle(), mine: m.senderId === me(), preview: String((JC.messagePreviewText ? JC.messagePreviewText(m) : m.text) || (m.location ? "Location" : "")).slice(0, 200),
        at: tsMs(m.createdAt), starredAt: Date.now() });
      if (a.length > 500) a = a.slice(0, 500);
      on = true;
    }
    lsSet(starKey(), a);
    var d = JC.getMsgData && JC.getMsgData(msgId);
    if (d && d.el) d.el.classList.toggle("starred", on);
    toast(on ? "Message starred" : "Star removed");
    return on;
  };
  JC.renderStarred = function () {
    var list = $("starredList"); if (!list) return;
    var a = JC.getStarred();
    var only = JC._starredOnlyChat || null;
    if (only) a = a.filter(function (s) { return s.chatId === only; });
    var empty = $("starredEmpty"); if (empty) empty.classList.toggle("hidden", a.length > 0);
    list.innerHTML = a.map(function (s, n) {
      var when = JC.fmtListTime ? JC.fmtListTime(new Date(s.at)) : "";
      return '<div class="chat-row star-row" data-n="' + n + '"><div class="avatar star-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7 2 9.3l5.4 4.7-1.6 7z"/></svg></div>' +
        '<div class="info"><div class="top"><div class="name">' + esc((s.mine ? "You" : "") + (s.mine ? " \u2192 " : "") + s.title) + '</div><div class="time">' + esc(when) + '</div></div>' +
        '<div class="preview">' + esc(s.preview || "Message") + '</div></div>' +
        '<button type="button" class="icon-btn dark star-un" data-un="' + n + '" title="Unstar" aria-label="Unstar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    }).join("");
    list.onclick = function (e) {
      var t = e.target;
      while (t && t !== list && !(t.getAttribute && (t.getAttribute("data-un") != null || t.getAttribute("data-n") != null))) t = t.parentNode;
      if (!t || t === list) return;
      var un = t.getAttribute("data-un");
      if (un != null) {
        var s = a[+un], all = JC.getStarred().filter(function (x) { return !(x.chatId === s.chatId && x.msgId === s.msgId); });
        lsSet(starKey(), all); JC.renderStarred(); return;
      }
      JC.openStarred(a[+t.getAttribute("data-n")]);
    };
  };
  JC.openStarredScreen = function (onlyChatId) {
    JC._starredOnlyChat = onlyChatId || null;
    var h = $("starredTitle"); if (h) h.textContent = onlyChatId ? "Starred in this chat" : "Starred messages";
    JC.showScreen("screen-starred", { push: true });
    JC.renderStarred();
  };
  JC.openStarred = function (s) {
    if (!s) return;
    if (s.isGroup) { if (JC.openGroupChat) JC.openGroupChat(s.chatId); }
    else if (JC.openChat) JC.openChat(s.chatId, s.otherUid);
    var tries = 0;
    (function seek() {
      var d = JC.getMsgData && JC.getMsgData(s.msgId);
      if (d && d.el) { JC.scrollToMsg(s.msgId); return; }
      if (++tries < 30) setTimeout(seek, 150); else toast("That message is no longer in this chat.");
    })();
  };

  // =====================================================================
  // 4. DISAPPEARING MESSAGES — chats/{id}.disappearSec | groups/{id}.disappearSec
  // =====================================================================
  JC.DISAPPEAR_OPTS = [0, 86400, 604800];
  JC.currentDisappearSec = 0;
  JC.disappearLabel = function (sec) { return sec === 86400 ? "24 hours" : sec === 604800 ? "7 days" : "Off"; };
  var chatDocUnsub = null, expiryTimers = {}, deleteTried = {}, sysRendered = {};
  JC.isExpired = function (m, now) {
    var ttl = +(m && m.ttlSec) || 0; if (!ttl) return false;
    return (now || Date.now()) >= tsMs(m.createdAt) + ttl * 1000;
  };
  function msgDocRef(msgId, isGroup) {
    return JC.db.collection(isGroup ? "groups" : "chats").doc(JC.currentChatId).collection("messages").doc(msgId);
  }
  // Delete an expired message on the server (either participant may; rules v4.8).
  JC.deleteExpired = function (msgId, isGroup) {
    var key = JC.currentChatId + "/" + msgId;
    if (deleteTried[key] || !JC.db || !JC.currentChatId) return;
    deleteTried[key] = 1;
    try { msgDocRef(msgId, isGroup).delete().catch(function () {}); } catch (e) {}
  };
  function setNotice() {
    var n = $("e2eNotice"); if (!n) return;
    var base = n.getAttribute("data-base") || n.textContent;
    n.setAttribute("data-base", base.replace(/ Disappearing messages: .*$/, ""));
    base = n.getAttribute("data-base");
    n.textContent = JC.currentDisappearSec ? base + " Disappearing messages: " + JC.disappearLabel(JC.currentDisappearSec) + "." : base;
  }
  JC.preRenderMessage = function (msgId, m, isGroup) {
    if (!m) return false;
    if (m.system) {
      if (sysRendered[msgId]) return true;
      var box = $("messages"); if (!box) return true;
      var div = document.createElement("div");
      div.className = "sys-note";
      div.setAttribute("data-msg-id", msgId);
      div.textContent = m.text || "";
      box.appendChild(div);
      sysRendered[msgId] = div;
      return true;
    }
    if (JC.isExpired(m)) { JC.deleteExpired(msgId, isGroup); return true; }
    return false;
  };
  // Message extras on send: disappearing timer, location, system flag.
  JC.applyMessageExtras = function (msg, data) {
    if (data && data.system) { msg.system = true; return msg; }
    if (data && data.location) {
      var L = data.location;
      msg.location = { lat: +(+L.lat).toFixed(6), lng: +(+L.lng).toFixed(6), acc: Math.max(0, Math.round(+L.acc || 0)) };
      if (typeof L.liveUntil === "number" && L.liveUntil > Date.now() && L.liveUntil < Date.now() + 8 * 3600 * 1000 + 60000) msg.location.liveUntil = Math.round(L.liveUntil);
      msg.type = "text";
    }
    var ttl = +JC.currentDisappearSec || 0;
    if (ttl === 86400 || ttl === 604800) msg.ttlSec = ttl;
    return msg;
  };
  function myName() { return (JC.userProfile && JC.userProfile.displayName) || "Someone"; }
  JC.setDisappearing = function (sec) {
    if (!JC.db || !JC.currentChatId) return Promise.resolve();
    sec = +sec || 0;
    if (JC.DISAPPEAR_OPTS.indexOf(sec) < 0) sec = 0;
    if (JC.currentChatIsGroup) {
      var g = JC.currentGroup || {};
      if ((g.admins || []).indexOf(me()) < 0) { toast("Only group admins can change this."); return Promise.resolve(); }
    }
    if (sec === (+JC.currentDisappearSec || 0)) return Promise.resolve();
    var ref = JC.db.collection(JC.currentChatIsGroup ? "groups" : "chats").doc(JC.currentChatId);
    return ref.update({ disappearSec: sec }).then(function () {
      JC.currentDisappearSec = sec; setNotice();
      var note = sec ? myName() + " turned on disappearing messages. New messages will disappear " + JC.disappearLabel(sec) + " after they're sent."
        : myName() + " turned off disappearing messages.";
      return JC.sendCurrentMessage({ type: "text", text: note, system: true }).catch(function () {});
    }).catch(function () { toast("Couldn't change disappearing messages."); });
  };
  JC.openDisappearSheet = function () {
    var cur = +JC.currentDisappearSec || 0;
    var html = '<div class="sheet-title">Disappearing messages</div><div class="sheet-sub">New messages will disappear after the time you choose. Messages sent before stay.</div>';
    JC.DISAPPEAR_OPTS.forEach(function (s) { html += item("dis" + s, (cur === s ? "\u2713 " : "") + JC.disappearLabel(s)); });
    sheet(html, function (act) { if (act && act.indexOf("dis") === 0) JC.setDisappearing(+act.slice(3)); });
  };
  function scheduleExpiry(div, msgId, m, isGroup) {
    var ttl = +(m && m.ttlSec) || 0; if (!ttl) return;
    var left = tsMs(m.createdAt) + ttl * 1000 - Date.now();
    if (left > 2147483000) return;   // > 24 days: setTimeout limit; checked on reopen
    var chatAtSchedule = JC.currentChatId;
    if (expiryTimers[msgId]) clearTimeout(expiryTimers[msgId]);
    expiryTimers[msgId] = setTimeout(function () {
      delete expiryTimers[msgId];
      if (JC.currentChatId !== chatAtSchedule) return;
      if (div && div.parentNode) div.parentNode.removeChild(div);
      JC.deleteExpired(msgId, isGroup);
    }, Math.max(0, left));
  }

  // =====================================================================
  // 5. LOCATION SHARE (no paid map API: Google Maps link)
  // =====================================================================
  JC.mapsUrl = function (lat, lng) { return "https://www.google.com/maps/search/?api=1&query=" + (+lat) + "," + (+lng); };
  JC.locationHtml = function (m) {
    var L = m.location || {};
    return '<div class="loc-card"><div class="loc-pin"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg></div>' +
      '<div class="loc-info"><div class="loc-title">Location</div><div class="loc-coords">' + esc((+L.lat).toFixed(5) + ", " + (+L.lng).toFixed(5)) + (L.acc ? " (\u00b1" + esc(L.acc) + " m)" : "") + '</div></div></div>' +
      '<button type="button" class="loc-open" data-lat="' + esc(L.lat) + '" data-lng="' + esc(L.lng) + '">Open in Maps</button>';
  };
  JC.openExternal = function (url) {
    if (bridge("openLink")) { try { window.Android.openLink(url); return; } catch (e) {} }
    try { window.open(url, "_blank"); } catch (e) { location.href = url; }
  };
  JC.shareLocation = function () {
    var shell = !!window.Android;
    if (shell && !bridge("isLocationSupported")) { toast("Please update Jilan Chat to share location."); return; }
    if (!navigator.geolocation) { toast("Location is not available on this phone."); return; }
    toast("Getting your location...");
    navigator.geolocation.getCurrentPosition(function (pos) {
      var c = pos.coords;
      var L = { lat: c.latitude, lng: c.longitude, acc: c.accuracy };
      var html = '<div class="sheet-title">Send your current location?</div><div class="sheet-sub">' + esc(c.latitude.toFixed(5) + ", " + c.longitude.toFixed(5)) + " (\u00b1" + Math.round(c.accuracy) + " m)</div>" + item("send", "Send location") + item("cancel", "Cancel");
      sheet(html, function (act) {
        if (act !== "send") return;
        JC.sendCurrentMessage({ type: "text", text: "Location: " + JC.mapsUrl(L.lat, L.lng), location: L })
          .catch(function () { toast("Location not sent."); });
      });
    }, function (err) {
      if (err && err.code === 1) toast("Location permission is off. Allow location for Jilan Chat, then try again.");
      else if (err && err.code === 3) toast("Couldn't get location in time. Turn on GPS and try again.");
      else toast("Couldn't get your location. Turn on GPS and try again.");
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
  };
  JC.openAttachSheet = function () {
    var html = '<div class="sheet-title">Send</div>' + item("photo", "Photo") + item("location", "Location");
    sheet(html, function (act) {
      if (act === "photo") { var f = $("fileInput"); if (f) f.click(); }
      else if (act === "location") JC.shareLocation();
    });
  };

  // =====================================================================
  // 6. IN-CHAT SEARCH (highlight + jump)
  // =====================================================================
  var search = { hits: [], idx: -1, marks: [] };
  function clearMarks() {
    search.marks.forEach(function (r) {
      try { if (r.span.parentNode) r.span.parentNode.replaceChild(r.text, r.span); } catch (e) {}
    });
    search.marks = [];
    search.hits.forEach(function (el) { el.classList.remove("search-hit"); el.classList.remove("search-current"); });
    search.hits = []; search.idx = -1;
  }
  function markIn(div, q) {
    var lower = q.toLowerCase();
    Array.prototype.slice.call(div.childNodes || []).forEach(function (n) {
      if (n.nodeType !== 3) return;
      var t = n.nodeValue, i = t.toLowerCase().indexOf(lower);
      if (i < 0) return;
      var span = document.createElement("span");
      span.innerHTML = esc(t.slice(0, i)) + '<mark class="search-mark">' + esc(t.slice(i, i + q.length)) + "</mark>" + esc(t.slice(i + q.length));
      div.replaceChild(span, n);
      search.marks.push({ span: span, text: n });
    });
  }
  JC.runChatSearch = function (q) {
    clearMarks();
    q = String(q || "").trim();
    var cnt = $("chatSearchCount");
    if (!q) { if (cnt) cnt.textContent = ""; return 0; }
    var data = JC.allMsgData ? JC.allMsgData() : {};
    var lower = q.toLowerCase(), hits = [];
    Object.keys(data).forEach(function (id) {
      var d = data[id], m = d.m || {};
      if (!d.el || m.deleted || d.el.style.display === "none" || !d.el.parentNode) return;
      var txt = (m.location ? "Location " : "") + (m.text || "");
      if (txt.toLowerCase().indexOf(lower) >= 0) hits.push(d.el);
    });
    var box = $("messages");
    if (box && box.children) hits.sort(function (a, b) { return Array.prototype.indexOf.call(box.children, a) - Array.prototype.indexOf.call(box.children, b); });
    hits.forEach(function (el) { el.classList.add("search-hit"); markIn(el, q); });
    search.hits = hits;
    search.idx = hits.length - 1;   // newest match first, like WhatsApp
    focusHit();
    return hits.length;
  };
  function focusHit() {
    var cnt = $("chatSearchCount");
    search.hits.forEach(function (el) { el.classList.remove("search-current"); });
    if (!search.hits.length) { if (cnt) cnt.textContent = "No results"; return; }
    var el = search.hits[search.idx];
    el.classList.add("search-current");
    try { el.scrollIntoView({ block: "center" }); } catch (e) {}
    if (cnt) cnt.textContent = (search.idx + 1) + " of " + search.hits.length;
  }
  JC.chatSearchStep = function (dir) {
    if (!search.hits.length) return;
    search.idx = (search.idx + dir + search.hits.length) % search.hits.length;
    focusHit();
  };
  JC.openChatSearch = function () {
    var bar = $("chatSearchBar"); if (!bar) return;
    bar.classList.remove("hidden");
    var inp = $("chatSearchField"); if (inp) { inp.value = ""; try { inp.focus(); } catch (e) {} }
    var cnt = $("chatSearchCount"); if (cnt) cnt.textContent = "";
  };
  JC.closeChatSearch = function () {
    clearMarks();
    var bar = $("chatSearchBar"); if (bar) bar.classList.add("hidden");
  };

  // =====================================================================
  // 7. GROUP INVITE LINK — groupInvites/{code} (rules v4.8)
  // =====================================================================
  JC.INVITE_BASE = "https://jilanapps.github.io/jilan-store/jilan-chat/join.html?c=";
  JC.newInviteCode = function () {
    var abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", out = "";
    var buf = null;
    try { buf = new Uint32Array(20); (window.crypto || window.msCrypto).getRandomValues(buf); } catch (e) { buf = null; }
    for (var i = 0; i < 20; i++) out += abc[(buf ? buf[i] : Math.floor(Math.random() * 4294967296)) % abc.length];
    return out;
  };
  JC.parseInviteCode = function (text) {
    text = String(text || "").trim();
    var m = text.match(/[?&](?:c|join)=([A-Za-z0-9]{12,32})/) || text.match(/join\/([A-Za-z0-9]{12,32})/);
    if (m) return m[1];
    return /^[A-Za-z0-9]{12,32}$/.test(text) ? text : "";
  };
  function isAdminOfCurrent() { var g = JC.currentGroup || {}; return (g.admins || []).indexOf(me()) >= 0; }
  JC.ensureInvite = function (reset) {
    var g = JC.currentGroup, gid = JC.currentChatId;
    if (!g || !gid || !JC.db) return Promise.reject(new Error("no-group"));
    if (!isAdminOfCurrent()) return Promise.reject(new Error("not-admin"));
    var old = g.inviteCode || "";
    if (old && !reset) return Promise.resolve(old);
    var code = JC.newInviteCode();
    var inv = JC.db.collection("groupInvites");
    return inv.doc(code).set({ groupId: gid, groupName: String(g.name || "Group").slice(0, 50), createdBy: me(), createdAt: fv().serverTimestamp() })
      .then(function () { return JC.db.collection("groups").doc(gid).update({ inviteCode: code }); })
      .then(function () {
        if (old) inv.doc(old).delete().catch(function () {});
        g.inviteCode = code;
        return code;
      });
  };
  JC.inviteText = function (code) {
    var g = JC.currentGroup || {};
    return "Join my group \"" + (g.name || "Group") + "\" on Jilan Chat: " + JC.INVITE_BASE + code;
  };
  JC.shareText = function (text) {
    if (bridge("shareText")) { try { window.Android.shareText(text); return "native"; } catch (e) {} }
    JC.openExternal("https://wa.me/?text=" + encodeURIComponent(text));
    return "whatsapp";
  };
  JC.copyText = function (text) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); toast("Link copied"); return true; } } catch (e) {}
    try {
      var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta); toast("Link copied"); return true;
    } catch (e) {}
    toast("Couldn't copy"); return false;
  };
  JC.openInviteSheet = function (reset) {
    if (!isAdminOfCurrent()) { toast("Only group admins can share the invite link."); return; }
    toast(reset ? "Making a new link..." : "Getting invite link...");
    JC.ensureInvite(!!reset).then(function (code) {
      var link = JC.INVITE_BASE + code;
      var html = '<div class="sheet-title">Group invite link</div><div class="sheet-sub invite-link">' + esc(link) + '</div>' +
        '<div class="sheet-sub">Anyone with this link can join this group. Share it only with family and friends.</div>' +
        item("share", "Share link") + item("copy", "Copy link") + item("reset", "Reset link", "danger");
      sheet(html, function (act) {
        if (act === "share") JC.shareText(JC.inviteText(code));
        else if (act === "copy") JC.copyText(link);
        else if (act === "reset") sheet('<div class="sheet-title">Reset the invite link? The old link will stop working.</div>' + item("yes", "Reset link", "danger"), function (a) { if (a === "yes") JC.openInviteSheet(true); });
      });
    }).catch(function (e) {
      if (e && e.message === "not-admin") toast("Only group admins can share the invite link.");
      else toast("Invite links will start working after the next server update. For now, add members by @username or Gmail.");
    });
  };
  // Join by code: read the invite (name only), confirm, then add myself.
  JC.joinWithCode = function (code) {
    code = JC.parseInviteCode(code);
    if (!code) { toast("This invite link is not valid."); return Promise.resolve(false); }
    if (!JC.db || !me()) { lsSet("jc_pendingJoin", code); toast("Sign in first. The group will open after you sign in."); return Promise.resolve(false); }
    return JC.db.collection("groupInvites").doc(code).get().then(function (snap) {
      if (!snap.exists) { toast("This invite link was reset or is not valid. Ask the admin for a new link."); return false; }
      var inv = snap.data() || {}, gid = inv.groupId;
      return JC.db.collection("groups").doc(gid).get().then(function (g) {
        if (g.exists && (g.data().members || []).indexOf(me()) >= 0) { JC.openGroupChat(gid); return true; }
        return askJoin(code, gid, inv.groupName);
      }, function () { return askJoin(code, gid, inv.groupName); });
    }).catch(function () { toast("Couldn't open the invite. Try again in a moment."); return false; });
  };
  function askJoin(code, gid, name) {
    return new Promise(function (resolve) {
      sheet('<div class="sheet-title">Join group "' + esc(name || "Group") + '"?</div><div class="sheet-sub">All members will see your name and messages in this group.</div>' + item("join", "Join group") + item("cancel", "Cancel"), function (act) {
        if (act !== "join") { resolve(false); return; }
        JC.db.collection("groups").doc(gid).update({ members: fv().arrayUnion(me()), joinCode: code }).then(function () {
          return JC.db.collection("userChats").doc(me()).collection("list").doc(gid).set({
            chatId: gid, groupId: gid, type: "group", otherUid: "", unreadCount: 0, lastMessageAt: fv().serverTimestamp()
          }, { merge: true });
        }).then(function () {
          toast("You joined the group");
          JC.openGroupChat(gid);
          resolve(true);
        }).catch(function () { toast("Couldn't join. The link may have been reset."); resolve(false); });
      });
    });
  }
  // Deep link from the vc9 shell (jilanchat://join?c=CODE) or ?join= in the URL.
  window.__jcJoinLink = function (code) {
    code = JC.parseInviteCode(code); if (!code) return;
    if (JC.db && me()) JC.joinWithCode(code); else lsSet("jc_pendingJoin", code);
  };
  function checkPendingJoin() {
    var c = lsGet("jc_pendingJoin", "");
    if (c && JC.db && me()) { lsSet("jc_pendingJoin", ""); JC.joinWithCode(c); return true; }
    return false;
  }

  // =====================================================================
  // 8. CHAT ⋮ MENU (1-to-1 + group) — labelled items
  // =====================================================================
  JC.chatMenuItems = function () {
    var g = JC.currentChatIsGroup, items = [];
    var muted = JC.isMuted && JC.isMuted(JC.currentChatId);
    if (g) {
      items.push(["groupinfo", "Group info"]);
      if (isAdminOfCurrent()) { items.push(["addmember", "Add member"]); items.push(["invite", "Invite link"]); }
    } else items.push(["contact", "View contact"]);
    items.push(["search", "Search"]);
    items.push(["starred", "Starred messages"]);
    items.push(["disappear", "Disappearing messages"]);
    items.push(["mute", muted ? "Unmute notifications" : "Mute notifications"]);
    if (g) items.push(["leave", "Leave group", "danger"]);
    else {
      var blocked = JC.currentChatOtherUid && JC.isBlocked && JC.isBlocked(JC.currentChatOtherUid);
      items.push(["block", blocked ? "Unblock contact" : "Block contact", "danger"]);
    }
    return items;
  };
  JC.openChatMenu = function () {
    var menu = $("chatMenu"); if (!menu) return;
    if (!menu.classList.contains("hidden")) { menu.classList.add("hidden"); return; }
    menu.innerHTML = JC.chatMenuItems().map(function (it) {
      return '<button type="button" class="cm-item' + (it[2] ? " " + it[2] : "") + '" data-cm="' + it[0] + '">' + esc(it[1]) + "</button>";
    }).join("");
    menu.onclick = function (e) {
      e.stopPropagation();
      var t = e.target;
      while (t && t !== menu && !(t.getAttribute && t.getAttribute("data-cm"))) t = t.parentNode;
      if (!t || t === menu) return;
      menu.classList.add("hidden");
      JC.runChatMenuAction(t.getAttribute("data-cm"));
    };
    menu.classList.remove("hidden");
  };
  JC.runChatMenuAction = function (act) {
    var id = JC.currentChatId;
    if (act === "contact" && JC.openContactProfile) JC.openContactProfile();
    else if (act === "groupinfo" && JC.openGroupInfo) JC.openGroupInfo();
    else if (act === "addmember" && JC.openGroupInfo) {
      JC.openGroupInfo();
      setTimeout(function () { var i = $("groupAddInput"); if (i) { try { i.scrollIntoView({ block: "center" }); i.focus(); } catch (e) {} } }, 200);
    }
    else if (act === "invite") JC.openInviteSheet(false);
    else if (act === "search") JC.openChatSearch();
    else if (act === "starred") JC.openStarredScreen(id);
    else if (act === "disappear") {
      if (JC.currentChatIsGroup && !isAdminOfCurrent()) { toast("Only group admins can change disappearing messages. Now: " + JC.disappearLabel(+JC.currentDisappearSec || 0) + "."); return; }
      JC.openDisappearSheet();
    }
    else if (act === "mute" && JC.toggleMute) { var on = !JC.isMuted(id); JC.toggleMute(id); toast(on ? "Chat muted" : "Chat unmuted"); }
    else if (act === "leave") sheet('<div class="sheet-title">Leave this group?</div>' + item("yes", "Leave group", "danger"), function (a) { if (a === "yes" && JC.leaveGroup) JC.leaveGroup(); });
    else if (act === "block") {
      var uid = JC.currentChatOtherUid; if (!uid) return;
      if (JC.isBlocked(uid)) JC.unblockUser(uid); else JC.blockUser(uid);
    }
  };

  // ---- long-press sheet: Star / Unstar ----
  JC.extraMessageItems = function (msgId, m, mk) {
    if (m && m.system) return "";
    var mk2 = mk || item, out = "";
    if ((m.type === "image" || m.type === "voice") && !m.viewOnce && typeof m.mediaData === "string" && m.mediaData.indexOf("data:") === 0) out += mk2("save", "Save to gallery");
    return out + mk2("star", JC.isStarred(JC.currentChatId, msgId) ? "Unstar" : "Star");
  };
  JC.onExtraMessageAction = function (act, msgId, m) {
    if (act === "star") { JC.toggleStar(msgId, m); return true; }
    if (act === "save") { JC.saveToGallery(m.mediaData, false); return true; }
    return false;
  };

  // =====================================================================
  // 9. APP LOCK — PIN (hashed, per phone) + fingerprint (vc9 shell)
  // =====================================================================
  var LOCK_KEY = "jc_applock";
  JC.getLock = function () { var l = lsGet(LOCK_KEY, null); return l && l.hash ? l : null; };
  JC.lockEnabled = function () { return !!JC.getLock(); };
  JC.biometricAvailable = function () {
    if (!bridge("biometricAvailable")) return false;
    try { return !!window.Android.biometricAvailable(); } catch (e) { return false; }
  };
  JC.validPin = function (p) { return /^[0-9]{4,6}$/.test(String(p || "")); };
  JC.hashPin = function (pin, salt) { return JC.sha256("jilanchat:" + salt + ":" + pin); };
  JC.setPin = function (pin) {
    if (!JC.validPin(pin)) return false;
    var salt = JC.newInviteCode().slice(0, 16);
    var old = JC.getLock() || {};
    lsSet(LOCK_KEY, { hash: JC.hashPin(pin, salt), salt: salt, fp: !!old.fp, after: old.after == null ? 60 : old.after, fails: 0, until: 0 });
    return true;
  };
  JC.checkPin = function (pin) {
    var l = JC.getLock(); if (!l) return true;
    if (l.until && Date.now() < l.until) return false;
    var ok = JC.hashPin(String(pin || ""), l.salt) === l.hash;
    l.fails = ok ? 0 : (l.fails || 0) + 1;
    if (l.fails >= 5) { l.until = Date.now() + 30000; l.fails = 0; }
    lsSet(LOCK_KEY, l);
    return ok;
  };
  JC.setLockOption = function (key, val) { var l = JC.getLock(); if (!l) return; l[key] = val; lsSet(LOCK_KEY, l); renderSettingsExtras(); };
  JC.disableLock = function () { try { localStorage.removeItem(LOCK_KEY); } catch (e) {} JC.unlockApp(); renderSettingsExtras(); };
  var locked = false, hiddenAt = 0, suppressUntil = 0;
  JC.isLocked = function () { return locked; };
  function showLockUi() {
    var ov = $("lockScreen"); if (!ov) return;
    var inCall = $("screen-call") && $("screen-call").classList.contains("active");
    ov.classList.toggle("hidden", !locked || inCall);
    var fpBtn = $("btnLockFinger");
    var l = JC.getLock() || {};
    if (fpBtn) fpBtn.classList.toggle("hidden", !(l.fp && JC.biometricAvailable()));
    var pin = $("lockPinInput"); if (pin && locked && !inCall) pin.value = "";
  }
  JC.lockApp = function () {
    if (!JC.lockEnabled()) return;
    locked = true; showLockUi();
    var l = JC.getLock();
    if (l && l.fp && JC.biometricAvailable()) setTimeout(JC.tryFingerprint, 300);
  };
  JC.unlockApp = function () { locked = false; showLockUi(); var e = $("lockError"); if (e) e.textContent = ""; };
  JC.tryFingerprint = function () {
    if (!locked || !JC.biometricAvailable()) return;
    try { window.Android.biometricAuth("Unlock Jilan Chat"); } catch (e) {}
  };
  window.__jcBiometricResult = function (ok, msg) {
    if (ok) { JC.unlockApp(); return; }
    var e = $("lockError"); if (e && msg) e.textContent = String(msg).slice(0, 120);
  };
  JC.submitPin = function () {
    var inp = $("lockPinInput"), err = $("lockError");
    var l = JC.getLock() || {};
    if (l.until && Date.now() < l.until) { if (err) err.textContent = "Too many tries. Wait 30 seconds."; return false; }
    if (JC.checkPin(inp ? inp.value : "")) { JC.unlockApp(); return true; }
    if (inp) inp.value = "";
    var l2 = JC.getLock() || {};
    if (err) err.textContent = l2.until && Date.now() < l2.until ? "Too many tries. Wait 30 seconds." : "Wrong PIN. Try again.";
    return false;
  };
  JC.noteHidden = function () { hiddenAt = Date.now(); };
  JC.noteVisible = function () {
    if (!JC.lockEnabled() || locked || !hiddenAt) return;
    var away = Date.now() - hiddenAt; hiddenAt = 0;
    if (Date.now() < suppressUntil) return;
    var l = JC.getLock() || {};
    var after = (+l.after || 0) * 1000;
    if (away >= Math.max(after, 1500)) JC.lockApp();
  };
  JC.suppressLockFor = function (ms) { suppressUntil = Date.now() + ms; };

  // ---- settings UI (App lock + Privacy) ----
  function renderSettingsExtras() {
    var box = $("settingsExtras"); if (!box) return;
    var l = JC.getLock(), p = JC.getPrivacy(), fpOk = JC.biometricAvailable();
    var afterOpts = [[0, "Immediately"], [60, "After 1 minute"], [1800, "After 30 minutes"]];
    var html = '<h2>App lock</h2>';
    if (!l) html += '<p class="settings-note">Lock Jilan Chat with a PIN' + (fpOk ? " or fingerprint" : "") + '. The PIN is saved on this phone only.</p><button type="button" class="btn btn-primary" data-set="pin">Turn on app lock</button>';
    else {
      html += '<p class="settings-note">App lock is ON.</p><div class="opt-row wrap">' + afterOpts.map(function (o) {
        return '<button type="button" class="opt-btn' + ((+l.after || 0) === o[0] ? " on" : "") + '" data-after="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + "</div>";
      if (fpOk) html += '<label class="tog-row"><span>Unlock with fingerprint</span><input type="checkbox" data-tog="fp"' + (l.fp ? " checked" : "") + "></label>";
      else if (window.Android) html += '<p class="settings-note">Fingerprint unlock needs the latest app update and a fingerprint saved on this phone.</p>';
      html += '<div class="opt-row"><button type="button" class="opt-btn" data-set="pin">Change PIN</button><button type="button" class="opt-btn danger" data-set="off">Turn off</button></div>';
    }
    html += '<div id="pinSetBox" class="hidden"><input class="text-input" type="password" inputmode="numeric" maxlength="6" id="pinNew1" placeholder="New PIN (4 to 6 digits)"><input class="text-input" type="password" inputmode="numeric" maxlength="6" id="pinNew2" placeholder="Type the PIN again"><button type="button" class="btn btn-primary" data-set="savepin">Save PIN</button><p class="settings-note" id="pinSetMsg"></p></div>';
    var au = JC.getAutoSave();
    html += '<h2 style="margin-top:20px;">Media</h2><label class="tog-row"><span>Save incoming photos to gallery</span><input type="checkbox" data-tog="autosave"' + (au.on ? " checked" : "") + '></label>' +
      '<p class="settings-note">New photos you receive are saved to Pictures/Jilan Chat on this phone.' + (bridge("saveToGallery") ? "" : " Needs the latest app update.") + '</p>';
    html += '<h2 style="margin-top:20px;">Privacy</h2>' +
      '<label class="tog-row"><span>Hide my last seen and online</span><input type="checkbox" data-tog="hideLastSeen"' + (p.hideLastSeen ? " checked" : "") + "></label>" +
      '<label class="tog-row"><span>Hide read receipts (blue ticks)</span><input type="checkbox" data-tog="hideReceipts"' + (p.hideReceipts ? " checked" : "") + "></label>" +
      '<p class="settings-note">If you hide your last seen, you can\'t see other people\'s last seen. If you turn off read receipts, you won\'t send or see blue ticks, and your status views are not shown to others.</p>';
    box.innerHTML = html;
  }
  JC.renderSettingsExtras = renderSettingsExtras;
  function wireSettings() {
    var box = $("settingsExtras"); if (!box) return;
    box.addEventListener("click", function (e) {
      var t = e.target;
      while (t && t !== box && !(t.getAttribute && (t.getAttribute("data-set") || t.getAttribute("data-after") != null))) t = t.parentNode;
      if (!t || t === box) return;
      var a = t.getAttribute("data-after");
      if (a != null && t.getAttribute("data-set") == null) { JC.setLockOption("after", +a); return; }
      var s = t.getAttribute("data-set");
      if (s === "pin") { var b = $("pinSetBox"); if (b) b.classList.remove("hidden"); var p1 = $("pinNew1"); if (p1) try { p1.focus(); } catch (er) {} }
      else if (s === "off") sheet('<div class="sheet-title">Turn off app lock?</div>' + item("yes", "Turn off", "danger"), function (x) { if (x === "yes") JC.disableLock(); });
      else if (s === "savepin") {
        var v1 = ($("pinNew1") || {}).value, v2 = ($("pinNew2") || {}).value, msg = $("pinSetMsg");
        if (!JC.validPin(v1)) { if (msg) msg.textContent = "PIN must be 4 to 6 digits."; return; }
        if (v1 !== v2) { if (msg) msg.textContent = "The two PINs don't match."; return; }
        JC.setPin(v1); toast("App lock is on"); renderSettingsExtras();
      }
    });
    box.addEventListener("change", function (e) {
      var t = e.target, k = t && t.getAttribute && t.getAttribute("data-tog");
      if (!k) return;
      if (k === "fp") JC.setLockOption("fp", !!t.checked);
      else if (k === "autosave") JC.setAutoSave(!!t.checked);
      else JC.setPrivacy(k, !!t.checked);
    });
  }


  // =====================================================================
  // 11. SAVE TO GALLERY (vc9 shell: Android.saveToGallery) + auto-save
  // =====================================================================
  JC.galleryName = function (mime, base) {
    var ext = /png/.test(mime) ? "png" : /jpe?g/.test(mime) ? "jpg" : /webm/.test(mime) ? "webm" : /ogg/.test(mime) ? "ogg" : /mp4|aac|m4a/.test(mime) ? "m4a" : /^image/.test(mime) ? "jpg" : "dat";
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return (base || "JilanChat") + "-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + "-" + Math.floor(Math.random() * 1000) + "." + ext;
  };
  JC.saveToGallery = function (dataUrl, quiet) {
    var m = /^data:([a-z]+\/[a-z0-9.+-]+)(?:;[^,]*)?;base64,(.+)$/i.exec(String(dataUrl || ""));
    if (!m) { if (!quiet) toast("This photo can't be saved."); return false; }
    if (!bridge("saveToGallery")) { if (!quiet) toast("Update the app to save photos."); return false; }
    var mime = m[1].toLowerCase();
    var res = "";
    try { res = String(window.Android.saveToGallery(m[2], mime, JC.galleryName(mime, /^audio/.test(mime) ? "JilanChat-Voice" : "JilanChat"))); } catch (e) { res = "error"; }
    if (res === "ok") { if (!quiet) toast("Saved to gallery"); return true; }
    if (res === "permission") { if (!quiet) toast("Allow storage permission, then try again."); return false; }
    if (!quiet) toast("Couldn't save. Try again.");
    return false;
  };
  var AUTO_KEY = "jc_autosave";
  JC.getAutoSave = function () {
    var a = lsGet(AUTO_KEY, null);
    if (!a) { a = { on: true, since: Date.now() }; lsSet(AUTO_KEY, a); }
    return a;
  };
  JC.setAutoSave = function (on) { var a = JC.getAutoSave(); a.on = !!on; if (on) a.since = Date.now(); lsSet(AUTO_KEY, a); renderSettingsExtras(); };
  function savedKey() { return "jc_saved_" + (me() || "x"); }
  JC.maybeAutoSave = function (msgId, m) {
    if (!m || m.type !== "image" || m.deleted || m.viewOnce || m.senderId === me()) return false;
    if (typeof m.mediaData !== "string" || m.mediaData.indexOf("data:image/") !== 0) return false;
    var a = JC.getAutoSave(); if (!a.on) return false;
    if (tsMs(m.createdAt) < (a.since || 0)) return false;   // only photos that arrive after it was turned on
    if (!bridge("saveToGallery")) return false;
    var key = JC.currentChatId + "/" + msgId, list = lsGet(savedKey(), []);
    if (!Array.isArray(list)) list = [];
    if (list.indexOf(key) >= 0) return false;
    list.push(key); if (list.length > 3000) list = list.slice(list.length - 3000);
    lsSet(savedKey(), list);
    return JC.saveToGallery(m.mediaData, true);
  };

  // =====================================================================
  // 10. Hooks into existing modules
  // =====================================================================
  function wrapHooks() {
    var origOpen = JC.onChatOpened, origClose = JC.onChatClosed, origDecor = JC.decorateMessage;
    if (origOpen && !origOpen._v48) {
      JC.onChatOpened = function (chatId, otherUid, isGroup) {
        var r = origOpen.apply(this, arguments);
        JC.closeChatSearch();
        sysRendered = {};
        Object.keys(expiryTimers).forEach(function (k) { clearTimeout(expiryTimers[k]); });
        expiryTimers = {};
        JC.currentDisappearSec = 0;
        var n = $("e2eNotice"); if (n) n.removeAttribute("data-base");
        if (chatDocUnsub) { chatDocUnsub(); chatDocUnsub = null; }
        if (isGroup) { if (JC.currentGroup) { JC.currentDisappearSec = +JC.currentGroup.disappearSec || 0; } setTimeout(setNotice, 50); }
        else if (JC.db) {
          chatDocUnsub = JC.db.collection("chats").doc(chatId).onSnapshot(function (s) {
            JC.currentDisappearSec = (s.exists && +s.data().disappearSec) || 0;
            setNotice();
          }, function () {});
        }
        return r;
      };
      JC.onChatOpened._v48 = true;
    }
    if (origClose && !origClose._v48) {
      JC.onChatClosed = function () {
        var r = origClose.apply(this, arguments);
        JC.closeChatSearch();
        if (chatDocUnsub) { chatDocUnsub(); chatDocUnsub = null; }
        Object.keys(expiryTimers).forEach(function (k) { clearTimeout(expiryTimers[k]); });
        expiryTimers = {}; sysRendered = {};
        JC.currentDisappearSec = 0;
        return r;
      };
      JC.onChatClosed._v48 = true;
    }
    if (origDecor && !origDecor._v48) {
      JC.decorateMessage = function (div, msgId, m, isGroup) {
        var r = origDecor.apply(this, arguments);
        if (JC.isStarred(JC.currentChatId, msgId)) div.classList.add("starred");
        if (m && m.ttlSec) { div.classList.add("disappearing"); scheduleExpiry(div, msgId, m, isGroup); }
        try { JC.maybeAutoSave(msgId, m); } catch (e) {}
        return r;
      };
      JC.decorateMessage._v48 = true;
    }
  }
  JC.onGroupDocUpdated = function (gid, g) {
    if (JC.currentChatId !== gid) return;
    JC.currentDisappearSec = +(g && g.disappearSec) || 0;
    setNotice();
  };
  // Show/hide the lock while a call screen is up (calls stay answerable).
  function wrapShowScreen() {
    var orig = JC.showScreen; if (!orig || orig._v48) return;
    JC.showScreen = function () { var r = orig.apply(this, arguments); if (locked) showLockUi(); return r; };
    JC.showScreen._v48 = true;
  }
  function wrapSignedIn() {
    var orig = JC.onSignedIn; if (!orig || orig._v48) return;
    JC.onSignedIn = function () { var r = orig.apply(this, arguments); setTimeout(checkPendingJoin, 1500); return r; };
    JC.onSignedIn._v48 = true;
  }
  JC.wireV48 = function () {
    wrapHooks(); wrapSignedIn(); wrapShowScreen(); wireSettings(); renderSettingsExtras();
    var sb = $("btnSettings"); if (sb) sb.addEventListener("click", renderSettingsExtras);
    var f = $("chatSearchField");
    if (f) f.addEventListener("input", function () { JC.runChatSearch(f.value); });
    var up = $("btnSearchUp"); if (up) up.addEventListener("click", function (e) { e.stopPropagation(); JC.chatSearchStep(-1); });
    var dn = $("btnSearchDown"); if (dn) dn.addEventListener("click", function (e) { e.stopPropagation(); JC.chatSearchStep(1); });
    var cl = $("btnSearchClose"); if (cl) cl.addEventListener("click", function (e) { e.stopPropagation(); JC.closeChatSearch(); });
    var sbk = $("btnStarredBack"); if (sbk) sbk.addEventListener("click", function () { JC.goBack(); });
    var jb = $("btnJoinBack"); if (jb) jb.addEventListener("click", function () { JC.goBack(); });
    var jg = $("btnJoinGo"); if (jg) jg.addEventListener("click", function () { JC.joinWithCode(($("joinInput") || {}).value); });
    var gi = $("btnGroupInvite"); if (gi) gi.addEventListener("click", function () { JC.openInviteSheet(false); });
    var vs = $("viewerSave");
    if (vs) vs.addEventListener("click", function (e) { e.stopPropagation(); var im = $("viewerImg"); JC.saveToGallery(im && im.src, false); });
    var ss = $("statusViewerSave");
    if (ss) ss.addEventListener("click", function (e) {
      e.stopPropagation();
      var body = $("statusViewerBody"), im = body && body.querySelector && body.querySelector("img");
      if (!im || !im.src) { toast("Only photo status can be saved."); return; }
      JC.saveToGallery(im.src, false);
    });
    var msgs = $("messages");
    if (msgs) msgs.addEventListener("click", function (e) {
      var t = e.target;
      while (t && t !== msgs && !(t.classList && t.classList.contains("loc-open"))) t = t.parentNode;
      if (!t || t === msgs) return;
      e.stopPropagation();
      JC.openExternal(JC.mapsUrl(t.getAttribute("data-lat"), t.getAttribute("data-lng")));
    });
    // App lock: overlay + triggers.
    var ub = $("btnLockUnlock"); if (ub) ub.addEventListener("click", JC.submitPin);
    var pi = $("lockPinInput"); if (pi) pi.addEventListener("keydown", function (e) { if (e.key === "Enter") JC.submitPin(); });
    var fb = $("btnLockFinger"); if (fb) fb.addEventListener("click", JC.tryFingerprint);
    document.addEventListener("visibilitychange", function () { if (document.hidden) JC.noteHidden(); else JC.noteVisible(); });
    // Our own file pickers / camera leave the page briefly — don't lock for that.
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.tagName === "INPUT" && String(t.type).toLowerCase() === "file") JC.suppressLockFor(120000);
    }, true);
    if (JC.lockEnabled()) JC.lockApp();
    // Invite from URL (?join=CODE) or pending from before sign-in.
    try {
      var q = (location.search || "").match(/[?&]join=([A-Za-z0-9]{12,32})/);
      if (q) { lsSet("jc_pendingJoin", q[1]); try { history.replaceState(history.state, "", location.pathname); } catch (e) {} }
    } catch (e) {}
    var tries = 0;
    var t = setInterval(function () { if (checkPendingJoin() || ++tries > 120) clearInterval(t); }, 1000);
  };
  document.addEventListener("DOMContentLoaded", function () { JC.wireV48(); });
})();
