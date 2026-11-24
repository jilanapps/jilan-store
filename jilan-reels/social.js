/* Jilan Reels v1.3 — social.js
 * Favourites, sounds page, product link, inbox (activity + direct messages),
 * profile tabs (playlists, Q&A, favourites), verified tick (admin), views,
 * settings (theme, data saver, language), download with watermark.
 * Exposes window.JRX. app.js calls these hooks only if JRX exists.
 */
(function () {
  'use strict';
  var L = window.JRLib, Api = window.JRApi;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = L.esc;
  function JR() { return window.JR; }
  function toast(t) { JR().toast(t); }
  function sheet(title, html, ready) { JR().openSheet(JR().head(title) + '<div class="sh-body">' + html + '</div>', ready); }
  function nice(e) {
    var m = (e && (e.code || e.message)) || '';
    if (/permission/i.test(m)) return 'This feature is being switched on. Please try again later.';
    if (/index/i.test(m)) return 'The server is getting ready. Please try again in a few minutes.';
    return JR().errMsg(e);
  }
  var LS = { get: function (k, d) { try { var v = localStorage.getItem('jr-' + k); return v === null ? d : v; } catch (e) { return d; } },
             set: function (k, v) { try { localStorage.setItem('jr-' + k, v); } catch (e) {} } };

  /* ---------- theme + data saver (applied at start) ---------- */
  function applyTheme() { document.documentElement.classList.toggle('light', LS.get('theme', 'dark') === 'light'); }
  applyTheme();
  function saver() { return LS.get('saver', '0') === '1'; }

  /* ---------- favourites ---------- */
  function toggleFav(id, btn) {
    JR().requireLogin(function () {
      var on = !Api.isFav(id);
      Api.setFav(id, on).then(function () {
        $$('.reel[data-id="' + id + '"] .fav').forEach(function (b) { b.classList.toggle('on', on); });
        toast(on ? 'Saved to Favourites' : 'Removed from Favourites');
      }).catch(function (e) { toast(nice(e)); });
    });
    void btn;
  }

  /* ---------- product link ---------- */
  function openLink(url) {
    if (!/^https?:\/\//i.test(url || '')) return;
    sheet('Open link?', '<p class="note">This link goes outside Jilan Reels. Only buy from sellers you trust.</p><div class="field"><input value="' + esc(url) + '" readonly></div><button class="bigbtn small" id="lkGo">Open link</button>', function (sh) {
      $('#lkGo', sh).addEventListener('click', function () {
        JR().closeSheet(function () {
          if (window.Android && Android.openLink) { try { Android.openLink(url); return; } catch (e) {} }
          window.open(url, '_blank', 'noopener');
        });
      });
    });
  }

  /* ---------- sound page ---------- */
  function gridHtml(list) {
    return list.map(function (v, i) {
      return '<button class="cell" data-i="' + i + '" style="background-image:url(\'' + esc(L.coverUrl(v.video.thumb, v.coverSec)) + '\')"><em>@' + esc(v.ownerUsername) + '</em><span>' + JR().ICON.eye + JR().fmt(v.views || 0) + '</span></button>';
    }).join('');
  }
  function openSound(sid, sname, fromVid) {
    var src = JR().cache[fromVid];
    sheet(sname || 'Sound', '<button class="bigbtn small" id="useSound">' + JR().ICON.music + 'Use this sound</button><div class="grid" id="sdGrid"><div class="center" style="grid-column:1/-1;padding:30px"><div class="spinner"></div></div></div>', function (sh) {
      var list = [];
      Promise.all([Api.getVideo(sid).catch(function () { return null; }), Api.soundVideos(sid).catch(function (e) { console.warn(e); return { items: [] }; })]).then(function (r) {
        list = (r[0] && !r[0].hidden ? [r[0]] : []).concat((r[1].items || []).filter(function (v) { return !r[0] || v.id !== r[0].id; }));
        list = JR().remember(list).filter(function (v) { return !Api.isBlocked(v.ownerUid) && !L.isScheduled(v); });
        var g = $('#sdGrid', sh); if (!g) return;
        g.innerHTML = list.length ? gridHtml(list) : '<div class="empty small" style="grid-column:1/-1"><b>No videos yet</b></div>';
        $$('.cell', g).forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.i; JR().closeSheet(function () { JR().openPlayer(list, i); }); }); });
        if (!src && r[0]) src = r[0];
      });
      $('#useSound', sh).addEventListener('click', function () {
        var v = src || list[0]; if (!v) { toast('Sound not found.'); return; }
        JR().closeSheet(function () { pickSoundUse(v); });
      });
    });
  }
  function pickSoundUse(v) {
    sheet('Use this sound', '<button class="opt" data-a="rec">' + JR().ICON.music + 'Record a video with this sound</button><button class="opt" data-a="ss">' + JR().ICON.music + 'Photo slideshow with this sound</button>', function (sh) {
      $('[data-a=rec]', sh).addEventListener('click', function () { JR().closeSheet(function () { window.JRS.startRemix('sound', v); }); });
      $('[data-a=ss]', sh).addEventListener('click', function () { JR().closeSheet(function () { JR().requireLogin(function () { JR().openCreate(); window.JRS._state.remix = { type: 'sound', v: v }; setTimeout(window.JRS.slideshow, 80); }); }); });
    });
  }

  /* ---------- more sheet: extra options ---------- */
  function moreHtml(v) {
    var I = JR().ICON, mine = JR().isMine(v), remixOk = v.allowRemix !== false;
    return '<div class="opt-row">' +
      '<button class="mini" data-x="fav">' + I.bookmark + '<span>' + (Api.isFav(v.id) ? 'Saved' : 'Save') + '</span></button>' +
      '<button class="mini" data-x="dl">' + I.download + '<span>Download</span></button>' +
      '<button class="mini" data-x="sound">' + I.music + '<span>Use sound</span></button>' +
      (remixOk || mine ? '<button class="mini" data-x="duet">' + I.user + '<span>Duet</span></button><button class="mini" data-x="stitch">' + I.play + '<span>Stitch</span></button>' : '') +
      '</div>' +
      (mine ? '<button class="opt" data-x="playlist">' + I.plus + 'Add to playlist</button>' +
        '<button class="opt" data-x="remixtoggle">' + I.user + (remixOk ? 'Turn off duet and stitch' : 'Allow duet and stitch') + '</button>' : '');
  }
  function wireMore(sh, v) {
    var on = function (x, fn) { var b = $('[data-x=' + x + ']', sh); if (b) b.addEventListener('click', function () { JR().closeSheet(fn); }); };
    on('fav', function () { toggleFav(v.id); });
    on('dl', function () { download(v); });
    on('sound', function () { pickSoundUse(v); });
    on('duet', function () { window.JRS.startRemix('duet', v); });
    on('stitch', function () { window.JRS.startRemix('stitch', v); });
    on('playlist', function () { addToPlaylist(v); });
    on('remixtoggle', function () { Api.setAllowRemix(v, v.allowRemix === false).then(function () { toast(v.allowRemix ? 'Duet and stitch allowed' : 'Duet and stitch turned off'); }).catch(function (e) { toast(nice(e)); }); });
  }

  /* ---------- download with watermark (Cloudinary burns the text in) ---------- */
  function download(v) {
    var url = L.downloadUrl(v.video.url, v.ownerUsername);
    if (window.Android && Android.openLink) { try { Android.openLink(url); toast('Downloading in your browser...'); return; } catch (e) {} }
    var a = document.createElement('a'); a.href = url; a.download = 'jilan-reels-' + v.ownerUsername + '.mp4'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Download started');
  }

  /* ---------- playlists ---------- */
  function addToPlaylist(v) {
    Api.listPlaylists(Api.me.uid).then(function (pls) {
      sheet('Add to playlist', pls.map(function (p, i) { var has = (p.videoIds || []).indexOf(v.id) >= 0; return '<button class="opt" data-i="' + i + '">' + JR().ICON[has ? 'check' : 'plus'] + esc(p.name) + ' (' + (p.videoIds || []).length + ')</button>'; }).join('') +
        '<div class="field"><input id="plNew" maxlength="40" placeholder="New playlist name"></div><button class="bigbtn small" id="plMake">Create and add</button>', function (sh) {
        $$('[data-i]', sh).forEach(function (b) { b.addEventListener('click', function () {
          var p = pls[+b.dataset.i], ids = (p.videoIds || []).slice(), k = ids.indexOf(v.id);
          if (k >= 0) ids.splice(k, 1); else { if (ids.length >= 50) { toast('A playlist can have 50 videos.'); return; } ids.unshift(v.id); }
          Api.savePlaylist({ id: p.id, name: p.name, videoIds: ids, createdAt: p.createdAt }).then(function () { JR().closeSheet(function () { toast(k >= 0 ? 'Removed from ' + p.name : 'Added to ' + p.name); }); }).catch(function (e) { toast(nice(e)); });
        }); });
        $('#plMake', sh).addEventListener('click', function () {
          if (pls.length >= 20) { toast('You can have 20 playlists.'); return; }
          Api.savePlaylist({ name: $('#plNew', sh).value, videoIds: [v.id] }).then(function (p) { JR().closeSheet(function () { toast('Added to ' + p.name); }); }).catch(function (e) { toast(nice(e)); });
        });
      });
    }).catch(function (e) { toast(nice(e)); });
  }

  /* ---------- profile tabs: Videos / Playlists / Q&A / Favourites ---------- */
  var prof = { uid: null, user: null, tab: 'videos' };
  function profileLoaded(uid, user) {
    prof.uid = uid; prof.user = user; prof.tab = 'videos';
    var mine = Api.me && Api.me.uid === uid;
    var gt = $('#profileBody .grid-title');
    if (!$('#pTabs')) {
      var tabs = document.createElement('div'); tabs.className = 'ptabs'; tabs.id = 'pTabs';
      gt.parentNode.insertBefore(tabs, gt); gt.classList.add('hidden');
      var ex = document.createElement('div'); ex.id = 'profileExtra'; ex.className = 'pextra hidden';
      $('#profileMore').parentNode.insertBefore(ex, $('#profileMore').nextSibling);
      tabs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) selTab(b.dataset.pt); });
    }
    $('#pTabs').innerHTML = '<button data-pt="videos" class="on">Videos</button><button data-pt="playlists">Playlists</button><button data-pt="qa">Q&amp;A</button>' + (mine ? '<button data-pt="favs">Favourites</button>' : '');
    selTab('videos', true);
    // Message button for other users
    var row = $('#profileAction').parentNode, mb = $('#profileMsg');
    if (mb) mb.remove();
    if (!mine && Api.me) {
      mb = document.createElement('button'); mb.className = 'bigbtn alt small'; mb.id = 'profileMsg'; mb.textContent = 'Message';
      row.appendChild(mb); mb.addEventListener('click', function () { openChat(uid, user); });
    }
  }
  function selTab(t) {
    prof.tab = t;
    $$('#pTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.pt === t); });
    var vids = t === 'videos', ex = $('#profileExtra');
    $('#profileGrid').classList.toggle('hidden', !vids);
    if (!vids) { $('#profileEmpty').classList.add('hidden'); $('#profileMore').classList.add('hidden'); }
    ex.classList.toggle('hidden', vids);
    if (vids) return;
    ex.innerHTML = '<div class="center" style="padding:30px"><div class="spinner"></div></div>';
    if (t === 'playlists') paintPlaylists(ex);
    if (t === 'qa') paintQA(ex);
    if (t === 'favs') paintFavs(ex);
  }
  function paintGrid(ex, list, emptyText) {
    list = JR().remember(list).filter(function (v) { return !v.hidden || JR().isMine(v); });
    ex.innerHTML = list.length ? '<div class="grid">' + gridHtml(list) + '</div>' : '<div class="empty small"><b>' + esc(emptyText) + '</b></div>';
    $$('.cell', ex).forEach(function (b) { b.addEventListener('click', function () { JR().openPlayer(list, +b.dataset.i); }); });
  }
  function paintFavs(ex) {
    Api.favVideos().then(function (l) { paintGrid(ex, l, 'No favourites yet. Tap Save on a video.'); }).catch(function (e) { ex.innerHTML = '<div class="empty small"><b>' + esc(nice(e)) + '</b></div>'; });
  }
  function paintPlaylists(ex) {
    var mine = Api.me && Api.me.uid === prof.uid;
    Api.listPlaylists(prof.uid).then(function (pls) {
      ex.innerHTML = (pls.length ? pls.map(function (p, i) { return '<button class="opt" data-i="' + i + '">' + JR().ICON.play + esc(p.name) + ' <span class="muted">· ' + (p.videoIds || []).length + ' videos</span></button>'; }).join('') :
        '<div class="empty small"><b>No playlists yet</b>' + (mine ? '<span>Open one of your videos, tap ... and Add to playlist.</span>' : '') + '</div>');
      $$('[data-i]', ex).forEach(function (b) { b.addEventListener('click', function () {
        var p = pls[+b.dataset.i];
        ex.innerHTML = '<div class="pl-head"><button class="textbtn" id="plBack">Back</button><b>' + esc(p.name) + '</b>' + (mine ? '<button class="textbtn red" id="plDel">Delete</button>' : '') + '</div><div id="plGrid"><div class="center" style="padding:30px"><div class="spinner"></div></div></div>';
        $('#plBack', ex).addEventListener('click', function () { paintPlaylists(ex); });
        var d = $('#plDel', ex); if (d) d.addEventListener('click', function () { Api.deletePlaylist(p.id).then(function () { toast('Playlist deleted'); paintPlaylists(ex); }).catch(function (e) { toast(nice(e)); }); });
        Api.playlistVideos(p).then(function (l) { paintGrid($('#plGrid', ex), l, 'This playlist is empty.'); });
      }); });
    }).catch(function (e) { ex.innerHTML = '<div class="empty small"><b>' + esc(nice(e)) + '</b></div>'; });
  }
  function paintQA(ex) {
    var mine = Api.me && Api.me.uid === prof.uid;
    Api.listQuestions(prof.uid).then(function (qs) {
      ex.innerHTML = (mine ? '' : '<div class="c-input qa-ask"><input id="qaIn" maxlength="150" placeholder="Ask @' + esc((prof.user || {}).username || '') + ' a question"><button id="qaSend">Ask</button></div>') +
        (qs.length ? qs.filter(function (q) { return !Api.isBlocked(q.from); }).map(function (q, i) {
          return '<div class="qa"><div class="qa-q"><b>Q</b> ' + esc(q.text) + ' <span class="muted">@' + esc(q.fromUsername) + '</span></div>' +
            (q.answered ? '<div class="qa-a"><b>A</b> ' + esc(q.answer) + '</div>' : (mine ? '<div class="c-input"><input data-ai="' + i + '" maxlength="300" placeholder="Write your answer"><button data-ab="' + i + '">Answer</button></div>' : '')) +
            (mine ? '<button class="textbtn red" data-qd="' + i + '">Delete</button>' : '') + '</div>';
        }).join('') : '<div class="empty small"><b>No questions yet</b><span>' + (mine ? 'Questions people ask you show here. Answered ones are public.' : 'Be the first to ask.') + '</span></div>');
      var s = $('#qaSend', ex);
      if (s) s.addEventListener('click', function () {
        JR().requireLogin(function () {
          Api.ask(prof.uid, $('#qaIn', ex).value).then(function () { $('#qaIn', ex).value = ''; toast('Question sent. It shows here after the creator answers.'); }).catch(function (e) { toast(nice(e)); });
        });
      });
      $$('[data-ab]', ex).forEach(function (b) { b.addEventListener('click', function () {
        var q = qs[+b.dataset.ab], inp = $('[data-ai="' + b.dataset.ab + '"]', ex);
        Api.answer(q, inp.value).then(function () { toast('Answer posted'); paintQA(ex); }).catch(function (e) { toast(nice(e)); });
      }); });
      $$('[data-qd]', ex).forEach(function (b) { b.addEventListener('click', function () { Api.deleteQuestion(prof.uid, qs[+b.dataset.qd]).then(function () { paintQA(ex); }).catch(function (e) { toast(nice(e)); }); }); });
    }).catch(function (e) { ex.innerHTML = '<div class="empty small"><b>' + esc(nice(e)) + '</b></div>'; });
  }

  /* ---------- profile menu: admin blue tick ---------- */
  function profileMenuHtml(uid) {
    return (Api.me && Api.me.uid !== uid ? '<button class="opt" data-x="msg">' + JR().ICON.comment + 'Message</button>' : '') +
      (Api.isAdmin ? '<button class="opt" data-x="tick">' + JR().ICON.shield + (Api.isVerified(uid) ? 'Admin: remove blue tick' : 'Admin: give blue tick') + '</button>' : '');
  }
  function wireProfileMenu(sh, uid, pu, repaint) {
    var m = $('[data-x=msg]', sh); if (m) m.addEventListener('click', function () { JR().closeSheet(function () { openChat(uid, pu); }); });
    var t = $('[data-x=tick]', sh);
    if (t) t.addEventListener('click', function () {
      JR().closeSheet(function () {
        var on = !Api.isVerified(uid);
        Api.setVerified(uid, on).then(function () { toast(on ? 'Blue tick given' : 'Blue tick removed'); repaint(); }).catch(function (e) { toast(nice(e)); });
      });
    });
  }

  /* ---------- inbox: Activity + Messages ---------- */
  var inboxTab = 'activity', unread = 0;
  function inboxEl() { return $('#screen-inbox'); }
  function showInbox() {
    var sc = inboxEl();
    if (!$('#ibTabs', sc)) {
      sc.innerHTML = '<div class="pagebar"><h2>Inbox</h2><span class="spacer"></span><button class="iconbtn" id="ibNew" aria-label="New message">' + JR().ICON.plus + '</button></div>' +
        '<div class="chips" id="ibTabs"><button data-ib="activity" class="on">Activity</button><button data-ib="messages">Messages</button></div><div id="ibBody" class="ib-body"></div>';
      $('#ibTabs', sc).addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { inboxTab = b.dataset.ib; paintInbox(); } });
      $('#ibNew', sc).addEventListener('click', newMessage);
    }
    paintInbox();
  }
  function paintInbox() {
    var sc = inboxEl(), body = $('#ibBody', sc);
    $$('#ibTabs button', sc).forEach(function (b) { b.classList.toggle('on', b.dataset.ib === inboxTab); });
    if (!Api.me) { body.innerHTML = '<div class="empty"><b>Log in to see your inbox</b><span>Likes, comments, follows and messages show here.</span><button class="bigbtn small" id="ibLogin">Log in or sign up</button></div>'; $('#ibLogin', body).addEventListener('click', function () { JR().requireLogin(paintInbox); }); return; }
    body.innerHTML = '<div class="center" style="padding:30px"><div class="spinner"></div></div>';
    if (inboxTab === 'activity') {
      Api.listNotifs().then(function (list) {
        list = list.filter(function (n) { return !Api.isBlocked(n.from); });
        body.innerHTML = list.length ? list.map(function (n, i) {
          return '<button class="comment notif' + (n.read ? '' : ' unread') + '" data-i="' + i + '">' + JR().avatarHtml(n.fromName, '', n.from, 'sm') + '<div class="c-body"><div class="c-text"><b>@' + esc(n.fromUsername) + '</b> ' + esc(notifText(n)) + '</div>' +
            (n.text ? '<div class="c-name">' + esc(n.text) + '</div>' : '') + '<div class="c-time">' + L.ago(Api.ms(n.createdAt)) + '</div></div></button>';
        }).join('') : '<div class="empty small"><b>No activity yet</b><span>When people like, comment, follow or mention you, it shows here.</span></div>';
        $$('.notif', body).forEach(function (b) { b.addEventListener('click', function () {
          var n = list[+b.dataset.i];
          if (n.vid) Api.getVideo(n.vid).then(function (v) { if (v) { JR().remember([v]); JR().openPlayer([v], 0); if (n.type === 'comment' || n.type === 'reply') setTimeout(function () { JR().openComments(v.id); }, 400); } else toast('This video is not available.'); });
          else JR().openProfile(n.from);
        }); });
        Api.markRead(list).then(function () { setBadge(0); });
      }).catch(function (e) { body.innerHTML = '<div class="empty small"><b>' + esc(nice(e)) + '</b></div>'; });
    } else {
      Api.listThreads().then(function (ts) {
        var me = Api.me.uid;
        ts = ts.filter(function (t) { var o = t.members.filter(function (m) { return m !== me; })[0]; return !Api.isBlocked(o); });
        body.innerHTML = ts.length ? ts.map(function (t, i) {
          var o = t.members.filter(function (m) { return m !== me; })[0], nm = (t.names || {})[o] || {}, isNew = t.lastFrom !== me && Api.ms(t.lastAt) > ((t.seen || {})[me] || 0);
          return '<button class="comment thread' + (isNew ? ' unread' : '') + '" data-i="' + i + '">' + JR().avatarHtml(nm.name || '?', '', o, 'sm') + '<div class="c-body"><div class="c-text"><b>' + esc(nm.name || '') + '</b> <span class="muted">@' + esc(nm.username || '') + '</span></div><div class="c-name">' + esc(t.last || '') + '</div><div class="c-time">' + L.ago(Api.ms(t.lastAt)) + '</div></div></button>';
        }).join('') : '<div class="empty small"><b>No messages yet</b><span>You can message people who follow you back. Tap + to start.</span></div>';
        $$('.thread', body).forEach(function (b) { b.addEventListener('click', function () {
          var t = ts[+b.dataset.i], o = t.members.filter(function (m) { return m !== me; })[0]; openChat(o, (t.names || {})[o] || {}, t);
        }); });
      }).catch(function (e) { body.innerHTML = '<div class="empty small"><b>' + esc(nice(e)) + '</b></div>'; });
    }
  }
  function notifText(n) {
    return { like: 'liked your video', comment: 'commented on your video', reply: 'replied to your comment', follow: 'started following you',
      mention: 'mentioned you', question: 'asked you a question', answer: 'answered your question' }[n.type] || '';
  }
  function setBadge(n) {
    unread = n;
    var b = $('.bottomnav [data-go=inbox]'); if (!b) return;
    var d = $('.nbadge', b);
    if (!d) { d = document.createElement('i'); d.className = 'nbadge'; b.appendChild(d); }
    d.textContent = n >= 20 ? '20+' : String(n); d.classList.toggle('hidden', !n);
  }
  function pollBadge() {
    if (!Api.me || document.hidden) return;
    Api.unreadCount().then(setBadge);
  }
  setTimeout(pollBadge, 4000);
  var lastUid = null; // poll once right after sign-in / account switch (no reads otherwise)
  setInterval(function () { var u = Api.me && Api.me.uid; if (u !== lastUid) { lastUid = u; if (u) setTimeout(pollBadge, 800); else setBadge(0); } }, 1500);
  setInterval(pollBadge, 5 * 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) pollBadge(); });

  function newMessage() {
    JR().requireLogin(function () {
      sheet('New message', '<div class="field"><label>Username</label><input id="nmU" maxlength="21" placeholder="@username"></div><p class="note">You can message people who follow you and whom you follow.</p><button class="bigbtn small" id="nmGo">Next</button>', function (sh) {
        $('#nmGo', sh).addEventListener('click', function () {
          var u = L.normalizeUsername($('#nmU', sh).value);
          Api.uidForUsername(u).then(function (uid) {
            if (!uid) { toast('No user @' + u); return; }
            if (uid === Api.me.uid) { toast("You can't message yourself."); return; }
            return Api.getUser(uid).then(function (pu) { JR().closeSheet(function () { openChat(uid, pu || { username: u, name: u }); }); });
          }).catch(function (e) { toast(nice(e)); });
        });
      });
    });
  }

  /* ---------- chat screen ---------- */
  var chat = { unsub: null };
  function chatScreen() {
    var sc = $('#screen-chat');
    if (!sc) {
      sc = document.createElement('section'); sc.id = 'screen-chat'; sc.className = 'screen overlay page chat';
      sc.innerHTML = '<div class="pagebar"><button class="iconbtn" id="chatBack" aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><h2 id="chatTitle"></h2><span class="spacer"></span></div>' +
        '<div id="chatList" class="chat-list"></div><div class="c-input chat-input"><input id="chatIn" maxlength="500" placeholder="Message..."><button id="chatSend">Send</button></div>';
      $('#app').appendChild(sc);
      $('#chatBack', sc).addEventListener('click', function () { JR().closeTop(); });
    }
    return sc;
  }
  function openChat(other, ou, thread) {
    JR().requireLogin(function () {
      if (Api.isBlocked(other)) { toast('Unblock this account to send messages.'); return; }
      var sc = chatScreen(), prev = (($('.screen.active') || {}).id || 'screen-home').replace('screen-', '');
      $('#chatTitle', sc).textContent = '@' + ((ou && ou.username) || '');
      $('#chatList', sc).innerHTML = '<div class="center" style="padding:30px"><div class="spinner"></div></div>';
      JR().show('chat');
      JR().pushLayer(function () { if (chat.unsub) { chat.unsub(); chat.unsub = null; } JR().show(prev === 'chat' ? 'inbox' : prev); if (prev === 'inbox') paintInbox(); });
      var me = Api.me.uid, ref = Api.threadRef(other);
      Api.followsMe(other).then(function (f) {
        if (!f || !Api.isFollowing(other)) $('#chatList', sc).innerHTML = '<div class="empty small"><b>You can message people who follow you back</b><span>Both of you need to follow each other.</span></div>';
      });
      if (chat.unsub) chat.unsub();
      chat.unsub = ref.collection('messages').orderBy('createdAt', 'desc').limit(30).onSnapshot(function (qs) {
        var msgs = qs.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).reverse();
        var el = $('#chatList', sc);
        if (!msgs.length) { if (!$('.empty', el)) el.innerHTML = '<div class="empty small"><b>Say hello</b></div>'; return; }
        el.innerHTML = msgs.map(function (m) { return '<div class="msg' + (m.from === me ? ' me' : '') + '"><span>' + esc(m.text) + '</span><i>' + (m.createdAt ? L.ago(Api.ms(m.createdAt)) : '') + '</i></div>'; }).join('');
        el.scrollTop = el.scrollHeight;
        if (thread) Api.markThreadSeen(thread);
      }, function () { /* no thread yet or rules not published */ var el = $('#chatList', sc); if (el && $('.spinner', el)) el.innerHTML = '<div class="empty small"><b>Say hello</b></div>'; });
      var send = function () {
        var inp = $('#chatIn', sc), t = inp.value; if (!L.cleanText(t, 500)) return;
        $('#chatSend', sc).disabled = true;
        Api.sendMessage(other, ou, t).then(function () { inp.value = ''; if (!thread) thread = { id: L.threadId(me, other), seen: {} }; }).catch(function (e) { toast(e && e.message && /follow you back/.test(e.message) ? e.message : nice(e)); })
          .then(function () { $('#chatSend', sc).disabled = false; });
      };
      $('#chatSend', sc).onclick = send;
      $('#chatIn', sc).onkeydown = function (e) { if (e.key === 'Enter') send(); };
    });
  }

  /* ---------- settings rows ---------- */
  function settingsHtml() {
    var I = JR().ICON, ur = window.JRI && JRI.lang() === 'ur';
    return '<button class="opt" data-a="theme">' + I.eye + 'Theme: ' + (LS.get('theme', 'dark') === 'light' ? 'Light' : 'Dark') + '</button>' +
      '<button class="opt" data-a="saver">' + I.download + 'Data saver: ' + (saver() ? 'On' : 'Off') + '</button>' +
      '<button class="opt" data-a="lang">' + I.comment + 'Language: ' + (ur ? 'اردو' : 'English') + '</button>' +
      '<button class="opt" data-a="favs">' + I.bookmark + 'Favourites</button>' +
      (window.JRS ? '<button class="opt" data-a="drafts">' + I.edit + 'Drafts</button>' : '');
  }
  function wireSettings(sh, on) {
    on('theme', function () { LS.set('theme', LS.get('theme', 'dark') === 'light' ? 'dark' : 'light'); applyTheme(); toast('Theme changed'); });
    on('saver', function () { LS.set('saver', saver() ? '0' : '1'); toast(saver() ? 'Data saver on: videos load in lower quality' : 'Data saver off'); });
    on('lang', function () {
      sheet('Language', '<button class="opt" data-l="en">English</button><button class="opt" data-l="ur">اردو (Urdu)</button>', function (s2) {
        $$('[data-l]', s2).forEach(function (b) { b.addEventListener('click', function () { var l = b.dataset.l; JR().closeSheet(function () { if (window.JRI) JRI.setLang(l); }); }); });
      });
    });
    on('favs', function () { JR().goTab('profile'); setTimeout(function () { if ($('#pTabs [data-pt=favs]')) selTab('favs'); }, 600); });
    on('drafts', function () { window.JRS.openDrafts(); });
  }

  window.JRX = { saver: saver, toggleFav: toggleFav, openLink: openLink, openSound: openSound, moreHtml: moreHtml, wireMore: wireMore,
    showInbox: showInbox, profileLoaded: profileLoaded, profileMenuHtml: profileMenuHtml, wireProfileMenu: wireProfileMenu,
    settingsHtml: settingsHtml, wireSettings: wireSettings, download: download, openChat: openChat, setBadge: setBadge, trendPool: [] };
})();
