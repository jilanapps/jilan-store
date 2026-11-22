// Jilan Chat v1.0 — block.js
// BLOCK / UNBLOCK (1-to-1 only — NEVER inside groups).
// Data: users/{uid}/blocked/{blockedUid} { blockedUid, blockedAt }.
// Rules (firestore.rules, already in place):
//   - Only the owner can read/write their own blocked list.
//   - A blocked person CANNOT send 1-to-1 messages or start a call:
//     the rules reject the write and Firebase returns a permission error.
//   - Groups are untouched: blocked people still see each other's
//     messages inside a group. The UI says so wherever blocking happens.
// Client-side effects of blocking someone:
//   - Their 1-to-1 chat disappears from my chat list.
//   - Their profile and status are no longer shown to me.
//   - Their incoming calls are ignored (no ring, no screen).
//   - Their sends fail with a permission error; MY app shows them only
//     the neutral "Message nahi bheja ja saka." — never the word "block".

(function () {
  var JC = window.JC = window.JC || {};
  JC.blockedUids = {};   // uid -> true (my blocked list, loaded at sign-in)

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  JC.isBlocked = function (uid) { return !!JC.blockedUids[uid]; };

  // Load my blocked list once per sign-in; keep it live after that.
  JC.loadBlockedList = function () {
    if (!JC.db || !JC.currentUser) return;
    JC.db.collection("users").doc(JC.currentUser.uid).collection("blocked")
      .onSnapshot(function (snap) {
        JC.blockedUids = {};
        snap.forEach(function (doc) { JC.blockedUids[doc.id] = true; });
      }, function () { /* blocked list is best-effort; rules still enforce */ });
  };

  JC.blockUser = function (uid) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    if (uid === JC.currentUser.uid) return Promise.reject(new Error("cannot-block-self"));
    return JC.db.collection("users").doc(JC.currentUser.uid).collection("blocked").doc(uid).set({
      blockedUid: uid,
      blockedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      JC.blockedUids[uid] = true;
      JC.toast("Contact blocked");
    });
  };

  JC.unblockUser = function (uid) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    return JC.db.collection("users").doc(JC.currentUser.uid).collection("blocked").doc(uid).delete()
      .then(function () {
        delete JC.blockedUids[uid];
        JC.toast("Contact unblocked");
      });
  };

  // ---------- contact profile screen (block button lives here too) ----------
  JC.openContactProfile = function () {
    if (!JC.currentChatOtherUid || JC.currentChatIsGroup) return;
    var uid = JC.currentChatOtherUid;
    var p = JC.currentChatOther || (JC.getCachedProfile ? JC.getCachedProfile(uid) : null);
    JC.showScreen("screen-contact", { push: true });
    var fill = function (prof) {
      $("contactAvatar").innerHTML = prof.photoURL
        ? '<img src="' + esc(prof.photoURL) + '" alt="">'
        : esc((prof.displayName || "?")[0] || "?");
      $("contactName").textContent = prof.displayName || "Unknown";
      // @username hi asli pehchan hai — do "Asif" hon to bhi farq nazar aaye.
      // Username aur Gmail dono alag lines par (v4.2).
      $("contactUsername").textContent = prof.username ? "@" + prof.username : "";
      $("contactGmail").textContent = prof.gmail || "";
      $("contactAbout").textContent = JC.aboutOf ? JC.aboutOf(prof) : (prof.about || "Available");
      $("contactStatus").textContent = prof.online ? "online"
        : (prof.lastSeen ? "last seen" : "offline");
      refreshBlockButton(uid);
    };
    if (p) fill(p);
    else {
      JC.db.collection("users").doc(uid).get().then(function (snap) {
        fill(snap.exists ? snap.data() : { displayName: "Unknown" });
      });
    }
  };

  function refreshBlockButton(uid) {
    var btn = $("btnBlockContact");
    if (JC.isBlocked(uid)) {
      btn.textContent = "Unblock contact";
      btn.className = "btn btn-primary";
    } else {
      btn.textContent = "Block contact";
      btn.className = "btn btn-danger";
    }
  }

  // ---------- settings: blocked contacts list ----------
  JC.openSettings = function () {
    JC.showScreen("screen-settings", { push: true });
    renderBlockedList();
  };

  function renderBlockedList() {
    var list = $("blockedList");
    var empty = $("blockedEmpty");
    list.innerHTML = "";
    var uids = Object.keys(JC.blockedUids);
    if (!uids.length) { empty.classList.remove("hidden"); return; }
    empty.classList.add("hidden");
    uids.forEach(function (uid) {
      JC.db.collection("users").doc(uid).get().then(function (snap) {
        var p = snap.exists ? snap.data() : { displayName: "Unknown", gmail: "" };
        var row = document.createElement("div");
        row.className = "user-result";
        row.innerHTML =
          '<div class="avatar">' + (p.photoURL ? '<img src="' + esc(p.photoURL) + '" alt="">' : esc((p.displayName || "?")[0] || "?")) + '</div>' +
          '<div class="info"><div class="name">' + esc(p.displayName || "Unknown") + '</div>' +
          '<div class="gmail">' + esc(p.gmail || "") + '</div></div>' +
          '<button class="btn btn-ghost btn-small">Unblock</button>';
        row.querySelector("button").addEventListener("click", function () {
          JC.unblockUser(uid).then(function () { renderBlockedList(); });
        });
        list.appendChild(row);
      });
    });
  }

  // ---------- wire UI ----------
  document.addEventListener("DOMContentLoaded", function () {
    // Chat header menu (⋮): View contact + Block/Unblock.
    $("btnChatMenu").addEventListener("click", function (e) {
      e.stopPropagation();
      var menu = $("chatMenu");
      var isGroup = JC.currentChatIsGroup;
      $("menuViewContact").classList.toggle("hidden", isGroup);
      var blk = $("menuBlock");
      blk.classList.toggle("hidden", isGroup); // no blocking inside groups
      blk.textContent = JC.currentChatOtherUid && JC.isBlocked(JC.currentChatOtherUid)
        ? "Unblock contact" : "Block contact";
      menu.classList.toggle("hidden");
    });
    document.addEventListener("click", function () { $("chatMenu").classList.add("hidden"); });
    $("menuViewContact").addEventListener("click", function () {
      $("chatMenu").classList.add("hidden");
      JC.openContactProfile();
    });
    $("menuBlock").addEventListener("click", function () {
      $("chatMenu").classList.add("hidden");
      var uid = JC.currentChatOtherUid;
      if (!uid) return;
      if (JC.isBlocked(uid)) {
        JC.unblockUser(uid);
      } else {
        JC.blockUser(uid);
      }
    });
    // Contact profile screen.
    $("btnContactBack").addEventListener("click", function () { JC.goBack(); });
    $("btnBlockContact").addEventListener("click", function () {
      var uid = JC.currentChatOtherUid;
      if (!uid) return;
      if (JC.isBlocked(uid)) {
        JC.unblockUser(uid).then(function () { refreshBlockButton(uid); });
      } else {
        JC.blockUser(uid).then(function () { refreshBlockButton(uid); });
      }
    });
    // Settings screen.
    $("btnSettings").addEventListener("click", JC.openSettings);
    $("btnSettingsBack").addEventListener("click", function () { JC.goBack(); });
    $("btnSettingsAbout").addEventListener("click", function () { JC.showScreen("screen-about", { push: true }); });
  });
})();
