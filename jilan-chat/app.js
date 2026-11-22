// Jilan Chat v4.0 — app.js
// Chat list, 1-to-1 chat, text/media/voice messages, read ticks,
// user search by Gmail, profile screen. No calls here — see calls.js.

(function () {
  var JC = window.JC = window.JC || {};
  JC.currentChatId = null;
  JC.currentChatOther = null;   // { uid, displayName, photoURL, online, lastSeen }
  JC.currentChatOtherUid = null;
  JC.currentChatIsGroup = false; // true when the open chat is a group (see groups.js)

  // Route a send to the open chat: 1-to-1 or group. Groups live in
  // groups.js; this falls back to 1-to-1 if that file is not loaded.
  JC.sendCurrentMessage = function (data) {
    if (JC.currentChatIsGroup && JC.sendGroupMessage) return JC.sendGroupMessage(data);
    return JC.sendMessage(data);
  };
  // Media path for the open chat: group media goes under group-media/,
  // 1-to-1 media under chat-media/. Voice in groups also uses group-media/.
  JC.mediaPathForCurrentChat = function (fileName) {
    if (JC.currentChatIsGroup) return "group-media/" + JC.currentChatId + "/" + fileName;
    return "chat-media/" + JC.currentChatId + "/" + fileName;
  };

  var listUnsub = null;
  var chatUnsub = null;
  var partnerUnsub = null;
  var otherProfiles = {};       // uid -> profile (cached for list previews)
  var msgEls = {};              // msgId -> bubble element (for tick updates)

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  JC.toast = function (msg) {
    var t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 3000);
  };
  // ---------- navigation history (v4.2 — back bug fix) ----------
  // Masla (user report 2026-11-22 12:45): kisi screen se Back dabane par
  // poori app band ho jati thi. Wajah: showScreen sirf CSS class badalta
  // tha — browser history me kabhi entry nahi banti thi, is liye shell ka
  // onBackPressed (WebView.goBack() -> canGoBack() false -> finish())
  // seedha app band kar deta tha. Fix: har drill-down screen history me
  // push hoti hai; popstate (system Back) pichli screen dikhata hai; chat
  // list par Back se app band hona theek hai (history khatam).
  // opts: {push:true} drill-down ke liye, {replace:true} home-level ke liye.
  var currentScreen = "screen-login";
  function showScreen(id, opts) {
    opts = opts || {};
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    var el = $(id);
    if (el) el.classList.add("active");
    // Bottom tabs sirf Chats / Calls / Updates screens par dikhte hain.
    var bar = $("tabBar");
    if (bar) {
      var tab = TAB_SCREENS[id];
      bar.classList.toggle("hidden", !tab);
      if (tab) {
        bar.querySelectorAll(".tab-btn").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-tab") === tab);
        });
      }
    }
    // Browser history: push = nayi entry (Back se wapas aaye ga),
    // replace = wahi entry badlo (home-level screens: list/calls/status,
    // login — in se Back seedha app band kare ya pichli drill-down par jaye).
    try {
      if (opts.push) window.history.pushState({ screen: id }, "");
      else if (opts.replace) window.history.replaceState({ screen: id }, "");
    } catch (e) { /* history na ho to bhi screen dikhni chahiye */ }
    currentScreen = id;
  }
  // Header back arrow (←) aur koi bhi in-app back: browser history se
  // wapas jao — popstate handler screen badalta hai. History me entry na
  // ho (purana flow) to seedha chat list dikhao.
  JC.goBack = function () {
    try {
      if (window.history && window.history.length > 1) { window.history.back(); return; }
    } catch (e) {}
    if (currentScreen === "screen-chat") closeChat();
    if (currentScreen === "screen-nearby" && JC.nearbyLeave) { JC.nearbyLeave(); return; }
    showScreen("screen-list", { replace: true });
  };
  // System Back (Android): history entry ho to pichli screen; warna
  // WebView khud app band kar deta hai (shell onBackPressed).
  window.addEventListener("popstate", function (e) {
    var id = (e.state && e.state.screen) || "screen-list";
    // Chhori hui screen ki safai: chat listeners band, Nearby session khatam.
    if (currentScreen === "screen-chat") closeChat();
    if (currentScreen === "screen-nearby" && JC.nearbyLeave) {
      // nearbyLeave khud list dikhata hai — popstate ka showScreen na chale.
      JC.nearbyLeave(); return;
    }
    showScreen(id);
  });
  // Tab bar mapping: screen id -> tab name.
  var TAB_SCREENS = { "screen-list": "chats", "screen-calls": "calls", "screen-status": "updates" };
  JC.showScreen = showScreen;
  function fmtTime(ts) {
    if (!ts) return "";
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function fmtLastSeen(profile) {
    if (!profile) return "";
    if (profile.online) return "online";
    if (!profile.lastSeen) return "offline";
    var d = profile.lastSeen.toDate ? profile.lastSeen.toDate() : new Date(profile.lastSeen);
    var today = new Date();
    var sameDay = d.toDateString() === today.toDateString();
    return "last seen " + (sameDay ? "today at " + fmtTime(d) : d.toDateString());
  }
  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/);
    return ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }
  function avatarHtml(profile, large) {
    if (profile && profile.photoURL) return '<img src="' + esc(profile.photoURL) + '" alt="">';
    return esc(initials(profile ? profile.displayName : "?"));
  }
  // ---------- profile: About bio (v4.2, WhatsApp-like) ----------
  // About max 139 characters (WhatsApp limit). Khaali ho to "Available".
  JC.ABOUT_MAX = 139;
  JC.DEFAULT_ABOUT = "Available";
  JC.aboutOf = function (p) {
    var a = p && p.about ? String(p.about).trim() : "";
    return a || JC.DEFAULT_ABOUT;
  };
  // ---------- profile: photo (v4.2) ----------
  // NO Firebase Storage (bucket nahi hai — Blaze nahi). Photo ko chhota
  // kar ke (square crop, max 256px, JPEG) base64 data URL bana kar
  // users/{uid}.photoURL me save karte hain — avatarHtml use har jagah
  // dikhata hai (chat list, header, search, contact, status). Firestore
  // doc 1 MB limit — data URL ~30 KB se neeche rehna lazmi hai.
  JC.PHOTO_MAX_SIZE = 256;
  JC.PHOTO_MAX_URL = 250000; // data URL characters (rules bhi 300k tak rokte hain)
  // Pure helper (testable): image ko square-crop kar ke data URL banao.
  JC.photoDataUrlFromImage = function (img, size, quality) {
    var canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    var w = img.naturalWidth || img.width || size;
    var h = img.naturalHeight || img.height || size;
    var side = Math.min(w, h);
    var sx = Math.max(0, (w - side) / 2), sy = Math.max(0, (h - side) / 2);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", quality);
  };
  // File -> data URL. Pehle 256px/0.7, bara ho to 192px/0.5, phir bhi
  // bara ho to reject (doc limit). Non-image file par reject.
  JC.compressProfilePhoto = function (file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf("image/") !== 0) {
        reject(new Error("Please choose a photo.")); return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Could not read the photo.")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("Could not open the photo.")); };
        img.onload = function () {
          var url = JC.photoDataUrlFromImage(img, JC.PHOTO_MAX_SIZE, 0.7);
          if (url && url.length <= JC.PHOTO_MAX_URL) { resolve(url); return; }
          url = JC.photoDataUrlFromImage(img, 192, 0.5);
          if (url && url.length <= JC.PHOTO_MAX_URL) { resolve(url); return; }
          reject(new Error("Photo is too big — choose a smaller one."));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };
  JC.saveProfilePhoto = function (file) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    return JC.compressProfilePhoto(file).then(function (url) {
      return JC.db.collection("users").doc(JC.currentUser.uid).update({ photoURL: url }).then(function () {
        if (JC.userProfile) JC.userProfile.photoURL = url;
        JC.loadProfileScreen();
        JC.toast("Photo updated");
        return url;
      });
    });
  };
  JC.removeProfilePhoto = function () {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    return JC.db.collection("users").doc(JC.currentUser.uid).update({ photoURL: "" }).then(function () {
      if (JC.userProfile) JC.userProfile.photoURL = "";
      JC.loadProfileScreen();
      JC.toast("Photo removed");
    });
  };
  // About save — 139 se zyada ho to kaat do, khaali ho to "Available" likho.
  JC.saveAbout = function (text) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    var a = String(text == null ? "" : text).trim().slice(0, JC.ABOUT_MAX);
    if (!a) a = JC.DEFAULT_ABOUT;
    return JC.db.collection("users").doc(JC.currentUser.uid).update({ about: a }).then(function () {
      if (JC.userProfile) JC.userProfile.about = a;
      JC.toast("About saved");
      return a;
    });
  };
  JC.saveDisplayName = function (name) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    var n = String(name == null ? "" : name).trim();
    if (!n) return Promise.reject(new Error("Type a name first."));
    return JC.db.collection("users").doc(JC.currentUser.uid).update({ displayName: n }).then(function () {
      if (JC.userProfile) JC.userProfile.displayName = n;
      JC.toast("Name saved");
      return n;
    });
  };
  function chatIdFor(a, b) { return [a, b].sort().join("_"); }
  JC.chatIdFor = chatIdFor; // calls.js (call history) bhi yehi istemal karta hai.
  JC.getCachedProfile = function (uid) { return otherProfiles[uid] || null; };
  function lastMessagePreview(m) {
    if (!m) return "";
    if (m.type === "image") return "Photo";
    if (m.type === "video") return "Video";
    if (m.type === "voice") return "Voice message";
    if (m.type === "file") return "File: " + (m.mediaName || "");
    return m.text || "";
  }

  // ---------- auth hooks (called from auth.js) ----------
  JC.onSignedIn = function (user, profile) {
    showScreen("screen-list", { replace: true });
    JC.loadProfileScreen();
    if (JC.loadBlockedList) JC.loadBlockedList();
    startChatListListener();
    if (window.JC && JC.startIncomingCallListener) JC.startIncomingCallListener();
  };
  JC.onSignedOut = function () {
    if (listUnsub) { listUnsub(); listUnsub = null; }
    if (typeof clearProfileUnsubs === "function") clearProfileUnsubs();
    closeChat();
    showScreen("screen-login");
  };

  // ---------- chat list ----------
  var profileUnsubs = []; // partner profile live listeners (name/photo updates)
  function clearProfileUnsubs() {
    profileUnsubs.forEach(function (u) { try { u(); } catch (e) {} });
    profileUnsubs = [];
  }
  function startChatListListener() {
    if (!JC.db || !JC.currentUser) return;
    if (listUnsub) listUnsub();
    clearProfileUnsubs();
    listUnsub = JC.db.collection("userChats").doc(JC.currentUser.uid).collection("list")
      .orderBy("lastMessageAt", "desc")
      .onSnapshot(function (snap) {
        var list = $("chatList");
        var empty = $("listEmpty");
        list.innerHTML = "";
        if (snap.empty) { empty.classList.remove("hidden"); return; }
        empty.classList.add("hidden");
        snap.forEach(function (doc) {
          var entry = doc.data();
          var otherUid = entry.otherUid;
          // Blocked contacts: their 1-to-1 chat is hidden from my list.
          // (Groups are NOT filtered — block never applies inside groups.)
          if (entry.type !== "group" && JC.isBlocked && JC.isBlocked(otherUid)) return;
          var row = document.createElement("div");
          row.className = "chat-row";
          row.dataset.chatId = entry.chatId;
          row.dataset.otherUid = otherUid;
          row.innerHTML =
            '<div class="avatar">' + esc(initials("?")) + '</div>' +
            '<div class="info"><div class="top"><span class="name">...</span><span class="time"></span></div>' +
            '<div class="handle"></div>' +
            '<div class="preview"></div></div>' +
            (entry.unreadCount > 0 ? '<span class="badge">' + entry.unreadCount + '</span>' : '');
          row.addEventListener("click", function () {
            if (entry.type === "group") { JC.openGroupChat(entry.groupId || entry.chatId); return; }
            JC.openChat(entry.chatId, otherUid);
          });
          list.appendChild(row);
          if (entry.type === "group") {
            // Group row: group icon + member count, name from the group doc.
            var gav = row.querySelector(".avatar");
            gav.textContent = "G";
            JC.db.collection("groups").doc(entry.groupId || entry.chatId).get().then(function (gSnap) {
              if (!gSnap.exists) return;
              var g = gSnap.data();
              row.querySelector(".name").textContent = g.name || "Group";
              var prev = row.querySelector(".preview");
              prev.textContent = (g.lastMessage || "") + " • " + (g.members || []).length + " members";
              if (entry.unreadCount > 0) prev.classList.add("unread");
              row.querySelector(".time").textContent = fmtTime(g.lastMessageAt);
            });
            return; // no delivered-marking in groups (ticks stop at "sent")
          }
          // Fill in the partner profile + last-message preview.
          // LIVE listener (v4.2): dusre bande ka naam/photo badle to chat
          // list me khud update ho jaye — app dobara kholne ki zaroorat nahi.
          profileUnsubs.push(JC.db.collection("users").doc(otherUid).onSnapshot(function (pSnap) {
            var p = pSnap.exists ? pSnap.data() : { displayName: "Unknown", photoURL: "" };
            otherProfiles[otherUid] = p;
            var av = row.querySelector(".avatar");
            if (av) av.innerHTML = avatarHtml(p);
            var nm = row.querySelector(".name");
            if (nm) nm.textContent = p.displayName || "Unknown";
            // @username hi asli pehchan hai — do "Asif" hon to bhi farq
            // nazar aaye. Gmail wale user ke paas username nahi hota.
            var handle = row.querySelector(".handle");
            if (handle) handle.textContent = p.username ? "@" + p.username : "";
          }));
          JC.db.collection("chats").doc(entry.chatId).get().then(function (cSnap) {
            if (!cSnap.exists) return;
            var c = cSnap.data();
            var prev = row.querySelector(".preview");
            prev.textContent = (c.lastSenderId === JC.currentUser.uid ? "You: " : "") + lastMessagePreview(c);
            if (entry.unreadCount > 0) prev.classList.add("unread");
            row.querySelector(".time").textContent = fmtTime(c.lastMessageAt);
          });
          // Mark this chat's incoming "sent" messages as delivered:
          // the app has now received them, even if the chat is not open.
          markDelivered(entry.chatId);
        });
        // If every chat was filtered out (all blocked), show the empty state.
        if (!list.children.length) empty.classList.remove("hidden");
      }, function (err) {
        JC.toast("Could not load chats: " + err.message);
      });
  }

  // Move incoming messages from "sent" to "delivered" (receiver-only;
  // rules forbid the sender from changing their own message status).
  function markDelivered(chatId) {
    if (!JC.db || !JC.currentUser) return;
    JC.db.collection("chats").doc(chatId).collection("messages")
      .where("status", "==", "sent")
      .get().then(function (snap) {
        snap.forEach(function (doc) {
          var m = doc.data();
          if (m.senderId !== JC.currentUser.uid) {
            doc.ref.update({ status: "delivered" }).catch(function () {});
          }
        });
      }).catch(function () {});
  }

  // ---------- open chat ----------
  JC.openChat = function (chatId, otherUid) {
    if (!JC.db || !JC.currentUser) return;
    if (JC.currentChatIsGroup && JC.closeGroupChat) JC.closeGroupChat();
    JC.currentChatId = chatId;
    JC.currentChatIsGroup = false;
    JC.currentChatOtherUid = otherUid;
    JC.currentChatOther = otherProfiles[otherUid] || null;
    showScreen("screen-chat", { push: true });
    $("messages").innerHTML = "";
    msgEls = {};
    $("msgInput").value = "";
    updateChatHeader();
    // Partner profile (live: online / last seen line).
    if (partnerUnsub) partnerUnsub();
    partnerUnsub = JC.db.collection("users").doc(otherUid).onSnapshot(function (snap) {
      if (snap.exists) {
        JC.currentChatOther = snap.data();
        otherProfiles[otherUid] = JC.currentChatOther;
        updateChatHeader();
      }
    });
    // Messages (live).
    if (chatUnsub) chatUnsub();
    chatUnsub = JC.db.collection("chats").doc(chatId).collection("messages")
      .orderBy("createdAt", "asc")
      .onSnapshot(function (snap) {
        snap.docChanges().forEach(function (ch) {
          // hasPendingWrites: ye message abhi sirf is phone par hai,
          // server tak nahi pahuncha (offline likha gaya) — ghari dikhao.
          var pending = ch.doc.metadata && ch.doc.metadata.hasPendingWrites;
          if (ch.type === "added") renderMessage(ch.doc.id, ch.doc.data(), true, pending);
          if (ch.type === "modified") updateMessageTicks(ch.doc.id, ch.doc.data(), pending);
        });
        scrollMessagesToBottom();
        markRead(chatId);
      });
    // Reset my unread badge for this chat.
    JC.db.collection("userChats").doc(JC.currentUser.uid).collection("list").doc(chatId)
      .set({ unreadCount: 0 }, { merge: true }).catch(function () {});
    markDelivered(chatId);
  };

  function updateChatHeader() {
    var p = JC.currentChatOther;
    $("chatName").textContent = p ? (p.displayName || "Unknown") : "...";
    $("chatStatus").textContent = p ? fmtLastSeen(p) : "";
    $("chatAvatar").innerHTML = avatarHtml(p);
    // Private-chat notice — naam aate hi update ho jata hai.
    var notice = $("e2eNotice");
    if (notice && !JC.currentChatIsGroup) {
      notice.textContent = "Messages are private. Only you and " + (p && p.displayName ? p.displayName : "this person") + " can read this chat.";
    }
  }

  function closeChat() {
    if (JC.currentChatIsGroup && JC.closeGroupChat) JC.closeGroupChat();
    JC.currentChatId = null;
    JC.currentChatIsGroup = false;
    JC.currentChatOtherUid = null;
    JC.currentChatOther = null;
    if (chatUnsub) { chatUnsub(); chatUnsub = null; }
    if (partnerUnsub) { partnerUnsub(); partnerUnsub = null; }
  }
  JC.closeChat = closeChat;

  // Mark incoming messages "read" while the chat is open (receiver-only).
  function markRead(chatId) {
    if (!JC.db || !JC.currentUser) return;
    JC.db.collection("chats").doc(chatId).collection("messages")
      .where("status", "!=", "read")
      .get().then(function (snap) {
        snap.forEach(function (doc) {
          var m = doc.data();
          if (m.senderId !== JC.currentUser.uid) {
            doc.ref.update({ status: "read" }).catch(function () {});
          }
        });
      }).catch(function () {});
  }

  // ---------- render messages ----------
  function tickHtml(status, isOut) {
    if (!isOut) return "";
    if (status === "read") return '<span class="ticks read">&#10003;&#10003;</span>';
    if (status === "delivered") return '<span class="ticks">&#10003;&#10003;</span>';
    return '<span class="ticks">&#10003;</span>';
  }
  function renderMessage(msgId, m, scroll, pending) {
    if (msgEls[msgId]) return;
    var isOut = m.senderId === JC.currentUser.uid;
    var div = document.createElement("div");
    div.className = "msg " + (isOut ? "out" : "in");
    var body = "";
    if (m.type === "text") {
      body = esc(m.text || "");
    } else if (m.type === "image") {
      body = '<img class="bubble-img" src="' + esc(m.mediaUrl || "") + '" alt="Photo">' + (m.text ? "<div>" + esc(m.text) + "</div>" : "");
    } else if (m.type === "video") {
      body = '<video class="bubble-video" src="' + esc(m.mediaUrl || "") + '" controls playsinline></video>' + (m.text ? "<div>" + esc(m.text) + "</div>" : "");
    } else if (m.type === "voice") {
      body = '<div class="voice-line"><audio src="' + esc(m.mediaUrl || "") + '" controls preload="metadata"></audio><span>' + (m.durationSec || 0) + 's</span></div>';
    } else if (m.type === "file") {
      body = '<div class="file-chip"><span class="file-icon">&#128196;</span><a href="' + esc(m.mediaUrl || "") + '" target="_blank" rel="noopener">' + esc(m.mediaName || "File") + "</a></div>";
    }
    // Pending (offline likha gaya, server tak nahi pahuncha): ghari
    // dikhao, tick nahi — taake pata chale ke message abhi gaya nahi,
    // queue me hai. Net aate hi tick aa jayega.
    var metaHtml = fmtTime(m.createdAt);
    if (pending && isOut) metaHtml += '<span class="ticks pending">&#128336;</span>';
    else metaHtml += tickHtml(m.status, isOut);
    div.innerHTML = body + '<div class="meta">' + metaHtml + "</div>";
    var img = div.querySelector("img.bubble-img");
    if (img) {
      img.addEventListener("click", function () { JC.openViewer("image", m.mediaUrl); });
      // Storage files auto-delete 3 days after upload (GCS lifecycle).
      // The message text stays, the mediaUrl then 404s — show a note,
      // never a broken image or a crash.
      img.addEventListener("error", function () { JC.mediaGone(img); });
    }
    var vid = div.querySelector("video.bubble-video");
    if (vid) {
      vid.addEventListener("click", function () { JC.openViewer("video", m.mediaUrl); });
      vid.addEventListener("error", function () { JC.mediaGone(vid); });
    }
    var aud = div.querySelector("audio");
    if (aud) aud.addEventListener("error", function () { JC.mediaGone(aud); });
    $("messages").appendChild(div);
    msgEls[msgId] = div;
  }
  function updateMessageTicks(msgId, m, pending) {
    var el = msgEls[msgId];
    if (!el) return;
    var meta = el.querySelector(".meta");
    if (!meta) return;
    var isOut = m.senderId === JC.currentUser.uid;
    if (pending && isOut) meta.innerHTML = fmtTime(m.createdAt) + '<span class="ticks pending">&#128336;</span>';
    else meta.innerHTML = fmtTime(m.createdAt) + tickHtml(m.status, isOut);
  }
  function scrollMessagesToBottom() {
    var box = $("messages");
    box.scrollTop = box.scrollHeight;
  }

  // ---------- send ----------
  // A message counts as sent ONLY after the Storage upload AND the
  // Firestore message write both succeed. Nothing is shown as sent before.
  JC.sendMessage = function (data) {
    if (!JC.db || !JC.currentUser || !JC.currentChatId) return Promise.reject(new Error("no-chat-open"));
    var chatId = JC.currentChatId;
    var otherUid = JC.currentChatOtherUid;
    var msg = {
      senderId: JC.currentUser.uid,
      type: data.type,
      text: data.text || "",
      mediaUrl: data.mediaUrl || "",
      mediaName: data.mediaName || "",
      durationSec: data.durationSec || 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "sent"
    };
    // Strip empty media fields so the document stays clean.
    if (!msg.mediaUrl) delete msg.mediaUrl;
    if (!msg.mediaName) delete msg.mediaName;
    if (!msg.durationSec) delete msg.durationSec;
    var preview = lastMessagePreview(msg);
    return JC.db.collection("chats").doc(chatId).collection("messages").add(msg).then(function () {
      var chatRef = JC.db.collection("chats").doc(chatId);
      return chatRef.update({
        lastMessage: preview,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastSenderId: JC.currentUser.uid
      }).then(function () {
        // Bump the receiver's unread badge.
        return JC.db.collection("userChats").doc(otherUid).collection("list").doc(chatId)
          .set({
            chatId: chatId,
            otherUid: JC.currentUser.uid,
            unreadCount: firebase.firestore.FieldValue.increment(1),
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
      });
    });
  };

  function sendText() {
    var input = $("msgInput");
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    updateComposer();
    JC.sendCurrentMessage({ type: "text", text: text }).catch(function (e) {
      // Neutral on purpose: never say why a send failed, so a blocked
      // sender cannot tell they were blocked.
      JC.toast("Message nahi bheja ja saka.");
      input.value = text;
      updateComposer();
    });
  }

  // ---------- media upload (photo / video / file) ----------
  // PHOTOS ARE SHRUNK BEFORE UPLOAD (storage saving): canvas resize to
  // max side 1280px, JPEG quality 0.8. Video has no real compression in
  // plain JS, so videos upload as-is but are capped at 50 MB.
  JC.compressImage = function (file, done) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var w = img.naturalWidth, h = img.naturalHeight;
      var scale = Math.min(1, 1280 / Math.max(w, h));
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        if (blob) done(blob);
        else done(file); // fallback: send the original if resize failed
      }, "image/jpeg", 0.8);
    };
    img.onerror = function () { URL.revokeObjectURL(url); done(file); };
    img.src = url;
  };

  JC.sendFile = function (file) {
    if (!file || !JC.currentChatId) return;
    var kind = file.type.indexOf("image/") === 0 ? "image"
      : file.type.indexOf("video/") === 0 ? "video" : "file";
    if (kind === "video" && file.size > 50 * 1024 * 1024) {
      JC.toast("Video is too big — 50 MB se bara video nahi bheja ja sakta. Please send a shorter video.");
      return;
    }
    if (kind === "image") {
      JC.compressImage(file, function (small) { uploadMediaFile(small, "image", file.name); });
    } else {
      uploadMediaFile(file, kind, file.name);
    }
  };

  function uploadMediaFile(file, kind, originalName) {
    var chatId = JC.currentChatId;
    var safeName = Date.now() + "_" + originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    var ref = JC.storage.ref(JC.mediaPathForCurrentChat(safeName));
    var task = ref.put(file, { contentType: file.type || "application/octet-stream" });
    var bar = $("uploadBar");
    task.on("state_changed", function (snap) {
      var pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      bar.textContent = "Uploading " + originalName + " — " + pct + "%";
      bar.classList.add("show");
    }, function (err) {
      bar.classList.remove("show");
      JC.toast("Upload failed: " + err.message);
    }, function () {
      task.snapshot.ref.getDownloadURL().then(function (url) {
        bar.classList.remove("show");
        // Only now, after upload + write, is the message "sent".
        return JC.sendCurrentMessage({ type: kind, mediaUrl: url, mediaName: originalName });
      }).then(function () {
        JC.toast("Sent");
      }).catch(function (e) {
        JC.toast("Message nahi bheja ja saka.");
      });
    });
  };

  // ---------- voice messages ----------
  var recorder = null, recChunks = [], recTimer = null, recSeconds = 0, recStream = null;
  function pickMimeType() {
    // Probe order from recon: opus webm first. NEVER request audio/mp4 —
    // Chrome's MediaRecorder on Android does not reliably produce it.
    if (typeof MediaRecorder === "undefined") return "";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    return "";
  }
  JC.startVoiceRecord = function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      JC.toast("Voice recording is not supported on this device.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      recStream = stream;
      var opts = {};
      var mt = pickMimeType();
      if (mt) opts.mimeType = mt;
      try { recorder = new MediaRecorder(stream, opts); }
      catch (e) { JC.toast("Recording failed to start: " + e.message); stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      recChunks = [];
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
      recorder.onstop = function () { finishVoiceRecord(); };
      recorder.start();
      recSeconds = 0;
      $("recTime").textContent = "0:00";
      $("recBar").classList.add("show");
      recTimer = setInterval(function () {
        recSeconds++;
        $("recTime").textContent = Math.floor(recSeconds / 60) + ":" + (recSeconds % 60 < 10 ? "0" : "") + (recSeconds % 60);
      }, 1000);
    }).catch(function (e) {
      JC.toast("Microphone blocked: " + e.message + ". Allow microphone permission in the app settings.");
    });
  };
  JC.stopVoiceRecord = function (send) {
    if (recorder && recorder.state !== "inactive") {
      recorder._sendAfterStop = !!send;
      recorder.stop();
    }
    if (recTimer) { clearInterval(recTimer); recTimer = null; }
    $("recBar").classList.remove("show");
    if (recStream) { recStream.getTracks().forEach(function (t) { t.stop(); }); recStream = null; }
  };
  function finishVoiceRecord() {
    var send = recorder && recorder._sendAfterStop;
    var type = (recorder && recorder.mimeType) || "audio/webm";
    var blob = new Blob(recChunks, { type: type });
    recChunks = [];
    if (!send || !blob.size) return;
    if (!JC.currentChatId) { JC.toast("Open a chat first."); return; }
    var chatId = JC.currentChatId;
    var name = Date.now() + ".webm";
    // Voice in groups goes under group-media/ (see mediaPathForCurrentChat);
    // 1-to-1 voice stays under voice/.
    var ref = JC.currentChatIsGroup
      ? JC.storage.ref(JC.mediaPathForCurrentChat("voice_" + name))
      : JC.storage.ref("voice/" + chatId + "/" + name);
    var bar = $("uploadBar");
    var task = ref.put(blob, { contentType: type });
    task.on("state_changed", function (snap) {
      var pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      bar.textContent = "Uploading voice message — " + pct + "%";
      bar.classList.add("show");
    }, function (err) {
      bar.classList.remove("show");
      JC.toast("Voice upload failed: " + err.message);
    }, function () {
      task.snapshot.ref.getDownloadURL().then(function (url) {
        bar.classList.remove("show");
        return JC.sendCurrentMessage({ type: "voice", mediaUrl: url, mediaName: name, durationSec: recSeconds });
      }).then(function () { JC.toast("Voice message sent"); })
        .catch(function (e) { JC.toast("Message nahi bheja ja saka."); });
    });
  }

  // ---------- new chat: find a user by Gmail ----------
  JC.searchUserByGmail = function (gmail) {
    if (!JC.db) return Promise.reject(new Error("firebase-not-configured"));
    return JC.db.collection("users").where("gmail", "==", gmail.toLowerCase()).limit(1).get()
      .then(function (snap) {
        if (snap.empty) return null;
        var doc = snap.docs[0];
        return { uid: doc.id, data: doc.data() };
      });
  };
  // ---------- new chat: find a user by exact @username ----------
  // Sirf POORA username — partial match ya naam se search NAHI hoti.
  // usernames/{username} claim doc se uid nikalo, phir profile parho.
  // Koi "Asif" likh kar logon ki list nahi nikal sakta.
  JC.searchUserByUsername = function (username) {
    if (!JC.db) return Promise.reject(new Error("firebase-not-configured"));
    var raw = String(username || "").trim().replace(/^@/, "");
    var v = null;
    if (JC.validateUsername) v = JC.validateUsername(raw);
    else v = /^[a-z0-9_]{3,20}$/.test(raw.toLowerCase()) ? { ok: true, username: raw.toLowerCase() } : { ok: false, error: "Username ghalat hai." };
    if (!v.ok) return Promise.reject(new Error(v.error));
    return JC.db.collection("usernames").doc(v.username).get().then(function (snap) {
      if (!snap.exists) return null;
      var uid = (snap.data() || {}).uid;
      if (!uid) return null;
      return JC.db.collection("users").doc(uid).get().then(function (pSnap) {
        if (!pSnap.exists) return null;
        return { uid: uid, data: pSnap.data() };
      });
    });
  };

  // Search result dikhao — Gmail aur @username dono ke liye aik hi jagah.
  // Self-check (uid + Gmail) aur friendly "Ye aap khud hain" yahin hai.
  // NOTE: naam se search yahan kabhi nahi aati — sirf exact @username
  // ya exact Gmail (user ka hukm 2026-11-22).
  // v4.0: button ka label state par depend karta hai — chat maujood ho to
  // "Chat", warna "Send request" (request jati hai, seedha chat nahi banta);
  // pending request ho to "Request sent" (disabled) ya "View request".
  function renderSearchResult(found, box, label) {
    if (!found) {
      box.innerHTML = "<p style='margin-top:12px;'>No Jilan Chat user found for <b>" + esc(label) + "</b>.</p>";
      return;
    }
    // Khud se chat nahi — uid se bhi check, Gmail se bhi, taake koi
    // bhi rasta khud tak na pahunche. Friendly message, koi error nahi.
    if (found.uid === JC.currentUser.uid
      || (found.data.gmail && JC.currentUser.email
        && found.data.gmail.toLowerCase() === String(JC.currentUser.email).toLowerCase())) {
      box.innerHTML = "<p style='margin-top:12px;'>Ye aap khud hain — apne aap se chat nahi kar sakte.</p>";
      return;
    }
    // Maine is ko block kiya hai to request nahi — pehle unblock karna pare ga.
    if (JC.isBlocked && JC.isBlocked(found.uid)) {
      box.innerHTML = "<p style='margin-top:12px;'>You blocked this contact — unblock from Settings to send a request.</p>";
      return;
    }
    box.innerHTML = "<p style='margin-top:12px;color:#667781;'>Checking&hellip;</p>";
    var chatId = chatIdFor(JC.currentUser.uid, found.uid);
    Promise.all([
      JC.db.collection("chats").doc(chatId).get(),
      JC.db.collection("chatRequests").doc(chatId).get()
    ]).then(function (results) {
      var state = {
        chatExists: results[0].exists,
        request: results[1].exists ? results[1].data() : null,
        me: JC.currentUser.uid
      };
      var action = JC.decideChatAction
        ? JC.decideChatAction(state)
        : (state.chatExists ? "open" : "send");
      var labelMap = { "open": "Chat", "send": "Send request", "already-sent": "Request sent", "incoming": "View request", "resend": "Send request", "create": "Chat" };
      var btnLabel = labelMap[action] || "Send request";
      var disabled = action === "already-sent" ? " disabled" : "";
      box.innerHTML =
        '<div class="user-result"><div class="avatar">' + avatarHtml(found.data) + '</div>' +
        '<div class="info"><div class="name">' + esc(found.data.displayName || "Unknown") + '</div>' +
        '<div class="gmail">' + esc(found.data.username ? "@" + found.data.username : (found.data.gmail || "")) + '</div>' +
        '<div class="gmail" style="font-style:italic;">' + esc(JC.aboutOf(found.data)) + '</div></div>' +
        '<button class="btn btn-primary btn-small" id="btnStartChat"' + disabled + '>' + btnLabel + '</button></div>';
      if (action === "already-sent") return;
      $("btnStartChat").addEventListener("click", function () {
        if (action === "incoming") { JC.openRequests(); return; }
        JC.requestOrOpenChat(found.uid).then(function (res) {
          if (!res) return;
          if (res.action === "sent") JC.toast("Request sent");
          else if (res.action === "already-sent") JC.toast("Request already sent");
          else if (res.action === "incoming") JC.toast("You already have a request from this person — check Requests.");
        }).catch(function (e) {
          if (e && e.message === "cannot-chat-with-self") {
            JC.toast("Ye aap khud hain — apne aap se chat nahi kar sakte.");
          } else if (e && e.message === "you-blocked-them") {
            JC.toast("You blocked this contact. Unblock to send a request.");
          } else if (e && e.message === "request-already-sent") {
            JC.toast("Request already sent");
          } else if (e && e.message === "incoming-request-pending") {
            JC.openRequests();
          } else {
            // Neutral on purpose: kabhi block ka pata na chale.
            JC.toast("Request nahi bheji ja saki.");
          }
        });
      });
    }).catch(function (e) {
      box.innerHTML = "<p style='color:#ea0038;margin-top:12px;'>Could not check: " + esc(e.message) + "</p>";
    });
  }

  // v4.0: Chat dabane se seedha chat NAHI banta — request jati hai.
  // (requestOrOpenChat requests.js me hai; chat tab banti hai jab dusra
  // banda Accept kare. Rules bhi yehi enforce karti hain.)
  JC.startChatWith = function (otherUid) {
    if (JC.requestOrOpenChat) return JC.requestOrOpenChat(otherUid);
    return Promise.reject(new Error("requests-not-loaded"));
  };

  // ---------- profile screen (v4.2: username read-only + About + photo) ----------
  // Username PERMANENT hai — kabhi edit nahi hota, sirf dikhta hai (+ Copy).
  // Gmail wale user ka username nahi hota — us ka Gmail dikhta hai.
  JC.loadProfileScreen = function () {
    var p = JC.userProfile;
    if (!p && JC.db && JC.currentUser) {
      // Profile abhi load nahi hui (v4.0 fallback case) — aik dafa parho.
      JC.db.collection("users").doc(JC.currentUser.uid).get().then(function (snap) {
        if (snap.exists) { JC.userProfile = snap.data(); JC.loadProfileScreen(); }
      }).catch(function () {});
      return;
    }
    if (!p) return;
    $("profileAvatar").innerHTML = avatarHtml(p, true);
    $("profileName").value = p.displayName || "";
    var uEl = $("profileUsername"), copyBtn = $("btnCopyUsername");
    if (p.username) {
      if (uEl) uEl.textContent = "@" + p.username;
      if (copyBtn) copyBtn.classList.remove("hidden");
    } else {
      if (uEl) uEl.textContent = "No username — this account uses Gmail.";
      if (copyBtn) copyBtn.classList.add("hidden");
    }
    $("profileGmail").textContent = p.gmail || (JC.currentUser && JC.currentUser.email) || "—";
    var aboutEl = $("profileAbout");
    if (aboutEl) aboutEl.value = (p.about || "").trim();
    var cnt = $("aboutCount");
    if (cnt) cnt.textContent = String((p.about || "").trim().length);
    // Status screen ka apna avatar bhi yahin se fresh rakho.
    var myAv = $("myStatusAvatar");
    if (myAv) myAv.innerHTML = p.photoURL ? '<img src="' + esc(p.photoURL) + '" alt="">' : esc((p.displayName || "?")[0] || "?");
  };

  // Replaces a dead media element (Storage file deleted after 3 days)
  // with a plain note. Chat TEXT is never deleted — only the media file.
  JC.mediaGone = function (el) {
    if (!el || !el.parentNode) return;
    var note = document.createElement("div");
    note.style.cssText = "color:#667781;font-style:italic;font-size:13px;padding:6px 2px;";
    note.textContent = "Media delete ho gaya";
    el.parentNode.replaceChild(note, el);
  };

  // ---------- media viewer ----------
  JC.openViewer = function (kind, url) {
    var v = $("viewer");
    var img = $("viewerImg"), vid = $("viewerVideo");
    if (kind === "image") {
      img.src = url; img.classList.remove("hidden"); vid.classList.add("hidden"); vid.pause();
    } else {
      vid.src = url; vid.classList.remove("hidden"); img.classList.add("hidden");
    }
    v.classList.add("show");
  };

  // ---------- composer: mic button vs send button ----------
  function updateComposer() {
    var hasText = ($("msgInput").value || "").trim().length > 0;
    $("btnSend").classList.toggle("hidden", !hasText);
    $("btnMic").classList.toggle("hidden", hasText);
  }

  // ---------- wire UI ----------
  document.addEventListener("DOMContentLoaded", function () {
    // ---------- bottom tabs: Chats / Calls / Updates ----------
    document.querySelectorAll("#tabBar .tab-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var tab = b.getAttribute("data-tab");
        if (tab === "chats") showScreen("screen-list");
        else if (tab === "calls") { if (JC.loadCallHistory) JC.loadCallHistory(); showScreen("screen-calls"); }
        else if (tab === "updates") showScreen("screen-status");
      });
    });
    var btnCallsBack = $("btnCallsBack");
    if (btnCallsBack) btnCallsBack.addEventListener("click", function () { JC.goBack(); });

    // ---------- chat list search (LOCAL filter only) ----------
    // Ye sirf apni pehle se khuli chats ko filter karta hai — server par
    // naam se search kabhi nahi hoti (user ka hukm 2026-11-22).
    var chatSearchInput = $("chatSearchInput");
    if (chatSearchInput) {
      chatSearchInput.addEventListener("input", function () {
        var q = (chatSearchInput.value || "").trim().toLowerCase();
        document.querySelectorAll("#chatList .chat-row").forEach(function (row) {
          var name = (row.querySelector(".name") || {}).textContent || "";
          var handle = (row.querySelector(".handle") || {}).textContent || "";
          row.style.display = (!q || (name + " " + handle).toLowerCase().indexOf(q) >= 0) ? "" : "none";
        });
      });
    }

    // ---------- emoji panel ----------
    var EMOJIS = ["😀","😂","😊","😍","😘","😎","🤔","😢","😭","😡","👍","👎","🙏","👏","🎉","❤️","🔥","⭐","✅","❌","💐","🌹","🤲","🕌"];
    var emojiPanel = $("emojiPanel");
    if (emojiPanel) {
      emojiPanel.innerHTML = EMOJIS.map(function (e) { return "<span>" + e + "</span>"; }).join("");
      emojiPanel.addEventListener("click", function (ev) {
        var t = ev.target;
        if (t && t.tagName === "SPAN") {
          var input = $("msgInput");
          input.value = (input.value || "") + t.textContent;
          input.focus();
          updateComposer();
        }
      });
    }
    var btnEmoji = $("btnEmoji");
    if (btnEmoji) btnEmoji.addEventListener("click", function () {
      if (emojiPanel) emojiPanel.classList.toggle("hidden");
    });

    $("btnProfile").addEventListener("click", function () { JC.loadProfileScreen(); showScreen("screen-profile", { push: true }); });
    $("btnProfileBack").addEventListener("click", function () { JC.goBack(); });
    $("btnNewChat").addEventListener("click", function () { showScreen("screen-newchat", { push: true }); });
    $("btnNewChatBack").addEventListener("click", function () { JC.goBack(); });
    $("btnBack").addEventListener("click", function () { JC.goBack(); });
    $("msgInput").addEventListener("input", updateComposer);
    $("msgInput").addEventListener("keydown", function (e) { if (e.key === "Enter") sendText(); });
    $("btnSend").addEventListener("click", sendText);
    $("btnMic").addEventListener("click", function () { JC.startVoiceRecord(); });
    $("btnRecCancel").addEventListener("click", function () { JC.stopVoiceRecord(false); JC.toast("Voice message cancelled"); });
    // Tap the red recording bar to stop and send.
    $("recBar").addEventListener("click", function (e) {
      if (e.target.id === "btnRecCancel") return;
      JC.stopVoiceRecord(true);
    });
    $("btnAttach").addEventListener("click", function () { $("fileInput").click(); });
    $("fileInput").addEventListener("change", function () {
      var f = $("fileInput").files && $("fileInput").files[0];
      if (f) JC.sendFile(f);
      $("fileInput").value = "";
    });
    $("btnCamera").addEventListener("click", function () {
      if (window.JC && JC.openCamera) JC.openCamera();
    });
    $("viewerClose").addEventListener("click", function () {
      $("viewer").classList.remove("show");
      $("viewerVideo").pause();
      $("viewerVideo").removeAttribute("src");
      $("viewerImg").removeAttribute("src");
    });
    $("btnSearch").addEventListener("click", function () {
      var gmail = ($("searchInput").value || "").trim().toLowerCase();
      var box = $("searchResult");
      if (!gmail || gmail.indexOf("@") < 0) { box.innerHTML = "<p style='color:#ea0038;margin-top:12px;'>Type a valid Gmail address.</p>"; return; }
      box.innerHTML = "<p style='margin-top:12px;color:#667781;'>Searching&hellip;</p>";
      JC.searchUserByGmail(gmail).then(function (found) {
        renderSearchResult(found, box, gmail);
      }).catch(function (e) {
        box.innerHTML = "<p style='color:#ea0038;margin-top:12px;'>Search failed: " + esc(e.message) + "</p>";
      });
    });
    // Exact @username search — poora username likhna pare ga; naam se
    // search nahi hoti (user ka hukm 2026-11-22).
    var btnSearchUsername = $("btnSearchUsername");
    if (btnSearchUsername) {
      btnSearchUsername.addEventListener("click", function () {
        var u = ($("searchUsernameInput").value || "").trim();
        var box = $("searchResult");
        if (!u) { box.innerHTML = "<p style='color:#ea0038;margin-top:12px;'>Type a username first.</p>"; return; }
        box.innerHTML = "<p style='margin-top:12px;color:#667781;'>Searching&hellip;</p>";
        JC.searchUserByUsername(u).then(function (found) {
          renderSearchResult(found, box, u.charAt(0) === "@" ? u : "@" + u);
        }).catch(function (e) {
          box.innerHTML = "<p style='color:#ea0038;margin-top:12px;'>Search failed: " + esc(e.message) + "</p>";
        });
      });
    }
    $("btnSaveName").addEventListener("click", function () {
      JC.saveDisplayName($("profileName").value).catch(function (e) { JC.toast(e.message || "Save failed"); });
    });
    // ---------- profile v4.2: About + photo + username copy ----------
    var aboutEl = $("profileAbout");
    if (aboutEl) aboutEl.addEventListener("input", function () {
      var cnt = $("aboutCount");
      if (cnt) cnt.textContent = String((aboutEl.value || "").length);
    });
    $("btnSaveAbout").addEventListener("click", function () {
      JC.saveAbout($("profileAbout").value).catch(function (e) { JC.toast(e.message || "Save failed"); });
    });
    var photoInput = $("profilePhotoInput");
    $("btnChangePhoto").addEventListener("click", function () { if (photoInput) photoInput.click(); });
    $("profileAvatar").addEventListener("click", function () { if (photoInput) photoInput.click(); });
    if (photoInput) photoInput.addEventListener("change", function () {
      var f = photoInput.files && photoInput.files[0];
      if (f) JC.saveProfilePhoto(f).catch(function (e) { JC.toast(e.message || "Photo update failed"); });
      photoInput.value = "";
    });
    $("btnRemovePhoto").addEventListener("click", function () {
      JC.removeProfilePhoto().catch(function (e) { JC.toast(e.message || "Remove failed"); });
    });
    $("btnCopyUsername").addEventListener("click", function () {
      var u = JC.userProfile && JC.userProfile.username ? "@" + JC.userProfile.username : "";
      if (!u) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(u).then(function () { JC.toast("Username copied"); })
          .catch(function () { JC.toast(u); });
      } else JC.toast(u);
    });
    // NO logout button in this app (v4.0, user ka sakht hukm): logout
    // ka koi rasta nahi — is liye is button ka listener yahan maujood
    // hi nahi hai.
    updateComposer();

    // Offline banner (v4.0): net na ho to batado — message likhe ja
    // sakte hain, net aate hi khud chale jayenge (Firestore queue).
    function updateOfflineBar() {
      var off = !navigator.onLine;
      document.querySelectorAll(".offline-bar").forEach(function (b) {
        b.classList.toggle("hidden", !off);
      });
    }
    window.addEventListener("online", updateOfflineBar);
    window.addEventListener("offline", updateOfflineBar);
    updateOfflineBar();
  });
})();
