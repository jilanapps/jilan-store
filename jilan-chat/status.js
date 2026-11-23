// Jilan Chat v4.6 — status.js (v4.12: composer/add sheet hooks + reactions)
// WhatsApp-like daily status (24 hours only).
// Data model: statuses/{uid}/items/{statusId}
//   type: "photo" | "video" | "text" | "voice" (v4.7: voice status, max 60s,
//   16 kbps, base64 audio in mediaData + mediaMime + durationSec)
//   mediaData (photo, base64 — no Storage on Spark) | mediaUrl (legacy) | text
//   createdAt, expiresAt = createdAt + 24h
// v4.6 seen-by: statuses/{ownerUid}/items/{statusId}/views/{viewerUid}
//   = { uid, name, at } — written ONCE by the viewer (rules: viewer may only
//   create their own doc, never update; only the owner can read the list).
//   Spark-friendly: the viewer never reads views; the owner reads them only
//   for the status open on screen (one listener, closed on next/close).
//   Seen/unseen rings in the list come from this phone's own memory
//   (localStorage), so building the list costs no extra reads.
// Viewer: segmented progress bars, auto-advance (text/photo 5s), tap right =
// next, tap left = previous, hold = pause, swipe down / X = close.
// Others' status: "Reply…" box sends a normal chat message quoting the
// status (only people with an existing 1-to-1 chat are listed).

(function () {
  var JC = window.JC = window.JC || {};
  var DAY_MS = 24 * 60 * 60 * 1000;
  JC.STATUS_MS = 5000;           // text / photo display time
  JC.STATUS_VIDEO_MS = 15000;    // legacy video status
  var SEEN_KEY = "jilanchat-status-seen";
  var WROTE_KEY = "jilanchat-status-viewed-written";
  var viewQueue = [];
  var viewIndex = 0;
  var viewMine = false;
  var progTimer = null, elapsed = 0, duration = JC.STATUS_MS, paused = false;
  var viewsUnsub = null, currentViews = [];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function toMs(ts) {
    if (!ts) return 0;
    if (ts.toMillis) return ts.toMillis();
    if (ts.toDate) return ts.toDate().getTime();
    return new Date(ts).getTime();
  }
  function isLive(item) {
    if (!item.expiresAt) return false;
    return toMs(item.expiresAt) > Date.now();
  }
  function fmtAgo(ts) {
    if (!ts) return "just now";
    var ms = toMs(ts);
    var mins = Math.floor((Date.now() - ms) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var h = Math.floor(mins / 60);
    if (h < 24) return h + "h ago";
    return new Date(ms).toDateString();
  }
  JC.fmtStatusAgo = fmtAgo;
  function fmtClock(ts) {
    var ms = toMs(ts);
    if (!ms) return "Just now";
    var d = new Date(ms), h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    var day = (new Date(Date.now()).toDateString() === d.toDateString()) ? "Today" : "Yesterday";
    return day + ", " + h + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function avatarHtml(name, photo) {
    return photo ? '<img src="' + esc(photo) + '" alt="">' : esc(((name || "?")[0] || "?").toUpperCase());
  }

  // ---------- per-phone seen memory ----------
  function readSet(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) { return {}; }
  }
  function writeSet(key, set) {
    var ids = Object.keys(set);
    if (ids.length > 500) ids.slice(0, ids.length - 500).forEach(function (k) { delete set[k]; });
    try { localStorage.setItem(key, JSON.stringify(set)); } catch (e) {}
  }
  JC.statusSeen = function (id) { return !!readSet(SEEN_KEY)[id]; };
  function markSeen(id) { var s = readSet(SEEN_KEY); s[id] = 1; writeSet(SEEN_KEY, s); }

  // ---------- seen-by record (viewer side, written once) ----------
  JC.recordStatusView = function (item) {
    if (!JC.db || !JC.currentUser || !item || item.ownerUid === JC.currentUser.uid) return Promise.resolve(false);
    // v4.8 privacy: read receipts OFF — status views are not sent (WhatsApp rule).
    if (JC.hideReadReceiptsOn && JC.hideReadReceiptsOn()) return Promise.resolve(false);
    var key = item.ownerUid + "/" + item.id;
    var wrote = readSet(WROTE_KEY);
    if (wrote[key]) return Promise.resolve(false);
    var p = JC.userProfile || {};
    return JC.db.collection("statuses").doc(item.ownerUid).collection("items").doc(item.id)
      .collection("views").doc(JC.currentUser.uid)
      .set({ uid: JC.currentUser.uid, name: String(p.displayName || "Someone").slice(0, 60), at: firebase.firestore.FieldValue.serverTimestamp() })
      .then(function () { wrote[key] = 1; writeSet(WROTE_KEY, wrote); return true; })
      // Denied = doc already exists (update not allowed) — nothing to retry.
      .catch(function () { wrote[key] = 1; writeSet(WROTE_KEY, wrote); return false; });
  };

  // ---------- open the status screen ----------
  JC.loadStatusLists = function () {
    if (!JC.db || !JC.currentUser) return;
    loadMyStatus();
    loadFriendsStatus();
  };
  JC.openStatus = function () {
    if (!JC.db || !JC.currentUser) return;
    JC.showScreen("screen-status", { push: true });
    JC.loadStatusLists();
  };

  function loadMyStatus() {
    var me = JC.currentUser;
    var av = $("myStatusAvatar");
    var p = JC.userProfile || {};
    av.innerHTML = avatarHtml(p.displayName, p.photoURL);
    return JC.db.collection("statuses").doc(me.uid).collection("items")
      .orderBy("createdAt", "desc").limit(10).get().then(function (snap) {
        var live = [];
        snap.forEach(function (doc) {
          var d = doc.data();
          if (isLive(d)) live.push({ id: doc.id, ownerUid: me.uid, ownerName: p.displayName || "You", ownerPhoto: p.photoURL || "", data: d });
        });
        live.reverse(); // oldest first, like WhatsApp
        var ring = $("myStatusRing");
        if (ring) {
          ring.className = "status-ring " + (live.length ? "mine" : "none");
          var old = ring.querySelector && ring.querySelector(".ring-svg");
          if (old && old.remove) old.remove();
          if (live.length && ring.insertAdjacentHTML) ring.insertAdjacentHTML("afterbegin", segRing(live.length));
        }
        $("myStatusHint").textContent = live.length
          ? live.length + " update" + (live.length > 1 ? "s" : "") + " · " + fmtAgo(live[live.length - 1].data.createdAt)
          : "Tap to add status update";
        $("myStatusRow").onclick = function (e) {
          if (e && e.target && e.target.closest && e.target.closest("#btnAddStatus")) return;
          if (live.length) openViewer(live, 0, true);
          else if (JC.openStatusAddSheet) JC.openStatusAddSheet();
        };
      }).catch(function () {});
  }

  // Ring split into segments (one per status), like WhatsApp.
  function segRing(n) {
    n = Math.max(1, n);
    var r = 25, c = 2 * Math.PI * r, gap = n > 1 ? 4 : 0, seg = c / n - gap;
    return '<svg class="ring-svg" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="' + r +
      '" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="' +
      seg.toFixed(2) + " " + gap + '" transform="rotate(-90 28 28)"/></svg>';
  }
  JC.statusSegRing = segRing;

  function statusRow(p, live, seenAll) {
    var row = document.createElement("div");
    row.className = "chat-row status-row";
    row.innerHTML =
      '<div class="status-ring ' + (seenAll ? "seen" : "unseen") + '">' + segRing(live.length) +
      '<div class="avatar">' + avatarHtml(p.displayName, p.photoURL) + '</div></div>' +
      '<div class="info"><div class="name">' + esc(p.displayName || "Unknown") + '</div>' +
      '<div class="preview">' + esc(fmtAgo(live[live.length - 1].data.createdAt)) + '</div></div>';
    return row;
  }
  JC.statusRow = statusRow;

  function loadFriendsStatus() {
    var recent = $("statusListRecent"), viewed = $("statusListViewed");
    var empty = $("statusEmpty");
    recent.innerHTML = ""; viewed.innerHTML = "";
    $("statusRecentHead").classList.add("hidden");
    $("statusViewedHead").classList.add("hidden");
    empty.classList.add("hidden");
    // Friends = people I already have a 1-to-1 chat with (so a reply chat exists).
    return JC.db.collection("userChats").doc(JC.currentUser.uid).collection("list").get().then(function (snap) {
      if (snap.empty) { empty.classList.remove("hidden"); return; }
      var done = 0, shown = 0, total = snap.size;
      function finish() { done++; if (done === total && shown === 0) empty.classList.remove("hidden"); }
      snap.forEach(function (doc) {
        var lc = doc.data() || {};
        var otherUid = lc.otherUid;
        if (!otherUid || lc.type === "group" || lc.groupId) { finish(); return; }
        if (JC.isBlocked && JC.isBlocked(otherUid)) { finish(); return; }
        var chatId = lc.chatId || doc.id;
        JC.db.collection("statuses").doc(otherUid).collection("items")
          .orderBy("createdAt", "desc").limit(10).get().then(function (s2) {
            var live = [];
            s2.forEach(function (d2) {
              var d = d2.data();
              if (isLive(d)) live.push({ id: d2.id, ownerUid: otherUid, chatId: chatId, data: d });
            });
            if (!live.length) return;
            live.reverse();
            shown++;
            return JC.db.collection("users").doc(otherUid).get().then(function (pSnap) {
              var p = pSnap.exists ? pSnap.data() : { displayName: "Unknown", photoURL: "" };
              live.forEach(function (it) { it.ownerName = p.displayName || "Unknown"; it.ownerPhoto = p.photoURL || ""; });
              var seenAll = live.every(function (it) { return JC.statusSeen(it.id); });
              var row = statusRow(p, live, seenAll);
              row.addEventListener("click", function () {
                var first = 0;
                for (var i = 0; i < live.length; i++) { if (!JC.statusSeen(live[i].id)) { first = i; break; } }
                openViewer(live, first, false);
              });
              (seenAll ? viewed : recent).appendChild(row);
              $(seenAll ? "statusViewedHead" : "statusRecentHead").classList.remove("hidden");
            });
          }).catch(function () {}).then(finish);
      });
    }).catch(function () { empty.classList.remove("hidden"); });
  }

  // ---------- post a status ----------
  JC.postTextStatus = function () {
    var text = ($("statusTextInput").value || "").trim();
    if (!text) { JC.toast("Write something first."); return; }
    if (!JC.db || !JC.currentUser) return;
    var st = JC.statusStyle || {}, doc = { type: "text", text: text };
    if (JC.validStatusBg && JC.validStatusBg(st.bg)) doc.bg = st.bg;
    if (JC.validStatusFont && JC.validStatusFont(st.font)) doc.font = st.font;
    addStatusDoc(doc).then(function () {
      $("statusTextInput").value = "";
      if (JC.closeStatusComposer) JC.closeStatusComposer();
      JC.toast("Status posted — it disappears in 24 hours.");
      loadMyStatus();
    }).catch(function (e) { JC.toast("Status failed: " + e.message); });
  };

  JC.postMediaStatus = function (file) {
    if (!file) return;
    var isImage = file.type && file.type.indexOf("image/") === 0;
    // v4.4: no Storage (Blaze nahi) — status photo is shrunk and saved in
    // the status doc itself. Video status cannot fit, so say so clearly.
    if (!isImage) { JC.toast("Video status isn't supported yet. Post a photo or text status."); return; }
    JC.toast("Preparing status…");
    JC.imageFileToDataUrl(file, function (dataUrl) {
      if (!dataUrl) { JC.toast("Photo is too large for a status."); return; }
      addStatusDoc({ type: "photo", mediaData: dataUrl, mediaName: file.name || "status.jpg" }).then(function () {
        if (JC.closeStatusComposer) JC.closeStatusComposer();
        JC.toast("Status posted — it disappears in 24 hours.");
        loadMyStatus();
      }).catch(function () { JC.toast("Couldn't post status."); });
    });
  };

  function addStatusDoc(data) {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    data.expiresAt = firebase.firestore.Timestamp.fromMillis(Date.now() + DAY_MS);
    return JC.db.collection("statuses").doc(JC.currentUser.uid).collection("items").add(data);
  }

  // ---------- delete my own status item ----------
  JC.deleteMyStatus = function (statusId) {
    if (!JC.db || !JC.currentUser) return Promise.resolve();
    return JC.db.collection("statuses").doc(JC.currentUser.uid).collection("items").doc(statusId).delete()
      .then(function () { JC.toast("Status deleted"); loadMyStatus(); })
      .catch(function (e) { JC.toast("Delete failed: " + e.message); });
  };

  // ---------- reply to someone's status ----------
  // Quote fits the existing replyTo rule (keys id/senderId/type/text,
  // text <= 200, id <= 64) — no rules change needed for replies.
  JC.statusReplyQuote = function (item) {
    var d = item.data || {};
    var what = d.type === "text" ? String(d.text || "").slice(0, 120) : (d.type === "photo" ? "Photo" : (d.type === "voice" ? "Voice status" : "Video"));
    return { id: ("status_" + item.id).slice(0, 64), senderId: item.ownerUid, type: "status", text: ("Status: " + what).slice(0, 200) };
  };
  JC.sendStatusReply = function (item, text, okToast) {
    text = String(text || "").trim();
    if (!text || !item || !item.chatId || !JC.sendMessage) return Promise.resolve(false);
    // Send into that person's 1-to-1 chat without opening it: sendMessage
    // reads the chat ids synchronously, so swap them in and restore at once.
    var keep = [JC.currentChatId, JC.currentChatOtherUid, JC.currentChatIsGroup];
    JC.currentChatId = item.chatId; JC.currentChatOtherUid = item.ownerUid; JC.currentChatIsGroup = false;
    var p;
    try { p = JC.sendMessage({ type: "text", text: text, replyTo: JC.statusReplyQuote(item) }); }
    catch (e) { p = Promise.reject(e); }
    finally { JC.currentChatId = keep[0]; JC.currentChatOtherUid = keep[1]; JC.currentChatIsGroup = keep[2]; }
    return Promise.resolve(p).then(function () { JC.toast(okToast || "Reply sent"); return true; })
      .catch(function () { JC.toast(okToast ? "Reaction not sent." : "Reply not sent."); return false; });
  };

  // ---------- v4.12: react to someone's status ----------
  // Sent as a normal 1-to-1 chat message ("❤️") quoting the status — the
  // same path (and the same rules) as a status reply. No rules change.
  // Which status this phone reacted to is remembered per phone only.
  var REACT_KEY = "jilanchat-status-reacted";
  JC.STATUS_QUICK_REACTS = ["\uD83D\uDE0D", "\uD83D\uDE02", "\uD83D\uDE2E", "\uD83D\uDE22", "\uD83D\uDC4F", "\uD83D\uDE4F", "\uD83D\uDD25", "\u2764\uFE0F"];
  JC.STATUS_HEART = "\u2764\uFE0F";
  JC.statusReactedWith = function (item) {
    if (!item) return "";
    return readSet(REACT_KEY)[item.ownerUid + "/" + item.id] || "";
  };
  JC.sendStatusReaction = function (item, emoji) {
    emoji = String(emoji || "").slice(0, 16);
    if (!emoji || !item || !item.chatId) return Promise.resolve(false);
    if (JC.statusReactedWith(item) === emoji) return Promise.resolve(false); // already sent this one
    return JC.sendStatusReply(item, emoji, "Reacted " + emoji).then(function (ok) {
      if (ok) { var s = readSet(REACT_KEY); s[item.ownerUid + "/" + item.id] = emoji; writeSet(REACT_KEY, s); }
      return ok;
    });
  };
  JC.statusCurrentItem = function () { return viewQueue[viewIndex] || null; };

  // ---------- viewer ----------
  // ---------- v4.7 voice status ----------
  JC.VOICE_STATUS_COLORS = ["#1565c0", "#6a1b9a", "#00838f", "#c62828", "#ef6c00", "#283593"];
  JC.voiceStatusColor = function (id) {
    var h = 0, str = String(id || "");
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return JC.VOICE_STATUS_COLORS[h % JC.VOICE_STATUS_COLORS.length];
  };
  function fmtSec(sec) { sec = Math.max(0, Math.round(sec || 0)); return Math.floor(sec / 60) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60); }
  JC.fmtVoiceSec = fmtSec;
  var SVG_PLAY = '<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var SVG_PAUSE = '<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
  var SVG_MIC_BIG = '<svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
  // Deterministic "waveform" bars (real waveform would need decoding —
  // not worth it; bars fill in as the audio plays).
  JC.voiceWaveHeights = function (id, n) {
    var out = [], h = 7, str = String(id || "x");
    for (var i = 0; i < str.length; i++) h = (h * 33 + str.charCodeAt(i)) >>> 0;
    for (var j = 0; j < n; j++) { h = (h * 1103515245 + 12345) >>> 0; out.push(25 + (h % 75)); }
    return out;
  };
  var voiceAudio = null;
  function stopVoiceAudio() {
    if (voiceAudio) { try { voiceAudio.pause(); } catch (e) {} voiceAudio.onended = null; voiceAudio.ontimeupdate = null; voiceAudio = null; }
  }
  JC.voiceStatusCard = function (d, item) {
    var card = document.createElement("div");
    card.className = "vs-card";
    card.style.background = JC.voiceStatusColor(item && item.id);
    var bars = JC.voiceWaveHeights(item && item.id, 32).map(function (h, i) {
      return '<span class="vs-bar" data-i="' + i + '" style="height:' + h + '%"></span>';
    }).join("");
    card.innerHTML = '<div class="vs-mic">' + SVG_MIC_BIG + '</div>' +
      '<div class="vs-wave">' + bars + '</div>' +
      '<div class="vs-ctrl"><button type="button" class="vs-play" aria-label="Play">' + SVG_PAUSE + '</button>' +
      '<span class="vs-len">' + esc(fmtSec(d.durationSec || 0)) + '</span></div>';
    var src = (typeof d.mediaData === "string" && d.mediaData.indexOf("data:audio/") === 0) ? d.mediaData : "";
    var audio = document.createElement("audio");
    audio.preload = "auto";
    if (src) audio.src = src;
    card.appendChild(audio);
    var btn = card.querySelector(".vs-play");
    function setBtn() { btn.innerHTML = audio.paused ? SVG_PLAY : SVG_PAUSE; btn.setAttribute("aria-label", audio.paused ? "Play" : "Pause"); }
    btn.addEventListener("click", function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      if (audio.paused) { JC.statusPause(false); } else { JC.statusPause(true); }
      setBtn();
    });
    ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"].forEach(function (ev) {
      btn.addEventListener(ev, function (e) { if (e && e.stopPropagation) e.stopPropagation(); });
    });
    audio.addEventListener("play", setBtn);
    audio.addEventListener("pause", setBtn);
    card._audio = audio;
    return card;
  };
  // Progress bar follows the audio; next item only after it ends.
  function startVoiceProgress(body) {
    stopProgress();
    var card = body.querySelector && body.querySelector(".vs-card");
    var audio = card && card._audio;
    paused = false; elapsed = 0; duration = 1;
    var sv = $("statusViewer"); if (sv && sv.classList) sv.classList.remove("paused");
    updateBars();
    if (!audio || !audio.src) { statusGone(body); return; }
    voiceAudio = audio;
    var total = (viewQueue[viewIndex] && viewQueue[viewIndex].data.durationSec) || 0;
    var waves = card.querySelectorAll ? card.querySelectorAll(".vs-bar") : [];
    audio.ontimeupdate = function () {
      var dur = (isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (total || 60);
      duration = dur * 1000; elapsed = Math.min(duration, audio.currentTime * 1000);
      updateBars();
      var on = Math.round(elapsed / duration * waves.length);
      for (var i = 0; i < waves.length; i++) waves[i].classList.toggle("on", i < on);
      var len = card.querySelector(".vs-len");
      if (len) len.textContent = fmtSec(audio.currentTime) + " / " + fmtSec(dur);
    };
    audio.onended = function () { elapsed = duration; updateBars(); nextItem(); };
    try { var pr = audio.play(); if (pr && pr.catch) pr.catch(function () { /* autoplay blocked: user taps play */ }); } catch (e) {}
  }
  JC._startVoiceProgress = startVoiceProgress;

  // Recorder for a voice status (separate from the chat composer's).
  var vsRecorder = null, vsChunks = [], vsTimer = null, vsStream = null, vsStarted = 0, vsSend = false;
  JC.isVoiceStatusRecording = function () { return !!(vsRecorder && vsRecorder.state === "recording"); };
  JC.startVoiceStatus = function () {
    if (JC.isVoiceStatusRecording()) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
      JC.toast("Voice recording isn't supported on this phone.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      vsStream = stream;
      var opts = { audioBitsPerSecond: 16000 };
      var mt = JC.pickVoiceMime ? JC.pickVoiceMime() : "";
      if (mt) opts.mimeType = mt;
      try { vsRecorder = new MediaRecorder(stream, opts); }
      catch (e) { try { vsRecorder = new MediaRecorder(stream); } catch (e2) { JC.toast("Couldn't start recording."); stopVsStream(); return; } }
      vsChunks = []; vsSend = false;
      vsRecorder.ondataavailable = function (e) { if (e.data && e.data.size) vsChunks.push(e.data); };
      vsRecorder.onstop = finishVoiceStatus;
      vsRecorder.start(1000);
      vsStarted = Date.now();
      $("vsTime").textContent = "0:00";
      $("vsRec").classList.remove("hidden");
      $("btnVoiceStatus").classList.add("hidden");
      vsTimer = setInterval(function () {
        var sec = Math.min(JC.VOICE_MAX_SEC || 60, Math.round((Date.now() - vsStarted) / 1000));
        $("vsTime").textContent = fmtSec(sec);
        if (sec >= (JC.VOICE_MAX_SEC || 60)) JC.stopVoiceStatus(true); // 60 s: auto-post
      }, 250);
    }).catch(function () {
      JC.toast("Microphone permission denied. Allow Microphone for Jilan Chat in your phone Settings.");
    });
  };
  function stopVsStream() { if (vsStream) { vsStream.getTracks().forEach(function (t) { t.stop(); }); vsStream = null; } }
  JC.stopVoiceStatus = function (send) {
    if (vsTimer) { clearInterval(vsTimer); vsTimer = null; }
    vsSend = !!send;
    var dur = Math.max(1, Math.min(JC.VOICE_MAX_SEC || 60, Math.round((Date.now() - vsStarted) / 1000)));
    if (vsRecorder) vsRecorder._dur = dur;
    if (vsRecorder && vsRecorder.state !== "inactive") { try { vsRecorder.stop(); } catch (e) {} }
    $("vsRec").classList.add("hidden");
    $("btnVoiceStatus").classList.remove("hidden");
    stopVsStream();
  };
  function finishVoiceStatus() {
    var rec = vsRecorder;
    var type = ((rec && rec.mimeType) || "audio/webm").split(";")[0];
    var blob = new Blob(vsChunks, { type: type });
    vsChunks = [];
    var dur = (rec && rec._dur) || 1;
    if (!vsSend || !blob.size) return;
    JC.blobToDataUrl(blob, function (dataUrl) { JC.postVoiceStatus(dataUrl, type, dur); });
  }
  JC.postVoiceStatus = function (dataUrl, type, dur) {
    if (!dataUrl || dataUrl.indexOf("data:") !== 0) { JC.toast("Couldn't post status."); return Promise.resolve(false); }
    type = type || "audio/webm";
    dataUrl = dataUrl.replace(/^data:[^,]*?;base64,/, "data:" + type + ";base64,");
    if (dataUrl.length > (JC.MEDIA_MAX_CHARS || 270000)) { JC.toast("Voice status is too long. Record a shorter one."); return Promise.resolve(false); }
    JC.toast("Posting voice status…");
    return addStatusDoc({ type: "voice", mediaData: dataUrl, mediaMime: type, durationSec: Math.max(1, Math.min(60, Math.round(dur || 1))) }).then(function () {
      JC.toast("Status posted");
      if (JC.closeStatusComposer) JC.closeStatusComposer();
      loadMyStatus();
      return true;
    }).catch(function () { JC.toast("Couldn't post status."); return false; });
  };

  function openViewer(items, index, mine) {
    viewQueue = items;
    viewIndex = Math.max(0, Math.min(index, items.length - 1));
    viewMine = !!mine;
    $("statusViewer").classList.remove("hidden");
    $("svOwnFoot").classList.toggle("hidden", !viewMine);
    $("svReplyFoot").classList.toggle("hidden", viewMine || !items[0] || !items[0].chatId);
    $("svViewsSheet").classList.add("hidden");
    $("svConfirm").classList.add("hidden");
    $("svReplyInput").value = "";
    renderBars();
    showViewerItem();
  }
  JC.openStatusViewer = openViewer;
  function renderBars() {
    var html = "";
    for (var i = 0; i < viewQueue.length; i++) html += '<div class="sv-bar"><div class="sv-fill" id="svFill' + i + '"></div></div>';
    $("svBars").innerHTML = html;
  }
  function setFill(i, pct) { var f = $("svFill" + i); if (f && f.style) f.style.width = pct + "%"; }
  function updateBars() {
    for (var i = 0; i < viewQueue.length; i++) setFill(i, i < viewIndex ? 100 : (i > viewIndex ? 0 : Math.min(100, elapsed / duration * 100)));
  }
  function startProgress(ms) {
    stopProgress();
    duration = ms; elapsed = 0; paused = false;
    var sv = $("statusViewer"); if (sv && sv.classList) sv.classList.remove("paused");
    updateBars();
    progTimer = setInterval(function () {
      if (paused) return;
      elapsed += 50;
      updateBars();
      if (elapsed >= duration) nextItem();
    }, 50);
  }
  function stopProgress() { if (progTimer) { clearInterval(progTimer); progTimer = null; } }
  JC.statusPause = function (on) {
    paused = !!on;
    var v = document.querySelector && (document.querySelector("#statusViewerBody video") || document.querySelector("#statusViewerBody audio"));
    if (v) { try { if (paused) v.pause(); else v.play(); } catch (e) {} }
    var sv = $("statusViewer");
    if (sv && sv.classList) sv.classList.toggle("paused", paused);
  };
  JC.statusState = function () {
    return { index: viewIndex, count: viewQueue.length, paused: paused, elapsed: elapsed, mine: viewMine,
      open: !$("statusViewer").classList.contains("hidden"), views: currentViews.length };
  };

  function showViewerItem() {
    var item = viewQueue[viewIndex];
    if (!item) { closeViewer(); return; }
    var d = item.data;
    $("statusViewerName").textContent = viewMine ? "My status" : (item.ownerName || "Status");
    $("statusViewerTime").textContent = fmtAgo(d.createdAt);
    $("statusViewerAvatar").innerHTML = avatarHtml(item.ownerName, item.ownerPhoto);
    var body = $("statusViewerBody");
    stopVoiceAudio();
    body.innerHTML = "";
    var ms = JC.STATUS_MS;
    if (d.type === "text") {
      var div = document.createElement("div");
      div.className = "sv-text";
      div.textContent = d.text || "";
      // v4.8: coloured background + font (whitelisted values only).
      if (JC.validStatusBg && JC.validStatusBg(d.bg)) div.style.background = d.bg;
      if (JC.validStatusFont && JC.validStatusFont(d.font)) div.className += " f-" + d.font;
      body.appendChild(div);
    } else if (d.type === "photo") {
      var img = document.createElement("img");
      img.className = "sv-img";
      img.src = (typeof d.mediaData === "string" && d.mediaData.indexOf("data:image/") === 0) ? d.mediaData : (d.mediaUrl || "");
      img.onerror = function () { statusGone(body); };
      body.appendChild(img);
    } else if (d.type === "voice") {
      ms = 0; // progress follows the audio; next only when it ends (or tap)
      body.appendChild(JC.voiceStatusCard(d, item));
    } else if (d.type === "video") {
      var vid = document.createElement("video");
      vid.className = "sv-img";
      vid.src = d.mediaUrl || "";
      vid.autoplay = true;
      vid.playsInline = true;
      vid.onerror = function () { statusGone(body); };
      vid.onended = function () { nextItem(); };
      body.appendChild(vid);
      ms = JC.STATUS_VIDEO_MS;
    }
    if (ms) startProgress(ms); else startVoiceProgress(body);
    if (viewMine) watchViews(item);
    else { markSeen(item.id); JC.recordStatusView(item); }
    if (JC.onStatusItemShown) { try { JC.onStatusItemShown(item, viewMine); } catch (e) {} }
  }
  function statusGone(body) {
    body.innerHTML = "";
    var note = document.createElement("div");
    note.className = "sv-gone";
    note.textContent = "Status expired";
    body.appendChild(note);
    startProgress(2500);
  }
  function nextItem() {
    if (viewIndex + 1 >= viewQueue.length) { closeViewer(); return; }
    viewIndex++;
    showViewerItem();
  }
  function prevItem() {
    if (viewIndex > 0) viewIndex--;
    showViewerItem();
  }
  JC.statusNext = nextItem;
  JC.statusPrev = prevItem;
  function closeViewer() {
    stopVoiceAudio();
    var wasOpen = !$("statusViewer").classList.contains("hidden");
    stopProgress();
    stopViews();
    paused = false;
    $("statusViewer").classList.add("hidden");
    $("statusViewerBody").innerHTML = "";
    $("svViewsSheet").classList.add("hidden");
    $("svConfirm").classList.add("hidden");
    if (!wasOpen || !JC.db || !JC.currentUser) return;
    if (viewMine) loadMyStatus(); else loadFriendsStatus();
  }
  JC.closeStatusViewer = closeViewer;

  // ---------- seen-by (owner side): one listener, only for the open status ----------
  function stopViews() { if (viewsUnsub) { try { viewsUnsub(); } catch (e) {} viewsUnsub = null; } currentViews = []; }
  function watchViews(item) {
    stopViews();
    $("svViewCount").textContent = "0";
    if (!JC.db || !JC.currentUser) return;
    viewsUnsub = JC.db.collection("statuses").doc(JC.currentUser.uid).collection("items").doc(item.id)
      .collection("views").onSnapshot(function (snap) {
        var list = [];
        snap.forEach(function (doc) { var v = doc.data() || {}; list.push({ uid: v.uid || doc.id, name: v.name || "Someone", at: v.at }); });
        list.sort(function (a, b) { return toMs(b.at) - toMs(a.at); });
        currentViews = list;
        $("svViewCount").textContent = String(list.length);
        if (!$("svViewsSheet").classList.contains("hidden")) renderViews();
      }, function () {});
  }
  function renderViews() {
    var n = currentViews.length;
    $("svViewsTitle").textContent = "Viewed by " + n;
    $("svViewsList").innerHTML = n ? currentViews.map(function (v) {
      return '<div class="sv-view-row"><div class="avatar">' + avatarHtml(v.name, "") + '</div><div class="info"><div class="name">' +
        esc(v.name) + '</div><div class="preview">' + esc(fmtClock(v.at)) + '</div></div></div>';
    }).join("") : '<div class="sv-empty">No views yet</div>';
  }
  JC.openStatusViews = function () {
    renderViews();
    $("svViewsSheet").classList.remove("hidden");
    JC.statusPause(true);
  };

  // ---------- gestures: tap left/right, hold = pause, swipe down = close ----------
  JC.HOLD_PAUSE_MS = 220;
  function wireGestures() {
    var area = $("svTapArea");
    if (!area || !area.addEventListener) return;
    var sx = 0, sy = 0, holdT = null, held = false, active = false;
    function down(x, y) {
      active = true; sx = x; sy = y; held = false;
      holdT = setTimeout(function () { holdT = null; held = true; JC.statusPause(true); }, JC.HOLD_PAUSE_MS);
    }
    function up(x, y) {
      if (!active) return; active = false;
      if (holdT) { clearTimeout(holdT); holdT = null; }
      if (y - sy > 80) { closeViewer(); return; }
      if (held) { JC.statusPause(false); return; }
      var w = area.clientWidth || window.innerWidth || 360;
      if (x < w / 3) prevItem(); else nextItem();
    }
    function cancel() { active = false; if (holdT) { clearTimeout(holdT); holdT = null; } if (held) JC.statusPause(false); }
    if (window.PointerEvent) {
      area.addEventListener("pointerdown", function (e) { down(e.clientX, e.clientY); });
      area.addEventListener("pointerup", function (e) { up(e.clientX, e.clientY); });
      area.addEventListener("pointercancel", cancel);
    } else {
      area.addEventListener("touchstart", function (e) { var t = e.touches[0]; down(t.clientX, t.clientY); });
      area.addEventListener("touchend", function (e) { var t = e.changedTouches[0]; up(t.clientX, t.clientY); });
      area.addEventListener("mousedown", function (e) { down(e.clientX, e.clientY); });
      area.addEventListener("mouseup", function (e) { up(e.clientX, e.clientY); });
    }
    area.addEventListener("contextmenu", function (e) { if (e.preventDefault) e.preventDefault(); });
  }
  JC._wireStatusGestures = wireGestures;

  // ---------- wire UI ----------
  document.addEventListener("DOMContentLoaded", function () {
    $("btnStatus").addEventListener("click", JC.openStatus);
    $("btnStatusBack").addEventListener("click", function () { JC.goBack(); });
    $("btnAddStatus").addEventListener("click", function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      if (JC.openStatusAddSheet) JC.openStatusAddSheet();
    });
    $("btnPostTextStatus").addEventListener("click", JC.postTextStatus);
    $("btnPostMediaStatus").addEventListener("click", function () { $("statusFileInput").click(); });
    $("statusFileInput").addEventListener("change", function () {
      var f = $("statusFileInput").files && $("statusFileInput").files[0];
      if (f) JC.postMediaStatus(f);
      $("statusFileInput").value = "";
    });
    var vsBtn = $("btnVoiceStatus");
    if (vsBtn) vsBtn.addEventListener("click", JC.startVoiceStatus);
    var vsC = $("vsCancel"); if (vsC) vsC.addEventListener("click", function () { JC.stopVoiceStatus(false); });
    var vsP = $("vsPost"); if (vsP) vsP.addEventListener("click", function () { JC.stopVoiceStatus(true); });
    $("statusViewerClose").addEventListener("click", closeViewer);
    wireGestures();
    $("svViews").addEventListener("click", JC.openStatusViews);
    $("svViewsClose").addEventListener("click", function () { $("svViewsSheet").classList.add("hidden"); JC.statusPause(false); });
    $("svDelete").addEventListener("click", function () { JC.statusPause(true); $("svConfirm").classList.remove("hidden"); });
    $("svConfirmCancel").addEventListener("click", function () { $("svConfirm").classList.add("hidden"); JC.statusPause(false); });
    $("svConfirmDelete").addEventListener("click", function () {
      var item = viewQueue[viewIndex];
      $("svConfirm").classList.add("hidden");
      closeViewer();
      if (item) JC.deleteMyStatus(item.id);
    });
    var rIn = $("svReplyInput");
    rIn.addEventListener("focus", function () { JC.statusPause(true); });
    rIn.addEventListener("blur", function () { if (!(rIn.value || "").trim()) JC.statusPause(false); });
    function sendReply() {
      var item = viewQueue[viewIndex];
      var t = rIn.value;
      if (!(t || "").trim()) return;
      rIn.value = "";
      JC.sendStatusReply(item, t).then(function () { JC.statusPause(false); });
    }
    $("svReplySend").addEventListener("click", sendReply);
    rIn.addEventListener("keydown", function (e) { if (e.key === "Enter") sendReply(); });
    var aboutBtn = $("btnAbout");
    if (aboutBtn) aboutBtn.addEventListener("click", function () { JC.showScreen("screen-about", { push: true }); });
    var aboutBack = $("btnAboutBack");
    if (aboutBack) aboutBack.addEventListener("click", function () { JC.goBack(); });
  });
})();
