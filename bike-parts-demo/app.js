// Jilan Bike Parts — demo app logic (cash sales, sample data, browser-only)
const SEED_PARTS = [
  {id:1, name:"Brake Shoe Set", cat:"Brake", model:"CD70 / CG125", price:450, stock:42},
  {id:2, name:"Spark Plug", cat:"Engine", model:"CD70 / CG125", price:350, stock:60},
  {id:3, name:"Chain Sprocket Kit", cat:"Drive", model:"CD70", price:2200, stock:15},
  {id:4, name:"Clutch Plates Set", cat:"Engine", model:"CG125", price:2500, stock:9},
  {id:5, name:"Air Filter", cat:"Filters", model:"CD70 / CG125", price:300, stock:38},
  {id:6, name:"Engine Oil 1L", cat:"Filters", model:"Universal", price:850, stock:55},
  {id:7, name:"Front Shock Set", cat:"Suspension", model:"CD70", price:2800, stock:7},
  {id:8, name:"Rear Tyre", cat:"Tyre", model:"CD70", price:3200, stock:12},
  {id:9, name:"Tube", cat:"Tyre", model:"CD70 / CG125", price:650, stock:48},
  {id:10, name:"Dry Battery 12V", cat:"Electrical", model:"CD70 / CG125", price:2400, stock:6},
  {id:11, name:"LED Headlight", cat:"Electrical", model:"CD70 / CG125", price:1200, stock:20},
  {id:12, name:"Indicator Set (4 pc)", cat:"Electrical", model:"Universal", price:550, stock:25},
  {id:13, name:"Brake + Clutch Lever Set", cat:"Brake", model:"CD70 / CG125", price:350, stock:33},
  {id:14, name:"Piston Kit", cat:"Engine", model:"CD70", price:1800, stock:4},
  {id:15, name:"Silencer", cat:"Body", model:"CD70", price:3800, stock:8},
  {id:16, name:"Grip Set", cat:"Body", model:"Universal", price:400, stock:29},
  {id:17, name:"Side Mirror (Pair)", cat:"Body", model:"CD70 / CG125", price:450, stock:22},
  {id:18, name:"Carburetor", cat:"Engine", model:"CD70", price:2900, stock:5},
];
const PKEY = "jbp_parts_v1", CKEY = "jbp_cart", BKEY = "jbp_bills";
let parts, cart, bills;
try{
  const sp = localStorage.getItem(PKEY);
  parts = sp ? JSON.parse(sp) : SEED_PARTS;
  if(!sp) localStorage.setItem(PKEY, JSON.stringify(parts));
  cart = JSON.parse(localStorage.getItem(CKEY) || "[]");
  bills = JSON.parse(localStorage.getItem(BKEY) || "[]");
}catch(e){ parts = SEED_PARTS; cart = []; bills = []; }
function saveParts(){ try{ localStorage.setItem(PKEY, JSON.stringify(parts)); }catch(e){} }
function saveCart(){ try{ localStorage.setItem(CKEY, JSON.stringify(cart)); }catch(e){} }
function saveBills(){ try{ localStorage.setItem(BKEY, JSON.stringify(bills)); }catch(e){} }
const fmt = n => "Rs " + Number(n).toLocaleString("en-PK");
const dstr = d => d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
function partById(id){ return parts.find(p=>p.id===id); }
function stockPill(s){
  if(s <= 5) return '<span class="pill bad">Low Stock</span>';
  if(s <= 12) return '<span class="pill warn">Running Low</span>';
  return '<span class="pill ok">In Stock</span>';
}
function notice(msg){
  const el = document.getElementById("notice");
  if(!el) return;
  el.textContent = msg; el.style.display = "block";
  window.scrollTo({top:0, behavior:"smooth"});
}
function cartCount(){
  const el = document.getElementById("cartCount");
  if(el) el.textContent = cart.reduce((s,i)=>s + i.qty, 0);
}
function navActive(){
  const page = (location.pathname.split("/").pop() || "index.html").split("?")[0];
  document.querySelectorAll("nav a").forEach(a=>{
    if(a.getAttribute("href") === page) a.classList.add("active");
  });
}
function todayStr(){ return new Date().toISOString().slice(0,10); }

// ---------- Dashboard ----------
function renderDashboard(){
  const el = document.getElementById("dashCards"); if(!el) return;
  const low = parts.filter(p=>p.stock <= 5).length;
  const todayBills = bills.filter(b=>b.date === todayStr());
  const todayTotal = 18400 + todayBills.reduce((s,b)=>s + b.total, 0);
  el.innerHTML =
    '<div class="card"><h3>Total Parts</h3><div class="num">'+parts.length+'</div><div class="sub">In catalog (sample)</div></div>' +
    '<div class="card"><h3>Cash Sale Today</h3><div class="num">'+fmt(todayTotal)+'</div><div class="sub">Naqd sale (sample + saved demo bills)</div></div>' +
    '<div class="card red"><h3>Low Stock Items</h3><div class="num">'+low+'</div><div class="sub">Stock 5 ya kam</div></div>' +
    '<div class="card"><h3>Bills Today</h3><div class="num">'+(3 + todayBills.length)+'</div><div class="sub">Cash bills (sample)</div></div>';
  document.getElementById("lowList").innerHTML = parts.filter(p=>p.stock <= 5).map(p=>
    '<p><b>'+p.name+'</b> — '+p.model+' — stock <b>'+p.stock+'</b> — '+fmt(p.price)+'</p>').join("") || '<p>All items sufficiently stocked.</p>';
  document.getElementById("topList").innerHTML =
    '<p>1. Brake Shoe Set — 14 sold this week (sample)</p>' +
    '<p>2. Engine Oil 1L — 11 sold this week (sample)</p>' +
    '<p>3. Spark Plug — 9 sold this week (sample)</p>';
}

// ---------- Catalog ----------
let curCat = "All";
function renderParts(){
  const grid = document.getElementById("partsGrid"); if(!grid) return;
  const f = (document.getElementById("partsSearch") ? document.getElementById("partsSearch").value : "").toLowerCase();
  const list = parts.filter(p=>(curCat==="All" || p.cat===curCat) && (!f || p.name.toLowerCase().includes(f) || p.model.toLowerCase().includes(f)));
  grid.innerHTML = list.length ? list.map(p=>
    '<div class="item"><div class="ic">⚙️</div><h4>'+p.name+'</h4><p>'+p.cat+' • '+p.model+'</p>' +
    '<div class="price">'+fmt(p.price)+'</div><p>Stock: <b>'+p.stock+'</b> '+stockPill(p.stock)+'</p>' +
    '<p style="margin-top:10px"><button class="btn small" onclick="addToCart('+p.id+')">Add to Bill</button></p></div>').join("")
    : '<p>No parts match your search.</p>';
}
function setCat(cat, btn){
  curCat = cat;
  document.querySelectorAll(".catbar button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  renderParts();
}
function addToCart(id){
  const line = cart.find(i=>i.id===id);
  if(line) line.qty++;
  else cart.push({id:id, qty:1});
  saveCart(); cartCount();
  notice(partById(id).name + " bill me add ho gaya. Billing page par ja kar bill mukammal karein.");
}

// ---------- Billing ----------
function cartTotal(){
  return cart.reduce((s,i)=>s + partById(i.id).price * i.qty, 0);
}
function renderBilling(){
  const tb = document.querySelector("#billTable tbody"); if(!tb) return;
  if(!cart.length){ tb.innerHTML = '<tr><td colspan="5">Bill khali hai. Parts page se items add karein.</td></tr>'; }
  else{
    tb.innerHTML = cart.map(i=>{
      const p = partById(i.id);
      return '<tr><td>'+p.name+'</td><td>'+fmt(p.price)+'</td>' +
        '<td><button class="qtybtn" onclick="chQty('+p.id+',-1)">−</button> <b>'+i.qty+'</b> <button class="qtybtn" onclick="chQty('+p.id+',1)">+</button></td>' +
        '<td>'+fmt(p.price * i.qty)+'</td>' +
        '<td><button class="btn small dark" onclick="rmItem('+p.id+')">Remove</button></td></tr>';
    }).join("");
  }
  updateBillTotal();
}
function chQty(id, d){
  const line = cart.find(i=>i.id===id); if(!line) return;
  line.qty += d;
  if(line.qty <= 0) cart = cart.filter(i=>i.id!==id);
  saveCart(); cartCount(); renderBilling();
}
function rmItem(id){
  cart = cart.filter(i=>i.id!==id);
  saveCart(); cartCount(); renderBilling();
}
function updateBillTotal(){
  const el = document.getElementById("billTotal"); if(!el) return;
  const sub = cartTotal();
  const disc = +document.getElementById("discInput").value || 0;
  el.innerHTML = '<p>Subtotal: <b>'+fmt(sub)+'</b></p><p>Discount: <b>'+fmt(disc)+'</b></p><p style="font-size:18px">Total (Cash): <b>'+fmt(Math.max(0, sub - disc))+'</b></p>';
}
function saveBill(){
  if(!cart.length){ notice("Pehle bill me koi item add karein."); return; }
  const sub = cartTotal();
  const disc = +document.getElementById("discInput").value || 0;
  const total = Math.max(0, sub - disc);
  const items = cart.map(i=>({name:partById(i.id).name, qty:i.qty, price:partById(i.id).price}));
  cart.forEach(i=>{ const p = partById(i.id); p.stock = Math.max(0, p.stock - i.qty); });
  const billNo = "B-" + String(1001 + bills.length);
  bills.unshift({no:billNo, date:todayStr(), items:items, total:total});
  cart = [];
  saveParts(); saveCart(); saveBills(); cartCount(); renderBilling();
  const slip = document.getElementById("billSlip");
  slip.style.display = "block";
  slip.innerHTML = '<h3>Cash Bill — '+billNo+'</h3><p>Date: '+dstr(new Date())+' &nbsp;|&nbsp; Payment: <b>Cash (Naqd)</b></p>' +
    items.map(it=>'<p>'+it.name+' x '+it.qty+' — '+fmt(it.price * it.qty)+'</p>').join("") +
    '<p style="font-size:18px;margin-top:8px">Total: <b>'+fmt(total)+'</b></p><p style="color:#2e7d32"><b>Bill save ho gaya. Stock update ho gaya hai.</b></p>';
  notice("Bill " + billNo + " save ho gaya. Total " + fmt(total) + " (Cash).");
}

// ---------- Stock ----------
function renderStock(){
  const tb = document.querySelector("#stockTable tbody"); if(!tb) return;
  tb.innerHTML = parts.map(p=>
    '<tr><td>'+p.name+'</td><td>'+p.cat+'</td><td>'+p.model+'</td><td>'+fmt(p.price)+'</td><td><b>'+p.stock+'</b> '+stockPill(p.stock)+'</td>' +
    '<td><button class="btn small" onclick="addStock('+p.id+')">+10 Stock</button></td></tr>').join("");
}
function addStock(id){
  const p = partById(id); if(!p) return;
  p.stock += 10; saveParts(); renderStock();
  notice(p.name + " ka stock 10 barha diya gaya. Ab stock " + p.stock + " hai.");
}

// ---------- Reports ----------
function renderReports(){
  const el = document.getElementById("repTotals"); if(!el) return;
  const todayBills = bills.filter(b=>b.date === todayStr());
  const todayTotal = 18400 + todayBills.reduce((s,b)=>s + b.total, 0);
  el.innerHTML =
    '<div class="card"><h3>Cash Sale Today</h3><div class="num">'+fmt(todayTotal)+'</div></div>' +
    '<div class="card"><h3>Saved Demo Bills</h3><div class="num">'+bills.length+'</div></div>' +
    '<div class="card"><h3>Total Parts</h3><div class="num">'+parts.length+'</div></div>';
  const tb = document.querySelector("#repTable tbody");
  const rows = bills.map(b=>'<tr><td>'+b.no+'</td><td>'+dstr(new Date(b.date))+'</td><td>'+b.items.map(i=>i.name+' x '+i.qty).join(", ")+'</td><td>'+fmt(b.total)+'</td><td>Cash</td></tr>').join("");
  tb.innerHTML = rows || '<tr><td colspan="5">Abhi koi saved demo bill nahi hai. Billing page se bill save karein.</td></tr>';
}

navActive();
cartCount();
renderDashboard();
renderParts();
renderBilling();
renderStock();
renderReports();
