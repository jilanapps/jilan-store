/* Jilan Reels — fx.js (live filter camera)
 * Draws the camera onto a canvas every frame with the chosen filter, so the
 * recording (canvas.captureStream + mic) carries the filter. Uses canvas
 * ctx.filter when the browser really applies it (Chrome / Android WebView),
 * otherwise a colour-matrix pixel fallback.
 */
(function () {
  'use strict';
  var FX = {};
  // css: colour part; ov: overlay drawn after the colour part.
  FX.list = [
    { id: 'normal', name: 'Normal', css: '' },
    { id: 'vivid', name: 'Vivid', css: 'saturate(1.6) contrast(1.1)' },
    { id: 'warm', name: 'Warm', css: 'sepia(0.25) saturate(1.35) brightness(1.05)', ov: 'warm' },
    { id: 'cool', name: 'Cool', css: 'saturate(1.1) hue-rotate(12deg) brightness(1.03)', ov: 'cool' },
    { id: 'bw', name: 'B&W', css: 'grayscale(1) contrast(1.15)' },
    { id: 'sepia', name: 'Sepia', css: 'sepia(0.9) contrast(1.05)' },
    { id: 'vintage', name: 'Vintage', css: 'sepia(0.4) contrast(0.92) brightness(1.06) saturate(0.85)', ov: 'vignette' },
    { id: 'fade', name: 'Fade', css: 'contrast(0.8) brightness(1.12) saturate(0.7)', ov: 'wash' },
    { id: 'beauty', name: 'Beauty', css: 'brightness(1.08) saturate(1.1)', ov: 'glow' },
    { id: 'neon', name: 'Neon', css: 'saturate(2.2) contrast(1.3) hue-rotate(-15deg)', ov: 'neon' },
    { id: 'vhs', name: 'Retro VHS', css: 'saturate(1.3) contrast(1.1) brightness(1.05)', ov: 'vhs' },
    { id: 'dramatic', name: 'Dramatic', css: 'contrast(1.5) saturate(1.2) brightness(0.9)', ov: 'vignette2' },
    { id: 'cinema', name: 'Cinema', css: 'contrast(1.15) saturate(1.1) sepia(0.15)', ov: 'bars' },
    { id: 'mirror', name: 'Mirror', css: '', ov: 'mirror' },
    { id: 'hearts', name: 'Hearts', css: 'brightness(1.05) saturate(1.15)', ov: 'hearts' },
    { id: 'sparkle', name: 'Sparkle', css: 'brightness(1.06) saturate(1.2)', ov: 'sparkle' }
  ];
  FX.byId = function (id) { for (var i = 0; i < FX.list.length; i++) if (FX.list[i].id === id) return FX.list[i]; return FX.list[0]; };

  /* ---- does ctx.filter really work? (draw red with grayscale, read back) ---- */
  FX.nativeFilter = (function () {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 2;
      var s = document.createElement('canvas'); s.width = s.height = 2;
      var sx = s.getContext('2d'); sx.fillStyle = '#ff0000'; sx.fillRect(0, 0, 2, 2);
      var x = c.getContext('2d'); if (!('filter' in x)) return false;
      x.filter = 'grayscale(1)'; x.drawImage(s, 0, 0);
      var d = x.getImageData(0, 0, 1, 1).data;
      return Math.abs(d[0] - d[1]) < 10;
    } catch (e) { return false; }
  })();

  /* ---- colour-matrix fallback (same maths as the CSS filter spec) ---- */
  function mul(a, b) { // 4x5 matrices as length-20 arrays (rows r,g,b,a)
    var o = new Array(20);
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 5; c++) {
        var v = c === 4 ? a[r * 5 + 4] : 0;
        for (var k = 0; k < 4; k++) v += a[r * 5 + k] * (c === 4 ? b[k * 5 + 4] : b[k * 5 + c]);
        if (c !== 4) { /* already summed */ }
        o[r * 5 + c] = v;
      }
    }
    return o;
  }
  var ID = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  function opMatrix(name, v) {
    var s, a;
    switch (name) {
      case 'grayscale': s = 1 - Math.min(1, v);
        return [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0, 0,
          0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0, 0,
          0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s, 0, 0, 0, 0, 0, 1, 0];
      case 'sepia': s = 1 - Math.min(1, v);
        return [0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s, 0, 0,
          0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s, 0, 0,
          0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s, 0, 0, 0, 0, 0, 1, 0];
      case 'saturate': s = v;
        return [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0,
          0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0,
          0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0, 0, 0, 0, 0, 1, 0];
      case 'hue-rotate': a = v * Math.PI / 180; var co = Math.cos(a), si = Math.sin(a);
        return [0.213 + co * 0.787 - si * 0.213, 0.715 - co * 0.715 - si * 0.715, 0.072 - co * 0.072 + si * 0.928, 0, 0,
          0.213 - co * 0.213 + si * 0.143, 0.715 + co * 0.285 + si * 0.140, 0.072 - co * 0.072 - si * 0.283, 0, 0,
          0.213 - co * 0.213 - si * 0.787, 0.715 - co * 0.715 + si * 0.715, 0.072 + co * 0.928 + si * 0.072, 0, 0, 0, 0, 0, 1, 0];
      case 'brightness': return [v, 0, 0, 0, 0, 0, v, 0, 0, 0, 0, 0, v, 0, 0, 0, 0, 0, 1, 0];
      case 'contrast': var t = 0.5 - 0.5 * v; // offset in 0..1 units
        return [v, 0, 0, 0, t, 0, v, 0, 0, t, 0, 0, v, 0, t, 0, 0, 0, 1, 0];
    }
    return ID.slice();
  }
  var matCache = {};
  function cssMatrix(css) {
    if (matCache[css]) return matCache[css];
    var m = ID.slice(), re = /([a-z-]+)\(([-\d.]+)/g, r;
    while ((r = re.exec(css))) m = mul(opMatrix(r[1], parseFloat(r[2])), m);
    return (matCache[css] = m);
  }
  function applyMatrix(ctx, w, h, css) {
    if (!css) return;
    var m = cssMatrix(css), img = ctx.getImageData(0, 0, w, h), d = img.data;
    var a0 = m[0], a1 = m[1], a2 = m[2], a4 = m[4] * 255, b0 = m[5], b1 = m[6], b2 = m[7], b4 = m[9] * 255, c0 = m[10], c1 = m[11], c2 = m[12], c4 = m[14] * 255;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      d[i] = a0 * r + a1 * g + a2 * b + a4; d[i + 1] = b0 * r + b1 * g + b2 * b + b4; d[i + 2] = c0 * r + c1 * g + c2 * b + c4;
    }
    ctx.putImageData(img, 0, 0);
  }
  FX._cssMatrix = cssMatrix;

  /* ---- overlays ---- */
  var particles = null;
  function initParticles(kind, w, h) {
    particles = { kind: kind, p: [] };
    for (var i = 0; i < (kind === 'hearts' ? 14 : 26); i++) {
      particles.p.push({ x: Math.random() * w, y: Math.random() * h, s: 0.6 + Math.random() * 0.9, v: 0.4 + Math.random() * 1.1, ph: Math.random() * 6.28 });
    }
  }
  function heart(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
    ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); ctx.fill();
  }
  function star(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
  }
  function vignette(ctx, w, h, strength) {
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + strength + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  var glowC = null;
  function overlay(ctx, kind, w, h, t, mirrored) {
    switch (kind) {
      case 'warm': ctx.fillStyle = 'rgba(255,140,40,0.10)'; ctx.fillRect(0, 0, w, h); break;
      case 'cool': ctx.fillStyle = 'rgba(40,120,255,0.12)'; ctx.fillRect(0, 0, w, h); break;
      case 'wash': ctx.fillStyle = 'rgba(255,250,240,0.12)'; ctx.fillRect(0, 0, w, h); break;
      case 'vignette': vignette(ctx, w, h, 0.55); break;
      case 'vignette2': vignette(ctx, w, h, 0.8); break;
      case 'glow': // soft-glow: blur a small copy and screen it on top
        if (!glowC) glowC = document.createElement('canvas');
        glowC.width = Math.max(8, Math.round(w / 6)); glowC.height = Math.max(8, Math.round(h / 6));
        var g = glowC.getContext('2d'); g.drawImage(ctx.canvas, 0, 0, glowC.width, glowC.height);
        ctx.save(); ctx.globalAlpha = 0.45; ctx.globalCompositeOperation = 'screen'; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(glowC, 0, 0, w, h); ctx.restore();
        ctx.fillStyle = 'rgba(255,190,210,0.07)'; ctx.fillRect(0, 0, w, h); break;
      case 'neon':
        var ng = ctx.createLinearGradient(0, 0, w, h);
        ng.addColorStop(0, 'rgba(255,0,200,0.22)'); ng.addColorStop(1, 'rgba(0,230,255,0.22)');
        ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ng; ctx.fillRect(0, 0, w, h); ctx.restore();
        ctx.save(); ctx.strokeStyle = 'rgba(255,60,220,0.9)'; ctx.lineWidth = Math.max(4, w / 90); ctx.shadowColor = '#ff3cdc'; ctx.shadowBlur = 18;
        ctx.strokeRect(w * 0.04, h * 0.03, w * 0.92, h * 0.94); ctx.restore(); break;
      case 'vhs':
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.18;
        ctx.drawImage(ctx.canvas, 4, 0); ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        for (var y = (t / 40 | 0) % 4; y < h; y += 4) ctx.fillRect(0, y, w, 1);
        var bandY = (t / 12) % (h + 60) - 30; ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(0, bandY, w, 24);
        ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(w / 18) + 'px monospace'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        if ((t / 600 | 0) % 2 === 0) ctx.fillText('PLAY \u25B6', w * 0.06, h * 0.08);
        var d = new Date(); ctx.fillText(('0' + (d.getMonth() + 1)).slice(-2) + '.' + ('0' + d.getDate()).slice(-2) + '.' + d.getFullYear(), w * 0.06, h * 0.94);
        ctx.shadowBlur = 0; break;
      case 'bars': var bh = Math.round(h * 0.11); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, bh); ctx.fillRect(0, h - bh, w, bh); break;
      case 'mirror': // right half shows the left half flipped
        ctx.save(); ctx.translate(w, 0); ctx.scale(-1, 1);
        ctx.drawImage(ctx.canvas, 0, 0, w / 2, h, 0, 0, w / 2, h); ctx.restore(); break;
      case 'hearts': case 'sparkle':
        if (!particles || particles.kind !== kind) initParticles(kind, w, h);
        ctx.save();
        particles.p.forEach(function (p) {
          if (kind === 'hearts') {
            p.y -= p.v * 1.6; if (p.y < -40) { p.y = h + 20; p.x = Math.random() * w; }
            ctx.globalAlpha = 0.75; ctx.fillStyle = p.s > 1.1 ? '#ff4d7d' : '#ff8fb1';
            heart(ctx, p.x + Math.sin(t / 500 + p.ph) * 12, p.y, (w / 16) * p.s);
          } else {
            var a = 0.5 + 0.5 * Math.sin(t / 220 + p.ph); ctx.globalAlpha = a; ctx.fillStyle = p.s > 1.1 ? '#fff6c2' : '#ffffff';
            star(ctx, p.x, p.y, (w / 40) * p.s * (0.6 + a * 0.6));
            if (a < 0.03) { p.x = Math.random() * w; p.y = Math.random() * h; }
          }
        });
        ctx.restore(); break;
    }
  }

  /* ---- engine ---- */
  FX.Engine = function (canvas, video) {
    this.canvas = canvas; this.video = video; this.ctx = canvas.getContext('2d', { willReadFrequently: !FX.nativeFilter });
    this.filter = 'normal'; this.mirror = false; this.raf = 0; this.running = false; this.frames = 0;
  };
  FX.Engine.prototype.size = function () {
    // Keep the camera's own shape (no cropping) and draw ~540 px on the short side.
    var vw = this.video.videoWidth, vh = this.video.videoHeight;
    if (!vw || !vh) return false;
    var s = Math.min(1, 540 / Math.min(vw, vh));
    var w = Math.round(vw * s / 2) * 2, h = Math.round(vh * s / 2) * 2;
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; particles = null; }
    return true;
  };
  FX.Engine.prototype.draw = function (t) {
    if (!this.size()) return;
    var c = this.ctx, w = this.canvas.width, h = this.canvas.height, f = FX.byId(this.filter);
    c.save();
    if (this.mirror) { c.translate(w, 0); c.scale(-1, 1); }
    if (FX.nativeFilter) c.filter = f.css || 'none';
    c.drawImage(this.video, 0, 0, w, h);
    c.restore(); c.filter = 'none';
    if (!FX.nativeFilter && f.css) applyMatrix(c, w, h, f.css);
    if (f.ov) overlay(c, f.ov, w, h, t || 0, this.mirror);
    this.frames++;
  };
  FX.Engine.prototype.start = function () {
    var self = this; if (this.running) return; this.running = true;
    var loop = function (t) { if (!self.running) return; try { self.draw(t); } catch (e) {} self.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  };
  FX.Engine.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };
  FX.Engine.prototype.stream = function (fps) { return this.canvas.captureStream ? this.canvas.captureStream(fps || 30) : null; };

  /* ---- small thumbnails for the strip (refreshed a few times a second) ---- */
  FX.thumb = function (canvas, video, f, mirror, t) {
    var vw = video.videoWidth, vh = video.videoHeight; if (!vw) return;
    var w = canvas.width, h = canvas.height, x = canvas.getContext('2d', { willReadFrequently: !FX.nativeFilter });
    var s = Math.max(w / vw, h / vh), dw = vw * s, dh = vh * s; // cover inside the little tile
    x.save(); if (mirror) { x.translate(w, 0); x.scale(-1, 1); }
    if (FX.nativeFilter) x.filter = f.css || 'none';
    x.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh); x.restore(); x.filter = 'none';
    if (!FX.nativeFilter && f.css) applyMatrix(x, w, h, f.css);
    if (f.ov && f.ov !== 'hearts' && f.ov !== 'sparkle' && f.ov !== 'vhs') overlay(x, f.ov, w, h, t || 0, mirror);
    else if (f.ov === 'hearts') { x.fillStyle = '#ff4d7d'; heart(x, w * 0.3, h * 0.2, w * 0.25); heart(x, w * 0.72, h * 0.6, w * 0.2); }
    else if (f.ov === 'sparkle') { x.fillStyle = '#fff'; star(x, w * 0.3, h * 0.3, w * 0.12); star(x, w * 0.7, h * 0.65, w * 0.09); }
    else if (f.ov === 'vhs') { x.fillStyle = 'rgba(0,0,0,0.25)'; for (var y = 0; y < h; y += 3) x.fillRect(0, y, w, 1); }
  };

  window.JRFx = FX;
})();
