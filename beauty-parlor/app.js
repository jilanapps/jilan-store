"use strict";
/* Jilan Beauty Parlor — demo app (localStorage, demo-labeled) */

/* ---------- i18n ---------- */
var LANG = 'en';
var T = {
en:{home:'Home',services:'Services',packages:'Packages',bookings:'Bookings',account:'Account',
  tagline:'Beauty, Elegance & Care',heroT:'Look Your Best, Every Day',
  heroS:'Premium salon services — hair, skin, makeup & bridal. Book your appointment in seconds.',
  bookNow:'Book Now',viewAll:'View all services',pop:'Popular Services',deals:'Bridal Packages',
  gallery:'Our Gallery',reviews:'Happy Clients',duration:'min',rs:'Rs',
  pickService:'1️⃣ Choose a service',pickDate:'2️⃣ Choose a date',pickSlot:'3️⃣ Choose a time',
  yourDetails:'4️⃣ Your details',name:'Full name',mobile:'Mobile number',notes:'Notes (optional)',
  confirm:'Confirm Booking',bookingOk:'Booking Confirmed! 🎉',bookingNo:'Booking No',
  waBook:'Book on WhatsApp',track:'Track / My Bookings',enterNo:'Enter booking number',
  find:'Find',noBooking:'No booking found.',status:'Status',
  admin:'Admin Panel',login:'Login',username:'Username',password:'Password',logout:'Logout',
  demoCreds:'Demo login — admin / jilan123',dash:'Dashboard',todayBk:'Today\'s bookings',
  totalBk:'Total bookings',pending:'Pending',servicesN:'Services',addService:'Add Service',
  svcName:'Service name',svcNameUr:'Service name (Urdu)',category:'Category',price:'Price (Rs)',
  dur:'Duration (min)',desc:'Description',save:'Save',cancel:'Cancel',edit:'Edit',del:'Delete',
  actions:'Actions',date:'Date',time:'Time',customer:'Customer',service:'Service',
  confirmB:'Confirm',complete:'Complete',cancelB:'Cancel',noData:'No records yet.',
  settings:'Settings',waNum:'Shop WhatsApp number (e.g. 923001234567)',saveSet:'Save Settings',
  waSetup:'WhatsApp number not configured. Admin → Settings me number add karein.',
  shareWa:'Share on WhatsApp',search:'Search services…',all:'All',
  langName:'اردو',invalidMobile:'Please enter a valid mobile number (03XXXXXXXXX).',
  invalidName:'Please enter your name.',pickSlotErr:'Please choose a time slot.',
  cat_hair:'💇 Hair',cat_skin:'✨ Skin',cat_makeup:'💄 Makeup',cat_hands:'💅 Hands & Feet',cat_wax:'🪒 Waxing & Threading',
  pkgSilver:'Silver Package',pkgGold:'Gold Package',pkgPlatinum:'Platinum Package',
  incl:'Includes',demoNote:'Sample prices — editable demo data.',
  bkDatePast:'Please choose today or a future date.'},
ur:{home:'ہوم',services:'سروسز',packages:'پیکجز',bookings:'بکنگز',account:'اکاؤنٹ',
  tagline:'خوبصورتی، نفاست اور دیکھ بھال',heroT:'ہر دن خوبصورت نظر آئیں',
  heroS:'پریمیم سیلون سروسز — بال، جلد، میک اپ اور دلہن۔ سیکنڈوں میں اپائنٹمنٹ بک کریں۔',
  bookNow:'بک کریں',viewAll:'تمام سروسز دیکھیں',pop:'مقبول سروسز',deals:'دلہن پیکجز',
  gallery:'ہماری گیلری',reviews:'خوش کلائنٹس',duration:'منٹ',rs:'روپے',
  pickService:'1️⃣ سروس چنیں',pickDate:'2️⃣ تاریخ چنیں',pickSlot:'3️⃣ وقت چنیں',
  yourDetails:'4️⃣ آپ کی تفصیل',name:'پورا نام',mobile:'موبائل نمبر',notes:'نوٹس (اختیاری)',
  confirm:'بکنگ کنفرم کریں',bookingOk:'بکنگ کنفرم ہو گئی! 🎉',bookingNo:'بکنگ نمبر',
  waBook:'واٹس ایپ پر بک کریں',track:'بکنگ تلاش کریں',enterNo:'بکنگ نمبر لکھیں',
  find:'تلاش',noBooking:'کوئی بکنگ نہیں ملی۔',status:'اسٹیٹس',
  admin:'ایڈمن پینل',login:'لاگ اِن',username:'یوزر نیم',password:'پاس ورڈ',logout:'لاگ آؤٹ',
  demoCreds:'ڈیمو لاگ اِن — admin / jilan123',dash:'ڈیش بورڈ',todayBk:'آج کی بکنگز',
  totalBk:'کل بکنگز',pending:'زیر التواء',servicesN:'سروسز',addService:'سروس شامل کریں',
  svcName:'سروس کا نام',svcNameUr:'سروس کا نام (اردو)',category:'کیٹیگری',price:'قیمت (روپے)',
  dur:'دورانیہ (منٹ)',desc:'تفصیل',save:'محفوظ کریں',cancel:'منسوخ',edit:'ترمیم',del:'حذف کریں',
  actions:'عمل',date:'تاریخ',time:'وقت',customer:'کسٹمر',service:'سروس',
  confirmB:'کنفرم',complete:'مکمل',cancelB:'منسوخ',noData:'ابھی کوئی ریکارڈ نہیں۔',
  settings:'سیٹنگز',waNum:'دکان کا واٹس ایپ نمبر (مثلاً 923001234567)',saveSet:'سیٹنگز محفوظ کریں',
  waSetup:'واٹس ایپ نمبر سیٹ نہیں۔ ایڈمن → سیٹنگز میں نمبر ڈالیں۔',
  shareWa:'واٹس ایپ پر شیئر کریں',search:'سروس تلاش کریں…',all:'تمام',
  langName:'English',invalidMobile:'درست موبائل نمبر لکھیں (03XXXXXXXXX)۔',
  invalidName:'اپنا نام لکھیں۔',pickSlotErr:'وقت کا انتخاب کریں۔',
  cat_hair:'💇 بال',cat_skin:'✨ جلد',cat_makeup:'💄 میک اپ',cat_hands:'💅 ہاتھ و پاؤں',cat_wax:'🪒 ویکسنگ و تھریڈنگ',
  pkgSilver:'سلور پیکج',pkgGold:'گولڈ پیکج',pkgPlatinum:'پلاٹنم پیکج',
  incl:'شامل ہے',demoNote:'نمونہ قیمتیں — قابل ترمیم ڈیمو ڈیٹا۔',
  bkDatePast:'آج یا آنے والی تاریخ چنیں۔'}
};
function t(k){ return (T[LANG]&&T[LANG][k]) || T.en[k] || k; }
function svcName(s){ return LANG==='ur'&&s.nameUr ? s.nameUr : s.nameEn; }

/* ---------- seed data ---------- */
var CATS=['hair','skin','makeup','hands','wax'];
var SEED_SERVICES=[
 // [id,cat,en,ur,price,dur,descEn,emoji,popular]
 [1,'hair','Ladies Haircut','لیڈیز ہیئر کٹ',500,30,'Stylish cut with wash & blowdry','💇',1],
 [2,'hair','Haircut + Blowdry','ہیئر کٹ + بلاؤ ڈرائی',800,45,'Cut, wash, professional blowdry finish','💇',0],
 [3,'hair','Full Hair Coloring','مکمل ہیئر کلرنگ',3500,120,'Premium ammonia-free color, all lengths','🎨',1],
 [4,'hair','Highlights / Streaks','ہائی لائٹس',4500,150,'Foil highlights with toner finish','✨',0],
 [5,'hair','Hair Rebonding','ہیئر ری بانڈنگ',8000,240,'Permanent straightening, silky smooth','💁',1],
 [6,'hair','Keratin Treatment','کیراٹن ٹریٹمنٹ',10000,180,'Deep keratin therapy for frizz-free hair','🌟',0],
 [7,'hair','Hair Spa','ہیئر سپا',2000,60,'Deep conditioning spa with head massage','💆',0],
 [8,'hair','Hair Mehndi','بالوں کی مہندی',1500,90,'Natural henna coloring & conditioning','🌿',0],
 [9,'skin','Signature Facial','سگنیچر فیشل',2500,60,'Deep cleanse, exfoliate, mask & massage','🧖',1],
 [10,'skin','Gold Facial','گولڈ فیشل',4000,75,'24k gold glow facial for radiant skin','👑',1],
 [11,'skin','Diamond Facial','ڈائمنڈ فیشل',5500,75,'Luxury diamond polish facial','💎',0],
 [12,'skin','Whitening Facial','وائٹننگ فیشل',3500,70,'Brightening facial for even tone','🌸',0],
 [13,'skin','Cleanup','کلین اپ',1500,40,'Quick deep-cleanse for fresh skin','🍃',0],
 [14,'skin','Face Polish','فیس پالش',1200,30,'Instant glow polish','✨',0],
 [15,'makeup','Party Makeup','پارٹی میک اپ',3500,60,'Glam party look with lashes','💄',1],
 [16,'makeup','Engagement Makeup','منگنی میک اپ',8000,90,'Elegant engagement bridal look','💍',0],
 [17,'makeup','Signature Bridal Makeup','سگنیچر برائیڈل میک اپ',25000,180,'Complete bridal transformation','👰',1],
 [18,'makeup','Deluxe Bridal Makeup','ڈیلکس برائیڈل میک اپ',40000,240,'Premium bridal + trial + touchup kit','👰',0],
 [19,'makeup','Eye Makeup Only','صرف آئی میک اپ',1500,30,'Stunning eye look','👁️',0],
 [20,'hands','Manicure','مینیکیور',1200,45,'Nail shaping, cuticle care & polish','💅',0],
 [21,'hands','Pedicure','پیڈیکیور',1500,60,'Foot soak, scrub & polish','🦶',0],
 [22,'hands','Mani + Pedi Combo','مینیکیور + پیڈیکیور',2500,100,'Complete hand & foot care','💅',1],
 [23,'wax','Full Body Wax','فل باڈی ویکس',3000,90,'Smooth full-body waxing','🪒',0],
 [24,'wax','Half Legs Wax','آدھی ٹانگوں کی ویکس',800,30,'Quick half-leg wax','🦵',0],
 [25,'wax','Full Arms Wax','پورے بازوؤں کی ویکس',1000,30,'Smooth arms waxing','💪',0],
 [26,'wax','Eyebrow Threading','آئی برو تھریڈنگ',200,10,'Perfect shaped brows','🤨',1],
 [27,'wax','Upper Lips Threading','اپر لپس تھریڈنگ',150,10,'Gentle upper-lip threading','👄',0],
 [28,'wax','Face Threading','فیس تھریڈنگ',500,25,'Full face threading','🌝',0]
];
var PACKAGES=[
 {id:'silver',price:15000,itemsEn:['Party makeup','Hair styling','Manicure + Pedicure','Eyebrow threading'],itemsUr:['پارٹی میک اپ','ہیئر اسٹائلنگ','مینیکیور + پیڈیکیور','آئی برو تھریڈنگ']},
 {id:'gold',price:30000,itemsEn:['Signature bridal makeup','Hair coloring / styling','Gold facial','Mani + Pedi','Full arms wax'],itemsUr:['سگنیچر برائیڈل میک اپ','ہیئر کلرنگ / اسٹائلنگ','گولڈ فیشل','مینیکیور + پیڈیکیور','بازوؤں کی ویکس']},
 {id:'platinum',price:50000,itemsEn:['Deluxe bridal makeup + trial','Keratin / rebonding','Diamond facial','Full body wax','Mani + Pedi','Mehndi application'],itemsUr:['ڈیلکس برائیڈل میک اپ + ٹرائل','کیراٹن / ری بانڈنگ','ڈائمنڈ فیشل','فل باڈی ویکس','مینیکیور + پیڈیکیور','مہندی']}
];
var GALLERY=['💇','👰','💄','💅','🧖','✨','👑','💁','🌸'];
var REVIEWS=[
 {n:'Ayesha K.',s:5,x:'Best bridal makeup in town! I looked like a princess on my wedding day.'},
 {n:'Fatima R.',s:5,x:'Gold facial was amazing, my skin is glowing. Highly recommended!'},
 {n:'Sana M.',s:4,x:'Very professional staff, keratin treatment made my hair so smooth.'}
];
var SLOTS=['10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM','07:00 PM'];

/* ---------- storage ---------- */
var DB={services:[],bookings:[],settings:{wa:''},admin:false};
function load(){
  try{
    var s=localStorage.getItem('jbp_services');
    DB.services=s?JSON.parse(s):SEED_SERVICES.map(function(r){return{id:r[0],cat:r[1],nameEn:r[2],nameUr:r[3],price:r[4],dur:r[5],descEn:r[6],emoji:r[7],pop:r[8]};});
    var b=localStorage.getItem('jbp_bookings'); DB.bookings=b?JSON.parse(b):[];
    var st=localStorage.getItem('jbp_settings'); if(st)DB.settings=JSON.parse(st);
    DB.admin=localStorage.getItem('jbp_admin')==='1';
  }catch(e){}
}
function save(k){ try{localStorage.setItem('jbp_'+k,JSON.stringify(DB[k==='services'?'services':k==='bookings'?'bookings':'settings']));}catch(e){} }
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ---------- nav ---------- */
var VIEW='home', CAT='all', Q='', BK={serviceId:null,date:'',slot:''};
function go(v){VIEW=v;render();window.scrollTo(0,0);}
function $(id){return document.getElementById(id);}

/* ---------- views ---------- */
function render(){
  document.body.className=LANG==='ur'?'ur':'';
  $('langBtn').textContent=t('langName');
  $('hdrTag').textContent=t('tagline');
  var nav=[['home','🏠',t('home')],['services','💇',t('services')],['packages','👰',t('packages')],['bookings','📋',t('bookings')],['account','👤',t('account')]];
  $('bnav').innerHTML=nav.map(function(n){return '<button class="'+(VIEW===n[0]?'on':'')+'" onclick="go(\''+n[0]+'\')"><span class="ic">'+n[1]+'</span>'+n[2]+'</button>';}).join('');
  var v=$('view');
  if(VIEW==='home')v.innerHTML=vHome();
  else if(VIEW==='services')v.innerHTML=vServices();
  else if(VIEW==='booking')v.innerHTML=vBooking();
  else if(VIEW==='packages')v.innerHTML=vPackages();
  else if(VIEW==='gallery')v.innerHTML=vGallery();
  else if(VIEW==='reviews')v.innerHTML=vReviews();
  else if(VIEW==='bookings')v.innerHTML=vTrack();
  else if(VIEW==='account')v.innerHTML=vAccount();
  if(VIEW==='booking')initBooking();
}
function svcCard(s){
  return '<div class="card"><div class="thumb">'+s.emoji+'</div><div class="body">'+
  '<div class="nm">'+esc(svcName(s))+'</div><div class="ds">'+esc(s.descEn)+'</div>'+
  '<div class="meta"><span>⏱ '+s.dur+' '+t('duration')+'</span></div>'+
  '<div class="pr">'+t('rs')+' '+s.price.toLocaleString()+'</div></div>'+
  '<div class="ft"><button class="btn btn-pink btn-block btn-sm" onclick="startBooking('+s.id+')">'+t('bookNow')+'</button></div></div>';
}
function vHome(){
  var pop=DB.services.filter(function(s){return s.pop;}).slice(0,6);
  var cats=CATS.map(function(c){return '<button class="pill" onclick="CAT=\''+c+'\';go(\'services\')">'+t('cat_'+c)+'</button>';}).join('');
  return '<div class="hero"><h2>'+t('heroT')+'</h2><p>'+t('heroS')+'</p>'+
    '<button class="btn btn-gold" onclick="go(\'services\')">'+t('viewAll')+'</button></div>'+
  '<div class="wrap"><div class="sec-title">'+t('pop')+'</div><div class="grid">'+pop.map(svcCard).join('')+'</div>'+
  '<div class="sec-title">'+t('deals')+'</div>'+PACKAGES.slice(0,2).map(pkgCard).join('')+
  '<div class="sec-title">'+t('gallery')+'</div><div class="gal">'+GALLERY.slice(0,6).map(function(g){return '<div>'+g+'</div>';}).join('')+'</div>'+
  '<div style="text-align:center;margin:14px 0"><button class="btn btn-ghost btn-sm" onclick="go(\'gallery\')">'+t('viewAll')+'</button></div>'+
  '<div class="note">🏷️ DEMO by Jilan Apps · '+t('demoNote')+'</div></div>';
}
function pkgCard(p){
  var items=LANG==='ur'?p.itemsUr:p.itemsEn;
  return '<div class="pkg"><h3>👰 '+t('pkg'+p.id[0].toUpperCase()+p.id.slice(1))+'</h3>'+
  '<div class="pr">'+t('rs')+' '+p.price.toLocaleString()+'</div>'+
  '<div style="font-size:12px;color:#8a6d00;margin-top:4px">'+t('incl')+':</div><ul>'+
  items.map(function(i){return '<li>'+esc(i)+'</li>';}).join('')+'</ul>'+
  '<button class="btn btn-pink btn-sm" onclick="bookPackage(\''+p.id+'\')">'+t('bookNow')+'</button></div>';
}
function vServices(){
  var pills='<button class="pill'+(CAT==='all'?' on':'')+'" onclick="CAT=\'all\';render()">'+t('all')+'</button>'+
    CATS.map(function(c){return '<button class="pill'+(CAT===c?' on':'')+'" onclick="CAT=\''+c+'\';render()">'+t('cat_'+c)+'</button>';}).join('');
  var list=DB.services.filter(function(s){return (CAT==='all'||s.cat===CAT)&&(!Q||svcName(s).toLowerCase().indexOf(Q.toLowerCase())>=0||s.nameEn.toLowerCase().indexOf(Q.toLowerCase())>=0);});
  return '<div class="wrap"><div class="form" style="margin-top:10px"><input id="q" placeholder="'+t('search')+'" value="'+esc(Q)+'" oninput="Q=this.value;renderKeep()"></div>'+
  '<div class="pills" style="margin-top:8px">'+pills+'</div>'+
  (list.length?'<div class="grid">'+list.map(svcCard).join('')+'</div>':'<div class="empty">🔍 '+t('noData')+'</div>')+'</div>';
}
function renderKeep(){var q=$('q'),pos=q.selectionStart;render();var nq=$('q');if(nq){nq.focus();nq.setSelectionRange(pos,pos);}}
function vPackages(){return '<div class="wrap"><div class="sec-title">👰 '+t('deals')+'</div>'+PACKAGES.map(pkgCard).join('')+'<div class="note">🏷️ DEMO by Jilan Apps</div></div>';}
function vGallery(){return '<div class="wrap"><div class="sec-title">🖼️ '+t('gallery')+'</div><div class="gal">'+GALLERY.map(function(g){return '<div>'+g+'</div>';}).join('')+'</div></div>';}
function vReviews(){return '<div class="wrap"><div class="sec-title">⭐ '+t('reviews')+'</div>'+REVIEWS.map(function(r){return '<div class="rev"><div class="stars">'+'★'.repeat(r.s)+'</div><div>'+esc(r.x)+'</div><div class="who">— '+esc(r.n)+'</div></div>';}).join('')+'</div>';}

/* ---------- booking ---------- */
function startBooking(id){BK={serviceId:id,date:'',slot:''};go('booking');}
function bookPackage(pid){var p=PACKAGES.find(function(x){return x.id===pid;});BK={serviceId:null,packageId:pid,date:'',slot:''};go('booking');}
function bkItem(){ if(BK.packageId){var p=PACKAGES.find(function(x){return x.id===BK.packageId;});return{name:esc(t('pkg'+p.id[0].toUpperCase()+p.id.slice(1))),price:p.price,dur:180};} var s=DB.services.find(function(x){return x.id===BK.serviceId;});return s?{name:esc(svcName(s)),price:s.price,dur:s.dur}:null;}
function vBooking(){
  var it=bkItem(); if(!it)return '<div class="wrap"><div class="empty">'+t('noData')+'</div></div>';
  var today=new Date().toISOString().slice(0,10);
  return '<div class="wrap"><div class="form" style="margin-top:10px">'+
  '<h3 style="margin-top:0;color:var(--pink-d)">📅 '+(LANG==='ur'?'بکنگ':'Booking')+'</h3>'+
  '<div class="pkg" style="margin:0 0 10px"><b>'+it.name+'</b> · <span class="pr" style="font-size:18px">'+t('rs')+' '+it.price.toLocaleString()+'</span> · ⏱ '+it.dur+' '+t('duration')+'</div>'+
  '<label>'+t('pickDate')+'</label><input type="date" id="bkDate" min="'+today+'" value="'+(BK.date||today)+'"><div class="err" id="eDate">'+t('bkDatePast')+'</div>'+
  '<label>'+t('pickSlot')+'</label><div class="slots" id="slots"></div><div class="err" id="eSlot">'+t('pickSlotErr')+'</div>'+
  '<label>'+t('name')+'</label><input id="bkName" placeholder="'+t('name')+'"><div class="err" id="eName">'+t('invalidName')+'</div>'+
  '<label>'+t('mobile')+'</label><input id="bkMobile" inputmode="numeric" placeholder="03XXXXXXXXX"><div class="err" id="eMobile">'+t('invalidMobile')+'</div>'+
  '<label>'+t('notes')+'</label><textarea id="bkNotes" rows="2"></textarea>'+
  '<div style="margin-top:14px"><button class="btn btn-pink btn-block" onclick="confirmBooking()">'+t('confirm')+'</button></div>'+
  '<div style="margin-top:8px"><button class="btn btn-ghost btn-block" onclick="waBooking()">💬 '+t('waBook')+'</button></div>'+
  '</div></div>';
}
function initBooking(){
  var sd=$('bkDate'); if(BK.date)sd.value=BK.date;
  drawSlots();
  sd.addEventListener('change',function(){BK.date=sd.value;drawSlots();});
}
function bookedSlots(date){return DB.bookings.filter(function(b){return b.date===date&&b.status!=='Cancelled';}).map(function(b){return b.slot;});}
function drawSlots(){
  var d=$('bkDate').value||new Date().toISOString().slice(0,10); BK.date=d;
  var taken=bookedSlots(d);
  $('slots').innerHTML=SLOTS.map(function(s){
    var off=taken.indexOf(s)>=0;
    return '<div class="slot'+(off?' off':'')+(BK.slot===s?' on':'')+'" onclick="'+(off?'':'pickSlot(\''+s+'\')')+'">'+s+'</div>';
  }).join('');
}
function pickSlot(s){BK.slot=s;drawSlots();}
function validBooking(showErr){
  var ok=true;
  var today=new Date().toISOString().slice(0,10);
  if(!$('bkDate').value||$('bkDate').value<today){$('eDate').style.display='block';ok=false;}else $('eDate').style.display='none';
  if(!BK.slot){$('eSlot').style.display='block';ok=false;}else $('eSlot').style.display='none';
  if(!$('bkName').value.trim()){$('eName').style.display='block';ok=false;}else $('eName').style.display='none';
  if(!/^03\d{9}$/.test($('bkMobile').value.replace(/[\s-]/g,''))){$('eMobile').style.display='block';ok=false;}else $('eMobile').style.display='none';
  return ok;
}
function confirmBooking(){
  if(!validBooking(true))return;
  var it=bkItem();
  var no='JBP-'+Date.now().toString(36).toUpperCase();
  var b={no:no,serviceId:BK.serviceId||0,packageId:BK.packageId||'',item:it.name.replace(/<[^>]*>/g,''),price:it.price,
    date:$('bkDate').value,slot:BK.slot,name:$('bkName').value.trim(),mobile:$('bkMobile').value.replace(/[\s-]/g,''),
    notes:$('bkNotes').value.trim(),status:'Pending',ts:Date.now()};
  DB.bookings.unshift(b); save('bookings');
  $('view').innerHTML='<div class="wrap"><div class="ok-box"><div style="font-size:44px">✅</div><div class="big">'+t('bookingOk')+'</div>'+
  '<p>'+t('bookingNo')+': <b>'+no+'</b><br>'+esc(b.item)+'<br>'+b.date+' · '+b.slot+'<br>'+t('rs')+' '+b.price.toLocaleString()+'</p>'+
  '<button class="btn btn-pink" onclick="waShareBooking(\''+no+'\')">💬 '+t('shareWa')+'</button> '+
  '<button class="btn btn-ghost" onclick="go(\'home\')">'+t('home')+'</button></div></div>';
  window.scrollTo(0,0);
}
function waBooking(){
  if(!validBooking(true))return;
  var it=bkItem();
  var msg=(LANG==='ur'?'السلام علیکم! مجھے بکنگ چاہیے:%0A':'Assalam-o-Alaikum! I want to book:%0A')+
    encodeURIComponent(it.name.replace(/<[^>]*>/g,''))+'%0A'+$('bkDate').value+' '+BK.slot+'%0A'+
    encodeURIComponent($('bkName').value.trim())+' - '+$('bkMobile').value;
  openWa(msg);
}
function waShareBooking(no){
  var b=DB.bookings.find(function(x){return x.no===no;}); if(!b)return;
  var msg=encodeURIComponent('🎀 Jilan Beauty Parlor%0A'+t('bookingNo')+': '+b.no+'%0A'+b.item+'%0A'+b.date+' '+b.slot+'%0A'+t('rs')+' '+b.price);
  openWa(msg);
}
function openWa(msg){
  if(!DB.settings.wa){alert(t('waSetup'));return;}
  window.open('https://wa.me/'+DB.settings.wa+'?text='+msg,'_blank');
}

/* ---------- track bookings ---------- */
function vTrack(){
  return '<div class="wrap"><div class="form" style="margin-top:10px"><h3 style="margin-top:0;color:var(--pink-d)">📋 '+t('track')+'</h3>'+
  '<input id="trk" placeholder="'+t('enterNo')+'"><div style="margin-top:8px"><button class="btn btn-pink btn-block" onclick="doTrack()">'+t('find')+'</button></div>'+
  '<div id="trkRes" style="margin-top:10px"></div></div></div>';
}
function doTrack(){
  var q=$('trk').value.trim().toUpperCase();
  var b=DB.bookings.find(function(x){return x.no.toUpperCase()===q;});
  $('trkRes').innerHTML=b?
    '<div class="rev"><b>'+esc(b.no)+'</b><div>'+esc(b.item)+'</div><div>📅 '+b.date+' · '+b.slot+'</div><div>👤 '+esc(b.name)+' · '+esc(b.mobile)+'</div><div>'+t('rs')+' '+b.price.toLocaleString()+'</div><div style="margin-top:6px"><span class="st st-'+b.status+'">'+b.status+'</span></div></div>'
    :'<div class="empty">'+t('noBooking')+'</div>';
}

/* ---------- account / admin ---------- */
function vAccount(){
  if(!DB.admin){
    return '<div class="wrap"><div class="form" style="margin-top:10px;max-width:400px;margin-left:auto;margin-right:auto"><h3 style="color:var(--pink-d)">🔐 '+t('admin')+'</h3>'+
    '<div class="note">'+t('demoCreds')+'</div>'+
    '<label>'+t('username')+'</label><input id="adU"><label>'+t('password')+'</label><input id="adP" type="password">'+
    '<div class="err" id="eLogin">❌ Invalid credentials</div>'+
    '<div style="margin-top:10px"><button class="btn btn-pink btn-block" onclick="doLogin()">'+t('login')+'</button></div></div></div>';
  }
  var today=new Date().toISOString().slice(0,10);
  var tb=DB.bookings.filter(function(b){return b.date===today;});
  var pend=DB.bookings.filter(function(b){return b.status==='Pending';}).length;
  return '<div class="wrap"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="color:var(--pink-d)">🔐 '+t('admin')+'</h3>'+
  '<button class="chipbtn" onclick="DB.admin=false;localStorage.removeItem(\'jbp_admin\');go(\'account\')">'+t('logout')+'</button></div>'+
  '<div class="grid" style="grid-template-columns:1fr 1fr">'+
  '<div class="card"><div class="body"><div class="nm">'+t('todayBk')+'</div><div class="pr">'+tb.length+'</div></div></div>'+
  '<div class="card"><div class="body"><div class="nm">'+t('totalBk')+'</div><div class="pr">'+DB.bookings.length+'</div></div></div>'+
  '<div class="card"><div class="body"><div class="nm">'+t('pending')+'</div><div class="pr">'+pend+'</div></div></div>'+
  '<div class="card"><div class="body"><div class="nm">'+t('servicesN')+'</div><div class="pr">'+DB.services.length+'</div></div></div></div>'+
  '<div style="margin:12px 0;display:flex;gap:8px;flex-wrap:wrap">'+
  '<button class="btn btn-pink btn-sm" onclick="svcForm()">+ '+t('addService')+'</button>'+
  '<button class="btn btn-ghost btn-sm" onclick="adminTab=\'settings\';render()">⚙️ '+t('settings')+'</button></div>'+
  '<div id="adminBody">'+adminBody()+'</div></div>';
}
var adminTab='bookings';
function adminBody(){
  if(adminTab==='settings'){
    return '<div class="form"><h3 style="color:var(--pink-d)">⚙️ '+t('settings')+'</h3><label>'+t('waNum')+'</label>'+
    '<input id="waN" placeholder="923001234567" value="'+esc(DB.settings.wa)+'">'+
    '<div style="margin-top:10px"><button class="btn btn-pink" onclick="DB.settings.wa=$(\'waN\').value.replace(/\\D/g,\'\');save(\'settings\');alert(\'✅\')">'+t('saveSet')+'</button></div></div>';
  }
  var rows=DB.bookings.map(function(b,i){
    return '<tr><td><b>'+esc(b.no)+'</b><br><small>'+esc(b.item)+'</small></td><td>'+b.date+'<br>'+b.slot+'</td><td>'+esc(b.name)+'<br><small>'+esc(b.mobile)+'</small></td><td>'+t('rs')+' '+b.price.toLocaleString()+'</td>'+
    '<td><span class="st st-'+b.status+'">'+b.status+'</span></td><td><div class="rowbtns">'+
    (b.status==='Pending'?'<button class="chipbtn go" onclick="setBkStatus('+i+',\'Confirmed\')">'+t('confirmB')+'</button>':'')+
    (b.status==='Confirmed'?'<button class="chipbtn go" onclick="setBkStatus('+i+',\'Completed\')">'+t('complete')+'</button>':'')+
    (b.status!=='Cancelled'&&b.status!=='Completed'?'<button class="chipbtn no" onclick="setBkStatus('+i+',\'Cancelled\')">'+t('cancelB')+'</button>':'')+
    '</div></td></tr>';
  }).join('');
  var svcRows=DB.services.map(function(s){
    return '<tr><td>'+s.emoji+' '+esc(svcName(s))+'<br><small>'+t('cat_'+s.cat)+'</small></td><td>'+t('rs')+' '+s.price.toLocaleString()+'</td>'+
    '<td><div class="rowbtns"><button class="chipbtn" onclick="svcForm('+s.id+')">'+t('edit')+'</button><button class="chipbtn no" onclick="delSvc('+s.id+')">'+t('del')+'</button></div></td></tr>';
  }).join('');
  return '<div class="pills"><button class="pill'+(adminTab==='bookings'?' on':'')+'" onclick="adminTab=\'bookings\';render()">📋 '+t('bookings')+'</button>'+
  '<button class="pill'+(adminTab==='settings'?' on':'')+'" onclick="adminTab=\'settings\';render()">⚙️ '+t('settings')+'</button></div>'+
  (DB.bookings.length?'<div style="overflow-x:auto"><table class="tbl"><tr><th>'+t('bookingNo')+'</th><th>'+t('date')+'/'+t('time')+'</th><th>'+t('customer')+'</th><th>'+t('price')+'</th><th>'+t('status')+'</th><th>'+t('actions')+'</th></tr>'+rows+'</table></div>':'<div class="empty">'+t('noData')+'</div>')+
  '<h3 style="color:var(--pink-d);margin-top:18px">💇 '+t('servicesN')+'</h3>'+
  '<div style="overflow-x:auto"><table class="tbl"><tr><th>'+t('service')+'</th><th>'+t('price')+'</th><th>'+t('actions')+'</th></tr>'+svcRows+'</table></div>';
}
function setBkStatus(i,st){DB.bookings[i].status=st;save('bookings');render();}
function doLogin(){
  if($('adU').value==='admin'&&$('adP').value==='jilan123'){DB.admin=true;try{localStorage.setItem('jbp_admin','1');}catch(e){}go('account');}
  else $('eLogin').style.display='block';
}
function svcForm(id){
  var s=id?DB.services.find(function(x){return x.id===id;}):{id:Date.now(),cat:'hair',nameEn:'',nameUr:'',price:0,dur:30,descEn:'',emoji:'💇',pop:0};
  var html='<div class="form"><h3>'+(id?t('edit'):t('addService'))+'</h3>'+
  '<label>'+t('svcName')+'</label><input id="sfEn" value="'+esc(s.nameEn)+'">'+
  '<label>'+t('svcNameUr')+'</label><input id="sfUr" value="'+esc(s.nameUr||'')+'">'+
  '<label>'+t('category')+'</label><select id="sfCat">'+CATS.map(function(c){return '<option value="'+c+'"'+(s.cat===c?' selected':'')+'>'+t('cat_'+c)+'</option>';}).join('')+'</select>'+
  '<label>'+t('price')+'</label><input id="sfPrice" type="number" value="'+s.price+'">'+
  '<label>'+t('dur')+'</label><input id="sfDur" type="number" value="'+s.dur+'">'+
  '<label>'+t('desc')+'</label><input id="sfDesc" value="'+esc(s.descEn||'')+'">'+
  '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-pink" onclick="saveSvc('+s.id+')">'+t('save')+'</button><button class="btn btn-ghost" onclick="render()">'+t('cancel')+'</button></div></div>';
  openModal(html);
}
function saveSvc(id){
  var en=$('sfEn').value.trim(); if(!en){alert('!');return;}
  var i=DB.services.findIndex(function(x){return x.id===id;});
  var obj={id:id,cat:$('sfCat').value,nameEn:en,nameUr:$('sfUr').value.trim(),price:parseInt($('sfPrice').value)||0,dur:parseInt($('sfDur').value)||30,descEn:$('sfDesc').value.trim(),emoji:'💇',pop:0};
  if(i>=0)DB.services[i]=obj; else DB.services.push(obj);
  save('services'); closeModal(); render();
}
function delSvc(id){ if(confirm('Delete?')){DB.services=DB.services.filter(function(x){return x.id!==id;});save('services');render();} }
function openModal(html){$('modalBody').innerHTML=html;$('modalBg').classList.add('show');}
function closeModal(){$('modalBg').classList.remove('show');}

/* ---------- boot ---------- */
function toggleLang(){LANG=LANG==='en'?'ur':'en';try{localStorage.setItem('jbp_lang',LANG);}catch(e){}render();}
document.addEventListener('DOMContentLoaded',function(){
  try{LANG=localStorage.getItem('jbp_lang')||'en';}catch(e){}
  load();
  document.body.insertAdjacentHTML('afterbegin','<div class="demo-banner">🏷️ DEMO by Jilan Apps</div>');
  $('waFab').onclick=function(){openWa(encodeURIComponent('Assalam-o-Alaikum! Jilan Beauty Parlor'));};
  render();
});
