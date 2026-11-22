// Jilan Chat v4.3 — FCM push notifications (web side).
//
// The device token comes from NATIVE Firebase (MainActivity /
// FcmService), NOT from the Firebase web Messaging SDK — the web SDK
// needs a service worker + browser notification permission, neither of
// which works inside a WebView shell. Pattern (same as BDBS v87):
//   native token -> window.__jcFcmToken(token) -> this file saves it in
//   Firestore users/{uid}.fcmTokens (array, max 5 tokens).
// The 5-minute trigger script (fcm/jilan-chat-push-trigger.py) reads
// pushEvents + fcmTokens and sends real FCM pushes via FCM REST v1.
//
// Push events written by this file:
//   message     — 1-to-1 or group message (hooks in app.js sendMessage
//                 and groups.js sendGroupMessage call JC.queuePushEvent)
//   call        — outgoing call started (this file's own Firestore
//                 listener on calls where callerUid == me; calls.js is
//                 NOT edited — startCall returns nothing, so a listener
//                 is the only clean hook)
//   call_cancel — outgoing call ended/declined/missed while it was still
//                 ringing (same listener; tells the callee's phone to
//                 stop its native bell)
// Bodies never contain CNIC, phone numbers or media URLs — only a name
// and a short text preview ("Photo" / "Video" / "Voice message" for
// media). The trigger also scrubs bodies for CNIC patterns.
//
// Ringer-mode rule (user order 2026-11-22) is enforced NATIVELY
// (FcmService): silent -> show only, vibrate -> show + vibration,
// normal -> show + bell + vibration. JC.fcmAlertForMode below is only
// the same rule as a pure function, for tests and documentation — the
// native side is authoritative.

(function () {
  var JC = window.JC = window.JC || {};
  var MAX_TOKENS = 5;
  var TOKEN_LS_KEY = "jilanchat-fcm-token";
  var pendingToken = null;
  var outgoingCallUnsub = null;
  var callAlerted = {};   // callId -> true (call pushEvent already queued)
  var firstCallSnap = true;

  // ---------- ringer-mode rule (pure mirror of FcmService, for tests) ----------
  // Returns what an incoming call should do for a ringer mode.
  JC.fcmAlertForMode = function (mode) {
    if (mode === "silent") return "show";
    if (mode === "vibrate") return "show+vibrate";
    return "show+ring+vibrate";
  };

  // ---------- token save ----------
  JC.saveFcmToken = function (token) {
    try {
      if (!token || !JC.db || !JC.currentUser) return Promise.resolve(false);
      var saved = null;
      try { saved = window.localStorage.getItem(TOKEN_LS_KEY); } catch (e) {}
      if (saved === token) return Promise.resolve(false);
      var ref = JC.db.collection("users").doc(JC.currentUser.uid);
      return ref.get().then(function (snap) {
        var toks = [];
        if (snap && snap.exists) {
          var d = snap.data() || {};
          if (d.fcmTokens && d.fcmTokens.length) toks = d.fcmTokens.slice();
        }
        if (toks.indexOf(token) >= 0) {
          try { window.localStorage.setItem(TOKEN_LS_KEY, token); } catch (e) {}
          return false;
        }
        toks.push(token);
        if (toks.length > MAX_TOKENS) toks = toks.slice(toks.length - MAX_TOKENS);
        return ref.update({ fcmTokens: toks }).then(function () {
          try { window.localStorage.setItem(TOKEN_LS_KEY, token); } catch (e) {}
          return true;
        });
      }).catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  };

  // Called by native MainActivity (deliverFcmToken / postFcmToken).
  // May arrive before sign-in — then it is held and saved on sign-in.
  window.__jcFcmToken = function (token) {
    try {
      if (!token) return;
      pendingToken = token;
      if (JC.currentUser) JC.saveFcmToken(token);
    } catch (e) {}
  };

  // ---------- push events ----------
  // Never throws, never rejects: a failed event write must never break
  // sending the message or starting the call.
  JC.queuePushEvent = function (ev) {
    try {
      if (!JC.db || !JC.currentUser || !ev) return Promise.resolve(null);
      if (["message", "call", "call_cancel"].indexOf(ev.type) < 0) {
        return Promise.resolve(null);
      }
      if (!ev.toUid || ev.toUid === JC.currentUser.uid) {
        return Promise.resolve(null);
      }
      var doc = {
        type: ev.type,
        toUid: ev.toUid,
        fromUid: JC.currentUser.uid,
        fromName: (JC.userProfile && JC.userProfile.displayName) || "",
        title: (ev.title || "").slice(0, 120),
        body: (ev.body || "").slice(0, 300),
        chatId: ev.chatId || "",
        groupId: ev.groupId || "",
        groupName: ev.groupName || "",
        callId: ev.callId || "",
        kind: ev.kind || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        sent: false
      };
      return JC.db.collection("pushEvents").add(doc).catch(function () {
        return null;
      });
    } catch (e) {
      return Promise.resolve(null);
    }
  };

  // ---------- outgoing-call listener (call + call_cancel events) ----------
  // calls.js is NOT edited: startCall returns nothing and its callId
  // lives in a closure, so this listener watches my own outgoing calls
  // instead. First snapshot is skipped (old calls must not re-ring).
  // Pure helper: which final call status should stop the callee's bell.
  JC.fcmShouldCancel = function (status) {
    return status === "ended" || status === "declined" || status === "missed"
      || status === "cancelled";
  };

  JC.startOutgoingCallListener = function () {
    if (!JC.db || !JC.currentUser || outgoingCallUnsub) return;
    firstCallSnap = true;
    outgoingCallUnsub = JC.db.collection("calls")
      // Equality filters only (served by single-field indexes, no
      // composite index needed). Only ringing calls are in the result,
      // so the snapshot stays tiny (Spark quota friendly).
      .where("callerUid", "==", JC.currentUser.uid)
      .where("status", "==", "ringing")
      .onSnapshot(function (snap) {
        if (firstCallSnap) {
          firstCallSnap = false;
          snap.forEach(function (doc) { callAlerted[doc.id] = false; });
          return;
        }
        snap.docChanges().forEach(function (ch) {
          var id = ch.doc.id;
          var d = ch.doc.data() || {};
          if (ch.type === "added" && d.status === "ringing" && !callAlerted[id]) {
            callAlerted[id] = true;
            JC.queuePushEvent({
              type: "call",
              toUid: d.calleeUid,
              callId: id,
              kind: d.kind || "voice",
              title: (JC.userProfile && JC.userProfile.displayName) || "Jilan Chat",
              body: (d.kind === "video") ? "Incoming video call…" : "Incoming voice call…"
            });
          } else if (ch.type === "removed" && callAlerted[id]) {
            // The call left the "ringing" state. Read its final status:
            // accepted -> nothing (callee answered); ended/declined/missed
            // -> call_cancel so the callee's bell stops.
            callAlerted[id] = false;
            var callee = d.calleeUid, kind = d.kind || "voice";
            ch.doc.ref.get().then(function (fresh) {
              var st = (fresh && fresh.exists && (fresh.data() || {}).status) || "ended";
              if (JC.fcmShouldCancel(st)) {
                JC.queuePushEvent({
                  type: "call_cancel",
                  toUid: callee,
                  callId: id,
                  kind: kind,
                  title: "",
                  body: ""
                });
              }
            }).catch(function () {});
          }
        });
      }, function () { /* listener errors are non-fatal; pushes just stop */ });
  };

  JC.stopOutgoingCallListener = function () {
    if (outgoingCallUnsub) {
      try { outgoingCallUnsub(); } catch (e) {}
      outgoingCallUnsub = null;
    }
    callAlerted = {};
    firstCallSnap = true;
  };

  // ---------- sign-in hook (own auth listener; auth.js has its own) ----------
  function onAuth(user) {
    if (user) {
      if (pendingToken) JC.saveFcmToken(pendingToken);
      JC.startOutgoingCallListener();
    } else {
      pendingToken = null;
      JC.stopOutgoingCallListener();
    }
  }

  function initAuthListener(tries) {
    try {
      if (window.firebase && JC.auth && JC.auth.onAuthStateChanged) {
        JC.auth.onAuthStateChanged(onAuth);
        return;
      }
    } catch (e) {}
    if (tries < 10) setTimeout(function () { initAuthListener(tries + 1); }, 500);
  }
  initAuthListener(0);
})();
