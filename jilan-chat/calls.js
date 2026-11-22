// Jilan Chat v3.0 — calls.js
// Voice calls FIRST, video calls SECOND. Both use WebRTC with Firestore
// signalling, exactly the calls/{callId} model in DATA-MODEL.md:
//   calls/{callId}: callerUid, calleeUid, kind ("voice" | "video"),
//                   status (ringing | accepted | declined | ended | missed),
//                   offer, answer, createdAt, endedAt
//   calls/{callId}/callerCandidates + calleeCandidates: ICE candidates.
// Free STUN only: stun:stun.l.google.com:19302. No TURN server yet.
//
// HONEST LIMITS (do not remove this comment):
// 1. STUN-only calls fail on symmetric / carrier-grade NAT, which is common
//    on Pakistani mobile data. A share of calls will never connect until a
//    TURN server is added. There is NO free trustworthy public TURN server
//    (Google offers STUN only; public free TURN relays would route private
//    call media through an unknown third party — not acceptable for a
//    private chat app; a self-hosted TURN needs a server, which we do not
//    have). The UI reports "Call failed to connect" when ICE fails and
//    "No media" if the call connects but no audio/video arrives — it never
//    pretends a silent call is live.
// 2. No FCM in the shell yet, so an incoming call only rings while the
//    callee has the app OPEN in the foreground. If the app is closed or
//    killed, the callee gets nothing and the call is marked "missed".
// 3. No native call behaviour from JS: no earpiece/speakerphone switch
//    (the Speaker button tries the shell bridge first, then setSinkId,
//    and says so if it cannot), no audio focus, no incoming-call screen
//    while the phone is locked. The shell (vc4) sets AudioManager
//    MODE_IN_COMMUNICATION via Android.callAudioStart — until then the
//    remote audio may route to the earpiece quietly on some handsets.
// 4. WebView mic/camera capture is reported to fail on some Infinix
//    handsets ("Could not start audio source") even with permission.
//    Calls MUST be phone-tested on Dr Asif's actual phone before anyone
//    is told they work. This code has NOT been tested with a real peer.

(function () {
  var JC = window.JC = window.JC || {};

  var STUN_URL = "stun:stun.l.google.com:19302";
  var pc = null;               // RTCPeerConnection for the live call
  var localStream = null;
  var callDocRef = null;
  var callId = null;
  var callKind = "voice";      // "voice" | "video"
  var callRole = null;         // "caller" | "callee"
  var callOtherUid = null;
  var callTimer = null;
  var callSeconds = 0;
  var callState = "idle";      // idle | ringing | connecting | active | ended
  var incomingUnsub = null;
  var callUnsub = null;
  var answerUnsub = null;
  var candUnsub = null;
  var facingMode = "user";
  var muted = false;
  var videoOff = false;
  var remoteStream = null;     // persistent remote MediaStream built from ontrack tracks
  var gotRemoteTrack = false;  // at least one remote track actually arrived
  var mediaWatchdog = null;    // 15s: warn if no media yet
  var mediaWatchdog2 = null;   // 30s: end if still no media
  var connectedAtWritten = false; // v4.7 call log
  var finalStatus = null; // v4.7: keep "missed"/"declined" instead of overwriting with "ended"
  var iceDisconnectTimer = null; // grace period on transient ICE "disconnected"
  var iceConnected = false;    // ICE pair actually up (timer must not lie)
  var speakerOn = false;       // shell speakerphone state (video calls default on)

  function $(id) { return document.getElementById(id); }
  function remoteVideo() { return $("remoteVideo"); }
  function localVideo() { return $("localVideo"); }
  function remoteAudio() { return $("remoteAudio"); }

  function setCallState(text) { $("callState").textContent = text; }
  // v4.6: no screenshot / screen recording while a call is on screen
  // (FLAG_SECURE via the shell, vc7+). Guarded: older shells lack it.
  function setSecure(on) {
    try { if (window.Android && Android.setSecure) Android.setSecure(!!on); } catch (e) {}
  }
  JC._setCallSecure = setSecure;
  function showCallScreen() { setSecure(true); JC.showScreen("screen-call"); }

  // ---------- incoming-call listener (only rings while the app is open) ----------
  JC.startIncomingCallListener = function () {
    if (!JC.db || !JC.currentUser || incomingUnsub) return;
    incomingUnsub = JC.db.collection("calls")
      .where("calleeUid", "==", JC.currentUser.uid)
      .where("status", "==", "ringing")
      .onSnapshot(function (snap) {
        snap.docChanges().forEach(function (ch) {
          if (ch.type !== "added") return;
          if (callState !== "idle") return; // already in a call — ignore
          var data = ch.doc.data();
          // Blocked callers never ring: ignore their call silently.
          if (JC.isBlocked && JC.isBlocked(data.callerUid)) return;
          showIncoming(ch.doc.id, data);
        });
      }, function () { /* listener errors are non-fatal; calls just will not ring */ });
  };

  // Caller name + avatar letter. "Incoming call" is a STATE, never a
  // name — the old code showed it as the name when the profile was not
  // cached, so the screen kept saying "Incoming call" even after the
  // call was answered and the timer ran. Avatar is the first letter of
  // the name (photo is a separate feature); "?" only if no name at all.
  function setCallPeer(p) {
    var name = (p && p.displayName) || "Unknown caller";
    $("callName").textContent = name;
    $("callAvatar").textContent = ((name[0] || "?").toUpperCase());
  }

  function showIncoming(id, data) {
    callId = id;
    callDocRef = JC.db.collection("calls").doc(id);
    callKind = data.kind || "voice";
    callRole = "callee";
    callOtherUid = data.callerUid;
    callState = "ringing";
    var p = (window.JC && JC.getCachedProfile) ? JC.getCachedProfile(callOtherUid) : null;
    setCallPeer(p);
    if (!p && JC.db) {
      // Profile not cached: fetch it so the real name shows.
      JC.db.collection("users").doc(callOtherUid).get().then(function (snap) {
        if (snap && snap.exists && callState === "ringing") setCallPeer(snap.data());
      }).catch(function () {});
    }
    setCallState(callKind === "video" ? "Incoming video call…" : "Incoming voice call…");
    $("callButtonsIncoming").classList.remove("hidden");
    $("callButtonsActive").classList.add("hidden");
    $("btnVideoOff").classList.toggle("hidden", callKind !== "video");
    $("btnCamFlipCall").classList.toggle("hidden", callKind !== "video");
    localVideo().classList.toggle("hidden", callKind !== "video");
    showCallScreen();
    startRinging();
    // If the callee never answers, the caller-side timeout marks it missed.
  }

  // ---------- call history (Calls tab) ----------
  // Do queries: calls I made + calls I received. Each query has ONE
  // equality filter only (no orderBy) so no composite index is needed;
  // sorting happens here in the app. Rules allow read only for the
  // caller/callee, so each query only returns my own calls. Tap a row
  // to open that chat and call again (voice).
  JC.loadCallHistory = function () {
    var list = $("callList");
    var empty = $("callsEmpty");
    if (!JC.db || !JC.currentUser || !list) return;
    var me = JC.currentUser.uid;
    list.innerHTML = "<p style='padding:16px;color:#667781;'>Loading&hellip;</p>";
    if (empty) empty.classList.add("hidden");
    var qOut = JC.db.collection("calls").where("callerUid", "==", me).limit(20).get();
    var qIn = JC.db.collection("calls").where("calleeUid", "==", me).limit(20).get();
    Promise.all([qOut, qIn]).then(function (results) {
      var seen = {};
      var rows = [];
      results.forEach(function (snap) {
        snap.forEach(function (doc) {
          if (seen[doc.id]) return;
          seen[doc.id] = true;
          rows.push({ id: doc.id, data: doc.data() });
        });
      });
      rows.sort(function (a, b) {
        var ta = a.data.createdAt && a.data.createdAt.toMillis ? a.data.createdAt.toMillis() : 0;
        var tb = b.data.createdAt && b.data.createdAt.toMillis ? b.data.createdAt.toMillis() : 0;
        return tb - ta;
      });
      list.innerHTML = "";
      if (!rows.length) { if (empty) empty.classList.remove("hidden"); return; }
      rows.slice(0, 30).forEach(function (row) {
        var d = row.data;
        var otherUid = d.callerUid === me ? d.calleeUid : d.callerUid;
        var outgoing = d.callerUid === me;
        var missed = d.status === "missed" && !outgoing;
        var div = document.createElement("div");
        div.className = "chat-row call-row";
        div.innerHTML =
          '<div class="avatar">?</div>' +
          '<div class="info"><div class="top"><span class="name">...</span><span class="time"></span></div>' +
          '<div class="detail' + (missed ? " missed" : "") + '">' + (missed ? "Missed " : (outgoing ? "Outgoing " : "Incoming ")) + (d.kind === "video" ? "video call" : "voice call") + '</div></div>';
        list.appendChild(div);
        JC.db.collection("users").doc(otherUid).get().then(function (pSnap) {
          var p = pSnap.exists ? pSnap.data() : { displayName: "Unknown" };
          div.querySelector(".name").textContent = p.displayName || "Unknown";
          var av = div.querySelector(".avatar");
          av.textContent = ((p.displayName || "?")[0] || "?").toUpperCase();
          var t = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : null;
          div.querySelector(".time").textContent = t ? (t.toDateString() === new Date().toDateString() ? t.getHours() + ":" + ("0" + t.getMinutes()).slice(-2) : t.toDateString()) : "";
        });
        div.addEventListener("click", function () {
          if (JC.chatIdFor && JC.openChat) {
            JC.openChat(JC.chatIdFor(me, otherUid), otherUid);
            JC.startCall("voice");
          }
        });
      });
    }).catch(function () {
      list.innerHTML = "<p style='padding:16px;color:#667781;'>Could not load calls.</p>";
    });
  };

  // ---------- start a call (voice first, video second — same path) ----------
  JC.startCall = function (kind) {
    if (!JC.db || !JC.currentUser || !JC.currentChatOtherUid) {
      JC.toast("Open a chat first.");
      return;
    }
    if (callState !== "idle") { JC.toast("You are already in a call."); return; }
    if (JC.isBlocked && JC.isBlocked(JC.currentChatOtherUid)) {
      JC.toast("Call failed.");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      JC.toast("Calls are not supported on this device.");
      return;
    }
    callKind = kind;
    callRole = "caller";
    callOtherUid = JC.currentChatOtherUid;
    callState = "ringing";
    setCallPeer(JC.currentChatOther || null);
    setCallState(kind === "video" ? "Video calling…" : "Calling…");
    $("callButtonsIncoming").classList.add("hidden");
    $("callButtonsActive").classList.remove("hidden");
    $("btnVideoOff").classList.toggle("hidden", kind !== "video");
    $("btnCamFlipCall").classList.toggle("hidden", kind !== "video");
    localVideo().classList.toggle("hidden", kind !== "video");
    showCallScreen();
    setCallState("Starting camera and microphone…");
    startRinging(true); // caller hears ringback only — caller phone never vibrates

    getLocalMedia(kind).then(function (stream) {
      localStream = stream;
      localVideo().srcObject = kind === "video" ? stream : null; applyMirror();
      // Create the call document first, then the offer inside it.
      return JC.db.collection("calls").add({
        callerUid: JC.currentUser.uid,
        calleeUid: callOtherUid,
        kind: kind,
        status: "ringing",
        offer: null,
        answer: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        endedAt: null
      });
    }).then(function (ref) {
      callId = ref.id;
      callDocRef = ref;
      pc = makePeerConnection();
      localStream.getTracks().forEach(function (t) { pc.addTrack(t, localStream); });
      return pc.createOffer();
    }).then(function (offer) {
      return pc.setLocalDescription(offer).then(function () {
        return callDocRef.update({ offer: { type: offer.type, sdp: offer.sdp } });
      });
    }).then(function () {
      setCallState("Ringing…");
      // Watch for the callee's answer.
      callUnsub = callDocRef.onSnapshot(function (snap) {
        var d = snap.data();
        if (!d) return;
        if (d.answer && pc && !pc.currentRemoteDescription) {
          pc.setRemoteDescription(new RTCSessionDescription(d.answer)).then(function () {
            onConnected();
          }).catch(function (e) { endCall("Connection failed: " + e.message); });
        }
        if (d.status === "declined") { finalStatus = "declined"; endCall("Call declined"); }
        if (d.status === "ended") endCall("Call ended");
      });
      // Watch for the callee's ICE candidates.
      candUnsub = callDocRef.collection("calleeCandidates").onSnapshot(function (snap) {
        snap.docChanges().forEach(function (ch) {
          if (ch.type === "added" && pc) pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(function () {});
        });
      });
      // If nobody answers in 45 seconds, mark it missed and hang up.
      callTimer = setTimeout(function () {
        if (callState === "ringing") {
          finalStatus = "missed";
          endCall("No answer");
        }
      }, 45000);
    }).catch(function (e) {
      // Neutral on purpose: a blocked caller must not learn they are blocked.
      endCall("Call failed.");
    });
  };

  // ---------- accept an incoming call ----------
  JC.acceptCall = function () {
    if (!callDocRef || callState !== "ringing") return;
    setCallState("Connecting…");
    stopRinging();
    $("callButtonsIncoming").classList.add("hidden");
    $("callButtonsActive").classList.remove("hidden");
    getLocalMedia(callKind).then(function (stream) {
      localStream = stream;
      localVideo().srcObject = callKind === "video" ? stream : null; applyMirror();
      return callDocRef.get();
    }).then(function (snap) {
      var data = snap.data();
      if (!data || !data.offer) throw new Error("Call offer is missing.");
      pc = makePeerConnection();
      localStream.getTracks().forEach(function (t) { pc.addTrack(t, localStream); });
      return pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    }).then(function () {
      return pc.createAnswer();
    }).then(function (answer) {
      return pc.setLocalDescription(answer).then(function () {
        return callDocRef.update({
          answer: { type: answer.type, sdp: answer.sdp },
          status: "accepted"
        });
      });
    }).then(function () {
      // Watch for the caller's ICE candidates.
      candUnsub = callDocRef.collection("callerCandidates").onSnapshot(function (snap) {
        snap.docChanges().forEach(function (ch) {
          if (ch.type === "added" && pc) pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(function () {});
        });
      });
      // Watch for the caller hanging up.
      callUnsub = callDocRef.onSnapshot(function (snap) {
        var d = snap.data();
        if (d && d.status === "ended") endCall("Call ended");
      });
      onConnected();
    }).catch(function (e) {
      endCall("Could not answer: " + e.message);
    });
  };

  // ---------- decline / end ----------
  JC.declineCall = function () {
    if (!callDocRef) { resetCallUi(); return; }
    finalStatus = "declined";
    endCall("Call declined");
  };

  JC.endCall = function () { endCall("Call ended"); };

  function endCall(reason) {
    setSecure(false);
    try { if (JC.onCallEnded) JC.onCallEnded(); } catch (e) {}
    if (callDocRef && callState !== "idle") {
      callDocRef.update({ status: finalStatus || "ended", endedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
    }
    if (callTimer) { clearTimeout(callTimer); callTimer = null; }
    if (mediaWatchdog) { clearTimeout(mediaWatchdog); mediaWatchdog = null; }
    if (mediaWatchdog2) { clearTimeout(mediaWatchdog2); mediaWatchdog2 = null; }
    if (iceDisconnectTimer) { clearTimeout(iceDisconnectTimer); iceDisconnectTimer = null; }
    stopRinging();
    try { if (window.Android && Android.callAudioStop) Android.callAudioStop(); } catch (e) {}
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; }
    if (callUnsub) { callUnsub(); callUnsub = null; }
    if (answerUnsub) { answerUnsub(); answerUnsub = null; }
    if (candUnsub) { candUnsub(); candUnsub = null; }
    remoteVideo().srcObject = null;
    localVideo().srcObject = null;
    remoteAudio().srcObject = null;
    facingMode = "user"; flipping = false; try { resetPip(); } catch (e) {}
    remoteStream = null; gotRemoteTrack = false; iceConnected = false;
    connectedAtWritten = false; finalStatus = null;
    callState = "idle";
    callId = null; callDocRef = null; callRole = null; callOtherUid = null;
    muted = false; videoOff = false; speakerOn = false; callSeconds = 0;
    $("btnMute").classList.remove("off");
    $("btnVideoOff").classList.remove("off");
    $("btnSpeaker").classList.remove("on");
    remoteVideo().classList.remove("playing"); localVideo().classList.remove("playing");
    $("screen-call").classList.remove("has-remote-video");
    resetCallUi();
    if (reason) JC.toast(reason);
    // Return to wherever the user was: the open chat if there is one.
    if (JC.currentChatId) JC.showScreen("screen-chat");
    else JC.showScreen("screen-list");
  }

  function resetCallUi() {
    $("callButtonsIncoming").classList.add("hidden");
    $("callButtonsActive").classList.add("hidden");
  }

  // ---------- peer connection ----------
  function makePeerConnection() {
    var conn = new RTCPeerConnection({ iceServers: [{ urls: STUN_URL }] });
    // v4.8 screen share: one pre-negotiated data channel (id 7) on BOTH
    // sides, created before the offer/answer. Audio/video tracks are not
    // touched; frames go phone-to-phone (no Firebase writes).
    try { var dc = conn.createDataChannel("jcscreen", { negotiated: true, id: 7 }); if (JC.onCallDataChannel) JC.onCallDataChannel(dc); } catch (e) {}
    conn.onicecandidate = function (e) {
      if (!e.candidate || !callDocRef) return;
      var sub = callRole === "caller" ? "callerCandidates" : "calleeCandidates";
      callDocRef.collection(sub).add({
        candidate: e.candidate.candidate,
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex
      }).catch(function () {});
    };
    // Remote track: attach via e.track (streams[0] may be empty in some
    // WebView/Chromium builds — the old code returned early then and the
    // remote audio/video NEVER played). Keep one persistent remote
    // MediaStream, add each track once, and explicitly play() the element:
    // autoplay alone is unreliable in WebView.
    conn.ontrack = function (e) {
      if (e.track) attachRemoteTrack(e.track);
      else if (e.streams && e.streams[0]) {
        e.streams[0].getTracks().forEach(function (t) { attachRemoteTrack(t); });
      }
    };
    conn.oniceconnectionstatechange = function () {
      var s = conn.iceConnectionState;
      if (s === "connected" || s === "completed") {
        if (!iceConnected && callDocRef && !connectedAtWritten) {
          // v4.7 call log: real talk time starts here (display/history only).
          connectedAtWritten = true;
          callDocRef.update({ connectedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
        }
        iceConnected = true;
        if (iceDisconnectTimer) { clearTimeout(iceDisconnectTimer); iceDisconnectTimer = null; }
        onConnected();
      } else if (s === "disconnected") {
        // Transient on mobile data — give it a few seconds to recover
        // instead of killing the call at once (old code ended instantly).
        setCallState("Reconnecting…");
        if (!iceDisconnectTimer) {
          iceDisconnectTimer = setTimeout(function () {
            iceDisconnectTimer = null;
            if (pc && (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed")) {
              endCall("Call failed to connect — the network blocked the call. Try again on Wi-Fi.");
            }
          }, 8000);
        }
      } else if (s === "failed") {
        // STUN-only: the common mobile-NAT failure. Say so plainly.
        endCall("Call failed to connect — the network blocked the call. Try again on Wi-Fi.");
      }
    };
    return conn;
  }

  function attachRemoteTrack(track) {
    try {
      if (!remoteStream) {
        if (typeof MediaStream !== "undefined") remoteStream = new MediaStream();
        else return;
      }
      if (remoteStream.getTracks().indexOf(track) < 0) remoteStream.addTrack(track);
      gotRemoteTrack = true;
      if (mediaWatchdog2) { clearTimeout(mediaWatchdog2); mediaWatchdog2 = null; }
      var el = callKind === "video" ? remoteVideo() : remoteAudio();
      if (!el) return;
      if (callKind !== "video") { el.muted = false; el.volume = 1; }
      if (el.srcObject !== remoteStream) el.srcObject = remoteStream;
      if (el.paused) { var p = el.play(); if (p && p.catch) p.catch(function () {}); }
    } catch (e) {}
  }

  // Media watchdog: the call can LOOK connected (timer running) while ICE
  // is still checking and no media flows — that silent call is exactly
  // what the user reported ("awaz nahi aati"). Warn at 15s, end at 30s
  // if still no remote track and ICE is not connected.
  function armMediaWatchdog() {
    if (mediaWatchdog) clearTimeout(mediaWatchdog);
    if (mediaWatchdog2) clearTimeout(mediaWatchdog2);
    mediaWatchdog = setTimeout(function () {
      mediaWatchdog = null;
      if (callState === "active" && !gotRemoteTrack) {
        setCallState("No media — network issue?");
        if (JC.toast) JC.toast("No audio or video. Your network may be blocking the call. Try again on Wi-Fi.");
      }
    }, 15000);
    mediaWatchdog2 = setTimeout(function () {
      mediaWatchdog2 = null;
      if (callState === "active" && !gotRemoteTrack && pc
          && pc.iceConnectionState !== "connected" && pc.iceConnectionState !== "completed") {
        endCall("Call couldn't connect. Your network blocked the media. Try again on Wi-Fi.");
      }
    }, 30000);
  }

  function onConnected() {
    // The timer must not lie: only start it once ICE is actually up.
    // Before that the call shows "Connecting…" — a silent call with a
    // running timer is what the user reported.
    if (callState === "active") {
      if (iceConnected && !callTimer) startCallTimer();
      return;
    }
    if (callTimer) { clearTimeout(callTimer); callTimer = null; }
    callState = "active";
    stopRinging();
    if (iceConnected) startCallTimer();
    else setCallState("Connecting…");
    armMediaWatchdog();
    // Shell audio mode (vc4): earpiece/speaker routing. Guarded — the
    // vc3 shell does not have these methods yet.
    try { if (window.Android && Android.callAudioStart) Android.callAudioStart(callKind); } catch (e) {}
    if (window.Android && Android.callAudioStart) { try { speakerOn = (callKind === "video"); } catch (e) {} }
  }

  function startCallTimer() {
    callSeconds = 0;
    setCallState("00:00");
    callTimer = setInterval(function () {
      callSeconds++;
      var m = Math.floor(callSeconds / 60), s = callSeconds % 60;
      setCallState((m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s);
    }, 1000);
  }

  function getLocalMedia(kind) {
    // Bare {audio:true} leaves echo cancellation / noise suppression /
    // gain up to the device — that is the "ajib"/echo/robotic sound.
    // These are "ideal" constraints: a device that cannot do them still
    // returns a stream instead of rejecting.
    var audioConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    var constraints = kind === "video"
      ? { audio: audioConstraints, video: { facingMode: facingMode } }
      : { audio: audioConstraints, video: false };
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  // ---------- in-call buttons ----------
  function toggleMute() {
    if (!localStream) return;
    muted = !muted;
    localStream.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
    $("btnMute").classList.toggle("off", muted);
    // Icon swap is CSS-only (.off shows the slashed-mic SVG).
  }
  function toggleVideo() {
    if (!localStream || callKind !== "video") return;
    videoOff = !videoOff;
    localStream.getVideoTracks().forEach(function (t) { t.enabled = !videoOff; });
    $("btnVideoOff").classList.toggle("off", videoOff);
  }
  // v4.10 (user report 2026-11-22 23:32: "camera change ni hota").
  // Old code asked for {facingMode} as a soft hint while the first camera
  // was still open — many Android phones then return the SAME camera, or
  // fail because two cameras can't be open at once. Now: stop the old
  // track first, ask for the other camera with an EXACT facingMode, fall
  // back to picking the other camera by deviceId, then replaceTrack() on
  // the existing video sender (no renegotiation, audio untouched).
  var flipping = false;
  function pickOtherCameraId() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return Promise.resolve(null);
    return navigator.mediaDevices.enumerateDevices().then(function (list) {
      var cams = (list || []).filter(function (d) { return d.kind === "videoinput"; });
      if (cams.length < 2) return null;
      var cur = localStream && localStream.getVideoTracks()[0];
      var curId = cur && cur.getSettings ? (cur.getSettings().deviceId || "") : "";
      var want = facingMode === "environment" ? /back|rear|environment/i : /front|user|face/i;
      var byLabel = cams.filter(function (d) { return want.test(d.label || "") && d.deviceId !== curId; })[0];
      if (byLabel) return byLabel.deviceId;
      var other = cams.filter(function (d) { return d.deviceId !== curId; })[0];
      return other ? other.deviceId : null;
    }).catch(function () { return null; });
  }
  function applyMirror() {
    var lv = localVideo();
    if (lv && lv.classList) lv.classList.toggle("mirror", facingMode === "user");
  }
  JC._applyMirror = applyMirror;
  function flipCamera() {
    if (!localStream || callKind !== "video" || !pc || flipping) return Promise.resolve(false);
    flipping = true;
    var prevMode = facingMode;
    var nextMode = facingMode === "user" ? "environment" : "user";
    var oldTrack = localStream.getVideoTracks()[0] || null;
    var oldId = oldTrack && oldTrack.getSettings ? (oldTrack.getSettings().deviceId || "") : "";
    var sender = pc.getSenders().find(function (s) { return s.track && s.track.kind === "video"; }) ||
                 pc.getSenders().find(function (s) { return !s.track && s.__jcVideo; });
    // Release the current camera first (phones often allow only one open).
    if (oldTrack) { try { oldTrack.stop(); } catch (e) {} }
    facingMode = nextMode;
    function tryExact() {
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: nextMode } }, audio: false });
    }
    function tryDevice() {
      return pickOtherCameraId().then(function (id) {
        if (!id || id === oldId) throw new Error("no other camera");
        return navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: id } }, audio: false });
      });
    }
    return tryExact().catch(tryDevice).then(function (newStream) {
      var newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) throw new Error("no video track");
      newTrack.enabled = !videoOff;
      var p = sender ? sender.replaceTrack(newTrack) : null;
      if (sender) sender.__jcVideo = true;
      if (oldTrack) { try { localStream.removeTrack(oldTrack); } catch (e) {} }
      localStream.addTrack(newTrack);
      var lv = localVideo();
      lv.srcObject = null; lv.srcObject = localStream;
      try { var pp = lv.play && lv.play(); if (pp && pp.catch) pp.catch(function () {}); } catch (e) {}
      applyMirror();
      flipping = false;
      return Promise.resolve(p).then(function () { return true; });
    }).catch(function (e) {
      // Couldn't open the other camera: bring the previous one back.
      facingMode = prevMode;
      flipping = false;
      JC.toast("Couldn't switch camera on this phone.");
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: prevMode }, audio: false }).then(function (back) {
        var t = back.getVideoTracks()[0];
        if (!t) return false;
        t.enabled = !videoOff;
        if (sender) sender.replaceTrack(t);
        if (oldTrack) { try { localStream.removeTrack(oldTrack); } catch (e2) {} }
        localStream.addTrack(t);
        localVideo().srcObject = localStream;
        applyMirror();
        return false;
      }).catch(function () { return false; });
    });
  }
  JC._flipCamera = flipCamera;

  // v4.10 (user 23:32: "tasvir jiski aa rahi ho wohi rehti, choti bari nahi
  // hoti"): tap the small self-view to swap it with the big view (WhatsApp
  // style); tap the small one again to swap back. Drag it to any corner.
  var swapped = false, pipDrag = null, pipMoved = false;
  function setSwapped(on) {
    swapped = !!on;
    var sc = $("screen-call");
    if (sc && sc.classList) sc.classList.toggle("pip-swapped", swapped);
    return swapped;
  }
  JC._setCallSwap = setSwapped;
  JC._toggleCallSwap = function () { return setSwapped(!swapped); };
  JC._isCallSwapped = function () { return swapped; };
  function smallVideo() { return swapped ? remoteVideo() : localVideo(); }
  function wirePip() {
    ["localVideo", "remoteVideo"].forEach(function (id) {
      var v = $(id);
      if (!v || !v.addEventListener) return;
      v.addEventListener("click", function () {
        if (callKind !== "video") return;
        if (pipMoved) { pipMoved = false; return; }
        if (v === smallVideo()) JC._toggleCallSwap();
      });
      v.addEventListener("touchstart", function (e) {
        if (v !== smallVideo() || !e.touches || !e.touches[0]) return;
        var r = v.getBoundingClientRect();
        pipDrag = { x: e.touches[0].clientX, y: e.touches[0].clientY, l: r.left, t: r.top, w: r.width, h: r.height, el: v };
        pipMoved = false;
      }, { passive: true });
      v.addEventListener("touchmove", function (e) {
        if (!pipDrag || pipDrag.el !== v || !e.touches || !e.touches[0]) return;
        var dx = e.touches[0].clientX - pipDrag.x, dy = e.touches[0].clientY - pipDrag.y;
        if (Math.abs(dx) + Math.abs(dy) > 8) pipMoved = true;
        if (!pipMoved) return;
        if (e.cancelable) e.preventDefault();
        v.style.left = (pipDrag.l + dx) + "px"; v.style.top = (pipDrag.t + dy) + "px";
        v.style.right = "auto"; v.style.bottom = "auto";
      }, { passive: false });
      v.addEventListener("touchend", function () {
        if (!pipDrag || pipDrag.el !== v) return;
        if (pipMoved) {
          // snap to nearest corner
          var r = v.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, m = 14;
          var left = (r.left + r.width / 2) < W / 2, top = (r.top + r.height / 2) < H / 2;
          v.style.left = left ? m + "px" : "auto"; v.style.right = left ? "auto" : m + "px";
          v.style.top = top ? (m + 40) + "px" : "auto"; v.style.bottom = top ? "auto" : "150px";
          setTimeout(function () { pipMoved = false; }, 350);
        }
        pipDrag = null;
      });
    });
  }
  function resetPip() {
    setSwapped(false);
    ["localVideo", "remoteVideo"].forEach(function (id) {
      var v = $(id); if (!v || !v.style) return;
      v.style.left = v.style.top = v.style.right = v.style.bottom = "";
    });
  }
  JC._resetPip = resetPip;
  function toggleSpeaker() {
    // Shell bridge first (vc4): real earpiece/speakerphone switch.
    // Guarded — the vc3 shell does not have it yet.
    if (window.Android && Android.setCallSpeaker) {
      speakerOn = !speakerOn;
      try {
        Android.setCallSpeaker(speakerOn);
        JC.toast(speakerOn ? "Speaker on" : "Speaker off");
      } catch (e) { JC.toast("Couldn't switch speaker."); }
      return;
    }
    // WebView has no earpiece/speakerphone API. Try the audio element's
    // output device; if the browser cannot, say so instead of pretending.
    var audio = remoteAudio();
    if (audio && audio.setSinkId) {
      audio.setSinkId("").then(function () { JC.toast("Speaker output set to default."); })
        .catch(function () { JC.toast("Speaker switch is not available in this app yet — sound stays on the default output."); });
    } else {
      JC.toast("Speaker switch needs the Android shell — sound stays on the default output.");
    }
  }

  // ---------- ringtone (WhatsApp jaisi bell) ----------
  // No audio file needed: the tone is made with Web Audio. The callee
  // hears it while the call rings; the caller hears it while waiting.
  // Before this fix there was NO bell at all — the call screen just
  // appeared silently. App band ho to bell nahi bajti (FCM nahi hai —
  // alag track, abhi pending).
  var ringCtx = null, ringTimer = null, audioUnlocked = false, ringing = false;
  // WebView may block audio until the user has tapped once — unlock the
  // ringtone AudioContext on the first tap anywhere in the app, so the
  // bell can play when a call arrives later with no fresh gesture.
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ringCtx) ringCtx = new AC();
      if (ringCtx.state === "suspended" && ringCtx.resume) ringCtx.resume().catch(function () {});
    } catch (e) {}
  }
  // Ringer mode (user rule, 2026-11-22): silent → bell NA baje, sirf
  // screen dikhe; vibrate → sirf vibration; normal → bell + vibrate.
  // Web JS phone ka ringer mode nahi parh sakta — shell (vc4) deta hai
  // Android.getRingerMode(). Bridge na ho (browser / vc3) to default
  // normal: bell + vibrate.
  function getRingerMode() {
    // v4.8 Do Not Disturb (features3.js): incoming calls still show, silently.
    try { if (JC.dndActive && JC.dndActive()) return "silent"; } catch (e) {}
    try {
      if (window.Android && Android.getRingerMode) {
        var m = String(Android.getRingerMode());
        if (m === "silent" || m === "vibrate" || m === "normal") return m;
      }
    } catch (e) {}
    return "normal";
  }
  function startRinging(asCaller) {
    try {
      if (ringing) return;
      var mode = getRingerMode();
      if (mode === "silent") return; // show only — no bell, no vibrate
      ringing = true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (mode !== "vibrate" && !AC) { ringing = false; return; }
      if (mode === "normal" && !ringCtx && AC) ringCtx = new AC();
      var ctx = ringCtx;
      var master = null;
      if (mode === "normal" && ctx) {
        if (ctx.state === "suspended" && ctx.resume) ctx.resume().catch(function () {});
        master = ctx.createGain();
        master.gain.value = 0.2;
        master.connect(ctx.destination);
      }
      var ringOnce = function () {
        if (!ringing) return;
        // Vibrate on every ring until accept/decline/end (stopRinging
        // cancels it). One pattern alone only buzzes once.
        if (!asCaller && navigator.vibrate) { try { navigator.vibrate([500, 200, 500]); } catch (e) {} }
        if (mode !== "normal" || !ctx || !master) return;
        [0, 0.45].forEach(function (delay) {
          try {
            var t0 = ctx.currentTime + delay;
            var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
            o1.type = "sine"; o1.frequency.value = 950;
            o2.type = "sine"; o2.frequency.value = 1180;
            var g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05);
            g.gain.setValueAtTime(0.5, t0 + 0.35);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
            o1.connect(g); o2.connect(g); g.connect(master);
            o1.start(t0); o2.start(t0);
            o1.stop(t0 + 0.45); o2.stop(t0 + 0.45);
          } catch (e) {}
        });
      };
      ringOnce();
      ringTimer = setInterval(ringOnce, 1300);
    } catch (e) {}
  }
  function stopRinging() {
    try {
      ringing = false;
      if (ringTimer) { clearInterval(ringTimer); ringTimer = null; }
      if (ringCtx) { var c = ringCtx; ringCtx = null; c.close().catch(function () {}); }
      if (navigator.vibrate) { try { navigator.vibrate(0); } catch (e) {} }
    } catch (e) {}
  }

  // ---------- wire UI ----------
  document.addEventListener("DOMContentLoaded", function () {
    // Unlock the ringtone AudioContext on the first tap, so the bell can
    // play when a call arrives later with no fresh gesture (WebView rule).
    document.addEventListener("pointerdown", unlockAudio);
    $("btnVoiceCall").addEventListener("click", function () { JC.startCall("voice"); });
    $("btnVideoCall").addEventListener("click", function () { JC.startCall("video"); });
    $("btnAccept").addEventListener("click", JC.acceptCall);
    $("btnDecline").addEventListener("click", JC.declineCall);
    $("btnEndCall").addEventListener("click", JC.endCall);
    $("btnMute").addEventListener("click", toggleMute);
    $("btnVideoOff").addEventListener("click", toggleVideo);
    $("btnCamFlipCall").addEventListener("click", flipCamera);
    wirePip();
    $("btnSpeaker").addEventListener("click", function () {
      toggleSpeaker();
      $("btnSpeaker").classList.toggle("on", !!speakerOn);
    });
    // Display only: keep the <video> boxes invisible until real frames play,
    // so the WebView grey play-button placeholder never shows.
    ["remoteVideo", "localVideo"].forEach(function (id) {
      var v = $(id);
      if (!v || !v.addEventListener) return;
      v.addEventListener("playing", function () {
        v.classList.add("playing");
        if (id === "remoteVideo") $("screen-call").classList.add("has-remote-video");
      });
      ["emptied", "ended", "abort"].forEach(function (ev) {
        v.addEventListener(ev, function () {
          v.classList.remove("playing");
          if (id === "remoteVideo") $("screen-call").classList.remove("has-remote-video");
        });
      });
    });
  });
})();
