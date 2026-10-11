/* Jilan Pizza Shop — DEMO by Jilan Apps (demo data, localStorage) */
"use strict";
var LANG = localStorage.getItem('jps_lang') || 'en';
var SIZES = [
  {id:'S', en:'Small 9"', ur:'چھوٹی 9 انچ'},
  {id:'M', en:'Medium 12"', ur:'درمیانی 12 انچ'},
  {id:'L', en:'Large 15"', ur:'بڑی 15 انچ'},
  {id:'F', en:'Family 18"', ur:'فیملی 18 انچ'}
];
var I18N = {
en:{tag:"Hot & Fresh Pizzas",heroT:"Fresh, Hot & Cheesy! 🍕",heroS:"Order your favorite pizzas in minutes",
deals:"Today's Deals",popular:"Popular Pizzas",cart:"Your Cart",checkout:"Proceed to Checkout →",checkoutT:"Checkout",
name:"Full Name *",mobile:"Mobile Number *",address:"Delivery Address *",otype:"Order Type",delivery:"🛵 Delivery",pickup:"🏃 Pickup",
pay:"Payment",cod:"💵 Cash on Delivery",payshop:"🏪 Pay at Shop",notes:"Notes (optional)",notesPh:"e.g. extra spicy, ring the bell",
place:"✅ Place Order",orders:"My Orders",searchPh:"Search pizzas, sides...",
nHome:"Home",nMenu:"Menu",nCart:"Cart",nOrders:"Orders",nAcc:"Account",
add:"Add",added:"Added to cart! 🛒",subtotal:"Subtotal",delFee:"Delivery Fee",free:"FREE",total:"Grand Total",
emptyCart:"Your cart is empty",emptyCartS:"Add some delicious pizzas!",
size:"Size",crust:"Crust",toppings:"Extra Toppings",qty:"Quantity",totalIs:"Total",
orderOk:"Order Placed! 🎉",orderNo:"Order Number",weCall:"We will call you shortly to confirm.",
waOrder:"📱 Order on WhatsApp",trackNote:"Save your order number to track it.",
catAll:"All",catPizza:"Pizzas",catSide:"Sides",catDrink:"Drinks",catDessert:"Desserts",catDeal:"Deals",
noMatch:"No items found. Try another search.",remove:"Remove",clearCart:"Clear Cart",
admin:"Admin Panel",adminLogin:"Admin Login",username:"Username",password:"Password",login:"Login",
logout:"Logout",demoCreds:"Demo login — user: admin / pass: jilan123",wrongLogin:"Wrong username or password!",
menuMgmt:"Menu Management",ordersAdm:"Orders",settings:"Settings",addItem:"＋ Add Item",
itemName:"Item name (EN)",itemNameUr:"Item name (UR)",priceS:"Small price",priceM:"Medium price",priceL:"Large price",priceF:"Family price",
price1:"Price (Rs)",category:"Category",save:"Save",cancel:"Cancel",del:"Delete",edit:"Edit",delSure:"Delete this item?",
status:"Status",stPending:"Pending",stPrep:"Preparing",stDone:"Delivered",stCancel:"Cancelled",
waNumber:"Shop WhatsApp Number",waHint:"e.g. 923001234567 (country code, no +). Empty = setup message shown.",
saveSet:"Save Settings",saved:"Saved! ✅",noOrders:"No orders yet.",needName:"Please enter your name.",needMobile:"Please enter a valid mobile number (03XX-XXXXXXX).",
needAddr:"Please enter delivery address.",orderType:"Delivery",pickupT:"Pickup",custInfo:"Customer Info",backHome:"← Back to Home",
viewOrder:"View",markSent:"Demo mode: WhatsApp not configured.",demoLock:"DEMO",pizza:"Pizza",side:"Side",drink:"Drink",dessert:"Dessert",deal:"Deal",
qtyShort:"Qty",orderEmpty:"Cart is empty!",invName:"Item",invQty:"Qty",invPrice:"Price",invTotal:"Total",invSub:"Subtotal",invDel:"Delivery",invGrand:"Grand Total",invThanks:"Thank you for ordering! 🙏"},
ur:{tag:"گرم اور تازہ پیزا",heroT:"تازہ، گرم اور چیز سے بھرپور! 🍕",heroS:"اپنا پسندیدہ پیزا منٹوں میں آرڈر کریں",
deals:"آج کی ڈیلز",popular:"مشہور پیزے",cart:"آپ کی ٹوکری",checkout:"آرڈر مکمل کریں →",checkoutT:"آرڈر کی تفصیل",
name:"پورا نام *",mobile:"موبائل نمبر *",address:"ڈیلیوری کا پتہ *",otype:"آرڈر کی قسم",delivery:"🛵 ڈیلیوری",pickup:"🏃 خود لیں",
pay:"ادائیگی",cod:"💵 کیش آن ڈیلیوری",payshop:"🏪 دکان پر ادائیگی",notes:"نوٹ (اختیاری)",notesPh:"مثلاً زیادہ مصالحہ، گھنٹی بجائیں",
place:"✅ آرڈر کریں",orders:"میرے آرڈرز",searchPh:"پیزا، سائیڈز تلاش کریں...",
nHome:"ہوم",nMenu:"مینیو",nCart:"ٹوکری",nOrders:"آرڈرز",nAcc:"اکاؤنٹ",
add:"شامل کریں",added:"ٹوکری میں شامل! 🛒",subtotal:"ذیلی رقم",delFee:"ڈیلیوری فیس",free:"مفت",total:"کل رقم",
emptyCart:"ٹوکری خالی ہے",emptyCartS:"کچھ مزیدار پیزے شامل کریں!",
size:"سائز",crust:"کرَسٹ",toppings:"اضافی ٹاپنگز",qty:"تعداد",totalIs:"کل",
orderOk:"آرڈر ہو گیا! 🎉",orderNo:"آرڈر نمبر",weCall:"ہم جلد کال کر کے تصدیق کریں گے۔",
waOrder:"📱 واٹس ایپ پر آرڈر کریں",trackNote:"آرڈر نمبر محفوظ کر لیں۔",
catAll:"سب",catPizza:"پیزے",catSide:"سائیڈز",catDrink:"مشروبات",catDessert:"میٹھے",catDeal:"ڈیلز",
noMatch:"کچھ نہیں ملا۔ دوبارہ تلاش کریں۔",remove:"ہٹائیں",clearCart:"ٹوکری صاف کریں",
admin:"ایڈمن پینل",adminLogin:"ایڈمن لاگ اِن",username:"یوزر نیم",password:"پاس ورڈ",login:"لاگ اِن",
logout:"لاگ آؤٹ",demoCreds:"ڈیمو لاگ اِن — یوزر: admin / پاس: jilan123",wrongLogin:"غلط یوزر نیم یا پاس ورڈ!",
menuMgmt:"مینیو مینجمنٹ",ordersAdm:"آرڈرز",settings:"سیٹنگز",addItem:"＋ نیا آئٹم",
itemName:"آئٹم کا نام (EN)",itemNameUr:"آئٹم کا نام (UR)",priceS:"چھوٹی قیمت",priceM:"درمیانی قیمت",priceL:"بڑی قیمت",priceF:"فیملی قیمت",
price1:"قیمت (روپے)",category:"کیٹیگری",save:"محفوظ کریں",cancel:"منسوخ",del:"حذف",edit:"ترمیم",delSure:"کیا یہ آئٹم حذف کریں؟",
status:"حیثیت",stPending:"زیر التواء",stPrep:"تیار ہو رہا",stDone:"ڈیلیور ہو گیا",stCancel:"منسوخ",
waNumber:"دکان کا واٹس ایپ نمبر",waHint:"مثلاً 923001234567 (کنٹری کوڈ، بغیر +)۔ خالی = سیٹ اپ پیغام۔",
saveSet:"سیٹنگز محفوظ کریں",saved:"محفوظ ہو گیا! ✅",noOrders:"ابھی کوئی آرڈر نہیں۔",needName:"براہ کرم نام لکھیں۔",needMobile:"درست موبائل نمبر لکھیں (03XX-XXXXXXX)۔",
needAddr:"ڈیلیوری کا پتہ لکھیں۔",orderType:"ڈیلیوری",pickupT:"پک اپ",custInfo:"کسٹمر کی معلومات",backHome:"← ہوم پر واپس",
viewOrder:"دیکھیں",markSent:"ڈیمو موڈ: واٹس ایپ نمبر سیٹ نہیں۔",demoLock:"DEMO",pizza:"پیزا",side:"سائیڈ",drink:"مشروب",dessert:"میٹھا",deal:"ڈیل",
qtyShort:"تعداد",orderEmpty:"ٹوکری خالی ہے!",invName:"آئٹم",invQty:"تعداد",invPrice:"قیمت",invTotal:"کل",invSub:"ذیلی رقم",invDel:"ڈیلیوری",invGrand:"کل رقم",invThanks:"آرڈر کا شکریہ! 🙏"}
};
function T(k){ return (I18N[LANG]&&I18N[LANG][k])||I18N.en[k]||k; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function rs(n){ return 'Rs ' + Number(n||0).toLocaleString('en-PK'); }

/* ---------- DEMO DATA ---------- */
var TOPPINGS = [
  {id:'cheese',en:'Extra Cheese',ur:'اضافی چیز',price:150},
  {id:'tikka',en:'Chicken Tikka',ur:'چکن ٹکا',price:200},
  {id:'fajita',en:'Fajita Chicken',ur:'فجیتا چکن',price:200},
  {id:'pep',en:'Pepperoni',ur:'پیپرونی',price:250},
  {id:'mush',en:'Mushrooms',ur:'مشرومز',price:120},
  {id:'caps',en:'Capsicum',ur:'شملہ مرچ',price:80},
  {id:'onion',en:'Onions',ur:'پیاز',price:60},
  {id:'olive',en:'Olives',ur:'زیتون',price:150},
  {id:'jal',en:'Jalapeños',ur:'ہلاپینو',price:100}
];
var CRUSTS = [
  {id:'reg',en:'Regular',ur:'ریگولر',price:0},
  {id:'thin',en:'Thin Crust',ur:'پتلی کرسٹ',price:0},
  {id:'stuff',en:'Stuffed Crust',ur:'اسٹفڈ کرسٹ',price:250},
  {id:'burst',en:'Cheese Burst',ur:'چیز برسٹ',price:300}
];
function seedMenu(){
  var P = function(id,en,ur,de,du,pr,em,pop){return {id:id,cat:'pizza',en:en,ur:ur,descEn:de,descUr:du,prices:pr,emoji:em,popular:!!pop};};
  return [
    P('pz1','Chicken Tikka','چکن ٹکا','Spicy desi tikka chunks, onions & mozzarella','مصالحہ دار ٹکا، پیاز اور موزریلا',{S:549,M:949,L:1349,F:1749},'🍕',1),
    P('pz2','Chicken Fajita','چکن فجیتا','Fajita chicken, capsicum, onions & cheese','فجیتا چکن، شملہ مرچ، پیاز اور چیز',{S:579,M:979,L:1379,F:1799},'🍕',1),
    P('pz3','Pepperoni','پیپرونی','Loaded pepperoni slices with extra mozzarella','پیپرونی اور اضافی موزریلا',{S:629,M:1049,L:1449,F:1899},'🍕',1),
    P('pz4','Cheese Lovers','چیز لورز','Triple cheese blend for true cheese fans','چیز کے شوقینوں کے لیے ٹرپل چیز',{S:599,M:999,L:1399,F:1849},'🧀',1),
    P('pz5','Chicken Supreme','چکن سپریم','Tikka + fajita + pepperoni, fully loaded','ٹکا، فجیتا، پیپرونی — فل لوڈڈ',{S:649,M:1099,L:1499,F:1949},'🍕',0),
    P('pz6','Malai Boti','ملائی بوٹی','Creamy malai boti with mild spices','کریمی ملائی بوٹی، ہلکے مصالحے',{S:599,M:1029,L:1429,F:1849},'🍕',0),
    P('pz7','Seekh Kebab','سیخ کباب','Desi seekh kebab chunks, onions & mint drizzle','دیسی سیخ کباب، پیاز',{S:619,M:1049,L:1449,F:1899},'🍕',0),
    P('pz8','BBQ Chicken','بی بی کیو چکن','Smoky BBQ chicken with BBQ sauce swirl','دھوئیں دار بی بی کیو چکن',{S:589,M:999,L:1399,F:1829},'🍕',0),
    P('pz9','Veggie Delight','ویجی ڈیلائٹ','Capsicum, mushrooms, onions, olives & sweet corn','شملہ، مشرومز، پیاز، زیتون، مکئی',{S:499,M:849,L:1199,F:1599},'🫑',0),
    P('pz10','Mexican Fiesta','میکسیکن فیسٹا','Spicy Mexican chicken with jalapeños','مصالحہ دار میکسیکن چکن، ہلاپینو',{S:629,M:1069,L:1469,F:1899},'🌶️',0),
    P('pz11','Chicken Hawaiian','چکن ہوائیئن','Chicken chunks with juicy pineapple','چکن اور انناس',{S:579,M:979,L:1379,F:1799},'🍍',0),
    P('pz12','Afghani Feast','افغانی فیسٹ','Creamy Afghani chicken, mild & rich','کریمی افغانی چکن',{S:639,M:1079,L:1479,F:1929},'🍕',0),
    P('pz13','Mushroom Special','مشروم اسپیشل','Double mushrooms with garlic butter base','ڈبل مشرومز، لہسن مکھن',{S:549,M:929,L:1329,F:1749},'🍄',0),
    P('pz14','Chicken Tandoori','چکن تندوری','Tandoori-spiced chicken, desi style','تندوری مصالحہ چکن',{S:589,M:989,L:1389,F:1819},'🍕',0),
    P('pz15','Peri Peri Chicken','پیری پیری چکن','Fiery peri peri drizzle, for spice lovers','تیز پیری پیری',{S:619,M:1049,L:1449,F:1899},'🔥',0),
    P('pz16','Four Cheese Blast','فور چیز بلاسٹ','Mozzarella, cheddar, parmesan & cream cheese','چار اقسام کی چیز',{S:659,M:1119,L:1549,F:1999},'🧀',0),
    {id:'sd1',cat:'side',en:'Garlic Bread',ur:'گارلک بریڈ',descEn:'4 pcs with garlic butter',descUr:'لہسن مکھن کے ساتھ 4 پیس',prices:{one:249},emoji:'🥖'},
    {id:'sd2',cat:'side',en:'Chicken Wings (6 pc)',ur:'چکن ونگز (6 پیس)',descEn:'Crispy hot wings',descUr:'کرسبی ونگز',prices:{one:399},emoji:'🍗'},
    {id:'sd3',cat:'side',en:'French Fries',ur:'فرنچ فرائز',descEn:'Golden crispy fries',descUr:'سنہرے فرائز',prices:{one:199},emoji:'🍟'},
    {id:'sd4',cat:'side',en:'Loaded Fries',ur:'لوڈڈ فرائز',descEn:'Fries with chicken & cheese sauce',descUr:'چکن اور چیز ساس کے ساتھ',prices:{one:349},emoji:'🍟'},
    {id:'sd5',cat:'side',en:'Chicken Nuggets (8 pc)',ur:'چکن نگٹس (8 پیس)',descEn:'Crispy nuggets with dip',descUr:'ڈِپ کے ساتھ نگٹس',prices:{one:329},emoji:'🍗'},
    {id:'dr1',cat:'drink',en:'Coca-Cola (345ml)',ur:'کوکا کولا',descEn:'Chilled can',descUr:'ٹھنڈا کین',prices:{one:120},emoji:'🥤'},
    {id:'dr2',cat:'drink',en:'Sprite (345ml)',ur:'اسپرائٹ',descEn:'Chilled can',descUr:'ٹھنڈا کین',prices:{one:120},emoji:'🥤'},
    {id:'dr3',cat:'drink',en:'Fanta (345ml)',ur:'فانٹا',descEn:'Chilled can',descUr:'ٹھنڈا کین',prices:{one:120},emoji:'🥤'},
    {id:'dr4',cat:'drink',en:'Mineral Water (500ml)',ur:'منرل واٹر',descEn:'Pure drinking water',descUr:'صاف پانی',prices:{one:80},emoji:'💧'},
    {id:'dr5',cat:'drink',en:'Coca-Cola (1.5 Litre)',ur:'کوکا کولا (ڈیڑھ لیٹر)',descEn:'Family bottle',descUr:'فیملی بوتل',prices:{one:250},emoji:'🍾'},
    {id:'ds1',cat:'dessert',en:'Chocolate Lava Cake',ur:'چاکلیٹ لاوا کیک',descEn:'Molten chocolate center',descUr:'پگھلی چاکلیٹ',prices:{one:299},emoji:'🍫'},
    {id:'ds2',cat:'dessert',en:'Ice Cream Scoop',ur:'آئس کریم اسکوپ',descEn:'Vanilla / chocolate',descUr:'ونیلا / چاکلیٹ',prices:{one:150},emoji:'🍨'},
    {id:'ds3',cat:'dessert',en:'Gulab Jamun (4 pc)',ur:'گلاب جامن (4 پیس)',descEn:'Desi sweet',descUr:'دیسی میٹھا',prices:{one:199},emoji:'🍮'},
    {id:'dl1',cat:'deal',en:'Family Deal 1',ur:'فیملی ڈیل 1',descEn:'1 Large pizza + 1.5L drink + garlic bread',descUr:'1 بڑا پیزا + ڈیڑھ لیٹر ڈرنک + گارلک بریڈ',prices:{one:1599},emoji:'🎁',popular:1},
    {id:'dl2',cat:'deal',en:'Family Deal 2',ur:'فیملی ڈیل 2',descEn:'2 Medium pizzas + 1.5L drink',descUr:'2 درمیانے پیزے + ڈیڑھ لیٹر ڈرنک',prices:{one:1899},emoji:'🎁',popular:1},
    {id:'dl3',cat:'deal',en:'Midnight Deal',ur:'مڈ نائٹ ڈیل',descEn:'1 Small pizza + drink (after 9pm)',descUr:'1 چھوٹا پیزا + ڈرنک (رات 9 کے بعد)',prices:{one:649},emoji:'🌙'},
    {id:'dl4',cat:'deal',en:'Lunch Deal',ur:'لنچ ڈیل',descEn:'1 Small pizza + fries (12–4pm)',descUr:'1 چھوٹا پیزا + فرائز (دوپہر)',prices:{one:699},emoji:'☀️'}
  ];
}
function getMenu(){ try{var m=JSON.parse(localStorage.getItem('jps_menu')); if(m&&m.length) return m;}catch(e){} var s=seedMenu(); localStorage.setItem('jps_menu',JSON.stringify(s)); return s; }
function setMenu(m){ localStorage.setItem('jps_menu',JSON.stringify(m)); }
function getCart(){ try{return JSON.parse(localStorage.getItem('jps_cart')||'[]');}catch(e){return[];} }
function setCart(c){ localStorage.setItem('jps_cart',JSON.stringify(c)); updateCartBadge(); }
function getOrders(){ try{return JSON.parse(localStorage.getItem('jps_orders')||'[]');}catch(e){return[];} }
function setOrders(o){ localStorage.setItem('jps_orders',JSON.stringify(o)); }
function getCfg(){ try{var c=JSON.parse(localStorage.getItem('jps_cfg')); if(c) return c;}catch(e){} return {wa:'',fee:150,freeOver:2000,shop:'Jilan Pizza Shop',phone:'',addr:''}; }
function setCfg(c){ localStorage.setItem('jps_cfg',JSON.stringify(c)); }

/* ---------- NAV / I18N ---------- */
function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.style.display='block'; clearTimeout(t._h); t._h=setTimeout(function(){t.style.display='none';},1800); }
function go(v){
  document.querySelectorAll('.view').forEach(function(x){x.classList.remove('active');});
  document.getElementById('v-'+v).classList.add('active');
  document.querySelectorAll('.nav-it').forEach(function(n){n.classList.toggle('on',n.getAttribute('data-v')===v);});
  if(v==='home') renderHome(); if(v==='menu') renderMenu(); if(v==='cart') renderCart();
  if(v==='checkout') renderCheckoutSum(); if(v==='orders') renderOrders(); if(v==='account') renderAccount();
  window.scrollTo(0,0);
}
function toggleLang(){ LANG = LANG==='en'?'ur':'en'; localStorage.setItem('jps_lang',LANG); applyLang(); updateDemoBar(); }
function applyLang(){
  document.body.classList.toggle('rtl',LANG==='ur');
  document.documentElement.lang = LANG==='ur'?'ur':'en';
  document.getElementById('langBtn').textContent = LANG==='en'?'اردو':'EN';
  document.querySelectorAll('[data-i18n]').forEach(function(e){ e.textContent=T(e.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(function(e){ e.placeholder=T(e.getAttribute('data-i18n-ph')); });
  var v=document.querySelector('.view.active'); if(v) go(v.id.replace('v-',''));
}
function pname(p){ return LANG==='ur'?(p.ur||p.en):p.en; }
function pdesc(p){ return LANG==='ur'?(p.descUr||p.descEn||''): (p.descEn||''); }
function catName(c){ return T({pizza:'catPizza',side:'catSide',drink:'catDrink',dessert:'catDessert',deal:'catDeal'}[c]||'catPizza'); }

/* ---------- HOME ---------- */
function renderHome(){
  var menu=getMenu();
  var deals=menu.filter(function(p){return p.cat==='deal';});
  document.getElementById('dealsRow').innerHTML=deals.map(function(d){
    return '<div class="deal-card"><h4>'+esc(pname(d))+'</h4><p>'+esc(pdesc(d))+'</p><button onclick="openProduct(\''+d.id+'\')">'+rs(d.prices.one)+' · '+T('add')+'</button></div>';
  }).join('');
  var pop=menu.filter(function(p){return p.popular;}).slice(0,6);
  document.getElementById('popularGrid').innerHTML=pop.map(pcard).join('');
}
function pcard(p){
  var pr = p.cat==='pizza' ? (rs(p.prices.S)+' <small>'+T('size')+': S</small>') : rs(p.prices.one);
  return '<div class="pcard"><div class="pimg">'+(p.emoji||'🍕')+'</div><div class="pbody">'+
    '<h4>'+esc(pname(p))+'</h4><p class="desc">'+esc(pdesc(p))+'</p>'+
    '<div class="price">'+pr+'</div>'+
    '<button class="add-btn" onclick="openProduct(\''+p.id+'\')">'+T('add')+'</button></div></div>';
}

/* ---------- MENU ---------- */
var curCat='all';
function renderMenu(){
  var menu=getMenu();
  var cats=['all','pizza','side','drink','dessert','deal'];
  document.getElementById('catPills').innerHTML=cats.map(function(c){
    return '<div class="cat-pill'+(curCat===c?' on':'')+'" onclick="setCat(\''+c+'\')">'+esc(c==='all'?T('catAll'):catName(c))+'</div>';
  }).join('');
  var q=(document.getElementById('menuSearch').value||'').toLowerCase();
  var items=menu.filter(function(p){
    if(curCat!=='all'&&p.cat!==curCat) return false;
    if(q && (p.en+' '+(p.ur||'')+' '+(p.descEn||'')).toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  document.getElementById('menuGrid').innerHTML = items.length? items.map(pcard).join('')
    : '<div class="empty" style="grid-column:1/-1"><div class="e">🔍</div><p>'+T('noMatch')+'</p></div>';
}
function setCat(c){ curCat=c; renderMenu(); }

/* ---------- PRODUCT MODAL ---------- */
var M={p:null,size:'M',crust:'reg',tops:{},qty:1};
function openProduct(id){
  var p=getMenu().find(function(x){return x.id===id;}); if(!p) return;
  M={p:p,size:p.cat==='pizza'?'M':'one',crust:'reg',tops:{},qty:1};
  drawModal(); document.getElementById('pModal').classList.add('open');
}
function closeModal(){ document.getElementById('pModal').classList.remove('open'); }
function mUnit(){
  var p=M.p, base = p.cat==='pizza'? p.prices[M.size] : p.prices.one;
  var crust = p.cat==='pizza'? (CRUSTS.find(function(c){return c.id===M.crust;})||{price:0}).price : 0;
  var tops = Object.keys(M.tops).reduce(function(s,id){ var t=TOPPINGS.find(function(x){return x.id===id;}); return s+(t?t.price:0); },0);
  return base+crust+tops;
}
function drawModal(){
  var p=M.p, u=LANG==='ur';
  var h='<h3>'+(p.emoji||'🍕')+' '+esc(pname(p))+'</h3><p style="color:var(--muted);font-size:13px;margin:0 0 6px">'+esc(pdesc(p))+'</p>';
  if(p.cat==='pizza'){
    h+='<div class="opt-group"><h5>'+T('size')+'</h5><div class="opt-list">'+SIZES.map(function(s){
      return '<div class="opt'+(M.size===s.id?' on':'')+'" onclick="M.size=\''+s.id+'\';drawModal()">'+esc(u?s.ur:s.en)+' <small>'+rs(p.prices[s.id])+'</small></div>';
    }).join('')+'</div></div>';
    h+='<div class="opt-group"><h5>'+T('crust')+'</h5><div class="opt-list">'+CRUSTS.map(function(c){
      return '<div class="opt'+(M.crust===c.id?' on':'')+'" onclick="M.crust=\''+c.id+'\';drawModal()">'+esc(u?c.ur:c.en)+(c.price?' <small>+'+rs(c.price)+'</small>':'')+'</div>';
    }).join('')+'</div></div>';
    h+='<div class="opt-group"><h5>'+T('toppings')+'</h5><div class="opt-list">'+TOPPINGS.map(function(t){
      return '<div class="opt'+(M.tops[t.id]?' on':'')+'" onclick="M.tops[\''+t.id+'\']=!M.tops[\''+t.id+'\'];drawModal()">'+esc(u?t.ur:t.en)+' <small>+'+rs(t.price)+'</small></div>';
    }).join('')+'</div></div>';
  }
  h+='<div class="qty-row"><span style="font-weight:700">'+T('qty')+'</span><button class="qty-btn" onclick="M.qty=Math.max(1,M.qty-1);drawModal()">−</button><span class="qty-num">'+M.qty+'</span><button class="qty-btn" onclick="M.qty++;drawModal()">＋</button></div>';
  h+='<div class="total-line"><span>'+T('totalIs')+'</span><span style="color:var(--red)">'+rs(mUnit()*M.qty)+'</span></div>';
  h+='<button class="btn btn-red" onclick="addToCart()">🛒 '+T('add')+'</button>';
  h+='<button class="btn btn-ghost" onclick="closeModal()">'+T('cancel')+'</button>';
  document.getElementById('pModalBody').innerHTML=h;
}
function addToCart(){
  var p=M.p, u=LANG==='ur';
  var tops=Object.keys(M.tops).filter(function(id){return M.tops[id];});
  var sz = p.cat==='pizza' ? SIZES.find(function(s){return s.id===M.size;}) : null;
  var cr = p.cat==='pizza' ? CRUSTS.find(function(c){return c.id===M.crust;}) : null;
  var key=p.id+'|'+(sz?sz.id:'one')+'|'+(cr?cr.id:'-')+'|'+tops.sort().join(',');
  var cart=getCart();
  var ex=cart.find(function(c){return c.key===key;});
  var unit=mUnit();
  if(ex){ ex.qty+=M.qty; ex.total=ex.qty*ex.unit; }
  else cart.push({key:key,pid:p.id,name:pname(p),size:sz?(u?sz.ur:sz.en):'',crust:cr?(u?cr.ur:cr.en):'',
    tops:tops.map(function(id){var t=TOPPINGS.find(function(x){return x.id===id;});return u?t.ur:t.en;}),qty:M.qty,unit:unit,total:unit*M.qty,emoji:p.emoji||'🍕'});
  setCart(cart); closeModal(); toast(T('added'));
}
document.getElementById('pModal').addEventListener('click',function(e){ if(e.target===this) closeModal(); });

/* ---------- CART ---------- */
function updateCartBadge(){
  var n=getCart().reduce(function(s,c){return s+c.qty;},0);
  document.getElementById('cartCount').textContent=n;
}
function cartTotals(){
  var cart=getCart(), cfg=getCfg();
  var sub=cart.reduce(function(s,c){return s+c.total;},0);
  var otype=(document.querySelector('#v-checkout .seg .opt.on[data-v]')||{});
  var isPickup=false;
  try{ isPickup = document.querySelector('[onclick*="otype"].on, .seg .opt.on').dataset.v==='pickup'; }catch(e){}
  var fee = (sub>=cfg.freeOver||sub===0||isPickup)?0:cfg.fee;
  return {sub:sub,fee:fee,total:sub+fee,isPickup:isPickup};
}
function renderCart(){
  var cart=getCart(), box=document.getElementById('cartList');
  if(!cart.length){
    box.innerHTML='<div class="empty"><div class="e">🛒</div><h3>'+T('emptyCart')+'</h3><p>'+T('emptyCartS')+'</p></div>';
    document.getElementById('cartSum').style.display='none';
    document.getElementById('checkoutBtn').style.display='none'; return;
  }
  box.innerHTML=cart.map(function(c,i){
    var d=[c.size,c.crust].filter(Boolean).join(' · ')+(c.tops.length?'<br>+ '+c.tops.join(', '):'');
    return '<div class="citem"><div class="t">'+c.emoji+' '+esc(c.name)+'</div><div class="d">'+d+'</div>'+
    '<div class="row"><div><button class="qty-btn" style="width:30px;height:30px;font-size:16px" onclick="chQty('+i+',-1)">−</button> <b>'+c.qty+'</b> <button class="qty-btn" style="width:30px;height:30px;font-size:16px" onclick="chQty('+i+',1)">＋</button></div>'+
    '<div class="p">'+rs(c.total)+'</div></div>'+
    '<div style="text-align:right;margin-top:6px"><button class="rm" onclick="rmItem('+i+')">'+T('remove')+' ✕</button></div></div>';
  }).join('')+'<div style="text-align:right"><button class="rm" onclick="if(confirm(T(\'clearCart\'))){setCart([]);renderCart();}">'+T('clearCart')+'</button></div>';
  var t=cartTotals();
  document.getElementById('cartSum').style.display='block';
  document.getElementById('cartSum').innerHTML=
    '<div class="r"><span>'+T('subtotal')+'</span><span>'+rs(t.sub)+'</span></div>'+
    '<div class="r"><span>'+T('delFee')+'</span><span>'+(t.fee?rs(t.fee):T('free'))+'</span></div>'+
    '<div class="r g"><span>'+T('total')+'</span><span>'+rs(t.total)+'</span></div>';
  document.getElementById('checkoutBtn').style.display='block';
}
function chQty(i,d){ var cart=getCart(); cart[i].qty+=d; if(cart[i].qty<1) cart.splice(i,1); else cart[i].total=cart[i].qty*cart[i].unit; setCart(cart); renderCart(); }
function rmItem(i){ var cart=getCart(); cart.splice(i,1); setCart(cart); renderCart(); }

/* ---------- CHECKOUT ---------- */
function pickSeg(el,grp){ el.parentNode.querySelectorAll('.opt').forEach(function(o){o.classList.remove('on');}); el.classList.add('on'); if(grp==='otype') renderCheckoutSum(); }
function renderCheckoutSum(){
  var t=cartTotals(), cfg=getCfg();
  var otypeEl=document.querySelector('#v-checkout .seg .opt.on');
  var isPickup = otypeEl && otypeEl.getAttribute('data-v')==='pickup';
  var fee = (t.sub>=cfg.freeOver||t.sub===0||isPickup)?0:cfg.fee;
  document.getElementById('coSum').innerHTML=
    '<div class="r"><span>'+T('subtotal')+'</span><span>'+rs(t.sub)+'</span></div>'+
    '<div class="r"><span>'+T('delFee')+'</span><span>'+(fee?rs(fee):T('free'))+'</span></div>'+
    '<div class="r g"><span>'+T('total')+'</span><span>'+rs(t.sub+fee)+'</span></div>';
}
function validMobile(m){ m=m.replace(/[\s-]/g,''); return /^03\d{9}$/.test(m); }
function placeOrder(){
  var cart=getCart(); if(!cart.length){ toast(T('orderEmpty')); return; }
  var name=document.getElementById('co-name').value.trim();
  var mobile=document.getElementById('co-mobile').value.trim();
  var addr=document.getElementById('co-addr').value.trim();
  var notes=document.getElementById('co-notes').value.trim();
  if(!name){ toast(T('needName')); return; }
  if(!validMobile(mobile)){ toast(T('needMobile')); return; }
  var otypeEl=document.querySelector('#v-checkout .seg .opt.on');
  var isPickup = otypeEl && otypeEl.getAttribute('data-v')==='pickup';
  var payEl=document.querySelectorAll('#v-checkout .seg')[1].querySelector('.opt.on');
  if(!isPickup && !addr){ toast(T('needAddr')); return; }
  var cfg=getCfg();
  var sub=cart.reduce(function(s,c){return s+c.total;},0);
  var fee=(sub>=cfg.freeOver||isPickup)?0:cfg.fee;
  var d=new Date();
  var no='JPS-'+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'-'+String(Math.floor(1000+Math.random()*9000));
  var order={no:no,date:d.toLocaleString(),name:name,mobile:mobile,addr:isPickup?T('pickupT'):addr,notes:notes,
    otype:isPickup?'pickup':'delivery',pay:payEl.getAttribute('data-v'),items:cart,sub:sub,fee:fee,total:sub+fee,status:'pending'};
  var orders=getOrders(); orders.unshift(order); setOrders(orders);
  setCart([]);
  document.getElementById('co-name').value='';document.getElementById('co-mobile').value='';
  document.getElementById('co-addr').value='';document.getElementById('co-notes').value='';
  showConfirm(order);
}
function waLink(order){
  var cfg=getCfg();
  var lines=order.items.map(function(c){return '▪ '+c.qty+'x '+c.name+(c.size?' ('+c.size+')':'')+' — '+rs(c.total);});
  var msg='*'+cfg.shop+'* 🍕%0A'+T('orderNo')+': '+order.no+'%0A%0A'+lines.join('%0A')+'%0A%0A'+T('invSub')+': '+rs(order.sub)+'%0A'+T('invDel')+': '+(order.fee?rs(order.fee):T('free'))+'%0A*'+T('invGrand')+': '+rs(order.total)+'*%0A%0A'+T('name').replace(' *','')+': '+encodeURIComponent(order.name)+'%0A'+T('mobile').replace(' *','')+': '+order.mobile;
  if(!cfg.wa) return null;
  return 'https://wa.me/'+cfg.wa+'?text='+msg;
}
function showConfirm(order){
  var cfg=getCfg(), wl=waLink(order);
  var h='<div class="conf-box"><div class="big">✅</div><h2>'+T('orderOk')+'</h2>'+
    '<div class="ord-no">'+order.no+'</div><p style="color:var(--muted)">'+T('weCall')+'<br>'+T('trackNote')+'</p>'+
    '<div class="sum" style="text-align:left">'+order.items.map(function(c){
      return '<div class="r"><span>'+c.qty+'x '+esc(c.name)+(c.size?' ('+esc(c.size)+')':'')+'</span><span>'+rs(c.total)+'</span></div>';
    }).join('')+'<div class="r"><span>'+T('invSub')+'</span><span>'+rs(order.sub)+'</span></div>'+
    '<div class="r"><span>'+T('invDel')+'</span><span>'+(order.fee?rs(order.fee):T('free'))+'</span></div>'+
    '<div class="r g"><span>'+T('invGrand')+'</span><span>'+rs(order.total)+'</span></div></div>';
  if(wl) h+='<button class="btn btn-green" onclick="window.open(\''+wl+'\',\'_blank\')">'+T('waOrder')+'</button>';
  else h+='<div class="note">⚠️ '+T('markSent')+'</div>';
  h+='<button class="btn btn-ghost" onclick="go(\'home\')">'+T('backHome')+'</button></div>';
  document.getElementById('confBox').innerHTML=h; go('confirm');
}

/* ---------- ORDERS ---------- */
function stBadge(s){
  var m={pending:['badge',T('stPending')],preparing:['badge prep',T('stPrep')],delivered:['badge done',T('stDone')],cancelled:['badge cancel',T('stCancel')]};
  var x=m[s]||m.pending; return '<span class="'+x[0]+'">'+x[1]+'</span>';
}
function renderOrders(){
  var orders=getOrders(), box=document.getElementById('ordersList');
  if(!orders.length){ box.innerHTML='<div class="empty"><div class="e">📦</div><p>'+T('noOrders')+'</p></div>'; return; }
  box.innerHTML=orders.map(function(o,i){
    return '<div class="oitem"><div class="h"><span>'+o.no+'</span>'+stBadge(o.status)+'</div>'+
    '<div style="font-size:12px;color:var(--muted);margin:6px 0">'+esc(o.date)+' · '+o.items.reduce(function(s,c){return s+c.qty;},0)+' items · <b style="color:var(--red)">'+rs(o.total)+'</b></div>'+
    '<button class="btn btn-ghost" style="padding:9px" onclick="orderDetail('+i+')">'+T('viewOrder')+'</button></div>';
  }).join('');
}
function orderDetail(i){
  var o=getOrders()[i]; if(!o) return;
  var h='<h3>'+o.no+'</h3><p style="color:var(--muted);font-size:13px">'+esc(o.date)+' · '+stBadge(o.status)+'</p>';
  h+='<div class="sum">'+o.items.map(function(c){
    return '<div class="r"><span>'+c.qty+'x '+esc(c.name)+(c.size?' ('+esc(c.size)+')':'')+(c.tops.length?'<br><small style="color:var(--muted)">+ '+esc(c.tops.join(', '))+'</small>':'')+'</span><span>'+rs(c.total)+'</span></div>';
  }).join('')+'<div class="r"><span>'+T('invSub')+'</span><span>'+rs(o.sub)+'</span></div>'+
  '<div class="r"><span>'+T('invDel')+'</span><span>'+(o.fee?rs(o.fee):T('free'))+'</span></div>'+
  '<div class="r g"><span>'+T('invGrand')+'</span><span>'+rs(o.total)+'</span></div></div>';
  h+='<div class="note"><b>'+T('custInfo')+':</b><br>'+esc(o.name)+' · '+esc(o.mobile)+'<br>'+esc(o.addr)+'</div>';
  document.getElementById('pModalBody').innerHTML=h+'<button class="btn btn-ghost" onclick="closeModal()">'+T('cancel')+'</button>';
  document.getElementById('pModal').classList.add('open');
}

/* ---------- ACCOUNT / ADMIN ---------- */
var adminTab='dash';
function isAdmin(){ return localStorage.getItem('jps_admin')==='1'; }
function renderAccount(){
  var box=document.getElementById('accountBox');
  if(!isAdmin()){
    box.innerHTML='<div class="sec-title">🔐 '+T('adminLogin')+'</div><div class="form">'+
    '<div class="note">'+T('demoCreds')+'</div>'+
    '<label>'+T('username')+'</label><input id="ad-u" autocomplete="off">'+
    '<label>'+T('password')+'</label><input id="ad-p" type="password">'+
    '<div style="height:12px"></div><button class="btn btn-red" onclick="doLogin()">'+T('login')+'</button></div>';
    return;
  }
  var tabs=[['dash','📊'],['menu','🍕 '+T('menuMgmt')],['orders','📦 '+T('ordersAdm')],['set','⚙️ '+T('settings')]];
  var h='<div class="sec-title">🔐 '+T('admin')+' <span style="font-size:11px;background:var(--gold);color:#fff;padding:2px 8px;border-radius:8px">'+T('demoLock')+'</span></div>';
  h+='<div class="cat-pills">'+tabs.map(function(t){return '<div class="cat-pill'+(adminTab===t[0]?' on':'')+'" onclick="adminTab=\''+t[0]+'\';renderAccount()">'+t[1]+'</div>';}).join('')+'</div><div id="admBody"></div>';
  h+='<button class="btn btn-ghost" onclick="localStorage.removeItem(\'jps_admin\');renderAccount()">'+T('logout')+'</button>';
  box.innerHTML=h;
  if(adminTab==='dash') admDash(); else if(adminTab==='menu') admMenu();
  else if(adminTab==='orders') admOrders(); else admSettings();
}
function doLogin(){
  var u=document.getElementById('ad-u').value.trim(), p=document.getElementById('ad-p').value;
  if(u==='admin'&&p==='jilan123'){ localStorage.setItem('jps_admin','1'); renderAccount(); }
  else toast(T('wrongLogin'));
}
function admDash(){
  var orders=getOrders(), menu=getMenu();
  var today=new Date().toDateString();
  var tOrders=orders.filter(function(o){return new Date(o.date).toDateString()===today||o.date.indexOf(today.slice(4))>=0;});
  var sales=orders.reduce(function(s,o){return o.status!=='cancelled'?s+o.total:s;},0);
  var pend=orders.filter(function(o){return o.status==='pending'||o.status==='preparing';}).length;
  document.getElementById('admBody').innerHTML='<div class="dash">'+
    '<div class="dcard"><div class="v">'+rs(sales)+'</div><div class="l">💰 Total Sales</div></div>'+
    '<div class="dcard"><div class="v">'+orders.length+'</div><div class="l">📦 Total Orders</div></div>'+
    '<div class="dcard"><div class="v">'+pend+'</div><div class="l">⏳ Pending</div></div>'+
    '<div class="dcard"><div class="v">'+menu.length+'</div><div class="l">🍕 Menu Items</div></div></div>'+
    '<div class="sec-title">🕘 Recent Orders</div>'+
    (orders.slice(0,5).map(function(o){return '<div class="oitem"><div class="h"><span>'+o.no+'</span>'+stBadge(o.status)+'</div><div style="font-size:12px;color:var(--muted)">'+rs(o.total)+' · '+esc(o.name)+'</div></div>';}).join('')||'<p style="color:var(--muted)">'+T('noOrders')+'</p>');
}
function admMenu(){
  var menu=getMenu();
  var h='<button class="btn btn-red" onclick="editItem(\'\')">'+T('addItem')+'</button><div style="height:10px"></div>';
  h+='<table class="tbl"><tr><th>'+T('invName')+'</th><th>'+T('category')+'</th><th>'+T('price1')+'</th><th></th></tr>';
  h+=menu.map(function(p){
    var pr=p.cat==='pizza'?('S '+p.prices.S+' / L '+p.prices.L):rs(p.prices.one);
    return '<tr><td>'+(p.emoji||'')+' '+esc(pname(p))+'</td><td>'+esc(catName(p.cat))+'</td><td>'+pr+'</td>'+
    '<td><button class="st-sel" onclick="editItem(\''+p.id+'\')">'+T('edit')+'</button> <button class="st-sel" style="color:var(--red)" onclick="delItem(\''+p.id+'\')">'+T('del')+'</button></td></tr>';
  }).join('')+'</table>';
  document.getElementById('admBody').innerHTML=h;
}
function editItem(id){
  var p=getMenu().find(function(x){return x.id===id;})||{id:'n'+Date.now(),cat:'pizza',en:'',ur:'',descEn:'',descUr:'',prices:{S:0,M:0,L:0,F:0,one:0},emoji:'🍕'};
  var isP=p.cat==='pizza';
  var h='<h3>'+(id?T('edit'):T('addItem'))+'</h3><div class="form">'+
    '<label>'+T('itemName')+'</label><input id="ei-en" value="'+esc(p.en)+'">'+
    '<label>'+T('itemNameUr')+'</label><input id="ei-ur" value="'+esc(p.ur||'')+'">'+
    '<label>'+T('category')+'</label><select id="ei-cat" onchange="document.getElementById(\'ei-pr\').style.display=this.value===\'pizza\'?\'none\':\'block\';document.getElementById(\'ei-prp\').style.display=this.value===\'pizza\'?\'grid\':\'none\'">'+
    ['pizza','side','drink','dessert','deal'].map(function(c){return '<option value="'+c+'"'+(p.cat===c?' selected':'')+'>'+catName(c)+'</option>';}).join('')+'</select>'+
    '<div id="ei-prp" style="display:'+(isP?'grid':'none')+';grid-template-columns:1fr 1fr;gap:8px">'+
    '<div><label>'+T('priceS')+'</label><input id="ei-S" type="number" value="'+(p.prices.S||0)+'"></div>'+
    '<div><label>'+T('priceM')+'</label><input id="ei-M" type="number" value="'+(p.prices.M||0)+'"></div>'+
    '<div><label>'+T('priceL')+'</label><input id="ei-L" type="number" value="'+(p.prices.L||0)+'"></div>'+
    '<div><label>'+T('priceF')+'</label><input id="ei-F" type="number" value="'+(p.prices.F||0)+'"></div></div>'+
    '<div id="ei-pr" style="display:'+(isP?'none':'block')+'"><label>'+T('price1')+'</label><input id="ei-one" type="number" value="'+(p.prices.one||0)+'"></div>'+
    '<div style="height:12px"></div>'+
    '<button class="btn btn-red" onclick="saveItem(\''+p.id+'\')">'+T('save')+'</button>'+
    '<button class="btn btn-ghost" onclick="closeModal()">'+T('cancel')+'</button></div>';
  document.getElementById('pModalBody').innerHTML=h;
  document.getElementById('pModal').classList.add('open');
}
function saveItem(id){
  var menu=getMenu(), p=menu.find(function(x){return x.id===id;});
  var isNew=!p; if(isNew){ p={id:id,emoji:'🍕',popular:0}; menu.push(p); }
  p.en=document.getElementById('ei-en').value.trim()||'New Item';
  p.ur=document.getElementById('ei-ur').value.trim();
  p.cat=document.getElementById('ei-cat').value;
  if(p.cat==='pizza'){ p.prices={S:+document.getElementById('ei-S').value||0,M:+document.getElementById('ei-M').value||0,L:+document.getElementById('ei-L').value||0,F:+document.getElementById('ei-F').value||0}; }
  else { p.prices={one:+document.getElementById('ei-one').value||0}; }
  setMenu(menu); closeModal(); toast(T('saved')); admMenu();
}
function delItem(id){
  if(!confirm(T('delSure'))) return;
  setMenu(getMenu().filter(function(x){return x.id!==id;})); admMenu(); toast(T('saved'));
}
function admOrders(){
  var orders=getOrders();
  var h=orders.length? orders.map(function(o,i){
    return '<div class="oitem"><div class="h"><span>'+o.no+'</span><select class="st-sel" onchange="setSt('+i+',this.value)">'+
    ['pending','preparing','delivered','cancelled'].map(function(s){return '<option value="'+s+'"'+(o.status===s?' selected':'')+'>'+T('st'+s[0].toUpperCase()+s.slice(1))+'</option>';}).join('')+'</select></div>'+
    '<div style="font-size:12px;color:var(--muted);margin:6px 0">'+esc(o.date)+' · '+esc(o.name)+' · '+esc(o.mobile)+'<br>'+o.items.map(function(c){return c.qty+'x '+esc(c.name);}).join(', ')+'<br><b style="color:var(--red)">'+rs(o.total)+'</b></div></div>';
  }).join('') : '<div class="empty"><div class="e">📦</div><p>'+T('noOrders')+'</p></div>';
  document.getElementById('admBody').innerHTML=h;
}
function setSt(i,s){ var o=getOrders(); o[i].status=s; setOrders(o); toast(T('saved')); }
function admSettings(){
  var c=getCfg();
  document.getElementById('admBody').innerHTML='<div class="form">'+
    '<label>'+T('waNumber')+'</label><input id="cf-wa" value="'+esc(c.wa)+'" placeholder="923001234567"><div class="note">'+T('waHint')+'</div>'+
    '<label>'+T('delFee')+' (Rs)</label><input id="cf-fee" type="number" value="'+c.fee+'">'+
    '<label>Free delivery over (Rs)</label><input id="cf-free" type="number" value="'+c.freeOver+'">'+
    '<div style="height:12px"></div><button class="btn btn-red" onclick="saveCfg()">'+T('saveSet')+'</button></div>';
}
function saveCfg(){
  setCfg({wa:document.getElementById('cf-wa').value.replace(/\D/g,''),fee:+document.getElementById('cf-fee').value||0,freeOver:+document.getElementById('cf-free').value||0,shop:'Jilan Pizza Shop',phone:'',addr:''});
  toast(T('saved'));
}

/* ---------- 3-DAY DEMO EXPIRY ---------- */
var DEMO_MS = 3 * 86400000;
function demoSince(){ try{ var v = localStorage.getItem('jps_demo_since'); return v ? parseInt(v, 10) : 0; }catch(e){ return 0; } }
function ensureDemoSince(){ if (!demoSince()){ try{ localStorage.setItem('jps_demo_since', String(Date.now())); }catch(e){} } }
function demoDaysLeft(){ var s = demoSince(); if (!s) return 3; var left = DEMO_MS - (Date.now() - s); return Math.max(0, Math.ceil(left / 86400000)); }
function demoExpired(){ var s = demoSince(); return s > 0 && (Date.now() - s) > DEMO_MS; }
function demoCountdownTxt(){ return '⏳ DEMO by Jilan Apps · ' + (LANG === 'ur' ? 'باقی: ' + demoDaysLeft() + ' دن' : demoDaysLeft() + ' day(s) left'); }
function updateDemoBar(){ var db = document.querySelector('.demo-bar'); if (db) db.textContent = '🍕 ' + demoCountdownTxt() + ' — ' + (LANG === 'ur' ? 'نمونہ قیمتیں، صرف ڈیمو ڈیٹا' : 'Sample prices, demo data only'); }
function showDemoLock(){
  document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#101418;color:#fff;font-family:system-ui,Segoe UI,Arial;padding:24px;box-sizing:border-box">' +
    '<div style="max-width:380px;text-align:center">' +
    '<div style="font-size:52px;margin-bottom:12px">⏰</div>' +
    '<h2 style="margin:0 0 8px">' + (LANG === 'ur' ? 'ڈیمو ختم ہو گیا' : 'Demo expired') + '</h2>' +
    '<p style="color:#b9c2c9;line-height:1.6">' + (LANG === 'ur' ? '3 دن کا ڈیمو مکمل ہو گیا۔ مکمل ورژن کے لیے جیلان ایپس سے رابطہ کریں۔' : 'The 3-day demo has ended. Contact Jilan Apps for the full version.') + '</p>' +
    '<div style="display:inline-block;background:#c0392b;color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;margin-top:8px">🏷️ DEMO by Jilan Apps</div>' +
    '</div></div>';
}

/* ---------- INIT ---------- */
ensureDemoSince();
if (demoExpired()) { showDemoLock(); }
else { applyLang(); updateCartBadge(); renderHome(); updateDemoBar(); }
