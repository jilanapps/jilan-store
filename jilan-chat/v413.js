// Jilan Chat v4.13 — UI polish + media reliability layer.
//  - skeleton loaders (chat list, calls, members, channels, chat open, status)
//  - date chips between messages (Today / Yesterday / weekday / full date)
//  - aligned SVG icons in menus and action sheets
//  - optimistic photo bubble + "Not sent - Retry" for failed media sends
//  - chunked VIDEO send (gated by JC.VIDEO_CHUNKS_ENABLED; needs v4.13 rules)
//  - in-app video player controls (play/pause, seek, mute, fullscreen)
//  - status viewer: full-screen colour for text status, no jump on keyboard
//  - network-first service worker (sw.js) for offline cold start
// Loaded LAST (after status2.js). Never touches calls signalling, fcm.js
// or the login/device-marker logic.
(function () {
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  JC.V413 = true;
  // ---- video flags + limits (rules v4.13 enforce the same numbers) ----
  JC.VIDEO_CHUNKS_ENABLED = true;       // rules v4.13 published 2026-11-23 11:53 PKT
  JC.VIDEO_CHUNK_CHARS = 700000;        // base64 chars per chunk doc (rules: <= 720000)
  JC.VIDEO_MAX_CHUNKS = 6;              // rules: chunks 1..6, ids "0".."5"
  JC.VIDEO_MAX_BYTES = 3145728;         // 3 MB after compression (rules: size <= 3145728)
  JC.VIDEO_MAX_SEC = 60;                // longer clips: first 60 s only
  JC.VIDEO_THUMB_MAX = 60000;           // poster JPEG data URL (rules: <= 60000)
  JC.VIDEO_SMALL_BYTES = 1200000;       // already this small: send as-is (no re-encode)
  JC.SW_ENABLED = true;                 // network-first app-shell service worker

  // =====================================================================
  // 1. Skeleton loaders
  // =====================================================================
  JC.skeletonRows = function (n, kind) {
    n = Math.max(1, Math.min(12, n || 4));
    var h = "";
    for (var i = 0; i < n; i++) {
      var w1 = 38 + ((i * 17) % 30), w2 = 52 + ((i * 23) % 36);
      h += '<div class="skel-row" aria-hidden="true"><span class="skel skel-av"></span><span class="skel-lines">' +
        '<span class="skel skel-line" style="width:' + w1 + '%"></span>' +
        '<span class="skel skel-line sm" style="width:' + w2 + '%"></span></span>' +
        (kind === "call" ? '<span class="skel skel-ic"></span>' : '<span class="skel skel-time"></span>') + "</div>";
    }
    return '<div class="skel-wrap" role="status" aria-label="Loading">' + h + "</div>";
  };
  JC.skeletonBubbles = function () {
    var rows = [["in", 62], ["out", 48], ["in", 74], ["out", 40], ["in", 55], ["out", 66]];
    return '<div class="skel-msgs" role="status" aria-label="Loading">' + rows.map(function (r) {
      return '<div class="skel-bub ' + r[0] + '"><span class="skel" style="width:' + r[1] + '%"></span></div>';
    }).join("") + "</div>";
  };
  // Put a skeleton into an empty container; it removes itself as soon as
  // real content arrives (or after `ms`, e.g. a list that stays empty).
  function skeletonUntilContent(box, html, ms) {
    if (!box || box.querySelector(".skel-wrap,.skel-msgs")) return;
    if (box.children && box.children.length) return;
    box.insertAdjacentHTML("afterbegin", html);
    var sk = box.firstElementChild;
    var done = false;
    function clear() {
      if (done) return; done = true;
      try { obs.disconnect(); } catch (e) {}
      if (sk && sk.parentNode) sk.parentNode.removeChild(sk);
    }
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        for (var j = 0; j < muts[i].addedNodes.length; j++) {
          var n = muts[i].addedNodes[j];
          if (n !== sk && n.nodeType === 1 && !(n.classList && n.classList.contains("date-chip"))) { clear(); return; }
        }
        if (muts[i].removedNodes.length && sk && !sk.parentNode) { clear(); return; }
      }
    });
    obs.observe(box, { childList: true });
    setTimeout(clear, ms || 2500);
  }
  JC.skeletonUntilContent = skeletonUntilContent;

  // =====================================================================
  // 2. Date chips between messages
  // =====================================================================
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function tsMs(t) {
    if (!t) return Date.now(); // pending serverTimestamp = now
    if (typeof t.toMillis === "function") return t.toMillis();
    if (typeof t.seconds === "number") return t.seconds * 1000;
    var d = new Date(t); return isNaN(d.getTime()) ? Date.now() : d.getTime();
  }
  function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  JC.dateChipLabel = function (ms, now) {
    now = now || Date.now();
    var d = new Date(ms), t = new Date(now);
    var start = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    var dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    var diff = Math.round((start - dayStart) / 86400000);
    if (diff <= 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return DAYS[d.getDay()];
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  };
  var chipTimer = null;
  function rebuildDateChips() {
    chipTimer = null;
    var box = $("messages"); if (!box || !JC.getMsgData) return;
    var olds = box.querySelectorAll(".date-chip");
    for (var i = 0; i < olds.length; i++) olds[i].parentNode.removeChild(olds[i]);
    var msgs = box.querySelectorAll(".msg[data-msg-id]");
    var last = null;
    for (var j = 0; j < msgs.length; j++) {
      var el = msgs[j];
      if (el.style && el.style.display === "none") continue;
      var d = JC.getMsgData(el.getAttribute("data-msg-id"));
      if (!d || !d.m) continue;
      var ms = tsMs(d.m.createdAt), k = dayKey(ms);
      if (k !== last) {
        var chip = document.createElement("div");
        chip.className = "date-chip";
        chip.innerHTML = "<span>" + esc(JC.dateChipLabel(ms)) + "</span>";
        el.parentNode.insertBefore(chip, el);
        last = k;
      }
    }
  }
  JC.rebuildDateChips = rebuildDateChips;
  function scheduleChips() { if (!chipTimer) chipTimer = setTimeout(rebuildDateChips, 30); }

  // =====================================================================
  // 3. Icons for menus and action sheets (aligned, inline SVG)
  // =====================================================================
  function ic(d, fill) {
    return '<svg width="20" height="20" viewBox="0 0 24 24" ' + (fill === false ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' : 'fill="currentColor"') + ' aria-hidden="true">' + d + "</svg>";
  }
  var P = {
    group: '<path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>',
    person: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
    status: '<circle cx="12" cy="12" r="9" stroke-dasharray="3.2 2.4"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
    bt: '<path d="M17.71 7.71 12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>',
    star: '<path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>',
    broadcast: '<path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/>',
    channel: '<path d="M4 4h16v12H5.17L4 17.17V4zm0-2c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4zm2 10h8v2H6v-2zm0-3h12v2H6V9zm0-3h12v2H6V6z"/>',
    link: '<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4a5 5 0 0 0 0-10z"/>',
    gear: '<path d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.3 7.3 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.47.47 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/>',
    share: '<path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-5.91.7L8.04 9.81A2.99 2.99 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.16c-.05.21-.08.43-.08.65A2.92 2.92 0 1 0 18 16.08z"/>',
    info: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
    search: '<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
    timer: '<path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0 0 12 4a9 9 0 1 0 9 9c0-2.12-.74-4.07-1.97-5.61zM12 20a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"/>',
    mute: '<path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>',
    block: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM4 12a8 8 0 0 1 12.9-6.32L5.68 16.9A7.96 7.96 0 0 1 4 12zm8 8a7.96 7.96 0 0 1-4.9-1.68L18.32 7.1A8 8 0 0 1 12 20z"/>',
    leave: '<path d="M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>',
    add: '<path d="M15 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
    reply: '<path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>',
    copy: '<path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>',
    forward: '<path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/>',
    pin: '<path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>',
    trash: '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
    photo: '<path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>',
    video: '<path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>',
    pinmap: '<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>',
    live: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A8.99 8.99 0 0 0 13 3.06V1h-2v2.06A8.99 8.99 0 0 0 3.06 11H1v2h2.06A8.99 8.99 0 0 0 11 20.94V23h2v-2.06A8.99 8.99 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>',
    contact: '<path d="M20 0H4v2h16V0zM4 24h16v-2H4v2zM20 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2zm-8 2.75a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5zM17 17H7v-1.5c0-1.67 3.33-2.5 5-2.5s5 .83 5 2.5V17z"/>',
    poll: '<path d="M19 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>',
    sticker: '<path d="M18 2H6a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h9l7-7V6a4 4 0 0 0-4-4zm-4 18v-3a3 3 0 0 1 3-3h3l-6 6zM8.5 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>',
    once: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2V9h-1.5V7.5H13V17z"/>',
    archive: '<path d="M20.54 5.23 19.15 3.55A1.45 1.45 0 0 0 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23A1.98 1.98 0 0 0 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5 6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>',
    lock: '<path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z"/>',
    save: '<path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>',
    react: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM15.5 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm3.5 9.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>',
    export: '<path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67 2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>',
    wall: '<path d="M4 4h7V2H4c-1.1 0-2 .9-2 2v7h2V4zm6 9-4 5h12l-3-4-2.03 2.71L10 13zm7-4.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0zM20 2h-7v2h7v7h2V4c0-1.1-.9-2-2-2zm0 18h-7v2h7c1.1 0 2-.9 2-2v-7h-2v7zM4 13H2v7c0 1.1.9 2 2 2h7v-2H4v-7z"/>',
    camera: '<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9z"/>',
    edit: '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
    close: '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
    call: '<path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1A17 17 0 0 1 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>',
    clear: '<path d="M15 16h4v2h-4v-2zm0-8h7v2h-7V8zm0 4h6v2h-6v-2zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12V5z"/>',
    qr: '<path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm-2 16h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zm0 10h2v2h-2v-2zm-6-6h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0-4h2v2h-2v-2zm2 2h2v2h-2v-2z"/>'
  };
  var ICON_FOR = {
    // main menu (data-action)
    newgroup: "group", profile: "person", status: "status", nearby: "bt", starred: "star", broadcast: "broadcast",
    channels: "channel", join: "link", settings: "gear", shareapp: "share", about: "info",
    // chat menu (data-cm)
    groupinfo: "info", addmember: "add", invite: "link", contact: "person", search: "search", disappear: "timer",
    mute: "mute", block: "block", leave: "leave", wallpaper: "wall", export: "export", lockchat: "lock", clear: "clear",
    // action sheets (data-act)
    reply: "reply", copy: "copy", forward: "forward", pin: "pin", star: "star", forme: "trash", forall: "trash",
    delchat: "trash", react: "react", reactmore: "react", unreact: "react", photo: "photo", video: "video", location: "pinmap",
    live: "live", document: "doc", poll: "poll", sticker: "sticker", vo: "once", archive: "archive", save: "save",
    share: "share", edit: "edit", qr: "qr", call: "call", info: "info", camera: "camera", text: "edit"
  };
  JC.menuIconFor = function (key) { var k = ICON_FOR[key]; return k && P[k] ? ic(P[k], k === "status" ? false : true) : ""; };
  function decorateItems(root) {
    if (!root || !root.querySelectorAll) return;
    var items = root.querySelectorAll("button[data-action],button[data-cm],.sheet-item[data-act],#callsMenu button");
    for (var i = 0; i < items.length; i++) {
      var b = items[i];
      if (b.querySelector(".ix-ic") || b.hasAttribute("data-val") || b.querySelector(".avatar,img")) continue;
      var key = b.getAttribute("data-action") || b.getAttribute("data-cm") || b.getAttribute("data-act") || (b.id === "btnClearCallLog" ? "clear" : "");
      if (key === "cancel" || key === "yes" || key === "no") continue;
      if (/^(lv|r|e|dis|reset|send|join)\d*$/.test(key) && !ICON_FOR[key]) continue;
      var svg = JC.menuIconFor(key);
      b.insertAdjacentHTML("afterbegin", '<span class="ix-ic">' + svg + "</span>");
      b.classList.add("has-ix");
    }
  }
  JC.decorateMenuItems = decorateItems;

  // =====================================================================
  // 4. Optimistic photo + failed-send bubbles
  // =====================================================================
  function nowLabel() { return JC.fmtTime12 ? JC.fmtTime12(new Date()) : ""; }
  var CLOCK = '<svg class="tick-clock" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var ALERT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
  function appendGhost(el) {
    var box = $("messages"); if (!box) return;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }
  JC.optimisticPhoto = function (file) {
    var box = $("messages"); if (!box || !file || typeof URL === "undefined" || !URL.createObjectURL) return null;
    var url = URL.createObjectURL(file);
    var el = document.createElement("div");
    el.className = "msg out photo-msg ghost";
    el.innerHTML = '<img class="bubble-img" src="' + url + '" alt="Photo"><div class="ghost-prog"><i></i></div>' +
      '<div class="meta">' + esc(nowLabel()) + '<span class="ticks pending">' + CLOCK + "</span></div>";
    appendGhost(el);
    function drop() { if (el.parentNode) el.parentNode.removeChild(el); try { URL.revokeObjectURL(url); } catch (e) {} }
    return {
      el: el,
      settle: function (promise, dataUrl) {
        // The real (pending) bubble arrives through the snapshot right
        // after sendCurrentMessage; keep the preview until then.
        if (!dataUrl) { drop(); return; }
        setTimeout(drop, 350);
        if (promise && promise.then) promise.then(function () {}, function () {});
      }
    };
  };
  // A media send that the server refused: show it with Retry.
  JC.showFailedBubble = function (data) {
    var box = $("messages"); if (!box || !data) return null;
    var el = document.createElement("div");
    el.className = "msg out failed";
    var label = data.type === "image" ? "Photo" : data.type === "voice" ? "Voice message" : data.type === "video" ? "Video" : "Message";
    var thumb = data.type === "image" && data.mediaData ? '<img class="failed-thumb" src="' + esc(data.mediaData) + '" alt="">' :
      (data.type === "video" && data.video && data.video.thumb ? '<img class="failed-thumb" src="' + esc(data.video.thumb) + '" alt="">' : "");
    el.innerHTML = '<div class="failed-row">' + thumb + '<span class="failed-text"><span class="failed-ic">' + ALERT + "</span>" + esc(label) + ' not sent</span>' +
      '<button type="button" class="failed-retry">Retry</button><button type="button" class="failed-x" aria-label="Dismiss">' + ic(P.close) + "</button></div>";
    el.querySelector(".failed-retry").addEventListener("click", function (e) {
      e.stopPropagation();
      if (el.parentNode) el.parentNode.removeChild(el);
      var retry = data._retry || function () { return JC.sendCurrentMessage(data); };
      Promise.resolve().then(retry).catch(function () {});
    });
    el.querySelector(".failed-x").addEventListener("click", function (e) { e.stopPropagation(); if (el.parentNode) el.parentNode.removeChild(el); });
    appendGhost(el);
    return el;
  };
  function wrapSendForRetry() {
    if (!JC.sendCurrentMessage || JC.sendCurrentMessage._v413) return;
    var orig = JC.sendCurrentMessage;
    JC.sendCurrentMessage = function (data) {
      var p = orig.apply(this, arguments);
      // (video has its own ghost bubble with Retry — see sendVideoFile)
      if (data && (data.type === "image" || data.type === "voice") && p && p.then) {
        var chatAtSend = JC.currentChatId;
        p.then(null, function () { if (JC.currentChatId === chatAtSend) JC.showFailedBubble(data); });
      }
      return p;
    };
    JC.sendCurrentMessage._v413 = true;
  }

  // =====================================================================
  // 5. VIDEO — compress, chunk, upload, play
  // =====================================================================
  function fmtSize(b) { b = b || 0; if (b < 1024) return b + " B"; if (b < 1048576) return Math.round(b / 1024) + " KB"; return (b / 1048576).toFixed(1) + " MB"; }
  JC.fmtSize = fmtSize;
  function fmtDur(s) { return JC.fmtDur ? JC.fmtDur(s) : String(Math.round(s || 0)); }
  JC.videoChunkCount = function (b64len) { return Math.max(1, Math.ceil((b64len || 0) / JC.VIDEO_CHUNK_CHARS)); };
  JC.splitVideoChunks = function (b64) {
    var out = [];
    for (var i = 0; i < b64.length; i += JC.VIDEO_CHUNK_CHARS) out.push(b64.slice(i, i + JC.VIDEO_CHUNK_CHARS));
    if (!out.length) out.push("");
    return out;
  };
  JC.videoMetaOk = function (v) {
    return !!(v && typeof v.thumb === "string" && v.thumb.indexOf("data:image/jpeg;base64,") === 0 && v.thumb.length <= JC.VIDEO_THUMB_MAX &&
      v.chunks >= 1 && v.chunks <= JC.VIDEO_MAX_CHUNKS && (v.chunks | 0) === v.chunks &&
      v.size > 0 && v.size <= JC.VIDEO_MAX_BYTES && /^video\/(mp4|webm)$/.test(v.mime || ""));
  };
  JC.pickVideoMime = function () {
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
    var list = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"];
    for (var i = 0; i < list.length; i++) { try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) {} }
    return "";
  };
  // Target bitrate so `sec` seconds land under ~2.8 MB (audio 48 kbps).
  JC.videoBitrateFor = function (sec) {
    sec = Math.max(1, Math.min(JC.VIDEO_MAX_SEC, sec || 1));
    var total = (JC.VIDEO_MAX_BYTES * 0.88 * 8) / sec;
    return Math.max(220000, Math.min(1200000, Math.round(total - 48000)));
  };
  // Fit inside 854x480 (landscape) / 480x854 (portrait), even numbers.
  JC.videoScaleFor = function (w, h) {
    if (!w || !h) return { w: 640, h: 360 };
    var long = Math.max(w, h), short = Math.min(w, h);
    var s = Math.min(1, 480 / short, 854 / long);
    return { w: Math.max(2, Math.round(w * s / 2) * 2), h: Math.max(2, Math.round(h * s / 2) * 2) };
  };
  function loadVideoEl(url) {
    return new Promise(function (res, rej) {
      var v = document.createElement("video");
      v.preload = "auto"; v.playsInline = true; v.muted = true; v.setAttribute("playsinline", "");
      var t = setTimeout(function () { rej(new Error("video-load-timeout")); }, 20000);
      v.onloadedmetadata = function () { clearTimeout(t); res(v); };
      v.onerror = function () { clearTimeout(t); rej(new Error("video-unreadable")); };
      v.src = url;
    });
  }
  function seek(v, t) {
    return new Promise(function (res) {
      var done = false; function ok() { if (!done) { done = true; res(); } }
      v.onseeked = ok; setTimeout(ok, 2500);
      try { v.currentTime = t; } catch (e) { ok(); }
    });
  }
  function makeThumb(v) {
    var w = v.videoWidth || 320, h = v.videoHeight || 180;
    var steps = [[320, 0.6], [256, 0.5], [200, 0.45], [160, 0.4]];
    for (var i = 0; i < steps.length; i++) {
      var s = Math.min(1, steps[i][0] / Math.max(w, h));
      var c = document.createElement("canvas"); c.width = Math.max(2, Math.round(w * s)); c.height = Math.max(2, Math.round(h * s));
      try { c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); } catch (e) { return ""; }
      var u = ""; try { u = c.toDataURL("image/jpeg", steps[i][1]); } catch (e) { u = ""; }
      if (u.indexOf("data:image/jpeg;base64,") === 0 && u.length <= JC.VIDEO_THUMB_MAX) return u;
    }
    return "";
  }
  // Real-time re-encode through canvas + MediaRecorder. onProg(0..1).
  JC.compressVideo = function (v, limitSec, onProg) {
    return new Promise(function (resolve, reject) {
      var mime = JC.pickVideoMime();
      var canvas = document.createElement("canvas");
      if (!mime || !canvas.captureStream) { reject(new Error("no-encoder")); return; }
      var sz = JC.videoScaleFor(v.videoWidth, v.videoHeight);
      canvas.width = sz.w; canvas.height = sz.h;
      var ctx = canvas.getContext("2d");
      var stream = canvas.captureStream(24);
      var ac = null, silent = false;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        ac = new AC();
        var src = ac.createMediaElementSource(v);
        var dest = ac.createMediaStreamDestination();
        src.connect(dest); // NOT connected to speakers: silent while compressing
        dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
        if (ac.resume) ac.resume();
      } catch (e) { silent = true; }
      var rec;
      try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: JC.videoBitrateFor(limitSec), audioBitsPerSecond: 48000 }); }
      catch (e) { try { rec = new MediaRecorder(stream); } catch (e2) { reject(new Error("no-encoder")); return; } }
      var parts = [], stopped = false, timer = null;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = function () {
        if (timer) clearInterval(timer);
        try { v.pause(); } catch (e) {}
        try { if (ac && ac.close) ac.close(); } catch (e) {}
        stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
        var type = (rec.mimeType || mime).split(";")[0];
        resolve({ blob: new Blob(parts, { type: type }), mime: type, w: sz.w, h: sz.h, silent: silent });
      };
      function stop() { if (stopped) return; stopped = true; try { rec.stop(); } catch (e) {} }
      function draw() { try { ctx.drawImage(v, 0, 0, sz.w, sz.h); } catch (e) {} }
      v.onended = stop;
      v.currentTime = 0;
      v.muted = !!silent;
      var pp = v.play();
      function begin() {
        rec.start(1000);
        timer = setInterval(function () {
          draw();
          if (onProg) onProg(Math.min(1, v.currentTime / limitSec));
          if (v.currentTime >= limitSec - 0.05) stop();
        }, 1000 / 24);
      }
      if (pp && pp.then) pp.then(begin, function () {
        // Autoplay with sound refused: retry muted (video only).
        v.muted = true; silent = true;
        v.play().then(begin, function () { reject(new Error("cannot-play")); });
      });
      else begin();
    });
  };
  function readBase64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result || ""); var i = s.indexOf(","); res(i >= 0 ? s.slice(i + 1) : ""); };
      r.onerror = function () { rej(new Error("read-failed")); };
      r.readAsDataURL(blob);
    });
  }
  function msgCol(chatId, isGroup) {
    return JC.db.collection(isGroup ? "groups" : "chats").doc(chatId).collection("messages");
  }
  JC.videoChunkRef = function (chatId, isGroup, msgId, n) { return msgCol(chatId, isGroup).doc(msgId).collection("chunks").doc(String(n)); };

  // Ghost bubble shown while a video is prepared / uploaded.
  JC.createVideoGhost = function (opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "msg out video-msg ghost";
    el.innerHTML = '<div class="vbub sending"><div class="vb-poster">' + (opts.thumb ? '<img class="vb-thumb" src="' + esc(opts.thumb) + '" alt="">' : "") + "</div>" +
      '<div class="vb-overlay"><div class="vb-ring"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="vr-bg"/><circle cx="20" cy="20" r="17" class="vr-fg" stroke-dasharray="106.8" stroke-dashoffset="106.8"/></svg>' +
      '<button type="button" class="vb-cancel" aria-label="Cancel">' + ic(P.close) + "</button></div></div>" +
      '<div class="vb-info"><span class="vb-stage">Preparing…</span><span class="vb-size">' + esc(opts.sizeLabel || "") + "</span></div>" +
      '<div class="vb-bar"><i></i></div></div><div class="meta">' + esc(nowLabel()) + '<span class="ticks pending">' + CLOCK + "</span></div>";
    var api = {
      el: el, cancelled: false,
      setThumb: function (t) { var p = el.querySelector(".vb-poster"); if (p && t) p.innerHTML = '<img class="vb-thumb" src="' + esc(t) + '" alt="">'; },
      setSize: function (s) { el.querySelector(".vb-size").textContent = s; },
      progress: function (stage, frac) {
        frac = Math.max(0, Math.min(1, frac || 0));
        el.querySelector(".vb-stage").textContent = stage;
        el.querySelector(".vb-bar i").style.width = Math.round(frac * 100) + "%";
        el.querySelector(".vr-fg").setAttribute("stroke-dashoffset", String((106.8 * (1 - frac)).toFixed(1)));
      },
      fail: function (text, retry) {
        var vb = el.querySelector(".vbub"); vb.classList.remove("sending"); vb.classList.add("failed");
        el.querySelector(".vb-stage").textContent = text || "Not sent";
        var ov = el.querySelector(".vb-overlay");
        ov.innerHTML = retry ? '<button type="button" class="vb-retry">' + ic('<path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>') + "<span>Retry</span></button>" : "";
        var m = el.querySelector(".meta .ticks"); if (m) m.innerHTML = ALERT;
        if (retry) ov.querySelector(".vb-retry").addEventListener("click", function (e) { e.stopPropagation(); retry(); });
      },
      remove: function () { if (el.parentNode) el.parentNode.removeChild(el); }
    };
    el.querySelector(".vb-cancel").addEventListener("click", function (e) { e.stopPropagation(); api.cancelled = true; api.remove(); JC.toast("Video cancelled"); });
    return api;
  };

  JC.sendVideoFile = function (file) {
    if (!file || !JC.currentChatId || !JC.db || !JC.currentUser) return Promise.resolve(false);
    if (!JC.VIDEO_CHUNKS_ENABLED) { JC.toast(JC.NO_BIG_FILES_MSG); return Promise.resolve(false); }
    var chatId = JC.currentChatId, isGroup = !!JC.currentChatIsGroup;
    var ghost = JC.createVideoGhost({ sizeLabel: fmtSize(file.size) });
    appendGhost(ghost.el);
    var url = URL.createObjectURL(file);
    var meta = { thumb: "", dur: 0, w: 0, h: 0 };
    function bail(msg) { try { URL.revokeObjectURL(url); } catch (e) {} ghost.remove(); JC.toast(msg); return false; }
    return loadVideoEl(url).then(function (v) {
      meta.dur = isFinite(v.duration) ? v.duration : 0; meta.w = v.videoWidth; meta.h = v.videoHeight;
      return seek(v, Math.min(0.6, (meta.dur || 1) / 3)).then(function () {
        meta.thumb = makeThumb(v); ghost.setThumb(meta.thumb);
        if (!meta.thumb) throw new Error("no-thumb");
        var limit = Math.min(JC.VIDEO_MAX_SEC, meta.dur || JC.VIDEO_MAX_SEC);
        var smallEnough = file.size <= JC.VIDEO_SMALL_BYTES && meta.dur <= JC.VIDEO_MAX_SEC && /^video\/(mp4|webm)$/.test(file.type);
        if (smallEnough) return { blob: file, mime: file.type, w: meta.w, h: meta.h, silent: false };
        if (meta.dur > JC.VIDEO_MAX_SEC) JC.toast("Only the first minute will be sent.");
        return JC.compressVideo(v, limit, function (f) { if (!ghost.cancelled) ghost.progress("Compressing " + Math.round(f * 100) + "%", f * 0.5); })
          .catch(function (err) {
            // No encoder on this phone: original only if already small enough.
            if (file.size <= JC.VIDEO_MAX_BYTES && meta.dur <= JC.VIDEO_MAX_SEC && /^video\/(mp4|webm)$/.test(file.type)) return { blob: file, mime: file.type, w: meta.w, h: meta.h, silent: false };
            throw err;
          });
      });
    }).then(function (out) {
      if (ghost.cancelled) return bail("Video cancelled");
      try { URL.revokeObjectURL(url); } catch (e) {}
      if (!out.blob || !out.blob.size) throw new Error("empty");
      if (out.blob.size > JC.VIDEO_MAX_BYTES) { ghost.remove(); JC.toast("Video is too large even after compression. Try a shorter clip."); return false; }
      ghost.setSize(fmtSize(out.blob.size));
      if (out.silent) JC.toast("This phone could not keep the sound. Sending video without sound.");
      return readBase64(out.blob).then(function (b64) {
        var parts = JC.splitVideoChunks(b64);
        if (parts.length > JC.VIDEO_MAX_CHUNKS) { ghost.remove(); JC.toast("Video is too large even after compression. Try a shorter clip."); return false; }
        var video = { thumb: meta.thumb, chunks: parts.length, size: out.blob.size, mime: out.mime, w: out.w | 0, h: out.h | 0 };
        var dur = Math.max(1, Math.min(JC.VIDEO_MAX_SEC, Math.round(meta.dur || 1)));
        function upload() {
          var id = msgCol(chatId, isGroup).doc().id;
          var i = 0;
          ghost.progress("Sending 0 of " + parts.length, 0.5);
          function next() {
            if (ghost.cancelled) return Promise.reject(new Error("cancelled"));
            if (i >= parts.length) return Promise.resolve();
            var n = i;
            return JC.videoChunkRef(chatId, isGroup, id, n).set({ d: parts[n], i: n, by: JC.currentUser.uid }).then(function () {
              i++; ghost.progress("Sending " + i + " of " + parts.length, 0.5 + 0.5 * (i / parts.length));
              return next();
            });
          }
          return next().then(function () {
            if (JC.currentChatId !== chatId) throw new Error("chat-changed");
            JC.cacheVideoBlob(id, out.blob);
            ghost.remove();
            return JC.sendCurrentMessage({ type: "video", _docId: id, durationSec: dur, video: video }).then(function () { return true; });
          }).catch(function (e) {
            // best effort: remove my partial chunks, then offer Retry
            for (var k = 0; k < i; k++) JC.videoChunkRef(chatId, isGroup, id, k).delete().catch(function () {});
            if (ghost.cancelled) return false;
            if (!ghost.el.parentNode) appendGhost(ghost.el);
            ghost.fail("Not sent", function () { ghost.el.querySelector(".vbub").classList.remove("failed"); ghost.el.querySelector(".vbub").classList.add("sending"); upload(); });
            return false;
          });
        }
        return upload();
      });
    }).catch(function (e) {
      if (e && e.message === "cancelled") return false;
      return bail("Couldn't prepare this video. Try a shorter clip.");
    });
  };

  // ---- received / sent video bubble ----
  JC.videoBubbleHtml = function (m) {
    var v = m.video || {};
    var thumb = (typeof v.thumb === "string" && v.thumb.indexOf("data:image/jpeg;base64,") === 0) ? v.thumb : "";
    var ratio = v.w > 0 && v.h > 0 ? Math.max(0.56, Math.min(1.5, v.h / v.w)) : 0.5625;
    return '<div class="vbub" style="--vb-ratio:' + (ratio * 100).toFixed(2) + '%"><div class="vb-poster">' + (thumb ? '<img class="vb-thumb" src="' + thumb + '" alt="Video">' : "") + "</div>" +
      '<div class="vb-overlay"><button type="button" class="vb-play" aria-label="Play video">' + ic('<path d="M8 5v14l11-7z"/>') + "</button></div>" +
      '<div class="vb-info"><span class="vb-dur">' + ic(P.video) + esc(fmtDur(m.durationSec || 0)) + '</span><span class="vb-size">' + esc(fmtSize(v.size || 0)) + "</span></div>" +
      '<div class="vb-bar hidden"><i></i></div></div>';
  };
  var memVideo = {}; // msgId -> blob URL (this session)
  var CACHE = "jc-video-v1";
  function cacheKey(id) { return "/__jc_video__/" + encodeURIComponent(id); }
  JC.cacheVideoBlob = function (id, blob) {
    try { memVideo[id] = URL.createObjectURL(blob); } catch (e) {}
    if (!window.caches) return;
    caches.open(CACHE).then(function (c) {
      return c.put(cacheKey(id), new Response(blob, { headers: { "Content-Type": blob.type || "video/mp4" } })).then(function () {
        return c.keys().then(function (keys) { // keep the newest 24 videos
          if (keys.length > 24) for (var i = 0; i < keys.length - 24; i++) c.delete(keys[i]);
        });
      });
    }).catch(function () {});
  };
  function cachedVideo(id) {
    if (memVideo[id]) return Promise.resolve(memVideo[id]);
    if (!window.caches) return Promise.resolve(null);
    return caches.open(CACHE).then(function (c) { return c.match(cacheKey(id)); }).then(function (r) {
      if (!r) return null;
      return r.blob().then(function (b) { memVideo[id] = URL.createObjectURL(b); return memVideo[id]; });
    }).catch(function () { return null; });
  }
  function b64ToBytes(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  JC.loadVideoBlobUrl = function (chatId, isGroup, msgId, m, onProg) {
    return cachedVideo(msgId).then(function (hit) {
      if (hit) return hit;
      var v = m.video || {}, n = v.chunks || 0, got = 0;
      if (!n || n > JC.VIDEO_MAX_CHUNKS) return Promise.reject(new Error("bad-video"));
      var jobs = [];
      for (var i = 0; i < n; i++) (function (k) {
        jobs.push(JC.videoChunkRef(chatId, isGroup, msgId, k).get().then(function (s) {
          var d = s.exists ? s.data() : null;
          if (!d || typeof d.d !== "string" || d.i !== k) throw new Error("chunk-missing");
          got++; if (onProg) onProg(got / n);
          return d.d;
        }));
      })(i);
      return Promise.all(jobs).then(function (parts) {
        var blob = new Blob([b64ToBytes(parts.join(""))], { type: v.mime || "video/mp4" });
        JC.cacheVideoBlob(msgId, blob);
        return memVideo[msgId] || URL.createObjectURL(blob);
      });
    });
  };
  JC.wireVideoBubble = function (vb, m, msgId, isGroup) {
    if (!vb || !msgId) return;
    if (vb.parentNode && vb.parentNode.classList) vb.parentNode.classList.add("video-msg");
    var chatId = JC.currentChatId;
    var busy = false;
    vb.addEventListener("click", function (e) {
      if (e) e.stopPropagation();
      if (busy) return;
      busy = true;
      var bar = vb.querySelector(".vb-bar"), fill = bar && bar.querySelector("i");
      vb.classList.add("loading");
      if (bar) bar.classList.remove("hidden");
      JC.loadVideoBlobUrl(chatId, !!isGroup, msgId, m, function (f) { if (fill) fill.style.width = Math.round(f * 100) + "%"; })
        .then(function (url) { JC.openViewer("video", url); })
        .catch(function () { JC.toast("Video not available."); })
        .then(function () { busy = false; vb.classList.remove("loading"); if (bar) bar.classList.add("hidden"); });
    });
  };
  // Delete for everyone also removes my own chunks.
  function wrapDeleteForAll() {
    if (!JC.deleteForAll || JC.deleteForAll._v413) return;
    var orig = JC.deleteForAll;
    JC.deleteForAll = function (msgId) {
      var d = JC.getMsgData ? JC.getMsgData(msgId) : null;
      var chatId = JC.currentChatId;
      var r = orig.apply(this, arguments);
      if (d && d.m && d.m.video && d.m.video.chunks && chatId) {
        Promise.resolve(r).then(function () {
          for (var k = 0; k < Math.min(JC.VIDEO_MAX_CHUNKS, d.m.video.chunks); k++) JC.videoChunkRef(chatId, !!d.isGroup, msgId, k).delete().catch(function () {});
        });
      }
      return r;
    };
    JC.deleteForAll._v413 = true;
  }

  // ---- player controls on the media viewer ----
  var PLAY = '<path d="M8 5v14l11-7z"/>', PAUSE = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  var VOL = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
  var FS = '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';
  function buildPlayer() {
    var viewer = $("viewer"), vid = $("viewerVideo");
    if (!viewer || !vid || $("vpControls")) return;
    var c = document.createElement("div");
    c.id = "vpControls"; c.className = "vp-controls hidden";
    c.innerHTML = '<button type="button" class="vp-btn" id="vpPlay" aria-label="Pause">' + ic(PAUSE) + "</button>" +
      '<span class="vp-time" id="vpCur">0:00</span><input type="range" id="vpSeek" class="vp-seek" min="0" max="1000" value="0" aria-label="Seek">' +
      '<span class="vp-time" id="vpDur">0:00</span>' +
      '<button type="button" class="vp-btn" id="vpMute" aria-label="Mute">' + ic(VOL) + "</button>" +
      '<button type="button" class="vp-btn" id="vpFull" aria-label="Full screen">' + ic(FS) + "</button>";
    viewer.appendChild(c);
    var big = document.createElement("button");
    big.type = "button"; big.id = "vpBig"; big.className = "vp-big hidden"; big.setAttribute("aria-label", "Play");
    big.innerHTML = ic(PLAY);
    viewer.appendChild(big);
    function paint() {
      var playing = !vid.paused && !vid.ended;
      $("vpPlay").innerHTML = ic(playing ? PAUSE : PLAY);
      $("vpPlay").setAttribute("aria-label", playing ? "Pause" : "Play");
      big.classList.toggle("hidden", playing || c.classList.contains("hidden"));
      $("vpMute").innerHTML = ic(vid.muted ? P.mute : VOL);
      $("vpMute").setAttribute("aria-label", vid.muted ? "Unmute" : "Mute");
    }
    function toggle() { if (vid.paused || vid.ended) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } else vid.pause(); }
    $("vpPlay").addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    big.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    vid.addEventListener("click", function (e) { if (!c.classList.contains("hidden")) { e.stopPropagation(); toggle(); } });
    $("vpMute").addEventListener("click", function (e) { e.stopPropagation(); vid.muted = !vid.muted; paint(); });
    $("vpFull").addEventListener("click", function (e) {
      e.stopPropagation();
      var el = viewer;
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (el.requestFullscreen) el.requestFullscreen();
        else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();
      } catch (er) {}
    });
    var seeking = false;
    $("vpSeek").addEventListener("input", function (e) { e.stopPropagation(); seeking = true; if (vid.duration) vid.currentTime = vid.duration * (this.value / 1000); });
    $("vpSeek").addEventListener("change", function () { seeking = false; });
    vid.addEventListener("timeupdate", function () {
      $("vpCur").textContent = fmtDur(vid.currentTime);
      if (!seeking && vid.duration) $("vpSeek").value = Math.round((vid.currentTime / vid.duration) * 1000);
    });
    vid.addEventListener("loadedmetadata", function () { $("vpDur").textContent = isFinite(vid.duration) ? fmtDur(vid.duration) : "0:00"; });
    ["play", "pause", "ended", "volumechange"].forEach(function (ev) { vid.addEventListener(ev, paint); });
    c.addEventListener("click", function (e) { e.stopPropagation(); });
    JC._paintPlayer = paint;
  }
  function wrapViewer() {
    if (!JC.openViewer || JC.openViewer._v413) return;
    var orig = JC.openViewer;
    JC.openViewer = function (kind, url) {
      var r = orig.apply(this, arguments);
      buildPlayer();
      var c = $("vpControls"), vid = $("viewerVideo");
      if (c) c.classList.toggle("hidden", kind !== "video");
      if (kind === "video" && vid) {
        vid.controls = false;
        var p = vid.play(); if (p && p.catch) p.catch(function () { if (JC._paintPlayer) JC._paintPlayer(); });
      } else { var b = $("vpBig"); if (b) b.classList.add("hidden"); }
      if (JC._paintPlayer) JC._paintPlayer();
      return r;
    };
    JC.openViewer._v413 = true;
  }

  // ---- attach sheet: Video item (only when the flag is ON) ----
  function wrapAttachVideo() {
    if (!JC.openAttachSheet || JC.openAttachSheet._v413) return;
    var orig = JC.openAttachSheet;
    JC.openAttachSheet = function () {
      var r = orig.apply(this, arguments);
      if (!JC.VIDEO_CHUNKS_ENABLED) return r;
      var sh = $("actionSheet"); if (!sh) return r;
      var photo = sh.querySelector('[data-act="photo"]');
      if (photo && !sh.querySelector('[data-act="video"]')) {
        var tmp = document.createElement("div");
        tmp.innerHTML = '<button type="button" class="sheet-item" data-act="video">Video (up to 1 min)</button>';
        photo.parentNode.insertBefore(tmp.firstChild, photo.nextSibling);
        decorateItems(sh);
      }
      return r;
    };
    JC.openAttachSheet._v413 = true;
    var sh = $("actionSheet");
    if (sh) sh.addEventListener("click", function (e) {
      var t = e.target; while (t && t !== sh && !(t.getAttribute && t.getAttribute("data-act"))) t = t.parentNode;
      if (!t || t === sh || t.getAttribute("data-act") !== "video") return;
      e.stopPropagation();
      if (JC.closeActionSheet) JC.closeActionSheet();
      var f = $("fileInput"); if (!f) return;
      f.setAttribute("accept", "video/mp4,video/webm,video/*");
      f.click();
      setTimeout(function () { f.setAttribute("accept", "image/*"); }, 1500);
    }, true);
  }

  // =====================================================================
  // 6. Status viewer: full-screen text colour + no jump on keyboard
  // =====================================================================
  function freezeViewerHeight() {
    var sv = $("statusViewer"); if (!sv) return;
    var inp = $("svReplyInput");
    if (inp && document.activeElement === inp) return;
    sv.style.setProperty("--sv-h", window.innerHeight + "px");
  }
  JC.freezeStatusViewerHeight = freezeViewerHeight;
  function wrapStatusShown() {
    var orig = JC.onStatusItemShown;
    JC.onStatusItemShown = function (item, mine) {
      var r = orig ? orig.apply(this, arguments) : undefined;
      var sv = $("statusViewer");
      if (sv) {
        var d = item && item.data || {};
        var text = d.type === "text";
        var bg = text && JC.validStatusBg && JC.validStatusBg(d.bg) ? d.bg : (text ? "#1f7ae0" : "");
        sv.classList.toggle("sv-textmode", text);
        sv.style.background = text ? bg : "";
        freezeViewerHeight();
      }
      return r;
    };
  }

  // =====================================================================
  // 7. theme-color meta (browser status bar matches the header surface)
  // =====================================================================
  function syncThemeColor() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    m.content = document.documentElement.classList.contains("dark") ? "#111b21" : "#ffffff";
  }
  JC.syncThemeColor = syncThemeColor;

  // =====================================================================
  // 8. Service worker (network-first; see sw.js)
  // =====================================================================
  JC.registerShellWorker = function () {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
    if (!/^https:$/.test(location.protocol)) return false;
    if (!JC.SW_ENABLED) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
      return false;
    }
    navigator.serviceWorker.register("sw.js").catch(function () {});
    return true;
  };

  // =====================================================================
  // wiring
  // =====================================================================
  function wireAll() {
    wrapSendForRetry();
    wrapDeleteForAll();
    wrapViewer();
    wrapAttachVideo();
    wrapStatusShown();
    syncThemeColor();
    try { new MutationObserver(syncThemeColor).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); } catch (e) {}
    // menus + sheets get aligned icons whenever they are (re)built
    ["mainMenu", "chatMenu", "actionSheet", "callsMenu"].forEach(function (id) {
      var el = $(id); if (!el) return;
      decorateItems(el);
      try { new MutationObserver(function () { decorateItems(el); }).observe(el, { childList: true, subtree: true }); } catch (e) {}
    });
    // date chips
    var box = $("messages");
    if (box) try {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) for (var j = 0; j < muts[i].addedNodes.length; j++) {
          var n = muts[i].addedNodes[j];
          if (n.nodeType === 1 && n.classList && n.classList.contains("msg")) { scheduleChips(); return; }
        }
      }).observe(box, { childList: true });
    } catch (e) {}
    // skeletons: chat open + chat list + status lists
    ["openChat", "openGroupChat"].forEach(function (fn) {
      var orig = JC[fn]; if (!orig || orig._v413) return;
      JC[fn] = function () {
        var r = orig.apply(this, arguments);
        var b = $("messages");
        if (b && !b.querySelector(".msg")) skeletonUntilContent(b, JC.skeletonBubbles(), 2200);
        return r;
      };
      JC[fn]._v413 = true;
    });
    if (JC.onSignedIn && !JC.onSignedIn._v413) {
      var os = JC.onSignedIn;
      JC.onSignedIn = function () {
        var r = os.apply(this, arguments);
        var l = $("chatList"); if (l && !l.children.length) skeletonUntilContent(l, JC.skeletonRows(6, "row"), 4000);
        return r;
      };
      JC.onSignedIn._v413 = true;
    }
    if (JC.loadStatusLists && !JC.loadStatusLists._v413) {
      var ls = JC.loadStatusLists;
      JC.loadStatusLists = function () {
        var r = ls.apply(this, arguments);
        var rl = $("statusListRecent"); if (rl && !rl.children.length) skeletonUntilContent(rl, JC.skeletonRows(3, "row"), 2500);
        return r;
      };
      JC.loadStatusLists._v413 = true;
    }
    window.addEventListener("resize", freezeViewerHeight);
    JC.registerShellWorker();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireAll);
  else wireAll();
})();
