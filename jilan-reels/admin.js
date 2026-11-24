/* Jilan Reels v1.0 — admin.js
 * Admin panel (only for uids listed in config/app.admins; the rules
 * enforce this — the button is just hidden for everyone else).
 *  - Reports: open the video / account, Hide video, Delete video,
 *    Ban user, Dismiss.
 *  - Hidden videos: Unhide or Delete.
 *  - Cloudinary clean-up: public ids of deleted videos. Unsigned uploads
 *    cannot delete files, so delete them in the Cloudinary Media Library,
 *    then tap "Done" here.
 *  - Find user: @username -> ban / unban.
 */
(function () {
  'use strict';
  var Api = window.JRApi, L = window.JRLib;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = L.esc;
  var tab = 'reports';
  function JR() { return window.JR; }
  function body() { return $('#adminBody'); }
  function spin() { body().innerHTML = '<div class="center" style="padding:40px"><div class="spinner"></div></div>'; }
  function empty(t) { body().innerHTML = '<div class="empty small"><b>' + esc(t) + '</b></div>'; }
  function fail(e) { body().innerHTML = '<div class="empty small"><b>Could not load</b><span>' + esc(JR().errMsg(e)) + '</span></div>'; }

  function open() {
    if (!Api.isAdmin) { JR().toast('Admins only.'); return; }
    var prev = (($('.screen.active') || {}).id || 'screen-home').replace('screen-', '');
    JR().show('admin');
    JR().pushLayer(function () { JR().show(prev === 'admin' ? 'home' : prev); });
    select(tab);
  }
  function select(t) {
    tab = t;
    $$('#adminTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.at === t); });
    if (t === 'reports') reports();
    else if (t === 'hidden') hidden();
    else if (t === 'purge') purge();
    else if (t === 'stats') stats();
    else findUser();
  }
  $$('#adminTabs button').forEach(function (b) { b.addEventListener('click', function () { select(b.dataset.at); }); });
  function stats() {
    spin();
    Api.adminStats().then(function (st) {
      var box = function (n, l) { return '<div class="statbox"><b>' + Number(n || 0).toLocaleString('en-US') + '</b><span>' + esc(l) + '</span></div>'; };
      body().innerHTML = '<div class="statgrid">' + box(st.users, 'Total users') + box(st.videos, 'Total videos') + box(st.views, 'Total views') +
        box(st.usersToday, 'New users today') + box(st.videosToday, 'New videos today') + '</div>' +
        '<p class="note">Counted on the server with count queries (about 1 read per 1,000 documents). Views count once per signed-in viewer per app session.</p>' +
        '<div class="row"><button class="bigbtn alt small" id="stRefresh">Refresh</button></div>';
      $('#stRefresh').addEventListener('click', stats);
    }).catch(fail);
  }
  $('#adminBack').addEventListener('click', function () { JR().closeTop(); });

  function act(btn, p, okMsg, then) {
    btn.disabled = true;
    p.then(function () { JR().toast(okMsg); if (then) then(); })
      .catch(function (e) { btn.disabled = false; JR().toast(JR().errMsg(e)); });
  }

  function reports() {
    spin();
    Api.openReports().then(function (list) {
      if (!list.length) return empty('No open reports');
      var vids = {};
      return Promise.all(list.map(function (r) {
        var vid = r.videoId || (r.type === 'video' ? r.targetId : null);
        if (!vid || vids[vid] !== undefined) return null;
        vids[vid] = null;
        return Api.getVideo(vid).then(function (v) { vids[vid] = v; });
      })).then(function () {
        body().innerHTML = list.map(function (r, i) {
          var vid = r.videoId || (r.type === 'video' ? r.targetId : null), v = vid ? vids[vid] : null;
          return '<div class="acard" data-i="' + i + '">' + (v ? '<button class="thumb" data-a="play" style="background-image:url(\'' + esc(v.video.thumb) + '\')"></button>' : '') +
            '<div class="abody"><b>' + esc(r.reason) + '</b>' +
            '<span>' + esc(r.type) + ' report · ' + L.ago(Api.ms(r.createdAt)) + '</span>' +
            (v ? '<span>Video by @' + esc(v.ownerUsername) + (v.hidden ? (v.autoHidden ? ' (auto-hidden after ' + (v.reportCount || 3) + ' reports)' : ' (hidden)') : '') + ': ' + esc(v.caption || '') + '</span>' : (vid ? '<span>Video already deleted</span>' : '')) +
            (r.note ? '<span>Note: ' + esc(r.note) + '</span>' : '') +
            '<div class="acts">' +
            (v ? '<button data-a="play">Watch</button>' : '') +
            (v && !v.hidden ? '<button data-a="hide">Hide video</button>' : '') +
            (v ? '<button class="red" data-a="del">Delete video</button>' : '') +
            (r.type === 'comment' ? '<button class="red" data-a="delc">Delete comment</button>' : '') +
            (r.targetOwner ? '<button data-a="user">Open account</button><button class="red" data-a="ban">Ban user</button>' : '') +
            '<button class="blue" data-a="done">Dismiss</button></div></div></div>';
        }).join('');
        $$('.acard', body()).forEach(function (card) {
          var r = list[+card.dataset.i], vid = r.videoId || (r.type === 'video' ? r.targetId : null), v = vid ? vids[vid] : null;
          card.addEventListener('click', function (e) {
            var b = e.target.closest('[data-a]'); if (!b) return;
            var a = b.dataset.a;
            if (a === 'play' && v) { JR().remember([v]); JR().openPlayer([v], 0); }
            if (a === 'hide') act(b, Api.setHidden(v.id, true), 'Video hidden', function () { v.hidden = true; JR().dropWhere(function (x) { return x.id === v.id; }); });
            if (a === 'del') act(b, Api.deleteVideo(v), 'Video deleted', function () { JR().dropWhere(function (x) { return x.id === v.id; }); closeAndNext(r, card); });
            if (a === 'delc') {
              var parts = String(r.targetId).split('/');
              act(b, Api.deleteComment(parts[0], { id: parts[1], uid: r.targetOwner }), 'Comment deleted', function () { closeAndNext(r, card); });
            }
            if (a === 'user') JR().openProfile(r.targetOwner);
            if (a === 'ban') act(b, Api.setBan(r.targetOwner, true), 'User banned');
            if (a === 'done') closeAndNext(r, card);
          });
        });
      });
    }).catch(fail);
  }
  function closeAndNext(r, card) {
    Api.closeReport(r.id).then(function () { card.remove(); if (!$$('.acard', body()).length) empty('No open reports'); })
      .catch(function (e) { JR().toast(JR().errMsg(e)); });
  }

  function hidden() {
    spin();
    Api.hiddenVideos().then(function (list) {
      if (!list.length) return empty('No hidden videos');
      body().innerHTML = list.map(function (v, i) {
        return '<div class="acard" data-i="' + i + '"><button class="thumb" data-a="play" style="background-image:url(\'' + esc(v.video.thumb) + '\')"></button><div class="abody"><b>@' + esc(v.ownerUsername) + '</b>' + (v.autoHidden ? '<span style="color:#ff5a5f">Auto-hidden: reported by ' + (v.reportCount || 3) + ' different users</span>' : '') + '<span>' + esc(v.caption || '') + '</span><span>' + L.ago(Api.ms(v.createdAt)) + '</span>' +
          '<div class="acts"><button data-a="play">Watch</button><button class="blue" data-a="unhide">Unhide</button><button class="red" data-a="del">Delete</button></div></div></div>';
      }).join('');
      $$('.acard', body()).forEach(function (card) {
        var v = list[+card.dataset.i];
        card.addEventListener('click', function (e) {
          var b = e.target.closest('[data-a]'); if (!b) return;
          if (b.dataset.a === 'play') { JR().remember([v]); JR().openPlayer([v], 0); }
          if (b.dataset.a === 'unhide') act(b, Api.setHidden(v.id, false, !!(v.autoHidden || v.reportCount)), 'Video visible again', function () { card.remove(); });
          if (b.dataset.a === 'del') act(b, Api.deleteVideo(v), 'Video deleted', function () { card.remove(); });
        });
      });
    }).catch(fail);
  }

  function purge() {
    spin();
    Api.purgeList().then(function (list) {
      var cloud = (window.JR_CLOUDINARY || {}).cloudName || '';
      var head = '<div class="hint" style="padding:12px 14px">Deleted videos still use Cloudinary space. Open Cloudinary → Media Library → folder jilan-reels, delete these files, then tap Done. (The free app upload key can\'t delete files by itself.)</div>';
      if (!list.length) { body().innerHTML = head + '<div class="empty small"><b>Nothing to clean up</b></div>'; return; }
      body().innerHTML = head + list.map(function (p, i) {
        return '<div class="acard" data-i="' + i + '"><div class="abody"><b style="user-select:all">' + esc(p.publicId) + '</b><span>' + L.ago(Api.ms(p.at)) + ' · cloud ' + esc(cloud) + '</span>' +
          '<div class="acts"><button data-a="copy">Copy id</button><button class="blue" data-a="done">Done</button></div></div></div>';
      }).join('');
      $$('.acard', body()).forEach(function (card) {
        var p = list[+card.dataset.i];
        card.addEventListener('click', function (e) {
          var b = e.target.closest('[data-a]'); if (!b) return;
          if (b.dataset.a === 'copy') { try { navigator.clipboard.writeText(p.publicId); JR().toast('Copied'); } catch (er) { JR().toast(p.publicId); } }
          if (b.dataset.a === 'done') act(b, Api.purgeDone(p.id), 'Removed from list', function () { card.remove(); });
        });
      });
    }).catch(fail);
  }

  function findUser() {
    body().innerHTML = '<div class="field"><label>Exact username</label><input id="afU" autocapitalize="none" placeholder="@username"></div><div class="row"><button class="bigbtn small" id="afGo">Find</button></div><div id="afOut"></div>';
    $('#afGo').addEventListener('click', function () {
      var u = L.normalizeUsername($('#afU').value), out = $('#afOut');
      if (!u) return;
      out.innerHTML = '<div class="center" style="padding:20px"><div class="spinner"></div></div>';
      Api.uidForUsername(u).then(function (uid) {
        if (!uid) { out.innerHTML = '<div class="empty small"><b>No such user</b></div>'; return; }
        return Api.getUser(uid).then(function (pu) {
          if (!pu) { out.innerHTML = '<div class="empty small"><b>Profile missing</b></div>'; return; }
          out.innerHTML = '<div class="acard"><div class="abody"><b>' + esc(pu.name) + ' @' + esc(pu.username) + '</b><span>' + (pu.videoCount || 0) + ' videos · ' + (pu.followers || 0) + ' followers' + (pu.banned ? ' · BANNED' : '') + '</span><span style="user-select:all">uid: ' + esc(uid) + '</span>' +
            '<div class="acts"><button data-a="open">Open profile</button><button class="' + (pu.banned ? 'blue' : 'red') + '" data-a="ban">' + (pu.banned ? 'Unban' : 'Ban') + '</button></div></div></div>';
          $('[data-a=open]', out).addEventListener('click', function () { JR().openProfile(uid); });
          $('[data-a=ban]', out).addEventListener('click', function () {
            var b = this; act(b, Api.setBan(uid, !pu.banned), pu.banned ? 'Unbanned' : 'Banned', function () { $('#afGo').click(); });
          });
        });
      }).catch(function (e) { out.innerHTML = '<div class="empty small"><b>' + esc(JR().errMsg(e)) + '</b></div>'; });
    });
  }

  window.JRAdmin = { open: open, select: select };
})();
