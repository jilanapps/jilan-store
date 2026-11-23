// Jilan Chat v4.8 part 4 — features4.js
// Small documents (<= 200 KB, base64 inside the message), live location
// (15 min / 1 hour / 8 hours) and one-way Channels. Spark only.
(function () {
  var JC = window.JC = window.JC || {};
  var BASE = "https://jilanapps.github.io/jilan-store/jilan-chat/";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function me() { return JC.currentUser && JC.currentUser.uid; }
  function toast(t) { if (JC.toast) JC.toast(t); }
  function bridge(n) { try { return window.Android && typeof window.Android[n] === "function"; } catch (e) { return false; } }
  function FV() { return firebase.firestore.FieldValue; }
  function item(a, l, c) { return JC.sheetItem ? JC.sheetItem(a, l, c) : '<button type="button" class="sheet-item" data-act="' + a + '">' + esc(l) + "</button>"; }
  function tsMs(ts) { if (!ts) return null; if (typeof ts.toMillis === "function") return ts.toMillis(); if (typeof ts.seconds === "number") return ts.seconds * 1000; if (typeof ts === "number") return ts; return null; }
  function fmtTime(ms) { var d = new Date(ms), h = d.getHours(), ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; var mm = d.getMinutes(); return h + ":" + (mm < 10 ? "0" : "") + mm + " " + ap; }

  // =====================================================================
  // 1. Small documents
  // =====================================================================
  JC.DOC_MAX_BYTES = 200 * 1024;
  JC.fmtSize = function (n) { n = +n || 0; return n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB" : (n / 1048576).toFixed(1) + " MB"; };
  JC.docCheck = function (f) {
    if (!f) return "No file chosen.";
    if (f.size > JC.DOC_MAX_BYTES) return "This file is " + JC.fmtSize(f.size) + ". Documents up to 200 KB can be sent for free. Bigger files need paid storage.";
    if (/^(image|video|audio)\//.test(f.type || "")) return "Use Photo or Voice for this. Document is for PDF, Word, text and similar files.";
    return "";
  };
  JC.safeDocName = function (n) { n = String(n || "document").replace(/[\\/:*?"<>|]+/g, "_").trim(); return n.slice(-100) || "document"; };
  JC.pickDocument = function () {
    var inp = $("docInput");
    if (!inp) {
      inp = document.createElement("input"); inp.type = "file"; inp.id = "docInput"; inp.className = "hidden";
      inp.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.zip,.apk,application/*,text/*";
      document.body.appendChild(inp);
      inp.addEventListener("change", function () { var f = inp.files && inp.files[0]; inp.value = ""; if (f) JC.sendDocument(f); });
    }
    if (JC.suppressLockFor) JC.suppressLockFor(120000);
    inp.click();
  };
  JC.sendDocument = function (f) {
    var err = JC.docCheck(f); if (err) { toast(err); return Promise.resolve(false); }
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () {
        var data = String(r.result || "");
        if (data.indexOf("data:") !== 0) { toast("Couldn't read this file."); resolve(false); return; }
        if (data.length > 300000) { toast("This file is too big. Documents up to 200 KB can be sent."); resolve(false); return; }
        var mime = (f.type || "application/octet-stream").slice(0, 40);
        data = "data:" + mime + ";base64," + data.slice(data.indexOf(",") + 1);
        toast("Sending document...");
        JC.sendCurrentMessage({ type: "file", text: "", mediaData: data, mediaMime: mime, mediaName: JC.safeDocName(f.name), mediaSize: f.size })
          .then(function () { resolve(true); })
          .catch(function () { toast("Document not sent. This needs the latest server update."); resolve(false); });
      };
      r.onerror = function () { toast("Couldn't read this file."); resolve(false); };
      r.readAsDataURL(f);
    });
  };
  JC.docHtml = function (m) {
    var has = typeof m.mediaData === "string" && m.mediaData.indexOf("data:") === 0;
    var ext = (/\.([a-z0-9]{1,5})$/i.exec(m.mediaName || "") || [0, "file"])[1].toUpperCase();
    return '<div class="doc-card"><div class="doc-ico">' + esc(ext) + '</div><div class="doc-info"><div class="doc-name">' + esc(m.mediaName || "Document") + '</div><div class="doc-size">' + (m.mediaSize ? JC.fmtSize(m.mediaSize) + " · " : "") + esc(ext) + "</div></div></div>" +
      (has ? '<div class="doc-btns"><button type="button" class="doc-btn" data-doc="open">Open</button><button type="button" class="doc-btn" data-doc="save">Save</button></div>' : '<div class="media-gone">Document not available</div>');
  };
  JC.docAction = function (act, m) {
    var mm = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/.exec(m.mediaData || ""); if (!mm) { toast("Document not available."); return; }
    var name = JC.safeDocName(m.mediaName);
    if (act === "open" && bridge("shareFile")) {
      var r1 = ""; try { r1 = String(window.Android.shareFile(mm[2], mm[1], name)); } catch (e) { r1 = "error"; }
      if (r1 !== "ok") toast("Couldn't open. Try Save instead.");
      return;
    }
    if (bridge("saveToGallery")) {
      var r = ""; try { r = String(window.Android.saveToGallery(mm[2], mm[1], name)); } catch (e) { r = "error"; }
      toast(r === "ok" ? "Saved to Download/Jilan Chat" : r === "permission" ? "Allow storage permission, then try again." : "Couldn't save. Try again.");
      return;
    }
    try {
      var bin = atob(mm[2]), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([arr], { type: mm[1] })); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1500);
    } catch (e) { toast("Couldn't save."); }
  };

  // =====================================================================
  // 2. Live location
  // =====================================================================
  JC.LIVE_OPTS = [[900, "15 minutes"], [3600, "1 hour"], [28800, "8 hours"]];
  JC.liveActive = function (m, now) { var L = m && m.location; return !!(L && typeof L.liveUntil === "number" && L.liveUntil > (now || Date.now())); };
  var liveJobs = {}; // msgPath -> { until, timer }
  JC.startLiveLocation = function (sec) {
    if (!navigator.geolocation) { toast("Location is not available on this phone."); return; }
    if (window.Android && !bridge("isLocationSupported")) { toast("Please update Jilan Chat to share location."); return; }
    sec = +sec; if (!JC.LIVE_OPTS.some(function (o) { return o[0] === sec; })) return;
    toast("Getting your location...");
    navigator.geolocation.getCurrentPosition(function (pos) {
      var c = pos.coords, until = Date.now() + sec * 1000;
      var L = { lat: +c.latitude.toFixed(6), lng: +c.longitude.toFixed(6), acc: Math.round(c.accuracy || 0), liveUntil: until };
      var isG = !!JC.currentChatIsGroup, cid = JC.currentChatId;
      JC.sendCurrentMessage({ type: "text", text: "Live location: " + JC.mapsUrl(L.lat, L.lng), location: L }).then(function () {
        toast("Sharing live location until " + fmtTime(until));
        // sendMessage does not return the doc id: find our message when it renders.
        var n = 0, t = setInterval(function () {
          var all = JC.allMsgData ? JC.allMsgData() : {}, id = null;
          Object.keys(all).forEach(function (k) { var m = all[k] && all[k].m; if (m && m.senderId === me() && m.location && m.location.liveUntil === until) id = k; });
          if (id) { clearInterval(t); JC.trackLive(isG, cid, id, until); }
          else if (++n > 40) clearInterval(t);
        }, 500);
      }).catch(function () { toast("Location not sent."); });
    }, function (err) {
      toast(err && err.code === 1 ? "Location permission is off. Allow location for Jilan Chat, then try again." : "Couldn't get your location. Turn on GPS and try again.");
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
  };
  function liveRef(isG, cid, id) { return JC.db.collection(isG ? "groups" : "chats").doc(cid).collection("messages").doc(id); }
  JC.trackLive = function (isG, cid, id, until) {
    var key = (isG ? "g/" : "c/") + cid + "/" + id;
    if (liveJobs[key]) return;
    function tick() {
      if (Date.now() >= until) { stop(); return; }
      if (document.hidden) return;
      navigator.geolocation.getCurrentPosition(function (pos) {
        var c = pos.coords;
        liveRef(isG, cid, id).update({ location: { lat: +c.latitude.toFixed(6), lng: +c.longitude.toFixed(6), acc: Math.round(c.accuracy || 0), liveUntil: until } }).catch(function () {});
      }, function () {}, { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 });
    }
    function stop() { if (liveJobs[key]) { clearInterval(liveJobs[key].timer); delete liveJobs[key]; } saveJobs(); }
    liveJobs[key] = { isG: isG, cid: cid, id: id, until: until, timer: setInterval(tick, 30000), stop: stop };
    saveJobs();
  };
  function saveJobs() {
    var out = Object.keys(liveJobs).map(function (k) { var j = liveJobs[k]; return { isG: j.isG, cid: j.cid, id: j.id, until: j.until }; });
    try { localStorage.setItem("jc_live_" + (me() || "x"), JSON.stringify(out)); } catch (e) {}
  }
  function resumeJobs() {
    var a = []; try { a = JSON.parse(localStorage.getItem("jc_live_" + (me() || "x")) || "[]"); } catch (e) {}
    (a || []).forEach(function (j) { if (j && j.until > Date.now()) JC.trackLive(j.isG, j.cid, j.id, j.until); });
  }
  JC.stopLiveLocation = function (msgId, m, isG) {
    var key = (isG ? "g/" : "c/") + JC.currentChatId + "/" + msgId;
    if (liveJobs[key]) liveJobs[key].stop();
    var L = m.location || {};
    liveRef(isG, JC.currentChatId, msgId).update({ location: { lat: L.lat, lng: L.lng, acc: L.acc || 0, liveUntil: Date.now() } })
      .then(function () { toast("Live location stopped"); }).catch(function () { toast("Couldn't stop. Try again."); });
  };
  JC.liveBadgeHtml = function (m) {
    var L = m.location || {};
    if (typeof L.liveUntil !== "number") return "";
    if (L.liveUntil > Date.now()) return '<div class="live-badge on"><span class="live-dot"></span>Live until ' + esc(fmtTime(L.liveUntil)) + "</div>" + (m.senderId === me() ? '<button type="button" class="live-stop" data-live-stop="1">Stop sharing</button>' : "");
    return '<div class="live-badge">Live location ended</div>';
  };
  function decorateLive(div, m) {
    if (!div || !m || !m.location || typeof m.location.liveUntil !== "number") return;
    var old = div.querySelector(".live-wrap"); if (old) old.parentNode.removeChild(old);
    var w = document.createElement("div"); w.className = "live-wrap"; w.innerHTML = JC.liveBadgeHtml(m);
    var meta = div.querySelector(".meta"); div.insertBefore(w, meta || null);
    var c = div.querySelector(".loc-coords"); if (c) c.textContent = (+m.location.lat).toFixed(5) + ", " + (+m.location.lng).toFixed(5);
    var o = div.querySelector(".loc-open"); if (o) { o.setAttribute("data-lat", m.location.lat); o.setAttribute("data-lng", m.location.lng); }
    var t = div.querySelector(".loc-title"); if (t) t.textContent = "Live location";
  }

  // =====================================================================
  // 3. Hooks into rendering + attach sheet
  // =====================================================================
  function wrapRender() {
    var mb = JC.mediaBodyHtml;
    JC.mediaBodyHtml = function (m) { if (m && m.type === "file" && !m.deleted && typeof m.mediaData === "string") return JC.docHtml(m); return mb.apply(this, arguments); };
    var dec = JC.decorateMessage;
    JC.decorateMessage = function (div, msgId, m) { var r = dec.apply(this, arguments); try { decorateLive(div, m); } catch (e) {} return r; };
    var rf = JC.refreshMessage;
    JC.refreshMessage = function (msgId, m) { var r = rf ? rf.apply(this, arguments) : undefined; try { var d = JC.getMsgData(msgId); if (d && d.el && m && !m.deleted) decorateLive(d.el, m); } catch (e) {} return r; };
    var box = $("messages");
    if (box) box.addEventListener("click", function (e) {
      var t = e.target, act = null, stop = false, el = null;
      while (t && t !== box) {
        if (t.getAttribute) { if (!act && t.getAttribute("data-doc")) act = t.getAttribute("data-doc"); if (t.getAttribute("data-live-stop")) stop = true; if (t.getAttribute("data-msg-id")) { el = t; break; } }
        t = t.parentNode;
      }
      if (!el || (!act && !stop)) return;
      e.stopPropagation();
      var d = JC.getMsgData(el.getAttribute("data-msg-id")); if (!d) return;
      if (act) JC.docAction(act, d.m); else JC.stopLiveLocation(el.getAttribute("data-msg-id"), d.m, d.isGroup);
    });
    // live badges expire on screen without a server change
    setInterval(function () {
      var all = JC.allMsgData ? JC.allMsgData() : {};
      Object.keys(all).forEach(function (k) { var d = all[k]; if (d && d.el && d.m && d.m.location && typeof d.m.location.liveUntil === "number") decorateLive(d.el, d.m); });
    }, 60000);
  }
  function wrapAttach() {
    var orig = JC.openAttachSheet;
    JC.openAttachSheet = function () {
      orig.apply(this, arguments);
      var sh = $("actionSheet"); if (!sh) return;
      var loc = sh.querySelector('[data-act="location"]');
      var extra = document.createElement("div");
      extra.innerHTML = item("document", "Document (up to 200 KB)") + item("live", "Live location");
      var parent = loc ? loc.parentNode : sh, ref = loc ? loc.nextSibling : null;
      while (extra.firstChild) parent.insertBefore(extra.firstChild, ref);
    };
    var origAct = JC.onSheetAction;
    // the sheet callback is fixed inside openSheet; catch our two items by delegation
    var sh = $("actionSheet");
    if (sh) sh.addEventListener("click", function (e) {
      var t = e.target; while (t && t !== sh && !(t.getAttribute && t.getAttribute("data-act"))) t = t.parentNode;
      if (!t || t === sh) return;
      var a = t.getAttribute("data-act");
      if (a === "document") { e.stopPropagation(); if (JC.closeActionSheet) JC.closeActionSheet(); JC.pickDocument(); }
      else if (a === "live") {
        e.stopPropagation(); if (JC.closeActionSheet) JC.closeActionSheet();
        setTimeout(function () {
          JC.openSheet('<div class="sheet-title">Share live location for</div>' + JC.LIVE_OPTS.map(function (o) { return item("lv" + o[0], o[1]); }).join("") + '<div class="sheet-sub">Your location updates about every 30 seconds while Jilan Chat is open.</div>', function (act) {
            if (act.indexOf("lv") === 0) JC.startLiveLocation(+act.slice(2));
          });
        }, 50);
      }
    }, true);
  }

  // =====================================================================
  // 4. Channels (one-way). channels/{id}: name, description, createdBy,
  //    followerCount, createdAt, lastPostAt. posts sub-collection.
  //    followers/{uid} sub-collection; userChannels/{uid}/list/{id}.
  // =====================================================================
  JC.newChannelId = function () {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", s = "", r = new Uint8Array(20);
    try { crypto.getRandomValues(r); } catch (e) { for (var i = 0; i < 20; i++) r[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < 20; j++) s += a.charAt(r[j] % a.length);
    return s;
  };
  JC.channelLink = function (id) { return BASE + "join.html?ch=" + id; };
  JC.parseChannelId = function (t) { var m = /(?:[?&]ch=|^jilanchat:\/\/channel\?id=)([A-Za-z0-9]{20})/.exec(String(t || "")); if (m) return m[1]; return /^[A-Za-z0-9]{20}$/.test(String(t || "").trim()) ? String(t).trim() : null; };
  function chRef(id) { return JC.db.collection("channels").doc(id); }
  function myChRef(id) { return JC.db.collection("userChannels").doc(me()).collection("list").doc(id); }
  var curCh = null, postsUnsub = null, chUnsub = null;
  JC.openChannels = function () {
    if (!JC.db || !me()) return;
    JC.modal('<div class="sheet-title">Channels</div><p class="settings-note">Channels are one-way. Only the owner posts. Anyone with the link can follow.</p><div class="pick-list" id="chList">' + (JC.skeletonRows ? JC.skeletonRows(3, "row") : '<p class="settings-note">Loading...</p>') + '</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="chClose">Close</button><button type="button" class="btn btn-ghost" id="chFollowLink">Follow with link</button><button type="button" class="btn btn-primary" id="chNew">New channel</button></div>', function (card, close) {
      card.querySelector("#chClose").onclick = close;
      card.querySelector("#chNew").onclick = function () { close(); JC.createChannelForm(); };
      card.querySelector("#chFollowLink").onclick = function () { close(); JC.followByLinkForm(); };
      JC.db.collection("userChannels").doc(me()).collection("list").get().then(function (snap) {
        var rows = [];
        snap.forEach(function (d) { var x = d.data() || {}; rows.push({ id: d.id, name: x.name || "Channel", role: x.role || "follower" }); });
        var box = card.querySelector("#chList");
        box.innerHTML = rows.length ? rows.map(function (r) { return '<button type="button" class="share-row" data-ch="' + esc(r.id) + '"><span class="pr-name">' + esc(r.name) + '</span><span class="pr-handle">' + (r.role === "owner" ? "Owner" : "Following") + "</span></button>"; }).join("") : '<p class="settings-note">You have no channels yet.</p>';
        box.onclick = function (e) { var t = e.target; while (t && t !== box && !(t.getAttribute && t.getAttribute("data-ch"))) t = t.parentNode; if (!t || t === box) return; close(); JC.openChannel(t.getAttribute("data-ch")); };
      }).catch(function () { card.querySelector("#chList").innerHTML = '<p class="settings-note">Channels need the latest server update. Try again later.</p>'; });
    });
  };
  JC.createChannelForm = function () {
    JC.modal('<div class="sheet-title">New channel</div><input class="text-input" id="chName" maxlength="50" placeholder="Channel name"><textarea class="text-input" id="chDesc" rows="2" maxlength="300" placeholder="Description (optional)"></textarea><div class="modal-actions"><button type="button" class="btn btn-ghost" id="chC">Cancel</button><button type="button" class="btn btn-primary" id="chS">Create</button></div>', function (card, close) {
      card.querySelector("#chC").onclick = close;
      card.querySelector("#chS").onclick = function () {
        var name = String(card.querySelector("#chName").value || "").trim().slice(0, 50), desc = String(card.querySelector("#chDesc").value || "").trim().slice(0, 300);
        if (!name) { toast("Write a channel name."); return; }
        var id = JC.newChannelId(), b = JC.db.batch();
        b.set(chRef(id), { name: name, description: desc, createdBy: me(), followerCount: 0, createdAt: FV().serverTimestamp() });
        b.set(myChRef(id), { name: name, role: "owner", at: FV().serverTimestamp() });
        b.commit().then(function () { close(); toast("Channel created"); JC.openChannel(id); }).catch(function () { toast("Channels need the latest server update. Try again later."); });
      };
    });
  };
  JC.followByLinkForm = function () {
    JC.modal('<div class="sheet-title">Follow a channel</div><input class="text-input" id="chLink" placeholder="Paste channel link"><div class="modal-actions"><button type="button" class="btn btn-ghost" id="flC">Cancel</button><button type="button" class="btn btn-primary" id="flS">Open</button></div>', function (card, close) {
      card.querySelector("#flC").onclick = close;
      card.querySelector("#flS").onclick = function () { var id = JC.parseChannelId(card.querySelector("#chLink").value); if (!id) { toast("This channel link is not valid."); return; } close(); JC.openChannel(id); };
    });
  };
  JC.followChannel = function (id, ch, follow) {
    var b = JC.db.batch(), fr = chRef(id).collection("followers").doc(me());
    if (follow) {
      b.set(fr, { uid: me(), at: FV().serverTimestamp() });
      b.update(chRef(id), { followerCount: FV().increment(1) });
      b.set(myChRef(id), { name: ch.name || "Channel", role: "follower", at: FV().serverTimestamp() });
    } else {
      b.delete(fr); b.update(chRef(id), { followerCount: FV().increment(-1) }); b.delete(myChRef(id));
    }
    return b.commit();
  };
  JC.postToChannel = function (id, data) {
    var post = { type: data.type === "image" ? "image" : "text", text: String(data.text || "").slice(0, 4000), createdAt: FV().serverTimestamp(), by: me() };
    if (post.type === "image") post.mediaData = data.mediaData;
    var b = JC.db.batch(), pr = chRef(id).collection("posts").doc();
    b.set(pr, post); b.update(chRef(id), { lastPostAt: FV().serverTimestamp() });
    return b.commit();
  };
  JC.openChannel = function (id) {
    if (!JC.db || !me()) { try { localStorage.setItem("jc_pendingChannel", id); } catch (e) {} return; }
    JC.closeChannel();
    var view = document.createElement("div"); view.id = "channelView"; view.className = "channel-view";
    view.innerHTML = '<div class="ch-head"><button type="button" class="icon-btn" id="chBack" aria-label="Back"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><div class="ch-title"><div class="ch-name" id="chTitle">Channel</div><div class="ch-sub" id="chSub"><span class="skel skel-line" style="width:96px"></span></div></div><button type="button" class="btn btn-small btn-primary" id="chFollow">Follow</button><button type="button" class="icon-btn" id="chShare" aria-label="Share link"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-5.91.7L8.04 9.81A2.99 2.99 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.16c-.05.21-.08.43-.08.65A2.92 2.92 0 1 0 18 16.08z"/></svg></button></div>' +
      '<div class="ch-desc" id="chDescView"></div><div class="ch-posts" id="chPosts"></div><div class="ch-composer hidden" id="chComposer"><button type="button" class="icon-btn" id="chPhoto" aria-label="Photo"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z"/></svg></button><input type="text" id="chInput" maxlength="4000" placeholder="Post to followers"><button type="button" class="icon-btn" id="chSend" aria-label="Post"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button><input type="file" id="chPhotoIn" class="hidden" accept="image/*"></div>';
    document.body.appendChild(view);
    curCh = { id: id, data: null, following: false };
    $("chBack").onclick = JC.closeChannel;
    $("chShare").onclick = function () {
      var t = "Follow my channel \"" + ((curCh.data && curCh.data.name) || "") + "\" on Jilan Chat: " + JC.channelLink(id);
      if (bridge("shareText")) { try { window.Android.shareText(t); } catch (e) {} } else if (JC.copyText) JC.copyText(JC.channelLink(id));
    };
    $("chFollow").onclick = function () {
      if (!curCh.data) return;
      var f = !curCh.following;
      JC.followChannel(id, curCh.data, f).then(function () { curCh.following = f; paintHead(); toast(f ? "Following" : "Unfollowed"); }).catch(function () { toast("Couldn't change. Try again."); });
    };
    $("chSend").onclick = function () {
      var t = String($("chInput").value || "").trim(); if (!t) return;
      JC.postToChannel(id, { type: "text", text: t }).then(function () { $("chInput").value = ""; }).catch(function () { toast("Not posted."); });
    };
    $("chPhoto").onclick = function () { if (JC.suppressLockFor) JC.suppressLockFor(120000); $("chPhotoIn").click(); };
    $("chPhotoIn").onchange = function () {
      var f = this.files && this.files[0]; this.value = ""; if (!f) return;
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var d = JC.photoDataUrlFromImage(img, 1280, 0.7); if (d && d.length > 300000) d = JC.photoDataUrlFromImage(img, 960, 0.6); if (d && d.length > 300000) d = JC.photoDataUrlFromImage(img, 720, 0.5);
        if (!d || d.length > 300000) { toast("Photo is too big."); return; }
        JC.postToChannel(id, { type: "image", mediaData: d, text: String($("chInput").value || "").trim() }).then(function () { $("chInput").value = ""; }).catch(function () { toast("Not posted."); });
      };
      img.src = url;
    };
    function paintHead() {
      var c = curCh.data || {}, owner = c.createdBy === me();
      $("chTitle").textContent = c.name || "Channel";
      $("chSub").textContent = (c.followerCount || 0) + " follower" + ((c.followerCount || 0) === 1 ? "" : "s");
      $("chDescView").textContent = c.description || "";
      $("chFollow").classList.toggle("hidden", owner);
      $("chFollow").textContent = curCh.following ? "Following" : "Follow";
      $("chComposer").classList.toggle("hidden", !owner);
    }
    chUnsub = chRef(id).onSnapshot(function (s) {
      if (!s.exists) { $("chSub").textContent = "This channel does not exist."; return; }
      curCh.data = s.data(); paintHead();
    }, function () { $("chSub").textContent = "Channels need the latest server update."; });
    chRef(id).collection("followers").doc(me()).get().then(function (s) { curCh.following = s.exists; paintHead(); }).catch(function () {});
    postsUnsub = chRef(id).collection("posts").orderBy("createdAt", "desc").limit(50).onSnapshot(function (snap) {
      var box = $("chPosts"); if (!box) return;
      var html = [];
      snap.forEach(function (d) {
        var p = d.data() || {}, t = tsMs(p.createdAt);
        html.push('<div class="ch-post">' + (p.type === "image" && p.mediaData ? '<img class="bubble-img" src="' + esc(p.mediaData) + '" alt="Photo">' : "") + (p.text ? '<div class="ch-text">' + (JC.linkifyHtml ? JC.linkifyHtml(p.text) : esc(p.text)) + "</div>" : "") + '<div class="meta">' + (t ? esc(JC.fmtFull ? JC.fmtFull(t) : new Date(t).toLocaleString()) : "Sending...") + "</div></div>");
      });
      box.innerHTML = html.length ? html.reverse().join("") : '<p class="settings-note" style="text-align:center">No posts yet.</p>';
      box.scrollTop = box.scrollHeight;
    }, function () {});
  };
  JC.closeChannel = function () {
    if (postsUnsub) { postsUnsub(); postsUnsub = null; } if (chUnsub) { chUnsub(); chUnsub = null; }
    var v = $("channelView"); if (v && v.parentNode) v.parentNode.removeChild(v); curCh = null;
  };

  function addMenu() {
    var mm = $("mainMenu"); if (!mm || mm.querySelector('[data-action="channels"]')) return;
    var after = mm.querySelector('[data-action="broadcast"]') || mm.querySelector('[data-action="starred"]');
    var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem"); b.setAttribute("data-action", "channels"); b.textContent = "Channels";
    mm.insertBefore(b, after ? after.nextSibling : null);
    mm.addEventListener("click", function (e) { var t = e.target; if (t && t.getAttribute && t.getAttribute("data-action") === "channels") { e.stopPropagation(); if (JC.closeMainMenu) JC.closeMainMenu(); JC.openChannels(); } }, true);
  }
  function wrapDeepLink() {
    var orig = window.__jcDeepLink;
    window.__jcDeepLink = function (uri) { var id = JC.parseChannelId(uri); if (id && /channel|ch=/.test(String(uri))) { JC.openChannel(id); return; } if (orig) orig.apply(this, arguments); };
  }
  JC.wireV48d = function () {
    wrapRender(); wrapAttach(); addMenu(); wrapDeepLink();
    try {
      var q = (location.search || "").match(/[?&]ch=([A-Za-z0-9]{20})/);
      if (q) { localStorage.setItem("jc_pendingChannel", q[1]); try { history.replaceState(history.state, "", location.pathname); } catch (e) {} }
    } catch (e) {}
    var n = 0, t = setInterval(function () {
      if (!JC.db || !me()) { if (++n > 180) clearInterval(t); return; }
      clearInterval(t); resumeJobs();
      var p = null; try { p = localStorage.getItem("jc_pendingChannel"); localStorage.removeItem("jc_pendingChannel"); } catch (e) {}
      if (p) JC.openChannel(p);
    }, 1000);
  };
  document.addEventListener("DOMContentLoaded", function () { JC.wireV48d(); });
})();
