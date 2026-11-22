// Jilan Chat v4.0 — requests.js
// ACCEPT-REQUEST system (1-to-1 chats only — groups me NAHI lagta).
// Ajnabi seedha message nahi bhej sakta: pehle chat REQUEST jati hai,
// dusra banda Accept ya Decline karta hai. Accept par hi chat banti hai.
// Data: chatRequests/{requestId} { fromUid, toUid, fromUsername, fromName,
// status: pending|accepted|declined, createdAt }. Doc id IS the deterministic
// 1-to-1 chatId (uidA_uidB sorted) — aik pair ke darmiyan aik waqt me sirf
// aik request ho sakti hai, duplicate ban hi nahi sakta.
// Rules (firestore.rules) enforce karti hain, sirf UI nahi:
//   - create sirf sender (fromUid == auth uid, status hamesha 'pending');
//   - status change (pending -> accepted/declined) sirf recipient;
//   - delete sirf sender (cancel / dismiss);
//   - chats create sirf tab jab ACCEPTED request maujood ho — taake koi
//     app se bypass kar ke seedha chat na bana sake.
// Block: jis ne block kiya ho, us ko request nahi ja sakti (rules + UI).
// Khud ko request nahi (pehle se handled).

(function () {
  var JC = window.JC = window.JC || {};

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/);
    return ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }
  function avatarHtml(profile) {
    if (profile && profile.photoURL) return '<img src="' + esc(profile.photoURL) + '" alt="">';
    return esc(initials(profile ? profile.displayName : "?"));
  }
  function handleOf(profile) {
    if (!profile) return "";
    return profile.username ? "@" + profile.username : (profile.gmail || "");
  }

  // ---------- pure decision helpers (unit-testable, no Firestore) ----------
  // state: { chatExists, request: null | { status, fromUid }, me }
  // Returns: 'open' | 'send' | 'already-sent' | 'incoming' | 'resend' | 'create'
  JC.decideChatAction = function (state) {
    if (state.chatExists) return "open";
    var r = state.request;
    if (!r) return "send";
    if (r.status === "pending") return r.fromUid === state.me ? "already-sent" : "incoming";
    if (r.status === "declined") return r.fromUid === state.me ? "resend" : "send";
    if (r.status === "accepted") return "create"; // chat missing despite accept — create it
    return "send";
  };

  // Status transitions: sirf pending -> accepted ya pending -> declined.
  // Baaki sab (accepted -> kuch, declined -> accepted, pending -> pending) mana hai.
  JC.isValidRequestTransition = function (from, to) {
    return from === "pending" && (to === "accepted" || to === "declined");
  };

  // Request doc id = deterministic 1-to-1 chatId (uidA_uidB sorted).
  JC.requestIdFor = function (a, b) {
    if (JC.chatIdFor) return JC.chatIdFor(a, b);
    return [a, b].sort().join("_");
  };

  // ---------- send / accept / decline / cancel ----------
  // Entry point (search result "Chat" / "Send request" button se):
  // chat maujood ho to kholo, warna request bhejo (duplicate check ke sath).
  // Resolves with { action } — 'open' | 'sent' | 'already-sent' | 'incoming' | 'create'.
  JC.requestOrOpenChat = function (otherUid) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    var me = JC.currentUser.uid;
    if (otherUid === me) return Promise.reject(new Error("cannot-chat-with-self"));
    // Maine is ko block kiya hai to request nahi — pehle unblock karna pare ga.
    // (Ye meri apni action hai, is liye saaf batana theek hai.)
    if (JC.isBlocked && JC.isBlocked(otherUid)) return Promise.reject(new Error("you-blocked-them"));
    var chatId = JC.requestIdFor(me, otherUid);
    return Promise.all([
      JC.db.collection("chats").doc(chatId).get(),
      JC.db.collection("chatRequests").doc(chatId).get()
    ]).then(function (results) {
      var state = {
        chatExists: results[0].exists,
        request: results[1].exists ? results[1].data() : null,
        me: me
      };
      var action = JC.decideChatAction(state);
      if (action === "open") {
        JC.openChat(chatId, otherUid);
        return { action: "open" };
      }
      if (action === "incoming") {
        JC.openRequests();
        return { action: "incoming" };
      }
      if (action === "already-sent") {
        return { action: "already-sent" };
      }
      if (action === "create") {
        return JC.ensureChat(chatId, otherUid).then(function () {
          JC.openChat(chatId, otherUid);
          return { action: "create" };
        });
      }
      // 'send' ya 'resend' — request bhejo.
      return JC.sendChatRequest(otherUid).then(function () { return { action: "sent" }; });
    });
  };

  // Request bhejo. Duplicate rok: pending request maujood ho to dobara
  // mat banao. Declined purani request ho to pehle delete karo, phir nayi.
  JC.sendChatRequest = function (otherUid) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    var me = JC.currentUser.uid;
    if (otherUid === me) return Promise.reject(new Error("cannot-chat-with-self"));
    if (JC.isBlocked && JC.isBlocked(otherUid)) return Promise.reject(new Error("you-blocked-them"));
    var chatId = JC.requestIdFor(me, otherUid);
    var reqRef = JC.db.collection("chatRequests").doc(chatId);
    return reqRef.get().then(function (snap) {
      if (snap.exists) {
        var r = snap.data();
        if (r.status === "pending" && r.fromUid === me) {
          return Promise.reject(new Error("request-already-sent"));
        }
        if (r.status === "pending" && r.fromUid !== me) {
          return Promise.reject(new Error("incoming-request-pending"));
        }
        // Declined purani request — delete kar ke nayi bhejo.
        if (r.status === "declined") return reqRef.delete();
        // Accepted lekin chat nahi — chat banao (requestOrOpenChat ye rasta
        // khud handle karta hai; yahan seedha create kar do).
        if (r.status === "accepted") return null;
      }
      return null;
    }).then(function () {
      var p = JC.userProfile || {};
      return reqRef.set({
        fromUid: me,
        toUid: otherUid,
        fromUsername: p.username || "",
        fromName: p.displayName || "",
        status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  };

  // Chat doc + dono ki userChats entries banao (agar pehle se na hon).
  // Sirf tab chalta hai jab ACCEPTED request maujood ho — rules rok deti
  // hain warna (bypass nahi).
  JC.ensureChat = function (chatId, otherUid) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    var me = JC.currentUser.uid;
    var chatRef = JC.db.collection("chats").doc(chatId);
    return chatRef.get().then(function (snap) {
      if (!snap.exists) {
        return chatRef.set({
          participants: [me, otherUid].sort(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessage: "",
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastSenderId: me
        });
      }
    }).then(function () {
      var now = firebase.firestore.FieldValue.serverTimestamp();
      var mine = JC.db.collection("userChats").doc(me).collection("list").doc(chatId)
        .set({ chatId: chatId, otherUid: otherUid, unreadCount: 0, lastMessageAt: now }, { merge: true });
      var theirs = JC.db.collection("userChats").doc(otherUid).collection("list").doc(chatId)
        .set({ chatId: chatId, otherUid: me, unreadCount: 0, lastMessageAt: now }, { merge: true });
      return Promise.all([mine, theirs]);
    });
  };

  // Accept: status -> accepted, phir chat banao aur kholo.
  JC.acceptRequest = function (requestId) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    var reqRef = JC.db.collection("chatRequests").doc(requestId);
    return reqRef.get().then(function (snap) {
      if (!snap.exists) return Promise.reject(new Error("request-not-found"));
      var r = snap.data();
      if (r.toUid !== JC.currentUser.uid) return Promise.reject(new Error("not-recipient"));
      if (r.status !== "pending") return Promise.reject(new Error("request-not-pending"));
      return reqRef.update({ status: "accepted" }).then(function () {
        return JC.ensureChat(requestId, r.fromUid);
      }).then(function () {
        JC.openChat(requestId, r.fromUid);
      });
    });
  };

  // Decline: status -> declined. Request khatam — koi chat nahi, koi message nahi.
  JC.declineRequest = function (requestId) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    return JC.db.collection("chatRequests").doc(requestId)
      .update({ status: "declined" });
  };

  // Cancel (sender apni pending request wapas le): doc delete karo.
  JC.cancelRequest = function (requestId) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    return JC.db.collection("chatRequests").doc(requestId).delete();
  };

  // ---------- requests screen + badge ----------
  var incomingUnsub = null, outgoingUnsub = null;
  var incomingCount = 0, outgoingCount = 0;

  function updateRequestsRow() {
    var row = $("requestsRow");
    var badge = $("requestsBadge");
    if (!row) return;
    if (incomingCount > 0 || outgoingCount > 0) {
      row.classList.remove("hidden");
      if (badge) {
        badge.textContent = incomingCount > 0 ? incomingCount : "";
        badge.classList.toggle("hidden", incomingCount <= 0);
      }
    } else {
      row.classList.add("hidden");
    }
  }

  function renderRequestRow(doc, dir, listEl, emptyEl) {
    var r = doc.data();
    var otherUid = dir === "in" ? r.fromUid : r.toUid;
    JC.db.collection("users").doc(otherUid).get().then(function (pSnap) {
      var p = pSnap.exists ? pSnap.data() : { displayName: "Unknown" };
      var row = document.createElement("div");
      row.className = "user-result";
      row.innerHTML =
        '<div class="avatar">' + avatarHtml(p) + '</div>' +
        '<div class="info"><div class="name">' + esc(p.displayName || "Unknown") + '</div>' +
        '<div class="gmail">' + esc(handleOf(p)) + '</div></div>';
      var btns = document.createElement("div");
      btns.className = "req-btns";
      if (dir === "in") {
        btns.innerHTML =
          '<button class="btn btn-primary" data-act="accept">Accept</button>' +
          '<button class="btn btn-ghost" data-act="decline">Decline</button>';
        btns.querySelector('[data-act="accept"]').addEventListener("click", function () {
          JC.acceptRequest(doc.id).catch(function (e) {
            JC.toast("Could not accept request: " + e.message);
          });
        });
        btns.querySelector('[data-act="decline"]').addEventListener("click", function () {
          JC.declineRequest(doc.id).then(function () {
            JC.toast("Request declined");
          }).catch(function (e) {
            JC.toast("Could not decline request: " + e.message);
          });
        });
      } else {
        btns.innerHTML =
          '<button class="btn btn-ghost" data-act="cancel">Cancel request</button>';
        btns.querySelector('[data-act="cancel"]').addEventListener("click", function () {
          JC.cancelRequest(doc.id).then(function () {
            JC.toast("Request cancelled");
          }).catch(function (e) {
            JC.toast("Could not cancel request: " + e.message);
          });
        });
      }
      row.appendChild(btns);
      listEl.appendChild(row);
      if (emptyEl) emptyEl.classList.add("hidden");
    });
  }

  JC.startRequestsListener = function () {
    if (!JC.db || !JC.currentUser) return;
    var me = JC.currentUser.uid;
    if (incomingUnsub) incomingUnsub();
    if (outgoingUnsub) outgoingUnsub();
    // Incoming pending requests (mujhe bheji gayi).
    incomingUnsub = JC.db.collection("chatRequests")
      .where("toUid", "==", me).where("status", "==", "pending")
      .onSnapshot(function (snap) {
        incomingCount = snap.size;
        updateRequestsRow();
        var list = $("incomingRequests");
        var empty = $("incomingEmpty");
        if (!list) return;
        list.innerHTML = "";
        if (snap.empty) { if (empty) empty.classList.remove("hidden"); return; }
        if (empty) empty.classList.add("hidden");
        snap.forEach(function (doc) { renderRequestRow(doc, "in", list, empty); });
      }, function () { /* badge best-effort hai; rules phir bhi enforce karti hain */ });
    // Outgoing pending requests (maine bheji).
    outgoingUnsub = JC.db.collection("chatRequests")
      .where("fromUid", "==", me).where("status", "==", "pending")
      .onSnapshot(function (snap) {
        outgoingCount = snap.size;
        updateRequestsRow();
        var list = $("sentRequests");
        var empty = $("sentEmpty");
        if (!list) return;
        list.innerHTML = "";
        if (snap.empty) { if (empty) empty.classList.remove("hidden"); return; }
        if (empty) empty.classList.add("hidden");
        snap.forEach(function (doc) { renderRequestRow(doc, "out", list, empty); });
      }, function () {});
  };

  JC.stopRequestsListener = function () {
    if (incomingUnsub) { incomingUnsub(); incomingUnsub = null; }
    if (outgoingUnsub) { outgoingUnsub(); outgoingUnsub = null; }
    incomingCount = 0; outgoingCount = 0;
    updateRequestsRow();
  };

  JC.openRequests = function () {
    if (JC.showScreen) JC.showScreen("screen-requests", { push: true });
  };

  // Sign-in par requests listener shuru karo (app.js ke onSignedIn ke sath).
  var _onSignedIn = JC.onSignedIn;
  JC.onSignedIn = function (user, profile) {
    if (_onSignedIn) _onSignedIn(user, profile);
    JC.startRequestsListener();
  };
  var _onSignedOut = JC.onSignedOut;
  JC.onSignedOut = function () {
    JC.stopRequestsListener();
    if (_onSignedOut) _onSignedOut();
  };

  // ---------- wire UI ----------
  document.addEventListener("DOMContentLoaded", function () {
    var row = $("requestsRow");
    if (row) row.addEventListener("click", function () { JC.openRequests(); });
    var back = $("btnRequestsBack");
    if (back) back.addEventListener("click", function () { JC.goBack(); });
    // Agar page load hote waqt pehle se signed in ho (listener wrapper
    // lagne se pehle auth resolve ho gaya ho) — tab bhi listener shuru karo.
    if (JC.currentUser) JC.startRequestsListener();
  });
})();
