// Jilan Chat v4.8 part 5 — set a username ONCE for Gmail accounts that
// have none. Same rules as signup; permanent after it is set.
(function () {
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(t) { if (JC.toast) JC.toast(t); }
  function me() { return JC.currentUser && JC.currentUser.uid; }
  JC.needsUsername = function () { var p = JC.userProfile; return !!(me() && p && !p.username); };

  // Claim + profile in ONE batch: usernames/{u} {uid, createdAt} and users/{uid}.username.
  JC.setUsernameOnce = function (raw) {
    var v = JC.validateUsername(raw);
    if (!v.ok) return Promise.reject(new Error(v.error));
    if (!JC.db || !me()) return Promise.reject(new Error("Please sign in first."));
    if (JC.userProfile && JC.userProfile.username) return Promise.reject(new Error("You already have a username."));
    var claim = JC.db.collection("usernames").doc(v.username), uref = JC.db.collection("users").doc(me());
    return claim.get().then(function (s) {
      if (s.exists && (s.data() || {}).uid !== me()) throw new Error("This username is already taken. Choose another.");
      var b = JC.db.batch();
      if (!s.exists) b.set(claim, { uid: me(), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      b.update(uref, { username: v.username });
      return b.commit();
    }).then(function () {
      if (JC.userProfile) JC.userProfile.username = v.username;
      return v.username;
    }, function (e) {
      if (e && /permission/i.test(String(e.code || e.message))) throw new Error("This username is already taken. Choose another.");
      throw e;
    });
  };

  JC.openSetUsername = function () {
    if (!JC.needsUsername()) { toast("You already have a username."); return; }
    JC.modal('<div class="sheet-title">Set your username</div><p class="settings-note">Friends can find you by your @username. Use 3–20 lowercase letters, numbers or _.</p>' +
      '<input class="text-input" id="setUname" maxlength="20" autocapitalize="off" autocomplete="off" placeholder="username"><div class="lock-error" id="setUnameErr"></div>' +
      '<p class="uname-warn">Your username can\'t be changed later. Choose carefully.</p>' +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="setUnameCancel">Cancel</button><button type="button" class="btn btn-primary" id="setUnameSave">Save username</button></div>', function (card, close) {
      var inp = card.querySelector("#setUname"), err = card.querySelector("#setUnameErr"), btn = card.querySelector("#setUnameSave");
      inp.addEventListener("input", function () { var lo = inp.value.toLowerCase().replace(/\s+/g, ""); if (lo !== inp.value) inp.value = lo; err.textContent = ""; });
      card.querySelector("#setUnameCancel").onclick = close;
      btn.onclick = function () {
        var v = JC.validateUsername(inp.value);
        if (!v.ok) { err.textContent = v.error; return; }
        if (!window.confirm("Use @" + v.username + " as your username? It can't be changed later.")) return;
        btn.disabled = true; err.textContent = "Checking...";
        JC.setUsernameOnce(v.username).then(function (u) {
          close(); toast("Your username is @" + u);
          try { localStorage.setItem("jc_unamePromptDone_" + me(), "1"); } catch (e) {}
          var bn = $("unameBanner"); if (bn) bn.parentNode.removeChild(bn);
          if (JC.loadProfileScreen) JC.loadProfileScreen();
        }).catch(function (e) { btn.disabled = false; err.textContent = (e && e.message) || "Couldn't save. Try again."; });
      };
      try { inp.focus(); } catch (e) {}
    });
  };

  // Profile: replace the "No username" text with a Set username button.
  JC.renderUsernameRow = function () {
    var uEl = $("profileUsername"); if (!uEl) return;
    var b = $("btnSetUsername");
    if (JC.needsUsername()) {
      uEl.textContent = "No username";
      if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "btnSetUsername"; b.className = "btn btn-primary btn-small"; b.textContent = "Set username"; b.addEventListener("click", JC.openSetUsername); uEl.parentNode.appendChild(b); }
      b.classList.remove("hidden");
    } else if (b) b.classList.add("hidden");
  };
  // One-time gentle banner on the chat list.
  JC.maybeUsernameBanner = function () {
    if (!JC.needsUsername() || $("unameBanner")) return;
    var done = false; try { done = localStorage.getItem("jc_unamePromptDone_" + me()) === "1"; } catch (e) {}
    if (done) return;
    var list = $("chatList"); if (!list || !list.parentNode) return;
    var bn = document.createElement("div"); bn.id = "unameBanner"; bn.className = "uname-banner";
    bn.innerHTML = '<div class="ub-text"><b>Set your @username</b><span>So friends can find you without your Gmail.</span></div><button type="button" class="btn btn-primary btn-small" id="ubSet">Set</button><button type="button" class="ub-x" id="ubX" aria-label="Dismiss">&times;</button>';
    list.parentNode.insertBefore(bn, list);
    $("ubSet").onclick = JC.openSetUsername;
    $("ubX").onclick = function () { try { localStorage.setItem("jc_unamePromptDone_" + me(), "1"); } catch (e) {} bn.parentNode.removeChild(bn); };
  };
  function wrapProfile() {
    var o = JC.loadProfileScreen;
    if (o) JC.loadProfileScreen = function () { var r = o.apply(this, arguments); try { JC.renderUsernameRow(); } catch (e) {} return r; };
  }
  document.addEventListener("DOMContentLoaded", function () {
    wrapProfile();
    var n = 0, t = setInterval(function () {
      if (JC.userProfile && me()) { clearInterval(t); JC.maybeUsernameBanner(); try { JC.renderUsernameRow(); } catch (e) {} }
      else if (++n > 300) clearInterval(t);
    }, 1000);
  });
})();
// ---------- v4.8 profile cover photo ----------
(function () {
  var JC = window.JC = window.JC || {};
  function $(id) { return document.getElementById(id); }
  function me() { return JC.currentUser && JC.currentUser.uid; }
  function toast(t) { if (JC.toast) JC.toast(t); }
  JC.COVER_W = 720; JC.COVER_H = 405; JC.COVER_MAX = 300000;
  // File -> 16:9 centre-cropped JPEG data URL, shrinking until it fits.
  JC.compressCover = function (file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type || "")) return reject(new Error("Please choose a photo."));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var tries = [[720, 0.72], [720, 0.6], [640, 0.55], [560, 0.5], [480, 0.45]];
          for (var i = 0; i < tries.length; i++) {
            var w = tries[i][0], h = Math.round(w * 9 / 16), c = document.createElement("canvas");
            c.width = w; c.height = h;
            var ctx = c.getContext("2d"), iw = img.naturalWidth, ih = img.naturalHeight;
            var sw = iw, sh = iw * 9 / 16; if (sh > ih) { sh = ih; sw = ih * 16 / 9; }
            ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
            var d = c.toDataURL("image/jpeg", tries[i][1]);
            if (d.length <= JC.COVER_MAX) { URL.revokeObjectURL(url); return resolve(d); }
          }
          reject(new Error("This photo is too large. Try another one."));
        } catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Couldn't read this photo.")); };
      img.src = url;
    });
  };
  JC.paintCover = function (el, data, ownEmpty) {
    if (!el) return;
    if (data && /^data:image\//.test(data)) { el.style.backgroundImage = 'url("' + data + '")'; el.classList.add("has-img"); el.classList.remove("hidden"); }
    else { el.style.backgroundImage = ""; el.classList.remove("has-img"); el.classList.toggle("hidden", !ownEmpty); }
  };
  JC.renderOwnCover = function () {
    var p = JC.userProfile || {};
    JC.paintCover($("profileCover"), p.coverURL, true);
    var rb = $("btnRemoveCover"); if (rb) rb.classList.toggle("hidden", !p.coverURL);
  };
  function saveCover(val) {
    if (!JC.db || !me()) return Promise.reject(new Error("Please sign in first."));
    var upd = { coverURL: val === null ? firebase.firestore.FieldValue.delete() : val };
    return JC.db.collection("users").doc(me()).update(upd).then(function () {
      if (JC.userProfile) { if (val === null) delete JC.userProfile.coverURL; else JC.userProfile.coverURL = val; }
      JC.renderOwnCover();
    }, function (e) {
      if (e && /permission/i.test(String(e.code || e.message))) throw new Error("Cover photo needs the latest server update. Try again later.");
      throw e;
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    var inp = $("coverInput"), pick = function () { if (inp) { inp.value = ""; inp.click(); } };
    if ($("btnChangeCover")) $("btnChangeCover").addEventListener("click", pick);
    // v4.9: the cover camera badge opens a sheet (profile.js).
    if (inp) inp.addEventListener("change", function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      toast("Saving cover...");
      JC.compressCover(f).then(saveCover).then(function () { toast("Cover photo updated"); })
        .catch(function (e) { toast((e && e.message) || "Couldn't save cover."); });
    });
    if ($("btnRemoveCover")) $("btnRemoveCover").addEventListener("click", function () {
      if (!window.confirm("Remove your cover photo?")) return;
      saveCover(null).then(function () { toast("Cover removed"); }).catch(function (e) { toast((e && e.message) || "Couldn't remove cover."); });
    });
    var lp = JC.loadProfileScreen;
    if (lp) JC.loadProfileScreen = function () { var r = lp.apply(this, arguments); try { JC.renderOwnCover(); } catch (e) {} return r; };
    var oc = JC.openContactProfile;
    if (oc) JC.openContactProfile = function () {
      var r = oc.apply(this, arguments), uid = JC.currentChatOtherUid, el = $("contactCover");
      JC.paintCover(el, null, false);
      if (uid && JC.db && !JC.currentChatIsGroup) JC.db.collection("users").doc(uid).get().then(function (s) {
        if (JC.currentChatOtherUid === uid) JC.paintCover(el, s.exists ? (s.data() || {}).coverURL : null, false);
      }).catch(function () {});
      return r;
    };
  });
})();
