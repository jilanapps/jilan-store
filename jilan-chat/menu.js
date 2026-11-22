// Jilan Chat v4.4 — menu.js
// WhatsApp-style chat-list header: "Jilan Chat" title + camera icon + ONE
// three-dot menu with LABELLED items (user 2026-11-22: icons without names
// confused him). Each item reuses the existing button/handler, so no
// screen logic is duplicated. Menu closes on outside tap and on Back.
(function () {
  var JC = window.JC = window.JC || {};
  // Play build flag (play/NOTE-FOR-WEB-AGENT.md). Any future update
  // banner / APK link must be gated with !JC.isPlayBuild().
  JC.isPlayBuild = function () {
    try { if (window.Android && typeof window.Android.isPlayBuild === "function" && window.Android.isPlayBuild()) return true; } catch (e) {}
    return window.JILAN_CHAT_PLAY === true || /JilanChatPlay\//.test((window.navigator && window.navigator.userAgent) || "");
  };
  function $(id) { return document.getElementById(id); }
  var open = false, pushed = false;

  function show() {
    var m = $("mainMenu"); if (!m) return;
    m.classList.remove("hidden"); open = true;
    try { history.pushState({ screen: "screen-list", menu: true }, ""); pushed = true; } catch (e) { pushed = false; }
  }
  function hide(fromPop) {
    var m = $("mainMenu"); if (!m || !open) return;
    m.classList.add("hidden"); open = false;
    if (!fromPop && pushed) { pushed = false; try { history.back(); } catch (e) {} }
    else pushed = false;
  }
  JC.mainMenuOpen = function () { return open; };
  JC.closeMainMenu = function () { hide(false); };

  // Item -> existing control. Runs after the menu's own history entry is
  // gone, so the opened screen gets a clean Back.
  var ACTIONS = {
    newgroup: function () { var b = $("btnNewGroup"); if (b) b.click(); },
    profile: function () { var b = $("btnProfile"); if (b) b.click(); },
    status: function () { var b = $("btnStatus"); if (b) b.click(); },
    nearby: function () { var r = $("nearbyRow"); if (r) r.click(); },
    settings: function () { var b = $("btnSettings"); if (b) b.click(); },
    about: function () { if (JC.showScreen) JC.showScreen("screen-about", { push: true }); }
  };
  var pendingAction = null, pendingTimer = null;
  function runPending() {
    var f = pendingAction; pendingAction = null;
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
    if (f) f();
  }
  JC.runMainMenuAction = function (key) {
    var f = ACTIONS[key]; if (!f) return;
    var wasPushed = pushed;
    if (!wasPushed) { hide(false); f(); return; }
    // Wait for the menu's history entry to pop (app.js popstate shows the
    // list first), then open the screen. Fallback if popstate never comes.
    pendingAction = f;
    pendingTimer = setTimeout(runPending, 600);
    hide(false);
  };

  // Camera icon: status photo — opens Status and the photo picker
  // (Android offers Camera or Gallery there).
  function openCameraStatus() {
    var b = $("btnStatus"); if (b) b.click();
    setTimeout(function () { var f = $("statusFileInput"); if (f) f.click(); }, 150);
  }

  window.addEventListener("popstate", function () {
    if (open) hide(true);
    if (pendingAction) setTimeout(runPending, 0);
  });

  document.addEventListener("DOMContentLoaded", function () {
    var btn = $("btnMainMenu"), menu = $("mainMenu");
    if (!btn || !menu) return;
    btn.addEventListener("click", function (e) { e.stopPropagation(); if (open) hide(false); else show(); });
    menu.addEventListener("click", function (e) {
      e.stopPropagation();
      var t = e.target;
      while (t && t !== menu && !(t.getAttribute && t.getAttribute("data-action"))) t = t.parentNode;
      if (t && t !== menu) JC.runMainMenuAction(t.getAttribute("data-action"));
    });
    document.addEventListener("click", function () { if (open) hide(false); });
    var cam = $("btnListCamera");
    if (cam) cam.addEventListener("click", function (e) { e.stopPropagation(); openCameraStatus(); });
  });
})();
