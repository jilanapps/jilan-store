// Jilan Chat v1.0 — app.js
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
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    var el = $(id);
    if (el) el.classList.add("active");
  }
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
  function chatIdFor(a, b) { return [a, b].sort().join("_"); }
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
    showScreen("screen-list");
    JC.loadProfileScreen();
    if (JC.loadBlockedList) JC.loadBlockedList();
    startChatListListener();
    if (window.JC && JC.startIncomingCallListener) JC.startIncomingCallListener();
  };
  JC.onSignedOut = function () {
    if (listUnsub) { listUnsub(); listUnsub = null; }
    closeChat();
    showScreen("screen-login");
  };

  // ---------- chat list ----------
  function startChatListListener() {
    if (!JC.db || !JC.currentUser) return;
    if (listUnsub) listUnsub();
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
          JC.db.collection("users").doc(otherUid).get().then(function (pSnap) {
            var p = pSnap.exists ? pSnap.data() : { displayName: "Unknown", photoURL: "" };
            otherProfiles[otherUid] = p;
            var av = row.querySelector(".avatar");
            av.innerHTML = avatarHtml(p);
            row.querySelector(".name").textContent = p.displayName || "Unknown";
          });
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
    showScreen("screen-chat");
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
          if (ch.type === "added") renderMessage(ch.doc.id, ch.doc.data(), true);
          if (ch.type === "modified") updateMessageTicks(ch.doc.id, ch.doc.data());
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
  function renderMessage(msgId, m, scroll) {
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
    div.innerHTML = body + '<div class="meta">' + fmtTime(m.createdAt) + tickHtml(m.status, isOut) + "</div>";
    var img = div.querySelector("img.bubble-img");
    if (img) {
      img.addEventListener("click", function () { JC.openViewer("image", m.mediaUrl); });
      // Storage files auto-delete 30 days after upload (GCS lifecycle).
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
  function updateMessageTicks(msgId, m) {
    var el = msgEls[msgId];
    if (!el) return;
    var meta = el.querySelector(".meta");
    if (meta) meta.innerHTML = fmtTime(m.createdAt) + tickHtml(m.status, m.senderId === JC.currentUser.uid);
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
  JC.startChatWith = function (otherUid) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    var me = JC.currentUser.uid;
    if (otherUid === me) return Promise.reject(new Error("cannot-chat-with-self"));
    var chatId = chatIdFor(me, otherUid);
    var chatRef = JC.db.collection("chats").doc(chatId);
    return chatRef.get().then(function (snap) {
      if (!snap.exists) {
        return chatRef.set({
          participants: [me, otherUid].sort(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessage: "",
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastSenderId: me
        });
      }
    }).then(function () {
      var now = firebase.firestore.FieldValue.serverTimestamp();
      var mine = JC.db.collection("userChats").doc(me).collection("list").doc(chatId)
        .set({ chatId: chatId, otherUid: otherUid, unreadCount: 0, lastMessageAt: now }, { merge: true });
      var theirs = JC.db.collection("userChats").doc(otherUid).collection("list").doc(chatId)
        .set({ chatId: chatId, otherUid: me, unreadCount: 0, lastMessageAt: now }, { merge: true });
      return Promise.all([mine, theirs]);
    }).then(function () {
      JC.openChat(chatId, otherUid);
    });
  };

  // ---------- profile screen ----------
  JC.loadProfileScreen = function () {
    var p = JC.userProfile;
    if (!p) return;
    $("profileAvatar").innerHTML = avatarHtml(p, true);
    $("profileName").value = p.displayName || "";
    $("profileGmail").textContent = p.gmail || (JC.currentUser && JC.currentUser.email) || "";
  };

  // Replaces a dead media element (Storage file deleted after 30 days)
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
    $("btnProfile").addEventListener("click", function () { JC.loadProfileScreen(); showScreen("screen-profile"); });
    $("btnProfileBack").addEventListener("click", function () { showScreen("screen-list"); });
    $("btnNewChat").addEventListener("click", function () { showScreen("screen-newchat"); });
    $("btnNewChatBack").addEventListener("click", function () { showScreen("screen-list"); });
    $("btnBack").addEventListener("click", function () { closeChat(); showScreen("screen-list"); });
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
        if (!found) {
          box.innerHTML = "<p style='margin-top:12px;'>No Jilan Chat user found for <b>" + esc(gmail) + "</b>.</p>";
          return;
        }
        if (found.uid === JC.currentUser.uid) {
          box.innerHTML = "<p style='margin-top:12px;'>That is your own Gmail.</p>";
          return;
        }
        box.innerHTML =
          '<div class="user-result"><div class="avatar">' + avatarHtml(found.data) + '</div>' +
          '<div class="info"><div class="name">' + esc(found.data.displayName || "Unknown") + '</div>' +
          '<div class="gmail">' + esc(found.data.gmail || "") + '</div></div>' +
          '<button class="btn btn-primary btn-small" id="btnStartChat">Chat</button></div>';
        $("btnStartChat").addEventListener("click", function () {
          JC.startChatWith(found.uid).catch(function (e) { JC.toast("Could not start chat: " + e.message); });
        });
      }).catch(function (e) {
        box.innerHTML = "<p style='color:#ea0038;margin-top:12px;'>Search failed: " + esc(e.message) + "</p>";
      });
    });
    $("btnSaveName").addEventListener("click", function () {
      var name = ($("profileName").value || "").trim();
      if (!name || !JC.db || !JC.currentUser) return;
      JC.db.collection("users").doc(JC.currentUser.uid).update({ displayName: name }).then(function () {
        JC.userProfile.displayName = name;
        JC.toast("Name saved");
      }).catch(function (e) { JC.toast("Save failed: " + e.message); });
    });
    $("btnSignOut").addEventListener("click", function () {
      JC.signOut().then(function () { JC.toast("Signed out"); });
    });
    updateComposer();
  });
})();
