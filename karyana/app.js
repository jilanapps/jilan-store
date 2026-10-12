/* =====================================================================
   Jilan Karyana Store — OWNER-ONLY Shop Management System (v2)
   ---------------------------------------------------------------------
   Owner dashboard, billing/invoices, inventory, customer/supplier khata,
   cashbook with daily sessions, expenses, reports, backup/restore.
   Data: browser localStorage only (no backend). Demo workspace separate.
   PIN stored as SHA-256 hash (never plain text). WhatsApp/SMS open the
   messaging app with prefilled text — owner sends manually; nothing is
   auto-sent. "Sent" is recorded only when owner confirms.
   ===================================================================== */
(function () {
'use strict';

/* ---------------- SHA-256 (pure JS, sync) ---------------- */
function sha256(str) {
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4788,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c51dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a563f0,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  str = unescape(encodeURIComponent(str));
  var l = str.length, bitLen = l * 8;
  str += String.fromCharCode(0x80);
  while ((str.length % 64) !== 56) str += String.fromCharCode(0);
  var hi = Math.floor(bitLen / 0x100000000), lo = bitLen >>> 0;
  str += String.fromCharCode((hi>>>24)&255,(hi>>>16)&255,(hi>>>8)&255,hi&255,
                             (lo>>>24)&255,(lo>>>16)&255,(lo>>>8)&255,lo&255);
  var w = new Array(64), i, j;
  for (i = 0; i < str.length; i += 64) {
    for (j = 0; j < 16; j++)
      w[j] = (str.charCodeAt(i+j*4)<<24)|(str.charCodeAt(i+j*4+1)<<16)|
             (str.charCodeAt(i+j*4+2)<<8)|str.charCodeAt(i+j*4+3);
    for (j = 16; j < 64; j++) {
      var s0 = rotr(w[j-15],7)^rotr(w[j-15],18)^(w[j-15]>>>3);
      var s1 = rotr(w[j-2],17)^rotr(w[j-2],19)^(w[j-2]>>>10);
      w[j] = (w[j-16]+s0+w[j-7]+s1)|0;
    }
    var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (j = 0; j < 64; j++) {
      var S1 = rotr(e,6)^rotr(e,11)^rotr(e,25);
      var ch = (e&f)^((~e)&g);
      var t1 = (h+S1+ch+K[j]+w[j])|0;
      var S0 = rotr(a,2)^rotr(a,13)^rotr(a,22);
      var maj = (a&b)^(a&c)^(b&c);
      var t2 = (S0+maj)|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
    }
    H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;
    H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
  }
  var out = '';
  for (i = 0; i < 8; i++) out += ('00000000' + (H[i]>>>0).toString(16)).slice(-8);
  return out;
}

/* ---------------- i18n ---------------- */
var I18N = {
en:{
 appSub:'Jilan Apps · Owner', dashboard:'Dashboard', bill:'New Bill', sales:'Sales', stock:'Stock',
 khata:'Khata', more:'More', today:'Today', yesterday:'Yesterday', month:'This Month', custom:'Custom',
 salesToday:'Sales (today)', cashIn:'Cash received', expenses:'Expenses', grossProfit:'Gross profit (est.)',
 receivables:'Customers owe me', payables:'I owe suppliers', products:'Products', lowStock:'Low stock',
 recentTx:'Recent transactions', newSale:'New Sale', addStock:'Add Stock', addCustomer:'Add Customer',
 receivePay:'Receive Payment', addExpense:'Add Expense', viewAll:'View all', search:'Search…',
 save:'Save', cancel:'Cancel', del:'Delete', edit:'Edit', close:'Close', back:'Back', print:'Print / PDF',
 shareWA:'WhatsApp', sendSMS:'SMS', confirm:'Confirm', reset:'Reset', export:'Export', download:'Download',
 billNo:'Bill No', date:'Date', customer:'Customer', walkin:'Walk-in', items:'Items', qty:'Qty', unit:'Unit',
 price:'Price', total:'Total', subtotal:'Subtotal', discount:'Discount', grandTotal:'Grand Total',
 paid:'Paid', balance:'Balance', method:'Payment method', cash:'Cash', bank:'Bank', wallet:'Wallet',
 credit:'Credit', fixed:'Fixed', percent:'%', addItem:'+ Add item', confirmSale:'Confirm Sale',
 stockAfter:'Stock after sale', insufficient:'Insufficient stock', dupWarn:'Bill already saved — duplicate blocked.',
 saleSaved:'Sale saved', billVoided:'Bill voided & reversed', reprint:'Reprint', salesHistory:'Sales History',
 returns:'Return / Void', inventory:'Inventory', addProduct:'Add Product', sku:'SKU / Barcode', category:'Category',
 pack:'Pack size', buyPrice:'Purchase price', sellPrice:'Sale price', minStock:'Min stock', expiry:'Expiry date',
 batch:'Batch no', stockVal:'Stock value', purchases:'Purchases', newPurchase:'New Purchase',
 supplier:'Supplier', customers:'Customers', suppliers:'Suppliers', name:'Name', phone:'Phone', address:'Address',
 openingBal:'Opening balance', notes:'Notes', ledger:'Ledger', debit:'Debit', credit2:'Credit', runningBal:'Balance',
 receivePayment:'Receive Payment', paySupplier:'Pay Supplier', outstanding:'Outstanding', remindWA:'WhatsApp Reminder',
 remindSMS:'SMS Reminder', markSent:'Mark as sent', reminderSaved:'Reminder recorded (owner confirmed sent)',
 cashbook:'Cashbook', dayOpen:'Open Day', dayClose:'Close Day', openingCash:'Opening cash', expected:'Expected',
 actual:'Actual counted', shortage:'Shortage', excess:'Excess', reason:'Reason', sessionClosed:'Day closed & report saved',
 alreadyOpen:'A day session is already open', noOpen:'No open session', reports:'Reports', backup:'Backup & Restore',
 settings:'Settings', shopName:'Shop name', waNumber:'WhatsApp number', allowNeg:'Allow negative stock',
 units:'Units (comma separated)', language:'Language', pinChange:'Change PIN', demoMode:'Demo mode',
 backupNow:'Backup now (JSON)', restore:'Restore from file', exportCSV:'Export CSV', resetDemo:'Reset demo data',
 dataLocal:'Data is stored ONLY on this device (localStorage). No cloud, no account. Back up regularly.',
 invalidFile:'Invalid backup file', restoreDone:'Restore complete', confirmDel:'Are you sure? This cannot be undone.',
 archive:'Archive', archived:'Archived', showArchived:'Show archived', netProfit:'Net profit (est.)',
 cogs:'Cost of goods sold', purchaseTotal:'Purchases (stock bought)', profitNote:'Profit is estimated from recorded purchase costs. Items with missing cost are marked.',
 costMissing:'cost missing', bestSellers:'Best sellers', slowSellers:'Slow sellers', byDate:'By date',
 custReport:'Customer outstanding', supReport:'Supplier payables', cashReport:'Cashbook report',
 stockReport:'Stock valuation', noData:'No data yet', smsNote:'SMS uses the phone messaging app (sms: link) — the message is prefilled, you press Send. Direct auto-SMS needs SEND_SMS permission and is not used.',
 waNote:'WhatsApp opens the chat with a prefilled message — you press Send. Nothing is sent automatically.',
 lockTitle:'Enter PIN', setPin:'Set a 4-digit PIN', pinAgain:'Confirm PIN', pinMismatch:'PINs do not match',
 pinWrong:'Wrong PIN', unlock:'Unlock', logout:'Lock app', allCaughtUp:'All good', cashSales:'Cash sales',
 custPay:'Customer payments', supPay:'Supplier payments', withdrawals:'Owner withdrawals', otherInc:'Other income',
 closingBal:'Closing balance', todaySales:'Sales', purchase:'Purchase', expense:'Expense', payment:'Payment',
 adjustment:'Adjustment', damage:'Damage/Expired', sale:'Sale', ret:'Return', void:'Void', open:'Open', closed:'Closed'
},
ur:{
 appSub:'جیلان ایپس · مالک', dashboard:'ڈیش بورڈ', bill:'نیا بل', sales:'فروخت', stock:'اسٹاک',
 khata:'کھاتہ', more:'مزید', today:'آج', yesterday:'کل', month:'اس ماہ', custom:'اپنی مرضی',
 salesToday:'فروخت (آج)', cashIn:'نقد موصول', expenses:'اخراجات', grossProfit:'مجموعی منافع (تخمینی)',
 receivables:'گاہکوں سے لینا', payables:'سپلائرز کو دینا', products:'مصنوعات', lowStock:'کم اسٹاک',
 recentTx:'حالیہ لین دین', newSale:'نئی فروخت', addStock:'اسٹاک شامل', addCustomer:'نیا گاہک',
 receivePay:'ادائیگی وصول', addExpense:'خرچ شامل', viewAll:'سب دیکھیں', search:'تلاش…',
 save:'محفوظ کریں', cancel:'منسوخ', del:'حذف کریں', edit:'ترمیم', close:'بند کریں', back:'واپس', print:'پرنٹ / PDF',
 shareWA:'واٹس ایپ', sendSMS:'ایس ایم ایس', confirm:'تصدیق', reset:'ری سیٹ', export:'ایکسپورٹ', download:'ڈاؤن لوڈ',
 billNo:'بل نمبر', date:'تاریخ', customer:'گاہک', walkin:'عام گاہک', items:'اشیاء', qty:'مقدار', unit:'یونٹ',
 price:'قیمت', total:'کل', subtotal:'ذیلی کل', discount:'رعایت', grandTotal:'واجب الادا',
 paid:'ادا شدہ', balance:'بقایا', method:'ادائیگی کا طریقہ', cash:'نقد', bank:'بینک', wallet:'والٹ',
 credit:'ادھار', fixed:'مقررہ', percent:'%', addItem:'+ آئٹم شامل', confirmSale:'فروخت محفوظ کریں',
 stockAfter:'فروخت کے بعد اسٹاک', insufficient:'اسٹاک ناکافی', dupWarn:'بل پہلے ہی محفوظ — نقل روک دی گئی۔',
 saleSaved:'فروخت محفوظ ہو گئی', billVoided:'بل منسوخ اور واپس', reprint:'دوبارہ پرنٹ', salesHistory:'فروخت کی تفصیل',
 returns:'واپسی / منسوخی', inventory:'انوینٹری', addProduct:'نئی مصنوعات', sku:'SKU / بارکوڈ', category:'کیٹیگری',
 pack:'پیک سائز', buyPrice:'خرید قیمت', sellPrice:'فروخت قیمت', minStock:'کم از کم اسٹاک', expiry:'ختم ہونے کی تاریخ',
 batch:'بیچ نمبر', stockVal:'اسٹاک مالیت', purchases:'خریداری', newPurchase:'نئی خریداری',
 supplier:'سپلائر', customers:'گاہک', suppliers:'سپلائرز', name:'نام', phone:'فون', address:'پتہ',
 openingBal:'ابتدائی بیلنس', notes:'نوٹس', ledger:'کھاتہ', debit:'ڈیبٹ', credit2:'کریڈٹ', runningBal:'بیلنس',
 receivePayment:'ادائیگی وصول کریں', paySupplier:'سپلائر کو ادائیگی', outstanding:'بقایا جات', remindWA:'واٹس ایپ یاددہانی',
 remindSMS:'ایس ایم ایس یاددہانی', markSent:'بھیج دیا نشان لگائیں', reminderSaved:'یاددہانی ریکارڈ (مالک نے تصدیق کی)',
 cashbook:'کیش بک', dayOpen:'دن شروع کریں', dayClose:'دن بند کریں', openingCash:'ابتدائی نقد', expected:'متوقع',
 actual:'گنی ہوئی رقم', shortage:'کمی', excess:'زائد', reason:'وجہ', sessionClosed:'دن بند اور رپورٹ محفوظ',
 alreadyOpen:'دن پہلے ہی شروع ہے', noOpen:'کوئی دن شروع نہیں', reports:'رپورٹس', backup:'بیک اپ اور بحالی',
 settings:'ترتیبات', shopName:'دکان کا نام', waNumber:'واٹس ایپ نمبر', allowNeg:'منفی اسٹاک کی اجازت',
 units:'یونٹس (کاما سے الگ)', language:'زبان', pinChange:'PIN تبدیل', demoMode:'ڈیمو موڈ',
 backupNow:'بیک اپ (JSON)', restore:'فائل سے بحال کریں', exportCSV:'CSV ایکسپورٹ', resetDemo:'ڈیمو ڈیٹا ری سیٹ',
 dataLocal:'ڈیٹا صرف اسی ڈیوائس پر ہے (localStorage)۔ کوئی کلاؤڈ نہیں۔ باقاعدگی سے بیک اپ لیں۔',
 invalidFile:'غلط بیک اپ فائل', restoreDone:'بحالی مکمل', confirmDel:'کیا آپ یقینی ہیں؟ یہ واپس نہیں ہوگا۔',
 archive:'آرکائیو', archived:'آرکائیو شدہ', showArchived:'آرکائیو دیکھیں', netProfit:'خالص منافع (تخمینی)',
 cogs:'فروخت شدہ مال کی لاگت', purchaseTotal:'خریداری (اسٹاک خریدا)', profitNote:'منافع خرید قیمتوں سے تخمینی ہے۔ جن کی قیمت نہیں، وہ نشان زد ہیں۔',
 costMissing:'قیمت نامعلوم', bestSellers:'زیادہ بکنے والی', slowSellers:'کم بکنے والی', byDate:'تاریخ کے حساب سے',
 custReport:'گاہکوں کے بقایا جات', supReport:'سپلائرز کے واجبات', cashReport:'کیش بک رپورٹ',
 stockReport:'اسٹاک مالیت', noData:'ابھی کوئی ڈیٹا نہیں', smsNote:'ایس ایم ایس فون کی میسجنگ ایپ سے جاتا ہے — پیغام پہلے سے لکھا ہوگا، آپ Send دبائیں گے۔ خودکار SMS کے لیے اجازت درکار ہے جو استعمال نہیں کی گئی۔',
 waNote:'واٹس ایپ چیٹ کھلتی ہے، پیغام پہلے سے لکھا ہوتا ہے — آپ Send دبائیں گے۔ کچھ خودکار نہیں بھیجا جاتا۔',
 lockTitle:'PIN درج کریں', setPin:'4 ہندسوں کا PIN بنائیں', pinAgain:'PIN کی تصدیق', pinMismatch:'PIN ایک جیسے نہیں',
 pinWrong:'غلط PIN', unlock:'کھولیں', logout:'ایپ لاک کریں', allCaughtUp:'سب ٹھیک', cashSales:'نقد فروخت',
 custPay:'گاہکوں کی ادائیگیاں', supPay:'سپلائرز کی ادائیگیاں', withdrawals:'مالک کی نکاسی', otherInc:'دیگر آمدنی',
 closingBal:'اختتامی بیلنس', todaySales:'فروخت', purchase:'خریداری', expense:'خرچ', payment:'ادائیگی',
 adjustment:'ایڈجسٹمنٹ', damage:'خراب/ختم شدہ', sale:'فروخت', ret:'واپسی', void:'منسوخ', open:'کھلا', closed:'بند'
}};
var LANG = 'en';
function T(k){ var d = I18N[LANG] || I18N.en; return d[k] !== undefined ? d[k] : (I18N.en[k] || k); }

/* ---------------- DB layer (real vs demo workspace) ---------------- */
var DB = {
  pfx: 'jksm_',
  get: function(k, def){ try{ var v = localStorage.getItem(this.pfx + k); return v === null ? def : JSON.parse(v); }catch(e){ return def; } },
  set: function(k, v){ try{ localStorage.setItem(this.pfx + k, JSON.stringify(v)); }catch(e){} },
  all: function(){ var o = {}, keys = ['settings','products','sales','purchases','cust','custTx','sup','supTx','cash','exp','moves','sessions','reminders','audit']; for (var i=0;i<keys.length;i++) o[keys[i]] = this.get(keys[i], null); return o; }
};
function newId(p){ return (p||'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function todayStr(ts){ var d = new Date(ts || Date.now()); return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2); }
function dayStart(ts){ var d = new Date(ts || Date.now()); d.setHours(0,0,0,0); return d.getTime(); }
function fmt(n){ n = Math.round((+n || 0) * 100) / 100; return 'Rs ' + n.toLocaleString('en-PK'); }
function fmtDate(ts){ var d = new Date(ts); return d.toLocaleDateString(LANG === 'ur' ? 'ur-PK' : 'en-PK', {day:'numeric', month:'short', year:'numeric'}); }
function fmtTime(ts){ var d = new Date(ts); return d.toLocaleTimeString(LANG === 'ur' ? 'ur-PK' : 'en-PK', {hour:'2-digit', minute:'2-digit'}); }
function esc(s){ return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function num(v){ var n = parseFloat(v); return isNaN(n) ? 0 : n; }
function r2(n){ return Math.round((+n || 0) * 100) / 100; }

/* ---------------- Categories / units / expense cats ---------------- */
var CATS = [
  {id:'atta',en:'Atta & Flour',ur:'آٹا اور میدہ'},{id:'rice',en:'Rice',ur:'چاول'},
  {id:'daal',en:'Daal & Lentils',ur:'دالیں'},{id:'sugar',en:'Sugar',ur:'چینی'},
  {id:'oil',en:'Cooking Oil & Ghee',ur:'تیل اور گھی'},{id:'dairy',en:'Milk & Dairy',ur:'دودھ اور ڈیری'},
  {id:'tea',en:'Tea',ur:'چائے'},{id:'snacks',en:'Biscuits & Snacks',ur:'بسکٹ اور نمکو'},
  {id:'drinks',en:'Drinks',ur:'مشروبات'},{id:'spices',en:'Spices',ur:'مصالحے'},
  {id:'care',en:'Personal Care',ur:'ذاتی نگہداشت'},{id:'house',en:'Household Items',ur:'گھریلو اشیاء'}
];
var DEF_UNITS = ['kg','g','litre','ml','packet','piece','carton','dozen'];
var UNIT_UR = {kg:'کلو', g:'گرام', litre:'لیٹر', ml:'ملی لیٹر', packet:'پیکٹ', piece:'عدد', carton:'کارٹن', dozen:'درجن'};
var EXP_CATS = [['rent','Rent / کرایہ'],['electricity','Electricity / بجلی'],['transport','Transport / کرایہ گاڑی'],['salaries','Salaries / تنخواہ'],['packaging','Packaging / پیکنگ'],['misc','Misc / متفرق']];
function unitName(u){ if (LANG === 'ur' && UNIT_UR[u]) return UNIT_UR[u]; return u; }
function catName(id){ for (var i=0;i<CATS.length;i++) if (CATS[i].id === id) return LANG === 'ur' ? CATS[i].ur : CATS[i].en; return id; }

/* Seed products: [id, nameEn, nameUr, cat, unit, pack, buy, sell, stock, min] */
var SEED_PRODUCTS = [
 ['atta-20','Fine Atta','فائن آٹا','atta','kg','20 kg',2650,2850,30,5],
 ['atta-10','Fine Atta','فائن آٹا','atta','kg','10 kg',1350,1450,45,8],
 ['rice-bas5','Basmati Rice','باسمتی چاول','rice','kg','5 kg',1750,1950,25,5],
 ['daal-moong','Moong Daal','مونگ دال','daal','kg','1 kg',290,320,40,8],
 ['daal-masoor','Masoor Daal','مسور دال','daal','kg','1 kg',250,280,45,8],
 ['sugar-5','Sugar','چینی','sugar','kg','5 kg',680,720,55,10],
 ['sugar-1','Sugar','چینی','sugar','kg','1 kg',140,150,80,15],
 ['oil-5','Cooking Oil','کھانے کا تیل','oil','litre','5 litre',2280,2450,20,4],
 ['oil-1','Cooking Oil','کھانے کا تیل','oil','litre','1 litre',480,520,60,10],
 ['ghee-1','Desi Ghee','دیسی گھی','oil','kg','1 kg',1700,1850,15,3],
 ['milk-1','Fresh Milk','تازہ دودھ','dairy','litre','1 litre',160,190,50,10],
 ['eggs-12','Eggs','انڈے','dairy','dozen','1 dozen',340,380,40,8],
 ['tea-950','Black Tea','کالی چائے','tea','g','950 g',1520,1650,22,4],
 ['tea-475','Black Tea','کالی چائے','tea','475 g',780,850,35,6],
 ['bisc-glu','Glucose Biscuits','گلوکوز بسکٹ','snacks','packet','family pack',155,180,70,12],
 ['nimko-250','Nimko Mix','نمکو مکس','snacks','g','250 g',125,150,60,10],
 ['salt-1','Salt','نمک','spices','kg','1 kg',90,110,60,10],
 ['haldi-200','Haldi Powder','ہلدی','spices','g','200 g',140,170,40,8],
 ['mirch-200','Red Chilli Powder','سرخ مرچ','spices','g','200 g',220,260,35,6],
 ['surf-1','Detergent Powder','سرف','house','kg','1 kg',380,430,45,8],
 ['soap-4','Bath Soap','نہانے کا صابن','care','packet','pack of 4',320,370,40,8],
 ['shampoo-400','Shampoo','شیمپو','care','ml','400 ml',520,590,25,5],
 ['cola-15','Cola Drink','کولا ڈرنک','drinks','litre','1.5 litre',180,210,60,12],
 ['juice-1','Mango Juice','آم کا جوس','drinks','litre','1 litre',240,280,40,8]
];
function seedProducts(){ return SEED_PRODUCTS.map(function(r,i){ return { id:r[0], sku:'SKU-'+(1000+i), nameEn:r[1], nameUr:r[2], cat:r[3], unit:r[4], pack:r[5], buy:r[6], sell:r[7], stock:r[8], min:r[9], expiry:'', batch:'', archived:false }; }); }
function seedDemoExtra(){
  /* fictional demo customers/suppliers/txns for demo workspace */
  var cust = [
    {id:'c1', name:'Ahmed Khan', phone:'03001234567', addr:'Street 5, Lahore', open:0, note:'', ts:Date.now()-86400000*20},
    {id:'c2', name:'Bilal Ahmed', phone:'03007654321', addr:'Main Bazaar', open:1500, note:'', ts:Date.now()-86400000*15}
  ];
  var sup = [
    {id:'s1', name:'Al-Noor Traders', phone:'03009876543', addr:'Wholesale Market', openPay:0, note:'', ts:Date.now()-86400000*25}
  ];
  return {cust:cust, sup:sup};
}

/* ---------------- PURE LOGIC (testable) ---------------- */
function calcBill(items, discPct, discFix){
  /* items: [{qty, price}] */
  var sub = 0, i;
  for (i=0;i<items.length;i++) sub += num(items[i].qty) * num(items[i].price);
  sub = r2(sub);
  var d1 = r2(sub * num(discPct) / 100), d2 = r2(num(discFix));
  var disc = r2(Math.min(sub, d1 + d2));
  return { sub:sub, disc:disc, total:r2(sub - disc) };
}
function custBalance(txns, open, custId){
  var b = num(open);
  for (var i=0;i<txns.length;i++){ if (txns[i].custId !== custId) continue; b += num(txns[i].dr) - num(txns[i].cr); }
  return r2(b);
}
function supBalance(txns, openPay, supId){
  var b = num(openPay);
  for (var i=0;i<txns.length;i++){ if (txns[i].supId !== supId) continue; b += num(txns[i].cr) - num(txns[i].dr); }
  return r2(b);
}
function cashSums(txns){
  /* returns {cash, bank, wallet} net sums; opening included with via */
  var s = {cash:0, bank:0, wallet:0};
  for (var i=0;i<txns.length;i++){ var v = txns[i].via || 'cash'; if (s[v] === undefined) s[v] = 0; s[v] = r2(s[v] + num(txns[i].amt)); }
  return s;
}
function sessionTxns(txns, sessId){ return txns.filter(function(t){ return t.sess === sessId; }); }
function sessionExpected(sess, cashTxns){
  var tx = sessionTxns(cashTxns, sess.id);
  var cash = num(sess.openCash), bank = num(sess.openBank), wallet = num(sess.openWallet);
  for (var i=0;i<tx.length;i++){ var v = tx[i].via || 'cash'; var a = num(tx[i].amt);
    if (v === 'cash') cash = r2(cash + a); else if (v === 'bank') bank = r2(bank + a); else wallet = r2(wallet + a); }
  return {cash:cash, bank:bank, wallet:wallet};
}
function stockVal(products){ var v = 0; for (var i=0;i<products.length;i++){ if (products[i].archived) continue; v += num(products[i].stock) * num(products[i].buy); } return r2(v); }
function saleProfit(sale){
  var rev = 0, cogs = 0, missing = false, i, it;
  for (i=0;i<sale.items.length;i++){ it = sale.items[i]; rev += num(it.qty)*num(it.price);
    if (!(num(it.cost) > 0)) missing = true;
    cogs += num(it.qty) * num(it.cost); }
  if (sale.total !== undefined && sale.total !== null) rev = num(sale.total); /* actual discounted revenue */
  return { revenue:r2(rev), cogs:r2(cogs), profit:r2(rev - cogs), estimated:missing };
}
function rangeTxns(arr, from, to){ return arr.filter(function(t){ return t.ts >= from && t.ts < to; }); }
function billNo(seq){ return 'JKS-BILL-' + String(seq).padStart(4,'0'); }

/* ---------------- Settings / session state ---------------- */
var S = null;            /* settings */
var CUR = { view:'dash', sessId:null, billKey:null, custId:null, supId:null, repFrom:null, repTo:null, cat:'all', q:'', showArch:false };
function loadSettings(){
  S = DB.get('settings', null);
  if (!S){ S = { shopName:'Jilan Karyana Store', phone:'', address:'', wa:'', pinHash:'', lang:'en',
    allowNeg:false, units:DEF_UNITS.slice(), billSeq:1, demo:false, expCats:EXP_CATS.map(function(e){return e[0];}) };
    DB.set('settings', S); }
  if (!S.units || !S.units.length) S.units = DEF_UNITS.slice();
  LANG = S.lang || 'en';
}
function saveSettings(){ S.lang = LANG; DB.set('settings', S); }
function audit(action, detail){
  var a = DB.get('audit', []); a.unshift({id:newId('au'), ts:Date.now(), action:action, detail:detail || ''});
  DB.set('audit', a.slice(0,500));
}
function curSession(){
  var ss = DB.get('sessions', []);
  for (var i=ss.length-1;i>=0;i--) if (ss[i].status === 'open') return ss[i];
  return null;
}

/* ---------------- UI helpers ---------------- */
function $(id){ return document.getElementById(id); }
function view(){ return $('view'); }
function toast(msg){ var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 2600); }
function modal(html){
  closeModal();
  var b = document.createElement('div'); b.className = 'modal-back'; b.id = 'mback';
  b.innerHTML = '<div class="modal">' + html + '</div>';
  b.addEventListener('click', function(e){ if (e.target === b) closeModal(); });
  document.body.appendChild(b);
}
function closeModal(){ var b = $('mback'); if (b) b.remove(); }
function confirmDlg(msg, onYes){
  modal('<h3>' + esc(T('confirm')) + '</h3><p>' + esc(msg) + '</p>' +
    '<div class="row2"><button class="btn btn-gray btn-block" onclick="KSM.closeModal()">' + esc(T('cancel')) + '</button>' +
    '<button class="btn btn-red btn-block" id="cf-yes">' + esc(T('confirm')) + '</button></div>');
  $('cf-yes').onclick = function(){ closeModal(); onYes(); };
}
function pkPhoneOk(p){ return /^0?3\d{9}$/.test(String(p||'').replace(/[\s-]/g,'')); }
function waNum(p){ var d = String(p||'').replace(/\D/g,''); if (d.charAt(0) === '0') d = '92' + d.slice(1); return d; }
function setLang(l){ LANG = l; S.lang = l; saveSettings(); applyLang(); render(); }
function applyLang(){
  document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ur' ? 'rtl' : 'ltr';
  $('lang-btn').textContent = LANG === 'ur' ? 'English' : 'اردو';
  $('hdr-shop').textContent = S.shopName || 'Jilan Karyana Store';
  $('banner-text').textContent = 'DEMO by Jilan Apps — ' + (LANG === 'ur' ? 'ڈیمو ڈیٹا' : 'demo data only');
  $('demo-banner').style.display = S.demo ? '' : 'none';
  $('footer-note').textContent = LANG === 'ur'
    ? 'ڈیٹا صرف اسی ڈیوائس پر محفوظ ہے (localStorage) — کوئی کلاؤڈ نہیں۔'
    : 'Data stored only on this device (localStorage) — no cloud.';
}
function download(name, content, mime){
  var b = new Blob([content], {type: mime || 'text/plain'});
  var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function csvEsc(v){ v = String(v === undefined || v === null ? '' : v); return '"' + v.replace(/"/g,'""') + '"'; }

/* ---------------- PIN lock ---------------- */
var pinBuf = '', pinMode = 'set1', pinFirst = '';
function showLock(){
  $('app-header').style.display = 'none'; $('bottom-nav').style.display = 'none';
  if (S.demo){ $('banner-text').textContent = 'DEMO by Jilan Apps — ' + (LANG === 'ur' ? 'ڈیمو ڈیٹا' : 'demo data only'); $('demo-banner').style.display = ''; }
  pinBuf = ''; pinMode = S.pinHash ? 'enter' : 'set1';
  renderPin();
}
function renderPin(){
  var title = pinMode === 'enter' ? T('lockTitle') : (pinMode === 'set1' ? T('setPin') : T('pinAgain'));
  var dots = ''; for (var i=0;i<4;i++) dots += '<span class="' + (i < pinBuf.length ? 'f' : '') + '"></span>';
  var keys = ''; for (var k=1;k<=9;k++) keys += '<button data-k="' + k + '">' + k + '</button>';
  keys += '<button data-k="c">⌫</button><button data-k="0">0</button><button data-k="ok">✓</button>';
  var demoHint = (pinMode === 'set1')
    ? '<p class="demo-hint">' + (LANG === 'ur'
        ? '🛈 ڈیمو ہے — کوئی بھی 4 ہندسے دبا کر آگے بڑھیں'
        : '🛈 This is a DEMO — press any 4 digits to continue') + '</p>' +
      '<button class="btn btn-gray btn-sm" id="demo-skip" style="margin-top:10px">' +
      (LANG === 'ur' ? 'بغیر PIN ڈیمو دیکھیں →' : 'Skip PIN — view demo →') + '</button>'
    : '';
  view().innerHTML = '<div class="lock-wrap"><div class="logo-badge" style="margin:0 auto 10px;width:56px;height:56px">' +
    '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>' +
    '<h2>' + esc(S.shopName || 'Jilan Karyana Store') + '</h2><p style="color:var(--muted)">' + esc(title) + '</p>' +
    '<div class="pin-dots">' + dots + '</div><div class="kbd-pin">' + keys + '</div>' + demoHint + '</div>';
  var btns = view().querySelectorAll('.kbd-pin button');
  for (var i=0;i<btns.length;i++) btns[i].onclick = function(){ pinKey(this.getAttribute('data-k')); };
  var sk = $('demo-skip');
  if (sk) sk.onclick = function(){ try{sessionStorage.setItem('jksm_unlocked','1');}catch(e){} unlock(); };
}
function pinKey(k){
  if (k === 'c'){ pinBuf = pinBuf.slice(0,-1); }
  else if (k === 'ok'){ pinSubmit(); return; }
  else if (pinBuf.length < 4 && /^\d$/.test(k)){ pinBuf += k; if (pinBuf.length === 4) setTimeout(pinSubmit, 250); }
  renderPin();
}
function pinSubmit(){
  if (pinBuf.length !== 4) return;
  if (pinMode === 'enter'){
    if (sha256('jksm-pin:' + pinBuf) === S.pinHash){ unlock(); }
    else { toast(T('pinWrong')); pinBuf = ''; renderPin(); }
  } else if (pinMode === 'set1'){ pinFirst = pinBuf; pinBuf = ''; pinMode = 'set2'; renderPin(); }
  else { if (pinBuf !== pinFirst){ toast(T('pinMismatch')); pinBuf=''; pinMode='set1'; renderPin(); }
    else { S.pinHash = sha256('jksm-pin:' + pinBuf); saveSettings(); audit('pin_set','PIN created'); unlock(); } }
}
function unlock(){
  try{ sessionStorage.setItem('jksm_unlocked','1'); }catch(e){}
  $('app-header').style.display = ''; $('bottom-nav').style.display = '';
  applyLang(); render();
}
function isUnlocked(){ try{ return sessionStorage.getItem('jksm_unlocked') === '1'; }catch(e){ return false; } }
function lockApp(){ try{ sessionStorage.removeItem('jksm_unlocked'); }catch(e){} showLock(); }

/* ---------------- Navigation ---------------- */
var NAV = [
  {id:'dash', icon:'📊', k:'dashboard'},
  {id:'bill', icon:'🧾', k:'bill'},
  {id:'stock', icon:'📦', k:'stock'},
  {id:'khata', icon:'📒', k:'khata'},
  {id:'more', icon:'⋯', k:'more'}
];
function renderNav(){
  var n = $('bottom-nav'), h = '';
  for (var i=0;i<NAV.length;i++) h += '<button data-v="' + NAV[i].id + '" class="' + (CUR.view === NAV[i].id ? 'on' : '') + '"><span>' + NAV[i].icon + '</span>' + esc(T(NAV[i].k)) + '</button>';
  n.innerHTML = h;
  var bs = n.querySelectorAll('button');
  for (var j=0;j<bs.length;j++) bs[j].onclick = function(){ go(this.getAttribute('data-v')); };
}
function go(v){ CUR.view = v; renderNav(); render(); window.scrollTo(0,0); }
function render(){
  if (!isUnlocked()){ showLock(); return; }
  if (demoGate()) return;
  renderNav();
  var v = CUR.view;
  if (v === 'dash') vDash();
  else if (v === 'bill') vBill();
  else if (v === 'sales') vSalesHist();
  else if (v === 'stock') vStock();
  else if (v === 'khata') vKhata();
  else if (v === 'more') vMore();
  else if (v === 'cash') vCash();
  else if (v === 'reports') vReports();
  else if (v === 'backup') vBackup();
  else if (v === 'settings') vSettings();
  else if (v === 'purchases') vPurchases();
  else if (v === 'expenses') vExpenses();
}
function rangeFor(f){
  var now = Date.now(), ds = dayStart(now);
  if (f === 'today') return [ds, ds + 86400000];
  if (f === 'yesterday') return [ds - 86400000, ds];
  if (f === 'month'){ var d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return [d.getTime(), ds + 86400000]; }
  if (f === 'custom' && CUR.repFrom) return [CUR.repFrom, (CUR.repTo || now) + 86400000];
  return [ds, ds + 86400000];
}
function rangeTabs(cur, cb){
  var fs = ['today','yesterday','month','custom'], h = '<div class="tabs">';
  for (var i=0;i<fs.length;i++) h += '<button data-f="' + fs[i] + '" class="' + (cur === fs[i] ? 'on' : '') + '">' + esc(T(fs[i])) + '</button>';
  h += '</div>';
  return h;
}
function bindRangeTabs(cb){
  var bs = view().querySelectorAll('.tabs button');
  for (var i=0;i<bs.length;i++) bs[i].onclick = function(){
    var f = this.getAttribute('data-f');
    if (f === 'custom'){
      modal('<h3>' + esc(T('custom')) + '</h3><div class="form"><label>' + esc(T('date')) + ' (' + esc(T('byDate')) + ')</label>' +
        '<div class="row2"><input type="date" id="rf" value="' + todayStr() + '"><input type="date" id="rt" value="' + todayStr() + '"></div>' +
        '<button class="btn btn-green btn-block" id="rf-go">' + esc(T('viewAll')) + '</button></div>');
      $('rf-go').onclick = function(){ var a = $('rf').value, b = $('rt').value;
        CUR.repFrom = a ? new Date(a + 'T00:00:00').getTime() : null; CUR.repTo = b ? new Date(b + 'T00:00:00').getTime() : null;
        closeModal(); cb('custom'); };
      return;
    }
    cb(f);
  };
}

/* ---------------- Dashboard ---------------- */
var dashFilter = 'today';
function vDash(){
  var r = rangeFor(dashFilter), sales = rangeTxns(DB.get('sales', []).filter(function(s){return s.status === 'ok';}), r[0], r[1]);
  var cash = rangeTxns(DB.get('cash', []), r[0], r[1]);
  var exps = rangeTxns(DB.get('exp', []), r[0], r[1]);
  var totSales = r2(sales.reduce(function(a,s){return a + num(s.total);},0));
  var cashIn = r2(cash.filter(function(c){return num(c.amt) > 0;}).reduce(function(a,c){return a + num(c.amt);},0));
  var totExp = r2(exps.reduce(function(a,e){return a + num(e.amt);},0));
  var gp = r2(sales.reduce(function(a,s){return a + saleProfit(s).profit;},0));
  var cust = DB.get('cust', []), custTx = DB.get('custTx', []);
  var recv = r2(cust.reduce(function(a,c){return a + custBalance(custTx, c.open, c.id);},0));
  var sup = DB.get('sup', []), supTx = DB.get('supTx', []);
  var pay = r2(sup.reduce(function(a,s){return a + supBalance(supTx, s.openPay, s.id);},0));
  var prods = DB.get('products', []).filter(function(p){return !p.archived;});
  var low = prods.filter(function(p){return num(p.stock) <= num(p.min);}).length;
  var sess = curSession();
  var allSales = DB.get('sales', []).filter(function(s){return s.status === 'ok';}).sort(function(a,b){return b.ts - a.ts;}).slice(0,6);
  var h = rangeTabs(dashFilter) +
    '<div class="stat-grid">' +
    stat(T('salesToday'), fmt(totSales), '') +
    stat(T('cashIn'), fmt(cashIn), '') +
    stat(T('expenses'), fmt(totExp), '') +
    stat(T('grossProfit'), fmt(gp), gp < 0 ? 'warn' : 'good') +
    stat(T('receivables'), fmt(recv), recv > 0 ? 'warn' : '') +
    stat(T('payables'), fmt(pay), pay > 0 ? 'warn' : '') +
    stat(T('products'), prods.length, '') +
    stat(T('lowStock'), low, low > 0 ? 'warn' : '') +
    '</div>' +
    (sess ? '<div class="note">🟢 ' + esc(T('dayOpen')) + ': ' + esc(fmtDate(sess.ts)) + ' ' + esc(fmtTime(sess.ts)) + ' · ' + esc(T('openingCash')) + ': ' + esc(fmt(sess.openCash)) + '</div>'
          : '<div class="note">⚪ ' + esc(T('noOpen')) + ' — ' + esc(T('dayOpen')) + ' ' + esc(T('cashbook')) + ' →</div>') +
    '<div class="section-title">' + esc(T('recentTx')) + '</div><div class="card">' +
    (allSales.length ? allSales.map(function(s){
      return '<div class="list-item"><div class="grow"><div class="t">' + esc(s.no) + ' · ' + esc(fmt(s.total)) + '</div><div class="s">' + esc(fmtDate(s.ts)) + ' ' + esc(fmtTime(s.ts)) + ' · ' + esc(s.custName || T('walkin')) + '</div></div>' +
        '<button class="btn btn-gray btn-sm" data-inv="' + s.id + '">' + esc(T('reprint')) + '</button></div>';
    }).join('') : '<div class="s">' + esc(T('noData')) + '</div>') + '</div>' +
    '<div class="section-title">⚡</div><div class="qa-grid">' +
    '<button class="qa" data-qa="sale">🧾<br>' + esc(T('newSale')) + '</button>' +
    '<button class="qa" data-qa="purchase">📥<br>' + esc(T('addStock')) + '</button>' +
    '<button class="qa" data-qa="cust">👤<br>' + esc(T('addCustomer')) + '</button>' +
    '<button class="qa" data-qa="pay">💵<br>' + esc(T('receivePay')) + '</button>' +
    '<button class="qa" data-qa="exp">💸<br>' + esc(T('addExpense')) + '</button>' +
    '<button class="qa" data-qa="close">🔒<br>' + esc(T('logout')) + '</button>' +
    '</div>';
  view().innerHTML = h;
  bindRangeTabs(function(f){ dashFilter = f; render(); });
  var qs = view().querySelectorAll('[data-qa]');
  for (var i=0;i<qs.length;i++) qs[i].onclick = function(){
    var q = this.getAttribute('data-qa');
    if (q === 'sale') go('bill');
    else if (q === 'purchase'){ CUR.view = 'purchases'; CUR.sub = 'new'; renderNav(); render(); }
    else if (q === 'cust'){ go('khata'); setTimeout(function(){ khataTab('cust'); openCustForm(); }, 50); }
    else if (q === 'pay'){ go('khata'); }
    else if (q === 'exp'){ CUR.view = 'expenses'; CUR.sub = 'new'; renderNav(); render(); }
    else if (q === 'close') lockApp();
  };
  var invs = view().querySelectorAll('[data-inv]');
  for (var j=0;j<invs.length;j++) invs[j].onclick = function(){ openInvoice(this.getAttribute('data-inv')); };
}
function stat(lbl, val, cls){ return '<div class="stat ' + (cls||'') + '"><div class="lbl">' + esc(lbl) + '</div><div class="val">' + esc(val) + '</div></div>'; }

/* ---------------- NEW SALE / BILLING ---------------- */
var bill = null;
function vBill(){
  if (!bill || bill.done){
    bill = { key: newId('bill'), lines: [], custId: '', custName: '', discPct: 0, discFix: 0, paid: 0, method: 'cash', done: false };
  }
  var custs = DB.get('cust', []);
  var h = '<div class="section-title">🧾 ' + esc(T('bill')) + '</div>' +
    '<div class="card"><label style="font-size:13px;font-weight:700;color:var(--muted)">' + esc(T('customer')) + '</label>' +
    '<select id="b-cust" class="searchbar" style="margin-top:4px"><option value="">' + esc(T('walkin')) + '</option>' +
    custs.map(function(c){ return '<option value="' + c.id + '"' + (bill.custId === c.id ? ' selected' : '') + '>' + esc(c.name) + ' (' + esc(fmt(custBalance(DB.get('custTx', []), c.open, c.id))) + ')</option>'; }).join('') + '</select>' +
    '<input id="b-q" class="searchbar" placeholder="' + esc(T('search')) + ' ' + esc(T('products')) + '" autocomplete="off">' +
    '<div id="b-res"></div></div>' +
    '<div class="section-title">' + esc(T('items')) + '</div>' +
    '<div class="card"><div id="b-lines"></div>' +
    '<div class="totals"><div class="r"><span>' + esc(T('subtotal')) + '</span><b id="t-sub">Rs 0</b></div>' +
    '<div class="r"><span>' + esc(T('discount')) + ' <input id="b-dp" type="number" min="0" max="100" step="any" style="width:56px" placeholder="%"> + <input id="b-df" type="number" min="0" step="any" style="width:80px" placeholder="Rs"></span><b id="t-disc">Rs 0</b></div>' +
    '<div class="r grand"><span>' + esc(T('grandTotal')) + '</span><b id="t-total">Rs 0</b></div>' +
    '<div class="r"><span>' + esc(T('paid')) + '</span><input id="b-paid" type="number" min="0" step="any" style="width:110px"></div>' +
    '<div class="r"><span>' + esc(T('balance')) + '</span><b id="t-bal">Rs 0</b></div>' +
    '<div class="r"><span>' + esc(T('method')) + '</span><select id="b-method"><option value="cash">' + esc(T('cash')) + '</option><option value="bank">' + esc(T('bank')) + '</option><option value="wallet">' + esc(T('wallet')) + '</option><option value="credit">' + esc(T('credit')) + '</option></select></div>' +
    '</div>' +
    '<button class="btn btn-green btn-block" id="b-confirm">✅ ' + esc(T('confirmSale')) + '</button></div>';
  view().innerHTML = h;
  $('b-cust').onchange = function(){ bill.custId = this.value; var c = getCust(this.value); bill.custName = c ? c.name : ''; };
  $('b-q').oninput = function(){ billSearch(this.value); };
  $('b-dp').oninput = function(){ bill.discPct = num(this.value); billTotals(); };
  $('b-df').oninput = function(){ bill.discFix = num(this.value); billTotals(); };
  $('b-paid').oninput = function(){ bill.paid = num(this.value); billTotals(); };
  $('b-method').onchange = function(){ bill.method = this.value; };
  $('b-confirm').onclick = confirmSale;
  billLines(); billTotals();
}
function getCust(id, arr){ var a = arr || DB.get('cust', []); for (var i=0;i<a.length;i++) if (a[i].id === id) return a[i]; return null; }
function getSup(id, arr){ var a = arr || DB.get('sup', []); for (var i=0;i<a.length;i++) if (a[i].id === id) return a[i]; return null; }
function getProd(id, arr){ var a = arr || DB.get('products', []); for (var i=0;i<a.length;i++) if (a[i].id === id) return a[i]; return null; }
function pname(p){ return LANG === 'ur' ? (p.nameUr || p.nameEn) : (p.nameEn || p.nameUr); }
function billSearch(q){
  q = (q || '').trim().toLowerCase(); var box = $('b-res');
  if (!q){ box.innerHTML = ''; return; }
  var ps = DB.get('products', []).filter(function(p){ return !p.archived && (p.nameEn.toLowerCase().indexOf(q) >= 0 || (p.nameUr||'').indexOf(q) >= 0 || (p.sku||'').toLowerCase().indexOf(q) >= 0); }).slice(0, 12);
  box.innerHTML = ps.map(function(p){
    return '<div class="list-item"><div class="grow"><div class="t">' + esc(pname(p)) + '</div><div class="s">' + esc(fmt(p.sell)) + ' / ' + esc(unitName(p.unit)) + ' · ' + esc(T('stock')) + ': ' + esc(p.stock) + '</div></div>' +
      '<button class="btn btn-green btn-sm" data-add="' + p.id + '">' + esc(T('addItem')) + '</button></div>';
  }).join('') || '<div class="note">' + esc(T('noData')) + '</div>';
  var bs = box.querySelectorAll('[data-add]');
  for (var i=0;i<bs.length;i++) bs[i].onclick = function(){ billAdd(this.getAttribute('data-add')); };
}
function billAdd(pid){
  var p = getProd(pid); if (!p) return;
  bill.lines.push({ pid: p.id, name: pname(p), qty: 1, unit: p.unit, price: p.sell, cost: p.buy });
  $('b-q').value = ''; $('b-res').innerHTML = ''; billLines(); billTotals();
}
function billLines(){
  var box = $('b-lines'); if (!box) return;
  if (!bill.lines.length){ box.innerHTML = '<div class="s" style="color:var(--muted)">' + esc(T('noData')) + '</div>'; return; }
  box.innerHTML = bill.lines.map(function(l, i){
    return '<div class="bill-line"><div><b>' + esc(l.name) + '</b><br><span style="font-size:11px;color:var(--muted)">' + esc(fmt(l.price)) + '/' + esc(unitName(l.unit)) + '</span></div>' +
      '<input type="number" min="0" step="any" value="' + l.qty + '" data-lq="' + i + '" aria-label="qty">' +
      '<input type="number" min="0" step="any" value="' + l.price + '" data-lp="' + i + '" aria-label="price">' +
      '<b data-lt="' + i + '">' + esc(fmt(l.qty * l.price)) + '</b>' +
      '<button class="btn btn-gray btn-sm" data-lx="' + i + '">✕</button></div>';
  }).join('');
  bindLines(box);
}
function bindLines(box){
  var qs = box.querySelectorAll('[data-lq]'), ps = box.querySelectorAll('[data-lp]'), xs = box.querySelectorAll('[data-lx]');
  var i;
  for (i=0;i<qs.length;i++) qs[i].oninput = function(){ var ix = +this.getAttribute('data-lq'); bill.lines[ix].qty = num(this.value); billTotals(); };
  for (i=0;i<ps.length;i++) ps[i].oninput = function(){ var ix = +this.getAttribute('data-lp'); bill.lines[ix].price = num(this.value); billTotals(); };
  for (i=0;i<xs.length;i++) xs[i].onclick = function(){ bill.lines.splice(+this.getAttribute('data-lx'), 1); billLines(); billTotals(); };
}
function billTotals(){
  var c = calcBill(bill.lines, bill.discPct, bill.discFix);
  var bal = r2(c.total - num(bill.paid));
  var set = function(id, v){ var e = $(id); if (e) e.textContent = fmt(v); };
  set('t-sub', c.sub); set('t-disc', c.disc); set('t-total', c.total); set('t-bal', bal);
  var box = $('b-lines');
  if (box) bill.lines.forEach(function(l, i){ var e = box.querySelector('[data-lt="' + i + '"]'); if (e) e.textContent = fmt(l.qty * l.price); });
  bill._c = c; bill._bal = bal;
}
function confirmSale(){
  var btn = $('b-confirm'); if (!btn || btn.disabled) return;
  if (!bill.lines.length){ toast(T('noData')); return; }
  billTotals();
  var c = bill._c, prods = DB.get('products', []);
  /* stock check */
  for (var i=0;i<bill.lines.length;i++){ var l = bill.lines[i], p = getProd(l.pid, prods);
    if (!p) continue;
    if (!S.allowNeg && num(p.stock) < num(l.qty)){ toast(T('insufficient') + ': ' + pname(p) + ' (' + p.stock + ')'); return; }
  }
  if (bill.method === 'credit' && !bill.custId){ toast(T('customer') + ' ?'); return; }
  if (num(bill.paid) > c.total){ toast(T('paid') + ' > ' + T('grandTotal')); return; }
  btn.disabled = true; /* idempotency: block double submit */
  try{
    var sales = DB.get('sales', []);
    for (var s=0;s<sales.length;s++) if (sales[s].key === bill.key){ toast(T('dupWarn')); btn.disabled = false; return; }
    var no = billNo(S.billSeq++);
    var sale = { id:newId('sale'), key:bill.key, no:no, ts:Date.now(), date:todayStr(),
      custId:bill.custId || '', custName:bill.custName || T('walkin'),
      items:bill.lines.map(function(l){ return {pid:l.pid, name:l.name, qty:r2(num(l.qty)), unit:l.unit, price:r2(num(l.price)), cost:r2(num(l.cost)), total:r2(num(l.qty)*num(l.price))}; }),
      sub:c.sub, disc:c.disc, discPct:num(bill.discPct), discFix:num(bill.discFix),
      total:c.total, paid:r2(num(bill.paid)), bal:bill._bal, method:bill.method, status:'ok', note:'' };
    /* stock */
    var moves = DB.get('moves', []);
    sale.items.forEach(function(it){ var p = getProd(it.pid, prods); if (p){ p.stock = r2(num(p.stock) - num(it.qty)); moves.unshift({id:newId('mv'), ts:sale.ts, pid:p.id, chg:-num(it.qty), why:'sale', ref:sale.id}); } });
    DB.set('products', prods); DB.set('moves', moves);
    /* cash: only what was actually paid, via method */
    var cash = DB.get('cash', []), sess = curSession();
    if (sale.paid > 0) cash.unshift({id:newId('cs'), ts:sale.ts, kind:'sale', via:sale.method === 'credit' ? 'cash' : sale.method, amt:sale.paid, desc:sale.no, ref:sale.id, sess:sess ? sess.id : null});
    DB.set('cash', cash);
    /* customer ledger: debit full total, credit paid */
    if (sale.custId){ var ct = DB.get('custTx', []);
      ct.unshift({id:newId('ct'), ts:sale.ts, custId:sale.custId, kind:'sale', dr:sale.total, cr:sale.paid, desc:sale.no, ref:sale.id});
      DB.set('custTx', ct); }
    sales.unshift(sale); DB.set('sales', sales);
    audit('sale', sale.no + ' ' + fmt(sale.total));
    saveSettings();
    bill.done = true;
    toast(T('saleSaved') + ' ' + sale.no);
    openInvoice(sale.id);
  }catch(e){ btn.disabled = false; toast('Error: ' + e.message); }
}

/* ---------------- Invoice ---------------- */
function findSale(id){ var a = DB.get('sales', []); for (var i=0;i<a.length;i++) if (a[i].id === id) return a[i]; return null; }
function invoiceHTML(s){
  var pr = saleProfit(s);
  var rows = s.items.map(function(it, i){
    return '<tr><td>' + (i+1) + '. ' + esc(it.name) + '</td><td>' + esc(it.qty) + ' ' + esc(unitName(it.unit)) + '</td><td class="r">' + esc(fmt(it.price)) + '</td><td class="r">' + esc(fmt(it.total)) + '</td></tr>';
  }).join('');
  return '<div class="inv">' + (S.demo ? '<div style="text-align:center;border:2px dashed var(--danger);color:var(--danger);font-weight:800;padding:6px;border-radius:8px;margin-bottom:8px">DEMO by Jilan Apps — DEMO INVOICE</div>' : '') + '<div class="inv-head"><h2>' + esc(S.shopName) + '</h2>' +
    '<div>' + esc(S.address || '') + (S.phone ? ' · ' + esc(S.phone) : '') + '</div>' +
    '<div><b>' + esc(T('billNo')) + ':</b> ' + esc(s.no) + ' · <b>' + esc(T('date')) + ':</b> ' + esc(fmtDate(s.ts)) + ' ' + esc(fmtTime(s.ts)) + '</div>' +
    '<div><b>' + esc(T('customer')) + ':</b> ' + esc(s.custName) + '</div></div>' +
    '<table><tr><th>#</th><th>' + esc(T('items')) + '</th><th>' + esc(T('qty')) + '</th><th class="r">' + esc(T('price')) + '</th><th class="r">' + esc(T('total')) + '</th></tr>' +
    rows + '</table>' +
    '<table style="margin-top:8px"><tr><td>' + esc(T('subtotal')) + '</td><td class="r">' + esc(fmt(s.sub)) + '</td></tr>' +
    '<tr><td>' + esc(T('discount')) + '</td><td class="r">' + esc(fmt(s.disc)) + '</td></tr>' +
    '<tr><td><b>' + esc(T('grandTotal')) + '</b></td><td class="r"><b>' + esc(fmt(s.total)) + '</b></td></tr>' +
    '<tr><td>' + esc(T('paid')) + ' (' + esc(T(s.method)) + ')</td><td class="r">' + esc(fmt(s.paid)) + '</td></tr>' +
    '<tr><td><b>' + esc(T('balance')) + '</b></td><td class="r"><b>' + esc(fmt(s.bal)) + '</b></td></tr></table>' +
    (s.status !== 'ok' ? '<p style="color:var(--danger);font-weight:800">[' + esc(T(s.status)) + ']</p>' : '') +
    '<p style="text-align:center;font-size:12px;color:#666">Jilan Apps · ' + esc(T('dataLocal')) + '</p></div>';
}
function openInvoice(id){
  var s = findSale(id); if (!s) return;
  CUR.view = 'bill'; CUR.sub = 'inv'; CUR.invId = id; renderNav();
  view().innerHTML = '<button class="btn btn-gray btn-sm" onclick="KSM.go(\'sales\')">← ' + esc(T('back')) + '</button>' +
    '<div class="card" style="margin-top:10px" id="inv-card">' + invoiceHTML(s) + '</div>' +
    '<div class="row2" style="margin-top:10px">' +
    '<button class="btn btn-green" id="inv-print">🖨 ' + esc(T('print')) + '</button>' +
    '<button class="btn btn-gold" id="inv-wa">📲 ' + esc(T('shareWA')) + '</button></div>' +
    (s.status === 'ok' ? '<button class="btn btn-red btn-block" id="inv-void">↩ ' + esc(T('returns')) + '</button>' : '');
  $('inv-print').onclick = function(){ $('print-area').innerHTML = invoiceHTML(s); window.print(); };
  $('inv-wa').onclick = function(){ shareInvoiceWA(s); };
  var vv = $('inv-void');
  if (vv) vv.onclick = function(){ voidSale(s.id); };
}
function shareInvoiceWA(s){
  var lines = s.items.map(function(it){ return '• ' + it.name + ' — ' + it.qty + ' ' + unitName(it.unit) + ' × ' + fmt(it.price) + ' = ' + fmt(it.total); }).join('\n');
  var msg = (S.shopName || 'Jilan Karyana Store') + '\n' + T('billNo') + ': ' + s.no + '\n' + T('date') + ': ' + fmtDate(s.ts) + '\n' + T('customer') + ': ' + s.custName + '\n\n' + lines +
    '\n\n' + T('subtotal') + ': ' + fmt(s.sub) + '\n' + T('discount') + ': ' + fmt(s.disc) + '\n' + T('grandTotal') + ': ' + fmt(s.total) + '\n' + T('paid') + ': ' + fmt(s.paid) + '\n' + T('balance') + ': ' + fmt(s.bal);
  var c = s.custId ? getCust(s.custId) : null;
  var num_ = c && c.phone ? waNum(c.phone) : waNum(S.wa);
  if (!num_){ toast(T('waNumber') + ' ?'); return; }
  window.open('https://wa.me/' + num_ + '?text=' + encodeURIComponent(msg), '_blank');
  toast(T('waNote'));
}
function voidSale(id){
  var salesArr = DB.get('sales', []), s = null, si;
  for (si=0;si<salesArr.length;si++) if (salesArr[si].id === id) s = salesArr[si];
  if (!s || s.status !== 'ok') return;
  confirmDlg(T('billNo') + ' ' + s.no + ' — ' + T('returns') + '?' + (s.paid > 0 ? ' ⚠ ' + T('paid') + ' ' + fmt(s.paid) + ' — ' + (LANG === 'ur' ? 'رقم واپس الگ سے دیں' : 'refund separately') : ''), function(){
    var prods = DB.get('products', []), moves = DB.get('moves', []);
    s.items.forEach(function(it){ var p = getProd(it.pid, prods); if (p){ p.stock = r2(num(p.stock) + num(it.qty)); moves.unshift({id:newId('mv'), ts:Date.now(), pid:p.id, chg:num(it.qty), why:'void', ref:s.id}); } });
    DB.set('products', prods); DB.set('moves', moves);
    var cash = DB.get('cash', []), sess = curSession();
    if (s.paid > 0) cash.unshift({id:newId('cs'), ts:Date.now(), kind:'sale', via:s.method === 'credit' ? 'cash' : s.method, amt:-s.paid, desc:'VOID ' + s.no, ref:s.id, sess:sess ? sess.id : null});
    DB.set('cash', cash);
    if (s.custId){ var ct = DB.get('custTx', []);
      ct.unshift({id:newId('ct'), ts:Date.now(), custId:s.custId, kind:'void', dr:-s.total, cr:-s.paid, desc:'VOID ' + s.no, ref:s.id});
      DB.set('custTx', ct); }
    s.status = 'void'; DB.set('sales', salesArr);
    audit('sale_void', s.no + ' reversed');
    toast(T('billVoided')); render();
  });
}

/* ---------------- Sales history ---------------- */
var salesQ = '';
function vSalesHist(){
  var h = '<div class="section-title">🧾 ' + esc(T('salesHistory')) + '</div>' +
    '<input id="sq" class="searchbar" placeholder="' + esc(T('search')) + ' (' + esc(T('billNo')) + ' / ' + esc(T('customer')) + ' / ' + esc(T('date')) + ')" value="' + esc(salesQ) + '">' +
    '<div id="s-list"></div>';
  view().innerHTML = h;
  $('sq').oninput = function(){ salesQ = this.value; renderSalesList(); };
  renderSalesList();
}
function renderSalesList(){
  var q = salesQ.trim().toLowerCase();
  var arr = DB.get('sales', []).slice().sort(function(a,b){return b.ts - a.ts;});
  if (q) arr = arr.filter(function(s){ return s.no.toLowerCase().indexOf(q) >= 0 || (s.custName||'').toLowerCase().indexOf(q) >= 0 || s.date.indexOf(q) >= 0; });
  $('s-list').innerHTML = arr.slice(0, 80).map(function(s){
    var st = s.status === 'ok' ? '<span class="badge ok">' + esc(T('sale')) + '</span>' : '<span class="badge bad">' + esc(T(s.status)) + '</span>';
    return '<div class="list-item"><div class="grow"><div class="t">' + esc(s.no) + ' · ' + esc(fmt(s.total)) + ' ' + st + '</div><div class="s">' + esc(fmtDate(s.ts)) + ' · ' + esc(s.custName) + ' · ' + esc(T('paid')) + ' ' + esc(fmt(s.paid)) + ' · ' + esc(T('balance')) + ' ' + esc(fmt(s.bal)) + '</div></div>' +
      '<button class="btn btn-gray btn-sm" data-inv="' + s.id + '">' + esc(T('reprint')) + '</button></div>';
  }).join('') || '<div class="note">' + esc(T('noData')) + '</div>';
  var bs = $('s-list').querySelectorAll('[data-inv]');
  for (var i=0;i<bs.length;i++) bs[i].onclick = function(){ openInvoice(this.getAttribute('data-inv')); };
}

/* ---------------- INVENTORY ---------------- */
function vStock(){
  var h = '<div class="section-title">📦 ' + esc(T('inventory')) + ' <button class="link-btn" id="st-arch">' + esc(T('showArchived')) + '</button></div>' +
    '<div class="row2"><button class="btn btn-green" id="st-add">＋ ' + esc(T('addProduct')) + '</button>' +
    '<button class="btn btn-gold" id="st-pur">📥 ' + esc(T('purchases')) + '</button></div>' +
    '<input id="st-q" class="searchbar" placeholder="' + esc(T('search')) + '">' +
    '<div class="tabs" id="st-cats"></div><div id="st-list"></div>' +
    '<div class="note">💰 ' + esc(T('stockVal')) + ': <b id="st-val"></b></div>';
  view().innerHTML = h;
  var cats = '<button data-c="all" class="on">' + esc(T('viewAll')) + '</button>';
  CATS.forEach(function(c){ cats += '<button data-c="' + c.id + '">' + esc(LANG === 'ur' ? c.ur : c.en) + '</button>'; });
  $('st-cats').innerHTML = cats;
  var bs = $('st-cats').querySelectorAll('button');
  for (var i=0;i<bs.length;i++) bs[i].onclick = function(){ var b2 = $('st-cats').querySelectorAll('button'); for (var j=0;j<b2.length;j++) b2[j].className = ''; this.className = 'on'; CUR.cat = this.getAttribute('data-c'); renderStockList(); };
  $('st-q').oninput = function(){ CUR.q = this.value; renderStockList(); };
  $('st-add').onclick = function(){ prodForm(null); };
  $('st-pur').onclick = function(){ CUR.view = 'purchases'; CUR.sub = ''; renderNav(); render(); };
  $('st-arch').onclick = function(){ CUR.showArch = !CUR.showArch; renderStockList(); };
  renderStockList();
}
function renderStockList(){
  var q = (CUR.q || '').toLowerCase(), ps = DB.get('products', []);
  var arr = ps.filter(function(p){
    if (p.archived && !CUR.showArch) return false;
    if (!p.archived && CUR.showArch) return false;
    if (CUR.cat !== 'all' && p.cat !== CUR.cat) return false;
    if (q && p.nameEn.toLowerCase().indexOf(q) < 0 && (p.nameUr||'').indexOf(q) < 0 && (p.sku||'').toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  $('st-val').textContent = fmt(stockVal(ps));
  $('st-list').innerHTML = arr.slice(0,120).map(function(p){
    var low = num(p.stock) <= num(p.min);
    var badges = (p.archived ? '<span class="badge info">' + esc(T('archived')) + '</span> ' : '') +
      (low && !p.archived ? '<span class="badge warn">⚠ ' + esc(T('lowStock')) + '</span> ' : '');
    return '<div class="list-item' + (low && !p.archived ? ' low' : '') + '"><div class="grow"><div class="t">' + esc(pname(p)) + ' ' + badges + '</div>' +
      '<div class="s">' + esc(p.sku||'') + ' · ' + esc(catName(p.cat)) + ' · ' + esc(p.pack||'') + '</div>' +
      '<div class="s">💰 ' + esc(fmt(p.sell)) + ' / ' + esc(unitName(p.unit)) + ' · 📦 <b>' + esc(p.stock) + '</b></div></div>' +
      (p.archived ? '<button class="btn btn-gray btn-sm" data-un="' + p.id + '">↩</button>'
                  : '<button class="btn btn-gray btn-sm" data-ed="' + p.id + '">' + esc(T('edit')) + '</button>') + '</div>';
  }).join('') || '<div class="note">' + esc(T('noData')) + '</div>';
  var es = $('st-list').querySelectorAll('[data-ed]'), us = $('st-list').querySelectorAll('[data-un]');
  var i;
  for (i=0;i<es.length;i++) es[i].onclick = function(){ prodForm(this.getAttribute('data-ed')); };
  for (i=0;i<us.length;i++) us[i].onclick = function(){ var ap = DB.get('products', []), p = getProd(this.getAttribute('data-un'), ap); if (p){ p.archived = false; DB.set('products', ap); audit('product_unarchive', p.nameEn); renderStockList(); } };
}
function prodForm(id){
  var p = id ? getProd(id) : {id:newId('p'), sku:'', nameEn:'', nameUr:'', cat:'atta', unit:'kg', pack:'', buy:0, sell:0, stock:0, min:5, expiry:'', batch:'', archived:false};
  var units = S.units.map(function(u){ return '<option value="' + esc(u) + '"' + (p.unit === u ? ' selected' : '') + '>' + esc(unitName(u)) + '</option>'; }).join('');
  var cats = CATS.map(function(c){ return '<option value="' + c.id + '"' + (p.cat === c.id ? ' selected' : '') + '>' + esc(LANG === 'ur' ? c.ur : c.en) + '</option>'; }).join('');
  modal('<h3>' + esc(id ? T('edit') : T('addProduct')) + '</h3><div class="form">' +
    '<div class="row2"><div><label>' + esc(T('name')) + ' (EN)</label><input id="pf-en" value="' + esc(p.nameEn) + '"></div>' +
    '<div><label>' + esc(T('name')) + ' (UR)</label><input id="pf-ur" value="' + esc(p.nameUr || '') + '"></div></div>' +
    '<div class="row2"><div><label>' + esc(T('sku')) + '</label><input id="pf-sku" value="' + esc(p.sku || '') + '"></div>' +
    '<div><label>' + esc(T('category')) + '</label><select id="pf-cat">' + cats + '</select></div></div>' +
    '<div class="row3"><div><label>' + esc(T('unit')) + '</label><select id="pf-unit">' + units + '</select></div>' +
    '<div><label>' + esc(T('pack')) + '</label><input id="pf-pack" value="' + esc(p.pack || '') + '"></div>' +
    '<div><label>' + esc(T('batch')) + '</label><input id="pf-batch" value="' + esc(p.batch || '') + '"></div></div>' +
    '<div class="row3"><div><label>' + esc(T('buyPrice')) + '</label><input id="pf-buy" type="number" min="0" step="any" value="' + p.buy + '"></div>' +
    '<div><label>' + esc(T('sellPrice')) + '</label><input id="pf-sell" type="number" min="0" step="any" value="' + p.sell + '"></div>' +
    '<div><label>' + esc(T('stockAfter')) + '</label><input id="pf-stock" type="number" step="any" value="' + p.stock + '"></div></div>' +
    '<div class="row2"><div><label>' + esc(T('minStock')) + '</label><input id="pf-min" type="number" min="0" step="any" value="' + p.min + '"></div>' +
    '<div><label>' + esc(T('expiry')) + '</label><input id="pf-exp" type="date" value="' + esc(p.expiry || '') + '"></div></div>' +
    '<div class="row2" style="margin-top:12px"><button class="btn btn-green" id="pf-save">' + esc(T('save')) + '</button>' +
    '<button class="btn btn-gray" id="pf-x">' + esc(T('cancel')) + '</button></div>' +
    (id ? '<button class="btn btn-red btn-block" id="pf-del">' + esc(T('archive')) + ' / ' + esc(T('del')) + '</button>' : '') +
    '</div>');
  $('pf-x').onclick = closeModal;
  $('pf-save').onclick = function(){
    p.nameEn = $('pf-en').value.trim(); p.nameUr = $('pf-ur').value.trim();
    if (!p.nameEn){ toast(T('name') + ' ?'); return; }
    p.sku = $('pf-sku').value.trim(); p.cat = $('pf-cat').value; p.unit = $('pf-unit').value;
    p.pack = $('pf-pack').value.trim(); p.batch = $('pf-batch').value.trim();
    p.buy = r2(num($('pf-buy').value)); p.sell = r2(num($('pf-sell').value));
    p.min = num($('pf-min').value); p.expiry = $('pf-exp').value;
    var isNew = !getProd(p.id);
    if (isNew){
      var old = p.stock; p.stock = r2(num($('pf-stock').value));
      var ps = DB.get('products', []); ps.unshift(p); DB.set('products', ps);
      if (p.stock > 0){ var mv = DB.get('moves', []); mv.unshift({id:newId('mv'), ts:Date.now(), pid:p.id, chg:p.stock, why:'opening', ref:p.id}); DB.set('moves', mv); }
      audit('product_add', p.nameEn);
    } else {
      var allP = DB.get('products', []), ex = getProd(p.id, allP), diff = r2(num($('pf-stock').value) - num(ex.stock));
      ex.sku = p.sku; ex.nameEn = p.nameEn; ex.nameUr = p.nameUr; ex.cat = p.cat; ex.unit = p.unit; ex.pack = p.pack;
      ex.buy = p.buy; ex.sell = p.sell; ex.min = p.min; ex.expiry = p.expiry; ex.batch = p.batch;
      ex.stock = r2(num($('pf-stock').value));
      DB.set('products', allP);
      if (diff !== 0){ var mv2 = DB.get('moves', []); mv2.unshift({id:newId('mv'), ts:Date.now(), pid:ex.id, chg:diff, why:'adjustment', ref:ex.id}); DB.set('moves', mv2); audit('stock_adjust', ex.nameEn + ' ' + (diff > 0 ? '+' : '') + diff); }
      audit('product_edit', ex.nameEn);
    }
    closeModal(); renderStockList();
  };
  var del = $('pf-del');
  if (del) del.onclick = function(){
    var ex = getProd(p.id);
    var hasHist = DB.get('moves', []).some(function(m){ return m.pid === p.id; }) || DB.get('sales', []).some(function(s){ return s.items.some(function(it){ return it.pid === p.id; }); });
    var msg = hasHist ? T('archive') + ': ' + p.nameEn + ' (' + T('archived') + ')' : T('confirmDel');
    confirmDlg(msg, function(){
      if (hasHist){ ex.archived = true; audit('product_archive', ex.nameEn); }
      else { DB.set('products', DB.get('products', []).filter(function(x){ return x.id !== p.id; })); audit('product_delete', p.nameEn); }
      closeModal(); renderStockList();
    });
  };
}

/* ---------------- PURCHASES ---------------- */
var pur = null;
function vPurchases(){
  if (CUR.sub === 'new' || !pur || pur.done) pur = null;
  if (!pur){
    var h = '<div class="section-title">📥 ' + esc(T('purchases')) + '</div>' +
      '<button class="btn btn-green btn-block" id="pu-new">＋ ' + esc(T('newPurchase')) + '</button><div id="pu-list" style="margin-top:10px"></div>';
    view().innerHTML = h;
    $('pu-new').onclick = function(){ CUR.sub = 'new'; pur = {key:newId('pur'), lines:[], supId:'', supName:'', paid:0, done:false}; vPurForm(); };
    var arr = DB.get('purchases', []).slice().sort(function(a,b){return b.ts - a.ts;}).slice(0,40);
    $('pu-list').innerHTML = arr.map(function(x){
      return '<div class="list-item"><div class="grow"><div class="t">' + esc(fmt(x.total)) + ' · ' + esc(x.supName) + '</div><div class="s">' + esc(fmtDate(x.ts)) + ' · ' + esc(T('paid')) + ' ' + esc(fmt(x.paid)) + ' · ' + esc(T('balance')) + ' ' + esc(fmt(x.bal)) + '</div></div></div>';
    }).join('') || '<div class="note">' + esc(T('noData')) + '</div>';
    return;
  }
  vPurForm();
}
function vPurForm(){
  var sups = DB.get('sup', []);
  view().innerHTML = '<button class="btn btn-gray btn-sm" id="pu-back">← ' + esc(T('back')) + '</button>' +
    '<div class="section-title">📥 ' + esc(T('newPurchase')) + '</div>' +
    '<div class="card"><label style="font-size:13px;font-weight:700;color:var(--muted)">' + esc(T('supplier')) + '</label>' +
    '<select id="p-sup" class="searchbar" style="margin-top:4px"><option value="">—</option>' +
    sups.map(function(s){ return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('') + '</select>' +
    '<div class="note">➕ ' + esc(T('supplier')) + ': ' + esc(T('khata')) + ' → ' + esc(T('suppliers')) + '</div>' +
    '<input id="p-q" class="searchbar" placeholder="' + esc(T('search')) + ' ' + esc(T('products')) + '"><div id="p-res"></div></div>' +
    '<div class="card" style="margin-top:10px"><div id="p-lines"></div>' +
    '<div class="totals"><div class="r grand"><span>' + esc(T('total')) + '</span><b id="p-total">Rs 0</b></div>' +
    '<div class="r"><span>' + esc(T('paid')) + '</span><input id="p-paid" type="number" min="0" step="any" style="width:110px"></div></div>' +
    '<button class="btn btn-green btn-block" id="p-confirm">✅ ' + esc(T('confirm')) + '</button></div>';
  $('pu-back').onclick = function(){ pur = null; CUR.sub = ''; vPurchases(); };
  $('p-sup').onchange = function(){ pur.supId = this.value; var s = getSup(this.value); pur.supName = s ? s.name : ''; };
  $('p-q').oninput = function(){
    var q = this.value.trim().toLowerCase(), box = $('p-res');
    if (!q){ box.innerHTML = ''; return; }
    var ps = DB.get('products', []).filter(function(p){ return !p.archived && (p.nameEn.toLowerCase().indexOf(q) >= 0 || (p.nameUr||'').indexOf(q) >= 0); }).slice(0,10);
    box.innerHTML = ps.map(function(p){ return '<div class="list-item"><div class="grow"><div class="t">' + esc(pname(p)) + '</div><div class="s">' + esc(fmt(p.buy)) + ' / ' + esc(unitName(p.unit)) + '</div></div><button class="btn btn-green btn-sm" data-pa="' + p.id + '">＋</button></div>'; }).join('');
    var bs = box.querySelectorAll('[data-pa]');
    for (var i=0;i<bs.length;i++) bs[i].onclick = function(){ var p = getProd(this.getAttribute('data-pa')); pur.lines.push({pid:p.id, name:pname(p), qty:1, unit:p.unit, cost:p.buy}); $('p-q').value = ''; $('p-res').innerHTML = ''; purLines(); };
  };
  $('p-paid').oninput = function(){ pur.paid = num(this.value); };
  $('p-confirm').onclick = confirmPurchase;
  purLines();
}
function purLines(){
  var box = $('p-lines');
  box.innerHTML = pur.lines.length ? pur.lines.map(function(l, i){
    return '<div class="bill-line"><div><b>' + esc(l.name) + '</b></div>' +
      '<input type="number" min="0" step="any" value="' + l.qty + '" data-pq="' + i + '">' +
      '<input type="number" min="0" step="any" value="' + l.cost + '" data-pc="' + i + '">' +
      '<b data-pt="' + i + '">' + esc(fmt(l.qty * l.cost)) + '</b><button class="btn btn-gray btn-sm" data-px="' + i + '">✕</button></div>';
  }).join('') : '<div class="s" style="color:var(--muted)">' + esc(T('noData')) + '</div>';
  var qs = box.querySelectorAll('[data-pq]'), cs = box.querySelectorAll('[data-pc]'), xs = box.querySelectorAll('[data-px]');
  var i, upd = function(){ var t = r2(pur.lines.reduce(function(a,l){return a + num(l.qty)*num(l.cost);},0)); $('p-total').textContent = fmt(t); pur._t = t;
    pur.lines.forEach(function(l2, j){ var e = box.querySelector('[data-pt="' + j + '"]'); if (e) e.textContent = fmt(l2.qty * l2.cost); }); };
  for (i=0;i<qs.length;i++) qs[i].oninput = function(){ pur.lines[+this.getAttribute('data-pq')].qty = num(this.value); upd(); };
  for (i=0;i<cs.length;i++) cs[i].oninput = function(){ pur.lines[+this.getAttribute('data-pc')].cost = num(this.value); upd(); };
  for (i=0;i<xs.length;i++) xs[i].onclick = function(){ pur.lines.splice(+this.getAttribute('data-px'), 1); purLines(); };
  upd();
}
function confirmPurchase(){
  var btn = $('p-confirm'); if (!btn || btn.disabled) return;
  if (!pur.lines.length || !pur.supId){ toast(T('supplier') + ' / ' + T('items') + ' ?'); return; }
  btn.disabled = true;
  try{
    var purs = DB.get('purchases', []);
    for (var k=0;k<purs.length;k++) if (purs[k].key === pur.key){ toast(T('dupWarn')); btn.disabled = false; return; }
    var t = r2(pur.lines.reduce(function(a,l){return a + num(l.qty)*num(l.cost);},0));
    var paid = r2(Math.min(num(pur.paid), t));
    var rec = { id:newId('pur'), key:pur.key, ts:Date.now(), date:todayStr(), supId:pur.supId, supName:pur.supName,
      items:pur.lines.map(function(l){ return {pid:l.pid, name:l.name, qty:r2(num(l.qty)), unit:l.unit, cost:r2(num(l.cost)), total:r2(num(l.qty)*num(l.cost))}; }),
      total:t, paid:paid, bal:r2(t - paid) };
    var prods = DB.get('products', []), moves = DB.get('moves', []);
    rec.items.forEach(function(it){ var p = getProd(it.pid, prods); if (p){ p.stock = r2(num(p.stock) + num(it.qty)); if (num(it.cost) > 0) p.buy = r2(num(it.cost)); moves.unshift({id:newId('mv'), ts:rec.ts, pid:p.id, chg:num(it.qty), why:'purchase', ref:rec.id}); } });
    DB.set('products', prods); DB.set('moves', moves);
    var st = DB.get('supTx', []);
    st.unshift({id:newId('st'), ts:rec.ts, supId:rec.supId, kind:'pur', dr:paid, cr:t, desc:T('purchase') + ' ' + fmtDate(rec.ts), ref:rec.id});
    DB.set('supTx', st);
    if (paid > 0){ var cash = DB.get('cash', []), sess = curSession();
      cash.unshift({id:newId('cs'), ts:rec.ts, kind:'suppay', via:'cash', amt:-paid, desc:T('purchase') + ' — ' + rec.supName, ref:rec.id, sess:sess ? sess.id : null});
      DB.set('cash', cash); }
    purs.unshift(rec); DB.set('purchases', purs);
    audit('purchase', rec.supName + ' ' + fmt(t));
    pur.done = true; pur = null; CUR.sub = '';
    toast(T('confirm') + ' ✓'); vPurchases();
  }catch(e){ btn.disabled = false; toast('Error: ' + e.message); }
}

/* ---------------- KHATA (customers + suppliers) ---------------- */
var khataSub = 'cust';
function khataTab(t){ khataSub = t; render(); }
function vKhata(){
  var h = '<div class="section-title">📒 ' + esc(T('khata')) + '</div><div class="tabs">' +
    '<button data-k="cust" class="' + (khataSub === 'cust' ? 'on' : '') + '">👤 ' + esc(T('customers')) + '</button>' +
    '<button data-k="sup" class="' + (khataSub === 'sup' ? 'on' : '') + '">🏭 ' + esc(T('suppliers')) + '</button></div><div id="kh-body"></div>';
  view().innerHTML = h;
  var bs = view().querySelectorAll('[data-k]');
  for (var i=0;i<bs.length;i++) bs[i].onclick = function(){ khataTab(this.getAttribute('data-k')); };
  if (khataSub === 'cust') khataCustList(); else khataSupList();
}
function khataCustList(){
  var tx = DB.get('custTx', []), arr = DB.get('cust', []).slice().sort(function(a,b){return a.name.localeCompare(b.name);});
  $('kh-body').innerHTML = '<button class="btn btn-green btn-block" id="kc-add">＋ ' + esc(T('addCustomer')) + '</button><div id="kc-l"></div>';
  $('kc-add').onclick = openCustForm;
  $('kc-l').innerHTML = arr.map(function(c){
    var b = custBalance(tx, c.open, c.id);
    return '<div class="list-item"><div class="grow"><div class="t">' + esc(c.name) + '</div><div class="s">' + esc(c.phone || '') + ' · ' + esc(T('outstanding')) + ': <b>' + esc(fmt(b)) + '</b></div></div>' +
      '<button class="btn btn-gray btn-sm" data-co="' + c.id + '">' + esc(T('ledger')) + '</button></div>';
  }).join('') || '<div class="note">' + esc(T('noData')) + '</div>';
  var bs = $('kc-l').querySelectorAll('[data-co]');
  for (var i=0;i<bs.length;i++) bs[i].onclick = function(){ openCust(this.getAttribute('data-co')); };
}
function openCustForm(id){
  var c = id ? getCust(id) : {id:newId('c'), name:'', phone:'', addr:'', open:0, note:'', ts:Date.now()};
  modal('<h3>👤 ' + esc(id ? T('edit') : T('addCustomer')) + '</h3><div class="form">' +
    '<label>' + esc(T('name')) + '</label><input id="cf-n" value="' + esc(c.name) + '">' +
    '<label>' + esc(T('phone')) + ' (03XX-XXXXXXX)</label><input id="cf-p" inputmode="tel" value="' + esc(c.phone || '') + '" placeholder="0300 1234567">' +
    '<label>' + esc(T('address')) + '</label><input id="cf-a" value="' + esc(c.addr || '') + '">' +
    '<label>' + esc(T('openingBal')) + ' (PKR)</label><input id="cf-o" type="number" step="any" value="' + (c.open || 0) + '">' +
    '<label>' + esc(T('notes')) + '</label><input id="cf-no" value="' + esc(c.note || '') + '">' +
    '<div class="row2" style="margin-top:12px"><button class="btn btn-green" id="cf-s">' + esc(T('save')) + '</button><button class="btn btn-gray" id="cf-x">' + esc(T('cancel')) + '</button></div></div>');
  $('cf-x').onclick = closeModal;
  $('cf-s').onclick = function(){
    c.name = $('cf-n').value.trim(); if (!c.name){ toast(T('name') + ' ?'); return; }
    c.phone = $('cf-p').value.trim(); c.addr = $('cf-a').value.trim();
    c.open = r2(num($('cf-o').value)); c.note = $('cf-no').value.trim();
    var arr = DB.get('cust', []), ex = getCust(c.id, arr);
    if (ex){ ex.name = c.name; ex.phone = c.phone; ex.addr = c.addr; ex.open = c.open; ex.note = c.note; }
    else arr.unshift(c);
    DB.set('cust', arr); audit(id ? 'cust_edit' : 'cust_add', c.name);
    closeModal(); render();
  };
}
function openCust(id){
  var c = getCust(id); if (!c) return;
  CUR.custId = id;
  var tx = DB.get('custTx', []).filter(function(t){return t.custId === id;}).sort(function(a,b){return b.ts - a.ts;});
  var bal = custBalance(DB.get('custTx', []), c.open, id), run = bal;
  var rows = tx.map(function(t){
    var r = run; run = r2(run - num(t.dr) + num(t.cr));
    return '<tr><td>' + esc(fmtDate(t.ts)) + '</td><td>' + esc(t.desc) + '</td><td class="r">' + (num(t.dr) ? esc(fmt(t.dr)) : '—') + '</td><td class="r">' + (num(t.cr) ? esc(fmt(t.cr)) : '—') + '</td><td class="r"><b>' + esc(fmt(r)) + '</b></td></tr>';
  }).join('');
  view().innerHTML = '<button class="btn btn-gray btn-sm" onclick="KSM.go(\'khata\')">← ' + esc(T('back')) + '</button>' +
    '<div class="card" style="margin-top:10px"><div class="t" style="font-size:18px;font-weight:800">' + esc(c.name) + '</div>' +
    '<div class="s" style="color:var(--muted)">' + esc(c.phone || '') + ' · ' + esc(c.addr || '') + '</div>' +
    '<div class="stat" style="margin-top:8px"><div class="lbl">' + esc(T('outstanding')) + '</div><div class="val">' + esc(fmt(bal)) + '</div></div>' +
    '<div class="row2" style="margin-top:8px"><button class="btn btn-green btn-sm" id="co-pay">💵 ' + esc(T('receivePayment')) + '</button>' +
    '<button class="btn btn-gray btn-sm" id="co-edit">✏ ' + esc(T('edit')) + '</button></div>' +
    '<div class="row2" style="margin-top:8px"><button class="btn btn-gold btn-sm" id="co-wa">📲 ' + esc(T('remindWA')) + '</button>' +
    '<button class="btn btn-blue btn-sm" id="co-sms">✉ ' + esc(T('remindSMS')) + '</button></div>' +
    '<div class="note">' + esc(T('waNote')) + '<br>' + esc(T('smsNote')) + '</div></div>' +
    '<div class="section-title">' + esc(T('ledger')) + '</div><div class="card" style="overflow-x:auto"><table class="tbl"><tr><th>' + esc(T('date')) + '</th><th></th><th class="r">' + esc(T('debit')) + '</th><th class="r">' + esc(T('credit2')) + '</th><th class="r">' + esc(T('runningBal')) + '</th></tr>' +
    '<tr><td>—</td><td>' + esc(T('openingBal')) + '</td><td class="r">' + (num(c.open) > 0 ? esc(fmt(c.open)) : '—') + '</td><td class="r">' + (num(c.open) < 0 ? esc(fmt(-c.open)) : '—') + '</td><td class="r"><b>' + esc(fmt(c.open)) + '</b></td></tr>' +
    rows + '</table></div>';
  $('co-pay').onclick = function(){ custPayment(id); };
  $('co-edit').onclick = function(){ openCustForm(id); };
  $('co-wa').onclick = function(){ reminderForm(id, 'whatsapp'); };
  $('co-sms').onclick = function(){ reminderForm(id, 'sms'); };
}
function custPayment(id){
  modal('<h3>💵 ' + esc(T('receivePayment')) + '</h3><div class="form">' +
    '<label>' + esc(T('paid')) + ' (PKR)</label><input id="cp-a" type="number" min="0" step="any">' +
    '<label>' + esc(T('method')) + '</label><select id="cp-m"><option value="cash">' + esc(T('cash')) + '</option><option value="bank">' + esc(T('bank')) + '</option><option value="wallet">' + esc(T('wallet')) + '</option></select>' +
    '<label>' + esc(T('notes')) + '</label><input id="cp-n">' +
    '<div class="row2" style="margin-top:12px"><button class="btn btn-green" id="cp-s">' + esc(T('save')) + '</button><button class="btn btn-gray" id="cp-x">' + esc(T('cancel')) + '</button></div></div>');
  $('cp-x').onclick = closeModal;
  $('cp-s').onclick = function(){
    var a = r2(num($('cp-a').value)); if (a <= 0){ toast('?'); return; }
    var m = $('cp-m').value, n = $('cp-n').value.trim(), sess = curSession();
    var tx = DB.get('custTx', []);
    tx.unshift({id:newId('ct'), ts:Date.now(), custId:id, kind:'pay', dr:0, cr:a, desc:T('payment') + (n ? ' — ' + n : ''), ref:''});
    DB.set('custTx', tx);
    var cash = DB.get('cash', []);
    cash.unshift({id:newId('cs'), ts:Date.now(), kind:'custpay', via:m, amt:a, desc:T('receivePayment') + ' — ' + (getCust(id) || {}).name, ref:id, sess:sess ? sess.id : null});
    DB.set('cash', cash);
    audit('cust_pay', (getCust(id) || {}).name + ' ' + fmt(a));
    closeModal(); toast(T('receivePayment') + ' ✓'); openCust(id);
  };
}
/* ---- suppliers ---- */
function khataSupList(){
  var tx = DB.get('supTx', []), arr = DB.get('sup', []).slice().sort(function(a,b){return a.name.localeCompare(b.name);});
  $('kh-body').innerHTML = '<button class="btn btn-green btn-block" id="ks-add">＋ ' + esc(T('supplier')) + '</button><div id="ks-l"></div>';
  $('ks-add').onclick = function(){ openSupForm(null); };
  $('ks-l').innerHTML = arr.map(function(s){
    var b = supBalance(tx, s.openPay, s.id);
    return '<div class="list-item"><div class="grow"><div class="t">' + esc(s.name) + '</div><div class="s">' + esc(s.phone || '') + ' · ' + esc(T('payables')) + ': <b>' + esc(fmt(b)) + '</b></div></div>' +
      '<button class="btn btn-gray btn-sm" data-so="' + s.id + '">' + esc(T('ledger')) + '</button></div>';
  }).join('') || '<div class="note">' + esc(T('noData')) + '</div>';
  var bs = $('ks-l').querySelectorAll('[data-so]');
  for (var i=0;i<bs.length;i++) bs[i].onclick = function(){ openSup(this.getAttribute('data-so')); };
}
function openSupForm(id){
  var s = id ? getSup(id) : {id:newId('s'), name:'', phone:'', addr:'', openPay:0, note:'', ts:Date.now()};
  modal('<h3>🏭 ' + esc(id ? T('edit') : T('supplier')) + '</h3><div class="form">' +
    '<label>' + esc(T('name')) + '</label><input id="sf-n" value="' + esc(s.name) + '">' +
    '<label>' + esc(T('phone')) + '</label><input id="sf-p" inputmode="tel" value="' + esc(s.phone || '') + '">' +
    '<label>' + esc(T('address')) + '</label><input id="sf-a" value="' + esc(s.addr || '') + '">' +
    '<label>' + esc(T('payables')) + ' (' + esc(T('openingBal')) + ')</label><input id="sf-o" type="number" step="any" value="' + (s.openPay || 0) + '">' +
    '<label>' + esc(T('notes')) + '</label><input id="sf-no" value="' + esc(s.note || '') + '">' +
    '<div class="row2" style="margin-top:12px"><button class="btn btn-green" id="sf-s">' + esc(T('save')) + '</button><button class="btn btn-gray" id="sf-x">' + esc(T('cancel')) + '</button></div></div>');
  $('sf-x').onclick = closeModal;
  $('sf-s').onclick = function(){
    s.name = $('sf-n').value.trim(); if (!s.name){ toast(T('name') + ' ?'); return; }
    s.phone = $('sf-p').value.trim(); s.addr = $('sf-a').value.trim();
    s.openPay = r2(num($('sf-o').value)); s.note = $('sf-no').value.trim();
    var arr = DB.get('sup', []), ex = getSup(s.id, arr);
    if (ex){ ex.name = s.name; ex.phone = s.phone; ex.addr = s.addr; ex.openPay = s.openPay; ex.note = s.note; }
    else arr.unshift(s);
    DB.set('sup', arr); audit(id ? 'sup_edit' : 'sup_add', s.name);
    closeModal(); render();
  };
}
function openSup(id){
  var s = getSup(id); if (!s) return;
  var tx = DB.get('supTx', []).filter(function(t){return t.supId === id;}).sort(function(a,b){return b.ts - a.ts;});
  var bal = supBalance(DB.get('supTx', []), s.openPay, id);
  var rows = tx.map(function(t){
    return '<tr><td>' + esc(fmtDate(t.ts)) + '</td><td>' + esc(t.desc) + '</td><td class="r">' + (num(t.dr) ? esc(fmt(t.dr)) : '—') + '</td><td class="r">' + (num(t.cr) ? esc(fmt(t.cr)) : '—') + '</td></tr>';
  }).join('');
  view().innerHTML = '<button class="btn btn-gray btn-sm" onclick="KSM.go(\'khata\')">← ' + esc(T('back')) + '</button>' +
    '<div class="card" style="margin-top:10px"><div class="t" style="font-size:18px;font-weight:800">' + esc(s.name) + '</div>' +
    '<div class="s" style="color:var(--muted)">' + esc(s.phone || '') + ' · ' + esc(s.addr || '') + '</div>' +
    '<div class="stat" style="margin-top:8px"><div class="lbl">' + esc(T('payables')) + '</div><div class="val">' + esc(fmt(bal)) + '</div></div>' +
    '<div class="row2" style="margin-top:8px"><button class="btn btn-green btn-sm" id="so-pay">💵 ' + esc(T('paySupplier')) + '</button>' +
    '<button class="btn btn-gray btn-sm" id="so-edit">✏ ' + esc(T('edit')) + '</button></div></div>' +
    '<div class="section-title">' + esc(T('ledger')) + '</div><div class="card" style="overflow-x:auto"><table class="tbl"><tr><th>' + esc(T('date')) + '</th><th></th><th class="r">' + esc(T('debit')) + ' (' + esc(T('paid')) + ')</th><th class="r">' + esc(T('credit2')) + ' (' + esc(T('purchase')) + ')</th></tr>' +
    '<tr><td>—</td><td>' + esc(T('openingBal')) + '</td><td class="r">—</td><td class="r"><b>' + esc(fmt(s.openPay)) + '</b></td></tr>' + rows + '</table></div>';
  $('so-pay').onclick = function(){
    modal('<h3>💵 ' + esc(T('paySupplier')) + '</h3><div class="form"><label>' + esc(T('paid')) + ' (PKR)</label><input id="sp-a" type="number" min="0" step="any">' +
      '<div class="row2" style="margin-top:12px"><button class="btn btn-green" id="sp-s">' + esc(T('save')) + '</button><button class="btn btn-gray" id="sp-x">' + esc(T('cancel')) + '</button></div></div>');
    $('sp-x').onclick = closeModal;
    $('sp-s').onclick = function(){
      var a = r2(num($('sp-a').value)); if (a <= 0) return;
      var st = DB.get('supTx', []);
      st.unshift({id:newId('st'), ts:Date.now(), supId:id, kind:'pay', dr:a, cr:0, desc:T('payment'), ref:''});
      DB.set('supTx', st);
      var cash = DB.get('cash', []), sess = curSession();
      cash.unshift({id:newId('cs'), ts:Date.now(), kind:'suppay', via:'cash', amt:-a, desc:T('paySupplier') + ' — ' + s.name, ref:id, sess:sess ? sess.id : null});
      DB.set('cash', cash);
      audit('sup_pay', s.name + ' ' + fmt(a));
      closeModal(); toast(T('paySupplier') + ' ✓'); openSup(id);
    };
  };
  $('so-edit').onclick = function(){ openSupForm(id); };
}
/* ---- reminders ---- */
function reminderMsg(c, langU){
  var bal = custBalance(DB.get('custTx', []), c.open, c.id);
  if (langU) return 'السلام علیکم ' + c.name + ' صاحب، ' + (S.shopName || 'جیلان کریانہ اسٹور') + ' کے حساب کے مطابق آپ کے ذمے ' + bal + ' روپے باقی ہیں۔ براہ کرم سہولت کے مطابق ادائیگی فرما دیں۔ شکریہ۔' + (S.phone ? ' رابطہ: ' + S.phone : '');
  return 'Dear ' + c.name + ', your outstanding balance at ' + (S.shopName || 'Jilan Karyana Store') + ' is PKR ' + bal + '. Please arrange payment at your convenience. Thank you.' + (S.phone ? ' Contact: ' + S.phone : '');
}
function reminderForm(custId, method){
  var c = getCust(custId); if (!c || !c.phone){ toast(T('phone') + ' ?'); return; }
  var msgU = reminderMsg(c, true), msgE = reminderMsg(c, false);
  modal('<h3>📲 ' + esc(method === 'whatsapp' ? T('remindWA') : T('remindSMS')) + '</h3><div class="form">' +
    '<div class="tabs"><button data-rl="ur" class="on">اردو</button><button data-rl="en">English</button></div>' +
    '<textarea id="rm-t" rows="5">' + esc(msgU) + '</textarea>' +
    '<div class="note">' + esc(method === 'whatsapp' ? T('waNote') : T('smsNote')) + '</div>' +
    '<button class="btn btn-green btn-block" id="rm-open">' + esc(method === 'whatsapp' ? T('shareWA') : T('sendSMS')) + ' — ' + esc(c.phone) + '</button>' +
    '<button class="btn btn-gold btn-block" id="rm-sent">✓ ' + esc(T('markSent')) + '</button>' +
    '<button class="btn btn-gray btn-block" id="rm-x">' + esc(T('cancel')) + '</button></div>');
  var cur = 'ur';
  var tabs = document.querySelectorAll('#mback [data-rl]');
  for (var i=0;i<tabs.length;i++) tabs[i].onclick = function(){ cur = this.getAttribute('data-rl');
    var ts = document.querySelectorAll('#mback [data-rl]'); for (var j=0;j<ts.length;j++) ts[j].className = '';
    this.className = 'on'; $('rm-t').value = cur === 'ur' ? msgU : msgE; };
  $('rm-x').onclick = closeModal;
  $('rm-open').onclick = function(){
    var txt = $('rm-t').value, ph = c.phone.replace(/\D/g, '');
    if (method === 'whatsapp'){ var w = waNum(ph); window.open('https://wa.me/' + w + '?text=' + encodeURIComponent(txt), '_blank'); }
    else { window.location.href = 'sms:' + ph + '?body=' + encodeURIComponent(txt); }
  };
  $('rm-sent').onclick = function(){
    var rs = DB.get('reminders', []);
    rs.unshift({id:newId('rm'), ts:Date.now(), custId:custId, method:method, amt:custBalance(DB.get('custTx', []), c.open, c.id), confirmed:true});
    DB.set('reminders', rs); audit('reminder', c.name + ' via ' + method);
    closeModal(); toast(T('reminderSaved'));
  };
}

/* ---------------- CASHBOOK + DAILY SESSIONS ---------------- */
function vCash(){
  var sess = curSession();
  var h = '<div class="section-title">💰 ' + esc(T('cashbook')) + '</div>';
  if (!sess){
    h += '<div class="card"><p>' + esc(T('noOpen')) + '</p><button class="btn btn-green btn-block" id="cs-open">🌅 ' + esc(T('dayOpen')) + '</button></div>';
  } else {
    var tx = sessionTxns(DB.get('cash', []), sess.id);
    var exp = sessionExpected(sess, DB.get('cash', []));
    var inn = r2(tx.filter(function(t){return num(t.amt) > 0;}).reduce(function(a,t){return a + num(t.amt);},0));
    var out = r2(tx.filter(function(t){return num(t.amt) < 0;}).reduce(function(a,t){return a + num(t.amt);},0));
    h += '<div class="card gold-card"><b>🟢 ' + esc(T('open')) + ':</b> ' + esc(fmtDate(sess.ts)) + ' ' + esc(fmtTime(sess.ts)) +
      '<div class="row3" style="margin-top:8px">' +
      '<div class="stat"><div class="lbl">' + esc(T('openingCash')) + '</div><div class="val">' + esc(fmt(sess.openCash)) + '</div></div>' +
      '<div class="stat"><div class="lbl">' + esc(T('cashIn')) + '</div><div class="val">' + esc(fmt(inn)) + '</div></div>' +
      '<div class="stat"><div class="lbl">' + esc(T('expenses')) + ' + ' + esc(T('supPay')) + '</div><div class="val">' + esc(fmt(-out)) + '</div></div></div>' +
      '<div class="stat"><div class="lbl">' + esc(T('expected')) + ' (' + esc(T('cash')) + ')</div><div class="val">' + esc(fmt(exp.cash)) + '</div></div>' +
      '<button class="btn btn-red btn-block" id="cs-close">🌇 ' + esc(T('dayClose')) + '</button></div>';
    var rows = tx.slice(0, 60).map(function(t){
      return '<tr><td>' + esc(fmtTime(t.ts)) + '</td><td>' + esc(t.desc) + ' <span class="badge info">' + esc(t.via || 'cash') + '</span></td><td class="r" style="color:' + (num(t.amt) >= 0 ? 'green' : 'var(--danger)') + '"><b>' + esc(fmt(t.amt)) + '</b></td></tr>';
    }).join('');
    h += '<div class="section-title">' + esc(T('recentTx')) + '</div><div class="card" style="overflow-x:auto"><table class="tbl"><tr><th>' + esc(T('date')) + '</th><th></th><th class="r">PKR</th></tr>' + rows + '</table></div>';
  }
  var past = DB.get('sessions', []).filter(function(s){return s.status === 'closed';}).slice(0, 20);
  h += '<div class="section-title">📜 ' + esc(T('closed')) + '</div>' + past.map(function(s){
    var d = s.closeCashActual - s.expCash;
    return '<div class="list-item"><div class="grow"><div class="t">' + esc(fmtDate(s.ts)) + '</div><div class="s">' + esc(T('expected')) + ': ' + esc(fmt(s.expCash)) + ' · ' + esc(T('actual')) + ': ' + esc(fmt(s.closeCashActual)) +
      ' · ' + (d === 0 ? '<span class="badge ok">✓</span>' : d < 0 ? '<span class="badge bad">' + esc(T('shortage')) + ' ' + esc(fmt(-d)) + '</span>' : '<span class="badge warn">' + esc(T('excess')) + ' ' + esc(fmt(d)) + '</span>') + '</div></div></div>';
  }).join('');
  view().innerHTML = h;
  var bo = $('cs-open'), bc = $('cs-close');
  if (bo) bo.onclick = openDayForm;
  if (bc) bc.onclick = closeDayForm;
}
function openDayForm(){
  if (curSession()){ toast(T('alreadyOpen')); return; }
  modal('<h3>🌅 ' + esc(T('dayOpen')) + '</h3><div class="form">' +
    '<label>' + esc(T('openingCash')) + ' (PKR)</label><input id="od-c" type="number" min="0" step="any" value="0">' +
    '<label>' + esc(T('bank')) + ' (' + esc(T('openingBal')) + ')</label><input id="od-b" type="number" min="0" step="any" value="0">' +
    '<label>' + esc(T('wallet')) + ' (' + esc(T('openingBal')) + ')</label><input id="od-w" type="number" min="0" step="any" value="0">' +
    '<div class="row2" style="margin-top:12px"><button class="btn btn-green" id="od-s">' + esc(T('save')) + '</button><button class="btn btn-gray" id="od-x">' + esc(T('cancel')) + '</button></div></div>');
  $('od-x').onclick = closeModal;
  $('od-s').onclick = function(){
    var ss = DB.get('sessions', []);
    ss.unshift({id:newId('ss'), ts:Date.now(), date:todayStr(), status:'open',
      openCash:r2(num($('od-c').value)), openBank:r2(num($('od-b').value)), openWallet:r2(num($('od-w').value))});
    DB.set('sessions', ss); audit('day_open', fmt(num($('od-c').value)));
    closeModal(); render();
  };
}
function closeDayForm(){
  var sess = curSession(); if (!sess) return;
  var exp = sessionExpected(sess, DB.get('cash', []));
  modal('<h3>🌇 ' + esc(T('dayClose')) + '</h3><div class="form">' +
    '<div class="totals"><div class="r"><span>' + esc(T('expected')) + ' ' + esc(T('cash')) + '</span><b>' + esc(fmt(exp.cash)) + '</b></div>' +
    '<div class="r"><span>' + esc(T('expected')) + ' ' + esc(T('bank')) + '</span><b>' + esc(fmt(exp.bank)) + '</b></div>' +
    '<div class="r"><span>' + esc(T('expected')) + ' ' + esc(T('wallet')) + '</span><b>' + esc(fmt(exp.wallet)) + '</b></div></div>' +
    '<label>' + esc(T('actual')) + ' ' + esc(T('cash')) + ' (' + esc(T('actual')) + ')</label><input id="cd-c" type="number" min="0" step="any" value="' + exp.cash + '">' +
    '<label>' + esc(T('reason')) + ' (' + esc(T('shortage')) + '/' + esc(T('excess')) + ')</label><input id="cd-r" placeholder="—">' +
    '<div class="row2" style="margin-top:12px"><button class="btn btn-red" id="cd-s">' + esc(T('dayClose')) + '</button><button class="btn btn-gray" id="cd-x">' + esc(T('cancel')) + '</button></div></div>');
  $('cd-x').onclick = closeModal;
  $('cd-s').onclick = function(){
    var actual = r2(num($('cd-c').value)), reason = $('cd-r').value.trim();
    var ss = DB.get('sessions', []);
    for (var i=0;i<ss.length;i++) if (ss[i].id === sess.id){
      if (ss[i].status === 'closed'){ toast(T('alreadyOpen')); closeModal(); return; }
      ss[i].status = 'closed'; ss[i].closedAt = Date.now();
      ss[i].expCash = exp.cash; ss[i].expBank = exp.bank; ss[i].expWallet = exp.wallet;
      ss[i].closeCashActual = actual; ss[i].closeReason = reason;
    }
    DB.set('sessions', ss);
    audit('day_close', 'expected ' + fmt(exp.cash) + ' / actual ' + fmt(actual) + (reason ? ' — ' + reason : ''));
    closeModal(); toast(T('sessionClosed')); render();
  };
}
/* cash adjust: other income / withdrawal */
function cashAdjust(kind){
  var isIn = kind === 'inc';
  modal('<h3>' + esc(isIn ? T('otherInc') : T('withdrawals')) + '</h3><div class="form">' +
    '<label>PKR</label><input id="ca-a" type="number" min="0" step="any">' +
    '<label>' + esc(T('notes')) + '</label><input id="ca-n">' +
    '<div class="row2" style="margin-top:12px"><button class="btn btn-green" id="ca-s">' + esc(T('save')) + '</button><button class="btn btn-gray" id="ca-x">' + esc(T('cancel')) + '</button></div></div>');
  $('ca-x').onclick = closeModal;
  $('ca-s').onclick = function(){
    var a = r2(num($('ca-a').value)); if (a <= 0) return;
    var sess = curSession(), cash = DB.get('cash', []);
    cash.unshift({id:newId('cs'), ts:Date.now(), kind:kind, via:'cash', amt:isIn ? a : -a, desc:($('ca-n').value.trim() || (isIn ? T('otherInc') : T('withdrawals'))), ref:'', sess:sess ? sess.id : null});
    DB.set('cash', cash); audit(isIn ? 'cash_in' : 'withdrawal', fmt(a));
    closeModal(); render();
  };
}

/* ---------------- EXPENSES ---------------- */
function vExpenses(){
  if (CUR.sub === 'new'){ expForm(); return; }
  var arr = DB.get('exp', []).slice().sort(function(a,b){return b.ts - a.ts;}).slice(0,60);
  var tot = r2(arr.reduce(function(a,e){return a + num(e.amt);},0));
  view().innerHTML = '<div class="section-title">💸 ' + esc(T('expenses')) + ' <span class="badge warn">' + esc(fmt(tot)) + '</span></div>' +
    '<button class="btn btn-green btn-block" id="ex-new">＋ ' + esc(T('addExpense')) + '</button>' +
    '<div class="row2" style="margin-top:8px"><button class="btn btn-gray btn-sm" id="ex-inc">＋ ' + esc(T('otherInc')) + '</button>' +
    '<button class="btn btn-gray btn-sm" id="ex-wd">－ ' + esc(T('withdrawals')) + '</button></div><div style="margin-top:10px">' +
    arr.map(function(e){ return '<div class="list-item"><div class="grow"><div class="t">' + esc(fmt(e.amt)) + ' · ' + esc(expCatName(e.cat)) + '</div><div class="s">' + esc(fmtDate(e.ts)) + ' · ' + esc(e.desc || '') + '</div></div>' +
      '<button class="btn btn-gray btn-sm" data-ex="' + e.id + '">✕</button></div>'; }).join('') + '</div>';
  $('ex-new').onclick = function(){ CUR.sub = 'new'; render(); };
  $('ex-inc').onclick = function(){ cashAdjust('inc'); };
  $('ex-wd').onclick = function(){ cashAdjust('wd'); };
  var ds = view().querySelectorAll('[data-ex]');
  for (var i=0;i<ds.length;i++) ds[i].onclick = function(){
    var id = this.getAttribute('data-ex');
    confirmDlg(T('expenses') + ' ?', function(){
      var arr2 = DB.get('exp', []).filter(function(e){return e.id !== id;}); DB.set('exp', arr2);
      var cash = DB.get('cash', []).filter(function(c){return c.ref !== id;}); DB.set('cash', cash);
      audit('expense_delete', id); render();
    });
  };
}
function expCatName(c){ var m = {rent:'Rent / کرایہ', electricity:'Electricity / بجلی', transport:'Transport', salaries:'Salaries / تنخواہ', packaging:'Packaging / پیکنگ', misc:'Misc / متفرق'}; return m[c] || c; }
function expForm(){
  var cats = S.expCats.map(function(c){ return '<option value="' + esc(c) + '">' + esc(expCatName(c)) + '</option>'; }).join('');
  view().innerHTML = '<button class="btn btn-gray btn-sm" id="ex-b">← ' + esc(T('back')) + '</button>' +
    '<div class="section-title">💸 ' + esc(T('addExpense')) + '</div><div class="card form">' +
    '<label>' + esc(T('category')) + '</label><select id="ef-c">' + cats + '</select>' +
    '<label>PKR</label><input id="ef-a" type="number" min="0" step="any">' +
    '<label>' + esc(T('notes')) + '</label><input id="ef-n">' +
    '<button class="btn btn-green btn-block" id="ef-s">' + esc(T('save')) + '</button></div>';
  $('ex-b').onclick = function(){ CUR.sub = ''; render(); };
  $('ef-s').onclick = function(){
    var a = r2(num($('ef-a').value)); if (a <= 0){ toast('?'); return; }
    var e = {id:newId('ex'), ts:Date.now(), date:todayStr(), cat:$('ef-c').value, amt:a, desc:$('ef-n').value.trim()};
    var arr = DB.get('exp', []); arr.unshift(e); DB.set('exp', arr);
    var sess = curSession(), cash = DB.get('cash', []);
    cash.unshift({id:newId('cs'), ts:e.ts, kind:'exp', via:'cash', amt:-a, desc:expCatName(e.cat) + (e.desc ? ' — ' + e.desc : ''), ref:e.id, sess:sess ? sess.id : null});
    DB.set('cash', cash);
    audit('expense', expCatName(e.cat) + ' ' + fmt(a));
    CUR.sub = ''; toast(T('expenses') + ' ✓'); render();
  };
}

/* ---------------- DEMO EXPIRY (3 days) ---------------- */
var DEMO_MS = 3 * 86400000;
function demoSince(){
  try{ var v = localStorage.getItem('jksm_demo_since'); return v ? parseInt(v, 10) : 0; }catch(e){ return 0; }
}
function ensureDemoSince(){
  if (!demoSince()){ try{ localStorage.setItem('jksm_demo_since', String(Date.now())); }catch(e){} }
}
function demoDaysLeft(){
  var s = demoSince(); if (!s) return 3;
  var left = DEMO_MS - (Date.now() - s);
  return Math.max(0, Math.ceil(left / 86400000));
}
function demoExpired(){ var s = demoSince(); return s > 0 && (Date.now() - s) > DEMO_MS; }
function demoGate(){
  if (!S || !S.demo || !demoExpired()) return false;
  $('app-header').style.display = 'none'; $('bottom-nav').style.display = 'none';
  view().innerHTML = '<div class="lock-wrap"><div class="logo-badge" style="margin:0 auto 10px;width:56px;height:56px;background:var(--danger)">' +
    '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>' +
    '<h2>' + esc(LANG === 'ur' ? 'ڈیمو ختم ہو گیا' : 'Demo expired') + '</h2>' +
    '<p style="color:var(--muted)">' + esc(LANG === 'ur' ? '3 دن کا ڈیمو مکمل ہو گیا۔ مکمل ورژن کے لیے جیلان ایپس سے رابطہ کریں۔' : 'The 3-day demo has ended. Contact Jilan Apps for the full version.') + '</p>' +
    '<div class="note">DEMO by Jilan Apps</div>' +
    '<button class="btn btn-green btn-block" id="dx-real">' + esc(LANG === 'ur' ? 'اصل ڈیٹا موڈ پر جائیں (میعاد نہیں)' : 'Switch to real data mode (no expiry)') + '</button></div>';
  $('dx-real').onclick = function(){ setDemo(false); };
  return true;
}
function demoCountdownNote(){
  if (!S.demo) return '';
  return '<div class="note">⏳ DEMO by Jilan Apps · ' + (LANG === 'ur' ? 'باقی: ' + demoDaysLeft() + ' دن' : demoDaysLeft() + ' day(s) left') + '</div>';
}

/* ---------------- REPORTS ---------------- */
var repFilter = 'month';
function vReports(){
  var h = '<div class="section-title">📈 ' + esc(T('reports')) + '</div>' + rangeTabs(repFilter) + '<div id="rep-body"></div>';
  view().innerHTML = h;
  bindRangeTabs(function(f){ repFilter = f; vReports(); });
  renderReports();
}
function renderReports(){
  var r = rangeFor(repFilter);
  var sales = rangeTxns(DB.get('sales', []).filter(function(s){return s.status === 'ok';}), r[0], r[1]);
  var purs = rangeTxns(DB.get('purchases', []), r[0], r[1]);
  var exps = rangeTxns(DB.get('exp', []), r[0], r[1]);
  var rev = r2(sales.reduce(function(a,s){return a + num(s.total);},0));
  var cogs = 0, estFlag = false;
  sales.forEach(function(s){ var p = saleProfit(s); cogs = r2(cogs + p.cogs); if (p.estimated) estFlag = true; });
  var purTot = r2(purs.reduce(function(a,p){return a + num(p.total);},0));
  var expTot = r2(exps.reduce(function(a,e){return a + num(e.amt);},0));
  var gross = r2(rev - cogs), net = r2(gross - expTot);
  var cust = DB.get('cust', []), ctx = DB.get('custTx', []);
  var recv = cust.map(function(c){ return {name:c.name, phone:c.phone || '', bal:custBalance(ctx, c.open, c.id)}; }).filter(function(x){return x.bal > 0;}).sort(function(a,b){return b.bal - a.bal;});
  var sup = DB.get('sup', []), stx = DB.get('supTx', []);
  var payb = sup.map(function(s){ return {name:s.name, phone:s.phone || '', bal:supBalance(stx, s.openPay, s.id)}; }).filter(function(x){return x.bal > 0;}).sort(function(a,b){return b.bal - a.bal;});
  var prods = DB.get('products', []).filter(function(p){return !p.archived;});
  var byProd = {};
  sales.forEach(function(s){ s.items.forEach(function(it){ var k = it.pid;
    if (!byProd[k]) byProd[k] = {name:it.name, qty:0, rev:0, cogs:0, miss:false};
    byProd[k].qty = r2(byProd[k].qty + num(it.qty)); byProd[k].rev = r2(byProd[k].rev + num(it.qty) * num(it.price));
    byProd[k].cogs = r2(byProd[k].cogs + num(it.qty) * num(it.cost));
    if (!(num(it.cost) > 0)) byProd[k].miss = true; }); });
  var plist = Object.keys(byProd).map(function(k){ return byProd[k]; }).sort(function(a,b){return b.qty - a.qty;});
  var best = plist.slice(0,5), slow = plist.slice(-5).reverse();
  var low = prods.filter(function(p){return num(p.stock) <= num(p.min);});
  var est = (estFlag ? ' <span class="badge warn">' + esc(T('costMissing')) + '</span>' : '');
  var b = '<div class="stat-grid">' +
    stat(T('todaySales'), fmt(rev), '') + stat(T('purchaseTotal'), fmt(purTot), '') +
    stat(T('cogs'), fmt(cogs), '') + stat(T('grossProfit'), fmt(gross), gross < 0 ? 'warn' : 'good') +
    stat(T('expenses'), fmt(expTot), '') + stat(T('netProfit'), fmt(net), net < 0 ? 'warn' : 'good') +
    stat(T('stockVal'), fmt(stockVal(prods)), '') + stat(T('lowStock'), low.length, low.length ? 'warn' : '') + '</div>' +
    '<div class="note">ℹ ' + esc(T('profitNote')) + est + '<br>• ' + esc(T('purchaseTotal')) + ' = ' + esc(LANG === 'ur' ? 'خریدا گیا اسٹاک (اخراجات نہیں)' : 'stock bought (not an expense)') + '<br>• ' + esc(T('cogs')) + ' = ' + esc(LANG === 'ur' ? 'صرف فروخت شدہ مال کی لاگت' : 'cost of sold items only') + '</div>' +
    '<div class="section-title">🏆 ' + esc(T('bestSellers')) + '</div><div class="card">' + tblRows(best, true) + '</div>' +
    '<div class="section-title">🐢 ' + esc(T('slowSellers')) + '</div><div class="card">' + tblRows(slow, true) + '</div>' +
    '<div class="section-title">👤 ' + esc(T('custReport')) + '</div><div class="card">' + tblRows(recv.map(function(x){return {name:x.name + ' (' + x.phone + ')', qty:x.bal, rev:x.bal};}), false) + '</div>' +
    '<div class="section-title">🏭 ' + esc(T('supReport')) + '</div><div class="card">' + tblRows(payb.map(function(x){return {name:x.name + ' (' + x.phone + ')', qty:x.bal, rev:x.bal};}), false) + '</div>' +
    '<div class="section-title">⚠ ' + esc(T('lowStock')) + '</div><div class="card">' + (low.map(function(p){ return '<div class="s">• ' + esc(pname(p)) + ' — <b>' + esc(p.stock) + '</b> ' + esc(unitName(p.unit)) + '</div>'; }).join('') || '<div class="s">' + esc(T('allCaughtUp')) + ' ✓</div>') + '</div>' +
    '<div class="row2" style="margin-top:12px"><button class="btn btn-gold" id="rp-csv">📥 CSV</button>' +
    '<button class="btn btn-green" id="rp-print">🖨 ' + esc(T('print')) + '</button></div>';
  $('rep-body').innerHTML = b;
  $('rp-csv').onclick = function(){ exportReportsCSV({rev:rev, purTot:purTot, cogs:cogs, gross:gross, expTot:expTot, net:net, recv:recv, payb:payb, plist:plist}); };
  $('rp-print').onclick = function(){ $('print-area').innerHTML = '<div class="inv"><div class="inv-head"><h2>' + esc(S.shopName) + '</h2><div>' + esc(T('reports')) + ' · ' + esc(fmtDate(r[0])) + ' — ' + esc(fmtDate(r[1] - 1)) + '</div></div>' + $('rep-body').innerHTML + '</div>'; window.print(); };
}
function tblRows(arr, showProfit){
  if (!arr.length) return '<div class="s">' + esc(T('noData')) + '</div>';
  return '<table class="tbl"><tr><th>' + esc(T('name')) + '</th><th class="r">' + esc(T('qty')) + '</th><th class="r">PKR</th>' + (showProfit ? '<th class="r">' + esc(T('grossProfit')) + '</th>' : '') + '</tr>' +
    arr.map(function(x){ return '<tr><td>' + esc(x.name) + (x.miss ? ' <span class="badge warn">*</span>' : '') + '</td><td class="r">' + esc(x.qty) + '</td><td class="r">' + esc(fmt(x.rev)) + '</td>' + (showProfit ? '<td class="r">' + esc(fmt(x.rev - x.cogs)) + '</td>' : '') + '</tr>'; }).join('') + '</table>';
}
function exportReportsCSV(d){
  var L = [];
  L.push(['metric','amount']);
  L.push(['sales_revenue', d.rev]); L.push(['purchases_stock_bought', d.purTot]); L.push(['cogs', d.cogs]);
  L.push(['gross_profit_est', d.gross]); L.push(['expenses', d.expTot]); L.push(['net_profit_est', d.net]);
  L.push([]); L.push(['customer','phone','outstanding']);
  d.recv.forEach(function(x){ L.push([x.name, x.phone, x.bal]); });
  L.push([]); L.push(['supplier','phone','payable']);
  d.payb.forEach(function(x){ L.push([x.name, x.phone, x.bal]); });
  L.push([]); L.push(['product','qty_sold','revenue','profit_est']);
  d.plist.forEach(function(x){ L.push([x.name, x.qty, x.rev, r2(x.rev - x.cogs)]); });
  download('reports-' + todayStr() + '.csv', '﻿' + L.map(function(r){ return r.map(csvEsc).join(','); }).join('\n'), 'text/csv');
}

/* ---------------- BACKUP / RESTORE ---------------- */
function vBackup(){
  view().innerHTML = '<div class="section-title">💾 ' + esc(T('backup')) + '</div>' +
    '<div class="note">' + esc(T('dataLocal')) + '</div>' +
    '<div class="card">' +
    '<button class="btn btn-green btn-block" id="bk-now">📥 ' + esc(T('backupNow')) + '</button>' +
    '<button class="btn btn-gold btn-block" id="bk-re">📤 ' + esc(T('restore')) + '</button>' +
    '<div class="row2" style="margin-top:8px"><button class="btn btn-gray btn-sm" id="bk-cp">📋 ' + esc(T('products')) + ' CSV</button>' +
    '<button class="btn btn-gray btn-sm" id="bk-cc">📋 ' + esc(T('customers')) + ' CSV</button></div>' +
    '<div class="row2" style="margin-top:8px"><button class="btn btn-gray btn-sm" id="bk-cs">📋 ' + esc(T('suppliers')) + ' CSV</button>' +
    '<button class="btn btn-gray btn-sm" id="bk-ca">📋 Audit CSV</button></div>' +
    (S.demo ? '<button class="btn btn-red btn-block" id="bk-rd">🔄 ' + esc(T('resetDemo')) + '</button>' : '') +
    '</div>';
  $('bk-now').onclick = function(){
    var data = DB.all(); data._meta = {app:'jilan-karyana', v:2, ts:Date.now(), demo:S.demo};
    download('jilan-karyana-backup-' + todayStr() + '.json', JSON.stringify(data), 'application/json');
  };
  $('bk-re').onclick = function(){ $('import-file').click(); };
  $('bk-cp').onclick = function(){
    var rows = [['sku','name_en','name_ur','category','unit','pack','buy','sell','stock','min','expiry']];
    DB.get('products', []).forEach(function(p){ rows.push([p.sku, p.nameEn, p.nameUr, p.cat, p.unit, p.pack, p.buy, p.sell, p.stock, p.min, p.expiry]); });
    download('products-' + todayStr() + '.csv', '﻿' + rows.map(function(r){return r.map(csvEsc).join(',');}).join('\n'), 'text/csv');
  };
  $('bk-cc').onclick = function(){
    var rows = [['name','phone','address','opening','outstanding']], tx = DB.get('custTx', []);
    DB.get('cust', []).forEach(function(c){ rows.push([c.name, c.phone, c.addr, c.open, custBalance(tx, c.open, c.id)]); });
    download('customers-' + todayStr() + '.csv', '﻿' + rows.map(function(r){return r.map(csvEsc).join(',');}).join('\n'), 'text/csv');
  };
  $('bk-cs').onclick = function(){
    var rows = [['name','phone','address','opening_payable','payable']], tx = DB.get('supTx', []);
    DB.get('sup', []).forEach(function(s){ rows.push([s.name, s.phone, s.addr, s.openPay, supBalance(tx, s.openPay, s.id)]); });
    download('suppliers-' + todayStr() + '.csv', '﻿' + rows.map(function(r){return r.map(csvEsc).join(',');}).join('\n'), 'text/csv');
  };
  $('bk-ca').onclick = function(){
    var rows = [['ts','action','detail']];
    DB.get('audit', []).forEach(function(a){ rows.push([new Date(a.ts).toISOString(), a.action, a.detail]); });
    download('audit-' + todayStr() + '.csv', '﻿' + rows.map(function(r){return r.map(csvEsc).join(',');}).join('\n'), 'text/csv');
  };
  var rd = $('bk-rd');
  if (rd) rd.onclick = function(){
    confirmDlg(T('resetDemo') + '?', function(){ seedDemo(true); toast(T('resetDemo') + ' ✓'); render(); });
  };
}
function doRestoreFile(f){
  var rd = new FileReader();
  rd.onload = function(){
    try{
      var d = JSON.parse(rd.result);
      if (!d || typeof d !== 'object' || !('products' in d) || !('sales' in d)) throw new Error('bad');
      confirmDlg(T('restore') + '? ' + T('confirmDel'), function(){
        Object.keys(d).forEach(function(k){ if (k.charAt(0) !== '_') DB.set(k, d[k]); });
        audit('restore', 'backup restored');
        toast(T('restoreDone')); render();
      });
    }catch(e){ toast(T('invalidFile')); }
  };
  rd.readAsText(f);
}

/* ---------------- SETTINGS ---------------- */
function vSettings(){
  var units = S.units.join(', ');
  view().innerHTML = '<div class="section-title">⚙ ' + esc(T('settings')) + '</div><div class="card form">' +
    '<label>' + esc(T('shopName')) + '</label><input id="ss-n" value="' + esc(S.shopName || '') + '">' +
    '<label>' + esc(T('phone')) + '</label><input id="ss-p" inputmode="tel" value="' + esc(S.phone || '') + '" placeholder="0300 1234567">' +
    '<label>' + esc(T('address')) + '</label><input id="ss-a" value="' + esc(S.address || '') + '">' +
    '<label>' + esc(T('waNumber')) + ' (92300XXXXXXX)</label><input id="ss-w" inputmode="tel" value="' + esc(S.wa || '') + '">' +
    '<label>' + esc(T('units')) + '</label><input id="ss-u" value="' + esc(units) + '">' +
    '<label><input type="checkbox" id="ss-neg" style="width:auto" ' + (S.allowNeg ? 'checked' : '') + '> ' + esc(T('allowNeg')) + '</label>' +
    '<label><input type="checkbox" id="ss-demo" style="width:auto" ' + (S.demo ? 'checked' : '') + '> ' + esc(T('demoMode')) + ' (3 ' + esc(LANG === 'ur' ? 'دن' : 'days') + ')</label>' +
    '<div class="note">ℹ ' + esc(LANG === 'ur' ? 'ڈیمو 3 دن بعد لاک ہو جاتا ہے۔ اصل ڈیٹا موڈ کی کوئی میعاد نہیں۔' : 'Demo locks after 3 days. Real data mode has no expiry.') + '</div>' +
    '<button class="btn btn-green btn-block" id="ss-save">' + esc(T('save')) + '</button>' +
    '<div class="row2" style="margin-top:8px"><button class="btn btn-gray btn-sm" id="ss-pin">🔑 ' + esc(T('pinChange')) + '</button>' +
    '<button class="btn btn-gray btn-sm" id="ss-lang">🌐 ' + esc(T('language')) + '</button></div>' +
    '<button class="btn btn-red btn-block" id="ss-lock">🔒 ' + esc(T('logout')) + '</button></div>';
  $('ss-save').onclick = function(){
    S.shopName = $('ss-n').value.trim() || 'Jilan Karyana Store';
    S.phone = $('ss-p').value.trim(); S.address = $('ss-a').value.trim(); S.wa = $('ss-w').value.trim();
    var u = $('ss-u').value.split(',').map(function(x){return x.trim();}).filter(Boolean);
    if (u.length) S.units = u;
    S.allowNeg = $('ss-neg').checked;
    var wantDemo = $('ss-demo').checked;
    if (wantDemo !== S.demo) setDemo(wantDemo);
    saveSettings(); applyLang(); audit('settings', 'updated');
    toast(T('save') + ' ✓'); render();
  };
  $('ss-pin').onclick = function(){ S.pinHash = ''; saveSettings(); try{sessionStorage.removeItem('jksm_unlocked');}catch(e){} showLock(); };
  $('ss-lang').onclick = function(){ setLang(LANG === 'ur' ? 'en' : 'ur'); };
  $('ss-lock').onclick = lockApp;
}
function setDemo(on){
  if (on === S.demo) return;
  S.demo = on; DB.pfx = on ? 'jksd_' : 'jksm_';
  if (on){ ensureDemoSince(); seedDemo(false); }
  saveSettings(); applyLang();
  audit('demo_' + (on ? 'on' : 'off'), '');
}
function seedDemo(force){
  if (DB.get('products', null) !== null && !force) return;
  DB.set('products', seedProducts());
  var d = seedDemoExtra();
  DB.set('cust', d.cust); DB.set('sup', d.sup);
  DB.set('sales', []); DB.set('purchases', []); DB.set('custTx', []); DB.set('supTx', []);
  DB.set('cash', []); DB.set('exp', []); DB.set('moves', []); DB.set('sessions', []);
  DB.set('reminders', []); DB.set('audit', []);
  var st = DB.get('settings', S); st.billSeq = 1; DB.set('settings', st);
}

/* ---------------- MORE ---------------- */
function vMore(){
  var items = [
    ['sales', '🧾', 'salesHistory'], ['cash', '💰', 'cashbook'], ['purchases', '📥', 'purchases'],
    ['expenses', '💸', 'expenses'], ['reports', '📈', 'reports'], ['backup', '💾', 'backup'],
    ['settings', '⚙', 'settings']
  ];
  view().innerHTML = '<div class="section-title">⋯ ' + esc(T('more')) + '</div>' + demoCountdownNote() +
    items.map(function(it){ return '<div class="list-item" data-m="' + it[0] + '"><div class="grow"><div class="t">' + it[1] + ' ' + esc(T(it[2])) + '</div></div><span>›</span></div>'; }).join('') +
    '<div class="list-item" data-m="lock"><div class="grow"><div class="t">🔒 ' + esc(T('logout')) + '</div></div><span>›</span></div>' +
    '<div class="note">Jilan Apps · v2.0 · ' + esc(T('dataLocal')) + '</div>';
  var bs = view().querySelectorAll('[data-m]');
  for (var i=0;i<bs.length;i++) bs[i].onclick = function(){
    var m = this.getAttribute('data-m');
    if (m === 'lock'){ lockApp(); return; }
    CUR.view = m; CUR.sub = ''; renderNav(); render();
  };
}

/* ---------------- INIT ---------------- */
function seedIfNeeded(){
  if (DB.get('products', null) === null) DB.set('products', seedProducts());
  ['sales','purchases','cust','custTx','sup','supTx','cash','exp','moves','sessions','reminders','audit'].forEach(function(k){
    if (DB.get(k, null) === null) DB.set(k, []);
  });
}
function init(){
  /* demo toggle persisted? settings.demo decides prefix */
  var raw = null;
  try{ raw = localStorage.getItem('jksm_settings'); }catch(e){}
  if (raw){ try{ var s0 = JSON.parse(raw); DB.pfx = s0.demo ? 'jksd_' : 'jksm_'; }catch(e){} }
  loadSettings();
  DB.pfx = S.demo ? 'jksd_' : 'jksm_';
  if (S.demo) ensureDemoSince();
  seedIfNeeded();
  $('lang-btn').onclick = function(){ setLang(LANG === 'ur' ? 'en' : 'ur'); };
  $('import-file').addEventListener('change', function(){ if (this.files[0]) doRestoreFile(this.files[0]); this.value = ''; });
  document.addEventListener('backbutton', function(){ lockApp(); }, false);
  applyLang();
  if (!isUnlocked()) showLock(); else { $('app-header').style.display = ''; $('bottom-nav').style.display = ''; render(); }
}

/* public API for inline handlers */
window.KSM = { go:go, closeModal:closeModal, khataTab:khataTab,
  _t:{ DB:DB, getS:function(){return S;}, getBill:function(){return bill;}, setBill:function(b){bill=b;},
    confirmSale:confirmSale, findSale:findSale, voidSale:voidSale, getProd:getProd, getCust:getCust, getSup:getSup,
    custBalance:custBalance, supBalance:supBalance, cashSums:cashSums, sessionExpected:sessionExpected,
    stockVal:stockVal, saleProfit:saleProfit, curSession:curSession, newId:newId, r2:r2, num:num,
    invoiceHTML:invoiceHTML, demoExpired:demoExpired, demoDaysLeft:demoDaysLeft, ensureDemoSince:ensureDemoSince } };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

/* expose pure logic for node tests */
if (typeof module !== 'undefined' && module.exports){
  module.exports = { calcBill:calcBill, custBalance:custBalance, supBalance:supBalance, cashSums:cashSums,
    sessionExpected:sessionExpected, sessionTxns:sessionTxns, stockVal:stockVal, saleProfit:saleProfit,
    rangeTxns:rangeTxns, billNo:billNo, r2:r2, num:num, sha256:sha256, demoMs: DEMO_MS };
}
})();
