/* Jilan Karyana Store — jsdom + unit tests (node)
   Run: NODE_PATH=/tmp/node_modules node test.js   (from the karyana dir) */
'use strict';
var path = require('path');
var fs = require('fs');
var JKS = require(path.join(__dirname, 'app.js'));

var passed = 0, failed = 0;
function ok(cond, name, extra) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
function section(s) { console.log('\n== ' + s + ' =='); }

/* ---------- 1. product seeding ---------- */
section('product seeding (40+)');
var products = JKS.seedProducts();
ok(products.length >= 40, 'seeded ' + products.length + ' products (>=40)');
var cats = {};
products.forEach(function (p) { cats[p.cat] = true; });
ok(Object.keys(cats).length === 12, '12 categories covered (' + Object.keys(cats).length + ')');
var fieldsOk = products.every(function (p) {
  return p.id && p.en && p.ur && p.cat && p.pack && p.unit &&
         typeof p.price === 'number' && p.price > 0 &&
         typeof p.cost === 'number' && p.cost >= 0 &&
         typeof p.stock === 'number' && p.stock >= 0 &&
         typeof p.popular === 'boolean' && typeof p.deal === 'boolean';
});
ok(fieldsOk, 'every product has id/en/ur/cat/pack/unit/price/cost/stock/popular/deal');
ok(products.some(function (p) { return p.popular; }), 'some products flagged popular');
ok(products.some(function (p) { return p.deal; }), 'some products flagged deal');
// seed must return fresh copies (mutating one seed must not affect the next)
products[0].stock = -999;
ok(JKS.seedProducts()[0].stock !== -999, 'seedProducts returns fresh copies');

/* ---------- 2. cart math ---------- */
section('cart math');
var S = { deliveryFee: 100, freeAbove: 2000, minOrder: 200 };
var c1 = JKS.calcCart([{ price: 500, qty: 2 }, { price: 300, qty: 1 }], S, '');
ok(c1.subtotal === 1300, 'subtotal 1300', 'got ' + c1.subtotal);
ok(c1.delivery === 100, 'delivery 100 below threshold', 'got ' + c1.delivery);
ok(c1.discount === 0, 'no discount without promo');
ok(c1.total === 1400, 'total 1400', 'got ' + c1.total);
var c2 = JKS.calcCart([{ price: 500, qty: 2 }, { price: 300, qty: 1 }], S, 'JILAN10');
ok(c2.discount === 130, 'JILAN10 gives 10% discount (130)', 'got ' + c2.discount);
ok(c2.total === 1270, 'total 1270 with promo', 'got ' + c2.total);
ok(c2.promoValid === true, 'promoValid true for JILAN10');
var c3 = JKS.calcCart([{ price: 500, qty: 2 }, { price: 300, qty: 1 }], S, 'WRONG');
ok(c3.promoValid === false && c3.discount === 0, 'invalid promo rejected');
var c4 = JKS.calcCart([{ price: 1000, qty: 3 }], S, '');
ok(c4.delivery === 0, 'free delivery at/above Rs 2000 threshold');
ok(c4.total === 3000, 'total 3000 with free delivery');
var c5 = JKS.calcCart([{ price: 1000, qty: 2 }], S, '');
ok(c5.delivery === 0, 'free delivery exactly at Rs 2000');
var c6 = JKS.calcCart([], S, '');
ok(c6.subtotal === 0 && c6.delivery === 0 && c6.total === 0, 'empty cart = all zeros');
var c7 = JKS.calcCart([{ price: 2850, qty: 1 }], S, 'jilan10');
ok(c7.promoValid === true, 'promo code is case-insensitive');

/* ---------- 3. order creation + unique numbers ---------- */
section('order creation + unique order numbers');
var prods = JKS.seedProducts();
function mkOrder(lines, cust) {
  return JKS.buildOrder({
    lines: lines, products: prods,
    settings: S, promoCode: '',
    customer: cust || { name: 'Ahmed Khan', mobile: '0300-1234567', address: 'House 1, Street 2, Lahore', notes: '' },
    payment: 'cod', existingNos: []
  });
}
var r1 = mkOrder([{ pid: 'atta-20', qty: 1 }, { pid: 'sugar-1', qty: 2 }]);
ok(!r1.error && r1.order, 'valid order builds without error');
ok(/^JKS-\d{8}-[A-Z2-9]{4}$/.test(r1.order.no), 'order number format JKS-YYYYMMDD-XXXX (' + r1.order.no + ')');
ok(r1.order.items[0].cost > 0, 'order snapshots purchase cost');
ok(r1.order.status === 'pending' && r1.order.stockDeducted === false, 'new order is pending, stock not deducted');
var nos = {}, dup = false;
for (var i = 0; i < 200; i++) {
  var n = JKS.generateOrderNo(Object.keys(nos));
  if (nos[n]) dup = true;
  nos[n] = true;
}
ok(!dup, '200 generated order numbers are all unique');
ok(mkOrder([]).error === 'err_empty', 'empty cart rejected');
ok(mkOrder([{ pid: 'salt-1', qty: 1 }]).error === 'err_min', 'below-minimum order rejected (Rs 90 < Rs 200)');
var badMob = mkOrder([{ pid: 'atta-20', qty: 1 }], { name: 'Ali', mobile: '12345', address: 'Lahore', notes: '' });
ok(badMob.error === 'err_mobile', 'invalid mobile rejected');
var noName = mkOrder([{ pid: 'atta-20', qty: 1 }], { name: '  ', mobile: '03001234567', address: 'Lahore', notes: '' });
ok(noName.error === 'err_name', 'missing name rejected');
ok(JKS.validateMobile('0300-1234567').ok === true, 'mobile 0300-1234567 valid');
ok(JKS.validateMobile('03001234567').mobile === '0300-1234567', 'mobile normalized to 03XX-XXXXXXX');
ok(JKS.validateMobile('031234567').ok === false, 'short mobile rejected');
ok(JKS.validateMobile('04001234567').ok === false, 'non-03 mobile rejected');

/* ---------- 4. stock decrement on confirm + oversell prevention ---------- */
section('stock on confirm / oversell prevention');
var p2 = JKS.seedProducts();
var oA = mkOrder([{ pid: 'atta-20', qty: 3 }]);
oA.order && (function () {
  var orders = [oA.order];
  var before = p2.filter(function (p) { return p.id === 'atta-20'; })[0].stock;
  var res = JKS.setOrderStatus(orders, p2, oA.order.id, 'confirmed');
  var after = p2.filter(function (p) { return p.id === 'atta-20'; })[0].stock;
  ok(res.ok === true, 'confirm succeeds with sufficient stock');
  ok(after === before - 3, 'stock decremented by 3 (' + before + ' -> ' + after + ')');
  ok(oA.order.stockDeducted === true, 'stockDeducted flag set');
  var res2 = JKS.setOrderStatus(orders, p2, oA.order.id, 'preparing');
  var after2 = p2.filter(function (p) { return p.id === 'atta-20'; })[0].stock;
  ok(after2 === after, 'no double-decrement on later status change');
})();
var p3 = JKS.seedProducts();
var tiny = p3.filter(function (p) { return p.id === 'ghee-desi-1'; })[0];
tiny.stock = 2;
var oB = JKS.buildOrder({
  lines: [{ pid: 'ghee-desi-1', qty: 3 }], products: p3, settings: S, promoCode: '',
  customer: { name: 'Ali', mobile: '03001234567', address: 'Karachi', notes: '' },
  payment: 'cod', existingNos: []
});
var ordersB = [oB.order];
var resB = JKS.setOrderStatus(ordersB, p3, oB.order.id, 'confirmed');
ok(resB.error === 'stock', 'oversell prevented on confirm');
ok(tiny.stock === 2, 'stock unchanged after failed confirm');
ok(oB.order.status === 'pending', 'order stays pending after failed confirm');
// cancel after confirm restocks
var p4 = JKS.seedProducts();
var oC = mkOrder([{ pid: 'sugar-5', qty: 2 }]);
var ordersC = [oC.order];
JKS.setOrderStatus(ordersC, p4, oC.order.id, 'confirmed');
var sBefore = p4.filter(function (p) { return p.id === 'sugar-5'; })[0].stock;
JKS.setOrderStatus(ordersC, p4, oC.order.id, 'cancelled');
var sAfter = p4.filter(function (p) { return p.id === 'sugar-5'; })[0].stock;
ok(sAfter === sBefore + 2, 'cancel after confirm restocks items');

/* ---------- 5. order tracking (order no + last 4 digits) ---------- */
section('order tracking');
var trackedOrders = [r1.order];
var found = JKS.findOrder(trackedOrders, r1.order.no, '4567');
ok(found && found.id === r1.order.id, 'tracking works with correct last-4 digits');
ok(JKS.findOrder(trackedOrders, r1.order.no, '0000') === null, 'wrong last-4 digits rejected');
ok(JKS.findOrder(trackedOrders, 'JKS-20200101-XXXX', '4567') === null, 'wrong order number rejected');
ok(JKS.findOrder(trackedOrders, r1.order.no.toLowerCase(), '4567') !== null, 'order number lookup is case-insensitive');

/* ---------- 6. WhatsApp link ---------- */
section('whatsapp order link');
ok(JKS.whatsappLink(r1.order, '') === null, 'empty shop number -> null (setup message path)');
ok(JKS.whatsappLink(r1.order, null) === null, 'null shop number -> null');
var wl = JKS.whatsappLink(r1.order, '923001234567');
ok(wl && wl.indexOf('https://wa.me/923001234567?text=') === 0, 'wa.me link built with configured number');
ok(wl.indexOf(encodeURIComponent(r1.order.no).slice(0, 8)) >= 0, 'order number embedded in message');

/* ---------- 7. admin auth (hashed password) ---------- */
section('admin auth');
ok(JKS.verifyAdmin('admin', 'jilan123') === true, 'correct demo credentials accepted');
ok(JKS.verifyAdmin('admin', 'wrong') === false, 'wrong password rejected');
ok(JKS.verifyAdmin('root', 'jilan123') === false, 'wrong username rejected');
ok(JKS.sha256('jilan123') === JKS.ADMIN_PASS_HASH, 'stored hash matches sha256 of password');
ok(JKS.ADMIN_PASS_HASH !== 'jilan123', 'password is not stored in plain text');

/* ---------- 8. dashboard + reports ---------- */
section('dashboard + reports');
var p5 = JKS.seedProducts();
var oo1 = mkOrder([{ pid: 'atta-20', qty: 1 }]).order;
var oo2 = mkOrder([{ pid: 'sugar-5', qty: 1 }]).order;
var allOrders = [oo1, oo2];
JKS.setOrderStatus(allOrders, p5, oo1.id, 'confirmed');
JKS.setOrderStatus(allOrders, p5, oo2.id, 'cancelled');
var st = JKS.dashboardStats(allOrders, p5);
ok(st.totalOrders === 2, 'total orders counted');
ok(st.pendingOrders === 0, 'no pending orders');
ok(st.totalProducts === p5.length, 'total products counted');
ok(st.todaySales === oo1.total, 'today sales counts confirmed order, excludes cancelled');
var rep = JKS.reportTotals(allOrders, [{ amount: 500, title: 'Rent', date: '2026-10-11' }]);
ok(rep.sales === oo1.total, 'report sales excludes cancelled');
ok(rep.cogs === oo1.items[0].cost * 1, 'COGS = purchase cost of sold items');
ok(rep.expenses === 500, 'expenses summed');
ok(rep.profit === rep.sales - rep.cogs - 500, 'profit = sales - cogs - expenses');

/* ---------- 9. i18n ---------- */
section('i18n (Urdu/English toggle)');
var keys = ['nav_home', 'nav_cart', 'cart_title', 'checkout_btn', 'place_order', 'oc_title',
  'tr_title', 'ac_title', 'ad_dashboard', 'ad_products', 'ad_orders', 'ad_expenses',
  'ad_reports', 'ad_settings', 'st_pending', 'st_delivered', 'pay_cod', 'add_cart',
  'in_stock', 'out_stock', 'promo_ok', 'wa_setup', 'al_creds', 'd_today', 'r_profit'];
var i18nOk = keys.every(function (k) {
  var e = JKS.STR[k];
  return e && e.en && e.ur && e.en !== e.ur;
});
ok(i18nOk, 'all ' + keys.length + ' sampled UI keys present in EN + UR and differ');
ok(JKS.t('nav_cart', 'ur') === 'ٹوکری', 'Urdu string correct (nav_cart)');
ok(JKS.t('nav_cart', 'en') === 'Cart', 'English string correct (nav_cart)');
ok(JKS.tr('min_order_err', { min: 200 }, 'en') === 'Minimum order is Rs 200', 'template substitution works');
var allHaveBoth = Object.keys(JKS.STR).every(function (k) { return JKS.STR[k].en && JKS.STR[k].ur; });
ok(allHaveBoth, 'every i18n key (' + Object.keys(JKS.STR).length + ') has both en and ur');

/* ---------- 10. DOM smoke test (app opens, renders, Urdu RTL) ---------- */
section('DOM smoke test (jsdom)');
var JSDOM = require('jsdom').JSDOM;
var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
var appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
var dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only' });
var w = dom.window;
try {
  w.eval(appSrc);
  // jsdom does not fire DOMContentLoaded synchronously; simulate the browser lifecycle
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  var d = w.document;
  ok(d.getElementById('banner-text').textContent.indexOf('DEMO') >= 0, 'demo banner rendered');
  ok(d.querySelectorAll('#bottom-nav button').length === 5, 'bottom nav has 5 items');
  ok(d.querySelectorAll('#desktop-nav button').length === 5, 'desktop nav has 5 items');
  // go to categories, open first category
  d.querySelector('#bottom-nav button[data-view="categories"]').click();
  ok(d.querySelectorAll('.cat-card').length === 12, '12 category cards rendered');
  d.querySelector('.cat-card').click();
  var cards = d.querySelectorAll('.prod-card');
  ok(cards.length > 0, 'product cards rendered in category (' + cards.length + ')');
  ok(cards[0].querySelector('.add-btn') !== null, 'product card has Add button');
  ok(cards[0].querySelector('.stock-badge') !== null, 'product card has stock badge');
  // add to cart via UI, check badge
  cards[0].querySelector('.add-btn').click();
  var badge = d.querySelector('#bottom-nav .cart-badge');
  ok(badge && badge.textContent === '1', 'cart badge shows 1 after Add');
  // cart view shows line + totals
  d.querySelector('#bottom-nav button[data-view="cart"]').click();
  ok(d.querySelectorAll('.cart-line').length === 1, 'cart shows 1 line');
  ok(d.getElementById('promo') !== null, 'promo code field present');
  // language toggle to Urdu -> RTL
  d.getElementById('lang-btn').click();
  ok(d.documentElement.dir === 'rtl', 'Urdu toggle sets dir=rtl');
  ok(d.documentElement.lang === 'ur', 'Urdu toggle sets lang=ur');
  ok(d.querySelector('#bottom-nav button[data-view="cart"] span').textContent === 'ٹوکری',
     'nav label switches to Urdu');
  // admin login view reachable from account
  d.querySelector('#bottom-nav button[data-view="account"]').click();
  d.querySelector('[data-action="admin-open"]').click();
  ok(d.getElementById('al-user') !== null, 'admin login form rendered');
  ok(d.getElementById('view').textContent.indexOf('jilan123') >= 0, 'demo credentials labeled on login');
  d.getElementById('al-user').value = 'admin';
  d.getElementById('al-pass').value = 'jilan123';
  d.querySelector('[data-action="admin-login"]').click();
  ok(d.querySelectorAll('.admin-tabs button').length === 6, 'admin panel shows 6 tabs after login');
  ok(d.querySelectorAll('.stat-card').length === 5, 'dashboard shows 5 stat cards');
  ok(d.getElementById('view').textContent.indexOf('localStorage') >= 0, 'demo-data note shown in admin');
  // admin products tab
  d.querySelector('[data-action="admin-tab"][data-tab="products"]').click();
  ok(d.querySelectorAll('.admin-row').length >= 40, 'admin product list shows all products');
  // checkout flow via UI
  d.getElementById('lang-btn').click(); // back to English
  d.querySelector('#bottom-nav button[data-view="cart"]').click();
  d.querySelector('[data-action="go-checkout"]').click();
  d.getElementById('f-name').value = 'Test User';
  d.getElementById('f-mobile').value = '03009876543';
  d.getElementById('f-address').value = 'Test address, Lahore';
  d.querySelector('[data-action="place-order"]').click();
  var ono = d.querySelector('.order-no-box .no');
  ok(ono && /^JKS-\d{8}-[A-Z2-9]{4}$/.test(ono.textContent.trim()), 'UI checkout creates order with valid number');
  ok(d.querySelector('[data-action="wa-order"]') !== null, 'WhatsApp order button on confirmation');
} catch (e) {
  ok(false, 'DOM smoke test threw', e && e.stack);
}

console.log('\n==================================');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
