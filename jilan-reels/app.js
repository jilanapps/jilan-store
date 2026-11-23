/* Jilan Reels — DEMO web app (v0.1).
 * DEMO ONLY: everything (likes, comments, follows, reports, blocks, your own
 * videos) is stored on THIS phone (localStorage + IndexedDB). Nothing is sent
 * to a server. In the real version: videos upload to Cloudinary (free plan),
 * and likes/comments/follows/reports live in a new Firebase project (Spark).
 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ICON = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    comment: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M14 5l7 7-7 7v-4c-6 0-9 2-11 5 1-6 4-10 11-11z"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>',
    block: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    hide: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.6 6.6A17 17 0 0 0 2 12s4 6 10 6a9.6 9.6 0 0 0 4-.9"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>'
  };

  /* ---------- local state (demo) ---------- */
  var KEY = 'jilanreels-demo-state';
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  S.likes = S.likes || {}; S.follows = S.follows || {}; S.comments = S.comments || {};
  S.blocked = S.blocked || {}; S.reports = S.reports || []; S.hidden = S.hidden || {};
  S.shares = S.shares || {};
  S.profile = S.profile || { name: 'My Name', user: 'myname' };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var soundOn = false;
  var myPosts = [];
  var CREATORS = window.JR_CREATORS || {};

  function me() { return { id: 'me', name: S.profile.name, user: S.profile.user, color: '#1f7ae0', followers: 0, following: Object.keys(S.follows).length, bio: '' }; }
  function creatorOf(p) { return p.creator === 'me' ? me() : CREATORS[p.creator]; }
  function allPosts() {
    return myPosts.concat(window.JR_DEMO || []).filter(function (p) { return !S.blocked[p.creator] && !S.hidden[p.id]; });
  }
  function postById(id) { return myPosts.concat(window.JR_DEMO || []).filter(function (p) { return p.id === id; })[0]; }
  function likeCount(p) { return (p.likes || 0) + (S.likes[p.id] ? 1 : 0); }
  function commentList(p) {
    var base = ((window.JR_DEMO_COMMENTS || {})[p.id] || []).map(function (c) { return { name: c[0], text: c[1], at: null }; });
    return base.concat(S.comments[p.id] || []);
  }
  function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(n);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function capHtml(s) { return esc(s).replace(/#(\w+)/g, '<button class="tag" data-tag="$1">#$1</button>'); }
  function initials(n) { return (n || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function avatarHtml(c, cls) { return '<div class="avatar ' + (cls || '') + '" style="background:' + c.color + '">' + esc(initials(c.name)) + '</div>'; }
  function ago(t) {
    if (!t) return '';
    var s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago';
  }
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }

  /* ---------- IndexedDB for own videos (demo: saved on this phone only) ---------- */
  var dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no idb'));
      var r = indexedDB.open('jilan-reels-demo', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('posts', { keyPath: 'id' }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbP;
  }
  function idb(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var tx = d.transaction('posts', mode), st = tx.objectStore('posts'), out = fn(st);
        tx.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function loadMyPosts() {
    return idb('readonly', function (st) { return st.getAll(); }).then(function (rows) {
      myPosts = (rows || []).sort(function (a, b) { return b.at - a.at; }).map(function (r) {
        return { id: r.id, creator: 'me', src: URL.createObjectURL(r.blob), thumb: r.thumb, caption: r.caption, likes: 0, shares: 0, sound: 'Original sound - ' + S.profile.name, at: r.at, mine: true };
      });
    }).catch(function () { myPosts = []; });
  }

  /* ---------- feed ---------- */
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target.querySelector('video');
      if (!v) return;
      if (en.isIntersecting && en.intersectionRatio > 0.6 && isVisibleScreen(en.target)) {
        $$('video').forEach(function (o) { if (o !== v && o.id !== 'camView' && o.id !== 'previewVideo') o.pause(); });
        en.target.classList.remove('paused');
        v.muted = !soundOn;
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
        current = en.target;
      } else {
        v.pause();
      }
    });
  }, { threshold: [0, 0.6, 1] });
  var current = null;
  function isVisibleScreen(el) { var s = el.closest('.screen'); return s && s.classList.contains('active'); }

  function reelHtml(p) {
    var c = creatorOf(p), followed = !!S.follows[p.creator], liked = !!S.likes[p.id];
    return '<div class="reel" data-id="' + p.id + '">' +
      '<video src="' + esc(p.src) + '" poster="' + esc(p.thumb || '') + '" playsinline webkit-playsinline loop muted preload="metadata"></video>' +
      '<div class="shade"></div><div class="pause-ico">' + ICON.play + '</div>' +
      (soundOn ? '' : '<button class="sound-pill">' + ICON.mute + 'Tap for sound</button>') +
      '<div class="rail">' +
        '<div class="creator"><button class="open-creator" data-c="' + p.creator + '">' + avatarHtml(c) + '</button>' +
          (p.creator === 'me' ? '' : '<button class="follow' + (followed ? ' done' : '') + '" data-c="' + p.creator + '" aria-label="Follow">' + (followed ? ICON.check : ICON.plus) + '</button>') + '</div>' +
        '<button class="like' + (liked ? ' liked' : '') + '" aria-label="Like">' + ICON.heart + '<span>' + fmt(likeCount(p)) + '</span></button>' +
        '<button class="comments" aria-label="Comments">' + ICON.comment + '<span>' + fmt(commentList(p).length) + '</span></button>' +
        '<button class="share" aria-label="Share">' + ICON.share + '<span>' + fmt((p.shares || 0) + (S.shares[p.id] || 0)) + '</span></button>' +
        '<button class="more" aria-label="More">' + ICON.more + '</button>' +
      '</div>' +
      '<div class="info"><button class="who open-creator" data-c="' + p.creator + '">@' + esc(c.user) + (p.mine ? '<span class="mine-badge">You</span>' : '') + '</button>' +
        '<div class="cap">' + capHtml(p.caption || '') + '</div>' +
        '<div class="music">' + ICON.music + '<span>' + esc(p.sound || 'Original sound') + '</span></div></div>' +
      '<div class="progress"><i></i></div>' +
      '</div>';
  }

  function renderFeed(container, posts, startIdx) {
    $$('.reel', container).forEach(function (r) { observer.unobserve(r); });
    container.innerHTML = posts.map(reelHtml).join('');
    $$('.reel', container).forEach(function (r) {
      observer.observe(r);
      var v = r.querySelector('video'), bar = r.querySelector('.progress i');
      v.addEventListener('timeupdate', function () { if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + '%'; });
    });
    if (startIdx) { var t = container.children[startIdx]; if (t) container.scrollTop = t.offsetTop; }
  }

  var feedMode = 'foryou';
  function renderHome(keepPos) {
    var feed = $('#feed'), pos = feed.scrollTop;
    var posts = allPosts();
    if (feedMode === 'following') posts = posts.filter(function (p) { return S.follows[p.creator]; });
    renderFeed(feed, posts);
    var empty = $('#feedEmpty');
    if (!posts.length) {
      empty.innerHTML = feedMode === 'following'
        ? ICON.user + '<b>No videos yet</b><span>Follow creators to see their videos here.</span>'
        : ICON.play + '<b>No videos</b><span>Nothing to show right now.</span>';
      empty.classList.remove('hidden');
    } else empty.classList.add('hidden');
    if (keepPos) feed.scrollTop = pos;
  }
  function refreshAll() {
    renderHome(true);
    if ($('#screen-player').classList.contains('active')) {
      var pf = $('#playerFeed'), pos = pf.scrollTop, ids = playerIds.filter(function (id) { var p = postById(id); return p && !S.blocked[p.creator] && !S.hidden[id]; });
      if (!ids.length) { closeTop(); } else { renderFeed(pf, ids.map(postById)); pf.scrollTop = pos; }
    }
    if ($('#screen-profile').classList.contains('active')) showProfile(profileOf, true);
    if ($('#screen-discover').classList.contains('active')) renderDiscover();
  }
  function updateReelsFor(id) { // update counters without re-render
    var p = postById(id); if (!p) return;
    $$('.reel[data-id="' + id + '"]').forEach(function (r) {
      var lk = r.querySelector('.like'); lk.classList.toggle('liked', !!S.likes[id]); lk.querySelector('span').textContent = fmt(likeCount(p));
      r.querySelector('.comments span').textContent = fmt(commentList(p).length);
      r.querySelector('.share span').textContent = fmt((p.shares || 0) + (S.shares[id] || 0));
    });
  }
  function updateFollowButtons() {
    $$('.follow').forEach(function (b) { var on = !!S.follows[b.dataset.c]; b.classList.toggle('done', on); b.innerHTML = on ? ICON.check : ICON.plus; });
  }

  function toggleLike(id, forceOn) {
    if (forceOn && S.likes[id]) return;
    if (S.likes[id]) delete S.likes[id]; else S.likes[id] = Date.now();
    save(); updateReelsFor(id);
  }
  function toggleFollow(cid) {
    if (cid === 'me') return;
    var c = CREATORS[cid];
    if (S.follows[cid]) { delete S.follows[cid]; toast('Unfollowed ' + c.name); } else { S.follows[cid] = Date.now(); toast('Following ' + c.name); }
    save(); updateFollowButtons();
    if (feedMode === 'following') renderHome(true);
  }
  function enableSound() {
    soundOn = true;
    $$('.sound-pill').forEach(function (e) { e.remove(); });
    if (current) { var v = current.querySelector('video'); v.muted = false; v.play().catch(function () {}); }
  }
  function bigHeart(reel, x, y) {
    var r = reel.getBoundingClientRect(), h = document.createElement('div');
    h.className = 'bigheart'; h.innerHTML = ICON.heart;
    h.style.left = (x - r.left) + 'px'; h.style.top = (y - r.top) + 'px';
    reel.appendChild(h); setTimeout(function () { h.remove(); }, 850);
  }

  /* tap / double-tap on the video */
  var lastTap = 0, tapTimer = null;
  function onFeedClick(e) {
    var reel = e.target.closest('.reel'); if (!reel) return;
    var id = reel.dataset.id;
    var t = e.target;
    if (t.closest('.tag')) { e.stopPropagation(); openDiscover(t.closest('.tag').dataset.tag); return; }
    if (t.closest('.follow')) { toggleFollow(t.closest('.follow').dataset.c); return; }
    if (t.closest('.open-creator')) { openCreator(t.closest('.open-creator').dataset.c); return; }
    if (t.closest('.like')) { toggleLike(id); return; }
    if (t.closest('.comments')) { openComments(id); return; }
    if (t.closest('.share')) { sharePost(id); return; }
    if (t.closest('.more')) { openMore(id); return; }
    if (t.closest('.sound-pill')) { enableSound(); return; }
    if (t.closest('.rail') || t.closest('.info')) return;
    var now = Date.now();
    if (now - lastTap < 300) { // double tap = like
      clearTimeout(tapTimer); tapTimer = null; lastTap = 0;
      toggleLike(id, true); bigHeart(reel, e.clientX, e.clientY);
      return;
    }
    lastTap = now;
    tapTimer = setTimeout(function () {
      tapTimer = null;
      var v = reel.querySelector('video');
      if (!soundOn) { enableSound(); return; }
      if (v.paused) { v.play().catch(function () {}); reel.classList.remove('paused'); }
      else { v.pause(); reel.classList.add('paused'); }
    }, 300);
  }

  /* ---------- back stack (Android Back) ---------- */
  var stack = [];
  function pushLayer(closer) { stack.push(closer); history.pushState({ jr: stack.length }, ''); }
  function closeTop() { if (stack.length) history.back(); }
  window.addEventListener('popstate', function () { var c = stack.pop(); if (c) c(); });

  /* ---------- sheets ---------- */
  function openSheet(html, onReady) {
    var sh = $('#sheet'); sh.innerHTML = html; sh.classList.remove('hidden'); $('#sheetBack').classList.remove('hidden');
    pushLayer(hideSheet);
    if (onReady) onReady(sh);
  }
  function hideSheet() { $('#sheet').classList.add('hidden'); $('#sheetBack').classList.add('hidden'); $('#sheet').innerHTML = ''; }
  function sheetOpen() { return !$('#sheet').classList.contains('hidden'); }
  function closeSheet(then) {
    if (!sheetOpen()) { if (then) then(); return; }
    if (then) { var once = function () { window.removeEventListener('popstate', once); setTimeout(then, 0); }; window.addEventListener('popstate', once); }
    closeTop();
  }
  $('#sheetBack').addEventListener('click', function () { closeSheet(); });
  function head(title) { return '<div class="sh-head">' + esc(title) + '<button class="iconbtn sh-close" aria-label="Close">' + ICON.close + '</button></div>'; }
  document.addEventListener('click', function (e) { if (e.target.closest('.sh-close')) closeSheet(); });

  function openComments(id) {
    var p = postById(id);
    function listHtml() {
      var list = commentList(p);
      if (!list.length) return '<div class="empty small"><b>No comments yet</b><span>Be the first to comment.</span></div>';
      return list.map(function (c) {
        var cr = { name: c.name, color: c.mine ? '#1f7ae0' : '#555' };
        return '<div class="comment">' + avatarHtml(cr, 'sm') + '<div class="c-body"><div class="c-name">' + esc(c.name) + '</div><div class="c-text">' + esc(c.text) + '</div>' + (c.at ? '<div class="c-time">' + ago(c.at) + '</div>' : '') + '</div></div>';
      }).join('');
    }
    openSheet(head(fmt(commentList(p).length) + ' comments') + '<div class="sh-body" id="cList">' + listHtml() + '</div>' +
      '<div class="c-input"><input id="cInput" maxlength="150" placeholder="Add a comment..."><button id="cSend">Post</button></div>', function (sh) {
      function send() {
        var inp = $('#cInput', sh), txt = inp.value.trim(); if (!txt) return;
        (S.comments[id] = S.comments[id] || []).push({ name: S.profile.name, text: txt, at: Date.now(), mine: true }); save();
        inp.value = ''; $('#cList', sh).innerHTML = listHtml(); $('#cList', sh).scrollTop = 1e6;
        $('.sh-head', sh).firstChild.textContent = fmt(commentList(p).length) + ' comments';
        updateReelsFor(id);
      }
      $('#cSend', sh).addEventListener('click', send);
      $('#cInput', sh).addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
    });
  }

  function shareUrl(id) { return location.href.split('#')[0] + '#v=' + id; }
  function sharePost(id) {
    var p = postById(id), c = creatorOf(p), url = shareUrl(id);
    var done = function () { S.shares[id] = (S.shares[id] || 0) + 1; save(); updateReelsFor(id); };
    if (window.Android && Android.shareText) { try { Android.shareText('Watch on Jilan Reels: ' + (p.caption || '') + '\n' + url); done(); return; } catch (e) {} }
    if (navigator.share && !p.mine) {
      navigator.share({ title: 'Jilan Reels', text: '@' + c.user + ' on Jilan Reels', url: url }).then(done).catch(function () {});
      return;
    }
    copyText(url); done(); toast(p.mine ? 'Link copied. Demo: own videos open only on this phone.' : 'Link copied');
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).catch(function () { fallbackCopy(t); }); return; }
    fallbackCopy(t);
  }
  function fallbackCopy(t) { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); }

  function openMore(id) {
    var p = postById(id), c = creatorOf(p);
    if (p.mine) {
      openSheet(head('Your video') + '<div class="sh-body">' +
        '<button class="opt red" data-a="delete">' + ICON.trash + 'Delete video</button></div>', function (sh) {
        $('[data-a=delete]', sh).addEventListener('click', function () { closeSheet(function () { deletePost(id); }); });
      });
      return;
    }
    openSheet(head('Options') + '<div class="sh-body">' +
      '<button class="opt" data-a="report">' + ICON.flag + 'Report video</button>' +
      '<button class="opt" data-a="hide">' + ICON.hide + 'Not interested</button>' +
      '<button class="opt red" data-a="block">' + ICON.block + 'Block @' + esc(c.user) + '</button></div>', function (sh) {
      $('[data-a=report]', sh).addEventListener('click', function () { closeSheet(function () { openReport(id); }); });
      $('[data-a=hide]', sh).addEventListener('click', function () { closeSheet(function () { S.hidden[id] = Date.now(); save(); refreshAll(); toast("You won't see this video again"); }); });
      $('[data-a=block]', sh).addEventListener('click', function () { closeSheet(function () { confirmBlock(p.creator); }); });
    });
  }
  var REASONS = ['Spam or misleading', 'Nudity or sexual content', 'Violence or dangerous acts', 'Hate speech', 'Harassment or bullying', 'Child safety', 'False information', 'Copyright', 'Something else'];
  function openReport(id, accountId) {
    openSheet(head(accountId ? 'Report account' : 'Report video') + '<div class="sh-body"><div class="field"><label>Why are you reporting this?</label></div>' +
      REASONS.map(function (r, i) { return '<button class="opt" data-r="' + i + '">' + ICON.flag + esc(r) + '</button>'; }).join('') + '</div>', function (sh) {
      $$('[data-r]', sh).forEach(function (b) {
        b.addEventListener('click', function () {
          S.reports.push({ post: id || null, creator: accountId || (postById(id) || {}).creator, reason: REASONS[+b.dataset.r], at: Date.now() });
          if (id) S.hidden[id] = Date.now();
          save();
          closeSheet(function () { refreshAll(); toast('Thanks for reporting. We will review it.'); });
        });
      });
    });
  }
  function confirmBlock(cid) {
    var c = CREATORS[cid]; if (!c) return;
    openSheet(head('Block ' + c.name + '?') + '<div class="sh-body"><div class="field"><label>You will not see their videos or comments. They will not be told.</label></div></div>' +
      '<div class="sh-foot"><button class="bigbtn danger small" id="doBlock">Block</button></div>', function (sh) {
      $('#doBlock', sh).addEventListener('click', function () {
        S.blocked[cid] = Date.now(); delete S.follows[cid]; save();
        closeSheet(function () {
          if ($('#screen-profile').classList.contains('active') && profileOf === cid) { closeTop(); }
          refreshAll(); toast(c.name + ' blocked');
        });
      });
    });
  }
  function openBlockedList() {
    var ids = Object.keys(S.blocked);
    openSheet(head('Blocked accounts') + '<div class="sh-body">' + (ids.length ? ids.map(function (id) {
      var c = CREATORS[id]; if (!c) return '';
      return '<div class="comment" style="align-items:center">' + avatarHtml(c, 'sm') + '<div class="c-body"><div class="c-text">' + esc(c.name) + '</div><div class="c-name">@' + esc(c.user) + '</div></div><button class="bigbtn alt small" style="width:auto;padding:0 14px" data-unblock="' + id + '">Unblock</button></div>';
    }).join('') : '<div class="empty small"><b>No blocked accounts</b></div>') + '</div>', function (sh) {
      $$('[data-unblock]', sh).forEach(function (b) {
        b.addEventListener('click', function () { delete S.blocked[b.dataset.unblock]; save(); b.closest('.comment').remove(); refreshAll(); toast('Unblocked'); });
      });
    });
  }
  function deletePost(id) {
    idb('readwrite', function (st) { return st.delete(id); }).then(function () {
      myPosts = myPosts.filter(function (p) { return p.id !== id; });
      refreshAll(); toast('Video deleted');
    });
  }

  /* ---------- screens ---------- */
  var tabLayer = false;
  function show(name) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === 'screen-' + name); });
    $$('.bottomnav button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === name); });
    $$('video').forEach(function (v) { if (!v.closest('.screen.active')) v.pause(); });
    if (name === 'home' && current && current.closest('#feed')) { var v = current.querySelector('video'); v.muted = !soundOn; v.play().catch(function () {}); }
  }
  function goTab(name) {
    if (name === 'create') { openCreate(); return; }
    if (name === 'home') { if (tabLayer) closeTop(); else show('home'); return; }
    if (name === 'profile') profileOf = 'me';
    if (!tabLayer) { tabLayer = true; pushLayer(function () { tabLayer = false; show('home'); }); }
    if (name === 'profile') showProfile('me');
    if (name === 'discover') renderDiscover();
    show(name);
  }
  $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { goTab(b.dataset.go); }); });
  $$('.tab').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.tab').forEach(function (x) { x.classList.toggle('on', x === b); });
      feedMode = b.dataset.feed; renderHome(); $('#feed').scrollTop = 0;
    });
  });
  $('#feed').addEventListener('click', onFeedClick);
  $('#playerFeed').addEventListener('click', onFeedClick);

  /* player overlay (tap a grid video) */
  var playerIds = [], playerReturn = 'home';
  function openPlayer(posts, idx) {
    playerIds = posts.map(function (p) { return p.id; });
    playerReturn = ($('.screen.active') || {}).id || 'screen-home';
    show('player');
    renderFeed($('#playerFeed'), posts, idx);
    pushLayer(function () {
      $$('#playerFeed .reel').forEach(function (r) { observer.unobserve(r); });
      $('#playerFeed').innerHTML = '';
      show(playerReturn.replace('screen-', ''));
    });
  }
  $('#playerBack').addEventListener('click', closeTop);

  /* profile */
  var profileOf = 'me';
  function openCreator(cid) {
    if (cid === 'me') { goTab('profile'); return; }
    var prevActive = ($('.screen.active') || {}).id;
    profileOf = cid; showProfile(cid); show('profile');
    pushLayer(function () { show((prevActive || 'screen-home').replace('screen-', '')); if (prevActive === 'screen-profile') showProfile('me'); });
  }
  function showProfile(cid, keep) {
    profileOf = cid;
    var isMe = cid === 'me', c = isMe ? me() : CREATORS[cid];
    if (!c) return;
    var posts = allPosts().filter(function (p) { return p.creator === cid; });
    if (!isMe && S.blocked[cid]) posts = [];
    $('#profileTitle').textContent = isMe ? 'Profile' : c.name;
    $('#profileBack').classList.toggle('hidden', isMe);
    var av = $('#profileAvatar'); av.style.background = c.color; av.textContent = initials(c.name);
    $('#profileName').textContent = c.name;
    $('#profileUser').textContent = '@' + c.user;
    $('#stFollowing').textContent = fmt(isMe ? Object.keys(S.follows).length : c.following);
    $('#stFollowers').textContent = fmt(isMe ? 0 : c.followers + (S.follows[cid] ? 1 : 0));
    $('#stLikes').textContent = fmt(posts.reduce(function (a, p) { return a + likeCount(p); }, 0));
    var btn = $('#profileAction');
    if (isMe) { btn.textContent = 'Edit profile'; btn.className = 'bigbtn alt small'; }
    else { var f = !!S.follows[cid]; btn.textContent = f ? 'Following' : 'Follow'; btn.className = 'bigbtn small' + (f ? ' alt' : ''); }
    $('#profileGrid').innerHTML = posts.map(function (p, i) {
      return '<button class="cell" data-i="' + i + '" style="background-image:url(\'' + esc(p.thumb || '') + '\')"><em>' + esc(p.caption || '') + '</em><span>' + ICON.play + fmt(likeCount(p)) + '</span></button>';
    }).join('');
    $$('#profileGrid .cell').forEach(function (b) { b.addEventListener('click', function () { openPlayer(posts, +b.dataset.i); }); });
    var em = $('#profileEmpty');
    if (!posts.length) { em.innerHTML = isMe ? '<b>No videos yet</b><span>Tap + to post your first video.</span>' : '<b>No videos</b>'; em.classList.remove('hidden'); } else em.classList.add('hidden');
  }
  $('#profileBack').addEventListener('click', closeTop);
  $('#profileAction').addEventListener('click', function () {
    if (profileOf === 'me') { editProfile(); return; }
    toggleFollow(profileOf); showProfile(profileOf);
  });
  $('#profileMenu').addEventListener('click', function () {
    if (profileOf === 'me') {
      openSheet(head('Settings') + '<div class="sh-body">' +
        '<button class="opt" data-a="edit">' + ICON.user + 'Edit profile</button>' +
        '<button class="opt" data-a="blocked">' + ICON.block + 'Blocked accounts</button>' +
        '<button class="opt" data-a="about">' + ICON.info + 'About Jilan Reels</button></div>', function (sh) {
        $('[data-a=edit]', sh).addEventListener('click', function () { closeSheet(editProfile); });
        $('[data-a=blocked]', sh).addEventListener('click', function () { closeSheet(openBlockedList); });
        $('[data-a=about]', sh).addEventListener('click', function () { closeSheet(openAbout); });
      });
    } else {
      var cid = profileOf, c = CREATORS[cid];
      openSheet(head('@' + c.user) + '<div class="sh-body">' +
        '<button class="opt" data-a="report">' + ICON.flag + 'Report account</button>' +
        '<button class="opt red" data-a="block">' + ICON.block + 'Block</button></div>', function (sh) {
        $('[data-a=report]', sh).addEventListener('click', function () { closeSheet(function () { openReport(null, cid); }); });
        $('[data-a=block]', sh).addEventListener('click', function () { closeSheet(function () { confirmBlock(cid); }); });
      });
    }
  });
  function editProfile() {
    openSheet(head('Edit profile') + '<div class="sh-body">' +
      '<div class="field"><label>Name</label><input id="epName" maxlength="30" value="' + esc(S.profile.name) + '"></div>' +
      '<div class="field"><label>Username</label><input id="epUser" maxlength="24" value="' + esc(S.profile.user) + '"></div></div>' +
      '<div class="sh-foot"><button class="bigbtn small" id="epSave">Save</button></div>', function (sh) {
      $('#epSave', sh).addEventListener('click', function () {
        var n = $('#epName', sh).value.trim(), u = $('#epUser', sh).value.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
        if (!n || u.length < 3) { toast('Name and a 3+ letter username are needed'); return; }
        S.profile = { name: n, user: u }; save();
        myPosts.forEach(function (p) { p.sound = 'Original sound - ' + n; });
        closeSheet(function () { refreshAll(); showProfile('me'); toast('Profile saved'); });
      });
    });
  }
  function openAbout() {
    openSheet(head('About Jilan Reels') + '<div class="sh-body"><div class="field">' +
      '<label>Version 0.1 (demo)</label>' +
      '<div class="c-text">Short videos with friends. This is a demo: your videos, likes, comments and follows are saved only on this phone.</div>' +
      '<label style="margin-top:10px">Made by Dr Asif - Jilan Apps Official, Basti Malook (Multan).</label></div></div>');
  }

  /* discover */
  function hashtags() {
    var m = {};
    allPosts().forEach(function (p) { ((p.caption || '').match(/#\w+/g) || []).forEach(function (t) { t = t.toLowerCase(); m[t] = (m[t] || 0) + 1; }); });
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; });
  }
  function renderDiscover() {
    var q = $('#searchInput').value.trim().toLowerCase();
    $('#chips').innerHTML = hashtags().slice(0, 12).map(function (t) { return '<button class="' + (q === t ? 'on' : '') + '" data-t="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
    $$('#chips button').forEach(function (b) { b.addEventListener('click', function () { $('#searchInput').value = q === b.dataset.t ? '' : b.dataset.t; renderDiscover(); }); });
    var posts = allPosts().filter(function (p) {
      if (!q) return true;
      var c = creatorOf(p);
      var hay = ((p.caption || '') + ' ' + c.name + ' @' + c.user).toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w.replace(/^@/, '')) >= 0; });
    });
    $('#searchResults').innerHTML = posts.length ? posts.map(function (p, i) {
      return '<button class="cell" data-i="' + i + '" style="background-image:url(\'' + esc(p.thumb || '') + '\')"><em>@' + esc(creatorOf(p).user) + '</em><span>' + ICON.heart + fmt(likeCount(p)) + '</span></button>';
    }).join('') : '<div class="empty small" style="grid-column:1/-1"><b>No results</b><span>Try another word or #hashtag.</span></div>';
    $$('#searchResults .cell').forEach(function (b) { b.addEventListener('click', function () { openPlayer(posts, +b.dataset.i); }); });
  }
  function openDiscover(tag) {
    $('#searchInput').value = '#' + tag.toLowerCase();
    if ($('#screen-player').classList.contains('active')) closeTop();
    setTimeout(function () { goTab('discover'); }, 30);
  }
  $('#searchInput').addEventListener('input', renderDiscover);

  /* ---------- create (record or gallery) ---------- */
  var MAX_SEC = 30, camStream = null, recorder = null, recChunks = [], recTimer = null, recStart = 0, facing = 'user', pickedBlob = null;
  function openCreate() {
    $$('video').forEach(function (v) { v.pause(); });
    resetCreate();
    var prev = (($('.screen.active') || {}).id || 'screen-home').replace('screen-', '');
    if (prev === 'player' || prev === 'create') prev = 'home';
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === 'screen-create'); });
    pushLayer(function () { stopCam(); resetCreate(); show(prev); });
  }
  function resetCreate() {
    $('#createPick').classList.remove('hidden'); $('#createRec').classList.add('hidden'); $('#createPreview').classList.add('hidden');
    $('#captionInput').value = ''; pickedBlob = null; var pv = $('#previewVideo'); pv.pause(); pv.removeAttribute('src'); pv.load();
  }
  $('#createClose').addEventListener('click', closeTop);
  $('#btnGallery').addEventListener('click', function () { $('#fileInput').value = ''; $('#fileInput').click(); });
  $('#fileInput').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (f.size > 60 * 1024 * 1024) { toast('This video is too big. Please choose a shorter one.'); return; }
    var url = URL.createObjectURL(f), probe = document.createElement('video');
    probe.preload = 'metadata'; probe.muted = true; probe.src = url;
    probe.onloadedmetadata = function () {
      if (probe.duration && isFinite(probe.duration) && probe.duration > MAX_SEC + 0.5) { toast('Please choose a video of 30 seconds or less.'); URL.revokeObjectURL(url); return; }
      showPreview(f, url);
    };
    probe.onerror = function () { toast("This video can't be played here."); };
  });
  function startCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Camera is not available. Use Upload instead.'); return Promise.reject(); }
    stopCam();
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 1280 } }, audio: true }).then(function (s) {
      camStream = s; var v = $('#camView'); v.srcObject = s; v.style.transform = facing === 'user' ? 'scaleX(-1)' : 'none'; v.play().catch(function () {});
    }).catch(function (e) { toast('Camera permission is needed to record.'); throw e; });
  }
  function stopCam() {
    if (recorder && recorder.state === 'recording') { try { recorder.onstop = null; recorder.stop(); } catch (e) {} }
    clearInterval(recTimer); recorder = null;
    if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; }
    var v = $('#camView'); if (v) v.srcObject = null;
    $('#btnShutter').classList.remove('on');
  }
  $('#btnRecord').addEventListener('click', function () {
    startCam().then(function () {
      $('#createPick').classList.add('hidden'); $('#createRec').classList.remove('hidden');
      $('#recTimer').textContent = '0:00 / 0:30'; $('#recProgress').style.width = '0';
    }).catch(function () {});
  });
  $('#btnFlip').addEventListener('click', function () { if (recorder && recorder.state === 'recording') return; facing = facing === 'user' ? 'environment' : 'user'; startCam().catch(function () {}); });
  $('#btnRecCancel').addEventListener('click', function () { stopCam(); resetCreate(); });
  function pickMime() {
    var c = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    for (var i = 0; i < c.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i];
    return '';
  }
  $('#btnShutter').addEventListener('click', function () {
    if (!camStream) return;
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    if (!window.MediaRecorder) { toast('Recording is not supported on this phone. Use Upload instead.'); return; }
    recChunks = [];
    var mime = pickMime();
    try { recorder = new MediaRecorder(camStream, mime ? { mimeType: mime, videoBitsPerSecond: 1200000 } : undefined); }
    catch (e) { toast('Recording is not supported on this phone.'); return; }
    recorder.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
    recorder.onstop = function () {
      clearInterval(recTimer); $('#btnShutter').classList.remove('on');
      var blob = new Blob(recChunks, { type: (recorder && recorder.mimeType) || mime || 'video/webm' });
      stopCam();
      if (blob.size < 1000) { toast('Recording too short'); resetCreate(); return; }
      showPreview(blob, URL.createObjectURL(blob));
    };
    recorder.start(500); recStart = Date.now(); $('#btnShutter').classList.add('on');
    recTimer = setInterval(function () {
      var s = (Date.now() - recStart) / 1000;
      $('#recTimer').textContent = '0:' + String(Math.min(MAX_SEC, Math.floor(s))).padStart(2, '0') + ' / 0:30';
      $('#recProgress').style.width = Math.min(100, s / MAX_SEC * 100) + '%';
      if (s >= MAX_SEC && recorder && recorder.state === 'recording') recorder.stop();
    }, 200);
  });
  function showPreview(blob, url) {
    pickedBlob = blob;
    $('#createPick').classList.add('hidden'); $('#createRec').classList.add('hidden'); $('#createPreview').classList.remove('hidden');
    var pv = $('#previewVideo'); pv.src = url; pv.play().catch(function () {});
    setTimeout(function () { $('#captionInput').focus(); }, 300);
  }
  $('#btnRetake').addEventListener('click', resetCreate);
  function makeThumb(v) {
    return new Promise(function (res) {
      function draw() {
        try {
          var w = 360, h = Math.round(360 * (v.videoHeight || 640) / (v.videoWidth || 360));
          var c = document.createElement('canvas'); c.width = w; c.height = Math.max(1, h);
          c.getContext('2d').drawImage(v, 0, 0, w, c.height); res(c.toDataURL('image/jpeg', 0.7));
        } catch (e) { res(''); }
      }
      if (v.readyState >= 2) draw(); else v.addEventListener('loadeddata', draw, { once: true });
      setTimeout(function () { res(''); }, 3000);
    });
  }
  $('#btnPost').addEventListener('click', function () {
    if (!pickedBlob) return;
    var btn = this; btn.disabled = true; btn.textContent = 'Posting...';
    var cap = $('#captionInput').value.trim();
    makeThumb($('#previewVideo')).then(function (thumb) {
      var row = { id: 'm' + Date.now(), blob: pickedBlob, thumb: thumb, caption: cap, at: Date.now() };
      // DEMO: saved in this phone's IndexedDB only. Real version uploads to Cloudinary.
      return idb('readwrite', function (st) { return st.put(row); }).then(function () {
        myPosts.unshift({ id: row.id, creator: 'me', src: URL.createObjectURL(row.blob), thumb: thumb, caption: cap, likes: 0, shares: 0, sound: 'Original sound - ' + S.profile.name, at: row.at, mine: true });
      });
    }).then(function () {
      btn.disabled = false; btn.textContent = 'Post';
      closeTop();
      setTimeout(function () {
        feedMode = 'foryou'; $$('.tab').forEach(function (x) { x.classList.toggle('on', x.dataset.feed === 'foryou'); });
        renderHome(); $('#feed').scrollTop = 0; toast('Posted');
      }, 60);
    }).catch(function () { btn.disabled = false; btn.textContent = 'Post'; toast('Could not save the video on this phone.'); });
  });

  window.JR = { S: S, show: show, goTab: goTab, openCreator: openCreator, openComments: openComments, openMore: openMore, openReport: openReport, confirmBlock: confirmBlock, showPreview: showPreview, openPlayer: openPlayer, allPosts: allPosts, closeTop: closeTop };
  /* ---------- start ---------- */
  renderHome(); // demo videos show at once; own videos load from this phone next
  window.JR.ready = true;
  loadMyPosts().then(function () {
    if (myPosts.length) renderHome();
    window.JR.mineLoaded = true;
    var m = location.hash.match(/v=([\w-]+)/);
    if (m) { var p = postById(m[1]); if (p) openPlayer([p], 0); }
  });
})();
