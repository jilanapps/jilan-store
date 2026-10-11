/* Jilan PDF Tools — core app: router, i18n, storage, files, history, settings */
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* ---------- i18n ---------- */
const I18N={
en:{home:"Home",tools:"Tools",files:"Files",history:"History",settings:"Settings",recent:"Recent files",favTools:"Favourite tools",
noRecent:"No files yet. Processed files will appear here.",noFav:"Tap ⭐ on any tool to pin it here.",
all:"All",images:"Images",docs:"Docs",favs:"★ Favourites",sortDate:"Date",sortName:"Name",sortSize:"Size",
clearHistory:"Clear history",language:"Language",theme:"Theme",light:"Light",dark:"Dark",ocrLang:"OCR language",
ocrNote:"Urdu OCR is experimental. If it fails, a clear message is shown.",privacy:"Privacy policy",about:"About Jilan PDF Tools",
wipe:"Delete all app data",back:"Back",cancel:"Cancel",save:"Save",share:"Share",download:"Download",open:"Open",rename:"Rename",
del:"Delete",fav:"Favourite",unfav:"Unfavourite",searchFiles:"Search files",noFiles:"No files found.",
process:"Process",reset:"Reset",preview:"Preview",addFiles:"Add files",chooseFile:"Choose file",
errNoFile:"Please select a file first.",errInvalid:"Invalid file: ",done:"Done!",failed:"Failed: ",
needNet:"This needs internet (first use loads the library).",copied:"Copied!",confirmDel:"Delete this file permanently?",
confirmWipe:"Delete ALL app data (files, history, settings)?",confirmClearH:"Clear all history?",
yes:"Yes",no:"No",of:"of",page:"Page",pages:"Pages",size:"Size",type:"Type",date:"Date",name:"Name",
work:"Working…",selPages:"Select pages (tap thumbnails)",apply:"Apply",close:"Close",ok:"OK",
serverNeeded:"Needs a document server",serverMsg:"Microsoft Office → PDF conversion needs LibreOffice on a server, which this app does not have. Everything else here works 100% offline-capable on your device. We show this honestly instead of a fake button."},
ur:{home:"ہوم",tools:"ٹولز",files:"فائلز",history:"ہسٹری",settings:"ترتیبات",recent:"حالیہ فائلز",favTools:"پسندیدہ ٹولز",
noRecent:"ابھی کوئی فائل نہیں۔",noFav:"کسی ٹول پر ⭐ دبائیں۔",
all:"سب",images:"تصاویر",docs:"دستاویزات",favs:"★ پسندیدہ",sortDate:"تاریخ",sortName:"نام",sortSize:"سائز",
clearHistory:"ہسٹری صاف کریں",language:"زبان",theme:"تھیم",light:"روشن",dark:"گہرا",ocrLang:"OCR زبان",
ocrNote:"اردو OCR تجرباتی ہے۔",privacy:"پرائیویسی پالیسی",about:"Jilan PDF Tools کے بارے میں",
wipe:"تمام ڈیٹا حذف کریں",back:"واپس",cancel:"منسوخ",save:"محفوظ کریں",share:"شیئر",download:"ڈاؤن لوڈ",open:"کھولیں",rename:"نام بدلیں",
del:"حذف کریں",fav:"پسندیدہ",unfav:"ناپسندیدہ",searchFiles:"فائلز تلاش کریں",noFiles:"کوئی فائل نہیں ملی۔",
process:"عمل کریں",reset:"ری سیٹ",preview:"پیش نظارہ",addFiles:"فائلز شامل کریں",chooseFile:"فائل منتخب کریں",
errNoFile:"پہلے فائل منتخب کریں۔",errInvalid:"غلط فائل: ",done:"ہو گیا!",failed:"ناکام: ",
needNet:"انٹرنیٹ درکار ہے (پہلی بار لائبریری لوڈ ہوتی ہے)۔",copied:"کاپی ہو گیا!",confirmDel:"کیا یہ فائل مستقل حذف کریں؟",
confirmWipe:"تمام ڈیٹا حذف کریں؟",confirmClearH:"تمام ہسٹری صاف کریں؟",
yes:"جی ہاں",no:"نہیں",of:"از",page:"صفحہ",pages:"صفحات",size:"سائز",type:"قسم",date:"تاریخ",name:"نام",
work:"کام جاری…",selPages:"صفحات منتخب کریں",apply:"لاگو کریں",close:"بند کریں",ok:"ٹھیک ہے",
serverNeeded:"سرور درکار ہے",serverMsg:"آفس فائلز کی تبدیلی کے لیے سرور درکار ہے جو اس ایپ میں نہیں۔ باقی سب آپ کے فون پر کام کرتا ہے۔"}};
let LANG=localStorage.getItem('pt_lang')||'en';
function t(k){return (I18N[LANG]&&I18N[LANG][k])||I18N.en[k]||k;}
function applyI18n(){$$('[data-i18n]').forEach(e=>{e.textContent=t(e.dataset.i18n);});
  $('#toolSearch').placeholder = LANG==='ur'?'PDF ٹولز تلاش کریں':'Search PDF tools';
  document.documentElement.dir = LANG==='ur'?'rtl':'ltr'; document.documentElement.lang=LANG;}

/* ---------- helpers ---------- */
function toast(m,ms=2600){const e=$('#toast');e.textContent=m;e.classList.remove('hidden');
  clearTimeout(e._t);e._t=setTimeout(()=>e.classList.add('hidden'),ms);}
function showLoad(msg,prog){$('#loaderText').textContent=msg||t('work');$('#loader').classList.remove('hidden');setProg(prog||0);}
function setProg(p){$('#pfill').style.width=Math.min(100,Math.max(0,p))+'%';}
function hideLoad(){$('#loader').classList.add('hidden');}
function modal(title,html,okLabel,cancelLabel){
  return new Promise(res=>{$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;
    const ok=$('#modalOk'),cx=$('#modalCancel');ok.textContent=okLabel||t('ok');
    cx.classList.toggle('hidden',!cancelLabel);if(cancelLabel)cx.textContent=cancelLabel;
    $('#modal').classList.remove('hidden');
    ok.onclick=()=>{$('#modal').classList.add('hidden');res(true);};
    cx.onclick=()=>{$('#modal').classList.add('hidden');res(false);};});}
function fmtSize(b){if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(1)+' KB';return (b/1048576).toFixed(2)+' MB';}
function fmtDate(ts){return new Date(ts).toLocaleString(LANG==='ur'?'ur-PK':'en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
function downloadName(base,ext){return base.replace(/\.[a-z0-9]+$/i,'')+'-'+Date.now().toString(36)+'.'+ext;}
function b64encode(buf){const u=new Uint8Array(buf);let s='';const CH=0x8000;
  for(let i=0;i<u.length;i+=CH)s+=String.fromCharCode.apply(null,u.subarray(i,i+CH));return btoa(s);}

/* ---------- save / share bridge (WebView APK + browser) ---------- */
async function saveBlob(blob,filename){
  if(window.Android&&Android.startFile){
    try{
      const buf=await blob.arrayBuffer();const b64=b64encode(buf);const CH=480*1024;
      const total=Math.ceil(b64.length/CH);
      Android.startFile(filename,blob.type||'application/octet-stream',total);
      for(let i=0;i<total;i++)Android.fileChunk(i,b64.substring(i*CH,(i+1)*CH));
      Android.endFile();return true;
    }catch(e){toast(t('failed')+e.message);return false;}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);return true;
}
async function shareBlob(blob,filename,title){
  if(navigator.share&&navigator.canShare){
    try{const f=new File([blob],filename,{type:blob.type});if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:title||'Jilan PDF Tools'});return true;}}catch(e){}
  }
  if(window.Android&&Android.shareLastFile){Android.shareLastFile(filename);return true;}
  return saveBlob(blob,filename);
}

/* ---------- IndexedDB: file store ---------- */
const DBN='jilan_pdf_tools';
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DBN,1);
  r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('files'))d.createObjectStore('files',{keyPath:'id'});};
  r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e);});}
async function dbPut(f){const d=await idb();return new Promise((res,rej)=>{const tx=d.transaction('files','readwrite');
  tx.objectStore('files').put(f);tx.oncomplete=res;tx.onerror=rej;});}
async function dbAll(){const d=await idb();return new Promise((res,rej)=>{const q=d.transaction('files').objectStore('files').getAll();
  q.onsuccess=()=>res(q.result||[]);q.onerror=rej;});}
async function dbDel(id){const d=await idb();return new Promise((res,rej)=>{const tx=d.transaction('files','readwrite');
  tx.objectStore('files').delete(id);tx.oncomplete=res;tx.onerror=rej;});}
async function dbClear(){const d=await idb();return new Promise((res,rej)=>{const tx=d.transaction('files','readwrite');
  tx.objectStore('files').clear();tx.oncomplete=res;tx.onerror=rej;});}
async function dbGet(id){const d=await idb();return new Promise((res,rej)=>{const q=d.transaction('files').objectStore('files').get(id);
  q.onsuccess=()=>res(q.result);q.onerror=rej;});}

/* ---------- history ---------- */
function getHist(){try{return JSON.parse(localStorage.getItem('pt_hist')||'[]');}catch(e){return[];}}
function addHist(tool,detail){const h=getHist();h.unshift({tool,detail,ts:Date.now()});localStorage.setItem('pt_hist',JSON.stringify(h.slice(0,100)));}

/* ---------- tool registry ---------- */
const TOOLS=[
 {id:'img2pdf',cat:'convert',ic:'🖼️',ti:'Images → PDF',d:'JPG/PNG/WebP to PDF'},
 {id:'pdf2img',cat:'convert',ic:'📄',ti:'PDF → Images',d:'Export pages as JPG/PNG'},
 {id:'merge',cat:'convert',ic:'🔗',ti:'Merge PDFs',d:'Combine multiple PDFs'},
 {id:'text2pdf',cat:'convert',ic:'📝',ti:'Text → PDF',d:'Plain text to PDF'},
 {id:'ocr2docx',cat:'ocr',ic:'📑',ti:'Scan → Word',d:'OCR text to DOCX'},
 {id:'split',cat:'edit',ic:'✂️',ti:'Split PDF',d:'Page ranges to new PDFs'},
 {id:'pagetools',cat:'edit',ic:'📃',ti:'Page Tools',d:'Rotate • Delete • Extract • Reorder'},
 {id:'pagenum',cat:'edit',ic:'🔢',ti:'Page Numbers',d:'Add numbers to pages'},
 {id:'watermark',cat:'edit',ic:'💧',ti:'Watermark',d:'Text watermark on pages'},
 {id:'metadata',cat:'edit',ic:'🏷️',ti:'Metadata',d:'View & edit PDF info'},
 {id:'compress',cat:'edit',ic:'🗜️',ti:'Compress PDF',d:'Smaller file, honest %'},
 {id:'ocr',cat:'ocr',ic:'🔍',ti:'Image → Text (OCR)',d:'English + Urdu beta'},
 {id:'pdf2text',cat:'ocr',ic:'🔤',ti:'PDF → Text',d:'Extract text from PDF'},
 {id:'scanner',cat:'scan',ic:'📷',ti:'Document Scanner',d:'Camera → PDF'},
 {id:'imgtools',cat:'edit',ic:'🎨',ti:'Image Tools',d:'Convert • Resize • Rotate'},
 {id:'word2pdf',cat:'convert',ic:'📘',ti:'Word → PDF',d:'DOCX to PDF',unav:1},
 {id:'excel2pdf',cat:'convert',ic:'📗',ti:'Excel → PDF',d:'XLSX to PDF',unav:1},
 {id:'ppt2pdf',cat:'convert',ic:'📙',ti:'PowerPoint → PDF',d:'PPTX to PDF',unav:1},
];
const CATS=[['convert','🔄 Convert'],['edit','✏️ Edit'],['ocr','🔍 OCR & Text'],['scan','📷 Scan']];
function favs(){try{return JSON.parse(localStorage.getItem('pt_favs')||'[]');}catch(e){return[];}}
function isFav(id){return favs().includes(id);}
function toggleFav(id){let f=favs();f=f.includes(id)?f.filter(x=>x!==id):[...f,id];localStorage.setItem('pt_favs',JSON.stringify(f));renderHome();}

/* ---------- router (hash) ---------- */
let curTool=null;
function nav(){const h=location.hash||'#/home';
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $$('#bottomnav button').forEach(b=>b.classList.remove('active'));
  $('#backBtn').classList.toggle('hidden',true);
  const m=h.match(/^#\/tool\/(\w+)/);
  if(m){openTool(m[1],true);return;}
  const scr=h.replace('#/','')||'home';
  const map={home:'screen-home',tools:'screen-home',files:'screen-files',history:'screen-history',settings:'screen-settings'};
  $('#'+(map[scr]||'screen-home')).classList.add('active');
  const nb=document.querySelector(`#bottomnav button[data-nav="${scr}"]`);if(nb)nb.classList.add('active');
  if(scr==='files')renderFiles();if(scr==='history')renderHistory();if(scr==='home')renderHome();
  curTool=null;window.scrollTo(0,0);}
function go(h){if(location.hash===h)nav();else location.hash=h;}
window.addEventListener('hashchange',nav);

function openTool(id,fromHash){
  const tool=TOOLS.find(x=>x.id===id);if(!tool){go('#/home');return;}
  if(tool.unav){modal(t('serverNeeded'),'<p>'+t('serverMsg')+'</p>');if(fromHash)history.back();return;}
  curTool=id;
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $('#screen-tool').classList.add('active');
  $('#backBtn').classList.remove('hidden');
  $('#toolTitle').textContent=tool.ti;$('#toolDesc').textContent=tool.d;
  const fb=$('#favToolBtn');fb.textContent=isFav(id)?'★':'☆';fb.onclick=()=>{toggleFav(id);fb.textContent=isFav(id)?'★':'☆';};
  if(!fromHash)history.replaceState(null,'','#/tool/'+id);
  const fn=window['tool_'+id];$('#toolBody').innerHTML='';
  if(fn){try{fn($('#toolBody'));}catch(e){$('#toolBody').innerHTML='<p class="warn">Error: '+e.message+'</p>';}}
  window.scrollTo(0,0);
}
$('#backBtn').onclick=()=>history.back();
$$('#bottomnav button').forEach(b=>b.onclick=()=>go('#/'+b.dataset.nav));

/* ---------- home render ---------- */
function toolCard(x){const d=document.createElement('div');d.className='tool-card'+(x.unav?' unav':'');
  d.innerHTML=`<div class="ic">${x.ic}</div><div class="t">${x.ti}</div><div class="d">${x.d}</div>${x.unav?`<div class="badge">${t('serverNeeded')}</div>`:''}`;
  d.onclick=()=>openTool(x.id);return d;}
function renderHome(){
  const q=($('#toolSearch').value||'').toLowerCase();
  const box=$('#toolSections');box.innerHTML='';
  const list=TOOLS.filter(x=>!q||x.ti.toLowerCase().includes(q)||x.d.toLowerCase().includes(q));
  if(q){const g=document.createElement('div');g.className='tool-grid';list.forEach(x=>g.appendChild(toolCard(x)));
    box.appendChild(g);if(!list.length)box.innerHTML='<p class="empty">No tools match.</p>';}
  else CATS.forEach(([cid,cl])=>{const h=document.createElement('div');h.className='cat-title';h.textContent=cl;box.appendChild(h);
    const g=document.createElement('div');g.className='tool-grid';
    TOOLS.filter(x=>x.cat===cid).forEach(x=>g.appendChild(toolCard(x)));box.appendChild(g);});
  const fg=$('#favTools');fg.innerHTML='';const f=TOOLS.filter(x=>isFav(x.id));
  if(f.length)f.forEach(x=>fg.appendChild(toolCard(x)));else fg.innerHTML=`<p class="empty">${t('noFav')}</p>`;
  renderRecent();
}
async function renderRecent(){
  const box=$('#recentFiles');let files=[];try{files=await dbAll();}catch(e){}
  files.sort((a,b)=>b.ts-a.ts);box.innerHTML='';
  if(!files.length){box.innerHTML=`<p class="empty">${t('noRecent')}</p>`;return;}
  files.slice(0,5).forEach(f=>box.appendChild(fileRow(f,true)));
}
function fileRow(f,mini){
  const d=document.createElement('div');d.className='file-item';
  const ic=f.mime&&f.mime.includes('pdf')?'📕':f.mime&&f.mime.startsWith('image')?'🖼️':f.mime&&f.mime.includes('word')?'📘':'📄';
  d.innerHTML=`<div class="fi">${ic}</div><div class="fm"><div class="fn">${esc(f.name)}</div><div class="fs">${fmtSize(f.size)} • ${fmtDate(f.ts)}</div></div><div class="acts"></div>`;
  const acts=d.querySelector('.acts');
  const mk=(txt,fn)=>{const b=document.createElement('button');b.className='mini';b.textContent=txt;b.onclick=e=>{e.stopPropagation();fn();};acts.appendChild(b);};
  mk('⬇️',async()=>{const r=await dbGet(f.id);if(r&&r.blob)saveBlob(r.blob,f.name);});
  mk('📤',async()=>{const r=await dbGet(f.id);if(r&&r.blob)shareBlob(r.blob,f.name);});
  if(!mini){mk(f.fav?'★':'☆',async()=>{f.fav=!f.fav;await dbPut(f);renderFiles();renderHome();});
    mk('✏️',async()=>{const nn=await modal(t('rename'),`<input id="mname" type="text" value="${esc(f.name)}" style="width:100%">`,t('save'),t('cancel'));
      if(nn){const inp=document.querySelector('#mname');const nv=inp&&inp.value.trim();
        if(nv&&nv!==f.name){f.name=nv;await dbPut(f);renderFiles();renderHome();toast(t('done'));}}});
    mk('🗑️',async()=>{if(await modal(t('del'),'<p>'+t('confirmDel')+'</p>',t('yes'),t('no'))){await dbDel(f.id);renderFiles();renderHome();}});}
  return d;
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ---------- files screen ---------- */
let fileCat='all';
async function renderFiles(){
  const box=$('#fileList');box.innerHTML='<p class="empty">…</p>';
  let files=[];try{files=await dbAll();}catch(e){box.innerHTML='<p class="empty">Storage unavailable.</p>';return;}
  const q=($('#fileSearch').value||'').toLowerCase(),sort=$('#fileSort').value;
  files=files.filter(f=>{
    if(q&&!f.name.toLowerCase().includes(q))return false;
    if(fileCat==='fav'&&!f.fav)return false;
    if(fileCat==='pdf'&&!(f.mime||'').includes('pdf'))return false;
    if(fileCat==='image'&&!(f.mime||'').startsWith('image'))return false;
    if(fileCat==='doc'&&!((f.mime||'').includes('word')||(f.mime||'').includes('text')))return false;
    return true;});
  files.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name):sort==='size'?(a,b)=>b.size-a.size:(a,b)=>b.ts-a.ts);
  box.innerHTML='';if(!files.length){box.innerHTML=`<p class="empty">${t('noFiles')}</p>`;return;}
  files.forEach(f=>box.appendChild(fileRow(f,false)));
}
$('#fileSearch')&&$('#fileSearch').addEventListener('input',renderFiles);
$('#fileSort')&&$('#fileSort').addEventListener('change',renderFiles);
$$('#fileCats .chip').forEach(c=>c.onclick=()=>{$$('#fileCats .chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');fileCat=c.dataset.cat;renderFiles();});

/* ---------- history ---------- */
function renderHistory(){
  const box=$('#historyList');const h=getHist();box.innerHTML='';
  if(!h.length){box.innerHTML=`<p class="empty">${t('noFiles')}</p>`;return;}
  h.forEach(x=>{const d=document.createElement('div');d.className='file-item';
    d.innerHTML=`<div class="fi">🕘</div><div class="fm"><div class="fn">${esc(x.tool)}</div><div class="fs">${esc(x.detail||'')} • ${fmtDate(x.ts)}</div></div>`;box.appendChild(d);});
}
$('#clearHistory').onclick=async()=>{if(await modal(t('clearHistory'),'<p>'+t('confirmClearH')+'</p>',t('yes'),t('no'))){localStorage.removeItem('pt_hist');renderHistory();}};

/* ---------- settings ---------- */
function applyTheme(){const th=localStorage.getItem('pt_theme')||'light';document.documentElement.dataset.theme=th;
  $('#themeBtn').textContent=th==='dark'?'☀️':'🌙';const s=$('#themeSel');if(s)s.value=th;}
$('#themeBtn').onclick=()=>{localStorage.setItem('pt_theme',(localStorage.getItem('pt_theme')||'light')==='dark'?'light':'dark');applyTheme();};
$('#themeSel')&&$('#themeSel').addEventListener('change',e=>{localStorage.setItem('pt_theme',e.target.value);applyTheme();});
$('#langSel')&&$('#langSel').addEventListener('change',e=>{LANG=e.target.value;localStorage.setItem('pt_lang',LANG);applyI18n();renderHome();});
$('#privacyBtn').onclick=()=>modal(t('privacy'),`<p><b>Jilan PDF Tools</b> processes all your files <b>locally on your device</b>. No documents are uploaded to any server. Libraries (pdf-lib, PDF.js, Tesseract) load from public CDNs on first use — they do not receive your files.</p><p>Files you save go to your Downloads folder or stay in the app's local storage. Clearing app/browser data removes locally kept files. No account, no tracking, no ads.</p>`);
$('#aboutBtn').onclick=()=>modal(t('about'),`<p><b>Jilan PDF Tools v1.0</b><br>Convert • Edit • Scan • Manage<br>Your All-in-One Document Solution</p><p>Built with pdf-lib, PDF.js, jsPDF, Tesseract.js and docx — all open-source libraries running on your device.</p>`);
$('#wipeBtn').onclick=async()=>{if(await modal(t('wipe'),'<p>'+t('confirmWipe')+'</p>',t('yes'),t('no'))){await dbClear();localStorage.clear();location.reload();}};
$('#toolSearch').addEventListener('input',renderHome);

/* ---------- store a processed file ---------- */
async function keepFile(name,mime,blob,toolLabel,detail){
  const f={id:'f'+Date.now().toString(36)+Math.floor(Math.random()*999),name,mime,size:blob.size,ts:Date.now(),fav:false,blob};
  try{await dbPut(f);}catch(e){}
  addHist(toolLabel||name,(detail||'')+' • '+fmtSize(blob.size));
  return f;
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  applyTheme();applyI18n();
  const ls=$('#langSel');if(ls)ls.value=LANG;
  try{if(!navigator.onLine)$('#netWarn').classList.remove('hidden');}catch(e){}
  window.addEventListener('online',()=>$('#netWarn').classList.add('hidden'));
  window.addEventListener('offline',()=>$('#netWarn').classList.remove('hidden'));
  if(!location.hash)history.replaceState(null,'','#/home');
  nav();
});
