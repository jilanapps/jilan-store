// Jilan Chat v4.8 — screen share during a call.
// Android WebView has no getDisplayMedia, so the vc9 shell captures the
// screen natively (MediaProjection, user consent) and hands us JPEG frames
// (window.__jcScreenFrame). We send them over the call's pre-negotiated
// RTCDataChannel (calls.js, id 7) straight to the other phone — no
// Firebase writes, no server. The receiver shows them full screen.
(function () {
  var JC = window.JC = window.JC || {};
  var CHUNK = 15000;          // safe SCTP message size
  var dc = null, sharing = false, remoteSharing = false, seq = 0;
  var parts = {}, lastSeq = -1;
  function $(id) { return document.getElementById(id); }
  function toast(t) { if (JC.toast) JC.toast(t); }
  function bridge(n) { try { return window.Android && typeof window.Android[n] === "function"; } catch (e) { return false; } }

  JC.screenShareSupported = function () {
    if (!bridge("startScreenShare")) return false;
    try { return bridge("isScreenShareSupported") ? !!window.Android.isScreenShareSupported() : true; } catch (e) { return false; }
  };
  function open() { return dc && dc.readyState === "open"; }
  function send(obj) { if (!open()) return false; try { dc.send(typeof obj === "string" ? obj : JSON.stringify(obj)); return true; } catch (e) { return false; } }

  JC.onCallDataChannel = function (channel) {
    dc = channel;
    try { dc.binaryType = "arraybuffer"; } catch (e) {}
    dc.onopen = function () { updateButton(); };
    dc.onclose = function () { if (remoteSharing) showRemote(false); updateButton(); };
    dc.onmessage = function (ev) { onMessage(ev.data); };
    updateButton();
  };
  JC.onCallEnded = function () {
    if (sharing) JC.stopScreenShare(true);
    showRemote(false);
    dc = null; parts = {}; lastSeq = -1;
    updateButton();
  };

  // ---- receiving ----
  function onMessage(data) {
    if (typeof data !== "string") return;
    if (data.charAt(0) === "{") {
      var m = null; try { m = JSON.parse(data); } catch (e) { return; }
      if (m.t === "start") showRemote(true);
      else if (m.t === "stop") showRemote(false);
      return;
    }
    // Frame chunk: "F|seq|index|total|base64"
    var p = data.split("|");
    if (p[0] !== "F" || p.length < 5) return;
    var s = +p[1], i = +p[2], n = +p[3], body = p.slice(4).join("|");
    if (!(n > 0 && n < 400) || s < lastSeq) return;
    var f = parts[s] || (parts[s] = { n: n, got: 0, arr: [] });
    if (f.arr[i] == null) { f.arr[i] = body; f.got++; }
    if (f.got === f.n) {
      lastSeq = s;
      Object.keys(parts).forEach(function (k) { if (+k <= s) delete parts[k]; });
      if (!remoteSharing) showRemote(true);
      var img = $("screenShareImg");
      if (img) img.src = "data:image/jpeg;base64," + f.arr.join("");
    }
  }
  function showRemote(on) {
    remoteSharing = !!on;
    var v = $("screenShareView"); if (!v) return;
    v.classList.toggle("hidden", !on);
    if (!on) { var img = $("screenShareImg"); if (img) img.removeAttribute("src"); parts = {}; lastSeq = -1; }
    var who = $("screenShareWho");
    if (who) who.textContent = ((($("callName") || {}).textContent) || "Contact") + " is sharing their screen";
  }

  // ---- sending (frames come from the vc9 shell) ----
  window.__jcScreenFrame = function (b64) {
    if (!sharing || !open() || typeof b64 !== "string" || !b64) return;
    // Back-pressure: drop this frame if the channel is still busy.
    try { if (dc.bufferedAmount > 600000) return; } catch (e) {}
    var s = ++seq, n = Math.ceil(b64.length / CHUNK);
    for (var i = 0; i < n; i++) {
      if (!send("F|" + s + "|" + i + "|" + n + "|" + b64.substr(i * CHUNK, CHUNK))) return;
    }
  };
  window.__jcScreenShareState = function (state, msg) {
    if (state === "started") {
      sharing = true; send({ t: "start" });
      toast("You are sharing your screen");
    } else if (state === "denied") { sharing = false; toast("Screen share was not allowed."); }
    else if (state === "error") { sharing = false; send({ t: "stop" }); toast("Screen share failed" + (msg ? ": " + String(msg).slice(0, 80) : ".")); }
    else if (state === "stopped") { if (sharing) send({ t: "stop" }); sharing = false; }
    updateButton();
  };
  JC.startScreenShare = function () {
    if (!JC.screenShareSupported()) { toast("Update the app to share your screen (Android 10 or newer)."); return; }
    if (!open()) { toast("Wait until the call is connected."); return; }
    try { window.Android.startScreenShare(); } catch (e) { toast("Screen share failed."); }
  };
  JC.stopScreenShare = function (quiet) {
    try { if (bridge("stopScreenShare")) window.Android.stopScreenShare(); } catch (e) {}
    if (sharing) send({ t: "stop" });
    sharing = false; updateButton();
    if (!quiet) toast("Screen share stopped");
  };
  JC.isScreenSharing = function () { return sharing; };
  function updateButton() {
    var b = $("btnShareScreen"); if (!b) return;
    b.classList.toggle("hidden", !JC.screenShareSupported());
    b.classList.toggle("on", sharing);
    b.setAttribute("title", sharing ? "Stop sharing" : "Share screen");
    b.setAttribute("aria-label", sharing ? "Stop sharing" : "Share screen");
    var bar = $("screenShareSelfBar"); if (bar) bar.classList.toggle("hidden", !sharing);
  }
  document.addEventListener("DOMContentLoaded", function () {
    var b = $("btnShareScreen");
    if (b) b.addEventListener("click", function () { if (sharing) JC.stopScreenShare(false); else JC.startScreenShare(); });
    var st = $("btnScreenShareStop"); if (st) st.addEventListener("click", function () { JC.stopScreenShare(false); });
    var hide = $("btnScreenShareHide"); if (hide) hide.addEventListener("click", function () { var v = $("screenShareView"); if (v) v.classList.add("hidden"); });
    updateButton();
  });
})();
