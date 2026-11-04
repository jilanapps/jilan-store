// Jilan Qist Book — demo app logic (sample data, browser-only, no real payments/messages)
(function(){
  try{
    const q = new URLSearchParams(location.search);
    if(q.get("owner")==="1"){ localStorage.setItem("jqb_owner","1"); }
    if(localStorage.getItem("jqb_owner")==="1"){ return; }
    const THREE = 3*24*60*60*1000;
    let start = localStorage.getItem("jqb_start");
    if(!start){ start = Date.now(); localStorage.setItem("jqb_start", String(start)); }
    const left = THREE - (Date.now() - Number(start));
    if(left <= 0){
      document.body.innerHTML = '<div style="text-align:center;padding:80px 20px;font-family:Arial"><h2>Demo Expired</h2><p>This 3-day demo has expired. Please contact the owner for the full version.</p><p><a href="https://wa.me/923007379385">WhatsApp: 0300-7379385</a></p></div>';
      return;
    }
    const el = document.getElementById("validNote");
    if(el) el.textContent = "This demo works for " + Math.ceil(left/86400000) + " more day(s) on this device.";
  }catch(e){}
})();

const SEED = [
  {id:1, name:"Ahmed Raza", item:'LED TV 43"', total:85000, adv:15000, monthly:7000, months:10, paidAmount:35000, firstDue:"2026-06-05", reminded:false, payments:[{date:"2026-10-05", amount:7000}]},
  {id:2, name:"Bilal Khan", item:"Haier Fridge", total:95000, adv:20000, monthly:7500, months:10, paidAmount:45000, firstDue:"2026-05-02", reminded:false, payments:[{date:"2026-10-02", amount:7500}]},
  {id:3, name:"Usman Ghani", item:"Washing Machine", total:55000, adv:10000, monthly:4500, months:10, paidAmount:36000, firstDue:"2026-03-12", reminded:false, payments:[{date:"2026-10-12", amount:4500}]},
  {id:4, name:"Fatima Bibi", item:"Air Cooler", total:32000, adv:7000, monthly:2500, months:10, paidAmount:7500, firstDue:"2026-08-08", reminded:false, payments:[{date:"2026-10-08", amount:2500}]},
  {id:5, name:"Hassan Ali", item:"Ceiling Fans (2)", total:18000, adv:5000, monthly:1300, months:10, paidAmount:13000, firstDue:"2026-01-15", reminded:false, payments:[{date:"2026-10-15", amount:1300}]},
  {id:6, name:"Tariq Mehmood", item:"Sound System", total:68000, adv:8000, monthly:7500, months:10, paidAmount:15000, firstDue:"2026-08-30", reminded:false, payments:[{date:"2026-09-30", amount:7500}]},
];
const KEY = "jqb_data_v2";
let customers;
try{
  const saved = localStorage.getItem(KEY);
  customers = saved ? JSON.parse(saved) : SEED;
  if(!saved) localStorage.setItem(KEY, JSON.stringify(customers));
}catch(e){ customers = SEED; }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(customers)); }catch(e){} }

const fmt = n => "Rs " + Number(n).toLocaleString("en-PK");
const dstr = d => d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
function paidCount(c){ return Math.min(c.months, Math.floor(c.paidAmount / c.monthly)); }
function rem(c){ return Math.max(0, c.total - c.adv - c.paidAmount); }
function dueDate(c){ const d = new Date(c.firstDue); d.setMonth(d.getMonth() + paidCount(c)); return d; }
function statusOf(c){
  if(rem(c) <= 0) return "Completed";
  const today = new Date(); today.setHours(0,0,0,0);
  const due = dueDate(c); due.setHours(0,0,0,0);
  if(due < today) return "Overdue";
  if((due - today) / 86400000 <= 5) return "Due Soon";
  return "On Track";
}
function pill(s){
  if(s==="Overdue") return '<span class="pill bad">Overdue</span>';
  if(s==="Due Soon") return '<span class="pill warn">Due Soon</span>';
  if(s==="Completed") return '<span class="pill done">Completed</span>';
  return '<span class="pill ok">On Track</span>';
}
function notice(msg){
  const el = document.getElementById("notice");
  if(!el) return;
  el.textContent = msg; el.style.display = "block";
  window.scrollTo({top:0, behavior:"smooth"});
}
function navActive(){
  const page = (location.pathname.split("/").pop() || "index.html").split("?")[0];
  document.querySelectorAll("nav a").forEach(a=>{
    if(a.getAttribute("href") === page) a.classList.add("active");
  });
}

// ---------- Dashboard ----------
function renderDashboard(){
  const el = document.getElementById("dashCards"); if(!el) return;
  const active = customers.filter(c=>statusOf(c)!=="Completed");
  const overdue = customers.filter(c=>statusOf(c)==="Overdue");
  const overdueAmt = overdue.reduce((s,c)=>s + c.monthly, 0);
  el.innerHTML =
    '<div class="card"><h3>Total Customers</h3><div class="num">'+customers.length+'</div><div class="sub">Sample records</div></div>' +
    '<div class="card"><h3>Active Installments</h3><div class="num">'+active.length+'</div><div class="sub">Running qist plans</div></div>' +
    '<div class="card"><h3>Collected This Month</h3><div class="num">Rs 142,500</div><div class="sub">November 2026 (sample)</div></div>' +
    '<div class="card red"><h3>Overdue Amount</h3><div class="num">'+fmt(overdueAmt)+'</div><div class="sub">'+overdue.length+' customers overdue</div></div>';
  const ov = document.getElementById("overdueList");
  ov.innerHTML = overdue.length ? overdue.map(c=>
    '<p><b>'+c.name+'</b> — '+c.item+' — '+fmt(c.monthly)+' (was due '+dstr(dueDate(c))+')</p>').join("")
    : '<p>No overdue customers. Good recovery this month.</p>';
  const rp = document.getElementById("recentList");
  const all = [];
  customers.forEach(c=>c.payments.forEach(p=>all.push({name:c.name, item:c.item, date:p.date, amount:p.amount})));
  all.sort((a,b)=>b.date.localeCompare(a.date));
  rp.innerHTML = all.slice(0,5).map(p=>
    '<p><b>'+p.name+'</b> — '+p.item+' — '+fmt(p.amount)+' <span style="color:#888">('+dstr(new Date(p.date))+')</span></p>').join("");
}

// ---------- Customers ----------
let selectedId = null;
function renderCustomers(filter){
  const tb = document.querySelector("#custTable tbody"); if(!tb) return;
  const f = (filter||"").toLowerCase();
  tb.innerHTML = "";
  customers.filter(c=>!f || c.name.toLowerCase().includes(f) || c.item.toLowerCase().includes(f)).forEach(c=>{
    const s = statusOf(c);
    const tr = document.createElement("tr");
    tr.onclick = ()=>showDetail(c.id);
    tr.innerHTML = '<td>'+c.name+'</td><td>'+c.item+'</td><td>'+fmt(c.total)+'</td><td>'+fmt(c.adv)+'</td><td>'+fmt(c.monthly)+'</td><td>'+paidCount(c)+'/'+c.months+'</td><td>'+fmt(rem(c))+'</td><td>'+(s==="Completed" ? "—" : dstr(dueDate(c)))+'</td><td>'+pill(s)+'</td>';
    tb.appendChild(tr);
  });
}
function showDetail(id){
  const c = customers.find(x=>x.id===id); if(!c) return;
  selectedId = id;
  const s = statusOf(c);
  let rows = "";
  for(let m=1;m<=c.months;m++){
    const d = new Date(c.firstDue); d.setMonth(d.getMonth()+m-1);
    let st = "Upcoming";
    if(m<=paidCount(c)) st = "Paid";
    else if(m===paidCount(c)+1) st = (s==="Overdue" ? "Overdue" : s==="Due Soon" ? "Due Soon" : "Due");
    const cls = st==="Paid" ? "ok" : st==="Overdue" ? "bad" : (st==="Due Soon"||st==="Due") ? "warn" : "done";
    rows += '<tr><td>Qist '+m+'</td><td>'+dstr(d)+'</td><td>'+fmt(c.monthly)+'</td><td><span class="pill '+cls+'">'+st+'</span></td></tr>';
  }
  const hist = c.payments.length ? c.payments.map(p=>'<p>'+dstr(new Date(p.date))+' — <b>'+fmt(p.amount)+'</b></p>').join("") : '<p>No payments recorded yet.</p>';
  const panel = document.getElementById("detail");
  panel.style.display = "block";
  panel.innerHTML =
    '<h3>'+c.name+' — '+c.item+'</h3>' +
    '<p>Total: <b>'+fmt(c.total)+'</b> &nbsp;|&nbsp; Advance: <b>'+fmt(c.adv)+'</b> &nbsp;|&nbsp; Monthly: <b>'+fmt(c.monthly)+'</b> &nbsp;|&nbsp; Paid: <b>'+paidCount(c)+'/'+c.months+'</b> &nbsp;|&nbsp; Remaining: <b>'+fmt(rem(c))+'</b> &nbsp;|&nbsp; '+pill(s)+'</p>' +
    '<table style="margin-top:12px"><thead><tr><th>Qist</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table>' +
    '<h3 style="margin-top:18px">Payment History</h3>' + hist +
    (s==="Completed" ? '<p style="margin-top:12px"><b>Plan completed. No payment due.</b></p>' :
    '<form onsubmit="recordPayment(event)" style="margin-top:14px"><h3>Record Payment</h3>' +
    '<div><label>Amount (Rs)</label><input id="payAmt" type="number" min="1" value="'+c.monthly+'" required></div>' +
    '<div style="align-self:end"><button class="btn green" type="submit">Record Payment</button></div></form>');
}
function recordPayment(e){
  e.preventDefault();
  const c = customers.find(x=>x.id===selectedId); if(!c) return;
  const amt = +document.getElementById("payAmt").value;
  if(!amt || amt <= 0) return;
  c.paidAmount += amt;
  c.payments.unshift({date:new Date().toISOString().slice(0,10), amount:amt});
  save(); renderCustomers(document.getElementById("searchInput") ? document.getElementById("searchInput").value : "");
  showDetail(c.id);
  notice("Payment " + fmt(amt) + " record ho gayi. " + c.name + " ka baqaya ab " + fmt(rem(c)) + " hai.");
}
function addCustomer(e){
  e.preventDefault();
  const total = +document.getElementById("fTotal").value;
  const adv = +document.getElementById("fAdv").value;
  const months = +document.getElementById("fMonths").value;
  const d = new Date(); d.setMonth(d.getMonth()+1);
  customers.unshift({id:Date.now(), name:document.getElementById("fName").value, item:document.getElementById("fItem").value,
    total, adv, monthly:Math.round((total-adv)/months), months, paidAmount:0,
    firstDue:d.toISOString().slice(0,10), reminded:false, payments:[]});
  e.target.reset(); document.getElementById("fAdv").value = 0; document.getElementById("fMonths").value = 10;
  save(); renderCustomers("");
  notice("Customer add ho gaya. Nayi entry list me sab se upar aa gayi hai.");
}

// ---------- Reminders ----------
function renderReminders(){
  const tb = document.querySelector("#remTable tbody"); if(!tb) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const list = customers.filter(c=>{ const s = statusOf(c); return s==="Overdue" || s==="Due Soon"; });
  tb.innerHTML = list.length ? "" : '<tr><td colspan="6">No due or overdue reminders today.</td></tr>';
  list.forEach(c=>{
    const s = statusOf(c);
    const due = dueDate(c); due.setHours(0,0,0,0);
    const days = Math.round((today - due) / 86400000);
    const delay = s==="Overdue" ? days + " days overdue" : "due in " + Math.max(0, -days) + " days";
    const tr = document.createElement("tr");
    tr.innerHTML = '<td>'+c.name+'</td><td>'+c.item+'</td><td>'+fmt(c.monthly)+'</td><td>'+dstr(dueDate(c))+'</td><td>'+delay+'</td>' +
      '<td>' + (c.reminded ? '<span class="pill done">Noted (demo only)</span>'
        : '<button class="btn green small" onclick="markReminded('+c.id+',this)">Send Reminder</button>') + '</td>';
    tb.appendChild(tr);
  });
}
function markReminded(id, btn){
  const c = customers.find(x=>x.id===id); if(!c) return;
  c.reminded = true; save();
  btn.outerHTML = '<span class="pill done">Noted (demo only)</span>';
  notice("Reminder note kar liya gaya. Demo me koi asli message nahi bheja jata.");
}

// ---------- Reports ----------
function renderReports(){
  const el = document.getElementById("repTotals"); if(!el) return;
  const financed = customers.reduce((s,c)=>s + c.total, 0);
  const collected = customers.reduce((s,c)=>s + c.adv + c.paidAmount, 0);
  const remaining = customers.reduce((s,c)=>s + rem(c), 0);
  el.innerHTML =
    '<div class="card"><h3>Total Financed</h3><div class="num">'+fmt(financed)+'</div></div>' +
    '<div class="card"><h3>Total Collected</h3><div class="num">'+fmt(collected)+'</div><div class="sub">Advance + qist payments</div></div>' +
    '<div class="card"><h3>Total Remaining</h3><div class="num">'+fmt(remaining)+'</div></div>';
  const tb = document.querySelector("#repTable tbody");
  tb.innerHTML = "";
  customers.forEach(c=>{
    const tr = document.createElement("tr");
    tr.innerHTML = '<td>'+c.name+'</td><td>'+c.item+'</td><td>'+fmt(c.total)+'</td><td>'+fmt(c.adv + c.paidAmount)+'</td><td>'+fmt(rem(c))+'</td><td>'+pill(statusOf(c))+'</td>';
    tb.appendChild(tr);
  });
}

navActive();
renderDashboard();
renderCustomers("");
renderReminders();
renderReports();
