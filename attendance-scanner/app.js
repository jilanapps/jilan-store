// Attendance Scanner — Jilan Apps. Sab data localStorage me rehta hai.
var WA_NUM = "923057867149";

function ls(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function esc(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function students(){ return ls("att_students", []); }
function saveStudents(a){ save("att_students", a); }
function records(){ return ls("att_records", {}); }
function saveRecords(r){ save("att_records", r); }

function todayKey(d){
  var x = d ? new Date(d) : new Date();
  var m = ("0" + (x.getMonth()+1)).slice(-2), dy = ("0" + x.getDate()).slice(-2);
  return x.getFullYear() + "-" + m + "-" + dy;
}
function timeNow(){
  var x = new Date(), h = x.getHours(), m = ("0"+x.getMinutes()).slice(-2);
  var ap = h >= 12 ? "PM" : "AM"; h = h % 12; if (h === 0) h = 12;
  return h + ":" + m + " " + ap;
}
function toast(msg){
  var t = document.getElementById("toast");
  t.textContent = msg; t.style.display = "block";
  setTimeout(function(){ t.style.display = "none"; }, 2200);
}

function showTab(t){
  ["Scan","Stu","Reg","Rep"].forEach(function(x){
    document.getElementById("pane"+x).classList.toggle("on", x === t);
    document.getElementById("t"+x).classList.toggle("on", x === t);
  });
  if (t === "Stu") renderStudents();
  if (t === "Reg") renderRegister();
  if (t === "Rep") renderReport();
  window.scrollTo(0,0);
}

/* ---------- STUDENTS ---------- */
function addStudent(){
  var name = document.getElementById("sName").value.trim();
  var father = document.getElementById("sFather").value.trim();
  var roll = document.getElementById("sRoll").value.trim();
  var cls = document.getElementById("sClass").value.trim();
  if (!name){ toast("Naam likhein"); return; }
  if (!roll){ toast("Roll number likhein"); return; }
  var a = students();
  for (var i = 0; i < a.length; i++) if (a[i].roll === roll){ toast("Ye roll number pehle se hai"); return; }
  a.push({ name: name, father: father || "—", roll: roll, cls: cls || "—" });
  saveStudents(a);
  document.getElementById("sName").value = "";
  document.getElementById("sFather").value = "";
  document.getElementById("sRoll").value = "";
  document.getElementById("sClass").value = "";
  renderStudents();
  toast("Student add ho gaya ✅");
}
function delStudent(roll){
  if (!confirm("Roll " + roll + " delete karna hai?")) return;
  var a = students().filter(function(s){ return s.roll !== roll; });
  saveStudents(a); renderStudents();
}
function editStudent(roll){
  var a = students(), s = null;
  for (var i = 0; i < a.length; i++) if (a[i].roll === roll) s = a[i];
  if (!s) return;
  var n = prompt("Naam:", s.name); if (n === null) return;
  var f = prompt("Waldiyat:", s.father); if (f === null) return;
  var c = prompt("Class:", s.cls); if (c === null) return;
  s.name = n.trim() || s.name; s.father = f.trim() || s.father; s.cls = c.trim() || s.cls;
  saveStudents(a); renderStudents(); toast("Save ho gaya ✅");
}
function findStudent(roll){
  var a = students();
  for (var i = 0; i < a.length; i++) if (a[i].roll === roll) return a[i];
  return null;
}
function qrImgTag(roll, size){
  // kazuhikoarase qrcode-generator (MIT) — inline, offline
  var qr = qrcode(0, "M");
  qr.addData("ATT:" + roll);
  qr.make();
  return qr.createImgTag(size || 5, 6);
}
function qrDataURL(roll){
  var qr = qrcode(0, "M");
  qr.addData("ATT:" + roll);
  qr.make();
  return qr.createDataURL(8, 8);
}
function renderStudents(){
  var a = students();
  document.getElementById("stuCount").textContent = a.length;
  var box = document.getElementById("stuList");
  if (!a.length){
    box.innerHTML = '<div class="empty">📝<br>Abhi koi student nahi.<br>Oopar form se pehla student add karein.</div>';
    return;
  }
  var h = "";
  a.forEach(function(s){
    h += '<div class="stu"><div class="av">' + esc(s.name.charAt(0).toUpperCase()) + '</div>' +
      '<div class="inf"><b>' + esc(s.name) + '</b>' +
      '<small>Roll ' + esc(s.roll) + ' · ' + esc(s.cls) + ' · ' + esc(s.father) + '</small></div>' +
      '<div><button class="btn small ghost" onclick="showIDCard(\'' + esc(s.roll) + '\')">🪪 Card</button>' +
      '<button class="btn small ghost" onclick="editStudent(\'' + esc(s.roll) + '\')">✏️</button>' +
      '<button class="btn small danger" onclick="delStudent(\'' + esc(s.roll) + '\')">🗑️</button></div></div>';
  });
  box.innerHTML = h;
}
function showIDCard(roll){
  var s = findStudent(roll); if (!s) return;
  document.getElementById("idCardBox").innerHTML =
    '<h2>🎓 Student ID Card</h2>' +
    '<div class="qr">' + qrImgTag(roll, 6) + '</div>' +
    '<table><tr><td>Naam</td><td><b>' + esc(s.name) + '</b></td></tr>' +
    '<tr><td>Waldiyat</td><td>' + esc(s.father) + '</td></tr>' +
    '<tr><td>Roll No</td><td><b>' + esc(s.roll) + '</b></td></tr>' +
    '<tr><td>Class</td><td>' + esc(s.cls) + '</td></tr></table>' +
    '<p style="font-size:11px;color:#666;margin-top:10px">Scan karke hazri lagayein</p>' +
    '<button class="btn" onclick="downloadIDCard(\'' + esc(roll) + '\')">⬇️ Card Download</button>' +
    '<button class="btn ghost" style="color:#0b1120;border-color:#0b1120" onclick="closeIDCard()">Band Karein</button>';
  document.getElementById("idModal").classList.add("on");
}
function closeIDCard(){ document.getElementById("idModal").classList.remove("on"); }
function downloadIDCard(roll){
  var s = findStudent(roll); if (!s) return;
  var a = document.createElement("a");
  a.href = qrDataURL(roll);
  a.download = "QR-Roll-" + roll + ".png";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast("QR download ho gaya ⬇️");
}

/* ---------- SCANNER ---------- */
var html5qr = null, scanning = false, lastScan = "";

function startScan(){
  if (scanning) return;
  if (typeof Html5Qrcode === "undefined"){ toast("Scanner load nahi hua — internet check karein"); return; }
  var box = document.getElementById("reader");
  html5qr = new Html5Qrcode("reader");
  html5qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 240, height: 240 } },
    onScanOK,
    function(){}
  ).then(function(){
    scanning = true;
    document.getElementById("btnStart").style.display = "none";
    document.getElementById("btnStop").style.display = "block";
  }).catch(function(e){
    toast("Camera nahi khula — ijazat dein");
  });
}
function stopScan(){
  if (!scanning || !html5qr) return;
  var q = html5qr; html5qr = null; scanning = false;
  q.stop().then(function(){ q.clear(); }).catch(function(){});
  document.getElementById("btnStart").style.display = "block";
  document.getElementById("btnStop").style.display = "none";
}
function onScanOK(text){
  text = String(text).trim();
  if (text === lastScan) return; // same-code repeat guard
  lastScan = text;
  setTimeout(function(){ lastScan = ""; }, 3000);
  var m = text.match(/^ATT:(.+)$/i);
  var box = document.getElementById("scanResult");
  if (!m){
    box.innerHTML = '<div class="card" style="border-color:#7a2a35"><h3 style="color:#ff8a8a">⚠️ Ghalat QR</h3><p style="font-size:13px">Ye attendance card ka QR nahi lagta.</p></div>';
    return;
  }
  var roll = m[1].trim();
  var s = findStudent(roll);
  if (!s){
    box.innerHTML = '<div class="card" style="border-color:#7a2a35"><h3 style="color:#ff8a8a">⚠️ Student nahi mila</h3><p style="font-size:13px">Roll ' + esc(roll) + ' list me nahi hai. Pehle Students tab me add karein.</p></div>';
    return;
  }
  var dk = todayKey(), r = records();
  if (!r[dk]) r[dk] = {};
  if (r[dk][roll] && r[dk][roll].status === "P"){
    box.innerHTML = '<div class="card" style="border-color:#e8b93c"><h3>✅ Pehle se Hazir</h3>' +
      '<p style="font-size:14px"><b>' + esc(s.name) + '</b> (Roll ' + esc(roll) + ')<br>Aaj ' + esc(r[dk][roll].time) + ' par hazri lag chuki hai.</p></div>';
    return;
  }
  var tm = timeNow();
  r[dk][roll] = { status: "P", time: tm };
  saveRecords(r);
  box.innerHTML = '<div class="card" style="border-color:#4ade80"><h3 style="color:#4ade80">✅ Hazri Lag Gayi</h3>' +
    '<p style="font-size:14px"><b>' + esc(s.name) + '</b><br>Roll ' + esc(roll) + ' · ' + esc(s.cls) + '<br>⏰ ' + esc(tm) + '</p></div>';
}

/* ---------- REGISTER ---------- */
function regKey(){
  var v = document.getElementById("regDate").value;
  return v || todayKey();
}
function renderRegister(){
  var dk = regKey(), a = students(), r = records();
  if (!r[dk]) r[dk] = {};
  var day = r[dk], p = 0;
  var h = "";
  if (!a.length){
    document.getElementById("regList").innerHTML = '<div class="card"><div class="empty">Pehle Students tab me student add karein.</div></div>';
  } else {
    a.forEach(function(s){
      var st = day[s.roll] ? day[s.roll].status : "A";
      if (st === "P") p++;
      h += '<div class="stu"><div class="av">' + esc(s.name.charAt(0).toUpperCase()) + '</div>' +
        '<div class="inf"><b>' + esc(s.name) + '</b><small>Roll ' + esc(s.roll) + ' · ' + esc(s.cls) +
        (day[s.roll] && day[s.roll].time ? ' · ⏰ ' + esc(day[s.roll].time) : '') + '</small></div>' +
        '<span class="badge ' + (st === "P" ? "p" : "a") + '" onclick="toggleAtt(\'' + esc(s.roll) + '\')" style="cursor:pointer">' +
        (st === "P" ? "✅ Hazir" : "❌ Ghair") + '</span></div>';
    });
    document.getElementById("regList").innerHTML = h;
  }
  document.getElementById("cP").textContent = p;
  document.getElementById("cA").textContent = a.length - p;
  document.getElementById("cT").textContent = a.length;
}
function toggleAtt(roll){
  var dk = regKey(), r = records();
  if (!r[dk]) r[dk] = {};
  var cur = r[dk][roll] ? r[dk][roll].status : "A";
  if (cur === "P") r[dk][roll] = { status: "A", time: "" };
  else r[dk][roll] = { status: "P", time: timeNow() };
  saveRecords(r); renderRegister();
}

/* ---------- REPORT ---------- */
function repKey(){
  var v = document.getElementById("repMonth").value;
  if (v) return v;
  var x = new Date();
  return x.getFullYear() + "-" + ("0" + (x.getMonth()+1)).slice(-2);
}
function monthStats(mk){
  var a = students(), r = records(), out = [];
  a.forEach(function(s){
    var p = 0, t = 0;
    Object.keys(r).forEach(function(dk){
      if (dk.indexOf(mk) === 0 && r[dk][s.roll]){
        t++;
        if (r[dk][s.roll].status === "P") p++;
      }
    });
    out.push({ s: s, p: p, a: t - p, pct: t ? Math.round(p * 100 / t) : 0 });
  });
  return out;
}
function renderReport(){
  var mk = repKey(), stats = monthStats(mk);
  var box = document.getElementById("repOut");
  if (!stats.length){ box.innerHTML = '<div class="empty">Koi student nahi.</div>'; return; }
  var h = '<table><tr><th>Naam</th><th>Roll</th><th>✅</th><th>❌</th><th>%</th></tr>';
  stats.forEach(function(x){
    h += '<tr><td>' + esc(x.s.name) + '</td><td>' + esc(x.s.roll) + '</td><td>' + x.p + '</td><td>' + x.a + '</td><td>' + x.pct + '%</td></tr>';
  });
  box.innerHTML = h + '</table>';
}
function exportCSV(){
  var mk = repKey(), stats = monthStats(mk);
  if (!stats.length){ toast("Koi data nahi"); return; }
  var csv = "Naam,Roll Number,Class,Hazir,Ghair Hazir,Percent\n";
  stats.forEach(function(x){
    csv += '"' + x.s.name.replace(/"/g,'""') + '",' + x.s.roll + ',"' + x.s.cls.replace(/"/g,'""') + '",' + x.p + ',' + x.a + ',' + x.pct + '%\n';
  });
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "attendance-" + mk + ".csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast("CSV download ho gaya ⬇️");
}
function shareWA(){
  var mk = repKey(), stats = monthStats(mk);
  if (!stats.length){ toast("Koi data nahi"); return; }
  var tp = 0, ta = 0;
  var msg = "📋 *Hazri Report* — " + mk + "\n_Jilan Apps_\n\n";
  stats.forEach(function(x){
    tp += x.p; ta += x.a;
    msg += "• " + x.s.name + " (Roll " + x.s.roll + "): ✅" + x.p + " ❌" + x.a + " (" + x.pct + "%)\n";
  });
  msg += "\nKul Hazir: " + tp + " | Kul Ghair: " + ta;
  window.open("https://wa.me/" + WA_NUM + "?text=" + encodeURIComponent(msg), "_blank");
}

/* ---------- INIT ---------- */
(function init(){
  document.getElementById("regDate").value = todayKey();
  var x = new Date();
  document.getElementById("repMonth").value = x.getFullYear() + "-" + ("0" + (x.getMonth()+1)).slice(-2);
  document.getElementById("idModal").addEventListener("click", function(e){
    if (e.target === this) closeIDCard();
  });
  renderStudents();
})();
