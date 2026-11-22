// Jilan Chat v3.0 — auth.js
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
// - USERNAME LOGIN (v3, 2026-11-22): username + password via Firebase
//   Email/Password auth on pseudo-email username@jilanchat.local (see
//   JC.usernameLogin / JC.usernameSignup below). Gmail is NOT needed.
//   Username is PERMANENT (never changes); display name is separate and
//   can change any time. Reserved usernames live in JC.RESERVED_USERNAMES.

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

  // ---------- Username + password sign-in (v3, 2026-11-22) ----------
  // Dehati doston ko Gmail yaad nahi rehti, is liye username login bhi
  // hai — Gmail wala rasta bhi rehta hai, dono options hain.
  // Username Firebase Email/Password auth se chalta hai, pseudo-email
  // username@jilanchat.local par. Asli Gmail kabhi nahi mangi jati.
  // Username PERMANENT hai: aik dafa banne ke baad change nahi hota
  // (display name alag hai — wo jab chahe badal sakta hai).
  var USERNAME_DOMAIN = "@jilanchat.local";
  // Reserved usernames — aik hi jagah (is list me) rakhe hain taake baad
  // me naam add karna asaan ho. Ye naam koi user nahi le sakta, taake
  // koi Dr Asif ya app ki naqal na kar sake. Rules me bhi yehi list hai.
  JC.RESERVED_USERNAMES = ["drasif", "asif", "dr_asif", "mohammadasif", "jilan", "jilanchat", "jilanapps", "jilanappofficial", "admin", "support", "official", "system", "owner", "help"];

  // Lowercase kar do — "Asif" aur "asif" do alag log na ban sakein.
  JC.normalizeUsername = function (raw) {
    return String(raw == null ? "" : raw).trim().toLowerCase();
  };

  JC.validateUsername = function (raw) {
    var u = JC.normalizeUsername(raw);
    if (!u) return { ok: false, error: "Username likhein." };
    if (u.length < 3) return { ok: false, error: "Username kam se kam 3 haroof ka ho." };
    if (u.length > 20) return { ok: false, error: "Username zyada se zyada 20 haroof ka ho." };
    if (!/^[a-z0-9_]+$/.test(u)) return { ok: false, error: "Username me sirf chhote haroof (a-z), number aur _ chalenge." };
    if (JC.RESERVED_USERNAMES.indexOf(u) >= 0) return { ok: false, error: "Ye username nahi le sakte — koi aur chunain." };
    return { ok: true, username: u };
  };

  JC.usernameToEmail = function (username) {
    return JC.normalizeUsername(username) + USERNAME_DOMAIN;
  };
  JC.isUsernameEmail = function (email) {
    return String(email || "").toLowerCase().indexOf(USERNAME_DOMAIN) > 0;
  };
  JC.usernameFromEmail = function (email) {
    var e = String(email || "").toLowerCase();
    return JC.isUsernameEmail(e) ? e.split("@")[0] : "";
  };

  // Username available hai ya pehle se liya gaya? usernames/{username}
  // claim doc public read hai (rules dekho) — signup se pehle bhi parha
  // ja sakta hai, kyunke username khud public cheez hai.
  JC.checkUsernameAvailable = function (username) {
    if (!JC.db) return Promise.reject(new Error("firebase-not-configured"));
    return JC.db.collection("usernames").doc(username).get().then(function (snap) {
      return !snap.exists;
    });
  };

  JC.usernameLogin = function (username, password) {
    if (!JC.auth) return Promise.reject(new Error("firebase-not-configured"));
    var v = JC.validateUsername(username);
    if (!v.ok) return Promise.reject(new Error(v.error));
    if (!password) return Promise.reject(new Error("Password likhein."));
    return JC.auth.signInWithEmailAndPassword(JC.usernameToEmail(v.username), password)
      .catch(function (e) {
        if (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
          throw new Error("Username ya password ghalat hai.");
        }
        if (e.code === "auth/operation-not-allowed") {
          throw new Error("Username login abhi on nahi hai — admin se rabta karein.");
        }
        throw e;
      });
  };

  JC.usernameSignup = function (username, password, displayName) {
    if (!JC.auth) return Promise.reject(new Error("firebase-not-configured"));
    var v = JC.validateUsername(username);
    if (!v.ok) return Promise.reject(new Error(v.error));
    if (!password || password.length < 6) return Promise.reject(new Error("Password kam se kam 6 haroof ka ho."));
    var name = String(displayName || "").trim() || v.username;
    var email = JC.usernameToEmail(v.username);
    return JC.checkUsernameAvailable(v.username).then(function (free) {
      if (!free) throw new Error("Ye username pehle se liya gaya hai — koi aur chunain.");
      return JC.auth.createUserWithEmailAndPassword(email, password);
    }).then(function (cred) {
      var user = cred.user;
      return user.updateProfile({ displayName: name }).catch(function () {}).then(function () {
        // Username claim likho — is se uniqueness pakki hoti hai (rules:
        // claim sirf tab bane jab doc maujood na ho aur uid match kare).
        // Agar claim likhna fail bhi ho jaye to account phir bhi chalta
        // hai: pseudo-email khud unique hai, dobara wohi username lene
        // par createUser "email already in use" dega.
        return JC.db.collection("usernames").doc(v.username).set({
          uid: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function () {});
      }).then(function () {
        return JC.ensureUserDoc(user);
      });
    }).catch(function (e) {
      if (e.code === "auth/email-already-in-use") {
        throw new Error("Ye username pehle se liya gaya hai — koi aur chunain.");
      }
      throw e;
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
      var email = (user.email || "").toLowerCase();
      // Username login wale user ki asli Gmail nahi hoti — pseudo-email
      // se username nikalo, gmail khaali rakho. Username hi pehchan hai.
      var username = JC.usernameFromEmail ? JC.usernameFromEmail(email) : "";
      var gmail = username ? "" : email;
      var name = user.displayName || username || gmail.split("@")[0] || "Jilan Chat user";
      if (!snap.exists) {
        var data = {
          gmail: gmail,
          displayName: name,
          photoURL: user.photoURL || "",
          online: true,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (username) data.username = username;
        return ref.set(data).then(function () { return data; });
      }
      var d = snap.data() || {};
      // Fill in a missing gmail (email-link sign-in always has one).
      if (!d.gmail && gmail) return ref.update({ gmail: gmail }).then(function () { d.gmail = gmail; return d; });
      // Purane username account par username field bhar do (agar khaali ho).
      if (username && !d.username) return ref.update({ username: username }).then(function () { d.username = username; return d; });
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

    // ---------- Username + password login / signup (v3) ----------
    var btnUserLogin = document.getElementById("btnUsernameLogin");
    var userLoginNote = document.getElementById("usernameLoginNote");
    if (btnUserLogin) {
      btnUserLogin.addEventListener("click", function () {
        var u = (document.getElementById("usernameInput").value || "");
        var pw = (document.getElementById("usernamePasswordInput").value || "");
        if (!JC.configReady) {
          if (userLoginNote) userLoginNote.textContent = "Firebase is not connected yet.";
          return;
        }
        btnUserLogin.disabled = true;
        JC.usernameLogin(u, pw).then(function () {
          // Success: onAuthStateChanged takes over.
        }).catch(function (e) {
          if (userLoginNote) userLoginNote.textContent = e.message;
          btnUserLogin.disabled = false;
        });
      });
    }

    var btnSignup = document.getElementById("btnSignup");
    var signupNote = document.getElementById("signupNote");
    if (btnSignup) {
      btnSignup.addEventListener("click", function () {
        var name = (document.getElementById("signupNameInput").value || "");
        var u = (document.getElementById("signupUsernameInput").value || "");
        var pw = (document.getElementById("signupPasswordInput").value || "");
        if (!JC.configReady) {
          if (signupNote) signupNote.textContent = "Firebase is not connected yet.";
          return;
        }
        btnSignup.disabled = true;
        JC.usernameSignup(u, pw, name).then(function () {
          if (signupNote) signupNote.textContent = "Account ban gaya — aap sign in ho gaye hain.";
          // Success: onAuthStateChanged takes over.
        }).catch(function (e) {
          if (signupNote) signupNote.textContent = e.message;
          btnSignup.disabled = false;
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
