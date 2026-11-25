/* Jilan Reels v1.3 — studio.js (create tools)
 * Countdown, speed, sounds / duet / stitch while recording, and the preview
 * editor: trim, cover, text + stickers, captions, voice-over, filters,
 * green screen, product link, schedule, drafts and photo slideshow.
 * Everything runs on the phone (canvas + WebAudio + MediaRecorder). No paid service.
 * Exposes window.JRS. app.js calls the hooks only if JRS exists.
 */
(function () {
  'use strict';
  var L = window.JRLib, Api = window.JRApi, M = window.JRMedia, FX = window.JRFx;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = L.esc;
  function JR() { return window.JR; }
  function toast(t) { JR().toast(t); }
  var AC = window.AudioContext || window.webkitAudioContext;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  /* ================= state ================= */
  var S = {
    timer: 0, speed: 1, cc: false,
    remix: null,      // {type:'duet'|'stitch'|'sound', v: video}
    ed: null,         // editor state for the current preview
    draftId: null
  };
  function freshEd(picked) {
    var cam = S.fromCam; S.fromCam = false; // camera speed only applies to a clip just recorded
    return { picked: picked, dur: 0, trim: [0, 0], speed: cam ? S.speed : 1, cover: 0, items: [], captions: (cam && S.liveCaps) || [], voice: null,
      filter: 'normal', gs: null, gsMode: '', link: null, publishAt: 0, allowRemix: true, sound: null };
  }

  /* ================= camera tools (timer / speed / captions) ================= */
  var tools = null;
  function camTools() {
    if (tools) return tools;
    var rec = $('#createRec'); if (!rec) return null;
    tools = document.createElement('div'); tools.className = 'cam-tools';
    tools.innerHTML = '<button data-t="torch"><b>Off</b><span>Flash</span></button>' +
      '<button data-t="timer"><b>Off</b><span>Timer</span></button>' +
      '<button data-t="speed"><b>1x</b><span>Speed</span></button>' +
      '<button data-t="cc"><b>Off</b><span>Captions</span></button>' +
      '<button data-t="slides"><b><svg viewBox="0 0 24 24"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3h14v14"/></svg></b><span>Photos</span></button>' +
      '<button data-t="drafts"><b><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/></svg></b><span>Drafts</span></button>';
    rec.appendChild(tools);
    var cd = document.createElement('div'); cd.className = 'countdown hidden'; cd.id = 'jrsCount'; rec.appendChild(cd);
    var lab = document.createElement('div'); lab.className = 'remix-label hidden'; lab.id = 'jrsRemixLabel'; rec.appendChild(lab);
    tools.addEventListener('click', function (e) {
      e.stopPropagation();
      var b = e.target.closest('button'); if (!b || JR().isRecording()) return;
      var t = b.dataset.t;
      if (t === 'torch') { setTorch(!S.torch); return; }
      if (t === 'slides' || t === 'drafts') { if (JR().isRecording && JR().isRecording()) return; var keep = S.remix && S.remix.type === 'sound' ? S.remix : null; JR().stopCam(); JR().resetCreate(); S.remix = keep; if (t === 'slides') slideshow(); else openDrafts(); return; }
      if (t === 'timer') S.timer = S.timer === 0 ? 3 : S.timer === 3 ? 10 : 0;
      if (t === 'speed') S.speed = S.speed === 1 ? 0.5 : S.speed === 0.5 ? 2 : 1;
      if (t === 'cc') {
        if (!SR) { toast('Auto captions are not supported on this phone. You can type captions after recording.'); S.cc = false; }
        else S.cc = !S.cc;
      }
      paintTools();
      if (t === 'speed' && S.speed !== 1) toast(S.speed === 0.5 ? 'Slow motion: the video will play at half speed after you record.' : 'Fast: the video will play at double speed after you record.');
    });
    paintTools();
    return tools;
  }
  function paintTools() {
    if (!tools) return;
    $('[data-t=timer] b', tools).textContent = S.timer ? S.timer + 's' : 'Off';
    $('[data-t=torch] b', tools).textContent = S.torch ? 'On' : 'Off';
    $('[data-t=speed] b', tools).textContent = S.speed + 'x';
    $('[data-t=cc] b', tools).textContent = S.cc ? 'On' : 'Off';
    $$('button', tools).forEach(function (b) { var t = b.dataset.t; b.classList.toggle('on', (t === 'torch' && S.torch) || (t === 'timer' && S.timer) || (t === 'speed' && S.speed !== 1) || (t === 'cc' && S.cc)); });
  }
  var cdT = null;
  // Flash = the phone's torch on the back camera (not every phone or browser allows it)
  function camTrack() { var cs = JR().camStream && JR().camStream(); return cs && cs.getVideoTracks()[0]; }
  function torchOK() { var t = camTrack(); try { return !!(t && t.getCapabilities && t.getCapabilities().torch); } catch (e) { return false; } }
  function setTorch(on) {
    var t = camTrack();
    if (on && !torchOK()) { S.torch = false; paintTools(); toast(JR().camFacing() === 'user' ? 'Flash works with the back camera. Tap Flip first.' : 'Flash is not supported on this phone.'); return; }
    if (!t) { S.torch = false; paintTools(); return; }
    t.applyConstraints({ advanced: [{ torch: !!on }] }).then(function () { S.torch = !!on; paintTools(); }, function () { S.torch = false; paintTools(); toast('Flash is not supported on this phone.'); });
  }
  function counting() { return !!cdT; }
  function cancelCountdown() { clearInterval(cdT); cdT = null; var c = $('#jrsCount'); if (c) c.classList.add('hidden'); }
  function countdown(go) {
    if (!S.timer) return false;
    var n = S.timer, c = $('#jrsCount');
    c.textContent = n; c.classList.remove('hidden');
    cdT = setInterval(function () {
      n--;
      if (n <= 0) { cancelCountdown(); go(); return; }
      c.textContent = n;
    }, 1000);
    return true;
  }

  /* ================= sound / duet / stitch while recording ================= */
  var rx = null; // live remix session
  function startRemix(type, v) {
    if (type !== 'sound' && v.allowRemix === false) { toast('The creator turned off duet and stitch for this video.'); return; }
    JR().requireLogin(function () {
      JR().openCreate();
      S.remix = { type: type, v: v };
      setTimeout(function () { var b = $('#btnRecord'); if (b) b.click(); }, 60);
    });
  }
  function remixLabel() {
    var lab = $('#jrsRemixLabel'); if (!lab) return;
    if (!S.remix) { lab.classList.add('hidden'); return; }
    var r = S.remix, u = '@' + r.v.ownerUsername;
    lab.textContent = r.type === 'duet' ? 'Duet with ' + u : r.type === 'stitch' ? 'Stitch: first 5 s of ' + u + ' plays first' : 'Sound: ' + (r.v.soundName || ('Original sound - ' + r.v.ownerName));
    lab.classList.remove('hidden');
  }
  function srcVideo(v) {
    var el = document.createElement('video');
    el.crossOrigin = 'anonymous'; el.playsInline = true; el.setAttribute('playsinline', ''); el.preload = 'auto';
    el.src = v.video.url; return el;
  }
  // Called when the camera screen opens (after startCam).
  function onCamOpen() {
    camTools(); S.torch = false; paintTools(); remixLabel();
    stopRx();
    if (!S.remix) return;
    var cam = $('#camCanvas'), out = document.createElement('canvas');
    out.width = 540; out.height = 960; out.className = 'cam-canvas remix-canvas';
    cam.parentNode.insertBefore(out, cam.nextSibling);
    var orig = srcVideo(S.remix.v); orig.muted = true; orig.loop = S.remix.type !== 'stitch';
    rx = { out: out, ctx: out.getContext('2d'), orig: orig, phase: 'idle', raf: 0, t0: 0, actx: null, dest: null };
    if (S.remix.type === 'duet') orig.play().catch(function () {});
    if (S.remix.type === 'sound') { out.classList.add('hidden'); }
    var loop = function () {
      if (!rx) return;
      var c = rx.ctx, W = 540, H = 960, type = S.remix.type;
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      if (type === 'duet') { cover(c, cam, 0, 0, W / 2, H); cover(c, orig, W / 2, 0, W / 2, H); }
      else if (type === 'stitch') {
        if (rx.phase === 'orig') { cover(c, orig, 0, 0, W, H); if (orig.currentTime >= Math.min(5, orig.duration || 5) || orig.ended) { rx.phase = 'cam'; orig.pause(); } }
        else cover(c, cam, 0, 0, W, H);
      } else cover(c, cam, 0, 0, W, H);
      rx.raf = requestAnimationFrame(loop);
    };
    rx.raf = requestAnimationFrame(loop);
  }
  function cover(c, src, x, y, w, h) {
    var sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
    if (!sw || !sh) return;
    var s = Math.max(w / sw, h / sh), cw = w / s, ch = h / s;
    try { c.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h); } catch (e) {}
  }
  function stopRx() {
    if (!rx) return;
    cancelAnimationFrame(rx.raf);
    try { rx.orig.pause(); rx.orig.removeAttribute('src'); rx.orig.load(); } catch (e) {}
    if (rx.out && rx.out.parentNode) rx.out.parentNode.removeChild(rx.out);
    if (rx.actx) { try { rx.actx.close(); } catch (e) {} }
    rx = null;
  }
  // Inside the shutter tap (user gesture): make the AudioContext now so it may play.
  function prime(camStream) {
    if (!rx || rx.actx || !AC) return;
    try {
      var a = new AC(), dest = a.createMediaStreamDestination();
      var mic = a.createMediaStreamSource(new MediaStream(camStream.getAudioTracks()));
      mic.connect(dest);
      rx.orig.muted = false;
      var os = a.createMediaElementSource(rx.orig), g = a.createGain(); g.gain.value = 0.9;
      os.connect(g); g.connect(dest); g.connect(a.destination); // you hear it too (headphones avoid echo)
      rx.actx = a; rx.dest = dest;
    } catch (e) { console.warn('remix audio', e); }
  }
  function videoStream(cs) {
    if (!rx || S.remix.type === 'sound') return cs;
    return rx.out.captureStream ? rx.out.captureStream(30) : cs;
  }
  function audioTracks(camStream) {
    if (rx && rx.dest) return rx.dest.stream.getAudioTracks();
    return camStream.getAudioTracks();
  }
  var rec = null; // speech recognition during recording
  function onRecordStart(t0) {
    S.liveCaps = [];
    if (rx) {
      rx.t0 = t0;
      try { rx.orig.currentTime = 0; } catch (e) {}
      if (S.remix.type === 'stitch') rx.phase = 'orig';
      rx.orig.play().catch(function () {});
    }
    if (S.cc && SR) {
      try {
        rec = new SR(); rec.continuous = true; rec.interimResults = false; rec.lang = (window.JRI && JRI.lang() === 'ur') ? 'ur-PK' : 'en-US';
        var last = 0;
        rec.onresult = function (e) {
          for (var i = e.resultIndex; i < e.results.length; i++) {
            if (!e.results[i].isFinal) continue;
            var now = (Date.now() - t0) / 1000, txt = L.cleanText(e.results[i][0].transcript, 80);
            if (txt) S.liveCaps.push({ t0: Math.max(0, Math.min(last, now - 2)), t1: now + 0.6, text: txt });
            last = now;
          }
        };
        rec.onerror = function (e) { if (e.error !== 'no-speech') toast('Auto captions stopped (' + e.error + '). You can type them after recording.'); };
        rec.start();
      } catch (e) { rec = null; }
    }
  }
  function onRecordStop() {
    S.fromCam = true;
    if (rec) { try { rec.stop(); } catch (e) {} rec = null; }
    if (rx) { try { rx.orig.pause(); } catch (e) {} }
  }

  /* ================= preview editor ================= */
  var STICKERS = ['\u2764\ufe0f', '\ud83d\udd25', '\ud83d\ude02', '\ud83d\ude0d', '\ud83d\udc4d', '\u2728', '\ud83c\udf89', '\ud83d\ude4f', '\ud83c\udf39', '\ud83d\udcaf', 'WOW', 'LOL', 'OMG', 'NEW', 'SALE', 'MashaAllah'];
  var COLORS = ['#ffffff', '#ffd400', '#ff2d55', '#1f7ae0', '#00d27a', '#000000'];
  function onPreview(picked) {
    var ed = S.ed = Object.assign(freshEd(picked), S.pendingEd || {}); S.pendingEd = null;
    if (S.remix && S.remix.type === 'sound') ed.sound = S.remix.v;
    var box = $('#createPreview'), pv = $('#previewVideo');
    if (!$('.pv-wrap', box)) {
      var wrap = document.createElement('div'); wrap.className = 'pv-wrap';
      pv.parentNode.insertBefore(wrap, pv); wrap.appendChild(pv);
      var lay = document.createElement('div'); lay.className = 'pv-layer'; lay.id = 'pvLayer'; wrap.appendChild(lay);
      var bar = document.createElement('div'); bar.className = 'ed-bar'; bar.id = 'edBar';
      bar.innerHTML = [['text', 'Text'], ['sticker', 'Stickers'], ['trim', 'Trim'], ['cover', 'Cover'], ['speed', 'Speed'], ['voice', 'Voice-over'],
        ['captions', 'Captions'], ['filter', 'Filter'], ['green', 'Green screen'], ['link', 'Product link'], ['schedule', 'Schedule'], ['more', 'Settings'], ['draft', 'Save draft']]
        .map(function (x) { return '<button data-e="' + x[0] + '">' + x[1] + '</button>'; }).join('');
      wrap.parentNode.insertBefore(bar, wrap.nextSibling);
      bar.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) tool(b.dataset.e); });
      pv.addEventListener('timeupdate', function () {
        var d = S.ed; if (!d) return;
        if (d.trim[1] && pv.currentTime > d.trim[1]) pv.currentTime = d.trim[0];
        paintCaption();
      });
      pv.addEventListener('loadedmetadata', layoutLayer);
      window.addEventListener('resize', layoutLayer);
    }
    var note = $('#edNote', box);
    if (!note) { note = document.createElement('div'); note.id = 'edNote'; note.className = 'ed-note'; $('#edBar').parentNode.insertBefore(note, $('#edBar').nextSibling); }
    pv.playbackRate = ed.speed;
    try { pv.preservesPitch = true; } catch (e) {}
    var setDur = function () {
      var d = isFinite(pv.duration) && pv.duration > 0 ? pv.duration : (picked.recordedSec || 0);
      if (!d) return;
      ed.dur = d; if (!ed.trim[1]) ed.trim = [0, d];
      layoutLayer(); paintItems(); paintNote();
    };
    if (pv.readyState >= 1) setDur(); else pv.addEventListener('loadedmetadata', setDur, { once: true });
    setTimeout(setDur, 1500);
    paintItems(); paintNote();
  }
  function paintNote() {
    var ed = S.ed, n = $('#edNote'); if (!ed || !n) return;
    var bits = [];
    if (S.remix) bits.push(S.remix.type === 'duet' ? 'Duet with @' + S.remix.v.ownerUsername : S.remix.type === 'stitch' ? 'Stitched from @' + S.remix.v.ownerUsername : 'Sound: ' + (S.remix.v.soundName || 'Original sound - ' + S.remix.v.ownerName));
    if (ed.trim[0] > 0.05 || (ed.dur && ed.trim[1] < ed.dur - 0.05)) bits.push('Trim ' + L.fmtTime(ed.trim[0]) + '-' + L.fmtTime(ed.trim[1]));
    if (ed.speed !== 1) bits.push(ed.speed + 'x speed');
    if (ed.items.length) bits.push(ed.items.length + ' text/sticker');
    if (ed.captions.length) bits.push(ed.captions.length + ' captions');
    if (ed.voice) bits.push('Voice-over');
    if (ed.filter !== 'normal') bits.push('Filter: ' + FX.byId(ed.filter).name);
    if (ed.gs) bits.push('Green screen');
    if (ed.link) bits.push('Shop: ' + ed.link.title);
    if (ed.publishAt) bits.push('Scheduled ' + new Date(ed.publishAt).toLocaleString());
    if (!ed.allowRemix) bits.push('Duet/stitch off');
    n.textContent = bits.join(' · ');
    n.classList.toggle('hidden', !bits.length);
  }
  // overlay layer matches the visible video picture (object-fit: contain)
  function layoutLayer() {
    var pv = $('#previewVideo'), lay = $('#pvLayer'); if (!pv || !lay || !pv.videoWidth) return;
    var bw = pv.clientWidth, bh = pv.clientHeight, s = Math.min(bw / pv.videoWidth, bh / pv.videoHeight);
    var w = pv.videoWidth * s, h = pv.videoHeight * s;
    lay.style.left = (pv.offsetLeft + (bw - w) / 2) + 'px'; lay.style.top = (pv.offsetTop + (bh - h) / 2) + 'px';
    lay.style.width = w + 'px'; lay.style.height = h + 'px';
    paintItems();
  }
  function paintItems() {
    var lay = $('#pvLayer'), ed = S.ed; if (!lay || !ed) return;
    var h = lay.clientHeight || 400;
    lay.innerHTML = ed.items.map(function (it, i) {
      return '<div class="ov-item' + (it.kind === 'text' ? ' txt' : '') + '" data-i="' + i + '" style="left:' + (it.x * 100) + '%;top:' + (it.y * 100) + '%;font-size:' + Math.round(it.size * h) + 'px;color:' + esc(it.color || '#fff') + (it.bg ? ';background:rgba(0,0,0,.55)' : '') + ';transform:translate(-50%,-50%) rotate(' + (it.rot || 0) + 'rad)">' + esc(it.text) + '<i class="ov-x" data-x="' + i + '">x</i></div>';
    }).join('') + '<div class="ov-cap hidden" id="ovCap"></div>';
    $$('.ov-item', lay).forEach(drag);
    $$('.ov-x', lay).forEach(function (x) { x.addEventListener('click', function (e) { e.stopPropagation(); ed.items.splice(+x.dataset.x, 1); paintItems(); paintNote(); }); });
    paintCaption();
  }
  function paintCaption() {
    var ed = S.ed, el = $('#ovCap'), pv = $('#previewVideo'); if (!ed || !el) return;
    var t = pv.currentTime, c = ed.captions.filter(function (x) { return t >= x.t0 && t <= x.t1; })[0];
    el.textContent = c ? c.text : ''; el.classList.toggle('hidden', !c);
  }
  function drag(el) {
    var ed = S.ed, it = ed.items[+el.dataset.i], lay = el.parentNode, pts = {}, g = null;
    function start() {
      var ids = Object.keys(pts), a = pts[ids[0]], b = pts[ids[1]];
      if (ids.length === 1) g = { one: true, sx: a.x, sy: a.y, ox: it.x, oy: it.y };
      else if (ids.length >= 2) g = { one: false, d: Math.hypot(b.x - a.x, b.y - a.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x), size: it.size, rot: it.rot || 0,
        cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, ox: it.x, oy: it.y };
    }
    el.addEventListener('pointerdown', function (e) {
      if (e.target.classList.contains('ov-x')) return;
      e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) {}
      pts[e.pointerId] = { x: e.clientX, y: e.clientY }; el.classList.add('drag'); start();
    });
    el.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId] || !g) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts), a = pts[ids[0]], b = pts[ids[1]];
      if (g.one) {
        it.x = Math.max(0, Math.min(1, g.ox + (a.x - g.sx) / lay.clientWidth));
        it.y = Math.max(0, Math.min(1, g.oy + (a.y - g.sy) / lay.clientHeight));
      } else if (b) {
        var d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        it.size = Math.max(0.025, Math.min(0.25, g.size * d / g.d));
        it.rot = g.rot + Math.atan2(b.y - a.y, b.x - a.x) - g.ang;
        it.x = Math.max(0, Math.min(1, g.ox + ((a.x + b.x) / 2 - g.cx) / lay.clientWidth));
        it.y = Math.max(0, Math.min(1, g.oy + ((a.y + b.y) / 2 - g.cy) / lay.clientHeight));
        el.style.fontSize = Math.round(it.size * (lay.clientHeight || 400)) + 'px';
      }
      el.style.left = (it.x * 100) + '%'; el.style.top = (it.y * 100) + '%';
      el.style.transform = 'translate(-50%,-50%) rotate(' + (it.rot || 0) + 'rad)';
    });
    var up = function (e) { delete pts[e.pointerId]; if (!Object.keys(pts).length) { el.classList.remove('drag'); g = null; } else start(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('dblclick', function () { it.size = it.size >= 0.12 ? 0.04 : it.size + 0.02; paintItems(); });
    // mouse wheel / trackpad: resize; with Shift: rotate (desktop)
    el.addEventListener('wheel', function (e) { e.preventDefault(); if (e.shiftKey) it.rot = (it.rot || 0) + (e.deltaY > 0 ? 0.08 : -0.08); else it.size = Math.max(0.025, Math.min(0.25, it.size * (e.deltaY > 0 ? 0.92 : 1.08))); paintItems(); }, { passive: false });
  }
  function sheet(title, html, ready) { JR().openSheet(JR().head(title) + '<div class="sh-body">' + html + '</div>', ready); }
  function tool(name) {
    var ed = S.ed; if (!ed) return;
    var pv = $('#previewVideo');
    if (name === 'text') {
      sheet('Add text', '<div class="field"><input id="tIn" maxlength="60" placeholder="Type your text"></div>' +
        '<div class="swatches">' + COLORS.map(function (c, i) { return '<button class="sw' + (i ? '' : ' on') + '" data-c="' + c + '" style="background:' + c + '"></button>'; }).join('') + '</div>' +
        '<label class="check"><input type="checkbox" id="tBg" checked> Dark box behind text</label>' +
        '<div class="field"><label>Size</label><input type="range" id="tSize" min="3" max="12" value="6"></div>' +
        '<p class="note">After adding, drag the text on the video to move it. Double tap to change size.</p>' +
        '<button class="bigbtn small" id="tAdd">Add text</button>', function (sh) {
        var color = COLORS[0];
        $$('.sw', sh).forEach(function (b) { b.addEventListener('click', function () { color = b.dataset.c; $$('.sw', sh).forEach(function (x) { x.classList.toggle('on', x === b); }); }); });
        $('#tAdd', sh).addEventListener('click', function () {
          var t = L.cleanText($('#tIn', sh).value, 60); if (!t) { toast('Type some text first.'); return; }
          ed.items.push({ kind: 'text', text: t, x: 0.5, y: 0.4, size: +$('#tSize', sh).value / 100, color: color, bg: $('#tBg', sh).checked });
          JR().closeSheet(function () { paintItems(); paintNote(); });
        });
      });
    } else if (name === 'sticker') {
      sheet('Stickers', '<div class="stk-grid">' + STICKERS.map(function (s, i) { return '<button data-i="' + i + '">' + esc(s) + '</button>'; }).join('') + '</div>', function (sh) {
        $$('.stk-grid button', sh).forEach(function (b) { b.addEventListener('click', function () {
          var s = STICKERS[+b.dataset.i], word = /^[A-Za-z]+$/.test(s);
          ed.items.push({ kind: 'sticker', text: s, x: 0.3 + Math.random() * 0.4, y: 0.25 + Math.random() * 0.3, size: word ? 0.06 : 0.09, color: word ? '#ffd400' : '#fff', bg: word });
          JR().closeSheet(function () { paintItems(); paintNote(); });
        }); });
      });
    } else if (name === 'trim') {
      var d = ed.dur || 1;
      sheet('Trim', '<div class="field"><label>Start: <b id="trA">' + L.fmtTime(ed.trim[0]) + '</b></label><input type="range" id="trS" min="0" max="' + d + '" step="0.1" value="' + ed.trim[0] + '"></div>' +
        '<div class="field"><label>End: <b id="trB">' + L.fmtTime(ed.trim[1]) + '</b></label><input type="range" id="trE" min="0" max="' + d + '" step="0.1" value="' + ed.trim[1] + '"></div>' +
        '<p class="note" id="trLen"></p><button class="bigbtn small" id="trOk">Done</button>', function (sh) {
        var upd = function (which) {
          var a = +$('#trS', sh).value, b = +$('#trE', sh).value;
          if (b - a < 1) { if (which === 's') a = Math.max(0, b - 1); else b = Math.min(d, a + 1); $('#trS', sh).value = a; $('#trE', sh).value = b; }
          ed.trim = [a, b]; $('#trA', sh).textContent = L.fmtTime(a); $('#trB', sh).textContent = L.fmtTime(b);
          $('#trLen', sh).textContent = 'Length: ' + ((b - a) / ed.speed).toFixed(1) + ' s';
          pv.currentTime = which === 's' ? a : Math.max(a, b - 0.5);
        };
        $('#trS', sh).addEventListener('input', function () { upd('s'); }); $('#trE', sh).addEventListener('input', function () { upd('e'); });
        upd('s');
        $('#trOk', sh).addEventListener('click', function () { JR().closeSheet(function () { pv.currentTime = ed.trim[0]; pv.play().catch(function () {}); paintNote(); }); });
      });
    } else if (name === 'cover') {
      sheet('Cover frame', '<div class="field"><label>Pick the frame people see before they tap play</label><input type="range" id="cvR" min="' + ed.trim[0] + '" max="' + ed.trim[1] + '" step="0.1" value="' + (ed.cover || ed.trim[0]) + '"></div><button class="bigbtn small" id="cvOk">Use this frame</button>', function (sh) {
        pv.pause();
        $('#cvR', sh).addEventListener('input', function () { pv.currentTime = +this.value; });
        pv.currentTime = +$('#cvR', sh).value;
        $('#cvOk', sh).addEventListener('click', function () { ed.cover = +$('#cvR', sh).value; JR().closeSheet(function () { toast('Cover frame set'); pv.play().catch(function () {}); }); });
      });
    } else if (name === 'speed') {
      sheet('Speed', '<div class="seg">' + [0.5, 1, 2].map(function (x) { return '<button data-s="' + x + '" class="' + (ed.speed === x ? 'on' : '') + '">' + x + 'x</button>'; }).join('') + '</div>' +
        '<p class="note">0.5x = slow motion, 2x = fast. The video is played at this speed and recorded again on your phone, so posting takes as long as the new video plays.</p>', function (sh) {
        $$('.seg button', sh).forEach(function (b) { b.addEventListener('click', function () {
          ed.speed = +b.dataset.s; pv.playbackRate = ed.speed;
          if ((ed.trim[1] - ed.trim[0]) / ed.speed > L.MAX_SEC) { ed.trim[1] = ed.trim[0] + L.MAX_SEC * ed.speed; toast('Trimmed to 60 seconds at this speed.'); }
          JR().closeSheet(paintNote);
        }); });
      });
    } else if (name === 'voice') voiceOver();
    else if (name === 'captions') captions();
    else if (name === 'filter') {
      sheet('Filter', '<div class="fx-pick">' + FX.list.map(function (f) { return '<button data-f="' + f.id + '" class="' + (ed.filter === f.id ? 'on' : '') + '">' + esc(f.name) + '</button>'; }).join('') + '</div><p class="note">The filter is added when you post.</p>', function (sh) {
        $$('.fx-pick button', sh).forEach(function (b) { b.addEventListener('click', function () {
          ed.filter = b.dataset.f; pv.style.filter = FX.byId(ed.filter).css || 'none'; JR().closeSheet(paintNote);
        }); });
      });
    } else if (name === 'green') greenScreen();
    else if (name === 'link') {
      var lk = ed.link || { title: '', url: '' };
      sheet('Product link', '<div class="field"><label>Button text</label><input id="lkT" maxlength="40" placeholder="Shop now" value="' + esc(lk.title) + '"></div>' +
        '<div class="field"><label>Link (http or https)</label><input id="lkU" maxlength="300" placeholder="https://..." value="' + esc(lk.url) + '"></div>' +
        '<p class="note">A "Shop" button shows on your video. Only link to things you really sell.</p>' +
        '<div class="row"><button class="bigbtn alt small" id="lkRm">Remove</button><button class="bigbtn small" id="lkOk">Save</button></div>', function (sh) {
        $('#lkRm', sh).addEventListener('click', function () { ed.link = null; JR().closeSheet(paintNote); });
        $('#lkOk', sh).addEventListener('click', function () {
          var l = L.cleanLink($('#lkT', sh).value || 'Shop', $('#lkU', sh).value);
          if (!l) { toast('Enter a link that starts with http:// or https://'); return; }
          ed.link = l; JR().closeSheet(paintNote);
        });
      });
    } else if (name === 'schedule') {
      var min = new Date(Date.now() + 10 * 60000), max = new Date(Date.now() + 30 * 86400000);
      var loc = function (d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); };
      sheet('Schedule post', '<div class="field"><label>Post at</label><input type="datetime-local" id="scAt" min="' + loc(min) + '" max="' + loc(max) + '" value="' + loc(ed.publishAt ? new Date(ed.publishAt) : new Date(Date.now() + 3600000)) + '"></div>' +
        '<p class="note">The video is uploaded now but stays hidden from the feed until this time (up to 30 days ahead).</p>' +
        '<div class="row"><button class="bigbtn alt small" id="scRm">Post now</button><button class="bigbtn small" id="scOk">Schedule</button></div>', function (sh) {
        $('#scRm', sh).addEventListener('click', function () { ed.publishAt = 0; JR().closeSheet(paintNote); });
        $('#scOk', sh).addEventListener('click', function () {
          var t = new Date($('#scAt', sh).value).getTime();
          if (!t || t < Date.now() + 5 * 60000) { toast('Choose a time at least 10 minutes from now.'); return; }
          if (t > Date.now() + 30 * 86400000) { toast('Choose a time within 30 days.'); return; }
          ed.publishAt = t; JR().closeSheet(paintNote);
        });
      });
    } else if (name === 'more') {
      sheet('Post settings', '<label class="check"><input type="checkbox" id="arOn"' + (ed.allowRemix ? ' checked' : '') + '> Allow duet and stitch with this video</label>', function (sh) {
        $('#arOn', sh).addEventListener('change', function () { ed.allowRemix = this.checked; paintNote(); });
      });
    } else if (name === 'draft') saveDraft();
  }

  /* ---------- voice-over: play the clip, record the mic ---------- */
  function voiceOver() {
    var ed = S.ed, pv = $('#previewVideo');
    sheet('Voice-over', '<p class="note">Tap Start. The video plays and your voice is recorded. The video\'s own sound is made quieter when you post. Use earphones for the best sound.</p>' +
      (ed.voice ? '<p class="note"><b>A voice-over is added.</b></p>' : '') +
      '<div class="row"><button class="bigbtn alt small" id="voRm"' + (ed.voice ? '' : ' disabled') + '>Remove</button><button class="bigbtn small" id="voGo">Start</button></div>', function (sh) {
      $('#voRm', sh).addEventListener('click', function () { ed.voice = null; JR().closeSheet(paintNote); });
      $('#voGo', sh).addEventListener('click', function () {
        var btn = this;
        if (btn.dataset.on) { finish(); return; }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (ms) {
          var chunks = [], mr = new MediaRecorder(ms);
          mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          mr.onstop = function () { ms.getTracks().forEach(function (t) { t.stop(); }); ed.voice = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }); JR().closeSheet(function () { toast('Voice-over added'); paintNote(); }); };
          pv.pause(); pv.currentTime = ed.trim[0]; pv.volume = 0.35;
          pv.onseeked = function () { pv.onseeked = null; mr.start(250); pv.play().catch(function () {}); };
          btn.dataset.on = '1'; btn.textContent = 'Stop';
          var chk = setInterval(function () { if (pv.currentTime >= ed.trim[1] - 0.1 || pv.ended) finish(); }, 150);
          finish = function () { clearInterval(chk); pv.volume = 1; pv.pause(); if (mr.state === 'recording') mr.stop(); };
        }).catch(function () { toast('Microphone permission is needed.'); });
      });
      var finish = function () {};
    });
  }

  /* ---------- captions: auto (from recording) or typed ---------- */
  function captions() {
    var ed = S.ed;
    var txt = ed.captions.map(function (c) { return c.text; }).join('\n');
    sheet('Captions', (ed.captions.length ? '<p class="note">' + (S.liveCaps && S.liveCaps.length ? 'Auto captions from your recording. ' : '') + 'Edit the lines below.</p>' :
      '<p class="note">' + (SR ? 'Tip: turn on Captions on the camera screen before recording for auto captions.' : 'Auto captions are not supported on this phone, so type your captions here.') + ' One line per caption. Lines are spread evenly over the video.</p>') +
      '<div class="field"><textarea id="ccIn" rows="6" maxlength="1200" placeholder="First caption&#10;Second caption">' + esc(txt) + '</textarea></div>' +
      '<div class="row"><button class="bigbtn alt small" id="ccRm">Remove</button><button class="bigbtn small" id="ccOk">Save</button></div>', function (sh) {
      $('#ccRm', sh).addEventListener('click', function () { ed.captions = []; JR().closeSheet(function () { paintItems(); paintNote(); }); });
      $('#ccOk', sh).addEventListener('click', function () {
        var lines = $('#ccIn', sh).value.split('\n').map(function (l) { return L.cleanText(l, 80); }).filter(Boolean).slice(0, 40);
        if (lines.length === ed.captions.length && ed.captions.length) ed.captions = ed.captions.map(function (c, i) { return { t0: c.t0, t1: c.t1, text: lines[i] }; });
        else {
          var a = ed.trim[0], len = (ed.trim[1] - a) || ed.dur || 1, per = len / Math.max(1, lines.length);
          ed.captions = lines.map(function (l, i) { return { t0: a + i * per, t1: a + (i + 1) * per - 0.05, text: l }; });
        }
        JR().closeSheet(function () { paintItems(); paintNote(); });
      });
    });
  }

  /* ---------- green screen ---------- */
  var seg = null, segLoading = null, lastMask = null;
  function loadSeg() {
    if (seg) return Promise.resolve(seg);
    if (segLoading) return segLoading;
    segLoading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'vendor/mediapipe/selfie_segmentation.js';
      s.onload = function () {
        try {
          var x = new window.SelfieSegmentation({ locateFile: function (f) { return 'vendor/mediapipe/' + f; } });
          x.setOptions({ modelSelection: 1, selfieMode: false });
          x.onResults(function (r) { lastMask = r.segmentationMask; });
          x.initialize().then(function () { seg = x; res(x); }, rej);
        } catch (e) { rej(e); }
      };
      s.onerror = function () { rej(new Error('load')); };
      document.head.appendChild(s);
      setTimeout(function () { rej(new Error('timeout')); }, 25000);
    });
    segLoading.catch(function () { segLoading = null; });
    return segLoading;
  }
  function greenScreen() {
    var ed = S.ed;
    sheet('Green screen', '<p class="note">Pick a photo. Your background is replaced with it when you post.</p>' +
      '<div class="seg"><button data-m="ai" class="' + (ed.gsMode !== 'chroma' ? 'on' : '') + '">Auto (person)</button><button data-m="chroma" class="' + (ed.gsMode === 'chroma' ? 'on' : '') + '">Green cloth</button></div>' +
      '<p class="note">Auto finds the person on the phone (about 6 MB loads once). Green cloth is lighter: stand in front of a green wall or cloth.</p>' +
      '<canvas id="gsPrev" width="180" height="320" class="gs-prev' + (ed.gs ? '' : ' hidden') + '"></canvas>' +
      '<input type="file" id="gsFile" accept="image/*" hidden>' +
      '<div class="row"><button class="bigbtn alt small" id="gsRm"' + (ed.gs ? '' : ' disabled') + '>Remove</button><button class="bigbtn small" id="gsPick">Choose photo</button></div>', function (sh) {
      var mode = ed.gsMode || 'ai';
      $$('.seg button', sh).forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.m; $$('.seg button', sh).forEach(function (x) { x.classList.toggle('on', x === b); }); if (ed.gs) { ed.gsMode = mode; preview(); } }); });
      $('#gsRm', sh).addEventListener('click', function () { ed.gs = null; JR().closeSheet(paintNote); });
      $('#gsPick', sh).addEventListener('click', function () { $('#gsFile', sh).value = ''; $('#gsFile', sh).click(); });
      $('#gsFile', sh).addEventListener('change', function () {
        var f = this.files && this.files[0]; if (!f) return;
        var img = new Image(); img.onload = function () { ed.gs = img; ed.gsMode = mode; preview(); paintNote(); $('#gsRm', sh).disabled = false; };
        img.src = URL.createObjectURL(f);
      });
      function preview() {
        var c = $('#gsPrev', sh); if (!c) return; c.classList.remove('hidden');
        var x = c.getContext('2d'), pv = $('#previewVideo');
        x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#fff'; x.font = '13px sans-serif'; x.fillText('Loading...', 10, 20);
        var go = function () { var fr = document.createElement('canvas'); fr.width = 180; fr.height = 320; cover(fr.getContext('2d'), pv, 0, 0, 180, 320); return gsCompose(x, fr, ed.gs, ed.gsMode, 180, 320); };
        if (ed.gsMode === 'chroma') { go(); return; }
        loadSeg().then(function () { var fr = document.createElement('canvas'); fr.width = 180; fr.height = 320; cover(fr.getContext('2d'), pv, 0, 0, 180, 320); return seg.send({ image: fr }).then(function () { gsCompose(x, fr, ed.gs, 'ai', 180, 320); }); })
          .catch(function () { ed.gsMode = 'chroma'; toast('Auto mode could not load on this phone. Using Green cloth mode.'); go(); });
      }
    });
  }
  var gsTmp = null;
  function gsCompose(ctx, frame, bg, mode, W, H) {
    gsTmp = gsTmp || document.createElement('canvas');
    if (gsTmp.width !== W || gsTmp.height !== H) { gsTmp.width = W; gsTmp.height = H; }
    var t = gsTmp.getContext('2d', { willReadFrequently: true });
    t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, W, H);
    if (mode === 'chroma') {
      t.drawImage(frame, 0, 0, W, H);
      var id = t.getImageData(0, 0, W, H), d = id.data;
      for (var i = 0; i < d.length; i += 4) { var r = d[i], g = d[i + 1], b = d[i + 2]; if (g > 90 && g > r * 1.35 && g > b * 1.35) d[i + 3] = 0; }
      t.putImageData(id, 0, 0);
    } else {
      if (!lastMask) { ctx.drawImage(frame, 0, 0, W, H); return; }
      t.drawImage(lastMask, 0, 0, W, H);
      t.globalCompositeOperation = 'source-in'; t.drawImage(frame, 0, 0, W, H);
      t.globalCompositeOperation = 'source-over';
    }
    cover(ctx, bg, 0, 0, W, H);
    ctx.drawImage(gsTmp, 0, 0, W, H);
  }

  /* ================= render pass (edits are burned into the file) ================= */
  function needsRender(ed) {
    if (!ed) return false;
    return ed.trim[0] > 0.05 || (ed.dur && ed.trim[1] < ed.dur - 0.05) || ed.speed !== 1 || ed.items.length || ed.captions.length ||
      !!ed.voice || ed.filter !== 'normal' || !!ed.gs;
  }
  function drawItems(c, ed, W, H, t) {
    ed.items.forEach(function (it) {
      var fs = Math.max(10, Math.round(it.size * H));
      c.font = 'bold ' + fs + 'px system-ui, "Noto Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      var x0 = it.x * W, y0 = it.y * H, x = 0, y = 0;
      c.save(); c.translate(x0, y0); if (it.rot) c.rotate(it.rot);
      if (it.bg) { var w = c.measureText(it.text).width + fs * 0.6; c.fillStyle = 'rgba(0,0,0,.55)'; roundRect(c, x - w / 2, y - fs * 0.65, w, fs * 1.3, fs * 0.25); c.fill(); }
      else { c.lineWidth = Math.max(2, fs / 10); c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(it.text, x, y); }
      c.fillStyle = it.color || '#fff'; c.fillText(it.text, x, y);
      c.restore();
    });
    var cap = ed.captions.filter(function (x) { return t >= x.t0 && t <= x.t1; })[0];
    if (cap) {
      var fs2 = Math.round(H * 0.038); c.font = 'bold ' + fs2 + 'px system-ui, "Noto Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      var lines = wrap(c, cap.text, W * 0.86), y0 = H * 0.8 - (lines.length - 1) * fs2 * 0.65;
      lines.forEach(function (ln, i) {
        var w2 = c.measureText(ln).width + fs2 * 0.6, yy = y0 + i * fs2 * 1.3;
        c.fillStyle = 'rgba(0,0,0,.6)'; roundRect(c, W / 2 - w2 / 2, yy - fs2 * 0.65, w2, fs2 * 1.3, fs2 * 0.2); c.fill();
        c.fillStyle = '#fff'; c.fillText(ln, W / 2, yy);
      });
    }
  }
  function wrap(c, text, max) {
    var words = text.split(' '), out = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; });
    if (cur) out.push(cur); return out.slice(0, 3);
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function recorderFor(canvas, audioTrack) {
    var st = canvas.captureStream(30); if (audioTrack) st.addTrack(audioTrack);
    var mime = M.pickMime();
    var mr = new MediaRecorder(st, mime ? { mimeType: mime, videoBitsPerSecond: 1000000, audioBitsPerSecond: 64000 } : undefined);
    return { mr: mr, st: st, mime: mime };
  }
  function render(url, ed, onP) {
    return new Promise(function (res, rej) {
      var v = document.createElement('video'); v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = url;
      var actx = null, voiceEl = null, raf = 0, done = false, segBusy = false;
      var fail = function (e) { if (done) return; done = true; cleanup(); rej(e instanceof Error ? e : new Error('Could not add your edits on this phone.')); };
      var cleanup = function () { cancelAnimationFrame(raf); try { v.pause(); } catch (e) {} if (voiceEl) voiceEl.pause(); if (actx) try { actx.close(); } catch (e) {} };
      v.onerror = function () { fail(); };
      v.onloadedmetadata = function () {
        var fr = document.createElement('canvas'), eng = new FX.Engine(fr, v); eng.filter = ed.filter || 'normal';
        if (!eng.size()) { fail(); return; }
        var W = fr.width, H = fr.height;
        if (H > 960) { var k = 960 / H; W = Math.round(W * k / 2) * 2; H = 960; }
        var out = document.createElement('canvas'); out.width = W; out.height = H; var c = out.getContext('2d');
        var track = null;
        try {
          actx = new AC(); var dest = actx.createMediaStreamDestination();
          var vs = actx.createMediaElementSource(v), g = actx.createGain(); g.gain.value = ed.voice ? 0.35 : 1; vs.connect(g); g.connect(dest);
          if (ed.voice) { voiceEl = new Audio(URL.createObjectURL(ed.voice)); var vo = actx.createMediaElementSource(voiceEl); vo.connect(dest); }
          track = dest.stream.getAudioTracks()[0];
        } catch (e) { console.warn('render audio', e); }
        var R; try { R = recorderFor(out, track); } catch (e) { fail(e); return; }
        var chunks = []; R.mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        var a = ed.trim[0], b = Math.min(ed.trim[1] || v.duration, a + L.MAX_SEC * ed.speed);
        R.mr.onstop = function () {
          if (done) return; done = true; cleanup();
          res({ blob: new Blob(chunks, { type: (R.mime || 'video/webm').split(';')[0] }), sec: Math.min(L.MAX_SEC, (b - a) / ed.speed) });
        };
        v.playbackRate = ed.speed; try { v.preservesPitch = true; v.mozPreservesPitch = true; v.webkitPreservesPitch = true; } catch (e) {}
        var frame = function (t) {
          if (done) return;
          eng.draw(t);
          if (ed.gs) {
            if (ed.gsMode !== 'chroma' && seg && !segBusy) { segBusy = true; seg.send({ image: fr }).then(function () { segBusy = false; }, function () { segBusy = false; }); }
            gsCompose(c, fr, ed.gs, ed.gsMode, W, H);
          } else c.drawImage(fr, 0, 0, W, H);
          drawItems(c, ed, W, H, v.currentTime);
          if (onP) onP(Math.max(0, Math.min(1, (v.currentTime - a) / ((b - a) || 1))));
          if (v.currentTime >= b - 0.03 || v.ended) { if (R.mr.state === 'recording') R.mr.stop(); return; }
          raf = requestAnimationFrame(frame);
        };
        var go = function () {
          v.onseeked = null;
          if (actx && actx.resume) actx.resume();
          R.mr.start(500);
          v.play().then(function () { if (voiceEl) voiceEl.play().catch(function () {}); raf = requestAnimationFrame(frame); }, fail);
        };
        var prep = (ed.gs && ed.gsMode !== 'chroma') ? loadSeg().catch(function () { ed.gsMode = 'chroma'; }) : Promise.resolve();
        prep.then(function () { if (Math.abs(v.currentTime - a) < 0.05) go(); else { v.onseeked = go; v.currentTime = a; } });
      };
      setTimeout(function () { if (!done && v.readyState < 1) fail(new Error("This video can't be edited on this phone.")); }, 15000);
    });
  }
  function finalize(picked, upStatus) {
    var ed = S.ed;
    if (!needsRender(ed)) return Promise.resolve(null);
    upStatus('Adding your edits... 0%', 0);
    return render(picked.url, ed, function (f) { upStatus('Adding your edits... ' + Math.round(f * 100) + '%', f * 0.05); }).then(function (r) {
      ed.rendered = true; return r;
    });
  }
  function extras() {
    var ed = S.ed || freshEd({}), x = {};
    var r = S.remix;
    if (r && r.type === 'sound') { x.soundId = r.v.soundId || r.v.id; x.soundName = r.v.soundName || ('Original sound - ' + r.v.ownerName); }
    if (ed.sound && !x.soundId) { x.soundId = ed.sound.soundId || ed.sound.id; x.soundName = ed.sound.soundName || ('Original sound - ' + ed.sound.ownerName); }
    if (r && (r.type === 'duet' || r.type === 'stitch')) x.remix = { type: r.type, vid: r.v.id, username: r.v.ownerUsername };
    if (ed.link) x.link = ed.link;
    if (!ed.allowRemix) x.allowRemix = false;
    if (ed.cover) x.coverSec = Math.max(0, needsRender(ed) ? (ed.cover - ed.trim[0]) / ed.speed : ed.cover);
    if (ed.publishAt) x.publishAt = ed.publishAt;
    return x;
  }

  /* ================= drafts (IndexedDB, stays on this phone) ================= */
  function idb() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('Drafts are not supported on this phone.')); return; }
      var rq = indexedDB.open('jr-studio', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('drafts', { keyPath: 'id' }); };
      rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { rej(rq.error); };
    });
  }
  function store(mode, fn) {
    return idb().then(function (db) { return new Promise(function (res, rej) {
      var tx = db.transaction('drafts', mode), st = tx.objectStore('drafts'), out = fn(st);
      tx.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); }; tx.onerror = function () { rej(tx.error); };
    }); });
  }
  function saveDraft() {
    var ed = S.ed; if (!ed || !ed.picked || !ed.picked.blob) return;
    var id = S.draftId || ('d' + Date.now());
    var d = { id: id, at: Date.now(), blob: ed.picked.blob, recordedSec: ed.picked.recordedSec || 0, caption: ($('#captionInput') || {}).value || '', voice: ed.voice || null,
      ed: { trim: ed.trim, speed: ed.speed, cover: ed.cover, items: ed.items, captions: ed.captions, filter: ed.filter, link: ed.link, publishAt: ed.publishAt, allowRemix: ed.allowRemix },
      remix: S.remix ? { type: S.remix.type, v: S.remix.v } : null };
    store('readwrite', function (st) { return st.put(d); }).then(function () {
      S.draftId = id; toast('Saved to drafts on this phone' + (ed.gs ? ' (green screen photo is not saved)' : ''));
    }).catch(function (e) { toast(e.message || 'Could not save the draft.'); });
  }
  function listDrafts() { return store('readonly', function (st) { return st.getAll(); }).then(function (l) { return (l || []).sort(function (a, b) { return b.at - a.at; }); }); }
  function openDrafts() {
    listDrafts().then(function (list) {
      sheet('Drafts', list.length ? list.map(function (d) {
        return '<div class="draft" data-id="' + esc(d.id) + '"><div class="c-body"><div class="c-text">' + esc(d.caption || 'No caption') + '</div><div class="c-name">' + new Date(d.at).toLocaleString() + ' · ' + (d.blob.size / 1048576).toFixed(1) + ' MB</div></div>' +
          '<button class="textbtn" data-a="open">Open</button><button class="textbtn red" data-a="del">Delete</button></div>';
      }).join('') + '<p class="note">Drafts stay on this phone only. Clearing app data removes them.</p>' : '<div class="empty small"><b>No drafts</b><span>Tap Save draft in the editor to keep a video for later.</span></div>', function (sh) {
        $$('.draft', sh).forEach(function (row) {
          var d = list.filter(function (x) { return x.id === row.dataset.id; })[0];
          $('[data-a=open]', row).addEventListener('click', function () { JR().closeSheet(function () { openDraft(d); }); });
          $('[data-a=del]', row).addEventListener('click', function () { store('readwrite', function (st) { return st.delete(d.id); }).then(function () { row.remove(); toast('Draft deleted'); }); });
        });
      });
    }).catch(function (e) { toast(e.message || 'Could not open drafts.'); });
  }
  function openDraft(d) {
    S.remix = d.remix; S.draftId = d.id;
    S.pendingEd = Object.assign({}, d.ed, { voice: d.voice });
    $('#captionInput').value = d.caption || '';
    JR().showPreview(d.blob, URL.createObjectURL(d.blob), d.recordedSec);
  }
  function posted() { if (S.draftId) { var id = S.draftId; store('readwrite', function (st) { return st.delete(id); }).catch(function () {}); } }

  /* ================= photo slideshow ================= */
  function slideshow() {
    var imgs = [], sound = S.remix && S.remix.type === 'sound' ? S.remix.v : null;
    sheet('Photo slideshow', '<div class="ss-list" id="ssList"></div>' +
      '<input type="file" id="ssFile" accept="image/*" multiple hidden>' +
      '<p class="note">Add up to 20 photos. Each shows for about 3 seconds with a soft zoom and fade.' + (sound ? ' Sound: ' + esc(sound.soundName || 'Original sound - ' + sound.ownerName) + '.' : ' To add music, open a video\'s sound, tap Use this sound, then choose Photo slideshow.') + '</p>' +
      '<div class="row"><button class="bigbtn alt small" id="ssAdd">Add photos</button><button class="bigbtn small" id="ssMake" disabled>Make video</button></div><div class="note" id="ssProg"></div>', function (sh) {
      var paint = function () {
        $('#ssList', sh).innerHTML = imgs.map(function (im, i) { return '<div class="ss-th" style="background-image:url(\'' + im.src + '\')"><i data-i="' + i + '">x</i></div>'; }).join('');
        $$('#ssList i', sh).forEach(function (x) { x.addEventListener('click', function () { imgs.splice(+x.dataset.i, 1); paint(); }); });
        $('#ssMake', sh).disabled = imgs.length < 2;
      };
      $('#ssAdd', sh).addEventListener('click', function () { $('#ssFile', sh).value = ''; $('#ssFile', sh).click(); });
      $('#ssFile', sh).addEventListener('change', function () {
        Array.prototype.slice.call(this.files || []).slice(0, 20 - imgs.length).forEach(function (f) {
          var im = new Image(); im.onload = paint; im.src = URL.createObjectURL(f); imgs.push(im);
        });
        paint();
      });
      $('#ssMake', sh).addEventListener('click', function () {
        var btn = this; btn.disabled = true; $('#ssAdd', sh).disabled = true;
        makeSlides(imgs, sound, function (f) { var p = $('#ssProg', sh); if (p) p.textContent = 'Making video... ' + Math.round(f * 100) + '%'; }).then(function (r) {
          JR().closeSheet(function () { JR().showPreview(r.blob, URL.createObjectURL(r.blob), r.sec); });
        }).catch(function (e) { btn.disabled = false; $('#ssAdd', sh).disabled = false; toast(e.message || 'Could not make the slideshow.'); });
      });
    });
  }
  function makeSlides(imgs, sound, onP) {
    return new Promise(function (res, rej) {
      if (!window.MediaRecorder) { rej(new Error('Making videos is not supported on this phone.')); return; }
      var W = 540, H = 960, out = document.createElement('canvas'); out.width = W; out.height = H; var c = out.getContext('2d');
      var plan = L.slidePlan(imgs.length, L.MAX_SEC), per = plan.per, total = plan.total, actx = null, track = null, sv = null;
      if (sound && AC) {
        try { sv = srcVideo(sound); sv.loop = true; actx = new AC(); var dest = actx.createMediaStreamDestination(); actx.createMediaElementSource(sv).connect(dest); track = dest.stream.getAudioTracks()[0]; } catch (e) { track = null; }
      }
      var R = recorderFor(out, track), chunks = [], t0 = 0, raf = 0;
      R.mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      R.mr.onstop = function () { cancelAnimationFrame(raf); if (sv) sv.pause(); if (actx) try { actx.close(); } catch (e) {} res({ blob: new Blob(chunks, { type: (R.mime || 'video/webm').split(';')[0] }), sec: total }); };
      var drawImg = function (im, k, alpha) {
        var sw = im.naturalWidth, sh = im.naturalHeight; if (!sw) return;
        var s = Math.max(W / sw, H / sh) * (1 + 0.08 * k), dw = sw * s, dh = sh * s;
        c.globalAlpha = alpha; c.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh); c.globalAlpha = 1;
      };
      var frame = function () {
        var t = (performance.now() - t0) / 1000;
        if (t >= total) { if (R.mr.state === 'recording') R.mr.stop(); return; }
        var i = Math.min(imgs.length - 1, Math.floor(t / per)), lt = t - i * per;
        c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
        drawImg(imgs[i], lt / per, 1);
        var fade = Math.min(0.6, per / 3);
        if (lt > per - fade && i < imgs.length - 1) drawImg(imgs[i + 1], 0, (lt - (per - fade)) / fade);
        onP(t / total);
        raf = requestAnimationFrame(frame);
      };
      var start = function () { if (actx && actx.resume) actx.resume(); R.mr.start(500); t0 = performance.now(); raf = requestAnimationFrame(frame); };
      if (sv) sv.play().then(start, function () { start(); }); else start();
    });
  }

  /* ================= create screen extras ================= */
  function initPick() {
    var pick = $('#createPick'); if (!pick || $('#btnSlides')) return;
    var g = $('#btnGallery');
    var a = document.createElement('button'); a.className = 'bigbtn alt'; a.id = 'btnSlides';
    a.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3h14v14"/></svg>Photo slideshow';
    var b = document.createElement('button'); b.className = 'bigbtn alt'; b.id = 'btnDrafts';
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/></svg>Drafts';
    g.parentNode.insertBefore(a, g.nextSibling); a.parentNode.insertBefore(b, a.nextSibling);
    a.addEventListener('click', slideshow); b.addEventListener('click', openDrafts);
  }
  function reset() {
    stopRx(); cancelCountdown();
    S.remix = null; S.ed = null; S.draftId = null; S.liveCaps = null; S.pendingEd = null;
    var n = $('#edNote'); if (n) { n.textContent = ''; n.classList.add('hidden'); }
    var lay = $('#pvLayer'); if (lay) lay.innerHTML = '';
    var pv = $('#previewVideo'); if (pv) { pv.style.filter = ''; pv.playbackRate = 1; }
    remixLabel(); initPick();
  }

  window.JRS = {
    prime: prime, countdown: countdown, counting: counting, cancelCountdown: cancelCountdown,
    videoStream: videoStream, audioTracks: audioTracks, onRecordStart: onRecordStart, onRecordStop: onRecordStop,
    onCamOpen: onCamOpen, stopLive: function () { stopRx(); }, onPreview: onPreview, finalize: finalize, extras: extras,
    posted: posted, reset: reset, startRemix: startRemix, slideshow: slideshow, openDrafts: openDrafts,
    setTorch: setTorch, _render: render, _makeSlides: makeSlides, _state: S, _needsRender: needsRender
  };
  initPick();
  (function () { var b = document.getElementById('btnSaveDraft'); if (b) b.addEventListener('click', function () { if (!S.ed) { toast('Record or pick a video first.'); return; } saveDraft(); }); })();
})();
