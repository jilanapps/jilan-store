// Jilan Chat v1.0 — calls.js
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
//    TURN server is added. The UI reports "Call failed to connect" when ICE
//    fails — it never pretends a failed call is live.
// 2. No FCM in the shell yet, so an incoming call only rings while the
//    callee has the app OPEN in the foreground. If the app is closed or
//    killed, the callee gets nothing and the call is marked "missed".
// 3. No native call behaviour from JS: no earpiece/speakerphone switch
//    (the Speaker button tries setSinkId and says so if it cannot),
//    no audio focus, no incoming-call screen while the phone is locked.
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

  function $(id) { return document.getElementById(id); }
  function remoteVideo() { return $("remoteVideo"); }
  function localVideo() { return $("localVideo"); }
  function remoteAudio() { return $("remoteAudio"); }

  function setCallState(text) { $("callState").textContent = text; }
  function showCallScreen() { JC.showScreen("screen-call"); }

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

  function showIncoming(id, data) {
    callId = id;
    callDocRef = JC.db.collection("calls").doc(id);
    callKind = data.kind || "voice";
    callRole = "callee";
    callOtherUid = data.callerUid;
    callState = "ringing";
    var p = (window.JC && JC.getCachedProfile) ? JC.getCachedProfile(callOtherUid) : null;
    $("callName").textContent = (p && p.displayName) || "Incoming call";
    $("callAvatar").textContent = "?";
    setCallState(callKind === "video" ? "Incoming video call…" : "Incoming voice call…");
    $("callButtonsIncoming").classList.remove("hidden");
    $("callButtonsActive").classList.add("hidden");
    $("btnVideoOff").classList.toggle("hidden", callKind !== "video");
    $("btnCamFlipCall").classList.toggle("hidden", callKind !== "video");
    localVideo().classList.toggle("hidden", callKind !== "video");
    showCallScreen();
    // If the callee never answers, the caller-side timeout marks it missed.
  }

  // ---------- start a call (voice first, video second — same path) ----------
  JC.startCall = function (kind) {
    if (!JC.db || !JC.currentUser || !JC.currentChatOtherUid) {
      JC.toast("Open a chat first.");
      return;
    }
    if (callState !== "idle") { JC.toast("You are already in a call."); return; }
    if (JC.isBlocked && JC.isBlocked(JC.currentChatOtherUid)) {
      JC.toast("Call nahi lag saki.");
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
    var p = JC.currentChatOther || {};
    $("callName").textContent = p.displayName || "Calling…";
    $("callAvatar").textContent = "?";
    setCallState(kind === "video" ? "Video calling…" : "Calling…");
    $("callButtonsIncoming").classList.add("hidden");
    $("callButtonsActive").classList.remove("hidden");
    $("btnVideoOff").classList.toggle("hidden", kind !== "video");
    $("btnCamFlipCall").classList.toggle("hidden", kind !== "video");
    localVideo().classList.toggle("hidden", kind !== "video");
    showCallScreen();
    setCallState("Starting camera and microphone…");

    getLocalMedia(kind).then(function (stream) {
      localStream = stream;
      localVideo().srcObject = kind === "video" ? stream : null;
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
        if (d.status === "declined") endCall("Call declined");
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
          callDocRef.update({ status: "missed" }).catch(function () {});
          endCall("No answer");
        }
      }, 45000);
    }).catch(function (e) {
      // Neutral on purpose: a blocked caller must not learn they are blocked.
      endCall("Call nahi lag saki.");
    });
  };

  // ---------- accept an incoming call ----------
  JC.acceptCall = function () {
    if (!callDocRef || callState !== "ringing") return;
    setCallState("Connecting…");
    $("callButtonsIncoming").classList.add("hidden");
    $("callButtonsActive").classList.remove("hidden");
    getLocalMedia(callKind).then(function (stream) {
      localStream = stream;
      localVideo().srcObject = callKind === "video" ? stream : null;
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
    callDocRef.update({ status: "declined" }).catch(function () {});
    endCall("Call declined");
  };

  JC.endCall = function () { endCall("Call ended"); };

  function endCall(reason) {
    if (callDocRef && callState !== "idle") {
      callDocRef.update({ status: "ended", endedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
    }
    if (callTimer) { clearTimeout(callTimer); callTimer = null; }
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; }
    if (callUnsub) { callUnsub(); callUnsub = null; }
    if (answerUnsub) { answerUnsub(); answerUnsub = null; }
    if (candUnsub) { candUnsub(); candUnsub = null; }
    remoteVideo().srcObject = null;
    localVideo().srcObject = null;
    remoteAudio().srcObject = null;
    callState = "idle";
    callId = null; callDocRef = null; callRole = null; callOtherUid = null;
    muted = false; videoOff = false; callSeconds = 0;
    $("btnMute").classList.remove("off");
    $("btnVideoOff").classList.remove("off");
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
    conn.onicecandidate = function (e) {
      if (!e.candidate || !callDocRef) return;
      var sub = callRole === "caller" ? "callerCandidates" : "calleeCandidates";
      callDocRef.collection(sub).add({
        candidate: e.candidate.candidate,
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex
      }).catch(function () {});
    };
    conn.ontrack = function (e) {
      var stream = e.streams && e.streams[0];
      if (!stream) return;
      if (callKind === "video") remoteVideo().srcObject = stream;
      else remoteAudio().srcObject = stream;
    };
    conn.oniceconnectionstatechange = function () {
      var s = conn.iceConnectionState;
      if (s === "connected" || s === "completed") onConnected();
      if (s === "failed" || s === "disconnected") {
        // STUN-only: this is the common mobile-NAT failure. Say so plainly.
        endCall("Call failed to connect — the network blocked the call. Try again on Wi-Fi.");
      }
    };
    return conn;
  }

  function onConnected() {
    if (callState === "active") return;
    if (callTimer) { clearTimeout(callTimer); callTimer = null; }
    callState = "active";
    callSeconds = 0;
    setCallState("00:00");
    callTimer = setInterval(function () {
      callSeconds++;
      var m = Math.floor(callSeconds / 60), s = callSeconds % 60;
      setCallState((m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s);
    }, 1000);
  }

  function getLocalMedia(kind) {
    var constraints = kind === "video"
      ? { audio: true, video: { facingMode: facingMode } }
      : { audio: true, video: false };
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  // ---------- in-call buttons ----------
  function toggleMute() {
    if (!localStream) return;
    muted = !muted;
    localStream.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
    $("btnMute").classList.toggle("off", muted);
    $("btnMute").textContent = muted ? "Muted" : "🎤";
  }
  function toggleVideo() {
    if (!localStream || callKind !== "video") return;
    videoOff = !videoOff;
    localStream.getVideoTracks().forEach(function (t) { t.enabled = !videoOff; });
    $("btnVideoOff").classList.toggle("off", videoOff);
  }
  function flipCamera() {
    if (!localStream || callKind !== "video" || !pc) return;
    facingMode = facingMode === "user" ? "environment" : "user";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } }).then(function (newStream) {
      var newTrack = newStream.getVideoTracks()[0];
      var sender = pc.getSenders().find(function (s) { return s.track && s.track.kind === "video"; });
      if (sender) sender.replaceTrack(newTrack);
      var oldTrack = localStream.getVideoTracks()[0];
      if (oldTrack) oldTrack.stop();
      localStream.removeTrack(oldTrack);
      localStream.addTrack(newTrack);
      localVideo().srcObject = localStream;
    }).catch(function (e) { JC.toast("Could not flip camera: " + e.message); });
  }
  function toggleSpeaker() {
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

  // ---------- wire UI ----------
  document.addEventListener("DOMContentLoaded", function () {
    $("btnVoiceCall").addEventListener("click", function () { JC.startCall("voice"); });
    $("btnVideoCall").addEventListener("click", function () { JC.startCall("video"); });
    $("btnAccept").addEventListener("click", JC.acceptCall);
    $("btnDecline").addEventListener("click", JC.declineCall);
    $("btnEndCall").addEventListener("click", JC.endCall);
    $("btnMute").addEventListener("click", toggleMute);
    $("btnVideoOff").addEventListener("click", toggleVideo);
    $("btnCamFlipCall").addEventListener("click", flipCamera);
    $("btnSpeaker").addEventListener("click", toggleSpeaker);
  });
})();
