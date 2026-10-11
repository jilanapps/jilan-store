/* Jilan Homeo Store Software v1.0 — DESKTOP-STYLE DEMO (web)
   Simulates Windows billing software. Data in localStorage (demo). */
"use strict";
var LS='jhsw_';
var POTS=['30C','200C','1M','10M','Q'];
var SEED=[
["Arnica Montana","Pain/Injury",120,180,350,600,250],
["Belladonna","Fever/Flu",110,170,340,580,240],
["Nux Vomica","Digestive",110,170,340,580,240],
["Sulphur","Skin",110,170,340,580,240],
["Calcarea Carbonica","General",120,180,350,600,250],
["Lycopodium Clavatum","Digestive",130,190,360,620,260],
["Pulsatilla Nigricans","Women/Children",110,170,340,580,240],
["Rhus Toxicodendron","Pain/Injury",110,170,340,580,240],
["Bryonia Alba","Fever/Flu",110,170,340,580,240],
["Aconitum Napellus","Fever/Flu",110,170,340,580,240],
["Arsenicum Album","Digestive",110,170,340,580,240],
["Calendula Officinalis","Skin",130,190,360,620,260],
["Hypericum Perforatum","Pain/Injury",120,180,350,600,250],
["Ledum Palustre","Pain/Injury",110,170,340,580,240],
["Gelsemium","Fever/Flu",110,170,340,580,240],
["Chamomilla","Children",110,170,340,580,240],
["Cocculus Indicus","General",110,170,340,580,240],
["Ignatia Amara","General",110,170,340,580,240],
["Kali Phosphoricum","General",120,180,350,600,250],
["Phosphorus","Respiratory",120,180,350,600,250],
["Silicea","Skin",110,170,340,580,240],
["Hepar Sulphuris","Skin",110,170,340,580,240],
["Mercurius Solubilis","General",110,170,340,580,240],
["Natrum Muriaticum","General",110,170,340,580,240],
["Sepia Officinalis","Women",130,190,360,620,260],
["Thuja Occidentalis","Skin",110,170,340,580,240],
["Graphites","Skin",110,170,340,580,240],
["Petroleum","Skin",110,170,340,580,240],
["Mezereum","Skin",120,180,350,600,250],
["Rhus Venanata","Skin",110,170,340,580,240],
["Dulcamara","Pain/Injury",110,170,340,580,240],
["Colocynthis","Digestive",110,170,340,580,240],
["Dioscorea Villosa","Digestive",120,180,350,600,250],
["Carbo Vegetabilis","Digestive",110,170,340,580,240],
["Lycopodium Spore","Digestive",110,170,340,580,240],
["Chelidonium Majus","Digestive",120,180,350,600,250],
["Carduus Marianus","Digestive",120,180,350,600,250],
["China Officinalis","General",110,170,340,580,240],
["Ferrum Phosphoricum","Fever/Flu",110,170,340,580,240],
["Kali Muriaticum","Fever/Flu",110,170,340,580,240],
["Calcarea Phosphorica","Children",120,180,350,600,250],
["Baryta Carbonica","Children",110,170,340,580,240],
["Cina Maritima","Children",110,170,340,580,240],
["Santoninum","Children",110,170,340,580,240],
["Teucrium Marum","Children",120,180,350,600,250],
["Spigelia Anthelmia","Pain/Injury",120,180,350,600,250],
["Kalmia Latifolia","Pain/Injury",110,170,340,580,240],
["Rhododendron","Pain/Injury",110,170,340,580,240],
["Causticum","General",110,170,340,580,240],
["Conium Maculatum","General",120,180,350,600,250],
["Sarsaparilla","Skin",110,170,340,580,240],
["Millefolium","General",110,170,340,580,240],
["Kali Bichromicum","Respiratory",110,170,340,580,240],
["Spongia Tosta","Respiratory",110,170,340,580,240],
["Drosera Rotundifolia","Respiratory",110,170,340,580,240],
["Ipecacuanha","Respiratory",110,170,340,580,240]
];

/* ---------- storage ---------- */
function load(k,d){try{var v=localStorage.getItem(LS+k);return v?JSON.parse(v):d}catch(e){return d}}
function save(k,v){try{localStorage.setItem(LS+k,JSON.stringify(v))}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function rs(n){return 'Rs '+Number(n||0).toLocaleString('en-PK')}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function uid(p){return p+'-'+Date.now().toString(36)+Math.floor(Math.random()*99)}

var DB={products:[],bills:[],customers:[]};
function seedIfEmpty(){
  DB.products=load('products',[]);
  DB.bills=load('bills',[]);
  DB.customers=load('customers',[]);
  if(!DB.products.length){
    DB.products=SEED.map(function(r,i){
      var prices={},stock={};
      POTS.forEach(function(p,j){prices[p]=r[2+j];stock[p]=20+((i*7+j*3)%40)});
      return {id:'p'+i,name:r[0],cat:r[1],prices:prices,stock:stock,min:10};
    });
    save('products',DB.products);
  }
}
function persist(){save('products',DB.products);save('bills',DB.bills);save('customers',DB.customers)}

/* ---------- nav ---------- */
function showView(v){
  document.querySelectorAll('.view').forEach(function(e){e.style.display='none'});
  document.getElementById('v-'+v).style.display='block';
  if(v==='dashboard')renderDashboard();
  if(v==='billing')renderBillSearch();
  if(v==='vouchers')renderVouchers();
  if(v==='inventory')renderInventory();
  if(v==='customers')renderCustomers();
  if(v==='reports')renderReports();
}
function tick(){var d=new Date();document.getElementById('st-clock').textContent=d.toLocaleDateString('en-PK',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});}

/* ---------- dashboard ---------- */
function prodCount(){var n=0;DB.products.forEach(function(p){POTS.forEach(function(t){n+=p.stock[t]||0})});return n}
function lowList(){var out=[];DB.products.forEach(function(p){POTS.forEach(function(t){if((p.stock[t]||0)<=(p.min||10))out.push({p:p,t:t,s:p.stock[t]||0})})});return out}
function billsOn(date){return DB.bills.filter(function(b){return b.date===date})}
function renderDashboard(){
  document.getElementById('dash-date').textContent='— '+new Date().toLocaleDateString('en-PK',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var tb=billsOn(todayStr()),ts=tb.reduce(function(a,b){return a+b.total},0);
  var low=lowList();
  var stockVal=0;DB.products.forEach(function(p){POTS.forEach(function(t){stockVal+=(p.stock[t]||0)*(p.prices[t]||0)*0.6})});
  document.getElementById('dash-cards').innerHTML=
    card("🧾 Today's Bills",tb.length)+
    card("💰 Today's Sales",rs(ts))+
    card("📦 Products in Stock",prodCount())+
    card("⚠️ Low Stock",low.length,'warn')+
    card("👥 Customers",DB.customers.length)+
    card("💵 Stock Value (est.)",rs(Math.round(stockVal)));
  document.getElementById('dash-lowstock').innerHTML=low.length?low.slice(0,8).map(function(l){
    return '<div>⚠️ <b>'+esc(l.p.name)+'</b> ('+l.t+') — <span class="'+(l.s===0?'out':'low')+'">'+l.s+' left</span></div>'}).join('')
    :'<div class="ok">✅ All stock OK</div>';
  var rb=DB.bills.slice(-6).reverse();
  document.getElementById('dash-recent').innerHTML=rb.length?rb.map(function(b){
    return '<div>🧾 <b>'+esc(b.no)+'</b> — '+esc(b.customer)+' — <b>'+rs(b.total)+'</b> <span style="color:#777">'+esc(b.date)+'</span></div>'}).join('')
    :'<div style="color:#777">No bills yet. Create one from Billing.</div>';
}
function card(lbl,val,cls){return '<div class="card '+(cls||'')+'"><div class="lbl">'+lbl+'</div><div class="val">'+val+'</div></div>'}

/* ---------- billing ---------- */
var BILL={items:[]};
function findProd(id){return DB.products.find(function(p){return p.id===id})}
function renderBillSearch(){
  var q=(document.getElementById('bill-search').value||'').toLowerCase();
  var res=DB.products.filter(function(p){return !q||p.name.toLowerCase().indexOf(q)>=0||p.cat.toLowerCase().indexOf(q)>=0}).slice(0,30);
  document.getElementById('bill-search-results').innerHTML=res.map(function(p){
    var opts=POTS.map(function(t){var s=p.stock[t]||0;return '<option value="'+t+'"'+(s<=0?' disabled':'')+'>'+t+' — '+rs(p.prices[t])+(s<=0?' (out)':' ('+s+')')+'</option>'}).join('');
    return '<div class="sr-item"><div class="nm">'+esc(p.name)+'</div><div class="ct">'+esc(p.cat)+'</div>'+
      '<div style="margin-top:4px;display:flex;gap:6px"><select class="input sm" id="pot-'+p.id+'">'+opts+'</select>'+
      '<input type="number" class="input sm" style="width:60px" id="qty-'+p.id+'" value="1" min="1">'+
      '<button class="btn green small" onclick="addToBill(\''+p.id+'\')">➕ Add</button></div></div>';
  }).join('')||'<div style="padding:10px;color:#777">No medicines found.</div>';
}
function addToBill(pid){
  var p=findProd(pid);if(!p)return;
  var pot=document.getElementById('pot-'+pid).value;
  var qty=Math.max(1,parseInt(document.getElementById('qty-'+pid).value||'1',10));
  var st=p.stock[pot]||0;
  var ex=BILL.items.find(function(i){return i.pid===pid&&i.pot===pot});
  var cur=ex?ex.qty:0;
  if(cur+qty>st){alert('Only '+st+' in stock for '+p.name+' ('+pot+')');return}
  if(ex)ex.qty+=qty;else BILL.items.push({pid:pid,name:p.name,pot:pot,qty:qty,price:p.prices[pot]});
  renderBillItems();updateBillTotals();
}
function renderBillItems(){
  document.getElementById('bill-items').innerHTML=BILL.items.map(function(i,x){
    return '<tr><td>'+esc(i.name)+'</td><td>'+i.pot+'</td>'+
    '<td><input type="number" class="input sm" style="width:60px" value="'+i.qty+'" min="1" onchange="setBillQty('+x+',this.value)"></td>'+
    '<td>'+rs(i.price)+'</td><td>'+rs(i.qty*i.price)+'</td>'+
    '<td><button class="btn small" onclick="BILL.items.splice('+x+',1);renderBillItems();updateBillTotals()">✕</button></td></tr>';
  }).join('')||'<tr><td colspan="6" style="text-align:center;color:#777">Bill is empty — search and add medicines.</td></tr>';
}
function setBillQty(x,v){v=Math.max(1,parseInt(v||'1',10));var i=BILL.items[x];var p=findProd(i.pid);var st=p.stock[i.pot]||0;if(v>st){alert('Only '+st+' in stock');v=st}i.qty=v;renderBillItems();updateBillTotals()}
function billSubtotal(){return BILL.items.reduce(function(a,i){return a+i.qty*i.price},0)}
function updateBillTotals(){
  var sub=billSubtotal();
  var disc=Math.max(0,parseFloat(document.getElementById('bill-discount').value||'0'));
  if(disc>sub)disc=sub;
  var grand=sub-disc;
  var paid=Math.max(0,parseFloat(document.getElementById('bill-paid').value||'0'));
  document.getElementById('bill-subtotal').textContent=rs(sub);
  document.getElementById('bill-grand').textContent=rs(grand);
  document.getElementById('bill-balance').textContent=rs(grand-paid);
  return {sub:sub,disc:disc,grand:grand,paid:paid};
}
function clearBill(){BILL.items=[];document.getElementById('bill-customer').value='';document.getElementById('bill-phone').value='';document.getElementById('bill-discount').value=0;document.getElementById('bill-paid').value=0;document.getElementById('bill-preview').style.display='none';renderBillItems();updateBillTotals()}
function nextBillNo(){var n=DB.bills.length+1;return 'JV-'+String(n).padStart(4,'0')}
function saveBill(){
  if(!BILL.items.length){alert('Bill is empty — add medicines first.');return}
  var t=updateBillTotals();
  var cust=(document.getElementById('bill-customer').value||'').trim()||'Walk-in Customer';
  var phone=(document.getElementById('bill-phone').value||'').trim();
  var bill={no:nextBillNo(),date:todayStr(),time:new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'}),customer:cust,phone:phone,
    items:BILL.items.map(function(i){return {name:i.name,pot:i.pot,qty:i.qty,price:i.price,total:i.qty*i.price}}),
    subtotal:t.sub,discount:t.disc,total:t.grand,paid:Math.min(t.paid,t.grand),balance:t.grand-Math.min(t.paid,t.grand)};
  /* stock decrease */
  var ok=true;
  bill.items.forEach(function(i){var p=DB.products.find(function(x){return x.name===i.name});if(p){p.stock[i.pot]=(p.stock[i.pot]||0)-i.qty;if(p.stock[i.pot]<0){p.stock[i.pot]=0;ok=false}}});
  DB.bills.push(bill);
  /* customer balance */
  if(bill.balance>0){var c=DB.customers.find(function(x){return x.name.toLowerCase()===cust.toLowerCase()});if(!c){c={id:uid('c'),name:cust,phone:phone,address:'',balance:0};DB.customers.push(c)}c.balance+=bill.balance}
  persist();
  document.getElementById('bill-preview').style.display='block';
  document.getElementById('bill-preview').innerHTML=billHTML(bill);
  document.getElementById('bill-preview').scrollIntoView({behavior:'smooth'});
  clearBillKeepPreview(bill);
  if(!ok)alert('Note: some stock hit zero.');
  renderDashboard();
}
function clearBillKeepPreview(bill){BILL.items=[];document.getElementById('bill-customer').value='';document.getElementById('bill-phone').value='';document.getElementById('bill-discount').value=0;document.getElementById('bill-paid').value=0;renderBillItems();updateBillTotals()}
/* part 2 — bill html, vouchers, inventory, customers, reports, print, backup, modals, init */
function billHTML(b){
  var rows=b.items.map(function(i){return '<tr><td>'+esc(i.name)+' ('+i.pot+')<br><small>x'+i.qty+' @ '+rs(i.price)+'</small></td><td class="tot">'+rs(i.total)+'</td></tr>'}).join('');
  return '<h3>💊 JILAN HOMEO STORE</h3><div class="shop">Homeopathic Medicines<br>Sale Voucher</div><hr>'+
  '<table><tr><td><b>Voucher:</b> '+esc(b.no)+'</td><td class="tot"><b>Date:</b> '+esc(b.date)+'</td></tr>'+
  '<tr><td><b>Customer:</b> '+esc(b.customer)+'</td><td class="tot">'+esc(b.time||'')+'</td></tr></table><hr>'+
  '<table>'+rows+'</table><hr>'+
  '<table><tr><td>Subtotal</td><td class="tot">'+rs(b.subtotal)+'</td></tr>'+
  '<tr><td>Discount</td><td class="tot">− '+rs(b.discount)+'</td></tr>'+
  '<tr><td><b>Grand Total</b></td><td class="tot"><b>'+rs(b.total)+'</b></td></tr>'+
  '<tr><td>Paid</td><td class="tot">'+rs(b.paid)+'</td></tr>'+
  '<tr><td><b>Balance</b></td><td class="tot"><b>'+rs(b.balance)+'</b></td></tr></table><hr>'+
  '<div class="center"><small>Thank you! Visit again.</small><br><small>⚠️ Consult a doctor before use.</small></div>'+
  '<div class="watermark">DEMO by Jilan Apps</div>'+
  '<div class="btn-row" style="justify-content:center"><button class="btn blue" onclick="printVoucher(\''+b.no+'\')">🖨️ Print</button></div>';
}
function printBillPreview(){
  var pv=document.getElementById('bill-preview');
  if(pv.style.display==='none'||!BILL.items.length&&!pv.innerHTML){alert('Nothing to print — save a bill first.');return}
  document.getElementById('print-area').innerHTML=pv.innerHTML;
  window.print();
}

/* ---------- vouchers ---------- */
function renderVouchers(){
  var f=document.getElementById('v-from').value,t=document.getElementById('v-to').value;
  var list=DB.bills.slice().reverse().filter(function(b){return(!f||b.date>=f)&&(!t||b.date<=t)});
  document.getElementById('voucher-list').innerHTML=list.map(function(b){
    return '<tr><td><b>'+esc(b.no)+'</b></td><td>'+esc(b.date)+'</td><td>'+esc(b.customer)+'</td><td>'+b.items.length+'</td>'+
    '<td>'+rs(b.total)+'</td><td>'+rs(b.paid)+'</td><td>'+(b.balance>0?'<span class="low">'+rs(b.balance)+'</span>':rs(0))+'</td>'+
    '<td><button class="btn blue small" onclick="viewVoucher(\''+b.no+'\')">👁 View</button> '+
    '<button class="btn gray small" onclick="printVoucher(\''+b.no+'\')">🖨️ Print</button></td></tr>';
  }).join('')||'<tr><td colspan="8" style="text-align:center;color:#777">No vouchers found.</td></tr>';
  document.getElementById('voucher-view').style.display='none';
}
function viewVoucher(no){
  var b=DB.bills.find(function(x){return x.no===no});if(!b)return;
  var v=document.getElementById('voucher-view');v.style.display='block';v.innerHTML=billHTML(b);v.scrollIntoView({behavior:'smooth'});
}
function printVoucher(no){
  var b=DB.bills.find(function(x){return x.no===no});if(!b)return;
  document.getElementById('print-area').innerHTML=billHTML(b).replace(/<div class="btn-row".*?<\/div>/s,'');
  window.print();
}

/* ---------- inventory ---------- */
function renderInventory(){
  var q=(document.getElementById('inv-search').value||'').toLowerCase();
  var list=DB.products.filter(function(p){return !q||p.name.toLowerCase().indexOf(q)>=0||p.cat.toLowerCase().indexOf(q)>=0});
  document.getElementById('inv-list').innerHTML=list.map(function(p){
    var st=POTS.map(function(t){var s=p.stock[t]||0;return t+': <b class="'+(s===0?'out':s<=p.min?'low':'ok')+'">'+s+'</b>'}).join(' | ');
    var pr=POTS.map(function(t){return t+':'+p.prices[t]}).join(' ');
    return '<tr><td><b>'+esc(p.name)+'</b></td><td>'+esc(p.cat)+'</td><td style="font-size:12px">'+st+'</td><td style="font-size:12px">'+pr+'</td>'+
    '<td>'+(lowList().some(function(l){return l.p.id===p.id})?'<span class="low">⚠️ Low</span>':'<span class="ok">OK</span>')+'</td>'+
    '<td><button class="btn green small" onclick="stockInOut(\''+p.id+'\',1)">➕ Stock</button> '+
    '<button class="btn gray small" onclick="openProductModal(\''+p.id+'\')">✏️</button></td></tr>';
  }).join('')||'<tr><td colspan="6" style="text-align:center;color:#777">No products.</td></tr>';
}
function stockInOut(pid,dir){
  var p=findProd(pid);if(!p)return;
  var t=prompt('Potency ('+POTS.join('/')+'):',POTS[0]);if(!t||POTS.indexOf(t)<0)return;
  var q=parseInt(prompt((dir>0?'Add':'Remove')+' quantity for '+p.name+' ('+t+'):',"10"),10);
  if(!(q>0))return;
  if(dir<0&&q>(p.stock[t]||0)){alert('Not enough stock');return}
  p.stock[t]=(p.stock[t]||0)+dir*q;persist();renderInventory();renderDashboard();
}
function openProductModal(pid){
  var p=pid?findProd(pid):{id:uid('p'),name:'',cat:'General',prices:{},stock:{},min:10};
  POTS.forEach(function(t){if(p.prices[t]==null)p.prices[t]=150;if(p.stock[t]==null)p.stock[t]=0});
  var rows=POTS.map(function(t){
    return '<div class="form-row"><label style="min-width:50px">'+t+'</label>'+
    '<input class="input" style="width:90px" id="pm-price-'+t+'" type="number" value="'+p.prices[t]+'" placeholder="Price">'+
    '<input class="input" style="width:90px" id="pm-stock-'+t+'" type="number" value="'+p.stock[t]+'" placeholder="Stock"></div>'}).join('');
  modal('<h3>'+(pid?'✏️ Edit Medicine':'➕ Add Medicine')+'</h3>'+
    '<div class="form-row"><label style="min-width:110px">Name</label><input class="input" id="pm-name" value="'+esc(p.name)+'"></div>'+
    '<div class="form-row"><label style="min-width:110px">Category</label><input class="input" id="pm-cat" value="'+esc(p.cat)+'"></div>'+
    '<div class="form-row"><label style="min-width:110px">Min stock</label><input class="input" id="pm-min" type="number" value="'+(p.min||10)+'"></div>'+
    rows+
    '<div class="btn-row"><button class="btn green" onclick="saveProductModal(\''+p.id+'\','+(pid?1:0)+')">💾 Save</button>'+
    '<button class="btn gray" onclick="closeModal()">Cancel</button></div>');
}
function saveProductModal(id,isEdit){
  var name=document.getElementById('pm-name').value.trim();if(!name){alert('Name required');return}
  var p=isEdit?findProd(id):{id:id,prices:{},stock:{}};
  p.name=name;p.cat=document.getElementById('pm-cat').value.trim()||'General';p.min=parseInt(document.getElementById('pm-min').value||'10',10);
  POTS.forEach(function(t){p.prices[t]=parseFloat(document.getElementById('pm-price-'+t).value||'0');p.stock[t]=parseInt(document.getElementById('pm-stock-'+t).value||'0',10)});
  if(!isEdit)DB.products.push(p);
  persist();closeModal();renderInventory();renderDashboard();
}

/* ---------- customers ---------- */
function renderCustomers(){
  document.getElementById('cust-list').innerHTML=DB.customers.map(function(c){
    return '<tr><td><b>'+esc(c.name)+'</b></td><td>'+esc(c.phone||'—')+'</td><td>'+esc(c.address||'—')+'</td>'+
    '<td>'+(c.balance>0?'<span class="low">'+rs(c.balance)+'</span>':rs(0))+'</td>'+
    '<td><button class="btn green small" onclick="custPayment(\''+c.id+'\')">💰 Payment</button> '+
    '<button class="btn gray small" onclick="openCustomerModal(\''+c.id+'\')">✏️</button></td></tr>';
  }).join('')||'<tr><td colspan="5" style="text-align:center;color:#777">No customers yet. Balances appear here when a bill is saved unpaid.</td></tr>';
}
function openCustomerModal(cid){
  var c=cid?DB.customers.find(function(x){return x.id===cid}):{id:uid('c'),name:'',phone:'',address:'',balance:0};
  modal('<h3>'+(cid?'✏️ Edit':'➕ Add')+' Customer</h3>'+
    '<div class="form-row"><label style="min-width:110px">Name</label><input class="input" id="cm-name" value="'+esc(c.name)+'"></div>'+
    '<div class="form-row"><label style="min-width:110px">Phone</label><input class="input" id="cm-phone" value="'+esc(c.phone)+'"></div>'+
    '<div class="form-row"><label style="min-width:110px">Address</label><input class="input" id="cm-addr" value="'+esc(c.address)+'"></div>'+
    '<div class="btn-row"><button class="btn green" onclick="saveCustomerModal(\''+c.id+'\','+(cid?1:0)+')">💾 Save</button>'+
    '<button class="btn gray" onclick="closeModal()">Cancel</button></div>');
}
function saveCustomerModal(id,isEdit){
  var name=document.getElementById('cm-name').value.trim();if(!name){alert('Name required');return}
  var c=isEdit?DB.customers.find(function(x){return x.id===id}):{id:id,balance:0};
  c.name=name;c.phone=document.getElementById('cm-phone').value.trim();c.address=document.getElementById('cm-addr').value.trim();
  if(!isEdit)DB.customers.push(c);
  persist();closeModal();renderCustomers();
}
function custPayment(cid){
  var c=DB.customers.find(function(x){return x.id===cid});if(!c)return;
  var amt=parseFloat(prompt('Payment received from '+c.name+' (balance '+rs(c.balance)+'):','0'),10);
  if(!(amt>0))return;
  c.balance=Math.max(0,c.balance-amt);persist();renderCustomers();renderDashboard();
  alert('Payment recorded. New balance: '+rs(c.balance));
}

/* ---------- reports ---------- */
function renderReports(){
  var f=document.getElementById('r-from').value||'2000-01-01',t=document.getElementById('r-to').value||'2100-12-31';
  var list=DB.bills.filter(function(b){return b.date>=f&&b.date<=t});
  var sales=list.reduce(function(a,b){return a+b.total},0);
  var cogs=list.reduce(function(a,b){return a+b.items.reduce(function(x,i){return x+i.qty*i.price*0.6},0)},0);
  var profit=sales-cogs;
  var stockVal=0;DB.products.forEach(function(p){POTS.forEach(function(t2){stockVal+=(p.stock[t2]||0)*(p.prices[t2]||0)*0.6})});
  document.getElementById('report-cards').innerHTML=
    card('🧾 Bills',list.length)+card('💰 Total Sales',rs(Math.round(sales)))+
    card('📉 COGS (est.)',rs(Math.round(cogs)))+card('📈 Gross Profit (est.)',rs(Math.round(profit)))+
    card('💵 Stock Value (est.)',rs(Math.round(stockVal)));
  var byDate={};
  list.forEach(function(b){byDate[b.date]=(byDate[b.date]||0)+b.total});
  var days=Object.keys(byDate).sort();
  document.getElementById('report-daily').innerHTML=days.length?days.map(function(d){
    var v=byDate[d],w=Math.min(100,Math.round(v/Math.max.apply(null,days.map(function(k){return byDate[k]}))*100));
    return '<div style="display:flex;gap:8px;align-items:center;margin:4px 0"><span style="width:100px">'+d+'</span>'+
    '<div style="background:#c8e6c9;height:18px;border-radius:3px;width:'+w+'%"></div><b>'+rs(v)+'</b></div>'}).join('')
    :'<div style="color:#777">No sales in range.</div>';
}

/* ---------- modal / backup / init ---------- */
function modal(html){document.getElementById('modal-body').innerHTML=html;document.getElementById('modal').style.display='flex'}
function closeModal(){document.getElementById('modal').style.display='none'}
function backupData(){
  var blob=new Blob([JSON.stringify({products:DB.products,bills:DB.bills,customers:DB.customers},null,1)],{type:'application/json'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='homeo-software-backup-'+todayStr()+'.json';a.click();
  alert('Backup downloaded.');
}
document.getElementById('modal').addEventListener('click',function(e){if(e.target.id==='modal')closeModal()});
seedIfEmpty();tick();setInterval(tick,30000);showView('dashboard');
