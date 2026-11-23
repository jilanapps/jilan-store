/* Jilan Reels v1.0 — lib.js
 * Pure helpers (no DOM, no Firebase). Loaded in the page as window.JRLib and
 * in Node tests via require(). Keep everything here side-effect free.
 */
(function (root, factory) {
  var lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.JRLib = lib;
})(this, function () {
  'use strict';
  var L = {};

  L.MAX_SEC = 30;                 // max video length (seconds)
  L.MAX_CAPTION = 150;
  L.MAX_COMMENT = 150;
  L.MAX_BIO = 150;
  L.MAX_NAME = 40;
  L.MAX_TAGS = 10;
  L.PAGE_SIZE = 10;               // videos per feed page (Spark reads)
  L.TARGET_BYTES = 3 * 1024 * 1024;   // aim: <= ~3 MB per upload
  L.HARD_MAX_BYTES = 20 * 1024 * 1024; // never upload more than this
  L.USERNAME_DOMAIN = '@jilanreels.local';
  L.RESERVED_USERNAMES = ['drasif', 'asif', 'dr_asif', 'mohammadasif', 'jilan', 'jilanreels', 'jilanchat',
    'jilanapps', 'jilanappofficial', 'jilanappsofficial', 'admin', 'support', 'official', 'system', 'owner',
    'help', 'moderator', 'team'];
  L.REPORT_REASONS = ['Spam or misleading', 'Nudity or sexual content', 'Violence or dangerous acts',
    'Hate speech', 'Harassment or bullying', 'Child safety', 'False information', 'Copyright', 'Something else'];

  /* ---------- usernames ---------- */
  L.normalizeUsername = function (raw) { return String(raw == null ? '' : raw).trim().replace(/^@/, '').toLowerCase(); };
  L.validateUsername = function (raw) {
    var u = L.normalizeUsername(raw);
    if (!u) return { ok: false, error: 'Enter a username.' };
    if (u.length < 3) return { ok: false, error: 'Username must be at least 3 characters.' };
    if (u.length > 20) return { ok: false, error: 'Username can be at most 20 characters.' };
    if (!/^[a-z0-9_]+$/.test(u)) return { ok: false, error: 'Use only lowercase letters (a-z), numbers and _.' };
    if (L.RESERVED_USERNAMES.indexOf(u) >= 0) return { ok: false, error: "This username isn't available. Choose another." };
    return { ok: true, username: u };
  };
  L.usernameToEmail = function (u) { return L.normalizeUsername(u) + L.USERNAME_DOMAIN; };
  L.isUsernameEmail = function (e) { return String(e || '').toLowerCase().indexOf(L.USERNAME_DOMAIN) > 0; };
  L.usernameFromEmail = function (e) { e = String(e || '').toLowerCase(); return L.isUsernameEmail(e) ? e.split('@')[0] : ''; };
  // Suggest a username from a Google display name / email.
  L.suggestUsername = function (name, email) {
    var base = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (base.length < 3) base = String(email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (base.length < 3) base = 'user';
    return base.slice(0, 14);
  };

  /* ---------- text ---------- */
  L.cleanText = function (s, max) {
    s = String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    s = s.replace(/\n{3,}/g, '\n\n');
    return max ? s.slice(0, max) : s;
  };
  L.cleanName = function (s) { return L.cleanText(s, L.MAX_NAME).replace(/\s+/g, ' '); };
  // Hashtags -> lowercase, unique, [a-z0-9_] only, max 10, each max 30.
  L.parseHashtags = function (caption) {
    var out = [], m, re = /#([A-Za-z0-9_]{1,30})/g;
    caption = String(caption || '');
    while ((m = re.exec(caption)) !== null) {
      var t = m[1].toLowerCase();
      if (out.indexOf(t) < 0) out.push(t);
      if (out.length >= L.MAX_TAGS) break;
    }
    return out;
  };
  // Discover search box -> {kind:'tag'|'user'|'none', value}
  L.parseSearch = function (q) {
    q = String(q || '').trim();
    if (!q) return { kind: 'none', value: '' };
    if (q[0] === '@') {
      var v = L.validateUsername(q.slice(1));
      var u = L.normalizeUsername(q.slice(1));
      return /^[a-z0-9_]{1,20}$/.test(u) ? { kind: 'user', value: u, valid: v.ok } : { kind: 'none', value: '' };
    }
    var t = q.replace(/^#/, '').toLowerCase();
    if (/^[a-z0-9_]{1,30}$/.test(t)) return { kind: 'tag', value: t };
    return { kind: 'none', value: '' };
  };

  L.fmt = function (n) {
    n = Number(n) || 0;
    if (n < 0) n = 0;
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(Math.floor(n));
  };
  L.ago = function (ms, now) {
    if (!ms) return '';
    var s = ((now || Date.now()) - ms) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 30) return Math.floor(s / 86400) + 'd ago';
    var d = new Date(ms);
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  };
  L.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  L.initials = function (n) {
    return (String(n || '?').trim().split(/\s+/).map(function (w) { return w[0] || ''; }).slice(0, 2).join('') || '?').toUpperCase();
  };
  // Stable avatar colour from a uid (no green: Jilan blue family + warm tones).
  var COLORS = ['#1f7ae0', '#8a4fff', '#e0457b', '#f08c1f', '#1fa9e0', '#c2410c', '#6d28d9', '#0e7490', '#be185d', '#475569'];
  L.colorFor = function (id) {
    var h = 0; id = String(id || '');
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return COLORS[Math.abs(h) % COLORS.length];
  };

  /* ---------- Cloudinary ---------- */
  L.cloudinaryUploadUrl = function (cloud) {
    return 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(cloud) + '/video/upload';
  };
  // Playback: quality + format chosen by Cloudinary for each phone.
  L.videoUrl = function (cloud, publicId) {
    return 'https://res.cloudinary.com/' + cloud + '/video/upload/q_auto,f_auto/' + publicId;
  };
  // Poster: first frame as a small JPG.
  L.thumbUrl = function (cloud, publicId) {
    return 'https://res.cloudinary.com/' + cloud + '/video/upload/so_0,w_360,c_limit,q_auto/' + publicId + '.jpg';
  };
  L.validPublicId = function (id) { return typeof id === 'string' && /^[A-Za-z0-9_\-\/]{1,200}$/.test(id) && id.indexOf('..') < 0; };
  // Keep only the fields we trust from Cloudinary's upload response.
  L.pickUpload = function (r, cloud) {
    if (!r || !L.validPublicId(r.public_id)) throw new Error('Upload failed: bad response.');
    var dur = Math.round((Number(r.duration) || 0) * 10) / 10;
    return {
      publicId: r.public_id,
      url: L.videoUrl(cloud, r.public_id),
      thumb: L.thumbUrl(cloud, r.public_id),
      duration: dur,
      w: Math.max(0, Math.min(4096, parseInt(r.width, 10) || 0)),
      h: Math.max(0, Math.min(4096, parseInt(r.height, 10) || 0)),
      bytes: Math.max(0, parseInt(r.bytes, 10) || 0)
    };
  };

  /* ---------- compression planning ---------- */
  // Decide whether to re-encode a picked file, and with which size/bitrate.
  // Output fits a 540x960 (or 720x1280 when small enough) box, ~700 kbps video.
  L.planCompression = function (bytes, width, height, durationSec) {
    width = width || 720; height = height || 1280; durationSec = durationSec || L.MAX_SEC;
    var longSide = Math.max(width, height);
    var needs = bytes > L.TARGET_BYTES || longSide > 1280;
    var box = 960;
    var scale = Math.min(1, box / longSide);
    var w = Math.max(2, Math.round(width * scale / 2) * 2), h = Math.max(2, Math.round(height * scale / 2) * 2);
    // bits available for ~2.6 MB, minus 64 kbps audio, clamp 350-900 kbps
    var vbps = Math.floor((2.6 * 1024 * 1024 * 8) / Math.max(1, durationSec)) - 64000;
    vbps = Math.max(350000, Math.min(900000, vbps));
    return { compress: needs, width: w, height: h, videoBitsPerSecond: vbps, audioBitsPerSecond: 64000 };
  };

  /* ---------- ids ---------- */
  L.followId = function (from, to) { return from + '_' + to; };
  L.chunk = function (arr, n) { var out = []; for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

  return L;
});
