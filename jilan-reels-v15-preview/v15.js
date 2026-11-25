/* Jilan Reels v1.5 — UX layer (Discover home + grouped search, caption "more",
 * haptics, story ring, profile banner, skeletons). Loaded after app.js. */
(function () {
  'use strict';
  var L = window.JRLib, Api = window.JRApi;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var JR = function () { return window.JR; };
  var esc = L.esc, fmt = L.fmt;

  /* ---------- safe area: APK WebView drawn under the status bar gets a 28px top fallback ---------- */
  try { if (window.Android && window.screen && window.innerHeight >= screen.height - 2) document.documentElement.classList.add('edge'); } catch (e) {}

  /* ---------- haptics (only where the phone supports it) ---------- */
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) {} }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('.reel .like, .reel .follow, .reel .fav, #profileAction, #btnPost, #btnSaveDraft, #btnShutter')) buzz(12);
  }, true);
  // double-tap like -> the big heart appears -> short double buzz
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && n.classList && n.classList.contains('bigheart')) buzz([10, 40, 14]); }); });
  }).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });

  /* ---------- caption "more" ---------- */
  function capMore(root) {
    $$('.reel .cap:not([data-m])', root).forEach(function (c) {
      c.setAttribute('data-m', '1');
      requestAnimationFrame(function () {
        if (c.scrollHeight > c.clientHeight + 4) {
          var b = document.createElement('button'); b.className = 'cap-more'; b.textContent = 'more';
          c.parentNode.insertBefore(b, c.nextSibling);
        }
      });
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.cap-more'); if (!b) return;
    e.stopPropagation();
    var c = b.previousElementSibling, open = !c.classList.contains('open');
    c.classList.toggle('open', open); b.textContent = open ? 'less' : 'more';
    var info = b.closest('.info'); if (info) info.classList.toggle('cap-open', open);
  }, true);
  var feeds = ['feed', 'playerFeed'];
  function watch(id) {
    var el = document.getElementById(id); if (!el) return;
    capMore(el);
    new MutationObserver(function () { capMore(el); }).observe(el, { childList: true, subtree: true });
  }
  feeds.forEach(watch);
  document.addEventListener('DOMContentLoaded', function () { feeds.forEach(watch); });

  /* ---------- Discover: categories, rising sounds, grouped search ---------- */
  var CATS = [
    { k: 'tech', name: 'Tech', users: ['jilanappstech'] },
    { k: 'islamic', name: 'Islamic', users: ['jilanverse', 'rahenoor'] },
    { k: 'medicine', name: 'Medicine', users: ['drasifhomeo', 'drasifallopathic'] },
    { k: 'desi', name: 'Desi', users: ['desinuskhe'] },
    { k: 'ultrasound', name: 'Ultrasound', users: ['learnultrasound'] },
    { k: 'shopping', name: 'Shopping', users: ['jilanshoppinghub'] },
    { k: 'kids', name: 'Kids', users: ['tinyverse'] }
  ];
  var UIDS = { jilanappstech: 'ZdrGUSq3n7WX6OLY5jQB9Y3GS3v1', learnultrasound: 'ycpnxzr0YWOr6HVO2cJfKTLC4rF3', drasifhomeo: 'JZmTd0ePVqRLrieoH7WcqcWCXVf2',
    drasifallopathic: 'RDX9GZaFJcdcK8Xab0dyGL3JRn83', desinuskhe: 'i5sgoIx2R7PqnArdfg6jOs6mfym1', rahenoor: 'TvnuUCqeembtWvAYnrQNfW2ewsI3',
    jilanshoppinghub: '8iuYSMSeH9MojsDrHmqYUsDlukC3', tinyverse: 'hTKI2PRA5wWKWGx1qbs6gewS9pI3', jilanverse: 'verUEBZxeoajGORCZW6MuqkrIP02' };
  var cat = null, gq = null, gtab = 'top', seq = 0;
  function cached() { var c = JR().cache || {}; return Object.keys(c).map(function (k) { return c[k]; }).filter(function (v) { return v && v.video && JR().visible(v); }); }
  function cells(list) {
    return list.map(function (v, i) {
      return '<button class="cell" data-i="' + i + '" style="background-image:url(\'' + esc(v.video.thumb) + '\')"><em>@' + esc(v.ownerUsername) + '</em><span>' + JR().ICON.eye + fmt(v.views || 0) + '</span></button>';
    }).join('');
  }
  function wireCells(root, list) { $$('.cell', root).forEach(function (b) { b.addEventListener('click', function () { JR().openPlayer(list, +b.dataset.i); }); }); }
  function skel(n) { var h = ''; for (var i = 0; i < (n || 6); i++) h += '<div class="cell skel"></div>'; return h; }
  function catRow() {
    var row = $('#catChips');
    if (!row) {
      row = document.createElement('div'); row.id = 'catChips'; row.className = 'cat-chips';
      var ch = $('#chips'); ch.parentNode.insertBefore(row, ch);
      row.addEventListener('click', function (e) {
        var b = e.target.closest('[data-c]'); if (!b) return;
        cat = cat === b.dataset.c ? null : b.dataset.c; $('#searchInput').value = ''; paintCats(); discoverHome();
      });
    }
    paintCats();
  }
  function paintCats() {
    var row = $('#catChips'); if (!row) return;
    row.innerHTML = '<button data-c="all"' + (!cat || cat === 'all' ? ' class="on"' : '') + '>For you</button>' +
      CATS.map(function (c) { return '<button data-c="' + c.k + '"' + (cat === c.k ? ' class="on"' : '') + '>' + esc(c.name) + '</button>'; }).join('');
  }
  function discoverHome() {
    catRow();
    var q = ($('#searchInput').value || '').trim(); if (q) return;
    var res = $('#searchResults'), more = $('#searchMore'), hint = $('#searchHint');
    if (hint) hint.classList.add('hidden'); more.classList.add('hidden');
    var my = ++seq;
    if (cat && cat !== 'all') {
      var c = CATS.filter(function (x) { return x.k === cat; })[0];
      res.innerHTML = '<div class="sec-title">' + esc(c.name) + '</div>' + skel(6);
      var local = cached().filter(function (v) { return c.users.indexOf(v.ownerUsername) >= 0; });
      Promise.all(c.users.map(function (u) {
        var id = UIDS[u];
        return (id ? Promise.resolve(id) : Api.uidForUsername(u)).then(function (uid) { return uid ? Api.userVideos(uid).then(function (r) { return r.items || []; }) : []; }).catch(function () { return []; });
      })).then(function (lists) {
        if (my !== seq) return;
        var seen = {}, all = [];
        local.concat([].concat.apply([], lists)).forEach(function (v) { if (v && v.video && !seen[v.id] && JR().visible(v)) { seen[v.id] = 1; all.push(v); } });
        all.sort(function (a, b) { return L.tsMs(b.createdAt) - L.tsMs(a.createdAt); });
        JR().remember(all);
        res.innerHTML = '<div class="sec-title">' + esc(c.name) + '<small>' + all.length + ' reels</small></div>' + (all.length ? cells(all) : '<div class="empty small" style="grid-column:1/-1"><b>No reels here yet</b><span>Check back soon.</span></div>');
        wireCells(res, all);
      });
      return;
    }
    var list = cached();
    var rising = L.risingSounds(list, 5), top = list.slice().sort(function (a, b) { return (b.views || 0) + (b.likeCount || 0) * 5 - (a.views || 0) - (a.likeCount || 0) * 5; }).slice(0, 12);
    res.innerHTML = (rising.length ? '<div class="sec-title">Rising sounds</div><div class="sounds">' + rising.map(function (s) {
      return '<button class="sound-row" data-sid="' + esc(s.id) + '" data-sn="' + esc(s.name) + '" data-from="' + esc(s.from) + '"><i class="disc-mini"></i><span><b>' + esc(s.name) + '</b><small>' + s.count + ' reel' + (s.count === 1 ? '' : 's') + ' · ' + fmt(s.views) + ' views</small></span><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>';
    }).join('') + '</div>' : '') +
      '<div class="sec-title">Trending now</div>' + (top.length ? cells(top) : skel(6));
    wireCells(res, top);
    $$('.sound-row', res).forEach(function (b) { b.addEventListener('click', function () { if (window.JRX) JRX.openSound(b.dataset.sid, b.dataset.sn, b.dataset.from); }); });
  }

  // Returns true when it handled the search (plain words -> grouped results; empty -> Discover home)
  function search(raw, more) {
    var q = String(raw || '').trim();
    if (!q) { if (!more) discoverHome(); return true; }
    if (q[0] === '#' || q[0] === '@') { cat = null; paintCats(); return false; }
    if (more) return false;
    cat = null; paintCats();
    var res = $('#searchResults'), my = ++seq, words = q.toLowerCase().split(/\s+/).filter(Boolean);
    var hint = $('#searchHint'); if (hint) hint.classList.add('hidden');
    $('#searchMore').classList.add('hidden');
    res.innerHTML = tabsHtml() + skel(6);
    var tagWord = words[0].replace(/[^a-z0-9_]/g, '');
    var allTags = L.trending(cached().concat((window.JRX && JRX.trendPool) || []), 60);
    var tags = allTags.filter(function (t) { return words.some(function (w) { return t.indexOf(w.replace(/^#/, '')) >= 0; }); }).slice(0, 12);
    var local = cached().filter(function (v) { return L.matchText(v, q); });
    Promise.all([
      tagWord ? Api.tagVideos(tagWord).then(function (r) { return r.items || []; }).catch(function () { return []; }) : Promise.resolve([]),
      tagWord ? Api.searchUsers(tagWord).catch(function () { return []; }) : Promise.resolve([])
    ]).then(function (r) {
      if (my !== seq) return;
      var seen = {}, reels = [];
      local.concat(r[0]).forEach(function (v) { if (v && v.video && !seen[v.id] && JR().visible(v)) { seen[v.id] = 1; reels.push(v); } });
      JR().remember(reels);
      if (tagWord && r[0].length && tags.indexOf(tagWord) < 0) tags.unshift(tagWord);
      gq = { q: q, reels: reels, tags: tags, users: r[1] || [] };
      paintGrouped();
    });
    return true;
  }
  function tabsHtml() {
    return '<div class="stabs" id="sTabs">' + [['top', 'Top'], ['reels', 'Reels'], ['tags', 'Hashtags'], ['users', 'Creators']].map(function (t) {
      return '<button data-st="' + t[0] + '"' + (gtab === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>';
    }).join('') + '</div>';
  }
  function usersHtml(us) {
    return us.map(function (pu) {
      return '<button class="comment usercard" style="grid-column:1/-1;align-items:center;text-align:left" data-u="' + esc(pu.uid) + '">' + JR().avatarHtml(pu.name, pu.photo, pu.uid, 'sm') +
        '<div class="c-body"><div class="c-text">' + esc(pu.name) + (Api.isVerified(pu.uid) ? JR().ICON.verified : '') + '</div><div class="c-name">@' + esc(pu.username) + ' · ' + fmt(pu.followers) + ' followers</div></div></button>';
    }).join('');
  }
  function tagsHtml(ts) {
    return ts.map(function (t) { return '<button class="tagrow" data-tag="' + esc(t) + '"><i>#</i><span><b>#' + esc(t) + '</b><small>Hashtag</small></span></button>'; }).join('');
  }
  function paintGrouped() {
    var g = gq, res = $('#searchResults'); if (!g) return;
    var none = '<div class="empty small" style="grid-column:1/-1"><b>No results for "' + esc(g.q) + '"</b><span>Try another word, a #hashtag or an @username.</span></div>';
    var h = tabsHtml(), reels = g.reels;
    if (gtab === 'top') {
      if (!reels.length && !g.users.length && !g.tags.length) h += none;
      else {
        if (g.users.length) h += '<div class="sec-title">Creators</div>' + usersHtml(g.users.slice(0, 3));
        if (g.tags.length) h += '<div class="sec-title">Hashtags</div>' + tagsHtml(g.tags.slice(0, 4));
        if (reels.length) h += '<div class="sec-title">Reels</div>' + cells(reels.slice(0, 12));
      }
      reels = reels.slice(0, 12);
    } else if (gtab === 'reels') h += reels.length ? cells(reels) : none;
    else if (gtab === 'tags') h += g.tags.length ? tagsHtml(g.tags) : none;
    else h += g.users.length ? usersHtml(g.users) : none;
    res.innerHTML = h;
    wireCells(res, reels);
    $$('.usercard', res).forEach(function (b) { b.addEventListener('click', function () { JR().openProfile(b.dataset.u); }); });
    $$('.tagrow', res).forEach(function (b) { b.addEventListener('click', function () { $('#searchInput').value = '#' + b.dataset.tag; JR().runSearch(); }); });
    $('#sTabs', res).addEventListener('click', function (e) { var b = e.target.closest('[data-st]'); if (!b) return; gtab = b.dataset.st; paintGrouped(); });
  }
  // instant search while typing
  var typeT = null;
  function wireInput() {
    var inp = $('#searchInput'); if (!inp || inp.dataset.v15) return; inp.dataset.v15 = '1';
    inp.setAttribute('placeholder', 'Search reels, #hashtags, @creators');
    inp.addEventListener('input', function () {
      clearTimeout(typeT);
      var v = inp.value.trim();
      typeT = setTimeout(function () { if (v === '#' || v === '@') return; if (!v || v.length >= 2) JR().runSearch(); }, 380);
    });
  }
  wireInput(); document.addEventListener('DOMContentLoaded', wireInput);

  /* ---------- profile: banner, story ring, smooth tab indicator ---------- */
  function profileBits() {
    var head = $('#profileBody .profile-head'); if (!head) return;
    if (!$('.p-banner', head)) { var b = document.createElement('div'); b.className = 'p-banner'; head.insertBefore(b, head.firstChild); }
    var tabs = $('#pTabs'); if (tabs && !$('.ink', tabs)) { var ink = document.createElement('i'); ink.className = 'ink'; tabs.appendChild(ink); }
    if (tabs) {
      var on = $('button.on', tabs), ink2 = $('.ink', tabs);
      if (on && ink2) { ink2.style.width = on.offsetWidth + 'px'; ink2.style.transform = 'translateX(' + on.offsetLeft + 'px)'; }
    }
  }
  var pb = document.getElementById('screen-profile');
  if (pb) new MutationObserver(function () { requestAnimationFrame(profileBits); }).observe(pb, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  window.JRV = { search: search, discoverHome: discoverHome, buzz: buzz, CATS: CATS, _grouped: function () { return gq; } };
})();
