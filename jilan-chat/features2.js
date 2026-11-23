// Jilan Chat v4.8 part 2 — features2.js
// Edit message (15 min), view-once photo, profile QR + scan, group
// @mentions + polls, archive, locked chats, share contact, stickers,
// message info, group photo/description, admins-only groups, broadcast
// lists, export chat, font size, deep links. Spark only (no Storage).
(function () {
  var JC = window.JC = window.JC || {};
  var EDIT_MS = 15 * 60 * 1000;
  var BASE = "https://jilanapps.github.io/jilan-store/jilan-chat/";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function me() { return JC.currentUser && JC.currentUser.uid; }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(t) { if (JC.toast) JC.toast(t); }
  function bridge(n) { try { return window.Android && typeof window.Android[n] === "function"; } catch (e) { return false; } }
  function FV() { return window.firebase && firebase.firestore && firebase.firestore.FieldValue; }
  function tsMs(ts) {
    if (!ts) return null;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    if (typeof ts === "number") return ts;
    return null;
  }
  function fmtFull(ts) {
    var t = tsMs(ts); if (t == null) return "";
    var d = new Date(t), p = function (n) { return (n < 10 ? "0" : "") + n; };
    var h = d.getHours(), ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return d.getDate() + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()] + " " + d.getFullYear() + ", " + h + ":" + p(d.getMinutes()) + " " + ap;
  }
  JC.fmtFull = fmtFull;
  function item(a, l, c) { return JC.sheetItem ? JC.sheetItem(a, l, c) : '<button type="button" class="sheet-item' + (c ? " " + c : "") + '" data-act="' + a + '">' + esc(l) + "</button>"; }
  function sheet(html, cb) { if (JC.openSheet) JC.openSheet(html, cb); }
  function msgRef(msgId, isGroup) {
    return JC.db.collection(isGroup ? "groups" : "chats").doc(JC.currentChatId).collection("messages").doc(msgId);
  }
  function isAdminNow() { var g = JC.currentGroup; return !!(g && (g.admins || []).indexOf(me()) >= 0); }
  var RULES_MSG = "This needs the latest server update. Try again later.";

  // =====================================================================
  // Modal (sheets close on any tap, so inputs need their own card)
  // =====================================================================
  JC.modal = function (html, onMount) {
    JC.closeModal();
    var m = document.createElement("div");
    m.id = "jcModal"; m.className = "jc-modal";
    m.innerHTML = '<div class="jc-modal-card">' + html + "</div>";
    m.addEventListener("click", function (e) { if (e.target === m) JC.closeModal(); });
    document.body.appendChild(m);
    if (onMount) onMount(m.firstChild, JC.closeModal);
    return m;
  };
  var modalCleanup = null;
  JC.onModalClose = function (fn) { modalCleanup = fn; };
  JC.closeModal = function () {
    var m = $("jcModal"); if (m && m.parentNode) m.parentNode.removeChild(m);
    if (modalCleanup) { var f = modalCleanup; modalCleanup = null; try { f(); } catch (e) {} }
  };

  // =====================================================================
  // 1. Message extras at send time (poll / contact / sticker / view once /
  //    mentions) — chained after features.js applyMessageExtras.
  // =====================================================================
  JC.validPoll = function (p) {
    if (!p || typeof p.q !== "string") return null;
    var q = p.q.trim().slice(0, 200);
    var opts = (p.opts || []).map(function (o) { return String(o || "").trim().slice(0, 80); }).filter(Boolean);
    var seen = {}; opts = opts.filter(function (o) { var k = o.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
    if (!q || opts.length < 2 || opts.length > 10) return null;
    return { q: q, opts: opts, votes: {} };
  };
  JC.STICKERS = ["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s09", "s10", "s11", "s12", "s13", "s14", "s15", "s16", "s17", "s18", "s19", "s20", "s21", "s22", "s23", "s24", "s25", "s26", "s27", "s28", "s29", "s30", "s31", "s32", "s33", "s34", "s35", "s36", "s37", "s38", "s39", "s40", "s41", "s42", "s43", "s44", "s45", "s46", "s47", "s48"];
  JC.STICKER_LABELS = ["Hello!", "Thank you", "OK", "LOL", "Love it", "Good morning", "Good night", "Congrats!", "Salam", "JazakAllah", "Miss you", "Yes!", "No", "Wow", "On my way", "Happy Birthday", "Assalamu Alaikum", "JazakAllah Khair", "MashaAllah", "InshaAllah", "SubhanAllah", "Alhamdulillah", "Ameen", "Eid Mubarak", "Jumma Mubarak", "Ramadan Kareem", "Thank you!", "Sorry", "Love you", "Happy", "Sad", "Angry", "Sleepy", "Busy", "Call me", "Well done", "Good luck", "Get well soon", "Take care", "Bye bye", "Haha", "Please", "Wait", "Hurry up", "Welcome", "Cool", "Hungry", "Thinking"];
  JC.extractMentions = function (text, members) {
    var out = [], t = String(text || "");
    (members || []).forEach(function (mm) {
      if (!mm || !mm.username || !mm.uid) return;
      var re = new RegExp("(^|[^a-z0-9_.])@" + mm.username.replace(/\./g, "\\.") + "(?![a-z0-9_])", "i");
      if (re.test(t) && out.indexOf(mm.uid) < 0) out.push(mm.uid);
    });
    return out.slice(0, 50);
  };
  function chainApply() {
    var orig = JC.applyMessageExtras;
    JC.applyMessageExtras = function (msg, data, isGroup) {
      if (orig) orig.apply(this, arguments);
      if (!data) return msg;
      if (data.poll) { var p = JC.validPoll(data.poll); if (p) { msg.poll = p; msg.type = "text"; } }
      if (data.contact && data.contact.uid) {
        msg.contact = { uid: String(data.contact.uid).slice(0, 128), name: String(data.contact.name || "").slice(0, 100), username: String(data.contact.username || "").slice(0, 40) };
        if (data.contact.gmail && !data.contact.username) msg.contact.gmail = String(data.contact.gmail).slice(0, 100);
        msg.type = "text";
      }
      if (msg.type === "file" && typeof data.mediaSize === "number" && data.mediaSize > 0) msg.mediaSize = Math.round(data.mediaSize);
      if (data.sticker && JC.STICKERS.indexOf(data.sticker) >= 0) { msg.sticker = data.sticker; msg.type = "text"; }
      if (data.viewOnce && msg.type === "image" && !isGroup) msg.viewOnce = true;
      return msg;
    };
  }

  // =====================================================================
  // 2. Rendering: poll / sticker / contact / view-once bodies
  // =====================================================================
  JC.pollHtml = function (m) {
    var p = m.poll || {}, votes = p.votes || {}, counts = [], total = 0, mine = votes[me()];
    (p.opts || []).forEach(function (o, i) { counts[i] = 0; });
    Object.keys(votes).forEach(function (u) { var v = votes[u]; if (typeof v === "number" && counts[v] != null) { counts[v]++; total++; } });
    return '<div class="poll-card"><div class="poll-head">Poll</div><div class="poll-q">' + esc(p.q) + "</div>" +
      (p.opts || []).map(function (o, i) {
        var pct = total ? Math.round(counts[i] * 100 / total) : 0;
        return '<button type="button" class="poll-opt' + (mine === i ? " mine" : "") + '" data-poll-idx="' + i + '"><span class="po-bar" style="width:' + pct + '%"></span><span class="po-mark">' + (mine === i ? "&#10003;" : "") + '</span><span class="po-label">' + esc(o) + '</span><span class="po-count">' + counts[i] + "</span></button>";
      }).join("") +
      '<div class="poll-foot">' + total + " vote" + (total === 1 ? "" : "s") + " · Tap an option to vote</div></div>";
  };
  JC.stickerHtml = function (m) { return '<img class="sticker-img" src="stickers/' + esc(m.sticker) + '.svg" alt="Sticker">'; };
  JC.contactHtml = function (m) {
    var c = m.contact || {};
    return '<div class="contact-card"><div class="cc-top"><div class="avatar">' + esc((c.name || "?").charAt(0).toUpperCase()) + '</div><div><div class="cc-name">' + esc(c.name || "Contact") + '</div><div class="cc-handle">' + esc(c.username ? "@" + c.username : (c.gmail || "")) + "</div></div></div>" +
      '<button type="button" class="cc-btn" data-contact="1">Message</button></div>';
  };
  function voOpenedLocal(chatId, msgId) { var l = lsGet("jc_vo_" + (me() || "x"), []); return l.indexOf(chatId + "/" + msgId) >= 0; }
  function voMarkLocal(chatId, msgId) { var l = lsGet("jc_vo_" + (me() || "x"), []); if (l.indexOf(chatId + "/" + msgId) < 0) { l.push(chatId + "/" + msgId); if (l.length > 1000) l = l.slice(-1000); lsSet("jc_vo_" + (me() || "x"), l); } }
  JC.viewOnceState = function (m, msgId) {
    var mine = m.senderId === me();
    var opened = !!m.viewOnceOpened || (!mine && voOpenedLocal(JC.currentChatId, msgId)) || (typeof m.mediaData !== "string" || !m.mediaData);
    if (mine) return opened && m.viewOnceOpened ? "sent-opened" : "sent";
    return opened ? "opened" : "ready";
  };
  JC.viewOnceHtml = function (m, msgId) {
    var st = JC.viewOnceState(m, msgId);
    var label = st === "ready" ? "Photo · Tap to view once" : st === "opened" ? "Opened" : st === "sent-opened" ? "View once photo · Opened" : "View once photo";
    return '<div class="vo-bubble' + (st === "ready" ? " vo-ready" : "") + '" data-vo="1"><span class="vo-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-dasharray="4 3"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor" stroke="none" font-weight="700">1</text></svg></span><span class="vo-label">' + esc(label) + "</span></div>";
  };
  function wrapMediaBody() {
    var orig = JC.mediaBodyHtml;
    JC.mediaBodyHtml = function (m) {
      if (m && !m.deleted) {
        if (m.poll) return JC.pollHtml(m);
        if (m.sticker) return JC.stickerHtml(m);
        if (m.contact) return JC.contactHtml(m);
        if (m.viewOnce) return JC.viewOnceHtml(m, m.__id || "");
      }
      return orig.apply(this, arguments);
    };
  }
  // mediaBodyHtml gets only the message, so the renderer tags it first.
  function wrapPreRender() {
    var orig = JC.preRenderMessage;
    JC.preRenderMessage = function (msgId, m, isGroup) {
      if (m && m.viewOnce) { try { Object.defineProperty(m, "__id", { value: msgId, enumerable: false, configurable: true }); } catch (e) {} }
      return orig ? orig.apply(this, arguments) : false;
    };
  }

  // Highlight @mentions inside text messages.
  JC.highlightMentions = function (div, m) {
    if (!div || !m || m.type !== "text" || m.poll || m.contact || m.sticker || m.location || m.system) return 0;
    var count = 0;
    Array.prototype.slice.call(div.childNodes || []).forEach(function (n) {
      if (n.nodeType !== 3 || !/@[a-z0-9_.]{3,}/i.test(n.nodeValue)) return;
      var parts = n.nodeValue.split(/(@[a-z0-9_.]{3,30})/i), frag = document.createDocumentFragment();
      parts.forEach(function (pt) {
        if (/^@[a-z0-9_.]{3,30}$/i.test(pt)) { var s = document.createElement("span"); s.className = "mention"; s.textContent = pt; frag.appendChild(s); count++; }
        else if (pt) frag.appendChild(document.createTextNode(pt));
      });
      div.replaceChild(frag, n);
    });
    var myU = JC.userProfile && JC.userProfile.username;
    if (myU && new RegExp("(^|[^a-z0-9_.])@" + myU.replace(/\./g, "\\.") + "(?![a-z0-9_])", "i").test(m.text || "")) div.classList.add("mentions-me");
    return count;
  };
  function setEditedTag(div, m) {
    if (!div) return;
    var tag = div.querySelector(".edited-tag");
    if (m.edited && !m.deleted) {
      if (!tag) { tag = document.createElement("span"); tag.className = "edited-tag"; tag.textContent = "Edited"; var meta = div.querySelector(".meta"); div.insertBefore(tag, meta || null); }
    } else if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
  }
  JC.replaceMessageText = function (div, m) {
    if (!div) return;
    Array.prototype.slice.call(div.childNodes).forEach(function (n) {
      if (n.nodeType === 3 || (n.classList && (n.classList.contains("mention") || n.classList.contains("search-mark") || n.classList.contains("msg-link")))) div.removeChild(n);
    });
    var before = div.querySelector(".edited-tag") || div.querySelector(".meta") || null;
    div.insertBefore(document.createTextNode(m.text || ""), before);
    JC.highlightMentions(div, m);
    if (JC.linkifyEl) JC.linkifyEl(div); // v4.10
  };
  function wrapDecorate() {
    var orig = JC.decorateMessage;
    JC.decorateMessage = function (div, msgId, m, isGroup) {
      var r = orig.apply(this, arguments);
      try {
        if (m && m.sticker && !m.deleted) div.classList.add("sticker-msg");
        if (m && m.viewOnce) div.classList.add("vo-msg");
        JC.highlightMentions(div, m);
        if (JC.linkifyEl && m && !m.deleted) JC.linkifyEl(div); // v4.10 clickable links
        setEditedTag(div, m);
      } catch (e) {}
      return r;
    };
  }
  function wrapRefresh() {
    var orig = JC.refreshMessage;
    JC.refreshMessage = function (msgId, m, isGroup) {
      var d = JC.getMsgData ? JC.getMsgData(msgId) : null;
      var old = d && d.m;
      var r = orig ? orig.apply(this, arguments) : undefined;
      if (!d || !d.el || !m || m.deleted) return r;
      var el = d.el;
      try {
        if (m.poll) { var pc = el.querySelector(".poll-card"); if (pc) { var t = document.createElement("div"); t.innerHTML = JC.pollHtml(m); pc.parentNode.replaceChild(t.firstChild, pc); } }
        if (m.viewOnce) {
          try { Object.defineProperty(m, "__id", { value: msgId, enumerable: false, configurable: true }); } catch (e) {}
          var vo = el.querySelector(".vo-bubble"); if (vo) { var t2 = document.createElement("div"); t2.innerHTML = JC.viewOnceHtml(m, msgId); vo.parentNode.replaceChild(t2.firstChild, vo); }
        }
        if (m.type === "text" && !m.poll && !m.contact && !m.sticker && !m.location && old && old.text !== m.text) JC.replaceMessageText(el, m);
        setEditedTag(el, m);
      } catch (e) {}
      return r;
    };
  }

  // Clicks inside bubbles: poll vote, contact "Message", view-once open.
  function wireBubbleClicks() {
    var box = $("messages"); if (!box) return;
    box.addEventListener("click", function (e) {
      var t = e.target, opt = null, cc = null, vo = null, msgEl = null;
      while (t && t !== box) {
        if (!opt && t.getAttribute && t.getAttribute("data-poll-idx") != null) opt = t;
        if (!cc && t.getAttribute && t.getAttribute("data-contact")) cc = t;
        if (!vo && t.getAttribute && t.getAttribute("data-vo")) vo = t;
        if (t.getAttribute && t.getAttribute("data-msg-id")) { msgEl = t; break; }
        t = t.parentNode;
      }
      if (!msgEl) return;
      var id = msgEl.getAttribute("data-msg-id"), d = JC.getMsgData ? JC.getMsgData(id) : null;
      if (!d) return;
      if (opt) { e.stopPropagation(); JC.votePoll(id, d.m, d.isGroup, +opt.getAttribute("data-poll-idx")); }
      else if (cc) { e.stopPropagation(); JC.openSharedContact(d.m.contact || {}); }
      else if (vo) { e.stopPropagation(); JC.openViewOnce(id, d.m, d.isGroup); }
    });
  }

  // =====================================================================
  // 3. Polls
  // =====================================================================
  JC.votePoll = function (msgId, m, isGroup, idx) {
    if (!m || !m.poll || !JC.db) return;
    if (!(idx >= 0 && idx < (m.poll.opts || []).length)) return;
    var cur = (m.poll.votes || {})[me()];
    var upd = {}; upd["poll.votes." + me()] = cur === idx ? FV().delete() : idx;
    msgRef(msgId, isGroup).update(upd).catch(function () { toast("Voting " + RULES_MSG.charAt(0).toLowerCase() + RULES_MSG.slice(1)); });
  };
  JC.openPollCreator = function () {
    var optHtml = function (i) { return '<input class="text-input poll-in" type="text" maxlength="80" placeholder="Option ' + (i + 1) + '">'; };
    JC.modal('<div class="sheet-title">Create poll</div><input class="text-input" id="pollQ" type="text" maxlength="200" placeholder="Ask a question"><div id="pollOpts">' + optHtml(0) + optHtml(1) + '</div>' +
      '<button type="button" class="btn btn-ghost" id="pollAdd">Add option</button><div class="modal-actions"><button type="button" class="btn btn-ghost" id="pollCancel">Cancel</button><button type="button" class="btn btn-primary" id="pollSend">Send poll</button></div>', function (card, close) {
      card.querySelector("#pollAdd").onclick = function () {
        var box = card.querySelector("#pollOpts"), n = box.querySelectorAll(".poll-in").length;
        if (n >= 10) { toast("A poll can have up to 10 options."); return; }
        var t = document.createElement("div"); t.innerHTML = optHtml(n); box.appendChild(t.firstChild);
      };
      card.querySelector("#pollCancel").onclick = close;
      card.querySelector("#pollSend").onclick = function () {
        var p = JC.validPoll({ q: card.querySelector("#pollQ").value, opts: Array.prototype.map.call(card.querySelectorAll(".poll-in"), function (i) { return i.value; }) });
        if (!p) { toast("Write a question and at least 2 different options."); return; }
        close();
        JC.sendCurrentMessage({ type: "text", text: "Poll: " + p.q, poll: p }).catch(function () { toast("Poll not sent."); });
      };
    });
  };

  // =====================================================================
  // 4. Edit own text message (15 minutes)
  // =====================================================================
  JC.canEdit = function (m, now) {
    if (!m || m.senderId !== me() || m.deleted || m.system || m.type !== "text") return false;
    if (m.poll || m.contact || m.sticker || m.location) return false;
    var t = tsMs(m.createdAt); if (t == null) return false;
    return (now || Date.now()) - t < EDIT_MS;
  };
  JC.editMessage = function (msgId, isGroup, text) {
    text = String(text || "").trim();
    if (!text) return Promise.reject(new Error("empty"));
    if (text.length > 4000) text = text.slice(0, 4000);
    return msgRef(msgId, isGroup).update({ text: text, edited: true, editedAt: FV().serverTimestamp() });
  };
  JC.openEditMessage = function (msgId, m, isGroup) {
    JC.modal('<div class="sheet-title">Edit message</div><textarea class="text-input" id="editTxt" rows="3" maxlength="4000"></textarea><div class="modal-actions"><button type="button" class="btn btn-ghost" id="editCancel">Cancel</button><button type="button" class="btn btn-primary" id="editSave">Save</button></div>', function (card, close) {
      var ta = card.querySelector("#editTxt"); ta.value = m.text || ""; try { ta.focus(); } catch (e) {}
      card.querySelector("#editCancel").onclick = close;
      card.querySelector("#editSave").onclick = function () {
        if (!JC.canEdit(m)) { close(); toast("You can edit a message only within 15 minutes."); return; }
        if ((ta.value || "").trim() === (m.text || "")) { close(); return; }
        JC.editMessage(msgId, isGroup, ta.value).then(function () { close(); toast("Message edited"); }).catch(function () { close(); toast("Editing " + RULES_MSG.charAt(0).toLowerCase() + RULES_MSG.slice(1)); });
      };
    });
  };

  // =====================================================================
  // 5. View-once photo (1-to-1 only)
  // =====================================================================
  var nextViewOnceUntil = 0;
  JC.pickViewOncePhoto = function () {
    if (JC.currentChatIsGroup) { toast("View once photos work in 1-to-1 chats only."); return; }
    nextViewOnceUntil = Date.now() + 120000;
    toast("Choose a photo. It can be opened only once.");
    var f = $("fileInput"); if (f) f.click();
  };
  function wrapSendCurrent() {
    var orig = JC.sendCurrentMessage;
    JC.sendCurrentMessage = function (data) {
      if (data && data.type === "image" && Date.now() < nextViewOnceUntil && !JC.currentChatIsGroup) { data.viewOnce = true; nextViewOnceUntil = 0; }
      return orig.apply(this, arguments);
    };
  }
  var voViewing = false;
  JC.openViewOnce = function (msgId, m, isGroup) {
    if (isGroup) return;
    var st = JC.viewOnceState(m, msgId);
    if (st === "sent" || st === "sent-opened") { toast("You can't open a view once photo you sent."); return; }
    if (st !== "ready") { toast("This photo was opened already."); return; }
    voMarkLocal(JC.currentChatId, msgId);
    var v = $("viewer"); if (v) v.classList.add("vo-mode");
    voViewing = true;
    try { if (bridge("setSecure")) window.Android.setSecure(true); } catch (e) {}
    JC.openViewer("image", m.mediaData);
    var upd = { viewOnceOpened: true, mediaData: FV().delete(), mediaMime: FV().delete() };
    msgRef(msgId, false).update(upd).catch(function () {});
    var el = JC.getMsgData(msgId); if (el && el.el) { var vo = el.el.querySelector(".vo-bubble"); if (vo) { var t = document.createElement("div"); t.innerHTML = JC.viewOnceHtml(m, msgId); vo.parentNode.replaceChild(t.firstChild, vo); } }
  };
  function wireViewerClose() {
    var c = $("viewerClose"); if (!c) return;
    c.addEventListener("click", function () {
      var v = $("viewer"); if (v) v.classList.remove("vo-mode");
      if (voViewing) { voViewing = false; try { if (bridge("setSecure") && !(document.getElementById("screen-call") || {}).classList.contains("active")) window.Android.setSecure(false); } catch (e) {} }
    });
  }

  // =====================================================================
  // 6. Long-press items: Edit, Info (chained after features.js)
  // =====================================================================
  function chainMessageItems() {
    var origItems = JC.extraMessageItems, origAct = JC.onExtraMessageAction;
    JC.extraMessageItems = function (msgId, m, mk) {
      var mk2 = mk || item, out = "";
      if (m && !m.system && !m.deleted) {
        if (JC.canEdit(m)) out += mk2("edit", "Edit");
        if (m.senderId === me()) out += mk2("info", "Info");
      }
      var base = origItems ? origItems.apply(this, arguments) : "";
      if (m && m.viewOnce) base = base.replace(mk2("save", "Save to gallery"), "");
      return out + base;
    };
    JC.onExtraMessageAction = function (act, msgId, m) {
      var d = JC.getMsgData ? JC.getMsgData(msgId) : null, isGroup = !!(d && d.isGroup);
      if (act === "edit") { JC.openEditMessage(msgId, m, isGroup); return true; }
      if (act === "info") { JC.openMessageInfo(msgId, m, isGroup); return true; }
      if (act === "forward" && m && m.viewOnce) { toast("View once photos can't be forwarded."); return true; }
      return origAct ? origAct.apply(this, arguments) : false;
    };
  }
  JC.messageInfoRows = function (m, isGroup) {
    var rows = [["Sent", fmtFull(m.createdAt) || "Sending..."]];
    if (m.edited) rows.push(["Edited", fmtFull(m.editedAt) || "Yes"]);
    if (isGroup) { rows.push(["Note", "Read receipts are not tracked in groups."]); return rows; }
    var st = m.status || "sent";
    var hide = JC.hideReadReceiptsOn && JC.hideReadReceiptsOn();
    rows.push(["Delivered", m.deliveredAt ? fmtFull(m.deliveredAt) : (st === "delivered" || st === "read" ? "Yes" : "Not yet")]);
    if (hide) rows.push(["Read", "Read receipts are off"]);
    else rows.push(["Read", m.readAt ? fmtFull(m.readAt) : (st === "read" ? "Yes" : "Not yet")]);
    return rows;
  };
  JC.openMessageInfo = function (msgId, m, isGroup) {
    var rows = JC.messageInfoRows(m, isGroup);
    sheet('<div class="sheet-title">Message info</div><div class="info-rows">' + rows.map(function (r) { return '<div class="info-row"><span>' + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>"; }).join("") + "</div>", function () {});
  };

  // =====================================================================
  // 7. Attach sheet (extend) + chat ⋮ menu (extend)
  // =====================================================================
  function wrapAttach() {
    JC.openAttachSheet = function () {
      var g = JC.currentChatIsGroup;
      var html = '<div class="sheet-title">Send</div>' + item("photo", "Photo") + (g ? "" : item("vo", "View once photo")) + item("sticker", "Sticker") + item("location", "Location") + item("contact", "Contact") + item("poll", "Poll");
      sheet(html, function (act) {
        if (act === "photo") { var f = $("fileInput"); if (f) f.click(); }
        else if (act === "vo") JC.pickViewOncePhoto();
        else if (act === "sticker") JC.openStickerPicker();
        else if (act === "location") JC.shareLocation();
        else if (act === "contact") JC.openContactPicker(function (c) { JC.sendContact(c); });
        else if (act === "poll") JC.openPollCreator();
      });
    };
  }
  function chainChatMenu() {
    var origItems = JC.chatMenuItems, origRun = JC.runChatMenuAction;
    JC.chatMenuItems = function () {
      var items = origItems ? origItems.apply(this, arguments) : [];
      var add = [];
      if (JC.currentChatIsGroup) add.push(["poll", "Create poll"]);
      add.push(["export", "Export chat"]);
      add.push(["lockchat", JC.isChatLocked(JC.currentChatId) ? "Unlock this chat" : "Lock this chat"]);
      add.push(["archive", JC.isArchived(JC.currentChatId) ? "Unarchive chat" : "Archive chat"]);
      // insert before the last (danger) item
      var last = items.length && items[items.length - 1][2] === "danger" ? items.pop() : null;
      items = items.concat(add); if (last) items.push(last);
      return items;
    };
    JC.runChatMenuAction = function (act) {
      var id = JC.currentChatId;
      if (act === "poll") return JC.openPollCreator();
      if (act === "export") return JC.openExportChat();
      if (act === "lockchat") return JC.toggleChatLock(id);
      if (act === "archive") { JC.toggleArchive(id); toast(JC.isArchived(id) ? "Chat archived" : "Chat unarchived"); return; }
      return origRun ? origRun.apply(this, arguments) : undefined;
    };
  }

  // =====================================================================
  // 8. Stickers (bundled, no downloads)
  // =====================================================================
  JC.openStickerPicker = function () {
    JC.modal('<div class="sheet-title">Stickers</div><div class="sticker-grid">' + JC.STICKERS.map(function (s, i) {
      return '<button type="button" class="sticker-pick" data-st="' + s + '" aria-label="' + esc(JC.STICKER_LABELS[i]) + '"><img src="stickers/' + s + '.svg" alt="' + esc(JC.STICKER_LABELS[i]) + '"></button>';
    }).join("") + '</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="stClose">Close</button></div>', function (card, close) {
      card.querySelector("#stClose").onclick = close;
      card.querySelector(".sticker-grid").onclick = function (e) {
        var t = e.target; while (t && t !== card && !(t.getAttribute && t.getAttribute("data-st"))) t = t.parentNode;
        if (!t || t === card) return;
        var s = t.getAttribute("data-st"); close();
        JC.sendCurrentMessage({ type: "text", text: "Sticker", sticker: s }).catch(function () { toast("Sticker not sent."); });
      };
    });
  };

  // =====================================================================
  // 9. Contacts: picker, share contact, open shared contact, QR
  // =====================================================================
  JC.knownContacts = function () {
    var out = [], seen = {};
    Array.prototype.forEach.call(document.querySelectorAll("#chatList .chat-row"), function (row) {
      var u = row.dataset && row.dataset.otherUid;
      if (!u || u === "undefined" || u === me() || seen[u]) return;
      var p = JC.getCachedProfile ? JC.getCachedProfile(u) : null;
      if (!p) return;
      seen[u] = 1;
      out.push({ uid: u, chatId: row.dataset.chatId, name: p.displayName || "Contact", username: p.username || "", gmail: p.gmail || "" });
    });
    out.sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
    return out;
  };
  JC.openContactPicker = function (onPick, multi, title) {
    var list = JC.knownContacts();
    if (!list.length) { toast("No contacts yet. Start a 1-to-1 chat first."); return; }
    JC.modal('<div class="sheet-title">' + esc(title || "Choose a contact") + '</div><div class="pick-list">' + list.map(function (c, i) {
      return '<label class="pick-row"><input type="' + (multi ? "checkbox" : "radio") + '" name="pk" value="' + i + '"><span class="pr-name">' + esc(c.name) + '</span><span class="pr-handle">' + esc(c.username ? "@" + c.username : c.gmail) + "</span></label>";
    }).join("") + '</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="pkCancel">Cancel</button><button type="button" class="btn btn-primary" id="pkOk">' + (multi ? "Done" : "Send") + "</button></div>", function (card, close) {
      card.querySelector("#pkCancel").onclick = close;
      card.querySelector("#pkOk").onclick = function () {
        var sel = Array.prototype.filter.call(card.querySelectorAll("input[name=pk]"), function (i) { return i.checked; }).map(function (i) { return list[+i.value]; });
        if (!sel.length) { toast("Choose a contact first."); return; }
        close(); onPick(multi ? sel : sel[0]);
      };
    });
  };
  JC.sendContact = function (c) {
    JC.sendCurrentMessage({ type: "text", text: "Contact: " + c.name + (c.username ? " @" + c.username : ""), contact: c }).catch(function () { toast("Contact not sent."); });
  };
  JC.openUserByUsername = function (u) {
    u = String(u || "").replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30);
    if (!u) return;
    if (JC.userProfile && JC.userProfile.username === u) { toast("This is you."); return; }
    JC.showScreen("screen-newchat", { push: true });
    var i = $("searchUsernameInput"), b = $("btnSearchUsername");
    if (i) i.value = "@" + u;
    if (b) b.click();
  };
  JC.openSharedContact = function (c) {
    if (c.uid === me()) { toast("This is you."); return; }
    if (c.username) { JC.openUserByUsername(c.username); return; }
    if (c.gmail) { JC.showScreen("screen-newchat", { push: true }); var i = $("searchInput"), b = $("btnSearch"); if (i) i.value = c.gmail; if (b) b.click(); return; }
    toast("This contact has no @username.");
  };
  JC.profileLink = function (username) { return BASE + "join.html?u=" + encodeURIComponent(username); };
  JC.qrSvg = function (text, cell) {
    if (typeof window.qrcode !== "function") return "";
    var q = window.qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag(cell || 6, 12);
  };
  JC.openMyQr = function () {
    var p = JC.userProfile || {};
    if (!p.username) { toast("Your account has no @username. Friends can find you by your Gmail."); return; }
    var link = JC.profileLink(p.username);
    JC.modal('<div class="sheet-title">My QR code</div><div class="qr-box">' + JC.qrSvg(link, 6) + '</div><div class="qr-name">' + esc(p.displayName || "") + '</div><div class="qr-handle">@' + esc(p.username) + '</div><p class="settings-note">Friends can scan this in Jilan Chat: New chat → Scan QR code.</p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="qrClose">Close</button><button type="button" class="btn btn-primary" id="qrShare">Share link</button></div>', function (card, close) {
      card.querySelector("#qrClose").onclick = close;
      card.querySelector("#qrShare").onclick = function () {
        var txt = "Chat with me on Jilan Chat: " + link;
        if (bridge("shareText")) { try { window.Android.shareText(txt); } catch (e) {} }
        else if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast("Link copied"); });
      };
    });
  };
  JC.parseScanned = function (text) {
    text = String(text || "").trim();
    var m = /[?&]u=([a-z0-9_.]{3,30})/i.exec(text) || /^jilanchat:\/\/user\?u=([a-z0-9_.]{3,30})/i.exec(text);
    if (m) return { kind: "user", value: m[1].toLowerCase() };
    m = /[?&](?:c|join)=([A-Za-z0-9]{12,32})/.exec(text);
    if (m) return { kind: "join", value: m[1] };
    m = /^@([a-z0-9_.]{3,30})$/i.exec(text);
    if (m) return { kind: "user", value: m[1].toLowerCase() };
    return null;
  };
  function loadJsQr(cb) {
    if (window.jsQR) { cb(); return; }
    var s = document.createElement("script"); s.src = "jsqr.js"; s.onload = cb; s.onerror = function () { toast("Scanner could not load."); };
    document.head.appendChild(s);
  }
  JC.openQrScanner = function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("Camera is not available."); return; }
    var stream = null, timer = null, done = false, detector = null;
    try { if (window.BarcodeDetector) detector = new window.BarcodeDetector({ formats: ["qr_code"] }); } catch (e) { detector = null; }
    JC.modal('<div class="sheet-title">Scan QR code</div><video id="qrVideo" class="qr-video" playsinline muted autoplay></video><p class="settings-note">Point the camera at a Jilan Chat QR code.</p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="qrScanClose">Close</button></div>', function (card, close) {
      card.querySelector("#qrScanClose").onclick = close;
      JC.onModalClose(function () { done = true; if (timer) clearInterval(timer); if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); });
      var video = card.querySelector("#qrVideo"), canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
      function found(txt) {
        var r = JC.parseScanned(txt);
        if (!r) return false;
        done = true; close();
        if (r.kind === "user") JC.openUserByUsername(r.value);
        else if (window.__jcJoinLink) window.__jcJoinLink(r.value);
        return true;
      }
      function tick() {
        if (done || !video.videoWidth) return;
        if (detector) { detector.detect(video).then(function (codes) { codes.some(function (c) { return found(c.rawValue); }); }).catch(function () {}); return; }
        if (!window.jsQR) return;
        var w = 480, h = Math.round(video.videoHeight * 480 / video.videoWidth);
        canvas.width = w; canvas.height = h; ctx.drawImage(video, 0, 0, w, h);
        var res = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
        if (res && res.data) found(res.data);
      }
      if (JC.suppressLockFor) JC.suppressLockFor(60000);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then(function (s) {
        if (done) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s; video.srcObject = s; try { video.play(); } catch (e) {}
        if (!detector) loadJsQr(function () {});
        timer = setInterval(tick, 300);
      }).catch(function () { close(); toast("Allow camera to scan QR codes."); });
    });
  };

  // =====================================================================
  // 10. Group @mention autocomplete + member cache
  // =====================================================================
  var memberCache = {}, memberGroupId = null;
  function groupMemberList() {
    var g = JC.currentGroup; if (!g) return [];
    return (g.members || []).map(function (u) { return memberCache[u] ? { uid: u, username: memberCache[u].username || "", name: memberCache[u].displayName || "" } : null; }).filter(Boolean);
  }
  JC.groupMemberList = groupMemberList;
  function loadMembers(gid, g) {
    if (!JC.db || !g) return;
    (g.members || []).forEach(function (u) {
      if (memberCache[u]) return;
      memberCache[u] = { displayName: "", username: "" };
      JC.db.collection("users").doc(u).get().then(function (s) { if (s.exists) memberCache[u] = s.data(); }).catch(function () {});
    });
    memberGroupId = gid;
  }
  JC.mentionCandidates = function (prefix, list) {
    prefix = String(prefix || "").toLowerCase();
    return (list || groupMemberList()).filter(function (m) {
      return m.uid !== me() && m.username && (m.username.indexOf(prefix) === 0 || (m.name || "").toLowerCase().indexOf(prefix) === 0);
    }).slice(0, 6);
  };
  function wireMentions() {
    var input = $("msgInput"); if (!input) return;
    var box = document.createElement("div"); box.id = "mentionBox"; box.className = "mention-box hidden";
    var comp = $("composer"); if (comp && comp.parentNode) comp.parentNode.insertBefore(box, comp);
    function hide() { box.classList.add("hidden"); box.innerHTML = ""; }
    input.addEventListener("input", function () {
      if (!JC.currentChatIsGroup) { hide(); return; }
      var pos = input.selectionStart == null ? input.value.length : input.selectionStart;
      var mm = /(^|\s)@([a-z0-9_.]{0,30})$/i.exec(input.value.slice(0, pos));
      if (!mm) { hide(); return; }
      var c = JC.mentionCandidates(mm[2]);
      if (!c.length) { hide(); return; }
      box.innerHTML = c.map(function (m) { return '<button type="button" class="mention-opt" data-u="' + esc(m.username) + '"><b>' + esc(m.name || m.username) + "</b> <span>@" + esc(m.username) + "</span></button>"; }).join("");
      box.classList.remove("hidden");
      box.onclick = function (e) {
        var t = e.target; while (t && t !== box && !(t.getAttribute && t.getAttribute("data-u"))) t = t.parentNode;
        if (!t || t === box) return;
        var before = input.value.slice(0, pos).replace(/@([a-z0-9_.]{0,30})$/i, "@" + t.getAttribute("data-u") + " ");
        input.value = before + input.value.slice(pos);
        hide(); try { input.focus(); input.setSelectionRange(before.length, before.length); } catch (e2) {}
        try { input.dispatchEvent(new Event("input")); } catch (e3) {}
      };
    });
    input.addEventListener("blur", function () { setTimeout(hide, 200); });
  }

  // =====================================================================
  // 11. Archive + locked chats (per phone) in the chat list
  // =====================================================================
  function arKey() { return "jc_archived_" + (me() || "x"); }
  function lkKey() { return "jc_lockedchats_" + (me() || "x"); }
  JC.getArchived = function () { var a = lsGet(arKey(), []); return Array.isArray(a) ? a : []; };
  JC.isArchived = function (id) { return JC.getArchived().indexOf(id) >= 0; };
  JC.toggleArchive = function (id) {
    var a = JC.getArchived(), i = a.indexOf(id);
    if (i >= 0) a.splice(i, 1); else a.push(id);
    lsSet(arKey(), a); JC.applyListFolders();
  };
  JC.getLockedChats = function () { var a = lsGet(lkKey(), []); return Array.isArray(a) ? a : []; };
  JC.isChatLocked = function (id) { return !!id && JC.getLockedChats().indexOf(id) >= 0; };
  var unlockedChats = {};
  JC.toggleChatLock = function (id) {
    if (!id) return;
    if (!JC.lockEnabled || !JC.lockEnabled()) { toast("Set an app lock PIN first: Settings → App lock."); return; }
    JC.authThen("Confirm with your PIN", function () {
      var a = JC.getLockedChats(), i = a.indexOf(id);
      if (i >= 0) { a.splice(i, 1); toast("Chat unlocked"); } else { a.push(id); unlockedChats[id] = true; toast("Chat locked. Find it in Locked chats."); }
      lsSet(lkKey(), a); JC.applyListFolders();
    });
  };
  var listMode = "main"; // main | archived | locked
  JC.listMode = function () { return listMode; };
  JC.setListMode = function (mode) {
    if (mode === "locked") { JC.authThen("Unlock locked chats", function () { listMode = "locked"; JC.applyListFolders(); }); return; }
    listMode = mode; JC.applyListFolders();
  };
  JC.applyListFolders = function () {
    var list = $("chatList"); if (!list) return;
    var ar = JC.getArchived(), lk = JC.getLockedChats(), nAr = 0, nLk = 0;
    Array.prototype.forEach.call(list.querySelectorAll(".chat-row"), function (row) {
      if (row.classList.contains("folder-row")) return;
      var id = row.dataset && row.dataset.chatId, isL = lk.indexOf(id) >= 0, isA = !isL && ar.indexOf(id) >= 0;
      if (isL) nLk++; if (isA) nAr++;
      var show = listMode === "main" ? (!isL && !isA) : listMode === "archived" ? isA : isL;
      row.style.display = show ? "" : "none";
    });
    var old = list.querySelectorAll(".folder-row"); Array.prototype.forEach.call(old, function (r) { r.parentNode.removeChild(r); });
    function folder(mode, label, count, back) {
      var r = document.createElement("div"); r.className = "chat-row folder-row"; r.setAttribute("data-folder", mode);
      r.innerHTML = '<div class="avatar folder-ico">' + (back ? "&larr;" : mode === "locked" ? LOCK_SVG : ARCH_SVG) + '</div><div class="info"><div class="top"><span class="name">' + esc(label) + '</span><span class="time">' + (back ? "" : count) + "</span></div></div>";
      r.addEventListener("click", function () { JC.setListMode(back ? "main" : mode); });
      list.insertBefore(r, list.firstChild);
    }
    if (listMode === "main") { if (nAr) folder("archived", "Archived", nAr); if (nLk) folder("locked", "Locked chats", nLk); }
    else folder("main", listMode === "archived" ? "Archived chats (tap to go back)" : "Locked chats (tap to go back)", 0, true);
  };
  var LOCK_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z"/></svg>';
  var ARCH_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.54 5.23l-1.39-1.68A1.45 1.45 0 0 0 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23A1.98 1.98 0 0 0 3 6.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>';
  function wrapListRender() {
    var orig = JC.afterChatListRender;
    JC.afterChatListRender = function () {
      var r = orig ? orig.apply(this, arguments) : undefined;
      try { JC.applyListFolders(); } catch (e) {}
      return r;
    };
    var origSheet = JC.openChatRowSheet;
    JC.openChatRowSheet = function (id) {
      if (!JC.isPinned) { if (origSheet) origSheet(id); return; }
      sheet(item("pin", JC.isPinned(id) ? "Unpin chat" : "Pin chat") + item("archive", JC.isArchived(id) ? "Unarchive chat" : "Archive chat") + item("lockchat", JC.isChatLocked(id) ? "Unlock chat" : "Lock chat") + item("mute", JC.isMuted(id) ? "Unmute notifications" : "Mute notifications") + item("delchat", "Delete chat", "danger"), function (act) {
        if (act === "pin") JC.togglePin(id);
        else if (act === "archive") { JC.toggleArchive(id); toast(JC.isArchived(id) ? "Chat archived" : "Chat unarchived"); }
        else if (act === "lockchat") JC.toggleChatLock(id);
        else if (act === "mute") JC.toggleMute(id);
        else if (act === "delchat") JC.confirmDeleteChat(id);
      });
    };
  }
  // Opening a locked chat (from anywhere) asks for the PIN / fingerprint.
  function wrapOpenChat() {
    var o1 = JC.openChat, o2 = JC.openGroupChat;
    if (o1) JC.openChat = function (chatId) {
      var self = this, args = arguments;
      if (JC.isChatLocked(chatId) && !unlockedChats[chatId]) { JC.authThen("Unlock this chat", function () { unlockedChats[chatId] = true; o1.apply(self, args); }); return; }
      return o1.apply(this, arguments);
    };
    if (o2) JC.openGroupChat = function (gid) {
      var self = this, args = arguments;
      if (JC.isChatLocked(gid) && !unlockedChats[gid]) { JC.authThen("Unlock this chat", function () { unlockedChats[gid] = true; o2.apply(self, args); }); return; }
      return o2.apply(this, arguments);
    };
  }
  // PIN / fingerprint confirm used by locked chats.
  var pendingAuth = null;
  JC.authThen = function (title, ok) {
    if (!JC.lockEnabled || !JC.lockEnabled()) { ok(); return; }
    var l = JC.getLock() || {};
    var fp = l.fp && JC.biometricAvailable && JC.biometricAvailable();
    JC.modal('<div class="sheet-title">' + esc(title) + '</div><input type="password" inputmode="numeric" maxlength="6" class="lock-pin" id="authPin" placeholder="PIN" autocomplete="off"><div class="lock-error" id="authErr"></div><div class="modal-actions">' + (fp ? '<button type="button" class="btn btn-ghost" id="authFp">Fingerprint</button>' : "") + '<button type="button" class="btn btn-ghost" id="authCancel">Cancel</button><button type="button" class="btn btn-primary" id="authOk">Unlock</button></div>', function (card, close) {
      var pin = card.querySelector("#authPin"), err = card.querySelector("#authErr");
      pendingAuth = function () { close(); ok(); };
      JC.onModalClose(function () { pendingAuth = null; });
      card.querySelector("#authCancel").onclick = close;
      function go() {
        var l2 = JC.getLock() || {};
        if (l2.until && Date.now() < l2.until) { err.textContent = "Too many tries. Wait 30 seconds."; return; }
        if (JC.checkPin(pin.value)) { var f = pendingAuth; pendingAuth = null; close(); ok(); return; }
        pin.value = ""; err.textContent = "Wrong PIN. Try again.";
      }
      card.querySelector("#authOk").onclick = go;
      pin.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
      var fb = card.querySelector("#authFp");
      if (fb) fb.onclick = function () { try { window.Android.biometricAuth(title); } catch (e) {} };
      try { pin.focus(); } catch (e) {}
    });
  };
  function wrapBiometric() {
    var orig = window.__jcBiometricResult;
    window.__jcBiometricResult = function (ok, msg) {
      if (pendingAuth) {
        if (ok) { var f = pendingAuth; pendingAuth = null; f(); }
        else { var e = $("authErr"); if (e && msg) e.textContent = String(msg).slice(0, 120); }
        return;
      }
      if (orig) return orig.apply(this, arguments);
    };
  }
  function wrapHidden() {
    document.addEventListener("visibilitychange", function () { if (document.hidden) { unlockedChats = {}; if (listMode === "locked") { listMode = "main"; JC.applyListFolders(); } } });
  }

  // =====================================================================
  // 12. Group photo + description + "Only admins can send"
  // =====================================================================
  JC.GROUP_DESC_MAX = 300;
  JC.groupAvatarHtml = function (g) {
    if (g && typeof g.photo === "string" && g.photo.indexOf("data:image/") === 0) return '<img src="' + esc(g.photo) + '" alt="">';
    return esc(((g && g.name) || "G").charAt(0).toUpperCase());
  };
  function wrapGroupDoc() {
    var orig = JC.onGroupDocUpdated;
    JC.onGroupDocUpdated = function (gid, g) {
      var r = orig ? orig.apply(this, arguments) : undefined;
      if (JC.currentChatId !== gid) return r;
      if (memberGroupId !== gid) memberCache = memberCache || {};
      loadMembers(gid, g);
      var av = $("chatAvatar"); if (av) av.innerHTML = JC.groupAvatarHtml(g);
      applyComposerLock();
      var gi = $("screen-groupinfo"); if (gi && gi.classList.contains("active")) renderGroupExtras();
      return r;
    };
  }
  JC.groupSendBlocked = function (g, uid) { return !!(g && g.onlyAdmins && (g.admins || []).indexOf(uid) < 0); };
  function applyComposerLock() {
    var comp = $("composer"); if (!comp) return;
    var bar = $("adminOnlyBar");
    if (!bar) { bar = document.createElement("div"); bar.id = "adminOnlyBar"; bar.className = "admin-only-bar hidden"; bar.textContent = "Only admins can send messages."; comp.parentNode.insertBefore(bar, comp.nextSibling); }
    var blocked = JC.currentChatIsGroup && JC.groupSendBlocked(JC.currentGroup, me());
    comp.classList.toggle("hidden", !!blocked);
    bar.classList.toggle("hidden", !blocked);
  }
  JC.applyComposerLock = applyComposerLock;
  function groupRef() { return JC.db.collection("groups").doc(JC.currentChatId); }
  function renderGroupExtras() {
    var g = JC.currentGroup; if (!g) return;
    var host = $("groupExtras");
    if (!host) {
      var after = $("groupInfoType"); if (!after) return;
      host = document.createElement("div"); host.id = "groupExtras";
      after.parentNode.insertBefore(host, after.nextSibling);
    }
    var admin = isAdminNow();
    host.innerHTML = '<div class="ge-photo"><div class="avatar large" id="gePhoto">' + JC.groupAvatarHtml(g) + "</div>" +
      (admin ? '<div class="ge-photo-btns"><button type="button" class="btn btn-ghost btn-small" id="geChangePhoto">Change group photo</button>' + (g.photo ? '<button type="button" class="btn btn-ghost btn-small" id="geRemovePhoto">Remove photo</button>' : "") + '<input type="file" id="gePhotoInput" class="hidden" accept="image/*"></div>' : "") + "</div>" +
      '<h2 style="margin-top:14px;">Description</h2>' +
      (admin ? '<textarea class="text-input" id="geDesc" rows="2" maxlength="300" placeholder="Add group description"></textarea><button type="button" class="btn btn-primary" id="geSaveDesc">Save description</button>'
        : '<p class="ge-desc">' + (g.description ? esc(g.description) : "No description") + "</p>") +
      (admin ? '<label class="tog-row"><span>Only admins can send messages</span><input type="checkbox" id="geOnlyAdmins"' + (g.onlyAdmins ? " checked" : "") + "></label>" : (g.onlyAdmins ? '<p class="settings-note">Only admins can send messages in this group.</p>' : ""));
    if (!admin) return;
    var d = $("geDesc"); if (d) d.value = g.description || "";
    $("geSaveDesc").onclick = function () {
      var v = String($("geDesc").value || "").trim().slice(0, JC.GROUP_DESC_MAX);
      groupRef().update({ description: v }).then(function () { toast("Description saved"); }).catch(function () { toast("Could not save."); });
    };
    $("geOnlyAdmins").onchange = function () {
      var on = !!$("geOnlyAdmins").checked;
      groupRef().update({ onlyAdmins: on }).then(function () {
        toast(on ? "Only admins can send messages now." : "All members can send messages now.");
        JC.sendCurrentMessage({ type: "text", text: on ? "Only admins can send messages now." : "All members can send messages now.", system: true }).catch(function () {});
      }).catch(function () { toast("Could not change the setting."); });
    };
    var inp = $("gePhotoInput");
    $("geChangePhoto").onclick = function () { if (JC.suppressLockFor) JC.suppressLockFor(120000); inp.click(); };
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.value = ""; if (!f) return;
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var data = JC.photoDataUrlFromImage(img, 256, 0.7);
        if (data && data.length > 150000) data = JC.photoDataUrlFromImage(img, 192, 0.5);
        if (!data || data.length > 150000) { toast("Photo is too big."); return; }
        groupRef().update({ photo: data }).then(function () { toast("Group photo changed"); }).catch(function () { toast("Could not change the photo."); });
      };
      img.onerror = function () { URL.revokeObjectURL(url); toast("This file is not a photo."); };
      img.src = url;
    };
    var rp = $("geRemovePhoto"); if (rp) rp.onclick = function () { groupRef().update({ photo: FV().delete() }).then(function () { toast("Group photo removed"); }).catch(function () {}); };
  }
  JC.renderGroupExtras = renderGroupExtras;
  function wrapGroupInfo() {
    var orig = JC.openGroupInfo;
    if (orig) JC.openGroupInfo = function () { var r = orig.apply(this, arguments); try { renderGroupExtras(); } catch (e) {} return r; };
    var origClose = JC.closeGroupChat;
    if (origClose) JC.closeGroupChat = function () { var r = origClose.apply(this, arguments); var c = $("composer"); if (c) c.classList.remove("hidden"); var b = $("adminOnlyBar"); if (b) b.classList.add("hidden"); return r; };
  }

  // =====================================================================
  // 13. Broadcast lists (per phone; one normal 1-to-1 message each)
  // =====================================================================
  function bcKey() { return "jc_broadcast_" + (me() || "x"); }
  JC.getBroadcasts = function () { var a = lsGet(bcKey(), []); return Array.isArray(a) ? a : []; };
  JC.saveBroadcasts = function (a) { lsSet(bcKey(), a); };
  JC.BROADCAST_MAX = 50;
  JC.openBroadcasts = function () {
    var lists = JC.getBroadcasts();
    JC.modal('<div class="sheet-title">Broadcast lists</div><p class="settings-note">A broadcast sends your message to each person as a normal private chat. They only get it if you are already chatting with them.</p><div class="pick-list">' +
      (lists.length ? lists.map(function (b, i) { return '<div class="bc-row"><button type="button" class="bc-open" data-i="' + i + '"><b>' + esc(b.name) + "</b><span>" + b.members.length + " recipients</span></button><button type=\"button\" class=\"bc-del\" data-del=\"" + i + '" aria-label="Delete list">&times;</button></div>'; }).join("") : '<p class="settings-note">No broadcast lists yet.</p>') +
      '</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="bcClose">Close</button><button type="button" class="btn btn-primary" id="bcNew">New list</button></div>', function (card, close) {
      card.querySelector("#bcClose").onclick = close;
      card.querySelector("#bcNew").onclick = function () { close(); JC.newBroadcast(); };
      card.querySelector(".pick-list").onclick = function (e) {
        var t = e.target; while (t && t !== card && !(t.getAttribute && (t.getAttribute("data-i") != null || t.getAttribute("data-del") != null))) t = t.parentNode;
        if (!t || t === card) return;
        if (t.getAttribute("data-del") != null) { var a = JC.getBroadcasts(); a.splice(+t.getAttribute("data-del"), 1); JC.saveBroadcasts(a); close(); JC.openBroadcasts(); return; }
        close(); JC.openBroadcastCompose(+t.getAttribute("data-i"));
      };
    });
  };
  JC.newBroadcast = function () {
    JC.openContactPicker(function (sel) {
      if (sel.length > JC.BROADCAST_MAX) { toast("A list can have up to " + JC.BROADCAST_MAX + " people."); return; }
      JC.modal('<div class="sheet-title">Name this list</div><input class="text-input" id="bcName" maxlength="40" placeholder="List name"><div class="modal-actions"><button type="button" class="btn btn-ghost" id="bcC">Cancel</button><button type="button" class="btn btn-primary" id="bcS">Save</button></div>', function (card, close) {
        card.querySelector("#bcC").onclick = close;
        card.querySelector("#bcS").onclick = function () {
          var name = String(card.querySelector("#bcName").value || "").trim().slice(0, 40) || ("Broadcast " + (JC.getBroadcasts().length + 1));
          var a = JC.getBroadcasts();
          a.push({ id: "b" + Date.now(), name: name, members: sel.map(function (c) { return { uid: c.uid, chatId: c.chatId, name: c.name }; }) });
          JC.saveBroadcasts(a); close(); toast("Broadcast list saved"); JC.openBroadcasts();
        };
      });
    }, true, "Choose recipients");
  };
  JC.sendBroadcast = function (list, text) {
    var saved = { id: JC.currentChatId, other: JC.currentChatOtherUid, g: JC.currentChatIsGroup, ds: JC.currentDisappearSec };
    var jobs = list.members.map(function (r) {
      JC.currentChatId = r.chatId; JC.currentChatOtherUid = r.uid; JC.currentChatIsGroup = false; JC.currentDisappearSec = 0;
      var p; try { p = JC.sendMessage({ type: "text", text: text }); } catch (e) { p = Promise.reject(e); }
      return p.then(function () { return true; }, function () { return false; });
    });
    JC.currentChatId = saved.id; JC.currentChatOtherUid = saved.other; JC.currentChatIsGroup = saved.g; JC.currentDisappearSec = saved.ds;
    return Promise.all(jobs).then(function (r) { return { ok: r.filter(Boolean).length, total: r.length }; });
  };
  JC.openBroadcastCompose = function (i) {
    var b = JC.getBroadcasts()[i]; if (!b) return;
    JC.modal('<div class="sheet-title">' + esc(b.name) + '</div><p class="settings-note">To: ' + esc(b.members.map(function (m) { return m.name; }).join(", ")) + '</p><textarea class="text-input" id="bcText" rows="3" maxlength="2000" placeholder="Message"></textarea><div class="modal-actions"><button type="button" class="btn btn-ghost" id="bcX">Cancel</button><button type="button" class="btn btn-primary" id="bcGo">Send</button></div>', function (card, close) {
      card.querySelector("#bcX").onclick = close;
      card.querySelector("#bcGo").onclick = function () {
        var t = String(card.querySelector("#bcText").value || "").trim(); if (!t) { toast("Write a message first."); return; }
        close(); toast("Sending to " + b.members.length + "...");
        JC.sendBroadcast(b, t).then(function (r) { toast("Sent to " + r.ok + " of " + r.total + "."); });
      };
    });
  };

  // =====================================================================
  // 14. Export chat (.txt)
  // =====================================================================
  JC.exportLines = function (entries, nameOf) {
    return entries.map(function (d) {
      var m = d.m, who = m.senderId === me() ? "You" : nameOf(m.senderId);
      var body = m.deleted ? "This message was deleted" : m.system ? "[" + (m.text || "") + "]" : m.poll ? "Poll: " + m.poll.q + " (" + (m.poll.opts || []).join(" / ") + ")" : m.sticker ? "Sticker" : m.contact ? "Contact: " + (m.contact.name || "") : m.location ? (m.text || "Location") : m.type === "image" ? "Photo" + (m.text ? ": " + m.text : "") : m.type === "voice" ? "Voice message" : m.type === "video" ? "Video" : m.type === "file" ? "File: " + (m.mediaName || "") : (m.text || "");
      return "[" + (fmtFull(m.createdAt) || "pending") + "] " + who + ": " + body + (m.edited ? " (edited)" : "");
    });
  };
  JC.buildExportText = function () {
    var all = JC.allMsgData ? JC.allMsgData() : {};
    var entries = Object.keys(all).map(function (k) { return all[k]; }).filter(function (d) { return d && d.m && (!d.el || d.el.style.display !== "none"); });
    entries.sort(function (a, b) { return (tsMs(a.m.createdAt) || 9e15) - (tsMs(b.m.createdAt) || 9e15); });
    var title = (($("chatName") || {}).textContent) || "Chat";
    var nameOf = function (u) {
      if (u === JC.currentChatOtherUid && JC.currentChatOther) return JC.currentChatOther.displayName || "Contact";
      var p = memberCache[u] || (JC.getCachedProfile && JC.getCachedProfile(u));
      return (p && p.displayName) || "Member";
    };
    return "Jilan Chat - " + title + "\nExported " + fmtFull(Date.now()) + "\n\n" + JC.exportLines(entries, nameOf).join("\n") + "\n";
  };
  JC.openExportChat = function () {
    var text = JC.buildExportText();
    var name = "Jilan Chat - " + ((($("chatName") || {}).textContent) || "Chat").replace(/[^A-Za-z0-9 _-]/g, "").slice(0, 40) + ".txt";
    sheet('<div class="sheet-title">Export chat (text only, no media)</div>' + item("save", "Save to phone") + item("share", "Share"), function (act) {
      if (act === "save") {
        if (bridge("saveToGallery")) {
          var b64 = ""; try { b64 = btoa(unescape(encodeURIComponent(text))); } catch (e) {}
          var r = ""; try { r = String(window.Android.saveToGallery(b64, "text/plain", name)); } catch (e) { r = "error"; }
          toast(r === "ok" ? "Saved to Download/Jilan Chat" : r === "permission" ? "Allow storage permission, then try again." : "Couldn't save. Try again.");
        } else {
          try {
            var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = name;
            document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000);
          } catch (e) { toast("Couldn't save."); }
        }
      } else if (act === "share") {
        if (bridge("shareText")) { try { window.Android.shareText(text.slice(0, 200000)); } catch (e) {} }
        else if (navigator.share) navigator.share({ title: name, text: text.slice(0, 200000) }).catch(function () {});
        else toast("Update the app to share.");
      }
    });
  };

  // =====================================================================
  // 15. Font size + Settings section
  // =====================================================================
  JC.FONT_SIZES = ["small", "medium", "large"];
  JC.getFontSize = function () { var f = lsGet("jc_fontsize", "medium"); return JC.FONT_SIZES.indexOf(f) >= 0 ? f : "medium"; };
  JC.applyFontSize = function (f) {
    f = JC.FONT_SIZES.indexOf(f) >= 0 ? f : JC.getFontSize();
    var h = document.documentElement;
    JC.FONT_SIZES.forEach(function (s) { h.classList.remove("fs-" + s); });
    h.classList.add("fs-" + f);
  };
  JC.setFontSize = function (f) { if (JC.FONT_SIZES.indexOf(f) < 0) return; lsSet("jc_fontsize", f); JC.applyFontSize(f); renderSettings2(); };
  function renderSettings2() {
    var host = $("settingsExtras2");
    if (!host) { var base = $("settingsExtras"); if (!base) return; host = document.createElement("div"); host.id = "settingsExtras2"; base.parentNode.insertBefore(host, base.nextSibling); }
    var f = JC.getFontSize();
    host.innerHTML = '<h2 style="margin-top:20px;">Chat font size</h2><div class="opt-row">' + JC.FONT_SIZES.map(function (s) { return '<button type="button" class="opt-btn' + (s === f ? " on" : "") + '" data-fs="' + s + '">' + s.charAt(0).toUpperCase() + s.slice(1) + "</button>"; }).join("") + "</div>" +
      '<h2 style="margin-top:20px;">Chats</h2><button type="button" class="btn btn-ghost" id="setBroadcast">Broadcast lists</button>' +
      '<p class="settings-note">Archived chats: long-press a chat → Archive. Locked chats: long-press a chat → Lock chat (needs an app lock PIN).</p>';
    host.onclick = function (e) {
      var t = e.target; if (!t || !t.getAttribute) return;
      if (t.getAttribute("data-fs")) JC.setFontSize(t.getAttribute("data-fs"));
      if (t.id === "setBroadcast") JC.openBroadcasts();
    };
  }
  JC.renderSettings2 = renderSettings2;

  // =====================================================================
  // 16. Text status colours + fonts (status.js reads JC.statusStyle)
  // =====================================================================
  JC.STATUS_BGS = ["#1f7ae0", "#1565c0", "#6a1b9a", "#ad1457", "#e65100", "#c62828", "#37474f", "#00838f"];
  JC.STATUS_FONTS = ["sans", "serif", "mono", "bold"];
  JC.statusStyle = { bg: JC.STATUS_BGS[0], font: "sans" };
  JC.validStatusBg = function (bg) { return JC.STATUS_BGS.indexOf(bg) >= 0 ? bg : ""; };
  JC.validStatusFont = function (f) { return JC.STATUS_FONTS.indexOf(f) >= 0 ? f : ""; };
  function wireStatusStyle() {
    // v4.12: the full-screen composer (status2.js) owns colours + fonts now.
    if ($("statusComposer")) return;
    var inp = $("statusTextInput"); if (!inp || $("statusStyleRow")) return;
    var row = document.createElement("div"); row.id = "statusStyleRow"; row.className = "status-style-row";
    row.innerHTML = '<div class="ss-preview" id="statusPreview">Your text status</div><div class="ss-pick">' +
      JC.STATUS_BGS.map(function (c) { return '<button type="button" class="ss-color" data-bg="' + c + '" style="background:' + c + '" aria-label="Colour"></button>'; }).join("") +
      '</div><div class="ss-pick">' + JC.STATUS_FONTS.map(function (f) { return '<button type="button" class="ss-font f-' + f + '" data-font="' + f + '">Aa</button>'; }).join("") + "</div>";
    inp.parentNode.insertBefore(row, inp.nextSibling);
    function paint() {
      var p = $("statusPreview"); if (!p) return;
      p.style.background = JC.statusStyle.bg; p.className = "ss-preview f-" + JC.statusStyle.font;
      p.textContent = inp.value || "Your text status";
      Array.prototype.forEach.call(row.querySelectorAll(".ss-color"), function (b) { b.classList.toggle("on", b.getAttribute("data-bg") === JC.statusStyle.bg); });
      Array.prototype.forEach.call(row.querySelectorAll(".ss-font"), function (b) { b.classList.toggle("on", b.getAttribute("data-font") === JC.statusStyle.font); });
    }
    row.addEventListener("click", function (e) {
      var t = e.target; if (!t || !t.getAttribute) return;
      if (t.getAttribute("data-bg")) JC.statusStyle.bg = t.getAttribute("data-bg");
      if (t.getAttribute("data-font")) JC.statusStyle.font = t.getAttribute("data-font");
      paint();
    });
    inp.addEventListener("input", paint);
    paint();
  }

  // =====================================================================
  // 17. Deep links (vc9 shell) + ?user= in URL + profile/new-chat buttons
  // =====================================================================
  window.__jcDeepLink = function (uri) {
    var r = JC.parseScanned(uri); if (!r) return;
    if (r.kind === "join") { if (window.__jcJoinLink) window.__jcJoinLink(r.value); return; }
    if (JC.db && me()) JC.openUserByUsername(r.value); else lsSet("jc_pendingUser", r.value);
  };
  window.__jcStoragePermission = function (ok) { toast(ok ? "Permission allowed. Tap Save again." : "Storage permission was not allowed."); };
  function checkPendingUser() {
    var u = lsGet("jc_pendingUser", "");
    if (u && JC.db && me() && JC.userProfile) { lsSet("jc_pendingUser", ""); JC.openUserByUsername(u); return true; }
    return !u;
  }
  function addButtons() {
    var cp = $("btnCopyUsername");
    if (cp && !$("btnMyQr")) { var b = document.createElement("button"); b.className = "btn btn-ghost btn-small"; b.id = "btnMyQr"; b.type = "button"; b.textContent = "My QR code"; cp.parentNode.appendChild(b); b.addEventListener("click", JC.openMyQr); }
    var su = $("btnSearchUsername");
    if (su && !$("btnScanQr")) { var s = document.createElement("button"); s.className = "btn btn-ghost"; s.id = "btnScanQr"; s.type = "button"; s.textContent = "Scan QR code"; su.parentNode.insertBefore(s, su.nextSibling); s.addEventListener("click", JC.openQrScanner); }
    var mm = $("mainMenu");
    if (mm && !mm.querySelector('[data-action="broadcast"]')) {
      var st = mm.querySelector('[data-action="starred"]');
      var bb = document.createElement("button"); bb.type = "button"; bb.setAttribute("role", "menuitem"); bb.setAttribute("data-action", "broadcast"); bb.textContent = "Broadcast lists";
      mm.insertBefore(bb, st ? st.nextSibling : null);
    }
  }
  function patchMainMenu() {
    var orig = JC.runMainMenuAction;
    JC.runMainMenuAction = function (key) { if (key === "broadcast") { if (JC.closeMainMenu) JC.closeMainMenu(); JC.openBroadcasts(); return; } return orig ? orig.apply(this, arguments) : undefined; };
    var mm = $("mainMenu");
    if (mm) mm.addEventListener("click", function (e) { var t = e.target; if (t && t.getAttribute && t.getAttribute("data-action") === "broadcast") { e.stopPropagation(); if (JC.closeMainMenu) JC.closeMainMenu(); JC.openBroadcasts(); } }, true);
  }

  JC.wireV48b = function () {
    chainApply(); wrapMediaBody(); wrapPreRender(); wrapDecorate(); wrapRefresh(); chainMessageItems();
    wrapAttach(); chainChatMenu(); wrapSendCurrent(); wrapListRender(); wrapOpenChat(); wrapBiometric();
    wrapGroupDoc(); wrapGroupInfo(); wrapHidden();
    wireBubbleClicks(); wireViewerClose(); wireMentions(); wireStatusStyle(); addButtons(); patchMainMenu();
    JC.applyFontSize(); renderSettings2();
    var sb = $("btnSettings"); if (sb) sb.addEventListener("click", renderSettings2);
    try {
      var q = (location.search || "").match(/[?&]user=([a-z0-9_.]{3,30})/i);
      if (q) { lsSet("jc_pendingUser", q[1].toLowerCase()); try { history.replaceState(history.state, "", location.pathname); } catch (e) {} }
    } catch (e) {}
    if (window.__jcPendingDeepLink) { var pl = window.__jcPendingDeepLink; window.__jcPendingDeepLink = null; window.__jcDeepLink(pl); }
    var tries = 0, t = setInterval(function () { if (checkPendingUser() || ++tries > 120) clearInterval(t); }, 1000);
  };
  document.addEventListener("DOMContentLoaded", function () { JC.wireV48b(); });
})();
