"use strict";
/* Jilan Homeopathic Clinic — demo app (localStorage, demo-labeled) */

/* ---------- i18n ---------- */
var LANG='en';
var T={
en:{home:'Home',services:'Services',remedies:'Remedies',book:'Book',doctor:'Doctor',
tagline:'Natural Healing, Trusted Care',
heroT:'Jilan Homeopathic Clinic',
heroS:'Gentle, natural homeopathic treatment for the whole family. Book your visit in seconds.',
bookNow:'Book Appointment',viewAll:'View all services',rs:'Rs',
docTitle:'Doctor Profile',demoTag:'DEMO SAMPLE',
timings:'Clinic Timings',timingsNote:'Demo timings — editable in Doctor → Settings.',
quick:'Quick Actions',qaBook:'📅 Book Appointment',qaRemedies:'🌿 Remedies Info',qaWa:'💬 WhatsApp',
svcTitle:'Our Services',svcSub:'Consultation fee is a demo sample.',popSvc:'Popular Services',svcFee:'Consultation fee',
stepService:'1️⃣ Choose a service',stepDate:'2️⃣ Choose a date',stepSlot:'3️⃣ Choose a time',stepDetail:'4️⃣ Your details',
name:'Full name',mobile:'Mobile number',age:'Age',gender:'Gender',male:'Male',female:'Female',other:'Other',
symptoms:'Symptoms / notes (optional)',
confirm:'Confirm Appointment',apptOk:'Appointment Booked! 🎉',tokenNo:'Token No',shareWa:'Share on WhatsApp',
closedSun:'Sun — Closed',lunchNote:'Lunch break 2–4 PM',friNote:'Friday 1–3 PM prayer break',
invalidMobile:'Please enter a valid mobile number (03XXXXXXXXX).',invalidName:'Please enter your name.',
pickSlotErr:'Please choose a time slot.',pickSvcErr:'Please choose a service.',ageErr:'Please enter a valid age.',
remT:'Homeopathic Remedies',remSub:'Educational information about commonly used homeopathic medicines.',
disclaimer:'Ye maloomat sirf taleemi hain. Dawa hamesha qualified doctor ke mashware se lein. / For information only — always consult a qualified doctor.',
potency:'Potency examples',uses:'Common traditional uses',
admin:'Doctor Panel',login:'Login',username:'Username',password:'Password',logout:'Logout',
demoCreds:'Demo login — admin / jilan123',
dash:'Dashboard',todayAppt:"Today's appointments",totalPatients:'Total patients',pendingAppt:'Pending appointments',completedToday:'Completed today',
patients:'Patients',addPatient:'Add Patient',searchP:'Search patients…',
address:'Address',history:'Medical history notes',allergies:'Allergies',
appointments:'Appointments',rx:'Prescriptions',queue:'Token Queue',settingsTab:'Settings',
noData:'No records yet.',confirmB:'Confirm',complete:'Complete',cancelB:'Cancel',
actions:'Actions',date:'Date',time:'Time',patient:'Patient',service:'Service',status:'Status',token:'Token',
writeRx:'Write Prescription',selectPatient:'Select patient',walkin:'Walk-in patient',walkinName:'Walk-in name',
medName:'Medicine name',potencyL:'Potency (e.g. 30C)',dosage:'Dosage (e.g. 5 drops TDS)',duration:'Duration (e.g. 7 days)',
addMed:'+ Add medicine',advice:'Advice / notes',saveRx:'Save Prescription',
rxFor:'Prescription for',rxNo:'Rx No',rxHistory:'Prescription history',viewRx:'View',printRx:'🖨️ Print',
rxAdviceT:'Advice',sig:"Doctor's Signature",rxSaved:'Prescription saved ✅',
queueNow:'Now Serving',queueNext:'Next ▶',queueStart:'Start ▶',queueEmpty:'No confirmed appointments today.',queueDone:'Queue complete ✅',queueRem:'waiting',
setTitle:'Clinic Settings',setClinic:'Clinic name',setDoc:'Doctor name',setQual:'Qualification',setExp:'Experience',
setAddr:'Clinic address',setTimings:'Timings text',waNum:'Clinic WhatsApp number (e.g. 923001234567)',
saveSet:'Save Settings',resetDemo:'♻️ Reset demo data',resetDone:'Demo data reset ✅',
waSetup:'WhatsApp number not configured. Doctor → Settings me number add karein.',waBookMsg:'Book on WhatsApp',langName:'اردو',
edit:'Edit',del:'Delete',save:'Save',cancel:'Cancel',search:'Search',
stPending:'Pending',stConfirmed:'Confirmed',stCompleted:'Completed',stCancelled:'Cancelled',
yrs:'yrs',demoBadge:'DEMO',
timingsVal:'Mon–Sat: 10 AM – 2 PM, 4 PM – 9 PM · Sun: Closed'},
ur:{home:'ہوم',services:'سروسز',remedies:'ادویات',book:'بکنگ',doctor:'ڈاکٹر',
tagline:'قدرتی علاج، بھروسہ مند دیکھ بھال',
heroT:'جیلان ہومیوپیتھک کلینک',
heroS:'پورے خاندان کے لیے نرم، قدرتی ہومیوپیتھک علاج۔ سیکنڈوں میں اپائنٹمنٹ بک کریں۔',
bookNow:'اپائنٹمنٹ بک کریں',viewAll:'تمام سروسز دیکھیں',rs:'روپے',
docTitle:'ڈاکٹر کی پروفائل',demoTag:'ڈیمو نمونہ',
timings:'کلینک کے اوقات',timingsNote:'ڈیمو اوقات — ڈاکٹر → سیٹنگز میں قابل ترمیم۔',
quick:'فوری اقدامات',qaBook:'📅 اپائنٹمنٹ بک کریں',qaRemedies:'🌿 ادویات کی معلومات',qaWa:'💬 واٹس ایپ',
svcTitle:'ہماری سروسز',svcSub:'مشاورتی فیس ڈیمو نمونہ ہے۔',popSvc:'مقبول سروسز',svcFee:'مشاورتی فیس',
stepService:'1️⃣ سروس چنیں',stepDate:'2️⃣ تاریخ چنیں',stepSlot:'3️⃣ وقت چنیں',stepDetail:'4️⃣ آپ کی تفصیل',
name:'پورا نام',mobile:'موبائل نمبر',age:'عمر',gender:'صنف',male:'مرد',female:'عورت',other:'دیگر',
symptoms:'علامات / نوٹس (اختیاری)',
confirm:'اپائنٹمنٹ کنفرم کریں',apptOk:'اپائنٹمنٹ بک ہو گئی! 🎉',tokenNo:'ٹوکن نمبر',shareWa:'واٹس ایپ پر شیئر کریں',
closedSun:'اتوار — بند',lunchNote:'دوپہر 2–4 وقفہ',friNote:'جمعہ 1–3 نماز کا وقفہ',
invalidMobile:'درست موبائل نمبر لکھیں (03XXXXXXXXX)۔',invalidName:'اپنا نام لکھیں۔',
pickSlotErr:'وقت کا انتخاب کریں۔',pickSvcErr:'سروس کا انتخاب کریں۔',ageErr:'عمر درست لکھیں۔',
remT:'ہومیوپیتھک ادویات',remSub:'عام استعمال ہونے والی ہومیوپیتھک ادویات کے بارے میں تعلیمی معلومات۔',
disclaimer:'یہ معلومات صرف تعلیمی ہیں۔ دوا ہمیشہ مستند ڈاکٹر کے مشورے سے لیں۔',
potency:'طاقت کی مثالیں',uses:'عام روایتی استعمالات',
admin:'ڈاکٹر پینل',login:'لاگ اِن',username:'یوزر نیم',password:'پاس ورڈ',logout:'لاگ آؤٹ',
demoCreds:'ڈیمو لاگ اِن — admin / jilan123',
dash:'ڈیش بورڈ',todayAppt:'آج کی اپائنٹمنٹس',totalPatients:'کل مریض',pendingAppt:'زیر التواء اپائنٹمنٹس',completedToday:'آج مکمل شدہ',
patients:'مریض',addPatient:'مریض شامل کریں',searchP:'مریض تلاش کریں…',
address:'پتہ',history:'طبی پس منظر کے نوٹس',allergies:'الرجیز',
appointments:'اپائنٹمنٹس',rx:'نسخے',queue:'ٹوکن قطار',settingsTab:'سیٹنگز',
noData:'ابھی کوئی ریکارڈ نہیں۔',confirmB:'کنفرم',complete:'مکمل',cancelB:'منسوخ',
actions:'عمل',date:'تاریخ',time:'وقت',patient:'مریض',service:'سروس',status:'اسٹیٹس',token:'ٹوکن',
writeRx:'نسخہ لکھیں',selectPatient:'مریض چنیں',walkin:'واک اِن مریض',walkinName:'واک اِن کا نام',
medName:'دوا کا نام',potencyL:'طاقت (مثلاً 30C)',dosage:'خوراک (مثلاً 5 قطرے TDS)',duration:'مدت (مثلاً 7 دن)',
addMed:'+ دوا شامل کریں',advice:'ہدایات / نوٹس',saveRx:'نسخہ محفوظ کریں',
rxFor:'نسخہ برائے',rxNo:'نسخہ نمبر',rxHistory:'نسخوں کی فہرست',viewRx:'دیکھیں',printRx:'🖨️ پرنٹ کریں',
rxAdviceT:'ہدایات',sig:'ڈاکٹر کے دستخط',rxSaved:'نسخہ محفوظ ہو گیا ✅',
queueNow:'ابھی چل رہا ٹوکن',queueNext:'اگلا ▶',queueStart:'شروع کریں ▶',queueEmpty:'آج کوئی کنفرم اپائنٹمنٹ نہیں۔',queueDone:'قطار مکمل ✅',queueRem:'منتظر',
setTitle:'کلینک سیٹنگز',setClinic:'کلینک کا نام',setDoc:'ڈاکٹر کا نام',setQual:'قابلیت',setExp:'تجربہ',
setAddr:'کلینک کا پتہ',setTimings:'اوقات کا متن',waNum:'کلینک کا واٹس ایپ نمبر (مثلاً 923001234567)',
saveSet:'سیٹنگز محفوظ کریں',resetDemo:'♻️ ڈیمو ڈیٹا ری سیٹ کریں',resetDone:'ڈیمو ڈیٹا ری سیٹ ہو گیا ✅',
waSetup:'واٹس ایپ نمبر سیٹ نہیں۔ ڈاکٹر → سیٹنگز میں نمبر ڈالیں۔',waBookMsg:'واٹس ایپ پر بک کریں',langName:'English',
edit:'ترمیم',del:'حذف کریں',save:'محفوظ کریں',cancel:'منسوخ',search:'تلاش',
stPending:'زیر التواء',stConfirmed:'کنفرم شدہ',stCompleted:'مکمل',stCancelled:'منسوخ',
yrs:'سال',demoBadge:'ڈیمو',
timingsVal:'پیر–ہفتہ: صبح 10 – دوپہر 2، شام 4 – رات 9 · اتوار: بند'}
};
function t(k){ return (T[LANG]&&T[LANG][k]) || T.en[k] || k; }

/* ---------- data ---------- */
var SERVICES=[
 {id:1,icon:'🩺',en:'General Treatment',ur:'عام علاج',fee:500,dEn:'Fever, flu, weakness & everyday health complaints.',dUr:'بخار، نزلہ زکام، کمزوری اور روزمرہ کی تکالیف۔'},
 {id:2,icon:'🧴',en:'Skin Diseases',ur:'جلد کی بیماریاں',fee:600,dEn:'Itching, allergy, eczema & other skin complaints.',dUr:'خارش، الرجی، ایگزیما اور جلد کی دیگر تکالیف۔'},
 {id:3,icon:'💇',en:'Hair Fall',ur:'بالوں کا گرنا',fee:600,dEn:'Hair loss, dandruff & weak hair roots.',dUr:'بالوں کا گرنا، خشکی اور کمزور جڑیں۔'},
 {id:4,icon:'🍽️',en:'Digestive Disorders',ur:'معدے کی تکالیف',fee:500,dEn:'Acidity, gas, indigestion & stomach complaints.',dUr:'تیزابیت، گیس، بدہضمی اور معدے کی تکالیف۔'},
 {id:5,icon:'🦵',en:'Joint Pain',ur:'جوڑوں کا درد',fee:500,dEn:'Arthritis, backache, knee & joint pains.',dUr:'گٹھیا، کمر درد، گھٹنوں اور جوڑوں کا درد۔'},
 {id:6,icon:'👩',en:"Women's Health",ur:'خواتین کی صحت',fee:700,dEn:'Hormonal & general health concerns for women.',dUr:'خواتین کے ہارمونل اور عمومی صحت کے مسائل۔'},
 {id:7,icon:'👶',en:"Children's Health",ur:'بچوں کی صحت',fee:400,dEn:'Gentle treatment for kids — colic, teething, cough.',dUr:'بچوں کے لیے نرم علاج — پیٹ درد، دانت، کھانسی۔'}
];
var REMEDIES=[
 {n:'Arnica Montana',uEn:'Traditionally used in homeopathy for bruises, sprains and muscle soreness.',uUr:'ہومیوپیتھی میں چوٹ، موچ اور پٹھوں کے درد کے لیے روایتی طور پر استعمال ہوتی ہے۔',pot:'30C, 200C'},
 {n:'Belladonna',uEn:'Traditional homeopathic use for sudden high fever and throbbing headache.',uUr:'اچانک تیز بخار اور دھڑکتے سر درد کے لیے روایتی ہومیوپیتھک استعمال۔',pot:'30C'},
 {n:'Nux Vomica',uEn:'Traditionally used for indigestion, acidity and constipation linked with a sedentary lifestyle.',uUr:'بدہضمی، تیزابیت اور قبض کے لیے روایتی استعمال، خاص طور پر بیٹھے رہنے والے طرزِ زندگی میں۔',pot:'30C, 200C'},
 {n:'Sulphur',uEn:'Widely used in homeopathic practice for itching skin and burning sensations.',uUr:'جلد کی خارش اور جلن کے لیے ہومیوپیتھک مشق میں عام استعمال۔',pot:'30C, 200C'},
 {n:'Calendula',uEn:'Used in homeopathy for minor cuts and scrapes — often as mother tincture applied externally.',uUr:'معمولی کٹ اور خراش کے لیے — اکثر مدر ٹنکچر کے طور پر بیرونی استعمال۔',pot:'Q (mother tincture), 30C'},
 {n:'Rhus Tox',uEn:'Traditional homeopathic use for joint stiffness that worsens in damp weather.',uUr:'جوڑوں کی اکڑن کے لیے روایتی استعمال، جو نمی والے موسم میں بڑھتی ہو۔',pot:'30C, 200C'},
 {n:'Bryonia',uEn:'Traditionally used for dry cough and joint pains that worsen on movement.',uUr:'خشک کھانسی اور حرکت سے بڑھنے والے جوڑوں کے درد کے لیے روایتی استعمال۔',pot:'30C'},
 {n:'Gelsemium',uEn:'Traditional use for nervousness before exams or events, and flu-like heaviness.',uUr:'امتحان یا تقریب سے پہلے گھبراہٹ اور نزلہ زکام جیسی بھاری پن کے لیے روایتی استعمال۔',pot:'30C'},
 {n:'Arsenicum Album',uEn:'Traditionally used for food-related uneasiness and restlessness with weakness.',uUr:'کھانے سے متعلق بے چینی اور کمزوری کے ساتھ بے قراری کے لیے روایتی استعمال۔',pot:'30C'},
 {n:'Pulsatilla',uEn:'Traditional homeopathic use for changeable symptoms and mild digestive upsets.',uUr:'بدلتی علامات اور ہلکی بدہضمی کے لیے روایتی ہومیوپیتھک استعمال۔',pot:'30C'},
 {n:'Lycopodium',uEn:'Traditionally used for gas and bloating after meals.',uUr:'کھانے کے بعد گیس اور پیٹ پھولنے کے لیے روایتی استعمال۔',pot:'30C, 200C'},
 {n:'Cocculus',uEn:'Traditional use for travel sickness and sleeplessness from night-time care duties.',uUr:'سفر میں متلی اور رات جاگنے سے نیند کی کمی کے لیے روایتی استعمال۔',pot:'30C'},
 {n:'Ignatia',uEn:'Traditionally used for grief, emotional upset and frequent sighing.',uUr:'غم، جذباتی صدمے اور بار بار آہیں بھرنے کے لیے روایتی استعمال۔',pot:'30C, 200C'},
 {n:'Aconite',uEn:'Traditional use for sudden-onset complaints after exposure to cold wind.',uUr:'ٹھنڈی ہوا لگنے کے بعد اچانک شروع ہونے والی تکالیف کے لیے روایتی استعمال۔',pot:'30C'},
 {n:'Chamomilla',uEn:'Traditionally used for teething restlessness and irritability in children.',uUr:'بچوں کے دانت نکلنے کی بے چینی اور چڑچڑاپن کے لیے روایتی استعمال۔',pot:'30C'}
];
var SLOTS=['10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM','07:00 PM','08:00 PM'];
var LUNCH_BREAK=['02:00 PM','03:00 PM'];
var FRI_BREAK=['01:00 PM','02:00 PM','03:00 PM'];
var SLOT_HR={'10:00 AM':10,'11:00 AM':11,'12:00 PM':12,'01:00 PM':13,'02:00 PM':14,'03:00 PM':15,'04:00 PM':16,'05:00 PM':17,'06:00 PM':18,'07:00 PM':19,'08:00 PM':20};
var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ---------- storage ---------- */
var DB={patients:[],appts:[],rx:[],settings:null,admin:false};
var Q={date:'',idx:-1};
var DEF_SETTINGS={wa:'',clinic:'Jilan Homeopathic Clinic',doctor:'Dr. [Name]',qual:'BHMS',exp:'15 years experience',addr:'Main Bazaar Road',timings:'Mon–Sat: 10 AM – 2 PM, 4 PM – 9 PM · Sun: Closed'};
function todayStr(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function dStr(dt){return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');}
function seedPatients(){
  return [
   {id:1,demo:1,name:'Ahmed Raza',age:45,gender:'Male',mobile:'03001234501',addr:'House 12, Model Town',history:'High blood pressure (on allopathic medicine)',allergies:'Penicillin'},
   {id:2,demo:1,name:'Fatima Khan',age:32,gender:'Female',mobile:'03001234502',addr:'Street 5, Gulberg',history:'Skin allergy since 2 years',allergies:'None known'},
   {id:3,demo:1,name:'Usman Tariq',age:58,gender:'Male',mobile:'03001234503',addr:'Village Chak 44',history:'Knee arthritis, diabetes',allergies:'Sulfa drugs'},
   {id:4,demo:1,name:'Ayesha Malik',age:27,gender:'Female',mobile:'03001234504',addr:'Flat 3, Johar Town',history:'Hair fall after delivery',allergies:'None known'},
   {id:5,demo:1,name:'Bilal Ahmed',age:9,gender:'Male',mobile:'03001234505',addr:'House 7, Township',history:'Recurrent cold & cough',allergies:'Dust'},
   {id:6,demo:1,name:'Zainab Bibi',age:63,gender:'Female',mobile:'03001234506',addr:'Mohalla Islampura',history:'Joint pain, acidity',allergies:'None known'}
  ];
}
function seedAppts(){
  var t=new Date(), y=new Date(t); y.setDate(t.getDate()-1);
  var tm=new Date(t); tm.setDate(t.getDate()+1);
  var ts=dStr(t).replace(/-/g,''), ys=dStr(y).replace(/-/g,''), ms=dStr(tm).replace(/-/g,'');
  return [
   {token:'HC-'+ts+'-001',demo:1,date:dStr(t),slot:'10:00 AM',serviceId:1,service:'General Treatment',fee:500,name:'Ahmed Raza',age:45,gender:'Male',mobile:'03001234501',symptoms:'Fever & body ache (demo)',status:'Completed'},
   {token:'HC-'+ts+'-002',demo:1,date:dStr(t),slot:'11:00 AM',serviceId:2,service:'Skin Diseases',fee:600,name:'Fatima Khan',age:32,gender:'Female',mobile:'03001234502',symptoms:'Skin itching (demo)',status:'Completed'},
   {token:'HC-'+ts+'-003',demo:1,date:dStr(t),slot:'05:00 PM',serviceId:5,service:'Joint Pain',fee:500,name:'Usman Tariq',age:58,gender:'Male',mobile:'03001234503',symptoms:'Knee pain (demo)',status:'Confirmed'},
   {token:'HC-'+ts+'-004',demo:1,date:dStr(t),slot:'06:00 PM',serviceId:3,service:'Hair Fall',fee:600,name:'Ayesha Malik',age:27,gender:'Female',mobile:'03001234504',symptoms:'Hair fall (demo)',status:'Pending'},
   {token:'HC-'+ts+'-005',demo:1,date:dStr(t),slot:'07:00 PM',serviceId:7,service:"Children's Health",fee:400,name:'Bilal Ahmed',age:9,gender:'Male',mobile:'03001234505',symptoms:'Cold & cough (demo)',status:'Pending'},
   {token:'HC-'+ys+'-001',demo:1,date:dStr(y),slot:'10:00 AM',serviceId:4,service:'Digestive Disorders',fee:500,name:'Zainab Bibi',age:63,gender:'Female',mobile:'03001234506',symptoms:'Acidity (demo)',status:'Completed'},
   {token:'HC-'+ys+'-002',demo:1,date:dStr(y),slot:'04:00 PM',serviceId:6,service:"Women's Health",fee:700,name:'Fatima Khan',age:32,gender:'Female',mobile:'03001234502',symptoms:'General weakness (demo)',status:'Completed'},
   {token:'HC-'+ms+'-001',demo:1,date:dStr(tm),slot:'10:00 AM',serviceId:1,service:'General Treatment',fee:500,name:'Ahmed Raza',age:45,gender:'Male',mobile:'03001234501',symptoms:'Follow-up (demo)',status:'Pending'}
  ];
}
function load(){
  try{
    var p=localStorage.getItem('jhc_patients'); DB.patients=p?JSON.parse(p):seedPatients();
    var a=localStorage.getItem('jhc_appts'); DB.appts=a?JSON.parse(a):seedAppts();
    var r=localStorage.getItem('jhc_rx'); DB.rx=r?JSON.parse(r):[];
    var s=localStorage.getItem('jhc_settings'); DB.settings=s?JSON.parse(s):Object.assign({},DEF_SETTINGS);
    var q=localStorage.getItem('jhc_queue'); if(q)Q=JSON.parse(q);
    DB.admin=localStorage.getItem('jhc_admin')==='1';
    if(Q.date!==todayStr())Q={date:todayStr(),idx:-1};
  }catch(e){ DB.settings=Object.assign({},DEF_SETTINGS); }
}
function save(k){ try{localStorage.setItem('jhc_'+k,JSON.stringify(DB[k]));}catch(e){} }
function saveQ(){ try{localStorage.setItem('jhc_queue',JSON.stringify(Q));}catch(e){} }
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ---------- nav ---------- */
var VIEW='home', BK={serviceId:null,date:'',slot:''}, PQ='';
function go(v){VIEW=v;render();window.scrollTo(0,0);}
function $(id){return document.getElementById(id);}
function render(){
  document.body.className=LANG==='ur'?'ur':'';
  $('langBtn').textContent=t('langName');
  $('hdrTag').textContent=t('tagline');
  $('hdrName').textContent=DB.settings.clinic;
  var nav=[['home','🏠',t('home')],['services','🩺',t('services')],['remedies','🌿',t('remedies')],['book','📅',t('book')],['doctor','👨‍⚕️',t('doctor')]];
  $('bnav').innerHTML=nav.map(function(n){return '<button class="'+(VIEW===n[0]?'on':'')+'" onclick="go(\''+n[0]+'\')"><span class="ic">'+n[1]+'</span>'+n[2]+'</button>';}).join('');
  var v=$('view');
  if(VIEW==='home')v.innerHTML=vHome();
  else if(VIEW==='services')v.innerHTML=vServices();
  else if(VIEW==='remedies')v.innerHTML=vRemedies();
  else if(VIEW==='book')v.innerHTML=vBook();
  else if(VIEW==='doctor')v.innerHTML=vDoctor();
  if(VIEW==='book')initBook();
}
function svcCard(s,btn){
  return '<div class="card"><div class="thumb">'+s.icon+'</div><div class="body">'+
  '<div class="nm">'+esc(LANG==='ur'?s.ur:s.en)+'</div>'+
  '<div class="ds">'+esc(LANG==='ur'?s.dUr:s.dEn)+'</div>'+
  '<div class="pr">'+t('svcFee')+': '+t('rs')+' '+s.fee.toLocaleString()+'</div></div>'+
  (btn?'<div class="ft"><button class="btn btn-teal btn-block btn-sm" onclick="startBooking('+s.id+')">'+t('bookNow')+'</button></div>':'')+'</div>';
}

/* ---------- patient views ---------- */
function vHome(){
  var pop=SERVICES.slice(0,3);
  var st=DB.settings;
  return '<div class="hero"><h2>🌿 '+t('heroT')+'</h2><p>'+t('heroS')+'</p>'+
    '<button class="btn btn-gold" onclick="go(\'book\')">'+t('bookNow')+'</button></div>'+
  '<div class="wrap">'+
  '<div class="sec-title">👨‍⚕️ '+t('docTitle')+'</div>'+
  '<div class="doc-card"><div class="doc-ava">👨‍⚕️</div><div>'+
    '<div class="dn">'+esc(st.doctor)+'<span class="demo-tag">🏷️ '+t('demoTag')+'</span></div>'+
    '<div class="dq">'+esc(st.qual)+' · '+esc(st.exp)+'</div>'+
    '<div class="dq">📍 '+esc(st.addr)+'</div></div></div>'+
  '<div class="sec-title">⚡ '+t('quick')+'</div>'+
  '<div class="qa">'+
    '<button onclick="go(\'book\')">'+t('qaBook')+'</button>'+
    '<button onclick="go(\'remedies\')">'+t('qaRemedies')+'</button>'+
    '<button onclick="waQuick()">'+t('qaWa')+'</button>'+
    '<button onclick="go(\'services\')">'+t('viewAll')+'</button>'+
  '</div>'+
  '<div class="time-card"><div class="tt">⏰ '+t('timings')+'</div><div class="tv">'+esc(st.timings)+'</div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:4px">'+t('timingsNote')+'</div></div>'+
  '<div class="sec-title">🩺 '+t('popSvc')+'</div>'+
  '<div class="grid">'+pop.map(function(s){return svcCard(s,true);}).join('')+'</div>'+
  '<div style="text-align:center;margin:14px 0"><button class="btn btn-ghost btn-sm" onclick="go(\'services\')">'+t('viewAll')+'</button></div>'+
  '<div class="note">🏷️ DEMO by Jilan Apps · '+t('svcSub')+'</div></div>';
}
function vServices(){
  return '<div class="wrap"><div class="sec-title">🩺 '+t('svcTitle')+'</div>'+
  '<div class="note">💰 '+t('svcSub')+'</div>'+
  '<div class="grid">'+SERVICES.map(function(s){return svcCard(s,true);}).join('')+'</div></div>';
}
function vRemedies(){
  var cards=REMEDIES.map(function(r){
    return '<div class="rem-card"><div class="rn">'+esc(r.n)+'</div>'+
    '<div class="rl"><b>'+t('uses')+':</b> '+esc(LANG==='ur'?r.uUr:r.uEn)+'</div>'+
    '<div class="rp"><b>'+t('potency')+':</b> '+esc(r.pot)+'</div>'+
    '<div class="rem-disc">⚠️ '+t('disclaimer')+'</div></div>';
  }).join('');
  return '<div class="wrap"><div class="sec-title">🌿 '+t('remT')+'</div>'+
  '<p style="color:var(--muted);font-size:13px">'+t('remSub')+'</p>'+
  '<div class="disclaimer">⚠️ <b>'+t('disclaimer')+'</b></div>'+
  cards+
  '<div class="disclaimer">⚠️ <b>'+t('disclaimer')+'</b></div></div>';
}

/* ---------- booking flow ---------- */
function startBooking(id){BK={serviceId:id,date:defDate(),slot:''};go('book');}
function defDate(){
  var d=new Date();
  for(var i=0;i<14;i++){var dt=new Date(d);dt.setDate(d.getDate()+i);if(dt.getDay()!==0)return dStr(dt);}
  return dStr(d);
}
function vBook(){
  var s=SERVICES.find(function(x){return x.id===BK.serviceId;});
  return '<div class="wrap"><div class="form" style="margin-top:10px">'+
  '<h3 style="margin-top:0;color:var(--teal-d)">📅 '+t('book')+'</h3>'+
  '<label>'+t('stepService')+'</label>'+
  '<select id="bkSvc" onchange="BK.serviceId=parseInt(this.value);"><option value="">— '+t('stepService')+' —</option>'+
  SERVICES.map(function(x){return '<option value="'+x.id+'"'+(s&&s.id===x.id?' selected':'')+'>'+esc(LANG==='ur'?x.ur:x.en)+' — '+t('rs')+' '+x.fee+'</option>';}).join('')+'</select>'+
  '<div class="err" id="eSvc">'+t('pickSvcErr')+'</div>'+
  '<label>'+t('stepDate')+'</label><div class="dates" id="dates"></div>'+
  '<label>'+t('stepSlot')+'</label><div class="slots" id="slots"></div><div class="err" id="eSlot">'+t('pickSlotErr')+'</div>'+
  '<div style="font-size:12px;color:var(--muted);margin-top:4px">ℹ️ '+t('lunchNote')+' · '+t('friNote')+'</div>'+
  '<label>'+t('stepDetail')+'</label>'+
  '<div class="frow"><div><label style="margin-top:0">'+t('name')+'</label><input id="bkName" placeholder="'+t('name')+'"></div>'+
  '<div><label style="margin-top:0">'+t('mobile')+'</label><input id="bkMobile" inputmode="numeric" placeholder="03XXXXXXXXX"></div></div>'+
  '<div class="err" id="eName">'+t('invalidName')+'</div><div class="err" id="eMobile">'+t('invalidMobile')+'</div>'+
  '<div class="frow"><div><label>'+t('age')+'</label><input id="bkAge" type="number" min="1" max="120" placeholder="30"></div>'+
  '<div><label>'+t('gender')+'</label><select id="bkGender"><option value="Male">'+t('male')+'</option><option value="Female">'+t('female')+'</option><option value="Other">'+t('other')+'</option></select></div></div>'+
  '<div class="err" id="eAge">'+t('ageErr')+'</div>'+
  '<label>'+t('symptoms')+'</label><textarea id="bkNotes" rows="2"></textarea>'+
  '<div style="margin-top:14px"><button class="btn btn-teal btn-block" onclick="confirmBooking()">'+t('confirm')+'</button></div>'+
  '<div style="margin-top:8px"><button class="btn btn-ghost btn-block" onclick="waBookAppt()">💬 '+t('waBookMsg')+'</button></div>'+
  '</div></div>';
}
function initBook(){ drawDates(); drawSlots(); }
function next14(){
  var a=[],d=new Date();
  for(var i=0;i<14;i++){var dt=new Date(d);dt.setDate(d.getDate()+i);a.push(dt);}
  return a;
}
function drawDates(){
  var box=$('dates'); if(!box)return;
  if(!BK.date)BK.date=defDate();
  box.innerHTML=next14().map(function(dt){
    var ds=dStr(dt), sun=dt.getDay()===0;
    return '<div class="dchip'+(sun?' off':'')+(BK.date===ds?' on':'')+'" '+(sun?'title="'+t('closedSun')+'"':'onclick="BK.date=\''+ds+'\';BK.slot=\'\';drawDates();drawSlots();"')+'>'+
    '<div class="dw">'+DAYS[dt.getDay()]+'</div><div class="dn2">'+dt.getDate()+'</div><div class="dm">'+MONTHS[dt.getMonth()]+(sun?'<br>'+t('closedSun'):'')+'</div></div>';
  }).join('');
}
function takenSlots(date){
  return DB.appts.filter(function(a){return a.date===date&&a.status!=='Cancelled';}).map(function(a){return a.slot;});
}
function drawSlots(){
  var box=$('slots'); if(!box)return;
  if(!BK.date)BK.date=defDate();
  var dt=new Date(BK.date+'T12:00:00'), fri=dt.getDay()===5;
  var taken=takenSlots(BK.date), nowH=new Date().getHours(), isToday=BK.date===todayStr();
  box.innerHTML=SLOTS.map(function(s){
    var off=taken.indexOf(s)>=0||LUNCH_BREAK.indexOf(s)>=0||(fri&&FRI_BREAK.indexOf(s)>=0)||(isToday&&SLOT_HR[s]<=nowH);
    return '<div class="slot'+(off?' off':'')+(BK.slot===s?' on':'')+'" '+(off?'':'onclick="BK.slot=\''+s+'\';drawSlots();"')+'>'+s+'</div>';
  }).join('');
}
function makeToken(dateStr){
  var pre='HC-'+dateStr.replace(/-/g,'')+'-', n=1;
  DB.appts.forEach(function(a){ if(a.token.indexOf(pre)===0)n++; });
  return pre+String(n).padStart(3,'0');
}
function readBkForm(){
  return {svcId:parseInt($('bkSvc').value)||0, name:$('bkName').value.trim(),
    mobile:$('bkMobile').value.replace(/[\s-]/g,''), age:parseInt($('bkAge').value)||0,
    gender:$('bkGender').value, notes:$('bkNotes').value.trim()};
}
function validBooking(){
  var f=readBkForm(), ok=true;
  $('eSvc').style.display=f.svcId?'none':'block'; if(!f.svcId)ok=false;
  $('eSlot').style.display=BK.slot?'none':'block'; if(!BK.slot)ok=false;
  $('eName').style.display=f.name?'none':'block'; if(!f.name)ok=false;
  var mOk=/^03\d{9}$/.test(f.mobile);
  $('eMobile').style.display=mOk?'none':'block'; if(!mOk)ok=false;
  var aOk=f.age>=1&&f.age<=120;
  $('eAge').style.display=aOk?'none':'block'; if(!aOk)ok=false;
  return ok;
}
function confirmBooking(){
  if(!validBooking())return;
  var f=readBkForm();
  var s=SERVICES.find(function(x){return x.id===f.svcId;});
  var token=makeToken(BK.date);
  var a={token:token,date:BK.date,slot:BK.slot,serviceId:s.id,service:LANG==='ur'?s.ur:s.en,fee:s.fee,
    name:f.name,age:f.age,gender:f.gender,mobile:f.mobile,symptoms:f.notes,status:'Pending'};
  DB.appts.unshift(a); save('appts');
  $('view').innerHTML='<div class="wrap"><div class="ok-box"><div style="font-size:44px">✅</div><div class="big">'+t('apptOk')+'</div>'+
  '<div>'+t('tokenNo')+'</div><div class="token-big">'+token+'</div>'+
  '<p>'+esc(s? (LANG==='ur'?s.ur:s.en):'')+'<br>'+BK.date+' · '+BK.slot+'<br>'+t('rs')+' '+(s?s.fee.toLocaleString():0)+'</p>'+
  '<button class="btn btn-teal" onclick="waShareAppt(\''+token+'\')">💬 '+t('shareWa')+'</button> '+
  '<button class="btn btn-ghost" onclick="go(\'home\')">'+t('home')+'</button></div></div>';
  window.scrollTo(0,0);
}
function waBookAppt(){
  if(!validBooking())return;
  var f=readBkForm();
  var s=SERVICES.find(function(x){return x.id===f.svcId;});
  var svc=s?(LANG==='ur'?s.ur:s.en):'';
  var msg=(LANG==='ur'?'السلام علیکم! مجھے اپائنٹمنٹ چاہیے:%0A':'Assalam-o-Alaikum! I need an appointment:%0A')+
    encodeURIComponent(svc)+'%0A'+BK.date+' '+BK.slot+'%0A'+encodeURIComponent(f.name)+' - '+f.mobile;
  openWa(msg);
}
function waShareAppt(token){
  var a=DB.appts.find(function(x){return x.token===token;}); if(!a)return;
  var msg=encodeURIComponent('🌿 '+DB.settings.clinic+'%0A'+t('tokenNo')+': '+a.token+'%0A'+a.service+'%0A'+a.date+' '+a.slot+'%0A'+a.name);
  openWa(msg);
}
function waQuick(){ openWa(encodeURIComponent(LANG==='ur'?'السلام علیکم!':'Assalam-o-Alaikum!')); }
function openWa(msg){
  if(!DB.settings.wa){alert(t('waSetup'));return;}
  window.open('https://wa.me/'+DB.settings.wa+'?text='+msg,'_blank');
}

/* ---------- doctor / admin ---------- */
var adminTab='dash';
function vDoctor(){
  if(!DB.admin){
    return '<div class="wrap"><div class="form" style="margin-top:10px;max-width:400px;margin-left:auto;margin-right:auto"><h3 style="color:var(--teal-d)">🔐 '+t('admin')+'</h3>'+
    '<div class="note">'+t('demoCreds')+'</div>'+
    '<label>'+t('username')+'</label><input id="adU" autocomplete="off"><label>'+t('password')+'</label><input id="adP" type="password">'+
    '<div class="err" id="eLogin">❌ Invalid</div>'+
    '<div style="margin-top:10px"><button class="btn btn-teal btn-block" onclick="doLogin()">'+t('login')+'</button></div></div></div>';
  }
  var tabs=[['dash','📊',t('dash')],['patients','🧑‍⚕️',t('patients')],['appts','📅',t('appointments')],['rx','💊',t('rx')],['queue','🔢',t('queue')],['settings','⚙️',t('settingsTab')]];
  return '<div class="wrap"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="color:var(--teal-d)">👨‍⚕️ '+t('admin')+'</h3>'+
  '<button class="chipbtn" onclick="DB.admin=false;try{localStorage.removeItem(\'jhc_admin\');}catch(e){}go(\'doctor\')">'+t('logout')+'</button></div>'+
  '<div class="pills">'+tabs.map(function(x){return '<button class="pill'+(adminTab===x[0]?' on':'')+'" onclick="adminTab=\''+x[0]+'\';render()">'+x[1]+' '+x[2]+'</button>';}).join('')+'</div>'+
  '<div id="adminBody">'+adminBody()+'</div></div>';
}
function doLogin(){
  if($('adU').value==='admin'&&$('adP').value==='jilan123'){DB.admin=true;try{localStorage.setItem('jhc_admin','1');}catch(e){}adminTab='dash';go('doctor');}
  else $('eLogin').style.display='block';
}
function adminBody(){
  if(adminTab==='dash')return aDash();
  if(adminTab==='patients')return aPatients();
  if(adminTab==='appts')return aAppts();
  if(adminTab==='rx')return aRx();
  if(adminTab==='queue')return aQueue();
  if(adminTab==='settings')return aSettings();
  return '';
}
function stChip(s){return '<span class="st st-'+s+'">'+t('st'+s)+'</span>';}
function aDash(){
  var td=todayStr();
  var today=DB.appts.filter(function(a){return a.date===td;});
  var pend=DB.appts.filter(function(a){return a.status==='Pending';}).length;
  var done=today.filter(function(a){return a.status==='Completed';}).length;
  function stat(n,v){return '<div class="stat"><div class="sn">'+n+'</div><div class="sv">'+v+'</div></div>';}
  return '<div class="stat-grid">'+
    stat('📅 '+t('todayAppt'),today.length)+
    stat('🧑 '+t('totalPatients'),DB.patients.length)+
    stat('⏳ '+t('pendingAppt'),pend)+
    stat('✅ '+t('completedToday'),done)+'</div>'+
  '<div class="note">🏷️ '+t('demoBadge')+': '+t('svcSub')+'</div>';
}
function patName(p){return esc(p.name)+(p.demo?'<span class="demo-tag">🏷️ '+t('demoBadge')+'</span>':'');}
function aPatients(){
  var q=(PQ||'').toLowerCase();
  var list=DB.patients.filter(function(p){return !q||p.name.toLowerCase().indexOf(q)>=0||(p.mobile||'').indexOf(q)>=0;});
  var rows=list.map(function(p){
    return '<div class="pat-card"><div class="pn">'+patName(p)+'</div>'+
    '<div class="pd">🎂 '+p.age+' '+t('yrs')+' · '+(p.gender||'')+' · 📱 '+esc(p.mobile||'')+'</div>'+
    (p.addr?'<div class="pd">📍 '+esc(p.addr)+'</div>':'')+
    ((p.history||p.allergies)?'<div class="ph">📝 <b>'+t('history')+':</b> '+esc(p.history||'—')+'<br>⚠️ <b>'+t('allergies')+':</b> '+esc(p.allergies||'—')+'</div>':'')+
    '<div class="rowbtns" style="margin-top:8px"><button class="chipbtn" onclick="patForm('+p.id+')">'+t('edit')+'</button>'+
    '<button class="chipbtn teal" onclick="rxForm('+p.id+')">💊 '+t('writeRx')+'</button>'+
    '<button class="chipbtn no" onclick="delPat('+p.id+')">'+t('del')+'</button></div></div>';
  }).join('');
  return '<div class="form" style="margin-bottom:10px"><input id="pq" placeholder="🔍 '+t('searchP')+'" value="'+esc(PQ)+'" oninput="PQ=this.value;renderKeepQ(this)"></div>'+
  '<div style="margin:8px 0"><button class="btn btn-teal btn-sm" onclick="patForm()">+ '+t('addPatient')+'</button></div>'+
  (list.length?rows:'<div class="empty">'+t('noData')+'</div>');
}
function renderKeepQ(el){var v=el.value,pos=el.selectionStart;PQ=v;render();var n=$('pq');if(n){n.focus();n.setSelectionRange(pos,pos);}}
function patForm(id){
  var p=id?DB.patients.find(function(x){return x.id===id;}):{id:Date.now(),name:'',age:'',gender:'Male',mobile:'',addr:'',history:'',allergies:''};
  openModal('<div class="form"><h3 style="margin-top:0;color:var(--teal-d)">'+(id?t('edit'):t('addPatient'))+'</h3>'+
  '<label>'+t('name')+'</label><input id="pfName" value="'+esc(p.name)+'">'+
  '<div class="frow"><div><label>'+t('age')+'</label><input id="pfAge" type="number" value="'+esc(p.age)+'"></div>'+
  '<div><label>'+t('gender')+'</label><select id="pfGender">'+['Male','Female','Other'].map(function(g){return '<option'+(p.gender===g?' selected':'')+'>'+g+'</option>';}).join('')+'</select></div></div>'+
  '<label>'+t('mobile')+'</label><input id="pfMobile" inputmode="numeric" value="'+esc(p.mobile||'')+'">'+
  '<label>'+t('address')+'</label><input id="pfAddr" value="'+esc(p.addr||'')+'">'+
  '<label>'+t('history')+'</label><textarea id="pfHist" rows="2">'+esc(p.history||'')+'</textarea>'+
  '<label>'+t('allergies')+'</label><input id="pfAlg" value="'+esc(p.allergies||'')+'">'+
  '<div class="err" id="ePf">'+t('invalidName')+'</div>'+
  '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-teal" onclick="savePat('+p.id+')">'+t('save')+'</button><button class="btn btn-ghost" onclick="closeModal()">'+t('cancel')+'</button></div></div>');
}
function savePat(id){
  var nm=$('pfName').value.trim(); if(!nm){$('ePf').style.display='block';return;}
  var i=DB.patients.findIndex(function(x){return x.id===id;});
  var obj={id:id,name:nm,age:parseInt($('pfAge').value)||0,gender:$('pfGender').value,mobile:$('pfMobile').value.replace(/[\s-]/g,''),
    addr:$('pfAddr').value.trim(),history:$('pfHist').value.trim(),allergies:$('pfAlg').value.trim()};
  if(i>=0){obj.demo=DB.patients[i].demo;DB.patients[i]=obj;}else DB.patients.unshift(obj);
  save('patients');closeModal();render();
}
function delPat(id){ if(confirm('?')){DB.patients=DB.patients.filter(function(x){return x.id!==id;});save('patients');render();} }
function aAppts(){
  var list=DB.appts.slice().sort(function(a,b){return (a.date+a.token)<(b.date+b.token)?1:-1;});
  if(!list.length)return '<div class="empty">'+t('noData')+'</div>';
  var rows=list.map(function(a){
    return '<tr><td><b>'+esc(a.token)+'</b>'+(a.demo?'<br><small>🏷️ '+t('demoBadge')+'</small>':'')+'<br><small>'+esc(a.service)+'</small></td>'+
    '<td>'+a.date+'<br>'+a.slot+'</td>'+
    '<td>'+esc(a.name)+'<br><small>'+esc(a.mobile)+'</small></td>'+
    '<td>'+t('rs')+' '+a.fee.toLocaleString()+'</td>'+
    '<td>'+stChip(a.status)+'</td><td><div class="rowbtns">'+
    (a.status==='Pending'?'<button class="chipbtn go" onclick="setApptStatus(\''+a.token+'\',\'Confirmed\')">'+t('confirmB')+'</button>':'')+
    (a.status==='Confirmed'?'<button class="chipbtn go" onclick="setApptStatus(\''+a.token+'\',\'Completed\')">'+t('complete')+'</button>':'')+
    ((a.status==='Pending'||a.status==='Confirmed')?'<button class="chipbtn no" onclick="setApptStatus(\''+a.token+'\',\'Cancelled\')">'+t('cancelB')+'</button>':'')+
    '</div></td></tr>';
  }).join('');
  return '<div style="overflow-x:auto"><table class="tbl"><tr><th>'+t('token')+'</th><th>'+t('date')+'/'+t('time')+'</th><th>'+t('patient')+'</th><th>'+t('rs')+'</th><th>'+t('status')+'</th><th>'+t('actions')+'</th></tr>'+rows+'</table></div>';
}
function setApptStatus(token,st){var a=DB.appts.find(function(x){return x.token===token;});if(a){a.status=st;save('appts');}render();}

/* ---------- prescriptions ---------- */
var RX_PID=null;
function aRx(){
  return '<div style="margin:8px 0"><button class="btn btn-teal btn-sm" onclick="rxForm()">💊 '+t('writeRx')+'</button></div>'+
  '<div class="sec-title">📜 '+t('rxHistory')+'</div>'+rxHistoryHtml();
}
function rxHistoryHtml(){
  if(!DB.rx.length)return '<div class="empty">'+t('noData')+'</div>';
  return DB.rx.map(function(r){
    var p=DB.patients.find(function(x){return x.id===r.patientId;});
    var nm=r.walkin?esc(r.walkin):(p?esc(p.name):'—');
    return '<div class="queue-item"><div><b>'+r.id+'</b> · '+nm+'<br><small>'+r.date+'</small></div>'+
    '<button class="chipbtn teal" onclick="rxView(\''+r.id+'\')">'+t('viewRx')+'</button></div>';
  }).join('');
}
function rxForm(pid){
  RX_PID=pid||'';
  var opts=DB.patients.map(function(p){return '<option value="'+p.id+'"'+(pid===p.id?' selected':'')+'>'+esc(p.name)+' ('+esc(p.mobile||'')+')</option>';}).join('');
  openModal('<div class="form"><h3 style="margin-top:0;color:var(--teal-d)">💊 '+t('writeRx')+'</h3>'+
  '<label>'+t('selectPatient')+'</label><select id="rxPat" onchange="document.getElementById(\'rxWalkin\').style.display=this.value===\'w\'?\'block\':\'none\'">'+
  '<option value="">—</option><option value="w">'+t('walkin')+'</option>'+opts+'</select>'+
  '<div id="rxWalkin" style="display:none;margin-top:8px"><input id="rxWalkinName" placeholder="'+t('walkinName')+'"></div>'+
  '<label>💊 Medicines</label><div id="medRows"></div>'+
  '<button class="chipbtn teal" onclick="addMedRow()">'+t('addMed')+'</button>'+
  '<label>'+t('advice')+'</label><textarea id="rxAdv" rows="2"></textarea>'+
  '<div class="err" id="eRx">!</div>'+
  '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-teal" onclick="saveRx()">'+t('saveRx')+'</button><button class="btn btn-ghost" onclick="closeModal()">'+t('cancel')+'</button></div></div>');
  addMedRow();
  if(pid){$('rxPat').value=String(pid);}
}
function addMedRow(){
  var d=document.createElement('div');d.className='med-row';
  d.innerHTML='<input class="mN" placeholder="'+t('medName')+'"><input class="mP" placeholder="'+t('potencyL')+'">'+
  '<div class="sub"><input class="mD" placeholder="'+t('dosage')+'"><input class="mU" placeholder="'+t('duration')+'"></div>';
  $('medRows').appendChild(d);
}
function saveRx(){
  var pv=$('rxPat').value, walkin=pv==='w'?$('rxWalkinName').value.trim():'';
  var pid=pv&&pv!=='w'?parseInt(pv):null;
  if(!pid&&!walkin){$('eRx').style.display='block';return;}
  var meds=[];
  var rows=$('medRows').querySelectorAll('.med-row');
  for(var i=0;i<rows.length;i++){
    var n=rows[i].querySelector('.mN').value.trim(); if(!n)continue;
    meds.push({n:n,p:rows[i].querySelector('.mP').value.trim(),d:rows[i].querySelector('.mD').value.trim(),u:rows[i].querySelector('.mU').value.trim()});
  }
  if(!meds.length){$('eRx').style.display='block';return;}
  var r={id:'RX-'+Date.now().toString(36).toUpperCase(),date:todayStr(),patientId:pid,walkin:walkin,
    meds:meds,advice:$('rxAdv').value.trim()};
  DB.rx.unshift(r);save('rx');
  closeModal();rxView(r.id);
}
function rxView(id){
  var r=DB.rx.find(function(x){return x.id===id;}); if(!r)return;
  var p=r.patientId?DB.patients.find(function(x){return x.id===r.patientId;}):null;
  var nm=r.walkin?r.walkin:(p?p.name:'—');
  var ag=p?(p.age+' '+t('yrs')+' / '+(p.gender||'')):'';
  var st=DB.settings;
  var medRows=r.meds.map(function(m,i){
    return '<tr><td>'+(i+1)+'</td><td><b>'+esc(m.n)+'</b></td><td>'+esc(m.p)+'</td><td>'+esc(m.d)+'</td><td>'+esc(m.u)+'</td></tr>';
  }).join('');
  var html='<div class="rx-sheet">'+
  '<div class="rx-head"><div class="cn">🌿 '+esc(st.clinic)+'</div>'+
  '<div class="cd">'+esc(st.doctor)+' · '+esc(st.qual)+' · '+esc(st.exp)+'<br>📍 '+esc(st.addr)+' · ⏰ '+esc(st.timings)+'</div></div>'+
  '<div class="rx-meta"><span><b>'+t('rxNo')+':</b> '+r.id+'</span><span><b>'+t('date')+':</b> '+r.date+'</span></div>'+
  '<div class="rx-pt">℞ <b>'+t('rxFor')+':</b> '+esc(nm)+(ag?' · '+esc(ag):'')+'</div>'+
  '<table class="rx-tbl"><tr><th>#</th><th>'+t('medName')+'</th><th>'+t('potencyL')+'</th><th>'+t('dosage')+'</th><th>'+t('duration')+'</th></tr>'+medRows+'</table>'+
  (r.advice?'<div class="rx-adv"><b>'+t('rxAdviceT')+':</b><br>'+esc(r.advice).replace(/\n/g,'<br>')+'</div>':'')+
  '<div class="rx-sign">___________<br><b>'+t('sig')+'</b><br>'+esc(st.doctor)+'</div>'+
  '<div class="rx-disc">⚠️ '+t('disclaimer')+'</div>'+
  '<div class="no-print" style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">'+
  '<button class="btn btn-teal btn-sm" onclick="printRxSheet()">'+t('printRx')+'</button>'+
  '<button class="btn btn-ghost btn-sm" onclick="waShareRx(\''+r.id+'\')">💬 '+t('shareWa')+'</button>'+
  '<button class="btn btn-ghost btn-sm" onclick="closeModal()">'+t('cancel')+'</button></div></div>';
  openModal(html);
}
function printRxSheet(){
  document.body.classList.add('printing');
  window.print();
  setTimeout(function(){document.body.classList.remove('printing');},500);
}
window.addEventListener('afterprint',function(){document.body.classList.remove('printing');});
function waShareRx(id){
  var r=DB.rx.find(function(x){return x.id===id;}); if(!r)return;
  var p=r.patientId?DB.patients.find(function(x){return x.id===r.patientId;}):null;
  var nm=r.walkin?r.walkin:(p?p.name:'—');
  var lines=r.meds.map(function(m,i){return (i+1)+'. '+m.n+' '+m.p+' — '+m.d+' ('+m.u+')';}).join('\n');
  var msg='🌿 '+DB.settings.clinic+'\n℞ '+r.id+' ('+r.date+')\n'+t('rxFor')+': '+nm+'\n'+lines+(r.advice?'\n'+t('rxAdviceT')+': '+r.advice:'');
  openWa(encodeURIComponent(msg));
}

/* ---------- token queue ---------- */
function qList(){
  if(Q.date!==todayStr()){Q={date:todayStr(),idx:-1};saveQ();}
  return DB.appts.filter(function(a){return a.date===todayStr()&&a.status==='Confirmed';})
    .sort(function(a,b){return a.token<b.token?-1:1;});
}
function aQueue(){
  var list=qList();
  var cur=(Q.idx>=0&&Q.idx<list.length)?list[Q.idx]:null;
  var rows=list.map(function(a,i){
    return '<div class="queue-item'+(cur&&cur.token===a.token?' cur':'')+'"><div><b>'+a.token+'</b> · '+esc(a.name)+'<br><small>'+a.slot+' · '+esc(a.service)+'</small></div>'+
    (cur&&cur.token===a.token?'<span>▶</span>':'<span style="color:var(--muted)">'+(i+1)+'</span>')+'</div>';
  }).join('');
  return '<div class="queue-now"><div class="qn">'+t('queueNow')+'</div>'+
  '<div class="qt">'+(cur?cur.token:'— — —')+'</div>'+
  (cur?'<div class="qn">'+esc(cur.name)+' · '+cur.slot+'</div>':'')+
  '<div style="margin-top:10px"><button class="btn btn-gold" '+(Q.idx+1>=list.length?'disabled':'')+' onclick="qNext()">'+(Q.idx<0?t('queueStart'):t('queueNext'))+'</button></div></div>'+
  (list.length?rows:'<div class="empty">'+t('queueEmpty')+'</div>')+
  (list.length&&Q.idx+1>=list.length?'<div class="ok-box"><div class="big">'+t('queueDone')+'</div></div>':'');
}
function qNext(){
  var list=qList();
  if(Q.idx+1<list.length){Q.idx++;saveQ();}
  render();
}

/* ---------- settings ---------- */
function aSettings(){
  var st=DB.settings;
  return '<div class="form"><h3 style="margin-top:0;color:var(--teal-d)">⚙️ '+t('setTitle')+'</h3>'+
  '<label>'+t('setClinic')+'</label><input id="stClinic" value="'+esc(st.clinic)+'">'+
  '<div class="frow"><div><label>'+t('setDoc')+'</label><input id="stDoc" value="'+esc(st.doctor)+'"></div>'+
  '<div><label>'+t('setQual')+'</label><input id="stQual" value="'+esc(st.qual)+'"></div></div>'+
  '<label>'+t('setExp')+'</label><input id="stExp" value="'+esc(st.exp)+'">'+
  '<label>'+t('setAddr')+'</label><input id="stAddr" value="'+esc(st.addr)+'">'+
  '<label>'+t('setTimings')+'</label><input id="stTim" value="'+esc(st.timings)+'">'+
  '<label>'+t('waNum')+'</label><input id="stWa" inputmode="numeric" placeholder="923001234567" value="'+esc(st.wa)+'">'+
  '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-teal" onclick="saveSettings()">'+t('saveSet')+'</button>'+
  '<button class="btn btn-ghost" onclick="resetDemo()">'+t('resetDemo')+'</button></div></div>';
}
function saveSettings(){
  DB.settings.clinic=$('stClinic').value.trim()||DEF_SETTINGS.clinic;
  DB.settings.doctor=$('stDoc').value.trim()||DEF_SETTINGS.doctor;
  DB.settings.qual=$('stQual').value.trim();
  DB.settings.exp=$('stExp').value.trim();
  DB.settings.addr=$('stAddr').value.trim();
  DB.settings.timings=$('stTim').value.trim();
  DB.settings.wa=$('stWa').value.replace(/\D/g,'');
  save('settings');render();alert('✅');
}
function resetDemo(){
  if(!confirm('♻️ ?'))return;
  try{['jhc_patients','jhc_appts','jhc_rx'].forEach(function(k){localStorage.removeItem(k);});}catch(e){}
  DB.patients=seedPatients();DB.appts=seedAppts();DB.rx=[];
  save('patients');save('appts');save('rx');
  Q={date:todayStr(),idx:-1};saveQ();
  adminTab='dash';render();alert(t('resetDone'));
}

/* ---------- modal ---------- */
function openModal(html){$('modalBody').innerHTML=html;$('modalBg').classList.add('show');}
function closeModal(){$('modalBg').classList.remove('show');}

/* ---------- boot ---------- */
function toggleLang(){LANG=LANG==='en'?'ur':'en';try{localStorage.setItem('jhc_lang',LANG);}catch(e){}render();}
document.addEventListener('DOMContentLoaded',function(){
  try{LANG=localStorage.getItem('jhc_lang')||'en';}catch(e){}
  load();
  document.body.insertAdjacentHTML('afterbegin','<div class="demo-banner">🏷️ DEMO by Jilan Apps</div>');
  $('waFab').onclick=function(){waQuick();};
  render();
});
