// Jilan Chat v1.0 — auth.js
// ONE module owns all sign-in paths, so the parent can swap the primary
// path later without touching chat code (app.js / calls.js never call
// Firebase Auth directly — they use JC.auth and JC.currentUser).
//
// LOGIN STATE (2026-11-22, v2):
// - Google Sign-In via the JS SDK (signInWithPopup / signInWithRedirect)
//   returns 403 disallowed_useragent inside an Android WebView. Google
//   refuses OAuth in embedded WebViews. Do NOT call it from here.
// - WORKING PATH (v2): MANUAL OAuth in the system browser. JC.googleSignIn
//   builds the accounts.google.com OAuth URL (response_type=id_token,
//   prompt=select_account so the Gmail chooser always opens) and navigates
//   to it; the Android shell intercepts that navigation and opens the
//   system browser. Google redirects to the hosted oauth-return.html,
//   which forwards the fragment to the app via jilanchat://auth#... and
//   the shell calls window.__jilanchatGoogleReturn(uri). The id_token is
//   then exchanged with signInWithCredential(GoogleAuthProvider.credential).
//   NOTE: the redirect URI https://jilanapps.github.io/jilan-store/
//   jilan-chat/oauth-return.html must be registered in the Google Cloud
//   Console for the Web OAuth client before this works on a phone.
// - WORKING FALLBACK: email-link sign-in (unchanged below). The user types
//   their Gmail, taps the link Firebase emails them, and they are signed in.

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

  // ---------- Google Sign-In: MANUAL OAuth via system browser (v2) ----------
  // The JS SDK is unusable inside the WebView (403 disallowed_useragent),
  // so the flow is: build the OAuth URL -> shell opens it in the external
  // browser -> Google returns to oauth-return.html -> the app is reopened
  // via jilanchat://auth#id_token=...&state=... -> __jilanchatGoogleReturn
  // below verifies state and signs in with the ID token credential.
  var GOOGLE_CLIENT_ID = "442847596741-97cebkonkpjhrt68nec8g58eqeujf13m.apps.googleusercontent.com";
  var GOOGLE_REDIRECT_URI = "https://jilanapps.github.io/jilan-store/jilan-chat/oauth-return.html";
  var GOOGLE_STATE_KEY = "jilanchat-google-state";

  function randomToken() {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var out = "";
    try {
      var bytes = new Uint8Array(32);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(bytes);
        for (var i = 0; i < bytes.length; i++) out += chars.charAt(bytes[i] % chars.length);
        return out;
      }
    } catch (e) {}
    for (var j = 0; j < 32; j++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  }

  JC.buildGoogleOAuthUrl = function (state, nonce) {
    return "https://accounts.google.com/o/oauth2/v2/auth"
      + "?client_id=" + encodeURIComponent(GOOGLE_CLIENT_ID)
      + "&redirect_uri=" + encodeURIComponent(GOOGLE_REDIRECT_URI)
      + "&response_type=id_token"
      + "&scope=" + encodeURIComponent("openid email profile")
      + "&state=" + encodeURIComponent(state)
      + "&nonce=" + encodeURIComponent(nonce)
      + "&prompt=select_account";
  };

  JC.googleSignIn = function () {
    if (!JC.configReady || !JC.auth) {
      setStatus("Firebase is not connected yet — Google sign-in cannot start.", "error");
      return Promise.reject(new Error("firebase-not-configured"));
    }
    var state = randomToken();
    var nonce = randomToken();
    try { window.localStorage.setItem(GOOGLE_STATE_KEY, state); } catch (e) {}
    // The shell intercepts this navigation (accounts.google.com) and
    // opens it in the external browser. In a plain browser it just loads.
    window.location.href = JC.buildGoogleOAuthUrl(state, nonce);
    return Promise.resolve();
  };

  // Called by the Android shell when the custom-scheme redirect returns
  // (jilanchat://auth#id_token=...&state=... or #error=access_denied).
  // Never crashes: every failure path only shows a message via setStatus.
  window.__jilanchatGoogleReturn = function (uri) {
    try {
      var hash = "";
      var hashIdx = (uri || "").indexOf("#");
      if (hashIdx >= 0) hash = uri.substring(hashIdx + 1);
      var params = {};
      hash.split("&").forEach(function (pair) {
        var eq = pair.indexOf("=");
        if (eq > 0) {
          try { params[pair.substring(0, eq)] = decodeURIComponent(pair.substring(eq + 1)); } catch (e) {}
        }
      });
      var storedState = null;
      try { storedState = window.localStorage.getItem(GOOGLE_STATE_KEY); } catch (e) {}
      try { window.localStorage.removeItem(GOOGLE_STATE_KEY); } catch (e) {}

      if (params.error) {
        if (params.error === "access_denied") {
          setStatus("Sign-in cancel ho gaya — dobara try karein ya email link use karein.", "error");
        } else {
          setStatus("Google sign-in fail ho gaya (" + params.error + ") — dobara try karein ya email link use karein.", "error");
        }
        return;
      }
      if (!params.id_token) {
        setStatus("Google se sign-in token nahi mila — dobara try karein ya email link use karein.", "error");
        return;
      }
      if (!storedState || !params.state || params.state !== storedState) {
        setStatus("Sign-in verify nahi hua (state mismatch) — dobara try karein.", "error");
        return;
      }
      if (!JC.auth) {
        setStatus("Firebase is not connected yet.", "error");
        return;
      }
      var credential = firebase.auth.GoogleAuthProvider.credential(params.id_token);
      JC.auth.signInWithCredential(credential).catch(function (e) {
        setStatus("Google sign-in fail ho gaya: " + e.message, "error");
      });
      // On success the onAuthStateChanged listener below takes over.
    } catch (e) {
      setStatus("Google sign-in me masla aa gaya — dobara try karein ya email link use karein.", "error");
    }
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
    var btnGoogle = document.getElementById("btnGoogle");
    if (btnGoogle) {
      btnGoogle.addEventListener("click", function () {
        if (!JC.configReady) {
          setStatus("Firebase is not connected yet — Google sign-in cannot start.", "error");
          return;
        }
        btnGoogle.disabled = true;
        JC.googleSignIn().catch(function () { btnGoogle.disabled = false; });
        // Re-enable after a while in case the user comes back without
        // signing in (e.g. pressed Back in the browser).
        setTimeout(function () { btnGoogle.disabled = false; }, 5000);
      });
    }

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
