// Jilan Chat — nearby.js (Bluetooth Nearby chat, web UI)
// Bina net ke paas khare phones (~10 meter) seedha Bluetooth se chat.
// NATIVE bridge (vc3 shell, MainActivity JsBridge) se chalti hai:
//   Android.nearbySupported / nearbyIsConnected / nearbyState (JSON string)
//   Android.nearbyStart(displayName) / nearbyScan / nearbyConnect(address)
//   Android.nearbySend(text) / nearbyStop / nearbyDisconnect
// Events native se aate hain (window.__jcNearbyDevices / __jcNearbyMessage /
// __jcNearbyStatus) — ye file un ko define karti hai.
// NO Firebase yahan: Nearby messages Firestore par NAHI jate, history
// save NAHI hoti — sirf is session ki list, screen band hote hi khatam.
// Browser me bridge nahi hota (window.Android nahi) — tab screen saaf
// batati hai ke Nearby sirf Jilan Chat app me chalta hai, crash nahi hoti.
// LIMITS (sach): sirf text; ~10m range; aik waqt me aik peer (1-to-1);
// dono phones par app khuli ho aur Nearby screen par hon — app band ho to
// message nahi jaye ga; Android 12+ par Bluetooth permissions chahiye.

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
  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }

  // ---------- bridge detection (pure, testable) ----------
  // Sirf tab bridge mana jata hai jab nearbySupported function maujood ho.
  // Browser me window.Android nahi hota — tab null milta hai.
  JC.nearbyBridge = function () {
    try {
      var b = (typeof window !== "undefined") ? window.Android : null;
      if (b && typeof b.nearbySupported === "function") return b;
      return null;
    } catch (e) { return null; }
  };
  JC.nearbyIsAvailable = function () { return !!JC.nearbyBridge(); };

  // ---------- pure decision helpers (unit-testable, no bridge/DOM) ----------
  var STATUS_TEXT = {
    not_supported: "Bluetooth is not supported on this phone.",
    bluetooth_off: "Bluetooth is off. Turn Bluetooth on and try again.",
    permission_denied: "Bluetooth permission denied. Allow Bluetooth permission in the app settings and try again.",
    idle: "Nearby is off.",
    listening: "You are visible to nearby phones. Waiting for someone to connect…",
    scanning: "Searching for nearby phones…",
    scan_done: "Search finished. Tap a phone to connect.",
    connecting: "Connecting…",
    connected: "Connected.",
    disconnected: "Disconnected.",
    error: "Something went wrong. Try again."
  };
  // state + peerName -> friendly status line.
  JC.nearbyStatusText = function (state, peerName) {
    if (state === "connected") {
      return peerName ? "Connected to " + peerName + "." : "Connected.";
    }
    return STATUS_TEXT[state] || "Nearby is off.";
  };
  // Send sirf tab jab connected ho — warna native khamoshi se ignore kare ga.
  JC.nearbyCanSend = function (state) { return state === "connected"; };
  // Device list saaf karo: khaali address hatao, address se dedupe karo,
  // naam na ho to "Bluetooth device". Native kabhi kabhi aik hi device
  // do dafa bhejta hai (paired + found) — yahan aik hi rehta hai.
  JC.nearbySanitizeDevices = function (list) {
    var out = [], seen = {};
    (list || []).forEach(function (d) {
      if (!d || !d.address) return;
      var addr = String(d.address);
      if (seen[addr]) return;
      seen[addr] = true;
      var name = (d.name && String(d.name).trim()) ? String(d.name) : "Bluetooth device";
      out.push({ address: addr, name: name });
    });
    return out;
  };
  // Apna naam (hello me dusre phone ko jata hai): profile se, warna fallback.
  JC.nearbyDisplayName = function () {
    var p = JC.userProfile || {};
    var n = (p.displayName && String(p.displayName).trim())
      || (JC.currentUser && JC.currentUser.displayName && String(JC.currentUser.displayName).trim());
    return n || "Jilan Chat user";
  };

  // ---------- session state (sirf is session ki, kahi save nahi hoti) ----------
  JC.nearbyState = "idle";      // native states me se aik
  JC.nearbyPeer = "";           // connected peer ka naam
  JC.nearbyDevices = [];        // sanitize ki hui device list
  JC.nearbyMessages = [];       // { from: "me" | peerName, text, time }
  JC.nearbyStarted = false;     // screen khuli hai ya nahi (toast ke liye)

  function setState(state, peerName) {
    JC.nearbyState = state || "idle";
    if (JC.nearbyState === "connected") {
      if (peerName) JC.nearbyPeer = String(peerName);
    } else {
      JC.nearbyPeer = "";
    }
    renderNearby();
  }

  // ---------- native callbacks (window par — native evaluateJavascript se bulata hai) ----------
  JC.nearbyOnDevices = function (devices) {
    JC.nearbyDevices = JC.nearbySanitizeDevices(devices);
    renderDevices();
  };
  JC.nearbyOnMessage = function (fromName, text) {
    if (text == null || String(text).trim() === "") return;
    JC.nearbyMessages.push({ from: fromName || "Nearby phone", text: String(text), time: new Date() });
    renderMessages();
    // Screen khuli nahi hai (user kahin aur hai) to toast se batado.
    var screen = $("screen-nearby");
    if (!screen || !screen.classList.contains("active")) {
      if (JC.toast) JC.toast("Nearby message from " + (fromName || "nearby phone"));
    }
  };
  JC.nearbyOnStatus = function (state, peerName) {
    var prev = JC.nearbyState;
    setState(state, peerName);
    if (state === "connected" && prev !== "connected") {
      if (JC.toast) JC.toast("Connected to " + (peerName || "nearby phone"));
    } else if (state === "disconnected" && prev === "connected") {
      if (JC.toast) JC.toast("Disconnected.");
    } else if (state === "permission_denied") {
      if (JC.toast) JC.toast("Bluetooth permission denied. Allow it in the app settings and try again.");
    } else if (state === "bluetooth_off") {
      if (JC.toast) JC.toast("Bluetooth is off. Turn Bluetooth on and try again.");
    } else if (state === "not_supported") {
      if (JC.toast) JC.toast("Bluetooth is not supported on this phone.");
    }
  };
  window.__jcNearbyDevices = function (devices) { JC.nearbyOnDevices(devices); };
  window.__jcNearbyMessage = function (fromName, text) { JC.nearbyOnMessage(fromName, text); };
  window.__jcNearbyStatus = function (state, peerName) { JC.nearbyOnStatus(state, peerName); };

  // ---------- actions (bridge calls — browser me khamoshi se mana) ----------
  function bridgeOrWarn() {
    var b = JC.nearbyBridge();
    if (!b) {
      if (JC.toast) JC.toast("Nearby chat sirf Jilan Chat app me chalta hai.");
      return null;
    }
    return b;
  }
  JC.nearbyStart = function () {
    var b = bridgeOrWarn();
    if (!b) return;
    try { b.nearbyStart(JC.nearbyDisplayName()); } catch (e) {}
    if (JC.toast) JC.toast("Allow dabayein — discoverable dialog aayega, taake dusra phone aap ko dhoond sake.");
  };
  JC.nearbyScan = function () {
    var b = bridgeOrWarn();
    if (!b) return;
    try { b.nearbyScan(); } catch (e) {}
  };
  JC.nearbyConnect = function (address) {
    var b = bridgeOrWarn();
    if (!b || !address) return;
    try { b.nearbyConnect(String(address)); } catch (e) {}
  };
  JC.nearbySend = function (text) {
    var t = String(text == null ? "" : text).trim();
    if (!t) return false;
    if (!JC.nearbyCanSend(JC.nearbyState)) {
      if (JC.toast) JC.toast("Pehle kisi nearby phone se connect karein.");
      return false;
    }
    var b = bridgeOrWarn();
    if (!b) return false;
    try { b.nearbySend(t); } catch (e) { return false; }
    // Native apna message wapas nahi bhejta — khud ki bubble yahan lagao.
    JC.nearbyMessages.push({ from: "me", text: t, time: new Date() });
    renderMessages();
    return true;
  };
  JC.nearbyStop = function () {
    var b = JC.nearbyBridge();
    if (b) { try { b.nearbyStop(); } catch (e) {} }
    JC.nearbyMessages = [];
    JC.nearbyDevices = [];
    setState("idle", "");
  };
  JC.nearbyDisconnect = function () {
    var b = JC.nearbyBridge();
    if (b) { try { b.nearbyDisconnect(); } catch (e) {} }
    setState("disconnected", "");
  };
  // Screen chhorna = session khatam: bridge band, messages/devices saaf.
  JC.nearbyLeave = function () {
    var b = JC.nearbyBridge();
    if (b) { try { b.nearbyStop(); } catch (e) {} }
    JC.nearbyMessages = [];
    JC.nearbyDevices = [];
    JC.nearbyState = "idle";
    JC.nearbyPeer = "";
    JC.nearbyStarted = false;
    if (JC.showScreen) JC.showScreen("screen-list");
  };

  // ---------- open / render ----------
  JC.openNearby = function () {
    JC.nearbyStarted = true;
    var b = JC.nearbyBridge();
    var onlyBox = $("nearbyAppOnly");
    var actions = $("nearbyActions");
    var composer = $("nearbyComposer");
    if (!b) {
      // Browser: sirf message dikhao, buttons/composer chhupao.
      if (onlyBox) onlyBox.classList.remove("hidden");
      if (actions) actions.classList.add("hidden");
      if (composer) composer.classList.add("hidden");
      setState("idle", "");
    } else {
      if (onlyBox) onlyBox.classList.add("hidden");
      if (actions) actions.classList.remove("hidden");
      if (composer) composer.classList.remove("hidden");
      // Native ki asal state se sync karo (screen dobara khuli ho to).
      try {
        var s = b.nearbyState ? b.nearbyState() : null;
        if (s) {
          var j = JSON.parse(s);
          setState(j.state || "idle", j.peerName || "");
          if (j.supported === false) setState("not_supported", "");
        }
      } catch (e) { /* native state na mile to idle hi rahe */ }
    }
    renderNearby();
    if (JC.showScreen) JC.showScreen("screen-nearby");
  };

  function renderNearby() {
    var st = $("nearbyStatus");
    if (st) st.textContent = JC.nearbyStatusText(JC.nearbyState, JC.nearbyPeer);
    var startBtn = $("btnNearbyStart"), scanBtn = $("btnNearbyScan"),
        stopBtn = $("btnNearbyStop"), discBtn = $("btnNearbyDisconnect"),
        sendBtn = $("btnNearbySend"), input = $("nearbyInput");
    var connected = JC.nearbyState === "connected";
    var busy = JC.nearbyState === "listening" || JC.nearbyState === "scanning"
      || JC.nearbyState === "connecting" || connected;
    var bridge = JC.nearbyIsAvailable();
    if (startBtn) startBtn.classList.toggle("hidden", !bridge || busy);
    if (scanBtn) scanBtn.classList.toggle("hidden", !bridge || connected);
    if (stopBtn) stopBtn.classList.toggle("hidden", !bridge || !busy || connected);
    if (discBtn) discBtn.classList.toggle("hidden", !bridge || !connected);
    if (sendBtn) sendBtn.disabled = !connected;
    if (input) input.disabled = !connected;
    var wrap = $("nearbyDevicesWrap");
    if (wrap) wrap.classList.toggle("hidden", connected);
    renderDevices();
    renderMessages();
  }

  function renderDevices() {
    var list = $("nearbyDevices");
    var empty = $("nearbyDevicesEmpty");
    if (!list) return;
    list.innerHTML = "";
    var devs = JC.nearbyDevices || [];
    if (devs.length === 0) {
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");
    devs.forEach(function (d) {
      var row = document.createElement("div");
      row.className = "chat-row";
      row.innerHTML =
        '<div class="avatar">' + esc(initials(d.name)) + '</div>' +
        '<div class="info"><div class="name">' + esc(d.name) + '</div>' +
        '<div class="preview">Tap to connect</div></div>';
      row.addEventListener("click", function () { JC.nearbyConnect(d.address); });
      list.appendChild(row);
    });
  }

  function renderMessages() {
    var box = $("nearbyMessages");
    var empty = $("nearbyMessagesEmpty");
    if (!box) return;
    box.innerHTML = "";
    var msgs = JC.nearbyMessages || [];
    if (msgs.length === 0) {
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");
    msgs.forEach(function (m) {
      var isOut = m.from === "me";
      var el = document.createElement("div");
      el.className = "msg " + (isOut ? "out" : "in");
      var head = isOut ? "" : '<div class="sender-name">' + esc(m.from) + '</div>';
      el.innerHTML = head + esc(m.text) +
        '<div class="meta">' + esc(fmtTime(m.time || new Date())) + '</div>';
      box.appendChild(el);
    });
    box.scrollTop = box.scrollHeight;
  }

  // ---------- wire UI ----------
  document.addEventListener("DOMContentLoaded", function () {
    var row = $("nearbyRow");
    if (row) row.addEventListener("click", function () { JC.openNearby(); });
    var back = $("btnNearbyBack");
    if (back) back.addEventListener("click", function () { JC.nearbyLeave(); });
    var start = $("btnNearbyStart");
    if (start) start.addEventListener("click", function () { JC.nearbyStart(); });
    var scan = $("btnNearbyScan");
    if (scan) scan.addEventListener("click", function () { JC.nearbyScan(); });
    var stop = $("btnNearbyStop");
    if (stop) stop.addEventListener("click", function () { JC.nearbyStop(); });
    var disc = $("btnNearbyDisconnect");
    if (disc) disc.addEventListener("click", function () { JC.nearbyDisconnect(); });
    var send = $("btnNearbySend");
    var input = $("nearbyInput");
    function doSend() {
      if (!input) return;
      if (JC.nearbySend(input.value)) input.value = "";
    }
    if (send) send.addEventListener("click", doSend);
    if (input) input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") doSend();
    });
  });
})();
