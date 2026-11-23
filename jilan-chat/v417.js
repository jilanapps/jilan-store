/* =====================================================================
   Jilan Chat v4.17 — WhatsApp-style chat header tap + Settings list.
   1) Chat header: avatar + name/"online" are one tap target (#chatHeadTap).
      1-to-1 → Contact info, group → Group info (both push history, so
      Back returns to the chat).
   2) Settings: a short main list (profile card + Account, Privacy, Chats,
      Notifications, Storage and data, Invite a friend, Help). Each row
      opens a sub-page of the SAME screen with history push; Android Back
      returns to the list. The existing controls (rendered by extras.js,
      features.js, features2.js, features3.js, block.js) are NOT rebuilt —
      they are only tagged with a group and shown/hidden, so their logic,
      handlers and saved keys stay exactly as before.
   ===================================================================== */
(function () {
  "use strict";
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ---------------------------------------------------------------- 1. header
  JC.openChatHeaderInfo = function () {
    if (JC.currentChatIsGroup) { if (JC.openGroupInfo) JC.openGroupInfo(); return "group"; }
    if (JC.currentChatOtherUid) { if (JC.openContactProfile) JC.openContactProfile(); return "contact"; }
    return "";
  };
  function wireHeader() {
    var t = $("chatHeadTap"); if (!t || t.__v417) return;
    t.__v417 = true;
    t.addEventListener("click", function (e) { e.preventDefault(); JC.openChatHeaderInfo(); });
    t.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); JC.openChatHeaderInfo(); } });
  }

  // ---------------------------------------------------------- 2. settings
  var IC = {
    account: "M12.65 10A6 6 0 1 0 12.65 14H17v4h4v-4h2v-4H12.65zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z",
    privacy: "M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z",
    chats: "M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z",
    notifications: "M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
    storage: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6H8l4-5 4 5h-3v6z",
    invite: "M15 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    help: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92A3.4 3.4 0 0 0 13 15h-2v-.5a4 4 0 0 1 1.17-2.83l1.24-1.26A1.96 1.96 0 0 0 14 9a2 2 0 0 0-4 0H8a4 4 0 0 1 8 0 3.18 3.18 0 0 1-.93 2.25z",
    blocked: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zM4 12a8 8 0 0 1 12.9-6.32L5.68 16.9A7.9 7.9 0 0 1 4 12zm8 8a7.9 7.9 0 0 1-4.9-1.68L18.32 7.1A7.9 7.9 0 0 1 20 12a8 8 0 0 1-8 8z",
    user: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    mail: "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z",
    info: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    support: "M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z",
    chev: "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
  };
  function svg(d, sz) { return '<svg width="' + (sz || 24) + '" height="' + (sz || 24) + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function row(key, title, sub, icon) {
    return '<button type="button" class="set-row" data-sgo="' + key + '"><span class="set-ic">' + svg(IC[icon || key]) +
      '</span><span class="set-txt"><span class="set-title">' + esc(title) + '</span>' + (sub ? '<span class="set-sub">' + esc(sub) + "</span>" : "") + "</span></button>";
  }
  JC.SETTINGS_GROUPS = [
    ["account", "Account", "Username, Gmail, blocked contacts"],
    ["privacy", "Privacy", "Last seen, read receipts, app lock"],
    ["chats", "Chats", "Theme, wallpaper, font size, translate"],
    ["notifications", "Notifications", "Do Not Disturb, message tones"],
    ["storage", "Storage and data", "Save photos to gallery"],
    ["invite", "Invite a friend", "Share Jilan Chat"],
    ["help", "Help", "About, contact support"]
  ];
  var TITLES = { main: "Settings", account: "Account", privacy: "Privacy", chats: "Chats", notifications: "Notifications", storage: "Storage and data", help: "Help", blocked: "Blocked contacts" };
  JC.SETTINGS_TITLES = TITLES;
  // Heading text (h2) of an existing section → sub-page it belongs to.
  JC.SETTINGS_HEADING_GROUP = {
    "theme": "chats", "chat wallpaper": "chats", "chat font size": "chats", "chats": "chats", "translate": "chats",
    "app lock": "privacy", "privacy": "privacy",
    "media": "storage",
    "do not disturb": "notifications",
    "invite friends": "invite",
    "blocked contacts": "blocked"
  };
  JC.settingsGroupForHeading = function (txt) {
    var k = String(txt || "").trim().toLowerCase();
    return JC.SETTINGS_HEADING_GROUP[k] || "chats";
  };
  var SUPPORT_URL = "https://wa.me/923007379385";
  JC.SUPPORT_URL = SUPPORT_URL;

  function profileGmail() {
    var p = JC.userProfile || {};
    try { if (JC.profileGmailValue) return JC.profileGmailValue(p, JC.currentUser && JC.currentUser.email) || ""; } catch (e) {}
    var e2 = (JC.currentUser && JC.currentUser.email) || p.gmail || "";
    return /@jilanchat\.local$/i.test(e2) ? "" : e2;
  }
  function renderMain() {
    var box = $("setMain"); if (!box) return;
    var p = JC.userProfile || {};
    var name = p.displayName || "Your name";
    var about = JC.aboutOf ? JC.aboutOf(p) : (p.about || "Available");
    var av = p.photoURL ? '<img src="' + esc(p.photoURL) + '" alt="">' : esc((name || "?").trim().charAt(0).toUpperCase() || "?");
    box.innerHTML = '<button type="button" class="set-card" data-sgo="profile"><span class="avatar set-card-av">' + av + '</span><span class="set-txt"><span class="set-card-name">' + esc(name) +
      '</span><span class="set-sub">' + esc(about) + "</span></span></button>" +
      JC.SETTINGS_GROUPS.map(function (g) { return row(g[0], g[1], g[2]); }).join("");
  }
  function renderAccount() {
    var box = $("setAccount"); if (!box) return;
    var p = JC.userProfile || {}, g = profileGmail();
    var h = '<div class="set-static"><span class="set-ic">' + svg(IC.user) + '</span><span class="set-txt"><span class="set-sub">Username</span><span class="set-title">' +
      esc(p.username ? "@" + p.username : "Not set") + '</span><span class="set-sub">' + (p.username ? "Username can't be changed." : "Set it from your Profile.") + "</span></span></div>";
    if (g) h += '<div class="set-static"><span class="set-ic">' + svg(IC.mail) + '</span><span class="set-txt"><span class="set-sub">Gmail</span><span class="set-title">' + esc(g) + "</span></span></div>";
    h += row("blocked", "Blocked contacts", "People who can't message or call you");
    box.innerHTML = h;
  }
  function ensureExtras() {
    var body = $("settingsBody"); if (!body) return;
    if (!$("setPrivBlocked")) {
      var d = document.createElement("div"); d.id = "setPrivBlocked"; d.setAttribute("data-sgi", "privacy");
      d.innerHTML = row("blocked", "Blocked contacts", "People who can't message or call you");
      body.appendChild(d);
    }
    if (!$("setNotifNote")) {
      var n = document.createElement("div"); n.id = "setNotifNote"; n.setAttribute("data-sgi", "notifications");
      n.innerHTML = '<h2 style="margin-top:20px;">Message tones</h2><p class="settings-note">While Jilan Chat is open, new messages play a short tone and vibrate. When the app is closed, your phone\'s own notification settings decide the sound. Silent and vibrate modes are respected for calls.</p>';
      body.appendChild(n);
    }
    var help = $("setHelp");
    if (help && !help.firstChild) {
      help.innerHTML = '<button type="button" class="set-row" id="setSupport"><span class="set-ic">' + svg(IC.support) + '</span><span class="set-txt"><span class="set-title">Contact support</span><span class="set-sub">WhatsApp 0300-7379385</span></span></button>';
    }
  }

  // Tag every existing settings element with its sub-page.
  var OWN = { setMain: 1, setAccount: 1, setHelp: 1, setPrivBlocked: 1, setNotifNote: 1 };
  var CONTAINERS = { appearanceBox: 1, settingsExtras: 1, settingsExtras2: 1, settingsExtras3: 1 };
  JC.tagSettings = function () {
    var body = $("settingsBody"); if (!body) return 0;
    var cur = "chats", curH = "", n = 0;
    function tag(el) {
      if (el.nodeType !== 1) return;
      if (el.tagName === "H2") { curH = String(el.textContent || "").trim().toLowerCase(); cur = JC.settingsGroupForHeading(curH); }
      var g = cur;
      if (el.id === "setAboutRow" || (el.querySelector && el.querySelector("#btnSettingsAbout"))) g = "help";
      if (el.getAttribute("data-sgi") !== g) el.setAttribute("data-sgi", g);
      el.setAttribute("data-sh", curH);
      n++;
    }
    Array.prototype.forEach.call(body.children, function (el) {
      if (OWN[el.id]) return;
      if (CONTAINERS[el.id]) { el.removeAttribute("data-sgi"); Array.prototype.forEach.call(el.children, tag); }
      else tag(el);
    });
    return n;
  };
  var mode = "main";
  JC.settingsMode = function () { return mode; };
  function applyMode() {
    var scr = $("screen-settings"), body = $("settingsBody"); if (!scr || !body) return;
    scr.setAttribute("data-sg", mode);
    var t = $("settingsTitle"); if (t) t.textContent = TITLES[mode] || "Settings";
    Array.prototype.forEach.call(body.querySelectorAll("[data-sgi]"), function (el) {
      var on = el.getAttribute("data-sgi") === mode;
      if (on) el.removeAttribute("data-sgoff"); else el.setAttribute("data-sgoff", "");
    });
    // Account and Help pages reuse the Blocked/About rows; nothing else to do.
    try { body.scrollTop = 0; } catch (e) {}
  }
  JC.v417 = {
    refresh: function () { renderMain(); renderAccount(); ensureExtras(); JC.tagSettings(); applyMode(); },
    setMode: function (m) { mode = TITLES[m] ? m : "main"; JC.v417.refresh(); },
    openGroup: function (g, noHistory) {
      if (g === "profile") { var b = $("btnProfile"); if (b) b.click(); return; }
      if (g === "invite") { if (JC.shareApp) JC.shareApp(); return; }
      if (!TITLES[g]) return;
      if (!noHistory) { try { window.history.pushState({ screen: "screen-settings", sg: g }, ""); } catch (e) {} }
      JC.v417.setMode(g);
    }
  };

  function wireSettings() {
    var scr = $("screen-settings"); if (!scr || scr.__v417) return;
    scr.__v417 = true;
    scr.addEventListener("click", function (e) {
      var t = e.target;
      while (t && t !== scr && !(t.getAttribute && t.getAttribute("data-sgo"))) t = t.parentNode;
      if (t && t !== scr) { e.preventDefault(); JC.v417.openGroup(t.getAttribute("data-sgo")); return; }
      var s = e.target;
      while (s && s !== scr && s.id !== "setSupport") s = s.parentNode;
      if (s && s.id === "setSupport") { if (JC.openExternal) JC.openExternal(SUPPORT_URL); else window.open(SUPPORT_URL, "_blank"); }
    });
    // Re-tag whenever a module re-renders its block (innerHTML swaps).
    var body = $("settingsBody");
    if (body && window.MutationObserver) {
      var pending = false;
      new MutationObserver(function () {
        if (pending) return; pending = true;
        setTimeout(function () { pending = false; JC.tagSettings(); applyMode(); }, 0);
      }).observe(body, { childList: true, subtree: true });
    }
    // Opening Settings always starts at the main list.
    var orig = JC.openSettings;
    if (orig && !orig.__v417) {
      JC.openSettings = function () { mode = "main"; var r = orig.apply(this, arguments); JC.v417.refresh(); return r; };
      JC.openSettings.__v417 = true;
      var btn = $("btnSettings");
      if (btn) { btn.removeEventListener("click", orig); btn.addEventListener("click", JC.openSettings); }
    }
    window.addEventListener("popstate", function (e) {
      var st = e.state || {};
      if (st.screen === "screen-settings") JC.v417.setMode(st.sg || "main");
    });
  }

  function init() { wireHeader(); wireSettings(); JC.v417.refresh(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(init, 0); });
  else setTimeout(init, 0);
})();
