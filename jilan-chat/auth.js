// Jilan Chat v1.0 — auth.js
// ONE module owns all sign-in paths, so the parent can swap the primary
// path later without touching chat code (app.js / calls.js never call
// Firebase Auth directly — they use JC.auth and JC.currentUser).
//
// LOGIN STATE (2026-11-22):
// - Google Sign-In via the JS SDK (signInWithPopup / signInWithRedirect)
//   returns 403 disallowed_useragent inside an Android WebView. Google
//   refuses OAuth in embedded WebViews. Do NOT call it from here.
//   The "Sign in with Gmail" button stays DISABLED in index.html.
//   Workable replacements (parent decision): Chrome Custom Tabs, or
//   native Google Sign-In in the Java shell passing an ID token to
//   signInWithCredential. Both need shell work, not app work.
// - WORKING FALLBACK (shipped): email-link sign-in. The user types their
//   Gmail, taps the link Firebase emails them, and they are signed in.
//   Works fully inside the WebView, no Google button needed.

(function () {
  var cfg = window.JILAN_CHAT_FIREBASE_CONFIG;
  var ready = cfg && cfg.apiKey && cfg.apiKey !== "PLACEHOLDER";
  window.JILAN_CHAT_CONFIG_READY = !!ready;

  var JC = window.JC = window.JC || {};
  JC.configReady = !!ready;
  JC.auth = null;
  JC.db = null;
  JC.storage = null;
  JC.currentUser = null;   // firebase.User, set by onAuthStateChanged
  JC.userProfile = null;   // users/{uid} document data

  function setStatus(msg, kind) {
    var el = document.getElementById("loginStatus");
    if (!el) return;
    el.textContent = msg;
    el.className = kind || "";
  }

  if (!ready) {
    setStatus("Firebase is not connected yet — the app config is still a placeholder. Ask the developer to finish setup.", "error");
    // Keep the email-link button usable-looking but honest: it will fail
    // loudly if tapped before config exists.
  } else {
    try {
      firebase.initializeApp(cfg);
      JC.auth = firebase.auth();
      JC.db = firebase.firestore();
      JC.storage = firebase.storage();
      // Firestore offline cache survives restarts on the hosted origin.
      JC.db.enablePersistence({ synchronizeTabs: true }).catch(function () { /* cache already on, or unsupported — fine */ });
    } catch (e) {
      setStatus("Firebase failed to start: " + e.message, "error");
    }
  }

  // ---------- Google Sign-In: DISABLED (see header comment) ----------
  // Kept as a named stub so the swap-in point is obvious. Do not wire it
  // to any button until the WebView login path is fixed.
  JC.googleSignIn = function () {
    // signInWithPopup / signInWithRedirect hit 403 disallowed_useragent
    // inside the Android WebView shell. Never call them from here.
    setStatus("Google sign-in is not available inside the app yet. Use the email link below.", "error");
    return Promise.reject(new Error("google-signin-disabled-in-webview"));
  };

  // ---------- Email-link sign-in (working fallback) ----------
  JC.sendEmailLink = function (email) {
    if (!JC.auth) return Promise.reject(new Error("firebase-not-configured"));
    var settings = {
      url: window.location.href.split("#")[0].split("?")[0],
      handleCodeInApp: true
    };
    return JC.auth.sendSignInLinkToEmail(email, settings).then(function () {
      try { window.localStorage.setItem("jilanchat-email", email); } catch (e) {}
    });
  };

  JC.finishEmailLinkSignIn = function () {
    if (!JC.auth) return;
    if (!JC.auth.isSignInWithEmailLink(window.location.href)) return;
    var email = null;
    try { email = window.localStorage.getItem("jilanchat-email"); } catch (e) {}
    if (!email) {
      email = window.prompt("Type the Gmail you used for the sign-in link:");
      if (!email) return;
    }
    JC.auth.signInWithEmailLink(email, window.location.href).then(function () {
      try { window.localStorage.removeItem("jilanchat-email"); } catch (e) {}
      window.history.replaceState(null, "", window.location.pathname);
    }).catch(function (e) {
      setStatus("Sign-in link failed: " + e.message, "error");
    });
  };

  JC.signOut = function () {
    if (JC.currentUser) JC.setPresence(false);
    if (JC.auth) return JC.auth.signOut();
    return Promise.resolve();
  };

  // ---------- user profile document (users/{uid}) ----------
  JC.ensureUserDoc = function (user) {
    if (!JC.db) return Promise.resolve(null);
    var ref = JC.db.collection("users").doc(user.uid);
    return ref.get().then(function (snap) {
      var gmail = (user.email || "").toLowerCase();
      var name = user.displayName || gmail.split("@")[0] || "Jilan Chat user";
      if (!snap.exists) {
        var data = {
          gmail: gmail,
          displayName: name,
          photoURL: user.photoURL || "",
          online: true,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        return ref.set(data).then(function () { return data; });
      }
      var d = snap.data() || {};
      // Fill in a missing gmail (email-link sign-in always has one).
      if (!d.gmail && gmail) return ref.update({ gmail: gmail }).then(function () { d.gmail = gmail; return d; });
      return d;
    });
  };

  // ---------- presence: online=true while open, lastSeen on close ----------
  JC.setPresence = function (online) {
    if (!JC.db || !JC.currentUser) return;
    var ref = JC.db.collection("users").doc(JC.currentUser.uid);
    var data = online
      ? { online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp() }
      : { online: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp() };
    ref.update(data).catch(function () { /* profile may not exist yet */ });
  };

  // ---------- wire the login screen ----------
  document.addEventListener("DOMContentLoaded", function () {
    var btnLink = document.getElementById("btnEmailLink");
    var note = document.getElementById("emailLinkNote");
    if (btnLink) {
      btnLink.addEventListener("click", function () {
        var email = (document.getElementById("emailInput").value || "").trim().toLowerCase();
        if (!email || email.indexOf("@") < 0) {
          if (note) note.textContent = "Type a valid Gmail address first.";
          return;
        }
        if (!JC.configReady) {
          if (note) note.textContent = "Firebase is not connected yet — the link cannot be sent until setup is finished.";
          return;
        }
        btnLink.disabled = true;
        JC.sendEmailLink(email).then(function () {
          if (note) note.textContent = "Link sent to " + email + ". Open your Gmail and tap the link to sign in.";
          setStatus("Sign-in link sent. Check your Gmail.", "ok");
        }).catch(function (e) {
          if (note) note.textContent = "Could not send the link: " + e.message;
          btnLink.disabled = false;
        });
      });
    }

    // If the user just tapped the email link, finish sign-in now.
    JC.finishEmailLinkSignIn();

    if (JC.auth) {
      JC.auth.onAuthStateChanged(function (user) {
        JC.currentUser = user;
        if (user) {
          JC.ensureUserDoc(user).then(function (profile) {
            JC.userProfile = profile;
            JC.setPresence(true);
            if (window.JC && JC.onSignedIn) JC.onSignedIn(user, profile);
          });
        } else {
          JC.userProfile = null;
          if (window.JC && JC.onSignedOut) JC.onSignedOut();
        }
      });
    }

    // Presence: mark offline when the app is hidden/closed.
    document.addEventListener("visibilitychange", function () {
      if (!JC.currentUser) return;
      JC.setPresence(!document.hidden);
    });
    window.addEventListener("beforeunload", function () { JC.setPresence(false); });
  });
})();
