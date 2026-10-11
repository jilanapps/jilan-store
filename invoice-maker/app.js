/* Jilan Invoice Maker v1.0 — "Simple Billing. Smarter Business." */
'use strict';
/* ============ utils ============ */
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayLocal=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const addDays=(ds,n)=>{const d=new Date(ds+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const weekStart=()=>{const d=new Date();const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const monthStart=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';};
const fmtDate=ds=>{if(!ds)return '—';const b=DB.business.dateFmt||'DD-MM-YYYY';const[y,m,d]=ds.split('-');return b==='MM-DD-YYYY'?`${m}-${d}-${y}`:b==='YYYY-MM-DD'?ds:`${d}-${m}-${y}`;};

/* ============ money (integer paisa math — decimal safe) ============ */
const P=p=>Math.round(Number(p)||0);                       // to paisa int
const MONEY=p=>{p=P(p);const r=p/100;const s=r.toLocaleString('en-PK',{minimumFractionDigits:(p%100?2:0),maximumFractionDigits:2});return (DB.business.currency||'Rs')+' '+s;};
const PCT_IN=p=>Math.round(Number(p)*100)||0;              // percent -> bp (10% -> 1000)
const PCT_OUT=bp=>(bp/100);

/* ============ i18n ============ */
const T={
en:{nav_home:'Home',nav_inv:'Invoices',nav_cust:'Customers',nav_prod:'Products',nav_more:'More',
home_welcome:'Welcome',stat_today:'Today',stat_week:'This week',stat_month:'This month',stat_collected:'Collected',stat_outstanding:'Outstanding',stat_invoices:'Invoices',stat_unpaid:'Unpaid',stat_overdue:'Overdue',
qa_new:'New Invoice',qa_customer:'Add Customer',qa_product:'Add Product',qa_reports:'Reports',qa_backup:'Backup',
recent_inv:'Recent invoices',recent_cust:'Recent customers',view_all:'View all',
empty_home:'No business data yet',empty_home_s:'Create your first invoice to see sales, balances and reports here.',empty_cta:'Create first invoice',
inv_title:'Invoices',inv_new:'+ New Invoice',inv_search:'Search invoice no. or customer…',
st_draft:'Draft',st_unpaid:'Unpaid',st_partial:'Partial',st_paid:'Paid',st_overdue:'Overdue',
f_all:'All',
inv_no:'Invoice no.',inv_date:'Date',inv_due:'Due date',inv_customer:'Customer',inv_walkin:'Walk-in customer',inv_items:'Items',inv_add:'+ Add item',
c_desc:'Description',c_qty:'Qty',c_price:'Price',c_total:'Line total',c_remove:'Remove',
inv_discount:'Discount',d_none:'None',d_fixed:'Fixed (Rs)',d_percent:'Percent (%)',
inv_taxrate:'Tax rate (%)',inv_subtotal:'Subtotal',inv_disc:'Discount',inv_taxable:'Taxable',inv_tax:'Tax',inv_grand:'Grand total',inv_paid:'Paid',inv_balance:'Balance due',
inv_method:'Payment method',inv_notes:'Notes',inv_terms:'Terms',
save_draft:'Save draft',save_inv:'Save invoice',preview:'Preview',print:'Print',pdf:'Download PDF',back:'Back',share:'Share',copy:'Copy',
del:'Delete',edit:'Edit',save:'Save',cancel:'Cancel',close:'Close',add:'Add',search:'Search',confirm_del:'Are you sure you want to delete this?',yes:'Yes',no:'No',
cust_title:'Customers',cust_add:'+ Add customer',cust_search:'Search customers…',
f_name:'Name',f_phone:'Phone',f_email:'Email',f_address:'Address',f_city:'City',f_notes:'Notes',
cust_billed:'Total billed',cust_received:'Received',cust_balance:'Balance',cust_hist:'Purchase history',
prod_title:'Products',prod_add:'+ Add product',prod_search:'Search products…',
p_name:'Product / service name',p_sku:'SKU / code',p_desc:'Description',p_price:'Selling price (Rs)',p_unit:'Unit',p_cost:'Cost price (Rs, optional)',p_stock:'Stock qty (optional)',
u_piece:'piece',u_hour:'hour',u_kg:'kg',u_service:'service',
more_reports:'📊 Reports',more_inventory:'📦 Inventory',more_backup:'💾 Backup & restore',more_settings:'⚙️ Settings',more_profile:'🏪 Business profile',
rep_title:'Reports',rep_from:'From',rep_to:'To',rep_apply:'Apply',rep_day:'Day',rep_week:'Week',rep_month:'Month',rep_custom:'Custom',
rep_sales:'Sales in period',rep_invoiced:'Invoiced',rep_received:'Collected',rep_outstd:'Outstanding',rep_count:'Invoices',
rep_paid_unpaid:'Paid vs unpaid',rep_outstd_cust:'Outstanding by customer',rep_best:'Best-selling products',rep_by_cust:'Revenue by customer',rep_d_t:'Discounts & taxes',rep_profit:'Gross profit (est.)',rep_csv:'Export CSV',rep_by_qty:'Qty',rep_value:'Value',
inv_stock_title:'Inventory',inv_low:'Low stock',inv_move:'Movements',inv_opening:'Opening stock',inv_add_stock:'Add stock',inv_sub_stock:'Remove stock',inv_reason:'Reason',
bk_title:'Backup & restore',bk_export:'Export backup (JSON)',bk_import:'Import backup (JSON)',bk_warn:'Data is stored only on this device/browser. Clearing browser data will erase it. Export a backup regularly.',
bk_done:'Backup imported successfully',bk_bad:'Invalid backup file',
set_title:'Settings',set_theme:'Theme',set_light:'Light',set_dark:'Dark',set_lang:'Language',set_lang_en:'English',set_lang_ur:'اردو (Urdu)',set_about:'About',set_version:'Version 1.0',set_reset:'Reset all data',set_reset_c:'This will erase ALL business data. Export a backup first!',
set_privacy:'Privacy',set_privacy_t:'All data stays on your device. Nothing is uploaded. No account needed.',
prof_title:'Business profile',prof_name:'Business / shop name',prof_owner:'Owner name',prof_phone:'Phone',prof_email:'Email',prof_addr:'Address',prof_city:'City',prof_logo:'Logo (image)',prof_taxreg:'Tax registration (optional)',prof_prefix:'Invoice number prefix',prof_terms:'Default terms',prof_footer:'Footer message',prof_taxrate:'Default tax rate (%)',prof_datefmt:'Date format',
pay_title:'Record payment',pay_amount:'Amount (Rs)',pay_date:'Date',pay_method:'Method',pay_ref:'Reference (optional)',pay_receipt:'Receipt no.',pay_save:'Save payment',pay_hist:'Payment history',pay_reverse:'Reverse',pay_rev_c:'Reverse this payment? The invoice balance will be restored.',
m_cash:'Cash',m_bank:'Bank transfer',m_other:'Other',
tmpl:'Template',tmpl1:'Classic Professional',tmpl2:'Modern Minimal',tmpl3:'Retail Receipt',
toast_saved:'Saved ✓',toast_deleted:'Deleted ✓',toast_paid:'Payment recorded ✓',toast_copied:'Copied ✓',
err_qty:'Quantity must be greater than 0',err_price:'Price cannot be negative',err_disc:'Discount cannot exceed subtotal',err_dup:'Invoice number already exists',err_amt:'Amount must be greater than 0',err_overpay:'Amount exceeds balance due',
inv_detail:'Invoice',receipt:'Receipt',no_customer:'No customer selected',
pdf_need_net:'PDF needs internet the first time (library download). Print works offline.',
share_ok:'Shared ✓',share_no:'Sharing not supported on this device — PDF downloaded instead.',
sum_copied:'Invoice summary copied ✓',
walkin:'Walk-in'
},
ur:{nav_home:'ہوم',nav_inv:'انوائس',nav_cust:'گاہک',nav_prod:'مصنوعات',nav_more:'مزید',
home_welcome:'خوش آمدید',stat_today:'آج',stat_week:'اس ہفتے',stat_month:'اس مہینے',stat_collected:'وصول شدہ',stat_outstanding:'بقایا',stat_invoices:'انوائس',stat_unpaid:'غیر ادا شدہ',stat_overdue:'واجب الادا',
qa_new:'نیا انوائس',qa_customer:'گاہک شامل کریں',qa_product:'مصنوعات شامل کریں',qa_reports:'رپورٹس',qa_backup:'بیک اپ',
recent_inv:'حالیہ انوائس',recent_cust:'حالیہ گاہک',view_all:'سب دیکھیں',
empty_home:'ابھی کوئی کاروباری ڈیٹا نہیں',empty_home_s:'پہلا انوائس بنائیں تاکہ فروخت، بقایا اور رپورٹس یہاں نظر آئیں۔',empty_cta:'پہلا انوائس بنائیں',
inv_title:'انوائسز',inv_new:'+ نیا انوائس',inv_search:'انوائس نمبر یا گاہک تلاش کریں…',
st_draft:'مسودہ',st_unpaid:'غیر ادا شدہ',st_partial:'جزوی',st_paid:'ادا شدہ',st_overdue:'واجب الادا',
f_all:'سب',
inv_no:'انوائس نمبر',inv_date:'تاریخ',inv_due:'واجب الادا تاریخ',inv_customer:'گاہک',inv_walkin:'چلتا گاہک',inv_items:'آئٹمز',inv_add:'+ آئٹم شامل کریں',
c_desc:'تفصیل',c_qty:'مقدار',c_price:'قیمت',c_total:'رقم',c_remove:'حذف کریں',
inv_discount:'رعایت',d_none:'کوئی نہیں',d_fixed:'مقررہ (روپے)',d_percent:'فیصد (%)',
inv_taxrate:'ٹیکس کی شرح (%)',inv_subtotal:'ذیلی مجموعہ',inv_disc:'رعایت',inv_taxable:'قابل ٹیکس',inv_tax:'ٹیکس',inv_grand:'کل رقم',inv_paid:'ادا شدہ',inv_balance:'بقایا رقم',
inv_method:'ادائیگی کا طریقہ',inv_notes:'نوٹس',inv_terms:'شرائط',
save_draft:'مسودہ محفوظ کریں',save_inv:'انوائس محفوظ کریں',preview:'پیش نظارہ',print:'پرنٹ',pdf:'PDF ڈاؤن لوڈ',back:'واپس',share:'شیئر',copy:'کاپی',
del:'حذف کریں',edit:'ترمیم',save:'محفوظ کریں',cancel:'منسوخ',close:'بند کریں',add:'شامل کریں',search:'تلاش',confirm_del:'کیا آپ واقعی حذف کرنا چاہتے ہیں؟',yes:'جی ہاں',no:'نہیں',
cust_title:'گاہک',cust_add:'+ گاہک شامل کریں',cust_search:'گاہک تلاش کریں…',
f_name:'نام',f_phone:'فون',f_email:'ای میل',f_address:'پتہ',f_city:'شہر',f_notes:'نوٹس',
cust_billed:'کل بل',cust_received:'موصول',cust_balance:'بقایا',cust_hist:'خریداری کی تفصیل',
prod_title:'مصنوعات',prod_add:'+ مصنوعات شامل کریں',prod_search:'مصنوعات تلاش کریں…',
p_name:'مصنوعات / سروس کا نام',p_sku:'SKU / کوڈ',p_desc:'تفصیل',p_price:'فروخت قیمت (روپے)',p_unit:'اکائی',p_cost:'لاگت قیمت (روپے، اختیاری)',p_stock:'اسٹاک مقدار (اختیاری)',
u_piece:'عدد',u_hour:'گھنٹہ',u_kg:'کلو',u_service:'سروس',
more_reports:'📊 رپورٹس',more_inventory:'📦 اسٹاک',more_backup:'💾 بیک اپ',more_settings:'⚙️ ترتیبات',more_profile:'🏪 کاروباری پروفائل',
rep_title:'رپورٹس',rep_from:'از',rep_to:'تک',rep_apply:'لاگو کریں',rep_day:'دن',rep_week:'ہفتہ',rep_month:'مہینہ',rep_custom:'اپنی مرضی',
rep_sales:'اس مدت کی فروخت',rep_invoiced:'انوائس شدہ',rep_received:'وصول شدہ',rep_outstd:'بقایا',rep_count:'انوائسز',
rep_paid_unpaid:'ادا شدہ بمقابلہ غیر ادا شدہ',rep_outstd_cust:'گاہک کے حساب سے بقایا',rep_best:'بہترین فروخت',rep_by_cust:'گاہک کے حساب سے آمدنی',rep_d_t:'رعایت و ٹیکس',rep_profit:'مجموعی منافع (تخمینی)',rep_csv:'CSV برآمد کریں',rep_by_qty:'مقدار',rep_value:'رقم',
inv_stock_title:'اسٹاک',inv_low:'کم اسٹاک',inv_move:'نقل و حرکت',inv_opening:'ابتدائی اسٹاک',inv_add_stock:'اسٹاک بڑھائیں',inv_sub_stock:'اسٹاک کم کریں',inv_reason:'وجہ',
bk_title:'بیک اپ',bk_export:'بیک اپ برآمد کریں (JSON)',bk_import:'بیک اپ درآمد کریں (JSON)',bk_warn:'ڈیٹا صرف اس ڈیوائس/براؤزر میں محفوظ ہے۔ براؤزر ڈیٹا صاف کرنے سے مٹ جائے گا۔ باقاعدگی سے بیک اپ لیں۔',
bk_done:'بیک اپ کامیابی سے درآمد ہو گیا',bk_bad:'غلط بیک اپ فائل',
set_title:'ترتیبات',set_theme:'تھیم',set_light:'روشن',set_dark:'تاریک',set_lang:'زبان',set_lang_en:'English',set_lang_ur:'اردو (Urdu)',set_about:'متعلق',set_version:'ورژن 1.0',set_reset:'تمام ڈیٹا مٹائیں',set_reset_c:'اس سے تمام کاروباری ڈیٹا مٹ جائے گا۔ پہلے بیک اپ لے لیں!',
set_privacy:'رازداری',set_privacy_t:'تمام ڈیٹا آپ کے ڈیوائس پر رہتا ہے۔ کچھ اپ لوڈ نہیں ہوتا۔ اکاؤنٹ کی ضرورت نہیں۔',
prof_title:'کاروباری پروفائل',prof_name:'کاروبار / دکان کا نام',prof_owner:'مالک کا نام',prof_phone:'فون',prof_email:'ای میل',prof_addr:'پتہ',prof_city:'شہر',prof_logo:'لوگو (تصویر)',prof_taxreg:'ٹیکس رجسٹریشن (اختیاری)',prof_prefix:'انوائس نمبر کا سابقہ',prof_terms:'پہلے سے طے شدہ شرائط',prof_footer:'فوٹر پیغام',prof_taxrate:'پہلے سے طے شدہ ٹیکس شرح (%)',prof_datefmt:'تاریخ کا فارمیٹ',
pay_title:'ادائیگی درج کریں',pay_amount:'رقم (روپے)',pay_date:'تاریخ',pay_method:'طریقہ',pay_ref:'حوالہ (اختیاری)',pay_receipt:'رسید نمبر',pay_save:'ادائیگی محفوظ کریں',pay_hist:'ادائیگی کی تفصیل',pay_reverse:'واپس لیں',pay_rev_c:'اس ادائیگی کو واپس لیں؟ انوائس کا بقایا بحال ہو جائے گا۔',
m_cash:'نقد',m_bank:'بینک ٹرانسفر',m_other:'دیگر',
tmpl:'سانچہ',tmpl1:'کلاسک پروفیشنل',tmpl2:'ماڈرن منیمل',tmpl3:'ریٹیل رسید',
toast_saved:'محفوظ ہو گیا ✓',toast_deleted:'حذف ہو گیا ✓',toast_paid:'ادائیگی درج ہو گئی ✓',toast_copied:'کاپی ہو گیا ✓',
err_qty:'مقدار صفر سے زیادہ ہونی چاہیے',err_price:'قیمت منفی نہیں ہو سکتی',err_disc:'رعایت ذیلی مجموعے سے زیادہ نہیں ہو سکتی',err_dup:'انوائس نمبر پہلے سے موجود ہے',err_amt:'رقم صفر سے زیادہ ہونی چاہیے',err_overpay:'رقم بقایا سے زیادہ ہے',
inv_detail:'انوائس',receipt:'رسید',no_customer:'کوئی گاہک منتخب نہیں',
pdf_need_net:'PDF کے لیے پہلی بار انٹرنیٹ چاہیے۔ پرنٹ آف لائن کام کرتا ہے۔',
share_ok:'شیئر ہو گیا ✓',share_no:'اس ڈیوائس پر شیئرنگ نہیں — PDF ڈاؤن لوڈ کر لیا گیا۔',
sum_copied:'انوائس کا خلاصہ کاپی ہو گیا ✓',
walkin:'چلتا گاہک'
}};
const t=k=>(T[DB.settings.lang]||T.en)[k]||T.en[k]||k;
function applyI18n(){$$('[data-i]').forEach(el=>{el.textContent=t(el.dataset.i);});}

/* ============ DB ============ */
const DBKEY='jilan_invoice_maker_v1';
let DB=null;
function defaultDB(){return{
  business:{name:'',owner:'',phone:'',email:'',address:'',city:'',logo:'',taxReg:'',currency:'Rs',prefix:'JIL-INV',nextNum:1,nextReceipt:1,terms:'',footer:'',taxRate:0,dateFmt:'DD-MM-YYYY'},
  customers:[],products:[],invoices:[],stockMoves:[],
  settings:{theme:'light',lang:'en',inventory:false,lowStock:5}
};}
function loadDB(){try{const r=localStorage.getItem(DBKEY);DB=r?Object.assign(defaultDB(),JSON.parse(r)):defaultDB();}catch(e){DB=defaultDB();}DB.settings=Object.assign(defaultDB().settings,DB.settings||{});DB.business=Object.assign(defaultDB().business,DB.business||{});}
function saveDB(){try{localStorage.setItem(DBKEY,JSON.stringify(DB));}catch(e){toast('Storage full!');}}

/* ============ invoice math (paisa integers) ============ */
function recalc(inv){
  let sub=0;
  inv.items.forEach(it=>{it.qty=Number(it.qty)||0;it.price=P(it.price);it.lineTotal=Math.round(it.qty*it.price);sub+=it.lineTotal;});
  inv.subtotal=sub;
  let disc=0;
  if(inv.discountType==='percent'){disc=Math.round(sub*(inv.discountBp||0)/10000);}
  else{disc=P(inv.discountFixed);}
  if(disc>sub)disc=sub;
  inv.discountAmt=disc;
  inv.taxable=sub-disc;
  inv.taxAmt=Math.round(inv.taxable*(inv.taxRateBp||0)/10000);
  inv.total=inv.taxable+inv.taxAmt;
  inv.paid=P(inv.payments.reduce((a,p)=>a+P(p.amount),0));
  inv.balance=inv.total-inv.paid;
  return inv;
}
function invStatus(inv){
  if(inv.status==='draft')return 'draft';
  if(inv.balance<=0)return 'paid';
  if(inv.dueDate&&inv.dueDate<todayLocal())return 'overdue';
  if(inv.paid>0)return 'partial';
  return 'unpaid';
}
function stBadge(inv){const s=invStatus(inv);return `<span class="badge b-${s}">${t('st_'+s)}</span>`;}
function nextInvNo(){const b=DB.business;return b.prefix+'-'+String(b.nextNum).padStart(4,'0');}
function nextReceiptNo(){return 'RCP-'+String(DB.business.nextReceipt).padStart(4,'0');}
function custName(id){if(!id)return t('walkin');const c=DB.customers.find(c=>c.id===id);return c?c.name:t('walkin');}

/* ============ nav / toast / modal ============ */
let navStack=['home'], curScreen='home';
function show(name,push=true){
  if(push&&curScreen!==name)navStack.push(name);
  curScreen=name;
  $$('.screen').forEach(s=>s.classList.remove('active'));
  const el=$('#scr-'+name);if(el)el.classList.add('active');
  $$('#bottomnav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===name||(name==='invedit'||name==='invview')&&b.dataset.nav==='invoices'||(name==='reports'||name==='inventory'||name==='backup'||name==='settings'||name==='profile')&&b.dataset.nav==='more'));
  window.scrollTo(0,0);
  const fn={home:rHome,invoices:rInvoices,invedit:rInvEdit,invview:rInvView,customers:rCustomers,products:rProducts,more:rMore,reports:rReports,inventory:rInventory,backup:rBackup,settings:rSettings,profile:rProfile,print:rPrint}[name];
  if(fn)fn();
}
function goBack(){if(navStack.length>1){navStack.pop();show(navStack[navStack.length-1],false);}else show('home',false);}
window.__jilanBack=function(){const m=$('#modalWrap');if(!m.classList.contains('hidden')){closeModal();return;}goBack();};
document.addEventListener('backbutton',()=>window.__jilanBack(),false);
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2200);}
function openModal(html){$('#modal').innerHTML=html;$('#modalWrap').classList.remove('hidden');}
function closeModal(){$('#modalWrap').classList.add('hidden');}
$('#modalWrap').addEventListener('click',e=>{if(e.target.id==='modalWrap')closeModal();});
function confirmBox(msg,onYes){openModal(`<h3>${esc(msg)}</h3><div class="btnrow"><button class="btn danger" id="cY">${t('yes')}</button><button class="btn ghost" id="cN">${t('no')}</button></div>`);$('#cY').onclick=()=>{closeModal();onYes();};$('#cN').onclick=closeModal;}

/* ============ HOME / dashboard ============ */
function salesBetween(a,b){return DB.invoices.filter(i=>i.status!=='draft'&&i.date>=a&&i.date<=b);}
function rHome(){
  const el=$('#scr-home');
  const td=todayLocal(),ws=weekStart(),ms=monthStart();
  const sum=a=>a.reduce((s,i)=>s+i.total,0), ps=a=>a.reduce((s,i)=>s+i.paid,0);
  const dS=salesBetween(td,td),wS=salesBetween(ws,td),mS=salesBetween(ms,td);
  const all=DB.invoices.filter(i=>i.status!=='draft');
  const outstanding=all.reduce((s,i)=>s+i.balance,0);
  const unpaid=all.filter(i=>invStatus(i)==='unpaid').length;
  const overdue=all.filter(i=>invStatus(i)==='overdue').length;
  const recent=all.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const rcust=DB.customers.slice(-5).reverse();
  el.innerHTML=`
  <div class="card"><div class="row between"><div><h3 style="margin:0">${t('home_welcome')}${DB.business.name?', '+esc(DB.business.name):''} 👋</h3><div class="small">${fmtDate(td)}</div></div></div></div>
  ${all.length===0?`<div class="card empty"><div class="big">🧾</div><h3>${t('empty_home')}</h3><p class="small">${t('empty_home_s')}</p><button class="btn teal" onclick="newInvoice()">${t('empty_cta')}</button></div>`:`
  <div class="grid4">
    <div class="stat"><div class="v">${MONEY(sum(dS))}</div><div class="l">${t('stat_today')}</div></div>
    <div class="stat"><div class="v">${MONEY(sum(wS))}</div><div class="l">${t('stat_week')}</div></div>
    <div class="stat"><div class="v">${MONEY(sum(mS))}</div><div class="l">${t('stat_month')}</div></div>
    <div class="stat"><div class="v">${MONEY(outstanding)}</div><div class="l">${t('stat_outstanding')}</div></div>
    <div class="stat"><div class="v">${MONEY(ps(all))}</div><div class="l">${t('stat_collected')}</div></div>
    <div class="stat"><div class="v">${all.length}</div><div class="l">${t('stat_invoices')}</div></div>
    <div class="stat"><div class="v">${unpaid}</div><div class="l">${t('stat_unpaid')}</div></div>
    <div class="stat"><div class="v">${overdue}</div><div class="l">${t('stat_overdue')}</div></div>
  </div>`}
  <div class="card"><h3>⚡ Quick actions</h3><div class="btnrow">
    <button class="btn" onclick="newInvoice()">🧾 ${t('qa_new')}</button>
    <button class="btn teal" onclick="show('customers')">${t('qa_customer')}</button>
    <button class="btn ghost" onclick="show('products')">${t('qa_product')}</button>
    <button class="btn ghost" onclick="show('reports')">${t('qa_reports')}</button>
  </div></div>
  ${recent.length?`<div class="card"><div class="row between"><h3>${t('recent_inv')}</h3><button class="btn small ghost" onclick="show('invoices')">${t('view_all')}</button></div>${recent.map(i=>invRow(i)).join('')}</div>`:''}
  ${rcust.length?`<div class="card"><div class="row between"><h3>${t('recent_cust')}</h3><button class="btn small ghost" onclick="show('customers')">${t('view_all')}</button></div>${rcust.map(c=>`<div class="listitem" onclick="custDetail('${c.id}')"><div><div class="t">${esc(c.name)}</div><div class="s">${esc(c.phone||'')}</div></div><div class="amt">${MONEY(custBalance(c.id))}</div></div>`).join('')}</div>`:''}`;
}
function custBalance(cid){return DB.invoices.filter(i=>i.status!=='draft'&&i.customerId===cid).reduce((s,i)=>s+i.balance,0);}
function invRow(i){return `<div class="listitem" onclick="viewInvoice('${i.id}')"><div><div class="t">${esc(i.no)} · ${esc(custName(i.customerId))}</div><div class="s">${fmtDate(i.date)} ${stBadge(i)}</div></div><div class="amt">${MONEY(i.total)}</div></div>`;}

/* ============ INVOICES list ============ */
let invFilter='all',invSearch='';
function rInvoices(){
  const el=$('#scr-invoices');
  const list=DB.invoices.slice().sort((a,b)=>(b.date+a.no).localeCompare(a.date+b.no)).filter(i=>{
    if(invFilter!=='all'&&invStatus(i)!==invFilter)return false;
    if(invSearch){const q=invSearch.toLowerCase();return (i.no+' '+custName(i.customerId)).toLowerCase().includes(q);}
    return true;
  });
  el.innerHTML=`<div class="card"><div class="row between"><h3 style="margin:0">🧾 ${t('inv_title')}</h3><button class="btn small" onclick="newInvoice()">${t('inv_new')}</button></div>
  <div class="searchbar"><input id="invQ" placeholder="${t('inv_search')}" value="${esc(invSearch)}"></div>
  <div class="chipbar">${['all','draft','unpaid','partial','paid','overdue'].map(f=>`<button class="chip ${invFilter===f?'on':''}" onclick="invFilter='${f}';rInvoices()">${t(f==='all'?'f_all':'st_'+f)}</button>`).join('')}</div></div>
  ${list.length?list.map(invRow).join(''):`<div class="card empty"><div class="big">🧾</div><p class="small">—</p><button class="btn" onclick="newInvoice()">${t('inv_new')}</button></div>`}`;
  const q=$('#invQ');q.addEventListener('input',()=>{invSearch=q.value;const pos=q.selectionStart;rInvoices();const nq=$('#invQ');nq.focus();nq.setSelectionRange(pos,pos);});
}

/* ============ INVOICE EDITOR ============ */
let ED=null; // editing draft object
function newInvoice(){ED={id:uid(),no:nextInvNo(),date:todayLocal(),dueDate:'',customerId:'',items:[{productId:null,desc:'',qty:1,price:0,lineTotal:0}],discountType:'none',discountFixed:0,discountBp:0,taxRateBp:DB.business.taxRate||0,taxable:0,taxAmt:0,subtotal:0,discountAmt:0,total:0,paid:0,balance:0,method:'Cash',notes:'',terms:DB.business.terms||'',status:'draft',payments:[]};show('invedit');}
function editInvoice(id){const src=DB.invoices.find(i=>i.id===id);if(!src)return;ED=JSON.parse(JSON.stringify(src));show('invedit');}
function edAddItem(){ED.items.push({productId:null,desc:'',qty:1,price:0,lineTotal:0});rInvEdit();}
function edDelItem(ix){if(ED.items.length>1){ED.items.splice(ix,1);rInvEdit();}}
function edSync(){
  ED.no=$('#edNo').value.trim()||ED.no;
  ED.date=$('#edDate').value||ED.date; ED.dueDate=$('#edDue').value;
  ED.customerId=$('#edCust').value; ED.method=$('#edMethod').value;
  ED.notes=$('#edNotes').value; ED.terms=$('#edTerms').value;
  ED.discountType=$('#edDType').value; ED.discountFixed=P(($('#edDFix').value||0)*100); ED.discountBp=PCT_IN($('#edDPct').value||0);
  ED.taxRateBp=PCT_IN($('#edTax').value||0);
  $$('.itemrow').forEach((r,ix)=>{const it=ED.items[ix];if(!it)return;it.desc=r.querySelector('.itD').value;it.qty=Math.max(0,Number(r.querySelector('.itQ').value)||0);it.price=P((Number(r.querySelector('.itP').value)||0)*100);});
  recalc(ED);
}
function edValid(){
  if(ED.items.some(it=>it.qty<=0)){toast(t('err_qty'));return false;}
  if(ED.items.some(it=>it.price<0)){toast(t('err_price'));return false;}
  if(ED.discountType!=='none'&&ED.discountAmt>ED.subtotal){toast(t('err_disc'));return false;}
  if(DB.invoices.some(i=>i.id!==ED.id&&i.no===ED.no)){toast(t('err_dup'));return false;}
  return true;
}
function edSave(status){
  edSync();if(!edValid())return;
  ED.status=status;
  const ix=DB.invoices.findIndex(i=>i.id===ED.id);
  const isNew=ix<0;
  if(isNew){DB.invoices.push(ED);DB.business.nextNum++;}
  else{DB.invoices[ix]=ED;}
  if(status!=='draft'&&isNew&&DB.settings.inventory)applyStock(ED,-1,'sale:'+ED.no);
  saveDB();toast(t('toast_saved'));viewId=ED.id;show('invview');
}
function rInvEdit(){
  if(!ED){show('invoices');return;}
  recalc(ED);
  const el=$('#scr-invedit');
  el.innerHTML=`<div class="card"><div class="row between"><button class="btn small ghost" onclick="goBack()">← ${t('back')}</button><h3 style="margin:0">🧾 ${ED.id&&DB.invoices.find(i=>i.id===ED.id)?t('inv_detail'):t('inv_new')}</h3><span></span></div></div>
  <div class="card">
    <div class="grid2">
      <div><label class="f">${t('inv_no')}</label><input id="edNo" value="${esc(ED.no)}"></div>
      <div><label class="f">${t('inv_date')}</label><input id="edDate" type="date" value="${esc(ED.date)}"></div>
    </div>
    <div class="grid2">
      <div><label class="f">${t('inv_due')}</label><input id="edDue" type="date" value="${esc(ED.dueDate||'')}"></div>
      <div><label class="f">${t('inv_customer')}</label><select id="edCust"><option value="">${t('inv_walkin')}</option>${DB.customers.map(c=>`<option value="${c.id}" ${ED.customerId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    </div>
  </div>
  <div class="card"><div class="row between"><h3>${t('inv_items')}</h3><button class="btn small teal" onclick="edAddItem()">${t('inv_add')}</button></div>
    <div id="items">${ED.items.map((it,ix)=>`
      <div class="itemrow">
        <div class="row between"><select class="itProd" data-ix="${ix}" style="flex:1;margin:4px 4px 4px 0"><option value="">— ${t('c_desc')} —</option>${DB.products.map(p=>`<option value="${p.id}" ${it.productId===p.id?'selected':''}>${esc(p.name)} (${MONEY(p.price)})</option>`).join('')}</select><button class="btn small danger" onclick="edDelItem(${ix})">✕</button></div>
        <input class="itD" placeholder="${t('c_desc')}" value="${esc(it.desc)}">
        <div class="grid2">
          <div><label class="f">${t('c_qty')}</label><input class="itQ" type="number" min="0" step="0.01" value="${it.qty}"></div>
          <div><label class="f">${t('c_price')} (Rs)</label><input class="itP" type="number" min="0" step="0.01" value="${(it.price/100)}"></div>
        </div>
        <div class="row between"><span class="small">${t('c_total')}</span><b>${MONEY(it.lineTotal)}</b></div>
      </div>`).join('')}</div>
  </div>
  <div class="card"><h3>💰 ${t('inv_discount')} / ${t('inv_tax')}</h3>
    <div class="grid2">
      <div><label class="f">${t('inv_discount')}</label><select id="edDType">
        <option value="none" ${ED.discountType==='none'?'selected':''}>${t('d_none')}</option>
        <option value="fixed" ${ED.discountType==='fixed'?'selected':''}>${t('d_fixed')}</option>
        <option value="percent" ${ED.discountType==='percent'?'selected':''}>${t('d_percent')}</option></select></div>
      <div><label class="f">${t('inv_taxrate')}</label><input id="edTax" type="number" min="0" step="0.01" value="${PCT_OUT(ED.taxRateBp)}"></div>
    </div>
    <div class="grid2">
      <div><label class="f">${t('d_fixed')} (Rs)</label><input id="edDFix" type="number" min="0" step="0.01" value="${ED.discountFixed/100}"></div>
      <div><label class="f">${t('d_percent')} %</label><input id="edDPct" type="number" min="0" max="100" step="0.01" value="${PCT_OUT(ED.discountBp)}"></div>
    </div>
    <div class="totals">
      <div class="row"><span>${t('inv_subtotal')}</span><b>${MONEY(ED.subtotal)}</b></div>
      <div class="row"><span>${t('inv_disc')}</span><b>− ${MONEY(ED.discountAmt)}</b></div>
      <div class="row"><span>${t('inv_tax')}</span><b>${MONEY(ED.taxAmt)}</b></div>
      <div class="row grand"><span>${t('inv_grand')}</span><b>${MONEY(ED.total)}</b></div>
    </div>
  </div>
  <div class="card">
    <div class="grid2">
      <div><label class="f">${t('inv_method')}</label><select id="edMethod">${['Cash','Bank transfer','Other'].map(m=>`<option ${ED.method===m?'selected':''}>${m}</option>`).join('')}</select></div>
    </div>
    <label class="f">${t('inv_notes')}</label><textarea id="edNotes">${esc(ED.notes||'')}</textarea>
    <label class="f">${t('inv_terms')}</label><textarea id="edTerms">${esc(ED.terms||'')}</textarea>
  </div>
  <div class="btnrow">
    <button class="btn ghost" onclick="edSync();edSaveSilent();show('invedit')">${t('preview')}</button>
    <button class="btn ghost" onclick="edSave('draft')">📝 ${t('save_draft')}</button>
    <button class="btn teal" onclick="edSave('unpaid')">✓ ${t('save_inv')}</button>
  </div><div style="height:8px"></div>`;
  $$('.itProd').forEach(s=>s.addEventListener('change',()=>{
    const ix=Number(s.dataset.ix),p=DB.products.find(p=>p.id===s.value);if(!p)return;
    edSync();const it=ED.items[ix];it.productId=p.id;it.desc=p.name;it.price=p.price;if(!it.qty)it.qty=1;rInvEdit();
  }));
  ['edDType','edTax','edDFix','edDPct'].forEach(id=>{const n=$('#'+id);if(n)n.addEventListener('input',()=>{edSync();rInvTotals();});});
  $$('.itemrow .itQ,.itemrow .itP').forEach(n=>n.addEventListener('input',()=>{edSync();rInvTotals();}));
}
function rInvTotals(){edSync();const g=$('.totals');if(g)g.innerHTML=`<div class="row"><span>${t('inv_subtotal')}</span><b>${MONEY(ED.subtotal)}</b></div><div class="row"><span>${t('inv_disc')}</span><b>− ${MONEY(ED.discountAmt)}</b></div><div class="row"><span>${t('inv_tax')}</span><b>${MONEY(ED.taxAmt)}</b></div><div class="row grand"><span>${t('inv_grand')}</span><b>${MONEY(ED.total)}</b></div>`;
  $$('.itemrow').forEach((r,ix)=>{const it=ED.items[ix];if(it){const b=r.querySelector('.row.between b');if(b)b.textContent=MONEY(it.lineTotal);}});}
function edSaveSilent(){if(!edValid())return;const ix=DB.invoices.findIndex(i=>i.id===ED.id);if(ix>=0)DB.invoices[ix]=ED;else DB.invoices.push(ED);saveDB();}

/* ============ INVOICE VIEW / payments ============ */
let viewId=null;
function viewInvoice(id){viewId=id;show('invview');}
function rInvView(){
  const i=DB.invoices.find(x=>x.id===viewId);
  if(!i){show('invoices');return;}
  recalc(i);const el=$('#scr-invview');
  el.innerHTML=`<div class="card"><div class="row between"><button class="btn small ghost" onclick="goBack()">← ${t('back')}</button><h3 style="margin:0">${esc(i.no)}</h3>${stBadge(i)}</div>
  <div class="kv"><span class="k">${t('inv_customer')}</span><b>${esc(custName(i.customerId))}</b></div>
  <div class="kv"><span class="k">${t('inv_date')}</span><span>${fmtDate(i.date)}</span></div>
  ${i.dueDate?`<div class="kv"><span class="k">${t('inv_due')}</span><span>${fmtDate(i.dueDate)}</span></div>`:''}
  </div>
  <div class="card"><h3>${t('inv_items')}</h3>
    <table class="data"><tr><th>#</th><th>${t('c_desc')}</th><th class="num">${t('c_qty')}</th><th class="num">${t('c_price')}</th><th class="num">${t('c_total')}</th></tr>
    ${i.items.map((it,ix)=>`<tr><td>${ix+1}</td><td>${esc(it.desc||'—')}</td><td class="num">${it.qty}</td><td class="num">${MONEY(it.price)}</td><td class="num">${MONEY(it.lineTotal)}</td></tr>`).join('')}</table>
    <div class="totals">
      <div class="row"><span>${t('inv_subtotal')}</span><b>${MONEY(i.subtotal)}</b></div>
      ${i.discountAmt?`<div class="row"><span>${t('inv_disc')}</span><b>− ${MONEY(i.discountAmt)}</b></div>`:''}
      ${i.taxAmt?`<div class="row"><span>${t('inv_tax')}</span><b>${MONEY(i.taxAmt)}</b></div>`:''}
      <div class="row grand"><span>${t('inv_grand')}</span><b>${MONEY(i.total)}</b></div>
      <div class="row"><span>${t('inv_paid')}</span><b style="color:var(--ok)">${MONEY(i.paid)}</b></div>
      <div class="row"><span>${t('inv_balance')}</span><b style="color:${i.balance>0?'var(--danger)':'var(--ok)'}">${MONEY(i.balance)}</b></div>
    </div>
    ${i.notes?`<div class="small mt"><b>${t('inv_notes')}:</b> ${esc(i.notes)}</div>`:''}
    ${i.terms?`<div class="small"><b>${t('inv_terms')}:</b> ${esc(i.terms)}</div>`:''}
  </div>
  <div class="card"><div class="row between"><h3 style="margin:0">💵 ${t('pay_hist')}</h3>${i.balance>0?`<button class="btn small teal" onclick="payModal('${i.id}')">+ ${t('pay_title')}</button>`:''}</div>
    ${i.payments.length?i.payments.map(p=>`<div class="listitem"><div><div class="t">${esc(p.no)} · ${fmtDate(p.date)}</div><div class="s">${esc(p.method)}${p.ref?' · '+esc(p.ref):''}</div></div><div class="row"><div class="amt">${MONEY(p.amount)}</div><button class="btn small ghost" onclick="reversePay('${i.id}','${p.id}')">↩</button></div></div>`).join(''):`<p class="small">—</p>`}
  </div>
  <div class="card"><h3>${t('tmpl')}</h3><div class="chipbar" id="tmplBar">${['tmpl1','tmpl2','tmpl3'].map((k,ix)=>`<button class="chip ${ix===0?'on':''}" data-t="${ix+1}">${t(k)}</button>`).join('')}</div>
  <div class="btnrow">
    <button class="btn ghost" onclick="printInvoice('${i.id}')">🖨 ${t('print')}</button>
    <button class="btn" onclick="pdfInvoice('${i.id}',window._pdfTmpl())">⬇ ${t('pdf')}</button>
    <button class="btn ghost" onclick="shareInvoice('${i.id}')">📤 ${t('share')}</button>
  </div><div class="btnrow">
    <button class="btn ghost" onclick="copySummary('${i.id}')">📋 ${t('copy')}</button>
    <button class="btn ghost" onclick="editInvoice('${i.id}')">✏️ ${t('edit')}</button>
    <button class="btn danger" onclick="delInvoice('${i.id}')">🗑 ${t('del')}</button>
  </div></div>`;
  let pdfTmpl=1;
  $$('#tmplBar .chip').forEach(c=>c.onclick=()=>{$$('#tmplBar .chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');pdfTmpl=Number(c.dataset.t);});
  window._pdfTmpl=()=>pdfTmpl;
}
function payModal(invId){
  const i=DB.invoices.find(x=>x.id===invId);if(!i)return;
  openModal(`<h3>💵 ${t('pay_title')} — ${esc(i.no)}</h3>
  <div class="kv"><span class="k">${t('inv_balance')}</span><b>${MONEY(i.balance)}</b></div>
  <label class="f">${t('pay_amount')} *</label><input id="pAmt" type="number" min="0" step="0.01" value="${(i.balance/100)}">
  <div class="grid2"><div><label class="f">${t('pay_date')}</label><input id="pDate" type="date" value="${todayLocal()}"></div>
  <div><label class="f">${t('pay_method')}</label><select id="pMethod"><option>${t('m_cash')}</option><option>${t('m_bank')}</option><option>${t('m_other')}</option></select></div></div>
  <label class="f">${t('pay_ref')}</label><input id="pRef">
  <div class="btnrow"><button class="btn teal" id="pGo">${t('pay_save')}</button><button class="btn ghost" id="pX">${t('cancel')}</button></div>`);
  $('#pX').onclick=closeModal;
  $('#pGo').onclick=()=>{
    const amt=P((Number($('#pAmt').value)||0)*100);
    if(amt<=0){toast(t('err_amt'));return;}
    if(amt>i.balance){toast(t('err_overpay'));return;}
    const p={id:uid(),no:nextReceiptNo(),date:$('#pDate').value||todayLocal(),amount:amt,method:$('#pMethod').value,ref:$('#pRef').value.trim()};
    i.payments.push(p);DB.business.nextReceipt++;recalc(i);
    if(i.status==='draft')i.status='unpaid';
    saveDB();closeModal();toast(t('toast_paid'));rInvView();
  };
}
function reversePay(invId,payId){
  confirmBox(t('pay_rev_c'),()=>{
    const i=DB.invoices.find(x=>x.id===invId);if(!i)return;
    i.payments=i.payments.filter(p=>p.id!==payId);recalc(i);saveDB();toast(t('toast_deleted'));rInvView();
  });
}
function delInvoice(id){
  const i=DB.invoices.find(x=>x.id===id);if(!i)return;
  const linked=i.payments.length>0;
  confirmBox(t('confirm_del')+(linked?' ⚠️ ('+i.payments.length+' payments)':''),()=>{
    if(DB.settings.inventory&&i.status!=='draft')applyStock(i,+1,'void:'+i.no);
    DB.invoices=DB.invoices.filter(x=>x.id!==id);saveDB();toast(t('toast_deleted'));goBack();
  });
}
function copySummary(id){
  const i=DB.invoices.find(x=>x.id===id);if(!i)return;
  const s=`${DB.business.name||'Jilan Invoice Maker'}\n${t('inv_no')}: ${i.no}\n${t('inv_date')}: ${fmtDate(i.date)}\n${t('inv_customer')}: ${custName(i.customerId)}\n${t('inv_grand')}: ${MONEY(i.total)}\n${t('inv_paid')}: ${MONEY(i.paid)}\n${t('inv_balance')}: ${MONEY(i.balance)}`;
  navigator.clipboard.writeText(s).then(()=>toast(t('sum_copied')),()=>toast(s));
}

/* ============ PDF (jsPDF, 3 templates) ============ */
function jspdfReady(){return window.jspdf&&window.jspdf.jsPDF;}
function pdfInvoice(id,tmpl){
  const i=DB.invoices.find(x=>x.id===id);if(!i)return;
  if(!jspdfReady()){toast(t('pdf_need_net'));return;}
  try{
    const {jsPDF}=window.jspdf;
    const doc=tmpl===3?new jsPDF({unit:'mm',format:[80,297]}):new jsPDF();
    const b=DB.business, W=doc.internal.pageSize.getWidth();
    const items=i.items.map((it,ix)=>[ix+1,it.desc||'—',String(it.qty),MONEY(it.price),MONEY(it.lineTotal)]);
    const head=['#','Description','Qty','Price','Total'];
    const foot=[[t('inv_subtotal'),'', '', '',MONEY(i.subtotal)],
      ...(i.discountAmt?[[t('inv_disc'),'', '', '', '− '+MONEY(i.discountAmt)]]:[]),
      ...(i.taxAmt?[[t('inv_tax'),'', '', '', MONEY(i.taxAmt)]]:[]),
      [t('inv_grand'),'','','',MONEY(i.total)],
      [t('inv_paid'),'','','',MONEY(i.paid)],
      [t('inv_balance'),'','','',MONEY(i.balance)]];
    if(tmpl===3){
      // Retail receipt — narrow
      let y=10;doc.setFontSize(12);doc.setFont('helvetica','bold');
      doc.text(b.name||'Jilan Invoice Maker',40,y,{align:'center'});y+=5;
      doc.setFontSize(8);doc.setFont('helvetica','normal');
      if(b.phone)doc.text(b.phone,40,y,{align:'center'}),y+=4;
      if(b.address)doc.text(b.address,40,y,{align:'center'}),y+=4;
      doc.text('--------------------------------',40,y,{align:'center'});y+=5;
      doc.text(`${t('receipt')}: ${i.no}`,8,y);y+=4;doc.text(`${t('inv_date')}: ${fmtDate(i.date)}`,8,y);y+=4;
      doc.text(`${t('inv_customer')}: ${custName(i.customerId)}`,8,y);y+=5;
      i.items.forEach(it=>{doc.text(`${it.desc||'—'}`,8,y);y+=4;doc.text(`${it.qty} x ${MONEY(it.price)} = ${MONEY(it.lineTotal)}`,12,y);y+=5;});
      doc.text('--------------------------------',40,y,{align:'center'});y+=5;
      doc.setFont('helvetica','bold');doc.text(`${t('inv_grand')}: ${MONEY(i.total)}`,8,y);y+=5;
      doc.text(`${t('inv_paid')}: ${MONEY(i.paid)}`,8,y);y+=4;doc.text(`${t('inv_balance')}: ${MONEY(i.balance)}`,8,y);y+=6;
      doc.setFont('helvetica','normal');doc.setFontSize(8);
      if(b.footer)doc.text(b.footer,40,y,{align:'center'});
      savePdfDoc(doc,i.no+'.pdf');return;
    }
    // Templates 1 & 2 header
    const accent=tmpl===1?[30,58,138]:[20,184,166];
    doc.setFillColor(...accent);doc.rect(0,0,W,34,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(20);doc.setFont('helvetica','bold');
    doc.text(b.name||'Jilan Invoice Maker',12,15);
    doc.setFontSize(10);doc.setFont('helvetica','normal');
    const bl=[b.owner,b.phone,b.email,b.address+(b.city?', '+b.city:'')].filter(Boolean);
    doc.text(bl.slice(0,2).join('  |  '),12,23);doc.text(bl.slice(2).join('  |  '),12,29);
    doc.setTextColor(0,0,0);
    let y=44;
    doc.setFontSize(14);doc.setFont('helvetica','bold');doc.text(t('inv_detail').toUpperCase()+' — '+i.no,12,y);y+=7;
    doc.setFontSize(10);doc.setFont('helvetica','normal');
    doc.text(`${t('inv_date')}: ${fmtDate(i.date)}`,12,y);doc.text(`${t('inv_customer')}: ${custName(i.customerId)}`,W/2,y);y+=6;
    if(i.dueDate)doc.text(`${t('inv_due')}: ${fmtDate(i.dueDate)}`,12,y),y+=6;
    doc.autoTable({startY:y,head:[head],body:items,foot:foot,theme:tmpl===1?'striped':'plain',
      headStyles:{fillColor:accent},footStyles:{fillColor:[241,245,249],textColor:[15,23,42],fontStyle:'bold'},
      styles:{fontSize:9},margin:{left:12,right:12}});
    y=doc.lastAutoTable.finalY+8;
    if(i.notes){doc.setFontSize(9);doc.text(t('inv_notes')+': '+i.notes,12,y,{maxWidth:W-24});y+=8;}
    if(i.terms||b.terms){doc.setFontSize(9);doc.text(t('inv_terms')+': '+(i.terms||b.terms),12,y,{maxWidth:W-24});y+=8;}
    if(b.footer){doc.setFontSize(8);doc.setTextColor(100);doc.text(b.footer,W/2,doc.internal.pageSize.getHeight()-10,{align:'center'});}
    savePdfDoc(doc,i.no+'.pdf');
  }catch(e){toast('PDF error: '+e.message);}
}
async function shareInvoice(id){
  const i=DB.invoices.find(x=>x.id===id);if(!i)return;
  if(!jspdfReady()){copySummary(id);return;}
  try{
    const {jsPDF}=window.jspdf;const doc=new jsPDF();
    doc.setFontSize(16);doc.text((DB.business.name||'Invoice')+' — '+i.no,12,20);
    doc.setFontSize(11);doc.text(`${t('inv_customer')}: ${custName(i.customerId)}`,12,30);
    doc.text(`${t('inv_grand')}: ${MONEY(i.total)}   ${t('inv_balance')}: ${MONEY(i.balance)}`,12,38);
    const blob=doc.output('blob');const file=new File([blob],i.no+'.pdf',{type:'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:i.no});toast(t('share_ok'));}
    else if(window.JilanBridge&&window.JilanBridge.saveFile){savePdfDoc(doc,i.no+'.pdf');toast(t('share_no'));}
    else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=i.no+'.pdf';a.click();toast(t('share_no'));}
  }catch(e){if(e.name!=='AbortError')toast('Share failed');}
}

/* ============ PRINT ============ */
function printInvoice(id){
  const i=DB.invoices.find(x=>x.id===id);if(!i)return;
  const b=DB.business;
  $('#printArea').innerHTML=`<div class="pinv">
    <h2>${esc(b.name||'Jilan Invoice Maker')}</h2>
    <p>${esc([b.phone,b.address,b.city].filter(Boolean).join(' · '))}</p><hr>
    <p><b>${t('inv_no')}:</b> ${esc(i.no)} &nbsp; <b>${t('inv_date')}:</b> ${fmtDate(i.date)}<br><b>${t('inv_customer')}:</b> ${esc(custName(i.customerId))}</p>
    <table><tr><th>#</th><th>${t('c_desc')}</th><th>${t('c_qty')}</th><th>${t('c_price')}</th><th>${t('c_total')}</th></tr>
    ${i.items.map((it,ix)=>`<tr><td>${ix+1}</td><td>${esc(it.desc||'—')}</td><td>${it.qty}</td><td>${MONEY(it.price)}</td><td>${MONEY(it.lineTotal)}</td></tr>`).join('')}</table>
    <p style="text-align:end"><b>${t('inv_subtotal')}:</b> ${MONEY(i.subtotal)}<br>
    ${i.discountAmt?`<b>${t('inv_disc')}:</b> −${MONEY(i.discountAmt)}<br>`:''}
    ${i.taxAmt?`<b>${t('inv_tax')}:</b> ${MONEY(i.taxAmt)}<br>`:''}
    <b>${t('inv_grand')}:</b> ${MONEY(i.total)}<br><b>${t('inv_paid')}:</b> ${MONEY(i.paid)}<br><b>${t('inv_balance')}:</b> ${MONEY(i.balance)}</p>
    ${b.footer?`<p><small>${esc(b.footer)}</small></p>`:''}
  </div>`;
  setTimeout(()=>window.print(),100);
}
function rPrint(){}

/* ============ CUSTOMERS ============ */
let custSearch='';
function rCustomers(){
  const el=$('#scr-customers');
  const list=DB.customers.filter(c=>!custSearch||(c.name+' '+(c.phone||'')).toLowerCase().includes(custSearch.toLowerCase()));
  el.innerHTML=`<div class="card"><div class="row between"><h3 style="margin:0">👥 ${t('cust_title')} (${DB.customers.length})</h3><button class="btn small" onclick="custModal()">${t('cust_add')}</button></div>
  <div class="searchbar"><input id="cQ" placeholder="${t('cust_search')}" value="${esc(custSearch)}"></div></div>
  ${list.map(c=>{const invs=DB.invoices.filter(i=>i.status!=='draft'&&i.customerId===c.id);const billed=invs.reduce((s,i)=>s+i.total,0),rec=invs.reduce((s,i)=>s+i.paid,0);
    return `<div class="listitem" onclick="custDetail('${c.id}')"><div><div class="t">${esc(c.name)}</div><div class="s">${esc(c.phone||'')}${c.email?' · '+esc(c.email):''}</div></div><div class="amt">${MONEY(billed-rec)}</div></div>`;}).join('')||'<div class="card empty"><div class="big">👥</div></div>'}`;
  const q=$('#cQ');q.addEventListener('input',()=>{custSearch=q.value;const p=q.selectionStart;rCustomers();const n=$('#cQ');n.focus();n.setSelectionRange(p,p);});
}
function custModal(id){
  const c=id?DB.customers.find(x=>x.id===id):{name:'',phone:'',email:'',address:'',notes:''};
  openModal(`<h3>👥 ${id?t('edit'):t('cust_add')}</h3>
  <label class="f">${t('f_name')} *</label><input id="mName" value="${esc(c.name)}">
  <div class="grid2"><div><label class="f">${t('f_phone')}</label><input id="mPhone" value="${esc(c.phone||'')}"></div>
  <div><label class="f">${t('f_email')}</label><input id="mEmail" value="${esc(c.email||'')}"></div></div>
  <label class="f">${t('f_address')}</label><input id="mAddr" value="${esc(c.address||'')}">
  <label class="f">${t('f_notes')}</label><textarea id="mNotes">${esc(c.notes||'')}</textarea>
  <div class="btnrow"><button class="btn teal" id="mGo">${t('save')}</button><button class="btn ghost" id="mX">${t('cancel')}</button></div>`);
  $('#mX').onclick=closeModal;
  $('#mGo').onclick=()=>{
    const name=$('#mName').value.trim();if(!name){toast(t('f_name')+' *');return;}
    const d={name,phone:$('#mPhone').value.trim(),email:$('#mEmail').value.trim(),address:$('#mAddr').value.trim(),notes:$('#mNotes').value.trim()};
    if(id){Object.assign(DB.customers.find(x=>x.id===id),d);}
    else{DB.customers.push(Object.assign({id:uid(),created:todayLocal()},d));}
    saveDB();closeModal();toast(t('toast_saved'));rCustomers();
  };
}
function custDetail(id){
  const c=DB.customers.find(x=>x.id===id);if(!c)return;
  const invs=DB.invoices.filter(i=>i.status!=='draft'&&i.customerId===id).sort((a,b)=>b.date.localeCompare(a.date));
  const billed=invs.reduce((s,i)=>s+i.total,0),rec=invs.reduce((s,i)=>s+i.paid,0);
  openModal(`<h3>👤 ${esc(c.name)}</h3>
  <div class="kv"><span class="k">${t('f_phone')}</span><span>${esc(c.phone||'—')}</span></div>
  <div class="kv"><span class="k">${t('f_email')}</span><span>${esc(c.email||'—')}</span></div>
  <div class="kv"><span class="k">${t('f_address')}</span><span>${esc(c.address||'—')}</span></div>
  <div class="kv"><span class="k">${t('cust_billed')}</span><b>${MONEY(billed)}</b></div>
  <div class="kv"><span class="k">${t('cust_received')}</span><b style="color:var(--ok)">${MONEY(rec)}</b></div>
  <div class="kv"><span class="k">${t('cust_balance')}</span><b style="color:var(--danger)">${MONEY(billed-rec)}</b></div>
  <h3 class="mt">${t('cust_hist')} (${invs.length})</h3>
  ${invs.map(invRow).join('')||'<p class="small">—</p>'}
  <div class="btnrow"><button class="btn ghost" onclick="closeModal();custModal('${id}')">✏️ ${t('edit')}</button><button class="btn danger" onclick="closeModal();delCustomer('${id}')">🗑 ${t('del')}</button><button class="btn ghost" onclick="closeModal()">${t('close')}</button></div>`);
}
function delCustomer(id){
  const linked=DB.invoices.some(i=>i.customerId===id);
  confirmBox(t('confirm_del')+(linked?' ⚠️ (has invoices — invoices will be kept)':''),()=>{
    DB.customers=DB.customers.filter(c=>c.id!==id);saveDB();toast(t('toast_deleted'));rCustomers();
  });
}

/* ============ PRODUCTS ============ */
let prodSearch='';
function rProducts(){
  const el=$('#scr-products');
  const list=DB.products.filter(p=>!prodSearch||(p.name+' '+(p.sku||'')).toLowerCase().includes(prodSearch.toLowerCase()));
  el.innerHTML=`<div class="card"><div class="row between"><h3 style="margin:0">📦 ${t('prod_title')} (${DB.products.length})</h3><button class="btn small" onclick="prodModal()">${t('prod_add')}</button></div>
  <div class="searchbar"><input id="pQ" placeholder="${t('prod_search')}" value="${esc(prodSearch)}"></div></div>
  ${list.map(p=>`<div class="listitem"><div><div class="t">${esc(p.name)}</div><div class="s">${esc(p.sku||'')}${p.desc?' · '+esc(p.desc):''}${p.stock!=null?' · stock: '+p.stock:''}</div></div><div class="row"><div class="amt">${MONEY(p.price)}</div><button class="btn small ghost" onclick="prodModal('${p.id}')">✏️</button></div></div>`).join('')||'<div class="card empty"><div class="big">📦</div></div>'}`;
  const q=$('#pQ');q.addEventListener('input',()=>{prodSearch=q.value;const ps=q.selectionStart;rProducts();const n=$('#pQ');n.focus();n.setSelectionRange(ps,ps);});
}
function prodModal(id){
  const p=id?DB.products.find(x=>x.id===id):{name:'',sku:'',desc:'',price:0,unit:'piece',cost:null,stock:null};
  openModal(`<h3>📦 ${id?t('edit'):t('prod_add')}</h3>
  <label class="f">${t('p_name')} *</label><input id="gName" value="${esc(p.name)}">
  <div class="grid2"><div><label class="f">${t('p_sku')}</label><input id="gSku" value="${esc(p.sku||'')}"></div>
  <div><label class="f">${t('p_unit')}</label><select id="gUnit">${['piece','hour','kg','service'].map(u=>`<option value="${u}" ${p.unit===u?'selected':''}>${t('u_'+u)}</option>`).join('')}</select></div></div>
  <label class="f">${t('p_desc')}</label><input id="gDesc" value="${esc(p.desc||'')}">
  <div class="grid2"><div><label class="f">${t('p_price')} *</label><input id="gPrice" type="number" min="0" step="0.01" value="${(p.price||0)/100}"></div>
  <div><label class="f">${t('p_cost')}</label><input id="gCost" type="number" min="0" step="0.01" value="${p.cost!=null?p.cost/100:''}"></div></div>
  <label class="f">${t('p_stock')}</label><input id="gStock" type="number" step="1" value="${p.stock!=null?p.stock:''}" placeholder="—">
  <div class="btnrow"><button class="btn teal" id="gGo">${t('save')}</button>${id?`<button class="btn danger" id="gDel">${t('del')}</button>`:''}<button class="btn ghost" id="gX">${t('cancel')}</button></div>`);
  $('#gX').onclick=closeModal;
  $('#gDel')&&($('#gDel').onclick=()=>{closeModal();confirmBox(t('confirm_del'),()=>{DB.products=DB.products.filter(x=>x.id!==id);saveDB();toast(t('toast_deleted'));rProducts();});});
  $('#gGo').onclick=()=>{
    const name=$('#gName').value.trim();if(!name){toast(t('p_name')+' *');return;}
    const price=P((Number($('#gPrice').value)||0)*100);if(price<0){toast(t('err_price'));return;}
    const costV=$('#gCost').value.trim();const stockV=$('#gStock').value.trim();
    const d={name,sku:$('#gSku').value.trim(),desc:$('#gDesc').value.trim(),price,unit:$('#gUnit').value,cost:costV===''?null:P(Number(costV)*100),stock:stockV===''?null:Math.max(0,Math.floor(Number(stockV)))};
    if(id){const old=DB.products.find(x=>x.id===id);const oldStock=old.stock;Object.assign(old,d);
      if(DB.settings.inventory&&oldStock!=null&&d.stock!=null&&d.stock!==oldStock)DB.stockMoves.push({id:uid(),productId:id,change:d.stock-oldStock,reason:'manual adjust',date:todayLocal()});}
    else{DB.products.push(Object.assign({id:uid(),created:todayLocal()},d));}
    saveDB();closeModal();toast(t('toast_saved'));rProducts();
  };
}

/* ============ MORE ============ */
function rMore(){
  $('#scr-more').innerHTML=`<div class="card"><h3>⋯ ${t('nav_more')}</h3>
  <div class="btnrow" style="flex-direction:column">
    <button class="btn ghost block" onclick="show('reports')">${t('more_reports')}</button>
    <button class="btn ghost block" onclick="show('inventory')">${t('more_inventory')}</button>
    <button class="btn ghost block" onclick="show('backup')">${t('more_backup')}</button>
    <button class="btn ghost block" onclick="show('profile')">${t('more_profile')}</button>
    <button class="btn ghost block" onclick="show('settings')">${t('more_settings')}</button>
  </div></div>
  <div class="card"><div class="small">${t('set_privacy_t')}</div></div>`;
}

/* ============ STOCK ============ */
function applyStock(inv,dir,reason){
  inv.items.forEach(it=>{
    if(!it.productId)return;const p=DB.products.find(x=>x.id===it.productId);
    if(!p||p.stock==null)return;
    const ch=Math.round(it.qty)*dir;
    p.stock=Math.max(0,p.stock+ch);
    DB.stockMoves.push({id:uid(),productId:p.id,change:ch,reason,date:todayLocal(),invoiceId:inv.id});
  });
}
function rInventory(){
  const el=$('#scr-inventory');
  el.innerHTML=`<div class="card"><div class="row between"><h3 style="margin:0">📦 ${t('inv_stock_title')}</h3><button class="btn small ghost" onclick="show('more')">← ${t('back')}</button></div>
  <label class="f"><input type="checkbox" id="invEn" ${DB.settings.inventory?'checked':''} style="width:auto"> ${t('more_inventory')} — enable auto stock deduction</label>
  <label class="f">${t('inv_low')} (qty)</label><input id="invLow" type="number" min="0" value="${DB.settings.lowStock}"></div>
  <div class="card">${DB.products.filter(p=>p.stock!=null).map(p=>`<div class="listitem"><div><div class="t">${esc(p.name)}</div><div class="s" style="color:${p.stock<=DB.settings.lowStock?'var(--danger)':'var(--muted)'}">${p.stock<=DB.settings.lowStock?'⚠️ '+t('inv_low')+': ':''}${p.stock}</div></div>
    <div class="row"><button class="btn small teal" onclick="stockAdj('${p.id}',1)">+</button><button class="btn small warn" onclick="stockAdj('${p.id}',-1)">−</button></div></div>`).join('')||'<p class="small">—</p>'}</div>
  <div class="card"><h3>${t('inv_move')}</h3>${DB.stockMoves.slice(-20).reverse().map(m=>{const p=DB.products.find(x=>x.id===m.productId);return `<div class="kv"><span class="k">${fmtDate(m.date)} · ${esc(p?p.name:'?')} · ${esc(m.reason)}</span><b style="color:${m.change>=0?'var(--ok)':'var(--danger)'}">${m.change>=0?'+':''}${m.change}</b></div>`;}).join('')||'<p class="small">—</p>'}</div>`;
  $('#invEn').onchange=e=>{DB.settings.inventory=e.target.checked;saveDB();toast(t('toast_saved'));};
  $('#invLow').onchange=e=>{DB.settings.lowStock=Math.max(0,Number(e.target.value)||0);saveDB();};
}
function stockAdj(pid,dir){
  const p=DB.products.find(x=>x.id===pid);if(!p||p.stock==null)return;
  const v=prompt((dir>0?t('inv_add_stock'):t('inv_sub_stock'))+' — '+p.name, '1');
  if(v==null)return;const n=Math.max(0,Math.floor(Number(v)||0));if(!n)return;
  p.stock=Math.max(0,p.stock+n*dir);
  DB.stockMoves.push({id:uid(),productId:pid,change:n*dir,reason:dir>0?'manual add':'manual remove',date:todayLocal()});
  saveDB();toast(t('toast_saved'));rInventory();
}

/* ============ REPORTS ============ */
let repFrom='',repTo='';
function rReports(){
  const td=todayLocal();
  if(!repFrom){repFrom=monthStart();repTo=td;}
  const el=$('#scr-reports');
  const invs=DB.invoices.filter(i=>i.status!=='draft'&&i.date>=repFrom&&i.date<=repTo);
  const invoiced=invs.reduce((s,i)=>s+i.total,0),received=invs.reduce((s,i)=>s+i.paid,0),outstd=invoiced-received;
  const disc=invs.reduce((s,i)=>s+i.discountAmt,0),tax=invs.reduce((s,i)=>s+i.taxAmt,0);
  const paidN=invs.filter(i=>invStatus(i)==='paid').length;
  // by customer
  const byCust={};invs.forEach(i=>{const k=i.customerId||'walkin';byCust[k]=byCust[k]||{total:0,paid:0,n:0};byCust[k].total+=i.total;byCust[k].paid+=i.paid;byCust[k].n++;});
  // outstanding by customer
  const outCust=Object.entries(byCust).map(([k,v])=>({name:k==='walkin'?t('walkin'):custName(k),bal:v.total-v.paid})).filter(x=>x.bal>0).sort((a,b)=>b.bal-a.bal);
  // best products
  const byProd={};invs.forEach(i=>i.items.forEach(it=>{const k=it.productId||('x:'+it.desc);byProd[k]=byProd[k]||{name:it.desc||'—',qty:0,val:0,cost:0};byProd[k].qty+=it.qty;byProd[k].val+=it.lineTotal;const p=DB.products.find(x=>x.id===it.productId);if(p&&p.cost!=null)byProd[k].cost+=Math.round(it.qty*p.cost);}));
  const best=Object.values(byProd).sort((a,b)=>b.val-a.val).slice(0,10);
  const profit=Object.values(byProd).reduce((s,p)=>s+(p.val-p.cost),0);
  const hasCost=Object.values(byProd).some(p=>p.cost>0);
  el.innerHTML=`<div class="card"><div class="row between"><h3 style="margin:0">📊 ${t('rep_title')}</h3><button class="btn small ghost" onclick="show('more')">← ${t('back')}</button></div>
  <div class="chipbar">
    <button class="chip" onclick="repFrom='${td}';repTo='${td}';rReports()">${t('rep_day')}</button>
    <button class="chip" onclick="repFrom='${weekStart()}';repTo='${td}';rReports()">${t('rep_week')}</button>
    <button class="chip" onclick="repFrom='${monthStart()}';repTo='${td}';rReports()">${t('rep_custom')==='اپنی مرضی'?'':' '}${t('rep_month')}</button>
  </div>
  <div class="grid2"><div><label class="f">${t('rep_from')}</label><input type="date" id="rF" value="${repFrom}"></div><div><label class="f">${t('rep_to')}</label><input type="date" id="rT" value="${repTo}"></div></div>
  <button class="btn small teal" onclick="repFrom=$('#rF').value;repTo=$('#rT').value;rReports()">${t('rep_apply')}</button>
  <button class="btn small ghost" onclick="repCSV()">⬇ ${t('rep_csv')}</button></div>
  <div class="card"><h3>${t('rep_sales')} (${fmtDate(repFrom)} → ${fmtDate(repTo)})</h3>
    <div class="kv"><span class="k">${t('rep_invoiced')}</span><b>${MONEY(invoiced)}</b></div>
    <div class="kv"><span class="k">${t('rep_received')}</span><b style="color:var(--ok)">${MONEY(received)}</b></div>
    <div class="kv"><span class="k">${t('rep_outstd')}</span><b style="color:var(--danger)">${MONEY(outstd)}</b></div>
    <div class="kv"><span class="k">${t('rep_count')}</span><b>${invs.length}</b></div>
    <div class="kv"><span class="k">${t('rep_paid_unpaid')}</span><b>${paidN} / ${invs.length-paidN}</b></div>
    <div class="kv"><span class="k">${t('rep_d_t')}</span><b>−${MONEY(disc)} / +${MONEY(tax)}</b></div>
    ${hasCost?`<div class="kv"><span class="k">${t('rep_profit')}</span><b>${MONEY(profit)}</b></div>`:''}
  </div>
  <div class="card"><h3>${t('rep_outstd_cust')}</h3>${outCust.map(o=>`<div class="kv"><span class="k">${esc(o.name)}</span><b style="color:var(--danger)">${MONEY(o.bal)}</b></div>`).join('')||'<p class="small">—</p>'}</div>
  <div class="card"><h3>${t('rep_best')}</h3><table class="data"><tr><th>#</th><th>${t('p_name')}</th><th class="num">${t('rep_by_qty')}</th><th class="num">${t('rep_value')}</th></tr>${best.map((b,ix)=>`<tr><td>${ix+1}</td><td>${esc(b.name)}</td><td class="num">${b.qty}</td><td class="num">${MONEY(b.val)}</td></tr>`).join('')||'<tr><td colspan=4>—</td></tr>'}</table></div>
  <div class="card"><h3>${t('rep_by_cust')}</h3>${Object.entries(byCust).map(([k,v])=>`<div class="kv"><span class="k">${esc(k==='walkin'?t('walkin'):custName(k))} (${v.n})</span><b>${MONEY(v.total)}</b></div>`).join('')||'<p class="small">—</p>'}</div>`;
}
function repCSV(){
  const invs=DB.invoices.filter(i=>i.status!=='draft'&&i.date>=repFrom&&i.date<=repTo);
  let csv='Invoice,Date,Customer,Subtotal,Discount,Tax,Total,Paid,Balance,Status\n';
  invs.forEach(i=>{csv+=`"${i.no}","${i.date}","${custName(i.customerId).replace(/"/g,'""')}",${(i.subtotal/100).toFixed(2)},${(i.discountAmt/100).toFixed(2)},${(i.taxAmt/100).toFixed(2)},${(i.total/100).toFixed(2)},${(i.paid/100).toFixed(2)},${(i.balance/100).toFixed(2)},${invStatus(i)}\n`;});
  dl(csv,'invoices-report.csv','text/csv');toast(t('toast_saved'));
}
function dl(content,name,type){
  // Native bridge (APK WebView) saves directly to Downloads
  try{
    if(window.JilanBridge&&window.JilanBridge.saveFile){
      const b64=btoa(unescape(encodeURIComponent(content)));
      const p=window.JilanBridge.saveFile(b64,name,type);
      toast(p?t('toast_saved')+' (Downloads)':t('toast_saved'));
      return;
    }
  }catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
function savePdfDoc(doc,name){
  try{
    if(window.JilanBridge&&window.JilanBridge.saveFile){
      const b64=doc.output('datauristring').split(',')[1];
      const p=window.JilanBridge.saveFile(b64,name,'application/pdf');
      toast(p?'PDF ✓ (Downloads)':'PDF ✓');
      return;
    }
  }catch(e){}
  doc.save(name);
}

/* ============ BACKUP ============ */
function rBackup(){
  $('#scr-backup').innerHTML=`<div class="card"><div class="row between"><h3 style="margin:0">💾 ${t('bk_title')}</h3><button class="btn small ghost" onclick="show('more')">← ${t('back')}</button></div>
  <p class="small">⚠️ ${t('bk_warn')}</p>
  <div class="kv"><span class="k">${t('stat_invoices')}</span><b>${DB.invoices.length}</b></div>
  <div class="kv"><span class="k">${t('nav_cust')}</span><b>${DB.customers.length}</b></div>
  <div class="kv"><span class="k">${t('nav_prod')}</span><b>${DB.products.length}</b></div>
  <div class="btnrow"><button class="btn teal" onclick="bkExport()">⬇ ${t('bk_export')}</button></div>
  <div class="btnrow"><label class="btn ghost" style="cursor:pointer">⬆ ${t('bk_import')}<input type="file" id="bkFile" accept=".json" class="hidden"></label></div></div>`;
  $('#bkFile').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{try{
      const d=JSON.parse(r.result);
      if(!d||!d.business||!Array.isArray(d.invoices)||!Array.isArray(d.customers))throw 0;
      confirmBox(t('bk_import')+'? '+t('set_reset_c'),()=>{DB=Object.assign(defaultDB(),d);saveDB();toast(t('bk_done'));show('home');});
    }catch(_){toast(t('bk_bad'));}};
    r.readAsText(f);
  });
}
function bkExport(){dl(JSON.stringify(DB,null,1),'jilan-invoice-backup-'+todayLocal()+'.json','application/json');toast(t('toast_saved'));}

/* ============ SETTINGS ============ */
function rSettings(){
  const el=$('#scr-settings');
  el.innerHTML=`<div class="card"><div class="row between"><h3 style="margin:0">⚙️ ${t('set_title')}</h3><button class="btn small ghost" onclick="show('more')">← ${t('back')}</button></div></div>
  <div class="card"><h3>${t('set_theme')}</h3><div class="chipbar">
    <button class="chip ${DB.settings.theme==='light'?'on':''}" onclick="setTheme('light')">☀️ ${t('set_light')}</button>
    <button class="chip ${DB.settings.theme==='dark'?'on':''}" onclick="setTheme('dark')">🌙 ${t('set_dark')}</button></div>
  <h3 class="mt">${t('set_lang')}</h3><div class="chipbar">
    <button class="chip ${DB.settings.lang==='en'?'on':''}" onclick="setLang('en')">${t('set_lang_en')}</button>
    <button class="chip ${DB.settings.lang==='ur'?'on':''}" onclick="setLang('ur')">${t('set_lang_ur')}</button></div></div>
  <div class="card"><h3>🔒 ${t('set_privacy')}</h3><p class="small">${t('set_privacy_t')}</p><p class="small">${t('bk_warn')}</p></div>
  <div class="card"><h3>ℹ️ ${t('set_about')}</h3><div class="kv"><span class="k">Jilan Invoice Maker</span><b>${t('set_version')}</b></div><div class="kv"><span class="k">Tagline</span><span>Simple Billing. Smarter Business.</span></div></div>
  <div class="card"><h3 style="color:var(--danger)">⚠️ ${t('set_reset')}</h3><p class="small">${t('set_reset_c')}</p><button class="btn danger" onclick="confirmBox(t('set_reset_c'),()=>{localStorage.removeItem(DBKEY);location.reload();})">${t('set_reset')}</button></div>`;
}
function setTheme(v){DB.settings.theme=v;saveDB();document.documentElement.classList.toggle('dark',v==='dark');$('#btnTheme').textContent=v==='dark'?'☀️':'🌙';rSettings();}
function setLang(v){DB.settings.lang=v;saveDB();document.documentElement.dir=v==='ur'?'rtl':'ltr';applyI18n();show(curScreen,false);}

/* ============ BUSINESS PROFILE ============ */
function rProfile(){
  const b=DB.business,el=$('#scr-profile');
  el.innerHTML=`<div class="card"><div class="row between"><h3 style="margin:0">🏪 ${t('prof_title')}</h3><button class="btn small ghost" onclick="show('more')">← ${t('back')}</button></div></div>
  <div class="card">
    <label class="f">${t('prof_name')} *</label><input id="bName" value="${esc(b.name)}">
    <div class="grid2"><div><label class="f">${t('prof_owner')}</label><input id="bOwner" value="${esc(b.owner)}"></div>
    <div><label class="f">${t('prof_phone')}</label><input id="bPhone" value="${esc(b.phone)}"></div></div>
    <label class="f">${t('prof_email')}</label><input id="bEmail" value="${esc(b.email)}">
    <label class="f">${t('prof_addr')}</label><input id="bAddr" value="${esc(b.address)}">
    <div class="grid2"><div><label class="f">${t('prof_city')}</label><input id="bCity" value="${esc(b.city)}"></div>
    <div><label class="f">${t('prof_taxreg')}</label><input id="bTaxReg" value="${esc(b.taxReg)}"></div></div>
    <label class="f">${t('prof_logo')}</label><input id="bLogo" type="file" accept="image/*">
    ${b.logo?`<img src="${b.logo}" style="max-height:80px;border-radius:8px">`:''}
    <div class="grid2"><div><label class="f">${t('prof_prefix')}</label><input id="bPrefix" value="${esc(b.prefix)}"></div>
    <div><label class="f">${t('prof_taxrate')}</label><input id="bTaxRate" type="number" min="0" step="0.01" value="${PCT_OUT(b.taxRate)}"></div></div>
    <label class="f">${t('prof_datefmt')}</label><select id="bDateFmt">${['DD-MM-YYYY','MM-DD-YYYY','YYYY-MM-DD'].map(f=>`<option ${b.dateFmt===f?'selected':''}>${f}</option>`).join('')}</select>
    <label class="f">${t('prof_terms')}</label><textarea id="bTerms">${esc(b.terms)}</textarea>
    <label class="f">${t('prof_footer')}</label><textarea id="bFooter">${esc(b.footer)}</textarea>
    <button class="btn teal block" onclick="saveProfile()">${t('save')}</button>
  </div>
  <div class="card"><p class="small">💡 ${DB.settings.lang==='ur'?'ٹیکس کی رقم آپ کی درج کردہ شرح سے شمار ہوتی ہے — یہ سرکاری ٹیکس کمپلائنس کا دعویٰ نہیں۔':'Tax is calculated from your entered rate — this is not a claim of official tax compliance.'}</p></div>`;
  $('#bLogo').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;const r=new FileReader();
    r.onload=()=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');const s=Math.min(1,200/img.width);c.width=img.width*s;c.height=img.height*s;c.getContext('2d').drawImage(img,0,0,c.width,c.height);DB.business.logo=c.toDataURL('image/png');saveDB();rProfile();toast(t('toast_saved'));};img.src=r.result;};
    r.readAsDataURL(f);
  });
}
function saveProfile(){
  const b=DB.business;
  b.name=$('#bName').value.trim();b.owner=$('#bOwner').value.trim();b.phone=$('#bPhone').value.trim();
  b.email=$('#bEmail').value.trim();b.address=$('#bAddr').value.trim();b.city=$('#bCity').value.trim();
  b.taxReg=$('#bTaxReg').value.trim();b.prefix=$('#bPrefix').value.trim()||'JIL-INV';
  b.taxRate=PCT_IN($('#bTaxRate').value||0);b.dateFmt=$('#bDateFmt').value;
  b.terms=$('#bTerms').value;b.footer=$('#bFooter').value;
  saveDB();toast(t('toast_saved'));show('more');
}

/* ============ INIT ============ */
function init(){
  loadDB();
  document.documentElement.classList.toggle('dark',DB.settings.theme==='dark');
  document.documentElement.dir=DB.settings.lang==='ur'?'rtl':'ltr';
  $('#btnTheme').textContent=DB.settings.theme==='dark'?'☀️':'🌙';
  $('#btnTheme').onclick=()=>setTheme(DB.settings.theme==='dark'?'light':'dark');
  $('#btnLang').onclick=()=>setLang(DB.settings.lang==='ur'?'en':'ur');
  $$('#bottomnav button').forEach(b=>b.onclick=()=>{navStack=['home'];show(b.dataset.nav);});
  applyI18n();
  show('home',false);
}
document.addEventListener('DOMContentLoaded',init);
