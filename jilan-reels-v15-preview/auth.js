/* Jilan Reels v1.0 — auth.js
 * Firebase start-up + sign-in.
 *  - Username + password: Firebase Email/Password with the pseudo-email
 *    <username>@jilanreels.local (no real email is asked or sent).
 *  - Google: inside the Android app the JS SDK popup is blocked by Google
 *    (403 disallowed_useragent in WebView), so we do MANUAL OAuth in the
 *    system browser: accounts.google.com -> oauth-return.html ->
 *    jilanreels://auth#id_token=... -> window.__jilanreelsGoogleReturn().
 *    In a normal browser we use signInWithPopup.
 * Exposes window.JRAuth.
 */
(function () {
  'use strict';
  var L = window.JRLib;
  var cfg = window.JR_FIREBASE_CONFIG || {};
  var A = window.JRAuth = {
    ready: false, auth: null, db: null, user: null, error: '',
    listeners: []
  };
  var placeholder = function (v) { return !v || String(v).indexOf('PLACEHOLDER') >= 0; };

  if (placeholder(cfg.apiKey) || placeholder(cfg.projectId)) {
    A.error = "Setup isn't finished yet (Firebase config missing).";
  } else {
    try {
      firebase.initializeApp(cfg);
      A.auth = firebase.auth();
      A.db = firebase.firestore();
      try { A.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {}); } catch (e) {}
      A.ready = true;
    } catch (e) { A.error = 'Firebase failed to start: ' + e.message; }
  }

  A.isShell = function () {
    return !!(window.Android && (typeof window.Android.shareText === 'function' || typeof window.Android.shareText === 'object'))
      || /JilanReelsShell/.test(navigator.userAgent || '');
  };
  // If the first auth state already arrived (fast cached sign-in), replay it
  // to late listeners so the app never waits forever.
  A.known = false;
  A.onChange = function (fn) {
    A.listeners.push(fn);
    if (A.known) setTimeout(function () { try { fn(A.user); } catch (e) { console.error(e); } }, 0);
  };
  if (A.ready) {
    A.auth.onAuthStateChanged(function (u) {
      A.user = u || null; A.known = true;
      A.listeners.forEach(function (fn) { try { fn(A.user); } catch (e) { console.error(e); } });
    });
  }

  function friendly(e) {
    var c = (e && e.code) || '';
    if (c === 'auth/email-already-in-use') return 'This username is already taken.';
    if (c === 'auth/user-not-found' || c === 'auth/wrong-password' || c === 'auth/invalid-credential' || c === 'auth/invalid-login-credentials') return 'Wrong username or password.';
    if (c === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (c === 'auth/too-many-requests') return 'Too many tries. Please wait a few minutes.';
    if (c === 'auth/network-request-failed') return 'No internet connection.';
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return 'Sign-in was cancelled.';
    if (c === 'auth/requires-recent-login') return 'Please log out, log in again, then try once more.';
    return (e && e.message) ? e.message.replace(/^Firebase:\s*/, '') : 'Something went wrong.';
  }
  A.friendly = friendly;

  function need() { if (!A.ready) throw new Error(A.error || 'Not ready'); }

  // Username accounts. The profile + username claim are written by JRApi
  // right after the auth account exists.
  A.signUp = function (username, password) {
    need();
    var v = L.validateUsername(username);
    if (!v.ok) return Promise.reject(new Error(v.error));
    if (String(password || '').length < 6) return Promise.reject(new Error('Password must be at least 6 characters.'));
    return A.db.collection('usernames').doc(v.username).get().then(function (d) {
      if (d.exists) throw new Error('This username is already taken.');
      return A.auth.createUserWithEmailAndPassword(L.usernameToEmail(v.username), password);
    }).catch(function (e) { throw new Error(e.code ? friendly(e) : e.message); });
  };
  A.signIn = function (username, password) {
    need();
    var u = L.normalizeUsername(username);
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return Promise.reject(new Error('Enter your username (letters, numbers, _).'));
    return A.auth.signInWithEmailAndPassword(L.usernameToEmail(u), password)
      .catch(function (e) { throw new Error(friendly(e)); });
  };
  A.signOut = function () { return A.ready ? A.auth.signOut() : Promise.resolve(); };

  /* ---------- Google ---------- */
  var STATE_KEY = 'jilanreels-google-state';
  A.redirectUri = function () { return (window.JR_HOME_URL || '').replace(/\/?$/, '/') + 'oauth-return.html'; };
  function randomToken() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', out = '';
    var bytes = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var j = 0; j < 32; j++) bytes[j] = Math.floor(Math.random() * 256);
    for (var i = 0; i < bytes.length; i++) out += chars.charAt(bytes[i] % chars.length);
    return out;
  }
  A.buildGoogleOAuthUrl = function (state, nonce) {
    return 'https://accounts.google.com/o/oauth2/v2/auth'
      + '?client_id=' + encodeURIComponent(window.JR_GOOGLE_CLIENT_ID || '')
      + '&redirect_uri=' + encodeURIComponent(A.redirectUri())
      + '&response_type=id_token'
      + '&scope=' + encodeURIComponent('openid email profile')
      + '&state=' + encodeURIComponent(state)
      + '&nonce=' + encodeURIComponent(nonce)
      + '&prompt=select_account';
  };
  A.googleSignIn = function () {
    need();
    if (!A.isShell()) {
      var p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      return A.auth.signInWithPopup(p).catch(function (e) { throw new Error(friendly(e)); });
    }
    if (placeholder(window.JR_GOOGLE_CLIENT_ID)) {
      return Promise.reject(new Error("Google sign-in isn't ready in the app yet. Please use username and password."));
    }
    var state = randomToken(), nonce = randomToken();
    try { localStorage.setItem(STATE_KEY, state); } catch (e) {}
    // The Android shell opens accounts.google.com in the system browser.
    window.location.href = A.buildGoogleOAuthUrl(state, nonce);
    return new Promise(function () {}); // finishes via __jilanreelsGoogleReturn
  };
  A.parseReturn = function (uri) {
    var frag = String(uri || '');
    var i = frag.indexOf('#'); frag = i >= 0 ? frag.slice(i + 1) : '';
    var out = {};
    frag.split('&').forEach(function (kv) {
      if (!kv) return;
      var j = kv.indexOf('='), k = j >= 0 ? kv.slice(0, j) : kv, v = j >= 0 ? kv.slice(j + 1) : '';
      try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) {}
    });
    return out;
  };
  // Called by the Android shell with "jilanreels://auth#id_token=...&state=..."
  window.__jilanreelsGoogleReturn = function (uri) {
    var report = function (msg) { if (A.onGoogleError) A.onGoogleError(msg); };
    try {
      var p = A.parseReturn(uri);
      if (p.error) { report(p.error === 'access_denied' ? 'Sign-in was cancelled.' : 'Google sign-in failed (' + p.error + ').'); return; }
      if (!p.id_token) { report('No sign-in token from Google. Please try again.'); return; }
      var stored = null;
      try { stored = localStorage.getItem(STATE_KEY); localStorage.removeItem(STATE_KEY); } catch (e) {}
      if (!stored || p.state !== stored) { report('Sign-in check failed. Please try again.'); return; }
      if (!A.ready) { report(A.error); return; }
      A.auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(p.id_token))
        .catch(function (e) { report(friendly(e)); });
    } catch (e) { report('Google sign-in had a problem. Please try again.'); }
  };
})();
