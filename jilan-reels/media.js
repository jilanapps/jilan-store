/* Jilan Reels v1.0 — media.js
 * Video checks, in-browser compression and the Cloudinary upload.
 * The Cloudinary preset has NO size limit, so every limit is enforced here
 * BEFORE upload: <= 30 s, re-encode big files to a 960 px box at
 * ~350-900 kbps (aim 2-3 MB), refuse anything still over 20 MB.
 * Exposes window.JRMedia.
 */
(function () {
  'use strict';
  var L = window.JRLib;
  var M = window.JRMedia = {};

  M.pickMime = function () {
    var c = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
    for (var i = 0; i < c.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i];
    }
    return '';
  };

  // Read width/height/duration of a picked file. Recorded webm often has
  // duration Infinity — the caller passes knownDuration in that case.
  M.probe = function (blob) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(blob), v = document.createElement('video');
      var done = false, finish = function (fn, val) { if (done) return; done = true; fn(val); };
      v.preload = 'metadata'; v.muted = true; v.playsInline = true; v.src = url;
      v.onloadedmetadata = function () {
        var d = v.duration;
        if (d === Infinity || !isFinite(d)) {
          // force the browser to work out the real length
          v.currentTime = 1e7;
          v.ontimeupdate = function () { v.ontimeupdate = null; finish(res, { width: v.videoWidth, height: v.videoHeight, duration: isFinite(v.duration) ? v.duration : 0, url: url }); };
          setTimeout(function () { finish(res, { width: v.videoWidth, height: v.videoHeight, duration: 0, url: url }); }, 3000);
          return;
        }
        finish(res, { width: v.videoWidth, height: v.videoHeight, duration: d, url: url });
      };
      v.onerror = function () {
        // metadata already read: an error during the "find real length" seek is harmless (caller passes knownDuration)
        if (v.videoWidth) finish(res, { width: v.videoWidth, height: v.videoHeight, duration: isFinite(v.duration) ? v.duration : 0, url: url });
        else finish(rej, new Error("This video can't be played here."));
      };
      setTimeout(function () { finish(rej, new Error("This video can't be read.")); }, 15000);
    });
  };

  // Re-encode by playing the video into a canvas (real time, <= 30 s).
  // Audio is routed through Web Audio so nothing plays on the speaker.
  M.compress = function (blob, info, onProgress) {
    return new Promise(function (res, rej) {
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return rej(new Error('no-recorder'));
      var plan = L.planCompression(blob.size, info.width, info.height, info.duration || L.MAX_SEC);
      var v = document.createElement('video');
      v.src = info.url; v.playsInline = true; v.crossOrigin = 'anonymous';
      var canvas = document.createElement('canvas'); canvas.width = plan.width; canvas.height = plan.height;
      var ctx = canvas.getContext('2d');
      var stream = canvas.captureStream(30), ac = null;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          ac = new AC();
          var src = ac.createMediaElementSource(v), dest = ac.createMediaStreamDestination();
          src.connect(dest);
          dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
        }
      } catch (e) { ac = null; }
      var mime = M.pickMime(), chunks = [], rec;
      try {
        rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: plan.videoBitsPerSecond, audioBitsPerSecond: plan.audioBitsPerSecond } : undefined);
      } catch (e) { return rej(e); }
      var raf = 0, stopAt = Math.min(info.duration || L.MAX_SEC, L.MAX_SEC);
      var cleanup = function () { cancelAnimationFrame(raf); try { v.pause(); } catch (e) {} try { if (ac) ac.close(); } catch (e) {} stream.getTracks().forEach(function (t) { t.stop(); }); };
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        cleanup();
        var out = new Blob(chunks, { type: (rec.mimeType || mime || 'video/webm').split(';')[0] });
        if (out.size < 1000) return rej(new Error('compress-empty'));
        res(out);
      };
      var draw = function () {
        try { ctx.drawImage(v, 0, 0, plan.width, plan.height); } catch (e) {}
        if (onProgress && stopAt) onProgress(Math.min(1, v.currentTime / stopAt));
        if (v.ended || v.currentTime >= stopAt) { if (rec.state === 'recording') rec.stop(); return; }
        raf = requestAnimationFrame(draw);
      };
      v.onended = function () { if (rec.state === 'recording') rec.stop(); };
      v.onerror = function () { cleanup(); rej(new Error('compress-play')); };
      v.oncanplay = function () {
        v.oncanplay = null;
        rec.start(500);
        var p = v.play();
        if (p && p.catch) p.catch(function (e) { cleanup(); rej(e); });
        if (ac && ac.resume) ac.resume();
        draw();
      };
      setTimeout(function () { if (rec.state === 'recording') rec.stop(); }, (stopAt + 8) * 1000);
    });
  };

  // Decide + run compression. Returns {blob, compressed}.
  M.prepare = function (blob, knownDuration, onProgress) {
    // Some phones (Android WebView) can't open a 2nd decoder while the preview
    // plays, so the probe fails on a file that already played fine. Then just
    // upload the original if it is small enough (Cloudinary checks length).
    try { var pv = document.getElementById('previewVideo'); if (pv) pv.pause(); } catch (e) {}
    return M.probe(blob).catch(function (e) {
      if (blob.size <= L.HARD_MAX_BYTES) return { fallback: true };
      throw e;
    }).then(function (info) {
      if (info.fallback) return { blob: blob, compressed: false, duration: knownDuration || 0 };
      if (knownDuration) info.duration = knownDuration;
      if (info.duration && info.duration > L.MAX_SEC + 0.5) throw new Error('Please choose a video of 60 seconds or less.');
      var plan = L.planCompression(blob.size, info.width, info.height, info.duration || L.MAX_SEC);
      if (!plan.compress) return { blob: blob, compressed: false, duration: info.duration };
      return M.compress(blob, info, onProgress).then(function (out) {
        // keep the original if re-encoding did not help
        if (out.size >= blob.size && blob.size <= L.HARD_MAX_BYTES) return { blob: blob, compressed: false, duration: info.duration };
        return { blob: out, compressed: true, duration: info.duration };
      }, function () {
        return { blob: blob, compressed: false, duration: info.duration };
      });
    }).then(function (r) {
      if (r.blob.size > L.HARD_MAX_BYTES) throw new Error('This video is too big (over 20 MB). Please choose a shorter or smaller one.');
      return r;
    });
  };

  // Unsigned upload with progress. Resolves with JRLib.pickUpload(...).
  // One automatic retry if the connection drops.
  M.upload = function (blob, onProgress) {
    return M.upload1(blob, onProgress).catch(function (e) {
      if (!e || !e.netFail) throw e;
      return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return M.upload1(blob, onProgress); });
    });
  };
  M.upload1 = function (blob, onProgress) {
    var c = window.JR_CLOUDINARY || {};
    return new Promise(function (res, rej) {
      if (!c.cloudName || /PLACEHOLDER/.test(c.cloudName)) return rej(new Error("Video upload isn't set up yet."));
      if (blob.size > L.HARD_MAX_BYTES) return rej(new Error('This video is too big (over 20 MB).'));
      var fd = new FormData();
      var ext = /mp4/.test(blob.type) ? 'mp4' : (/quicktime/.test(blob.type) ? 'mov' : 'webm');
      fd.append('file', blob, 'reel.' + ext);
      fd.append('upload_preset', c.uploadPreset);
      var x = new XMLHttpRequest();
      x.open('POST', L.cloudinaryUploadUrl(c.cloudName));
      x.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      x.onload = function () {
        var j = null; try { j = JSON.parse(x.responseText); } catch (e) {}
        if (x.status >= 200 && x.status < 300 && j) {
          try {
            var up = L.pickUpload(j, c.cloudName);
            if (up.duration > L.MAX_SEC + 1) return rej(new Error('Video is longer than 60 seconds.'));
            if (!up.duration) up.duration = 1;
            res(up);
          } catch (e) { rej(e); }
        } else rej(new Error('Upload failed' + (j && j.error && j.error.message ? ': ' + j.error.message : '. Please try again.')));
      };
      x.onerror = function () { var er = new Error('Upload failed. Check your internet.'); er.netFail = true; rej(er); };
      x.ontimeout = function () { rej(new Error('Upload timed out. Please try again.')); };
      x.timeout = 10 * 60 * 1000;
      x.send(fd);
    });
  };

  // Square 128 px JPEG for the profile photo (fits the 20,000-char rule).
  M.photoDataUrl = function (file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas');
        c.width = c.height = 128;
        c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 128, 128);
        URL.revokeObjectURL(url);
        var q = 0.8, out = c.toDataURL('image/jpeg', q);
        while (out.length > 19000 && q > 0.3) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        if (out.length > 19500) return rej(new Error('Photo is too detailed. Try another.'));
        res(out);
      };
      img.onerror = function () { rej(new Error("This photo can't be opened.")); };
      img.src = url;
    });
  };
})();
