// Jilan Chat v1.0 — camera.js
// In-app filter camera: getUserMedia live <video> + 4 colour filters ONLY.
// Filter strings are the intended Snapcam meanings (see RECON-camera-webrtc.md
// section 1.5 — do NOT copy Snapcam's buggy hardware mapping where Beauty
// applied Sepia, Sunset applied Mono and Mono applied Negative).
//
//   Normal  none
//   Beauty  brightness(1.15) saturate(1.25) contrast(0.95)
//   Sunset  sepia(0.5) saturate(1.6) hue-rotate(-15deg)
//   Mono    grayscale(1)
//
// The same string is set as CSS on <video> (live preview) and as ctx.filter
// on the canvas at capture, so the saved photo matches the preview.
// Front camera: the capture is drawn mirrored, same as Snapcam's uprightBitmap.
// AR face filters (Dog Ears / Glasses / Crown) are DEFERRED to v1.1 — they
// need face landmarks, which CSS alone cannot provide.

(function () {
  var JC = window.JC = window.JC || {};
  var stream = null;
  var facingMode = "user";      // front camera first (Snapcam default)
  var currentFilter = "none";
  var video = null;

  function stopStream() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  }

  JC.openCamera = function () {
    if (!JC.currentChatId) { JC.toast("Open a chat first, then take a photo for it."); return; }
    JC.showScreen("screen-camera");
    video = document.getElementById("camVideo");
    startCamera();
  };

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      JC.toast("Camera is not supported on this device.");
      JC.showScreen("screen-chat");
      return;
    }
    stopStream();
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode }, audio: false })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        applyFilter(currentFilter);
      })
      .catch(function (e) {
        JC.toast("Camera blocked: " + e.message + ". Allow camera permission in the app settings.");
        JC.showScreen("screen-chat");
      });
  }

  function applyFilter(f) {
    currentFilter = f;
    if (video) video.style.filter = f;
    document.querySelectorAll("#filterRow .filter-pill").forEach(function (p) {
      p.classList.toggle("active", p.dataset.filter === f);
    });
  }

  JC.capturePhoto = function () {
    if (!video || !video.videoWidth) { JC.toast("Camera is not ready yet."); return; }
    var w = video.videoWidth, h = video.videoHeight;
    // v4.4: no Storage (Blaze nahi). Photo is shrunk step by step until it
    // fits inside the message (~200 KB), with the filter baked in and the
    // front camera mirrored like the preview.
    JC.sourceToDataUrl(video, w, h, function (dataUrl) {
      stopStream();
      JC.showScreen("screen-chat");
      JC.sendImageDataUrl(dataUrl, Date.now() + "_camera.jpg");
    }, currentFilter, facingMode === "user");
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("#filterRow .filter-pill").forEach(function (p) {
      p.addEventListener("click", function () { applyFilter(p.dataset.filter); });
    });
    document.getElementById("btnCapture").addEventListener("click", JC.capturePhoto);
    document.getElementById("btnFlip").addEventListener("click", function () {
      facingMode = facingMode === "user" ? "environment" : "user";
      startCamera();
    });
    document.getElementById("btnCamClose").addEventListener("click", function () {
      stopStream();
      JC.showScreen("screen-chat");
    });
  });
})();
