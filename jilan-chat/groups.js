// Jilan Chat v1.0 — groups.js
// GROUP CHAT (family / friends only). No public community: no group
// search, no join link, no public group list. Only an admin adds members.
//
// Data model (DATA-MODEL.md): groups/{groupId}
//   name, type ("family" | "friends"), createdBy (uid), admins [uids],
//   members [uids], createdAt, lastMessage, lastMessageAt.
//   groupId is RANDOM (unlike 1-to-1 chatId uidA_uidB).
//   groups/{groupId}/messages/{msgId} — same message shape as 1-to-1,
//   but ticks stop at "sent" (no delivered/read in groups, v1.0).
//   userChats/{uid}/list/{chatId} entries for groups carry
//   type: "group" and groupId (chatId == groupId).
// Media/voice in groups upload to group-media/{groupId}/ (same 1280px /
// 50 MB rules as 1-to-1; see app.js). Voice messages go there too.
// SECRET CHAT IS 1-TO-1 ONLY — every group member sees every group
// message. The group info screen says so in plain words.

(function () {
  var JC = window.JC = window.JC || {};
  var groupUnsub = null;
  var groupInfoUnsub = null;
  var currentGroup = null;      // group doc data for the open group
  var groupMsgEls = {};

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmtTime(ts) {
    if (!ts) return "";
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function isAdmin() {
    return currentGroup && JC.currentUser
      && (currentGroup.admins || []).indexOf(JC.currentUser.uid) >= 0;
  }

  // ---------- create a group ----------
  JC.createGroup = function (name, type) {
    if (!JC.db || !JC.currentUser) return Promise.reject(new Error("not-signed-in"));
    name = (name || "").trim();
    if (!name) return Promise.reject(new Error("group-name-empty"));
    if (type !== "family" && type !== "friends") type = "friends";
    var me = JC.currentUser.uid;
    var now = firebase.firestore.FieldValue.serverTimestamp();
    return JC.db.collection("groups").add({
      name: name,
      type: type,
      createdBy: me,
      admins: [me],
      members: [me],
      createdAt: now,
      lastMessage: "",
      lastMessageAt: now
    }).then(function (ref) {
      // My own chat-list entry for the group.
      return JC.db.collection("userChats").doc(me).collection("list").doc(ref.id).set({
        chatId: ref.id,
        groupId: ref.id,
        type: "group",
        otherUid: "",
        unreadCount: 0,
        lastMessageAt: now
      }).then(function () { return ref.id; });
    });
  };

  // ---------- open a group chat ----------
  JC.openGroupChat = function (groupId) {
    if (!JC.db || !JC.currentUser) return;
    JC.currentChatId = groupId;
    JC.currentChatIsGroup = true;
    JC.currentChatOtherUid = null;
    JC.currentChatOther = null;
    JC.showScreen("screen-chat", { push: true });
    $("messages").innerHTML = "";
    groupMsgEls = {};
    $("msgInput").value = "";
    // Private-chat notice — group me sirf members parh sakte hain.
    var notice = document.getElementById("e2eNotice");
    if (notice) notice.textContent = "Messages are private. Only members of this group can read this chat.";
    // Calls are 1-to-1 only — hide the call buttons in a group.
    $("btnVoiceCall").classList.add("hidden");
    $("btnVideoCall").classList.add("hidden");
    $("chatName").textContent = "...";
    $("chatStatus").textContent = "";
    $("chatAvatar").textContent = "G";
    // Live group doc (name + member count in the header).
    if (groupInfoUnsub) groupInfoUnsub();
    groupInfoUnsub = JC.db.collection("groups").doc(groupId).onSnapshot(function (snap) {
      if (!snap.exists) { JC.toast("This group no longer exists."); JC.closeChat(); JC.showScreen("screen-list"); return; }
      currentGroup = snap.data();
      var count = (currentGroup.members || []).length;
      $("chatName").textContent = currentGroup.name || "Group";
      $("chatStatus").textContent = count + " member" + (count === 1 ? "" : "s") + " • " + (currentGroup.type === "family" ? "Family" : "Friends");
      $("chatAvatar").textContent = (currentGroup.name || "G")[0].toUpperCase();
    });
    // Live messages.
    if (groupUnsub) groupUnsub();
    groupUnsub = JC.db.collection("groups").doc(groupId).collection("messages")
      .orderBy("createdAt", "asc")
      .onSnapshot(function (snap) {
        snap.docChanges().forEach(function (ch) {
          if (ch.type === "added") renderGroupMessage(ch.doc.id, ch.doc.data());
        });
        var box = $("messages");
        box.scrollTop = box.scrollHeight;
      });
    // Reset my unread badge for this group.
    JC.db.collection("userChats").doc(JC.currentUser.uid).collection("list").doc(groupId)
      .set({ unreadCount: 0 }, { merge: true }).catch(function () {});
  };

  JC.closeGroupChat = function () {
    if (groupUnsub) { groupUnsub(); groupUnsub = null; }
    if (groupInfoUnsub) { groupInfoUnsub(); groupInfoUnsub = null; }
    currentGroup = null;
    JC.currentChatIsGroup = false;
    // Call buttons belong to 1-to-1 chats — show them again.
    $("btnVoiceCall").classList.remove("hidden");
    $("btnVideoCall").classList.remove("hidden");
  };

  // ---------- send a group message (ticks stop at "sent") ----------
  JC.sendGroupMessage = function (data) {
    if (!JC.db || !JC.currentUser || !JC.currentChatId || !currentGroup) {
      return Promise.reject(new Error("no-group-open"));
    }
    var groupId = JC.currentChatId;
    var msg = {
      senderId: JC.currentUser.uid,
      type: data.type,
      text: data.text || "",
      mediaUrl: data.mediaUrl || "",
      mediaName: data.mediaName || "",
      durationSec: data.durationSec || 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "sent"   // group ticks never move past "sent" in v1.0
    };
    if (!msg.mediaUrl) delete msg.mediaUrl;
    if (!msg.mediaName) delete msg.mediaName;
    if (!msg.durationSec) delete msg.durationSec;
    var preview = lastMessagePreview(msg);
    var members = (currentGroup.members || []).slice();
    return JC.db.collection("groups").doc(groupId).collection("messages").add(msg).then(function () {
      return JC.db.collection("groups").doc(groupId).update({
        lastMessage: preview,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).then(function () {
      // Bump the unread badge for every OTHER member.
      var now = firebase.firestore.FieldValue.serverTimestamp();
      var jobs = members.filter(function (uid) { return uid !== JC.currentUser.uid; })
        .map(function (uid) {
          return JC.db.collection("userChats").doc(uid).collection("list").doc(groupId).set({
            chatId: groupId,
            groupId: groupId,
            type: "group",
            otherUid: "",
            unreadCount: firebase.firestore.FieldValue.increment(1),
            lastMessageAt: now
          }, { merge: true });
        });
      return Promise.all(jobs);
    });
  };

  function lastMessagePreview(m) {
    if (!m) return "";
    if (m.type === "image") return "Photo";
    if (m.type === "video") return "Video";
    if (m.type === "voice") return "Voice message";
    if (m.type === "file") return "File: " + (m.mediaName || "");
    return m.text || "";
  }

  // ---------- render a group message (sender name on every message) ----------
  function renderGroupMessage(msgId, m) {
    if (groupMsgEls[msgId]) return;
    var isOut = m.senderId === JC.currentUser.uid;
    var div = document.createElement("div");
    div.className = "msg " + (isOut ? "out" : "in");
    var body = "";
    if (m.type === "text") body = esc(m.text || "");
    else if (m.type === "image") body = '<img class="bubble-img" src="' + esc(m.mediaUrl || "") + '" alt="Photo">' + (m.text ? "<div>" + esc(m.text) + "</div>" : "");
    else if (m.type === "video") body = '<video class="bubble-video" src="' + esc(m.mediaUrl || "") + '" controls playsinline></video>' + (m.text ? "<div>" + esc(m.text) + "</div>" : "");
    else if (m.type === "voice") body = '<div class="voice-line"><audio src="' + esc(m.mediaUrl || "") + '" controls preload="metadata"></audio><span>' + (m.durationSec || 0) + 's</span></div>';
    else if (m.type === "file") body = '<div class="file-chip"><span class="file-icon">&#128196;</span><a href="' + esc(m.mediaUrl || "") + '" target="_blank" rel="noopener">' + esc(m.mediaName || "File") + "</a></div>";
    // Sender name above the message (every member sees who sent it).
    // Only a single "sent" tick — no delivered/read ticks in groups.
    var nameHtml = isOut ? "" : '<div class="sender-name" data-uid="' + esc(m.senderId) + '">...</div>';
    div.innerHTML = nameHtml + body + '<div class="meta">' + fmtTime(m.createdAt) + (isOut ? ' <span class="ticks">&#10003;</span>' : "") + "</div>";
    var img = div.querySelector("img.bubble-img");
    if (img) {
      img.addEventListener("click", function () { JC.openViewer("image", m.mediaUrl); });
      img.addEventListener("error", function () { JC.mediaGone(img); });
    }
    var vid = div.querySelector("video.bubble-video");
    if (vid) {
      vid.addEventListener("click", function () { JC.openViewer("video", m.mediaUrl); });
      vid.addEventListener("error", function () { JC.mediaGone(vid); });
    }
    var aud = div.querySelector("audio");
    if (aud) aud.addEventListener("error", function () { JC.mediaGone(aud); });
    $("messages").appendChild(div);
    groupMsgEls[msgId] = div;
    // Fill in the sender's name.
    if (!isOut) {
      var cached = JC.getCachedProfile ? JC.getCachedProfile(m.senderId) : null;
      var nameEl = div.querySelector(".sender-name");
      if (cached) { nameEl.textContent = cached.displayName || "Unknown"; }
      else {
        JC.db.collection("users").doc(m.senderId).get().then(function (snap) {
          var p = snap.exists ? snap.data() : { displayName: "Unknown" };
          if (nameEl) nameEl.textContent = p.displayName || "Unknown";
        }).catch(function () { if (nameEl) nameEl.textContent = "Unknown"; });
      }
    }
  }

  // ---------- group info screen ----------
  JC.openGroupInfo = function () {
    if (!currentGroup || !JC.currentChatId) return;
    JC.showScreen("screen-groupinfo", { push: true });
    renderGroupInfo();
  };

  function renderGroupInfo() {
    var g = currentGroup;
    $("groupInfoName").textContent = g.name || "Group";
    $("groupInfoType").textContent = (g.type === "family" ? "Family group" : "Friends group") + " • " + (g.members || []).length + " member" + ((g.members || []).length === 1 ? "" : "s");
    var adminOnly = document.querySelectorAll(".admin-only");
    adminOnly.forEach(function (el) { el.classList.toggle("hidden", !isAdmin()); });
    var list = $("groupMembersList");
    list.innerHTML = "<p style='color:#667781;'>Loading members…</p>";
    var jobs = (g.members || []).map(function (uid) {
      return JC.db.collection("users").doc(uid).get().then(function (snap) {
        return { uid: uid, data: snap.exists ? snap.data() : { displayName: "Unknown", gmail: "" } };
      });
    });
    Promise.all(jobs).then(function (members) {
      list.innerHTML = "";
      members.forEach(function (m) {
        var admin = (g.admins || []).indexOf(m.uid) >= 0;
        var me = m.uid === JC.currentUser.uid;
        var row = document.createElement("div");
        row.className = "user-result";
        row.innerHTML =
          '<div class="avatar">' + (m.data.photoURL ? '<img src="' + esc(m.data.photoURL) + '" alt="">' : esc((m.data.displayName || "?")[0] || "?")) + '</div>' +
          '<div class="info"><div class="name">' + esc(m.data.displayName || "Unknown") + (me ? " (you)" : "") + '</div>' +
          '<div class="gmail">' + esc(m.data.gmail || "") + (admin ? " • Admin" : "") + '</div></div>';
        if (isAdmin() && !me) {
          var btns = document.createElement("div");
          btns.style.cssText = "display:flex;flex-direction:column;gap:6px;";
          if (!admin) {
            var mk = document.createElement("button");
            mk.className = "btn btn-ghost btn-small";
            mk.textContent = "Make admin";
            mk.addEventListener("click", function () { setAdmin(m.uid, true); });
            btns.appendChild(mk);
          }
          var rm = document.createElement("button");
          rm.className = "btn btn-danger btn-small";
          rm.textContent = "Remove";
          rm.addEventListener("click", function () { removeMember(m.uid, m.data.displayName); });
          btns.appendChild(rm);
          row.appendChild(btns);
        }
        list.appendChild(row);
      });
    });
  }

  function groupRef() { return JC.db.collection("groups").doc(JC.currentChatId); }

  function setAdmin(uid, make) {
    var op = make ? firebase.firestore.FieldValue.arrayUnion(uid)
      : firebase.firestore.FieldValue.arrayRemove(uid);
    groupRef().update({ admins: op }).then(function () {
      JC.toast(make ? "Member is now an admin" : "Admin removed");
      renderGroupInfo();
    }).catch(function (e) { JC.toast("Failed: " + e.message); });
  }

  function removeMember(uid, name) {
    if (uid === JC.currentUser.uid) { JC.toast("You cannot remove yourself. Use Leave group instead."); return; }
    groupRef().update({
      members: firebase.firestore.FieldValue.arrayRemove(uid),
      admins: firebase.firestore.FieldValue.arrayRemove(uid)
    }).then(function () {
      return JC.db.collection("userChats").doc(uid).collection("list").doc(JC.currentChatId).delete().catch(function () {});
    }).then(function () {
      JC.toast((name || "Member") + " removed from the group");
      renderGroupInfo();
    }).catch(function (e) { JC.toast("Failed: " + e.message); });
  }

  JC.leaveGroup = function () {
    if (!currentGroup || !JC.currentChatId) return;
    if (isAdmin() && (currentGroup.admins || []).length === 1 && (currentGroup.members || []).length > 1) {
      JC.toast("You are the only admin. Make someone else an admin first, then leave.");
      return;
    }
    var groupId = JC.currentChatId;
    groupRef().update({
      members: firebase.firestore.FieldValue.arrayRemove(JC.currentUser.uid),
      admins: firebase.firestore.FieldValue.arrayRemove(JC.currentUser.uid)
    }).then(function () {
      return JC.db.collection("userChats").doc(JC.currentUser.uid).collection("list").doc(groupId).delete().catch(function () {});
    }).then(function () {
      JC.closeChat();
      JC.showScreen("screen-list");
      JC.toast("You left the group");
    }).catch(function (e) { JC.toast("Failed: " + e.message); });
  };

  JC.addMemberToGroup = function (uid) {
    if (!currentGroup || !JC.currentChatId) return Promise.reject(new Error("no-group-open"));
    if (!isAdmin()) return Promise.reject(new Error("only-admin-can-add"));
    if ((currentGroup.members || []).indexOf(uid) >= 0) return Promise.reject(new Error("already-a-member"));
    var groupId = JC.currentChatId;
    return groupRef().update({ members: firebase.firestore.FieldValue.arrayUnion(uid) }).then(function () {
      return JC.db.collection("userChats").doc(uid).collection("list").doc(groupId).set({
        chatId: groupId,
        groupId: groupId,
        type: "group",
        otherUid: "",
        unreadCount: 0,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }).then(function () {
      JC.toast("Member added to the group");
      renderGroupInfo();
    });
  };

  // ---------- wire UI ----------
  document.addEventListener("DOMContentLoaded", function () {
    $("btnNewGroup").addEventListener("click", function () { JC.showScreen("screen-newgroup", { push: true }); });
    $("btnNewGroupBack").addEventListener("click", function () { JC.goBack(); });
    $("btnCreateGroup").addEventListener("click", function () {
      var name = ($("groupNameInput").value || "").trim();
      var type = document.querySelector('input[name="groupType"]:checked');
      type = type ? type.value : "friends";
      if (!name) { JC.toast("Type a group name first."); return; }
      JC.createGroup(name, type).then(function (groupId) {
        $("groupNameInput").value = "";
        JC.toast("Group created — add members from Group info.");
        JC.openGroupChat(groupId);
      }).catch(function (e) { JC.toast("Could not create group: " + e.message); });
    });
    $("chatWho").addEventListener("click", function () {
      if (JC.currentChatIsGroup) JC.openGroupInfo();
    });
    $("btnGroupInfoBack").addEventListener("click", function () { JC.goBack(); });
    $("btnLeaveGroup").addEventListener("click", JC.leaveGroup);
    $("btnAddMemberSearch").addEventListener("click", function () {
      var gmail = ($("groupAddInput").value || "").trim().toLowerCase();
      var box = $("groupAddResult");
      if (!gmail || gmail.indexOf("@") < 0) { box.innerHTML = "<p style='color:#ea0038;margin-top:12px;'>Type a valid Gmail address.</p>"; return; }
      box.innerHTML = "<p style='margin-top:12px;color:#667781;'>Searching…</p>";
      JC.searchUserByGmail(gmail).then(function (found) {
        if (!found) { box.innerHTML = "<p style='margin-top:12px;'>No Jilan Chat user found for <b>" + esc(gmail) + "</b>.</p>"; return; }
        if (found.uid === JC.currentUser.uid) { box.innerHTML = "<p style='margin-top:12px;'>That is your own Gmail.</p>"; return; }
        box.innerHTML =
          '<div class="user-result"><div class="avatar">' + esc((found.data.displayName || "?")[0] || "?") + '</div>' +
          '<div class="info"><div class="name">' + esc(found.data.displayName || "Unknown") + '</div>' +
          '<div class="gmail">' + esc(found.data.gmail || "") + '</div></div>' +
          '<button class="btn btn-primary btn-small" id="btnConfirmAddMember">Add</button></div>';
        $("btnConfirmAddMember").addEventListener("click", function () {
          JC.addMemberToGroup(found.uid).then(function () {
            box.innerHTML = "";
            $("groupAddInput").value = "";
          }).catch(function (e) { JC.toast("Could not add member: " + e.message); });
        });
      }).catch(function (e) {
        box.innerHTML = "<p style='color:#ea0038;margin-top:12px;'>Search failed: " + esc(e.message) + "</p>";
      });
    });
  });
})();
