/* =====================================================================
   Jilan Karyana Store — DEMO web app (Pakistani grocery store)
   ---------------------------------------------------------------------
   HONEST DEMO: All data lives in the browser's localStorage only.
   No backend, no real payments, no real WhatsApp delivery.
   Admin password is stored as a SHA-256 hash (never plain text).
   ===================================================================== */
(function () {
'use strict';

/* ---------------- SHA-256 (pure JS, sync) ---------------- */
function sha256(str) {
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
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

/* SHA-256 hash of the demo admin password (never store the plain password). */
var ADMIN_PASS_HASH = '4d6a75a74a4b93e414eab6b0e284ae002d4825b3de72b1489d1bd800fc9adc96';
var ADMIN_USER = 'admin';

/* ---------------- localStorage keys ---------------- */
var LS = { products:'jks_products', orders:'jks_orders', expenses:'jks_expenses',
           settings:'jks_settings', lang:'jks_lang', cart:'jks_cart', admin:'jks_admin' };

/* ---------------- Categories (12) ---------------- */
var CATEGORIES = [
  { id:'atta',      en:'Atta & Flour',       ur:'آٹا اور میدہ',      color:'#c98a2b' },
  { id:'rice',      en:'Rice',               ur:'چاول',              color:'#4a9e6b' },
  { id:'daal',      en:'Daal & Lentils',     ur:'دالیں',             color:'#d4a017' },
  { id:'sugar',     en:'Sugar',              ur:'چینی',              color:'#8e9eab' },
  { id:'oil',       en:'Cooking Oil & Ghee', ur:'تیل اور گھی',       color:'#e0862a' },
  { id:'dairy',     en:'Milk & Dairy',       ur:'دودھ اور ڈیری',     color:'#5b9bd5' },
  { id:'tea',       en:'Tea',                ur:'چائے',              color:'#7b5e4f' },
  { id:'snacks',    en:'Biscuits & Snacks',  ur:'بسکٹ اور نمکو',     color:'#e05575' },
  { id:'drinks',    en:'Drinks',             ur:'مشروبات',           color:'#3fa7d6' },
  { id:'spices',    en:'Spices',             ur:'مصالحے',            color:'#b03a2e' },
  { id:'care',      en:'Personal Care',      ur:'ذاتی نگہداشت',      color:'#9b59b6' },
  { id:'household', en:'Household Items',    ur:'گھریلو اشیاء',      color:'#5d6d7e' }
];

/* ---------------- Seed products ----------------
   Row: [id, nameEN, nameUR, category, packSize, unit, salePrice, purchasePrice, stock, popular, deal]
   Prices are DEMO prices in PKR. */
var SEED = [
  ['atta-20','Fine Atta','فائن آٹا','atta','20 kg','kg',2850,2650,30,1,1],
  ['atta-10','Fine Atta','فائن آٹا','atta','10 kg','kg',1450,1350,45,1,0],
  ['atta-5','Fine Atta','فائن آٹا','atta','5 kg','kg',740,690,60,0,0],
  ['maida-2','Maida (Fine Flour)','میدہ','atta','2 kg','kg',260,225,40,0,0],
  ['sooji-1','Sooji (Semolina)','سوجی','atta','1 kg','kg',150,130,50,0,0],
  ['besan-1','Besan (Gram Flour)','بیسن','atta','1 kg','kg',240,210,35,0,0],
  ['rice-basmati-5','Basmati Rice','باسمتی چاول','rice','5 kg','kg',1950,1750,25,1,1],
  ['rice-sella-5','Sella Rice','سیلا چاول','rice','5 kg','kg',1650,1480,30,0,0],
  ['rice-broken-1','Broken Rice','ٹوٹا چاول','rice','1 kg','kg',220,190,50,0,0],
  ['rice-kernel-1','Super Kernel Basmati','سپر کرنل باسمتی','rice','1 kg','kg',420,380,28,0,0],
  ['daal-moong-1','Moong Daal','مونگ دال','daal','1 kg','kg',320,290,40,1,0],
  ['daal-masoor-1','Masoor Daal','مسور دال','daal','1 kg','kg',280,250,45,0,0],
  ['daal-chana-1','Chana Daal','چنا دال','daal','1 kg','kg',310,280,38,0,0],
  ['daal-mash-1','Mash Daal','ماش دال','daal','1 kg','kg',420,385,30,0,0],
  ['chana-kala-1','Kala Chana','کالا چنا','daal','1 kg','kg',260,230,42,0,0],
  ['sugar-5','Sugar','چینی','sugar','5 kg','kg',720,680,55,1,1],
  ['sugar-1','Sugar','چینی','sugar','1 kg','kg',150,140,80,0,0],
  ['gur-1','Gur (Jaggery)','گڑ','sugar','1 kg','kg',220,190,25,0,0],
  ['oil-5','Cooking Oil','کھانے کا تیل','oil','5 litre','litre',2450,2280,20,1,1],
  ['oil-1','Cooking Oil','کھانے کا تیل','oil','1 litre','litre',520,480,60,0,0],
  ['ghee-desi-1','Desi Ghee','دیسی گھی','oil','1 kg','kg',1850,1700,15,1,0],
  ['ghee-banas-5','Banaspati Ghee','بناسپتی گھی','oil','5 kg','kg',2100,1960,18,0,0],
  ['milk-1','Fresh Milk','تازہ دودھ','dairy','1 litre','litre',190,160,50,1,0],
  ['dahi-1','Dahi (Yogurt)','دہی','dairy','1 kg','kg',220,190,35,0,0],
  ['butter-200','Butter','مکھن','dairy','200 g','g',480,430,25,0,0],
  ['eggs-12','Eggs','انڈے','dairy','1 dozen','dozen',380,340,40,1,0],
  ['cheese-12','Cheese Slices','چیز سلائس','dairy','12 pcs','pack',450,400,20,0,0],
  ['tea-950','Black Tea','کالی چائے','tea','950 g','g',1650,1520,22,1,1],
  ['tea-475','Black Tea','کالی چائے','tea','475 g','g',850,780,35,0,0],
  ['tea-200','Black Tea','کالی چائے','tea','200 g','g',380,345,48,0,0],
  ['tea-green-100','Green Tea','سبز چائے','tea','100 g','g',320,280,25,0,0],
  ['bisc-glucose','Glucose Biscuits','گلوکوز بسکٹ','snacks','family pack','pack',180,155,70,1,0],
  ['bisc-choc','Chocolate Biscuits','چاکلیٹ بسکٹ','snacks','1 pack','pack',120,100,65,0,0],
  ['nimko-250','Nimko Mix','نمکو مکس','snacks','250 g','g',150,125,60,0,0],
  ['chips-6','Potato Chips','آلو کے چپس','snacks','pack of 6','pack',180,150,55,0,1],
  ['cake-400','Plain Tea Cake','سادہ کیک','snacks','400 g','g',250,215,30,0,0],
  ['cola-15','Cola','کولا','drinks','1.5 litre','bottle',220,195,48,1,0],
  ['juice-mango-1','Mango Juice','آم کا جوس','drinks','1 litre','bottle',260,225,40,0,0],
  ['milk-flav-250','Flavored Milk','فلیورڈ دودھ','drinks','250 ml','bottle',90,75,60,0,0],
  ['haldi-200','Haldi Powder','ہلدی پاؤڈر','spices','200 g','g',180,150,55,1,0],
  ['chili-200','Red Chili Powder','لال مرچ پاؤڈر','spices','200 g','g',240,205,50,0,0],
  ['garam-100','Garam Masala','گرم مصالحہ','spices','100 g','g',220,185,40,0,0],
  ['salt-1','Salt','نمک','spices','1 kg','kg',90,70,90,0,0],
  ['zeera-100','Zeera (Cumin)','زیرہ','spices','100 g','g',260,220,35,0,0],
  ['soap-bath','Bath Soap','نہانے کا صابن','care','1 pc','piece',120,100,80,1,0],
  ['shampoo-400','Shampoo','شیمپو','care','400 ml','bottle',650,570,30,0,1],
  ['toothpaste-150','Toothpaste','ٹوتھ پیسٹ','care','150 g','g',280,240,55,0,0],
  ['powder-100','Talcum Powder','ٹیلکم پاؤڈر','care','100 g','g',180,150,40,0,0],
  ['surf-1','Washing Powder','واشنگ پاؤڈر','household','1 kg','kg',520,470,45,1,1],
  ['dishsoap-1','Dishwashing Bar','برتن دھونے والا صابن','household','1 pc','piece',180,150,60,0,0],
  ['tissue-box','Tissue Box','ٹشو باکس','household','1 box','pack',250,210,50,0,0],
  ['phenyl-1','Phenyl','فینائل','household','1 litre','bottle',220,185,35,0,0]
];

function seedProducts() {
  return SEED.map(function (r) {
    return { id:r[0], en:r[1], ur:r[2], cat:r[3], pack:r[4], unit:r[5],
             price:r[6], cost:r[7], stock:r[8], popular:!!r[9], deal:!!r[10] };
  });
}

var DEFAULT_SETTINGS = {
  shopName: 'Jilan Karyana Store',
  deliveryFee: 100,
  freeAbove: 2000,
  minOrder: 200,
  hours: '9:00 AM – 10:00 PM',
  whatsapp: ''   /* configurable in Admin → Settings; empty = not configured */
};

/* ---------------- i18n ---------------- */
var STR = {
  demo_banner:      { en:'DEMO by Jilan Apps', ur:'DEMO — Jilan Apps' },
  nav_home:          { en:'Home', ur:'ہوم' },
  nav_categories:   { en:'Categories', ur:'کیٹیگریز' },
  nav_cart:          { en:'Cart', ur:'ٹوکری' },
  nav_orders:       { en:'Orders', ur:'آرڈرز' },
  nav_account:      { en:'Account', ur:'اکاؤنٹ' },
  search_ph:        { en:'Search products…', ur:'مصنوعات تلاش کریں…' },
  offers_title:     { en:"Today's Offers", ur:'آج کی آفرز' },
  offer1t:          { en:'10% OFF', ur:'10% رعایت' },
  offer1s:          { en:'Use promo code JILAN10 at checkout', ur:'چیک آؤٹ پر پرومو کوڈ JILAN10 استعمال کریں' },
  offer2t:          { en:'FREE Delivery', ur:'مفت ڈیلیوری' },
  offer2s:          { en:'On orders above Rs 2,000', ur:'Rs 2,000 سے زائد آرڈر پر' },
  offer3t:          { en:'Fresh Stock Daily', ur:'روزانہ تازہ اسٹاک' },
  offer3s:          { en:'Quality grocery at fair prices', ur:'مناسب قیمت پر معیاری کریانہ' },
  popular_title:    { en:'Popular Products', ur:'مقبول مصنوعات' },
  deals_title:      { en:"Today's Deals", ur:'آج کی ڈیلز' },
  view_all:         { en:'View All', ur:'سب دیکھیں' },
  shop_by_cat:      { en:'Shop by Category', ur:'کیٹیگری کے حساب سے خریدیں' },
  cat_title:        { en:'Categories', ur:'کیٹیگریز' },
  search_results:   { en:'Search Results', ur:'تلاش کے نتائج' },
  search_no:        { en:'No products found.', ur:'کوئی مصنوعات نہیں ملیں۔' },
  add_cart:         { en:'Add', ur:'شامل کریں' },
  in_stock:         { en:'In Stock', ur:'دستیاب' },
  low_stock:        { en:'Low Stock', ur:'کم اسٹاک' },
  out_stock:        { en:'Out of Stock', ur:'اسٹاک ختم' },
  items_count:      { en:'{n} items', ur:'{n} اشیاء' },
  open_hours:       { en:'Open: {h}', ur:'اوقات: {h}' },
  cart_title:       { en:'Your Cart', ur:'آپ کی ٹوکری' },
  cart_empty:       { en:'Your cart is empty', ur:'آپ کی ٹوکری خالی ہے' },
  cart_empty_sub:   { en:'Add some grocery items to get started.', ur:'شروع کرنے کے لیے کچھ اشیاء شامل کریں۔' },
  start_shopping:   { en:'Start Shopping', ur:'خریداری شروع کریں' },
  remove:           { en:'Remove', ur:'ہٹائیں' },
  subtotal:         { en:'Subtotal', ur:'ذیلی مجموعہ' },
  delivery_fee:     { en:'Delivery Fee', ur:'ڈیلیوری فیس' },
  free:             { en:'FREE', ur:'مفت' },
  discount:         { en:'Discount', ur:'رعایت' },
  promo_ph:         { en:'Promo code', ur:'پرومو کوڈ' },
  apply:            { en:'Apply', ur:'لاگو کریں' },
  promo_ok:         { en:'Promo applied: 10% off', ur:'پرومو لاگو: 10% رعایت' },
  promo_bad:        { en:'Invalid promo code', ur:'غلط پرومو کوڈ' },
  total:            { en:'Grand Total', ur:'کل رقم' },
  checkout_btn:     { en:'Checkout', ur:'چیک آؤٹ' },
  min_order_err:    { en:'Minimum order is Rs {min}', ur:'کم از کم آرڈر Rs {min} ہے' },
  co_title:         { en:'Checkout', ur:'چیک آؤٹ' },
  co_name:          { en:'Full Name', ur:'پورا نام' },
  co_name_ph:       { en:'e.g. Ahmed Khan', ur:'مثلاً احمد خان' },
  co_mobile:        { en:'Mobile Number', ur:'موبائل نمبر' },
  co_mobile_ph:     { en:'03XX-XXXXXXX', ur:'03XX-XXXXXXX' },
  co_address:       { en:'Delivery Address', ur:'ڈیلیوری کا پتہ' },
  co_address_ph:    { en:'House, street, area, city', ur:'مکان، گلی، علاقہ، شہر' },
  co_notes:         { en:'Delivery Instructions (optional)', ur:'ڈیلیوری ہدایات (اختیاری)' },
  co_notes_ph:      { en:'e.g. Call on arrival', ur:'مثلاً پہنچ کر کال کریں' },
  co_payment:       { en:'Payment Method', ur:'ادائیگی کا طریقہ' },
  pay_cod:          { en:'Cash on Delivery', ur:'ڈیلیوری پر نقد ادائیگی' },
  pay_shop:         { en:'Pay at Shop', ur:'دکان پر ادائیگی' },
  place_order:      { en:'Place Order', ur:'آرڈر کریں' },
  err_name:         { en:'Please enter your name.', ur:'براہ کرم اپنا نام لکھیں۔' },
  err_mobile:       { en:'Enter a valid mobile: 03XX-XXXXXXX', ur:'درست موبائل نمبر لکھیں: 03XX-XXXXXXX' },
  err_address:      { en:'Please enter your address.', ur:'براہ کرم اپنا پتہ لکھیں۔' },
  err_empty:        { en:'Your cart is empty.', ur:'آپ کی ٹوکری خالی ہے۔' },
  oc_title:         { en:'Order Confirmed!', ur:'آرڈر ہو گیا!' },
  oc_thanks:        { en:'Thank you! Your order has been placed.', ur:'شکریہ! آپ کا آرڈر موصول ہو گیا ہے۔' },
  oc_order_no:      { en:'Order Number', ur:'آرڈر نمبر' },
  oc_summary:       { en:'Order Summary', ur:'آرڈر کا خلاصہ' },
  oc_wa_btn:        { en:'Order on WhatsApp', ur:'واٹس ایپ پر آرڈر کریں' },
  oc_wa_note:       { en:'Tap to send your order details on WhatsApp.', ur:'واٹس ایپ پر آرڈر کی تفصیل بھیجنے کے لیے دبائیں۔' },
  oc_home:          { en:'Back to Home', ur:'ہوم پر واپس' },
  wa_setup:         { en:'WhatsApp number is not configured. Add the number in Admin → Settings.', ur:'واٹس ایپ نمبر سیٹ نہیں ہے۔ ایڈمن ← سیٹنگز میں نمبر شامل کریں۔' },
  tr_title:         { en:'Track Order', ur:'آرڈر ٹریک کریں' },
  tr_hint:          { en:'Enter your order number and the last 4 digits of the mobile number used at checkout.', ur:'اپنا آرڈر نمبر اور چیک آؤٹ پر استعمال شدہ موبائل کے آخری 4 ہندسے لکھیں۔' },
  tr_order_ph:      { en:'Order number (e.g. JKS-20261011-AB12)', ur:'آرڈر نمبر (مثلاً JKS-20261011-AB12)' },
  tr_last4_ph:      { en:'Last 4 digits of mobile', ur:'موبائل کے آخری 4 ہندسے' },
  tr_btn:           { en:'Track', ur:'ٹریک کریں' },
  tr_notfound:      { en:'Order not found. Check the order number and last 4 digits.', ur:'آرڈر نہیں ملا۔ آرڈر نمبر اور آخری 4 ہندسے چیک کریں۔' },
  tr_date:          { en:'Order Date', ur:'آرڈر کی تاریخ' },
  tr_payment:       { en:'Payment', ur:'ادائیگی' },
  tr_customer:      { en:'Customer', ur:'گاہک' },
  st_pending:       { en:'Pending', ur:'زیر التواء' },
  st_confirmed:     { en:'Confirmed', ur:'تصدیق شدہ' },
  st_preparing:     { en:'Preparing', ur:'تیار ہو رہا ہے' },
  st_out:           { en:'Out for Delivery', ur:'ڈیلیوری پر ہے' },
  st_delivered:     { en:'Delivered', ur:'ڈیلیور ہو گیا' },
  st_cancelled:     { en:'Cancelled', ur:'منسوخ' },
  ac_title:         { en:'Account', ur:'اکاؤنٹ' },
  ac_lang:          { en:'Language / زبان', ur:'زبان / Language' },
  ac_demo_t:        { en:'Demo Info', ur:'ڈیمو معلومات' },
  ac_demo_text:     { en:"This is a demo store. All data is stored in your browser's localStorage only — no backend, no real payments, no real WhatsApp delivery.", ur:'یہ ایک ڈیمو اسٹور ہے۔ تمام ڈیٹا صرف آپ کے براؤزر کے localStorage میں محفوظ ہے — کوئی بیک اینڈ نہیں، کوئی حقیقی ادائیگی نہیں، کوئی حقیقی واٹس ایپ ڈیلیوری نہیں۔' },
  ac_reset:         { en:'Reset Demo Data', ur:'ڈیمو ڈیٹا ری سیٹ کریں' },
  ac_reset_confirm: { en:'Reset all demo data? Products, orders, expenses and settings will be restored to defaults.', ur:'تمام ڈیمو ڈیٹا ری سیٹ کریں؟ مصنوعات، آرڈرز، اخراجات اور سیٹنگز ڈیفالٹ پر بحال ہو جائیں گی۔' },
  ac_reset_done:    { en:'Demo data has been reset.', ur:'ڈیمو ڈیٹا ری سیٹ ہو گیا ہے۔' },
  ac_admin:         { en:'Admin Login', ur:'ایڈمن لاگ اِن' },
  al_title:         { en:'Admin Login', ur:'ایڈمن لاگ اِن' },
  al_user:          { en:'Username', ur:'یوزر نیم' },
  al_pass:          { en:'Password', ur:'پاس ورڈ' },
  al_btn:           { en:'Login', ur:'لاگ اِن' },
  al_error:         { en:'Invalid username or password.', ur:'غلط یوزر نیم یا پاس ورڈ۔' },
  al_creds:         { en:'Demo credentials — Username: admin · Password: jilan123', ur:'ڈیمو لاگ اِن — یوزر نیم: admin · پاس ورڈ: jilan123' },
  al_note:          { en:'Password is stored as a SHA-256 hash, never as plain text.', ur:'پاس ورڈ SHA-256 ہیش کی صورت میں محفوظ ہے، سادہ متن میں کبھی نہیں۔' },
  ad_dashboard:     { en:'Dashboard', ur:'ڈیش بورڈ' },
  ad_products:      { en:'Products', ur:'مصنوعات' },
  ad_orders:        { en:'Orders', ur:'آرڈرز' },
  ad_expenses:      { en:'Expenses', ur:'اخراجات' },
  ad_reports:       { en:'Reports', ur:'رپورٹس' },
  ad_settings:      { en:'Settings', ur:'سیٹنگز' },
  ad_logout:        { en:'Logout', ur:'لاگ آؤٹ' },
  ad_demo_note:     { en:'Demo data — localStorage only, no backend', ur:'ڈیمو ڈیٹا — صرف localStorage، کوئی بیک اینڈ نہیں' },
  d_today:          { en:"Today's Sales", ur:'آج کی فروخت' },
  d_orders:         { en:'Total Orders', ur:'کل آرڈرز' },
  d_pending:        { en:'Pending Orders', ur:'زیر التواء آرڈرز' },
  d_products:       { en:'Total Products', ur:'کل مصنوعات' },
  d_low:            { en:'Low Stock (<10)', ur:'کم اسٹاک (<10)' },
  d_recent:         { en:'Recent Orders', ur:'حالیہ آرڈرز' },
  d_none:           { en:'No orders yet.', ur:'ابھی کوئی آرڈر نہیں۔' },
  p_add:            { en:'Add Product', ur:'مصنوعات شامل کریں' },
  p_edit:           { en:'Edit', ur:'ترمیم' },
  p_del:            { en:'Delete', ur:'حذف کریں' },
  p_name_en:        { en:'Name (English)', ur:'نام (انگریزی)' },
  p_name_ur:        { en:'Name (Urdu)', ur:'نام (اردو)' },
  p_cat:            { en:'Category', ur:'کیٹیگری' },
  p_unit:           { en:'Unit', ur:'یونٹ' },
  p_cost:           { en:'Purchase Price (Rs)', ur:'خرید قیمت (Rs)' },
  p_price:          { en:'Sale Price (Rs)', ur:'فروخت قیمت (Rs)' },
  p_stock:          { en:'Stock', ur:'اسٹاک' },
  p_popular:        { en:'Popular', ur:'مقبول' },
  p_deal:           { en:'Deal', ur:'ڈیل' },
  p_save:           { en:'Save', ur:'محفوظ کریں' },
  p_cancel:         { en:'Cancel', ur:'منسوخ کریں' },
  p_confirm_del:    { en:'Delete this product?', ur:'یہ مصنوعات حذف کریں؟' },
  p_cost_warn:      { en:'Warning: sale price is below purchase price.', ur:'تنبیہ: فروخت قیمت خرید قیمت سے کم ہے۔' },
  p_saved:          { en:'Product saved.', ur:'مصنوعات محفوظ ہو گئی۔' },
  p_deleted:        { en:'Product deleted.', ur:'مصنوعات حذف ہو گئی۔' },
  p_fill:           { en:'Please fill all required fields with valid values.', ur:'براہ کرم تمام ضروری خانے درست اقدار کے ساتھ پُر کریں۔' },
  p_pack:           { en:'Pack Size (e.g. 5 kg)', ur:'پیک سائز (مثلاً 5 کلو)' },
  unit_piece:       { en:'Piece', ur:'عدد' },
  unit_pack:        { en:'Packet', ur:'پیکٹ' },
  unit_bottle:      { en:'Bottle', ur:'بوتل' },
  unit_kg:          { en:'Kg', ur:'کلو' },
  unit_g:           { en:'Gram', ur:'گرام' },
  unit_litre:       { en:'Litre', ur:'لیٹر' },
  unit_dozen:       { en:'Dozen', ur:'درجن' },
  o_customer:       { en:'Customer', ur:'گاہک' },
  o_set_status:     { en:'Update Status', ur:'اسٹیٹس اپ ڈیٹ کریں' },
  o_stock_err:      { en:'Cannot confirm: not enough stock for {name} (available: {stock}, needed: {need}).', ur:'تصدیق نہیں ہو سکتی: {name} کا اسٹاک ناکافی ہے (دستیاب: {stock}، درکار: {need})۔' },
  o_updated:        { en:'Order status updated.', ur:'آرڈر اسٹیٹس اپ ڈیٹ ہو گیا۔' },
  o_empty:          { en:'No orders yet.', ur:'ابھی کوئی آرڈر نہیں۔' },
  o_stock_cut:      { en:'Stock deducted on confirm.', ur:'تصدیق پر اسٹاک کم کر دیا گیا۔' },
  e_add_t:          { en:'Add Expense', ur:'خرچ شامل کریں' },
  e_title:          { en:'Title', ur:'عنوان' },
  e_amount:         { en:'Amount (Rs)', ur:'رقم (Rs)' },
  e_date:           { en:'Date', ur:'تاریخ' },
  e_add:            { en:'Add', ur:'شامل کریں' },
  e_total:          { en:'Total Expenses', ur:'کل اخراجات' },
  e_empty:          { en:'No expenses recorded.', ur:'کوئی خرچ درج نہیں۔' },
  e_del_confirm:    { en:'Delete this expense?', ur:'یہ خرچ حذف کریں؟' },
  e_saved:          { en:'Expense added.', ur:'خرچ شامل ہو گیا۔' },
  r_sales:          { en:'Total Sales (Revenue)', ur:'کل فروخت (آمدنی)' },
  r_cogs:           { en:'Purchase Cost of Sold Items', ur:'فروخت شدہ اشیاء کی خرید لاگت' },
  r_expenses:       { en:'Total Expenses', ur:'کل اخراجات' },
  r_profit:         { en:'Estimated Profit', ur:'متوقع منافع' },
  r_note:           { en:'Profit = sales revenue − purchase cost of sold items − expenses. Cancelled orders are excluded.', ur:'منافع = فروخت کی آمدنی − فروخت شدہ اشیاء کی خرید لاگت − اخراجات۔ منسوخ آرڈرز شامل نہیں ہیں۔' },
  r_orders_n:       { en:'Orders Counted', ur:'شامل آرڈرز' },
  s_fee:            { en:'Delivery Fee (Rs)', ur:'ڈیلیوری فیس (Rs)' },
  s_free:           { en:'Free Delivery Above (Rs)', ur:'مفت ڈیلیوری کی حد (Rs)' },
  s_min:            { en:'Minimum Order (Rs)', ur:'کم از کم آرڈر (Rs)' },
  s_hours:          { en:'Opening Hours', ur:'کھلنے کے اوقات' },
  s_hours_ph:       { en:'e.g. 9:00 AM – 10:00 PM', ur:'مثلاً صبح 9 تا رات 10' },
  s_wa:             { en:'WhatsApp Number', ur:'واٹس ایپ نمبر' },
  s_wa_ph:          { en:'e.g. 923001234567 (no + or spaces)', ur:'مثلاً 923001234567 (+ یا اسپیس کے بغیر)' },
  s_shop:           { en:'Shop Name', ur:'دکان کا نام' },
  s_save:           { en:'Save Settings', ur:'سیٹنگز محفوظ کریں' },
  s_saved:          { en:'Settings saved.', ur:'سیٹنگز محفوظ ہو گئیں۔' },
  s_invalid:        { en:'Please enter valid numbers.', ur:'براہ کرم درست اعداد لکھیں۔' },
  yes:              { en:'Yes', ur:'جی ہاں' },
  no:               { en:'No', ur:'نہیں' },
  close:            { en:'Close', ur:'بند کریں' },
  qty:              { en:'Qty', ur:'تعداد' },
  lang_name:        { en:'English', ur:'اردو' },
  admin_panel:      { en:'Admin Panel', ur:'ایڈمن پینل' },
  added_toast:      { en:'Added to cart.', ur:'ٹوکری میں شامل ہو گیا۔' }
};

function t(key, lang) {
  var e = STR[key];
  if (!e) return key;
  var L = lang || curLang();
  return e[L] || e.en;
}
function tr(key, vars, lang) {
  var s = t(key, lang);
  if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

/* ---------------- small utils ---------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function fmtRs(n) { return 'Rs ' + Math.round(n).toLocaleString('en-US'); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function todayStr(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function orderDateStr(d) {
  d = d || new Date();
  return '' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
}

/* =====================================================================
   PURE BUSINESS LOGIC — no DOM, no localStorage. Fully unit-testable.
   ===================================================================== */

/* Cart math. lines: [{price, qty}]. settings: {deliveryFee, freeAbove}.
   Returns {subtotal, discount, delivery, total, promoCode, promoValid}. */
function calcCart(lines, settings, promoCode) {
  var subtotal = 0, i;
  for (i = 0; i < lines.length; i++) subtotal += lines[i].price * lines[i].qty;
  var promo = String(promoCode || '').trim().toUpperCase();
  var promoValid = promo === '' ? null : (promo === 'JILAN10');
  var discount = promoValid ? Math.round(subtotal * 0.10) : 0;
  var delivery = (lines.length === 0 || subtotal >= settings.freeAbove) ? 0 : settings.deliveryFee;
  return { subtotal: subtotal, discount: discount, delivery: delivery,
           total: subtotal - discount + delivery,
           promoCode: promo, promoValid: promoValid };
}

/* Validate a Pakistani mobile number. Accepts 03XXXXXXXXX with or without dashes/spaces.
   Returns {ok:true, mobile:'03XX-XXXXXXX'} or {ok:false, error:'err_mobile'}. */
function validateMobile(raw) {
  var d = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (/^03\d{9}$/.test(d)) return { ok: true, mobile: d.slice(0, 4) + '-' + d.slice(4) };
  return { ok: false, error: 'err_mobile' };
}

/* Unique order number: JKS-YYYYMMDD-XXXX */
function generateOrderNo(existingNos, now) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var date = orderDateStr(now), no = '', tries = 0, i;
  existingNos = existingNos || [];
  do {
    var s = '';
    for (i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    no = 'JKS-' + date + '-' + s;
    tries++;
  } while (existingNos.indexOf(no) >= 0 && tries < 100);
  return no;
}

/* Build an order from the cart. Validates everything first.
   o = {lines:[{pid,qty}], products, settings, promoCode,
        customer:{name,mobile,address,notes}, payment, now, existingNos}
   Returns {order} or {error, ...}. */
function buildOrder(o) {
  var byId = {}, i;
  for (i = 0; i < o.products.length; i++) byId[o.products[i].id] = o.products[i];
  var items = [];
  for (i = 0; i < o.lines.length; i++) {
    var l = o.lines[i], p = byId[l.pid];
    if (!p || !(l.qty > 0)) continue;
    items.push({ pid: p.id, nameEn: p.en, nameUr: p.ur, pack: p.pack, unit: p.unit,
                 qty: l.qty, price: p.price, cost: p.cost });
  }
  if (items.length === 0) return { error: 'err_empty' };
  var calc = calcCart(items, o.settings, o.promoCode);
  if (calc.subtotal < o.settings.minOrder) return { error: 'err_min', min: o.settings.minOrder };
  if (!String(o.customer.name || '').trim()) return { error: 'err_name' };
  var vm = validateMobile(o.customer.mobile);
  if (!vm.ok) return { error: vm.error };
  if (!String(o.customer.address || '').trim()) return { error: 'err_address' };
  var now = o.now || new Date();
  return { order: {
    id: 'o' + now.getTime().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    no: generateOrderNo(o.existingNos || [], now),
    items: items,
    subtotal: calc.subtotal, discount: calc.discount, delivery: calc.delivery, total: calc.total,
    promo: calc.promoValid ? 'JILAN10' : '',
    customer: { name: String(o.customer.name).trim(), mobile: vm.mobile,
                address: String(o.customer.address).trim(), notes: String(o.customer.notes || '').trim() },
    payment: o.payment === 'shop' ? 'shop' : 'cod',
    status: 'pending', stockDeducted: false,
    createdAt: now.toISOString()
  } };
}

/* Track an order: order number + last 4 digits of the checkout mobile. */
function findOrder(orders, orderNo, last4) {
  var no = String(orderNo || '').trim().toUpperCase();
  var l4 = String(last4 == null ? '' : last4).replace(/\D/g, '').slice(-4);
  if (!no || l4.length !== 4) return null;
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    if (String(o.no).toUpperCase() === no) {
      var digits = String(o.customer.mobile).replace(/\D/g, '').slice(-4);
      if (digits === l4) return o;
    }
  }
  return null;
}

/* Change an order's status.
   - Confirming (status -> 'confirmed') decrements stock; fails if any item lacks stock.
   - Cancelling an already-deducted order restocks the items.
   Returns {ok:true, order} or {error:'stock', name, stock, need} / {error:'not_found'}. */
function setOrderStatus(orders, products, orderId, newStatus) {
  var order = null, i, j;
  for (i = 0; i < orders.length; i++) if (orders[i].id === orderId) order = orders[i];
  if (!order) return { error: 'not_found' };
  if (order.status === newStatus) return { ok: true, order: order, unchanged: true };

  if (newStatus === 'confirmed' && !order.stockDeducted) {
    for (i = 0; i < order.items.length; i++) {
      var it = order.items[i], p = null;
      for (j = 0; j < products.length; j++) if (products[j].id === it.pid) p = products[j];
      var avail = p ? p.stock : 0;
      if (avail < it.qty) {
        return { error: 'stock', name: it.nameEn, stock: avail, need: it.qty };
      }
    }
    for (i = 0; i < order.items.length; i++) {
      var it2 = order.items[i];
      for (j = 0; j < products.length; j++)
        if (products[j].id === it2.pid) products[j].stock -= it2.qty;
    }
    order.stockDeducted = true;
  }
  if (newStatus === 'cancelled' && order.stockDeducted) {
    for (i = 0; i < order.items.length; i++) {
      var it3 = order.items[i];
      for (j = 0; j < products.length; j++)
        if (products[j].id === it3.pid) products[j].stock += it3.qty;
    }
    order.stockDeducted = false;
  }
  order.status = newStatus;
  return { ok: true, order: order };
}

/* Dashboard aggregates. */
function dashboardStats(orders, products, now) {
  var today = todayStr(now), sales = 0, pending = 0, i;
  for (i = 0; i < orders.length; i++) {
    var o = orders[i];
    if (o.status === 'pending') pending++;
    if (o.status !== 'cancelled' && String(o.createdAt).slice(0, 10) === today) sales += o.total;
  }
  var low = 0;
  for (i = 0; i < products.length; i++)
    if (products[i].stock > 0 && products[i].stock < 10) low++;
  return { todaySales: sales, totalOrders: orders.length, pendingOrders: pending,
           totalProducts: products.length, lowStock: low };
}

/* Reports: sales revenue, purchase cost of sold items, expenses, estimated profit. */
function reportTotals(orders, expenses) {
  var sales = 0, cogs = 0, count = 0, i, j;
  for (i = 0; i < orders.length; i++) {
    var o = orders[i];
    if (o.status === 'cancelled') continue;
    sales += o.total; count++;
    for (j = 0; j < o.items.length; j++) cogs += o.items[j].cost * o.items[j].qty;
  }
  var exp = 0;
  for (i = 0; i < expenses.length; i++) exp += Number(expenses[i].amount) || 0;
  return { sales: sales, cogs: cogs, expenses: exp, profit: sales - cogs - exp, count: count };
}

/* Build the wa.me order link. Returns null when the shop number is not configured. */
function whatsappLink(order, waNumber) {
  var num = String(waNumber == null ? '' : waNumber).replace(/\D/g, '');
  if (!num) return null;
  var L = ['*New Order ' + order.no + '*', ''];
  for (var i = 0; i < order.items.length; i++) {
    var it = order.items[i];
    L.push(it.qty + ' x ' + it.nameEn + ' (' + it.pack + ') — Rs ' + (it.price * it.qty).toLocaleString('en-US'));
  }
  L.push('');
  L.push('Subtotal: Rs ' + order.subtotal.toLocaleString('en-US'));
  if (order.discount > 0) L.push('Discount: -Rs ' + order.discount.toLocaleString('en-US'));
  L.push('Delivery: ' + (order.delivery === 0 ? 'FREE' : 'Rs ' + order.delivery.toLocaleString('en-US')));
  L.push('*Total: Rs ' + order.total.toLocaleString('en-US') + '*');
  L.push('');
  L.push('Name: ' + order.customer.name);
  L.push('Mobile: ' + order.customer.mobile);
  L.push('Address: ' + order.customer.address);
  if (order.customer.notes) L.push('Note: ' + order.customer.notes);
  L.push('Payment: ' + (order.payment === 'shop' ? 'Pay at Shop' : 'Cash on Delivery'));
  return 'https://wa.me/' + num + '?text=' + encodeURIComponent(L.join('\n'));
}

/* Admin credential check: compare SHA-256 hashes, never the plain password. */
function verifyAdmin(username, password) {
  return String(username) === ADMIN_USER && sha256(String(password)) === ADMIN_PASS_HASH;
}

/* =====================================================================
   PERSISTENCE (localStorage, jks_ prefix) + UI STATE
   ===================================================================== */
var HAS_DOM = (typeof document !== 'undefined' && typeof window !== 'undefined');
var HAS_LS = (function () { try { return typeof localStorage !== 'undefined' && !!localStorage.getItem; } catch (e) { return false; } })();
var _adminMem = false;

function lsGet(k, fb) { if (!HAS_LS) return fb; try { var v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }
function lsSet(k, v) { if (!HAS_LS) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function lsDel(k) { if (!HAS_LS) return; try { localStorage.removeItem(k); } catch (e) {} }
function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return _adminMem ? '1' : null; } }
function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { _adminMem = (v === '1'); } }
function ssDel(k) { try { sessionStorage.removeItem(k); } catch (e) { _adminMem = false; } }

function getProducts() { var p = lsGet(LS.products, null); if (!p || !p.length) { p = seedProducts(); lsSet(LS.products, p); } return p; }
function saveProducts(p) { lsSet(LS.products, p); }
function getOrders() { return lsGet(LS.orders, []); }
function saveOrders(o) { lsSet(LS.orders, o); }
function getExpenses() { return lsGet(LS.expenses, []); }
function saveExpenses(e) { lsSet(LS.expenses, e); }
function getSettings() {
  var s = lsGet(LS.settings, {}), d = {}, k;
  for (k in DEFAULT_SETTINGS) d[k] = DEFAULT_SETTINGS[k];
  for (k in s) d[k] = s[k];
  return d;
}
function saveSettings(s) { lsSet(LS.settings, s); }
function curLang() { var l = lsGet(LS.lang, 'en'); return l === 'ur' ? 'ur' : 'en'; }
function setLangPref(l) { lsSet(LS.lang, l); }
function getCart() { return lsGet(LS.cart, []); }
function saveCart(c) { lsSet(LS.cart, c); }
function isAdmin() { return ssGet(LS.admin) === '1'; }
function setAdmin(v) { if (v) ssSet(LS.admin, '1'); else ssDel(LS.admin); }
function resetDemoData() {
  var k; for (k in LS) lsDel(LS[k]);
  ssDel(LS.admin);
  lsSet(LS.products, seedProducts());
}

/* ---------------- UI state ---------------- */
var S = {
  lang: 'en', view: 'home', cat: null, search: '', promo: '', promoMsg: null,
  cart: [], adminTab: 'dashboard', lastOrder: null, tracked: null, trackErr: false,
  co: { name: '', mobile: '', address: '', notes: '', payment: 'cod' }, coErr: null, coMin: 0,
  loginErr: false, editingProduct: null, prodWarn: false
};
var PRODUCTS = [];   /* in-memory product cache */
var SETTINGS = null;

/* ---------------- SVG icons (no emoji) ---------------- */
var ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M2 3h3l2.6 12.5a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20.5 8H6"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
  search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  wa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.3.2.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.2 1.1z"/></svg>',
  check: '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#1a7a3c" stroke-width="3"><path d="M4 12.5 9.5 18 20 6.5"/></svg>',
  lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
};

/* ---------------- render helpers ---------------- */
function catOf(id) {
  for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
  return { id: id, en: id, ur: id, color: '#888' };
}
function pname(p) { return S.lang === 'ur' ? p.ur : p.en; }
function cartCount() { var n = 0, i; for (i = 0; i < S.cart.length; i++) n += S.cart[i].qty; return n; }
function cartLines() {
  var byId = {}, i;
  for (i = 0; i < PRODUCTS.length; i++) byId[PRODUCTS[i].id] = PRODUCTS[i];
  var out = [];
  for (i = 0; i < S.cart.length; i++) {
    var p = byId[S.cart[i].pid];
    if (p) out.push({ pid: p.id, qty: S.cart[i].qty, price: p.price, name: pname(p), pack: p.pack, cat: p.cat });
  }
  return out;
}
function stockBadge(p) {
  if (p.stock <= 0) return '<span class="stock-badge stock-out">' + t('out_stock') + '</span>';
  if (p.stock < 10) return '<span class="stock-badge stock-low">' + t('low_stock') + '</span>';
  return '<span class="stock-badge stock-in">' + t('in_stock') + '</span>';
}
function prodCard(p) {
  var c = catOf(p.cat);
  var letter = esc(pname(p).trim().charAt(0) || '•');
  var deal = p.deal ? '<span class="deal-ribbon">DEAL</span>' : '';
  var dis = p.stock <= 0 ? ' disabled' : '';
  return '<div class="prod-card">' +
    '<div class="prod-tile" style="background:' + c.color + '">' + deal +
    '<span class="letter">' + letter + '</span></div>' +
    '<div class="prod-body">' +
    '<div class="prod-name">' + esc(pname(p)) + '</div>' +
    '<div class="prod-pack">' + esc(p.pack) + '</div>' +
    '<div class="prod-price">' + fmtRs(p.price) + '</div>' +
    stockBadge(p) +
    '<button class="add-btn" data-action="add" data-id="' + esc(p.id) + '"' + dis + '>' + t('add_cart') + '</button>' +
    '</div></div>';
}
function orderItemsHTML(order) {
  var h = '<ul class="order-items" style="list-style:none;padding:0;margin:8px 0">';
  for (var i = 0; i < order.items.length; i++) {
    var it = order.items[i];
    h += '<li>' + it.qty + ' × ' + esc(S.lang === 'ur' ? it.nameUr : it.nameEn) +
         ' (' + esc(it.pack) + ') — <b>' + fmtRs(it.price * it.qty) + '</b></li>';
  }
  return h + '</ul>';
}
function statusPill(st) {
  return '<span class="status-pill st-' + st + '">' + t('st_' + st) + '</span>';
}
function toast(msg) {
  if (!HAS_DOM) return;
  var d = document.createElement('div');
  d.className = 'toast'; d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2600);
}
function openModal(html) {
  closeModal();
  var back = document.createElement('div');
  back.className = 'modal-back'; back.id = 'modal-back';
  back.innerHTML = '<div class="modal">' + html + '</div>';
  back.addEventListener('click', function (e) { if (e.target === back) closeModal(); });
  document.body.appendChild(back);
}
function closeModal() {
  var m = document.getElementById('modal-back');
  if (m && m.parentNode) m.parentNode.removeChild(m);
}

/* ---------------- views ---------------- */
function vHome() {
  var i, h = '';
  h += '<div class="search-wrap"><input id="search" type="search" placeholder="' + esc(t('search_ph')) +
       '" value="' + esc(S.search) + '" autocomplete="off"><span class="search-icon">' + ICONS.search + '</span></div>';
  h += '<div id="home-dynamic">' + homeDynamic() + '</div>';
  return h;
}
function homeDynamic() {
  var i, h = '';
  if (S.search.trim()) {
    var q = S.search.trim().toLowerCase();
    var res = PRODUCTS.filter(function (p) {
      return p.en.toLowerCase().indexOf(q) >= 0 || p.ur.indexOf(S.search.trim()) >= 0 ||
             p.pack.toLowerCase().indexOf(q) >= 0 || catOf(p.cat).en.toLowerCase().indexOf(q) >= 0;
    });
    h += '<div class="section-title">' + t('search_results') + ' (' + res.length + ')</div>';
    h += res.length ? '<div class="prod-grid">' + res.map(prodCard).join('') + '</div>'
                    : '<div class="card">' + t('search_no') + '</div>';
    return h;
  }
  h += '<div class="section-title">' + t('offers_title') + '</div><div class="offers">' +
    '<div class="offer-card offer-1"><h3>' + t('offer1t') + '</h3><p>' + t('offer1s') + '</p></div>' +
    '<div class="offer-card offer-2"><h3>' + t('offer2t') + '</h3><p>' + t('offer2s') + '</p></div>' +
    '<div class="offer-card offer-3"><h3>' + t('offer3t') + '</h3><p>' + t('offer3s') + '</p></div></div>';
  h += '<div class="section-title">' + t('shop_by_cat') +
       ' <button class="link-btn" data-action="nav" data-view="categories">' + t('view_all') + '</button></div>';
  h += '<div class="cat-grid" style="grid-template-columns:repeat(3,1fr)">' +
       CATEGORIES.slice(0, 6).map(catCard).join('') + '</div>';
  var pop = PRODUCTS.filter(function (p) { return p.popular; });
  h += '<div class="section-title">' + t('popular_title') +
       ' <button class="link-btn" data-action="nav" data-view="categories">' + t('view_all') + '</button></div>';
  h += '<div class="prod-scroll">' + pop.map(prodCard).join('') + '</div>';
  var deals = PRODUCTS.filter(function (p) { return p.deal; });
  if (deals.length) {
    h += '<div class="section-title">' + t('deals_title') +
         ' <button class="link-btn" data-action="nav" data-view="deals">' + t('view_all') + '</button></div>';
    h += '<div class="prod-grid">' + deals.map(prodCard).join('') + '</div>';
  }
  return h;
}
function catCard(c) {
  var n = PRODUCTS.filter(function (p) { return p.cat === c.id; }).length;
  var nm = S.lang === 'ur' ? c.ur : c.en;
  return '<div class="cat-card" data-action="cat" data-id="' + c.id + '">' +
    '<div class="cat-dot" style="background:' + c.color + '">' + esc(nm.trim().charAt(0)) + '</div>' +
    '<div class="cat-name">' + esc(nm) + '</div>' +
    '<div class="cat-count">' + tr('items_count', { n: n }) + '</div></div>';
}
function vCategories() {
  return '<div class="section-title" style="margin-top:6px">' + t('cat_title') + '</div>' +
         '<div class="cat-grid">' + CATEGORIES.map(catCard).join('') + '</div>';
}
function vCategory() {
  var c = catOf(S.cat);
  var list = PRODUCTS.filter(function (p) { return p.cat === S.cat; });
  var nm = S.lang === 'ur' ? c.ur : c.en;
  return '<div class="section-title" style="margin-top:6px">' + esc(nm) + ' (' + list.length + ')</div>' +
         (list.length ? '<div class="prod-grid">' + list.map(prodCard).join('') + '</div>'
                      : '<div class="card">' + t('search_no') + '</div>');
}
function vDeals() {
  var list = PRODUCTS.filter(function (p) { return p.deal; });
  return '<div class="section-title" style="margin-top:6px">' + t('deals_title') + ' (' + list.length + ')</div>' +
         '<div class="prod-grid">' + list.map(prodCard).join('') + '</div>';
}

function vCart() {
  var lines = cartLines();
  var h = '<div class="section-title" style="margin-top:6px">' + t('cart_title') + '</div>';
  if (!lines.length) {
    return h + '<div class="card"><div class="empty-state"><div class="big">' + t('cart_empty') + '</div>' +
      '<div>' + t('cart_empty_sub') + '</div><br><button class="btn btn-primary" data-action="nav" data-view="home">' +
      t('start_shopping') + '</button></div></div>';
  }
  h += '<div class="card">';
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i], c = catOf(l.cat);
    h += '<div class="cart-line">' +
      '<div class="cart-tile" style="background:' + c.color + '">' + esc(l.name.trim().charAt(0)) + '</div>' +
      '<div class="cart-info"><div class="n">' + esc(l.name) + '</div>' +
      '<div class="p">' + esc(l.pack) + ' · ' + fmtRs(l.price) + '</div>' +
      '<button class="rm-btn" data-action="rm" data-id="' + esc(l.pid) + '">' + t('remove') + '</button></div>' +
      '<div class="qty-ctl"><button data-action="dec" data-id="' + esc(l.pid) + '">−</button>' +
      '<span class="q">' + l.qty + '</span>' +
      '<button data-action="inc" data-id="' + esc(l.pid) + '">+</button></div></div>';
  }
  h += '</div>';
  var calc = calcCart(lines, SETTINGS, S.promo);
  h += '<div class="card" style="margin-top:12px"><div class="promo-row">' +
    '<input id="promo" placeholder="' + esc(t('promo_ph')) + '" value="' + esc(S.promo) + '">' +
    '<button class="mini-btn" style="border-color:var(--green);color:var(--green-dark)" data-action="promo">' + t('apply') + '</button></div>';
  if (S.promoMsg) h += '<div class="msg ' + (calc.promoValid ? 'ok' : 'err') + '">' + esc(S.promoMsg) + '</div>';
  h += '<div class="totals">' +
    totRow(t('subtotal'), fmtRs(calc.subtotal)) +
    totRow(t('delivery_fee'), calc.delivery === 0 ? t('free') : fmtRs(calc.delivery)) +
    (calc.discount > 0 ? totRow(t('discount') + ' (JILAN10)', '−' + fmtRs(calc.discount), 'neg') : '') +
    '<div class="t-row grand"><span>' + t('total') + '</span><span>' + fmtRs(calc.total) + '</span></div></div>';
  if (calc.subtotal < SETTINGS.minOrder)
    h += '<div class="msg err">' + tr('min_order_err', { min: SETTINGS.minOrder.toLocaleString('en-US') }) + '</div>';
  h += '<br><button class="btn btn-primary" data-action="go-checkout">' + t('checkout_btn') + '</button></div>';
  return h;
}
function totRow(l, v, cls) {
  return '<div class="t-row"><span>' + l + '</span><span class="' + (cls || '') + '">' + v + '</span></div>';
}
function vCheckout() {
  var lines = cartLines();
  if (!lines.length) return '<div class="section-title" style="margin-top:6px">' + t('co_title') + '</div>' +
    '<div class="card"><div class="msg err">' + t('err_empty') + '</div></div>';
  var calc = calcCart(lines, SETTINGS, S.promo);
  var h = '<div class="section-title" style="margin-top:6px">' + t('co_title') + '</div><div class="card">';
  if (S.coErr) h += '<div class="msg err">' + esc(S.coErr) + '</div>';
  h += field('co_name', t('co_name'), '<input id="f-name" placeholder="' + esc(t('co_name_ph')) + '" value="' + esc(S.co.name) + '">') +
       field('co_mobile', t('co_mobile'), '<input id="f-mobile" inputmode="tel" placeholder="' + esc(t('co_mobile_ph')) + '" value="' + esc(S.co.mobile) + '">') +
       field('co_address', t('co_address'), '<textarea id="f-address" rows="2" placeholder="' + esc(t('co_address_ph')) + '">' + esc(S.co.address) + '</textarea>') +
       field('co_notes', t('co_notes'), '<input id="f-notes" placeholder="' + esc(t('co_notes_ph')) + '" value="' + esc(S.co.notes) + '">');
  h += '<div class="field"><label>' + t('co_payment') + '</label>' +
    '<label class="radio-card"><input type="radio" name="pay" value="cod"' + (S.co.payment !== 'shop' ? ' checked' : '') + '> ' + t('pay_cod') + '</label>' +
    '<label class="radio-card"><input type="radio" name="pay" value="shop"' + (S.co.payment === 'shop' ? ' checked' : '') + '> ' + t('pay_shop') + '</label></div>';
  h += '<div class="totals">' + totRow(t('subtotal'), fmtRs(calc.subtotal)) +
       totRow(t('delivery_fee'), calc.delivery === 0 ? t('free') : fmtRs(calc.delivery)) +
       (calc.discount > 0 ? totRow(t('discount'), '−' + fmtRs(calc.discount), 'neg') : '') +
       '<div class="t-row grand"><span>' + t('total') + '</span><span>' + fmtRs(calc.total) + '</span></div></div>';
  h += '<br><button class="btn btn-primary" data-action="place-order">' + t('place_order') + '</button></div>';
  return h;
}
function field(lbl, label, inner) {
  return '<div class="field"><label for="' + lbl + '">' + label + '</label>' + inner + '</div>';
}
function vConfirm() {
  var o = S.lastOrder;
  if (!o) return vHome();
  var h = '<div class="card" style="margin-top:14px;text-align:center">' +
    '<div class="check-big">' + ICONS.check + '</div>' +
    '<h2 style="color:var(--green-dark);margin:4px 0">' + t('oc_title') + '</h2>' +
    '<div style="color:var(--muted)">' + t('oc_thanks') + '</div>' +
    '<div class="order-no-box" style="text-align:center"><div class="lbl">' + t('oc_order_no') + '</div>' +
    '<div class="no">' + esc(o.no) + '</div></div></div>';
  h += '<div class="card" style="margin-top:12px"><div class="section-title" style="margin-top:0">' + t('oc_summary') + '</div>' +
    orderItemsHTML(o) +
    '<div class="totals">' + totRow(t('subtotal'), fmtRs(o.subtotal)) +
    (o.discount > 0 ? totRow(t('discount'), '−' + fmtRs(o.discount), 'neg') : '') +
    totRow(t('delivery_fee'), o.delivery === 0 ? t('free') : fmtRs(o.delivery)) +
    '<div class="t-row grand"><span>' + t('total') + '</span><span>' + fmtRs(o.total) + '</span></div></div></div>';
  h += '<div class="card" style="margin-top:12px"><div style="color:var(--muted);font-size:14px;margin-bottom:10px">' +
       t('oc_wa_note') + '</div>' +
       '<button class="btn btn-wa" data-action="wa-order">' + ICONS.wa + ' ' + t('oc_wa_btn') + '</button>' +
       '<button class="btn btn-secondary" data-action="nav" data-view="home">' + t('oc_home') + '</button></div>';
  return h;
}
function vOrders() {
  var h = '<div class="section-title" style="margin-top:6px">' + t('tr_title') + '</div><div class="card">';
  h += '<div style="color:var(--muted);font-size:14px;margin-bottom:10px">' + t('tr_hint') + '</div>';
  h += field('tr-no', t('tr_order_ph'), '<input id="tr-no" placeholder="' + esc(t('tr_order_ph')) + '">') +
       field('tr-l4', t('tr_last4_ph'), '<input id="tr-l4" inputmode="numeric" maxlength="4" placeholder="••••">');
  h += '<button class="btn btn-primary" data-action="track">' + t('tr_btn') + '</button></div>';
  if (S.trackErr) h += '<div class="card" style="margin-top:12px"><div class="msg err">' + t('tr_notfound') + '</div></div>';
  if (S.tracked) {
    var o = S.tracked;
    h += '<div class="card order-card" style="margin-top:12px"><div class="order-head">' +
      '<span class="order-no">' + esc(o.no) + '</span>' + statusPill(o.status) + '</div>' +
      '<div class="order-meta">' + t('tr_date') + ': ' + esc(new Date(o.createdAt).toLocaleString()) + '<br>' +
      t('tr_payment') + ': ' + (o.payment === 'shop' ? t('pay_shop') : t('pay_cod')) + '</div>' +
      orderItemsHTML(o) +
      '<div class="totals">' + totRow(t('subtotal'), fmtRs(o.subtotal)) +
      (o.discount > 0 ? totRow(t('discount'), '−' + fmtRs(o.discount), 'neg') : '') +
      totRow(t('delivery_fee'), o.delivery === 0 ? t('free') : fmtRs(o.delivery)) +
      '<div class="t-row grand"><span>' + t('total') + '</span><span>' + fmtRs(o.total) + '</span></div></div></div>';
  }
  return h;
}
function vAccount() {
  var h = '<div class="section-title" style="margin-top:6px">' + t('ac_title') + '</div>';
  h += '<div class="card"><div class="field"><label>' + t('ac_lang') + '</label>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="mini-btn" style="flex:1;' + (S.lang === 'en' ? 'border-color:var(--green);color:var(--green-dark);' : '') + '" data-action="lang" data-l="en">English</button>' +
    '<button class="mini-btn" style="flex:1;' + (S.lang === 'ur' ? 'border-color:var(--green);color:var(--green-dark);' : '') + '" data-action="lang" data-l="ur">اردو</button>' +
    '</div></div></div>';
  h += '<div class="card" style="margin-top:12px"><h3 style="margin-top:0">' + t('ac_demo_t') + '</h3>' +
    '<div style="color:var(--muted);font-size:14.5px">' + t('ac_demo_text') + '</div>' +
    '<br><button class="btn btn-danger" data-action="reset-demo">' + t('ac_reset') + '</button></div>';
  h += '<div class="card" style="margin-top:12px"><button class="btn btn-secondary" data-action="admin-open">' +
    ICONS.lock + ' ' + t('ac_admin') + '</button></div>';
  return h;
}
function vAdminLogin() {
  var h = '<div class="card login-card"><h2 style="margin-top:0">' + t('al_title') + '</h2>';
  if (S.loginErr) h += '<div class="msg err">' + t('al_error') + '</div>';
  h += field('al-user', t('al_user'), '<input id="al-user" autocomplete="username" value="admin">') +
       field('al-pass', t('al_pass'), '<input id="al-pass" type="password" autocomplete="current-password">') +
       '<button class="btn btn-primary" data-action="admin-login">' + t('al_btn') + '</button>';
  h += '<div class="creds-box"><b>' + t('al_creds') + '</b><br><span style="color:var(--muted);font-size:13px">' + t('al_note') + '</span></div></div>';
  return h;
}

/* ---------------- admin views ---------------- */
function vAdmin() {
  var tabs = [['dashboard', 'ad_dashboard'], ['products', 'ad_products'], ['orders', 'ad_orders'],
              ['expenses', 'ad_expenses'], ['reports', 'ad_reports'], ['settings', 'ad_settings']];
  var h = '<div class="section-title" style="margin-top:6px">' + t('admin_panel') +
          ' <button class="link-btn" data-action="admin-logout">' + t('ad_logout') + '</button></div>';
  h += '<div class="demo-note">' + t('ad_demo_note') + '</div>';
  h += '<div class="admin-tabs">' + tabs.map(function (tb) {
    return '<button data-action="admin-tab" data-tab="' + tb[0] + '"' +
           (S.adminTab === tb[0] ? ' class="active"' : '') + '>' + t(tb[1]) + '</button>';
  }).join('') + '</div>';
  h += '<div id="admin-body">' + adminBody() + '</div>';
  return h;
}
function adminBody() {
  if (S.adminTab === 'products') return adProducts();
  if (S.adminTab === 'orders') return adOrders();
  if (S.adminTab === 'expenses') return adExpenses();
  if (S.adminTab === 'reports') return adReports();
  if (S.adminTab === 'settings') return adSettings();
  return adDashboard();
}
function adDashboard() {
  var st = dashboardStats(getOrders(), PRODUCTS);
  var h = '<div class="stat-grid">' +
    stat(fmtRs(st.todaySales), t('d_today')) + stat(st.totalOrders, t('d_orders')) +
    stat(st.pendingOrders, t('d_pending')) + stat(st.totalProducts, t('d_products')) +
    stat(st.lowStock, t('d_low')) + '</div>';
  var orders = getOrders().slice().reverse().slice(0, 5);
  h += '<div class="section-title">' + t('d_recent') + '</div>';
  if (!orders.length) return h + '<div class="card">' + t('d_none') + '</div>';
  h += '<div class="card">' + orders.map(function (o) {
    return '<div class="admin-row"><div class="grow"><b>' + esc(o.no) + '</b><br>' +
      '<span style="color:var(--muted);font-size:13px">' + esc(o.customer.name) + ' · ' + tr('items_count', { n: o.items.length }) + '</span></div>' +
      '<div><b>' + fmtRs(o.total) + '</b> ' + statusPill(o.status) + '</div></div>';
  }).join('') + '</div>';
  return h;
}
function stat(v, l) { return '<div class="stat-card"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }

function adProducts() {
  var h = '<button class="btn btn-primary" data-action="prod-new" style="max-width:260px;margin-bottom:12px">+ ' + t('p_add') + '</button>';
  h += '<div class="card">' + PRODUCTS.map(function (p) {
    var c = catOf(p.cat);
    return '<div class="admin-row">' +
      '<div class="cart-tile" style="background:' + c.color + '">' + esc(pname(p).trim().charAt(0)) + '</div>' +
      '<div class="grow"><b>' + esc(p.en) + '</b> / ' + esc(p.ur) + '<br>' +
      '<span style="color:var(--muted);font-size:13px">' + esc(p.pack) + ' · ' + fmtRs(p.price) +
      ' · ' + t('p_stock') + ': ' + p.stock +
      (p.popular ? ' · ★' : '') + (p.deal ? ' · DEAL' : '') + '</span></div>' +
      '<button class="mini-btn edit" data-action="prod-edit" data-id="' + esc(p.id) + '">' + t('p_edit') + '</button>' +
      '<button class="mini-btn del" data-action="prod-del" data-id="' + esc(p.id) + '">' + t('p_del') + '</button></div>';
  }).join('') + '</div>';
  return h;
}
function productFormHTML(p) {
  p = p || { id: '', en: '', ur: '', cat: 'atta', pack: '', unit: 'kg', price: '', cost: '', stock: '', popular: false, deal: false };
  var cats = CATEGORIES.map(function (c) {
    return '<option value="' + c.id + '"' + (p.cat === c.id ? ' selected' : '') + '>' + esc(S.lang === 'ur' ? c.ur : c.en) + '</option>';
  }).join('');
  var units = ['piece', 'pack', 'bottle', 'kg', 'g', 'litre', 'dozen'].map(function (u) {
    return '<option value="' + u + '"' + (p.unit === u ? ' selected' : '') + '>' + t('unit_' + u) + '</option>';
  }).join('');
  return '<h3>' + (p.id ? t('p_edit') : t('p_add')) + '</h3>' +
    (S.prodWarn ? '<div class="msg err">' + t('p_cost_warn') + '</div>' : '') +
    field('pf-en', t('p_name_en') + ' *', '<input id="pf-en" value="' + esc(p.en) + '">') +
    field('pf-ur', t('p_name_ur') + ' *', '<input id="pf-ur" value="' + esc(p.ur) + '">') +
    field('pf-pack', t('p_pack') + ' *', '<input id="pf-pack" placeholder="5 kg" value="' + esc(p.pack) + '">') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    field('pf-cat', t('p_cat'), '<select id="pf-cat">' + cats + '</select>') +
    field('pf-unit', t('p_unit'), '<select id="pf-unit">' + units + '</select>') + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    field('pf-cost', t('p_cost') + ' *', '<input id="pf-cost" type="number" min="0" value="' + esc(p.cost) + '">') +
    field('pf-price', t('p_price') + ' *', '<input id="pf-price" type="number" min="0" value="' + esc(p.price) + '">') + '</div>' +
    field('pf-stock', t('p_stock') + ' *', '<input id="pf-stock" type="number" min="0" step="1" value="' + esc(p.stock) + '">') +
    '<div class="checkbox-row"><label><input type="checkbox" id="pf-pop"' + (p.popular ? ' checked' : '') + '> ' + t('p_popular') + '</label>' +
    '<label><input type="checkbox" id="pf-deal"' + (p.deal ? ' checked' : '') + '> ' + t('p_deal') + '</label></div>' +
    '<button class="btn btn-primary" data-action="prod-save" data-id="' + esc(p.id) + '">' + t('p_save') + '</button>' +
    '<button class="btn btn-secondary" data-action="modal-close">' + t('p_cancel') + '</button>';
}

function adOrders() {
  var orders = getOrders().slice().reverse();
  if (!orders.length) return '<div class="card">' + t('o_empty') + '</div>';
  var statuses = ['pending', 'confirmed', 'preparing', 'out', 'delivered', 'cancelled'];
  return '<div class="card">' + orders.map(function (o) {
    var opts = statuses.map(function (s) {
      return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + t('st_' + s) + '</option>';
    }).join('');
    return '<div class="admin-row" style="align-items:flex-start"><div class="grow">' +
      '<b>' + esc(o.no) + '</b> ' + statusPill(o.status) + '<br>' +
      '<span style="color:var(--muted);font-size:13px">' + esc(new Date(o.createdAt).toLocaleString()) + '<br>' +
      t('o_customer') + ': ' + esc(o.customer.name) + ' · ' + esc(o.customer.mobile) + '<br>' +
      esc(o.customer.address) + '</span>' +
      orderItemsHTML(o) +
      '<b>' + t('total') + ': ' + fmtRs(o.total) + '</b></div>' +
      '<div><select class="status-select" data-order-status="' + esc(o.id) + '">' + opts + '</select></div></div>';
  }).join('') + '</div>';
}

function adExpenses() {
  var ex = getExpenses().slice().reverse();
  var total = ex.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
  var h = '<div class="card"><h3 style="margin-top:0">' + t('e_add_t') + '</h3>' +
    field('ex-t', t('e_title'), '<input id="ex-title" placeholder="' + esc(t('e_title')) + '">') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    field('ex-a', t('e_amount'), '<input id="ex-amount" type="number" min="0">') +
    field('ex-d', t('e_date'), '<input id="ex-date" type="date" value="' + todayStr() + '">') + '</div>' +
    '<button class="btn btn-primary" data-action="exp-add">' + t('e_add') + '</button></div>';
  h += '<div class="card" style="margin-top:12px"><div class="t-row grand" style="border:0;margin:0;padding:0">' +
       '<span>' + t('e_total') + '</span><span>' + fmtRs(total) + '</span></div>';
  h += ex.length ? ex.map(function (e) {
    return '<div class="admin-row"><div class="grow"><b>' + esc(e.title) + '</b><br>' +
      '<span style="color:var(--muted);font-size:13px">' + esc(e.date) + '</span></div>' +
      '<b>' + fmtRs(e.amount) + '</b> ' +
      '<button class="mini-btn del" data-action="exp-del" data-id="' + esc(e.id) + '">' + t('p_del') + '</button></div>';
  }).join('') : '<div style="color:var(--muted)">' + t('e_empty') + '</div>';
  return h + '</div>';
}

function adReports() {
  var r = reportTotals(getOrders(), getExpenses());
  return '<div class="stat-grid">' +
    stat(fmtRs(r.sales), t('r_sales') + ' (' + r.count + ')') +
    stat(fmtRs(r.cogs), t('r_cogs')) +
    stat(fmtRs(r.expenses), t('r_expenses')) +
    stat(fmtRs(r.profit), t('r_profit')) + '</div>' +
    '<div class="demo-note" style="margin-top:12px">' + t('r_note') + '</div>';
}

function adSettings() {
  var s = getSettings();
  return '<div class="card">' +
    field('s-shop', t('s_shop'), '<input id="s-shop" value="' + esc(s.shopName) + '">') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    field('s-fee', t('s_fee'), '<input id="s-fee" type="number" min="0" value="' + esc(s.deliveryFee) + '">') +
    field('s-free', t('s_free'), '<input id="s-free" type="number" min="0" value="' + esc(s.freeAbove) + '">') + '</div>' +
    field('s-min', t('s_min'), '<input id="s-min" type="number" min="0" value="' + esc(s.minOrder) + '">') +
    field('s-hours', t('s_hours'), '<input id="s-hours" placeholder="' + esc(t('s_hours_ph')) + '" value="' + esc(s.hours) + '">') +
    field('s-wa', t('s_wa'), '<input id="s-wa" inputmode="tel" placeholder="' + esc(t('s_wa_ph')) + '" value="' + esc(s.whatsapp) + '">' +
      '<div class="hint">' + esc(t('s_wa_ph')) + '</div>') +
    '<button class="btn btn-primary" data-action="settings-save">' + t('s_save') + '</button>' +
    '<br><button class="btn btn-danger" data-action="reset-demo">' + t('ac_reset') + '</button></div>';
}

/* ---------------- shell render + router ---------------- */
function navItems() {
  return [['home', 'nav_home', ICONS.home], ['categories', 'nav_categories', ICONS.grid],
          ['cart', 'nav_cart', ICONS.cart], ['orders', 'nav_orders', ICONS.box],
          ['account', 'nav_account', ICONS.user]];
}
function navHTML(desktop) {
  return navItems().map(function (it) {
    var active = S.view === it[0] || (it[0] === 'categories' && (S.view === 'category' || S.view === 'deals')) ||
                 (it[0] === 'account' && (S.view === 'admin' || S.view === 'admin-login'));
    var badge = (it[0] === 'cart' && cartCount() > 0) ? '<span class="cart-badge">' + cartCount() + '</span>' : '';
    return '<button data-action="nav" data-view="' + it[0] + '"' + (active ? ' class="active"' : '') + '>' +
           it[2] + '<span>' + t(it[1]) + '</span>' + badge + '</button>';
  }).join('');
}
function viewHTML() {
  if (S.view === 'categories') return vCategories();
  if (S.view === 'category') return vCategory();
  if (S.view === 'deals') return vDeals();
  if (S.view === 'cart') return vCart();
  if (S.view === 'checkout') return vCheckout();
  if (S.view === 'confirm') return vConfirm();
  if (S.view === 'orders') return vOrders();
  if (S.view === 'account') return vAccount();
  if (S.view === 'admin-login') return vAdminLogin();
  if (S.view === 'admin') return isAdmin() ? vAdmin() : vAdminLogin();
  return vHome();
}
function render(scroll) {
  if (!HAS_DOM) return;
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === 'ur' ? 'rtl' : 'ltr';
  document.title = SETTINGS.shopName + ' — Demo';
  document.getElementById('banner-text').textContent = t('demo_banner');
  document.getElementById('hdr-shop').textContent = SETTINGS.shopName;
  document.getElementById('hdr-hours').textContent = tr('open_hours', { h: SETTINGS.hours });
  document.getElementById('lang-btn').textContent = S.lang === 'ur' ? 'English' : 'اردو';
  document.getElementById('desktop-nav').innerHTML = navHTML(true);
  document.getElementById('bottom-nav').innerHTML = navHTML(false);
  document.getElementById('footer-note').textContent = t('ad_demo_note');
  document.getElementById('view').innerHTML = viewHTML();
  if (scroll && window.scrollTo) window.scrollTo(0, 0);
}

/* ---------------- actions ---------------- */
function go(view) {
  S.view = view; S.trackErr = false;
  if (view !== 'category') S.cat = null;
  render(true);
}
function setLangUI(l) { S.lang = l; setLangPref(l); render(false); }
function prodById(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
function addToCart(id) {
  var p = prodById(id);
  if (!p || p.stock <= 0) return;
  var line = null, i;
  for (i = 0; i < S.cart.length; i++) if (S.cart[i].pid === id) line = S.cart[i];
  var cur = line ? line.qty : 0;
  if (cur + 1 > p.stock) { toast(t('low_stock') + ': ' + p.stock); return; }
  if (line) line.qty++; else S.cart.push({ pid: id, qty: 1 });
  saveCart(S.cart); render(false); toast(t('added_toast'));
}
function chQty(id, d) {
  for (var i = 0; i < S.cart.length; i++) {
    if (S.cart[i].pid === id) {
      var p = prodById(id);
      var nq = S.cart[i].qty + d;
      if (d > 0 && p && nq > p.stock) { toast(t('low_stock') + ': ' + p.stock); return; }
      S.cart[i].qty = nq;
      if (S.cart[i].qty <= 0) S.cart.splice(i, 1);
      break;
    }
  }
  saveCart(S.cart); render(false);
}
function rmLine(id) {
  S.cart = S.cart.filter(function (l) { return l.pid !== id; });
  saveCart(S.cart); render(false);
}
function applyPromo() {
  var el = document.getElementById('promo');
  S.promo = el ? el.value : '';
  var calc = calcCart(cartLines(), SETTINGS, S.promo);
  S.promoMsg = calc.promoValid ? t('promo_ok') : t('promo_bad');
  render(false);
}
function readCheckout() {
  var g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
  var pay = 'cod';
  var r = document.querySelector('input[name="pay"]:checked');
  if (r) pay = r.value;
  S.co = { name: g('f-name'), mobile: g('f-mobile'), address: g('f-address'), notes: g('f-notes'), payment: pay };
}
function placeOrder() {
  readCheckout();
  var res = buildOrder({
    lines: S.cart, products: PRODUCTS, settings: SETTINGS, promoCode: S.promo,
    customer: S.co, payment: S.co.payment,
    existingNos: getOrders().map(function (o) { return o.no; })
  });
  if (res.error) {
    S.coErr = res.error === 'err_min' ? tr('min_order_err', { min: res.min.toLocaleString('en-US') }) : t(res.error);
    render(false);
    return;
  }
  var orders = getOrders();
  orders.push(res.order);
  saveOrders(orders);
  S.cart = []; saveCart(S.cart);
  S.promo = ''; S.promoMsg = null; S.coErr = null;
  S.lastOrder = res.order;
  S.view = 'confirm';
  render(true);
}
function waOrder() {
  var o = S.lastOrder;
  if (!o) return;
  var link = whatsappLink(o, SETTINGS.whatsapp);
  if (link) window.open(link, '_blank');
  else toast(t('wa_setup'));
}
function trackOrder() {
  var no = document.getElementById('tr-no'), l4 = document.getElementById('tr-l4');
  S.tracked = findOrder(getOrders(), no ? no.value : '', l4 ? l4.value : '');
  S.trackErr = !S.tracked;
  render(false);
}
function resetDemo() {
  if (!window.confirm(t('ac_reset_confirm'))) return;
  resetDemoData();
  PRODUCTS = getProducts(); SETTINGS = getSettings();
  S.cart = []; S.promo = ''; S.promoMsg = null; S.lang = 'en';
  S.view = 'home'; S.adminTab = 'dashboard'; S.lastOrder = null; S.tracked = null;
  render(true);
  toast(t('ac_reset_done'));
}
function adminLogin() {
  var u = document.getElementById('al-user'), p = document.getElementById('al-pass');
  if (verifyAdmin(u ? u.value : '', p ? p.value : '')) {
    setAdmin(true); S.loginErr = false; S.adminTab = 'dashboard'; S.view = 'admin'; render(true);
  } else { S.loginErr = true; render(false); }
}
function openEditProduct(id) {
  var p = prodById(id);
  if (!p) return;
  S.prodWarn = false;
  openModal(productFormHTML(p));
}
function delProduct(id) {
  if (!window.confirm(t('p_confirm_del'))) return;
  PRODUCTS = PRODUCTS.filter(function (p) { return p.id !== id; });
  saveProducts(PRODUCTS);
  render(false);
  toast(t('p_deleted'));
}
function saveProduct(id) {
  var g = function (x) { var e = document.getElementById(x); return e ? e.value : ''; };
  var gc = function (x) { var e = document.getElementById(x); return e ? e.checked : false; };
  var obj = {
    id: id || ('p-' + Date.now().toString(36)),
    en: g('pf-en').trim(), ur: g('pf-ur').trim(), cat: g('pf-cat') || 'atta',
    pack: g('pf-pack').trim(), unit: g('pf-unit') || 'kg',
    price: Number(g('pf-price')), cost: Number(g('pf-cost')),
    stock: Math.floor(Number(g('pf-stock'))),
    popular: gc('pf-pop'), deal: gc('pf-deal')
  };
  if (!obj.en || !obj.ur || !obj.pack || !(obj.price > 0) || !(obj.cost >= 0) || !(obj.stock >= 0)) {
    toast(t('p_fill')); return;
  }
  if (!S.prodWarn && obj.price < obj.cost) {
    S.prodWarn = true;
    openModal(productFormHTML(obj));
    return;
  }
  S.prodWarn = false;
  var found = false, i;
  for (i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === obj.id) { PRODUCTS[i] = obj; found = true; }
  if (!found) PRODUCTS.push(obj);
  saveProducts(PRODUCTS);
  closeModal();
  render(false);
  toast(t('p_saved'));
}
function adminSetStatus(orderId, val) {
  var orders = getOrders();
  var res = setOrderStatus(orders, PRODUCTS, orderId, val);
  if (res.error === 'stock') {
    toast(tr('o_stock_err', { name: res.name, stock: res.stock, need: res.need }));
  } else if (res.ok) {
    saveOrders(orders); saveProducts(PRODUCTS);
    toast(t('o_updated'));
  }
  render(false);
}
function addExpense() {
  var g = function (x) { var e = document.getElementById(x); return e ? e.value : ''; };
  var title = g('ex-title').trim(), amount = Number(g('ex-amount')), date = g('ex-date') || todayStr();
  if (!title || !(amount > 0)) { toast(t('p_fill')); return; }
  var ex = getExpenses();
  ex.push({ id: 'e' + Date.now().toString(36), title: title, amount: amount, date: date });
  saveExpenses(ex);
  render(false);
  toast(t('e_saved'));
}
function delExpense(id) {
  if (!window.confirm(t('e_del_confirm'))) return;
  saveExpenses(getExpenses().filter(function (e) { return e.id !== id; }));
  render(false);
}
function saveSettingsUI() {
  var g = function (x) { var e = document.getElementById(x); return e ? e.value : ''; };
  var fee = Number(g('s-fee')), free = Number(g('s-free')), min = Number(g('s-min'));
  var wa = g('s-wa').replace(/\D/g, '');
  if (!(fee >= 0) || !(free >= 0) || !(min >= 0)) { toast(t('s_invalid')); return; }
  SETTINGS = { shopName: g('s-shop').trim() || DEFAULT_SETTINGS.shopName,
               deliveryFee: fee, freeAbove: free, minOrder: min,
               hours: g('s-hours').trim() || DEFAULT_SETTINGS.hours, whatsapp: wa };
  saveSettings(SETTINGS);
  render(true);
  toast(t('s_saved'));
}

/* ---------------- event wiring ---------------- */
function onAction(el) {
  var a = el.getAttribute('data-action');
  if (a === 'nav') go(el.getAttribute('data-view'));
  else if (a === 'lang') setLangUI(el.getAttribute('data-l') || (S.lang === 'ur' ? 'en' : 'ur'));
  else if (a === 'cat') { S.view = 'category'; S.cat = el.getAttribute('data-id'); render(true); }
  else if (a === 'add') addToCart(el.getAttribute('data-id'));
  else if (a === 'inc') chQty(el.getAttribute('data-id'), 1);
  else if (a === 'dec') chQty(el.getAttribute('data-id'), -1);
  else if (a === 'rm') rmLine(el.getAttribute('data-id'));
  else if (a === 'promo') applyPromo();
  else if (a === 'go-checkout') { S.coErr = null; S.view = 'checkout'; render(true); }
  else if (a === 'place-order') placeOrder();
  else if (a === 'wa-order') waOrder();
  else if (a === 'track') trackOrder();
  else if (a === 'reset-demo') resetDemo();
  else if (a === 'admin-open') { S.loginErr = false; S.view = 'admin-login'; render(true); }
  else if (a === 'admin-login') adminLogin();
  else if (a === 'admin-logout') { setAdmin(false); S.view = 'account'; render(true); }
  else if (a === 'admin-tab') { S.adminTab = el.getAttribute('data-tab'); render(false); }
  else if (a === 'prod-new') { S.prodWarn = false; openModal(productFormHTML(null)); }
  else if (a === 'prod-edit') openEditProduct(el.getAttribute('data-id'));
  else if (a === 'prod-del') delProduct(el.getAttribute('data-id'));
  else if (a === 'prod-save') saveProduct(el.getAttribute('data-id'));
  else if (a === 'modal-close') closeModal();
  else if (a === 'exp-add') addExpense();
  else if (a === 'exp-del') delExpense(el.getAttribute('data-id'));
  else if (a === 'settings-save') saveSettingsUI();
}
function clickHandler(e) {
  var el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
  if (el) onAction(el);
}
function inputHandler(e) {
  if (e.target && e.target.id === 'search') {
    S.search = e.target.value;
    var d = document.getElementById('home-dynamic');
    if (d) d.innerHTML = homeDynamic();
  }
}
function changeHandler(e) {
  var sel = e.target && e.target.closest ? e.target.closest('[data-order-status]') : null;
  if (sel) adminSetStatus(sel.getAttribute('data-order-status'), sel.value);
}
function init() {
  S.lang = curLang();
  PRODUCTS = getProducts();
  SETTINGS = getSettings();
  S.cart = getCart();
  render(false);
}

/* ---------------- exports (node tests) ---------------- */
var EXPORTS = {
  sha256: sha256, ADMIN_PASS_HASH: ADMIN_PASS_HASH,
  CATEGORIES: CATEGORIES, seedProducts: seedProducts, DEFAULT_SETTINGS: DEFAULT_SETTINGS,
  STR: STR, t: t, tr: tr, esc: esc, fmtRs: fmtRs,
  calcCart: calcCart, validateMobile: validateMobile, generateOrderNo: generateOrderNo,
  buildOrder: buildOrder, findOrder: findOrder, setOrderStatus: setOrderStatus,
  dashboardStats: dashboardStats, reportTotals: reportTotals,
  whatsappLink: whatsappLink, verifyAdmin: verifyAdmin
};
if (typeof module !== 'undefined' && module.exports) module.exports = EXPORTS;

/* ---------------- boot (browser only) ---------------- */
var _bound = false;
if (HAS_DOM) {
  if (!_bound) {
    _bound = true;
    document.addEventListener('click', clickHandler);
    document.addEventListener('input', inputHandler);
    document.addEventListener('change', changeHandler);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}

})();
