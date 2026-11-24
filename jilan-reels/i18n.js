/* Jilan Reels v1.3 — i18n.js
 * Optional Urdu UI (Settings > Language). English stays the default.
 * Translates fixed UI words only (exact text matches); user posts are never changed.
 * Exposes window.JRI.
 */
(function () {
  'use strict';
  var UR = {
    'For You': 'آپ کے لیے', 'Following': 'فالووِنگ', 'Followers': 'فالوورز', 'Likes': 'لائکس', 'Home': 'ہوم', 'Discover': 'تلاش', 'Inbox': 'اِن باکس', 'Profile': 'پروفائل',
    'Share': 'شیئر', 'Save': 'محفوظ', 'Saved': 'محفوظ شدہ', 'Download': 'ڈاؤن لوڈ', 'Use sound': 'آواز استعمال کریں', 'Duet': 'ڈوئٹ', 'Stitch': 'اسٹچ',
    'Edit profile': 'پروفائل میں ترمیم', 'Settings': 'سیٹنگز', 'Log out': 'لاگ آؤٹ', 'Blocked accounts': 'بلاک اکاؤنٹس', 'Favourites': 'پسندیدہ', 'Drafts': 'ڈرافٹس',
    'Videos': 'ویڈیوز', 'Playlists': 'پلے لسٹس', 'Q&A': 'سوال جواب', 'Activity': 'سرگرمی', 'Messages': 'پیغامات', 'Message': 'پیغام', 'Send': 'بھیجیں', 'Post': 'پوسٹ', 'Retake': 'دوبارہ',
    'Record video': 'ویڈیو ریکارڈ کریں', 'Upload from gallery': 'گیلری سے اپ لوڈ', 'Photo slideshow': 'تصویری سلائیڈ شو', 'Text': 'لکھائی', 'Stickers': 'اسٹیکرز', 'Trim': 'کاٹیں',
    'Cover': 'کور', 'Speed': 'رفتار', 'Voice-over': 'وائس اوور', 'Captions': 'کیپشنز', 'Filter': 'فلٹر', 'Green screen': 'گرین اسکرین', 'Product link': 'پروڈکٹ لنک',
    'Schedule': 'شیڈول', 'Save draft': 'ڈرافٹ محفوظ کریں', 'Timer': 'ٹائمر', 'Off': 'بند', 'On': 'آن', 'Report video': 'ویڈیو رپورٹ کریں', 'Not interested': 'دلچسپی نہیں',
    'Delete video': 'ویڈیو ڈیلیٹ کریں', 'Report': 'رپورٹ', 'Delete': 'ڈیلیٹ', 'Reply': 'جواب', 'Pin': 'پن', 'Unpin': 'پن ہٹائیں', 'Cancel': 'منسوخ', 'Done': 'ہو گیا',
    'Log in or sign up': 'لاگ اِن یا سائن اپ', 'Load more': 'مزید دیکھیں', 'Try again': 'دوبارہ کوشش', 'Language': 'زبان', 'Options': 'آپشنز', 'Your video': 'آپ کی ویڈیو',
    'Add to playlist': 'پلے لسٹ میں شامل کریں', 'Ask': 'پوچھیں', 'Answer': 'جواب دیں', 'Next': 'اگلا', 'Open': 'کھولیں', 'Back': 'واپس', 'Shop': 'خریدیں', 'Use this sound': 'یہ آواز استعمال کریں',
    'No videos yet': 'ابھی کوئی ویڈیو نہیں', 'No comments yet': 'ابھی کوئی تبصرہ نہیں', 'No activity yet': 'ابھی کوئی سرگرمی نہیں', 'No messages yet': 'ابھی کوئی پیغام نہیں',
    'Add a comment...': 'تبصرہ لکھیں...', 'Message...': 'پیغام...', 'Write a caption... add #hashtags': 'کیپشن لکھیں... #ہیش ٹیگ', 'Search': 'تلاش', 'Admin': 'ایڈمن', 'Stats': 'اعداد و شمار',
    'Total users': 'کل صارفین', 'Total videos': 'کل ویڈیوز', 'Total views': 'کل ویوز', 'New users today': 'آج نئے صارفین', 'New videos today': 'آج نئی ویڈیوز',
    'Share profile': 'پروفائل شیئر کریں', 'Report account': 'اکاؤنٹ رپورٹ کریں', 'Block': 'بلاک', 'Unblock': 'اَن بلاک', 'Make video': 'ویڈیو بنائیں', 'Add photos': 'تصاویر شامل کریں'
  };
  var KEY = 'jr-lang', lang = 'en';
  try { lang = localStorage.getItem(KEY) === 'ur' ? 'ur' : 'en'; } catch (e) {}
  var obs = null;
  var SKIP = '.cap, .c-text, .msg, .pbio, .pname, .who, .c-name, .qa, .ov-item, textarea, script, style';
  function fix(n) { var k = n.nodeValue.trim(); if (k && UR[k]) n.nodeValue = n.nodeValue.replace(k, UR[k]); }
  function tr(node) {
    if (node.nodeType === 3) { if (!(node.parentNode && node.parentNode.closest && node.parentNode.closest(SKIP))) fix(node); return; }
    if (node.nodeType !== 1 || (node.closest && node.closest(SKIP))) return;
    if (node.placeholder && UR[node.placeholder]) node.placeholder = UR[node.placeholder];
    var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: function (n) {
      if (n.nodeType === 1) { if (n.matches(SKIP)) return NodeFilter.FILTER_REJECT; if (n.placeholder && UR[n.placeholder]) n.placeholder = UR[n.placeholder]; return NodeFilter.FILTER_SKIP; }
      return NodeFilter.FILTER_ACCEPT; } }), t;
    while ((t = w.nextNode())) fix(t);
  }
  function apply() {
    document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('ur', lang === 'ur');
    if (lang !== 'ur') return;
    tr(document.body);
    if (!obs) {
      obs = new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, tr); if (m.type === 'characterData') tr(m.target); }); });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }
  window.JRI = {
    lang: function () { return lang; },
    setLang: function (l) { try { localStorage.setItem(KEY, l === 'ur' ? 'ur' : 'en'); } catch (e) {} location.reload(); },
    t: function (s) { return lang === 'ur' && UR[s] ? UR[s] : s; },
    dict: UR
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
