// Jilan Chat v4.9 — profile.js
// WhatsApp-style own profile: tap photo / camera badges -> bottom sheets,
// Name and About edited in small sheets with a character counter.
// Reuses the existing save functions (JC.saveDisplayName, JC.saveAbout,
// JC.saveProfilePhoto, JC.removeProfilePhoto, cover helpers in features5.js)
// through the hidden helper buttons in index.html, so no logic is duplicated.
// Contact info: clean read-only rows; empty rows are hidden.
(function () {
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(t) { if (JC.toast) JC.toast(t); }
  function svg(d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  var IC = {
    gallery: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
    camera: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z",
    trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
    view: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
  };
  JC.NAME_MAX = 60;
  if (!JC.ABOUT_MAX) JC.ABOUT_MAX = 139;

  // Pure helper (tested): which items the photo sheet shows.
  JC.photoSheetItems = function (profile) {
    var items = [{ act: "gallery", label: "Gallery" }, { act: "camera", label: "Camera" }];
    if (profile && profile.photoURL) { items.unshift({ act: "view", label: "View photo" }); items.push({ act: "remove", label: "Remove photo", danger: true }); }
    return items;
  };
  JC.coverSheetItems = function (profile) {
    var items = [{ act: "cover", label: profile && profile.coverURL ? "Change cover" : "Add cover" }];
    if (profile && profile.coverURL) items.push({ act: "removecover", label: "Remove cover", danger: true });
    return items;
  };
  // Pure helper (tested): Gmail row value — hide the internal login address
  // that username accounts use.
  JC.profileGmailValue = function (p, email) {
    var g = (p && p.gmail) || email || "";
    if (!g || /@jilanchat\.local$/i.test(g)) return "";
    return g;
  };
  JC.counterText = function (len, max) { return (max - len) + ""; };

  function sheetHtml(title, items) {
    return '<div class="sheet-title">' + esc(title) + "</div>" + items.map(function (it) {
      return '<button type="button" class="sheet-item pf-sheet-item' + (it.danger ? " danger" : "") + '" data-act="' + it.act + '"><span class="pf-sheet-ic">' + svg(IC[it.act === "removecover" ? "trash" : it.act === "remove" ? "trash" : it.act === "cover" ? "gallery" : it.act]) + "</span>" + esc(it.label) + "</button>";
    }).join("");
  }
  function click(id) { var b = $(id); if (b) b.click(); }

  JC.openPhotoSheet = function () {
    var p = JC.userProfile || {};
    if (!JC.openSheet) { click("btnChangePhoto"); return; }
    JC.openSheet(sheetHtml("Profile photo", JC.photoSheetItems(p)), function (act) {
      if (act === "gallery") click("btnChangePhoto");
      else if (act === "camera") JC.openProfileCamera();
      else if (act === "view") { if (JC.openViewer) JC.openViewer("image", p.photoURL); else viewPhoto(p.photoURL); }
      else if (act === "remove") { if (window.confirm("Remove your profile photo?")) click("btnRemovePhoto"); }
    });
  };
  JC.openCoverSheet = function () {
    var p = JC.userProfile || {};
    if (!JC.openSheet) { click("btnChangeCover"); return; }
    JC.openSheet(sheetHtml("Cover photo", JC.coverSheetItems(p)), function (act) {
      if (act === "cover") click("btnChangeCover");
      else if (act === "removecover") click("btnRemoveCover");
    });
  };
  function viewPhoto(src) {
    if (!src || !JC.modal) return;
    JC.modal('<img src="' + esc(src) + '" alt="" style="width:100%;border-radius:12px;display:block;margin:8px 0;"><div class="modal-actions"><button type="button" class="btn btn-ghost" id="pfViewClose">Close</button></div>', function (card, close) { $("pfViewClose").onclick = close; });
  }

  // Edit sheet (Name / About) with live counter.
  JC.openEditSheet = function (kind) {
    if (!JC.modal) return;
    var p = JC.userProfile || {};
    var isName = kind === "name", max = isName ? JC.NAME_MAX : JC.ABOUT_MAX;
    var val = isName ? (p.displayName || "") : (p.about || "").trim();
    var field = isName
      ? '<input class="text-input pf-edit-input" id="pfEditInput" type="text" maxlength="' + max + '" value="' + esc(val) + '" placeholder="Your name">'
      : '<textarea class="text-input pf-edit-input" id="pfEditInput" rows="3" maxlength="' + max + '" placeholder="Available">' + esc(val) + "</textarea>";
    JC.modal('<div class="sheet-title">' + (isName ? "Enter your name" : "About") + '</div><div class="pf-edit-wrap">' + field + '<span class="pf-count" id="pfEditCount"></span></div>' +
      (isName ? "" : '<p class="settings-note">Friends see this in your contact info.</p>') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="pfEditCancel">Cancel</button><button type="button" class="btn btn-primary" id="pfEditSave">Save</button></div>', function (card, close) {
      var inp = $("pfEditInput"), cnt = $("pfEditCount"), save = $("pfEditSave");
      function upd() { cnt.textContent = JC.counterText((inp.value || "").length, max); save.disabled = isName && !(inp.value || "").trim(); }
      inp.addEventListener("input", upd); upd();
      $("pfEditCancel").onclick = close;
      save.onclick = function () {
        save.disabled = true;
        var pr = isName ? JC.saveDisplayName(inp.value) : JC.saveAbout(inp.value);
        pr.then(function () { close(); if (JC.loadProfileScreen) JC.loadProfileScreen(); })
          .catch(function (e) { save.disabled = false; toast((e && e.message) || "Save failed"); });
      };
      try { inp.focus(); var l = inp.value.length; inp.setSelectionRange(l, l); } catch (e) {}
    });
  };

  // Camera: the app's file picker opens the gallery only, so take the photo
  // with a small in-app camera (same permission the filter camera uses).
  JC.openProfileCamera = function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !JC.modal) { toast("Camera is not supported on this device."); return; }
    var stream = null, facing = "user";
    function stop() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
    JC.modal('<div class="sheet-title">Take a photo</div><div class="pf-cam"><video id="pfCamVideo" autoplay playsinline muted></video></div><div class="modal-actions pf-cam-actions"><button type="button" class="btn btn-ghost" id="pfCamCancel">Cancel</button><button type="button" class="btn btn-ghost" id="pfCamFlip">Flip</button><button type="button" class="btn btn-primary" id="pfCamShot">Capture</button></div>', function (card, close) {
      var v = $("pfCamVideo");
      if (JC.onModalClose) JC.onModalClose(stop);
      function start() {
        stop();
        navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false }).then(function (s) {
          stream = s; v.srcObject = s; v.style.transform = facing === "user" ? "scaleX(-1)" : "";
        }).catch(function (e) { close(); toast("Camera blocked. Allow camera permission in the app settings."); });
      }
      start();
      $("pfCamCancel").onclick = close;
      $("pfCamFlip").onclick = function () { facing = facing === "user" ? "environment" : "user"; start(); };
      $("pfCamShot").onclick = function () {
        if (!v.videoWidth) { toast("Camera is not ready yet."); return; }
        var c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
        var ctx = c.getContext("2d");
        if (facing === "user") { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(v, 0, 0);
        c.toBlob(function (blob) {
          close();
          if (!blob) { toast("Couldn't take the photo."); return; }
          var f; try { f = new File([blob], "camera.jpg", { type: "image/jpeg" }); } catch (e) { f = blob; f.name = "camera.jpg"; }
          JC.saveProfilePhoto(f).catch(function (e) { toast((e && e.message) || "Photo update failed"); });
        }, "image/jpeg", 0.9);
      };
    });
  };

  // Fill the visible rows from the profile.
  JC.renderProfileRows = function () {
    var p = JC.userProfile; if (!p) return;
    var nv = $("pfNameVal"); if (nv) nv.textContent = p.displayName || "Add your name";
    var av = $("pfAboutVal"); if (av) av.textContent = (JC.aboutOf ? JC.aboutOf(p) : (p.about || "").trim()) || "Available";
    var g = JC.profileGmailValue(p, JC.currentUser && JC.currentUser.email);
    var gr = $("pfRowGmail"); if (gr) gr.classList.toggle("hidden", !g);
    var ge = $("profileGmail"); if (ge) ge.textContent = g;
    var hint = $("pfUsernameHint"); if (hint) hint.classList.toggle("hidden", !p.username);
    var qr = $("btnMyQr"); if (qr) qr.classList.toggle("hidden", !p.username);
  };

  function hideEmptyContactRows() {
    [["pfcRowAbout", "contactAbout"], ["pfcRowUsername", "contactUsername"], ["pfcRowGmail", "contactGmail"]].forEach(function (r) {
      var row = $(r[0]), v = $(r[1]); if (!row || !v) return;
      var t = (v.textContent || "").trim();
      row.classList.toggle("hidden", !t || t === "-");
    });
  }
  JC.hideEmptyContactRows = hideEmptyContactRows;

  document.addEventListener("DOMContentLoaded", function () {
    var lp = JC.loadProfileScreen;
    if (lp) JC.loadProfileScreen = function () { var r = lp.apply(this, arguments); try { JC.renderProfileRows(); } catch (e) {} return r; };
    var on = function (id, fn) { var el = $(id); if (el) el.addEventListener("click", fn); };
    on("profileAvatar", JC.openPhotoSheet);
    on("pfPhotoBadge", function (e) { e.stopPropagation(); JC.openPhotoSheet(); });
    on("pfCoverBadge", function (e) { e.stopPropagation(); JC.openCoverSheet(); });
    on("profileCover", JC.openCoverSheet);
    on("pfRowName", function () { JC.openEditSheet("name"); });
    on("pfRowAbout", function () { JC.openEditSheet("about"); });
    on("btnMyQr", function () { if (JC.openMyQr) JC.openMyQr(); });
    on("btnSetUsername", function () { if (JC.openSetUsername) JC.openSetUsername(); });
    // Contact info rows: hide empty ones whenever block.js fills them.
    ["contactAbout", "contactUsername", "contactGmail"].forEach(function (id) {
      var el = $(id); if (el && window.MutationObserver) new MutationObserver(hideEmptyContactRows).observe(el, { childList: true, characterData: true, subtree: true });
    });
    hideEmptyContactRows();
  });
})();
