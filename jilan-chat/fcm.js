// Jilan Chat v4.12 — FCM push notifications (web side).
// v4.12 (2026-11-22, APK vc11): native FCM is back in the APK (BDBS v91
// library-R fix). Token save now runs whenever the native shell hands a
// token (independent of PUSH_ENABLED), retries until the user is signed in
// and the write lands, and keeps a visible status (JC.pushStatus()).
// Notification tap / call screen -> window.__jcPushOpen(json) opens the
// chat. PUSH_ENABLED (event writes) stays false until the VM push
// listener is running with its service-account key.
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
  // vc5 (2026-11-22): native FCM is OFF in the APK (vc4 crashed on
  // launch). No device tokens exist, so push events would go nowhere —
  // skip the writes/listener to save Spark quota. Turn back on (true)
  // only together with a launch-tested native FCM shell.
  JC.PUSH_ENABLED = true;

  // ---------- ringer-mode rule (pure mirror of FcmService, for tests) ----------
  // Returns what an incoming call should do for a ringer mode.
  JC.fcmAlertForMode = function (mode) {
    if (mode === "silent") return "show";
    if (mode === "vibrate") return "show+vibrate";
    return "show+ring+vibrate";
  };

  // ---------- token save ----------
  // Status shown by JC.pushStatus(): native shell status + token save.
  var tokenState = { saved: false, error: "", tries: 0 };
  var retryTimer = null;
  JC.pushStatus = function () {
    var nat = {};
    try { if (window.Android && window.Android.pushStatus) nat = JSON.parse(window.Android.pushStatus() || "{}"); } catch (e) {}
    return { native: nat, tokenSaved: tokenState.saved, error: tokenState.error,
      tries: tokenState.tries, pushEnabled: !!JC.PUSH_ENABLED };
  };
  // Retry the save every 5 s (max 24 tries) until signed in + written.
  function saveWithRetry(token) {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    tokenState.tries++;
    JC.saveFcmToken(token).then(function (r) {
      if (r === "retry" && tokenState.tries < 24) {
        retryTimer = setTimeout(function () { saveWithRetry(token); }, 5000);
      }
    });
  }
  JC.saveFcmToken = function (token) {
    try {
      if (!token) return Promise.resolve(false);
      if (!JC.db || !JC.currentUser) return Promise.resolve("retry");
      var saved = null;
      try { saved = window.localStorage.getItem(TOKEN_LS_KEY + ":" + JC.currentUser.uid); } catch (e) {}
      if (saved === token) { tokenState.saved = true; return Promise.resolve(false); }
      var ref = JC.db.collection("users").doc(JC.currentUser.uid);
      return ref.get().then(function (snap) {
        var toks = [];
        if (snap && snap.exists) {
          var d = snap.data() || {};
          if (d.fcmTokens && d.fcmTokens.length) toks = d.fcmTokens.slice();
        }
        if (toks.indexOf(token) >= 0) {
          try { window.localStorage.setItem(TOKEN_LS_KEY + ":" + JC.currentUser.uid, token); } catch (e) {}
          tokenState.saved = true; tokenState.error = "";
          return false;
        }
        toks.push(token);
        toks = toks.filter(function (t, i) { return toks.indexOf(t) === i; });
        if (toks.length > MAX_TOKENS) toks = toks.slice(toks.length - MAX_TOKENS);
        return ref.update({ fcmTokens: toks }).then(function () {
          try { window.localStorage.setItem(TOKEN_LS_KEY + ":" + JC.currentUser.uid, token); } catch (e) {}
          tokenState.saved = true; tokenState.error = "";
          return true;
        });
      }).catch(function (err) {
        // never swallow silently: keep the reason visible + retry
        tokenState.saved = false;
        tokenState.error = String((err && (err.code || err.message)) || err).slice(0, 120);
        try { console.warn("Jilan Chat push token save failed:", tokenState.error); } catch (e) {}
        return "retry";
      });
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
      tokenState.tries = 0;
      saveWithRetry(token);
    } catch (e) {}
  };
  // Native token error (vc11 MainActivity.reportFcmError).
  window.__jcFcmError = function (msg) {
    tokenState.error = "native: " + String(msg || "").slice(0, 120);
    try { console.warn("Jilan Chat push:", tokenState.error); } catch (e) {}
  };

  // ---------- notification tap / call screen (vc11) ----------
  // Message -> open that chat (1-to-1 or group). Call -> nothing to do:
  // calls.js already shows the incoming-call screen from Firestore.
  function openFromPush(raw, tries) {
    try {
      var o = typeof raw === "string" ? JSON.parse(raw) : (raw || {});
      if (o.type !== "message" || !o.chatId) return;
      if (!JC.currentUser || !(JC.openChat || JC.openGroupChat)) {
        if ((tries || 0) < 40) setTimeout(function () { openFromPush(o, (tries || 0) + 1); }, 500);
        return;
      }
      if (o.groupId && JC.openGroupChat) JC.openGroupChat(o.groupId);
      else if (JC.openChat) JC.openChat(o.chatId, o.fromUid || undefined);
    } catch (e) {}
  }
  window.__jcPushOpen = function (raw) { openFromPush(raw, 0); };
  if (window.__jcPendingPushOpen) {
    var pend = window.__jcPendingPushOpen; window.__jcPendingPushOpen = null;
    openFromPush(pend, 0);
  }
  if (window.__jcPendingFcmToken) {
    var pt = window.__jcPendingFcmToken; window.__jcPendingFcmToken = null;
    window.__jcFcmToken(pt);
  }

  // ---------- push events ----------
  // Never throws, never rejects: a failed event write must never break
  // sending the message or starting the call.
  JC.queuePushEvent = function (ev) {
    try {
      if (!JC.PUSH_ENABLED) return Promise.resolve(null);
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
    if (!JC.PUSH_ENABLED) return;
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
      if (pendingToken) { tokenState.tries = 0; saveWithRetry(pendingToken); }
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
