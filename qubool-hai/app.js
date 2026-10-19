// Qubool Hai — Rishta app logic. All data stays in localStorage.
var COLORS = ["#e8b93c","#4ade80","#60a5fa","#f472b6","#c084fc","#fb923c","#2dd4bf","#facc15"];
var EDUS = ["Matric","FA / FSc","BA / BSc","MA / MSc","MBA","MBBS","Engineering","Hafiz-e-Quran"];

var DEMO = [
  {name:"Ahmed Raza", gender:"M", age:28, city:"Multan", edu:"MA / MSc", job:"Teacher", about:"Deeni mizaj, simple family se."},
  {name:"Fatima Khan", gender:"F", age:24, city:"Lahore", edu:"BA / BSc", job:"Nurse", about:"Parhi likhi, ghar sambhalne wali."},
  {name:"Bilal Ahmed", gender:"M", age:30, city:"Karachi", edu:"MBA", job:"Bank Officer", about:"Settled, apna ghar."},
  {name:"Ayesha Malik", gender:"F", age:26, city:"Faisalabad", edu:"MBBS", job:"Doctor", about:"Doctor, deeni khandaan."},
  {name:"Usman Tariq", gender:"M", age:27, city:"Rawalpindi", edu:"Engineering", job:"Engineer", about:"Mehnati, namazi."},
  {name:"Mahnoor Fatima", gender:"F", age:23, city:"Multan", edu:"FA / FSc", job:"Teacher", about:"Shareef khandaan se."},
  {name:"Imran Sheikh", gender:"M", age:32, city:"Lahore", edu:"Matric", job:"Businessman", about:"Apna karobar, khush mizaj."},
  {name:"Hira Shahid", gender:"F", age:25, city:"Islamabad", edu:"BA / BSc", job:"Accountant", about:"Samajhdar, taleem yafta."}
];

function ls(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

function avatarColor(name){
  var h = 0;
  for (var i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return COLORS[h % COLORS.length];
}
function firstLetter(name){ return (name || "?").trim().charAt(0).toUpperCase(); }

function allProfiles(){
  var mine = ls("qh_mine", null);
  var arr = DEMO.map(function(p, i){ p._demo = true; p._id = "demo" + i; return p; });
  if (mine) { mine._mine = true; mine._id = "mine"; arr.unshift(mine); }
  return arr;
}
function shortIds(){ return ls("qh_short", []); }
function isShort(id){ return shortIds().indexOf(id) >= 0; }
function toggleShort(id){
  var s = shortIds();
  var i = s.indexOf(id);
  if (i >= 0) s.splice(i, 1); else s.push(id);
  save("qh_short", s);
  render(); renderShort();
  var m = document.getElementById("modal");
  if (m && !m.classList.contains("hidden")) openModal(id);
}

function cardHTML(p){
  var demo = p._demo ? '<span class="badge">DEMO</span>' : '';
  var me = p._mine ? '<span class="badge me">MERA</span>' : '';
  var g = p.gender === "F" ? "Larki" : "Larka";
  var heart = isShort(p._id) ? "on" : "";
  return '<div class="card"><div class="prof">' +
    '<div class="avatar" style="background:' + avatarColor(p.name) + '">' + firstLetter(p.name) + '</div>' +
    '<div class="pinfo" onclick="openModal(\'' + p._id + '\')">' +
      '<div class="pname">' + esc(p.name) + demo + me + '</div>' +
      '<div class="pmeta">' + g + ', ' + p.age + ' saal · ' + esc(p.city) + '<br>' + esc(p.edu) + ' · ' + esc(p.job) + '</div>' +
    '</div>' +
    '<div class="heart ' + heart + '" onclick="toggleShort(\'' + p._id + '\')">❤️</div>' +
  '</div></div>';
}

function esc(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function render(){
  var q = document.getElementById("q").value.trim().toLowerCase();
  var g = document.getElementById("fGender").value;
  var c = document.getElementById("fCity").value;
  var e = document.getElementById("fEdu").value;
  var a = document.getElementById("fAge").value;
  var out = "";
  allProfiles().forEach(function(p){
    if (g && p.gender !== g) return;
    if (c && p.city !== c) return;
    if (e && p.edu !== e) return;
    if (a){ var r = a.split("-"); if (p.age < +r[0] || p.age > +r[1]) return; }
    if (q && (p.name.toLowerCase().indexOf(q) < 0 && p.city.toLowerCase().indexOf(q) < 0)) return;
    out += cardHTML(p);
  });
  document.getElementById("list").innerHTML = out || '<div class="empty">Koi profile nahi mili — filter badal kar dekhein.</div>';
  var n = shortIds().length;
  document.getElementById("shortCount").textContent = n ? "(" + n + ")" : "";
}

function renderShort(){
  var ids = shortIds(), out = "";
  allProfiles().forEach(function(p){ if (ids.indexOf(p._id) >= 0) out += cardHTML(p); });
  document.getElementById("shortList").innerHTML = out || '<div class="empty">❤️<br>Abhi koi shortlist nahi — dil wale button se pasand save karein.</div>';
}

function renderMine(){
  var mine = ls("qh_mine", null);
  var box = document.getElementById("myCard");
  if (mine){
    mine._mine = true; mine._id = "mine";
    box.innerHTML = cardHTML(mine) +
      '<button class="btn ghost" onclick="editMine()">Edit Karein</button>' +
      '<button class="btn ghost" style="margin-top:8px" onclick="delMine()">Profile Delete Karein</button>';
    document.getElementById("myForm").style.display = "none";
  } else {
    box.innerHTML = "";
    document.getElementById("myForm").style.display = "block";
  }
}

function saveMine(){
  var name = document.getElementById("mName").value.trim();
  var age = parseInt(document.getElementById("mAge").value, 10);
  var city = document.getElementById("mCity").value.trim();
  if (!name){ alert("Naam likhein"); return; }
  if (!age || age < 18 || age > 70){ alert("Sahi umar likhein (18–70)"); return; }
  if (!city){ alert("Sheher likhein"); return; }
  save("qh_mine", {
    name: name,
    gender: document.getElementById("mGender").value,
    age: age, city: city,
    edu: document.getElementById("mEdu").value,
    job: document.getElementById("mJob").value.trim() || "—",
    about: document.getElementById("mAbout").value.trim() || "—"
  });
  renderMine(); render();
  alert("Profile save ho gaya! ✅");
}
function editMine(){
  var m = ls("qh_mine", null); if (!m) return;
  document.getElementById("mName").value = m.name;
  document.getElementById("mGender").value = m.gender;
  document.getElementById("mAge").value = m.age;
  document.getElementById("mCity").value = m.city;
  document.getElementById("mEdu").value = m.edu;
  document.getElementById("mJob").value = m.job === "—" ? "" : m.job;
  document.getElementById("mAbout").value = m.about === "—" ? "" : m.about;
  document.getElementById("myForm").style.display = "block";
}
function delMine(){
  if (!confirm("Apna profile delete karna hai?")) return;
  try{ localStorage.removeItem("qh_mine"); }catch(e){}
  renderMine(); render();
}

function findById(id){
  var f = null;
  allProfiles().forEach(function(p){ if (p._id === id) f = p; });
  return f;
}
function openModal(id){
  var p = findById(id); if (!p) return;
  var g = p.gender === "F" ? "Larki" : "Larka";
  var badge = p._demo ? ' <span class="badge">DEMO</span>' : (p._mine ? ' <span class="badge me">MERA</span>' : '');
  var heart = isShort(id) ? "on" : "";
  document.getElementById("modalBody").innerHTML =
    '<div style="text-align:center;margin-bottom:10px">' +
      '<div class="avatar" style="background:' + avatarColor(p.name) + ';width:84px;height:84px;font-size:36px;margin:0 auto 8px">' + firstLetter(p.name) + '</div>' +
      '<div class="pname" style="font-size:20px">' + esc(p.name) + badge + '</div>' +
    '</div>' +
    '<div class="detail">' +
      '<div>👤 <b>Sinf:</b> ' + g + '</div>' +
      '<div>🎂 <b>Umar:</b> ' + p.age + ' saal</div>' +
      '<div>🏙️ <b>Sheher:</b> ' + esc(p.city) + '</div>' +
      '<div>🎓 <b>Taleem:</b> ' + esc(p.edu) + '</div>' +
      '<div>💼 <b>Pesha:</b> ' + esc(p.job) + '</div>' +
      '<div>📝 <b>Taaruf:</b> ' + esc(p.about) + '</div>' +
    '</div>' +
    '<button class="btn" onclick="toggleShort(\'' + id + '\')">' +
      (isShort(id) ? '💔 Shortlist se Hatayein' : '❤️ Shortlist me Dalain') + '</button>' +
    '<button class="btn ghost" style="margin-top:8px" onclick="closeModal()">Band Karein</button>';
  document.getElementById("modal").classList.remove("hidden");
}
function closeModal(){ document.getElementById("modal").classList.add("hidden"); }

function showTab(t){
  ["home","short","mine"].forEach(function(x){
    document.getElementById("pane" + x.charAt(0).toUpperCase() + x.slice(1)).classList.toggle("hidden", x !== t);
    document.getElementById("t" + x.charAt(0).toUpperCase() + x.slice(1)).classList.toggle("on", x === t);
  });
  if (t === "short") renderShort();
  if (t === "mine") renderMine();
  window.scrollTo(0, 0);
}

(function init(){
  var cities = {}, fc = document.getElementById("fCity");
  DEMO.forEach(function(p){ cities[p.city] = 1; });
  Object.keys(cities).sort().forEach(function(c){
    var o = document.createElement("option"); o.value = c; o.textContent = c; fc.appendChild(o);
  });
  var fe = document.getElementById("fEdu"), me = document.getElementById("mEdu");
  EDUS.forEach(function(e){
    var o1 = document.createElement("option"); o1.value = e; o1.textContent = e; fe.appendChild(o1);
    var o2 = document.createElement("option"); o2.value = e; o2.textContent = e; me.appendChild(o2);
  });
  render();
})();
