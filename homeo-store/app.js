/* Jilan Homeo Store — demo app (localStorage, DEMO by Jilan Apps) */
"use strict";
var LANG = localStorage.getItem('jhs_lang') || 'ur';
var POTS = ['30C','200C','1M','10M','Q'];

var T = {
  ur:{home:'ہوم',billing:'بل',sales:'فروخت',stock:'اسٹاک',admin:'ایڈمن',appName:'جیلان ہومیو اسٹور',appSub:'ہومیو پیتھک دواؤں کی دکان',search:'🔍 دوا تلاش کریں / Search medicine…',all:'تمام',newBill:'🧾 نیا بل / New Bill',salesH:'📋 فروخت کی تاریخ / Sales History',stockT:'📦 اسٹاک / Inventory',adminT:'🔐 ایڈمن / Admin',addMed:'➕ نئی دوا',confirm:'✅ بل کنفرم کریں / Confirm Bill',wa:'📱 WhatsApp پر بھیجیں',print:'🖨️ پرنٹ / Print',cust:'گاہک کا نام / Customer',disc:'رعایت (Rs) / Discount',paid:'وصول (Rs) / Paid',demo:'نمونہ ڈیٹا، صرف ڈیمو',login:'لاگ اِن',logout:'لاگ آؤٹ',user:'یوزر',pass:'پاس ورڈ',dash:'ڈیش بورڈ',todaySales:"آج کی فروخت",lowStock:'کم اسٹاک',totalMeds:'کل ادویات',totalSales:'کل فروخت',meds:'ادویات',reports:'رپورٹس',addStock:'اسٹاک شامل کریں',qty:'مقدار',price:'قیمت (Rs)',save:'محفوظ کریں',cancel:'منسوخ',del:'حذف کریں',edit:'ترمیم',expiry:'ایکسپائری',noRes:'کوئی نتیجہ نہیں',empty:'بل خالی ہے — پہلے دوا شامل کریں',added:'بل میں شامل ✓',billDone:'بل محفوظ! نمبر: ',stockLow:'کم اسٹاک!',out:'ختم',inStock:'دستیاب',disclaimer:'⚠️ یہ ڈیمو ہے۔ دوا ڈاکٹر کے مشورے سے لیں۔'},
  en:{home:'Home',billing:'Bill',sales:'Sales',stock:'Stock',admin:'Admin',appName:'Jilan Homeo Store',appSub:'Homeopathic Medicine Shop',search:'🔍 Search medicine…',all:'All',newBill:'🧾 New Bill',salesH:'📋 Sales History',stockT:'📦 Inventory',adminT:'🔐 Admin',addMed:'➕ Add Medicine',confirm:'✅ Confirm Bill',wa:'📱 Send on WhatsApp',print:'🖨️ Print',cust:'Customer Name',disc:'Discount (Rs)',paid:'Paid (Rs)',demo:'Sample data, demo only',login:'Login',logout:'Logout',user:'Username',pass:'Password',dash:'Dashboard',todaySales:"Today's Sales",lowStock:'Low Stock',totalMeds:'Total Medicines',totalSales:'Total Sales',meds:'Medicines',reports:'Reports',addStock:'Add Stock',qty:'Qty',price:'Price (Rs)',save:'Save',cancel:'Cancel',del:'Delete',edit:'Edit',expiry:'Expiry',noRes:'No results',empty:'Bill is empty — add medicines first',added:'Added to bill ✓',billDone:'Bill saved! No: ',stockLow:'Low stock!',out:'Out',inStock:'Available',disclaimer:'⚠️ This is a demo. Consult a doctor before use.'}
};
function t(k){ return (T[LANG]&&T[LANG][k])||T.en[k]||k; }

/* ---------- Medicine catalog: [name, category, base30C, base200C, base1M, base10M, baseQ] ---------- */
var MEDS = [
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
["Phosphorus","Respiratory",130,190,360,620,260],
["Silicea","Skin",120,180,350,600,250],
["Natrum Muriaticum","General",110,170,340,580,240],
["Sepia","Women",120,180,350,600,250],
["Ignatia Amara","General",110,170,340,580,240],
["Gelsemium Sempervirens","Fever/Flu",110,170,340,580,240],
["Chamomilla","Children",110,170,340,580,240],
["Colocynthis","Digestive",110,170,340,580,240],
["Hypericum Perforatum","Pain/Injury",120,180,350,600,250],
["Calendula Officinalis","Mother Tincture",0,0,0,0,280],
["Thuja Occidentalis","Skin",120,180,350,600,250],
["Hepar Sulphur","Respiratory",110,170,340,580,240],
["Mercurius Solubilis","General",120,180,350,600,250],
["Nitricum Acidum","Skin",110,170,340,580,240],
["Graphites","Skin",120,180,350,600,250],
["Petroleum","Skin",110,170,340,580,240],
["Antimonium Crudum","Digestive",110,170,340,580,240],
["Ipecacuanha","Respiratory",110,170,340,580,240],
["Carbo Vegetabilis","Digestive",110,170,340,580,240],
["China Officinalis","General",110,170,340,580,240],
["Ferrum Phosphoricum","Fever/Flu",110,170,340,580,240],
["Kali Phosphoricum","General",110,170,340,580,240],
["Magnesia Phosphorica","Pain/Injury",110,170,340,580,240],
["Calcarea Phosphorica","Children",110,170,340,580,240],
["Euphrasia Officinalis","General",110,170,340,580,240],
["Allium Cepa","Respiratory",110,170,340,580,240],
["Dulcamara","Skin",110,170,340,580,240],
["Causticum","Pain/Injury",120,180,350,600,250],
["Staphysagria","General",120,180,350,600,250],
["Cantharis","General",110,170,340,580,240],
["Apis Mellifica","Skin",110,170,340,580,240],
["Ledum Palustre","Pain/Injury",110,170,340,580,240],
["Ruta Graveolens","Pain/Injury",110,170,340,580,240],
["Symphytum Officinale","Pain/Injury",120,180,350,600,250],
["Hamamelis Virginiana","Mother Tincture",0,0,0,0,300],
["Berberis Vulgaris","Mother Tincture",0,0,0,0,300],
["Urtica Urens","Mother Tincture",0,0,0,0,280],
["Fucus Vesiculosus","Mother Tincture",0,0,0,0,320],
["Phytolacca Decandra","General",110,170,340,580,240],
["Cocculus Indicus","General",110,170,340,580,240],
["Sarsaparilla","Skin",110,170,340,580,240],
["Millefolium","General",110,170,340,580,240],
["Kali Bichromicum","Respiratory",110,170,340,580,240],
["Spongia Tosta","Respiratory",110,170,340,580,240]
];
var CATS = ["Pain/Injury","Fever/Flu","Digestive","Skin","Respiratory","Women","Children","Women/Children","General","Mother Tincture"];

/* ---------- DB (localStorage, demo) ---------- */
var DBK = 'jhs_db_v1';
function loadDB(){ try{ var d = JSON.parse(localStorage.getItem(DBK)); if(d && d.meds) return d; }catch(e){} return null; }
function saveDB(){ try{ localStorage.setItem(DBK, JSON.stringify(DB)); }catch(e){} }
function seedDB(){
  var meds = MEDS.map(function(m,i){
    var pots = {};
    POTS.forEach(function(p,pi){
      var price = m[2+pi];
      if(price>0) pots[p] = {price:price, stock: 20+((i*7+pi*3)%30), expiry:''};
    });
    return {id:'m'+i, name:m[0], cat:m[1], pots:pots, min:5, archived:false};
  });
  return {meds:meds, sales:[], seq:1000, admin:{u:'admin',p:'jilan123'}, wa:''};
}
var DB = loadDB() || seedDB(); saveDB();

/* ---------- UI helpers ---------- */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function toast(m){ var el=$('toast'); el.textContent=m; el.style.display='block'; clearTimeout(el._t); el._t=setTimeout(function(){el.style.display='none';},1800); }
function modal(html){ $('modalBox').innerHTML=html; $('modalBg').classList.add('on'); }
function closeModal(){ $('modalBg').classList.remove('on'); }
$('modalBg').addEventListener('click', function(e){ if(e.target===$('modalBg')) closeModal(); });

function toggleLang(){ LANG = LANG==='ur'?'en':'ur'; localStorage.setItem('jhs_lang',LANG); applyLang(); updateDemoStrip(); }
function applyLang(){
  document.documentElement.lang = LANG; document.documentElement.dir = LANG==='ur'?'rtl':'ltr';
  $('appName').textContent = t('appName'); $('appSub').textContent = t('appSub');
  $('langBtn').textContent = LANG==='ur'?'EN':'اردو'; $('demoTxt').textContent = t('demo');
  $('q').placeholder = t('search');
  var nl = document.querySelectorAll('nav.bottom .nl');
  var keys=['home','billing','sales','stock','admin'];
  nl.forEach(function(el,i){ el.textContent = t(keys[i]); });
  $('tBill').textContent=t('newBill'); $('tSales').textContent=t('salesH');
  $('tStock').textContent=t('stockT'); $('tAdmin').textContent=t('adminT');
  $('btnAddMed').textContent=t('addMed'); $('btnConfirm').textContent=t('confirm');
  $('btnWA').textContent=t('wa'); $('btnPrint').textContent=t('print');
  $('lCust').textContent=t('cust'); $('lDisc').textContent=t('disc'); $('lPaid').textContent=t('paid');
  renderCatalog(); renderBill(); renderSales(); renderStock(); renderAdmin();
}
function go(v){
  document.querySelectorAll('.view').forEach(function(x){x.classList.remove('on');});
  document.querySelectorAll('nav.bottom button').forEach(function(x){x.classList.remove('on');});
  $('v-'+v).classList.add('on'); $('n-'+v).classList.add('on');
  window.scrollTo(0,0);
}

/* ---------- Catalog ---------- */
var selCat = 'all', selPot = {};
function potOf(m){ return selPot[m.id] || Object.keys(m.pots)[0]; }
function renderCatalog(){
  var q = ($('q').value||'').toLowerCase();
  var cats = ['all'].concat(CATS.filter(function(c){ return DB.meds.some(function(m){return !m.archived && m.cat===c;}); }));
  $('cats').innerHTML = cats.map(function(c){
    return '<button class="cat'+(selCat===c?' on':'')+'" onclick="selCat=\''+c.replace(/'/g,"")+'\';renderCatalog()">'+esc(c==='all'?t('all'):c)+'</button>';
  }).join('');
  var list = DB.meds.filter(function(m){
    if(m.archived) return false;
    if(selCat!=='all' && m.cat!==selCat) return false;
    if(q && m.name.toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  if(!list.length){ $('catalog').innerHTML='<div class="note">'+esc(t('noRes'))+'</div>'; return; }
  $('catalog').innerHTML = list.map(function(m){
    var pot = potOf(m), info = m.pots[pot];
    var pots = Object.keys(m.pots).map(function(p){
      return '<button class="pot'+(p===pot?' on':'')+'" onclick="selPot[\''+m.id+'\']=\''+p+'\';renderCatalog()">'+p+'</button>';
    }).join('');
    var st = info.stock<=0 ? '<span class="stock out">'+t('out')+'</span>'
      : info.stock<=m.min ? '<span class="stock low">'+t('stockLow')+' ('+info.stock+')</span>'
      : '<span class="stock ok">'+t('inStock')+' ('+info.stock+')</span>';
    return '<div class="card"><div class="mname">'+esc(m.name)+'</div>'+
      '<div class="muse">'+esc(m.cat)+'</div>'+
      '<div class="pot-row">'+pots+'</div>'+
      '<div class="price">Rs '+info.price+'</div><div>'+st+'</div>'+
      '<button class="btn btn-teal btn-block" '+(info.stock<=0?'disabled':'')+' onclick="addToBill(\''+m.id+'\')">'+(LANG==='ur'?'بل میں شامل ➕':'Add to Bill ➕')+'</button></div>';
  }).join('');
}

/* ---------- Billing ---------- */
var BILL = [];
function addToBill(mid){
  var m = DB.meds.find(function(x){return x.id===mid;}); if(!m) return;
  var pot = potOf(m);
  var ex = BILL.find(function(b){return b.mid===mid && b.pot===pot;});
  if(ex){ ex.qty++; } else { BILL.push({mid:mid, name:m.name, pot:pot, price:m.pots[pot].price, qty:1}); }
  updateBillCount(); renderBill(); toast(t('added'));
}
function updateBillCount(){ $('billCount').textContent = BILL.reduce(function(a,b){return a+b.qty;},0); }
function billMath(){
  var sub = BILL.reduce(function(a,b){return a+b.qty*b.price;},0);
  var disc = Math.max(0, Math.min(sub, parseFloat($('bDisc').value)||0));
  var paid = Math.max(0, parseFloat($('bPaid').value)||0);
  return {sub:sub, disc:disc, total:sub-disc, paid:paid, bal:Math.max(0, sub-disc-paid)};
}
function renderBill(){
  var m = billMath();
  $('billItems').innerHTML = BILL.length ? BILL.map(function(b,i){
    return '<div class="bill-item"><div class="grow"><b>'+esc(b.name)+'</b> <span class="badge" style="background:var(--teal-l);color:var(--teal-d)">'+b.pot+'</span><br><span class="price">Rs '+b.price+'</span></div>'+
    '<div class="qty"><button onclick="chQty('+i+',-1)">−</button><b>'+b.qty+'</b><button onclick="chQty('+i+',1)">+</button></div>'+
    '<button class="btn btn-danger" style="padding:6px 10px" onclick="rmBill('+i+')">✕</button></div>';
  }).join('') : '<div class="note">'+esc(t('empty'))+'</div>';
  $('billTotals').innerHTML =
    '<div class="row"><span>Subtotal</span><b>Rs '+m.sub+'</b></div>'+
    '<div class="row"><span>'+t('disc')+'</span><b>Rs '+m.disc+'</b></div>'+
    '<div class="row grand"><span>Total</span><b>Rs '+m.total+'</b></div>'+
    '<div class="row"><span>'+t('paid')+'</span><b>Rs '+m.paid+'</b></div>'+
    '<div class="row"><span>'+(LANG==='ur'?'باقی':'Balance')+'</span><b>Rs '+m.bal+'</b></div>';
}
function chQty(i,d){ BILL[i].qty=Math.max(1,BILL[i].qty+d); updateBillCount(); renderBill(); }
function rmBill(i){ BILL.splice(i,1); updateBillCount(); renderBill(); }

var LAST_BILL = null;
function confirmBill(){
  if(!BILL.length){ toast(t('empty')); return; }
  for(var i=0;i<BILL.length;i++){ var b=BILL[i];
    var m = DB.meds.find(function(x){return x.id===b.mid;});
    if(!m || !m.pots[b.pot] || m.pots[b.pot].stock < b.qty){ toast('⚠️ '+b.name+' ('+b.pot+'): '+(LANG==='ur'?'اسٹاک کم ہے':'low stock')); return; }
  }
  var mth = billMath();
  BILL.forEach(function(b){ var m=DB.meds.find(function(x){return x.id===b.mid;}); m.pots[b.pot].stock -= b.qty; });
  var sale = {no:'JHS-'+(++DB.seq), date:new Date().toISOString(), cust:($('bCust').value||'Walk-in').trim()||'Walk-in',
    items:JSON.parse(JSON.stringify(BILL)), sub:mth.sub, disc:mth.disc, total:mth.total, paid:mth.paid, bal:mth.bal};
  DB.sales.unshift(sale); saveDB();
  LAST_BILL = sale;
  BILL=[]; $('bDisc').value=0; $('bPaid').value=0; $('bCust').value='';
  updateBillCount(); renderBill(); renderSales(); renderStock(); renderCatalog();
  showReceipt(sale);
  toast(t('billDone')+sale.no);
}
function showReceipt(s){
  var lines = s.items.map(function(b){ return (b.name+' '+b.pot).padEnd(24,' ').slice(0,24)+' '+String(b.qty).padStart(3)+' x '+String(b.price).padStart(5)+' = '+String(b.qty*b.price).padStart(6); }).join('\n');
  var r = '*** '+t('appName')+' ***\n'+(LANG==='ur'?'ہومیو پیتھک دواؤں کی دکان':'Homeopathic Medicine Shop')+'\n'+
    (LANG==='ur'?'بل نمبر':'Bill No')+': '+s.no+'\n'+(LANG==='ur'?'تاریخ':'Date')+': '+new Date(s.date).toLocaleString()+'\n'+
    (LANG==='ur'?'گاہک':'Customer')+': '+s.cust+'\n--------------------------------\n'+lines+'\n--------------------------------\n'+
    'Subtotal: Rs '+s.sub+'\n'+t('disc')+': Rs '+s.disc+'\nTOTAL: Rs '+s.total+'\n'+t('paid')+': Rs '+s.paid+'\n'+
    (LANG==='ur'?'باقی':'Balance')+': Rs '+s.bal+'\n--------------------------------\n'+t('disclaimer')+'\n🏷️ DEMO by Jilan Apps';
  $('receiptWrap').innerHTML = '<div class="receipt">'+esc(r)+'</div>';
}
function printBill(){ if(!LAST_BILL){ toast('—'); return; } window.print(); }
function shareWA(){
  if(!LAST_BILL){ toast('—'); return; }
  var s=LAST_BILL;
  var msg = encodeURIComponent('🧾 *'+t('appName')+'*\n'+(LANG==='ur'?'بل نمبر':'Bill')+': '+s.no+'\nTotal: Rs '+s.total+'\n'+t('paid')+': Rs '+s.paid+'\n'+(LANG==='ur'?'شکریہ!':'Thank you!')+'\n🏷️ DEMO by Jilan Apps');
  var num = (DB.wa||'').replace(/\D/g,'');
  if(!num){ toast(LANG==='ur'?'WhatsApp نمبر سیٹ نہیں — ایڈمن میں شامل کریں':'WhatsApp number not set — add in Admin'); go('admin'); return; }
  window.open('https://wa.me/'+num+'?text='+msg,'_blank');
}

/* ---------- Sales history ---------- */
function renderSales(){
  var el = $('salesList');
  if(!DB.sales.length){ el.innerHTML='<div class="note">'+esc(t('noRes'))+'</div>'; return; }
  el.innerHTML = DB.sales.slice(0,50).map(function(s){
    return '<div class="bill-item" onclick=\'showReceipt('+JSON.stringify(s).replace(/'/g,"&#39;")+');go("billing")\' style="cursor:pointer">'+
      '<div class="grow"><b>'+esc(s.no)+'</b> — '+esc(s.cust)+'<br><small style="color:var(--muted)">'+new Date(s.date).toLocaleString()+' · '+s.items.length+' items</small></div>'+
      '<b class="price">Rs '+s.total+'</b></div>';
  }).join('');
}

/* ---------- Stock ---------- */
function renderStock(){
  var low = [];
  DB.meds.forEach(function(m){ Object.keys(m.pots).forEach(function(p){ if(!m.archived && m.pots[p].stock<=m.min) low.push({m:m,p:p,s:m.pots[p].stock}); }); });
  $('lowList').innerHTML = low.length ? '<div class="note" style="background:#fef3c7;border-color:#fde68a;color:#92400e">⚠️ '+t('lowStock')+': '+low.slice(0,8).map(function(x){return esc(x.m.name+' '+x.p+' ('+x.s+')');}).join('، ')+(low.length>8?'…':'')+'</div>' : '';
  $('stockList').innerHTML = '<table class="tbl"><tr><th>'+(LANG==='ur'?'دوا':'Medicine')+'</th><th>Pot</th><th>Rs</th><th>'+t('qty')+'</th><th></th></tr>'+
    DB.meds.filter(function(m){return !m.archived;}).map(function(m){
      return Object.keys(m.pots).map(function(p){
        var info=m.pots[p];
        var cls = info.stock<=0?'out':(info.stock<=m.min?'low':'ok');
        return '<tr><td>'+esc(m.name)+'</td><td>'+p+'</td><td>'+info.price+'</td>'+
          '<td class="stock '+cls+'">'+info.stock+'</td>'+
          '<td><button class="btn btn-ghost" style="padding:4px 8px;font-size:12px" onclick="addStockUI(\''+m.id+'\',\''+p+'\')">+</button></td></tr>';
      }).join('');
    }).join('')+'</table>';
}
function addStockUI(mid,pot){
  var m=DB.meds.find(function(x){return x.id===mid;});
  modal('<h3>'+t('addStock')+': '+esc(m.name)+' '+pot+'</h3><div class="form" style="margin:0">'+
    '<div><label>'+t('qty')+'</label><input id="as-q" type="number" value="10" min="1"></div>'+
    '<div><label>'+t('price')+'</label><input id="as-p" type="number" value="'+m.pots[pot].price+'" min="0"></div>'+
    '<div><label>'+t('expiry')+' (YYYY-MM)</label><input id="as-e" placeholder="2027-06"></div>'+
    '<button class="btn btn-teal btn-block" onclick="doAddStock(\''+mid+'\',\''+pot+'\')">'+t('save')+'</button>'+
    '<button class="btn btn-ghost btn-block" onclick="closeModal()">'+t('cancel')+'</button></div>');
}
function doAddStock(mid,pot){
  var m=DB.meds.find(function(x){return x.id===mid;});
  m.pots[pot].stock += Math.max(0,parseInt($('as-q').value)||0);
  m.pots[pot].price = Math.max(0,parseFloat($('as-p').value)||0);
  if($('as-e').value) m.pots[pot].expiry=$('as-e').value;
  saveDB(); closeModal(); renderStock(); renderCatalog(); toast('✓');
}
function openMedForm(mid){
  var m = mid ? DB.meds.find(function(x){return x.id===mid;}) : {id:'m'+Date.now(), name:'', cat:CATS[0], pots:{'30C':{price:120,stock:10,expiry:''}}, min:5, archived:false, _new:true};
  modal('<h3>'+(mid?t('edit'):t('addMed'))+'</h3><div class="form" style="margin:0">'+
    '<div><label>'+(LANG==='ur'?'نام':'Name')+'</label><input id="mf-n" value="'+esc(m.name)+'"></div>'+
    '<div><label>Category</label><select id="mf-c">'+CATS.map(function(c){return '<option'+(c===m.cat?' selected':'')+'>'+c+'</option>';}).join('')+'</select></div>'+
    '<div><label>'+(LANG==='ur'?'کم از کم اسٹاک':'Min stock')+'</label><input id="mf-m" type="number" value="'+m.min+'"></div>'+
    '<button class="btn btn-teal btn-block" onclick="saveMed(\''+m.id+'\','+(m._new?'1':'0')+')">'+t('save')+'</button>'+
    (mid?'<button class="btn btn-danger btn-block" onclick="delMed(\''+mid+'\')">'+t('del')+'</button>':'')+
    '<button class="btn btn-ghost btn-block" onclick="closeModal()">'+t('cancel')+'</button></div>');
}
function saveMed(id,isNew){
  var name=$('mf-n').value.trim(); if(!name){toast('!');return;}
  if(isNew){ DB.meds.push({id:id,name:name,cat:$('mf-c').value,pots:{'30C':{price:120,stock:10,expiry:''}},min:parseInt($('mf-m').value)||5,archived:false}); }
  else{ var m=DB.meds.find(function(x){return x.id===id;}); m.name=name; m.cat=$('mf-c').value; m.min=parseInt($('mf-m').value)||5; }
  saveDB(); closeModal(); renderStock(); renderCatalog(); toast('✓');
}
function delMed(id){ if(!confirm('?'))return; var m=DB.meds.find(function(x){return x.id===id;}); m.archived=true; saveDB(); closeModal(); renderStock(); renderCatalog(); }

/* ---------- Admin ---------- */
var ADMIN_OK = sessionStorage.getItem('jhs_admin')==='1';
function renderAdmin(){
  var el=$('adminBody');
  if(!ADMIN_OK){
    el.innerHTML='<div class="form"><div><label>'+t('user')+'</label><input id="a-u" value="admin"></div>'+
      '<div><label>'+t('pass')+'</label><input id="a-p" type="password" value=""></div>'+
      '<div class="note">Demo login: <b>admin / jilan123</b></div>'+
      '<button class="btn btn-teal btn-block" onclick="doLogin()">'+t('login')+'</button></div>';
    return;
  }
  var today=new Date().toDateString();
  var tSales=DB.sales.filter(function(s){return new Date(s.date).toDateString()===today;}).reduce(function(a,s){return a+s.total;},0);
  var allSales=DB.sales.reduce(function(a,s){return a+s.total;},0);
  var low=0; DB.meds.forEach(function(m){Object.keys(m.pots).forEach(function(p){if(!m.archived&&m.pots[p].stock<=m.min)low++;});});
  el.innerHTML='<div class="kpi-grid" style="padding:0 0 10px">'+
    '<div class="kpi"><div class="v">Rs '+tSales+'</div><div class="l">'+t('todaySales')+'</div></div>'+
    '<div class="kpi"><div class="v">'+DB.meds.filter(function(m){return !m.archived;}).length+'</div><div class="l">'+t('totalMeds')+'</div></div>'+
    '<div class="kpi"><div class="v">Rs '+allSales+'</div><div class="l">'+t('totalSales')+'</div></div>'+
    '<div class="kpi"><div class="v">'+low+'</div><div class="l">'+t('lowStock')+'</div></div></div>'+
    '<div class="form"><div><label>WhatsApp Number (e.g. 923007379385)</label><input id="a-wa" value="'+esc(DB.wa||'')+'" placeholder="92300xxxxxxx"></div>'+
    '<button class="btn btn-teal btn-block" onclick="DB.wa=$(\'a-wa\').value.trim();saveDB();toast(\'✓\')">'+t('save')+'</button>'+
    '<button class="btn btn-ghost btn-block" onclick="resetDemo()">'+(LANG==='ur'?'ڈیمو ڈیٹا ری سیٹ':'Reset Demo Data')+'</button>'+
    '<button class="btn btn-danger btn-block" onclick="sessionStorage.removeItem(\'jhs_admin\');ADMIN_OK=false;renderAdmin()">'+t('logout')+'</button></div>'+
    '<div class="note">'+t('disclaimer')+'<br>Data: localStorage (demo only, this device).</div>';
}
function doLogin(){
  if($('a-u').value.trim()==='admin' && $('a-p').value==='jilan123'){ ADMIN_OK=true; sessionStorage.setItem('jhs_admin','1'); renderAdmin(); }
  else toast('❌');
}
function resetDemo(){ if(!confirm('?'))return; localStorage.removeItem(DBK); DB=seedDB(); saveDB(); ADMIN_OK=false; sessionStorage.removeItem('jhs_admin'); applyLang(); toast('✓'); }

/* ---------- 3-DAY DEMO EXPIRY ---------- */
var DEMO_MS = 3 * 86400000;
function demoSince(){ try{ var v = localStorage.getItem('jhs_demo_since'); return v ? parseInt(v, 10) : 0; }catch(e){ return 0; } }
function ensureDemoSince(){ if (!demoSince()){ try{ localStorage.setItem('jhs_demo_since', String(Date.now())); }catch(e){} } }
function demoDaysLeft(){ var s = demoSince(); if (!s) return 3; var left = DEMO_MS - (Date.now() - s); return Math.max(0, Math.ceil(left / 86400000)); }
function demoExpired(){ var s = demoSince(); return s > 0 && (Date.now() - s) > DEMO_MS; }
function demoCountdownTxt(){ return '⏳ DEMO by Jilan Apps · ' + (LANG === 'ur' ? 'باقی: ' + demoDaysLeft() + ' دن' : demoDaysLeft() + ' day(s) left'); }
function updateDemoStrip(){ var ds = document.querySelector('.demo-strip'); if (ds) ds.innerHTML = '🏷️ ' + demoCountdownTxt() + ' — <span id="demoTxt">' + (LANG==='ur'?'نمونہ ڈیٹا، صرف ڈیمو':'Sample data, demo only') + '</span>'; }
function showDemoLock(){
  document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#101418;color:#fff;font-family:system-ui,Segoe UI,Arial;padding:24px;box-sizing:border-box">' +
    '<div style="max-width:380px;text-align:center">' +
    '<div style="font-size:52px;margin-bottom:12px">⏰</div>' +
    '<h2 style="margin:0 0 8px">' + (LANG === 'ur' ? 'ڈیمو ختم ہو گیا' : 'Demo expired') + '</h2>' +
    '<p style="color:#b9c2c9;line-height:1.6">' + (LANG === 'ur' ? '3 دن کا ڈیمو مکمل ہو گیا۔ مکمل ورژن کے لیے جیلان ایپس سے رابطہ کریں۔' : 'The 3-day demo has ended. Contact Jilan Apps for the full version.') + '</p>' +
    '<div style="display:inline-block;background:#0d7377;color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;margin-top:8px">🏷️ DEMO by Jilan Apps</div>' +
    '</div></div>';
}

/* ---------- init ---------- */
ensureDemoSince();
if (demoExpired()) { showDemoLock(); }
else { applyLang(); updateDemoStrip(); }
