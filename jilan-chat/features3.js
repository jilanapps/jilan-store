// Jilan Chat v4.8 part 3 — features3.js
// Translate a message, Share Jilan Chat (invite), Do Not Disturb,
// share OUT (text / photo / voice to other apps) and share IN (other
// apps → "Send to…" a chat). Spark only, no paid APIs.
(function () {
  var JC = window.JC = window.JC || {};
  var STORE_APK = "https://jilanapps.github.io/jilan-store/jilan-chat/jilan-chat.apk";
  var PLAY_URL = "https://play.google.com/store/apps/details?id=com.jilanapps.jilanchat";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(t) { if (JC.toast) JC.toast(t); }
  function bridge(n) { try { return window.Android && typeof window.Android[n] === "function"; } catch (e) { return false; } }
  function item(a, l, c) { return JC.sheetItem ? JC.sheetItem(a, l, c) : '<button type="button" class="sheet-item" data-act="' + a + '">' + esc(l) + "</button>"; }
  function sheet(h, cb) { if (JC.openSheet) JC.openSheet(h, cb); }

  // =====================================================================
  // 1. Share Jilan Chat (invite friends)
  // =====================================================================
  JC.appLink = function () { return (JC.isPlayBuild && JC.isPlayBuild()) ? PLAY_URL : STORE_APK; };
  JC.inviteAppText = function () {
    var p = JC.userProfile || {};
    return "Join me on Jilan Chat, a free private chat app for family and friends." +
      (p.username ? " My username is @" + p.username + "." : "") +
      "\nDownload: " + JC.appLink();
  };
  JC.shareApp = function () {
    var t = JC.inviteAppText();
    if (bridge("shareText")) { try { window.Android.shareText(t); return "native"; } catch (e) {} }
    if (navigator.share) { navigator.share({ title: "Jilan Chat", text: t }).catch(function () {}); return "web"; }
    if (JC.openExternal) { JC.openExternal("https://wa.me/?text=" + encodeURIComponent(t)); return "wa"; }
    return "none";
  };

  // =====================================================================
  // 2. Do Not Disturb (per phone schedule)
  // =====================================================================
  JC.getDnd = function () { var d = lsGet("jc_dnd", null); return d && typeof d === "object" ? d : { on: false, from: "23:00", to: "07:00" }; };
  JC.setDnd = function (d) { lsSet("jc_dnd", d); };
  function mins(hhmm) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "")); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  JC.dndActive = function (now) {
    var d = JC.getDnd(); if (!d.on) return false;
    var a = mins(d.from), b = mins(d.to); if (a == null || b == null) return false;
    if (a === b) return true; // same start and end = all day
    var t = now || new Date(), x = t.getHours() * 60 + t.getMinutes();
    return a < b ? (x >= a && x < b) : (x >= a || x < b);
  };
  function wrapTone() {
    var orig = JC.playMessageTone;
    if (orig && !orig._dnd) { JC.playMessageTone = function () { if (JC.dndActive()) return false; return orig.apply(this, arguments); }; JC.playMessageTone._dnd = true; }
  }

  // =====================================================================
  // 3. Translate a message
  // =====================================================================
  JC.LANGS = [["en", "English"], ["ur", "Urdu"], ["ar", "Arabic"], ["hi", "Hindi"], ["pa", "Punjabi"], ["fa", "Persian"], ["tr", "Turkish"], ["zh-CN", "Chinese"], ["es", "Spanish"], ["fr", "French"]];
  JC.getTranslateTarget = function () { var t = lsGet("jc_tr_target", "en"); return JC.LANGS.some(function (l) { return l[0] === t; }) ? t : "en"; };
  JC.setTranslateTarget = function (t) { if (JC.LANGS.some(function (l) { return l[0] === t; })) lsSet("jc_tr_target", t); };
  JC.langName = function (c) { var f = JC.LANGS.filter(function (l) { return l[0] === c; })[0]; return f ? f[1] : (c || ""); };
  var trCb = {}, trSeq = 0;
  window.__jcTranslateResult = function (id, ok, text, src) {
    var cb = trCb[id]; if (!cb) return; delete trCb[id];
    cb(!!ok, String(text || ""), String(src || ""));
  };
  JC.parseGtx = function (j) {
    if (!Array.isArray(j) || !Array.isArray(j[0])) return null;
    var out = j[0].map(function (seg) { return Array.isArray(seg) ? (seg[0] || "") : ""; }).join("");
    return out ? { text: out, src: typeof j[2] === "string" ? j[2] : "" } : null;
  };
  JC.translate = function (text, target) {
    return new Promise(function (resolve, reject) {
      text = String(text || "").slice(0, 4000);
      if (!text.trim()) { reject(new Error("empty")); return; }
      if (bridge("translate")) {
        var id = "t" + (++trSeq);
        trCb[id] = function (ok, t, s) { if (ok && t) resolve({ text: t, src: s }); else reject(new Error(t || "failed")); };
        try { window.Android.translate(text, target, id); } catch (e) { delete trCb[id]; reject(e); }
        setTimeout(function () { if (trCb[id]) { delete trCb[id]; reject(new Error("timeout")); } }, 20000);
        return;
      }
      if (!window.fetch) { reject(new Error("no-fetch")); return; }
      fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + encodeURIComponent(target) + "&dt=t&q=" + encodeURIComponent(text))
        .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
        .then(function (j) { var p = JC.parseGtx(j); if (p) resolve(p); else throw new Error("bad"); })
        .catch(function () {
          fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text.slice(0, 500)) + "&langpair=auto|" + encodeURIComponent(target))
            .then(function (r) { return r.json(); })
            .then(function (j) { var t = j && j.responseData && j.responseData.translatedText; if (t) resolve({ text: t, src: "" }); else reject(new Error("bad")); })
            .catch(reject);
        });
    });
  };
  JC.openTranslate = function (m) {
    var target = JC.getTranslateTarget();
    JC.modal('<div class="sheet-title">Translate to ' + esc(JC.langName(target)) + '</div><div class="tr-orig">' + esc(m.text || "") + '</div><div class="tr-out" id="trOut">Translating...</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="trLang">Change language</button><button type="button" class="btn btn-ghost" id="trCopy">Copy</button><button type="button" class="btn btn-primary" id="trClose">Close</button></div>', function (card, close) {
      var out = card.querySelector("#trOut"), result = "";
      card.querySelector("#trClose").onclick = close;
      card.querySelector("#trCopy").onclick = function () { if (result && JC.copyText) JC.copyText(result); };
      card.querySelector("#trLang").onclick = function () { close(); JC.openTranslateLangSheet(function () { JC.openTranslate(m); }); };
      JC.translate(m.text, target).then(function (r) {
        result = r.text; out.textContent = r.text;
        if (r.src && r.src !== target) out.setAttribute("data-src", "From " + JC.langName(r.src));
      }).catch(function () { out.textContent = "Couldn't translate right now. Check your internet and try again."; });
    });
  };
  JC.openTranslateLangSheet = function (after) {
    var cur = JC.getTranslateTarget();
    sheet('<div class="sheet-title">Translate messages to</div>' + JC.LANGS.map(function (l) { return item("lang_" + l[0], (l[0] === cur ? "✓ " : "") + l[1]); }).join(""), function (act) {
      if (act.indexOf("lang_") === 0) { JC.setTranslateTarget(act.slice(5)); renderSettings3(); if (after) after(); }
    });
  };

  // =====================================================================
  // 4. Share OUT (to WhatsApp etc.)
  // =====================================================================
  JC.canShareOut = function (m) {
    if (!m || m.deleted || m.system || m.viewOnce) return false;
    if (m.type === "text") return !!(m.text || m.location || m.contact);
    return (m.type === "image" || m.type === "voice") && typeof m.mediaData === "string" && m.mediaData.indexOf("data:") === 0;
  };
  JC.shareTextOut = function (t) {
    if (bridge("shareText")) { try { window.Android.shareText(t); return true; } catch (e) {} }
    if (navigator.share) { navigator.share({ text: t }).catch(function () {}); return true; }
    toast("Update the app to share."); return false;
  };
  JC.shareDataUrlOut = function (dataUrl, baseName) {
    var mm = /^data:([a-z]+\/[a-z0-9.+-]+)(?:;[^,]*)?;base64,(.+)$/i.exec(String(dataUrl || ""));
    if (!mm) { toast("This can't be shared."); return false; }
    var mime = mm[1].toLowerCase();
    if (!bridge("shareFile")) { toast("Update the app to share photos and voice messages."); return false; }
    var name = JC.galleryName ? JC.galleryName(mime, baseName || "JilanChat") : "JilanChat.jpg";
    var r = ""; try { r = String(window.Android.shareFile(mm[2], mime, name)); } catch (e) { r = "error"; }
    if (r !== "ok") { toast("Couldn't share. Try again."); return false; }
    return true;
  };
  JC.shareMessageOut = function (m) {
    if (!JC.canShareOut(m)) { toast(m && m.viewOnce ? "View once photos can't be shared." : "This message can't be shared."); return; }
    if (m.type === "image" || m.type === "voice") { JC.shareDataUrlOut(m.mediaData, m.type === "voice" ? "JilanChat-Voice" : "JilanChat"); return; }
    if (m.contact) { JC.shareTextOut((m.contact.name || "Contact") + (m.contact.username ? " (@" + m.contact.username + ") on Jilan Chat: " + (JC.profileLink ? JC.profileLink(m.contact.username) : "") : "")); return; }
    JC.shareTextOut(m.text || "");
  };
  function chainItems() {
    var oi = JC.extraMessageItems, oa = JC.onExtraMessageAction;
    JC.extraMessageItems = function (msgId, m, mk) {
      var mk2 = mk || item, out = "";
      if (m && !m.deleted && !m.system) {
        if (m.type === "text" && m.text && !m.poll && !m.sticker && !m.location && !m.contact) out += mk2("translate", "Translate");
        if (JC.canShareOut(m)) out += mk2("shareout", "Share");
      }
      return out + (oi ? oi.apply(this, arguments) : "");
    };
    JC.onExtraMessageAction = function (act, msgId, m) {
      if (act === "translate") { JC.openTranslate(m); return true; }
      if (act === "shareout") { JC.shareMessageOut(m); return true; }
      return oa ? oa.apply(this, arguments) : false;
    };
  }

  // =====================================================================
  // 5. Share IN (other apps → Jilan Chat)
  // =====================================================================
  JC.shareTargets = function () {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll("#chatList .chat-row"), function (row) {
      if (row.classList.contains("folder-row")) return;
      var id = row.dataset && row.dataset.chatId; if (!id) return;
      var nm = row.querySelector(".name"), ou = row.dataset.otherUid;
      out.push({ chatId: id, otherUid: ou && ou !== "undefined" ? ou : "", isGroup: !ou || ou === "undefined" || ou === "", name: (nm && nm.textContent) || "Chat" });
    });
    return out;
  };
  JC.dataUrlToFile = function (dataUrl, name) {
    var mm = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/.exec(String(dataUrl || "")); if (!mm) return null;
    var bin = atob(mm[2]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    try { return new File([arr], name || "shared.jpg", { type: mm[1] }); } catch (e) { var b = new Blob([arr], { type: mm[1] }); b.name = name || "shared.jpg"; return b; }
  };
  function waitForChat(chatId, fn) {
    var n = 0, t = setInterval(function () {
      if (JC.currentChatId === chatId) { clearInterval(t); setTimeout(fn, 400); }
      else if (++n > 120) { clearInterval(t); toast("Not sent. Open the chat and try again."); }
    }, 250);
  }
  JC.deliverShareIn = function (payload, target) {
    if (target.isGroup) JC.openGroupChat(target.chatId); else JC.openChat(target.chatId, target.otherUid);
    waitForChat(target.chatId, function () {
      if (payload.type === "text") {
        JC.sendCurrentMessage({ type: "text", text: String(payload.text || "").slice(0, 4000) }).then(function () { toast("Sent"); }).catch(function () { toast("Message not sent."); });
      } else if (payload.type === "image") {
        var f = JC.dataUrlToFile(payload.dataUrl, payload.name || "shared.jpg");
        if (f && JC.sendFile) JC.sendFile(f); else toast("This photo can't be sent.");
      }
    });
  };
  JC.openShareIn = function (payload) {
    if (!payload || (payload.type !== "text" && payload.type !== "image")) return;
    if (!JC.db || !(JC.currentUser && JC.currentUser.uid)) { lsSet("jc_pendingShareIn", payload.type === "text" ? payload : { type: "image", dataUrl: payload.dataUrl, name: payload.name }); toast("Sign in first. Then choose a chat."); return; }
    var list = JC.shareTargets();
    if (!list.length) { toast("No chats yet. Start a chat first."); return; }
    var prev = payload.type === "text" ? '<div class="tr-orig">' + esc(String(payload.text || "").slice(0, 300)) + "</div>" : '<img class="share-prev" src="' + esc(payload.dataUrl) + '" alt="Photo">';
    JC.modal('<div class="sheet-title">Send to…</div>' + prev + '<div class="pick-list">' + list.map(function (c, i) {
      return '<button type="button" class="share-row" data-i="' + i + '"><span class="pr-name">' + esc(c.name) + '</span><span class="pr-handle">' + (c.isGroup ? "Group" : "") + "</span></button>";
    }).join("") + '</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="siCancel">Cancel</button></div>', function (card, close) {
      card.querySelector("#siCancel").onclick = close;
      card.querySelector(".pick-list").onclick = function (e) {
        var t = e.target; while (t && t !== card && !(t.getAttribute && t.getAttribute("data-i") != null)) t = t.parentNode;
        if (!t || t === card) return;
        var target = list[+t.getAttribute("data-i")]; close();
        JC.deliverShareIn(payload, target);
      };
    });
  };
  window.__jcShareIn = function (obj) {
    var p = obj; if (typeof p === "string") { try { p = JSON.parse(p); } catch (e) { return; } }
    JC.openShareIn(p);
  };
  function checkPendingShare() {
    var p = lsGet("jc_pendingShareIn", null);
    if (p && JC.db && JC.currentUser && document.querySelector && document.querySelector("#chatList .chat-row")) { lsSet("jc_pendingShareIn", null); JC.openShareIn(p); return true; }
    return !p;
  }

  // =====================================================================
  // 6. Settings + menu entry points
  // =====================================================================
  function renderSettings3() {
    var host = $("settingsExtras3");
    if (!host) {
      var base = $("settingsExtras2") || $("settingsExtras"); if (!base) return;
      host = document.createElement("div"); host.id = "settingsExtras3"; base.parentNode.insertBefore(host, base.nextSibling);
    }
    var d = JC.getDnd();
    host.innerHTML = '<h2 style="margin-top:20px;">Do Not Disturb</h2><label class="tog-row"><span>Silent hours</span><input type="checkbox" id="dndOn"' + (d.on ? " checked" : "") + '></label>' +
      '<div class="dnd-times"><label>From <input type="time" id="dndFrom" value="' + esc(d.from) + '"></label><label>To <input type="time" id="dndTo" value="' + esc(d.to) + '"></label></div>' +
      '<p class="settings-note">During silent hours Jilan Chat plays no message tone and no vibration. Calls still show on screen, silently.' + (JC.dndActive() ? " Silent hours are on now." : "") + "</p>" +
      '<h2 style="margin-top:20px;">Translate</h2><button type="button" class="btn btn-ghost" id="trSetLang">Translate messages to: ' + esc(JC.langName(JC.getTranslateTarget())) + "</button>" +
      '<h2 style="margin-top:20px;">Invite friends</h2><button type="button" class="btn btn-primary" id="setShareApp">Share Jilan Chat</button>';
    function save() { JC.setDnd({ on: !!$("dndOn").checked, from: $("dndFrom").value || "23:00", to: $("dndTo").value || "07:00" }); }
    $("dndOn").onchange = function () { save(); renderSettings3(); };
    $("dndFrom").onchange = save; $("dndTo").onchange = save;
    $("trSetLang").onclick = function () { JC.openTranslateLangSheet(null); };
    $("setShareApp").onclick = JC.shareApp;
  }
  JC.renderSettings3 = renderSettings3;
  function addEntryPoints() {
    var mm = $("mainMenu");
    if (mm && !mm.querySelector('[data-action="shareapp"]')) {
      var ab = mm.querySelector('[data-action="about"]');
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem"); b.setAttribute("data-action", "shareapp"); b.textContent = "Share Jilan Chat";
      mm.insertBefore(b, ab || null);
      mm.addEventListener("click", function (e) { var t = e.target; if (t && t.getAttribute && t.getAttribute("data-action") === "shareapp") { e.stopPropagation(); if (JC.closeMainMenu) JC.closeMainMenu(); JC.shareApp(); } }, true);
    }
    var about = $("screen-about");
    if (about && !$("btnAboutShareApp")) {
      var body = about.querySelector(".page-body") || about;
      var s = document.createElement("button"); s.type = "button"; s.className = "btn btn-primary"; s.id = "btnAboutShareApp"; s.textContent = "Share Jilan Chat";
      s.addEventListener("click", JC.shareApp); body.appendChild(s);
    }
    var vc = $("viewerClose");
    if (vc && !$("viewerShare")) {
      var vs = document.createElement("button"); vs.id = "viewerShare"; vs.type = "button"; vs.setAttribute("aria-label", "Share"); vs.title = "Share";
      vs.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-5.91.7L8.04 9.81A2.99 2.99 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.16c-.05.21-.08.43-.08.65A2.92 2.92 0 1 0 18 16.08z"/></svg>';
      vs.addEventListener("click", function (e) { e.stopPropagation(); var im = $("viewerImg"); JC.shareDataUrlOut(im && im.src, "JilanChat"); });
      vc.parentNode.insertBefore(vs, vc);
    }
  }
  JC.wireV48c = function () {
    wrapTone(); chainItems(); addEntryPoints(); renderSettings3();
    var sb = $("btnSettings"); if (sb) sb.addEventListener("click", renderSettings3);
    if (window.__jcPendingShareIn) { var p = window.__jcPendingShareIn; window.__jcPendingShareIn = null; window.__jcShareIn(p); }
    var n = 0, t = setInterval(function () { if (checkPendingShare() || ++n > 180) clearInterval(t); }, 1000);
  };
  document.addEventListener("DOMContentLoaded", function () { JC.wireV48c(); });
})();
