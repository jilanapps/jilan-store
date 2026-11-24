/* Jilan Reels v1.0 — app.js (UI)
 * Same look as the demo. Data comes from Firestore (JRApi) and videos from
 * Cloudinary (JRMedia). Watching works without an account; liking,
 * commenting, following, posting and reporting ask the user to log in.
 */
(function () {
  'use strict';
  var L = window.JRLib, A = window.JRAuth, Api = window.JRApi, M = window.JRMedia;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = L.esc, fmt = L.fmt;
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
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>',
    out: '<svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>'
  };
  var HOME = window.JR_HOME_URL || (location.origin + location.pathname);

  /* ---------- small helpers ---------- */
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function errMsg(e) { return (e && e.message) ? e.message : 'Something went wrong. Please try again.'; }
  function avatarHtml(name, photo, id, cls) {
    var inner = photo ? '<img src="' + esc(photo) + '" alt="">' : esc(L.initials(name));
    return '<div class="avatar ' + (cls || '') + '" style="background:' + L.colorFor(id) + '">' + inner + '</div>';
  }
  function capHtml(s) { return esc(s).replace(/#([A-Za-z0-9_]{1,30})/g, '<button class="tag" data-tag="$1">#$1</button>'); }
  var notInterested = {};
  try { notInterested = JSON.parse(localStorage.getItem('jr-not-interested') || '{}') || {}; } catch (e) {}
  function saveNI() { try { var k = Object.keys(notInterested); if (k.length > 500) k.slice(0, k.length - 500).forEach(function (x) { delete notInterested[x]; }); localStorage.setItem('jr-not-interested', JSON.stringify(notInterested)); } catch (e) {} }
  function visible(v) { return v && !v.hidden && !Api.isBlocked(v.ownerUid) && !notInterested[v.id]; }
  var cache = {}; // id -> video
  function remember(list) { list.forEach(function (v) { cache[v.id] = v; }); return list; }
  function isMine(v) { return !!(Api.me && v.ownerUid === Api.me.uid); }

  /* ---------- login gate ---------- */
  function loggedIn() { return !!Api.me; }
  var afterLogin = null;
  function requireLogin(fn) {
    if (!A.ready) { toast(A.error || "Setup isn't finished yet."); return; }
    if (loggedIn()) {
      if (Api.me.banned) { toast('Your account is restricted. You can still watch videos.'); return; }
      fn(); return;
    }
    afterLogin = fn;
    openLogin();
  }

  /* ---------- back stack (Android Back) ---------- */
  var stack = [];
  function pushLayer(closer) { stack.push(closer); history.pushState({ jr: stack.length }, ''); }
  function closeTop() { if (stack.length) history.back(); }
  window.addEventListener('popstate', function () { var c = stack.pop(); if (c) c(); });

  /* ---------- sheets ---------- */
  function openSheet(html, onReady) {
    if (sheetOpen()) { hideSheet(); stack.pop(); history.replaceState(null, ''); }
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
  function head(title) { return '<div class="sh-head"><span class="sh-title">' + esc(title) + '</span><button class="iconbtn sh-close" aria-label="Close">' + ICON.close + '</button></div>'; }
  document.addEventListener('click', function (e) { if (e.target.closest('.sh-close')) closeSheet(); });

  /* ---------- feed rendering ---------- */
  var soundOn = false, current = null;
  var playObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target.querySelector('video');
      if (!v) return;
      if (en.isIntersecting && en.intersectionRatio > 0.6 && isVisibleScreen(en.target)) {
        current = en.target;
        loadAround(en.target);
        $$('.reel video').forEach(function (o) { if (o !== v) o.pause(); });
        en.target.classList.remove('paused');
        v.muted = !soundOn;
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
        maybeMore(en.target);
      } else { v.pause(); }
    });
  }, { threshold: [0, 0.6, 1] });
  function isVisibleScreen(el) { var s = el.closest('.screen'); return s && s.classList.contains('active'); }
  // Only the current reel and its neighbours get a video src (saves data).
  function loadAround(reel) {
    var list = $$('.reel', reel.parentNode), i = list.indexOf(reel);
    list.forEach(function (r, j) {
      var v = r.querySelector('video'); if (!v) return;
      if (j >= i - 1 && j <= i + 2) { if (!v.getAttribute('src')) { v.setAttribute('src', v.dataset.src); v.load(); } }
      else if (v.getAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); }
    });
  }
  function reelHtml(v) {
    var mine = isMine(v), followed = Api.isFollowing(v.ownerUid), liked = Api.isLiked(v.id);
    return '<div class="reel" data-id="' + esc(v.id) + '">' +
      '<video data-src="' + esc(v.video.url) + '" poster="' + esc(v.video.thumb) + '" playsinline webkit-playsinline loop muted preload="none"></video>' +
      '<div class="shade"></div><div class="pause-ico">' + ICON.play + '</div>' +
      (soundOn ? '' : '<button class="sound-pill">' + ICON.mute + 'Tap for sound</button>') +
      '<div class="rail">' +
        '<div class="creator"><button class="open-creator" data-u="' + esc(v.ownerUid) + '">' + avatarHtml(v.ownerName, v.ownerPhoto, v.ownerUid) + '</button>' +
          (mine ? '' : '<button class="follow' + (followed ? ' done' : '') + '" data-u="' + esc(v.ownerUid) + '" aria-label="Follow">' + (followed ? ICON.check : ICON.plus) + '</button>') + '</div>' +
        '<button class="like' + (liked ? ' liked' : '') + '" aria-label="Like">' + ICON.heart + '<span>' + fmt(v.likeCount) + '</span></button>' +
        '<button class="comments" aria-label="Comments">' + ICON.comment + '<span>' + fmt(v.commentCount) + '</span></button>' +
        '<button class="share" aria-label="Share">' + ICON.share + '<span>Share</span></button>' +
        '<button class="more" aria-label="More">' + ICON.more + '</button>' +
      '</div>' +
      '<div class="info"><button class="who open-creator" data-u="' + esc(v.ownerUid) + '">@' + esc(v.ownerUsername) + (mine ? '<span class="mine-badge">You</span>' : '') + '</button>' +
        '<div class="cap">' + capHtml(v.caption || '') + '</div>' +
        '<div class="music">' + ICON.music + '<span>Original sound - ' + esc(v.ownerName) + '</span></div></div>' +
      '<div class="progress"><i></i></div>' +
      '</div>';
  }
  function wireReel(r) {
    playObserver.observe(r);
    var v = r.querySelector('video'), bar = r.querySelector('.progress i');
    v.addEventListener('timeupdate', function () { if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + '%'; });
  }
  function appendReels(container, list) {
    var tmp = document.createElement('div');
    tmp.innerHTML = list.map(reelHtml).join('');
    $$('.reel', tmp).forEach(function (r) { container.appendChild(r); wireReel(r); });
  }
  function clearFeed(container) { $$('.reel', container).forEach(function (r) { playObserver.unobserve(r); }); container.innerHTML = ''; }

  /* ---------- home feed (For You / Following), 10 per page ---------- */
  var feedMode = 'foryou';
  var feeds = { foryou: null, following: null };
  function newFeed() { return { items: [], cursor: null, done: false, loading: false }; }
  function loadFeedPage(mode) {
    var f = feeds[mode];
    if (!f || f.loading || f.done) return Promise.resolve();
    if (!A.ready) { showFeedEmpty(); return Promise.resolve(); }
    f.loading = true;
    var p = mode === 'following' ? Api.followingPage(f.cursor) : Api.feedPage(f.cursor);
    return p.then(function (r) {
      f.loading = false; f.cursor = r.cursor || f.cursor; f.done = r.done;
      var fresh = remember(r.items).filter(visible);
      f.items = f.items.concat(fresh);
      if (feedMode === mode) appendReels($('#feed'), fresh);
      showFeedEmpty();
      // a page that was all filtered out: fetch the next one
      if (!fresh.length && !f.done && feedMode === mode && f.items.length < 3) return loadFeedPage(mode);
    }).catch(function (e) {
      f.loading = false; console.error(e);
      if (feedMode === mode) toast(/index/i.test(e.message || '') ? 'The server is getting ready. Please try again in a few minutes.' : 'Could not load videos. Check your internet.');
      showFeedEmpty(true);
    });
  }
  function showFeedEmpty(failed) {
    var f = feeds[feedMode], empty = $('#feedEmpty');
    if (f && (f.items.length || f.loading)) { empty.classList.add('hidden'); return; }
    if (!A.ready) empty.innerHTML = ICON.info + '<b>Almost ready</b><span>' + esc(A.error) + '</span>';
    else if (failed) empty.innerHTML = ICON.refresh + '<b>Could not load videos</b><span>Check your internet and try again.</span><button class="bigbtn small" id="feedRetry">Try again</button>';
    else if (feedMode === 'following') empty.innerHTML = ICON.user + '<b>No videos yet</b><span>' + (loggedIn() ? 'Follow creators to see their videos here.' : 'Log in and follow creators to see their videos here.') + '</span>';
    else empty.innerHTML = ICON.play + '<b>No videos yet</b><span>Be the first to post. Tap + below.</span>';
    empty.classList.remove('hidden');
    var rb = $('#feedRetry'); if (rb) rb.onclick = function () { resetFeed(feedMode); };
  }
  function resetFeed(mode) {
    feeds[mode] = newFeed();
    if (feedMode === mode) { clearFeed($('#feed')); $('#feed').scrollTop = 0; }
    return loadFeedPage(mode);
  }
  function showMode(mode) {
    feedMode = mode;
    $$('.tab').forEach(function (x) { x.classList.toggle('on', x.dataset.feed === mode); });
    clearFeed($('#feed')); $('#feed').scrollTop = 0;
    if (!feeds[mode]) { feeds[mode] = newFeed(); loadFeedPage(mode); }
    else { appendReels($('#feed'), feeds[mode].items.filter(visible)); showFeedEmpty(); }
  }
  function maybeMore(reel) {
    var c = reel.parentNode; if (!c || c.id !== 'feed') return;
    var list = $$('.reel', c);
    if (list.indexOf(reel) >= list.length - 3) loadFeedPage(feedMode);
  }
  $$('.tab').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.feed === feedMode) { resetFeed(feedMode); return; } // tap again = refresh
      showMode(b.dataset.feed);
    });
  });

  // Remove a video / a user's videos from every list on screen.
  function dropWhere(test) {
    Object.keys(feeds).forEach(function (k) { if (feeds[k]) feeds[k].items = feeds[k].items.filter(function (v) { return !test(v); }); });
    $$('.reel').forEach(function (r) { var v = cache[r.dataset.id]; if (v && test(v)) { playObserver.unobserve(r); r.remove(); } });
    $$('.cell[data-id]').forEach(function (c) { var v = cache[c.dataset.id]; if (v && test(v)) c.remove(); });
    showFeedEmpty();
    if ($('#screen-player').classList.contains('active') && !$$('#playerFeed .reel').length) closeTop();
  }
  function updateReels(id) {
    var v = cache[id]; if (!v) return;
    $$('.reel[data-id="' + id + '"]').forEach(function (r) {
      var lk = r.querySelector('.like'); lk.classList.toggle('liked', Api.isLiked(id)); lk.querySelector('span').textContent = fmt(v.likeCount);
      r.querySelector('.comments span').textContent = fmt(v.commentCount);
    });
  }
  function updateFollowButtons() {
    $$('.follow').forEach(function (b) { var on = Api.isFollowing(b.dataset.u); b.classList.toggle('done', on); b.innerHTML = on ? ICON.check : ICON.plus; });
  }

  /* ---------- actions ---------- */
  var busy = {};
  function toggleLike(id, forceOn) {
    requireLogin(function () {
      var v = cache[id]; if (!v || busy['l' + id]) return;
      var on = !Api.isLiked(id);
      if (forceOn && !on) return;
      busy['l' + id] = true;
      // optimistic
      v.likeCount = Math.max(0, (v.likeCount || 0) + (on ? 1 : -1));
      if (on) Api.state.likes[id] = Date.now(); else delete Api.state.likes[id];
      updateReels(id);
      Api.setLike(v, on).catch(function (e) {
        v.likeCount = Math.max(0, v.likeCount + (on ? -1 : 1));
        if (on) delete Api.state.likes[id]; else Api.state.likes[id] = Date.now();
        updateReels(id); toast(e && e.code === 'permission-denied' ? "Couldn't like this video." : errMsg(e));
      }).then(function () { busy['l' + id] = false; });
    });
  }
  function toggleFollow(u, name) {
    requireLogin(function () {
      if (busy['f' + u]) return;
      var on = !Api.isFollowing(u);
      busy['f' + u] = true;
      Api.setFollow(u, on).then(function () {
        toast(on ? 'Following' + (name ? ' ' + name : '') : 'Unfollowed');
        updateFollowButtons();
        if (profileOf === u && profileUser) { profileUser.followers = Math.max(0, (profileUser.followers || 0) + (on ? 1 : -1)); renderProfileHead(); }
        feeds.following = null;
      }).catch(function (e) { toast(errMsg(e)); }).then(function () { busy['f' + u] = false; });
    });
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
  var lastTap = 0, tapTimer = null;
  function onFeedClick(e) {
    var reel = e.target.closest('.reel'); if (!reel) return;
    var id = reel.dataset.id, t = e.target, v = cache[id];
    if (t.closest('.tag')) { e.stopPropagation(); openDiscover('#' + t.closest('.tag').dataset.tag); return; }
    if (t.closest('.follow')) { toggleFollow(t.closest('.follow').dataset.u, v && v.ownerName); return; }
    if (t.closest('.open-creator')) { openProfile(t.closest('.open-creator').dataset.u); return; }
    if (t.closest('.like')) { toggleLike(id); return; }
    if (t.closest('.comments')) { openComments(id); return; }
    if (t.closest('.share')) { shareVideo(id); return; }
    if (t.closest('.more')) { openMore(id); return; }
    if (t.closest('.sound-pill')) { enableSound(); return; }
    if (t.closest('.rail') || t.closest('.info')) return;
    var now = Date.now();
    if (now - lastTap < 300) {
      clearTimeout(tapTimer); tapTimer = null; lastTap = 0;
      if (loggedIn()) { toggleLike(id, true); bigHeart(reel, e.clientX, e.clientY); } else toggleLike(id, true);
      return;
    }
    lastTap = now;
    tapTimer = setTimeout(function () {
      tapTimer = null;
      var vid = reel.querySelector('video');
      if (!soundOn) { enableSound(); return; }
      if (vid.paused) { vid.play().catch(function () {}); reel.classList.remove('paused'); }
      else { vid.pause(); reel.classList.add('paused'); }
    }, 300);
  }
  $('#feed').addEventListener('click', onFeedClick);
  $('#playerFeed').addEventListener('click', onFeedClick);

  /* ---------- comments ---------- */
  function openComments(id) {
    var v = cache[id]; if (!v) return;
    var list = [];
    function listHtml() {
      var vis = list.filter(function (c) { return !Api.isBlocked(c.uid); });
      if (!vis.length) return '<div class="empty small"><b>No comments yet</b><span>Be the first to comment.</span></div>';
      return vis.map(function (c) {
        var canDel = Api.me && (c.uid === Api.me.uid || isMine(v) || Api.isAdmin);
        return '<div class="comment" data-cid="' + esc(c.id) + '">' + avatarHtml(c.name, '', c.uid, 'sm') + '<div class="c-body"><div class="c-name">' + esc(c.name) + ' <span class="muted">@' + esc(c.username) + '</span></div><div class="c-text">' + esc(c.text) + '</div><div class="c-time">' + L.ago(Api.ms(c.createdAt)) +
          (Api.me && c.uid !== Api.me.uid ? ' · <button class="c-report" data-cid="' + esc(c.id) + '">Report</button>' : '') +
          (canDel ? ' · <button class="c-del" data-cid="' + esc(c.id) + '">Delete</button>' : '') + '</div></div></div>';
      }).join('');
    }
    function title() { return fmt(v.commentCount) + (v.commentCount === 1 ? ' comment' : ' comments'); }
    openSheet(head(title()) + '<div class="sh-body" id="cList"><div class="center" style="padding:30px"><div class="spinner"></div></div></div>' +
      '<div class="c-input"><input id="cInput" maxlength="150" placeholder="' + (loggedIn() ? 'Add a comment...' : 'Log in to comment') + '"><button id="cSend">Post</button></div>', function (sh) {
      var paint = function () { var el = $('#cList', sh); if (el) el.innerHTML = listHtml(); var t = $('.sh-title', sh); if (t) t.textContent = title(); };
      Api.listComments(id).then(function (r) { list = r; paint(); }).catch(function () { var el = $('#cList', sh); if (el) el.innerHTML = '<div class="empty small"><b>Could not load comments</b></div>'; });
      function send() {
        var inp = $('#cInput', sh), txt = L.cleanText(inp.value, L.MAX_COMMENT); if (!txt) return;
        requireLogin(function () {
          $('#cSend', sh).disabled = true;
          Api.addComment(v, txt).then(function (c) {
            inp.value = ''; list.unshift(c); v.commentCount = (v.commentCount || 0) + 1; paint(); updateReels(id);
          }).catch(function (e) { toast(errMsg(e)); }).then(function () { var b = $('#cSend', sh); if (b) b.disabled = false; });
        });
      }
      $('#cSend', sh).addEventListener('click', send);
      $('#cInput', sh).addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
      $('#cInput', sh).addEventListener('focus', function () { if (!loggedIn()) { this.blur(); requireLogin(function () {}); } });
      sh.addEventListener('click', function (e) {
        var d = e.target.closest('.c-del'), r = e.target.closest('.c-report');
        if (d) {
          var c = list.filter(function (x) { return x.id === d.dataset.cid; })[0]; if (!c) return;
          Api.deleteComment(id, c).then(function () {
            list = list.filter(function (x) { return x.id !== c.id; }); v.commentCount = Math.max(0, (v.commentCount || 0) - 1); paint(); updateReels(id); toast('Comment deleted');
          }).catch(function (er) { toast(errMsg(er)); });
        }
        if (r) {
          var cc = list.filter(function (x) { return x.id === r.dataset.cid; })[0]; if (!cc) return;
          closeSheet(function () { openReport({ type: 'comment', targetId: id + '/' + cc.id, targetOwner: cc.uid, videoId: id }); });
        }
      });
    });
  }

  /* ---------- share ---------- */
  function shareUrl(id) { return HOME.split('#')[0] + '#v=' + id; }
  function shareVideo(id) {
    var v = cache[id], url = shareUrl(id), text = '@' + v.ownerUsername + ' on Jilan Reels' + (v.caption ? ': ' + v.caption : '');
    if (window.Android && Android.shareText) { try { Android.shareText(text + '\n' + url); return; } catch (e) {} }
    if (navigator.share) { navigator.share({ title: 'Jilan Reels', text: text, url: url }).catch(function () {}); return; }
    copyText(url); toast('Link copied');
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).catch(function () { fallbackCopy(t); }); return; }
    fallbackCopy(t);
  }
  function fallbackCopy(t) { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); }

  /* ---------- more / report / block ---------- */
  function openMore(id) {
    var v = cache[id]; if (!v) return;
    if (isMine(v)) {
      openSheet(head('Your video') + '<div class="sh-body">' +
        (v.hidden ? '<div class="field"><label>This video was hidden by an admin. Only you can see it.</label></div>' : '') +
        '<button class="opt red" data-a="delete">' + ICON.trash + 'Delete video</button></div>', function (sh) {
        $('[data-a=delete]', sh).addEventListener('click', function () { closeSheet(function () { confirmDeleteVideo(v); }); });
      });
      return;
    }
    openSheet(head('Options') + '<div class="sh-body">' +
      '<button class="opt" data-a="report">' + ICON.flag + 'Report video</button>' +
      '<button class="opt" data-a="hide">' + ICON.hide + 'Not interested</button>' +
      '<button class="opt red" data-a="block">' + ICON.block + 'Block @' + esc(v.ownerUsername) + '</button>' +
      (Api.isAdmin ? '<button class="opt" data-a="ahide">' + ICON.shield + 'Admin: hide video</button><button class="opt red" data-a="adel">' + ICON.trash + 'Admin: delete video</button>' : '') +
      '</div>', function (sh) {
      $('[data-a=report]', sh).addEventListener('click', function () { closeSheet(function () { openReport({ type: 'video', targetId: id, targetOwner: v.ownerUid, videoId: id }); }); });
      $('[data-a=hide]', sh).addEventListener('click', function () { closeSheet(function () { notInterested[id] = Date.now(); saveNI(); dropWhere(function (x) { return x.id === id; }); toast("You won't see this video again"); }); });
      $('[data-a=block]', sh).addEventListener('click', function () { closeSheet(function () { confirmBlock(v.ownerUid, v.ownerName); }); });
      if (Api.isAdmin) {
        $('[data-a=ahide]', sh).addEventListener('click', function () { closeSheet(function () { Api.setHidden(id, true).then(function () { v.hidden = true; dropWhere(function (x) { return x.id === id; }); toast('Video hidden'); }).catch(function (e) { toast(errMsg(e)); }); }); });
        $('[data-a=adel]', sh).addEventListener('click', function () { closeSheet(function () { confirmDeleteVideo(v); }); });
      }
    });
  }
  function confirmDeleteVideo(v) {
    openSheet(head('Delete this video?') + '<div class="sh-body"><div class="field"><label>This can\'t be undone. Likes and comments on it will be removed.</label></div></div>' +
      '<div class="sh-foot"><button class="bigbtn danger small" id="doDel">Delete</button></div>', function (sh) {
      $('#doDel', sh).addEventListener('click', function () {
        this.disabled = true; this.textContent = 'Deleting...';
        Api.deleteVideo(v).then(function () {
          closeSheet(function () { dropWhere(function (x) { return x.id === v.id; }); if (profileOf && profileUser) { profileUser.videoCount = Math.max(0, (profileUser.videoCount || 0) - 1); } toast('Video deleted'); });
        }).catch(function (e) { toast(errMsg(e)); closeSheet(); });
      });
    });
  }
  function openReport(r) {
    requireLogin(function () {
      var title = r.type === 'user' ? 'Report account' : (r.type === 'comment' ? 'Report comment' : 'Report video');
      openSheet(head(title) + '<div class="sh-body"><div class="field"><label>Why are you reporting this?</label></div>' +
        L.REPORT_REASONS.map(function (x, i) { return '<button class="opt" data-r="' + i + '">' + ICON.flag + esc(x) + '</button>'; }).join('') + '</div>', function (sh) {
        $$('[data-r]', sh).forEach(function (b) {
          b.addEventListener('click', function () {
            var reason = L.REPORT_REASONS[+b.dataset.r];
            r.reason = reason;
            Api.report(r).then(function () {
              if (r.type === 'video') { notInterested[r.targetId] = Date.now(); saveNI(); }
              closeSheet(function () {
                if (r.type === 'video') dropWhere(function (x) { return x.id === r.targetId; });
                toast('Thanks for reporting. Our team will review it.');
              });
            }).catch(function (e) { toast(errMsg(e)); });
          });
        });
      });
    });
  }
  function confirmBlock(u, name) {
    requireLogin(function () {
      if (Api.me && u === Api.me.uid) return;
      openSheet(head('Block ' + (name || 'this account') + '?') + '<div class="sh-body"><div class="field"><label>You will not see their videos or comments, and they can\'t follow you or comment on your videos. They will not be told.</label></div></div>' +
        '<div class="sh-foot"><button class="bigbtn danger small" id="doBlock">Block</button></div>', function (sh) {
        $('#doBlock', sh).addEventListener('click', function () {
          this.disabled = true;
          Api.setBlock(u, true).then(function () {
            closeSheet(function () {
              dropWhere(function (x) { return x.ownerUid === u; });
              if ($('#screen-profile').classList.contains('active') && profileOf === u) closeTop();
              updateFollowButtons(); toast((name || 'Account') + ' blocked');
            });
          }).catch(function (e) { toast(errMsg(e)); closeSheet(); });
        });
      });
    });
  }
  function openBlockedList() {
    var ids = Object.keys(Api.state.blocks || {}).slice(0, 50);
    openSheet(head('Blocked accounts') + '<div class="sh-body" id="blList">' + (ids.length ? '<div class="center" style="padding:30px"><div class="spinner"></div></div>' : '<div class="empty small"><b>No blocked accounts</b></div>') + '</div>', function (sh) {
      if (!ids.length) return;
      Promise.all(ids.map(function (id) { return Api.getUser(id).catch(function () { return null; }); })).then(function (users) {
        var el = $('#blList', sh); if (!el) return;
        el.innerHTML = ids.map(function (id, i) {
          var u = users[i] || { name: 'Deleted account', username: 'unknown' };
          return '<div class="comment" style="align-items:center">' + avatarHtml(u.name, u.photo, id, 'sm') + '<div class="c-body"><div class="c-text">' + esc(u.name) + '</div><div class="c-name">@' + esc(u.username) + '</div></div><button class="bigbtn alt small" style="width:auto;padding:0 14px" data-unblock="' + esc(id) + '">Unblock</button></div>';
        }).join('');
        $$('[data-unblock]', el).forEach(function (b) {
          b.addEventListener('click', function () {
            Api.setBlock(b.dataset.unblock, false).then(function () { b.closest('.comment').remove(); toast('Unblocked'); feeds.foryou = null; feeds.following = null; })
              .catch(function (e) { toast(errMsg(e)); });
          });
        });
      });
    });
  }

  /* ---------- screens ---------- */
  var tabLayer = false;
  function show(name) {
    $$('.screen:not(#screen-gate)').forEach(function (s) { s.classList.toggle('active', s.id === 'screen-' + name); });
    $$('.bottomnav button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === name); });
    $$('video').forEach(function (v) { if (!v.closest('.screen.active')) v.pause(); });
    if (name === 'home') {
      if (!feeds[feedMode]) showMode(feedMode);
      else if (!$$('#feed .reel').length && feeds[feedMode].items.length) showMode(feedMode);
      if (current && current.closest('#feed')) { var v = current.querySelector('video'); v.muted = !soundOn; v.play().catch(function () {}); }
    }
  }
  function goTab(name) {
    if (name === 'create') { requireLogin(openCreate); return; }
    if (name === 'home') { if (tabLayer) closeTop(); else show('home'); return; }
    if (!tabLayer) { tabLayer = true; pushLayer(function () { tabLayer = false; show('home'); }); }
    if (name === 'profile') showProfile(loggedIn() ? Api.me.uid : null);
    if (name === 'discover') renderChips();
    show(name);
  }
  $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { goTab(b.dataset.go); }); });

  /* player overlay */
  var playerReturn = 'home';
  function openPlayer(list, idx) {
    playerReturn = (($('.screen.active') || {}).id || 'screen-home').replace('screen-', '');
    if (playerReturn === 'player') playerReturn = 'home';
    show('player');
    var pf = $('#playerFeed'); clearFeed(pf);
    appendReels(pf, list.filter(function (v) { return v && (visible(v) || isMine(v) || Api.isAdmin); }));
    var t = pf.children[idx || 0]; if (t) pf.scrollTop = t.offsetTop;
    pushLayer(function () { clearFeed($('#playerFeed')); show(playerReturn); });
  }
  $('#playerBack').addEventListener('click', closeTop);

  /* ---------- profile ---------- */
  var profileOf = null, profileUser = null, profileList = null;
  function openProfile(u) {
    if (loggedIn() && u === Api.me.uid) { goTab('profile'); return; }
    var prev = (($('.screen.active') || {}).id || 'screen-home').replace('screen-', '');
    var prevOf = profileOf;
    showProfile(u); show('profile');
    pushLayer(function () { show(prev === 'profile' ? 'profile' : prev); if (prev === 'profile') showProfile(prevOf); });
  }
  function renderProfileHead() {
    var u = profileUser; if (!u) return;
    var mine = loggedIn() && profileOf === Api.me.uid;
    if (mine) u = profileUser = Object.assign({}, profileUser, Api.me);
    $('#profileTitle').textContent = mine ? 'Profile' : u.name;
    $('#profileAvatar').outerHTML = avatarHtml(u.name, u.photo, profileOf, 'xl').replace('<div class="avatar xl"', '<div id="profileAvatar" class="avatar xl"');
    $('#profileName').textContent = u.name;
    $('#profileUser').textContent = '@' + u.username;
    $('#profileBio').textContent = u.bio || '';
    $('#profileBanned').classList.toggle('hidden', !u.banned);
    $('#stFollowing').textContent = fmt(u.following);
    $('#stFollowers').textContent = fmt(u.followers);
    $('#stLikes').textContent = fmt((profileList || []).reduce(function (a, v) { return a + (v.likeCount || 0); }, 0));
    var btn = $('#profileAction');
    if (mine) { btn.textContent = 'Edit profile'; btn.className = 'bigbtn alt small'; }
    else { var f = Api.isFollowing(profileOf); btn.textContent = f ? 'Following' : 'Follow'; btn.className = 'bigbtn small' + (f ? ' alt' : ''); }
  }
  var profileCursor = null, profileDone = true, profileToken = 0;
  function showProfile(u) {
    var guest = !u;
    $('#profileGuest').classList.toggle('hidden', !guest);
    $('#profileBody').classList.toggle('hidden', guest);
    $('#profileBack').classList.toggle('hidden', !u || (loggedIn() && u === Api.me.uid));
    $('#profileMenu').classList.toggle('hidden', guest);
    profileOf = u; profileList = []; profileCursor = null; profileDone = true;
    if (guest) { $('#profileTitle').textContent = 'Profile'; return; }
    var tok = ++profileToken;
    var mine = loggedIn() && u === Api.me.uid;
    profileUser = mine ? Object.assign({}, Api.me) : (profileUser && profileUser.id === u ? profileUser : { name: '', username: '', followers: 0, following: 0 });
    $('#profileGrid').innerHTML = ''; $('#profileEmpty').classList.add('hidden'); $('#profileMore').classList.add('hidden');
    renderProfileHead();
    var userP = mine ? Promise.resolve(Api.me) : Api.getUser(u);
    userP.then(function (pu) {
      if (tok !== profileToken) return;
      if (!pu) { $('#profileName').textContent = 'Account not found'; $('#profileUser').textContent = ''; return; }
      profileUser = Object.assign({ id: u }, pu); renderProfileHead();
      if (!mine && Api.isBlocked(u)) { $('#profileEmpty').innerHTML = '<b>You blocked this account</b><span>Unblock it from Settings to see videos.</span>'; $('#profileEmpty').classList.remove('hidden'); return; }
      loadProfileVideos(tok);
    }).catch(function () { toast('Could not load this profile.'); });
  }
  function loadProfileVideos(tok) {
    Api.userVideos(profileOf, profileCursor).then(function (r) {
      if (tok !== profileToken) return;
      profileCursor = r.cursor || profileCursor; profileDone = r.done;
      var items = remember(r.items).filter(function (v) { return isMine(v) || Api.isAdmin || !notInterested[v.id]; });
      profileList = profileList.concat(items);
      paintProfileGrid(); renderProfileHead();
    }).catch(function (e) { console.error(e); toast(/index/i.test(e.message || '') ? 'The server is getting ready. Try again soon.' : 'Could not load videos.'); });
  }
  function paintProfileGrid() {
    var mine = loggedIn() && profileOf === Api.me.uid;
    $('#profileGrid').innerHTML = profileList.map(function (v, i) {
      return '<button class="cell" data-id="' + esc(v.id) + '" data-i="' + i + '" style="background-image:url(\'' + esc(v.video.thumb) + '\')"><em>' + esc(v.caption || '') + '</em><span>' + ICON.heart + fmt(v.likeCount) + '</span>' + (v.hidden ? '<span class="hid">Hidden</span>' : '') + '</button>';
    }).join('');
    $$('#profileGrid .cell').forEach(function (b) { b.addEventListener('click', function () { openPlayer(profileList, +b.dataset.i); }); });
    var em = $('#profileEmpty');
    if (!profileList.length) { em.innerHTML = mine ? '<b>No videos yet</b><span>Tap + to post your first video.</span>' : '<b>No videos yet</b>'; em.classList.remove('hidden'); } else em.classList.add('hidden');
    $('#profileMore').classList.toggle('hidden', profileDone);
  }
  $('#profileMoreBtn').addEventListener('click', function () { loadProfileVideos(profileToken); });
  $('#profileBack').addEventListener('click', closeTop);
  $('#guestLogin').addEventListener('click', function () { requireLogin(function () { showProfile(Api.me.uid); }); });
  $('#profileAction').addEventListener('click', function () {
    if (loggedIn() && profileOf === Api.me.uid) { editProfile(); return; }
    toggleFollow(profileOf, profileUser && profileUser.name);
    setTimeout(renderProfileHead, 400);
  });
  $('#profileMenu').addEventListener('click', function () {
    if (loggedIn() && profileOf === Api.me.uid) { openSettings(); return; }
    var u = profileOf, pu = profileUser || {};
    openSheet(head('@' + (pu.username || '')) + '<div class="sh-body">' +
      '<button class="opt" data-a="share">' + ICON.share + 'Share profile</button>' +
      '<button class="opt" data-a="report">' + ICON.flag + 'Report account</button>' +
      (Api.isBlocked(u) ? '<button class="opt" data-a="unblock">' + ICON.block + 'Unblock</button>' : '<button class="opt red" data-a="block">' + ICON.block + 'Block</button>') +
      (Api.isAdmin ? '<button class="opt red" data-a="ban">' + ICON.shield + (pu.banned ? 'Admin: unban account' : 'Admin: ban account') + '</button>' : '') +
      '</div>', function (sh) {
      $('[data-a=share]', sh).addEventListener('click', function () {
        closeSheet(function () {
          var url = HOME.split('#')[0] + '#u=' + pu.username;
          if (window.Android && Android.shareText) { try { Android.shareText('@' + pu.username + ' on Jilan Reels\n' + url); return; } catch (e) {} }
          copyText(url); toast('Profile link copied');
        });
      });
      $('[data-a=report]', sh).addEventListener('click', function () { closeSheet(function () { openReport({ type: 'user', targetId: u, targetOwner: u }); }); });
      var bl = $('[data-a=block]', sh); if (bl) bl.addEventListener('click', function () { closeSheet(function () { confirmBlock(u, pu.name); }); });
      var ub = $('[data-a=unblock]', sh); if (ub) ub.addEventListener('click', function () { closeSheet(function () { Api.setBlock(u, false).then(function () { toast('Unblocked'); showProfile(u); }).catch(function (e) { toast(errMsg(e)); }); }); });
      var bn = $('[data-a=ban]', sh); if (bn) bn.addEventListener('click', function () {
        closeSheet(function () { Api.setBan(u, !pu.banned).then(function () { pu.banned = !pu.banned; renderProfileHead(); toast(pu.banned ? 'Account banned' : 'Account unbanned'); }).catch(function (e) { toast(errMsg(e)); }); });
      });
    });
  });
  function editProfile() {
    var me = Api.me, photo = me.photo || '';
    openSheet(head('Edit profile') + '<div class="sh-body">' +
      '<div class="field" style="align-items:center"><div id="epAv">' + avatarHtml(me.name, photo, me.uid, 'xl') + '</div><button class="textbtn" id="epPhoto">Change photo</button>' + (photo ? '<button class="textbtn" id="epNoPhoto" style="color:var(--muted)">Remove photo</button>' : '') + '<input type="file" id="epFile" accept="image/*" hidden></div>' +
      '<div class="field"><label>Name</label><input id="epName" maxlength="40" value="' + esc(me.name) + '"></div>' +
      '<div class="field"><label>Username (can\'t be changed)</label><input value="@' + esc(me.username) + '" disabled></div>' +
      '<div class="field"><label>Bio</label><textarea id="epBio" maxlength="150" placeholder="Tell people about yourself">' + esc(me.bio || '') + '</textarea></div></div>' +
      '<div class="sh-foot"><button class="bigbtn small" id="epSave">Save</button></div>', function (sh) {
      var setAv = function () { $('#epAv', sh).innerHTML = avatarHtml($('#epName', sh).value || me.name, photo, me.uid, 'xl'); };
      $('#epPhoto', sh).addEventListener('click', function () { $('#epFile', sh).value = ''; $('#epFile', sh).click(); });
      var np = $('#epNoPhoto', sh); if (np) np.addEventListener('click', function () { photo = ''; setAv(); });
      $('#epFile', sh).addEventListener('change', function () {
        var f = this.files && this.files[0]; if (!f) return;
        M.photoDataUrl(f).then(function (d) { photo = d; setAv(); }).catch(function (e) { toast(errMsg(e)); });
      });
      $('#epSave', sh).addEventListener('click', function () {
        var btn = this; btn.disabled = true; btn.textContent = 'Saving...';
        Api.updateProfile({ name: $('#epName', sh).value, bio: $('#epBio', sh).value, photo: photo }).then(function () {
          closeSheet(function () { showProfile(Api.me.uid); toast('Profile saved'); });
        }).catch(function (e) { btn.disabled = false; btn.textContent = 'Save'; toast(errMsg(e)); });
      });
    });
  }

  /* ---------- settings ---------- */
  var availableVersion = '';
  window.showAvailableVersion = function (v) {
    availableVersion = v || '';
    if (v) toast('Update available: v' + v);
  };
  function openSettings() {
    var shell = !!(window.Android && Android.checkUpdate);
    openSheet(head('Settings') + '<div class="sh-body">' +
      '<button class="opt" data-a="edit">' + ICON.edit + 'Edit profile</button>' +
      (pwAcc() ? '<button class="opt" data-a="pass">' + ICON.edit + 'Change password</button>' : '') +
      '<button class="opt" data-a="blocked">' + ICON.block + 'Blocked accounts</button>' +
      (Api.isAdmin ? '<button class="opt" data-a="admin">' + ICON.shield + 'Admin panel</button>' : '') +
      (shell ? '<button class="opt" data-a="update">' + ICON.refresh + 'Check for updates' + (availableVersion ? ' (v' + esc(availableVersion) + ' ready)' : '') + '</button>' : '') +
      '<button class="opt" data-a="terms">' + ICON.doc + 'Terms of Use</button>' +
      '<button class="opt" data-a="privacy">' + ICON.doc + 'Privacy Policy</button>' +
      '<button class="opt" data-a="safety">' + ICON.shield + 'Community & child safety</button>' +
      '<button class="opt" data-a="about">' + ICON.info + 'About Jilan Reels</button>' +
      '<button class="opt" data-a="logout">' + ICON.out + 'Log out</button>' +
      '<button class="opt red" data-a="delete">' + ICON.trash + 'Delete account</button></div>', function (sh) {
      var on = function (a, fn) { var b = $('[data-a=' + a + ']', sh); if (b) b.addEventListener('click', function () { closeSheet(fn); }); };
      on('edit', editProfile);
      on('pass', openChangePassword);
      on('blocked', openBlockedList);
      on('admin', function () { if (window.JRAdmin) window.JRAdmin.open(); });
      on('update', function () { try { Android.checkUpdate(); } catch (e) {} });
      on('terms', function () { openPage('terms.html'); });
      on('privacy', function () { openPage('privacy.html'); });
      on('safety', function () { openPage('child-safety.html'); });
      on('about', openAbout);
      on('logout', function () { A.signOut().then(function () { toast('Logged out'); }); });
      on('delete', openDeleteAccount);
    });
  }
  function pwAcc() { var u = A.auth && A.auth.currentUser; return !!(u && L.isUsernameEmail(u.email)); }
  function openChangePassword() {
    var u = A.auth && A.auth.currentUser; if (!u) return;
    openSheet(head('Change password') + '<div class="sh-body">' +
      '<div class="field"><label>Current password</label><input id="cpOld" type="password" autocomplete="current-password"></div>' +
      '<div class="field"><label>New password</label><input id="cpNew" type="password" autocomplete="new-password" placeholder="At least 6 characters"></div>' +
      '<div class="field"><label>Confirm new password</label><input id="cpNew2" type="password" autocomplete="new-password"></div>' +
      '<div class="err" id="cpErr"></div></div>' +
      '<div class="sh-foot"><button class="bigbtn small" id="cpGo">Save password</button></div>', function (sh) {
      $('#cpGo', sh).addEventListener('click', function () {
        var btn = this, err = $('#cpErr', sh);
        var o = $('#cpOld', sh).value, n = $('#cpNew', sh).value, n2 = $('#cpNew2', sh).value;
        err.textContent = '';
        if (!o) { err.textContent = 'Enter your current password.'; return; }
        if (n.length < 6) { err.textContent = 'New password must be at least 6 characters.'; return; }
        if (n !== n2) { err.textContent = 'New passwords do not match.'; return; }
        btn.disabled = true;
        u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, o)).then(function () {
          return u.updatePassword(n);
        }).then(function () {
          closeSheet(function () { toast('Password changed'); });
        }).catch(function (e) {
          btn.disabled = false;
          err.textContent = e && e.code ? A.friendly(e) : errMsg(e);
        });
      });
    });
  }
  function oldShellBanner() {
    try {
      if (!(window.Android && !Android.appVersion)) return;
      var d = document.createElement('div');
      d.id = 'oldShell';
      d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#e0245e;color:#fff;padding:10px 14px;font:600 14px system-ui;display:flex;gap:10px;align-items:center';
      d.innerHTML = '<span style="flex:1">You are using the old demo app. Install the new Jilan Reels app to upload photos and use Google sign-in.</span><a href="https://jilanapps.github.io/jilan-store/jilan-reels/jilan-reels.apk" style="color:#fff;background:rgba(0,0,0,.25);padding:6px 10px;border-radius:8px;text-decoration:none">Install</a>';
      document.body.appendChild(d);
    } catch (e) {}
  }
  setTimeout(oldShellBanner, 800);
  function openPage(p) {
    var url = HOME.split('#')[0].replace(/[^/]*$/, '') + p;
    if (location.protocol !== 'file:' && location.href.indexOf(HOME) !== 0) url = p;
    if (window.Android && Android.openLink) { try { Android.openLink(url); return; } catch (e) {} }
    window.open(url, '_blank');
  }
  function openAbout() {
    var ver = '1.0';
    try { if (window.Android && Android.appVersion) ver = Android.appVersion(); } catch (e) {}
    openSheet(head('About Jilan Reels') + '<div class="sh-body"><div class="field">' +
      '<label>Version ' + esc(ver) + '</label>' +
      '<div class="c-text">Short videos with friends. Videos up to 30 seconds.</div>' +
      '<label style="margin-top:10px">Made by Jilan Apps Official, Basti Malook (Multan), Pakistan.</label>' +
      '<label>Contact: jilanappsofficial@gmail.com</label></div></div>');
  }
  function openDeleteAccount() {
    var u = A.auth && A.auth.currentUser; if (!u || !Api.me) return;
    var pw = L.isUsernameEmail(u.email);
    openSheet(head('Delete account') + '<div class="sh-body"><div class="field"><label>This permanently deletes your profile, your videos, your comments, your likes and follows, and your sign-in. It can\'t be undone. Your username will become free for others.</label></div>' +
      (pw ? '<div class="field"><label>Enter your password to confirm</label><input id="daPw" type="password" autocomplete="current-password"></div>' : '<div class="field"><label>For safety, Google accounts must have logged in within the last 5 minutes. If deletion fails, log out, log in with Google again and come back here.</label></div>') +
      '<div class="field"><label>Type DELETE to confirm</label><input id="daTxt" autocapitalize="characters"></div><div class="err" id="daErr"></div></div>' +
      '<div class="sh-foot"><button class="bigbtn danger small" id="daGo">Delete forever</button></div>', function (sh) {
      $('#daGo', sh).addEventListener('click', function () {
        var btn = this, err = $('#daErr', sh);
        if ($('#daTxt', sh).value.trim().toUpperCase() !== 'DELETE') { err.textContent = 'Type DELETE to confirm.'; return; }
        btn.disabled = true; err.textContent = '';
        var re;
        if (pw) {
          var p = $('#daPw', sh).value;
          if (!p) { err.textContent = 'Enter your password.'; btn.disabled = false; return; }
          re = u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, p));
        } else {
          var last = Date.parse(u.metadata && u.metadata.lastSignInTime) || 0;
          re = (Date.now() - last < 4.5 * 60 * 1000) ? Promise.resolve() : Promise.reject(new Error('Please log out, log in with Google again, then delete within 5 minutes.'));
        }
        re.then(function () {
          return Api.deleteAccount(function (t) { btn.textContent = t; });
        }).then(function () {
          closeSheet(function () { toast('Your account was deleted.'); });
        }).catch(function (e) {
          btn.disabled = false; btn.textContent = 'Delete forever';
          err.textContent = e && e.code ? A.friendly(e) : errMsg(e);
        });
      });
    });
  }

  /* ---------- login / sign up ---------- */
  function openLogin(mode) {
    mode = mode || 'login';
    openSheet(head(mode === 'login' ? 'Log in' : 'Sign up') + '<div class="sh-body"><div class="gate" style="padding:14px 18px">' +
      '<div class="seg"><button data-m="login" class="' + (mode === 'login' ? 'on' : '') + '">Log in</button><button data-m="signup" class="' + (mode === 'signup' ? 'on' : '') + '">Sign up</button></div>' +
      (mode === 'signup' ? '<div class="field"><label>Your name</label><input id="lgName" maxlength="40" autocomplete="name"></div>' : '') +
      '<div class="field"><label>Username</label><input id="lgUser" maxlength="20" autocapitalize="none" autocomplete="username" placeholder="e.g. ali_khan"></div>' +
      '<div class="field"><label>Password</label><input id="lgPw" type="password" autocomplete="' + (mode === 'login' ? 'current-password' : 'new-password') + '" placeholder="At least 6 characters"></div>' +
      (mode === 'signup' ? '<p>Username: 3-20 letters a-z, numbers or _. It can\'t be changed later. There is no password reset for username accounts, so keep your password safe.</p>' : '') +
      '<div class="err" id="lgErr"></div>' +
      '<button class="bigbtn" id="lgGo">' + (mode === 'login' ? 'Log in' : 'Create account') + '</button>' +
      '<div class="or">or</div>' +
      '<button class="bigbtn gbtn" id="lgGoogle"><b>G</b> Continue with Google</button>' +
      (mode === 'signup' ? '<p>By signing up you agree to the <a href="#" data-p="terms.html">Terms</a> and <a href="#" data-p="privacy.html">Privacy Policy</a>. You must be 18 or older.</p>' : '') +
      '</div></div>', function (sh) {
      $$('[data-m]', sh).forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.m !== mode) openLogin(b.dataset.m); }); });
      $$('[data-p]', sh).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openPage(a.dataset.p); }); });
      var err = $('#lgErr', sh);
      A.onGoogleError = function (m) { var el = $('#lgErr'); if (el) el.textContent = m; else toast(m); };
      $('#lgGo', sh).addEventListener('click', function () {
        var btn = this, user = $('#lgUser', sh).value, pw = $('#lgPw', sh).value;
        err.textContent = ''; btn.disabled = true;
        var p;
        if (mode === 'signup') {
          var v = L.validateUsername(user);
          if (!v.ok) { err.textContent = v.error; btn.disabled = false; return; }
          pendingSignup = { username: v.username, name: L.cleanName($('#lgName', sh).value) || v.username };
          p = A.signUp(v.username, pw);
        } else p = A.signIn(user, pw);
        p.catch(function (e) { pendingSignup = null; err.textContent = errMsg(e); btn.disabled = false; });
      });
      $('#lgGoogle', sh).addEventListener('click', function () {
        err.textContent = '';
        A.googleSignIn().catch(function (e) { err.textContent = errMsg(e); });
      });
    });
  }
  var pendingSignup = null;

  // Google users (or a failed signup) pick a permanent username here.
  function openUsernameGate(u) {
    var g = $('#screen-gate');
    var sug = L.suggestUsername(u.displayName, u.email);
    g.innerHTML = '<div class="gate"><img class="logo" src="icon-192.png" alt=""><h1>Choose your username</h1><p>This is how people find you. It can\'t be changed later.</p>' +
      '<div class="field"><label>Your name</label><input id="ugName" maxlength="40" value="' + esc(L.cleanName(u.displayName || '')) + '"></div>' +
      '<div class="field"><label>Username</label><input id="ugUser" maxlength="20" autocapitalize="none" value="' + esc(sug) + '"></div>' +
      '<div class="err" id="ugErr"></div><button class="bigbtn" id="ugGo">Continue</button>' +
      '<p>By continuing you agree to the <a href="#" data-p="terms.html">Terms</a> and <a href="#" data-p="privacy.html">Privacy Policy</a>. You must be 18 or older.</p>' +
      '<button class="textbtn" id="ugOut" style="margin:6px auto 0">Use another account</button></div>';
    g.classList.add('active');
    $$('[data-p]', g).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openPage(a.dataset.p); }); });
    $('#ugOut').addEventListener('click', function () { A.signOut(); });
    $('#ugGo').addEventListener('click', function () {
      var btn = this, err = $('#ugErr'); err.textContent = ''; btn.disabled = true;
      var v = L.validateUsername($('#ugUser').value);
      if (!v.ok) { err.textContent = v.error; btn.disabled = false; return; }
      Api.usernameTaken(v.username).then(function (t) {
        if (t) throw new Error('This username is already taken.');
        return Api.createProfile(u.uid, v.username, $('#ugName').value);
      }).then(function () { return onUser(u); }).catch(function (e) { err.textContent = errMsg(e); btn.disabled = false; });
    });
  }
  function closeGate() { var g = $('#screen-gate'); g.classList.remove('active'); g.innerHTML = ''; }

  var lastUid = null;
  function onUser(u) {
    if (!u) {
      Api.loadMe(null); closeGate();
      if (lastUid) { lastUid = null; feeds.following = null; refreshAfterAuth(); }
      return Promise.resolve();
    }
    var signup = pendingSignup; pendingSignup = null;
    var p = Api.loadMe(u).then(function (me) {
      if (me) return me;
      // brand-new username account: create the profile now
      var un = signup ? signup.username : L.usernameFromEmail(u.email);
      if (un) return Api.createProfile(u.uid, un, signup ? signup.name : un).then(function () { return Api.loadMe(u); }).catch(function (e) { console.warn(e); return null; });
      return null;
    });
    return p.then(function (me) {
      if (!me) { if (sheetOpen()) closeSheet(); openUsernameGate(u); return; }
      closeGate();
      var changed = lastUid !== u.uid; lastUid = u.uid;
      if (sheetOpen() && $('#lgGo')) closeSheet(function () { runAfterLogin(); });
      else runAfterLogin();
      if (changed) refreshAfterAuth();
    }).catch(function (e) { console.error(e); toast('Could not load your account. Check your internet.'); });
  }
  function runAfterLogin() { var f = afterLogin; afterLogin = null; if (f && Api.me && !Api.me.banned) setTimeout(f, 50); }
  function refreshAfterAuth() {
    // repaint like/follow state and drop blocked creators; re-read nothing.
    feeds.following = null;
    if (feedMode === 'following') showMode('following');
    else { $$('#feed .reel').forEach(function (r) { var v = cache[r.dataset.id]; if (v && !visible(v)) { playObserver.unobserve(r); r.remove(); } else if (v) updateReels(v.id); }); }
    updateFollowButtons();
    if ($('#screen-profile').classList.contains('active')) showProfile(loggedIn() ? (profileOf || Api.me.uid) : null);
  }

  /* ---------- discover ---------- */
  var searchState = null;
  function renderChips() {
    var m = {};
    Object.keys(cache).forEach(function (id) { (cache[id].tags || []).forEach(function (t) { m[t] = (m[t] || 0) + 1; }); });
    var tags = Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, 12);
    var q = $('#searchInput').value.trim().toLowerCase();
    $('#chips').innerHTML = tags.map(function (t) { return '<button class="' + (q === '#' + t ? 'on' : '') + '" data-t="' + esc(t) + '">#' + esc(t) + '</button>'; }).join('');
    $$('#chips button').forEach(function (b) { b.addEventListener('click', function () { $('#searchInput').value = '#' + b.dataset.t; runSearch(); }); });
  }
  function runSearch(more) {
    var s = L.parseSearch($('#searchInput').value);
    renderChips();
    var res = $('#searchResults');
    if (s.kind === 'none') { res.innerHTML = '<div class="empty small" style="grid-column:1/-1"><b>Type a #hashtag or @username</b><span>Search finds exact matches only.</span></div>'; $('#searchMore').classList.add('hidden'); return; }
    if (s.kind === 'user') {
      res.innerHTML = '<div class="center" style="grid-column:1/-1;padding:30px"><div class="spinner"></div></div>';
      Api.uidForUsername(s.value).then(function (u) {
        if (!u) { res.innerHTML = '<div class="empty small" style="grid-column:1/-1"><b>No user @' + esc(s.value) + '</b><span>Check the spelling. Usernames must match exactly.</span></div>'; return; }
        return Api.getUser(u).then(function (pu) {
          if (!pu) { res.innerHTML = '<div class="empty small" style="grid-column:1/-1"><b>Account not found</b></div>'; return; }
          res.innerHTML = '<button class="comment usercard" style="grid-column:1/-1;align-items:center;text-align:left" data-u="' + esc(u) + '">' + avatarHtml(pu.name, pu.photo, u, 'sm') + '<div class="c-body"><div class="c-text">' + esc(pu.name) + '</div><div class="c-name">@' + esc(pu.username) + ' · ' + fmt(pu.followers) + ' followers</div></div></button>';
          $('.usercard', res).addEventListener('click', function () { openProfile(u); });
        });
      }).catch(function () { res.innerHTML = '<div class="empty small" style="grid-column:1/-1"><b>Search failed</b><span>Check your internet.</span></div>'; });
      $('#searchMore').classList.add('hidden');
      return;
    }
    if (!more || !searchState || searchState.tag !== s.value) searchState = { tag: s.value, items: [], cursor: null, done: false };
    if (!more) res.innerHTML = '<div class="center" style="grid-column:1/-1;padding:30px"><div class="spinner"></div></div>';
    Api.tagVideos(s.value, searchState.cursor).then(function (r) {
      searchState.cursor = r.cursor || searchState.cursor; searchState.done = r.done;
      searchState.items = searchState.items.concat(remember(r.items).filter(visible));
      var list = searchState.items;
      res.innerHTML = list.length ? list.map(function (v, i) {
        return '<button class="cell" data-id="' + esc(v.id) + '" data-i="' + i + '" style="background-image:url(\'' + esc(v.video.thumb) + '\')"><em>@' + esc(v.ownerUsername) + '</em><span>' + ICON.heart + fmt(v.likeCount) + '</span></button>';
      }).join('') : '<div class="empty small" style="grid-column:1/-1"><b>No videos for #' + esc(s.value) + '</b><span>Try another hashtag.</span></div>';
      $$('.cell', res).forEach(function (b) { b.addEventListener('click', function () { openPlayer(list, +b.dataset.i); }); });
      $('#searchMore').classList.toggle('hidden', searchState.done);
    }).catch(function (e) { console.error(e); res.innerHTML = '<div class="empty small" style="grid-column:1/-1"><b>Search failed</b><span>' + (/index/i.test(e.message || '') ? 'The server is getting ready. Try again soon.' : 'Check your internet.') + '</span></div>'; });
  }
  function openDiscover(q) {
    $('#searchInput').value = q;
    if ($('#screen-player').classList.contains('active')) closeTop();
    setTimeout(function () { goTab('discover'); runSearch(); }, 40);
  }
  $('#searchGo').addEventListener('click', function () { runSearch(); });
  $('#searchInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') { this.blur(); runSearch(); } });
  $('#searchMoreBtn').addEventListener('click', function () { runSearch(true); });

  /* ---------- create (record or gallery -> compress -> Cloudinary -> Firestore) ---------- */
  var MAX_SEC = L.MAX_SEC, camStream = null, recorder = null, recChunks = [], recTimer = null, recStart = 0, facing = 'user';
  var picked = null; // {blob, url, recordedSec}
  function openCreate() {
    $$('video').forEach(function (v) { v.pause(); });
    resetCreate();
    var prev = (($('.screen.active') || {}).id || 'screen-home').replace('screen-', '');
    if (prev === 'player' || prev === 'create' || prev === 'admin') prev = 'home';
    $$('.screen:not(#screen-gate)').forEach(function (s) { s.classList.toggle('active', s.id === 'screen-create'); });
    pushLayer(function () { stopCam(); resetCreate(); show(prev); });
  }
  var uploading = false;
  function resetCreate() {
    if (uploading) return;
    $('#createPick').classList.remove('hidden'); $('#createRec').classList.add('hidden'); $('#createPreview').classList.add('hidden');
    $('#captionInput').value = ''; if (picked && picked.url) URL.revokeObjectURL(picked.url); picked = null;
    var pv = $('#previewVideo'); pv.pause(); pv.removeAttribute('src'); pv.load();
    $('#upBox').classList.add('hidden'); $('#btnPost').disabled = false; $('#btnPost').textContent = 'Post'; $('#btnRetake').disabled = false;
  }
  $('#createClose').addEventListener('click', function () { if (uploading) { toast('Please wait, your video is uploading.'); return; } closeTop(); });
  $('#btnGallery').addEventListener('click', function () { $('#fileInput').value = ''; $('#fileInput').click(); });
  $('#fileInput').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (!/^video\//.test(f.type || 'video/')) { toast('Please choose a video.'); return; }
    if (f.size > 200 * 1024 * 1024) { toast('This video is too big. Please choose a shorter one.'); return; }
    M.probe(f).then(function (info) {
      if (info.duration && info.duration > MAX_SEC + 0.5) { URL.revokeObjectURL(info.url); toast('Please choose a video of 30 seconds or less.'); return; }
      showPreview(f, info.url, 0);
    }).catch(function (e) { toast(errMsg(e)); });
  });
  function startCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Camera is not available. Use Upload instead.'); return Promise.reject(); }
    stopCam();
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 540 }, height: { ideal: 960 } }, audio: true }).then(function (s) {
      camStream = s; var v = $('#camView'); v.srcObject = s; v.style.transform = facing === 'user' ? 'scaleX(-1)' : 'none'; v.play().catch(function () {});
    }).catch(function (e) { toast('Camera and microphone permission is needed to record.'); throw e; });
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
  $('#btnShutter').addEventListener('click', function () {
    if (!camStream) return;
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    if (!window.MediaRecorder) { toast('Recording is not supported on this phone. Use Upload instead.'); return; }
    recChunks = [];
    var mime = M.pickMime();
    try { recorder = new MediaRecorder(camStream, mime ? { mimeType: mime, videoBitsPerSecond: 700000, audioBitsPerSecond: 64000 } : undefined); }
    catch (e) { toast('Recording is not supported on this phone.'); return; }
    recorder.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
    recorder.onstop = function () {
      clearInterval(recTimer); $('#btnShutter').classList.remove('on');
      var secs = Math.min(MAX_SEC, (Date.now() - recStart) / 1000);
      var blob = new Blob(recChunks, { type: ((recorder && recorder.mimeType) || mime || 'video/webm').split(';')[0] });
      stopCam();
      if (blob.size < 1000 || secs < 1) { toast('Recording too short'); resetCreate(); return; }
      showPreview(blob, URL.createObjectURL(blob), secs);
    };
    recorder.start(500); recStart = Date.now(); $('#btnShutter').classList.add('on');
    recTimer = setInterval(function () {
      var s = (Date.now() - recStart) / 1000;
      $('#recTimer').textContent = '0:' + String(Math.min(MAX_SEC, Math.floor(s))).padStart(2, '0') + ' / 0:30';
      $('#recProgress').style.width = Math.min(100, s / MAX_SEC * 100) + '%';
      if (s >= MAX_SEC && recorder && recorder.state === 'recording') recorder.stop();
    }, 200);
  });
  function showPreview(blob, url, recordedSec) {
    picked = { blob: blob, url: url, recordedSec: recordedSec };
    $('#createPick').classList.add('hidden'); $('#createRec').classList.add('hidden'); $('#createPreview').classList.remove('hidden');
    var pv = $('#previewVideo'); pv.src = url; pv.play().catch(function () {});
  }
  $('#btnRetake').addEventListener('click', resetCreate);
  function upStatus(text, frac) { $('#upText').textContent = text; $('#upFill').style.width = Math.round((frac || 0) * 100) + '%'; }
  $('#btnPost').addEventListener('click', function () {
    if (!picked || uploading) return;
    if (!Api.me) { requireLogin(function () {}); return; }
    var btn = this, cap = L.cleanText($('#captionInput').value, L.MAX_CAPTION);
    uploading = true; btn.disabled = true; $('#btnRetake').disabled = true; btn.textContent = 'Posting...';
    $('#upBox').classList.remove('hidden'); upStatus('Checking video...', 0);
    $('#previewVideo').pause();
    M.prepare(picked.blob, picked.recordedSec, function (f) { upStatus('Making the video smaller... ' + Math.round(f * 100) + '%', f * 0.3); })
      .then(function (r) {
        upStatus('Uploading ' + (r.blob.size / 1048576).toFixed(1) + ' MB...', 0.3);
        return M.upload(r.blob, function (f) { upStatus('Uploading... ' + Math.round(f * 100) + '%', 0.3 + f * 0.65); }).then(function (up) {
          if (picked.recordedSec && (!up.duration || up.duration > MAX_SEC + 1)) up.duration = Math.round(picked.recordedSec * 10) / 10;
          return up;
        });
      })
      .then(function (up) { upStatus('Saving...', 0.97); return Api.createVideo(up, cap); })
      .then(function (v) {
        uploading = false;
        remember([v]);
        if (feeds.foryou) feeds.foryou.items.unshift(v);
        closeTop();
        setTimeout(function () { goTab('home'); showMode('foryou'); toast('Posted'); }, 80);
      })
      .catch(function (e) {
        uploading = false; btn.disabled = false; $('#btnRetake').disabled = false; btn.textContent = 'Post';
        upStatus(errMsg(e), 0); toast(errMsg(e));
      });
  });

  /* ---------- deep links: #v=<videoId>  #u=<username> ---------- */
  function openHash() {
    var h = location.hash || '';
    var mv = h.match(/v=([A-Za-z0-9_-]{1,64})/), mu = h.match(/u=([a-z0-9_]{3,20})/);
    if (mv && A.ready) {
      Api.getVideo(mv[1]).then(function (v) {
        if (!v) { toast('This video is not available.'); return; }
        remember([v]); openPlayer([v], 0);
      });
    } else if (mu && A.ready) {
      Api.uidForUsername(mu[1]).then(function (u) { if (u) openProfile(u); else toast('Account not found.'); });
    }
    if (mv || mu) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  }

  /* ---------- start ---------- */
  window.JR = { toast: toast, openSheet: openSheet, closeSheet: closeSheet, head: head, pushLayer: pushLayer, closeTop: closeTop, show: show, ICON: ICON, esc: esc,
    openProfile: openProfile, openPlayer: openPlayer, remember: remember, dropWhere: dropWhere, cache: cache, openLogin: openLogin, goTab: goTab, runSearch: runSearch,
    openComments: openComments, openMore: openMore, openReport: openReport, showPreview: showPreview, feeds: feeds, errMsg: errMsg };
  var started = false;
  if (A.ready) {
    A.onChange(function (u) {
      onUser(u).then(function () {
        if (!started) { started = true; showMode('foryou'); openHash(); window.JR.ready = true; }
      });
    });
  } else { showMode('foryou'); window.JR.ready = true; }
  window.addEventListener('hashchange', openHash);
  try { if (window.Android && Android.checkUpdate) { /* shell checks on start by itself */ } } catch (e) {}
})();
