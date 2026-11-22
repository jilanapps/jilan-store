// Jilan Chat v4.5 — extras.js (FREE Spark only, no Storage, no Blaze)
// Professional chat features, user order 2026-11-22 13:40:
//  - long-press message -> labelled action sheet (Reply, React, Forward,
//    Copy, Delete -> Delete for me / Delete for everyone); swipe right on a message -> Reply
//  - reply / quote, forward to existing chats, emoji reactions (6 quick)
//  - delete for everyone (sender only -> "This message was deleted")
//  - "typing..." in 1-to-1 chats (throttled: max 1 write / 4 s)
//  - dark mode (System / Light / Dark) + chat wallpaper (per device)
//  - pin chat (max 3, top of list) + mute chat (no in-app tone)
// Device-only settings (theme, wallpaper, pins, mutes) are saved on this
// phone (localStorage) — nothing extra goes to Firebase for them.
(function () {
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uid() { return JC.currentUser && JC.currentUser.uid; }
  function fv() { return window.firebase && firebase.firestore && firebase.firestore.FieldValue; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem("jc_" + k) || "null"); localStorage.setItem("jc_" + k, JSON.stringify(v)); } catch (e) { return null; } }

  JC.QUICK_REACTIONS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"];
  JC.MAX_PINS = 3;
  JC.TYPING_THROTTLE_MS = 4000;
  JC.TYPING_SHOW_MS = 6000;
  JC.DELETED_TEXT = "This message was deleted";

  // ---------- message preview text ----------
  function previewOf(m) {
    if (!m) return "";
    if (m.deleted) return JC.DELETED_TEXT;
    if (m.type === "image") return "Photo";
    if (m.type === "voice") return "Voice message";
    if (m.type === "video") return "Video";
    if (m.type === "file") return "File";
    return m.text || "";
  }
  JC.messagePreviewText = previewOf;

  // ---------- per-message state + decoration ----------
  var msgData = {};   // msgId -> { m, isGroup, el }
  function msgRef(msgId, isGroup) {
    var col = isGroup ? "groups" : "chats";
    return JC.db.collection(col).doc(JC.currentChatId).collection("messages").doc(msgId);
  }
  // ---------- delete for me (this phone only, no Firestore write) ----------
  JC.HIDDEN_CAP = 2000;
  function hiddenKey(chatId) { return "jilanchat-hidden-" + chatId; }
  JC.getHiddenIds = function (chatId) {
    try { var a = JSON.parse(localStorage.getItem(hiddenKey(chatId)) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  };
  JC.isHiddenMessage = function (chatId, msgId) {
    return !!chatId && JC.getHiddenIds(chatId).indexOf(msgId) >= 0;
  };
  JC.deleteForMe = function (msgId) {
    var chatId = JC.currentChatId; if (!chatId || !msgId) return;
    var a = JC.getHiddenIds(chatId);
    if (a.indexOf(msgId) < 0) a.push(msgId);
    if (a.length > JC.HIDDEN_CAP) a = a.slice(a.length - JC.HIDDEN_CAP);
    try { localStorage.setItem(hiddenKey(chatId), JSON.stringify(a)); } catch (e) {}
    var d = msgData[msgId];
    if (d && d.el) d.el.style.display = "none";
    JC.toast("Message deleted for you");
  };

  JC.decorateMessage = function (div, msgId, m, isGroup) {
    msgData[msgId] = { m: m, isGroup: !!isGroup, el: div };
    div.setAttribute("data-msg-id", msgId);
    if (JC.isHiddenMessage(JC.currentChatId, msgId)) div.style.display = "none";
    applyDecor(div, m);
    wireGestures(div, msgId);
  };
  JC.refreshMessage = function (msgId, m, isGroup) {
    var d = msgData[msgId]; if (!d) return;
    d.m = m; applyDecor(d.el, m);
  };
  function applyDecor(div, m) {
    // Deleted: wipe the body, keep sender name + time.
    if (m.deleted && !div.classList.contains("deleted")) {
      div.classList.add("deleted");
      Array.prototype.slice.call(div.children).forEach(function (c) {
        if (!c.classList.contains("meta") && !c.classList.contains("sender-name")) div.removeChild(c);
      });
      var del = document.createElement("div");
      del.className = "deleted-text";
      del.textContent = JC.DELETED_TEXT;
      var meta = div.querySelector(".meta");
      div.insertBefore(del, meta || null);
    }
    if (!m.deleted) {
      if (m.forwarded && !div.querySelector(".fwd-label")) {
        var f = document.createElement("div"); f.className = "fwd-label"; f.textContent = "Forwarded";
        insertTop(div, f);
      }
      if (m.replyTo && !div.querySelector(".reply-quote")) {
        var q = document.createElement("div"); q.className = "reply-quote";
        var who = m.replyTo.senderId === uid() ? "You" : nameOf(m.replyTo.senderId);
        q.innerHTML = '<div class="rq-name">' + esc(who) + '</div><div class="rq-text">' + esc(m.replyTo.text || previewOf(m.replyTo)) + "</div>";
        q.addEventListener("click", function (e) { e.stopPropagation(); scrollToMsg(m.replyTo.id); });
        insertTop(div, q);
      }
    }
    // Reactions row under the bubble.
    var old = div.querySelector(".reacts"); if (old) div.removeChild(old);
    var r = m.reactions || {}, counts = {}, order = [];
    Object.keys(r).forEach(function (k) { var e = r[k]; if (!e) return; if (!counts[e]) { counts[e] = 0; order.push(e); } counts[e]++; });
    if (!m.deleted && order.length) {
      var row = document.createElement("div"); row.className = "reacts";
      row.innerHTML = order.map(function (e) { return '<span class="rc' + (r[uid()] === e ? " mine" : "") + '">' + esc(e) + (counts[e] > 1 ? " " + counts[e] : "") + "</span>"; }).join("");
      div.appendChild(row);
      div.classList.add("has-reacts");
    } else div.classList.remove("has-reacts");
  }
  function insertTop(div, node) {
    var sn = div.querySelector(".sender-name");
    if (sn && sn.nextSibling) div.insertBefore(node, sn.nextSibling);
    else if (sn) div.appendChild(node);
    else div.insertBefore(node, div.firstChild);
  }
  function nameOf(u) {
    if (!u) return "";
    if (u === JC.currentChatOtherUid && JC.currentChatOther) return JC.currentChatOther.displayName || "Contact";
    var p = JC.getCachedProfile ? JC.getCachedProfile(u) : null;
    return (p && p.displayName) || "Contact";
  }
  function scrollToMsg(id) {
    var d = msgData[id]; if (!d || !d.el) return;
    try { d.el.scrollIntoView({ block: "center" }); } catch (e) {}
    d.el.classList.add("flash"); setTimeout(function () { d.el.classList.remove("flash"); }, 1200);
  }

  // ---------- long-press + swipe ----------
  JC.LONG_PRESS_MS = 480;
  function wireGestures(div, msgId) {
    var t = null, sx = 0, sy = 0, moved = false, swiped = false, fired = false;
    function clear() { if (t) { clearTimeout(t); t = null; } }
    div.addEventListener("touchstart", function (e) {
      var p = e.touches && e.touches[0]; sx = p ? p.clientX : 0; sy = p ? p.clientY : 0; moved = false; swiped = false; fired = false;
      clear(); t = setTimeout(function () { t = null; if (!moved) { fired = true; JC.openMessageSheet(msgId); } }, JC.LONG_PRESS_MS);
    });
    div.addEventListener("touchmove", function (e) {
      var p = e.touches && e.touches[0]; if (!p) return;
      var dx = p.clientX - sx, dy = p.clientY - sy;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { moved = true; clear(); }
      if (dx > 0 && Math.abs(dy) < 30) div.style.transform = "translateX(" + Math.min(dx, 70) + "px)";
      if (dx > 60 && Math.abs(dy) < 30) swiped = true;
    });
    div.addEventListener("touchend", function (e) {
      clear(); div.style.transform = "";
      if (fired && e && e.preventDefault) e.preventDefault();
      if (swiped) { swiped = false; JC.startReply(msgId); }
    });
    div.addEventListener("contextmenu", function (e) { if (e.preventDefault) e.preventDefault(); JC.openMessageSheet(msgId); });
  }

  // ---------- generic bottom sheet ----------
  var sheetOpen = false;
  function closeSheet() {
    var s = $("actionSheet"); if (!s) return;
    s.classList.add("hidden"); s.innerHTML = ""; sheetOpen = false;
  }
  JC.closeActionSheet = closeSheet;
  function openSheet(html, onClick) {
    var s = $("actionSheet"); if (!s) return;
    s.innerHTML = '<div class="sheet-card">' + html + '<button type="button" class="sheet-item sheet-cancel" data-act="cancel">Cancel</button></div>';
    s.classList.remove("hidden"); sheetOpen = true;
    s.onclick = function (e) {
      var t = e.target;
      while (t && t !== s && !(t.getAttribute && t.getAttribute("data-act"))) t = t.parentNode;
      if (!t || t === s) { closeSheet(); return; }
      var act = t.getAttribute("data-act"), val = t.getAttribute("data-val");
      closeSheet();
      if (act !== "cancel") onClick(act, val);
    };
  }
  JC.actionSheetOpen = function () { return sheetOpen; };

  JC.openMessageSheet = function (msgId) {
    var d = msgData[msgId]; if (!d) return;
    var m = d.m, mine = m.senderId === uid();
    if (m.deleted) {
      // Already deleted for everyone: only "Delete for me" is left.
      openSheet(item("delete", "Delete for me", "danger"), function (act) {
        if (act === "delete") JC.confirmDelete(msgId);
      });
      return;
    }
    var html = '<div class="sheet-reacts">' + JC.QUICK_REACTIONS.map(function (e) {
      return '<button type="button" class="sheet-emoji" data-act="react" data-val="' + esc(e) + '">' + esc(e) + "</button>";
    }).join("") + "</div>";
    html += item("reply", "Reply");
    html += item("forward", "Forward");
    if (m.type === "text" && m.text) html += item("copy", "Copy");
    if ((m.reactions || {})[uid()]) html += item("unreact", "Remove my reaction");
    html += item("delete", "Delete", "danger");
    openSheet(html, function (act, val) {
      if (act === "react") JC.react(msgId, val);
      else if (act === "unreact") JC.react(msgId, null);
      else if (act === "reply") JC.startReply(msgId);
      else if (act === "forward") JC.openForward(msgId);
      else if (act === "copy") copyText(m.text);
      else if (act === "delete") JC.confirmDelete(msgId);
    });
  };
  function item(act, label, cls) { return '<button type="button" class="sheet-item' + (cls ? " " + cls : "") + '" data-act="' + act + '">' + esc(label) + "</button>"; }

  function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t); JC.toast("Copied"); return; } } catch (e) {}
    JC.toast("Copy nahi ho saka");
  }

  // ---------- reactions ----------
  JC.react = function (msgId, emoji) {
    var d = msgData[msgId]; if (!d || !JC.db) return Promise.resolve();
    var upd = {};
    upd["reactions." + uid()] = emoji ? emoji : fv().delete();
    return msgRef(msgId, d.isGroup).update(upd).catch(function () { JC.toast("Reaction nahi lag saka."); });
  };

  // ---------- delete (WhatsApp-style choice) ----------
  JC.confirmDelete = function (msgId) {
    var d = msgData[msgId]; if (!d) return;
    var mine = d.m.senderId === uid() && !d.m.deleted;
    var html = '<div class="sheet-title">Delete message?</div>' + item("forme", "Delete for me", "danger");
    if (mine) html += item("forall", "Delete for everyone", "danger");
    openSheet(html, function (act) {
      if (act === "forme") JC.deleteForMe(msgId);
      else if (act === "forall") JC.deleteForAll(msgId);
    });
  };

  // ---------- delete for everyone ----------
  JC.confirmDeleteForAll = function (msgId) {
    openSheet('<div class="sheet-title">Delete this message for everyone?</div>' + item("yes", "Delete for everyone", "danger"), function (act) {
      if (act === "yes") JC.deleteForAll(msgId);
    });
  };
  JC.deleteForAll = function (msgId) {
    var d = msgData[msgId]; if (!d) return Promise.resolve();
    if (d.m.senderId !== uid()) return Promise.resolve();
    var del = fv().delete();
    return msgRef(msgId, d.isGroup).update({
      deleted: true, text: "", mediaData: del, mediaMime: del, mediaName: del,
      durationSec: del, replyTo: del, reactions: del, forwarded: del
    }).catch(function () { JC.toast("Message delete nahi ho saka."); });
  };

  // ---------- reply ----------
  var pendingReply = null;
  JC.getPendingReply = function () { return pendingReply; };
  JC.startReply = function (msgId) {
    var d = msgData[msgId]; if (!d || d.m.deleted) return;
    var m = d.m;
    pendingReply = { id: msgId, senderId: m.senderId, type: m.type, text: String(previewOf(m)).slice(0, 200) };
    var bar = $("replyBar"); if (!bar) return;
    bar.querySelector(".rb-name").textContent = m.senderId === uid() ? "You" : nameOf(m.senderId);
    bar.querySelector(".rb-text").textContent = pendingReply.text;
    bar.classList.remove("hidden");
    var inp = $("msgInput"); if (inp && inp.focus) inp.focus();
  };
  JC.cancelReply = function () { pendingReply = null; var bar = $("replyBar"); if (bar) bar.classList.add("hidden"); };
  // Wrap the send entry point so every message (text, photo, voice) sent
  // while the reply bar is open carries the quote.
  function wrapSend() {
    if (!JC.sendCurrentMessage || JC.sendCurrentMessage._jcWrapped) return;
    var orig = JC.sendCurrentMessage;
    JC.sendCurrentMessage = function (data) {
      data = data || {};
      if (pendingReply && !data.replyTo && !data.forwarded) { data.replyTo = pendingReply; JC.cancelReply(); }
      clearMyTyping();
      return orig.call(this, data);
    };
    JC.sendCurrentMessage._jcWrapped = true;
  }

  // ---------- forward ----------
  JC.openForward = function (msgId) {
    var d = msgData[msgId]; if (!d || !JC.db) return;
    var m = d.m;
    if (m.type === "video" || m.type === "file") { JC.toast(JC.NO_BIG_FILES_MSG || "Ye forward nahi ho sakta."); return; }
    JC.db.collection("userChats").doc(uid()).collection("list").orderBy("lastMessageAt", "desc").get().then(function (snap) {
      var entries = [];
      snap.forEach(function (doc) {
        var e = doc.data(); e._id = doc.id;
        if (e.type !== "group" && JC.isBlocked && JC.isBlocked(e.otherUid)) return;
        entries.push(e);
      });
      if (!entries.length) { JC.toast("Koi chat nahi mili."); return; }
      var html = '<div class="sheet-title">Forward to</div><div class="fwd-list">' + entries.map(function (e, i) {
        return '<button type="button" class="sheet-item" data-act="fwd" data-val="' + i + '"><span class="fwd-name" data-i="' + i + '">' + (e.type === "group" ? "Group" : "Chat") + "</span></button>";
      }).join("") + "</div>";
      openSheet(html, function (act, val) { if (act === "fwd") JC.forwardTo(entries[+val], m); });
      // Fill names (users / groups docs).
      entries.forEach(function (e, i) {
        var ref = e.type === "group" ? JC.db.collection("groups").doc(e.groupId || e.chatId) : JC.db.collection("users").doc(e.otherUid);
        ref.get().then(function (s) {
          var el = document.querySelector('.fwd-name[data-i="' + i + '"]');
          if (el && s.exists) el.textContent = (s.data().name || s.data().displayName || "Chat");
        }).catch(function () {});
      });
    }).catch(function () { JC.toast("Chats load nahi huin."); });
  };
  JC.forwardTo = function (entry, m) {
    if (!entry || !m || !JC.db) return Promise.resolve();
    var now = fv().serverTimestamp();
    var msg = { senderId: uid(), type: m.type, text: m.text || "", createdAt: now, status: "sent", forwarded: true };
    if (m.mediaData) msg.mediaData = m.mediaData;
    if (m.mediaMime) msg.mediaMime = m.mediaMime;
    if (m.mediaName) msg.mediaName = m.mediaName;
    if (m.durationSec) msg.durationSec = m.durationSec;
    var preview = previewOf(m);
    var isGroup = entry.type === "group";
    var id = isGroup ? (entry.groupId || entry.chatId) : entry.chatId;
    var root = JC.db.collection(isGroup ? "groups" : "chats").doc(id);
    return root.collection("messages").add(msg).then(function () {
      if (isGroup) return root.update({ lastMessage: preview, lastMessageAt: now });
      return root.update({ lastMessage: preview, lastMessageAt: now, lastSenderId: uid() }).then(function () {
        return JC.db.collection("userChats").doc(entry.otherUid).collection("list").doc(id)
          .set({ chatId: id, otherUid: uid(), unreadCount: fv().increment(1), lastMessageAt: now }, { merge: true });
      });
    }).then(function () { JC.toast("Forwarded"); })
      .catch(function () { JC.toast("Forward nahi ho saka."); });
  };

  // ---------- typing indicator (1-to-1 only) ----------
  var lastTypingWrite = 0, typingActive = false, chatDocUnsub = null, typingTimer = null, otherTypingAt = 0;
  JC.noteTyping = function () {
    if (!JC.db || !JC.currentChatId || JC.currentChatIsGroup) return;
    var now = Date.now();
    if (now - lastTypingWrite < JC.TYPING_THROTTLE_MS) return;
    lastTypingWrite = now; typingActive = true;
    var upd = {}; upd["typing." + uid()] = now;
    JC.db.collection("chats").doc(JC.currentChatId).update(upd).catch(function () {});
  };
  function clearMyTyping(chatId) {
    chatId = chatId || JC.currentChatId;
    if (!typingActive || !JC.db || !chatId) return;
    typingActive = false; lastTypingWrite = 0;
    var upd = {}; upd["typing." + uid()] = fv().delete();
    JC.db.collection("chats").doc(chatId).update(upd).catch(function () {});
  }
  JC.clearMyTyping = clearMyTyping;
  JC.isOtherTyping = function () { return otherTypingAt && Date.now() - otherTypingAt < JC.TYPING_SHOW_MS; };
  function renderTyping() {
    var st = $("chatStatus"); if (!st || JC.currentChatIsGroup) return;
    if (JC.isOtherTyping()) { st.textContent = "typing..."; st.classList.add("typing"); }
    else if (st.classList.contains("typing")) {
      st.classList.remove("typing"); st.textContent = st.getAttribute("data-base") || "";
    }
  }
  JC.onChatHeaderUpdated = function () {
    var st = $("chatStatus"); if (!st) return;
    st.setAttribute("data-base", st.textContent);
    if (JC.isOtherTyping()) { st.textContent = "typing..."; st.classList.add("typing"); }
    else st.classList.remove("typing");
  };
  JC.onChatOpened = function (chatId, otherUid, isGroup) {
    JC.cancelReply();
    otherTypingAt = 0;
    if (chatDocUnsub) { chatDocUnsub(); chatDocUnsub = null; }
    if (isGroup || !JC.db) return;
    chatDocUnsub = JC.db.collection("chats").doc(chatId).onSnapshot(function (s) {
      var t = (s.exists && s.data().typing) || {};
      otherTypingAt = +t[otherUid] || 0;
      if (otherTypingAt && Date.now() - otherTypingAt > JC.TYPING_SHOW_MS) otherTypingAt = 0;
      renderTyping();
      if (typingTimer) clearTimeout(typingTimer);
      if (otherTypingAt) typingTimer = setTimeout(function () { otherTypingAt = 0; renderTyping(); }, JC.TYPING_SHOW_MS);
    }, function () {});
  };
  JC.onChatClosed = function (chatId) {
    clearMyTyping(chatId);
    JC.cancelReply();
    if (chatDocUnsub) { chatDocUnsub(); chatDocUnsub = null; }
    if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; }
    otherTypingAt = 0;
    msgData = {};
  };

  // ---------- pin + mute (device only) ----------
  JC.getPins = function () { return store("pins") || []; };
  JC.getMutes = function () { return store("mutes") || []; };
  JC.isPinned = function (id) { return JC.getPins().indexOf(id) >= 0; };
  JC.isMuted = function (id) { return JC.getMutes().indexOf(id) >= 0; };
  JC.togglePin = function (id) {
    var p = JC.getPins(), i = p.indexOf(id);
    if (i >= 0) p.splice(i, 1);
    else { if (p.length >= JC.MAX_PINS) { JC.toast("Sirf " + JC.MAX_PINS + " chats pin ho sakti hain."); return false; } p.unshift(id); }
    store("pins", p); applyListDecor(); return true;
  };
  JC.toggleMute = function (id) {
    var m = JC.getMutes(), i = m.indexOf(id);
    if (i >= 0) m.splice(i, 1); else m.push(id);
    store("mutes", m); applyListDecor(); return true;
  };
  var PIN_SVG = '<svg class="row-ico" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-label="Pinned"><path d="M16 3l5 5-3 1-4 4 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 4-4z"/></svg>';
  var MUTE_SVG = '<svg class="row-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-label="Muted"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
  function applyListDecor() {
    var list = $("chatList"); if (!list) return;
    var rows = Array.prototype.slice.call(list.children);
    var pins = JC.getPins();
    rows.forEach(function (r) {
      var id = r.dataset && r.dataset.chatId; if (!id) return;
      var holder = r.querySelector(".row-icons");
      if (!holder) {
        holder = document.createElement("span"); holder.className = "row-icons";
        var top = r.querySelector(".top") || r; top.appendChild(holder);
      }
      holder.innerHTML = (JC.isMuted(id) ? MUTE_SVG : "") + (JC.isPinned(id) ? PIN_SVG : "");
      if (!r._jcPress) { r._jcPress = true; wireRowPress(r, id); }
    });
    // Pinned rows first, in pin order; others keep their time order.
    pins.slice().reverse().forEach(function (id) {
      var r = rows.filter(function (x) { return x.dataset && x.dataset.chatId === id; })[0];
      if (r) list.insertBefore(r, list.firstChild);
    });
  }
  JC.applyListDecor = applyListDecor;
  function wireRowPress(row, id) {
    var t = null, fired = false;
    function clear() { if (t) { clearTimeout(t); t = null; } }
    row.addEventListener("touchstart", function () { fired = false; clear(); t = setTimeout(function () { t = null; fired = true; JC.openChatRowSheet(id); }, JC.LONG_PRESS_MS); });
    row.addEventListener("touchmove", clear);
    row.addEventListener("touchend", function (e) { clear(); if (fired && e.preventDefault) e.preventDefault(); });
    row.addEventListener("contextmenu", function (e) { if (e.preventDefault) e.preventDefault(); JC.openChatRowSheet(id); });
  }
  JC.openChatRowSheet = function (id) {
    openSheet(item("pin", JC.isPinned(id) ? "Unpin chat" : "Pin chat") + item("mute", JC.isMuted(id) ? "Unmute notifications" : "Mute notifications"), function (act) {
      if (act === "pin") JC.togglePin(id);
      if (act === "mute") JC.toggleMute(id);
    });
  };

  // ---------- in-app message tone (skipped for muted / open chat) ----------
  var lastUnread = null;
  JC.afterChatListRender = function (snap) {
    applyListDecor();
    var now = {}, ring = false;
    snap.forEach(function (doc) {
      var e = doc.data(), c = e.unreadCount || 0; now[doc.id] = c;
      if (lastUnread && c > (lastUnread[doc.id] || 0) && doc.id !== JC.currentChatId && !JC.isMuted(doc.id)) ring = true;
    });
    lastUnread = now;
    if (ring) JC.playMessageTone();
  };
  JC.playMessageTone = function () {
    if (store("tone") === false) return false;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      var ctx = JC._toneCtx || (JC._toneCtx = new AC());
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4);
    } catch (e) { return false; }
    try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) {}
    return true;
  };

  // ---------- dark mode + wallpaper ----------
  JC.WALLPAPERS = { "default": "Default", "mist": "Blue mist", "mint": "Mint", "sand": "Sand", "dots": "Dots", "slate": "Dark slate" };
  JC.applyTheme = function () {
    var mode = store("theme") || "system";
    var dark = mode === "dark" || (mode === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    if (dark) root.classList.add("dark"); else root.classList.remove("dark");
    var wp = store("wallpaper") || "default";
    Object.keys(JC.WALLPAPERS).forEach(function (k) { root.classList.remove("wp-" + k); });
    root.classList.add("wp-" + wp);
    return dark;
  };
  JC.setTheme = function (mode) { store("theme", mode); JC.applyTheme(); syncSettingsUi(); };
  JC.setWallpaper = function (wp) { if (!JC.WALLPAPERS[wp]) return; store("wallpaper", wp); JC.applyTheme(); syncSettingsUi(); };
  function syncSettingsUi() {
    var mode = store("theme") || "system", wp = store("wallpaper") || "default";
    var t = document.querySelectorAll ? document.querySelectorAll("[data-theme-opt]") : [];
    Array.prototype.forEach.call(t, function (b) { b.classList.toggle("on", b.getAttribute("data-theme-opt") === mode); });
    var w = document.querySelectorAll ? document.querySelectorAll("[data-wp-opt]") : [];
    Array.prototype.forEach.call(w, function (b) { b.classList.toggle("on", b.getAttribute("data-wp-opt") === wp); });
  }

  // ---------- Back closes the sheet first ----------
  window.addEventListener("popstate", function () { if (sheetOpen) closeSheet(); });

  JC.applyTheme();
  function wrapGroupOpen() {
    if (!JC.openGroupChat || JC.openGroupChat._jcWrapped) return;
    var orig = JC.openGroupChat;
    JC.openGroupChat = function (gid) { var r = orig.apply(this, arguments); JC.onChatOpened(gid, null, true); return r; };
    JC.openGroupChat._jcWrapped = true;
  }
  document.addEventListener("DOMContentLoaded", function () {
    wrapSend();
    wrapGroupOpen();
    JC.applyTheme(); syncSettingsUi();
    try {
      var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
      if (mq && mq.addEventListener) mq.addEventListener("change", JC.applyTheme);
    } catch (e) {}
    var inp = $("msgInput"); if (inp) inp.addEventListener("input", function () { if (inp.value) JC.noteTyping(); });
    var rc = $("btnReplyCancel"); if (rc) rc.addEventListener("click", function (e) { e.stopPropagation(); JC.cancelReply(); });
    var setBox = $("appearanceBox");
    if (setBox) setBox.addEventListener("click", function (e) {
      var t = e.target;
      while (t && t !== setBox && !(t.getAttribute && (t.getAttribute("data-theme-opt") || t.getAttribute("data-wp-opt")))) t = t.parentNode;
      if (!t || t === setBox) return;
      if (t.getAttribute("data-theme-opt")) JC.setTheme(t.getAttribute("data-theme-opt"));
      else JC.setWallpaper(t.getAttribute("data-wp-opt"));
    });
  });
})();
