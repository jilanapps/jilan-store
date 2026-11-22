// Jilan Chat v1.0 — status.js
// WhatsApp-like daily status (24 hours only).
// Data model: statuses/{uid}/items/{statusId}
//   type: "photo" | "video" | "text"
//   mediaUrl (photo/video) | text (text type)
//   createdAt, expiresAt = createdAt + 24h
// The client only shows items whose expiresAt is still in the future.
// Status media lives under statuses/{uid}/ in Storage and is deleted by a
// GCS lifecycle rule 24h after upload (Firebase setup step, not app code).
// If a mediaUrl 404s (file already deleted), the viewer shows
// "Status khatam ho gaya" instead of a broken image.
// NO "seen" tracking in v1.0 — viewing a status records nothing.

(function () {
  var JC = window.JC = window.JC || {};
  var DAY_MS = 24 * 60 * 60 * 1000;
  var viewQueue = [];   // items being viewed, in order
  var viewIndex = 0;
  var viewTimer = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function isLive(item) {
    if (!item.expiresAt) return false;
    var t = item.expiresAt.toMillis ? item.expiresAt.toMillis() : new Date(item.expiresAt).getTime();
    return t > Date.now();
  }
  function fmtAgo(ts) {
    if (!ts) return "";
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var h = Math.floor(mins / 60);
    if (h < 24) return h + "h ago";
    return d.toDateString();
  }

  // ---------- open the status screen ----------
  JC.openStatus = function () {
    if (!JC.db || !JC.currentUser) return;
    JC.showScreen("screen-status");
    loadMyStatus();
    loadFriendsStatus();
  };

  function loadMyStatus() {
    var me = JC.currentUser;
    var av = $("myStatusAvatar");
    var p = JC.userProfile || {};
    av.innerHTML = p.photoURL ? '<img src="' + esc(p.photoURL) + '" alt="">' : esc((p.displayName || "?")[0] || "?");
    JC.db.collection("statuses").doc(me.uid).collection("items")
      .orderBy("createdAt", "desc").limit(10).get().then(function (snap) {
        var live = [];
        snap.forEach(function (doc) {
          var d = doc.data();
          if (isLive(d)) live.push({ id: doc.id, ownerUid: me.uid, ownerName: p.displayName || "You", data: d });
        });
        $("myStatusHint").textContent = live.length
          ? live.length + " active status — tap to view, expires in 24h."
          : "Tap + to add a photo, video or text status.";
        $("myStatusRow").onclick = function () {
          if (live.length) openViewer(live, 0, true);
        };
      }).catch(function () {});
  }

  function loadFriendsStatus() {
    var list = $("statusList");
    var empty = $("statusEmpty");
    list.innerHTML = "";
    empty.classList.add("hidden");
    // Friends = people I already have a chat with.
    JC.db.collection("userChats").doc(JC.currentUser.uid).collection("list").get().then(function (snap) {
      if (snap.empty) { empty.classList.remove("hidden"); return; }
      var done = 0, shown = 0;
      snap.forEach(function (doc) {
        var otherUid = doc.data().otherUid;
        // Blocked contacts: their status is not shown.
        if (JC.isBlocked && JC.isBlocked(otherUid)) { done++; if (done === snap.size && shown === 0) empty.classList.remove("hidden"); return; }
        JC.db.collection("statuses").doc(otherUid).collection("items")
          .orderBy("createdAt", "desc").limit(10).get().then(function (s2) {
            var live = [];
            s2.forEach(function (d2) {
              var d = d2.data();
              if (isLive(d)) live.push({ id: d2.id, ownerUid: otherUid, data: d });
            });
            if (live.length) {
              shown++;
              JC.db.collection("users").doc(otherUid).get().then(function (pSnap) {
                var p = pSnap.exists ? pSnap.data() : { displayName: "Unknown", photoURL: "" };
                live.forEach(function (it) { it.ownerName = p.displayName || "Unknown"; });
                var row = document.createElement("div");
                row.className = "chat-row";
                row.innerHTML =
                  '<div class="avatar">' + (p.photoURL ? '<img src="' + esc(p.photoURL) + '" alt="">' : esc((p.displayName || "?")[0] || "?")) + '</div>' +
                  '<div class="info"><div class="top"><span class="name">' + esc(p.displayName || "Unknown") + '</span><span class="time">' + esc(fmtAgo(live[0].data.createdAt)) + '</span></div>' +
                  '<div class="preview">' + live.length + ' status update' + (live.length > 1 ? 's' : '') + '</div></div>';
                row.addEventListener("click", function () { openViewer(live.slice().reverse(), 0, false); });
                list.appendChild(row);
              });
            }
          }).catch(function () {}).then(function () {
            done++;
            if (done === snap.size && shown === 0) empty.classList.remove("hidden");
          });
      });
    }).catch(function () { empty.classList.remove("hidden"); });
  }

  // ---------- post a status ----------
  JC.postTextStatus = function () {
    var text = ($("statusTextInput").value || "").trim();
    if (!text) { JC.toast("Write something first."); return; }
    if (!JC.db || !JC.currentUser) return;
    addStatusDoc({ type: "text", text: text }).then(function () {
      $("statusTextInput").value = "";
      JC.toast("Status posted — it disappears in 24 hours.");
      loadMyStatus();
    }).catch(function (e) { JC.toast("Status failed: " + e.message); });
  };

  JC.postMediaStatus = function (file) {
    if (!file) return;
    var kind = file.type.indexOf("image/") === 0 ? "photo"
      : file.type.indexOf("video/") === 0 ? "video" : null;
    if (!kind) { JC.toast("Only photos and videos can be posted as status."); return; }
    if (kind === "video" && file.size > 50 * 1024 * 1024) {
      JC.toast("Video is too big — 50 MB se bara video status me nahi lag sakta.");
      return;
    }
    if (kind === "photo") {
      JC.compressImage(file, function (small) { uploadStatusMedia(small, "photo", file.name); });
    } else {
      uploadStatusMedia(file, "video", file.name);
    }
  };

  function uploadStatusMedia(file, kind, originalName) {
    var uid = JC.currentUser.uid;
    var safeName = Date.now() + "_" + originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    var ref = JC.storage.ref("statuses/" + uid + "/" + safeName);
    JC.toast("Uploading status…");
    ref.put(file, { contentType: file.type || "application/octet-stream" }).then(function (snap) {
      return snap.ref.getDownloadURL();
    }).then(function (url) {
      return addStatusDoc({ type: kind, mediaUrl: url, mediaName: originalName });
    }).then(function () {
      JC.toast("Status posted — it disappears in 24 hours.");
      loadMyStatus();
    }).catch(function (e) { JC.toast("Status failed: " + e.message); });
  }

  function addStatusDoc(data) {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    data.expiresAt = firebase.firestore.Timestamp.fromMillis(Date.now() + DAY_MS);
    return JC.db.collection("statuses").doc(JC.currentUser.uid).collection("items").add(data);
  }

  // ---------- delete my own status item ----------
  JC.deleteMyStatus = function (statusId, mediaUrl) {
    if (!JC.db || !JC.currentUser) return;
    JC.db.collection("statuses").doc(JC.currentUser.uid).collection("items").doc(statusId).delete()
      .then(function () {
        // Storage file is removed by the 24h lifecycle rule anyway; try
        // to remove it now too, but a failure here is not fatal.
        if (mediaUrl) {
          try { JC.storage.refFromURL(mediaUrl).delete().catch(function () {}); } catch (e) {}
        }
        JC.toast("Status deleted");
        loadMyStatus();
      }).catch(function (e) { JC.toast("Delete failed: " + e.message); });
  };

  // ---------- viewer ----------
  function openViewer(items, index, mine) {
    viewQueue = items;
    viewIndex = index;
    showViewerItem(mine);
    $("statusViewer").classList.remove("hidden");
  }
  function showViewerItem(mine) {
    clearTimeout(viewTimer);
    var item = viewQueue[viewIndex];
    if (!item) { closeViewer(); return; }
    var d = item.data;
    $("statusViewerName").textContent = item.ownerName || "Status";
    $("statusViewerTime").textContent = fmtAgo(d.createdAt);
    $("statusViewerAvatar").textContent = (item.ownerName || "?")[0] || "?";
    var body = $("statusViewerBody");
    body.innerHTML = "";
    body.onclick = function () { nextItem(mine); };
    if (d.type === "text") {
      var div = document.createElement("div");
      div.style.cssText = "font-size:26px;line-height:1.5;text-align:center;padding:20px;word-wrap:break-word;";
      div.textContent = d.text || "";
      body.appendChild(div);
      viewTimer = setTimeout(function () { nextItem(mine); }, 5000);
    } else if (d.type === "photo") {
      var img = document.createElement("img");
      img.style.cssText = "max-width:100%;max-height:100%;";
      img.src = d.mediaUrl || "";
      img.onerror = function () { statusGone(body); };
      body.appendChild(img);
      viewTimer = setTimeout(function () { nextItem(mine); }, 5000);
    } else if (d.type === "video") {
      var vid = document.createElement("video");
      vid.style.cssText = "max-width:100%;max-height:100%;";
      vid.src = d.mediaUrl || "";
      vid.controls = true;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.onerror = function () { statusGone(body); };
      vid.onended = function () { nextItem(mine); };
      body.appendChild(vid);
      viewTimer = setTimeout(function () { nextItem(mine); }, 15000);
    }
    // My own status: long-press is overkill — a small delete button.
    if (mine) {
      var del = document.createElement("button");
      del.textContent = "Delete this status";
      del.className = "btn btn-danger";
      del.style.cssText = "position:absolute;bottom:16px;left:50%;transform:translateX(-50%);width:auto;";
      del.onclick = function (e) {
        e.stopPropagation();
        JC.deleteMyStatus(item.id, d.mediaUrl);
        closeViewer();
      };
      $("statusViewer").appendChild(del);
      del._mine = true;
    }
  }
  function statusGone(body) {
    clearTimeout(viewTimer);
    body.innerHTML = "";
    var note = document.createElement("div");
    note.style.cssText = "color:#8696a0;font-size:18px;text-align:center;padding:20px;";
    note.textContent = "Status khatam ho gaya";
    body.appendChild(note);
    viewTimer = setTimeout(function () { nextItem(false); }, 2500);
  }
  function nextItem(mine) {
    viewIndex++;
    if (viewIndex >= viewQueue.length) { closeViewer(); return; }
    showViewerItem(mine);
  }
  function closeViewer() {
    clearTimeout(viewTimer);
    $("statusViewer").classList.add("hidden");
    var body = $("statusViewerBody");
    body.innerHTML = "";
    var del = document.querySelector("#statusViewer .btn-danger");
    if (del) del.remove();
  }

  // ---------- wire UI ----------
  document.addEventListener("DOMContentLoaded", function () {
    $("btnStatus").addEventListener("click", JC.openStatus);
    $("btnStatusBack").addEventListener("click", function () { JC.goBack(); });
    $("btnAddStatus").addEventListener("click", function () {
      $("statusAddBox").classList.toggle("hidden");
    });
    $("btnPostTextStatus").addEventListener("click", JC.postTextStatus);
    $("btnPostMediaStatus").addEventListener("click", function () { $("statusFileInput").click(); });
    $("statusFileInput").addEventListener("change", function () {
      var f = $("statusFileInput").files && $("statusFileInput").files[0];
      if (f) JC.postMediaStatus(f);
      $("statusFileInput").value = "";
    });
    $("statusViewerClose").addEventListener("click", closeViewer);
    var aboutBtn = $("btnAbout");
    if (aboutBtn) aboutBtn.addEventListener("click", function () { JC.showScreen("screen-about", { push: true }); });
    var aboutBack = $("btnAboutBack");
    if (aboutBack) aboutBack.addEventListener("click", function () { JC.goBack(); });
  });
})();
