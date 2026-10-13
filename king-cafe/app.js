/* King Cafe — DEMO by Jilan Apps (demo data, localStorage) */
"use strict";
var LANG = localStorage.getItem('jkc_lang') || 'en';
var SIZES = [
  {id:'S', en:'Small 9"', ur:'چھوٹی 9 انچ'},
  {id:'M', en:'Medium 12"', ur:'درمیانی 12 انچ'},
  {id:'L', en:'Large 15"', ur:'بڑی 15 انچ'},
  {id:'F', en:'Family 18"', ur:'فیملی 18 انچ'}
];
var I18N = {
en:{tag:"Shahi Zaiqa, Har Bite Me",heroT:"Shahi Zaiqa, Har Bite Me! \uD83D\uDC51",heroS:"Burgers, Pizza, BBQ & more \u2014 order in minutes",
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
viewOrder:"View",markSent:"Demo mode: WhatsApp not configured.",demoLock:"DEMO",pizza:"Pizza",burger:"Burger",bbq:"BBQ",chinese:"Chinese",roll:"Rolls",side:"Sides",drink:"Drinks",dessert:"Desserts",deal:"Deals",
promo:"Daily Promo",promoNew:"Aaj ki promo tayyar! 🎨",dTitle:"Deal title",dDisc:"Discount %",dPrice:"Deal price (Rs)",dOld:"Old price (Rs)",
regen:"🎲 Regenerate",dlImg:"⬇️ Download Image",shareWA:"📱 Share on WhatsApp",promoSaved:"Promo saved! ✅",
promoHint:"Image sirf tab banti hai jab app khuli ho (background me nahi). Share dabane par image aap ke phone ke share menu se jayegi — WhatsApp me broadcast list aap khud select karein. Koi auto-send nahi hota.",
waShareFallback:"Image download ho gayi — WhatsApp khol kar broadcast list me khud attach kar ke bhejein.",
qtyShort:"Qty",orderEmpty:"Cart is empty!",invName:"Item",invQty:"Qty",invPrice:"Price",invTotal:"Total",invSub:"Subtotal",invDel:"Delivery",invGrand:"Grand Total",invThanks:"Thank you for ordering! 🙏"},
ur:{tag:"شاہی ذائقہ، ہر بائٹ میں",heroT:"شاہی ذائقہ، ہر بائٹ میں! \uD83D\uDC51",heroS:"برگر، پیزا، بار بی کیو اور بہت کچھ \u2014 منٹوں میں آرڈر کریں",
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
viewOrder:"دیکھیں",markSent:"ڈیمو موڈ: واٹس ایپ نمبر سیٹ نہیں۔",demoLock:"DEMO",pizza:"پیزا",burger:"برگر",bbq:"بار بی کیو",chinese:"چائنیز",roll:"رولز",side:"سائیڈز",drink:"مشروبات",dessert:"میٹھے",deal:"ڈیلز",
promo:"روزانہ پرومو",promoNew:"آج کی پرومو تیار ہے! 🎨",dTitle:"ڈیل کا عنوان",dDisc:"رعایت %",dPrice:"ڈیل قیمت (روپے)",dOld:"پرانی قیمت (روپے)",
regen:"🎲 دوبارہ بنائیں",dlImg:"⬇️ ڈاؤن لوڈ",shareWA:"📱 واٹس ایپ شیئر",promoSaved:"پرومو محفوظ! ✅",
promoHint:"تصویر صرف تب بنتی ہے جب ایپ کھلی ہو (بیک گراؤنڈ میں نہیں)۔ شیئر دبانے پر تصویر آپ کے فون کے شیئر مینیو سے جائے گی — واٹس ایپ میں براڈکاسٹ لسٹ آپ خود منتخب کریں۔ کوئی آٹو سینڈ نہیں ہوتا۔",
waShareFallback:"تصویر ڈاؤن لوڈ ہو گئی — واٹس ایپ کھول کر براڈکاسٹ لسٹ میں خود اٹیچ کر کے بھیجیں۔",
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
  var B = function(id,en,ur,de,du,pr,em,pop){return {id:id,cat:'burger',en:en,ur:ur,descEn:de,descUr:du,prices:{one:pr},emoji:em,popular:!!pop};};
  var Q = function(id,en,ur,de,du,pr,em,pop){return {id:id,cat:'bbq',en:en,ur:ur,descEn:de,descUr:du,prices:{one:pr},emoji:em,popular:!!pop};};
  var C = function(id,en,ur,de,du,pr,em,pop){return {id:id,cat:'chinese',en:en,ur:ur,descEn:de,descUr:du,prices:{one:pr},emoji:em,popular:!!pop};};
  var R = function(id,en,ur,de,du,pr,em,pop){return {id:id,cat:'roll',en:en,ur:ur,descEn:de,descUr:du,prices:{one:pr},emoji:em,popular:!!pop};};
  return [
    /* ---------- BURGERS ---------- */
    B('b1','Zinger Burger','زنگر برگر','Crispy spicy fillet, mayo & fresh bun','کرسبی فلیٹ، مایو اور تازہ بن',380,'🍔',1),
    B('b2','Chicken Patty Burger','چکن پیٹی برگر','Juicy chicken patty with classic sauce','رس بھری چکن پیٹی، خاص ساس کے ساتھ',280,'🍔',0),
    B('b3','Beef Smash Burger','بیف سمیش برگر','Smashed beef patty, cheddar & smoky sauce','بیف پیٹی، چیڈر چیز اور اسموکی ساس',550,'🍔',1),
    B('b4','Double Decker Burger','ڈبل ڈیکر برگر','Double chicken fillet, double cheese','ڈبل چکن فلیٹ، ڈبل چیز',650,'🍔',0),
    B('b5','Grilled Chicken Burger','گرلڈ چکن برگر','Healthy grilled fillet, light mayo','صحت بخش گرلڈ فلیٹ، ہلکی مایو',480,'🍔',0),
    B('b6','Fish Fillet Burger','فش فلیٹ برگر','Crispy fish fillet with tartar sauce','کرسبی فش فلیٹ، ٹارٹر ساس کے ساتھ',450,'🐟',0),
    /* ---------- PIZZA ---------- */
    P('pz1','Chicken Tikka','چکن ٹکا','Spicy desi tikka chunks, onions & mozzarella','مصالحہ دار ٹکا، پیاز اور موزریلا',{S:549,M:949,L:1349,F:1749},'🍕',1),
    P('pz2','Chicken Fajita','چکن فجیتا','Fajita chicken, capsicum, onions & cheese','فجیتا چکن، شملہ مرچ، پیاز اور چیز',{S:579,M:979,L:1379,F:1779},'🍕',1),
    P('pz3','Pepperoni','پیپرونی','Loaded pepperoni slices with extra mozzarella','پیپرونی اور اضافی موزریلا',{S:629,M:1049,L:1449,F:1849},'🍕',0),
    P('pz4','Cheese Lovers','چیز لورز','Triple cheese blend for true cheese fans','چیز کے شوقینوں کے لیے ٹرپل چیز',{S:599,M:999,L:1399,F:1799},'🧀',1),
    P('pz5','Chicken Supreme','چکن سپریم','Tikka + fajita + pepperoni, fully loaded','ٹکا، فجیتا، پیپرونی — فل لوڈڈ',{S:649,M:1099,L:1499,F:1899},'🍕',0),
    P('pz6','Malai Boti','ملائی بوٹی','Creamy malai boti with mild spices','کریمی ملائی بوٹی، ہلکے مصالحے',{S:599,M:1029,L:1429,F:1829},'🍕',0),
    P('pz7','BBQ Chicken','بی بی کیو چکن','Smoky BBQ chicken with BBQ sauce swirl','دھوئیں دار بی بی کیو چکن',{S:589,M:999,L:1399,F:1799},'🍕',0),
    P('pz8','Peri Peri Chicken','پیری پیری چکن','Fiery peri peri drizzle, for spice lovers','تیز پیری پیری',{S:619,M:1049,L:1449,F:1849},'🔥',0),
    /* ---------- BBQ ---------- */
    Q('q1','Chicken Tikka (Leg/Chest)','چکن ٹکا','Char-grilled, served with imli chutney','کوئلے پر بھنا، املی چٹنی کے ساتھ',280,'🍢',1),
    Q('q2','Malai Boti (8 pc)','ملائی بوٹی','Creamy soft boti, mild spices','نرم کریمی بوٹی، ہلکے مصالحے',380,'🍢',0),
    Q('q3','Beef Seekh Kebab (4 pc)','بیف سیخ کباب','Juicy desi-style seekh kebabs','رس بھرے دیسی سیخ کباب',420,'🍢',1),
    Q('q4','Chicken Chargha','چکن چرغہ','Whole steamed-then-fried chicken, Lahori style','پورا چرغہ، لاہوری انداز',950,'🍗',1),
    Q('q5','BBQ Family Platter','بی بی کیو فیملی پلیٹر','Tikka + malai boti + kebab + 6 naan','ٹکا، ملائی بوٹی، کباب اور 6 نان',1550,'🎉',0),
    /* ---------- CHINESE ---------- */
    C('c1','Chicken Chowmein','چکن چاؤمین','Wok-tossed noodles with chicken & veggies','چکن اور سبزیوں کے ساتھ نوڈلز',380,'🥡',1),
    C('c2','Chicken Fried Rice','چکن فرائیڈ رائس','Classic Chinese fried rice','خاص چائنیز فرائیڈ رائس',360,'🍚',0),
    C('c3','Kung Pao Chicken','کنگ پاؤ چکن','Spicy chicken with peanuts & peppers','مونگ پھلی اور مرچوں کے ساتھ تیز چکن',560,'🌶️',0),
    C('c4','Sweet & Sour Chicken','سویٹ اینڈ ساور چکن','Tangy sweet-sour glazed chicken','کھٹی میٹھی گلیز والا چکن',540,'🍗',0),
    C('c5','Vegetable Fried Rice','ویجیٹیبل فرائیڈ رائس','Light veggie rice','ہلکے سبزیوں والے چاول',280,'🍚',0),
    /* ---------- ROLLS & SHAWARMA ---------- */
    R('r1','Chicken Shawarma','چکن شاورما','Classic garlic shawarma in soft pita','نرم پیٹا میں لہسن والا شاورما',220,'🌯',1),
    R('r2','Special Shawarma (Cheese)','اسپیشل شاورما','Shawarma loaded with cheese','چیز سے بھرپور شاورما',320,'🌯',0),
    R('r3','Chicken Paratha Roll','چکن پراٹھا رول','Crispy paratha, tikka chunks & chutney','کرسبی پراٹھا، ٹکا اور چٹنی',280,'🌯',1),
    R('r4','Malai Boti Roll','ملائی بوٹی رول','Creamy malai boti wrapped in paratha','پراٹھے میں لپٹی کریمی ملائی بوٹی',330,'🌯',0),
    R('r5','Seekh Kebab Roll','سیخ کباب رول','Beef kebab, onions & mint chutney','بیف کباب، پیاز اور پودینہ چٹنی',300,'🌯',0),
    /* ---------- SIDES ---------- */
    {id:'sd1',cat:'side',en:'French Fries',ur:'فرنچ فرائز',descEn:'Golden crispy fries',descUr:'سنہرے کرسبی فرائز',prices:{one:200},emoji:'🍟'},
    {id:'sd2',cat:'side',en:'Loaded Fries',ur:'لوڈڈ فرائز',descEn:'Fries with chicken & cheese sauce',descUr:'چکن اور چیز ساس کے ساتھ',prices:{one:380},emoji:'🍟',popular:1},
    {id:'sd3',cat:'side',en:'Garlic Bread',ur:'گارلک بریڈ',descEn:'4 pcs with garlic butter',descUr:'لہسن مکھن کے ساتھ 4 پیس',prices:{one:260},emoji:'🥖'},
    {id:'sd4',cat:'side',en:'Chicken Wings (6 pc)',ur:'چکن ونگز',descEn:'Crispy hot wings',descUr:'کرسبی گرم ونگز',prices:{one:420},emoji:'🍗'},
    {id:'sd5',cat:'side',en:'Chicken Nuggets (8 pc)',ur:'چکن نگٹس',descEn:'Crispy nuggets with dip',descUr:'ڈِپ کے ساتھ نگٹس',prices:{one:350},emoji:'🍗'},
    /* ---------- DRINKS ---------- */
    {id:'dr1',cat:'drink',en:'Fresh Lime Soda',ur:'فریش لائم سوڈا',descEn:'Chilled, sweet & salted',descUr:'ٹھنڈا، میٹھا اور نمکین',prices:{one:150},emoji:'🍋'},
    {id:'dr2',cat:'drink',en:'Mint Margarita',ur:'منٹ مارگریٹا',descEn:'Fresh mint cooler',descUr:'تازہ پودینے کا مشروب',prices:{one:220},emoji:'🌿',popular:1},
    {id:'dr3',cat:'drink',en:'Cold Coffee',ur:'کولڈ کافی',descEn:'Iced creamy coffee',descUr:'ٹھنڈی کریمی کافی',prices:{one:300},emoji:'🧋'},
    {id:'dr4',cat:'drink',en:'Hot Coffee',ur:'ہاٹ کافی',descEn:'Freshly brewed',descUr:'تازہ بنی ہوئی',prices:{one:240},emoji:'☕'},
    {id:'dr5',cat:'drink',en:'Doodh Patti',ur:'دودھ پتی',descEn:'Strong desi chai',descUr:'کڑک دیسی چائے',prices:{one:150},emoji:'🍵'},
    {id:'dr6',cat:'drink',en:'Kashmiri Chai',ur:'کشمیری چائے',descEn:'Pink tea with crushed nuts',descUr:'میووں والی گلابی چائے',prices:{one:220},emoji:'🫖'},
    {id:'dr7',cat:'drink',en:'Oreo Milkshake',ur:'اوریو ملک شیک',descEn:'Thick & creamy',descUr:'گاڑھا کریمی شیک',prices:{one:380},emoji:'🥤',popular:1},
    {id:'dr8',cat:'drink',en:'Mango Shake',ur:'مینگو شیک',descEn:'Seasonal fresh mangoes',descUr:'تازہ آموں کا شیک',prices:{one:320},emoji:'🥭'},
    {id:'dr9',cat:'drink',en:'Cold Drink (Can)',ur:'کولڈ ڈرنک',descEn:'Chilled can',descUr:'ٹھنڈا کین',prices:{one:120},emoji:'🥤'},
    {id:'dr10',cat:'drink',en:'Mineral Water',ur:'منرل واٹر',descEn:'Pure drinking water',descUr:'صاف پانی',prices:{one:80},emoji:'💧'},
    /* ---------- DESSERTS ---------- */
    {id:'ds1',cat:'dessert',en:'Chocolate Lava Cake',ur:'چاکلیٹ لاوا کیک',descEn:'Molten chocolate center',descUr:'پگھلی چاکلیٹ والا',prices:{one:320},emoji:'🍫',popular:1},
    {id:'ds2',cat:'dessert',en:'Brownie with Ice Cream',ur:'براؤنی ود آئس کریم',descEn:'Warm brownie, vanilla scoop',descUr:'گرم براؤنی، ونیلا اسکوپ',prices:{one:400},emoji:'🍨'},
    {id:'ds3',cat:'dessert',en:'Shahi Tukray',ur:'شاہی ٹکڑے',descEn:'Royal desi dessert',descUr:'شاہی دیسی میٹھا',prices:{one:280},emoji:'🍮'},
    {id:'ds4',cat:'dessert',en:'Gulab Jamun (4 pc)',ur:'گلاب جامن',descEn:'Soft & warm',descUr:'نرم اور گرم',prices:{one:200},emoji:'🍮'},
    {id:'ds5',cat:'dessert',en:'Ice Cream Scoop',ur:'آئس کریم اسکوپ',descEn:'Vanilla / chocolate / mango',descUr:'ونیلا / چاکلیٹ / آم',prices:{one:180},emoji:'🍨'},
    /* ---------- DEALS ---------- */
    {id:'dl1',cat:'deal',en:'King Family Deal',ur:'کنگ فیملی ڈیل',descEn:'1 Large pizza + 4 Zingers + 1.5L drink',descUr:'1 بڑا پیزا + 4 زنگر + ڈیڑھ لیٹر ڈرنک',prices:{one:2499},emoji:'🎁',popular:1},
    {id:'dl2',cat:'deal',en:'Burger Blast',ur:'برگر بلاسٹ',descEn:'2 Zingers + 2 fries + 2 drinks',descUr:'2 زنگر + 2 فرائز + 2 ڈرنکس',prices:{one:999},emoji:'🎁',popular:1},
    {id:'dl3',cat:'deal',en:'BBQ Night Deal',ur:'بی بی کیو نائٹ ڈیل',descEn:'Half chargha + 4 kebab + 4 naan',descUr:'آدھا چرغہ + 4 کباب + 4 نان',prices:{one:1299},emoji:'🎁'},
    {id:'dl4',cat:'deal',en:'Midnight Deal',ur:'مڈ نائٹ ڈیل',descEn:'1 Small pizza + drink (after 9pm)',descUr:'1 چھوٹا پیزا + ڈرنک (رات 9 کے بعد)',prices:{one:649},emoji:'🌙'}
  ];
}
function getMenu(){ try{var m=JSON.parse(localStorage.getItem('jkc_menu')); if(m&&m.length) return m;}catch(e){} var s=seedMenu(); localStorage.setItem('jkc_menu',JSON.stringify(s)); return s; }
function setMenu(m){ localStorage.setItem('jkc_menu',JSON.stringify(m)); }
function getCart(){ try{return JSON.parse(localStorage.getItem('jkc_cart')||'[]');}catch(e){return[];} }
function setCart(c){ localStorage.setItem('jkc_cart',JSON.stringify(c)); updateCartBadge(); }
function getOrders(){ try{return JSON.parse(localStorage.getItem('jkc_orders')||'[]');}catch(e){return[];} }
function setOrders(o){ localStorage.setItem('jkc_orders',JSON.stringify(o)); }
function getCfg(){ try{var c=JSON.parse(localStorage.getItem('jkc_cfg')); if(c) return c;}catch(e){} return {wa:'',fee:150,freeOver:2000,shop:'King Cafe',phone:'',addr:''}; }
function setCfg(c){ localStorage.setItem('jkc_cfg',JSON.stringify(c)); }

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
function toggleLang(){ LANG = LANG==='en'?'ur':'en'; localStorage.setItem('jkc_lang',LANG); applyLang(); updateDemoBar(); }
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
  var cats=['all','burger','pizza','bbq','chinese','roll','side','drink','dessert','deal'];
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
function isAdmin(){ return localStorage.getItem('jkc_admin')==='1'; }
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
  var tabs=[['dash','📊'],['promo','🎨 '+T('promo')],['menu','🍕 '+T('menuMgmt')],['orders','📦 '+T('ordersAdm')],['set','⚙️ '+T('settings')]];
  var h='<div class="sec-title">🔐 '+T('admin')+' <span style="font-size:11px;background:var(--gold);color:#fff;padding:2px 8px;border-radius:8px">'+T('demoLock')+'</span></div>';
  h+='<div class="cat-pills">'+tabs.map(function(t){return '<div class="cat-pill'+(adminTab===t[0]?' on':'')+'" onclick="adminTab=\''+t[0]+'\';renderAccount()">'+t[1]+'</div>';}).join('')+'</div><div id="admBody"></div>';
  h+='<button class="btn btn-ghost" onclick="localStorage.removeItem(\'jkc_admin\');renderAccount()">'+T('logout')+'</button>';
  box.innerHTML=h;
  if(adminTab==='dash') admDash(); else if(adminTab==='promo') admPromo(); else if(adminTab==='menu') admMenu();
  else if(adminTab==='orders') admOrders(); else admSettings();
}
function doLogin(){
  var u=document.getElementById('ad-u').value.trim(), p=document.getElementById('ad-p').value;
  if(u==='admin'&&p==='jilan123'){ localStorage.setItem('jkc_admin','1'); renderAccount(); }
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
    '<button class="btn btn-orange" onclick="adminTab=\'promo\';renderAccount()">🎨 '+T('promo')+' — '+esc(promoDateStr())+'</button><div style="height:10px"></div>'+
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
  var p=getMenu().find(function(x){return x.id===id;})||{id:'n'+Date.now(),cat:'pizza',en:'',ur:'',descEn:'',descUr:'',prices:{S:0,M:0,L:0,F:0,one:0},emoji:'👑'};
  var isP=p.cat==='pizza';
  var h='<h3>'+(id?T('edit'):T('addItem'))+'</h3><div class="form">'+
    '<label>'+T('itemName')+'</label><input id="ei-en" value="'+esc(p.en)+'">'+
    '<label>'+T('itemNameUr')+'</label><input id="ei-ur" value="'+esc(p.ur||'')+'">'+
    '<label>'+T('category')+'</label><select id="ei-cat" onchange="document.getElementById(\'ei-pr\').style.display=this.value===\'pizza\'?\'none\':\'block\';document.getElementById(\'ei-prp\').style.display=this.value===\'pizza\'?\'grid\':\'none\'">'+
    ['burger','pizza','bbq','chinese','roll','side','drink','dessert','deal'].map(function(c){return '<option value="'+c+'"'+(p.cat===c?' selected':'')+'>'+catName(c)+'</option>';}).join('')+'</select>'+
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
  setCfg({wa:document.getElementById('cf-wa').value.replace(/\D/g,''),fee:+document.getElementById('cf-fee').value||0,freeOver:+document.getElementById('cf-free').value||0,shop:'King Cafe',phone:'',addr:''});
  toast(T('saved'));
}

/* ---------- DAILY PROMO IMAGE ---------- */
function todayKey(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function promoDateStr(){ try{ return new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return todayKey(); } }
function getPromo(){ try{var p=JSON.parse(localStorage.getItem('jkc_promo')); if(p&&p.date) return p;}catch(e){} return null; }
function setPromo(p){ try{localStorage.setItem('jkc_promo',JSON.stringify(p));}catch(e){} }
function genPromo(){
  var all=getMenu(), menu=all.filter(function(p){return p.cat==='pizza';});
  if(!menu.length) menu=all;
  var pz=menu[Math.floor(Math.random()*menu.length)];
  var pct=[10,15,20,25][Math.floor(Math.random()*4)];
  var base=pz.prices.M||pz.prices.L||pz.prices.S||pz.prices.one||0;
  var price=Math.max(99,Math.round(base*(1-pct/100)/10)*10-1);
  var p={date:todayKey(),en:pz.en,ur:pz.ur||pz.en,pct:pct,price:price,old:base,emoji:pz.emoji||'🍕'};
  setPromo(p); return p;
}
function roundRectP(x,px,py,w,h,r){ x.beginPath(); x.moveTo(px+r,py); x.arcTo(px+w,py,px+w,py+h,r); x.arcTo(px+w,py+h,px,py+h,r); x.arcTo(px,py+h,px,py,r); x.arcTo(px,py,px+w,py,r); x.closePath(); }
function fitFont(x,text,maxW,base,weight){
  var s=base;
  x.font=weight+' '+s+'px "Segoe UI",Arial,sans-serif';
  while(x.measureText(text).width>maxW&&s>30){ s-=6; x.font=weight+' '+s+'px "Segoe UI",Arial,sans-serif'; }
}
function drawPromoCanvas(p){
  var W=1080,H=1080,c=document.createElement('canvas'); c.width=W; c.height=H;
  var x=c.getContext('2d'), u=(LANG==='ur');
  var g=x.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#3b1470'); g.addColorStop(.55,'#6d28d9'); g.addColorStop(1,'#b45309');
  x.fillStyle=g; x.fillRect(0,0,W,H);
  x.fillStyle='rgba(255,255,255,0.07)';
  x.beginPath(); x.arc(120,180,150,0,7); x.fill();
  x.beginPath(); x.arc(960,860,190,0,7); x.fill();
  x.beginPath(); x.arc(900,140,90,0,7); x.fill();
  x.fillStyle='rgba(0,0,0,0.12)';
  x.beginPath(); x.arc(140,900,120,0,7); x.fill();
  x.textAlign='center'; x.textBaseline='middle';
  var shop=getCfg().shop||'King Cafe';
  x.font='800 44px "Segoe UI",Arial,sans-serif';
  var sw=x.measureText('👑 '+shop).width+80;
  x.fillStyle='rgba(255,255,255,0.95)'; roundRectP(x,(W-sw)/2,44,sw,84,42); x.fill();
  x.fillStyle='#3b1470'; x.fillText('👑 '+shop,W/2,88);
  x.fillStyle='#ffe9c9'; x.font='800 60px "Segoe UI",Arial,sans-serif';
  x.fillText(u?'آج کی ڈیل':"TODAY'S DEAL",W/2,196);
  x.fillStyle='#ffffff'; x.font='600 38px "Segoe UI",Arial,sans-serif';
  x.fillText(promoDateStr()+' · '+(u?'صرف آج کے لیے':'Valid today only'),W/2,252);
  x.font='380px serif'; x.fillText(p.emoji||'🍕',W/2,530);
  x.fillStyle='#ffd200';
  x.beginPath(); x.arc(872,392,108,0,7); x.fill();
  x.fillStyle='#3b1470'; x.font='800 64px "Segoe UI",Arial,sans-serif';
  x.fillText('-'+p.pct+'%',872,394);
  x.fillStyle='#fff'; fitFont(x,u?p.ur:p.en,920,84,800);
  x.fillText(u?p.ur:p.en,W/2,776);
  x.fillStyle='#fff'; x.font='800 108px "Segoe UI",Arial,sans-serif';
  var pr='Rs '+Number(p.price).toLocaleString('en-PK');
  x.fillText(pr,W/2-80,878);
  x.fillStyle='#ffd9a8'; x.font='600 52px "Segoe UI",Arial,sans-serif';
  var old='Rs '+Number(p.old).toLocaleString('en-PK');
  var ow=x.measureText(old).width;
  x.fillText(old,W/2+170,870);
  x.strokeStyle='#fff'; x.lineWidth=5;
  x.beginPath(); x.moveTo(W/2+170-ow/2,870); x.lineTo(W/2+170+ow/2,870); x.stroke();
  var ct=u?'📱 واٹس ایپ پر آرڈر کریں':'📱 Order on WhatsApp';
  x.font='800 46px "Segoe UI",Arial,sans-serif';
  var cw=x.measureText(ct).width+90;
  x.fillStyle='#fff'; roundRectP(x,(W-cw)/2,932,cw,80,40); x.fill();
  x.fillStyle='#15803d'; x.fillText(ct,W/2,974);
  x.fillStyle='rgba(255,255,255,0.85)'; x.font='700 30px "Segoe UI",Arial,sans-serif';
  x.fillText('🏷️ DEMO by Jilan Apps',W/2,1044);
  return c;
}
function promoShareText(){
  var p=getPromo(); if(!p) return '';
  var u=(LANG==='ur');
  return '👑 '+(u?'آج کی ڈیل':'Today\'s Deal')+': '+(u?p.ur:p.en)+' — '+p.pct+'% OFF, '+(u?'صرف':'only')+' Rs '+Number(p.price).toLocaleString('en-PK')+'! '+(u?'آج ہی آرڈر کریں 🙏':'Order today 🙏');
}
function dlPromoBlob(blob,p){
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='promo-'+p.date+'.png';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ try{URL.revokeObjectURL(a.href);}catch(e){} a.remove(); },2000);
}
function dlPromo(){
  var p=getPromo(); if(!p) return;
  drawPromoCanvas(p).toBlob(function(b){ if(b) dlPromoBlob(b,p); },'image/png');
}
function sharePromo(){
  var p=getPromo(); if(!p) return;
  drawPromoCanvas(p).toBlob(function(blob){
    if(!blob){ toast(T('dlImg')); return; }
    var file;
    try{ file=new File([blob],'promo-'+p.date+'.png',{type:'image/png'}); }catch(e){ file=null; }
    if(file&&navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:promoShareText(),text:promoShareText()}).catch(function(){});
    } else {
      dlPromoBlob(blob,p);
      toast(T('waShareFallback'));
    }
  },'image/png');
}
function admPromo(){
  var p=getPromo()||genPromo();
  var h='<div class="sec-title">🎨 '+T('promo')+'</div><div class="note">'+T('promoHint')+'</div>';
  h+='<div style="text-align:center"><img id="promoImg" style="max-width:320px;width:100%;border-radius:14px;box-shadow:var(--shadow)" alt="promo"></div><div style="height:10px"></div>';
  h+='<div class="form">';
  h+='<label>'+T('dTitle')+' (EN)</label><input id="pr-en" value="'+esc(p.en)+'">';
  h+='<label>'+T('dTitle')+' (UR)</label><input id="pr-ur" value="'+esc(p.ur)+'">';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
  h+='<div><label>'+T('dDisc')+'</label><input id="pr-pct" type="number" value="'+p.pct+'"></div>';
  h+='<div><label>'+T('dPrice')+'</label><input id="pr-price" type="number" value="'+p.price+'"></div>';
  h+='<div><label>'+T('dOld')+'</label><input id="pr-old" type="number" value="'+p.old+'"></div></div>';
  h+='<div style="height:12px"></div>';
  h+='<button class="btn btn-red" onclick="savePromo()">'+T('save')+'</button>';
  h+='<button class="btn btn-ghost" onclick="regenPromo()">'+T('regen')+'</button>';
  h+='<button class="btn btn-green" onclick="sharePromo()">'+T('shareWA')+'</button>';
  h+='<button class="btn btn-ghost" onclick="dlPromo()">'+T('dlImg')+'</button>';
  h+='</div>';
  document.getElementById('admBody').innerHTML=h;
  refreshPromoImg();
}
function refreshPromoImg(){ var p=getPromo(),im=document.getElementById('promoImg'); if(p&&im) im.src=drawPromoCanvas(p).toDataURL('image/png'); }
function savePromo(){
  var p=getPromo()||genPromo();
  p.en=document.getElementById('pr-en').value.trim()||p.en;
  p.ur=document.getElementById('pr-ur').value.trim()||p.ur;
  p.pct=Math.max(0,Math.min(90,+document.getElementById('pr-pct').value||0));
  p.price=+document.getElementById('pr-price').value||p.price;
  p.old=+document.getElementById('pr-old').value||p.old;
  setPromo(p); refreshPromoImg(); toast(T('promoSaved'));
}
function regenPromo(){ genPromo(); admPromo(); toast(T('promoNew')); }

/* ---------- 3-DAY DEMO EXPIRY ---------- */
var DEMO_MS = 3 * 86400000;
function demoSince(){ try{ var v = localStorage.getItem('jkc_demo_since'); return v ? parseInt(v, 10) : 0; }catch(e){ return 0; } }
function ensureDemoSince(){ if (!demoSince()){ try{ localStorage.setItem('jkc_demo_since', String(Date.now())); }catch(e){} } }
function demoDaysLeft(){ var s = demoSince(); if (!s) return 3; var left = DEMO_MS - (Date.now() - s); return Math.max(0, Math.ceil(left / 86400000)); }
function demoExpired(){ var s = demoSince(); return s > 0 && (Date.now() - s) > DEMO_MS; }
function demoCountdownTxt(){ return '⏳ DEMO by Jilan Apps · ' + (LANG === 'ur' ? 'باقی: ' + demoDaysLeft() + ' دن' : demoDaysLeft() + ' day(s) left'); }
function updateDemoBar(){ var db = document.querySelector('.demo-bar'); if (db) db.textContent = '👑 ' + demoCountdownTxt() + ' — ' + (LANG === 'ur' ? 'نمونہ قیمتیں، صرف ڈیمو ڈیٹا' : 'Sample prices, demo data only'); }
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
else {
  applyLang(); updateCartBadge(); renderHome(); updateDemoBar();
  var _ep=getPromo();
  if(!_ep||_ep.date!==todayKey()){ genPromo(); setTimeout(function(){ toast(T('promoNew')); },900); }
}
