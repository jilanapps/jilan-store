/* Jilan Reels v1.0 — api.js
 * Firestore data layer. Every write below matches firestore.rules exactly
 * (same keys, counters moved by 1 in the SAME batch as the doc they count).
 * Reads are kept small for the free Spark plan: no live listeners, feed
 * pages of 10, and one private "state" doc holds my likes / follows /
 * blocks / comment ids (1 read at start instead of many).
 * Exposes window.JRApi.
 */
(function () {
  'use strict';
  var L = window.JRLib;
  var Api = window.JRApi = {
    me: null,          // { uid, ...users/{uid} data } or null
    state: { likes: {}, follow: {}, blocks: {}, comments: {} },
    isAdmin: false,
    admins: []
  };
  function db() { return window.JRAuth.db; }
  function FV() { return firebase.firestore.FieldValue; }
  function ST() { return FV().serverTimestamp(); }
  function inc(n) { return FV().increment(n); }
  function uid() { return Api.me && Api.me.uid; }
  function needMe() { if (!uid()) throw new Error('Please log in first.'); }
  Api.ms = function (t) {
    if (!t) return 0;
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t === 'number') return t;
    if (t.seconds) return t.seconds * 1000;
    return 0;
  };
  function docData(d) { var x = d.data() || {}; x.id = d.id; return x; }
  function stateRef(u) { return db().collection('users').doc(u || uid()).collection('private').doc('state'); }
  function mergeState(patch) { return stateRef().set(patch, { merge: true }); }
  function keyOf(map, k) { var o = {}; o[k] = map; return o; }

  /* ---------- start-up: 3 small reads ---------- */
  Api.loadMe = function (u) {
    Api.me = null; Api.isAdmin = false; Api.admins = [];
    Api.state = { likes: {}, follow: {}, blocks: {}, comments: {} };
    if (!u) return Promise.resolve(null);
    var cfgP = db().collection('config').doc('app').get().then(function (d) {
      Api.admins = (d.exists && Array.isArray(d.data().admins)) ? d.data().admins : [];
      Api.isAdmin = Api.admins.indexOf(u.uid) >= 0;
    }).catch(function () {});
    var meP = db().collection('users').doc(u.uid).get();
    var stP = stateRef(u.uid).get().catch(function () { return null; });
    return Promise.all([cfgP, meP, stP]).then(function (r) {
      var meDoc = r[1], st = r[2];
      if (st && st.exists) {
        var s = st.data() || {};
        Api.state = { likes: s.likes || {}, follow: s.follow || {}, blocks: s.blocks || {}, comments: s.comments || {} };
      }
      if (!meDoc.exists) return null;              // needs a username first
      Api.me = docData(meDoc); Api.me.uid = u.uid;
      return Api.me;
    });
  };

  /* ---------- profile ---------- */
  Api.usernameTaken = function (u) {
    return db().collection('usernames').doc(u).get().then(function (d) { return d.exists; });
  };
  Api.uidForUsername = function (u) {
    return db().collection('usernames').doc(u).get().then(function (d) { return d.exists ? d.data().uid : null; });
  };
  // One batch: username claim + public profile + private state.
  Api.createProfile = function (authUid, username, name) {
    var v = L.validateUsername(username);
    if (!v.ok) return Promise.reject(new Error(v.error));
    name = L.cleanName(name) || v.username;
    var b = db().batch();
    b.set(db().collection('usernames').doc(v.username), { uid: authUid, at: ST() });
    b.set(db().collection('users').doc(authUid), {
      name: name, username: v.username, bio: '', photo: '',
      followers: 0, following: 0, videoCount: 0, createdAt: ST()
    });
    b.set(stateRef(authUid), { likes: {}, follow: {}, blocks: {}, comments: {} });
    return b.commit().catch(function (e) {
      if (e && e.code === 'permission-denied') {
        return Api.usernameTaken(v.username).then(function (t) {
          throw new Error(t ? 'This username is already taken.' : "Couldn't create your profile. Please try again.");
        });
      }
      throw e;
    });
  };
  Api.getUser = function (u) {
    return db().collection('users').doc(u).get().then(function (d) { return d.exists ? docData(d) : null; });
  };
  // name / bio / photo; then refresh the copied name+photo on my latest videos.
  Api.updateProfile = function (p) {
    needMe();
    var upd = { name: L.cleanName(p.name), bio: L.cleanText(p.bio, L.MAX_BIO) };
    if (!upd.name) return Promise.reject(new Error('Enter your name.'));
    if (typeof p.photo === 'string') upd.photo = p.photo;
    var nameChanged = upd.name !== Api.me.name, photoChanged = ('photo' in upd) && upd.photo !== (Api.me.photo || '');
    return db().collection('users').doc(uid()).update(upd).then(function () {
      for (var k in upd) Api.me[k] = upd[k];
      if (!nameChanged && !photoChanged) return;
      return db().collection('videos').where('ownerUid', '==', uid()).orderBy('createdAt', 'desc').limit(50).get().then(function (qs) {
        if (qs.empty) return;
        var b = db().batch();
        qs.forEach(function (d) { b.update(d.ref, { ownerName: Api.me.name, ownerPhoto: Api.me.photo || '' }); });
        return b.commit();
      }).catch(function (e) { console.warn('video name refresh', e); });
    });
  };

  /* ---------- video lists (10 per page) ---------- */
  function page(q, cursor, n) {
    q = q.limit(n || L.PAGE_SIZE);
    if (cursor) q = q.startAfter(cursor);
    return q.get().then(function (qs) {
      return { items: qs.docs.map(docData), cursor: qs.docs.length ? qs.docs[qs.docs.length - 1] : null, done: qs.docs.length < (n || L.PAGE_SIZE) };
    });
  }
  function vids() { return db().collection('videos'); }
  Api.feedPage = function (cursor) {
    return page(vids().where('hidden', '==', false).orderBy('createdAt', 'desc'), cursor);
  };
  // Following feed: newest videos of up to 30 most recently followed people.
  Api.followingUids = function () {
    var f = Api.state.follow || {};
    return Object.keys(f).sort(function (a, b) { return (f[b] || 0) - (f[a] || 0); }).slice(0, 30);
  };
  Api.followingPage = function (cursor) {
    var ids = Api.followingUids();
    if (!ids.length) return Promise.resolve({ items: [], cursor: null, done: true });
    return page(vids().where('ownerUid', 'in', ids).where('hidden', '==', false).orderBy('createdAt', 'desc'), cursor);
  };
  Api.userVideos = function (ownerUid, cursor) {
    var q = vids().where('ownerUid', '==', ownerUid);
    if (!(ownerUid === uid() || Api.isAdmin)) q = q.where('hidden', '==', false);
    return page(q.orderBy('createdAt', 'desc'), cursor, 30);
  };
  Api.tagVideos = function (tag, cursor) {
    return page(vids().where('tags', 'array-contains', tag).where('hidden', '==', false).orderBy('createdAt', 'desc'), cursor, 30);
  };
  Api.getVideo = function (id) {
    return vids().doc(id).get().then(function (d) { return d.exists ? docData(d) : null; })
      .catch(function () { return null; }); // hidden -> permission denied -> treat as gone
  };

  /* ---------- likes ---------- */
  Api.isLiked = function (vid) { return !!(Api.state.likes || {})[vid]; };
  Api.setLike = function (v, on) {
    needMe();
    var vref = vids().doc(v.id), lref = vref.collection('likes').doc(uid()), b = db().batch();
    var likes = {};
    if (on) {
      b.set(lref, { at: ST() });
      b.update(vref, { likeCount: inc(1) });
      likes[v.id] = Date.now();
      // keep the private doc small: forget the oldest likes beyond 3000
      var all = Api.state.likes || {}, keys = Object.keys(all);
      if (keys.length >= 3000) {
        keys.sort(function (a, c) { return all[a] - all[c]; }).slice(0, 200).forEach(function (k) { likes[k] = FV().delete(); });
      }
    } else {
      b.delete(lref);
      b.update(vref, { likeCount: inc(-1) });
      likes[v.id] = FV().delete();
    }
    b.set(stateRef(), { likes: likes }, { merge: true });
    return b.commit().then(function () {
      Object.keys(likes).forEach(function (k) { if (k === v.id && on) Api.state.likes[k] = likes[k]; else delete Api.state.likes[k]; });
    });
  };

  /* ---------- follows ---------- */
  Api.isFollowing = function (u) { return !!(Api.state.follow || {})[u]; };
  Api.setFollow = function (target, on) {
    needMe();
    if (target === uid()) return Promise.reject(new Error("You can't follow yourself."));
    var fref = db().collection('follows').doc(L.followId(uid(), target));
    var tref = db().collection('users').doc(target), mref = db().collection('users').doc(uid());
    var f = {};
    var go = function (targetExists) {
      var b = db().batch();
      if (on) {
        b.set(fref, { from: uid(), to: target, at: ST() });
        b.update(tref, { followers: inc(1) });
        b.update(mref, { following: inc(1), lastFollow: target });
        f[target] = Date.now();
      } else {
        b.delete(fref);
        if (targetExists) b.update(tref, { followers: inc(-1) });
        b.update(mref, { following: inc(-1), lastFollow: target });
        f[target] = FV().delete();
      }
      b.set(stateRef(), { follow: f }, { merge: true });
      return b.commit();
    };
    var p = on ? go(true) : tref.get().then(function (d) { return go(d.exists); });
    return p.then(function () {
      if (on) { Api.state.follow[target] = f[target]; Api.me.following = (Api.me.following || 0) + 1; }
      else { delete Api.state.follow[target]; Api.me.following = Math.max(0, (Api.me.following || 0) - 1); }
    }).catch(function (e) {
      if (!on && e && e.code === 'permission-denied') {
        // follow doc already gone (e.g. old state) — just clean my list
        var x = {}; x[target] = FV().delete();
        return mergeState({ follow: x }).then(function () { delete Api.state.follow[target]; });
      }
      if (on && e && e.code === 'permission-denied') throw new Error("You can't follow this account.");
      throw e;
    });
  };

  /* ---------- comments ---------- */
  Api.listComments = function (vid) {
    return vids().doc(vid).collection('comments').orderBy('createdAt', 'desc').limit(50).get()
      .then(function (qs) { return qs.docs.map(docData); });
  };
  Api.addComment = function (v, text) {
    needMe();
    text = L.cleanText(text, L.MAX_COMMENT);
    if (!text) return Promise.reject(new Error('Write a comment first.'));
    var vref = vids().doc(v.id), cref = vref.collection('comments').doc(), b = db().batch();
    var data = { uid: uid(), name: Api.me.name, username: Api.me.username, text: text, createdAt: ST() };
    b.set(cref, data);
    b.update(vref, { commentCount: inc(1), lastCommentId: cref.id });
    b.set(stateRef(), { comments: keyOf(v.id, cref.id) }, { merge: true });
    return b.commit().then(function () {
      Api.state.comments[cref.id] = v.id;
      data.id = cref.id; data.createdAt = { toMillis: function () { return Date.now(); } };
      return data;
    }).catch(function (e) {
      if (e && e.code === 'permission-denied') throw new Error("You can't comment on this video.");
      throw e;
    });
  };
  Api.deleteComment = function (vid, c) {
    needMe();
    var vref = vids().doc(vid), cref = vref.collection('comments').doc(c.id), b = db().batch();
    b.delete(cref);
    b.update(vref, { commentCount: inc(-1), lastCommentId: c.id });
    if (c.uid === uid()) b.set(stateRef(), { comments: keyOf(FV().delete(), c.id) }, { merge: true });
    return b.commit().catch(function () {
      // video gone or hidden counter path refused: delete the comment alone
      return cref.delete();
    }).then(function () { delete Api.state.comments[c.id]; });
  };

  /* ---------- videos ---------- */
  Api.createVideo = function (up, caption) {
    needMe();
    caption = L.cleanText(caption, L.MAX_CAPTION);
    var ref = vids().doc(), b = db().batch();
    var video = { publicId: up.publicId, url: up.url, thumb: up.thumb, duration: up.duration };
    if (up.w) video.w = up.w; if (up.h) video.h = up.h; if (up.bytes) video.bytes = up.bytes;
    var data = {
      ownerUid: uid(), ownerName: Api.me.name, ownerUsername: Api.me.username, ownerPhoto: Api.me.photo || '',
      caption: caption, tags: L.parseHashtags(caption), video: video,
      likeCount: 0, commentCount: 0, createdAt: ST(), hidden: false
    };
    b.set(ref, data);
    b.update(db().collection('users').doc(uid()), { videoCount: inc(1), lastVideo: ref.id });
    return b.commit().then(function () {
      Api.me.videoCount = (Api.me.videoCount || 0) + 1;
      data.id = ref.id; data.createdAt = { toMillis: function () { return Date.now(); } };
      return data;
    });
  };
  // Owner or admin. Comments first (owner may delete them), then one batch:
  // purge entry + delete video + owner's videoCount -1.
  Api.deleteVideo = function (v) {
    needMe();
    var vref = vids().doc(v.id);
    return vref.collection('comments').limit(100).get().then(function (qs) {
      if (qs.empty) return;
      var b = db().batch(); qs.forEach(function (d) { b.delete(d.ref); }); return b.commit();
    }).catch(function () {}).then(function () {
      var mine = v.ownerUid === uid();
      var ownerRef = db().collection('users').doc(v.ownerUid);
      var countP = mine ? Promise.resolve(null) : ownerRef.get().then(function (d) { return d.exists ? (d.data().videoCount || 0) : -1; });
      return countP.then(function (n) {
        var b = db().batch();
        b.set(db().collection('purge').doc(v.id), { publicId: v.video.publicId, by: uid(), at: ST() });
        b.delete(vref);
        if (mine) b.update(ownerRef, { videoCount: inc(-1), lastVideo: v.id });
        else if (n >= 0) b.update(ownerRef, { videoCount: Math.max(0, n - 1) });
        return b.commit();
      });
    }).then(function () { if (v.ownerUid === uid()) Api.me.videoCount = Math.max(0, (Api.me.videoCount || 0) - 1); });
  };

  /* ---------- safety ---------- */
  Api.report = function (r) {
    needMe();
    if (L.REPORT_REASONS.indexOf(r.reason) < 0) return Promise.reject(new Error('Choose a reason.'));
    var data = { by: uid(), type: r.type, targetId: String(r.targetId), reason: r.reason, createdAt: ST(), status: 'open' };
    if (r.targetOwner) data.targetOwner = String(r.targetOwner);
    if (r.videoId) data.videoId = String(r.videoId);
    if (r.note) data.note = L.cleanText(r.note, 300);
    return db().collection('reports').add(data);
  };
  Api.isBlocked = function (u) { return !!(Api.state.blocks || {})[u]; };
  Api.setBlock = function (other, on) {
    needMe();
    var pre = (on && Api.isFollowing(other)) ? Api.setFollow(other, false).catch(function () {}) : Promise.resolve();
    return pre.then(function () {
      var b = db().batch(), ref = db().collection('users').doc(uid()).collection('blocks').doc(other), x = {};
      if (on) { b.set(ref, { at: ST() }); x[other] = Date.now(); }
      else { b.delete(ref); x[other] = FV().delete(); }
      b.set(stateRef(), { blocks: x }, { merge: true });
      return b.commit();
    }).then(function () { if (on) Api.state.blocks[other] = Date.now(); else delete Api.state.blocks[other]; });
  };

  /* ---------- admin ---------- */
  Api.openReports = function () {
    return db().collection('reports').where('status', '==', 'open').orderBy('createdAt', 'desc').limit(50).get()
      .then(function (qs) { return qs.docs.map(docData); });
  };
  Api.closeReport = function (id) {
    return db().collection('reports').doc(id).update({ status: 'done', handledBy: uid(), handledAt: ST() });
  };
  Api.setHidden = function (vid, hidden) { return vids().doc(vid).update({ hidden: !!hidden }); };
  Api.hiddenVideos = function () {
    return vids().where('hidden', '==', true).orderBy('createdAt', 'desc').limit(50).get()
      .then(function (qs) { return qs.docs.map(docData); });
  };
  Api.setBan = function (target, on) {
    var b = db().batch();
    b.update(db().collection('users').doc(target), { banned: !!on });
    if (on) b.set(db().collection('bans').doc(target), { by: uid(), at: ST() });
    else b.delete(db().collection('bans').doc(target));
    return b.commit();
  };
  Api.purgeList = function () {
    return db().collection('purge').limit(100).get().then(function (qs) { return qs.docs.map(docData); });
  };
  Api.purgeDone = function (id) { return db().collection('purge').doc(id).delete(); };

  /* ---------- account deletion (Play UGC requirement) ---------- */
  // Deletes: my videos (queued for Cloudinary purge), my comments, my likes
  // I can find, my follows, my blocks, private state, username claim,
  // profile, then the sign-in account itself.
  Api.deleteAccount = function (progress) {
    needMe();
    var me = uid(), username = Api.me.username, step = function (t) { if (progress) progress(t); };
    step('Deleting your videos...');
    var delVideos = function () {
      return vids().where('ownerUid', '==', me).orderBy('createdAt', 'desc').limit(30).get().then(function (qs) {
        if (qs.empty) return;
        return qs.docs.reduce(function (p, d) {
          return p.then(function () { return Api.deleteVideo(docData(d)).catch(function (e) { console.warn(e); }); });
        }, Promise.resolve()).then(function () { return qs.docs.length === 30 ? delVideos() : null; });
      });
    };
    return delVideos().then(function () {
      step('Deleting your comments...');
      var cm = Api.state.comments || {};
      return Object.keys(cm).reduce(function (p, cid) {
        return p.then(function () { return Api.deleteComment(cm[cid], { id: cid, uid: me }).catch(function () {}); });
      }, Promise.resolve());
    }).then(function () {
      step('Removing likes and follows...');
      var likes = Object.keys(Api.state.likes || {});
      var p = likes.reduce(function (pp, vid) {
        return pp.then(function () { return Api.setLike({ id: vid }, false).catch(function () {}); });
      }, Promise.resolve());
      return p.then(function () {
        return Object.keys(Api.state.follow || {}).reduce(function (pp, t) {
          return pp.then(function () { return Api.setFollow(t, false).catch(function () {}); });
        }, Promise.resolve());
      });
    }).then(function () {
      step('Deleting your profile...');
      return db().collection('users').doc(me).collection('blocks').get().then(function (qs) {
        var b = db().batch();
        qs.forEach(function (d) { b.delete(d.ref); });
        b.delete(stateRef());
        b.delete(db().collection('usernames').doc(username));
        b.delete(db().collection('users').doc(me));
        return b.commit();
      });
    }).then(function () {
      step('Deleting your sign-in account...');
      var u = window.JRAuth.auth.currentUser;
      return u ? u.delete() : null;
    }).then(function () { Api.me = null; });
  };
})();
